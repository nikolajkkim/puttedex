// Self-hosted Pyodide packages: every package a tournament or problem declares is vendored next to Pyodide, with
// all its dependencies, and each wheel matches the sha256 in Pyodide's lockfile (Pyodide checks it too, in the
// browser). Packages come from the Pyodide release matching vendor/pyodide/VERSION; see CLAUDE.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TOURNAMENTS, loadTournament, isOpen } from '../js/tournaments.js';
import { PYTHON } from '../js/data/python-config.js';

const dir = new URL('../vendor/pyodide/', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('pyodide-lock.json', dir), 'utf8'));

function withDependencies(names) {
  const out = new Set();
  const visit = (name) => {
    const pkg = lock.packages[name];
    assert.ok(pkg, `${name} is a Pyodide package`);
    if (out.has(name)) return;
    out.add(name);
    pkg.depends.forEach(visit);
  };
  names.forEach(visit);
  return [...out];
}

const declared = new Set();
for (const meta of TOURNAMENTS.filter(isOpen)) {
  (meta.packages ?? []).forEach((p) => declared.add(p));
  if (meta.engine === 'pandas') PYTHON.pandasPackages.forEach((p) => declared.add(p));
  for (const hole of (await loadTournament(meta)).holes) (hole.packages ?? []).forEach((p) => declared.add(p));
}

test('Pyodide itself is vendored at the lockfile\'s version', () => {
  assert.equal(readFileSync(new URL('VERSION', dir), 'utf8').trim(), JSON.parse(readFileSync(new URL('package.json', dir), 'utf8')).version);
});

for (const name of withDependencies([...declared])) {
  test(`${name}: wheel is vendored and matches the lockfile's sha256`, () => {
    const pkg = lock.packages[name];
    const file = new URL(pkg.file_name, dir);
    assert.ok(existsSync(file), `missing vendor/pyodide/${pkg.file_name}`);
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), pkg.sha256);
  });
}
