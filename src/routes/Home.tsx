import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Mic, Send } from 'lucide-react';
import { useTheme, THEMES } from '../contexts/ThemeContext';

const QUICK_COMMANDS = ['/ask', '/summarize', '/extract', '/explain'];

export default function Home() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col">
      {/* Character — fills the upper portion, centered */}
      <div className="flex-1 flex items-end justify-center overflow-hidden">
        <motion.img
          src="/images/character-half-sm.png"
          alt="REGEN AI Assistant"
          className="object-contain object-bottom select-none pointer-events-none"
          style={{ height: '90%', maxHeight: 460, width: 'auto' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          draggable={false}
        />
      </div>

      {/* Chat Input Bar — pinned to bottom */}
      <motion.div
        className="px-4 pb-3 pt-1 flex-shrink-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Frosted glass input */}
        <div
          className="flex items-center space-x-2 rounded-2xl px-4 py-2.5 mb-2"
          style={{
            background: resolvedTheme === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(10,25,50,0.75)',
            border: `1px solid ${T.inputBorder}`,
            backdropFilter: 'blur(16px)',
          }}
        >
          <Paperclip style={{ width: 15, height: 15, color: T.textDim }} className="flex-shrink-0 cursor-pointer transition-colors" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type message, enter link or /command..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 14, color: T.textMuted }}
          />
          <button style={{ color: T.textDim }} className="transition-colors">
            <Mic style={{ width: 15, height: 15 }} />
          </button>
          <motion.button
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 28, height: 28, background: '#F5A623' }}
          >
            <Send style={{ width: 13, height: 13 }} className="text-white" />
          </motion.button>
        </div>

        {/* Quick command chips */}
        <div className="flex items-center space-x-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd + ' ')}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.textMuted }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
