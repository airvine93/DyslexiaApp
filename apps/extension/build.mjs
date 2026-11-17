// Builds the browser extension into dist/. Load dist/ as an unpacked extension in Chrome or Edge, or as a temporary
// add-on in Firefox. For Safari, run Apple's converter on dist/ (see README).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/fonts', { recursive: true });
await build({
  entryPoints: { content: 'src/content.ts', popup: 'src/popup.ts' },
  outdir: 'dist', bundle: true, format: 'iife', target: 'es2022', minify: true, legalComments: 'none',
});
cpSync('static', 'dist', { recursive: true });
cpSync('../../packages/core/fonts', 'dist/fonts', { recursive: true });
for (const s of [16, 32, 48, 128]) cpSync(`../reader/src-tauri/icons/${s === 128 ? '128x128' : s === 32 ? '32x32' : 'icon'}.png`, `dist/icon-${s}.png`);
// The full reader, built into the extension, for "Open in Easy Reader". It shares the extension's settings.
execSync('node scripts/copy-ocr.mjs && npx vite build --outDir ../extension/dist/reader --emptyOutDir --logLevel warn', { cwd: '../reader', stdio: 'inherit' });
rmSync('dist/reader/overlay.html', { force: true });
console.log('Built extension in apps/extension/dist');
