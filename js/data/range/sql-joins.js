// Driving Range problems for Joins & Subqueries: extra practice on that tournament's skills, none repeating a hole.
// They unlock according to RANGE_UNLOCK in js/data/range-config.js. No window functions (OVER, ROW_NUMBER, RANK,
// LAG, LEAD): they belong to Window Functions.
//
// Problem fields are documented at the top of js/data/range/sql-basics.js. Every problem whose solution joins tables
// declares a mistake that uses the other join type, and every problem with orderMatters declares a mistake that
// returns the right rows in the wrong order (both enforced by tests).

export default [
  // ---- Easy (Par 1): one concept each ----
  {
    id: 'unplayed-course',
    title: 'Still waiting for a tee time',
    difficulty: 'easy',
    tags: ['LEFT JOIN'],
    task: `Which courses have <strong>never hosted a round</strong>? Return <code>name</code>, <code>city</code>, and
      <code>yardage</code>, in that order.`,
    solution: `SELECT c.name, c.city, c.yardage
FROM courses AS c
LEFT JOIN rounds AS r ON r.course_id = c.course_id
WHERE r.round_id IS NULL;`,
    hint: 'Keep every course with <code>LEFT JOIN rounds</code>, then keep only the courses with no match: '
      + '<code>WHERE r.round_id IS NULL</code>.',
    alternatives: [
      'SELECT name, city, yardage FROM courses WHERE course_id NOT IN (SELECT course_id FROM rounds);',
      'SELECT c.name, c.city, c.yardage FROM courses c WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.course_id = c.course_id);',
    ],
    mistakes: [
      'SELECT c.name, c.city, c.yardage FROM courses c INNER JOIN rounds r ON r.course_id = c.course_id WHERE r.round_id IS NULL;',
      'SELECT c.name, c.city, c.yardage FROM courses c LEFT JOIN players p ON p.home_course_id = c.course_id WHERE p.player_id IS NULL;',
      'SELECT DISTINCT c.name, c.city, c.yardage FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id WHERE r.round_id IS NOT NULL;',
    ],
  },
  {
    id: 'home-soil',
    title: 'Home soil',
    difficulty: 'easy',
    tags: ['JOIN'],
    orderMatters: true,
    task: `Find the rounds played on a course in the <strong>player's own country</strong> (the course's
      <code>country</code> equals the player's <code>country</code>). Return four columns in this order: the player's
      name, the course name, <code>played_on</code>, and <code>score</code>. Sort by <code>played_on</code>, earliest
      first.`,
    solution: `SELECT p.name, c.name, r.played_on, r.score
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
INNER JOIN courses AS c ON c.course_id = r.course_id
WHERE c.country = p.country
ORDER BY r.played_on ASC;`,
    hint: 'Join <code>rounds</code> to both <code>players</code> and <code>courses</code>, then compare the two '
      + '<code>country</code> columns in <code>WHERE</code>.',
    alternatives: [
      `SELECT p.name, c.name, r.played_on, r.score FROM players p JOIN rounds r ON r.player_id = p.player_id
       JOIN courses c ON c.course_id = r.course_id AND c.country = p.country ORDER BY 3;`,
    ],
    mistakes: [
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id WHERE c.country = p.country ORDER BY r.played_on DESC;`,
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id WHERE r.course_id = p.home_course_id ORDER BY r.played_on;`,
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
       LEFT JOIN courses c ON c.course_id = r.course_id AND c.country = p.country ORDER BY r.played_on;`,
    ],
  },
  {
    id: 'sister-courses',
    title: 'Sister courses',
    difficulty: 'easy',
    tags: ['Self-join'],
    task: `List every pair of courses in the <strong>same country</strong>, each pair once. Return four columns in this
      order: the name of the course with the lower <code>course_id</code>, the other course's name, the country, and
      the difference in yardage between them as a positive number.`,
    solution: `SELECT a.name, b.name, a.country, ABS(a.yardage - b.yardage) AS yard_gap
FROM courses AS a
INNER JOIN courses AS b
  ON b.country = a.country AND a.course_id < b.course_id;`,
    hint: 'Join <code>courses</code> to itself on <code>country</code>. <code>a.course_id &lt; b.course_id</code> '
      + 'keeps each pair once and never pairs a course with itself; <code>ABS()</code> makes the gap positive.',
    alternatives: [
      `SELECT a.name, b.name, b.country, MAX(a.yardage, b.yardage) - MIN(a.yardage, b.yardage)
       FROM courses a, courses b WHERE a.country = b.country AND b.course_id > a.course_id;`,
    ],
    mistakes: [
      `SELECT a.name, b.name, a.country, ABS(a.yardage - b.yardage) FROM courses a
       JOIN courses b ON b.country = a.country AND a.course_id <> b.course_id;`,
      `SELECT a.name, b.name, a.country, a.yardage - b.yardage FROM courses a
       JOIN courses b ON b.country = a.country AND a.course_id < b.course_id;`,
      `SELECT a.name, b.name, a.country, ABS(a.yardage - b.yardage) FROM courses a
       LEFT JOIN courses b ON b.country = a.country AND a.course_id < b.course_id;`,
    ],
  },
  {
    id: 'longer-than-average',
    title: 'Longer than average',
    difficulty: 'easy',
    tags: ['Subqueries'],
    orderMatters: true,
    task: `Which courses are longer than the <strong>average yardage of all courses</strong>? Return
      <code>name</code> and <code>yardage</code>, in that order, longest first.`,
    solution: `SELECT name, yardage
FROM courses
WHERE yardage > (
  SELECT AVG(yardage)
  FROM courses
)
ORDER BY yardage DESC;`,
    hint: 'Compute the average in a subquery: <code>WHERE yardage &gt; (SELECT AVG(yardage) FROM courses)</code>.',
    alternatives: [
      `WITH avg_len AS (SELECT AVG(yardage) AS y FROM courses)
       SELECT c.name, c.yardage FROM courses c, avg_len WHERE c.yardage > avg_len.y ORDER BY 2 DESC;`,
    ],
    mistakes: [
      'SELECT name, yardage FROM courses WHERE yardage > (SELECT AVG(yardage) FROM courses) ORDER BY yardage;',
      'SELECT name, yardage FROM courses WHERE yardage >= 7000 ORDER BY yardage DESC;',
      `SELECT name, yardage FROM courses WHERE yardage > (SELECT AVG(c.yardage) FROM rounds r
       JOIN courses c ON c.course_id = r.course_id) ORDER BY yardage DESC;`,
    ],
  },
  {
    id: 'rain-checks',
    title: 'Rain checks',
    difficulty: 'easy',
    tags: ['EXISTS'],
    task: `Which players have played <strong>at least one round in the rain</strong> (<code>weather = 'Rain'</code>)?
      Return just their <code>name</code>, each player once.`,
    solution: `SELECT p.name
FROM players AS p
WHERE EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.player_id = p.player_id
    AND r.weather = 'Rain'
);`,
    hint: 'Use <code>WHERE EXISTS (SELECT 1 FROM rounds AS r WHERE ...)</code>, and tie the subquery to the outer '
      + 'player with <code>r.player_id = p.player_id</code>.',
    alternatives: [
      "SELECT name FROM players WHERE player_id IN (SELECT player_id FROM rounds WHERE weather = 'Rain');",
      "SELECT DISTINCT p.name FROM players p JOIN rounds r ON r.player_id = p.player_id WHERE r.weather = 'Rain';",
    ],
    mistakes: [
      "SELECT p.name FROM players p JOIN rounds r ON r.player_id = p.player_id WHERE r.weather = 'Rain';",
      "SELECT p.name FROM players p WHERE EXISTS (SELECT 1 FROM rounds r WHERE r.weather = 'Rain');",
      "SELECT p.name FROM players p WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id AND r.weather = 'Rain');",
    ],
  },
  {
    id: 'calm-courses',
    title: 'Calm courses',
    difficulty: 'easy',
    tags: ['EXISTS'],
    task: `Which courses have <strong>never had a round played in Windy weather</strong>? A course that hasn't hosted
      any rounds counts too. Return just the course <code>name</code>.`,
    solution: `SELECT c.name
FROM courses AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.course_id = c.course_id
    AND r.weather = 'Windy'
);`,
    hint: '<code>NOT EXISTS</code> is true when the subquery finds nothing, so a course with no rounds at all '
      + 'passes too.',
    alternatives: [
      "SELECT name FROM courses WHERE course_id NOT IN (SELECT course_id FROM rounds WHERE weather = 'Windy');",
      `SELECT c.name FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id AND r.weather = 'Windy'
       WHERE r.round_id IS NULL;`,
    ],
    mistakes: [
      "SELECT DISTINCT c.name FROM courses c JOIN rounds r ON r.course_id = c.course_id WHERE r.weather <> 'Windy';",
      `SELECT DISTINCT c.name FROM courses c JOIN rounds r ON r.course_id = c.course_id
       WHERE NOT EXISTS (SELECT 1 FROM rounds w WHERE w.course_id = c.course_id AND w.weather = 'Windy');`,
      "SELECT c.name FROM courses c WHERE EXISTS (SELECT 1 FROM rounds r WHERE r.course_id = c.course_id AND r.weather = 'Windy');",
    ],
  },
  {
    id: 'length-class',
    title: 'Long, medium, or short',
    difficulty: 'easy',
    tags: ['CASE WHEN'],
    orderMatters: true,
    task: `Label every course by length: <code>'Long'</code> for 7,000 yards or more, <code>'Medium'</code> for 6,600
      up to 6,999, and <code>'Short'</code> for under 6,600. Return three columns in this order: <code>name</code>,
      <code>yardage</code>, and the label (exactly as written). Sort by yardage, longest first.`,
    solution: `SELECT
  name,
  yardage,
  CASE
    WHEN yardage >= 7000 THEN 'Long'
    WHEN yardage >= 6600 THEN 'Medium'
    ELSE 'Short'
  END AS length_class
FROM courses
ORDER BY yardage DESC;`,
    hint: '<code>CASE</code> checks its <code>WHEN</code>s top to bottom and stops at the first match, so test the '
      + 'longest bracket first.',
    alternatives: [
      `SELECT name, yardage, CASE WHEN yardage < 6600 THEN 'Short' WHEN yardage < 7000 THEN 'Medium' ELSE 'Long' END
       FROM courses ORDER BY 2 DESC;`,
    ],
    mistakes: [
      `SELECT name, yardage, CASE WHEN yardage >= 7000 THEN 'Long' WHEN yardage >= 6600 THEN 'Medium' ELSE 'Short' END
       FROM courses ORDER BY yardage;`,
      `SELECT name, yardage, CASE WHEN yardage >= 6600 THEN 'Medium' WHEN yardage >= 7000 THEN 'Long' ELSE 'Short' END
       FROM courses ORDER BY yardage DESC;`,
      `SELECT name, yardage, CASE WHEN yardage >= 7000 THEN 'long' WHEN yardage >= 6600 THEN 'medium' ELSE 'short' END
       FROM courses ORDER BY yardage DESC;`,
    ],
  },
  {
    id: 'sub-75-club',
    title: 'The sub-75 club',
    difficulty: 'easy',
    tags: ['CTE'],
    task: `How many players have an <strong>average score below 75</strong>? Work out each player's average over all
      their rounds first, then count. Return one row with one column: the number of players.`,
    solution: `WITH player_avg AS (
  SELECT player_id, AVG(score) AS avg_score
  FROM rounds
  GROUP BY player_id
)
SELECT COUNT(*) AS sub_75_players
FROM player_avg
WHERE avg_score < 75;`,
    hint: 'Put the per-player averages in a CTE (<code>WITH player_avg AS (...)</code>), then count its rows '
      + 'where the average is under 75.',
    alternatives: [
      'SELECT COUNT(*) FROM (SELECT player_id FROM rounds GROUP BY player_id HAVING AVG(score) < 75);',
    ],
    mistakes: [
      'SELECT COUNT(DISTINCT player_id) FROM rounds WHERE score < 75;',
      'SELECT COUNT(*) FROM rounds WHERE score < 75;',
    ],
  },

  // ---- Medium (Par 2): two concepts combined ----
  {
    id: 'windy-tally',
    title: 'Windy tally',
    difficulty: 'medium',
    tags: ['LEFT JOIN'],
    orderMatters: true,
    task: `For <strong>every player</strong>, count their rounds played in <code>'Windy'</code> weather, with 0 for
      players who have none. Return two columns in this order: <code>name</code> and that count. Sort by the count,
      most first, then by name A→Z.`,
    solution: `SELECT p.name, COUNT(r.round_id) AS windy_rounds
FROM players AS p
LEFT JOIN rounds AS r
  ON r.player_id = p.player_id AND r.weather = 'Windy'
GROUP BY p.player_id, p.name
ORDER BY windy_rounds DESC, p.name ASC;`,
    hint: "Put <code>r.weather = 'Windy'</code> in the <code>ON</code> clause, not in <code>WHERE</code>: a "
      + '<code>WHERE</code> filter on the right table throws away the players with no match.',
    alternatives: [
      `SELECT p.name, COALESCE(SUM(CASE WHEN r.weather = 'Windy' THEN 1 ELSE 0 END), 0) AS n
       FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      `SELECT p.name, (SELECT COUNT(*) FROM rounds r WHERE r.player_id = p.player_id AND r.weather = 'Windy') AS n
       FROM players p ORDER BY n DESC, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(r.round_id) AS n FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
       WHERE r.weather = 'Windy' GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS n FROM players p INNER JOIN rounds r ON r.player_id = p.player_id
       AND r.weather = 'Windy' GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(*) AS n FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
       AND r.weather = 'Windy' GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS n FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
       AND r.weather = 'Windy' GROUP BY p.player_id ORDER BY n DESC, p.name DESC;`,
    ],
  },
  {
    id: 'activity-report',
    title: 'Membership activity report',
    difficulty: 'medium',
    tags: ['LEFT JOIN', 'CASE WHEN'],
    orderMatters: true,
    task: `Label every member by how much they play: <code>'Regular'</code> for 8 or more rounds,
      <code>'Occasional'</code> for 1 to 7, and <code>'Inactive'</code> for none. Return three columns in this order:
      <code>name</code>, their number of rounds, and the label (exactly as written). Sort by name A→Z.`,
    solution: `SELECT
  p.name,
  COUNT(r.round_id) AS rounds_played,
  CASE
    WHEN COUNT(r.round_id) >= 8 THEN 'Regular'
    WHEN COUNT(r.round_id) >= 1 THEN 'Occasional'
    ELSE 'Inactive'
  END AS activity
FROM players AS p
LEFT JOIN rounds AS r ON r.player_id = p.player_id
GROUP BY p.player_id, p.name
ORDER BY p.name ASC;`,
    hint: 'A <code>LEFT JOIN</code> keeps the members with no rounds, and <code>COUNT(r.round_id)</code> counts 0 for '
      + 'them. A <code>CASE</code> can test an aggregate like <code>COUNT(...)</code> directly.',
    alternatives: [
      `WITH n AS (SELECT p.name, (SELECT COUNT(*) FROM rounds r WHERE r.player_id = p.player_id) AS k FROM players p)
       SELECT name, k, CASE WHEN k = 0 THEN 'Inactive' WHEN k < 8 THEN 'Occasional' ELSE 'Regular' END
       FROM n ORDER BY name;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(r.round_id) AS k, CASE WHEN COUNT(r.round_id) >= 8 THEN 'Regular'
       WHEN COUNT(r.round_id) >= 1 THEN 'Occasional' ELSE 'Inactive' END FROM players p
       INNER JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id ORDER BY p.name;`,
      `SELECT p.name, COUNT(*) AS k, CASE WHEN COUNT(*) >= 8 THEN 'Regular'
       WHEN COUNT(*) >= 1 THEN 'Occasional' ELSE 'Inactive' END FROM players p
       LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id ORDER BY p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS k, CASE WHEN COUNT(r.round_id) >= 8 THEN 'Regular'
       WHEN COUNT(r.round_id) >= 1 THEN 'Occasional' ELSE 'Inactive' END FROM players p
       LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id ORDER BY k DESC, p.name;`,
    ],
  },
  {
    id: 'same-tee-sheet',
    title: 'Same tee sheet',
    difficulty: 'medium',
    tags: ['Self-join', 'JOIN'],
    orderMatters: true,
    task: `Find the pairs of rounds played at the <strong>same course on the same day</strong>, each pair once. Return
      four columns in this order: <code>played_on</code>, the course name, the name of the player whose round has the
      lower <code>round_id</code>, and the other player's name. Sort by <code>played_on</code>, earliest first.`,
    solution: `SELECT a.played_on, c.name, pa.name, pb.name
FROM rounds AS a
INNER JOIN rounds AS b
  ON b.played_on = a.played_on
  AND b.course_id = a.course_id
  AND a.round_id < b.round_id
INNER JOIN courses AS c ON c.course_id = a.course_id
INNER JOIN players AS pa ON pa.player_id = a.player_id
INNER JOIN players AS pb ON pb.player_id = b.player_id
ORDER BY a.played_on ASC;`,
    hint: 'Join <code>rounds</code> to itself on both the day and the course, with <code>a.round_id &lt; '
      + 'b.round_id</code>. Then join <code>players</code> twice, once per round, with different aliases.',
    alternatives: [
      `SELECT a.played_on, c.name,
         (SELECT name FROM players WHERE player_id = a.player_id),
         (SELECT name FROM players WHERE player_id = b.player_id)
       FROM rounds a JOIN rounds b ON b.played_on = a.played_on AND b.course_id = a.course_id
       JOIN courses c ON c.course_id = a.course_id WHERE b.round_id > a.round_id ORDER BY 1;`,
    ],
    mistakes: [
      `SELECT a.played_on, c.name, pa.name, pb.name FROM rounds a JOIN rounds b ON b.played_on = a.played_on
       AND b.course_id = a.course_id AND a.round_id <> b.round_id JOIN courses c ON c.course_id = a.course_id
       JOIN players pa ON pa.player_id = a.player_id JOIN players pb ON pb.player_id = b.player_id ORDER BY 1;`,
      `SELECT a.played_on, c.name, pa.name, pb.name FROM rounds a JOIN rounds b ON b.played_on = a.played_on
       AND a.round_id < b.round_id JOIN courses c ON c.course_id = a.course_id
       JOIN players pa ON pa.player_id = a.player_id JOIN players pb ON pb.player_id = b.player_id ORDER BY 1;`,
      `SELECT a.played_on, c.name, pa.name, pb.name FROM rounds a LEFT JOIN rounds b ON b.played_on = a.played_on
       AND b.course_id = a.course_id AND a.round_id < b.round_id JOIN courses c ON c.course_id = a.course_id
       JOIN players pa ON pa.player_id = a.player_id LEFT JOIN players pb ON pb.player_id = b.player_id ORDER BY 1;`,
      `SELECT a.played_on, c.name, pa.name, pb.name FROM rounds a JOIN rounds b ON b.played_on = a.played_on
       AND b.course_id = a.course_id AND a.round_id < b.round_id JOIN courses c ON c.course_id = a.course_id
       JOIN players pa ON pa.player_id = a.player_id JOIN players pb ON pb.player_id = b.player_id ORDER BY 1 DESC;`,
    ],
  },
  {
    id: 'third-time-out',
    title: 'Third time out',
    difficulty: 'medium',
    tags: ['Self-join'],
    orderMatters: true,
    task: `Find each player's <strong>third round</strong> of the season (by <code>played_on</code>; no player played
      twice on the same day). Players with fewer than 3 rounds don't appear. Return four columns in this order: the
      player's name, <code>played_on</code>, the course name, and <code>score</code>. Sort by <code>played_on</code>,
      earliest first, then by player name.`,
    solution: `SELECT p.name, r.played_on, c.name, r.score
FROM rounds AS r
INNER JOIN rounds AS e
  ON e.player_id = r.player_id AND e.played_on <= r.played_on
INNER JOIN players AS p ON p.player_id = r.player_id
INNER JOIN courses AS c ON c.course_id = r.course_id
GROUP BY r.round_id, p.name, r.played_on, c.name, r.score
HAVING COUNT(*) = 3
ORDER BY r.played_on ASC, p.name ASC;`,
    hint: 'Join each round to the same player\'s rounds on or before its date. A round with exactly 3 such rounds '
      + '(itself included) is the third one.',
    alternatives: [
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id
       WHERE (SELECT COUNT(*) FROM rounds e WHERE e.player_id = r.player_id AND e.played_on < r.played_on) = 2
       ORDER BY r.played_on, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r JOIN rounds e ON e.player_id = r.player_id
       AND e.played_on < r.played_on JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY r.round_id HAVING COUNT(*) = 3 ORDER BY r.played_on, p.name;`,
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r JOIN rounds e ON e.player_id = r.player_id
       AND e.played_on <= r.played_on JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY r.round_id HAVING COUNT(*) >= 3 ORDER BY r.played_on, p.name;`,
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r LEFT JOIN rounds e ON e.player_id = r.player_id
       AND e.played_on < r.played_on JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY r.round_id HAVING COUNT(e.round_id) = 3 ORDER BY r.played_on, p.name;`,
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r JOIN rounds e ON e.player_id = r.player_id
       AND e.played_on <= r.played_on JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id
       GROUP BY r.round_id HAVING COUNT(*) = 3 ORDER BY p.name;`,
    ],
  },
  {
    id: 'most-rounds-ties',
    title: 'Most rounds, ties included',
    difficulty: 'medium',
    tags: ['Subqueries', 'JOIN'],
    task: `Who has played the <strong>most rounds</strong>? If several players share the top count, return all of
      them. Return two columns in this order: the player's name and their number of rounds.`,
    solution: `SELECT p.name, COUNT(*) AS rounds_played
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
GROUP BY p.player_id, p.name
HAVING COUNT(*) = (
  SELECT MAX(n)
  FROM (
    SELECT COUNT(*) AS n
    FROM rounds
    GROUP BY player_id
  )
);`,
    hint: '<code>ORDER BY ... LIMIT 1</code> keeps only one of a tie. Instead, find the top count in a subquery '
      + '(the <code>MAX</code> of the per-player counts) and keep every player whose count equals it.',
    alternatives: [
      `WITH counts AS (SELECT player_id, COUNT(*) AS n FROM rounds GROUP BY player_id)
       SELECT p.name, c.n FROM counts c JOIN players p ON p.player_id = c.player_id
       WHERE c.n = (SELECT MAX(n) FROM counts);`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(*) AS n FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.player_id ORDER BY n DESC LIMIT 1;`,
      `SELECT p.name, COUNT(r.round_id) AS n FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
       GROUP BY p.player_id ORDER BY n DESC LIMIT 1;`,
      `SELECT p.name, COUNT(*) AS n FROM rounds r JOIN players p ON p.player_id = r.player_id
       GROUP BY p.player_id HAVING COUNT(*) >= (SELECT AVG(k) FROM (SELECT COUNT(*) AS k FROM rounds GROUP BY player_id));`,
    ],
  },
  {
    id: 'course-records',
    title: 'New course record',
    difficulty: 'medium',
    tags: ['Subqueries', 'JOIN'],
    orderMatters: true,
    task: `A round <strong>sets a new course record</strong> when at least one round was played at that course on an
      <em>earlier date</em>, and its score is lower than every one of those earlier rounds. (Rounds on the same day
      don't count as earlier.) Return four columns in this order: <code>played_on</code>, the course name, the
      player's name, and <code>score</code>. Sort by <code>played_on</code>, earliest first, then by score, lowest
      first.`,
    solution: `SELECT r.played_on, c.name, p.name, r.score
FROM rounds AS r
INNER JOIN courses AS c ON c.course_id = r.course_id
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE r.score < (
  SELECT MIN(e.score)
  FROM rounds AS e
  WHERE e.course_id = r.course_id
    AND e.played_on < r.played_on
)
ORDER BY r.played_on ASC, r.score ASC;`,
    hint: 'Compare each round with a correlated subquery: the <code>MIN(score)</code> of earlier rounds at the same '
      + 'course. A course\'s first round has no earlier rounds, so the subquery returns NULL and the comparison '
      + 'drops it.',
    alternatives: [
      `SELECT r.played_on, c.name, p.name, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id JOIN rounds e ON e.course_id = r.course_id AND e.played_on < r.played_on
       GROUP BY r.round_id HAVING r.score < MIN(e.score) ORDER BY r.played_on, r.score;`,
    ],
    mistakes: [
      `SELECT r.played_on, c.name, p.name, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id LEFT JOIN rounds e ON e.course_id = r.course_id
       AND e.played_on < r.played_on GROUP BY r.round_id HAVING r.score < MIN(e.score) OR MIN(e.score) IS NULL
       ORDER BY r.played_on, r.score;`,
      `SELECT r.played_on, c.name, p.name, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE r.score <= (SELECT MIN(e.score) FROM rounds e WHERE e.course_id = r.course_id AND e.played_on < r.played_on)
       ORDER BY r.played_on, r.score;`,
      `SELECT r.played_on, c.name, p.name, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE r.score < (SELECT MIN(e.score) FROM rounds e WHERE e.played_on < r.played_on)
       ORDER BY r.played_on, r.score;`,
      `SELECT r.played_on, c.name, p.name, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE r.score < (SELECT MIN(e.score) FROM rounds e WHERE e.course_id = r.course_id AND e.played_on < r.played_on)
       ORDER BY r.played_on, r.score DESC;`,
    ],
  },
  {
    id: 'rain-at-home',
    title: 'Rain at home, dry for them',
    difficulty: 'medium',
    tags: ['EXISTS'],
    task: `Find the members whose <strong>home course has hosted a round in the rain</strong>
      (<code>weather = 'Rain'</code>, played by anyone), but who have <strong>never played a round in the rain
      themselves</strong>. Members who haven't played at all count as never having played in the rain. Return just
      their <code>name</code>.`,
    solution: `SELECT p.name
FROM players AS p
WHERE EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.course_id = p.home_course_id
    AND r.weather = 'Rain'
)
AND NOT EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.player_id = p.player_id
    AND r.weather = 'Rain'
);`,
    hint: 'Two correlated conditions: <code>EXISTS</code> a rainy round at <code>p.home_course_id</code>, and '
      + '<code>NOT EXISTS</code> a rainy round by <code>p.player_id</code>.',
    alternatives: [
      `SELECT name FROM players
       WHERE home_course_id IN (SELECT course_id FROM rounds WHERE weather = 'Rain')
       AND player_id NOT IN (SELECT player_id FROM rounds WHERE weather = 'Rain');`,
    ],
    mistakes: [
      `SELECT DISTINCT p.name FROM players p JOIN rounds mine ON mine.player_id = p.player_id
       WHERE EXISTS (SELECT 1 FROM rounds r WHERE r.course_id = p.home_course_id AND r.weather = 'Rain')
       AND NOT EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id AND r.weather = 'Rain');`,
      `SELECT p.name FROM players p
       WHERE EXISTS (SELECT 1 FROM rounds r WHERE r.course_id = p.home_course_id AND r.weather = 'Rain')
       AND EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id AND r.weather <> 'Rain');`,
      `SELECT p.name FROM players p
       WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id AND r.weather = 'Rain');`,
    ],
  },
  {
    id: 'personal-bests',
    title: 'Personal bests',
    difficulty: 'medium',
    tags: ['CTE', 'JOIN'],
    orderMatters: true,
    task: `Show each player's <strong>personal best</strong>: the round with their lowest score. If a player shot
      their best score more than once, list every one of those rounds. Return four columns in this order: the player's
      name, the score, the course name, and <code>played_on</code>. Sort by player name, then by
      <code>played_on</code>.`,
    solution: `WITH best AS (
  SELECT player_id, MIN(score) AS best_score
  FROM rounds
  GROUP BY player_id
)
SELECT p.name, b.best_score, c.name, r.played_on
FROM best AS b
INNER JOIN rounds AS r
  ON r.player_id = b.player_id AND r.score = b.best_score
INNER JOIN players AS p ON p.player_id = b.player_id
INNER JOIN courses AS c ON c.course_id = r.course_id
ORDER BY p.name ASC, r.played_on ASC;`,
    hint: 'First find each player\'s best score in a CTE, then join it back to <code>rounds</code> on both '
      + '<code>player_id</code> and the score to recover the rounds (and their course and date).',
    alternatives: [
      `SELECT p.name, r.score, c.name, r.played_on FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id
       WHERE r.score = (SELECT MIN(score) FROM rounds x WHERE x.player_id = r.player_id) ORDER BY 1, 4;`,
    ],
    mistakes: [
      `SELECT p.name, MIN(r.score), c.name, r.played_on FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN courses c ON c.course_id = r.course_id GROUP BY p.player_id ORDER BY 1, 4;`,
      `WITH best AS (SELECT player_id, MIN(score) AS s FROM rounds GROUP BY player_id)
       SELECT p.name, b.s, c.name, r.played_on FROM players p LEFT JOIN best b ON b.player_id = p.player_id
       LEFT JOIN rounds r ON r.player_id = b.player_id AND r.score = b.s
       LEFT JOIN courses c ON c.course_id = r.course_id ORDER BY 1, 4;`,
      `WITH best AS (SELECT player_id, MIN(score) AS s FROM rounds GROUP BY player_id)
       SELECT p.name, b.s, c.name, r.played_on FROM best b JOIN rounds r ON r.score = b.s
       JOIN players p ON p.player_id = b.player_id JOIN courses c ON c.course_id = r.course_id ORDER BY 1, 4;`,
      `WITH best AS (SELECT player_id, MIN(score) AS s FROM rounds GROUP BY player_id)
       SELECT p.name, b.s, c.name, r.played_on FROM best b JOIN rounds r ON r.player_id = b.player_id AND r.score = b.s
       JOIN players p ON p.player_id = b.player_id JOIN courses c ON c.course_id = r.course_id ORDER BY 1, 4 DESC;`,
    ],
  },
  {
    id: 'home-course-check',
    title: 'Ever played at home?',
    difficulty: 'medium',
    tags: ['EXISTS', 'CASE WHEN'],
    orderMatters: true,
    task: `For <strong>every member</strong>, say whether they've played a round at their own home course. Return two
      columns in this order: <code>name</code>, and <code>'No home club'</code> if they have no home course,
      otherwise <code>'Yes'</code> or <code>'No'</code> (exactly as written). Sort by name A→Z.`,
    solution: `SELECT
  p.name,
  CASE
    WHEN p.home_course_id IS NULL THEN 'No home club'
    WHEN EXISTS (
      SELECT 1
      FROM rounds AS r
      WHERE r.player_id = p.player_id
        AND r.course_id = p.home_course_id
    ) THEN 'Yes'
    ELSE 'No'
  END AS played_at_home
FROM players AS p
ORDER BY p.name ASC;`,
    hint: '<code>EXISTS (...)</code> can be a <code>WHEN</code> condition. Check for a missing home course first, '
      + 'because a NULL home course never matches a round.',
    alternatives: [
      `SELECT p.name, CASE WHEN p.home_course_id IS NULL THEN 'No home club'
       WHEN COUNT(r.round_id) > 0 THEN 'Yes' ELSE 'No' END
       FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id AND r.course_id = p.home_course_id
       GROUP BY p.player_id ORDER BY p.name;`,
    ],
    mistakes: [
      `SELECT p.name, CASE WHEN p.home_course_id IS NULL THEN 'No home club' WHEN EXISTS (SELECT 1 FROM rounds r
       WHERE r.course_id = p.home_course_id) THEN 'Yes' ELSE 'No' END FROM players p ORDER BY p.name;`,
      `SELECT p.name, CASE WHEN EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id
       AND r.course_id = p.home_course_id) THEN 'Yes' ELSE 'No' END FROM players p ORDER BY p.name;`,
      `SELECT p.name, CASE WHEN p.home_course_id IS NULL THEN 'No home club'
       WHEN COUNT(r.round_id) > 0 THEN 'Yes' ELSE 'No' END
       FROM players p INNER JOIN rounds r ON r.player_id = p.player_id AND r.course_id = p.home_course_id
       GROUP BY p.player_id ORDER BY p.name;`,
      `SELECT p.name, CASE WHEN p.home_course_id IS NULL THEN 'No home club' WHEN EXISTS (SELECT 1 FROM rounds r
       WHERE r.player_id = p.player_id AND r.course_id = p.home_course_id) THEN 'Yes' ELSE 'No' END
       FROM players p ORDER BY p.name DESC;`,
    ],
  },
  {
    id: 'handicap-neighbors',
    title: 'Handicap neighbors',
    difficulty: 'medium',
    tags: ['Self-join', 'LEFT JOIN'],
    orderMatters: true,
    task: `Good matches are players with similar handicaps. For <strong>every player who has a handicap</strong>,
      count the <em>other</em> players whose handicap is within 1.0 of theirs (a difference of 1.0 or less), with 0
      when there are none. Return three columns in this order: <code>name</code>, <code>handicap</code>, and that
      count. Sort by handicap, lowest first.`,
    solution: `SELECT a.name, a.handicap, COUNT(b.player_id) AS neighbors
FROM players AS a
LEFT JOIN players AS b
  ON b.player_id <> a.player_id
  AND ABS(b.handicap - a.handicap) <= 1.0
WHERE a.handicap IS NOT NULL
GROUP BY a.player_id, a.name, a.handicap
ORDER BY a.handicap ASC;`,
    hint: 'Join <code>players</code> to itself with a range condition (<code>ABS(b.handicap - a.handicap) &lt;= '
      + '1.0</code>), skip the player themself, and use a <code>LEFT JOIN</code> with <code>COUNT(b.player_id)</code> '
      + 'so players with no neighbors show 0.',
    alternatives: [
      `SELECT a.name, a.handicap, (SELECT COUNT(*) FROM players b WHERE b.player_id <> a.player_id
       AND b.handicap BETWEEN a.handicap - 1.0 AND a.handicap + 1.0) FROM players a
       WHERE a.handicap IS NOT NULL ORDER BY 2;`,
    ],
    mistakes: [
      `SELECT a.name, a.handicap, COUNT(b.player_id) FROM players a INNER JOIN players b
       ON b.player_id <> a.player_id AND ABS(b.handicap - a.handicap) <= 1.0
       GROUP BY a.player_id ORDER BY a.handicap;`,
      `SELECT a.name, a.handicap, COUNT(b.player_id) FROM players a LEFT JOIN players b
       ON ABS(b.handicap - a.handicap) <= 1.0 WHERE a.handicap IS NOT NULL
       GROUP BY a.player_id ORDER BY a.handicap;`,
      `SELECT a.name, a.handicap, COUNT(*) FROM players a LEFT JOIN players b
       ON b.player_id <> a.player_id AND ABS(b.handicap - a.handicap) <= 1.0 WHERE a.handicap IS NOT NULL
       GROUP BY a.player_id ORDER BY a.handicap;`,
      `SELECT a.name, a.handicap, COUNT(b.player_id) FROM players a LEFT JOIN players b
       ON b.player_id <> a.player_id AND ABS(b.handicap - a.handicap) <= 1.0 WHERE a.handicap IS NOT NULL
       GROUP BY a.player_id ORDER BY a.name;`,
    ],
  },
  {
    id: 'day-of-week',
    title: 'Day-of-week report',
    difficulty: 'medium',
    tags: ['CASE WHEN', 'CTE', 'Dates'],
    orderMatters: true,
    task: `Which days of the week are busiest? For each day of the week, return three columns in this order: the day
      name (<code>'Monday'</code>, <code>'Tuesday'</code>, … <code>'Sunday'</code>, exactly as written), the number of
      rounds played on that day, and the average score rounded to 1 decimal. List the days in calendar order,
      <strong>Monday first</strong> and Sunday last. (In SQLite, <code>strftime('%w', played_on)</code> gives the
      day as text from <code>'0'</code> for Sunday to <code>'6'</code> for Saturday.)`,
    solution: `WITH labeled AS (
  SELECT
    score,
    CASE strftime('%w', played_on)
      WHEN '1' THEN 'Monday'
      WHEN '2' THEN 'Tuesday'
      WHEN '3' THEN 'Wednesday'
      WHEN '4' THEN 'Thursday'
      WHEN '5' THEN 'Friday'
      WHEN '6' THEN 'Saturday'
      ELSE 'Sunday'
    END AS day_name,
    (CAST(strftime('%w', played_on) AS INTEGER) + 6) % 7 AS day_order
  FROM rounds
)
SELECT day_name, COUNT(*) AS rounds_played, ROUND(AVG(score), 1) AS avg_score
FROM labeled
GROUP BY day_name, day_order
ORDER BY day_order ASC;`,
    hint: 'Label each round in a CTE: a <code>CASE</code> on <code>strftime(\'%w\', played_on)</code> for the name, '
      + 'and a sort key that puts Monday first (Sunday, <code>\'0\'</code>, has to go last). Then group and sort by '
      + 'that key.',
    alternatives: [
      `SELECT CASE strftime('%w', played_on) WHEN '0' THEN 'Sunday' WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday'
       WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday' ELSE 'Saturday' END AS d,
       COUNT(*), ROUND(AVG(score), 1) FROM rounds GROUP BY d
       ORDER BY CASE WHEN strftime('%w', MIN(played_on)) = '0' THEN 7 ELSE CAST(strftime('%w', MIN(played_on)) AS INT) END;`,
    ],
    mistakes: [
      `WITH l AS (SELECT score, strftime('%w', played_on) AS w FROM rounds)
       SELECT CASE w WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday' WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday'
       WHEN '5' THEN 'Friday' WHEN '6' THEN 'Saturday' ELSE 'Sunday' END, COUNT(*), ROUND(AVG(score), 1)
       FROM l GROUP BY w ORDER BY w;`,
      `WITH l AS (SELECT score, strftime('%w', played_on) AS w FROM rounds)
       SELECT CASE w WHEN '0' THEN 'Monday' WHEN '1' THEN 'Tuesday' WHEN '2' THEN 'Wednesday' WHEN '3' THEN 'Thursday'
       WHEN '4' THEN 'Friday' WHEN '5' THEN 'Saturday' ELSE 'Sunday' END, COUNT(*), ROUND(AVG(score), 1)
       FROM l GROUP BY w ORDER BY w;`,
      `WITH l AS (SELECT score, strftime('%w', played_on) AS w FROM rounds)
       SELECT CASE w WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday' WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday'
       WHEN '5' THEN 'Friday' WHEN '6' THEN 'Saturday' ELSE 'Sunday' END AS d, COUNT(*), ROUND(AVG(score), 1)
       FROM l GROUP BY w ORDER BY d;`,
    ],
  },

  // ---- Hard (Par 2): interview-style, multi-step ----
  {
    id: 'members-and-visitors',
    title: 'Members and visitors',
    difficulty: 'hard',
    tags: ['LEFT JOIN', 'CTE', 'Subqueries'],
    orderMatters: true,
    task: `Build a course report with <strong>every course</strong>. Return four columns in this order: the course
      name; its number of members (players whose <code>home_course_id</code> is that course); the number of rounds
      played there; and the number of different <strong>visitors</strong> who have played there, where a visitor is a
      player whose home course is a different course or who has no home course. Use 0 wherever there are none. Sort by
      course name A→Z.`,
    solution: `WITH members AS (
  SELECT home_course_id AS course_id, COUNT(*) AS members
  FROM players
  GROUP BY home_course_id
),
play AS (
  SELECT
    r.course_id,
    COUNT(*) AS rounds_played,
    COUNT(DISTINCT CASE
      WHEN p.home_course_id IS NULL OR p.home_course_id <> r.course_id
      THEN r.player_id
    END) AS visitors
  FROM rounds AS r
  INNER JOIN players AS p ON p.player_id = r.player_id
  GROUP BY r.course_id
)
SELECT
  c.name,
  COALESCE(m.members, 0) AS members,
  COALESCE(pl.rounds_played, 0) AS rounds_played,
  COALESCE(pl.visitors, 0) AS visitors
FROM courses AS c
LEFT JOIN members AS m ON m.course_id = c.course_id
LEFT JOIN play AS pl ON pl.course_id = c.course_id
ORDER BY c.name ASC;`,
    hint: 'Joining <code>players</code> and <code>rounds</code> to <code>courses</code> in one go multiplies the rows '
      + '(every member times every round), so the counts come out wrong. Aggregate each table separately (CTEs or '
      + 'subqueries), then <code>LEFT JOIN</code> the summaries to <code>courses</code>.',
    alternatives: [
      `SELECT c.name,
         (SELECT COUNT(*) FROM players p WHERE p.home_course_id = c.course_id),
         (SELECT COUNT(*) FROM rounds r WHERE r.course_id = c.course_id),
         (SELECT COUNT(DISTINCT r.player_id) FROM rounds r JOIN players p ON p.player_id = r.player_id
          WHERE r.course_id = c.course_id AND COALESCE(p.home_course_id, -1) <> c.course_id)
       FROM courses c ORDER BY c.name;`,
    ],
    mistakes: [
      `SELECT c.name, COUNT(m.player_id), COUNT(r.round_id), COUNT(DISTINCT r.player_id)
       FROM courses c LEFT JOIN players m ON m.home_course_id = c.course_id
       LEFT JOIN rounds r ON r.course_id = c.course_id GROUP BY c.course_id ORDER BY c.name;`,
      `SELECT c.name,
         (SELECT COUNT(*) FROM players p WHERE p.home_course_id = c.course_id),
         (SELECT COUNT(*) FROM rounds r WHERE r.course_id = c.course_id),
         (SELECT COUNT(DISTINCT r.player_id) FROM rounds r JOIN players p ON p.player_id = r.player_id
          WHERE r.course_id = c.course_id AND p.home_course_id <> c.course_id)
       FROM courses c ORDER BY c.name;`,
      `WITH members AS (SELECT home_course_id AS course_id, COUNT(*) AS n FROM players GROUP BY home_course_id),
       play AS (SELECT r.course_id, COUNT(*) AS k, COUNT(DISTINCT CASE WHEN p.home_course_id IS NULL
         OR p.home_course_id <> r.course_id THEN r.player_id END) AS v
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY r.course_id)
       SELECT c.name, COALESCE(m.n, 0), pl.k, pl.v FROM courses c LEFT JOIN members m ON m.course_id = c.course_id
       INNER JOIN play pl ON pl.course_id = c.course_id ORDER BY c.name;`,
      `SELECT c.name,
         (SELECT COUNT(*) FROM players p WHERE p.home_course_id = c.course_id),
         (SELECT COUNT(*) FROM rounds r WHERE r.course_id = c.course_id),
         (SELECT COUNT(DISTINCT r.player_id) FROM rounds r JOIN players p ON p.player_id = r.player_id
          WHERE r.course_id = c.course_id AND COALESCE(p.home_course_id, -1) <> c.course_id) AS v
       FROM courses c ORDER BY v DESC, c.name;`,
    ],
  },
  {
    id: 'par-72-slam',
    title: 'The par-72 slam',
    difficulty: 'hard',
    tags: ['EXISTS', 'Subqueries'],
    task: `A player completes the <strong>par-72 slam</strong> by playing at least one round on <em>every</em> par-72
      course that has hosted a round this season. (A par-72 course nobody has played yet isn't part of the slam.)
      Which players have completed it? Return just their <code>name</code>.`,
    solution: `SELECT p.name
FROM players AS p
WHERE NOT EXISTS (
  SELECT 1
  FROM courses AS c
  WHERE c.par = 72
    AND EXISTS (
      SELECT 1
      FROM rounds AS any_round
      WHERE any_round.course_id = c.course_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM rounds AS mine
      WHERE mine.course_id = c.course_id
        AND mine.player_id = p.player_id
    )
);`,
    hint: '"Played every X" is "there is no X they haven\'t played": a <code>NOT EXISTS</code> over the slam courses, '
      + 'with an inner <code>NOT EXISTS</code> for the player\'s round there. Or count: compare each player\'s number '
      + 'of distinct slam courses with the number of slam courses.',
    alternatives: [
      `SELECT p.name FROM players p JOIN rounds r ON r.player_id = p.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE c.par = 72 GROUP BY p.player_id
       HAVING COUNT(DISTINCT r.course_id) = (SELECT COUNT(DISTINCT r2.course_id) FROM rounds r2
         JOIN courses c2 ON c2.course_id = r2.course_id WHERE c2.par = 72);`,
    ],
    mistakes: [
      `SELECT p.name FROM players p WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.par = 72
       AND NOT EXISTS (SELECT 1 FROM rounds r WHERE r.course_id = c.course_id AND r.player_id = p.player_id));`,
      `SELECT p.name FROM players p JOIN rounds r ON r.player_id = p.player_id JOIN courses c ON c.course_id = r.course_id
       WHERE c.par = 72 GROUP BY p.player_id HAVING COUNT(r.course_id) >= 3;`,
      `SELECT DISTINCT p.name FROM players p JOIN rounds r ON r.player_id = p.player_id
       JOIN courses c ON c.course_id = r.course_id WHERE c.par = 72;`,
      `SELECT p.name FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
       LEFT JOIN courses c ON c.course_id = r.course_id AND c.par = 72 GROUP BY p.player_id
       HAVING COUNT(DISTINCT c.course_id) >= 2;`,
    ],
  },
  {
    id: 'next-month-retention',
    title: 'Next-month retention',
    difficulty: 'hard',
    tags: ['CTE', 'Self-join', 'LEFT JOIN', 'Dates'],
    orderMatters: true,
    task: `Measure retention month by month. A player is <em>active</em> in a month if they played at least one round
      in it, and <em>retained</em> if they were also active in the <strong>following calendar month</strong>. For each
      month from <strong>March to July 2026</strong> (August is left out: there's no September data yet), return four
      columns in this order: the month as YYYY-MM text, the number of active players, the number of those who were
      retained, and the retention rate as a percentage rounded to 1 decimal (like 66.7). Sort by month, earliest
      first.`,
    solution: `WITH active AS (
  SELECT DISTINCT player_id, strftime('%Y-%m', played_on) AS month
  FROM rounds
)
SELECT
  cur.month,
  COUNT(*) AS active_players,
  COUNT(nxt.player_id) AS retained,
  ROUND(100.0 * COUNT(nxt.player_id) / COUNT(*), 1) AS retention_pct
FROM active AS cur
LEFT JOIN active AS nxt
  ON nxt.player_id = cur.player_id
  AND nxt.month = strftime('%Y-%m', date(cur.month || '-01', '+1 month'))
WHERE cur.month < '2026-08'
GROUP BY cur.month
ORDER BY cur.month ASC;`,
    hint: 'Make a CTE with one row per player per active month (<code>SELECT DISTINCT</code>). Then <code>LEFT '
      + 'JOIN</code> it to itself on the same player and the next month, which is '
      + '<code>strftime(\'%Y-%m\', date(month || \'-01\', \'+1 month\'))</code>.',
    alternatives: [
      `WITH a AS (SELECT DISTINCT player_id, strftime('%Y-%m', played_on) AS m FROM rounds)
       SELECT m, COUNT(*), SUM(kept), ROUND(SUM(kept) * 100.0 / COUNT(*), 1) FROM (
         SELECT a.m, CASE WHEN EXISTS (SELECT 1 FROM a AS b WHERE b.player_id = a.player_id
           AND b.m = strftime('%Y-%m', date(a.m || '-01', '+1 month'))) THEN 1 ELSE 0 END AS kept FROM a)
       WHERE m BETWEEN '2026-03' AND '2026-07' GROUP BY m ORDER BY m;`,
    ],
    mistakes: [
      `WITH a AS (SELECT DISTINCT player_id, strftime('%Y-%m', played_on) AS m FROM rounds)
       SELECT cur.m, COUNT(*), COUNT(nxt.player_id), ROUND(100.0 * COUNT(nxt.player_id) / COUNT(*), 1)
       FROM a cur INNER JOIN a nxt ON nxt.player_id = cur.player_id
       AND nxt.m = strftime('%Y-%m', date(cur.m || '-01', '+1 month'))
       WHERE cur.m < '2026-08' GROUP BY cur.m ORDER BY cur.m;`,
      `WITH a AS (SELECT player_id, strftime('%Y-%m', played_on) AS m FROM rounds)
       SELECT cur.m, COUNT(*), COUNT(nxt.player_id), ROUND(100.0 * COUNT(nxt.player_id) / COUNT(*), 1)
       FROM a cur LEFT JOIN (SELECT DISTINCT player_id, m FROM a) nxt ON nxt.player_id = cur.player_id
       AND nxt.m = strftime('%Y-%m', date(cur.m || '-01', '+1 month'))
       WHERE cur.m < '2026-08' GROUP BY cur.m ORDER BY cur.m;`,
      `WITH a AS (SELECT DISTINCT player_id, strftime('%Y-%m', played_on) AS m FROM rounds)
       SELECT cur.m, COUNT(DISTINCT cur.player_id), COUNT(DISTINCT nxt.player_id),
       ROUND(100.0 * COUNT(DISTINCT nxt.player_id) / COUNT(DISTINCT cur.player_id), 1)
       FROM a cur LEFT JOIN a nxt ON nxt.player_id = cur.player_id AND nxt.m > cur.m
       WHERE cur.m < '2026-08' GROUP BY cur.m ORDER BY cur.m;`,
      `WITH a AS (SELECT DISTINCT player_id, strftime('%Y-%m', played_on) AS m FROM rounds)
       SELECT cur.m, COUNT(*), COUNT(nxt.player_id), ROUND(100.0 * COUNT(nxt.player_id) / COUNT(*), 1)
       FROM a cur LEFT JOIN a nxt ON nxt.player_id = cur.player_id
       AND nxt.m = strftime('%Y-%m', date(cur.m || '-01', '+1 month'))
       WHERE cur.m < '2026-08' GROUP BY cur.m ORDER BY cur.m DESC;`,
    ],
  },
  {
    id: 'top-two-per-course',
    title: 'Top two at every course',
    difficulty: 'hard',
    tags: ['Subqueries', 'JOIN'],
    orderMatters: true,
    task: `Find the <strong>two best rounds at each course</strong>, without window functions. Keep a round if
      <strong>fewer than two</strong> rounds at the same course scored strictly lower than it; that way a tie for
      second place keeps every tied round. Return four columns in this order: the course name, the player's name,
      <code>score</code>, and <code>played_on</code>. Sort by course name, then by score (lowest first), then by
      <code>played_on</code>.`,
    solution: `SELECT c.name, p.name, r.score, r.played_on
FROM rounds AS r
INNER JOIN courses AS c ON c.course_id = r.course_id
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE (
  SELECT COUNT(*)
  FROM rounds AS better
  WHERE better.course_id = r.course_id
    AND better.score < r.score
) < 2
ORDER BY c.name ASC, r.score ASC, r.played_on ASC;`,
    hint: 'For each round, a correlated subquery counts the rounds at the same course with a lower score. The best '
      + 'round has 0 better rounds and the runner-up has 1, so keep rounds where that count is under 2.',
    alternatives: [
      `SELECT c.name, p.name, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id LEFT JOIN rounds b ON b.course_id = r.course_id AND b.score < r.score
       GROUP BY r.round_id HAVING COUNT(b.round_id) < 2 ORDER BY 1, 3, 4;`,
    ],
    mistakes: [
      `SELECT c.name, p.name, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE (SELECT COUNT(*) FROM rounds b WHERE b.course_id = r.course_id AND b.score <= r.score) <= 2
       ORDER BY 1, 3, 4;`,
      `SELECT c.name, p.name, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE (SELECT COUNT(*) FROM rounds b WHERE b.score < r.score) < 2 ORDER BY 1, 3, 4;`,
      `SELECT c.name, p.name, r.score, r.played_on FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id
       LEFT JOIN players p ON p.player_id = r.player_id
       WHERE (SELECT COUNT(*) FROM rounds b WHERE b.course_id = r.course_id AND b.score < r.score) < 2
       ORDER BY 1, 3, 4;`,
      `SELECT c.name, p.name, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
       JOIN players p ON p.player_id = r.player_id
       WHERE (SELECT COUNT(*) FROM rounds b WHERE b.course_id = r.course_id AND b.score < r.score) < 2
       ORDER BY 1, 3, 4 DESC;`,
    ],
  },
  {
    id: 'bounce-backs',
    title: 'Bounce-backs',
    difficulty: 'hard',
    tags: ['Self-join', 'Subqueries', 'CTE'],
    orderMatters: true,
    task: `A <strong>bounce-back</strong> is a round at least 5 strokes better than the same player's
      <em>previous</em> round (their most recent round on an earlier date). Note that <code>round_id</code> isn't in
      date order. Find every bounce-back, without window functions. Return five columns in this order: the player's
      name, <code>played_on</code>, the previous round's score, this round's score, and the change (this score minus
      the previous one, so it's negative). Sort by the change, biggest improvement (most negative) first, then by
      player name, then by <code>played_on</code>.`,
    solution: `WITH with_prev AS (
  SELECT
    r.player_id,
    r.played_on,
    r.score,
    (
      SELECT MAX(e.played_on)
      FROM rounds AS e
      WHERE e.player_id = r.player_id
        AND e.played_on < r.played_on
    ) AS prev_day
  FROM rounds AS r
)
SELECT
  p.name,
  cur.played_on,
  prev.score AS prev_score,
  cur.score,
  cur.score - prev.score AS change
FROM with_prev AS cur
INNER JOIN rounds AS prev
  ON prev.player_id = cur.player_id AND prev.played_on = cur.prev_day
INNER JOIN players AS p ON p.player_id = cur.player_id
WHERE cur.score - prev.score <= -5
ORDER BY change ASC, p.name ASC, cur.played_on ASC;`,
    hint: 'For each round, find the date of the previous one with a correlated subquery: the <code>MAX(played_on)'
      + '</code> of the same player\'s earlier rounds. Then join <code>rounds</code> back on that player and date '
      + 'to get its score.',
    alternatives: [
      `SELECT p.name, cur.played_on, prev.score, cur.score, cur.score - prev.score AS d
       FROM rounds cur JOIN rounds prev ON prev.player_id = cur.player_id AND prev.played_on < cur.played_on
       JOIN players p ON p.player_id = cur.player_id
       WHERE NOT EXISTS (SELECT 1 FROM rounds mid WHERE mid.player_id = cur.player_id
         AND mid.played_on > prev.played_on AND mid.played_on < cur.played_on)
       AND cur.score <= prev.score - 5 ORDER BY d, p.name, cur.played_on;`,
    ],
    mistakes: [
      `SELECT p.name, cur.played_on, prev.score, cur.score, cur.score - prev.score AS d
       FROM rounds cur JOIN rounds prev ON prev.player_id = cur.player_id
       AND prev.round_id = (SELECT MAX(e.round_id) FROM rounds e WHERE e.player_id = cur.player_id AND e.round_id < cur.round_id)
       JOIN players p ON p.player_id = cur.player_id WHERE cur.score - prev.score <= -5 ORDER BY d, p.name, cur.played_on;`,
      `SELECT p.name, cur.played_on, prev.score, cur.score, cur.score - prev.score AS d
       FROM rounds cur JOIN rounds prev ON prev.player_id = cur.player_id AND prev.played_on < cur.played_on
       JOIN players p ON p.player_id = cur.player_id WHERE cur.score - prev.score <= -5 ORDER BY d, p.name, cur.played_on;`,
      `SELECT p.name, cur.played_on, prev.score, cur.score, cur.score - prev.score AS d
       FROM rounds cur LEFT JOIN rounds prev ON prev.player_id = cur.player_id
       AND prev.played_on = (SELECT MAX(e.played_on) FROM rounds e WHERE e.player_id = cur.player_id AND e.played_on < cur.played_on)
       JOIN players p ON p.player_id = cur.player_id WHERE cur.score - prev.score < -5 ORDER BY d, p.name, cur.played_on;`,
      `SELECT p.name, cur.played_on, prev.score, cur.score, cur.score - prev.score AS d
       FROM rounds cur JOIN rounds prev ON prev.player_id = cur.player_id
       AND prev.played_on = (SELECT MAX(e.played_on) FROM rounds e WHERE e.player_id = cur.player_id AND e.played_on < cur.played_on)
       JOIN players p ON p.player_id = cur.player_id WHERE cur.score - prev.score <= -5 ORDER BY d DESC, p.name, cur.played_on;`,
    ],
  },
  {
    id: 'clear-favorite',
    title: 'A clear favorite',
    difficulty: 'hard',
    tags: ['CTE', 'EXISTS', 'Percentages'],
    orderMatters: true,
    task: `Some players have a <strong>clear favorite course</strong>: one where they've played strictly more rounds
      than at any other course (a tie for most doesn't count). For each such player, return five columns in this order:
      the player's name, the course name, their rounds there, their total rounds, and the share of their rounds played
      there as a percentage rounded to 1 decimal. Sort by that percentage, highest first, then by player name.`,
    solution: `WITH visits AS (
  SELECT player_id, course_id, COUNT(*) AS rounds_there
  FROM rounds
  GROUP BY player_id, course_id
),
totals AS (
  SELECT player_id, COUNT(*) AS total_rounds
  FROM rounds
  GROUP BY player_id
)
SELECT
  p.name,
  c.name,
  v.rounds_there,
  t.total_rounds,
  ROUND(100.0 * v.rounds_there / t.total_rounds, 1) AS share_pct
FROM visits AS v
INNER JOIN totals AS t ON t.player_id = v.player_id
INNER JOIN players AS p ON p.player_id = v.player_id
INNER JOIN courses AS c ON c.course_id = v.course_id
WHERE NOT EXISTS (
  SELECT 1
  FROM visits AS other
  WHERE other.player_id = v.player_id
    AND other.course_id <> v.course_id
    AND other.rounds_there >= v.rounds_there
)
ORDER BY share_pct DESC, p.name ASC;`,
    hint: 'Count rounds per player per course in a CTE. A course is a clear favorite when <code>NOT EXISTS</code> '
      + 'another course for the same player with <em>as many or more</em> rounds (<code>&gt;=</code>, so ties drop '
      + 'out).',
    alternatives: [
      `WITH v AS (SELECT player_id, course_id, COUNT(*) AS n FROM rounds GROUP BY player_id, course_id)
       SELECT p.name, c.name, v.n, (SELECT COUNT(*) FROM rounds r WHERE r.player_id = v.player_id) AS t,
         ROUND(100.0 * v.n / (SELECT COUNT(*) FROM rounds r WHERE r.player_id = v.player_id), 1) AS s
       FROM v JOIN players p ON p.player_id = v.player_id JOIN courses c ON c.course_id = v.course_id
       WHERE v.n = (SELECT MAX(n) FROM v AS w WHERE w.player_id = v.player_id)
         AND (SELECT COUNT(*) FROM v AS w WHERE w.player_id = v.player_id AND w.n = v.n) = 1
       ORDER BY s DESC, p.name;`,
    ],
    mistakes: [
      `WITH v AS (SELECT player_id, course_id, COUNT(*) AS n FROM rounds GROUP BY player_id, course_id),
       t AS (SELECT player_id, COUNT(*) AS k FROM rounds GROUP BY player_id)
       SELECT p.name, c.name, v.n, t.k, ROUND(100.0 * v.n / t.k, 1) AS s
       FROM v JOIN t ON t.player_id = v.player_id JOIN players p ON p.player_id = v.player_id
       JOIN courses c ON c.course_id = v.course_id
       WHERE v.n = (SELECT MAX(n) FROM v AS w WHERE w.player_id = v.player_id) ORDER BY s DESC, p.name;`,
      `WITH v AS (SELECT player_id, course_id, COUNT(*) AS n FROM rounds GROUP BY player_id, course_id),
       t AS (SELECT player_id, COUNT(*) AS k FROM rounds GROUP BY player_id)
       SELECT p.name, c.name, v.n, t.k, ROUND(100 * v.n / t.k, 1) AS s
       FROM v JOIN t ON t.player_id = v.player_id JOIN players p ON p.player_id = v.player_id
       JOIN courses c ON c.course_id = v.course_id
       WHERE NOT EXISTS (SELECT 1 FROM v AS o WHERE o.player_id = v.player_id AND o.course_id <> v.course_id
         AND o.n >= v.n) ORDER BY s DESC, p.name;`,
      `WITH v AS (SELECT player_id, course_id, COUNT(*) AS n FROM rounds GROUP BY player_id, course_id),
       t AS (SELECT player_id, COUNT(*) AS k FROM rounds GROUP BY player_id)
       SELECT p.name, c.name, v.n, t.k, ROUND(100.0 * v.n / t.k, 1) AS s
       FROM players p LEFT JOIN v ON v.player_id = p.player_id LEFT JOIN t ON t.player_id = p.player_id
       LEFT JOIN courses c ON c.course_id = v.course_id
       WHERE NOT EXISTS (SELECT 1 FROM v AS o WHERE o.player_id = v.player_id AND o.course_id <> v.course_id
         AND o.n >= v.n) ORDER BY s DESC, p.name;`,
      `WITH v AS (SELECT player_id, course_id, COUNT(*) AS n FROM rounds GROUP BY player_id, course_id),
       t AS (SELECT player_id, COUNT(*) AS k FROM rounds GROUP BY player_id)
       SELECT p.name, c.name, v.n, t.k, ROUND(100.0 * v.n / t.k, 1) AS s
       FROM v JOIN t ON t.player_id = v.player_id JOIN players p ON p.player_id = v.player_id
       JOIN courses c ON c.course_id = v.course_id
       WHERE NOT EXISTS (SELECT 1 FROM v AS o WHERE o.player_id = v.player_id AND o.course_id <> v.course_id
         AND o.n >= v.n) ORDER BY s DESC, p.name DESC;`,
    ],
  },
];
