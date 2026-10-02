// Runs SQL against a fresh sql.js database built from a seed script.
// DOM-free on purpose: the browser and the Node tests share this exact code path.

let sqlPromise = null;

/** Load sql.js once. `initSqlJs` is the global from vendor/sql.js/sql-wasm.js (or `require` in Node). */
export function loadSqlJs(initSqlJs, locateFile) {
  if (!sqlPromise) {
    sqlPromise = initSqlJs(locateFile ? { locateFile } : undefined).catch((err) => {
      sqlPromise = null; // allow a retry after a transient failure (e.g. a flaky network fetch of the .wasm)
      throw err;
    });
  }
  return sqlPromise;
}

/**
 * Execute `query` on a brand-new database seeded with `seed`.
 * Returns the result of the LAST statement that returns columns (a SELECT): { columns: string[], rows: any[][] }.
 * A SELECT that matches nothing keeps its columns with zero rows. A query with no SELECT at all (e.g. only an
 * UPDATE) returns empty columns and rows.
 * Throws on SQL errors; the message is SQLite's own.
 *
 * Statements are stepped one by one instead of using db.exec(), because exec() drops result sets that have no
 * rows, which would make "your SELECT matched nothing" indistinguishable from "you didn't write a SELECT".
 */
export function runQuery(SQL, seed, query) {
  const db = new SQL.Database();
  try {
    db.run(seed);
    let last = { columns: [], rows: [] };
    for (const stmt of db.iterateStatements(query)) {
      const columns = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) rows.push(stmt.get());
      if (columns.length > 0) last = { columns, rows };
    }
    return last;
  } finally {
    db.close();
  }
}

/** Tables and their columns, for the yardage book (schema reference). */
export function describeSchema(SQL, seed) {
  const db = new SQL.Database();
  try {
    db.run(seed);
    const [tables] = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid");
    if (!tables) return [];
    return tables.values.map(([name]) => {
      const [info] = db.exec(`PRAGMA table_info(${JSON.stringify(name)})`);
      const [[count]] = db.exec(`SELECT COUNT(*) FROM ${JSON.stringify(name)}`)[0].values;
      return {
        name,
        rowCount: count,
        columns: info.values.map(([, col, type, notnull, , pk]) => ({
          name: col, type, nullable: !notnull && !pk, primaryKey: !!pk,
        })),
      };
    });
  } finally {
    db.close();
  }
}

/**
 * CREATE TABLE statement, row count, and the first `sampleRows` rows of each table in `names` (null = every table),
 * in schema order. Used by "Copy context".
 */
export function tableSnapshots(SQL, seed, names = null, sampleRows = 3) {
  const db = new SQL.Database();
  try {
    db.run(seed);
    const [res] = db.exec("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY rowid");
    if (!res) return [];
    return res.values
      .filter(([name]) => !names || names.includes(name))
      .map(([name, createSql]) => {
        const quoted = JSON.stringify(name);
        const [[rowCount]] = db.exec(`SELECT COUNT(*) FROM ${quoted}`)[0].values;
        const stmt = db.prepare(`SELECT * FROM ${quoted} LIMIT ${Math.max(0, Math.floor(sampleRows))}`);
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(stmt.get());
        stmt.free();
        return { name, createSql: `${createSql.trim()};`, rowCount, sample: { columns, rows } };
      });
  } finally {
    db.close();
  }
}
