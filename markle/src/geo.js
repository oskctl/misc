// Great-circle maths for guess feedback, and the Equal Earth projection used by the map.

const R_KM = 6371.0088;
const RAD = Math.PI / 180;
// Proximity runs on a log scale: buildings cluster in a few cities, and Worldle's linear
// 0-20,000 km scale would score every guess in the right continent 90%+. Here every 10x
// closer adds roughly 30 points: 10 km = 91, 100 km = 68, 1,000 km = 39, 10,000 km = 9.
const LOG_SPAN = Math.log(2001);

export function distanceKm(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Initial great-circle bearing from a to b, degrees clockwise from north, in [0, 360).
export function bearingDeg(a, b) {
  const φ1 = a.lat * RAD, φ2 = b.lat * RAD, Δλ = (b.lon - a.lon) * RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) / RAD) + 360) % 360;
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

export function compassPoint(deg) {
  return COMPASS[Math.round(deg / 45) % 8];
}

export function arrowEmoji(deg) {
  return ARROWS[Math.round(deg / 45) % 8];
}

// 100 is reserved for the answer itself, so a wrong guess tops out at 99.
export function proximityPct(km, correct = false) {
  if (correct) return 100;
  const p = Math.floor(100 * (1 - Math.log(1 + km / 10) / LOG_SPAN));
  return Math.min(99, Math.max(0, p));
}

// Worldle's five-square encoding: a full square per 20 points, a half square for 10 more.
export function proximitySquares(pct) {
  const full = Math.floor(pct / 20);
  const half = pct - full * 20 >= 10 ? 1 : 0;
  return { full, half, empty: 5 - full - half };
}

export function formatDistance(km, units = 'km') {
  const v = units === 'mi' ? km * 0.621371 : km;
  if (v < 10) return `${v.toFixed(1)} ${units}`;
  return `${Math.round(v).toLocaleString('en-GB')} ${units}`;
}

// d3-geo's geoEqualEarth, raw form. Scale and translate come from tools/build-map.mjs.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;

export function equalEarth(lon, lat, { scale, translate }) {
  const λ = lon * RAD;
  const l = Math.asin(M * Math.sin(lat * RAD));
  const l2 = l * l, l6 = l2 * l2 * l2;
  const x = λ * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [translate[0] + scale * x, translate[1] - scale * y];
}
