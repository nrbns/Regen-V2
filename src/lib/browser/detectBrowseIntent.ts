/**
 * Omnibox intent detection for Regen browser shell.
 * Uses fast heuristics first; optional IntentRouter when AI is available.
 */

export type BrowseIntentKind =
  | 'navigate'
  | 'search'
  | 'research'
  | 'shopping'
  | 'learning'
  | 'ask_ai'
  | 'unknown';

export interface BrowseIntent {
  kind: BrowseIntentKind;
  label: string;
  input: string;
  confidence: number;
}

export function labelFor(kind: BrowseIntentKind): string {
  switch (kind) {
    case 'navigate':
      return 'Navigate';
    case 'search':
      return 'Search';
    case 'research':
      return 'Research';
    case 'shopping':
      return 'Shopping';
    case 'learning':
      return 'Learning';
    case 'ask_ai':
      return 'Ask AI';
    default:
      return 'Browse';
  }
}

function mapRouterType(type: string, input: string): BrowseIntentKind {
  if (type === 'navigate') return 'navigate';
  if (type === 'ai') return 'ask_ai';
  if (type === 'search') {
    const lower = input.toLowerCase();
    if (/\b(buy|shop|price|cart|deal|amazon|flipkart)\b/.test(lower)) return 'shopping';
    if (/\b(learn|tutorial|course|how to|what is|research)\b/.test(lower)) return 'research';
    return 'search';
  }
  return detectBrowseIntentSync(input).kind;
}

/** Fast on-device intent (no network). */
export function detectBrowseIntentSync(input: string): BrowseIntent {
  const trimmed = input.trim();
  if (!trimmed) {
    return { kind: 'unknown', label: 'Idle', input: '', confidence: 0 };
  }

  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
    return { kind: 'navigate', label: 'Navigate', input: trimmed, confidence: 0.95 };
  }

  const lower = trimmed.toLowerCase();
  if (/\b(buy|shop|price|cart|deal|amazon|flipkart|ebay)\b/.test(lower)) {
    return { kind: 'shopping', label: 'Shopping', input: trimmed, confidence: 0.82 };
  }
  if (/\b(learn|tutorial|course|study|how to|what is|explain|research|compare|review)\b/.test(lower)) {
    return { kind: 'research', label: 'Research', input: trimmed, confidence: 0.8 };
  }
  if (
    trimmed.endsWith('?') ||
    /^(who|what|why|how|when|where|explain|summarize|help me|tell me)\b/i.test(trimmed)
  ) {
    return { kind: 'ask_ai', label: 'Ask AI', input: trimmed, confidence: 0.88 };
  }

  return { kind: 'search', label: 'Search', input: trimmed, confidence: 0.72 };
}

export async function detectBrowseIntent(
  input: string,
  context?: { currentUrl?: string }
): Promise<BrowseIntent> {
  const sync = detectBrowseIntentSync(input);
  if (sync.kind === 'navigate' || sync.kind === 'ask_ai') {
    return sync;
  }

  try {
    const { detectCloudBrowseIntent } = await import('./cloudBrowseIntent');
    const cloud = await detectCloudBrowseIntent(input);
    if (cloud && cloud.confidence >= 0.8) {
      return cloud;
    }
  } catch {
    // continue
  }

  try {
    const { IntentRouter } = await import('../../backend/ai/IntentRouter');
    const routed = await IntentRouter.route(input, context);
    const kind = mapRouterType(routed.type, input);
    return {
      kind,
      label: labelFor(kind),
      input: routed.input,
      confidence: routed.confidence,
    };
  } catch {
    return sync;
  }
}
