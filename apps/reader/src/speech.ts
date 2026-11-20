/**
 * Read aloud, sentence by sentence, with the sentence and the word being spoken highlighted. It uses the voices that
 * come with the device (the Web Speech API), so it is free and works without the internet. Highlighting uses the
 * CSS Custom Highlight API, which marks text without changing the page, so the bold word starts are left alone.
 */

interface Run { node: Text; start: number }
interface Sentence { start: number; end: number }

const BLOCK = /^(P|LI|H[1-6]|BLOCKQUOTE|TD|TH|DIV|SECTION|ARTICLE|TR|UL|OL|TABLE|HR|BR)$/;

type Highlights = { set(name: string, h: unknown): void; delete(name: string): void };
const highlights = (): Highlights | null => (globalThis.CSS as unknown as { highlights?: Highlights })?.highlights ?? null;
const HighlightCtor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;

export type SpeechState = 'stopped' | 'playing' | 'paused';

export interface SpeechOptions {
  root: HTMLElement;
  rate: () => number;
  voice: () => string;
  onState: (state: SpeechState) => void;
}

export const speechSupported = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

/** The device's voices. Some systems load them a moment after the page opens. */
export function voices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

/** The voice to use: the one chosen by name, or a local voice in the page's language, or the device's default. */
function pickVoice(all: SpeechSynthesisVoice[], name: string): SpeechSynthesisVoice | undefined {
  if (name) { const v = all.find((x) => x.name === name); if (v) return v; }
  const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
  const base = lang.split('-')[0]!;
  return all.find((v) => v.default && v.lang.toLowerCase().startsWith(base))
    ?? all.find((v) => v.localService && v.lang.toLowerCase() === lang)
    ?? all.find((v) => v.localService && v.lang.toLowerCase().startsWith(base))
    ?? all.find((v) => v.lang.toLowerCase().startsWith(base));
}

export class ReadAloud {
  private text = '';
  private runs: Run[] = [];
  private sentences: Sentence[] = [];
  private index = 0;
  private from = 0;
  private state: SpeechState = 'stopped';
  /** Bumped whenever speaking is restarted, so events from an older utterance are ignored. */
  private generation = 0;
  private voiceList: SpeechSynthesisVoice[] = [];

  constructor(private opts: SpeechOptions) {
    void voices().then((v) => { this.voiceList = v; });
  }

  get current(): SpeechState { return this.state; }

  /** Rebuild the map from text to page after the page was redrawn (the words stay the same). */
  refresh(): void {
    this.runs = [];
    let text = '';
    let lastBlock: Element | null = null;
    const walker = document.createTreeWalker(this.opts.root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      let block: Element | null = n.parentElement;
      while (block && block !== this.opts.root && !BLOCK.test(block.tagName)) block = block.parentElement;
      // A new paragraph, heading or list item starts a new sentence
      if (block !== lastBlock && text && !text.endsWith('\n')) text += '\n';
      lastBlock = block;
      this.runs.push({ node: n, start: text.length });
      text += n.nodeValue ?? '';
    }
    this.text = text;
    this.sentences = splitSentences(text);
    if (this.state !== 'stopped') this.paint(null);
  }

  /** Start reading at a place in the page, or from the top of what is on screen. */
  play(at?: { node: Node; offset: number }): void {
    if (!speechSupported()) return;
    this.refresh();
    if (!this.sentences.length) return;
    const pos = at ? this.offsetOf(at.node, at.offset) : this.firstVisible();
    this.index = Math.max(0, this.sentences.findIndex((s) => s.end > pos));
    this.from = Math.max(pos, this.sentences[this.index]!.start);
    // Start at the beginning of the word that was tapped
    while (this.from > this.sentences[this.index]!.start && /[\p{L}\p{N}'’]/u.test(this.text[this.from - 1]!)) this.from--;
    this.speak();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    speechSynthesis.pause();
    this.set('paused');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    // Some voices can't resume mid-sentence, so start the sentence again
    this.generation++;
    speechSynthesis.cancel();
    this.speak();
  }

  stop(): void {
    this.generation++;
    if (speechSupported()) speechSynthesis.cancel();
    this.set('stopped');
    this.clear();
  }

  /** Jump forward or back one sentence. */
  skip(by: 1 | -1): void {
    if (this.state === 'stopped') return;
    this.index = Math.min(this.sentences.length - 1, Math.max(0, this.index + by));
    this.from = this.sentences[this.index]!.start;
    this.generation++;
    speechSynthesis.cancel();
    this.speak();
  }

  private speak(): void {
    const sentence = this.sentences[this.index];
    if (!sentence) { this.stop(); return; }
    const gen = ++this.generation;
    const from = Math.max(this.from, sentence.start);
    const words = this.text.slice(from, sentence.end);
    const u = new SpeechSynthesisUtterance(words);
    u.rate = this.opts.rate();
    const voice = pickVoice(this.voiceList.length ? this.voiceList : speechSynthesis.getVoices(), this.opts.voice());
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    this.paint({ start: from, end: from });
    this.scrollTo(from);
    u.onboundary = (e) => {
      if (gen !== this.generation || e.name === 'sentence') return;
      const start = from + e.charIndex;
      const len = e.charLength || (/^[\p{L}\p{N}'’]+/u.exec(this.text.slice(start))?.[0].length ?? 0);
      this.paint({ start, end: start + len });
      this.scrollTo(start);
    };
    u.onend = () => {
      if (gen !== this.generation) return;
      this.index++;
      this.from = 0;
      if (this.index >= this.sentences.length) this.stop(); else this.speak();
    };
    u.onerror = (e) => {
      if (gen !== this.generation || e.error === 'interrupted' || e.error === 'canceled') return;
      this.stop();
    };
    if (this.state === 'paused') speechSynthesis.resume();
    speechSynthesis.speak(u);
    this.set('playing');
  }

  private set(state: SpeechState): void {
    if (this.state === state) return;
    this.state = state;
    this.opts.onState(state);
  }

  // ---- mapping between the text and the page

  private offsetOf(node: Node, offset: number): number {
    const i = this.runs.findIndex((r) => r.node === node);
    if (i >= 0) return this.runs[i]!.start + offset;
    // Not a text node: use the first text after it
    for (const r of this.runs) if (node.compareDocumentPosition(r.node) & Node.DOCUMENT_POSITION_FOLLOWING || node.contains(r.node)) return r.start;
    return 0;
  }

  private point(offset: number): [Text, number] | null {
    let lo = 0;
    let hi = this.runs.length - 1;
    if (hi < 0) return null;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.runs[mid]!.start <= offset) lo = mid; else hi = mid - 1;
    }
    const r = this.runs[lo]!;
    return [r.node, Math.min(offset - r.start, r.node.length)];
  }

  private range(start: number, end: number): Range | null {
    const a = this.point(start);
    const b = this.point(end);
    if (!a || !b || !a[0].isConnected || !b[0].isConnected) return null;
    const r = document.createRange();
    try { r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); } catch { return null; }
    return r;
  }

  private firstVisible(): number {
    const sel = getSelection();
    if (sel && !sel.isCollapsed && this.opts.root.contains(sel.anchorNode)) return this.offsetOf(sel.anchorNode!, sel.anchorOffset);
    const top = (document.querySelector('.bar') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0;
    for (const r of this.runs) {
      const range = document.createRange();
      range.selectNodeContents(r.node);
      const rect = range.getBoundingClientRect();
      if (rect.bottom > Math.max(0, top) + 4 && rect.height > 0) return r.start;
    }
    return 0;
  }

  private paint(word: { start: number; end: number } | null): void {
    const h = highlights();
    if (!h || !HighlightCtor) return;
    const s = this.sentences[this.index];
    const sr = s ? this.range(Math.max(this.from, s.start), s.end) : null;
    if (sr) h.set('er-sentence', new HighlightCtor(sr)); else h.delete('er-sentence');
    if (word && word.end > word.start) {
      const wr = this.range(word.start, word.end);
      if (wr) h.set('er-word', new HighlightCtor(wr));
    } else if (word) h.delete('er-word');
  }

  private clear(): void {
    const h = highlights();
    h?.delete('er-sentence');
    h?.delete('er-word');
  }

  private scrollTo(offset: number): void {
    const r = this.range(offset, Math.min(this.text.length, offset + 1));
    const rect = r?.getBoundingClientRect();
    if (!rect || !rect.height) return;
    const top = (document.querySelector('.bar') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0;
    const bottom = window.innerHeight - 120;
    if (rect.top < top + 20 || rect.bottom > bottom) window.scrollBy({ top: rect.top - (top + window.innerHeight * 0.25), behavior: 'smooth' });
  }
}

/** Split text into sentences, never across a paragraph break. */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const add = (start: number, end: number) => {
    // Trim spaces so the highlight hugs the words
    while (start < end && /\s/.test(text[start]!)) start++;
    while (end > start && /\s/.test(text[end - 1]!)) end--;
    if (end > start && /[\p{L}\p{N}]/u.test(text.slice(start, end))) out.push({ start, end });
  };
  let offset = 0;
  for (const para of text.split('\n')) {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string; index: number }> } }).Segmenter;
    if (Seg) {
      for (const s of new Seg(undefined, { granularity: 'sentence' }).segment(para)) add(offset + s.index, offset + s.index + s.segment.length);
    } else {
      const re = /[^.!?]+(?:[.!?]+|$)/g;
      for (const m of para.matchAll(re)) add(offset + m.index!, offset + m.index! + m[0].length);
    }
    offset += para.length + 1;
  }
  return out;
}
