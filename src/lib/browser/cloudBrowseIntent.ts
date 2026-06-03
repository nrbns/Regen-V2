/**
 * Cloud + on-device intent routing for omnibox input.
 */

import { detectIntentOnDevice } from '../../services/onDeviceAI';
import { apiRequest } from '../api-client';
import type { BrowseIntent, BrowseIntentKind } from './detectBrowseIntent';
import { detectBrowseIntentSync, labelFor } from './detectBrowseIntent';

function mapOnDeviceRaw(raw: string, input: string): BrowseIntent | null {
  const r = raw.toLowerCase().trim();
  let kind: BrowseIntentKind | null = null;

  if (r.includes('summarize') || r === 'question') kind = 'ask_ai';
  else if (r.includes('search') || r.includes('find')) kind = 'search';
  else if (r.includes('command') || r.includes('navigate')) kind = 'navigate';
  else if (r.includes('translate') || r.includes('learn')) kind = 'learning';

  if (!kind) return null;

  return {
    kind,
    label: labelFor(kind),
    input,
    confidence: 0.84,
  };
}

function parseCloudKind(text: string): BrowseIntentKind {
  const t = text.toLowerCase().replace(/[^a-z_]/g, '');
  if (t.includes('navigate') || t.includes('url')) return 'navigate';
  if (t.includes('shopping') || t.includes('shop') || t.includes('buy')) return 'shopping';
  if (t.includes('learning') || t.includes('learn') || t.includes('tutorial')) return 'learning';
  if (t.includes('research')) return 'research';
  if (t.includes('ask') || t.includes('ai') || t.includes('question')) return 'ask_ai';
  if (t.includes('search')) return 'search';
  return detectBrowseIntentSync(text).kind;
}

/**
 * Stronger intent path: on-device Tauri → cloud LLM → null (caller falls back).
 */
export async function detectCloudBrowseIntent(input: string): Promise<BrowseIntent | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const onDevice = await detectIntentOnDevice(trimmed);
    const mapped = mapOnDeviceRaw(onDevice, trimmed);
    if (mapped) return mapped;
  } catch {
    // optional path
  }

  try {
    const response = await apiRequest<{ ok?: boolean; text?: string }>('/api/ai/task', {
      method: 'POST',
      body: {
        provider: 'openai',
        payload: {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'Classify browser omnibox input. Reply with exactly one token: navigate, search, research, shopping, learning, or ask_ai.',
            },
            { role: 'user', content: trimmed },
          ],
          max_tokens: 12,
          temperature: 0,
        },
      },
    });

    const text = response.text?.trim();
    if (response.ok && text) {
      const kind = parseCloudKind(text);
      return {
        kind,
        label: labelFor(kind),
        input: trimmed,
        confidence: 0.93,
      };
    }
  } catch {
    // backend offline
  }

  return null;
}
