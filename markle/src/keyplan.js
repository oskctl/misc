// The key plan: a world map zoomed to fit the player's guesses and the answer, with a dashed
// ray from each guess to the answer.
import { s } from './dom.js';
import { MAP, LAND_PATH } from '../data/worldmap.js';
import { equalEarth } from './geo.js';

export function keyPlan(guesses, answer) {
  const pts = guesses.map(g => equalEarth(g.lon, g.lat, MAP));
  const target = equalEarth(answer.lon, answer.lat, MAP);
  const all = [...pts, target];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  // Fit the points with padding, at least 140 units wide, in a 2:1 window clamped to the map.
  let w = Math.max(140, (Math.max(...xs) - Math.min(...xs)) * 1.35);
  let hgt = Math.max((Math.max(...ys) - Math.min(...ys)) * 1.35, w / 2);
  w = Math.max(w, hgt * 2);
  hgt = w / 2;
  w = Math.min(w, MAP.width);
  hgt = Math.min(hgt, MAP.height);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const x0 = Math.min(Math.max(cx - w / 2, 0), MAP.width - w);
  const y0 = Math.min(Math.max(cy - hgt / 2, 0), MAP.height - hgt);
  const r = w / 60, fs = w / 46;

  const svg = s('svg', { viewBox: `${x0} ${y0} ${w} ${hgt}`, role: 'img', 'aria-label': 'Key plan: your guesses and the answer on a world map' },
    s('path', { class: 'land', d: LAND_PATH }),
    pts.map(([x, y]) => s('line', { class: 'ray', x1: x, y1: y, x2: target[0], y2: target[1] })),
    s('g', { class: 't' },
      s('path', { d: `M${target[0] - r * 1.6} ${target[1]}h${r * 3.2}M${target[0]} ${target[1] - r * 1.6}v${r * 3.2}` }),
      s('circle', { cx: target[0], cy: target[1], r: r * 0.9 }),
    ),
    pts.map(([x, y], i) => guesses[i].id === answer.id ? null : s('g', { class: 'g' },
      s('circle', { cx: x, cy: y, r }),
      s('text', { x, y: y + fs * 0.05, 'font-size': fs, text: String(i + 1) }),
    )),
  );
  return svg;
}
