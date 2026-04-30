'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Highlighter, Sparkles, X, Copy, Check, Trash2, RefreshCw } from 'lucide-react';
import { useStudyStore, type HighlightColor } from '@/lib/store';
import clsx from 'clsx';

const COLOR_DOT: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-green-300',
  pink: 'bg-pink-300',
  blue: 'bg-blue-300',
  purple: 'bg-purple-300',
};

const COLOR_BORDER: Record<HighlightColor, string> = {
  yellow: 'border-yellow-300/30',
  green: 'border-green-300/30',
  pink: 'border-pink-300/30',
  blue: 'border-blue-300/30',
  purple: 'border-purple-300/30',
};

export default function StudySheetPanel() {
  const {
    highlights,
    removeHighlight,
    clearHighlights,
    setCurrentPage,
    studySheet,
    studySheetLoading,
    setStudySheet,
    setStudySheetLoading,
    totalPages,
    pdfFile,
  } = useStudyStore();

  const abortRef = useRef<AbortController | null>(null);
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<number, typeof highlights>();
    for (const h of highlights) {
      const arr = map.get(h.page) ?? [];
      arr.push(h);
      map.set(h.page, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [highlights]);

  const generateStudySheet = async () => {
    if (highlights.length === 0 || studySheetLoading) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStudySheetLoading(true);
    setStudySheet('');

    try {
      const res = await fetch('/api/study-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highlights: highlights.map((h) => ({ page: h.page, text: h.text, color: h.color })),
          totalPages,
          documentName: pdfFile?.name,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStudySheet(full);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setStudySheet('Could not generate study sheet. Check your API key.');
      }
    } finally {
      setStudySheetLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!studySheet) return;
    try {
      await navigator.clipboard.writeText(studySheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Highlighter size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-slate-300">Study Sheet</span>
          {highlights.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/50 text-amber-300 border border-amber-800/40">
              {highlights.length}
            </span>
          )}
        </div>
        {highlights.length > 0 && (
          <button
            onClick={clearHighlights}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
            title="Clear all highlights"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {highlights.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-12 px-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center">
              <Highlighter size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">No highlights yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Select text in the PDF and pick a color to start building your study sheet.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Highlights list */}
            <div className="space-y-3">
              {grouped.map(([page, items]) => (
                <div key={page}>
                  <button
                    onClick={() => setCurrentPage(page)}
                    className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-indigo-300 px-1 mb-1.5 transition-colors"
                  >
                    Page {page} · {items.length}
                  </button>
                  <div className="space-y-1.5">
                    {items.map((h) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={clsx(
                          'group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border',
                          COLOR_BORDER[h.color],
                          'hover:bg-white/[0.05] transition-colors'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                            COLOR_DOT[h.color]
                          )}
                        />
                        <button
                          onClick={() => setCurrentPage(h.page)}
                          className="flex-1 text-left text-xs text-slate-300 leading-relaxed line-clamp-3"
                          title={h.text}
                        >
                          {h.text}
                        </button>
                        <button
                          onClick={() => removeHighlight(h.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all shrink-0"
                          title="Remove highlight"
                        >
                          <X size={11} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Generate button */}
            <button
              onClick={generateStudySheet}
              disabled={studySheetLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-amber-900/30"
            >
              {studySheetLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{studySheet ? 'Regenerate Study Sheet' : 'Generate Study Sheet'}</span>
                </>
              )}
            </button>

            {/* Generated study sheet */}
            <AnimatePresence>
              {(studySheet || studySheetLoading) && (
                <motion.div
                  key="sheet"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400">
                      Personalized Sheet
                    </span>
                    {studySheet && !studySheetLoading && (
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy markdown"
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={clsx(
                      'p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono',
                      studySheetLoading && !studySheet && 'shimmer h-32 rounded-b-xl',
                      studySheetLoading && studySheet && 'typing-cursor'
                    )}
                  >
                    {studySheet}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
