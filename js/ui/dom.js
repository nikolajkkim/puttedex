// Tiny DOM helpers shared by the pages.

export const $ = (sel, root = document) => root.querySelector(sel);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** The flag-on-a-pin icon used for the brand and the course map. */
export const FLAG_SVG = `
  <svg viewBox="0 0 24 32" aria-hidden="true" class="pin">
    <line x1="4" y1="2" x2="4" y2="30" stroke="#f4efe0" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M5 3 L21 8 L5 13 Z" fill="#c63f2b"/>
  </svg>`;

export const BRAND_SVG = `
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <ellipse cx="16" cy="26" rx="13" ry="4.5" fill="#4f8a5c"/>
    <ellipse cx="16" cy="26" rx="3" ry="1.2" fill="#13321d"/>
    <line x1="16" y1="26" x2="16" y2="4" stroke="#f4efe0" stroke-width="2" stroke-linecap="round"/>
    <path d="M17 4.5 L29 9 L17 13.5 Z" fill="#c63f2b"/>
  </svg>`;

/** Mark a score against par the way a real scorecard does: circle under, square over. */
export function scoreMark(strokes, par) {
  const cls = strokes < par ? 'under' : strokes > par ? 'over' : '';
  return `<span class="score-mark ${cls}">${strokes}</span>`;
}
