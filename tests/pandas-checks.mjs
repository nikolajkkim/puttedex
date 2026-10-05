// Checks shared by every graded pandas item (tournament holes and Driving Range problems), run on the real vendored
// Pyodide with pandas, through the same engine and DataFrame checker the browser's worker uses.
import { summarize } from '../js/lib/python-engine.js';

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plainText = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
const RETURNS = { DataFrame: /\bDataFrame\b/, Series: /\bSeries\b/, scalar: /\b(number|value|float|int|integer|count|string)\b/i };
const OPTIONS = {
  returns: ['DataFrame', 'Series', 'scalar'],
  rowOrder: ['require', 'ignore'],
  index: ['require', 'ignore'],
  columnOrder: ['require', 'ignore'],
  dtypes: ['values', 'match'],
};
// Row-by-row Python is the wrong tool in pandas: the pro's line and accepted alternatives stay vectorized.
const LOOPS = /^\s*(for|while)\s|\.iterrows\(|\.itertuples\(|apply\([^)]*axis\s*=\s*1/m;

/**
 * Everything a graded pandas item must satisfy: a well-formed 'dataframe' checker (every option spelled out, at
 * least one visible case and three labeled hidden ones, one of them on the hidden data variant so hardcoded answers
 * fail), a task that states the exact signature and the return type, a yardage note with the SQL equivalent, a
 * multi-line vectorized pro solution that passes, accepted alternatives, and mistakes that fail (at least one only on
 * hidden cases). Returns the expected values (display form) for reporting.
 */
export function checkGradedFrames(assert, py, item, { key, dataset, frames, html = '', yardage = null }) {
  const checker = item.checker;
  assert.equal(checker.type, 'dataframe', 'pandas items use the dataframe checker');
  for (const [option, allowed] of Object.entries(OPTIONS)) {
    assert.ok(allowed.includes(checker[option]), `checker.${option} is spelled out: one of ${allowed.join(', ')}`);
  }
  if (checker.rowOrder === 'ignore') assert.ok(Array.isArray(checker.sortBy) && checker.sortBy.length > 0, 'rowOrder ignore names sortBy keys');
  assert.ok(Array.isArray(checker.frames) && checker.frames.length > 0, 'checker.frames lists the DataFrames passed in');
  for (const name of checker.frames) assert.ok(name in frames.tables, `${name} is a table of the dataset`);
  const visible = checker.cases.filter((c) => !c.hidden);
  const hidden = checker.cases.filter((c) => c.hidden);
  assert.ok(visible.length >= 1, 'at least 1 visible case');
  assert.ok(hidden.length >= 3, `at least 3 hidden cases (has ${hidden.length})`);
  assert.ok(hidden.every((c) => c.label), 'every hidden case has a label saying which edge case it covers');
  assert.ok(visible.every((c) => (c.data ?? frames.visible) === frames.visible), 'visible cases use the visible data');
  assert.ok(hidden.some((c) => c.data && c.data !== frames.visible), 'a hidden case runs on another variant of the data');
  for (const c of checker.cases) if (c.data) assert.ok(frames.variants.includes(c.data), `data variant ${c.data} exists`);

  // The pro's line: multi-line, one chained step per line, 4-space indents, short enough to read; vectorized.
  assert.equal(item.solution, item.solution.trim(), 'solution has no leading/trailing whitespace');
  assert.ok(item.solution.split('\n').length >= 3, 'the pro solution spans several lines (one chained step per line)');
  assert.doesNotMatch(item.solution, /\t/, 'indent with spaces, not tabs');
  for (const line of item.solution.split('\n')) assert.equal(line.match(/^ */)[0].length % 4, 0, `4-space indentation: ${line}`);
  const examples = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((m) => decode(m[1]));
  for (const line of [item.solution, ...examples].flatMap((s) => s.split('\n'))) {
    assert.ok(line.length <= 80, `line is ${line.length} characters (max 80); wrap it: ${line}`);
  }
  for (const code of [item.solution, ...(item.alternatives ?? [])]) {
    assert.doesNotMatch(code, LOOPS, `no row-by-row loops in the pro's line or accepted alternatives: ${code}`);
    assert.doesNotMatch(code, /^\s*(import|from)\s+(pandas|numpy)\b/m, 'pd and np are already imported');
  }

  // The task names exactly what the checker grades.
  const task = plainText(item.task);
  const def = item.solution.match(new RegExp(`^def (${checker.function})\\(([^)]*)\\):`, 'm'));
  assert.ok(def, `the solution defines ${checker.function}()`);
  assert.ok(task.includes(`def ${def[1]}(${def[2]})`), `the task states the signature: def ${def[1]}(${def[2]})`);
  const params = def[2].split(',').map((s) => s.trim().split('=')[0]);
  assert.deepEqual(params.slice(0, checker.frames.length), checker.frames, 'the DataFrame parameters come first, named like the tables');
  assert.match(task, RETURNS[checker.returns], `the task says it returns a ${checker.returns}`);
  if (yardage !== null) assert.match(plainText(yardage), /SQL equivalent:/, 'the yardage note shows the SQL equivalent');

  const expected = py.prepare(key, item.solution, { ...checker, dataset });
  checker.cases.forEach((c, i) => {
    const kind = expected[i].type === 'DataFrame' || expected[i].type === 'Series' ? expected[i].type : 'scalar';
    assert.equal(kind, checker.returns, `case ${i + 1}: the solution returns a ${checker.returns}`);
  });
  const alt = checker.cases.findIndex((c) => c.hidden && c.data && c.data !== frames.visible);
  assert.notDeepEqual(expected[alt], expected[checker.cases.indexOf(visible[0])], 'the hidden variant has a different answer');

  const grade = (code) => summarize(py.check(key, code, { ...checker, dataset }));
  assert.ok(grade(item.solution).ok, 'solution passes');
  assert.equal(grade('').ok, false, 'a blank editor does not pass');
  assert.ok(item.alternatives?.length > 0, 'declares at least one alternative correct answer');
  for (const other of item.alternatives) {
    const s = grade(other);
    assert.ok(s.ok, `alternative is accepted (${s.all.passed}/${s.all.total}): ${other}`);
  }
  assert.ok(item.mistakes?.length > 0, 'declares at least one common mistake');
  const results = item.mistakes.map((m) => ({ code: m, s: grade(m) }));
  for (const { code, s } of results) {
    assert.equal(s.ok, false, `mistake is rejected: ${code}`);
    assert.ok(s.hidden.passed < s.hidden.total, `mistake fails at least one hidden case: ${code}`);
  }
  assert.ok(results.some(({ s }) => s.visible.passed === s.visible.total),
    'some mistake passes the visible data but fails a hidden case (so the hidden cases matter)');
  return expected;
}
