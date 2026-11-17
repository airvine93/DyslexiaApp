import { bionicLabel, BIONIC_MARKS, FONT_OFF, FONTS, TINT_PRESETS, type Settings } from '@dr/core';
import { load, save, type State } from './store';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = {
  enabled: $<HTMLInputElement>('enabled'), site: $<HTMLInputElement>('site'), host: $('host'), font: $<HTMLSelectElement>('font'),
  bionic: $<HTMLInputElement>('bionic'), bionicOut: $<HTMLOutputElement>('bionic-out'), marks: $('marks'),
  tintOn: $<HTMLInputElement>('tint-on'), swatches: $('swatches'), tintColour: $<HTMLInputElement>('tint-colour'),
  tintStrength: $<HTMLInputElement>('tint-strength'), tintOut: $<HTMLOutputElement>('tint-out'),
  spacing: $<HTMLInputElement>('spacing'), spacingOut: $<HTMLOutputElement>('spacing-out'),
};

let state: State;
let host = '';

function render(): void {
  const s = state.settings;
  el.enabled.checked = state.enabled;
  el.site.checked = !state.offSites.includes(host);
  el.site.disabled = !host;
  el.font.value = s.font;
  el.bionic.value = String(s.bionic); el.bionicOut.value = bionicLabel(s.bionic);
  el.tintOn.checked = s.tint.on; el.tintColour.value = s.tint.colour;
  el.tintStrength.value = String(s.tint.strength); el.tintOut.value = `${s.tint.strength}%`;
  el.spacing.value = String(s.letterSpacing); el.spacingOut.value = s.letterSpacing ? `+${s.letterSpacing}` : 'Normal';
  for (const b of el.swatches.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-checked', String(b.dataset.colour === s.tint.colour));
}

let timer = 0;
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
  el.host.textContent = host || 'this page';

  for (const m of BIONIC_MARKS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = m.label;
    b.addEventListener('click', () => set((s) => ({ ...s, bionic: m.value })));
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
  for (const f of [...FONTS, { id: FONT_OFF, name: 'Page\'s own font' }]) el.font.append(new Option(f.name, f.id));
  el.font.addEventListener('change', () => set((s) => ({ ...s, font: el.font.value })));
  el.bionic.addEventListener('input', () => set((s) => ({ ...s, bionic: Number(el.bionic.value) })));
  el.tintOn.addEventListener('change', () => set((s) => ({ ...s, tint: { ...s.tint, on: el.tintOn.checked } })));
  el.tintColour.addEventListener('input', () => set((s) => ({ ...s, tint: { ...s.tint, on: true, colour: el.tintColour.value } })));
  el.tintStrength.addEventListener('input', () => set((s) => ({ ...s, tint: { ...s.tint, strength: Number(el.tintStrength.value) } })));
  el.spacing.addEventListener('input', () => set((s) => ({ ...s, letterSpacing: Number(el.spacing.value) })));
  render();
}
void start();
