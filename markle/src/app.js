// Markle: boot, state, the main round, the result sheet and the composer.
import { CONFIG } from '../data/config.js';
import { BUILDINGS } from '../data/buildings.js';
import { PUZZLES } from '../data/puzzles.js';
import { DRAWINGS } from '../data/drawings.js';
import { SPECS } from '../data/specs.js';
import { h } from './dom.js';
import { read, write, persistent } from './store.js';
import { dateKey, puzzleNumberOn, dateOfPuzzle, msUntilMidnight, localMidnight } from './daily.js';
import { buildIndex, search, fold } from './search.js';
import { feedback, statusOf, stageFor, MAX_GUESSES } from './game.js';
import { formatDistance, compassPoint } from './geo.js';
import { shareText, sheetLabel } from './share.js';
import { computeStats } from './stats.js';
import { buildSheet, nominalScale, CLOSEUP_FRACTIONS } from './sheet.js';
import { keyPlan } from './keyplan.js';
import { renderBonus } from './bonus.js';
import { ROUNDS, ROUND_LABELS, settled, formatMetres } from './rounds.js';
import {
  openPanel, closePanel, helpContent, statsContent, settingsContent, registerContent, tickCountdowns, countdownEl,
} from './panels.js';

const KEY = 'markle:v1';
const PREVIEW_KEY = 'markle:preview:v1';
const DEFAULTS = { theme: 'system', units: 'km', mode: 'standard', contrast: false };
const REVS = ['0', 'A', 'B', 'C', 'D', 'E'];
// The result headline, by guess count: concrete's own vocabulary of a good pour.
const HEADLINES = ['Monolithic', 'Cast in one pour', 'Fair-faced', 'Well cured', 'Load-bearing', 'Just set'];

const byId = new Map(BUILDINGS.map(b => [b.id, b]));
const index = buildIndex(BUILDINGS);
const puzzleByNo = new Map(PUZZLES.map(p => [p.no, p]));
const $ = id => document.getElementById(id);
const app = $('app');

// ---------- State ----------
let state = read(KEY, null);
if (!state || state.schema !== 1 || typeof state.games !== 'object') {
  state = { schema: 1, games: {}, settings: {}, seenHelp: false };
}
state.settings = { ...DEFAULTS, ...state.settings };
const previewGames = read(PREVIEW_KEY, {});
let preview = false;
try { preview = sessionStorage.getItem('markle:preview') === '1'; } catch { /* no session storage */ }

const save = () => {
  write(KEY, state);
  if (view && isFuture(view.no)) write(PREVIEW_KEY, previewGames);
};
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const todayKey = () => dateKey(new Date());
const setMode = CONFIG.mode !== 'daily';
const issuedNo = () => (setMode ? PUZZLES.length : puzzleNumberOn(CONFIG.startDate, todayKey()));
const latestIssued = () => Math.min(PUZZLES.length, Math.max(0, issuedNo()));
const isFuture = no => no > issuedNo();
const dateOf = no => (setMode ? 'Launch set' : new Date(dateOfPuzzle(CONFIG.startDate, no) + 'T12:00:00')
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
// The sheet to open by default: today's in daily mode; the first unfinished one in the launch set.
const homeNo = () => {
  if (!setMode) return latestIssued();
  const cur = state.current;
  if (puzzleByNo.has(cur) && !state.games[cur]?.bonus?.done) return cur;
  const open = PUZZLES.find(p => !['won', 'lost'].includes(state.games[p.no]?.status));
  return open ? open.no : PUZZLES.length;
};
// A record's guesses, minus any building that has since left the pool.
const guessesOf = rec => (rec?.guesses || []).filter(id => byId.has(id));

function recordFor(no, create = false) {
  const bag = isFuture(no) ? previewGames : state.games;
  if (!bag[no] && create) bag[no] = { guesses: [], status: 'playing', mode: state.settings.mode, startedOn: todayKey() };
  return bag[no];
}

// ---------- Small UI helpers ----------
let toastTimer;
function toast(text) {
  const t = $('toast');
  // A modal panel sits in the top layer and makes the page inert, so show the toast inside it.
  const panel = $('panel');
  (panel.open ? panel : document.body).append(t);
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
const announce = text => { $('announce').textContent = text; };

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const dark = /dark/.test(m.media);
    m.setAttribute('content', t === 'dark' ? '#121211' : t === 'light' ? '#E7E5E0' : dark ? '#121211' : '#E7E5E0');
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through to the old way */ }
  const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;opacity:0' });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

function northArrow(bearing) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('class', `north${bearing == null ? ' none' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = bearing == null
    ? '<circle cx="10" cy="10" r="3.2"/>'
    : '<circle cx="10" cy="10" r="9"/><path d="M10 2.5 14 15 10 12.4 6 15Z"/>';
  if (bearing != null) svg.style.transform = `rotate(${bearing}deg)`;
  return svg;
}

// Where the guessed building is. Nothing here describes the answer: the main round gives only
// distance, direction and proximity, so the title-block questions are still open afterwards.
const whereLine = g => `${g.city}, ${g.country}${g.status === 'demolished' ? ' · demolished' : ''}`;

function guessRow(g, answer, i, isNew) {
  const f = feedback(g, answer);
  const dist = formatDistance(f.km, state.settings.units);
  const label = f.correct
    ? `Guess ${i + 1}: ${g.name}. Correct.`
    : `Guess ${i + 1}: ${g.name}, ${g.city}. ${dist} ${f.bearing == null ? 'away, next door' : `to the ${compassPoint(f.bearing)}`}. ${f.pct} out of 100.`;
  return h('li', { class: `row${f.correct ? ' hit' : ''}${isNew ? ' new' : ''}`, 'aria-label': label },
    h('span', { class: 'n', text: String(i + 1) }),
    h('span', { class: 'line' },
      h('span', { class: 'name', text: g.name }),
      h('span', { class: 'metrics' },
        f.correct ? h('span', { text: 'Identified' }) : h('span', { text: dist }),
        f.correct ? null : northArrow(f.bearing),
        h('span', { class: 'pct', text: String(f.pct) }),
      ),
    ),
    h('span', { class: 'line' }, h('span', { class: 'where', text: whereLine(g) })),
  );
}

// ---------- The sheet ----------
let view = null;

function mount(no) {
  closeSuggest();
  const puzzle = puzzleByNo.get(no);
  if (!puzzle) return mountEmpty();
  const answer = byId.get(puzzle.answer);
  if (!answer || !DRAWINGS[puzzle.drawing]) {
    view = null;
    $('composer').hidden = true;
    app.replaceChildren(h('div', { class: 'card' },
      h('p', { class: 'verdict', text: 'Sheet unavailable' }),
      h('p', { text: `Sheet ${sheetLabel(no)} is missing its ${answer ? 'drawing' : 'building'}. Run the build again.` })));
    return;
  }
  const sheet = buildSheet(puzzle, DRAWINGS[puzzle.drawing]);
  const tb = h('div', { class: 'tb' });
  const revs = h('div', { class: 'revs' });
  const rows = h('ol', { class: 'guesses', 'aria-label': 'Your guesses' });
  const result = h('div', { class: 'page-result', style: 'display:grid;gap:14px' });
  app.replaceChildren(h('section', { class: 'sheet', 'aria-label': `Sheet ${sheetLabel(no)}` }, sheet.frame, tb, revs), rows, result);
  view = { no, puzzle, answer, sheet, tb, revs, rows, result, revealed: new Set() };
  if (setMode && state.current !== no && !isFuture(no)) { state.current = no; write(KEY, state); }
  const hash = `#s${sheetLabel(no)}`;
  if (no !== homeNo() && location.hash !== hash) setHash(hash);
  if (no === homeNo() && /^#s\d+$/.test(location.hash)) setHash('');
  refresh();
}

// When the next sheet issues: local midnight tonight, or the launch date's midnight before launch.
function nextIssueAt() {
  if (issuedNo() < 1) return localMidnight(CONFIG.startDate);
  const now = new Date();
  return now.getTime() + msUntilMidnight(now);
}

function mountEmpty() {
  view = null;
  $('composer').hidden = true;
  const first = issuedNo() < 1;
  app.replaceChildren(h('div', { class: 'card' },
    h('p', { class: 'verdict', text: first ? 'Not issued yet' : 'On the drawing board' }),
    h('h2', { class: 'answer-name', text: `No. ${sheetLabel(Math.max(1, issuedNo()))}` }),
    h('p', { class: 'countdown' }, first ? 'Issues in ' : 'Check back in ', countdownEl(nextIssueAt())),
  ));
}

function cell(k, v, opts = {}) {
  const value = v == null ? h('span', { class: 'redact', 'aria-label': 'hidden' }) : v;
  const fresh = v != null && opts.track && !view.revealed.has(k);
  if (v != null && opts.track) view.revealed.add(k);
  return h('div', { class: `cell${opts.wide ? ' wide' : ''}${opts.full ? ' full' : ''}` },
    h('span', { class: 'k', text: k }),
    h('span', { class: `v${opts.proj ? ' proj' : ''}${fresh && opts.animate ? ' fresh' : ''}` }, value));
}

function refresh({ newRow = -1 } = {}) {
  if (!view) return;
  const { no, puzzle, answer, sheet } = view;
  const rec = recordFor(no) || { guesses: [], status: 'playing' };
  const guesses = guessesOf(rec);
  const status = rec.status;
  const finished = status !== 'playing';
  const closeup = (rec.mode ?? state.settings.mode) === 'closeup';
  const stage = closeup ? 6 : stageFor(guesses, answer.id);
  const animate = newRow >= 0;

  // The scale bar would answer the Dimension round, so it only appears once that round is
  // settled. Until then the 1.75 m figure is the only measure on the sheet.
  const measured = settled(rec.bonus?.dimension) || Boolean(rec.bonus?.done);
  const measuring = rec.bonus?.view === 'dimension' && !measured;
  sheet.setStage(stage);
  sheet.showScaleBar(measured);
  sheet.setZoom(closeup && !finished ? CLOSEUP_FRACTIONS[guesses.length] : null);
  sheet.showDimension(finished && settled(rec.bonus?.dimension) ? 'answer' : null);
  sheet.stamp(finished ? (status === 'won' ? 'Approved' : 'Superseded') : null,
    finished ? (status === 'won' ? `${guesses.length}/6` : 'X/6') : null);

  // Title block. Hints are withheld in close-up mode until the game is over.
  const hint = s => finished || (!closeup && stage >= s);
  const zoomF = CLOSEUP_FRACTIONS[guesses.length];
  const scale = closeup && !finished ? (zoomF ? nominalScale(puzzle.pxPerM / zoomF) : 'FIT')
    : stage >= 2 && !measuring ? nominalScale(puzzle.pxPerM) : 'NTS';
  const cells = [
    cell('Drg No.', `MK-${sheetLabel(no)}`),
    cell('Drawing', puzzle.view === 'INTERIOR ELEVATION' ? 'INT. ELEV.' : puzzle.view),
    cell('Scale', scale),
    cell('Type', hint(3) ? puzzle.typeLabel : null, { track: true, animate }),
    cell('Country', hint(5) ? answer.country : null, { track: true, animate }),
    cell('City', hint(6) ? answer.city : null, { track: true, animate }),
  ];
  if (finished) {
    const b = rec.bonus || {};
    cells.push(
      cell('Project', answer.name, { full: true, proj: true }),
      cell('Architect', settled(b.architect) ? puzzle.architect.answer : null, { wide: true, track: true, animate: true }),
      cell('Completed', settled(b.year) ? String(puzzle.year.value) : null, { track: true, animate: true }),
    );
  }
  view.tb.replaceChildren(...cells);

  view.revs.replaceChildren(
    h('span', { class: 'k', text: 'REV' }),
    ...REVS.map((r, i) => h('span', {
      'data-rev': r,
      class: i + 1 < stage || finished ? 'done' : i + 1 === stage ? 'now' : '',
      text: r,
    })),
    h('span', { class: 'mode', text: closeup ? 'Close-up*' : preview && isFuture(no) ? 'Preview' : '' }),
  );

  view.rows.replaceChildren(...Array.from({ length: MAX_GUESSES }, (_, i) => {
    const id = guesses[i];
    if (id) return guessRow(byId.get(id), answer, i, i === newRow);
    if (finished) return null;
    const coach = i === 0 && !guesses.length
      ? h('span', { class: 'coach', text: 'No idea? Type a country. The distance will steer you.' }) : null;
    return h('li', { class: 'row empty', 'aria-hidden': coach ? null : 'true' }, h('span', { class: 'n', text: String(i + 1) }), coach);
  }).filter(Boolean));

  $('composer').hidden = finished;
  document.body.classList.toggle('playing', !finished);
  if (finished) renderResult(rec, animate); else view.result.replaceChildren();
  // Bring the newest feedback row into view above the guess box.
  if (animate && !finished) view.rows.children[newRow]?.scrollIntoView({ block: 'nearest', behavior: smooth() });
}

// ---------- Result sheet ----------
function renderResult(rec, justFinished) {
  const { no, puzzle, answer, result } = view;
  const won = rec.status === 'won';
  const bonus = rec.bonus || {};
  const started = ROUNDS.some(k => bonus[k]) || bonus.view;
  const parts = [];

  parts.push(h('section', { class: 'card', 'aria-label': 'Answer' },
    h('p', { class: 'verdict', text: won ? `${HEADLINES[rec.guesses.length - 1]} · ${rec.guesses.length}/6` : 'Still curing · it was…' }),
    h('h2', { class: 'answer-name', text: answer.name }),
    h('p', { class: 'answer-where', text: `${answer.city}, ${answer.country}${answer.status === 'demolished' ? ' · demolished' : ''}` }),
    !bonus.done && !started ? [
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: startBonus }, 'Bonus questions →')),
    ] : null,
  ));

  if (!bonus.done && started) {
    const slot = h('section', { 'aria-label': 'Title block' });
    parts.push(slot);
    queueMicrotask(() => {
      const ctx = bonusContext(rec);
      ctx.focus = focusBonus;
      focusBonus = false;
      renderBonus(slot, ctx);
    });
  }

  if (bonus.done) parts.push(summary(rec));
  parts.push(shareBlock(rec));
  result.replaceChildren(...parts);

  if (justFinished) {
    announce(won ? `Correct. It's ${answer.name}.` : `Out of guesses. It was ${answer.name}.`);
    setTimeout(() => result.firstElementChild?.scrollIntoView({ behavior: smooth(), block: 'start' }), 900);
  }
}

// Set when the title-block card had focus before a refresh rebuilt it, so the new card takes it.
let focusBonus = false;

function bonusContext(rec) {
  return {
    puzzle: view.puzzle, record: rec, specs: SPECS, svgText: DRAWINGS[view.puzzle.drawing],
    save,
    announce,
    onSettled: () => { focusBonus = view.result.contains(document.activeElement); refreshTitleBlockOnly(); },
    onAdvance: () => {
      focusBonus = true;
      refresh();
      // renderResult fills the title-block slot in a microtask; scroll once it has its content.
      queueMicrotask(() => view.result.querySelector('section[aria-label="Title block"]')?.scrollIntoView({ behavior: smooth(), block: 'start' }));
    },
    onDone: () => { refresh(); view.result.querySelector('.card + section, .card + .card')?.scrollIntoView({ behavior: smooth(), block: 'start' }); },
  };
}

function refreshTitleBlockOnly() {
  // Re-render everything but keep the bonus card in place by re-running refresh; the bonus
  // slot is rebuilt from saved state, so nothing is lost.
  refresh();
}

function startBonus() {
  const rec = recordFor(view.no);
  rec.bonus ||= {};
  rec.bonus.view = 'architect';
  save();
  refresh();
  view.result.querySelector('section[aria-label="Title block"]')?.scrollIntoView({ behavior: smooth(), block: 'start' });
}

function summary(rec) {
  const { puzzle, answer } = view;
  const b = rec.bonus;
  const val = {
    architect: puzzle.architect.answer,
    year: String(puzzle.year.value),
    dimension: `${puzzle.dimension.label}: ${formatMetres(puzzle.dimension.value, puzzle.dimension.unit, { exact: true })}`,
    spec: SPECS[puzzle.spec.answer] || puzzle.spec.answer,
    notes: `Lie: ${puzzle.notes.lie.text}`,
  };
  const guesses = guessesOf(rec).map(id => byId.get(id));
  return h('section', { class: 'card', 'aria-label': 'The completed sheet' },
    h('p', { class: 'q-k', text: `Bonus · ${ROUNDS.filter(k => b[k]?.pass).length}/5` }),
    h('div', { class: 'recap' }, ROUNDS.map(k => [
      h('span', { class: 'k', text: ROUND_LABELS[k] }),
      h('span', { text: val[k] }),
      h('span', { class: `ok${b[k]?.pass ? '' : ' no'}`, text: b[k]?.pass ? '✓' : '✗' }),
    ])),
    h('p', { class: 'q-k', text: 'Why it matters' }),
    h('p', { class: 'lede', text: puzzle.why }),
    h('ul', { class: 'notes' },
      puzzle.notes.truths.map(t => h('li', { text: t.text })),
      h('li', {}, `Not true: ${puzzle.notes.lie.text.replace(/\.$/, '')}. ${puzzle.notes.lie.correction}`),
    ),
    h('p', { class: 'hint', text: `${puzzle.credits}. Built ${puzzle.built}.` }),
    h('p', { class: 'q-k', text: 'Key plan' }),
    h('div', { class: 'keyplan' }, keyPlan(guesses, answer)),
    h('div', { class: 'btn-row' },
      h('a', { class: 'btn', href: puzzle.readMore, target: '_blank', rel: 'noopener' }, 'Read more ↗'),
      h('a', { class: 'btn', href: `https://www.openstreetmap.org/?mlat=${answer.lat}&mlon=${answer.lon}#map=17/${answer.lat}/${answer.lon}`, target: '_blank', rel: 'noopener' }, 'Map ↗'),
    ),
    h('p', { class: 'sources' }, 'Sources: ', puzzle.sources.flatMap((u, i) => [i ? ' · ' : '', h('a', { href: u, target: '_blank', rel: 'noopener' }, hostOf(u))])),
    h('p', { class: 'hint', text: 'Drawn from published dimensions; details simplified.' }),
  );
}

function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
}

function currentShareText(rec) {
  const answer = view.answer;
  const rows = guessesOf(rec).map(id => feedback(byId.get(id), answer));
  const st = computeStats(state.games, latestIssued());
  const base = CONFIG.shareUrl || (location.protocol.startsWith('http') && !/claudeusercontent|claude\.ai/.test(location.host) ? location.origin + location.pathname : '');
  const url = base && (setMode || view.no !== latestIssued()) ? `${base}#s${sheetLabel(view.no)}` : base;
  return shareText({
    name: CONFIG.name, no: view.no, rows, won: rec.status === 'won',
    closeup: rec.mode === 'closeup', bonus: rec.bonus, streak: isFuture(view.no) || setMode ? 0 : st.current,
    url, contrast: state.settings.contrast,
  });
}

function shareBlock(rec) {
  const text = currentShareText(rec);
  const pre = h('pre', { class: 'share-pre', text });
  const next = view.no + 1;
  const hasNext = puzzleByNo.has(next);
  return h('section', { class: 'card', 'aria-label': 'Share' },
    h('p', { class: 'q-k', text: 'Your result, spoiler-free' }),
    pre,
    h('div', { class: 'btn-row' },
      h('button', {
        type: 'button', class: 'btn btn-ink',
        onclick: async () => {
          if (await copyText(text)) toast('Copied');
          else {
            const range = document.createRange();
            range.selectNodeContents(pre);
            const sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            toast('Selected: copy it');
          }
        },
      }, 'Copy result'),
      h('button', { type: 'button', class: 'btn', onclick: () => showPanel('stats') }, 'Stats'),
    ),
    next <= issuedNo() && hasNext
      ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', onclick: () => { mount(next); window.scrollTo({ top: 0 }); } }, `Play No. ${sheetLabel(next)} →`))
      : setMode ? h('p', { class: 'countdown', text: 'That is the launch set. Daily sheets start soon.' })
      : h('p', { class: 'countdown' },
        hasNext ? `No. ${sheetLabel(next)} issues in ` : `No. ${sheetLabel(next)} is on the drawing board. `,
        hasNext ? countdownEl(nextIssueAt()) : null),
    h('button', { type: 'button', class: 'linkish', onclick: () => showPanel('register') }, 'Open the register'),
  );
}

// ---------- Composer ----------
const input = $('guess-input');
const list = $('suggest');
const msg = $('composer-msg');
let hits = [];
let active = -1;
let chosen = null;

function setMsg(text, info = false) {
  msg.textContent = text || '';
  msg.hidden = !text;
  msg.classList.toggle('info', info);
}

function closeSuggest() {
  list.hidden = true;
  list.replaceChildren();
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  active = -1;
}

function renderSuggest() {
  const q = input.value;
  if (fold(q).length < 2 || !view) { closeSuggest(); return; }
  const res = search(index, q);
  hits = res.hits;
  const guessed = new Set(recordFor(view.no)?.guesses || []);
  if (!hits.length) {
    closeSuggest();
    setMsg('Not in the register. Try the city or country.', true);
    return;
  } else {
    list.replaceChildren(...hits.map(({ b, alias }, i) => h('li', {
      id: `opt-${i}`, role: 'option', 'aria-selected': String(i === active),
      'aria-disabled': guessed.has(b.id) ? 'true' : null,
      onpointerdown: e => e.preventDefault(),
      onclick: () => choose(i),
    },
      h('span', { class: 's-name', text: b.name }),
      h('span', { class: 's-where', text: guessed.has(b.id) ? 'Already on the sheet' : `${b.city}, ${b.country}` }),
      alias ? h('span', { class: 's-alias', text: `also: ${alias}` }) : null,
    )), res.more ? h('li', { class: 'more', 'aria-disabled': 'true', text: `+${res.more} more. Keep typing.` }) : null);
  }
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (active >= 0) input.setAttribute('aria-activedescendant', `opt-${active}`);
}

function choose(i) {
  const hit = hits[i];
  if (!hit) return;
  if ((recordFor(view.no)?.guesses || []).includes(hit.b.id)) { setMsg('Already on the sheet.'); return; }
  chosen = hit.b;
  input.value = hit.b.name;
  closeSuggest();
  setMsg('');
  $('guess-btn').focus({ preventScroll: true });
  input.focus({ preventScroll: true });
}

input.addEventListener('input', () => { chosen = null; active = -1; setMsg(''); renderSuggest(); });
input.addEventListener('focus', () => { if (input.value && !chosen) renderSuggest(); });
input.addEventListener('blur', () => setTimeout(closeSuggest, 150));
input.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (list.hidden) renderSuggest();
    if (!hits.length) return;
    e.preventDefault();
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
    renderSuggest();
    $(`opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (!list.hidden && active >= 0) choose(active);
    else submitGuess();
  } else if (e.key === 'Escape') {
    closeSuggest();
  }
});

// Guessing never relies on form submission: sandboxed frames without allow-forms drop it.
$('composer').addEventListener('submit', e => e.preventDefault());
$('guess-btn').addEventListener('click', submitGuess);
function submitGuess() {
  if (!view) return;
  let b = chosen;
  if (!b) {
    const q = fold(input.value);
    b = BUILDINGS.find(x => fold(x.name) === q) || (hits.length === 1 && fold(input.value).length >= 2 ? hits[0].b : null);
  }
  if (!b) { setMsg(input.value.trim() ? 'Pick a building from the list.' : 'Type a building, city or country.'); renderSuggest(); return; }
  makeGuess(b);
}

function makeGuess(b) {
  const rec = recordFor(view.no, true);
  if (rec.status !== 'playing') return;
  if (rec.guesses.includes(b.id)) { setMsg('Already on the sheet.'); return; }
  rec.guesses.push(b.id);
  rec.status = statusOf(rec.guesses, view.answer.id);
  if (rec.status !== 'playing') {
    rec.finishedOn = todayKey();
    // On time: won on its issue day, or started that day and finished the day after.
    const issued = dateOfPuzzle(CONFIG.startDate, view.no);
    rec.onTime = !setMode && !isFuture(view.no) && (rec.finishedOn === issued
      || (rec.startedOn === issued && rec.finishedOn === dateOfPuzzle(CONFIG.startDate, view.no + 1)));
  }
  save();
  input.value = '';
  chosen = null;
  setMsg('');
  closeSuggest();
  const f = feedback(b, view.answer);
  if (rec.status === 'playing') {
    announce(`${b.name}: ${formatDistance(f.km, state.settings.units)}, ${f.pct} out of 100. Revision ${REVS[rec.guesses.length]} issued.`);
  }
  if (rec.status !== 'playing' || matchMedia('(pointer: coarse)').matches) input.blur();
  refresh({ newRow: rec.guesses.length - 1 });
}

// Keep the composer above the on-screen keyboard (iOS doesn't resize the layout viewport).
const vv = window.visualViewport;
function placeComposer() {
  document.documentElement.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
  const offset = window.innerHeight - vv.height - vv.offsetTop;
  $('composer').style.transform = offset > 1 ? `translateY(${-offset}px)` : '';
}
if (vv) {
  vv.addEventListener('resize', placeComposer);
  vv.addEventListener('scroll', placeComposer);
  placeComposer();
}

// ---------- Panels ----------
function sampleRow() {
  const g = byId.get('barbican-estate'), a = byId.get('trellick-tower');
  if (!g || !a) return null;
  const row = guessRow(g, a, 0, false);
  row.setAttribute('aria-label', 'Example: Barbican Estate guessed when the answer is Trellick Tower');
  return h('ol', { class: 'guesses', style: 'border-top:0' }, row);
}

function showPanel(kind) {
  if (kind === 'help') openPanel('How to play', helpContent({ name: CONFIG.name, exampleRow: sampleRow() }));
  if (kind === 'stats') {
    const next = latestIssued() + 1;
    if (setMode) {
      openPanel('Statistics', statsContent({
        games: state.games, latestIssued: latestIssued(), todayNo: view?.no, countdownAt: null,
        nextLabel: 'Launch set: streaks start when the daily sheets do.',
      }));
      return;
    }
    openPanel('Statistics', statsContent({
      games: state.games, latestIssued: latestIssued(), todayNo: latestIssued(),
      countdownAt: puzzleByNo.has(next) ? nextIssueAt() : null,
      nextLabel: puzzleByNo.has(next) ? `No. ${sheetLabel(next)} issues in` : `No. ${sheetLabel(next)} is on the drawing board.`,
    }));
  }
  if (kind === 'settings') {
    const rec = view && recordFor(view.no);
    openPanel('Settings', settingsContent({
      settings: state.settings,
      locked: Boolean(rec && rec.guesses.length && rec.status === 'playing'),
      persistent: persistent(),
      resetAll: () => {
        state.games = {};
        delete state.current;
        for (const k of Object.keys(previewGames)) delete previewGames[k];
        write(PREVIEW_KEY, previewGames);
        save();
        closePanel();
        setHash('');
        route();
        window.scrollTo({ top: 0 });
        toast('Results cleared');
      },
      onChange: (k, v) => {
        state.settings[k] = v;
        save();
        applyTheme();
        if (view) refresh();
        const body = $('panel-body');
        const top = body.scrollTop;
        const code = $('transfer-code')?.value || '';
        showPanel('settings');
        body.scrollTop = top;
        if (code) $('transfer-code').value = code;
        body.querySelector(`.seg[data-key="${k}"] button[aria-pressed="true"]`)?.focus({ preventScroll: true });
      },
      exportCode: async box => {
        const code = btoa(unescape(encodeURIComponent(JSON.stringify({ schema: 1, games: state.games, settings: state.settings }))));
        box.value = code;
        box.select();
        toast((await copyText(code)) ? 'Code copied' : 'Code selected: copy it');
      },
      importCode: raw => {
        try {
          const data = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
          if (data.schema !== 1 || typeof data.games !== 'object' || !data.games) throw new Error('bad');
          const merged = { ...state.games };
          let taken = 0;
          for (const [no, g] of Object.entries(data.games)) {
            const valid = g && Array.isArray(g.guesses) && g.guesses.length <= MAX_GUESSES
              && g.guesses.every(id => byId.has(id)) && ['playing', 'won', 'lost'].includes(g.status)
              && (g.status !== 'won' || g.guesses.length >= 1) && (g.status !== 'lost' || g.guesses.length === MAX_GUESSES);
            if (!valid || !puzzleByNo.has(Number(no))) continue;
            const mine = merged[no];
            if (!mine || (mine.status === 'playing' && g.status !== 'playing')) { merged[no] = g; taken += 1; }
          }
          state.games = merged;
          save();
          if (view) mount(view.no);
          closePanel();
          toast(taken ? 'Stats loaded' : 'Nothing new in that code');
        } catch {
          toast('That code did not load. Check you copied all of it.');
        }
      },
    }));
  }
  if (kind === 'register') {
    openPanel('Drawing register', registerContent({
      puzzles: PUZZLES, drawings: DRAWINGS, issuedNo: issuedNo(), preview, games: state.games, previewGames,
      dateOf, onOpen: no => { closePanel(); mount(no); window.scrollTo({ top: 0 }); },
    }));
  }
}

document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.open)));
$('panel-close').addEventListener('click', closePanel);
$('panel').addEventListener('close', () => { if ($('panel').contains($('toast'))) document.body.append($('toast')); });
$('panel').addEventListener('click', e => { if (e.target === $('panel')) closePanel(); });
$('home').addEventListener('click', e => { e.preventDefault(); setHash(''); route(); window.scrollTo({ top: 0 }); });

// ---------- Routing and the clock ----------
// Rewrite the hash without a navigation. Built from location.href because in an about:srcdoc
// frame a relative URL resolves against the parent page and replaceState throws.
function setHash(hash) {
  try { history.replaceState(null, '', location.href.split('#')[0] + hash); } catch { /* the URL just doesn't follow */ }
}

function route() {
  if (location.hash === '#preview') {
    preview = true;
    try { sessionStorage.setItem('markle:preview', '1'); } catch { /* fine without it */ }
  }
  const m = /^#s(\d{1,4})$/.exec(location.hash);
  const want = m ? Number(m[1]) : null;
  if (want && puzzleByNo.has(want) && (want <= issuedNo() || preview)) return mount(want);
  const latest = latestIssued();
  if (latest >= 1) return mount(homeNo());
  if (preview && PUZZLES.length) return mount(1);
  return mountEmpty();
}

let lastIssued = issuedNo();
setInterval(() => {
  tickCountdowns();
  if (issuedNo() !== lastIssued) {
    lastIssued = issuedNo();
    const rec = view && recordFor(view.no);
    const busy = rec && (rec.status === 'playing' || (rec.bonus && !rec.bonus.done && (rec.bonus.view || ROUNDS.some(k => rec.bonus[k]))));
    if (busy) setHash(`#s${sheetLabel(view.no)}`);
    else if (rec) { if (view.no !== homeNo()) setHash(`#s${sheetLabel(view.no)}`); refresh(); }
    else route();
  }
}, 1000);

window.addEventListener('hashchange', route);
// Another tab finished a guess: pick up its state rather than overwrite it.
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    const next = JSON.parse(e.newValue);
    if (next?.schema === 1) { state = { ...next, settings: { ...DEFAULTS, ...next.settings } }; applyTheme(); if (view) refresh(); }
  } catch { /* ignore a partial write */ }
});
document.title = CONFIG.name;
$('home').textContent = CONFIG.name.toUpperCase();
applyTheme();
$('composer').hidden = false;
route();
if (!state.seenHelp) {
  state.seenHelp = true;
  save();
  showPanel('help');
}
