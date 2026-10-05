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
| Course map | The 18 hole slots of one tournament, laid out as a winding course, shown on the tournament page (`#holes`). |
| Par | Target strokes for a hole or range problem: **Par 1 for easy, Par 2 for medium and hard**, computed from its `difficulty` (see "Difficulty and par"). A tournament's par is the sum over its defined holes. |
| Stroke | One **Submit** ("Take the shot"). A caddie tip (hint) is a one-stroke penalty. **Run** ("Practice swing") is free. |
| Round | One play-through of a tournament's open holes. "Start a new round" archives a completed round (for the best score) and resets the holes. |
| Scorecard | 18-hole card per tournament (front nine "Out", back nine "In"): birdies circled, bogeys boxed, locked slots greyed. |
| Yardage book | The reference shown with the problem: the schema (SQL), or the inputs and runtime (Python). |

Visual language: fairway greens, sand/bunker neutrals, a red flag accent, and scorecard-paper cards. Design tokens live
at the top of `css/styles.css`. Lesson examples are highlighted on paper, deliberately unlike the dark editor.

## Hard conventions

- **Static site only.** It's hosted on GitHub Pages. There's no backend, server code, accounts, or network APIs of our
  own. Everything runs in the browser.
- **No build step.** Plain HTML, CSS, and native ES modules. Don't introduce bundlers, frameworks, or transpilers.
  Third-party code is vendored in `vendor/` (loaded with classic `<script>` tags), not fetched from a CDN.
- **SQL runs in-browser via sql.js** (SQLite compiled to WASM, `vendor/sql.js/`, global `initSqlJs`). DuckDB-WASM is
  the approved alternative if a tournament needs analytics features SQLite lacks.
- **The editor is CodeMirror 5** (`vendor/codemirror/`, global `CodeMirror`, SQL and Python modes), wrapped by
  `js/ui/editor.js`.
- **Python runs in-browser via Pyodide** (`vendor/pyodide/`, version in `VERSION`, about 13 MB), inside a module Web
  Worker. It's loaded lazily: only a page showing a Python problem starts it. Never load it on SQL pages.
- **Content is data.** Tournaments and holes live in `js/data/`. Pages never hard-code a tournament or a hole.
- **Progress lives in `localStorage`** (key `puttedex.progress`, module `js/progress.js`, tournaments and the
  Driving Range alike) with JSON export and
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
npm test             # node --test: schedule data, every hole against the real engine (sql.js / Pyodide), progress
node --test tests/holes.test.mjs                                    # a single test file
node --test --test-name-pattern="order-limit" "tests/*.test.mjs"    # tests whose name matches
npm run test:layout  # headless Chrome at 7 widths: fails if any page scrolls horizontally (CHROME=… to override)
```

ES modules and WASM don't load from `file://`, so always use a local server. There are no npm dependencies; `package.json`
exists only for the scripts. The tests load the vendored Pyodide in Node directly (about a second). `npm test` runs in
CI; `test:layout` is local only (it needs Chrome).

## Architecture

Navigation has two levels above the problem view: **tour schedule → tournament page → hole**. There is no separate
course map page. The course map is a section of the tournament page. The **Driving Range** (header link) is a
separate practice area: **range home → range problem**.

Pages (each an HTML shell plus a module in `js/pages/`):

| URL | Module | Shows |
| --- | --- | --- |
| `index.html` | `schedule.js` | Tour schedule roadmap, hero call to action, locker room (export/import/reset) |
| `tournament.html?t=<id>` | `tournament.js` | Details (description, skills, stat tiles: holes open, par, progress, this round, best round), the 18-hole scorecard, then the course map of all 18 slots (`#holes`). Clicking a hole opens the problem view. |
| `hole.html?t=<id>&h=<n>` | `hole.js` | Problem view: sidebar hole list (jump between holes), then problem + yardage book, then editor + feedback + results. `n` is 1-based. Breadcrumb: Schedule › tournament › Hole n. |
| `range.html` | `range.js` | Driving Range home: Mixed Bag / Timed Round / Drill buttons, a live round or the last round's scorecard (`#timed-round`), rough spots, filters (tournament, topic, difficulty, status, search; kept in the URL), and the problem table |
| `practice.html?p=<tournament>/<id>` | `practice.js` | Range problem view: task, tags, stats, optional caddie tip, pro's line (locked until solved or 3 misses), yardage book, prev/next within the range's filters (carried in the URL); timed-round banner |

`course.html` is not a page. It's a redirect stub that keeps old links working: `course.html?t=<id>` (the former
course map) goes to `tournament.html?t=<id>#holes`, and v1's `course.html?hole=<id>&shot=<n>` goes to the hole.

- `js/tournaments.js` is the only module that reads `js/data/`. `loadTournament(meta)` resolves a schedule entry into
  `{ ...meta, number, holes, seed, par }` by dynamically importing `js/data/holes/<holeSet>.js` and
  `js/data/datasets/<dataset>.js`. It also exports `urls.*` builders; use them instead of hand-written URLs.
- **Answer checking** (`js/lib/`): `sql-runner.js` runs a query against a *fresh* database built from the dataset's
  `SEED`, so learners can't corrupt state between runs. It returns the last statement's result set. `compare.js`
  compares the learner's result with the result of the hole's reference `solution`. Expected results are never
  hard-coded. It compares values (not column names) with float tolerance. **Column order is graded**, and row order
  is graded only when the hole sets `orderMatters: true`. Both modules are DOM-free and take the `SQL` object as a
  parameter, so the Node tests exercise exactly the browser code path.
- `js/progress.js` (storage, v4): holes' strokes/hints/solved/draft code, per-tournament archived rounds,
  `roundSummary()`, `bestRound()`, `startNewRound()`, range records (`getRangeRecord` / `updateRangeRecord`, fields
  in `blankRange()`), and `migrate()`: v1 ("shots", key `puttedex.progress.v1`, kept as a backup), v2 (no range),
  and v3 (archived rounds stored a par) still load and import. Only strokes are stored; anything relative to par is
  computed at display time from the current par rule. `RETIRED_PREFILLS` drops drafts that equal code the first version prefilled.
- `js/range.js`: the Driving Range's rules. It loads problems, then handles unlock state, status and the review
  queue, `recordSubmit`/`recordHint`, the solution unlock, struggle scores, filters and prev/next, Mixed Bag / Drill /
  timed-round picks, and timed-round state. Every function takes `now` (and `rng` where random) so tests can simulate
  time. Settings live in `js/data/range-config.js`. Timed-round state is a per-browser convenience in
  `localStorage['puttedex.timedRound']`, not part of exported progress.
- **Workspace engines** (`js/ui/engines/`): the hole view and the range problem view are engine-agnostic. They load
  the engine named by the tournament's `engine` (a range problem may override it with its own `engine`), which
  supplies the editor setup, yardage book, Run, Submit, result rendering, and Copy context data. The interface is
  documented in `js/ui/engines/index.js`; `sql.js` and `python.js` implement it. Adding a subject means adding an
  engine module there, not branching in the pages.
- **Python runner** (`js/lib/`): `python-runner.js` (main thread) owns one module worker per page
  (`python-worker.js`), serializes requests, and enforces `PYTHON.timeoutMs` (5 s) by terminating the worker and
  starting a fresh one (the only way to stop busy WebAssembly without cross-origin isolation, which Pages can't
  serve). `python-engine.js` wraps a loaded Pyodide and is DOM- and worker-free, so the Node tests run it directly;
  `python-harness.js` is its Python half (a JS string, so no build step and no fetch). Each run gets a fresh
  namespace, and builtins, streams, and the recursion limit are restored afterwards (imported modules stay cached,
  as in a notebook). Output is capped, the last expression's value is shown Jupyter-style, tracebacks keep only the
  learner's own lines, and `input()` explains that data comes from arguments or variables. Settings (timeout,
  output limits, which modules may render HTML such as DataFrames) live in `js/data/python-config.js`.
- `js/ui/`: `dom.js` (`esc`: use it for every learner- or data-derived string put into HTML; icons; `crumbs`;
  `scoreMark`), `scorecard.js` (the 18-hole card), `course-map.js` (the 18 hole slots on the tournament page),
  `workspace.js` (editor card, feedback, results panel, and SQL's results table and yardage book),
  `python-results.js` (Python run output and the test-case list), and `editor.js` (CodeMirror setup per language
  and read-only highlighting).
- `vendor/sql.js/package.json` marks that folder CommonJS so Node can `require()` the UMD build while the root package
  is `"type": "module"`.

## The clubhouse dataset

`js/data/datasets/clubhouse.js` is the SQLite database every SQL tournament queries: `players` (16), `courses` (8),
and `rounds` (90, March–August 2026; 5–10 per player, usually across several months and courses). It includes deliberate edge cases that holes depend on:

- Players 13–16 have **no rounds** (anti-joins, `LEFT JOIN` counts, `COALESCE`).
- `players.home_course_id` is nullable (3 players have no home club), and most home courses are shared by 2–3 players
  (self-joins, the `NOT IN` + NULL trap).
- Course 7 (Desert Mirage) has no rounds and is nobody's home course. Course 8 (Coral Bay) has rounds but is nobody's
  home course.
- `players.handicap` is NULL for 3 players.
- Weather: Cypress Point and Sakura Hills never had wind or rain, and Coral Bay never had rain. Coral Bay is played
  only by professionals.
- Window-function cases (Tournament 3): tied scores at the same course (RANK vs DENSE_RANK differ at Old Links and
  Sakura Hills), and Liam Chipman has the unique longest run of consecutive improving rounds (87, 84, 83, 82, 80).
- sql.js ships SQLite 3.49.1, which supports every window function and frame clause the holes use.

Any change to the data changes expected answers, and can make a hole's `mistakes` stop failing or its task wording
inaccurate (for example "every player" when some players have no rounds). After editing it, run `npm test` and
re-read every task that says "every" or "each".

## Difficulty and par

Every tournament hole and Driving Range problem declares **`difficulty: 'easy' | 'medium' | 'hard'`**. Par is
never written in data files. It's computed from difficulty by **`js/data/par-config.js`** (`PAR_BY_DIFFICULTY`,
`parFor`), the one place to change the rule:

| Difficulty | Meaning | Par |
| --- | --- | --- |
| easy | one core concept, solvable on the first try | 1 |
| medium | two concepts combined | 2 |
| hard | interview-style, multi-step | 2 |

`loadTournament` and `loadRange` attach the computed `par`, and everything downstream reads it: strokes-vs-par
labels (`scoreName`: on a Par 1, 1 stroke is "Par" and 2 is "Bogey"; "Hole in one" needs par 2 or more), the
scorecards and tournament totals, best rounds, the range's review rule and struggle score, timed-round scorecards,
and Copy context. Progress stores strokes only, so changing the rule re-scores everything without migrating data.
A caddie tip costs one stroke, so taking it on a Par 1 always ends over par.

## How to add a tournament

1. Add an entry to `TOURNAMENTS` in `js/data/tournaments.js`, at its place in the learning order. Fill in `id`,
   `title`, `event`, `blurb`, `description`, `skills`, and `engine` (`'sql'` or `'python'`), plus `dataset` for SQL
   or `packages` for Python (extra Pyodide packages, usually `[]`), and optionally `prerequisite` (an earlier
   tournament's id). Set `holeSet: null`. It now appears on the schedule, and its tournament
   page says "coming soon", with all 18 hole slots locked.
   - Nothing is ever locked behind another tournament: a tournament is playable as soon as it has holes.
     `prerequisite` only shows "Recommended after X" on the schedule card and tournament page, with a check mark once
     X is complete.
2. To open it, create `js/data/holes/<name>.js` (see below) and set `holeSet: '<name>'`.
3. A new SQL dataset goes in `js/data/datasets/<name>.js` and exports `SEED` (schema + inserts). Keep it deterministic.
4. Run `npm test`. `tests/tournaments.test.mjs` checks the entry's fields and that it loads.

An engine without a module in `js/ui/engines/` can be listed but not opened: its hole page says it needs a runner.

## How to add a hole

Append an object to the array in `js/data/holes/<holeSet>.js`. Array position is the hole number, and there are at
most 18. The fields are documented at the top of that file. Keep the difficulty ramp: the early single-concept,
straightforward holes (roughly the first third) are `easy` (Par 1); holes that combine concepts are `medium`, and the
closing interview-style holes are `hard` (both Par 2).

- `id` (permanent, kebab-case), `title`, `difficulty` (see "Difficulty and par"), `lesson` (HTML), `interview` (the "Interview angle" note), `yardage`
  (the yardage book's "For this hole" note: which tables and columns it needs), `task` (HTML), `solution`, `hint`
  (the caddie tip), and optionally `orderMatters`. Tests require all of these except `orderMatters`.
- The **task must spell out everything the checker grades**: exactly which columns, **in what order**, any rounding,
  and, if `orderMatters`, the sort order including tie-breaks. The checker compares against the solution's result, so
  anything the task leaves open must not change that result.
- `solution` is shown to learners as "the pro's line": one clause per line (`SELECT`, `FROM`, `JOIN`, `WHERE`,
  `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`), no surrounding whitespace. A clause keyword may only start a line, so
  lay out subqueries and CTE bodies one clause per line too. The `PARTITION BY` / `ORDER BY` inside `OVER (...)` are
  exempt; spread a long `OVER` over several lines instead. Tests enforce this.
- No starter code: the editor always opens blank (tests reject a `starter` field).
- `alternatives`: at least one differently written correct answer the checker must accept.
- `mistakes`: at least one realistic wrong answer the checker must reject. If the dataset can't tell a mistake apart
  from the solution, change the task or pick a different mistake. Don't weaken the test. Tests also require:
  - with `orderMatters`, a mistake that returns the right rows in the wrong order (otherwise the order isn't really
    graded);
  - from Joins & Subqueries on, when the solution joins tables, a mistake that uses the other join type (LEFT vs
    INNER).
  - from Window Functions on, a mistake without the `PARTITION BY` whenever the solution partitions; and the solution
    must give the same result when every table is read in reverse order. That fails when a `ROW_NUMBER`, `NTILE`, or
    `LAG` ordering (or the final sort) has ties the task doesn't break, so add a tie-breaker to the task and the
    solution.
- Don't use features a later tournament teaches. Tests reject window functions (`OVER`, `ROW_NUMBER`, `RANK`, `LAG`,
  `LEAD`, …) in solutions and alternatives of tournaments scheduled before Window Functions.
- SQL is SQLite's dialect (sql.js): no `FULL OUTER JOIN` or `PERCENTILE_CONT`. `RIGHT JOIN`, `IIF`, and `FILTER` work.
- Lesson examples should use a different table or column than the task, so they teach without giving the answer.

Then run `npm test`. Also run `npm run test:layout` if you touched layout, and look at the hole at 1440, 1280, and 390px.
The graded-SQL rules above live in `tests/sql-checks.mjs` and apply to holes and range problems alike.

### Python holes

Same fields as a SQL hole (minus `orderMatters`, `alternatives`/`mistakes` stay), plus a **`checker`** that says
how the answer is graded, and optionally `packages` (extra Pyodide packages; the tournament's `packages` apply too).
The checker format is documented at the top of `js/lib/python-engine.js`:

- **`{ type: 'function', function: 'name', cases, noMutation?, compare? }`**: the task asks for a function. Each
  case is `{ args: '<Python source of the arguments>' }`, e.g. `"[72, 68], 2"`; the checker calls `name(*args)` and
  compares the return value. `noMutation: true` fails any call that changes its arguments (the task must say not to
  modify the input). `compare: 'unordered'` ignores the order of a returned list.
- **`{ type: 'stdout', cases }`**: compares printed output, ignoring trailing whitespace. Each case is
  `{ setup: '<Python source>' }` that defines the input variables before the learner's code runs.
- **`{ type: 'value', variable: 'name', cases }`**: compares a variable the code creates, after `setup`.

Expected values are never written in the data: the checker runs the pro `solution` on each case (like SQL's
reference query). A case may declare `expected` (its repr, or printed text) as an authoring check; tests then assert
the solution produces it. Comparison: floats within 1e-9, `True` isn't `1`, a list isn't a tuple (the message says
so), and `Counter`/`defaultdict` compare as dicts.

**Visible and hidden cases.** Cases are visible (shown in full: input, expected, got) unless `hidden: true`. A
hidden case shows only pass/fail, and for the first failing one, its input. Its expected value never reaches the
page. Every hidden case needs a `label` naming the edge case it covers (empty input, one element, duplicates,
negative numbers, ties, bad rows…). Run (practice swing) shows printed output and the value of the last line; for
stdout and value checkers it runs with example 1's `setup`, which the yardage book shows.

Tests (`tests/python-checks.mjs`, for holes and range problems alike) require:
- at least 3 visible and 3 hidden cases, each hidden case labeled;
- the task states the exact signature `def name(params)` for function checkers (copied from the solution's `def`
  line), names the variable for value checkers, and says what to print for stdout checkers;
- a multi-line pro solution with 4-space indents, lines of 80 characters or fewer (lesson `<pre>` examples too);
- the solution passes; at least one `alternatives` entry (written differently: a loop vs a comprehension) passes;
- every `mistakes` entry fails at least one hidden case, and at least one mistake passes every example but fails a
  hidden case (so the hidden cases matter); with `noMutation`, a mistake that modifies its input;
- no pandas or NumPy before the pandas tournament.

Lesson `<pre>` examples are highlighted in the hole's language. Write Python examples on different data than the
task so they teach without giving the answer away.

## The Driving Range

Extra, replayable practice problems per tournament, on skills already learned.

### How unlocking works

A tournament's range problems unlock according to **`RANGE_UNLOCK` in `js/data/range-config.js`**, the one place to
change it:

- `{ rule: 'tournament-complete' }` (current): every open hole of the tournament holed out, in the current round or
  any finished round. Starting a new round never re-locks the range.
- `{ rule: 'holes-done', holes: N }`: at least N holes holed out in the current round (or any finished round).
- `{ rule: 'always' }`: no lock.

Locked problems stay in the list, with the reason ("Finish SQL Basics to unlock (3/18 holes)"), and their direct links
show the same message. `unlockState()` in `js/range.js` implements the rules and writes the messages.

The same config file holds the other range rules:
- `SOLUTION_UNLOCK_FAILED_ATTEMPTS`: the pro's line shows after a solve or this many misses.
- `REVIEW`: a solve is flagged when it took more than par + 2 strokes (4+ on an easy problem, 5+ on medium/hard), or
  when it used the caddie tip and that makes 3 tipped plays since the last clean solve. A flagged problem returns as "needs review" 3 days later. A clean
  re-solve clears the flag.
- `STRUGGLE_WEIGHTS` and `ROUGH_SPOTS`: the per-topic struggle score (failed attempts, tips, strokes over par on the
  last solve) and how many weakest topics to drill.
- `TIMED_ROUND`: problems per round, minutes, and what an unsolved problem scores.
- `TOPICS`, the allowed tags. (Difficulty labels and par live in `js/data/par-config.js`.)

### How to add range problems

1. Append problems to `js/data/range/<rangeSet>.js`, or, for a tournament without a range yet, create that file and
   set `rangeSet: '<name>'` on its entry in `js/data/tournaments.js`. The tournament must be open (it's what
   unlocks the range). Problems run on the tournament's engine: SQL problems query its dataset, Python problems
   declare a `checker` (see "Python holes"). A problem may set its own `engine` to override the tournament's.
2. Fields (documented at the top of `js/data/range/sql-basics.js`): `id` (permanent, kebab-case), `title`,
   `difficulty` (`easy` = Par 1, `medium`/`hard` = Par 2), `tags` (from `TOPICS`; add a new topic there first), `task`, `solution`, `hint`,
   optional `orderMatters`, `alternatives`, and `mistakes`. There's no `lesson`, no `interview`, and no starter
   code.
3. Every rule from "How to add a hole" about the task, the solution, alternatives, and mistakes applies. On top of
   that, `tests/range-content.test.mjs` rejects a problem whose expected answer is identical to any tournament hole
   on the same dataset. Range problems must be new practice, not repeats.
4. Only use skills the tournament (and the ones before it) taught.
5. Run `npm test`.

Range progress is stored per problem under `range` in progress v4 and included in export/import. Never rename a
problem's `id` once shipped.

For bulk additions, follow the standing procedure in "Adding range problems" below.

## Adding range problems

**Standing procedure.** When the user says something like "add range problems for [tournament]", follow every step
below without asking them to repeat the details. Anything they specify in the request (a different count or
difficulty split, for example) overrides the defaults here.

1. **Quantity.** Add **25 problems: 8 easy (Par 1), 11 medium (Par 2), 6 hard (Par 2).** Use the user's number or split instead if they give
   one.
2. **Format.** Follow the existing range data-file format exactly (see "How to add range problems" above and the
   header of `js/data/range/sql-basics.js`): `id`, `title`, `task`, `tags`, `difficulty` (never a `par`), a multi-line
   `solution` with one clause per line, one `hint` (the caddie tip), and the checker: `orderMatters` where row order
   is graded, plus `alternatives` and `mistakes`. The editor always opens blank, so there's no `starter` field (tests
   reject one).
3. **Coverage.** Every topic tag belonging to the tournament must appear in **at least 3 problems**. Mix
   single-concept problems (mostly easy) with multi-concept ones (medium and hard). A tournament's tags are the entries of
   `TOPICS` in `js/data/range-config.js` for what it teaches:
   - SQL Basics: `SELECT`, `WHERE`, `IN / BETWEEN`, `ORDER BY`, `LIMIT`, `DISTINCT`, `NULL`, `Aggregates`,
     `GROUP BY`, `HAVING`, `COUNT DISTINCT`, `JOIN`, `CASE WHEN`, `Dates`, `Percentages`.
   - Joins & Subqueries: `JOIN`, `LEFT JOIN`, `Self-join`, `Subqueries`, `EXISTS`, `CASE WHEN`, `CTE`. Earlier tags
     such as `Dates` may appear too, but don't count toward coverage.
   - A tournament not listed here: derive its tags from its holes and `skills`, add any new ones to `TOPICS`, add the
     list to this section, and state it in the report.
4. **No duplicates.** Before writing anything, read all of the tournament's holes (`js/data/holes/<holeSet>.js`) and
   all of its existing range problems (`js/data/range/<rangeSet>.js`). Don't reuse or lightly reword any of them:
   change the question, not just the numbers or names. `tests/range-content.test.mjs` rejects a problem whose
   expected answer is identical to a hole's, but that only catches exact repeats. Avoiding near-duplicates is on you.
5. **Difficulty.**
   - Easy (Par 1): one core concept.
   - Medium (Par 2): two concepts combined.
   - Hard (Par 2): an interview-style, multi-step question of the kind asked in real data science internship
     interviews.
   Hard problems need **one unambiguous correct answer in the data**: no ties that the task's sort order doesn't break, no
   rounding that lands on a tie, and no reading of the task that yields a different valid result. Prototype the query
   and look at the actual rows before writing the task.
6. **Scope.** Only use skills taught in that tournament or earlier ones in the schedule. Never use concepts from
   later tournaments. For example, no window functions in Joins & Subqueries problems (tests enforce this for window
   functions; watch other later-tournament features yourself). This applies to solutions and alternatives.
7. **Data.** Use the existing seeded dataset (`js/data/datasets/<dataset>.js`). If a problem needs data that doesn't
   exist, extend the dataset deterministically, then confirm that every existing hole and range problem still passes
   and that their task wording is still accurate (see "The clubhouse dataset"). Commit dataset changes separately,
   before the problems.
8. **Runtime.** SQL tournaments use the SQLite dialect only (sql.js: no `FULL OUTER JOIN`, no `PERCENTILE_CONT`).
   **Python** problems run on the Python runner (Pyodide, standard library plus the tournament's `packages`) and
   replace `solution`-as-SQL with a `checker`, chosen per problem:
   - `function`: the task names a function and its exact signature; the checker calls it on each case's `args` and
     compares return values. Use `noMutation: true` when the task says not to modify the input.
   - `stdout`: the task says exactly what to print; cases' `setup` defines the inputs.
   - `value`: the task names a variable to create; cases' `setup` defines the inputs.
   Every Python problem needs at least 3 visible and 3 labeled hidden cases, with the hidden ones covering edge cases
   (empty input, one element, duplicates, negative numbers, ties, malformed rows), plus `alternatives` and
   `mistakes` as for holes; `tests/python-checks.mjs` enforces the rules listed under "Python holes". The range
   content test runs Python problems through it. For pandas, NumPy, statistics, and ML, extend the comparison in
   `js/lib/python-harness.js` (`same()`) for DataFrames and arrays first, and add the packages to the tournament's
   `packages` (their wheels must be vendored next to Pyodide). Tell the user what's needed before writing content
   if the checker can't grade it yet.
9. **Verify.**
   - Run every pro solution through its checker and confirm it passes (`npm test` does this).
   - For each problem, confirm at least one plausible wrong answer fails. Where `ORDER BY` matters, include a
     right-rows, wrong-order mistake; from Joins & Subqueries on, join problems also need a wrong-join-type mistake.
     Tests enforce both. For Python: an off-by-one, a mutated input, a wrong sort order, or an ignored edge case
     that passes the examples but fails a hidden case.
   - Confirm the task text matches exactly what the checker expects: same table, same columns in the same order,
     rounding, and sort order with tie-breaks. Print each problem's task next to its expected columns and row count,
     and read them side by side.
   - Confirm tag coverage (step 3) and the difficulty split (step 1) by counting.
   - Report every problem you had to change during verification, and why.
10. **Finish.** Make a separate commit per tournament, push to main, and wait for CI to pass. Then give the user a
    list of the new problems with each one's title, difficulty and par, and tags, and flag anything you weren't sure about.

## Copy context

The problem views (tournament holes and range problems) have a **Copy context** button in the editor's action row,
with the shortcut Alt/Option+Shift+C. It copies a Markdown summary for asking someone (usually Claude) for help.
Cmd/Ctrl+Shift+C isn't used because browsers reserve it for the developer tools' element inspector.

- **The framing line** at the top, and the size limits (3 sample rows per table, 15 result rows, 40-character
  cells, 2,000 characters of printed Python output), live in **`js/data/context-config.js`**. Edit them there.
- **What's copied**, in order: framing, where I am, the problem, Background (holes only: lesson and yardage note),
  schema (only the tables the reference query or my code mention, with 3 sample rows), my current code, my last
  run (status, the exact error or feedback shown, columns, row count, first 15 rows), my progress, and the reference
  solution, only if the learner ticks "Include pro solution". That toggle only appears once the solution is
  unlocked (hole: solved; range: solved or 3 misses).
- **Python** (`js/context/python.js`) copies, instead of the schema, "How it's checked" (the function to define, or
  what's printed or which variable; no-mutation rule; how many example and hidden tests; example 1's inputs), and
  as the last run: printed output, the last line's value, and the trimmed traceback (Run), or the per-test results
  (Submit). Examples are copied in full (input, expected, got) since the page shows them; hidden tests only as
  pass/fail, plus the input of the first failing one.
- **Never** copy the expected output of SQL or of a hidden Python test, and never copy the solution without the
  toggle. `tests/context.test.mjs` checks this.
- The pages build a ProblemContext from existing state (editor text, `lastRun` set by Run/Submit, the progress
  store) and never re-run the query. The shape is documented at the top of `js/context/index.js`. Clipboard
  handling (API → textarea + `execCommand` → manual-copy dialog) is in `js/ui/copy-context.js`.

### Adding a context builder for a new problem type

1. Create `js/context/<engine>.js` exporting `build<Engine>Context(ctx)`. Assemble it from the shared sections in
   `js/context/sections.js` (`framingSection`, `locationSection`, `problemSection`, `backgroundSection`,
   `codeSection(ctx, lang)`, `lastRunSection(ctx, renderResult)`, `progressSection`, `solutionSection(ctx, lang)`,
   `joinSections`). Add the engine-specific parts yourself, for example DataFrame heads instead of SQL tables, and a
   `renderResult` that shows that engine's result (`markdownTable` and `fence` are in `js/context/text.js`).
2. Register it in `CONTEXT_BUILDERS` in `js/context/index.js` under the engine name used by `TOURNAMENTS[].engine`.
   Until you do, that engine falls back to `buildFallbackContext` (title, task, code, feedback).
3. Have the page pass what the builder needs in `ctx.data` (for SQL: `{ SQL, seed, referenceSql }`), and set
   `lastRun.result` to whatever that engine's run produces.
4. Add cases to `tests/context.test.mjs`, including "no solution unless passed in".

## Checking the Python runner by hand

The Node tests cover the engine, not the worker. After changing `js/lib/python-runner.js`, `python-worker.js`, or
`js/ui/engines/python.js`, open a Python hole in Chrome and check: the first load shows "loading" in the editor head
and the results panel; `while True: pass` stops after about 5 s with the "ran too long" message and Python restarts;
a syntax error and a runtime error show only your own lines; printing 100,000 lines is cut off with a note; Restart
Python works; moving to the next hole is instant; and the results panel doesn't scroll sideways at 1440, 1280, and
390px.

## Deployment

`.github/workflows/pages.yml` runs on every push to `main` (tests only on pull requests). It runs `npm test`, copies
only the site files (`*.html`, `css/`, `js/`, `vendor/`, `.nojekyll`) into `_site/`, and deploys with
`actions/deploy-pages`. The repository's Pages source must be set to **GitHub Actions**. If you add a new top-level
folder the site needs, add it to the copy step.
