import type { AvatarEmotion } from './companionConfig';
import { companionDebug } from './companionDebug';

export type AvatarCompanionApi = {
  updateEmotion: (emotion: AvatarEmotion, opts?: { autoRevert?: boolean }) => void;
  getEmotion: () => AvatarEmotion;
};

let revertTimer: ReturnType<typeof setTimeout> | null = null;

/** Single source of truth for companion face state (all AvatarCompanion instances read this). */
export function setCompanionEmotion(
  emotion: AvatarEmotion,
  opts?: { revertMs?: number; revertTo?: AvatarEmotion }
) {
  if (revertTimer) {
    clearTimeout(revertTimer);
    revertTimer = null;
  }

  companionDebug.patch({ emotion });
  window.avatarCompanion?.updateEmotion(emotion, { autoRevert: false });

  const ms = opts?.revertMs;
  if (ms && ms > 0) {
    revertTimer = setTimeout(() => {
      const back = opts.revertTo ?? 'idle';
      companionDebug.patch({ emotion: back });
      window.avatarCompanion?.updateEmotion(back, { autoRevert: false });
      revertTimer = null;
    }, ms);
  }
}

/** @deprecated Use setCompanionEmotion */
export function setAvatarEmotion(emotion: AvatarEmotion) {
  setCompanionEmotion(emotion);
}

declare global {
  interface Window {
    avatarCompanion?: AvatarCompanionApi;
  }
}
