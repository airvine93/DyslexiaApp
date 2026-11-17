// Builds the browser extension into dist/. Load dist/ as an unpacked extension in Chrome or Edge, or as a temporary
// add-on in Firefox. For Safari, run Apple's converter on dist/ (see README).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/fonts', { recursive: true });
await build({
  entryPoints: { content: 'src/content.ts', popup: 'src/popup.ts' },
  outdir: 'dist', bundle: true, format: 'iife', target: 'es2022', minify: true, legalComments: 'none',
});
cpSync('static', 'dist', { recursive: true });
for (const f of ['OpenDyslexic-Regular.otf', 'OpenDyslexic-Bold.otf', 'OpenDyslexic-LICENSE.txt']) cpSync(`../../packages/core/fonts/${f}`, `dist/fonts/${f}`);
for (const s of [16, 32, 48, 128]) cpSync(`../reader/src-tauri/icons/${s === 128 ? '128x128' : s === 32 ? '32x32' : 'icon'}.png`, `dist/icon-${s}.png`);
console.log('Built extension in apps/extension/dist');
