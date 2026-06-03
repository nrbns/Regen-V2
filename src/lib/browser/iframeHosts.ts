/** Hosts that refuse iframe embedding (X-Frame-Options / CSP frame-ancestors). */
const IFRAME_BLOCKED = new Set([
  'github.com',
  'www.github.com',
  'google.com',
  'www.google.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'figma.com',
  'www.figma.com',
  'youtube.com',
  'www.youtube.com',
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com',
  'linkedin.com',
  'www.linkedin.com',
  'accounts.google.com',
]);

export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isIframeBlockedHost(url: string): boolean {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  if (IFRAME_BLOCKED.has(host)) return true;
  return [...IFRAME_BLOCKED].some((b) => host === b || host.endsWith(`.${b}`));
}

/** Google/YouTube/etc. must use Tauri native webview — iframe cannot play video. */
export function requiresNativeBrowser(url: string): boolean {
  return isIframeBlockedHost(url);
}
