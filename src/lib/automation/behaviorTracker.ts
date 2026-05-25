/**
 * Tracks scroll / click / keyboard activity for emotion detection.
 * Listens to Regen event bus + shell window events.
 */

import { eventBus } from '../events/EventBus';

interface TimedEvent {
  t: number;
  value?: number;
}

const WINDOW_MS = 30_000;

class BehaviorTrackerImpl {
  private scrolls: TimedEvent[] = [];
  private clicks: TimedEvent[] = [];
  private keys: TimedEvent[] = [];
  private lastScrollY = 0;
  private started = false;

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = Math.abs(y - this.lastScrollY);
      this.lastScrollY = y;
      this.scrolls.push({ t: Date.now(), value: dy });
      this.trim();
    };

    const onClick = () => {
      this.clicks.push({ t: Date.now() });
      this.trim();
    };

    const onKey = () => {
      this.keys.push({ t: Date.now() });
      this.trim();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });

    const offBus = eventBus.onMany(['SCROLL', 'CLICK', 'KEYPRESS'], () => {
      this.clicks.push({ t: Date.now() });
      this.trim();
    });

    this.dispose = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      offBus();
      this.started = false;
    };
  }

  private dispose: (() => void) | null = null;

  stop() {
    this.dispose?.();
    this.dispose = null;
  }

  private trim() {
    const cut = Date.now() - WINDOW_MS;
    this.scrolls = this.scrolls.filter((e) => e.t >= cut);
    this.clicks = this.clicks.filter((e) => e.t >= cut);
    this.keys = this.keys.filter((e) => e.t >= cut);
  }

  /** Average px per scroll event in the last 10s (proxy for scan speed). */
  scrollSpeedScore(): number {
    const cut = Date.now() - 10_000;
    const recent = this.scrolls.filter((e) => e.t >= cut);
    if (!recent.length) return 0;
    const avg = recent.reduce((a, e) => a + (e.value ?? 0), 0) / recent.length;
    return avg;
  }

  clicksPerSecond(): number {
    const cut = Date.now() - 10_000;
    const n = this.clicks.filter((e) => e.t >= cut).length;
    return n / 10;
  }

  hadRecentActivity(ms = 1000): boolean {
    const cut = Date.now() - ms;
    return (
      this.scrolls.some((e) => e.t >= cut) ||
      this.clicks.some((e) => e.t >= cut) ||
      this.keys.some((e) => e.t >= cut)
    );
  }
}

export const behaviorTracker = new BehaviorTrackerImpl();
