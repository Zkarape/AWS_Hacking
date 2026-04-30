'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Zap, Brain, MessageSquare } from 'lucide-react';
import { useStudyStore } from '@/lib/store';

const features = [
  { icon: Brain, label: 'AI Page Summaries', desc: 'Instant summaries as you read' },
  { icon: MessageSquare, label: 'Ask Anything', desc: 'Select text, ask questions' },
  { icon: Zap, label: 'Key Concepts', desc: 'Extract terms automatically' },
  { icon: Sparkles, label: 'Flashcards', desc: 'Generate cards in one click' },
];

const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 10 + 8,
  delay: Math.random() * 5,
}));

export default function UploadPage() {
  const router = useRouter();
  const setPdfFile = useStudyStore((s) => s.setPdfFile);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      setPdfFile(file);
      setTimeout(() => router.push('/study'), 600);
    },
    [setPdfFile, router]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Animated background particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-500/20 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-900/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 px-6 max-w-4xl w-full">
        {/* Header */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <motion.div
            className="float"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <BookOpen size={56} className="text-indigo-400" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-5xl font-bold tracking-tight gradient-text">ReadMind</h1>
          <p className="text-lg text-slate-400 text-center max-w-md">
            Drop your PDF and let AI become your personal study companion
          </p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
          className="relative w-full"
        >
          <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <motion.div
            className="relative rounded-2xl border-2 border-dashed p-16 flex flex-col items-center gap-5 transition-all duration-300"
            animate={{
              borderColor: isDragging ? 'rgba(129, 140, 248, 0.8)' : uploading ? 'rgba(168, 85, 247, 0.8)' : 'rgba(99, 102, 241, 0.3)',
              background: isDragging ? 'rgba(99, 102, 241, 0.08)' : uploading ? 'rgba(168, 85, 247, 0.06)' : 'rgba(15, 15, 30, 0.6)',
            }}
          >
            {/* Animated corner dots */}
            {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos) => (
              <motion.div
                key={pos}
                className={`absolute ${pos} w-2 h-2 rounded-full`}
                animate={{ backgroundColor: isDragging ? '#818cf8' : '#4338ca', scale: isDragging ? 1.5 : 1 }}
              />
            ))}

            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    className="w-14 h-14 rounded-full border-3 border-indigo-400 border-t-transparent"
                    style={{ borderWidth: 3 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-indigo-300 font-medium">Opening your book...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center pulse-glow"
                    animate={isDragging ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <BookOpen size={40} className="text-indigo-400" strokeWidth={1.5} />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-slate-200">
                      {isDragging ? 'Drop it here!' : 'Drop your PDF here'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">or click to browse your files</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-4 gap-4 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center">
                <f.icon size={18} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">{f.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
