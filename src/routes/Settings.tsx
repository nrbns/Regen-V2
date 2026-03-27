import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme, THEMES } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { id: 'account',         label: 'You & Account'       },
  { id: 'appearance',      label: 'Appearance'           },
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
  appearance: <AppearanceSection />,
  account: <AccountSection />,
  privacy:          <PlaceholderSection label="Privacy & Security" />,
  performance:      <PlaceholderSection label="Performance" />,
  ai:               <PlaceholderSection label="AI Innovation" />,
  search:           <PlaceholderSection label="Search Engine" />,
  'default-browser':<PlaceholderSection label="Default Browser" />,
  startup:          <PlaceholderSection label="On Startup" />,
  language:         <PlaceholderSection label="Language" />,
  accessibility:    <PlaceholderSection label="Accessibility" />,
  system:           <PlaceholderSection label="System" />,
  reset:            <ResetSection />,
};

type ThemeOption = 'dark' | 'light' | 'system';

const THEME_OPTIONS: { id: ThemeOption; label: string; icon: string; desc: string }[] = [
  { id: 'dark',   label: 'Dark',   icon: '🌙', desc: 'Dark background, easy on eyes at night'  },
  { id: 'light',  label: 'Light',  icon: '☀️', desc: 'Bright background, great for daytime'    },
  { id: 'system', label: 'System', icon: '💻', desc: 'Follows your OS theme preference'        },
];

function PlaceholderSection({ label }: { label: string }) {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  return <div className="text-sm py-8 text-center" style={{ color: T.textDim }}>{label} settings coming soon</div>;
}

function ResetSection() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  return (
    <div className="flex flex-col items-center py-8 space-y-4">
      <p className="text-sm text-center" style={{ color: T.textMuted }}>This will reset all settings to their default values.</p>
      <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
        style={{ background: 'rgba(220,50,50,0.2)', border: '1px solid rgba(220,50,50,0.4)', color: '#ff6b6b' }}>
        Reset All Settings
      </button>
    </div>
  );
}

function AccountSection() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white">A</div>
          <div>
            <div className="text-sm font-medium" style={{ color: T.text }}>Albert Jhon</div>
            <div className="text-xs flex items-center space-x-1" style={{ color: T.textDim }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Syncing to albertjhon@regen.com</span>
            </div>
          </div>
        </div>
        <button className="px-4 py-1.5 rounded-full text-sm font-medium transition-all" style={{ border: `1px solid rgba(245,166,35,0.6)`, color: T.accent }}>
          Turn OFF
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
        {ACCOUNT_ROWS.map((row, i) => (
          <button
            key={row.label}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all text-left"
            style={{ borderBottom: i < ACCOUNT_ROWS.length - 1 ? `1px solid ${T.borderSubtle}` : 'none', background: 'transparent', color: T.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.cardBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span>{row.label}</span>
            <ChevronRight style={{ width: 14, height: 14, color: T.textDim }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: T.textMuted }}>Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className="flex flex-col items-center p-4 rounded-xl transition-all text-center"
              style={{
                background: theme === opt.id ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
                border: theme === opt.id ? '1.5px solid #F5A623' : '1.5px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: 28 }}>{opt.icon}</span>
              <span className="mt-2 text-sm font-medium" style={{ color: theme === opt.id ? '#F5A623' : T.textMuted }}>
                {opt.label}
              </span>
              <span className="mt-1 text-xs" style={{ color: T.textDim }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [activeSection, setActiveSection] = useState('account');
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: T.bg }}>
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
            placeholder="Search settings"
            className="w-full pl-8 pr-4 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}
          />
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <nav className="w-52 flex-shrink-0 overflow-y-auto py-2" style={{ borderRight: `1px solid ${T.borderSubtle}` }}>
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
                  color: isActive ? T.accent : T.textMuted,
                  fontSize: 14,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.cardBg; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
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
