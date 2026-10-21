// Autocomplete matching: accent-insensitive, matches the start of any word in the
// building's name or aliases, and ranks whole-name prefixes first.

export function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildIndex(buildings) {
  return buildings.map(b => ({
    b,
    names: [b.name, ...(b.aka || [])].map(fold),
  }));
}

function score(names, q) {
  let best = Infinity;
  for (const n of names) {
    if (n === q) return 0;
    if (n.startsWith(q)) best = Math.min(best, 1);
    else if ((' ' + n).includes(' ' + q)) best = Math.min(best, 2);
    else if (q.length >= 3 && n.includes(q)) best = Math.min(best, 3);
  }
  return best;
}

export function search(index, query, { exclude = new Set(), limit = 8 } = {}) {
  const q = fold(query);
  if (!q) return [];
  const hits = [];
  for (const entry of index) {
    if (exclude.has(entry.b.id)) continue;
    const s = score(entry.names, q);
    if (s < Infinity) hits.push([s, entry.b]);
  }
  hits.sort((x, y) => x[0] - y[0] || x[1].name.localeCompare(y[1].name));
  return hits.slice(0, limit).map(h => h[1]);
}
