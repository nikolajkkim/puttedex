// Every Driving Range problem: the shared SQL checks, plus the range's own rules (tags, difficulty, no lesson or
// starter code, and no problem that just repeats a tournament hole).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { runQuery } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';
import { DIFFICULTY, TOPICS } from '../js/data/range-config.js';
import { checkGradedSql } from './sql-checks.mjs';

const withRange = TOURNAMENTS.filter((t) => t.rangeSet);

test('at least one tournament has range problems', () => {
  assert.ok(withRange.length > 0);
});

for (const meta of withRange) {
  const [t, problems] = await Promise.all([
    loadTournament(meta),
    import(`../js/data/range/${meta.rangeSet}.js`).then((m) => m.default),
  ]);
  // Every hole of every open SQL tournament that shares this dataset, to catch problems that repeat one.
  const holes = [];
  for (const other of TOURNAMENTS.filter((x) => isOpen(x) && x.engine === 'sql' && x.dataset === meta.dataset)) {
    const loaded = await loadTournament(other);
    for (const [i, h] of loaded.holes.entries()) holes.push({ label: `${other.id} hole ${i + 1}`, solution: h.solution });
  }

  test(`${meta.id} range: the tournament is open, and ids are unique and URL-safe`, () => {
    assert.ok(isOpen(meta), 'range problems need an open tournament to unlock from');
    assert.equal(meta.engine, 'sql', 'the range problem view runs SQL');
    const ids = problems.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  });

  for (const p of problems) {
    test(`${meta.id} range: ${p.id}`, async () => {
      const SQL = await getSql();
      for (const field of ['title', 'task', 'solution', 'hint']) assert.ok(p[field], `has ${field}`);
      assert.ok(Object.keys(DIFFICULTY).map(Number).includes(p.par), `par is one of ${Object.keys(DIFFICULTY).join('/')}`);
      assert.ok(Array.isArray(p.tags) && p.tags.length > 0, 'has topic tags');
      for (const tag of p.tags) assert.ok(TOPICS.includes(tag), `tag "${tag}" is in TOPICS (js/data/range-config.js)`);
      assert.ok(!('starter' in p), 'no prefilled starter code: the editor opens blank');
      assert.ok(!('lesson' in p), 'range problems have no lesson');

      const expected = checkGradedSql(assert, SQL, t.seed, p, { tournamentId: meta.id });
      for (const h of holes) {
        const same = compareResults(runQuery(SQL, t.seed, h.solution), expected, { orderMatters: false }).ok;
        assert.equal(same, false, `repeats ${h.label}: it has exactly the same expected answer`);
      }
    });
  }
}
