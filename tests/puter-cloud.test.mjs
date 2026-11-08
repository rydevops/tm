import test from 'node:test';
import assert from 'node:assert/strict';
import { PuterCloud, CloudError, restoreVerdict, summarize, loadPuter, cloudMessage } from '../js/core/puter-cloud.js';

/** An in-memory stand-in for puter.js (auth, kv and fs as documented); every device of one account shares `backing`. */
function fakePuter(backing = { kv: new Map(), fs: new Map() }, state = { signedIn: true, user: 'ana' }) {
  const log = [];
  const p = {
    log, state, backing,
    auth: {
      isSignedIn: async () => state.signedIn, getUser: async () => ({ username: state.user }),
      signIn: async () => { if (state.cancel) throw new Error('popup closed'); state.signedIn = true; return { username: state.user }; },
      signOut: async () => { state.signedIn = false; }
    },
    kv: {
      get: async k => { if (state.down) throw new TypeError('network'); return backing.kv.has(k) ? backing.kv.get(k) : null; },
      set: async (k, v) => { if (state.down) throw new TypeError('network'); backing.kv.set(k, v); return true; },
      del: async k => { backing.kv.delete(k); return true; }
    },
    fs: {
      write: async (path, data, opts) => { log.push(`write ${path} ${JSON.stringify(opts)}`); if (state.down) throw new TypeError('network'); if (backing.fs.has(path) && !opts?.overwrite) throw { code: 'item_with_same_name_exists' }; backing.fs.set(path, data); return { path }; },
      read: async path => { if (!backing.fs.has(path)) throw { code: 'subject_does_not_exist', message: 'not found' }; return new Blob([backing.fs.get(path)]); },
      delete: async path => { if (!backing.fs.has(path)) throw { code: 'subject_does_not_exist' }; backing.fs.delete(path); }
    }
  };
  return p;
}
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const device = (backing, state) => { const puter = fakePuter(backing, state); return { puter, cloud: new PuterCloud({ getPuter: async () => puter, storage: mem() }) }; };
const save = (t, level = 7, extra = {}) => ({ schema: 5, savedAt: t, state: { player: { level, coins: 123 }, playtime: 900, ...extra }, home: { items: [{ i: 1, id: 'banana_01' }], obstacles: [] } });

test('the first upload stores the save and a timestamped record in the account; later ones update them', async () => {
  const { puter, cloud } = device(undefined, undefined), before = Date.now();
  assert.equal(await cloud.meta(), null, 'a new account has no cloud save');
  const r = await cloud.push(save(1000, 7));
  assert.deepEqual([r.ok, r.created], [true, true]);
  const meta = await cloud.meta();
  assert.equal(meta.savedAt, 1000, 'the game save time');
  assert.ok(meta.uploadedAt >= before && meta.uploadedAt <= Date.now(), 'and the time of the upload');
  assert.equal(meta.level, 7); assert.equal(meta.playtime, 900);
  assert.ok(puter.log[0].includes('"overwrite":true') && puter.log[0].includes('"createMissingParents":true'));
  const r2 = await cloud.push(save(2000, 8));
  assert.deepEqual([r2.ok, r2.created], [true, false]);
  assert.equal((await cloud.meta()).savedAt, 2000);
  assert.equal(puter.backing.fs.size, 1, 'one file, replaced each time');
});

test('pull returns the saved game and its times without changing anything on the device', async () => {
  const backing = { kv: new Map(), fs: new Map() };
  const a = device(backing), b = device(backing);
  await a.cloud.push(save(5000, 9, { secret: 'Ñandú 🏝️' }));
  const r = await b.cloud.pull();
  assert.equal(r.doc.state.secret, 'Ñandú 🏝️'); assert.equal(r.remote.level, 9); assert.equal(r.remote.savedAt, 5000); assert.ok(r.remote.uploadedAt > 0);
  assert.equal(b.cloud.connectedBefore, false, 'nothing is linked until the restore is adopted');
  await b.cloud.adopt(r.doc);
  assert.equal(b.cloud.connectedBefore, true);
  assert.equal((await b.cloud.push(save(6000))).ok, true, 'after adopting, the next upload is not a conflict');
});

test('an upload over a save this device has not seen is held back as a conflict, and can be forced', async () => {
  const backing = { kv: new Map(), fs: new Map() };
  const a = device(backing), b = device(backing);
  await a.cloud.push(save(100));
  const r = await b.cloud.pull(); await b.cloud.adopt(r.doc);
  assert.equal((await b.cloud.push(save(300))).ok, true);
  const c = await a.cloud.push(save(400));
  assert.equal(c.reason, 'conflict'); assert.equal(c.remote.savedAt, 300); assert.equal(c.local.savedAt, 400);
  assert.equal((await b.cloud.meta()).savedAt, 300, 'nothing was overwritten');
  assert.equal((await a.cloud.push(save(400), { force: true })).ok, true);
  assert.equal((await b.cloud.meta()).savedAt, 400);
  // a device that never synced meets an existing cloud save: also a conflict, never a silent overwrite
  const d = device(backing); assert.equal((await d.cloud.push(save(50))).reason, 'conflict');
});

test('restoreVerdict: older, newer, same, and a device nobody has played', () => {
  const local = { savedAt: 5000, level: 12, playtime: 4000, quests: 30 };
  assert.equal(restoreVerdict({ savedAt: 4000 }, local), 'older');
  assert.equal(restoreVerdict({ savedAt: 6000 }, local), 'newer');
  assert.equal(restoreVerdict({ savedAt: 5000 }, local), 'same');
  assert.equal(restoreVerdict({ savedAt: 4000 }, { savedAt: 5000, level: 1, playtime: 30, quests: 0 }), 'untouched', 'a fresh install has nothing to lose');
  assert.equal(restoreVerdict({ savedAt: 4000 }, { savedAt: 5000, level: 1, playtime: 30, quests: 2 }), 'older', 'but one that has started a quest does');
  assert.equal(restoreVerdict({ savedAt: 4000 }, { savedAt: 5000, level: 3, playtime: 30, quests: 0 }), 'older');
});

test('delete removes both the file and the record; missing cloud save and signed-out states are named', async () => {
  const { puter, cloud } = device(undefined, undefined);
  await assert.rejects(cloud.pull(), e => e.reason === 'missing');
  await cloud.push(save(10));
  await cloud.remove();
  assert.equal(puter.backing.fs.size, 0); assert.equal(puter.backing.kv.size, 0); assert.equal(await cloud.meta(), null);
  await cloud.remove();                                                     // deleting what is not there is fine
  puter.state.signedIn = false;
  await assert.rejects(cloud.push(save(11)), e => e.reason === 'signedout');
  await assert.rejects(cloud.meta(), e => e.reason === 'signedout');
});

test('sign in, cancel, sign out, and network failures are reported plainly', async () => {
  const state = { signedIn: false, user: 'ana', cancel: true }, d = device(undefined, state);
  assert.equal(await d.cloud.isSignedIn(), false);
  await assert.rejects(d.cloud.signIn(), e => e.reason === 'cancelled');
  state.cancel = false;
  await d.cloud.signIn(); assert.equal(await d.cloud.isSignedIn(), true); assert.deepEqual(await d.cloud.user(), { name: 'ana' });
  state.down = true;
  await assert.rejects(d.cloud.push(save(1)), e => e instanceof CloudError && e.reason === 'network');
  state.down = false;
  await d.cloud.push(save(1));
  await d.cloud.signOut(); assert.equal(await d.cloud.isSignedIn(), false); assert.equal(d.cloud.connectedBefore, false);
  assert.match(cloudMessage({ reason: 'network' }), /Puter/);
});

test('a save from another Puter account is not treated as this device\'s last sync', async () => {
  const backing = { kv: new Map(), fs: new Map() }, state = { signedIn: true, user: 'ana' }, a = device(backing, state);
  await a.cloud.push(save(100));
  state.user = 'ben'; backing.kv.clear(); backing.fs.clear();                 // ben's account has its own, empty storage
  assert.equal((await a.cloud.push(save(200))).created, true);
});

test('puter.js is optional: when it cannot be loaded the cloud features say so and the game is unaffected', async () => {
  const cloud = new PuterCloud({ getPuter: async () => { throw new CloudError('unavailable'); }, storage: mem() });
  await assert.rejects(cloud.isSignedIn(), e => e.reason === 'unavailable');
  await assert.rejects(new PuterCloud({ getPuter: async () => ({}), storage: mem() }).isSignedIn(), e => e.reason === 'unavailable', 'an incomplete SDK counts as unavailable');
  await assert.rejects(loadPuter({ doc: null }), e => e.reason === 'unavailable');
  assert.equal(summarize(save(7, 4)).level, 4);
});
