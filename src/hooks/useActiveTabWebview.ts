/**
 * Single owner for native tab webview show/hide — avoids races between shell, stack, and layout sync.
 */

import { useEffect, useRef } from 'react';
import { isNewTabUrl } from '../lib/browser/normalizeUrl';
import { activateTabWebview, hideAllTabWebviews, shouldRunNativeWebviewCommands } from '../lib/browser/tabWebviewSync';
import { fetchNativePageState } from '../lib/browser/nativePageSync';
import { isTauriShell } from '../lib/tauri/runtime';
import { useBrowseEngineStore } from '../lib/browser/browseEngineStore';
import { useTabsStore } from '../state/tabsStore';

export function useActiveTabWebview(activeTabId: string | null, activeUrl: string) {
  const lastKey = useRef('');
  const lastActiveTabId = useRef<string | null>(null);
  const engine = useBrowseEngineStore((s) => s.engine);

  useEffect(() => {
    const onProfile = () => {
      lastKey.current = '';
    };
    window.addEventListener('regen:profile-changed', onProfile);
    return () => window.removeEventListener('regen:profile-changed', onProfile);
  }, []);

  useEffect(() => {
    if (!shouldRunNativeWebviewCommands()) {
      if (isTauriShell()) void hideAllTabWebviews();
      return;
    }

    const tabChanged = activeTabId !== lastActiveTabId.current;
    lastActiveTabId.current = activeTabId;

    const key = `${activeTabId ?? ''}\0${activeUrl}\0${engine}`;
    if (!tabChanged && key === lastKey.current) return;
    lastKey.current = key;

    if (!activeTabId || isNewTabUrl(activeUrl)) {
      void hideAllTabWebviews();
      return;
    }

    useTabsStore.getState().updateTab(activeTabId, { isLoading: false });

    void activateTabWebview(activeTabId, activeUrl).then(() => {
      void fetchNativePageState(activeTabId);
    });
  }, [activeTabId, activeUrl, engine]);
}
