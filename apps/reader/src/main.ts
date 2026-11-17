import './styles.css';
import {
  applyBionic, bionicLabel, cssVars, fontClasses, fontFaces, normalise, FONT_OFF, FONTS, tintColour, tintVisible, BIONIC_MARKS, DEFAULTS, TINT_PRESETS, type Settings,
} from '@dr/core';
import { fileToHtml, pastedToHtml, textToHtml } from './files';
import { capabilities, onIncomingText, onScreenTintOff, setScreenTint } from './platform';

const KEY = { settings: 'dr.settings', doc: 'dr.doc', screen: 'dr.screenTint' };
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked: keep going */ } };

const WELCOME = `<h1>Welcome to Easy Reader</h1>
<p>Paste some text, type it in, or open a file, and it will appear here in a way that is easier to read.</p>
<p>Open <strong>Settings</strong> to change how it looks. You can choose a reading font such as OpenDyslexic or Lexend, choose how much of the start of each word is bold, and lay a coloured overlay over the page.</p>
<p>The bold slider goes from off, through light, medium and strong, up to most of each word. Short words always get one bold letter, and longer words always keep at least one plain letter at the end.</p>
<p>On a computer or an Android phone the overlay can cover the whole screen, so it also tints other apps.</p>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = {
  page: $('page'), editor: $<HTMLFormElement>('editor'), editorText: $<HTMLTextAreaElement>('editor-text'),
  panel: $('panel'), toggle: $<HTMLButtonElement>('toggle-panel'), tint: $('tint'),
  fonts: $('fonts'), bionic: $<HTMLInputElement>('bionic'), bionicOut: $<HTMLOutputElement>('bionic-out'),
  tintOn: $<HTMLInputElement>('tint-on'), tintColour: $<HTMLInputElement>('tint-colour'), tintStrength: $<HTMLInputElement>('tint-strength'),
  tintOut: $<HTMLOutputElement>('tint-out'), swatches: $('swatches'), screenRow: $('screen-row'), screen: $<HTMLInputElement>('tint-screen'),
  screenHint: $('screen-hint'), size: $<HTMLInputElement>('size'), sizeOut: $<HTMLOutputElement>('size-out'),
  line: $<HTMLInputElement>('line'), lineOut: $<HTMLOutputElement>('line-out'), spacing: $<HTMLInputElement>('spacing'),
  spacingOut: $<HTMLOutputElement>('spacing-out'),
};

const fontStyle = document.createElement('style');
// Every bundled font file, as a URL the app can load. Only the chosen font is actually downloaded by the browser.
const fontFiles = import.meta.glob('../../../packages/core/fonts/**/*.{otf,woff2}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const fontUrl = (file: string) => fontFiles[`../../../packages/core/fonts/${file}`] ?? '';
fontStyle.textContent = fontFaces(fontUrl);
document.head.append(fontStyle);

let settings: Settings = normalise(JSON.parse(read(KEY.settings) ?? 'null'));
let screenTint = read(KEY.screen) === '1';
let canTintScreen = false;
let docHtml = read(KEY.doc) ?? WELCOME;

/** Draw the document, then add the bold word fronts. */
function renderDoc(): void {
  el.page.innerHTML = docHtml;
  applyBionic(el.page, settings.bionic);
}

/** Apply everything except the bold fronts, which need the document redrawn. */
function renderLook(): void {
  const s = settings;
  for (const [cls, on] of Object.entries(fontClasses(s))) document.documentElement.classList.toggle(cls, on);
  const root = document.documentElement.style;
  root.setProperty('--family', cssVars(s)['--dr-family']!);
  root.setProperty('--size', `${s.size}px`);
  root.setProperty('--line', String(s.lineHeight));
  root.setProperty('--ls', `${s.letterSpacing / 100}em`);
  root.setProperty('--ws', `${0.1 + s.letterSpacing / 50}em`);
  const showInApp = tintVisible(s) && !(canTintScreen && screenTint);
  el.tint.style.background = showInApp ? tintColour(s) : 'transparent';

  for (const b of el.fonts.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.font === s.font));
  el.bionic.value = String(s.bionic);
  el.bionicOut.value = bionicLabel(s.bionic);
  el.tintOn.checked = s.tint.on;
  el.tintColour.value = s.tint.colour;
  el.tintStrength.value = String(s.tint.strength);
  el.tintOut.value = `${s.tint.strength}%`;
  el.screen.checked = screenTint;
  el.screen.disabled = !s.tint.on;
  for (const b of el.swatches.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.colour === s.tint.colour));
  el.size.value = String(s.size); el.sizeOut.value = `${s.size}px`;
  el.line.value = String(s.lineHeight); el.lineOut.value = s.lineHeight.toFixed(1);
  el.spacing.value = String(s.letterSpacing); el.spacingOut.value = s.letterSpacing === 0 ? 'Normal' : `+${s.letterSpacing}`;
}

let screenTimer = 0;
function update(change: Partial<Settings> | ((s: Settings) => Settings), redraw = false): void {
  const before = settings.bionic;
  settings = normalise(typeof change === 'function' ? change(settings) : { ...settings, ...change });
  write(KEY.settings, JSON.stringify(settings));
  renderLook();
  if (redraw || settings.bionic !== before) renderDoc();
  // The whole-screen tint lives in another window; don't flood it while a slider is being dragged
  window.clearTimeout(screenTimer);
  screenTimer = window.setTimeout(() => { if (canTintScreen) void setScreenTint(settings, screenTint); }, 30);
}

function show(html: string): void {
  docHtml = html || WELCOME;
  write(KEY.doc, docHtml.length < 2_000_000 ? docHtml : textToHtml('This document is too big to keep after closing the app.'));
  el.editor.hidden = true;
  el.page.hidden = false;
  renderDoc();
  window.scrollTo({ top: 0 });
}

function toast(message: string): void {
  const t = document.createElement('div');
  t.className = 'toast';
  t.role = 'status';
  t.textContent = message;
  document.body.append(t);
  setTimeout(() => t.remove(), 5000);
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
  b.style.left = `${(m.value / 80) * 100}%`;
  b.addEventListener('click', () => update({ bionic: m.value }));
  markLabels.append(b);
}
for (const p of TINT_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button'; b.role = 'radio'; b.dataset.colour = p.colour; b.title = p.name; b.setAttribute('aria-label', p.name);
  b.style.background = p.colour;
  b.addEventListener('click', () => update((s) => ({ ...s, tint: { ...s.tint, on: true, colour: p.colour } })));
  el.swatches.append(b);
}

for (const f of [...FONTS.map((x) => ({ id: x.id, name: x.name, about: x.about, family: x.family })), { id: FONT_OFF, name: 'Original font', about: 'Keep the text in its own font.', family: '' }]) {
  const b = document.createElement('button');
  b.type = 'button'; b.role = 'radio'; b.dataset.font = f.id;
  const name = document.createElement('span'); name.className = 'font-name'; name.textContent = f.name;
  if (f.family) name.style.fontFamily = `"${f.family}", system-ui, sans-serif`;
  const about = document.createElement('span'); about.className = 'font-about'; about.textContent = f.about;
  b.append(name, about);
  b.addEventListener('click', () => update({ font: f.id }));
  el.fonts.append(b);
}
el.bionic.addEventListener('input', () => update({ bionic: Number(el.bionic.value) }));
el.tintOn.addEventListener('change', () => update((s) => ({ ...s, tint: { ...s.tint, on: el.tintOn.checked } })));
el.tintColour.addEventListener('input', () => update((s) => ({ ...s, tint: { ...s.tint, on: true, colour: el.tintColour.value } })));
el.tintStrength.addEventListener('input', () => update((s) => ({ ...s, tint: { ...s.tint, strength: Number(el.tintStrength.value) } })));
el.screen.addEventListener('change', () => { screenTint = el.screen.checked; write(KEY.screen, screenTint ? '1' : '0'); update({}); });
el.size.addEventListener('input', () => update({ size: Number(el.size.value) }));
el.line.addEventListener('input', () => update({ lineHeight: Number(el.line.value) }));
el.spacing.addEventListener('input', () => update({ letterSpacing: Number(el.spacing.value) }));
$('reset').addEventListener('click', () => update(DEFAULTS));

const setPanel = (open: boolean): void => {
  el.panel.hidden = !open;
  el.toggle.setAttribute('aria-expanded', String(open));
  if (open) el.fonts.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
};
el.toggle.addEventListener("click", () => setPanel(Boolean(el.panel.hidden)));
$('close-panel').addEventListener('click', () => { setPanel(false); el.toggle.focus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.panel.hidden) setPanel(false); });

// ---- getting text in

$('paste').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text.trim()) show(pastedToHtml(text)); else toast('Nothing has been copied yet. Copy some text first, then press Paste.');
  } catch {
    openEditor(); toast('Paste your text into the box (Ctrl+V, or long-press and Paste).');
  }
});
function openEditor(): void {
  el.page.hidden = true; el.editor.hidden = false;
  el.editorText.value = '';
  el.editorText.focus();
}
$('edit').addEventListener('click', openEditor);
$('editor-cancel').addEventListener('click', () => { el.editor.hidden = true; el.page.hidden = false; });
el.editor.addEventListener('submit', (e) => { e.preventDefault(); show(pastedToHtml(el.editorText.value)); });

const fileInput = $<HTMLInputElement>('file');
async function openFile(file: File): Promise<void> {
  try { show(await fileToHtml(file)); } catch (err) { toast(err instanceof Error ? err.message : 'That file could not be opened.'); }
}
fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; if (f) void openFile(f); fileInput.value = ''; });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) void openFile(f); });
// Pasting anywhere outside the text box reads what was pasted
document.addEventListener('paste', (e) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
  const html = e.clipboardData?.getData('text/html');
  const text = e.clipboardData?.getData('text/plain');
  if (html?.trim()) { e.preventDefault(); show(pastedToHtml(html)); } else if (text?.trim()) { e.preventDefault(); show(pastedToHtml(text)); }
});
// Text shared to the web app (Android "Share" to an installed web app)
const shared = new URLSearchParams(location.search).get('text');
if (shared) { docHtml = pastedToHtml(shared); history.replaceState(null, '', location.pathname); }

// ---- start

renderLook();
renderDoc();
void capabilities().then((c) => {
  canTintScreen = c.screenTint;
  el.screenRow.hidden = !c.screenTint;
  el.screenHint.hidden = !c.screenNote;
  el.screenHint.textContent = c.screenNote;
  update({});
});
void onIncomingText((text) => show(pastedToHtml(text)));
void onScreenTintOff(() => { screenTint = false; write(KEY.screen, '0'); renderLook(); });
