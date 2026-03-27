import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Link, FolderOpen, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme, THEMES } from '../contexts/ThemeContext';

interface DownloadEntry {
  id: string;
  name: string;
  type: 'pdf' | 'generic';
}

const MOCK_DOWNLOADS: { date: string; entries: DownloadEntry[] }[] = [
  {
    date: 'Today',
    entries: [
      { id: '1', name: 'Computer Memory.pdf', type: 'pdf' },
      { id: '2', name: 'Computer Memory.pdf', type: 'pdf' },
    ],
  },
  {
    date: 'Yesterday',
    entries: [
      { id: '3', name: 'Computer Memory.pdf', type: 'pdf' },
      { id: '4', name: 'Computer Memory.pdf', type: 'pdf' },
    ],
  },
  {
    date: '02, March 2026',
    entries: [
      { id: '5', name: 'Computer Memory.pdf', type: 'pdf' },
      { id: '6', name: 'Computer Memory.pdf', type: 'pdf' },
    ],
  },
];

const PdfIcon = () => (
  <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#c0392b' }}>
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" /></svg>
  </div>
);

export default function Downloads() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [searchValue, setSearchValue] = useState('');
  const [downloads, setDownloads] = useState(MOCK_DOWNLOADS);

  const removeEntry = (groupDate: string, id: string) => {
    setDownloads((prev) =>
      prev
        .map((g) => (g.date === groupDate ? { ...g, entries: g.entries.filter((e) => e.id !== id) } : g))
        .filter((g) => g.entries.length > 0)
    );
  };

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/images/icon-512c.png" alt="REGEN AI" style={{ width: 30, height: 30, marginRight: -8 }} className="object-contain flex-shrink-0" />
          <span className="font-bold text-sm" style={{ color: T.accent }}>REGEN AI</span>
        </div>
        <div className="relative flex-1 max-w-sm mx-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.textDim }} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search downloads"
            className="w-full pl-8 pr-4 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pb-2 flex-shrink-0">
        <h1 className="text-xl font-semibold" style={{ color: T.text }}>Download History</h1>
        <p className="text-xs mt-0.5" style={{ color: T.textDim }}>
          Your{' '}
          <span className="underline cursor-pointer" style={{ color: '#F5A623' }}>
            schedule is managed
          </span>{' '}
          by your organization
        </p>
      </div>

      {/* Download list */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 pb-6">
        {downloads.map((group) => (
          <div key={group.date}>
            <p className="text-xs mb-2 px-1" style={{ color: T.textDim }}>{group.date}</p>
            <div
              className="rounded-xl overflow-hidden space-y-0"
              style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
            >
              {group.entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center space-x-3 px-4 py-3 transition-all"
                  style={{ borderBottom: i < group.entries.length - 1 ? `1px solid ${T.borderSubtle}` : 'none' }}
                >
                  <PdfIcon />
                  <span className="flex-1 text-sm truncate" style={{ color: T.textMuted }}>{entry.name}</span>
                  <div className="flex items-center space-x-3">
                    <button style={{ color: T.textDim }} className="transition-colors">
                      <Link style={{ width: 14, height: 14 }} />
                    </button>
                    <button style={{ color: T.textDim }} className="transition-colors">
                      <FolderOpen style={{ width: 14, height: 14 }} />
                    </button>
                    <button onClick={() => removeEntry(group.date, entry.id)} style={{ color: T.textDim }} className="hover:text-red-400 transition-colors">
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
