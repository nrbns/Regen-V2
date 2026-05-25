/**
 * BrowserView — Tauri: native webview (Google, GitHub, etc.). Web / fallback: iframe (no sandbox).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { isTauriShell } from '../../lib/tauri/runtime';
import { preferIframeBrowser } from '../../lib/browser/preferIframe';
import { resolveBrowseUrl } from '../../lib/browser/resolveBrowseUrl';
import { setCompanionEmotion } from '../../lib/companion/avatarBridge';
import { eventBus } from '../../lib/events/EventBus';
import { NativeWebView } from './NativeWebView';
import { IframeBrowsePane } from './IframeBrowsePane';

interface BrowserViewProps {
  tabId?: string;
  url?: string;
  mode?: 'browse' | 'research' | 'trade';
  className?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadFailed?: (message: string) => void;
  onLoadEnd?: () => void;
  /** Force iframe instead of Tauri native webview (testing). */
  preferIframe?: boolean;
  /** When false, native webview is hidden (multi-tab stack). */
  visible?: boolean;
}

export { resolveBrowseUrl } from '../../lib/browser/resolveBrowseUrl';

export function nativeWebviewUrl(url: string | undefined | null): string {
  return resolveBrowseUrl(url);
}

export default function BrowserView({
  tabId,
  url,
  mode: _mode = 'browse',
  className = 'w-full h-full min-h-0',
  onUrlChange,
  onTitleChange,
  onLoadFailed,
  onLoadEnd,
  preferIframe: preferIframeProp,
  visible = true,
}: BrowserViewProps) {
  const [nativeFailed, setNativeFailed] = useState(false);
  const updateTab = useTabsStore((s) => s.updateTab);

  const activeTab = useTabsStore((state) => {
    if (tabId) return state.tabs.find((t) => t.id === tabId) ?? null;
    if (state.activeTabId) return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    return state.tabs[0] ?? null;
  });

  const displayUrl = activeTab?.url || url || '';
  const displayTabId = tabId || activeTab?.id || 'default';
  const browseUrl = resolveBrowseUrl(displayUrl);
  const iframeSrc = browseUrl === 'about:blank' ? 'https://www.google.com/' : browseUrl;
  const inTauri = isTauriShell();
  const forceIframe = preferIframeProp ?? preferIframeBrowser();
  const useNative =
    inTauri && !forceIframe && !nativeFailed && /^https?:\/\//i.test(iframeSrc);

  useEffect(() => {
    setNativeFailed(false);
  }, [iframeSrc, displayTabId]);

  const handleNativeLoadStart = useCallback(() => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    if (!tab?.isLoading) {
      updateTab(displayTabId, { isLoading: true });
    }
    setCompanionEmotion('thinking');
  }, [displayTabId, updateTab]);

  const handleNativeLoadEnd = useCallback(() => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    if (tab?.isLoading) {
      updateTab(displayTabId, { isLoading: false });
    }
    setCompanionEmotion('happy', { revertMs: 2000, revertTo: 'idle' });
    eventBus.emit('PAGE_LOAD', { url: tab?.url, title: tab?.title, tabId: displayTabId }, 'browser');
    onLoadEnd?.();
  }, [displayTabId, updateTab, onLoadEnd]);

  const handleNativeFailed = useCallback(() => {
    setNativeFailed(true);
    updateTab(displayTabId, { isLoading: false });
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    eventBus.emit(
      'PAGE_ERROR',
      { url: tab?.url, error: 'Native webview failed', tabId: displayTabId },
      'browser'
    );
    onLoadFailed?.('Native webview failed — trying iframe…');
  }, [displayTabId, updateTab, onLoadFailed]);

  const handleIframeFailed = useCallback(
    (message: string) => {
      updateTab(displayTabId, { isLoading: false });
      setCompanionEmotion('noticing', { revertMs: 3000, revertTo: 'idle' });
      const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
      eventBus.emit('PAGE_ERROR', { url: tab?.url, error: message, tabId: displayTabId }, 'browser');
      onLoadFailed?.(message);
    },
    [displayTabId, updateTab, onLoadFailed]
  );

  const handleIframeLoadStart = useCallback(() => {
    updateTab(displayTabId, { isLoading: true });
    setCompanionEmotion('thinking');
  }, [displayTabId, updateTab]);

  const handleIframeLoadEnd = useCallback(() => {
    updateTab(displayTabId, { isLoading: false });
    setCompanionEmotion('happy', { revertMs: 2000, revertTo: 'idle' });
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    eventBus.emit('PAGE_LOAD', { url: tab?.url, title: tab?.title, tabId: displayTabId }, 'browser');
    onLoadEnd?.();
  }, [displayTabId, updateTab, onLoadEnd]);

  if (useNative) {
    return (
      <NativeWebView
        tabId={displayTabId}
        url={iframeSrc}
        className={className}
        visible={visible}
        onLoadStart={handleNativeLoadStart}
        onLoadEnd={handleNativeLoadEnd}
        onFailed={handleNativeFailed}
      />
    );
  }

  return (
    <IframeBrowsePane
      tabId={displayTabId}
      src={iframeSrc}
      className={className}
      onLoadStart={handleIframeLoadStart}
      onLoadEnd={handleIframeLoadEnd}
      onLoadFailed={handleIframeFailed}
      onUrlChange={onUrlChange}
    />
  );
}
