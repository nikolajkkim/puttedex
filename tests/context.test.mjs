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

const SQL = await getSql();
const holes = (await import('../js/data/holes/sql-basics.js')).default;
const rangeProblems = (await import('../js/data/range/sql-basics.js')).default;

const holeCtx = (hole, n, extra = {}) => ({
  engine: 'sql',
  location: { kind: 'hole', tournament: 'SQL Basics', hole: n, holes: 18 },
  title: hole.title,
  par: hole.par,
  tags: [],
  task: hole.task,
  background: { lesson: hole.lesson, note: hole.yardage },
  code: '',
  lastRun: null,
  progress: { attempts: 0, strokes: 0, par: hole.par, hintsUsed: 0, solved: false },
  solution: null,
  data: { SQL, seed: SEED, referenceSql: hole.solution },
  ...extra,
});
const rangeCtx = (p, extra = {}) => ({
  ...holeCtx(p, 0),
  location: { kind: 'range', tournament: 'SQL Basics' },
  tags: p.tags,
  background: null,
  progress: { attempts: 0, strokes: 0, par: p.par, hintsUsed: '0 on this attempt, 0 in total', solved: false, best: null },
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
  assert.match(md, /- \*\*SQL Basics, hole 3 of 18\*\*\n- Problem: \*\*Find the fairway: WHERE\*\* \(par 2\)/);
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
  assert.match(md, /Rows: 54 \(showing 15 of 54 rows\)/);
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
  const md = buildContext(rangeCtx(p, { progress: { attempts: 4, strokes: 5, par: 3, hintsUsed: '1 on this attempt, 2 in total', solved: false, best: 3 } }));
  assert.match(md, /- Attempts \(submissions\) so far: 4\n- Strokes so far: 5 \(par 3\)\n- Hints used: 1 on this attempt, 2 in total\n- Best solve: 3 strokes/);
  const solved = buildContext(rangeCtx(p, { progress: { attempts: 2, strokes: 2, par: 3, hintsUsed: 0, solved: true, best: 2 } }));
  assert.match(solved, /- Strokes: 2 on a par 3 \(1 under par\), solved/);
  const fresh = buildContext(rangeCtx(p));
  assert.match(fresh, /- Strokes so far: 0 \(par 3\)/);
});

test('a problem type without a builder falls back to title, task, code, and feedback', () => {
  const ctx = { ...rangeCtx(rangeProblems[0]), engine: 'python', code: 'print(1)', data: {},
    lastRun: { kind: 'wrong', message: 'Expected 3, got 1', result: null } };
  const md = buildContext(ctx);
  assert.equal(md, buildFallbackContext(ctx));
  assert.deepEqual(headings(md), ['Where I am', 'The problem', 'My current code', 'My last run']);
  assert.match(md, /```python\nprint\(1\)\n```/);
  assert.match(md, /Feedback I was shown: Expected 3, got 1/);
});
