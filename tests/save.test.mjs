import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore } from '../js/core/save.js';

function withLocalStorage(fn) {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  return Promise.resolve(fn()).finally(() => { delete globalThis.localStorage; });
}
const doc = n => ({ schema: 4, savedAt: n, state: { n } });

test('reset: the page-hide save that runs during reload cannot bring the old island back', () => withLocalStorage(async () => {
  const s = new SaveStore();
  await s.save(doc(1000));
  assert.equal((await s.load()).state.n, 1000);
  await s.clear();
  assert.equal(await s.load(), null);
  s.quickSave(doc(2000));                 // what pagehide / beforeunload do
  assert.equal(await s.save(doc(3000)), false);
  assert.equal(await s.load(), null);
  assert.equal(await new SaveStore().load(), null); // a fresh page (new store) finds nothing
}));

test('import: the old game is not written back over the imported save during reload', () => withLocalStorage(async () => {
  const s = new SaveStore();
  await s.save(doc(5000));
  await s.save(doc(1000));                // the imported (older) doc
  s.freeze();
  s.quickSave(doc(9000));                 // current game's page-hide save
  assert.equal((await new SaveStore().load()).state.n, 1000);
}));
