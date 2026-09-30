# ⛳ Puttedex

A Codedex-style, golf-themed learning platform for data science. Each concept is a **tournament** of up to 18
**holes** (problems). Play through the tour schedule, from your first `SELECT` to a full mock interview, and come out
ready for data science internship interviews.

Everything runs in your browser. SQL runs on [sql.js](https://sql.js.org) (SQLite compiled to WebAssembly), and
Python is coming via Pyodide. There's no account and no server. Your progress is saved in `localStorage`, and you can
export and import it as JSON from the Locker room.

## How scoring works

| | |
| --- | --- |
| **Tournament** | One concept, such as SQL Basics, with up to 18 holes |
| **Hole** | One problem |
| **Stroke** | One submitted answer. A caddie tip (hint) adds a penalty stroke. |
| **Practice swing** | Running a query without submitting. It's free. |
| **Par** | The target stroke count. Beat it for a birdie. |
| **Round** | One play-through of a tournament. Start a new round to chase a better best score. |

## The Driving Range

A LeetCode-style practice area with extra problems on skills you've already learned. A tournament's problems unlock
when you finish it. Problems are replayable: your best strokes count, struggles come back for review after three
days, and "rough spots" show the topics to drill. There's also Mixed Bag (a random unsolved problem) and Timed Round
(3 problems, 30 minutes, with a scorecard).

## Run locally

```bash
npm run serve   # then open http://localhost:8000
npm test        # checks every hole's solution, accepted alternatives, and common mistakes against the real SQL engine
npm run test:layout   # headless Chrome: no page may scroll horizontally at any width
```

A local server is required because ES modules and WebAssembly don't load from `file://`.

## Deploy

Every push to `main` runs the tests and deploys to GitHub Pages via `.github/workflows/pages.yml`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

## Tour schedule

1. SQL Basics: all 18 holes open
2. Joins & Subqueries
3. Window Functions
4. Python Fundamentals
5. pandas Wrangling
6. Probability & Statistics
7. A/B Testing
8. ML Fundamentals
9. Interview Simulation
