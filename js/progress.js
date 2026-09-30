// Learner progress, persisted in localStorage with JSON export/import.
//
// Shape (v3):
// {
//   version: 3,
//   updatedAt: ISO string | null,
//   holes: { "<tournamentId>/<holeId>": { strokes, hintUsed, solved, solvedAt, code } },
//   rounds: { "<tournamentId>": [ { finishedAt, strokes, par, holes } ] },  // completed, archived rounds
//   range: { "<tournamentId>/<problemId>": RangeRecord }                    // Driving Range, see blankRange()
// }
// A "stroke" is one Submit. Revealing the caddie tip (hint) adds a one-stroke penalty.
// Strokes stop counting once a hole is solved. "Start a new round" archives a completed round and clears the holes.
// Range problems can be replayed: a "play" runs from the first stroke until the problem is solved. The rules for
// range records (review flags, solution unlock) live in js/range.js; this module only stores them.
//
// History: v1 (key puttedex.progress.v1) called holes "shots" and had no rounds. v2 had no range. Both are
// migrated on load, and their export files can still be imported. The v1 key is left in place as a backup.

export const STORAGE_KEY = 'puttedex.progress';
export const LEGACY_V1_KEY = 'puttedex.progress.v1';
const VERSION = 3;

const empty = () => ({ version: VERSION, updatedAt: null, holes: {}, rounds: {}, range: {} });
const blankHole = () => ({ strokes: 0, hintUsed: false, solved: false, solvedAt: null, code: null });

/** One range problem's history. Totals are across all plays; play* fields describe the play in progress. */
export const blankRange = () => ({
  attempts: 0,          // submissions, all plays
  failedAttempts: 0,    // wrong submissions, all plays
  hintsTotal: 0,        // caddie tips taken, all plays
  hintsSinceClean: 0,   // caddie tips since the last clean solve (see REVIEW in js/data/range-config.js)
  playStrokes: 0,       // strokes in the current play (submissions + tip penalty)
  playHint: false,      // caddie tip taken in the current play
  solves: 0,            // times solved
  bestStrokes: null,    // fewest strokes in a solving play
  lastStrokes: null,    // strokes of the most recent solve
  lastSolvedAt: null,
  lastAttemptedAt: null,
  reviewFlag: false,    // the most recent solve was a struggle
  reviewDueAt: null,    // when a flagged problem comes back as "needs review"
  code: null,           // editor draft
});

// Editor code that the first version prefilled. A saved draft identical to one of these was never typed by
// the learner, so it's dropped on load and the editor opens blank like every other hole.
const RETIRED_PREFILLS = new Set([
  '-- Your first tee shot: look at the players table',
  'SELECT\nFROM players;',
  'SELECT name, handicap\nFROM players',
  'SELECT round_id, score, putts\nFROM rounds\nWHERE',
  'SELECT round_id, score\nFROM rounds',
  'SELECT country\nFROM players;',
  'SELECT name\nFROM players\nWHERE handicap = NULL;',
  'SELECT\nFROM rounds;',
  'SELECT player_id\nFROM rounds',
  'SELECT c.name\nFROM rounds AS r\nJOIN courses AS c ON',
]);

let memoryFallback = null; // used when localStorage is unavailable (private mode, blocked storage)

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeHole(h) {
  return {
    strokes: Number.isFinite(h.strokes) && h.strokes >= 0 ? Math.floor(h.strokes) : 0,
    hintUsed: !!h.hintUsed,
    solved: !!h.solved,
    solvedAt: typeof h.solvedAt === 'string' ? h.solvedAt : null,
    code: typeof h.code === 'string' && !RETIRED_PREFILLS.has(h.code.trim()) ? h.code : null,
  };
}

function normalizeRound(r) {
  if (!r || typeof r !== 'object') return null;
  const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const round = { finishedAt: typeof r.finishedAt === 'string' ? r.finishedAt : null, strokes: n(r.strokes), par: n(r.par), holes: n(r.holes) };
  return round.strokes === null || round.par === null || round.holes === null ? null : round;
}

function normalizeRange(r) {
  const out = blankRange();
  const count = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const maybe = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const date = (v) => (typeof v === 'string' ? v : null);
  for (const k of ['attempts', 'failedAttempts', 'hintsTotal', 'hintsSinceClean', 'playStrokes', 'solves']) out[k] = count(r[k]);
  out.bestStrokes = maybe(r.bestStrokes);
  out.lastStrokes = maybe(r.lastStrokes);
  out.playHint = !!r.playHint;
  out.reviewFlag = !!r.reviewFlag;
  out.lastSolvedAt = date(r.lastSolvedAt);
  out.lastAttemptedAt = date(r.lastAttemptedAt);
  out.reviewDueAt = date(r.reviewDueAt);
  out.code = typeof r.code === 'string' ? r.code : null;
  return out;
}

/** Upgrade any supported version to the current shape, or return null if it isn't Puttedex progress. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let holesIn, roundsIn = {}, rangeIn = {};
  if (raw.version === 1 && raw.shots && typeof raw.shots === 'object') {
    holesIn = raw.shots; // v1 -> v2: "shots" became "holes"; keys ("<id>/<holeId>") are unchanged
  } else if ((raw.version === 2 || raw.version === 3) && raw.holes && typeof raw.holes === 'object') {
    holesIn = raw.holes;
    roundsIn = raw.rounds && typeof raw.rounds === 'object' ? raw.rounds : {};
    // v2 -> v3: the Driving Range was added; v2 simply has none.
    if (raw.version === 3 && raw.range && typeof raw.range === 'object') rangeIn = raw.range;
  } else {
    return null;
  }
  const range = {};
  for (const [key, r] of Object.entries(rangeIn)) {
    if (r && typeof r === 'object' && key.includes('/')) range[key] = normalizeRange(r);
  }
  const holes = {};
  for (const [key, h] of Object.entries(holesIn)) {
    if (h && typeof h === 'object' && key.includes('/')) holes[key] = normalizeHole(h);
  }
  const rounds = {};
  for (const [tid, list] of Object.entries(roundsIn)) {
    if (Array.isArray(list)) rounds[tid] = list.map(normalizeRound).filter(Boolean);
  }
  return { version: VERSION, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null, holes, rounds, range };
}

function readKey(key) {
  const text = storage()?.getItem(key);
  return text == null ? null : migrate(JSON.parse(text));
}

export function load() {
  try {
    const current = readKey(STORAGE_KEY);
    if (current) return current;
    const legacy = readKey(LEGACY_V1_KEY);
    if (legacy) return save(legacy); // first run after the upgrade: persist in the new format
  } catch {
    // Corrupt JSON or blocked storage: fall through.
  }
  return memoryFallback ?? empty();
}

function save(state) {
  state.updatedAt = new Date().toISOString();
  memoryFallback = state;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: progress survives for this tab only.
  }
  return state;
}

const keyOf = (tid, holeId) => `${tid}/${holeId}`;

export function getHole(tid, holeId) {
  return load().holes[keyOf(tid, holeId)] ?? blankHole();
}

function updateHole(tid, holeId, fn) {
  const state = load();
  const key = keyOf(tid, holeId);
  const hole = state.holes[key] ?? blankHole();
  fn(hole);
  state.holes[key] = hole;
  save(state);
  return hole;
}

export const saveDraft = (tid, holeId, code) => updateHole(tid, holeId, (h) => { h.code = code; });

// ---------- Driving Range records (keyed "<tournamentId>/<problemId>") ----------

export function getRangeRecord(key) {
  return { ...blankRange(), ...(load().range[key] ?? {}) };
}

/** All range records, keyed; missing problems have no entry. */
export const allRangeRecords = () => load().range;

/** Apply `fn` to a range record and persist it. Returns the updated record. */
export function updateRangeRecord(key, fn) {
  const state = load();
  const rec = { ...blankRange(), ...(state.range[key] ?? {}) };
  fn(rec);
  state.range[key] = rec;
  save(state);
  return rec;
}

/** Record one Submit. Returns the updated hole record. */
export function recordStroke(tid, holeId, correct, code) {
  return updateHole(tid, holeId, (h) => {
    h.code = code;
    if (h.solved) return;
    h.strokes += 1;
    if (correct) {
      h.solved = true;
      h.solvedAt = new Date().toISOString();
    }
  });
}

export function useHint(tid, holeId) {
  return updateHole(tid, holeId, (h) => {
    if (h.hintUsed || h.solved) return;
    h.hintUsed = true;
    h.strokes += 1;
  });
}

/**
 * The current round of a tournament, over its available holes:
 * { played, total, strokes, parPlayed, complete, started, nextIndex }
 * nextIndex is the 0-based index of the first unsolved hole (or 0 when all are solved).
 */
export function roundSummary(tournament) {
  let played = 0, strokes = 0, parPlayed = 0, started = false, nextIndex = -1;
  tournament.holes.forEach((hole, i) => {
    const rec = getHole(tournament.id, hole.id);
    if (rec.strokes > 0 || rec.solved) started = true;
    if (rec.solved) {
      played += 1;
      strokes += rec.strokes;
      parPlayed += hole.par;
    } else if (nextIndex === -1) {
      nextIndex = i;
    }
  });
  const total = tournament.holes.length;
  return { played, total, strokes, parPlayed, complete: total > 0 && played === total, started, nextIndex: Math.max(nextIndex, 0) };
}

/** Archived rounds plus the current one if it's complete, best (lowest to par) first. */
export function rounds(tournament) {
  const list = [...(load().rounds[tournament.id] ?? [])];
  const now = roundSummary(tournament);
  if (now.complete) list.push({ finishedAt: null, strokes: now.strokes, par: now.parPlayed, holes: now.total, current: true });
  return list.sort((a, b) => (a.strokes - a.par) - (b.strokes - b.par) || b.holes - a.holes);
}

export const bestRound = (tournament) => rounds(tournament)[0] ?? null;

/** Archive the current round (if complete) and clear the tournament's holes so it can be replayed. */
export function startNewRound(tournament) {
  const now = roundSummary(tournament);
  const state = load();
  if (now.complete) {
    const lastSolve = tournament.holes
      .map((h) => state.holes[keyOf(tournament.id, h.id)]?.solvedAt)
      .filter(Boolean)
      .sort()
      .pop() ?? new Date().toISOString();
    (state.rounds[tournament.id] ??= []).push({ finishedAt: lastSolve, strokes: now.strokes, par: now.parPlayed, holes: now.total });
  }
  for (const key of Object.keys(state.holes)) {
    if (key.startsWith(`${tournament.id}/`)) delete state.holes[key];
  }
  save(state);
}

/** Golf name for a score relative to par. */
export function scoreName(strokes, par) {
  if (strokes === 1) return 'Hole in one';
  const diff = strokes - par;
  return { '-3': 'Albatross', '-2': 'Eagle', '-1': 'Birdie', 0: 'Par', 1: 'Bogey', 2: 'Double bogey', 3: 'Triple bogey' }[diff]
    ?? (diff < 0 ? `${-diff} under` : `${diff} over`);
}

export const formatToPar = (diff) => (diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`);

export function exportJson() {
  return JSON.stringify({ app: 'puttedex', ...load() }, null, 2);
}

/** Replace progress with an exported file's contents (any supported version). Returns { holes, range } counts. */
export function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const state = migrate(parsed);
  if (!state) throw new Error("That file isn't a Puttedex progress export (or it's from an unsupported version).");
  save(state);
  return { holes: Object.keys(state.holes).length, range: Object.keys(state.range).length };
}

export function reset() {
  memoryFallback = null;
  try {
    storage()?.removeItem(STORAGE_KEY);
    storage()?.removeItem(LEGACY_V1_KEY);
  } catch {
    /* nothing stored */
  }
}
