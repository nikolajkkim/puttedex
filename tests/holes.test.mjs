// Every hole of every open tournament, checked against the real SQL engine and answer checker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { runQuery, describeSchema } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';

// A clause keyword may only start a line (after indentation) in a pro solution.
const CLAUSE = /\b(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|(?:LEFT |RIGHT |INNER |CROSS )?(?:OUTER )?JOIN)\b/g;
const WINDOW_FN = /\bOVER\s*\(|\b(ROW_NUMBER|RANK|DENSE_RANK|PERCENT_RANK|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE)\s*\(/i;
const JOINS_INDEX = TOURNAMENTS.findIndex((t) => t.id === 'sql-joins'); // LEFT JOIN is taught from here on
const WINDOWS_INDEX = TOURNAMENTS.findIndex((t) => t.id === 'sql-windows'); // window functions are taught here
const joinKinds = (sql) => {
  const joins = [...sql.matchAll(/\b((?:LEFT|RIGHT|INNER|CROSS)\s+)?(?:OUTER\s+)?JOIN\b/gi)];
  return { total: joins.length, outer: joins.filter((m) => /LEFT|RIGHT/i.test(m[1] ?? '')).length };
};

for (const meta of TOURNAMENTS.filter((t) => isOpen(t) && t.engine === 'sql')) {
  const t = await loadTournament(meta);
  const tournamentIndex = TOURNAMENTS.indexOf(meta);

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

      // The pro's line is shown to learners: one clause per line (subqueries and CTE bodies included),
      // no stray whitespace.
      assert.equal(hole.solution, hole.solution.trim(), 'solution has no leading/trailing whitespace');
      // Code shown on the page must fit its box without sideways scrolling at desktop widths.
      const examples = [...hole.lesson.matchAll(/<pre>([\s\S]*?)<\/pre>/g)]
        .map((m) => m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
      for (const line of [hole.solution, ...examples].flatMap((s) => s.split('\n'))) {
        assert.ok(line.length <= 80, `line is ${line.length} characters (max 80); wrap it: ${line}`);
      }
      for (const line of hole.solution.split('\n')) {
        for (const m of line.trim().matchAll(CLAUSE)) {
          assert.equal(m.index, 0, `clause "${m[0]}" should start its own line in: ${line}`);
        }
      }

      if (tournamentIndex < WINDOWS_INDEX) {
        for (const sql of [hole.solution, ...(hole.alternatives ?? [])]) {
          assert.doesNotMatch(sql, WINDOW_FN, 'window functions belong to the Window Functions tournament');
        }
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

      // Row order is only really graded if some wrong answer has the right rows in the wrong order.
      if (hole.orderMatters) {
        assert.ok(hole.mistakes.some((m) => /wrong order/.test(grade(m).message)),
          'orderMatters: declares a mistake with the right rows in the wrong order');
      }
      // Once outer joins are taught, every join hole proves that the join type matters.
      if (tournamentIndex >= JOINS_INDEX && joinKinds(hole.solution).total > 0) {
        const { outer } = joinKinds(hole.solution);
        assert.ok(hole.mistakes.some((m) => joinKinds(m).total > 0 && joinKinds(m).outer !== outer),
          'join hole: declares a mistake that uses the other join type (LEFT vs INNER)');
      }
    });
  }
}
