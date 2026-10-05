// Rendering for Python results: a Run's output (printed text, the last expression's value, errors) and a Submit's
// test-case list. Pure functions returning HTML; every learner- or data-derived string goes through esc().

import { esc } from './dom.js';

const block = (label, body, cls = '') => `
  <div class="py-block ${cls}">
    <div class="py-label">${label}</div>
    ${body}
  </div>`;

const pre = (text, cls = 'py-out') => `<pre class="${cls}">${esc(text)}</pre>`;

export function errorBlock(error) {
  return block(`Error · ${esc(error.type)}${error.line ? ` on line ${error.line}` : ''}`, pre(error.traceback, 'py-out py-trace'), 'is-error');
}

const truncatedNote = '<p class="results-meta">Output was cut off: only the first part of what was printed is shown.</p>';

/** A Run's results. `inputsNote` says which example inputs the code ran with (stdout/value problems). */
export function renderRun(result, { inputsNote = '' } = {}) {
  const parts = [];
  if (inputsNote) parts.push(`<p class="results-meta">${inputsNote}</p>`);
  parts.push(block('Printed output', result.stdout ? pre(result.stdout) : '<p class="empty">Nothing was printed.</p>'));
  if (result.stderr) parts.push(block('Warnings (stderr)', pre(result.stderr), 'is-warn'));
  if (result.value) {
    parts.push(block(`Value of your last line <span class="py-type">${esc(result.value.type)}</span>`,
      result.value.html ? `<div class="table-scroll py-rich">${result.value.html}</div>` : pre(result.value.repr)));
  }
  if (result.error) parts.push(errorBlock(result.error));
  if (result.truncated) parts.push(truncatedNote);
  return `<div class="py-results">${parts.join('')}</div>`;
}

export function renderTimeout(seconds) {
  return `<div class="py-results">${block('Stopped', `<p class="py-msg">Your code ran for more than ${seconds} seconds,
    so it was stopped and Python restarted. Check for an infinite loop (a <code>while</code> whose condition never
    becomes false), or a loop that does far more work than it needs to.</p>`, 'is-error')}</div>`;
}

const caseName = (c, i, visibleCount) => (c.visible ? `Example ${i + 1}` : `Hidden test ${i + 1 - visibleCount}`);

/** One-line summary: "5 of 7 tests passed (3 of 3 examples, 2 of 4 hidden)". */
export function summaryLine(s) {
  return `${s.all.passed} of ${s.all.total} tests passed (${s.visible.passed} of ${s.visible.total} examples, `
    + `${s.hidden.passed} of ${s.hidden.total} hidden)`;
}

/** The first failure, described the way the learner is allowed to see it (hidden: input only, no values). */
export function firstFailureText(report) {
  const visibleCount = report.cases.filter((c) => c.visible).length;
  const i = report.cases.findIndex((c) => !c.ok);
  if (i === -1) return '';
  const c = report.cases[i];
  const name = caseName(c, i, visibleCount);
  return c.visible
    ? `${name} failed: ${c.message}`
    : `${name} failed on input ${c.input.includes('\n') ? 'shown in the results' : c.input}. ${c.message}`;
}

/** A Submit's results: summary, a top-level error, example 1's printed output, and the test-case list. */
export function renderCheck(report, summary, { stdoutKind = 'function' } = {}) {
  const visibleCount = report.cases.filter((c) => c.visible).length;
  const firstHiddenFail = report.cases.findIndex((c) => !c.visible && !c.ok);
  const value = (text) => (text.includes('\n') || stdoutKind === 'stdout' ? pre(text, 'test-value') : `<code class="test-value">${esc(text)}</code>`);
  const items = report.cases.map((c, i) => {
    const name = caseName(c, i, visibleCount);
    const status = c.ok ? 'Passed' : 'Failed';
    const head = `<div class="test-head"><span class="test-icon" aria-hidden="true">${c.ok ? '✓' : '✗'}</span>
      <strong>${name}</strong>${c.label && !c.visible ? '' : ''}<span class="test-status">${status}</span></div>`;
    if (c.visible) {
      const rows = [`<div><dt>Input</dt><dd>${value(c.input)}</dd></div>`];
      if (c.expected !== null) rows.push(`<div><dt>Expected</dt><dd>${value(c.expected)}</dd></div>`);
      if (c.got !== null) rows.push(`<div><dt>Got</dt><dd>${value(c.got)}</dd></div>`);
      return `<li class="test-case ${c.ok ? 'pass' : 'fail'}">${head}<dl class="test-io">${rows.join('')}</dl>${
        c.ok ? '' : `<p class="test-msg">${esc(c.message)}</p>`}${c.traceback ? pre(c.traceback, 'py-out py-trace') : ''}</li>`;
    }
    const detail = !c.ok && i === firstHiddenFail
      ? `<dl class="test-io"><div><dt>Failed on input</dt><dd>${value(c.input)}</dd></div></dl><p class="test-msg">${esc(c.message)}</p>`
      : '';
    return `<li class="test-case hidden ${c.ok ? 'pass' : 'fail'}">${head}${detail}</li>`;
  });
  const parts = [`<p class="test-summary ${summary.ok ? 'is-pass' : 'is-fail'}">${esc(summaryLine(summary))}</p>`];
  if (report.error) parts.push(errorBlock(report.error));
  if (report.stdout) {
    parts.push(`<details class="py-printed"><summary>Printed output (example 1)</summary>${pre(report.stdout)}</details>`);
  }
  if (report.truncated) parts.push(truncatedNote);
  parts.push(`<ol class="test-list">${items.join('')}</ol>`);
  return `<div class="py-results">${parts.join('')}</div>`;
}
