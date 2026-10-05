import { tournamentById, loadTournament, isOpen, urls, HOLES_PER_TOURNAMENT } from '../tournaments.js';
import * as progress from '../progress.js';
import { $, esc, BRAND_SVG, crumbs, scoreMark } from '../ui/dom.js';
import { mountPracticeBadge } from '../ui/practice-badge.js';
import { createEditor, highlightCode } from '../ui/editor.js';
import { editorCardHTML, resultsHTML, showFeedback } from '../ui/workspace.js';
import { createWorkspace, hasEngine } from '../ui/engines/index.js';
import { mountCopyContext } from '../ui/copy-context.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
mountPracticeBadge();

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
} else if (!hasEngine(meta.engine)) {
  fatal(meta.title, 'These holes need a runner this site doesn\'t have yet.', urls.tournament(meta.id), 'Tournament details');
} else {
  start().catch((err) => {
    console.error(err);
    fatal('Rain delay', `Something went wrong while loading this hole: <code>${esc(err.message)}</code>. Try reloading the page.`);
  });
}

async function start() {
  const t = await loadTournament(meta);
  const engine = await createWorkspace(t.engine, { seed: t.seed, frames: t.frames, packages: t.packages ?? [] });
  await engine.prepare();
  const highlight = (el, text, theme) => highlightCode(el, text, { language: engine.language, theme });

  const indexFromUrl = () => {
    const n = parseInt(new URLSearchParams(location.search).get('h'), 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), t.holes.length) - 1 : 0;
  };

  let index = indexFromUrl();
  let editor = null; // the CodeMirror instance for the current hole
  let lastRun = null; // the last Run/Submit on this hole (for "Copy context"); reset when the hole changes
  let busy = false; // a Run or Submit is in progress (Python runs asynchronously)
  let copyControls = null;

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
          ${hole.interview ? `<p class="tip"><strong>Interview angle:</strong> ${hole.interview}</p>` : ''}
          <div class="task">
            <h2>⛳ Your shot</h2>
            <p>${hole.task}</p>
          </div>
          <div class="hint-box" id="hint-box"></div>
          ${engine.yardageHTML(hole, hole.yardage)}
          <div class="pager">
            ${index > 0 ? `<a class="btn btn-small" href="${urls.hole(t.id, index)}" data-hole="${index - 1}">← Hole ${index}</a>` : '<span></span>'}
            ${index < t.holes.length - 1
              ? `<a class="btn btn-small" href="${urls.hole(t.id, index + 2)}" data-hole="${index + 1}">Hole ${index + 2} →</a>`
              : `<a class="btn btn-small" href="${urls.tournament(t.id)}">Tournament scorecard →</a>`}
          </div>
        </article>

        <div class="workspace">
          ${editorCardHTML(engine)}
          ${resultsHTML(engine.emptyResultsHTML(hole))}
        </div>
      </div>`;

    // Lesson examples are read-only: highlight them on paper so they never look like the editor.
    app.querySelectorAll('.lesson pre:not(.yardage-code)').forEach((pre) => highlight(pre, pre.textContent, 'paper'));
    lastRun = null;
    mountEditor(hole, rec.code ?? '');
    engine.mount(app);
    copyControls = mountCopyContext({
      solutionUnlocked: () => progress.getHole(t.id, hole.id).solved, // the pro's line shows once holed
      getContext: ({ includeSolution }) => {
        const r = progress.getHole(t.id, hole.id);
        const hints = r.hintUsed ? 1 : 0;
        return {
          engine: t.engine,
          location: { kind: 'hole', tournament: t.title, hole: index + 1, holes: t.holes.length },
          title: hole.title,
          par: hole.par,
          tags: [],
          task: hole.task,
          background: { lesson: hole.lesson, note: hole.yardage },
          code: editor.getValue(),
          lastRun,
          progress: { attempts: r.strokes - hints, strokes: r.strokes, par: hole.par, hintsUsed: hints, solved: r.solved },
          solution: includeSolution ? hole.solution : null,
          data: engine.contextData(hole),
        };
      },
    });
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
        copyControls?.refresh();
        renderHint(hole);
        renderStrokeCount(hole);
      });
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
      : underOrPar ? `<p>Clean strike. That's interview-ready ${engine.language === 'sql' ? 'SQL' : 'code'}.</p>`
        : '<p>In the hole. Compare your query with the pro\'s line below. There\'s often a tidier way.</p>';
    const next = round.complete
      ? `<a class="btn btn-flag btn-small" href="${urls.tournament(t.id)}">🏆 Every open hole played. See your scorecard</a>`
      : hasNext
        ? `<a class="btn btn-primary btn-small" href="${urls.hole(t.id, index + 2)}" data-hole="${index + 1}">Hole ${index + 2} →</a>`
        : `<a class="btn btn-primary btn-small" href="${urls.hole(t.id, round.nextIndex + 1)}" data-hole="${round.nextIndex}">Play hole ${round.nextIndex + 1}, still open →</a>`;
    showFeedback('ok', title, `
      ${cheer}
      <details><summary>See the pro's line (reference solution)</summary><pre class="pro-line"></pre></details>
      ${next}`);
    highlight($('#feedback .pro-line'), hole.solution);
  }

  // ---------- Actions ----------

  /** Run or Submit, one at a time: Python answers asynchronously, and a second click mustn't overlap. */
  async function exclusive(action) {
    if (busy) return;
    busy = true;
    const buttons = [$('#run-btn'), $('#submit-btn')];
    buttons.forEach((b) => { b.disabled = true; });
    try {
      await action();
    } finally {
      busy = false;
      buttons.forEach((b) => { if (b.isConnected) b.disabled = false; });
    }
  }

  const run = () => exclusive(async () => {
    const hole = t.holes[index];
    const out = await engine.run(editor.getValue(), hole);
    if (hole !== t.holes[index]) return; // moved to another hole meanwhile
    lastRun = out.lastRun;
    showFeedback(out.feedback.kind, out.feedback.title, out.feedback.body);
  });

  const submit = () => exclusive(async () => {
    const hole = t.holes[index];
    const code = editor.getValue();
    const verdict = await engine.submit(code, hole);
    if (hole !== t.holes[index]) return;
    if (!verdict.graded) {
      showFeedback('error', 'Rain delay. Nothing was checked', `<p>${esc(verdict.message)} No stroke was counted.</p>`);
      return;
    }

    const wasSolved = progress.getHole(t.id, hole.id).solved;
    const rec = progress.recordStroke(t.id, hole.id, verdict.ok, code);
    renderStrokeCount(hole);

    if (verdict.ok) {
      showSolved(hole, rec, !wasSolved);
      lastRun = { ...verdict.lastRun, kind: 'correct', message: $('#feedback .feedback strong').textContent };
      copyControls.refresh();
      if (!wasSolved) {
        // Refresh the sidebar marks without losing the editor.
        $('.hole-list').outerHTML = renderHoleList();
        renderHint(hole);
      }
    } else {
      const lead = wasSolved ? 'Not quite. (This hole is already holed, so no stroke was added.)' : `Stroke ${rec.strokes}: not in the hole yet.`;
      showFeedback(verdict.error ? 'error' : 'miss', lead, `<p>${esc(verdict.message)}</p>`);
      lastRun = verdict.error ? verdict.lastRun : { ...verdict.lastRun, message: `${lead} ${verdict.message}` };
    }
  });

  function mountEditor(hole, code) {
    let saveTimer;
    editor = createEditor($('#editor'), {
      language: engine.language,
      value: code,
      placeholder: engine.placeholder,
      label: `Code editor for hole ${index + 1}`,
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

  // ---------- Navigation (in-page, so the SQL engine or Python interpreter stays warm) ----------

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
