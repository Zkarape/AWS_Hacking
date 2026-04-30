import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const MAX_INPUT = 1500;

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json();

  const trimmed = typeof text === 'string' ? text.trim().slice(0, MAX_INPUT) : '';
  const target = typeof targetLang === 'string' && targetLang.trim() ? targetLang.trim() : 'English';

  if (!trimmed) {
    return Response.json({ translation: '' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `You are a precise translator. Translate the user's passage into ${target}. Output ONLY the translation — no quotes, no preamble, no notes. If the passage is already in ${target}, return it unchanged.`,
      messages: [
        {
          role: 'user',
          content: trimmed,
        },
      ],
    });

    const translation = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    return Response.json({ translation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Translation error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
