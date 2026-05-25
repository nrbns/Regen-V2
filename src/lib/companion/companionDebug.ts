import type { AvatarEmotion } from './companionConfig';

export interface CompanionDebugState {
  emotion: AvatarEmotion;
  voiceListening: boolean;
  visionLastCapture: number | null;
  visionLastAnalysis: string;
  llmModel: string;
  llmLatencyMs: number | null;
  tokensPerSec: number | null;
  memoryMb: number | null;
  logs: string[];
}

const MAX_LOGS = 80;

let state: CompanionDebugState = {
  emotion: 'idle',
  voiceListening: false,
  visionLastCapture: null,
  visionLastAnalysis: '',
  llmModel: 'phi3:mini',
  llmLatencyMs: null,
  tokensPerSec: null,
  memoryMb: null,
  logs: [],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const companionDebug = {
  getState: () => state,
  subscribe: (fn: () => void): (() => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  patch: (p: Partial<CompanionDebugState>) => {
    state = { ...state, ...p };
    notify();
  },
  log: (msg: string) => {
    const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
    state = { ...state, logs: [...state.logs.slice(-MAX_LOGS + 1), line] };
    if (import.meta.env.DEV) console.debug('[Companion]', msg);
    notify();
  },
  trim: () => {
    state = { ...state, logs: state.logs.slice(-30) };
    notify();
  },
};
