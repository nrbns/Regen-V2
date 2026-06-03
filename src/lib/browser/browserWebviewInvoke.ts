import { getActiveBrowseProfileId } from './browserProfileStore';

/** Attach active profile to native webview IPC (session isolation). */
export function withBrowseProfile<T extends Record<string, unknown>>(
  args: T
): T & { profileId: string } {
  return { ...args, profileId: getActiveBrowseProfileId() };
}
