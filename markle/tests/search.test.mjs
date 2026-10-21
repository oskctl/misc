import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, buildIndex, search } from '../src/search.js';

const pool = [
  { id: 'unite', name: "Unité d'Habitation (Marseille)", aka: ['Cité radieuse'], city: 'Marseille', country: 'France', architect: 'Le Corbusier' },
  { id: 'trellick', name: 'Trellick Tower', aka: [], city: 'London', country: 'United Kingdom', architect: 'Ernő Goldfinger' },
  { id: 'balfron', name: 'Balfron Tower', aka: [], city: 'London', country: 'United Kingdom', architect: 'Ernő Goldfinger' },
  { id: 'national', name: 'National Theatre', aka: ['Royal National Theatre'], city: 'London', country: 'United Kingdom', architect: 'Denys Lasdun' },
  { id: 'towerhouse', name: 'London Tower House', aka: [], city: 'Leeds', country: 'United Kingdom', architect: 'X' },
];
const index = buildIndex(pool);
const ids = r => r.hits.map(h => h.b.id);

test('fold strips accents, case and punctuation', () => {
  assert.equal(fold("Unité d'Habitation"), 'unite dhabitation');
  assert.equal(fold('  Cité—Radieuse '), 'cite radieuse');
});

test('accent-insensitive prefix search, with the alias that matched', () => {
  assert.equal(ids(search(index, 'unite'))[0], 'unite');
  const r = search(index, 'cite rad');
  assert.deepEqual(ids(r), ['unite']);
  assert.equal(r.hits[0].alias, 'Cité radieuse');
});

test('name matches rank above place matches', () => {
  assert.deepEqual(ids(search(index, 'london')), ['towerhouse', 'balfron', 'national', 'trellick']);
  assert.deepEqual(ids(search(index, 'tower')), ['balfron', 'towerhouse', 'trellick']);
});

test('country search lists the buildings there', () => {
  assert.equal(search(index, 'united king').hits.length, 4);
});

test('architect names match last, flagged as such', () => {
  const r = search(index, 'goldfinger');
  assert.deepEqual(ids(r), ['balfron', 'trellick']);
  assert.ok(r.hits.every(h => h.byArchitect));
  assert.equal(search(index, 'trellick').hits[0].byArchitect, false);
});

test('letters NFD cannot split still fold', () => {
  assert.equal(fold('Bagsværd'), 'bagsvaerd');
  assert.equal(fold('Jørn Utzon'), 'jorn utzon');
  assert.equal(fold('Łódź'), 'lodz');
});

test('limit and overflow count; empty query returns nothing', () => {
  const r = search(index, 'united', { limit: 2 });
  assert.equal(r.hits.length, 2);
  assert.equal(r.more, 2);
  assert.deepEqual(search(index, '   ').hits, []);
});
