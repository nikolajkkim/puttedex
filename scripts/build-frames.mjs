// Builds the pandas tournament's CSV datasets (js/data/datasets/clubhouse-csv/<variant>/<table>.csv): the same golf
// world as the SQL clubhouse database, exported the way real data arrives, messiness included.
//
//   node scripts/build-frames.mjs          rewrite the CSV files
//
// Deterministic: a seeded PRNG, no dates or randomness from the environment, so the files only change when this
// script does. tests/frames-dataset.test.mjs rebuilds every variant in memory and fails if the committed files differ.
// Changing the data changes expected answers: run `npm test` afterwards and re-read every pandas task.
//
// Variants: `main` is what learners see (the data panel, Run, and the visible test). `alt` is a hidden variant with
// the same schema and the same kinds of messiness but different players, values, months, and keys, so a hardcoded
// answer fails. Per-hole edge cases (ties, an empty group, an all-null column) come from the checker's case `setup`.
//
// Deliberate messiness (CLAUDE.md lists what each hole relies on):
//   players  name and country with stray whitespace and inconsistent casing; handicap missing for some; home_course_id
//            missing for some (so pandas reads it as float64); dues stored as strings like "$1,250"; joined_on is a
//            date string; two "duplicate signups" (a new player_id for an existing person, formatted differently);
//            players with no rounds.
//   rounds   played_on is a date string; putts and weather missing for some rounds; a few rounds by player_ids that
//            aren't in players (deleted accounts); one course nobody played.
//   scores   hole-by-hole cards for most (not all) rounds; two cards uploaded twice (exact duplicate rows); one card
//            for a round_id that isn't in rounds; putts missing where the round's putts are.
//   legacy_rounds  last season from the old app: wide (h1..h18 columns), different column names and order.

import { writeFileSync, mkdirSync } from 'node:fs';

export const TABLES = ['players', 'courses', 'rounds', 'scores', 'legacy_rounds'];
export const VARIANTS = ['main', 'alt'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The 16 clubhouse members from the SQL dataset first (same ids, names, handicaps, home clubs), then newer members.
// [name, country, handicap (null = none), is_pro, home_course_id (null = none), joined_on]
const MEMBERS = [
  ['Ava Birdwell', 'USA', 2.4, true, 1, '2019-04-12'],
  ['Mateo Fairway', 'ESP', 5.1, false, 6, '2020-06-03'],
  ['Kenji Sato', 'JPN', 0.8, true, 4, '2018-09-21'],
  ['Isla Macleod', 'SCO', null, false, 2, '2021-03-15'],
  ['Liam Chipman', 'USA', 12.3, false, 1, '2022-05-30'],
  ['Priya Raman', 'IND', 3.7, true, null, '2019-11-08'],
  ['Oscar Lindqvist', 'SWE', 8.9, false, 5, '2020-02-17'],
  ['Chloe Dubois', 'FRA', null, false, null, '2023-07-01'],
  ['Noah Greenfield', 'USA', 1.5, true, 3, '2017-08-25'],
  ['Sofia Rossi', 'ITA', 15.0, false, 6, '2021-10-10'],
  ['Hamish Craig', 'SCO', 4.2, false, 2, '2018-04-04'],
  ['Mina Park', 'KOR', 0.3, true, 4, '2016-12-19'],
  ['Lucas Ferreira', 'BRA', 18.2, false, null, '2026-01-14'],
  ['Grace Thompson', 'USA', null, false, 3, '2026-02-02'],
  ['Erik Johansson', 'SWE', 6.4, false, 5, '2025-12-08'],
  ['Aiko Tanaka', 'JPN', 9.8, true, 4, '2026-01-27'],
  ['Zoe Brennan', 'IRL', 7.2, false, 2, '2022-08-14'],
  ['Rafael Ortiz', 'MEX', 10.6, false, 6, '2023-03-09'],
  ['Hannah Weber', 'GER', 3.1, false, 5, '2019-05-22'],
  ['Tom Akers', 'AUS', 0.0, true, 8, '2017-01-30'],
  ['Leila Haddad', 'FRA', 13.4, false, null, '2024-04-18'],
  ['Jack Morrow', 'USA', 5.8, false, 3, '2020-09-12'],
  ['Freya Holm', 'SWE', 2.2, true, 5, '2018-06-06'],
  ['Arjun Mehta', 'IND', 11.1, false, 1, '2024-11-03'],
  ['Emma Clarke', 'ENG', 4.9, false, 2, '2021-01-25'],
  ['Diego Alvarez', 'ESP', null, false, 6, '2025-05-16'],
  ['Yuki Mori', 'JPN', 1.9, true, 4, '2019-07-29'],
  ['Ruby Walsh', 'NZL', 8.0, false, 8, '2023-10-02'],
  ['Ben Okafor', 'ENG', 14.7, false, 2, '2024-02-11'],
  ['Clara Novak', 'CAN', 6.9, false, 1, '2022-12-01'],
  ['Felix Braun', 'GER', 9.3, false, 5, '2021-06-18'],
  ['Sara Lindgren', 'SWE', 2.7, true, 5, '2020-03-27'],
];

const COURSES = [
  // [name, city, country, par, yardage]
  ['Pine Hollow', 'Pinehurst', 'USA', 72, 7120],
  ['Old Links', 'St Andrews', 'SCO', 72, 6980],
  ['Cypress Point', 'Monterey', 'USA', 71, 6530],
  ['Sakura Hills', 'Chiba', 'JPN', 72, 7010],
  ['Lakeside Dunes', 'Malmo', 'SWE', 70, 6450],
  ['Riviera Verde', 'Marbella', 'ESP', 71, 6810],
  ['Desert Mirage', 'Scottsdale', 'USA', 72, 7250],
  ['Coral Bay', 'Sydney', 'AUS', 71, 6720],
];

const WEATHER = ['Sunny', 'Sunny', 'Sunny', 'Overcast', 'Overcast', 'Windy', 'Rain'];

const CONFIG = {
  main: {
    seed: 20260301,
    // member index (into MEMBERS) for player_id 1, 2, …
    roster: [...Array(28).keys()],
    noRounds: [13, 14, 15, 16], // player_ids who never played (as in the SQL dataset)
    duplicates: [[9, ' noah GREENFIELD', 'usa '], [21, 'leila haddad', ' Fra']], // [player_id copied, name, country]
    messyNames: { 2: ' Mateo Fairway', 3: 'kenji sato', 7: 'OSCAR LINDQVIST ', 18: 'Rafael  Ortiz', 24: ' arjun mehta' },
    messyCountries: { 5: 'usa', 11: ' Sco', 19: 'GER ', 22: 'Usa', 25: 'eng', 26: ' esp ' },
    months: ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
    roundsPerPlayer: [6, 13],
    unplayed: 7, // course_id nobody played
    orphans: [[99, 3], [97, 2]], // [player_id not in players, how many rounds]
    noCard: 0.18, // share of rounds without a hole-by-hole card
    duplicateCards: 2,
    legacy: { rounds: 48, months: ['2025-09', '2025-10', '2025-11'], firstId: 9001 },
  },
  alt: {
    seed: 77031,
    roster: [3, 0, 11, 8, 19, 1, 22, 6, 30, 4, 9, 26, 12, 17, 24, 29, 10, 14, 20, 31, 2, 28],
    noRounds: [18, 19, 21],
    duplicates: [[4, 'noah greenfield', ' USA'], [11, ' SOFIA rossi ', 'ita']],
    messyNames: { 1: 'isla MACLEOD', 6: 'Mateo Fairway ', 9: '  felix braun', 14: 'RAFAEL ORTIZ' },
    messyCountries: { 2: ' usa', 5: 'aus', 8: 'Swe ', 12: ' jpn', 16: 'Eng' },
    months: ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'],
    roundsPerPlayer: [3, 11],
    unplayed: 3,
    orphans: [[77, 2], [55, 1]],
    noCard: 0.25,
    duplicateCards: 1,
    legacy: { rounds: 31, months: ['2025-08', '2025-10', '2025-11', '2025-12'], firstId: 7001 },
  },
};

const DUES = (rng, isPro) => {
  if (rng() < 0.08) return '';
  const amount = isPro ? 0 : 600 + Math.round(rng() * 14) * 50;
  const style = rng();
  const withComma = amount.toLocaleString('en-US');
  return style < 0.6 ? `$${withComma}` : style < 0.8 ? String(amount) : style < 0.9 ? `$ ${amount}` : `$${withComma}.00`;
};

/** Every table of one variant as rows of { column: value } (null = missing). */
export function buildTables(variant) {
  const cfg = CONFIG[variant];
  const rng = mulberry32(cfg.seed);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // ---------- courses (same 8 in every variant; one hole layout per course) ----------
  const courses = COURSES.map(([name, city, country, par, yardage], i) => ({
    course_id: i + 1, name, city, country, par, yardage: variant === 'main' ? yardage : yardage - 40 + int(0, 8) * 10,
  }));
  const layouts = new Map(courses.map((c) => {
    // 18 hole pars summing to the course par: four par 3s, and par 5s to make up the rest.
    const fives = c.par - 72 + 4;
    const pars = Array(18).fill(4);
    const threes = [2, 6, 11, 15];
    threes.forEach((h) => { pars[h] = 3; });
    [4, 8, 12, 17].slice(0, fives).forEach((h) => { pars[h] = 5; });
    return [c.course_id, pars];
  }));

  // ---------- players ----------
  const players = cfg.roster.map((m, i) => {
    const [name, country, handicap, isPro, home, joined] = MEMBERS[m];
    const id = i + 1;
    const hcp = variant === 'main' ? handicap
      : handicap === null || rng() < 0.15 ? null : Math.round((handicap + (rng() - 0.5) * 4) * 10) / 10;
    return {
      player_id: id,
      name: cfg.messyNames[id] ?? name,
      country: cfg.messyCountries[id] ?? country,
      handicap: hcp === null ? null : Math.max(0, hcp),
      is_pro: isPro,
      home_course_id: variant === 'main' ? home : (home === null || home === cfg.unplayed ? null : home),
      dues: DUES(rng, isPro),
      joined_on: joined,
    };
  });
  for (const [copyOf, name, country] of cfg.duplicates) {
    const orig = players[copyOf - 1];
    players.push({
      ...orig, player_id: players.length + 1, name, country, handicap: null, dues: '', joined_on: '2026-03-0' + int(1, 9),
    });
  }

  // ---------- rounds ----------
  const daysIn = (ym) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  const randomDate = (months) => {
    const ym = pick(months);
    return `${ym}-${String(int(1, daysIn(ym))).padStart(2, '0')}`;
  };
  const playable = courses.map((c) => c.course_id).filter((id) => id !== cfg.unplayed);
  const raw = [];
  const playRound = (playerId, skill, isPro, home) => {
    const courseId = home && home !== cfg.unplayed && rng() < 0.45 ? home
      : pick(isPro ? playable : playable.filter((id) => id !== 8)); // Coral Bay: pros only, as in the SQL data
    const course = courses[courseId - 1];
    const over = Math.round(skill * 0.9 + (rng() + rng() + rng() - 1.5) * 4);
    const putts = Math.max(24, Math.min(38, Math.round(30 + skill * 0.15 + (rng() - 0.5) * 8)));
    raw.push({
      player_id: playerId,
      course_id: courseId,
      played_on: randomDate(cfg.months),
      score: course.par + Math.max(-4, over),
      putts,
      fairways_hit: Math.max(2, Math.min(14, Math.round(9 - skill * 0.2 + (rng() - 0.5) * 6))),
      weather: pick(WEATHER),
    });
  };
  for (const p of players.slice(0, cfg.roster.length)) {
    if (cfg.noRounds.includes(p.player_id)) continue;
    const skill = p.handicap ?? 10;
    const n = int(...cfg.roundsPerPlayer);
    for (let k = 0; k < n; k++) playRound(p.player_id, skill, p.is_pro, p.home_course_id);
  }
  for (const [orphan, n] of cfg.orphans) for (let k = 0; k < n; k++) playRound(orphan, 8, false, null);
  // Chronological round ids (ties on a date in generation order), like the SQL dataset.
  const order = raw.map((r, i) => [r.played_on, i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  const rounds = order.map(([, i], k) => ({ round_id: k + 1, ...raw[i] }));
  for (const r of rounds) {
    if (rng() < 0.05) r.putts = null;
    if (rng() < 0.03) r.weather = null;
  }

  // ---------- scores (hole by hole) ----------
  const cardFor = (r, roundId = r.round_id) => {
    const pars = layouts.get(r.course_id);
    const totalPutts = r.putts ?? Math.round(30 + (rng() - 0.5) * 6);
    const putts = Array(18).fill(1);
    for (let left = totalPutts - 18; left > 0;) {
      const h = int(0, 17);
      if (putts[h] < 3) { putts[h] += 1; left -= 1; }
    }
    const strokes = pars.map((par, h) => Math.max(par, putts[h] + 1));
    let sum = strokes.reduce((a, b) => a + b, 0);
    while (sum > r.score) {
      const h = int(0, 17);
      if (strokes[h] > putts[h] + 1 && strokes[h] > 2) { strokes[h] -= 1; sum -= 1; }
    }
    while (sum < r.score) {
      const h = int(0, 17);
      strokes[h] += 1;
      sum += 1;
    }
    return pars.map((par, h) => ({ round_id: roundId, hole: h + 1, par, strokes: strokes[h], putts: r.putts === null ? null : putts[h] }));
  };
  const carded = rounds.filter(() => rng() >= cfg.noCard);
  let scores = carded.flatMap((r) => cardFor(r));
  // Cards uploaded twice: exact duplicate rows, appended where the second upload landed.
  for (let k = 0; k < cfg.duplicateCards; k++) {
    const r = carded[Math.floor(carded.length * (0.3 + 0.4 * k))];
    scores = scores.concat(scores.filter((s) => s.round_id === r.round_id).map((s) => ({ ...s })));
  }
  // A card for a round that isn't in rounds (its round was deleted).
  scores = scores.concat(cardFor({ ...rounds[0], putts: 30, score: rounds[0].score }, rounds.length + 100));

  // ---------- legacy rounds (last season, wide) ----------
  const legacy = [];
  const veterans = players.slice(0, cfg.roster.length).filter((p) => !cfg.noRounds.includes(p.player_id) && p.joined_on < '2025-06-01');
  for (let k = 0; k < cfg.legacy.rounds; k++) {
    const p = pick(veterans);
    const before = raw.length;
    playRound(p.player_id, (p.handicap ?? 10) + 1, p.is_pro, p.home_course_id);
    const r = raw.splice(before, 1)[0];
    r.played_on = randomDate(cfg.legacy.months);
    const card = cardFor(r, 0);
    legacy.push({ date: r.played_on, course: r.course_id, player: r.player_id, total: r.score, holes: card.map((s) => s.strokes) });
  }
  legacy.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const legacyRows = legacy.map((l, i) => {
    const row = { id: cfg.legacy.firstId + i, date: l.date, course: l.course, player: l.player, total: l.total };
    l.holes.forEach((s, h) => { row[`h${h + 1}`] = s; });
    return row;
  });

  return { players, courses, rounds, scores, legacy_rounds: legacyRows };
}

const cell = (v) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v);
  return /[",\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows) {
  const columns = Object.keys(rows[0]);
  return `${[columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n')}\n`;
}

/** { table: csvText } for one variant. */
export function buildFrames(variant) {
  const tables = buildTables(variant);
  return Object.fromEntries(TABLES.map((t) => [t, toCsv(tables[t])]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const variant of VARIANTS) {
    const dir = new URL(`../js/data/datasets/clubhouse-csv/${variant}/`, import.meta.url);
    mkdirSync(dir, { recursive: true });
    for (const [table, csv] of Object.entries(buildFrames(variant))) {
      writeFileSync(new URL(`${table}.csv`, dir), csv);
      console.log(`${variant}/${table}.csv: ${csv.trim().split('\n').length - 1} rows`);
    }
  }
}
