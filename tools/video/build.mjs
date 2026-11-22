/**
 * Builds the player page.
 *   dist/player.html    everything inlined (Three.js, fonts, the 100 variants). The renderer uses this. Opens from disk.
 *   dist/artifact.html  the same page as a publishable fragment that loads Three.js from cdnjs.
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const core = join(here, '../../packages/core/fonts');
const fontsource = (pkg, file) => join(dirname(require.resolve(`${pkg}/package.json`)), 'files', file);

const FACES = [
  ['Inter ER', 400, 'normal', fontsource('@fontsource/inter', 'inter-latin-400-normal.woff2')],
  ['Inter ER', 600, 'normal', fontsource('@fontsource/inter', 'inter-latin-600-normal.woff2')],
  ['Inter ER', 800, 'normal', fontsource('@fontsource/inter', 'inter-latin-800-normal.woff2')],
  ['Serif ER', 400, 'normal', fontsource('@fontsource/source-serif-4', 'source-serif-4-latin-400-normal.woff2')],
  ['Serif ER', 400, 'italic', fontsource('@fontsource/source-serif-4', 'source-serif-4-latin-400-italic.woff2')],
  ['ER OpenDyslexic', 400, 'normal', join(core, 'opendyslexic/OpenDyslexic-Regular.otf')],
  ['ER OpenDyslexic', 700, 'normal', join(core, 'opendyslexic/OpenDyslexic-Bold.otf')],
  ...[['ER Lexend', 'lexend'], ['ER Atkinson Hyperlegible Next', 'atkinson-hyperlegible-next'], ['ER Andika', 'andika'], ['ER Comic Neue', 'comic-neue'], ['ER Readex Pro', 'readex-pro']]
    .flatMap(([family, id]) => [400, 700].map((w) => [family, w, 'normal', join(core, `${id}/${id}-latin-${w}-normal.woff2`)])),
];

const fontCss = () => FACES.map(([family, weight, style, file]) => {
  const otf = file.endsWith('.otf');
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(data:font/${otf ? 'otf' : 'woff2'};base64,${readFileSync(file).toString('base64')}) format("${otf ? 'opentype' : 'woff2'}")}`;
}).join('\n');

const bundle = async (entry) => (await build({ entryPoints: [join(here, 'src', entry)], bundle: true, write: false, format: 'iife', platform: 'browser',
  target: 'chrome110', minify: true, legalComments: 'none', logLevel: 'error' })).outputFiles[0].text.replace(/<\/script/g, '<\\/script');

/** Build both pages and return the path of the self-contained one. */
export async function buildAll() {
  const shell = readFileSync(join(here, 'src/shell.html'), 'utf8').replace('/*FONTS*/', () => fontCss());
  const [local, cdn] = [await bundle('entry-local.js'), await bundle('entry-cdn.js')];
  mkdirSync(join(here, 'dist'), { recursive: true });
  const player = join(here, 'dist/player.html');
  writeFileSync(player, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${shell.replace('/*SCRIPTS*/', () => `<script>${local}</script>`)}</body></html>`);
  writeFileSync(join(here, 'dist/artifact.html'), shell.replace('/*SCRIPTS*/', () => `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>${cdn}</script>`));
  return player;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`built ${await buildAll()}`);
