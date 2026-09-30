// The course map. Each entry is a hole on the roadmap.
// Playable holes have `load()`; the rest render as "coming soon".
// `par` must equal the sum of the loaded course's shot pars (checked by tests).

export const HOLES = [
  {
    id: 'sql-basics',
    number: 1,
    title: 'SQL Basics',
    blurb: 'SELECT, WHERE, ORDER BY, GROUP BY, and your first JOIN, on a real golf database.',
    skills: ['SELECT', 'WHERE', 'ORDER BY', 'NULL', 'GROUP BY', 'JOIN'],
    par: 22,
    load: () => import('./sql-basics.js').then((m) => m.default),
  },
  {
    id: 'sql-joins',
    number: 2,
    title: 'Joins & Subqueries',
    blurb: 'LEFT JOINs, self-joins, subqueries, and CTEs: the questions that split candidates.',
    skills: ['LEFT JOIN', 'CTE', 'Subqueries'],
  },
  {
    id: 'sql-windows',
    number: 3,
    title: 'Window Functions',
    blurb: 'RANK, ROW_NUMBER, running totals, and LAG/LEAD. Leaderboards done properly.',
    skills: ['RANK', 'LAG/LEAD', 'Running totals'],
  },
  {
    id: 'python-fundamentals',
    number: 4,
    title: 'Python Fundamentals',
    blurb: 'Lists, dicts, comprehensions, and functions, with Python running right in your browser.',
    skills: ['Data structures', 'Comprehensions', 'Functions'],
  },
  {
    id: 'pandas',
    number: 5,
    title: 'pandas Wrangling',
    blurb: 'Filter, group, merge, and reshape DataFrames. SQL skills, now in Python.',
    skills: ['DataFrames', 'groupby', 'merge'],
  },
  {
    id: 'probability-stats',
    number: 6,
    title: 'Probability & Statistics',
    blurb: 'Distributions, expectation, Bayes, and the CLT. The whiteboard classics.',
    skills: ['Bayes', 'Distributions', 'CLT'],
  },
  {
    id: 'ab-testing',
    number: 7,
    title: 'A/B Testing',
    blurb: 'Hypothesis tests, p-values, power, and designing an experiment from scratch.',
    skills: ['p-values', 'Power', 'Experiment design'],
  },
  {
    id: 'ml-fundamentals',
    number: 8,
    title: 'ML Fundamentals',
    blurb: 'Regression, classification, bias–variance, and evaluation metrics you can explain.',
    skills: ['Regression', 'Metrics', 'Overfitting'],
  },
  {
    id: 'interview-sim',
    number: 9,
    title: 'Interview Simulation',
    blurb: 'Timed, mixed SQL + Python + product-sense rounds. Your final exam before the real thing.',
    skills: ['Timed', 'Mixed', 'Case study'],
  },
];

export const holeById = (id) => HOLES.find((h) => h.id === id);
