'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Sparkles } from 'lucide-react';
import { useStudyStore, type HighlightColor } from '@/lib/store';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; bg: string; ring: string }[] = [
  { id: 'yellow', label: 'Yellow', bg: '#fde047', ring: 'ring-yellow-300/60' },
  { id: 'green', label: 'Green', bg: '#86efac', ring: 'ring-green-300/60' },
  { id: 'pink', label: 'Pink', bg: '#f9a8d4', ring: 'ring-pink-300/60' },
  { id: 'blue', label: 'Blue', bg: '#93c5fd', ring: 'ring-blue-300/60' },
  { id: 'purple', label: 'Purple', bg: '#d8b4fe', ring: 'ring-purple-300/60' },
];

const COLOR_BG: Record<HighlightColor, string> = {
  yellow: 'rgba(253, 224, 71, 0.45)',
  green: 'rgba(134, 239, 172, 0.45)',
  pink: 'rgba(249, 168, 212, 0.45)',
  blue: 'rgba(147, 197, 253, 0.45)',
  purple: 'rgba(216, 180, 254, 0.45)',
};

type SelectionTooltip = { x: number; y: number; text: string };

export default function PDFViewer() {
  const {
    pdfUrl,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
    setPageText,
    setSelectedText,
    setActivePanel,
    highlights,
    addHighlight,
    removeHighlight,
  } = useStudyStore();

  const [scale, setScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const [selectionTooltip, setSelectionTooltip] = useState<SelectionTooltip | null>(null);
  const [hoveredHighlight, setHoveredHighlight] = useState<string | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(Math.min(w - 48, 900));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
    },
    [setTotalPages]
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
      if (text.length > 3) {
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect && rect.width > 0) {
          setSelectionTooltip({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
        }
      } else {
        setSelectionTooltip(null);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const getPageElement = (): HTMLElement | null =>
    pageWrapperRef.current?.querySelector('.react-pdf__Page') ?? null;

  const handleAskAbout = () => {
    if (!selectionTooltip) return;
    setSelectedText(selectionTooltip.text);
    setActivePanel('chat');
    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlight = (color: HighlightColor) => {
    if (!selectionTooltip) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setSelectionTooltip(null);
      return;
    }
    const pageEl = getPageElement();
    if (!pageEl) {
      setSelectionTooltip(null);
      return;
    }
    const pageRect = pageEl.getBoundingClientRect();

    // Aggregate rects across all ranges (multi-line / multi-paragraph selections)
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < sel.rangeCount; i++) {
      const range = sel.getRangeAt(i);
      const clientRects = Array.from(range.getClientRects());
      for (const r of clientRects) {
        if (r.width <= 0 || r.height <= 0) continue;
        rects.push({
          x: r.left - pageRect.left,
          y: r.top - pageRect.top,
          width: r.width,
          height: r.height,
        });
      }
    }

    if (rects.length === 0) {
      setSelectionTooltip(null);
      return;
    }

    addHighlight({
      page: currentPage,
      text: selectionTooltip.text,
      color,
      rects,
      captureWidth: pageRect.width,
    });

    setSelectionTooltip(null);
    sel.removeAllRanges();
  };

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
  };

  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.page === currentPage),
    [highlights, currentPage]
  );

  const renderedWidth = containerWidth * scale;

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

        <div className="flex items-center gap-2">
          {pageHighlights.length > 0 && (
            <button
              onClick={() => setActivePanel('studysheet')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-amber-300 bg-amber-950/40 border border-amber-700/40 hover:border-amber-500/60 transition-colors"
              title="View highlights & generate study sheet"
            >
              <Sparkles size={12} />
              <span>{pageHighlights.length} on page</span>
            </button>
          )}
        </div>
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
              <div ref={pageWrapperRef} className="relative">
                <Page
                  pageNumber={currentPage}
                  width={renderedWidth}
                  onLoadSuccess={onPageLoadSuccess}
                  className="shadow-2xl shadow-black/60 rounded-lg overflow-hidden"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="w-full h-[900px] shimmer rounded-xl" />}
                />

                {/* Highlight overlays */}
                <div className="absolute inset-0 pointer-events-none">
                  {pageHighlights.map((h) => {
                    const overlayScale = h.captureWidth > 0 ? renderedWidth / h.captureWidth : 1;
                    const isHovered = hoveredHighlight === h.id;
                    return (
                      <div key={h.id} className="contents">
                        {h.rects.map((r, i) => (
                          <div
                            key={`${h.id}-${i}`}
                            className="absolute pointer-events-auto cursor-pointer transition-opacity"
                            style={{
                              left: r.x * overlayScale,
                              top: r.y * overlayScale,
                              width: r.width * overlayScale,
                              height: r.height * overlayScale,
                              background: COLOR_BG[h.color],
                              mixBlendMode: 'multiply',
                              opacity: isHovered ? 0.85 : 1,
                              borderRadius: 2,
                            }}
                            onMouseEnter={() => setHoveredHighlight(h.id)}
                            onMouseLeave={() => setHoveredHighlight(null)}
                            onClick={(e) => {
                              if (e.shiftKey) {
                                removeHighlight(h.id);
                              } else {
                                setSelectedText(h.text);
                                setActivePanel('chat');
                              }
                            }}
                            title={`${h.text.slice(0, 80)}${h.text.length > 80 ? '…' : ''}\n\nClick: ask AI · Shift+click: remove`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Document>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selection tooltip with color picker */}
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
            <div className="-translate-x-1/2 -translate-y-full flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#1a1a2e] border border-white/10 shadow-xl shadow-black/50">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHighlight(c.id);
                  }}
                  className={`w-5 h-5 rounded-full ring-1 ring-white/20 hover:ring-2 hover:${c.ring} hover:scale-110 transition-all`}
                  style={{ background: c.bg }}
                  title={`Highlight ${c.label}`}
                  aria-label={`Highlight ${c.label}`}
                />
              ))}
              <div className="w-px h-4 bg-white/10 mx-0.5" />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAskAbout();
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                title="Ask AI about this"
              >
                <Sparkles size={11} />
                <span>Ask</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
