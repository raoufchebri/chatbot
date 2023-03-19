import { Pool } from '@neondatabase/serverless';
import { createStream, CompletionParams } from '../../../lib/createStream';
import { Request } from 'next/dist/compiled/@edge-runtime/primitives/fetch';

// Maximum number of tokens allowed for a response
const max_history_tokens = 2800;
const max_context_tokens = 1000;

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages?: { content: string; role: 'user' | 'system' | 'assistant' }[];
  };

  if (!messages) {
    return new Response('No prompt in the request', { status: 400 });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Insert the first message in the request to the "message" table
  const { content, role } = messages[0];

  // Retrieve the history of messages up to the maximum number of tokens allowed
  const { rows } = await pool.query(
    // Use a common table expression (CTE) to calculate the cumulative sum of tokens for each message
    `WITH cte AS (
      SELECT role, content, context, created, n_tokens, n_context_tokens,
             SUM(n_tokens + n_context_tokens) OVER (ORDER BY created DESC) AS cumulative_sum
      FROM message
    )
    SELECT role, content, context
    FROM cte
    WHERE cumulative_sum <= $1
    ORDER BY created`,
    [max_history_tokens]
  );

  // alternate content and context in an array
  const history = rows.reduce((acc, cur) => {
    if (cur.role === 'user') {
      return acc.concat([
        { content: cur.content, role: cur.role },
        { content: cur.context, role: cur.role },
      ]);
    } else {
      return acc.concat([{ content: cur.content, role: cur.role }]);
    }
  }, []);

  const qEmbeddingsRes = await fetch('https://api.openai.com/v1/embeddings', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'text-embedding-ada-002',

      input: content,
    }),
  });

  const qEmbeddingsResJson = await qEmbeddingsRes.json();
  const qEmbeddings = qEmbeddingsResJson['data'][0]['embedding'];
  const qEmbeddingsStr = qEmbeddings.toString().replace(/\.\.\./g, '');

  // Query the database for the context
  const query = `
  SELECT text
  FROM (
    SELECT text, n_tokens, embeddings,
    (embeddings <=> '[${qEmbeddingsStr}]') AS distances,
    SUM(n_tokens) OVER (ORDER BY (embeddings <=> '[${qEmbeddingsStr}]')) AS cum_n_tokens
    FROM documents
    ) subquery
  WHERE cum_n_tokens <= $1
  ORDER BY distances ASC;
  `;

  const queryParams = [max_context_tokens];
  console.log('Querying database...');
  const { rows: contextRows } = await pool.query(query, queryParams);
  const context = contextRows.reduce((acc, cur) => {
    return acc + cur.text;
  }, '');

  pool.query(
    'INSERT INTO message (content, role, context, created) VALUES ($1, $2, $3, $4)',
    [content, role, context, new Date()]
  );

  const systemPrompt = `You are an enthusiastic developer who loves helping other developers with Postgres and Neon questions. Answer the question based on the context below. If the question can't be answered based on the context, say "Sorry :( I don't know."`;

  // Send the history of messages to OpenAI's API to generate a response
  const data = await (
    await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          // all history except last
          ...history,
          {
            role: 'user',
            content: `Context: ${context}`,
          },
          {
            role: 'user',
            content: `Question: ${content}`,
          },
        ],
      }),
    })
  ).json();

  const stream = await createStream(data);

  new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
