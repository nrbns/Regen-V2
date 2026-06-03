/**
 * Renders every tab's browser surface; only the active tab is visible.
 * Native webviews: hide/show per tab (not destroyed on switch) — see useActiveTabWebview.
 */

import type { Tab } from '../../state/tabsStore';
import { isNewTabUrl } from '../../lib/browser/normalizeUrl';
import { useActiveTabWebview } from '../../hooks/useActiveTabWebview';
import { useBrowseEngineStore } from '../../lib/browser/browseEngineStore';
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
  const engine = useBrowseEngineStore((s) => s.engine);
  const nativeFailedByTab = useBrowseEngineStore((s) => s.nativeFailedByTab);

  const forceIframe =
    preferIframe ||
    engine === 'iframe' ||
    (engine === 'auto' && activeTabId ? !!nativeFailedByTab[activeTabId] : false);

  useActiveTabWebview(activeTabId, activeUrl);

  const browseTabs = tabs.filter((t) => !isNewTabUrl(t.url));

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {browseTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const tabUseIframe =
          preferIframe ||
          engine === 'iframe' ||
          (engine === 'auto' && !!nativeFailedByTab[tab.id]);
        const paneVisible = isActive && !isNewTab;

        return (
          <div
            key={tab.id}
            data-tab-slot={tab.id}
            style={{
              position: 'absolute',
              inset: 0,
              display: paneVisible ? 'flex' : 'none',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: paneVisible ? 'auto' : 'none',
              zIndex: paneVisible ? 1 : 0,
            }}
            aria-hidden={!paneVisible}
          >
            <RealtimeWebPane
              tabId={tab.id}
              url={tab.url}
              isTabActive={isActive}
              preferIframe={tabUseIframe}
              onUrlChange={(u) => onUrlChange(tab.id, u)}
              onTitleChange={(t) => onTitleChange(tab.id, t)}
              onLoadFailed={paneVisible ? onLoadFailed : undefined}
              onLoadEnd={paneVisible ? onLoadEnd : undefined}
            />
          </div>
        );
      })}

      {isNewTab && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2,
            background: '#0f1623',
          }}
        >
          {newTabPage}
        </div>
      )}
    </div>
  );
}
