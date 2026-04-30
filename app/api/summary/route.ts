import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function POST(req: NextRequest) {
  const { text, pageNumber, totalPages, simpleMode } = await req.json();

  if (!text?.trim()) {
    return new Response('No text content on this page.', { headers: { 'Content-Type': 'text/plain' } });
  }

  const system = simpleMode
    ? 'You are a friendly tutor explaining things to a curious 10-year-old. Rewrite the page content in 3-5 short bullet points using simple, everyday words. Avoid jargon — when a technical term is unavoidable, define it in plain language right after. Use concrete analogies a kid would understand. Each bullet starts with a bold plain-language phrase. Keep sentences short.'
    : 'You are a concise study assistant. Summarize the page content in 3-5 bullet points. Each bullet starts with a bold key phrase. Be direct and information-dense. No filler.';

  const userPrompt = simpleMode
    ? `Explain page ${pageNumber} of ${totalPages} like I'm 10 years old:\n\n${text.slice(0, 3000)}`
    : `Summarize page ${pageNumber} of ${totalPages}:\n\n${text.slice(0, 3000)}`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: [
        {
          role: 'user',
          content: userPrompt,
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
