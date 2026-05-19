/**
 * Unified BrowserView Component
 * Real web browser engine for all modes (Browse, Research, Trade)
 * Uses native Tauri WebView (if available) or falls back to iframes
 *
 * Architecture:
 * - In Tauri: Uses native WebView instances (better performance, isolation)
 * - In web: Falls back to iframes (for development/testing)
 */

import { useEffect, useRef, useState, Suspense } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useSettingsStore } from '../../state/settingsStore';
import { isTauriRuntime } from '../../lib/env';
import { Loader2 } from 'lucide-react';
import { NativeWebView } from './NativeWebView';
import { SAFE_IFRAME_SANDBOX } from '../../config/security';
import { isNewTabUrl, isSearchTabUrl } from '../../lib/browser/normalizeUrl';

interface BrowserViewProps {
  tabId?: string; // Tab ID from Rust TabManager
  url?: string;
  mode?: 'browse' | 'research' | 'trade';
  className?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
}

function iframeSrcForUrl(url: string | undefined | null): string {
  const u = (url || '').trim();
  if (!u || isNewTabUrl(u) || isSearchTabUrl(u)) return 'about:blank';
  return u;
}

export default function BrowserView({
  tabId,
  url,
  mode: _mode = 'browse',
  className = 'w-full h-full',
  onUrlChange,
  onTitleChange,
}: BrowserViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState(url || 'https://www.google.com');
  const [isLoading, setIsLoading] = useState(true);
  const privacySettings = useSettingsStore(state => state.privacy);
  const privacyMode = privacySettings.trackerProtection && privacySettings.adBlockEnabled;

  const activeTab = useTabsStore(state => {
    if (tabId) return state.tabs.find(t => t.id === tabId) ?? null;
    if (state.activeTabId) return state.tabs.find(t => t.id === state.activeTabId) ?? null;
    return state.tabs[0] ?? null;
  });

  const displayUrl = activeTab?.url || currentUrl;
  const displayTabId = tabId || activeTab?.id || 'default';
  const displayPrivacyMode = (activeTab?.mode || 'normal') as 'normal' | 'private' | 'ghost';
  const frameSrc = iframeSrcForUrl(displayUrl);

  useEffect(() => {
    if (url && url !== currentUrl) {
      setCurrentUrl(url);
    }
  }, [url, currentUrl]);

  useEffect(() => {
    setIsLoading(true);
  }, [frameSrc, displayTabId]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || frameSrc === 'about:blank') {
      setIsLoading(false);
      return;
    }

    const handleLoad = () => {
      setIsLoading(false);
      try {
        const iframeUrl = iframe.contentWindow?.location.href || displayUrl;
        if (iframeUrl && iframeUrl !== 'about:blank' && iframeUrl !== currentUrl) {
          setCurrentUrl(iframeUrl);
          onUrlChange?.(iframeUrl);
        }
      } catch {
        onUrlChange?.(displayUrl);
      }
    };

    const handleTitleChange = () => {
      try {
        const title = iframe.contentDocument?.title;
        if (title) {
          onTitleChange?.(title);
        }
      } catch {
        /* cross-origin */
      }
    };

    iframe.addEventListener('load', handleLoad);

    const observer = new MutationObserver(handleTitleChange);
    try {
      if (iframe.contentDocument) {
        observer.observe(iframe.contentDocument.head, {
          childList: true,
          subtree: true,
        });
      }
    } catch {
      /* cross-origin */
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
      observer.disconnect();
    };
  }, [frameSrc, displayUrl, currentUrl, onUrlChange, onTitleChange]);

  /** Stricter subset when privacy hardening is on; still allows normal sites to run. */
  const sandboxAttrs = privacyMode
    ? [
        'allow-same-origin',
        'allow-scripts',
        'allow-forms',
        'allow-popups',
        'allow-popups-to-escape-sandbox',
        'allow-modals',
        'allow-downloads',
        'allow-pointer-lock',
        'allow-presentation',
        'allow-orientation-lock',
        'allow-storage-access-by-user-activation',
        'allow-top-navigation-by-user-activation',
      ]
    : SAFE_IFRAME_SANDBOX.split(/\s+/).filter(Boolean);

  if (isTauriRuntime()) {
    return (
      <NativeWebView
        tabId={displayTabId}
        url={iframeSrcForUrl(displayUrl) === 'about:blank' ? 'https://www.google.com' : displayUrl}
        className={className}
        privacyMode={displayPrivacyMode}
        onUrlChange={newUrl => {
          setCurrentUrl(newUrl);
          onUrlChange?.(newUrl);
        }}
        onTitleChange={onTitleChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
    );
  }

  const IframeContent = () => (
    <iframe
      key={`${displayTabId}-${frameSrc}`}
      ref={iframeRef}
      data-tab-id={displayTabId}
      title="Regen browse"
      src={frameSrc}
      className="h-full w-full border-0"
      sandbox={sandboxAttrs.join(' ')}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access; accelerometer; gyroscope; magnetometer; midi; serial; usb; xr-spatial-tracking; screen-wake-lock; web-share"
      style={{ background: '#000' }}
      onLoad={() => setIsLoading(false)}
    />
  );

  return (
    <div className={`relative ${className}`}>
      <Suspense
        fallback={
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-gray-400">Loading {frameSrc}...</p>
            </div>
          </div>
        }
      >
        {isLoading && frameSrc !== 'about:blank' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-gray-400">Loading {frameSrc}...</p>
            </div>
          </div>
        )}
        <IframeContent />
      </Suspense>
    </div>
  );
}
