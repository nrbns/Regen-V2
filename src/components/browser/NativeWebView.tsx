/**
 * Tauri embedded tab webview via Rust (real browser — not iframe).
 * Multi-tab: each tab keeps its webview; visibility toggles hide/show.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauriShell } from '../../lib/tauri/runtime';
import { openUrlInBrowser } from '../../lib/tauri/openUrl';
import { webviewBoundsFromDom } from '../../lib/browser/webviewBounds';
import { fetchNativePageSnippet } from '../../lib/browser/fetchPageSnippet';
import { Loader2, ExternalLink } from 'lucide-react';

export interface NativeWebViewProps {
  tabId: string;
  url: string;
  className?: string;
  visible?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onFailed?: (error: string) => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function NativeWebView({
  tabId,
  url,
  className = 'w-full h-full min-h-0',
  visible = true,
  onLoadStart,
  onLoadEnd,
  onFailed,
}: NativeWebViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountGen = useRef(0);
  const createdRef = useRef(false);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const onFailedRef = useRef(onFailed);
  const [error, setError] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useLayoutEffect(() => {
    onLoadStartRef.current = onLoadStart;
    onLoadEndRef.current = onLoadEnd;
    onFailedRef.current = onFailed;
  });

  const syncBounds = useCallback(async () => {
    const el = containerRef.current;
    if (!el || !isTauriShell() || !createdRef.current) return;
    try {
      await invoke('browser_webview_set_bounds', {
        tabId,
        rect: webviewBoundsFromDom(el),
      });
    } catch {
      /* ok */
    }
  }, [tabId]);

  const hideWebview = useCallback(async () => {
    if (!isTauriShell() || !createdRef.current) return;
    try {
      await invoke('browser_webview_set_visible', { tabId, visible: false });
    } catch {
      /* ok */
    }
  }, [tabId]);

  const ensureWebview = useCallback(async () => {
    if (!isTauriShell()) return;
    const el = containerRef.current;
    if (!el) return;

    const gen = ++mountGen.current;
    onLoadStartRef.current?.();
    setShowSpinner(true);
    setError(null);

    let rect = webviewBoundsFromDom(el);
    for (let i = 0; i < 50; i++) {
      if (gen !== mountGen.current) return;
      rect = webviewBoundsFromDom(el);
      if (rect.width >= 100 && rect.height >= 200) break;
      await sleep(60);
    }

    if (gen !== mountGen.current) return;

    try {
      await invoke('browser_webview_upsert', { tabId, url, rect });
      if (gen !== mountGen.current) return;
      createdRef.current = true;
      await invoke('browser_webview_set_visible', { tabId, visible: true });
      setTimeout(() => {
        if (gen === mountGen.current) {
          setShowSpinner(false);
          onLoadEndRef.current?.();
        }
      }, 8000);
    } catch (err) {
      if (gen !== mountGen.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setShowSpinner(false);
      onFailedRef.current?.(msg);
    }
  }, [tabId, url]);

  useEffect(() => {
    if (!isTauriShell()) {
      setError('Run npm run dev (Tauri desktop) for full browsing.');
      onFailedRef.current?.('not-tauri');
      return;
    }

    let unlisten: UnlistenFn | undefined;
    void listen<{ tab_id: string }>('browser://page-loaded', (event) => {
      if (event.payload.tab_id === tabId) {
        setShowSpinner(false);
        void fetchNativePageSnippet(tabId);
        onLoadEndRef.current?.();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      void unlisten?.();
    };
  }, [tabId]);

  useEffect(() => {
    if (!isTauriShell()) return;

    if (visible) {
      void ensureWebview();
    } else {
      setShowSpinner(false);
      void hideWebview();
    }
  }, [visible, tabId, url, ensureWebview, hideWebview]);

  useEffect(() => {
    if (visible) void syncBounds();
  }, [visible, syncBounds]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !visible) return;
    const ro = new ResizeObserver(() => void syncBounds());
    ro.observe(el);
    window.addEventListener('resize', syncBounds);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncBounds);
    };
  }, [syncBounds, visible]);

  useEffect(() => {
    return () => {
      mountGen.current += 1;
      createdRef.current = false;
      void invoke('browser_webview_close', { tabId }).catch(() => {});
    };
  }, [tabId]);

  return (
    <div
      ref={containerRef}
      className={`relative flex min-h-0 flex-1 flex-col ${className}`}
      data-native-webview="true"
      data-tab-id={tabId}
      style={{ minHeight: 240, background: 'transparent' }}
    >
      {visible && showSpinner && !error && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-[#0f1623]/40"
          aria-hidden
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#f0a030]" />
        </div>
      )}
      {visible && error && (
        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-[#0f1623] p-4 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#f0a030] px-3 py-2 text-sm text-[#0f1623]"
            onClick={() => void openUrlInBrowser(url)}
          >
            <ExternalLink className="h-4 w-4" />
            Open in system browser
          </button>
        </div>
      )}
    </div>
  );
}
