import { createStream } from '../../../lib/createStream';
import { Pool } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

const max_context_tokens = 1500;

export default async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages?: { content: string; role: 'user' | 'system' | 'assistant' }[];
  };

  const { content } = messages[0];

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
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const { rows: contextRows } = await pool.query(query, queryParams);
  const context = contextRows.reduce((acc, cur) => {
    return acc + cur.text;
  }, '');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: `Context: ${context}`,
        },
        {
          role: 'user',
          content: `Question: ${content}`,
        },
      ],
      stream: true,
    }),
  });
  const stream = await createStream(res);

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
