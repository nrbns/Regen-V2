import { PERF } from '../../config/performance';

export type RegenEvent = { type: string; seq?: number; [key: string]: unknown };

type Handler = (e: RegenEvent) => void;

/** Dedicated execution WS (preferred) then redix fallback. */
const WS_PORT_CANDIDATES = [4001, 4000];

function envWsBase(): string | null {
  const raw =
    import.meta.env.VITE_EXECUTION_WS_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/^http/, 'ws');
  if (!raw) return null;
  return raw.replace(/\/$/, '').replace(/\/ws\/execution$/, '');
}

function buildWsUrl(base: string, sessionId: string): string {
  return `${base.replace(/\/$/, '')}/ws/execution?sessionId=${encodeURIComponent(sessionId)}`;
}

let resolvedWsBase: string | null = null;
let resolveProbe: Promise<string | null> | null = null;
let warnedOffline = false;

/** Open WS briefly; succeed only if server sends system:connected JSON. */
function probeWsUrl(url: string, timeoutMs = 3500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      finish(false);
      return;
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    ws.onopen = () => {
      /* wait for system:connected */
    };
    ws.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data as string) as RegenEvent;
        if (e.type === 'system:connected') finish(true);
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => finish(false);
    ws.onclose = () => {
      if (!done) finish(false);
    };
  });
}

async function resolveExecutionWsBase(): Promise<string | null> {
  if (resolvedWsBase) return resolvedWsBase;
  if (resolveProbe) return resolveProbe;

  resolveProbe = (async () => {
    const envBase = envWsBase();
    const bases = envBase
      ? [envBase]
      : WS_PORT_CANDIDATES.map((p) => `ws://127.0.0.1:${p}`);

    for (const base of bases) {
      const httpBase = base.replace(/^ws/, 'http');
      try {
        const res = await fetch(`${httpBase}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) continue;
        const body = await res.json().catch(() => null);
        if (body?.service === 'regen-execution-ws' || body?.ok === true) {
          const probeId = `probe-${Date.now()}`;
          const ok = await probeWsUrl(buildWsUrl(base, probeId));
          if (ok) {
            resolvedWsBase = base;
            return base;
          }
        }
      } catch {
        /* try next */
      }
    }

    if (!warnedOffline) {
      warnedOffline = true;
      console.info(
        '[Regen] Execution WebSocket offline — start API with: npm run dev:execution-ws (or npm run kill:dev && npm run dev)'
      );
    }
    return null;
  })().finally(() => {
    resolveProbe = null;
  });

  return resolveProbe;
}

class ExecutionClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private sessionId = `regen-${Date.now()}`;
  private reconnect: ReturnType<typeof setTimeout> | null = null;
  private failCount = 0;
  private disabled = false;
  private connecting = false;
  connected = false;

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async connect(): Promise<boolean> {
    if (this.disabled || this.connecting) return false;
    if (this.ws?.readyState === WebSocket.OPEN) return true;
    if (this.ws?.readyState === WebSocket.CONNECTING) return false;

    const base = await resolveExecutionWsBase();
    if (!base) {
      this.failCount += 1;
      if (this.failCount >= 2) this.disabled = true;
      return false;
    }

    this.connecting = true;
    const url = buildWsUrl(base, this.sessionId);

    return new Promise((resolve) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        this.connecting = false;
        this.failCount += 1;
        resolve(false);
        return;
      }

      this.ws = ws;

      const timer = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          this.connecting = false;
          this.failCount += 1;
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          resolve(false);
        }
      }, 5000);

      ws.onopen = () => {
        /* wait for system:connected in onmessage */
      };

      ws.onmessage = (ev) => {
        try {
          const e = JSON.parse(ev.data as string) as RegenEvent;
          if (e.type === 'system:connected' && !this.connected) {
            clearTimeout(timer);
            this.connecting = false;
            this.failCount = 0;
            this.disabled = false;
            this.connected = true;
            this.handlers.forEach((h) => h(e));
            resolve(true);
            return;
          }
          this.handlers.forEach((h) => h(e));
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        clearTimeout(timer);
        this.connecting = false;
        this.connected = false;
        this.ws = null;
        this.handlers.forEach((h) => h({ type: 'system:disconnected' }));
        this.failCount += 1;
        if (this.failCount >= 3) {
          this.disabled = true;
          resolvedWsBase = null;
        } else {
          this.scheduleReconnect();
        }
        resolve(false);
      };

      ws.onerror = () => {
        this.connecting = false;
        this.failCount += 1;
      };
    });
  }

  private scheduleReconnect() {
    if (this.disabled || this.reconnect) return;
    const delay = Math.min(PERF.wsReconnectMs * Math.pow(2, this.failCount), 60_000);
    this.reconnect = setTimeout(() => {
      this.reconnect = null;
      void this.connect();
    }, delay);
  }

  cancel(taskId: string) {
    void this.connect();
    const payload = JSON.stringify({ type: 'execution:cancel', taskId });
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
  }

  execute(prompt: string, meta?: { url?: string; tabId?: string }) {
    if (this.disabled) return;
    void this.connect().then((ok) => {
      if (!ok) return;
      const payload = JSON.stringify({
        type: 'execute',
        prompt,
        url: meta?.url ?? null,
        tabId: meta?.tabId ?? null,
      });
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
      }
    });
  }
}

let client: ExecutionClient | null = null;
export function getExecutionClient() {
  if (!client) client = new ExecutionClient();
  return client;
}

/** Call once when research/execution UI mounts — not on every page load. */
export function ensureExecutionWsConnected(): void {
  void getExecutionClient().connect();
}
