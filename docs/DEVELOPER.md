# Developer guide

See [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) for system design and webview ownership.

## Services and ports

| Service | Port | Script |
|---------|------|--------|
| Vite (UI) | 5173 | `dev:web` |
| Redix / API server | 4000 | `dev:server` |
| Execution WebSocket | 4001 | `dev:execution-ws` |
| Tauri desktop | — | `dev:tauri` |

`npm run dev` (`scripts/dev-smart.js`) starts what is not already running.

## Browser stack (important paths)

| Area | Path |
|------|------|
| Shell UI | `src/components/BrowserShell/RegenBrowserShell.tsx` |
| Tab state | `src/state/tabsStore.ts` |
| Shell hook | `src/hooks/useShellBrowser.ts` |
| Native webview sync | `src/lib/browser/tabWebviewSync.ts` |
| Active tab webview owner | `src/hooks/useActiveTabWebview.ts` |
| Rust webviews | `src-tauri/src/browser_webview.rs` |
| Downloads | `src/lib/browser/browserDownloads.ts` |
| Page overview export | `src/lib/browser/pageOverviewExport.ts` |

## Engine modes

- **Native** (Tauri): per-tab WebView2, `browser_webview_*` commands.
- **Iframe**: embedded browse pane (limited on some sites).
- Toggle: ⋮ → Engine, or `useBrowseEngineStore`.

## Environment

- Copy `example.env` → `.env`.
- `REGEN_TAURI=1` — set automatically for Tauri builds.
- `VITE_REGEN_IFRAME_BROWSER=1` — force iframe engine.

## Tests

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
```

Playwright E2E: `npm run test:playwright` (requires setup).

## Production build

```bash
npm run build:tauri
cd src-tauri && cargo tauri build
```

See [BUILD_AND_RUN.md](./BUILD_AND_RUN.md) and [RELEASE_SETUP.md](./RELEASE_SETUP.md).
