import { createStream } from '../../../lib/createStream';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

export default async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages?: string[];
  };

  if (!messages) {
    return new Response('No prompt in the request', { status: 400 });
  }
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
          content:
            'Find a suitable title to the conversation between the user and assistant. The title should not exceed 20 characters. Example: Origin of the Universe. \n\nAnswer:',
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
