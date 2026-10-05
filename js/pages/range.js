import { TOURNAMENTS } from '../tournaments.js';
import { TOPICS, TIMED_ROUND } from '../data/range-config.js';
import { DIFFICULTIES, DIFFICULTY_LABEL, PAR_BY_DIFFICULTY } from '../data/par-config.js';
import * as progress from '../progress.js';
import * as range from '../range.js';
import { $, esc, BRAND_SVG, scoreMark } from '../ui/dom.js';
import { mountPracticeBadge } from '../ui/practice-badge.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
mountPracticeBadge();
const app = $('#app');

const problems = await range.loadRange();
let filters = range.readFilters(location.search);

const rangeTournaments = TOURNAMENTS.filter((t) => problems.some((p) => p.tournament.id === t.id));
const topicsInUse = TOPICS.filter((topic) => problems.some((p) => p.tags.includes(topic)));

function statusCell(p, now) {
  if (p.locked) return '<span class="status status-soon">🔒 Locked</span>';
  const label = range.STATUS_LABEL[p.status];
  const cls = { unsolved: 'status-soon', solved: 'status-done', 'needs-review': 'status-review' }[p.status];
  let note = '';
  if (p.status === 'solved' && p.rec.reviewFlag && p.rec.reviewDueAt) {
    const days = Math.max(1, Math.ceil((new Date(p.rec.reviewDueAt) - now) / 86400000));
    note = `<span class="cell-note">Review in ${days} day${days === 1 ? '' : 's'}</span>`;
  }
  return `<span class="status ${cls}">${label}</span>${note}`;
}

function renderTable(list, now) {
  if (problems.length === 0) return '<p class="empty">No range problems yet.</p>';
  if (list.length === 0) return '<p class="empty">No problems match these filters.</p>';
  const rows = list.map((p) => {
    const title = p.locked
      ? `<span class="problem-title">${esc(p.title)}</span><span class="cell-note">${esc(p.lockMessage)}</span>`
      : `<a class="problem-title" href="${range.rangeUrls.problem(p.key, filters)}">${esc(p.title)}</a>`;
    const best = p.rec.bestStrokes === null ? '<span class="dash">–</span>' : scoreMark(p.rec.bestStrokes, p.par);
    return `
      <tr class="${p.locked ? 'is-locked' : ''}">
        <td data-label="Problem">${title}</td>
        <td data-label="Tournament">${esc(p.tournament.title)}</td>
        <td data-label="Topics"><div class="chips">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></td>
        <td data-label="Difficulty"><span class="diff-badge diff-${p.difficulty}">${DIFFICULTY_LABEL[p.difficulty]}</span> Par ${p.par}</td>
        <td data-label="Status">${statusCell(p, now)}</td>
        <td data-label="Best">${best}</td>
      </tr>`;
  }).join('');
  return `
    <div class="table-wrap">
      <table class="problem-table">
        <thead><tr>
          <th scope="col">Problem</th><th scope="col">Tournament</th><th scope="col">Topics</th>
          <th scope="col">Difficulty</th><th scope="col">Status</th><th scope="col">Best</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderLockBanners(annotated) {
  const locked = new Map();
  for (const p of annotated) if (p.locked && !locked.has(p.tournament.id)) locked.set(p.tournament.id, p);
  return [...locked.values()].map((p) => {
    const n = annotated.filter((x) => x.tournament.id === p.tournament.id).length;
    return `<p class="lock-banner">🔒 <strong>${n} ${esc(p.tournament.title)} problem${n === 1 ? '' : 's'} locked.</strong>
      ${esc(p.lockMessage)}. <a href="tournament.html?t=${encodeURIComponent(p.tournament.id)}">Go to the tournament</a></p>`;
  }).join('');
}

function renderRoughSpots(annotated) {
  const spots = range.roughSpots(annotated);
  if (spots.length === 0) {
    return `<p class="muted">No rough spots yet. Failed attempts, caddie tips, and strokes over par on range problems
      show up here, grouped by topic.</p>`;
  }
  const max = spots[0].score;
  return `
    <ol class="rough-spots">
      ${spots.map((s) => {
        const open = annotated.filter((p) => !p.locked && p.tags.includes(s.topic) && p.status !== 'solved').length;
        return `
          <li>
            <a class="rough-topic" href="${range.rangeUrls.home({ topic: s.topic })}">${esc(s.topic)}</a>
            <span class="rough-bar" aria-hidden="true"><span style="width:${Math.round((s.score / max) * 100)}%"></span></span>
            <span class="rough-meta">struggle ${s.score} · ${open} to drill</span>
          </li>`;
      }).join('')}
    </ol>`;
}

const option = (value, label, current) =>
  `<option value="${esc(value)}"${String(current ?? '') === String(value) ? ' selected' : ''}>${esc(label)}</option>`;

function renderFilters() {
  return `
    <form class="filters" id="filters" role="search" aria-label="Filter problems">
      <label>Tournament
        <select name="tournament">${option('', 'All tournaments', filters.tournament)}${
          rangeTournaments.map((t) => option(t.id, t.title, filters.tournament)).join('')}</select>
      </label>
      <label>Topic
        <select name="topic">${option('', 'All topics', filters.topic)}${topicsInUse.map((t) => option(t, t, filters.topic)).join('')}</select>
      </label>
      <label>Difficulty
        <select name="difficulty">${option('', 'Any difficulty', filters.difficulty)}${
          DIFFICULTIES.map((d) => option(d, `${DIFFICULTY_LABEL[d]} · Par ${PAR_BY_DIFFICULTY[d]}`, filters.difficulty)).join('')}</select>
      </label>
      <label>Status
        <select name="status">${option('', 'Any status', filters.status)}${
          ['unsolved', 'solved', 'needs-review'].map((s) => option(s, range.STATUS_LABEL[s], filters.status)).join('')}${
          option('locked', 'Locked', filters.status)}</select>
      </label>
      <label class="search">Search
        <input type="search" name="q" value="${esc(filters.q ?? '')}" placeholder="Title, topic, or tournament" autocomplete="off">
      </label>
    </form>`;
}

function renderList() {
  const now = new Date();
  const annotated = range.annotate(problems, { now });
  const list = range.filterProblems(annotated, filters);
  const active = Object.keys(filters).length > 0;
  $('#problem-count').innerHTML = `Showing ${list.length} of ${annotated.length} problem${annotated.length === 1 ? '' : 's'}${
    active ? ' · <button class="link-button" type="button" id="clear-filters">Clear filters</button>' : ''}`;
  $('#problem-list').innerHTML = renderTable(list, now);
  $('#clear-filters')?.addEventListener('click', () => {
    filters = {};
    $('#filters').reset();
    for (const el of $('#filters').elements) el.value = '';
    syncUrl();
    renderList();
  });
}

function syncUrl() {
  history.replaceState(null, '', range.rangeUrls.home(filters) + location.hash);
}

// ---------- Modes: Mixed Bag, Timed Round, Drill my rough spots ----------

const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function notice(html, kind = 'info') {
  $('#mode-notice').innerHTML = `<div class="feedback ${kind} mode-notice">${html}</div>`;
  $('#mode-notice').scrollIntoView({ block: 'nearest' });
}

const firstOpen = (round) => round.problems.find((p) => !p.solved) ?? round.problems[0];

function renderModes() {
  const round = range.activeRound();
  $('#modes').innerHTML = `
    <button class="btn btn-flag" type="button" id="mode-mixed" title="A random unsolved problem from everything unlocked">🎲 Mixed Bag</button>
    <button class="btn btn-ghost" type="button" id="mode-timed">${round
      ? `⏱️ Resume Timed Round (<span data-countdown>${clock(new Date(round.endsAt) - Date.now())}</span> left)`
      : `⏱️ Timed Round · ${TIMED_ROUND.problems} problems, ${TIMED_ROUND.minutes} min`}</button>
    <button class="btn btn-ghost" type="button" id="mode-drill" title="Unsolved or needs-review problems from your weakest topics">🎯 Drill my rough spots</button>`;

  $('#mode-mixed').addEventListener('click', () => {
    const p = range.mixedBag(range.annotate(problems));
    if (p) location.href = range.rangeUrls.problem(p.key);
    else notice('<strong>Nothing in the bag.</strong><p>Every unlocked problem is solved. Try Drill, or unlock more by finishing a tournament.</p>');
  });

  $('#mode-timed').addEventListener('click', () => {
    const active = range.activeRound();
    if (active) {
      location.href = range.rangeUrls.problem(firstOpen(active).key);
      return;
    }
    const picks = range.timedRoundPicks(range.annotate(problems));
    if (picks.length < TIMED_ROUND.problems) {
      notice(`<strong>Not enough problems unlocked.</strong><p>A Timed Round needs ${TIMED_ROUND.problems} unlocked problems.
        Finish a tournament to unlock its range problems.</p>`);
      return;
    }
    const started = range.startTimedRound(picks);
    location.href = range.rangeUrls.problem(started.problems[0].key);
  });

  $('#mode-drill').addEventListener('click', () => {
    const { problem, topics } = range.drill(range.annotate(problems));
    if (problem) location.href = range.rangeUrls.problem(problem.key);
    else if (topics.length === 0) notice('<strong>No rough spots yet.</strong><p>Play a few range problems first. Missed shots and caddie tips show where to drill.</p>');
    else notice(`<strong>Nothing left to drill.</strong><p>Every unlocked problem in ${topics.map(esc).join(', ')} is solved and not due for review. Nice work.</p>`);
  });
}

function renderRoundPanel() {
  const panel = $('#round-panel');
  const active = range.activeRound();
  const round = active && range.withCurrentPars(active, problems);
  if (round) {
    panel.innerHTML = `
      <section class="round-card" id="timed-round" aria-labelledby="round-title">
        <div class="round-head">
          <h2 id="round-title">⏱️ Timed Round in progress</h2>
          <span class="round-clock" data-countdown>${clock(new Date(round.endsAt) - Date.now())}</span>
        </div>
        ${roundTable(round, true)}
        <div class="hero-actions">
          <a class="btn btn-primary" href="${range.rangeUrls.problem(firstOpen(round).key)}">Continue the round</a>
          <button class="btn" type="button" id="end-round">End round now</button>
        </div>
      </section>`;
    $('#end-round').addEventListener('click', () => {
      range.finishTimedRound(new Date(), 'quit');
      renderModes();
      renderRoundPanel();
    });
    return;
  }
  const saved = range.lastRound();
  if (!saved) { panel.innerHTML = ''; return; }
  const last = range.withCurrentPars(saved, problems);
  const totals = range.roundTotals(last);
  const reason = { complete: 'All holed out', time: "Time's up", quit: 'Ended early' }[last.reason] ?? '';
  panel.innerHTML = `
    <section class="round-card${new URLSearchParams(location.search).get('round') === 'last' ? ' is-fresh' : ''}" id="timed-round" aria-labelledby="round-title">
      <div class="round-head">
        <h2 id="round-title">Last Timed Round: scorecard</h2>
        <span class="round-meta">${reason} · ${clock(last.elapsedMs)} · ${new Date(last.finishedAt).toLocaleDateString()}</span>
      </div>
      ${roundTable(last, false)}
      <p class="round-total"><strong>${totals.strokes}</strong> strokes on a par ${totals.par}
        (<strong>${progress.formatToPar(totals.toPar)}</strong>) · ${totals.solved} of ${totals.total} holed.
        Unsolved problems score par + ${TIMED_ROUND.unsolvedOverPar}.</p>
    </section>`;
}

function roundTable(round, live) {
  return `
    <div class="table-scroll round-table-wrap">
      <table class="data-table round-table">
        <thead><tr><th scope="col">Problem</th><th scope="col">Par</th><th scope="col">Strokes</th><th scope="col">Result</th></tr></thead>
        <tbody>${round.problems.map((p) => `
          <tr>
            <td><a href="${range.rangeUrls.problem(p.key)}">${esc(p.title)}</a></td>
            <td>${p.par}</td>
            <td>${p.solved ? scoreMark(p.strokes, p.par) : live ? p.strokes : `<span class="null">${p.par + TIMED_ROUND.unsolvedOverPar}</span>`}</td>
            <td>${p.solved ? esc(progress.scoreName(p.strokes, p.par)) : live ? 'In play' : 'Not holed'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Keep countdowns live; when the round's time runs out, redraw to show its scorecard.
setInterval(() => {
  const round = range.activeRound();
  const counters = document.querySelectorAll('[data-countdown]');
  if (!round) {
    if (counters.length) { renderModes(); renderRoundPanel(); }
    return;
  }
  counters.forEach((el) => { el.textContent = clock(new Date(round.endsAt) - Date.now()); });
}, 1000);

function render() {
  const now = new Date();
  const annotated = range.annotate(problems, { now });
  app.innerHTML = `
    <section class="t-hero range-hero">
      <div class="t-hero-inner">
        <span class="eyebrow">Practice area</span>
        <h1>The Driving Range</h1>
        <p>Extra problems on skills you've already learned, LeetCode style. Play any problem as often as you like:
          your best score counts, struggles come back for review, and your rough spots tell you what to drill.</p>
        <div class="hero-actions" id="modes"></div>
      </div>
    </section>

    <div class="page">
      <div id="mode-notice" role="status" aria-live="polite"></div>
      <div id="round-panel"></div>

      <section class="section range-spots" aria-labelledby="spots-title">
        <div class="section-head"><div>
          <h2 id="spots-title">Your rough spots</h2>
          <p>The three topics you've struggled with most on the range.</p>
        </div></div>
        ${renderRoughSpots(annotated)}
      </section>

      <section class="section" aria-labelledby="problems-title">
        <div class="section-head"><div>
          <h2 id="problems-title">Problems</h2>
          <p id="problem-count" aria-live="polite"></p>
        </div></div>
        ${renderLockBanners(annotated)}
        ${renderFilters()}
        <div id="problem-list"></div>
      </section>
    </div>`;

  const form = $('#filters');
  const update = () => {
    const data = new FormData(form);
    filters = Object.fromEntries([...data.entries()].filter(([, v]) => String(v).trim()));
    syncUrl();
    renderList();
  };
  form.addEventListener('change', update);
  form.addEventListener('input', (e) => { if (e.target.name === 'q') update(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); update(); });
  renderList();
  renderModes();
  renderRoundPanel();
  if (location.hash === '#timed-round') $('#timed-round')?.scrollIntoView();
}

document.title = 'The Driving Range · Puttedex';
render();
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
