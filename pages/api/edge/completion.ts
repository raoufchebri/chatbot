import { createStream } from '../../../lib/createStream';
import type { NextFetchEvent, NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async (req: NextRequest, context: NextFetchEvent) => {
  const { messages } = (await req.json()) as {
    messages?: string[];
  };

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
