'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, MessageSquare, Lightbulb, Layers, Highlighter, StickyNote } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import PageSummary from './PageSummary';
import ChatPanel from './ChatPanel';
import ConceptsPanel from './ConceptsPanel';
import FlashcardsPanel from './FlashcardsPanel';
import StudySheetPanel from './StudySheetPanel';
import NotesPanel from './NotesPanel';
import clsx from 'clsx';

const tabs = [
  { id: 'summary' as const, icon: FileText, label: 'Summary' },
  { id: 'chat' as const, icon: MessageSquare, label: 'Ask AI' },
  { id: 'concepts' as const, icon: Lightbulb, label: 'Concepts' },
  { id: 'flashcards' as const, icon: Layers, label: 'Cards' },
  { id: 'studysheet' as const, icon: Highlighter, label: 'Sheet' },
  { id: 'notes' as const, icon: StickyNote, label: 'Notes' },
];

const activeColors: Record<string, string> = {
  summary: 'border-indigo-500 text-indigo-400',
  chat: 'border-violet-500 text-violet-400',
  concepts: 'border-yellow-500 text-yellow-400',
  flashcards: 'border-emerald-500 text-emerald-400',
  studysheet: 'border-amber-500 text-amber-400',
  notes: 'border-sky-500 text-sky-400',
};

export default function RightSidebar() {
  const { activePanel, setActivePanel, highlights, notes } = useStudyStore();

  return (
    <div className="flex flex-col h-full bg-[#0c0c18] border-l border-white/[0.06]">
      {/* Tab bar */}
      <div className="grid grid-cols-6 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={clsx(
              'relative flex flex-col items-center gap-1 py-3 text-xs transition-all duration-200 border-b-2',
              activePanel === tab.id
                ? activeColors[tab.id]
                : 'border-transparent text-slate-600 hover:text-slate-400'
            )}
          >
            <tab.icon size={13} />
            <span className="text-[10px] leading-tight">{tab.label}</span>
            {tab.id === 'studysheet' && highlights.length > 0 && (
              <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                {highlights.length > 99 ? '99+' : highlights.length}
              </span>
            )}
            {tab.id === 'notes' && notes.length > 0 && (
              <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-black">
                {notes.length > 99 ? '99+' : notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 overflow-hidden"
          >
            {activePanel === 'summary' && <PageSummary />}
            {activePanel === 'chat' && <ChatPanel />}
            {activePanel === 'concepts' && <ConceptsPanel />}
            {activePanel === 'flashcards' && <FlashcardsPanel />}
            {activePanel === 'studysheet' && <StudySheetPanel />}
            {activePanel === 'notes' && <NotesPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
