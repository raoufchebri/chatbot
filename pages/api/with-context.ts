import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Maximum number of tokens allowed for a response
const max_history_tokens = 1500;
const max_context_tokens = 1500;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // Create a connection pool to the PostgreSQL database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Insert the first message in the request to the "message" table
  const { content, role } = request.body.message;

  // Retrieve the history of messages up to the maximum number of tokens allowed
  const { rows: history } = await pool.query(
    // Use a common table expression (CTE) to calculate the cumulative sum of tokens for each message
    `WITH cte AS (
      SELECT role, content, created, n_tokens,
             SUM(n_tokens) OVER (ORDER BY created DESC) AS cumulative_sum
      FROM message
    )
    SELECT role, content
    FROM cte
    WHERE cumulative_sum <= $1
    ORDER BY created`,
    [max_history_tokens]
  );

  // // alternate content and context in an array
  // const history = rows.reduce((acc, cur) => {
  //   if (cur.role === 'user') {
  //     return acc.concat([
  //       { content: cur.content, role: cur.role },
  //       { content: cur.context, role: cur.role },
  //     ]);
  //   } else {
  //     return acc.concat([{ content: cur.content, role: cur.role }]);
  //   }
  // }, []);

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

  // Insert the response from OpenAI's API to the "message" table
  const message = data.choices[0].message;

  await pool.query(
    'INSERT INTO message (content, role, context) VALUES ($1, $2, $3)',
    [content, role, context]
  );

  await pool.query(
    'INSERT INTO message (content, role, context) VALUES ($1, $2, $3)',
    [message.content, message.role, null]
  );

  // Send the response from OpenAI's API to the client
  pool.end();
  response.status(200).json({
    data,
  });
}
