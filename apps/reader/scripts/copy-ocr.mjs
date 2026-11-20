// Copies the text-recognition engine (Tesseract) and its English data into public/ocr, so reading text from photos
// and scanned PDFs works offline and never sends anything to the internet. Runs before every dev and build.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const out = fileURLToPath(new URL('../public/ocr/', import.meta.url));
mkdirSync(out, { recursive: true });
const pkg = (name) => dirname(require.resolve(`${name}/package.json`));
const files = [
  [join(pkg('tesseract.js'), 'dist/worker.min.js'), 'worker.min.js'],
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']
    .map((f) => [join(pkg('tesseract.js-core'), f), f]),
  [join(pkg('@tesseract.js-data/eng'), '4.0.0_best_int/eng.traineddata.gz'), 'eng.traineddata.gz'],
];
for (const [from, to] of files) if (!existsSync(join(out, to))) cpSync(from, join(out, to));
