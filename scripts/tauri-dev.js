#!/usr/bin/env node
/** Run `tauri dev` with ~/.cargo/bin on PATH (Windows-friendly). */
const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function cargoBinDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(home, '.cargo', 'bin');
}

function envWithCargo() {
  const bin = cargoBinDir();
  const sep = process.platform === 'win32' ? ';' : ':';
  return { ...process.env, PATH: `${bin}${sep}${process.env.PATH || ''}` };
}

function hasCargo() {
  try {
    execSync('cargo --version', { stdio: 'pipe', env: envWithCargo() });
    return true;
  } catch {
    return false;
  }
}

if (!hasCargo()) {
  console.error('\n[Regen] Rust/Cargo not found.\n');
  console.error('Install Rust, then restart the terminal:');
  console.error('  https://rustup.rs/\n');
  console.error('Or run:  winget install Rustlang.Rustup\n');
  console.error('Then use:  npm run dev   (starts API + Vite + Tauri)\n');
  process.exit(1);
}

const child = spawn('npx', ['tauri', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: envWithCargo(),
});

child.on('exit', (code) => process.exit(code ?? 0));
