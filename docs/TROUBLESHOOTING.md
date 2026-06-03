# Troubleshooting

## `npm run dev` opens browser only, no desktop window

Install Rust: [https://rustup.rs](https://rustup.rs). Then run `npm run dev` again or `npm run dev:tauri`.

## Tauri invoke / CSP errors in dev

Vite dev CSP must allow `ipc:` and `http://ipc.localhost`. See `vite.config.ts` `server.headers`.

## Tab shows wrong page or blank after switch

Use **Engine → Native** in ⋮. Each tab has its own webview; switching only hides/shows views (see `useActiveTabWebview`).

## Stuck loading spinner

Usually stale `isLoading` on tab switch or back/forward doing a full reload. Fixed in `useShellBrowser` + `useActiveTabWebview`; restart dev after pulling.

## Execution WebSocket `Invalid frame header`

Port 4000 may be HTTP only. Execution WS runs on **4001** via `dev:execution-ws`. Run `npm run kill:dev` then `npm run dev`.

## YouTube / Google in iframe

Use **Native** engine, not iframe. ⋮ → Engine → Native → Retry.

## Page summary / overview download fails

Start API on `:4000` or use desktop native extract. Overview needs a loaded page (not New Tab).

## Downloads empty in web-only mode

Full download folder integration requires the **Tauri** app; web mode triggers a browser file save only.

## Port already in use

```bash
npm run kill:dev
```
