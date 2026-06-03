import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isNewTabUrl } from '../lib/browser/normalizeUrl';
import { isTauriShell } from '../lib/tauri/runtime';
import { summarize } from '../services/summarizeService';
import { summarizeWithFallbacks } from '../services/onDeviceAI/enhanced';
import { PageSummarizer } from '../core/content/pageSummarizer';

export type PageSummaryState =
  | { status: 'idle' }
  | { status: 'loading'; url: string; title: string }
  | {
      status: 'ready';
      url: string;
      title: string;
      summary: string;
      model?: string;
      source: 'api' | 'ondevice' | 'extract';
    }
  | { status: 'error'; url: string; message: string };

const SUMMARY_DELAY_MS = 1600;
const SKIP_HOSTS = /^(www\.)?(google\.com|bing\.com|duckduckgo\.com)$/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function usePageAutoSummary(enabled = true) {
  const [state, setState] = useState<PageSummaryState>({ status: 'idle' });
  const lastUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabIdRef = useRef<string | null>(null);

  const clearScheduled = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSummary = useCallback(
    async (url: string, title = '', tabId?: string): Promise<PageSummaryState> => {
      if (!enabled || isNewTabUrl(url)) return { status: 'idle' };
      const host = hostOf(url);
      if (SKIP_HOSTS.test(host)) {
        const idle: PageSummaryState = { status: 'idle' };
        setState(idle);
        return idle;
      }

      const loading: PageSummaryState = { status: 'loading', url, title: title || url };
      setState(loading);

      try {
        const result = await summarize({ url, maxWaitSeconds: 28 });
        lastUrlRef.current = url;
        const ready: PageSummaryState = {
          status: 'ready',
          url,
          title: title || url,
          summary: result.summary,
          model: result.model,
          source: 'api',
        };
        setState(ready);
        return ready;
      } catch (apiErr) {
        const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.warn('[usePageAutoSummary] API summarize failed:', msg);
      }

      if (tabId && isTauriShell()) {
        try {
          const content = await PageSummarizer.extractPageContent(tabId);
          if (content.text.trim().length > 80) {
            const local = await summarizeWithFallbacks(content.text, {
              maxLength: 120,
              language: 'en',
            });
            lastUrlRef.current = url;
            const ready: PageSummaryState = {
              status: 'ready',
              url,
              title: content.title || title || url,
              summary: local.summary,
              model: local.method,
              source: local.method === 'ondevice' ? 'ondevice' : 'extract',
            };
            setState(ready);
            return ready;
          }
        } catch (extractErr) {
          console.warn('[usePageAutoSummary] extract/on-device failed:', extractErr);
        }
      }

      const err: PageSummaryState = {
        status: 'error',
        url,
        message: 'Summary unavailable (start backend or browse a public page).',
      };
      setState(err);
      return err;
    },
    [enabled]
  );

  const scheduleSummary = useCallback(
    (url: string, title?: string, tabId?: string) => {
      if (!enabled || isNewTabUrl(url)) return;
      if (lastUrlRef.current === url && state.status === 'ready') return;

      activeTabIdRef.current = tabId ?? activeTabIdRef.current;
      clearScheduled();
      timerRef.current = setTimeout(() => {
        void runSummary(url, title, tabId ?? activeTabIdRef.current ?? undefined);
      }, SUMMARY_DELAY_MS);
    },
    [enabled, clearScheduled, runSummary, state.status]
  );

  const clearSummary = useCallback(() => {
    clearScheduled();
    lastUrlRef.current = null;
    setState({ status: 'idle' });
  }, [clearScheduled]);

  useEffect(() => {
    if (!enabled || !isTauriShell()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<{ tab_id?: string; tabId?: string; url?: string; title?: string }>(
      'browser://page-loaded',
      (event) => {
        const url = event.payload.url?.trim();
        const tabId = event.payload.tab_id ?? event.payload.tabId;
        if (!url || isNewTabUrl(url)) return;
        activeTabIdRef.current = tabId ?? null;
        scheduleSummary(url, event.payload.title, tabId);
      }
    ).then((fn) => {
      if (cancelled) void fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      void unlisten?.();
      clearScheduled();
    };
  }, [enabled, scheduleSummary, clearScheduled]);

  return {
    state,
    scheduleSummary,
    summarizeNow: runSummary,
    clearSummary,
  };
}
