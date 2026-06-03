import { useCallback, useEffect } from 'react';
import { useTabsStore } from '../state/tabsStore';
import { normalizeUrl, isNewTabUrl, displayUrlBar, NEWTAB } from '../lib/browser/normalizeUrl';
import { isTauriShell } from '../lib/tauri/runtime';
import { preferIframeBrowser } from '../lib/browser/preferIframe';
import { useBrowseEngineStore } from '../lib/browser/browseEngineStore';
import {
  syncActiveTabWebview,
  activateTabWebview,
  hideAllTabWebviews,
  closeTabWebview,
  closeAllTabWebviews,
  shouldRunNativeWebviewCommands,
} from '../lib/browser/tabWebviewSync';
import { clearPageSnippet } from '../lib/browser/pageContextStore';
import { useExecutionStore } from '../state/executionStore';
import { eventBus } from '../lib/events/EventBus';
import { useTabHistoryStore } from '../lib/browser/tabHistoryStore';
import { reloadTabWebview, goBackTabWebview, goForwardTabWebview } from '../lib/browser/tabWebviewNav';
import { fetchNativePageState } from '../lib/browser/nativePageSync';
import { scheduleLoadingWatchdog, cancelLoadingWatchdog } from '../lib/browser/loadingWatchdog';
import { subscribeNativePageSync } from '../lib/browser/nativePageSync';

const MAX_TABS = 12;

/** Real tabs + navigation for RegenBrowserShell */
export function useShellBrowser() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const addTabStore = useTabsStore((s) => s.addTab);
  const closeTabStore = useTabsStore((s) => s.closeTab);
  const switchTabStore = useTabsStore((s) => s.switchTab);
  const navigateTab = useTabsStore((s) => s.navigateTab);
  const updateTab = useTabsStore((s) => s.updateTab);
  const connected = useExecutionStore((s) => s.connected);
  const isRunning = useExecutionStore((s) => s.isRunning);

  const canGoBack = useTabHistoryStore((s) =>
    activeTabId ? s.canGoBack(activeTabId) : false
  );
  const canGoForward = useTabHistoryStore((s) =>
    activeTabId ? s.canGoForward(activeTabId) : false
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeUrl = activeTab?.url ?? '';
  const isNewTab = isNewTabUrl(activeUrl);

  useEffect(() => {
    if (isTauriShell() && !preferIframeBrowser()) {
      const { engine, setEngine } = useBrowseEngineStore.getState();
      if (engine !== 'native') setEngine('native');
    }
  }, []);

  useEffect(() => {
    if (tabs.length === 0) {
      addTabStore(NEWTAB);
      return;
    }
    if (activeTabId && !tabs.some((t) => t.id === activeTabId)) {
      switchTabStore(tabs[0].id);
    }
  }, [tabs, activeTabId, addTabStore, switchTabStore]);

  useEffect(() => {
    for (const tab of tabs) {
      useTabHistoryStore.getState().ensureTab(tab.id, tab.url);
    }
  }, [tabs]);

  const applyUrl = useCallback(
    (
      tabId: string,
      url: string,
      options?: { recordHistory?: boolean; syncWebview?: boolean; showLoading?: boolean }
    ) => {
      const recordHistory = options?.recordHistory !== false;
      const syncWebview = options?.syncWebview !== false;
      const showLoading = options?.showLoading !== false;

      if (isNewTabUrl(url)) {
        updateTab(tabId, { url: NEWTAB, title: 'New Tab', isLoading: false });
        void hideAllTabWebviews();
        return '';
      }

      if (showLoading) {
        navigateTab(tabId, url);
      } else {
        updateTab(tabId, { url, isLoading: false });
      }
      if (recordHistory) {
        useTabHistoryStore.getState().push(tabId, url);
      }
      eventBus.emit('NAVIGATE', { tabId, url }, 'shell');
      if (showLoading) {
        scheduleLoadingWatchdog(tabId, () => {
          updateTab(tabId, { isLoading: false });
        });
      }
      if (syncWebview && shouldRunNativeWebviewCommands()) {
        const runSync = () => void syncActiveTabWebview(tabId, url);
        const schedule =
          typeof requestAnimationFrame === 'function'
            ? () => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    window.setTimeout(runSync, 50);
                  });
                });
              }
            : runSync;
        schedule();
      }
      return displayUrlBar(url);
    },
    [navigateTab, updateTab]
  );

  const navigate = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return '';
      const url = normalizeUrl(trimmed, { embeddedSearch: !isTauriShell() });
      const tabId = useTabsStore.getState().activeTabId;
      if (!tabId) {
        addTabStore(isNewTabUrl(url) ? NEWTAB : url);
        const newId = useTabsStore.getState().activeTabId;
        if (newId && !isNewTabUrl(url)) {
          useTabHistoryStore.getState().ensureTab(newId, url);
          useTabHistoryStore.getState().push(newId, url);
          if (shouldRunNativeWebviewCommands()) void syncActiveTabWebview(newId, url);
        } else if (shouldRunNativeWebviewCommands()) {
          void hideAllTabWebviews();
        }
        return displayUrlBar(url);
      }
      return applyUrl(tabId, url);
    },
    [addTabStore, applyUrl]
  );

  const goBack = useCallback(async () => {
    const tabId = useTabsStore.getState().activeTabId;
    if (!tabId) return null;
    cancelLoadingWatchdog(tabId);

    if (shouldRunNativeWebviewCommands()) {
      await goBackTabWebview(tabId);
      await new Promise((r) => setTimeout(r, 120));
      const detail = await fetchNativePageState(tabId);
      if (detail) {
        useTabHistoryStore.getState().alignIndex(tabId, detail.url);
        return displayUrlBar(detail.url);
      }
      return null;
    }

    const entry = useTabHistoryStore.getState().back(tabId);
    if (!entry) return null;
    return applyUrl(tabId, entry.url, { recordHistory: false, showLoading: false });
  }, [applyUrl]);

  const goForward = useCallback(async () => {
    const tabId = useTabsStore.getState().activeTabId;
    if (!tabId) return null;
    cancelLoadingWatchdog(tabId);

    if (shouldRunNativeWebviewCommands()) {
      await goForwardTabWebview(tabId);
      await new Promise((r) => setTimeout(r, 120));
      const detail = await fetchNativePageState(tabId);
      if (detail) {
        useTabHistoryStore.getState().alignIndex(tabId, detail.url);
        return displayUrlBar(detail.url);
      }
      return null;
    }

    const entry = useTabHistoryStore.getState().forward(tabId);
    if (!entry) return null;
    return applyUrl(tabId, entry.url, { recordHistory: false, showLoading: false });
  }, [applyUrl]);

  const reload = useCallback(() => {
    const tabId = useTabsStore.getState().activeTabId;
    if (!tabId || isNewTabUrl(useTabsStore.getState().tabs.find((t) => t.id === tabId)?.url)) {
      return;
    }
    const url = useTabsStore.getState().tabs.find((t) => t.id === tabId)?.url ?? '';
    updateTab(tabId, { isLoading: true });
    scheduleLoadingWatchdog(tabId, () => {
      updateTab(tabId, { isLoading: false });
    });
    void reloadTabWebview(tabId, url);
  }, [updateTab]);

  const addTab = useCallback(
    (url?: string) => {
      if (tabs.length >= MAX_TABS) return;
      const target = url && !isNewTabUrl(url) ? url : NEWTAB;
      addTabStore(target);
      const newId = useTabsStore.getState().activeTabId;
      if (!newId) return;
      updateTab(newId, { isLoading: false, title: 'New Tab' });
      cancelLoadingWatchdog(newId);
      if (!isNewTabUrl(target)) {
        useTabHistoryStore.getState().ensureTab(newId, target);
        useTabHistoryStore.getState().push(newId, target);
      }
    },
    [addTabStore, tabs.length, updateTab]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      useTabHistoryStore.getState().removeTab(tabId);
      if (tabs.length <= 1) {
        updateTab(tabId, { url: NEWTAB, title: 'New Tab', isLoading: false });
        void hideAllTabWebviews();
        return;
      }
      void closeTabWebview(tabId);
      clearPageSnippet(tabId);
      closeTabStore(tabId);
      const st = useTabsStore.getState();
      const next = st.tabs.find((t) => t.id === st.activeTabId);
      if (st.activeTabId && next && !isNewTabUrl(next.url)) {
        void activateTabWebview(st.activeTabId, next.url);
      } else {
        void hideAllTabWebviews();
      }
    },
    [closeTabStore, tabs.length, updateTab]
  );

  const switchTab = useCallback(
    (tabId: string) => {
      const exists = useTabsStore.getState().tabs.some((t) => t.id === tabId);
      if (!exists) return;

      const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
      if (tab) {
        window.dispatchEvent(
          new CustomEvent('regen:tab-activated', {
            detail: { tabId, url: tab.url },
          })
        );
      }

      switchTabStore(tabId);
      eventBus.emit('TAB_SWITCH', { tabId }, 'shell');
      cancelLoadingWatchdog(tabId);
      if (tab) {
        updateTab(tabId, { isLoading: false });
      }
    },
    [switchTabStore, updateTab]
  );

  const duplicateTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || tabs.length >= MAX_TABS) return;
      addTabStore(tab.url);
      if (!isNewTabUrl(tab.url)) {
        const newId = useTabsStore.getState().activeTabId;
        if (newId) {
          updateTab(newId, { title: `${tab.title} (copy)` });
          useTabHistoryStore.getState().ensureTab(newId, tab.url);
          useTabHistoryStore.getState().push(newId, tab.url);
          void syncActiveTabWebview(newId, tab.url);
        }
      }
    },
    [tabs, addTabStore, updateTab]
  );

  useEffect(() => subscribeNativePageSync(), []);

  useEffect(() => {
    const onProfileChange = () => {
      void closeAllTabWebviews().then(() => {
        const st = useTabsStore.getState();
        const tab = st.tabs.find((t) => t.id === st.activeTabId);
        if (tab && shouldRunNativeWebviewCommands() && !isNewTabUrl(tab.url)) {
          void activateTabWebview(st.activeTabId, tab.url);
        }
      });
    };
    window.addEventListener('regen:profile-changed', onProfileChange);
    return () => window.removeEventListener('regen:profile-changed', onProfileChange);
  }, []);

  useEffect(() => {
    const onRetry = (e: Event) => {
      const { tabId, url } = (e as CustomEvent<{ tabId: string; url: string }>).detail;
      if (tabId && url) void syncActiveTabWebview(tabId, url);
    };
    window.addEventListener('regen:retry-native-tab', onRetry);
    return () => window.removeEventListener('regen:retry-native-tab', onRetry);
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    activeUrl,
    isNewTab,
    maxTabs: MAX_TABS,
    connected,
    isRunning,
    canGoBack,
    canGoForward,
    navigate,
    goBack,
    goForward,
    reload,
    addTab,
    closeTab,
    switchTab,
    duplicateTab,
    updateTab,
  };
}
