import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` makes one self-contained HTML file (fonts and code inside it) that can be shared or hosted
// anywhere. The normal build is what the installed app and the web version use.
export default defineConfig(({ mode }) => mode === 'single'
  ? {
    base: './',
    plugins: [viteSingleFile()],
    build: { outDir: 'dist-single', target: 'es2022', assetsInlineLimit: 4_000_000 },
  }
  : {
    base: './',
    clearScreen: false,
    server: { port: 5173, strictPort: true },
    envPrefix: ['VITE_', 'TAURI_ENV_'],
    build: {
      target: 'es2022',
      rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), overlay: resolve(import.meta.dirname, 'overlay.html') } },
    },
  });
