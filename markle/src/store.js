// localStorage that never throws: private windows, blocked storage and sandboxed
// previews all fall back to an in-memory map so the game still plays.

const memory = new Map();

function backend() {
  try {
    const ls = window.localStorage;
    const probe = '__markle_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

let ls;

export function read(key, fallback) {
  if (ls === undefined) ls = backend();
  try {
    const raw = ls ? ls.getItem(key) : memory.get(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  if (ls === undefined) ls = backend();
  const raw = JSON.stringify(value);
  try {
    if (ls) ls.setItem(key, raw);
    else memory.set(key, raw);
    return true;
  } catch {
    memory.set(key, raw);
    return false;
  }
}

export function persistent() {
  if (ls === undefined) ls = backend();
  return ls !== null;
}
