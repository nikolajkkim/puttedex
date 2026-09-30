// Progress storage: v1 -> v2 migration, import of old exports, rounds and best score.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A minimal in-memory localStorage, installed before progress.js is imported.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const progress = await import('../js/progress.js');

const V1 = {
  version: 1,
  updatedAt: '2026-09-29T12:00:00.000Z',
  shots: {
    'sql-basics/select-star': { strokes: 3, hintUsed: false, solved: true, solvedAt: '2026-09-29T12:00:00.000Z', code: 'SELECT * FROM players;' },
    'sql-basics/select-columns': { strokes: 2, hintUsed: true, solved: true, solvedAt: '2026-09-29T12:05:00.000Z', code: 'SELECT name, country FROM players;' },
    'sql-basics/where': { strokes: 1, hintUsed: false, solved: false, solvedAt: null, code: 'SELECT 42 -- draft' },
  },
};

const tournament = {
  id: 'sql-basics',
  holes: [{ id: 'select-star', par: 2 }, { id: 'select-columns', par: 2 }, { id: 'where', par: 2 }],
};

beforeEach(() => { store.clear(); progress.reset(); });

test('v1 progress in localStorage migrates to v2 on first load, keeping every hole', () => {
  store.set(progress.LEGACY_V1_KEY, JSON.stringify(V1));
  const state = progress.load();
  assert.equal(state.version, 2);
  assert.deepEqual(Object.keys(state.holes).sort(), Object.keys(V1.shots).sort());
  assert.equal(progress.getHole('sql-basics', 'select-star').strokes, 3);
  assert.equal(progress.getHole('sql-basics', 'where').code, 'SELECT 42 -- draft');
  assert.ok(store.has(progress.STORAGE_KEY), 'migrated state is written under the new key');
  assert.ok(store.has(progress.LEGACY_V1_KEY), 'the v1 key is kept as a backup');
});

test('a v1 export file still imports', () => {
  const n = progress.importJson(JSON.stringify({ app: 'puttedex', ...V1 }));
  assert.equal(n, 3);
  assert.equal(progress.getHole('sql-basics', 'select-columns').hintUsed, true);
});

test('garbage and unknown versions are rejected on import', () => {
  assert.throws(() => progress.importJson('not json'), /valid JSON/);
  assert.throws(() => progress.importJson('{"version": 99, "holes": {}}'), /Puttedex progress/);
});

test('v2 round-trips through export and import', () => {
  store.set(progress.LEGACY_V1_KEY, JSON.stringify(V1));
  const exported = progress.exportJson();
  store.clear();
  progress.reset();
  progress.importJson(exported);
  assert.equal(progress.getHole('sql-basics', 'select-star').strokes, 3);
});

test('round summary, completion, and best round', () => {
  store.set(progress.LEGACY_V1_KEY, JSON.stringify(V1));
  let s = progress.roundSummary(tournament);
  assert.deepEqual([s.played, s.total, s.strokes, s.parPlayed, s.complete, s.nextIndex], [2, 3, 5, 4, false, 2]);
  assert.equal(progress.bestRound(tournament), null, 'no best round until one is complete');

  progress.recordStroke('sql-basics', 'where', true, 'SELECT ...');
  s = progress.roundSummary(tournament);
  assert.equal(s.complete, true);
  assert.deepEqual(progress.bestRound(tournament), { finishedAt: null, strokes: 7, par: 6, holes: 3, current: true });

  progress.startNewRound(tournament);
  assert.equal(progress.roundSummary(tournament).played, 0, 'holes reset for the new round');
  const best = progress.bestRound(tournament);
  assert.equal(best.strokes - best.par, 1, 'the finished round is kept as the best round');
  assert.ok(best.finishedAt);

  // A better second round replaces it as the best.
  for (const h of tournament.holes) progress.recordStroke('sql-basics', h.id, true, '');
  assert.equal(progress.bestRound(tournament).strokes, 3);
  assert.equal(progress.rounds(tournament).length, 2);
});

test('strokes stop counting after a hole is solved, and hints cost one stroke once', () => {
  progress.useHint('sql-basics', 'where');
  progress.useHint('sql-basics', 'where');
  progress.recordStroke('sql-basics', 'where', false, 'x');
  progress.recordStroke('sql-basics', 'where', true, 'y');
  progress.recordStroke('sql-basics', 'where', false, 'z');
  const h = progress.getHole('sql-basics', 'where');
  assert.equal(h.strokes, 3);
  assert.equal(h.code, 'z');
});

test('drafts that are just the old prefilled starter code are dropped; real drafts are kept', () => {
  const v1 = {
    version: 1,
    shots: {
      'sql-basics/where': { strokes: 0, solved: false, code: 'SELECT name, handicap\nFROM players\n' },
      'sql-basics/null': { strokes: 1, solved: false, code: 'SELECT name\nFROM players\nWHERE handicap IS NULL' },
    },
  };
  progress.importJson(JSON.stringify(v1));
  assert.equal(progress.getHole('sql-basics', 'where').code, null);
  assert.equal(progress.getHole('sql-basics', 'null').code, 'SELECT name\nFROM players\nWHERE handicap IS NULL');
  assert.equal(progress.getHole('sql-basics', 'null').strokes, 1);
});
