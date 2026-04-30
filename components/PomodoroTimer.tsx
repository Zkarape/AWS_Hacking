'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PomodoroTimer() {
  const {
    pomodoroDuration,
    pomodoroRemaining,
    pomodoroRunning,
    pomodoroSessionPages,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    tickPomodoro,
    setPomodoroDuration,
    setQuizModalOpen,
    setQuizLoading,
    setQuizError,
    setQuizQuestions,
  } = useStudyStore();

  const [isOpen, setIsOpen] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(String(Math.round(pomodoroDuration / 60)));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftMinutes(String(Math.round(pomodoroDuration / 60)));
  }, [pomodoroDuration]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const triggerQuiz = async () => {
    const pages = useStudyStore.getState().pomodoroSessionPages;
    setQuizLoading(true);
    setQuizError(null);
    setQuizQuestions([]);
    setQuizModalOpen(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pages.map((p) => ({
            pdfFilename: p.pdfFilename,
            page: p.page,
            text: p.text,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Quiz request failed (${res.status})`);
      const data = (await res.json()) as { questions?: Array<{ question: string; answer: string }>; error?: string };
      if (data.error) throw new Error(data.error);
      setQuizQuestions(data.questions || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quiz';
      setQuizError(msg);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = window.setInterval(() => {
      const expired = tickPomodoro();
      if (expired) triggerQuiz();
    }, 1000);
    return () => window.clearInterval(id);
    // triggerQuiz intentionally omitted — captured via store getState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroRunning, tickPomodoro]);

  const commitDuration = () => {
    const n = parseInt(draftMinutes, 10);
    if (Number.isFinite(n) && n > 0) {
      setPomodoroDuration(n * 60);
    } else {
      setDraftMinutes(String(Math.round(pomodoroDuration / 60)));
    }
  };

  const isFinished = pomodoroRemaining === 0 && !pomodoroRunning;
  const display = formatTime(pomodoroRemaining);

  const progress = Math.max(
    0,
    Math.min(1, 1 - pomodoroRemaining / Math.max(1, pomodoroDuration))
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-all duration-200 border ${
          pomodoroRunning
            ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700/40'
            : isFinished
            ? 'bg-emerald-950/60 text-emerald-200 border-emerald-700/40'
            : 'text-slate-400 border-transparent hover:border-white/10 hover:text-slate-200'
        }`}
        title={pomodoroRunning ? 'Focus session running' : 'Pomodoro focus timer'}
        aria-label="Pomodoro focus timer"
      >
        <Timer size={13} className={pomodoroRunning ? 'text-indigo-300' : ''} />
        <span>{display}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 z-30 w-72 rounded-xl bg-[#14142b] border border-white/10 shadow-2xl shadow-black/60 p-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Timer size={13} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Pomodoro focus timer</p>
                <p className="text-[10px] text-slate-500">
                  When it rings, ReadMind quizzes you on what you read.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-black/30 border border-white/[0.06] px-3 py-2.5 mb-2.5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-semibold text-slate-100 tabular-nums tracking-tight">
                  {display}
                </span>
                <span className="text-[10px] text-slate-500">
                  {pomodoroSessionPages.length}{' '}
                  {pomodoroSessionPages.length === 1 ? 'page' : 'pages'} this session
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div
                  className={pomodoroRunning ? 'h-full bg-indigo-400' : 'h-full bg-slate-500'}
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              {pomodoroRunning ? (
                <button
                  type="button"
                  onClick={pausePomodoro}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Pause size={12} />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startPomodoro}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  <Play size={12} />
                  {pomodoroRemaining > 0 && pomodoroRemaining < pomodoroDuration ? 'Resume' : 'Start'}
                </button>
              )}
              <button
                type="button"
                onClick={resetPomodoro}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                title="Reset timer"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              Session length (minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={120}
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(e.target.value)}
                onBlur={commitDuration}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitDuration();
                }}
                disabled={pomodoroRunning}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={commitDuration}
                disabled={pomodoroRunning}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>

            {isFinished && (
              <p className="mt-2.5 text-[11px] text-emerald-300 leading-snug">
                Session complete — quiz ready.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
