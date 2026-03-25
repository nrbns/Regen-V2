import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, Send, ChevronRight } from 'lucide-react';

const FILTERS = ['All source', 'Papers', 'Web', 'Books', 'Datasets'];

const TOOLS = [
  {
    id: 'web-research',
    icon: '🌐',
    iconBg: '#1a3a5c',
    label: 'Web Research',
    desc: 'Multi-source AI search across the web',
    items: 24,
  },
  {
    id: 'paper-analysis',
    icon: '📄',
    iconBg: '#1a3a2a',
    label: 'Paper Analysis',
    desc: 'PDF/ArXiv/IEEE paper analysis',
    items: 24,
  },
  {
    id: 'deep-think',
    icon: '🧠',
    iconBg: '#3a1a3a',
    label: 'Deep Think',
    desc: 'Chain-of-thought reasoning mode',
    items: 24,
  },
  {
    id: 'experiment',
    icon: '🧪',
    iconBg: '#1a2a3a',
    label: 'Experiment',
    desc: 'Run simulations & hypothesis testing',
    items: 24,
  },
  {
    id: 'citation-builder',
    icon: '🔗',
    iconBg: '#2a2a1a',
    label: 'Citation Builder',
    desc: 'Auto references & bibliography',
    items: 24,
  },
  {
    id: 'knowledge-vault',
    icon: '📦',
    iconBg: '#2a1a1a',
    label: 'Knowledge Vault',
    desc: 'Saved research & insights',
    items: 24,
  },
];

export default function Research() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All source');

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* 3D Character on left with speech bubble */}
      <div className="flex-shrink-0 flex flex-col items-start justify-end pb-6 pl-2 pointer-events-none select-none relative">
        {/* Speech bubble */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-2 ml-4 px-3 py-2 rounded-xl text-xs text-white/80 max-w-[130px]"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          Ask me to go deeper; I'll cross-check everything
        </motion.div>
        <motion.img
          src="/images/character-half.png"
          alt="REGEN AI"
          className="h-[48vh] max-h-[340px] object-contain drop-shadow-2xl"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          draggable={false}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Search bar */}
          <div
            className="flex items-center space-x-3 rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter topic, paper URL, question, or dataset..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/30 outline-none"
            />
            <button className="text-white/40 hover:text-white/70 transition-colors">
              <Upload style={{ width: 15, height: 15 }} />
            </button>
            <button className="text-white/40 hover:text-white/70 transition-colors">
              <Mic style={{ width: 15, height: 15 }} />
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 28, height: 28, background: query.trim() ? '#F5A623' : 'rgba(245,166,35,0.3)' }}
            >
              <Send style={{ width: 13, height: 13 }} className="text-white" />
            </motion.button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  activeFilter === f
                    ? { background: 'rgba(245,166,35,0.2)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="flex items-center space-x-2 pt-1">
            <span style={{ color: '#F5A623' }}>✦</span>
            <span className="text-sm font-medium text-white/80">Research Tools</span>
          </div>

          {/* Tools grid */}
          <div className="grid grid-cols-3 gap-3">
            {TOOLS.map((tool, i) => (
              <motion.button
                key={tool.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col p-4 rounded-2xl text-left transition-all group"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {/* Icon */}
                <div
                  className="rounded-xl flex items-center justify-center mb-2.5"
                  style={{ width: 30, height: 30, background: tool.iconBg, fontSize: 15 }}
                >
                  {tool.icon}
                </div>
                <div className="font-medium text-white/90 mb-1" style={{ fontSize: 12 }}>{tool.label}</div>
                <div className="text-white/45 leading-relaxed flex-1" style={{ fontSize: 11 }}>{tool.desc}</div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-white/30" style={{ fontSize: 10 }}>{tool.items} items</span>
                  <ChevronRight style={{ width: 13, height: 13 }} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Floating action button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-10 right-6 w-11 h-11 rounded-full flex items-center justify-center shadow-lg z-40 text-white"
        style={{ background: 'linear-gradient(135deg, #F5A623, #e8922a)' }}
      >
        ✎
      </motion.button>
    </div>
  );
}
