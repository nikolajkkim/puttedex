// The schedule data: shape, ids, and that holes load for open tournaments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOURNAMENTS, HOLES_PER_TOURNAMENT, loadTournament, isOpen } from '../js/tournaments.js';

test('tournament ids are unique and URL-safe', () => {
  const ids = TOURNAMENTS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test('every tournament has the fields the pages render', () => {
  for (const t of TOURNAMENTS) {
    for (const field of ['title', 'event', 'blurb', 'description', 'engine']) assert.ok(t[field], `${t.id}.${field}`);
    assert.ok(Array.isArray(t.skills) && t.skills.length > 0, `${t.id}.skills`);
    assert.ok(t.holeSet === null || typeof t.holeSet === 'string', `${t.id}.holeSet`);
    if (['sql', 'pandas'].includes(t.engine) && isOpen(t)) assert.ok(t.dataset, `${t.id} needs a dataset`);
  }
});

test('a prerequisite names an earlier tournament', () => {
  for (const [i, t] of TOURNAMENTS.entries()) {
    if (!t.prerequisite) continue;
    const j = TOURNAMENTS.findIndex((x) => x.id === t.prerequisite);
    assert.ok(j !== -1 && j < i, `${t.id}.prerequisite must be an earlier tournament, got ${t.prerequisite}`);
  }
});

test('at least one tournament is open', () => {
  assert.ok(TOURNAMENTS.some(isOpen));
});

for (const meta of TOURNAMENTS) {
  test(`${meta.id}: loads with 0–${HOLES_PER_TOURNAMENT} uniquely-identified holes`, async () => {
    const t = await loadTournament(meta);
    assert.ok(t.holes.length <= HOLES_PER_TOURNAMENT);
    assert.equal(t.holes.length > 0, isOpen(meta), 'open tournaments have holes; coming-soon ones have none');
    const ids = t.holes.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length, 'hole ids are unique');
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
    assert.equal(t.par, t.holes.reduce((s, h) => s + h.par, 0));
    if (isOpen(meta)) assert.ok(t.seed || meta.engine !== 'sql', 'SQL tournaments load a seed');
    if (isOpen(meta) && meta.engine === 'pandas') assert.ok(t.frames?.tables, 'pandas tournaments load a FRAMES manifest');
  });
}

test('every open tournament has a runner the problem views can host', async () => {
  const { hasEngineModule } = await import('./engines.mjs');
  for (const t of TOURNAMENTS.filter(isOpen)) assert.ok(hasEngineModule(t.engine), `${t.id}: js/ui/engines/${t.engine}.js`);
});
