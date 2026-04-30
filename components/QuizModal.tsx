'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, X } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

export default function QuizModal() {
  const {
    quizModalOpen,
    quizQuestions,
    quizLoading,
    quizError,
    pomodoroSessionPages,
    setQuizModalOpen,
    resetPomodoro,
  } = useStudyStore();

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!quizModalOpen) {
      setRevealed({});
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuizModalOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [quizModalOpen, setQuizModalOpen]);

  const sourceCount = pomodoroSessionPages.length;
  const sourceLabel = sourceCount === 1 ? '1 page' : `${sourceCount} pages`;

  const handleClose = () => setQuizModalOpen(false);
  const handleStartNew = () => {
    setQuizModalOpen(false);
    resetPomodoro();
  };

  return (
    <AnimatePresence>
      {quizModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[#14142b] border border-white/10 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles size={15} className="text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">What did you learn?</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quiz from your last focus session ({sourceLabel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1"
                aria-label="Close quiz"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {quizLoading && (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-3"
                    >
                      <div className="h-3 w-3/4 rounded bg-white/[0.06] shimmer mb-2" />
                      <div className="h-2.5 w-1/2 rounded bg-white/[0.04] shimmer" />
                    </div>
                  ))}
                </div>
              )}

              {!quizLoading && quizError && (
                <div className="rounded-lg bg-rose-950/40 border border-rose-700/40 px-3 py-3 text-xs text-rose-200">
                  {quizError}
                </div>
              )}

              {!quizLoading && !quizError && quizQuestions.length === 0 && (
                <div className="text-xs text-slate-400 leading-relaxed">
                  No quiz could be generated — try reading more pages during your focus session.
                </div>
              )}

              {!quizLoading && !quizError && quizQuestions.length > 0 && (
                <ol className="space-y-2.5">
                  {quizQuestions.map((q, i) => {
                    const isRevealed = !!revealed[i];
                    return (
                      <li
                        key={i}
                        className="rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                          className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-slate-200 leading-snug">
                            {q.question}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 text-slate-500 mt-1 transition-transform ${
                              isRevealed ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isRevealed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pl-11 text-[12.5px] text-slate-300 leading-relaxed border-t border-white/[0.04]">
                                <span className="block text-[10px] uppercase tracking-wide text-emerald-400/80 mb-1 mt-2">
                                  Answer
                                </span>
                                {q.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStartNew}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Start new session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
