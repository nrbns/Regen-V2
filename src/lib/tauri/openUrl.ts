import { isTauriShell } from './runtime';

/** Open http(s) URL in the system default browser. */
export async function openUrlInBrowser(url: string): Promise<void> {
  if (!url || !/^https?:\/\//i.test(url)) return;

  if (!isTauriShell()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('plugin:shell|open', { path: url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
