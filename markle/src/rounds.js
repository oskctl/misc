// Title-block rounds: the rules, kept free of DOM. Option order is seeded by sheet number so
// everyone sees the same order and results compare fairly.

export const ROUNDS = ['architect', 'year', 'dimension', 'spec', 'notes'];
export const ROUND_TRIES = { architect: 2, year: 3, dimension: 1, spec: 1, notes: 1 };
export const ROUND_LABELS = {
  architect: 'Architect', year: 'Completed', dimension: 'Dimension', spec: 'Spec', notes: 'Notes',
};

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
  return shuffled([puzzle.architect.answer, ...puzzle.architect.distractors], seedFor(puzzle.no, 'architect'));
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

export function formatMetres(v, unit = 'm') {
  const n = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${n.toLocaleString('en-GB')} ${unit}`;
}

export function yearVerdict(guess, puzzle) {
  const delta = puzzle.year.value - guess;
  return {
    pass: Math.abs(delta) <= puzzle.year.tolerance,
    dir: delta > 0 ? 'later' : delta < 0 ? 'earlier' : 'exact',
    near: Math.abs(delta) <= 5,
  };
}

// A round is settled once it has a pass/fail result.
export function settled(result) {
  return typeof result?.pass === 'boolean';
}

export function nextRound(bonus) {
  return ROUNDS.find(k => !settled(bonus?.[k])) ?? null;
}
