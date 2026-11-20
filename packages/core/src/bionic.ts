/**
 * Bold-front ("bionic-style") reading: the first part of each word is bold so the eye has an anchor.
 * Rules carried over from the Emotion Shaper app: one- and two-letter words get one bold letter, and words of three or more
 * letters always keep at least one plain letter so the eye still has a tail to land on.
 */

/** How many leading characters of `word` to make bold when `percent` of each word should be bold. */
export function bionicCut(word: string, percent: number): number {
  if (!(percent > 0)) return 0;
  const n = [...word].length;
  if (n === 0) return 0;
  if (n <= 2) return 1;
  return Math.min(n - 1, Math.max(1, Math.round((n * percent) / 100)));
}

export interface Piece { text: string; word: boolean }

/** Letters, digits, apostrophes and hyphens make a word; everything else is a gap. */
const WORDS = /([\p{L}\p{M}\p{N}'’-]+)|([^\p{L}\p{M}\p{N}'’-]+)/gu;

/** Split text into words and the gaps between them. Joining the pieces gives back the original text. */
export function pieces(text: string): Piece[] {
  const out: Piece[] = [];
  for (const m of text.matchAll(WORDS)) out.push({ text: m[0], word: m[1] !== undefined && /\p{L}/u.test(m[0]) });
  return out;
}

/** Split a word into its bold front and plain rest. */
export function splitWord(word: string, percent: number): [front: string, rest: string] {
  const letters = [...word];
  const n = bionicCut(word, percent);
  return [letters.slice(0, n).join(''), letters.slice(n).join('')];
}
