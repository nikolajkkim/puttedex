// The Driving Range: extra practice problems per tournament, replayable, with review and rough-spot drills.
//
// Data: a tournament's range problems live in js/data/range/<rangeSet>.js (see TOURNAMENTS in
// js/data/tournaments.js). Settings: js/data/range-config.js. Storage: range records in js/progress.js.
// Everything here takes `now` (a Date) and, where random, an `rng` () => [0, 1), so tests can simulate time.

import {
  RANGE_UNLOCK, SOLUTION_UNLOCK_FAILED_ATTEMPTS, REVIEW, STRUGGLE_WEIGHTS, ROUGH_SPOTS, TIMED_ROUND, DIFFICULTY,
} from './data/range-config.js';
import { TOURNAMENTS, loadTournament } from './tournaments.js';
import * as progress from './progress.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const rangeUrls = {
  home: (filters = {}) => `range.html${filterQuery(filters)}`,
  problem: (key, filters = {}) => {
    const q = filterQuery(filters);
    return `practice.html?p=${encodeURIComponent(key)}${q ? `&${q.slice(1)}` : ''}`;
  },
  roundCard: () => 'range.html?round=last#timed-round',
};

export const difficultyLabel = (par) => `Par ${par} · ${DIFFICULTY[par] ?? ''}`.trim();

// ---------- Loading ----------

/**
 * Every range problem, in schedule order then data order, each as
 * { ...problem, key, tournament } where tournament is the loaded tournament (holes, seed, par, ...).
 */
export async function loadRange() {
  const withRange = TOURNAMENTS.filter((t) => t.rangeSet);
  const loaded = await Promise.all(withRange.map(async (meta) => {
    const [tournament, data] = await Promise.all([
      loadTournament(meta),
      import(`./data/range/${meta.rangeSet}.js`),
    ]);
    // A tournament's range can have its own dataset; by default it shares the tournament's.
    return data.default.map((p) => ({ ...p, key: `${meta.id}/${p.id}`, tournament }));
  }));
  return loaded.flat();
}

// ---------- Unlocking ----------

/**
 * Whether a tournament's range problems are unlocked, and the message to show when they aren't.
 * `rule` defaults to RANGE_UNLOCK; tests pass their own.
 */
export function unlockState(tournament, rule = RANGE_UNLOCK) {
  const finishedBefore = progress.rounds(tournament).length > 0; // any complete round, archived or current
  const current = progress.roundSummary(tournament);
  switch (rule.rule) {
    case 'always':
      return { unlocked: true, message: '' };
    case 'holes-done': {
      const unlocked = finishedBefore || current.played >= rule.holes;
      return {
        unlocked,
        message: unlocked ? '' : `Hole out ${rule.holes} holes of ${tournament.title} to unlock (${current.played}/${rule.holes})`,
      };
    }
    case 'tournament-complete':
    default: {
      const unlocked = finishedBefore;
      return {
        unlocked,
        message: unlocked ? '' : `Finish ${tournament.title} to unlock (${current.played}/${current.total} holes)`,
      };
    }
  }
}

// ---------- Status, review, and solution ----------

/**
 * 'unsolved' | 'solved' | 'needs-review'. A flagged solve only becomes 'needs-review' once reviewDueAt has passed;
 * until then it counts as solved ("comes back for review in N days").
 */
export function statusOf(rec, now = new Date()) {
  if (!rec || rec.solves === 0) return 'unsolved';
  if (rec.reviewFlag && rec.reviewDueAt && now >= new Date(rec.reviewDueAt)) return 'needs-review';
  return 'solved';
}

export const STATUS_LABEL = { unsolved: 'Unsolved', solved: 'Solved', 'needs-review': 'Needs review' };

export const solutionUnlocked = (rec) => rec.solves > 0 || rec.failedAttempts >= SOLUTION_UNLOCK_FAILED_ATTEMPTS;

export const failuresUntilSolution = (rec) => Math.max(0, SOLUTION_UNLOCK_FAILED_ATTEMPTS - rec.failedAttempts);

/** Record one submission. Returns { rec, solvedNow, flagged } where flagged means this solve needs review later. */
export function recordSubmit(problem, correct, code, now = new Date()) {
  let solvedNow = false, flagged = false;
  const rec = progress.updateRangeRecord(problem.key, (r) => {
    r.code = code;
    r.attempts += 1;
    r.lastAttemptedAt = now.toISOString();
    r.playStrokes += 1;
    if (!correct) {
      r.failedAttempts += 1;
      return;
    }
    solvedNow = true;
    const strokes = r.playStrokes;
    // The tip rule only applies to a play that used the tip: a tip-free solve within the stroke limit is clean.
    flagged = strokes > problem.par + REVIEW.strokesOverPar || (r.playHint && r.hintsSinceClean >= REVIEW.hintsSinceClean);
    r.solves += 1;
    r.lastStrokes = strokes;
    r.bestStrokes = r.bestStrokes === null ? strokes : Math.min(r.bestStrokes, strokes);
    r.lastSolvedAt = now.toISOString();
    r.reviewFlag = flagged;
    r.reviewDueAt = flagged ? new Date(now.getTime() + REVIEW.afterDays * DAY_MS).toISOString() : null;
    if (!flagged && !r.playHint) r.hintsSinceClean = 0; // a clean solve wipes the slate
    r.playStrokes = 0; // the next submission starts a new play
    r.playHint = false;
  });
  return { rec, solvedNow, flagged };
}

/** Take the caddie tip in the current play (+1 stroke, once per play). Returns the record. */
export function recordHint(problem, now = new Date()) {
  return progress.updateRangeRecord(problem.key, (r) => {
    if (r.playHint) return;
    r.playHint = true;
    r.playStrokes += 1;
    r.hintsTotal += 1;
    r.hintsSinceClean += 1;
    r.lastAttemptedAt = now.toISOString();
  });
}

// ---------- The annotated list ----------

/**
 * Attach everything the pages need to each problem: { rec, status, locked, lockMessage }.
 * Unlock state is computed once per tournament.
 */
export function annotate(problems, { now = new Date(), rule = RANGE_UNLOCK, records = progress.allRangeRecords() } = {}) {
  const unlockByTournament = new Map();
  return problems.map((p) => {
    if (!unlockByTournament.has(p.tournament.id)) unlockByTournament.set(p.tournament.id, unlockState(p.tournament, rule));
    const { unlocked, message } = unlockByTournament.get(p.tournament.id);
    const rec = { ...progress.blankRange(), ...(records[p.key] ?? {}) };
    return { ...p, rec, status: statusOf(rec, now), locked: !unlocked, lockMessage: message };
  });
}

// ---------- Filters ----------

export const FILTER_KEYS = ['tournament', 'topic', 'difficulty', 'status', 'q'];

export function readFilters(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']).filter(([, v]) => v));
}

function filterQuery(filters) {
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) if (filters[k]) params.set(k, filters[k]);
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Apply the range home's filters. Status 'locked' matches locked problems; other statuses match unlocked ones. */
export function filterProblems(list, filters = {}) {
  const q = (filters.q ?? '').trim().toLowerCase();
  return list.filter((p) => {
    if (filters.tournament && p.tournament.id !== filters.tournament) return false;
    if (filters.topic && !p.tags.includes(filters.topic)) return false;
    if (filters.difficulty && String(p.par) !== String(filters.difficulty)) return false;
    if (filters.status === 'locked') { if (!p.locked) return false; } else if (filters.status && (p.locked || p.status !== filters.status)) return false;
    if (q) {
      const haystack = [p.title, p.tournament.title, ...p.tags].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

/** Previous and next playable (unlocked) problems around `key` within a filtered list. */
export function neighbors(list, key) {
  const playable = list.filter((p) => !p.locked);
  const i = playable.findIndex((p) => p.key === key);
  if (i === -1) return { prev: null, next: null, position: null, total: playable.length };
  return { prev: playable[i - 1] ?? null, next: playable[i + 1] ?? null, position: i + 1, total: playable.length };
}

// ---------- Rough spots ----------

/** Struggle score per topic, highest first, only topics with a score above 0. */
export function struggleByTopic(annotated) {
  const scores = new Map();
  for (const p of annotated) {
    const r = p.rec;
    const overPar = r.solves > 0 && r.lastStrokes !== null ? Math.max(0, r.lastStrokes - p.par) : 0;
    const score = r.failedAttempts * STRUGGLE_WEIGHTS.failedAttempt
      + r.hintsTotal * STRUGGLE_WEIGHTS.hint
      + overPar * STRUGGLE_WEIGHTS.strokeOverPar;
    if (score === 0) continue;
    for (const tag of p.tags) scores.set(tag, (scores.get(tag) ?? 0) + score);
  }
  return [...scores.entries()]
    .map(([topic, score]) => ({ topic, score }))
    .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic));
}

export const roughSpots = (annotated) => struggleByTopic(annotated).slice(0, ROUGH_SPOTS);

// ---------- Modes ----------

const pick = (list, rng) => list[Math.floor(rng() * list.length)] ?? null;

function sample(list, n, rng) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** Mixed Bag: a random unsolved problem from everything unlocked (null when there is none). */
export const mixedBag = (annotated, rng = Math.random) =>
  pick(annotated.filter((p) => !p.locked && p.status === 'unsolved'), rng);

/** Drill my rough spots: an unsolved or needs-review problem tagged with one of the weakest topics. */
export function drill(annotated, rng = Math.random) {
  const topics = roughSpots(annotated).map((s) => s.topic);
  const pool = annotated.filter((p) => !p.locked && (p.status === 'unsolved' || p.status === 'needs-review')
    && p.tags.some((t) => topics.includes(t)));
  return { problem: pick(pool, rng), topics };
}

/** Timed Round: TIMED_ROUND.problems random unlocked problems (unsolved ones first when there are enough). */
export function timedRoundPicks(annotated, rng = Math.random) {
  const unlocked = annotated.filter((p) => !p.locked);
  const fresh = unlocked.filter((p) => p.status !== 'solved');
  const picks = sample(fresh, TIMED_ROUND.problems, rng);
  if (picks.length < TIMED_ROUND.problems) {
    picks.push(...sample(unlocked.filter((p) => !picks.includes(p)), TIMED_ROUND.problems - picks.length, rng));
  }
  return picks;
}

// ---------- Timed round state (a per-browser convenience: not part of exported progress) ----------

export const ROUND_KEY = 'puttedex.timedRound';

function roundStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readRoundState() {
  try {
    return JSON.parse(roundStore()?.getItem(ROUND_KEY) ?? 'null') ?? {};
  } catch {
    return {};
  }
}

function writeRoundState(state) {
  try {
    roundStore()?.setItem(ROUND_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: the round still works until the page is left */
  }
}

/** Start a round with the given problems. Returns the round. */
export function startTimedRound(problems, now = new Date()) {
  const round = {
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + TIMED_ROUND.minutes * 60 * 1000).toISOString(),
    problems: problems.map((p) => ({ key: p.key, title: p.title, par: p.par, strokes: 0, solved: false, solvedAt: null })),
  };
  writeRoundState({ ...readRoundState(), active: round });
  return round;
}

/** The active round, or null. A round whose time is up is finished (moved to `last`) on read. */
export function activeRound(now = new Date()) {
  const state = readRoundState();
  if (!state.active) return null;
  if (now >= new Date(state.active.endsAt)) {
    finishTimedRound(now, 'time');
    return null;
  }
  return state.active;
}

export const lastRound = () => readRoundState().last ?? null;

/** Count a stroke (submission or tip) in the active round, if `key` is part of it. Returns the round or null. */
export function recordRoundStroke(key, { solved = false } = {}, now = new Date()) {
  const round = activeRound(now);
  const entry = round?.problems.find((p) => p.key === key);
  if (!entry || entry.solved) return round;
  entry.strokes += 1;
  if (solved) {
    entry.solved = true;
    entry.solvedAt = now.toISOString();
  }
  const state = readRoundState();
  state.active = round;
  writeRoundState(state);
  if (round.problems.every((p) => p.solved)) finishTimedRound(now, 'complete');
  return round;
}

/** End the active round and keep its scorecard as `last`. reason: 'complete' | 'time' | 'quit'. */
export function finishTimedRound(now = new Date(), reason = 'quit') {
  const state = readRoundState();
  if (!state.active) return state.last ?? null;
  const round = state.active;
  const elapsedMs = Math.min(now - new Date(round.startedAt), new Date(round.endsAt) - new Date(round.startedAt));
  state.last = { ...round, finishedAt: now.toISOString(), reason, elapsedMs };
  delete state.active;
  writeRoundState(state);
  return state.last;
}

/** Scorecard totals for a finished (or active) round. An unsolved problem scores par + TIMED_ROUND.unsolvedOverPar. */
export function roundTotals(round) {
  const par = round.problems.reduce((s, p) => s + p.par, 0);
  const solved = round.problems.filter((p) => p.solved).length;
  const strokes = round.problems.reduce((s, p) => s + (p.solved ? p.strokes : p.par + TIMED_ROUND.unsolvedOverPar), 0);
  return { par, solved, total: round.problems.length, strokes, toPar: strokes - par };
}
