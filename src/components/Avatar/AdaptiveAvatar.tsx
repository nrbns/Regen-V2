import { useEffect, useState } from 'react';
import { SimpleAvatar, type SimpleAvatarEmotion, type SimpleAvatarProps } from './SimpleAvatar';

const GLB_PATH = '/models/avatar.glb';

export type AdaptiveAvatarProps = SimpleAvatarProps;

/**
 * Uses SimpleAvatar by default. When `public/models/avatar.glb` exists, reserves
 * a hook for a future Three.js viewer (install @react-three/fiber to enable).
 */
export function AdaptiveAvatar(props: AdaptiveAvatarProps) {
  const [hasGlb, setHasGlb] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(GLB_PATH, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled && r.ok) setHasGlb(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasGlb) {
    return (
      <div style={{ position: 'relative' }}>
        <SimpleAvatar {...props} />
        <span
          title="3D model detected — add @react-three/fiber to enable GLB viewer"
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#f0a03033',
            color: '#f0a030',
          }}
        >
          3D ready
        </span>
      </div>
    );
  }

  return <SimpleAvatar {...(props as { emotion?: SimpleAvatarEmotion; size?: number; className?: string })} />;
}
