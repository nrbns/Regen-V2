import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
import {
  Bell,
  Download,
  Bookmark,
  Settings,
  MoreVertical,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Wifi,
  Battery,
  Globe,
} from 'lucide-react';
import { ToastContainer } from '../ui/Toast';
import { useCommandController } from '../../hooks/useCommandController';

interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  favicon?: string;
}

type BrowserMode = 'general' | 'research';

const SIDE_MENU_ITEMS = [
  { label: 'New Tab',                 shortcut: 'Ctrl+T'       },
  { label: 'New Window',              shortcut: 'Ctrl+N'       },
  { label: 'New Incognito Window',    shortcut: 'Ctrl+Shift+N' },
  { label: 'History',                 shortcut: null            },
  { label: 'Downloads',               shortcut: null            },
  { label: 'Tab Groups',              shortcut: null            },
  { label: 'Extensions',             shortcut: null            },
  { label: 'Delete Browsing History', shortcut: null            },
  { label: 'Zoom',                    shortcut: null, isZoom: true },
  { label: 'Print',                   shortcut: 'Ctrl+P'       },
  { label: 'Regen Lens',              shortcut: null            },
  { label: 'Translate',               shortcut: null            },
  { label: 'Find & Edit',             shortcut: null            },
  { label: 'Cast, Save, & Share',     shortcut: null            },
  { label: 'Help',                    shortcut: null            },
  { label: 'Settings',                shortcut: null            },
  { label: 'Exit',                    shortcut: null            },
];

const DIVIDERS = ['New Incognito Window', 'Delete Browsing History', 'Cast, Save, & Share'];

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { executeCommand } = useCommandController();

  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];

  const [mode,        setMode]        = useState<BrowserMode>('general');
  const [showMenu,    setShowMenu]    = useState(false);
  const [urlBarValue, setUrlBarValue] = useState('');
  const [zoom,        setZoom]        = useState(100);
  const [tabs,        setTabs]        = useState<Tab[]>([
    { id: '1', title: 'REGEN Home', url: '/', isActive: true, favicon: '🏠' },
  ]);

  useEffect(() => {
    setMode(location.pathname === '/research' ? 'research' : 'general');
  }, [location.pathname]);

  const handleModeSwitch = (m: BrowserMode) => {
    setMode(m);
    navigate(m === 'research' ? '/research' : '/');
  };

  const handleNewTab = () => {
    const t: Tab = { id: Date.now().toString(), title: 'New Tab', url: '/browse', isActive: true };
    setTabs(prev => prev.map(x => ({ ...x, isActive: false })).concat(t));
    navigate('/browse');
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = tabs.filter(t => t.id !== id);
    if (!remaining.length) return;
    const wasActive = tabs.find(t => t.id === id)?.isActive;
    if (wasActive) remaining[remaining.length - 1].isActive = true;
    setTabs(remaining);
  };

  const handleSwitchTab = (id: string) => {
    setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === id })));
    const tab = tabs.find(t => t.id === id);
    if (tab) navigate(tab.url);
  };

  const handleUrlSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !urlBarValue.trim()) return;
    const val = urlBarValue.trim();
    if (val.startsWith('http') || val.includes('.')) {
      executeCommand(`navigate ${val}`, { currentUrl: window.location.href }).catch(() => {});
    } else {
      navigate(`/browse?q=${encodeURIComponent(val)}`);
    }
  };

  const handleMenuAction = (label: string) => {
    setShowMenu(false);
    const map: Record<string, string> = {
      'New Tab':  '/browse',
      History:    '/history',
      Downloads:  '/downloads',
      Settings:   '/settings',
    };
    if (map[label]) navigate(map[label]);
    else if (label === 'New Tab') handleNewTab();
    else if (label === 'Exit') window.close();
  };

  const isFullPage = ['/history', '/downloads', '/settings'].includes(location.pathname);

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: T.bg }}
    >
      <ToastContainer />

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-4 gap-3 flex-shrink-0"
        style={{ height: 56 }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center outline-none flex-shrink-0"
          style={{ gap: 4, alignItems: 'center' }}
        >
          <img
            src="/images/icon-512c.png"
            alt="REGEN AI"
            style={{ width: 24, height: 24, marginRight: -4, display: 'block' }}
            className="object-contain flex-shrink-0"
          />
          <span style={{ color: T.accent, fontSize: 14, fontWeight: 700, lineHeight: '24px' }}>
            REGEN AI
          </span>
        </button>

        {/* General / Research toggle — centered */}
        <div className="flex-1 flex justify-center">
          <div
            className="flex items-center rounded-full flex-shrink-0"
            style={{
              background: T.toggleBg,
              border: `1px solid ${T.toggleBorder}`,
              padding: 4,
              gap: 4,
            }}
          >
            {(['general', 'research'] as BrowserMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                className="flex items-center rounded-full font-semibold transition-all"
                style={
                  mode === m
                    ? { fontSize: 13, background: T.accent, color: '#fff', padding: '6px 18px', gap: 6 }
                    : { fontSize: 13, color: T.textMuted, background: 'transparent', padding: '6px 18px', gap: 6 }
                }
              >
                <span style={{ fontSize: 13 }}>{m === 'general' ? '🌐' : '📖'}</span>
                <span className="capitalize">{m}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bell + Avatar */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button style={{ color: T.textDim }} className="hover:opacity-100 transition-colors p-1">
            <Bell style={{ width: 17, height: 17 }} />
          </button>
          <div
            className="rounded-full flex items-center justify-center font-bold text-white cursor-pointer"
            style={{ width: 28, height: 28, fontSize: 12, background: 'linear-gradient(135deg,#2ecc71,#27ae60)' }}
          >
            A
          </div>
        </div>
      </div>

      {/* ── TAB STRIP ───────────────────────────────────────────────────── */}
      {!isFullPage && (
        <div
          className="flex items-center px-2 flex-shrink-0 overflow-hidden"
          style={{
            height: 36,
            background: T.tabStrip,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className="flex items-center space-x-1.5 px-3 mx-0.5 rounded-lg cursor-pointer group select-none"
              style={{
                height: 26,
                background: tab.isActive ? T.tabActive : 'transparent',
                border:     tab.isActive ? `1px solid ${T.tabActiveBorder}` : '1px solid transparent',
                minWidth: 90,
                maxWidth: 160,
              }}
            >
              <span style={{ fontSize: 11 }}>{tab.favicon ?? '🌐'}</span>
              <span className="truncate flex-1" style={{ fontSize: 12, color: T.text, opacity: 0.8 }}>{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: T.textDim }}
                >
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleNewTab}
            className="w-6 h-6 flex items-center justify-center rounded transition-all ml-1"
            style={{ color: T.textDim }}
          >
            <Plus style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* ── NAV + TOOLBAR BAR ───────────────────────────────────────────── */}
      {!isFullPage && (
        <div
          className="flex items-center gap-1 px-2 flex-shrink-0"
          style={{
            height: 36,
            borderBottom: `1px solid ${T.borderSubtle}`,
          }}
        >
          {/* Nav controls */}
          <div className="flex items-center flex-shrink-0">
            {[
              { icon: ChevronLeft,  action: () => window.history.back(),    title: 'Back'    },
              { icon: ChevronRight, action: () => window.history.forward(), title: 'Forward' },
              { icon: RotateCw,     action: () => window.location.reload(), title: 'Reload'  },
            ].map(({ icon: Icon, action, title }) => (
              <button
                key={title}
                onClick={action}
                title={title}
                className="w-7 h-7 flex items-center justify-center rounded transition-all"
                style={{ color: T.textDim }}
              >
                <Icon style={{ width: 14, height: 14 }} />
              </button>
            ))}
          </div>

          {/* URL bar — Chrome-style, fills middle */}
          <div
            className="flex-1 flex items-center mx-2"
            style={{
              height: 28,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              borderRadius: 20,
              paddingLeft: 10,
              paddingRight: 10,
              gap: 6,
            }}
          >
            <Globe style={{ width: 13, height: 13, color: T.textDim, flexShrink: 0 }} />
            <input
              type="text"
              value={urlBarValue}
              onChange={e => setUrlBarValue(e.target.value)}
              onKeyDown={handleUrlSubmit}
              placeholder="Search or enter URL"
              className="flex-1 outline-none bg-transparent"
              style={{ fontSize: 13, color: T.textMuted }}
              onFocus={e => (e.currentTarget.parentElement!.style.borderColor = 'rgba(245,166,35,0.6)')}
              onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = T.inputBorder)}
            />
          </div>

          {/* Toolbar icons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[
              { icon: Download, title: 'Downloads', action: () => navigate('/downloads') },
              { icon: Bookmark, title: 'Bookmarks', action: () => {}                     },
              { icon: Settings, title: 'Settings',  action: () => navigate('/settings')  },
            ].map(({ icon: Icon, title, action }) => (
              <button
                key={title}
                title={title}
                onClick={action}
                className="w-7 h-7 flex items-center justify-center rounded transition-all"
                style={{ color: T.textDim }}
              >
                <Icon style={{ width: 15, height: 15 }} />
              </button>
            ))}

            {/* ⋮ menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded transition-all"
                style={{ color: T.textDim }}
              >
                <MoreVertical style={{ width: 15, height: 15 }} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1,    y: 0  }}
                      exit={  { opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.13 }}
                      className="absolute right-0 top-full mt-1 rounded-xl py-1.5 z-50 overflow-hidden shadow-2xl"
                      style={{
                        width:      270,
                        background: T.menuBg,
                        border:     `1px solid ${T.menuBorder}`,
                      }}
                    >
                      <div className="flex items-center justify-between px-4 py-2 mb-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">A</div>
                          <span className="text-sm font-medium" style={{ color: T.text, opacity: 0.8 }}>Albert</span>
                        </div>
                        <button className="text-xs px-3 py-0.5 rounded-full text-white/60 border border-white/25 hover:border-white/50 transition-all">
                          Sign in
                        </button>
                      </div>

                      {SIDE_MENU_ITEMS.map((item, i) => (
                        <React.Fragment key={i}>
                          {item.isZoom ? (
                            <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ color: T.textMuted }}>
                              <span>{item.label}</span>
                              <div className="flex items-center space-x-2">
                                <button onClick={() => setZoom(z => Math.max(25,  z - 10))} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: T.textMuted }}>–</button>
                                <span className="w-10 text-center" style={{ color: T.textDim }}>{zoom}%</span>
                                <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: T.textMuted }}>+</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleMenuAction(item.label)}
                              className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-left transition-all"
                              style={{ color: T.textMuted }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              style={{ background: 'transparent' }}
                            >
                              <span>{item.label}</span>
                              {item.shortcut && <span className="text-white/30">{item.shortcut}</span>}
                            </button>
                          )}
                          {DIVIDERS.includes(item.label) && (
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>

      {/* ── BOTTOM STATUS BAR ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height:     26,
          borderTop:  `1px solid ${T.borderSubtle}`,
          background: T.statusBar,
        }}
      >
        <div className="flex items-center space-x-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
        <div className="flex items-center space-x-2.5">
          <Wifi    style={{ width: 13, height: 13, color: T.textDim }} />
          <Battery style={{ width: 13, height: 13, color: T.textDim }} />
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full" style={{ width: '65%', background: '#F5A623' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
