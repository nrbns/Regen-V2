import { useEffect } from 'react';
import { eventBus } from '../lib/events/EventBus';
import { setCompanionEmotion } from '../lib/companion/avatarBridge';
import { isNewTabUrl, isSearchTabUrl } from '../lib/browser/normalizeUrl';

type Options = {
  isLoading?: boolean;
  isListening?: boolean;
  streamText?: string;
  isRunning?: boolean;
};

/**
 * Keeps the mini companion face in sync with realtime browser + AI activity.
 */
export function useRealtimeAvatarEmotions({
  isLoading = false,
  isListening = false,
  streamText = '',
  isRunning = false,
}: Options) {
  useEffect(() => {
    if (isListening) {
      setCompanionEmotion('listening');
      return;
    }
    if (streamText.trim()) {
      setCompanionEmotion('speaking');
      return;
    }
    if (isRunning || isLoading) {
      setCompanionEmotion('thinking');
      return;
    }
  }, [isListening, streamText, isRunning, isLoading]);

  useEffect(() => {
    const offNavigate = eventBus.on('NAVIGATE', () => {
      if (!isListening) setCompanionEmotion('thinking');
    });
    const offSearch = eventBus.on('SEARCH_SUBMIT', () => {
      setCompanionEmotion('thinking');
    });
    const offTab = eventBus.onMany(['TAB_OPEN', 'TAB_SWITCH'], () => {
      setCompanionEmotion('noticing', { revertMs: 1200, revertTo: 'idle' });
    });
    const offLoad = eventBus.on('PAGE_LOAD', () => {
      setCompanionEmotion('happy', { revertMs: 2200, revertTo: 'idle' });
    });
    const offErr = eventBus.on('PAGE_ERROR', () => {
      setCompanionEmotion('noticing', { revertMs: 2800, revertTo: 'idle' });
    });

    return () => {
      offNavigate();
      offSearch();
      offTab();
      offLoad();
      offErr();
    };
  }, [isListening]);

}

export function emotionForBrowseUrl(url: string | undefined) {
  if (!url || isNewTabUrl(url)) return 'idle' as const;
  if (isSearchTabUrl(url)) return 'thinking' as const;
  return 'noticing' as const;
}
