// The Python worker: owns one Pyodide interpreter, off the main thread, so a runaway loop can't freeze the page.
// js/lib/python-runner.js creates it (as a module worker; Pyodide doesn't support classic workers), sends requests,
// and terminates it on timeout. Requests are handled one at a time, in order.
//
// Messages in:  { id, op: 'init' | 'packages' | 'data' | 'describe' | 'run' | 'runFrames' | 'prepare' | 'check', ...args }
// Messages out: { id, ok: true, value } or { id, ok: false, error: message }

import { loadPyodide } from '../../vendor/pyodide/pyodide.mjs';
import { createPythonEngine } from './python-engine.js';
import { PYTHON } from '../data/python-config.js';

let enginePromise = null;

function engine() {
  enginePromise ??= (async () => {
    const pyodide = await loadPyodide({
      indexURL: new URL(PYTHON.pyodideDir, import.meta.url).href,
      stdout: () => {},
      stderr: () => {},
    });
    return createPythonEngine(pyodide);
  })();
  return enginePromise;
}

const OPS = {
  init: async () => ({ version: (await engine()).version }),
  packages: async ({ names }) => (await engine()).loadPackages(names),
  data: async ({ name, variant, tables }) => (await engine()).loadData(name, variant, tables),
  describe: async ({ dataset, variant, tables }) => (await engine()).describeFrames(dataset, variant, tables),
  run: async ({ code, setup }) => (await engine()).run(code, setup),
  runFrames: async ({ code, options }) => (await engine()).runFrames(code, options),
  prepare: async ({ key, solution, checker }) => (await engine()).prepare(key, solution, checker),
  check: async ({ key, code, checker }) => (await engine()).check(key, code, checker),
};

let queue = Promise.resolve();
self.addEventListener('message', ({ data }) => {
  queue = queue.then(async () => {
    try {
      self.postMessage({ id: data.id, ok: true, value: await OPS[data.op](data) });
    } catch (err) {
      self.postMessage({ id: data.id, ok: false, error: err?.message ?? String(err) });
    }
  });
});
