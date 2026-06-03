import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isSearchTabUrl, getSearchQueryFromUrl, isNewTabUrl, NEWTAB } from '../lib/browser/normalizeUrl';

// FIX: Global navigation confirmation listener (backend-owned navigation)
if (typeof window !== 'undefined') {
  window.addEventListener('regen:navigate:confirmed', ((e: CustomEvent<{ url: string; tabId?: string; success: boolean; title?: string }>) => {
    const { url, tabId, success, title } = e.detail;
    if (!success || !url) return;

    // Backend confirmed navigation - update tab through tabsStore
    // Import here to avoid circular dependency
    import('./tabsStore').then(({ useTabsStore }) => {
      const state = useTabsStore.getState();
      const targetTabId = tabId || state.activeTabId;
      
      if (targetTabId) {
        state.navigateTab(targetTabId, url);
        if (title) {
          state.updateTab(targetTabId, { title });
        }
      }
    }).catch((error) => {
      console.error('[TabsStore] Failed to handle navigation confirmation:', error);
    });
  }) as EventListener);
}

export interface Tab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  pinned?: boolean;
  lastActiveAt?: number;
  createdAt?: number;
}

// Initialize navigation handler on module load (if in browser)
if (typeof window !== 'undefined') {
  import('../lib/navigation/NavigationHandler').then(({ initNavigationHandler }) => {
    initNavigationHandler();
  }).catch(() => {
    // Navigation handler not available - will initialize later
  });
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  // FIX: loadUrl is deprecated - use backend navigation events instead
  // This method is kept for backward compatibility but should not be called directly
  loadUrl: (tabId: string, url: string) => void;
  navigateTab: (tabId: string, url: string) => void; // Backend-owned navigation
  
  // NEW: Navigation methods that listen to backend events
  onNavigationConfirmed: (tabId: string, url: string, title?: string) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => {
      return {
        tabs: [],
        activeTabId: null,

      addTab: (url = '') => {
        const tabUrl = url && url !== NEWTAB && !isNewTabUrl(url) ? url : NEWTAB;
        const newTab: Tab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: tabUrl,
          title: 'New Tab',
          isLoading: false,
          lastActiveAt: Date.now(),
          createdAt: Date.now(),
        };

        set((state) => {
          // Emit event for real-time AI observation
          if (typeof window !== 'undefined') {
            import('../lib/events/EventBus').then(({ emitTabOpen }) => {
              emitTabOpen(newTab.id, tabUrl);
            }).catch(() => {
              // EventBus not available - graceful degradation
            });
          }

          return {
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
          };
        });
      },

      closeTab: (tabId: string) => {
        set((state) => {
          const tabToClose = state.tabs.find(tab => tab.id === tabId);
          const newTabs = state.tabs.filter(tab => tab.id !== tabId);
          let newActiveTabId = state.activeTabId;

          // If closing active tab, switch to another tab
          if (state.activeTabId === tabId) {
            const currentIndex = state.tabs.findIndex(tab => tab.id === tabId);
            if (newTabs.length > 0) {
              newActiveTabId = currentIndex > 0 ? newTabs[currentIndex - 1].id : newTabs[0].id;
            } else {
              newActiveTabId = null;
            }
          }

          // Emit event for real-time AI observation
          if (typeof window !== 'undefined' && tabToClose) {
            import('../lib/events/EventBus').then(({ emitTabClose }) => {
              emitTabClose(tabId);
            }).catch(() => {
              // EventBus not available - graceful degradation
            });
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      switchTab: (tabId: string) => {
        set((state) => {
          if (!state.tabs.some((t) => t.id === tabId)) {
            return state;
          }

          // Emit event for real-time AI observation
          if (typeof window !== 'undefined' && state.activeTabId !== tabId) {
            import('../lib/events/EventBus').then(({ emitTabSwitch }) => {
              emitTabSwitch(tabId);
            }).catch(() => {
              // EventBus not available - graceful degradation
            });
          }

          const now = Date.now();
          return {
            activeTabId: tabId,
            tabs: state.tabs.map((t) =>
              t.id === tabId ? { ...t, lastActiveAt: now } : t
            ),
          };
        });
      },

      updateTab: (tabId: string, updates: Partial<Tab>) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },

      loadUrl: (tabId: string, url: string) => {
        // FIX: DEPRECATED - This method should not be called directly
        // Navigation should go through CommandController → Backend → navigateTab
        console.warn('[TabsStore] loadUrl called directly. Use CommandController.handleNavigate() instead.');
        get().navigateTab(tabId, url);
      },

      // FIX: Navigation is backend-owned - only called after backend confirmation
      navigateTab: (tabId: string, url: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab) {
          console.warn(`[tabsStore] Tab ${tabId} not found for navigation`);
          return;
        }

        // Emit navigation event for real-time AI observation
        if (typeof window !== 'undefined') {
          import('../lib/events/EventBus').then(({ emitNavigate, emitPageLoad }) => {
            emitNavigate(url, tabId);
            // Also emit page load after short delay (simulating page load)
            setTimeout(() => {
              emitPageLoad(url);
            }, 500);
          }).catch(() => {
            // EventBus not available - graceful degradation
          });
        }

        // Update tab state (called only after backend confirms navigation)
        set((state) => ({
          ...state,
          tabs: state.tabs.map(t =>
            t.id === tabId
              ? {
                  ...t,
                  url,
                  title: url || 'New Tab', // Will be updated when page loads
                  isLoading: true,
                  lastActiveAt: Date.now(),
                }
              : t
          ),
        }));

        // Title hint only — isLoading clears on PAGE_LOAD / native webview events (not a fake timer).
        try {
          if (isSearchTabUrl(url)) {
            const q = getSearchQueryFromUrl(url);
            get().updateTab(tabId, {
              title: q ? `Search · ${q.slice(0, 48)}${q.length > 48 ? '…' : ''}` : 'Search',
            });
          } else if (/^https?:\/\//i.test(url)) {
            const hostname = new URL(url).hostname;
            get().updateTab(tabId, { title: hostname || 'New Tab' });
          }
        } catch {
          /* keep title until page load */
        }
      },

      // NEW: Called by backend when navigation is confirmed
      onNavigationConfirmed: (tabId: string, url: string, title?: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, url, title: title || url, isLoading: false }
              : tab
          ),
        }));
      },
    };
    },
    {
      name: 'regen-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map(tab => ({ ...tab, isLoading: false })),
        activeTabId: state.activeTabId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<TabsState> | undefined;
        if (!p?.tabs?.length) return current as TabsState;
        const activeTabId =
          p.activeTabId && p.tabs.some((t) => t.id === p.activeTabId)
            ? p.activeTabId
            : p.tabs[0].id;
        return { ...(current as TabsState), ...p, tabs: p.tabs, activeTabId };
      },
    }
  )
);