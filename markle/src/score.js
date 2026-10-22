// Points: the main round is worth more the harder the category and the fewer guesses it took;
// each bonus question is a point on the first try and half a point on the second.
import { roundsFor, settled } from './rounds.js';

export const MULTIPLIER = { city: 1, architect: 1.5, building: 2 };
export const CATEGORY_LABELS = { city: 'City', architect: 'Architect', building: 'Building' };

export function mainPoints(rec) {
  if (rec?.status !== 'won') return 0;
  return MULTIPLIER[rec.category || 'building'] * (7 - rec.guesses.length);
}

export function questionPoints(result) {
  if (!result?.pass) return 0;
  return (result.picks?.length || 1) <= 1 ? 1 : 0.5;
}

export function bonusPoints(rec) {
  const b = rec?.bonus || {};
  return roundsFor(rec?.category).reduce((sum, k) => sum + (settled(b[k]) ? questionPoints(b[k]) : 0), 0);
}

export const totalPoints = rec => mainPoints(rec) + bonusPoints(rec);
export const formatPoints = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
