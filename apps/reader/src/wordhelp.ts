/**
 * Word help: tap or click a word to see it large, split into parts ("com·pre·hen·sion"), and hear it said, said
 * slowly, or spelled out letter by letter. Parts come from the same hyphenation rules that typesetters use, which
 * match spoken syllables most of the time.
 */
import { hyphenateSync } from 'hyphen/en-gb';
import { speechSupported } from './speech';

const WORD = /[\p{L}\p{M}'’]/u;
const BLOCK = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, .page';

/** Where on the page a point is, as a text position. */
export function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** The whole word at a text position, even when the bold front and the rest sit in different parts of the page. */
export function wordAt(at: { node: Node; offset: number }): string {
  const el = at.node.nodeType === Node.TEXT_NODE ? at.node.parentElement : (at.node as Element);
  const block = el?.closest(BLOCK);
  if (!block) return '';
  const before = document.createRange();
  before.setStart(block, 0);
  try { before.setEnd(at.node, at.offset); } catch { return ''; }
  const text = block.textContent ?? '';
  let i = before.toString().length;
  let start = i;
  let end = i;
  while (start > 0 && WORD.test(text[start - 1]!)) start--;
  while (end < text.length && WORD.test(text[end]!)) end++;
  if (start === end) return '';
  return text.slice(start, end).replace(/^['’]+|['’]+$/g, '');
}

export const wordParts = (word: string): string[] => hyphenateSync(word, { hyphenChar: '·', minWordLength: 4 }).split('·');

function say(text: string, rate: number, voice: string): void {
  if (!speechSupported()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  const v = speechSynthesis.getVoices().find((x) => x.name === voice);
  if (v) { u.voice = v; u.lang = v.lang; }
  speechSynthesis.speak(u);
}

export class WordHelp {
  private card: HTMLDivElement;
  private opener: Element | null = null;

  constructor(private speech: () => { rate: number; voice: string }) {
    this.card = document.createElement('div');
    this.card.className = 'word-card';
    this.card.setAttribute('role', 'dialog');
    this.card.setAttribute('aria-label', 'Word help');
    this.card.hidden = true;
    document.body.append(this.card);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.card.hidden) this.close(); });
    document.addEventListener('pointerdown', (e) => { if (!this.card.hidden && !this.card.contains(e.target as Node)) this.close(); }, true);
    window.addEventListener('scroll', () => this.close(), { passive: true });
  }

  get open(): boolean { return !this.card.hidden; }

  show(word: string, x: number, y: number): void {
    const parts = wordParts(word);
    const s = this.speech();
    this.card.replaceChildren();
    const big = document.createElement('div');
    big.className = 'word-big';
    big.textContent = word;
    const split = document.createElement('div');
    split.className = 'word-parts';
    split.textContent = parts.length > 1 ? parts.join(' · ') : 'One part';
    split.setAttribute('aria-label', parts.length > 1 ? `Parts: ${parts.join(', ')}` : 'One part');
    const row = document.createElement('div');
    row.className = 'row';
    const button = (label: string, run: () => void) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', run);
      row.append(b);
      return b;
    };
    if (speechSupported()) {
      button('Say it', () => say(word, s.rate, s.voice));
      button('Slowly', () => say(parts.length > 1 ? parts.join(', ') : word, Math.max(0.5, s.rate * 0.6), s.voice));
      button('Spell it', () => say([...word].join(', '), Math.max(0.5, s.rate * 0.8), s.voice));
    }
    const close = button('Close', () => this.close());
    close.setAttribute('aria-label', 'Close word help');
    this.card.append(big, split, row);
    this.card.hidden = false;
    this.opener = document.activeElement;
    const w = this.card.offsetWidth;
    const h = this.card.offsetHeight;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2));
    const top = y + 24 + h < window.innerHeight ? y + 24 : Math.max(8, y - h - 24);
    Object.assign(this.card.style, { left: `${left}px`, top: `${top}px` });
    (row.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }

  close(): void {
    if (this.card.hidden) return;
    this.card.hidden = true;
    if (this.opener instanceof HTMLElement && this.card.contains(document.activeElement)) this.opener.focus({ preventScroll: true });
  }
}
