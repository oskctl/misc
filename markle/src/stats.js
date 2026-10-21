// Stats are derived from the per-sheet game records every time, never kept as counters,
// so they can always be rebuilt (and survive a schema change).

export const BONUS_KEYS = ['architect', 'year', 'dimension', 'spec', 'notes'];

// games: { [no]: { status, guesses, onTime, bonus } }
export function computeStats(games, latestIssued) {
  const finished = Object.entries(games)
    .map(([no, g]) => ({ no: Number(no), ...g }))
    .filter(g => g.status === 'won' || g.status === 'lost');

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  for (const g of finished) {
    if (g.status === 'won') distribution[g.guesses.length] += 1;
    else distribution.X += 1;
  }
  const played = finished.length;
  const wins = played - distribution.X;

  // A streak counts sheets won on their own day, consecutive by sheet number. Today's sheet
  // doesn't break it until today is over, so an unplayed today still shows yesterday's run.
  const onTimeWin = no => games[no]?.status === 'won' && games[no]?.onTime;
  let current = 0;
  let n = latestIssued;
  if (!games[n] || games[n].status === 'playing') n -= 1;
  while (n >= 1 && onTimeWin(n)) { current += 1; n -= 1; }

  let best = 0, run = 0;
  for (let i = 1; i <= latestIssued; i += 1) {
    run = onTimeWin(i) ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const bonus = Object.fromEntries(BONUS_KEYS.map(k => [k, { passed: 0, played: 0 }]));
  let bonusSheets = 0, bonusFields = 0;
  for (const g of finished) {
    if (!g.bonus?.done) continue;
    bonusSheets += 1;
    for (const k of BONUS_KEYS) {
      const r = g.bonus[k];
      if (!r) continue;
      bonus[k].played += 1;
      if (r.pass) { bonus[k].passed += 1; bonusFields += 1; }
    }
  }

  return {
    played,
    wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    current,
    best: Math.max(best, current),
    distribution,
    bonus,
    bonusAverage: bonusSheets ? bonusFields / bonusSheets : 0,
  };
}
