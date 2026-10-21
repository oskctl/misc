// Autocomplete matching: accent-insensitive, matches the start of any word in the building's
// name, aliases, city or country. Architect names never match: knowing who designed it is the
// title block's first question, not a way to find the building.

const SPECIAL = { æ: 'ae', ø: 'o', ł: 'l', đ: 'd', ß: 'ss', œ: 'oe', ð: 'd', þ: 'th', ı: 'i' };

export function fold(s) {
  return s.toLowerCase().replace(/[æøłđßœðþı]/g, ch => SPECIAL[ch])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildIndex(buildings) {
  return buildings.map(b => ({
    b,
    name: fold(b.name),
    aka: (b.aka || []).map(a => [a, fold(a)]),
    place: [fold(b.city), fold(b.country)],
  }));
}

const startsWord = (text, q) => text.startsWith(q) || (' ' + text).includes(' ' + q);

function score(e, q) {
  if (e.name === q) return [0];
  if (e.name.startsWith(q)) return [1];
  if (startsWord(e.name, q)) return [2];
  for (const [raw, folded] of e.aka) if (startsWord(folded, q)) return [3, raw];
  if (e.place.some(p => startsWord(p, q))) return [4];
  if (q.length >= 4 && e.name.includes(q)) return [5];
  return null;
}

// Returns [{ b, alias }] where alias is set when the hit came from an alternative name.
export function search(index, query, { limit = 8 } = {}) {
  const q = fold(query);
  if (!q) return { hits: [], more: 0 };
  const hits = [];
  for (const e of index) {
    const s = score(e, q);
    if (s) hits.push({ s: s[0], b: e.b, alias: s[1] });
  }
  hits.sort((x, y) => x.s - y.s || x.b.name.localeCompare(y.b.name));
  return { hits: hits.slice(0, limit).map(({ b, alias }) => ({ b, alias })), more: Math.max(0, hits.length - limit) };
}
