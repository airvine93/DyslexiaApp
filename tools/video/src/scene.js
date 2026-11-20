/**
 * The Three.js script. One function draws any frame of any variant:
 *
 *     const player = createPlayer(THREE, canvas, variant);
 *     player.frame(t);   // t in seconds, 0..player.duration
 *
 * Every frame is a pure function of (variant, t): no clocks, no tweens that remember state, and all randomness is seeded.
 * So a video renders the same every time, and renders can be split across machines. This is the same rule the
 * Emotion Shaper videos follow. The caption look (large pastel line, small white line, large pastel line) is the
 * DaVinci caption style.
 *
 * Every letter is its own textured plane in 3D. A "state" is a layout of those letters in one font. Moving between
 * two states of the same text slides each letter to its new place while its glyph cross-fades to the new font, which
 * is how ordinary text turns hard to read and then into a reading font.
 */
import { bionicCut, pieces } from '../../../packages/core/src/bionic.ts';
import { ACCENTS, ASKS, CTAS, FONTS, THEMES, rng, stagesFor, timeline } from './design.js';

const DW = 1080, DH = 1920;           // design size; other sizes scale the text layer to fit
const LEFT = 100, WIDTH = 850;         // safe area: clear of the top 220px, bottom 420px and right-hand buttons
const BOTTOM = 1500;
const SANS = 'Inter ER', SERIF = 'Serif ER';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { const u = clamp(x); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const mix3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** Seeded value in 0..1 for (seed, i, k). */
const hash = (seed, i, k = 0) => { const x = Math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };

/** A deeper version of a pastel, for light backgrounds where the pastel itself would vanish. */
function deep(c) {
  const max = Math.max(...c), min = Math.min(...c), l = (max + min) / 2;
  const k = 0.40 / Math.max(l, 0.01);
  return c.map((v) => clamp((l + (v - l) * 2.4) * k));
}

// ---------------------------------------------------------------------------------------------- glyphs and layout

const measureCtx = document.createElement('canvas').getContext('2d');
const advances = new Map();
const fontCss = (f, px) => `${f.style ?? 'normal'} ${f.weight ?? 400} ${px}px "${f.family}"`;

/** Advance width of one character, in ems. */
function advance(ch, f) {
  const key = `${f.style}|${f.weight}|${f.family}|${ch}`;
  let w = advances.get(key);
  if (w === undefined) { measureCtx.font = fontCss(f, 100); w = measureCtx.measureText(ch).width / 100; advances.set(key, w); }
  return w;
}

/**
 * Lay text out into lines. `st` is the style: family, weight, style, size, track and ws (extra letter and word space
 * in ems), lh, width, align, and bold (the share of each word made bold, in percent, using the app's own rule).
 * Letters keep the same index in every layout of the same text, so two layouts can be blended letter by letter.
 */
function layout(text, st, at) {
  const size = st.size, lineH = size * st.lh;
  const face = (bold) => ({ family: st.family, style: st.style ?? 'normal', weight: bold ? 700 : (st.weight ?? 400) });
  const spaceW = (advance(' ', face(false)) + (st.track ?? 0) + (st.ws ?? 0)) * size;
  const lines = [[]]; const widths = [0];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const flags = [];
    for (const p of pieces(word)) { const n = p.word && st.bold ? bionicCut(p.text, st.bold) : 0; [...p.text].forEach((_, k) => flags.push(k < n)); }
    let w = 0;
    const cs = [...word].map((ch, k) => { const c = { ch, bold: flags[k], dx: w }; w += (advance(ch, face(flags[k])) + (st.track ?? 0)) * size; return c; });
    let li = lines.length - 1;
    if (lines[li].length && widths[li] + spaceW + w > st.width) { lines.push([]); widths.push(0); li++; }
    const x0 = lines[li].length ? widths[li] + spaceW : 0;
    for (const c of cs) lines[li].push({ ...c, x: x0 + c.dx });
    widths[li] = x0 + w;
  }
  const chars = [];
  const rows = lines.map((line, n) => {
    const off = st.align === 'center' ? (st.width - widths[n]) / 2 : 0;
    const base = n * lineH + lineH / 2 + size * 0.34;
    for (const c of line) chars.push({ ch: c.ch, bold: c.bold, x: at[0] + off + c.x, y: at[1] + base, line: n });
    return { top: at[1] + n * lineH, mid: at[1] + n * lineH + lineH / 2, w: widths[n], x: at[0] + off };
  });
  return { chars, rows, st, at, w: Math.max(...widths), h: rows.length * lineH, face };
}

/** Largest size at which `text` fits the width in `maxLines` lines (and `maxH` pixels, when given). */
function fit(text, st, at, { max, min, maxLines = 99, maxH = Infinity }) {
  let L;
  for (let size = max; size >= min; size -= 2) {
    L = layout(text, { ...st, size }, at);
    if (L.rows.length <= maxLines && L.w <= st.width + 0.5 && L.h <= maxH) break;
  }
  return L;
}

const moved = (L, dy) => { const M = layout(L.text, L.st, [L.at[0], L.at[1] + dy]); M.text = L.text; return M; };

// ---------------------------------------------------------------------------------------------------- the player

export function createPlayer(THREE, canvas, variant, opts = {}) {
  const W = opts.width ?? DW, H = opts.height ?? DH;
  const P = variant.params, C = variant.content, seed = variant.seed;
  const TL = timeline(variant);
  const { t1, t2, t3, t4, t5, duration } = TL;
  const theme = THEMES[P.theme];
  const font = FONTS[P.font];
  const pastel = rgb(ACCENTS[P.accent]);
  const col = { bg: rgb(theme.bg), text: rgb(theme.text), muted: rgb(theme.muted), accent: theme.dark ? pastel : deep(pastel), deep: deep(pastel) };

  if (THREE.ColorManagement) THREE.ColorManagement.enabled = false; // colours go to the screen exactly as written
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  const FOV = 28, DIST = H / 2 / Math.tan((FOV * Math.PI) / 360);
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, DIST * 4);
  const stage = new THREE.Group();     // design-space layer: x right, y down, origin top-left of the 1080x1920 frame
  const S = Math.min(W / DW, H / DH);
  stage.scale.set(S, S, S);
  scene.add(stage);
  const world = (x, y) => [x - DW / 2, DH / 2 - y];
  const disposables = [];

  // ---- glyph textures: one small canvas per (font, weight, character)
  const textures = new Map();
  function glyph(face, ch, E) {
    const key = `${face.style}|${face.weight}|${face.family}|${E}|${ch}`;
    let tex = textures.get(key);
    if (!tex) {
      const c = document.createElement('canvas'); c.width = c.height = E * 2;
      const g = c.getContext('2d');
      g.font = fontCss(face, E); g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      g.fillText(ch, E * 0.4, E * 1.35);
      // OpenDyslexic's bold is only a little heavier than its regular, so the app adds a thin outline. Same here.
      if (face.weight === 700 && face.family === FONTS.opendyslexic.family) { g.strokeStyle = '#fff'; g.lineWidth = E * 0.05; g.lineJoin = 'round'; g.strokeText(ch, E * 0.4, E * 1.35); }
      tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
      textures.set(key, tex); disposables.push(tex);
    }
    return tex;
  }
  // unit plane whose origin is the glyph's pen position on the baseline
  const glyphGeo = new THREE.BufferGeometry();
  glyphGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.2, -0.325, 0, 0.8, -0.325, 0, 0.8, 0.675, 0, -0.2, 0.675, 0]), 3));
  glyphGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  glyphGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const material = (fragment, uniforms, blending) => {
    const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fragment, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: blending ?? THREE.NormalBlending });
    disposables.push(m); return m;
  };
  const v3 = (c) => new THREE.Vector3(c[0], c[1], c[2]);
  const glyphMaterial = () => material(
    'uniform sampler2D tA; uniform sampler2D tB; uniform float m; uniform float a; uniform vec3 c; varying vec2 vUv;' +
    'void main(){ float al = mix(texture2D(tA, vUv).a, texture2D(tB, vUv).a, m) * a; if (al < 0.004) discard; gl_FragColor = vec4(c, al); }',
    { tA: { value: null }, tB: { value: null }, m: { value: 0 }, a: { value: 1 }, c: { value: new THREE.Vector3(1, 1, 1) } });

  /** A run of text whose letters are separate planes. `E` is the texture size per em: 96 for reading text, 208 for display. */
  class Block {
    constructor(text, E, order = 30) {
      this.text = text; this.E = E;
      this.meshes = [...text.replace(/\s+/g, '')].map(() => { const m = new THREE.Mesh(glyphGeo, glyphMaterial()); m.renderOrder = order; m.visible = false; stage.add(m); return m; });
    }
    lay(st, at) { const L = layout(this.text, st, at); L.text = this.text; return L; }
    fit(st, at, o) { const L = fit(this.text, st, at, o); L.text = this.text; return L; }
    hide() { for (const m of this.meshes) m.visible = false; }
    /** Draw between layouts A and B. `per(i, a, b)` gives each letter its blend u, alpha a, colour c and any offsets. */
    draw(A, B, per) {
      for (let i = 0; i < this.meshes.length; i++) {
        const m = this.meshes[i], a = A.chars[i], b = B.chars[i], p = per(i, a, b);
        if (!(p.a > 0.004)) { m.visible = false; continue; }
        const u = p.u ?? 0, k = p.k ?? u; // k moves the letter, u blends the glyph
        const size = lerp(A.st.size, B.st.size, k) * (p.s ?? 1);
        const [x, y] = world(lerp(a.x, b.x, k) + (p.dx ?? 0), lerp(a.y, b.y, k) + (p.dy ?? 0));
        m.visible = true;
        m.position.set(x, y, p.dz ?? 0);
        m.rotation.set(0, p.ry ?? 0, p.rz ?? 0);
        m.scale.set(size * 2, size * 2, 1);
        const un = m.material.uniforms;
        un.tA.value = glyph(A.face(a.bold), a.ch, this.E);
        un.tB.value = u > 0 ? glyph(B.face(b.bold), b.ch, this.E) : un.tA.value;
        un.m.value = u; un.a.value = p.a; un.c.value.set(p.c[0], p.c[1], p.c[2]);
      }
    }
  }

  // ---- layouts, all worked out once
  const isQuote = P.type === 'quote';
  const sans = (weight, extra) => ({ family: SANS, weight, lh: 1.3, width: WIDTH, align: 'center', ...extra });

  const kicker = new Block(C.kicker, 96);
  const Lkick = kicker.fit(sans(600, { track: 0.14 }), [LEFT, 232], { max: 34, min: 22, maxLines: 2 });

  const head = new Block(C.head, 208), sub = new Block(C.sub, 96), tail = C.tail ? new Block(C.tail, 208) : null;
  const headSt = isQuote ? { family: SERIF, style: 'italic', weight: 400, lh: 1.2, width: WIDTH, align: 'center' } : sans(800, { lh: 1.05, track: -0.02 });
  const subSt = isQuote ? sans(600, { track: 0.02 }) : sans(400);
  let Lhead = head.fit(headSt, [LEFT, 0], isQuote ? { max: 104, min: 50, maxLines: 7 } : { max: 168, min: 64, maxLines: 3 });
  let Lsub = sub.fit(subSt, [LEFT, 0], { max: isQuote ? 36 : 48, min: 28, maxLines: 2 });
  let Ltail = tail && tail.fit(sans(800, { lh: 1.05, track: -0.02 }), [LEFT, 0], { max: Math.min(124, Lhead.st.size), min: 56, maxLines: 3 });
  { // stack the three lines around the optical centre of the safe area
    const gap = isQuote ? 56 : 30, total = Lhead.h + gap + Lsub.h + (Ltail ? gap + Ltail.h : 0);
    let y = 850 - total / 2;
    Lhead = moved(Lhead, y); y += Lhead.h + gap; Lsub = moved(Lsub, y); y += Lsub.h + gap; if (Ltail) Ltail = moved(Ltail, y);
  }
  // the same three lines, small, as a title above the lesson
  let Thead = head.fit(headSt, [LEFT, 0], isQuote ? { max: 50, min: 34, maxLines: 5 } : { max: 86, min: 44, maxLines: 2 });
  let Tsub = sub.fit(subSt, [LEFT, 0], { max: isQuote ? 30 : 36, min: 24, maxLines: 2 });
  let Ttail = tail && tail.fit(sans(800, { lh: 1.1, track: -0.01 }), [LEFT, 0], { max: 52, min: 34, maxLines: 2 });
  const titleH = Thead.h + 14 + Tsub.h + (Ttail ? 12 + Ttail.h : 0);

  // the lesson in its four states. The zone above it holds the title, then the question, then the feature names.
  const GAP = 84, TOP = 236;
  const zone = Math.max(titleH, 330);
  const room = BOTTOM - TOP - zone - GAP;
  const body = new Block(C.body, 96);
  const HARD = {
    cramped: { family: SERIF, weight: 400, size: 32, lh: 1.06, track: -0.012 },
    crowd: { family: SANS, weight: 400, size: 46, lh: 1.1, track: -0.088 },
    faint: { family: SERIF, weight: 400, size: 35, lh: 1.14 },
    glare: { family: SERIF, weight: 400, size: 33, lh: 1.08, track: -0.01 },
    swim: { family: SANS, weight: 400, size: 46, lh: 1.28 },
  }[P.hard];
  const readSt = { family: font.family, weight: 400, lh: 1.62, track: 0.03, ws: 0.14, width: WIDTH, align: 'left' };
  // size the reading font so the bold-starts version still fits, then use that size for both
  const probe = body.fit({ ...readSt, bold: 45 }, [LEFT, 0], { max: Math.round(54 * font.scale), min: 30, maxH: room });
  let plain = body.fit({ family: SANS, weight: 400, lh: 1.42, width: WIDTH, align: 'left' }, [LEFT, 0], { max: 52, min: 34, maxH: room });
  let hardL = body.lay({ width: WIDTH, align: 'left', ...HARD }, [LEFT, 0]);
  let read = body.lay({ ...readSt, size: probe.st.size }, [LEFT, 0]);
  let bionic = body.lay({ ...readSt, size: probe.st.size, bold: 45 }, [LEFT, 0]);
  // centre the whole composition in the safe area
  const tallest = Math.max(plain.h, read.h, bionic.h);
  const bodyTop = TOP + (BOTTOM - TOP - (zone + GAP + tallest)) / 2 + zone + GAP;
  [plain, hardL, read, bionic] = [plain, hardL, read, bionic].map((L) => moved(L, bodyTop));
  {
    let y = bodyTop - GAP - titleH;
    Thead = moved(Thead, y); y += Thead.h + 14; Tsub = moved(Tsub, y); y += Tsub.h + 12; if (Ttail) Ttail = moved(Ttail, y);
  }

  const stages = TL.stages;
  const stage_ = (name) => stages.find((s) => s.name === name);
  const N = body.meshes.length;

  const ask = new Block(ASKS[P.ask], 208);
  const Lask0 = ask.fit(sans(800, { lh: 1.06, track: -0.02 }), [LEFT, 0], { max: 100, min: 60, maxLines: 3 });
  const Lask = moved(Lask0, bodyTop - GAP - Lask0.h);

  /** Small white line over a large pastel line, sitting just above the lesson. */
  function caption(small, big) {
    const a = new Block(small, 96), b = new Block(big, 208);
    const Lb0 = b.fit(sans(800, { lh: 1.06, track: -0.02 }), [LEFT, 0], { max: 92, min: 48, maxLines: 2 });
    const Lb = moved(Lb0, bodyTop - GAP - Lb0.h);
    const La = a.lay(sans(400, { size: 40 }), [LEFT, Lb.at[1] - 62]);
    return { a, b, La, Lb };
  }
  const captions = [
    { ...caption('now in', font.name), start: t3 + 0.55, end: stages.length ? t4 : t5 },
    ...stages.map((s) => ({ ...caption(...{ bionic: ['add', 'bold word starts'], tint: ['add a', 'colour overlay'], ruler: ['and a', 'reading ruler'] }[s.name]), start: s.start + 0.1, end: s === stages[stages.length - 1] ? t5 : s.end })),
  ];

  const cta = CTAS[P.cta];
  const ctaBig = new Block(cta.big, 208), ctaSmall = new Block(cta.small, 96), brand = new Block('Easy Reader', 96, 32);
  let Lbig = ctaBig.fit(sans(800, { lh: 1.05, track: -0.02 }), [LEFT, 0], { max: 128, min: 70, maxLines: 2 });
  Lbig = moved(Lbig, 850 - Lbig.h);
  const Lsmall = ctaSmall.fit(sans(400), [LEFT, 884], { max: 46, min: 32, maxLines: 2 });
  const pillY = 884 + Lsmall.h + 70, pillH = 104;
  const Lbrand = brand.lay(sans(800, { size: 46, lh: 1 }), [LEFT, pillY + (pillH - 46) / 2 - 2]);
  const pillW = Lbrand.w + 110;

  // ---- flat shapes: reading ruler, sweep bar, pill, tint
  const quad = new THREE.PlaneGeometry(1, 1);
  const ROUND = 'uniform vec3 c; uniform float a; uniform vec2 size; uniform float r; varying vec2 vUv;' +
    'void main(){ vec2 p = (vUv - 0.5) * size; vec2 q = abs(p) - size * 0.5 + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;' +
    ' float al = a * smoothstep(1.0, -1.0, d); if (al < 0.003) discard; gl_FragColor = vec4(c, al); }';
  function rounded(order) {
    const m = new THREE.Mesh(quad, material(ROUND, { c: { value: new THREE.Vector3() }, a: { value: 0 }, size: { value: new THREE.Vector2(1, 1) }, r: { value: 10 } }));
    m.renderOrder = order; stage.add(m);
    return (x, y, w, h, r, c, a) => {
      m.visible = a > 0.003; if (!m.visible) return;
      const [wx, wy] = world(x + w / 2, y + h / 2);
      m.position.set(wx, wy, 0); m.scale.set(w, h, 1);
      const u = m.material.uniforms; u.size.value.set(w, h); u.r.value = r; u.c.value.set(c[0], c[1], c[2]); u.a.value = a;
    };
  }
  const drawRuler = rounded(20), drawSweep = rounded(34), drawPill = rounded(31);

  const tint = new THREE.Mesh(quad, material(
    'uniform vec3 c; uniform float a; uniform float edge; varying vec2 vUv; void main(){ gl_FragColor = vec4(c, a * smoothstep(edge + 0.06, edge - 0.06, vUv.x)); }',
    { c: { value: v3(pastel) }, a: { value: 0 }, edge: { value: 0 } }));
  tint.renderOrder = 40; tint.scale.set(DW * 3, DH * 3, 1); tint.position.z = 2; stage.add(tint);

  // ---- backgrounds. Each returns update(t, fade, reveal).
  const R = rng(seed);
  const dark = theme.dark;
  const glowBlend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
  const backgrounds = {
    /** Slow soft glows in the accent colour: the Emotion Shaper backdrop, in depth. */
    orbs() {
      const orbs = Array.from({ length: 5 }, (_, i) => {
        const tone = i % 2 ? mix3(pastel, col.bg, dark ? 0.35 : 0.1) : (dark ? mix3(pastel, [0.3, 0.35, 0.9], 0.45) : mix3(pastel, [1, 1, 1], 0.2));
        const m = new THREE.Mesh(quad, material('uniform vec3 c; uniform float a; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float g = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(c, a * g * g); }',
          { c: { value: v3(tone) }, a: { value: 0 } }, glowBlend));
        m.renderOrder = 1; scene.add(m);
        return { m, r: 700 + R() * 700, x: (R() - 0.5) * W * 1.3, y: (R() - 0.5) * H * 1.2, z: -500 - R() * 900, ph: R() * 6.28, sp: 0.1 + R() * 0.12, a: dark ? 0.15 : 0.5 };
      });
      return (t, fade) => { for (const o of orbs) { o.m.position.set(o.x + Math.cos(t * o.sp + o.ph) * 190, o.y + Math.sin(t * o.sp * 0.8 + o.ph) * 240, o.z); o.m.scale.set(o.r * 2, o.r * 2, 1); o.m.material.uniforms.a.value = o.a * fade; } };
    },
    /** Out-of-focus specks drifting upward at different depths. */
    dust() {
      const n = 420, pos = new Float32Array(n * 3), prm = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos.set([(R() - 0.5) * W * 3.2, R() * 5200, -R() * 2600 + 300], i * 3); prm.set([8 + R() * 30, 14 + R() * 60, R()], i * 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('prm', new THREE.BufferAttribute(prm, 3));
      const m = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: glowBlend,
        uniforms: { t: { value: 0 }, a: { value: 1 }, c: { value: v3(pastel) }, c2: { value: v3(dark ? col.text : col.deep) }, k: { value: H } },
        vertexShader: 'attribute vec3 prm; uniform float t; uniform float k; varying float tw; varying float mixv; void main(){ vec3 p = position; p.y = mod(p.y + t * prm.y, 5200.0) - 2600.0; p.x += sin(t * 0.3 + prm.z * 40.0) * 40.0;' +
          ' vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = prm.x * k * 1.9 / -mv.z; tw = 0.55 + 0.45 * sin(t * 0.9 + prm.z * 30.0); mixv = prm.z; }',
        fragmentShader: 'uniform vec3 c; uniform vec3 c2; uniform float a; varying float tw; varying float mixv; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = smoothstep(1.0, 0.25, d); gl_FragColor = vec4(mix(c, c2, step(0.7, mixv)), g * a * tw); }' });
      disposables.push(m, g);
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 1; scene.add(pts);
      return (t, fade) => { m.uniforms.t.value = t; m.uniforms.a.value = (dark ? 0.34 : 0.4) * fade; };
    },
    /** Faint letters adrift in space. They change into the reading font at the same moment the lesson does. */
    letters() {
      const abc = 'abdegkmnpqrswyzABGQR&?';
      const from = { family: SERIF, style: 'normal', weight: 400 }, to = { family: font.family, style: 'normal', weight: 400 };
      const ls = Array.from({ length: 28 }, (_, i) => {
        const ch = abc[Math.floor(R() * abc.length)], m = new THREE.Mesh(glyphGeo, glyphMaterial());
        m.material.uniforms.tA.value = glyph(from, ch, 208); m.material.uniforms.tB.value = glyph(to, ch, 208);
        const tone = i % 3 ? pastel : (dark ? col.text : col.deep);
        m.material.uniforms.c.value.set(tone[0], tone[1], tone[2]);
        m.renderOrder = 1; scene.add(m);
        return { m, x: (R() - 0.5) * W * 2.6, y: (R() - 0.5) * H * 2.2, z: -300 - R() * 1900, s: 240 + R() * 420, ph: R() * 6.28, sp: 0.06 + R() * 0.1, a: 0.05 + R() * 0.08, rz: (R() - 0.5) * 1.2 };
      });
      return (t, fade, reveal) => { for (const l of ls) {
        l.m.position.set(l.x + Math.sin(t * l.sp + l.ph) * 90, l.y + ((t * (18 + l.sp * 160)) % (H * 2.2)) * 0.2 + Math.cos(t * l.sp + l.ph) * 60, l.z);
        l.m.rotation.set(Math.sin(t * l.sp * 1.3 + l.ph) * 0.5, Math.cos(t * l.sp + l.ph) * 0.7, l.rz + Math.sin(t * l.sp) * 0.25);
        l.m.scale.set(l.s * 2, l.s * 2, 1); l.m.material.uniforms.a.value = l.a * fade * (dark ? 1 : 1.3); l.m.material.uniforms.m.value = reveal;
      } };
    },
    /** Long ribbons that roll like lines of text in a slow wind. */
    ribbons() {
      const geo = new THREE.PlaneGeometry(1, 1, 160, 1); disposables.push(geo);
      const rs = Array.from({ length: 9 }, (_, i) => {
        const tone = i % 2 ? pastel : mix3(pastel, dark ? col.text : col.deep, 0.5);
        const m = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: glowBlend,
          uniforms: { t: { value: 0 }, a: { value: 0 }, c: { value: v3(tone) }, ph: { value: R() * 6.28 }, amp: { value: 90 + R() * 170 }, fr: { value: 1.4 + R() * 2.2 }, sp: { value: 0.25 + R() * 0.35 }, wd: { value: 8 + R() * 54 }, len: { value: W * 3.4 } },
          vertexShader: 'uniform float t; uniform float ph; uniform float amp; uniform float fr; uniform float sp; uniform float wd; uniform float len; varying vec2 vUv; void main(){ vUv = uv; float x = position.x; float w = sin(x * fr * 6.2832 + t * sp + ph);' +
            ' vec3 p = vec3(x * len, w * amp + position.y * wd * (1.0 + 0.6 * sin(x * 9.0 + t * sp * 0.7 + ph)), cos(x * fr * 4.0 + t * sp * 0.6 + ph) * 160.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
          fragmentShader: 'uniform vec3 c; uniform float a; varying vec2 vUv; void main(){ float e = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y); float f = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x); gl_FragColor = vec4(c, a * e * f); }' });
        disposables.push(m);
        const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 1;
        mesh.position.set(0, (i / 8 - 0.5) * H * 1.5 + (R() - 0.5) * 120, -350 - R() * 1100); mesh.rotation.z = (R() - 0.5) * 0.5;
        scene.add(mesh);
        return { m, a: 0.1 + R() * 0.2 };
      });
      return (t, fade) => { for (const r of rs) { r.m.uniforms.t.value = t; r.m.uniforms.a.value = r.a * fade * (dark ? 0.9 : 1); } };
    },
  };
  const updateBackground = backgrounds[P.scene]();

  // ------------------------------------------------------------------------------------------------- one frame
  const revealLen = Math.min(1.9, (t4 - t3) * 0.62);

  function frame(t) {
    t = clamp(t, 0, duration);
    // how hard the lesson is to read right now, and how far the change to the reading font has gone
    const hardness = ease(seg(t, t2, t2 + 1.1)) * (1 - ease(seg(t, t3, t3 + revealLen * 0.7)));
    const reveal = seg(t, t3, t3 + revealLen);
    const glare = P.hard === 'glare' ? hardness : 0;
    const outro = ease(seg(t, t5, t5 + 0.7));
    const bg = mix3(col.bg, [1, 1, 1], glare);
    const text = mix3(col.text, [0.07, 0.08, 0.1], glare);
    const muted = mix3(col.muted, [0.35, 0.36, 0.4], glare);
    const accent = mix3(col.accent, col.deep, glare);
    renderer.setClearColor(new THREE.Color().setRGB(bg[0], bg[1], bg[2]), 1);

    // camera
    const cam = P.cam;
    camera.position.set(cam === 'drift' ? Math.sin(t * 0.33) * 46 * S : 0, cam === 'drift' ? Math.sin(t * 0.26 + 1) * 34 * S : 0, DIST * (cam === 'push' ? 1 - 0.055 * (t / duration) : 1));
    camera.lookAt(0, 0, 0);
    updateBackground(t, (1 - glare) * (1 - 0.35 * outro), ease(reveal));

    // a line of display text arriving letter by letter from behind the page
    const arrive = (L, start, n, c, gone = 0) => (i) => {
      const k = out(seg(t, start + (i / Math.max(n, 1)) * 0.5, start + 0.55 + (i / Math.max(n, 1)) * 0.5));
      return { a: k * (1 - gone), c, dz: (1 - k) * -520, dy: (1 - k) * 26 };
    };

    // kicker
    const kGone = ease(seg(t, t1 - 0.1, t1 + 0.35));
    kicker.draw(Lkick, Lkick, (i) => ({ a: out(seg(t, 0.05 + i * 0.012, 0.5 + i * 0.012)) * (1 - kGone), c: muted }));

    // hook lines, then the same lines as a small title while the lesson is read
    const toTitle = ease(seg(t, t1, t1 + 0.9));
    const titleGone = ease(seg(t, t2 - 0.15, t2 + 0.45));
    const lead = isQuote ? 0.5 : 0.42;
    head.draw(Lhead, Thead, (i) => ({ ...arrive(Lhead, 0.25, head.meshes.length, accent, titleGone)(i), k: toTitle }));
    const subAt = 0.25 + lead + 0.55, tailAt = subAt + 0.5;
    sub.draw(Lsub, Tsub, (i) => ({ a: out(seg(t, subAt + i * 0.008, subAt + 0.4 + i * 0.008)) * (1 - titleGone), c: isQuote ? muted : text, k: toTitle, dy: (1 - out(seg(t, subAt, subAt + 0.5))) * 18 }));
    if (tail) tail.draw(Ltail, Ttail, (i) => ({ ...arrive(Ltail, tailAt, tail.meshes.length, accent, titleGone)(i), k: toTitle }));

    // the question
    const askGone = ease(seg(t, t3 - 0.1, t3 + 0.3));
    const askAt = t2 + 0.95;
    ask.draw(Lask, Lask, (i) => { const k = out(seg(t, askAt + i * 0.022, askAt + 0.4 + i * 0.022)); return { a: k * (1 - askGone), c: accent, s: 0.86 + 0.14 * k, dy: (1 - k) * 22 }; });

    // feature captions
    for (const cp of captions) {
      const k = out(seg(t, cp.start, cp.start + 0.4)) * (1 - ease(seg(t, cp.end - 0.3, cp.end)));
      const rise = (1 - out(seg(t, cp.start, cp.start + 0.4))) * 20;
      if (k <= 0.004) { cp.a.hide(); cp.b.hide(); continue; }
      cp.a.draw(cp.La, cp.La, () => ({ a: k, c: text, dy: rise }));
      cp.b.draw(cp.Lb, cp.Lb, (i) => ({ a: k * out(seg(t, cp.start + i * 0.018, cp.start + 0.3 + i * 0.018)), c: accent, dy: rise }));
    }

    // the lesson: plain -> hard to read -> reading font -> bold word starts
    const sb = stage_('bionic'), sr = stage_('ruler'), stt = stage_('tint');
    let A, B, mode;
    if (t < t2) { A = B = plain; mode = 'hold'; }
    else if (t < t3) { A = plain; B = hardL; mode = 'harden'; }
    else if (sb && t >= sb.start + 0.15) { A = read; B = bionic; mode = 'bionic'; }
    else { A = hardL; B = read; mode = 'reveal'; }
    const lines = B.rows.length;
    const bodyIn = t1 + 0.5;
    const rulerOn = sr ? ease(seg(t, sr.start + 0.2, sr.start + 0.7)) : 0;
    const rulerPos = sr ? (() => { const x = Math.max(0, (t - sr.start - 0.7) / (0.6 * TL.pace)), f = Math.floor(x); return Math.min(lines - 1, f + ease((x - f) * 1.8)); })() : 0;
    const dim = 1 - outro;
    const ink = P.hard === 'faint' ? lerp(1, 0.3, hardness) : 1;
    const swim = P.hard === 'swim' ? hardness : 0;
    const sweepSpan = [lerp(hardL.at[1], read.at[1], 0.5) - 60, Math.max(hardL.at[1] + hardL.h, read.at[1] + read.h) + 60];
    const sweepY = lerp(sweepSpan[0], sweepSpan[1], reveal);

    body.draw(A, B, (i, a, b) => {
      const o = i / N;
      const enter = out(seg(t, bodyIn + a.line * 0.09, bodyIn + 0.5 + a.line * 0.09));
      const p = { a: enter * dim * ink, c: text, dy: (1 - enter) * 24 };
      if (mode === 'harden') p.u = ease(seg(t, t2, t2 + 1.1) * 1.35 - o * 0.35);
      else if (mode === 'bionic') { p.u = ease(seg(t, sb.start + 0.15, sb.start + 1.0) * 1.5 - o * 0.5); if (!b.bold) p.a *= lerp(1, 0.8, p.u); }
      else if (mode === 'reveal') {
        const h1 = hash(seed, i, 1), h2 = hash(seed, i, 2), h3 = hash(seed, i, 3);
        switch (P.reveal) {
          case 'morph': p.u = ease(reveal * 1.5 - o * 0.5); break;
          case 'scatter': { const k = ease(reveal * 1.3 - o * 0.3), burst = Math.sin(Math.PI * k); p.k = k; p.u = smooth(0.35, 0.65, k); p.dx = (h1 - 0.5) * 760 * burst; p.dy += (h2 - 0.5) * 900 * burst; p.dz = (h3 * 1100 - 500) * burst; p.rz = (h1 - 0.5) * 5 * burst; p.ry = (h2 - 0.5) * 4 * burst; break; }
          case 'flip': { const k = ease(reveal * 1.7 - o * 0.7); p.k = k; p.u = k < 0.5 ? 0 : 1; p.ry = (k < 0.5 ? k : k - 1) * Math.PI; break; }
          case 'sweep': { const y = lerp(a.y, b.y, 0.5); p.u = ease((sweepY - y) / 90 + 0.5); break; }
          case 'wave': { const k = ease(reveal * 1.6 - ((a.x - LEFT) / WIDTH) * 0.6); p.u = k; p.dz = Math.sin(Math.PI * k) * 300; p.dy -= Math.sin(Math.PI * k) * 34; p.rz = Math.sin(Math.PI * k) * (hash(seed, i, 4) - 0.5) * 0.5; break; }
        }
      }
      if (swim) { // letters drift a little out of place: an illustration of effort, not a simulation of dyslexia
        p.dx = (p.dx ?? 0) + Math.sin(t * 2.1 + i * 1.7) * 5.5 * swim; p.dy += Math.cos(t * 1.7 + i * 2.3) * 6.5 * swim; p.rz = (p.rz ?? 0) + Math.sin(t * 1.3 + i) * 0.13 * swim;
      }
      if (rulerOn) p.a *= lerp(1, clamp(1 - Math.abs(b.line - rulerPos)) * 0.55 + 0.45, rulerOn);
      return p;
    });

    // reading ruler and sweep bar
    if (sr) { const row = lerp(B.rows[Math.floor(rulerPos)].top, B.rows[Math.min(lines - 1, Math.floor(rulerPos) + 1)].top, rulerPos % 1), h = B.st.size * B.st.lh; drawRuler(LEFT - 26, row + 2, WIDTH + 52, h - 4, 16, accent, rulerOn * (dark ? 0.3 : 0.26) * dim); } else drawRuler(0, 0, 1, 1, 1, accent, 0);
    const sweeping = P.reveal === 'sweep' ? Math.sin(Math.PI * clamp(reveal)) : 0;
    drawSweep(LEFT - 40, sweepY - 4, WIDTH + 80, 8, 4, accent, sweeping * 0.95);

    // colour overlay: wipes across the whole frame, as the app's screen tint does
    if (stt) { tint.visible = true; tint.material.uniforms.a.value = (dark ? 0.15 : 0.3) * (1 - 0.4 * outro); tint.material.uniforms.edge.value = lerp(0.3, 0.7, ease(seg(t, stt.start + 0.15, stt.start + 1.2))); tint.visible = t > stt.start; } else tint.visible = false;

    // closing lines
    const oAt = t5 + 0.35;
    if (t < t5) { ctaBig.hide(); ctaSmall.hide(); brand.hide(); drawPill(0, 0, 1, 1, 1, accent, 0); }
    else {
      ctaBig.draw(Lbig, Lbig, arrive(Lbig, oAt, ctaBig.meshes.length, accent));
      const k2 = out(seg(t, oAt + 0.6, oAt + 1.0));
      ctaSmall.draw(Lsmall, Lsmall, () => ({ a: k2, c: text, dy: (1 - k2) * 16 }));
      const k3 = out(seg(t, oAt + 0.95, oAt + 1.4));
      drawPill(LEFT + (WIDTH - pillW) / 2, pillY, pillW, pillH, pillH / 2, accent, k3);
      brand.draw(Lbrand, Lbrand, () => ({ a: k3, c: dark ? col.bg : [1, 1, 1] }));
    }
    renderer.render(scene, camera);
  }

  return {
    duration, timeline: TL, frame,
    dispose() { for (const d of disposables) d.dispose(); glyphGeo.dispose(); quad.dispose(); renderer.dispose(); },
  };
}
