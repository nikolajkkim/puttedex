// Runs and checks Python code inside a loaded Pyodide instance. DOM-free and worker-free: the browser calls it from
// js/lib/python-worker.js, and the Node tests call it directly with the same vendored Pyodide, so tests exercise
// exactly the code path the browser uses (like js/lib/sql-runner.js for SQL).
//
// Checker (declared per hole or range problem in its data file):
//   { type: 'function', function: 'name', cases, noMutation?, compare? }   call name(*args) and compare the return
//   { type: 'stdout', cases }                                              compare printed output
//   { type: 'value', variable: 'name', cases, compare? }                   compare a variable the code creates
// Each case is { args } (function: Python source of the arguments, keywords allowed, e.g. "[72, 68], par=70") or
// { setup } (stdout and
// value: Python source run first, defining the inputs), plus optional hidden: true and label. Expected values are
// never written in the data: they come from running the reference solution on the same case.
// compare: 'unordered' ignores the order of a returned list or tuple.

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

    /**
     * Compute (and keep, under `key`) the reference solution's result for every case of `checker`.
     * Returns the expected values as display strings. Throws if the solution itself fails a case.
     */
    prepare(key, solution, checker) {
      return JSON.parse(call('prepare_expected', key, solution, JSON.stringify(checker)));
    },

    /**
     * Check code against every case (prepare(key, …) must have run first).
     * → { cases: [{ visible, label, input, ok, reason, message, expected, got, traceback? }], error, stdout, truncated }
     * Hidden cases carry no expected or got value.
     */
    check(key, code, checker) {
      return JSON.parse(call('check_code', key, code, JSON.stringify(checker)));
    },
  };
}

/** Summary counts of a check report. */
export function summarize(report) {
  const count = (list) => ({ passed: list.filter((c) => c.ok).length, total: list.length });
  const visible = report.cases.filter((c) => c.visible);
  const hidden = report.cases.filter((c) => !c.visible);
  return {
    ok: report.cases.length > 0 && report.cases.every((c) => c.ok),
    all: count(report.cases),
    visible: count(visible),
    hidden: count(hidden),
    firstHiddenFailure: hidden.find((c) => !c.ok) ?? null,
  };
}
