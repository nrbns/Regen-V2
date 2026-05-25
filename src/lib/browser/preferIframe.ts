/**
 * When true, use sandbox iframe instead of Tauri native webview (dev / fallback).
 */
export function preferIframeBrowser(): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  return env.VITE_REGEN_IFRAME_BROWSER === '1' || env.VITE_REGEN_IFRAME_BROWSER === 'true';
}
