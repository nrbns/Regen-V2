import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCompanionConfig, saveCompanionConfig } from '../lib/companion/companionConfig';
import { companionDebug } from '../lib/companion/companionDebug';
import { VoiceHandler } from '../lib/voice/voiceHandler';
import { LLMHandler } from '../lib/ai/llmHandler';

describe('companion integration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
    });
    companionDebug.patch({ logs: [], emotion: 'idle' });
  });

  it('persists companion settings', () => {
    saveCompanionConfig({ llmModel: 'mistral', visionIntervalMs: 5000 });
    expect(loadCompanionConfig().llmModel).toBe('mistral');
    expect(loadCompanionConfig().visionIntervalMs).toBe(5000);
  });

  it('voice handler reports unsupported when API missing', () => {
    vi.stubGlobal('window', {} as Window);
    expect(VoiceHandler.isSupported()).toBe(false);
  });

  it('llm handler rejects when ollama offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const llm = new LLMHandler();
    await expect(llm.generate('hello')).rejects.toThrow();
    expect(companionDebug.getState().logs.some((l) => l.includes('llm'))).toBe(true);
  });
});
