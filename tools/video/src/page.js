/**
 * The page around the script. It does two jobs:
 *  - for the renderer (render.mjs): window.__init(id, width, height), window.__frame(t), window.__jpeg()
 *  - for people: a browser of all 100 variants with play, scrub and each variant's settings
 */
import { createPlayer } from './scene.js';
import { DIMENSIONS, DIMENSION_NOTES, FONTS, buildVariants } from './design.js';

export async function boot(THREE) {
  const variants = buildVariants();
  const byId = new Map(variants.map((v) => [v.id, v]));
  // every face must be loaded before any text is measured
  const faces = [['Inter ER', 400], ['Inter ER', 600], ['Inter ER', 800], ['Serif ER', 400], ['Serif ER', 400, 'italic'],
    ...Object.values(FONTS).flatMap((f) => [[f.family, 400], [f.family, 700]])];
  await Promise.all(faces.map(([family, weight, style]) => document.fonts.load(`${style ?? 'normal'} ${weight} 40px "${family}"`)));
  await document.fonts.ready;

  let player = null, canvas = null;
  const holder = document.getElementById('stage');
  function open(id, width, height) {
    if (player) { player.dispose(); }
    if (canvas) canvas.remove();
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Video preview');
    holder.prepend(canvas);
    player = createPlayer(THREE, canvas, byId.get(id), { width, height });
    return player;
  }

  // ---- renderer hooks
  window.__variants = variants;
  window.__init = (id, width = 1080, height = 1920) => { document.body.classList.add('render'); const p = open(id, width, height); p.frame(0); return p.duration; };
  window.__frame = (t) => player.frame(t);
  window.__jpeg = (quality = 0.93) => canvas.toDataURL('image/jpeg', quality);
  if (new URLSearchParams(location.search).has('render')) return;

  // ---- browser of variants
  const $ = (id) => document.getElementById(id);
  const list = $('list'), scrub = $('scrub'), clock = $('clock'), playBtn = $('play'), recipe = $('recipe'), count = $('count');
  let current = variants[0], playing = false, t = 0, last = 0, type = 'all', query = '';
  const scale = 0.5 * Math.min(2, Math.max(1, window.devicePixelRatio || 1)); // half size on ordinary screens, full on sharp ones

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function show() {
    player.frame(t);
    scrub.value = String(Math.round((t / player.duration) * 1000));
    clock.textContent = `${fmt(t)} / ${fmt(player.duration)}`;
  }
  function select(id, autoplay = true) {
    current = byId.get(id);
    open(id, 1080 * scale, 1920 * scale);
    t = 0; playing = autoplay; last = 0;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    for (const el of list.children) el.setAttribute('aria-current', el.dataset.id === id ? 'true' : 'false');
    $('title').textContent = `${current.id} · ${current.content.head}`;
    $('tag').textContent = current.tag;
    recipe.innerHTML = Object.keys(DIMENSIONS).map((d) => `<div><dt>${DIMENSION_NOTES[d]}</dt><dd>${current.params[d]}</dd></div>`).join('');
    show();
  }
  function fill() {
    const q = query.trim().toLowerCase();
    const rows = variants.filter((v) => (type === 'all' || v.params.type === type) && (!q || `${v.id} ${v.content.head} ${v.content.body} ${Object.values(v.params).join(' ')}`.toLowerCase().includes(q)));
    count.textContent = `${rows.length} of ${variants.length}`;
    list.innerHTML = rows.map((v) => `<li data-id="${v.id}" aria-current="${v.id === current.id}"><button type="button"><span class="num">${v.id.slice(3)}</span><span class="what"><b></b><i>${v.params.type} · ${FONTS[v.params.font].name} · ${v.params.hard} · ${v.params.reveal}</i></span></button></li>`).join('');
    [...list.children].forEach((el, i) => { el.querySelector('b').textContent = rows[i].content.head; });
  }
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) select(li.dataset.id); });
  $('types').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.type; for (const x of $('types').children) x.setAttribute('aria-pressed', String(x === b)); fill(); });
  $('search').addEventListener('input', (e) => { query = e.target.value; fill(); });
  playBtn.addEventListener('click', () => { playing = !playing; if (playing && t >= player.duration - 0.05) t = 0; last = 0; playBtn.textContent = playing ? 'Pause' : 'Play'; });
  scrub.addEventListener('input', () => { playing = false; playBtn.textContent = 'Play'; t = (Number(scrub.value) / 1000) * player.duration; show(); });
  const step = (d) => { const i = variants.indexOf(current); select(variants[(i + d + variants.length) % variants.length].id); list.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' }); };
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(current.tag); $('copy').textContent = 'Copied'; } catch { const r = document.createRange(); r.selectNodeContents($('tag')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } setTimeout(() => { $('copy').textContent = 'Copy tag'; }, 1400); });

  function tick(now) {
    if (playing) {
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (t >= player.duration) { t = player.duration; playing = false; playBtn.textContent = 'Replay'; }
      show();
    }
    requestAnimationFrame(tick);
  }
  fill();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  select(variants[0].id, !still);
  if (still) { t = player.timeline.t1 + 2; show(); }
  requestAnimationFrame(tick);
}
