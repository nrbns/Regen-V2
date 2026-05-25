import { invoke } from '@tauri-apps/api/core';
import type { UserEmotionPrimary } from '../emotion/types';
import { isTauriShell } from '../tauri/runtime';

const INTERACTIONS_KEY = 'regen:avatar:interactions';
const VISITS_KEY = 'regen:avatar:visits';
const MAX_ITEMS = 200;

export interface InteractionRecord {
  userEmotion: UserEmotionPrimary;
  suggestion: string;
  userAccepted: boolean;
  timeToRespond: number;
  timestamp: number;
}

export interface VisitRecord {
  url: string;
  title: string;
  timeSpent: number;
  emotion: UserEmotionPrimary;
  timestamp: number;
}

function loadJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJson<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items.slice(-MAX_ITEMS)));
}

export class MemorySystem {
  recordInteraction(data: Omit<InteractionRecord, 'timestamp'>) {
    const items = loadJson<InteractionRecord>(INTERACTIONS_KEY);
    items.push({ ...data, timestamp: Date.now() });
    saveJson(INTERACTIONS_KEY, items);

    if (isTauriShell()) {
      void invoke('avatar_record_interaction', {
        userEmotion: data.userEmotion,
        suggestion: data.suggestion,
        userAccepted: data.userAccepted,
        timeToRespond: data.timeToRespond,
      }).catch(() => {});
    }
  }

  recordPageVisit(data: Omit<VisitRecord, 'timestamp'>) {
    const items = loadJson<VisitRecord>(VISITS_KEY);
    items.push({ ...data, timestamp: Date.now() });
    saveJson(VISITS_KEY, items);

    if (isTauriShell()) {
      void invoke('avatar_record_visit', {
        url: data.url,
        title: data.title,
        timeSpent: data.timeSpent,
        emotion: data.emotion,
      }).catch(() => {});
    }
  }

  markSuggestionAccepted(suggestion: string, emotion: UserEmotionPrimary, timeToRespond = 0) {
    this.recordInteraction({
      userEmotion: emotion,
      suggestion,
      userAccepted: true,
      timeToRespond,
    });
  }

  markSuggestionDismissed(suggestion: string, emotion: UserEmotionPrimary) {
    this.recordInteraction({
      userEmotion: emotion,
      suggestion,
      userAccepted: false,
      timeToRespond: 0,
    });
  }

  async getSmartSuggestions(limit = 3): Promise<string[]> {
    if (isTauriShell()) {
      try {
        const fromDb = await invoke<string[]>('avatar_get_smart_suggestions', { limit });
        if (fromDb?.length) return fromDb;
      } catch {
        /* fallback */
      }
    }

    const items = loadJson<InteractionRecord>(INTERACTIONS_KEY);
    const counts = new Map<string, number>();
    for (const row of items) {
      if (!row.userAccepted || !row.suggestion) continue;
      counts.set(row.suggestion, (counts.get(row.suggestion) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([s]) => s);
  }
}

export const memorySystem = new MemorySystem();
