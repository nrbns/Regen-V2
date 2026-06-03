/**
 * Iframe browser pane — permissive sandbox (all sites that allow embedding).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { isIframeBlockedHost } from '../../lib/browser/iframeHosts';
import { isTauriShell } from '../../lib/tauri/runtime';
import { openUrlInBrowser } from '../../lib/tauri/openUrl';
import { tryExtractIframeSnippet } from '../../lib/browser/fetchPageSnippet';
import { useBrowseEngineStore } from '../../lib/browser/browseEngineStore';
import { resolveBrowseUrl } from '../../lib/browser/resolveBrowseUrl';

const LOAD_TIMEOUT_MS = 20000;

const IFRAME_ALLOW =
  'fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access; accelerometer; encrypted-media; gyroscope; picture-in-picture';

export interface IframeBrowsePaneProps {
  tabId: string;
  src: string;
  className?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onLoadFailed?: (message: string) => void;
  onUrlChange?: (url: string) => void;
  /** Show "Try native" when embedded in Tauri */
  allowNativeRetry?: boolean;
  isTabActive?: boolean;
}

export function IframeBrowsePane({
  tabId,
  src,
  className = '',
  onLoadStart,
  onLoadEnd,
  onLoadFailed,
  onUrlChange,
  allowNativeRetry = false,
  isTabActive = true,
}: IframeBrowsePaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const onLoadFailedRef = useRef(onLoadFailed);
  const onUrlChangeRef = useRef(onUrlChange);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const likelyBlocked = isIframeBlockedHost(src);
  const iframeSrc = likelyBlocked ? 'about:blank' : src;
  const autoNativeAttempted = useRef(false);

  useEffect(() => {
    onLoadStartRef.current = onLoadStart;
    onLoadEndRef.current = onLoadEnd;
    onLoadFailedRef.current = onLoadFailed;
    onUrlChangeRef.current = onUrlChange;
  }, [onLoadStart, onLoadEnd, onLoadFailed, onUrlChange]);

  const clearLoadTimer = () => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  };

  const fail = useCallback(
    (message: string) => {
      clearLoadTimer();
      setIsLoading(false);
      setError(message);
      console.warn('[IframeBrowsePane]', message, src);
      onLoadFailedRef.current?.(message);
    },
    [src]
  );

  const markReady = useCallback(() => {
    clearLoadTimer();
    setIsLoading(false);
    setError(null);
    onLoadEndRef.current?.();
  }, []);

  const tryNative = useCallback(() => {
    useBrowseEngineStore.getState().setEngine('native');
    useBrowseEngineStore.getState().clearNativeFailed(tabId);
    window.dispatchEvent(
      new CustomEvent('regen:retry-native-tab', { detail: { tabId, url: src } })
    );
  }, [tabId, src]);

  const retry = useCallback(() => {
    if (likelyBlocked && isTauriShell()) {
      tryNative();
      return;
    }
    setError(null);
    setIsLoading(true);
    onLoadStartRef.current?.();
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = src;
    }
  }, [src, likelyBlocked, tryNative]);

  useEffect(() => {
    if (!likelyBlocked || !isTauriShell() || autoNativeAttempted.current) return;
    autoNativeAttempted.current = true;
    fail(
      'YouTube/Google cannot run in iframe mode. Switching to Native browser…'
    );
    tryNative();
  }, [likelyBlocked, fail, tryNative]);

  useEffect(() => {
    setError(null);
    onLoadStart?.();
    setIsLoading(true);
    clearLoadTimer();

    if (likelyBlocked) {
      fail('This site blocks iframe embedding (Google, GitHub, YouTube). Switch to Native mode.');
      return;
    }

    loadTimerRef.current = setTimeout(() => {
      const hint = 'Page took too long to load. Try again or switch to Native mode.';
      fail(hint);
    }, LOAD_TIMEOUT_MS);

    const iframe = iframeRef.current;
    if (!iframe) {
      markReady();
      return;
    }

    const handleLoad = () => {
      markReady();
      try {
        const loc = iframe.contentWindow?.location.href || '';
        if (loc.startsWith('chrome-error://') || loc.includes('chromewebdata')) {
          fail(
            likelyBlocked
              ? 'Site blocked iframe embedding. Use Native mode (Tauri) for full browsing.'
              : 'Could not load this page in the iframe.'
          );
          window.dispatchEvent(
            new CustomEvent('iframe-blocked', { detail: { tabId, url: src } })
          );
          return;
        }
        if (loc && !loc.startsWith('chrome-error')) onUrlChangeRef.current?.(loc);
        tryExtractIframeSnippet(tabId, iframe);
      } catch {
        onUrlChangeRef.current?.(src);
      }
      window.dispatchEvent(new CustomEvent('iframe:load', { detail: { tabId, url: src } }));
    };

    const handleError = () => {
      fail('Failed to load page. Check the URL or try Native mode.');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);
    return () => {
      clearLoadTimer();
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [src, tabId, fail, markReady, likelyBlocked]);

  // When this tab becomes active, ensure iframe shows the correct URL (per-tab iframes).
  useEffect(() => {
    if (!isTabActive) return;
    const iframe = iframeRef.current;
    if (!iframe || likelyBlocked) return;
    const resolved = src;
    try {
      const current = iframe.src;
      if (current !== resolved) {
        iframe.src = resolved;
        setIsLoading(true);
        onLoadStartRef.current?.();
      }
    } catch {
      iframe.src = resolved;
    }
  }, [isTabActive, src, likelyBlocked]);

  useEffect(() => {
    const onActivated = (e: Event) => {
      const detail = (e as CustomEvent<{ tabId?: string; url?: string }>).detail;
      if (detail?.tabId !== tabId) return;
      const iframe = iframeRef.current;
      if (!iframe || likelyBlocked) return;
      const target = detail.url ? resolveBrowseUrl(detail.url) : src;
      if (iframe.src !== target) {
        iframe.src = target;
        setIsLoading(true);
        onLoadStartRef.current?.();
      }
    };
    window.addEventListener('regen:tab-activated', onActivated);
    return () => window.removeEventListener('regen:tab-activated', onActivated);
  }, [tabId, src, likelyBlocked]);

  const showError = !!error;

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col bg-[#0f1623] ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '100%' }}
    >
      {isLoading && !showError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0f1623]/80 regen-fade-in">
          <Loader2 className="h-9 w-9 animate-spin text-[#f0a030]" />
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      )}

      <iframe
        key={`${tabId}-${iframeSrc}`}
        ref={iframeRef}
        data-tab-id={tabId}
        title="Browser Content"
        src={iframeSrc}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-storage-access-by-user-activation"
        className="min-h-0 w-full flex-1 border-0"
        allow={IFRAME_ALLOW}
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 'none', width: '100%', height: '100%' }}
      />

      {showError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0f1623] p-6 text-center regen-fade-in">
          <span className="text-3xl" aria-hidden>
            ⚠️
          </span>
          <p className="text-lg font-medium text-white">Could not load this page</p>
          <p className="max-w-md text-sm text-gray-400">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f0a030] px-4 py-2 text-sm font-medium text-[#0f1623]"
              onClick={retry}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            {(allowNativeRetry || isTauriShell()) && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#f0a030] px-4 py-2 text-sm text-[#f0a030]"
                onClick={tryNative}
              >
                Use native browser
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm text-white"
              onClick={() => void openUrlInBrowser(src)}
            >
              <ExternalLink className="h-4 w-4" />
              Open in system browser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
