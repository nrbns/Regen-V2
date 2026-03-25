import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1f35 100%)' }}
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
          className="flex items-center space-x-1 outline-none flex-shrink-0"
        >
          <img
            src="/images/icon-512c.png"
            alt="REGEN AI"
            style={{ width: 28, height: 28 }}
            className="object-contain"
          />
          <span style={{ color: '#F5A623', fontSize: 14, fontWeight: 700 }}>
            REGEN AI
          </span>
        </button>

        {/* General / Research toggle — centered */}
        <div className="flex-1 flex justify-center">
          <div
            className="flex items-center rounded-full flex-shrink-0"
            style={{
              background: 'rgba(0,0,0,0.30)',
              border: '1px solid rgba(255,255,255,0.12)',
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
                    ? { fontSize: 13, background: '#F5A623', color: '#fff', padding: '6px 18px', gap: 6 }
                    : { fontSize: 13, color: 'rgba(255,255,255,0.55)', background: 'transparent', padding: '6px 18px', gap: 6 }
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
          <button className="text-white/50 hover:text-white transition-colors p-1">
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
            background: 'rgba(0,0,0,0.15)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className="flex items-center space-x-1.5 px-3 mx-0.5 rounded-lg cursor-pointer group select-none"
              style={{
                height: 26,
                background: tab.isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                border:     tab.isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                minWidth: 90,
                maxWidth: 160,
              }}
            >
              <span style={{ fontSize: 11 }}>{tab.favicon ?? '🌐'}</span>
              <span className="truncate text-white/80 flex-1" style={{ fontSize: 12 }}>{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-all"
                >
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleNewTab}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-all ml-1"
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
            borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
              >
                <Icon style={{ width: 14, height: 14 }} />
              </button>
            ))}
          </div>

          {/* URL bar — Chrome-style, fills middle */}
          <div className="flex-1 relative mx-2">
            <Globe
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: 12, width: 13, height: 13, color: 'rgba(255,255,255,0.30)' }}
            />
            <input
              type="text"
              value={urlBarValue}
              onChange={e => setUrlBarValue(e.target.value)}
              onKeyDown={handleUrlSubmit}
              placeholder="Search or enter URL"
              className="w-full outline-none transition-all"
              style={{
                height: 28,
                paddingLeft: 32,
                paddingRight: 12,
                fontSize: 13,
                color: 'rgba(255,255,255,0.70)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 20,
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(245,166,35,0.6)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
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
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
              >
                <Icon style={{ width: 15, height: 15 }} />
              </button>
            ))}

            {/* ⋮ menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
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
                        background: '#15273d',
                        border:     '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-center justify-between px-4 py-2 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white">A</div>
                          <span className="text-sm text-white/80 font-medium">Albert</span>
                        </div>
                        <button className="text-xs px-3 py-0.5 rounded-full text-white/60 border border-white/25 hover:border-white/50 transition-all">
                          Sign in
                        </button>
                      </div>

                      {SIDE_MENU_ITEMS.map((item, i) => (
                        <React.Fragment key={i}>
                          {item.isZoom ? (
                            <div className="flex items-center justify-between px-4 py-2 text-xs text-white/70">
                              <span>{item.label}</span>
                              <div className="flex items-center space-x-2">
                                <button onClick={() => setZoom(z => Math.max(25,  z - 10))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/60">–</button>
                                <span className="w-10 text-center text-white/50">{zoom}%</span>
                                <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/60">+</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleMenuAction(item.label)}
                              className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-white/70 hover:text-white text-left transition-all"
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
          borderTop:  '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-center space-x-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
        <div className="flex items-center space-x-2.5">
          <Wifi    style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
          <Battery style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full" style={{ width: '65%', background: '#F5A623' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
