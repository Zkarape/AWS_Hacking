'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, FileText, Sparkles, BookOpen, X } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import clsx from 'clsx';

interface JargonTerm {
  term: string;
  definition: string;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildJargonRegex(terms: JargonTerm[]): RegExp | null {
  if (!terms.length) return null;
  // Sort longest first so multi-word phrases win over their substrings.
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = sorted.map((t) => escapeRegex(t.term)).join('|');
  return new RegExp(`\\b(?:${pattern})\\b`, 'gi');
}

export default function PageSummary() {
  const {
    currentPage,
    totalPages,
    pageText,
    summary,
    setSummary,
    simpleSummary,
    setSimpleSummary,
    isSimpleMode,
    toggleSimpleMode,
    summaryLoading,
    setSummaryLoading,
  } = useStudyStore();
  const abortRef = useRef<AbortController | null>(null);
  const lastPage = useRef<number>(-1);
  const [displayedSummary, setDisplayedSummary] = useState('');

  const [terms, setTerms] = useState<JargonTerm[]>([]);
  const jargonCacheRef = useRef<Map<string, JargonTerm[]>>(new Map());
  const jargonAbortRef = useRef<AbortController | null>(null);
  const [activeTerm, setActiveTerm] = useState<{
    term: JargonTerm;
    rect: { top: number; bottom: number; left: number; right: number };
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchSummary = async (page: number, simpleMode: boolean) => {
    const text = pageText[page];
    if (!text) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSummaryLoading(true);
    if (simpleMode) {
      setSimpleSummary('');
    } else {
      setSummary('');
    }
    setDisplayedSummary('');

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, pageNumber: page, totalPages, simpleMode }),
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
        if (simpleMode) {
          setSimpleSummary(full);
        } else {
          setSummary(full);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setDisplayedSummary('Could not generate summary. Check your API key.');
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch detailed summary when navigating to a new page.
  useEffect(() => {
    if (currentPage !== lastPage.current && pageText[currentPage]) {
      lastPage.current = currentPage;
      // Reset cached simple summary for the new page so toggling triggers a fresh fetch.
      setSimpleSummary('');
      fetchSummary(currentPage, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageText]);

  // When the user toggles simple mode, swap to the cached version or fetch it on demand.
  useEffect(() => {
    if (!pageText[currentPage]) return;
    if (isSimpleMode) {
      if (simpleSummary) {
        setDisplayedSummary(simpleSummary);
      } else {
        fetchSummary(currentPage, true);
      }
    } else {
      if (summary) {
        setDisplayedSummary(summary);
      } else {
        fetchSummary(currentPage, false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimpleMode]);

  // Detect jargon once a summary has finished streaming. Cache by summary text so
  // toggling between modes or pages doesn't re-fetch a definition we already have.
  useEffect(() => {
    setActiveTerm(null);
    if (summaryLoading || !displayedSummary) {
      setTerms([]);
      return;
    }
    const cached = jargonCacheRef.current.get(displayedSummary);
    if (cached) {
      setTerms(cached);
      return;
    }
    jargonAbortRef.current?.abort();
    const ctrl = new AbortController();
    jargonAbortRef.current = ctrl;
    const snapshot = displayedSummary;
    fetch('/api/jargon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: snapshot }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { terms: [] }))
      .then((data) => {
        if (ctrl.signal.aborted) return;
        const list: JargonTerm[] = Array.isArray(data?.terms)
          ? data.terms.filter(
              (t: unknown): t is JargonTerm =>
                !!t &&
                typeof (t as JargonTerm).term === 'string' &&
                typeof (t as JargonTerm).definition === 'string'
            )
          : [];
        jargonCacheRef.current.set(snapshot, list);
        setTerms(list);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [summaryLoading, displayedSummary]);

  // Dismiss the popover on outside click, Escape, or when the panel scrolls.
  useEffect(() => {
    if (!activeTerm) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveTerm(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTerm(null);
    };
    const onScroll = () => setActiveTerm(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    scrollRef.current?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      scrollRef.current?.removeEventListener('scroll', onScroll);
    };
  }, [activeTerm]);

  const handleTermClick = (
    term: JargonTerm,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveTerm((prev) =>
      prev?.term.term.toLowerCase() === term.term.toLowerCase()
        ? null
        : {
            term,
            rect: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
            },
          }
    );
  };

  const summaryText = displayedSummary || (isSimpleMode ? simpleSummary : summary);

  const summaryNodes = useMemo<React.ReactNode>(() => {
    if (!summaryText) return null;
    const regex = buildJargonRegex(terms);
    if (!regex) return summaryText;

    const lookup = new Map(terms.map((t) => [t.term.toLowerCase(), t]));
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(summaryText)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(summaryText.slice(lastIndex, match.index));
      }
      const matched = match[0];
      const term = lookup.get(matched.toLowerCase());
      if (term) {
        nodes.push(
          <button
            key={`jt-${key++}-${match.index}`}
            type="button"
            onClick={(e) => handleTermClick(term, e)}
            className="text-indigo-300 underline decoration-dotted decoration-indigo-400/60 underline-offset-[3px] hover:text-indigo-200 hover:decoration-indigo-300 hover:bg-indigo-500/10 rounded-sm px-0.5 -mx-0.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/60 cursor-pointer"
          >
            {matched}
          </button>
        );
      } else {
        nodes.push(matched);
      }
      lastIndex = match.index + matched.length;
      // Guard against zero-width matches (shouldn't happen with our pattern).
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
    if (lastIndex < summaryText.length) {
      nodes.push(summaryText.slice(lastIndex));
    }
    return nodes;
  // handleTermClick is stable enough; recomputing on every render is cheap.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryText, terms]);

  // Compute popover position (clamped to viewport).
  const popoverStyle = useMemo<React.CSSProperties | null>(() => {
    if (!activeTerm) return null;
    if (typeof window === 'undefined') return null;
    const POPOVER_W = 280;
    const margin = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const anchorCenter = (activeTerm.rect.left + activeTerm.rect.right) / 2;
    let left = anchorCenter - POPOVER_W / 2;
    left = Math.max(margin, Math.min(left, viewportW - POPOVER_W - margin));
    const spaceBelow = viewportH - activeTerm.rect.bottom;
    const showAbove = spaceBelow < 140 && activeTerm.rect.top > 140;
    const top = showAbove
      ? Math.max(margin, activeTerm.rect.top - 12)
      : Math.min(viewportH - margin, activeTerm.rect.bottom + 8);
    return {
      position: 'fixed',
      top,
      left,
      width: POPOVER_W,
      maxWidth: `calc(100vw - ${margin * 2}px)`,
      transform: showAbove ? 'translateY(-100%)' : undefined,
      zIndex: 60,
    };
  }, [activeTerm]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">Page Summary</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSimpleMode}
            disabled={summaryLoading || !pageText[currentPage]}
            title={isSimpleMode ? 'Show detailed summary' : "Explain like I'm 10"}
            aria-pressed={isSimpleMode}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40',
              isSimpleMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:border-amber-500/40 hover:text-amber-300'
            )}
          >
            <Sparkles size={11} />
            ELI10
          </button>
          <button
            onClick={() => fetchSummary(currentPage, isSimpleMode)}
            disabled={summaryLoading}
            title="Regenerate summary"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            <motion.div animate={summaryLoading ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 1, repeat: summaryLoading ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
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
            <motion.div key={`summary-${currentPage}-${isSimpleMode ? 'simple' : 'detailed'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isSimpleMode && (
                <div className="mb-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-wider">
                  <Sparkles size={10} />
                  Explain like I&apos;m 10
                </div>
              )}
              <div className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${summaryLoading ? 'typing-cursor' : ''}`}>
                {summaryNodes}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeTerm && popoverStyle && (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-label={`Definition of ${activeTerm.term.term}`}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={popoverStyle}
            className="rounded-lg border border-indigo-400/30 bg-[#10101e]/95 backdrop-blur-md shadow-2xl shadow-black/40 px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <BookOpen size={12} className="mt-0.5 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  {activeTerm.term.term}
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {activeTerm.term.definition}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTerm(null)}
                className="shrink-0 -m-1 p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                aria-label="Close definition"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
