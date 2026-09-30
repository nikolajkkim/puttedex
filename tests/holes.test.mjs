// Every hole of every open tournament, checked against the real SQL engine and answer checker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { runQuery, describeSchema } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';

for (const meta of TOURNAMENTS.filter((t) => isOpen(t) && t.engine === 'sql')) {
  const t = await loadTournament(meta);

  test(`${t.id}: dataset builds`, async () => {
    const tables = describeSchema(await getSql(), t.seed);
    assert.ok(tables.length > 0 && tables.every((tbl) => tbl.rowCount > 0));
  });

  for (const [i, hole] of t.holes.entries()) {
    test(`${t.id} hole ${i + 1} (${hole.id})`, async () => {
      const SQL = await getSql();
      for (const field of ['title', 'lesson', 'task', 'solution', 'hint']) assert.ok(hole[field], `has ${field}`);
      assert.ok(Number.isInteger(hole.par) && hole.par >= 1, 'par is a positive integer');

      const expected = runQuery(SQL, t.seed, hole.solution);
      assert.ok(expected.rows.length > 0, 'solution returns rows');

      const grade = (sql) => {
        try {
          return compareResults(runQuery(SQL, t.seed, sql), expected, { orderMatters: hole.orderMatters });
        } catch (err) {
          return { ok: false, message: err.message };
        }
      };

      assert.ok(grade(hole.solution).ok, 'solution passes');
      assert.equal(grade(hole.starter ?? '').ok, false, 'starting editor content does not already pass');
      assert.ok(hole.mistakes?.length > 0, 'declares at least one common mistake');
      for (const wrong of hole.mistakes) {
        assert.equal(grade(wrong).ok, false, `mistake is rejected: ${wrong}`);
      }
    });
  }
}
