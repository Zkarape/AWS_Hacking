'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { useStudyStore, type Concept } from '@/lib/store';

export default function ConceptsPanel() {
  const { currentPage, pageText, concepts, setConcepts, conceptsLoading, setConceptsLoading } = useStudyStore();
  const lastPage = useRef<number>(-1);
  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);

  const fetchConcepts = async (page: number) => {
    const text = pageText[page];
    if (!text) return;

    setConceptsLoading(true);
    setConcepts([]);

    try {
      const res = await fetch('/api/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setConcepts(data.concepts ?? []);
    } catch {
      setConcepts([]);
    } finally {
      setConceptsLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== lastPage.current && pageText[currentPage]) {
      lastPage.current = currentPage;
      fetchConcepts(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageText]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-400" />
          <span className="text-sm font-medium text-slate-300">Key Concepts</span>
        </div>
        <button
          onClick={() => fetchConcepts(currentPage)}
          disabled={conceptsLoading}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
        >
          <motion.div
            animate={conceptsLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: conceptsLoading ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw size={13} />
          </motion.div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!pageText[currentPage] ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12 text-center">
            <Lightbulb size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">Navigate to a page to extract concepts</p>
          </motion.div>
        ) : conceptsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="h-14 rounded-xl shimmer"
              />
            ))}
          </div>
        ) : concepts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-sm text-slate-500">No concepts found for this page</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {concepts.map((concept: Concept, i: number) => (
              <motion.div
                key={`${currentPage}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
              >
                <button
                  onClick={() => setExpandedConcept(expandedConcept === i ? null : i)}
                  className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-700/30 transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-lg shrink-0">{concept.emoji}</span>
                    <span className="text-xs font-semibold text-slate-200 flex-1">{concept.term}</span>
                    <motion.span
                      className="text-slate-600 text-xs"
                      animate={{ rotate: expandedConcept === i ? 180 : 0 }}
                    >
                      ▾
                    </motion.span>
                  </div>
                  <AnimatePresence>
                    {expandedConcept === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/[0.05]"
                      >
                        <p className="px-3 py-2.5 text-xs text-slate-400 leading-relaxed">{concept.definition}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
