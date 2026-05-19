import type { AvatarEmotion } from './companionConfig';

export type AvatarCompanionApi = {
  updateEmotion: (emotion: AvatarEmotion, opts?: { autoRevert?: boolean }) => void;
  getEmotion: () => AvatarEmotion;
};

export function setAvatarEmotion(emotion: AvatarEmotion) {
  window.avatarCompanion?.updateEmotion(emotion);
}

declare global {
  interface Window {
    avatarCompanion?: AvatarCompanionApi;
  }
}
