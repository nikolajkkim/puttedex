// Compares a learner's result set with the reference solution's result set.
// Compares values, not column names, so aliases never cause a miss.

const FLOAT_TOLERANCE = 1e-6;

function normalizeValue(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v / FLOAT_TOLERANCE) * FLOAT_TOLERANCE;
  if (v instanceof Uint8Array) return `blob:${Array.from(v).join(',')}`;
  return v; // string or null
}

function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= FLOAT_TOLERANCE;
  return a === b;
}

function sameRow(a, b) {
  return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
}

const rowKey = (row) => JSON.stringify(row.map(normalizeValue));

export function formatRow(row) {
  return `(${row.map((v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v))).join(', ')})`;
}

/**
 * @returns {{ ok: boolean, message: string }}
 * `message` is a coaching hint aimed at the learner, never a spoiler of the answer.
 */
export function compareResults(actual, expected, { orderMatters = false } = {}) {
  if (actual.columns.length === 0) {
    return { ok: false, message: 'Your query did not return a result set. End with a SELECT.' };
  }
  if (actual.columns.length !== expected.columns.length) {
    return {
      ok: false,
      message: `Expected ${expected.columns.length} column${expected.columns.length === 1 ? '' : 's'}, `
        + `but got ${actual.columns.length}. Check exactly which columns the task asks for.`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    const more = actual.rows.length > expected.rows.length;
    return {
      ok: false,
      message: `Expected ${expected.rows.length} row${expected.rows.length === 1 ? '' : 's'}, `
        + `but got ${actual.rows.length}. `
        + (more ? 'You are returning too many rows. Is a filter missing or too loose?'
          : 'You are returning too few rows. Is a filter too strict?'),
    };
  }

  const a = orderMatters ? actual.rows : [...actual.rows].sort((x, y) => (rowKey(x) < rowKey(y) ? -1 : 1));
  const e = orderMatters ? expected.rows : [...expected.rows].sort((x, y) => (rowKey(x) < rowKey(y) ? -1 : 1));

  for (let i = 0; i < e.length; i++) {
    if (!sameRow(a[i], e[i])) {
      if (orderMatters) {
        const sameSet = rowKey([...a].map(rowKey).sort()) === rowKey([...e].map(rowKey).sort());
        if (sameSet) {
          return { ok: false, message: `Right rows, wrong order. Row ${i + 1} is out of place. Check your ORDER BY.` };
        }
      }
      return {
        ok: false,
        message: `The row counts match, but the values differ. `
          + `${orderMatters ? `Row ${i + 1}` : 'One of your rows'} is ${formatRow(a[i])}, and it doesn't match the expected result. `
          + 'Check the column order, filters, and any rounding.',
      };
    }
  }
  return { ok: true, message: 'Holed out!' };
}
