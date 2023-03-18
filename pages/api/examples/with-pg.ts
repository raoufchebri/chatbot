import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

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

  const { conversationId, content, role } = request.body.message;

  await pool.query(
    'INSERT INTO message (conversation_id, content, role) VALUES ($1, $2, $3)',
    [conversationId, content, role]
  );

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
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
        ...request.body.messages,
      ],
    }),
  });

  const data = await completion.json();

  response.status(200).json({
    completion: data,
  });
}
