import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Link, FolderOpen, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1f35 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/images/icon-512c.png" alt="REGEN AI" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm" style={{ color: '#F5A623' }}>REGEN AI</span>
        </div>
        <div className="relative flex-1 max-w-sm mx-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search settings"
            className="w-full pl-8 pr-4 py-1.5 rounded-lg text-sm text-white/70 placeholder-white/30 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pb-2 flex-shrink-0">
        <h1 className="text-xl font-semibold text-white">Download History</h1>
        <p className="text-xs text-white/40 mt-0.5">
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
            <p className="text-xs text-white/40 mb-2 px-1">{group.date}</p>
            <div
              className="rounded-xl overflow-hidden space-y-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {group.entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center space-x-3 px-4 py-3 transition-all hover:bg-white/[0.03]"
                  style={{
                    borderBottom: i < group.entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <PdfIcon />
                  <span className="flex-1 text-sm text-white/80 truncate">{entry.name}</span>
                  <div className="flex items-center space-x-3">
                    <button className="text-white/30 hover:text-white/70 transition-colors">
                      <Link style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="text-white/30 hover:text-white/70 transition-colors">
                      <FolderOpen style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => removeEntry(group.date, entry.id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
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
