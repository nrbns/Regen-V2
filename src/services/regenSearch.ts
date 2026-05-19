/**
 * Unified Regen search client — always uses backend hybrid search first.
 */

import { apiRequest } from '../lib/api-client';

export type RegenSearchResult = {
  url: string;
  title: string;
  snippet: string;
  source: string;
  score: number;
};

async function postHybrid(query: string, maxResults: number): Promise<RegenSearchResult[]> {
  const res = await apiRequest<{
    ok?: boolean;
    results?: RegenSearchResult[];
    count?: number;
  }>('/api/search/hybrid', {
    method: 'POST',
    body: { query: query.trim(), maxResults },
  });
  return res.results ?? [];
}

async function postProduction(q: string, maxResults: number): Promise<RegenSearchResult[]> {
  const res = await apiRequest<{
    ok?: boolean;
    results?: Array<{
      url: string;
      title: string;
      snippet: string;
      source: string;
      score: number;
    }>;
  }>('/api/search', {
    method: 'POST',
    body: { q: q.trim(), maxResults },
  });
  return (res.results ?? []).map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.snippet,
    source: r.source,
    score: r.score ?? 0.5,
  }));
}

/** DuckDuckGo instant API fallback (no backend required). */
async function ddgFallback(query: string): Promise<RegenSearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
    AbstractURL?: string;
    AbstractText?: string;
    Heading?: string;
  };
  const out: RegenSearchResult[] = [];
  if (data.AbstractURL && data.AbstractText) {
    out.push({
      url: data.AbstractURL,
      title: data.Heading || query,
      snippet: data.AbstractText.slice(0, 280),
      source: 'duckduckgo',
      score: 0.95,
    });
  }
  const flat: Array<{ Text?: string; FirstURL?: string }> = [];
  for (const item of data.RelatedTopics ?? []) {
    if ('Topics' in item && Array.isArray(item.Topics)) flat.push(...item.Topics);
    else if ('FirstURL' in item) flat.push(item);
  }
  for (const [i, t] of flat.entries()) {
    if (!t.FirstURL) continue;
    out.push({
      url: t.FirstURL,
      title: (t.Text ?? '').split(' - ')[0] || t.FirstURL,
      snippet: t.Text ?? '',
      source: 'duckduckgo',
      score: 0.8 - i * 0.05,
    });
    if (out.length >= 10) break;
  }
  return out;
}

export const regenSearch = {
  async search(query: string, maxResults = 8): Promise<RegenSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    try {
      const hybrid = await postHybrid(q, maxResults);
      if (hybrid.length > 0) return hybrid;
    } catch {
      /* try production */
    }

    try {
      const prod = await postProduction(q, maxResults);
      if (prod.length > 0) return prod;
    } catch {
      /* try ddg */
    }

    return ddgFallback(q);
  },

  async suggest(q: string): Promise<string[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    try {
      const res = await apiRequest<{ ok?: boolean; suggestions?: string[] }>(
        `/api/search/suggest?q=${encodeURIComponent(query)}`
      );
      return res.suggestions ?? [];
    } catch {
      return [];
    }
  },
};
