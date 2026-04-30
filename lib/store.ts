'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { deletePdfBlob, getPdfBlob, savePdfBlob } from './pdfStorage';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Concept {
  term: string;
  definition: string;
  emoji: string;
}

export interface PdfHistoryEntry {
  id: string;
  filename: string;
  size: number;
  uploadedAt: number;
  pageCount?: number;
}

interface StudyStore {
  pdfFile: File | null;
  pdfUrl: string | null;
  currentPdfId: string | null;
  pdfHistory: PdfHistoryEntry[];
  currentPage: number;
  totalPages: number;
  pageText: Record<number, string>;
  selectedText: string;
  chatMessages: Message[];
  summary: string;
  summaryLoading: boolean;
  concepts: Concept[];
  conceptsLoading: boolean;
  flashcards: Flashcard[];
  flashcardsLoading: boolean;
  activePanel: 'summary' | 'chat' | 'concepts' | 'flashcards';
  bookmarks: number[];
  searchQuery: string;
  secondsOnPage: number;
  lastPageChangeTime: number;
  coachDismissedPages: number[];
  pendingChatPrompt: string;

  setPdfFile: (file: File) => void;
  loadPdfFromHistory: (id: string) => Promise<boolean>;
  removeFromHistory: (id: string) => Promise<void>;
  setHistoryPageCount: (id: string, n: number) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (n: number) => void;
  setPageText: (page: number, text: string) => void;
  setSelectedText: (text: string) => void;
  addChatMessage: (msg: Message) => void;
  clearChat: () => void;
  setSummary: (s: string) => void;
  setSummaryLoading: (v: boolean) => void;
  setConcepts: (c: Concept[]) => void;
  setConceptsLoading: (v: boolean) => void;
  setFlashcards: (f: Flashcard[]) => void;
  setFlashcardsLoading: (v: boolean) => void;
  setActivePanel: (p: StudyStore['activePanel']) => void;
  toggleBookmark: (page: number) => void;
  setSearchQuery: (q: string) => void;
  tickPageTimer: () => void;
  dismissCoachForPage: (page: number) => void;
  setPendingChatPrompt: (prompt: string) => void;
}

function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function revokeUrl(url: string | null) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* noop */
  }
}

const docResetSlice = {
  currentPage: 1,
  pageText: {} as Record<number, string>,
  selectedText: '',
  chatMessages: [] as Message[],
  summary: '',
  concepts: [] as Concept[],
  flashcards: [] as Flashcard[],
  bookmarks: [] as number[],
};

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      pdfFile: null,
      pdfUrl: null,
      currentPdfId: null,
      pdfHistory: [],
      currentPage: 1,
      totalPages: 0,
      pageText: {},
      selectedText: '',
      chatMessages: [],
      summary: '',
      summaryLoading: false,
      concepts: [],
      conceptsLoading: false,
      flashcards: [],
      flashcardsLoading: false,
      activePanel: 'summary',
      bookmarks: [],
      searchQuery: '',

      setPdfFile: (file) => {
        revokeUrl(get().pdfUrl);
        const url = URL.createObjectURL(file);
        const history = get().pdfHistory;
        const now = Date.now();
        const existing = history.find((h) => h.filename === file.name && h.size === file.size);
        const id = existing?.id ?? genId();
        const entry: PdfHistoryEntry = existing
          ? { ...existing, uploadedAt: now }
          : { id, filename: file.name, size: file.size, uploadedAt: now };
        const nextHistory = [entry, ...history.filter((h) => h.id !== id)];

        savePdfBlob(id, file).catch((err) => {
          console.error('Failed to persist PDF blob to library', err);
        });

        set({
          pdfFile: file,
          pdfUrl: url,
          currentPdfId: id,
          pdfHistory: nextHistory,
          ...docResetSlice,
        });
      },

      loadPdfFromHistory: async (id) => {
        const entry = get().pdfHistory.find((h) => h.id === id);
        if (!entry) return false;
        try {
          const blob = await getPdfBlob(id);
          if (!blob) {
            set({ pdfHistory: get().pdfHistory.filter((h) => h.id !== id) });
            return false;
          }
          const file = new File([blob], entry.filename, { type: 'application/pdf' });
          revokeUrl(get().pdfUrl);
          const url = URL.createObjectURL(file);
          const now = Date.now();
          set({
            pdfFile: file,
            pdfUrl: url,
            currentPdfId: id,
            pdfHistory: get().pdfHistory.map((h) =>
              h.id === id ? { ...h, uploadedAt: now } : h
            ),
            ...docResetSlice,
          });
          return true;
        } catch (err) {
          console.error('Failed to load PDF from library', err);
          return false;
        }
      },

      removeFromHistory: async (id) => {
        try {
          await deletePdfBlob(id);
        } catch (err) {
          console.error('Failed to delete PDF blob', err);
        }
        const state = get();
        const isCurrent = state.currentPdfId === id;
        if (isCurrent) revokeUrl(state.pdfUrl);
        set({
          pdfHistory: state.pdfHistory.filter((h) => h.id !== id),
          ...(isCurrent
            ? { pdfFile: null, pdfUrl: null, currentPdfId: null, totalPages: 0, ...docResetSlice }
            : {}),
        });
      },

      setHistoryPageCount: (id, n) => {
        set((s) => {
          const target = s.pdfHistory.find((h) => h.id === id);
          if (!target || target.pageCount === n) return s;
          return {
            pdfHistory: s.pdfHistory.map((h) => (h.id === id ? { ...h, pageCount: n } : h)),
          };
        });
      },

      setCurrentPage: (page) => set({ currentPage: page }),
      setTotalPages: (n) => set({ totalPages: n }),
      setPageText: (page, text) => set((s) => ({ pageText: { ...s.pageText, [page]: text } })),
      setSelectedText: (text) => set({ selectedText: text }),
      addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [], selectedText: '' }),
      setSummary: (s) => set({ summary: s }),
      setSummaryLoading: (v) => set({ summaryLoading: v }),
      setConcepts: (c) => set({ concepts: c }),
      setConceptsLoading: (v) => set({ conceptsLoading: v }),
      setFlashcards: (f) => set({ flashcards: f }),
      setFlashcardsLoading: (v) => set({ flashcardsLoading: v }),
      setActivePanel: (p) => set({ activePanel: p }),
      toggleBookmark: (page) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(page)
            ? s.bookmarks.filter((b) => b !== page)
            : [...s.bookmarks, page],
        })),
      setSearchQuery: (q) => set({ searchQuery: q }),
    }),
    {
      name: 'readmind-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pdfHistory: state.pdfHistory }),
    }
  )
);
