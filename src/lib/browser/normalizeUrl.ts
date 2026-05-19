const NEWTAB = 'regen://newtab';
const SEARCH_TAB = 'regen://search';

export type InputKind = 'newtab' | 'url' | 'search';

export function classifyInput(input: string): InputKind {
  const raw = input.trim();
  if (!raw || raw === NEWTAB) return 'newtab';
  if (/^regen:\/\//i.test(raw)) return 'url';
  if (/^https?:\/\//i.test(raw)) return 'url';
  if (/^localhost(:\d+)?(\/|$)/i.test(raw)) return 'url';
  if (/^[\w-]+(\.[\w-]+)+/.test(raw) && !raw.includes(' ')) return 'url';
  return 'search';
}

export function searchTabUrl(query: string): string {
  return `regen://search/?q=${encodeURIComponent(query.trim())}`;
}

export function isSearchTabUrl(url: string | undefined | null): boolean {
  return !!url && url.startsWith(SEARCH_TAB);
}

export function getSearchQueryFromUrl(url: string): string | null {
  if (!isSearchTabUrl(url)) return null;
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q');
    if (q) return q;
  } catch {
    /* fall through */
  }
  const m = url.match(/[?&]q=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw || raw === NEWTAB) return NEWTAB;
  if (/^regen:\/\//i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^localhost(:\d+)?(\/|$)/i.test(raw)) return `http://${raw}`;
  if (classifyInput(raw) === 'search') return searchTabUrl(raw);
  if (/^[\w-]+(\.[\w-]+)+/.test(raw) && !raw.includes(' ')) {
    return `https://${raw}`;
  }
  return searchTabUrl(raw);
}

export function isNewTabUrl(url: string | undefined | null): boolean {
  return !url || url === NEWTAB;
}

export function displayUrlBar(url: string): string {
  if (isNewTabUrl(url)) return '';
  if (isSearchTabUrl(url)) return getSearchQueryFromUrl(url) ?? '';
  return url.replace(/^https?:\/\//i, '');
}

export { NEWTAB, SEARCH_TAB };
