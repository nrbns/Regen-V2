import React, { memo, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { useSearchStore } from '../../state/searchStore';
import { regenSearch } from '../../services/regenSearch';
import { getSearchQueryFromUrl } from '../../lib/browser/normalizeUrl';

type Props = {
  url: string;
  onOpenResult: (targetUrl: string) => void;
};

function SearchResultsPaneInner({ url, onOpenResult }: Props) {
  const query = getSearchQueryFromUrl(url) ?? '';
  const storeQuery = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const fetchedAt = useSearchStore((s) => s.fetchedAt);
  const setLoading = useSearchStore((s) => s.setLoading);
  const setResults = useSearchStore((s) => s.setResults);
  const setError = useSearchStore((s) => s.setError);

  useEffect(() => {
    if (!query || query.length < 2) return;
    if (storeQuery === query && fetchedAt) return;

    setLoading(query);
    regenSearch
      .search(query, 10)
      .then((r) => setResults(query, r))
      .catch((e) => setError(query, e instanceof Error ? e.message : 'Search failed'));
  }, [query, storeQuery, fetchedAt, setLoading, setResults, setError]);

  const showResults = storeQuery === query ? results : [];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        background: 'var(--bg-deep, #0d0d0f)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#F5A623',
            marginBottom: 8,
          }}
        >
          Regen Search · hybrid backend
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--text-primary, #f0eeea)',
            marginBottom: 20,
          }}
        >
          {query}
        </h1>

        {loading && storeQuery === query && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a09e98' }}>
            <Loader2 className="w-5 h-5 animate-spin text-[#F5A623]" />
            Searching Brave, DuckDuckGo, and more…
          </div>
        )}

        {error && storeQuery === query && (
          <div style={{ color: '#E24B4A', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {!loading && showResults.length === 0 && !error && storeQuery === query && (
          <p style={{ color: '#5a5856', fontSize: 13 }}>No results. Try a different query.</p>
        )}

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {showResults.map((r, i) => (
            <li key={`${r.url}-${i}`}>
              <button
                type="button"
                onClick={() => onOpenResult(r.url)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--surface-2, #1a1a1f)',
                  border: '1px solid var(--border, #ffffff14)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#F5A62355';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border, #ffffff14)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 15, color: '#7F9EF5', lineHeight: 1.4 }}>{r.title}</span>
                  <ExternalLink size={14} style={{ flexShrink: 0, color: '#5a5856' }} />
                </div>
                <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 6 }}>
                  {r.url.replace(/^https?:\/\//, '').slice(0, 60)}
                  {r.source ? ` · ${r.source}` : ''}
                </div>
                <p style={{ fontSize: 13, color: '#a09e98', lineHeight: 1.55, margin: 0 }}>
                  {r.snippet}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {fetchedAt && showResults.length > 0 && storeQuery === query && (
          <p style={{ marginTop: 24, fontSize: 11, color: '#5a5856' }}>
            {showResults.length} results
          </p>
        )}
      </div>
    </div>
  );
}

export const SearchResultsPane = memo(SearchResultsPaneInner);
