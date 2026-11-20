/** Everything the person can change. The same shape is used by the reader app, the screen tint and the browser extension. */
export interface Settings {
  /** Whether to show text in a reading font. Off keeps the text's own font, and remembers the choice below. */
  fontOn: boolean;
  /** Which reading font to use (an id from FONTS). */
  font: string;
  /** Whether to make the start of each word bold. Off remembers the strength below. */
  bionicOn: boolean;
  /** Bold-front strength: the share of each word, in percent, that is made bold. */
  bionic: number;
  /** Colour tint laid over what you are reading. */
  tint: { on: boolean; colour: string; strength: number };
  /** Reader text size in px. */
  size: number;
  /** Line height as a multiple of the text size. */
  lineHeight: number;
  /** Extra space between letters, in hundredths of an em. */
  letterSpacing: number;
  /** Page and text colours in the reader (an id from PAGE_THEMES). "auto" follows the device's light or dark mode. */
  theme: string;
  /** Widest the reading column may get, in characters. Shorter lines help some readers keep their place. */
  width: number;
  /** Reading ruler: a band that highlights the lines you are on and dims the rest. */
  ruler: { on: boolean; lines: number };
  /** Show slanted (italic) text upright and bold instead, since italics are harder to read. */
  noItalics: boolean;
  /** Read aloud: speed (1 is normal) and the chosen voice's name ("" means the device's default). */
  speech: { rate: number; voice: string };
  /** Tap or click a word to hear it and see it split into parts. */
  wordHelp: boolean;
}

import { FONT_OFF, fontById } from './fonts';

export const BIONIC_MIN = 5;
export const BIONIC_MAX = 80;
/** How much one press of "More bold" or "Less bold" changes the strength. */
export const BIONIC_STEP = 5;
export const TINT_MAX = 70;

export const DEFAULTS: Settings = {
  fontOn: true,
  font: 'opendyslexic',
  bionicOn: true,
  // Starts on Light: studies have not found that more bold helps, and some readers find heavy bold distracting
  bionic: 30,
  tint: { on: false, colour: '#fff3b0', strength: 30 },
  size: 20,
  lineHeight: 1.7,
  // A little extra space between letters has some of the best research support (Zorzi and colleagues, 2012)
  letterSpacing: 8,
  theme: 'auto',
  width: 66,
  ruler: { on: false, lines: 1 },
  noItalics: false,
  speech: { rate: 1, voice: '' },
  wordHelp: true,
};

export const WIDTH_MIN = 30;
export const WIDTH_MAX = 100;

/**
 * Page colours for the reader. Warm, soft backgrounds (cream, peach, yellow) did best for dyslexic readers in
 * Rello and Bigham's 2017 study, so they come first. `dark` themes are for people who prefer light text on dark.
 */
export interface PageTheme { id: string; name: string; bg: string; paper: string; ink: string; muted: string; line: string; dark: boolean }
export const PAGE_THEMES: readonly PageTheme[] = [
  { id: 'cream', name: 'Cream', bg: '#f3ead6', paper: '#fdf6e6', ink: '#2b2a28', muted: '#615c52', line: '#e2d6bb', dark: false },
  { id: 'peach', name: 'Peach', bg: '#f6dcc6', paper: '#fde8d7', ink: '#2e2721', muted: '#66574a', line: '#ebc9ae', dark: false },
  { id: 'yellow', name: 'Yellow', bg: '#f2ecb8', paper: '#fcf7cf', ink: '#2a2a22', muted: '#605d45', line: '#e4dc9c', dark: false },
  { id: 'mint', name: 'Mint', bg: '#dcefdc', paper: '#e9f6e7', ink: '#22302a', muted: '#4f6158', line: '#c4e0c4', dark: false },
  { id: 'blue', name: 'Blue', bg: '#dce7f3', paper: '#e8f0f9', ink: '#202a36', muted: '#4e5c6c', line: '#c5d6ea', dark: false },
  { id: 'grey', name: 'Soft grey', bg: '#e4e4e2', paper: '#efefed', ink: '#262626', muted: '#5a5a58', line: '#d2d2cf', dark: false },
  { id: 'white', name: 'White', bg: '#f2f2f2', paper: '#ffffff', ink: '#1f1f1f', muted: '#5c5c5c', line: '#dddddd', dark: false },
  { id: 'dark', name: 'Dark', bg: '#17191d', paper: '#1f2228', ink: '#e9e6df', muted: '#a5abb5', line: '#343842', dark: true },
  { id: 'dark-warm', name: 'Dark warm', bg: '#1d1915', paper: '#262019', ink: '#f0e2c8', muted: '#b6a68a', line: '#3d342a', dark: true },
];
export const THEME_AUTO = 'auto';
export const themeById = (id: string): PageTheme | undefined => PAGE_THEMES.find((t) => t.id === id);

/** Named points on the bold-front slider. Light, Medium and Strong match the Emotion Shaper app's steps. */
export const BIONIC_MARKS = [
  { value: 30, label: 'Light' },
  { value: 45, label: 'Medium' },
  { value: 60, label: 'Strong' },
] as const;

/** Tint colours commonly used as coloured overlays for reading. */
export const TINT_PRESETS = [
  { name: 'Cream', colour: '#fff3d6' },
  { name: 'Yellow', colour: '#fff3b0' },
  { name: 'Peach', colour: '#ffd8b8' },
  { name: 'Rose', colour: '#ffc9d6' },
  { name: 'Lilac', colour: '#e0cdf5' },
  { name: 'Blue', colour: '#bcd9ff' },
  { name: 'Aqua', colour: '#b8f0ec' },
  { name: 'Green', colour: '#c9f2c0' },
  { name: 'Grey', colour: '#d6d6d6' },
] as const;

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** Turn anything read back from storage into valid settings, keeping what is valid and using defaults for the rest. */
export function normalise(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const t = (r.tint && typeof r.tint === 'object' ? r.tint : {}) as Record<string, unknown>;
  const ru = (r.ruler && typeof r.ruler === 'object' ? r.ruler : {}) as Record<string, unknown>;
  const sp = (r.speech && typeof r.speech === 'object' ? r.speech : {}) as Record<string, unknown>;
  const colour = typeof t.colour === 'string' && /^#[0-9a-f]{6}$/i.test(t.colour) ? t.colour.toLowerCase() : DEFAULTS.tint.colour;
  return {
    // Older settings stored the font as true/false or "off", and bold strength 0 meant off
    fontOn: typeof r.fontOn === 'boolean' ? r.fontOn : !(r.font === false || r.font === FONT_OFF),
    font: typeof r.font === 'string' && fontById(r.font) ? r.font : DEFAULTS.font,
    bionicOn: typeof r.bionicOn === 'boolean' ? r.bionicOn : r.bionic !== 0,
    bionic: r.bionic === 0 ? DEFAULTS.bionic : clamp(r.bionic, BIONIC_MIN, BIONIC_MAX, DEFAULTS.bionic),
    tint: {
      on: typeof t.on === 'boolean' ? t.on : DEFAULTS.tint.on,
      colour,
      strength: clamp(t.strength, 0, TINT_MAX, DEFAULTS.tint.strength),
    },
    size: clamp(r.size, 12, 48, DEFAULTS.size),
    lineHeight: clamp(r.lineHeight, 1, 3, DEFAULTS.lineHeight),
    letterSpacing: clamp(r.letterSpacing, 0, 30, DEFAULTS.letterSpacing),
    theme: typeof r.theme === 'string' && (r.theme === THEME_AUTO || themeById(r.theme)) ? r.theme : DEFAULTS.theme,
    width: clamp(r.width, WIDTH_MIN, WIDTH_MAX, DEFAULTS.width),
    ruler: {
      on: typeof ru.on === 'boolean' ? ru.on : DEFAULTS.ruler.on,
      lines: Math.round(clamp(ru.lines, 1, 5, DEFAULTS.ruler.lines)),
    },
    noItalics: typeof r.noItalics === 'boolean' ? r.noItalics : DEFAULTS.noItalics,
    speech: {
      rate: clamp(sp.rate, 0.5, 2, DEFAULTS.speech.rate),
      voice: typeof sp.voice === 'string' ? sp.voice.slice(0, 200) : DEFAULTS.speech.voice,
    },
    wordHelp: typeof r.wordHelp === 'boolean' ? r.wordHelp : DEFAULTS.wordHelp,
  };
}

/** A short code holding all of someone's settings, to copy from one app or browser into another. */
export function settingsCode(s: Settings): string {
  const json = JSON.stringify(s);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `ER1-${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

/** Read a code made by `settingsCode`. Returns null if it isn't one. */
export function readSettingsCode(code: string): Settings | null {
  const m = /ER1-([A-Za-z0-9_-]+)/.exec(code.replace(/\s+/g, ''));
  if (!m) return null;
  try {
    const b64 = m[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return normalise(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The strength to actually use: 0 while bold is switched off. */
export const boldPercent = (s: Settings): number => (s.bionicOn ? s.bionic : 0);

/** One step more or less bold, staying within the slider's range. */
export const stepBold = (s: Settings, direction: 1 | -1): Settings => ({
  ...s,
  bionicOn: true,
  bionic: Math.min(BIONIC_MAX, Math.max(BIONIC_MIN, Math.round(s.bionic / BIONIC_STEP) * BIONIC_STEP + direction * BIONIC_STEP)),
});

/** Label for a slider position: the nearest named mark when close to one, otherwise the percentage. */
export function bionicLabel(value: number): string {
  if (value <= 0) return 'Off';
  const mark = BIONIC_MARKS.find((m) => m.value > 0 && Math.abs(m.value - value) <= 2);
  return mark ? `${mark.label} (${value}%)` : `${value}%`;
}
