/**
 * Browser profiles — separate cookies/storage per profile (native webview data dirs).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BrowserProfile = {
  id: string;
  name: string;
  color: string;
  /** Ephemeral session — incognito webview, no persistent partition. */
  incognito?: boolean;
};

const DEFAULT_PROFILES: BrowserProfile[] = [
  { id: 'default', name: 'Personal', color: '#f0a030' },
  { id: 'work', name: 'Work', color: '#5b9bd5' },
  { id: 'private', name: 'Private', color: '#9b59b6', incognito: true },
];

type State = {
  profiles: BrowserProfile[];
  activeProfileId: string;
  setActiveProfile: (id: string) => void;
  addProfile: (name: string) => void;
  getActiveProfile: () => BrowserProfile;
};

export const useBrowserProfileStore = create<State>()(
  persist(
    (set, get) => ({
      profiles: DEFAULT_PROFILES,
      activeProfileId: 'default',

      getActiveProfile() {
        const { profiles, activeProfileId } = get();
        return profiles.find((p) => p.id === activeProfileId) ?? DEFAULT_PROFILES[0];
      },

      setActiveProfile(id) {
        const exists = get().profiles.some((p) => p.id === id);
        if (!exists) return;
        set({ activeProfileId: id });
        window.dispatchEvent(
          new CustomEvent('regen:profile-changed', { detail: { profileId: id } })
        );
      },

      addProfile(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = `profile-${Date.now()}`;
        set((s) => ({
          profiles: [
            ...s.profiles,
            { id, name: trimmed, color: '#6bcb77' },
          ],
        }));
      },
    }),
    { name: 'regen-browser-profiles' }
  )
);

export function getActiveBrowseProfileId(): string {
  return useBrowserProfileStore.getState().activeProfileId || 'default';
}
