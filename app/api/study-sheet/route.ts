import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

interface IncomingHighlight {
  page: number;
  text: string;
  color: string;
}

export async function POST(req: NextRequest) {
  const { highlights, totalPages, documentName } = (await req.json()) as {
    highlights: IncomingHighlight[];
    totalPages?: number;
    documentName?: string;
  };

  if (!Array.isArray(highlights) || highlights.length === 0) {
    return new Response('No highlights to summarize.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const sorted = [...highlights].sort((a, b) => a.page - b.page);
  const formatted = sorted
    .map((h, i) => `${i + 1}. [page ${h.page} · ${h.color}] "${h.text.replace(/\s+/g, ' ').trim()}"`)
    .join('\n');

  const docLabel = documentName ? `"${documentName}"` : 'this document';
  const totalLabel = totalPages ? ` (${totalPages} pages)` : '';

  const systemPrompt = `You are a study assistant that turns a student's PDF highlights into a concise, personalized study sheet.

Rules:
- Output **markdown only**, no preamble.
- Open with a short title (## Study Sheet) followed by a one-sentence overview.
- Group related highlights under thematic ## headings — do NOT just list them in page order.
- Under each heading, use bullet points. Bold the key terms. Add a brief explanation that connects the highlight to the surrounding ideas.
- When highlights overlap or repeat, merge them.
- Preserve the student's emphasis. Do not invent facts not implied by the highlights.
- End with a brief "Quick Recall" section: 3-5 bullet flashcard-style prompts.
- Keep it tight — favour signal over volume.`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `These are my highlights from ${docLabel}${totalLabel}. Synthesize them into a study sheet.\n\n${formatted}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI stream error';
          controller.enqueue(encoder.encode(`\n\nError: ${msg}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return new Response(`Error: ${msg}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
