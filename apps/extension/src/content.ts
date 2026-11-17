// Runs on every web page: restyles the page's own text, so it also works on sites you are signed in to.
import { applyBionic, applyBionicToNew, boldPercent, clearBionic, cssVars, fontClasses, fontFaces, pageCss, tintColour, tintVisible, WRAP, type Settings } from '@dr/core';
import { load, type State } from './store';

const html = document.documentElement;
let current: Settings | null = null;
let observer: MutationObserver | null = null;

function ensureStyle(): void {
  if (document.getElementById('dr-style')) return;
  const style = document.createElement('style');
  style.id = 'dr-style';
  style.textContent = fontFaces((file) => chrome.runtime.getURL(`fonts/${file}`)) + pageCss();
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
  const classes = s ? fontClasses(s) : { 'dr-font': false, 'dr-thin-bold': false };
  for (const [cls, on] of Object.entries(classes)) html.classList.toggle(cls, on);
  html.classList.toggle('dr-spacing', !!s && s.letterSpacing > 0);
  html.classList.toggle('dr-line', !!s && state.lineOn);
  html.classList.toggle('dr-zoom', !!s && state.zoom > 100);
  if (s) {
    for (const [k, v] of Object.entries(cssVars(s))) html.style.setProperty(k, v);
    html.style.setProperty('--dr-lh', String(s.lineHeight));
    html.style.setProperty('--dr-zoom', String(state.zoom / 100));
  }
  setTint(s);
  const percent = s ? boldPercent(s) : 0;
  if (percent !== (current ? boldPercent(current) : 0) || !current !== !s) {
    observer?.disconnect();
    if (percent > 0) applyBionic(document.body, percent); else clearBionic(document.body);
    watch(percent);
  }
  current = s;
}

void load().then(apply);
chrome.storage.onChanged.addListener((_changes, area) => { if (area === 'sync') void load().then(apply); });

/** The popup's "Open in Easy Reader" asks for what to read: the selected text, or the page's main content. */
chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, reply) => {
  if (msg?.type !== 'er-get-page') return;
  const sel = getSelection();
  let holder: HTMLElement;
  if (sel && !sel.isCollapsed && sel.toString().trim().length > 20) {
    holder = document.createElement('div');
    for (let i = 0; i < sel.rangeCount; i++) holder.append(sel.getRangeAt(i).cloneContents());
  } else {
    holder = ((document.querySelector('article') ?? document.querySelector('main') ?? document.querySelector('[role="main"]') ?? document.body) as HTMLElement).cloneNode(true) as HTMLElement;
  }
  // Send the words without this page's bold fronts; the reader adds its own
  clearBionic(holder);
  reply({ html: `<article>${holder.innerHTML}</article>`, title: document.title });
});
