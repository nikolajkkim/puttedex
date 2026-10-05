// Rendering for pandas problems: DataFrame/Series tables (from js/lib/pandas-harness.js frame_table), a Run's output,
// a Submit's test list with expected-vs-got rows, and the data panel. Pure functions returning HTML; every learner-
// or data-derived string goes through esc(). Wide tables scroll inside their own .table-scroll container.

import { esc } from './dom.js';
import { block, pre, errorBlock, truncatedNote, summaryLine } from './python-results.js';

const cellHTML = (c, cls = '') => (c !== null && typeof c === 'object'
  ? `<td class="null ${cls}">${esc(c.na)}</td>`
  : `<td class="${cls}">${esc(c)}</td>`);

const plural = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

/** A DataFrame or Series as an HTML table with its index, plus "showing 20 of N rows". */
export function frameTableHTML(table, { meta = true } = {}) {
  const indexHeads = table.indexNames.map((n) => `<th scope="col" class="idx">${n === null ? '' : esc(n)}</th>`).join('');
  const heads = table.columns.map((c, i) => `<th scope="col" title="${esc(table.dtypes[i])}">${esc(c)}</th>`).join('');
  const width = table.indexNames.length + table.columns.length;
  const body = table.rows.map((r) => `<tr>${r.index.map((c) => cellHTML(c, 'idx')).join('')}${r.cells.map((c) => cellHTML(c)).join('')}</tr>`).join('')
    || `<tr><td colspan="${width}" class="null">No rows</td></tr>`;
  const shape = table.kind === 'Series'
    ? `Series · ${plural(table.rowCount, 'value')}`
    : `${plural(table.rowCount, 'row')} × ${plural(table.columns.length, 'column')}`;
  const showing = table.rows.length < table.rowCount ? ` · showing the first ${table.rows.length} of ${table.rowCount.toLocaleString('en-US')}` : '';
  return `
    ${meta ? `<div class="results-meta">${shape}${showing}</div>` : ''}
    <div class="table-scroll frame-scroll">
      <table class="data-table frame-table">
        <thead><tr>${indexHeads}${heads}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

/** A display value ({ repr, type, table? }) as HTML. */
export function valueHTML(value) {
  return value.table ? frameTableHTML(value.table) : pre(value.repr);
}

/** A Run's results: printed output, warnings, the value (or what the function returned), and errors. */
export function renderFrameRun(result, { inputsNote = '' } = {}) {
  const parts = [];
  if (inputsNote) parts.push(`<p class="results-meta">${inputsNote}</p>`);
  parts.push(block('Printed output', result.stdout ? pre(result.stdout) : '<p class="empty">Nothing was printed.</p>'));
  if (result.stderr) parts.push(block('Warnings (stderr)', pre(result.stderr), 'is-warn'));
  if (result.value) {
    const label = result.called ? `<code>${esc(result.called)}</code> returned` : 'Value of your last line';
    parts.push(block(`${label} <span class="py-type">${esc(result.value.type)}</span>`, valueHTML(result.value)));
  } else if (result.returnedNone) {
    parts.push(block(`<code>${esc(result.called)}</code> returned None`, `<p class="py-msg">Your function didn't return
      anything. Did you forget <code>return</code>, or return the result of an <code>inplace=True</code> call
      (which is always <code>None</code>)?</p>`, 'is-warn'));
  }
  if (result.error) parts.push(errorBlock(result.error));
  if (result.truncated) parts.push(truncatedNote);
  return `<div class="py-results">${parts.join('')}</div>`;
}

/** The first mismatching rows, expected above got, with wrong cells marked. */
function diffHTML(diff) {
  const rows = diff.rows.map((r) => `
    <tr class="diff-exp"><th scope="row">${r.label === null || r.label === undefined ? `Row ${r.row + 1}` : esc(r.label)}<span>expected</span></th>${r.expected.map((c, i) => cellHTML(c, r.bad.includes(i) ? 'is-bad' : '')).join('')}</tr>
    <tr class="diff-got"><th scope="row"><span>yours</span></th>${r.got.map((c, i) => cellHTML(c, r.bad.includes(i) ? 'is-bad' : '')).join('')}</tr>`).join('');
  return `
    <div class="table-scroll frame-scroll">
      <table class="data-table diff-table">
        <thead><tr><th scope="col"></th>${diff.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${diff.more ? `<p class="results-meta">…and ${plural(diff.more, 'more row')} that differ${diff.more === 1 ? 's' : ''}.</p>` : ''}`;
}

const caseName = (c, i, visibleCount) => (c.visible
  ? (visibleCount === 1 ? 'Visible data' : `Example ${i + 1}`)
  : `Hidden test ${i + 1 - visibleCount}`);

/** The first failure, described the way the learner is allowed to see it (hidden: the kind of mismatch only). */
export function firstFrameFailureText(report) {
  const visibleCount = report.cases.filter((c) => c.visible).length;
  const i = report.cases.findIndex((c) => !c.ok);
  if (i === -1) return '';
  const c = report.cases[i];
  return `${caseName(c, i, visibleCount)} failed: ${c.message}`;
}

/** A Submit's results: summary, a top-level error, printed output, and each test with expected vs yours. */
export function renderFrameCheck(report, summary, { sorted = false } = {}) {
  const visibleCount = report.cases.filter((c) => c.visible).length;
  const items = report.cases.map((c, i) => {
    const head = `<div class="test-head"><span class="test-icon" aria-hidden="true">${c.ok ? '✓' : '✗'}</span>
      <strong>${caseName(c, i, visibleCount)}</strong><span class="test-status">${c.ok ? 'Passed' : 'Failed'}</span></div>`;
    if (!c.visible) {
      return `<li class="test-case hidden ${c.ok ? 'pass' : 'fail'}">${head}${c.ok ? '' : `<p class="test-msg">${esc(c.message)}</p>`}</li>`;
    }
    const parts = [head, `<p class="test-call"><code>${esc(c.input)}</code> on the data in the yardage book</p>`];
    if (!c.ok) parts.push(`<p class="test-msg">${esc(c.message)}</p>`);
    if (c.diff?.rows.length) parts.push(`<p class="results-meta">First rows that differ${sorted ? ' (both results sorted the same way first, since row order isn\'t graded)' : ''}:</p>${diffHTML(c.diff)}`);
    if (c.traceback) parts.push(pre(c.traceback, 'py-out py-trace'));
    if (c.expected || c.got) {
      const views = [];
      if (c.expected) views.push(`<details class="frame-view"><summary>Expected result <span class="py-type">${esc(c.expected.type)}</span></summary>${valueHTML(c.expected)}</details>`);
      if (c.got) views.push(`<details class="frame-view"><summary>Your result <span class="py-type">${esc(c.got.type)}</span></summary>${valueHTML(c.got)}</details>`);
      parts.push(views.join(''));
    }
    return `<li class="test-case ${c.ok ? 'pass' : 'fail'}">${parts.join('')}</li>`;
  });
  const out = [`<p class="test-summary ${summary.ok ? 'is-pass' : 'is-fail'}">${esc(summaryLine(summary))}</p>`];
  if (report.error) out.push(errorBlock(report.error));
  if (report.stdout) out.push(`<details class="py-printed"><summary>Printed output (visible data)</summary>${pre(report.stdout)}</details>`);
  if (report.truncated) out.push(truncatedNote);
  out.push(`<ol class="test-list">${items.join('')}</ol>`);
  return `<div class="py-results">${out.join('')}</div>`;
}

/** The data panel: one collapsible section per DataFrame with shape, dtypes, missing counts, and sample rows. */
export function dataPanelHTML(frames, descriptions = {}) {
  return frames.map((f, i) => `
    <details class="frame-info" ${i === 0 ? 'open' : ''}>
      <summary>${esc(f.name)} <span>${plural(f.shape[0], 'row')} × ${plural(f.shape[1], 'column')}</span></summary>
      ${descriptions[f.name] ? `<p class="frame-about">${esc(descriptions[f.name])}</p>` : ''}
      <div class="table-scroll frame-scroll">
        <table class="data-table dtype-table">
          <thead><tr><th scope="col">column</th><th scope="col">dtype</th><th scope="col">missing</th></tr></thead>
          <tbody>${f.columns.map((c) => `<tr><td>${esc(c.name)}</td><td class="dtype">${esc(c.dtype)}</td><td${c.missing ? '' : ' class="null"'}>${c.missing}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="frame-sample-label">First ${f.sample.rows.length} rows (<code>${esc(f.name)}.head()</code>):</p>
      ${frameTableHTML(f.sample, { meta: false })}
    </details>`).join('');
}
