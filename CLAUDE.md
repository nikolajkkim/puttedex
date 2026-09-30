# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Puttedex** is a Codedex-style, golf-themed learning platform for data science. The goal is concrete: a learner who
plays through every course should be ready to pass technical interviews for data science internships (SQL, Python,
pandas, statistics, A/B testing, ML fundamentals, and interview-style case questions). Content decisions should serve
that goal: favor the patterns interviewers actually ask about over breadth for its own sake.

## Golf theme (use the vocabulary consistently)

| Golf term | Meaning in Puttedex |
| --- | --- |
| Hole | One course (e.g. "SQL Basics"). The roadmap is a course map of holes; the first nine are the "front nine". |
| Shot | One exercise inside a hole. |
| Par | Target number of strokes for a shot (usually 2, 3 for harder shots). A hole's par is the sum of its shots' pars. |
| Stroke | One **Submit** ("Take the shot"). A caddie tip (hint) is a one-stroke penalty. **Run** ("Practice swing") is free. |
| Scorecard | Progress view. Strokes vs. par per hole; birdies circled, bogeys boxed, "thru N" for holes in progress. |
| Yardage book | The schema reference shown next to SQL exercises. |

Visual language: fairway greens, sand/bunker neutrals, a red flag accent, and scorecard-paper cards. Design tokens live
at the top of `css/styles.css`.

## Hard conventions

- **Static site only.** It's hosted on GitHub Pages. There's no backend, server code, accounts, or network APIs of our
  own. Everything runs in the browser.
- **No build step.** Plain HTML, CSS, and native ES modules. Don't introduce bundlers, frameworks, or transpilers.
- **SQL runs in-browser via sql.js** (SQLite compiled to WASM), vendored in `vendor/sql.js/` (loaded with a classic
  `<script>` tag that defines the global `initSqlJs`). DuckDB-WASM is the approved alternative if a course needs
  analytics features SQLite lacks.
- **Python runs in-browser via Pyodide** (planned for the Python/pandas holes). Load it lazily, only on pages that
  need it; it's large.
- **Progress lives in `localStorage`** (key `puttedex.progress.v1`, module `js/progress.js`) with JSON export and
  import on the home page. If the stored shape changes, bump the version and migrate in `normalize()`. Never silently
  drop a learner's progress.
- Relative URLs everywhere. The site is served from `/puttedex/` on Pages, not from `/`.

## Commands

```bash
npm run serve        # python3 -m http.server 8000, then open http://localhost:8000
npm test             # node --test: validates every course's exercises against the real SQL engine
node --test tests/sql-basics.test.mjs   # a single test file
node --test --test-name-pattern="order-limit" "tests/*.test.mjs"  # tests whose name matches
```

ES modules and WASM don't load from `file://`, so always use a local server. There are no npm dependencies; `package.json`
exists only for the scripts.

## Architecture

- `index.html` + `js/pages/home.js`: the clubhouse. Renders the course map (roadmap), the front-nine scorecard, and
  progress export/import/reset.
- `course.html` + `js/pages/course.js`: the exercise player, addressed as `course.html?hole=<courseId>&shot=<n>`
  (1-based). Sidebar shot list, lesson, editor, Run/Submit/Hint, results table, and yardage book.
- `js/courses/index.js`: the catalog of holes shown on the roadmap. A hole with a `load()` is playable; one without it
  shows "coming soon". To add a course: create `js/courses/<id>.js` exporting `{ id, title, engine, seed, shots }`, and
  point the catalog entry's `load()` at it.
- **Answer checking** (`js/lib/`): `sql-runner.js` runs a query against a *fresh* database built from the course's
  seed SQL, so learners can't corrupt state between runs. It returns the last statement's result set.
  `compare.js` compares the learner's result with the result of the shot's reference `solution`. Expected
  results are never hard-coded. It compares values, not column names, with float tolerance, and ignores row order
  unless the shot sets `orderMatters: true`. Both modules are DOM-free and dependency-injected (they take the
  `SQL` object), so the Node tests exercise exactly the browser code path.
- `js/data/clubhouse-db.js`: the golf dataset (`players`, `courses`, `rounds`) shared by the SQL courses. It's
  generated once and then hand-edited. Changing it changes expected answers, so run `npm test` afterward.
- `js/ui/dom.js`: shared escaping (`esc`, use it for every learner- or data-derived string put into HTML), icons, and the scorecard `scoreMark`.
- `vendor/sql.js/package.json` marks that folder CommonJS so Node can `require()` the UMD build while the root package
  is `"type": "module"`.

## Tests and shot invariants

`tests/` checks every shot: the solution runs and returns rows, the starter code doesn't already pass, the declared
`mistakes` (common wrong answers) are rejected, and ids are unique. When you write a new shot, add at least one
realistic mistake so the checker is proven to discriminate.

## Deployment

`.github/workflows/pages.yml` runs on every push to `main`. It runs `npm test`, copies only the site files
(`index.html`, `course.html`, `css/`, `js/`, `vendor/`, `.nojekyll`) into `_site/`, and deploys with
`actions/deploy-pages`. The repository's Pages source must be set to **GitHub Actions**. If you add a new top-level
site file or folder, add it to the copy step.
