import { lazy, Suspense, useEffect, useState } from 'react';
import type { ProfessionalAvatarProps } from './ProfessionalAvatar';
import ProfessionalAvatar from './ProfessionalAvatar';
import { getAvatarRenderMode, type AvatarRenderMode } from '../../lib/avatar/avatarMode';

const Avatar3DLazy = lazy(() => import('./Avatar3D'));

export type AdaptiveAvatarProps = ProfessionalAvatarProps & {
  mode?: AvatarRenderMode;
};

function canUse3D(): Promise<boolean> {
  // @vite-ignore — optional dep; must not break shell HMR when three is missing
  return import(/* @vite-ignore */ 'three')
    .then(() => true)
    .catch(() => false);
}

export function AdaptiveAvatar({ mode: modeProp, ...props }: AdaptiveAvatarProps) {
  const [mode, setMode] = useState<AvatarRenderMode>(() => modeProp ?? getAvatarRenderMode());
  const [use3d, setUse3d] = useState(false);
  const [ready, setReady] = useState(mode === 'art' || mode === 'svg');

  useEffect(() => {
    if (modeProp) setMode(modeProp);
  }, [modeProp]);

  useEffect(() => {
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent<AvatarRenderMode>).detail;
      if (detail) setMode(detail);
    };
    window.addEventListener('regen:avatar-mode', onMode);
    return () => window.removeEventListener('regen:avatar-mode', onMode);
  }, []);

  useEffect(() => {
    if (mode === 'art' || mode === 'svg') {
      setUse3d(false);
      setReady(true);
      return;
    }
    // 'svg' legacy → same official artwork
    if (mode === '3d') {
      void canUse3D().then((ok) => {
        setUse3d(ok);
        setReady(true);
      });
    }
  }, [mode]);

  if (!ready) {
    return <ProfessionalAvatar {...props} />;
  }

  if (use3d) {
    return (
      <Suspense fallback={<ProfessionalAvatar {...props} />}>
        <Avatar3DLazy {...props} />
      </Suspense>
    );
  }

  return <ProfessionalAvatar {...props} />;
}
