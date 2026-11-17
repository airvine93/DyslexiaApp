// Runs on every web page: restyles the page's own text, so it also works on sites you are signed in to.
import { applyBionic, applyBionicToNew, clearBionic, cssVars, fontFaces, pageCss, tintColour, tintVisible, WRAP, type Settings } from '@dr/core';
import { load, type State } from './store';

const html = document.documentElement;
let current: Settings | null = null;
let observer: MutationObserver | null = null;

function ensureStyle(): void {
  if (document.getElementById('dr-style')) return;
  const style = document.createElement('style');
  style.id = 'dr-style';
  style.textContent = fontFaces({
    regular: chrome.runtime.getURL('fonts/OpenDyslexic-Regular.otf'),
    bold: chrome.runtime.getURL('fonts/OpenDyslexic-Bold.otf'),
  }) + pageCss();
  (document.head ?? html).append(style);
}

function setTint(s: Settings | null): void {
  let t = document.getElementById('dr-tint');
  if (!s || !tintVisible(s)) { t?.remove(); return; }
  if (!t) { t = document.createElement('div'); t.id = 'dr-tint'; t.setAttribute('aria-hidden', 'true'); html.append(t); }
  t.style.backgroundColor = tintColour(s);
}

/** Pages that keep loading text (feeds, chats, single-page sites) get the bold fronts on the new text too. */
function watch(percent: number): void {
  observer?.disconnect();
  observer = null;
  if (!(percent > 0)) return;
  let queue: Node[] = [];
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    const nodes = queue; queue = [];
    observer?.disconnect();
    for (const n of nodes) if (n.isConnected) applyBionicToNew(n, percent);
    observer?.observe(document.body, { childList: true, subtree: true });
  };
  observer = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n instanceof Element && n.classList.contains(WRAP)) continue;
      queue.push(n);
    }
    if (queue.length && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function apply(state: State): void {
  const off = !state.enabled || state.offSites.includes(location.hostname);
  const s = off ? null : state.settings;
  if (s) ensureStyle();
  html.classList.toggle('dr-font', !!s?.font);
  html.classList.toggle('dr-spacing', !!s && s.letterSpacing > 0);
  if (s) for (const [k, v] of Object.entries(cssVars(s))) html.style.setProperty(k, v);
  setTint(s);
  const percent = s?.bionic ?? 0;
  if (percent !== (current?.bionic ?? 0) || !current !== !s) {
    observer?.disconnect();
    if (percent > 0) applyBionic(document.body, percent); else clearBionic(document.body);
    watch(percent);
  }
  current = s;
}

void load().then(apply);
chrome.storage.onChanged.addListener((_changes, area) => { if (area === 'sync') void load().then(apply); });
