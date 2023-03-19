import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const max_tokens = 300;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const { content, role } = request.body.messages[0];
  await pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    content,
    role,
  ]);

  const { rows: history } = await pool.query(
    `WITH cte AS (
      SELECT role, content, created, n_tokens,
             SUM(n_tokens) OVER (ORDER BY created DESC) AS cumulative_sum
      FROM message
    )
    
    SELECT role, content
    FROM cte
    WHERE cumulative_sum <= $1
    ORDER BY created`,
    [max_tokens]
  );

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
            content: 'You are a helpful assistant.',
          },
          ...history,
        ],
      }),
    })
  ).json();

  // save messages to database
  const message = data.choices[0].message;
  pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    message.content,
    message.role,
  ]);

  response.status(200).json({
    data,
  });
}
