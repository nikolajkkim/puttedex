// Workspace engines: what a problem view needs from a runner type (SQL, Python, …). The hole view and the Driving
// Range problem view are engine-agnostic; they call one of these by the problem's `engine` (its tournament's engine).
// Each engine module is loaded on demand, so a SQL page never downloads the Python runner and vice versa.
//
// createWorkspace({ seed, packages, frames }) returns (seed: the SQL dataset; frames: the pandas dataset's FRAMES
// manifest, js/data/datasets/<name>.js; packages: the tournament's extra Pyodide packages):
//   language, fileName, runtimeLabel, placeholder   editor setup (language is a key of LANGUAGES in js/ui/editor.js)
//   prepare()                     Promise: load the runtime. SQL waits for it; Python resolves at once and keeps
//                                 loading in the background, showing its progress in #runtime-status.
//   yardageHTML(item, note)       the yardage book for this item
//   extraControlsHTML() / mount() engine-specific controls in the editor's action row (Python: Restart)
//   emptyResultsHTML(item)        the results panel before the first run
//   run(code, item)               → { lastRun, feedback: { kind, title, body } }; renders #results
//   submit(code, item)            → { graded, ok, error, message, lastRun }; renders #results. graded: false means
//                                 the runtime couldn't check it (no stroke should be charged).
//   contextData(item)             engine-specific inputs for the Copy context builder (ctx.data)

const MODULES = {
  sql: () => import('./sql.js'),
  python: () => import('./python.js'),
  pandas: () => import('./pandas.js'),
};

export const hasEngine = (name) => name in MODULES;

export async function createWorkspace(name, options) {
  if (!hasEngine(name)) throw new Error(`No runner for "${name}" problems yet.`);
  return (await MODULES[name]()).createWorkspace(options);
}
