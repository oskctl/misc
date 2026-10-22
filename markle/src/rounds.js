// Bonus questions: the rules, kept free of DOM. Every question is one pick from four options;
// option order is seeded by sheet number so everyone sees the same layout.

import { distanceKm } from './geo.js';

// The categories a player can pick for the main round; the two they don't pick come back as
// bonus questions, followed by the four fixed ones.
export const CATEGORIES = ['city', 'architect', 'building'];
const FIXED = ['year', 'dimension', 'spec', 'notes'];
export const ROUNDS = ['building', 'architect', 'city', ...FIXED];
export const ROUND_LABELS = {
  building: 'Building', architect: 'Architect', city: 'City', year: 'Year', dimension: 'Size', spec: 'Concrete', notes: 'False fact',
};
export const TRIES = 2;

export function roundsFor(category = 'building') {
  return [...['building', 'architect', 'city'].filter(k => k !== category), ...FIXED];
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(items, seed) {
  const r = rng(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const seedFor = (no, round) => no * 97 + ROUNDS.indexOf(round) * 13 + 7;

export function architectOptions(puzzle) {
  return shuffled([puzzle.architect.answer, ...puzzle.architect.distractors.slice(0, 3)], seedFor(puzzle.no, 'architect'));
}

// The completion year among three others 10, 20 or 30 years away (never in the future), oldest first.
export function yearOptions(puzzle, thisYear = new Date().getFullYear()) {
  const v = puzzle.year.value;
  const others = shuffled([-30, -20, -10, 10, 20, 30].map(d => v + d).filter(y => y <= thisYear), seedFor(puzzle.no, 'year')).slice(0, 3);
  return [v, ...others].sort((a, b) => a - b);
}

export function specOptions(puzzle) {
  return shuffled([puzzle.spec.answer, ...puzzle.spec.distractors], seedFor(puzzle.no, 'spec'));
}

// Two truths and a lie, as [{ text, lie, source, correction }].
export function noteOptions(puzzle) {
  const items = [
    ...puzzle.notes.truths.map(t => ({ text: t.text, source: t.source, lie: false })),
    { text: puzzle.notes.lie.text, source: puzzle.notes.lie.source, correction: puzzle.notes.lie.correction, lie: true },
  ];
  return shuffled(items, seedFor(puzzle.no, 'notes'));
}

// Options spaced x2 apart, so a 10% disagreement between sources can never flip the answer.
export function dimensionOptions(puzzle) {
  const v = puzzle.dimension.value;
  const others = shuffled([v / 4, v / 2, v * 2, v * 4], seedFor(puzzle.no, 'dimension')).slice(0, 3);
  return [v, ...others].sort((a, b) => a - b);
}

// Option tiles round to whole metres above 10 m; the revealed answer (exact) keeps one decimal
// so it quotes the sourced figure.
export function formatMetres(v, unit = 'm', { exact = false } = {}) {
  const n = exact ? Math.round(v * 10) / 10 : v >= 2.5 ? Math.round(v) : Math.round(v * 2) / 2;
  return `${n.toLocaleString('en-GB')} ${unit}`;
}

// A round is settled once it has a pass/fail result.
export function settled(result) {
  return typeof result?.pass === 'boolean';
}

export function nextRound(bonus, rounds = roundsFor()) {
  return rounds.find(k => !settled(bonus?.[k])) ?? null;
}

// The answer among its three nearest neighbours in the pool, so a near miss stays tempting.
export function buildingOptions(puzzle, answer, buildings) {
  const near = buildings.filter(b => b.id !== answer.id && b.lat != null)
    .sort((a, b) => distanceKm(a, answer) - distanceKm(b, answer)).slice(0, 3);
  return shuffled([answer, ...near], seedFor(puzzle.no, 'building'));
}

export function cityOptions(puzzle, answerCity, cities) {
  const near = cities.filter(c => c.key !== answerCity.key)
    .sort((a, b) => distanceKm(a, answerCity) - distanceKm(b, answerCity)).slice(0, 3);
  return shuffled([answerCity, ...near], seedFor(puzzle.no, 'city'));
}
