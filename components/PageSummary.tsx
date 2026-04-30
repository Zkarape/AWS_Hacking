'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, FileText } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

export default function PageSummary() {
  const { currentPage, totalPages, pageText, summary, setSummary, summaryLoading, setSummaryLoading } =
    useStudyStore();
  const abortRef = useRef<AbortController | null>(null);
  const lastPage = useRef<number>(-1);
  const [displayedSummary, setDisplayedSummary] = useState('');

  const fetchSummary = async (page: number) => {
    const text = pageText[page];
    if (!text) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSummaryLoading(true);
    setSummary('');
    setDisplayedSummary('');

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, pageNumber: page, totalPages }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setDisplayedSummary(full);
        setSummary(full);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setDisplayedSummary('Could not generate summary. Check your API key.');
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== lastPage.current && pageText[currentPage]) {
      lastPage.current = currentPage;
      fetchSummary(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageText]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">Page Summary</span>
        </div>
        <button
          onClick={() => fetchSummary(currentPage)}
          disabled={summaryLoading}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
        >
          <motion.div animate={summaryLoading ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 1, repeat: summaryLoading ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={13} />
          </motion.div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {!pageText[currentPage] ? (
            <motion.div key="no-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText size={28} className="text-slate-700" />
              <p className="text-sm text-slate-500">Navigate to a page to see its summary</p>
            </motion.div>
          ) : summaryLoading && !displayedSummary ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {[80, 65, 90, 55, 75].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-3 rounded-full shimmer"
                  style={{ width: `${w}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div key={`summary-${currentPage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${summaryLoading ? 'typing-cursor' : ''}`}>
                {displayedSummary || summary}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
