import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareText, sheetLabel } from '../src/share.js';

test('sheet numbers are three digits', () => {
  assert.equal(sheetLabel(3), '003');
  assert.equal(sheetLabel(1234), '1234');
});

test('a win with title block and streak', () => {
  const text = shareText({
    no: 3,
    won: true,
    rows: [
      { correct: false, pct: 17, bearing: 55 },
      { correct: false, pct: 92, bearing: 272 },
      { correct: true, pct: 100, bearing: null },
    ],
    bonus: { done: true, architect: { pass: true }, year: { pass: true }, dimension: { pass: false }, spec: { pass: true }, notes: { pass: true } },
    streak: 4,
    url: 'https://example.org/markle',
  });
  assert.equal(text, [
    '#Markle 003 · 3/6',
    '🟨⬜⬜⬜⬜↗️',
    '🟩🟩🟩🟩🟨⬅️',
    '🟩🟩🟩🟩🟩📐',
    '✏️📅⬜🏗️📜 4/5',
    '🔥 4-day streak',
    'https://example.org/markle',
  ].join('\n'));
});

test('a loss shows the best proximity, close-up star, no title block if unplayed', () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ correct: false, pct: 50 + i * 8, bearing: 180 }));
  rows[5] = { correct: false, pct: 99, bearing: null };
  const text = shareText({ no: 12, won: false, rows, closeup: true, streak: 1, contrast: true });
  const lines = text.split('\n');
  assert.equal(lines[0], '#Markle 012 · X/6 (99%)*');
  assert.equal(lines[1], '🟧🟧🟦⬜⬜⬇️');
  assert.equal(lines[6], '🟧🟧🟧🟧🟦📍');
  assert.equal(lines.length, 7);
});
