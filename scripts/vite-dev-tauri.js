#!/usr/bin/env node
/** Tauri beforeDevCommand — run Vite on :5173 in foreground */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const root = path.join(__dirname, '..');
const PORT = 5173;

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' }, () => {
      s.end();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.setTimeout(800, () => {
      s.destroy();
      resolve(false);
    });
  });
}

(async () => {
  if (await portOpen(PORT)) {
    console.log(`[vite-dev-tauri] Vite already on http://localhost:${PORT}`);
    process.exit(0);
  }

  const tauriPlatform =
    process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';

  console.log('[vite-dev-tauri] Starting Vite on port 5173 (Tauri shell APIs enabled)…');
  const child = spawn(
    'npx',
    [
      'cross-env',
      'REGEN_TAURI=1',
      `TAURI_ENV_PLATFORM=${tauriPlatform}`,
      'JSDOM_NO_CANVAS=1',
      'vite',
      '--mode',
      'development',
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { cwd: root, stdio: 'inherit', shell: true }
  );
  child.on('exit', (code) => process.exit(code ?? 0));
})();
