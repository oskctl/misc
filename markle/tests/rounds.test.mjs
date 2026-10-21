import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffled, architectOptions, dimensionOptions, noteOptions, formatMetres, yearVerdict, nextRound } from '../src/rounds.js';

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

test('architect options contain the answer once among six', () => {
  const opts = architectOptions(puzzle);
  assert.equal(opts.length, 6);
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
  assert.equal(formatMetres(5.9), '5.9 m');
  assert.equal(formatMetres(1.475), '1.5 m');
});

test('year verdict', () => {
  assert.deepEqual(yearVerdict(1970, puzzle), { pass: true, dir: 'later', near: true });
  assert.deepEqual(yearVerdict(1980, puzzle), { pass: false, dir: 'earlier', near: false });
  assert.equal(yearVerdict(1972, puzzle).dir, 'exact');
});

test('next unsettled round', () => {
  assert.equal(nextRound({}), 'architect');
  assert.equal(nextRound({ architect: { pass: false }, year: { tries: [1980] } }), 'year');
  assert.equal(nextRound({ architect: { pass: 1 } }), 'architect');
  const all = { architect: { pass: true }, year: { pass: true }, dimension: { pass: false }, spec: { pass: true }, notes: { pass: true } };
  assert.equal(nextRound(all), null);
});
