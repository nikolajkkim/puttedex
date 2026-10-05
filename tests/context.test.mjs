// "Copy context": the Markdown a learner copies to ask for help.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { runQuery } from '../js/lib/sql-runner.js';
import { buildContext, buildFallbackContext } from '../js/context/index.js';
import { htmlToMarkdown, markdownTable } from '../js/context/text.js';
import { tablesUsed } from '../js/context/sql.js';
import { CONTEXT_FRAMING, CONTEXT_LIMITS } from '../js/data/context-config.js';
import { SEED } from '../js/data/datasets/clubhouse.js';
import { parFor } from '../js/data/par-config.js';

const SQL = await getSql();
const holes = (await import('../js/data/holes/sql-basics.js')).default;
const rangeProblems = (await import('../js/data/range/sql-basics.js')).default;

const holeCtx = (hole, n, extra = {}) => ({
  engine: 'sql',
  location: { kind: 'hole', tournament: 'SQL Basics', hole: n, holes: 18 },
  title: hole.title,
  par: parFor(hole.difficulty),
  tags: [],
  task: hole.task,
  background: { lesson: hole.lesson, note: hole.yardage },
  code: '',
  lastRun: null,
  progress: { attempts: 0, strokes: 0, par: parFor(hole.difficulty), hintsUsed: 0, solved: false },
  solution: null,
  data: { SQL, seed: SEED, referenceSql: hole.solution },
  ...extra,
});
const rangeCtx = (p, extra = {}) => ({
  ...holeCtx(p, 0),
  location: { kind: 'range', tournament: 'SQL Basics' },
  tags: p.tags,
  background: null,
  progress: { attempts: 0, strokes: 0, par: parFor(p.difficulty), hintsUsed: '0 on this attempt, 0 in total', solved: false, best: null },
  data: { SQL, seed: SEED, referenceSql: p.solution },
  ...extra,
});
const headings = (md) => md.split('\n').filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
const run = (sql) => runQuery(SQL, SEED, sql);

test('HTML from lessons and tasks becomes readable Markdown', () => {
  const md = htmlToMarkdown(`<p>Use <code>WHERE</code> &amp; <strong>quote</strong> text.</p>
    <pre>SELECT * FROM t WHERE a &lt; 3;</pre><ul><li>one</li><li><em>two</em></li></ul><ol><li>a</li><li>b</li></ol>`, 'sql');
  assert.equal(md, 'Use `WHERE` & **quote** text.\n\n```sql\nSELECT * FROM t WHERE a < 3;\n```\n\n- one\n- *two*\n\n1. a\n2. b');
});

test('line breaks inside the HTML source are only whitespace', () => {
  assert.equal(htmlToMarkdown('<p>Return the\n      course <code>name</code>.</p>\n<pre>SELECT 1\nFROM t;</pre>'), 'Return the course `name`.\n\n```\nSELECT 1\nFROM t;\n```');
  assert.equal(htmlToMarkdown('<p>Before</p>\n  <pre>X</pre>\n  <p>After</p>'), 'Before\n\n```\nX\n```\n\nAfter');
});

test('Markdown tables escape pipes, show NULL, and cut long cells', () => {
  const t = markdownTable(['a', 'b|c'], [[null, 'x'.repeat(60)], [1.5, 'p|q']], 40);
  const lines = t.split('\n');
  assert.equal(lines[0], '| a | b\\|c |');
  assert.equal(lines[2], `| NULL | ${'x'.repeat(39)}… |`);
  assert.equal(lines[3], '| 1.5 | p\\|q |');
});

test('relevant tables come from the reference query and the code, ignoring comments and strings', () => {
  const all = ['players', 'courses', 'rounds'];
  assert.deepEqual(tablesUsed(all, 'SELECT * FROM players'), ['players']);
  assert.deepEqual(tablesUsed(all, "SELECT 'courses' -- rounds\nFROM players p JOIN rounds r"), ['players', 'rounds']);
});

test('tournament hole, nothing run yet: sections in order, background, only the tables it uses', () => {
  const hole = holes[2]; // WHERE on players
  const md = buildContext(holeCtx(hole, 3));
  assert.ok(md.startsWith(CONTEXT_FRAMING));
  assert.deepEqual(headings(md), ['Where I am', 'The problem', 'Background', 'The schema', 'My current code', 'My last run', 'My progress on this problem']);
  assert.match(md, /- \*\*SQL Basics, hole 3 of 18\*\*\n- Problem: \*\*Find the fairway: WHERE\*\* \(par 1\)/);
  assert.ok(!md.includes('Topics:'), 'holes have no topic tags');
  assert.match(md, /### players \(16 rows\)\n\n```sql\nCREATE TABLE players/);
  assert.ok(!md.includes('### courses') && !md.includes('### rounds'), 'only tables the problem uses');
  assert.equal((md.match(/\| Ava Birdwell|\| Mateo Fairway|\| Kenji Sato/g) ?? []).length, 3, '3 sample rows');
  assert.match(md, /## My current code\n\n\(The editor is empty\.\)/);
  assert.match(md, /## My last run\n\nNo run yet\./);
  assert.match(md, /Yardage book note:/);
  assert.ok(!md.includes(hole.solution), 'no pro solution');
});

test('range problem with a syntax error: Driving Range location, tags, no background, the exact error', () => {
  const p = rangeProblems.find((x) => x.id === 'busiest-courses');
  const code = 'SELEC name FROM courses';
  let error;
  try { run(code); } catch (e) { error = e.message; }
  const md = buildContext(rangeCtx(p, { code, lastRun: { kind: 'error', message: error, result: null } }));
  assert.match(md, /- \*\*Driving Range \(SQL Basics problems\)\*\*/);
  assert.match(md, /- Topics: JOIN, GROUP BY, HAVING, ORDER BY/);
  assert.ok(!headings(md).includes('Background'));
  assert.match(md, /```sql\nSELEC name FROM courses\n```/);
  assert.match(md, /\*\*Status:\*\* Error\n\nError message:\n\n```\nnear "SELEC": syntax error\n```/);
  assert.ok(md.includes('### courses') && md.includes('### rounds') && !md.includes('### players'));
});

test('wrong answer with a long, wide result: feedback, all columns, 15 of N rows, cut cells', () => {
  const p = rangeProblems.find((x) => x.id === 'tee-to-green');
  const code = 'SELECT * FROM rounds r JOIN players p USING (player_id) JOIN courses c USING (course_id)';
  const result = run(code);
  result.rows[0][1] = 'A very long value that goes on and on for well over forty characters';
  const md = buildContext(rangeCtx(p, { code, lastRun: { kind: 'wrong', message: 'Stroke 1: not in the hole yet. Expected 4 columns, but got 18.', result } }));
  assert.match(md, /\*\*Status:\*\* Submitted: not correct yet\n\nFeedback I was shown: Stroke 1: not in the hole yet\. Expected 4 columns, but got 18\./);
  assert.match(md, new RegExp(`Rows: ${result.rows.length} \\(showing 15 of ${result.rows.length} rows\\)`));
  const table = md.slice(md.indexOf('## My last run')).split('\n').filter((l) => l.startsWith('|'));
  assert.equal(table.length, 2 + CONTEXT_LIMITS.resultRows);
  assert.equal(table[0].split(' | ').length, 18, 'every column kept');
  assert.ok(table[2].includes(`${'A very long value that goes on and on f'}…`));
  assert.ok(!md.includes(p.solution));
});

test('correct answer and a practice run report their status; zero rows say so', () => {
  const p = rangeProblems.find((x) => x.id === 'championship-length');
  const correct = buildContext(rangeCtx(p, { code: p.solution, lastRun: { kind: 'correct', message: 'Birdie! Solved in 2.', result: run(p.solution) } }));
  assert.match(correct, /\*\*Status:\*\* Submitted: correct\n\nFeedback I was shown: Birdie! Solved in 2\.\n\nColumns: name, yardage\nRows: 3\n/);
  const none = buildContext(rangeCtx(p, { code: 'SELECT name FROM courses WHERE 0', lastRun: { kind: 'practice', message: '', result: run('SELECT name FROM courses WHERE 0') } }));
  assert.match(none, /\*\*Status:\*\* Ran it \(practice run, not checked against the answer\)\n\nColumns: name\nRows: 0/);
});

test('the pro solution only appears when passed in (unlocked and toggled on)', () => {
  const p = rangeProblems.find((x) => x.id === 'pro-am-gap');
  const without = buildContext(rangeCtx(p, { code: 'SELECT 1' }));
  assert.ok(!without.includes('Reference solution') && !without.includes('amateur_avg'));
  const withIt = buildContext(rangeCtx(p, { code: 'SELECT 1', solution: p.solution }));
  assert.equal(headings(withIt).at(-1), 'Reference solution');
  assert.ok(withIt.includes(`\`\`\`sql\n${p.solution}\n\`\`\``));
});

test('progress: attempts, strokes versus par, hints', () => {
  const p = rangeProblems[0];
  const md = buildContext(rangeCtx(p, { progress: { attempts: 4, strokes: 5, par: 2, hintsUsed: '1 on this attempt, 2 in total', solved: false, best: 2 } }));
  assert.match(md, /- Attempts \(submissions\) so far: 4\n- Strokes so far: 5 \(par 2\)\n- Hints used: 1 on this attempt, 2 in total\n- Best solve: 2 strokes/);
  const solved = buildContext(rangeCtx(p, { progress: { attempts: 1, strokes: 1, par: 2, hintsUsed: 0, solved: true, best: 1 } }));
  assert.match(solved, /- Strokes: 1 on a par 2 \(1 under par\), solved/);
  const level = buildContext(rangeCtx(p, { progress: { attempts: 1, strokes: 1, par: 1, hintsUsed: 0, solved: true, best: 1 } }));
  assert.match(level, /- Strokes: 1 on a par 1 \(level with par\), solved/);
  const fresh = buildContext(rangeCtx(p));
  assert.match(fresh, /- Strokes so far: 0 \(par 1\)/);
});

test('a problem type without a builder falls back to title, task, code, and feedback', () => {
  const ctx = { ...rangeCtx(rangeProblems[0]), engine: 'r', code: 'print(1)', data: {},
    lastRun: { kind: 'wrong', message: 'Expected 3, got 1', result: null } };
  const md = buildContext(ctx);
  assert.equal(md, buildFallbackContext(ctx));
  assert.deepEqual(headings(md), ['Where I am', 'The problem', 'My current code', 'My last run']);
  assert.match(md, /```r\nprint\(1\)\n```/);
  assert.match(md, /Feedback I was shown: Expected 3, got 1/);
});

// ---------- Python ----------

const pyChecker = {
  type: 'function',
  function: 'best_round',
  noMutation: true,
  cases: [{ args: '[72, 68]' }, { args: '[70]' }, { args: '[71, 71]' },
    { args: '[]', hidden: true, label: 'empty' }, { args: '[-1]', hidden: true, label: 'negative' }, { args: '[5, 5]', hidden: true, label: 'dupes' }],
};
const pyCtx = (extra = {}) => ({
  engine: 'python',
  location: { kind: 'hole', tournament: 'Python Fundamentals', hole: 4, holes: 18 },
  title: 'Best round',
  par: 1,
  tags: [],
  task: '<p>Write <code>def best_round(scores)</code>. Don\'t modify the list.</p>',
  background: { lesson: '<p>Use <code>min</code>.</p><pre>min([3, 1])</pre>', note: 'Scores are integers.' },
  code: 'def best_round(scores):\n    return min(scores)',
  lastRun: null,
  progress: { attempts: 1, strokes: 1, par: 1, hintsUsed: 0, solved: false },
  solution: null,
  data: { checker: pyChecker, packages: [] },
  ...extra,
});

test('Python: sections in order, python fences, how it is checked', () => {
  const md = buildContext(pyCtx());
  assert.deepEqual(headings(md), ['Where I am', 'The problem', 'Background', 'How it\'s checked', 'My current code', 'My last run', 'My progress on this problem']);
  assert.match(md, /```python\ndef best_round\(scores\):\n    return min\(scores\)\n```/);
  assert.match(md, /```python\nmin\(\[3, 1\]\)\n```/);
  assert.match(md, /must define the function `best_round`/);
  assert.match(md, /must not modify its input/);
  assert.match(md, /3 example tests and 3 hidden tests/);
});

test('Python Run: printed output, the last value, and the trimmed error', () => {
  const md = buildContext(pyCtx({
    lastRun: {
      kind: 'error',
      message: 'Traceback (most recent call last):\n  Line 2, in best_round()\n    return min(scores)\nValueError: min() iterable argument is empty',
      result: { stdout: 'checking\n', stderr: '', truncated: false, value: null, error: { type: 'ValueError' } },
    },
  }));
  assert.match(md, /\*\*Status:\*\* Error/);
  assert.match(md, /Line 2, in best_round\(\)\n {4}return min\(scores\)\nValueError/);
  assert.match(md, /Printed output:\n\n```\nchecking\n```/);
  const practice = buildContext(pyCtx({ lastRun: { kind: 'practice', message: '', result: { stdout: '', stderr: '', truncated: false, value: { repr: '[1, 2]', type: 'list' }, error: null } } }));
  assert.match(practice, /Printed output: \(nothing\)/);
  assert.match(practice, /Value of the last line \(list\):\n\n```\n\[1, 2\]\n```/);
});

test('Python Submit: examples in full, hidden tests pass/fail with only the first failing input, never their values', async () => {
  const { getPython } = await import('./helpers.mjs');
  const { summarize } = await import('../js/lib/python-engine.js');
  const py = await getPython();
  py.prepare('ctx-best', 'def best_round(scores):\n    return min(scores) if scores else None', pyChecker);
  const tests = py.check('ctx-best', 'def best_round(scores):\n    return min(scores) if len(scores) > 1 else 0', pyChecker);
  const md = buildContext(pyCtx({ lastRun: { kind: 'wrong', message: 'Stroke 1: not in the hole yet.', result: { tests, summary: summarize(tests) } } }));
  assert.match(md, /Tests: 3 of 6 passed \(2 of 3 examples, 1 of 3 hidden\)/);
  assert.match(md, /- Example 2: FAIL\n {2}- Input: `best_round\(\[70\]\)`\n {2}- Expected: `70`\n {2}- Got: `0`/);
  assert.match(md, /- Hidden test 1: FAIL on input `best_round\(\[\]\)`/);
  assert.match(md, /- Hidden test 2: FAIL\n- Hidden test 3: PASS/);
  assert.doesNotMatch(md, /best_round\(\[-1\]\)/, 'only the first failing hidden input is shown');
  assert.doesNotMatch(md, /if scores else None/, 'no solution unless passed in');
});

test('Python: a timeout says so; the solution appears only when passed in', () => {
  assert.match(buildContext(pyCtx({ lastRun: { kind: 'error', message: 'Your code ran too long', result: { timedOut: true } } })), /stopped because it took too long/);
  assert.doesNotMatch(buildContext(pyCtx()), /Reference solution/);
  assert.match(buildContext(pyCtx({ solution: 'def best_round(s):\n    return min(s)' })), /## Reference solution\n\n```python\ndef best_round/);
});

test('Python: long printed output is clipped', () => {
  const md = buildContext(pyCtx({ lastRun: { kind: 'practice', message: '', result: { stdout: 'x'.repeat(5000), stderr: '', truncated: true, value: null, error: null } } }));
  assert.match(md, new RegExp(`… \\(${5000 - CONTEXT_LIMITS.outputChars} more characters not shown\\)`));
  assert.match(md, /cut off by the runner/);
});

// ---------- pandas ----------

const pandasChecker = {
  type: 'dataframe', function: 'best_rounds', frames: ['rounds'], returns: 'DataFrame', rowOrder: 'require', index: 'ignore',
  cases: [{ args: '3' }, { data: 'alt', args: '3', hidden: true, label: 'other data' }, { args: '1', hidden: true, label: 'n = 1' }],
};
const PANDAS_SOLUTION = "def best_rounds(rounds, n):\n    return rounds.sort_values(['score', 'round_id']).head(n)[['round_id', 'score']]";
const pandasCtx = async (extra = {}) => {
  const { getPandas } = await import('./helpers.mjs');
  const { py, dataset } = await getPandas();
  return {
    py,
    dataset,
    ctx: {
      engine: 'pandas',
      location: { kind: 'hole', tournament: 'pandas Wrangling', hole: 4, holes: 18 },
      title: 'Top rounds',
      par: 1,
      tags: [],
      task: '<p>Write <code>def best_rounds(rounds, n)</code>.</p>',
      background: { lesson: '<p>Sort.</p><pre>df.sort_values("x")</pre>', note: 'SQL equivalent: ORDER BY' },
      code: 'def best_rounds(rounds, n):\n    return rounds.head(n)',
      lastRun: null,
      progress: { attempts: 1, strokes: 1, par: 1, hintsUsed: 0, solved: false },
      solution: null,
      data: { checker: pandasChecker, packages: ['pandas'], tables: ['rounds'], frames: py.describeFrames(dataset, 'main', ['rounds']) },
      ...extra,
    },
  };
};

test('pandas: DataFrame schemas with 3 sample rows, how it is checked, in order', async () => {
  const { ctx } = await pandasCtx();
  const md = buildContext(ctx);
  assert.deepEqual(headings(md), ['Where I am', 'The problem', 'Background', 'The DataFrames', 'How it\'s checked', 'My current code', 'My last run', 'My progress on this problem']);
  assert.match(md, /### rounds \(221 rows x 8 columns\)/);
  assert.match(md, /- `played_on`: str\n/);
  assert.match(md, /- `putts`: float64, \d+ missing/);
  const sample = md.split('Sample rows:\n\n')[1].split('\n\n')[0].split('\n');
  assert.equal(sample.length, 2 + 3, 'header, rule, and 3 sample rows');
  assert.match(md, /calls `best_rounds\(rounds, 3\)`.*a DataFrame/);
  assert.match(md, /Row order is graded\. The index is ignored\./);
  assert.match(md, /1 visible test.*2 hidden tests/);
  assert.doesNotMatch(md, /## Reference solution/);
});

test('pandas Run: printed output and the returned DataFrame as a Markdown table (first 15 rows)', async () => {
  const { py, dataset, ctx } = await pandasCtx();
  const result = py.runFrames('print(len(rounds))\nrounds', { dataset, variant: 'main', frames: ['rounds'] });
  const md = buildContext({ ...ctx, lastRun: { kind: 'practice', message: '', result } });
  assert.match(md, /Printed output:\n\n```\n221\n```/);
  assert.match(md, /Value of the last line \(DataFrame\): 221 rows x 8 columns \(first 15 shown\):/);
  const table = md.split('(first 15 shown):\n\n')[1].split('\n\n')[0].split('\n');
  assert.equal(table.length, 2 + 15);
  assert.match(table[0], /^\| \(index\) \| round_id \| player_id/);
  assert.match(md, /\| NaN \|/, 'missing values copied as NaN');
});

test('pandas Submit: visible feedback with differing rows; hidden tests only pass/fail and the kind', async () => {
  const { py, dataset, ctx } = await pandasCtx();
  const { summarize } = await import('../js/lib/python-engine.js');
  const checker = { ...pandasChecker, dataset };
  py.prepare('ctx-pandas', PANDAS_SOLUTION, checker);
  const tests = py.check('ctx-pandas', "def best_rounds(rounds, n):\n    return rounds.sort_values('score', ascending=False).head(n)[['round_id', 'score']]", checker);
  const summary = summarize(tests);
  const md = buildContext({ ...ctx, lastRun: { kind: 'wrong', message: 'Not yet', result: { tests, summary } } });
  assert.match(md, /Tests: 0 of 3 passed \(0 of 1 visible, 0 of 2 hidden\)/);
  assert.match(md, /- Visible test \(`best_rounds\(rounds, 3\)`\): FAIL\. 3 of 3 rows differ/);
  assert.match(md, /\| row 1 expected \|/);
  assert.match(md, /- Hidden test 1: FAIL\. Some values don't match\.\n- Hidden test 2: FAIL\. Some values don't match\./);
  // The full expected table is never copied: only the differing rows the page shows.
  const expected = py.prepare('ctx-pandas-2', PANDAS_SOLUTION, checker);
  assert.equal(expected[1].table.rowCount, 3);
  assert.doesNotMatch(md, /Expected result/);
});

test('pandas: the solution appears only when passed in; a missing data panel is noted', async () => {
  const { ctx } = await pandasCtx();
  assert.match(buildContext({ ...ctx, solution: PANDAS_SOLUTION }), /## Reference solution\n\n```python\ndef best_rounds/);
  assert.match(buildContext({ ...ctx, data: { ...ctx.data, frames: null } }), /weren't loaded yet/);
});
