/**
 * Regen professional avatar — uses the official 3D character artwork (reference UI).
 */

import { useState } from 'react';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';
import { EMOTION_COLORS, EMOTION_GLOW, EMOTION_LABELS } from './avatarStyles';

export type ProfessionalAvatarEmotion =
  | 'idle'
  | 'happy'
  | 'thinking'
  | 'speaking'
  | 'listening'
  | 'noticing'
  | AvatarEmotion;

export interface ProfessionalAvatarProps {
  emotion?: ProfessionalAvatarEmotion;
  /** Width in px; height follows artwork aspect (~1.15–1.28). */
  size?: number;
  intensity?: number;
  className?: string;
  showLabel?: boolean;
  /** Use full-body art for hero / new-tab layouts */
  variant?: 'hero' | 'half' | 'auto';
}

const ASSETS = {
  hero: '/images/regen-avatar-hero.png',
  full: '/images/regen-avatar-full.png',
  half: '/images/character-half.png',
  sm: '/images/character-half-sm.png',
} as const;

const ASPECT_HERO = 1.12;
const ASPECT_HALF = 1.28;

function toCore(emotion: ProfessionalAvatarEmotion): AvatarEmotion {
  switch (emotion) {
    case 'happy':
    case 'excited':
      return 'happy';
    case 'thinking':
    case 'curious':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'listening':
      return 'listening';
    case 'noticing':
    case 'concerned':
    case 'sad':
      return 'noticing';
    case 'calm':
      return 'idle';
    default:
      return emotion in EMOTION_COLORS ? (emotion as AvatarEmotion) : 'idle';
  }
}

const EMOTION_ANIM: Record<string, string> = {
  idle: 'regen-avatar-float 3.2s ease-in-out infinite',
  happy: 'regen-avatar-float 2.4s ease-in-out infinite',
  thinking: 'regen-avatar-tilt 3.6s ease-in-out infinite',
  speaking: 'regen-avatar-nod 1.2s ease-in-out infinite',
  listening: 'regen-avatar-lean 2.8s ease-in-out infinite',
  noticing: 'regen-avatar-bounce 0.9s ease-in-out infinite',
};

function pickSrc(size: number, variant: 'hero' | 'half' | 'auto'): string {
  if (variant === 'hero') return ASSETS.hero;
  if (variant === 'half') return size <= 120 ? ASSETS.sm : ASSETS.half;
  if (size >= 300) return ASSETS.hero;
  if (size >= 200) return ASSETS.full;
  if (size <= 120) return ASSETS.sm;
  return ASSETS.half;
}

function pickAspect(variant: 'hero' | 'half' | 'auto', size: number): number {
  if (variant === 'hero' || size >= 300) return ASPECT_HERO;
  return ASPECT_HALF;
}

export default function ProfessionalAvatar({
  emotion = 'idle',
  size = 280,
  intensity = 1,
  className = '',
  showLabel = true,
  variant = 'auto',
}: ProfessionalAvatarProps) {
  const [failed, setFailed] = useState(false);
  const core = toCore(emotion);
  const accent = EMOTION_COLORS[core] ?? '#f0a030';
  const glow = EMOTION_GLOW[core] ?? EMOTION_GLOW.idle;
  const label = EMOTION_LABELS[core] ?? core;
  const src = pickSrc(size, variant);
  const aspect = pickAspect(variant, size);
  const h = Math.round(size * aspect);
  const anim = EMOTION_ANIM[core] ?? EMOTION_ANIM.idle;

  const imgFilter =
    core === 'thinking'
      ? 'brightness(1.03) saturate(0.92)'
      : core === 'listening'
        ? 'brightness(1.06)'
        : core === 'noticing'
          ? 'brightness(1.08) contrast(1.05)'
          : undefined;

  return (
    <div
      data-avatar
      data-avatar-renderer="art"
      data-avatar-emotion={core}
      className={`regen-professional-avatar ${className}`}
      style={{
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      role="img"
      aria-label={`Regen — ${label}`}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: h,
          animation: anim,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '8% 2% 4%',
            borderRadius: '50%',
            background: glow,
            opacity: 0.45 + 0.35 * intensity,
            filter: 'blur(14px)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '12% 6%',
            boxShadow: `0 0 ${28 * intensity}px ${accent}66`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {!failed ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom center',
              position: 'relative',
              zIndex: 1,
              filter: imgFilter,
              transform:
                core === 'speaking'
                  ? 'scale(1.02)'
                  : core === 'happy'
                    ? 'scale(1.015)'
                    : undefined,
              transition: 'transform 0.35s ease, filter 0.35s ease',
            }}
          />
        ) : (
          <img
            src={ASSETS.half}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        {core === 'thinking' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '2%',
              right: '8%',
              display: 'flex',
              gap: 5,
              zIndex: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accent,
                  animation: `regen-dot-bounce 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
        }}
      >
        <span
          title={label}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 ${10 + 10 * intensity}px ${accent}`,
            animation: 'regen-pulse 1.6s ease-in-out infinite',
          }}
        />
        {showLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'capitalize',
              color: accent,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export { ProfessionalAvatar };
