import type { NextFetchEvent, NextRequest } from 'next/server';
import { createStream } from '../../../lib/createStream';
import { Pool } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

let max_context_tokens = 2000;
const max_history_tokens = 1500;

export default async (req: NextRequest, ctx: NextFetchEvent) => {
  const { message } = (await req.json()) as {
    message?: { content: string; role: 'user' | 'system' | 'assistant' };
  };

  const { content } = message;

  const qEmbeddingsRes = await fetch('https://api.openai.com/v1/embeddings', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'text-embedding-ada-002',

      input: content,
    }),
  });

  const qEmbeddingsResJson = await qEmbeddingsRes.json();
  const qEmbeddings = qEmbeddingsResJson['data'][0]['embedding'];
  const qEmbeddingsStr = qEmbeddings.toString().replace(/\.\.\./g, '');

  // Query the database for the context
  const query = `
    SELECT text
    FROM (
      SELECT text, n_tokens, embeddings,
      (embeddings <=> '[${qEmbeddingsStr}]') AS distances,
      SUM(n_tokens) OVER (ORDER BY (embeddings <=> '[${qEmbeddingsStr}]')) AS cum_n_tokens
      FROM documents
      ) subquery
      WHERE cum_n_tokens <= $1
      ORDER BY distances ASC;
      `;

  const queryParams = [max_context_tokens];
  console.log('Querying database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const { rows: contextRows } = await pool.query(query, queryParams);
  const context = contextRows.reduce((acc, cur) => {
    return acc + cur.text;
  }, '');

  // Get conversation history
  await pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
    content,
    'user',
  ]);

  const { rows: history } = await pool.query(
    // Use a common table expression (CTE) to calculate the cumulative sum of tokens for each message
    `WITH cte AS (
      SELECT role, content, created, n_tokens,
             SUM(n_tokens) OVER (ORDER BY created DESC) AS cumulative_sum
      FROM message
    )
    SELECT role, content
    FROM cte
    WHERE cumulative_sum <= $1
    ORDER BY created`,
    [max_history_tokens]
  );

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
        ...history,
        {
          role: 'user',
          content: `Context: ${context}`,
        },
        {
          role: 'user',
          content: `Question: ${content}`,
        },
      ],
      stream: true,
    }),
  });
  const stream = await createStream(res);
  const [stream1, stream2] = stream.tee();

  const getStream = async () => {
    const reader = stream1.getReader();
    const decoder = new TextDecoder();
    let done = false;

    let completion = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      completion += chunkValue;
    }
    await pool.query('INSERT INTO message (content, role) VALUES ($1, $2)', [
      completion,
      'assistant',
    ]);

    return new Promise((resolve) => {
      resolve(completion);
    });
  };

  ctx.waitUntil(
    getStream().then(async () => {
      console.log('Inserting completion into database...');
    })
  );

  return new Response(stream2, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
