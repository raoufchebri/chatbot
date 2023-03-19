import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  // Send a POST request to the OpenAI embeddings API endpoint
  const embedding = await fetch('https://api.openai.com/v1/embeddings', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    // Include the model and input in the request body
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: request.body.input,
    }),
    method: 'POST',
  });

  // Get the response data from the embeddings API as JSON
  const data = await embedding.json();

  // Send the response data as a JSON object with an HTTP status code of 200
  response.status(200).json({
    data,
  });
}
