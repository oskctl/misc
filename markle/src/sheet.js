// The drawing frame: the layered SVG, the overlay (scale bar, bonus dimension line), the
// close-up zoom and the end-of-game stamp.
import { h, s, parseSvg } from './dom.js';
import { formatMetres } from './rounds.js';

const W = 1200, H = 900;
const BARS = [1, 2, 5, 10, 20, 50, 100];
// Close-up mode: the crop starts at a fifth of the sheet and widens with each miss, then shows
// the whole sheet. Labels are the nominal print scale of each crop.
export const CLOSEUP_FRACTIONS = [0.2, 0.3, 0.45, 0.65, 0.85];

// Nominal print scale if the sheet were A3 landscape (420 mm wide), rounded to a standard ratio.
export function nominalScale(pxPerM) {
  const ratio = (W / pxPerM) / 0.42;
  const std = [20, 50, 100, 200, 250, 500, 1000, 1250, 2500];
  return '1:' + std.reduce((a, b) => (Math.abs(b - ratio) < Math.abs(a - ratio) ? b : a));
}

function scaleBar(pxPerM) {
  // Shortest standard bar long enough that the '0' and 'N m' labels never collide on a phone.
  const metres = BARS.find(b => b * pxPerM >= 200) ?? BARS[BARS.length - 1];
  const len = metres * pxPerM, x = 36, y = H - 34;
  return s('g', { class: 'bar-scale', 'data-show': '' },
    s('rect', { x, y, width: len / 2, height: 7 }),
    s('rect', { class: 'hollow', x: x + len / 2, y, width: len / 2, height: 7 }),
    s('text', { x, y: y - 9, text: '0' }),
    s('text', { x: x + len, y: y - 9, 'text-anchor': 'end', text: `${metres} m` }),
  );
}

function dimensionLine([x1, y1, x2, y2], label) {
  const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const tick = (x, y) => s('line', { x1: x - 9, y1: y + 9, x2: x + 9, y2: y - 9 });
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const tx = vertical ? mx - 26 : mx, ty = vertical ? my : my - 22;
  const w = Math.max(64, label.length * 29 + 24);
  return s('g', { class: 'dim', 'data-show': '' },
    s('line', { x1, y1, x2, y2 }),
    tick(x1, y1), tick(x2, y2),
    s('g', { transform: `translate(${tx} ${ty})${vertical ? ' rotate(-90)' : ''}` },
      s('rect', { class: 'tag', x: -w / 2, y: -34, width: w, height: 50 }),
      s('text', { x: 0, y: 6, 'text-anchor': 'middle', text: label }),
    ),
  );
}

export function buildSheet(puzzle, svgText) {
  const drawing = parseSvg(svgText);
  drawing.classList.add('dwg');
  drawing.setAttribute('aria-hidden', 'true');
  drawing.removeAttribute('width');
  drawing.removeAttribute('height');
  const focus = (drawing.getAttribute('data-focus') || '').split(/\s+/).map(Number);
  const over = s('svg', { class: 'over', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  const bar = scaleBar(puzzle.pxPerM);
  over.append(bar);
  let dim = null;
  const zoom = h('div', { class: 'zoom' }, drawing, over);
  const stampSlot = h('div');
  const frame = h('div', { class: 'frame', role: 'img', 'aria-label': `Sheet ${puzzle.no}, ${puzzle.view.toLowerCase()}` }, zoom, stampSlot);

  let current = 0;
  return {
    frame,
    setStage(stage) {
      // A newly issued layer draws in redline, then settles to ink: the reviewer's mark-up.
      if (current && stage > current && stage <= 5) {
        const layer = drawing.querySelector(`[data-layer="${stage}"]`);
        if (layer) {
          layer.classList.add('issued');
          setTimeout(() => layer.classList.remove('issued'), 1400);
        }
      }
      current = stage;
      drawing.setAttribute('data-stage', String(stage));
      bar.style.opacity = stage >= 2 ? '1' : '0';
      frame.setAttribute('aria-label', `Sheet ${puzzle.no}, ${puzzle.view.toLowerCase()}, revision ${stage} of 6`);
    },
    setZoom(fraction) {
      if (!fraction || focus.length !== 2 || focus.some(Number.isNaN)) { zoom.style.transform = ''; return; }
      const cw = W * fraction, ch = cw * 0.75;
      const x0 = Math.min(Math.max(focus[0] - cw / 2, 0), W - cw);
      const y0 = Math.min(Math.max(focus[1] - ch / 2, 0), H - ch);
      zoom.style.transform = `scale(${W / cw}) translate(${(-x0 / W) * 100}%, ${(-y0 / H) * 100}%)`;
    },
    showScaleBar(on) { bar.style.visibility = on ? 'visible' : 'hidden'; },
    // Surface texture shows how the concrete was made, so it stays off until that question is done.
    showSurface(on) { drawing.toggleAttribute('data-nosurface', !on); },
    // state: null (none), 'ask' (with "?"), or 'answer'
    showDimension(state) {
      dim?.remove();
      dim = null;
      if (!state) return;
      const label = state === 'ask' ? '?' : formatMetres(puzzle.dimension.value, puzzle.dimension.unit, { exact: true });
      dim = dimensionLine(puzzle.dimension.line, label);
      over.append(dim);
    },
    stamp(text, sub) {
      stampSlot.replaceChildren(text ? h('div', { class: `stamp${/approved/i.test(text) ? ' ok' : ''}` }, text, sub ? h('small', { text: sub }) : null) : '');
    },
  };
}
