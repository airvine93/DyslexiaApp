/**
 * Reading ruler: a clear band over the lines being read, with everything above and below gently dimmed. It follows the
 * mouse or finger. With the keyboard, the band stays put and the arrow keys move the text under it one line at a time.
 */

export class Ruler {
  private band: HTMLDivElement;
  private y = window.innerHeight * 0.35;
  private on = false;
  private lines = 1;

  constructor(private page: HTMLElement) {
    this.band = document.createElement('div');
    this.band.className = 'ruler';
    this.band.setAttribute('aria-hidden', 'true');
    this.band.hidden = true;
    document.body.append(this.band);
    const follow = (clientY: number) => { if (this.on) { this.y = clientY; this.draw(); } };
    document.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') follow(e.clientY); });
    document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && this.page.contains(e.target as Node)) follow(e.clientY); });
    document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t && this.page.contains(e.target as Node)) follow(t.clientY); }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!this.on || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      window.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * this.lineHeight() });
    });
    window.addEventListener('resize', () => this.draw());
  }

  set(on: boolean, lines: number): void {
    this.on = on;
    this.lines = lines;
    this.band.hidden = !on || this.page.hidden;
    this.draw();
  }

  /** Hide while the page isn't showing (for example while typing text in). */
  refresh(): void { this.set(this.on, this.lines); }

  private lineHeight(): number {
    const cs = getComputedStyle(this.page);
    const lh = parseFloat(cs.lineHeight);
    return Number.isFinite(lh) ? lh : parseFloat(cs.fontSize) * 1.7;
  }

  private draw(): void {
    if (!this.on) return;
    const h = this.lineHeight() * this.lines + 8;
    const rect = this.page.getBoundingClientRect();
    const top = Math.min(window.innerHeight - h, Math.max(0, this.y - h / 2));
    Object.assign(this.band.style, { top: `${top}px`, height: `${h}px`, left: `${Math.max(0, rect.left)}px`, width: `${Math.min(window.innerWidth, rect.width)}px` });
  }
}
