import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function POST(req: NextRequest) {
  const { messages, selection, pageText } = await req.json();

  const systemPrompt = `You are an expert study companion helping a student understand their reading material. Be concise, clear, and pedagogically useful. Use examples when helpful. If asked about something not in the text, you may use your general knowledge but note when you are doing so.

${selection ? `The student has selected this passage from the document:\n"${selection}"` : ''}
${pageText ? `\nCurrent page context:\n${pageText.slice(0, 2000)}` : ''}`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
