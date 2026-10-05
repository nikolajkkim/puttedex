// SQL workspace engine (sql.js): runs queries against a fresh copy of the dataset and grades result sets.
// See js/ui/engines/index.js for the interface.

import { $, esc } from '../dom.js';
import { loadSqlJs, runQuery, describeSchema } from '../../lib/sql-runner.js';
import { compareResults } from '../../lib/compare.js';
import { MOD, renderTable, yardageBookHTML } from '../workspace.js';

export function createWorkspace({ seed }) {
  let SQL = null;
  let schema = [];
  const expectedCache = new Map();
  const expectedFor = (item) => {
    if (!expectedCache.has(item.solution)) expectedCache.set(item.solution, runQuery(SQL, seed, item.solution));
    return expectedCache.get(item.solution);
  };

  /** Run `code` against a fresh database and render the results. Returns { result } or { error }. */
  const execute = (code) => {
    try {
      const result = runQuery(SQL, seed, code);
      $('#results').innerHTML = renderTable(result);
      return { result };
    } catch (err) {
      $('#results').innerHTML = '<p class="empty">No results. Fix the error above and swing again.</p>';
      return { error: err.message };
    }
  };

  return {
    language: 'sql',
    fileName: 'query.sql',
    runtimeLabel: 'SQLite',
    placeholder: `-- Write your SQL here. ${MOD}+Enter runs it.`,

    async prepare() {
      SQL = await loadSqlJs(window.initSqlJs, (file) => `vendor/sql.js/${file}`);
      schema = describeSchema(SQL, seed);
    },

    yardageHTML: (item, note) => yardageBookHTML(schema, note),
    extraControlsHTML: () => '',
    mount() {},
    emptyResultsHTML: () => '<p class="empty">Run a query to see its results here.</p>',

    async run(code) {
      const { result, error } = execute(code);
      return error
        ? {
          lastRun: { kind: 'error', message: error, result: null },
          feedback: { kind: 'error', title: 'Shanked it. SQL error', body: `<p><code>${esc(error)}</code></p>` },
        }
        : {
          lastRun: { kind: 'practice', message: '', result },
          feedback: { kind: 'info', title: 'Practice swing', body: '<p>That one didn\'t count. Submit when you\'re ready to take the shot.</p>' },
        };
    },

    async submit(code, item) {
      const { result, error } = execute(code);
      const verdict = error
        ? { ok: false, message: `SQL error: ${error}` }
        : compareResults(result, expectedFor(item), { orderMatters: item.orderMatters });
      return {
        graded: true,
        ok: verdict.ok,
        error: error ?? null,
        message: verdict.message,
        lastRun: error ? { kind: 'error', message: error, result: null } : { kind: verdict.ok ? 'correct' : 'wrong', message: verdict.message, result },
      };
    },

    contextData: (item) => ({ SQL, seed, referenceSql: item.solution }),
  };
}
