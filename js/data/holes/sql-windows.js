// Holes for the "Window Functions" tournament (The Leaderboard Invitational), in play order (hole 1 first).
// Builds on SQL Basics and Joins & Subqueries: joins, GROUP BY, CASE, subqueries, and CTEs are assumed, and the
// lessons point back to the window-free answers learned there (T2's month-over-month self-join, "first vs latest").
//
// Difficulty ramp: holes 1-6 introduce one window idea each (numbering, ranking, ties, partitions, group averages,
// share of total) and are easy (Par 1). Holes 7-11 cover running totals and LAG/LEAD (medium), and 12-18 are
// interview-style questions (hard): top N per group, moving averages, quartiles, frames, deduplication, streaks,
// and a month-over-month rank change. See js/data/par-config.js.
//
// Hole fields are documented at the top of js/data/holes/sql-basics.js. Every ordering a window depends on has a
// tie-breaker in the task (or is tie-free by design: no player played twice on one day), and tests re-run every
// solution with SQLite's scan order reversed to prove the expected result doesn't depend on it. Every solution
// that uses PARTITION BY declares a mistake without it, and every join hole declares a LEFT vs INNER mistake.

export default [
  {
    id: 'row-number',
    title: 'Number the card: ROW_NUMBER',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>Every query so far has either kept rows as they are or collapsed them with <code>GROUP BY</code>. A
      <strong>window function</strong> does neither: it computes a value from a set of related rows (the
      <em>window</em>) and writes it on <em>every</em> row. Nothing collapses.</p>
      <p>The <code>OVER (...)</code> clause turns a function into a window function and says how to look at the rows.
      The simplest one, <code>ROW_NUMBER()</code>, numbers rows 1, 2, 3… in the order given inside
      <code>OVER</code>:</p>
      <pre>SELECT
  name,
  handicap,
  ROW_NUMBER() OVER (ORDER BY handicap) AS handicap_order
FROM players
WHERE handicap IS NOT NULL;</pre>
      <p>Two different <code>ORDER BY</code>s can appear in one query. The one inside <code>OVER</code> decides how
      the numbers are handed out; the one at the end decides how the result is displayed. They are independent.</p>
      <p><code>ROW_NUMBER</code> never repeats a number, so when two rows tie on the ordering column, which one gets
      the lower number is arbitrary. Add a tie-breaker column whenever ties are possible.</p>`,
    interview: `Window functions are the dividing line in most SQL screens: interviewers use them to tell candidates
      who learned SQL from tutorials from those who use it at work. Say what the window is out loud ("numbered by date,
      across all of her rounds"), and mention the tie-breaker before you're asked about ties.`,
    yardage: `<code>rounds</code> has one row per round: <code>player_id</code>, <code>played_on</code> (ISO text,
      <code>YYYY-MM-DD</code>, so it sorts by date), and <code>score</code>. Mina Park is <code>player_id = 12</code>.`,
    task: `Number Mina Park's rounds (<code>player_id = 12</code>) in the order she played them: her earliest round is
      number 1. She never played twice on the same day. Return three columns in this order: <code>played_on</code>,
      <code>score</code>, and the round number. Sort by the round number.`,
    solution: `SELECT
  played_on,
  score,
  ROW_NUMBER() OVER (ORDER BY played_on) AS round_number
FROM rounds
WHERE player_id = 12
ORDER BY round_number;`,
    hint: 'Add <code>ROW_NUMBER() OVER (ORDER BY played_on) AS round_number</code> to the <code>SELECT</code>, '
      + 'filter on <code>player_id = 12</code>, and sort by <code>round_number</code>.',
    alternatives: [
      `SELECT r.played_on, r.score, ROW_NUMBER() OVER (ORDER BY r.played_on, r.round_id)
         FROM rounds r JOIN players p USING (player_id) WHERE p.name = 'Mina Park' ORDER BY r.played_on;`,
    ],
    mistakes: [
      // Numbered by score instead of by date.
      `SELECT played_on, score, ROW_NUMBER() OVER (ORDER BY score) AS n FROM rounds WHERE player_id = 12 ORDER BY n;`,
      // No ORDER BY inside OVER: numbers follow the table's storage order, not the calendar.
      `SELECT played_on, score, ROW_NUMBER() OVER () AS n FROM rounds WHERE player_id = 12 ORDER BY n;`,
      // GROUP BY instead of a window: every group is one row, so every count is 1.
      `SELECT played_on, score, COUNT(*) FROM rounds WHERE player_id = 12 GROUP BY played_on ORDER BY played_on;`,
      // Right numbers, wrong display order.
      `SELECT played_on, score, ROW_NUMBER() OVER (ORDER BY played_on) AS n FROM rounds WHERE player_id = 12
         ORDER BY score;`,
    ],
  },
  {
    id: 'rank-ties',
    title: 'Tied on the leaderboard: RANK',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>A golf leaderboard doesn't number players 1, 2, 3 when two of them shoot the same score. They share a
      position, and the next position is skipped: two players tied for first means the next player is third. That's
      <code>RANK()</code>.</p>
      <pre>SELECT
  round_id,
  putts,
  RANK() OVER (ORDER BY putts) AS putting_rank
FROM rounds
WHERE player_id = 3;</pre>
      <p>Compared with <code>ROW_NUMBER()</code>: rows that tie on the <code>OVER</code> ordering get the same rank,
      and the rank after a tie jumps by the number of tied rows (1, 1, 3). Because ties share a rank, the result is
      the same however the database happens to order tied rows, so <code>RANK</code> needs no tie-breaker.</p>`,
    interview: `"What's the difference between ROW_NUMBER, RANK, and DENSE_RANK?" is one of the most common SQL
      interview questions, often asked without any code. Answer with a three-row example with a tie: ROW_NUMBER gives
      1, 2, 3; RANK gives 1, 1, 3; DENSE_RANK gives 1, 1, 2.`,
    yardage: `Old Links is <code>course_id = 2</code> in <code>rounds</code>. Lower <code>score</code> is better.`,
    task: `Build the Old Links leaderboard. Rank every round played at Old Links (<code>course_id = 2</code>) by
      <code>score</code>, lowest first. Tied scores share a rank, and the next rank skips ahead (1, 1, 3). Return three
      columns in this order: <code>round_id</code>, <code>score</code>, and the rank. Sort by the rank, then by
      <code>round_id</code>.`,
    solution: `SELECT
  round_id,
  score,
  RANK() OVER (ORDER BY score) AS score_rank
FROM rounds
WHERE course_id = 2
ORDER BY score_rank, round_id;`,
    hint: 'Use <code>RANK() OVER (ORDER BY score)</code>, filter on <code>course_id = 2</code>, and sort by the rank '
      + 'then <code>round_id</code>.',
    alternatives: [
      // Rank = 1 + the number of rounds there with a strictly better score.
      `SELECT r.round_id, r.score,
         1 + (SELECT COUNT(*) FROM rounds r2 WHERE r2.course_id = 2 AND r2.score < r.score) AS rk
       FROM rounds r WHERE r.course_id = 2 ORDER BY rk, r.round_id;`,
    ],
    mistakes: [
      `SELECT round_id, score, ROW_NUMBER() OVER (ORDER BY score, round_id) AS rk FROM rounds WHERE course_id = 2
         ORDER BY rk, round_id;`,
      `SELECT round_id, score, DENSE_RANK() OVER (ORDER BY score) AS rk FROM rounds WHERE course_id = 2
         ORDER BY rk, round_id;`,
      `SELECT round_id, score, RANK() OVER (ORDER BY score DESC) AS rk FROM rounds WHERE course_id = 2
         ORDER BY rk, round_id;`,
      `SELECT round_id, score, RANK() OVER (ORDER BY score) AS rk FROM rounds WHERE course_id = 2
         ORDER BY round_id;`,
    ],
  },
  {
    id: 'dense-rank',
    title: 'Two boards: RANK vs DENSE_RANK',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p><code>DENSE_RANK()</code> also gives tied rows the same rank, but it never skips: after two rounds tied for
      first, the next round is second. It counts <em>distinct values</em> ahead of you rather than rows.</p>
      <pre>putts  ROW_NUMBER  RANK  DENSE_RANK
27     1           1     1
27     2           1     1
29     3           3     2
30     4           4     3</pre>
      <pre>SELECT
  round_id,
  putts,
  RANK() OVER (ORDER BY putts) AS position,
  DENSE_RANK() OVER (ORDER BY putts) AS putts_level
FROM rounds
WHERE player_id = 9;</pre>
      <p>Which one is right depends on the question. "Position on the leaderboard" is <code>RANK</code>. "The second
      best <em>score</em>", where ties shouldn't use up a place, is <code>DENSE_RANK</code>. One query can hold as
      many window functions as you like, each with its own <code>OVER</code>.</p>`,
    interview: `The follow-up to "explain the three" is usually "find the Nth highest salary". That's DENSE_RANK = N:
      it counts distinct salaries, so a tie for first doesn't make second place disappear. In Joins &amp; Subqueries you
      solved "second-highest" with a subquery; DENSE_RANK generalizes it to any N.`,
    yardage: `Sakura Hills is <code>course_id = 4</code> in <code>rounds</code>. Lower <code>score</code> is better.`,
    task: `Show both boards for Sakura Hills (<code>course_id = 4</code>). For every round played there, return four
      columns in this order: <code>round_id</code>, <code>score</code>, its <code>RANK</code> by score (lowest = 1,
      ties share a rank and the next rank skips), and its <code>DENSE_RANK</code> by score (ties share a rank, no
      gaps). Sort by <code>score</code>, then by <code>round_id</code>.`,
    solution: `SELECT
  round_id,
  score,
  RANK() OVER (ORDER BY score) AS score_rank,
  DENSE_RANK() OVER (ORDER BY score) AS score_level
FROM rounds
WHERE course_id = 4
ORDER BY score, round_id;`,
    hint: 'Two window functions in one <code>SELECT</code>: <code>RANK() OVER (ORDER BY score)</code> and '
      + '<code>DENSE_RANK() OVER (ORDER BY score)</code>.',
    alternatives: [
      `SELECT r.round_id, r.score,
         (SELECT COUNT(*) FROM rounds x WHERE x.course_id = 4 AND x.score < r.score) + 1,
         (SELECT COUNT(DISTINCT x.score) FROM rounds x WHERE x.course_id = 4 AND x.score < r.score) + 1
       FROM rounds r WHERE r.course_id = 4 ORDER BY 2, 1;`,
    ],
    mistakes: [
      // RANK where DENSE_RANK was asked.
      `SELECT round_id, score, RANK() OVER (ORDER BY score), RANK() OVER (ORDER BY score) FROM rounds
         WHERE course_id = 4 ORDER BY score, round_id;`,
      // The two columns swapped.
      `SELECT round_id, score, DENSE_RANK() OVER (ORDER BY score), RANK() OVER (ORDER BY score) FROM rounds
         WHERE course_id = 4 ORDER BY score, round_id;`,
      `SELECT round_id, score, ROW_NUMBER() OVER (ORDER BY score, round_id), DENSE_RANK() OVER (ORDER BY score)
         FROM rounds WHERE course_id = 4 ORDER BY score, round_id;`,
      `SELECT round_id, score, RANK() OVER (ORDER BY score), DENSE_RANK() OVER (ORDER BY score) FROM rounds
         WHERE course_id = 4 ORDER BY score DESC, round_id;`,
    ],
  },
  {
    id: 'partition-by',
    title: 'Personal bests: PARTITION BY',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>So far each window has been the whole result. <code>PARTITION BY</code> splits the rows into groups, and the
      window function starts over in each one. It's the window version of <code>GROUP BY</code>, except the rows
      stay.</p>
      <pre>-- Each round's place among rounds at the same course
SELECT
  course_id,
  round_id,
  putts,
  RANK() OVER (PARTITION BY course_id ORDER BY putts) AS course_rank
FROM rounds;</pre>
      <p>Read the <code>OVER</code> clause as a sentence: "rank by putts, separately for each course". Inside one
      <code>OVER</code>, <code>PARTITION BY</code> comes first and <code>ORDER BY</code> second.</p>
      <p>Window functions are computed <strong>after</strong> <code>WHERE</code> (and after <code>GROUP BY</code>),
      so a <code>WHERE</code> filter decides which rows are in the windows at all.</p>`,
    interview: `Almost every window question in an interview is "per something": per user, per department, per
      product. Listen for the "per" or "within each" in the question and put it in PARTITION BY. Forgetting it is the
      single most common window-function bug, and it still returns rows, so it's easy to miss.`,
    yardage: `<code>players.country</code> is text such as <code>'Scotland'</code>. Join <code>rounds.player_id</code>
      to <code>players.player_id</code> for names.`,
    task: `Rank each Scottish player's rounds against their <strong>own</strong> other rounds. For every round by a
      player whose <code>country</code> is <code>'Scotland'</code>, return four columns in this order: the player's
      <code>name</code>, <code>played_on</code>, <code>score</code>, and the round's rank among that player's rounds
      (<code>RANK</code>, lowest score = 1, ties share a rank). Sort by name, then by the rank, then by
      <code>played_on</code>.`,
    solution: `SELECT
  p.name,
  r.played_on,
  r.score,
  RANK() OVER (PARTITION BY p.player_id ORDER BY r.score) AS personal_rank
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE p.country = 'Scotland'
ORDER BY p.name, personal_rank, r.played_on;`,
    hint: 'Join <code>rounds</code> to <code>players</code>, filter on <code>country</code>, and use '
      + '<code>RANK() OVER (PARTITION BY p.player_id ORDER BY r.score)</code>.',
    alternatives: [
      `SELECT p.name, r.played_on, r.score, RANK() OVER (PARTITION BY p.name ORDER BY r.score) AS rk
         FROM players p JOIN rounds r USING (player_id) WHERE p.country = 'Scotland' ORDER BY 1, 4, 2;`,
    ],
    mistakes: [
      // No PARTITION BY: both players' rounds ranked together.
      `SELECT p.name, r.played_on, r.score, RANK() OVER (ORDER BY r.score) AS rk FROM rounds r
         JOIN players p ON p.player_id = r.player_id WHERE p.country = 'Scotland' ORDER BY p.name, rk, r.played_on;`,
      // ROW_NUMBER: a player's tied rounds get different numbers.
      `SELECT p.name, r.played_on, r.score, ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY r.score, r.played_on)
         AS rk FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.country = 'Scotland'
         ORDER BY p.name, rk, r.played_on;`,
      // Wrong join type: the country filter in a LEFT JOIN's ON keeps every round, with NULL names.
      `SELECT p.name, r.played_on, r.score, RANK() OVER (PARTITION BY p.player_id ORDER BY r.score) AS rk
         FROM rounds r LEFT JOIN players p ON p.player_id = r.player_id AND p.country = 'Scotland'
         ORDER BY p.name, rk, r.played_on;`,
      `SELECT p.name, r.played_on, r.score, RANK() OVER (PARTITION BY p.player_id ORDER BY r.score) AS rk
         FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.country = 'Scotland'
         ORDER BY p.name, r.played_on;`,
    ],
  },
  {
    id: 'avg-over',
    title: 'Against your own average: AVG() OVER',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>Aggregate functions work as window functions too. <code>AVG(score) OVER (PARTITION BY player_id)</code> is
      the player's average, written next to every one of their rounds, so each round can be compared with it on the
      same row. Without windows, this took a subquery or a join back to a grouped table.</p>
      <pre>-- Each round's putts next to the course's average putts
SELECT
  course_id,
  round_id,
  putts,
  ROUND(AVG(putts) OVER (PARTITION BY course_id), 2) AS course_avg_putts
FROM rounds;</pre>
      <p>Watch what you put inside <code>OVER</code>. With only <code>PARTITION BY</code>, the window is the whole
      partition. Add an <code>ORDER BY</code> and an aggregate becomes a <em>running</em> aggregate (from the first
      row up to the current one), which is a different number. You'll use that on purpose in hole 7.</p>`,
    interview: `"Show each employee's salary next to their department's average" is the textbook window question.
      Say why GROUP BY alone can't do it (it returns one row per department, and you need every employee), then show
      AVG() OVER (PARTITION BY ...). Bonus points for mentioning the subquery or join you'd need without windows.`,
    yardage: `Kenji Sato and Mina Park are in <code>players</code>; join on <code>player_id</code>.
      <code>rounds.score</code> is an integer, and <code>AVG</code> returns a decimal.`,
    task: `Compare each of Kenji Sato's and Mina Park's rounds with that player's own season average. Return five
      columns in this order: <code>name</code>, <code>played_on</code>, <code>score</code>, the player's average score
      over <strong>all</strong> their rounds rounded to 2 decimals, and the round's score minus that average, rounded
      to 2 decimals (negative means better than usual). Sort by name, then by <code>played_on</code>.`,
    solution: `SELECT
  p.name,
  r.played_on,
  r.score,
  ROUND(AVG(r.score) OVER (PARTITION BY p.player_id), 2) AS player_avg,
  ROUND(r.score - AVG(r.score) OVER (PARTITION BY p.player_id), 2) AS vs_avg
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE p.name IN ('Kenji Sato', 'Mina Park')
ORDER BY p.name, r.played_on;`,
    hint: '<code>AVG(r.score) OVER (PARTITION BY p.player_id)</code> is the player\'s average on every row. Round it '
      + 'for one column, and subtract it from <code>r.score</code> for the other.',
    alternatives: [
      `SELECT p.name, r.played_on, r.score, ROUND(a.avg_score, 2), ROUND(r.score - a.avg_score, 2)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       JOIN (SELECT player_id, AVG(score) AS avg_score FROM rounds GROUP BY player_id) a ON a.player_id = r.player_id
       WHERE p.name IN ('Kenji Sato', 'Mina Park') ORDER BY 1, 2;`,
    ],
    mistakes: [
      // No PARTITION BY: one average across both players.
      `SELECT p.name, r.played_on, r.score, ROUND(AVG(r.score) OVER (), 2), ROUND(r.score - AVG(r.score) OVER (), 2)
         FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.name IN ('Kenji Sato', 'Mina Park')
         ORDER BY 1, 2;`,
      // ORDER BY inside OVER turns it into a running average.
      `SELECT p.name, r.played_on, r.score,
         ROUND(AVG(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on), 2),
         ROUND(r.score - AVG(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on), 2)
         FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.name IN ('Kenji Sato', 'Mina Park')
         ORDER BY 1, 2;`,
      // GROUP BY collapses each player to one row.
      `SELECT p.name, MAX(r.played_on), MAX(r.score), ROUND(AVG(r.score), 2), 0 FROM rounds r
         JOIN players p ON p.player_id = r.player_id WHERE p.name IN ('Kenji Sato', 'Mina Park') GROUP BY p.name;`,
      // Wrong join type: the name filter in a LEFT JOIN's ON keeps everyone's rounds.
      `SELECT p.name, r.played_on, r.score, ROUND(AVG(r.score) OVER (PARTITION BY p.player_id), 2),
         ROUND(r.score - AVG(r.score) OVER (PARTITION BY p.player_id), 2)
         FROM rounds r LEFT JOIN players p ON p.player_id = r.player_id AND p.name IN ('Kenji Sato', 'Mina Park')
         ORDER BY 1, 2;`,
      `SELECT p.name, r.played_on, r.score, ROUND(AVG(r.score) OVER (PARTITION BY p.player_id), 2),
         ROUND(r.score - AVG(r.score) OVER (PARTITION BY p.player_id), 2)
         FROM rounds r JOIN players p ON p.player_id = r.player_id WHERE p.name IN ('Kenji Sato', 'Mina Park')
         ORDER BY r.played_on;`,
    ],
  },
  {
    id: 'pct-of-total',
    title: 'Share of the field: SUM() OVER ()',
    difficulty: 'easy',
    orderMatters: true,
    lesson: `
      <p>An empty <code>OVER ()</code> makes the window the entire result. <code>SUM(x) OVER ()</code> is the grand
      total, written on every row, which is exactly what a "percent of total" needs.</p>
      <p>Window functions run <strong>after</strong> <code>GROUP BY</code>, so they can work on the grouped rows. That
      allows an aggregate <em>inside</em> a window function: <code>SUM(COUNT(*)) OVER ()</code> adds up the per-group
      counts.</p>
      <pre>-- Each weather type's share of all fairways hit
SELECT
  weather,
  SUM(fairways_hit) AS fairways,
  ROUND(
    100.0 * SUM(fairways_hit) / SUM(SUM(fairways_hit)) OVER (),
    1
  ) AS pct_of_fairways
FROM rounds
GROUP BY weather;</pre>
      <p>If the nesting reads awkwardly, group in a CTE first and apply <code>SUM(...) OVER ()</code> to the CTE's
      column. Same answer. And remember <code>100.0</code>, not <code>100</code>: integer division truncates.</p>`,
    interview: `"What share of revenue does each category contribute?" is a staple. Interviewers watch for the
      integer-division bug and for a hard-coded denominator. A grand total typed in as a number breaks the moment the
      data changes. SUM() OVER () keeps the total in the query.`,
    yardage: `Join <code>rounds.course_id</code> to <code>courses.course_id</code> for the course <code>name</code>.
      Every course name is unique.`,
    task: `For each course that has rounds, return three columns in this order: the course <code>name</code>, the
      number of rounds played there, and that number as a <strong>percentage of all rounds</strong>, rounded to 1
      decimal. Sort by the number of rounds, most first, then by course name.`,
    solution: `SELECT
  c.name,
  COUNT(*) AS rounds_played,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_rounds
FROM rounds AS r
INNER JOIN courses AS c ON c.course_id = r.course_id
GROUP BY c.course_id, c.name
ORDER BY rounds_played DESC, c.name;`,
    hint: 'Group by course and count. The percentage is <code>100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()</code>, '
      + 'rounded to 1 decimal.',
    alternatives: [
      `WITH per_course AS (
         SELECT c.name, COUNT(*) AS n FROM courses c JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name)
       SELECT name, n, ROUND(n * 100.0 / SUM(n) OVER (), 1) FROM per_course ORDER BY n DESC, name;`,
      `SELECT c.name, COUNT(*), ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM rounds), 1)
         FROM rounds r JOIN courses c ON c.course_id = r.course_id GROUP BY c.name ORDER BY 2 DESC, 1;`,
    ],
    mistakes: [
      // Integer division.
      `SELECT c.name, COUNT(*), ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) FROM rounds r
         JOIN courses c ON c.course_id = r.course_id GROUP BY c.name ORDER BY 2 DESC, 1;`,
      // PARTITION BY the group itself: every course is 100% of itself.
      `SELECT c.name, COUNT(*), ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY c.name), 1) FROM rounds r
         JOIN courses c ON c.course_id = r.course_id GROUP BY c.name ORDER BY 2 DESC, 1;`,
      // Wrong join type: a LEFT JOIN from courses adds Desert Mirage, counted as one round.
      `SELECT c.name, COUNT(*), ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) FROM courses c
         LEFT JOIN rounds r ON r.course_id = c.course_id GROUP BY c.name ORDER BY 2 DESC, 1;`,
      `SELECT c.name, COUNT(*), ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) FROM rounds r
         JOIN courses c ON c.course_id = r.course_id GROUP BY c.name ORDER BY 2 DESC, 1 DESC;`,
    ],
  },
  {
    id: 'running-total',
    title: 'Strokes to date: the running total',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>Put an <code>ORDER BY</code> inside <code>OVER</code> and an aggregate stops looking at the whole window: it
      sees only the rows from the start up to the current row. <code>SUM</code> becomes a running total,
      <code>COUNT</code> a running count, <code>AVG</code> a running average.</p>
      <pre>-- Kenji's putts, and his putts so far this season
SELECT
  played_on,
  putts,
  SUM(putts) OVER (ORDER BY played_on) AS putts_to_date
FROM rounds
WHERE player_id = 3;</pre>
      <p>The rows a window function sees for the current row are its <strong>frame</strong>. With an
      <code>ORDER BY</code> the default frame is "everything from the first row up to this one, <em>plus any rows that
      tie with it</em> on the ordering". If two rows share a date, both get the total including both. Order by
      something unique (add a tie-breaker), or spell the frame out with
      <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>, when that matters.</p>`,
    interview: `Running totals (cumulative revenue, sign-ups to date) are among the most common window questions. Name
      the order you're accumulating in, and mention the default frame: with duplicate ORDER BY values the running
      total jumps by the whole tie at once. Knowing that detail is a strong signal.`,
    yardage: `Ava Birdwell is <code>player_id = 1</code>. No player played twice on the same day, so
      <code>played_on</code> is unique within one player's rounds.`,
    task: `Track Ava Birdwell's season (<code>player_id = 1</code>). For each of her rounds, return three columns in
      this order: <code>played_on</code>, <code>score</code>, and her <strong>total strokes so far</strong> this
      season, including that round. Sort by <code>played_on</code>, earliest first.`,
    solution: `SELECT
  played_on,
  score,
  SUM(score) OVER (ORDER BY played_on) AS strokes_to_date
FROM rounds
WHERE player_id = 1
ORDER BY played_on;`,
    hint: '<code>SUM(score) OVER (ORDER BY played_on)</code> adds up every round from her first to the current one.',
    alternatives: [
      `SELECT played_on, score,
         SUM(score) OVER (ORDER BY played_on ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
       FROM rounds WHERE player_id = 1 ORDER BY played_on;`,
      `SELECT r.played_on, r.score,
         (SELECT SUM(x.score) FROM rounds x WHERE x.player_id = 1 AND x.played_on <= r.played_on)
       FROM rounds r WHERE r.player_id = 1 ORDER BY r.played_on;`,
    ],
    mistakes: [
      // No ORDER BY inside OVER: the season total on every row.
      `SELECT played_on, score, SUM(score) OVER () FROM rounds WHERE player_id = 1 ORDER BY played_on;`,
      // Accumulating in score order instead of date order.
      `SELECT played_on, score, SUM(score) OVER (ORDER BY score) FROM rounds WHERE player_id = 1 ORDER BY played_on;`,
      // GROUP BY instead of a window: each "total" is just that day's score.
      `SELECT played_on, score, SUM(score) FROM rounds WHERE player_id = 1 GROUP BY played_on ORDER BY played_on;`,
      `SELECT played_on, score, SUM(score) OVER (ORDER BY played_on) FROM rounds WHERE player_id = 1
         ORDER BY played_on DESC;`,
    ],
  },
  {
    id: 'running-total-per-player',
    title: 'Each card adds up: running totals per player',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>Combine the last two ideas. <code>PARTITION BY</code> restarts the running total for each group, and
      <code>ORDER BY</code> sets the order it accumulates in:</p>
      <pre>-- Rounds played at each course, counted up through the season
SELECT
  course_id,
  played_on,
  round_id,
  COUNT(*) OVER (
    PARTITION BY course_id
    ORDER BY played_on, round_id
  ) AS rounds_so_far
FROM rounds;</pre>
      <p>Long <code>OVER</code> clauses read better spread over a few lines, as above. The order inside does not
      change: <code>PARTITION BY</code>, then <code>ORDER BY</code>, then (later) the frame.</p>`,
    interview: `This is "cumulative spend per customer" or "running count of logins per user". The two classic bugs are
      both silent: drop PARTITION BY and the total runs across every customer; drop ORDER BY and every row shows the
      customer's grand total. Checking the first row of each group (should equal its own value) catches both.`,
    yardage: `Mateo Fairway and Sofia Rossi are in <code>players</code>. <code>rounds.fairways_hit</code> counts the
      fairways hit in a round. Neither player played twice on the same day.`,
    task: `Track fairways hit through the season for Mateo Fairway and Sofia Rossi, each separately. For every round
      either of them played, return four columns in this order: <code>name</code>, <code>played_on</code>,
      <code>fairways_hit</code>, and that player's total fairways hit so far this season, including that round. Sort
      by name, then by <code>played_on</code>.`,
    solution: `SELECT
  p.name,
  r.played_on,
  r.fairways_hit,
  SUM(r.fairways_hit) OVER (
    PARTITION BY p.player_id
    ORDER BY r.played_on
  ) AS fairways_to_date
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE p.name IN ('Mateo Fairway', 'Sofia Rossi')
ORDER BY p.name, r.played_on;`,
    hint: '<code>SUM(r.fairways_hit) OVER (PARTITION BY p.player_id ORDER BY r.played_on)</code>.',
    alternatives: [
      `SELECT p.name, r.played_on, r.fairways_hit,
         SUM(r.fairways_hit) OVER (PARTITION BY p.name ORDER BY r.played_on ROWS UNBOUNDED PRECEDING)
       FROM players p JOIN rounds r ON r.player_id = p.player_id
       WHERE p.player_id IN (2, 10) ORDER BY 1, 2;`,
    ],
    mistakes: [
      // No PARTITION BY: one running total across both players.
      `SELECT p.name, r.played_on, r.fairways_hit, SUM(r.fairways_hit) OVER (ORDER BY r.played_on)
         FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE p.name IN ('Mateo Fairway', 'Sofia Rossi') ORDER BY 1, 2;`,
      // No ORDER BY inside OVER: each player's season total on every row.
      `SELECT p.name, r.played_on, r.fairways_hit, SUM(r.fairways_hit) OVER (PARTITION BY p.player_id)
         FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE p.name IN ('Mateo Fairway', 'Sofia Rossi') ORDER BY 1, 2;`,
      // Wrong join type: the name filter in a LEFT JOIN's ON keeps everyone's rounds.
      `SELECT p.name, r.played_on, r.fairways_hit, SUM(r.fairways_hit) OVER (PARTITION BY p.player_id ORDER BY r.played_on)
         FROM rounds r LEFT JOIN players p ON p.player_id = r.player_id AND p.name IN ('Mateo Fairway', 'Sofia Rossi')
         ORDER BY 1, 2;`,
      `SELECT p.name, r.played_on, r.fairways_hit, SUM(r.fairways_hit) OVER (PARTITION BY p.player_id ORDER BY r.played_on)
         FROM rounds r JOIN players p ON p.player_id = r.player_id
         WHERE p.name IN ('Mateo Fairway', 'Sofia Rossi') ORDER BY r.played_on;`,
    ],
  },
  {
    id: 'lag',
    title: 'Days between rounds: LAG',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p><code>LAG(column)</code> reads a value from the <strong>previous</strong> row in the window's order. On the
      first row there is no previous row, so it returns <code>NULL</code>.</p>
      <pre>-- Each of Ava's rounds next to the course she played the round before
SELECT
  played_on,
  course_id,
  LAG(course_id) OVER (ORDER BY played_on) AS previous_course
FROM rounds
WHERE player_id = 1;</pre>
      <p><code>LAG</code> takes two optional arguments: how many rows back (<code>LAG(score, 2)</code>), and a default
      to use instead of <code>NULL</code> when there's no such row. Use a default only if the question asks for one; a
      first row usually has no "previous", and <code>NULL</code> says so honestly.</p>
      <p>Dates in SQLite are text. <code>julianday(d)</code> turns one into a day number, so subtracting two
      <code>julianday</code> values gives the days between them.</p>`,
    interview: `LAG is the modern answer to "compare each row with the one before": time between orders, session gaps,
      churn detection. In Joins &amp; Subqueries you did this with a self-join. Interviewers like to hear both, and why
      LAG is simpler: no join condition to get wrong, and no row multiplication.`,
    yardage: `Noah Greenfield is <code>player_id = 9</code>. <code>played_on</code> is ISO text; he never played twice
      on the same day.`,
    task: `How much rest does Noah Greenfield (<code>player_id = 9</code>) take between rounds? For each of his rounds,
      return three columns in this order: <code>played_on</code>, the date of his <strong>previous</strong> round, and
      the number of days since that previous round as a whole number. For his first round both are
      <code>NULL</code>. Sort by <code>played_on</code>, earliest first.`,
    solution: `SELECT
  played_on,
  LAG(played_on) OVER (ORDER BY played_on) AS previous_round,
  CAST(
    julianday(played_on)
      - julianday(LAG(played_on) OVER (ORDER BY played_on))
    AS INTEGER
  ) AS days_rest
FROM rounds
WHERE player_id = 9
ORDER BY played_on;`,
    hint: '<code>LAG(played_on) OVER (ORDER BY played_on)</code> is the previous date. Days between: '
      + '<code>julianday(played_on) - julianday(<em>that</em>)</code>.',
    alternatives: [
      `WITH g AS (SELECT played_on, LAG(played_on) OVER (ORDER BY played_on) AS prev FROM rounds WHERE player_id = 9)
       SELECT played_on, prev, julianday(played_on) - julianday(prev) FROM g ORDER BY played_on;`,
    ],
    mistakes: [
      // LEAD looks forward, not back.
      `SELECT played_on, LEAD(played_on) OVER (ORDER BY played_on),
         julianday(LEAD(played_on) OVER (ORDER BY played_on)) - julianday(played_on)
       FROM rounds WHERE player_id = 9 ORDER BY played_on;`,
      // No ORDER BY inside OVER: "previous" in storage order, not by date.
      `SELECT played_on, LAG(played_on) OVER (), julianday(played_on) - julianday(LAG(played_on) OVER ())
       FROM rounds WHERE player_id = 9 ORDER BY played_on;`,
      // A default of 0 days where the task wants NULL.
      `SELECT played_on, LAG(played_on) OVER (ORDER BY played_on),
         COALESCE(julianday(played_on) - julianday(LAG(played_on) OVER (ORDER BY played_on)), 0)
       FROM rounds WHERE player_id = 9 ORDER BY played_on;`,
      `SELECT played_on, LAG(played_on) OVER (ORDER BY played_on),
         julianday(played_on) - julianday(LAG(played_on) OVER (ORDER BY played_on))
       FROM rounds WHERE player_id = 9 ORDER BY played_on DESC;`,
    ],
  },
  {
    id: 'lead',
    title: 'What came next: LEAD',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p><code>LEAD</code> is <code>LAG</code> facing the other way: it reads from a <strong>later</strong> row. The
      last row has no next row, so it gets <code>NULL</code>. The optional second argument is the offset:
      <code>LEAD(x, 2)</code> looks two rows ahead.</p>
      <pre>-- After each of Mina's rounds: where did she play next?
SELECT
  played_on,
  course_id,
  LEAD(course_id) OVER (ORDER BY played_on) AS next_course,
  LEAD(played_on) OVER (ORDER BY played_on) AS next_date
FROM rounds
WHERE player_id = 12;</pre>
      <p>Which one to use is about where the answer belongs. "What happened after this?" puts the answer on the
      earlier row (<code>LEAD</code>); "what happened before this?" puts it on the later row (<code>LAG</code>).</p>`,
    interview: `LEAD answers "what did the user do next?" questions: the next page after checkout, the next purchase
      after a promotion. A good habit is to say which row the answer should sit on before choosing LAG or LEAD.`,
    yardage: `Priya Raman is <code>player_id = 6</code>. She never played twice on the same day.`,
    task: `Did Priya Raman (<code>player_id = 6</code>) follow a good round with another? For each of her rounds,
      return four columns in this order: <code>played_on</code>, <code>score</code>, the score of her
      <strong>next</strong> round, and the score of the round <strong>two</strong> rounds later. Use
      <code>NULL</code> where there is no such round. Sort by <code>played_on</code>, earliest first.`,
    solution: `SELECT
  played_on,
  score,
  LEAD(score) OVER (ORDER BY played_on) AS next_score,
  LEAD(score, 2) OVER (ORDER BY played_on) AS score_two_later
FROM rounds
WHERE player_id = 6
ORDER BY played_on;`,
    hint: '<code>LEAD(score) OVER (ORDER BY played_on)</code> and <code>LEAD(score, 2) OVER (ORDER BY played_on)</code>.',
    alternatives: [
      `SELECT played_on, score, LEAD(score, 1) OVER w, LEAD(score, 2, NULL) OVER w
         FROM rounds WHERE player_id = 6 WINDOW w AS (ORDER BY played_on) ORDER BY played_on;`,
    ],
    mistakes: [
      `SELECT played_on, score, LAG(score) OVER (ORDER BY played_on), LAG(score, 2) OVER (ORDER BY played_on)
         FROM rounds WHERE player_id = 6 ORDER BY played_on;`,
      // LEAD(score, 2) written as the next round's LEAD: still one row ahead.
      `SELECT played_on, score, LEAD(score) OVER (ORDER BY played_on), LEAD(score) OVER (ORDER BY played_on) + 0
         FROM rounds WHERE player_id = 6 ORDER BY played_on;`,
      // A default of 0 where the task wants NULL.
      `SELECT played_on, score, LEAD(score, 1, 0) OVER (ORDER BY played_on), LEAD(score, 2, 0) OVER (ORDER BY played_on)
         FROM rounds WHERE player_id = 6 ORDER BY played_on;`,
      `SELECT played_on, score, LEAD(score) OVER (ORDER BY played_on), LEAD(score, 2) OVER (ORDER BY played_on)
         FROM rounds WHERE player_id = 6 ORDER BY score;`,
    ],
  },
  {
    id: 'change-vs-previous',
    title: 'Month over month, with LAG',
    difficulty: 'medium',
    orderMatters: true,
    lesson: `
      <p>In Joins &amp; Subqueries you computed month-over-month change by joining a monthly table to itself. With
      <code>LAG</code>, the previous month is just the previous row. A clean shape is a chain of CTEs: one to
      aggregate, one to attach the previous value, and a final <code>SELECT</code> to do the arithmetic.</p>
      <pre>WITH weekly AS (
  SELECT
    strftime('%W', played_on) AS week,
    AVG(putts) AS avg_putts
  FROM rounds
  GROUP BY week
)
SELECT
  week,
  avg_putts,
  avg_putts - LAG(avg_putts) OVER (ORDER BY week) AS change
FROM weekly;</pre>
      <p>Percent change is <code>(current - previous) / previous</code>, times 100: divide by the
      <em>previous</em> value, the one you're changing from. Use <code>100.0</code> so the division isn't integer
      division. When the previous value is <code>NULL</code> (the first period), every arithmetic result is
      <code>NULL</code> too, which is correct: there's nothing to compare with.</p>`,
    interview: `Period-over-period growth is the most-asked analytics query of all. Three things to say: you divide by
      the earlier period, the first period is NULL (not 0, and not 100%), and a period with no data at all would be
      missing from the grouped table, so LAG would compare with the wrong period. (Every month here has rounds.)`,
    yardage: `<code>rounds.played_on</code> runs from March to August 2026, and every month in that span has rounds.
      <code>strftime('%Y-%m', played_on)</code> gives the month as text, which sorts in date order.`,
    task: `Redo the month-over-month report with <code>LAG</code>, and add growth. For each month with rounds, return
      four columns in this order: the month as <code>YYYY-MM</code> text, the number of rounds that month, the change
      from the previous month (this month minus last month), and the percent change from the previous month
      (change divided by last month's rounds, times 100) rounded to 1 decimal. For the first month, both the change
      and the percent change are <code>NULL</code>. Sort by month, earliest first.`,
    solution: `WITH monthly AS (
  SELECT
    strftime('%Y-%m', played_on) AS month,
    COUNT(*) AS rounds_played
  FROM rounds
  GROUP BY month
),
with_prev AS (
  SELECT
    month,
    rounds_played,
    LAG(rounds_played) OVER (ORDER BY month) AS prev_rounds
  FROM monthly
)
SELECT
  month,
  rounds_played,
  rounds_played - prev_rounds AS change,
  ROUND(100.0 * (rounds_played - prev_rounds) / prev_rounds, 1) AS pct_change
FROM with_prev
ORDER BY month;`,
    hint: 'CTE 1: rounds per month. CTE 2: add <code>LAG(rounds_played) OVER (ORDER BY month)</code>. Then '
      + '<code>ROUND(100.0 * (rounds_played - prev_rounds) / prev_rounds, 1)</code>.',
    alternatives: [
      `SELECT strftime('%Y-%m', played_on) AS m, COUNT(*),
         COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY strftime('%Y-%m', played_on)),
         ROUND((COUNT(*) * 1.0 / LAG(COUNT(*)) OVER (ORDER BY strftime('%Y-%m', played_on)) - 1) * 100, 1)
       FROM rounds GROUP BY m ORDER BY m;`,
    ],
    mistakes: [
      // Integer division.
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month),
       p AS (SELECT month, n, LAG(n) OVER (ORDER BY month) AS prev FROM m)
       SELECT month, n, n - prev, ROUND(100 * (n - prev) / prev, 1) FROM p ORDER BY month;`,
      // Divided by the current month instead of the previous one.
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month),
       p AS (SELECT month, n, LAG(n) OVER (ORDER BY month) AS prev FROM m)
       SELECT month, n, n - prev, ROUND(100.0 * (n - prev) / n, 1) FROM p ORDER BY month;`,
      // A first month of 0 instead of NULL.
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month),
       p AS (SELECT month, n, LAG(n, 1, n) OVER (ORDER BY month) AS prev FROM m)
       SELECT month, n, n - prev, ROUND(100.0 * (n - prev) / prev, 1) FROM p ORDER BY month;`,
      // LEAD: compares with the next month.
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month),
       p AS (SELECT month, n, LEAD(n) OVER (ORDER BY month) AS prev FROM m)
       SELECT month, n, n - prev, ROUND(100.0 * (n - prev) / prev, 1) FROM p ORDER BY month;`,
      `WITH m AS (SELECT strftime('%Y-%m', played_on) AS month, COUNT(*) AS n FROM rounds GROUP BY month),
       p AS (SELECT month, n, LAG(n) OVER (ORDER BY month) AS prev FROM m)
       SELECT month, n, n - prev, ROUND(100.0 * (n - prev) / prev, 1) FROM p ORDER BY month DESC;`,
    ],
  },
  {
    id: 'top-n-per-group',
    title: 'Top three at every course',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>"Top N per group" is the question window functions were made for. You can't filter on a window function in
      <code>WHERE</code>: windows are computed after <code>WHERE</code> runs, so
      <code>WHERE ROW_NUMBER() OVER (...) &lt;= 3</code> is an error. Number the rows in a CTE, then filter the
      CTE.</p>
      <pre>-- Each player's two highest-putt rounds
WITH numbered AS (
  SELECT
    player_id,
    round_id,
    putts,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY putts DESC, round_id
    ) AS rn
  FROM rounds
)
SELECT player_id, round_id, putts
FROM numbered
WHERE rn &lt;= 2;</pre>
      <p>Which numbering function you choose decides what happens at a tie on the boundary. <code>ROW_NUMBER</code>
      returns exactly N rows per group (so it needs a tie-breaker to decide who's in). <code>RANK</code> returns
      everyone tied at the boundary, so a group can return more than N. <code>DENSE_RANK</code> returns the top N
      <em>distinct values</em>, with all their rows.</p>`,
    interview: `"Top 3 products per category" or "highest-paid employee per department" is the single most common
      window-function interview question. Before writing anything, ask how ties should work. The three answers map to
      ROW_NUMBER, RANK, and DENSE_RANK, and asking is exactly what the interviewer hopes to see.`,
    yardage: `<code>rounds</code> joins <code>courses</code> on <code>course_id</code> and <code>players</code> on
      <code>player_id</code>. Some courses have tied scores around third place. Course names are unique.`,
    task: `Post the top three rounds at every course that has rounds: the three lowest scores at each course. If scores
      tie, the round played earlier ranks higher, and if the date ties too, the lower <code>round_id</code>. Each course
      shows exactly three rounds. Return five columns in this order: the course <code>name</code>, the position (1, 2,
      or 3), the player's <code>name</code>, <code>score</code>, and <code>played_on</code>. Sort by course name, then
      by position.`,
    solution: `WITH ranked AS (
  SELECT
    c.name AS course,
    p.name AS player,
    r.score,
    r.played_on,
    ROW_NUMBER() OVER (
      PARTITION BY r.course_id
      ORDER BY r.score, r.played_on, r.round_id
    ) AS position
  FROM rounds AS r
  INNER JOIN courses AS c ON c.course_id = r.course_id
  INNER JOIN players AS p ON p.player_id = r.player_id
)
SELECT course, position, player, score, played_on
FROM ranked
WHERE position <= 3
ORDER BY course, position;`,
    hint: 'In a CTE, <code>ROW_NUMBER() OVER (PARTITION BY r.course_id ORDER BY r.score, r.played_on, r.round_id)</code>. '
      + 'Then keep <code>WHERE position &lt;= 3</code>.',
    alternatives: [
      `SELECT * FROM (
         SELECT c.name, ROW_NUMBER() OVER (PARTITION BY c.name ORDER BY r.score, r.played_on, r.round_id) AS pos,
           p.name AS player, r.score, r.played_on
         FROM courses c JOIN rounds r ON r.course_id = c.course_id JOIN players p ON p.player_id = r.player_id
       ) WHERE pos <= 3 ORDER BY 1, 2;`,
    ],
    mistakes: [
      // RANK: ties at third place bring back extra rounds.
      `WITH x AS (SELECT c.name AS course, RANK() OVER (PARTITION BY r.course_id ORDER BY r.score) AS pos,
         p.name AS player, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
         JOIN players p ON p.player_id = r.player_id)
       SELECT * FROM x WHERE pos <= 3 ORDER BY course, pos, played_on;`,
      // No PARTITION BY: the top three overall.
      `WITH x AS (SELECT c.name AS course, ROW_NUMBER() OVER (ORDER BY r.score, r.played_on, r.round_id) AS pos,
         p.name AS player, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
         JOIN players p ON p.player_id = r.player_id)
       SELECT * FROM x WHERE pos <= 3 ORDER BY course, pos;`,
      // Filtering on the window function in WHERE is an error.
      `SELECT c.name, ROW_NUMBER() OVER (PARTITION BY r.course_id ORDER BY r.score) AS pos, p.name, r.score, r.played_on
         FROM rounds r JOIN courses c ON c.course_id = r.course_id JOIN players p ON p.player_id = r.player_id
         WHERE ROW_NUMBER() OVER (PARTITION BY r.course_id ORDER BY r.score) <= 3;`,
      // Wrong join type: a LEFT JOIN from courses adds Desert Mirage with an empty round.
      `WITH x AS (SELECT c.name AS course,
         ROW_NUMBER() OVER (PARTITION BY c.course_id ORDER BY r.score, r.played_on, r.round_id) AS pos,
         p.name AS player, r.score, r.played_on FROM courses c LEFT JOIN rounds r ON r.course_id = c.course_id
         LEFT JOIN players p ON p.player_id = r.player_id)
       SELECT * FROM x WHERE pos <= 3 ORDER BY course, pos;`,
      `WITH x AS (SELECT c.name AS course,
         ROW_NUMBER() OVER (PARTITION BY r.course_id ORDER BY r.score, r.played_on, r.round_id) AS pos,
         p.name AS player, r.score, r.played_on FROM rounds r JOIN courses c ON c.course_id = r.course_id
         JOIN players p ON p.player_id = r.player_id)
       SELECT * FROM x WHERE pos <= 3 ORDER BY course, pos DESC;`,
    ],
  },
  {
    id: 'moving-average',
    title: 'Current form: a three-round moving average',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>The <strong>frame</strong> clause sets exactly which rows, relative to the current one, an aggregate sees.
      It goes inside <code>OVER</code>, after <code>ORDER BY</code>:</p>
      <pre>-- Average putts over this round and the one before it
SELECT
  played_on,
  putts,
  AVG(putts) OVER (
    ORDER BY played_on
    ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
  ) AS two_round_putts
FROM rounds
WHERE player_id = 1;</pre>
      <p><code>ROWS BETWEEN n PRECEDING AND CURRENT ROW</code> counts physical rows: this one and the n before it.
      Other bounds: <code>UNBOUNDED PRECEDING</code>, <code>n FOLLOWING</code>, <code>UNBOUNDED FOLLOWING</code>. Near
      the start there are fewer rows to look back on, and the frame just holds what exists: the first row averages
      itself alone.</p>
      <p>To reuse a window, name it once with a <code>WINDOW</code> clause (after <code>WHERE</code>, before
      <code>ORDER BY</code>) and write <code>OVER w</code>.</p>`,
    interview: `Moving averages (7-day active users, rolling revenue) are a favorite because they test whether you know
      frames exist. Say "ROWS BETWEEN 2 PRECEDING AND CURRENT ROW is three rows", and point out what happens at the
      start of the series. Some teams want those early rows left out, so ask.`,
    yardage: `Kenji Sato is <code>player_id = 3</code>. He never played twice on the same day.`,
    task: `Show Kenji Sato's current form (<code>player_id = 3</code>). For each of his rounds, return three columns in
      this order: <code>played_on</code>, <code>score</code>, and the average of that round and his two previous rounds
      (by date) rounded to 2 decimals. His first two rounds average just the rounds available so far. Sort by
      <code>played_on</code>, earliest first.`,
    solution: `SELECT
  played_on,
  score,
  ROUND(
    AVG(score) OVER (
      ORDER BY played_on
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS form_3
FROM rounds
WHERE player_id = 3
ORDER BY played_on;`,
    hint: '<code>AVG(score) OVER (ORDER BY played_on ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code>, rounded to 2.',
    alternatives: [
      `SELECT played_on, score, ROUND(AVG(score) OVER w, 2) FROM rounds WHERE player_id = 3
         WINDOW w AS (ORDER BY played_on ROWS 2 PRECEDING) ORDER BY played_on;`,
      `WITH k AS (SELECT played_on, score, ROW_NUMBER() OVER (ORDER BY played_on) AS n FROM rounds WHERE player_id = 3)
       SELECT a.played_on, a.score, ROUND(AVG(b.score), 2) FROM k a JOIN k b ON b.n BETWEEN a.n - 2 AND a.n
       GROUP BY a.n ORDER BY a.played_on;`,
    ],
    mistakes: [
      // The default frame: a running average from the first round.
      `SELECT played_on, score, ROUND(AVG(score) OVER (ORDER BY played_on), 2) FROM rounds WHERE player_id = 3
         ORDER BY played_on;`,
      // Off by one: four rounds.
      `SELECT played_on, score, ROUND(AVG(score) OVER (ORDER BY played_on ROWS BETWEEN 3 PRECEDING AND CURRENT ROW), 2)
         FROM rounds WHERE player_id = 3 ORDER BY played_on;`,
      // Centered instead of trailing.
      `SELECT played_on, score, ROUND(AVG(score) OVER (ORDER BY played_on ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 2)
         FROM rounds WHERE player_id = 3 ORDER BY played_on;`,
      `SELECT played_on, score, ROUND(AVG(score) OVER (ORDER BY played_on ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
         FROM rounds WHERE player_id = 3 ORDER BY score;`,
    ],
  },
  {
    id: 'ntile',
    title: 'Flights: NTILE quartiles',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>Club competitions split players into flights by ability. <code>NTILE(n)</code> does that: it deals the rows,
      in the window's order, into <code>n</code> buckets of (nearly) equal size, numbered 1 to n.</p>
      <pre>-- Courses split into two halves by length
SELECT
  name,
  yardage,
  NTILE(2) OVER (ORDER BY yardage DESC) AS length_half
FROM courses;</pre>
      <p>When the rows don't divide evenly, the <strong>first</strong> buckets get one extra row each: 10 rows into
      4 buckets gives sizes 3, 3, 2, 2. And <code>NTILE</code> splits by row count, not by value, so two tied rows can
      land in different buckets. It ranks per-player averages here, so build those first in a CTE (or use
      <code>NTILE(4) OVER (ORDER BY AVG(score))</code> straight after a <code>GROUP BY</code>).</p>`,
    interview: `"Split customers into quartiles by spend" or "flag the top 10% of users" comes up in analytics
      interviews. Mention the two NTILE caveats: uneven bucket sizes, and ties split across buckets. If the question
      means value-based percentiles rather than equal-sized groups, PERCENT_RANK or CUME_DIST is the better tool.`,
    yardage: `Twelve players have rounds; the other four have none and are not part of any flight. Names are in
      <code>players</code>. No two players have the same average score.`,
    task: `Split the players who have rounds into four flights by average score. Flight 1 holds the best (lowest)
      averages. Return three columns in this order: <code>name</code>, the player's average score rounded to 2
      decimals, and the flight number (1–4). Sort by flight, then by average score (lowest first).`,
    solution: `WITH player_avg AS (
  SELECT
    p.name,
    AVG(r.score) AS avg_score
  FROM players AS p
  INNER JOIN rounds AS r ON r.player_id = p.player_id
  GROUP BY p.player_id, p.name
)
SELECT
  name,
  ROUND(avg_score, 2) AS avg_score,
  NTILE(4) OVER (ORDER BY avg_score) AS flight
FROM player_avg
ORDER BY flight, avg_score;`,
    hint: 'A CTE with each player\'s <code>AVG(r.score)</code>, then <code>NTILE(4) OVER (ORDER BY avg_score)</code>.',
    alternatives: [
      `SELECT p.name, ROUND(AVG(r.score), 2), NTILE(4) OVER (ORDER BY AVG(r.score)) AS flight
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.player_id ORDER BY 3, AVG(r.score);`,
    ],
    mistakes: [
      // Highest averages in flight 1.
      `SELECT p.name, ROUND(AVG(r.score), 2), NTILE(4) OVER (ORDER BY AVG(r.score) DESC) AS f
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.player_id ORDER BY f, AVG(r.score);`,
      // Three flights instead of four.
      `SELECT p.name, ROUND(AVG(r.score), 2), NTILE(3) OVER (ORDER BY AVG(r.score)) AS f
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.player_id ORDER BY f, AVG(r.score);`,
      // Wrong join type: a LEFT JOIN brings in the four players with no rounds.
      `SELECT p.name, ROUND(AVG(r.score), 2), NTILE(4) OVER (ORDER BY AVG(r.score)) AS f
         FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id GROUP BY p.player_id ORDER BY f, AVG(r.score);`,
      `SELECT p.name, ROUND(AVG(r.score), 2), NTILE(4) OVER (ORDER BY AVG(r.score)) AS f
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY p.player_id ORDER BY f, p.name;`,
    ],
  },
  {
    id: 'first-last-value',
    title: 'Opening round, latest round: FIRST_VALUE and LAST_VALUE',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p><code>FIRST_VALUE(x)</code> and <code>LAST_VALUE(x)</code> return <code>x</code> from the first and last row
      of the <strong>frame</strong>. That word is the trap.</p>
      <p>With an <code>ORDER BY</code> in <code>OVER</code>, the default frame runs from the start of the partition to
      the <em>current row</em> (plus ties). So <code>FIRST_VALUE</code> works as you'd expect, but
      <code>LAST_VALUE</code> returns the current row's own value: the last row of a frame that ends here. To see the
      whole partition, widen the frame:</p>
      <pre>-- Each course's first and most recent round, on every row
SELECT
  course_id,
  played_on,
  FIRST_VALUE(round_id) OVER (
    PARTITION BY course_id ORDER BY played_on, round_id
  ) AS first_round,
  LAST_VALUE(round_id) OVER (
    PARTITION BY course_id ORDER BY played_on, round_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS latest_round
FROM rounds;</pre>
      <p>Many people skip <code>LAST_VALUE</code> entirely: <code>FIRST_VALUE</code> with the order reversed
      (<code>ORDER BY played_on DESC</code>) gives the same answer with the default frame.</p>`,
    interview: `The LAST_VALUE frame gotcha is a favorite "do you really know window functions" question. If you use
      LAST_VALUE, say why the explicit frame is there. In Joins &amp; Subqueries you found first and latest scores with
      MIN/MAX dates and two joins back to rounds; this is the same question in one pass.`,
    yardage: `Ava Birdwell and Noah Greenfield are in <code>players</code>. Neither played twice on the same day.`,
    task: `Show how Ava Birdwell's and Noah Greenfield's seasons started and where they are now. For each of their
      rounds, return five columns in this order: <code>name</code>, <code>played_on</code>, <code>score</code>, the
      score of that player's <strong>first</strong> round of the season, and the score of that player's
      <strong>latest</strong> round. Sort by name, then by <code>played_on</code>.`,
    solution: `SELECT
  p.name,
  r.played_on,
  r.score,
  FIRST_VALUE(r.score) OVER (
    PARTITION BY p.player_id ORDER BY r.played_on
  ) AS first_score,
  LAST_VALUE(r.score) OVER (
    PARTITION BY p.player_id ORDER BY r.played_on
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS latest_score
FROM rounds AS r
INNER JOIN players AS p ON p.player_id = r.player_id
WHERE p.name IN ('Ava Birdwell', 'Noah Greenfield')
ORDER BY p.name, r.played_on;`,
    hint: '<code>LAST_VALUE</code> needs <code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>, or use '
      + '<code>FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on DESC)</code>.',
    alternatives: [
      `SELECT p.name, r.played_on, r.score,
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on),
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on DESC)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE p.player_id IN (1, 9) ORDER BY 1, 2;`,
    ],
    mistakes: [
      // The default frame: LAST_VALUE is the current round's own score.
      `SELECT p.name, r.played_on, r.score,
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on),
         LAST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE p.name IN ('Ava Birdwell', 'Noah Greenfield') ORDER BY 1, 2;`,
      // No PARTITION BY: both players share one first and one latest round.
      `SELECT p.name, r.played_on, r.score,
         FIRST_VALUE(r.score) OVER (ORDER BY r.played_on),
         FIRST_VALUE(r.score) OVER (ORDER BY r.played_on DESC)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE p.name IN ('Ava Birdwell', 'Noah Greenfield') ORDER BY 1, 2;`,
      // "First" and "latest" mixed up with best and worst.
      `SELECT p.name, r.played_on, r.score,
         MIN(r.score) OVER (PARTITION BY p.player_id), MAX(r.score) OVER (PARTITION BY p.player_id)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE p.name IN ('Ava Birdwell', 'Noah Greenfield') ORDER BY 1, 2;`,
      // Wrong join type: the name filter in a LEFT JOIN's ON keeps everyone's rounds.
      `SELECT p.name, r.played_on, r.score,
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on),
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on DESC)
       FROM rounds r LEFT JOIN players p ON p.player_id = r.player_id AND p.name IN ('Ava Birdwell', 'Noah Greenfield')
       ORDER BY 1, 2;`,
      `SELECT p.name, r.played_on, r.score,
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on),
         FIRST_VALUE(r.score) OVER (PARTITION BY p.player_id ORDER BY r.played_on DESC)
       FROM rounds r JOIN players p ON p.player_id = r.player_id
       WHERE p.name IN ('Ava Birdwell', 'Noah Greenfield') ORDER BY 2;`,
    ],
  },
  {
    id: 'latest-per-player',
    title: 'Latest card in: dedupe with ROW_NUMBER',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>"Keep one row per group, the latest" is top-N-per-group with N = 1. Number each group's rows newest first,
      and keep row 1. It's also the standard way to <strong>deduplicate</strong>: when a table holds several versions
      of the same record, keep the most recent one per key.</p>
      <pre>-- The most recent round played at each course
WITH newest_first AS (
  SELECT
    course_id,
    round_id,
    played_on,
    ROW_NUMBER() OVER (
      PARTITION BY course_id
      ORDER BY played_on DESC, round_id DESC
    ) AS rn
  FROM rounds
)
SELECT course_id, round_id, played_on
FROM newest_first
WHERE rn = 1;</pre>
      <p>Why not <code>GROUP BY</code> with <code>MAX(played_on)</code>? Because the other columns you want (the
      score, the course) aren't aggregates. Standard SQL rejects them; SQLite quietly allows them, and only fills
      them from the max row when there's exactly one <code>MAX</code> or <code>MIN</code>. Don't rely on that in
      an interview.</p>`,
    interview: `"Get each user's most recent order" and "deduplicate this table keeping the latest record" are both this
      pattern. Say the tie rule out loud ("if two rows share a timestamp I break the tie by id") and why ROW_NUMBER
      rather than RANK: RANK would keep both tied rows.`,
    yardage: `<code>rounds</code> joins <code>players</code> on <code>player_id</code> and <code>courses</code> on
      <code>course_id</code>. Four players have no rounds and don't appear.`,
    task: `Show each player's most recent round. For every player who has rounds, return four columns in this order:
      the player's <code>name</code>, <code>played_on</code>, the course <code>name</code>, and <code>score</code> of
      their latest round (latest <code>played_on</code>; if two rounds shared a date, the higher
      <code>round_id</code>). Sort by player name.`,
    solution: `WITH newest_first AS (
  SELECT
    p.name AS player,
    r.played_on,
    c.name AS course,
    r.score,
    ROW_NUMBER() OVER (
      PARTITION BY r.player_id
      ORDER BY r.played_on DESC, r.round_id DESC
    ) AS rn
  FROM rounds AS r
  INNER JOIN players AS p ON p.player_id = r.player_id
  INNER JOIN courses AS c ON c.course_id = r.course_id
)
SELECT player, played_on, course, score
FROM newest_first
WHERE rn = 1
ORDER BY player;`,
    hint: 'In a CTE, <code>ROW_NUMBER() OVER (PARTITION BY r.player_id ORDER BY r.played_on DESC, r.round_id DESC)</code>; '
      + 'keep <code>rn = 1</code>.',
    alternatives: [
      `SELECT p.name, r.played_on, c.name, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         JOIN courses c ON c.course_id = r.course_id
       WHERE r.round_id = (SELECT x.round_id FROM rounds x WHERE x.player_id = r.player_id
                           ORDER BY x.played_on DESC, x.round_id DESC LIMIT 1)
       ORDER BY p.name;`,
    ],
    mistakes: [
      // Oldest first: every player's first round.
      `WITH x AS (SELECT p.name AS player, r.played_on, c.name AS course, r.score,
         ROW_NUMBER() OVER (PARTITION BY r.player_id ORDER BY r.played_on, r.round_id) AS rn
         FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id)
       SELECT player, played_on, course, score FROM x WHERE rn = 1 ORDER BY player;`,
      // No PARTITION BY: only the single latest round overall.
      `WITH x AS (SELECT p.name AS player, r.played_on, c.name AS course, r.score,
         ROW_NUMBER() OVER (ORDER BY r.played_on DESC, r.round_id DESC) AS rn
         FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id)
       SELECT player, played_on, course, score FROM x WHERE rn = 1 ORDER BY player;`,
      // GROUP BY instead of a window: the latest round per player AND course.
      `SELECT p.name, MAX(r.played_on), c.name, r.score FROM rounds r JOIN players p ON p.player_id = r.player_id
         JOIN courses c ON c.course_id = r.course_id GROUP BY p.name, c.name ORDER BY p.name;`,
      // Wrong join type: a LEFT JOIN from players keeps the four players with no rounds.
      `WITH x AS (SELECT p.name AS player, r.played_on, c.name AS course, r.score,
         ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY r.played_on DESC, r.round_id DESC) AS rn
         FROM players p LEFT JOIN rounds r ON r.player_id = p.player_id LEFT JOIN courses c ON c.course_id = r.course_id)
       SELECT player, played_on, course, score FROM x WHERE rn = 1 ORDER BY player;`,
      `WITH x AS (SELECT p.name AS player, r.played_on, c.name AS course, r.score,
         ROW_NUMBER() OVER (PARTITION BY r.player_id ORDER BY r.played_on DESC, r.round_id DESC) AS rn
         FROM rounds r JOIN players p ON p.player_id = r.player_id JOIN courses c ON c.course_id = r.course_id)
       SELECT player, played_on, course, score FROM x WHERE rn = 1 ORDER BY played_on DESC;`,
    ],
  },
  {
    id: 'improvement-streak',
    title: 'On a heater: the longest improving streak',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>Streak questions ("longest run of consecutive days", "most wins in a row") are called <strong>gaps and
      islands</strong>. The trick is to give every row in the same streak the same group number, then
      <code>GROUP BY</code> it. A running count of the rows that <em>break</em> a streak does exactly that: it goes up
      by one at each break and stays flat through a streak.</p>
      <pre>-- Runs of consecutive Sunny rounds, club-wide
WITH flagged AS (
  SELECT
    round_id,
    played_on,
    CASE WHEN weather = 'Sunny' THEN 0 ELSE 1 END AS breaks
  FROM rounds
),
grouped AS (
  SELECT
    round_id,
    breaks,
    SUM(breaks) OVER (ORDER BY played_on, round_id) AS run_id
  FROM flagged
)
SELECT run_id, SUM(1 - breaks) AS sunny_in_a_row
FROM grouped
GROUP BY run_id;</pre>
      <p>Three steps: flag each row (often with <code>LAG</code>), turn the flags into group ids with a running
      <code>SUM</code>, then aggregate per group. Build and check each CTE in turn before writing the next.</p>`,
    interview: `Gaps and islands is a senior-level favorite precisely because it doesn't look like a window question at
      first. Talk through the three steps before typing, and test the edge cases out loud: a player whose first round
      has no previous round, and a player who never improved (their longest streak is 0, not missing).`,
    yardage: `<code>rounds</code>: <code>player_id</code>, <code>played_on</code>, <code>score</code>. No player played
      twice on the same day. Twelve players have rounds.`,
    task: `Find each player's longest improving streak. A round is an <strong>improvement</strong> if its score is
      strictly lower than the same player's previous round (by <code>played_on</code>); a player's first round is never
      an improvement. A player's longest streak is the most improvements in a row (0 if they never improved). For every
      player who has rounds, return two columns in this order: <code>name</code> and the longest streak. Sort by the
      streak, longest first, then by name.`,
    solution: `WITH flagged AS (
  SELECT
    player_id,
    played_on,
    CASE
      WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on)
      THEN 1
      ELSE 0
    END AS improved
  FROM rounds
),
grouped AS (
  SELECT
    player_id,
    improved,
    SUM(1 - improved) OVER (
      PARTITION BY player_id ORDER BY played_on
    ) AS streak_id
  FROM flagged
),
streaks AS (
  SELECT
    player_id,
    SUM(improved) AS streak_length
  FROM grouped
  GROUP BY player_id, streak_id
)
SELECT
  p.name,
  MAX(s.streak_length) AS longest_streak
FROM streaks AS s
INNER JOIN players AS p ON p.player_id = s.player_id
GROUP BY p.player_id, p.name
ORDER BY longest_streak DESC, p.name;`,
    hint: 'Flag improvements with <code>score &lt; LAG(score) OVER (PARTITION BY player_id ORDER BY played_on)</code>. '
      + 'A running <code>SUM(1 - improved)</code> gives each streak an id. Sum the flags per streak, then take each '
      + 'player\'s <code>MAX</code>.',
    alternatives: [
      // Island ids as "row number minus row number among improvements".
      `WITH f AS (SELECT player_id, played_on,
           CASE WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds),
       g AS (SELECT player_id, imp,
           ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY played_on)
             - ROW_NUMBER() OVER (PARTITION BY player_id, imp ORDER BY played_on) AS grp
         FROM f),
       s AS (SELECT player_id, CASE WHEN MAX(imp) = 1 THEN COUNT(*) ELSE 0 END AS len FROM g GROUP BY player_id, imp, grp)
       SELECT p.name, MAX(s.len) AS best FROM s JOIN players p ON p.player_id = s.player_id
       GROUP BY p.player_id ORDER BY best DESC, p.name;`,
    ],
    mistakes: [
      // Total improvements, not consecutive ones.
      `WITH f AS (SELECT player_id,
           CASE WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds)
       SELECT p.name, SUM(f.imp) AS n FROM f JOIN players p ON p.player_id = f.player_id
       GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      // Counting rounds in the streak (one more than the improvements).
      `WITH f AS (SELECT player_id, played_on,
           CASE WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds),
       g AS (SELECT player_id, imp, SUM(1 - imp) OVER (PARTITION BY player_id ORDER BY played_on) AS grp FROM f),
       s AS (SELECT player_id, COUNT(*) AS len FROM g GROUP BY player_id, grp)
       SELECT p.name, MAX(s.len) AS n FROM s JOIN players p ON p.player_id = s.player_id
       GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      // LAG without PARTITION BY compares with another player's round.
      `WITH f AS (SELECT player_id, played_on,
           CASE WHEN score < LAG(score) OVER (ORDER BY player_id, played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds),
       g AS (SELECT player_id, imp, SUM(1 - imp) OVER (ORDER BY player_id, played_on) AS grp FROM f),
       s AS (SELECT player_id, SUM(imp) AS len FROM g GROUP BY player_id, grp)
       SELECT p.name, MAX(s.len) AS n FROM s JOIN players p ON p.player_id = s.player_id
       GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      // Wrong join type: a LEFT JOIN from players adds the four players with no rounds.
      `WITH f AS (SELECT player_id, played_on,
           CASE WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds),
       g AS (SELECT player_id, imp, SUM(1 - imp) OVER (PARTITION BY player_id ORDER BY played_on) AS grp FROM f),
       s AS (SELECT player_id, SUM(imp) AS len FROM g GROUP BY player_id, grp)
       SELECT p.name, MAX(s.len) AS n FROM players p LEFT JOIN s ON s.player_id = p.player_id
       GROUP BY p.player_id ORDER BY n DESC, p.name;`,
      `WITH f AS (SELECT player_id, played_on,
           CASE WHEN score < LAG(score) OVER (PARTITION BY player_id ORDER BY played_on) THEN 1 ELSE 0 END AS imp
         FROM rounds),
       g AS (SELECT player_id, imp, SUM(1 - imp) OVER (PARTITION BY player_id ORDER BY played_on) AS grp FROM f),
       s AS (SELECT player_id, SUM(imp) AS len FROM g GROUP BY player_id, grp)
       SELECT p.name, MAX(s.len) AS n FROM s JOIN players p ON p.player_id = s.player_id
       GROUP BY p.player_id ORDER BY p.name;`,
    ],
  },
  {
    id: 'rank-movers',
    title: 'Movers and shakers: month-over-month rank change',
    difficulty: 'hard',
    orderMatters: true,
    lesson: `
      <p>The capstone stacks window functions on top of each other. Each layer is a CTE, and each answers one
      question:</p>
      <ol>
        <li><strong>Aggregate:</strong> each player's average score per month (<code>GROUP BY</code>).</li>
        <li><strong>Rank within the month:</strong> <code>RANK() OVER (PARTITION BY month ORDER BY ...)</code>.</li>
        <li><strong>Compare with before:</strong> <code>LAG(...) OVER (PARTITION BY player ORDER BY month)</code>. Note
        the two layers partition by different things.</li>
        <li><strong>Filter last.</strong> Window functions only see rows that survive <code>WHERE</code>, so filtering
        to one month <em>before</em> the <code>LAG</code> leaves it nothing to look back at.</li>
      </ol>
      <pre>-- Steps 1 and 2 for putting: each month's putting ranks
WITH monthly AS (
  SELECT
    strftime('%Y-%m', played_on) AS month,
    player_id,
    AVG(putts) AS avg_putts
  FROM rounds
  GROUP BY month, player_id
)
SELECT
  month,
  player_id,
  RANK() OVER (PARTITION BY month ORDER BY avg_putts) AS putting_rank
FROM monthly;</pre>`,
    interview: `Multi-layer window questions (rank this period, compare with last period, report the movers) are how
      interviewers end a SQL round. Narrate each CTE's grain ("one row per player per month") before writing it. When
      you filter, say why it has to come after the LAG. That explanation is often worth more than the query.`,
    yardage: `<code>strftime('%Y-%m', played_on)</code> gives the month. Players don't play every month, so a player's
      previous month of play isn't always the calendar month before. Names are in <code>players</code> and are
      unique.`,
    task: `Who climbed the leaderboard in August 2026? Each month, rank the players who played that month by their
      average score that month (<code>RANK</code>, lowest average = 1, ties share a rank). For every player who played
      in August <strong>and</strong> in some earlier month, compare their August rank with their rank in the most
      recent earlier month they played. Return five columns in this order: <code>name</code>, that earlier month (as
      <code>YYYY-MM</code>), their rank then, their August rank, and the places gained (earlier rank minus August rank,
      so climbing is positive). Sort by places gained, most first, then by name.`,
    solution: `WITH monthly AS (
  SELECT
    strftime('%Y-%m', r.played_on) AS month,
    p.name,
    AVG(r.score) AS avg_score
  FROM rounds AS r
  INNER JOIN players AS p ON p.player_id = r.player_id
  GROUP BY month, p.player_id, p.name
),
ranked AS (
  SELECT
    month,
    name,
    RANK() OVER (PARTITION BY month ORDER BY avg_score) AS month_rank
  FROM monthly
),
with_prev AS (
  SELECT
    month,
    name,
    month_rank,
    LAG(month) OVER (PARTITION BY name ORDER BY month) AS prev_month,
    LAG(month_rank) OVER (PARTITION BY name ORDER BY month) AS prev_rank
  FROM ranked
)
SELECT
  name,
  prev_month,
  prev_rank,
  month_rank AS august_rank,
  prev_rank - month_rank AS places_gained
FROM with_prev
WHERE month = '2026-08'
  AND prev_rank IS NOT NULL
ORDER BY places_gained DESC, name;`,
    hint: 'Three CTEs: monthly averages per player; <code>RANK() OVER (PARTITION BY month ORDER BY avg_score)</code>; '
      + 'then <code>LAG</code> of month and rank <code>OVER (PARTITION BY name ORDER BY month)</code>. Filter to '
      + '<code>\'2026-08\'</code> only at the end.',
    alternatives: [
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name,
           RANK() OVER (PARTITION BY strftime('%Y-%m', r.played_on) ORDER BY AVG(r.score)) AS rk
         FROM rounds r JOIN players p ON p.player_id = r.player_id GROUP BY 1, p.player_id),
       aug AS (SELECT * FROM m WHERE month = '2026-08'),
       prev AS (SELECT a.name, MAX(b.month) AS pm FROM aug a JOIN m b ON b.name = a.name AND b.month < a.month
                GROUP BY a.name)
       SELECT a.name, pr.pm, b.rk, a.rk, b.rk - a.rk AS gain FROM aug a JOIN prev pr ON pr.name = a.name
       JOIN m b ON b.name = a.name AND b.month = pr.pm ORDER BY gain DESC, a.name;`,
    ],
    mistakes: [
      // No PARTITION BY month: ranks across all player-months at once.
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name, AVG(r.score) AS a FROM rounds r
         JOIN players p ON p.player_id = r.player_id GROUP BY month, p.player_id),
       k AS (SELECT month, name, RANK() OVER (ORDER BY a) AS rk FROM m),
       w AS (SELECT month, name, rk, LAG(month) OVER (PARTITION BY name ORDER BY month) AS pm,
         LAG(rk) OVER (PARTITION BY name ORDER BY month) AS pr FROM k)
       SELECT name, pm, pr, rk, pr - rk AS g FROM w WHERE month = '2026-08' AND pr IS NOT NULL ORDER BY g DESC, name;`,
      // Filtering to August before the LAG: there's nothing earlier left to look back at.
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name, AVG(r.score) AS a FROM rounds r
         JOIN players p ON p.player_id = r.player_id GROUP BY month, p.player_id),
       k AS (SELECT month, name, RANK() OVER (PARTITION BY month ORDER BY a) AS rk FROM m WHERE month >= '2026-07'),
       w AS (SELECT month, name, rk, LAG(month) OVER (PARTITION BY name ORDER BY month) AS pm,
         LAG(rk) OVER (PARTITION BY name ORDER BY month) AS pr FROM k)
       SELECT name, pm, pr, rk, pr - rk AS g FROM w WHERE month = '2026-08' AND pr IS NOT NULL ORDER BY g DESC, name;`,
      // Places gained with the sign flipped.
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name, AVG(r.score) AS a FROM rounds r
         JOIN players p ON p.player_id = r.player_id GROUP BY month, p.player_id),
       k AS (SELECT month, name, RANK() OVER (PARTITION BY month ORDER BY a) AS rk FROM m),
       w AS (SELECT month, name, rk, LAG(month) OVER (PARTITION BY name ORDER BY month) AS pm,
         LAG(rk) OVER (PARTITION BY name ORDER BY month) AS pr FROM k)
       SELECT name, pm, pr, rk, rk - pr AS g FROM w WHERE month = '2026-08' AND pr IS NOT NULL ORDER BY g, name;`,
      // Wrong join type: a pros-only filter in a LEFT JOIN's ON leaves amateur rounds with NULL names.
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name, AVG(r.score) AS a FROM rounds r
         LEFT JOIN players p ON p.player_id = r.player_id AND p.is_pro = 1 GROUP BY month, p.player_id),
       k AS (SELECT month, name, RANK() OVER (PARTITION BY month ORDER BY a) AS rk FROM m),
       w AS (SELECT month, name, rk, LAG(month) OVER (PARTITION BY name ORDER BY month) AS pm,
         LAG(rk) OVER (PARTITION BY name ORDER BY month) AS pr FROM k)
       SELECT name, pm, pr, rk, pr - rk AS g FROM w WHERE month = '2026-08' AND pr IS NOT NULL ORDER BY g DESC, name;`,
      `WITH m AS (SELECT strftime('%Y-%m', r.played_on) AS month, p.name, AVG(r.score) AS a FROM rounds r
         JOIN players p ON p.player_id = r.player_id GROUP BY month, p.player_id),
       k AS (SELECT month, name, RANK() OVER (PARTITION BY month ORDER BY a) AS rk FROM m),
       w AS (SELECT month, name, rk, LAG(month) OVER (PARTITION BY name ORDER BY month) AS pm,
         LAG(rk) OVER (PARTITION BY name ORDER BY month) AS pr FROM k)
       SELECT name, pm, pr, rk, pr - rk AS g FROM w WHERE month = '2026-08' AND pr IS NOT NULL ORDER BY rk, name;`,
    ],
  },
];
