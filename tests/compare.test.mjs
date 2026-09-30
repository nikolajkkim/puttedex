import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareResults } from '../js/lib/compare.js';

const r = (columns, rows) => ({ columns, rows });

test('ignores column names (aliases are fine)', () => {
  assert.ok(compareResults(r(['n'], [[1]]), r(['count'], [[1]])).ok);
});

test('ignores row order unless orderMatters', () => {
  const a = r(['x'], [[2], [1]]);
  const e = r(['x'], [[1], [2]]);
  assert.ok(compareResults(a, e).ok);
  const res = compareResults(a, e, { orderMatters: true });
  assert.equal(res.ok, false);
  assert.match(res.message, /wrong order/);
});

test('tolerates float noise but not real differences', () => {
  assert.ok(compareResults(r(['a'], [[0.1 + 0.2]]), r(['a'], [[0.3]])).ok);
  assert.equal(compareResults(r(['a'], [[76.35]]), r(['a'], [[76.3]])).ok, false);
});

test('distinguishes NULL from 0 and strings from numbers', () => {
  assert.equal(compareResults(r(['a'], [[null]]), r(['a'], [[0]])).ok, false);
  assert.equal(compareResults(r(['a'], [['1']]), r(['a'], [[1]])).ok, false);
});

test('reports column and row count mismatches', () => {
  assert.match(compareResults(r(['a', 'b'], [[1, 2]]), r(['a'], [[1]])).message, /Expected 1 column/);
  assert.match(compareResults(r(['a'], [[1], [2]]), r(['a'], [[1]])).message, /too many rows/);
  assert.match(compareResults(r([], []), r(['a'], [[1]])).message, /result set/);
});

test('duplicates count (multiset, not set, comparison)', () => {
  assert.equal(compareResults(r(['a'], [[1], [1], [2]]), r(['a'], [[1], [2], [2]])).ok, false);
});

test('a SELECT that matches no rows keeps its columns, so the learner hears "0 rows", not "no SELECT"', async () => {
  const { getSql } = await import('./helpers.mjs');
  const { runQuery } = await import('../js/lib/sql-runner.js');
  const SQL = await getSql();
  const seed = 'CREATE TABLE t (a INTEGER, b TEXT); INSERT INTO t VALUES (1, \'x\'), (2, \'y\');';
  const empty = runQuery(SQL, seed, 'SELECT a, b FROM t WHERE a > 5;');
  assert.deepEqual(empty, { columns: ['a', 'b'], rows: [] });
  assert.match(compareResults(empty, r(['a'], [[1]])).message, /Expected 1 column/);
  assert.match(compareResults(empty, r(['a', 'b'], [[1, 'x']])).message, /got 0/);
  assert.deepEqual(runQuery(SQL, seed, "UPDATE t SET b = 'z';"), { columns: [], rows: [] });
  assert.deepEqual(runQuery(SQL, seed, "SELECT 1 AS one; SELECT b FROM t WHERE a = 2;"), { columns: ['b'], rows: [['y']] });
  assert.equal(runQuery(SQL, seed, '-- only a comment').columns.length, 0);
});
