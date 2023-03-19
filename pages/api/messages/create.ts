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

  const { content, role } = request.body;

  const res = await pool.query(
    'INSERT INTO message (content, role) VALUES ($1, $2)',
    [content, role]
  );

  pool.end();

  response.status(200).json({
    chatId: res.rows[0].chatId,
  });
}
