import { behaviorTracker } from '../automation/behaviorTracker';
import {
  getAutomationLoop,
  startAvatarAutomation,
  stopAvatarAutomation,
} from '../automation/automationLoop';
import { memoryManager } from '../optimization/memoryManager';
import { memorySystem } from '../memory/memorySystem';
import { modelLoader } from '../ai/modelLoader';
import { trimCompanionMemory } from '../optimization/companionMemoryTrim';
import { loadCompanionConfig } from '../companion/companionConfig';

let started = false;

/**
 * Boots emotion detection, automation loop, and RAM monitoring.
 * Safe to call multiple times — only starts once.
 */
export function initializeAvatarSystem() {
  if (started || typeof window === 'undefined') return;
  started = true;

  memoryManager.registerTrimmer(() => {
    modelLoader.unloadModel('llava:7b');
    trimCompanionMemory();
  });

  memoryManager.startMonitoring();

  if (loadCompanionConfig().avatarAutomationEnabled) {
    startAvatarAutomation();
  }

  console.log('[Avatar] ✓ Emotion detection active');
  console.log('[Avatar] ✓ Automation loop running');
  console.log('[Avatar] ✓ Memory optimization monitoring');

  window.addEventListener('beforeunload', () => {
    stopAvatarAutomation();
    memoryManager.stopMonitoring();
    behaviorTracker.stop();
  });
}

export function recordSuggestionAccepted(
  suggestion: string,
  emotion: import('../emotion/types').UserEmotionPrimary
) {
  memorySystem.markSuggestionAccepted(suggestion, emotion);
}

export function recordSuggestionDismissed(
  suggestion: string,
  emotion: import('../emotion/types').UserEmotionPrimary
) {
  memorySystem.markSuggestionDismissed(suggestion, emotion);
  getAutomationLoop().dismissSuggestions();
}
