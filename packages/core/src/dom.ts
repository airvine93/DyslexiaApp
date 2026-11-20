import { pieces, splitWord } from './bionic';

/** Class on the span that wraps one restyled text node; it keeps the original text so the change can be undone. */
export const WRAP = 'dr-w';
/** Class on each bold word front. */
export const BOLD = 'dr-b';

const SKIP = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'SVG', 'MATH', 'CANVAS', 'IFRAME', 'TEMPLATE', 'HEAD', 'TITLE',
]);

/** Parts of web apps where people type or that scripts manage closely: changing their words can upset the app. */
const SKIP_ROLES = new Set(['textbox', 'combobox', 'searchbox', 'application', 'code']);
const skipRole = (el: Element) => SKIP_ROLES.has((el.getAttribute('role') ?? '').toLowerCase());

function skippable(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName.toUpperCase()) || skipRole(e)) return true;
    if (e.classList.contains(WRAP)) return true;
    if (e instanceof HTMLElement && (e.isContentEditable || e.getAttribute('contenteditable') === 'true')) return true;
    if (e.getAttribute('aria-hidden') === 'true' && e.childElementCount === 0) return true;
    if (e.hasAttribute('data-dr-skip')) return true;
  }
  return false;
}

function textNodes(root: Node): Text[] {
  const doc = root.ownerDocument ?? (root as Document);
  const out: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) {
    if (!skippable((root as Text).parentElement)) out.push(root as Text);
    return out;
  }
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as Element;
        return SKIP.has(el.tagName.toUpperCase()) || skipRole(el) || el.classList.contains(WRAP) || el.hasAttribute('data-dr-skip')
          || (el instanceof HTMLElement && el.isContentEditable) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return /\p{L}/u.test(n.nodeValue ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return root.nodeType === Node.ELEMENT_NODE && skippable(root as Element) ? [] : out;
}

/** Replace one text node with a span holding bold word fronts. */
function restyle(node: Text, percent: number): void {
  const doc = node.ownerDocument;
  const text = node.nodeValue ?? '';
  const wrap = doc.createElement('span');
  wrap.className = WRAP;
  let plain = '';
  const flush = () => { if (plain) { wrap.append(doc.createTextNode(plain)); plain = ''; } };
  for (const p of pieces(text)) {
    if (!p.word) { plain += p.text; continue; }
    const [front, rest] = splitWord(p.text, percent);
    flush();
    const b = doc.createElement('b');
    b.className = BOLD;
    b.textContent = front;
    wrap.append(b);
    plain += rest;
  }
  flush();
  node.replaceWith(wrap);
}

/** Make the front of every word under `root` bold. Calling it again on the same content first undoes the earlier pass. */
export function applyBionic(root: Node, percent: number): void {
  clearBionic(root);
  if (!(percent > 0)) return;
  for (const n of textNodes(root)) restyle(n, percent);
}

/** Restyle only new content (for pages that keep adding text), leaving what is already done alone. */
export function applyBionicToNew(node: Node, percent: number): void {
  if (!(percent > 0)) return;
  for (const n of textNodes(node)) restyle(n, percent);
}

/** Undo `applyBionic` and put the original text back. */
export function clearBionic(root: Node): void {
  const el = root as ParentNode;
  if (typeof el.querySelectorAll !== 'function') return;
  for (const w of Array.from(el.querySelectorAll(`span.${WRAP}`))) {
    w.replaceWith((w.ownerDocument ?? document).createTextNode(w.textContent ?? ''));
  }
}
