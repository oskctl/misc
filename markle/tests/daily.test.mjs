import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, daysBetween, puzzleNumberOn, dateOfPuzzle, msUntilMidnight, formatCountdown, localMidnight } from '../src/daily.js';

test('dateKey uses local calendar date', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('puzzle numbers count calendar days from launch', () => {
  assert.equal(puzzleNumberOn('2026-10-21', '2026-10-21'), 1);
  assert.equal(puzzleNumberOn('2026-10-21', '2026-10-25'), 5);
  assert.equal(puzzleNumberOn('2026-10-21', '2026-10-20'), 0);
  assert.equal(puzzleNumberOn('2026-12-31', '2027-01-01'), 2);
});

test('daysBetween is unaffected by DST changes', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
});

test('dateOfPuzzle inverts puzzleNumberOn', () => {
  assert.equal(dateOfPuzzle('2026-10-21', 1), '2026-10-21');
  assert.equal(dateOfPuzzle('2026-10-21', 12), '2026-11-01');
});

test('countdown to local midnight', () => {
  assert.equal(msUntilMidnight(new Date(2026, 9, 21, 23, 0, 0)), 3600000);
  assert.equal(formatCountdown(3723000), '01:02:03');
  assert.equal(formatCountdown(-5), '00:00:00');
  assert.equal(formatCountdown(86399000), '23:59:59');
  assert.equal(formatCountdown(3 * 86400000 + 5 * 3600000 + 2000), '3d 05:00:02');
});

test('launch countdown targets local midnight on the start date', () => {
  assert.equal(localMidnight('2026-10-25'), new Date(2026, 9, 25).getTime());
  assert.equal(localMidnight('2026-10-25') - new Date(2026, 9, 21, 18, 57, 30).getTime(), 3 * 86400000 + 5 * 3600000 + 2 * 60000 + 30000);
});
