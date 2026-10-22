// Puzzle numbering. Puzzle #1 goes live at local midnight on the launch date and a new
// one unlocks at every local midnight after, the way Wordle and Worldle roll over.

export function dateKey(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Calendar days from a to b, both 'YYYY-MM-DD'. Immune to DST because it never touches local time.
export function daysBetween(a, b) {
  return dayIndex(b) - dayIndex(a);
}

export function puzzleNumberOn(launchKey, todayKey) {
  return daysBetween(launchKey, todayKey) + 1;
}

export function dateOfPuzzle(launchKey, number) {
  const d = new Date(dayIndex(launchKey) * 86400000 + (number - 1) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function msUntilMidnight(now) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}

// Epoch ms of local midnight at the start of a 'YYYY-MM-DD' day.
export function localMidnight(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = n => String(n).padStart(2, '0');
  const days = Math.floor(s / 86400);
  const hms = `${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  return days ? `${days}d ${hms}` : hms;
}
