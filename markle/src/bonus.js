// Bonus questions after the main round, win or lose: the two categories the player didn't pick,
// then year, size, concrete and the false fact. Each is a pick from four options, two tries.
import { h } from './dom.js';
import {
  ROUND_LABELS, TRIES, roundsFor, architectOptions, yearOptions, specOptions, noteOptions,
  dimensionOptions, buildingOptions, cityOptions, formatMetres, settled, nextRound,
} from './rounds.js';
import { questionPoints } from './score.js';
import { buildSheet } from './sheet.js';

const PROMPTS = {
  building: 'Which building is it?',
  architect: 'Who designed it?',
  city: 'Which city is it in?',
  year: 'When was it finished?',
  dimension: 'How big is it?',
  spec: 'How was the concrete made?',
  notes: 'Which one is false?',
};

function progress(bonus, current, rounds) {
  return h('div', { class: 'rounds', 'aria-hidden': 'true' }, rounds.map(k => h('i', {
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
  const rounds = roundsFor(record.category);
  // Stay on the current question until Next, so its answer and explanation can be read.
  const key = bonus.view && rounds.includes(bonus.view) ? bonus.view : nextRound(bonus, rounds);

  if (!key) {
    bonus.done = true;
    save();
    onDone();
    return;
  }
  bonus.view = key;
  const result = (bonus[key] ||= {});
  const done = settled(result);
  const index = rounds.indexOf(key);

  const settle = pass => {
    result.pass = pass;
    save();
    ctx.announce?.(`${ROUND_LABELS[key]}: ${pass ? 'correct' : result.skipped ? 'skipped' : 'not this time'}.`);
    renderBonus(root, ctx);
    ctx.onSettled?.(key);
  };
  const advance = () => {
    const next = nextRound(bonus, rounds);
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
    for (const k of rounds) if (!settled(bonus[k])) bonus[k] = { ...(bonus[k] || {}), pass: false, skipped: true };
    bonus.view = null;
    bonus.done = true;
    save();
    onDone();
  };

  const body = h('div', { class: 'card', 'aria-live': 'polite' },
    progress(bonus, key, rounds),
    h('p', { class: 'q-k', text: `Question ${index + 1} of ${rounds.length}` }),
    h('h3', { class: 'q', tabindex: '-1', text: PROMPTS[key] }),
  );

  // One pick from the options, two tries: a wrong first pick is struck out and the player picks again.
  const picks = (result.picks ||= []);
  const choose = (options, isRight, label, { cls = 'tiles', id = o => o } = {}) => {
    if (!done && picks.length) body.append(h('p', { class: 'hint', text: 'Wrong. One more try.' }));
    body.append(h('div', { class: cls }, options.map(o => {
      const right = isRight(o);
      const picked = picks.includes(id(o));
      const state = done && right ? 'right' : picked ? 'wrong' : '';
      return h('button', {
        type: 'button', class: `tile ${state}`, disabled: done || picked,
        onclick: () => {
          ctx.focus = true;
          picks.push(id(o));
          result.pick = id(o);
          if (right) settle(true);
          else if (picks.length >= TRIES) settle(false);
          else { save(); renderBonus(root, ctx); }
        },
      }, label(o));
    })));
  };
  const explain = text => { if (done && text) body.append(h('p', { class: 'explain', text })); };

  if (key === 'building') {
    choose(buildingOptions(puzzle, ctx.answer, ctx.buildings), b => b.id === ctx.answer.id, b => b.name, { cls: 'tiles one', id: b => b.id });
  }
  if (key === 'city') {
    choose(cityOptions(puzzle, ctx.answerCity, ctx.cities), c => c.key === ctx.answerCity.key, c => `${c.city}, ${c.country}`, { id: c => c.key });
  }
  if (key === 'architect') {
    choose(architectOptions(puzzle), o => o === puzzle.architect.answer, String);
    explain(puzzle.architect.note);
  }
  if (key === 'year') {
    choose(yearOptions(puzzle), o => o === puzzle.year.value, String);
    explain(puzzle.year.note);
  }
  if (key === 'dimension') {
    const mini = buildSheet(puzzle, svgText);
    mini.setStage(6);
    mini.showScaleBar(done);
    mini.showSurface(false);
    mini.showDimension(done ? 'answer' : 'ask');
    mini.frame.classList.add('measure');
    // Ring the scale figure: on a phone it is only a few pixels tall.
    requestAnimationFrame(() => {
      const figs = [...mini.frame.querySelectorAll('svg.dwg .fig')];
      if (!figs.length || !figs[0].getBBox) return;
      const boxes = figs.filter(f => f.parentNode === figs[0].parentNode).map(f => f.getBBox());
      const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
      const x1 = Math.max(...boxes.map(b => b.x + b.width)), y1 = Math.max(...boxes.map(b => b.y + b.height));
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('class', 'fig-ring');
      ring.setAttribute('cx', (x0 + x1) / 2);
      ring.setAttribute('cy', (y0 + y1) / 2);
      ring.setAttribute('r', Math.max(x1 - x0, y1 - y0) / 2 + 22);
      figs[0].parentNode.append(ring);
    });
    body.append(
      h('p', { class: 'hint' }, `${puzzle.dimension.label}. Scale: the `, h('b', { class: 'fig-key', text: 'red person' }), ' is 1.75 m tall.'),
      h('div', { class: 'sheet' }, mini.frame),
    );
    choose(dimensionOptions(puzzle), v => v === puzzle.dimension.value, v => formatMetres(v, puzzle.dimension.unit));
    if (done) body.append(h('p', { class: 'explain' }, `${puzzle.dimension.label}: ${formatMetres(puzzle.dimension.value, puzzle.dimension.unit, { exact: true })}. `, source(puzzle.dimension.source)));
  }
  if (key === 'spec') {
    choose(specOptions(puzzle), id => id === puzzle.spec.answer, id => specs[id] || id, { cls: 'tiles one' });
    explain(puzzle.spec.explain);
  }
  if (key === 'notes') {
    const items = noteOptions(puzzle);
    if (!done) choose(items, n => n.lie, n => n.text, { cls: 'tiles one', id: n => n.text });
    else {
      body.append(h('div', { class: 'tiles one' }, items.map(n => h('div', { class: `tile ${n.lie ? 'right' : picks.includes(n.text) ? 'wrong' : ''}` },
        h('span', { class: 't', text: n.text }),
        h('small', {}, n.lie ? `False. ${n.correction} ` : 'True. ', source(n.source))))));
    }
  }

  if (done) {
    const pts = questionPoints(result);
    const verdict = result.pass ? `Correct · +${pts} ${pts === 1 ? 'point' : 'points'}` : result.skipped ? 'Skipped' : 'Wrong';
    body.append(
      h('p', { class: `verdict${result.pass ? ' ok' : ''}`, text: verdict }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: advance },
        index < rounds.length - 1 ? 'Next →' : 'See results →')),
    );
  } else {
    body.append(h('div', { class: 'btn-row skip-row' },
      h('button', { type: 'button', class: 'linkish', onclick: () => { result.skipped = true; settle(false); } }, 'Skip'),
      h('button', { type: 'button', class: 'linkish', onclick: confirmSkip }, 'Skip the rest'),
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
