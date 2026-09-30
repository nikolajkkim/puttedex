# ⛳ Puttedex

A Codedex-style, golf-themed learning platform for data science. Work through the course map one hole at a time,
from your first `SELECT` to a full mock interview, and come out ready for data science internship interviews.

Everything runs in your browser. SQL runs on [sql.js](https://sql.js.org) (SQLite compiled to WebAssembly), and
Python is coming via Pyodide. There's no account and no server. Your progress is saved in `localStorage`, and you can
export and import it as JSON from the Locker room.

## How scoring works

| | |
| --- | --- |
| **Hole** | One course, such as SQL Basics |
| **Shot** | One exercise |
| **Stroke** | One submitted answer. A caddie tip (hint) adds a penalty stroke. |
| **Practice swing** | Running a query without submitting. It's free. |
| **Par** | The target stroke count. Beat it for a birdie. |

## Run locally

```bash
npm run serve   # then open http://localhost:8000
npm test        # checks every exercise's solution, starter code, and common mistakes against the real SQL engine
```

A local server is required because ES modules and WebAssembly don't load from `file://`.

## Deploy

Every push to `main` runs the tests and deploys to GitHub Pages via `.github/workflows/pages.yml`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

## Roadmap (front nine)

1. SQL Basics ✅
2. Joins & Subqueries
3. Window Functions
4. Python Fundamentals
5. pandas Wrangling
6. Probability & Statistics
7. A/B Testing
8. ML Fundamentals
9. Interview Simulation
