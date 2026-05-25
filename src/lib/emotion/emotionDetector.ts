import type { AvatarEmotion } from '../companion/companionConfig';
import { behaviorTracker } from '../automation/behaviorTracker';
import type { AvatarEmotionResponse, EmotionSignal, UserEmotion, UserEmotionPrimary } from './types';

const HAPPY_WORDS = ['congratulations', 'success', 'welcome', 'thank you', 'completed', 'verified'];
const FRUSTRATED_WORDS = ['error', 'failed', 'denied', 'forbidden', '404', '500', 'problem', 'issue', 'broken'];
const CURIOUS_WORDS = ['wiki', 'research', 'learn', 'tutorial', 'guide', 'docs', 'stackoverflow'];

export interface PageContextInput {
  url?: string;
  title?: string;
  pageText?: string;
  pageError?: string | null;
  isLoading?: boolean;
  visionSnippet?: string;
}

export class EmotionDetector {
  private lastEmotion: UserEmotion | null = null;

  detectUserEmotion(ctx: PageContextInput = {}): UserEmotion {
    const signals: EmotionSignal[] = [
      this.analyzePageMeta(ctx),
      this.analyzeScrollBehavior(),
      this.analyzeClickBehavior(),
      this.analyzeNavigationStress(ctx),
    ];
    if (ctx.pageError) {
      signals.push({ emotion: 'frustrated', score: 0.85, source: 'page_error' });
    }
    if (ctx.pageText) {
      signals.push(...this.analyzeText(ctx.pageText, 'page_text'));
    }
    if (ctx.visionSnippet) {
      signals.push(...this.analyzeText(ctx.visionSnippet, 'vision'));
    }

    const emotion = this.combineSignals(signals);
    this.lastEmotion = emotion;
    return emotion;
  }

  /** Only react when emotion meaningfully changes (reduces spam). */
  shouldUpdateAvatar(next: UserEmotion): boolean {
    if (!this.lastEmotion) return true;
    if (this.lastEmotion.primary !== next.primary) return true;
    return Math.abs(this.lastEmotion.intensity - next.intensity) > 0.25;
  }

  shouldOfferHelp(emotion: UserEmotion, opts?: { dismissed?: boolean; processing?: boolean }): boolean {
    const needsHelp = ['frustrated', 'confused'].includes(emotion.primary) && emotion.intensity >= 0.55;
    if (!needsHelp) return false;
    if (opts?.dismissed || opts?.processing) return false;
    return true;
  }

  getAvatarResponse(userEmotion: UserEmotion, ctx?: PageContextInput): AvatarEmotionResponse {
    const title = ctx?.title?.trim();
    const responses: Record<UserEmotionPrimary, { emotion: AvatarEmotion; message: string }> = {
      happy: {
        emotion: 'happy',
        message: title
          ? `Nice — "${title.slice(0, 40)}" looks good. Want me to summarize or dig deeper?`
          : 'Great find! Want me to summarize or explore related links?',
      },
      frustrated: {
        emotion: 'concerned',
        message: ctx?.pageError
          ? `That load error is annoying. I can search alternatives or explain what went wrong.`
          : `Something seems off here. Want help searching or troubleshooting?`,
      },
      curious: {
        emotion: 'curious',
        message: title
          ? `"${title.slice(0, 40)}" looks interesting. I can summarize, compare, or find related pages.`
          : 'This looks worth exploring — want a quick summary or related links?',
      },
      confused: {
        emotion: 'thinking',
        message: 'Lots of hopping around — want me to organize tabs or search for you?',
      },
      calm: {
        emotion: 'calm',
        message: 'Browsing smoothly. Ask anytime — summarize, search, or explain a page.',
      },
    };

    const r = responses[userEmotion.primary] ?? responses.calm;
    return {
      emotion: r.emotion,
      message: r.message,
      durationMs: 3000 + userEmotion.intensity * 4000,
    };
  }

  private analyzePageMeta(ctx: PageContextInput): EmotionSignal {
    const blob = `${ctx.url ?? ''} ${ctx.title ?? ''}`.toLowerCase();
    if (!blob.trim()) return { emotion: 'calm', score: 0.2, source: 'empty_page' };
    return this.analyzeText(blob, 'page_meta');
  }

  private analyzeText(text: string, source: string): EmotionSignal[] {
    const lower = text.toLowerCase();
    let happy = 0;
    let frustrated = 0;
    let curious = 0;
    for (const w of HAPPY_WORDS) if (lower.includes(w)) happy += 1;
    for (const w of FRUSTRATED_WORDS) if (lower.includes(w)) frustrated += 1;
    for (const w of CURIOUS_WORDS) if (lower.includes(w)) curious += 1;

    const max = Math.max(happy, frustrated, curious, 0.15);
    if (max === happy && happy > 0) return [{ emotion: 'happy', score: Math.min(1, happy / 3), source }];
    if (max === frustrated && frustrated > 0)
      return [{ emotion: 'frustrated', score: Math.min(1, frustrated / 3), source }];
    if (max === curious && curious > 0) return [{ emotion: 'curious', score: Math.min(1, curious / 3), source }];
    return [{ emotion: 'calm', score: 0.25, source }];
  }

  private analyzeScrollBehavior(): EmotionSignal {
    const speed = behaviorTracker.scrollSpeedScore();
    if (speed > 120) return { emotion: 'frustrated', score: 0.5, source: 'fast_scroll' };
    if (speed > 0 && speed < 8) return { emotion: 'curious', score: 0.35, source: 'slow_read' };
    return { emotion: 'calm', score: 0.2, source: 'scroll' };
  }

  private analyzeClickBehavior(): EmotionSignal {
    const cps = behaviorTracker.clicksPerSecond();
    if (cps > 2) return { emotion: 'frustrated', score: 0.55, source: 'frantic_clicks' };
    if (cps < 0.15) return { emotion: 'calm', score: 0.2, source: 'clicks' };
    return { emotion: 'calm', score: 0.15, source: 'clicks' };
  }

  private analyzeNavigationStress(ctx: PageContextInput): EmotionSignal {
    if (ctx.isLoading) return { emotion: 'confused', score: 0.3, source: 'loading' };
    return { emotion: 'calm', score: 0.1, source: 'nav' };
  }

  private combineSignals(signals: EmotionSignal[]): UserEmotion {
    const scores: Record<string, number> = {};
    let topSource = 'combined';
    let topSignalScore = 0;

    for (const s of signals) {
      scores[s.emotion] = (scores[s.emotion] ?? 0) + s.score;
      if (s.score > topSignalScore) {
        topSignalScore = s.score;
        topSource = s.source;
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = (sorted[0]?.[0] ?? 'calm') as UserEmotionPrimary;
    const raw = sorted[0]?.[1] ?? 0.2;
    const intensity = Math.min(1, Math.max(0.15, raw / 2));

    return {
      primary,
      intensity,
      source: topSource,
      timestamp: Date.now(),
    };
  }
}

export const emotionDetector = new EmotionDetector();
