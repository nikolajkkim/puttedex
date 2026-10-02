// Markdown sections shared by every context builder (see js/context/index.js for the ProblemContext shape).

import { CONTEXT_FRAMING } from '../data/context-config.js';
import { htmlToMarkdown, fence } from './text.js';

export const framingSection = () => CONTEXT_FRAMING;

export function locationSection(ctx) {
  const where = ctx.location.kind === 'hole'
    ? `${ctx.location.tournament}, hole ${ctx.location.hole} of ${ctx.location.holes}`
    : `Driving Range (${ctx.location.tournament} problems)`;
  const lines = [`## Where I am`, '', `- **${where}**`, `- Problem: **${ctx.title}** (par ${ctx.par})`];
  if (ctx.tags?.length) lines.push(`- Topics: ${ctx.tags.join(', ')}`);
  return lines.join('\n');
}

export function problemSection(ctx, lang = '') {
  return `## The problem\n\n${htmlToMarkdown(ctx.task, lang)}`;
}

export function backgroundSection(ctx, lang = '') {
  if (!ctx.background) return '';
  const parts = [];
  if (ctx.background.lesson) parts.push(htmlToMarkdown(ctx.background.lesson, lang));
  if (ctx.background.note) parts.push(`**Yardage book note:** ${htmlToMarkdown(ctx.background.note, lang)}`);
  return parts.length ? `## Background\n\n${parts.join('\n\n')}` : '';
}

export function codeSection(ctx, lang = '') {
  const code = (ctx.code ?? '').trim();
  return `## My current code\n\n${code ? fence(code, lang) : '(The editor is empty.)'}`;
}

const STATUS = {
  practice: 'Ran it (practice run, not checked against the answer)',
  error: 'Error',
  wrong: 'Submitted: not correct yet',
  correct: 'Submitted: correct',
};

/** The status line and message of the last run. `resultText` renders the result; it's builder-specific. */
export function lastRunSection(ctx, resultText = () => '') {
  const run = ctx.lastRun;
  if (!run) return '## My last run\n\nNo run yet.';
  const lines = ['## My last run', '', `**Status:** ${STATUS[run.kind] ?? run.kind}`];
  if (run.message) lines.push('', run.kind === 'error' ? `Error message:\n\n${fence(run.message)}` : `Feedback I was shown: ${run.message}`);
  const rendered = run.result ? resultText(run.result) : '';
  if (rendered) lines.push('', rendered);
  return lines.join('\n');
}

export function progressSection(ctx) {
  const p = ctx.progress;
  if (!p) return '';
  const diff = p.strokes - p.par;
  const vsPar = diff === 0 ? 'level with par' : diff > 0 ? `${diff} over par` : `${-diff} under par`;
  const lines = [
    '## My progress on this problem',
    '',
    `- Attempts (submissions) so far: ${p.attempts}`,
    // Over/under par only means something once the problem is solved.
    p.solved
      ? `- Strokes: ${p.strokes} on a par ${p.par} (${vsPar}), solved`
      : `- Strokes so far: ${p.strokes} (par ${p.par})`,
    `- Hints used: ${p.hintsUsed}`,
  ];
  if (p.best != null) lines.push(`- Best solve: ${p.best} strokes`);
  return lines.join('\n');
}

export function solutionSection(ctx, lang = '') {
  return ctx.solution ? `## Reference solution\n\n${fence(ctx.solution, lang)}` : '';
}

export const joinSections = (sections) => `${sections.filter(Boolean).join('\n\n').trim()}\n`;

