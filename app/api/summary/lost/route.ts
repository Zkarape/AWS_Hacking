import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

interface IncomingPage {
  page: number;
  text: string;
}

const PER_PAGE_CHAR_LIMIT = 2400;

export async function POST(req: NextRequest) {
  const { pages, currentPage, totalPages } = (await req.json()) as {
    pages: IncomingPage[];
    currentPage?: number;
    totalPages?: number;
  };

  const cleaned = (Array.isArray(pages) ? pages : [])
    .filter((p) => typeof p?.page === 'number' && typeof p?.text === 'string' && p.text.trim().length > 0)
    .slice(-3);

  if (cleaned.length === 0) {
    return new Response(
      "I don't have enough page content yet — turn through a couple of pages and try again.",
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const formatted = cleaned
    .map(
      (p, i) =>
        `--- Page ${p.page}${i === cleaned.length - 1 ? ' (current)' : ''} ---\n${p.text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, PER_PAGE_CHAR_LIMIT)}`
    )
    .join('\n\n');

  const totalLabel = totalPages ? ` of ${totalPages}` : '';
  const currentLabel = currentPage ? ` Current page is ${currentPage}${totalLabel}.` : '';

  const system = `You are a study companion helping a reader recover their thread of thought after losing context across recent pages of a document.

Your job is conceptual bridging, NOT general summarization. The reader has just clicked an "I'm Lost" button — they need a short narrative that explicitly connects the ideas across the pages so the latest page makes sense again.

Rules:
- Output 3-6 short paragraphs of plain prose. No bullet lists, no headings, no preamble.
- Open with a single sentence that names the thread running through the pages.
- Then walk forward across the pages in order, showing how each idea sets up the next. Use connective phrases like "this leads to", "building on that", "which is why".
- Define any term that was introduced earlier and is now being used without explanation.
- End with one sentence orienting the reader to what the current page is asking them to do or understand.
- Keep it tight: focus on the conceptual links, skip filler. No "in summary" or "in conclusion".`;

  const userPrompt = `I lost the thread across the last ${cleaned.length} page${
    cleaned.length === 1 ? '' : 's'
  } I read.${currentLabel} Bridge the concepts across these pages so I can pick the thread back up.\n\n${formatted}`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
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
