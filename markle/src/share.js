// The spoiler-free result text, in Worldle's grammar: header, one row of proximity squares
// and an arrow per guess, the title-block line, the streak, the link.
import { arrowEmoji, proximitySquares } from './geo.js';
import { BONUS_KEYS } from './stats.js';

export const BONUS_ICONS = { architect: '✏️', year: '📅', dimension: '📏', spec: '🏗️', notes: '📜' };
const SQUARES = {
  normal: { full: '🟩', half: '🟨' },
  contrast: { full: '🟧', half: '🟦' },
};
const EMPTY = '⬜';
const SOLVED = '📐';
const NEXT_DOOR = '📍';
const ARCHITECT = '✏️';

export function sheetLabel(no) {
  return String(no).padStart(3, '0');
}

// rows: [{ correct, pct, bearing }] in guess order
export function shareText({ name = 'Markle', no, rows, won, closeup = false, bonus = null, streak = 0, url = '', contrast = false }) {
  const sq = contrast ? SQUARES.contrast : SQUARES.normal;
  const best = rows.reduce((m, r) => Math.max(m, r.pct || 0), 0);
  const score = won ? `${rows.length}/6` : `X/6 (${best}%)`;
  const lines = [`#${name} ${sheetLabel(no)} · ${score}${closeup ? '*' : ''}`];

  for (const r of rows) {
    if (r.architect) { lines.push((r.correct ? sq.full : EMPTY).repeat(5) + ARCHITECT); continue; }
    const { full, half, empty } = proximitySquares(r.pct);
    const tail = r.correct ? SOLVED : r.bearing == null ? NEXT_DOOR : arrowEmoji(r.bearing);
    lines.push(sq.full.repeat(full) + sq.half.repeat(half) + EMPTY.repeat(empty) + tail);
  }

  if (bonus?.done) {
    const passed = BONUS_KEYS.filter(k => bonus[k]?.pass).length;
    lines.push(BONUS_KEYS.map(k => (bonus[k]?.pass ? BONUS_ICONS[k] : EMPTY)).join('') + ` ${passed}/5`);
  }
  if (streak >= 2) lines.push(`🔥 ${streak}-day streak`);
  if (url) lines.push(url);
  return lines.join('\n');
}
