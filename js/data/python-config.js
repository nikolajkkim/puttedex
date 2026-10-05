// Python runner settings (Pyodide). The runner is js/lib/python-runner.js; this is the one place to tune it.

export const PYTHON = {
  // Where the vendored Pyodide lives, relative to js/lib/ (the worker's folder). Packages listed in a tournament's
  // or problem's `packages` load from here too, so their wheels must be vendored alongside (see CLAUDE.md).
  pyodideDir: '../../vendor/pyodide/',
  // A Run or Submit that takes longer than this is stopped, and the Python worker restarts.
  timeoutMs: 5000,
  limits: {
    output: 20000, // characters of printed output kept per run (more is cut off, with a note)
    repr: 400, // characters of a value's repr shown for return values and the last expression
    frames: 8, // traceback lines kept from the learner's own code
  },
  // Values from these modules may render as HTML (their _repr_html_) in Run's output, e.g. pandas DataFrames.
  // Anything else is shown as its repr.
  richDisplayModules: ['pandas'],
};
