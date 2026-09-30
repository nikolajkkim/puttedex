import { TOURNAMENTS } from '../tournaments.js';
import { DIFFICULTY, TOPICS } from '../data/range-config.js';
import * as range from '../range.js';
import { $, esc, BRAND_SVG, scoreMark } from '../ui/dom.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
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
        <td data-label="Difficulty"><span class="par-badge par-${p.par}">Par ${p.par}</span> ${DIFFICULTY[p.par]}</td>
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
        <select name="difficulty">${option('', 'Any par', filters.difficulty)}${
          Object.entries(DIFFICULTY).map(([par, label]) => option(par, `Par ${par} · ${label}`, filters.difficulty)).join('')}</select>
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
}

document.title = 'The Driving Range · Puttedex';
render();
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
