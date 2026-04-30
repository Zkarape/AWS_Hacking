'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useStudyStore } from '@/lib/store';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';

// PDF viewer must be client-only (no SSR) due to pdfjs worker
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

export default function StudyPage() {
  const router = useRouter();
  const { pdfFile, pdfUrl, currentPage, totalPages, bookmarks, toggleBookmark } = useStudyStore();

  useEffect(() => {
    if (!pdfUrl && !pdfFile) {
      router.replace('/');
    }
  }, [pdfUrl, pdfFile, router]);

  if (!pdfUrl) return null;

  const isBookmarked = bookmarks.includes(currentPage);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a14]/90 border-b border-white/[0.06] backdrop-blur-sm z-20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          >
            <ArrowLeft size={13} />
            <span>Back</span>
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold gradient-text">ReadMind</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfFile && (
            <span className="text-xs text-slate-500 max-w-48 truncate hidden sm:block">
              {pdfFile.name}
            </span>
          )}
          {totalPages > 0 && (
            <span className="text-xs text-slate-600">
              {currentPage} / {totalPages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleBookmark(currentPage)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isBookmarked
                ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/40'
                : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
            }`}
          >
            {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            <span className="hidden sm:block">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
        </div>
      </motion.header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-[220px] shrink-0 overflow-hidden"
        >
          <LeftSidebar />
        </motion.aside>

        {/* PDF center */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex-1 overflow-hidden"
        >
          <PDFViewer />
        </motion.main>

        {/* Right sidebar */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-[340px] shrink-0 overflow-hidden"
        >
          <RightSidebar />
        </motion.aside>
      </div>
    </div>
  );
}
