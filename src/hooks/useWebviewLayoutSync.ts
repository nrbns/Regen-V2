/**
 * Keeps native browse webviews sized to the content pane while the shell is open.
 */

import { useEffect } from 'react';
import { isTauriShell } from '../lib/tauri/runtime';
import { useBrowseEngineStore } from '../lib/browser/browseEngineStore';
import { useTabsStore } from '../state/tabsStore';
import { isNewTabUrl } from '../lib/browser/normalizeUrl';
import { syncTabWebviewBounds } from '../lib/browser/tabWebviewSync';

export function useWebviewLayoutSync() {
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const activeUrl = useTabsStore((s) => {
    const t = s.tabs.find((tab) => tab.id === s.activeTabId);
    return t?.url ?? '';
  });
  const engine = useBrowseEngineStore((s) => s.engine);

  useEffect(() => {
    if (!isTauriShell() || engine === 'iframe') return;

    const runBounds = () => {
      if (!activeTabId || isNewTabUrl(activeUrl)) return;
      void syncTabWebviewBounds(activeTabId);
    };

    runBounds();
    const t1 = window.setTimeout(runBounds, 200);
    const t2 = window.setTimeout(runBounds, 800);

    const pane = document.getElementById('regen-browser-content-pane');
    const ro = pane
      ? new ResizeObserver(() => {
          if (activeTabId && !isNewTabUrl(activeUrl)) {
            void syncTabWebviewBounds(activeTabId);
          }
          window.dispatchEvent(new CustomEvent('regen:sync-webview-bounds'));
        })
      : null;
    if (pane && ro) ro.observe(pane);

    window.addEventListener('resize', runBounds);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', runBounds);
    };
  }, [activeTabId, activeUrl, engine]);
}
