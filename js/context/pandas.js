// Context builder for pandas problems: the DataFrames (dtypes and 3 sample rows each), how the DataFrame checker
// grades this problem, my code, and my last run: printed output, the last result as a Markdown table (first 15
// rows), the trimmed error, or the per-test feedback. Hidden tests are reported the way the learner sees them:
// pass/fail and the kind of mismatch. Expected results are never copied, except the mismatching rows the page
// itself shows for the visible test.

import { CONTEXT_LIMITS } from '../data/context-config.js';
import { fence, markdownTable } from './text.js';
import {
  framingSection, locationSection, problemSection, backgroundSection, codeSection, lastRunSection, progressSection,
  solutionSection, joinSections,
} from './sections.js';

const clip = (raw, max = CONTEXT_LIMITS.outputChars) => {
  const text = raw.replace(/\n+$/, '');
  return text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters not shown)` : text;
};
const cellText = (c) => (c !== null && typeof c === 'object' ? c.na : c);

/** A frame_table (js/lib/pandas-harness.js) as Markdown: index columns first, then the first `rows` rows. */
export function frameMarkdown(table, rows = CONTEXT_LIMITS.resultRows) {
  const index = table.indexNames.map((n) => (n === null ? '(index)' : n));
  const body = table.rows.slice(0, rows).map((r) => [...r.index, ...r.cells].map(cellText));
  const shape = table.kind === 'Series' ? `Series, ${table.rowCount} values` : `${table.rowCount} rows x ${table.columns.length} columns`;
  const shown = Math.min(rows, table.rows.length);
  const note = shown < table.rowCount ? ` (first ${shown} shown)` : '';
  return `${shape}${note}:\n\n${markdownTable([...index, ...table.columns], body, CONTEXT_LIMITS.cellChars)}`;
}

function framesSection(ctx) {
  const { frames, tables } = ctx.data ?? {};
  if (!tables?.length) return '';
  const lines = ['## The DataFrames', '', `My function gets fresh copies of: ${tables.map((t) => `\`${t}\``).join(', ')} `
    + '(each read with `pd.read_csv`). `pd` and `np` are already imported.'];
  if (!frames) {
    lines.push('', '(Their columns weren\'t loaded yet when I copied this.)');
    return lines.join('\n');
  }
  for (const f of frames) {
    lines.push('', `### ${f.name} (${f.shape[0]} rows x ${f.shape[1]} columns)`, '');
    lines.push(f.columns.map((c) => `- \`${c.name}\`: ${c.dtype}${c.missing ? `, ${c.missing} missing` : ''}`).join('\n'));
    lines.push('', `Sample rows:\n\n${frameMarkdown(f.sample, CONTEXT_LIMITS.sampleRows).split('\n').slice(2).join('\n')}`);
  }
  return lines.join('\n');
}

function checkerSection(ctx) {
  const checker = ctx.data?.checker;
  if (!checker) return '';
  const visible = checker.cases.filter((c) => !c.hidden).length;
  const hidden = checker.cases.length - visible;
  const returns = { DataFrame: 'a DataFrame', Series: 'a Series', scalar: 'a single value' }[checker.returns ?? 'DataFrame'];
  const call = `${checker.function}(${checker.frames.join(', ')}${checker.cases[0]?.args ? `, ${checker.cases[0].args}` : ''})`;
  const rules = [
    `Row order ${checker.rowOrder === 'ignore' ? 'is not graded' : 'is graded'}.`,
    `The index ${checker.index === 'require' ? 'is graded (labels and whether it\'s reset)' : 'is ignored'}.`,
    `Column order ${checker.columnOrder === 'ignore' ? 'is not graded' : 'is graded'}.`,
    checker.dtypes === 'match' ? 'Column dtypes must match (e.g. int vs float).' : 'Values are compared, not exact dtypes.',
    'Floats are compared with a small tolerance. Changing an input DataFrame fails the test.',
  ];
  return ['## How it\'s checked', '',
    `The checker calls \`${call}\` and compares what it returns (${returns}) with the expected result.`, '',
    rules.join(' '), '',
    `There ${visible === 1 ? 'is 1 visible test' : `are ${visible} visible tests`} (the data above) and ${hidden} hidden test${hidden === 1 ? '' : 's'} `
      + '(other versions of the data with the same columns, including edge cases).',
  ].join('\n');
}

function diffMarkdown(diff) {
  const rows = diff.rows.flatMap((r) => [[`row ${r.row + 1} expected`, ...r.expected.map(cellText)], ['yours', ...r.got.map(cellText)]]);
  return markdownTable(['', ...diff.columns], rows, CONTEXT_LIMITS.cellChars);
}

function testsText({ tests, summary }) {
  const lines = [`Tests: ${summary.all.passed} of ${summary.all.total} passed `
    + `(${summary.visible.passed} of ${summary.visible.total} visible, ${summary.hidden.passed} of ${summary.hidden.total} hidden).`, ''];
  let hiddenN = 0;
  for (const c of tests.cases) {
    if (c.visible) {
      lines.push(`- Visible test (\`${c.input}\`): ${c.ok ? 'PASS' : `FAIL. ${c.message}`}`);
      if (!c.ok && c.diff?.rows.length) lines.push('', '  First rows that differ:', '', diffMarkdown(c.diff), '');
      if (!c.ok && c.got) lines.push('', `  My result: ${c.got.table ? frameMarkdown(c.got.table) : `\`${c.got.repr}\``}`, '');
    } else {
      hiddenN += 1;
      lines.push(`- Hidden test ${hiddenN}: ${c.ok ? 'PASS' : `FAIL. ${c.message}`}`);
    }
  }
  if (tests.stdout) lines.push('', 'Printed output (visible test):', '', fence(clip(tests.stdout)));
  return lines.join('\n');
}

function resultText(result) {
  if (result.timedOut) return 'The run was stopped because it took too long (possible infinite loop, or a loop over every row).';
  if (result.tests) return testsText(result);
  const lines = [];
  lines.push(result.stdout ? `Printed output:\n\n${fence(clip(result.stdout))}` : 'Printed output: (nothing)');
  if (result.truncated) lines.push('', '(The output was cut off by the runner.)');
  if (result.stderr) lines.push('', `Warnings (stderr):\n\n${fence(clip(result.stderr))}`);
  if (result.value) {
    const label = result.called ? `\`${result.called}\` returned (${result.value.type})` : `Value of the last line (${result.value.type})`;
    lines.push('', `${label}: ${result.value.table ? frameMarkdown(result.value.table) : `\n\n${fence(result.value.repr)}`}`);
  } else if (result.returnedNone) {
    lines.push('', `\`${result.called}\` returned None.`);
  }
  return lines.join('\n');
}

export function buildPandasContext(ctx) {
  return joinSections([
    framingSection(),
    locationSection(ctx),
    problemSection(ctx, 'python'),
    backgroundSection(ctx, 'python'),
    framesSection(ctx),
    checkerSection(ctx),
    codeSection(ctx, 'python'),
    lastRunSection(ctx, resultText),
    progressSection(ctx),
    solutionSection(ctx, 'python'),
  ]);
}
