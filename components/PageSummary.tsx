'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, FileText, Sparkles, Volume2, Pause, Square } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import clsx from 'clsx';

type SpeechState = 'idle' | 'playing' | 'paused';

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
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const stopSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeechState('idle');
  };

  const startSpeech = (text: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeechState('idle');
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeechState('idle');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeechState('playing');
  };

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (speechState === 'playing') {
      synth.pause();
      setSpeechState('paused');
      return;
    }
    if (speechState === 'paused') {
      synth.resume();
      setSpeechState('playing');
      return;
    }
    const text = displayedSummary || (isSimpleMode ? simpleSummary : summary);
    startSpeech(text);
  };

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
      stopSpeech();
      // Reset cached simple summary for the new page so toggling triggers a fresh fetch.
      setSimpleSummary('');
      fetchSummary(currentPage, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageText]);

  // When the user toggles simple mode, swap to the cached version or fetch it on demand.
  useEffect(() => {
    if (!pageText[currentPage]) return;
    stopSpeech();
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

  // Stop any in-flight speech on unmount.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
          {speechSupported && (
            <>
              <button
                onClick={toggleSpeech}
                disabled={
                  summaryLoading ||
                  !(displayedSummary || (isSimpleMode ? simpleSummary : summary))
                }
                title={
                  speechState === 'playing'
                    ? 'Pause narration'
                    : speechState === 'paused'
                      ? 'Resume narration'
                      : 'Read summary aloud'
                }
                aria-pressed={speechState !== 'idle'}
                aria-label={
                  speechState === 'playing'
                    ? 'Pause narration'
                    : speechState === 'paused'
                      ? 'Resume narration'
                      : 'Read summary aloud'
                }
                className={clsx(
                  'p-1.5 rounded-lg transition-colors disabled:opacity-40',
                  speechState !== 'idle'
                    ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
                    : 'hover:bg-white/10 text-slate-500 hover:text-slate-300'
                )}
              >
                {speechState === 'playing' ? <Pause size={13} /> : <Volume2 size={13} />}
              </button>
              {speechState !== 'idle' && (
                <button
                  onClick={stopSpeech}
                  title="Stop narration"
                  aria-label="Stop narration"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Square size={13} />
                </button>
              )}
            </>
          )}
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
            <motion.div key={`summary-${currentPage}-${isSimpleMode ? 'simple' : 'detailed'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isSimpleMode && (
                <div className="mb-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-wider">
                  <Sparkles size={10} />
                  Explain like I&apos;m 10
                </div>
              )}
              <div className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${summaryLoading ? 'typing-cursor' : ''}`}>
                {displayedSummary || (isSimpleMode ? simpleSummary : summary)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
