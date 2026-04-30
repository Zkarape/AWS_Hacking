'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useStudyStore } from '@/lib/store';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GoalConfetti() {
  const { dailyPageGoal, pagesReadToday, goalCelebratedDate, markGoalCelebrated } = useStudyStore();
  const firingRef = useRef(false);

  useEffect(() => {
    if (firingRef.current) return;
    if (pagesReadToday < dailyPageGoal) return;
    if (goalCelebratedDate === todayKey()) return;

    firingRef.current = true;
    markGoalCelebrated();

    const duration = 1800;
    const end = Date.now() + duration;
    const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        startVelocity: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        startVelocity: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        firingRef.current = false;
      }
    };

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      colors,
    });
    frame();
  }, [pagesReadToday, dailyPageGoal, goalCelebratedDate, markGoalCelebrated]);

  return null;
}
