# Regen Browser — Complete AI Avatar Companion System

World's first emotionally intelligent AI browser: an avatar that watches browsing context, detects emotion, offers proactive help, speaks with empathy, and learns over time — optimized for low RAM.

## Implementation status (in this repo)

| Component | Status | Location |
|-----------|--------|----------|
| Emotion detection | ✅ | `src/lib/emotion/emotionDetector.ts` |
| Behavior signals | ✅ | `src/lib/automation/behaviorTracker.ts` |
| Page analysis + suggestions | ✅ | `src/lib/automation/pageAnalyzer.ts` |
| Automation loop (1s) | ✅ | `src/lib/automation/automationLoop.ts` |
| Native page text extract | ✅ | `src-tauri/src/browser_webview.rs` → `browser_webview_extract_page` |
| Page context cache | ✅ | `src/lib/browser/pageContextStore.ts`, `fetchPageSnippet.ts` |
| SQLite learning | ✅ | `src-tauri/src/db.rs` + `avatar_*` commands |
| Memory manager | ✅ | `src/lib/optimization/memoryManager.ts` |
| Model routing | ✅ | `src/lib/ai/modelLoader.ts` |
| Emotional TTS | ✅ | `src/lib/voice/voiceEmotion.ts` |
| Shell UI + suggestions | ✅ | `RegenBrowserShell.tsx`, `useAvatarAutomation.ts` |
| Boot on app start | ✅ | `src/lib/avatar/initializeAvatarSystem.ts` |
| Cross-tab emotion | ✅ | `pageContextStore.setTabEmotion` |
| Low-RAM vision throttle | ✅ | `lowRamMode.getVisionIntervalMs` |
| Memory trim (chat/logs) | ✅ | `companionMemoryTrim.ts` |
| Adaptive avatar (GLB hook) | ✅ | `AdaptiveAvatar.tsx` |
| Offline STT fallback | ✅ | `offlineTranscribe.ts` |

Run desktop: `npm run dev` (Tauri required for native webview + page extract).

---

## Vision

```
User opens Regen → Avatar greets
    → Watches tab URL/title + native page text + behavior
    → Detects emotion (happy / frustrated / curious / confused / calm)
    → Offers 2–3 suggestions when stuck (30s cooldown)
    → User accepts or dismisses → SQLite + localStorage learn
    → Gets smarter over time
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ RegenBrowserShell                                        │
│  ┌─────────────────────┐  ┌──────────────────────────┐ │
│  │ TabContentStack      │  │ SimpleAvatar + chat       │ │
│  │ NativeWebView /      │  │ useAvatarAutomation       │ │
│  │ IframeBrowsePane     │  │ useBrowserCompanion       │ │
│  └──────────┬──────────┘  └─────────────┬────────────┘ │
│             │                            │               │
│             ▼                            ▼               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ AutomationLoop (background)                        │ │
│  │  EmotionDetector → PageAnalyzer → MemorySystem       │ │
│  │  Voice (speakWithEmotion) → Sidebar suggestions      │ │
│  └─────────────────────────────────────────────────────┘ │
│             │                                            │
│             ▼                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Tauri: browser_webview_extract_page (JS eval)        │ │
│  │ SQLite: avatar_interactions, avatar_visits           │ │
│  │ Ollama phi3:mini (optional suggestion LLM)           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Emotion engine

**Inputs:** URL/title keywords, native page text (5k chars), scroll speed, click rate, load errors, vision summary.

**Outputs:** `UserEmotion` → mapped to avatar face (`happy`, `concerned`, `curious`, `thinking`, `calm`, …).

**Proactive help:** When `frustrated` or `confused` with intensity ≥ 0.55, after 30s since last offer, and user has not dismissed.

---

## Low RAM design

- Target **~500MB JS heap budget** (`memoryManager`)
- **phi3:mini** default; cloud fallback via `modelLoader`
- Lazy model marks; trim on high heap
- Tab webviews hidden (not destroyed) on switch

---

## Marketing one-liner

**Regen Browser** — emotionally intelligent browsing with a companion that understands context, helps before you ask, and runs lean on real hardware.

See also: [AI_AVATAR_CURSOR_GUIDE.md](./AI_AVATAR_CURSOR_GUIDE.md), [AVATAR_IMPLEMENTATION.md](./AVATAR_IMPLEMENTATION.md).
