// Text helpers for context builders. DOM-free so they run in Node tests too.

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&rarr;': '→' };
const decode = (s) => s.replace(/&(lt|gt|amp|quot|#39|nbsp|rarr);/g, (m) => ENTITIES[m]);

/**
 * Convert the small HTML subset used in lessons and tasks to Markdown: <pre> → fenced code (with `lang`),
 * <code> → `code`, <strong> → bold, <em> → italic, <li> → "- " or "1. ", <p>/<br> → line breaks. Other tags are dropped.
 */
export function htmlToMarkdown(html, lang = '') {
  const blocks = [];
  let s = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, code) => {
    blocks.push(`\n\n\`\`\`${lang}\n${decode(code.replace(/<[^>]+>/g, '')).trim()}\n\`\`\`\n\n`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  // Line breaks in the HTML source are just whitespace; real breaks come from the tags below.
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_, items) => {
    let n = 0;
    return `\n${items.replace(/<li[^>]*>/g, () => `\n${++n}. `).replace(/<\/li>/g, '')}\n`;
  });
  s = s
    .replace(/<li[^>]*>/g, '\n- ').replace(/<\/li>/g, '')
    .replace(/<\/?(ul|ol)[^>]*>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*/g, '\n\n').replace(/<p[^>]*>/g, '')
    .replace(/<code>([\s\S]*?)<\/code>/g, (_, c) => `\`${c.replace(/<[^>]+>/g, '')}\``)
    .replace(/<\/?strong>/g, '**')
    .replace(/<\/?em>/g, '*')
    .replace(/<[^>]+>/g, '');
  s = decode(s)
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.replace(/[ \t]*\u0000(\d+)\u0000[ \t]*/g, (_, i) => blocks[Number(i)]).replace(/\n{3,}/g, '\n\n').trim();
}

/** A fenced code block. Uses a longer fence if the code itself contains ``` . */
export function fence(code, lang = '') {
  const ticks = code.includes('```') ? '````' : '```';
  return `${ticks}${lang}\n${code}\n${ticks}`;
}

function cellText(v, maxChars) {
  if (v === null || v === undefined) return 'NULL';
  let s = String(v).replace(/\s+/g, ' ');
  if (s.length > maxChars) s = `${s.slice(0, maxChars - 1)}…`;
  return s.replace(/\|/g, '\\|');
}

/** A Markdown table of `rows` (arrays) under `columns`, with long cells cut to `maxChars`. */
export function markdownTable(columns, rows, maxChars = 40) {
  const head = `| ${columns.map((c) => cellText(c, maxChars)).join(' | ')} |`;
  const rule = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map((v) => cellText(v, maxChars)).join(' | ')} |`);
  return [head, rule, ...body].join('\n');
}
