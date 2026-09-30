import { HOLES } from '../courses/index.js';
import * as progress from '../progress.js';
import { $, esc, FLAG_SVG, BRAND_SVG, scoreMark } from '../ui/dom.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);

// Shots of every playable hole, keyed by hole id (needed to compute strokes and par).
const courses = Object.fromEntries(
  await Promise.all(HOLES.filter((h) => h.load).map(async (h) => [h.id, await h.load()])),
);

function summaries() {
  return Object.fromEntries(
    Object.entries(courses).map(([id, course]) => [id, progress.holeSummary({ id }, course.shots)]),
  );
}

/** Link to the first unsolved shot of a hole, so "Continue" drops you where you left off. */
function holeHref(hole) {
  const course = courses[hole.id];
  const next = course.shots.findIndex((s) => !progress.getShot(hole.id, s.id).solved);
  return `course.html?hole=${encodeURIComponent(hole.id)}&shot=${next === -1 ? 1 : next + 1}`;
}

function renderMap(sum) {
  $('#map').innerHTML = HOLES.map((hole, i) => {
    const place = `style="grid-row: ${i + 1} / span 2"`;
    const s = sum[hole.id];
    if (!s) {
      return `
        <li class="hole is-soon" ${place}>
          <div class="hole-card" aria-disabled="true">
            <div class="hole-green">${hole.number}</div>
            <div class="hole-meta">
              <div class="kicker">Hole ${hole.number} <span class="status status-soon">Coming soon</span></div>
              <h3>${esc(hole.title)}</h3>
              <p>${esc(hole.blurb)}</p>
              <div class="chips">${hole.skills.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>
            </div>
          </div>
        </li>`;
    }
    const pct = Math.round((s.played / s.total) * 100);
    const status = s.complete
      ? '<span class="status status-done">Holed out</span>'
      : `<span class="status status-open">${s.played ? `Thru ${s.played}` : 'Open'}</span>`;
    return `
      <li class="hole" ${place}>
        <a class="hole-card" href="${holeHref(hole)}">
          <div class="hole-green">${hole.number}${FLAG_SVG}</div>
          <div class="hole-meta">
            <div class="kicker">Hole ${hole.number} · Par ${hole.par} · ${s.total} shots ${status}</div>
            <h3>${esc(hole.title)}</h3>
            <p>${esc(hole.blurb)}</p>
            <div class="chips">${hole.skills.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>
            <div class="progress-bar" role="progressbar" aria-label="${esc(hole.title)} progress"
                 aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          </div>
        </a>
      </li>`;
  }).join('');
}

function renderScorecard(sum) {
  let outPar = 0, outStrokes = 0, anyComplete = false;
  const headers = [], pars = [], scores = [];
  for (const hole of HOLES) {
    const s = sum[hole.id];
    headers.push(s
      ? `<th scope="col"><a href="${holeHref(hole)}" title="${esc(hole.title)}">${hole.number}</a></th>`
      : `<th scope="col" title="${esc(hole.title)} (coming soon)">${hole.number}</th>`);
    pars.push(`<td>${hole.par ?? '<span class="dash">–</span>'}</td>`);
    if (!s || s.played === 0) {
      scores.push('<td><span class="dash">–</span></td>');
    } else if (s.complete) {
      outPar += hole.par;
      outStrokes += s.strokes;
      anyComplete = true;
      scores.push(`<td>${scoreMark(s.strokes, hole.par)}</td>`);
    } else {
      const diff = s.strokes - s.parPlayed;
      scores.push(`<td>${progress.formatToPar(diff)}<span class="thru">thru ${s.played}</span></td>`);
    }
  }
  const outParTotal = HOLES.reduce((t, h) => t + (h.par ?? 0), 0);
  $('#scorecard-table').innerHTML = `
    <caption class="visually-hidden">Strokes versus par for each hole of the front nine</caption>
    <thead><tr><th scope="col">Hole</th>${headers.join('')}<th scope="col">Out</th></tr></thead>
    <tbody>
      <tr class="row-par"><th scope="row">Par</th>${pars.join('')}<td class="total">${outParTotal}</td></tr>
      <tr><th scope="row">Score</th>${scores.join('')}<td class="total">${
        anyComplete ? `${outStrokes} <span class="thru">${progress.formatToPar(outStrokes - outPar)}</span>` : '–'
      }</td></tr>
    </tbody>`;
}

function renderCta(sum) {
  const first = HOLES.find((h) => sum[h.id] && !sum[h.id].complete) ?? HOLES.find((h) => sum[h.id]);
  const s = sum[first.id];
  const cta = $('#cta');
  cta.href = holeHref(first);
  cta.textContent = s.played === 0 ? `Tee off: ${first.title}` : s.complete ? `Replay ${first.title}` : `Continue: ${first.title} (thru ${s.played})`;
}

function render() {
  const sum = summaries();
  renderMap(sum);
  renderScorecard(sum);
  renderCta(sum);
}

// ---------- Locker room ----------

function notify(message, ok = true) {
  const el = $('#locker-notice');
  el.textContent = message;
  el.className = `notice ${ok ? 'ok' : 'err'}`;
}

$('#export-btn').addEventListener('click', () => {
  const blob = new Blob([progress.exportJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `puttedex-progress-${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress exported. Keep that file somewhere safe.');
});

$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = ''; // allow re-importing the same file
  if (!file) return;
  try {
    const count = progress.importJson(await file.text());
    render();
    notify(`Imported progress for ${count} shot${count === 1 ? '' : 's'}.`);
  } catch (err) {
    notify(err.message, false);
  }
});

$('#reset-btn').addEventListener('click', () => {
  if (!window.confirm('Reset all progress in this browser? This cannot be undone unless you exported it.')) return;
  progress.reset();
  render();
  notify('Progress cleared. Fresh scorecard, new round.');
});

// Progress may change in another tab (e.g. finishing a shot); keep this page in sync.
window.addEventListener('storage', (e) => { if (e.key === progress.STORAGE_KEY) render(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });

render();
