# Build and run

## Prerequisites

- **Node.js** 18+
- **Rust** (stable) — [rustup.rs](https://rustup.rs) (required for desktop)
- **npm**

Optional: Ollama for local AI (`ollama pull phi3:mini`).

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts Vite (`5173`), API (`4000`), execution WS (`4001`), and Tauri when Rust is available.

| Command | Use when |
|---------|----------|
| `npm run dev:web` | UI only in browser |
| `npm run dev:tauri` | Force desktop window |
| `npm run dev:server` | API only |
| `npm run dev:execution-ws` | WebSocket only |
| `npm run kill:dev` | Ports stuck |

Open the browser at `/browser` after the app loads.

## Production build

```bash
npm run build:tauri
cd src-tauri
cargo tauri build
```

Windows installer: `npm run build:windows:installer`

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run verify:build
```

## Rust tests

```bash
cd src-tauri
cargo test
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.
