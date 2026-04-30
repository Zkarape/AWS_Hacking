import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function POST(req: NextRequest) {
  const { text, pageNumber, totalPages } = await req.json();

  if (!text?.trim()) {
    return new Response('No text content on this page.', { headers: { 'Content-Type': 'text/plain' } });
  }

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:
        'You are a concise study assistant. Summarize the page content in 3-5 bullet points. Each bullet starts with a bold key phrase. Be direct and information-dense. No filler.',
      messages: [
        {
          role: 'user',
          content: `Summarize page ${pageNumber} of ${totalPages}:\n\n${text.slice(0, 3000)}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return new Response(`Error: ${msg}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
