// Python workspace engine (Pyodide in a Web Worker, via js/lib/python-runner.js). See js/ui/engines/index.js for the
// interface, and js/lib/python-engine.js for the checker format.

import { $, esc } from '../dom.js';
import { MOD } from '../workspace.js';
import { highlightCode } from '../editor.js';
import { getPythonRunner } from '../../lib/python-runner.js';
import { renderRun, renderTimeout } from '../python-results.js';

const FIRST_LOAD_NOTE = 'Loading Python for the first time on this page (about 13 MB, cached by your browser after this).';

export function createWorkspace({ packages: tournamentPackages = [] } = {}) {
  const runner = getPythonRunner();
  const packagesFor = (item) => [...new Set([...tournamentPackages, ...(item.packages ?? [])])];
  const firstVisible = (item) => item.checker.cases.find((c) => !c.hidden);
  const usesSetup = (item) => item.checker.type !== 'function';

  function statusText(s) {
    const py = s.version ? `Python ${s.version.split('.').slice(0, 2).join('.')}` : 'Python';
    switch (s.state) {
      case 'loading': return s.packages ? `${py} · loading ${s.packages.join(', ')}…` : `${py} · loading…`;
      case 'restarting': return `${py} · restarting…`;
      case 'busy': return `${py} · running…`;
      case 'failed': return `${py} · failed to load`;
      case 'ready': return `${py} · ready`;
      default: return py;
    }
  }

  // Shown in the editor head (#runtime-status) and, before the first run, the results panel (#py-idle-status).
  // Called on every status change and after each render (mount), since the page re-renders when you change holes.
  function applyStatus(s) {
    const el = $('#runtime-status');
    if (el) {
      el.textContent = statusText(s);
      el.dataset.state = s.state;
    }
    const idle = $('#py-idle-status');
    if (idle) {
      idle.textContent = s.state === 'loading' && s.firstLoad ? FIRST_LOAD_NOTE
        : s.state === 'ready' ? `Python ${s.version} is ready${s.loadMs ? ` (loaded in ${(s.loadMs / 1000).toFixed(1)} s)` : ''}.`
          : s.state === 'failed' ? `Python couldn't load: ${s.message}. Reload the page to try again.`
            : statusText(s);
      idle.closest('.py-idle')?.setAttribute('data-state', s.state);
    }
  }
  runner.onStatus(applyStatus);

  const unavailable = (err) => {
    $('#results').innerHTML = `<p class="empty">Python isn't available right now: ${esc(err.message)}</p>`;
    return err;
  };

  return {
    language: 'python',
    fileName: 'solution.py',
    runtimeLabel: 'Python',
    placeholder: `# Write your Python here. ${MOD}+Enter runs it.`,

    async prepare() {
      // Start loading in the background: the page renders now and shows progress in #runtime-status.
      runner.ready(tournamentPackages).catch(() => {});
    },

    yardageHTML(item, note) {
      const extra = packagesFor(item);
      const setup = usesSetup(item) ? firstVisible(item)?.setup : null;
      return `
        <section class="yardage" aria-labelledby="yardage-title">
          <h2 id="yardage-title">📒 Yardage book: what you're working with</h2>
          ${note ? `<p class="yardage-note"><strong>For this problem:</strong> ${note}</p>` : ''}
          ${setup ? `<p class="yardage-sub">Before your code runs, these variables are already defined (example 1):</p>
            <pre class="yardage-code">${esc(setup)}</pre>` : ''}
          <p class="yardage-runtime">Python ${esc(runner.version ?? '3')} runs in your browser (Pyodide).
            ${extra.length ? `Packages: ${extra.map((p) => `<code>${esc(p)}</code>`).join(', ')}.` : 'Standard library only: no packages needed.'}
            No <code>input()</code>: the data comes from ${usesSetup(item) ? 'those variables' : 'your function\'s arguments'}.</p>
        </section>`;
    },

    extraControlsHTML: () => '<button class="btn btn-ghost btn-small" id="restart-btn" type="button" title="Stop Python and start a fresh interpreter">↻ Restart Python</button>',

    mount(root = document) {
      applyStatus(runner.status);
      root.querySelectorAll('.yardage-code').forEach((el) => highlightCode(el, el.textContent, { language: 'python', theme: 'paper' }));
      $('#restart-btn')?.addEventListener('click', () => {
        runner.restart().catch(() => {});
        $('#feedback').innerHTML = '<div class="feedback info"><strong>Python restarted</strong><p>A fresh interpreter is loading. Your code is still in the editor.</p></div>';
      });
    },

    emptyResultsHTML(item) {
      const visible = item.checker.cases.filter((c) => !c.hidden).length;
      const hidden = item.checker.cases.length - visible;
      return `
        <div class="py-idle" data-state="${runner.status.state}">
          <p class="py-idle-status" id="py-idle-status">${runner.status.state === 'ready' ? `Python ${esc(runner.version)} is ready.` : esc(FIRST_LOAD_NOTE)}</p>
          <p class="empty">Run shows what your code prints and the value of its last line. Submit checks it against
            ${visible} example${visible === 1 ? '' : 's'} and ${hidden} hidden test${hidden === 1 ? '' : 's'}.</p>
        </div>`;
    },

    async run(code, item) {
      const setup = usesSetup(item) ? firstVisible(item)?.setup ?? '' : '';
      $('#results').innerHTML = '<p class="empty">Running…</p>';
      let result;
      try {
        result = await runner.run(code, { setup, packages: packagesFor(item) });
      } catch (err) {
        unavailable(err);
        return { lastRun: { kind: 'error', message: err.message, result: null }, feedback: { kind: 'error', title: 'Python isn\'t available', body: `<p>${esc(err.message)}</p>` } };
      }
      if (result.timedOut) {
        $('#results').innerHTML = renderTimeout(result.seconds);
        const message = `Your code ran too long (over ${result.seconds} seconds). Check for an infinite loop.`;
        return { lastRun: { kind: 'error', message, result: { timedOut: true } }, feedback: { kind: 'error', title: 'Lost ball. Your code ran too long', body: `<p>${esc(message)} Python restarted, and your code is still in the editor.</p>` } };
      }
      $('#results').innerHTML = renderRun(result, { inputsNote: setup ? 'Ran with the example 1 inputs from the yardage book.' : '' });
      if (result.error) {
        return {
          lastRun: { kind: 'error', message: result.error.traceback, result },
          feedback: { kind: 'error', title: `Shanked it. ${esc(result.error.type)}`, body: `<p><code>${esc(result.error.summary)}</code></p>` },
        };
      }
      return {
        lastRun: { kind: 'practice', message: '', result },
        feedback: { kind: 'info', title: 'Practice swing', body: '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>' },
      };
    },

    async submit() {
      return { graded: false, ok: false, error: null, message: 'Checking Python answers isn\'t available yet.', lastRun: null };
    },

    contextData: (item) => ({ checker: item.checker, packages: packagesFor(item) }),
  };
}
