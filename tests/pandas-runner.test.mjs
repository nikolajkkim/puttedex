// The pandas side of the Python runner (js/lib/pandas-harness.js) on the real vendored Pyodide with pandas: Run
// against the dataset's DataFrames, the data panel, fresh copies every run, and trimmed pandas errors. The worker's
// timeout and restart need a browser (see "Checking the Python runner by hand" in CLAUDE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPandas } from './helpers.mjs';

const { py, dataset } = await getPandas();
const run = (code, extra = {}) => py.runFrames(code, { dataset, variant: 'main', frames: ['rounds'], ...extra });

test('the vendored pandas and numpy are the versions Pyodide bundles', () => {
  const r = py.run('import pandas as pd, numpy as np\npd.__version__ + " " + np.__version__');
  assert.equal(r.value.repr, "'3.0.2 2.4.6'");
});

test('Run defines the tables, pd, and np, and shows a DataFrame as a table (first 20 rows)', () => {
  const r = run('print(rounds.shape)\nrounds');
  assert.equal(r.stdout, '(221, 8)\n');
  assert.equal(r.value.type, 'DataFrame');
  const t = r.value.table;
  assert.equal(t.rowCount, 221);
  assert.equal(t.rows.length, 20);
  assert.deepEqual(t.columns, ['round_id', 'player_id', 'course_id', 'played_on', 'score', 'putts', 'fairways_hit', 'weather']);
  assert.equal(t.defaultIndex, true);
  assert.ok(t.rows.some((row) => row.cells.some((c) => c?.na === 'NaN')), 'missing values are marked, not printed as text');
  assert.equal(run('np.mean([1, 2])').value.repr, '1.5');
});

test('a Series keeps its index; scalars from numpy show as plain numbers', () => {
  const s = run("rounds.groupby('course_id')['score'].max()").value;
  assert.equal(s.type, 'Series');
  assert.deepEqual(s.table.indexNames, ['course_id']);
  assert.equal(s.table.rows.length, 7);
  assert.equal(run("rounds['score'].max()").value.repr, '88');
});

test('when the code only defines the function, Run calls it on the visible data', () => {
  const r = run("def best(rounds, n):\n    return rounds.nsmallest(n, 'score')", { call: { function: 'best', args: '3' } });
  assert.equal(r.called, 'best(rounds, 3)');
  assert.equal(r.value.table.rowCount, 3);
  const none = run("def best(rounds, n):\n    rounds.sort_values('score', inplace=True)", { call: { function: 'best', args: '3' } });
  assert.equal(none.returnedNone, true);
  assert.equal(none.value, null);
});

test('every run gets fresh copies: changing a table never leaks into the next run', () => {
  run("rounds.drop(columns='score', inplace=True)\nrounds.loc[0, 'putts'] = -1");
  const r = run("('score' in rounds.columns, rounds.loc[0, 'putts'])");
  assert.match(r.value.repr, /^\(True, /);
  assert.doesNotMatch(r.value.repr, /-1/);
});

test('a case setup edits the tables before the code runs', () => {
  assert.equal(run('len(rounds)', { setup: 'rounds = rounds.iloc[:0]' }).value.repr, '0');
});

test('the data panel: shape, dtypes, missing counts, and 5 sample rows', () => {
  const [players, rounds] = py.describeFrames(dataset, 'main', ['players', 'rounds']);
  assert.equal(players.name, 'players');
  assert.deepEqual(rounds.shape, [221, 8]);
  const col = (f, name) => f.columns.find((c) => c.name === name);
  assert.equal(col(rounds, 'played_on').dtype, 'str', 'dates arrive as strings');
  assert.equal(col(players, 'home_course_id').dtype, 'float64', 'an id column with gaps arrives as float64');
  assert.ok(col(rounds, 'putts').missing > 0);
  assert.equal(rounds.sample.rows.length, 5);
});

test('errors show only the learner\'s lines, with a hint for a misspelled column', () => {
  const { error } = run("rounds['scor'].mean()");
  assert.equal(error.type, 'KeyError');
  assert.equal(error.summary, "Line 1: KeyError: 'scor'");
  assert.match(error.hint, /Did you mean 'score'/);
  assert.doesNotMatch(error.traceback, /pandas|site-packages|File "/);
});

test('the and/or mistake and the missing-parentheses mistake get hints', () => {
  assert.match(run("rounds[rounds.score < 75 and rounds.putts < 30]").error.hint, /& \(and\)/);
  assert.match(run("rounds[rounds.score < 75 & rounds.putts < 30]").error.hint, /parentheses/);
});

test('a long pandas error message is cut to its first lines', () => {
  const { error } = run("rounds.merge(rounds, on='nope')");
  assert.ok(error.message.length <= 301, error.message);
  assert.ok(error.traceback.split('\n').length < 12);
});

test('a very large result is shown as its first rows only', () => {
  const r = run('pd.DataFrame({"x": np.arange(1_000_000)})');
  assert.equal(r.value.table.rowCount, 1_000_000);
  assert.equal(r.value.table.rows.length, 20);
  assert.ok(JSON.stringify(r).length < 10_000);
});

test('pandas warnings are captured as stderr, not lost or crashing', () => {
  const r = run("rounds['score'][0] = 1");
  assert.equal(r.error, null);
  assert.match(r.stderr, /ChainedAssignmentError/);
  assert.equal(run("rounds['score'][0] = 1").stderr, r.stderr, 'shown again on the next run');
});
