// Clubhouse dataset: the golf database shared by the SQL tournaments.
// Changing any row changes expected answers. Run `npm test` after editing.

export const SCHEMA = `
CREATE TABLE players (
  player_id  INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  country    TEXT NOT NULL,
  handicap   REAL,            -- NULL when the player has no official handicap yet
  is_pro     INTEGER NOT NULL, -- 1 = professional, 0 = amateur
  home_course_id INTEGER REFERENCES courses(course_id) -- the player's home club; NULL when they have none
);

CREATE TABLE courses (
  course_id  INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  city       TEXT NOT NULL,
  country    TEXT NOT NULL,
  par        INTEGER NOT NULL,
  yardage    INTEGER NOT NULL
);

CREATE TABLE rounds (
  round_id     INTEGER PRIMARY KEY,
  player_id    INTEGER NOT NULL REFERENCES players(player_id),
  course_id    INTEGER NOT NULL REFERENCES courses(course_id),
  played_on    TEXT NOT NULL,   -- ISO date, YYYY-MM-DD
  score        INTEGER NOT NULL,
  putts        INTEGER NOT NULL,
  fairways_hit INTEGER NOT NULL,
  weather      TEXT NOT NULL
);
`;

export const SEED = SCHEMA + `
INSERT INTO players VALUES
  (1, 'Ava Birdwell', 'USA', 2.4, 1, 1),
  (2, 'Mateo Fairway', 'Spain', 5.1, 0, 6),
  (3, 'Kenji Sato', 'Japan', 0.8, 1, 4),
  (4, 'Isla MacLeod', 'Scotland', NULL, 0, 2),
  (5, 'Liam Chipman', 'USA', 12.3, 0, 1),
  (6, 'Priya Raman', 'India', 3.7, 1, NULL),
  (7, 'Oscar Lindqvist', 'Sweden', 8.9, 0, 5),
  (8, 'Chloe Dubois', 'France', NULL, 0, NULL),
  (9, 'Noah Greenfield', 'USA', 1.5, 1, 3),
  (10, 'Sofia Rossi', 'Italy', 15.0, 0, 6),
  (11, 'Hamish Craig', 'Scotland', 4.2, 0, 2),
  (12, 'Mina Park', 'South Korea', 0.3, 1, 4),
  -- Members who haven't played a recorded round yet
  (13, 'Lucas Ferreira', 'Brazil', 18.2, 0, NULL),
  (14, 'Grace Thompson', 'USA', NULL, 0, 3),
  (15, 'Erik Johansson', 'Sweden', 6.4, 0, 5),
  (16, 'Aiko Tanaka', 'Japan', 9.8, 1, 4);

INSERT INTO courses VALUES
  (1, 'Pine Hollow', 'Pinehurst', 'USA', 72, 7120),
  (2, 'Old Links', 'St Andrews', 'Scotland', 72, 6980),
  (3, 'Cypress Point', 'Monterey', 'USA', 71, 6530),
  (4, 'Sakura Hills', 'Chiba', 'Japan', 72, 7010),
  (5, 'Lakeside Dunes', 'Malmo', 'Sweden', 70, 6450),
  (6, 'Riviera Verde', 'Marbella', 'Spain', 71, 6810),
  (7, 'Desert Mirage', 'Scottsdale', 'USA', 72, 7250), -- no rounds yet, and nobody's home course
  (8, 'Coral Bay', 'Sydney', 'Australia', 71, 6720);   -- played, but nobody's home course

INSERT INTO rounds VALUES
  (1, 5, 2, '2026-03-15', 86, 28, 6, 'Sunny'),
  (2, 9, 2, '2026-03-17', 76, 31, 8, 'Windy'),
  (3, 7, 6, '2026-03-20', 82, 29, 6, 'Sunny'),
  (4, 7, 4, '2026-03-24', 81, 33, 7, 'Overcast'),
  (5, 3, 4, '2026-04-04', 74, 27, 4, 'Overcast'),
  (6, 6, 6, '2026-04-04', 75, 32, 9, 'Sunny'),
  (7, 9, 6, '2026-04-05', 75, 29, 9, 'Rain'),
  (8, 12, 3, '2026-04-07', 69, 26, 7, 'Sunny'),
  (9, 5, 4, '2026-04-08', 81, 34, 4, 'Overcast'),
  (10, 12, 3, '2026-04-11', 73, 32, 11, 'Rain'),
  (11, 1, 2, '2026-04-16', 73, 30, 12, 'Sunny'),
  (12, 1, 2, '2026-04-21', 70, 28, 8, 'Sunny'),
  (13, 11, 4, '2026-04-23', 77, 30, 7, 'Sunny'),
  (14, 10, 3, '2026-04-25', 85, 32, 5, 'Overcast'),
  (15, 6, 2, '2026-04-29', 78, 32, 10, 'Rain'),
  (16, 1, 1, '2026-04-30', 72, 26, 13, 'Sunny'),
  (17, 10, 1, '2026-04-30', 85, 38, 6, 'Sunny'),
  (18, 12, 3, '2026-04-30', 73, 31, 9, 'Sunny'),
  (19, 11, 2, '2026-05-03', 79, 28, 11, 'Sunny'),
  (20, 11, 3, '2026-05-07', 77, 30, 6, 'Overcast'),
  (21, 7, 6, '2026-05-23', 81, 31, 8, 'Overcast'),
  (22, 3, 2, '2026-05-25', 75, 32, 8, 'Sunny'),
  (23, 3, 1, '2026-05-26', 75, 30, 11, 'Overcast'),
  (24, 1, 6, '2026-05-27', 74, 28, 9, 'Overcast'),
  (25, 9, 4, '2026-05-29', 73, 28, 7, 'Windy'),
  (26, 12, 4, '2026-05-29', 69, 24, 11, 'Sunny'),
  (27, 6, 2, '2026-05-31', 74, 31, 11, 'Rain'),
  (28, 8, 2, '2026-06-06', 79, 30, 4, 'Sunny'),
  (29, 3, 6, '2026-06-12', 71, 31, 11, 'Overcast'),
  (30, 9, 3, '2026-06-17', 75, 33, 9, 'Sunny'),
  (31, 12, 2, '2026-06-19', 78, 28, 10, 'Windy'),
  (32, 4, 3, '2026-06-20', 79, 28, 5, 'Overcast'),
  (33, 6, 4, '2026-06-20', 79, 31, 8, 'Overcast'),
  (34, 2, 5, '2026-07-01', 79, 29, 7, 'Windy'),
  (35, 6, 3, '2026-07-10', 74, 32, 11, 'Sunny'),
  (36, 5, 1, '2026-07-13', 84, 33, 4, 'Rain'),
  (37, 4, 4, '2026-07-19', 83, 29, 6, 'Sunny'),
  (38, 5, 1, '2026-07-21', 83, 31, 7, 'Sunny'),
  (39, 12, 2, '2026-07-22', 72, 31, 11, 'Windy'),
  (40, 2, 2, '2026-07-25', 74, 27, 11, 'Sunny'),
  (41, 2, 4, '2026-07-30', 75, 30, 7, 'Sunny'),
  (42, 2, 5, '2026-08-09', 78, 33, 10, 'Rain'),
  (43, 3, 1, '2026-08-09', 76, 31, 13, 'Windy'),
  (44, 11, 2, '2026-08-09', 75, 31, 9, 'Overcast'),
  (45, 3, 6, '2026-08-13', 75, 31, 9, 'Windy'),
  (46, 8, 4, '2026-08-13', 81, 31, 8, 'Overcast'),
  (47, 9, 5, '2026-08-13', 69, 29, 13, 'Sunny'),
  (48, 4, 6, '2026-08-14', 86, 34, 7, 'Windy'),
  (49, 10, 5, '2026-08-24', 84, 30, 8, 'Sunny'),
  (50, 1, 4, '2026-08-25', 73, 30, 9, 'Sunny'),
  (51, 1, 8, '2026-08-27', 73, 29, 10, 'Sunny'),
  (52, 9, 8, '2026-08-28', 72, 30, 9, 'Windy'),
  (53, 12, 8, '2026-08-29', 70, 27, 12, 'Sunny'),
  (54, 3, 8, '2026-08-30', 74, 31, 8, 'Overcast');
`;
