import './styles.css';
import {
  applyBionic, bionicLabel, boldPercent, cssVars, fontClasses, fontFaces, normalise, readSettingsCode, settingsCode, stepBold, themeById,
  BIONIC_MAX, BIONIC_MIN, BIONIC_MARKS, DEFAULTS, FONTS, PAGE_THEMES, TINT_PRESETS, THEME_AUTO, tintColour, tintVisible, type Settings,
} from '@dr/core';
import { ACCEPT, fileToHtml, pastedToHtml } from './files';
import { capabilities, onIncomingText, onScreenTintOff, setScreenTint } from './platform';
import {
  currentDocId, deleteDoc, getDoc, inExtension, listDocs, loadSettings, loadSetups, markSetupSeen, migrateOldDoc, newId, onSettingsChanged,
  putDoc, saveSettings, saveSetups, screenTintWanted, setCurrentDocId, setScreenTintWanted, setupSeen, titleOf, type Doc,
} from './store';
import { ReadAloud, speechSupported, voices } from './speech';
import { Ruler } from './ruler';
import { caretAt, WordHelp, wordAt } from './wordhelp';
import { runSetup } from './setup';

const WELCOME = `<h1>Welcome to Easy Reader</h1>
<p>Bring in something to read with <strong>Open</strong>: paste what you copied, open a file (text, web page, PDF, Word or ebook), take a photo of some text, or type it in. It will appear here in a way that is easier to read.</p>
<p>Use the bar at the top to switch the reading font on or off, pick a font, and make words more or less bold. Press <strong>Read aloud</strong> to hear the text, with each word lit up as it is spoken.</p>
<p>Tap or click any word to hear it and see it split into parts.</p>
<p>Open <strong>Settings</strong> for more: page colours, a reading ruler, line length, spacing, a coloured overlay, and saved setups. Press <strong>Help me choose</strong> there to try a few looks side by side.</p>`;

/** Documents bigger than this (in characters) only re-bold when you let go of the slider, so dragging stays smooth. */
const BIG_DOC = 150_000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = {
  page: $('page'), editor: $<HTMLFormElement>('editor'), editorText: $<HTMLTextAreaElement>('editor-text'),
  panel: $('panel'), toggle: $<HTMLButtonElement>('toggle-panel'), tint: $('tint'), status: $('status'),
  fonts: $('fonts'), fontOn: $<HTMLInputElement>('font-on'), bionicOn: $<HTMLInputElement>('bionic-on'),
  qFontOn: $<HTMLButtonElement>('q-font-on'), qFont: $<HTMLSelectElement>('q-font'), qBoldOn: $<HTMLButtonElement>('q-bold-on'),
  qBold: $<HTMLInputElement>('q-bold'), qBoldOut: $<HTMLOutputElement>('q-bold-out'), qLess: $<HTMLButtonElement>('q-less'),
  qMore: $<HTMLButtonElement>('q-more'), qRuler: $<HTMLButtonElement>('q-ruler'), bionic: $<HTMLInputElement>('bionic'), bionicOut: $<HTMLOutputElement>('bionic-out'),
  tintOn: $<HTMLInputElement>('tint-on'), tintColour: $<HTMLInputElement>('tint-colour'), tintStrength: $<HTMLInputElement>('tint-strength'),
  tintOut: $<HTMLOutputElement>('tint-out'), swatches: $('swatches'), screenRow: $('screen-row'), screen: $<HTMLInputElement>('tint-screen'),
  screenHint: $('screen-hint'), size: $<HTMLInputElement>('size'), sizeOut: $<HTMLOutputElement>('size-out'),
  line: $<HTMLInputElement>('line'), lineOut: $<HTMLOutputElement>('line-out'), spacing: $<HTMLInputElement>('spacing'),
  spacingOut: $<HTMLOutputElement>('spacing-out'), width: $<HTMLInputElement>('width'), widthOut: $<HTMLOutputElement>('width-out'),
  themes: $('themes'), noItalics: $<HTMLInputElement>('no-italics'), rulerOn: $<HTMLInputElement>('ruler-on'),
  rulerLines: $<HTMLInputElement>('ruler-lines'), rulerLinesOut: $<HTMLOutputElement>('ruler-lines-out'),
  say: $<HTMLButtonElement>('say'), player: $('player'), pPlay: $<HTMLButtonElement>('p-play'), pRate: $<HTMLSelectElement>('p-rate'),
  voice: $<HTMLSelectElement>('voice'), rate: $<HTMLInputElement>('rate'), rateOut: $<HTMLOutputElement>('rate-out'),
  speechHint: $('speech-hint'), wordHelp: $<HTMLInputElement>('word-help'),
  openMenu: $<HTMLButtonElement>('open-menu'), openList: $('open-list'), recent: $('recent'), recentList: $('recent-list'),
  setups: $('setups'),
};

const fontStyle = document.createElement('style');
// Every bundled font file, as a URL the app can load. Only the chosen font is actually downloaded by the browser.
const fontFiles = import.meta.glob('../../../packages/core/fonts/**/*.{otf,woff2}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const fontUrl = (file: string) => fontFiles[`../../../packages/core/fonts/${file}`] ?? '';
fontStyle.textContent = fontFaces(fontUrl);
document.head.append(fontStyle);

let settings: Settings = DEFAULTS;
let screenTint = screenTintWanted();
let canTintScreen = false;
let docHtml = WELCOME;
let doc: Doc | null = null;
let boldPending = false;

const ruler = new Ruler(el.page);
const speech = new ReadAloud({
  root: el.page,
  rate: () => settings.speech.rate,
  voice: () => settings.speech.voice,
  onState: (state) => {
    el.player.hidden = state === 'stopped';
    el.say.setAttribute('aria-pressed', String(state !== 'stopped'));
    el.pPlay.textContent = state === 'playing' ? '⏸' : '▶';
    el.pPlay.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Carry on');
    el.pPlay.title = state === 'playing' ? 'Pause' : 'Carry on';
    document.body.classList.toggle('speaking', state !== 'stopped');
  },
});
const wordHelp = new WordHelp(() => settings.speech);

/** Tell screen reader users what changed, without re-reading the whole page. */
function announce(message: string): void {
  el.status.textContent = '';
  requestAnimationFrame(() => { el.status.textContent = message; });
}

/** Draw the document, then add the bold word fronts. */
function renderDoc(): void {
  el.page.innerHTML = docHtml;
  restyle();
}

/** Redo the bold word fronts on the page as it is, keeping the reader's place. */
function restyle(): void {
  boldPending = false;
  applyBionic(el.page, boldPercent(settings));
  // Reading aloud keeps a map of the words on the page, which needs redoing when the page changes
  if (speech.current !== 'stopped') speech.refresh();
}

const isDark = (s: Settings) => s.theme === THEME_AUTO ? matchMedia('(prefers-color-scheme: dark)').matches : !!themeById(s.theme)?.dark;

/** Apply everything except the bold fronts, which need the document redrawn. */
function renderLook(): void {
  const s = settings;
  const html = document.documentElement;
  for (const [cls, on] of Object.entries(fontClasses(s))) html.classList.toggle(cls, on);
  html.classList.toggle('no-italics', s.noItalics);
  html.classList.toggle('dark-page', isDark(s));
  const root = html.style;
  root.setProperty('--family', cssVars(s)['--dr-family']!);
  root.setProperty('--size', `${s.size}px`);
  root.setProperty('--line', String(s.lineHeight));
  root.setProperty('--ls', `${s.letterSpacing / 100}em`);
  root.setProperty('--ws', `${0.1 + s.letterSpacing / 50}em`);
  root.setProperty('--width', `${s.width}ch`);
  const theme = themeById(s.theme);
  for (const [prop, key] of [['--bg', 'bg'], ['--paper', 'paper'], ['--ink', 'ink'], ['--muted', 'muted'], ['--line-c', 'line']] as const) {
    if (theme) root.setProperty(prop, theme[key]); else root.removeProperty(prop);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme?.bg ?? (isDark(s) ? '#17191d' : '#f7f3ea'));
  const showInApp = tintVisible(s) && !(canTintScreen && screenTint);
  el.tint.style.background = showInApp ? tintColour(s) : 'transparent';

  for (const b of el.fonts.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.font === s.font));
  el.fontOn.checked = s.fontOn;
  el.fonts.classList.toggle('dimmed', !s.fontOn);
  el.qFontOn.setAttribute('aria-pressed', String(s.fontOn));
  el.qFontOn.innerHTML = `Font<span class="state"> ${s.fontOn ? 'on' : 'off'}</span>`;
  el.qFont.value = s.font;
  el.bionicOn.checked = s.bionicOn;
  el.bionic.value = String(s.bionic);
  el.bionicOut.value = s.bionicOn ? bionicLabel(s.bionic) : 'Off';
  el.qBoldOn.setAttribute('aria-pressed', String(s.bionicOn));
  el.qBoldOn.innerHTML = `Bold<span class="state"> ${s.bionicOn ? 'on' : 'off'}</span>`;
  el.qBold.value = String(s.bionic);
  el.qBoldOut.value = s.bionicOn ? `${s.bionic}%` : 'Off';
  el.qLess.disabled = s.bionicOn && s.bionic <= BIONIC_MIN;
  el.qMore.disabled = s.bionicOn && s.bionic >= BIONIC_MAX;
  el.qRuler.setAttribute('aria-pressed', String(s.ruler.on));
  el.tintOn.checked = s.tint.on;
  el.tintColour.value = s.tint.colour;
  el.tintStrength.value = String(s.tint.strength);
  el.tintOut.value = `${s.tint.strength}%`;
  el.screen.checked = screenTint;
  el.screen.disabled = !s.tint.on;
  for (const b of el.swatches.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.colour === s.tint.colour));
  for (const b of el.themes.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.theme === s.theme));
  el.noItalics.checked = s.noItalics;
  el.size.value = String(s.size); el.sizeOut.value = `${s.size}px`;
  el.line.value = String(s.lineHeight); el.lineOut.value = s.lineHeight.toFixed(1);
  el.spacing.value = String(s.letterSpacing); el.spacingOut.value = s.letterSpacing === 0 ? 'Normal' : `+${s.letterSpacing}`;
  el.width.value = String(s.width); el.widthOut.value = `${s.width} letters`;
  el.rulerOn.checked = s.ruler.on;
  el.rulerLines.value = String(s.ruler.lines); el.rulerLinesOut.value = String(s.ruler.lines);
  el.rate.value = String(s.speech.rate); el.rateOut.value = `${s.speech.rate.toFixed(1)}×`;
  el.pRate.value = String(s.speech.rate);
  if (el.voice.options.length) el.voice.value = s.speech.voice;
  el.wordHelp.checked = s.wordHelp;
  ruler.set(s.ruler.on, s.ruler.lines);
}

let screenTimer = 0;
/**
 * Change settings and redraw what changed. `live` is for sliders being dragged: on a big document the bold word
 * starts then wait until the slider is let go.
 */
function update(change: Partial<Settings> | ((s: Settings) => Settings), opts: { live?: boolean; say?: string } = {}): void {
  const before = boldPercent(settings);
  settings = normalise(typeof change === 'function' ? change(settings) : { ...settings, ...change });
  saveSettings(settings);
  renderLook();
  if (boldPercent(settings) !== before) {
    if (opts.live && docHtml.length > BIG_DOC) boldPending = true; else restyle();
  }
  if (opts.say) announce(opts.say);
  // The whole-screen tint lives in another window; don't flood it while a slider is being dragged
  window.clearTimeout(screenTimer);
  screenTimer = window.setTimeout(() => { if (canTintScreen) void setScreenTint(settings, screenTint); }, 30);
}
const boldSaid = () => (settings.bionicOn ? `Bold ${settings.bionic}%` : 'Bold off');
const finishSlide = () => { if (boldPending) restyle(); };

// ---- documents

async function show(html: string, title?: string): Promise<void> {
  speech.stop();
  docHtml = html || WELCOME;
  el.editor.hidden = true;
  el.page.hidden = false;
  renderDoc();
  window.scrollTo({ top: 0 });
  ruler.refresh();
  if (!html) return;
  doc = { id: newId(), title: title || titleOf(html), html, place: 0, opened: Date.now() };
  setCurrentDocId(doc.id);
  await putDoc(doc);
  void drawRecent();
  announce(`Opened ${doc.title}`);
}

async function reopen(id: string): Promise<void> {
  const d = await getDoc(id);
  if (!d) { void drawRecent(); return; }
  speech.stop();
  doc = { ...d, opened: Date.now() };
  docHtml = d.html;
  setCurrentDocId(d.id);
  el.editor.hidden = true;
  el.page.hidden = false;
  renderDoc();
  ruler.refresh();
  // Go back to where the reader had got to
  requestAnimationFrame(() => window.scrollTo({ top: d.place * Math.max(0, document.documentElement.scrollHeight - innerHeight) }));
  void putDoc(doc);
  void drawRecent();
  announce(`Opened ${d.title}`);
}

let placeTimer = 0;
window.addEventListener('scroll', () => {
  if (!doc) return;
  clearTimeout(placeTimer);
  placeTimer = window.setTimeout(() => {
    if (!doc) return;
    const room = document.documentElement.scrollHeight - innerHeight;
    doc.place = room > 0 ? Math.min(1, scrollY / room) : 0;
    void putDoc(doc);
  }, 600);
}, { passive: true });

async function drawRecent(): Promise<void> {
  const docs = await listDocs();
  el.recent.hidden = !docs.length;
  el.recentList.replaceChildren(...docs.slice(0, 8).map((d) => {
    const li = document.createElement('li');
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'recent-open'; open.textContent = d.title;
    if (doc?.id === d.id) open.setAttribute('aria-current', 'true');
    open.addEventListener('click', () => { setMenu(false); void reopen(d.id); });
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'recent-del'; del.textContent = '×';
    del.setAttribute('aria-label', `Forget ${d.title}`); del.title = 'Forget this';
    del.addEventListener('click', async () => {
      await deleteDoc(d.id);
      if (doc?.id === d.id) { doc = null; setCurrentDocId(null); }
      void drawRecent();
    });
    li.append(open, del);
    return li;
  }));
}

function toast(message: string, ms = 5000): { set(m: string): void; done(): void } {
  const t = document.createElement('div');
  t.className = 'toast';
  t.role = 'status';
  t.textContent = message;
  document.body.append(t);
  let timer = ms ? setTimeout(() => t.remove(), ms) : 0;
  return {
    set: (m) => { t.textContent = m; },
    done: () => { clearTimeout(timer); timer = 0; t.remove(); },
  };
}

async function openFile(file: File): Promise<void> {
  const busy = toast('Opening…', 0);
  try {
    const html = await fileToHtml(file, (m) => busy.set(m));
    busy.done();
    await show(html, titleOf(html, file.name.replace(/\.[^.]+$/, '')));
  } catch (err) {
    busy.done();
    toast(err instanceof Error ? err.message : 'That file could not be opened.', 8000);
  }
}

// ---- controls

const marks = $('bionic-marks');
const markLabels = $('bionic-mark-labels');
for (const m of BIONIC_MARKS) {
  const o = document.createElement('option');
  o.value = String(m.value); o.label = m.label;
  marks.append(o);
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = m.label;
  b.style.left = `${((m.value - BIONIC_MIN) / (BIONIC_MAX - BIONIC_MIN)) * 100}%`;
  b.addEventListener('click', () => update({ bionicOn: true, bionic: m.value }, { say: `Bold ${m.label}` }));
  markLabels.append(b);
}
for (const p of TINT_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button'; b.role = 'radio'; b.dataset.colour = p.colour; b.title = p.name; b.setAttribute('aria-label', p.name);
  b.style.background = p.colour;
  b.addEventListener('click', () => update((s) => ({ ...s, tint: { ...s.tint, on: true, colour: p.colour } })));
  el.swatches.append(b);
}
const autoTheme = { id: THEME_AUTO, name: 'Match my device', paper: 'linear-gradient(135deg, #fffdf8 50%, #1f2228 50%)', ink: '#22252b' };
for (const t of [autoTheme, ...PAGE_THEMES]) {
  const b = document.createElement('button');
  b.type = 'button'; b.role = 'radio'; b.dataset.theme = t.id;
  const chip = document.createElement('span');
  chip.className = 'theme-chip'; chip.style.background = t.paper; chip.style.color = t.ink; chip.textContent = t.id === THEME_AUTO ? '' : 'Aa';
  const name = document.createElement('span'); name.textContent = t.name;
  b.append(chip, name);
  b.addEventListener('click', () => update({ theme: t.id }, { say: `Page colour ${t.name}` }));
  el.themes.append(b);
}

for (const f of FONTS) {
  const b = document.createElement('button');
  b.type = 'button'; b.role = 'radio'; b.dataset.font = f.id;
  const name = document.createElement('span'); name.className = 'font-name'; name.textContent = f.name;
  name.style.fontFamily = `"${f.family}", system-ui, sans-serif`;
  const about = document.createElement('span'); about.className = 'font-about'; about.textContent = f.about;
  b.append(name, about);
  b.addEventListener('click', () => update({ fontOn: true, font: f.id }));
  el.fonts.append(b);
  el.qFont.append(new Option(f.name, f.id));
}
for (const r of [0.6, 0.8, 1, 1.2, 1.5, 2]) el.pRate.append(new Option(`${r}×`, String(r)));

el.fontOn.addEventListener('change', () => update({ fontOn: el.fontOn.checked }));
el.qFontOn.addEventListener('click', () => update((s) => ({ ...s, fontOn: !s.fontOn }), { say: settings.fontOn ? 'Reading font off' : 'Reading font on' }));
el.qFont.addEventListener('change', () => update({ fontOn: true, font: el.qFont.value }));
el.bionicOn.addEventListener('change', () => update({ bionicOn: el.bionicOn.checked }));
el.qBoldOn.addEventListener('click', () => { update((s) => ({ ...s, bionicOn: !s.bionicOn })); announce(boldSaid()); });
el.qBold.addEventListener('input', () => update({ bionicOn: true, bionic: Number(el.qBold.value) }, { live: true }));
el.qLess.addEventListener('click', () => { update((s) => stepBold(s, -1)); announce(boldSaid()); });
el.qMore.addEventListener('click', () => { update((s) => stepBold(s, 1)); announce(boldSaid()); });
el.qRuler.addEventListener('click', () => update((s) => ({ ...s, ruler: { ...s.ruler, on: !s.ruler.on } }), { say: settings.ruler.on ? 'Ruler off' : 'Ruler on' }));
el.bionic.addEventListener('input', () => update({ bionicOn: true, bionic: Number(el.bionic.value) }, { live: true }));
for (const slider of [el.qBold, el.bionic]) slider.addEventListener('change', finishSlide);
el.tintOn.addEventListener('change', () => update((s) => ({ ...s, tint: { ...s.tint, on: el.tintOn.checked } })));
el.tintColour.addEventListener('input', () => update((s) => ({ ...s, tint: { ...s.tint, on: true, colour: el.tintColour.value } })));
el.tintStrength.addEventListener('input', () => update((s) => ({ ...s, tint: { ...s.tint, strength: Number(el.tintStrength.value) } })));
el.screen.addEventListener('change', () => { screenTint = el.screen.checked; setScreenTintWanted(screenTint); update({}); });
el.size.addEventListener('input', () => update({ size: Number(el.size.value) }));
el.line.addEventListener('input', () => update({ lineHeight: Number(el.line.value) }));
el.spacing.addEventListener('input', () => update({ letterSpacing: Number(el.spacing.value) }));
el.width.addEventListener('input', () => update({ width: Number(el.width.value) }));
el.noItalics.addEventListener('change', () => update({ noItalics: el.noItalics.checked }));
el.rulerOn.addEventListener('change', () => update((s) => ({ ...s, ruler: { ...s.ruler, on: el.rulerOn.checked } })));
el.rulerLines.addEventListener('input', () => update((s) => ({ ...s, ruler: { on: true, lines: Number(el.rulerLines.value) } })));
el.rate.addEventListener('input', () => update((s) => ({ ...s, speech: { ...s.speech, rate: Number(el.rate.value) } })));
el.pRate.addEventListener('change', () => update((s) => ({ ...s, speech: { ...s.speech, rate: Number(el.pRate.value) } })));
el.voice.addEventListener('change', () => update((s) => ({ ...s, speech: { ...s.speech, voice: el.voice.value } })));
el.wordHelp.addEventListener('change', () => update({ wordHelp: el.wordHelp.checked }));
$('reset').addEventListener('click', () => update(DEFAULTS, { say: 'Settings reset' }));
$('setup').addEventListener('click', () => { setPanel(false); startSetup(); });

// Keyboard: Alt+F font on/off, Alt+B bold on/off, Alt+Up / Alt+Down more or less bold, Alt+R ruler, Alt+S read aloud
document.addEventListener('keydown', (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  const code = e.code;
  if (code === 'KeyF' || k === 'f') { e.preventDefault(); el.qFontOn.click(); }
  else if (code === 'KeyB' || k === 'b') { e.preventDefault(); el.qBoldOn.click(); }
  else if (code === 'KeyR' || k === 'r') { e.preventDefault(); el.qRuler.click(); }
  else if ((code === 'KeyS' || k === 's') && !el.say.hidden) { e.preventDefault(); el.say.click(); }
  else if (k === 'arrowup') { e.preventDefault(); el.qMore.click(); }
  else if (k === 'arrowdown') { e.preventDefault(); el.qLess.click(); }
});

const setPanel = (open: boolean): void => {
  el.panel.hidden = !open;
  el.toggle.setAttribute('aria-expanded', String(open));
  if (open) el.panel.querySelector<HTMLElement>('button, input')?.focus();
};
el.toggle.addEventListener('click', () => setPanel(Boolean(el.panel.hidden)));
$('close-panel').addEventListener('click', () => { setPanel(false); el.toggle.focus(); });

const setMenu = (open: boolean): void => {
  el.openList.hidden = !open;
  el.openMenu.setAttribute('aria-expanded', String(open));
  if (open) el.openList.querySelector<HTMLElement>('button, label')?.focus();
};
el.openMenu.addEventListener('click', () => setMenu(Boolean(el.openList.hidden)));
document.addEventListener('pointerdown', (e) => { if (!el.openList.hidden && !el.openList.parentElement!.contains(e.target as Node)) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!el.openList.hidden) { setMenu(false); el.openMenu.focus(); } else if (!el.panel.hidden) setPanel(false);
  else if (speech.current !== 'stopped' && !wordHelp.open) speech.stop();
});
// The file labels work like buttons from the keyboard too
for (const label of el.openList.querySelectorAll<HTMLLabelElement>('label.button')) {
  label.tabIndex = 0;
  label.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); label.querySelector('input')?.click(); } });
}

// ---- saved setups and settings codes

function drawSetups(): void {
  const list = loadSetups();
  el.setups.replaceChildren(...list.map((x, i) => {
    const li = document.createElement('li');
    const use = document.createElement('button');
    use.type = 'button'; use.textContent = x.name;
    use.addEventListener('click', () => update(x.settings, { say: `Using ${x.name}` }));
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'recent-del'; del.textContent = '×'; del.setAttribute('aria-label', `Delete ${x.name}`);
    del.addEventListener('click', () => { const next = loadSetups(); next.splice(i, 1); saveSetups(next); drawSetups(); });
    li.append(use, del);
    return li;
  }));
}
$<HTMLFormElement>('setup-save').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('setup-name');
  const name = input.value.trim() || `Setup ${loadSetups().length + 1}`;
  saveSetups([...loadSetups().filter((x) => x.name !== name), { name, settings }]);
  input.value = '';
  drawSetups();
  announce(`Saved ${name}`);
});
$('code-copy').addEventListener('click', async () => {
  const code = settingsCode(settings);
  try { await navigator.clipboard.writeText(code); toast('Settings code copied. Paste it into Easy Reader somewhere else.'); } catch {
    const input = $<HTMLInputElement>('code-in');
    input.value = code; input.select();
    toast('Copy the code from the box below.');
  }
});
$<HTMLFormElement>('code-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const s = readSettingsCode($<HTMLInputElement>('code-in').value);
  if (!s) { toast('That doesn’t look like an Easy Reader settings code.'); return; }
  update(s, { say: 'Settings code used' });
  $<HTMLInputElement>('code-in').value = '';
  toast('Your settings have been brought in.');
});

function startSetup(): void {
  markSetupSeen();
  runSetup(() => settings, (change) => update(change), () => el.toggle.focus());
}

// ---- read aloud and word help

el.say.addEventListener('click', () => {
  wordHelp.close();
  if (speech.current === 'stopped') speech.play(); else speech.stop();
});
el.pPlay.addEventListener('click', () => { if (speech.current === 'playing') speech.pause(); else speech.resume(); });
$('p-back').addEventListener('click', () => speech.skip(-1));
$('p-next').addEventListener('click', () => speech.skip(1));
$('p-stop').addEventListener('click', () => { speech.stop(); el.say.focus(); });

el.page.addEventListener('click', (e) => {
  const sel = getSelection();
  if (sel && !sel.isCollapsed) return;
  const at = caretAt(e.clientX, e.clientY);
  if (!at || !el.page.contains(at.node)) return;
  // While reading aloud, tapping a word reads on from there
  if (speech.current !== 'stopped') { speech.play(at); return; }
  if (!settings.wordHelp) return;
  const word = wordAt(at);
  if (word) wordHelp.show(word, e.clientX, e.clientY);
});

async function setUpSpeech(): Promise<void> {
  const list = speechSupported() ? await voices() : [];
  const section = $('speech-section');
  if (!list.length) {
    el.say.hidden = true;
    el.speechHint.textContent = speechSupported()
      ? 'This device has no voices for reading aloud. You may be able to add one in your system’s speech or accessibility settings.'
      : 'Reading aloud isn’t available in this version of the app yet.';
    for (const c of section.querySelectorAll<HTMLElement>('.label-row, input[type="range"]')) c.hidden = true;
    return;
  }
  el.say.hidden = false;
  const lang = (navigator.language || 'en').split('-')[0]!;
  const sorted = [...list].sort((a, b) => Number(b.lang.startsWith(lang)) - Number(a.lang.startsWith(lang)) || a.name.localeCompare(b.name));
  el.voice.replaceChildren(new Option('Device default', ''), ...sorted.map((v) => new Option(`${v.name} (${v.lang})`, v.name)));
  el.voice.value = settings.speech.voice;
  el.speechHint.textContent = 'Press Read aloud at the top. Reading starts from the top of the screen, or from a word you tap.';
}

// ---- getting text in

$('paste').addEventListener('click', async () => {
  setMenu(false);
  try {
    const text = await navigator.clipboard.readText();
    if (text.trim()) void show(pastedToHtml(text)); else toast('Nothing has been copied yet. Copy some text first, then press Paste.');
  } catch {
    openEditor(); toast('Paste your text into the box (Ctrl+V, or long-press and Paste).');
  }
});
function openEditor(): void {
  setMenu(false);
  speech.stop();
  el.page.hidden = true; el.editor.hidden = false;
  el.editorText.value = '';
  el.editorText.focus();
  ruler.refresh();
}
$('edit').addEventListener('click', openEditor);
$('editor-cancel').addEventListener('click', () => { el.editor.hidden = true; el.page.hidden = false; ruler.refresh(); });
el.editor.addEventListener('submit', (e) => { e.preventDefault(); void show(pastedToHtml(el.editorText.value)); });

for (const id of ['file', 'photo']) {
  const input = $<HTMLInputElement>(id);
  if (id === 'file') input.accept = ACCEPT;
  input.addEventListener('change', () => { const f = input.files?.[0]; setMenu(false); if (f) void openFile(f); input.value = ''; });
}
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) void openFile(f); });
// Pasting anywhere outside a text box reads what was pasted
document.addEventListener('paste', (e) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
  const file = e.clipboardData?.files[0];
  const html = e.clipboardData?.getData('text/html');
  const text = e.clipboardData?.getData('text/plain');
  if (file && file.type.startsWith('image/')) { e.preventDefault(); void openFile(file); }
  else if (html?.trim()) { e.preventDefault(); void show(pastedToHtml(html)); }
  else if (text?.trim()) { e.preventDefault(); void show(pastedToHtml(text)); }
});

/** A page or PDF sent from the browser extension's "Open in Easy Reader" button. */
async function takeFromExtension(): Promise<boolean> {
  const local = (globalThis as unknown as { chrome?: { storage?: { local?: { get(k: string): Promise<Record<string, unknown>>; remove(k: string): Promise<void> } } } }).chrome?.storage?.local;
  if (!inExtension || !local) return false;
  const { pending } = await local.get('pending') as { pending?: { html?: string; title?: string; pdfUrl?: string } };
  if (!pending) return false;
  await local.remove('pending');
  if (pending.html) { await show(pastedToHtml(pending.html), pending.title); return true; }
  if (pending.pdfUrl) {
    const busy = toast('Fetching the PDF…', 0);
    try {
      const res = await fetch(pending.pdfUrl);
      const blob = await res.blob();
      busy.done();
      await openFile(new File([blob], pending.title || 'document.pdf', { type: 'application/pdf' }));
    } catch {
      busy.done();
      toast('That PDF could not be fetched. Download it, then open it with Open > Open a file.', 8000);
    }
    return true;
  }
  return false;
}

// ---- start

async function start(): Promise<void> {
  const loaded = await loadSettings();
  settings = loaded.settings;
  await migrateOldDoc();
  renderLook();

  const shared = new URLSearchParams(location.search).get('text');
  if (shared) {
    history.replaceState(null, '', location.pathname);
    await show(pastedToHtml(shared));
  } else if (!(await takeFromExtension())) {
    const id = currentDocId();
    if (id && (await getDoc(id))) await reopen(id); else renderDoc();
  }
  void drawRecent();
  drawSetups();
  void setUpSpeech();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderLook);
  onSettingsChanged((s) => update(s));

  void capabilities().then((c) => {
    canTintScreen = c.screenTint;
    el.screenRow.hidden = !c.screenTint;
    const note = c.screenTint
      ? `${c.screenNote} Over other apps the tint is see-through rather than coloured glass, so text can look a little paler. A lower strength usually works best.`
      : c.screenNote;
    el.screenHint.hidden = !note;
    el.screenHint.textContent = note;
    update({});
  });
  void onIncomingText((text) => void show(pastedToHtml(text)));
  void onScreenTintOff(() => { screenTint = false; setScreenTintWanted(false); renderLook(); });

  if (loaded.fresh && !setupSeen()) startSetup();
}
void start();

