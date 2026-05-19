/* eslint-env node */
/**
 * Search Routes
 * Handles hybrid search and multi-source search endpoints
 */

import fetch from 'node-fetch';
import { multiSourceSearch } from '../services/research/multiSourceSearch.js';

/**
 * POST /api/search/hybrid
 * Hybrid search across multiple sources
 */
export async function hybridSearch(request, reply) {
  try {
    const body = request.body || {};
    const query = (body.query || body.q || '').trim();
    const { lang, maxResults = 8, maxSources = 8 } = body;

    if (!query || query.length < 2) {
      return reply.code(400).send({
        error: 'missing-query',
        message: 'Query must be at least 2 characters',
      });
    }

    const limit = maxResults || maxSources || 8;
    const results = await multiSourceSearch(query, {
      lang: lang || 'auto',
      maxResults: limit,
    });

    return reply.send({
      ok: true,
      results,
      query,
      count: results.length,
    });
  } catch (err) {
    console.error('[Search] Hybrid search error:', err);
    return reply.code(500).send({
      error: 'search_failed',
      message: err.message || 'Search failed',
    });
  }
}

/**
 * GET /api/search/suggest?q=...
 * Fast autocomplete via DuckDuckGo suggest API
 */
export async function searchSuggest(request, reply) {
  const q = String(request.query?.q || '').trim();
  if (q.length < 2) {
    return reply.send({ ok: true, suggestions: [] });
  }

  try {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RegenBrowser/1.0' },
    });
    if (!res.ok) throw new Error(`suggest http ${res.status}`);
    const data = await res.json();
    const suggestions = Array.isArray(data?.[1])
      ? data[1].filter((s) => typeof s === 'string').slice(0, 8)
      : [];
    return reply.send({ ok: true, suggestions, query: q });
  } catch (err) {
    console.warn('[Search] Suggest failed:', err.message);
    return reply.send({ ok: true, suggestions: [], query: q });
  }
}
