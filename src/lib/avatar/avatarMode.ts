/** Avatar render: official art (default), Three.js scene, or SVG fallback. */

export type AvatarRenderMode = 'art' | '3d' | 'svg';

const KEY = 'regen:avatar:mode';

export function getAvatarRenderMode(): AvatarRenderMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'art' || v === '3d' || v === 'svg') return v;
    // migrate old values
    if (v === 'auto') return 'art';
  } catch {
    /* ok */
  }
  return 'art';
}

export function setAvatarRenderMode(mode: AvatarRenderMode): void {
  try {
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new CustomEvent('regen:avatar-mode', { detail: mode }));
  } catch {
    /* ok */
  }
}
