// Import the Next.js types for the request and response objects
import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // Create a new PostgreSQL connection pool using the connection string and SSL options
  // specified in the environment variables
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Extract the "content" and "role" values from the first message in the request body
  const { content, role } = request.body.messages[0];

  // Insert the message into the "message" table in the PostgreSQL database using a prepared statement
  await pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    content,
    role,
  ]);

  // Retrieve the entire message history from the "message" table in the PostgreSQL database
  // and store it in the "history" variable
  const { rows: history } = await pool.query(
    'SELECT role, content FROM message ORDER BY created'
  );

  // Make an HTTP request to the OpenAI chat completions API using the "fetch" function
  // and store the result in the "data" variable
  const data = await (
    await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Specify the GPT-3 model to use for the chat completions
        messages: [
          {
            role: 'system', // Set the role of the first message to "system"
            content: 'You are a helpful assistant.', // Set the content of the first message
          },
          ...history, // Spread the array of message history into the "messages" array
        ],
      }),
    })
  ).json();

  // Extract the latest message from the OpenAI chat completions API response
  const message = data.choices[0].message;

  // Insert the latest message into the "message" table in the PostgreSQL database
  // using a prepared statement
  pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    message.content,
    message.role,
  ]);

  // Set the status code of the HTTP response to 200 (OK) and send the JSON response
  response.status(200).json({
    data,
  });
}
