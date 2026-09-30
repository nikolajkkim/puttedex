// Learner progress, persisted in localStorage with JSON export/import.
//
// Shape (v1):
// {
//   version: 1,
//   updatedAt: ISO string,
//   shots: { "<holeId>/<shotId>": { strokes, hintUsed, solved, solvedAt, code } }
// }
// A "stroke" is one Submit. Revealing the caddie tip (hint) adds a one-stroke penalty.
// Strokes stop counting once a shot is solved.

export const STORAGE_KEY = 'puttedex.progress.v1';
const VERSION = 1;

const empty = () => ({ version: VERSION, updatedAt: null, shots: {} });

let memoryFallback = null; // used when localStorage is unavailable (private mode, blocked storage)

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== VERSION || typeof raw.shots !== 'object' || raw.shots === null) {
    return null;
  }
  const shots = {};
  for (const [key, s] of Object.entries(raw.shots)) {
    if (!s || typeof s !== 'object' || !key.includes('/')) continue;
    shots[key] = {
      strokes: Number.isFinite(s.strokes) && s.strokes >= 0 ? Math.floor(s.strokes) : 0,
      hintUsed: !!s.hintUsed,
      solved: !!s.solved,
      solvedAt: typeof s.solvedAt === 'string' ? s.solvedAt : null,
      code: typeof s.code === 'string' ? s.code : null,
    };
  }
  return { version: VERSION, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null, shots };
}

export function load() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null) return memoryFallback ?? empty();
    return normalize(JSON.parse(text)) ?? empty();
  } catch {
    return memoryFallback ?? empty();
  }
}

function save(state) {
  state.updatedAt = new Date().toISOString();
  memoryFallback = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: progress survives for this tab only.
  }
  return state;
}

const keyOf = (holeId, shotId) => `${holeId}/${shotId}`;

export function getShot(holeId, shotId) {
  return load().shots[keyOf(holeId, shotId)]
    ?? { strokes: 0, hintUsed: false, solved: false, solvedAt: null, code: null };
}

function updateShot(holeId, shotId, fn) {
  const state = load();
  const key = keyOf(holeId, shotId);
  const shot = state.shots[key] ?? { strokes: 0, hintUsed: false, solved: false, solvedAt: null, code: null };
  fn(shot);
  state.shots[key] = shot;
  save(state);
  return shot;
}

export const saveDraft = (holeId, shotId, code) => updateShot(holeId, shotId, (s) => { s.code = code; });

/** Record one Submit. Returns the updated shot record. */
export function recordStroke(holeId, shotId, correct, code) {
  return updateShot(holeId, shotId, (s) => {
    s.code = code;
    if (s.solved) return;
    s.strokes += 1;
    if (correct) {
      s.solved = true;
      s.solvedAt = new Date().toISOString();
    }
  });
}

export function useHint(holeId, shotId) {
  return updateShot(holeId, shotId, (s) => {
    if (s.hintUsed || s.solved) return;
    s.hintUsed = true;
    s.strokes += 1;
  });
}

/** Aggregate a hole: { played, total, strokes, parPlayed, complete }. */
export function holeSummary(hole, shots) {
  let played = 0, strokes = 0, parPlayed = 0;
  for (const shot of shots) {
    const rec = getShot(hole.id, shot.id);
    if (rec.solved) {
      played += 1;
      strokes += rec.strokes;
      parPlayed += shot.par;
    }
  }
  return { played, total: shots.length, strokes, parPlayed, complete: played === shots.length };
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

/** Replace progress with an exported file's contents. Throws with a readable message on bad input. */
export function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const state = normalize(parsed);
  if (!state) throw new Error("That file isn't a Puttedex progress export (or it's from an incompatible version).");
  save(state);
  return Object.keys(state.shots).length;
}

export function reset() {
  memoryFallback = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing stored */
  }
}
