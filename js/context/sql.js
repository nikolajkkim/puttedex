// Context builder for SQL problems: adds the relevant tables' CREATE TABLE statements with sample rows, and renders
// the last result as a Markdown table.

import { CONTEXT_LIMITS } from '../data/context-config.js';
import { tableSnapshots } from '../lib/sql-runner.js';
import { fence, markdownTable } from './text.js';
import {
  framingSection, locationSection, problemSection, backgroundSection, codeSection, lastRunSection, progressSection,
  solutionSection, joinSections,
} from './sections.js';

/** Table names that appear in SQL text, ignoring comments and string literals. */
export function tablesUsed(allTables, ...sqlTexts) {
  const text = sqlTexts.filter(Boolean).join('\n')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
  return allTables.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(text));
}

function schemaSection(ctx) {
  const { SQL, seed, referenceSql } = ctx.data ?? {};
  if (!SQL || !seed) return '';
  const all = tableSnapshots(SQL, seed, null, 0).map((t) => t.name);
  // Tables the problem uses (from the reference query) plus any the learner's code mentions.
  let names = tablesUsed(all, referenceSql, ctx.code);
  if (names.length === 0) names = all;
  const tables = tableSnapshots(SQL, seed, names, CONTEXT_LIMITS.sampleRows);
  const parts = tables.map((t) => [
    `### ${t.name} (${t.rowCount} rows)`,
    '',
    fence(t.createSql, 'sql'),
    '',
    `First ${t.sample.rows.length} rows:`,
    '',
    markdownTable(t.sample.columns, t.sample.rows, CONTEXT_LIMITS.cellChars),
  ].join('\n'));
  return `## The schema\n\nTables this problem uses (SQLite):\n\n${parts.join('\n\n')}`;
}

function resultText({ columns, rows }) {
  if (!columns || columns.length === 0) return 'The query returned no result set.';
  const shown = rows.slice(0, CONTEXT_LIMITS.resultRows);
  const lines = [
    `Columns: ${columns.join(', ')}`,
    `Rows: ${rows.length}${rows.length > shown.length ? ` (showing ${shown.length} of ${rows.length} rows)` : ''}`,
  ];
  if (rows.length === 0) return lines.join('\n');
  return `${lines.join('\n')}\n\n${markdownTable(columns, shown, CONTEXT_LIMITS.cellChars)}`;
}

export function buildSqlContext(ctx) {
  return joinSections([
    framingSection(),
    locationSection(ctx),
    problemSection(ctx, 'sql'),
    backgroundSection(ctx, 'sql'),
    schemaSection(ctx),
    codeSection(ctx, 'sql'),
    lastRunSection(ctx, resultText),
    progressSection(ctx),
    solutionSection(ctx, 'sql'),
  ]);
}
