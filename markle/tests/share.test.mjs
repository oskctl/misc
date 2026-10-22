import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareText, sheetLabel } from '../src/share.js';

test('sheet numbers are three digits', () => {
  assert.equal(sheetLabel(3), '003');
  assert.equal(sheetLabel(1234), '1234');
});

test('share text is one plain score line and a link, no spoilers', () => {
  assert.equal(shareText({ no: 3, category: 'building', won: true, guesses: 3, points: 14.5, url: 'https://example.org/markle' }),
    'Markle 003 · Building in 3/6 · 14.5 points\nhttps://example.org/markle');
  assert.equal(shareText({ no: 12, category: 'city', won: false, guesses: 6, points: 2, done: false }),
    'Markle 012 · City X/6 · 2 points so far');
});
