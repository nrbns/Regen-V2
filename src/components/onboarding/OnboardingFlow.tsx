import React, { useEffect, useState } from 'react';
import { AvatarCompanion } from '../Avatar/AvatarCompanion';
import { setAvatarEmotion } from '../../lib/companion/avatarBridge';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';

const STORAGE_KEY = 'regen:onboarding:done';

type Step = 'welcome' | 'system' | 'language' | 'permissions' | 'ready';

const STEPS: Step[] = ['welcome', 'system', 'language', 'permissions', 'ready'];

export function OnboardingFlow() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('welcome');

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const map: Record<Step, AvatarEmotion> = {
      welcome: 'idle',
      system: 'thinking',
      language: 'idle',
      permissions: 'listening',
      ready: 'happy',
    };
    setAvatarEmotion(map[step]);
  }, [step, visible]);

  if (!visible) return null;

  const idx = STEPS.indexOf(step);
  const next = () => {
    if (idx >= STEPS.length - 1) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
      setAvatarEmotion('happy');
      setTimeout(() => setVisible(false), 600);
      return;
    }
    setStep(STEPS[idx + 1]);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ background: '#141417', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <AvatarCompanion mode="onboarding" autoRevertMs={0} />
        <h2 className="text-lg font-semibold text-white">Welcome to Regen</h2>
        <p className="text-sm text-center text-gray-400">
          {step === 'welcome' && 'Your AI browser companion — local-first, private, fast.'}
          {step === 'system' && 'Checking Ollama and system…'}
          {step === 'language' && 'Choose your preferred language (Settings later).'}
          {step === 'permissions' && 'Grant mic and screen access for voice & vision.'}
          {step === 'ready' && "You're all set. Let's browse."}
        </p>
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, '1');
              } catch {
                /* ignore */
              }
              setVisible(false);
            }}
            className="flex-1 py-2 rounded-lg text-sm text-gray-400 border border-white/10"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="flex-1 py-2 rounded-lg text-sm text-white font-medium"
            style={{ background: '#F5A623' }}
          >
            {step === 'ready' ? 'Start' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
