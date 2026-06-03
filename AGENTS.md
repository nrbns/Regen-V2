# Agent guide (Cursor / CI)

Regen Browser — Tauri desktop + React. **Primary surface:** `RegenBrowserShell` at `/` and `/browser`.

## Read first

1. [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) — layers, webview ownership, events
2. [docs/DEVELOPER.md](docs/DEVELOPER.md) — ports 5173 / 4000 / 4001
3. [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Edit boundaries

| Task | Touch |
|------|--------|
| Tab switch / loading | `useActiveTabWebview.ts`, `useShellBrowser.ts`, `tabsStore.ts` |
| Native webview IPC | `tabWebviewSync.ts`, `browser_webview.rs` |
| URL bar vs webview URL | `nativePageSync.ts` |
| Nav back/forward | `useShellBrowser.ts`, `tabWebviewNav.ts` |
| Downloads / overview file | `browserDownloads.ts`, `pageOverviewExport.ts`, `commands.rs` |
| UI chrome only | `RegenBrowserShell.tsx`, `BrowserNavBar.tsx` |

**Do not** add second code paths that call `activateTabWebview` on tab switch (causes races).

## Commands

```bash
npm run dev          # full stack
npm run typecheck    # renderer TS
npm run lint
npm run kill:dev     # free ports
```

## Do not

- Commit `dist-web/`, `data.ms/`, `.env`, or root `*_GUIDE.md` session dumps
- Replace `TabContentStack` with a single shared iframe for all tabs
- Run destructive git commands unless the user asks
