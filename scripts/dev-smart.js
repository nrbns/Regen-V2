#!/usr/bin/env node
/**
 * Start Regen: Vite + API + Tauri (native window) when Rust is available.
 * Fallback: web-only on http://localhost:5173
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const root = path.join(__dirname, '..');

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

function hasCargo() {
  try {
    execSync('cargo --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function cargoPath() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(home, '.cargo', 'bin');
}

function envWithCargo() {
  const bin = cargoPath();
  const sep = process.platform === 'win32' ? ';' : ':';
  return { ...process.env, PATH: `${bin}${sep}${process.env.PATH || ''}` };
}

function runNpm(script) {
  return spawn('npm', ['run', script], { cwd: root, stdio: 'inherit', shell: true });
}

function runConcurrent(scripts) {
  const args = [
    'concurrently',
    '-n',
    scripts.map((s) => s.name).join(','),
    '-c',
    'cyan,green,magenta',
    ...scripts.map((s) => `npm:${s.script}`),
  ];
  return spawn('npx', args, { cwd: root, stdio: 'inherit', shell: true, env: envWithCargo() });
}

(async () => {
  const apiUp = await portOpen(4000);
  const viteUp = await portOpen(5173);

  if (!hasCargo()) {
    console.log('\n[Regen] No Rust → web UI only\n');
    if (viteUp) {
      console.log('[Regen] Open http://localhost:5173 in your browser\n');
      return;
    }
    const child = runConcurrent([
      { name: 'web', script: 'dev:web' },
      ...(apiUp ? [] : [{ name: 'api', script: 'dev:server' }]),
    ]);
    child.on('exit', (c) => process.exit(c ?? 0));
    return;
  }

  console.log('\n[Regen] Starting native app (Tauri) + API + Vite\n');

  const scripts = [];
  if (!apiUp) scripts.push({ name: 'api', script: 'dev:server' });
  else console.log('[Regen] Port 4000 in use — reusing existing API\n');

  if (viteUp && apiUp) {
    console.log('[Regen] Vite on 5173 — launching Tauri only\n');
    const child = spawn('npx', ['tauri', 'dev'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: envWithCargo(),
    });
    child.on('exit', (c) => process.exit(c ?? 0));
    return;
  }

  scripts.push({ name: 'tauri', script: 'dev:tauri:only' });
  const child = runConcurrent(scripts);
  child.on('exit', (c) => process.exit(c ?? 0));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
