#!/usr/bin/env node
/** Stop Regen dev processes and free ports 5173, 4000, 1420 */
const { execSync } = require('child_process');
const net = require('net');

const PORTS = [5173, 5174, 4000, 1420];
const PROCESS_NAMES = ['omnibrowser-tauri.exe', 'omnibrowser-tauri', 'regen.exe'];

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' }, () => {
      s.end();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.setTimeout(600, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch {
    /* not running */
  }
}

function killPortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) run(`taskkill /F /PID ${pid} /T`);
  } catch {
    /* empty */
  }
}

(async () => {
  console.log('[kill:dev] Cleaning up…');
  for (const name of PROCESS_NAMES) {
    if (process.platform === 'win32') run(`taskkill /F /IM ${name} /T`);
  }
  for (const port of PORTS) {
    if (await portOpen(port)) {
      if (process.platform === 'win32') killPortWin(port);
      else run(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`);
      console.log(`[kill:dev] freed port ${port}`);
    }
  }
  console.log('[kill:dev] Done.');
})();
