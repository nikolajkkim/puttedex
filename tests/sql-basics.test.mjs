import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { runQuery, describeSchema } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { HOLES } from '../js/courses/index.js';

const playable = HOLES.filter((h) => h.load && (h.id.startsWith('sql')));

for (const hole of playable) {
  const course = await hole.load();

  test(`${hole.id}: catalog matches course`, () => {
    assert.equal(course.id, hole.id);
    assert.equal(hole.par, course.shots.reduce((sum, s) => sum + s.par, 0), 'hole par = sum of shot pars');
    const ids = course.shots.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, 'shot ids are unique');
  });

  test(`${hole.id}: seed database builds`, async () => {
    const tables = describeSchema(await getSql(), course.seed);
    assert.ok(tables.length > 0 && tables.every((t) => t.rowCount > 0));
  });

  for (const [i, shot] of course.shots.entries()) {
    test(`${hole.id} shot ${i + 1} (${shot.id})`, async () => {
      const SQL = await getSql();
      for (const field of ['title', 'lesson', 'task', 'solution', 'hint']) assert.ok(shot[field], `has ${field}`);
      assert.ok(shot.par >= 1);

      const expected = runQuery(SQL, course.seed, shot.solution);
      assert.ok(expected.rows.length > 0, 'solution returns rows');

      const grade = (sql) => {
        try {
          return compareResults(runQuery(SQL, course.seed, sql), expected, { orderMatters: shot.orderMatters });
        } catch (err) {
          return { ok: false, message: err.message };
        }
      };

      assert.ok(grade(shot.solution).ok, 'solution passes');
      assert.equal(grade(shot.starter).ok, false, 'starter code does not already pass');
      assert.ok(shot.mistakes?.length > 0, 'declares at least one common mistake');
      for (const wrong of shot.mistakes) {
        assert.equal(grade(wrong).ok, false, `mistake is rejected: ${wrong}`);
      }
    });
  }
}
