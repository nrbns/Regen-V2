import { companionDebug } from '../companion/companionDebug';

const CHAT_KEY = 'regen:companion:chat';
const DEBUG_KEY = 'regen:companion:debug';

/** Trim companion caches when heap is high. */
export function trimCompanionMemory() {
  try {
    companionDebug.trim?.();

    const chat = localStorage.getItem(CHAT_KEY);
    if (chat) {
      const parsed = JSON.parse(chat);
      if (Array.isArray(parsed) && parsed.length > 50) {
        localStorage.setItem(CHAT_KEY, JSON.stringify(parsed.slice(-50)));
      }
    }

    const dbg = localStorage.getItem(DEBUG_KEY);
    if (dbg && dbg.length > 40_000) {
      localStorage.setItem(DEBUG_KEY, dbg.slice(-20_000));
    }

    const tabs = localStorage.getItem('regen-tabs');
    if (tabs && tabs.length > 200_000) {
      const state = JSON.parse(tabs);
      if (state?.state?.tabs?.length > 8) {
        state.state.tabs = state.state.tabs.slice(-8);
        localStorage.setItem('regen-tabs', JSON.stringify(state));
      }
    }
  } catch {
    /* ignore */
  }
}
