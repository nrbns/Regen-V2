/**
 * Build and save a page overview (summary) as a downloadable markdown file.
 */

import type { PageSummaryState } from '../../hooks/usePageAutoSummary';

export function sanitizeOverviewFilename(title: string): string {
  const base =
    title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80)
      .replace(/^-+|-+$/g, '') || 'page';
  return `${base}-overview.md`;
}

export function formatPageOverviewMarkdown(input: {
  url: string;
  title: string;
  summary: string;
  model?: string;
  source?: string;
  generatedAt?: Date;
}): string {
  const when = (input.generatedAt ?? new Date()).toISOString();
  const meta = [
    input.model ? `model: ${input.model}` : null,
    input.source ? `source: ${input.source}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `# Page overview

**${input.title}**

- URL: ${input.url}
- Generated: ${when}${meta ? `\n- ${meta}` : ''}

---

## Summary

${input.summary.trim()}
`;
}

export function readySummaryForUrl(
  state: PageSummaryState,
  url: string
): Extract<PageSummaryState, { status: 'ready' }> | null {
  if (state.status !== 'ready' || state.url !== url) return null;
  return state;
}
