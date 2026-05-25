/**
 * Renders every tab's browser surface; only the active tab is visible.
 * Keeps native webviews alive when switching (hide/show, not destroy).
 */

import { useEffect } from 'react';
import type { Tab } from '../../state/tabsStore';
import { isNewTabUrl } from '../../lib/browser/normalizeUrl';
import { syncActiveTabWebview } from '../../lib/browser/tabWebviewSync';
import { isTauriShell } from '../../lib/tauri/runtime';
import { RealtimeWebPane } from './RealtimeWebPane';

type Props = {
  tabs: Tab[];
  activeTabId: string | null;
  activeUrl: string;
  isNewTab: boolean;
  preferIframe?: boolean;
  onLoadFailed?: (message: string) => void;
  onLoadEnd?: () => void;
  onUrlChange: (tabId: string, url: string) => void;
  onTitleChange: (tabId: string, title: string) => void;
  newTabPage: React.ReactNode;
};

export function TabContentStack({
  tabs,
  activeTabId,
  activeUrl,
  isNewTab,
  preferIframe,
  onLoadFailed,
  onLoadEnd,
  onUrlChange,
  onTitleChange,
  newTabPage,
}: Props) {
  useEffect(() => {
    if (!isTauriShell() || preferIframe) return;
    void syncActiveTabWebview(activeTabId, activeUrl);
  }, [activeTabId, activeUrl, preferIframe]);

  if (isNewTab) {
    return <>{newTabPage}</>;
  }

  return (
    <>
      {tabs.map((tab) => {
        if (isNewTabUrl(tab.url)) {
          return null;
        }
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            style={{
              display: isActive ? 'flex' : 'none',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            aria-hidden={!isActive}
          >
            <RealtimeWebPane
              tabId={tab.id}
              url={tab.url}
              visible={isActive}
              preferIframe={preferIframe}
              onUrlChange={(u) => onUrlChange(tab.id, u)}
              onTitleChange={(t) => onTitleChange(tab.id, t)}
              onLoadFailed={isActive ? onLoadFailed : undefined}
              onLoadEnd={isActive ? onLoadEnd : undefined}
            />
          </div>
        );
      })}
    </>
  );
}
