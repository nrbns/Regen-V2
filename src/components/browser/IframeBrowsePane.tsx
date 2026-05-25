/**
 * Iframe browser pane — no sandbox (desktop-safe; sites load normally when embed allowed).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { isIframeBlockedHost } from '../../lib/browser/iframeHosts';
import { isTauriShell } from '../../lib/tauri/runtime';
import { openUrlInBrowser } from '../../lib/tauri/openUrl';
import { tryExtractIframeSnippet } from '../../lib/browser/fetchPageSnippet';

const LOAD_TIMEOUT_MS = 15000;

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
}

export function IframeBrowsePane({
  tabId,
  src,
  className = '',
  onLoadStart,
  onLoadEnd,
  onLoadFailed,
  onUrlChange,
}: IframeBrowsePaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameBlocked, setFrameBlocked] = useState(() => isIframeBlockedHost(src));

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
      onLoadFailed?.(message);
    },
    [onLoadFailed, src]
  );

  const markReady = useCallback(() => {
    clearLoadTimer();
    setIsLoading(false);
    setError(null);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const retry = useCallback(() => {
    setError(null);
    setFrameBlocked(isIframeBlockedHost(src));
    setIsLoading(true);
    onLoadStart?.();
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = src;
    }
  }, [src, onLoadStart]);

  useEffect(() => {
    const hostBlocked = isIframeBlockedHost(src);
    setFrameBlocked(hostBlocked);
    setError(null);
    onLoadStart?.();
    setIsLoading(true);
    clearLoadTimer();

    if (hostBlocked) {
      fail(
        'This site blocks iframe embedding (Google, GitHub, YouTube). Use the desktop app for native browsing.'
      );
      return;
    }

    loadTimerRef.current = setTimeout(() => {
      fail('Page took too long to load (15s). Try Google or open in your system browser.');
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
          setFrameBlocked(true);
          fail('Could not load this page in the iframe.');
          window.dispatchEvent(
            new CustomEvent('iframe-blocked', { detail: { tabId, url: src } })
          );
          return;
        }
        setFrameBlocked(false);
        if (loc && !loc.startsWith('chrome-error')) onUrlChange?.(loc);
        tryExtractIframeSnippet(tabId, iframe);
      } catch {
        onUrlChange?.(src);
      }
      window.dispatchEvent(new CustomEvent('iframe:load', { detail: { tabId, url: src } }));
    };

    const handleError = () => {
      fail('Failed to load page. Check the URL or try again.');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);
    return () => {
      clearLoadTimer();
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [src, tabId, onLoadStart, onUrlChange, fail, markReady]);

  const showError = error || frameBlocked;

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col bg-[#0f1623] ${className}`}>
      {isLoading && !showError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0f1623]/80 regen-fade-in">
          <Loader2 className="h-9 w-9 animate-spin text-[#f0a030]" />
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      )}

      {!frameBlocked && (
        <iframe
          key={`${tabId}-${src}`}
          ref={iframeRef}
          data-tab-id={tabId}
          title="Browser Content"
          src={src}
          className="min-h-0 w-full flex-1 border-0"
          allow={IFRAME_ALLOW}
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      )}

      {showError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0f1623] p-6 text-center regen-fade-in">
          <span className="text-3xl" aria-hidden>
            ⚠️
          </span>
          <p className="text-lg font-medium text-white">Could not load this page</p>
          <p className="max-w-md text-sm text-gray-400">{error}</p>
          {isTauriShell() && (
            <p className="text-xs text-gray-500">
              Tip: restart with <code className="text-[#f0a030]">npm run dev</code> for native
              browsing (all sites).
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f0a030] px-4 py-2 text-sm font-medium text-[#0f1623]"
              onClick={retry}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
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
