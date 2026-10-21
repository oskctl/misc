// Great-circle maths for guess feedback, and the Equal Earth projection used by the map.

const R_KM = 6371.0088;
const RAD = Math.PI / 180;
// Worldle's yardstick: anything half a world away scores 0%.
export const MAX_KM = 20000;

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

export function proximityPct(km) {
  return Math.floor(Math.max(0, (MAX_KM - km) / MAX_KM) * 100);
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
