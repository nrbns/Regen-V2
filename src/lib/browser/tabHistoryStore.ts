/**
 * Per-tab navigation history (back / forward stacks).
 */

import { create } from 'zustand';
import { isNewTabUrl } from './normalizeUrl';

export interface TabHistoryEntry {
  url: string;
  title?: string;
}

interface TabHistoryState {
  /** tabId → history stack */
  stacks: Record<string, { entries: TabHistoryEntry[]; index: number }>;

  ensureTab: (tabId: string, url?: string) => void;
  /** Push a new URL (truncates forward branch). Skips duplicate consecutive URLs. */
  push: (tabId: string, url: string, title?: string) => void;
  back: (tabId: string) => TabHistoryEntry | null;
  forward: (tabId: string) => TabHistoryEntry | null;
  canGoBack: (tabId: string) => boolean;
  canGoForward: (tabId: string) => boolean;
  removeTab: (tabId: string) => void;
  current: (tabId: string) => TabHistoryEntry | null;
  /** After native webview back/forward — move index to match URL without pushing. */
  alignIndex: (tabId: string, url: string) => void;
}

function emptyStack() {
  return { entries: [] as TabHistoryEntry[], index: -1 };
}

export const useTabHistoryStore = create<TabHistoryState>((set, get) => ({
  stacks: {},

  ensureTab(tabId, url) {
    const st = get();
    if (st.stacks[tabId]) return;
    const stack = emptyStack();
    if (url && !isNewTabUrl(url)) {
      stack.entries = [{ url }];
      stack.index = 0;
    }
    set({ stacks: { ...st.stacks, [tabId]: stack } });
  },

  push(tabId, url, title) {
    if (isNewTabUrl(url)) return;
    const st = get();
    let stack = st.stacks[tabId] ?? emptyStack();
    const last = stack.entries[stack.index];
    if (last?.url === url) {
      if (title && last.title !== title) {
        stack.entries[stack.index] = { ...last, title };
        set({ stacks: { ...st.stacks, [tabId]: stack } });
      }
      return;
    }
    const trimmed = stack.entries.slice(0, stack.index + 1);
    trimmed.push({ url, title });
    stack = { entries: trimmed, index: trimmed.length - 1 };
    set({ stacks: { ...st.stacks, [tabId]: stack } });
  },

  back(tabId) {
    const stack = get().stacks[tabId];
    if (!stack || stack.index <= 0) return null;
    const nextIndex = stack.index - 1;
    const entry = stack.entries[nextIndex];
    set({
      stacks: {
        ...get().stacks,
        [tabId]: { ...stack, index: nextIndex },
      },
    });
    return entry;
  },

  forward(tabId) {
    const stack = get().stacks[tabId];
    if (!stack || stack.index >= stack.entries.length - 1) return null;
    const nextIndex = stack.index + 1;
    const entry = stack.entries[nextIndex];
    set({
      stacks: {
        ...get().stacks,
        [tabId]: { ...stack, index: nextIndex },
      },
    });
    return entry;
  },

  canGoBack(tabId) {
    const stack = get().stacks[tabId];
    return !!stack && stack.index > 0;
  },

  canGoForward(tabId) {
    const stack = get().stacks[tabId];
    return !!stack && stack.index < stack.entries.length - 1;
  },

  removeTab(tabId) {
    const { [tabId]: _, ...rest } = get().stacks;
    set({ stacks: rest });
  },

  current(tabId) {
    const stack = get().stacks[tabId];
    if (!stack || stack.index < 0) return null;
    return stack.entries[stack.index] ?? null;
  },

  alignIndex(tabId, url) {
    if (isNewTabUrl(url)) return;
    const st = get();
    const stack = st.stacks[tabId];
    if (!stack?.entries.length) return;
    const idx = stack.entries.findIndex((e) => e.url === url);
    if (idx < 0) return;
    if (stack.index === idx) return;
    set({
      stacks: {
        ...st.stacks,
        [tabId]: { ...stack, index: idx },
      },
    });
  },
}));
