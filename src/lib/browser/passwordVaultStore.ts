/**
 * Local password vault — encrypted at rest (device-local; unlock with passphrase).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SavedCredential = {
  id: string;
  origin: string;
  username: string;
  passwordEnc: string;
  label?: string;
  updatedAt: number;
};

type VaultState = {
  locked: boolean;
  passphrase: string | null;
  credentials: SavedCredential[];
  unlock: (passphrase: string) => boolean;
  lock: () => void;
  addCredential: (origin: string, username: string, password: string, label?: string) => void;
  removeCredential: (id: string) => void;
  findForOrigin: (origin: string) => SavedCredential[];
};

async function encrypt(text: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const keyBuf = enc.encode(key.padEnd(32, '0').slice(0, 32));
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ keyBuf[i % keyBuf.length];
  return btoa(String.fromCharCode(...out));
}

async function decrypt(blob: string, key: string): Promise<string> {
  const keyBuf = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const raw = atob(blob);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  return new TextDecoder().decode(out);
}

export async function decryptCredentialPassword(
  enc: string,
  passphrase: string | null
): Promise<string> {
  if (!passphrase) return '••••••••';
  try {
    return await decrypt(enc, passphrase);
  } catch {
    return '••••••••';
  }
}

export const usePasswordVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      locked: true,
      passphrase: null,
      credentials: [],

      unlock(passphrase) {
        if (!passphrase.trim()) return false;
        set({ locked: false, passphrase: passphrase.trim() });
        return true;
      },

      lock() {
        set({ locked: true, passphrase: null });
      },

      addCredential(origin, username, password, label) {
        const { passphrase } = get();
        if (!passphrase) return;
        void encrypt(password, passphrase).then((passwordEnc) => {
          const row: SavedCredential = {
            id: crypto.randomUUID(),
            origin: origin.trim(),
            username: username.trim(),
            passwordEnc,
            label: label?.trim(),
            updatedAt: Date.now(),
          };
          set((s) => ({ credentials: [row, ...s.credentials] }));
        });
      },

      removeCredential(id) {
        set((s) => ({
          credentials: s.credentials.filter((c) => c.id !== id),
        }));
      },

      findForOrigin(origin) {
        const host = origin.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
        return get().credentials.filter((c) =>
          c.origin.toLowerCase().includes(host)
        );
      },
    }),
    {
      name: 'regen-password-vault',
      partialize: (s) => ({
        locked: true,
        passphrase: null,
        credentials: s.credentials,
      }),
    }
  )
);
