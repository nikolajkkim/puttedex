// The DataFrame checker (js/lib/pandas-checker.js) on the real vendored Pyodide with pandas, with made-up items:
// each kind of mismatch and its message, the options (row order, index, column order, dtypes, tolerance), hidden
// cases that reveal only the kind of mismatch, and mutation detection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPandas } from './helpers.mjs';
import { summarize } from '../js/lib/python-engine.js';

const { py, dataset } = await getPandas();
let n = 0;

/** Prepare a checker for `solution` and return a function that checks code against it. */
function checker(solution, options = {}, cases = [{}, { data: 'alt', hidden: true, label: 'other data' }]) {
  const c = { type: 'dataframe', function: 'solve', frames: ['rounds'], dataset, returns: 'DataFrame', cases, ...options };
  const key = `t${++n}`;
  py.prepare(key, solution, c);
  return (code) => {
    const report = py.check(key, code, c);
    return { report, first: report.cases[0], hidden: report.cases.find((x) => !x.visible), s: summarize(report) };
  };
}
const fn = (body) => `def solve(rounds):\n    return ${body}`;

const SUMMARY = fn(`(\n        rounds.groupby('course_id')\n        .agg(rounds=('round_id', 'count'), avg=('score', 'mean'))\n        .reset_index()\n    )`);
const summary = checker(SUMMARY, { index: 'require' });

test('the solution and an equivalent written differently pass', () => {
  assert.equal(summary(SUMMARY).s.ok, true);
  const pivot = fn(`rounds.pivot_table(index='course_id', values=['round_id', 'score'], aggfunc={'round_id': 'count', 'score': 'mean'}).rename(columns={'round_id': 'rounds', 'score': 'avg'}).reset_index()`);
  assert.equal(summary(pivot).s.ok, true);
});

test('forgetting reset_index: the key is in the index, and the message says so', () => {
  const { first, hidden } = summary(fn(`rounds.groupby('course_id').agg(rounds=('round_id', 'count'), avg=('score', 'mean'))`));
  assert.equal(first.kind, 'columns');
  assert.match(first.message, /Missing column: 'course_id'\. 'course_id' is in your index, not a column: add \.reset_index\(\)/);
  assert.equal(hidden.message, "The columns don't match.", 'hidden cases only say what kind of mismatch');
  assert.equal(hidden.expected, null);
  assert.equal(hidden.got, null);
});

test('mean instead of sum: values differ, with the first rows side by side', () => {
  const { first } = summary(fn(`rounds.groupby('course_id').agg(rounds=('round_id', 'count'), avg=('score', 'sum')).reset_index()`));
  assert.equal(first.kind, 'values');
  assert.match(first.message, /7 of 7 rows differ, in column 'avg'/);
  assert.deepEqual(first.diff.columns, ['course_id', 'rounds', 'avg']);
  assert.equal(first.diff.rows.length, 3);
  assert.equal(first.diff.more, 4);
  assert.deepEqual(first.diff.rows[0].bad, [2]);
  assert.equal(first.diff.rows[0].expected[0], '1', 'integers stay integers in the diff');
});

test('wrong shape: counts in the message, with a duplicates hint', () => {
  const { first } = summary(fn(`pd.concat([${SUMMARY.split('return ')[1]}] * 2)`));
  assert.equal(first.kind, 'shape');
  assert.match(first.message, /^Expected 7 rows x 3 columns, got 14 x 3\. Your result has 7 more duplicate rows/);
});

test('extra and renamed columns are named; wrong column order is its own message', () => {
  const extra = summary(fn(`rounds.groupby('course_id').agg(rounds=('round_id', 'count'), avg=('score', 'mean'), best=('score', 'min')).reset_index()`)).first;
  assert.match(extra.message, /Extra column: 'best'/);
  const renamed = summary(fn(`rounds.groupby('course_id').agg(n=('round_id', 'count'), mean=('score', 'mean')).reset_index()`)).first;
  assert.match(renamed.message, /Missing columns: 'rounds', 'avg'\. Extra columns: 'n', 'mean'\. Rename them/);
  const order = summary(fn(`rounds.groupby('course_id').agg(avg=('score', 'mean'), rounds=('round_id', 'count')).reset_index()`)).first;
  assert.match(order.message, /wrong order\. Expected 'course_id', 'rounds', 'avg', got 'course_id', 'avg', 'rounds'/);
});

test('columnOrder: ignore accepts any order', () => {
  const any = checker(SUMMARY, { columnOrder: 'ignore' });
  assert.equal(any(fn(`rounds.groupby('course_id').agg(avg=('score', 'mean'), rounds=('round_id', 'count')).reset_index()`)).s.ok, true);
});

test('Series vs DataFrame vs scalar: the type message explains the fix', () => {
  assert.match(summary(fn(`rounds.groupby('course_id')['score'].mean()`)).first.message, /returned a Series.*double brackets/);
  const series = checker(fn(`rounds.groupby('course_id')['score'].max()`), { returns: 'Series', index: 'require' });
  assert.match(series(fn(`rounds.groupby('course_id')[['score']].max()`)).first.message, /Expected a Series.*one column.*single brackets/);
  const scalar = checker(fn(`rounds['score'].max()`), { returns: 'scalar' });
  assert.equal(scalar(fn('int(rounds.score.max())')).s.ok, true, 'a numpy scalar and a Python int are the same value');
  assert.match(scalar(fn(`rounds[['score']].max()`)).first.message, /single value.*\.item\(\)/);
  assert.match(scalar(fn(`str(rounds.score.max())`)).first.message, /Expected a number, but got the text '88'/);
  assert.match(summary('def solve(rounds):\n    rounds.sort_values("score")').first.message, /returned None/);
});

test('row order: required order catches a missing tie-breaker; ignored order accepts any', () => {
  const TOP = fn(`rounds.sort_values(['score', 'round_id'], ascending=[True, False]).head(10)[['round_id', 'score']]`);
  const top = checker(TOP);
  const { first } = top(fn(`rounds.sort_values('score').head(10)[['round_id', 'score']]`));
  assert.ok(['order', 'values'].includes(first.kind));
  const reversed = top(fn(`rounds.sort_values(['score', 'round_id'], ascending=[True, False]).head(10)[['round_id', 'score']].iloc[::-1]`)).first;
  assert.equal(reversed.kind, 'order');
  assert.match(reversed.message, /right rows, but in a different order.*tie-breaker/);
  const anyOrder = checker(TOP, { rowOrder: 'ignore', sortBy: ['round_id'] });
  assert.equal(anyOrder(fn(`rounds.sort_values(['score', 'round_id'], ascending=[True, False]).head(10)[['round_id', 'score']].iloc[::-1]`)).s.ok, true);
});

test('index: require catches an index that isn\'t reset, and one that was reset when it shouldn\'t be', () => {
  const FILTER = fn(`rounds[rounds['score'] < 72].reset_index(drop=True)`);
  const kept = checker(FILTER, { index: 'require' });
  assert.match(kept(fn(`rounds[rounds['score'] < 72]`)).first.message, /index isn't reset \(it goes \d+, \d+/);
  assert.equal(checker(FILTER, { index: 'ignore' })(fn(`rounds[rounds['score'] < 72]`)).s.ok, true);
  const labeled = checker(fn(`rounds.groupby('course_id')['score'].max()`), { returns: 'Series', index: 'require' });
  assert.match(labeled(fn(`rounds.groupby('course_id', as_index=False)['score'].max()['score']`)).first.message, /indexed by 'course_id'/);
});

test('dtypes: values mode compares numbers numerically; match mode explains int vs float', () => {
  const COUNT = fn(`rounds.groupby('course_id').size().rename('n').reset_index()`);
  const asFloat = fn(`rounds.groupby('course_id').size().rename('n').astype(float).reset_index()`);
  assert.equal(checker(COUNT)(asFloat).s.ok, true);
  const strict = checker(COUNT, { dtypes: 'match' })(asFloat).first;
  assert.equal(strict.kind, 'dtype');
  assert.match(strict.message, /'n' should hold integers \(int64\), but yours holds decimals \(float64\)\. A missing value \(NaN\)/);
  assert.match(checker(COUNT)(fn(`rounds.groupby('course_id').size().rename('n').astype(str).reset_index()`)).first.message, /'n' holds text/);
});

test('float tolerance (rtol/atol) and a rounding hint', () => {
  const AVG = fn(`rounds.groupby('course_id')['score'].mean().round(2).reset_index()`);
  const exact = checker(AVG);
  const unrounded = exact(fn(`rounds.groupby('course_id')['score'].mean().reset_index()`)).first;
  assert.match(unrounded.message, /close: check the rounding/);
  assert.equal(checker(AVG, { atol: 0.01 })(fn(`rounds.groupby('course_id')['score'].mean().reset_index()`)).s.ok, true);
});

test('NaN matches NaN; a missing value where a number was expected does not', () => {
  const PUTTS = fn(`rounds[['round_id', 'putts']]`);
  const c = checker(PUTTS);
  assert.equal(c(fn(`rounds[['round_id', 'putts']].copy()`)).s.ok, true);
  assert.equal(c(fn(`rounds[['round_id', 'putts']].fillna(0)`)).first.kind, 'values');
});

test('mutating an input DataFrame fails, naming the table and the change', () => {
  const c = checker(fn(`rounds.assign(x=1)`));
  const added = c("def solve(rounds):\n    rounds['x'] = 1\n    return rounds").first;
  assert.equal(added.reason, 'mutated');
  assert.match(added.message, /changed its input: rounds gained column 'x'.*assign\(\)/);
  const sorted = c("def solve(rounds):\n    rounds.sort_values('score', inplace=True)\n    return rounds.sort_index().assign(x=1)").first;
  assert.match(sorted.message, /rounds had its rows reordered/);
  const dropped = c("def solve(rounds):\n    rounds.dropna(inplace=True)\n    return rounds.assign(x=1)").first;
  assert.match(dropped.message, /rounds went from 221 rows to \d+ rows/);
});

test('a hardcoded answer passes the visible data and fails the hidden variant', () => {
  const c = checker(fn(`rounds[['score']].max().to_frame('best')`));
  const hardcoded = c(fn(`pd.DataFrame({'best': [88]}, index=['score'])`));
  assert.equal(hardcoded.s.visible.passed, 1);
  assert.equal(hardcoded.s.hidden.passed, 0);
  assert.equal(hardcoded.hidden.message, "Some values don't match.");
});

test('case setup edits the data (an empty table, an all-null column) and args are passed through', () => {
  const c = checker('def solve(rounds, n):\n    return rounds.nsmallest(n, "score")[["round_id"]]', {}, [
    { args: '3' },
    { args: '1', hidden: true, label: 'n = 1' },
    { args: '3', setup: 'rounds = rounds.iloc[:0]', hidden: true, label: 'no rounds' },
    { args: '3', setup: "rounds['putts'] = np.nan", hidden: true, label: 'putts all missing' },
  ]);
  assert.equal(c('def solve(rounds, n):\n    return rounds.sort_values("score", kind="stable").head(n)[["round_id"]]').s.ok, true);
  const hard = c('def solve(rounds, n):\n    return rounds.nsmallest(3, "score")[["round_id"]]');
  assert.deepEqual([hard.s.visible.passed, hard.s.hidden.passed], [1, 2]);
  assert.equal(hard.report.cases[0].input, 'solve(rounds, 3)');
});

test('errors: a missing function, a syntax error, and a KeyError with a hint (visible only)', () => {
  assert.match(summary('def solv(rounds):\n    return rounds').first.message, /doesn't define a function named solve/);
  const syntax = summary('def solve(rounds)\n    return rounds').report;
  assert.equal(syntax.error.type, 'SyntaxError');
  const key = summary(fn(`rounds.groupby('course').size()`));
  assert.match(key.first.message, /KeyError: 'course' There's no column 'course'\. Did you mean 'course_id'\?/);
  assert.doesNotMatch(key.first.traceback, /site-packages|pandas\/core/);
  assert.equal(key.hidden.message, "Line 2: KeyError: 'course'", 'hidden: the error, without the hint');
});

test('a reference solution that fails a case is an authoring error', () => {
  assert.throws(() => checker(fn(`rounds.loc[[300]]`)), /reference solution fails on solve\(rounds\)/);
});

test('checking is fast enough for the 5-second limit', () => {
  const start = Date.now();
  summary(SUMMARY);
  assert.ok(Date.now() - start < 1000, `${Date.now() - start} ms`);
});
