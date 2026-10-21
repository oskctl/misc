import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedback, statusOf, stageFor, MAX_GUESSES } from '../src/game.js';

const trellick = { id: 'trellick', lat: 51.5233, lon: -0.2055 };
const balfron = { id: 'balfron', lat: 51.5122, lon: -0.0129 };
const barbican = { id: 'barbican', lat: 51.5201, lon: -0.0938 };
const masp = { id: 'masp', lat: -23.5614, lon: -46.6558 };

test('correct guess', () => {
  assert.deepEqual(feedback(trellick, trellick), { correct: true, km: 0, bearing: null, pct: 100 });
});

test('far guess has a bearing and low proximity', () => {
  const f = feedback(masp, trellick);
  assert.equal(f.correct, false);
  assert.ok(f.bearing > 0 && f.bearing < 90, `bearing ${f.bearing}`);
  assert.ok(f.pct < 60);
});

test('same-city guess drops the arrow', () => {
  const f = feedback(barbican, balfron);
  assert.ok(f.km < 15);
  assert.equal(f.bearing, null);
});

test('status and stage progression', () => {
  assert.equal(statusOf([], 'trellick'), 'playing');
  assert.equal(stageFor([], 'trellick'), 1);
  assert.equal(stageFor(['masp', 'balfron'], 'trellick'), 3);
  assert.equal(statusOf(['masp', 'trellick'], 'trellick'), 'won');
  assert.equal(stageFor(['masp', 'trellick'], 'trellick'), 6);
  const six = Array.from({ length: MAX_GUESSES }, (_, i) => `x${i}`);
  assert.equal(statusOf(six, 'trellick'), 'lost');
  assert.equal(stageFor(six.slice(0, 5), 'trellick'), 6);
});
