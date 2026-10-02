// "Copy context": turn the problem I'm working on into one Markdown block I can paste to someone (usually Claude).
//
// Pages describe the problem with a plain object (see ProblemContext below) taken from existing state, never by
// re-running anything, and call buildContext(). The builder is picked by the problem's runner type (`engine`):
// add a builder to CONTEXT_BUILDERS to support a new subject. Types without one use buildFallbackContext.
//
// ProblemContext:
//   engine          'sql' | 'python' | …           which builder to use
//   location        { kind: 'hole', tournament, hole, holes } | { kind: 'range', tournament }
//   title, par, tags (array, may be empty)
//   task            HTML of the task
//   background      { lesson, note } HTML for tournament holes; null for range problems
//   code            the editor's current text
//   lastRun         null (nothing run yet) or
//                   { kind: 'practice' | 'error' | 'wrong' | 'correct', message, result: { columns, rows } | null }
//   progress        { attempts, strokes, par, hintsUsed, solved, best? }
//   solution        the pro's solution, or null. Only pass it when the learner has it unlocked AND asked for it.
//   data            engine-specific inputs, e.g. { SQL, seed, referenceSql } for SQL (the reference SQL is used to
//                   pick relevant tables; its text is never copied unless `solution` is set)

import {
  framingSection, locationSection, problemSection, codeSection, lastRunSection, solutionSection, joinSections,
} from './sections.js';
import { buildSqlContext } from './sql.js';

export const CONTEXT_BUILDERS = {
  sql: buildSqlContext,
};

export function buildContext(ctx) {
  const builder = CONTEXT_BUILDERS[ctx.engine] ?? buildFallbackContext;
  return builder(ctx);
}

/** For problem types without a dedicated builder: title, task, code, and feedback (plus framing and location). */
export function buildFallbackContext(ctx) {
  return joinSections([
    framingSection(),
    locationSection(ctx),
    problemSection(ctx),
    codeSection(ctx, ctx.engine ?? ''),
    lastRunSection(ctx, (r) => (r.columns ? `Result: ${r.rows.length} rows.` : '')),
    solutionSection(ctx, ctx.engine ?? ''),
  ]);
}
