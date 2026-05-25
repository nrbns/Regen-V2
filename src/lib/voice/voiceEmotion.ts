import { loadCompanionConfig } from '../companion/companionConfig';
import { setCompanionEmotion } from '../companion/avatarBridge';
import type { AvatarEmotion } from '../companion/companionConfig';
import { utteranceLangForSpeech } from './voiceHandler';

export type VoiceEmotion = 'happy' | 'concerned' | 'excited' | 'thinking' | 'curious' | 'calm';

export interface VoiceEmotionOptions {
  emotion?: VoiceEmotion;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

const EMOTION_PRESETS: Record<
  VoiceEmotion,
  { avatar: AvatarEmotion; rate: number; pitch: number; volume: number }
> = {
  happy: { avatar: 'happy', rate: 1.05, pitch: 1.08, volume: 1 },
  concerned: { avatar: 'concerned', rate: 0.92, pitch: 0.95, volume: 0.95 },
  excited: { avatar: 'excited', rate: 1.12, pitch: 1.12, volume: 1 },
  thinking: { avatar: 'thinking', rate: 0.9, pitch: 1, volume: 0.9 },
  curious: { avatar: 'curious', rate: 1, pitch: 1.05, volume: 1 },
  calm: { avatar: 'calm', rate: 0.98, pitch: 1, volume: 0.92 },
};

export function speakWithEmotion(text: string, options: VoiceEmotionOptions = {}) {
  if (!loadCompanionConfig().voiceEnabled || typeof window === 'undefined') return;
  if (!('speechSynthesis' in window) || !text.trim()) return;

  const emotion = options.emotion ?? 'calm';
  const preset = EMOTION_PRESETS[emotion];

  setCompanionEmotion(preset.avatar);
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = utteranceLangForSpeech(options.lang ?? 'en-US');
  u.rate = options.rate ?? preset.rate;
  u.pitch = options.pitch ?? preset.pitch;
  u.volume = options.volume ?? preset.volume;

  const cfg = loadCompanionConfig();
  const voices = window.speechSynthesis.getVoices();
  const prefix = u.lang.split('-')[0];
  let match =
    voices.find((v) => v.lang === u.lang) || voices.find((v) => v.lang.startsWith(prefix)) || null;

  if (cfg.ttsVoiceGender !== 'default' && voices.length) {
    const wantFemale = cfg.ttsVoiceGender === 'female';
    const gendered = voices.filter((v) =>
      wantFemale ? /female|woman|samantha|zira/i.test(v.name) : /male|david|mark/i.test(v.name)
    );
    match = gendered.find((v) => v.lang.startsWith(prefix)) ?? match;
  }
  if (match) u.voice = match;

  u.onend = () => setCompanionEmotion('idle', { revertMs: 0 });
  window.speechSynthesis.speak(u);
}

export function voiceEmotionFromUser(
  primary: string
): VoiceEmotion {
  const map: Record<string, VoiceEmotion> = {
    happy: 'happy',
    frustrated: 'concerned',
    curious: 'curious',
    confused: 'thinking',
    calm: 'calm',
  };
  return map[primary] ?? 'calm';
}
