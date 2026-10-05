// pandas workspace engine: the Python runner (Pyodide in a Web Worker) with pandas and numpy loaded and the
// tournament's CSV dataset registered, a data panel in the yardage book, DataFrame display, and the DataFrame checker
// (js/lib/pandas-checker.js). See js/ui/engines/index.js for the interface; it builds on js/ui/engines/python.js for
// loading status, Restart, and the editor setup.

import { $, esc } from '../dom.js';
import { MOD } from '../workspace.js';
import { getPythonRunner } from '../../lib/python-runner.js';
import { summarize } from '../../lib/python-engine.js';
import { createWorkspace as createPythonWorkspace } from './python.js';
import { renderTimeout } from '../python-results.js';
import { renderFrameRun, renderFrameCheck, firstFrameFailureText, dataPanelHTML } from '../pandas-results.js';
import { summaryLine } from '../python-results.js';

import { PYTHON } from '../../data/python-config.js';

const PANDAS_PACKAGES = PYTHON.pandasPackages;
const FIRST_LOAD_NOTE = 'Loading Python and pandas for the first time on this page (about 21 MB, cached by your '
  + 'browser after this).';

const unique = (list) => [...new Set(list)];

/** Fetch every variant of a dataset's tables: { variant: { table: csv text } }. */
async function fetchFrames(frames) {
  const base = new URL(`../../data/datasets/${frames.dir}/`, import.meta.url);
  const out = {};
  await Promise.all(frames.variants.map(async (variant) => {
    out[variant] = {};
    await Promise.all(Object.keys(frames.tables).map(async (table) => {
      const res = await fetch(new URL(`${variant}/${table}.csv`, base));
      if (!res.ok) throw new Error(`Couldn't load ${variant}/${table}.csv (${res.status}).`);
      out[variant][table] = await res.text();
    }));
  }));
  return out;
}

export function createWorkspace({ packages: tournamentPackages = [], frames } = {}) {
  if (!frames) throw new Error('pandas problems need a dataset: set `dataset` on the tournament.');
  const runner = getPythonRunner();
  const dataset = frames.dir;
  runner.addDataset(dataset, () => fetchFrames(frames));
  const packages = unique([...PANDAS_PACKAGES, ...tournamentPackages]);
  const base = createPythonWorkspace({ packages, datasets: [dataset], firstLoadNote: FIRST_LOAD_NOTE });

  const keys = new Map(); // reference solution → key for the runner's cache of expected values
  const keyFor = (item) => {
    if (!keys.has(item.solution)) keys.set(item.solution, `frames-${keys.size + 1}`);
    return keys.get(item.solution);
  };
  const packagesFor = (item) => unique([...packages, ...(item.packages ?? [])]);
  const opts = (item) => ({ packages: packagesFor(item), datasets: [dataset] });
  const visibleCase = (item) => item.checker.cases.find((c) => !c.hidden) ?? {};
  const tablesOf = (item) => item.checker.frames;

  // The data panel's descriptions, by visible variant and table list (they never change on a page).
  const described = new Map();
  const describe = (item) => {
    const variant = visibleCase(item).data ?? frames.visible;
    const key = `${variant}:${tablesOf(item).join(',')}`;
    if (!described.has(key)) {
      const p = runner.describe(dataset, variant, tablesOf(item), opts(item)).then((d) => {
        if (d?.timedOut) throw new Error('Describing the data took too long.');
        described.set(key, d);
        return d;
      }, (err) => {
        described.delete(key);
        throw err;
      });
      described.set(key, p);
    }
    return Promise.resolve(described.get(key));
  };
  const describedNow = (item) => {
    const d = described.get(`${visibleCase(item).data ?? frames.visible}:${tablesOf(item).join(',')}`);
    return Array.isArray(d) ? d : null;
  };

  let panelItem = null; // the item whose yardage book was rendered last; mount() fills its data panel

  function fillPanel(item) {
    const panel = $('#data-panel');
    if (!panel) return;
    const key = tablesOf(item).join(',');
    panel.dataset.tables = key;
    describe(item).then((d) => {
      if (panel.isConnected && panel.dataset.tables === key) {
        panel.innerHTML = dataPanelHTML(d, frames.tables);
        panel.setAttribute('aria-busy', 'false');
      }
    }, (err) => {
      if (panel.isConnected) panel.innerHTML = `<p class="empty">The data couldn't be loaded: ${esc(err.message)}</p>`;
    });
  }

  const unavailable = (err) => {
    $('#results').innerHTML = `<p class="empty">Python isn't available right now: ${esc(err.message)}</p>`;
  };

  const signature = (item) => `${item.checker.function}(${[...tablesOf(item), ...(visibleCase(item).args ? [visibleCase(item).args] : [])].join(', ')})`;

  return {
    ...base,
    placeholder: `# Define the function the task asks for. ${MOD}+Enter runs it on the data below.`,

    yardageHTML(item, note) {
      panelItem = item;
      const ready = describedNow(item);
      const extra = packagesFor(item).filter((p) => ![...PANDAS_PACKAGES, 'numpy'].includes(p));
      return `
        <section class="yardage" aria-labelledby="yardage-title">
          <h2 id="yardage-title">📒 Yardage book: the DataFrames you get</h2>
          ${note ? `<p class="yardage-note"><strong>For this problem:</strong> ${note}</p>` : ''}
          <p class="yardage-runtime">Your function is called with fresh copies of ${tablesOf(item).map((n) => `<code>${esc(n)}</code>`).join(', ')}
            (each read with <code>pd.read_csv</code>), so nothing you do to them carries over to the next run.
            <code>pandas as pd</code> and <code>numpy as np</code> are already imported${extra.length ? `, and ${extra.map((p) => `<code>${esc(p)}</code>`).join(', ')} is available` : ''}.
            Submit also runs it on hidden versions of the data.</p>
          <div id="data-panel" class="data-panel" aria-busy="${ready ? 'false' : 'true'}">${ready ? dataPanelHTML(ready, frames.tables)
            : `<p class="empty">Loading pandas to show ${tablesOf(item).map(esc).join(', ')}: shape, dtypes, and the first rows…</p>`}</div>
        </section>`;
    },

    mount(root = document) {
      base.mount(root);
      if (panelItem && $('#data-panel')?.getAttribute('aria-busy') === 'true') fillPanel(panelItem);
    },

    emptyResultsHTML(item) {
      const hidden = item.checker.cases.filter((c) => c.hidden).length;
      const visible = item.checker.cases.length - hidden;
      const state = runner.status.state;
      return `
        <div class="py-idle" data-state="${state}">
          <p class="py-idle-status" id="py-idle-status">${state === 'ready' ? `Python ${esc(runner.version)} is ready.` : esc(FIRST_LOAD_NOTE)}</p>
          <p class="empty">Run shows what your code prints and the value of its last line. If your code only defines
            <code>${esc(item.checker.function)}</code>, Run calls <code>${esc(signature(item))}</code> on the data in the
            yardage book and shows what it returns. Submit checks it on ${visible === 1 ? 'that data' : `${visible} examples`}
            and ${hidden} hidden version${hidden === 1 ? '' : 's'}.</p>
        </div>`;
    },

    async run(code, item) {
      const c = visibleCase(item);
      $('#results').innerHTML = '<p class="empty">Running…</p>';
      let result;
      try {
        result = await runner.runFrames(code, {
          dataset,
          variant: c.data ?? frames.visible,
          frames: tablesOf(item),
          setup: c.setup ?? '',
          call: { function: item.checker.function, args: c.args ?? '' },
        }, opts(item));
      } catch (err) {
        unavailable(err);
        return { lastRun: { kind: 'error', message: err.message, result: null }, feedback: { kind: 'error', title: 'Python isn\'t available', body: `<p>${esc(err.message)}</p>` } };
      }
      if (result.timedOut) {
        $('#results').innerHTML = renderTimeout(result.seconds);
        const message = `Your code ran too long (over ${result.seconds} seconds). Check for an infinite loop, or a Python loop over every row where a vectorized pandas operation would do.`;
        return { lastRun: { kind: 'error', message, result: { timedOut: true } }, feedback: { kind: 'error', title: 'Lost ball. Your code ran too long', body: `<p>${esc(message)} Python restarted, and your code is still in the editor.</p>` } };
      }
      $('#results').innerHTML = renderFrameRun(result, { inputsNote: `Ran with ${tablesOf(item).map((n) => `<code>${esc(n)}</code>`).join(', ')} from the yardage book defined, plus <code>pd</code> and <code>np</code>.` });
      if (result.error) {
        return {
          lastRun: { kind: 'error', message: result.error.traceback, result },
          feedback: { kind: 'error', title: `Shanked it. ${esc(result.error.type)}`, body: `<p><code>${esc(result.error.summary)}</code></p>${result.error.hint ? `<p>${esc(result.error.hint)}</p>` : ''}` },
        };
      }
      return {
        lastRun: { kind: 'practice', message: '', result },
        feedback: { kind: 'info', title: 'Practice swing', body: '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>' },
      };
    },

    async submit(code, item) {
      $('#results').innerHTML = '<p class="empty">Checking…</p>';
      let report;
      try {
        report = await runner.check(keyFor(item), item.solution, code, { ...item.checker, dataset }, opts(item));
      } catch (err) {
        unavailable(err);
        return { graded: false, ok: false, error: err.message, message: `Python isn't available: ${err.message}`, lastRun: null };
      }
      if (report.timedOut) {
        $('#results').innerHTML = renderTimeout(report.seconds);
        const message = `Your code ran too long (over ${report.seconds} seconds). Check for an infinite loop, or a Python loop over every row.`;
        return { graded: true, ok: false, error: message, message, lastRun: { kind: 'error', message, result: { timedOut: true } } };
      }
      const summary = summarize(report);
      $('#results').innerHTML = renderFrameCheck(report, summary, { sorted: item.checker.rowOrder === 'ignore' });
      const message = summary.ok ? `All ${summary.all.total} tests passed.`
        : report.error ? report.error.summary
          : `${summaryLine(summary)}. ${firstFrameFailureText(report)}`;
      return {
        graded: true,
        ok: summary.ok,
        error: report.error ? report.error.summary : null,
        message,
        lastRun: { kind: report.error ? 'error' : summary.ok ? 'correct' : 'wrong', message: report.error ? report.error.traceback : message, result: { tests: report, summary } },
      };
    },

    contextData: (item) => ({
      checker: item.checker,
      packages: packagesFor(item),
      frames: describedNow(item),
      tables: tablesOf(item),
    }),
  };
}
