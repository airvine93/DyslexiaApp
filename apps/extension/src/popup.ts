import { bionicLabel, readSettingsCode, settingsCode, stepBold, BIONIC_MARKS, BIONIC_MAX, BIONIC_MIN, FONTS, TINT_PRESETS, type Settings } from '@dr/core';
import { load, save, PICTURE_TEXT_SITES, type State } from './store';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = {
  enabled: $<HTMLInputElement>('enabled'), site: $<HTMLInputElement>('site'), host: $('host'), font: $<HTMLSelectElement>('font'), fontOn: $<HTMLInputElement>('font-on'), bionicOn: $<HTMLInputElement>('bionic-on'),
  less: $<HTMLButtonElement>('less'), more: $<HTMLButtonElement>('more'),
  bionic: $<HTMLInputElement>('bionic'), bionicOut: $<HTMLOutputElement>('bionic-out'), marks: $('marks'),
  tintOn: $<HTMLInputElement>('tint-on'), swatches: $('swatches'), tintColour: $<HTMLInputElement>('tint-colour'),
  tintStrength: $<HTMLInputElement>('tint-strength'), tintOut: $<HTMLOutputElement>('tint-out'),
  spacing: $<HTMLInputElement>('spacing'), spacingOut: $<HTMLOutputElement>('spacing-out'),
  zoom: $<HTMLInputElement>('zoom'), zoomOut: $<HTMLOutputElement>('zoom-out'), lineOn: $<HTMLInputElement>('line-on'),
  line: $<HTMLInputElement>('line'), lineOut: $<HTMLOutputElement>('line-out'), siteNote: $('site-note'),
};
let tabId: number | undefined;
let tabUrl = '';

let state: State;
let host = '';

function render(): void {
  const s = state.settings;
  el.enabled.checked = state.enabled;
  el.site.checked = !state.offSites.includes(host);
  el.site.disabled = !host;
  el.font.value = s.font; el.fontOn.checked = s.fontOn;
  el.bionicOn.checked = s.bionicOn;
  el.less.disabled = s.bionicOn && s.bionic <= BIONIC_MIN; el.more.disabled = s.bionicOn && s.bionic >= BIONIC_MAX;
  el.bionic.value = String(s.bionic); el.bionicOut.value = s.bionicOn ? bionicLabel(s.bionic) : 'Off';
  el.tintOn.checked = s.tint.on; el.tintColour.value = s.tint.colour;
  el.tintStrength.value = String(s.tint.strength); el.tintOut.value = `${s.tint.strength}%`;
  el.spacing.value = String(s.letterSpacing); el.spacingOut.value = s.letterSpacing ? `+${s.letterSpacing}` : 'Normal';
  el.zoom.value = String(state.zoom); el.zoomOut.value = `${state.zoom}%`;
  el.lineOn.checked = state.lineOn; el.line.value = String(s.lineHeight); el.lineOut.value = state.lineOn ? s.lineHeight.toFixed(1) : 'As the site has it';
  for (const b of el.swatches.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.colour === s.tint.colour));
}

let timer = 0;
let laterTimer = 0;
const later = (run: () => void) => { clearTimeout(laterTimer); laterTimer = window.setTimeout(run, 150); };

/** Hand this page (or a PDF's address) to the reader page built into the extension, and open it in a new tab. */
async function openReader(): Promise<void> {
  let pending: { html?: string; title?: string; pdfUrl?: string } | null = null;
  if (/\.pdf($|[?#])/i.test(tabUrl) && /^(https?|file):/.test(tabUrl)) {
    pending = { pdfUrl: tabUrl, title: decodeURIComponent(tabUrl.split(/[?#]/)[0]!.split('/').pop() || 'document.pdf') };
  } else if (tabId !== undefined) {
    pending = await chrome.tabs.sendMessage(tabId, { type: 'er-get-page' }).catch(() => null);
  }
  if (pending) await chrome.storage.local.set({ pending });
  await chrome.tabs.create({ url: chrome.runtime.getURL('reader/index.html') });
  window.close();
}
function set(change: (s: Settings) => Settings): void {
  state.settings = change(state.settings);
  render();
  // Storage sync has a write limit, so wait until a slider stops moving
  clearTimeout(timer);
  timer = window.setTimeout(() => void save({ settings: state.settings }), 120);
}

async function start(): Promise<void> {
  state = await load();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { host = tab?.url ? new URL(tab.url).hostname : ''; } catch { host = ''; }
  tabId = tab?.id; tabUrl = tab?.url ?? '';
  el.host.textContent = host || 'this page';
  const picture = PICTURE_TEXT_SITES.find((p) => p.test.test(host));
  const isPdf = /\.pdf($|[?#])/i.test(tabUrl);
  if (picture || isPdf) {
    el.siteNote.hidden = false;
    el.siteNote.textContent = isPdf ? 'This is a PDF, which can\u2019t be restyled in the browser. Press Open in Easy Reader to read it there.' : picture!.tip;
  }

  for (const m of BIONIC_MARKS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = m.label;
    b.addEventListener('click', () => set((s) => ({ ...s, bionicOn: true, bionic: m.value })));
    el.marks.append(b);
  }
  for (const p of TINT_PRESETS) {
    const b = document.createElement('button'); b.type = 'button'; b.role = 'radio'; b.title = p.name; b.setAttribute('aria-label', p.name);
    b.dataset.colour = p.colour; b.style.background = p.colour;
    b.addEventListener('click', () => set((s) => ({ ...s, tint: { ...s.tint, on: true, colour: p.colour } })));
    el.swatches.append(b);
  }
  el.enabled.addEventListener('change', () => { state.enabled = el.enabled.checked; void save({ enabled: state.enabled }); });
  el.site.addEventListener('change', () => {
    state.offSites = el.site.checked ? state.offSites.filter((h) => h !== host) : [...new Set([...state.offSites, host])];
    void save({ offSites: state.offSites });
  });
  for (const f of FONTS) el.font.append(new Option(f.name, f.id));
  el.font.addEventListener('change', () => set((s) => ({ ...s, fontOn: true, font: el.font.value })));
  el.fontOn.addEventListener('change', () => set((s) => ({ ...s, fontOn: el.fontOn.checked })));
  el.bionicOn.addEventListener('change', () => set((s) => ({ ...s, bionicOn: el.bionicOn.checked })));
  el.less.addEventListener('click', () => set((s) => stepBold(s, -1)));
  el.more.addEventListener('click', () => set((s) => stepBold(s, 1)));
  el.bionic.addEventListener('input', () => set((s) => ({ ...s, bionicOn: true, bionic: Number(el.bionic.value) })));
  el.tintOn.addEventListener('change', () => set((s) => ({ ...s, tint: { ...s.tint, on: el.tintOn.checked } })));
  el.tintColour.addEventListener('input', () => set((s) => ({ ...s, tint: { ...s.tint, on: true, colour: el.tintColour.value } })));
  el.tintStrength.addEventListener('input', () => set((s) => ({ ...s, tint: { ...s.tint, strength: Number(el.tintStrength.value) } })));
  el.spacing.addEventListener('input', () => set((s) => ({ ...s, letterSpacing: Number(el.spacing.value) })));
  el.zoom.addEventListener('input', () => { state.zoom = Number(el.zoom.value); render(); later(() => save({ zoom: state.zoom })); });
  el.lineOn.addEventListener('change', () => { state.lineOn = el.lineOn.checked; render(); void save({ lineOn: state.lineOn }); });
  el.line.addEventListener('input', () => { state.lineOn = true; void save({ lineOn: true }); set((s) => ({ ...s, lineHeight: Number(el.line.value) })); });
  $('open-reader').addEventListener('click', () => void openReader());
  $<HTMLFormElement>('code-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const s = readSettingsCode($<HTMLInputElement>('code-in').value);
    const input = $<HTMLInputElement>('code-in');
    if (!s) { input.value = ''; input.placeholder = 'That code didn\u2019t work. Try copying it again.'; return; }
    input.value = ''; input.placeholder = 'Settings brought in';
    set(() => s);
  });
  $('code-copy').addEventListener('click', async () => {
    const code = settingsCode(state.settings);
    const input = $<HTMLInputElement>('code-in');
    try { await navigator.clipboard.writeText(code); input.placeholder = 'Code copied'; } catch { input.value = code; input.select(); }
  });
  render();
}
void start();
