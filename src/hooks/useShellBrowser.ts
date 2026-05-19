import { useCallback, useEffect } from 'react';
import { useTabsStore } from '../state/tabsStore';
import { normalizeUrl, isNewTabUrl, displayUrlBar } from '../lib/browser/normalizeUrl';
import { useExecutionStore } from '../state/executionStore';

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
      addTabStore('');
    }
  }, [tabs.length, addTabStore]);

  const navigate = useCallback(
    (input: string) => {
      const url = normalizeUrl(input);
      const tabId = useTabsStore.getState().activeTabId;
      if (!tabId) {
        addTabStore(isNewTabUrl(url) ? '' : url);
        return displayUrlBar(url);
      }
      if (isNewTabUrl(url)) {
        updateTab(tabId, { url: '', title: 'New Tab', isLoading: false });
        return '';
      }
      navigateTab(tabId, url);
      return displayUrlBar(url);
    },
    [addTabStore, navigateTab, updateTab]
  );

  const addTab = useCallback(() => {
    addTabStore('');
  }, [addTabStore]);

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      closeTabStore(tabId);
    },
    [closeTabStore, tabs.length]
  );

  const switchTab = useCallback(
    (tabId: string) => {
      switchTabStore(tabId);
    },
    [switchTabStore]
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    activeUrl,
    isNewTab,
    connected,
    isRunning,
    navigate,
    addTab,
    closeTab,
    switchTab,
    updateTab,
  };
}
