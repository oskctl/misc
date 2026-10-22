import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffled, architectOptions, yearOptions, dimensionOptions, noteOptions, formatMetres, nextRound, roundsFor } from '../src/rounds.js';
import { mainPoints, questionPoints, totalPoints } from '../src/score.js';

const puzzle = {
  no: 3,
  architect: { answer: 'Ernő Goldfinger', distractors: ['A', 'B', 'C', 'D', 'E'] },
  year: { value: 1972, tolerance: 2 },
  dimension: { value: 98 },
  spec: { answer: 'bush-hammered', distractors: ['x', 'y', 'z'] },
  notes: { truths: [{ text: 't1', source: 's' }, { text: 't2', source: 's' }], lie: { text: 'l', correction: 'c', source: 's' } },
};

test('seeded shuffle is stable and a permutation', () => {
  const a = shuffled([1, 2, 3, 4, 5, 6], 42);
  assert.deepEqual(a, shuffled([1, 2, 3, 4, 5, 6], 42));
  assert.deepEqual(a.slice().sort(), [1, 2, 3, 4, 5, 6]);
  assert.notDeepEqual(shuffled([1, 2, 3, 4, 5, 6], 43), [1, 2, 3, 4, 5, 6]);
});

test('architect options contain the answer once among four', () => {
  const opts = architectOptions(puzzle);
  assert.equal(opts.length, 4);
  assert.equal(opts.filter(o => o === 'Ernő Goldfinger').length, 1);
});

test('dimension options are the value plus three x2-spaced decoys, ascending', () => {
  const opts = dimensionOptions(puzzle);
  assert.equal(opts.length, 4);
  assert.ok(opts.includes(98));
  for (let i = 1; i < opts.length; i += 1) assert.ok(opts[i] / opts[i - 1] >= 2 - 1e-9);
});

test('notes hold exactly one lie', () => {
  const n = noteOptions(puzzle);
  assert.equal(n.length, 3);
  assert.equal(n.filter(x => x.lie).length, 1);
});

test('metres formatting', () => {
  assert.equal(formatMetres(98), '98 m');
  assert.equal(formatMetres(24.5), '25 m');
  assert.equal(formatMetres(33.5, 'm', { exact: true }), '33.5 m');
  assert.equal(formatMetres(98, 'm', { exact: true }), '98 m');
  assert.equal(formatMetres(5.9), '6 m');
  assert.equal(formatMetres(5.9, 'm', { exact: true }), '5.9 m');
  assert.equal(formatMetres(1.475), '1.5 m');
});

test('year options: four, ten-year steps, never in the future', () => {
  const y = yearOptions(puzzle, 2026);
  assert.equal(y.length, 4);
  assert.ok(y.includes(1972));
  assert.ok(y.every(v => v <= 2026 && (v - 1972) % 10 === 0));
  assert.deepEqual(y, y.slice().sort((a, b) => a - b));
  assert.ok(yearOptions({ ...puzzle, year: { value: 2007 } }, 2026).every(v => v <= 2026));
});

test('rounds follow the category: the two not picked, then the four fixed ones', () => {
  assert.deepEqual(roundsFor('city'), ['building', 'architect', 'year', 'dimension', 'spec', 'notes']);
  assert.deepEqual(roundsFor('building'), ['architect', 'city', 'year', 'dimension', 'spec', 'notes']);
  const r = roundsFor('architect');
  assert.equal(nextRound({}, r), 'building');
  assert.equal(nextRound({ building: { pass: false }, city: { picks: ['x'] } }, r), 'city');
  assert.equal(nextRound(Object.fromEntries(r.map(k => [k, { pass: true }])), r), null);
});

test('points: category multiplier on the main round, 1 or 0.5 per bonus question', () => {
  assert.equal(mainPoints({ status: 'won', category: 'building', guesses: ['a', 'b'] }), 10);
  assert.equal(mainPoints({ status: 'won', category: 'architect', guesses: ['a'] }), 9);
  assert.equal(mainPoints({ status: 'lost', category: 'city', guesses: [1, 2, 3, 4, 5, 6] }), 0);
  assert.equal(questionPoints({ pass: true, picks: ['a'] }), 1);
  assert.equal(questionPoints({ pass: true, picks: ['b', 'a'] }), 0.5);
  assert.equal(questionPoints({ pass: false, picks: ['b', 'c'] }), 0);
  const rec = { status: 'won', category: 'city', guesses: ['c:x'], bonus: { building: { pass: true, picks: ['a'] }, year: { pass: true, picks: ['x', 'y'] } } };
  assert.equal(totalPoints(rec), 6 + 1 + 0.5);
});

