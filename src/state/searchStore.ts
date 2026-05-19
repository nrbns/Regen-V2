import { create } from 'zustand';
import type { RegenSearchResult } from '../services/regenSearch';

type SearchState = {
  query: string;
  results: RegenSearchResult[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  setLoading: (query: string) => void;
  setResults: (query: string, results: RegenSearchResult[]) => void;
  setError: (query: string, message: string) => void;
  clear: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  loading: false,
  error: null,
  fetchedAt: null,
  setLoading: (query) =>
    set({ query, loading: true, error: null, results: [], fetchedAt: null }),
  setResults: (query, results) =>
    set({ query, results, loading: false, error: null, fetchedAt: Date.now() }),
  setError: (query, message) =>
    set({ query, loading: false, error: message, results: [], fetchedAt: null }),
  clear: () =>
    set({ query: '', results: [], loading: false, error: null, fetchedAt: null }),
}));
