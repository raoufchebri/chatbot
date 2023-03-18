import { createStream } from '../../lib/createStream';
// import { Pool } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages?: { conversationId: string; role: string; content: string }[];
  };

  if (!messages) {
    return new Response('No prompt in the request', { status: 400 });
  }

  // const pool = new Pool({
  //   connectionString: process.env.DATABASE_URL,
  //   ssl: {
  //     rejectUnauthorized: false,
  //   },
  // });

  // const { conversationId, content, role } = messages[0];

  // await pool.query(
  //   'INSERT INTO message (conversation_id, content, role) VALUES ($1, $2, $3)',
  //   [conversationId, content, role]
  // );

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
        ...messages,
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
