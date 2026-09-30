// The 18-hole tournament scorecard: front nine (Out) and back nine (In), like a real card.
// Slots beyond the tournament's defined holes render as locked.

import { HOLES_PER_TOURNAMENT, urls } from '../tournaments.js';
import * as progress from '../progress.js';
import { esc, scoreMark } from './dom.js';

const LOCK = '<span class="lock" aria-label="Coming soon">🔒</span>';

function nine(tournament, start, label) {
  const cols = [], pars = [], scores = [];
  let par = 0, strokes = 0, anyDefined = false, allSolved = true;
  for (let n = start; n < start + 9; n++) {
    const hole = tournament.holes[n - 1];
    if (!hole) {
      cols.push(`<th scope="col" class="locked" title="Hole ${n}: coming soon">${n}</th>`);
      pars.push('<td class="locked">–</td>');
      scores.push(`<td class="locked">${LOCK}</td>`);
      continue;
    }
    anyDefined = true;
    const rec = progress.getHole(tournament.id, hole.id);
    par += hole.par;
    cols.push(`<th scope="col"><a href="${urls.hole(tournament.id, n)}" title="Hole ${n}: ${esc(hole.title)}">${n}</a></th>`);
    pars.push(`<td>${hole.par}</td>`);
    if (rec.solved) {
      strokes += rec.strokes;
      scores.push(`<td>${scoreMark(rec.strokes, hole.par)}</td>`);
    } else {
      allSolved = false;
      scores.push('<td><span class="dash">–</span></td>');
    }
  }
  const total = anyDefined && allSolved ? strokes : '–';
  return `
    <div class="scorecard-wrap">
      <table class="scorecard">
        <caption class="visually-hidden">${label}: strokes versus par for holes ${start}–${start + 8}</caption>
        <thead><tr><th scope="col">Hole</th>${cols.join('')}<th scope="col">${label}</th></tr></thead>
        <tbody>
          <tr class="row-par"><th scope="row">Par</th>${pars.join('')}<td class="total">${anyDefined ? par : '–'}</td></tr>
          <tr><th scope="row">Score</th>${scores.join('')}<td class="total">${total}</td></tr>
        </tbody>
      </table>
    </div>`;
}

export function renderScorecard(tournament) {
  return `
    <div class="scorecard-stack">
      ${nine(tournament, 1, 'Out')}
      ${HOLES_PER_TOURNAMENT > 9 ? nine(tournament, 10, 'In') : ''}
    </div>
    <div class="scorecard-legend">
      <span><span class="score-mark under">1</span>Under par</span>
      <span><span class="score-mark">2</span>Par</span>
      <span><span class="score-mark over">3</span>Over par</span>
      <span>${LOCK} Hole coming soon</span>
    </div>`;
}
