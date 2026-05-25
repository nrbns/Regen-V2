import { invoke } from '@tauri-apps/api/core';
import { isTauriShell } from '../tauri/runtime';
import { setPageSnippet, type PageSnippet } from './pageContextStore';

export async function fetchNativePageSnippet(tabId: string): Promise<PageSnippet | null> {
  if (!isTauriShell() || !tabId) return null;
  try {
    const raw = await invoke<{
      tabId?: string;
      tab_id?: string;
      url: string;
      title: string;
      text: string;
    }>('browser_webview_extract_page', { tabId });

    const snippet: PageSnippet = {
      tabId: raw.tabId ?? raw.tab_id ?? tabId,
      url: raw.url ?? '',
      title: raw.title ?? '',
      text: raw.text ?? '',
      fetchedAt: Date.now(),
    };
    setPageSnippet(snippet);
    return snippet;
  } catch (e) {
    console.warn('[fetchPageSnippet]', e);
    return null;
  }
}

/** Best-effort iframe text (same-origin only). */
export function tryExtractIframeSnippet(
  tabId: string,
  iframe: HTMLIFrameElement | null
): PageSnippet | null {
  if (!iframe) return null;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.body) return null;
    const clone = doc.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, style, noscript, svg').forEach((n) => n.remove());
    const text = (clone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000);
    const snippet: PageSnippet = {
      tabId,
      url: iframe.contentWindow?.location?.href ?? iframe.src,
      title: doc.title || '',
      text,
      fetchedAt: Date.now(),
    };
    setPageSnippet(snippet);
    return snippet;
  } catch {
    return null;
  }
}
