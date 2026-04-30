'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, RefreshCw, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useStudyStore, type Flashcard } from '@/lib/store';
import clsx from 'clsx';

export default function FlashcardsPanel() {
  const { currentPage, pageText, flashcards, setFlashcards, flashcardsLoading, setFlashcardsLoading } =
    useStudyStore();
  const lastPage = useRef<number>(-1);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const fetchFlashcards = async (page: number) => {
    const text = pageText[page];
    if (!text) return;

    setFlashcardsLoading(true);
    setFlashcards([]);
    setCardIndex(0);
    setFlipped(false);
    setRevealed(new Set());

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setFlashcards(data.flashcards ?? []);
    } catch {
      setFlashcards([]);
    } finally {
      setFlashcardsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== lastPage.current && pageText[currentPage]) {
      lastPage.current = currentPage;
      fetchFlashcards(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageText]);

  const handleFlip = () => {
    setFlipped((f) => !f);
    if (!flipped) setRevealed((r) => new Set([...r, cardIndex]));
  };

  const next = () => {
    setCardIndex((i) => (i + 1) % flashcards.length);
    setFlipped(false);
  };
  const prev = () => {
    setCardIndex((i) => (i - 1 + flashcards.length) % flashcards.length);
    setFlipped(false);
  };

  const currentCard: Flashcard | undefined = flashcards[cardIndex];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Flashcards</span>
          {flashcards.length > 0 && (
            <span className="text-xs text-slate-600">
              {cardIndex + 1}/{flashcards.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchFlashcards(currentPage)}
          disabled={flashcardsLoading}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
        >
          <motion.div
            animate={flashcardsLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: flashcardsLoading ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw size={13} />
          </motion.div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {!pageText[currentPage] ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <Layers size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">Navigate to a page to generate flashcards</p>
          </div>
        ) : flashcardsLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center"
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Layers size={24} className="text-emerald-500" />
            </motion.div>
            <p className="text-sm text-slate-500">Generating flashcards...</p>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <p className="text-sm text-slate-500">No flashcards generated for this page</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-4 flex-1">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {flashcards.map((_: Flashcard, i: number) => (
                <button
                  key={i}
                  onClick={() => { setCardIndex(i); setFlipped(false); }}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === cardIndex ? 'bg-emerald-400 w-4' : revealed.has(i) ? 'bg-emerald-700' : 'bg-white/10'
                  )}
                />
              ))}
            </div>

            {/* The card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={cardIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <div className="flashcard-scene w-full" style={{ height: 200 }}>
                  <div
                    className={clsx('flashcard-card w-full h-full cursor-pointer relative', { flipped })}
                    onClick={handleFlip}
                  >
                    {/* Front */}
                    <div className="flashcard-face absolute inset-0 rounded-2xl border border-emerald-800/30 bg-gradient-to-br from-emerald-950/60 to-slate-900/80 flex flex-col items-center justify-center p-5 gap-3">
                      <span className="text-xs text-emerald-500 uppercase tracking-widest font-medium">Question</span>
                      <p className="text-sm text-slate-200 text-center leading-relaxed font-medium">
                        {currentCard?.front}
                      </p>
                      <span className="text-xs text-slate-600 mt-auto">tap to reveal answer</span>
                    </div>
                    {/* Back */}
                    <div className="flashcard-face flashcard-back absolute inset-0 rounded-2xl border border-indigo-800/30 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 flex flex-col items-center justify-center p-5 gap-3">
                      <span className="text-xs text-indigo-400 uppercase tracking-widest font-medium">Answer</span>
                      <p className="text-sm text-slate-200 text-center leading-relaxed">{currentCard?.back}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
                        className="mt-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <RotateCcw size={11} /> flip back
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={prev}
                disabled={flashcards.length <= 1}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 transition-colors text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-500">
                {revealed.size}/{flashcards.length} reviewed
              </span>
              <button
                onClick={next}
                disabled={flashcards.length <= 1}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 transition-colors text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* All cards mini list */}
            <div className="w-full border-t border-white/[0.05] pt-3 space-y-1.5">
              <p className="text-xs text-slate-600 mb-2">All cards</p>
              {flashcards.map((card: Flashcard, i: number) => (
                <motion.button
                  key={i}
                  onClick={() => { setCardIndex(i); setFlipped(false); }}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                    i === cardIndex
                      ? 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-300'
                      : 'bg-white/[0.02] border border-transparent hover:border-white/10 text-slate-500 hover:text-slate-300'
                  )}
                  whileHover={{ x: 2 }}
                >
                  {card.front}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
