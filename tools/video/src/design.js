/**
 * The experiment design: which look each of the 100 ideas gets, how each variant is tagged, and its timeline.
 * Pure data and pure functions, shared by the page (scene.js), the renderer (render.mjs) and the analysis (analyse.mjs).
 */
import { IDEAS } from './ideas.js';

/** Pastels from the DaVinci caption style: light, low saturation, clearly distinct. */
export const ACCENTS = {
  rose: '#F7A8B8', peach: '#FBD1A2', butter: '#F6EE9B', mint: '#A9E5C3',
  sky: '#A6D8F0', periwinkle: '#BFC4F5', orchid: '#E3B8EC', apricot: '#F8C7A8',
};

/** Navy is the Emotion Shaper video theme. Ink is the dark footage look of the DaVinci captions. */
export const THEMES = {
  navy: { bg: '#0E1726', text: '#F5EFE6', muted: '#C9C1B4', dark: true },
  ink: { bg: '#111114', text: '#FFFFFF', muted: '#B9B9C2', dark: true },
  dusk: { bg: '#241631', text: '#F6EEF8', muted: '#C9B8D4', dark: true },
  cream: { bg: '#F6EFE0', text: '#1E2430', muted: '#5E6470', dark: false },
};

export const FONTS = {
  opendyslexic: { name: 'OpenDyslexic', family: 'ER OpenDyslexic', scale: 0.84 },
  lexend: { name: 'Lexend', family: 'ER Lexend', scale: 0.94 },
  atkinson: { name: 'Atkinson Hyperlegible', family: 'ER Atkinson Hyperlegible Next', scale: 1 },
  andika: { name: 'Andika', family: 'ER Andika', scale: 0.96 },
  comicneue: { name: 'Comic Neue', family: 'ER Comic Neue', scale: 1.04 },
  readex: { name: 'Readex Pro', family: 'ER Readex Pro', scale: 0.94 },
};

export const ASKS = {
  a1: 'Find this difficult to read?',
  a2: 'Hard to read?',
  a3: 'Do the words crowd together?',
  a4: 'Does reading ever feel like this?',
};

export const CTAS = {
  c1: { big: 'Read your way', small: 'any text, on any screen' },
  c2: { big: 'Make reading easier', small: 'fonts, bold starts, colour and a ruler' },
  c3: { big: 'Same words', small: 'easier to read' },
  c4: { big: 'Try it on anything', small: 'web pages, documents, books' },
};

const KICKERS = {
  word: { label: 'WORD OF THE DAY', question: 'DO YOU KNOW THIS WORD?' },
  origin: { label: 'WHERE WORDS COME FROM', question: 'EVER WONDERED WHERE THIS COMES FROM?' },
  quote: { label: 'WORDS WORTH KEEPING', question: 'WHO SAID IT?' },
  fact: { label: 'WORD FACT', question: 'DID YOU KNOW?' },
  phrase: { label: 'WORDS AT PLAY', question: 'HAVE YOU HEARD THIS ONE?' },
};

/**
 * Every dimension the experiment varies, with a short code for each level. The codes make up the variant tag.
 * `type` comes from the idea itself. Everything else is dealt out evenly across the 100 videos.
 */
export const DIMENSIONS = {
  type: { word: 'wd', origin: 'or', quote: 'qu', fact: 'fa', phrase: 'ph' },
  hook: { label: 'lb', question: 'qn' },
  scene: { orbs: 'orb', dust: 'dst', letters: 'ltr', ribbons: 'rib' },
  theme: { navy: 'nav', ink: 'ink', dusk: 'dsk', cream: 'crm' },
  accent: { rose: 'ros', peach: 'pch', butter: 'but', mint: 'mnt', sky: 'sky', periwinkle: 'per', orchid: 'orc', apricot: 'apr' },
  hard: { cramped: 'crp', crowd: 'crd', faint: 'fnt', glare: 'glr', swim: 'swm' },
  ask: { a1: 'a1', a2: 'a2', a3: 'a3', a4: 'a4' },
  reveal: { morph: 'mor', scatter: 'sct', flip: 'flp', sweep: 'swp', wave: 'wav' },
  font: { opendyslexic: 'od', lexend: 'lx', atkinson: 'at', andika: 'an', comicneue: 'cn', readex: 'rx' },
  feat: { font: 'f', bionic: 'fb', tint: 'ft', ruler: 'fr', all: 'all' },
  cta: { c1: 'c1', c2: 'c2', c3: 'c3', c4: 'c4' },
  pace: { fast: 'fst', medium: 'med', slow: 'slo' },
  cam: { still: 'stl', drift: 'drf', push: 'psh' },
};

/** What each dimension tests, in plain words. Used in the ideas list and the analysis report. */
export const DIMENSION_NOTES = {
  type: 'What is being taught',
  hook: 'Opening line: a label or a question',
  scene: 'Three.js background',
  theme: 'Background and text colours',
  accent: 'Pastel highlight colour',
  hard: 'How the text is made hard to read',
  ask: 'Wording of the question',
  reveal: 'How the letters change into the reading font',
  font: 'Reading font shown',
  feat: 'Features shown after the font',
  cta: 'Closing line',
  pace: 'Speed',
  cam: 'Camera movement',
};

/** Small seeded random number generator, so the design never changes between runs. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** A list of `n` values with every level used as evenly as possible, in a seeded shuffled order. */
function dealt(levels, n, seed) {
  const r = rng(seed);
  const out = Array.from({ length: n }, (_, i) => levels[i % levels.length]);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const pad = (n) => String(n).padStart(3, '0');
export const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'idea';

/** The 100 variants. Variant n always pairs idea n with the same look. */
export function buildVariants() {
  const n = IDEAS.length;
  const dims = Object.keys(DIMENSIONS).filter((d) => d !== 'type');
  const columns = Object.fromEntries(dims.map((d, k) => [d, dealt(Object.keys(DIMENSIONS[d]), n, 7919 * (k + 1))]));
  return IDEAS.map((idea, i) => {
    const params = { type: idea.t };
    for (const d of dims) params[d] = columns[d][i];
    const id = `ER-${pad(i + 1)}`;
    const tag = `${id}_${Object.keys(DIMENSIONS).map((d) => DIMENSIONS[d][params[d]]).join('-')}`;
    const kicker = params.hook === 'label' && idea.k ? idea.k : KICKERS[idea.t][params.hook];
    return { id, n: i + 1, tag, slug: `${id.toLowerCase()}-${slugify(idea.h)}`, params, seed: 1000 + i, content: { kicker, head: idea.h, sub: idea.s, tail: idea.e ?? '', body: idea.b, motif: idea.m, quoteChecked: idea.t === 'quote' ? !!idea.v : undefined } };
  });
}

/** Read a tag back into its settings, e.g. from a file name or a utm_content value. */
export function parseTag(tag) {
  const [id, codes] = tag.split('_');
  const parts = (codes ?? '').split('-');
  const params = {};
  Object.keys(DIMENSIONS).forEach((d, k) => { params[d] = Object.keys(DIMENSIONS[d]).find((level) => DIMENSIONS[d][level] === parts[k]); });
  return { id, params };
}

/** Feature stages shown after the font change, in order. */
export function stagesFor(feat) {
  return { font: [], bionic: ['bionic'], tint: ['tint'], ruler: ['ruler'], all: ['bionic', 'tint', 'ruler'] }[feat];
}

/** Act times in seconds. Every frame is drawn from these and nothing else. */
export function timeline(variant) {
  const p = { fast: 0.8, medium: 1, slow: 1.25 }[variant.params.pace];
  const words = variant.content.body.split(/\s+/).length;
  const hook = (variant.params.type === 'quote' ? 3.6 : 3.2) * p;
  const teach = Math.max(4.2, 1.6 + words * 0.19) * p;
  const hard = 3.6 * p;
  // the restyled text stays long enough to be read again in full, then each added feature gets its own beat
  const font = Math.max(5, 1.6 + words * 0.22) * p;
  const stage = 3.4 * p;
  const stages = stagesFor(variant.params.feat);
  const t1 = hook, t2 = t1 + teach, t3 = t2 + hard, t4 = t3 + font;
  const stageTimes = stages.map((name, k) => ({ name, start: t4 + k * stage, end: t4 + (k + 1) * stage }));
  const t5 = t4 + stages.length * stage;
  const duration = Math.round((t5 + 3.4) * 30) / 30;
  return { t1, t2, t3, t4, t5, stages: stageTimes, duration, pace: p };
}

/**
 * Five written prompts for the look of a video, each also built into the script as a variety.
 * A variety fixes the background and the settings that give the prompt its character; the idea supplies the words.
 * `{word}`, `{meaning}` and `{lesson}` stand for the idea's own text.
 */
export const VARIETIES = [
  { key: 'V1', name: 'Canopy light', motif: 'dapple', params: { theme: 'navy', accent: 'butter', hard: 'faint', reveal: 'morph', font: 'lexend', feat: 'font', pace: 'medium', cam: 'drift' },
    prompt: 'Three.js, 9:16, 1080x1920, 30fps, every frame a pure function of time. Deep navy background (#0E1726). Behind the text, soft patches of warm light slide and breathe slowly, like sun coming through a canopy; never brighter than a quarter of the text. Camera drifts a few pixels. Text is built from one textured plane per letter. Open with "{word}" in large pale-yellow letters arriving from depth, then "{meaning}" as a small white line and a large yellow line. Shrink these to a title and fade in "{lesson}" in plain white sans-serif. After it has been read, let the lesson sink into small, faint grey serif text and ask "Find this difficult to read?". Then every letter glides to its new place while its shape cross-fades into Lexend with wider spacing. Hold the easy version for at least five seconds. Close on one line and an "Easy Reader" pill.' },
  { key: 'V2', name: 'Falling leaves', motif: 'leaves', params: { theme: 'ink', accent: 'mint', hard: 'swim', reveal: 'scatter', font: 'opendyslexic', feat: 'bionic', pace: 'medium', cam: 'still' },
    prompt: 'Three.js, 9:16, 1080x1920, 30fps, every frame a pure function of time. Near-black background (#111114). About thirty simple leaf shapes in mint and pale gold fall slowly through the depth of the frame, each turning on all three axes, most of them out of the way of the text. Locked camera. One textured plane per letter. Open with "{word}" in large mint letters, then "{meaning}". Shrink to a title and show "{lesson}" in white. Then let the letters of the lesson drift a little out of place, each on its own slow wobble, and ask "Does reading ever feel like this?". For the change, the letters lift off the page and scatter into the air like the leaves, then settle back into OpenDyslexic. Next, make the first part of every word bold. Hold, then close on one line and an "Easy Reader" pill.' },
  { key: 'V3', name: 'Sun shafts', motif: 'shafts', params: { theme: 'navy', accent: 'peach', hard: 'cramped', reveal: 'sweep', font: 'atkinson', feat: 'ruler', pace: 'slow', cam: 'push' },
    prompt: 'Three.js, 9:16, 1080x1920, 30fps, every frame a pure function of time. Deep navy background. Broad slanting shafts of peach-gold light fall from the top right and fade before the bottom, shifting very slowly, with fine dust turning in them at different depths. Camera pushes in by about five percent over the whole video. One textured plane per letter. Open with "{word}" in large peach letters, then "{meaning}". Shrink to a title and show "{lesson}" in white. Then squeeze the lesson into small serif text with tight lines and tight letters and ask "Hard to read?". A thin bar of light sweeps down the page; each line changes to Atkinson Hyperlegible as the bar crosses it. Then a soft highlighted band, a reading ruler, steps down one line at a time while the other lines dim. Slow pace throughout. Close on one line and an "Easy Reader" pill.' },
  { key: 'V4', name: 'Page in the shade', motif: 'shade', params: { theme: 'cream', accent: 'apricot', hard: 'glare', reveal: 'wave', font: 'andika', feat: 'tint', pace: 'medium', cam: 'still' },
    prompt: 'Three.js, 9:16, 1080x1920, 30fps, every frame a pure function of time. A warm cream page (#F6EFE0) with dark ink (#1E2430). The soft shadows of leaves move across the page, as if it were being read outdoors under a tree. Locked camera. One textured plane per letter. Open with "{word}" in large deep-apricot letters, then "{meaning}". Shrink to a title and show "{lesson}" in dark ink. Then the shade lifts: the page flares to hard white and the lesson shrinks to thin black serif text, and the video asks "Find this difficult to read?". For the change, a wave rolls across the lines from left to right, lifting each letter toward the camera as it becomes Andika. Then a soft apricot colour overlay wipes across the whole frame and stays. Close on one line and an "Easy Reader" pill.' },
  { key: 'V5', name: 'Soft focus', motif: 'bokeh', params: { theme: 'dusk', accent: 'sky', hard: 'crowd', reveal: 'flip', font: 'readex', feat: 'all', pace: 'fast', cam: 'drift' },
    prompt: 'Three.js, 9:16, 1080x1920, 30fps, every frame a pure function of time. Deep plum background (#241631). Large out-of-focus discs of light in pale blue and gold float upward at different depths and slowly brighten and dim, with a slightly brighter rim like a camera lens blur. Camera drifts gently. One textured plane per letter. Quick pace. Open with "{word}" in large pale-blue letters, then "{meaning}". Shrink to a title and show "{lesson}" in white. Then pull the letters of the lesson together until they touch and ask "Do the words crowd together?". For the change, each letter flips over in turn, like a card, and comes up in Readex Pro. Then show three features one after another, each with its name above the text: bold word starts, a colour overlay, a reading ruler. Close on one line and an "Easy Reader" pill.' },
];

/** One idea (by its number) rendered in each of the five varieties, for a side-by-side comparison. */
export function buildVarieties(n = 12) {
  const base = buildVariants()[n - 1];
  return VARIETIES.map((v) => {
    const params = { ...base.params, ...v.params };
    const id = `${base.id}-${v.key}`;
    const tag = `${id}_${Object.keys(DIMENSIONS).map((d) => DIMENSIONS[d][params[d]]).join('-')}-${v.motif}`;
    const fill = (text) => text.replace('{word}', base.content.head).replace('{meaning}', `${base.content.sub} ${base.content.tail}`.trim()).replace('{lesson}', base.content.body);
    return { ...base, id, tag, slug: `${id.toLowerCase()}-${slugify(base.content.head)}`, params, variety: v.name, prompt: fill(v.prompt), content: { ...base.content, motif: v.motif } };
  });
}
