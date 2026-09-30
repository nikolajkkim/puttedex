import { tournamentById, loadTournament, isOpen, urls, HOLES_PER_TOURNAMENT } from '../tournaments.js';
import * as progress from '../progress.js';
import { loadSqlJs, runQuery, describeSchema } from '../lib/sql-runner.js';
import { compareResults } from '../lib/compare.js';
import { $, esc, BRAND_SVG, crumbs, scoreMark } from '../ui/dom.js';
import { createSqlEditor, highlightSql } from '../ui/sql-editor.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);

const MAX_DISPLAY_ROWS = 200;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const app = $('#app');
const meta = tournamentById(new URLSearchParams(location.search).get('t') ?? 'sql-basics');

function fatal(title, detail, href = urls.schedule(), label = 'Back to the schedule') {
  app.innerHTML = `
    <div class="loading">
      <h1>${esc(title)}</h1>
      <p>${detail}</p>
      <p><a class="btn btn-primary" href="${href}">${esc(label)}</a></p>
    </div>`;
}

if (!meta) {
  fatal('Out of bounds', "That tournament isn't on the schedule.");
} else if (!isOpen(meta)) {
  fatal(meta.title, 'This tournament is still being built. Check back soon.', urls.tournament(meta.id), 'Tournament details');
} else {
  start().catch((err) => {
    console.error(err);
    fatal('Rain delay', `Something went wrong while loading this hole: <code>${esc(err.message)}</code>. Try reloading the page.`);
  });
}

async function start() {
  const [t, SQL] = await Promise.all([
    loadTournament(meta),
    loadSqlJs(window.initSqlJs, (file) => `vendor/sql.js/${file}`),
  ]);
  const schema = describeSchema(SQL, t.seed);
  const expectedCache = new Map();
  const expectedFor = (hole) => {
    if (!expectedCache.has(hole.id)) expectedCache.set(hole.id, runQuery(SQL, t.seed, hole.solution));
    return expectedCache.get(hole.id);
  };

  const indexFromUrl = () => {
    const n = parseInt(new URLSearchParams(location.search).get('h'), 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), t.holes.length) - 1 : 0;
  };

  let index = indexFromUrl();
  let editor = null; // the CodeMirror instance for the current hole

  // ---------- Rendering ----------

  function renderHoleList() {
    const s = progress.roundSummary(t);
    const total = s.played
      ? `${s.played}/${s.total} holed · ${progress.formatToPar(s.strokes - s.parPlayed)}`
      : `${s.total} holes · Par ${t.par}`;
    const locked = HOLES_PER_TOURNAMENT - t.holes.length;
    return `
      <nav class="hole-list" aria-label="Holes in this tournament">
        <h2><a href="${urls.holes(t.id)}">${esc(t.title)}</a></h2>
        <p class="hole-total">${total}</p>
        <ol>
          ${t.holes.map((h, i) => {
            const rec = progress.getHole(t.id, h.id);
            return `
              <li><a class="hole-link${rec.solved ? ' done' : ''}" href="${urls.hole(t.id, i + 1)}" data-hole="${i}"
                     ${i === index ? 'aria-current="page"' : ''}>
                <span class="num">${i + 1}</span>
                <span class="hole-title">${esc(h.title)}</span>
                <span class="strokes" title="${rec.solved ? `${rec.strokes} strokes, par ${h.par}` : `Par ${h.par}`}">${
                  rec.solved ? scoreMark(rec.strokes, h.par) : `P${h.par}`}</span>
              </a></li>`;
          }).join('')}
        </ol>
        ${locked > 0 ? `<p class="hole-locked">🔒 Holes ${t.holes.length + 1}–${HOLES_PER_TOURNAMENT} coming soon</p>` : ''}
      </nav>`;
  }

  function renderYardageBook() {
    return `
      <section class="yardage" aria-labelledby="yardage-title">
        <h2 id="yardage-title">📒 Yardage book: tables you can query</h2>
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

  function render() {
    const hole = t.holes[index];
    const rec = progress.getHole(t.id, hole.id);
    document.title = `Hole ${index + 1}: ${hole.title} · ${t.title} · Puttedex`;

    app.innerHTML = `
      <div class="player-head">
        ${crumbs([['Schedule', urls.schedule()], [t.title, urls.tournament(t.id)], [`Hole ${index + 1}`]])}
      </div>
      <div class="player">
        ${renderHoleList()}

        <article class="card lesson" aria-labelledby="hole-title">
          <div class="kicker">${esc(t.title)} · Hole ${index + 1} of ${t.holes.length} · Par ${hole.par}</div>
          <h1 id="hole-title">${esc(hole.title)}</h1>
          ${hole.lesson}
          <div class="task">
            <h2>⛳ Your shot</h2>
            <p>${hole.task}</p>
          </div>
          <div class="hint-box" id="hint-box"></div>
          ${renderYardageBook()}
          <div class="pager">
            ${index > 0 ? `<a class="btn btn-small" href="${urls.hole(t.id, index)}" data-hole="${index - 1}">← Hole ${index}</a>` : '<span></span>'}
            ${index < t.holes.length - 1
              ? `<a class="btn btn-small" href="${urls.hole(t.id, index + 2)}" data-hole="${index + 1}">Hole ${index + 2} →</a>`
              : `<a class="btn btn-small" href="${urls.tournament(t.id)}">Tournament scorecard →</a>`}
          </div>
        </article>

        <div class="workspace">
          <section class="card editor-card" aria-label="SQL editor">
            <div class="editor-head">
              <strong>query.sql</strong>
              <span>SQLite · <kbd>${MOD}</kbd>+<kbd>Enter</kbd> run · <kbd>${MOD}</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submit</span>
            </div>
            <div id="editor" class="editor-host"></div>
            <div class="editor-actions">
              <button class="btn" id="run-btn" type="button" title="Run without using a stroke">🏌️ Practice swing (Run)</button>
              <button class="btn btn-primary" id="submit-btn" type="button" title="Check your answer (costs one stroke)">⛳ Take the shot (Submit)</button>
              <span class="spacer"></span>
              <button class="btn btn-ghost btn-small" id="clear-btn" type="button" title="Clear the editor (undo with ${MOD}+Z)">Clear</button>
              <span class="stroke-count" id="stroke-count"></span>
            </div>
          </section>

          <div id="feedback" role="status" aria-live="polite"></div>

          <section class="card results-card" aria-labelledby="results-title">
            <h2 id="results-title">Results</h2>
            <div id="results"><p class="empty">Run a query to see its results here.</p></div>
          </section>
        </div>
      </div>`;

    // Lesson examples are read-only: highlight them on paper so they never look like the editor.
    app.querySelectorAll('.lesson pre').forEach((pre) => highlightSql(pre, pre.textContent, 'paper'));
    mountEditor(hole, rec.code ?? '');
    renderHint(hole);
    renderStrokeCount(hole);
    if (rec.solved) showSolved(hole, rec, false);
  }

  function renderStrokeCount(hole) {
    const rec = progress.getHole(t.id, hole.id);
    $('#stroke-count').textContent = rec.solved
      ? `Holed out in ${rec.strokes} · Par ${hole.par}`
      : `Strokes: ${rec.strokes} · Par ${hole.par}`;
  }

  function renderHint(hole) {
    const rec = progress.getHole(t.id, hole.id);
    const box = $('#hint-box');
    if (rec.hintUsed || rec.solved) {
      box.innerHTML = `<strong>🧢 Caddie tip${rec.hintUsed ? ' (+1 penalty stroke)' : ''}</strong><div class="hint">${hole.hint}</div>`;
    } else {
      box.innerHTML = '<button class="btn btn-small" id="hint-btn" type="button">🧢 Ask your caddie (+1 stroke)</button>';
      $('#hint-btn').addEventListener('click', () => {
        progress.useHint(t.id, hole.id);
        renderHint(hole);
        renderStrokeCount(hole);
      });
    }
  }

  function renderTable({ columns, rows }) {
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

  function feedback(kind, title, body = '') {
    $('#feedback').innerHTML = `<div class="feedback ${kind}"><strong>${title}</strong>${body}</div>`;
  }

  function execute(code) {
    try {
      const result = runQuery(SQL, t.seed, code);
      $('#results').innerHTML = renderTable(result);
      return { result };
    } catch (err) {
      $('#results').innerHTML = '<p class="empty">No results. Fix the error above and swing again.</p>';
      return { error: err.message };
    }
  }

  function showSolved(hole, rec, justNow) {
    const name = progress.scoreName(rec.strokes, hole.par);
    const hasNext = index < t.holes.length - 1;
    const round = progress.roundSummary(t);
    const underOrPar = rec.strokes <= hole.par;
    const title = justNow
      ? `${name}${underOrPar ? '!' : '.'} Holed out in ${rec.strokes}.`
      : `Holed out: ${name.toLowerCase()} (${rec.strokes} on a par ${hole.par})`;
    const cheer = !justNow ? ''
      : underOrPar ? '<p>Clean strike. That\'s interview-ready SQL.</p>'
        : '<p>In the hole. Compare your query with the pro\'s line below. There\'s often a tidier way.</p>';
    const next = round.complete
      ? `<a class="btn btn-flag btn-small" href="${urls.tournament(t.id)}">🏆 Every open hole played. See your scorecard</a>`
      : hasNext
        ? `<a class="btn btn-primary btn-small" href="${urls.hole(t.id, index + 2)}" data-hole="${index + 1}">Hole ${index + 2} →</a>`
        : `<a class="btn btn-primary btn-small" href="${urls.hole(t.id, round.nextIndex + 1)}" data-hole="${round.nextIndex}">Play hole ${round.nextIndex + 1}, still open →</a>`;
    feedback('ok', title, `
      ${cheer}
      <details><summary>See the pro's line (reference solution)</summary><pre class="pro-line"></pre></details>
      ${next}`);
    highlightSql($('#feedback .pro-line'), hole.solution);
  }

  // ---------- Actions ----------

  function run() {
    const { error } = execute(editor.getValue());
    if (error) feedback('error', 'Shanked it. SQL error', `<p><code>${esc(error)}</code></p>`);
    else feedback('info', 'Practice swing', '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>');
  }

  function submit() {
    const hole = t.holes[index];
    const code = editor.getValue();
    const { result, error } = execute(code);
    const verdict = error
      ? { ok: false, message: `SQL error: ${error}` }
      : compareResults(result, expectedFor(hole), { orderMatters: hole.orderMatters });

    const wasSolved = progress.getHole(t.id, hole.id).solved;
    const rec = progress.recordStroke(t.id, hole.id, verdict.ok, code);
    renderStrokeCount(hole);

    if (verdict.ok) {
      showSolved(hole, rec, !wasSolved);
      if (!wasSolved) {
        // Refresh the sidebar marks without losing the editor.
        $('.hole-list').outerHTML = renderHoleList();
        renderHint(hole);
      }
    } else {
      const lead = wasSolved ? 'Not quite. (This hole is already holed, so no stroke was added.)' : `Stroke ${rec.strokes}: not in the hole yet.`;
      feedback(error ? 'error' : 'miss', lead, `<p>${esc(verdict.message)}</p>`);
    }
  }

  function mountEditor(hole, code) {
    let saveTimer;
    editor = createSqlEditor($('#editor'), {
      value: code,
      placeholder: `-- Write your SQL here. ${MOD}+Enter runs it.`,
      label: `SQL editor for hole ${index + 1}`,
      run,
      submit,
      onChange: (value) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => progress.saveDraft(t.id, hole.id, value), 300);
      },
    });
    $('#run-btn').addEventListener('click', run);
    $('#submit-btn').addEventListener('click', submit);
    $('#clear-btn').addEventListener('click', () => {
      editor.setValue('');
      editor.focus();
    });
  }

  // ---------- Navigation (in-page, so the SQL engine stays warm) ----------

  const saveCurrentDraft = () => {
    if (editor) progress.saveDraft(t.id, t.holes[index].id, editor.getValue());
  };

  app.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-hole]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    saveCurrentDraft();
    index = Number(link.dataset.hole);
    history.pushState({ index }, '', urls.hole(t.id, index + 1));
    render();
    window.scrollTo({ top: 0 });
    editor.focus();
  });
  window.addEventListener('popstate', () => { index = indexFromUrl(); render(); });
  window.addEventListener('pagehide', saveCurrentDraft);

  render();
}
