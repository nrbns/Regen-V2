/**
 * Canonical Regen companion artwork for the browser shell.
 * Do not replace with icons, SVG placeholders, or other assets in browser UI.
 */
export const BROWSER_AVATAR_SRC = '/images/character-half.png' as const;

/** Same character, alternate crop — only fallback if half.png fails */
export const BROWSER_AVATAR_FALLBACK = '/images/character-half-sm.png' as const;

export const BROWSER_AVATAR_SOURCES = [BROWSER_AVATAR_SRC, BROWSER_AVATAR_FALLBACK] as const;
