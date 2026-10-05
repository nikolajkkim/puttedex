import { createRequire } from 'node:module';
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
