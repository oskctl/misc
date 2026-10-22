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
import { buildSheet, CLOSEUP_FRACTIONS } from './sheet.js';
import { keyPlan } from './keyplan.js';
import { renderBonus } from './bonus.js';
import { ROUNDS, ROUND_LABELS, settled, formatMetres } from './rounds.js';
import {
  KIND_LABELS, architectList, cityList, searchArchitects, searchCities, kindOf, cityFeedback, architectCorrect,
} from './targets.js';
import {
  openPanel, closePanel, helpContent, statsContent, settingsContent, tickCountdowns, countdownEl,
} from './panels.js';

const KEY = 'markle:v1';
const PREVIEW_KEY = 'markle:preview:v1';
const DEFAULTS = { theme: 'system', units: 'km', mode: 'standard', contrast: false };

const byId = new Map(BUILDINGS.map(b => [b.id, b]));
const index = buildIndex(BUILDINGS);
const architects = architectList(BUILDINGS, PUZZLES.flatMap(p => [p.architect.answer, ...p.architect.distractors]));
const archByKey = new Map(architects.map(a => [a.key, a]));
const cities = cityList(BUILDINGS).map(c => ({ ...c, name: c.city }));
const cityByKey = new Map(cities.map(c => [c.key, c]));
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
// The sheet to open by default: today's in daily mode; the first unfinished one in the launch set.
const homeNo = () => {
  if (!setMode) return latestIssued();
  const cur = state.current;
  if (puzzleByNo.has(cur) && !state.games[cur]?.bonus?.done) return cur;
  const open = PUZZLES.find(p => !['won', 'lost'].includes(state.games[p.no]?.status));
  return open ? open.no : PUZZLES.length;
};
// A record's guesses (building ids, 'a:' architects, 'c:' cities), minus any that left the pool.
const known = code => (kindOf(code) === 'architect' ? archByKey.has(code.slice(2))
  : kindOf(code) === 'city' ? cityByKey.has(code.slice(2)) : byId.has(code));
const guessesOf = rec => (rec?.guesses || []).filter(known);

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

// One row per guess. Buildings and cities get Worldle's distance, direction and proximity;
// an architect is simply right or wrong. Nothing here describes the answer beyond that.
function guessRow(code, i, isNew) {
  const kind = kindOf(code);
  const { answer, puzzle } = view;
  let name, where = '', f;
  if (kind === 'architect') {
    const a = archByKey.get(code.slice(2));
    name = a.name;
    f = { correct: architectCorrect(a.key, puzzle.architect.answer) };
  } else if (kind === 'city') {
    const c = cityByKey.get(code.slice(2));
    name = c.city;
    where = c.country;
    f = cityFeedback(c, answer);
  } else {
    const g = byId.get(code);
    name = g.name;
    where = `${g.city}, ${g.country}`;
    f = feedback(g, answer);
  }
  const dist = f.km != null ? formatDistance(f.km, state.settings.units) : '';
  const label = `${KIND_LABELS[kind]} guess ${i + 1}: ${name}. `
    + (f.correct ? 'Correct.' : kind === 'architect' ? 'Not the architect.'
      : `${dist} ${f.bearing == null ? 'away, next door' : `to the ${compassPoint(f.bearing)}`}. ${f.pct} out of 100.`);
  return h('li', { class: `row${f.correct ? ' hit' : ''}${isNew ? ' new' : ''}`, 'aria-label': label },
    h('span', { class: 'kind', text: KIND_LABELS[kind] }),
    h('span', { class: 'line' },
      h('span', { class: 'name', text: name }),
      h('span', { class: 'metrics' },
        f.correct ? h('span', { text: kind === 'building' ? 'Correct' : 'Right' })
          : kind === 'architect' ? h('span', { text: 'No' })
          : [h('span', { text: dist }), northArrow(f.bearing), h('span', { class: 'pct', text: String(f.pct) })],
      ),
    ),
    where ? h('span', { class: 'line' }, h('span', { class: 'where', text: where })) : null,
  );
}

function guessIsRight(code) {
  const kind = kindOf(code);
  if (kind === 'architect') return architectCorrect(code.slice(2), view.puzzle.architect.answer);
  if (kind === 'city') return cityFeedback(cityByKey.get(code.slice(2)), view.answer).correct;
  return code === view.answer.id;
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
  const hints = h('div', { class: 'hints' });
  const lives = h('div', { class: 'lives' });
  const rows = h('ol', { class: 'guesses', 'aria-label': 'Your guesses' });
  const result = h('div', { class: 'page-result', style: 'display:grid;gap:14px' });
  app.replaceChildren(h('section', { class: 'sheet', 'aria-label': `Sheet ${sheetLabel(no)}` }, sheet.frame, hints), lives, rows, result);
  view = { no, puzzle, answer, sheet, hints, lives, rows, result };
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
  sheet.setStage(stage);
  sheet.showScaleBar(measured);
  sheet.showSurface(settled(rec.bonus?.spec) || Boolean(rec.bonus?.done));
  sheet.setZoom(closeup && !finished ? CLOSEUP_FRACTIONS[guesses.length] : null);
  sheet.showDimension(finished && settled(rec.bonus?.dimension) ? 'answer' : null);
  // Hints: what the player has pinned down, then the type and country as lives run low.
  const found = kind => guesses.some(c => kindOf(c) === kind && guessIsRight(c));
  const hint = (k, v, open) => h('span', { class: `hint-chip${open ? ' on' : ''}` },
    h('span', { class: 'k', text: k }), h('span', { class: 'v', text: open ? v : '?' }));
  const wrong = guesses.filter(c => !guessIsRight(c)).length;
  view.hints.replaceChildren(
    hint('Type', puzzle.typeLabel, finished || (!closeup && wrong >= 3)),
    hint('Country', answer.country, finished || found('city') || (!closeup && wrong >= 4)),
    hint('City', answer.city, finished || found('city') || (!closeup && wrong >= 5)),
    hint('Architect', puzzle.architect.answer, found('architect') || (finished && settled(rec.bonus?.architect))),
  );
  const left = MAX_GUESSES - guesses.length;
  view.lives.replaceChildren(...(finished ? [] : [
    h('span', { class: 'lives-k', text: `${left} ${left === 1 ? 'guess' : 'guesses'} left` }),
    h('span', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: MAX_GUESSES }, (_, i) => h('i', { class: i < left ? 'on' : '' }))),
  ]));
  view.rows.replaceChildren(...guesses.map((c, i) => guessRow(c, i, i === newRow)));

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
    h('p', { class: `verdict${won ? ' ok' : ''}`, text: won ? `Solved in ${guessesOf(rec).length} of 6` : 'Out of guesses. It was…' }),
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
  // An architect found in the main round counts as the first bonus question.
  const rec0 = recordFor(view.no);
  if (rec0 && guessesOf(rec0).some(c => kindOf(c) === 'architect' && guessIsRight(c))) {
    rec0.bonus ||= {};
    rec0.bonus.architect ||= { pass: true, pick: view.puzzle.architect.answer, found: true };
  }
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
  const guesses = guessesOf(rec).filter(c => kindOf(c) !== 'architect')
    .map(c => (kindOf(c) === 'city' ? cityByKey.get(c.slice(2)) : byId.get(c)));
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
  const rows = guessesOf(rec).map(c => (kindOf(c) === 'architect' ? { architect: true, correct: guessIsRight(c), pct: 0 }
    : kindOf(c) === 'city' ? cityFeedback(cityByKey.get(c.slice(2)), answer) : feedback(byId.get(c), answer)));
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
  );
}

// ---------- Composer ----------
const input = $('guess-input');
const list = $('suggest');
const msg = $('composer-msg');
const PLACEHOLDERS = { building: 'Type a building', architect: 'Type an architect', city: 'Type a city' };
let kind = 'building';
let hits = [];
let active = -1;
let chosen = null;

// Each kind of guess searches its own list and stores its own code.
const ITEMS = {
  building: {
    search: q => search(index, q),
    code: b => b.id,
    label: b => b.name,
    sub: (b, alias) => [`${b.city}, ${b.country}`, alias ? `also: ${alias}` : null],
    exact: q => BUILDINGS.find(x => fold(x.name) === q),
  },
  architect: {
    search: q => searchArchitects(architects, q),
    code: a => `a:${a.key}`,
    label: a => a.name,
    sub: () => [],
    exact: q => architects.find(a => a.folded === q),
  },
  city: {
    search: q => searchCities(cities, q),
    code: c => `c:${c.key}`,
    label: c => c.city,
    sub: c => [c.country],
    exact: q => cities.find(c => c.folded === q),
  },
};
// search() returns { b, alias } for buildings; the other lists return the item itself.
const itemOf = hit => hit.b || hit;

function setKind(k) {
  kind = k;
  document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === k)));
  input.placeholder = PLACEHOLDERS[k];
  input.value = '';
  chosen = null;
  setMsg('');
  closeSuggest();
}
document.querySelectorAll('[data-kind]').forEach(b => {
  b.addEventListener('pointerdown', e => e.preventDefault()); // keep the keyboard up
  b.addEventListener('click', () => { setKind(b.dataset.kind); input.focus(); });
});

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
  const kit = ITEMS[kind];
  const res = kit.search(q);
  hits = res.hits;
  const guessed = new Set(recordFor(view.no)?.guesses || []);
  if (!hits.length) {
    closeSuggest();
    setMsg(`No ${kind} by that name on the list.`, true);
    return;
  }
  list.replaceChildren(...hits.map((hit, i) => {
    const item = itemOf(hit);
    const done = guessed.has(kit.code(item));
    return h('li', {
      id: `opt-${i}`, role: 'option', 'aria-selected': String(i === active),
      'aria-disabled': done ? 'true' : null,
      onpointerdown: e => e.preventDefault(),
      onclick: () => choose(i),
    },
    h('span', { class: 's-name', text: kit.label(item) }),
    ...(done ? ['Already guessed'] : kit.sub(item, hit.alias)).filter(Boolean).map(t => h('span', { class: 's-where', text: t })));
  }), ...(res.more ? [h('li', { class: 'more', 'aria-disabled': 'true', text: `+${res.more} more. Keep typing.` })] : []));
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (active >= 0) input.setAttribute('aria-activedescendant', `opt-${active}`);
}

function choose(i) {
  const hit = hits[i];
  if (!hit) return;
  const item = itemOf(hit);
  if ((recordFor(view.no)?.guesses || []).includes(ITEMS[kind].code(item))) { setMsg('Already guessed.'); return; }
  chosen = item;
  input.value = ITEMS[kind].label(item);
  closeSuggest();
  setMsg('');
  input.focus({ preventScroll: true });
}

input.addEventListener('input', () => { chosen = null; active = -1; setMsg(''); renderSuggest(); });
input.addEventListener('focus', () => { if (input.value && !chosen) renderSuggest(); });
input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) closeSuggest(); }, 150));
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
  const kit = ITEMS[kind];
  const item = chosen || kit.exact(fold(input.value)) || (hits.length === 1 && fold(input.value).length >= 2 ? itemOf(hits[0]) : null);
  if (!item) { setMsg(input.value.trim() ? `Pick ${kind === 'architect' ? 'an architect' : `a ${kind}`} from the list.` : PLACEHOLDERS[kind] + '.'); renderSuggest(); return; }
  makeGuess(kit.code(item), kit.label(item));
}

function makeGuess(code, label) {
  const rec = recordFor(view.no, true);
  if (rec.status !== 'playing') return;
  if (rec.guesses.includes(code)) { setMsg('Already guessed.'); return; }
  rec.guesses.push(code);
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
  if (rec.status === 'playing') {
    const left = MAX_GUESSES - rec.guesses.length;
    announce(`${label}: ${guessIsRight(code) ? 'right' : 'not it'}. ${left} ${left === 1 ? 'guess' : 'guesses'} left.`);
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
function showPanel(kind) {
  if (kind === 'help') openPanel('How to play', helpContent({ name: CONFIG.name }));
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
