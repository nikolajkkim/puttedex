// The tour schedule: every tournament in learning order (first to last).
//
// To add a tournament, add an entry here. It shows as "coming soon" until `holeSet` is set.
// To open it, create js/data/holes/<holeSet>.js (a default-exported array of holes) and set `holeSet`.
//
// Fields:
//   id           stable key used in URLs and saved progress. Never rename it once shipped.
//   title        concept name shown everywhere
//   event        golf-flavored tournament name
//   blurb        one sentence for the schedule card
//   description  a paragraph for the tournament page
//   skills       short chips of what the tournament covers
//   engine       'sql' (sql.js) or 'python' (Pyodide); picks the problem view's runner (js/ui/engines/)
//   dataset      module in js/data/datasets/ whose SEED builds the database, for SQL tournaments
//   packages     Python only: extra Pyodide packages every hole needs (e.g. ['numpy', 'pandas']). A hole or range
//                problem can add its own with a `packages` field. Loaded once per page, on first use.
//   holeSet      module in js/data/holes/, or null while the tournament has no holes yet
//   rangeSet     module in js/data/range/ with this tournament's Driving Range problems (optional). They unlock
//                according to RANGE_UNLOCK in js/data/range-config.js.
//   prerequisite id of an earlier tournament this one builds on. Shown as a recommendation, not a lock: like
//                SQL Basics, a tournament is playable as soon as it has holes.

export const HOLES_PER_TOURNAMENT = 18;

export const TOURNAMENTS = [
  {
    id: 'sql-basics',
    title: 'SQL Basics',
    event: 'The SELECT Open',
    blurb: 'SELECT, WHERE, ORDER BY, GROUP BY, and your first JOIN, on a real golf database.',
    description: 'Every data science interview loop has a SQL round, and it almost always starts here. '
      + 'You\'ll query a clubhouse database of players, courses, and rounds: filter it, sort it, handle '
      + 'NULLs, aggregate it, and join tables together. By the end you can answer the "warm-up" SQL '
      + 'questions quickly and explain each clause as you write it.',
    skills: ['SELECT', 'WHERE', 'ORDER BY', 'NULL', 'Aggregates', 'GROUP BY', 'JOIN'],
    engine: 'sql',
    dataset: 'clubhouse',
    holeSet: 'sql-basics',
    rangeSet: 'sql-basics',
  },
  {
    id: 'sql-joins',
    title: 'Joins & Subqueries',
    event: 'The Match Play Classic',
    blurb: 'LEFT JOINs, self-joins, subqueries, EXISTS, and CTEs: the questions that split candidates.',
    description: 'The step from "knows SQL" to "passes the SQL round". You\'ll learn which rows each join keeps and '
      + 'drops, find what\'s missing with anti-joins, pair rows with self-joins, and answer multi-step questions with '
      + 'subqueries, EXISTS, and common table expressions. It finishes with the classics interviewers love: '
      + 'second-highest values and month-over-month change, without window functions.',
    skills: ['INNER/LEFT JOIN', 'Self-join', 'Subqueries', 'EXISTS', 'CASE WHEN', 'CTE'],
    engine: 'sql',
    dataset: 'clubhouse',
    prerequisite: 'sql-basics',
    holeSet: 'sql-joins',
  },
  {
    id: 'sql-windows',
    title: 'Window Functions',
    event: 'The Leaderboard Invitational',
    blurb: 'ROW_NUMBER, RANK, running totals, LAG/LEAD, and top-N per group. Leaderboards done properly.',
    description: 'Window functions show up in almost every intermediate SQL interview. You\'ll number and rank '
      + 'rounds (and learn exactly how RANK and DENSE_RANK treat ties), compare each row with its group\'s average '
      + 'and total, build running totals and moving averages, and look backwards and forwards with LAG and LEAD. '
      + 'The back nine is interview territory: top N per group, deduplication, quartiles, the frame gotcha behind '
      + 'LAST_VALUE, streaks, and month-over-month rank changes.',
    skills: ['ROW_NUMBER', 'RANK/DENSE_RANK', 'PARTITION BY', 'Running totals', 'LAG/LEAD', 'NTILE'],
    engine: 'sql',
    dataset: 'clubhouse',
    prerequisite: 'sql-joins',
    holeSet: 'sql-windows',
  },
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    event: 'The Pyodide Pro-Am',
    blurb: 'Lists, dicts, sets, comprehensions, functions, and clean-up code, with Python running right in your browser.',
    description: 'The Python every data scientist is expected to write fluently in a live coding round. You\'ll work '
      + 'with scorecards as lists, dicts, sets, and tuples, write comprehensions and functions, count and group with '
      + 'collections, and handle messy input with try/except. The back nine are interview questions: group-by in '
      + 'pure Python, a classic algorithm puzzle, and cleaning and summarizing a messy file of round records.',
    skills: ['Data structures', 'Comprehensions', 'Functions', 'Strings', 'collections', 'Error handling'],
    engine: 'python',
    packages: [],
    prerequisite: 'sql-windows',
    holeSet: 'python-fundamentals',
  },
  {
    id: 'pandas',
    title: 'pandas Wrangling',
    event: 'The DataFrame Championship',
    blurb: 'Filter, group, merge, and reshape DataFrames. SQL skills, now in Python.',
    description: 'Everything from the SQL tournaments, redone in pandas, plus reshaping, missing data, '
      + 'and the idioms interviewers look for in take-home assignments.',
    skills: ['DataFrames', 'groupby', 'merge', 'pivot'],
    engine: 'python',
    holeSet: null,
  },
  {
    id: 'probability-stats',
    title: 'Probability & Statistics',
    event: 'The Bayes Hill Classic',
    blurb: 'Distributions, expectation, Bayes, and the CLT. The whiteboard classics.',
    description: 'The probability and statistics questions asked at the whiteboard: counting, conditional '
      + 'probability and Bayes, common distributions, expectation, and the central limit theorem.',
    skills: ['Bayes', 'Distributions', 'Expectation', 'CLT'],
    engine: 'python',
    holeSet: null,
  },
  {
    id: 'ab-testing',
    title: 'A/B Testing',
    event: 'The Split Test Masters',
    blurb: 'Hypothesis tests, p-values, power, and designing an experiment from scratch.',
    description: 'Product data science interviews lean heavily on experimentation: choosing metrics, sizing '
      + 'a test, reading p-values and confidence intervals, and spotting the pitfalls.',
    skills: ['p-values', 'Power', 'Experiment design'],
    engine: 'python',
    holeSet: null,
  },
  {
    id: 'ml-fundamentals',
    title: 'ML Fundamentals',
    event: 'The Gradient Descent Cup',
    blurb: 'Regression, classification, bias–variance, and evaluation metrics you can explain.',
    description: 'The machine learning concepts an internship interviewer expects you to explain clearly: '
      + 'regression and classification, overfitting, cross-validation, and choosing the right metric.',
    skills: ['Regression', 'Classification', 'Metrics', 'Overfitting'],
    engine: 'python',
    holeSet: null,
  },
  {
    id: 'interview-sim',
    title: 'Interview Simulation',
    event: 'The Major',
    blurb: 'Timed, mixed SQL + Python + product-sense rounds. Your final exam before the real thing.',
    description: 'Full mock interview rounds mixing everything on the tour, under time pressure, with '
      + 'product-sense case questions. Finish this one under par and you\'re ready.',
    skills: ['Timed', 'Mixed', 'Case study'],
    engine: 'sql',
    dataset: 'clubhouse',
    holeSet: null,
  },
];
