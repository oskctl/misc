// Five bonus questions after the main guess, win or lose: one pick from four options each.
import { h } from './dom.js';
import {
  ROUNDS, ROUND_LABELS, architectOptions, yearOptions, specOptions, noteOptions,
  dimensionOptions, formatMetres, settled, nextRound,
} from './rounds.js';
import { buildSheet } from './sheet.js';

const PROMPTS = {
  architect: 'Who designed it?',
  year: 'When was it finished?',
  dimension: 'How big is it?',
  spec: 'How was the concrete made?',
  notes: 'Which one is false?',
};

function progress(bonus, current) {
  return h('div', { class: 'rounds', 'aria-hidden': 'true' }, ROUNDS.map(k => h('i', {
    class: [settled(bonus[k]) ? (bonus[k].pass ? 'pass' : 'fail') : '', k === current ? 'now' : ''].join(' ').trim(),
  })));
}

function source(url) {
  if (!url) return null;
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  return h('a', { href: url, target: '_blank', rel: 'noopener' }, host);
}

export function renderBonus(root, ctx) {
  const { puzzle, record, specs, svgText, save, onDone } = ctx;
  const bonus = (record.bonus ||= {});
  const key = bonus.view && !settled(bonus[bonus.view]) ? bonus.view : (bonus.view ?? nextRound(bonus));

  if (!key) {
    bonus.done = true;
    save();
    onDone();
    return;
  }
  bonus.view = key;
  const result = (bonus[key] ||= {});
  const done = settled(result);
  const index = ROUNDS.indexOf(key);

  const settle = pass => {
    result.pass = pass;
    save();
    ctx.announce?.(`${ROUND_LABELS[key]}: ${pass ? 'correct' : result.skipped ? 'skipped' : 'not this time'}.`);
    renderBonus(root, ctx);
    ctx.onSettled?.(key);
  };
  const advance = () => {
    const next = nextRound(bonus);
    bonus.view = next;
    if (!next) bonus.done = true;
    save();
    if (!next) onDone();
    else if (ctx.onAdvance) ctx.onAdvance();
    else renderBonus(root, ctx);
  };
  const confirmSkip = () => {
    const row = body.querySelector('.skip-row');
    row.replaceChildren(
      h('span', { class: 'hint', text: 'Skip the rest? They count as wrong.' }),
      h('button', { type: 'button', class: 'linkish', onclick: skipRest }, 'Yes, skip them'),
      h('button', { type: 'button', class: 'linkish', onclick: () => renderBonus(root, ctx) }, 'Keep playing'),
    );
    row.lastElementChild.focus();
  };
  const skipRest = () => {
    for (const k of ROUNDS) if (!settled(bonus[k])) bonus[k] = { ...(bonus[k] || {}), pass: false, skipped: true };
    bonus.view = null;
    bonus.done = true;
    save();
    onDone();
  };

  const body = h('div', { class: 'card', 'aria-live': 'polite' },
    progress(bonus, key),
    h('p', { class: 'q-k', text: `Bonus ${index + 1} of 5` }),
    h('h3', { class: 'q', tabindex: '-1', text: PROMPTS[key] }),
  );

  // One pick from four options: the shape shared by architect, year and concrete.
  const choose = (options, right, label, cls = 'tiles') => body.append(h('div', { class: cls }, options.map(o => {
    const isRight = o === right;
    const state = done ? (isRight ? 'right' : result.pick === o ? 'wrong' : '') : '';
    return h('button', {
      type: 'button', class: `tile ${state}`, disabled: done,
      onclick: () => { ctx.focus = true; result.pick = o; settle(isRight); },
    }, label(o));
  })));

  if (key === 'architect') {
    choose(architectOptions(puzzle), puzzle.architect.answer, String);
    if (done && puzzle.architect.note) body.append(h('p', { class: 'explain', text: puzzle.architect.note }));
  }

  if (key === 'year') {
    choose(yearOptions(puzzle), puzzle.year.value, String);
    if (done && puzzle.year.note) body.append(h('p', { class: 'explain', text: puzzle.year.note }));
  }

  if (key === 'dimension') {
    const mini = buildSheet(puzzle, svgText);
    mini.setStage(6);
    mini.showScaleBar(done);
    mini.showDimension(done ? 'answer' : 'ask');
    const opts = dimensionOptions(puzzle);
    body.append(
      h('p', { class: 'hint', text: `${puzzle.dimension.label}. The little figure is 1.75 m tall.` }),
      h('div', { class: 'sheet' }, mini.frame),
      h('div', { class: 'tiles' }, opts.map(v => {
        const right = v === puzzle.dimension.value;
        const cls = done ? (right ? 'right' : result.pick === v ? 'wrong' : '') : '';
        return h('button', {
          type: 'button', class: `tile ${cls}`, disabled: done,
          onclick: () => { result.pick = v; settle(right); },
        }, formatMetres(v, puzzle.dimension.unit));
      })),
    );
    if (done) body.append(h('p', { class: 'explain' }, `${puzzle.dimension.label}: ${formatMetres(puzzle.dimension.value, puzzle.dimension.unit, { exact: true })}. `, source(puzzle.dimension.source)));
  }

  if (key === 'spec') {
    choose(specOptions(puzzle), puzzle.spec.answer, id => specs[id] || id, 'tiles one');
    if (done) body.append(h('p', { class: 'explain', text: puzzle.spec.explain }));
  }

  if (key === 'notes') {
    const items = noteOptions(puzzle);
    body.append(h('div', { class: 'tiles one' }, items.map((n, i) => {
      if (!done) {
        return h('button', { type: 'button', class: 'tile', onclick: () => { result.pick = i; settle(n.lie); } }, n.text);
      }
      const cls = n.lie ? 'lie struck' : result.pick === i ? 'picked' : '';
      return h('div', { class: `tile ${cls}` },
        h('span', { class: 't', text: n.text }),
        h('small', {}, n.lie ? `False. ${n.correction} ` : 'True. ', source(n.source)));
    })));
  }

  if (done) {
    const verdict = result.pass ? 'Correct' : result.skipped ? 'Skipped' : 'Not this time';
    body.append(
      h('p', { class: 'verdict', text: verdict }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: advance },
        index < ROUNDS.length - 1 ? 'Next →' : 'See results →')),
    );
  } else {
    body.append(h('div', { class: 'btn-row skip-row' },
      h('button', { type: 'button', class: 'linkish', onclick: () => { result.skipped = true; settle(false); } }, 'Skip'),
      h('button', { type: 'button', class: 'linkish', onclick: confirmSkip }, 'Skip all…'),
    ));
  }
  const hadFocus = root.contains(document.activeElement);
  root.replaceChildren(body);
  // Keep keyboard and screen-reader users on the card after it re-renders.
  if (hadFocus || ctx.focus) {
    ctx.focus = false;
    // The Next button may sit below the fold on a short phone: let focus bring it into view.
    if (done) body.querySelector('.btn-ink')?.focus();
    else body.querySelector('h3.q')?.focus({ preventScroll: true });
  }
}
