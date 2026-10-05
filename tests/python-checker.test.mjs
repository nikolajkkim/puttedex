// The Python checkers (function tests, stdout match, value check) on the real vendored Pyodide, with made-up items:
// what a learner sees for visible and hidden cases, mutation detection, and the comparison rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPython } from './helpers.mjs';
import { summarize } from '../js/lib/python-engine.js';

const py = await getPython();

const fn = {
  type: 'function',
  function: 'best_round',
  noMutation: true,
  cases: [
    { args: '[72, 68, 75]' }, { args: '[70]' }, { args: '[71, 71]' },
    { args: '[]', hidden: true, label: 'empty' }, { args: '[-2, 3]', hidden: true }, { args: '[5, 5, 1]', hidden: true },
  ],
};
const SOLUTION = 'def best_round(scores):\n    return min(scores) if scores else None';
const expected = py.prepare('fn', SOLUTION, fn);
const check = (code, checker = fn, key = 'fn') => {
  const report = py.check(key, code, checker);
  return { report, s: summarize(report) };
};

test('expected values come from the reference solution', () => {
  assert.deepEqual(expected, ['68', '70', '71', 'None', '-2', '1']);
});

test('the reference solution passes; a loop written differently passes too', () => {
  assert.equal(check(SOLUTION).s.ok, true);
  assert.equal(check('def best_round(scores):\n    best = None\n    for s in scores:\n'
    + '        if best is None or s < best:\n            best = s\n    return best').s.ok, true);
});

test('visible cases show input, expected, and got; hidden cases show neither value', () => {
  const { report, s } = check('def best_round(scores):\n    return min(scores)');
  const [first] = report.cases;
  assert.deepEqual([first.input, first.expected, first.got, first.ok], ['best_round([72, 68, 75])', '68', '68', true]);
  const hidden = report.cases.filter((c) => !c.visible);
  assert.ok(hidden.every((c) => c.expected === null && c.got === null));
  assert.equal(s.ok, false);
  assert.deepEqual(s.visible, { passed: 3, total: 3 });
  assert.equal(s.firstHiddenFailure.input, 'best_round([])');
  assert.equal(s.firstHiddenFailure.reason, 'error');
});

test('mutating the input fails clearly', () => {
  const { report } = check('def best_round(scores):\n    scores.sort()\n    return scores[0] if scores else None');
  assert.equal(report.cases[0].reason, 'mutated');
  assert.match(report.cases[0].message, /changed its input/);
});

test('a missing function, a syntax error, and an exception are failures with readable messages', () => {
  assert.match(check('def best(scores):\n    return 1').report.cases[0].message, /doesn't define a function named best_round/);
  const syntax = check('def best_round(scores)\n    return 1').report;
  assert.equal(syntax.error.type, 'SyntaxError');
  assert.ok(syntax.cases.every((c) => !c.ok));
  const raised = check('def best_round(scores):\n    return scores[10]').report.cases[0];
  assert.equal(raised.reason, 'error');
  assert.match(raised.traceback, /Line 2, in best_round\(\)/);
});

test('state never leaks between cases: each case gets a fresh namespace and fresh arguments', () => {
  const code = 'calls = []\ndef best_round(scores):\n    calls.append(1)\n    return len(calls) if scores else None';
  // If the namespace leaked, the second case would return 2.
  assert.equal(check(code).report.cases[1].got, '1');
});

test('comparison: floats within tolerance, bool is not int, list is not tuple, dict subclasses equal dicts', () => {
  const c = { type: 'function', function: 'f', cases: [{ args: '' }] };
  const run = (solution, code) => {
    py.prepare('cmp', solution, c);
    return py.check('cmp', code, c).cases[0];
  };
  assert.equal(run('def f():\n    return 0.3', 'def f():\n    return 0.1 + 0.2').ok, true);
  assert.equal(run('def f():\n    return 1', 'def f():\n    return True').ok, false);
  const tuple = run('def f():\n    return (1, 2)', 'def f():\n    return [1, 2]');
  assert.equal(tuple.ok, false);
  assert.match(tuple.message, /expected a tuple, got a list/);
  assert.equal(run('def f():\n    return {"a": 2}', 'from collections import Counter\ndef f():\n    return Counter("aa")').ok, true);
  assert.equal(run('def f():\n    return 68', 'def f():\n    return 68.0').ok, true);
});

test("compare: 'unordered' ignores the order of a returned list", () => {
  const c = { type: 'function', function: 'f', compare: 'unordered', cases: [{ args: '' }] };
  py.prepare('unordered', 'def f():\n    return ["a", "b"]', c);
  assert.equal(py.check('unordered', 'def f():\n    return ["b", "a"]', c).cases[0].ok, true);
});

test('stdout checker: compares printed output, ignoring trailing whitespace', () => {
  const c = { type: 'stdout', cases: [{ setup: "name = 'Ava'" }, { setup: "name = 'Bo'", hidden: true }] };
  py.prepare('out', 'print(f"Hello, {name}!")', c);
  assert.equal(summarize(py.check('out', 'print("Hello, " + name + "!   ")\nprint()', c)).ok, true);
  const wrong = py.check('out', 'print("Hello", name)', c).cases[0];
  assert.deepEqual([wrong.expected, wrong.got, wrong.ok], ['Hello, Ava!', 'Hello Ava', false]);
});

test('value checker: compares a named variable', () => {
  const c = { type: 'value', variable: 'total', cases: [{ setup: 'scores = [1, 2]' }, { setup: 'scores = []', hidden: true }] };
  py.prepare('val', 'total = sum(scores)', c);
  assert.equal(summarize(py.check('val', 'total = 0\nfor s in scores:\n    total += s', c)).ok, true);
  assert.match(py.check('val', 'totl = sum(scores)', c).cases[0].message, /doesn't create a variable named total/);
});

test('a reference solution that fails a case is an authoring error', () => {
  assert.throws(() => py.prepare('bad', 'def best_round(s):\n    return min(s)', fn), /reference solution fails on best_round\(\[\]\)/);
});
