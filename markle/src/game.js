// Main-round rules, kept free of DOM so they can be tested in node.
import { distanceKm, bearingDeg, proximityPct } from './geo.js';

export const MAX_GUESSES = 6;
export const STAGES = 6;
// Inside this radius the arrow is noise: the guess is next door.
export const NEXT_DOOR_KM = 1;

export function feedback(guess, answer) {
  if (guess.id === answer.id) return { correct: true, km: 0, bearing: null, pct: 100 };
  const km = distanceKm(guess, answer);
  return {
    correct: false,
    km,
    bearing: km < NEXT_DOOR_KM ? null : bearingDeg(guess, answer),
    pct: proximityPct(km),
  };
}

// The lead architect or practice, normalised so "Marcel Breuer with Hamilton P. Smith" and
// "Marcel Breuer and Herbert Beckhard" both read as one hand.
export function architectKey(credit) {
  return credit.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\(.*?\)/g, '').split(/;| with | and | & |,/)[0]
    .replace(/\b(architects?|associates|partners|studio)\b/g, '')
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Pool years can be a year or two out, so 'match' means within 2 years and 'near' within 10.
export const YEAR_MATCH = 2;
export const YEAR_NEAR = 10;

// The second feedback channel: how the guess compares with the answer on era, hand and use.
// States: 'match' (solid), 'near' (hatched), 'miss' (outline).
export function attributes(guess, answer) {
  const delta = answer.year - guess.year;
  return {
    year: {
      value: guess.year,
      dir: delta > 0 ? 'later' : delta < 0 ? 'earlier' : 'same',
      state: Math.abs(delta) <= YEAR_MATCH ? 'match' : Math.abs(delta) <= YEAR_NEAR ? 'near' : 'miss',
    },
    architect: architectKey(guess.architect) === architectKey(answer.architect) ? 'match' : 'miss',
    type: guess.type === answer.type ? 'match' : 'miss',
  };
}

export function statusOf(guessIds, answerId) {
  if (guessIds.includes(answerId)) return 'won';
  if (guessIds.length >= MAX_GUESSES) return 'lost';
  return 'playing';
}

// The drawing gains a layer with every wrong guess; a finished game shows everything.
export function stageFor(guessIds, answerId) {
  if (statusOf(guessIds, answerId) !== 'playing') return STAGES;
  return Math.min(STAGES, guessIds.length + 1);
}
