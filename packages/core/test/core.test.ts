import { describe, expect, it } from 'vitest';
import { applyBionic, applyBionicToNew, bionicCut, bionicLabel, clearBionic, normalise, pieces, splitWord, tintColour, DEFAULTS } from '../src';

describe('bionicCut', () => {
  it('is off at 0', () => expect(bionicCut('reading', 0)).toBe(0));
  it('gives short words one bold letter', () => {
    expect(bionicCut('a', 40)).toBe(1);
    expect(bionicCut('to', 80)).toBe(1);
  });
  it('always leaves at least one plain letter', () => {
    expect(bionicCut('cat', 80)).toBe(2);
    expect(bionicCut('word', 80)).toBe(3);
  });
  it('grows with the slider', () => {
    const w = 'comprehension'; // 13 letters
    expect(bionicCut(w, 30)).toBe(4);
    expect(bionicCut(w, 45)).toBe(6);
    expect(bionicCut(w, 60)).toBe(8);
  });
  it('counts accented and non-Latin letters as one each', () => {
    expect(splitWord('café', 50)).toEqual(['ca', 'fé']);
    expect(splitWord('привет', 50)).toEqual(['при', 'вет']);
  });
});

describe('pieces', () => {
  it('round-trips the text', () => {
    const t = "It's a well-known fact — 42 people read, 3x faster!";
    expect(pieces(t).map((p) => p.text).join('')).toBe(t);
  });
  it('leaves numbers plain', () => {
    expect(pieces('42 cats').filter((p) => p.word).map((p) => p.text)).toEqual(['cats']);
  });
});

describe('DOM restyling', () => {
  const page = () => {
    document.body.innerHTML = '<p id="p">Reading is <em>easier</em> now.</p><pre>keep code</pre><textarea>typed</textarea>';
    return document.getElementById('p')!;
  };
  it('bolds word fronts and keeps the text identical', () => {
    const p = page();
    applyBionic(document.body, 45);
    expect(p.textContent).toBe('Reading is easier now.');
    expect(Array.from(p.querySelectorAll('b.dr-b')).map((b) => b.textContent)).toEqual(['Rea', 'i', 'eas', 'n']);
    expect(document.querySelector('pre')!.innerHTML).toBe('keep code');
    expect(document.querySelector('textarea')!.value).toBe('typed');
  });
  it('re-applies at a new strength without nesting', () => {
    applyBionic(document.body, 30);
    page();
    applyBionic(document.body, 30);
    applyBionic(document.body, 60);
    expect(document.querySelectorAll('span.dr-w span.dr-w').length).toBe(0);
    expect(document.querySelector('b.dr-b')!.textContent).toBe('Read');
  });
  it('can be fully undone', () => {
    const p = page();
    const before = p.innerHTML;
    applyBionic(document.body, 50);
    clearBionic(document.body);
    expect(p.innerHTML).toBe(before);
  });
  it('only touches new content when asked to', () => {
    page();
    applyBionic(document.body, 50);
    const extra = document.createElement('p');
    extra.textContent = 'More text';
    document.body.append(extra);
    applyBionicToNew(extra, 50);
    applyBionicToNew(document.body, 50);
    expect(document.querySelectorAll('span.dr-w span.dr-w').length).toBe(0);
    expect(extra.querySelectorAll('b.dr-b').length).toBe(2);
  });
});

describe('settings', () => {
  it('falls back to defaults for junk', () => {
    expect(normalise(null)).toEqual(DEFAULTS);
    expect(normalise({ bionic: 500, tint: { colour: 'red', strength: -4 } }).bionic).toBe(80);
    expect(normalise({ tint: { colour: 'red' } }).tint.colour).toBe(DEFAULTS.tint.colour);
    expect(normalise({ tint: { strength: -4 } }).tint.strength).toBe(0);
  });
  it('labels slider positions', () => {
    expect(bionicLabel(0)).toBe('Off');
    expect(bionicLabel(44)).toBe('Medium (44%)');
    expect(bionicLabel(52)).toBe('52%');
  });
  it('builds the tint colour', () => {
    expect(tintColour({ ...DEFAULTS, tint: { on: true, colour: '#ff8000', strength: 25 } })).toBe('rgba(255, 128, 0, 0.25)');
  });
});
