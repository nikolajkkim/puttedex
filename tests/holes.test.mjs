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
      for (const field of ['title', 'lesson', 'interview', 'yardage', 'task', 'solution', 'hint']) assert.ok(hole[field], `has ${field}`);
      assert.doesNotMatch(hole.lesson, /Interview angle/, 'the interview angle belongs in `interview`, not the lesson');
      assert.ok(!('starter' in hole), 'no prefilled starter code: the editor opens blank');
      assert.ok(Number.isInteger(hole.par) && hole.par >= 1, 'par is a positive integer');

      const expected = runQuery(SQL, t.seed, hole.solution);
      assert.ok(expected.rows.length > 0, 'solution returns rows');

      // The pro's line is shown to learners: one clause per line, no stray whitespace.
      assert.equal(hole.solution, hole.solution.trim(), 'solution has no leading/trailing whitespace');
      for (const line of hole.solution.split('\n')) {
        const midLine = line.trim().slice(1).match(/\b(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|(LEFT |INNER )?JOIN)\b/);
        assert.equal(midLine, null, `clause "${midLine?.[0]}" should start its own line in: ${line}`);
      }

      const grade = (sql) => {
        try {
          return compareResults(runQuery(SQL, t.seed, sql), expected, { orderMatters: hole.orderMatters });
        } catch (err) {
          return { ok: false, message: err.message };
        }
      };

      assert.ok(grade(hole.solution).ok, 'solution passes');
      assert.equal(grade('').ok, false, 'a blank editor does not pass');
      assert.ok(hole.alternatives?.length > 0, 'declares at least one alternative correct answer');
      for (const other of hole.alternatives) {
        const verdict = grade(other);
        assert.ok(verdict.ok, `alternative is accepted: ${other}\n  checker said: ${verdict.message}`);
      }
      assert.ok(hole.mistakes?.length > 0, 'declares at least one common mistake');
      for (const wrong of hole.mistakes) {
        assert.equal(grade(wrong).ok, false, `mistake is rejected: ${wrong}`);
      }
    });
  }
}
