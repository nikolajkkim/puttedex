// Rendering for Python results: a Run's output (printed text, the last expression's value, errors).
// Pure functions returning HTML; every learner- or data-derived string goes through esc().

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
