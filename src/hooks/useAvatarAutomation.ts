import { useCallback, useEffect, useState } from 'react';
import type { AvatarSuggestionPayload } from '../lib/avatar/avatarAutomationBridge';
import { getAutomationLoop } from '../lib/automation/automationLoop';
import {
  recordSuggestionAccepted,
  recordSuggestionDismissed,
} from '../lib/avatar/initializeAvatarSystem';
import type { UserEmotionPrimary } from '../lib/emotion/types';
import { memoryManager } from '../lib/optimization/memoryManager';

export function useAvatarAutomation(pageError?: string | null, visionSnippet?: string) {
  const [payload, setPayload] = useState<AvatarSuggestionPayload | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [memoryPercent, setMemoryPercent] = useState(0);

  useEffect(() => {
    getAutomationLoop().setOptions({ pageError, visionSnippet });
  }, [pageError, visionSnippet]);

  useEffect(() => {
    const onSuggestions = (e: Event) => {
      const detail = (e as CustomEvent<AvatarSuggestionPayload>).detail;
      if (detail) setPayload(detail);
    };
    const onGreeting = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) setGreeting(detail.message);
    };
    const onMem = (e: Event) => {
      const pct = (e as CustomEvent<{ percent: number }>).detail?.percent;
      if (typeof pct === 'number') setMemoryPercent(pct);
    };

    window.addEventListener('regen:avatar-suggestions', onSuggestions);
    window.addEventListener('regen:avatar-greeting', onGreeting);
    window.addEventListener('regen:memory-status', onMem);

    return () => {
      window.removeEventListener('regen:avatar-suggestions', onSuggestions);
      window.removeEventListener('regen:avatar-greeting', onGreeting);
      window.removeEventListener('regen:memory-status', onMem);
    };
  }, []);

  const acceptSuggestion = useCallback(
    (text: string, emotion: UserEmotionPrimary) => {
      recordSuggestionAccepted(text, emotion);
      setPayload(null);
      return text;
    },
    []
  );

  const dismissSuggestions = useCallback((emotion: UserEmotionPrimary, first?: string) => {
    if (first) recordSuggestionDismissed(first, emotion);
    getAutomationLoop().dismissSuggestions();
    setPayload(null);
  }, []);

  const clearGreeting = useCallback(() => setGreeting(null), []);

  return {
    suggestions: payload,
    greeting,
    memoryPercent: memoryPercent || memoryManager.getLastPercent(),
    acceptSuggestion,
    dismissSuggestions,
    clearGreeting,
  };
}
