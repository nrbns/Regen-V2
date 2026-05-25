# Regen AI Avatar — Cursor Implementation Guide

Read [COMPLETE_AI_AVATAR_SYSTEM.md](./COMPLETE_AI_AVATAR_SYSTEM.md) for architecture. This guide maps the original 12 prompts to **what is already implemented** and what to extend next.

---

## PHASE 1: Emotion Detection — ✅ DONE

| Prompt | Implementation |
|--------|----------------|
| 1.1 Emotion Detector | `src/lib/emotion/emotionDetector.ts`, `types.ts` |
| 1.2 Avatar responds | `setCompanionEmotion`, `SimpleAvatar.tsx`, automation loop |

**Test:** Open error page / fast-click / docs URL → emotion chip changes; console `[Avatar]` logs in companion debug.

---

## PHASE 2: Proactive Help — ✅ DONE

| Prompt | Implementation |
|--------|----------------|
| 2.1 shouldOfferHelp | `emotionDetector.shouldOfferHelp` + 30s cooldown in `automationLoop.ts` |
| 2.2 Page analyzer | `src/lib/automation/pageAnalyzer.ts` (heuristics + phi3) |

**Test:** Trigger iframe error or blocked host → sidebar suggestions + optional voice.

---

## PHASE 3: Automation Loop — ✅ DONE

| Prompt | Implementation |
|--------|----------------|
| 3.1 Continuous observation | `automationLoop.ts` (1s interval, event bus) |
| 3.2 Memory system | `memorySystem.ts` + SQLite `avatar_*` Tauri commands |

**Test:** Accept/dismiss suggestions → `avatar_interactions` table grows (app data dir `regen.db`).

---

## PHASE 4: Voice & Animation — ✅ DONE

| Prompt | Implementation |
|--------|----------------|
| 4.1 Emotional voice | `voiceEmotion.ts`, `VoiceHandler.speak(..., emotion)` |
| 4.2 Avatar animation | `SimpleAvatar` emotion colors + `regen-float` / `regen-pulse` |

---

## PHASE 5: Low RAM — ✅ DONE (baseline)

| Prompt | Implementation |
|--------|----------------|
| 5.1 Memory manager | `memoryManager.ts`, status bar mem % |
| 5.2 Lazy models | `modelLoader.ts` |

**Extend:** Wire trimmers to chat history store when added.

---

## PHASE 6: Integration — ✅ DONE

| Prompt | Implementation |
|--------|----------------|
| 6.1 Wire App | `initializeAvatarSystem()` from `initialize-app.ts` |
| 6.2 Testing | Checklist below |

---

## Phase 2+ (native context) — ✅ DONE

- **Rust:** `browser_webview_extract_page` — title + 5k text from tab webview
- **Frontend:** `fetchPageSnippet.ts` on `browser://page-loaded`
- **Legacy:** `extract_page_content` command for `PageSummarizer`

---

## Testing checklist

```
EMOTION
☐ Error / blocked page → concerned
☐ Wikipedia / docs URL → curious
☐ Success load → happy (brief)

PROACTIVE HELP
☐ Suggestions appear when frustrated
☐ Dismiss → quiet ~60s
☐ Accept → sends to chat

AUTOMATION
☐ No UI jank after 5+ minutes
☐ Tab switch updates visible webview only

NATIVE EXTRACT (npm run dev)
☐ GitHub/Google load → emotion uses page keywords from real text

MEMORY
☐ mem % in status bar
☐ Accepted suggestions improve over time (SQLite)

VOICE
☐ Settings voice on → empathetic TTS on offer
```

---

## 4-week timeline (original plan)

| Week | Focus | Repo status |
|------|-------|-------------|
| 1 | Emotion + proactive help | ✅ |
| 2 | Automation + voice | ✅ |
| 3 | RAM + integration + native extract | ✅ |
| 4 | Polish, QA, release | ✅ code complete — run QA + tag `v1.0.0` when ready |

---

## Polish items — ✅ implemented

1. **AdaptiveAvatar** — `AdaptiveAvatar.tsx` + `public/models/avatar.glb` hook
2. **Offline STT path** — `offlineTranscribe.ts` (API + optional Tauri `transcribe_voice`)
3. **Vision low-RAM** — `getVisionIntervalMs()` in `lowRamMode.ts`
4. **Cross-tab emotion** — `pageContextStore.setTabEmotion` + restore on `TAB_SWITCH`
5. **Memory trim** — `companionMemoryTrim.ts` on high heap
6. **Event bus** — `NAVIGATE` / `TAB_SWITCH` from `useShellBrowser`

Start dev: `npm run dev`
