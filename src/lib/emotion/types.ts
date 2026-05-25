/** User-facing emotional state inferred from browsing signals. */
export type UserEmotionPrimary = 'happy' | 'frustrated' | 'curious' | 'confused' | 'calm';

export interface UserEmotion {
  primary: UserEmotionPrimary;
  intensity: number;
  source: string;
  timestamp: number;
}

export interface EmotionSignal {
  emotion: UserEmotionPrimary;
  score: number;
  source: string;
}

export interface AvatarEmotionResponse {
  emotion: import('../companion/companionConfig').AvatarEmotion;
  message: string;
  durationMs: number;
}
