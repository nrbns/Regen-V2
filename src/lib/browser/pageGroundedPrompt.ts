import type { PageSnippet } from './pageContextStore';
import { isNewTabUrl } from './normalizeUrl';

/** Build context block for LLM / execution from the active page. */
export function buildPageContextBlock(snippet: PageSnippet | undefined): string {
  if (!snippet?.text || isNewTabUrl(snippet.url)) return '';
  const text = snippet.text.slice(0, 3500);
  return [
    'The user is browsing this page. Use it as primary context (not generic web knowledge):',
    `URL: ${snippet.url}`,
    `Title: ${snippet.title || 'Untitled'}`,
    'Page excerpt:',
    text,
  ].join('\n');
}

export function buildPageGroundedUserMessage(
  userMessage: string,
  snippet: PageSnippet | undefined
): string {
  const ctx = buildPageContextBlock(snippet);
  if (!ctx) return userMessage;
  return `${ctx}\n\n---\nUser question about this page:\n${userMessage}`;
}
