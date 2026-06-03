import { loadCompanionConfig } from '../companion/companionConfig';
import { companionDebug } from '../companion/companionDebug';
import { setAvatarEmotion } from '../companion/avatarBridge';

export interface GenerateOptions {
  language?: string;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  /** Active page excerpt — grounds answers in what the user is viewing. */
  pageContext?: string;
}

async function withBackoff<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let delay = 400;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error('unreachable');
}

function languageInstruction(lang: string): string {
  const l = (lang || 'en').toLowerCase();
  const names: Record<string, string> = {
    'en-us': 'English',
    en: 'English',
    'hi-in': 'Hindi',
    hi: 'Hindi',
    'te-in': 'Telugu',
    te: 'Telugu',
    'ar-sa': 'Arabic',
    ar: 'Arabic',
    'es-es': 'Spanish',
    es: 'Spanish',
    'fr-fr': 'French',
    fr: 'French',
    'de-de': 'German',
    de: 'German',
    'ja-jp': 'Japanese',
    ja: 'Japanese',
    'zh-cn': 'Chinese (Simplified)',
    zh: 'Chinese',
    'ru-ru': 'Russian',
    ru: 'Russian',
  };
  const name = names[l] || names[l.split('-')[0]] || lang;
  return `Respond only in ${name}.`;
}

export class LLMHandler {
  private abort: AbortController | null = null;

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const cfg = loadCompanionConfig();
    const lang =
      options.language && options.language !== 'auto'
        ? options.language
        : cfg.responseLanguage === 'auto'
          ? 'en-US'
          : cfg.responseLanguage;
    const start = performance.now();
    setAvatarEmotion('thinking');
    companionDebug.patch({ llmModel: cfg.llmModel });

    this.abort?.abort();
    this.abort = new AbortController();
    const signal = options.signal ?? this.abort.signal;

    const pageBlock = options.pageContext?.trim()
      ? `\n\n${options.pageContext.trim()}`
      : '';
    const system = `You are Regen, the Execution Browser companion. ${languageInstruction(lang)} Answer using the current page context when provided. Be concise (2-6 sentences). For new searches, suggest the address bar or Ctrl+K.${pageBlock}`;

    const fullText = await withBackoff(async () => {
      const res = await fetch(`${cfg.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.llmModel,
          prompt: `${system}\n\nUser: ${prompt}\n\nAssistant:`,
          stream: true,
          options: { num_predict: 300, temperature: 0.4 },
        }),
        signal,
      });
      if (!res.ok || !res.body) throw new Error(`LLM ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let tokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line);
            const token = json.response || '';
            if (token) {
              text += token;
              tokens += 1;
              options.onToken?.(token);
            }
          } catch {
            /* skip */
          }
        }
      }

      const ms = performance.now() - start;
      companionDebug.patch({
        llmLatencyMs: Math.round(ms),
        tokensPerSec: ms > 0 ? Math.round((tokens / ms) * 1000) : null,
      });
      return text;
    });

    setAvatarEmotion('happy');
    companionDebug.log(`llm complete (${fullText.length} chars)`);
    setTimeout(() => setAvatarEmotion('idle'), 1200);
    return fullText;
  }

  cancel(): void {
    this.abort?.abort();
    this.abort = null;
    setAvatarEmotion('idle');
  }
}
