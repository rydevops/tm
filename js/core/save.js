// Local persistence: IndexedDB with atomic writes and two rolling backups, a checksum per slot,
// a localStorage fallback and file export/import. Saves never leave the device.
import { checksum } from './util.js';

const DB_NAME = 'tropical-merge', STORE = 'saves', LS_KEY = 'tropical-merge-save-v1';
const SLOTS = ['main', 'bak1', 'bak2'];

function pack(doc) { const json = JSON.stringify(doc); return { json, sum: checksum(json), at: Date.now() }; }
function unpack(rec) {
  if (!rec || typeof rec.json !== 'string') return null;
  if (checksum(rec.json) !== rec.sum) return null;
  try { return JSON.parse(rec.json); } catch (e) { return null; }
}

export class SaveStore {
  constructor() { this.db = null; this.lastError = null; this.lastSaved = 0; }

  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise(resolve => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      let req; try { req = indexedDB.open(DB_NAME, 1); } catch (e) { this.lastError = e; return resolve(null); }
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => { this.db = req.result; this.db.onclose = () => { this.db = null; }; resolve(this.db); };
      req.onerror = () => { this.lastError = req.error; resolve(null); };
      req.onblocked = () => resolve(null);
    });
  }
  _get(db, key) { return new Promise(res => { try { const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } }); }

  /** Load the newest valid save, trying main then the two backups, then localStorage. */
  async load() {
    const db = await this.open(); const found = [];
    if (db) for (const k of SLOTS) { const doc = unpack(await this._get(db, k)); if (doc) found.push({ slot: k, doc }); }
    try { const ls = localStorage.getItem(LS_KEY); if (ls) { const doc = unpack(JSON.parse(ls)); if (doc) found.push({ slot: 'ls', doc }); } } catch (e) { /* ignore */ }
    if (!found.length) return null;
    // prefer the first valid slot in priority order, unless localStorage holds a clearly newer one
    let best = found[0];
    for (const f of found) if ((f.doc.savedAt || 0) > (best.doc.savedAt || 0) + 1000) best = f;
    best.doc._slot = best.slot; return best.doc;
  }

  /** Atomic rotate-and-write: main -> bak1 -> bak2 in one transaction. */
  async save(doc) {
    const rec = pack(doc); let ok = false;
    const db = await this.open();
    if (db) {
      try {
        const old = [await this._get(db, 'main'), await this._get(db, 'bak1')];
        await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
          if (old[1] && Date.now() - (old[0]?.at || 0) > 60000) st.put(old[1], 'bak2');
          if (old[0] && Date.now() - (old[0].at || 0) > 60000) st.put(old[0], 'bak1');
          st.put(rec, 'main');
          tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
        });
        ok = true;
      } catch (e) { this.lastError = e; }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(rec)); ok = true; } catch (e) { if (!ok) this.lastError = e; }
    if (ok) this.lastSaved = Date.now();
    return ok;
  }

  /** Synchronous best-effort write for page-hide events; the async IndexedDB write is also started. */
  quickSave(doc) {
    const rec = pack(doc);
    try { localStorage.setItem(LS_KEY, JSON.stringify(rec)); this.lastSaved = Date.now(); } catch (e) { /* quota or privacy mode */ }
    this.save(doc).catch(() => {});
  }

  async clear() {
    const db = await this.open();
    if (db) await new Promise(res => { try { const tx = db.transaction(STORE, 'readwrite'); SLOTS.forEach(k => tx.objectStore(STORE).delete(k)); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } });
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
  }

  exportText(doc) { return JSON.stringify(pack(doc)); }
  /** Parse an exported file's text; returns the save doc or null when invalid. */
  importText(text) {
    try { const rec = JSON.parse(text); if (rec && rec.json) return unpack(rec); if (rec && rec.state) return rec; } catch (e) { /* ignore */ }
    return null;
  }
}
