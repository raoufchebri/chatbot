// Import the Next.js types for the request and response objects
import { NextApiRequest, NextApiResponse } from 'next';

// Define an asynchronous function named "handler" that takes a NextApiRequest object
// and a NextApiResponse object as parameters
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // Make an asynchronous HTTP request to the OpenAI chat completions API using the "fetch" function
  // and store the result in the "completion" variable
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    // Set the headers for the HTTP request to include the OpenAI API key and the content type
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    // Set the method for the HTTP request to "POST" and include the request body as a JSON string
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', // Specify the GPT-3 model to use for the chat completions
      messages: [
        {
          role: 'system', // Set the role of the first message to "system"
          content: 'You are a helpful assistant.', // Set the content of the first message
        },
        ...request.body.messages, // Spread the array of messages from the request body into the "messages" array
      ],
    }),
    method: 'POST',
  });

  // Parse the JSON response from the OpenAI chat completions API and store it in the "data" variable
  const data = await res.json();

  // Set the status code of the HTTP response to 200 (OK) and send the JSON response
  response.status(200).json({
    data,
  });
}
