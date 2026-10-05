// The pandas CSV dataset (js/data/datasets/clubhouse-csv/): committed files match the deterministic generator, stay
// small, and keep the deliberate messiness the pandas holes depend on. Parsed here with a tiny CSV reader, so these
// checks don't need pandas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFrames, TABLES, VARIANTS } from '../scripts/build-frames.mjs';
import { FRAMES } from '../js/data/datasets/clubhouse-csv.js';

const file = (variant, table) => readFileSync(new URL(`../js/data/datasets/${FRAMES.dir}/${variant}/${table}.csv`, import.meta.url), 'utf8');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else field += ch;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

test('the manifest lists every table and variant the generator writes', () => {
  assert.deepEqual(Object.keys(FRAMES.tables).sort(), [...TABLES].sort());
  assert.deepEqual(FRAMES.variants, VARIANTS);
  assert.ok(VARIANTS.includes(FRAMES.visible));
});

for (const variant of VARIANTS) {
  test(`${variant}: committed CSVs are exactly what scripts/build-frames.mjs builds (deterministic)`, () => {
    const built = buildFrames(variant);
    for (const table of TABLES) assert.equal(file(variant, table), built[table], `${variant}/${table}.csv is stale: run node scripts/build-frames.mjs`);
    assert.deepEqual(buildFrames(variant), built, 'two builds are identical');
  });

  test(`${variant}: every table is under 5,000 rows, with the deliberate messiness`, () => {
    const t = Object.fromEntries(TABLES.map((name) => [name, parseCsv(file(variant, name))]));
    for (const name of TABLES) assert.ok(t[name].length > 0 && t[name].length < 5000, `${name}: ${t[name].length} rows`);
    const ids = new Set(t.players.map((p) => p.player_id));
    const played = new Set(t.rounds.map((r) => r.player_id));
    const roundIds = new Set(t.rounds.map((r) => r.round_id));
    // Missing values
    assert.ok(t.players.some((p) => p.handicap === '') && t.players.some((p) => p.home_course_id === ''));
    assert.ok(t.rounds.some((r) => r.putts === '') && t.rounds.some((r) => r.weather === ''));
    // Inconsistent casing and stray whitespace
    assert.ok(t.players.some((p) => p.name !== p.name.trim()) && t.players.some((p) => p.country !== p.country.trim()));
    assert.ok(t.players.some((p) => p.country.trim() !== p.country.trim().toUpperCase()));
    // Numbers and dates stored as strings
    assert.ok(t.players.some((p) => p.dues.includes('$')) && t.players.some((p) => p.dues.includes(',')));
    assert.ok(t.rounds.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.played_on)));
    // Exact duplicate rows, and duplicate signups that only match after cleaning
    const cards = t.scores.map((s) => JSON.stringify(s));
    assert.ok(new Set(cards).size < cards.length, 'scores has exact duplicate rows');
    const clean = (p) => `${p.name.trim().replace(/\s+/g, ' ').toLowerCase()}|${p.country.trim().toUpperCase()}`;
    assert.ok(new Set(t.players.map(clean)).size < t.players.length, 'players has people who signed up twice');
    // Keys present in one table but not the other
    assert.ok([...played].some((id) => !ids.has(id)), 'rounds by players not in players');
    assert.ok([...ids].some((id) => !played.has(id)), 'players with no rounds');
    assert.ok(t.courses.some((c) => !t.rounds.some((r) => r.course_id === c.course_id)), 'a course with no rounds');
    assert.ok(t.scores.some((s) => !roundIds.has(s.round_id)), 'a card for a round not in rounds');
    // Cards agree with rounds (each card's strokes sum to the round's score)
    const sums = new Map();
    for (const s of new Map(t.scores.map((s) => [JSON.stringify(s), s])).values()) sums.set(s.round_id, (sums.get(s.round_id) ?? 0) + Number(s.strokes));
    for (const r of t.rounds) if (sums.has(r.round_id)) assert.equal(sums.get(r.round_id), Number(r.score), `round ${r.round_id}`);
  });
}
