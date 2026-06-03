/**
 * BrowserView — Tauri: native webview with auto-fallback to permissive sandbox iframe.
 */

import { useCallback, useEffect } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { isTauriShell } from '../../lib/tauri/runtime';
import { useBrowseEngineStore } from '../../lib/browser/browseEngineStore';
import { preferIframeBrowser } from '../../lib/browser/preferIframe';
import { resolveBrowseUrl } from '../../lib/browser/resolveBrowseUrl';
import { setCompanionEmotion } from '../../lib/companion/avatarBridge';
import { eventBus } from '../../lib/events/EventBus';
import { hideAllTabWebviews } from '../../lib/browser/tabWebviewSync';
import { requiresNativeBrowser } from '../../lib/browser/iframeHosts';
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
  preferIframe?: boolean;
  isTabActive?: boolean;
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
  isTabActive = true,
}: BrowserViewProps) {
  const updateTab = useTabsStore((s) => s.updateTab);
  const engine = useBrowseEngineStore((s) => s.engine);

  const activeTab = useTabsStore((state) => {
    if (tabId) return state.tabs.find((t) => t.id === tabId) ?? null;
    if (state.activeTabId) return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    return state.tabs[0] ?? null;
  });

  const displayTabId = tabId || activeTab?.id || 'default';
  const displayUrl = url || activeTab?.url || '';
  const browseUrl = resolveBrowseUrl(displayUrl);
  const iframeSrc = browseUrl === 'about:blank' ? 'https://www.google.com/' : browseUrl;
  const inTauri = isTauriShell();
  const mustUseNative = inTauri && requiresNativeBrowser(iframeSrc);
  const useIframe = useBrowseEngineStore((s) => {
    if (mustUseNative) return false;
    if (preferIframeProp || preferIframeBrowser()) return true;
    if (s.engine === 'iframe') return true;
    if (s.engine === 'native') return false;
    return !!s.nativeFailedByTab[displayTabId];
  });
  const nativeFailed = useBrowseEngineStore((s) => !!s.nativeFailedByTab[displayTabId]);
  const useNative =
    inTauri &&
    (mustUseNative || !useIframe) &&
    /^https?:\/\//i.test(iframeSrc) &&
    (engine === 'native' || engine === 'auto' || mustUseNative);

  useEffect(() => {
    if (!inTauri || !useIframe || !isTabActive) return;
    void hideAllTabWebviews();
  }, [inTauri, useIframe, isTabActive, displayTabId]);

  const handleNativeLoadStart = useCallback(() => {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    if (!tab?.isLoading) {
      updateTab(displayTabId, { isLoading: true });
    }
    setCompanionEmotion('thinking');
  }, [displayTabId, updateTab]);

  const handleNativeLoadEnd = useCallback(() => {
    useBrowseEngineStore.getState().clearNativeFailed(displayTabId);
    const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
    if (tab?.isLoading) {
      updateTab(displayTabId, { isLoading: false });
    }
    setCompanionEmotion('happy', { revertMs: 2000, revertTo: 'idle' });
    eventBus.emit('PAGE_LOAD', { url: tab?.url, title: tab?.title, tabId: displayTabId }, 'browser');
    onLoadEnd?.();
  }, [displayTabId, updateTab, onLoadEnd]);

  const handleNativeFailed = useCallback(
    (message?: string) => {
      updateTab(displayTabId, { isLoading: false });
      const tab = useTabsStore.getState().tabs.find((t) => t.id === displayTabId);
      const url = tab?.url ?? displayUrl;
      if (requiresNativeBrowser(url)) {
        eventBus.emit(
          'PAGE_ERROR',
          { url, error: 'Native browser required', tabId: displayTabId },
          'browser'
        );
        onLoadFailed?.(
          message ||
            'YouTube and Google require Native mode in Regen (not iframe). Open ⋮ menu → Engine → Native, then click Retry.'
        );
        return;
      }
      useBrowseEngineStore.getState().setNativeFailed(displayTabId, true);
      eventBus.emit(
        'PAGE_ERROR',
        { url: tab?.url, error: 'Native webview failed', tabId: displayTabId },
        'browser'
      );
      onLoadFailed?.(
        message ||
          'Native view failed — switched to iframe mode. Some sites may still block embedding.'
      );
    },
    [displayTabId, displayUrl, updateTab, onLoadFailed]
  );

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
        key={`native-${displayTabId}-${engine}`}
        tabId={displayTabId}
        url={iframeSrc}
        className={className}
        isTabActive={isTabActive}
        onLoadStart={handleNativeLoadStart}
        onLoadEnd={handleNativeLoadEnd}
        onFailed={handleNativeFailed}
      />
    );
  }

  if (!useIframe && inTauri) {
    return (
      <div className={`flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400 ${className}`}>
        Enter a valid https:// URL to browse.
      </div>
    );
  }

  return (
    <IframeBrowsePane
      key={`iframe-${displayTabId}-${nativeFailed ? 'fb' : 'ok'}`}
      tabId={displayTabId}
      src={iframeSrc}
      className={className}
      isTabActive={isTabActive}
      onLoadStart={handleIframeLoadStart}
      onLoadEnd={handleIframeLoadEnd}
      onLoadFailed={handleIframeFailed}
      onUrlChange={onUrlChange}
      allowNativeRetry={inTauri}
    />
  );
}
