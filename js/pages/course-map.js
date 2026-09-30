import { tournamentById, loadTournament, isOpen, urls, HOLES_PER_TOURNAMENT } from '../tournaments.js';
import * as progress from '../progress.js';
import { $, esc, BRAND_SVG, FLAG_SVG, crumbs, scoreMark } from '../ui/dom.js';

const params = new URLSearchParams(location.search);

// Links from v1 used course.html?hole=<tournament>&shot=<n> for the problem view.
const legacy = params.has('hole') && !params.has('t');

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
const app = $('#app');
const meta = tournamentById(params.get('t'));

if (legacy) {
  location.replace(urls.hole(params.get('hole'), params.get('shot') ?? 1));
} else if (!meta) {
  app.innerHTML = `
    <div class="loading">
      <h1>Out of bounds</h1>
      <p>That tournament isn't on the schedule.</p>
      <p><a class="btn btn-primary" href="${urls.schedule()}">Back to the schedule</a></p>
    </div>`;
} else {
  const t = await loadTournament(meta);
  document.title = `Course map · ${t.title} · Puttedex`;

  const slot = (n, i) => {
    const place = `style="grid-row: ${i + 1} / span 2"`;
    const hole = t.holes[n - 1];
    if (!hole) {
      return `
        <li class="stop is-soon" ${place}>
          <div class="stop-card hole-slot" aria-disabled="true">
            <div class="stop-badge">${n}</div>
            <div class="stop-meta">
              <div class="kicker">Hole ${n} <span class="status status-soon">🔒 Coming soon</span></div>
            </div>
          </div>
        </li>`;
    }
    const rec = progress.getHole(t.id, hole.id);
    const s = progress.roundSummary(t);
    const upNext = !rec.solved && s.nextIndex === n - 1;
    const status = rec.solved
      ? `<span class="status status-done">${esc(progress.scoreName(rec.strokes, hole.par))}</span>`
      : upNext ? '<span class="status status-open">Up next</span>'
        : rec.strokes ? `<span class="status status-open">${rec.strokes} stroke${rec.strokes === 1 ? '' : 's'}</span>` : '';
    return `
      <li class="stop${rec.solved ? ' is-done' : ''}" ${place}>
        <a class="stop-card hole-slot" href="${urls.hole(t.id, n)}">
          <div class="stop-badge">${n}${rec.solved || upNext ? FLAG_SVG : ''}</div>
          <div class="stop-meta">
            <div class="kicker">Hole ${n} · Par ${hole.par} ${status}</div>
            <h3>${esc(hole.title)}</h3>
          </div>
          ${rec.solved ? `<div class="slot-score">${scoreMark(rec.strokes, hole.par)}</div>` : ''}
        </a>
      </li>`;
  };

  const render = () => {
    const s = progress.roundSummary(t);
    const numbers = Array.from({ length: HOLES_PER_TOURNAMENT }, (_, i) => i + 1);
    app.innerHTML = `
      <div class="page">
        ${crumbs([['Schedule', urls.schedule()], [t.title, urls.tournament(t.id)], ['Course map']])}
        <div class="section-head">
          <div>
            <h1 class="page-title">${esc(t.title)}: course map</h1>
            <p>${isOpen(t)
              ? `${t.holes.length} of ${HOLES_PER_TOURNAMENT} holes open · Par ${t.par} · ${
                s.played ? `${s.played} holed, ${progress.formatToPar(s.strokes - s.parPlayed)}` : 'not started'}`
              : 'This tournament is still being built. Every hole is coming soon.'}</p>
          </div>
          <a class="btn" href="${urls.tournament(t.id)}">Tournament details</a>
        </div>
        <ol class="roadmap roadmap-holes">${numbers.map(slot).join('')}</ol>
      </div>`;
  };

  render();
  window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
}
