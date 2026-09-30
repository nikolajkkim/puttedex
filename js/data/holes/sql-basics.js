// Holes for the "SQL Basics" tournament, in play order (hole 1 first).
// A tournament has up to 18 holes; list only the ones that exist. Missing slots show as "coming soon".
//
// Hole fields:
//   id           stable key used for saved progress. Never rename it once shipped.
//   title, par   par is the target stroke count (usually 2, or 3 for harder holes)
//   lesson       HTML teaching the concept
//   task         HTML describing exactly what the result must contain (columns, order, rounding)
//   solution     reference query; the checker compares the learner's result with this one's
//   hint         the caddie tip (costs a stroke)
//   orderMatters true when row order is graded (the task must then say how to sort, including ties)
//   alternatives other correct answers the task allows, which the checker must accept (enforced by tests)
//   mistakes     realistic wrong answers the checker must reject (enforced by tests)

export default [
  {
    id: 'select-star',
    title: 'Tee off with SELECT',
    par: 2,
    lesson: `
      <p>Every SQL query that reads data starts with <code>SELECT</code>. It asks for columns
      <em>from</em> a table:</p>
      <pre>SELECT * FROM rounds;</pre>
      <p>The <code>*</code> means "every column". The trailing semicolon ends the statement.
      SQL keywords aren't case-sensitive, but writing them in UPPERCASE is the convention.</p>
      <p class="tip"><strong>Interview angle:</strong> Interviewers expect you to explore a table before
      answering questions about it. <code>SELECT *</code> is how you take a first look.</p>`,
    task: `Return <strong>every column</strong> for <strong>every player</strong> in the <code>players</code> table,
      with the columns in the table's own order.`,
    solution: `SELECT *
FROM players;`,
    hint: 'The table is called <code>players</code>. Use <code>SELECT * FROM table_name;</code>.',
    alternatives: [
      'select * from players',
      'SELECT player_id, name, country, handicap, is_pro FROM players;',
    ],
    mistakes: ['SELECT name FROM players;', 'SELECT * FROM courses;'],
  },
  {
    id: 'select-columns',
    title: 'Pick your club: choosing columns',
    par: 2,
    lesson: `
      <p>Instead of <code>*</code>, list the columns you want, separated by commas. They come back
      <em>in the order you list them</em>:</p>
      <pre>SELECT played_on, score FROM rounds;</pre>
      <p>Naming columns makes a query faster to read and cheaper to run on wide tables.</p>
      <p class="tip"><strong>Interview angle:</strong> Avoid <code>SELECT *</code> in a final answer.
      Selecting exactly what the question asks for shows precision.</p>`,
    task: `Return each player's <code>name</code> and <code>country</code>, in that column order.`,
    solution: `SELECT name, country
FROM players;`,
    hint: 'Put the column names between <code>SELECT</code> and <code>FROM</code>: <code>SELECT name, country FROM ...</code>',
    alternatives: [
      'SELECT p.name, p.country FROM players AS p;',
    ],
    mistakes: ['SELECT country, name FROM players;', 'SELECT * FROM players;'],
  },
  {
    id: 'where',
    title: 'Find the fairway: WHERE',
    par: 2,
    lesson: `
      <p><code>WHERE</code> keeps only the rows that match a condition. It comes after <code>FROM</code>:</p>
      <pre>SELECT name, par FROM courses WHERE country = 'USA';</pre>
      <p>Text values go in <strong>single quotes</strong>. Comparisons use <code>=</code>, <code>&lt;&gt;</code>
      (not equal), <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, and <code>&gt;=</code>.
      In SQLite, <code>=</code> on text is case-sensitive, so <code>'usa'</code> won't match <code>'USA'</code>.</p>`,
    task: `Return the <code>name</code> and <code>handicap</code> (in that order) of every player whose country is
      <strong>Scotland</strong>.`,
    solution: `SELECT name, handicap
FROM players
WHERE country = 'Scotland';`,
    hint: "Add <code>WHERE country = 'Scotland'</code>. Mind the capital S and the single quotes.",
    alternatives: [
      `SELECT name, handicap FROM players WHERE country IN ('Scotland');`,
      `SELECT name AS player, handicap FROM players WHERE country = 'Scotland' ORDER BY handicap;`,
    ],
    mistakes: [
      "SELECT name, handicap FROM players WHERE country = 'scotland';",
      "SELECT name, handicap FROM players WHERE country <> 'Scotland';",
    ],
  },
  {
    id: 'and-or',
    title: 'Stack conditions: AND and OR',
    par: 2,
    lesson: `
      <p>Combine conditions with <code>AND</code> (both must be true) and <code>OR</code> (either can be true):</p>
      <pre>SELECT * FROM rounds
WHERE weather = 'Rain' OR weather = 'Windy';</pre>
      <p><code>AND</code> binds tighter than <code>OR</code>. When you mix them, add parentheses so the logic
      is unambiguous: <code>WHERE score &lt; 72 AND (weather = 'Rain' OR weather = 'Windy')</code>.</p>
      <p class="tip"><strong>Interview angle:</strong> A missing pair of parentheses around an
      <code>OR</code> is one of the most common SQL bugs. Say out loud what each condition filters.</p>`,
    task: `Find the rounds with a <code>score</code> <strong>under 75</strong> and <strong>28 putts or fewer</strong>.
      Return <code>round_id</code>, <code>score</code>, and <code>putts</code>, in that order.`,
    solution: `SELECT round_id, score, putts
FROM rounds
WHERE score < 75
  AND putts <= 28;`,
    hint: 'Two conditions that must <em>both</em> hold: <code>score &lt; 75 AND putts &lt;= 28</code>.',
    alternatives: [
      'SELECT round_id, score, putts FROM rounds WHERE putts < 29 AND score <= 74;',
    ],
    mistakes: [
      'SELECT round_id, score, putts FROM rounds WHERE score < 75 OR putts <= 28;',
      'SELECT round_id, score, putts FROM rounds WHERE score < 74 AND putts <= 28;',
      'SELECT round_id, score, putts FROM rounds WHERE score < 75 AND putts < 28;',
    ],
  },
  {
    id: 'order-limit',
    title: 'The leaderboard: ORDER BY and LIMIT',
    par: 2,
    orderMatters: true,
    lesson: `
      <p><code>ORDER BY</code> sorts results. It's ascending (<code>ASC</code>) by default; add <code>DESC</code> to
      reverse it. List several columns to break ties. <code>LIMIT n</code> keeps only the first <em>n</em> rows:</p>
      <pre>SELECT name, yardage FROM courses
ORDER BY yardage DESC
LIMIT 3;</pre>
      <p>In golf, <strong>lower is better</strong>, so the leaderboard sorts scores ascending.</p>
      <p class="tip"><strong>Interview angle:</strong> "Top N" questions are everywhere. Always ask how ties
      should be handled. Without a tiebreaker, the order of tied rows isn't guaranteed.</p>`,
    task: `Build a leaderboard of the <strong>5 best (lowest) rounds</strong>. Return <code>round_id</code> and
      <code>score</code>, in that order. Sort by <code>score</code> ascending and break ties by <code>round_id</code> ascending.`,
    solution: `SELECT round_id, score
FROM rounds
ORDER BY score ASC, round_id ASC
LIMIT 5;`,
    hint: 'Use <code>ORDER BY score, round_id</code> and then <code>LIMIT 5</code>. <code>LIMIT</code> always comes last.',
    alternatives: [
      'SELECT round_id, score FROM rounds ORDER BY score, round_id LIMIT 5;',
    ],
    mistakes: [
      'SELECT round_id, score FROM rounds ORDER BY score DESC LIMIT 5;',
      'SELECT round_id, score FROM rounds ORDER BY score, round_id LIMIT 6;',
      'SELECT round_id, score FROM rounds ORDER BY score DESC, round_id DESC LIMIT 5;',
    ],
  },
  {
    id: 'distinct',
    title: 'One of each: DISTINCT',
    par: 2,
    lesson: `
      <p><code>SELECT DISTINCT</code> removes duplicate rows from the result:</p>
      <pre>SELECT DISTINCT weather FROM rounds;</pre>
      <p>With several columns, <code>DISTINCT</code> applies to the <em>combination</em>:
      <code>SELECT DISTINCT player_id, course_id</code> returns each player–course pairing once.</p>`,
    task: `Which countries do our players come from? Return each <code>country</code> from <code>players</code>
      <strong>exactly once</strong>.`,
    solution: `SELECT DISTINCT country
FROM players;`,
    hint: 'Put <code>DISTINCT</code> right after <code>SELECT</code>.',
    alternatives: [
      'SELECT country FROM players GROUP BY country;',
    ],
    mistakes: ['SELECT country FROM players;', 'SELECT DISTINCT country FROM courses;'],
  },
  {
    id: 'null',
    title: 'Lost ball: working with NULL',
    par: 2,
    lesson: `
      <p><code>NULL</code> means "unknown" or "missing". It isn't zero or an empty string. Any comparison with
      <code>NULL</code> using <code>=</code> is neither true nor false. It's <code>NULL</code>, so the row
      is filtered out.</p>
      <pre>-- Wrong: never matches anything
SELECT * FROM players WHERE handicap = NULL;

-- Right
SELECT * FROM players WHERE handicap IS NULL;</pre>
      <p>Use <code>IS NULL</code> and <code>IS NOT NULL</code>.</p>
      <p class="tip"><strong>Interview angle:</strong> NULL handling is a favorite trick question. It also
      matters for aggregates: <code>COUNT(handicap)</code> skips NULLs, but <code>COUNT(*)</code> doesn't.</p>`,
    task: `Some players don't have an official handicap yet. Return the <code>name</code> of every player whose
      <code>handicap</code> is missing.`,
    solution: `SELECT name
FROM players
WHERE handicap IS NULL;`,
    hint: '<code>= NULL</code> never matches. Use <code>IS NULL</code>.',
    alternatives: [
      'SELECT name FROM players WHERE NOT (handicap IS NOT NULL);',
    ],
    mistakes: [
      'SELECT name FROM players WHERE handicap IS NOT NULL;',
      'SELECT name FROM players WHERE handicap = 0;',
    ],
  },
  {
    id: 'aggregates',
    title: 'Count the strokes: aggregate functions',
    par: 2,
    lesson: `
      <p>Aggregate functions collapse many rows into one value: <code>COUNT</code>, <code>SUM</code>,
      <code>AVG</code>, <code>MIN</code>, and <code>MAX</code>. Name the result with <code>AS</code>:</p>
      <pre>SELECT COUNT(*) AS rounds_in_rain,
     AVG(putts) AS avg_putts
FROM rounds
WHERE weather = 'Rain';</pre>
      <p><code>ROUND(value, 1)</code> rounds to one decimal place.</p>
      <p class="tip"><strong>Interview angle:</strong> <code>WHERE</code> filters rows <em>before</em> they're
      aggregated. Remember that for the next shot.</p>`,
    task: `Summarize every round in one row with four columns, in this order: the number of rounds, the average
      score <strong>rounded to 1 decimal</strong>, the best (lowest) score, and the worst (highest) score.`,
    solution: `SELECT
  COUNT(*) AS rounds_played,
  ROUND(AVG(score), 1) AS avg_score,
  MIN(score) AS best_score,
  MAX(score) AS worst_score
FROM rounds;`,
    hint: '<code>SELECT COUNT(*), ROUND(AVG(score), 1), MIN(score), MAX(score) FROM rounds;</code> Adding aliases is good style.',
    alternatives: [
      'SELECT COUNT(round_id), ROUND(AVG(score), 1), MIN(score), MAX(score) FROM rounds;',
    ],
    mistakes: [
      'SELECT COUNT(*), AVG(score), MIN(score), MAX(score) FROM rounds;',
      'SELECT COUNT(*), ROUND(AVG(score), 1), MAX(score), MIN(score) FROM rounds;',
    ],
  },
  {
    id: 'group-by',
    title: 'Card by card: GROUP BY and HAVING',
    par: 3,
    lesson: `
      <p><code>GROUP BY</code> computes aggregates <em>per group</em> instead of over the whole table:</p>
      <pre>SELECT course_id, COUNT(*) AS rounds, MIN(score) AS course_record
FROM rounds
GROUP BY course_id;</pre>
      <p>To filter <em>groups</em> by an aggregate, use <code>HAVING</code>. <code>WHERE</code> can't see aggregates,
      because it runs before grouping:</p>
      <pre>... GROUP BY course_id
HAVING COUNT(*) &gt;= 10;</pre>
      <p class="tip"><strong>Interview angle:</strong> "What's the difference between WHERE and HAVING?" is asked
      constantly. <code>WHERE</code> filters rows before grouping. <code>HAVING</code> filters groups after it.</p>`,
    task: `For each player who has played <strong>at least 5 rounds</strong>, return three columns in this order:
      their <code>player_id</code>, their number of rounds, and their average score <strong>rounded to 1 decimal</strong>.`,
    solution: `SELECT
  player_id,
  COUNT(*) AS rounds_played,
  ROUND(AVG(score), 1) AS avg_score
FROM rounds
GROUP BY player_id
HAVING COUNT(*) >= 5;`,
    hint: '<code>GROUP BY player_id</code>, then <code>HAVING COUNT(*) &gt;= 5</code>. The count and average go in the SELECT list.',
    alternatives: [
      'SELECT player_id, COUNT(*) AS n, ROUND(AVG(score), 1) FROM rounds GROUP BY player_id HAVING n >= 5 ORDER BY player_id DESC;',
    ],
    mistakes: [
      'SELECT player_id, COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY player_id HAVING COUNT(*) > 5;',
      'SELECT player_id, COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY player_id;',
      'SELECT player_id, COUNT(*), ROUND(AVG(score), 1) FROM rounds WHERE COUNT(*) >= 5 GROUP BY player_id;',
    ],
  },
  {
    id: 'join',
    title: 'The 18th green: JOIN',
    par: 3,
    orderMatters: true,
    lesson: `
      <p>Data is spread across tables that are linked by keys. <code>rounds.course_id</code> points to
      <code>courses.course_id</code>. A <code>JOIN</code> lines up matching rows:</p>
      <pre>SELECT r.round_id, c.name, r.score
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id;</pre>
      <p>Short table aliases (<code>r</code>, <code>c</code>) keep things readable. They're also required when both
      tables have a column with the same name. You can do arithmetic across the joined tables, too:
      <code>r.score - c.par</code> is strokes over par.</p>
      <p class="tip"><strong>Interview angle:</strong> JOIN + GROUP BY is the bread and butter of SQL interviews.
      Know that <code>JOIN</code> (inner) drops rows that have no match. <code>LEFT JOIN</code> keeps them. That's the
      next hole.</p>`,
    task: `Which course plays hardest? For each course, return three columns in this order: its <code>name</code>,
      the number of rounds played there, and the average <strong>strokes over par</strong> (<code>score - par</code>) <strong>rounded to 1 decimal</strong>.
      Sort by that average, <strong>hardest first</strong>, and break ties by course name A→Z.`,
    solution: `SELECT
  c.name,
  COUNT(*) AS rounds_played,
  ROUND(AVG(r.score - c.par), 1) AS avg_over_par
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY c.course_id, c.name
ORDER BY avg_over_par DESC, c.name ASC;`,
    hint: 'Join on <code>c.course_id = r.course_id</code>, then <code>GROUP BY c.name</code>. Use '
      + '<code>ROUND(AVG(r.score - c.par), 1)</code> and <code>ORDER BY</code> that expression <code>DESC</code>.',
    alternatives: [
      'SELECT c.name, COUNT(*), ROUND(AVG(r.score - c.par), 1) FROM courses c JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY 3 DESC, 1;',
      'SELECT c.name, COUNT(*) AS n, ROUND(AVG(r.score) - c.par, 1) AS over FROM rounds r INNER JOIN courses c USING (course_id) GROUP BY c.course_id ORDER BY over DESC, c.name;',
    ],
    mistakes: [
      `SELECT c.name, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS o FROM rounds r JOIN courses c
         ON c.course_id = r.course_id GROUP BY c.name ORDER BY o ASC, c.name;`,
      `SELECT c.name, COUNT(*), ROUND(AVG(r.score), 1) AS o FROM rounds r JOIN courses c
         ON c.course_id = r.course_id GROUP BY c.name ORDER BY o DESC, c.name;`,
    ],
  },
];
