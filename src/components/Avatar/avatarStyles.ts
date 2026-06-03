import type { AvatarEmotion } from '../../lib/companion/companionConfig';

export type AvatarMode = 'general' | 'research' | 'mini' | 'onboarding' | 'settings' | 'compact';

export const AVATAR_SIZES: Record<AvatarMode, { width: number; height: number }> = {
  general: { width: 280, height: 360 },
  research: { width: 160, height: 200 },
  /** Scaled layout only — same character-half.png artwork */
  mini: { width: 120, height: 154 },
  onboarding: { width: 200, height: 250 },
  settings: { width: 140, height: 140 },
  compact: { width: 48, height: 48 },
};

export const EMOTION_COLORS: Record<AvatarEmotion, string> = {
  idle: '#8090B0',
  listening: '#378ADD',
  thinking: '#7F77DD',
  speaking: '#F0A030',
  noticing: '#EF9F27',
  happy: '#4A9960',
  concerned: '#e8a84a',
  excited: '#ff9f5a',
  curious: '#c9a0ff',
  calm: '#8ab4c4',
};

export const EMOTION_LABELS: Record<AvatarEmotion, string> = {
  idle: 'Here with you',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  noticing: 'Noticing…',
  happy: 'Page ready',
  concerned: 'Checking…',
  excited: 'Great find!',
  curious: 'Exploring…',
  calm: 'Ready',
};

export const EMOTION_GLOW: Record<AvatarEmotion, string> = {
  idle: 'transparent',
  listening: 'radial-gradient(circle, rgba(55,138,221,0.25) 0%, transparent 70%)',
  thinking: 'radial-gradient(circle, rgba(127,119,221,0.25) 0%, transparent 70%)',
  speaking: 'radial-gradient(circle, rgba(240,160,48,0.28) 0%, transparent 70%)',
  noticing: 'radial-gradient(circle, rgba(239,159,39,0.25) 0%, transparent 70%)',
  happy: 'radial-gradient(circle, rgba(74,153,96,0.28) 0%, transparent 70%)',
  concerned: 'radial-gradient(circle, rgba(232,168,74,0.22) 0%, transparent 70%)',
  excited: 'radial-gradient(circle, rgba(255,159,90,0.28) 0%, transparent 70%)',
  curious: 'radial-gradient(circle, rgba(201,160,255,0.22) 0%, transparent 70%)',
  calm: 'radial-gradient(circle, rgba(138,180,196,0.18) 0%, transparent 70%)',
};

export const AVATAR_CSS = `
@keyframes regen-avatar-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes regen-avatar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.88; }
}
@keyframes regen-avatar-jump {
  0% { transform: translateY(0); }
  40% { transform: translateY(-14px); }
  100% { transform: translateY(0); }
}
@keyframes regen-dot-bounce {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}
@keyframes regen-status-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.12); opacity: 1; }
}
@keyframes regen-avatar-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.015); }
}
@keyframes regen-avatar-lean {
  0%, 100% { transform: rotate(0deg) scale(1.02); }
  50% { transform: rotate(-2deg) scale(1.04); }
}
.regen-avatar-wrap { will-change: transform, opacity; }
.regen-avatar-img--idle { animation: regen-avatar-breathe 4s ease-in-out infinite; }
.regen-avatar-img--listening { animation: regen-avatar-bob 1.5s ease-in-out infinite; }
.regen-avatar-img--thinking { animation: regen-avatar-pulse 2s ease-in-out infinite; }
.regen-avatar-img--speaking { animation: regen-avatar-bob 1s ease-in-out infinite; }
.regen-avatar-img--happy { animation: regen-avatar-jump 0.6s ease-out; }
.regen-avatar-img--noticing { animation: regen-avatar-lean 1.8s ease-in-out infinite; }
`;
