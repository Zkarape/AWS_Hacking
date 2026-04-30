'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Target } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

const SIZE = 34;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DailyGoalRing() {
  const { dailyPageGoal, pagesReadToday, setDailyPageGoal } = useStudyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(dailyPageGoal));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftGoal(String(dailyPageGoal));
  }, [dailyPageGoal]);

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

  const progress = Math.max(0, Math.min(1, pagesReadToday / Math.max(1, dailyPageGoal)));
  const isComplete = pagesReadToday >= dailyPageGoal;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const commitGoal = () => {
    const n = parseInt(draftGoal, 10);
    if (Number.isFinite(n) && n > 0) {
      setDailyPageGoal(n);
    } else {
      setDraftGoal(String(dailyPageGoal));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-full hover:bg-white/5 transition-colors p-0.5"
        title={`Daily reading goal: ${pagesReadToday} / ${dailyPageGoal} pages`}
        aria-label={`Daily reading goal: ${pagesReadToday} of ${dailyPageGoal} pages read`}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isComplete ? '#34d399' : '#818cf8'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Check size={12} className="text-emerald-400" strokeWidth={3} />
          ) : (
            <span className="text-[9px] font-semibold text-slate-300 tabular-nums leading-none">
              {pagesReadToday}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 z-30 w-64 rounded-xl bg-[#14142b] border border-white/10 shadow-2xl shadow-black/60 p-3"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Target size={13} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Daily reading goal</p>
                <p className="text-[10px] text-slate-500">
                  {pagesReadToday} of {dailyPageGoal} pages read today
                </p>
              </div>
            </div>

            <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              Pages per day
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={draftGoal}
                onChange={(e) => setDraftGoal(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitGoal();
                    setIsOpen(false);
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => {
                  commitGoal();
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>

            {isComplete && (
              <p className="mt-2.5 text-[11px] text-emerald-300 leading-snug">
                Goal reached for today — nice work.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
