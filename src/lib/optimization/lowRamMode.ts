/** Read low-RAM flag from persisted settings (synced from Tauri / Settings UI). */
export function isLowRamModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('regen:settings-v1');
    if (!raw) return false;
    const s = JSON.parse(raw) as { low_ram_mode?: boolean; lowRamMode?: boolean };
    return !!(s.low_ram_mode ?? s.lowRamMode);
  } catch {
    return false;
  }
}

export function getVisionIntervalMs(baseMs: number): number {
  if (isLowRamModeEnabled()) return Math.max(baseMs, 8000);
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  if (mem && mem.usedJSHeapSize > 400 * 1024 * 1024) return Math.max(baseMs, 6000);
  return baseMs;
}
