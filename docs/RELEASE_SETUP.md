# Regen Browser — Release & Auto-Update Setup

This repo is wired for **GitHub Actions** builds and **Tauri auto-updates**.  
Your remote: `https://github.com/nrbns/Regen-V2`

Complete the steps below once; after that, each release is:

```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## Phase 0 — Prerequisites

- [ ] GitHub repo exists and you can push (`origin` → `nrbns/Regen-V2`)
- [ ] **Node.js 20+** — `node --version`
- [ ] **Rust** — `rustc --version` (install from https://rustup.rs/)
- [ ] On Windows, restart the terminal after installing Rust so `cargo` is on `PATH`

---

## Phase 1 — Signing keys (auto-updates)

Run **once** on your machine:

```bash
npm install
npx tauri signer generate -w "$HOME/.tauri/regen-update.key"
```

Windows (PowerShell):

```powershell
npx tauri signer generate -w "$env:USERPROFILE\.tauri\regen-update.key"
```

Choose a strong password and save it.

### Copy keys

**Private key** (GitHub secret only — never commit):

```bash
# macOS / Linux
cat ~/.tauri/regen-update.key

# Windows
type %USERPROFILE%\.tauri\regen-update.key
```

**Public key** (goes in `src-tauri/tauri.conf.json`):

```bash
cat ~/.tauri/regen-update.key.pub
```

---

## Phase 2 — GitHub Secrets

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | Entire contents of `regen-update.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password from signer generate |

---

## Phase 3 — Enable updater in config

1. Open `src-tauri/tauri.conf.json`
2. Under `plugins.updater`:
   - Paste your **public key** into `pubkey`
   - Set `"active": true` after the pubkey is set
3. Ensure `version` matches `package.json` (currently `1.0.0`)

Update endpoint (already set for this repo):

`https://github.com/nrbns/Regen-V2/releases/latest/download/latest.json`

Optional custom domain later: change `endpoints` in `tauri.conf.json` and host `latest.json` there.

---

## Phase 4 — First release

```bash
git add .
git commit -m "chore: release v1.0.0"
git push origin main

git tag v1.0.0
git push origin v1.0.0
```

1. Open **Actions** → **Release** workflow (~15–25 min for all platforms)
2. Open **Releases** → verify `.msi`, `.dmg`, `.AppImage` / `.deb` assets
3. Test install on your OS

---

## Phase 5 — Download page

- **Simple page:** `public/landing/index.html` (GitHub Releases API)
- **Full marketing page:** `public/landing.html`

**GitHub Pages (optional):**

```bash
git checkout --orphan gh-pages
git rm -rf .
cp public/landing/index.html index.html
git add index.html
git commit -m "docs: download page"
git push origin gh-pages
# → https://nrbns.github.io/Regen-V2/
```

---

## Phase 6 — Patch releases

```bash
# bump version in package.json + src-tauri/tauri.conf.json + src-tauri/Cargo.toml
git add .
git commit -m "fix: your fix description"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

Installed apps with updater enabled will prompt users when `latest.json` on GitHub updates.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `cargo` not found | Install Rust, restart terminal, or use `npm run dev` (adds `~/.cargo/bin` to PATH) |
| Release workflow fails on Linux | Check `libwebkit2gtk-4.1-dev` in workflow (already in `.github/workflows/release.yml`) |
| Auto-update never prompts | Set `plugins.updater.active: true` and valid `pubkey`; secrets must be set in GitHub |
| Wrong repo on download page | Edit `GITHUB_OWNER` / `GITHUB_REPO` in `public/landing/index.html` |

---

## Checklist (printable)

```
BEFORE FIRST RELEASE
☐ Rust + Node installed
☐ Signing keys generated
☐ TAURI_SIGNING_PRIVATE_KEY secret added
☐ TAURI_SIGNING_PRIVATE_KEY_PASSWORD secret added
☐ pubkey pasted in tauri.conf.json
☐ plugins.updater.active set to true
☐ Versions aligned (package.json, tauri.conf.json, Cargo.toml)

RELEASE DAY
☐ git tag vX.Y.Z && git push origin vX.Y.Z
☐ CI green on all matrix jobs
☐ Installers on GitHub Releases
☐ Test install on Windows / macOS / Linux
☐ Share download link (GitHub Releases or Pages)
```
