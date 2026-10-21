import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../src/stats.js';

const won = (n, onTime = true) => ({ status: 'won', guesses: Array(n).fill('x'), onTime });
const lost = (onTime = true) => ({ status: 'lost', guesses: Array(6).fill('x'), onTime });

test('empty history', () => {
  const s = computeStats({}, 5);
  assert.equal(s.played, 0);
  assert.equal(s.winPct, 0);
  assert.equal(s.current, 0);
  assert.equal(s.best, 0);
});

test('played, win % and distribution include archive plays', () => {
  const s = computeStats({ 1: won(2, false), 2: won(3, false), 3: lost(false), 4: won(3) }, 4);
  assert.equal(s.played, 4);
  assert.equal(s.wins, 3);
  assert.equal(s.winPct, 75);
  assert.deepEqual(s.distribution, { 1: 0, 2: 1, 3: 2, 4: 0, 5: 0, 6: 0, X: 1 });
});

test('streak counts on-time wins by consecutive sheet number', () => {
  const games = { 3: won(4), 4: won(2), 5: won(1) };
  assert.equal(computeStats(games, 5).current, 3);
  assert.equal(computeStats(games, 5).best, 3);
});

test("today's unplayed or unfinished sheet doesn't break the streak", () => {
  const games = { 4: won(2), 5: won(1) };
  assert.equal(computeStats(games, 6).current, 2);
  assert.equal(computeStats({ ...games, 6: { status: 'playing', guesses: ['a'] } }, 6).current, 2);
});

test('a loss, a skipped day or an archive win resets the streak', () => {
  assert.equal(computeStats({ 4: won(2), 5: lost() }, 5).current, 0);
  assert.equal(computeStats({ 3: won(2), 5: won(2) }, 6).current, 1);
  assert.equal(computeStats({ 4: won(2), 5: won(2, false) }, 5).current, 0);
  assert.equal(computeStats({ 1: won(1), 2: won(1), 4: won(1) }, 4).best, 2);
});

test('bonus pass rates and average fields per sheet', () => {
  const bonus = { done: true, architect: { pass: true }, year: { pass: false }, dimension: { pass: true }, spec: { pass: true }, notes: { pass: false } };
  const s = computeStats({ 1: { ...won(2), bonus }, 2: { ...won(3), bonus: { ...bonus, year: { pass: true } } } }, 2);
  assert.deepEqual(s.bonus.year, { passed: 1, played: 2 });
  assert.equal(s.bonusAverage, 3.5);
});
