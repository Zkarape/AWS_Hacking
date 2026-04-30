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

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue' | 'purple';

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  page: number;
  text: string;
  color: HighlightColor;
  rects: HighlightRect[];
  captureWidth: number;
  createdAt: number;
}

export type ActivePanel = 'summary' | 'chat' | 'concepts' | 'flashcards' | 'studysheet';

export interface PdfHistoryEntry {
  id: string;
  filename: string;
  size: number;
  uploadedAt: number;
  pageCount?: number;
}

const PAGE_HISTORY_LIMIT = 3;

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
  simpleSummary: string;
  isSimpleMode: boolean;
  summaryLoading: boolean;
  concepts: Concept[];
  conceptsLoading: boolean;
  flashcards: Flashcard[];
  flashcardsLoading: boolean;
  highlights: Highlight[];
  studySheet: string;
  studySheetLoading: boolean;
  activePanel: ActivePanel;
  bookmarks: number[];
  searchQuery: string;
  secondsOnPage: number;
  lastPageChangeTime: number;
  coachDismissedPages: number[];
  pendingChatPrompt: string;
  pageHistory: number[];
  lostBridge: string;
  lostBridgeLoading: boolean;
  isLostBridgeVisible: boolean;

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
  setSimpleSummary: (s: string) => void;
  setIsSimpleMode: (v: boolean) => void;
  toggleSimpleMode: () => void;
  setSummaryLoading: (v: boolean) => void;
  setConcepts: (c: Concept[]) => void;
  setConceptsLoading: (v: boolean) => void;
  setFlashcards: (f: Flashcard[]) => void;
  setFlashcardsLoading: (v: boolean) => void;
  addHighlight: (h: Omit<Highlight, 'id' | 'createdAt'>) => void;
  removeHighlight: (id: string) => void;
  clearHighlights: () => void;
  setStudySheet: (s: string) => void;
  setStudySheetLoading: (v: boolean) => void;
  setActivePanel: (p: ActivePanel) => void;
  toggleBookmark: (page: number) => void;
  setSearchQuery: (q: string) => void;
  tickPageTimer: () => void;
  dismissCoachForPage: (page: number) => void;
  setPendingChatPrompt: (prompt: string) => void;
  openLostBridge: () => void;
  closeLostBridge: () => void;
  setLostBridge: (s: string) => void;
  setLostBridgeLoading: (v: boolean) => void;
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

// Append `page` to the navigation history, dedupe, and cap at PAGE_HISTORY_LIMIT.
// Most recent page is last.
function pushPageHistory(history: number[], page: number): number[] {
  const filtered = history.filter((p) => p !== page);
  filtered.push(page);
  if (filtered.length > PAGE_HISTORY_LIMIT) {
    return filtered.slice(filtered.length - PAGE_HISTORY_LIMIT);
  }
  return filtered;
}

const docResetSlice = {
  currentPage: 1,
  pageText: {} as Record<number, string>,
  selectedText: '',
  chatMessages: [] as Message[],
  summary: '',
  simpleSummary: '',
  isSimpleMode: false,
  concepts: [] as Concept[],
  flashcards: [] as Flashcard[],
  highlights: [] as Highlight[],
  studySheet: '',
  studySheetLoading: false,
  bookmarks: [] as number[],
  secondsOnPage: 0,
  lastPageChangeTime: Date.now(),
  coachDismissedPages: [] as number[],
  pendingChatPrompt: '',
  pageHistory: [1] as number[],
  lostBridge: '',
  lostBridgeLoading: false,
  isLostBridgeVisible: false,
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
      simpleSummary: '',
      isSimpleMode: false,
      summaryLoading: false,
      concepts: [],
      conceptsLoading: false,
      flashcards: [],
      flashcardsLoading: false,
      highlights: [],
      studySheet: '',
      studySheetLoading: false,
      activePanel: 'summary',
      bookmarks: [],
      searchQuery: '',
      secondsOnPage: 0,
      lastPageChangeTime: Date.now(),
      coachDismissedPages: [],
      pendingChatPrompt: '',
      pageHistory: [1],
      lostBridge: '',
      lostBridgeLoading: false,
      isLostBridgeVisible: false,

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
          lastPageChangeTime: Date.now(),
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
            lastPageChangeTime: Date.now(),
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
            ? {
                pdfFile: null,
                pdfUrl: null,
                currentPdfId: null,
                totalPages: 0,
                ...docResetSlice,
                lastPageChangeTime: Date.now(),
              }
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

      setCurrentPage: (page) =>
        set((s) => {
          if (page === s.currentPage) return s;
          return {
            currentPage: page,
            pageHistory: pushPageHistory(s.pageHistory, page),
            secondsOnPage: 0,
            lastPageChangeTime: Date.now(),
          };
        }),
      setTotalPages: (n) => set({ totalPages: n }),
      setPageText: (page, text) => set((s) => ({ pageText: { ...s.pageText, [page]: text } })),
      setSelectedText: (text) => set({ selectedText: text }),
      addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [], selectedText: '' }),
      setSummary: (s) => set({ summary: s }),
      setSimpleSummary: (s) => set({ simpleSummary: s }),
      setIsSimpleMode: (v) => set({ isSimpleMode: v }),
      toggleSimpleMode: () => set((s) => ({ isSimpleMode: !s.isSimpleMode })),
      setSummaryLoading: (v) => set({ summaryLoading: v }),
      setConcepts: (c) => set({ concepts: c }),
      setConceptsLoading: (v) => set({ conceptsLoading: v }),
      setFlashcards: (f) => set({ flashcards: f }),
      setFlashcardsLoading: (v) => set({ flashcardsLoading: v }),
      addHighlight: (h) =>
        set((s) => ({
          highlights: [
            ...s.highlights,
            { ...h, id: genId(), createdAt: Date.now() },
          ],
        })),
      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),
      clearHighlights: () => set({ highlights: [], studySheet: '' }),
      setStudySheet: (s) => set({ studySheet: s }),
      setStudySheetLoading: (v) => set({ studySheetLoading: v }),
      setActivePanel: (p) => set({ activePanel: p }),
      toggleBookmark: (page) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(page)
            ? s.bookmarks.filter((b) => b !== page)
            : [...s.bookmarks, page],
        })),
      setSearchQuery: (q) => set({ searchQuery: q }),
      tickPageTimer: () =>
        set((s) => ({
          secondsOnPage: Math.floor((Date.now() - s.lastPageChangeTime) / 1000),
        })),
      dismissCoachForPage: (page) =>
        set((s) =>
          s.coachDismissedPages.includes(page)
            ? s
            : { coachDismissedPages: [...s.coachDismissedPages, page] }
        ),
      setPendingChatPrompt: (prompt) => set({ pendingChatPrompt: prompt }),
      openLostBridge: () =>
        set({ isLostBridgeVisible: true, lostBridge: '', lostBridgeLoading: true }),
      closeLostBridge: () =>
        set({ isLostBridgeVisible: false, lostBridgeLoading: false }),
      setLostBridge: (s) => set({ lostBridge: s }),
      setLostBridgeLoading: (v) => set({ lostBridgeLoading: v }),
    }),
    {
      name: 'readmind-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pdfHistory: state.pdfHistory }),
    }
  )
);
