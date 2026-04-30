'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Download, Plus, Trash2, X } from 'lucide-react';
import { useStudyStore, type Note } from '@/lib/store';

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildMarkdown(notes: Note[], documentName: string | undefined) {
  const sorted = [...notes].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt);
  const header = documentName ? `# Notes — ${documentName}` : '# Notes';
  const exportedAt = `_Exported on ${formatTimestamp(Date.now())}_`;
  const sections = sorted.map((n) => {
    const body = n.text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    return `## Page ${n.page}\n\n${body}\n\n_${formatTimestamp(n.createdAt)}_`;
  });
  return [header, exportedAt, '---', ...sections].join('\n\n') + '\n';
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function NotesPanel() {
  const {
    notes,
    addNote,
    removeNote,
    clearNotes,
    currentPage,
    setCurrentPage,
    pdfFile,
  } = useStudyStore();

  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addNote(trimmed, currentPage);
    setDraft('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleExport = () => {
    if (notes.length === 0) return;
    const baseName = (pdfFile?.name ?? 'notes').replace(/\.pdf$/i, '');
    const safe = baseName.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'notes';
    const filename = `${safe}-notes.md`;
    downloadMarkdown(buildMarkdown(notes, pdfFile?.name), filename);
  };

  const sorted = useMemo(() => [...notes].sort((a, b) => b.createdAt - a.createdAt), [notes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-sky-400" />
          <span className="text-sm font-medium text-slate-300">Notes</span>
          {notes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-950/50 text-sky-300 border border-sky-800/40">
              {notes.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            disabled={notes.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-sky-300 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
            title="Export notes as markdown"
          >
            <Download size={12} />
            <span>Export</span>
          </button>
          {notes.length > 0 && (
            <button
              onClick={clearNotes}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
              title="Clear all notes"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            New note
          </span>
          <span className="text-[10px] text-sky-400/80">Page {currentPage}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jot down a thought…"
          rows={3}
          className="w-full resize-none rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/20 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-600">⌘/Ctrl + Enter to add</span>
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <Plus size={12} />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-12 px-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-center">
              <StickyNote size={22} className="text-sky-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">No notes yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Capture thoughts as you read. Each note is tagged with the page you're on, and you can export the lot as markdown.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="p-3 space-y-2">
            <AnimatePresence initial={false}>
              {sorted.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="group rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center justify-between px-2.5 pt-2">
                    <button
                      onClick={() => setCurrentPage(n.page)}
                      className="text-[10px] uppercase tracking-wider text-sky-400/80 hover:text-sky-300 transition-colors"
                      title={`Jump to page ${n.page}`}
                    >
                      Page {n.page}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">
                        {formatTimestamp(n.createdAt)}
                      </span>
                      <button
                        onClick={() => removeNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-all"
                        title="Delete note"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="px-2.5 py-2 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {n.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
