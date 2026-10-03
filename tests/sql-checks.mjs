// Checks shared by every graded SQL item (tournament holes and Driving Range problems).
import { runQuery } from '../js/lib/sql-runner.js';
import { compareResults } from '../js/lib/compare.js';
import { TOURNAMENTS } from '../js/tournaments.js';

// A clause keyword may only start a line (after indentation) in a pro solution.
const CLAUSE = /\b(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|(?:LEFT |RIGHT |INNER |CROSS )?(?:OUTER )?JOIN)\b/g;
const WINDOW_FN = /\bOVER\s*\(|\b(ROW_NUMBER|RANK|DENSE_RANK|PERCENT_RANK|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE)\s*\(/i;
const JOINS_INDEX = TOURNAMENTS.findIndex((t) => t.id === 'sql-joins'); // LEFT JOIN is taught from here on
const WINDOWS_INDEX = TOURNAMENTS.findIndex((t) => t.id === 'sql-windows'); // window functions are taught here

// Blank out the inside of OVER (...) so its PARTITION BY / ORDER BY don't count as clauses. Keeps line breaks.
const maskWindows = (sql) => sql.replace(/\bOVER\s*\(([^()]*)\)/gi, (m) => m.replace(/[^\n]/g, ' '));
const partitionCount = (sql) => (sql.match(/\bPARTITION\s+BY\b/gi) ?? []).length;

// The same data, but each table is a view that reads its rows in reverse storage order.
const reversedSeed = (seed) => seed + [...seed.matchAll(/CREATE TABLE (\w+)/g)].map(([, t]) => `
ALTER TABLE ${t} RENAME TO ${t}__stored;
CREATE VIEW ${t} AS SELECT * FROM ${t}__stored ORDER BY rowid DESC;`).join('');

const joinKinds = (sql) => {
  const joins = [...sql.matchAll(/\b((?:LEFT|RIGHT|INNER|CROSS)\s+)?(?:OUTER\s+)?JOIN\b/gi)];
  return { total: joins.length, outer: joins.filter((m) => /LEFT|RIGHT/i.test(m[1] ?? '')).length };
};

/** Grade `sql` against the item's expected result, the way the page does. */
export function grader(SQL, seed, item) {
  const expected = runQuery(SQL, seed, item.solution);
  const grade = (sql) => {
    try {
      return compareResults(runQuery(SQL, seed, sql), expected, { orderMatters: item.orderMatters });
    } catch (err) {
      return { ok: false, message: err.message };
    }
  };
  return { expected, grade };
}

/**
 * Everything a graded SQL item must satisfy: the solution passes and is formatted for display, alternatives are
 * accepted, mistakes are rejected (including a wrong-order one when order is graded, and a wrong-join-type one
 * from Joins & Subqueries on), and no features from later tournaments are needed.
 * `html` is extra HTML whose <pre> examples must also fit (a hole's lesson).
 */
export function checkGradedSql(assert, SQL, seed, item, { tournamentId, html = '' }) {
  const tournamentIndex = TOURNAMENTS.findIndex((t) => t.id === tournamentId);
  const { expected, grade } = grader(SQL, seed, item);
  assert.ok(expected.rows.length > 0, 'solution returns rows');

  // The pro's line is shown to learners: one clause per line (subqueries and CTE bodies included),
  // no stray whitespace, and code shown on the page fits its box without sideways scrolling.
  assert.equal(item.solution, item.solution.trim(), 'solution has no leading/trailing whitespace');
  const examples = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)]
    .map((m) => m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  for (const line of [item.solution, ...examples].flatMap((s) => s.split('\n'))) {
    assert.ok(line.length <= 80, `line is ${line.length} characters (max 80); wrap it: ${line}`);
  }
  for (const line of maskWindows(item.solution).split('\n')) {
    for (const m of line.trim().matchAll(CLAUSE)) {
      assert.equal(m.index, 0, `clause "${m[0]}" should start its own line in: ${line}`);
    }
  }

  if (tournamentIndex < WINDOWS_INDEX) {
    for (const sql of [item.solution, ...(item.alternatives ?? [])]) {
      assert.doesNotMatch(sql, WINDOW_FN, 'window functions belong to the Window Functions tournament');
    }
  }

  assert.ok(grade(item.solution).ok, 'solution passes');
  assert.equal(grade('').ok, false, 'a blank editor does not pass');
  if (tournamentIndex >= WINDOWS_INDEX) {
    // The expected result must not depend on the order SQLite happens to read tied rows in: rerun the solution on
    // the same data with every table read back to front, and require the same answer.
    const reversed = compareResults(runQuery(SQL, reversedSeed(seed), item.solution), expected,
      { orderMatters: item.orderMatters });
    assert.ok(reversed.ok, `solution is deterministic (break ties in the task): ${reversed.message}`);
  }
  assert.ok(item.alternatives?.length > 0, 'declares at least one alternative correct answer');
  for (const other of item.alternatives) {
    const verdict = grade(other);
    assert.ok(verdict.ok, `alternative is accepted: ${other}\n  checker said: ${verdict.message}`);
  }
  assert.ok(item.mistakes?.length > 0, 'declares at least one common mistake');
  for (const wrong of item.mistakes) {
    assert.equal(grade(wrong).ok, false, `mistake is rejected: ${wrong}`);
  }

  // Row order is only really graded if some wrong answer has the right rows in the wrong order.
  if (item.orderMatters) {
    assert.ok(item.mistakes.some((m) => /wrong order/.test(grade(m).message)),
      'orderMatters: declares a mistake with the right rows in the wrong order');
  }
  // Once outer joins are taught, every join item proves that the join type matters.
  if (tournamentIndex >= JOINS_INDEX && joinKinds(item.solution).total > 0) {
    const { outer } = joinKinds(item.solution);
    assert.ok(item.mistakes.some((m) => joinKinds(m).total > 0 && joinKinds(m).outer !== outer),
      'join item: declares a mistake that uses the other join type (LEFT vs INNER)');
  }
  // Forgetting PARTITION BY is the classic window bug, so every partitioned solution proves the checker catches it.
  if (tournamentIndex >= WINDOWS_INDEX && partitionCount(item.solution) > 0) {
    assert.ok(item.mistakes.some((m) => WINDOW_FN.test(m) && partitionCount(m) < partitionCount(item.solution)),
      'PARTITION BY item: declares a mistake that drops a PARTITION BY');
  }
  return expected;
}
