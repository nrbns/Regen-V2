/**
 * Lazy tab webviews — only the active tab keeps a live WebView2 renderer.
 * Inactive tabs: destroy OS webview after a short delay; URL/session stay in tabsStore.
 */

import { closeTabWebview, shouldRunNativeWebviewCommands } from './tabWebviewSync';

/** Delay before tearing down an inactive tab's webview (ms). */
const SLEEP_MS = 45_000;

const sleepTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function clearTabWebviewSleep(tabId: string): void {
  const t = sleepTimers.get(tabId);
  if (t) clearTimeout(t);
  sleepTimers.delete(tabId);
}

export function scheduleTabWebviewSleep(tabId: string): void {
  if (!shouldRunNativeWebviewCommands()) return;
  clearTabWebviewSleep(tabId);
  sleepTimers.set(
    tabId,
    setTimeout(() => {
      sleepTimers.delete(tabId);
      void closeTabWebview(tabId);
    }, SLEEP_MS)
  );
}

/** Active tab gets a webview; all other browse tabs are scheduled for sleep. */
export function reconcileTabWebviewLifecycle(
  activeTabId: string | null,
  tabIds: string[]
): void {
  if (!shouldRunNativeWebviewCommands()) return;
  for (const id of tabIds) {
    if (id === activeTabId) clearTabWebviewSleep(id);
    else scheduleTabWebviewSleep(id);
  }
}

/** Immediately drop every inactive tab webview (e.g. after opening many tabs). */
export function suspendInactiveTabWebviewsNow(
  activeTabId: string | null,
  tabIds: string[]
): void {
  if (!shouldRunNativeWebviewCommands()) return;
  for (const id of tabIds) {
    if (id !== activeTabId) {
      clearTabWebviewSleep(id);
      void closeTabWebview(id);
    } else {
      clearTabWebviewSleep(id);
    }
  }
}
