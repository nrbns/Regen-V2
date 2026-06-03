import React, { memo, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BrowserView from '../browser/BrowserView';

type Props = {
  tabId: string;
  url: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadFailed?: (message: string) => void;
  onLoadEnd?: () => void;
  preferIframe?: boolean;
  /** Whether this tab is the active browse tab (native visibility handled globally). */
  isTabActive?: boolean;
};

function RealtimeWebPaneInner({
  tabId,
  url,
  onUrlChange,
  onTitleChange,
  onLoadFailed,
  onLoadEnd,
  preferIframe,
  isTabActive = true,
}: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-[#0d0d0f]">
          <Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" />
        </div>
      }
    >
      <BrowserView
        tabId={tabId}
        url={url}
        mode="browse"
        className="h-full w-full min-h-0 flex-1"
        onUrlChange={onUrlChange}
        onTitleChange={onTitleChange}
        onLoadFailed={onLoadFailed}
        onLoadEnd={onLoadEnd}
        preferIframe={preferIframe}
        isTabActive={isTabActive}
      />
    </Suspense>
  );
}

export const RealtimeWebPane = memo(RealtimeWebPaneInner);

