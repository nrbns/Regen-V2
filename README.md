# Regen Browser

Privacy-first desktop browser with a native WebView shell, per-tab browsing, and an AI companion sidebar. Built with **Tauri 2**, **React**, and **Vite**.

## Quick start

**Prerequisites:** Node.js 18+, Rust (for desktop), npm.

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite UI, API server (`:4000`), execution WebSocket (`:4001`), and the Tauri window when Rust is installed. Web-only fallback: [http://localhost:5173](http://localhost:5173).

| Command | Purpose |
|--------|---------|
| `npm run dev` | Full dev stack (recommended) |
| `npm run dev:web` | Frontend only |
| `npm run dev:tauri` | Tauri + Vite |
| `npm run kill:dev` | Stop dev ports |
| `npm run build` | Production frontend build |
| `npm run build:tauri` | Frontend build for Tauri |
| `npm run typecheck` | TypeScript (renderer) |
| `npm run lint` | ESLint |

Copy `example.env` to `.env` and adjust API keys as needed.

## Desktop browser

- Route: `/browser` — `RegenBrowserShell` (tabs, URL bar, native/iframe engine).
- **⋮ menu:** downloads, profiles, page summary, **Generate overview → Downloads**.
- **Ctrl+K:** command palette (search, tabs, research, downloads).
- Native tabs use WebView2 children per tab; set **Engine → Native** in the ⋮ menu on Windows.

## Project layout

```
src/              React app (browser shell, avatar, state)
src-tauri/        Rust — native webviews, downloads, IPC
server/           Node API + execution WebSocket
scripts/          dev-smart.js, tauri-dev.js, kill-dev-processes.js
docs/             Developer and build documentation
public/           Static assets
```

## Architecture

```text
React shell (tabs, URL bar, AI sidebar)
    ↕ Tauri IPC
Per-tab WebView2 + SQLite (downloads, session)
    ↕ optional
Node API :4000 · Execution WS :4001
```

Full diagrams and ownership rules: **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)**  
Repo layout and Git rules: **[docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md)**  
AI/Cursor entry: **[AGENTS.md](AGENTS.md)**

## Documentation

- [Developer guide](docs/DEVELOPER.md) — ports, env, key paths
- [Build & run](docs/BUILD_AND_RUN.md) — detailed setup
- [Troubleshooting](docs/TROUBLESHOOTING.md) — common issues
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## License

See [LEGAL.md](LEGAL.md) and [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md).
