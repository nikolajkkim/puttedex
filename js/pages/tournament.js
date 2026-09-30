import { tournamentById, loadTournament, isOpen, urls, HOLES_PER_TOURNAMENT } from '../tournaments.js';
import * as progress from '../progress.js';
import { $, esc, BRAND_SVG, crumbs } from '../ui/dom.js';
import { renderScorecard } from '../ui/scorecard.js';
import { renderCourseMap } from '../ui/course-map.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);
const app = $('#app');

const meta = tournamentById(new URLSearchParams(location.search).get('t'));
if (!meta) {
  app.innerHTML = `
    <div class="loading">
      <h1>Out of bounds</h1>
      <p>That tournament isn't on the schedule.</p>
      <p><a class="btn btn-primary" href="${urls.schedule()}">Back to the schedule</a></p>
    </div>`;
} else {
  const t = await loadTournament(meta);
  document.title = `${t.title} · Puttedex`;

  const render = () => {
    const open = isOpen(t);
    const s = progress.roundSummary(t);
    const best = progress.bestRound(t);
    const archived = progress.rounds(t).filter((r) => !r.current).length;

    const stat = (label, value, note = '') => `
      <div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${
        note ? `<div class="stat-note">${note}</div>` : ''}</div>`;

    let actions = '';
    if (open) {
      const primary = s.complete
        ? '<a class="btn btn-flag" href="#holes">Review your holes</a>'
        : `<a class="btn btn-flag" href="${urls.hole(t.id, s.nextIndex + 1)}">${
          s.started ? `Continue at hole ${s.nextIndex + 1}` : 'Tee off at hole 1'}</a>`;
      actions = `
        <div class="hero-actions">
          ${primary}
          <a class="btn btn-ghost" href="#holes">See all ${HOLES_PER_TOURNAMENT} holes</a>
          ${s.started ? '<button class="btn btn-ghost" id="new-round" type="button">Start a new round</button>' : ''}
        </div>`;
    }

    app.innerHTML = `
      <section class="t-hero">
        <div class="t-hero-inner">
          ${crumbs([['Schedule', urls.schedule()], [t.title]])}
          <span class="eyebrow">Tournament ${t.number} · ${esc(t.event)}</span>
          <h1>${esc(t.title)}</h1>
          <p>${esc(t.description)}</p>
          <div class="chips chips-on-dark">${t.skills.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>
          ${open ? actions : '<p class="soon-note">🔒 This tournament is still being built. It will open here when its holes are ready.</p>'}
        </div>
      </section>

      <div class="page">
        <section class="stats" aria-label="Tournament summary">
          ${stat('Holes open', `${t.holes.length}<small> / ${HOLES_PER_TOURNAMENT}</small>`,
            t.holes.length < HOLES_PER_TOURNAMENT ? `${HOLES_PER_TOURNAMENT - t.holes.length} more coming soon` : 'Full 18')}
          ${stat('Total par', open ? t.par : '–', open ? `across ${t.holes.length} open holes` : '')}
          ${stat('Progress', open ? `${s.played}<small> / ${s.total}</small>` : '–', open ? 'holes holed this round' : '')}
          ${stat('This round', s.played ? progress.formatToPar(s.strokes - s.parPlayed) : '–',
            s.played ? `${s.strokes} strokes, thru ${s.played}` : 'not started')}
          ${stat('Best round', best ? progress.formatToPar(best.strokes - best.par) : '–',
            best ? `${best.strokes} strokes over ${best.holes} holes${best.current ? ' (this round)' : ''}`
              : 'finish every open hole to post one')}
        </section>

        <section class="section" aria-labelledby="card-title">
          <div class="section-head">
            <div>
              <h2 id="card-title">Scorecard</h2>
              <p>A stroke is one submitted answer. A caddie tip costs one penalty stroke. Practice swings (Run) are free.
                ${archived ? `You've completed ${archived} earlier round${archived === 1 ? '' : 's'} here.` : ''}</p>
            </div>
          </div>
          ${renderScorecard(t)}
        </section>

        <section class="section" id="holes" aria-labelledby="holes-title">
          <div class="section-head">
            <div>
              <h2 id="holes-title">The course</h2>
              <p>${open
                ? `${t.holes.length} of ${HOLES_PER_TOURNAMENT} holes open. Pick any hole to play it.${
                  t.holes.length < HOLES_PER_TOURNAMENT ? ' Locked holes are coming soon.' : ''}`
                : 'Every hole on this course is still being built.'}</p>
            </div>
          </div>
          ${renderCourseMap(t)}
        </section>
      </div>`;

    $('#new-round')?.addEventListener('click', () => {
      const msg = s.complete
        ? 'Start a new round? Your completed round is saved to your history, and every hole resets.'
        : 'Start a new round? This round is not finished, so it will not be saved. Every hole resets.';
      if (!window.confirm(msg)) return;
      progress.startNewRound(t);
      render();
    });
  };

  render();
  // The page is rendered by script, so the browser can't jump to #holes on load by itself.
  if (location.hash === '#holes') document.getElementById('holes')?.scrollIntoView();
  window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });
}
