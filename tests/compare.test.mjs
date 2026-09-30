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
