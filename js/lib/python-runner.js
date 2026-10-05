// Main-thread side of the Python runner. One worker (js/lib/python-worker.js) per page, created on first use, so
// Pyodide only loads when a Python problem opens. It stays loaded while you move between holes on the same page, and
// the browser's HTTP cache makes later page loads much faster than the first.
//
//   const runner = getPythonRunner();
//   runner.onStatus((s) => …)      // { state: 'idle' | 'loading' | 'ready' | 'busy' | 'restarting' | 'failed', … }
//   await runner.ready(['numpy'])  // load Pyodide plus extra packages (cached per worker)
//   await runner.run(code, setup)  // → { stdout, stderr, truncated, value, error } or { timedOut: true }
//   await runner.check(key, solution, code, checker)  // → check report or { timedOut: true }
//   runner.restart()               // throw the interpreter away; the next request starts a fresh one
//
// pandas problems also use DataFrame datasets:
//   runner.addDataset(name, load)  // load: async () => ({ variant: { table: csv text } }), called once per page
//   await runner.ready(['pandas'], [name])   // packages, then the dataset's tables (again after any restart)
//   await runner.runFrames(code, options, { packages, datasets })   // Run with the tables defined
//   await runner.describe(name, variant, tables, { packages, datasets })   // the data panel
//
// A request that takes longer than PYTHON.timeoutMs kills the worker (the only way to stop a busy WebAssembly
// thread without cross-origin isolation, which GitHub Pages can't provide) and resolves { timedOut: true }.

import { PYTHON } from '../data/python-config.js';

let shared = null;

/** The page's Python runner (created lazily). */
export function getPythonRunner() {
  shared ??= new PythonRunner();
  return shared;
}

export class PythonRunner {
  constructor({ timeoutMs = PYTHON.timeoutMs } = {}) {
    this.timeoutMs = timeoutMs;
    this.worker = null;
    this.booting = null; // promise for { version } of the current worker
    this.packages = new Set(); // loaded in the current worker
    this.prepared = new Set(); // checker keys whose expected values the current worker holds
    this.datasets = new Map(); // name → promise of { variant: { table: csv } } (fetched once per page)
    this.loadedData = new Set(); // dataset names registered in the current worker
    this.pending = new Map();
    this.nextId = 1;
    this.listeners = new Set();
    this.status = { state: 'idle' };
    this.version = null;
    this.loadedOnce = false;
    this.chain = Promise.resolve(); // requests run one at a time
  }

  onStatus(fn) {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  setStatus(status) {
    this.status = { version: this.version, ...status };
    this.listeners.forEach((fn) => fn(this.status));
  }

  spawn() {
    this.worker = new Worker(new URL('./python-worker.js', import.meta.url), { type: 'module', name: 'python' });
    this.worker.addEventListener('message', ({ data }) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.ok) p.resolve(data.value);
      else p.reject(new Error(data.error));
    });
    this.worker.addEventListener('error', (e) => {
      const err = new Error(e.message || 'The Python worker failed to start.');
      this.pending.forEach((p) => p.reject(err));
      this.pending.clear();
    });
    this.packages = new Set();
    this.prepared = new Set();
    this.loadedData = new Set();
    const started = performance.now();
    const restarting = this.loadedOnce;
    this.setStatus({ state: restarting ? 'restarting' : 'loading', firstLoad: !restarting });
    this.booting = this.send('init').then((info) => {
      this.version = info.version;
      this.loadedOnce = true;
      this.setStatus({ state: 'ready', loadMs: Math.round(performance.now() - started), restarted: restarting });
      return info;
    }, (err) => {
      this.setStatus({ state: 'failed', message: err.message });
      this.kill();
      throw err;
    });
  }

  send(op, args = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, op, ...args });
    });
  }

  kill() {
    this.worker?.terminate();
    this.worker = null;
    this.booting = null;
    const err = new Error('Python was restarted.');
    this.pending.forEach((p) => p.reject(err));
    this.pending.clear();
  }

  /** Throw the interpreter away and start loading a fresh one. */
  restart() {
    this.kill();
    this.spawn();
    return this.booting;
  }

  /** Register a dataset by name. `load` fetches its CSV texts; it runs once, on first use. */
  addDataset(name, load) {
    if (!this.datasets.has(name)) {
      let promise = null;
      this.datasets.set(name, () => {
        promise ??= load().catch((err) => {
          promise = null; // let a later request retry
          throw err;
        });
        return promise;
      });
    }
  }

  /** Load Pyodide (once), any extra packages, and datasets. Never counts toward a request's timeout. */
  async ready(packages = [], datasets = []) {
    if (!this.worker) this.spawn();
    await this.booting;
    const missing = packages.filter((p) => !this.packages.has(p));
    if (missing.length) {
      this.setStatus({ state: 'loading', packages: missing });
      await this.send('packages', { names: missing });
      missing.forEach((p) => this.packages.add(p));
      this.setStatus({ state: 'ready' });
    }
    for (const name of datasets.filter((d) => !this.loadedData.has(d))) {
      const load = this.datasets.get(name);
      if (!load) throw new Error(`Unknown dataset "${name}".`);
      this.setStatus({ state: 'loading', data: name });
      const variants = await load();
      for (const [variant, tables] of Object.entries(variants)) await this.send('data', { name, variant, tables });
      this.loadedData.add(name);
      this.setStatus({ state: 'ready' });
    }
  }

  /** Run one request with the timeout; requests are serialized. */
  timed(op, args, { packages = [], datasets = [], before } = {}) {
    const job = this.chain.then(async () => {
      await this.ready(packages, datasets);
      if (before) await before();
      this.setStatus({ state: 'busy' });
      let timer;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true, seconds: this.timeoutMs / 1000 }), this.timeoutMs);
      });
      try {
        const result = await Promise.race([this.send(op, args), timeout]);
        if (result?.timedOut) {
          this.kill();
          this.spawn(); // start reloading right away, so the next run is ready sooner
          this.booting.catch(() => {});
        } else {
          this.setStatus({ state: 'ready' });
        }
        return result;
      } finally {
        clearTimeout(timer);
      }
    });
    this.chain = job.catch(() => {});
    return job;
  }

  /** Run code (after `setup`) in a fresh namespace. */
  run(code, { setup = '', packages = [] } = {}) {
    return this.timed('run', { code, setup }, { packages });
  }

  /** Run code with a dataset's tables defined (see runFrames in js/lib/python-engine.js). */
  runFrames(code, options, { packages = [], datasets = [] } = {}) {
    return this.timed('runFrames', { code, options }, { packages, datasets });
  }

  /** Describe tables for the data panel. Waits for loading, then runs like a (quick) request. */
  describe(dataset, variant, tables, { packages = [], datasets = [] } = {}) {
    return this.timed('describe', { dataset, variant, tables }, { packages, datasets });
  }

  /**
   * Check code against a checker. The reference solution's results are computed once per worker (keyed by `key`)
   * before the timed check, so only the learner's code counts toward the time limit.
   */
  check(key, solution, code, checker, { packages = [], datasets = [] } = {}) {
    return this.timed('check', { key, code, checker }, {
      packages,
      datasets,
      before: async () => {
        if (this.prepared.has(key)) return;
        await this.send('prepare', { key, solution, checker });
        this.prepared.add(key);
      },
    });
  }
}
