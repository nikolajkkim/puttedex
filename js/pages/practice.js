// Driving Range problem view: a leaner hole view. No lesson and no starter code; an optional caddie tip; the pro's
// line unlocks after a solve or enough failed attempts; prev/next follow the range home's current filters.

import * as range from '../range.js';
import * as progress from '../progress.js';
import { loadSqlJs, runQuery, describeSchema } from '../lib/sql-runner.js';
import { compareResults } from '../lib/compare.js';
import { $, esc, BRAND_SVG, crumbs } from '../ui/dom.js';
import { createSqlEditor, highlightSql } from '../ui/sql-editor.js';
import { MOD, editorCardHTML, resultsHTML, yardageBookHTML, showFeedback, execute } from '../ui/workspace.js';
import { mountCopyContext } from '../ui/copy-context.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
const app = $('#app');
const params = new URLSearchParams(location.search);
const key = params.get('p') ?? '';
const filters = range.readFilters(location.search);

function fatal(title, detail, links = [[range.rangeUrls.home(filters), 'Back to the Driving Range']]) {
  app.innerHTML = `
    <div class="loading">
      <h1>${esc(title)}</h1>
      <p>${detail}</p>
      <p class="hero-actions" style="justify-content:center">${links.map(([href, label], i) =>
        `<a class="btn ${i === 0 ? 'btn-primary' : ''}" href="${href}">${esc(label)}</a>`).join('')}</p>
    </div>`;
}

start().catch((err) => {
  console.error(err);
  fatal('Rain delay', `Something went wrong while loading this problem: <code>${esc(err.message)}</code>. Try reloading the page.`);
});

async function start() {
  const problems = await range.loadRange();
  const annotated = range.annotate(problems);
  const problem = annotated.find((p) => p.key === key);
  if (!problem) {
    fatal('Out of bounds', "That range problem doesn't exist.");
    return;
  }
  if (problem.locked) {
    fatal(`🔒 ${problem.title}`, `${esc(problem.lockMessage)}.`, [
      [`tournament.html?t=${encodeURIComponent(problem.tournament.id)}`, `Go to ${problem.tournament.title}`],
      [range.rangeUrls.home(filters), 'Back to the Driving Range'],
    ]);
    return;
  }

  const SQL = await loadSqlJs(window.initSqlJs, (file) => `vendor/sql.js/${file}`);
  const seed = problem.tournament.seed;
  const schema = describeSchema(SQL, seed);
  const expected = runQuery(SQL, seed, problem.solution);

  // Prev/next within the current filtered list. The current problem always stays in it, so solving a problem
  // while filtering by "Unsolved" doesn't lose your place.
  const filteredKeys = new Set(range.filterProblems(annotated, filters).map((p) => p.key));
  const navList = annotated.filter((p) => p.key === key || filteredKeys.has(p.key));
  const nav = range.neighbors(navList, key);

  document.title = `${problem.title} · Driving Range · Puttedex`;
  let editor = null;
  let lastRun = null; // the last Run/Submit on this page (for "Copy context")
  let copyControls = null;

  const rec = () => progress.getRangeRecord(key);

  function statsLine() {
    const r = rec();
    if (r.attempts === 0 && r.hintsTotal === 0) return 'Not played yet';
    const parts = [`${r.attempts} attempt${r.attempts === 1 ? '' : 's'}`];
    if (r.solves) parts.push(`solved ${r.solves}×`, `best ${r.bestStrokes} (par ${problem.par})`);
    if (r.lastAttemptedAt) parts.push(`last played ${new Date(r.lastAttemptedAt).toLocaleDateString()}`);
    return parts.join(' · ');
  }

  function renderStrokes() {
    const r = rec();
    // Right after a solve the next play hasn't started yet: show the solve until the next stroke.
    $('#stroke-count').textContent = r.playStrokes === 0 && r.lastStrokes !== null
      ? `Last solve: ${r.lastStrokes} · Par ${problem.par}`
      : `This play: ${r.playStrokes} stroke${r.playStrokes === 1 ? '' : 's'} · Par ${problem.par}`;
    $('#problem-stats').textContent = statsLine();
  }

  function renderHint() {
    const r = rec();
    const box = $('#hint-box');
    if (r.playHint) {
      box.innerHTML = `<strong>🧢 Caddie tip (+1 stroke)</strong><div class="hint">${problem.hint}</div>`;
    } else {
      box.innerHTML = '<button class="btn btn-small" id="hint-btn" type="button">🧢 Ask your caddie (+1 stroke)</button>';
      $('#hint-btn').addEventListener('click', () => {
        range.recordHint(problem);
        roundStroke({});
        renderHint();
        renderStrokes();
      });
    }
  }

  function renderSolution() {
    const r = rec();
    const box = $('#solution-box');
    if (range.solutionUnlocked(r)) {
      box.innerHTML = `<details><summary>See the pro's line</summary><pre class="pro-line"></pre></details>`;
      highlightSql($('#solution-box .pro-line'), problem.solution);
    } else {
      const left = range.failuresUntilSolution(r);
      box.innerHTML = `<p class="solution-locked">🔒 The pro's line unlocks when you solve this, or after ${left} more
        missed shot${left === 1 ? '' : 's'}.</p>`;
    }
  }

  // ---------- Timed round ----------

  const clock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  let roundWasActive = false;

  function renderRoundBanner() {
    const host = $('#round-banner');
    const round = range.activeRound();
    if (!round) {
      // The round ended while this page was open (time ran out, or this solve finished it).
      host.innerHTML = roundWasActive
        ? `<div class="round-banner"><div class="round-banner-inner">
             <strong>⏱️ Timed round over.</strong>
             <span class="spacer"></span>
             <a class="btn btn-small" href="${range.rangeUrls.roundCard()}">See your scorecard →</a>
           </div></div>`
        : '';
      return;
    }
    roundWasActive = true;
    const inRound = round.problems.some((p) => p.key === key);
    host.innerHTML = `
      <div class="round-banner"><div class="round-banner-inner" role="region" aria-label="Timed round">
        <strong>⏱️ Timed round</strong>
        <span class="round-clock" data-countdown>${clock(new Date(round.endsAt) - Date.now())}</span>
        <ol class="round-steps">${round.problems.map((p, i) => {
          const label = `${p.solved ? '✓ ' : ''}${i + 1}. ${esc(p.title)}`;
          return `<li>${p.key === key
            ? `<span aria-current="step" class="${p.solved ? 'done' : ''}">${label}</span>`
            : `<a class="${p.solved ? 'done' : ''}" href="${range.rangeUrls.problem(p.key)}">${label}</a>`}</li>`;
        }).join('')}</ol>
        ${inRound ? '' : '<span>This problem isn\'t part of the round, so it won\'t count toward it.</span>'}
        <span class="spacer"></span>
        <button class="btn btn-small" type="button" id="end-round">End round</button>
      </div></div>`;
    $('#end-round').addEventListener('click', () => {
      range.finishTimedRound(new Date(), 'quit');
      location.href = range.rangeUrls.roundCard();
    });
  }

  /** In an active round that includes this problem, the next unsolved round problem. */
  function roundNext() {
    const round = range.activeRound();
    if (!round?.problems.some((p) => p.key === key)) return null;
    return round.problems.find((p) => !p.solved && p.key !== key) ?? null;
  }

  /** Count a stroke toward the active round (if this problem is in it). Returns true if that finished the round. */
  function roundStroke({ solved = false } = {}) {
    const before = range.activeRound();
    if (!before?.problems.some((p) => p.key === key)) return false;
    range.recordRoundStroke(key, { solved });
    const finished = !range.activeRound();
    renderRoundBanner();
    return finished;
  }

  setInterval(() => {
    const round = range.activeRound();
    if (!round) { if (roundWasActive && !$('#round-banner a[href*="round=last"]')) renderRoundBanner(); return; }
    document.querySelectorAll('[data-countdown]').forEach((el) => { el.textContent = clock(new Date(round.endsAt) - Date.now()); });
  }, 1000);

  function render() {
    const back = range.rangeUrls.home(filters);
    const pager = `
      <nav class="pager" aria-label="Problems">
        ${nav.prev ? `<a class="btn btn-small" href="${range.rangeUrls.problem(nav.prev.key, filters)}">← ${esc(nav.prev.title)}</a>` : '<span></span>'}
        ${nav.position ? `<span class="pager-pos">${nav.position} of ${nav.total}</span>` : ''}
        ${nav.next ? `<a class="btn btn-small" href="${range.rangeUrls.problem(nav.next.key, filters)}">${esc(nav.next.title)} →</a>` : '<span></span>'}
      </nav>`;
    app.innerHTML = `
      <div class="player-head">
        ${crumbs([['Driving Range', back], [problem.title]])}
      </div>
      <div id="round-banner"></div>
      <div class="player player-range">
        <article class="card lesson range-problem" aria-labelledby="problem-title">
          <div class="kicker">${esc(problem.tournament.title)} · ${range.difficultyLabel(problem.par)}</div>
          <h1 id="problem-title">${esc(problem.title)}</h1>
          <div class="chips">${problem.tags.map((t) => `<a class="chip" href="${range.rangeUrls.home({ topic: t })}">${esc(t)}</a>`).join('')}</div>
          <p class="problem-stats" id="problem-stats"></p>
          <div class="task">
            <h2>⛳ Your shot</h2>
            <p>${problem.task}</p>
          </div>
          <div class="hint-box" id="hint-box"></div>
          <div class="solution-box" id="solution-box"></div>
          ${yardageBookHTML(schema)}
          ${pager}
        </article>

        <div class="workspace">
          ${editorCardHTML()}
          ${resultsHTML()}
        </div>
      </div>`;

    renderRoundBanner();
    mountEditor();
    copyControls = mountCopyContext({
      solutionUnlocked: () => range.solutionUnlocked(rec()),
      getContext: ({ includeSolution }) => {
        const r = rec();
        // Right after a solve the next play hasn't started: report the solve.
        const solvedPlay = r.playStrokes === 0 && r.lastStrokes !== null;
        return {
          engine: problem.tournament.engine,
          location: { kind: 'range', tournament: problem.tournament.title },
          title: problem.title,
          par: problem.par,
          tags: problem.tags,
          task: problem.task,
          background: null,
          code: editor.getValue(),
          lastRun,
          progress: {
            attempts: r.attempts,
            strokes: solvedPlay ? r.lastStrokes : r.playStrokes,
            par: problem.par,
            hintsUsed: `${r.playHint ? 1 : 0} on this attempt, ${r.hintsTotal} in total`,
            solved: solvedPlay,
            best: r.bestStrokes,
          },
          solution: includeSolution ? problem.solution : null,
          data: { SQL, seed, referenceSql: problem.solution },
        };
      },
    });
    renderHint();
    renderSolution();
    renderStrokes();
  }

  // Only write when the draft changed, so merely viewing a problem doesn't create a progress record.
  function saveDraft(value) {
    if (value !== (rec().code ?? '')) progress.updateRangeRecord(key, (r) => { r.code = value; });
  }

  function mountEditor() {
    let saveTimer;
    editor = createSqlEditor($('#editor'), {
      value: rec().code ?? '',
      placeholder: `-- Write your SQL here. ${MOD}+Enter runs it.`,
      label: `SQL editor for ${problem.title}`,
      run,
      submit,
      onChange: (value) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveDraft(value), 300);
      },
    });
    $('#run-btn').addEventListener('click', run);
    $('#submit-btn').addEventListener('click', submit);
    $('#clear-btn').addEventListener('click', () => { editor.setValue(''); editor.focus(); });
  }

  function run() {
    const { result, error } = execute(SQL, seed, editor.getValue());
    lastRun = error ? { kind: 'error', message: error, result: null } : { kind: 'practice', message: '', result };
    if (error) showFeedback('error', 'Shanked it. SQL error', `<p><code>${esc(error)}</code></p>`);
    else showFeedback('info', 'Practice swing', '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>');
  }

  function submit() {
    const code = editor.getValue();
    const { result, error } = execute(SQL, seed, code);
    const verdict = error
      ? { ok: false, message: `SQL error: ${error}` }
      : compareResults(result, expected, { orderMatters: problem.orderMatters });
    const wasUnlocked = range.solutionUnlocked(rec());
    const { rec: r, flagged } = range.recordSubmit(problem, verdict.ok, code);
    const roundDone = roundStroke({ solved: verdict.ok });
    renderStrokes();

    if (verdict.ok) {
      const strokes = r.lastStrokes;
      const name = progress.scoreName(strokes, problem.par);
      const good = strokes <= problem.par;
      const review = flagged
        ? `<p>This one was a grind, so it'll come back for review in ${
          Math.round((new Date(r.reviewDueAt) - Date.now()) / 86400000)} days.</p>` : '';
      showFeedback('ok', `${name}${good ? '!' : '.'} Solved in ${strokes}.`, `
        ${r.bestStrokes === strokes && r.solves > 1 ? '<p>That ties or beats your best.</p>' : ''}
        ${review}
        ${roundDone ? `<a class="btn btn-flag btn-small" href="${range.rangeUrls.roundCard()}">⏱️ Round complete. See your scorecard →</a>`
          : roundNext() ? `<a class="btn btn-primary btn-small" href="${range.rangeUrls.problem(roundNext().key)}">Next round problem →</a>`
            : nav.next ? `<a class="btn btn-primary btn-small" href="${range.rangeUrls.problem(nav.next.key, filters)}">Next problem →</a>`
              : `<a class="btn btn-primary btn-small" href="${range.rangeUrls.home(filters)}">Back to the range →</a>`}`);
      renderHint();
      renderSolution();
      lastRun = { kind: 'correct', message: `${name}${good ? '!' : '.'} Solved in ${strokes}.`, result };
    } else {
      const left = range.failuresUntilSolution(r);
      const unlockedNow = !wasUnlocked && range.solutionUnlocked(r);
      showFeedback(error ? 'error' : 'miss', `Stroke ${r.playStrokes}: not in the hole yet.`, `
        <p>${esc(verdict.message)}</p>
        ${unlockedNow ? '<p>The pro\'s line is now unlocked below the task, if you want to study it.</p>'
          : !range.solutionUnlocked(r) ? `<p class="muted">${left} more miss${left === 1 ? '' : 'es'} unlocks the pro's line.</p>` : ''}`);
      if (unlockedNow) renderSolution();
      lastRun = error
        ? { kind: 'error', message: error, result: null }
        : { kind: 'wrong', message: `Stroke ${r.playStrokes}: not in the hole yet. ${verdict.message}`, result };
    }
    copyControls.refresh();
  }

  render();
  window.addEventListener('pagehide', () => { if (editor) saveDraft(editor.getValue()); });
}
