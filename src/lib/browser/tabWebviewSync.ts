/**
 * Sync Tauri native tab webviews with tabsStore — one OS webview per tab.
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauriShell } from '../tauri/runtime';
import { preferIframeBrowser } from './preferIframe';
import { useBrowseEngineStore } from './browseEngineStore';
import {
  webviewBoundsFromDom,
  getShellChromeBottomPx,
  getRegenSidebarWidthPx,
  isPaneBoundsReady,
} from './webviewBounds';
import { isNewTabUrl } from './normalizeUrl';
import { resolveBrowseUrl } from './resolveBrowseUrl';
import { withBrowseProfile } from './browserWebviewInvoke';

const STATUS_BAR_H = 26;

/** Native IPC must not run in iframe-only mode (avoids WebviewWindow errors). */
export function shouldRunNativeWebviewCommands(): boolean {
  if (!isTauriShell()) return false;
  if (preferIframeBrowser()) return false;
  const engine = useBrowseEngineStore.getState().engine;
  return engine === 'native' || engine === 'auto';
}

async function applyBounds(tabId: string, rect: ReturnType<typeof webviewBoundsFromDom>): Promise<void> {
  try {
    await invoke('browser_webview_set_bounds', withBrowseProfile({ tabId, rect }));
  } catch {
    await invoke(
      'browser_webview_fit_pane',
      withBrowseProfile({
        tabId,
        sidebarWidth: getRegenSidebarWidthPx(),
        chromeBottom: getShellChromeBottomPx(),
        statusBarHeight: STATUS_BAR_H,
      })
    );
  }
}

async function upsertTabWebview(
  tabId: string,
  url: string,
  activate: boolean
): Promise<void> {
  const rect = webviewBoundsFromDom();
  const browseUrl = resolveBrowseUrl(url);

  try {
    await invoke(
      'browser_webview_upsert',
      withBrowseProfile({ tabId, url: browseUrl, rect, activate })
    );
  } catch (e) {
    console.error('[tabWebviewSync] upsert failed:', e, { tabId, url: browseUrl, activate });
    const fitRect = await invoke<{ width: number; height: number; x: number; y: number }>(
      'browser_webview_fit_pane',
      withBrowseProfile({
        tabId,
        sidebarWidth: getRegenSidebarWidthPx(),
        chromeBottom: getShellChromeBottomPx(),
        statusBarHeight: STATUS_BAR_H,
      })
    ).catch(() => null);
    if (!fitRect) {
      useBrowseEngineStore.getState().setNativeFailed(tabId, true);
      throw e;
    }
    await invoke(
      'browser_webview_upsert',
      withBrowseProfile({
        tabId,
        url: browseUrl,
        rect: fitRect,
        activate,
      })
    );
  }
}

/** Push bounds several times while layout settles (fixes corner-sized webview). */
export async function syncTabWebviewBounds(tabId: string): Promise<void> {
  if (!shouldRunNativeWebviewCommands()) return;

  const delays = [0, 50, 150, 400, 1000];
  for (const ms of delays) {
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    const rect = webviewBoundsFromDom();
    if (!isPaneBoundsReady(rect) && ms < 400) continue;
    await applyBounds(tabId, rect).catch(() => {});
  }
}

/** Create/update a tab webview hidden (other tabs unchanged). */
export async function preloadTabWebview(tabId: string, url: string): Promise<void> {
  if (!shouldRunNativeWebviewCommands() || !tabId || isNewTabUrl(url)) return;
  await upsertTabWebview(tabId, url, false);
}

let activateQueue: Promise<void> = Promise.resolve();

function enqueueActivate(fn: () => Promise<void>): Promise<void> {
  const next = activateQueue.then(fn, fn);
  activateQueue = next.catch(() => {});
  return next;
}

/** Show one tab's webview and hide all others. */
export async function activateTabWebview(
  tabId: string | null,
  url?: string
): Promise<void> {
  return enqueueActivate(async () => {
    if (!shouldRunNativeWebviewCommands() || !tabId) return;

    if (!url || isNewTabUrl(url)) {
      await invoke('browser_webview_hide_all_except', withBrowseProfile({ tabId: null })).catch(
        () => {}
      );
      return;
    }

    await upsertTabWebview(tabId, url, true);
    await syncTabWebviewBounds(tabId);
  });
}

/** Navigate active tab (upsert + show + bounds). Uses the same queue as tab switching. */
export async function syncActiveTabWebview(
  tabId: string | null,
  url: string | undefined
): Promise<void> {
  return activateTabWebview(tabId, url);
}

export async function hideAllTabWebviews(): Promise<void> {
  if (!shouldRunNativeWebviewCommands()) return;
  await invoke('browser_webview_hide_all_except', withBrowseProfile({ tabId: null })).catch(
    () => {}
  );
}

export async function closeTabWebview(tabId: string): Promise<void> {
  if (!shouldRunNativeWebviewCommands()) return;
  await invoke('browser_webview_close', withBrowseProfile({ tabId })).catch(() => {});
}

export async function closeAllTabWebviews(): Promise<void> {
  if (!shouldRunNativeWebviewCommands()) return;
  await invoke('browser_webview_close_all').catch(() => {});
}
