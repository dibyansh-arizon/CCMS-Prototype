import { buildSeed, SCHEMA_VERSION } from './seed.js';

const KEY = 'ccms_prototype_db';

// Primary persistence: data/ccms-db.json via the Vite dev-server middleware;
// fallback: browser localStorage. A schema mismatch triggers a clean re-seed.
export async function loadDB() {
  try {
    const res = await fetch('/api/db', { cache: 'no-store' });
    if (res.ok) {
      const d = await res.json();
      if (d && d.schema === SCHEMA_VERSION && Array.isArray(d.records)) return d;
    }
  } catch (e) { /* server persistence unavailable */ }
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.schema === SCHEMA_VERSION && Array.isArray(d.records)) return d;
  } catch (e) { /* ignore */ }
  return buildSeed(new Date());
}

let timer = null;
export function saveDB(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(db) }).catch(() => {});
  }, 300);
}
export function resetDB() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return buildSeed(new Date());
}
