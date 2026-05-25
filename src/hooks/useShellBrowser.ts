import { useCallback, useEffect } from 'react';
import { useTabsStore } from '../state/tabsStore';
import { normalizeUrl, isNewTabUrl, displayUrlBar, NEWTAB } from '../lib/browser/normalizeUrl';
import { isTauriShell } from '../lib/tauri/runtime';
import {
  syncActiveTabWebview,
  hideAllTabWebviews,
  closeTabWebview,
} from '../lib/browser/tabWebviewSync';
import { clearPageSnippet } from '../lib/browser/pageContextStore';
import { useExecutionStore } from '../state/executionStore';
import { eventBus } from '../lib/events/EventBus';

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

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeUrl = activeTab?.url ?? '';
  const isNewTab = isNewTabUrl(activeUrl);

  useEffect(() => {
    if (tabs.length === 0) {
      addTabStore(NEWTAB);
      return;
    }
    if (activeTabId && !tabs.some((t) => t.id === activeTabId)) {
      switchTabStore(tabs[0].id);
    }
  }, [tabs, activeTabId, addTabStore, switchTabStore]);

  const navigate = useCallback(
    (input: string) => {
      const url = normalizeUrl(input, { embeddedSearch: !isTauriShell() });
      const tabId = useTabsStore.getState().activeTabId;
      if (!tabId) {
        addTabStore(isNewTabUrl(url) ? NEWTAB : url);
        return displayUrlBar(url);
      }
      if (isNewTabUrl(url)) {
        updateTab(tabId, { url: NEWTAB, title: 'New Tab', isLoading: false });
        void hideAllTabWebviews();
        return '';
      }
      navigateTab(tabId, url);
      eventBus.emit('NAVIGATE', { tabId, url }, 'shell');
      if (isTauriShell()) {
        void syncActiveTabWebview(tabId, url);
      }
      return displayUrlBar(url);
    },
    [addTabStore, navigateTab, updateTab]
  );

  const addTab = useCallback(
    (url?: string) => {
      if (tabs.length >= MAX_TABS) return;
      addTabStore(url && !isNewTabUrl(url) ? url : NEWTAB);
      void hideAllTabWebviews();
    },
    [addTabStore, tabs.length]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) {
        updateTab(tabId, { url: NEWTAB, title: 'New Tab', isLoading: false });
        void hideAllTabWebviews();
        return;
      }
      void closeTabWebview(tabId);
      clearPageSnippet(tabId);
      closeTabStore(tabId);
      const st = useTabsStore.getState();
      if (st.activeTabId && !isNewTabUrl(st.tabs.find((t) => t.id === st.activeTabId)?.url ?? '')) {
        void syncActiveTabWebview(st.activeTabId, st.tabs.find((t) => t.id === st.activeTabId)?.url);
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
      switchTabStore(tabId);
      eventBus.emit('TAB_SWITCH', { tabId }, 'shell');
      const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
      void syncActiveTabWebview(tabId, tab?.url);
    },
    [switchTabStore]
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
          void syncActiveTabWebview(newId, tab.url);
        }
      }
    },
    [tabs, addTabStore, updateTab]
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    activeUrl,
    isNewTab,
    maxTabs: MAX_TABS,
    connected,
    isRunning,
    navigate,
    addTab,
    closeTab,
    switchTab,
    duplicateTab,
    updateTab,
  };
}
