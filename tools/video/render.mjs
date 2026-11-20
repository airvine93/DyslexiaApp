#!/usr/bin/env node
/**
 * Renders variants to video, and writes the files that tag them for later analysis.
 *
 *   node render.mjs list                      every variant and its settings
 *   node render.mjs manifest                  write manifest.csv, results-template.csv and IDEAS.md
 *   node render.mjs render ER-001 ER-042      render some (or: render all, render 1-10, render type=quote font=opendyslexic)
 *   node render.mjs stills ER-001             five PNGs per variant, for a quick look
 *
 * Options: --out <dir> (default out/)  --size 1080x1920  --fps 30  --link <url>  --jobs 2
 *
 * Each render writes, named by the variant tag so the settings travel with the file:
 *   <tag>.mp4   the video. The tag is also stored in the file's own metadata (title and comment).
 *   <tag>.json  the variant, its timeline and its tracking link
 *   <tag>.txt   a post caption with hashtags and the tracking link
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildAll } from './build.mjs';
import { DIMENSIONS, DIMENSION_NOTES, FONTS, buildVariants, timeline } from './src/design.js';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args.shift() ?? 'list';
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); if (i < 0) return fallback; const v = args[i + 1]; args.splice(i, 2); return v; };
const outDir = resolve(opt('out', join(here, 'out')));
const [width, height] = opt('size', '1080x1920').split('x').map(Number);
const fps = Number(opt('fps', 30));
const link = opt('link', '');
const jobs = Number(opt('jobs', 2));
const variants = buildVariants();

/** Which variants the remaining arguments name: ids, numbers, ranges, "all", or dimension=level filters. */
function pick(words) {
  if (!words.length || words.includes('all')) return variants;
  const chosen = new Set();
  const filters = words.filter((w) => w.includes('='));
  for (const w of words.filter((x) => !x.includes('='))) {
    const range = w.replace(/ER-/gi, '').match(/^(\d+)(?:-(\d+))?$/);
    if (!range) throw new Error(`"${w}" is not a variant. Use ER-001, 1-10, all, or a filter such as font=lexend`);
    for (let n = Number(range[1]); n <= Number(range[2] ?? range[1]); n++) if (variants[n - 1]) chosen.add(variants[n - 1]);
  }
  let list = chosen.size ? [...chosen] : variants;
  for (const f of filters) { const [d, level] = f.split('='); if (!DIMENSIONS[d]?.[level]) throw new Error(`unknown setting ${f}`); list = list.filter((v) => v.params[d] === level); }
  return list;
}

/** Tracking link for one variant: utm_content carries the variant id, utm_term the full tag. */
function trackingLink(v, base) {
  if (!base) return '';
  const u = new URL(base);
  u.searchParams.set('utm_medium', 'video'); u.searchParams.set('utm_campaign', 'easy-reader-video-lab');
  u.searchParams.set('utm_content', v.id); u.searchParams.set('utm_term', v.tag);
  return u.toString();
}

function caption(v, base) {
  const c = v.content, quote = v.params.type === 'quote';
  const lead = quote ? `"${c.head}" ${c.sub}.` : `${c.head[0].toUpperCase()}${c.head.slice(1)}: ${c.sub} ${c.tail}.`;
  const tags = ['#words', { word: '#wordoftheday', origin: '#etymology', quote: '#quotes', fact: '#wordfacts', phrase: '#english' }[v.params.type], '#reading', '#dyslexia', '#easyreader'];
  return `${lead}\n\n${c.body}\n\nFind this hard to read? Easy Reader shows any text in ${FONTS[v.params.font].name} and other reading fonts.\n${trackingLink(v, base) ? `${trackingLink(v, base)}\n` : ''}\n${tags.join(' ')}\n`;
}

const csvCell = (x) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
const dims = Object.keys(DIMENSIONS);

function writeManifest() {
  const rows = [['id', 'tag', ...dims, 'seconds', 'headline', 'connecting', 'landing', 'lesson', 'quote_checked', 'file']];
  for (const v of variants) rows.push([v.id, v.tag, ...dims.map((d) => v.params[d]), timeline(v).duration.toFixed(1), v.content.head, v.content.sub, v.content.tail, v.content.body, v.content.quoteChecked === undefined ? '' : v.content.quoteChecked ? 'yes' : 'no', `${v.tag}.mp4`]);
  writeFileSync(join(here, 'manifest.csv'), csv(rows));
  // one row per video per platform; fill in the numbers from each platform's analytics
  writeFileSync(join(here, 'results-template.csv'), csv([['id', 'platform', 'posted_on', 'spend', 'impressions', 'views', 'watch_3s', 'avg_watch_seconds', 'completions', 'likes', 'comments', 'shares', 'saves', 'link_clicks', 'installs'],
    ...variants.map((v) => [v.id, '', '', '', '', '', '', '', '', '', '', '', '', '', ''])]));
  const md = ['# 100 video ideas', '', 'Made by `node render.mjs manifest` from `src/ideas.js` and `src/design.js`. Edit those, not this file.', '',
    'Every video has the same five acts: a hook, a short lesson, the lesson turning hard to read with a question, the change into a reading font (plus any extra features), and a closing line.', '',
    '## What changes between videos', '', '| Setting | What it tests | Levels |', '|---|---|---|',
    ...dims.map((d) => `| ${d} | ${DIMENSION_NOTES[d]} | ${Object.keys(DIMENSIONS[d]).join(', ')} |`), '',
    'The type follows the idea. Every other setting is dealt out evenly and shuffled, so each level is used about the same number of times and no two settings always travel together.', ''];
  const titles = { word: 'Words (1-20)', origin: 'Where words come from (21-40)', quote: 'Quotes (41-60)', fact: 'Word facts (61-80)', phrase: 'Phrases, groups, mix-ups and tongue twisters (81-100)' };
  for (const type of Object.keys(titles)) {
    md.push(`## ${titles[type]}`, '', '| # | Idea | Hook | Background | Colours | Made hard by | Question | Change | Font | Features | Close | Pace | Camera | Secs |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const v of variants.filter((x) => x.params.type === type)) {
      const p = v.params, c = v.content;
      const idea = type === 'quote' ? `"${c.head}" ${c.sub}` : `**${c.head}** ${c.sub} **${c.tail}**`;
      md.push(`| ${v.n} | ${idea} | ${p.hook} | ${p.scene} | ${p.theme}, ${p.accent} | ${p.hard} | ${p.ask} | ${p.reveal} | ${FONTS[p.font].name} | ${p.feat} | ${p.cta} | ${p.pace} | ${p.cam} | ${Math.round(timeline(v).duration)} |`);
    }
    md.push('');
  }
  md.push('## Lessons', '', 'The paragraph each video teaches, which is also the text that turns hard to read and is then restyled.', '');
  for (const v of variants) md.push(`${v.n}. **${v.content.head}** ${v.content.body}`);
  md.push('');
  writeFileSync(join(here, 'IDEAS.md'), md.join('\n'));
  console.log('wrote manifest.csv, results-template.csv and IDEAS.md');
}

async function launch() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('playwright-core')); } catch { throw new Error('Playwright is needed to render: npm i -D playwright && npx playwright install chromium'); } }
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  return chromium.launch({ executablePath, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'] });
}

async function openPage(browser, file, v) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
  await page.goto(`${pathToFileURL(file)}?render=1`);
  await page.waitForFunction(() => typeof window.__init === 'function', null, { timeout: 60000 });
  const duration = await page.evaluate(([id, w, h]) => window.__init(id, w, h), [v.id, width, height]);
  return { page, duration };
}

async function renderOne(browser, file, v, stillsOnly) {
  const { page, duration } = await openPage(browser, file, v);
  const base = join(outDir, v.tag);
  const tl = timeline(v);
  const grab = async (t) => Buffer.from((await page.evaluate((x) => { window.__frame(x); return window.__jpeg(0.94); }, t)).split(',')[1], 'base64');
  if (stillsOnly) {
    const moments = { hook: tl.t1 - 0.4, lesson: tl.t2 - 0.5, question: tl.t3 - 0.5, font: tl.t4 - 0.3, end: duration - 0.2 };
    for (const [name, t] of Object.entries(moments)) writeFileSync(`${base}_${name}.jpg`, await grab(t));
    await page.close();
    return;
  }
  writeFileSync(`${base}.json`, JSON.stringify({ ...v, timeline: tl, size: [width, height], fps, link: trackingLink(v, link) }, null, 2));
  writeFileSync(`${base}.txt`, caption(v, link));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
    '-metadata', `title=${v.tag}`, '-metadata', `comment=${v.tag}`, `${base}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const frames = Math.round(duration * fps);
  for (let f = 0; f < frames; f++) { const jpg = await grab(f / fps); if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r)); }
  ff.stdin.end();
  await done;
  await page.close();
  console.log(`  ${v.tag}.mp4  ${duration.toFixed(1)}s`);
}

if (command === 'list') {
  for (const v of pick(args)) console.log(`${v.tag}  ${timeline(v).duration.toFixed(1)}s  ${v.content.head}`);
} else if (command === 'manifest') {
  writeManifest();
} else if (command === 'render' || command === 'stills') {
  const todo = pick(args);
  mkdirSync(outDir, { recursive: true });
  const file = await buildAll();
  const browser = await launch();
  const unchecked = todo.filter((v) => v.content.quoteChecked === false);
  if (unchecked.length) console.log(`Note: ${unchecked.length} quote(s) not yet checked against the source text (set v: true in src/ideas.js once checked): ${unchecked.map((v) => v.id).join(', ')}`);
  console.log(`${command === 'stills' ? 'Stills for' : 'Rendering'} ${todo.length} variant(s) at ${width}x${height} to ${outDir}`);
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { for (let v = queue.shift(); v; v = queue.shift()) await renderOne(browser, file, v, command === 'stills'); }));
  await browser.close();
} else {
  console.error(`unknown command "${command}". Try: list, manifest, render, stills`); process.exit(1);
}
