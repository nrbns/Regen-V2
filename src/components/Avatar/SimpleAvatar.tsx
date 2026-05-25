import type { AvatarEmotion } from '../../lib/companion/companionConfig';

const EMOTION_COLORS: Record<string, string> = {
  idle: '#f0a030',
  listening: '#5b9cf5',
  thinking: '#7eb8ff',
  speaking: '#6dd4a0',
  noticing: '#e8c547',
  happy: '#6dd4a0',
  concerned: '#e8a84a',
  excited: '#ff9f5a',
  curious: '#c9a0ff',
  calm: '#8ab4c4',
  sad: '#e85d5d',
};

const EMOTION_ANIM: Record<string, string> = {
  happy: 'regen-float 2.5s ease-in-out infinite',
  excited: 'regen-pulse 1.2s ease-in-out infinite',
  concerned: 'regen-float 4s ease-in-out infinite',
  curious: 'regen-float 3.2s ease-in-out infinite',
  thinking: 'regen-float 3.8s ease-in-out infinite',
  calm: 'regen-float 4.5s ease-in-out infinite',
};

export type SimpleAvatarEmotion = AvatarEmotion | 'noticing' | 'sad';

export interface SimpleAvatarProps {
  emotion?: SimpleAvatarEmotion;
  size?: number;
  className?: string;
}

export function SimpleAvatar({
  emotion = 'idle',
  size = 200,
  className = '',
}: SimpleAvatarProps) {
  const accent = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.idle;

  return (
    <div
      data-avatar
      className={`regen-simple-avatar ${className}`}
      style={{
        width: size,
        height: Math.round(size * 1.35),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
        animation: EMOTION_ANIM[emotion] ?? 'regen-float 3s ease-in-out infinite',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '10% 5%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}44 0%, transparent 70%)`,
          animation: 'regen-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          fontSize: size * 0.42,
          lineHeight: 1,
          filter: `drop-shadow(0 0 12px ${accent}88)`,
          zIndex: 1,
        }}
        aria-hidden
      >
        🤖
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          textTransform: 'capitalize',
          color: accent,
          letterSpacing: '0.08em',
          zIndex: 1,
        }}
      >
        {emotion}
      </div>
      <span
        title="Online"
        style={{
          position: 'absolute',
          top: size * 0.12,
          right: size * 0.18,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#3dd68c',
          border: '2px solid #0f1623',
          boxShadow: '0 0 8px #3dd68c88',
          animation: 'regen-pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}
