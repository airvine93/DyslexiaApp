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

/** Read the words out of a PDF, page by page. Scanned PDFs (pictures of text) have no words to read. */
async function pdfToHtml(file: File): Promise<string> {
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
    pages.push(paras.map((p) => `<p>${esc(p)}</p>`).join(''));
  }
  const html = pages.join('<hr>');
  if (!html.replace(/<[^>]+>/g, '').trim()) throw new Error('This PDF has no text in it that can be read. It may be a scan of a printed page.');
  return html;
}

/** Turn an opened file into reading-page HTML. */
export async function fileToHtml(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return pdfToHtml(file);
  const text = await file.text();
  if (/\.html?$/.test(name) || file.type === 'text/html') return cleanHtml(text);
  if (/\.(md|markdown)$/.test(name)) return markdownToHtml(text);
  return textToHtml(text);
}

/** Pasted or shared text: HTML if it looks like a page, otherwise plain text. */
export function pastedToHtml(text: string): string {
  return /^\s*<(!doctype|html|body|p|div|article)\b/i.test(text) ? cleanHtml(text) : textToHtml(text);
}
