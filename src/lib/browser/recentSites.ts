import { isNewTabUrl } from './normalizeUrl';
import type { TabHistoryEntry } from './tabHistoryStore';

export interface RecentSite {
  url: string;
  title: string;
  visitedAt: number;
}

/** Deduped recent URLs from all tab history stacks (newest first). */
export function collectRecentSites(
  stacks: Record<string, { entries: TabHistoryEntry[]; index: number }>,
  limit = 8
): RecentSite[] {
  const seen = new Set<string>();
  const out: RecentSite[] = [];

  const flat: TabHistoryEntry[] = [];
  for (const st of Object.values(stacks)) {
    for (const e of st.entries) {
      if (e?.url && !isNewTabUrl(e.url)) flat.push(e);
    }
  }

  for (let i = flat.length - 1; i >= 0 && out.length < limit; i--) {
    const entry = flat[i];
    if (!entry?.url || isNewTabUrl(entry.url)) continue;
    const key = entry.url.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let title = entry.title || '';
    try {
      if (!title || title.startsWith('http')) {
        title = new URL(entry.url).hostname.replace(/^www\./, '');
      }
    } catch {
      title = entry.url;
    }
    out.push({ url: entry.url, title, visitedAt: Date.now() - out.length });
  }

  return out;
}

export function faviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return '';
  }
}
