// Learner progress, persisted in localStorage with JSON export/import.
//
// Shape (v2):
// {
//   version: 2,
//   updatedAt: ISO string | null,
//   holes: { "<tournamentId>/<holeId>": { strokes, hintUsed, solved, solvedAt, code } },
//   rounds: { "<tournamentId>": [ { finishedAt, strokes, par, holes } ] }   // completed, archived rounds
// }
// A "stroke" is one Submit. Revealing the caddie tip (hint) adds a one-stroke penalty.
// Strokes stop counting once a hole is solved. "Start a new round" archives a completed round and clears the holes.
//
// History: v1 (key puttedex.progress.v1) called holes "shots" and had no rounds. It is migrated on first
// load, and v1 export files can still be imported. The v1 key is left in place as a backup.

export const STORAGE_KEY = 'puttedex.progress';
export const LEGACY_V1_KEY = 'puttedex.progress.v1';
const VERSION = 2;

const empty = () => ({ version: VERSION, updatedAt: null, holes: {}, rounds: {} });
const blankHole = () => ({ strokes: 0, hintUsed: false, solved: false, solvedAt: null, code: null });

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
    code: typeof h.code === 'string' ? h.code : null,
  };
}

function normalizeRound(r) {
  if (!r || typeof r !== 'object') return null;
  const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const round = { finishedAt: typeof r.finishedAt === 'string' ? r.finishedAt : null, strokes: n(r.strokes), par: n(r.par), holes: n(r.holes) };
  return round.strokes === null || round.par === null || round.holes === null ? null : round;
}

/** Upgrade any supported version to the current shape, or return null if it isn't Puttedex progress. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let holesIn, roundsIn = {};
  if (raw.version === 1 && raw.shots && typeof raw.shots === 'object') {
    holesIn = raw.shots; // v1 -> v2: "shots" became "holes"; keys ("<id>/<holeId>") are unchanged
  } else if (raw.version === 2 && raw.holes && typeof raw.holes === 'object') {
    holesIn = raw.holes;
    roundsIn = raw.rounds && typeof raw.rounds === 'object' ? raw.rounds : {};
  } else {
    return null;
  }
  const holes = {};
  for (const [key, h] of Object.entries(holesIn)) {
    if (h && typeof h === 'object' && key.includes('/')) holes[key] = normalizeHole(h);
  }
  const rounds = {};
  for (const [tid, list] of Object.entries(roundsIn)) {
    if (Array.isArray(list)) rounds[tid] = list.map(normalizeRound).filter(Boolean);
  }
  return { version: VERSION, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null, holes, rounds };
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

/** Replace progress with an exported file's contents (any supported version). Returns the number of holes restored. */
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
  return Object.keys(state.holes).length;
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
