/**
 * Regen Browser Shell — tabs, URL bar, iframe/native browse, avatar sidebar.
 * Theme: #0f1623 background, #f0a030 accents.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useShellBrowser } from '../../hooks/useShellBrowser';
import { useBrowserCompanion } from '../../hooks/useBrowserCompanion';
import { useAvatarAutomation } from '../../hooks/useAvatarAutomation';
import { useRealtimeAvatarEmotions } from '../../hooks/useRealtimeAvatarEmotions';
import { CompanionErrorBoundary } from '../companion/CompanionErrorBoundary';
import { AdaptiveAvatar } from '../Avatar/AdaptiveAvatar';
import { TabContentStack } from './TabContentStack';
import { displayUrlBar, isNewTabUrl } from '../../lib/browser/normalizeUrl';
import { useTabsStore } from '../../state/tabsStore';
import { setCompanionEmotion } from '../../lib/companion/avatarBridge';
import { isTauriShell } from '../../lib/tauri/runtime';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';

const BG = '#0f1623';
const ACCENT = '#f0a030';
const SURFACE = '#151d2e';
const BORDER = '#ffffff14';

const TEST_SITES = [
  { label: 'Google', url: 'https://www.google.com' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'YouTube', url: 'https://www.youtube.com' },
] as const;

function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  return (
    <div
      className="regen-fade-in"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 40,
        background: BG,
      }}
    >
      <AdaptiveAvatar emotion="idle" size={160} />
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: '#f0eeea',
            marginBottom: 8,
          }}
        >
          Re<span style={{ color: ACCENT }}>gen</span>
        </h1>
        <p style={{ fontSize: 14, color: '#8a8884' }}>Search or enter a URL below</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {TEST_SITES.map((s) => (
          <button
            key={s.url}
            type="button"
            onClick={() => onNavigate(s.url)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              color: '#f0eeea',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RegenBrowserShellInner() {
  const browser = useShellBrowser();
  const companion = useBrowserCompanion();
  const [urlInput, setUrlInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [iframeOnly, setIframeOnly] = useState(false);
  const avatarAuto = useAvatarAutomation(pageError, companion.visionSummary);
  const activeTab = browser.activeTab;

  useRealtimeAvatarEmotions({
    isLoading: activeTab?.isLoading,
    isListening: companion.isListening,
    streamText: companion.streamText,
  });

  useEffect(() => {
    if (activeTab?.url) {
      setUrlInput(displayUrlBar(activeTab.url));
    } else {
      setUrlInput('');
    }
  }, [activeTab?.id, activeTab?.url]);

  const navigateTo = useCallback(
    (input: string) => {
      setPageError(null);
      setCompanionEmotion('thinking');
      const bar = browser.navigate(input);
      setUrlInput(bar);
    },
    [browser]
  );

  const loadTestSite = useCallback(
    (url: string) => {
      navigateTo(url);
    },
    [navigateTo]
  );

  const handlePageError = useCallback((message: string) => {
    setPageError(message);
    setCompanionEmotion('noticing', { revertMs: 4000, revertTo: 'idle' });
  }, []);

  const handlePageLoaded = useCallback(() => {
    setPageError(null);
    setCompanionEmotion('happy', { revertMs: 2000, revertTo: 'idle' });
  }, []);

  const selectTab = useCallback(
    (id: string) => {
      browser.switchTab(id);
      const tab = useTabsStore.getState().tabs.find((t) => t.id === id);
      setUrlInput(tab?.url ? displayUrlBar(tab.url) : '');
      setPageError(null);
    },
    [browser]
  );

  const closeTab = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      browser.closeTab(id);
      const st = useTabsStore.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      setUrlInput(tab?.url ? displayUrlBar(tab.url) : '');
    },
    [browser]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 't') {
          e.preventDefault();
          browser.addTab();
          setUrlInput('');
        }
        if (e.key === 'w') {
          e.preventDefault();
          if (browser.activeTabId) browser.closeTab(browser.activeTabId);
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          const idx = browser.tabs.findIndex((t) => t.id === browser.activeTabId);
          const next =
            browser.tabs[e.shiftKey ? (idx - 1 + browser.tabs.length) % browser.tabs.length : (idx + 1) % browser.tabs.length];
          if (next) selectTab(next.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [browser, selectTab]);

  const avatarEmotion = (companion.emotion ?? 'idle') as AvatarEmotion;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        minHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        color: '#f0eeea',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        data-browser-chrome
        style={{
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: 4,
          background: SURFACE,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'thin',
          }}
        >
          {browser.tabs.map((tab) => {
            const isActive = tab.id === browser.activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 12px',
                  height: 30,
                  borderRadius: '8px 8px 0 0',
                  maxWidth: 180,
                  flexShrink: 0,
                  background: isActive ? BG : 'transparent',
                  border: isActive ? `1px solid ${ACCENT}44` : '1px solid transparent',
                  color: isActive ? '#f0eeea' : '#8a8884',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.title || 'New Tab'}
                </span>
                {tab.isLoading && (
                  <span style={{ fontSize: 10, color: ACCENT }}>…</span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => closeTab(tab.id, e)}
                  onKeyDown={(e) => e.key === 'Enter' && closeTab(tab.id, e as unknown as React.MouseEvent)}
                  style={{ opacity: 0.6, padding: '0 2px' }}
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            browser.addTab();
            setUrlInput('');
            setPageError(null);
          }}
          disabled={browser.tabs.length >= browser.maxTabs}
          title={browser.tabs.length >= browser.maxTabs ? 'Max tabs reached' : 'New tab (Ctrl+T)'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            color: '#8a8884',
            fontSize: 18,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      {/* Quick test + URL bar */}
      <div
        data-browser-chrome
        style={{
          flexShrink: 0,
          background: SURFACE,
          borderBottom: `1px solid ${BORDER}`,
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: '#8a8884',
              cursor: 'pointer',
              marginRight: 8,
            }}
          >
            <input
              type="checkbox"
              checked={iframeOnly}
              onChange={(e) => setIframeOnly(e.target.checked)}
            />
            Iframe mode (no sandbox)
          </label>
          {TEST_SITES.map((s) => (
            <button
              key={s.url}
              type="button"
              onClick={() => loadTestSite(s.url)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                background: `${ACCENT}22`,
                color: ACCENT,
                border: `1px solid ${ACCENT}44`,
                cursor: 'pointer',
              }}
            >
              Load {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigateTo(urlInput);
            }}
            placeholder="Search or type a URL — press Enter"
            style={{
              flex: 1,
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              background: BG,
              border: `1px solid ${ACCENT}33`,
              color: '#f0eeea',
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={() => navigateTo(urlInput)}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 8,
              background: ACCENT,
              color: BG,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </div>
        {pageError && (
          <p style={{ fontSize: 12, color: '#e8c547', margin: 0 }}>⚠️ {pageError}</p>
        )}
      </div>

      {/* Main: content + sidebar */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <div
          id="regen-browser-content-pane"
          data-browser-content-pane
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <TabContentStack
            tabs={browser.tabs}
            activeTabId={browser.activeTabId}
            activeUrl={browser.activeUrl}
            isNewTab={browser.isNewTab}
            preferIframe={iframeOnly}
            onLoadFailed={handlePageError}
            onLoadEnd={handlePageLoaded}
            onUrlChange={(tabId, u) => browser.updateTab(tabId, { url: u })}
            onTitleChange={(tabId, t) => browser.updateTab(tabId, { title: t })}
            newTabPage={<NewTabPage onNavigate={navigateTo} />}
          />
        </div>

        {/* Chat + avatar sidebar */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: SURFACE,
            borderLeft: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <AdaptiveAvatar emotion={avatarEmotion} size={140} />
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              fontSize: 12,
              color: '#8a8884',
            }}
          >
            {avatarAuto.greeting && (
              <p style={{ color: ACCENT, marginBottom: 10, lineHeight: 1.4 }}>{avatarAuto.greeting}</p>
            )}
            {avatarAuto.suggestions && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#f0eeea', lineHeight: 1.45, marginBottom: 8 }}>
                  {avatarAuto.suggestions.message}
                </p>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Suggestions
                </p>
                {avatarAuto.suggestions.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const prompt = avatarAuto.acceptSuggestion(s, avatarAuto.suggestions!.userEmotion);
                      void companion.sendMessage(prompt);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      marginBottom: 6,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${BORDER}`,
                      background: BG,
                      color: '#f0eeea',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    avatarAuto.dismissSuggestions(
                      avatarAuto.suggestions!.userEmotion,
                      avatarAuto.suggestions!.suggestions[0]
                    )
                  }
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    color: '#8a8884',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
            {companion.streamText ? (
              <p style={{ color: '#f0eeea', lineHeight: 1.5 }}>{companion.streamText}</p>
            ) : !avatarAuto.suggestions ? (
              <p>Ask Regen anything while you browse.</p>
            ) : null}
          </div>
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  void companion.sendMessage(chatInput.trim());
                  setChatInput('');
                }
              }}
              placeholder="Message Regen…"
              style={{
                flex: 1,
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                background: BG,
                border: `1px solid ${BORDER}`,
                color: '#f0eeea',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (chatInput.trim()) {
                  void companion.sendMessage(chatInput.trim());
                  setChatInput('');
                }
              }}
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: 8,
                background: ACCENT,
                color: BG,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </aside>
      </div>

      {/* Status bar */}
      <div
        style={{
          height: 26,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 16,
          fontSize: 10,
          color: '#8a8884',
          background: SURFACE,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ color: ACCENT }}>⬡ Regen</span>
        <span>{browser.connected ? 'live' : 'offline'}</span>
        {avatarAuto.memoryPercent > 0 && (
          <span title="JS heap vs 500MB budget">mem {avatarAuto.memoryPercent.toFixed(0)}%</span>
        )}
        <span>
          {browser.tabs.length} tab{browser.tabs.length === 1 ? '' : 's'}
          {iframeOnly ? ' · iframe' : isTauriShell() ? ' · native' : ' · web'}
        </span>
        {activeTab?.url && !browser.isNewTab && (
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            {displayUrlBar(activeTab.url)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RegenBrowserShell() {
  return (
    <CompanionErrorBoundary name="shell">
      <RegenBrowserShellInner />
    </CompanionErrorBoundary>
  );
}
