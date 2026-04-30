'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PDFViewer() {
  const {
    pdfUrl,
    currentPage,
    totalPages,
    currentPdfId,
    setCurrentPage,
    setTotalPages,
    setHistoryPageCount,
    setPageText,
    setSelectedText,
    setActivePanel,
  } = useStudyStore();

  const [scale, setScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionTooltip, setSelectionTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(Math.min(w - 48, 900));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Tick page timer every second while viewer is mounted; resets on page change via store.
  useEffect(() => {
    const id = window.setInterval(() => tickPageTimer(), 1000);
    return () => window.clearInterval(id);
  }, [tickPageTimer]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      if (currentPdfId) setHistoryPageCount(currentPdfId, numPages);
    },
    [setTotalPages, setHistoryPageCount, currentPdfId]
  );

  const onPageLoadSuccess = useCallback(
    async (page: PDFPageProxy) => {
      const content = await page.getTextContent();
      const text = content.items
        .filter((i): i is { str: string; dir: string; width: number; height: number; transform: number[]; fontName: string; hasEOL: boolean } => 'str' in i)
        .map((i) => i.str)
        .join(' ');
      setPageText(currentPage, text);
    },
    [setPageText, currentPage]
  );

  // Text selection detection
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (text.length > 10) {
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setSelectionTooltip({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
        }
      } else {
        setSelectionTooltip(null);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleAskAbout = () => {
    if (!selectionTooltip) return;
    setSelectedText(selectionTooltip.text);
    setActivePanel('chat');
    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
  };

  if (!pdfUrl) return null;

  return (
    <div ref={containerRef} className="relative flex flex-col h-full bg-[#0d0d1a]">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14]/80 border-b border-white/5 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setScale(1.2)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-12 text-center text-sm bg-white/5 border border-white/10 rounded-lg py-0.5 text-slate-300 focus:outline-none focus:border-indigo-500/50"
              min={1}
              max={totalPages}
            />
            <span className="text-xs text-slate-500">/ {totalPages}</span>
          </div>
          <button
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-slate-400 hover:text-slate-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="w-24" />
      </div>

      {/* PDF scroll area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center py-6 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="w-[700px] h-[900px] shimmer rounded-xl" />}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={currentPage}
                width={containerWidth * scale}
                onLoadSuccess={onPageLoadSuccess}
                className="shadow-2xl shadow-black/60 rounded-lg overflow-hidden"
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={<div className="w-full h-[900px] shimmer rounded-xl" />}
              />
            </Document>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selection tooltip */}
      <AnimatePresence>
        {selectionTooltip && (
          <motion.div
            className="selection-tooltip"
            style={{ left: selectionTooltip.x, top: selectionTooltip.y }}
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAskAbout(); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-900/50 transition-colors -translate-x-1/2 -translate-y-full"
            >
              <span>✨ Ask AI about this</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
