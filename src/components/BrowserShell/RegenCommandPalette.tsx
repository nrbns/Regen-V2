/**
 * Regen Command Palette — Ctrl+K quick launcher for search, tabs, bookmarks, actions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collectRecentSites, type RecentSite } from '../../lib/browser/recentSites';
import { displayUrlBar } from '../../lib/browser/normalizeUrl';
import type { Tab } from '../../state/tabsStore';
import type { Bookmark } from '../../state/bookmarksStore';
import type { BrowseEngine } from '../../lib/browser/browseEngineStore';

const BG = '#0f1623';
const ACCENT = '#f0a030';
const SURFACE = '#151d2e';
const BORDER = '#ffffff14';

export type PaletteAction =
  | { type: 'navigate'; url: string }
  | { type: 'switchTab'; tabId: string }
  | { type: 'newTab'; url?: string }
  | { type: 'closeTab'; tabId: string }
  | { type: 'askAi'; query: string }
  | { type: 'openResearch'; query: string }
  | { type: 'explainPage' }
  | { type: 'summarize' }
  | { type: 'setEngine'; engine: BrowseEngine }
  | { type: 'toggleBookmarks' }
  | { type: 'openFoundation'; tab: 'downloads' | 'profiles' | 'passwords' | 'extensions' }
  | { type: 'devtools' }
  | { type: 'downloadPage' }
  | { type: 'downloadOverview' };

type PaletteItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action: PaletteAction;
  score: number;
};

export interface RegenCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tabs: Tab[];
  bookmarks: Bookmark[];
  historyStacks: Record<string, { entries: { url: string; title?: string }[]; index: number }>;
  onRun: (action: PaletteAction) => void;
}

function buildItems(
  query: string,
  tabs: Tab[],
  bookmarks: Bookmark[],
  recent: RecentSite[]
): PaletteItem[] {
  const q = query.trim().toLowerCase();
  const items: PaletteItem[] = [];

  const match = (text: string) => !q || text.toLowerCase().includes(q);

  if (q) {
    items.push({
      id: 'search',
      title: `Search for “${query.trim()}”`,
      subtitle: 'Ask Regen',
      icon: '⌕',
      action: { type: 'navigate', url: query.trim() },
      score: 100,
    });
  }

  items.push({
    id: 'new-tab',
    title: 'New tab',
    subtitle: 'Ctrl+T',
    icon: '＋',
    action: { type: 'newTab' },
    score: 90,
  });

  if (match('summarize summary page')) {
    items.push({
      id: 'summarize',
      title: 'Summarize current page',
      icon: '✦',
      action: { type: 'summarize' },
      score: 85,
    });
  }

  if (match('explain page this')) {
    items.push({
      id: 'explain-page',
      title: 'Explain current page',
      icon: '◈',
      action: { type: 'explainPage' },
      score: 84,
    });
  }

  const researchPrefix = /^research\s+/i.test(query.trim());
  if (researchPrefix || match('research study paper sources')) {
    const researchQ = researchPrefix
      ? query.trim().replace(/^research\s+/i, '')
      : q && !q.startsWith('@') && !q.startsWith('ask:')
        ? query.trim()
        : '';
    items.push({
      id: 'research-workspace',
      title: researchQ ? `Research: ${researchQ}` : 'Open research workspace',
      subtitle: 'Deep sources & execution',
      icon: '🔬',
      action: { type: 'openResearch', query: researchQ },
      score: researchQ ? 88 : 82,
    });
  }

  if (match('download downloads')) {
    items.push({
      id: 'foundation-downloads',
      title: 'Downloads',
      icon: '⬇',
      action: { type: 'openFoundation', tab: 'downloads' },
      score: 79,
    });
  }

  if (match('overview overall export summary download generate')) {
    items.push({
      id: 'download-overview',
      title: 'Generate overview → Downloads',
      subtitle: 'AI summary as .md file',
      icon: '📄',
      action: { type: 'downloadOverview' },
      score: 86,
    });
  }

  if (match('profile profiles account')) {
    items.push({
      id: 'foundation-profiles',
      title: 'Browser profiles',
      icon: '👤',
      action: { type: 'openFoundation', tab: 'profiles' },
      score: 78,
    });
  }

  if (match('password passwords vault')) {
    items.push({
      id: 'foundation-passwords',
      title: 'Password vault',
      icon: '🔐',
      action: { type: 'openFoundation', tab: 'passwords' },
      score: 77,
    });
  }

  if (match('extension extensions')) {
    items.push({
      id: 'foundation-extensions',
      title: 'Extensions',
      icon: '🧩',
      action: { type: 'openFoundation', tab: 'extensions' },
      score: 76,
    });
  }

  if (match('devtools developer inspect')) {
    items.push({
      id: 'devtools',
      title: 'Open DevTools',
      subtitle: 'Ctrl+Shift+I',
      icon: '⌨',
      action: { type: 'devtools' },
      score: 75,
    });
  }

  if (match('bookmark bookmarks')) {
    items.push({
      id: 'bookmarks-panel',
      title: 'Open bookmarks panel',
      icon: '⭐',
      action: { type: 'toggleBookmarks' },
      score: 80,
    });
  }

  if (match('native engine webview')) {
    items.push({
      id: 'engine-native',
      title: 'Switch to Native engine',
      icon: '⚡',
      action: { type: 'setEngine', engine: 'native' },
      score: 75,
    });
  }

  if (match('iframe engine')) {
    items.push({
      id: 'engine-iframe',
      title: 'Switch to Iframe engine',
      icon: '▣',
      action: { type: 'setEngine', engine: 'iframe' },
      score: 74,
    });
  }

  for (const b of bookmarks) {
    if (!match(b.title) && !match(b.url)) continue;
    items.push({
      id: `bm-${b.id}`,
      title: b.title,
      subtitle: displayUrlBar(b.url),
      icon: '⭐',
      action: { type: 'navigate', url: b.url },
      score: 70,
    });
  }

  for (const site of recent) {
    if (!match(site.title) && !match(site.url)) continue;
    items.push({
      id: `rc-${site.url}`,
      title: site.title,
      subtitle: displayUrlBar(site.url),
      icon: '🕐',
      action: { type: 'navigate', url: site.url },
      score: 65,
    });
  }

  for (const tab of tabs) {
    if (!match(tab.title) && !match(tab.url)) continue;
    items.push({
      id: `tab-${tab.id}`,
      title: tab.title || 'Tab',
      subtitle: displayUrlBar(tab.url) || 'New tab',
      icon: '▭',
      action: { type: 'switchTab', tabId: tab.id },
      score: 60,
    });
  }

  if (q.startsWith('@') || q.startsWith('ask:')) {
    const aiQ = query.trim().replace(/^(@|ask:)\s*/i, '');
    if (aiQ) {
      items.unshift({
        id: 'ask-ai',
        title: `Ask Regen: ${aiQ}`,
        icon: '✨',
        action: { type: 'askAi', query: aiQ },
        score: 110,
      });
    }
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 12);
}

export function RegenCommandPalette({
  open,
  onClose,
  tabs,
  bookmarks,
  historyStacks,
  onRun,
}: RegenCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const recent = useMemo(() => collectRecentSites(historyStacks, 12), [historyStacks]);
  const items = useMemo(
    () => buildItems(query, tabs, bookmarks, recent),
    [query, tabs, bookmarks, recent]
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const runItem = useCallback(
    (item: PaletteItem) => {
      onRun(item.action);
      onClose();
    },
    [onRun, onClose]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' && items[highlight]) {
      e.preventDefault();
      runItem(items[highlight]);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Command palette"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 94vw)',
          background: SURFACE,
          border: `1px solid ${ACCENT}44`,
          borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search, research, switch tab… (@ Ask Regen · research …)"
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              borderRadius: 8,
              background: BG,
              border: `1px solid ${ACCENT}33`,
              color: '#f0eeea',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#8a8884' }}>
            ↑↓ navigate · Enter run · Esc close · Ctrl+K
          </p>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0', maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <li style={{ padding: '16px 14px', color: '#8a8884', fontSize: 13 }}>No matches</li>
          ) : (
            items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => runItem(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    border: 'none',
                    background: i === highlight ? `${ACCENT}18` : 'transparent',
                    color: '#f0eeea',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                    {item.subtitle && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: '#8a8884',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.subtitle}
                      </span>
                    )}
                  </span>
                  {i === highlight && (
                    <span style={{ fontSize: 10, color: ACCENT }}>↵</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
