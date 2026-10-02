// Difficulty and par: the one place that decides how many strokes a problem "should" take.
//
// Every tournament hole and Driving Range problem declares a `difficulty`; its par is computed from it here (by
// loadTournament in js/tournaments.js and loadRange in js/range.js). Data files never store a par.
//
//   easy    one core concept, solvable on the first try                       Par 1
//   medium  two concepts combined                                             Par 2
//   hard    interview-style, multi-step                                       Par 2

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const PAR_BY_DIFFICULTY = { easy: 1, medium: 2, hard: 2 };

/** Par for a difficulty. Throws on an unknown difficulty so bad data fails loudly. */
export function parFor(difficulty) {
  const par = PAR_BY_DIFFICULTY[difficulty];
  if (par === undefined) throw new Error(`Unknown difficulty "${difficulty}" (expected ${DIFFICULTIES.join(', ')})`);
  return par;
}
