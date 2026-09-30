import { loadAll, isOpen, urls, HOLES_PER_TOURNAMENT } from '../tournaments.js';
import * as progress from '../progress.js';
import { $, esc, BRAND_SVG } from '../ui/dom.js';

$('#brand').insertAdjacentHTML('afterbegin', BRAND_SVG);

const tournaments = await loadAll();

function card(t, i) {
  const place = `style="grid-row: ${i + 1} / span 2"`;
  const chips = `<div class="chips">${t.skills.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>`;
  if (!isOpen(t)) {
    return `
      <li class="stop is-soon" ${place}>
        <a class="stop-card" href="${urls.tournament(t.id)}">
          <div class="stop-badge">${t.number}</div>
          <div class="stop-meta">
            <div class="kicker">Tournament ${t.number} <span class="status status-soon">Coming soon</span></div>
            <h3>${esc(t.title)}</h3>
            <p class="event">${esc(t.event)}</p>
            <p>${esc(t.blurb)}</p>
            ${chips}
          </div>
        </a>
      </li>`;
  }
  const s = progress.roundSummary(t);
  const pct = Math.round((s.played / s.total) * 100);
  const status = s.complete
    ? '<span class="status status-done">Complete</span>'
    : `<span class="status status-open">${s.played ? `Thru ${s.played}` : 'Open'}</span>`;
  return `
    <li class="stop" ${place}>
      <a class="stop-card" href="${urls.tournament(t.id)}">
        <div class="stop-badge">${t.number}</div>
        <div class="stop-meta">
          <div class="kicker">Tournament ${t.number} · ${t.holes.length} of ${HOLES_PER_TOURNAMENT} holes · Par ${t.par} ${status}</div>
          <h3>${esc(t.title)}</h3>
          <p class="event">${esc(t.event)}</p>
          <p>${esc(t.blurb)}</p>
          ${chips}
          <div class="progress-bar" role="progressbar" aria-label="${esc(t.title)} progress"
               aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
        </div>
      </a>
    </li>`;
}

function render() {
  $('#schedule').innerHTML = tournaments.map(card).join('');

  // Hero call to action: the first open tournament that isn't finished.
  const open = tournaments.filter(isOpen);
  const next = open.find((t) => !progress.roundSummary(t).complete) ?? open[0];
  const s = progress.roundSummary(next);
  const cta = $('#cta');
  if (s.started && !s.complete) {
    cta.href = urls.hole(next.id, s.nextIndex + 1);
    cta.textContent = `Continue ${next.title} at hole ${s.nextIndex + 1}`;
  } else {
    cta.href = urls.tournament(next.id);
    cta.textContent = s.complete ? `Replay ${next.title}` : `Tee off: ${next.title}`;
  }
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
    notify(`Imported progress for ${count} hole${count === 1 ? '' : 's'}.`);
  } catch (err) {
    notify(err.message, false);
  }
});

$('#reset-btn').addEventListener('click', () => {
  if (!window.confirm('Reset all progress in this browser? This cannot be undone unless you exported it.')) return;
  progress.reset();
  render();
  notify('Progress cleared. Fresh scorecard, new season.');
});

// Progress may change in another tab; keep this page in sync.
window.addEventListener('storage', (e) => { if (e.key === progress.STORAGE_KEY) render(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });

render();
