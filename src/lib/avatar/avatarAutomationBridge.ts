import type { UserEmotionPrimary } from '../emotion/types';

export interface AvatarSuggestionPayload {
  message: string;
  suggestions: string[];
  userEmotion: UserEmotionPrimary;
  avatarEmotion: string;
}

export function dispatchAvatarSuggestions(payload: AvatarSuggestionPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('regen:avatar-suggestions', { detail: payload }));
}

export function dispatchAvatarGreeting(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('regen:avatar-greeting', { detail: { message } })
  );
}
