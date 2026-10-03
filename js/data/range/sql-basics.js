// Driving Range problems for SQL Basics: extra practice on skills from that tournament, none repeating a hole.
// They unlock according to RANGE_UNLOCK in js/data/range-config.js.
//
// Problem fields:
//   id            stable key for saved progress ("sql-basics/<id>"). Never rename it once shipped.
//   title         short name for the problem list
//   difficulty    'easy' (one concept), 'medium' (two combined), or 'hard' (interview-style, multi-step).
//                 Par comes from it: see js/data/par-config.js.
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
    difficulty: 'easy',
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
    difficulty: 'easy',
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
    difficulty: 'medium',
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
    difficulty: 'easy',
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
    difficulty: 'medium',
    tags: ['JOIN', 'GROUP BY', 'HAVING', 'ORDER BY'],
    orderMatters: true,
    task: `Which courses have hosted <strong>at least 14 rounds</strong>? Return the course <code>name</code> and its
      number of rounds, in that order. Sort by number of rounds, most first, then by name A→Z.`,
    solution: `SELECT c.name, COUNT(*) AS rounds_played
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY c.course_id, c.name
HAVING COUNT(*) >= 14
ORDER BY rounds_played DESC, c.name ASC;`,
    hint: 'Join, <code>GROUP BY</code> the course, keep groups with <code>HAVING COUNT(*) &gt;= 14</code>, then sort by the count and name.',
    alternatives: [
      'SELECT c.name, COUNT(r.round_id) AS n FROM courses c JOIN rounds r USING (course_id) GROUP BY c.name HAVING n > 13 ORDER BY n DESC, 1;',
    ],
    mistakes: [
      'SELECT c.name, COUNT(*) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING COUNT(*) > 14 ORDER BY n DESC, c.name;',
      'SELECT c.name, COUNT(*) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING COUNT(*) >= 14 ORDER BY n DESC, c.name DESC;',
      'SELECT c.name, COUNT(DISTINCT r.player_id) AS n FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name HAVING n >= 14 ORDER BY n DESC, c.name;',
    ],
  },
  {
    id: 'april-pros-vs-par',
    title: 'April pros vs par',
    difficulty: 'medium',
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
    difficulty: 'medium',
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
    difficulty: 'medium',
    tags: ['Aggregates', 'JOIN', 'GROUP BY', 'HAVING'],
    orderMatters: true,
    task: `Who's the most consistent? For every player with <strong>at least 7 rounds</strong>, return three columns in
      this order: <code>name</code>, their score <strong>spread</strong> (worst score minus best score), and their average
      putts <strong>rounded to 1 decimal</strong>. Sort by spread, smallest first, then by name.`,
    solution: `SELECT
  p.name,
  MAX(r.score) - MIN(r.score) AS spread,
  ROUND(AVG(r.putts), 1) AS avg_putts
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
GROUP BY p.player_id, p.name
HAVING COUNT(*) >= 7
ORDER BY spread ASC, p.name ASC;`,
    hint: 'The spread is <code>MAX(r.score) - MIN(r.score)</code>. Group by player, keep <code>HAVING COUNT(*) &gt;= 7</code>, and sort by the spread.',
    alternatives: [
      `SELECT p.name, MAX(score) - MIN(score) AS s, ROUND(SUM(putts) * 1.0 / COUNT(*), 1)
       FROM players p JOIN rounds r USING (player_id) GROUP BY p.name HAVING COUNT(*) > 6 ORDER BY s, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, MIN(r.score) - MAX(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) >= 7 ORDER BY s, p.name;`,
      `SELECT p.name, MAX(r.score) - MIN(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) >= 7 ORDER BY s, p.name DESC;`,
      `SELECT p.name, MAX(r.score) - MIN(r.score) AS s, ROUND(AVG(r.putts), 1) FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.name HAVING COUNT(*) > 7 ORDER BY s, p.name;`,
    ],
  },
  {
    id: 'pro-share-by-month',
    title: 'Pro share by month',
    difficulty: 'hard',
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
    difficulty: 'hard',
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
  {
    id: 'tee-to-green',
    title: 'Tee to green',
    difficulty: 'easy',
    tags: ['SELECT'],
    task: `Every stroke that isn't a putt is played "tee to green". For <strong>every round</strong>, return four
      columns in this order: <code>round_id</code>, <code>score</code>, <code>putts</code>, and the number of
      tee-to-green strokes (the score minus the putts).`,
    solution: `SELECT
  round_id,
  score,
  putts,
  score - putts AS tee_to_green
FROM rounds;`,
    hint: 'A column can be a calculation: add <code>score - putts</code> to the SELECT list, with an alias if you like.',
    alternatives: ['SELECT round_id, score, putts, -putts + score FROM rounds ORDER BY round_id DESC;'],
    mistakes: [
      'SELECT round_id, score, putts, putts - score FROM rounds;',
      'SELECT round_id, score, putts FROM rounds;',
      'SELECT round_id, score - putts, score, putts FROM rounds;',
    ],
  },
  {
    id: 'par-by-country',
    title: 'Par by country',
    difficulty: 'easy',
    tags: ['DISTINCT'],
    task: `Which <strong>combinations</strong> of country and par exist among our courses? Return <code>country</code>
      and <code>par</code>, in that order, with each combination listed once.`,
    solution: `SELECT DISTINCT country, par
FROM courses;`,
    hint: '<code>DISTINCT</code> applies to the whole row: <code>SELECT DISTINCT country, par</code> removes repeated pairs.',
    alternatives: ['SELECT country, par FROM courses GROUP BY country, par;'],
    mistakes: [
      'SELECT country, par FROM courses;',
      'SELECT DISTINCT country FROM courses;',
      'SELECT DISTINCT par, country FROM courses;',
    ],
  },
  {
    id: 'handicap-headcount',
    title: 'Handicap headcount',
    difficulty: 'easy',
    tags: ['NULL', 'Aggregates'],
    task: `How many members have an official handicap? Return one row with three columns, in this order: the total number
      of players, the number who <strong>have</strong> a handicap, and the number who <strong>don't</strong>.`,
    solution: `SELECT
  COUNT(*) AS players,
  COUNT(handicap) AS with_handicap,
  COUNT(*) - COUNT(handicap) AS without_handicap
FROM players;`,
    hint: '<code>COUNT(*)</code> counts every row, but <code>COUNT(handicap)</code> skips NULLs. The difference is the players without one.',
    alternatives: [
      'SELECT COUNT(player_id), SUM(handicap IS NOT NULL), SUM(handicap IS NULL) FROM players;',
    ],
    mistakes: [
      'SELECT COUNT(*), COUNT(handicap), COUNT(handicap IS NULL) FROM players;',
      'SELECT COUNT(*), COUNT(*), 0 FROM players;',
      'SELECT COUNT(*), COUNT(handicap), COUNT(*) - COUNT(handicap) FROM players WHERE handicap IS NOT NULL;',
    ],
  },
  {
    id: 'latest-results',
    title: 'Latest results',
    difficulty: 'easy',
    tags: ['ORDER BY', 'LIMIT'],
    orderMatters: true,
    task: `Show the <strong>10 most recent</strong> rounds. Return <code>played_on</code>, <code>round_id</code>, and
      <code>score</code>, in that order, <strong>newest first</strong>. Rounds played on the same day are listed by
      <code>round_id</code>, <strong>lowest first</strong>.`,
    solution: `SELECT played_on, round_id, score
FROM rounds
ORDER BY played_on DESC, round_id ASC
LIMIT 10;`,
    hint: 'Each <code>ORDER BY</code> column has its own direction: <code>ORDER BY played_on DESC, round_id ASC</code>, then <code>LIMIT 10</code>.',
    alternatives: ['SELECT played_on, round_id, score FROM rounds ORDER BY 1 DESC, 2 LIMIT 10;'],
    mistakes: [
      'SELECT played_on, round_id, score FROM rounds ORDER BY played_on DESC, round_id DESC LIMIT 10;',
      'SELECT played_on, round_id, score FROM rounds ORDER BY played_on, round_id LIMIT 10;',
      'SELECT played_on, round_id, score FROM rounds ORDER BY played_on DESC, round_id LIMIT 8;',
    ],
  },
  {
    id: 'high-or-unrated',
    title: 'High handicap or unrated',
    difficulty: 'easy',
    tags: ['NULL', 'WHERE'],
    task: `The club is running a beginners' clinic for players whose handicap is <strong>10 or higher</strong>, and for
      players who <strong>don't have a handicap yet</strong>. Return the <code>name</code> and <code>handicap</code> of
      everyone invited, in that order.`,
    solution: `SELECT name, handicap
FROM players
WHERE handicap >= 10
  OR handicap IS NULL;`,
    hint: 'A comparison with NULL is never true, so <code>handicap &gt;= 10</code> alone skips the unrated players. Add <code>OR handicap IS NULL</code>.',
    alternatives: ['SELECT name, handicap FROM players WHERE handicap IS NULL OR NOT handicap < 10 ORDER BY name;'],
    mistakes: [
      'SELECT name, handicap FROM players WHERE handicap >= 10;',
      'SELECT name, handicap FROM players WHERE NOT handicap < 10;',
      'SELECT name, handicap FROM players WHERE handicap > 10 OR handicap = NULL;',
    ],
  },
  {
    id: 'yards-per-par',
    title: 'Yards per par stroke',
    difficulty: 'medium',
    tags: ['SELECT', 'ORDER BY', 'LIMIT'],
    orderMatters: true,
    task: `A course's par says how many strokes it should take, so <strong>yards per par stroke</strong> (yardage
      divided by par) compares courses fairly. Find the <strong>3 courses with the fewest</strong> yards per par stroke.
      Return <code>name</code>, <code>yardage</code>, <code>par</code>, and yards per par stroke
      <strong>rounded to 1 decimal</strong>, in that order, fewest first.`,
    solution: `SELECT
  name,
  yardage,
  par,
  ROUND(yardage * 1.0 / par, 1) AS yards_per_par
FROM courses
ORDER BY yardage * 1.0 / par ASC
LIMIT 3;`,
    hint: 'Compute <code>yardage * 1.0 / par</code> (the <code>1.0</code> avoids integer division), sort by it, and keep the first 3.',
    alternatives: ['SELECT name, yardage, par, ROUND(CAST(yardage AS REAL) / par, 1) AS ypp FROM courses ORDER BY ypp LIMIT 3;'],
    mistakes: [
      'SELECT name, yardage, par, ROUND(yardage * 1.0 / par, 1) FROM courses ORDER BY yardage LIMIT 3;',
      'SELECT name, yardage, par, yardage / par AS ypp FROM courses ORDER BY ypp, name LIMIT 3;',
      'SELECT name, yardage, par, ROUND(yardage * 1.0 / par, 1) AS ypp FROM courses ORDER BY ypp DESC LIMIT 3;',
    ],
  },
  {
    id: 'amateur-courses',
    title: 'Where the amateurs play',
    difficulty: 'medium',
    tags: ['DISTINCT', 'JOIN'],
    orderMatters: true,
    task: `On which courses has <strong>at least one amateur</strong> (<code>is_pro = 0</code>) played a round? Return
      each course <code>name</code> once, A→Z.`,
    solution: `SELECT DISTINCT c.name
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
WHERE p.is_pro = 0
ORDER BY c.name ASC;`,
    hint: 'Join <code>rounds</code> to <code>players</code> (for <code>is_pro</code>) and <code>courses</code> (for the name), filter, '
      + 'then <code>SELECT DISTINCT c.name</code> and sort.',
    alternatives: [
      `SELECT c.name FROM courses c JOIN rounds r USING (course_id) JOIN players p USING (player_id)
       WHERE NOT p.is_pro GROUP BY c.name ORDER BY 1;`,
    ],
    mistakes: [
      `SELECT c.name FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 0 ORDER BY c.name;`,
      `SELECT DISTINCT c.name FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 1 ORDER BY c.name;`,
      `SELECT DISTINCT c.name FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE p.is_pro = 0 ORDER BY c.name DESC;`,
    ],
  },
  {
    id: 'weather-crowds',
    title: 'Weather crowds',
    difficulty: 'medium',
    tags: ['COUNT DISTINCT', 'GROUP BY'],
    task: `Does bad weather keep people away? For each <code>weather</code> condition, return four columns in this order:
      the weather, the number of rounds played in it, how many <strong>different</strong> players played them, and on
      how many <strong>different</strong> courses.`,
    solution: `SELECT
  weather,
  COUNT(*) AS rounds_played,
  COUNT(DISTINCT player_id) AS players,
  COUNT(DISTINCT course_id) AS courses
FROM rounds
GROUP BY weather;`,
    hint: '<code>GROUP BY weather</code>, then <code>COUNT(*)</code>, <code>COUNT(DISTINCT player_id)</code>, and <code>COUNT(DISTINCT course_id)</code>.',
    alternatives: ['SELECT weather, COUNT(round_id), COUNT(DISTINCT player_id), COUNT(DISTINCT course_id) FROM rounds GROUP BY 1 ORDER BY 2 DESC;'],
    mistakes: [
      'SELECT weather, COUNT(*), COUNT(player_id), COUNT(course_id) FROM rounds GROUP BY weather;',
      'SELECT weather, COUNT(DISTINCT player_id), COUNT(*), COUNT(DISTINCT course_id) FROM rounds GROUP BY weather;',
      'SELECT weather, COUNT(*), COUNT(DISTINCT player_id), COUNT(DISTINCT course_id) FROM rounds GROUP BY weather, course_id;',
    ],
  },
  {
    id: 'spring-vs-summer',
    title: 'Spring vs summer',
    difficulty: 'medium',
    tags: ['CASE WHEN', 'Dates', 'IN / BETWEEN', 'GROUP BY'],
    orderMatters: true,
    task: `Split the season in two: rounds from <strong>March 1 to May 31, 2026</strong> (both days included) are
      <code>'Spring'</code>, and every later round is <code>'Summer'</code>. For each half, return three columns in this
      order: the label (exactly as written), the number of rounds, and the average score <strong>rounded to 1
      decimal</strong>. List Spring first.`,
    solution: `SELECT
  CASE
    WHEN played_on BETWEEN '2026-03-01' AND '2026-05-31' THEN 'Spring'
    ELSE 'Summer'
  END AS half,
  COUNT(*) AS rounds_played,
  ROUND(AVG(score), 1) AS avg_score
FROM rounds
GROUP BY half
ORDER BY half ASC;`,
    hint: "Label each round with <code>CASE WHEN played_on BETWEEN '2026-03-01' AND '2026-05-31' THEN 'Spring' ELSE 'Summer' END</code>, "
      + 'then group by that label.',
    alternatives: [
      `SELECT CASE WHEN played_on < '2026-06-01' THEN 'Spring' ELSE 'Summer' END AS h, COUNT(*), ROUND(AVG(score), 1)
       FROM rounds GROUP BY h ORDER BY MIN(played_on);`,
    ],
    mistakes: [
      `SELECT CASE WHEN played_on < '2026-05-31' THEN 'Spring' ELSE 'Summer' END AS h, COUNT(*), ROUND(AVG(score), 1)
       FROM rounds GROUP BY h ORDER BY h;`,
      `SELECT CASE WHEN played_on BETWEEN '2026-03-01' AND '2026-05-31' THEN 'Spring' ELSE 'Summer' END AS h, COUNT(*),
         ROUND(AVG(score), 1) FROM rounds GROUP BY h ORDER BY h DESC;`,
      `SELECT CASE WHEN played_on BETWEEN '2026-03-01' AND '2026-05-31' THEN 'Spring' ELSE 'Summer' END AS h, COUNT(*),
         ROUND(SUM(score) / COUNT(*), 1) FROM rounds GROUP BY h ORDER BY h;`,
    ],
  },
  {
    id: 'putting-share',
    title: 'Putting share',
    difficulty: 'medium',
    tags: ['SELECT', 'Percentages', 'ORDER BY'],
    orderMatters: true,
    task: `Which rounds were won or lost on the greens? A round's <strong>putting share</strong> is putts as a percentage
      of the score. Find every round with a putting share of <strong>43% or more</strong>. Return
      <code>round_id</code>, <code>score</code>, <code>putts</code>, and the putting share <strong>rounded to 1
      decimal</strong> (like <code>43.8</code>), in that order. Sort by putting share, highest first, then by
      <code>round_id</code>.`,
    solution: `SELECT
  round_id,
  score,
  putts,
  ROUND(100.0 * putts / score, 1) AS putting_share
FROM rounds
WHERE 100.0 * putts / score >= 43
ORDER BY 100.0 * putts / score DESC, round_id ASC;`,
    hint: 'The share is <code>100.0 * putts / score</code> (the <code>100.0</code> avoids integer division). Filter on it, '
      + 'round it for display, and sort by it.',
    alternatives: [
      `SELECT round_id, score, putts, ROUND(putts * 100.0 / score, 1) AS s FROM rounds
       WHERE putts * 100.0 >= 43 * score ORDER BY putts * 1.0 / score DESC, round_id;`,
    ],
    mistakes: [
      `SELECT round_id, score, putts, ROUND(100.0 * putts / score, 1) FROM rounds
       WHERE 100.0 * putts / score >= 43 ORDER BY putts DESC, round_id;`,
      `SELECT round_id, score, putts, 100 * putts / score AS s FROM rounds
       WHERE 100 * putts / score >= 43 ORDER BY s DESC, round_id;`,
      `SELECT round_id, score, putts, ROUND(100.0 * putts / score, 1) FROM rounds
       WHERE 100.0 * putts / score > 44 ORDER BY 100.0 * putts / score DESC, round_id;`,
    ],
  },
  {
    id: 'rough-weather-grinders',
    title: 'Rough-weather grinders',
    difficulty: 'medium',
    tags: ['IN / BETWEEN', 'WHERE'],
    orderMatters: true,
    task: `Find the rounds played in <strong>Windy or Rain</strong> weather that <strong>either</strong> scored between
      70 and 75 (both included) <strong>or</strong> took 33 putts or more. Return <code>round_id</code>,
      <code>weather</code>, <code>score</code>, and <code>putts</code>, in that order, sorted by
      <code>round_id</code>.`,
    solution: `SELECT round_id, weather, score, putts
FROM rounds
WHERE weather IN ('Windy', 'Rain')
  AND (score BETWEEN 70 AND 75 OR putts >= 33)
ORDER BY round_id ASC;`,
    hint: "<code>AND</code> binds tighter than <code>OR</code>, so wrap the either/or part in parentheses: "
      + "<code>weather IN ('Windy', 'Rain') AND (… OR …)</code>.",
    alternatives: [
      `SELECT round_id, weather, score, putts FROM rounds
       WHERE (weather = 'Windy' OR weather = 'Rain') AND (score >= 70 AND score <= 75 OR putts > 32) ORDER BY 1;`,
    ],
    mistakes: [
      `SELECT round_id, weather, score, putts FROM rounds
       WHERE weather IN ('Windy', 'Rain') AND score BETWEEN 70 AND 75 OR putts >= 33 ORDER BY round_id;`,
      `SELECT round_id, weather, score, putts FROM rounds
       WHERE weather IN ('Windy', 'Rain') AND (score BETWEEN 70 AND 75 OR putts > 33) ORDER BY round_id;`,
      `SELECT round_id, weather, score, putts FROM rounds
       WHERE weather IN ('Windy', 'Rain') AND (score BETWEEN 70 AND 75 OR putts >= 33) ORDER BY score, round_id;`,
    ],
  },
  {
    id: 'weather-impact',
    title: 'Weather impact report',
    difficulty: 'hard',
    tags: ['JOIN', 'GROUP BY', 'CASE WHEN', 'Percentages'],
    orderMatters: true,
    task: `The club wants a weather impact report. For each <code>weather</code> condition, return four columns in this
      order: the weather, the number of rounds, the average strokes over par (<code>score - par</code>)
      <strong>rounded to 1 decimal</strong>, and the percentage of those rounds finished <strong>at or under par</strong>,
      rounded to 1 decimal. Sort by average strokes over par, <strong>easiest conditions first</strong>.`,
    solution: `SELECT
  r.weather,
  COUNT(*) AS rounds_played,
  ROUND(AVG(r.score - c.par), 1) AS avg_over_par,
  ROUND(100.0 * SUM(CASE WHEN r.score <= c.par THEN 1 ELSE 0 END) / COUNT(*), 1)
    AS pct_at_or_under_par
FROM rounds AS r
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY r.weather
ORDER BY avg_over_par ASC;`,
    hint: 'Join <code>courses</code> for par and <code>GROUP BY r.weather</code>. Use <code>AVG(r.score - c.par)</code>, and '
      + '<code>100.0 * SUM(CASE WHEN r.score &lt;= c.par THEN 1 ELSE 0 END) / COUNT(*)</code> for the percentage.',
    alternatives: [
      `SELECT r.weather, COUNT(*), ROUND(AVG(r.score) - AVG(c.par), 1) AS a, ROUND(AVG(r.score <= c.par) * 100, 1)
       FROM rounds r JOIN courses c USING (course_id) GROUP BY r.weather ORDER BY AVG(r.score - c.par);`,
    ],
    mistakes: [
      `SELECT r.weather, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a,
         ROUND(100.0 * SUM(CASE WHEN r.score < c.par THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY r.weather ORDER BY a;`,
      `SELECT r.weather, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a,
         100 * SUM(CASE WHEN r.score <= c.par THEN 1 ELSE 0 END) / COUNT(*)
       FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY r.weather ORDER BY a;`,
      `SELECT r.weather, COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a,
         ROUND(100.0 * SUM(CASE WHEN r.score <= c.par THEN 1 ELSE 0 END) / COUNT(*), 1)
       FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY r.weather ORDER BY a DESC;`,
    ],
  },
  {
    id: 'country-leaderboard',
    title: 'Where to send the coach',
    difficulty: 'hard',
    tags: ['COUNT DISTINCT', 'JOIN', 'GROUP BY', 'HAVING', 'LIMIT'],
    task: `The club can fund coaching clinics in three countries. Group rounds by the <strong>player's</strong>
      country, and only consider countries with <strong>at least 7 rounds</strong> (a fair sample). Find the
      <strong>3 countries with the highest</strong> average strokes over par (<code>score - par</code>). Return four
      columns in this order: <code>country</code>, the number of <strong>different</strong> players, the number of
      rounds, and the average strokes over par <strong>rounded to 1 decimal</strong>. The three rows can be in any
      order.`,
    solution: `SELECT
  p.country,
  COUNT(DISTINCT p.player_id) AS players,
  COUNT(*) AS rounds_played,
  ROUND(AVG(r.score - c.par), 1) AS avg_over_par
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY p.country
HAVING COUNT(*) >= 7
ORDER BY AVG(r.score - c.par) DESC
LIMIT 3;`,
    hint: 'Join all three tables and <code>GROUP BY p.country</code>. Keep <code>HAVING COUNT(*) &gt;= 7</code> <em>before</em> '
      + 'picking the top 3 with <code>ORDER BY … DESC LIMIT 3</code>, and count players with <code>COUNT(DISTINCT p.player_id)</code>.',
    alternatives: [
      `SELECT p.country, COUNT(DISTINCT r.player_id), COUNT(r.round_id), ROUND(AVG(r.score - c.par), 1) AS a
       FROM players p JOIN rounds r USING (player_id) JOIN courses c USING (course_id)
       GROUP BY p.country HAVING COUNT(*) > 6 ORDER BY AVG(r.score) - AVG(c.par) DESC LIMIT 3;`,
    ],
    mistakes: [
      // No minimum sample: countries with 2-3 rounds take over the top of the list.
      `SELECT p.country, COUNT(DISTINCT p.player_id), COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a FROM rounds r
       JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.country ORDER BY a DESC LIMIT 3;`,
      `SELECT p.country, COUNT(p.player_id), COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a FROM rounds r
       JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.country HAVING COUNT(*) >= 7 ORDER BY a DESC LIMIT 3;`,
      `SELECT p.country, COUNT(DISTINCT p.player_id), COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a FROM rounds r
       JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY p.country HAVING COUNT(*) >= 7 ORDER BY a LIMIT 3;`,
      `SELECT c.country, COUNT(DISTINCT p.player_id), COUNT(*), ROUND(AVG(r.score - c.par), 1) AS a FROM rounds r
       JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY c.country HAVING COUNT(*) >= 7 ORDER BY a DESC LIMIT 3;`,
    ],
  },
  {
    id: 'home-vs-away',
    title: 'Home vs away',
    difficulty: 'hard',
    tags: ['CASE WHEN', 'NULL', 'Aggregates', 'JOIN'],
    orderMatters: true,
    task: `Do players score better at their <strong>home course</strong> (<code>players.home_course_id</code>)? Consider
      players with at least one round at home <strong>and</strong> at least one round elsewhere. Return four columns in
      this order: <code>name</code>, the average score at home, the average score away, and the difference (home
      average minus away average), each <strong>rounded to 1 decimal</strong>, with the difference computed from the
      unrounded averages. Sort by the difference, <strong>biggest home advantage (most negative) first</strong>, then
      by name.`,
    solution: `SELECT
  p.name,
  ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END), 1)
    AS home_avg,
  ROUND(AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END), 1)
    AS away_avg,
  ROUND(
    AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END)
      - AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END),
    1
  ) AS difference
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
GROUP BY p.player_id, p.name
HAVING COUNT(CASE WHEN r.course_id = p.home_course_id THEN 1 END) >= 1
  AND COUNT(CASE WHEN r.course_id <> p.home_course_id THEN 1 END) >= 1
ORDER BY difference ASC, p.name ASC;`,
    hint: 'A <code>CASE</code> with no <code>ELSE</code> returns NULL, and <code>AVG</code> skips NULLs, so '
      + '<code>AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END)</code> averages only home rounds. '
      + 'Use <code>HAVING</code> to require both kinds of round.',
    alternatives: [
      `SELECT p.name,
         ROUND(SUM(CASE WHEN r.course_id = p.home_course_id THEN r.score ELSE 0 END) * 1.0
           / SUM(r.course_id = p.home_course_id), 1) AS h,
         ROUND(SUM(CASE WHEN r.course_id <> p.home_course_id THEN r.score ELSE 0 END) * 1.0
           / SUM(r.course_id <> p.home_course_id), 1) AS a,
         ROUND(SUM(CASE WHEN r.course_id = p.home_course_id THEN r.score ELSE 0 END) * 1.0
           / SUM(r.course_id = p.home_course_id)
           - SUM(CASE WHEN r.course_id <> p.home_course_id THEN r.score ELSE 0 END) * 1.0
           / SUM(r.course_id <> p.home_course_id), 1) AS d
       FROM players p JOIN rounds r USING (player_id) GROUP BY p.name
       HAVING SUM(r.course_id = p.home_course_id) > 0 AND SUM(r.course_id <> p.home_course_id) > 0
       ORDER BY d, p.name;`,
    ],
    mistakes: [
      // ELSE 0 drags the averages toward zero.
      `SELECT p.name, ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score ELSE 0 END), 1),
         ROUND(AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score ELSE 0 END), 1),
         ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score ELSE 0 END)
           - AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score ELSE 0 END), 1) AS d
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.name
       HAVING COUNT(CASE WHEN r.course_id = p.home_course_id THEN 1 END) >= 1
         AND COUNT(CASE WHEN r.course_id <> p.home_course_id THEN 1 END) >= 1 ORDER BY d, p.name;`,
      // No HAVING: players with no home rounds (or no home course) come through with NULLs.
      `SELECT p.name, ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END), 1),
         ROUND(AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END), 1),
         ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END)
           - AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END), 1) AS d
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.name ORDER BY d, p.name;`,
      `SELECT p.name, ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END), 1),
         ROUND(AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END), 1),
         ROUND(AVG(CASE WHEN r.course_id = p.home_course_id THEN r.score END)
           - AVG(CASE WHEN r.course_id <> p.home_course_id THEN r.score END), 1) AS d
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.name
       HAVING COUNT(CASE WHEN r.course_id = p.home_course_id THEN 1 END) >= 1
         AND COUNT(CASE WHEN r.course_id <> p.home_course_id THEN 1 END) >= 1 ORDER BY d DESC, p.name;`,
    ],
  },
  {
    id: 'pro-am-gap',
    title: 'The pro-am gap',
    difficulty: 'hard',
    tags: ['CASE WHEN', 'Aggregates', 'JOIN', 'HAVING'],
    orderMatters: true,
    task: `On which courses is the gap between professionals and amateurs widest? Consider courses where
      <strong>both</strong> at least one professional and at least one amateur have played. Return four columns in this
      order: the course <code>name</code>, the professionals' average score, the amateurs' average score, and the gap
      (amateur average minus professional average), each <strong>rounded to 1 decimal</strong>, with the gap computed
      from the unrounded averages. Sort by the gap, <strong>widest first</strong>.`,
    solution: `SELECT
  c.name,
  ROUND(AVG(CASE WHEN p.is_pro = 1 THEN r.score END), 1) AS pro_avg,
  ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score END), 1) AS amateur_avg,
  ROUND(
    AVG(CASE WHEN p.is_pro = 0 THEN r.score END)
      - AVG(CASE WHEN p.is_pro = 1 THEN r.score END),
    1
  ) AS gap
FROM rounds AS r
JOIN players AS p ON p.player_id = r.player_id
JOIN courses AS c ON c.course_id = r.course_id
GROUP BY c.course_id, c.name
HAVING SUM(CASE WHEN p.is_pro = 1 THEN 1 ELSE 0 END) >= 1
  AND SUM(CASE WHEN p.is_pro = 0 THEN 1 ELSE 0 END) >= 1
ORDER BY gap DESC;`,
    hint: 'Average only one group with <code>AVG(CASE WHEN p.is_pro = 1 THEN r.score END)</code> (no <code>ELSE</code>, so '
      + 'other rows are NULL and skipped). Require both groups in <code>HAVING</code>.',
    alternatives: [
      `SELECT c.name, ROUND(AVG(IIF(p.is_pro, r.score, NULL)), 1), ROUND(AVG(IIF(p.is_pro, NULL, r.score)), 1),
         ROUND(AVG(IIF(p.is_pro, NULL, r.score)) - AVG(IIF(p.is_pro, r.score, NULL)), 1) AS g
       FROM courses c JOIN rounds r USING (course_id) JOIN players p USING (player_id)
       GROUP BY c.name HAVING MIN(p.is_pro) = 0 AND MAX(p.is_pro) = 1 ORDER BY g DESC;`,
    ],
    mistakes: [
      // No HAVING: Coral Bay (pros only) comes through with a NULL amateur average.
      `SELECT c.name, ROUND(AVG(CASE WHEN p.is_pro = 1 THEN r.score END), 1), ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score END), 1),
         ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score END) - AVG(CASE WHEN p.is_pro = 1 THEN r.score END), 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY c.name ORDER BY g DESC;`,
      `SELECT c.name, ROUND(AVG(CASE WHEN p.is_pro = 1 THEN r.score ELSE 0 END), 1), ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score ELSE 0 END), 1),
         ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score ELSE 0 END) - AVG(CASE WHEN p.is_pro = 1 THEN r.score ELSE 0 END), 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY c.name HAVING SUM(p.is_pro) >= 1 AND SUM(1 - p.is_pro) >= 1 ORDER BY g DESC;`,
      `SELECT c.name, ROUND(AVG(CASE WHEN p.is_pro = 1 THEN r.score END), 1), ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score END), 1),
         ROUND(AVG(CASE WHEN p.is_pro = 0 THEN r.score END) - AVG(CASE WHEN p.is_pro = 1 THEN r.score END), 1) AS g
       FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY c.name HAVING SUM(p.is_pro) >= 1 AND SUM(1 - p.is_pro) >= 1 ORDER BY g, c.name;`,
    ],
  },
];
