import test from 'node:test';
import assert from 'node:assert/strict';
import { PuterCloud, CloudError, restoreVerdict, summarize, summarizeFull, buildCloudFile, readCloudFile, loadPuter, cloudMessage, cloudErrorText, errorText } from '../js/core/puter-cloud.js';

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
      write: async (path, data, opts) => { log.push(`write ${path} ${JSON.stringify(opts)}`); if (state.down) throw new TypeError('network'); if (backing.fs.has(path) && !opts?.overwrite) throw { code: 'item_with_same_name_exists' }; backing.fs.set(path, state.stub ? JSON.stringify({ level: 3 }) : data); return { path }; },
      read: async path => { if (state.readFail) throw state.readFail; if (state.staleOnce && !state.served) { state.served = true; return new Blob([JSON.stringify({ level: 3 })]); } if (!backing.fs.has(path)) throw { code: 'subject_does_not_exist', message: 'not found' }; return new Blob([backing.fs.get(path)]); },
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

/** A realistic save: everything the game keeps, not a stub. */
const fullSave = (t = 4242) => ({
  schema: 5, savedAt: t,
  state: {
    playtime: 5400, player: { level: 12, xp: 340, energy: 77, coins: 1800, pearls: 9, amulets: 2, tickets: 3 }, zones: { unlocked: [1, 2, 3, 4] },
    built: { bld_welcome_dock: true, bld_cottage: true }, storage: [{ id: 'banana_02' }, null, { id: 'lumber_01' }], quests: { done: ['a', 'b', 'c'], active: ['d'], progress: { d: [1] } },
    journal: { discovered: { banana_01: 1, banana_02: 1 } }, petsOwned: ['pip'], ach: { done: { merges_100: 1 } }, daily: { streak: 3 }, islands: { isl_pirate_cove: {} }, flags: { x: 1 }, settings: { musicOn: true }
  },
  home: { items: [{ i: 1, id: 'banana_01' }, { i: 2, id: 'banana_01' }], obstacles: [{ type: 'tall_grass', x: 1, y: 1, hits: 1 }] }, islandBoards: {}
});

test('the cloud file starts with a readable summary of everything that matters, followed by the whole save', async () => {
  const { puter, cloud } = device(undefined, undefined), doc = fullSave();
  const r = await cloud.push(doc);
  assert.deepEqual(r.summary, summarizeFull(doc));
  const text = puter.backing.fs.get('tropical-merge/save.json');
  const head = text.slice(0, 900);
  for (const fact of ['"level": 12', '"coins": 1800', '"energy": 77', '"storyQuestsDone": 3', '"zonesUnlocked": 4', '"amulets": 2', '"pearls": 9', '"buildingsBuilt": 2', '"itemsOnBoard": 2', '"itemsInStorage": 2', '"savedAtISO"', '"uploadedAtISO"']) assert.ok(head.includes(fact), `the top of the file shows ${fact}`);
  const back = readCloudFile(text);
  assert.deepEqual(back, doc, 'the full save follows, unchanged: quests, money, energy, storage, settings and the board');
  assert.ok(r.bytes === text.length && r.bytes > 800);
  const meta = await cloud.meta();
  assert.equal(meta.summary.coins, 1800); assert.equal(meta.summary.storyQuestsDone, 3); assert.equal(meta.v, 2);
  const pulled = await cloud.pull();
  assert.deepEqual(pulled.doc, doc); assert.equal(pulled.remote.full.energy, 77);
});

test('an upload that Puter did not keep is reported with what was found, and is not marked as saved', async () => {
  const state = { signedIn: true, user: 'ana', stub: true }, { puter, cloud } = device(undefined, state);
  const e = await cloud.push(fullSave()).then(() => null, x => x);
  assert.equal(e.reason, 'verify'); assert.ok(e.detail.wrote > 800 && e.detail.quests[0] === 3);
  assert.match(cloudErrorText(e), /did not keep the whole save.*\(wrote \d+ bytes, got back \d+; quests 3 vs -1\)/);
  assert.equal(puter.backing.kv.size, 0, 'no record is written for a save that did not stick');
  assert.equal(cloud.connectedBefore, false);
  state.stub = false;
  const ok = await cloud.push(fullSave()); assert.equal(ok.ok, true); assert.equal(ok.verified, 'ok');
});

test('a check that cannot be done never fails a save that was written; a file that is slow to settle gets a second look', async () => {
  const state = { signedIn: true, user: 'ana', readFail: { code: 'weird_sdk_error', message: 'read is not allowed here' } }, { puter, cloud } = device(undefined, state);
  const r = await cloud.push(fullSave());
  assert.equal(r.ok, true); assert.equal(r.verified, 'unknown', 'the write worked, only the read-back did not');
  assert.equal(puter.backing.kv.size, 1, 'so it is recorded as saved');
  state.readFail = null; state.staleOnce = true;                            // the first read still shows an old copy
  const r2 = await cloud.push(fullSave(9999), { force: true });
  assert.equal(r2.verified, 'ok');
});

test('when something unexpected goes wrong the message says what it was', async () => {
  const { puter, cloud } = device(undefined, undefined);
  puter.fs.write = async () => { throw { code: 'quota_exceeded', message: 'Not enough storage space' }; };
  const e = await cloud.push(fullSave()).then(() => null, x => x);
  assert.equal(e.reason, 'network');
  assert.match(cloudErrorText(e), /Could not reach Puter.*quota_exceeded: Not enough storage space/);
  assert.match(cloudErrorText(new RangeError('Invalid time value')), /Something went wrong talking to Puter \(Invalid time value\)/);
  assert.equal(errorText('boom'), 'boom'); assert.equal(errorText({ weird: 1 }), '{"weird":1}');
});

test('files written by the earlier version (a bare save document) can still be restored', () => {
  const doc = fullSave(77);
  assert.deepEqual(readCloudFile(JSON.stringify(doc)), doc);
  assert.deepEqual(readCloudFile(buildCloudFile(doc, 123)), doc);
  assert.throws(() => readCloudFile('{"level":3}'), e => e.reason === 'corrupt');
  assert.throws(() => readCloudFile('not json'), e => e.reason === 'corrupt');
});
