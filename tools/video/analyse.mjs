#!/usr/bin/env node
/**
 * Joins your results with the variant settings and shows which level of each setting did best.
 *
 *   node analyse.mjs results.csv                      rank by hold rate (watch_3s / impressions)
 *   node analyse.mjs results.csv --metric completion  or: hold, completion, avg_watch, share, save, click, install
 *
 * results.csv has the columns of results-template.csv: one row per video per platform. Rows with no impressions are
 * skipped. Rows for the same video are added together before any rate is worked out.
 *
 * Reading the output: every setting was dealt evenly across the 100 videos, so comparing the average of each level
 * is fair. Treat a gap as real only when the levels have enough videos behind them and the ranges do not overlap;
 * the "±" column is one standard error. Winners here are leads to re-test, not proof.
 */
import { readFileSync } from 'node:fs';
import { DIMENSIONS, DIMENSION_NOTES, buildVariants } from './src/design.js';

const METRICS = {
  hold: { label: 'Watched past 3 seconds, per impression', value: (r) => r.watch_3s / r.impressions },
  completion: { label: 'Watched to the end, per view', value: (r) => r.completions / r.views },
  avg_watch: { label: 'Share of the video watched on average', value: (r, v) => r.watch_seconds / r.views / v.seconds },
  share: { label: 'Shares per 1,000 views', value: (r) => (1000 * r.shares) / r.views },
  save: { label: 'Saves per 1,000 views', value: (r) => (1000 * r.saves) / r.views },
  click: { label: 'Link clicks per 1,000 impressions', value: (r) => (1000 * r.link_clicks) / r.impressions },
  install: { label: 'Installs per 1,000 impressions', value: (r) => (1000 * r.installs) / r.impressions },
};

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** Per-level averages of one metric for every setting. */
export function analyse(resultRows, metricName = 'hold', variants = buildVariants()) {
  const metric = METRICS[metricName];
  if (!metric) throw new Error(`unknown metric "${metricName}". Choose from: ${Object.keys(METRICS).join(', ')}`);
  const byId = new Map(variants.map((v) => [v.id, v]));
  const totals = new Map();
  const num = (x) => Number(String(x ?? '').replace(/[, ]/g, '')) || 0;
  for (const r of resultRows) {
    const id = (r.id || '').toUpperCase().match(/ER-\d{3}/)?.[0]; // accepts a bare id, a full tag or a file name
    if (!byId.has(id) || !(num(r.impressions) > 0 || num(r.views) > 0)) continue;
    const t = totals.get(id) ?? { impressions: 0, views: 0, watch_3s: 0, watch_seconds: 0, completions: 0, shares: 0, saves: 0, link_clicks: 0, installs: 0 };
    for (const k of ['impressions', 'views', 'watch_3s', 'completions', 'shares', 'saves', 'link_clicks', 'installs']) t[k] += num(r[k]);
    t.watch_seconds += num(r.avg_watch_seconds) * num(r.views);
    totals.set(id, t);
  }
  const scored = [];
  for (const [id, t] of totals) { const v = byId.get(id); const value = metric.value(t, { seconds: Number(v.seconds ?? 0) || 1 }); if (Number.isFinite(value)) scored.push({ v, value }); }
  const report = {};
  for (const d of Object.keys(DIMENSIONS)) {
    report[d] = Object.keys(DIMENSIONS[d]).map((level) => {
      const xs = scored.filter((s) => s.v.params[d] === level).map((s) => s.value);
      const n = xs.length, mean = n ? xs.reduce((a, b) => a + b, 0) / n : NaN;
      const se = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) / n) : NaN;
      return { level, n, mean, se };
    }).filter((x) => x.n).sort((a, b) => b.mean - a.mean);
  }
  const best = [...scored].sort((a, b) => b.value - a.value).slice(0, 10);
  return { metric: metric.label, videos: scored.length, report, best };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const args = process.argv.slice(2);
  const mi = args.indexOf('--metric'); const metric = mi >= 0 ? args.splice(mi, 2)[1] : 'hold';
  if (!args[0]) { console.error('usage: node analyse.mjs results.csv [--metric hold|completion|avg_watch|share|save|click|install]'); process.exit(1); }
  const { timeline } = await import('./src/design.js');
  const variants = buildVariants().map((v) => ({ ...v, seconds: timeline(v).duration }));
  const out = analyse(parseCsv(readFileSync(args[0], 'utf8')), metric, variants);
  const f = (x) => (Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(3));
  console.log(`\n${out.metric}\n${out.videos} videos with results\n`);
  if (out.videos < 30) console.log('Fewer than 30 videos have results, so most gaps below will be noise.\n');
  for (const [d, levels] of Object.entries(out.report)) {
    console.log(`${d}: ${DIMENSION_NOTES[d]}`);
    for (const l of levels) console.log(`  ${l.level.padEnd(14)} ${f(l.mean).padStart(8)}  ± ${Number.isFinite(l.se) ? f(l.se) : '  n/a'}   (${l.n} videos)`);
    const [a, b] = levels;
    if (a && b && Number.isFinite(a.se) && Number.isFinite(b.se)) console.log(a.mean - a.se > b.mean + b.se ? `  -> ${a.level} leads clearly\n` : '  -> no clear leader yet\n'); else console.log('');
  }
  console.log('Top videos');
  for (const s of out.best) console.log(`  ${f(s.value).padStart(8)}  ${s.v.tag}  ${s.v.content.head}`);
}
