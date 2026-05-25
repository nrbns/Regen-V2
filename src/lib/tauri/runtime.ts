/**
 * Reliable Tauri desktop detection (Tauri 2 + Vite dev with REGEN_TAURI=1).
 */

export function isTauriShell(): boolean {
  if (typeof window === 'undefined') return false;

  const w = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  if (w.__TAURI__ !== undefined || w.__TAURI_INTERNALS__ !== undefined) {
    return true;
  }

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  if (env.TAURI_ENV_PLATFORM || env.TAURI_PLATFORM || env.TAURI_ARCH) {
    return true;
  }

  return false;
}
