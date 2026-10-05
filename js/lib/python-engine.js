// Runs and checks Python code inside a loaded Pyodide instance. DOM-free and worker-free: the browser calls it from
// js/lib/python-worker.js, and the Node tests call it directly with the same vendored Pyodide, so tests exercise
// exactly the code path the browser uses (like js/lib/sql-runner.js for SQL).

import { HARNESS_PY } from './python-harness.js';
import { PYTHON } from '../data/python-config.js';

/** Wrap a loaded Pyodide. Returns the engine API; every method is synchronous except loadPackages. */
export function createPythonEngine(pyodide, { limits = PYTHON.limits, richModules = PYTHON.richDisplayModules } = {}) {
  const ns = pyodide.globals.get('dict')();
  pyodide.runPython(HARNESS_PY, { globals: ns });
  const call = (name, ...args) => {
    const fn = ns.get(name);
    try {
      return fn(...args);
    } finally {
      fn.destroy();
    }
  };
  call('configure', JSON.stringify({ limits, rich_modules: richModules }));
  const loaded = new Set();
  const version = pyodide.runPython('import sys; ".".join(map(str, sys.version_info[:3]))');

  return {
    version,

    /** Load extra Pyodide packages (e.g. ['numpy', 'pandas']) once each. */
    async loadPackages(names = []) {
      const missing = names.filter((n) => !loaded.has(n));
      if (missing.length === 0) return;
      await pyodide.loadPackage(missing, { messageCallback: () => {}, errorCallback: () => {} });
      missing.forEach((n) => loaded.add(n));
    },

    /** Run code in a fresh namespace after `setup`. → { stdout, stderr, truncated, value: { repr, html, type } | null, error } */
    run(code, setup = '') {
      return JSON.parse(call('run_code', code, setup));
    },

  };
}

