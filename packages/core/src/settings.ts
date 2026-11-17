/** Everything the person can change. The same shape is used by the reader app, the screen tint and the browser extension. */
export interface Settings {
  /** Show text in OpenDyslexic. */
  font: boolean;
  /** Bold-front strength: the share of each word, in percent, that is made bold. 0 is off. */
  bionic: number;
  /** Colour tint laid over what you are reading. */
  tint: { on: boolean; colour: string; strength: number };
  /** Reader text size in px. */
  size: number;
  /** Line height as a multiple of the text size. */
  lineHeight: number;
  /** Extra space between letters, in hundredths of an em. */
  letterSpacing: number;
}

export const BIONIC_MAX = 80;
export const TINT_MAX = 70;

export const DEFAULTS: Settings = {
  font: true,
  bionic: 40,
  tint: { on: false, colour: '#fff3b0', strength: 30 },
  size: 20,
  lineHeight: 1.7,
  letterSpacing: 4,
};

/** Named points on the bold-front slider. Light, Medium and Strong match the Emotion Shaper app's steps. */
export const BIONIC_MARKS = [
  { value: 0, label: 'Off' },
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
  const colour = typeof t.colour === 'string' && /^#[0-9a-f]{6}$/i.test(t.colour) ? t.colour.toLowerCase() : DEFAULTS.tint.colour;
  return {
    font: typeof r.font === 'boolean' ? r.font : DEFAULTS.font,
    bionic: clamp(r.bionic, 0, BIONIC_MAX, DEFAULTS.bionic),
    tint: {
      on: typeof t.on === 'boolean' ? t.on : DEFAULTS.tint.on,
      colour,
      strength: clamp(t.strength, 0, TINT_MAX, DEFAULTS.tint.strength),
    },
    size: clamp(r.size, 12, 48, DEFAULTS.size),
    lineHeight: clamp(r.lineHeight, 1, 3, DEFAULTS.lineHeight),
    letterSpacing: clamp(r.letterSpacing, 0, 30, DEFAULTS.letterSpacing),
  };
}

/** Label for a slider position: the nearest named mark when close to one, otherwise the percentage. */
export function bionicLabel(value: number): string {
  if (value <= 0) return 'Off';
  const mark = BIONIC_MARKS.find((m) => m.value > 0 && Math.abs(m.value - value) <= 2);
  return mark ? `${mark.label} (${value}%)` : `${value}%`;
}
