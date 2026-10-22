import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, bearingDeg, compassPoint, arrowEmoji, proximityPct, proximitySquares, formatDistance, equalEarth } from '../src/geo.js';

const london = { lat: 51.5232, lon: -0.2056 };
const saoPaulo = { lat: -23.5614, lon: -46.6558 };
const sanDiego = { lat: 32.8811, lon: -117.2376 };

test('distance London to São Paulo is about 9,500 km', () => {
  const km = distanceKm(london, saoPaulo);
  assert.ok(km > 9400 && km < 9600, `got ${km}`);
});

test('distance is symmetric and zero to itself', () => {
  assert.equal(Math.round(distanceKm(london, sanDiego)), Math.round(distanceKm(sanDiego, london)));
  assert.equal(distanceKm(london, london), 0);
});

test('bearing points the right way', () => {
  assert.equal(compassPoint(bearingDeg(london, saoPaulo)), 'SW');
  assert.equal(compassPoint(bearingDeg(saoPaulo, london)), 'NE');
  assert.equal(compassPoint(bearingDeg({ lat: 0, lon: 0 }, { lat: 10, lon: 0 })), 'N');
  assert.equal(compassPoint(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 10 })), 'E');
  assert.equal(arrowEmoji(359), '⬆️');
  assert.equal(arrowEmoji(180), '⬇️');
});

test('proximity runs on a log scale and saves 100 for the answer', () => {
  assert.equal(proximityPct(0, true), 100);
  assert.equal(proximityPct(0), 99);
  assert.equal(proximityPct(10), 90);
  assert.equal(proximityPct(100), 68);
  assert.equal(proximityPct(1000), 39);
  assert.equal(proximityPct(10000), 9);
  assert.equal(proximityPct(20015), 0);
  assert.equal(proximityPct(30000), 0);
});

test('proximity squares follow Worldle', () => {
  assert.deepEqual(proximitySquares(100), { full: 5, half: 0, empty: 0 });
  assert.deepEqual(proximitySquares(92), { full: 4, half: 1, empty: 0 });
  assert.deepEqual(proximitySquares(39), { full: 1, half: 1, empty: 3 });
  assert.deepEqual(proximitySquares(9), { full: 0, half: 0, empty: 5 });
});

test('distance formatting', () => {
  assert.equal(formatDistance(3.24), '3.2 km');
  assert.equal(formatDistance(9512.4), '9,512 km');
  assert.equal(formatDistance(100, 'mi'), '62 mi');
});

test('equal earth maps the origin to the translate point', () => {
  const [x, y] = equalEarth(0, 0, { scale: 100, translate: [500, 250] });
  assert.equal(x, 500);
  assert.equal(y, 250);
  const [xe] = equalEarth(90, 0, { scale: 100, translate: [500, 250] });
  assert.ok(xe > 500);
});
