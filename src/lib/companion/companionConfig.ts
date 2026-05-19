export type AvatarEmotion = 'idle' | 'listening' | 'thinking' | 'speaking' | 'noticing' | 'happy';

export interface CompanionConfig {
  visionEnabled: boolean;
  voiceEnabled: boolean;
  ttsVoiceGender: 'default' | 'male' | 'female';
  visionIntervalMs: number;
  llmModel: string;
  visionModel: string;
  responseLanguage: string;
  ollamaUrl: string;
}

const KEY = 'regen:companion:config';

const DEFAULTS: CompanionConfig = {
  visionEnabled: true,
  voiceEnabled: true,
  ttsVoiceGender: 'default',
  visionIntervalMs: 3000,
  llmModel: 'phi3:mini',
  visionModel: 'llava:7b',
  responseLanguage: 'auto',
  ollamaUrl: 'http://127.0.0.1:11434',
};

export function loadCompanionConfig(): CompanionConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCompanionConfig(patch: Partial<CompanionConfig>): CompanionConfig {
  const next = { ...loadCompanionConfig(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('regen:companion-config', { detail: next }));
  return next;
}

/** STT / response language presets for avatar + settings */
export const COMPANION_LANG_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'en-US', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'te-IN', label: 'Telugu' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese' },
];
