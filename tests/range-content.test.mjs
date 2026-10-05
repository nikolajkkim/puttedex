// Every Driving Range problem: the shared SQL or Python checks (by the problem's engine), plus the range's own rules
// (tags, difficulty, no lesson or starter code, and no problem that just repeats a tournament hole).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql, getPython, getPandas } from './helpers.mjs';
import { runQuery } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';
import { TOPICS } from '../js/data/range-config.js';
import { DIFFICULTIES } from '../js/data/par-config.js';
import { checkGradedSql } from './sql-checks.mjs';
import { checkGradedPython } from './python-checks.mjs';
import { checkGradedFrames } from './pandas-checks.mjs';
import { hasEngineModule } from './engines.mjs';

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
  // Python: the tournament's own holes (a problem that asks for the same function, or has the same solution, repeats).
  const pyHoles = ['python', 'pandas'].includes(meta.engine) ? t.holes.map((h, i) => ({ label: `${meta.id} hole ${i + 1}`, hole: h })) : [];

  test(`${meta.id} range: the tournament is open, and ids are unique and URL-safe`, () => {
    assert.ok(isOpen(meta), 'range problems need an open tournament to unlock from');
    for (const p of problems) assert.ok(hasEngineModule(p.engine ?? meta.engine), `${p.id}: the range problem view has a runner for it`);
    const ids = problems.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  });

  for (const p of problems) {
    test(`${meta.id} range: ${p.id}`, async () => {
      for (const field of ['title', 'task', 'solution', 'hint']) assert.ok(p[field], `has ${field}`);
      assert.ok(DIFFICULTIES.includes(p.difficulty), `difficulty is one of ${DIFFICULTIES.join('/')}`);
      assert.ok(!('par' in p), 'no par in the data: it comes from difficulty (js/data/par-config.js)');
      assert.ok(Array.isArray(p.tags) && p.tags.length > 0, 'has topic tags');
      for (const tag of p.tags) assert.ok(TOPICS.includes(tag), `tag "${tag}" is in TOPICS (js/data/range-config.js)`);
      assert.ok(!('starter' in p), 'no prefilled starter code: the editor opens blank');
      assert.ok(!('lesson' in p), 'range problems have no lesson');

      if ((p.engine ?? meta.engine) === 'pandas') {
        const { py } = await getPandas();
        checkGradedFrames(assert, py, p, { key: `range/${meta.id}/${p.id}`, dataset: t.frames.dir, frames: t.frames });
        for (const { label, hole } of pyHoles) {
          assert.notEqual(p.solution, hole.solution, `repeats ${label}: same solution`);
          assert.notEqual(p.checker.function, hole.checker.function, `repeats ${label}: asks for the same function`);
        }
        return;
      }
      if ((p.engine ?? meta.engine) === 'python') {
        checkGradedPython(assert, await getPython(), p, { key: `range/${meta.id}/${p.id}`, tournamentId: meta.id });
        for (const { label, hole } of pyHoles) {
          assert.notEqual(p.solution, hole.solution, `repeats ${label}: same solution`);
          if (p.checker.type === 'function' && hole.checker.type === 'function') {
            assert.notEqual(p.checker.function, hole.checker.function, `repeats ${label}: asks for the same function`);
          }
        }
        return;
      }
      const SQL = await getSql();
      const expected = checkGradedSql(assert, SQL, t.seed, p, { tournamentId: meta.id });
      for (const h of holes) {
        const same = compareResults(runQuery(SQL, t.seed, h.solution), expected, { orderMatters: false }).ok;
        assert.equal(same, false, `repeats ${h.label}: it has exactly the same expected answer`);
      }
    });
  }
}
