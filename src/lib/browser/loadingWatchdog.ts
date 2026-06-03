/** Clears tab loading state if page-loaded never fires (tab switch, cached webview). */

const timers = new Map<string, ReturnType<typeof setTimeout>>();

const DEFAULT_MS = 12_000;

export function scheduleLoadingWatchdog(
  tabId: string,
  clearLoading: () => void,
  ms = DEFAULT_MS
): void {
  cancelLoadingWatchdog(tabId);
  timers.set(
    tabId,
    setTimeout(() => {
      timers.delete(tabId);
      clearLoading();
    }, ms)
  );
}

export function cancelLoadingWatchdog(tabId: string): void {
  const t = timers.get(tabId);
  if (t) {
    clearTimeout(t);
    timers.delete(tabId);
  }
}
