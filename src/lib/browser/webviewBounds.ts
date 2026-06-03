/**

 * Bounds for Tauri child webviews (logical/CSS pixels).

 * Uses the content pane's getBoundingClientRect — already below chrome, left of sidebar.

 */



/** Expanded AI companion rail (Arc-style). */
export const REGEN_SIDEBAR_EXPANDED_PX = 280;
/** Collapsed rail — ~10% on typical laptop widths. */
export const REGEN_SIDEBAR_COLLAPSED_PX = 56;
/** @deprecated Use getRegenSidebarWidthPx() */
export const REGEN_SIDEBAR_WIDTH_PX = REGEN_SIDEBAR_EXPANDED_PX;

export function getRegenSidebarWidthPx(): number {
  if (typeof document === 'undefined') return REGEN_SIDEBAR_EXPANDED_PX;
  const el = document.getElementById(SIDEBAR_ID);
  if (el) {
    const w = el.getBoundingClientRect().width;
    if (w > 0) return Math.round(w);
  }
  const collapsed = document.documentElement.dataset.regenAiCollapsed === 'true';
  return collapsed ? REGEN_SIDEBAR_COLLAPSED_PX : REGEN_SIDEBAR_EXPANDED_PX;
}

export const CONTENT_PANE_ID = 'regen-browser-content-pane';

export const SIDEBAR_ID = 'regen-avatar-sidebar';



export interface WebviewRect {

  x: number;

  y: number;

  width: number;

  height: number;

}



/** Bottom edge of tab bar + URL chrome (fallback when pane not mounted). */

export function getShellChromeBottomPx(): number {

  if (typeof document === 'undefined') return 88;

  let bottom = 0;

  document.querySelectorAll('[data-browser-chrome]').forEach((el) => {

    const b = el.getBoundingClientRect().bottom;

    if (b > bottom) bottom = b;

  });

  return Math.max(88, Math.round(bottom));

}



/** Read the browse content pane in window coordinates. */

export function webviewBoundsFromDom(_fallbackEl?: HTMLElement | null): WebviewRect {

  const pane = document.getElementById(CONTENT_PANE_ID);



  if (!pane || typeof window === 'undefined') {

    const top = getShellChromeBottomPx();

    const statusH = 26;

    const w = Math.max(400, window.innerWidth - getRegenSidebarWidthPx());

    const h = Math.max(300, window.innerHeight - top - statusH);

    return { x: 0, y: top, width: w, height: h };

  }



  const r = pane.getBoundingClientRect();

  return {

    x: Math.round(r.left),

    y: Math.round(r.top),

    width: Math.max(1, Math.round(r.width)),

    height: Math.max(1, Math.round(r.height)),

  };

}



/** Wait until the pane has laid out (avoid creating a tiny corner webview). */

export function isPaneBoundsReady(rect: WebviewRect): boolean {

  if (typeof window === 'undefined') return true;

  const pane = document.getElementById(CONTENT_PANE_ID);

  if (!pane) {

    return rect.width >= 500 && rect.height >= 400;

  }

  const r = pane.getBoundingClientRect();

  if (r.width < 200 || r.height < 200) return false;

  return rect.width >= r.width * 0.9 && rect.height >= r.height * 0.9;

}


