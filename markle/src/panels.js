// The bottom-sheet panels: how to play, stats and settings.
import { h } from './dom.js';
import { computeStats, BONUS_KEYS } from './stats.js';
import { ROUND_LABELS } from './rounds.js';
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

export function helpContent({ name, exampleRow }) {
  return [
    h('p', {}, h('strong', { text: 'Guess the concrete building in six tries.' })),
    h('p', { text: 'Each wrong guess adds detail to the drawing. Each guess shows how far away the answer is, which way, and how close you are out of 100.' }),
    exampleRow ? h('div', { class: 'example' }, exampleRow) : null,
    h('p', { text: 'Then five quick bonus questions: architect, year, size, concrete, and spot the lie.' }),
    h('p', { class: 'hint', text: `A new building every day at midnight. ${name} is named for Mark.` }),
  ];
}

export function statsContent({ games, latestIssued, todayNo, countdownAt, nextLabel }) {
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
    h('h3', { text: `Bonus questions · average ${st.bonusAverage.toFixed(1)} / 5` }),
    h('div', { class: 'passrates' }, BONUS_KEYS.map(k => {
      const r = st.bonus[k];
      return h('div', {}, h('b', { text: r.played ? `${Math.round((r.passed / r.played) * 100)}%` : '–' }), ROUND_LABELS[k].toUpperCase());
    })),
    h('p', { class: 'countdown' }, nextLabel, countdownAt ? [' ', countdownEl(countdownAt)] : null),
    h('p', { class: 'hint', text: 'Streaks count sheets won on the day they were issued (or the next day, if started on the day).' }),
  ];
}

export function settingsContent({ settings, locked, onChange, exportCode, importCode, persistent, resetAll }) {
  const seg = (key, label, options, disabled = false) => h('div', { class: 'opt' },
    h('h3', { text: label }),
    h('div', { class: 'seg', role: 'group', 'aria-label': label, 'data-key': key }, options.map(([v, text]) => h('button', {
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

export function countdownEl(at) {
  return h('b', { 'data-countdown': String(at), text: formatCountdown(at - Date.now()) });
}

export function tickCountdowns(now = Date.now()) {
  for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = formatCountdown(Number(el.dataset.countdown) - now);
}
