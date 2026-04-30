'use client';

import { create } from 'zustand';

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

interface StudyStore {
  pdfFile: File | null;
  pdfUrl: string | null;
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

  setPdfFile: (file: File) => void;
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
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  pdfFile: null,
  pdfUrl: null,
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
    const url = URL.createObjectURL(file);
    set({ pdfFile: file, pdfUrl: url, currentPage: 1, chatMessages: [], summary: '', concepts: [], flashcards: [] });
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
}));
