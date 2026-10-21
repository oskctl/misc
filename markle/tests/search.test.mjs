import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, buildIndex, search } from '../src/search.js';

const pool = [
  { id: 'unite', name: "Unité d'Habitation (Marseille)", aka: ['Cité radieuse'], city: 'Marseille' },
  { id: 'trellick', name: 'Trellick Tower', aka: [], city: 'London' },
  { id: 'balfron', name: 'Balfron Tower', aka: [], city: 'London' },
  { id: 'national', name: 'National Theatre', aka: ['Royal National Theatre'], city: 'London' },
];
const index = buildIndex(pool);

test('fold strips accents, case and punctuation', () => {
  assert.equal(fold("Unité d'Habitation"), 'unite dhabitation');
  assert.equal(fold('  Cité—Radieuse '), 'cite radieuse');
});

test('accent-insensitive prefix search', () => {
  assert.deepEqual(search(index, 'unite').map(b => b.id), ['unite']);
  assert.deepEqual(search(index, 'cite rad').map(b => b.id), ['unite']);
});

test('word-start matches rank after whole-name prefixes', () => {
  assert.deepEqual(search(index, 'tower').map(b => b.id), ['balfron', 'trellick']);
  assert.deepEqual(search(index, 'nat').map(b => b.id), ['national']);
});

test('excluded ids and empty queries return nothing', () => {
  assert.deepEqual(search(index, 'trellick', { exclude: new Set(['trellick']) }), []);
  assert.deepEqual(search(index, '   '), []);
});
