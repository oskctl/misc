// The share text: one plain line of score and a link. No spoilers: it names the category and
// the count, never the building.
export function sheetLabel(no) {
  return String(no).padStart(3, '0');
}

const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const LABELS = { city: 'City', architect: 'Architect', building: 'Building' };

export function shareText({ name = 'Markle', no, category = 'building', won, guesses, points, done = true, url = '' }) {
  const main = won ? `${LABELS[category]} in ${guesses}/6` : `${LABELS[category]} X/6`;
  const lines = [`${name} ${sheetLabel(no)} · ${main} · ${fmt(points)} points${done ? '' : ' so far'}`];
  if (url) lines.push(url);
  return lines.join('\n');
}
