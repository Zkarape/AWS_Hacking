import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

interface DocumentMatch {
  page: number;
  snippet: string;
}

export async function POST(req: NextRequest) {
  const {
    messages,
    selection,
    pageText,
    currentPage,
    totalPages,
    indexedPageCount,
    documentMatches,
  }: {
    messages: { role: string; content: string }[];
    selection?: string;
    pageText?: string;
    currentPage?: number;
    totalPages?: number;
    indexedPageCount?: number;
    documentMatches?: DocumentMatch[];
  } = await req.json();

  const matches = Array.isArray(documentMatches) ? documentMatches : [];
  const documentSection = matches.length
    ? `\nRelevant excerpts from across the document (use these to answer questions that span beyond the current page; cite page numbers when you reference them):\n${matches
        .map((m) => `- Page ${m.page}: ${m.snippet}`)
        .join('\n')}`
    : '';

  const coverageSection =
    typeof totalPages === 'number' && totalPages > 0
      ? `\nDocument coverage: ${indexedPageCount ?? 0} of ${totalPages} pages have been indexed so far${
          (indexedPageCount ?? 0) < totalPages
            ? '. Pages the reader has not yet visited are not in the index — note this if the answer might depend on unread pages.'
            : '.'
        }`
      : '';

  const systemPrompt = `You are an expert study companion helping a student understand their reading material. Be concise, clear, and pedagogically useful. Use examples when helpful. If asked about something not in the text, you may use your general knowledge but note when you are doing so. When answering questions that span the whole document (e.g. "where does the author first mention X?"), prefer the relevant excerpts below and cite page numbers.

${selection ? `The student has selected this passage from the document:\n"${selection}"` : ''}
${pageText ? `\nCurrent page (${currentPage ?? '?'}) context:\n${pageText.slice(0, 2000)}` : ''}${documentSection}${coverageSection}`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map((m) => ({
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
