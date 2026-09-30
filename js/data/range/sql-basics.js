// Driving Range problems for SQL Basics: extra practice on skills from that tournament, none repeating a hole.
// They unlock according to RANGE_UNLOCK in js/data/range-config.js.
//
// Problem fields:
//   id            stable key for saved progress ("sql-basics/<id>"). Never rename it once shipped.
//   title         short name for the problem list
//   par           3 (easy), 4 (medium), or 5 (hard): the difficulty and the stroke target
//   tags          topics from TOPICS in js/data/range-config.js (used for filters and rough spots)
//   task          HTML: everything the checker grades (columns and their order, rounding, sort order and ties)
//   solution      the pro's line: one clause per line, lines of 80 characters or fewer
//   hint          the caddie tip (+1 stroke)
//   orderMatters  true when row order is graded (the task must say how to sort, including ties)
//   alternatives  other correct answers the checker must accept (enforced by tests)
//   mistakes      realistic wrong answers the checker must reject (enforced by tests)
// There is no lesson and no starter code: the editor always opens blank.

export default [
  {
    id: 'championship-length',
    title: 'Championship length',
    par: 3,
    tags: ['WHERE', 'ORDER BY'],
    orderMatters: true,
    task: `List the courses longer than <strong>7,000 yards</strong>. Return <code>name</code> and <code>yardage</code>,
      in that order, <strong>longest first</strong>.`,
    solution: `SELECT name, yardage
FROM courses
WHERE yardage > 7000
ORDER BY yardage DESC;`,
    hint: 'Filter with <code>WHERE yardage &gt; 7000</code> and sort with <code>ORDER BY yardage DESC</code>.',
    alternatives: ['select name, yardage from courses where yardage >= 7001 order by 2 desc'],
    mistakes: [
      'SELECT name, yardage FROM courses WHERE yardage > 7000 ORDER BY yardage;',
      'SELECT name, yardage FROM courses WHERE yardage > 7100 ORDER BY yardage DESC;',
      'SELECT name, yardage FROM courses WHERE par = 72 ORDER BY yardage DESC;',
    ],
  },
  {
    id: 'amateur-low-markers',
    title: 'Amateur low markers',
    par: 3,
    tags: ['WHERE', 'ORDER BY'],
    orderMatters: true,
    task: `Find the <strong>amateurs</strong> (<code>is_pro = 0</code>) with a handicap <strong>below 7</strong>. Return
      <code>name</code> and <code>handicap</code>, in that order, lowest handicap first.`,
    solution: `SELECT name, handicap
FROM players
WHERE is_pro = 0
  AND handicap < 7
ORDER BY handicap ASC;`,
    hint: 'Two conditions joined with <code>AND</code>: <code>is_pro = 0</code> and <code>handicap &lt; 7</code>.',
    alternatives: ['SELECT name, handicap FROM players WHERE handicap < 7 AND NOT is_pro ORDER BY handicap;'],
    mistakes: [
      'SELECT name, handicap FROM players WHERE handicap < 7 ORDER BY handicap;',
      'SELECT name, handicap FROM players WHERE is_pro = 0 OR handicap < 7 ORDER BY handicap;',
      'SELECT name, handicap FROM players WHERE is_pro = 0 AND handicap < 7 ORDER BY handicap DESC;',
    ],
  },
  {
    id: 'cypress-conditions',
    title: 'Conditions at Cypress Point',
    par: 4,
    tags: ['DISTINCT', 'JOIN'],
    task: `Which kinds of weather have rounds been played in at <strong>Cypress Point</strong>? Return each
      <code>weather</code> value once.`,
    solution: `SELECT DISTINCT r.weather
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id
WHERE c.name = 'Cypress Point';`,
    hint: "Join <code>rounds</code> to <code>courses</code>, filter on <code>c.name = 'Cypress Point'</code>, and use <code>SELECT DISTINCT</code>.",
    alternatives: [
      "SELECT r.weather FROM courses AS c JOIN rounds AS r USING (course_id) WHERE c.name = 'Cypress Point' GROUP BY r.weather;",
    ],
    mistakes: [
      "SELECT r.weather FROM rounds r JOIN courses c ON c.course_id = r.course_id WHERE c.name = 'Cypress Point';",
      "SELECT DISTINCT r.weather FROM rounds r JOIN courses c ON c.course_id = r.course_id WHERE c.name = 'Cypress point';",
      'SELECT DISTINCT weather FROM rounds;',
    ],
  },
  {
    id: 'season-totals',
    title: 'Season totals',
    par: 3,
    tags: ['Aggregates', 'COUNT DISTINCT'],
    task: `Size up the whole season in one row with four columns, in this order: the number of rounds, how many
      <strong>different</strong> players played them, how many <strong>different</strong> courses they were played
      on, and the total strokes (all scores added up).`,
    solution: `SELECT
  COUNT(*) AS rounds_played,
  COUNT(DISTINCT player_id) AS players,
  COUNT(DISTINCT course_id) AS courses,
  SUM(score) AS total_strokes
FROM rounds;`,
    hint: '<code>COUNT(DISTINCT player_id)</code> counts each player once, however many rounds they played. '
      + 'Do the same for <code>course_id</code>, and add up <code>score</code> with <code>SUM</code>.',
    alternatives: ['SELECT COUNT(round_id), COUNT(DISTINCT player_id), COUNT(DISTINCT course_id), TOTAL(score) FROM rounds;'],
    mistakes: [
      'SELECT COUNT(*), COUNT(player_id), COUNT(course_id), SUM(score) FROM rounds;',
      'SELECT COUNT(*), COUNT(DISTINCT player_id), COUNT(DISTINCT course_id), SUM(DISTINCT score) FROM rounds;',
      'SELECT COUNT(*), COUNT(DISTINCT course_id), COUNT(DISTINCT player_id), SUM(score) FROM rounds;',
    ],
  },
  {
    id: 'busiest-courses',
    title: 'Busiest courses',
    par: 4,
    tags: ['JOIN', 'GROUP BY', 'HAVING', 'ORDER BY'],
    orderMatters: true,
    task: `Which courses have hosted <strong>at least 8 rounds</strong>? Return the course <code>name</code> and its
      number of rounds, in that order. Sort by number of rounds, most first, then by name A→Z.`,
    solution: `SELECT c.name, COUNT(*) AS rounds_played
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY c.course_id, c.name
HAVING COUNT(*) >= 8
ORDER BY rounds_played DESC, c.name ASC;`,
    hint: 'Join, <code>GROUP BY</code> the course, keep groups with <code>HAVING COUNT(*) &gt;= 8</code>, then sort by the count and name.',
    alternatives: [
      'SELECT c.name, COUNT(r.round_id) AS n FROM courses c JOIN rounds r USING (course_id) GROUP BY c.name HAVING n > 7 ORDER BY n DESC, 1;',
    ],
    mistakes: [
      'SELECT c.name, COUNT(*) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING COUNT(*) > 8 ORDER BY n DESC, c.name;',
      'SELECT c.name, COUNT(*) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING COUNT(*) >= 8 ORDER BY n DESC, c.name DESC;',
      'SELECT c.name, COUNT(DISTINCT r.player_id) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING n >= 8 ORDER BY n DESC, c.name;',
    ],
  },
  {
    id: 'april-pros-vs-par',
    title: 'April pros vs par',
    par: 4,
    tags: ['JOIN', 'CASE WHEN', 'Dates'],
    orderMatters: true,
    task: `Label every round played by a <strong>professional</strong> (<code>is_pro = 1</code>) in <strong>April
      2026</strong> against the course's par. Return five columns in this order: <code>round_id</code>, the player's
      <code>name</code>, the course <code>name</code>, <code>score</code>, and a label: <code>'Under par'</code>,
      <code>'Level par'</code>, or <code>'Over par'</code> (exactly). Sort by <code>played_on</code>, then
      <code>round_id</code>.`,
    solution: `SELECT
  r.round_id,
  p.name,
  c.name,
  r.score,
  CASE
    WHEN r.score < c.par THEN 'Under par'
    WHEN r.score = c.par THEN 'Level par'
    ELSE 'Over par'
  END AS result
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
WHERE p.is_pro = 1
  AND r.played_on BETWEEN '2026-04-01' AND '2026-04-30'
ORDER BY r.played_on ASC, r.round_id ASC;`,
    hint: "Join all three tables. Filter <code>p.is_pro = 1</code> and <code>r.played_on BETWEEN '2026-04-01' AND '2026-04-30'</code>, "
      + 'then label with <code>CASE WHEN r.score &lt; c.par … WHEN r.score = c.par … ELSE … END</code>.',
    alternatives: [
      `SELECT r.round_id, p.name, c.name, r.score,
         CASE WHEN r.score > c.par THEN 'Over par' WHEN r.score < c.par THEN 'Under par' ELSE 'Level par' END
       FROM players p JOIN rounds r USING (player_id) JOIN courses c USING (course_id)
       WHERE p.is_pro AND strftime('%Y-%m', r.played_on) = '2026-04' ORDER BY r.played_on, r.round_id;`,
    ],
    mistakes: [
      `SELECT r.round_id, p.name, c.name, r.score,
         CASE WHEN r.score <= c.par THEN 'Under par' ELSE 'Over par' END
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 1 AND r.played_on BETWEEN '2026-04-01' AND '2026-04-30' ORDER BY r.played_on, r.round_id;`,
      `SELECT r.round_id, p.name, c.name, r.score,
         CASE WHEN r.score < c.par THEN 'Under par' WHEN r.score = c.par THEN 'Level par' ELSE 'Over par' END
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 1 AND r.played_on BETWEEN '2026-04-01' AND '2026-04-29' ORDER BY r.played_on, r.round_id;`,
      `SELECT r.round_id, p.name, c.name, r.score,
         CASE WHEN r.score < c.par THEN 'Under par' WHEN r.score = c.par THEN 'Level par' ELSE 'Over par' END
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 1 AND r.played_on BETWEEN '2026-04-01' AND '2026-04-30' ORDER BY r.score, r.round_id;`,
    ],
  },
  {
    id: 'bad-weather-specialists',
    title: 'Bad-weather specialists',
    par: 4,
    tags: ['IN / BETWEEN', 'JOIN', 'GROUP BY', 'HAVING'],
    orderMatters: true,
    task: `Who handles the elements? Considering only rounds played in <strong>Windy or Rain</strong> weather, find the
      players with <strong>at least 2</strong> such rounds. Return three columns in this order: <code>name</code>, their
      number of Windy/Rain rounds, and their average score in those rounds <strong>rounded to 1 decimal</strong>. Sort
      by that average, best (lowest) first, then by name.`,
    solution: `SELECT
  p.name,
  COUNT(*) AS rough_weather_rounds,
  ROUND(AVG(r.score), 1) AS avg_score
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
WHERE r.weather IN ('Windy', 'Rain')
GROUP BY p.player_id, p.name
HAVING COUNT(*) >= 2
ORDER BY avg_score ASC, p.name ASC;`,
    hint: "Filter rows first with <code>WHERE r.weather IN ('Windy', 'Rain')</code>, then group by player and keep <code>HAVING COUNT(*) &gt;= 2</code>.",
    alternatives: [
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score), 1) AS a FROM players p JOIN rounds r USING (player_id)
       WHERE r.weather = 'Windy' OR r.weather = 'Rain' GROUP BY p.name HAVING COUNT(*) > 1 ORDER BY a, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score), 1) AS a FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) >= 2 ORDER BY a, p.name;`,
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score), 1) AS a FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE r.weather IN ('Windy', 'Rain') GROUP BY p.name HAVING COUNT(*) >= 2 ORDER BY a DESC, p.name;`,
      `SELECT p.name, COUNT(*), ROUND(AVG(r.score), 1) AS a FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE r.weather IN ('Windy', 'Rain') GROUP BY p.name HAVING COUNT(*) > 2 ORDER BY a, p.name;`,
    ],
  },
  {
    id: 'most-consistent',
    title: 'Most consistent',
    par: 4,
    tags: ['Aggregates', 'JOIN', 'GROUP BY', 'HAVING'],
    orderMatters: true,
    task: `Who's the most consistent? For every player with <strong>at least 4 rounds</strong>, return three columns in
      this order: <code>name</code>, their score <strong>spread</strong> (worst score minus best score), and their average
      putts <strong>rounded to 1 decimal</strong>. Sort by spread, smallest first, then by name.`,
    solution: `SELECT
  p.name,
  MAX(r.score) - MIN(r.score) AS spread,
  ROUND(AVG(r.putts), 1) AS avg_putts
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
GROUP BY p.player_id, p.name
HAVING COUNT(*) >= 4
ORDER BY spread ASC, p.name ASC;`,
    hint: 'The spread is <code>MAX(r.score) - MIN(r.score)</code>. Group by player, keep <code>HAVING COUNT(*) &gt;= 4</code>, and sort by the spread.',
    alternatives: [
      `SELECT p.name, MAX(score) - MIN(score) AS s, ROUND(SUM(putts) * 1.0 / COUNT(*), 1)
       FROM players p JOIN rounds r USING (player_id) GROUP BY p.name HAVING COUNT(*) > 3 ORDER BY s, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, MIN(r.score) - MAX(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) >= 4 ORDER BY s, p.name;`,
      `SELECT p.name, MAX(r.score) - MIN(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) >= 4 ORDER BY s, p.name DESC;`,
      `SELECT p.name, MAX(r.score) - MIN(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) > 4 ORDER BY s, p.name;`,
    ],
  },
  {
    id: 'pro-share-by-month',
    title: 'Pro share by month',
    par: 5,
    tags: ['Dates', 'Percentages', 'CASE WHEN', 'JOIN'],
    orderMatters: true,
    task: `How much of each month's play came from professionals? For each month with rounds, return three columns in
      this order: the month as <code>YYYY-MM</code> text, the number of rounds, and the <strong>percentage</strong> of
      those rounds played by professionals, <strong>rounded to 1 decimal</strong> (like <code>66.7</code>). Sort by
      month, earliest first.`,
    solution: `SELECT
  strftime('%Y-%m', r.played_on) AS month,
  COUNT(*) AS rounds_played,
  ROUND(100.0 * SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*), 1)
    AS pct_by_pros
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
GROUP BY month
ORDER BY month ASC;`,
    hint: "Group by <code>strftime('%Y-%m', r.played_on)</code> and compute "
      + '<code>ROUND(100.0 * SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*), 1)</code>. The <code>100.0</code> avoids integer division.',
    alternatives: [
      `SELECT substr(r.played_on, 1, 7) AS m, COUNT(*), ROUND(AVG(p.is_pro) * 100, 1)
       FROM rounds r JOIN players p USING (player_id) GROUP BY m ORDER BY m;`,
    ],
    mistakes: [
      `SELECT strftime('%Y-%m', r.played_on) AS m, COUNT(*), 100 * SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY m ORDER BY m;`,
      `SELECT strftime('%m', r.played_on) AS m, COUNT(*), ROUND(100.0 * SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY m ORDER BY m;`,
      `SELECT strftime('%Y-%m', r.played_on) AS m, COUNT(*), ROUND(100.0 * SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY m ORDER BY m DESC;`,
    ],
  },
  {
    id: 'handicap-reality-check',
    title: 'Handicap reality check',
    par: 5,
    tags: ['NULL', 'JOIN', 'Aggregates', 'HAVING'],
    orderMatters: true,
    task: `Do players play to their handicap? For every player who <strong>has a handicap</strong> and at least
      <strong>3 rounds</strong>, return four columns in this order: <code>name</code>, <code>handicap</code>, their
      average strokes over par (<code>score - par</code>) <strong>rounded to 1 decimal</strong>, and the
      <strong>gap</strong>: that average minus their handicap, rounded to 1 decimal. Compute the gap from the
      <em>unrounded</em> average (round only at the end). Sort by the gap, largest first, then by name.`,
    solution: `SELECT
  p.name,
  p.handicap,
  ROUND(AVG(r.score - c.par), 1) AS avg_over_par,
  ROUND(AVG(r.score - c.par) - p.handicap, 1) AS gap
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
WHERE p.handicap IS NOT NULL
GROUP BY p.player_id, p.name, p.handicap
HAVING COUNT(*) >= 3
ORDER BY gap DESC, p.name ASC;`,
    hint: 'Join all three tables, skip players <code>WHERE p.handicap IS NOT NULL</code>, and compute '
      + '<code>ROUND(AVG(r.score - c.par) - p.handicap, 1)</code>, rounding once at the end.',
    alternatives: [
      `SELECT p.name, p.handicap, ROUND(AVG(r.score - c.par), 1), ROUND(AVG(r.score - c.par - p.handicap), 1) AS g
       FROM players p JOIN rounds r USING (player_id) JOIN courses c USING (course_id)
       GROUP BY p.name HAVING COUNT(*) >= 3 AND p.handicap IS NOT NULL ORDER BY g DESC, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, p.handicap, ROUND(AVG(r.score - c.par), 1), ROUND(AVG(r.score - c.par) - p.handicap, 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.name HAVING COUNT(*) >= 3 ORDER BY g DESC, p.name;`,
      `SELECT p.name, p.handicap, ROUND(AVG(r.score - c.par), 1) AS a, ROUND(ROUND(AVG(r.score - c.par), 1) - p.handicap, 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.handicap IS NOT NULL GROUP BY p.name HAVING COUNT(*) >= 3 ORDER BY g DESC, p.name;`,
      `SELECT p.name, p.handicap, ROUND(AVG(r.score - c.par), 1), ROUND(AVG(r.score - c.par) - p.handicap, 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.handicap IS NOT NULL GROUP BY p.name HAVING COUNT(*) >= 3 ORDER BY g, p.name;`,
    ],
  },
];
