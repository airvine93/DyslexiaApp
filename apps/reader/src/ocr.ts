/**
 * Reading text out of pictures: photos of letters, worksheets and book pages, and scanned PDFs. Runs entirely on the
 * device with Tesseract, so nothing is uploaded. English only for now.
 */
import type Tesseract from 'tesseract.js';

let worker: Promise<Tesseract.Worker> | null = null;
let report: (fraction: number) => void = () => {};

function getWorker(): Promise<Tesseract.Worker> {
  worker ??= import('tesseract.js').then(({ createWorker, OEM }) => {
    const base = new URL('ocr/', location.href).href;
    return createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base.replace(/\/$/, ''),
      gzip: true,
      workerBlobURL: false,
      cacheMethod: 'none',
      logger: (m) => { if (m.status === 'recognizing text') report(m.progress); },
    });
  }).catch((err) => { worker = null; throw err; });
  return worker;
}

export type ImageInput = Blob | HTMLCanvasElement;

/** The text in a picture, as paragraphs. `progress` gets a number from 0 to 1 while it works. */
export async function readPicture(image: ImageInput, progress: (fraction: number) => void = () => {}): Promise<string[]> {
  report = progress;
  let w: Tesseract.Worker;
  try {
    w = await getWorker();
  } catch {
    throw new Error('Reading text from pictures isn’t available in this version of the app.');
  }
  const { data } = await w.recognize(image, {}, { text: true });
  // Lines end at the edge of the picture, not the end of a sentence: join them, keep gaps between paragraphs
  return data.text.split(/\n\s*\n/).map((p) => p.replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}
