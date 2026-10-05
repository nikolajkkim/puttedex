// The Python runner's engine (js/lib/python-engine.js + js/lib/python-harness.js) on the real vendored Pyodide:
// Run output, the last expression's value, trimmed errors, and isolation between runs. The worker's timeout and
// restart need a browser; they're covered by the manual browser check described in CLAUDE.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPython } from './helpers.mjs';
import { PYTHON } from '../js/data/python-config.js';

const py = await getPython();

test('runs code: printed output and the last expression, Jupyter-style', () => {
  const r = py.run('scores = [72, 68, 75]\nprint("best:", min(scores))\nsorted(scores)');
  assert.equal(r.stdout, 'best: 68\n');
  assert.deepEqual(r.value, { repr: '[68, 72, 75]', html: null, type: 'list' });
  assert.equal(r.error, null);
});

test('a last line that is None, an assignment, or a print shows no value', () => {
  for (const code of ['x = 1', 'print(1)', 'None', 'def f():\n    return 1']) assert.equal(py.run(code).value, null, code);
});

test('setup code defines inputs before the learner code runs', () => {
  assert.equal(py.run('print(player, score)', "player = 'Ava'\nscore = 70").stdout, 'Ava 70\n');
});

test('syntax errors: the line, a caret, and the message, nothing from the runner', () => {
  const { error } = py.run('for i in range(3)\n    print(i)');
  assert.equal(error.type, 'SyntaxError');
  assert.equal(error.line, 1);
  assert.match(error.summary, /^Line 1: SyntaxError: expected ':'/);
  assert.match(error.traceback, /for i in range\(3\)\n\s+\^/);
});

test('runtime errors: only the learner\'s own frames, with their source lines', () => {
  const { error } = py.run('def first(scores):\n    return scores[0]\n\nfirst([])');
  assert.equal(error.type, 'IndexError');
  assert.equal(error.line, 2);
  assert.equal(error.traceback, [
    'Traceback (most recent call last):',
    '  Line 4, in your code',
    '    first([])',
    '  Line 2, in first()',
    '    return scores[0]',
    'IndexError: list index out of range',
  ].join('\n'));
  assert.doesNotMatch(error.traceback, /File "|pyodide|harness|exec/);
});

test('deep recursion is summarized, not thousands of lines', () => {
  const { error } = py.run('def down(n):\n    return down(n + 1)\n\ndown(0)');
  assert.equal(error.type, 'RecursionError');
  assert.ok(error.traceback.split('\n').length < 20, error.traceback);
  assert.match(error.traceback, /more calls|Previous line repeated/);
});

test('KeyError messages show the missing key', () => {
  assert.equal(py.run("{'a': 1}['b']").error.summary, "Line 1: KeyError: 'b'");
});

test('every run starts from a clean namespace', () => {
  py.run('secret = 42');
  assert.equal(py.run('secret').error.type, 'NameError');
});

test('changes to builtins, streams, and the recursion limit are undone after each run', () => {
  py.run('import builtins, sys\nbuiltins.len = lambda x: 99\nbuiltins.extra = 1\nsys.setrecursionlimit(50)');
  const r = py.run('import sys\nprint(len([1, 2]), "extra" in dir(__builtins__))\nsys.getrecursionlimit() > 50');
  assert.equal(r.stdout, '2 False\n');
  assert.equal(r.value.repr, 'True');
});

test('input() explains that data comes from arguments or variables', () => {
  assert.match(py.run('name = input()').error.summary, /input\(\) isn't available here/);
});

test('exit() ends the run quietly', () => {
  const r = py.run('print("before")\nexit()\nprint("after")');
  assert.equal(r.stdout, 'before\n');
  assert.equal(r.error, null);
});

test('huge output is cut off at the limit and flagged', () => {
  const r = py.run('for i in range(100000):\n    print("fore!", i)');
  assert.equal(r.stdout.length, PYTHON.limits.output);
  assert.equal(r.truncated, true);
});

test('long values are shortened for display', () => {
  const r = py.run('list(range(100000))');
  assert.ok(r.value.repr.length <= PYTHON.limits.repr, r.value.repr.length);
  assert.match(r.value.repr, /\.\.\./);
});

test('a large input runs fine', () => {
  const r = py.run('scores = [70 + i % 15 for i in range(200000)]\nsum(scores) / len(scores)');
  assert.equal(r.error, null);
  assert.ok(Number(r.value.repr) > 70);
});

test('stderr is captured separately', () => {
  const r = py.run('import sys\nprint("careful", file=sys.stderr)');
  assert.equal(r.stderr, 'careful\n');
  assert.equal(r.stdout, '');
});
