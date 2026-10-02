// Driving Range rules, with simulated progress: unlocking, review queue, solution unlock, rough spots, modes,
// and timed rounds. Uses a fake tournament and problems so the rules are tested independently of content.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const progress = await import('../js/progress.js');
const range = await import('../js/range.js');
const { REVIEW, TIMED_ROUND, SOLUTION_UNLOCK_FAILED_ATTEMPTS } = await import('../js/data/range-config.js');
const { parFor } = await import('../js/data/par-config.js');

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-10-01T09:00:00Z');
const at = (days) => new Date(T0.getTime() + days * DAY);

const tourA = { id: 'ta', title: 'Tour A', holes: [{ id: 'h1', par: 2 }, { id: 'h2', par: 2 }, { id: 'h3', par: 2 }] };
const tourB = { id: 'tb', title: 'Beta Cup', holes: [{ id: 'h1', par: 2 }] };
// Like loadRange(): problems declare a difficulty, and par is computed from it.
const P = (tournament, id, difficulty, tags) => ({
  id, key: `${tournament.id}/${id}`, difficulty, par: parFor(difficulty), tags, title: `Problem ${id}`, tournament,
});
const problems = [
  P(tourA, 'a1', 'easy', ['WHERE']), // par 1
  P(tourA, 'a2', 'medium', ['JOIN', 'GROUP BY']), // par 2
  P(tourA, 'a3', 'hard', ['JOIN', 'CASE WHEN']), // par 2
  P(tourA, 'a4', 'easy', ['Dates']),
  P(tourB, 'b1', 'easy', ['WHERE']),
];
const always = { rule: 'always' };
const solveTournament = (t) => t.holes.forEach((h) => progress.recordStroke(t.id, h.id, true, ''));
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

beforeEach(() => { store.clear(); progress.reset(); });

// ---------- unlocking ----------

test('tournament-complete: locked with a clear message until every hole is holed, and stays unlocked after a new round', () => {
  const rule = { rule: 'tournament-complete' };
  let s = range.unlockState(tourA, rule);
  assert.equal(s.unlocked, false);
  assert.equal(s.message, 'Finish Tour A to unlock (0/3 holes)');
  progress.recordStroke('ta', 'h1', true, '');
  assert.equal(range.unlockState(tourA, rule).message, 'Finish Tour A to unlock (1/3 holes)');
  solveTournament(tourA);
  assert.equal(range.unlockState(tourA, rule).unlocked, true);
  progress.startNewRound(tourA); // the completed round is archived
  assert.equal(range.unlockState(tourA, rule).unlocked, true, 'a finished round keeps the range unlocked');
});

test('holes-done: unlocks at N holes in the current round', () => {
  const rule = { rule: 'holes-done', holes: 2 };
  assert.equal(range.unlockState(tourA, rule).message, 'Hole out 2 holes of Tour A to unlock (0/2)');
  progress.recordStroke('ta', 'h1', true, '');
  assert.equal(range.unlockState(tourA, rule).unlocked, false);
  progress.recordStroke('ta', 'h3', true, '');
  assert.equal(range.unlockState(tourA, rule).unlocked, true);
});

test('annotate locks per tournament', () => {
  solveTournament(tourB);
  const list = range.annotate(problems, { now: T0, rule: { rule: 'tournament-complete' } });
  assert.deepEqual(list.map((p) => p.locked), [true, true, true, true, false]);
  assert.match(list[0].lockMessage, /^Finish Tour A to unlock/);
  assert.equal(list[4].lockMessage, '');
});

// ---------- status, review queue, solution unlock ----------

test('a clean solve is "solved" with best strokes; a struggle comes back as "needs review" after the delay', () => {
  const [a1] = problems; // par 1
  range.recordSubmit(a1, false, 'x', T0);
  let { rec, flagged } = range.recordSubmit(a1, true, 'y', T0);
  assert.deepEqual([rec.solves, rec.bestStrokes, rec.attempts, rec.failedAttempts, flagged], [1, 2, 2, 1, false]);
  assert.equal(range.statusOf(rec, T0), 'solved');

  // Second play: 6 strokes on a par 1 is more than 2 over par.
  for (let i = 0; i < 5; i++) range.recordSubmit(a1, false, 'x', at(1));
  ({ rec, flagged } = range.recordSubmit(a1, true, 'y', at(1)));
  assert.equal(flagged, true);
  assert.equal(rec.bestStrokes, 2, 'best strokes keeps the better play');
  assert.equal(rec.lastStrokes, 6);
  assert.equal(range.statusOf(rec, at(1)), 'solved', 'not back yet');
  assert.equal(range.statusOf(rec, at(1 + REVIEW.afterDays - 0.01)), 'solved', 'still not back');
  assert.equal(range.statusOf(rec, at(1 + REVIEW.afterDays)), 'needs-review', 'back after 3 days');
  assert.equal(rec.lastAttemptedAt, at(1).toISOString());

  // Reviewing it cleanly clears the flag.
  ({ rec, flagged } = range.recordSubmit(a1, true, 'y', at(5)));
  assert.equal(flagged, false);
  assert.equal(range.statusOf(rec, at(30)), 'solved');
});

test('exactly par + 2 is not flagged; par + 3 is (easy and medium)', () => {
  const [a1, a2] = problems; // par 1, par 2
  for (let i = 0; i < 2; i++) range.recordSubmit(a1, false, 'x', T0);
  assert.equal(range.recordSubmit(a1, true, 'y', T0).flagged, false, '3 strokes on par 1');
  for (let i = 0; i < 3; i++) range.recordSubmit(a1, false, 'x', T0);
  assert.equal(range.recordSubmit(a1, true, 'y', T0).flagged, true, '4 strokes on par 1');
  for (let i = 0; i < 3; i++) range.recordSubmit(a2, false, 'x', T0);
  assert.equal(range.recordSubmit(a2, true, 'y', T0).flagged, false, '4 strokes on par 2');
  for (let i = 0; i < 4; i++) range.recordSubmit(a2, false, 'x', T0);
  assert.equal(range.recordSubmit(a2, true, 'y', T0).flagged, true, '5 strokes on par 2');
});

test('the caddie tip costs one stroke per play and three tipped solves without a clean one flag the problem', () => {
  const [, a2] = problems; // par 2
  range.recordHint(a2, T0);
  range.recordHint(a2, T0); // same play: no second charge
  let rec = progress.getRangeRecord(a2.key);
  assert.deepEqual([rec.playStrokes, rec.hintsTotal], [1, 1]);
  assert.equal(range.recordSubmit(a2, true, 'q', T0).flagged, false, '1st tipped solve');
  range.recordHint(a2, T0);
  assert.equal(range.recordSubmit(a2, true, 'q', T0).flagged, false, '2nd tipped solve');
  range.recordHint(a2, T0);
  const third = range.recordSubmit(a2, true, 'q', T0);
  assert.equal(third.flagged, true, `${REVIEW.hintsSinceClean} tips since the last clean solve`);
  assert.equal(third.rec.hintsTotal, 3);
  // A clean solve resets the count.
  assert.equal(range.recordSubmit(a2, true, 'q', T0).flagged, false);
  range.recordHint(a2, T0);
  assert.equal(range.recordSubmit(a2, true, 'q', T0).flagged, false, 'the count started over');
});

test(`the pro solution unlocks on a solve or after ${SOLUTION_UNLOCK_FAILED_ATTEMPTS} failed attempts`, () => {
  const [a1, a2] = problems;
  for (let i = 0; i < SOLUTION_UNLOCK_FAILED_ATTEMPTS - 1; i++) range.recordSubmit(a1, false, 'x', T0);
  let rec = progress.getRangeRecord(a1.key);
  assert.equal(range.solutionUnlocked(rec), false);
  assert.equal(range.failuresUntilSolution(rec), 1);
  rec = range.recordSubmit(a1, false, 'x', T0).rec;
  assert.equal(range.solutionUnlocked(rec), true);
  assert.equal(range.solutionUnlocked(range.recordSubmit(a2, true, 'x', T0).rec), true);
});

// ---------- rough spots and modes ----------

test('struggle scores rank topics by failed attempts, tips, and strokes over par', () => {
  const [a1, a2, a3] = problems;
  // a2 (JOIN, GROUP BY): 2 failures + 1 tip, solved in 4 on par 2  -> 2*1 + 1*2 + 2 over par = 6
  range.recordSubmit(a2, false, 'x', T0); range.recordSubmit(a2, false, 'x', T0);
  range.recordHint(a2, T0); range.recordSubmit(a2, true, 'x', T0);
  // a3 (JOIN, CASE WHEN): 1 failure, solved in 2 on par 2 -> 1
  range.recordSubmit(a3, false, 'x', T0); range.recordSubmit(a3, true, 'x', T0);
  // a1 (WHERE): clean, 1 stroke -> 0, not listed
  range.recordSubmit(a1, true, 'x', T0);
  const list = range.annotate(problems, { now: T0, rule: always });
  assert.deepEqual(range.struggleByTopic(list), [
    { topic: 'JOIN', score: 7 }, { topic: 'GROUP BY', score: 6 }, { topic: 'CASE WHEN', score: 1 },
  ]);
  assert.equal(range.roughSpots(list).length, 3);
});

test('Mixed Bag serves only unlocked, unsolved problems', () => {
  solveTournament(tourB); // only tour B is unlocked
  let list = range.annotate(problems, { now: T0, rule: { rule: 'tournament-complete' } });
  assert.equal(range.mixedBag(list, seq(0.99)).key, 'tb/b1');
  range.recordSubmit(problems[4], true, 'x', T0);
  list = range.annotate(problems, { now: T0, rule: { rule: 'tournament-complete' } });
  assert.equal(range.mixedBag(list, seq(0.5)), null, 'nothing unsolved and unlocked');
});

test('Drill serves unsolved or due-for-review problems from the weakest topics only', () => {
  const [a1, a2, a3, a4] = problems;
  // JOIN becomes the weakest topic via a2, which is still solved within the limit.
  for (let i = 0; i < 3; i++) range.recordSubmit(a2, false, 'x', T0);
  range.recordSubmit(a2, true, 'x', T0); // 4 strokes on par 2: par + 2, not flagged
  range.recordSubmit(a1, true, 'x', T0);
  let list = range.annotate(problems, { now: T0, rule: always });
  let { problem, topics } = range.drill(list, seq(0));
  assert.deepEqual(topics, ['GROUP BY', 'JOIN']);
  assert.equal(problem.key, a3.key, 'a3 is the only unsolved JOIN/GROUP BY problem (a4 and a1 are other topics)');

  // Flag a3 as a struggle; before the delay it can't be drilled, after it it can.
  for (let i = 0; i < 7; i++) range.recordSubmit(a3, false, 'x', T0);
  range.recordSubmit(a3, true, 'x', T0);
  list = range.annotate(problems, { now: at(1), rule: always });
  assert.equal(range.drill(list, seq(0)).problem, null, 'solved, review not due yet');
  list = range.annotate(problems, { now: at(REVIEW.afterDays), rule: always });
  assert.equal(range.drill(list, seq(0)).problem.key, a3.key, 'due for review');
  assert.equal(list.find((p) => p.key === a4.key).status, 'unsolved');
});

test('Timed Round picks distinct unlocked problems, unsolved first', () => {
  solveTournament(tourA);
  range.recordSubmit(problems[0], true, 'x', T0); // a1 solved
  const list = range.annotate(problems, { now: T0, rule: { rule: 'tournament-complete' } });
  const picks = range.timedRoundPicks(list, seq(0, 0, 0));
  assert.equal(picks.length, TIMED_ROUND.problems);
  assert.equal(new Set(picks.map((p) => p.key)).size, picks.length, 'distinct');
  assert.ok(picks.every((p) => p.tournament.id === 'ta'), 'only unlocked tournaments');
  assert.ok(!picks.some((p) => p.key === 'ta/a1'), 'the solved problem is skipped while there are enough unsolved');
});

test('timed round: strokes, completion, expiry, and the scorecard', () => {
  const picks = problems.slice(0, 3);
  const round = range.startTimedRound(picks, T0);
  assert.equal(new Date(round.endsAt) - T0, TIMED_ROUND.minutes * 60 * 1000);
  range.recordRoundStroke('ta/a1', {}, new Date(T0.getTime() + 60e3));
  range.recordRoundStroke('ta/a1', { solved: true }, new Date(T0.getTime() + 120e3));
  range.recordRoundStroke('ta/a1', {}, new Date(T0.getTime() + 130e3)); // after solving: not counted
  range.recordRoundStroke('tb/b1', {}, new Date(T0.getTime() + 140e3)); // not in the round: ignored
  let active = range.activeRound(new Date(T0.getTime() + 150e3));
  assert.deepEqual(active.problems.map((p) => [p.strokes, p.solved]), [[2, true], [0, false], [0, false]]);

  // Time runs out: reading the round finishes it.
  assert.equal(range.activeRound(new Date(T0.getTime() + 31 * 60e3)), null);
  const last = range.lastRound();
  assert.equal(last.reason, 'time');
  assert.equal(last.elapsedMs, TIMED_ROUND.minutes * 60e3);
  assert.equal(last.problems[0].par, undefined, 'par is not stored with the round');
  // a1 (par 1): 2 strokes; a2 and a3 (par 2) unsolved: par + 2 each
  assert.deepEqual(range.roundTotals(range.withCurrentPars(last, problems)), { par: 5, solved: 1, total: 3, strokes: 2 + 4 + 4, toPar: 5 });

  // A round where everything is solved finishes itself.
  range.startTimedRound(picks.slice(0, 1), T0);
  range.recordRoundStroke('ta/a1', { solved: true }, new Date(T0.getTime() + 5e3));
  assert.equal(range.activeRound(new Date(T0.getTime() + 6e3)), null);
  assert.equal(range.lastRound().reason, 'complete');
});

// ---------- filters ----------

test('filters combine, search matches title, tournament, and tags, and prev/next skip locked problems', () => {
  solveTournament(tourA);
  const list = range.annotate(problems, { now: T0, rule: { rule: 'tournament-complete' } });
  const keys = (l) => l.map((p) => p.key);
  assert.deepEqual(keys(range.filterProblems(list, { topic: 'JOIN' })), ['ta/a2', 'ta/a3']);
  assert.deepEqual(keys(range.filterProblems(list, { difficulty: 'easy' })), ['ta/a1', 'ta/a4', 'tb/b1']);
  assert.deepEqual(range.readFilters('?difficulty=5'), { difficulty: 'hard' }, 'old par-number links still work');
  assert.deepEqual(range.readFilters('?difficulty=7'), {}, 'unknown values are dropped');
  assert.deepEqual(keys(range.filterProblems(list, { status: 'locked' })), ['tb/b1']);
  assert.deepEqual(keys(range.filterProblems(list, { status: 'unsolved' })), ['ta/a1', 'ta/a2', 'ta/a3', 'ta/a4']);
  assert.deepEqual(keys(range.filterProblems(list, { q: 'beta' })), ['tb/b1']);
  assert.deepEqual(keys(range.filterProblems(list, { q: 'problem a2' })), ['ta/a2'], 'every word must match');
  assert.deepEqual(keys(range.filterProblems(list, { q: 'case when', tournament: 'ta' })), ['ta/a3']);
  const n = range.neighbors(list, 'ta/a4');
  assert.deepEqual([n.prev.key, n.next, n.position, n.total], ['ta/a3', null, 4, 4]);
  assert.deepEqual(range.readFilters('?topic=JOIN&q=&status=solved&junk=1'), { topic: 'JOIN', status: 'solved' });
  assert.equal(range.rangeUrls.problem('ta/a1', { topic: 'JOIN' }), 'practice.html?p=ta%2Fa1&topic=JOIN');
});
