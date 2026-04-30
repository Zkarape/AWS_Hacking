import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text?.trim()) {
    return Response.json({ terms: [] });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:
        'You spot jargon and technical or specialized vocabulary inside a passage and define each in plain English a curious 12-year-old can follow. Return ONLY valid JSON — no markdown, no prose, no commentary. Format: {"terms":[{"term":"exact word or short phrase as it appears in the text","definition":"one short sentence, plain English, no jargon"}]}. Rules: include only words a casual reader would likely not know; skip everyday words; preserve the original casing as it appears; prefer single words or two-word phrases; at most 8 entries; if nothing qualifies, return an empty array.',
      messages: [
        {
          role: 'user',
          content: `Identify the jargon in this passage and define each:\n\n${text.slice(0, 4000)}`,
        },
      ],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    if (!Array.isArray(parsed?.terms)) return Response.json({ terms: [] });

    const seen = new Set<string>();
    const terms: { term: string; definition: string }[] = [];
    for (const t of parsed.terms) {
      if (typeof t?.term !== 'string' || typeof t?.definition !== 'string') continue;
      const term = t.term.trim();
      const definition = t.definition.trim();
      if (!term || !definition) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push({ term, definition });
      if (terms.length >= 8) break;
    }

    return Response.json({ terms });
  } catch {
    return Response.json({ terms: [] });
  }
}
