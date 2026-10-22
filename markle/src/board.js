// Shared leaderboard, kept in the claude.ai artifact's database. Each player writes only their
// own document (scores/<their id>); everyone who can open the page reads them all. Where the
// database isn't available (a saved file, GitHub Pages, a signed-out visitor) it stays hidden.
import { h } from './dom.js';

const use = name => (window.claude?.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const LABELS = { city: 'City', architect: 'Architect', building: 'Building' };

export async function postScore(no, entry) {
  const [db, user] = await Promise.all([use('db'), use('user')]);
  if (!db || !user) return;
  try {
    const id = await user.id();
    if (!id) return;
    const ref = db.doc(`scores/${id}`);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() || {} : {};
    const key = `s${no}`;
    if (prev[key] && prev[key].points === entry.points && prev[key].done === entry.done) return;
    await ref.set({ ...prev, [key]: entry });
  } catch { /* read-only viewer or offline: the board just won't include this score */ }
}

// A list element that fills itself in once the scores arrive; empty (and hidden) if they can't.
export function leaderboard(no) {
  const box = h('div', { class: 'board', hidden: true });
  (async () => {
    const [db, user] = await Promise.all([use('db'), use('user')]);
    if (!db || !user) return;
    try {
      const snap = await db.collection('scores').get();
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data()?.[`s${no}`] || {}) })).filter(r => typeof r.points === 'number')
        .sort((a, b) => b.points - a.points || (a.guesses || 9) - (b.guesses || 9));
      if (!rows.length) return;
      const people = await user.profiles(rows.map(r => r.id));
      box.replaceChildren(
        h('h3', { text: `Leaderboard · No. ${String(no).padStart(3, '0')}` }),
        h('ol', { class: 'board-list' }, rows.slice(0, 20).map(r => h('li', { class: people[r.id]?.isMe ? 'me' : '' },
          h('span', { class: 'who', text: people[r.id]?.name || 'Someone' }),
          h('span', { class: 'how', text: r.won ? `${LABELS[r.category] || ''} ${r.guesses}/6` : `${LABELS[r.category] || ''} X/6` }),
          h('span', { class: 'pts', text: fmt(r.points) }),
        ))),
      );
      box.hidden = false;
    } catch { /* not readable here */ }
  })();
  return box;
}
