import { loadCompanionConfig } from '../companion/companionConfig';
import { LLMHandler } from '../ai/llmHandler';

export type PageKind = 'article' | 'search' | 'error' | 'docs' | 'social' | 'unknown';

export interface PageAnalysisInput {
  url?: string;
  title?: string;
  pageText?: string;
  pageError?: string | null;
}

const llm = new LLMHandler();

export function classifyPageKind(input: PageAnalysisInput): PageKind {
  const u = (input.url ?? '').toLowerCase();
  const t = (input.title ?? '').toLowerCase();
  if (input.pageError || /error|404|500|denied|forbidden/.test(t + u)) return 'error';
  if (/google\.com\/search|bing\.com\/search|duckduckgo/.test(u)) return 'search';
  if (/github\.com|stackoverflow|docs\.|wikipedia/.test(u)) return 'docs';
  if (/twitter|x\.com|facebook|instagram|reddit/.test(u)) return 'social';
  if (t.length > 12 && !/new tab/i.test(t)) return 'article';
  return 'unknown';
}

/** Fast heuristic suggestions (no network). */
export function heuristicSuggestions(input: PageAnalysisInput): string[] {
  const kind = classifyPageKind(input);
  const title = input.title?.slice(0, 60) || 'this page';

  switch (kind) {
    case 'error':
      return [
        'Search for an alternative link',
        'Explain why this page might be blocked',
        'Open the site in a new tab and retry',
      ];
    case 'search':
      return ['Refine your search query', 'Summarize top results', 'Save this search for later'];
    case 'docs':
      return [`Summarize "${title}"`, 'Find related documentation', 'Extract key steps as a checklist'];
    case 'article':
      return [`Summarize "${title}"`, 'List main takeaways', 'Find related articles'];
    case 'social':
      return ['Summarize the thread', 'Draft a reply', 'Find primary sources'];
    default:
      return ['Summarize this page', 'Explain it simply', 'Search for related topics'];
  }
}

/** Optional local AI suggestions (phi3 via Ollama); falls back to heuristics. */
export async function analyzePageForSuggestions(input: PageAnalysisInput): Promise<string[]> {
  const base = heuristicSuggestions(input);
  const cfg = loadCompanionConfig();

  try {
    const excerpt = (input.pageText ?? '').slice(0, 1200);
    const prompt = `You are Regen, a helpful browser companion. Suggest exactly 3 short actions (under 12 words each) the user might want on this page.
Title: ${input.title ?? 'unknown'}
URL: ${input.url ?? 'unknown'}
Page type: ${classifyPageKind(input)}
${input.pageError ? `Error: ${input.pageError}` : ''}
${excerpt ? `Content excerpt: ${excerpt}` : ''}

Reply with one suggestion per line, no numbering.`;

    const raw = await Promise.race([
      llm.generate(prompt, { language: cfg.responseLanguage }),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);

    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)]+\s*/, '').trim())
      .filter((l) => l.length > 4 && l.length < 120);

    if (lines.length >= 2) return lines.slice(0, 3);
  } catch {
    /* use heuristics */
  }

  return base;
}
