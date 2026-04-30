'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { useStudyStore, type QuizQuestion, type QuizRange } from '@/lib/store';
import clsx from 'clsx';

type Mode = 'page' | 'range';

export default function QuizPanel() {
  const {
    currentPage,
    totalPages,
    pageText,
    quizQuestions,
    setQuizQuestions,
    quizLoading,
    setQuizLoading,
    quizRange,
    setQuizRange,
  } = useStudyStore();

  const [mode, setMode] = useState<Mode>('page');
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (totalPages > 0) {
      setRangeFrom((prev) => Math.min(Math.max(1, prev), totalPages));
      setRangeTo((prev) => {
        const next = prev < 1 ? Math.min(currentPage, totalPages) : Math.min(prev, totalPages);
        return Math.max(next, 1);
      });
    }
  }, [totalPages, currentPage]);

  const collectText = (from: number, to: number): string => {
    const lo = Math.max(1, Math.min(from, to));
    const hi = Math.min(totalPages || to, Math.max(from, to));
    const parts: string[] = [];
    for (let p = lo; p <= hi; p++) {
      const t = pageText[p];
      if (t) parts.push(`[Page ${p}]\n${t}`);
    }
    return parts.join('\n\n');
  };

  const generate = async () => {
    let from: number;
    let to: number;
    if (mode === 'page') {
      from = currentPage;
      to = currentPage;
    } else {
      from = Math.max(1, Math.min(rangeFrom, rangeTo));
      to = Math.max(rangeFrom, rangeTo);
    }

    const text = collectText(from, to);
    if (!text.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQuizLoading(true);
    setQuizQuestions([]);
    setQuestionIndex(0);
    setAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fromPage: from, toPage: to }),
        signal: controller.signal,
      });
      const data = await res.json();
      const questions: QuizQuestion[] = Array.isArray(data.questions) ? data.questions : [];
      setQuizQuestions(questions);
      const range: QuizRange = { from, to };
      setQuizRange(range);
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setQuizQuestions([]);
      }
    } finally {
      if (!controller.signal.aborted) setQuizLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const score = useMemo(() => {
    if (quizQuestions.length === 0) return 0;
    return quizQuestions.reduce((acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc), 0);
  }, [quizQuestions, answers]);

  const allAnswered = quizQuestions.length > 0 && quizQuestions.every((_, i) => typeof answers[i] === 'number');

  const handleSelect = (qIndex: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setQuestionIndex(0);
  };

  const next = () => setQuestionIndex((i) => Math.min(i + 1, quizQuestions.length - 1));
  const prev = () => setQuestionIndex((i) => Math.max(i - 1, 0));

  const current: QuizQuestion | undefined = quizQuestions[questionIndex];
  const hasText = !!pageText[currentPage] || Object.keys(pageText).length > 0;

  const rangeLabel = quizRange
    ? quizRange.from === quizRange.to
      ? `page ${quizRange.from}`
      : `pages ${quizRange.from}–${quizRange.to}`
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-rose-400" />
          <span className="text-sm font-medium text-slate-300">Quiz</span>
          {quizQuestions.length > 0 && (
            <span className="text-xs text-slate-600">
              {questionIndex + 1}/{quizQuestions.length}
              {rangeLabel ? ` · ${rangeLabel}` : ''}
            </span>
          )}
        </div>
        {quizQuestions.length > 0 && (
          <button
            onClick={generate}
            disabled={quizLoading}
            title="Regenerate quiz"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            <motion.div
              animate={quizLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: quizLoading ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw size={13} />
            </motion.div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasText ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <HelpCircle size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">Open a page to generate a quiz</p>
          </div>
        ) : quizQuestions.length === 0 ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-br from-rose-950/40 to-slate-900/70 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-rose-400" />
                <span className="text-sm font-medium text-slate-200">End-of-Chapter Quiz</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate 5 multiple-choice questions to test your understanding. Pick the current page or a range.
              </p>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setMode('page')}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-xs transition-colors border',
                    mode === 'page'
                      ? 'bg-rose-950/60 border-rose-700/50 text-rose-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  )}
                >
                  Current page ({currentPage})
                </button>
                <button
                  onClick={() => setMode('range')}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-xs transition-colors border',
                    mode === 'range'
                      ? 'bg-rose-950/60 border-rose-700/50 text-rose-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  )}
                >
                  Page range
                </button>
              </div>

              {mode === 'range' && (
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-slate-500">From</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalPages)}
                    value={rangeFrom}
                    onChange={(e) =>
                      setRangeFrom(Math.max(1, Math.min(Number(e.target.value) || 1, totalPages || 1)))
                    }
                    className="w-16 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-rose-700/60"
                  />
                  <label className="text-xs text-slate-500">to</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalPages)}
                    value={rangeTo}
                    onChange={(e) =>
                      setRangeTo(Math.max(1, Math.min(Number(e.target.value) || 1, totalPages || 1)))
                    }
                    className="w-16 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-rose-700/60"
                  />
                  <span className="text-xs text-slate-600">of {totalPages}</span>
                </div>
              )}

              <button
                onClick={generate}
                disabled={quizLoading}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/60 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {quizLoading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Sparkles size={14} />
                    </motion.div>
                    Generating questions...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate quiz
                  </>
                )}
              </button>

              {mode === 'range' && rangeFrom > rangeTo && (
                <p className="text-xs text-amber-400">Heads up — “from” is after “to”; we'll swap them when generating.</p>
              )}
            </div>
          </div>
        ) : submitted ? (
          <div className="flex flex-col gap-4 p-4">
            <div
              className={clsx(
                'rounded-2xl border p-5 flex flex-col items-center gap-3',
                score === quizQuestions.length
                  ? 'border-emerald-700/50 bg-gradient-to-br from-emerald-950/60 to-slate-900/80'
                  : score >= Math.ceil(quizQuestions.length / 2)
                    ? 'border-amber-700/50 bg-gradient-to-br from-amber-950/60 to-slate-900/80'
                    : 'border-rose-700/50 bg-gradient-to-br from-rose-950/60 to-slate-900/80'
              )}
            >
              <Trophy
                size={32}
                className={clsx(
                  score === quizQuestions.length
                    ? 'text-emerald-400'
                    : score >= Math.ceil(quizQuestions.length / 2)
                      ? 'text-amber-400'
                      : 'text-rose-400'
                )}
              />
              <div className="text-3xl font-bold text-slate-100">
                {score}/{quizQuestions.length}
              </div>
              <div className="text-xs text-slate-400">
                {score === quizQuestions.length
                  ? 'Perfect — you nailed it.'
                  : score >= Math.ceil(quizQuestions.length / 2)
                    ? 'Solid work. Review the misses below.'
                    : 'Worth another pass — explanations are below.'}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={11} /> Retake
                </button>
                <button
                  onClick={generate}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles size={11} /> New quiz
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {quizQuestions.map((q, qi) => {
                const userAnswer = answers[qi];
                const isCorrect = userAnswer === q.correctIndex;
                return (
                  <div
                    key={qi}
                    className={clsx(
                      'rounded-xl border p-3.5 flex flex-col gap-2',
                      isCorrect
                        ? 'border-emerald-800/40 bg-emerald-950/20'
                        : 'border-rose-800/40 bg-rose-950/20'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={clsx(
                          'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                          isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        )}
                      >
                        {isCorrect ? <Check size={12} /> : <X size={12} />}
                      </span>
                      <p className="text-sm text-slate-200 font-medium leading-snug">
                        {qi + 1}. {q.question}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 pl-7">
                      {q.options.map((opt, oi) => {
                        const isUser = userAnswer === oi;
                        const isRight = q.correctIndex === oi;
                        return (
                          <div
                            key={oi}
                            className={clsx(
                              'text-xs px-2.5 py-1.5 rounded-md border',
                              isRight
                                ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
                                : isUser
                                  ? 'border-rose-700/50 bg-rose-950/40 text-rose-200'
                                  : 'border-white/[0.04] text-slate-500'
                            )}
                          >
                            <span className="mr-2 text-[10px] uppercase tracking-wider opacity-60">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                            {isRight && <span className="ml-2 text-[10px] uppercase tracking-wider">correct</span>}
                            {isUser && !isRight && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider">your answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-slate-400 leading-relaxed pl-7 pt-1 border-t border-white/[0.04] mt-1">
                        <span className="text-slate-500 font-medium">Why: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-1.5">
              {quizQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setQuestionIndex(i)}
                  className={clsx(
                    'h-2 rounded-full transition-all duration-300',
                    i === questionIndex
                      ? 'w-6 bg-rose-400'
                      : typeof answers[i] === 'number'
                        ? 'w-2 bg-rose-700'
                        : 'w-2 bg-white/10'
                  )}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={questionIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-2xl border border-rose-900/40 bg-gradient-to-br from-rose-950/40 to-slate-900/70 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-rose-400 uppercase tracking-widest font-medium mt-0.5">
                      Q{questionIndex + 1}
                    </span>
                    <p className="text-sm text-slate-100 leading-snug font-medium">{current.question}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {current.options.map((opt, oi) => {
                      const isSelected = answers[questionIndex] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => handleSelect(questionIndex, oi)}
                          className={clsx(
                            'text-left px-3 py-2.5 rounded-lg text-xs transition-all border flex items-start gap-2',
                            isSelected
                              ? 'border-rose-600 bg-rose-950/60 text-rose-100'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-slate-300'
                          )}
                        >
                          <span
                            className={clsx(
                              'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold',
                              isSelected
                                ? 'border-rose-400 bg-rose-500/30 text-rose-200'
                                : 'border-white/20 text-slate-500'
                            )}
                          >
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                disabled={questionIndex === 0}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-500 flex-1 text-center">
                {Object.keys(answers).length}/{quizQuestions.length} answered
              </span>
              {questionIndex < quizQuestions.length - 1 ? (
                <button
                  onClick={next}
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-slate-400"
                >
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950/40 disabled:text-rose-700 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Check size={12} /> Submit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
