# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Puttedex** is a Codedex-style, golf-themed learning platform for data science. The goal is concrete: a learner who
plays through the whole tour should be ready to pass technical interviews for data science internships (SQL, Python,
pandas, statistics, A/B testing, ML fundamentals, and interview-style case questions). Content decisions should serve
that goal: favor the patterns interviewers actually ask about over breadth for its own sake.

## Golf theme (use the vocabulary consistently)

| Golf term | Meaning in Puttedex |
| --- | --- |
| Tour schedule | All tournaments in learning order: the top-level roadmap (`index.html`). |
| Tournament | One concept, e.g. "SQL Basics". Up to 18 holes. Each also has a golf-flavored `event` name. |
| Hole | One problem inside a tournament. Slots with no hole defined yet show as locked "coming soon". |
| Course map | The 18 hole slots of one tournament, laid out as a winding course. |
| Par | Target strokes for a hole (usually 2; 3 for harder ones). A tournament's par is the sum over its defined holes. |
| Stroke | One **Submit** ("Take the shot"). A caddie tip (hint) is a one-stroke penalty. **Run** ("Practice swing") is free. |
| Round | One play-through of a tournament's open holes. "Start a new round" archives a completed round (for the best score) and resets the holes. |
| Scorecard | 18-hole card per tournament (front nine "Out", back nine "In"): birdies circled, bogeys boxed, locked slots greyed. |
| Yardage book | The schema reference shown with the problem. |

Visual language: fairway greens, sand/bunker neutrals, a red flag accent, and scorecard-paper cards. Design tokens live
at the top of `css/styles.css`. Lesson examples are highlighted on paper, deliberately unlike the dark editor.

## Hard conventions

- **Static site only.** It's hosted on GitHub Pages. There's no backend, server code, accounts, or network APIs of our
  own. Everything runs in the browser.
- **No build step.** Plain HTML, CSS, and native ES modules. Don't introduce bundlers, frameworks, or transpilers.
  Third-party code is vendored in `vendor/` (loaded with classic `<script>` tags), not fetched from a CDN.
- **SQL runs in-browser via sql.js** (SQLite compiled to WASM, `vendor/sql.js/`, global `initSqlJs`). DuckDB-WASM is
  the approved alternative if a tournament needs analytics features SQLite lacks.
- **The editor is CodeMirror 5** (`vendor/codemirror/`, global `CodeMirror`), wrapped by `js/ui/sql-editor.js`.
- **Python runs in-browser via Pyodide** (planned for the Python tournaments). Load it lazily, only on pages that need
  it; it's large.
- **Content is data.** Tournaments and holes live in `js/data/`. Pages never hard-code a tournament or a hole.
- **Progress lives in `localStorage`** (key `puttedex.progress`, module `js/progress.js`) with JSON export and
  import on the schedule page. If the stored shape changes, bump the version and handle the old one in `migrate()`.
  Never silently drop a learner's progress. Old versions must keep loading, and old export files must keep importing.
- **Hole and tournament `id`s are permanent.** Progress is keyed by `"<tournamentId>/<holeId>"`, so renaming an id
  orphans learners' progress. Titles, order, and wording can change freely.
- **No horizontal page scrolling at any width.** Grid tracks use `minmax(0, …)` (never an implicit `auto` track
  around wide content), and wide things (tables, code) scroll inside their own container. `npm run test:layout`
  enforces this.
- Relative URLs everywhere. The site is served from `/puttedex/` on Pages, not from `/`.

## Commands

```bash
npm run serve        # python3 -m http.server 8000, then open http://localhost:8000
npm test             # node --test: schedule data, every hole against the real SQL engine, progress migration
node --test tests/holes.test.mjs                                    # a single test file
node --test --test-name-pattern="order-limit" "tests/*.test.mjs"    # tests whose name matches
npm run test:layout  # headless Chrome at 7 widths: fails if any page scrolls horizontally (CHROME=… to override)
```

ES modules and WASM don't load from `file://`, so always use a local server. There are no npm dependencies; `package.json`
exists only for the scripts. `npm test` runs in CI; `test:layout` is local only (it needs Chrome).

## Architecture

Pages (each an HTML shell plus a module in `js/pages/`):

| URL | Module | Shows |
| --- | --- | --- |
| `index.html` | `schedule.js` | Tour schedule roadmap, hero call to action, locker room (export/import/reset) |
| `tournament.html?t=<id>` | `tournament.js` | Description, skills, stat tiles (holes open, par, progress, this round, best round), 18-hole scorecard, new round |
| `course.html?t=<id>` | `course-map.js` | Course map of the 18 hole slots. Also redirects v1 links `course.html?hole=<id>&shot=<n>` |
| `hole.html?t=<id>&h=<n>` | `hole.js` | Problem view: hole list, then problem + yardage book, then editor + feedback + results. `n` is 1-based. |

- `js/tournaments.js` is the only module that reads `js/data/`. `loadTournament(meta)` resolves a schedule entry into
  `{ ...meta, number, holes, seed, par }` by dynamically importing `js/data/holes/<holeSet>.js` and
  `js/data/datasets/<dataset>.js`. It also exports `urls.*` builders; use them instead of hand-written URLs.
- **Answer checking** (`js/lib/`): `sql-runner.js` runs a query against a *fresh* database built from the dataset's
  `SEED`, so learners can't corrupt state between runs. It returns the last statement's result set. `compare.js`
  compares the learner's result with the result of the hole's reference `solution`. Expected results are never
  hard-coded. It compares values (not column names) with float tolerance. **Column order is graded**, and row order
  is graded only when the hole sets `orderMatters: true`. Both modules are DOM-free and take the `SQL` object as a
  parameter, so the Node tests exercise exactly the browser code path.
- `js/progress.js`: holes' strokes/hints/solved/draft code, per-tournament archived rounds, `roundSummary()`,
  `bestRound()`, `startNewRound()`, and `migrate()` for v1 → v2 (v1 said "shots" and used key `puttedex.progress.v1`,
  which is kept as a backup). `RETIRED_PREFILLS` drops drafts that equal code the first version prefilled.
- `js/ui/`: `dom.js` (`esc`: use it for every learner- or data-derived string put into HTML; icons; `crumbs`;
  `scoreMark`), `scorecard.js` (the 18-hole card), and `sql-editor.js` (CodeMirror setup and read-only highlighting).
- `vendor/sql.js/package.json` marks that folder CommonJS so Node can `require()` the UMD build while the root package
  is `"type": "module"`.

## How to add a tournament

1. Add an entry to `TOURNAMENTS` in `js/data/tournaments.js`, at its place in the learning order. Fill in `id`,
   `title`, `event`, `blurb`, `description`, `skills`, and `engine`, plus `dataset` for SQL. Set `holeSet: null`. It
   now appears on the schedule, and its tournament page and course map say "coming soon".
2. To open it, create `js/data/holes/<name>.js` (see below) and set `holeSet: '<name>'`.
3. A new SQL dataset goes in `js/data/datasets/<name>.js` and exports `SEED` (schema + inserts). Keep it deterministic.
4. Run `npm test`. `tests/tournaments.test.mjs` checks the entry's fields and that it loads.

Tournaments whose engine isn't `'sql'` can be listed but not opened yet: `hole.html` only knows how to run SQL.

## How to add a hole

Append an object to the array in `js/data/holes/<holeSet>.js`. Array position is the hole number, and there are at
most 18. The fields are documented at the top of that file:

- `id` (permanent, kebab-case), `title`, `par`, `lesson` (HTML), `task` (HTML), `solution`, `hint`, and optionally
  `orderMatters`.
- The **task must spell out everything the checker grades**: exactly which columns, **in what order**, any rounding,
  and, if `orderMatters`, the sort order including tie-breaks. The checker compares against the solution's result, so
  anything the task leaves open must not change that result.
- `solution` is shown to learners as "the pro's line": one clause per line (`SELECT`, `FROM`, `JOIN`, `WHERE`,
  `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`), no surrounding whitespace. Tests enforce this.
- No starter code: the editor always opens blank (tests reject a `starter` field).
- `alternatives`: at least one differently written correct answer the checker must accept.
- `mistakes`: at least one realistic wrong answer the checker must reject. If the dataset can't tell a mistake apart
  from the solution, change the task or pick a different mistake. Don't weaken the test.
- Lesson examples should use a different table or column than the task, so they teach without giving the answer.

Then run `npm test`. Also run `npm run test:layout` if you touched layout, and look at the hole at 1440, 1280, and 390px.

## Deployment

`.github/workflows/pages.yml` runs on every push to `main` (tests only on pull requests). It runs `npm test`, copies
only the site files (`*.html`, `css/`, `js/`, `vendor/`, `.nojekyll`) into `_site/`, and deploys with
`actions/deploy-pages`. The repository's Pages source must be set to **GitHub Actions**. If you add a new top-level
folder the site needs, add it to the copy step.
