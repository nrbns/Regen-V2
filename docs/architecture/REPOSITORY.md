# Repository layout and Git conventions

## Top-level layout

```text
Regen-V2-1/
├── src/                 # React application (browser shell, routes, state)
├── src-tauri/           # Rust / Tauri desktop host + native webviews
├── server/              # Node API (redix-server) + execution WebSocket
├── scripts/             # Dev entrypoints (dev-smart, tauri-dev, kill-dev)
├── public/              # Static assets (favicon, avatar images)
├── docs/                # All project documentation
├── tests/               # Unit, integration, e2e, load
├── core/                # Shared agent/execution modules (Node/TS imports)
├── packages/            # Optional workspace packages (e.g. omni-engine)
├── apps/                # Optional Python API (dev:api)
└── example.env          # Env template — copy to .env
```

### Do not commit

| Path | Reason |
|------|--------|
| `node_modules/` | Dependencies |
| `dist/`, `dist-web/` | Vite build output |
| `src-tauri/target/` | Rust build artifacts |
| `data.ms/` | Local Meilisearch data |
| `.env`, `.env.local` | Secrets |
| `*.tsbuildinfo` | TypeScript cache |
| `regen.db` (cwd) | Local dev DB fallback |
| Ad-hoc `*_GUIDE.md` at repo root | Use `docs/` only |

See root `.gitignore`.

### Safe to commit

- Source under `src/`, `src-tauri/`, `server/`, `scripts/`
- `docs/`, `public/`, config (`vite.config.ts`, `tsconfig*.json`)
- `package.json` + lockfile
- Policy: `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` / legal docs

## Branching

- **`main`** — stable; release tags `v*`
- Feature branches: `feature/short-description`
- Fix branches: `fix/issue-description`

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(browser): add overview download to menu
fix(tabs): clear loading on switch
docs: add architecture diagram
chore: remove stale session guides
```

## Pull requests

1. Branch from `main`
2. `npm run typecheck && npm run lint && npm run test:unit`
3. Desktop changes: smoke-test `npm run dev` — tab switch, navigate, back
4. Update `docs/` if behavior or ports change

## Release

- Tag `v1.x.y` triggers `.github/workflows/release.yml` (Tauri bundles)
- See [RELEASE_SETUP.md](../RELEASE_SETUP.md)

## Adding documentation

| Type | Location |
|------|----------|
| Architecture | `docs/architecture/` |
| How to run | `docs/BUILD_AND_RUN.md` |
| Dev reference | `docs/DEVELOPER.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` |
| User-facing overview | Root `README.md` only (keep short) |

Never add duplicate guides at repository root.

## Agent / IDE hints

See root `AGENTS.md` for Cursor-specific entry points and edit boundaries.
