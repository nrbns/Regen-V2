/**
 * Native tab webview navigation (back / forward / reload).
 */

import { invoke } from '@tauri-apps/api/core';
import { withBrowseProfile } from './browserWebviewInvoke';
import { isTauriShell } from '../tauri/runtime';
import { syncActiveTabWebview, shouldRunNativeWebviewCommands } from './tabWebviewSync';

export async function reloadTabWebview(tabId: string, url: string): Promise<void> {
  if (!shouldRunNativeWebviewCommands()) {
    window.location.reload();
    return;
  }
  try {
    await invoke('browser_webview_reload', withBrowseProfile({ tabId }));
  } catch {
    await syncActiveTabWebview(tabId, url);
  }
}

export async function goBackTabWebview(tabId: string): Promise<boolean> {
  if (!shouldRunNativeWebviewCommands()) {
    window.history.back();
    return true;
  }
  try {
    await invoke('browser_webview_go_back', withBrowseProfile({ tabId }));
    return true;
  } catch {
    return false;
  }
}

export async function goForwardTabWebview(tabId: string): Promise<boolean> {
  if (!shouldRunNativeWebviewCommands()) {
    window.history.forward();
    return true;
  }
  try {
    await invoke('browser_webview_go_forward', withBrowseProfile({ tabId }));
    return true;
  } catch {
    return false;
  }
}
