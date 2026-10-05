// Holes for the "Python Fundamentals" tournament (The Pyodide Pro-Am), in play order (hole 1 first).
// The first Python tournament: it assumes no Python beyond what each hole teaches, and uses no packages (pandas and
// NumPy come in the next tournament; a few yardage notes point ahead to how an idea looks there).
//
// Difficulty ramp: holes 1-6 are single concepts (easy, Par 1); 7-14 combine them (medium, Par 2); 15-18 are
// interview questions (hard, Par 2): cleaning messy input, group-by in pure Python, a hash-map classic, and a
// capstone that parses, cleans, groups, and ranks.
//
// Hole fields are documented at the top of js/data/holes/sql-basics.js, except that a Python hole has a `checker`
// instead of `orderMatters` (format: top of js/lib/python-engine.js; rules: "Python holes" in CLAUDE.md). Expected
// values are never written here: the checker runs `solution` on each case. Hidden cases carry a `label` naming the
// edge case they cover.

export default [
  {
    id: 'f-strings',
    title: 'Tee off: variables, types, and f-strings',
    difficulty: 'easy',
    lesson: `
      <p>A <strong>variable</strong> is a name for a value. Every value has a <strong>type</strong>: whole numbers are
      <code>int</code>, decimals are <code>float</code>, text is <code>str</code>. Dividing two ints with
      <code>/</code> always gives a float; <code>//</code> keeps only the whole part.</p>
      <pre>course = 'Pine Hollow'     # str
yardage = 7120             # int
holes = 18
print(yardage / holes)     # 395.55555555555554 (a float)
print(yardage // holes)    # 395
print(type(course), type(yardage / holes))</pre>
      <p>An <strong>f-string</strong> (a string with an <code>f</code> in front) drops values into text with
      <code>{…}</code>. After a colon you can say how to format the value: <code>:.1f</code> means one decimal place,
      and <code>:+d</code> means a whole number that always shows its sign.</p>
      <pre>wind = -3
print(f'{course} plays {yardage / holes:.1f} yards a hole')
print(f'Wind adjustment: {wind:+d} yards')   # -3; a 4 would print +4</pre>`,
    interview: `Live coding rounds often start with "print a summary line", and interviewers watch whether you reach
      for f-strings and format specs instead of gluing strings together with <code>+</code> and <code>str()</code>.
      Knowing that <code>/</code> always returns a float, and how to show exactly two decimals, saves you from output
      that's right but formatted wrong.`,
    yardage: `<code>player</code> is a <code>str</code>; <code>score</code>, <code>par</code>, and <code>putts</code>
      are <code>int</code>s. A round has 18 holes.`,
    task: `The variables <code>player</code>, <code>score</code>, <code>par</code>, and <code>putts</code> are already
      defined. Print exactly two lines:
      <br>1. <code>&lt;player&gt; shot &lt;score&gt; (&lt;to par&gt;)</code>, where to par is <code>score - par</code>
      with a sign: <code>-2</code>, <code>+4</code>, and <code>+0</code> for even par.
      <br>2. <code>Putts per hole: &lt;putts divided by 18, with exactly 2 decimals&gt;</code>.
      <br>For example: <code>Ava Birdwell shot 70 (-2)</code> then <code>Putts per hole: 1.72</code>.`,
    solution: `to_par = score - par
print(f'{player} shot {score} ({to_par:+d})')
print(f'Putts per hole: {putts / 18:.2f}')`,
    hint: 'Two f-strings: <code>{score - par:+d}</code> always shows the sign, and <code>{putts / 18:.2f}</code> '
      + 'shows two decimals.',
    checker: {
      type: 'stdout',
      cases: [
        { setup: "player = 'Ava Birdwell'\nscore = 70\npar = 72\nputts = 31", expected: 'Ava Birdwell shot 70 (-2)\nPutts per hole: 1.72' },
        { setup: "player = 'Kenji Sato'\nscore = 75\npar = 71\nputts = 33" },
        { setup: "player = 'Mina Park'\nscore = 69\npar = 72\nputts = 29" },
        { setup: "player = 'Noah Greenfield'\nscore = 72\npar = 72\nputts = 30", hidden: true, label: 'even par prints +0' },
        { setup: "player = 'Liam Chipman'\nscore = 80\npar = 72\nputts = 36", hidden: true, label: 'whole-number putts per hole (2.00)' },
        { setup: "player = 'Isla MacLeod'\nscore = 71\npar = 70\nputts = 27", hidden: true, label: 'putts per hole with a trailing zero (1.50)' },
        { setup: "player = \"Sean O'Brien\"\nscore = 88\npar = 70\nputts = 40", hidden: true, label: 'name with an apostrophe' },
      ],
    },
    alternatives: [
      `print(player + ' shot ' + str(score) + ' (' + format(score - par, '+d') + ')')
print('Putts per hole: %.2f' % (putts / 18))`,
    ],
    mistakes: [
      // No sign for over par or even par.
      `print(f'{player} shot {score} ({score - par})')
print(f'Putts per hole: {putts / 18:.2f}')`,
      // round() drops trailing zeros: 2.0 and 1.5 instead of 2.00 and 1.50.
      `print(f'{player} shot {score} ({score - par:+d})')
print(f'Putts per hole: {round(putts / 18, 2)}')`,
      // Floor division.
      `print(f'{player} shot {score} ({score - par:+d})')
print(f'Putts per hole: {putts // 18:.2f}')`,
    ],
  },
  {
    id: 'slicing',
    title: 'Front nine, back nine: indexing and slicing',
    difficulty: 'easy',
    lesson: `
      <p>A <strong>list</strong> holds values in order. <code>card[0]</code> is the first item and
      <code>card[-1]</code> the last. A <strong>slice</strong> <code>card[start:stop]</code> takes the items from
      <code>start</code> up to, but not including, <code>stop</code>; leave either end out to go to the edge.</p>
      <pre>putts = [2, 1, 2, 3, 2, 2, 1, 2, 2, 2, 1, 2]
print(putts[0], putts[-1])   # 2 2
print(putts[:3])             # first three: [2, 1, 2]
print(putts[3:6])            # items 3, 4, 5: [3, 2, 2]
print(putts[-2:])            # last two: [1, 2]
print(sum(putts[:4]))        # 8</pre>
      <p>Slices are forgiving: they stop at the end of the list instead of raising an error, so
      <code>putts[20:]</code> is just <code>[]</code>. Indexing isn't: <code>putts[20]</code> raises an
      <code>IndexError</code>.</p>`,
    interview: `Off-by-one errors are the classic slicing bug, and interviewers check the edges: what happens with an
      empty list, or one shorter than you assumed? Say out loud that slices stop at the end of the list, and test a
      short input before you call it done.`,
    yardage: `<code>card</code> is a list of hole scores in order: <code>card[0]</code> is hole 1. A full round has 18,
      but a player who walked off early has fewer, and an empty card means no holes were played.`,
    task: `Write <code>def split_card(card)</code>. Return a tuple of three things: the total of the front nine (holes
      1–9), the total of the back nine (holes 10–18), and a list of the last three scores on the card. Holes that
      weren't played count as 0, and a card with fewer than three scores returns all of them. For example,
      <code>split_card([4, 5, 3, 4, 4, 5, 4, 3, 5, 4, 4, 5, 3, 4, 5, 4, 3, 4])</code> returns
      <code>(37, 36, [4, 3, 4])</code>.`,
    solution: `def split_card(card):
    front = sum(card[:9])
    back = sum(card[9:18])
    return front, back, card[-3:]`,
    hint: '<code>card[:9]</code> is the front nine, <code>card[9:18]</code> the back nine, and <code>card[-3:]</code> the '
      + 'last three. Slices never raise on short lists.',
    checker: {
      type: 'function',
      function: 'split_card',
      cases: [
        { args: '[4, 5, 3, 4, 4, 5, 4, 3, 5, 4, 4, 5, 3, 4, 5, 4, 3, 4]', expected: '(37, 36, [4, 3, 4])' },
        { args: '[3, 4, 4, 5, 3, 4, 4, 4, 5, 4, 3, 5, 4, 4, 4, 3, 5, 4]' },
        { args: '[5, 6, 4, 5, 5, 6, 5, 4, 6, 5, 4, 6, 5, 5, 6, 4, 4, 5]' },
        { args: '[]', hidden: true, label: 'empty card' },
        { args: '[4]', hidden: true, label: 'one hole played' },
        { args: '[4, 5, 3, 4, 4, 5, 4, 3, 5]', hidden: true, label: 'walked off after 9' },
        { args: '[4, 5, 3, 4, 4, 5, 4, 3, 5, 4, 6, 5]', hidden: true, label: 'walked off after 12' },
      ],
    },
    alternatives: [
      `def split_card(card):
    front = 0
    back = 0
    for i, score in enumerate(card):
        if i < 9:
            front += score
        elif i < 18:
            back += score
    return (front, back, card[max(len(card) - 3, 0):])`,
    ],
    mistakes: [
      // card[15:] is the last three only on a full card.
      `def split_card(card):
    return sum(card[:9]), sum(card[9:18]), card[15:]`,
      // Off by one: the front nine stops at hole 8.
      `def split_card(card):
    return sum(card[:8]), sum(card[8:18]), card[-3:]`,
      // Indexing instead of slicing: crashes on short cards.
      `def split_card(card):
    return sum(card[:9]), sum(card[9:18]), [card[-3], card[-2], card[-1]]`,
    ],
  },
  {
    id: 'loops-conditionals',
    title: 'Fore! Loops and conditionals',
    difficulty: 'easy',
    lesson: `
      <p>A <code>for</code> loop repeats its indented block once per item. <code>range(1, n + 1)</code> counts
      1, 2, …, n (the stop value is never included). Inside, <code>if</code> / <code>elif</code> / <code>else</code>
      picks one branch: the first condition that's true wins, and the rest are skipped.</p>
      <pre>for yards in range(100, 401, 100):    # 100, 200, 300, 400
    if yards &gt;= 300:
        print(yards, 'driver')
    elif yards &gt;= 150:
        print(yards, 'iron')
    else:
        print(yards, 'wedge')</pre>
      <p><code>a % b</code> is the remainder after dividing <code>a</code> by <code>b</code>, so
      <code>n % 4 == 0</code> means "n is a multiple of 4". Because the first true branch wins, put the most specific
      condition first.</p>`,
    interview: `This is FizzBuzz in golf shoes, still a common first screen. The trap is branch order: if you test
      "multiple of 3" before "multiple of both", the combined case never prints. Interviewers also check the edges
      (what if there are no holes?) and that you count from 1, not 0.`,
    yardage: `<code>holes</code> is an <code>int</code>, 0 or more. Print one line per hole, numbered from 1.`,
    task: `The variable <code>holes</code> is already defined. For each hole number from 1 to <code>holes</code>, print
      one line: <code>Birdie</code> if the number is a multiple of both 3 and 5, <code>Fore</code> if it's a multiple
      of 3, <code>Putt</code> if it's a multiple of 5, and otherwise the number itself. With
      <code>holes = 5</code> that's <code>1</code>, <code>2</code>, <code>Fore</code>, <code>4</code>,
      <code>Putt</code>. If <code>holes</code> is 0, print nothing.`,
    solution: `for hole in range(1, holes + 1):
    if hole % 3 == 0 and hole % 5 == 0:
        print('Birdie')
    elif hole % 3 == 0:
        print('Fore')
    elif hole % 5 == 0:
        print('Putt')
    else:
        print(hole)`,
    hint: 'Loop over <code>range(1, holes + 1)</code> and test "multiple of both" (or <code>% 15 == 0</code>) '
      + '<strong>first</strong>.',
    checker: {
      type: 'stdout',
      cases: [
        { setup: 'holes = 5', expected: '1\n2\nFore\n4\nPutt' },
        { setup: 'holes = 9' },
        { setup: 'holes = 14' },
        { setup: 'holes = 15', hidden: true, label: 'first multiple of both 3 and 5' },
        { setup: 'holes = 30', hidden: true, label: 'two multiples of both' },
        { setup: 'holes = 0', hidden: true, label: 'no holes: print nothing' },
        { setup: 'holes = 1', hidden: true, label: 'one hole' },
      ],
    },
    alternatives: [
      `hole = 1
while hole <= holes:
    label = ''
    if hole % 3 == 0:
        label = 'Fore'
    if hole % 5 == 0:
        label = 'Putt'
    if hole % 15 == 0:
        label = 'Birdie'
    print(label or hole)
    hole += 1`,
    ],
    mistakes: [
      // Branch order: "multiple of 3" catches 15 before the combined case.
      `for hole in range(1, holes + 1):
    if hole % 3 == 0:
        print('Fore')
    elif hole % 5 == 0:
        print('Putt')
    elif hole % 15 == 0:
        print('Birdie')
    else:
        print(hole)`,
      // Off by one: stops one hole early.
      `for hole in range(1, holes):
    if hole % 15 == 0:
        print('Birdie')
    elif hole % 3 == 0:
        print('Fore')
    elif hole % 5 == 0:
        print('Putt')
    else:
        print(hole)`,
      // Counts from 0: 0 is a multiple of everything.
      `for hole in range(holes):
    if hole % 15 == 0:
        print('Birdie')
    elif hole % 3 == 0:
        print('Fore')
    elif hole % 5 == 0:
        print('Putt')
    else:
        print(hole)`,
    ],
  },
  {
    id: 'list-methods-sorting',
    title: 'The tee sheet: list methods and sorted()',
    difficulty: 'easy',
    lesson: `
      <p>Lists have methods that <strong>change the list in place</strong>: <code>append(x)</code> adds one item,
      <code>extend(other)</code> adds many, <code>remove(x)</code> deletes the first matching item (and raises a
      <code>ValueError</code> if there isn't one), and <code>sort()</code> sorts it. The <code>+</code> operator and
      <code>sorted()</code> do the same jobs but build a <strong>new</strong> list, leaving the original alone.</p>
      <pre>bag = ['driver', 'Putter', 'wedge']
bag.append('hybrid')                    # bag itself changes
if '3-wood' in bag:                     # check before remove()
    bag.remove('3-wood')
print(sorted(bag))                # ['Putter', 'driver', 'hybrid', 'wedge']
print(sorted(bag, key=str.lower)) # ['driver', 'hybrid', 'Putter', 'wedge']
print(sorted(bag, key=len))       # shortest name first</pre>
      <p>By default strings sort by character code, so every uppercase letter comes before every lowercase one.
      <code>key=</code> takes a function that's applied to each item before comparing: <code>key=str.lower</code>
      sorts ignoring case, <code>key=len</code> by length.</p>`,
    interview: `"Don't modify the input" is a common requirement, and a common failure: <code>players.extend(…)</code>
      inside a function changes the caller's list too. Interviewers notice whether you know which operations copy and
      which mutate, and whether you guard <code>remove()</code> against missing items.`,
    yardage: `<code>players</code>, <code>late</code>, and <code>withdrawn</code> are lists of names (strings).
      Names on the sheet are unique. Some players type their names in lowercase.`,
    task: `Write <code>def tee_sheet(players, late, withdrawn)</code>. Return a <strong>new</strong> list: everyone in
      <code>players</code>, plus the <code>late</code> arrivals, minus anyone in <code>withdrawn</code>, sorted
      alphabetically ignoring case. A withdrawn name that isn't on the sheet is simply ignored. Don't modify any of the
      three lists you're given.`,
    solution: `def tee_sheet(players, late, withdrawn):
    sheet = players + late
    for name in withdrawn:
        if name in sheet:
            sheet.remove(name)
    return sorted(sheet, key=str.lower)`,
    hint: '<code>players + late</code> builds a new list. Check <code>if name in sheet</code> before '
      + '<code>remove</code>, and finish with <code>sorted(sheet, key=str.lower)</code>.',
    checker: {
      type: 'function',
      function: 'tee_sheet',
      noMutation: true,
      cases: [
        { args: "['Kenji Sato', 'Ava Birdwell'], ['Mina Park'], ['Kenji Sato']", expected: "['Ava Birdwell', 'Mina Park']" },
        { args: "['Noah Greenfield', 'Isla MacLeod', 'Chloe Dubois'], [], ['Isla MacLeod']" },
        { args: "['Priya Raman'], ['Hamish Craig', 'Sofia Rossi'], []" },
        { args: "['Mateo Fairway', 'Liam Chipman'], ['ava birdwell'], []", hidden: true, label: 'a lowercase name' },
        { args: "['Kenji Sato'], [], ['Tiger Woods']", hidden: true, label: 'withdrawn name not on the sheet' },
        { args: "['Kenji Sato'], ['Mina Park'], ['Mina Park', 'Kenji Sato']", hidden: true, label: 'everyone withdraws' },
        { args: '[], [], []', hidden: true, label: 'empty sheet' },
      ],
    },
    alternatives: [
      `def tee_sheet(players, late, withdrawn):
    sheet = [name for name in players + late if name not in withdrawn]
    sheet.sort(key=lambda name: name.lower())
    return sheet`,
    ],
    mistakes: [
      // Modifies the caller's list.
      `def tee_sheet(players, late, withdrawn):
    players.extend(late)
    for name in withdrawn:
        if name in players:
            players.remove(name)
    return sorted(players, key=str.lower)`,
      // No key: uppercase names sort before lowercase ones.
      `def tee_sheet(players, late, withdrawn):
    sheet = players + late
    for name in withdrawn:
        if name in sheet:
            sheet.remove(name)
    return sorted(sheet)`,
      // remove() without checking: ValueError for a name that isn't there.
      `def tee_sheet(players, late, withdrawn):
    sheet = players + late
    for name in withdrawn:
        sheet.remove(name)
    return sorted(sheet, key=str.lower)`,
    ],
  },
  {
    id: 'dicts-get',
    title: 'Course guide: dicts and get()',
    difficulty: 'easy',
    lesson: `
      <p>A <strong>dict</strong> maps keys to values. Build one with braces, from a list of pairs with
      <code>dict(pairs)</code>, or one entry at a time with <code>d[key] = value</code>. Look a value up with
      <code>d[key]</code>, which raises a <code>KeyError</code> if the key is missing, or with
      <code>d.get(key, default)</code>, which returns the default instead.</p>
      <pre>yardages = dict([('Pine Hollow', 7120), ('Old Links', 6980)])
yardages['Coral Bay'] = 6720                 # add an entry
print(yardages['Old Links'])                 # 6980
print(yardages.get('Desert Mirage'))         # None
print(yardages.get('Desert Mirage', 7000))   # 7000
print('Coral Bay' in yardages)               # True: checks the keys</pre>`,
    interview: `Dict lookups are O(1) on average, which is why "build a dict first, then look things up" turns so many
      O(n²) answers into O(n) ones. Expect a follow-up about missing keys: <code>d[key]</code> crashes,
      <code>d.get(key, default)</code> doesn't, and you should say which behavior the problem wants.`,
    yardage: `<code>rounds</code> is a list of <code>(course, score)</code> tuples; <code>course_pars</code> is a list
      of <code>(course, par)</code> tuples. A course can appear in many rounds.`,
    task: `Write <code>def to_par(rounds, course_pars)</code>. Build a dict from <code>course_pars</code>, then return a
      list with each round's score relative to par (score minus that course's par), in the same order as
      <code>rounds</code>. A course that isn't in <code>course_pars</code> counts as par 72. For example,
      <code>to_par([('Pine Hollow', 70), ('Cypress Point', 74)], [('Pine Hollow', 72), ('Cypress Point', 71)])</code>
      returns <code>[-2, 3]</code>.`,
    solution: `def to_par(rounds, course_pars):
    pars = dict(course_pars)
    result = []
    for course, score in rounds:
        result.append(score - pars.get(course, 72))
    return result`,
    hint: '<code>pars = dict(course_pars)</code>, then <code>score - pars.get(course, 72)</code> for each round.',
    checker: {
      type: 'function',
      function: 'to_par',
      cases: [
        { args: "[('Pine Hollow', 70), ('Cypress Point', 74)], [('Pine Hollow', 72), ('Cypress Point', 71)]", expected: '[-2, 3]' },
        { args: "[('Lakeside Dunes', 68)], [('Lakeside Dunes', 70), ('Old Links', 72)]" },
        { args: "[('Old Links', 72), ('Old Links', 75), ('Riviera Verde', 71)], [('Old Links', 72), ('Riviera Verde', 71)]" },
        { args: "[('Desert Mirage', 75), ('Pine Hollow', 70)], [('Pine Hollow', 72)]", hidden: true, label: 'course missing from the pars' },
        { args: "[('Coral Bay', 70)], []", hidden: true, label: 'no pars at all' },
        { args: "[], [('Pine Hollow', 72)]", hidden: true, label: 'no rounds' },
        { args: "[('Sakura Hills', 66), ('Sakura Hills', 66)], [('Sakura Hills', 72)]", hidden: true, label: 'the same round twice' },
      ],
    },
    alternatives: [
      `def to_par(rounds, course_pars):
    pars = {}
    for course, par in course_pars:
        pars[course] = par
    return [score - (pars[course] if course in pars else 72) for course, score in rounds]`,
    ],
    mistakes: [
      // KeyError for a course that isn't in the dict.
      `def to_par(rounds, course_pars):
    pars = dict(course_pars)
    return [score - pars[course] for course, score in rounds]`,
      // get() without a default returns None.
      `def to_par(rounds, course_pars):
    pars = dict(course_pars)
    return [score - pars.get(course) for course, score in rounds]`,
      // The wrong default.
      `def to_par(rounds, course_pars):
    pars = dict(course_pars)
    return [score - pars.get(course, 70) for course, score in rounds]`,
    ],
  },
  {
    id: 'counting',
    title: 'Busiest course: iterating dicts and counting',
    difficulty: 'easy',
    lesson: `
      <p>Counting is the most common thing you'll do with a dict: one key per distinct item, and its value is how many
      times it appeared. <code>counts.get(item, 0) + 1</code> handles the first time you see an item.</p>
      <pre>clubs = ['wedge', 'putter', 'wedge', 'driver', 'putter', 'wedge']
counts = {}
for club in clubs:
    counts[club] = counts.get(club, 0) + 1
print(counts)            # {'wedge': 3, 'putter': 2, 'driver': 1}

for club, n in counts.items():     # keys and values together
    print(club, n)
for club in sorted(counts):        # keys in alphabetical order
    print(club, counts[club])</pre>
      <p>Looping over a dict gives its keys, in the order they were first added. <code>.items()</code> gives
      <code>(key, value)</code> pairs, and <code>.values()</code> just the values.</p>`,
    interview: `"Find the most frequent item" is a warm-up that hides two follow-ups: what if there's a tie, and what if
      the input is empty? <code>max(counts, key=counts.get)</code> silently picks whichever tied key was added first,
      so state your tie rule and make the code follow it.`,
    yardage: `<code>courses</code> is a list of course names, one per round played (so a name repeats once per
      round).`,
    task: `Write <code>def busiest_course(courses)</code>. Count the rounds per course and return a tuple
      <code>(course, rounds)</code> for the course with the most rounds. If courses tie for the most, return the one
      that comes first alphabetically. If the list is empty, return <code>None</code>. For example,
      <code>busiest_course(['Old Links', 'Pine Hollow', 'Old Links'])</code> returns <code>('Old Links', 2)</code>.`,
    solution: `def busiest_course(courses):
    counts = {}
    for course in courses:
        counts[course] = counts.get(course, 0) + 1
    best = None
    for course in sorted(counts):
        if best is None or counts[course] > counts[best]:
            best = course
    if best is None:
        return None
    return (best, counts[best])`,
    hint: 'Count with <code>counts.get(course, 0) + 1</code>. Then walk the courses in <code>sorted()</code> order and '
      + 'only replace the best on a strictly bigger count, so ties keep the alphabetically first.',
    checker: {
      type: 'function',
      function: 'busiest_course',
      cases: [
        { args: "['Old Links', 'Pine Hollow', 'Old Links']", expected: "('Old Links', 2)" },
        { args: "['Coral Bay', 'Sakura Hills', 'Coral Bay', 'Coral Bay', 'Sakura Hills']" },
        { args: "['Riviera Verde', 'Lakeside Dunes', 'Lakeside Dunes']" },
        { args: "['Sakura Hills', 'Cypress Point', 'Sakura Hills', 'Cypress Point']", hidden: true, label: 'a tie for most rounds' },
        { args: '[]', hidden: true, label: 'no rounds' },
        { args: "['Pine Hollow']", hidden: true, label: 'one round' },
        { args: "['Old Links', 'Old Links', 'Old Links']", hidden: true, label: 'every round at one course' },
      ],
    },
    alternatives: [
      `def busiest_course(courses):
    if not courses:
        return None
    counts = {}
    for course in courses:
        counts[course] = counts.get(course, 0) + 1
    most = max(counts.values())
    winner = min(course for course in counts if counts[course] == most)
    return winner, most`,
    ],
    mistakes: [
      // max() keeps the first tied course it saw, not the alphabetical one.
      `def busiest_course(courses):
    if not courses:
        return None
    counts = {}
    for course in courses:
        counts[course] = counts.get(course, 0) + 1
    best = max(counts, key=counts.get)
    return (best, counts[best])`,
      // Forgets the empty list: max() of nothing raises.
      `def busiest_course(courses):
    counts = {}
    for course in courses:
        counts[course] = counts.get(course, 0) + 1
    most = max(counts.values())
    return (min(c for c in counts if counts[c] == most), most)`,
      // Picks the alphabetically LAST tied course.
      `def busiest_course(courses):
    if not courses:
        return None
    counts = {}
    for course in courses:
        counts[course] = counts.get(course, 0) + 1
    best = None
    for course in sorted(counts):
        if best is None or counts[course] >= counts[best]:
            best = course
    return (best, counts[best])`,
    ],
  },
  {
    id: 'sets',
    title: 'Playing partners: sets',
    difficulty: 'medium',
    lesson: `
      <p>A <strong>set</strong> holds unique items with no order. <code>set(a_list)</code> drops duplicates, and
      <code>x in a_set</code> is a fast membership test. Sets combine with operators:</p>
      <pre>ava = {'Pine Hollow', 'Old Links', 'Coral Bay'}
noah = {'Old Links', 'Cypress Point'}
print(ava &amp; noah)     # intersection: in both   {'Old Links'}
print(ava - noah)     # difference: only in ava {'Pine Hollow', 'Coral Bay'}
print(ava | noah)     # union: in either        (4 courses)
print(set(['wedge', 'wedge', 'putter']))   # {'wedge', 'putter'}</pre>
      <p>Sets have no order (and the order you see when printing isn't guaranteed), so when an answer needs a fixed
      order, finish with <code>sorted(…)</code>, which returns a list.</p>`,
    interview: `Sets show up whenever a question says "unique", "in common", or "missing from": users active in both
      months, products never ordered, dedupe a list. Interviewers like hearing that membership in a set is O(1) on
      average, versus O(n) in a list.`,
    yardage: `<code>mine</code> and <code>yours</code> are lists of course names, one per round, so a course can repeat.
      Course names are compared exactly as written.`,
    task: `Write <code>def course_overlap(mine, yours)</code>. Return a tuple of three alphabetically sorted lists, each
      without duplicates: the courses we've <strong>both</strong> played, the courses only <strong>I</strong> have
      played, and every course <strong>either</strong> of us has played. For example,
      <code>course_overlap(['Pine Hollow', 'Old Links'], ['Old Links', 'Coral Bay', 'Coral Bay'])</code> returns
      <code>(['Old Links'], ['Pine Hollow'], ['Coral Bay', 'Old Links', 'Pine Hollow'])</code>.`,
    solution: `def course_overlap(mine, yours):
    a = set(mine)
    b = set(yours)
    return sorted(a & b), sorted(a - b), sorted(a | b)`,
    hint: 'Turn both lists into sets, then <code>sorted(a &amp; b)</code>, <code>sorted(a - b)</code>, and '
      + '<code>sorted(a | b)</code>.',
    checker: {
      type: 'function',
      function: 'course_overlap',
      cases: [
        { args: "['Pine Hollow', 'Old Links'], ['Old Links', 'Coral Bay', 'Coral Bay']", expected: "(['Old Links'], ['Pine Hollow'], ['Coral Bay', 'Old Links', 'Pine Hollow'])" },
        { args: "['Sakura Hills', 'Cypress Point', 'Lakeside Dunes'], ['Cypress Point', 'Sakura Hills', 'Cypress Point']" },
        { args: "['Riviera Verde'], ['Old Links', 'Old Links', 'Pine Hollow']" },
        { args: "['Old Links', 'Old Links', 'Pine Hollow'], ['Old Links']", hidden: true, label: 'duplicates in my list' },
        { args: "['Coral Bay'], ['Sakura Hills']", hidden: true, label: 'nothing in common' },
        { args: '[], []', hidden: true, label: 'both lists empty' },
        { args: "['Pine Hollow', 'Old Links'], ['Old Links', 'Pine Hollow']", hidden: true, label: 'identical courses' },
      ],
    },
    alternatives: [
      `def course_overlap(mine, yours):
    both = sorted(set(mine).intersection(yours))
    only_mine = sorted(set(mine).difference(yours))
    either = sorted(set(mine).union(yours))
    return (both, only_mine, either)`,
    ],
    mistakes: [
      // Filtering the list keeps its duplicates.
      `def course_overlap(mine, yours):
    both = sorted([c for c in mine if c in yours])
    only_mine = sorted(set(mine) - set(yours))
    return both, only_mine, sorted(set(mine) | set(yours))`,
      // Symmetric difference instead of difference.
      `def course_overlap(mine, yours):
    a, b = set(mine), set(yours)
    return sorted(a & b), sorted(a ^ b), sorted(a | b)`,
      // Concatenating the lists keeps duplicates.
      `def course_overlap(mine, yours):
    a, b = set(mine), set(yours)
    return sorted(a & b), sorted(a - b), sorted(mine + yours)`,
    ],
  },
  {
    id: 'zip-enumerate',
    title: 'Hole by hole: tuples, zip, and enumerate',
    difficulty: 'medium',
    lesson: `
      <p>A <strong>tuple</strong> is a fixed group of values, like <code>(3, -1)</code>. You can
      <strong>unpack</strong> one into names: <code>hole, diff = (3, -1)</code>. Two helpers make loops tidy:</p>
      <ul>
        <li><code>zip(a, b)</code> walks two lists side by side, giving pairs. It stops at the end of the
        <em>shorter</em> list.</li>
        <li><code>enumerate(items, start=1)</code> gives <code>(number, item)</code> pairs, counting from
        <code>start</code>.</li>
      </ul>
      <pre>clubs = ['driver', 'iron', 'wedge']
yards = [280, 170, 95, 60]
for number, (club, distance) in enumerate(zip(clubs, yards), start=1):
    print(number, club, distance)   # 3 lines: zip stops after 'wedge'</pre>
      <p>The parentheses in <code>(club, distance)</code> unpack each pair that <code>zip</code> produces.</p>`,
    interview: `Indexing two lists with <code>range(len(a))</code> works until the lists have different lengths. Then
      it crashes or silently reads the wrong rows. <code>zip</code> and <code>enumerate</code> are the idiomatic
      answer, and reviewers notice when you use them.`,
    yardage: `<code>pars</code> is the course's par for each hole, in order; <code>strokes</code> is the player's score
      per hole. A player who walked off early has fewer <code>strokes</code> than <code>pars</code>.`,
    task: `Write <code>def birdie_holes(pars, strokes)</code>. Return a list of <code>(hole_number, to_par)</code>
      tuples for every hole the player finished <strong>under</strong> par, in hole order. Holes are numbered from 1,
      and <code>to_par</code> is strokes minus par (so -1 is a birdie). Only the holes that were played count. For
      example, <code>birdie_holes([4, 3, 5], [3, 3, 4])</code> returns <code>[(1, -1), (3, -1)]</code>.`,
    solution: `def birdie_holes(pars, strokes):
    result = []
    pairs = zip(pars, strokes)
    for hole, (par, score) in enumerate(pairs, start=1):
        if score < par:
            result.append((hole, score - par))
    return result`,
    hint: '<code>for hole, (par, score) in enumerate(zip(pars, strokes), start=1):</code> then keep holes where '
      + '<code>score &lt; par</code>.',
    checker: {
      type: 'function',
      function: 'birdie_holes',
      cases: [
        { args: '[4, 3, 5], [3, 3, 4]', expected: '[(1, -1), (3, -1)]' },
        { args: '[4, 4, 3, 5, 4, 4, 3, 5, 4], [4, 3, 3, 4, 5, 4, 2, 5, 4]' },
        { args: '[5, 4, 3], [6, 4, 3]' },
        { args: '[4, 3, 5, 4], [3, 3]', hidden: true, label: 'walked off early' },
        { args: '[5, 3, 4], [3, 1, 4]', hidden: true, label: 'an eagle and a hole-in-one' },
        { args: '[4, 4], [4, 5]', hidden: true, label: 'no birdies' },
        { args: '[], []', hidden: true, label: 'empty card' },
      ],
    },
    alternatives: [
      `def birdie_holes(pars, strokes):
    return [
        (i + 1, s - p)
        for i, (p, s) in enumerate(zip(pars, strokes))
        if s < p
    ]`,
    ],
    mistakes: [
      // Indexes by the pars list: crashes when strokes is shorter.
      `def birdie_holes(pars, strokes):
    result = []
    for i in range(len(pars)):
        if strokes[i] < pars[i]:
            result.append((i + 1, strokes[i] - pars[i]))
    return result`,
      // Numbers holes from 0.
      `def birdie_holes(pars, strokes):
    return [(i, s - p) for i, (p, s) in enumerate(zip(pars, strokes)) if s < p]`,
      // Includes pars, not just birdies.
      `def birdie_holes(pars, strokes):
    pairs = enumerate(zip(pars, strokes), start=1)
    return [(i, s - p) for i, (p, s) in pairs if s <= p]`,
    ],
  },
  {
    id: 'string-methods',
    title: 'Scorecard scribbles: string methods',
    difficulty: 'medium',
    lesson: `
      <p>Strings have methods for every clean-up job, and each returns a <strong>new</strong> string (strings never
      change in place):</p>
      <pre>raw = '  WEDGE ;  52 deg ;  sand  '
print(raw.strip())                  # spaces trimmed from both ends
parts = raw.split(';')              # ['  WEDGE ', '  52 deg ', '  sand  ']
clean = [p.strip() for p in parts]  # ['WEDGE', '52 deg', 'sand']
print(clean[0].lower(), clean[2].title())   # wedge Sand
print(' / '.join(clean))            # WEDGE / 52 deg / sand
print('52 deg'.replace(' deg', '°'))         # 52°</pre>
      <p><code>split(sep)</code> cuts at every <code>sep</code> and keeps everything else, spaces included, so
      split first and <code>strip()</code> each piece. <code>title()</code> capitalizes each word, and
      <code>' / '.join(list)</code> glues strings together with a separator.</p>`,
    interview: `Data rarely arrives clean. String parsing questions check that you strip after splitting, don't assume
      exact spacing, and handle the odd character. Mention the cases you're defending against before you write the
      code.`,
    yardage: `<code>line</code> is one handwritten scorecard entry: <code>last, first | score</code>. Spacing and
      capitalization vary, and a provisional score ends with <code>*</code>.`,
    task: `Write <code>def format_entry(line)</code>. The line has a name written <code>last, first</code>, then
      <code>|</code>, then a score, with any amount of extra space around each part and any capitalization. The score
      may end with a <code>*</code> (provisional), which should be dropped. Return <code>'First Last: score'</code>
      with the name in title case. For example, <code>format_entry('birdwell, ava | 72*')</code> returns
      <code>'Ava Birdwell: 72'</code>.`,
    solution: `def format_entry(line):
    name, score = line.split('|')
    last, first = name.split(',')
    full = first.strip() + ' ' + last.strip()
    score = score.replace('*', '').strip()
    return f'{full.title()}: {score}'`,
    hint: "Split on <code>'|'</code>, then the name on <code>','</code>. <code>strip()</code> every piece, drop the "
      + "<code>*</code> with <code>replace</code>, and use <code>.title()</code>.",
    checker: {
      type: 'function',
      function: 'format_entry',
      cases: [
        { args: "'birdwell, ava | 72*'", expected: "'Ava Birdwell: 72'" },
        { args: "'sato, kenji | 68'" },
        { args: "'  PARK, MINA|79  '" },
        { args: "'   rossi ,   sofia   |   85   '", hidden: true, label: 'extra spaces around every part' },
        { args: "'dubois-martin, chloe | 77'", hidden: true, label: 'hyphenated surname' },
        { args: "\"o'brien, sean | 88\"", hidden: true, label: 'apostrophe in a name' },
        { args: "'fairway, mateo | 74 * '", hidden: true, label: 'provisional mark with spaces' },
      ],
    },
    alternatives: [
      `def format_entry(line):
    left, right = [part.strip() for part in line.split('|')]
    last, first = [part.strip().title() for part in left.split(',')]
    return '{} {}: {}'.format(first, last, right.rstrip('* ').strip())`,
    ],
    mistakes: [
      // Assumes exactly ", " between the names.
      `def format_entry(line):
    name, score = line.strip().split('|')
    last, first = name.strip().split(', ')
    return f"{first.title()} {last.title()}: {score.strip().rstrip('*')}"`,
      // Drops the * before stripping spaces, so "74 *" keeps a space.
      `def format_entry(line):
    name, score = line.split('|')
    last, first = name.split(',')
    score = score.strip().replace('*', '')
    return f'{first.strip().title()} {last.strip().title()}: {score}'`,
      // capitalize() only uppercases the first letter of the whole string.
      `def format_entry(line):
    name, score = line.split('|')
    last, first = name.split(',')
    full = (first.strip() + ' ' + last.strip()).capitalize()
    return f"{full}: {score.replace('*', '').strip()}"`,
    ],
  },
  {
    id: 'list-comprehensions',
    title: 'Under par: list comprehensions',
    difficulty: 'medium',
    lesson: `
      <p>A <strong>list comprehension</strong> builds a list in one expression: what to keep, where it comes from,
      and (optionally) a condition. These two are the same:</p>
      <pre>yards = [280, 155, 310, 95]
long_ones = []
for y in yards:
    if y &gt; 200:
        long_ones.append(y - 200)

long_ones = [y - 200 for y in yards if y &gt; 200]   # [80, 110]</pre>
      <p>Read it left to right as "<em>this value</em>, for each item, if <em>condition</em>". The condition filters;
      the expression at the front transforms. Keep comprehensions short: once one needs two conditions and a nested
      loop, a plain loop is usually clearer.</p>`,
    interview: `Comprehensions are the most Pythonic way to filter and transform, and using one where a loop would take
      five lines reads as fluency. Watch the boundary condition, though: "under par" is <code>&lt;</code>, not
      <code>&lt;=</code>. Interviewers love inputs that sit exactly on the line.`,
    yardage: `<code>scores</code> is a list of round scores (ints); <code>par</code> is an int. In pandas (next
      tournament) this filter-then-transform is <code>df.loc[df.score &lt; par, 'score'] - par</code>: a boolean mask
      instead of an <code>if</code>.`,
    task: `Write <code>def under_par(scores, par)</code> using a list comprehension. Return the to-par value
      (score minus par) of every round strictly <strong>under</strong> par, in the original order. For example,
      <code>under_par([70, 75, 69], 72)</code> returns <code>[-2, -3]</code>.`,
    solution: `def under_par(scores, par):
    return [score - par for score in scores if score < par]`,
    hint: '<code>[score - par for score in scores if score &lt; par]</code>',
    checker: {
      type: 'function',
      function: 'under_par',
      cases: [
        { args: '[70, 75, 69], 72', expected: '[-2, -3]' },
        { args: '[66, 71], 70' },
        { args: '[80, 77], 72' },
        { args: '[72, 71, 72], 72', hidden: true, label: 'scores exactly at par' },
        { args: '[], 72', hidden: true, label: 'no rounds' },
        { args: '[70, 70, 70], 71', hidden: true, label: 'duplicate scores' },
        { args: '[61, 60], 72', hidden: true, label: 'every round under par (keep their order)' },
      ],
    },
    alternatives: [
      `def under_par(scores, par):
    result = []
    for score in scores:
        if score < par:
            result.append(score - par)
    return result`,
    ],
    mistakes: [
      // "Under par" doesn't include par itself.
      `def under_par(scores, par):
    return [score - par for score in scores if score <= par]`,
      // Sign flipped.
      `def under_par(scores, par):
    return [par - score for score in scores if score < par]`,
      // Sorted, losing the original order.
      `def under_par(scores, par):
    return sorted(score - par for score in scores if score < par)`,
    ],
  },
  {
    id: 'dict-set-comprehensions',
    title: 'Personal bests: dict and set comprehensions',
    difficulty: 'medium',
    lesson: `
      <p>Comprehensions also build sets and dicts. A <strong>set comprehension</strong> uses braces:
      <code>{x for x in items}</code>. A <strong>dict comprehension</strong> uses braces with
      <code>key: value</code>:</p>
      <pre>rounds = [('Pine Hollow', 31), ('Old Links', 29), ('Pine Hollow', 33)]
courses = {course for course, putts in rounds}   # 2 distinct courses
fewest = {
    course: min(p for c, p in rounds if c == course)
    for course in courses
}
print(fewest)   # {'Pine Hollow': 31, 'Old Links': 29}</pre>
      <p>Careful with a dict comprehension straight over the rows, like <code>{c: p for c, p in rounds}</code>: when
      a key repeats, each new pair <strong>overwrites</strong> the last, so you get the last value, not the best
      one.</p>`,
    interview: `The overwrite trap is a favorite: <code>{k: v for k, v in rows}</code> looks like a group-by but keeps
      only the last row per key. Say what should happen when a key repeats. For large inputs, mention that
      re-scanning the rows for every key is O(n²), and a single loop that updates a dict is O(n).`,
    yardage: `<code>rounds</code> is a list of <code>(name, score)</code> tuples; a player can have many rounds. In
      pandas this is <code>df.groupby('name').score.min()</code>.`,
    task: `Write <code>def best_by_player(rounds)</code>. Return a dict mapping each player's name to their best
      (lowest) score. Use a set comprehension for the distinct names and a dict comprehension for the result. For
      example, <code>best_by_player([('Ava Birdwell', 74), ('Kenji Sato', 71), ('Ava Birdwell', 70)])</code> returns
      <code>{'Ava Birdwell': 70, 'Kenji Sato': 71}</code>.`,
    solution: `def best_by_player(rounds):
    names = {name for name, score in rounds}
    return {
        name: min(score for who, score in rounds if who == name)
        for name in names
    }`,
    hint: '<code>names = {name for name, score in rounds}</code>, then '
      + '<code>{name: min(s for who, s in rounds if who == name) for name in names}</code>.',
    checker: {
      type: 'function',
      function: 'best_by_player',
      cases: [
        { args: "[('Ava Birdwell', 74), ('Kenji Sato', 71), ('Ava Birdwell', 70)]", expected: "{'Ava Birdwell': 70, 'Kenji Sato': 71}" },
        { args: "[('Mina Park', 69)]" },
        { args: "[('Noah Greenfield', 75), ('Noah Greenfield', 73), ('Priya Raman', 77), ('Priya Raman', 76)]" },
        { args: "[('Isla MacLeod', 68), ('Isla MacLeod', 73)]", hidden: true, label: 'best round came first' },
        { args: '[]', hidden: true, label: 'no rounds' },
        { args: "[('Sofia Rossi', 84), ('Hamish Craig', 77), ('Sofia Rossi', 84), ('Sofia Rossi', 90)]", hidden: true, label: 'a tied best and a worse last round' },
      ],
    },
    alternatives: [
      `def best_by_player(rounds):
    best = {}
    for name, score in rounds:
        if name not in best or score < best[name]:
            best[name] = score
    return best`,
    ],
    mistakes: [
      // Keeps each player's last score, not the best.
      `def best_by_player(rounds):
    return {name: score for name, score in rounds}`,
      // Forgets to filter by player: everyone gets the overall best.
      `def best_by_player(rounds):
    names = {name for name, score in rounds}
    return {name: min(score for _, score in rounds) for name in names}`,
      // Highest instead of lowest.
      `def best_by_player(rounds):
    names = {name for name, _ in rounds}
    return {n: max(s for who, s in rounds if who == n) for n in names}`,
    ],
  },
  {
    id: 'functions-defaults',
    title: 'Course handicap: parameters and default arguments',
    difficulty: 'medium',
    lesson: `
      <p>A function's parameters can have <strong>default values</strong>, used when the caller leaves them out.
      Callers can pass arguments by position or by name (<strong>keyword arguments</strong>), and named ones can
      come in any order. A function sends its answer back with <code>return</code>.</p>
      <pre>def carry(club_yards, wind=0, elevation=0):
    return club_yards + wind - elevation / 3

print(carry(150))                    # 150.0: both defaults used
print(carry(150, -10))               # 140.0: wind by position
print(carry(150, elevation=30))      # 140.0: skip wind, name elevation</pre>
      <p>Rounding has a trap: Python's <code>round()</code> sends exact halves to the nearest <em>even</em> number
      (<code>round(2.5)</code> is 2, <code>round(3.5)</code> is 4). To always round halves up, use
      <code>math.floor(x + 0.5)</code> after <code>import math</code>.</p>`,
    interview: `Defaults and keyword arguments come up when you design a helper that others will call: sensible
      defaults, named options for clarity. The rounding detail is a classic gotcha. Banker's rounding surprises
      people in data cleaning, and knowing about it signals care with numbers.`,
    yardage: `A course handicap is <code>index × slope ÷ 113 + (rating − par)</code>, rounded to the nearest whole
      number with halves rounding up. <code>index</code> can be negative (a "plus" handicap).`,
    task: `Write <code>def course_handicap(index, slope=113, rating=72.0, par=72)</code>. Return
      <code>index * slope / 113 + (rating - par)</code> rounded to the nearest whole number, with exact halves rounding
      <strong>up</strong> (10.5 becomes 11, and -1.5 becomes -1), as an <code>int</code>. Callers may leave out any of
      the last three arguments, or pass them by name. For example, <code>course_handicap(10.0, 130)</code> returns
      <code>12</code>.`,
    solution: `import math


def course_handicap(index, slope=113, rating=72.0, par=72):
    exact = index * slope / 113 + (rating - par)
    return math.floor(exact + 0.5)`,
    hint: 'Put the defaults in the <code>def</code> line, and round with <code>math.floor(exact + 0.5)</code>: '
      + '<code>round()</code> sends 10.5 to 10.',
    checker: {
      type: 'function',
      function: 'course_handicap',
      cases: [
        { args: '10.0', expected: '10' },
        { args: '10.0, 130', expected: '12' },
        { args: '5.4, rating=70.5, par=71' },
        { args: '18.2, 125, 70.1, 71' },
        { args: '10.5', hidden: true, label: 'exactly half: rounds up' },
        { args: '2.5, 113, 72.0, 72', hidden: true, label: 'another exact half' },
        { args: '-2.0, 120', hidden: true, label: 'plus (negative) handicap index' },
        { args: 'par=70, rating=69.0, slope=140, index=12.0', hidden: true, label: 'every argument by name' },
        { args: '0.0', hidden: true, label: 'zero index' },
      ],
    },
    alternatives: [
      `from math import floor


def course_handicap(index, slope=113, rating=72.0, par=72):
    return int(floor(index * slope / 113 + rating - par + 0.5))`,
    ],
    mistakes: [
      // round() is banker's rounding: 10.5 becomes 10.
      `def course_handicap(index, slope=113, rating=72.0, par=72):
    return round(index * slope / 113 + (rating - par))`,
      // int() truncates toward zero, so negative values round the wrong way.
      `def course_handicap(index, slope=113, rating=72.0, par=72):
    return int(index * slope / 113 + (rating - par) + 0.5)`,
      // The wrong default par.
      `import math


def course_handicap(index, slope=113, rating=72.0, par=71):
    return math.floor(index * slope / 113 + (rating - par) + 0.5)`,
    ],
  },
  {
    id: 'lambda-map-filter',
    title: 'Order of play: lambda, map, filter, and sorting by a key',
    difficulty: 'medium',
    lesson: `
      <p>A <code>lambda</code> is a one-line, unnamed function: <code>lambda x: x * 2</code>. It's handy where a
      function is expected as an argument:</p>
      <pre>bags = [{'name': 'Ava', 'clubs': 14}, {'name': 'Liam', 'clubs': 11},
        {'name': 'Kenji', 'clubs': 0}]
full = filter(lambda b: b['clubs'] &gt; 0, bags)       # keeps matching items
by_size = sorted(full, key=lambda b: (-b['clubs'], b['name']))
names = list(map(lambda b: b['name'], by_size))      # transforms each item
print(names)    # ['Ava', 'Liam']</pre>
      <p><code>filter</code> and <code>map</code> return lazy iterators, so wrap them in <code>list()</code> to see
      the values. A sort key can return a <strong>tuple</strong>: Python compares the first items, then uses the
      second to break ties. Negate a number to sort it descending inside a tuple.</p>`,
    interview: `Sorting by a computed key (averages, lengths, a date inside a string) with a tie-breaker is everyday
      work, and "how do you break ties?" is the standard follow-up. Mention that <code>sorted()</code> returns a new
      list while <code>.sort()</code> changes the caller's list, which matters when you shouldn't modify the input.`,
    yardage: `<code>players</code> is a list of dicts like <code>{'name': 'Ava Birdwell', 'scores': [70, 73]}</code>.
      A player may have no scores yet. In pandas this is <code>sort_values(['avg', 'name'])</code>.`,
    task: `Write <code>def order_of_play(players)</code>. Return the names of the players who have at least one score,
      sorted by their average score (lowest first); players with the same average go in alphabetical order. Don't
      modify the list you're given. For example,
      <code>order_of_play([{'name': 'Kenji Sato', 'scores': [74]}, {'name': 'Ava Birdwell', 'scores': [70, 72]}])</code>
      returns <code>['Ava Birdwell', 'Kenji Sato']</code>.`,
    solution: `def order_of_play(players):
    active = filter(lambda p: len(p['scores']) > 0, players)
    ranked = sorted(
        active,
        key=lambda p: (sum(p['scores']) / len(p['scores']), p['name']),
    )
    return list(map(lambda p: p['name'], ranked))`,
    hint: "<code>filter</code> out empty score lists, sort with "
      + "<code>key=lambda p: (sum(p['scores']) / len(p['scores']), p['name'])</code>, and <code>map</code> to names.",
    checker: {
      type: 'function',
      function: 'order_of_play',
      noMutation: true,
      cases: [
        { args: "[{'name': 'Kenji Sato', 'scores': [74]}, {'name': 'Ava Birdwell', 'scores': [70, 72]}]", expected: "['Ava Birdwell', 'Kenji Sato']" },
        { args: "[{'name': 'Liam Chipman', 'scores': [86, 81, 87]}, {'name': 'Mina Park', 'scores': [69, 71]}, {'name': 'Hamish Craig', 'scores': [77]}]" },
        { args: "[{'name': 'Sofia Rossi', 'scores': [85, 90]}, {'name': 'Priya Raman', 'scores': [76, 75, 74]}]" },
        { args: "[{'name': 'Noah Greenfield', 'scores': [72, 74]}, {'name': 'Chloe Dubois', 'scores': [73]}]", hidden: true, label: 'tied averages go alphabetically' },
        { args: "[{'name': 'Mateo Fairway', 'scores': []}, {'name': 'Isla MacLeod', 'scores': [79]}]", hidden: true, label: 'a player with no scores' },
        { args: '[]', hidden: true, label: 'no players' },
        { args: "[{'name': 'Oscar Lindqvist', 'scores': [81, 75]}]", hidden: true, label: 'one player' },
      ],
    },
    alternatives: [
      `def order_of_play(players):
    rows = []
    for p in players:
        if p['scores']:
            average = sum(p['scores']) / len(p['scores'])
            rows.append((average, p['name']))
    return [name for average, name in sorted(rows)]`,
    ],
    mistakes: [
      // No tie-breaker: tied players stay in input order.
      `def order_of_play(players):
    active = [p for p in players if p['scores']]
    ranked = sorted(active, key=lambda p: sum(p['scores']) / len(p['scores']))
    return [p['name'] for p in ranked]`,
      // Sorts the caller's list in place.
      `def order_of_play(players):
    players.sort(key=lambda p: (sum(p['scores']) / max(len(p['scores']), 1), p['name']))
    return [p['name'] for p in players if p['scores']]`,
      // Doesn't filter: dividing by zero for a player with no scores.
      `def order_of_play(players):
    ranked = sorted(players, key=lambda p: (sum(p['scores']) / len(p['scores']), p['name']))
    return list(map(lambda p: p['name'], ranked))`,
    ],
  },
  {
    id: 'counter-defaultdict',
    title: 'Home course: Counter and defaultdict',
    difficulty: 'medium',
    lesson: `
      <p>The <code>collections</code> module has two dicts made for counting and grouping:</p>
      <ul>
        <li><code>Counter(items)</code> counts in one step. Missing keys count as 0, and
        <code>most_common(n)</code> lists the top n.</li>
        <li><code>defaultdict(factory)</code> creates a missing key's value by calling <code>factory</code>, so
        <code>defaultdict(list)</code> lets you <code>append</code> to a key you've never seen.</li>
      </ul>
      <pre>from collections import Counter, defaultdict

shots = ['fade', 'draw', 'fade', 'straight', 'fade']
print(Counter(shots).most_common(1))     # [('fade', 3)]

by_club = defaultdict(list)
for club, yards in [('7i', 160), ('PW', 120), ('7i', 155)]:
    by_club[club].append(yards)
print(dict(by_club))                     # {'7i': [160, 155], 'PW': [120]}</pre>
      <p>One catch: <code>most_common</code> breaks ties by the order items were first seen, not alphabetically.</p>`,
    interview: `Reaching for <code>Counter</code> and <code>defaultdict</code> instead of hand-rolled
      <code>if key not in d</code> checks is a quick fluency signal. The tie order of <code>most_common</code> is a
      good thing to mention unprompted, because it decides which answer a test expects.`,
    yardage: `<code>rounds</code> is a list of <code>(player, course)</code> tuples, one per round. In pandas this is a
      <code>groupby(['player', 'course']).size()</code> followed by picking the top course per player.`,
    task: `Write <code>def favorite_courses(rounds)</code>. Return a dict mapping each player to the course they've
      played most often. If a player's top courses tie, pick the one that comes first alphabetically. For example,
      <code>favorite_courses([('Ava Birdwell', 'Pine Hollow'), ('Ava Birdwell', 'Old Links'), ('Ava Birdwell',
      'Pine Hollow')])</code> returns <code>{'Ava Birdwell': 'Pine Hollow'}</code>.`,
    solution: `from collections import Counter, defaultdict


def favorite_courses(rounds):
    played = defaultdict(Counter)
    for player, course in rounds:
        played[player][course] += 1
    favorites = {}
    for player, counts in played.items():
        most = max(counts.values())
        favorites[player] = min(c for c, n in counts.items() if n == most)
    return favorites`,
    hint: '<code>defaultdict(Counter)</code> gives each player a counter. For each player, find the highest count and '
      + 'take <code>min()</code> of the courses with that count.',
    checker: {
      type: 'function',
      function: 'favorite_courses',
      cases: [
        { args: "[('Ava Birdwell', 'Pine Hollow'), ('Ava Birdwell', 'Old Links'), ('Ava Birdwell', 'Pine Hollow')]", expected: "{'Ava Birdwell': 'Pine Hollow'}" },
        { args: "[('Kenji Sato', 'Sakura Hills'), ('Mina Park', 'Sakura Hills'), ('Kenji Sato', 'Sakura Hills'), ('Kenji Sato', 'Coral Bay')]" },
        { args: "[('Noah Greenfield', 'Cypress Point'), ('Noah Greenfield', 'Lakeside Dunes'), ('Noah Greenfield', 'Lakeside Dunes')]" },
        { args: "[('Priya Raman', 'Riviera Verde'), ('Priya Raman', 'Coral Bay')]", hidden: true, label: 'a tie between two courses' },
        { args: '[]', hidden: true, label: 'no rounds' },
        { args: "[('Hamish Craig', 'Old Links')]", hidden: true, label: 'one round' },
        { args: "[('Sofia Rossi', 'Riviera Verde'), ('Sofia Rossi', 'Pine Hollow'), ('Sofia Rossi', 'Pine Hollow'), ('Sofia Rossi', 'Riviera Verde'), ('Liam Chipman', 'Old Links')]", hidden: true, label: 'a tie after several rounds' },
      ],
    },
    alternatives: [
      `def favorite_courses(rounds):
    counts = {}
    for player, course in rounds:
        key = (player, course)
        counts[key] = counts.get(key, 0) + 1
    best = {}
    for (player, course), n in sorted(counts.items()):
        if player not in best or n > counts[(player, best[player])]:
            best[player] = course
    return best`,
    ],
    mistakes: [
      // most_common breaks ties by first appearance, not alphabetically.
      `from collections import Counter, defaultdict


def favorite_courses(rounds):
    played = defaultdict(Counter)
    for player, course in rounds:
        played[player][course] += 1
    return {p: c.most_common(1)[0][0] for p, c in played.items()}`,
      // Breaks ties toward the alphabetically last course.
      `from collections import Counter, defaultdict


def favorite_courses(rounds):
    played = defaultdict(Counter)
    for player, course in rounds:
        played[player][course] += 1
    return {p: max(c, key=lambda k: (c[k], k)) for p, c in played.items()}`,
      // The course each player played last, not most.
      `def favorite_courses(rounds):
    return {player: course for player, course in rounds}`,
    ],
  },
  {
    id: 'try-except',
    title: 'Unplayable lies: cleaning input with try/except',
    difficulty: 'hard',
    lesson: `
      <p>Converting messy text raises errors: <code>int('DNF')</code> raises a <code>ValueError</code>, and
      <code>int(None)</code> a <code>TypeError</code>. <code>try</code>/<code>except</code> lets you handle them
      instead of crashing. Catch only the errors you expect, and as close to the risky line as possible:</p>
      <pre>readings = ['152', ' 148 ', 'n/a', None, '3000']
yards = []
skipped = 0
for text in readings:
    try:
        value = int(text)            # ' 148 ' is fine: int() strips spaces
    except (ValueError, TypeError):  # bad text, or a missing value
        skipped += 1
        continue                     # go on to the next reading
    if value &lt;= 400:                 # a sanity check, after parsing
        yards.append(value)
print(yards, skipped)   # [152, 148] 2: '3000' parsed but was too long</pre>
      <p>Never write a bare <code>except:</code>. It also swallows typos in your own code and makes bugs
      invisible.</p>`,
    interview: `Data cleaning questions test judgment: which rows are bad, and how do you count them instead of silently
      dropping them? Say your rules out loud (parse failures, missing values, out-of-range numbers), catch specific
      exceptions, and report how many rows you rejected. Interviewers also like hearing "EAFP" (try it, handle the
      failure) versus checking everything first.`,
    yardage: `<code>raw</code> is a list of score entries from a scanned card: mostly strings, possibly with spaces,
      words, decimals, or <code>None</code> for a missing entry. A valid score is a whole number from 50 to 150.`,
    task: `Write <code>def parse_scores(raw)</code>. Return a tuple <code>(scores, bad)</code>: <code>scores</code> is a
      list of the valid scores as ints, in order, and <code>bad</code> is how many entries were rejected. An entry is
      valid if <code>int()</code> accepts it (surrounding spaces are fine, decimals like <code>'71.0'</code> are not)
      and the number is from 50 to 150 inclusive. Entries can be <code>None</code>, which is bad too. For example,
      <code>parse_scores(['72', ' 68 ', 'DNF', '75'])</code> returns <code>([72, 68, 75], 1)</code>.`,
    solution: `def parse_scores(raw):
    scores = []
    bad = 0
    for text in raw:
        try:
            score = int(text)
        except (ValueError, TypeError):
            bad += 1
            continue
        if 50 <= score <= 150:
            scores.append(score)
        else:
            bad += 1
    return scores, bad`,
    hint: 'Wrap <code>int(text)</code> in <code>try</code> and catch <strong>both</strong> <code>ValueError</code> '
      + '(bad text) and <code>TypeError</code> (<code>None</code>). Check the range after parsing.',
    checker: {
      type: 'function',
      function: 'parse_scores',
      cases: [
        { args: "['72', ' 68 ', 'DNF', '75']", expected: '([72, 68, 75], 1)' },
        { args: "['70', '', '71']" },
        { args: "['seventy', '80', '79']" },
        { args: "['72', None]", hidden: true, label: 'a missing value (None)' },
        { args: "['-70', '500', '49', '150', '50']", hidden: true, label: 'out-of-range numbers, and the exact limits' },
        { args: "['71.0', '71.5']", hidden: true, label: 'decimals' },
        { args: '[]', hidden: true, label: 'empty card' },
        { args: "['x', 'y', ' ']", hidden: true, label: 'every entry bad' },
      ],
    },
    alternatives: [
      `def to_score(text):
    try:
        value = int(text)
    except (ValueError, TypeError):
        return None
    return value if 50 <= value <= 150 else None


def parse_scores(raw):
    parsed = [to_score(text) for text in raw]
    scores = [s for s in parsed if s is not None]
    return (scores, len(parsed) - len(scores))`,
    ],
    mistakes: [
      // Only catches ValueError: int(None) raises TypeError.
      `def parse_scores(raw):
    scores, bad = [], 0
    for text in raw:
        try:
            score = int(text)
        except ValueError:
            bad += 1
            continue
        if 50 <= score <= 150:
            scores.append(score)
        else:
            bad += 1
    return scores, bad`,
      // No range check.
      `def parse_scores(raw):
    scores, bad = [], 0
    for text in raw:
        try:
            scores.append(int(text))
        except (ValueError, TypeError):
            bad += 1
    return scores, bad`,
      // float() first accepts '71.0'.
      `def parse_scores(raw):
    scores, bad = [], 0
    for text in raw:
        try:
            score = int(float(text))
        except (ValueError, TypeError):
            bad += 1
            continue
        if 50 <= score <= 150:
            scores.append(score)
        else:
            bad += 1
    return scores, bad`,
    ],
  },
  {
    id: 'group-by',
    title: 'The clubhouse report: group-by in pure Python',
    difficulty: 'hard',
    lesson: `
      <p>"Group by" in plain Python is two passes: first <strong>collect</strong> each group's values into a dict of
      lists, then <strong>aggregate</strong> each list. <code>setdefault(key, [])</code> returns the existing list or
      inserts an empty one, so you can append in one line.</p>
      <pre>shots = [
    {'club': 'driver', 'yards': 280},
    {'club': 'wedge', 'yards': 95},
    {'club': 'driver', 'yards': 265},
]
groups = {}
for shot in shots:                                   # 1. collect
    groups.setdefault(shot['club'], []).append(shot['yards'])

summary = {}
for club, yards in groups.items():                   # 2. aggregate
    summary[club] = {'shots': len(yards), 'longest': max(yards)}
print(summary)</pre>
      <p>Round averages at the end, not before: averaging rounded numbers drifts.</p>`,
    interview: `"Compute per-group statistics without pandas" is a standard internship screen. It checks that you know
      group-by is collect-then-aggregate, that you can build nested dicts, and that you handle an empty input and a
      group with a single row. Name the pandas equivalent afterwards to show you know both.`,
    yardage: `<code>rounds</code> is a list of dicts with keys <code>'player'</code>, <code>'course'</code>, and
      <code>'score'</code>. A player can play a course more than once. In pandas this whole hole is
      <code>df.groupby('course').score.agg(['count', 'mean', 'min'])</code>.`,
    task: `Write <code>def course_report(rounds)</code>. Return a dict mapping each course to a dict with three keys:
      <code>'rounds'</code> (how many rounds were played there), <code>'average'</code> (the mean score, rounded with
      <code>round(average, 1)</code>), and <code>'best'</code> (the lowest score). For example, two rounds of 70 and 73
      at Pine Hollow give <code>{'Pine Hollow': {'rounds': 2, 'average': 71.5, 'best': 70}}</code>. No rounds means an
      empty dict.`,
    solution: `def course_report(rounds):
    by_course = {}
    for r in rounds:
        by_course.setdefault(r['course'], []).append(r['score'])
    report = {}
    for course, scores in by_course.items():
        report[course] = {
            'rounds': len(scores),
            'average': round(sum(scores) / len(scores), 1),
            'best': min(scores),
        }
    return report`,
    hint: "Collect scores per course with <code>by_course.setdefault(r['course'], []).append(r['score'])</code>, then "
      + 'build each summary with <code>len</code>, <code>round(sum / len, 1)</code>, and <code>min</code>.',
    checker: {
      type: 'function',
      function: 'course_report',
      cases: [
        { args: "[{'player': 'Ava Birdwell', 'course': 'Pine Hollow', 'score': 70}, {'player': 'Kenji Sato', 'course': 'Pine Hollow', 'score': 73}]", expected: "{'Pine Hollow': {'average': 71.5, 'best': 70, 'rounds': 2}}" },
        { args: "[{'player': 'Mina Park', 'course': 'Coral Bay', 'score': 70}, {'player': 'Noah Greenfield', 'course': 'Old Links', 'score': 72}, {'player': 'Priya Raman', 'course': 'Coral Bay', 'score': 74}]" },
        { args: "[{'player': 'Liam Chipman', 'course': 'Lakeside Dunes', 'score': 82}, {'player': 'Sofia Rossi', 'course': 'Lakeside Dunes', 'score': 85}, {'player': 'Hamish Craig', 'course': 'Sakura Hills', 'score': 77}]" },
        { args: "[{'player': 'Ava Birdwell', 'course': 'Old Links', 'score': 70}, {'player': 'Kenji Sato', 'course': 'Old Links', 'score': 71}, {'player': 'Mina Park', 'course': 'Old Links', 'score': 71}]", hidden: true, label: 'an average that needs rounding (70.67)' },
        { args: '[]', hidden: true, label: 'no rounds' },
        { args: "[{'player': 'Isla MacLeod', 'course': 'Riviera Verde', 'score': 79}]", hidden: true, label: 'one round' },
        { args: "[{'player': 'Chloe Dubois', 'course': 'Cypress Point', 'score': 80}, {'player': 'Chloe Dubois', 'course': 'Cypress Point', 'score': 78}]", hidden: true, label: 'the same player twice at one course' },
      ],
    },
    alternatives: [
      `from collections import defaultdict


def course_report(rounds):
    scores = defaultdict(list)
    for r in rounds:
        scores[r['course']].append(r['score'])
    return {
        course: {
            'rounds': len(s),
            'average': round(sum(s) / len(s), 1),
            'best': min(s),
        }
        for course, s in scores.items()
    }`,
    ],
    mistakes: [
      // Doesn't round the average.
      `def course_report(rounds):
    by_course = {}
    for r in rounds:
        by_course.setdefault(r['course'], []).append(r['score'])
    return {c: {'rounds': len(s), 'average': sum(s) / len(s), 'best': min(s)}
            for c, s in by_course.items()}`,
      // Counts players instead of rounds.
      `def course_report(rounds):
    by_course, players = {}, {}
    for r in rounds:
        by_course.setdefault(r['course'], []).append(r['score'])
        players.setdefault(r['course'], set()).add(r['player'])
    return {c: {'rounds': len(players[c]), 'average': round(sum(s) / len(s), 1), 'best': min(s)}
            for c, s in by_course.items()}`,
      // Best as the highest score.
      `def course_report(rounds):
    by_course = {}
    for r in rounds:
        by_course.setdefault(r['course'], []).append(r['score'])
    return {c: {'rounds': len(s), 'average': round(sum(s) / len(s), 1), 'best': max(s)}
            for c, s in by_course.items()}`,
    ],
  },
  {
    id: 'two-sum',
    title: 'Pick your partner: the two-sum classic',
    difficulty: 'hard',
    lesson: `
      <p>"Find two items that add up to a target" is the most famous hash-map question. Checking every pair takes
      O(n²) time. The fast way walks the list once and remembers what it has seen in a dict, so each item can ask
      "have I already seen the number I need?" in O(1):</p>
      <pre>def first_pair_summing(yards, target):
    seen = {}                       # value -&gt; index where it first appeared
    for j, y in enumerate(yards):
        need = target - y
        if need in seen:            # check BEFORE adding y
            return seen[need], j
        if y not in seen:           # keep the earliest index
            seen[y] = j
    return None</pre>
      <p>Two details make it correct: look up <em>before</em> storing the current item (or an item could pair with
      itself), and keep the <em>first</em> index of each value (so a repeated value doesn't overwrite it).</p>`,
    interview: `Two-sum is asked constantly, then varied. Walk through the brute force and its O(n²) cost, then the
      one-pass hash map (O(n) time, O(n) space). Then volunteer the edge cases: no pair, a single element, duplicate
      values, negative numbers, and which pair to return when several work.`,
    yardage: `<code>handicaps</code> is a list of whole-number course handicaps, one per player; plus handicaps are
      negative. <code>target</code> is the team handicap the pair must match exactly.`,
    task: `Write <code>def find_partners(handicaps, target)</code>. Return a tuple <code>(i, j)</code> of indices with
      <code>i &lt; j</code> whose handicaps add up to exactly <code>target</code>. If several pairs work, return the
      one with the smallest <code>j</code>, and for that <code>j</code> the smallest <code>i</code>. If no pair works,
      return <code>None</code>. For example, <code>find_partners([10, 4, 7, 12], 11)</code> returns
      <code>(1, 2)</code>.`,
    solution: `def find_partners(handicaps, target):
    seen = {}
    for j, h in enumerate(handicaps):
        need = target - h
        if need in seen:
            return (seen[need], j)
        if h not in seen:
            seen[h] = j
    return None`,
    hint: 'One pass with a dict of value → first index. For each <code>j</code>, look up <code>target - h</code> '
      + '<strong>before</strong> storing <code>h</code>, and never overwrite an index already stored.',
    checker: {
      type: 'function',
      function: 'find_partners',
      cases: [
        { args: '[10, 4, 7, 12], 11', expected: '(1, 2)' },
        { args: '[18, 3, 9, 6], 15' },
        { args: '[5, 20, 15, 9], 25' },
        { args: '[5, 5, 9, 5], 14', hidden: true, label: 'a repeated value (keep the first index)' },
        { args: '[7, 3, 7], 14', hidden: true, label: 'two equal handicaps make the pair' },
        { args: '[1, 5, 5, 9], 10', hidden: true, label: 'two valid pairs: smallest j wins' },
        { args: '[-2, 8, 12], 10', hidden: true, label: 'plus (negative) handicaps' },
        { args: '[1, 2, 3], 100', hidden: true, label: 'no pair' },
        { args: '[7], 14', hidden: true, label: 'one player' },
        { args: '[], 0', hidden: true, label: 'no players' },
        { args: 'list(range(1, 3001)), 5999', hidden: true, label: 'a large field' },
      ],
    },
    alternatives: [
      // Brute force, in the order the task asks for: correct, just O(n²).
      `def find_partners(handicaps, target):
    for j in range(len(handicaps)):
        for i in range(j):
            if handicaps[i] + handicaps[j] == target:
                return i, j
    return None`,
    ],
    mistakes: [
      // Overwrites the index of a repeated value.
      `def find_partners(handicaps, target):
    seen = {}
    for j, h in enumerate(handicaps):
        if target - h in seen:
            return (seen[target - h], j)
        seen[h] = j
    return None`,
      // Stores before looking up: a player pairs with themselves.
      `def find_partners(handicaps, target):
    seen = {}
    for j, h in enumerate(handicaps):
        seen.setdefault(h, j)
        if target - h in seen:
            return (seen[target - h], j)
    return None`,
      // Brute force by smallest i first: a different pair when several work.
      `def find_partners(handicaps, target):
    for i in range(len(handicaps)):
        for j in range(i + 1, len(handicaps)):
            if handicaps[i] + handicaps[j] == target:
                return (i, j)
    return None`,
    ],
  },
  {
    id: 'clean-and-rank',
    title: 'The 19th hole: clean, group, and rank',
    difficulty: 'hard',
    lesson: `
      <p>The capstone puts the whole tournament together, the way a take-home task would. Plan it as a pipeline
      and build one stage at a time, printing as you go:</p>
      <ol>
        <li><strong>Parse:</strong> split each line, <code>strip()</code> each field, and skip rows that don't have
        the right shape.</li>
        <li><strong>Validate:</strong> convert numbers inside <code>try</code>/<code>except</code>; skip what
        fails.</li>
        <li><strong>Normalize and dedupe:</strong> make equal things look equal (case, spacing), and use a
        <code>set</code> of keys to drop repeated submissions.</li>
        <li><strong>Group and aggregate:</strong> a dict of lists, then counts and averages.</li>
        <li><strong>Rank:</strong> sort by a tuple key, then assign ranks, giving ties the same rank.</li>
      </ol>
      <pre>times = [('Ava', 41.0), ('Kenji', 39.5), ('Mina', 41.0), ('Noah', 44.2)]
times.sort(key=lambda t: (t[1], t[0]))
ranked = []
for i, (name, t) in enumerate(times):
    tied = i &gt; 0 and t == times[i - 1][1]
    rank = ranked[-1][0] if tied else i + 1
    ranked.append((rank, name, t))
print(ranked)   # Kenji 1, Ava 2, Mina 2, Noah 4</pre>
      <p>That's golf's leaderboard rule (and SQL's <code>RANK()</code> from Window Functions): tied players share a
      position, and the next position skips ahead.</p>`,
    interview: `This is the shape of most data science take-home and live "messy data" questions. Interviewers grade
      the process as much as the result: clear cleaning rules stated up front, rejected rows handled on purpose,
      duplicates caught, ties handled, and code split into readable steps. Mention that pandas would do steps 4 and 5
      with <code>groupby</code> and <code>rank(method='min')</code>.`,
    yardage: `<code>lines</code> is a list of strings like <code>'Ava Birdwell, Pine Hollow, 2026-04-30, 72'</code>:
      name, course, date, score, separated by commas. Expect extra spaces, names in any case, blank lines, missing
      fields, scores like <code>DNF</code>, and the same round submitted twice. In pandas: <code>read_csv</code>,
      <code>drop_duplicates</code>, <code>groupby('name').score.agg(['count', 'mean'])</code>, then
      <code>rank(method='min')</code>.`,
    task: `Write <code>def leaderboard(lines, min_rounds=2)</code>. Clean the lines and return the leaderboard as a list
      of tuples <code>(rank, name, rounds, average)</code>.
      <br>• <strong>Clean:</strong> split each line on commas and strip every field. Skip a line unless it has exactly
      4 fields, a non-empty name, and a score that <code>int()</code> accepts. Write names in title case
      (<code>'ava birdwell'</code> → <code>'Ava Birdwell'</code>).
      <br>• <strong>Dedupe:</strong> a row with the same name, course, and date as an earlier valid row is a repeated
      submission: skip it.
      <br>• <strong>Summarize:</strong> keep players with at least <code>min_rounds</code> rounds; their average is
      rounded to 2 decimals with <code>round()</code>.
      <br>• <strong>Rank:</strong> sort by that rounded average (lowest first), then by name. Players with the same
      rounded average share a rank, and the next rank skips (1, 1, 3).`,
    solution: `def leaderboard(lines, min_rounds=2):
    seen = set()
    scores = {}
    for line in lines:
        fields = [f.strip() for f in line.split(',')]
        if len(fields) != 4 or not fields[0]:
            continue
        name, course, date, score = fields
        try:
            score = int(score)
        except ValueError:
            continue
        name = name.title()
        if (name, course, date) in seen:
            continue
        seen.add((name, course, date))
        scores.setdefault(name, []).append(score)

    table = []
    for name, s in scores.items():
        if len(s) >= min_rounds:
            table.append((round(sum(s) / len(s), 2), name, len(s)))
    table.sort()

    board = []
    for i, (average, name, rounds) in enumerate(table):
        rank = i + 1
        if i > 0 and average == table[i - 1][0]:
            rank = board[-1][0]
        board.append((rank, name, rounds, average))
    return board`,
    hint: 'Three loops: clean into a dict of name → scores (with a <code>set</code> of (name, course, date) for '
      + 'duplicates); build <code>(average, name, rounds)</code> tuples and sort them; then walk the sorted list, '
      + "reusing the previous rank when the average equals the previous player's.",
    checker: {
      type: 'function',
      function: 'leaderboard',
      cases: [
        {
          args: "['Ava Birdwell, Pine Hollow, 2026-04-30, 72', 'Kenji Sato, Sakura Hills, 2026-05-02, 74', 'ava birdwell, Old Links, 2026-05-09, 70', 'Kenji Sato, Coral Bay, 2026-05-20, 75']",
          expected: "[(1, 'Ava Birdwell', 2, 71.0), (2, 'Kenji Sato', 2, 74.5)]",
        },
        { args: "['  mina park ,Coral Bay, 2026-06-01,69', 'Mina Park, Sakura Hills, 2026-06-08, 73', 'Noah Greenfield, Old Links, 2026-06-02, DNF', 'Noah Greenfield, Old Links, 2026-06-09, 75', '', 'Noah Greenfield, Cypress Point, 2026-06-15, 74']" },
        { args: "['Liam Chipman, Old Links, 2026-07-13, 84', 'Liam Chipman, Pine Hollow, 2026-07-21, 83', 'Priya Raman, Coral Bay, 2026-07-01, 76', 'Liam Chipman, Lakeside Dunes, 2026-07-25', 'Priya Raman, Riviera Verde, 2026-07-09, 78'], 2" },
        { args: "['Ava Birdwell, Pine Hollow, 2026-04-30, 72', 'Ava Birdwell, Pine Hollow, 2026-04-30, 72', 'AVA BIRDWELL,  Pine Hollow , 2026-04-30 , 72', 'Ava Birdwell, Old Links, 2026-05-09, 76']", hidden: true, label: 'the same round submitted three times' },
        { args: "['Chloe Dubois, Old Links, 2026-06-20, 79', 'Chloe Dubois, Old Links, 2026-07-19, 83', 'Hamish Craig, Old Links, 2026-04-23, 77', 'Hamish Craig, Old Links, 2026-05-07, 85', 'Priya Raman, Coral Bay, 2026-05-01, 80']", hidden: true, label: 'tied averages share a rank' },
        { args: "['Sofia Rossi, Riviera Verde, 2026-04-25, 85', 'Oscar Lindqvist, Lakeside Dunes, 2026-03-09, 75', 'Oscar Lindqvist, Lakeside Dunes, 2026-03-19, 81'], 3", hidden: true, label: 'nobody reaches min_rounds' },
        { args: "['Mateo Fairway, Riviera Verde, 2026-07-30, 74'], 1", hidden: true, label: 'min_rounds of 1' },
        { args: "['', 'just one field', ', Old Links, 2026-05-01, 72', 'Kenji Sato, Coral Bay, 2026-05-20, 7 5', 'Kenji Sato, Coral Bay, 2026-05-20, 75, extra']", hidden: true, label: 'every row is bad' },
        { args: '[]', hidden: true, label: 'no lines' },
      ],
    },
    alternatives: [
      `from collections import defaultdict


def clean(line):
    fields = [f.strip() for f in line.split(',')]
    if len(fields) != 4 or not fields[0]:
        return None
    try:
        score = int(fields[3])
    except ValueError:
        return None
    return fields[0].title(), fields[1], fields[2], score


def leaderboard(lines, min_rounds=2):
    rows = {}
    for line in lines:
        row = clean(line)
        if row and row[:3] not in rows:
            rows[row[:3]] = row[3]
    by_player = defaultdict(list)
    for (name, _, _), score in rows.items():
        by_player[name].append(score)
    stats = sorted(
        (round(sum(s) / len(s), 2), name, len(s))
        for name, s in by_player.items()
        if len(s) >= min_rounds
    )
    averages = [avg for avg, _, _ in stats]
    return [(averages.index(avg) + 1, name, n, avg) for avg, name, n in stats]`,
    ],
    mistakes: [
      // No dedupe: repeated submissions count.
      `def leaderboard(lines, min_rounds=2):
    scores = {}
    for line in lines:
        fields = [f.strip() for f in line.split(',')]
        if len(fields) != 4 or not fields[0]:
            continue
        try:
            score = int(fields[3])
        except ValueError:
            continue
        scores.setdefault(fields[0].title(), []).append(score)
    table = sorted((round(sum(s) / len(s), 2), n, len(s)) for n, s in scores.items() if len(s) >= min_rounds)
    board = []
    for i, (avg, name, rounds) in enumerate(table):
        rank = board[-1][0] if i and avg == table[i - 1][0] else i + 1
        board.append((rank, name, rounds, avg))
    return board`,
      // Ranks 1, 2, 3 even when averages tie.
      `def leaderboard(lines, min_rounds=2):
    seen, scores = set(), {}
    for line in lines:
        fields = [f.strip() for f in line.split(',')]
        if len(fields) != 4 or not fields[0]:
            continue
        try:
            score = int(fields[3])
        except ValueError:
            continue
        key = (fields[0].title(), fields[1], fields[2])
        if key not in seen:
            seen.add(key)
            scores.setdefault(key[0], []).append(score)
    table = sorted((round(sum(s) / len(s), 2), n, len(s)) for n, s in scores.items() if len(s) >= min_rounds)
    return [(i + 1, name, rounds, avg) for i, (avg, name, rounds) in enumerate(table)]`,
      // Dedupes before normalizing the name, so 'AVA BIRDWELL' slips through.
      `def leaderboard(lines, min_rounds=2):
    seen, scores = set(), {}
    for line in lines:
        fields = [f.strip() for f in line.split(',')]
        if len(fields) != 4 or not fields[0]:
            continue
        try:
            score = int(fields[3])
        except ValueError:
            continue
        if tuple(fields[:3]) in seen:
            continue
        seen.add(tuple(fields[:3]))
        scores.setdefault(fields[0].title(), []).append(score)
    table = sorted((round(sum(s) / len(s), 2), n, len(s)) for n, s in scores.items() if len(s) >= min_rounds)
    board = []
    for i, (avg, name, rounds) in enumerate(table):
        rank = board[-1][0] if i and avg == table[i - 1][0] else i + 1
        board.append((rank, name, rounds, avg))
    return board`,
    ],
  },
];
