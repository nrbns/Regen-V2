/**
 * Keeps tabsStore + URL bar aligned with Tauri native webview URL/title.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauriShell } from '../tauri/runtime';
import { shouldRunNativeWebviewCommands } from './tabWebviewSync';
import { useTabsStore } from '../../state/tabsStore';
import { isNewTabUrl } from './normalizeUrl';
import { useTabHistoryStore } from './tabHistoryStore';
import { cancelLoadingWatchdog } from './loadingWatchdog';
import { fetchNativePageSnippet } from './fetchPageSnippet';
import { withBrowseProfile } from './browserWebviewInvoke';

export type PageSyncDetail = {
  tabId: string;
  url: string;
  title: string;
};

function dispatchPageSync(detail: PageSyncDetail) {
  window.dispatchEvent(new CustomEvent('regen:page-sync', { detail }));
}

/** Apply webview-reported URL/title to tabsStore (source of truth = webview). */
export function applyNativePageState(
  tabId: string,
  url: string,
  title: string,
  options?: { recordHistory?: boolean }
): void {
  const trimmedUrl = url?.trim();
  if (!tabId || !trimmedUrl || isNewTabUrl(trimmedUrl)) return;

  const store = useTabsStore.getState();
  const tab = store.tabs.find((t) => t.id === tabId);
  if (!tab) return;

  const recordHistory = options?.recordHistory !== false;
  const urlChanged = tab.url !== trimmedUrl;
  const nextTitle =
    title?.trim() ||
    (tab.title && tab.title !== 'New Tab' ? tab.title : trimmedUrl);

  cancelLoadingWatchdog(tabId);
  store.updateTab(tabId, {
    url: trimmedUrl,
    title: nextTitle,
    isLoading: false,
  });

  if (urlChanged && recordHistory) {
    const history = useTabHistoryStore.getState();
    const current = history.current(tabId);
    if (!current || current.url !== trimmedUrl) {
      history.push(tabId, trimmedUrl);
    }
  }

  dispatchPageSync({ tabId, url: trimmedUrl, title: nextTitle });
}

/** Read OS webview state for a tab (after tab switch / upsert). */
export async function fetchNativePageState(
  tabId: string
): Promise<PageSyncDetail | null> {
  if (!shouldRunNativeWebviewCommands() || !tabId) return null;
  try {
    const state = await invoke<{ tabId?: string; tab_id?: string; url: string; title: string }>(
      'browser_webview_get_page_state',
      withBrowseProfile({ tabId })
    );
    const url = state.url?.trim();
    if (!url || isNewTabUrl(url)) return null;
    const detail: PageSyncDetail = {
      tabId,
      url,
      title: state.title?.trim() || url,
    };
    applyNativePageState(detail.tabId, detail.url, detail.title, { recordHistory: false });
    useTabHistoryStore.getState().alignIndex(detail.tabId, detail.url);
    return detail;
  } catch {
    return null;
  }
}

/** Subscribe to browser://did-navigate and browser://page-loaded from Rust. */
export function subscribeNativePageSync(): () => void {
  if (!isTauriShell()) return () => {};

  const unsubs: UnlistenFn[] = [];
  let cancelled = false;

  const attach = async (eventName: string) => {
    const fn = await listen<{
      tab_id?: string;
      tabId?: string;
      url?: string;
      title?: string;
    }>(eventName, (event) => {
      const tabId = event.payload.tab_id ?? event.payload.tabId;
      const url = event.payload.url?.trim();
      const title = event.payload.title?.trim() ?? '';
      if (!tabId || !url || isNewTabUrl(url)) return;
      if (!shouldRunNativeWebviewCommands()) return;
      applyNativePageState(tabId, url, title);
      if (eventName === 'browser://page-loaded') {
        void fetchNativePageSnippet(tabId);
      }
    });
    if (cancelled) {
      fn();
      return;
    }
    unsubs.push(fn);
  };

  void attach('browser://did-navigate');
  void attach('browser://page-loaded');

  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}
