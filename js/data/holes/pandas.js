// Holes for the "pandas Wrangling" tournament (The DataFrame Championship), in play order (hole 1 first).
// Every hole translates a skill from the SQL tournaments into idiomatic, vectorized pandas, on the clubhouse-csv
// dataset (js/data/datasets/clubhouse-csv.js): CSV exports of the same golf world, messiness included.
//
// Difficulty ramp: holes 1-6 are single concepts (easy, Par 1); 7-13 combine them (medium, Par 2); 14-18 are
// interview questions (hard, Par 2): monthly trends, cleaning a messy export, reshaping, window-style operations,
// and a capstone that cleans, merges, aggregates, and reshapes.
//
// Hole fields are documented at the top of js/data/holes/sql-basics.js, except that a pandas hole has a `checker`
// of type 'dataframe' instead of `orderMatters` (format: top of js/lib/python-engine.js; rules: "pandas holes" in
// CLAUDE.md). Every checker spells out all its options. Expected results are never written here: the checker runs
// `solution` on the visible data, the hidden `alt` variant, and each hidden case's `setup` edits. Each `yardage`
// note ends with the SQL the hole replaces ("SQL equivalent").

export default [
  {
    id: 'inspect',
    title: 'Walk the course: head, shape, dtypes, and describe',
    difficulty: 'easy',
    lesson: `
      <p>A <strong>DataFrame</strong> is a table: named columns, each with one type (its <strong>dtype</strong>),
      and an <strong>index</strong> labeling the rows (0, 1, 2, … when you read a CSV). The first thing to do with
      any new table is look at it:</p>
      <pre>courses.head(3)       # the first 3 rows (5 by default)
courses.shape         # (rows, columns), e.g. (8, 6): no parentheses
courses.dtypes        # each column's type: int64, float64, str, bool
courses.info()        # columns, non-missing counts, and dtypes at once
courses['par'].describe()   # count, mean, std, min, quartiles, max</pre>
      <p><code>describe()</code> on a DataFrame summarizes every numeric column and returns a new DataFrame: one
      column per input column, one row per statistic. <code>count</code> only counts values that aren't missing,
      so comparing counts is a quick way to spot gaps. Select columns first with a <em>list</em> of names in
      double brackets:</p>
      <pre>courses[['par', 'yardage']].describe()</pre>
      <p>Watch the dtypes. A whole-number column with even one missing value is read as <code>float64</code>
      (NaN is a float), and dates arrive as text (<code>str</code>) until you convert them.</p>`,
    interview: `Take-home assignments are graded on whether you looked before you leapt. Opening with
      <code>shape</code>, <code>dtypes</code>, <code>isna().sum()</code>, and <code>describe()</code>, and saying
      what you notice ("putts has missing values; played_on is text, not a date"), is exactly what reviewers want to
      see before any analysis.`,
    yardage: `<code>rounds</code>: one row per round, with <code>score</code>, <code>putts</code> (missing for some
      rounds), and <code>fairways_hit</code>. <br><strong>SQL equivalent:</strong>
      <code>SELECT COUNT(score), AVG(score), MIN(score), MAX(score) FROM rounds</code>, for each column, plus the
      standard deviation and quartiles SQLite doesn't have.`,
    task: `pandas is already imported as <code>pd</code> and NumPy as <code>np</code> on every hole, so you never
      need an import. Write <code>def scouting_report(rounds)</code> that returns a DataFrame: the
      <code>describe()</code> summary of the <code>score</code>, <code>putts</code>, and <code>fairways_hit</code>
      columns of <code>rounds</code>, in that column order (rows: count, mean, std, min, 25%, 50%, 75%, max).`,
    solution: `def scouting_report(rounds):
    return (
        rounds[['score', 'putts', 'fairways_hit']]
        .describe()
    )`,
    hint: 'Select the three columns with a list in double brackets, <code>rounds[[...]]</code>, then call '
      + '<code>.describe()</code> on that DataFrame.',
    checker: {
      type: 'dataframe',
      function: 'scouting_report',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds['putts'] = np.nan", hidden: true, label: 'putts never recorded (an all-missing column)' },
        { setup: 'rounds = rounds.head(1)', hidden: true, label: 'a single round (std is NaN)' },
      ],
    },
    alternatives: [
      `def scouting_report(rounds):
    summary = rounds.describe()
    return summary[['score', 'putts', 'fairways_hit']]`,
    ],
    mistakes: [
      // Every numeric column, ids included.
      `def scouting_report(rounds):
    return rounds.describe()`,
      // Transposed: statistics as columns.
      `def scouting_report(rounds):
    return rounds[['score', 'putts', 'fairways_hit']].describe().T`,
      // Filling missing putts with 0 drags the putts mean and quartiles down.
      `def scouting_report(rounds):
    return rounds[['score', 'putts', 'fairways_hit']].fillna(0).describe()`,
      // Hardcoded from the visible data: right there, wrong everywhere else.
      `def scouting_report(rounds):
    return pd.DataFrame({
        'score': [221.0, 77.26244343891403, 4.376994755922974, 68.0, 74.0, 77.0, 81.0, 88.0],
        'putts': [206.0, 30.805825242718445, 2.504856755272219, 26.0, 29.0, 31.0, 33.0, 36.0],
        'fairways_hit': [221.0, 7.588235294117647, 2.081880063531634, 4.0, 6.0, 8.0, 9.0, 12.0],
    }, index=['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'])`,
    ],
  },
  {
    id: 'select',
    title: 'Pick your club: [], .loc, and .iloc',
    difficulty: 'easy',
    lesson: `
      <p>Three ways to pick parts of a DataFrame, and the difference between the last two is a classic
      interview question:</p>
      <pre>players['name']                 # one column: a Series
players[['name', 'country']]    # a list of columns: a DataFrame
players.loc[3, 'name']          # by LABEL: the row labeled 3
players.loc[2:4, ['name']]      # labels 2, 3, AND 4 (loc includes the end)
players.iloc[0]                 # by POSITION: the first row
players.iloc[2:4, [1]]          # positions 2 and 3 (iloc stops before 4)</pre>
      <p><code>.loc</code> uses the <strong>index labels</strong>, <code>.iloc</code> uses <strong>positions</strong>
      (0, 1, 2, … counted from the top, like a Python list). Straight after <code>read_csv</code> the labels are
      0, 1, 2, … so the two look the same. They stop being the same the moment you sort or filter, because rows keep
      their labels:</p>
      <pre>by_handicap = players.sort_values('handicap')
by_handicap.iloc[0]    # the lowest handicap (first position)
by_handicap.loc[0]     # whoever was originally in row 0</pre>`,
    interview: `"What's the difference between loc and iloc?" comes up constantly. The complete answer has two parts:
      labels vs positions, <em>and</em> that <code>loc</code> slices include the end label while <code>iloc</code>
      slices (like Python's) don't. Bonus points for mentioning that sorting or filtering keeps the old labels.`,
    yardage: `<code>rounds</code> straight from the CSV (labels 0, 1, 2, …), but hidden tests also pass it sorted or
      filtered, so labels and positions differ. <br><strong>SQL equivalent:</strong>
      <code>SELECT round_id, player_id, score FROM rounds LIMIT 10 OFFSET 10</code>.`,
    task: `Write <code>def card_slice(rounds)</code> that returns a DataFrame with the 11th through 20th rows of
      <code>rounds</code> by <em>position</em> (whatever their labels are) and only the columns
      <code>round_id</code>, <code>player_id</code>, and <code>score</code>, in that order. Keep the rows' original
      index labels (don't reset the index). If <code>rounds</code> has fewer rows, return what's there.`,
    solution: `def card_slice(rounds):
    return (
        rounds
        .iloc[10:20]
        .loc[:, ['round_id', 'player_id', 'score']]
    )`,
    hint: 'Positions mean <code>.iloc</code>: the 11th row is position 10, and <code>.iloc[10:20]</code> stops '
      + 'before position 20. Then select the three columns by name with <code>[[...]]</code>.',
    checker: {
      type: 'dataframe',
      function: 'card_slice',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds = rounds.sort_values('score', kind='stable')", hidden: true, label: 'sorted rows: labels are not positions' },
        { setup: 'rounds = rounds.head(15)', hidden: true, label: 'only 15 rows' },
      ],
    },
    alternatives: [
      `def card_slice(rounds):
    columns = ['round_id', 'player_id', 'score']
    return rounds[columns].iloc[10:20]`,
      `def card_slice(rounds):
    return rounds.iloc[10:20, [0, 1, 4]]`,
    ],
    mistakes: [
      // loc includes the end label: 11 rows.
      `def card_slice(rounds):
    return rounds.loc[10:20, ['round_id', 'player_id', 'score']]`,
      // Labels, not positions: right on freshly read data, wrong once it's sorted.
      `def card_slice(rounds):
    return rounds.loc[10:19, ['round_id', 'player_id', 'score']]`,
      // Off by one: the 12th to 21st rows.
      `def card_slice(rounds):
    return rounds.iloc[11:21][['round_id', 'player_id', 'score']]`,
      // Wrong column order.
      `def card_slice(rounds):
    return rounds.iloc[10:20][['score', 'player_id', 'round_id']]`,
      // Resets the index the task said to keep.
      `def card_slice(rounds):
    return rounds.iloc[10:20][['round_id', 'player_id', 'score']].reset_index(drop=True)`,
    ],
  },
  {
    id: 'filter',
    title: 'Out of bounds: boolean masks with &, |, isin, and between',
    difficulty: 'easy',
    lesson: `
      <p>A comparison on a column gives a <strong>boolean mask</strong>: a Series of True/False, one per row.
      Put a mask inside <code>[]</code> to keep the True rows:</p>
      <pre>long_courses = courses[courses['yardage'] &gt; 7000]</pre>
      <p>Combine masks with <code>&amp;</code> (and), <code>|</code> (or), and <code>~</code> (not), and wrap each
      comparison in parentheses: <code>&amp;</code> binds tighter than <code>&gt;</code>, so without them Python
      reads it wrong. Python's own <code>and</code>/<code>or</code> don't work on a whole column.</p>
      <pre>pros_low = players[(players['is_pro']) &amp; (players['handicap'] &lt; 2)]
names = players[players['country'].isin(['JPN', 'KOR'])]
mid = players[players['handicap'].between(5, 10)]   # 5 and 10 included</pre>
      <p>Missing values (NaN) fail every comparison: <code>NaN &lt; 2</code> and <code>NaN &gt;= 2</code> are both
      False. So <code>~(x &gt;= 2)</code> is <em>not</em> the same as <code>x &lt; 2</code>: the first keeps the
      missing rows. Filtering keeps each row's original index label.</p>`,
    interview: `Interviewers watch for two bugs here: <code>and</code> instead of <code>&amp;</code> (an "ambiguous
      truth value" error), and conditions that quietly keep or drop missing values. Saying "putts is missing for some
      rounds, so I'll make sure those don't sneak in" is the kind of thing that gets noted.`,
    yardage: `<code>rounds</code>: <code>course_id</code>, <code>score</code>, <code>weather</code>, and
      <code>putts</code> (missing for some rounds). <br><strong>SQL equivalent:</strong>
      <code>WHERE (course_id IN (2, 4, 6) AND score BETWEEN 75 AND 85) OR (weather = 'Rain' AND putts &lt; 30)</code>.`,
    task: `Write <code>def tough_conditions(rounds)</code> that returns a DataFrame of the rounds that were either
      played at course 2, 4, or 6 with a score between 75 and 85 (both included), <em>or</em> played in
      <code>'Rain'</code> with fewer than 30 putts. A round with no putts recorded doesn't count as fewer than 30.
      Keep every column, the original row order, and the original index labels.`,
    solution: `def tough_conditions(rounds):
    links = rounds['course_id'].isin([2, 4, 6])
    middle = rounds['score'].between(75, 85)
    wet = (rounds['weather'] == 'Rain') & (rounds['putts'] < 30)
    return rounds[(links & middle) | wet]`,
    hint: 'Build three masks: <code>isin([2, 4, 6])</code>, <code>between(75, 85)</code>, and '
      + '<code>(weather == \'Rain\') &amp; (putts &lt; 30)</code>. Then keep <code>rounds[(a &amp; b) | c]</code>.',
    checker: {
      type: 'dataframe',
      function: 'tough_conditions',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds.loc[rounds['weather'] == 'Rain', 'putts'] = np.nan", hidden: true, label: 'no putts recorded for any rain round' },
        { setup: "rounds = rounds[rounds['weather'] != 'Rain']", hidden: true, label: 'no rain all season' },
      ],
    },
    alternatives: [
      `def tough_conditions(rounds):
    return rounds.query(
        '(course_id in [2, 4, 6] and 75 <= score <= 85)'
        ' or (weather == "Rain" and putts < 30)'
    )`,
    ],
    mistakes: [
      // ~(putts >= 30) keeps rain rounds with no putts recorded.
      `def tough_conditions(rounds):
    links = rounds['course_id'].isin([2, 4, 6])
    middle = rounds['score'].between(75, 85)
    wet = (rounds['weather'] == 'Rain') & ~(rounds['putts'] >= 30)
    return rounds[(links & middle) | wet]`,
      // between excluding the ends.
      `def tough_conditions(rounds):
    links = rounds['course_id'].isin([2, 4, 6])
    middle = rounds['score'].between(75, 85, inclusive='neither')
    wet = (rounds['weather'] == 'Rain') & (rounds['putts'] < 30)
    return rounds[(links & middle) | wet]`,
      // and/or grouped the wrong way.
      `def tough_conditions(rounds):
    links = rounds['course_id'].isin([2, 4, 6])
    middle = rounds['score'].between(75, 85)
    rain = rounds['weather'] == 'Rain'
    return rounds[links & (middle | rain) & (rounds['putts'] < 30)]`,
      // Missing parentheses: & binds before < and ==.
      `def tough_conditions(rounds):
    return rounds[rounds['course_id'].isin([2, 4, 6]) & rounds['score'].between(75, 85) | rounds['weather'] == 'Rain' & rounds['putts'] < 30]`,
      // Hardcoded: the row labels the visible data happens to give.
      `def tough_conditions(rounds):
    return rounds.loc[[5, 7, 8, 9, 11, 14, 18, 19, 21, 22, 23, 25, 34, 36, 38, 40, 41, 45, 54, 55, 58, 60, 63, 65, 66, 70, 72, 74, 77, 82, 83, 85, 86, 91, 95, 96, 98, 99, 100, 103, 105, 106, 107, 110, 111, 115, 116, 119, 123, 125, 126, 131, 134, 135, 139, 140, 142, 143, 144, 145, 146, 148, 149, 151, 152, 155, 157, 158, 159, 162, 163, 168, 169, 170, 172, 177, 178, 180, 183, 191, 192, 205, 206, 207, 209, 214, 216, 218]]`,
      // Resets the index the task said to keep.
      `def tough_conditions(rounds):
    links = rounds['course_id'].isin([2, 4, 6])
    middle = rounds['score'].between(75, 85)
    wet = (rounds['weather'] == 'Rain') & (rounds['putts'] < 30)
    return rounds[(links & middle) | wet].reset_index(drop=True)`,
    ],
  },
  {
    id: 'sort-top-n',
    title: 'Leaderboard: sort_values, nsmallest, and tie-breakers',
    difficulty: 'easy',
    lesson: `
      <p><code>sort_values</code> sorts by one column or a list of them, with one <code>ascending</code> flag per
      column. Later columns only matter where the earlier ones tie, so they're your tie-breakers:</p>
      <pre>(courses
    .sort_values(['par', 'yardage'], ascending=[False, True])
    .head(3))</pre>
      <p><code>nlargest(n, 'col')</code> and <code>nsmallest(n, 'col')</code> are shortcuts for "sort and take n" on
      one direction. When values tie at the cut-off, <code>keep='first'</code> (the default) keeps rows in their
      current order, and <code>keep='all'</code> keeps every tied row.</p>
      <p>Two traps. First, the default sort algorithm isn't <em>stable</em>, so tied rows can come out in any order:
      if the order of ties matters, add a tie-breaker column (or pass <code>kind='stable'</code>). Second, never rely
      on the rows already being in some order. Data can arrive shuffled.</p>`,
    interview: `"Top N" questions are almost always really "top N with ties" questions. Ask (or state) how ties are
      broken, put that rule in the sort, and you'll avoid the most common way a correct-looking answer gets marked
      wrong.`,
    yardage: `<code>rounds</code>: <code>round_id</code>, <code>player_id</code>, <code>score</code>, and
      <code>fairways_hit</code>. Many rounds share a score. <br><strong>SQL equivalent:</strong>
      <code>ORDER BY score, fairways_hit DESC, round_id LIMIT n</code>.`,
    task: `Write <code>def leaderboard(rounds, n)</code> that returns a DataFrame of the <code>n</code> rounds with the
      lowest scores, best first, with the columns <code>round_id</code>, <code>player_id</code>,
      <code>score</code>, and <code>fairways_hit</code>, in that order. Break ties on score by more
      <code>fairways_hit</code> first, then by the lower <code>round_id</code>. The index isn't graded.`,
    solution: `def leaderboard(rounds, n):
    return (
        rounds
        .sort_values(
            ['score', 'fairways_hit', 'round_id'],
            ascending=[True, False, True],
        )
        .head(n)
        [['round_id', 'player_id', 'score', 'fairways_hit']]
    )`,
    hint: 'Sort by three columns with three directions: <code>sort_values([\'score\', \'fairways_hit\', '
      + '\'round_id\'], ascending=[True, False, True])</code>, then <code>.head(n)</code> and select the columns.',
    checker: {
      type: 'dataframe',
      function: 'leaderboard',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        { args: '5' },
        { data: 'alt', args: '3', hidden: true, label: 'a different season, top 3' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=7)', args: '8', hidden: true, label: 'rows arrive shuffled' },
        { args: '1', hidden: true, label: 'just the winner' },
        { args: '0', hidden: true, label: 'n = 0' },
      ],
    },
    alternatives: [
      `def leaderboard(rounds, n):
    ranked = rounds.assign(fewer_fairways=-rounds['fairways_hit'])
    ranked = ranked.sort_values(['score', 'fewer_fairways', 'round_id'])
    return ranked[['round_id', 'player_id', 'score', 'fairways_hit']].head(n)`,
    ],
    mistakes: [
      // No tie-breakers at all.
      `def leaderboard(rounds, n):
    return rounds.nsmallest(n, 'score')[['round_id', 'player_id', 'score', 'fairways_hit']]`,
      // Fairways the wrong way round.
      `def leaderboard(rounds, n):
    return (rounds.sort_values(['score', 'fairways_hit', 'round_id'])
            .head(n)[['round_id', 'player_id', 'score', 'fairways_hit']])`,
      // Relies on the rows already being in round_id order: wrong once they're shuffled.
      `def leaderboard(rounds, n):
    return (rounds.sort_values(['score', 'fairways_hit'], ascending=[True, False])
            .head(n)[['round_id', 'player_id', 'score', 'fairways_hit']])`,
      // Hardcoded 5.
      `def leaderboard(rounds, n):
    return (rounds.sort_values(['score', 'fairways_hit', 'round_id'], ascending=[True, False, True])
            .head(5)[['round_id', 'player_id', 'score', 'fairways_hit']])`,
    ],
  },
  {
    id: 'new-columns',
    title: 'Club selection: new columns with vectorized math, np.where, and assign',
    difficulty: 'easy',
    lesson: `
      <p>Arithmetic on a column works on every row at once (it's <strong>vectorized</strong>), so new columns never
      need a loop:</p>
      <pre>courses['yards_per_hole'] = (courses['yardage'] / 18).round(1)</pre>
      <p>That line changes <code>courses</code> itself. When a function receives a DataFrame, it shouldn't change it
      behind the caller's back. <code>assign</code> returns a <em>new</em> DataFrame with the extra (or replaced)
      columns, leaving the original alone:</p>
      <pre>longer = courses.assign(
    yards_per_hole=(courses['yardage'] / 18).round(1),
    km=courses['yardage'] * 0.0009144,
)</pre>
      <p><code>np.where(condition, if_true, if_false)</code> is a vectorized if/else. Nest it, or use
      <code>np.select</code>, for more than two outcomes. Remember that a comparison with NaN is False, so missing
      values land in the "false" branch unless you test for them with <code>isna()</code> first:</p>
      <pre>size = np.where(courses['yardage'] &gt;= 7000, 'long', 'short')
courses.assign(size=size)</pre>`,
    interview: `If you write <code>for i, row in df.iterrows()</code> to compute a column, expect the follow-up
      "how would you do this on 10 million rows?" Vectorized expressions and <code>np.where</code> are the answer
      interviewers are waiting for; a loop is the wrong tool here.`,
    yardage: `<code>rounds</code>: <code>score</code>, <code>putts</code> (missing for some rounds), and
      <code>fairways_hit</code> (out of 14 driving holes). <br><strong>SQL equivalent:</strong>
      <code>SELECT *, ROUND(score / 18.0, 2) AS strokes_per_hole, CASE WHEN putts IS NULL THEN 'unknown' WHEN putts
      &lt;= 30 THEN 'good' ELSE 'needs work' END AS putting, … FROM rounds</code>.`,
    task: `Write <code>def add_metrics(rounds)</code> that returns a new DataFrame: all of <code>rounds</code>'
      columns plus three new ones, in this order: <code>strokes_per_hole</code> (score divided by 18, rounded to 2
      decimals); <code>putting</code> (<code>'good'</code> when putts is 30 or fewer, <code>'needs work'</code> when
      it's more, and <code>'unknown'</code> when putts is missing); and <code>fairway_pct</code>
      (fairways_hit out of 14, as a percentage rounded to 1 decimal). Don't modify <code>rounds</code> itself, and
      keep its index.`,
    solution: `def add_metrics(rounds):
    putting = np.where(rounds['putts'] <= 30, 'good', 'needs work')
    return rounds.assign(
        strokes_per_hole=(rounds['score'] / 18).round(2),
        putting=np.where(rounds['putts'].isna(), 'unknown', putting),
        fairway_pct=(rounds['fairways_hit'] / 14 * 100).round(1),
    )`,
    hint: 'Use <code>rounds.assign(...)</code> so the input stays untouched. For <code>putting</code>, test '
      + '<code>isna()</code> first: <code>np.where(rounds[\'putts\'].isna(), \'unknown\', np.where(rounds[\'putts\'] '
      + '&lt;= 30, \'good\', \'needs work\'))</code>.',
    checker: {
      type: 'dataframe',
      function: 'add_metrics',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds = rounds[rounds['course_id'] != 2]", hidden: true, label: 'some rows removed (index has gaps)' },
        { setup: "rounds['putts'] = np.nan", hidden: true, label: 'putts never recorded' },
      ],
    },
    alternatives: [
      `def add_metrics(rounds):
    out = rounds.copy()
    out['strokes_per_hole'] = (out['score'] / 18).round(2)
    out['putting'] = np.select(
        [out['putts'].isna(), out['putts'] <= 30],
        ['unknown', 'good'],
        default='needs work',
    )
    out['fairway_pct'] = (out['fairways_hit'] * 100 / 14).round(1)
    return out`,
    ],
    mistakes: [
      // Modifies the input.
      `def add_metrics(rounds):
    rounds['strokes_per_hole'] = (rounds['score'] / 18).round(2)
    putting = np.where(rounds['putts'] <= 30, 'good', 'needs work')
    rounds['putting'] = np.where(rounds['putts'].isna(), 'unknown', putting)
    rounds['fairway_pct'] = (rounds['fairways_hit'] / 14 * 100).round(1)
    return rounds`,
      // Missing putts fall into the "needs work" branch.
      `def add_metrics(rounds):
    return rounds.assign(
        strokes_per_hole=(rounds['score'] / 18).round(2),
        putting=np.where(rounds['putts'] <= 30, 'good', 'needs work'),
        fairway_pct=(rounds['fairways_hit'] / 14 * 100).round(1),
    )`,
      // Floor division.
      `def add_metrics(rounds):
    putting = np.where(rounds['putts'] <= 30, 'good', 'needs work')
    return rounds.assign(
        strokes_per_hole=rounds['score'] // 18,
        putting=np.where(rounds['putts'].isna(), 'unknown', putting),
        fairway_pct=(rounds['fairways_hit'] / 14 * 100).round(1),
    )`,
      // New columns built with a fresh 0..n-1 index and joined: they land on the wrong rows once the index has gaps.
      `def add_metrics(rounds):
    putting = np.where(rounds['putts'] <= 30, 'good', 'needs work')
    extra = pd.DataFrame({
        'strokes_per_hole': (rounds['score'] / 18).round(2).to_numpy(),
        'putting': np.where(rounds['putts'].isna(), 'unknown', putting),
        'fairway_pct': (rounds['fairways_hit'] / 14 * 100).round(1).to_numpy(),
    })
    return rounds.join(extra)`,
    ],
  },
  {
    id: 'missing-data',
    title: 'Lost balls: isna, fillna, and dropna',
    difficulty: 'easy',
    lesson: `
      <p>pandas marks a missing value as <code>NaN</code> (or <code>None</code> / <code>NaT</code>). Find them with
      <code>isna()</code> (and <code>notna()</code>); count them per column with <code>isna().sum()</code>:</p>
      <pre>rounds.isna().sum()          # missing values per column
rounds['weather'].isna()     # a True/False mask, one per row</pre>
      <p><code>fillna(value)</code> replaces missing values; <code>dropna()</code> drops rows that have any. Pass
      <code>subset=[...]</code> so you only drop rows missing what you care about. Both return a new object:</p>
      <pre>rounds['weather'].fillna('Unknown')
rounds.dropna(subset=['weather'])    # rows with a weather value</pre>
      <p>Statistics skip missing values: <code>mean()</code> and <code>median()</code> use only what's there. Order
      matters: record which values were missing <em>before</em> you fill them, or the information is gone. And
      in pandas 3, <code>df['col'].fillna(x, inplace=True)</code> no longer changes <code>df</code>: assign the
      result instead.</p>`,
    interview: `Every take-home has missing data, and "how did you handle it, and why?" is a standard question.
      A strong answer says how many values were missing, keeps a flag column so the fill is visible, and picks the
      median over the mean when outliers could skew it.`,
    yardage: `<code>players</code>: <code>handicap</code> (missing for some players) and
      <code>home_course_id</code> (missing for players without a home club, which is why it's float64).
      <code>dues</code> has gaps too, but leave it alone. <br><strong>SQL equivalent:</strong>
      <code>SELECT *, handicap IS NOT NULL AS has_handicap, COALESCE(handicap, (median)) … WHERE home_course_id IS
      NOT NULL</code>.`,
    task: `Write <code>def fill_gaps(players)</code> that returns a DataFrame of the players who have a home course
      (drop rows where <code>home_course_id</code> is missing, and only those). In it, <code>handicap</code>'s missing
      values are filled with the median of all recorded handicaps (computed over every player, before dropping
      anyone), and a new last column <code>has_handicap</code> is True where the player's handicap was recorded
      and False where it was filled in. The index isn't graded.`,
    solution: `def fill_gaps(players):
    median = players['handicap'].median()
    return (
        players
        .assign(handicap=players['handicap'].fillna(median),
                has_handicap=players['handicap'].notna())
        .dropna(subset=['home_course_id'])
    )`,
    hint: 'Compute <code>players[\'handicap\'].median()</code> first. Then <code>assign</code> the filled column and '
      + 'the <code>notna()</code> flag, both from the original <code>handicap</code>, and finish with '
      + '<code>dropna(subset=[\'home_course_id\'])</code>.',
    checker: {
      type: 'dataframe',
      function: 'fill_gaps',
      frames: ['players'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different member list' },
        { setup: "players['handicap'] = players['handicap'].fillna(9.9)", hidden: true, label: 'every handicap recorded' },
        { setup: "players = players[players['handicap'].isna() | (players['handicap'] > 8)]", hidden: true, label: 'mostly missing handicaps' },
      ],
    },
    alternatives: [
      `def fill_gaps(players):
    out = players.copy()
    out['has_handicap'] = out['handicap'].notna()
    out['handicap'] = out['handicap'].fillna(out['handicap'].median())
    return out[out['home_course_id'].notna()]`,
    ],
    mistakes: [
      // The mean, not the median.
      `def fill_gaps(players):
    return (players
            .assign(handicap=players['handicap'].fillna(players['handicap'].mean()),
                    has_handicap=players['handicap'].notna())
            .dropna(subset=['home_course_id']))`,
      // dropna() with no subset also drops players with missing dues.
      `def fill_gaps(players):
    return (players
            .assign(handicap=players['handicap'].fillna(players['handicap'].median()),
                    has_handicap=players['handicap'].notna())
            .dropna())`,
      // The flag is computed after filling, so it's always True.
      `def fill_gaps(players):
    out = players.assign(handicap=players['handicap'].fillna(players['handicap'].median()))
    return out.assign(has_handicap=out['handicap'].notna()).dropna(subset=['home_course_id'])`,
      // The median I saw in the data panel, hardcoded.
      `def fill_gaps(players):
    return (players
            .assign(handicap=players['handicap'].fillna(5.45),
                    has_handicap=players['handicap'].notna())
            .dropna(subset=['home_course_id']))`,
    ],
  },
  {
    id: 'aggregates',
    title: 'Season stats: aggregates and value_counts',
    difficulty: 'medium',
    lesson: `
      <p>Aggregates collapse a column to one value: <code>sum</code>, <code>mean</code>, <code>median</code>,
      <code>min</code>, <code>max</code>, <code>count</code> (non-missing values), and <code>nunique</code>
      (distinct values). All of them skip missing values. <code>len(df)</code> counts rows, missing or not.</p>
      <pre>courses['yardage'].median()
players['country'].nunique()     # distinct countries
players['handicap'].count()      # players with a handicap recorded</pre>
      <p><code>value_counts()</code> counts each distinct value, most common first. With
      <code>normalize=True</code> it gives shares instead of counts. Missing values are left out of both the counts
      and the denominator unless you pass <code>dropna=False</code>.</p>
      <pre>players['is_pro'].value_counts()                 # True/False counts
players['is_pro'].value_counts(normalize=True)   # shares, summing to 1</pre>
      <p>Careful with "the most common value" when there's a tie: <code>value_counts().idxmax()</code> just takes
      whichever tied value comes first in the data. <code>mode()</code> returns <em>every</em> most common value,
      sorted, so <code>mode()[0]</code> is the alphabetically first one.</p>`,
    interview: `Metric definitions are where interviewers probe: is "players" rows or distinct people? Do missing
      values count in the denominator? Which value wins a tie? State each choice out loud. <code>count</code> vs
      <code>nunique</code> vs <code>len</code> is the pandas version of <code>COUNT(col)</code> vs
      <code>COUNT(DISTINCT col)</code> vs <code>COUNT(*)</code>.`,
    yardage: `<code>rounds</code>: <code>player_id</code> (players play many rounds), <code>score</code>,
      <code>putts</code> and <code>weather</code> (each missing for a few rounds). <br><strong>SQL
      equivalent:</strong> <code>SELECT COUNT(*), COUNT(DISTINCT player_id), ROUND(AVG(score), 2) FROM rounds</code>,
      plus <code>SELECT weather, COUNT(*) … GROUP BY weather ORDER BY 2 DESC, weather LIMIT 1</code>.`,
    task: `Write <code>def season_summary(rounds)</code> that returns a Series with these six entries, in this order
      (the index labels are the names): <code>rounds</code> (number of rounds), <code>players</code> (number of
      distinct players), <code>avg_score</code> (mean score rounded to 2 decimals), <code>median_putts</code> (median
      of the recorded putts), <code>top_weather</code> (the most common recorded weather; on a tie, the
      alphabetically first), and <code>top_weather_share</code> (that weather's percentage of the rounds that
      <em>have</em> a weather recorded, rounded to 1 decimal).`,
    solution: `def season_summary(rounds):
    weather = rounds['weather']
    top = weather.mode()[0]
    share = weather.value_counts(normalize=True)[top] * 100
    return pd.Series({
        'rounds': len(rounds),
        'players': rounds['player_id'].nunique(),
        'avg_score': round(rounds['score'].mean(), 2),
        'median_putts': rounds['putts'].median(),
        'top_weather': top,
        'top_weather_share': round(share, 1),
    })`,
    hint: '<code>len</code>, <code>nunique()</code>, <code>mean()</code>, and <code>median()</code> give the first '
      + 'four. For the weather, <code>mode()[0]</code> breaks ties alphabetically, and '
      + '<code>value_counts(normalize=True)</code> gives shares of the recorded values.',
    checker: {
      type: 'dataframe',
      function: 'season_summary',
      frames: ['rounds'],
      returns: 'Series',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds = rounds.head(200)\nrounds['weather'] = np.where(rounds.index % 2 == 0, 'Windy', 'Calm')", hidden: true, label: 'a tie for the most common weather' },
        { setup: "rounds.loc[rounds.index % 3 == 0, 'weather'] = np.nan", hidden: true, label: 'weather missing for a third of the rounds' },
      ],
    },
    alternatives: [
      `def season_summary(rounds):
    counts = rounds['weather'].value_counts()
    top = sorted(counts[counts == counts.max()].index)[0]
    return pd.Series(
        [len(rounds), rounds['player_id'].nunique(),
         rounds['score'].mean().round(2), rounds['putts'].median(),
         top, (counts[top] / counts.sum() * 100).round(1)],
        index=['rounds', 'players', 'avg_score', 'median_putts',
               'top_weather', 'top_weather_share'],
    )`,
    ],
    mistakes: [
      // count() counts rows with a player_id, not distinct players.
      `def season_summary(rounds):
    top = rounds['weather'].mode()[0]
    return pd.Series({
        'rounds': len(rounds), 'players': rounds['player_id'].count(),
        'avg_score': round(rounds['score'].mean(), 2), 'median_putts': rounds['putts'].median(),
        'top_weather': top, 'top_weather_share': round(rounds['weather'].value_counts(normalize=True)[top] * 100, 1),
    })`,
      // The mean of putts, not the median.
      `def season_summary(rounds):
    top = rounds['weather'].mode()[0]
    return pd.Series({
        'rounds': len(rounds), 'players': rounds['player_id'].nunique(),
        'avg_score': round(rounds['score'].mean(), 2), 'median_putts': rounds['putts'].mean(),
        'top_weather': top, 'top_weather_share': round(rounds['weather'].value_counts(normalize=True)[top] * 100, 1),
    })`,
      // Rounds with no weather recorded in the denominator.
      `def season_summary(rounds):
    top = rounds['weather'].mode()[0]
    return pd.Series({
        'rounds': len(rounds), 'players': rounds['player_id'].nunique(),
        'avg_score': round(rounds['score'].mean(), 2), 'median_putts': rounds['putts'].median(),
        'top_weather': top, 'top_weather_share': round((rounds['weather'] == top).sum() / len(rounds) * 100, 1),
    })`,
      // idxmax takes whichever tied value comes first, not the alphabetically first.
      `def season_summary(rounds):
    counts = rounds['weather'].value_counts()
    top = counts.idxmax()
    return pd.Series({
        'rounds': len(rounds), 'players': rounds['player_id'].nunique(),
        'avg_score': round(rounds['score'].mean(), 2), 'median_putts': rounds['putts'].median(),
        'top_weather': top, 'top_weather_share': round(counts[top] / counts.sum() * 100, 1),
    })`,
    ],
  },
  {
    id: 'groupby-one',
    title: 'Course by course: groupby with one aggregate',
    difficulty: 'medium',
    lesson: `
      <p><code>groupby</code> is split, apply, combine: split the rows by a key, apply an aggregate to each group,
      and combine the results. Grouping one column gives a Series indexed by the key, sorted by it:</p>
      <pre>players.groupby('country')['handicap'].mean()</pre>
      <p>Read it as SQL: <code>SELECT country, AVG(handicap) FROM players GROUP BY country</code>. The key ends up
      in the index, not a column. That's what you want for a lookup Series; call <code>reset_index()</code> when you
      want a flat table instead.</p>
      <p>Like SQL, the aggregate skips missing values, and a group whose values are <em>all</em> missing gets NaN
      (it doesn't disappear). Filtering out missing rows <em>before</em> grouping is different: a group with
      nothing left vanishes from the result. Other shortcuts can drop groups too: <code>pivot_table</code> leaves out
      a group that's entirely missing.</p>
      <pre>players.groupby('country')['handicap'].agg(['mean', 'count'])</pre>`,
    interview: `Know which rows each step keeps. "Average putts per course" and "average putts per course among
      courses with putts recorded" differ by exactly the groups that vanish when you <code>dropna()</code> first.
      Interviewers like to ask what happens to a course with no data.`,
    yardage: `<code>rounds</code>: <code>course_id</code> and <code>putts</code> (missing for some rounds).
      <br><strong>SQL equivalent:</strong> <code>SELECT course_id, ROUND(AVG(putts), 2) FROM rounds GROUP BY
      course_id ORDER BY course_id</code>.`,
    task: `Write <code>def putts_by_course(rounds)</code> that returns a Series indexed by <code>course_id</code>
      (ascending, one entry per course that has rounds) with the average recorded putts per round, rounded to 2
      decimals. A course whose rounds have no putts recorded at all still appears, with a missing value (NaN).`,
    solution: `def putts_by_course(rounds):
    return (
        rounds
        .groupby('course_id')['putts']
        .mean()
        .round(2)
    )`,
    hint: 'One line of SQL, one chain of pandas: <code>rounds.groupby(\'course_id\')[\'putts\'].mean().round(2)</code>. '
      + 'Don\'t drop missing putts first: <code>mean()</code> already skips them.',
    checker: {
      type: 'dataframe',
      function: 'putts_by_course',
      frames: ['rounds'],
      returns: 'Series',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds.loc[rounds['course_id'] == 3, 'putts'] = np.nan", hidden: true, label: 'a course with no putts recorded' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=3)', hidden: true, label: 'rows arrive shuffled' },
      ],
    },
    alternatives: [
      `def putts_by_course(rounds):
    totals = rounds.groupby('course_id').agg(avg=('putts', 'mean'))
    return totals['avg'].round(2)`,
    ],
    mistakes: [
      // sum, not mean.
      `def putts_by_course(rounds):
    return rounds.groupby('course_id')['putts'].sum().round(2)`,
      // Missing putts counted as 0.
      `def putts_by_course(rounds):
    return rounds.fillna({'putts': 0}).groupby('course_id')['putts'].mean().round(2)`,
      // Dropping missing putts first makes a course with none vanish.
      `def putts_by_course(rounds):
    return rounds.dropna(subset=['putts']).groupby('course_id')['putts'].mean().round(2)`,
      // pivot_table leaves out a course whose putts are all missing.
      `def putts_by_course(rounds):
    table = rounds.pivot_table(index='course_id', values='putts', aggfunc='mean')
    return table['putts'].round(2)`,
      // A DataFrame, not a Series.
      `def putts_by_course(rounds):
    return rounds.groupby('course_id', as_index=False)['putts'].mean().round(2)`,
    ],
  },
  {
    id: 'named-agg',
    title: 'Player cards: named aggregation and reset_index',
    difficulty: 'medium',
    lesson: `
      <p>For several aggregates at once, <strong>named aggregation</strong> gives each result column a name and says
      which column and function produce it: <code>new_name=('column', 'function')</code>.</p>
      <pre>(players
    .groupby('country')
    .agg(members=('player_id', 'count'),
         best=('handicap', 'min'),
         avg=('handicap', 'mean'))
    .reset_index())</pre>
      <p>The group key lands in the index; <code>reset_index()</code> moves it back to a regular column and gives a
      fresh 0, 1, 2, … index. (<code>groupby(..., as_index=False)</code> does the same.) Round several columns at
      once with <code>round({'avg': 2})</code>.</p>
      <p>Pick the counting function carefully: <code>'count'</code> counts non-missing values in that column,
      <code>'size'</code> counts rows, and <code>'nunique'</code> counts distinct values.</p>`,
    interview: `This is the most common pandas pattern in take-homes. Named aggregation reads like the SQL
      <code>SELECT … AS …</code> list, and interviewers notice when column names come straight out of
      <code>agg</code> instead of a <code>rename</code> afterwards. Forgetting <code>reset_index()</code> is the
      classic slip.`,
    yardage: `<code>rounds</code>: <code>player_id</code>, <code>round_id</code>, <code>score</code>, and
      <code>putts</code> (missing for some rounds). <br><strong>SQL equivalent:</strong> <code>SELECT player_id,
      COUNT(*) AS rounds, MIN(score) AS best, ROUND(AVG(score), 2) AS avg_score, COUNT(putts) AS putts_recorded FROM
      rounds GROUP BY player_id</code>.`,
    task: `Write <code>def player_report(rounds)</code> that returns a DataFrame with one row per
      <code>player_id</code>, ordered by player_id, with a fresh 0, 1, 2, … index and these columns in order:
      <code>player_id</code>, <code>rounds</code> (number of rounds), <code>best</code> (lowest score),
      <code>avg_score</code> (mean score, rounded to 2 decimals), and <code>putts_recorded</code> (how many of the
      player's rounds have putts recorded; 0 if none).`,
    solution: `def player_report(rounds):
    return (
        rounds
        .groupby('player_id')
        .agg(
            rounds=('round_id', 'count'),
            best=('score', 'min'),
            avg_score=('score', 'mean'),
            putts_recorded=('putts', 'count'),
        )
        .round({'avg_score': 2})
        .reset_index()
    )`,
    hint: 'Use named aggregation: <code>.agg(rounds=(\'round_id\', \'count\'), best=(\'score\', \'min\'), ...)</code>. '
      + '<code>(\'putts\', \'count\')</code> counts recorded putts. Finish with <code>.round({\'avg_score\': 2})</code> '
      + 'and <code>.reset_index()</code>.',
    checker: {
      type: 'dataframe',
      function: 'player_report',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds.loc[rounds['player_id'] == 5, 'putts'] = np.nan", hidden: true, label: 'a player with no putts recorded' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=11)', hidden: true, label: 'rows arrive shuffled' },
      ],
    },
    alternatives: [
      `def player_report(rounds):
    report = rounds.groupby('player_id', as_index=False).agg(
        rounds=('score', 'size'),
        best=('score', 'min'),
        avg_score=('score', 'mean'),
        putts_recorded=('putts', 'count'),
    )
    report['avg_score'] = report['avg_score'].round(2)
    return report`,
    ],
    mistakes: [
      // Forgot reset_index: player_id is still the index.
      `def player_report(rounds):
    return (rounds.groupby('player_id')
            .agg(rounds=('round_id', 'count'), best=('score', 'min'),
                 avg_score=('score', 'mean'), putts_recorded=('putts', 'count'))
            .round({'avg_score': 2}))`,
      // size counts every round, putts or not.
      `def player_report(rounds):
    return (rounds.groupby('player_id')
            .agg(rounds=('round_id', 'count'), best=('score', 'min'),
                 avg_score=('score', 'mean'), putts_recorded=('putts', 'size'))
            .round({'avg_score': 2}).reset_index())`,
      // max is the worst round, not the best.
      `def player_report(rounds):
    return (rounds.groupby('player_id')
            .agg(rounds=('round_id', 'count'), best=('score', 'max'),
                 avg_score=('score', 'mean'), putts_recorded=('putts', 'count'))
            .round({'avg_score': 2}).reset_index())`,
      // Counting recorded putts from a filtered copy: a player with none gets NaN, not 0.
      `def player_report(rounds):
    report = (rounds.groupby('player_id')
              .agg(rounds=('round_id', 'count'), best=('score', 'min'), avg_score=('score', 'mean'))
              .round({'avg_score': 2}))
    report['putts_recorded'] = rounds.dropna(subset=['putts']).groupby('player_id').size()
    return report.reset_index()`,
    ],
  },
  {
    id: 'groupby-keys',
    title: 'Course conditions: groupby on several keys',
    difficulty: 'medium',
    lesson: `
      <p>Pass a list to group by every combination of several keys. The result has a <strong>MultiIndex</strong>
      (one level per key) until you reset it:</p>
      <pre>(players
    .groupby(['country', 'is_pro'])
    .agg(members=('player_id', 'count'))
    .reset_index())</pre>
      <p>Filter groups by an aggregate <em>after</em> grouping, like SQL's <code>HAVING</code>, with a mask or
      <code>query</code>. Inside a query string, refer to columns by name:</p>
      <pre>by_country.query('members &gt;= 2')</pre>
      <p>Rows whose key is missing are left out of the groups by default (<code>dropna=True</code>), like SQL's
      <code>WHERE key IS NOT NULL</code>. Pass <code>dropna=False</code> to keep them as their own group.</p>`,
    interview: `"Which combinations have enough data to trust?" is a real analysis question, and the
      <code>HAVING</code>-style filter after a multi-key groupby is how you answer it. Mention the threshold and why
      small groups make averages noisy.`,
    yardage: `<code>rounds</code>: <code>course_id</code>, <code>weather</code> (missing for a few rounds),
      <code>round_id</code>, and <code>score</code>. <br><strong>SQL equivalent:</strong> <code>SELECT course_id,
      weather, COUNT(*) AS rounds, ROUND(AVG(score), 1) AS avg_score FROM rounds WHERE weather IS NOT NULL GROUP BY
      course_id, weather HAVING COUNT(*) &gt;= 3 ORDER BY course_id, weather</code>.`,
    task: `Write <code>def course_weather(rounds)</code> that returns a DataFrame with one row per
      (<code>course_id</code>, <code>weather</code>) combination that has at least 3 rounds, leaving out rounds with
      no weather recorded. Columns, in order: <code>course_id</code>, <code>weather</code>, <code>rounds</code>
      (number of rounds), and <code>avg_score</code> (mean score, rounded to 1 decimal). Order the rows by course_id,
      then weather (alphabetically). The index isn't graded.`,
    solution: `def course_weather(rounds):
    return (
        rounds
        .groupby(['course_id', 'weather'])
        .agg(rounds=('round_id', 'count'), avg_score=('score', 'mean'))
        .query('rounds >= 3')
        .round({'avg_score': 1})
        .reset_index()
    )`,
    hint: 'Group by both keys with a list, aggregate with named aggregation, then filter the groups with '
      + '<code>.query(\'rounds &gt;= 3\')</code> and <code>reset_index()</code>. Rows with no weather drop out of '
      + 'the groups on their own.',
    checker: {
      type: 'dataframe',
      function: 'course_weather',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: "rounds.loc[rounds['course_id'] == 1, 'weather'] = np.nan", hidden: true, label: 'no weather recorded at one course' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=5)', hidden: true, label: 'rows arrive shuffled' },
      ],
    },
    alternatives: [
      `def course_weather(rounds):
    known = rounds.dropna(subset=['weather'])
    grouped = known.groupby(['course_id', 'weather'], as_index=False)
    out = grouped.agg(rounds=('score', 'size'), avg_score=('score', 'mean'))
    out = out[out['rounds'] >= 3]
    return out.assign(avg_score=out['avg_score'].round(1))`,
    ],
    mistakes: [
      // Strictly more than 3.
      `def course_weather(rounds):
    return (rounds.groupby(['course_id', 'weather'])
            .agg(rounds=('round_id', 'count'), avg_score=('score', 'mean'))
            .query('rounds > 3').round({'avg_score': 1}).reset_index())`,
      // Missing weather kept as its own group.
      `def course_weather(rounds):
    return (rounds.groupby(['course_id', 'weather'], dropna=False)
            .agg(rounds=('round_id', 'count'), avg_score=('score', 'mean'))
            .query('rounds >= 3').round({'avg_score': 1}).reset_index())`,
      // Forgot reset_index: course_id and weather stay in a MultiIndex.
      `def course_weather(rounds):
    return (rounds.groupby(['course_id', 'weather'])
            .agg(rounds=('round_id', 'count'), avg_score=('score', 'mean'))
            .query('rounds >= 3').round({'avg_score': 1}))`,
      // Filtered rounds before grouping (WHERE instead of HAVING).
      `def course_weather(rounds):
    return (rounds[rounds['score'] >= 3].groupby(['course_id', 'weather'])
            .agg(rounds=('round_id', 'count'), avg_score=('score', 'mean'))
            .round({'avg_score': 1}).reset_index())`,
    ],
  },
  {
    id: 'merge-inner',
    title: 'Pairings: merge, join keys, suffixes, and many-to-one',
    difficulty: 'medium',
    lesson: `
      <p><code>merge</code> is SQL's <code>JOIN</code>. Name the key with <code>on</code> (or
      <code>left_on</code>/<code>right_on</code> when the names differ). The default is an <strong>inner</strong>
      join: rows without a match on the other side are dropped.</p>
      <pre>homes = players.merge(courses, left_on='home_course_id',
                      right_on='course_id')</pre>
      <p>When both tables have a column with the same name that isn't the key (here <code>name</code> and
      <code>country</code>), pandas keeps both and adds <strong>suffixes</strong>: <code>_x</code> and
      <code>_y</code> by default. Choose readable ones with <code>suffixes=('_player', '_course')</code>, or rename
      first.</p>
      <p>Joining many rows to one (many rounds to one course) is <strong>many-to-one</strong>. If the "one" side
      accidentally has duplicate keys, every match is silently doubled. <code>validate='many_to_one'</code> makes
      pandas raise an error instead. An inner merge keeps the left table's row order, but don't rely on the
      input order: sort the result if the order matters.</p>`,
    interview: `After any join, an interviewer expects you to check the row count. "Did it go up (duplicate keys)?
      Did it go down (unmatched rows)?" <code>validate=</code> turns that check into code, and saying so shows you've
      been bitten before.`,
    yardage: `<code>rounds</code> (<code>player_id</code>, <code>course_id</code>, <code>score</code>; a few rounds
      belong to deleted accounts not in <code>players</code>), <code>players</code> (<code>name</code>,
      <code>country</code>), and <code>courses</code> (<code>name</code>, <code>country</code>, <code>par</code>).
      <br><strong>SQL equivalent:</strong> <code>SELECT r.round_id, p.name AS player, c.name AS course, r.score,
      r.score - c.par AS to_par FROM rounds r JOIN players p USING (player_id) JOIN courses c USING (course_id) ORDER
      BY r.round_id</code>.`,
    task: `Write <code>def round_details(rounds, players, courses)</code> that returns a DataFrame with one row per
      round whose player is in <code>players</code> (leave out rounds by unknown players), ordered by
      <code>round_id</code>, with these columns in order: <code>round_id</code>, <code>player</code> (the player's
      name, as written in players), <code>course</code> (the course's name), <code>score</code>, and
      <code>to_par</code> (score minus the course's par). The index isn't graded.`,
    solution: `def round_details(rounds, players, courses):
    return (
        rounds
        .merge(players, on='player_id', validate='many_to_one')
        .merge(
            courses,
            on='course_id',
            suffixes=('_player', '_course'),
            validate='many_to_one',
        )
        .assign(to_par=lambda df: df['score'] - df['par'])
        .rename(columns={'name_player': 'player', 'name_course': 'course'})
        .sort_values('round_id')
        [['round_id', 'player', 'course', 'score', 'to_par']]
    )`,
    hint: 'Merge twice: <code>rounds.merge(players, on=\'player_id\')</code>, then '
      + '<code>.merge(courses, on=\'course_id\', suffixes=(\'_player\', \'_course\'))</code>. Both have a '
      + '<code>name</code> column, hence the suffixes. Then rename, add <code>to_par</code>, and sort by round_id.',
    checker: {
      type: 'dataframe',
      function: 'round_details',
      frames: ['rounds', 'players', 'courses'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season and member list' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=2)', hidden: true, label: 'rounds arrive shuffled' },
        { setup: "rounds = rounds[rounds['player_id'].isin(players['player_id'])]", hidden: true, label: 'no rounds by unknown players' },
      ],
    },
    alternatives: [
      `def round_details(rounds, players, courses):
    names = players.set_index('player_id')['name']
    course = courses.set_index('course_id')
    known = rounds[rounds['player_id'].isin(names.index)]
    out = pd.DataFrame({
        'round_id': known['round_id'],
        'player': known['player_id'].map(names),
        'course': known['course_id'].map(course['name']),
        'score': known['score'],
        'to_par': known['score'] - known['course_id'].map(course['par']),
    })
    return out.sort_values('round_id')`,
    ],
    mistakes: [
      // A left merge keeps rounds by deleted accounts, with no name.
      `def round_details(rounds, players, courses):
    out = (rounds.merge(players, on='player_id', how='left')
           .merge(courses, on='course_id', suffixes=('_player', '_course')))
    out = out.rename(columns={'name_player': 'player', 'name_course': 'course'})
    return out.assign(to_par=out['score'] - out['par']).sort_values('round_id')[
        ['round_id', 'player', 'course', 'score', 'to_par']]`,
      // Relies on the rounds arriving in round_id order.
      `def round_details(rounds, players, courses):
    out = (rounds.merge(players, on='player_id')
           .merge(courses, on='course_id', suffixes=('_player', '_course')))
    out = out.rename(columns={'name_player': 'player', 'name_course': 'course'})
    return out.assign(to_par=out['score'] - out['par'])[['round_id', 'player', 'course', 'score', 'to_par']]`,
      // Default suffixes: name_x is the player, name_y the course; swapped here.
      `def round_details(rounds, players, courses):
    out = rounds.merge(players, on='player_id').merge(courses, on='course_id')
    out = out.rename(columns={'name_y': 'player', 'name_x': 'course'})
    return out.assign(to_par=out['score'] - out['par']).sort_values('round_id')[
        ['round_id', 'player', 'course', 'score', 'to_par']]`,
      // to_par the wrong way round.
      `def round_details(rounds, players, courses):
    out = (rounds.merge(players, on='player_id')
           .merge(courses, on='course_id', suffixes=('_player', '_course')))
    out = out.rename(columns={'name_player': 'player', 'name_course': 'course'})
    return out.assign(to_par=out['par'] - out['score']).sort_values('round_id')[
        ['round_id', 'player', 'course', 'score', 'to_par']]`,
    ],
  },
  {
    id: 'merge-left-anti',
    title: 'Missing the cut: left merges and the anti-join',
    difficulty: 'medium',
    lesson: `
      <p>A <strong>left</strong> merge (<code>how='left'</code>) keeps every row of the left table; where there's no
      match, the right table's columns are NaN. It's how you attach optional information without losing rows.</p>
      <p>An <strong>anti-join</strong> keeps the left rows that have <em>no</em> match. pandas has no anti-join
      keyword, but <code>indicator=True</code> adds a <code>_merge</code> column saying where each row came from:
      <code>'both'</code>, <code>'left_only'</code>, or <code>'right_only'</code>.</p>
      <pre>tagged = courses.merge(rounds[['course_id']].drop_duplicates(),
                       on='course_id', how='left', indicator=True)
never_played = tagged[tagged['_merge'] == 'left_only']</pre>
      <p>(<code>drop_duplicates()</code> first, so each course matches at most once.) The same check without a
      merge: <code>courses[~courses['course_id'].isin(rounds['course_id'])]</code>.</p>
      <p>Join keys must have compatible types. Here <code>home_course_id</code> is float64 (it has gaps) while
      <code>course_id</code> is int64; pandas matches 3.0 with 3, so the merge works.</p>`,
    interview: `"Find customers who never ordered" is the anti-join, and it's asked constantly. Know both versions
      (merge with <code>indicator=True</code>, and <code>~isin</code>), and say why an inner merge can't answer it:
      it throws away exactly the rows you're looking for.`,
    yardage: `<code>players</code> (<code>home_course_id</code> is missing for players without a home club),
      <code>rounds</code> (<code>player_id</code>), and <code>courses</code> (<code>course_id</code>,
      <code>name</code>). <br><strong>SQL equivalent:</strong> <code>SELECT p.player_id, p.name, c.name AS
      home_course FROM players p LEFT JOIN rounds r USING (player_id) LEFT JOIN courses c ON c.course_id =
      p.home_course_id WHERE r.player_id IS NULL ORDER BY p.player_id</code>.`,
    task: `Write <code>def inactive_members(players, rounds, courses)</code> that returns a DataFrame of the players
      who have never played a round, ordered by <code>player_id</code>, with these columns in order:
      <code>player_id</code>, <code>name</code>, and <code>home_course</code> (the name of their home course, or a
      missing value if they have none). The index isn't graded.`,
    solution: `def inactive_members(players, rounds, courses):
    played = rounds[['player_id']].drop_duplicates()
    homes = courses[['course_id', 'name']].rename(
        columns={'course_id': 'home_course_id', 'name': 'home_course'}
    )
    return (
        players
        .merge(played, on='player_id', how='left', indicator=True)
        .query('_merge == "left_only"')
        .merge(homes, on='home_course_id', how='left')
        .sort_values('player_id')
        [['player_id', 'name', 'home_course']]
    )`,
    hint: 'Left-merge <code>players</code> with the distinct <code>player_id</code>s of rounds using '
      + '<code>indicator=True</code> and keep <code>_merge == \'left_only\'</code>. Then left-merge the courses '
      + '(renamed to <code>home_course_id</code> / <code>home_course</code>) so players without a home club stay.',
    checker: {
      type: 'dataframe',
      function: 'inactive_members',
      frames: ['players', 'rounds', 'courses'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season and member list' },
        { setup: "rounds = rounds[~rounds['player_id'].isin([1, 2, 3])]", hidden: true, label: 'more members who never played' },
        { setup: "players = players[players['player_id'].isin(rounds['player_id'])]", hidden: true, label: 'everyone has played' },
      ],
    },
    alternatives: [
      `def inactive_members(players, rounds, courses):
    idle = players[~players['player_id'].isin(rounds['player_id'])]
    names = courses.set_index('course_id')['name']
    return pd.DataFrame({
        'player_id': idle['player_id'],
        'name': idle['name'],
        'home_course': idle['home_course_id'].map(names),
    }).sort_values('player_id')`,
    ],
    mistakes: [
      // An inner merge keeps only the players who HAVE played, so nothing is left_only.
      `def inactive_members(players, rounds, courses):
    tagged = players.merge(rounds[['player_id']].drop_duplicates(), on='player_id', indicator=True)
    idle = tagged[tagged['_merge'] == 'left_only']
    homes = courses.rename(columns={'course_id': 'home_course_id', 'name': 'home_course'})
    return idle.merge(homes[['home_course_id', 'home_course']], on='home_course_id', how='left')[
        ['player_id', 'name', 'home_course']]`,
      // An inner merge with courses drops members who have no home club.
      `def inactive_members(players, rounds, courses):
    idle = players[~players['player_id'].isin(rounds['player_id'])]
    homes = courses.rename(columns={'course_id': 'home_course_id', 'name': 'home_course'})
    return idle.merge(homes[['home_course_id', 'home_course']], on='home_course_id').sort_values('player_id')[
        ['player_id', 'name', 'home_course']]`,
      // right_only: rounds by players who aren't members.
      `def inactive_members(players, rounds, courses):
    tagged = players.merge(rounds[['player_id']].drop_duplicates(), on='player_id', how='outer', indicator=True)
    idle = tagged[tagged['_merge'] == 'right_only']
    homes = courses.rename(columns={'course_id': 'home_course_id', 'name': 'home_course'})
    return idle.merge(homes[['home_course_id', 'home_course']], on='home_course_id', how='left')[
        ['player_id', 'name', 'home_course']]`,
      // Hardcoded: the ids I saw in the visible data.
      `def inactive_members(players, rounds, courses):
    idle = players[players['player_id'].isin([13, 14, 15, 16, 29, 30])]
    homes = courses.rename(columns={'course_id': 'home_course_id', 'name': 'home_course'})
    return idle.merge(homes[['home_course_id', 'home_course']], on='home_course_id', how='left')[
        ['player_id', 'name', 'home_course']]`,
    ],
  },
  {
    id: 'concat',
    title: 'Two scorecards, one history: concat and aligning columns',
    difficulty: 'medium',
    lesson: `
      <p><code>pd.concat([a, b])</code> stacks DataFrames on top of each other (SQL's <code>UNION ALL</code>). It
      lines columns up <strong>by name</strong>, not position: a column only one side has is filled with NaN on the
      other side's rows, and the result has every column from both.</p>
      <pre>spring = rounds.head(3).assign(season='spring')
extra = pd.DataFrame({'round_id': [900], 'score': [70]})
pd.concat([spring, extra], ignore_index=True)</pre>
      <p>So when two sources name the same thing differently, <code>rename(columns={...})</code> first, or you get
      two half-empty columns. <code>ignore_index=True</code> gives the result a fresh 0, 1, 2, … index; without it
      each piece keeps its own labels and you get duplicates (two rows labeled 0). Select the columns you want, in
      the order you want, at the end.</p>
      <p>Prefer renaming with a dict over overwriting <code>df.columns = [...]</code>: a positional list silently
      mislabels everything the day a column moves.</p>`,
    interview: `Combining exports from two systems is everyday work, and the bugs are always the same: columns that
      don't line up, duplicated index labels, and silently mislabeled data. Renaming by name and checking the
      column list after the concat is what a careful analyst does.`,
    yardage: `<code>rounds</code> (this season, from the app) and <code>legacy_rounds</code> (last season, from the
      old app: <code>id</code>, <code>date</code>, <code>course</code>, <code>player</code>, <code>total</code>, and
      per-hole <code>h1</code> … <code>h18</code>). <br><strong>SQL equivalent:</strong> <code>SELECT id AS
      round_id, player AS player_id, course AS course_id, date AS played_on, total AS score, NULL AS putts, …,
      'legacy' AS source FROM legacy_rounds UNION ALL SELECT *, 'app' FROM rounds</code>.`,
    task: `Write <code>def full_history(rounds, legacy_rounds)</code> that returns one DataFrame with last season's
      legacy rounds first, then this season's rounds. Rename the legacy columns to match: <code>id</code> →
      <code>round_id</code>, <code>date</code> → <code>played_on</code>, <code>course</code> →
      <code>course_id</code>, <code>player</code> → <code>player_id</code>, <code>total</code> → <code>score</code>.
      The columns are exactly <code>rounds</code>' columns in <code>rounds</code>' order, plus a last column
      <code>source</code> (<code>'legacy'</code> or <code>'app'</code>). Columns the legacy app didn't record are
      missing values, the per-hole columns are left out, and the index is a fresh 0, 1, 2, ….`,
    solution: `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.rename(columns={
        'id': 'round_id', 'date': 'played_on', 'course': 'course_id',
        'player': 'player_id', 'total': 'score',
    })
    columns = list(rounds.columns) + ['source']
    return (
        pd.concat(
            [old.assign(source='legacy'), rounds.assign(source='app')],
            ignore_index=True,
        )
        [columns]
    )`,
    hint: 'Rename the legacy columns with a dict, <code>assign(source=...)</code> to each side, then '
      + '<code>pd.concat([old, new], ignore_index=True)</code> and select <code>list(rounds.columns) + '
      + '[\'source\']</code>.',
    checker: {
      type: 'dataframe',
      function: 'full_history',
      frames: ['rounds', 'legacy_rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'different seasons' },
        { setup: "legacy_rounds = legacy_rounds[['player', 'date', 'id', 'total', 'course'] + [f'h{n}' for n in range(1, 19)]]", hidden: true, label: 'the legacy export lists its columns in another order' },
        { setup: 'legacy_rounds = legacy_rounds.head(5)\nrounds = rounds.tail(7)', hidden: true, label: 'a few rounds each, index not starting at 0' },
      ],
    },
    alternatives: [
      `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.rename(columns={
        'id': 'round_id', 'date': 'played_on', 'course': 'course_id',
        'player': 'player_id', 'total': 'score',
    })
    old = old.reindex(columns=rounds.columns).assign(source='legacy')
    both = pd.concat([old, rounds.assign(source='app')])
    return both.reset_index(drop=True)`,
    ],
    mistakes: [
      // Without ignore_index both pieces keep their own labels: 0, 1, 2, … twice.
      `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.rename(columns={'id': 'round_id', 'date': 'played_on', 'course': 'course_id',
                                        'player': 'player_id', 'total': 'score'})
    both = pd.concat([old.assign(source='legacy'), rounds.assign(source='app')])
    return both[list(rounds.columns) + ['source']]`,
      // Positional renaming: right until the legacy columns come in another order.
      `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.copy()
    old.columns = ['round_id', 'played_on', 'course_id', 'player_id', 'score'] + list(old.columns[5:])
    both = pd.concat([old.assign(source='legacy'), rounds.assign(source='app')], ignore_index=True)
    return both[list(rounds.columns) + ['source']]`,
      // This season first.
      `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.rename(columns={'id': 'round_id', 'date': 'played_on', 'course': 'course_id',
                                        'player': 'player_id', 'total': 'score'})
    both = pd.concat([rounds.assign(source='app'), old.assign(source='legacy')], ignore_index=True)
    return both[list(rounds.columns) + ['source']]`,
      // join='inner' keeps only the columns both have, so putts, fairways_hit, and weather vanish.
      `def full_history(rounds, legacy_rounds):
    old = legacy_rounds.rename(columns={'id': 'round_id', 'date': 'played_on', 'course': 'course_id',
                                        'player': 'player_id', 'total': 'score'})
    return pd.concat([old.assign(source='legacy'), rounds.assign(source='app')], join='inner', ignore_index=True)`,
    ],
  },
  {
    id: 'dates',
    title: 'Tee times: to_datetime, the .dt accessor, and monthly trends',
    difficulty: 'hard',
    lesson: `
      <p>CSV dates arrive as text. <code>pd.to_datetime</code> turns them into real dates (dtype
      <code>datetime64</code>), and the <code>.dt</code> accessor reads their parts:</p>
      <pre>joined = pd.to_datetime(players['joined_on'])
joined.dt.year            # 2019, 2020, …
joined.dt.dayofweek       # Monday = 0 … Sunday = 6
joined.dt.day_name()      # 'Monday', …
joined.dt.to_period('M')  # Period('2019-04', 'M'): the calendar month
joined.dt.strftime('%Y-%m')   # back to text, formatted</pre>
      <p>To group by month, group by <code>dt.to_period('M')</code>, or let <code>resample</code> do it: it bins a
      date column into regular periods (<code>'MS'</code> = month starts) and, unlike a plain groupby, creates a row
      for every period in the range, <em>including empty ones</em>:</p>
      <pre>(players
    .assign(joined_on=pd.to_datetime(players['joined_on']))
    .resample('YS', on='joined_on')
    .agg(signups=('player_id', 'count')))</pre>
      <p>Empty periods matter: a chart or a month-over-month comparison built on a series with a missing month is
      silently wrong. Counts in an empty period come out as 0; averages come out NaN, so decide what they should
      be.</p>`,
    interview: `"Monthly active users" is the canonical product-analytics question, and the follow-ups are always
      the same: distinct users or events? What about a month with no activity? Weekends vs weekdays? Converting with
      <code>to_datetime</code> and filling the calendar (instead of trusting <code>groupby</code> on a text prefix)
      shows you've thought about all three.`,
    yardage: `<code>rounds</code>: <code>played_on</code> is text like <code>'2026-03-01'</code>; also
      <code>round_id</code> and <code>player_id</code>. <br><strong>SQL equivalent:</strong> <code>SELECT
      strftime('%Y-%m', played_on) AS month, COUNT(*), COUNT(DISTINCT player_id), ROUND(100.0 * AVG(strftime('%w',
      played_on) IN ('0', '6')), 1) FROM rounds GROUP BY month</code>, plus a calendar table LEFT JOINed in for the
      empty months.`,
    task: `Write <code>def monthly_activity(rounds)</code> that returns a DataFrame with one row per calendar month
      from the month of the first round to the month of the last, <em>including</em> months with no rounds, in
      order. Columns: <code>month</code> (text like <code>'2026-03'</code>), <code>rounds</code> (number of rounds),
      <code>players</code> (distinct players), and <code>weekend_share</code> (the percentage of that month's rounds
      played on a Saturday or Sunday, rounded to 1 decimal; 0.0 for a month with no rounds). The index isn't
      graded.`,
    solution: `def monthly_activity(rounds):
    dated = rounds.assign(played_on=pd.to_datetime(rounds['played_on']))
    monthly = (
        dated
        .assign(weekend=dated['played_on'].dt.dayofweek >= 5)
        .resample('MS', on='played_on')
        .agg(
            rounds=('round_id', 'count'),
            players=('player_id', 'nunique'),
            weekend_share=('weekend', 'mean'),
        )
    )
    return (
        monthly
        .assign(
            month=monthly.index.strftime('%Y-%m'),
            weekend_share=(monthly['weekend_share'] * 100).round(1).fillna(0),
        )
        .reset_index(drop=True)
        [['month', 'rounds', 'players', 'weekend_share']]
    )`,
    hint: 'Convert <code>played_on</code> with <code>pd.to_datetime</code>, flag weekends with '
      + '<code>dt.dayofweek &gt;= 5</code>, then <code>resample(\'MS\', on=\'played_on\')</code> with named aggregation '
      + '(the mean of a True/False column is a share). Empty months come out with a NaN share: fill it with 0.',
    checker: {
      type: 'dataframe',
      function: 'monthly_activity',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different, longer season' },
        { setup: "rounds = rounds[~rounds['played_on'].str.startswith('2026-05')]", hidden: true, label: 'a month with no rounds' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=4)', hidden: true, label: 'rows arrive shuffled' },
        { setup: "rounds = rounds[rounds['played_on'].str.startswith('2026-04')]", hidden: true, label: 'a single month' },
      ],
    },
    alternatives: [
      `def monthly_activity(rounds):
    played = pd.to_datetime(rounds['played_on'])
    tagged = rounds.assign(
        month=played.dt.to_period('M'),
        weekend=played.dt.day_name().isin(['Saturday', 'Sunday']),
    )
    stats = tagged.groupby('month').agg(
        rounds=('round_id', 'size'),
        players=('player_id', 'nunique'),
        weekend=('weekend', 'sum'),
    )
    months = pd.period_range(stats.index.min(), stats.index.max(), freq='M')
    stats = stats.reindex(months, fill_value=0)
    share = (stats['weekend'] / stats['rounds'] * 100).round(1).fillna(0)
    return pd.DataFrame({
        'month': stats.index.astype(str),
        'rounds': stats['rounds'].to_numpy(),
        'players': stats['players'].to_numpy(),
        'weekend_share': share.to_numpy(),
    })`,
    ],
    mistakes: [
      // Grouping by the text prefix: a month with no rounds just isn't there.
      `def monthly_activity(rounds):
    dated = rounds.assign(month=rounds['played_on'].str[:7],
                          weekend=pd.to_datetime(rounds['played_on']).dt.dayofweek >= 5)
    out = dated.groupby('month', as_index=False).agg(
        rounds=('round_id', 'count'), players=('player_id', 'nunique'), weekend_share=('weekend', 'mean'))
    return out.assign(weekend_share=(out['weekend_share'] * 100).round(1))`,
      // Sunday only: dayofweek counts Monday as 0, so Saturday is 5.
      `def monthly_activity(rounds):
    dated = rounds.assign(played_on=pd.to_datetime(rounds['played_on']))
    monthly = (dated.assign(weekend=dated['played_on'].dt.dayofweek >= 6)
               .resample('MS', on='played_on')
               .agg(rounds=('round_id', 'count'), players=('player_id', 'nunique'), weekend_share=('weekend', 'mean')))
    return monthly.assign(month=monthly.index.strftime('%Y-%m'),
                          weekend_share=(monthly['weekend_share'] * 100).round(1).fillna(0)
                          ).reset_index(drop=True)[['month', 'rounds', 'players', 'weekend_share']]`,
      // Rounds counted as players.
      `def monthly_activity(rounds):
    dated = rounds.assign(played_on=pd.to_datetime(rounds['played_on']))
    monthly = (dated.assign(weekend=dated['played_on'].dt.dayofweek >= 5)
               .resample('MS', on='played_on')
               .agg(rounds=('round_id', 'count'), players=('player_id', 'count'), weekend_share=('weekend', 'mean')))
    return monthly.assign(month=monthly.index.strftime('%Y-%m'),
                          weekend_share=(monthly['weekend_share'] * 100).round(1).fillna(0)
                          ).reset_index(drop=True)[['month', 'rounds', 'players', 'weekend_share']]`,
      // The empty month's share left as NaN.
      `def monthly_activity(rounds):
    dated = rounds.assign(played_on=pd.to_datetime(rounds['played_on']))
    monthly = (dated.assign(weekend=dated['played_on'].dt.dayofweek >= 5)
               .resample('MS', on='played_on')
               .agg(rounds=('round_id', 'count'), players=('player_id', 'nunique'), weekend_share=('weekend', 'mean')))
    return monthly.assign(month=monthly.index.strftime('%Y-%m'),
                          weekend_share=(monthly['weekend_share'] * 100).round(1)
                          ).reset_index(drop=True)[['month', 'rounds', 'players', 'weekend_share']]`,
    ],
  },
  {
    id: 'cleaning',
    title: 'Clean up the clubhouse: .str methods, types, and drop_duplicates',
    difficulty: 'hard',
    lesson: `
      <p>Text columns have a <code>.str</code> accessor with vectorized string methods: <code>strip()</code>,
      <code>lower()</code>, <code>upper()</code>, <code>title()</code>, <code>replace()</code> (with
      <code>regex=True</code> for patterns), <code>contains()</code>, <code>startswith()</code>, and more. Missing
      values pass through as missing.</p>
      <pre>cities = courses['city'].str.strip().str.lower()
codes = courses['name'].str.replace(r'[aeiou ]', '', regex=True)</pre>
      <p>Numbers stored as text need cleaning before <code>astype(float)</code> or <code>pd.to_numeric</code>
      will take them: strip currency signs, thousands separators, and spaces first. Dates go through
      <code>pd.to_datetime</code>.</p>
      <pre>prices = pd.Series(['$1,200', ' 950', '$80.50'])
prices.str.replace(r'[$,\\s]', '', regex=True).astype(float)</pre>
      <p><code>drop_duplicates()</code> removes repeated rows; <code>subset=[...]</code> decides which columns make
      two rows "the same", and <code>keep='first'</code> keeps the first one <em>in the current order</em>. So clean
      before you dedupe (<code>' Ann'</code> and <code>'ANN'</code> only match afterwards), and sort first when "which
      one to keep" has a rule.</p>`,
    interview: `Cleaning questions test judgment as much as syntax: what makes two records the same person? Which
      one do you keep? Why not just <code>drop_duplicates()</code> on the raw rows? Name the rules you chose. And a
      Python loop over rows to fix strings is the wrong tool when <code>.str</code> does it for the whole column.`,
    yardage: `<code>players</code> as exported: <code>name</code> and <code>country</code> have stray spaces and
      mixed case, <code>dues</code> is text like <code>'$1,250'</code>, <code>'$ 1200'</code>, or
      <code>'800.00'</code> (missing for some), and <code>joined_on</code> is a date string. Two members signed up
      twice under a new <code>player_id</code>. <br><strong>SQL equivalent:</strong> <code>UPPER(TRIM(country))</code>,
      <code>CAST(REPLACE(REPLACE(dues, '$', ''), ',', '') AS REAL)</code>, and <code>ROW_NUMBER() OVER (PARTITION BY
      name, country ORDER BY joined_on) = 1</code> to keep one row per person.`,
    task: `Write <code>def clean_members(players)</code> that returns a cleaned DataFrame with the same columns, in
      the same order: <code>name</code> with spaces trimmed, runs of spaces inside it collapsed to one, and title
      case (<code>'Kenji Sato'</code>); <code>country</code> trimmed and upper case; <code>dues</code> as a float
      number of dollars (missing stays missing); <code>joined_on</code> as a datetime. Then remove duplicate signups:
      players with the same cleaned name <em>and</em> country are one person, so keep only their earliest
      <code>joined_on</code>. Order the rows by <code>player_id</code>; the index isn't graded, but column dtypes are.`,
    solution: `def clean_members(players):
    name = (
        players['name']
        .str.strip()
        .str.replace(r'\\s+', ' ', regex=True)
        .str.title()
    )
    dues = players['dues'].str.replace(r'[$,\\s]', '', regex=True)
    return (
        players
        .assign(
            name=name,
            country=players['country'].str.strip().str.upper(),
            dues=dues.astype(float),
            joined_on=pd.to_datetime(players['joined_on']),
        )
        .sort_values(['joined_on', 'player_id'])
        .drop_duplicates(subset=['name', 'country'], keep='first')
        .sort_values('player_id')
    )`,
    hint: 'Chain <code>.str.strip()</code>, <code>.str.replace(r\'\\s+\', \' \', regex=True)</code>, and '
      + '<code>.str.title()</code> for names; remove <code>$</code>, commas, and spaces from dues before '
      + '<code>astype(float)</code>. Then <code>sort_values(\'joined_on\')</code> so '
      + '<code>drop_duplicates(subset=[\'name\', \'country\'])</code> keeps the earliest signup.',
    checker: {
      type: 'dataframe',
      function: 'clean_members',
      frames: ['players'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'match',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different member list' },
        { setup: "players.loc[players['player_id'] == 17, 'name'] = 'TOM AKERS'", hidden: true, label: 'two different people share a name' },
        { setup: "players.loc[players['player_id'] == 29, 'joined_on'] = '2015-06-01'", hidden: true, label: 'the duplicate signup has the earlier date' },
      ],
    },
    alternatives: [
      `def clean_members(players):
    out = players.copy()
    out['name'] = (out['name'].str.split().str.join(' ').str.title())
    out['country'] = out['country'].str.strip().str.upper()
    digits = out['dues'].str.replace('$', '').str.replace(',', '')
    out['dues'] = pd.to_numeric(digits.str.strip())
    out['joined_on'] = pd.to_datetime(out['joined_on'])
    out = out.sort_values('joined_on', kind='stable')
    out = out.groupby(['name', 'country']).head(1)
    return out.sort_values('player_id')`,
    ],
    mistakes: [
      // Dedupe before cleaning: ' noah GREENFIELD' doesn't match 'Noah Greenfield' yet.
      `def clean_members(players):
    out = players.drop_duplicates(subset=['name', 'country'])
    return out.assign(
        name=out['name'].str.strip().str.replace(r'\\s+', ' ', regex=True).str.title(),
        country=out['country'].str.strip().str.upper(),
        dues=out['dues'].str.replace(r'[$,\\s]', '', regex=True).astype(float),
        joined_on=pd.to_datetime(out['joined_on']),
    )`,
      // No collapsing of inner spaces: 'Rafael  Ortiz' keeps two.
      `def clean_members(players):
    out = players.assign(
        name=players['name'].str.strip().str.title(),
        country=players['country'].str.strip().str.upper(),
        dues=players['dues'].str.replace(r'[$,\\s]', '', regex=True).astype(float),
        joined_on=pd.to_datetime(players['joined_on']),
    )
    return out.sort_values('joined_on').drop_duplicates(subset=['name', 'country']).sort_values('player_id')`,
      // Same name means same person? Not across countries.
      `def clean_members(players):
    out = players.assign(
        name=players['name'].str.strip().str.replace(r'\\s+', ' ', regex=True).str.title(),
        country=players['country'].str.strip().str.upper(),
        dues=players['dues'].str.replace(r'[$,\\s]', '', regex=True).astype(float),
        joined_on=pd.to_datetime(players['joined_on']),
    )
    return out.sort_values('joined_on').drop_duplicates(subset=['name']).sort_values('player_id')`,
      // keep='first' in player_id order assumes the original signup has the lower id.
      `def clean_members(players):
    out = players.assign(
        name=players['name'].str.strip().str.replace(r'\\s+', ' ', regex=True).str.title(),
        country=players['country'].str.strip().str.upper(),
        dues=players['dues'].str.replace(r'[$,\\s]', '', regex=True).astype(float),
        joined_on=pd.to_datetime(players['joined_on']),
    )
    return out.drop_duplicates(subset=['name', 'country'], keep='first')`,
      // joined_on left as text.
      `def clean_members(players):
    out = players.assign(
        name=players['name'].str.strip().str.replace(r'\\s+', ' ', regex=True).str.title(),
        country=players['country'].str.strip().str.upper(),
        dues=players['dues'].str.replace(r'[$,\\s]', '', regex=True).astype(float),
    )
    return out.sort_values('joined_on').drop_duplicates(subset=['name', 'country']).sort_values('player_id')`,
    ],
  },
  {
    id: 'reshape',
    title: 'Hole by hole: pivot_table and melt',
    difficulty: 'hard',
    lesson: `
      <p><strong>Wide</strong> data has one column per thing (a column per hole); <strong>long</strong> data has
      one row per thing (a row per round and hole). Most pandas operations want long data; reports and charts often
      want wide. <code>melt</code> goes wide → long:</p>
      <pre>wide = pd.DataFrame({'player': ['Ava', 'Bo'], 'r1': [72, 80],
                     'r2': [70, 78]})
long = wide.melt(id_vars='player', value_vars=['r1', 'r2'],
                 var_name='round', value_name='score')</pre>
      <p><code>id_vars</code> stay as columns; each <code>value_vars</code> column becomes rows, with its name in
      <code>var_name</code> (as text) and its value in <code>value_name</code>.</p>
      <p><code>pivot_table</code> goes long → wide, aggregating as it goes: <code>index</code> becomes the rows,
      <code>columns</code> the columns, <code>values</code> with <code>aggfunc</code> fills the cells. (Plain
      <code>pivot</code> refuses when two rows land in the same cell.)</p>
      <pre>long.pivot_table(index='round', columns='player',
                 values='score', aggfunc='mean')</pre>
      <p>Watch labels that are text: <code>'r10'</code> sorts before <code>'r2'</code>. Convert them to numbers before
      you sort or pivot.</p>`,
    interview: `Reshaping questions ("turn this into one row per user and one column per month") test whether you
      think in long and wide. Saying "I'll melt to long, aggregate, then pivot" before writing code is the
      structured answer, and catching the "h10 sorts before h2" bug shows care.`,
    yardage: `<code>legacy_rounds</code>: last season's cards from the old app, wide: <code>course</code> (the
      course id) and strokes per hole in <code>h1</code> … <code>h18</code> (plus <code>id</code>,
      <code>date</code>, <code>player</code>, <code>total</code>). <br><strong>SQL equivalent:</strong>
      <code>SELECT course, AVG(h1), AVG(h2), …, AVG(h18) FROM legacy_rounds GROUP BY course</code>, turned on its
      side: SQL has no pivot, so it's a <code>UNION ALL</code> of 18 selects or 18 <code>CASE</code> columns.`,
    task: `Write <code>def hole_averages(legacy_rounds)</code> that returns a DataFrame with one row per hole (the
      index is the hole number as an integer, 1 to 18, in order) and one column per course that appears in
      <code>legacy_rounds</code> (labeled by the course id as an integer, ascending), holding the average strokes on
      that hole at that course, rounded to 2 decimals.`,
    solution: `def hole_averages(legacy_rounds):
    holes = legacy_rounds.filter(regex=r'^h\\d+$').columns
    return (
        legacy_rounds
        .melt(
            id_vars='course',
            value_vars=holes,
            var_name='hole',
            value_name='strokes',
        )
        .assign(hole=lambda df: df['hole'].str.lstrip('h').astype(int))
        .pivot_table(
            index='hole',
            columns='course',
            values='strokes',
            aggfunc='mean',
        )
        .round(2)
    )`,
    hint: '<code>melt</code> the <code>h1</code> … <code>h18</code> columns into long rows (<code>var_name=\'hole\'</code>), '
      + 'turn <code>\'h7\'</code> into <code>7</code> with <code>.str.lstrip(\'h\').astype(int)</code>, then '
      + '<code>pivot_table(index=\'hole\', columns=\'course\', values=\'strokes\', aggfunc=\'mean\')</code>.',
    checker: {
      type: 'dataframe',
      function: 'hole_averages',
      frames: ['legacy_rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'require',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of cards' },
        { setup: "legacy_rounds = legacy_rounds.assign(notes='')", hidden: true, label: 'an extra notes column at the end of the export' },
        { setup: "legacy_rounds = legacy_rounds[legacy_rounds['course'] == 2]", hidden: true, label: 'cards from one course only' },
      ],
    },
    alternatives: [
      `def hole_averages(legacy_rounds):
    holes = [f'h{n}' for n in range(1, 19)]
    means = legacy_rounds.groupby('course')[holes].mean().round(2).T
    means.index = means.index.str[1:].astype(int)
    return means`,
    ],
    mistakes: [
      // Hole labels left as text: 'h1', 'h10', 'h11', … in string order.
      `def hole_averages(legacy_rounds):
    long = legacy_rounds.melt(id_vars='course', value_vars=[f'h{n}' for n in range(1, 19)],
                              var_name='hole', value_name='strokes')
    return long.pivot_table(index='hole', columns='course', values='strokes', aggfunc='mean').round(2)`,
      // Total strokes, not the average.
      `def hole_averages(legacy_rounds):
    long = legacy_rounds.melt(id_vars='course', value_vars=[f'h{n}' for n in range(1, 19)],
                              var_name='hole', value_name='strokes')
    long['hole'] = long['hole'].str[1:].astype(int)
    return long.pivot_table(index='hole', columns='course', values='strokes', aggfunc='sum').round(2)`,
      // pivot can't combine several cards for the same course and hole.
      `def hole_averages(legacy_rounds):
    long = legacy_rounds.melt(id_vars='course', value_vars=[f'h{n}' for n in range(1, 19)],
                              var_name='hole', value_name='strokes')
    long['hole'] = long['hole'].str[1:].astype(int)
    return long.pivot(index='hole', columns='course', values='strokes').round(2)`,
      // "Every column after total is a hole": true until the export grows a column.
      `def hole_averages(legacy_rounds):
    long = legacy_rounds.melt(id_vars='course', value_vars=legacy_rounds.columns[5:],
                              var_name='hole', value_name='strokes')
    long['hole'] = long['hole'].str[1:].astype(int)
    return long.pivot_table(index='hole', columns='course', values='strokes', aggfunc='mean').round(2)`,
      // Courses as rows and holes as columns.
      `def hole_averages(legacy_rounds):
    long = legacy_rounds.melt(id_vars='course', value_vars=[f'h{n}' for n in range(1, 19)],
                              var_name='hole', value_name='strokes')
    long['hole'] = long['hole'].str[1:].astype(int)
    return long.pivot_table(index='course', columns='hole', values='strokes', aggfunc='mean').round(2)`,
    ],
  },
  {
    id: 'window-ops',
    title: 'Form guide: transform, rank, shift, and top N per group',
    difficulty: 'hard',
    lesson: `
      <p>SQL's window functions have pandas equivalents that keep one row per input row, computed within each
      group:</p>
      <pre>by_course = rounds.groupby('course_id')['score']
by_course.transform('mean')     # AVG(score) OVER (PARTITION BY course_id)
by_course.rank(method='min')    # RANK() OVER (… ORDER BY score)
by_course.shift(1)              # LAG(score): the previous row in the group
by_course.diff()                # score - LAG(score)
by_course.cumsum()              # running total
by_course.cumcount() + 1        # ROW_NUMBER() in the current row order
by_course.rolling(3, min_periods=1).mean()   # moving average</pre>
      <p><code>shift</code>, <code>diff</code>, <code>cumsum</code>, <code>cumcount</code>, and
      <code>rolling</code> follow the <strong>current row order</strong>, so sort first (by group, then time). That's
      the pandas version of the window's <code>ORDER BY</code>. <code>rank</code>'s <code>method</code> handles
      ties: <code>'min'</code> is RANK, <code>'dense'</code> is DENSE_RANK, and <code>'first'</code> (ties in row
      order) is ROW_NUMBER.</p>
      <p><strong>Top N per group</strong>: rank within the group and keep rank ≤ N, or sort and take
      <code>groupby(...).head(N)</code>.</p>`,
    interview: `"For each user, their top 3 sessions" and "change versus the previous order" are the window-function
      questions of the pandas round. A Python loop over each player's rows is the wrong tool; interviewers want
      <code>groupby</code> with <code>shift</code>/<code>diff</code>/<code>rank</code>/<code>transform</code>,
      and they'll ask how you broke ties.`,
    yardage: `<code>rounds</code>: <code>player_id</code>, <code>round_id</code>, <code>played_on</code> (text, but
      ISO dates sort correctly as text), and <code>score</code>. Several players have tied scores. <br><strong>SQL
      equivalent:</strong> <code>score - LAG(score) OVER w AS change</code>, <code>score - AVG(score) OVER (PARTITION
      BY player_id)</code>, and <code>ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score, played_on,
      round_id) &lt;= 2</code>, with <code>w AS (PARTITION BY player_id ORDER BY played_on, round_id)</code>.`,
    task: `Write <code>def form_guide(rounds)</code> that returns a DataFrame of each player's two best rounds
      (lowest score; ties go to the earlier round by <code>played_on</code>, then <code>round_id</code>), ordered by
      <code>player_id</code> then rank, with columns in order: <code>player_id</code>, <code>rank</code> (1 or 2),
      <code>round_id</code>, <code>played_on</code>, <code>score</code>, <code>change</code> (score minus the score
      of that player's previous round in time, by <code>played_on</code> then <code>round_id</code>; missing for their
      first round), and <code>vs_avg</code> (score minus the player's average score over all their rounds, rounded to
      2 decimals). The index isn't graded.`,
    solution: `def form_guide(rounds):
    ordered = rounds.sort_values(['player_id', 'played_on', 'round_id'])
    scores = ordered.groupby('player_id')['score']
    columns = [
        'player_id', 'rank', 'round_id', 'played_on', 'score',
        'change', 'vs_avg',
    ]
    return (
        ordered
        .assign(
            change=scores.diff(),
            vs_avg=(ordered['score'] - scores.transform('mean')).round(2),
            rank=scores.rank(method='first').astype(int),
        )
        .query('rank <= 2')
        .sort_values(['player_id', 'rank'])
        [columns]
    )`,
    hint: 'Sort by <code>player_id</code>, <code>played_on</code>, <code>round_id</code> first. Then, grouped by '
      + 'player: <code>diff()</code> for the change, <code>transform(\'mean\')</code> for the average, and '
      + '<code>rank(method=\'first\')</code> (ties in time order) to keep ranks 1 and 2.',
    checker: {
      type: 'dataframe',
      function: 'form_guide',
      frames: ['rounds'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season of rounds' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=9)', hidden: true, label: 'rows arrive shuffled' },
        { setup: "rounds = rounds.drop_duplicates('player_id')", hidden: true, label: 'every player has a single round' },
      ],
    },
    alternatives: [
      `def form_guide(rounds):
    ordered = rounds.sort_values(['player_id', 'played_on', 'round_id'])
    ordered = ordered.assign(
        change=ordered['score'] - ordered.groupby('player_id')['score'].shift(),
        vs_avg=(ordered['score'] - ordered.groupby('player_id')['score'].transform('mean')).round(2),
    )
    best = ordered.sort_values(['player_id', 'score', 'played_on', 'round_id'], kind='stable')
    best = best.groupby('player_id').head(2)
    best = best.assign(rank=best.groupby('player_id').cumcount() + 1)
    return best[['player_id', 'rank', 'round_id', 'played_on', 'score', 'change', 'vs_avg']]`,
    ],
    mistakes: [
      // diff without groupby: the first round of each player is compared with someone else's last.
      `def form_guide(rounds):
    ordered = rounds.sort_values(['player_id', 'played_on', 'round_id'])
    scores = ordered.groupby('player_id')['score']
    out = ordered.assign(change=ordered['score'].diff(),
                         vs_avg=(ordered['score'] - scores.transform('mean')).round(2),
                         rank=scores.rank(method='first').astype(int))
    return out[out['rank'] <= 2].sort_values(['player_id', 'rank'])[
        ['player_id', 'rank', 'round_id', 'played_on', 'score', 'change', 'vs_avg']]`,
      // RANK (method='min') gives tied rounds the same rank.
      `def form_guide(rounds):
    ordered = rounds.sort_values(['player_id', 'played_on', 'round_id'])
    scores = ordered.groupby('player_id')['score']
    out = ordered.assign(change=scores.diff(),
                         vs_avg=(ordered['score'] - scores.transform('mean')).round(2),
                         rank=scores.rank(method='min').astype(int))
    return out[out['rank'] <= 2].sort_values(['player_id', 'rank'])[
        ['player_id', 'rank', 'round_id', 'played_on', 'score', 'change', 'vs_avg']]`,
      // No chronological sort: relies on the rows arriving in date order.
      `def form_guide(rounds):
    scores = rounds.groupby('player_id')['score']
    out = rounds.assign(change=scores.diff(),
                        vs_avg=(rounds['score'] - scores.transform('mean')).round(2),
                        rank=scores.rank(method='first').astype(int))
    return out[out['rank'] <= 2].sort_values(['player_id', 'rank'])[
        ['player_id', 'rank', 'round_id', 'played_on', 'score', 'change', 'vs_avg']]`,
      // The season average over everyone, not the player's own.
      `def form_guide(rounds):
    ordered = rounds.sort_values(['player_id', 'played_on', 'round_id'])
    scores = ordered.groupby('player_id')['score']
    out = ordered.assign(change=scores.diff(),
                         vs_avg=(ordered['score'] - ordered['score'].mean()).round(2),
                         rank=scores.rank(method='first').astype(int))
    return out[out['rank'] <= 2].sort_values(['player_id', 'rank'])[
        ['player_id', 'rank', 'round_id', 'played_on', 'score', 'change', 'vs_avg']]`,
    ],
  },
  {
    id: 'capstone',
    title: 'The final round: clean, merge, aggregate, reshape',
    difficulty: 'hard',
    lesson: `
      <p>Multi-step questions reward a plan before code. Say the steps out loud, then build them one at a time,
      checking the shape after each:</p>
      <ol>
        <li><strong>Clean</strong> the keys you'll group or join on (trim, fix case), and convert dates.</li>
        <li><strong>Filter</strong> to the rows the question is about (a date range, known users).</li>
        <li><strong>Merge</strong> in what you need, and only that (<code>df[['key', 'col']]</code>), checking the
        row count.</li>
        <li><strong>Aggregate</strong> with groupby or pivot_table.</li>
        <li><strong>Reshape and finish</strong>: drop incomplete groups, derive the comparison, sort with a
        tie-breaker, and select the columns asked for.</li>
      </ol>
      <p>Mapping values through a dict is handy for buckets that aren't simple ranges. Values not in the dict become
      NaN, which <code>dropna</code> then removes:</p>
      <pre>sizes = {3: 'short', 4: 'mid', 5: 'long'}
scores.assign(kind=scores['par'].map(sizes))</pre>`,
    interview: `This is a take-home in miniature. Reviewers look for the plan, sanity checks between steps, and the
      edge cases you handled on purpose: inconsistent country labels, rounds by deleted accounts, months outside the
      comparison, and groups with only one side of the comparison. Mention each one in a sentence.`,
    yardage: `<code>players</code> (<code>country</code> typed inconsistently: <code>'usa'</code>,
      <code>' Sco'</code>, …), <code>rounds</code> (<code>played_on</code> as text; some rounds by players not in
      players), and <code>courses</code> (<code>par</code>). <br><strong>SQL equivalent:</strong> a CTE that
      cleans <code>UPPER(TRIM(country))</code> and tags seasons with <code>CASE</code> on the month, a <code>JOIN</code>
      of all three tables, <code>AVG(CASE WHEN season = 'spring' THEN score - par END)</code> (and summer)
      <code>GROUP BY country HAVING</code> both are present, then <code>ORDER BY improvement DESC, country</code>.`,
    task: `Which countries' golfers improved most from spring to summer? Write
      <code>def country_form(players, rounds, courses)</code> that returns a DataFrame with one row per country,
      using the country cleaned (trimmed, upper case). Only use rounds played in spring (March–May) or summer
      (June–August) by players in <code>players</code>, and measure each round as <code>to_par</code> = score minus
      the course's par. Columns, in order: <code>country</code>, <code>players</code> (distinct players from that
      country with a spring or summer round), <code>spring</code> and <code>summer</code> (average to_par in each
      season), and <code>improvement</code> (spring minus summer: positive means better in summer). Leave out
      countries that are missing either season. Round the three averages to 2 decimals, order by improvement (largest
      first, ties by country), and don't worry about the index.`,
    solution: `def country_form(players, rounds, courses):
    seasons = {
        3: 'spring', 4: 'spring', 5: 'spring',
        6: 'summer', 7: 'summer', 8: 'summer',
    }
    members = players.assign(country=players['country'].str.strip().str.upper())
    month = pd.to_datetime(rounds['played_on']).dt.month
    played = (
        rounds
        .assign(season=month.map(seasons))
        .dropna(subset=['season'])
        .merge(members[['player_id', 'country']], on='player_id')
        .merge(courses[['course_id', 'par']], on='course_id')
        .assign(to_par=lambda df: df['score'] - df['par'])
    )
    golfers = played.groupby('country')['player_id'].nunique()
    return (
        played
        .pivot_table(
            index='country',
            columns='season',
            values='to_par',
            aggfunc='mean',
        )
        .dropna()
        .assign(
            players=golfers,
            improvement=lambda df: df['spring'] - df['summer'],
        )
        .round(2)
        .reset_index()
        .sort_values(['improvement', 'country'], ascending=[False, True])
        [['country', 'players', 'spring', 'summer', 'improvement']]
    )`,
    hint: 'Plan: clean <code>country</code>; map each round\'s month to a season with a dict and drop the rest; '
      + 'inner-merge players (country) and courses (par); <code>pivot_table</code> the mean to_par by country and '
      + 'season; <code>dropna()</code> the one-season countries; add the player counts and the improvement; sort.',
    checker: {
      type: 'dataframe',
      function: 'country_form',
      frames: ['players', 'rounds', 'courses'],
      returns: 'DataFrame',
      rowOrder: 'require',
      index: 'ignore',
      columnOrder: 'require',
      dtypes: 'values',
      // Rounding the averages before or after subtracting can move improvement by 0.01: both are accepted.
      atol: 0.011,
      cases: [
        {},
        { data: 'alt', hidden: true, label: 'a different season, including February and September rounds' },
        { setup: "rounds = rounds[~((rounds['player_id'] == 18) & (rounds['played_on'] < '2026-06'))]", hidden: true, label: 'a country whose golfers only played in summer' },
        { setup: 'rounds = rounds.sample(frac=1, random_state=6)', hidden: true, label: 'rows arrive shuffled' },
      ],
    },
    alternatives: [
      `def country_form(players, rounds, courses):
    countries = players.set_index('player_id')['country'].str.strip().str.upper()
    pars = courses.set_index('course_id')['par']
    month = pd.to_datetime(rounds['played_on']).dt.month
    tagged = rounds.assign(
        season=np.where(month.between(3, 5), 'spring',
                        np.where(month.between(6, 8), 'summer', None)),
        country=rounds['player_id'].map(countries),
        to_par=rounds['score'] - rounds['course_id'].map(pars),
    ).dropna(subset=['season', 'country'])
    by_season = tagged.groupby(['country', 'season'])['to_par'].mean().unstack()
    both = by_season.dropna(subset=['spring', 'summer']).round(2)
    both['improvement'] = both['spring'] - both['summer']
    both['players'] = tagged.groupby('country')['player_id'].nunique()
    both = both.reset_index().sort_values(['improvement', 'country'], ascending=[False, True])
    return both[['country', 'players', 'spring', 'summer', 'improvement']]`,
    ],
    mistakes: [
      // Countries not cleaned: 'usa' and 'USA' are counted separately.
      `def country_form(players, rounds, courses):
    seasons = {3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer'}
    played = (rounds.assign(season=pd.to_datetime(rounds['played_on']).dt.month.map(seasons)).dropna(subset=['season'])
              .merge(players[['player_id', 'country']], on='player_id').merge(courses[['course_id', 'par']], on='course_id')
              .assign(to_par=lambda df: df['score'] - df['par']))
    out = played.pivot_table(index='country', columns='season', values='to_par', aggfunc='mean').dropna()
    out = out.assign(players=played.groupby('country')['player_id'].nunique(), improvement=out['spring'] - out['summer'])
    return out.round(2).reset_index().sort_values(['improvement', 'country'], ascending=[False, True])[
        ['country', 'players', 'spring', 'summer', 'improvement']]`,
      // Every month counted: fine while the data happens to cover only March to August.
      `def country_form(players, rounds, courses):
    members = players.assign(country=players['country'].str.strip().str.upper())
    month = pd.to_datetime(rounds['played_on']).dt.month
    played = (rounds.assign(season=np.where(month <= 5, 'spring', 'summer'))
              .merge(members[['player_id', 'country']], on='player_id').merge(courses[['course_id', 'par']], on='course_id')
              .assign(to_par=lambda df: df['score'] - df['par']))
    out = played.pivot_table(index='country', columns='season', values='to_par', aggfunc='mean').dropna()
    out = out.assign(players=played.groupby('country')['player_id'].nunique(), improvement=out['spring'] - out['summer'])
    return out.round(2).reset_index().sort_values(['improvement', 'country'], ascending=[False, True])[
        ['country', 'players', 'spring', 'summer', 'improvement']]`,
      // Raw scores, not to_par: courses with a lower par look like improvement.
      `def country_form(players, rounds, courses):
    seasons = {3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer'}
    members = players.assign(country=players['country'].str.strip().str.upper())
    played = (rounds.assign(season=pd.to_datetime(rounds['played_on']).dt.month.map(seasons)).dropna(subset=['season'])
              .merge(members[['player_id', 'country']], on='player_id'))
    out = played.pivot_table(index='country', columns='season', values='score', aggfunc='mean').dropna()
    out = out.assign(players=played.groupby('country')['player_id'].nunique(), improvement=out['spring'] - out['summer'])
    return out.round(2).reset_index().sort_values(['improvement', 'country'], ascending=[False, True])[
        ['country', 'players', 'spring', 'summer', 'improvement']]`,
      // One-season countries kept, with a missing average.
      `def country_form(players, rounds, courses):
    seasons = {3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer'}
    members = players.assign(country=players['country'].str.strip().str.upper())
    played = (rounds.assign(season=pd.to_datetime(rounds['played_on']).dt.month.map(seasons)).dropna(subset=['season'])
              .merge(members[['player_id', 'country']], on='player_id').merge(courses[['course_id', 'par']], on='course_id')
              .assign(to_par=lambda df: df['score'] - df['par']))
    out = played.pivot_table(index='country', columns='season', values='to_par', aggfunc='mean')
    out = out.assign(players=played.groupby('country')['player_id'].nunique(), improvement=out['spring'] - out['summer'])
    return out.round(2).reset_index().sort_values(['improvement', 'country'], ascending=[False, True])[
        ['country', 'players', 'spring', 'summer', 'improvement']]`,
      // Improvement the wrong way round (summer minus spring).
      `def country_form(players, rounds, courses):
    seasons = {3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer'}
    members = players.assign(country=players['country'].str.strip().str.upper())
    played = (rounds.assign(season=pd.to_datetime(rounds['played_on']).dt.month.map(seasons)).dropna(subset=['season'])
              .merge(members[['player_id', 'country']], on='player_id').merge(courses[['course_id', 'par']], on='course_id')
              .assign(to_par=lambda df: df['score'] - df['par']))
    out = played.pivot_table(index='country', columns='season', values='to_par', aggfunc='mean').dropna()
    out = out.assign(players=played.groupby('country')['player_id'].nunique(), improvement=out['summer'] - out['spring'])
    return out.round(2).reset_index().sort_values(['improvement', 'country'], ascending=[False, True])[
        ['country', 'players', 'spring', 'summer', 'improvement']]`,
    ],
  },
];
