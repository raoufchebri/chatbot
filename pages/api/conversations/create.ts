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

  const { userId, title } = request.body;

  const res = await pool.query(
    'INSERT INTO conversation (id, user_id, title) VALUES (uuid_generate_v4(), $1, $2) RETURNING id AS "chatId"',
    [userId, title]
  );

  pool.end();

  response.status(200).json({
    chatId: res.rows[0].chatId,
  });
}
