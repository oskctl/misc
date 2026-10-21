// The four bottom-sheet panels: how to play, stats, settings, and the drawing register.
import { h } from './dom.js';
import { computeStats, BONUS_KEYS } from './stats.js';
import { ROUND_LABELS } from './rounds.js';
import { thumbnail } from './sheet.js';
import { sheetLabel } from './share.js';
import { formatCountdown } from './daily.js';

const panel = () => document.getElementById('panel');

export function openPanel(title, content) {
  const dlg = panel();
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel-body').replaceChildren(...[content].flat(Infinity).filter(x => x != null && x !== false));
  if (!dlg.open) {
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  }
  dlg.querySelector('.panel-body').scrollTop = 0;
}

export function closePanel() {
  const dlg = panel();
  if (dlg.open) dlg.close();
}

const swatch = state => h('i', { class: `sw ${state}`, 'aria-hidden': 'true' });

export function helpContent({ name, exampleRow }) {
  return [
    h('p', {}, h('strong', { text: `Name today's concrete building in six guesses.` }),
      ' Every guess is a building from the list: type a name, a city or a country.'),
    h('p', { text: 'The drawing starts as a solid silhouette. Each wrong guess issues a revision with more detail: structure and a scale figure, then openings, surface, setting. Later revisions also fill in the title block with the building type, country and city.' }),
    h('h3', { text: 'Each guess tells you' }),
    h('div', { class: 'legend' },
      h('div', {}, h('b', { class: 'mono', text: '7.7 km' }), ' how far the answer is, with an arrow pointing to it'),
      h('div', {}, h('b', { class: 'mono', text: '92' }), ' how close you are, out of 100 (100 is on the spot)'),
      h('div', {}, h('b', { class: 'mono', text: '1976 ▼' }), ' your guess was finished in 1976; ▼ the answer is older, ▲ newer'),
      h('div', {}, h('b', { class: 'mono', text: 'same city' }), ' your guess is in the right city (or country)'),
      h('div', {}, h('b', { class: 'mono', text: 'ARCH' }), ' same architect or practice'),
      h('div', {}, h('b', { class: 'mono', text: 'TYPE' }), ' same kind of building'),
      h('div', {}, swatch('match'), ' match ', swatch('near'), ' close (year within 10) ', swatch('miss'), ' no'),
    ),
    exampleRow ? h('div', { class: 'example' }, exampleRow) : null,
    h('h3', { text: 'Then complete the title block' }),
    h('p', { text: 'Win or lose, five quick questions finish the sheet: the architect, the year it was completed, one dimension, how the concrete was made, and a lie to strike out.' }),
    h('h3', { text: 'Close-up mode' }),
    h('p', { text: 'For experts: start zoomed tight into a detail of the finished drawing and step out with each miss, with no title-block hints. Turn it on in Settings before your first guess. It shows as * in your result.' }),
    h('p', { class: 'hint', text: `A new sheet is issued at midnight, your time. ${name} is named for Mark, and for the marks timber formwork leaves in concrete.` }),
  ];
}

export function statsContent({ games, latestIssued, todayNo, countdown, nextLabel }) {
  const st = computeStats(games, latestIssued);
  const max = Math.max(1, ...Object.values(st.distribution));
  const today = games[todayNo];
  const todayKey = today && today.status !== 'playing' ? (today.status === 'won' ? String(today.guesses.length) : 'X') : null;
  return [
    h('div', { class: 'bignums' },
      [[st.played, 'Played'], [st.winPct, 'Win %'], [st.current, 'Streak'], [st.best, 'Best']].map(([v, k]) =>
        h('div', {}, h('b', { text: String(v) }), h('span', { text: k })))),
    h('h3', { text: 'Guess distribution' }),
    h('div', { class: 'dist' }, Object.entries(st.distribution).map(([k, v]) =>
      h('div', {}, h('span', { text: k }), h('i', {
        class: [v ? '' : 'zero', k === todayKey ? 'today' : ''].join(' ').trim(),
        style: `width: ${Math.max(8, (v / max) * 100)}%`,
      }, String(v))))),
    h('h3', { text: `Title block · average ${st.bonusAverage.toFixed(1)} / 5` }),
    h('div', { class: 'passrates' }, BONUS_KEYS.map(k => {
      const r = st.bonus[k];
      return h('div', {}, h('b', { text: r.played ? `${Math.round((r.passed / r.played) * 100)}%` : '–' }), ROUND_LABELS[k].toUpperCase());
    })),
    h('p', { class: 'countdown' }, nextLabel, countdown ? [' ', h('b', { 'data-countdown': '', text: countdown })] : null),
    h('p', { class: 'hint', text: 'Streaks count sheets won on the day they were issued. Played and win % include the register.' }),
  ];
}

export function settingsContent({ settings, locked, onChange, exportCode, importCode, persistent, resetAll }) {
  const seg = (key, label, options, disabled = false) => h('div', { class: 'opt' },
    h('h3', { text: label }),
    h('div', { class: 'seg', role: 'group', 'aria-label': label }, options.map(([v, text]) => h('button', {
      type: 'button', 'aria-pressed': String(settings[key] === v), disabled,
      onclick: () => onChange(key, v),
    }, text))));
  const codeBox = h('textarea', { id: 'transfer-code', 'aria-label': 'Stats code', spellcheck: 'false', placeholder: 'Paste a stats code here' });
  return [
    seg('theme', 'Theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]),
    seg('units', 'Distances', [['km', 'Kilometres'], ['mi', 'Miles']]),
    seg('mode', 'Mode', [['standard', 'Standard'], ['closeup', 'Close-up']], locked),
    locked ? h('p', { class: 'hint', text: 'Mode is locked for this sheet once you have guessed. It applies from the next sheet.' }) : null,
    seg('contrast', 'Share colours', [[false, 'Green / yellow'], [true, 'High contrast']]),
    h('div', { class: 'opt transfer' },
      h('h3', { text: 'Move your stats to another device' }),
      h('p', { class: 'hint', text: persistent
        ? 'Your results live in this browser. Copy the code here and paste it on the other device.'
        : 'This browser is not keeping data between visits (private mode or blocked storage), so results last only until you close the page.' }),
      codeBox,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onclick: () => exportCode(codeBox) }, 'Copy code'),
        h('button', { type: 'button', class: 'btn', onclick: () => importCode(codeBox.value) }, 'Load code'),
      ),
    ),
    resetBlock(resetAll),
    h('p', { class: 'hint' }, 'Drawings are original, simplified elevations drawn from published dimensions. Map: Natural Earth. Type: Archivo and IBM Plex Mono.'),
  ];
}

// Clearing results asks twice, in the page itself (the host frame blocks confirm()).
function resetBlock(resetAll) {
  const box = h('div', { class: 'opt' }, h('h3', { text: 'Start over' }));
  const ask = () => box.replaceChildren(
    h('h3', { text: 'Start over' }),
    h('p', { class: 'hint', text: 'This deletes every result and streak in this browser. Your settings stay.' }),
    h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn-red', onclick: resetAll }, 'Delete my results'),
      h('button', { type: 'button', class: 'btn', onclick: idle }, 'Keep them'),
    ));
  const idle = () => box.replaceChildren(
    h('h3', { text: 'Start over' }),
    h('button', { type: 'button', class: 'btn', onclick: ask }, 'Clear my results…'));
  idle();
  return box;
}

export function registerContent({ puzzles, drawings, issuedNo, preview, games, previewGames, dateOf, onOpen }) {
  const rows = puzzles.filter(p => preview || p.no <= issuedNo).slice().reverse();
  if (!rows.length) return [h('p', { text: 'No sheets have been issued yet.' })];
  return [
    preview ? h('p', { class: 'hint', text: 'Preview mode: unissued sheets are open for checking. Results on them are kept apart and never counted.' }) : null,
    h('ul', { class: 'register' }, rows.map(p => {
      const future = p.no > issuedNo;
      const g = future ? previewGames[p.no] : games[p.no];
      const finished = g && g.status !== 'playing';
      const result = !g ? 'Issued' : g.status === 'playing' ? 'In progress' : g.status === 'won' ? `${g.guesses.length}/6` : 'X/6';
      return h('li', {}, h('a', {
        href: `#s${sheetLabel(p.no)}`,
        onclick: e => { e.preventDefault(); onOpen(p.no); },
      },
        h('span', { class: 'thumb' }, drawings[p.drawing] ? thumbnail(drawings[p.drawing], finished ? 6 : 1) : null),
        h('span', {},
          h('span', { class: 'no', text: `No. ${sheetLabel(p.no)}` }),
          h('span', { class: 'meta', text: `${future ? 'Preview · ' : ''}${dateOf(p.no)}` }),
        ),
        h('span', { class: `res ${g?.status === 'lost' ? 'lost' : ''}`, text: future && !g ? 'Preview' : result }),
      ));
    })),
  ];
}

export function tickCountdowns(ms) {
  for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = formatCountdown(ms);
}
