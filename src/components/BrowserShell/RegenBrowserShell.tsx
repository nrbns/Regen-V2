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
import { AvatarModeToggle } from '../Avatar/AvatarModeToggle';
import { TabContentStack } from './TabContentStack';
import { BrowserNavBar } from './BrowserNavBar';
import { displayUrlBar, isNewTabUrl } from '../../lib/browser/normalizeUrl';
import { useTabsStore } from '../../state/tabsStore';
import { setCompanionEmotion } from '../../lib/companion/avatarBridge';
import { isTauriShell } from '../../lib/tauri/runtime';
import { useBrowseEngineStore, type BrowseEngine } from '../../lib/browser/browseEngineStore';
import { useWebviewLayoutSync } from '../../hooks/useWebviewLayoutSync';
import {
  REGEN_SIDEBAR_COLLAPSED_PX,
  REGEN_SIDEBAR_EXPANDED_PX,
} from '../../lib/browser/webviewBounds';
import { PageSelectionMenu } from './PageSelectionMenu';
import { usePageSelectionMenu, selectionPrompt } from '../../hooks/usePageSelectionMenu';
import type { PageSyncDetail } from '../../lib/browser/nativePageSync';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { useTabHistoryStore } from '../../lib/browser/tabHistoryStore';
import { detectBrowseIntent, type BrowseIntent } from '../../lib/browser/detectBrowseIntent';
import { usePageAutoSummary } from '../../hooks/usePageAutoSummary';
import {
  RegenCommandPalette,
  type PaletteAction,
} from './RegenCommandPalette';
import { ResearchWorkspacePanel } from './ResearchWorkspacePanel';
import { BrowserFoundationPanel } from './BrowserFoundationPanel';
import { fetchNativePageSnippet } from '../../lib/browser/fetchPageSnippet';
import { useBrowserProfileStore } from '../../lib/browser/browserProfileStore';
import {
  startBrowserDownload,
  saveTextDownload,
  subscribeDownloadEvents,
  syncDownloadsFromDb,
  toggleActiveTabDevTools,
} from '../../lib/browser/browserDownloads';
import {
  formatPageOverviewMarkdown,
  readySummaryForUrl,
  sanitizeOverviewFilename,
} from '../../lib/browser/pageOverviewExport';
import { collectRecentSites, faviconUrl } from '../../lib/browser/recentSites';

const BG = '#0f1623';
const ACCENT = '#f0a030';
const SURFACE = '#151d2e';
const BORDER = '#ffffff14';

const menuBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  borderRadius: 6,
  fontSize: 12,
  background: 'transparent',
  color: '#f0eeea',
  border: 'none',
  cursor: 'pointer',
};

function NewTabPage({
  onNavigate,
  searchValue,
  onSearchChange,
  recentSites,
  onOpenCommandPalette,
}: {
  onNavigate: (url: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  recentSites: { url: string; title: string }[];
  onOpenCommandPalette: () => void;
}) {
  return (
    <div
      className="regen-fade-in"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '24px 32px 40px',
        background: `radial-gradient(ellipse 80% 60% at 50% 35%, #1a2840 0%, ${BG} 70%)`,
      }}
    >
      <AdaptiveAvatar
        emotion="idle"
        size={340}
        variant="hero"
        intensity={1}
        showLabel={false}
      />
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: '#f0eeea',
            marginBottom: 6,
          }}
        >
          Re<span style={{ color: ACCENT }}>gen</span> AI
        </h1>
        <p style={{ fontSize: 14, color: '#8a8884', marginBottom: 12 }}>
          Search the web or press{' '}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            style={{
              background: `${ACCENT}22`,
              border: `1px solid ${ACCENT}55`,
              borderRadius: 4,
              color: ACCENT,
              fontSize: 12,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            Ctrl+K
          </button>
        </p>
        <div style={{ display: 'flex', gap: 8, width: 'min(520px, 92vw)', marginBottom: 8 }}>
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue.trim()) onNavigate(searchValue.trim());
              if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onOpenCommandPalette();
              }
            }}
            placeholder="Search or enter URL…"
            autoFocus
            style={{
              flex: 1,
              height: 42,
              padding: '0 14px',
              borderRadius: 10,
              background: SURFACE,
              border: `1px solid ${ACCENT}44`,
              color: '#f0eeea',
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={() => searchValue.trim() && onNavigate(searchValue.trim())}
            style={{
              height: 42,
              padding: '0 20px',
              borderRadius: 10,
              background: ACCENT,
              color: BG,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Go
          </button>
        </div>
      </div>
      {recentSites.length > 0 && (
        <div style={{ width: 'min(560px, 94vw)' }}>
          <p
            style={{
              fontSize: 11,
              color: '#8a8884',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
              textAlign: 'left',
            }}
          >
            Recent
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
            }}
          >
            {recentSites.slice(0, 6).map((site) => (
              <button
                key={site.url}
                type="button"
                onClick={() => onNavigate(site.url)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: 12,
                  borderRadius: 10,
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: '#f0eeea',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <img
                  src={faviconUrl(site.url)}
                  alt=""
                  width={20}
                  height={20}
                  style={{ borderRadius: 4 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  {site.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegenBrowserShellInner() {
  const browser = useShellBrowser();
  const companion = useBrowserCompanion();
  const pageSummary = usePageAutoSummary(true);
  const [urlInput, setUrlInput] = useState('');
  const [aiCollapsed, setAiCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('regen-ai-sidebar-collapsed') !== 'false';
  });
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const { selection, close: closeSelection, captureSelection } = usePageSelectionMenu(
    browser.activeTabId
  );
  const [chatInput, setChatInput] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<'none' | 'bookmarks' | 'history'>('none');
  const [sidePanelQuery, setSidePanelQuery] = useState('');
  const [lastIntent, setLastIntent] = useState<BrowseIntent | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [foundationOpen, setFoundationOpen] = useState(false);
  const [foundationTab, setFoundationTab] = useState<
    'downloads' | 'profiles' | 'passwords' | 'extensions'
  >('downloads');
  const [foundationDownloadUrl, setFoundationDownloadUrl] = useState<string | undefined>();
  const activeProfileId = useBrowserProfileStore((s) => s.activeProfileId);
  const browserProfiles = useBrowserProfileStore((s) => s.profiles);
  const activeProfile =
    browserProfiles.find((p) => p.id === activeProfileId) ?? browserProfiles[0];
  const browseEngine = useBrowseEngineStore((s) => s.engine);
  const setBrowseEngine = useBrowseEngineStore((s) => s.setEngine);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const addBookmark = useBookmarksStore((s) => s.addBookmark);
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark);
  const getBookmarkByUrl = useBookmarksStore((s) => s.getBookmarkByUrl);
  const historyStacks = useTabHistoryStore((s) => s.stacks);
  const avatarAuto = useAvatarAutomation(pageError, companion.visionSummary);
  const activeTab = browser.activeTab;
  useWebviewLayoutSync();
  const activeBookmark = activeTab?.url ? getBookmarkByUrl(activeTab.url) : undefined;
  const isBookmarked = !!activeBookmark;
  const historyEntries = Object.entries(historyStacks)
    .flatMap(([tabId, st]) =>
      st.entries.map((entry, idx) => ({
        key: `${tabId}-${idx}-${entry.url}`,
        tabId,
        url: entry.url,
        title: entry.title || entry.url,
      }))
    )
    .reverse()
    .slice(0, 100);
  const normalizedPanelQuery = sidePanelQuery.trim().toLowerCase();
  const filteredBookmarks = normalizedPanelQuery
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(normalizedPanelQuery) ||
          b.url.toLowerCase().includes(normalizedPanelQuery)
      )
    : bookmarks;
  const recentSites = collectRecentSites(historyStacks, 8);

  const filteredHistoryEntries = normalizedPanelQuery
    ? historyEntries.filter(
        (h) =>
          h.title.toLowerCase().includes(normalizedPanelQuery) ||
          h.url.toLowerCase().includes(normalizedPanelQuery)
      )
    : historyEntries;

  useRealtimeAvatarEmotions({
    isLoading: activeTab?.isLoading,
    isListening: companion.isListening,
    streamText: companion.streamText,
  });

  const aiSidebarWidth = aiCollapsed ? REGEN_SIDEBAR_COLLAPSED_PX : REGEN_SIDEBAR_EXPANDED_PX;

  useEffect(() => {
    document.documentElement.dataset.regenAiCollapsed = aiCollapsed ? 'true' : 'false';
    localStorage.setItem('regen-ai-sidebar-collapsed', aiCollapsed ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('regen:sync-webview-bounds'));
  }, [aiCollapsed]);

  useEffect(() => {
    if (activeTab?.url) {
      setUrlInput(displayUrlBar(activeTab.url));
    } else {
      setUrlInput('');
    }
  }, [activeTab?.id, activeTab?.url]);

  useEffect(() => {
    const onPageSync = (e: Event) => {
      const { tabId, url } = (e as CustomEvent<PageSyncDetail>).detail;
      if (tabId === browser.activeTabId && url) {
        setUrlInput(displayUrlBar(url));
      }
    };
    window.addEventListener('regen:page-sync', onPageSync);
    return () => window.removeEventListener('regen:page-sync', onPageSync);
  }, [browser.activeTabId]);

  const toggleAiSidebar = useCallback(() => setAiCollapsed((c) => !c), []);

  const handleSelectionAction = useCallback(
    (action: Parameters<typeof selectionPrompt>[0], text: string) => {
      closeSelection();
      if (action === 'research') {
        setResearchQuery(text);
        setResearchPanelOpen(true);
        return;
      }
      const prompt = selectionPrompt(action, text);
      setChatInput(prompt);
      void companion.sendMessage(prompt);
      if (!aiCollapsed) return;
      setAiCollapsed(false);
    },
    [companion, aiCollapsed, closeSelection]
  );

  const handleUserInput = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      setPageError(null);

      if (/^(@|\/ai\s|ask:)/i.test(trimmed)) {
        const query = trimmed.replace(/^(@|\/ai\s|ask:)/i, '').trim();
        if (query) {
          setChatInput(query);
          void companion.sendMessage(query);
          setLastIntent({ kind: 'ask_ai', label: 'Ask AI', input: query, confidence: 1 });
        }
        return;
      }

      setCompanionEmotion('thinking');
      const bar = browser.navigate(trimmed);
      setUrlInput(bar ?? '');
      setPageError(null);

      void detectBrowseIntent(trimmed, { currentUrl: activeTab?.url }).then((intent) => {
        setLastIntent(intent);
      });
    },
    [browser, activeTab?.url, companion]
  );

  const navigateTo = useCallback(
    (input: string) => {
      void handleUserInput(input);
    },
    [handleUserInput]
  );

  const goBack = useCallback(() => {
    setPageError(null);
    void browser.goBack().then((bar) => {
      if (bar != null) setUrlInput(bar);
    });
  }, [browser]);

  const goForward = useCallback(() => {
    setPageError(null);
    void browser.goForward().then((bar) => {
      if (bar != null) setUrlInput(bar);
    });
  }, [browser]);

  const reloadPage = useCallback(() => {
    if (browser.isNewTab) return;
    setPageError(null);
    setCompanionEmotion('thinking');
    browser.reload();
  }, [browser]);

  const handlePageError = useCallback((message: string) => {
    setPageError(message);
    setCompanionEmotion('noticing', { revertMs: 4000, revertTo: 'idle' });
  }, []);

  const handlePageLoaded = useCallback(() => {
    setPageError(null);
    setCompanionEmotion('happy', { revertMs: 2000, revertTo: 'idle' });
    if (activeTab?.url && !isNewTabUrl(activeTab.url)) {
      pageSummary.scheduleSummary(activeTab.url, activeTab.title, activeTab.id);
      if (activeTab.id) void fetchNativePageSnippet(activeTab.id);
    }
  }, [activeTab?.id, activeTab?.url, activeTab?.title, pageSummary]);

  const summarizeActivePage = useCallback(() => {
    if (!activeTab?.url || isNewTabUrl(activeTab.url)) return;
    void pageSummary.summarizeNow(activeTab.url, activeTab.title, activeTab.id);
  }, [activeTab, pageSummary]);

  const toggleBookmark = useCallback(() => {
    if (!activeTab?.url || isNewTabUrl(activeTab.url)) return;
    if (activeBookmark) {
      removeBookmark(activeBookmark.id);
      return;
    }
    addBookmark({
      url: activeTab.url,
      title: activeTab.title || displayUrlBar(activeTab.url) || 'Untitled',
    });
  }, [activeTab, activeBookmark, addBookmark, removeBookmark]);

  const openSavedUrl = useCallback(
    (url: string) => {
      navigateTo(url);
      setSidePanel('none');
      setSidePanelQuery('');
    },
    [navigateTo]
  );

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

  const openFoundation = useCallback(
    (tab: typeof foundationTab, downloadUrl?: string) => {
      setFoundationTab(tab);
      setFoundationDownloadUrl(downloadUrl);
      setFoundationOpen(true);
      setToolsMenuOpen(false);
    },
    []
  );

  const downloadPageOverview = useCallback(async () => {
    if (!activeTab?.url || isNewTabUrl(activeTab.url)) return;
    setPageError(null);
    setCompanionEmotion('thinking');
    try {
      let ready = readySummaryForUrl(pageSummary.state, activeTab.url);
      let lastResult = pageSummary.state;
      if (!ready) {
        lastResult = await pageSummary.summarizeNow(
          activeTab.url,
          activeTab.title,
          activeTab.id
        );
        ready = readySummaryForUrl(lastResult, activeTab.url);
      }
      if (!ready) {
        setPageError(
          lastResult.status === 'error'
            ? lastResult.message
            : 'Could not generate a page overview to download.'
        );
        return;
      }
      const content = formatPageOverviewMarkdown({
        url: ready.url,
        title: ready.title,
        summary: ready.summary,
        model: ready.model,
        source: ready.source,
      });
      const filename = sanitizeOverviewFilename(ready.title);
      await saveTextDownload({ url: ready.url, filename, content });
      openFoundation('downloads');
      setCompanionEmotion('happy', { revertMs: 1800, revertTo: 'idle' });
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Overview download failed');
      setCompanionEmotion('noticing', { revertMs: 3000, revertTo: 'idle' });
    }
  }, [activeTab, pageSummary, openFoundation]);

  const runPaletteAction = useCallback(
    (action: PaletteAction) => {
      switch (action.type) {
        case 'navigate':
          navigateTo(action.url);
          break;
        case 'switchTab':
          selectTab(action.tabId);
          break;
        case 'newTab':
          browser.addTab(action.url);
          if (!action.url) setUrlInput('');
          break;
        case 'closeTab':
          browser.closeTab(action.tabId);
          break;
        case 'askAi':
          setChatInput(action.query);
          void companion.sendMessage(action.query);
          if (aiCollapsed) setAiCollapsed(false);
          break;
        case 'openResearch':
          setResearchQuery(action.query);
          setResearchPanelOpen(true);
          break;
        case 'explainPage':
          void companion.sendMessage(
            'Explain the main ideas on this page for someone new to the topic.'
          );
          if (aiCollapsed) setAiCollapsed(false);
          break;
        case 'summarize':
          summarizeActivePage();
          break;
        case 'setEngine':
          setBrowseEngine(action.engine);
          break;
        case 'toggleBookmarks':
          setSidePanel((p) => (p === 'bookmarks' ? 'none' : 'bookmarks'));
          break;
        case 'openFoundation':
          openFoundation(action.tab);
          break;
        case 'devtools':
          void toggleActiveTabDevTools(browser.activeTabId);
          break;
        case 'downloadPage':
          if (activeTab?.url) {
            void startBrowserDownload(activeTab.url);
            openFoundation('downloads', activeTab.url);
          }
          break;
        case 'downloadOverview':
          void downloadPageOverview();
          break;
      }
    },
    [
      browser,
      companion,
      navigateTo,
      selectTab,
      setBrowseEngine,
      summarizeActivePage,
      downloadPageOverview,
      aiCollapsed,
      openFoundation,
      activeTab?.url,
    ]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
        return;
      }
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
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          reloadPage();
        }
        if (e.shiftKey && e.key === 'I') {
          e.preventDefault();
          void toggleActiveTabDevTools(browser.activeTabId);
        }
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [browser, selectTab, goBack, goForward, reloadPage]);

  const avatarEmotion = (companion.emotion ?? 'idle') as AvatarEmotion;

  // Re-sync native webview bounds when layout changes (sidebar must stay uncovered).
  useEffect(() => {
    if (!isTauriShell()) return;
    document.documentElement.classList.add('regen-tauri-desktop');
    void syncDownloadsFromDb();
    const unsub = subscribeDownloadEvents();
    return () => {
      document.documentElement.classList.remove('regen-tauri-desktop');
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isTauriShell()) return;
    const pane = document.getElementById('regen-browser-content-pane');
    if (!pane) return;
    const ro = new ResizeObserver(() => {
      window.dispatchEvent(new CustomEvent('regen:sync-webview-bounds'));
    });
    ro.observe(pane);
    const sidebar = document.getElementById('regen-avatar-sidebar');
    if (sidebar) ro.observe(sidebar);
    return () => ro.disconnect();
  }, []);

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
      <RegenCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        tabs={browser.tabs}
        bookmarks={bookmarks}
        historyStacks={historyStacks}
        onRun={runPaletteAction}
      />
      <ResearchWorkspacePanel
        open={researchPanelOpen}
        initialQuery={researchQuery}
        onClose={() => {
          setResearchPanelOpen(false);
          setResearchQuery('');
        }}
      />
      <BrowserFoundationPanel
        open={foundationOpen}
        initialTab={foundationTab}
        downloadUrl={foundationDownloadUrl}
        onClose={() => {
          setFoundationOpen(false);
          setFoundationDownloadUrl(undefined);
        }}
      />
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') closeTab(tab.id, e as unknown as React.MouseEvent);
                  }}
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
          <button
            type="button"
            title="Ask Regen AI (@query or Ctrl+K)"
            onClick={() => {
              setAiCollapsed(false);
              setChatInput('');
            }}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              background: `${ACCENT}22`,
              color: ACCENT,
              border: `1px solid ${ACCENT}44`,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✦ Ask Regen
          </button>
          <button
            type="button"
            title="Command palette (Ctrl+K)"
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              background: BG,
              color: '#f0eeea',
              border: `1px solid ${BORDER}`,
              cursor: 'pointer',
            }}
          >
            ⌘K
          </button>
          {isTauriShell() && (
            <button
              type="button"
              title="Selection actions (Ctrl+Shift+A)"
              onClick={() => void captureSelection()}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                background: BG,
                color: '#f0eeea',
                border: `1px solid ${BORDER}`,
                cursor: 'pointer',
              }}
            >
              Selection
            </button>
          )}
          {lastIntent && lastIntent.kind !== 'unknown' && (
            <span
              title={`Intent: ${lastIntent.label}`}
              style={{
                fontSize: 10,
                color: ACCENT,
                padding: '2px 8px',
                borderRadius: 4,
                background: `${ACCENT}18`,
              }}
            >
              {lastIntent.label}
            </span>
          )}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              type="button"
              title="More tools"
              onClick={() => setToolsMenuOpen((o) => !o)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 14,
                background: BG,
                color: '#f0eeea',
                border: `1px solid ${BORDER}`,
                cursor: 'pointer',
              }}
            >
              ⋮
            </button>
            {toolsMenuOpen && (
              <>
                <div
                  role="presentation"
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setToolsMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 4,
                    zIndex: 41,
                    minWidth: 180,
                    padding: 6,
                    borderRadius: 8,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 8px 24px #00000055',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      summarizeActivePage();
                      setToolsMenuOpen(false);
                    }}
                    disabled={browser.isNewTab}
                    style={menuBtnStyle}
                  >
                    ✦ Page summary
                  </button>
                  <button
                    type="button"
                    disabled={
                      browser.isNewTab ||
                      pageSummary.state.status === 'loading'
                    }
                    onClick={() => void downloadPageOverview()}
                    style={menuBtnStyle}
                  >
                    {pageSummary.state.status === 'loading'
                      ? '⏳ Generating overview…'
                      : '⬇ Generate overview → Downloads'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleBookmark();
                      setToolsMenuOpen(false);
                    }}
                    disabled={browser.isNewTab}
                    style={menuBtnStyle}
                  >
                    {isBookmarked ? '★ Remove bookmark' : '☆ Bookmark page'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidePanel((p) => (p === 'bookmarks' ? 'none' : 'bookmarks'));
                      setToolsMenuOpen(false);
                    }}
                    style={menuBtnStyle}
                  >
                    ⭐ Bookmarks ({bookmarks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidePanel((p) => (p === 'history' ? 'none' : 'history'));
                      setToolsMenuOpen(false);
                    }}
                    style={menuBtnStyle}
                  >
                    🕐 History
                  </button>
                  <button
                    type="button"
                    onClick={() => openFoundation('downloads')}
                    style={menuBtnStyle}
                  >
                    ⬇ Downloads
                  </button>
                  <button
                    type="button"
                    onClick={() => openFoundation('profiles')}
                    style={menuBtnStyle}
                  >
                    👤 Profiles ({activeProfile?.name ?? 'Personal'})
                  </button>
                  <button
                    type="button"
                    onClick={() => openFoundation('passwords')}
                    style={menuBtnStyle}
                  >
                    🔐 Passwords
                  </button>
                  <button
                    type="button"
                    onClick={() => openFoundation('extensions')}
                    style={menuBtnStyle}
                  >
                    🧩 Extensions
                  </button>
                  <button
                    type="button"
                    disabled={browser.isNewTab}
                    onClick={() => {
                      void toggleActiveTabDevTools(browser.activeTabId);
                      setToolsMenuOpen(false);
                    }}
                    style={menuBtnStyle}
                  >
                    ⌨ DevTools (Ctrl+Shift+I)
                  </button>
                  <button
                    type="button"
                    disabled={browser.isNewTab || !activeTab?.url}
                    onClick={() => {
                      if (activeTab?.url) {
                        void startBrowserDownload(activeTab.url);
                        openFoundation('downloads', activeTab.url);
                      }
                    }}
                    style={menuBtnStyle}
                  >
                    ⬇ Download this page
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 11, color: '#8a8884' }}>
                    Engine
                    <select
                      value={browseEngine}
                      onChange={(e) => setBrowseEngine(e.target.value as BrowseEngine)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        color: '#f0eeea',
                        fontSize: 11,
                      }}
                    >
                      <option value="auto">Auto</option>
                      {isTauriShell() && <option value="native">Native</option>}
                      <option value="iframe">Iframe</option>
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
        <BrowserNavBar
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          onNavigate={() => navigateTo(urlInput)}
          onBack={goBack}
          onForward={goForward}
          onReload={reloadPage}
          canGoBack={browser.canGoBack}
          canGoForward={browser.canGoForward}
          historyDisabled={browser.isNewTab}
        />
        {pageError && (
          <p style={{ fontSize: 12, color: '#e8c547', margin: 0 }}>⚠️ {pageError}</p>
        )}
      </div>

      {/* Main: browser (left) + avatar sidebar (right, always visible) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `minmax(0, 1fr) ${aiSidebarWidth}px`,
          overflow: 'hidden',
        }}
      >
        <div
          id="regen-browser-content-pane"
          data-browser-content-pane
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            background: BG,
          }}
        >
          <TabContentStack
            tabs={browser.tabs}
            activeTabId={browser.activeTabId}
            activeUrl={browser.activeUrl}
            isNewTab={browser.isNewTab}
            preferIframe={browseEngine === 'iframe'}
            onLoadFailed={handlePageError}
            onLoadEnd={handlePageLoaded}
            onUrlChange={(tabId, u) => browser.updateTab(tabId, { url: u })}
            onTitleChange={(tabId, t) => browser.updateTab(tabId, { title: t })}
            newTabPage={
              <NewTabPage
                onNavigate={navigateTo}
                searchValue={urlInput}
                onSearchChange={setUrlInput}
                recentSites={recentSites}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              />
            }
          />
          {sidePanel !== 'none' && (
            <aside
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 320,
                maxHeight: 'calc(100% - 16px)',
                overflowY: 'auto',
                background: '#0f1623f2',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                zIndex: 30,
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                padding: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  color: '#f0eeea',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span>{sidePanel === 'bookmarks' ? 'Bookmarks' : 'History'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSidePanel('none');
                    setSidePanelQuery('');
                  }}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    background: BG,
                    color: '#8a8884',
                    fontSize: 11,
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
              <input
                value={sidePanelQuery}
                onChange={(e) => setSidePanelQuery(e.target.value)}
                placeholder={`Search ${sidePanel === 'bookmarks' ? 'bookmarks' : 'history'}...`}
                style={{
                  width: '100%',
                  marginBottom: 8,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  color: '#f0eeea',
                  fontSize: 12,
                }}
              />
              {sidePanel === 'bookmarks' ? (
                filteredBookmarks.length ? (
                  filteredBookmarks
                    .slice()
                    .reverse()
                    .map((b) => (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 0',
                          borderTop: `1px solid ${BORDER}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openSavedUrl(b.url)}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#f0eeea',
                            fontSize: 12,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={b.url}
                        >
                          {b.title || b.url}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBookmark(b.id)}
                          style={{
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                            background: BG,
                            color: '#8a8884',
                            fontSize: 11,
                            padding: '2px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p style={{ fontSize: 12, color: '#8a8884', margin: 0 }}>
                    {normalizedPanelQuery ? 'No matching bookmarks.' : 'No bookmarks yet.'}
                  </p>
                )
              ) : filteredHistoryEntries.length ? (
                filteredHistoryEntries.map((h) => (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => openSavedUrl(h.url)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 0',
                      border: 'none',
                      borderTop: `1px solid ${BORDER}`,
                      background: 'transparent',
                      color: '#f0eeea',
                      fontSize: 12,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={h.url}
                  >
                    {h.title || h.url}
                  </button>
                ))
              ) : (
                <p style={{ fontSize: 12, color: '#8a8884', margin: 0 }}>
                  {normalizedPanelQuery ? 'No matching history entries.' : 'No history yet.'}
                </p>
              )}
            </aside>
          )}
          {activeTab?.isLoading && !browser.isNewTab && (
            <div
              aria-live="polite"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'rgba(15, 22, 35, 0.72)',
                zIndex: 40,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `3px solid ${BORDER}`,
                  borderTopColor: ACCENT,
                  animation: 'regen-spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: 13, color: '#8a8884' }}>Loading…</span>
            </div>
          )}
        </div>

        {/* Avatar sidebar — stays in main webview layer; native webview must not overlap (see webviewBounds) */}
        <aside
          id="regen-avatar-sidebar"
          data-regen-avatar-sidebar
          style={{
            width: aiSidebarWidth,
            minWidth: aiSidebarWidth,
            maxWidth: aiSidebarWidth,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: SURFACE,
            borderLeft: `2px solid ${ACCENT}33`,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.35)',
            position: 'relative',
            zIndex: 50,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}
        >
          <button
            type="button"
            title={aiCollapsed ? 'Expand AI panel' : 'Collapse AI panel'}
            onClick={toggleAiSidebar}
            style={{
              position: 'absolute',
              left: -12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 24,
              height: 48,
              borderRadius: '8px 0 0 8px',
              background: SURFACE,
              border: `1px solid ${ACCENT}44`,
              borderRight: 'none',
              color: ACCENT,
              cursor: 'pointer',
              zIndex: 51,
              fontSize: 12,
            }}
          >
            {aiCollapsed ? '‹' : '›'}
          </button>
          {aiCollapsed ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '12px 6px',
                gap: 12,
              }}
            >
              <AdaptiveAvatar emotion={avatarEmotion} size={40} variant="half" intensity={0.9} showLabel={false} />
              <button
                type="button"
                title="Ask Regen"
                onClick={() => setAiCollapsed(false)}
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: 10,
                  fontWeight: 600,
                  color: ACCENT,
                  background: `${ACCENT}18`,
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 6,
                  padding: '8px 4px',
                  cursor: 'pointer',
                }}
              >
                AI
              </button>
            </div>
          ) : (
            <>
          <div
            style={{
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <AdaptiveAvatar
              emotion={avatarEmotion}
              size={200}
              variant="half"
              intensity={1}
              showLabel
            />
            <AvatarModeToggle />
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
            {pageSummary.state.status === 'loading' && (
              <p style={{ color: ACCENT, marginBottom: 10, lineHeight: 1.4 }}>Summarizing this page…</p>
            )}
            {pageSummary.state.status === 'ready' && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${ACCENT}33`,
                  background: `${ACCENT}0c`,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: ACCENT,
                    margin: '0 0 6px',
                  }}
                >
                  Page summary
                </p>
                <p style={{ color: '#f0eeea', lineHeight: 1.45, margin: 0 }}>{pageSummary.state.summary}</p>
                <button
                  type="button"
                  onClick={() =>
                    void companion.sendMessage(
                      `Based on this page (${pageSummary.state.title}), expand on: ${pageSummary.state.summary.slice(0, 200)}`
                    )
                  }
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: ACCENT,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Ask follow-up
                </button>
              </div>
            )}
            {pageSummary.state.status === 'error' && (
              <p style={{ color: '#e8c547', marginBottom: 10, lineHeight: 1.4, fontSize: 11 }}>
                {pageSummary.state.message}
              </p>
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
              padding: '10px 12px',
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <button
              type="button"
              title="Voice"
              onClick={() =>
                companion.isListening ? companion.stopListening() : companion.startListening()
              }
              disabled={!companion.voiceSupported}
              style={{
                flex: 1,
                minWidth: 70,
                height: 32,
                borderRadius: 8,
                fontSize: 11,
                background: companion.isListening ? `${ACCENT}44` : BG,
                border: `1px solid ${BORDER}`,
                color: '#f0eeea',
                cursor: companion.voiceSupported ? 'pointer' : 'not-allowed',
              }}
            >
              {companion.isListening ? '🎙 Listening' : '🎙 Voice'}
            </button>
            <button
              type="button"
              title="Stop speaking"
              onClick={() => companion.stopSpeaking()}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                fontSize: 11,
                background: BG,
                border: `1px solid ${BORDER}`,
                color: '#8a8884',
                cursor: 'pointer',
              }}
            >
              Mute
            </button>
          </div>
          <div
            style={{
              padding: '0 12px 12px',
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
            </>
          )}
        </aside>
      </div>

      {selection && (
        <PageSelectionMenu
          text={selection.text}
          anchor={selection.anchor}
          onAction={handleSelectionAction}
          onClose={closeSelection}
        />
      )}

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
        {lastIntent && lastIntent.kind !== 'unknown' && (
          <span title="Last detected intent">intent: {lastIntent.label}</span>
        )}
        {pageSummary.state.status === 'ready' && (
          <span title="Auto page summary ready">summary ready</span>
        )}
        {activeTab?.isLoading && !browser.isNewTab && (
          <span style={{ color: ACCENT }}>loading</span>
        )}
        {!browser.isNewTab && (
          <span title="History navigation">
            {browser.canGoBack ? '◀' : '·'} {browser.canGoForward ? '▶' : '·'}
          </span>
        )}
        {avatarAuto.memoryPercent > 0 && (
          <span title="JS heap vs 500MB budget">mem {avatarAuto.memoryPercent.toFixed(0)}%</span>
        )}
        <span>
          {browser.tabs.length} tab{browser.tabs.length === 1 ? '' : 's'}
          {' · '}
          {browseEngine === 'iframe'
            ? 'iframe'
            : browseEngine === 'native'
              ? 'native'
              : isTauriShell()
                ? 'auto'
                : 'web'}
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
