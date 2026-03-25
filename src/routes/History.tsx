import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, ExternalLink, MoreVertical, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HistoryEntry {
  id: string;
  time: string;
  title: string;
  domain: string;
  favicon: 'linkedin' | 'youtube' | 'generic';
  selected: boolean;
}

const MOCK_HISTORY: { date: string; entries: HistoryEntry[] }[] = [
  {
    date: 'Today - Wednesday, March 4, 2026',
    entries: [
      { id: '1', time: '2:21 PM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: false },
      { id: '2', time: '2:21 PM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: true },
      { id: '3', time: '2:21 PM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: true },
      { id: '4', time: '2:21 PM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: true },
      { id: '5', time: '2:21 PM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: true },
      { id: '6', time: '2:21 PM', title: 'YouTube', domain: 'youtube.com', favicon: 'youtube', selected: false },
      { id: '7', time: '2:21 PM', title: 'YouTube', domain: 'youtube.com', favicon: 'youtube', selected: false },
      { id: '8', time: '2:21 PM', title: 'YouTube', domain: 'youtube.com', favicon: 'youtube', selected: false },
      { id: '9', time: '2:21 PM', title: 'YouTube', domain: 'youtube.com', favicon: 'youtube', selected: false },
    ],
  },
  {
    date: 'Yesterday - Tuesday, March 3, 2026',
    entries: [
      { id: '10', time: '1:15 PM', title: 'YouTube', domain: 'youtube.com', favicon: 'youtube', selected: false },
      { id: '11', time: '11:02 AM', title: '(19) Notifications', domain: 'LinkedIn | linkedin.com', favicon: 'linkedin', selected: false },
    ],
  },
];

const FaviconIcon = ({ type }: { type: HistoryEntry['favicon'] }) => {
  if (type === 'linkedin') return (
    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#0077B5' }}>
      <span className="text-white text-xs font-bold">in</span>
    </div>
  );
  if (type === 'youtube') return (
    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#FF0000' }}>
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
    </div>
  );
  return <div className="w-5 h-5 rounded bg-white/20" />;
};

export default function History() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [groups, setGroups] = useState(MOCK_HISTORY);

  const selectedCount = groups.flatMap((g) => g.entries).filter((e) => e.selected).length;

  const toggleEntry = (groupDate: string, entryId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.date === groupDate
          ? { ...g, entries: g.entries.map((e) => (e.id === entryId ? { ...e, selected: !e.selected } : e)) }
          : g
      )
    );
  };

  const toggleGroup = (groupDate: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.date !== groupDate) return g;
        const allSelected = g.entries.every((e) => e.selected);
        return { ...g, entries: g.entries.map((e) => ({ ...e, selected: !allSelected })) };
      })
    );
  };

  const deleteSelected = () => {
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, entries: g.entries.filter((e) => !e.selected) }))
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
        {/* Logo */}
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/images/icon-512c.png" alt="REGEN AI" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm" style={{ color: '#F5A623' }}>REGEN AI</span>
        </div>
        {/* Search */}
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

      {/* Title row */}
      <div className="flex items-center justify-between px-6 pb-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-white">Browsing History</h1>
          {selectedCount > 0 && (
            <span className="text-sm text-white/50">{selectedCount} selected</span>
          )}
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={deleteSelected}
              className="px-4 py-1.5 rounded-lg text-sm text-white/80 hover:text-white transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}
            >
              Delete
            </button>
            <button
              className="px-4 py-1.5 rounded-lg text-sm text-white font-medium transition-all"
              style={{ background: '#F5A623' }}
            >
              Open
            </button>
          </div>
        )}
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-6">
        {groups.map((group) => {
          const allSelected = group.entries.every((e) => e.selected);
          return (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center space-x-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleGroup(group.date)}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
                <span className="text-sm text-white/60 font-medium">{group.date}</span>
              </div>

              {/* Entries */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {group.entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center space-x-3 px-4 py-3 transition-all"
                    style={{
                      borderBottom: i < group.entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: entry.selected ? 'rgba(245,166,35,0.06)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      onChange={() => toggleEntry(group.date, entry.id)}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-white/40 w-12 flex-shrink-0">{entry.time}</span>
                    <FaviconIcon type={entry.favicon} />
                    <span className="text-sm text-white/80 flex-1 truncate">
                      {entry.title} <span className="text-white/40">| {entry.domain}</span>
                    </span>
                    <button className="text-white/30 hover:text-white/60 transition-colors">
                      <MoreVertical style={{ width: 14, height: 14 }} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
