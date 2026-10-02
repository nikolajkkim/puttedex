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

test('v1 progress in localStorage migrates to the current version on first load, keeping every hole', () => {
  store.set(progress.LEGACY_V1_KEY, JSON.stringify(V1));
  const state = progress.load();
  assert.equal(state.version, 4);
  assert.deepEqual(state.range, {});
  assert.deepEqual(Object.keys(state.holes).sort(), Object.keys(V1.shots).sort());
  assert.equal(progress.getHole('sql-basics', 'select-star').strokes, 3);
  assert.equal(progress.getHole('sql-basics', 'where').code, 'SELECT 42 -- draft');
  assert.ok(store.has(progress.STORAGE_KEY), 'migrated state is written under the new key');
  assert.ok(store.has(progress.LEGACY_V1_KEY), 'the v1 key is kept as a backup');
});

test('a v1 export file still imports', () => {
  const n = progress.importJson(JSON.stringify({ app: 'puttedex', ...V1 }));
  assert.deepEqual(n, { holes: 3, range: 0 });
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

test('v2 progress (before the Driving Range) migrates to the current version with holes and rounds intact', () => {
  const v2 = {
    version: 2,
    holes: { 'sql-basics/where': { strokes: 2, hintUsed: false, solved: true, solvedAt: '2026-09-29T12:00:00Z', code: 'x' } },
    rounds: { 'sql-basics': [{ finishedAt: '2026-09-20T00:00:00Z', strokes: 30, par: 22, holes: 10 }] },
  };
  store.set(progress.STORAGE_KEY, JSON.stringify(v2));
  const state = progress.load();
  assert.equal(state.version, 4);
  assert.deepEqual(state.holes, { 'sql-basics/where': { strokes: 2, hintUsed: false, solved: true, solvedAt: '2026-09-29T12:00:00Z', code: 'x' } });
  // Strokes and hole count survive; the stored par is dropped (it's recomputed from the current holes).
  assert.deepEqual(state.rounds, { 'sql-basics': [{ finishedAt: '2026-09-20T00:00:00Z', strokes: 30, holes: 10 }] });
  assert.deepEqual(state.range, {});
});

test('range records persist, export, and import alongside holes', () => {
  progress.recordStroke('sql-basics', 'where', true, 'SELECT 1');
  progress.updateRangeRecord('sql-basics/long-courses', (r) => { r.attempts = 4; r.solves = 1; r.bestStrokes = 3; r.code = 'q'; });
  const exported = progress.exportJson();
  store.clear();
  progress.reset();
  assert.equal(progress.getRangeRecord('sql-basics/long-courses').attempts, 0, 'cleared');
  assert.deepEqual(progress.importJson(exported), { holes: 1, range: 1 });
  const rec = progress.getRangeRecord('sql-basics/long-courses');
  assert.deepEqual([rec.attempts, rec.solves, rec.bestStrokes, rec.code, rec.reviewFlag], [4, 1, 3, 'q', false]);
  assert.equal(progress.getHole('sql-basics', 'where').solved, true);
});

test('garbage inside range records is normalized, not trusted', () => {
  progress.importJson(JSON.stringify({ version: 3, holes: {}, rounds: {}, range: {
    'sql-basics/x': { attempts: -3, bestStrokes: 'lots', reviewDueAt: 7, playHint: 1 },
    'no-slash': { attempts: 1 },
  } }));
  const rec = progress.getRangeRecord('sql-basics/x');
  assert.deepEqual([rec.attempts, rec.bestStrokes, rec.reviewDueAt, rec.playHint], [0, null, null, true]);
  assert.deepEqual(Object.keys(progress.allRangeRecords()), ['sql-basics/x']);
});

test('archived rounds get their par from the current holes, so a par change re-scores them', () => {
  // A v3 round that stored the old par (6) for 3 holes.
  progress.importJson(JSON.stringify({ version: 3, holes: {}, range: {},
    rounds: { 'sql-basics': [{ finishedAt: '2026-09-01T00:00:00Z', strokes: 7, par: 6, holes: 3 }] } }));
  const repar = { id: 'sql-basics', holes: [{ id: 'select-star', par: 1 }, { id: 'select-columns', par: 1 }, { id: 'where', par: 2 }] };
  const [round] = progress.rounds(repar);
  assert.deepEqual([round.strokes, round.par], [7, 4], 'par recomputed from the holes (1 + 1 + 2), strokes kept');
  assert.equal(JSON.parse(progress.exportJson()).rounds['sql-basics'][0].par, undefined, 'par is never stored');
});

test('score names with Par 1 and Par 2', () => {
  assert.equal(progress.scoreName(1, 1), 'Par');
  assert.equal(progress.scoreName(2, 1), 'Bogey');
  assert.equal(progress.scoreName(3, 1), 'Double bogey');
  assert.equal(progress.scoreName(1, 2), 'Hole in one');
  assert.equal(progress.scoreName(2, 2), 'Par');
  assert.equal(progress.scoreName(3, 2), 'Bogey');
});
