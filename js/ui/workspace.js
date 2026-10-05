// The workspace shared by the tournament hole view and the Driving Range problem view: editor card, feedback, and
// results panel, plus SQL's results table and yardage book (schema preview). Runner-specific behavior lives in
// js/ui/engines/.

import { $, esc } from './dom.js';
import { copyControlsHTML } from './copy-context.js';

export const MAX_DISPLAY_ROWS = 200;
export const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

/**
 * Editor card markup for a workspace engine (js/ui/engines/). Elements: #editor (CodeMirror host), #run-btn,
 * #submit-btn, #clear-btn, #stroke-count, #runtime-status.
 */
export function editorCardHTML(engine) {
  return `
    <section class="card editor-card" aria-label="Code editor">
      <div class="editor-head">
        <strong>${esc(engine.fileName)}</strong>
        <span><span id="runtime-status" class="runtime-status">${esc(engine.runtimeLabel)}</span> · <kbd>${MOD}</kbd>+<kbd>Enter</kbd> run · <kbd>${MOD}</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submit</span>
      </div>
      <div id="editor" class="editor-host"></div>
      <div class="editor-actions">
        <button class="btn" id="run-btn" type="button" title="Run without using a stroke">🏌️ Practice swing (Run)</button>
        <button class="btn btn-primary" id="submit-btn" type="button" title="Check your answer (costs one stroke)">⛳ Take the shot (Submit)</button>
        ${copyControlsHTML()}
        <span class="spacer"></span>
        ${engine.extraControlsHTML()}
        <button class="btn btn-ghost btn-small" id="clear-btn" type="button" title="Clear the editor (undo with ${MOD}+Z)">Clear</button>
        <span class="stroke-count" id="stroke-count"></span>
      </div>
    </section>`;
}

/** Feedback region and results card markup. Elements: #feedback, #results. */
export function resultsHTML(emptyHTML = '<p class="empty">Run your code to see its results here.</p>') {
  return `
    <div id="feedback" role="status" aria-live="polite"></div>
    <section class="card results-card" aria-labelledby="results-title">
      <h2 id="results-title">Results</h2>
      <div id="results">${emptyHTML}</div>
    </section>`;
}

export function renderTable({ columns, rows }) {
  if (columns.length === 0) return '<p class="empty">The query ran but returned no result set.</p>';
  const shown = rows.slice(0, MAX_DISPLAY_ROWS);
  const cell = (v) => (v === null ? '<td class="null">NULL</td>' : `<td>${esc(v)}</td>`);
  return `
    <div class="results-meta">${rows.length} row${rows.length === 1 ? '' : 's'}${
      rows.length > MAX_DISPLAY_ROWS ? ` (showing the first ${MAX_DISPLAY_ROWS})` : ''}</div>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>${columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${shown.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('') || `<tr><td colspan="${columns.length}" class="null">No rows</td></tr>`}</tbody>
      </table>
    </div>`;
}

/** The yardage book: every table with its columns. `note` (HTML) is shown first, labeled `noteLabel`. */
export function yardageBookHTML(schema, note = '', noteLabel = 'For this hole') {
  return `
    <section class="yardage" aria-labelledby="yardage-title">
      <h2 id="yardage-title">📒 Yardage book: tables you can query</h2>
      ${note ? `<p class="yardage-note"><strong>${esc(noteLabel)}:</strong> ${note}</p>` : ''}
      ${schema.map((tbl, i) => `
        <details ${i === 0 ? 'open' : ''}>
          <summary>${esc(tbl.name)} <span>${tbl.rowCount} rows</span></summary>
          <ul>${tbl.columns.map((c) => `
            <li>${esc(c.name)} <span class="type">${esc(c.type.toLowerCase())}${c.nullable ? ', nullable' : ''}</span>
              ${c.primaryKey ? '<span class="pk">PK</span>' : ''}</li>`).join('')}
          </ul>
        </details>`).join('')}
    </section>`;
}

export function showFeedback(kind, title, body = '') {
  $('#feedback').innerHTML = `<div class="feedback ${kind}"><strong>${title}</strong>${body}</div>`;
}
