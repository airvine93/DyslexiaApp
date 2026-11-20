import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyse, parseCsv } from '../analyse.mjs';
import { DIMENSIONS, buildVariants, parseTag, timeline } from '../src/design.js';
import { IDEAS } from '../src/ideas.js';

const variants = buildVariants();

test('there are 100 ideas, 20 of each type', () => {
  assert.equal(IDEAS.length, 100);
  for (const type of Object.keys(DIMENSIONS.type)) assert.equal(IDEAS.filter((i) => i.t === type).length, 20);
});

test('lessons are short enough to fit in every reading font', () => {
  for (const i of IDEAS) assert.ok(i.b.split(/\s+/).length <= 36, `${i.h}: ${i.b.split(/\s+/).length} words`);
});

test('tags are unique and can be read back into the same settings', () => {
  assert.equal(new Set(variants.map((v) => v.tag)).size, 100);
  for (const v of variants) assert.deepEqual(parseTag(v.tag), { id: v.id, params: v.params });
});

test('the design never changes between runs', () => {
  assert.deepEqual(buildVariants().map((v) => v.tag), variants.map((v) => v.tag));
});

test('every level of every setting is used about equally often', () => {
  for (const d of Object.keys(DIMENSIONS)) {
    const levels = Object.keys(DIMENSIONS[d]);
    const counts = levels.map((l) => variants.filter((v) => v.params[d] === l).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${d}: ${counts}`);
  }
});

test('videos run between 15 and 48 seconds', () => {
  for (const v of variants) { const d = timeline(v).duration; assert.ok(d >= 15 && d <= 48, `${v.id}: ${d}`); }
});

test('analysis ranks the levels of a setting', () => {
  const rows = variants.map((v) => `${v.id},tiktok,2026-01-01,0,1000,800,${v.params.font === 'lexend' ? 600 : 300},5,100,1,1,1,1,1,0`).join('\n');
  const out = analyse(parseCsv(`id,platform,posted_on,spend,impressions,views,watch_3s,avg_watch_seconds,completions,likes,comments,shares,saves,link_clicks,installs\n${rows}\n`));
  assert.equal(out.videos, 100);
  assert.equal(out.report.font[0].level, 'lexend');
  assert.ok(Math.abs(out.report.font[0].mean - 0.6) < 1e-9);
});
