/**
 * Lightweight RAM guard — trims caches when heap is high (Chromium performance.memory).
 */

const DEFAULT_MAX_MB = 500;
const CHECK_MS = 5000;

type TrimFn = () => void;

class MemoryManagerImpl {
  private maxBytes: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private trimmers: TrimFn[] = [];
  private lastPercent = 0;

  constructor(maxMb = DEFAULT_MAX_MB) {
    this.maxBytes = maxMb * 1024 * 1024;
  }

  registerTrimmer(fn: TrimFn) {
    this.trimmers.push(fn);
  }

  startMonitoring() {
    if (this.timer || typeof window === 'undefined') return;
    this.timer = setInterval(() => this.tick(), CHECK_MS);
  }

  stopMonitoring() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getHeapPercent(): number {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
      .memory;
    if (!mem?.usedJSHeapSize) return 0;
    const pct = (mem.usedJSHeapSize / this.maxBytes) * 100;
    this.lastPercent = pct;
    return pct;
  }

  getLastPercent() {
    return this.lastPercent;
  }

  private tick() {
    const pct = this.getHeapPercent();
    if (pct > 80) {
      console.warn(`[MemoryManager] High heap ~${pct.toFixed(0)}% of ${DEFAULT_MAX_MB}MB budget`);
      this.optimizeMemory();
    }
    window.dispatchEvent(
      new CustomEvent('regen:memory-status', { detail: { percent: pct } })
    );
  }

  optimizeMemory() {
    for (const fn of this.trimmers) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  }

  selectOptimalModel(complexity: number): string {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
      .memory;
    const available =
      mem?.jsHeapSizeLimit && mem?.usedJSHeapSize
        ? mem.jsHeapSizeLimit - mem.usedJSHeapSize
        : 1_500_000_000;

    if (complexity <= 3 || available < 800_000_000) return 'phi3:mini';
    if (complexity <= 6 && available > 1_200_000_000) return 'phi3:latest';
    return 'cloud';
  }
}

export const memoryManager = new MemoryManagerImpl();
