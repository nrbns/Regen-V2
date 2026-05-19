import { PERF } from '../../config/performance';

export type RegenEvent = { type: string; seq?: number; [key: string]: unknown };

type Handler = (e: RegenEvent) => void;

function wsUrl(): string {
  const base =
    import.meta.env.VITE_EXECUTION_WS_URL ||
    import.meta.env.VITE_API_BASE_URL?.replace(/^http/, 'ws') ||
    'ws://127.0.0.1:4000';
  return `${base.replace(/\/$/, '')}/ws/execution`;
}

class ExecutionClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private sessionId = `regen-${Date.now()}`;
  private reconnect: ReturnType<typeof setTimeout> | null = null;
  connected = false;

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.ws = new WebSocket(`${wsUrl()}?sessionId=${encodeURIComponent(this.sessionId)}`);
    this.ws.onopen = () => {
      this.connected = true;
      this.handlers.forEach((h) => h({ type: 'system:connected' }));
    };
    this.ws.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data as string) as RegenEvent;
        this.handlers.forEach((h) => h(e));
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.handlers.forEach((h) => h({ type: 'system:disconnected' }));
      if (!this.reconnect) {
        this.reconnect = setTimeout(() => {
          this.reconnect = null;
          this.connect();
        }, PERF.wsReconnectMs);
      }
    };
  }

  cancel(taskId: string) {
    this.connect();
    const payload = JSON.stringify({ type: 'execution:cancel', taskId });
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
  }

  execute(prompt: string, meta?: { url?: string; tabId?: string }) {
    this.connect();
    const payload = JSON.stringify({
      type: 'execute',
      prompt,
      url: meta?.url ?? null,
      tabId: meta?.tabId ?? null,
    });
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
    else {
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
      }, 400);
    }
  }
}

let client: ExecutionClient | null = null;
export function getExecutionClient() {
  if (!client) client = new ExecutionClient();
  return client;
}
