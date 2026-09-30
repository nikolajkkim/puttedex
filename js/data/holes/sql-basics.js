// Holes for the "SQL Basics" tournament, in play order (hole 1 first).
// Difficulty ramp: holes 1-6 teach one concept each, 7-12 combine concepts, and 13-18 are interview-style questions
// that combine several.
// A tournament has up to 18 holes; list only the ones that exist. Missing slots show as "coming soon".
//
// Hole fields:
//   id           stable key used for saved progress. Never rename it once shipped.
//   title, par   par is the target stroke count (usually 2, or 3 for harder holes)
//   lesson       HTML teaching the concept (examples in <pre>; use a different table or column than the task)
//   interview    HTML for the "Interview angle" note: how this shows up in interviews
//   yardage      HTML for the yardage book note: which tables and columns this hole needs
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
      SQL keywords aren't case-sensitive, but writing them in UPPERCASE is the convention.</p>`,
    interview: `Interviewers expect you to explore a table before answering questions about it. <code>SELECT *</code> is how you take a first look.`,
    yardage: `Everything you need is in <code>players</code>.`,
    task: `Return <strong>every column</strong> for <strong>every player</strong> in the <code>players</code> table,
      with the columns in the table's own order.`,
    solution: `SELECT *
FROM players;`,
    hint: 'The table is called <code>players</code>. Use <code>SELECT * FROM table_name;</code>.',
    alternatives: [
      'select * from players',
      'SELECT player_id, name, country, handicap, is_pro, home_course_id FROM players;',
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
      <p>Naming columns makes a query faster to read and cheaper to run on wide tables.</p>`,
    interview: `Avoid <code>SELECT *</code> in a final answer. Selecting exactly what the question asks for shows precision.`,
    yardage: `<code>players.name</code> and <code>players.country</code>.`,
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
    interview: `Filters on text are where real data bites. Ask how values are cased and whether they have stray spaces. In SQLite <code>=</code> on text is case-sensitive; in MySQL it usually isn't. Saying so shows you've worked with messy data.`,
    yardage: `<code>players.country</code> holds values like <code>'Scotland'</code>. <code>handicap</code> can be NULL.`,
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
      is unambiguous: <code>WHERE score &lt; 72 AND (weather = 'Rain' OR weather = 'Windy')</code>.</p>`,
    interview: `A missing pair of parentheses around an <code>OR</code> is one of the most common SQL bugs. Say out loud what each condition filters.`,
    yardage: `<code>rounds.score</code> and <code>rounds.putts</code> are both integers.`,
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
      <p>In golf, <strong>lower is better</strong>, so the leaderboard sorts scores ascending.</p>`,
    interview: `"Top N" questions are everywhere. Always ask how ties should be handled. Without a tiebreaker, the order of tied rows isn't guaranteed.`,
    yardage: `<code>rounds.score</code>: lower is better. <code>round_id</code> is unique, so it's a safe tiebreaker.`,
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
    interview: `The usual follow-up is "how many countries?", which is <code>COUNT(DISTINCT country)</code>. Know that <code>DISTINCT</code> applies to the whole row, not one column, and that <code>GROUP BY country</code> gives the same rows when you also need aggregates.`,
    yardage: `<code>players.country</code> repeats: several players share a country.`,
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
      <p>Use <code>IS NULL</code> and <code>IS NOT NULL</code>.</p>`,
    interview: `NULL handling is a favorite trick question. It also matters for aggregates: <code>COUNT(handicap)</code> skips NULLs, but <code>COUNT(*)</code> doesn't.`,
    yardage: `<code>players.handicap</code> is NULL for players without an official handicap.`,
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
      <p><code>ROUND(value, 1)</code> rounds to one decimal place.</p>`,
    interview: `<code>WHERE</code> filters rows <em>before</em> they're aggregated. Remember that for the next shot.`,
    yardage: `All four numbers come from <code>rounds</code>: a row count plus <code>score</code>.`,
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
HAVING COUNT(*) &gt;= 10;</pre>`,
    interview: `"What's the difference between WHERE and HAVING?" is asked constantly. <code>WHERE</code> filters rows before grouping. <code>HAVING</code> filters groups after it.`,
    yardage: `<code>rounds.player_id</code> says whose round it is.`,
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
      <code>r.score - c.par</code> is strokes over par.</p>`,
    interview: `JOIN + GROUP BY is the bread and butter of SQL interviews. Know that <code>JOIN</code> (inner) drops rows that have no match. <code>LEFT JOIN</code> keeps them. That's the next hole.`,
    yardage: `<code>rounds.course_id</code> matches <code>courses.course_id</code>. Par lives in <code>courses.par</code>.`,
    task: `Which course plays hardest? For each course that has been played, return three columns in this order: its <code>name</code>,
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
  {
    id: 'in-between',
    title: 'Weather delay: IN and BETWEEN',
    par: 3,
    lesson: `
      <p>Two shortcuts make filters easier to read. <code>IN</code> matches any value in a list, and <code>BETWEEN</code>
      matches a range, <em>including both ends</em>:</p>
      <pre>SELECT name, yardage FROM courses
WHERE country IN ('USA', 'Japan')
  AND yardage BETWEEN 6500 AND 7000;</pre>
      <p>Dates here are stored as ISO text (<code>'2026-05-29'</code>). That format sorts in date order, so comparisons
      and <code>BETWEEN</code> work on it directly. Just make sure the upper bound really is the last day you want.</p>`,
    interview: `<code>IN</code> is shorthand for several <code>OR</code>s, so it sidesteps the precedence bug from hole 4.
      For date ranges, many interviewers prefer a half-open range
      (<code>played_on &gt;= '2026-05-01' AND played_on &lt; '2026-07-01'</code>). It can't miss the last day, even when
      the column also stores a time of day.`,
    yardage: `<code>rounds.played_on</code> is ISO text (<code>YYYY-MM-DD</code>). <code>rounds.weather</code> is one of
      <code>'Sunny'</code>, <code>'Overcast'</code>, <code>'Windy'</code>, or <code>'Rain'</code>.`,
    task: `Find the rounds played in <strong>May or June 2026</strong> in <strong>Windy or Rain</strong> weather.
      Return <code>round_id</code>, <code>played_on</code>, and <code>weather</code>, in that order.`,
    solution: `SELECT round_id, played_on, weather
FROM rounds
WHERE played_on BETWEEN '2026-05-01' AND '2026-06-30'
  AND weather IN ('Windy', 'Rain');`,
    hint: "Combine <code>played_on BETWEEN '2026-05-01' AND '2026-06-30'</code> with <code>weather IN ('Windy', 'Rain')</code> using <code>AND</code>.",
    alternatives: [
      `SELECT round_id, played_on, weather FROM rounds
         WHERE played_on >= '2026-05-01' AND played_on < '2026-07-01' AND (weather = 'Windy' OR weather = 'Rain');`,
      `SELECT round_id, played_on, weather FROM rounds
         WHERE substr(played_on, 1, 7) IN ('2026-05', '2026-06') AND weather IN ('Rain', 'Windy');`,
    ],
    mistakes: [
      `SELECT round_id, played_on, weather FROM rounds
         WHERE played_on BETWEEN '2026-05-01' AND '2026-06-01' AND weather IN ('Windy', 'Rain');`,
      `SELECT round_id, played_on, weather FROM rounds
         WHERE played_on BETWEEN '2026-05-01' AND '2026-06-30' AND weather = 'Windy' OR weather = 'Rain';`,
      `SELECT round_id, played_on, weather FROM rounds
         WHERE played_on BETWEEN '2026-05-01' AND '2026-06-30' AND weather IN ('Windy', 'Rainy');`,
    ],
  },
  {
    id: 'case-when',
    title: 'Reading the conditions: CASE WHEN',
    par: 3,
    lesson: `
      <p><code>CASE</code> is SQL's if/else. It returns a value for each row:</p>
      <pre>SELECT name,
  CASE WHEN yardage &gt;= 7000 THEN 'Long' ELSE 'Standard' END AS length
FROM courses;</pre>
      <p>Put a <code>CASE</code> inside an aggregate and you get <strong>conditional aggregation</strong>: counting only
      the rows that meet a condition, per group, in a single pass:</p>
      <pre>SELECT country,
  SUM(CASE WHEN par = 72 THEN 1 ELSE 0 END) AS par_72_courses
FROM courses
GROUP BY country;</pre>`,
    interview: `Conditional aggregation is one of the most-used interview patterns ("orders per status", "share of users
      who converted"). A classic trap: <code>COUNT(CASE WHEN … THEN 1 ELSE 0 END)</code> counts <em>every</em> row,
      because 0 isn't NULL. Use <code>SUM(… ELSE 0 END)</code> or <code>COUNT(… THEN 1 END)</code>, with no ELSE.`,
    yardage: `<code>rounds.weather</code> and <code>rounds.score</code>. Every weather condition has at least one round.`,
    task: `For each <code>weather</code> condition, return three columns in this order: the weather, the number of rounds
      played in it, and how many of those rounds had a score <strong>under 75</strong>.`,
    solution: `SELECT
  weather,
  COUNT(*) AS rounds_played,
  SUM(CASE WHEN score < 75 THEN 1 ELSE 0 END) AS rounds_under_75
FROM rounds
GROUP BY weather;`,
    hint: '<code>GROUP BY weather</code>, then <code>COUNT(*)</code> and <code>SUM(CASE WHEN score &lt; 75 THEN 1 ELSE 0 END)</code>.',
    alternatives: [
      'SELECT weather, COUNT(*), COUNT(CASE WHEN score < 75 THEN 1 END) FROM rounds GROUP BY weather;',
      'SELECT weather, COUNT(round_id), SUM(score < 75) FROM rounds GROUP BY weather ORDER BY weather DESC;',
    ],
    mistakes: [
      'SELECT weather, COUNT(*), COUNT(CASE WHEN score < 75 THEN 1 ELSE 0 END) FROM rounds GROUP BY weather;',
      'SELECT weather, COUNT(*), COUNT(*) FROM rounds WHERE score < 75 GROUP BY weather;',
      'SELECT weather, COUNT(*), SUM(CASE WHEN score <= 75 THEN 1 ELSE 0 END) FROM rounds GROUP BY weather;',
    ],
  },
  {
    id: 'never-broke-75',
    title: 'Never broke 75: the "never" question',
    par: 3,
    lesson: `
      <p>Interview questions often ask about something that <strong>never</strong> (or <strong>always</strong>) happened
      within a group: "customers who never returned an item", "players who never broke 75". <code>WHERE</code> can't
      answer that, because it looks at one row at a time. Compute a fact about the whole group, then filter on it with
      <code>HAVING</code>:</p>
      <pre>-- Courses that have never had a round in the rain
SELECT course_id
FROM rounds
GROUP BY course_id
HAVING SUM(CASE WHEN weather = 'Rain' THEN 1 ELSE 0 END) = 0;</pre>
      <p>Often there's an even shorter way to say it. "Never under 75" means "the lowest score is 75 or more":
      <code>MIN(score) &gt;= 75</code>.</p>`,
    interview: `Translate the words into an aggregate out loud: "never below 75" means "minimum is at least 75", and
      "always under par" means "maximum is under par". Then check the boundary: does a 75 count as breaking 75? (No.
      Breaking 75 means 74 or better.) Interviewers listen for exactly that.`,
    yardage: `Names are in <code>players</code>, scores in <code>rounds</code>. Join them on <code>player_id</code>.`,
    task: `Among players who have played at least one round, the club captain wants those who have <strong>never</strong>
      shot a round <strong>under 75</strong>.
      Return each such player's <code>name</code> and their best (lowest) score, in that order.`,
    solution: `SELECT
  p.name,
  MIN(r.score) AS best_score
FROM players AS p
JOIN rounds AS r ON r.player_id = p.player_id
GROUP BY p.player_id, p.name
HAVING MIN(r.score) >= 75;`,
    hint: 'Join <code>players</code> to <code>rounds</code>, <code>GROUP BY</code> the player, and keep the groups where '
      + '<code>HAVING MIN(r.score) &gt;= 75</code>.',
    alternatives: [
      `SELECT p.name, MIN(r.score) FROM rounds r JOIN players p ON p.player_id = r.player_id
         GROUP BY p.name HAVING SUM(CASE WHEN r.score < 75 THEN 1 ELSE 0 END) = 0;`,
      `SELECT p.name, MIN(r.score) AS best FROM players p JOIN rounds r USING (player_id)
         GROUP BY p.player_id HAVING best > 74 ORDER BY best;`,
    ],
    mistakes: [
      'SELECT p.name, MIN(r.score) FROM players p JOIN rounds r ON r.player_id = p.player_id WHERE r.score >= 75 GROUP BY p.name;',
      'SELECT p.name, MIN(r.score) FROM players p JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name HAVING MIN(r.score) > 75;',
      'SELECT p.name, MIN(r.score) FROM players p JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name HAVING MAX(r.score) >= 75;',
    ],
  },
  {
    id: 'count-distinct',
    title: 'Course collector: COUNT(DISTINCT)',
    par: 3,
    lesson: `
      <p><code>COUNT(*)</code> counts rows. <code>COUNT(DISTINCT column)</code> counts the different values in a column,
      ignoring repeats (and NULLs):</p>
      <pre>SELECT course_id,
  COUNT(*) AS rounds,
  COUNT(DISTINCT player_id) AS different_players
FROM rounds
GROUP BY course_id;</pre>
      <p>The two numbers answer different questions. A course with 13 rounds may have seen far fewer than 13 different
      players.</p>`,
    interview: `"How many unique users…?" is one of the most common interview metrics: daily active users, unique
      buyers, repeat customers. <code>COUNT(*)</code> where they asked for unique gives a number that looks plausible
      and is wrong. Before you count, ask yourself: rows, or distinct things?`,
    yardage: `<code>rounds.course_id</code> repeats whenever a player returns to a course. Names are in
      <code>players</code>.`,
    task: `Which players are true course collectors? Find the players who have played <strong>at least 4 different
      courses</strong>. Return three columns in this order: <code>name</code>, the number of different courses they've
      played, and their total number of rounds.`,
    solution: `SELECT
  p.name,
  COUNT(DISTINCT r.course_id) AS courses_played,
  COUNT(*) AS rounds_played
FROM players AS p
JOIN rounds AS r ON r.player_id = p.player_id
GROUP BY p.player_id, p.name
HAVING COUNT(DISTINCT r.course_id) >= 4;`,
    hint: 'After joining and grouping by player, use <code>COUNT(DISTINCT r.course_id)</code> in the SELECT list '
      + 'and again in <code>HAVING … &gt;= 4</code>.',
    alternatives: [
      `SELECT p.name, COUNT(DISTINCT r.course_id) AS courses, COUNT(r.round_id) FROM rounds r
         JOIN players p ON p.player_id = r.player_id GROUP BY p.name HAVING courses > 3;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(r.course_id), COUNT(*) FROM players p JOIN rounds r ON r.player_id = p.player_id
         GROUP BY p.name HAVING COUNT(r.course_id) >= 4;`,
      `SELECT p.name, COUNT(DISTINCT r.course_id), COUNT(*) FROM players p JOIN rounds r ON r.player_id = p.player_id
         GROUP BY p.name HAVING COUNT(*) >= 4;`,
    ],
  },
  {
    id: 'by-month',
    title: 'Season form: grouping by month',
    par: 3,
    orderMatters: true,
    lesson: `
      <p>Time-series questions usually start by putting dates into buckets. With ISO-text dates, <code>strftime</code>
      formats a date however you need: <code>strftime('%Y', played_on)</code> is the year, and
      <code>strftime('%Y-%m', played_on)</code> is year and month. <code>substr(played_on, 1, 7)</code> does the same
      job by taking the first seven characters.</p>
      <pre>SELECT strftime('%Y', played_on) AS year, COUNT(*) AS rounds
FROM rounds
GROUP BY year;</pre>
      <p>As above, you can <code>GROUP BY</code> and <code>ORDER BY</code> an alias from the SELECT list.</p>`,
    interview: `Monthly (or weekly, or daily) metrics are everywhere in product interviews: rounds per month, revenue per
      week, active users per day. Group by <strong>year and month</strong>, not month alone, or March 2025 and March 2026
      land in the same bucket. Date functions differ between databases (<code>DATE_TRUNC</code> in Postgres,
      <code>strftime</code> in SQLite), so name the one you'd use.`,
    yardage: `<code>rounds.played_on</code> is ISO text, such as <code>'2026-05-29'</code>. The rounds run from March to
      August 2026.`,
    task: `Show the season month by month. For each month that has rounds, return three columns in this order: the month
      as <code>YYYY-MM</code> text (like <code>2026-05</code>), the number of rounds, and the average score
      <strong>rounded to 1 decimal</strong>. Sort by month, <strong>earliest first</strong>.`,
    solution: `SELECT
  strftime('%Y-%m', played_on) AS month,
  COUNT(*) AS rounds_played,
  ROUND(AVG(score), 1) AS avg_score
FROM rounds
GROUP BY month
ORDER BY month ASC;`,
    hint: "<code>strftime('%Y-%m', played_on) AS month</code>, then <code>GROUP BY month</code> and <code>ORDER BY month</code>.",
    alternatives: [
      'SELECT substr(played_on, 1, 7), COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY 1 ORDER BY 1;',
    ],
    mistakes: [
      "SELECT strftime('%m', played_on) AS m, COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY m ORDER BY m;",
      "SELECT strftime('%Y-%m', played_on) AS m, COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY m ORDER BY m DESC;",
      "SELECT strftime('%Y-%m', played_on) AS m, COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY m ORDER BY COUNT(*) DESC;",
    ],
  },
  {
    id: 'percentages',
    title: 'Putting clinic: percentages',
    par: 3,
    lesson: `
      <p>A percentage is a conditional count divided by a total. You already have both pieces:</p>
      <pre>SELECT
  ROUND(100.0 * SUM(CASE WHEN is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_pros
FROM players;</pre>
      <p>Notice the <code>100.0</code>. In SQLite (and Postgres, and SQL Server), dividing an integer by an integer
      <strong>throws away the fraction</strong>: <code>7 / 2</code> is <code>3</code>. Multiplying by <code>100.0</code>
      first makes the arithmetic decimal.</p>
      <p>You can also <code>GROUP BY</code> a <code>CASE</code> expression to make your own categories.</p>`,
    interview: `Integer division is the most common silent bug in SQL interviews. <code>SUM(x) / COUNT(*)</code> returns 0
      for any rate under 100%, and interviewers watch for it. Multiply by <code>100.0</code> (or <code>CAST(… AS
      REAL)</code>) before dividing, and say why you did it.`,
    yardage: `<code>players.is_pro</code> is 1 for professionals and 0 for amateurs. <code>rounds.putts</code> is per round.
      Join them on <code>player_id</code>.`,
    task: `Does experience show on the greens? Split all rounds by whether the player is a professional. Return three
      columns in this order: the text <code>'Pro'</code> or <code>'Amateur'</code> (exactly), the number of rounds, and
      the <strong>percentage</strong> of those rounds with <strong>28 putts or fewer</strong>, rounded to 1 decimal
      (like <code>12.5</code>, not <code>0.125</code>).`,
    solution: `SELECT
  CASE WHEN p.is_pro = 1 THEN 'Pro' ELSE 'Amateur' END AS player_type,
  COUNT(*) AS rounds_played,
  ROUND(100.0 * SUM(CASE WHEN r.putts <= 28 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_28_putts_or_fewer
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
GROUP BY player_type;`,
    hint: "Group by <code>CASE WHEN p.is_pro = 1 THEN 'Pro' ELSE 'Amateur' END</code>, and compute "
      + '<code>ROUND(100.0 * SUM(CASE WHEN r.putts &lt;= 28 THEN 1 ELSE 0 END) / COUNT(*), 1)</code>.',
    alternatives: [
      `SELECT CASE p.is_pro WHEN 1 THEN 'Pro' ELSE 'Amateur' END, COUNT(*),
         ROUND(AVG(CASE WHEN r.putts <= 28 THEN 100.0 ELSE 0 END), 1)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.is_pro;`,
      `SELECT IIF(p.is_pro, 'Pro', 'Amateur') AS t, COUNT(*),
         ROUND(CAST(SUM(r.putts <= 28) AS REAL) / COUNT(*) * 100, 1)
       FROM rounds r JOIN players p USING (player_id) GROUP BY t;`,
    ],
    mistakes: [
      `SELECT CASE WHEN p.is_pro = 1 THEN 'Pro' ELSE 'Amateur' END AS t, COUNT(*),
         100 * SUM(CASE WHEN r.putts <= 28 THEN 1 ELSE 0 END) / COUNT(*)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY t;`,
      `SELECT CASE WHEN p.is_pro = 1 THEN 'Pro' ELSE 'Amateur' END AS t, COUNT(*),
         ROUND(1.0 * SUM(CASE WHEN r.putts <= 28 THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY t;`,
      `SELECT CASE WHEN p.is_pro = 1 THEN 'Pro' ELSE 'Amateur' END AS t, COUNT(*),
         ROUND(100.0 * SUM(CASE WHEN r.putts < 28 THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY t;`,
    ],
  },
  {
    id: 'home-soil',
    title: 'Home soil: joining three tables',
    par: 4,
    lesson: `
      <p>One <code>JOIN</code> connects two tables, and you can keep chaining them. Each <code>JOIN</code> brings in one
      more table with its own <code>ON</code> condition:</p>
      <pre>SELECT
  r.round_id,
  p.name AS player,
  c.name AS course
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id;</pre>
      <p>Once the tables are lined up, a condition can compare columns from different tables. Aliases matter here:
      <code>players</code> and <code>courses</code> both have <code>name</code> and <code>country</code> columns.</p>`,
    interview: `When a question compares two things ("orders shipped to the customer's home state", "rounds in the
      player's home country"), join everything onto the fact table first, then compare columns. Don't filter with
      <code>WHERE</code> before counting: players with zero home rounds would vanish from your answer, and "zero" is
      often the interesting result.`,
    yardage: `<code>players.country</code> and <code>courses.country</code> use the same names (like <code>'USA'</code>
      and <code>'Scotland'</code>). <code>rounds</code> links a player to a course.`,
    task: `Do players play better at home? First, count it. For <strong>every</strong> player who has played a round,
      return three columns in this order: <code>name</code>, the number of rounds they played at a course in <strong>their own country</strong>,
      and the number they played <strong>abroad</strong>. Players with no home rounds must still appear, with 0.`,
    solution: `SELECT
  p.name,
  SUM(CASE WHEN c.country = p.country THEN 1 ELSE 0 END) AS home_rounds,
  SUM(CASE WHEN c.country <> p.country THEN 1 ELSE 0 END) AS away_rounds
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY p.player_id, p.name;`,
    hint: 'Join <code>rounds</code> to both <code>players</code> and <code>courses</code>, <code>GROUP BY</code> the player, '
      + 'and use <code>SUM(CASE WHEN c.country = p.country THEN 1 ELSE 0 END)</code> for home (and the opposite for abroad).',
    alternatives: [
      `SELECT p.name, SUM(c.country = p.country), COUNT(*) - SUM(c.country = p.country)
       FROM players p JOIN rounds r ON r.player_id = p.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(*), 0 FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id WHERE c.country = p.country GROUP BY p.name;`,
      `SELECT p.name, SUM(CASE WHEN c.country = p.country THEN 1 ELSE 0 END), SUM(CASE WHEN c.country <> p.country THEN 1 ELSE 0 END)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.player_id GROUP BY p.name;`,
      `SELECT p.name, SUM(CASE WHEN c.country <> p.country THEN 1 ELSE 0 END), SUM(CASE WHEN c.country = p.country THEN 1 ELSE 0 END)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id GROUP BY p.name;`,
    ],
  },
  {
    id: 'player-of-the-year',
    title: 'Player of the year: the final leaderboard',
    par: 4,
    orderMatters: true,
    lesson: `
      <p>The last hole puts the whole round together. There's no new syntax, just the order a query actually runs in:</p>
      <ol>
        <li><code>FROM</code> and <code>JOIN</code>: line up the tables</li>
        <li><code>WHERE</code>: drop the rows you don't want</li>
        <li><code>GROUP BY</code>: form the groups</li>
        <li><code>HAVING</code>: drop the groups you don't want</li>
        <li><code>SELECT</code>: compute the output columns</li>
        <li><code>ORDER BY</code> and <code>LIMIT</code>: sort and trim</li>
      </ol>
      <p>That order explains the rules you've met on this course: <code>WHERE</code> can't see aggregates, and
      <code>ORDER BY</code> can use a <code>SELECT</code> alias.</p>`,
    interview: `For a multi-part question, talk through that order before you type: "I'll join rounds to courses to get
      par, group by player, keep players with at least four rounds, then sort." Interviewers grade how you break the
      problem down as much as the final query. Say how you're handling ties, too.`,
    yardage: `One round's strokes over par is <code>r.score - c.par</code>. Par is in <code>courses</code>, names are in
      <code>players</code>, and <code>rounds</code> connects them.`,
    task: `Crown the player of the year. For every player with <strong>at least 4 rounds</strong>, return four columns in
      this order: <code>name</code>, their number of rounds, their average strokes over par (<code>score - par</code>)
      <strong>rounded to 1 decimal</strong>, and their best single round relative to par (the lowest
      <code>score - par</code>). Sort by the rounded average, <strong>best (lowest) first</strong>, then by name A→Z.`,
    solution: `SELECT
  p.name,
  COUNT(*) AS rounds_played,
  ROUND(AVG(r.score - c.par), 1) AS avg_over_par,
  MIN(r.score - c.par) AS best_over_par
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY p.player_id, p.name
HAVING COUNT(*) >= 4
ORDER BY avg_over_par ASC, p.name ASC;`,
    hint: 'Join <code>rounds</code> to <code>players</code> and <code>courses</code>. <code>GROUP BY</code> the player with '
      + '<code>HAVING COUNT(*) &gt;= 4</code>, select <code>ROUND(AVG(r.score - c.par), 1)</code> and '
      + '<code>MIN(r.score - c.par)</code>, then <code>ORDER BY</code> the average, then name.',
    alternatives: [
      `SELECT p.name, COUNT(r.round_id), ROUND(AVG(r.score - c.par), 1), MIN(r.score - c.par)
       FROM players p JOIN rounds r USING (player_id) JOIN courses c USING (course_id)
       GROUP BY p.name HAVING COUNT(*) > 3 ORDER BY 3, 1;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a, MIN(r.score - c.par)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name ORDER BY a, p.name;`,
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a, MIN(r.score - c.par)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name HAVING COUNT(*) >= 4 ORDER BY a DESC, p.name;`,
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a, MAX(r.score - c.par)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name HAVING COUNT(*) >= 4 ORDER BY a, p.name;`,
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score), 1) AS a, MIN(r.score - c.par)
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name HAVING COUNT(*) >= 4 ORDER BY a, p.name;`,
    ],
  },
];
