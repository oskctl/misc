import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedback, statusOf, stageFor, architectKey, attributes, MAX_GUESSES } from '../src/game.js';

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

test('same-city guess keeps an exact bearing; next door drops it', () => {
  const f = feedback(barbican, balfron);
  assert.ok(f.km < 15 && f.pct > 85 && f.pct < 99);
  assert.ok(f.bearing > 90 && f.bearing < 135, `bearing ${f.bearing}`);
  const g = feedback({ id: 'x', lat: 51.5202, lon: -0.0935 }, barbican);
  assert.equal(g.bearing, null);
});

test('architect keys merge collaborators and firm suffixes', () => {
  assert.equal(architectKey('Marcel Breuer with Hamilton P. Smith'), architectKey('Marcel Breuer and Herbert Beckhard (with Nolen-Swinburne)'));
  assert.equal(architectKey('Zaha Hadid Architects'), architectKey('Zaha Hadid (with Mayer Bährle)'));
  assert.equal(architectKey('Ernő Goldfinger'), 'erno goldfinger');
  assert.notEqual(architectKey('Araldo Cossutta (I. M. Pei & Partners)'), architectKey('I. M. Pei & Partners'));
});

test('attribute chips compare era, hand and use', () => {
  const answer = { year: 1972, architect: 'Ernő Goldfinger', type: 'housing' };
  assert.deepEqual(attributes({ year: 1967, architect: 'Ernő Goldfinger', type: 'housing' }, answer),
    { year: { value: 1967, dir: 'later', state: 'near' }, architect: 'match', type: 'match' });
  assert.deepEqual(attributes({ year: 1989, architect: 'Tadao Ando', type: 'religious' }, answer),
    { year: { value: 1989, dir: 'earlier', state: 'miss' }, architect: 'miss', type: 'miss' });
  assert.equal(attributes({ year: 1972, architect: 'x', type: 'y' }, answer).year.state, 'match');
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
