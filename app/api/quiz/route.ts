import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const MAX_INPUT_CHARS = 9000;

export async function POST(req: NextRequest) {
  const { text, fromPage, toPage } = (await req.json()) as {
    text?: string;
    fromPage?: number;
    toPage?: number;
  };

  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    return Response.json({ questions: [] });
  }

  const rangeLabel =
    typeof fromPage === 'number' && typeof toPage === 'number' && toPage > fromPage
      ? `pages ${fromPage}–${toPage}`
      : typeof fromPage === 'number'
        ? `page ${fromPage}`
        : 'this passage';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1400,
    system:
      'You write end-of-chapter quiz questions for a student. Return ONLY valid JSON — no markdown, no prose. Format: {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"why this answer is right and the others are wrong"}]}. Rules: produce exactly 5 questions; each has exactly 4 plausible options with one correct; questions must test understanding (not trivia about page numbers); vary the index of the correct answer across questions; explanations should be 1-2 sentences and address common misconceptions.',
    messages: [
      {
        role: 'user',
        content: `Write 5 multiple-choice quiz questions from ${rangeLabel}:\n\n${trimmed.slice(0, MAX_INPUT_CHARS)}`,
      },
    ],
  });

  try {
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as unknown;
    const incoming: unknown[] =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown }).questions)
        ? ((parsed as { questions: unknown[] }).questions)
        : [];

    type SanitizedQuestion = {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

    const sanitized: SanitizedQuestion[] = [];
    for (const q of incoming) {
      if (!q || typeof q !== 'object') continue;
      const cand = q as Record<string, unknown>;
      if (typeof cand.question !== 'string') continue;
      if (!Array.isArray(cand.options) || cand.options.length < 2) continue;
      if (!cand.options.every((o) => typeof o === 'string')) continue;
      if (typeof cand.correctIndex !== 'number') continue;
      if (cand.correctIndex < 0 || cand.correctIndex >= cand.options.length) continue;
      sanitized.push({
        question: cand.question,
        options: cand.options as string[],
        correctIndex: cand.correctIndex,
        explanation: typeof cand.explanation === 'string' ? cand.explanation : '',
      });
      if (sanitized.length >= 5) break;
    }
    return Response.json({ questions: sanitized });
  } catch {
    return Response.json({ questions: [] });
  }
}
