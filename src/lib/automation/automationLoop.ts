import { eventBus } from '../events/EventBus';
import { useTabsStore } from '../../state/tabsStore';
import { emotionDetector } from '../emotion/emotionDetector';
import { analyzePageForSuggestions } from './pageAnalyzer';
import { behaviorTracker } from './behaviorTracker';
import { memorySystem } from '../memory/memorySystem';
import { setCompanionEmotion } from '../companion/avatarBridge';
import { loadCompanionConfig } from '../companion/companionConfig';
import { dispatchAvatarSuggestions, dispatchAvatarGreeting } from '../avatar/avatarAutomationBridge';
import { speakWithEmotion, voiceEmotionFromUser } from '../voice/voiceEmotion';
import { companionDebug } from '../companion/companionDebug';
import { getSnippetTextForTab } from '../browser/pageContextStore';
import { fetchNativePageSnippet } from '../browser/fetchPageSnippet';
import { isTauriShell } from '../tauri/runtime';
import { setTabEmotion, applyTabEmotionToAvatar } from '../browser/pageContextStore';
import type { AvatarEmotion } from '../companion/companionConfig';

const OFFER_COOLDOWN_MS = 30_000;
const OBSERVE_MS = 1000;

export interface AutomationLoopOptions {
  pageError?: string | null;
  visionSnippet?: string;
}

class AutomationLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastUrl = '';
  private lastTitle = '';
  private lastOfferAt = 0;
  private suggestionsDismissedUntil = 0;
  private processing = false;
  private greeted = false;
  private pageVisitStarted = Date.now();
  private opts: AutomationLoopOptions = {};
  private unsubscribers: (() => void)[] = [];
  private lastSnippetFetch = 0;

  setOptions(opts: AutomationLoopOptions) {
    this.opts = opts;
  }

  start() {
    if (this.timer) return;
    behaviorTracker.start();

    this.unsubscribers.push(
      eventBus.on('PAGE_LOAD', () => this.onPageSignal()),
      eventBus.on('PAGE_ERROR', () => this.onPageSignal()),
      eventBus.onMany(['TAB_SWITCH', 'NAVIGATE'], () => this.onTabOrNavSignal())
    );

    if (!this.greeted) {
      this.greeted = true;
      dispatchAvatarGreeting('Hi! I\'m Regen — ready when you are.');
      setCompanionEmotion('happy', { revertMs: 2500, revertTo: 'idle' });
    }

    this.timer = setInterval(() => void this.runObservationCycle(), OBSERVE_MS);
    companionDebug.log('avatar automation: started');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    behaviorTracker.stop();
  }

  dismissSuggestions(durationMs = 60_000) {
    this.suggestionsDismissedUntil = Date.now() + durationMs;
  }

  private onPageSignal() {
    this.pageVisitStarted = Date.now();
    const { activeTabId } = useTabsStore.getState();
    void this.refreshPageSnippet(activeTabId, true).then(() => this.runObservationCycle(true));
  }

  private getActiveTabContext() {
    const { tabs, activeTabId } = useTabsStore.getState();
    const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
    const pageText = tab?.id ? getSnippetTextForTab(tab.id) : undefined;
    return {
      tabId: tab?.id,
      url: tab?.url,
      title: tab?.title,
      pageText,
      isLoading: tab?.isLoading,
      pageError: this.opts.pageError ?? null,
      visionSnippet: this.opts.visionSnippet,
    };
  }

  private async refreshPageSnippet(tabId: string | undefined, force = false) {
    if (!tabId || !isTauriShell()) return;
    const now = Date.now();
    if (!force && now - this.lastSnippetFetch < 8000) return;
    this.lastSnippetFetch = now;
    await fetchNativePageSnippet(tabId);
  }

  private detectPageChange(ctx: ReturnType<typeof this.getActiveTabContext>): boolean {
    const url = ctx.url ?? '';
    const title = ctx.title ?? '';
    if (!this.lastUrl && !this.lastTitle) {
      this.lastUrl = url;
      this.lastTitle = title;
      return true;
    }
    const changed = url !== this.lastUrl || title !== this.lastTitle;
    if (changed) {
      if (this.lastUrl) {
        memorySystem.recordPageVisit({
          url: this.lastUrl,
          title: this.lastTitle,
          timeSpent: Date.now() - this.pageVisitStarted,
          emotion: 'calm',
        });
      }
      this.lastUrl = url;
      this.lastTitle = title;
      this.pageVisitStarted = Date.now();
    }
    return changed;
  }

  private async runObservationCycle(force = false) {
    const ctx = this.getActiveTabContext();
    const pageChanged = this.detectPageChange(ctx);
    const behaviorChanged = behaviorTracker.hadRecentActivity(1000);

    if (!force && !pageChanged && !behaviorChanged) return;

    await this.refreshPageSnippet(ctx.tabId, pageChanged);
    const ctxWithText = this.getActiveTabContext();

    const userEmotion = emotionDetector.detectUserEmotion(ctxWithText);

    if (emotionDetector.shouldUpdateAvatar(userEmotion)) {
      const avatarResponse = emotionDetector.getAvatarResponse(userEmotion, ctxWithText);
      if (ctxWithText.tabId) {
        setTabEmotion(
          ctxWithText.tabId,
          userEmotion.primary,
          avatarResponse.emotion as AvatarEmotion,
          userEmotion.intensity
        );
      }
      setCompanionEmotion(avatarResponse.emotion, {
        revertMs: avatarResponse.durationMs,
        revertTo: 'idle',
      });
      companionDebug.log(`emotion: ${userEmotion.primary} (${userEmotion.intensity.toFixed(2)})`);
    }

    const dismissed = Date.now() < this.suggestionsDismissedUntil;
    const shouldOffer = emotionDetector.shouldOfferHelp(userEmotion, {
      dismissed,
      processing: this.processing,
    });

    if (!shouldOffer) return;
    if (Date.now() - this.lastOfferAt < OFFER_COOLDOWN_MS) return;

    this.processing = true;
    this.lastOfferAt = Date.now();

    try {
      const learned = await memorySystem.getSmartSuggestions(1);
      const generated = await analyzePageForSuggestions(ctxWithText);
      const suggestions = [...new Set([...learned, ...generated])].slice(0, 3);
      const avatarResponse = emotionDetector.getAvatarResponse(userEmotion, ctxWithText);

      dispatchAvatarSuggestions({
        message: avatarResponse.message,
        suggestions,
        userEmotion: userEmotion.primary,
        avatarEmotion: avatarResponse.emotion,
      });

      if (loadCompanionConfig().voiceEnabled) {
        speakWithEmotion(avatarResponse.message, {
          emotion: voiceEmotionFromUser(userEmotion.primary),
        });
      }
    } catch (e) {
      companionDebug.log(`automation: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.processing = false;
    }
  }
}

let loop: AutomationLoop | null = null;

export function getAutomationLoop(): AutomationLoop {
  if (!loop) loop = new AutomationLoop();
  return loop;
}

export function startAvatarAutomation(opts?: AutomationLoopOptions) {
  const l = getAutomationLoop();
  if (opts) l.setOptions(opts);
  l.start();
}

export function stopAvatarAutomation() {
  loop?.stop();
}
