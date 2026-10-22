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
