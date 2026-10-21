// "Complete the title block": five quick rounds after the main guess, win or lose.
import { h } from './dom.js';
import {
  ROUNDS, ROUND_LABELS, ROUND_TRIES, architectOptions, specOptions, noteOptions,
  dimensionOptions, formatMetres, yearVerdict, settled, nextRound,
} from './rounds.js';
import { buildSheet } from './sheet.js';

const PROMPTS = {
  architect: 'Who designed it?',
  year: 'When was it completed?',
  dimension: 'Dimension it.',
  spec: 'Specify the concrete.',
  notes: 'Two truths and a lie. Strike the lie.',
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
    renderBonus(root, ctx);
    ctx.onSettled?.(key);
  };
  const advance = () => {
    const next = nextRound(bonus);
    bonus.view = next;
    if (!next) bonus.done = true;
    save();
    if (next) renderBonus(root, ctx); else onDone();
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
    h('p', { class: 'q-k', text: `Title block · ${index + 1}/5 · ${ROUND_LABELS[key]}` }),
    h('h3', { class: 'q', text: PROMPTS[key] }),
  );

  if (key === 'architect') {
    const picks = (result.picks ||= []);
    const answer = puzzle.architect.answer;
    if (!done) body.append(h('p', { class: 'hint', text: `Two tries.${picks.length ? ' One left.' : ''}` }));
    body.append(h('div', { class: 'tiles' }, architectOptions(puzzle).map(name => {
      const picked = picks.includes(name);
      const cls = (done && name === answer) || (picked && name === answer) ? 'right' : picked ? 'wrong' : '';
      return h('button', {
        type: 'button', class: `tile ${cls}`, disabled: done || picked,
        onclick: () => {
          picks.push(name);
          if (name === answer) settle(true);
          else if (picks.length >= ROUND_TRIES.architect) settle(false);
          else { save(); renderBonus(root, ctx); }
        },
      }, name);
    })));
    if (done && puzzle.architect.note) body.append(h('p', { class: 'explain', text: puzzle.architect.note }));
  }

  if (key === 'year') {
    const tries = (result.tries ||= []);
    const value = puzzle.year.value;
    const min = Math.min(1945, value - 10), max = Math.max(2030, value + 10);
    if (!done) {
      let year = ctx.yearDraft ?? Math.round((min + max) / 2);
      const out = h('output', { class: 'year', for: 'year-range', text: String(year) });
      const range = h('input', { type: 'range', id: 'year-range', min, max, step: 1, value: year, 'aria-label': 'Year completed' });
      const submit = h('button', {
        type: 'button', class: 'btn btn-ink',
        onclick: () => {
          const v = yearVerdict(year, puzzle);
          tries.push(year);
          if (v.pass) settle(true);
          else if (tries.length >= ROUND_TRIES.year) settle(false);
          else { save(); renderBonus(root, ctx); }
        },
      }, `Submit ${year}`);
      const set = y => {
        year = Math.min(max, Math.max(min, y));
        ctx.yearDraft = year;
        range.value = year;
        out.textContent = String(year);
        submit.textContent = `Submit ${year}`;
      };
      range.addEventListener('input', () => set(Number(range.value)));
      body.append(
        h('p', { class: 'hint', text: `Three tries. Within ${puzzle.year.tolerance} years counts.` }),
        h('div', { class: 'ruler' },
          h('div', { class: 'readout' },
            h('button', { type: 'button', class: 'step', 'aria-label': 'One year earlier', onclick: () => set(year - 1) }, '−'),
            out,
            h('button', { type: 'button', class: 'step', 'aria-label': 'One year later', onclick: () => set(year + 1) }, '+'),
          ),
          range,
          h('div', { class: 'ends' }, h('span', { text: String(min) }), h('span', { text: String(max) })),
        ),
        submit,
      );
    }
    if (tries.length) {
      body.append(h('div', { class: 'tries' }, tries.map(t => {
        const v = yearVerdict(t, puzzle);
        const mark = v.dir === 'later' ? '▲ later' : v.dir === 'earlier' ? '▼ earlier' : '●';
        return h('span', { class: v.near ? 'near' : '' }, `${t} ${v.pass ? '✓' : mark}`);
      })));
    }
    if (done) {
      body.append(
        h('p', { class: 'answer-name', text: String(value) }),
        puzzle.year.note ? h('p', { class: 'explain', text: puzzle.year.note }) : null,
      );
    }
  }

  if (key === 'dimension') {
    const mini = buildSheet(puzzle, svgText);
    mini.setStage(6);
    mini.showScaleBar(done);
    mini.showDimension(done ? 'answer' : 'ask');
    const opts = dimensionOptions(puzzle);
    body.append(
      h('p', { class: 'hint', text: `${puzzle.dimension.label}. No scale bar this time: judge it from the storeys, doors and the 1.75 m figure.` }),
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
    if (done) body.append(h('p', { class: 'explain' }, `${puzzle.dimension.label}: ${formatMetres(puzzle.dimension.value, puzzle.dimension.unit)}. `, source(puzzle.dimension.source)));
  }

  if (key === 'spec') {
    body.append(h('div', { class: 'tiles one' }, specOptions(puzzle).map(id => {
      const right = id === puzzle.spec.answer;
      const cls = done ? (right ? 'right' : result.pick === id ? 'wrong' : '') : '';
      return h('button', {
        type: 'button', class: `tile ${cls}`, disabled: done,
        onclick: () => { result.pick = id; settle(right); },
      }, specs[id] || id);
    })));
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
        h('small', {}, n.lie ? `Correction: ${n.correction} ` : result.pick === i ? 'True: this one was real. ' : 'True. ', source(n.source)));
    })));
  }

  if (done) {
    const verdict = result.pass ? 'Filled in' : result.skipped ? 'Skipped' : 'Redlined';
    body.append(
      h('p', { class: 'verdict', text: verdict }),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ink', onclick: advance },
        index < ROUNDS.length - 1 ? `Next: ${ROUND_LABELS[ROUNDS[index + 1]]} →` : 'Finish the sheet →')),
    );
  } else {
    body.append(h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'linkish', onclick: () => { result.skipped = true; settle(false); } }, 'Skip this field'),
      h('button', { type: 'button', class: 'linkish', onclick: skipRest }, 'Skip to results'),
    ));
  }
  root.replaceChildren(body);
}
