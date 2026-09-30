// The course map: a tournament's 18 hole slots as a winding two-column course (one column on phones).
// Defined holes link to the problem view; the remaining slots render as locked "coming soon".

import { HOLES_PER_TOURNAMENT, urls } from '../tournaments.js';
import * as progress from '../progress.js';
import { esc, FLAG_SVG, scoreMark } from './dom.js';

export function renderCourseMap(t) {
  const round = progress.roundSummary(t);
  const slot = (n) => {
    const place = `style="grid-row: ${n} / span 2"`;
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
    const upNext = !rec.solved && !round.complete && round.nextIndex === n - 1;
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
          ${rec.solved ? `<div class="slot-score" title="${rec.strokes} strokes on a par ${hole.par}">${scoreMark(rec.strokes, hole.par)}</div>` : ''}
        </a>
      </li>`;
  };
  const numbers = Array.from({ length: HOLES_PER_TOURNAMENT }, (_, i) => i + 1);
  return `<ol class="roadmap roadmap-holes">${numbers.map(slot).join('')}</ol>`;
}
