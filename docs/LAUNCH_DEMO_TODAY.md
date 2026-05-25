# Launch demo today (30 min, $0)

Repo: **https://github.com/nrbns/Regen-V2**  
Pages URL (after deploy): **https://nrbns.github.io/Regen-V2/**

## Quick commands (PowerShell)

```powershell
cd "e:\Regen Browser\Regen-V2-1"

git add docs/index.html docs/LAUNCH_DEMO_TODAY.md .github/workflows/pages.yml
git add -A
git commit -m "Ready for v0.1.0-demo launch: avatar system and landing page"
git push origin main

git tag v0.1.0-demo
git push origin v0.1.0-demo
```

## After push

1. **Releases build:** https://github.com/nrbns/Regen-V2/actions (workflow `Release` on tag `v*`)
2. **Pages:** https://github.com/nrbns/Regen-V2/settings/pages — source should be **GitHub Actions** (workflow `Deploy GitHub Pages`)
3. **Download:** https://github.com/nrbns/Regen-V2/releases/tag/v0.1.0-demo

## Signing (optional for first demo)

If Release jobs fail on signing, add secrets per `docs/RELEASE_SETUP.md` or builds may still publish unsigned installers depending on tauri-action config.

## Share copy

**Twitter / X**

```
🔥 Regen Browser demo is live

Emotionally intelligent AI browser with an avatar companion.
Open source • Native desktop • Low RAM

Download: https://github.com/nrbns/Regen-V2/releases/tag/v0.1.0-demo
Site: https://nrbns.github.io/Regen-V2/

#OpenSource #AI #Browser
```

**Hacker News**

- Title: `Show HN: Regen Browser – AI browser with emotionally intelligent companion`
- URL: `https://github.com/nrbns/Regen-V2`

## Local test before sharing

```powershell
npm run dev
```
