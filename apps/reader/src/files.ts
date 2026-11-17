/** Turning files and pasted text into safe, simple HTML for the reading page. */

const KEEP = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR', 'EM', 'STRONG', 'I', 'B', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'HR']);
const DROP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'NAV', 'FOOTER', 'FORM', 'BUTTON', 'SVG', 'CANVAS', 'TEMPLATE', 'HEAD', 'ASIDE']);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Keep the structure and words of an HTML page and nothing else: no scripts, styles, links or attributes. */
export function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.body;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.nodeValue ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    if (DROP.has(tag)) return '';
    const inner = Array.from(el.childNodes).map(walk).join('');
    if (tag === 'BR' || tag === 'HR') return `<${tag.toLowerCase()}>`;
    if (KEEP.has(tag)) return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
    if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') return inner.trim() ? `<div>${inner}</div>` : '';
    return inner;
  };
  return walk(root);
}

/** Plain text to paragraphs: blank lines start a new paragraph, single line breaks are kept. */
export function textToHtml(text: string): string {
  return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/** A small Markdown subset: headings, lists, quotes, bold and italics. Enough for notes and READMEs. */
export function markdownToHtml(md: string): string {
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const endPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const endList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const li = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const q = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) { endPara(); endList(); continue; }
    if (h) { endPara(); endList(); out.push(`<h${h[1]!.length}>${inline(h[2]!)}</h${h[1]!.length}>`); continue; }
    if (li) {
      endPara();
      const kind = /\d/.test(li[1]!) ? 'ol' : 'ul';
      if (list !== kind) { endList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(li[2]!)}</li>`);
      continue;
    }
    if (q) { endPara(); endList(); out.push(`<blockquote>${inline(q[1]!)}</blockquote>`); continue; }
    endList();
    para.push(line.trim());
  }
  endPara(); endList();
  return out.join('');
}

export type Progress = (message: string) => void;

const paragraphs = (paras: string[]) => paras.map((p) => `<p>${esc(p)}</p>`).join('');

/** Read the words out of a PDF, page by page. Scanned PDFs (pictures of text) are read with text recognition. */
async function pdfToHtml(file: File, progress: Progress): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str + (item.hasEOL ? '\n' : '');
    }
    // PDF lines end at the edge of the page, not the end of a sentence: join them, and keep gaps between paragraphs
    const paras = text.split(/\n\s*\n/).map((p) => p.replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    pages.push(paragraphs(paras));
  }
  const html = pages.join('<hr>');
  if (html.replace(/<[^>]+>/g, '').trim()) return html;

  // No text at all: it is a scan, so read the pictures of the pages
  const { readPicture } = await import('./ocr');
  const scanned: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    progress(`Reading scanned page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    scanned.push(paragraphs(await readPicture(canvas)));
  }
  const out = scanned.join('<hr>');
  if (!out.replace(/<[^>]+>/g, '').trim()) throw new Error('No words could be found in this PDF.');
  return out;
}

/** Read the words out of a photo or picture of text. */
async function pictureToHtml(file: Blob, progress: Progress): Promise<string> {
  progress('Reading the words in the picture…');
  const { readPicture } = await import('./ocr');
  const paras = await readPicture(file, (f) => progress(`Reading the words in the picture… ${Math.round(f * 100)}%`));
  if (!paras.length) throw new Error('No words could be found in that picture. Try a closer, sharper photo in good light.');
  return paragraphs(paras);
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');
const kids = (el: Element, name: string) => Array.from(el.children).filter((c) => c.namespaceURI === W && c.localName === name);
const kid = (el: Element | undefined, name: string) => (el ? kids(el, name)[0] : undefined);
const on = (el: Element | undefined) => !!el && !/^(0|false|off|none)$/i.test(el.getAttributeNS(W, 'val') ?? el.getAttribute('w:val') ?? '');
const val = (el: Element | undefined) => el?.getAttributeNS(W, 'val') ?? el?.getAttribute('w:val') ?? '';

/** A Word document (.docx): headings, paragraphs, lists, tables, bold and italics. */
async function docxToHtml(file: File): Promise<string> {
  const { unzipSync, strFromU8 } = await import('fflate');
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === 'word/document.xml' });
  const main = zip['word/document.xml'];
  if (!main) throw new Error('That Word file could not be read.');
  const body = xml(strFromU8(main)).getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('That Word file could not be read.');

  const runs = (p: Element): string => Array.from(p.getElementsByTagNameNS(W, 'r')).map((r) => {
    let text = '';
    for (const c of Array.from(r.children)) {
      if (c.localName === 't') text += esc(c.textContent ?? '');
      else if (c.localName === 'tab') text += ' ';
      else if (c.localName === 'br' || c.localName === 'cr') text += '<br>';
    }
    if (!text) return '';
    const rPr = kid(r, 'rPr');
    if (on(kid(rPr, 'b'))) text = `<strong>${text}</strong>`;
    if (on(kid(rPr, 'i'))) text = `<em>${text}</em>`;
    return text;
  }).join('');

  const out: string[] = [];
  let list = false;
  const endList = () => { if (list) { out.push('</ul>'); list = false; } };
  const para = (p: Element): string => {
    const pPr = kid(p, 'pPr');
    const style = val(kid(pPr, 'pStyle'));
    const inner = runs(p);
    if (!inner.replace(/<[^>]+>/g, '').trim()) return '';
    const h = /^heading\s?(\d)$/i.exec(style) ?? (/^title$/i.test(style) ? [, '1'] : null);
    if (h) return `<h${Math.min(6, Number(h[1]))}>${inner}</h${Math.min(6, Number(h[1]))}>`;
    return `<p>${inner}</p>`;
  };
  for (const el of Array.from(body.children)) {
    if (el.localName === 'p') {
      const isItem = !!kid(kid(el, 'pPr'), 'numPr') || /list/i.test(val(kid(kid(el, 'pPr'), 'pStyle')));
      const html = para(el);
      if (!html) { endList(); continue; }
      if (isItem) {
        if (!list) { out.push('<ul>'); list = true; }
        out.push(`<li>${html.replace(/^<p>|<\/p>$/g, '')}</li>`);
      } else { endList(); out.push(html); }
    } else if (el.localName === 'tbl') {
      endList();
      const rows = kids(el, 'tr').map((tr) => `<tr>${kids(tr, 'tc').map((tc) => `<td>${kids(tc, 'p').map(runs).filter(Boolean).join('<br>')}</td>`).join('')}</tr>`);
      out.push(`<table><tbody>${rows.join('')}</tbody></table>`);
    }
  }
  endList();
  if (!out.length) throw new Error('No words were found in that Word file.');
  return out.join('');
}

/** An ebook (.epub): its chapters in reading order. */
async function epubToHtml(file: File, progress: Progress): Promise<string> {
  progress('Opening the book…');
  const { unzipSync, strFromU8 } = await import('fflate');
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const text = (path: string) => { const f = zip[path]; return f ? strFromU8(f) : null; };
  const container = text('META-INF/container.xml');
  const opfPath = container && xml(container).getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  const opfText = opfPath && text(opfPath);
  if (!opfPath || !opfText) throw new Error('That ebook could not be read. It may be protected (DRM), which stops other apps opening it.');
  const opf = xml(opfText);
  const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const items = new Map(Array.from(opf.getElementsByTagName('item')).map((i) => [i.getAttribute('id'), i.getAttribute('href') ?? '']));
  const chapters: string[] = [];
  for (const ref of Array.from(opf.getElementsByTagName('itemref'))) {
    const href = items.get(ref.getAttribute('idref'));
    if (!href) continue;
    const path = new URL(href, `https://book/${dir}`).pathname.slice(1);
    const chapter = text(decodeURIComponent(path)) ?? text(path);
    if (!chapter) continue;
    const html = cleanHtml(chapter);
    if (html.replace(/<[^>]+>/g, '').trim()) chapters.push(html);
  }
  if (!chapters.length) throw new Error('No words were found in that ebook. It may be protected (DRM), which stops other apps opening it.');
  const title = opf.getElementsByTagName('dc:title')[0]?.textContent?.trim();
  return (title && !/<h1/i.test(chapters[0]!.slice(0, 400)) ? `<h1>${esc(title)}</h1>` : '') + chapters.join('<hr>');
}

/** File types the reader can open, for the file picker. */
export const ACCEPT = '.txt,.md,.markdown,.html,.htm,.pdf,.docx,.epub,image/*,text/plain,text/html,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Turn an opened file into reading-page HTML. */
export async function fileToHtml(file: File, progress: Progress = () => {}): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return pdfToHtml(file, progress);
  if (name.endsWith('.docx') || file.type.includes('wordprocessingml')) return docxToHtml(file);
  if (name.endsWith('.epub') || file.type === 'application/epub+zip') return epubToHtml(file, progress);
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic|tiff?)$/.test(name)) return pictureToHtml(file, progress);
  if (name.endsWith('.doc')) throw new Error('Older Word files (.doc) can’t be opened. In Word, use Save As and choose .docx.');
  const text = await file.text();
  if (/\.html?$/.test(name) || file.type === 'text/html') return cleanHtml(text);
  if (/\.(md|markdown)$/.test(name)) return markdownToHtml(text);
  return textToHtml(text);
}

/** Pasted or shared text: HTML if it looks like a page, otherwise plain text. */
export function pastedToHtml(text: string): string {
  return /^\s*<(!doctype|html|body|p|div|article|meta|span|h[1-6]|ul|ol|table)\b/i.test(text) ? cleanHtml(text) : textToHtml(text);
}
