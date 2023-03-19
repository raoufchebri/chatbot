import { NextApiRequest, NextApiResponse } from 'next';
import { encode } from 'gpt-3-encoder';

// set a maximum number of tokens to send to the OpenAI API
const max_tokens = 220;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // encode each message and add the number of tokens to the object
  const encodedMessages = request.body.messages.map((message) => {
    const encoded = encode(message.content);
    return {
      ...message,
      n_tokens: encoded.length,
    };
  });

  // reverse the encoded messages so we can start from the end
  encodedMessages.reverse();

  // add a cumulative sum of the number of tokens to each message
  encodedMessages.reduce((acc, message) => {
    message.n_tokens_cumulative = acc + message.n_tokens;
    return message.n_tokens_cumulative;
  }, 0);

  // filter out messages that exceed the maximum number of tokens
  const messages = encodedMessages
    .filter((message) => message.n_tokens_cumulative < max_tokens)
    .map(({ content, role }) => ({ content, role }));

  // send the messages to the OpenAI API
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
        ...messages,
      ],
    }),
  });

  // parse the response from the OpenAI API
  const data = await completion.json();

  // combine the original messages and the response from the OpenAI API
  response.status(200).json({
    messages: [...messages.reverse(), data.choices[0].message],
    usage: data.usage,
  });
}
