// The pandas tournament's dataset: CSV exports of the same golf world as the SQL clubhouse database, messiness
// included. Built by scripts/build-frames.mjs (deterministic; edit the script, never the CSV files by hand).
//
// Each table is a CSV file per variant in clubhouse-csv/<variant>/<table>.csv, read with plain pd.read_csv(), so
// learners get exactly the dtypes that call produces (dates and "$1,250" dues arrive as strings, an integer column
// with a missing value arrives as float64). `main` is the visible data; `alt` is a hidden variant with the same
// schema and the same kinds of messiness but different values, used by hidden test cases.

export const FRAMES = {
  dir: 'clubhouse-csv', // relative to js/data/datasets/
  variants: ['main', 'alt'],
  visible: 'main',
  tables: {
    players: 'Club members. Names and countries are typed inconsistently (stray spaces, mixed case); handicap and '
      + 'home_course_id are missing for some; dues is text like "$1,250"; two people signed up twice under a new '
      + 'player_id; some members have never played.',
    courses: 'The eight courses: par, yardage, and where they are. One has never been played.',
    rounds: 'One row per round. played_on is a date string; putts and weather are missing for some rounds; a few '
      + 'rounds belong to player_ids that are no longer in players (deleted accounts).',
    scores: 'Hole-by-hole cards (round_id, hole 1–18) for most rounds. Some cards were uploaded twice (exact '
      + 'duplicate rows), and one card belongs to a round that isn\'t in rounds.',
    legacy_rounds: 'Last season, from the old scoring app: wide (h1 … h18 strokes per hole), with its own column '
      + 'names (id, date, course, player, total).',
  },
};
