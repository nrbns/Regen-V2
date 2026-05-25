import { loadCompanionConfig } from '../companion/companionConfig';
import { companionDebug } from '../companion/companionDebug';
import { setAvatarEmotion } from '../companion/avatarBridge';
import { isTauriRuntime } from '../env';
import { getVisionIntervalMs } from '../optimization/lowRamMode';

export interface VisionProcessorOptions {
  onDescription?: (text: string, language: string) => void;
  onError?: (err: Error) => void;
}

export class VisionProcessor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private opts: VisionProcessorOptions;
  private displayStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  constructor(opts: VisionProcessorOptions = {}) {
    this.opts = opts;
  }

  /** Web only: user picks a window/screen once; ticks sample frames until stopped. */
  async ensureDisplayMediaStream(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      this.opts.onError?.(new Error('Screen share not supported in this browser'));
      return false;
    }
    this.stopDisplayMedia();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { max: 1280 }, frameRate: { max: 2 } },
        audio: false,
      });
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stopDisplayMedia());
      this.displayStream = stream;
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      this.videoEl = video;
      companionDebug.log('vision: display media stream active');
      return true;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.opts.onError?.(err);
      return false;
    }
  }

  stopDisplayMedia(): void {
    this.displayStream?.getTracks().forEach((t) => t.stop());
    this.displayStream = null;
    this.videoEl = null;
  }

  startWatching(): void {
    if (!loadCompanionConfig().visionEnabled) return;
    this.stopWatching();
    const base = loadCompanionConfig().visionIntervalMs;
    const ms = getVisionIntervalMs(base);
    this.intervalId = setInterval(() => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => void this.tick(), { timeout: 2000 });
      } else {
        void this.tick();
      }
    }, ms);
    companionDebug.log(`vision watching every ${ms}ms`);
  }

  stopWatching(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private async captureScreen(): Promise<string | undefined> {
    if (isTauriRuntime()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const dataUrl = (await invoke('capture_screen_jpeg', { quality: 40 })) as string;
        return dataUrl.replace(/^data:image\/\w+;base64,/, '');
      } catch {
        return undefined;
      }
    }

    if (this.displayStream?.active && this.videoEl) {
      const v = this.videoEl;
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (!w || !h) return undefined;
      const canvas = document.createElement('canvas');
      const maxW = 960;
      canvas.width = Math.min(w, maxW);
      canvas.height = Math.round(canvas.width * (h / w));
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.45).replace(/^data:image\/\w+;base64,/, '');
    }
    return undefined;
  }

  private async tick(): Promise<void> {
    if (this.busy || !loadCompanionConfig().visionEnabled) return;
    this.busy = true;
    try {
      const image = await this.captureScreen();
      if (!image) return;
      companionDebug.patch({ visionLastCapture: Date.now() });

      const cfg = loadCompanionConfig();
      const res = await fetch(`${cfg.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.visionModel,
          prompt:
            'Describe what you see in 1-2 short sentences. Reply with JSON only: {"description":"...","language":"en"}',
          images: [image],
          stream: false,
          options: { num_predict: 120, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`vision ${res.status}`);
      const data = await res.json();
      const raw = data.response || '';
      let description = raw;
      let language = 'en';
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        description = parsed.description || raw;
        language = parsed.language || 'en';
      } catch {
        /* plain text */
      }

      companionDebug.patch({ visionLastAnalysis: description.slice(0, 200) });
      setAvatarEmotion('noticing');
      this.opts.onDescription?.(description, language);
      setTimeout(() => setAvatarEmotion('idle'), 1500);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      companionDebug.log(`vision: ${err.message}`);
      this.opts.onError?.(err);
    } finally {
      this.busy = false;
    }
  }

  dispose(): void {
    this.stopWatching();
    this.stopDisplayMedia();
  }
}
