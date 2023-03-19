import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'pg';

const max_tokens = 1000;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const q_embeddings_response = await fetch(
    'https://api.openai.com/v1/embeddings',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: request.body.input,
      }),
    }
  );

  const q_embeddings = (await q_embeddings_response.json())['data'][0][
    'embedding'
  ];
  const q_embeddings_str = q_embeddings.toString().replace(/\.\.\./g, '');

  // Query the database for the context
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  await client.connect();
  const query = `
  SELECT text
  FROM (
    SELECT text, n_tokens, embeddings,
    (embeddings <=> '[${q_embeddings_str}]') AS distances,
    SUM(n_tokens) OVER (ORDER BY (embeddings <=> '[${q_embeddings_str}]')) AS cum_n_tokens
    FROM documents
    ) subquery
  WHERE cum_n_tokens <= $1
  ORDER BY distances ASC;
  `;

  const queryParams = [max_tokens];
  console.log('Querying database...');
  const { rows } = await client.query(query, queryParams);
  await client.end();
  const context = rows.reduce((acc, cur) => {
    return acc + cur.text;
  }, '');

  // Send the response data as a JSON object with an HTTP status code of 200
  response.status(200).json({
    context,
  });
}
