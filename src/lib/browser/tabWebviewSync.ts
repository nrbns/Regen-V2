/**
 * Sync Tauri native tab webviews with tabsStore active tab.
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauriShell } from '../tauri/runtime';
import { webviewBoundsFromDom } from './webviewBounds';
import { isNewTabUrl } from './normalizeUrl';
import { resolveBrowseUrl } from './resolveBrowseUrl';

export async function syncActiveTabWebview(
  tabId: string | null,
  url: string | undefined
): Promise<void> {
  if (!isTauriShell() || !tabId) return;

  if (!url || isNewTabUrl(url)) {
    await invoke('browser_webview_hide_all_except', { tabId: null }).catch(() => {});
    return;
  }

  const rect = webviewBoundsFromDom();
  const browseUrl = resolveBrowseUrl(url);

  await invoke('browser_webview_hide_all_except', { tabId }).catch(() => {});
  await invoke('browser_webview_upsert', { tabId, url: browseUrl, rect }).catch(() => {});
  await invoke('browser_webview_set_visible', { tabId, visible: true }).catch(() => {});
}

export async function hideAllTabWebviews(): Promise<void> {
  if (!isTauriShell()) return;
  await invoke('browser_webview_hide_all_except', { tabId: null }).catch(() => {});
}

export async function closeTabWebview(tabId: string): Promise<void> {
  if (!isTauriShell()) return;
  await invoke('browser_webview_close', { tabId }).catch(() => {});
}
