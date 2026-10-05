// Context builder for Python problems: what the checker expects (function signature, printed output, or variable),
// my code, and my last run: printed output, the last line's value, the trimmed error, or the per-test results.
// Hidden tests are reported the way the learner sees them: pass/fail, plus the input of the first failure only.
// Their expected values never appear (they aren't in the run result to begin with).

import { CONTEXT_LIMITS } from '../data/context-config.js';
import { fence } from './text.js';
import {
  framingSection, locationSection, problemSection, backgroundSection, codeSection, lastRunSection, progressSection,
  solutionSection, joinSections,
} from './sections.js';

const clip = (raw, max = CONTEXT_LIMITS.outputChars) => {
  const text = raw.replace(/\n+$/, '');
  return text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters not shown)` : text;
};

function checkerSection(ctx) {
  const checker = ctx.data?.checker;
  if (!checker) return '';
  const visible = checker.cases.filter((c) => !c.hidden);
  const hidden = checker.cases.length - visible.length;
  const what = {
    function: `My code must define the function \`${checker.function}\`. The checker calls it on each test case and compares the return value.`,
    stdout: 'The checker runs my code after defining some input variables, and compares what it prints (trailing whitespace ignored).',
    value: `The checker runs my code after defining some input variables, and compares the variable \`${checker.variable}\`.`,
  }[checker.type];
  const lines = ['## How it\'s checked', '', what];
  if (checker.noMutation) lines.push('', 'My function must not modify its input.');
  lines.push('', `There are ${visible.length} example test${visible.length === 1 ? '' : 's'} and ${hidden} hidden test${hidden === 1 ? '' : 's'}.`);
  if (checker.type !== 'function' && visible[0]?.setup) {
    lines.push('', 'Inputs defined before my code runs (example 1):', '', fence(visible[0].setup, 'python'));
  }
  if (ctx.data.packages?.length) lines.push('', `Available packages: ${ctx.data.packages.join(', ')}.`);
  return lines.join('\n');
}

function testsText({ tests, summary }) {
  const lines = [`Tests: ${summary.all.passed} of ${summary.all.total} passed `
    + `(${summary.visible.passed} of ${summary.visible.total} examples, ${summary.hidden.passed} of ${summary.hidden.total} hidden).`, ''];
  let example = 0;
  let hiddenN = 0;
  let firstHiddenFailShown = false;
  for (const c of tests.cases) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    if (c.visible) {
      example += 1;
      const value = (v) => (v.includes('\n') ? `\n${fence(v)}` : ` \`${v}\``);
      lines.push(`- Example ${example}: ${mark}`);
      lines.push(`  - Input:${value(c.input)}`);
      if (c.expected !== null) lines.push(`  - Expected:${value(c.expected)}`);
      if (c.got !== null) lines.push(`  - Got:${value(c.got)}`);
      if (!c.ok && c.message) lines.push(`  - ${c.message}`);
    } else {
      hiddenN += 1;
      if (!c.ok && !firstHiddenFailShown) {
        firstHiddenFailShown = true;
        lines.push(`- Hidden test ${hiddenN}: FAIL on input \`${c.input.replace(/\n/g, '; ')}\`. ${c.message}`);
      } else {
        lines.push(`- Hidden test ${hiddenN}: ${mark}`);
      }
    }
  }
  if (tests.stdout) lines.push('', 'Printed output (example 1):', '', fence(clip(tests.stdout)));
  return lines.join('\n');
}

function resultText(result) {
  if (result.timedOut) return 'The run was stopped because it took too long (possible infinite loop).';
  if (result.tests) return testsText(result);
  const lines = [];
  lines.push(result.stdout ? `Printed output:\n\n${fence(clip(result.stdout))}` : 'Printed output: (nothing)');
  if (result.truncated) lines.push('', '(The output was cut off by the runner.)');
  if (result.stderr) lines.push('', `Warnings (stderr):\n\n${fence(clip(result.stderr))}`);
  if (result.value) lines.push('', `Value of the last line (${result.value.type}):\n\n${fence(result.value.repr)}`);
  return lines.join('\n');
}

export function buildPythonContext(ctx) {
  return joinSections([
    framingSection(),
    locationSection(ctx),
    problemSection(ctx, 'python'),
    backgroundSection(ctx, 'python'),
    checkerSection(ctx),
    codeSection(ctx, 'python'),
    lastRunSection(ctx, resultText),
    progressSection(ctx),
    solutionSection(ctx, 'python'),
  ]);
}
