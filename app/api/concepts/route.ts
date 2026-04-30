import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return Response.json({ concepts: [] });
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system:
      'You extract key concepts from text. Return ONLY valid JSON — no markdown, no explanation. Format: {"concepts":[{"term":"...","definition":"one sentence","emoji":"relevant emoji"}]}. Extract 4-6 most important concepts.',
    messages: [{ role: 'user', content: `Extract key concepts:\n\n${text.slice(0, 3000)}` }],
  });

  try {
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    return Response.json(parsed);
  } catch {
    return Response.json({ concepts: [] });
  }
}
