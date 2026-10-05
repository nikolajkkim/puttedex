import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadSqlJs } from '../js/lib/sql-runner.js';

const require = createRequire(import.meta.url);

/** The same sql.js build the browser loads, from vendor/. */
export const getSql = () => loadSqlJs(require('../vendor/sql.js/sql-wasm.js'));

let python = null;
/**
 * The Python engine (js/lib/python-engine.js) on the same vendored Pyodide the browser's worker loads.
 * Loaded once per test process.
 */
export function getPython() {
  python ??= (async () => {
    const { loadPyodide } = await import('../vendor/pyodide/pyodide.mjs');
    const { createPythonEngine } = await import('../js/lib/python-engine.js');
    const pyodide = await loadPyodide({ indexURL: new URL('../vendor/pyodide/', import.meta.url).pathname });
    return createPythonEngine(pyodide);
  })();
  return python;
}

let pandas = null;
/**
 * The Python engine with pandas loaded and the pandas tournament's dataset registered (every variant), as the
 * browser's pandas workspace does it. Loaded once per test process.
 */
export function getPandas() {
  pandas ??= (async () => {
    const py = await getPython();
    const { FRAMES } = await import('../js/data/datasets/clubhouse-csv.js');
    await py.loadPackages(['pandas']);
    for (const variant of FRAMES.variants) {
      const tables = Object.fromEntries(Object.keys(FRAMES.tables).map((t) => [t,
        readFileSync(new URL(`../js/data/datasets/${FRAMES.dir}/${variant}/${t}.csv`, import.meta.url), 'utf8')]));
      py.loadData(FRAMES.dir, variant, tables);
    }
    return { py, dataset: FRAMES.dir, FRAMES };
  })();
  return pandas;
}
