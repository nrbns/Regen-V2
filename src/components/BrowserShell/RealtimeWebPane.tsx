import React, { memo, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const BrowserView = lazy(() => import('../browser/BrowserView'));

type Props = {
  tabId: string;
  url: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
};

function RealtimeWebPaneInner({ tabId, url, onUrlChange, onTitleChange }: Props) {
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
        className="w-full h-full"
        onUrlChange={onUrlChange}
        onTitleChange={onTitleChange}
      />
    </Suspense>
  );
}

export const RealtimeWebPane = memo(RealtimeWebPaneInner);

