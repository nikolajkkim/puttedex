// Driving Range settings. This is the one place to change how the range unlocks, when solutions are revealed,
// when a problem comes back for review, and how rough spots and timed rounds work. The logic lives in js/range.js.

/**
 * When a tournament's range problems unlock.
 *   { rule: 'tournament-complete' }      every open hole of the tournament holed out (in any round)
 *   { rule: 'holes-done', holes: 9 }     at least `holes` holes holed out in the current round (or any finished round)
 *   { rule: 'always' }                   no lock
 */
export const RANGE_UNLOCK = { rule: 'tournament-complete' };

/** The pro's solution is revealed after a solve, or after this many failed submissions on the problem. */
export const SOLUTION_UNLOCK_FAILED_ATTEMPTS = 3;

/**
 * A solve is flagged "needs review" when it took more than `strokesOverPar` strokes over par, or when the caddie
 * tip has been used on `hintsSinceClean` or more plays since the problem was last solved cleanly (no tip, not over
 * the stroke limit). A flagged problem returns to the list as "needs review" `afterDays` days after that solve.
 */
export const REVIEW = { strokesOverPar: 2, hintsSinceClean: 3, afterDays: 3 };

/** Struggle score per topic: summed over the range problems tagged with it. */
export const STRUGGLE_WEIGHTS = { failedAttempt: 1, hint: 2, strokeOverPar: 1 };

/** How many weakest topics "Drill my rough spots" draws from. */
export const ROUGH_SPOTS = 3;

/** Timed Round: how many random unlocked problems, the time limit, and what an unsolved problem scores on the
 *  round's scorecard (par + unsolvedOverPar). */
export const TIMED_ROUND = { problems: 3, minutes: 30, unsolvedOverPar: 2 };

/** Difficulty is the problem's par. */
export const DIFFICULTY = { 3: 'Easy', 4: 'Medium', 5: 'Hard' };

/** Topic tags a range problem may use (tests reject anything else, so filters stay tidy). */
export const TOPICS = [
  'SELECT', 'WHERE', 'IN / BETWEEN', 'ORDER BY', 'LIMIT', 'DISTINCT', 'NULL', 'Aggregates', 'GROUP BY', 'HAVING',
  'COUNT DISTINCT', 'JOIN', 'CASE WHEN', 'Dates', 'Percentages',
  'LEFT JOIN', 'Self-join', 'Subqueries', 'EXISTS', 'CTE',
];
