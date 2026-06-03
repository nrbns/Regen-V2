import { useEffect, useState } from 'react';
import { getAvatarRenderMode, setAvatarRenderMode, type AvatarRenderMode } from '../../lib/avatar/avatarMode';

const MODES: { id: AvatarRenderMode; label: string }[] = [
  { id: 'art', label: 'Photo' },
  { id: '3d', label: '3D' },
  { id: 'svg', label: 'Lite' },
];

export function AvatarModeToggle() {
  const [current, setCurrent] = useState<AvatarRenderMode>(() => getAvatarRenderMode());

  useEffect(() => {
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent<AvatarRenderMode>).detail;
      setCurrent(detail ?? getAvatarRenderMode());
    };
    window.addEventListener('regen:avatar-mode', onMode);
    return () => window.removeEventListener('regen:avatar-mode', onMode);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginTop: 8,
        justifyContent: 'center',
      }}
      role="group"
      aria-label="Avatar render mode"
    >
      {MODES.map((m) => {
        const active = current === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setAvatarRenderMode(m.id)}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              borderRadius: 6,
              border: active ? '1px solid #f0a03088' : '1px solid #ffffff14',
              background: active ? '#f0a03022' : 'transparent',
              color: active ? '#f0eeea' : '#8a8884',
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
