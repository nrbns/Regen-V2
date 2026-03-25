import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'account',         label: 'You & Account'       },
  { id: 'privacy',         label: 'Privacy & Security'  },
  { id: 'performance',     label: 'Performance'          },
  { id: 'ai',              label: 'AI Innovation'        },
  { id: 'search',          label: 'Search Engine'        },
  { id: 'default-browser', label: 'Default Browser'      },
  { id: 'startup',         label: 'On Startup'           },
  { id: 'language',        label: 'Language'             },
  { id: 'accessibility',   label: 'Accessibility'        },
  { id: 'system',          label: 'System'               },
  { id: 'reset',           label: 'Reset Settings'       },
];

const ACCOUNT_ROWS = [
  { label: 'Sync and Regen services' },
  { label: 'Manage your Regen Account' },
  { label: 'Customize your Chrome profile' },
  { label: 'Import bookmarks and settings' },
];

const CONTENT: Record<string, React.ReactNode> = {
  account: (
    <div className="space-y-4">
      {/* User card */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white">
            A
          </div>
          <div>
            <div className="text-sm font-medium text-white">Albert Jhon</div>
            <div className="text-xs text-white/40 flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Syncing to albertjhon@regen.com</span>
            </div>
          </div>
        </div>
        <button
          className="px-4 py-1.5 rounded-full text-sm text-white font-medium transition-all"
          style={{ border: '1px solid rgba(245,166,35,0.6)', color: '#F5A623' }}
        >
          Turn OFF
        </button>
      </div>

      {/* Account rows */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {ACCOUNT_ROWS.map((row, i) => (
          <button
            key={row.label}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-white/75 hover:text-white transition-all text-left"
            style={{
              borderBottom: i < ACCOUNT_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span>{row.label}</span>
            <ChevronRight style={{ width: 14, height: 14 }} className="text-white/30" />
          </button>
        ))}
      </div>
    </div>
  ),
  privacy: (
    <div className="text-white/50 text-sm py-8 text-center">Privacy & Security settings coming soon</div>
  ),
  performance: (
    <div className="text-white/50 text-sm py-8 text-center">Performance settings coming soon</div>
  ),
  ai: (
    <div className="text-white/50 text-sm py-8 text-center">AI Innovation settings coming soon</div>
  ),
  search: (
    <div className="text-white/50 text-sm py-8 text-center">Search Engine settings coming soon</div>
  ),
  'default-browser': (
    <div className="text-white/50 text-sm py-8 text-center">Default Browser settings coming soon</div>
  ),
  startup: (
    <div className="text-white/50 text-sm py-8 text-center">On Startup settings coming soon</div>
  ),
  language: (
    <div className="text-white/50 text-sm py-8 text-center">Language settings coming soon</div>
  ),
  accessibility: (
    <div className="text-white/50 text-sm py-8 text-center">Accessibility settings coming soon</div>
  ),
  system: (
    <div className="text-white/50 text-sm py-8 text-center">System settings coming soon</div>
  ),
  reset: (
    <div className="flex flex-col items-center py-8 space-y-4">
      <p className="text-white/50 text-sm text-center">This will reset all settings to their default values.</p>
      <button
        className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
        style={{ background: 'rgba(220,50,50,0.2)', border: '1px solid rgba(220,50,50,0.4)' }}
      >
        Reset All Settings
      </button>
    </div>
  ),
};

export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');
  const [searchValue, setSearchValue] = useState('');

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

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <nav
          className="w-52 flex-shrink-0 overflow-y-auto py-2"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full px-4 py-2.5 text-left transition-all"
                style={{
                  background: isActive ? 'rgba(245,166,35,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #F5A623' : '3px solid transparent',
                  color: isActive ? '#F5A623' : 'rgba(255,255,255,0.55)',
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Content panel */}
        <motion.div
          key={activeSection}
          className="flex-1 overflow-y-auto p-6"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {CONTENT[activeSection]}
        </motion.div>
      </div>
    </div>
  );
}
