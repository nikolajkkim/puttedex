// Every hole of every open tournament, checked against the real SQL engine and answer checker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSql } from './helpers.mjs';
import { describeSchema } from '../js/lib/sql-runner.js';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';
import { checkGradedSql } from './sql-checks.mjs';

for (const meta of TOURNAMENTS.filter((t) => isOpen(t) && t.engine === 'sql')) {
  const t = await loadTournament(meta);

  test(`${t.id}: dataset builds`, async () => {
    const tables = describeSchema(await getSql(), t.seed);
    assert.ok(tables.length > 0 && tables.every((tbl) => tbl.rowCount > 0));
  });

  for (const [i, hole] of t.holes.entries()) {
    test(`${t.id} hole ${i + 1} (${hole.id})`, async () => {
      for (const field of ['title', 'lesson', 'interview', 'yardage', 'task', 'solution', 'hint']) assert.ok(hole[field], `has ${field}`);
      assert.doesNotMatch(hole.lesson, /Interview angle/, 'the interview angle belongs in `interview`, not the lesson');
      assert.ok(!('starter' in hole), 'no prefilled starter code: the editor opens blank');
      assert.ok(Number.isInteger(hole.par) && hole.par >= 1, 'par is a positive integer');
      checkGradedSql(assert, await getSql(), t.seed, hole, { tournamentId: t.id, html: hole.lesson });
    });
  }
}
