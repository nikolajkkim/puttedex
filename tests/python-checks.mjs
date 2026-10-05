// Checks shared by every graded Python item (tournament holes and Driving Range problems), run on the real vendored
// Pyodide through the same engine the browser's worker uses.
import { summarize } from '../js/lib/python-engine.js';
import { TOURNAMENTS } from '../js/tournaments.js';

const PANDAS_INDEX = TOURNAMENTS.findIndex((t) => t.id === 'pandas'); // pandas and NumPy are taught from here on
const LIBRARIES = /^\s*(import|from)\s+(pandas|numpy)\b/m;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plainText = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');

/**
 * Everything a graded Python item must satisfy: a well-formed checker with at least 3 visible and 3 hidden cases,
 * a task that states the exact function signature (or variable / printed output), a pro solution that passes and is
 * laid out for display, accepted alternatives, and mistakes that fail, at least one of them only on hidden cases.
 * Returns the expected values (display strings) for reporting.
 */
export function checkGradedPython(assert, py, item, { key, tournamentId, html = '' }) {
  const tournamentIndex = TOURNAMENTS.findIndex((t) => t.id === tournamentId);
  const checker = item.checker;
  assert.ok(checker && ['function', 'stdout', 'value'].includes(checker.type), 'checker.type is function, stdout, or value');
  const visible = checker.cases.filter((c) => !c.hidden);
  const hidden = checker.cases.filter((c) => c.hidden);
  assert.ok(visible.length >= 3, `at least 3 visible cases (has ${visible.length})`);
  assert.ok(hidden.length >= 3, `at least 3 hidden cases (has ${hidden.length})`);
  assert.ok(hidden.every((c) => c.label), 'every hidden case has a label saying which edge case it covers');
  for (const c of checker.cases) {
    if (checker.type === 'function') assert.equal(typeof c.args, 'string', 'function cases give args as Python source');
    else assert.equal(typeof c.setup, 'string', 'stdout and value cases give setup as Python source');
  }
  if (item.packages) assert.ok(Array.isArray(item.packages), 'packages is a list of Pyodide package names');

  // The pro's line: multi-line, 4-space indents, and short enough to read without sideways scrolling.
  assert.equal(item.solution, item.solution.trim(), 'solution has no leading/trailing whitespace');
  assert.ok(item.solution.includes('\n'), 'the pro solution spans several lines');
  assert.doesNotMatch(item.solution, /\t/, 'indent with spaces, not tabs');
  for (const line of item.solution.split('\n')) {
    const indent = line.match(/^ */)[0].length;
    assert.equal(indent % 4, 0, `4-space indentation: ${line}`);
  }
  const examples = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((m) => decode(m[1]));
  for (const line of [item.solution, ...examples].flatMap((s) => s.split('\n'))) {
    assert.ok(line.length <= 80, `line is ${line.length} characters (max 80); wrap it: ${line}`);
  }

  // The task names exactly what the checker grades.
  const task = plainText(item.task);
  if (checker.type === 'function') {
    const def = item.solution.match(new RegExp(`^def (${checker.function})\\(([^)]*)\\):`, 'm'));
    assert.ok(def, `the solution defines ${checker.function}()`);
    assert.ok(task.includes(`def ${def[1]}(${def[2]})`), `the task states the signature: def ${def[1]}(${def[2]})`);
  } else if (checker.type === 'value') {
    assert.ok(new RegExp(`\\b${checker.variable}\\b`).test(task), `the task names the variable ${checker.variable}`);
  } else {
    assert.match(task, /\bprint/i, 'the task says what to print');
  }
  if (checker.noMutation) assert.match(task, /modify|change/i, 'noMutation: the task says not to modify the input');

  if (tournamentIndex < PANDAS_INDEX) {
    for (const code of [item.solution, ...(item.alternatives ?? [])]) {
      assert.doesNotMatch(code, LIBRARIES, 'pandas and NumPy belong to the pandas tournament');
    }
  }

  const expected = py.prepare(key, item.solution, checker);
  checker.cases.forEach((c, i) => {
    if ('expected' in c) assert.equal(expected[i], c.expected, `case ${i + 1}: the solution's result matches the declared expected value`);
  });
  const grade = (code) => summarize(py.check(key, code, checker));
  assert.ok(grade(item.solution).ok, 'solution passes');
  assert.equal(grade('').ok, false, 'a blank editor does not pass');

  assert.ok(item.alternatives?.length > 0, 'declares at least one alternative correct answer');
  for (const other of item.alternatives) {
    const s = grade(other);
    assert.ok(s.ok, `alternative is accepted (${s.all.passed}/${s.all.total}): ${other}`);
  }
  assert.ok(item.mistakes?.length > 0, 'declares at least one common mistake');
  const results = item.mistakes.map((m) => ({ code: m, report: py.check(key, m, checker) }));
  for (const { code, report } of results) {
    const s = summarize(report);
    assert.equal(s.ok, false, `mistake is rejected: ${code}`);
    assert.ok(s.hidden.passed < s.hidden.total, `mistake fails at least one hidden case: ${code}`);
  }
  assert.ok(results.some(({ report }) => summarize(report).visible.passed === visible.length),
    'some mistake passes every example but fails a hidden case (so the hidden cases matter)');
  if (checker.noMutation) {
    assert.ok(results.some(({ report }) => report.cases.some((c) => c.reason === 'mutated')),
      'noMutation: declares a mistake that modifies its input');
  }
  return expected;
}
