'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, Search, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import clsx from 'clsx';

type Tab = 'toc' | 'search' | 'bookmarks';

export default function LeftSidebar() {
  const { currentPage, totalPages, setCurrentPage, bookmarks, toggleBookmark, searchQuery, setSearchQuery } =
    useStudyStore();
  const [activeTab, setActiveTab] = useState<Tab>('toc');

  const isBookmarked = bookmarks.includes(currentPage);
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = searchQuery
    ? pages.filter((p) => String(p).includes(searchQuery))
    : pages;

  const tabs: { id: Tab; icon: typeof List; label: string }[] = [
    { id: 'toc', icon: List, label: 'Contents' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0c0c18] border-r border-white/[0.06]">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all duration-200',
              activeTab === tab.id
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Reading progress */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">Reading progress</span>
          <span className="text-xs text-indigo-400 font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-600">
          <span>Page {currentPage}</span>
          <span>{totalPages} pages</span>
        </div>
      </div>

      {/* Bookmark current page button */}
      <div className="px-4 py-2 border-b border-white/[0.04]">
        <button
          onClick={() => toggleBookmark(currentPage)}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            isBookmarked
              ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/40'
              : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:border-indigo-700/40 hover:text-indigo-300'
          )}
        >
          {isBookmarked ? <BookmarkCheck size={13} className="text-indigo-400" /> : <Bookmark size={13} />}
          {isBookmarked ? 'Bookmarked' : 'Bookmark page'}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'toc' && (
            <motion.div key="toc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-0.5">
              <p className="text-xs text-slate-600 px-2 py-2 uppercase tracking-wider">Pages</p>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <motion.button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150',
                    currentPage === page
                      ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                      : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                  )}
                  whileHover={{ x: 2 }}
                >
                  {bookmarks.includes(page) && (
                    <BookmarkCheck size={10} className="text-indigo-500 shrink-0" />
                  )}
                  {currentPage === page && !bookmarks.includes(page) && (
                    <ChevronRight size={10} className="text-indigo-500 shrink-0" />
                  )}
                  {!bookmarks.includes(page) && currentPage !== page && (
                    <span className="w-2.5 shrink-0" />
                  )}
                  <span>Page {page}</span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3">
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40"
                />
              </div>
              <div className="space-y-0.5">
                {filteredPages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                      currentPage === page ? 'bg-indigo-950/60 text-indigo-300' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                    )}
                  >
                    Page {page}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'bookmarks' && (
            <motion.div key="bookmarks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3">
              {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Bookmark size={28} className="text-slate-700" />
                  <div>
                    <p className="text-sm text-slate-500">No bookmarks yet</p>
                    <p className="text-xs text-slate-600 mt-1">Bookmark pages to save your progress</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {bookmarks.sort((a, b) => a - b).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
                        currentPage === page ? 'bg-indigo-950/60 text-indigo-300' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                      )}
                    >
                      <BookmarkCheck size={11} className="text-indigo-500" />
                      Page {page}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
