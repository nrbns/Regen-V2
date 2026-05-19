import { loadCompanionConfig } from '../companion/companionConfig';
import { companionDebug } from '../companion/companionDebug';
import { setAvatarEmotion } from '../companion/avatarBridge';

export interface VoiceHandlerOptions {
  onTranscript?: (text: string, language: string, isFinal: boolean) => void;
  onError?: (err: Error) => void;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  results: { length: number; [i: number]: { isFinal?: boolean; [j: number]: { transcript: string } } };
}

function detectLangFromText(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[а-яА-ЯЁё]/.test(text)) return 'ru';
  return 'en';
}

/** Map STT / LLM short codes to SpeechSynthesis BCP-47 */
export function utteranceLangForSpeech(lang: string): string {
  const cfg = loadCompanionConfig();
  if (lang === 'auto') {
    return cfg.responseLanguage === 'auto' ? navigator.language || 'en-US' : cfg.responseLanguage;
  }
  if (lang.includes('-')) return lang;
  const map: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN',
    ar: 'ar-SA',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN',
    ru: 'ru-RU',
  };
  return map[lang] || `${lang}-${lang.toUpperCase()}`;
}

export class VoiceHandler {
  private rec: SpeechRecognitionLike | null = null;
  private opts: VoiceHandlerOptions;
  private listening = false;

  constructor(opts: VoiceHandlerOptions = {}) {
    this.opts = opts;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  startListening(): void {
    if (!loadCompanionConfig().voiceEnabled) return;
    if (this.listening) return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) {
      this.opts.onError?.(new Error('Speech recognition unavailable'));
      return;
    }

    const cfg = loadCompanionConfig();
    const lang =
      cfg.responseLanguage === 'auto' ? navigator.language || 'en-US' : cfg.responseLanguage;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (ev) => {
      const text = Array.from({ length: ev.results.length }, (_, i) => ev.results[i][0].transcript).join('');
      const last = ev.results[ev.results.length - 1];
      const isFinal = !!last?.isFinal;
      const langTag =
        cfg.responseLanguage === 'auto'
          ? utteranceLangForSpeech(detectLangFromText(text))
          : cfg.responseLanguage;
      this.opts.onTranscript?.(text.trim(), langTag, isFinal);
    };
    rec.onend = () => {
      this.listening = false;
      companionDebug.patch({ voiceListening: false });
      setAvatarEmotion('idle');
    };
    rec.onerror = () => {
      companionDebug.log('voice error');
      this.opts.onError?.(new Error('Speech recognition error'));
    };

    this.rec = rec;
    this.listening = true;
    companionDebug.patch({ voiceListening: true });
    setAvatarEmotion('listening');
    rec.start();
  }

  stopListening(): void {
    this.rec?.stop();
    this.rec = null;
    this.listening = false;
    companionDebug.patch({ voiceListening: false });
  }

  speak(text: string, lang = 'en-US'): void {
    if (!loadCompanionConfig().voiceEnabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    setAvatarEmotion('speaking');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const cfg = loadCompanionConfig();
    u.lang = utteranceLangForSpeech(lang);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const prefix = u.lang.split('-')[0];
      let match =
        voices.find((v) => v.lang === u.lang) ||
        voices.find((v) => v.lang.startsWith(prefix)) ||
        null;
      if (cfg.ttsVoiceGender !== 'default' && voices.length) {
        const wantFemale = cfg.ttsVoiceGender === 'female';
        const gendered = voices.filter((v) =>
          wantFemale ? /female|woman|samantha|zira|female/i.test(v.name) : /male|david|mark|male/i.test(v.name)
        );
        const langFit = gendered.find((v) => v.lang.startsWith(prefix));
        if (langFit) match = langFit;
      }
      if (match) u.voice = match;
    };
    pickVoice();
    requestAnimationFrame(() => pickVoice());
    setTimeout(() => pickVoice(), 400);

    u.onend = () => setAvatarEmotion('idle');
    window.speechSynthesis.speak(u);
  }

  stopSpeaking(): void {
    window.speechSynthesis?.cancel();
    setAvatarEmotion('idle');
  }

  dispose(): void {
    this.stopListening();
    this.stopSpeaking();
  }
}
