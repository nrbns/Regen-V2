/**
 * Bounds for Tauri child webviews (logical/CSS pixels).
 * Uses the content pane so we never cover tab bar / address bar.
 */

const CONTENT_PANE_ID = 'regen-browser-content-pane';

export interface WebviewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function webviewBoundsFromDom(fallbackEl?: HTMLElement | null): WebviewRect {
  const pane = document.getElementById(CONTENT_PANE_ID);
  const el = pane ?? fallbackEl;
  if (!el) {
    return { x: 0, y: 88, width: 1280, height: 720 };
  }

  const r = el.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(r.left)),
    y: Math.max(88, Math.round(r.top)),
    width: Math.max(320, Math.round(r.width)),
    height: Math.max(200, Math.round(r.height)),
  };
}
