import type { UserEmotionPrimary } from '../emotion/types';
import type { AvatarEmotion } from '../companion/companionConfig';
import { setCompanionEmotion } from '../companion/avatarBridge';

export interface PageSnippet {
  tabId: string;
  url: string;
  title: string;
  text: string;
  fetchedAt: number;
}

export interface TabEmotionState {
  userEmotion: UserEmotionPrimary;
  avatarEmotion: AvatarEmotion;
  intensity: number;
  updatedAt: number;
}

const snippets = new Map<string, PageSnippet>();
const tabEmotions = new Map<string, TabEmotionState>();

export function setPageSnippet(snippet: PageSnippet) {
  snippets.set(snippet.tabId, snippet);
  window.dispatchEvent(
    new CustomEvent('regen:page-snippet', { detail: { tabId: snippet.tabId } })
  );
}

export function getPageSnippet(tabId: string): PageSnippet | undefined {
  return snippets.get(tabId);
}

export function clearPageSnippet(tabId: string) {
  snippets.delete(tabId);
  tabEmotions.delete(tabId);
}

export function setTabEmotion(
  tabId: string,
  userEmotion: UserEmotionPrimary,
  avatarEmotion: AvatarEmotion,
  intensity: number
) {
  tabEmotions.set(tabId, {
    userEmotion,
    avatarEmotion,
    intensity,
    updatedAt: Date.now(),
  });
  window.dispatchEvent(
    new CustomEvent('regen:tab-emotion', { detail: { tabId, userEmotion, avatarEmotion } })
  );
}

export function getTabEmotion(tabId: string): TabEmotionState | undefined {
  return tabEmotions.get(tabId);
}

export function applyTabEmotionToAvatar(tabId: string) {
  const e = tabEmotions.get(tabId);
  if (!e) return;
  setCompanionEmotion(e.avatarEmotion);
}

export function getSnippetTextForTab(tabId: string | undefined): string | undefined {
  if (!tabId) return undefined;
  const s = snippets.get(tabId);
  if (!s?.text) return undefined;
  if (Date.now() - s.fetchedAt > 120_000) return undefined;
  return s.text;
}
