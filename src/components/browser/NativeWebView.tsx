/**

 * Tauri embedded tab webview — full site loading (not iframe).

 */



import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { isTauriShell } from '../../lib/tauri/runtime';

import { openUrlInBrowser } from '../../lib/tauri/openUrl';

import {

  webviewBoundsFromDom,

  isPaneBoundsReady,

  getShellChromeBottomPx,

  getRegenSidebarWidthPx,

} from '../../lib/browser/webviewBounds';

import { resolveBrowseUrl } from '../../lib/browser/resolveBrowseUrl';

import { fetchNativePageSnippet } from '../../lib/browser/fetchPageSnippet';

import { useBrowseEngineStore } from '../../lib/browser/browseEngineStore';

import { hideAllTabWebviews, syncTabWebviewBounds } from '../../lib/browser/tabWebviewSync';

import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';



const STATUS_BAR_H = 26;



export interface NativeWebViewProps {

  tabId: string;

  url: string;

  className?: string;

  isTabActive?: boolean;

  onLoadStart?: () => void;

  onLoadEnd?: () => void;

  onFailed?: (error: string) => void;

}



function sleep(ms: number) {

  return new Promise((r) => setTimeout(r, ms));

}



async function setBoundsForTab(tabId: string): Promise<void> {

  const rect = webviewBoundsFromDom();

  try {

    const { withBrowseProfile } = await import('../../lib/browser/browserWebviewInvoke');
    await invoke('browser_webview_set_bounds', withBrowseProfile({ tabId, rect }));

  } catch {

    const { withBrowseProfile } = await import('../../lib/browser/browserWebviewInvoke');
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



export function NativeWebView({

  tabId,

  url,

  className = 'w-full h-full min-h-0',

  isTabActive = true,

  onLoadStart,

  onLoadEnd,

  onFailed,

}: NativeWebViewProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  const createdRef = useRef(false);

  const onLoadStartRef = useRef(onLoadStart);

  const onLoadEndRef = useRef(onLoadEnd);

  const onFailedRef = useRef(onFailed);

  const [error, setError] = useState<string | null>(null);

  const [showSpinner, setShowSpinner] = useState(false);



  const browseUrl = resolveBrowseUrl(url);



  useLayoutEffect(() => {

    onLoadStartRef.current = onLoadStart;

    onLoadEndRef.current = onLoadEnd;

    onFailedRef.current = onFailed;

  });



  const syncBounds = useCallback(async () => {

    if (!isTauriShell()) return;

    await setBoundsForTab(tabId);

  }, [tabId]);



  const retry = useCallback(() => {
    useBrowseEngineStore.getState().clearNativeFailed(tabId);
    createdRef.current = false;
    setError(null);
    window.dispatchEvent(
      new CustomEvent('regen:retry-native-tab', { detail: { tabId, url: browseUrl } })
    );
  }, [tabId, browseUrl]);



  useEffect(() => {

    if (!isTauriShell()) {

      setError('Run npm run dev (Tauri desktop) to load all websites.');

      onFailedRef.current?.('not-tauri');

      return;

    }



    let unlisten: UnlistenFn | undefined;

    void listen<{ tab_id?: string; tabId?: string }>('browser://page-loaded', (event) => {

      const id = event.payload.tab_id ?? event.payload.tabId;

      if (id === tabId) {

        setShowSpinner(false);

        setError(null);

        void syncTabWebviewBounds(tabId);

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
    if (!isTabActive || !/^https?:\/\//i.test(browseUrl)) {
      setShowSpinner(false);
      return;
    }
    createdRef.current = true;
    onLoadStartRef.current?.();
    setShowSpinner(true);
    setError(null);
  }, [isTabActive, browseUrl, tabId]);

  useEffect(() => {
    if (!isTabActive || !showSpinner || error) return;

    const t = window.setTimeout(() => {

      setShowSpinner(false);

      setError('Page is taking too long to load. Click Retry or check your connection.');

      onFailedRef.current?.('page-load-timeout');

    }, 25000);

    return () => window.clearTimeout(t);

  }, [isTabActive, showSpinner, error, tabId, browseUrl]);



  useEffect(() => {

    if (!isTabActive) return;

    const onLayout = () => void syncBounds();

    window.addEventListener('resize', onLayout);

    window.addEventListener('regen:sync-webview-bounds', onLayout);

    return () => {

      window.removeEventListener('resize', onLayout);

      window.removeEventListener('regen:sync-webview-bounds', onLayout);

    };

  }, [isTabActive, syncBounds]);



  return (

    <div

      ref={containerRef}

      className={`relative flex min-h-0 flex-1 flex-col ${className}`}

      data-native-webview="true"

      data-tab-id={tabId}

      style={{ flex: 1, width: '100%', height: '100%', minHeight: 240, background: '#0f1623' }}

    >

      {isTabActive && showSpinner && !error && (

        <div

          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-[#0f1623]/50"

          aria-hidden

        >

          <Loader2 className="h-8 w-8 animate-spin text-[#f0a030]" />

        </div>

      )}

      {isTabActive && error && (

        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-[#0f1623] p-4 text-center">

          <p className="text-sm text-red-300">{error}</p>

          <div className="flex flex-wrap gap-2 justify-center">

            <button

              type="button"

              className="inline-flex items-center gap-2 rounded-lg bg-[#f0a030] px-3 py-2 text-sm text-[#0f1623]"

              onClick={retry}

            >

              <RefreshCw className="h-4 w-4" />

              Retry

            </button>

            <button

              type="button"

              className="inline-flex items-center gap-2 rounded-lg border border-[#f0a030] px-3 py-2 text-sm text-[#f0a030]"

              onClick={() => {

                useBrowseEngineStore.getState().setNativeFailed(tabId, true);

                void hideAllTabWebviews();

                onFailedRef.current?.('user-iframe-fallback');

              }}

            >

              Use iframe mode

            </button>

            <button

              type="button"

              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-200"

              onClick={() => void openUrlInBrowser(browseUrl)}

            >

              <ExternalLink className="h-4 w-4" />

              Open externally

            </button>

          </div>

        </div>

      )}

    </div>

  );

}


