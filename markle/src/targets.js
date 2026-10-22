// The three things a player can guess in the main round: the building, its architect, or its
// city. Guesses are stored as strings in the game record: a building id, 'a:<architect key>'
// or 'c:<city key>', so old records (plain building ids) still read correctly.
import { fold } from './search.js';
import { distanceKm, bearingDeg, proximityPct } from './geo.js';

export const KINDS = ['building', 'architect', 'city'];
export const KIND_LABELS = { building: 'Building', architect: 'Architect', city: 'City' };

// "William L. Pereira & Associates (with X)" -> "William L. Pereira": the lead name a player types.
export function architectName(credit) {
  return credit.replace(/\(.*?\)/g, '').split(/;| with /)[0]
    .replace(/\s*(&|and)\s+(associates|partners)\b.*$/i, '')
    .replace(/\s+(architects?|associates|partnership|studio)$/i, '')
    .trim();
}

// Matching key: accents, initials and punctuation don't matter ("William Pereira" = "William L. Pereira").
export function architectKey(credit) {
  return fold(architectName(credit)).replace(/\b[a-z]\b/g, ' ').replace(/\s+/g, ' ').trim();
}

export const cityKey = (city, country) => `${fold(city)}|${fold(country)}`;

export function architectList(buildings, extra = []) {
  const byKey = new Map();
  for (const credit of [...extra, ...buildings.map(b => b.architect).filter(Boolean)]) {
    const name = architectName(credit);
    const key = architectKey(credit);
    if (key && !byKey.has(key)) byKey.set(key, { key, name, folded: fold(name) });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// One entry per city, placed at the middle of the pool's buildings there.
export function cityList(buildings) {
  const byKey = new Map();
  for (const b of buildings) {
    if (b.lat == null) continue;
    const key = cityKey(b.city, b.country);
    const c = byKey.get(key) || { key, city: b.city, country: b.country, lat: 0, lon: 0, n: 0, folded: fold(b.city), foldedCountry: fold(b.country) };
    c.lat += b.lat; c.lon += b.lon; c.n += 1;
    byKey.set(key, c);
  }
  return [...byKey.values()].map(c => ({ ...c, lat: c.lat / c.n, lon: c.lon / c.n }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

const startsWord = (text, q) => text.startsWith(q) || (' ' + text).includes(' ' + q);

export function searchArchitects(list, query, limit = 8) {
  const q = fold(query);
  if (!q) return { hits: [], more: 0 };
  const hits = list.filter(a => startsWord(a.folded, q));
  return { hits: hits.slice(0, limit), more: Math.max(0, hits.length - limit) };
}

// Cities by name, then cities in a matching country.
export function searchCities(list, query, limit = 8) {
  const q = fold(query);
  if (!q) return { hits: [], more: 0 };
  const byName = list.filter(c => startsWord(c.folded, q));
  const byCountry = list.filter(c => !byName.includes(c) && startsWord(c.foldedCountry, q));
  const hits = [...byName, ...byCountry];
  return { hits: hits.slice(0, limit), more: Math.max(0, hits.length - limit) };
}

export const kindOf = code => (code.startsWith('a:') ? 'architect' : code.startsWith('c:') ? 'city' : 'building');

// Feedback for a city guess: Worldle's distance, direction and proximity, from the city's middle.
export function cityFeedback(city, answer) {
  if (city.key === cityKey(answer.city, answer.country)) return { correct: true, km: 0, bearing: null, pct: 100 };
  const km = distanceKm(city, answer);
  return { correct: false, km, bearing: km < 1 ? null : bearingDeg(city, answer), pct: Math.min(99, proximityPct(km)) };
}

export function architectCorrect(key, answerCredit) {
  const a = architectKey(answerCredit);
  return key === a || key.startsWith(a + ' ') || a.startsWith(key + ' ');
}
