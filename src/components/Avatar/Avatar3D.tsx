/**
 * Premium 3D avatar — textured character + emotion lighting (Three.js).
 */

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useTexture } from '@react-three/drei';
import type { Group, PointLight } from 'three';
import type { ProfessionalAvatarProps, ProfessionalAvatarEmotion } from './ProfessionalAvatar';
import ProfessionalAvatar from './ProfessionalAvatar';
import { EMOTION_COLORS, EMOTION_LABELS, EMOTION_GLOW } from './avatarStyles';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';

const ASPECT = 360 / 280;
const TEX = '/images/regen-avatar-hero.png';

type CoreEmotion = 'idle' | 'happy' | 'thinking' | 'speaking' | 'listening' | 'noticing';

function toCore(emotion: ProfessionalAvatarEmotion): CoreEmotion {
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
    default:
      return 'idle';
  }
}

function emotionAccent(core: CoreEmotion): string {
  const key = core as AvatarEmotion;
  return EMOTION_COLORS[key] ?? '#f0a030';
}

function FloatConfig(core: CoreEmotion) {
  switch (core) {
    case 'happy':
      return { speed: 2.2, floatIntensity: 0.35, rotationIntensity: 0.08 };
    case 'thinking':
      return { speed: 1.4, floatIntensity: 0.2, rotationIntensity: 0.12 };
    case 'speaking':
      return { speed: 3.5, floatIntensity: 0.15, rotationIntensity: 0.05 };
    case 'listening':
      return { speed: 1.8, floatIntensity: 0.25, rotationIntensity: 0.15 };
    case 'noticing':
      return { speed: 4, floatIntensity: 0.4, rotationIntensity: 0.1 };
    default:
      return { speed: 1.6, floatIntensity: 0.22, rotationIntensity: 0.06 };
  }
}

function CharacterMesh({
  emotion,
  intensity,
}: {
  emotion: CoreEmotion;
  intensity: number;
}) {
  const texture = useTexture(TEX);
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const accent = emotionAccent(emotion);
  const floatCfg = FloatConfig(emotion);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      const bob =
        emotion === 'speaking'
          ? Math.sin(t * 6) * 0.03
          : emotion === 'noticing'
            ? Math.sin(t * 4) * 0.04
            : Math.sin(t * 1.2) * 0.02;
      group.current.position.y = bob;
      if (emotion === 'listening') {
        group.current.rotation.z = Math.sin(t * 1.5) * 0.04;
      }
    }
    if (light.current) {
      light.current.intensity = 0.8 + intensity * 1.2 + Math.sin(t * 2) * 0.15;
    }
  });

  const scale =
    emotion === 'noticing' ? 1.04 : emotion === 'happy' ? 1.02 : 1;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 4, 3]} intensity={0.9} castShadow={false} />
      <pointLight ref={light} position={[0, 1.2, 2.5]} color={accent} intensity={1.2} />
      <Float {...floatCfg}>
        <group ref={group} scale={scale}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[2.1, 2.1 * 1.28]} />
            <meshStandardMaterial
              map={texture}
              transparent
              roughness={0.45}
              metalness={0.05}
              emissive={accent}
              emissiveIntensity={0.08 + intensity * 0.12}
            />
          </mesh>
        </group>
      </Float>
    </>
  );
}

function Avatar3DScene({
  emotion = 'idle',
  size = 280,
  intensity = 1,
}: Pick<ProfessionalAvatarProps, 'emotion' | 'size' | 'intensity'>) {
  const core = toCore(emotion ?? 'idle');
  const h = Math.round(size * ASPECT);

  return (
    <div style={{ width: size, height: h, position: 'relative' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: EMOTION_GLOW[core as AvatarEmotion] ?? 'transparent',
          opacity: 0.5,
          filter: 'blur(16px)',
          pointerEvents: 'none',
        }}
      />
      <Canvas
        camera={{ position: [0, 0.2, 4.2], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <CharacterMesh emotion={core} intensity={intensity} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default function Avatar3D(props: ProfessionalAvatarProps) {
  const {
    emotion = 'idle',
    size = 280,
    intensity = 1,
    showLabel = true,
    className = '',
  } = props;
  const core = toCore(emotion);
  const accent = emotionAccent(core);
  const label = EMOTION_LABELS[core as AvatarEmotion] ?? core;

  return (
    <div
      className={className}
      data-avatar
      data-avatar-renderer="3d"
      data-avatar-emotion={core}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <Avatar3DScene emotion={emotion} size={size} intensity={intensity} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 ${12 + 8 * intensity}px ${accent}`,
            animation: 'regen-pulse 1.6s ease-in-out infinite',
          }}
        />
        {showLabel && (
          <span style={{ fontSize: 11, color: accent, textTransform: 'capitalize', letterSpacing: '0.06em' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

useTexture.preload(TEX);
