'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

const TRIGGER_SECONDS = 240;

export default function ReadingCoach() {
  const {
    currentPage,
    secondsOnPage,
    coachDismissedPages,
    dismissCoachForPage,
    setActivePanel,
    setPendingChatPrompt,
    pdfUrl,
  } = useStudyStore();

  const isVisible = useMemo(
    () =>
      !!pdfUrl &&
      secondsOnPage >= TRIGGER_SECONDS &&
      !coachDismissedPages.includes(currentPage),
    [pdfUrl, secondsOnPage, coachDismissedPages, currentPage]
  );

  const minutes = Math.floor(secondsOnPage / 60);

  const handleAccept = () => {
    setPendingChatPrompt(
      `I've been on page ${currentPage} for a few minutes. Can you break down the hard parts of this page into simpler pieces, walking through any confusing concepts step by step?`
    );
    setActivePanel('chat');
    dismissCoachForPage(currentPage);
  };

  const handleDismiss = () => {
    dismissCoachForPage(currentPage);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]"
          role="dialog"
          aria-live="polite"
        >
          <div className="relative flex items-start gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-indigo-950/95 to-violet-950/95 border border-indigo-700/50 shadow-2xl shadow-indigo-950/60 backdrop-blur-md">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <Sparkles size={16} className="text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-indigo-100 leading-snug">
                You've been on this page for {minutes} minute{minutes === 1 ? '' : 's'}
                {' — '}want me to break down the hard parts?
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleAccept}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Yes, break it down
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-indigo-300/70 hover:text-indigo-200 hover:bg-white/5 text-xs font-medium transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded-md text-indigo-400/60 hover:text-indigo-200 hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
