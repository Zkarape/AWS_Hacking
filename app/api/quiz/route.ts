import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

interface IncomingPage {
  pdfFilename?: string;
  page?: number;
  text?: string;
}

export async function POST(req: NextRequest) {
  const { pages } = (await req.json()) as { pages?: IncomingPage[] };

  const validPages = (pages || [])
    .filter((p): p is Required<IncomingPage> =>
      typeof p?.text === 'string' && p.text.trim().length > 0 && typeof p.page === 'number'
    )
    .slice(-12);

  if (validPages.length === 0) {
    return Response.json({ questions: [] });
  }

  const totalBudget = 6000;
  const perPage = Math.max(200, Math.floor(totalBudget / validPages.length));
  const corpus = validPages
    .map((p) => `--- ${p.pdfFilename || 'document'} · page ${p.page} ---\n${p.text.slice(0, perPage)}`)
    .join('\n\n');

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system:
        'You are a quiz generator for a focused study session. Return ONLY valid JSON — no markdown, no commentary. Format: {"questions":[{"question":"...","answer":"..."}]}. Produce 4-6 questions that probe the most important ideas across the supplied pages. Mix recall, definition, and one application question. Keep each question under 25 words and each answer under 40 words.',
      messages: [
        {
          role: 'user',
          content: `Generate "What did you learn?" quiz questions from these pages just read in a 25-minute focus session:\n\n${corpus}`,
        },
      ],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    let parsed: { questions?: Array<{ question?: unknown; answer?: unknown }> } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }
    const questions = (parsed.questions || [])
      .filter((q) => typeof q?.question === 'string' && typeof q?.answer === 'string')
      .map((q) => ({ question: String(q.question), answer: String(q.answer) }));

    return Response.json({ questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ questions: [], error: msg }, { status: 500 });
  }
}
