// Holes for the "Joins & Subqueries" tournament (The Match Play Classic), in play order (hole 1 first).
// Builds on SQL Basics, which already covers inner joins, three-table joins, GROUP BY/HAVING over joins, CASE,
// and strftime. No window functions here (OVER, ROW_NUMBER, RANK, LAG, LEAD): they belong to Window Functions.
//
// Difficulty ramp: holes 1-6 are joins (which rows each join keeps), 7-11 subqueries, 12-13 CASE patterns,
// 14-15 CTEs, and 16-18 interview classics that combine everything. Easy (Par 1): the single-concept join holes
// 1-4 and 6; hard: 15-18; the rest medium (Par 2). See js/data/par-config.js.
//
// Hole fields are documented at the top of js/data/holes/sql-basics.js. Every hole whose solution joins tables
// declares a mistake that uses the other join type, and every hole with orderMatters declares a mistake that
// returns the right rows in the wrong order (both enforced by tests).

export default [
  {
    id: 'inner-join',
    title: 'Opening match: INNER JOIN with a filter',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>In SQL Basics you wrote <code>JOIN</code>. Its full name is <code>INNER JOIN</code>: it keeps only the rows
      that have a match on <em>both</em> sides. Writing <code>INNER</code> out makes that explicit, and it matters now
      that you're about to meet joins that keep unmatched rows too.</p>
      <p>Two things to keep straight:</p>
      <ul>
        <li><strong>Rows multiply.</strong> One course matches many rounds, so each course's columns repeat once per
        matching round. The join's result has one row per <em>match</em>.</li>
        <li><strong>Filters can use either table.</strong> Once joined, <code>WHERE</code> sees the columns of both
        tables at once.</li>
      </ul>
      <pre>SELECT p.name, r.score, r.putts
FROM players AS p
INNER JOIN rounds AS r ON r.player_id = p.player_id
WHERE p.is_pro = 1
  AND r.putts &lt;= 27;</pre>`,
    interview: `Before joining, say the relationship out loud: "one course has many rounds, so I expect one row per
      round". Interviewers probe exactly this, because a join that silently multiplies rows is the root of most
      wrong totals. After you run the query, sanity-check the row count against that expectation.`,
    yardage: `<code>rounds.course_id</code> matches <code>courses.course_id</code>. <code>courses.par</code> is 70, 71,
      or 72. <code>rounds.weather</code> is <code>'Sunny'</code>, <code>'Overcast'</code>, <code>'Windy'</code>, or
      <code>'Rain'</code>.`,
    task: `List every round played on a <strong>par-72 course</strong> in <strong>Windy or Rain</strong> weather.
      Return three columns in this order: the course <code>name</code>, <code>played_on</code>, and
      <code>score</code>. Sort by <code>played_on</code>, earliest first.`,
    solution: `SELECT c.name, r.played_on, r.score
FROM rounds AS r
INNER JOIN courses AS c ON c.course_id = r.course_id
WHERE c.par = 72
  AND r.weather IN ('Windy', 'Rain')
ORDER BY r.played_on ASC;`,
    hint: "Join <code>rounds</code> to <code>courses</code>, then filter with <code>c.par = 72 AND r.weather IN ('Windy', 'Rain')</code>. Sort by <code>r.played_on</code>.",
    alternatives: [
      `SELECT courses.name, rounds.played_on, rounds.score FROM courses JOIN rounds USING (course_id)
         WHERE courses.par = 72 AND (rounds.weather = 'Windy' OR rounds.weather = 'Rain') ORDER BY 2;`,
    ],
    mistakes: [
      // Wrong join type: a LEFT JOIN with the par filter in ON keeps rounds on other courses, with a NULL name.
      `SELECT c.name, r.played_on, r.score FROM rounds r LEFT JOIN courses c ON c.course_id = r.course_id AND c.par = 72
         WHERE r.weather IN ('Windy', 'Rain') ORDER BY r.played_on;`,
      `SELECT c.name, r.played_on, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
         WHERE c.par = 72 AND r.weather IN ('Windy', 'Rain') ORDER BY c.name, r.played_on;`,
      `SELECT c.name, r.played_on, r.score FROM rounds r JOIN courses c ON c.course_id = r.course_id
         WHERE c.par = 72 AND r.weather = 'Windy' OR r.weather = 'Rain' ORDER BY r.played_on;`,
    ],
  },
  {
    id: 'three-tables',
    title: 'Home course: three tables, two paths',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>You've joined three tables before. The new idea here: two tables can be related in <strong>more than one
      way</strong>. A player relates to a course through the rounds they played there, and also through
      <code>players.home_course_id</code>, their home club. The join conditions you write decide which relationship
      the query uses.</p>
      <pre>-- Each player's home course and its par
SELECT p.name, c.name AS home_course, c.par
FROM players AS p
INNER JOIN courses AS c ON c.course_id = p.home_course_id;</pre>
      <p>You can compare the two paths directly. A round was played at home when
      <code>r.course_id = p.home_course_id</code>.</p>`,
    interview: `Interviewers love schemas with two paths between the same tables (a customer's home store vs the
      store an order came from). Name which relationship each join uses before you write it. Joining courses through
      the wrong key runs fine and returns a confident, wrong answer.`,
    yardage: `<code>players.home_course_id</code> is the player's home club (NULL for players without one).
      <code>rounds.course_id</code> is where a round was played. Both point at <code>courses.course_id</code>.`,
    task: `Find the rounds players played at <strong>their own home course</strong>. Return four columns in this order:
      the player's <code>name</code>, the course <code>name</code>, <code>played_on</code>, and <code>score</code>.
      Sort by course name, then by <code>played_on</code>.`,
    solution: `SELECT p.name, c.name, r.played_on, r.score
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
INNER JOIN courses AS c ON c.course_id = r.course_id
WHERE r.course_id = p.home_course_id
ORDER BY c.name ASC, r.played_on ASC;`,
    hint: 'Join <code>rounds</code> to <code>players</code> and <code>courses</code> as usual, then keep rounds where '
      + '<code>r.course_id = p.home_course_id</code>.',
    alternatives: [
      `SELECT p.name AS player, c.name AS course, r.played_on, r.score FROM players p
         JOIN courses c ON c.course_id = p.home_course_id
         JOIN rounds r ON r.player_id = p.player_id AND r.course_id = c.course_id
       ORDER BY course, r.played_on;`,
    ],
    mistakes: [
      // Joined through the home course only: every round gets labeled with the player's home course.
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         JOIN courses c ON c.course_id = p.home_course_id ORDER BY c.name, r.played_on;`,
      // Wrong join type: the home condition in a LEFT JOIN's ON keeps away rounds with a NULL course.
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         LEFT JOIN courses c ON c.course_id = r.course_id AND c.course_id = p.home_course_id ORDER BY c.name, r.played_on;`,
      `SELECT p.name, c.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         JOIN courses c ON c.course_id = r.course_id WHERE r.course_id = p.home_course_id ORDER BY p.name, r.played_on;`,
    ],
  },
  {
    id: 'left-join',
    title: 'Everyone on the card: LEFT JOIN',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p><code>LEFT JOIN</code> keeps <strong>every row from the left table</strong> (the one before the keyword),
      matched or not. Where there's no match, the right table's columns come back as <code>NULL</code>.</p>
      <pre>-- Every course, with the dates of any rain rounds
-- (NULL if it never rained there)
SELECT c.name, r.played_on
FROM courses AS c
LEFT JOIN rounds AS r
  ON r.course_id = c.course_id AND r.weather = 'Rain';</pre>
      <p>Notice the weather condition is in <code>ON</code>, not <code>WHERE</code>. <code>ON</code> decides what
      counts as a match. <code>WHERE</code> runs afterwards and would throw away the NULL rows you just kept.</p>`,
    interview: `"Which join would you use, and what happens to rows without a match?" is asked in nearly every SQL
      interview. Also know the ON-vs-WHERE rule: a <code>WHERE</code> filter on the right table's columns quietly
      turns a <code>LEFT JOIN</code> back into an <code>INNER JOIN</code>.`,
    yardage: `<code>players.home_course_id</code> is NULL for players without a home club. Course names are in
      <code>courses.name</code>.`,
    task: `Make a membership list: <strong>every</strong> player with the name of their home course, or
      <code>NULL</code> if they don't have one. Return two columns in this order: the player's <code>name</code> and
      the course <code>name</code>. Sort by player name.`,
    solution: `SELECT p.name, c.name
FROM players AS p
LEFT JOIN courses AS c ON c.course_id = p.home_course_id
ORDER BY p.name ASC;`,
    hint: 'Start <code>FROM players</code> so every player is kept, then <code>LEFT JOIN courses ON c.course_id = p.home_course_id</code>.',
    alternatives: [
      `SELECT p.name AS player, c.name AS home_course FROM courses c
         RIGHT JOIN players p ON p.home_course_id = c.course_id ORDER BY player;`,
      `SELECT p.name, (SELECT c.name FROM courses c WHERE c.course_id = p.home_course_id) FROM players p ORDER BY 1;`,
    ],
    mistakes: [
      'SELECT p.name, c.name FROM players p INNER JOIN courses c ON c.course_id = p.home_course_id ORDER BY p.name;',
      'SELECT p.name, c.name FROM courses c LEFT JOIN players p ON p.home_course_id = c.course_id ORDER BY p.name;',
      'SELECT p.name, c.name FROM players p LEFT JOIN courses c ON c.course_id = p.home_course_id ORDER BY c.name, p.name;',
    ],
  },
  {
    id: 'anti-join',
    title: 'Still in the clubhouse: anti-joins',
    difficulty: 'easy',
    lesson: `
      <p>An <strong>anti-join</strong> finds rows with <em>no</em> match: customers with no orders, courses with no
      rounds. The classic recipe is a <code>LEFT JOIN</code>, then keep only the rows where the right side came back
      empty:</p>
      <pre>-- Courses where nobody has ever played
SELECT c.name
FROM courses AS c
LEFT JOIN rounds AS r ON r.course_id = c.course_id
WHERE r.round_id IS NULL;</pre>
      <p>Test a column that can't be NULL in a real match, such as the right table's primary key. If you test a
      nullable column, a genuine match with a NULL value would sneak through.</p>`,
    interview: `Anti-joins are everywhere in product questions: users who signed up but never ordered, items never
      sold. Mention that <code>NOT EXISTS</code> (hole 11) does the same job, and that <code>NOT IN</code> has a NULL
      trap (hole 8). Knowing all three, and when each is safe, is what the question is really testing.`,
    yardage: `Every round has a <code>player_id</code>. Some members have never played a recorded round.`,
    task: `Which members have <strong>never played</strong> a recorded round? Return their <code>name</code> and
      <code>country</code>, in that order.`,
    solution: `SELECT p.name, p.country
FROM players AS p
LEFT JOIN rounds AS r ON r.player_id = p.player_id
WHERE r.round_id IS NULL;`,
    hint: '<code>LEFT JOIN rounds</code> onto <code>players</code>, then keep <code>WHERE r.round_id IS NULL</code>.',
    alternatives: [
      'SELECT name, country FROM players WHERE player_id NOT IN (SELECT player_id FROM rounds);',
      `SELECT p.name, p.country FROM players p
         WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.player_id = p.player_id);`,
    ],
    mistakes: [
      'SELECT p.name, p.country FROM players p INNER JOIN rounds r ON r.player_id = p.player_id WHERE r.round_id IS NULL;',
      'SELECT p.name, p.country FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id WHERE r.round_id IS NOT NULL;',
      'SELECT p.name, p.country FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id WHERE r.round_id = NULL;',
    ],
  },
  {
    id: 'left-join-counts',
    title: 'Counting zeros: COUNT(*) vs COUNT(column)',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>Aggregating after a <code>LEFT JOIN</code> has two traps. For a left row with no match, the join still
      produces <em>one</em> row, full of NULLs on the right side:</p>
      <ul>
        <li><code>COUNT(*)</code> counts that row, so it reports <strong>1</strong>. <code>COUNT(r.round_id)</code>
        counts only non-NULL values, so it correctly reports <strong>0</strong>.</li>
        <li><code>SUM</code>, <code>AVG</code>, <code>MIN</code>, and <code>MAX</code> of nothing are
        <code>NULL</code>, not 0. <code>COALESCE(x, 0)</code> returns the first non-NULL value, turning that NULL
        into 0.</li>
      </ul>
      <pre>SELECT c.name,
  COUNT(r.round_id) AS rounds,
  COALESCE(MIN(r.score), 0) AS course_record
FROM courses AS c
LEFT JOIN rounds AS r ON r.course_id = c.course_id
GROUP BY c.course_id, c.name;</pre>`,
    interview: `"Count orders per customer, including customers with none" is a staple, and <code>COUNT(*)</code> after
      a <code>LEFT JOIN</code> is the bug it's designed to catch. Say which column you're counting and why. Also be
      ready to argue whether a missing value should display as 0 or NULL. For a count or a total, 0 is right.`,
    yardage: `<code>rounds.putts</code> is per round. Players 13–16 have no rounds.`,
    task: `For <strong>every</strong> player, return three columns in this order: <code>name</code>, their number of
      rounds, and their total putts across all rounds, using <strong>0</strong> (not NULL) for players with no
      rounds. Sort by number of rounds, most first, then by name A→Z.`,
    solution: `SELECT
  p.name,
  COUNT(r.round_id) AS rounds_played,
  COALESCE(SUM(r.putts), 0) AS total_putts
FROM players AS p
LEFT JOIN rounds AS r ON r.player_id = p.player_id
GROUP BY p.player_id, p.name
ORDER BY rounds_played DESC, p.name ASC;`,
    hint: 'After <code>players LEFT JOIN rounds</code>, count <code>COUNT(r.round_id)</code> (not <code>COUNT(*)</code>) '
      + 'and wrap the total in <code>COALESCE(SUM(r.putts), 0)</code>.',
    alternatives: [
      `SELECT p.name, COUNT(r.putts) AS n, IFNULL(SUM(r.putts), 0) FROM players p
         LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name ORDER BY n DESC, p.name;`,
      `SELECT p.name,
         (SELECT COUNT(*) FROM rounds r WHERE r.player_id = p.player_id) AS n,
         (SELECT COALESCE(SUM(putts), 0) FROM rounds r WHERE r.player_id = p.player_id)
       FROM players p ORDER BY n DESC, p.name;`,
    ],
    mistakes: [
      `SELECT p.name, COUNT(*) AS n, COALESCE(SUM(r.putts), 0) FROM players p
         LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS n, SUM(r.putts) FROM players p
         LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS n, COALESCE(SUM(r.putts), 0) FROM players p
         INNER JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name ORDER BY n DESC, p.name;`,
      `SELECT p.name, COUNT(r.round_id) AS n, COALESCE(SUM(r.putts), 0) FROM players p
         LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.name ORDER BY n DESC, p.name DESC;`,
    ],
  },
  {
    id: 'self-join',
    title: 'Clubmates: the self-join',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>A <strong>self-join</strong> joins a table to itself, under two different aliases, to relate rows of the same
      kind to each other: employees and their managers, or players who share something.</p>
      <pre>-- Pairs of players from the same country
SELECT a.name, b.name, a.country
FROM players AS a
INNER JOIN players AS b
  ON b.country = a.country AND a.player_id &lt; b.player_id;</pre>
      <p>The <code>a.player_id &lt; b.player_id</code> condition does two jobs. It stops a player being paired with
      themselves, and it lists each pair once instead of twice (A–B but not B–A).</p>`,
    interview: `Self-joins show up as "find pairs" and "compare each row to another row of the same table" questions.
      Interviewers watch for the duplicate-pairs bug: with <code>&lt;&gt;</code> instead of <code>&lt;</code>, every
      pair appears twice. State how you're de-duplicating before they ask.`,
    yardage: `<code>players.home_course_id</code> is shared by 2–3 players at most clubs, and NULL for players without a
      home club. Course names are in <code>courses</code>.`,
    task: `List every pair of players who share a <strong>home course</strong>, each pair once. Return three columns in
      this order: the name of the player with the <strong>lower</strong> <code>player_id</code>, the other player's
      name, and the course <code>name</code>. Sort by course name, then the first name, then the second name.`,
    solution: `SELECT a.name, b.name, c.name
FROM players AS a
INNER JOIN players AS b
  ON b.home_course_id = a.home_course_id AND a.player_id < b.player_id
INNER JOIN courses AS c ON c.course_id = a.home_course_id
ORDER BY c.name ASC, a.name ASC, b.name ASC;`,
    hint: 'Join <code>players AS a</code> to <code>players AS b</code> on the same <code>home_course_id</code> with '
      + '<code>a.player_id &lt; b.player_id</code>, then join <code>courses</code> for the name.',
    alternatives: [
      `SELECT a.name, b.name, c.name AS course FROM players a, players b, courses c
         WHERE a.home_course_id = b.home_course_id AND a.player_id < b.player_id AND c.course_id = b.home_course_id
         ORDER BY course, 1, 2;`,
    ],
    mistakes: [
      `SELECT a.name, b.name, c.name FROM players a JOIN players b ON b.home_course_id = a.home_course_id
         AND a.player_id <> b.player_id JOIN courses c ON c.course_id = a.home_course_id ORDER BY c.name, a.name, b.name;`,
      `SELECT a.name, b.name, c.name FROM players a LEFT JOIN players b ON b.home_course_id = a.home_course_id
         AND a.player_id < b.player_id LEFT JOIN courses c ON c.course_id = a.home_course_id ORDER BY c.name, a.name, b.name;`,
      `SELECT a.name, b.name, c.name FROM players a JOIN players b ON b.home_course_id = a.home_course_id
         AND a.player_id < b.player_id JOIN courses c ON c.course_id = a.home_course_id ORDER BY a.name, b.name;`,
    ],
  },
  {
    id: 'scalar-subquery',
    title: 'Beat the field: a subquery in WHERE',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>A <strong>subquery</strong> is a query inside another query. One that returns a single value (one row, one
      column) can stand anywhere a value can, including a <code>WHERE</code> comparison:</p>
      <pre>-- Courses longer than the average course
SELECT name, yardage
FROM courses
WHERE yardage &gt; (
  SELECT AVG(yardage)
  FROM courses
);</pre>
      <p>You can't write <code>WHERE yardage &gt; AVG(yardage)</code>. <code>WHERE</code> runs row by row, before any
      aggregate exists. The subquery computes the average first, as its own query.</p>`,
    interview: `"Find the rows above/below the average" is the gateway subquery question. Explain why the aggregate
      can't go straight into <code>WHERE</code>. Then note that the subquery runs once, because it doesn't depend on
      the outer row. Compare that with the correlated subquery in hole 10, which reruns for each row.`,
    yardage: `<code>rounds.score</code>: lower is better. Every round counts toward the average.`,
    task: `Find every round that <strong>beat the field</strong>: a score lower than the average score of
      <strong>all</strong> rounds. Return <code>round_id</code>, <code>played_on</code>, and <code>score</code>, in
      that order. Sort by score (best first), then by <code>round_id</code>.`,
    solution: `SELECT round_id, played_on, score
FROM rounds
WHERE score < (
  SELECT AVG(score)
  FROM rounds
)
ORDER BY score ASC, round_id ASC;`,
    hint: 'Compare <code>score &lt; (SELECT AVG(score) FROM rounds)</code>, and order by <code>score, round_id</code>.',
    alternatives: [
      `WITH field AS (SELECT AVG(score) AS avg_score FROM rounds)
       SELECT r.round_id, r.played_on, r.score FROM rounds r, field f WHERE r.score < f.avg_score ORDER BY 3, 1;`,
    ],
    mistakes: [
      'SELECT round_id, played_on, score FROM rounds WHERE score < AVG(score) ORDER BY score, round_id;',
      'SELECT round_id, played_on, score FROM rounds WHERE score > (SELECT AVG(score) FROM rounds) ORDER BY score, round_id;',
      'SELECT round_id, played_on, score FROM rounds WHERE score < (SELECT AVG(score) FROM rounds) ORDER BY score, round_id DESC;',
    ],
  },
  {
    id: 'in-not-in',
    title: 'Out of bounds: IN, NOT IN, and the NULL trap',
    difficulty: 'medium',
    lesson: `
      <p>A subquery that returns one column of many rows can feed <code>IN</code> and <code>NOT IN</code>:</p>
      <pre>-- Players from a country that has a course in our database
SELECT name
FROM players
WHERE country IN (
  SELECT country
  FROM courses
);</pre>
      <p><code>NOT IN</code> has a famous trap. If the subquery returns even one <code>NULL</code>, then
      <code>x NOT IN (…)</code> is never true, and you get <strong>no rows at all</strong>. SQL can't be sure
      <code>x</code> isn't equal to the unknown value. Filter NULLs out of the subquery (or use
      <code>NOT EXISTS</code>, hole 11).</p>`,
    interview: `The <code>NOT IN</code> NULL trap is one of the most famous SQL gotchas, and it fails silently: the
      query runs and returns nothing. If you use <code>NOT IN</code> in an interview, say "and I'll exclude NULLs from
      the subquery" as you write it. That sentence alone signals experience.`,
    yardage: `<code>players.home_course_id</code> is NULL for players without a home club. That NULL is what springs the
      trap. Course names and cities are in <code>courses</code>.`,
    task: `The club wants to recruit members for courses that are <strong>nobody's home course</strong>. Return each
      such course's <code>name</code> and <code>city</code>, in that order.`,
    solution: `SELECT name, city
FROM courses
WHERE course_id NOT IN (
  SELECT home_course_id
  FROM players
  WHERE home_course_id IS NOT NULL
);`,
    hint: 'Use <code>course_id NOT IN (SELECT home_course_id FROM players …)</code>, but the subquery must exclude NULLs: '
      + 'add <code>WHERE home_course_id IS NOT NULL</code>.',
    alternatives: [
      `SELECT c.name, c.city FROM courses c
         WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.home_course_id = c.course_id);`,
      `SELECT c.name, c.city FROM courses c LEFT JOIN players p ON p.home_course_id = c.course_id
         WHERE p.player_id IS NULL;`,
    ],
    mistakes: [
      'SELECT name, city FROM courses WHERE course_id NOT IN (SELECT home_course_id FROM players);',
      'SELECT name, city FROM courses WHERE course_id IN (SELECT home_course_id FROM players);',
      'SELECT name, city FROM courses WHERE course_id NOT IN (SELECT course_id FROM rounds);',
    ],
  },
  {
    id: 'derived-table',
    title: 'The view from the tee: subqueries in FROM',
    difficulty: 'medium',
    lesson: `
      <p>A subquery in <code>FROM</code> (a <strong>derived table</strong>) acts like a temporary table that exists
      for one query. It's how you aggregate <em>twice</em>: first per group, then over the groups.</p>
      <pre>-- Courses per country, then the average and largest of those counts
SELECT AVG(courses_here), MAX(courses_here)
FROM (
  SELECT country, COUNT(*) AS courses_here
  FROM courses
  GROUP BY country
) AS per_country;</pre>
      <p>You can't nest aggregates directly (<code>AVG(COUNT(*))</code> is an error). The inner query produces one row
      per group, and the outer query aggregates those rows.</p>`,
    interview: `"What's the average number of orders per customer?" is a two-level aggregation, and it hides a trap:
      <code>COUNT(*) / COUNT(DISTINCT customer_id)</code> is integer division in many databases. A derived table
      makes each step explicit and easy to check, which is what interviewers want to see. Also ask whether customers
      with zero orders should count. Here they don't.`,
    yardage: `Group <code>rounds</code> by <code>player_id</code> to get rounds per player. Players with no rounds don't
      appear in <code>rounds</code>, and this question leaves them out.`,
    task: `Summarize how active our players are. Considering <strong>only players who have played at least one
      round</strong>, return one row with three columns in this order: how many such players there are, the average
      number of rounds per player <strong>rounded to 2 decimals</strong>, and the most rounds played by a single
      player.`,
    solution: `SELECT
  COUNT(*) AS active_players,
  ROUND(AVG(rounds_played), 2) AS avg_rounds_per_player,
  MAX(rounds_played) AS most_rounds
FROM (
  SELECT player_id, COUNT(*) AS rounds_played
  FROM rounds
  GROUP BY player_id
) AS per_player;`,
    hint: 'Inner query: <code>SELECT player_id, COUNT(*) AS n FROM rounds GROUP BY player_id</code>. Outer query: '
      + '<code>COUNT(*)</code>, <code>ROUND(AVG(n), 2)</code>, and <code>MAX(n)</code> over it.',
    alternatives: [
      `SELECT COUNT(DISTINCT player_id), ROUND(1.0 * COUNT(*) / COUNT(DISTINCT player_id), 2),
         (SELECT COUNT(*) AS n FROM rounds GROUP BY player_id ORDER BY n DESC LIMIT 1) FROM rounds;`,
    ],
    mistakes: [
      `SELECT COUNT(DISTINCT player_id), COUNT(*) / COUNT(DISTINCT player_id),
         (SELECT COUNT(*) AS n FROM rounds GROUP BY player_id ORDER BY n DESC LIMIT 1) FROM rounds;`,
      `SELECT COUNT(*), ROUND(AVG(n), 2), MAX(n) FROM (SELECT p.player_id, COUNT(r.round_id) AS n
         FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id);`,
      'SELECT COUNT(DISTINCT player_id), ROUND(AVG(COUNT(*)), 2), MAX(COUNT(*)) FROM rounds GROUP BY player_id;',
    ],
  },
  {
    id: 'correlated-subquery',
    title: 'Personal par: correlated subqueries',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>A <strong>correlated subquery</strong> refers to a column of the outer query, so it's evaluated again for each
      outer row. Use it to compare a row against its <em>own group</em>:</p>
      <pre>-- Courses longer than the average course in the same country
SELECT c.name, c.country, c.yardage
FROM courses AS c
WHERE c.yardage &gt; (
  SELECT AVG(c2.yardage)
  FROM courses AS c2
  WHERE c2.country = c.country
);</pre>
      <p>The inner query needs its own alias (<code>c2</code>) so <code>c2.country = c.country</code> is unambiguous:
      "the courses in <em>this</em> outer row's country".</p>`,
    interview: `Comparing each row with its own group ("orders larger than that customer's average") is a favorite.
      Two things to mention: without the correlation you'd compare against the global average, and a correlated
      subquery can be slow on big tables. The same answer comes from joining to a per-group aggregate, or from a
      window function, which you'll meet in the next tournament.`,
    yardage: `Each player's rounds are the rows of <code>rounds</code> with their <code>player_id</code>. Names are in
      <code>players</code>.`,
    task: `Find every round where a player <strong>beat their own average</strong>: a score lower than that same
      player's average score. Return three columns in this order: the player's <code>name</code>,
      <code>played_on</code>, and <code>score</code>. Sort by player name, then <code>played_on</code>.`,
    solution: `SELECT p.name, r.played_on, r.score
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE r.score < (
  SELECT AVG(r2.score)
  FROM rounds AS r2
  WHERE r2.player_id = r.player_id
)
ORDER BY p.name ASC, r.played_on ASC;`,
    hint: 'Inside the subquery, alias rounds again (<code>r2</code>) and add <code>WHERE r2.player_id = r.player_id</code> '
      + 'so it averages only this player\'s rounds.',
    alternatives: [
      `SELECT p.name, r.played_on, r.score FROM rounds r JOIN players p USING (player_id)
         JOIN (SELECT player_id, AVG(score) AS a FROM rounds GROUP BY player_id) pa ON pa.player_id = r.player_id
       WHERE r.score < pa.a ORDER BY 1, 2;`,
    ],
    mistakes: [
      `SELECT p.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE r.score < (SELECT AVG(score) FROM rounds) ORDER BY p.name, r.played_on;`,
      // Wrong join type: players LEFT JOIN rounds, with a NULL check that keeps members who have no rounds.
      `SELECT p.name, r.played_on, r.score FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
         WHERE r.score IS NULL OR r.score < (SELECT AVG(r2.score) FROM rounds r2 WHERE r2.player_id = p.player_id)
         ORDER BY p.name, r.played_on;`,
      `SELECT p.name, r.played_on, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE r.score < (SELECT AVG(r2.score) FROM rounds r2 WHERE r2.player_id = r.player_id) ORDER BY r.played_on, p.name;`,
    ],
  },
  {
    id: 'exists',
    title: 'Anyone out there? EXISTS and NOT EXISTS',
    difficulty: 'medium',
    lesson: `
      <p><code>EXISTS (subquery)</code> is true when the subquery returns at least one row. What it returns doesn't
      matter, so <code>SELECT 1</code> is the convention. It's almost always correlated:</p>
      <pre>-- Players who have played at least one round in the rain
SELECT p.name
FROM players AS p
WHERE EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.player_id = p.player_id
    AND r.weather = 'Rain'
);</pre>
      <p>Unlike a <code>JOIN</code>, <code>EXISTS</code> never duplicates the outer row, however many matches there
      are. <code>NOT EXISTS</code> is the NULL-safe anti-join.</p>`,
    interview: `Reach for <code>EXISTS</code> when the question is "is there at least one…?". Explain the advantage out
      loud: a join to the many side multiplies rows and forces a <code>DISTINCT</code>, while <code>EXISTS</code>
      returns each outer row once and can stop at the first match. <code>NOT EXISTS</code> is the anti-join that
      doesn't fall into the <code>NOT IN</code> NULL trap.`,
    yardage: `<code>players.is_pro</code> is 1 for professionals. <code>rounds.weather = 'Rain'</code> marks wet rounds.
      Some courses have many rounds; one has none.`,
    task: `Find the courses where <strong>at least one professional</strong> has played, but where
      <strong>no round has ever been played in the rain</strong>. Return just the course <code>name</code>.`,
    solution: `SELECT c.name
FROM courses AS c
WHERE EXISTS (
  SELECT 1
  FROM rounds AS r
  INNER JOIN players AS p ON p.player_id = r.player_id
  WHERE r.course_id = c.course_id
    AND p.is_pro = 1
)
AND NOT EXISTS (
  SELECT 1
  FROM rounds AS r
  WHERE r.course_id = c.course_id
    AND r.weather = 'Rain'
);`,
    hint: 'Two correlated conditions on <code>courses AS c</code>: <code>EXISTS</code> a round at <code>c</code> by a player '
      + 'with <code>is_pro = 1</code>, and <code>NOT EXISTS</code> a round at <code>c</code> with <code>weather = \'Rain\'</code>.',
    alternatives: [
      `SELECT c.name FROM courses c
         WHERE c.course_id IN (SELECT r.course_id FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.is_pro = 1)
           AND c.course_id NOT IN (SELECT course_id FROM rounds WHERE weather = 'Rain');`,
      `SELECT DISTINCT c.name FROM courses c JOIN rounds r ON r.course_id = c.course_id JOIN players p ON p.player_id = r.player_id
         WHERE p.is_pro = 1 AND NOT EXISTS (SELECT 1 FROM rounds r2 WHERE r2.course_id = c.course_id AND r2.weather = 'Rain');`,
    ],
    mistakes: [
      // A JOIN instead of EXISTS: one row per matching pro round, so course names repeat.
      `SELECT c.name FROM courses c JOIN rounds r ON r.course_id = c.course_id JOIN players p ON p.player_id = r.player_id
         WHERE p.is_pro = 1 AND NOT EXISTS (SELECT 1 FROM rounds r2 WHERE r2.course_id = c.course_id AND r2.weather = 'Rain');`,
      // Wrong join type: LEFT JOIN + "not rain" filters rounds, not courses.
      `SELECT DISTINCT c.name FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id
         WHERE r.weather <> 'Rain' OR r.weather IS NULL;`,
      `SELECT c.name FROM courses c
         WHERE EXISTS (SELECT 1 FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE r.course_id = c.course_id AND p.is_pro = 1)
           AND NOT EXISTS (SELECT 1 FROM rounds r WHERE r.weather = 'Rain');`,
    ],
  },
  {
    id: 'case-buckets',
    title: 'Handicap brackets: bucketing with CASE',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>In SQL Basics you counted with <code>CASE</code>. Here you'll <strong>bucket</strong> with it: turn a number
      into a named range. Three rules make buckets correct:</p>
      <ul>
        <li><code>WHEN</code> branches are checked <strong>top to bottom</strong>, and the first true one wins. Order
        the ranges so each branch only catches what the earlier ones didn't.</li>
        <li><code>NULL</code> fails every comparison and falls to <code>ELSE</code>. Handle it explicitly with
        <code>WHEN x IS NULL</code>.</li>
        <li>Sorting bucket <em>names</em> alphabetically is rarely what you want. Sort by a <code>CASE</code> that
        gives each bucket a rank.</li>
      </ul>
      <pre>SELECT name,
  CASE
    WHEN yardage &lt; 6600 THEN 'Short'
    WHEN yardage &lt; 7000 THEN 'Medium'
    ELSE 'Long'
  END AS length
FROM courses
ORDER BY CASE
  WHEN yardage &lt; 6600 THEN 1
  WHEN yardage &lt; 7000 THEN 2
  ELSE 3
END;</pre>`,
    interview: `Bucketing ("segment users by spend", "age bands") is a staple of analytics interviews. Say what happens at
      the boundaries (is 5.0 Low or Mid?) and what happens to NULLs. Both are where bucket queries go wrong, and both
      are what the interviewer is checking.`,
    yardage: `<code>players.handicap</code> is a decimal (for example <code>0.8</code> or <code>12.3</code>), and NULL for
      3 players.`,
    task: `Count players by handicap bracket. The brackets are: <code>'Scratch'</code> (under 1),
      <code>'Low'</code> (1 up to, but not including, 5), <code>'Mid'</code> (5 up to, but not including, 10),
      <code>'High'</code> (10 or more), and <code>'Unrated'</code> (no handicap). Return two columns in this order: the
      bracket name (exactly as written) and the number of players. List the brackets in the order
      <strong>Scratch, Low, Mid, High, Unrated</strong>.`,
    solution: `SELECT
  CASE
    WHEN handicap IS NULL THEN 'Unrated'
    WHEN handicap < 1 THEN 'Scratch'
    WHEN handicap < 5 THEN 'Low'
    WHEN handicap < 10 THEN 'Mid'
    ELSE 'High'
  END AS bracket,
  COUNT(*) AS players
FROM players
GROUP BY bracket
ORDER BY CASE bracket
  WHEN 'Scratch' THEN 1
  WHEN 'Low' THEN 2
  WHEN 'Mid' THEN 3
  WHEN 'High' THEN 4
  ELSE 5
END;`,
    hint: 'Check <code>handicap IS NULL</code> first, then <code>&lt; 1</code>, <code>&lt; 5</code>, <code>&lt; 10</code>, '
      + 'and <code>ELSE</code>. Sort with <code>ORDER BY CASE bracket WHEN \'Scratch\' THEN 1 … END</code>.',
    alternatives: [
      `SELECT CASE WHEN handicap >= 10 THEN 'High' WHEN handicap >= 5 THEN 'Mid' WHEN handicap >= 1 THEN 'Low'
         WHEN handicap >= 0 THEN 'Scratch' ELSE 'Unrated' END AS b, COUNT(*) FROM players GROUP BY b
       ORDER BY CASE WHEN MIN(handicap) IS NULL THEN 99 ELSE MIN(handicap) END;`,
    ],
    mistakes: [
      `SELECT CASE WHEN handicap IS NULL THEN 'Unrated' WHEN handicap < 1 THEN 'Scratch' WHEN handicap < 5 THEN 'Low'
         WHEN handicap < 10 THEN 'Mid' ELSE 'High' END AS b, COUNT(*) FROM players GROUP BY b ORDER BY b;`,
      `SELECT CASE WHEN handicap < 1 THEN 'Scratch' WHEN handicap < 5 THEN 'Low' WHEN handicap < 10 THEN 'Mid'
         ELSE 'High' END AS b, COUNT(*) FROM players GROUP BY b
       ORDER BY CASE b WHEN 'Scratch' THEN 1 WHEN 'Low' THEN 2 WHEN 'Mid' THEN 3 ELSE 4 END;`,
      `SELECT CASE WHEN handicap IS NULL THEN 'Unrated' WHEN handicap < 10 THEN 'Mid' WHEN handicap < 5 THEN 'Low'
         WHEN handicap < 1 THEN 'Scratch' ELSE 'High' END AS b, COUNT(*) FROM players GROUP BY b
       ORDER BY CASE b WHEN 'Scratch' THEN 1 WHEN 'Low' THEN 2 WHEN 'Mid' THEN 3 WHEN 'High' THEN 4 ELSE 5 END;`,
    ],
  },
  {
    id: 'conditional-aggregation',
    title: 'Weather board: pivoting with conditional aggregation',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>Conditional aggregation can <strong>pivot</strong>: turn the values of one column into separate output
      columns, one <code>SUM(CASE …)</code> per value. Combined with a <code>LEFT JOIN</code>, every left row appears,
      even with zeros everywhere.</p>
      <pre>-- Per player: rounds with 28 putts or fewer vs rounds with more than 32
SELECT p.name,
  SUM(CASE WHEN r.putts &lt;= 28 THEN 1 ELSE 0 END) AS good_putting_rounds,
  SUM(CASE WHEN r.putts &gt; 32 THEN 1 ELSE 0 END) AS three_putt_trouble
FROM players AS p
LEFT JOIN rounds AS r ON r.player_id = p.player_id
GROUP BY p.player_id, p.name;</pre>
      <p>For an unmatched left row, <code>r.putts</code> is NULL, the <code>CASE</code> falls to <code>ELSE 0</code>,
      and the sum is 0, which is exactly what a report should show.</p>`,
    interview: `Pivoting with <code>SUM(CASE …)</code> is how you build "one row per X, one column per status" reports,
      a very common take-home and live-coding ask. It works in every SQL dialect, unlike vendor <code>PIVOT</code>
      syntax, which is a good reason to prefer it. Mention that you need one <code>CASE</code> per output column, so
      the set of columns has to be known in advance.`,
    yardage: `<code>rounds.weather</code> is one of <code>'Sunny'</code>, <code>'Overcast'</code>, <code>'Windy'</code>,
      <code>'Rain'</code>. One course has no rounds at all.`,
    task: `Build a weather board with <strong>every</strong> course. Return five columns in this order: the course
      <code>name</code>, then the number of its rounds played in <code>'Sunny'</code>, <code>'Overcast'</code>,
      <code>'Windy'</code>, and <code>'Rain'</code> weather (0 where there were none). Sort by course name.`,
    solution: `SELECT
  c.name,
  SUM(CASE WHEN r.weather = 'Sunny' THEN 1 ELSE 0 END) AS sunny,
  SUM(CASE WHEN r.weather = 'Overcast' THEN 1 ELSE 0 END) AS overcast,
  SUM(CASE WHEN r.weather = 'Windy' THEN 1 ELSE 0 END) AS windy,
  SUM(CASE WHEN r.weather = 'Rain' THEN 1 ELSE 0 END) AS rain
FROM courses AS c
LEFT JOIN rounds AS r ON r.course_id = c.course_id
GROUP BY c.course_id, c.name
ORDER BY c.name ASC;`,
    hint: '<code>courses LEFT JOIN rounds</code>, <code>GROUP BY</code> the course, and one '
      + '<code>SUM(CASE WHEN r.weather = \'Sunny\' THEN 1 ELSE 0 END)</code> per weather.',
    alternatives: [
      `SELECT c.name, COUNT(CASE WHEN r.weather = 'Sunny' THEN 1 END), COUNT(CASE WHEN r.weather = 'Overcast' THEN 1 END),
         COUNT(CASE WHEN r.weather = 'Windy' THEN 1 END), COUNT(CASE WHEN r.weather = 'Rain' THEN 1 END)
       FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY c.name;`,
      `SELECT c.name, TOTAL(r.weather = 'Sunny'), TOTAL(r.weather = 'Overcast'), TOTAL(r.weather = 'Windy'),
         TOTAL(r.weather = 'Rain') FROM courses c LEFT JOIN rounds r USING (course_id) GROUP BY c.name ORDER BY 1;`,
    ],
    mistakes: [
      `SELECT c.name, SUM(CASE WHEN r.weather = 'Sunny' THEN 1 ELSE 0 END), SUM(CASE WHEN r.weather = 'Overcast' THEN 1 ELSE 0 END),
         SUM(CASE WHEN r.weather = 'Windy' THEN 1 ELSE 0 END), SUM(CASE WHEN r.weather = 'Rain' THEN 1 ELSE 0 END)
       FROM courses c INNER JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY c.name;`,
      `SELECT c.name, COUNT(CASE WHEN r.weather = 'Sunny' THEN 1 ELSE 0 END), COUNT(CASE WHEN r.weather = 'Overcast' THEN 1 ELSE 0 END),
         COUNT(CASE WHEN r.weather = 'Windy' THEN 1 ELSE 0 END), COUNT(CASE WHEN r.weather = 'Rain' THEN 1 ELSE 0 END)
       FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY c.name;`,
      `SELECT c.name, SUM(CASE WHEN r.weather = 'Sunny' THEN 1 ELSE 0 END), SUM(CASE WHEN r.weather = 'Overcast' THEN 1 ELSE 0 END),
         SUM(CASE WHEN r.weather = 'Windy' THEN 1 ELSE 0 END), SUM(CASE WHEN r.weather = 'Rain' THEN 1 ELSE 0 END)
       FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY c.course_id;`,
    ],
  },
  {
    id: 'first-cte',
    title: 'Plan the hole: your first CTE',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>A <strong>common table expression</strong> (CTE) names a subquery up front with <code>WITH</code>, so the main
      query reads top to bottom instead of inside out:</p>
      <pre>WITH course_counts AS (
  SELECT country, COUNT(*) AS n
  FROM courses
  GROUP BY country
)
SELECT country, n
FROM course_counts
WHERE n &gt; (
  SELECT AVG(n)
  FROM course_counts
);</pre>
      <p>Two wins over a nested subquery: the steps have names, and a CTE can be <strong>referenced more than
      once</strong>. Here <code>course_counts</code> feeds both the main query and the comparison, where a subquery
      version would have to repeat itself.</p>`,
    interview: `Most interviewers prefer CTEs for anything with more than one step, because they make your reasoning
      visible. A good habit: write one CTE per step, run it on its own to check it, then build the next. Also be clear
      about what you're averaging. The average of player averages is not the average of all rounds, since players
      with more rounds weigh more in the second.`,
    yardage: `Group <code>rounds</code> by <code>player_id</code> for per-player averages. Names are in
      <code>players</code>.`,
    task: `Find the players whose average score is better (lower) than the <strong>average of all players'
      averages</strong>, where each player who has played counts once. Return two columns in this order: the player's
      <code>name</code> and their average score <strong>rounded to 1 decimal</strong>. Sort by that average, best first,
      then by name.`,
    solution: `WITH player_avg AS (
  SELECT player_id, AVG(score) AS avg_score
  FROM rounds
  GROUP BY player_id
)
SELECT p.name, ROUND(pa.avg_score, 1) AS avg_score
FROM player_avg AS pa
INNER JOIN players AS p ON p.player_id = pa.player_id
WHERE pa.avg_score < (
  SELECT AVG(avg_score)
  FROM player_avg
)
ORDER BY pa.avg_score ASC, p.name ASC;`,
    hint: '<code>WITH player_avg AS (SELECT player_id, AVG(score) AS avg_score FROM rounds GROUP BY player_id)</code>, then '
      + 'compare <code>pa.avg_score &lt; (SELECT AVG(avg_score) FROM player_avg)</code>.',
    alternatives: [
      `SELECT p.name, ROUND(x.a, 1) FROM (SELECT player_id, AVG(score) AS a FROM rounds GROUP BY player_id) x
         JOIN players p ON p.player_id = x.player_id
       WHERE x.a < (SELECT AVG(a) FROM (SELECT AVG(score) AS a FROM rounds GROUP BY player_id))
       ORDER BY x.a, p.name;`,
    ],
    mistakes: [
      // Compares with the average of all rounds, which weights busy players more: Hamish Craig drops out.
      `WITH pa AS (SELECT player_id, AVG(score) AS a FROM rounds GROUP BY player_id)
       SELECT p.name, ROUND(pa.a, 1) FROM pa JOIN players p ON p.player_id = pa.player_id
       WHERE pa.a < (SELECT AVG(score) FROM rounds) ORDER BY pa.a, p.name;`,
      `WITH pa AS (SELECT player_id, AVG(score) AS a FROM rounds GROUP BY player_id)
       SELECT p.name, ROUND(pa.a, 1) FROM pa JOIN players p ON p.player_id = pa.player_id
       WHERE pa.a < (SELECT AVG(a) FROM pa) ORDER BY p.name;`,
      // Wrong join type: players LEFT JOIN the CTE brings in members with no rounds, and the NULL comparison
      // is written to keep them.
      `WITH pa AS (SELECT player_id, AVG(score) AS a FROM rounds GROUP BY player_id)
       SELECT p.name, ROUND(pa.a, 1) FROM players p LEFT JOIN pa ON pa.player_id = p.player_id
       WHERE pa.a IS NULL OR pa.a < (SELECT AVG(a) FROM pa) ORDER BY pa.a, p.name;`,
    ],
  },
  {
    id: 'chained-ctes',
    title: 'Course management: chaining CTEs',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>One <code>WITH</code> can define several CTEs, separated by commas, and each can read the ones before it.
      That turns a multi-step question into a pipeline you can read and test step by step:</p>
      <pre>WITH country_par AS (
  SELECT country, AVG(par) AS avg_par
  FROM courses
  GROUP BY country
),
long_courses AS (
  SELECT c.name, c.country
  FROM courses AS c
  INNER JOIN country_par AS cp ON cp.country = c.country
  WHERE c.par &gt;= cp.avg_par
)
SELECT *
FROM long_courses;</pre>`,
    interview: `For a three-step question, sketch the pipeline before writing SQL: "step 1, the average per course; step
      2, flag each round against its course's average; step 3, roll up per player." Interviewers often stop you after
      the plan and ask for just one step. Named CTEs make that easy, and they make debugging easy when a number looks
      off.`,
    yardage: `A course's average score comes from its rounds. Rounds link to courses by <code>course_id</code> and to
      players by <code>player_id</code>.`,
    task: `Who plays their courses best? A round <strong>beats the course</strong> when its score is lower than the
      average score of all rounds at that same course. For each player with <strong>at least 3 rounds</strong>, return
      four columns in this order: <code>name</code>, their number of rounds, how many of those rounds beat the course,
      and that as a <strong>percentage rounded to 1 decimal</strong>. Sort by the percentage, highest first, then by
      name.`,
    solution: `WITH course_avg AS (
  SELECT course_id, AVG(score) AS avg_score
  FROM rounds
  GROUP BY course_id
),
round_flags AS (
  SELECT
    r.player_id,
    CASE WHEN r.score < ca.avg_score THEN 1 ELSE 0 END AS beat_course
  FROM rounds AS r
  INNER JOIN course_avg AS ca ON ca.course_id = r.course_id
),
player_stats AS (
  SELECT
    player_id,
    COUNT(*) AS rounds_played,
    SUM(beat_course) AS rounds_beating_course
  FROM round_flags
  GROUP BY player_id
  HAVING COUNT(*) >= 3
)
SELECT
  p.name,
  ps.rounds_played,
  ps.rounds_beating_course,
  ROUND(100.0 * ps.rounds_beating_course / ps.rounds_played, 1)
    AS pct_beating_course
FROM player_stats AS ps
INNER JOIN players AS p ON p.player_id = ps.player_id
ORDER BY pct_beating_course DESC, p.name ASC;`,
    hint: 'Three CTEs: <code>course_avg</code> (average per course), <code>round_flags</code> (1 when a round beats its '
      + 'course average), and <code>player_stats</code> (count and sum per player, <code>HAVING COUNT(*) &gt;= 3</code>). '
      + 'Use <code>100.0 *</code> to avoid integer division.',
    alternatives: [
      `WITH ca AS (SELECT course_id, AVG(score) AS a FROM rounds GROUP BY course_id)
       SELECT p.name, COUNT(*), SUM(r.score < ca.a), ROUND(AVG(r.score < ca.a) * 100, 1) AS pct
       FROM rounds r JOIN ca USING (course_id) JOIN players p USING (player_id)
       GROUP BY p.player_id HAVING COUNT(*) > 2 ORDER BY pct DESC, p.name;`,
    ],
    mistakes: [
      `WITH rf AS (SELECT player_id, CASE WHEN score < (SELECT AVG(score) FROM rounds) THEN 1 ELSE 0 END AS b FROM rounds),
       ps AS (SELECT player_id, COUNT(*) AS n, SUM(b) AS k FROM rf GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, n, k, ROUND(100.0 * k / n, 1) AS pct FROM ps JOIN players p ON p.player_id = ps.player_id
       ORDER BY pct DESC, p.name;`,
      `WITH ca AS (SELECT course_id, AVG(score) AS a FROM rounds GROUP BY course_id),
       rf AS (SELECT r.player_id, CASE WHEN r.score < ca.a THEN 1 ELSE 0 END AS b FROM rounds r JOIN ca ON ca.course_id = r.course_id),
       ps AS (SELECT player_id, COUNT(*) AS n, SUM(b) AS k FROM rf GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, n, k, 100 * k / n AS pct FROM ps JOIN players p ON p.player_id = ps.player_id ORDER BY pct DESC, p.name;`,
      `WITH ca AS (SELECT course_id, AVG(score) AS a FROM rounds GROUP BY course_id),
       rf AS (SELECT r.player_id, CASE WHEN r.score < ca.a THEN 1 ELSE 0 END AS b FROM rounds r JOIN ca ON ca.course_id = r.course_id),
       ps AS (SELECT player_id, COUNT(*) AS n, SUM(b) AS k FROM rf GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, n, k, ROUND(100.0 * k / n, 1) AS pct FROM players p LEFT JOIN ps ON ps.player_id = p.player_id
       ORDER BY pct DESC, p.name;`,
      `WITH ca AS (SELECT course_id, AVG(score) AS a FROM rounds GROUP BY course_id),
       rf AS (SELECT r.player_id, CASE WHEN r.score < ca.a THEN 1 ELSE 0 END AS b FROM rounds r JOIN ca ON ca.course_id = r.course_id),
       ps AS (SELECT player_id, COUNT(*) AS n, SUM(b) AS k FROM rf GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, n, k, ROUND(100.0 * k / n, 1) AS pct FROM ps JOIN players p ON p.player_id = ps.player_id
       ORDER BY pct DESC, p.name DESC;`,
    ],
  },
  {
    id: 'month-over-month',
    title: 'Month over month, without LAG',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>SQLite's <code>date()</code> function does calendar arithmetic with <strong>modifiers</strong>:
      <code>date('2026-05-01', '-1 month')</code> is <code>'2026-04-01'</code>, and <code>'+7 days'</code> or
      <code>'start of month'</code> work too. Wrap the result in <code>strftime</code> to reformat it.</p>
      <pre>SELECT played_on,
  date(played_on, 'start of month') AS month_start,
  strftime('%Y-%m', date(played_on, '+1 month')) AS next_month
FROM rounds;</pre>
      <p>To compare each month with the one before, build a monthly table (a CTE), then join it to
      <strong>itself</strong>, matching each month to the previous one. Use a <code>LEFT JOIN</code>: the first month
      has no previous month, and must not vanish.</p>`,
    interview: `Month-over-month change is one of the most-asked analytics questions. The modern answer uses
      <code>LAG()</code> (Window Functions, next tournament), but "do it without window functions" is a common
      follow-up, and the self-join is the answer. Mention the edge cases: the first period has no previous value, and a
      month with no rounds at all wouldn't appear in the monthly table.`,
    yardage: `<code>rounds.played_on</code> is ISO text (<code>YYYY-MM-DD</code>), March to August 2026. Every month in
      that span has rounds.`,
    task: `Show how busy the season was. For each month with rounds, return three columns in this order: the month as
      <code>YYYY-MM</code> text, the number of rounds that month, and the <strong>change</strong> from the previous month
      (this month's rounds minus last month's). The first month has no previous month, so its change is
      <code>NULL</code>. Sort by month, earliest first.`,
    solution: `WITH monthly AS (
  SELECT
    strftime('%Y-%m', played_on) AS month,
    COUNT(*) AS rounds_played
  FROM rounds
  GROUP BY month
)
SELECT
  cur.month,
  cur.rounds_played,
  cur.rounds_played - prev.rounds_played AS change_from_previous
FROM monthly AS cur
LEFT JOIN monthly AS prev
  ON prev.month = strftime('%Y-%m', date(cur.month || '-01', '-1 month'))
ORDER BY cur.month ASC;`,
    hint: 'CTE: rounds per <code>strftime(\'%Y-%m\', played_on)</code>. Then <code>monthly AS cur LEFT JOIN monthly AS prev</code> '
      + 'on <code>prev.month = strftime(\'%Y-%m\', date(cur.month || \'-01\', \'-1 month\'))</code>.',
    alternatives: [
      `WITH m AS (SELECT substr(played_on, 1, 7) AS mon, COUNT(*) AS n FROM rounds GROUP BY mon)
       SELECT a.mon, a.n, a.n - (SELECT b.n FROM m b WHERE b.mon = strftime('%Y-%m', a.mon || '-01', '-1 month'))
       FROM m a ORDER BY a.mon;`,
    ],
    mistakes: [
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month)
       SELECT cur.month, cur.n, cur.n - prev.n FROM m cur
       INNER JOIN m prev ON prev.month = strftime('%Y-%m', date(cur.month || '-01', '-1 month')) ORDER BY cur.month;`,
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month)
       SELECT cur.month, cur.n, cur.n - prev.n FROM m cur LEFT JOIN m prev ON prev.month = cur.month - 1 ORDER BY cur.month;`,
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month)
       SELECT cur.month, cur.n, prev.n - cur.n FROM m cur
       LEFT JOIN m prev ON prev.month = strftime('%Y-%m', date(cur.month || '-01', '-1 month')) ORDER BY cur.month;`,
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month)
       SELECT cur.month, cur.n, cur.n - prev.n FROM m cur
       LEFT JOIN m prev ON prev.month = strftime('%Y-%m', date(cur.month || '-01', '-1 month')) ORDER BY cur.month DESC;`,
    ],
  },
  {
    id: 'second-highest',
    title: 'Runner-up: the second-highest score',
    difficulty: 'hard',
    lesson: `
      <p>"Find the second-highest value" is an interview classic, and the obvious answer is subtly wrong. With
      duplicates, <code>ORDER BY x DESC LIMIT 1 OFFSET 1</code> returns the second <em>row</em>, which may just be a
      tie for first.</p>
      <p>Two correct approaches without window functions:</p>
      <pre>-- 1. The largest value below the maximum
SELECT MAX(yardage)
FROM courses
WHERE yardage &lt; (
  SELECT MAX(yardage)
  FROM courses
);

-- 2. Skip over DISTINCT values, not rows
SELECT DISTINCT yardage
FROM courses
ORDER BY yardage DESC
LIMIT 1 OFFSET 1;</pre>`,
    interview: `This question exists to test duplicates and emptiness. Ask: "second-highest distinct value, or second
      row?" and "what if there's only one value?" (the <code>MAX</code> version returns NULL, the
      <code>OFFSET</code> version returns no row). Then generalize: <code>OFFSET n - 1</code> over distinct values
      gives the nth highest.`,
    yardage: `<code>rounds.score</code> has plenty of ties, including at the very top. Names are in
      <code>players</code>.`,
    task: `Find the rounds with the <strong>second-highest distinct score</strong> (the highest score that is lower than
      the overall highest). Return three columns in this order: <code>round_id</code>, the player's <code>name</code>,
      and <code>score</code>.`,
    solution: `SELECT r.round_id, p.name, r.score
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE r.score = (
  SELECT MAX(score)
  FROM rounds
  WHERE score < (
    SELECT MAX(score)
    FROM rounds
  )
);`,
    hint: 'The second-highest distinct score is <code>(SELECT MAX(score) FROM rounds WHERE score &lt; (SELECT MAX(score) FROM rounds))</code>. '
      + 'Keep the rounds with that score and join <code>players</code> for the name.',
    alternatives: [
      `SELECT r.round_id, p.name, r.score FROM rounds r JOIN players p USING (player_id)
         WHERE r.score = (SELECT DISTINCT score FROM rounds ORDER BY score DESC LIMIT 1 OFFSET 1);`,
    ],
    mistakes: [
      `SELECT r.round_id, p.name, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE r.score = (SELECT score FROM rounds ORDER BY score DESC LIMIT 1 OFFSET 1);`,
      `SELECT r.round_id, p.name, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         ORDER BY r.score DESC LIMIT 1 OFFSET 1;`,
      // Wrong join type: players LEFT JOIN rounds with the filter in ON lists every player.
      `SELECT r.round_id, p.name, r.score FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id
         AND r.score = (SELECT MAX(score) FROM rounds WHERE score < (SELECT MAX(score) FROM rounds));`,
    ],
  },
  {
    id: 'most-improved',
    title: 'Most improved: first round vs latest',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>The capstone combines everything on this course. The shape is common: find each entity's
      <strong>first</strong> and <strong>latest</strong> event, then compare them.</p>
      <ol>
        <li>A CTE finds each player's first and latest <em>dates</em> with <code>MIN</code> and <code>MAX</code>.</li>
        <li>Join <code>rounds</code> back <strong>twice</strong> (two aliases) to fetch the score on each of those
        dates.</li>
        <li><code>CASE</code> labels the trend.</li>
      </ol>
      <pre>-- Step 1, but per course:
-- first and latest round dates
SELECT
  course_id,
  MIN(played_on) AS first_day,
  MAX(played_on) AS latest_day
FROM rounds
GROUP BY course_id;</pre>
      <p>Careful: <code>MIN(score)</code> is a player's <em>best</em> score, not their <em>first</em> one. To get a
      value from a specific row, find the row first (by date), then read its score.</p>`,
    interview: `"First vs latest" (a customer's first and most recent order, a user's first and latest session) comes up
      constantly. The classic wrong answer mixes up "earliest" with "smallest". Say explicitly that you're locating rows
      by date and then reading their values, and ask how ties on the same date should be handled. (There are none here:
      no player played twice on one day.)`,
    yardage: `<code>rounds.played_on</code> orders a player's rounds, and no player has two rounds on the same date. Names
      are in <code>players</code>.`,
    task: `Who improved most? For each player with <strong>at least 3 rounds</strong>, compare their
      <strong>first</strong> round (earliest <code>played_on</code>) with their <strong>latest</strong>. Return five
      columns in this order: <code>name</code>, first score, latest score, the change (latest minus first), and a trend
      of <code>'Improved'</code> (latest is lower), <code>'Worse'</code> (latest is higher), or <code>'Same'</code>.
      Sort by the change, most improved (most negative) first, then by name.`,
    solution: `WITH span AS (
  SELECT
    player_id,
    MIN(played_on) AS first_day,
    MAX(played_on) AS latest_day
  FROM rounds
  GROUP BY player_id
  HAVING COUNT(*) >= 3
)
SELECT
  p.name,
  first_round.score AS first_score,
  latest_round.score AS latest_score,
  latest_round.score - first_round.score AS change,
  CASE
    WHEN latest_round.score < first_round.score THEN 'Improved'
    WHEN latest_round.score > first_round.score THEN 'Worse'
    ELSE 'Same'
  END AS trend
FROM span AS s
INNER JOIN players AS p ON p.player_id = s.player_id
INNER JOIN rounds AS first_round
  ON first_round.player_id = s.player_id
  AND first_round.played_on = s.first_day
INNER JOIN rounds AS latest_round
  ON latest_round.player_id = s.player_id
  AND latest_round.played_on = s.latest_day
ORDER BY change ASC, p.name ASC;`,
    hint: 'CTE: <code>MIN(played_on)</code> and <code>MAX(played_on)</code> per player with <code>HAVING COUNT(*) &gt;= 3</code>. '
      + 'Then join <code>rounds</code> twice, once on each date, and label the difference with <code>CASE</code>.',
    alternatives: [
      `SELECT p.name,
         (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on LIMIT 1) AS f,
         (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on DESC LIMIT 1) AS l,
         (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on DESC LIMIT 1)
           - (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on LIMIT 1) AS d,
         CASE WHEN (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on DESC LIMIT 1)
                 < (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on LIMIT 1) THEN 'Improved'
              WHEN (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on DESC LIMIT 1)
                 > (SELECT score FROM rounds r WHERE r.player_id = p.player_id ORDER BY played_on LIMIT 1) THEN 'Worse'
              ELSE 'Same' END
       FROM players p WHERE (SELECT COUNT(*) FROM rounds r WHERE r.player_id = p.player_id) >= 3
       ORDER BY d, p.name;`,
    ],
    mistakes: [
      // "First" and "latest" confused with worst and best scores.
      `SELECT p.name, MAX(r.score), MIN(r.score), MIN(r.score) - MAX(r.score) AS d,
         CASE WHEN MIN(r.score) < MAX(r.score) THEN 'Improved' WHEN MIN(r.score) > MAX(r.score) THEN 'Worse' ELSE 'Same' END
       FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.player_id HAVING COUNT(*) >= 3 ORDER BY d, p.name;`,
      // Wrong join type: every player LEFT JOINed to the span, so players with fewer than 3 rounds appear with NULLs.
      `WITH s AS (SELECT player_id, MIN(played_on) AS f, MAX(played_on) AS l FROM rounds GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, fr.score, lr.score, lr.score - fr.score AS d,
         CASE WHEN lr.score < fr.score THEN 'Improved' WHEN lr.score > fr.score THEN 'Worse' ELSE 'Same' END
       FROM players p LEFT JOIN s ON s.player_id = p.player_id
       LEFT JOIN rounds fr ON fr.player_id = s.player_id AND fr.played_on = s.f
       LEFT JOIN rounds lr ON lr.player_id = s.player_id AND lr.played_on = s.l ORDER BY d, p.name;`,
      `WITH s AS (SELECT player_id, MIN(played_on) AS f, MAX(played_on) AS l FROM rounds GROUP BY player_id HAVING COUNT(*) >= 3)
       SELECT p.name, fr.score, lr.score, lr.score - fr.score AS d,
         CASE WHEN lr.score < fr.score THEN 'Improved' WHEN lr.score > fr.score THEN 'Worse' ELSE 'Same' END
       FROM s JOIN players p ON p.player_id = s.player_id
       JOIN rounds fr ON fr.player_id = s.player_id AND fr.played_on = s.f
       JOIN rounds lr ON lr.player_id = s.player_id AND lr.played_on = s.l ORDER BY d DESC, p.name;`,
    ],
  },
];
