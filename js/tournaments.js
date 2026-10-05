// Loads tournament data (js/data/) into the shape the pages use. Pages never import data files directly.

import { TOURNAMENTS, HOLES_PER_TOURNAMENT } from './data/tournaments.js';
import { parFor } from './data/par-config.js';

export { TOURNAMENTS, HOLES_PER_TOURNAMENT };

export const tournamentById = (id) => TOURNAMENTS.find((t) => t.id === id) ?? null;
export const tournamentNumber = (t) => TOURNAMENTS.indexOf(t) + 1;
export const isOpen = (t) => Boolean(t.holeSet);
/** The tournament this one builds on (a recommendation, never a lock), or null. */
export const prerequisiteOf = (t) => (t.prerequisite ? tournamentById(t.prerequisite) : null);

export const urls = {
  schedule: () => './',
  tournament: (tid) => `tournament.html?t=${encodeURIComponent(tid)}`,
  holes: (tid) => `tournament.html?t=${encodeURIComponent(tid)}#holes`,
  hole: (tid, number) => `hole.html?t=${encodeURIComponent(tid)}&h=${number}`,
};

const cache = new Map();

/**
 * Resolve a tournament's holes and dataset.
 * Returns { ...meta, number, holes, seed, frames, par } where seed is a SQL dataset's SEED and frames a pandas
 * dataset's FRAMES manifest (each null when the dataset is the other kind), and holes are in play order, each with `par` computed from its
 * `difficulty` (js/data/par-config.js), and the tournament's par sums them.
 * A tournament without a holeSet resolves with no holes.
 */
export function loadTournament(t) {
  if (!cache.has(t.id)) {
    cache.set(t.id, (async () => {
      const [holesModule, datasetModule] = await Promise.all([
        t.holeSet ? import(`./data/holes/${t.holeSet}.js`) : null,
        t.holeSet && t.dataset ? import(`./data/datasets/${t.dataset}.js`) : null,
      ]);
      const holes = (holesModule?.default ?? []).map((h) => ({ ...h, par: parFor(h.difficulty) }));
      if (holes.length > HOLES_PER_TOURNAMENT) {
        throw new Error(`${t.id} defines ${holes.length} holes; the maximum is ${HOLES_PER_TOURNAMENT}.`);
      }
      return {
        ...t,
        number: tournamentNumber(t),
        holes,
        seed: datasetModule?.SEED ?? null,
        frames: datasetModule?.FRAMES ?? null,
        par: holes.reduce((sum, h) => sum + h.par, 0),
      };
    })());
  }
  return cache.get(t.id);
}

export const loadAll = () => Promise.all(TOURNAMENTS.map(loadTournament));
