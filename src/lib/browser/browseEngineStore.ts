/**
 * Browse engine: native WebView2 (Tauri) vs permissive sandbox iframe.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { preferIframeBrowser } from './preferIframe';
import { isTauriShell } from '../tauri/runtime';

export type BrowseEngine = 'auto' | 'native' | 'iframe';

function defaultEngine(): BrowseEngine {
  if (preferIframeBrowser()) return 'iframe';
  return isTauriShell() ? 'native' : 'auto';
}

interface BrowseEngineState {
  engine: BrowseEngine;
  nativeFailedByTab: Record<string, boolean>;

  setEngine: (engine: BrowseEngine) => void;
  setNativeFailed: (tabId: string, failed?: boolean) => void;
  clearNativeFailed: (tabId?: string) => void;
  shouldUseIframe: (tabId: string, preferIframeProp?: boolean) => boolean;
}

export const useBrowseEngineStore = create<BrowseEngineState>()(
  persist(
    (set, get) => ({
      engine: defaultEngine(),
      nativeFailedByTab: {},

      setEngine(engine) {
        set({ engine });
        if (engine === 'native') {
          set({ nativeFailedByTab: {} });
        }
      },

      setNativeFailed(tabId, failed = true) {
        set((s) => ({
          nativeFailedByTab: { ...s.nativeFailedByTab, [tabId]: failed },
        }));
      },

      clearNativeFailed(tabId) {
        if (!tabId) {
          set({ nativeFailedByTab: {} });
          return;
        }
        set((s) => {
          const { [tabId]: _, ...rest } = s.nativeFailedByTab;
          return { nativeFailedByTab: rest };
        });
      },

      shouldUseIframe(tabId, preferIframeProp) {
        if (preferIframeProp === true || preferIframeBrowser()) return true;
        const { engine, nativeFailedByTab } = get();
        if (engine === 'iframe') return true;
        if (engine === 'native') return false;
        return !!nativeFailedByTab[tabId];
      },
    }),
    {
      name: 'regen-browse-engine',
      partialize: (s) => ({ engine: s.engine }),
      onRehydrateStorage: () => (state) => {
        if (!state || !isTauriShell() || preferIframeBrowser()) return;
        if (state.engine === 'auto' || state.engine === 'iframe') {
          state.engine = 'native';
          state.nativeFailedByTab = {};
        }
      },
    }
  )
);
