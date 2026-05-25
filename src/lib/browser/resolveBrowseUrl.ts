import {
  getSearchQueryFromUrl,
  googleSearchUrl,
  isNewTabUrl,
  isSearchTabUrl,
  normalizeUrl,
} from './normalizeUrl';
import { isTauriShell } from '../tauri/runtime';

export function resolveBrowseUrl(url: string | undefined | null): string {
  const u = (url || '').trim();
  const embeddedSearch = !isTauriShell();
  if (!u || isNewTabUrl(u)) return 'https://www.google.com/';
  if (isSearchTabUrl(u)) {
    const q = getSearchQueryFromUrl(u);
    return q ? googleSearchUrl(q) : 'https://www.google.com/';
  }
  if (/^regen:\/\//i.test(u)) return 'about:blank';
  const normalized = normalizeUrl(u, { embeddedSearch });
  if (isSearchTabUrl(normalized)) {
    const q = getSearchQueryFromUrl(normalized);
    return q ? googleSearchUrl(q) : 'https://www.google.com/';
  }
  return normalized;
}
