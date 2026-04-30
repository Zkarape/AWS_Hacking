'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw, Sparkles, X } from 'lucide-react';
import { useStudyStore, type Concept } from '@/lib/store';

const VIEW_W = 320;
const VIEW_H = 280;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const HUB_R = 28;
const NODE_R = 22;
const RING_RADIUS = 92;

interface NodeLayout {
  x: number;
  y: number;
}

function deterministicJitter(i: number, seed: number) {
  const s1 = Math.sin((i + 1) * 12.9898 + seed * 0.5) * 43758.5453;
  const s2 = Math.sin((i + 1) * 78.233 + seed * 0.7) * 12345.678;
  return {
    dx: (s1 - Math.floor(s1) - 0.5) * 10,
    dy: (s2 - Math.floor(s2) - 0.5) * 10,
  };
}

function computePositions(count: number): NodeLayout[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: CENTER_X, y: CENTER_Y - RING_RADIUS }];
  const startAngle = -Math.PI / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (i / count) * Math.PI * 2;
    const { dx, dy } = deterministicJitter(i, count);
    return {
      x: CENTER_X + Math.cos(angle) * RING_RADIUS + dx,
      y: CENTER_Y + Math.sin(angle) * RING_RADIUS + dy,
    };
  });
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function ConceptsPanel() {
  const { currentPage, pageText, concepts, setConcepts, conceptsLoading, setConceptsLoading } = useStudyStore();
  const lastPage = useRef<number>(-1);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const positions = useMemo(() => computePositions(concepts.length), [concepts.length]);

  const fetchConcepts = async (page: number) => {
    const text = pageText[page];
    if (!text) return;

    setConceptsLoading(true);
    setConcepts([]);
    setSelected(null);

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

  useEffect(() => {
    setSelected(null);
  }, [concepts]);

  const selectedConcept = selected !== null ? concepts[selected] ?? null : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-400" />
          <span className="text-sm font-medium text-slate-300">Key Concepts</span>
          {concepts.length > 0 && (
            <span className="text-[10px] text-slate-600">{concepts.length} nodes</span>
          )}
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

      <div className="flex-1 overflow-y-auto p-3">
        {!pageText[currentPage] ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12 text-center">
            <Lightbulb size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">Navigate to a page to extract concepts</p>
          </motion.div>
        ) : conceptsLoading ? (
          <ConceptsLoading />
        ) : concepts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-sm text-slate-500">No concepts found for this page</p>
          </motion.div>
        ) : (
          <ConceptGraph
            concepts={concepts}
            positions={positions}
            selected={selected}
            hovered={hovered}
            onSelect={(i) => setSelected((prev) => (prev === i ? null : i))}
            onHover={setHovered}
            onClear={() => setSelected(null)}
            selectedConcept={selectedConcept}
          />
        )}
      </div>
    </div>
  );
}

function ConceptsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-full border border-yellow-500/30 bg-yellow-500/5 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles size={20} className="text-yellow-400" />
        </motion.div>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-yellow-400/80"
            style={{ marginTop: -4, marginLeft: -4 }}
            animate={{
              x: [
                Math.cos((i / 4) * Math.PI * 2) * 32,
                Math.cos((i / 4 + 1) * Math.PI * 2) * 32,
              ],
              y: [
                Math.sin((i / 4) * Math.PI * 2) * 32,
                Math.sin((i / 4 + 1) * Math.PI * 2) * 32,
              ],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
          />
        ))}
      </div>
      <p className="text-sm text-slate-500">Mapping concept network…</p>
    </div>
  );
}

interface ConceptGraphProps {
  concepts: Concept[];
  positions: NodeLayout[];
  selected: number | null;
  hovered: number | null;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
  onClear: () => void;
  selectedConcept: Concept | null;
}

function ConceptGraph({ concepts, positions, selected, hovered, onSelect, onHover, onClear, selectedConcept }: ConceptGraphProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-950/40 via-slate-950/60 to-slate-900/70 overflow-hidden"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          onClick={onClear}
        >
          <defs>
            <radialGradient id="concept-hub-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
              <stop offset="55%" stopColor="#6366f1" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#312e81" stopOpacity="0.55" />
            </radialGradient>
            <radialGradient id="concept-node-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="1" />
              <stop offset="100%" stopColor="#0b1020" stopOpacity="1" />
            </radialGradient>
            <filter id="concept-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="concept-strong-glow" x="-75%" y="-75%" width="250%" height="250%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Halo behind hub */}
          <motion.circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={HUB_R + 10}
            fill="none"
            stroke="#6366f1"
            strokeOpacity={0.25}
            strokeWidth={1.2}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.9, 1.18, 0.9], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${CENTER_X}px ${CENTER_Y}px` }}
          />

          {/* Hub-to-node edges */}
          {positions.map((p, i) => {
            const isActive = selected === i || hovered === i;
            return (
              <motion.line
                key={`spoke-${i}`}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={p.x}
                y2={p.y}
                stroke={isActive ? '#a78bfa' : '#4338ca'}
                strokeOpacity={isActive ? 0.9 : 0.4}
                strokeWidth={isActive ? 1.6 : 1}
                strokeDasharray={isActive ? undefined : '3 4'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.45 }}
              />
            );
          })}

          {/* Outer ring edges between neighbors */}
          {positions.length > 2 &&
            positions.map((p, i) => {
              const next = positions[(i + 1) % positions.length];
              return (
                <motion.line
                  key={`ring-${i}`}
                  x1={p.x}
                  y1={p.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#6366f1"
                  strokeOpacity={0.18}
                  strokeWidth={0.8}
                  strokeDasharray="2 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5 + 0.04 * i, duration: 0.5 }}
                />
              );
            })}

          {/* Hub */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            style={{ transformOrigin: `${CENTER_X}px ${CENTER_Y}px` }}
          >
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={HUB_R}
              fill="url(#concept-hub-gradient)"
              filter="url(#concept-glow)"
            />
            <text
              x={CENTER_X}
              y={CENTER_Y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="20"
              className="pointer-events-none select-none"
            >
              ✨
            </text>
          </motion.g>

          {/* Concept nodes */}
          {concepts.map((concept, i) => {
            const p = positions[i];
            if (!p) return null;
            const isSelected = selected === i;
            const isHovered = hovered === i;
            const labelBelow = p.y <= CENTER_Y + 4;
            const labelY = labelBelow ? p.y + NODE_R + 11 : p.y - NODE_R - 7;
            return (
              <motion.g
                key={`node-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08 * i + 0.12, type: 'spring', stiffness: 200, damping: 16 }}
                style={{ cursor: 'pointer', transformOrigin: `${p.x}px ${p.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(i);
                }}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
              >
                {(isSelected || isHovered) && (
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={NODE_R + 6}
                    fill="none"
                    stroke={isSelected ? '#facc15' : '#a78bfa'}
                    strokeOpacity={0.5}
                    strokeWidth={1.2}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  />
                )}
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={NODE_R}
                  fill="url(#concept-node-gradient)"
                  stroke={isSelected ? '#facc15' : isHovered ? '#a78bfa' : '#3730a3'}
                  strokeOpacity={isSelected ? 1 : isHovered ? 0.85 : 0.55}
                  strokeWidth={isSelected ? 2 : 1.3}
                  filter={isSelected ? 'url(#concept-strong-glow)' : undefined}
                  whileHover={{ scale: 1.08 }}
                  style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                />
                <text
                  x={p.x}
                  y={p.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="18"
                  className="pointer-events-none select-none"
                >
                  {concept.emoji}
                </text>
                <text
                  x={p.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={isSelected ? '#fde68a' : isHovered ? '#e2e8f0' : '#94a3b8'}
                  className="pointer-events-none select-none"
                >
                  {truncate(concept.term, 16)}
                </text>
              </motion.g>
            );
          })}
        </svg>

        <p className="absolute bottom-2 left-3 right-3 text-[10px] text-slate-600 text-center pointer-events-none">
          tap a node to reveal its definition
        </p>
      </div>

      {/* Definition card */}
      <AnimatePresence mode="wait">
        {selectedConcept ? (
          <motion.div
            key={`def-${selected}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/40 to-slate-900/70 p-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0 leading-none mt-0.5">{selectedConcept.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-200 mb-1 break-words">
                  {selectedConcept.term}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedConcept.definition}
                </p>
              </div>
              <button
                onClick={onClear}
                className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 -mr-1 -mt-1 p-1 rounded-md hover:bg-white/5"
                aria-label="Close definition"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
          >
            <p className="text-xs text-slate-500 text-center">
              Each node is a key concept. Tap one to see its definition.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
