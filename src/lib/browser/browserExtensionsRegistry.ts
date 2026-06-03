/**
 * Built-in / side-loaded extensions registry (enable/disable; full MV3 injection later).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RegenExtensionEntry = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  builtin: boolean;
};

const BUILTIN: RegenExtensionEntry[] = [
  {
    id: 'regen-ai',
    name: 'Regen AI Companion',
    version: '1.0.0',
    description: 'Selection AI, voice, and page context on every site.',
    enabled: true,
    builtin: true,
  },
  {
    id: 'regen-adblock',
    name: 'Regen Shields',
    version: '1.0.0',
    description: 'Tracker and ad blocking (local filter lists).',
    enabled: true,
    builtin: true,
  },
  {
    id: 'regen-autofill',
    name: 'Smart Autofill',
    version: '1.0.0',
    description: 'Form detection and saved profile autofill.',
    enabled: false,
    builtin: true,
  },
];

type State = {
  extensions: RegenExtensionEntry[];
  toggle: (id: string) => void;
  isEnabled: (id: string) => boolean;
};

export const useBrowserExtensionsStore = create<State>()(
  persist(
    (set, get) => ({
      extensions: BUILTIN,

      toggle(id) {
        set((s) => ({
          extensions: s.extensions.map((e) =>
            e.id === id ? { ...e, enabled: !e.enabled } : e
          ),
        }));
        window.dispatchEvent(
          new CustomEvent('regen:extension-toggled', { detail: { id } })
        );
      },

      isEnabled(id) {
        return get().extensions.find((e) => e.id === id)?.enabled ?? false;
      },
    }),
    { name: 'regen-browser-extensions' }
  )
);
