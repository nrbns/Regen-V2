# Avatar Implementation

The 3D character uses `/images/character-half.png` (CSS animations only — no JS animation loops).

**Browser shell policy:** All in-browser companion UI must use `BROWSER_AVATAR_SRC` from `avatarAssets.ts` with `lockBrowserArtwork` — do not swap for icons, SVG, or other art in `RegenBrowserShell`.

## Component

`src/components/Avatar/AvatarCompanion.tsx`

| Mode | Size |
|------|------|
| `general` | 280×360 — new tab / home |
| `research` | 160×200 — research sidebar |
| `onboarding` | 200×250 — first-run |
| `settings` | 140×140 — profile |
| `compact` | 48×48 — chrome / panel header |

## Emotions

`idle` · `listening` · `thinking` · `speaking` · `noticing` · `happy` · `concerned` · `excited` · `curious` · `calm`

## AI avatar system (automated)

Boot: `initializeAvatarSystem()` from app init.

| Module | Path |
|--------|------|
| Emotion + loop | `src/lib/emotion/`, `src/lib/automation/automationLoop.ts` |
| Page snippets | `src/lib/browser/fetchPageSnippet.ts`, Rust `browser_webview_extract_page` |
| Learning | `src/lib/memory/memorySystem.ts`, SQLite `avatar_*` commands |
| Docs | `docs/COMPLETE_AI_AVATAR_SYSTEM.md`, `docs/AI_AVATAR_CURSOR_GUIDE.md` |

```ts
window.avatarCompanion?.updateEmotion('thinking');
window.avatarCompanion?.getEmotion();
```

Voice, vision, and LLM handlers call `setAvatarEmotion()` automatically.

## Where it appears

- **General** — `RegenBrowserShell` new tab (`mode="general"`)
- **Research** — `src/routes/Research.tsx` left column
- **Onboarding** — `src/components/onboarding/OnboardingFlow.tsx`
- **Panel / floating** — browser shell companion panel

## 3D model (optional)

Place `public/models/avatar.glb` and swap to `@react-three/fiber` later; image path is the default for performance.
