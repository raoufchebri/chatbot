import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Maximum number of tokens allowed for a response
const max_tokens = 300;

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
  const { content, role } = request.body.messages[0];
  await pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    content,
    role,
  ]);

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
    [max_tokens]
  );

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
            content: 'You are a helpful assistant.',
          },
          ...history,
        ],
      }),
    })
  ).json();

  // Insert the response from OpenAI's API to the "message" table
  const message = data.choices[0].message;
  pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    message.content,
    message.role,
  ]);

  // Send the response from OpenAI's API to the client
  response.status(200).json({
    data,
  });
}
