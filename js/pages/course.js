import { holeById } from '../courses/index.js';
import * as progress from '../progress.js';
import { loadSqlJs, runQuery, describeSchema } from '../lib/sql-runner.js';
import { compareResults } from '../lib/compare.js';
import { $, esc, BRAND_SVG, scoreMark } from '../ui/dom.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);

const MAX_DISPLAY_ROWS = 200;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const params = new URLSearchParams(location.search);
const hole = holeById(params.get('hole') ?? 'sql-basics');
const app = $('#app');

function fatal(title, detail) {
  app.innerHTML = `
    <div class="loading">
      <h1>${esc(title)}</h1>
      <p>${detail}</p>
      <p><a class="btn btn-primary" href="./#course-map">Back to the course map</a></p>
    </div>`;
}

if (!hole) {
  fatal('Out of bounds', "That hole doesn't exist.");
} else if (!hole.load) {
  fatal(`Hole ${hole.number}: ${hole.title}`, 'This hole is still being built. Check back soon.');
} else {
  start().catch((err) => {
    console.error(err);
    fatal('Rain delay', `Something went wrong while loading this hole: <code>${esc(err.message)}</code>. Try reloading the page.`);
  });
}

async function start() {
  const [course, SQL] = await Promise.all([
    hole.load(),
    loadSqlJs(window.initSqlJs, (file) => `vendor/sql.js/${file}`),
  ]);
  const schema = describeSchema(SQL, course.seed);
  const expectedCache = new Map();
  const expectedFor = (shot) => {
    if (!expectedCache.has(shot.id)) expectedCache.set(shot.id, runQuery(SQL, course.seed, shot.solution));
    return expectedCache.get(shot.id);
  };

  const shotIndexFromUrl = () => {
    const n = parseInt(new URLSearchParams(location.search).get('shot'), 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), course.shots.length) - 1 : 0;
  };
  const shotHref = (i) => `course.html?hole=${encodeURIComponent(hole.id)}&shot=${i + 1}`;

  let index = shotIndexFromUrl();

  // ---------- Rendering ----------

  function renderShotList() {
    const sum = progress.holeSummary(hole, course.shots);
    const total = sum.played
      ? `${sum.played}/${sum.total} holed · ${progress.formatToPar(sum.strokes - sum.parPlayed)}`
      : `${sum.total} shots · Par ${hole.par}`;
    return `
      <nav class="shot-list" aria-label="Shots on this hole">
        <h2>Hole ${hole.number}: ${esc(course.title)}</h2>
        <p class="hole-total">${total}</p>
        <ol>
          ${course.shots.map((s, i) => {
            const rec = progress.getShot(hole.id, s.id);
            return `
              <li><a class="shot-link${rec.solved ? ' done' : ''}" href="${shotHref(i)}" data-shot="${i}"
                     ${i === index ? 'aria-current="page"' : ''}>
                <span class="num">${i + 1}</span>
                <span class="shot-title">${esc(s.title)}</span>
                <span class="strokes" title="${rec.solved ? `${rec.strokes} strokes, par ${s.par}` : `Par ${s.par}`}">${
                  rec.solved ? scoreMark(rec.strokes, s.par) : `P${s.par}`}</span>
              </a></li>`;
          }).join('')}
        </ol>
      </nav>`;
  }

  function renderYardageBook() {
    return `
      <section class="card yardage" aria-labelledby="yardage-title">
        <h2 id="yardage-title">📒 Yardage book: tables you can query</h2>
        ${schema.map((t, i) => `
          <details ${i === 0 ? 'open' : ''}>
            <summary>${esc(t.name)} <span>${t.rowCount} rows</span></summary>
            <ul>${t.columns.map((c) => `
              <li>${esc(c.name)} <span class="type">${esc(c.type.toLowerCase())}${c.nullable ? ', nullable' : ''}</span>
                ${c.primaryKey ? '<span class="pk">PK</span>' : ''}</li>`).join('')}
            </ul>
          </details>`).join('')}
      </section>`;
  }

  function render() {
    const shot = course.shots[index];
    const rec = progress.getShot(hole.id, shot.id);
    document.title = `${shot.title} · ${course.title} · Puttedex`;

    app.innerHTML = `
      <div class="player">
        ${renderShotList()}

        <article class="card lesson" aria-labelledby="shot-title">
          <div class="kicker">Hole ${hole.number} · Shot ${index + 1} of ${course.shots.length} · Par ${shot.par}</div>
          <h1 id="shot-title">${esc(shot.title)}</h1>
          ${shot.lesson}
          <div class="task">
            <h2>⛳ Your shot</h2>
            <p>${shot.task}</p>
          </div>
          <div class="hint-box" id="hint-box"></div>
          <div class="pager">
            ${index > 0 ? `<a class="btn btn-small" href="${shotHref(index - 1)}" data-shot="${index - 1}">← Previous shot</a>` : '<span></span>'}
            ${index < course.shots.length - 1
              ? `<a class="btn btn-small" href="${shotHref(index + 1)}" data-shot="${index + 1}">Next shot →</a>`
              : '<a class="btn btn-small" href="./#scorecard">Back to scorecard →</a>'}
          </div>
        </article>

        <div class="workspace">
          <section class="card editor-card" aria-label="SQL editor">
            <div class="editor-head">
              <strong>query.sql</strong>
              <span>SQLite · <kbd>${MOD}</kbd>+<kbd>Enter</kbd> run · <kbd>${MOD}</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submit</span>
            </div>
            <label class="visually-hidden" for="editor">SQL query</label>
            <textarea id="editor" class="editor" spellcheck="false" autocapitalize="off" autocomplete="off"
                      autocorrect="off"></textarea>
            <div class="editor-actions">
              <button class="btn" id="run-btn" type="button" title="Run without using a stroke">🏌️ Practice swing (Run)</button>
              <button class="btn btn-primary" id="submit-btn" type="button" title="Check your answer (costs one stroke)">⛳ Take the shot (Submit)</button>
              <span class="spacer"></span>
              <button class="btn btn-ghost btn-small" id="reset-code-btn" type="button">Reset code</button>
              <span class="stroke-count" id="stroke-count"></span>
            </div>
          </section>

          <div id="feedback" role="status" aria-live="polite"></div>

          <section class="card results-card" aria-labelledby="results-title">
            <h2 id="results-title">Results</h2>
            <div id="results"><p class="empty">Run a query to see its results here.</p></div>
          </section>

          ${renderYardageBook()}
        </div>
      </div>`;

    const editor = $('#editor');
    editor.value = rec.code ?? shot.starter;
    wireEditor(editor, shot);
    renderHint(shot);
    renderStrokeCount(shot);
    if (rec.solved) showSolved(shot, rec, false);
  }

  function renderStrokeCount(shot) {
    const rec = progress.getShot(hole.id, shot.id);
    $('#stroke-count').textContent = rec.solved
      ? `Holed out in ${rec.strokes} · Par ${shot.par}`
      : `Strokes: ${rec.strokes} · Par ${shot.par}`;
  }

  function renderHint(shot) {
    const rec = progress.getShot(hole.id, shot.id);
    const box = $('#hint-box');
    if (rec.hintUsed || rec.solved) {
      box.innerHTML = `<strong>🧢 Caddie tip${rec.hintUsed ? ' (+1 penalty stroke)' : ''}</strong><div class="hint">${shot.hint}</div>`;
    } else {
      box.innerHTML = '<button class="btn btn-small" id="hint-btn" type="button">🧢 Ask your caddie (+1 stroke)</button>';
      $('#hint-btn').addEventListener('click', () => {
        progress.useHint(hole.id, shot.id);
        renderHint(shot);
        renderStrokeCount(shot);
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
      const result = runQuery(SQL, course.seed, code);
      $('#results').innerHTML = renderTable(result);
      return { result };
    } catch (err) {
      $('#results').innerHTML = '<p class="empty">No results. Fix the error above and swing again.</p>';
      return { error: err.message };
    }
  }

  function showSolved(shot, rec, justNow) {
    const name = progress.scoreName(rec.strokes, shot.par);
    const next = index < course.shots.length - 1;
    const allDone = progress.holeSummary(hole, course.shots).complete;
    const underOrPar = rec.strokes <= shot.par;
    const title = justNow
      ? `${name}${underOrPar ? '!' : '.'} Holed out in ${rec.strokes}.`
      : `Holed out: ${name.toLowerCase()} (${rec.strokes} on a par ${shot.par})`;
    const cheer = !justNow ? ''
      : underOrPar ? '<p>Clean strike. That\'s interview-ready SQL.</p>'
        : '<p>In the hole. Compare your query with the pro\'s line below. There\'s often a tidier way.</p>';
    feedback('ok', title, `
      ${cheer}
      <details><summary>See the pro's line (reference solution)</summary><pre><code>${esc(shot.solution)}</code></pre></details>
      ${next
        ? `<a class="btn btn-primary btn-small" href="${shotHref(index + 1)}" data-shot="${index + 1}">Next shot →</a>`
        : allDone
          ? '<a class="btn btn-flag btn-small" href="./#scorecard">🏆 Hole complete. See your scorecard</a>'
          : '<p>That was the last shot. Go back and finish any open shots to complete the hole.</p>'}`);
  }

  // ---------- Actions ----------

  function run(shot, editor) {
    const { error } = execute(editor.value);
    if (error) feedback('error', 'Shanked it. SQL error', `<p><code>${esc(error)}</code></p>`);
    else feedback('info', 'Practice swing', '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>');
  }

  function submit(shot, editor) {
    const code = editor.value;
    const { result, error } = execute(code);
    let verdict;
    if (error) verdict = { ok: false, message: `SQL error: ${error}` };
    else verdict = compareResults(result, expectedFor(shot), { orderMatters: shot.orderMatters });

    const wasSolved = progress.getShot(hole.id, shot.id).solved;
    const rec = progress.recordStroke(hole.id, shot.id, verdict.ok, code);
    renderStrokeCount(shot);

    if (verdict.ok) {
      showSolved(shot, rec, !wasSolved);
      if (!wasSolved) {
        // Refresh the sidebar marks without losing the editor.
        $('.shot-list').outerHTML = renderShotList();
        renderHint(shot);
      }
    } else {
      const lead = wasSolved ? 'Not quite. (This shot is already holed, so no stroke was added.)' : `Stroke ${rec.strokes}: not in the hole yet.`;
      feedback(error ? 'error' : 'miss', lead, `<p>${esc(verdict.message)}</p>`);
    }
  }

  function wireEditor(editor, shot) {
    let saveTimer;
    editor.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => progress.saveDraft(hole.id, shot.id, editor.value), 300);
    });
    editor.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        (e.shiftKey ? submit : run)(shot, editor);
      } else if (e.key === 'Tab' && !e.shiftKey && !mod && !e.altKey) {
        // Indent instead of leaving the editor. Esc then Tab still moves focus, for keyboard users.
        if (editor.dataset.escaped) return;
        e.preventDefault();
        editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
      } else if (e.key === 'Escape') {
        editor.dataset.escaped = '1';
      }
    });
    editor.addEventListener('blur', () => delete editor.dataset.escaped);
    $('#run-btn').addEventListener('click', () => run(shot, editor));
    $('#submit-btn').addEventListener('click', () => submit(shot, editor));
    $('#reset-code-btn').addEventListener('click', () => {
      editor.value = shot.starter;
      progress.saveDraft(hole.id, shot.id, shot.starter);
      editor.focus();
    });
  }

  // ---------- Navigation (in-page, so the SQL engine stays warm) ----------

  app.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-shot]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const editor = $('#editor');
    if (editor) progress.saveDraft(hole.id, course.shots[index].id, editor.value);
    index = Number(link.dataset.shot);
    history.pushState({ index }, '', shotHref(index));
    render();
    window.scrollTo({ top: 0 });
    $('#editor')?.focus({ preventScroll: true });
  });
  window.addEventListener('popstate', () => { index = shotIndexFromUrl(); render(); });
  window.addEventListener('pagehide', () => {
    const editor = $('#editor');
    if (editor) progress.saveDraft(hole.id, course.shots[index].id, editor.value);
  });

  render();
}
