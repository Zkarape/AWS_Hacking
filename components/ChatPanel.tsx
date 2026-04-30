'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Trash2, Sparkles } from 'lucide-react';
import { useStudyStore, type Message } from '@/lib/store';

export default function ChatPanel() {
  const { selectedText, chatMessages, addChatMessage, clearChat, currentPage, pageText } = useStudyStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    addChatMessage(userMsg);
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          selection: selectedText,
          pageText: pageText[currentPage] ?? '',
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full);
      }

      addChatMessage({ role: 'assistant', content: full });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        addChatMessage({ role: 'assistant', content: 'Error: Could not connect to AI. Check your API key.' });
      }
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">Ask AI</span>
        </div>
        {chatMessages.length > 0 && (
          <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Selected text badge */}
      <AnimatePresence>
        {selectedText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mt-3"
          >
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-950/50 border border-indigo-800/40">
              <Sparkles size={12} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-300/80 line-clamp-3 italic">"{selectedText}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && !selectedText ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-10 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center">
              <MessageSquare size={22} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Ask anything about your reading</p>
              <p className="text-xs text-slate-600 mt-1">Select text in the PDF to ask about it</p>
            </div>
            <div className="space-y-2 w-full mt-2">
              {['Explain this concept simply', 'Give me an example', 'What are the key takeaways?'].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-indigo-700/40 hover:bg-indigo-950/30 text-xs text-slate-400 hover:text-indigo-300 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600/80 text-indigo-50'
                        : 'bg-white/[0.05] text-slate-300 border border-white/[0.06]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-white/[0.05] text-slate-300 border border-white/[0.06]">
                  {streamingText ? (
                    <span className="typing-cursor">{streamingText}</span>
                  ) : (
                    <div className="flex gap-1 items-center h-4">
                      {[0, 0.15, 0.3].map((delay) => (
                        <motion.div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, delay, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={selectedText ? 'Ask about the selection...' : 'Ask about this page...'}
            rows={2}
            className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
