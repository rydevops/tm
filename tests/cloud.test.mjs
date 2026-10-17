import test from 'node:test';
import assert from 'node:assert/strict';
import { Cloud, CloudError, seal, unseal, newKey } from '../js/core/cloud.js';

/** An in-memory stand-in for jsonhosting.com, following its documented endpoints. */
function fakeServer() {
  const docs = new Map(); let n = 0; const log = [];
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchFn = async (url, init = {}) => {
    const u = new URL(url), m = init.method || 'GET'; log.push(`${m} ${u.pathname}${u.search ? '?' : ''}${init.cache || ''}`);
    if (fetchFn.down) throw new TypeError('Failed to fetch');
    if (fetchFn.limited) return json({ error: 'rate' }, 429);
    if (m === 'POST' && u.pathname === '/api/json') { const id = 'id' + (++n).toString(36).padStart(6, '0'), editKey = `edit-${n}-secret`; docs.set(id, { body: init.body, editKey }); return json({ id, editKey, size: init.body.length }, 201); }
    const id = u.pathname.split('/').pop(), d = docs.get(id);
    if (!d) return json({ error: 'not found' }, 404);
    if (m === 'GET') return new Response(d.body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (init.headers?.['X-Edit-Key'] !== d.editKey) return json({ error: 'forbidden' }, 403);
    if (m === 'PATCH') { d.body = init.body; return json({ id }); }
    if (m === 'DELETE') { docs.delete(id); return json({ message: 'deleted', id }); }
    return json({}, 405);
  };
  return { fetchFn, docs, log };
}
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const save = (t, extra = {}) => ({ schema: 4, savedAt: t, state: { player: { level: 7, coins: 123 }, playtime: 999, big: 'x'.repeat(5000), ...extra }, home: { items: [{ i: 1, id: 'banana_01' }], obstacles: [] } });

test('seal/unseal round-trips, hides the content, and rejects a wrong key or tampering', async () => {
  const k = newKey(), doc = save(1, { secret: 'Ñandú 🏝️ banana' });
  const blob = await seal(doc, k);
  assert.deepEqual(Object.keys(blob).sort(), ['at', 'data', 'iv', 'v']);
  assert.ok(!JSON.stringify(blob).includes('banana'));
  assert.deepEqual(await unseal(blob, k), doc);
  await assert.rejects(unseal(blob, newKey()));
  await assert.rejects(unseal({ ...blob, data: blob.data.slice(0, -8) + 'AAAAAAAA' }, k));
  await assert.rejects(unseal({ v: 2 }, k));
});

test('first sync creates the cloud copy; later syncs update the same one', async () => {
  const srv = fakeServer(), c = new Cloud({ fetchFn: srv.fetchFn, storage: mem() });
  assert.equal(c.linked, false);
  assert.deepEqual(await c.push(save(100)), { ok: true, created: true });
  assert.ok(c.linked); assert.match(c.code, /^TM1~id\w+~edit-1-secret~[A-Za-z0-9+/=]{44}$/);
  assert.deepEqual(await c.push(save(200)), { ok: true, created: false });
  assert.equal(srv.docs.size, 1);
  const stored = JSON.parse([...srv.docs.values()][0].body);
  assert.equal(stored.at, 200);
  assert.ok(srv.log.filter(l => l.startsWith('GET')).every(l => l.endsWith('no-store')), 'reads must bypass caches');
});

test('restore on a second device, then both devices keep syncing without false conflicts', async () => {
  const srv = fakeServer(), a = new Cloud({ fetchFn: srv.fetchFn, storage: mem() }), b = new Cloud({ fetchFn: srv.fetchFn, storage: mem() });
  await a.push(save(100));
  const r = await b.pull(a.code);
  assert.equal(r.doc.state.player.level, 7); assert.equal(r.remote.playtime, 999);
  assert.equal(b.linked, false, 'nothing is linked until the restore is adopted');
  b.adopt(r.link, r.doc);
  assert.equal(b.code, a.code);
  assert.equal((await b.push(save(300))).ok, true);          // b is up to date, so no conflict
  const conflict = await a.push(save(400));                  // a has not seen b's change
  assert.equal(conflict.reason, 'conflict'); assert.equal(conflict.remote.savedAt, 300); assert.equal(conflict.local.savedAt, 400);
  assert.equal((await a.push(save(400), { force: true })).ok, true);
  assert.equal((await b.push(save(500))).reason, 'conflict');
});

test('errors are classified: offline, rate limit, bad code, wrong key, expired copy', async () => {
  const srv = fakeServer(), c = new Cloud({ fetchFn: srv.fetchFn, storage: mem() });
  srv.fetchFn.down = true;
  await assert.rejects(c.push(save(1)), e => e instanceof CloudError && e.reason === 'network');
  srv.fetchFn.down = false; srv.fetchFn.limited = true;
  await assert.rejects(c.push(save(1)), e => e.reason === 'rate');
  srv.fetchFn.limited = false;
  await assert.rejects(c.pull('nonsense'), e => e.reason === 'badcode');
  await c.push(save(10));
  const parts = c.code.split('~');
  await assert.rejects(c.pull(`TM1~${parts[1]}~${parts[2]}~${newKey()}`), e => e.reason === 'badcode');   // right document, wrong key
  await assert.rejects(c.pull(`TM1~nosuchid~${parts[2]}~${parts[3]}`), e => e.reason === 'missing');
  srv.docs.clear();                                                                                        // service deleted it
  assert.deepEqual(await c.push(save(20)), { ok: true, created: true });                                   // quietly starts a new one
  assert.notEqual(c.code.split('~')[1], parts[1]);
});

test('delete removes the cloud copy and forgets the link; the link survives a page reload', async () => {
  const srv = fakeServer(), store = mem(), c = new Cloud({ fetchFn: srv.fetchFn, storage: store });
  await c.push(save(1));
  const reloaded = new Cloud({ fetchFn: srv.fetchFn, storage: store });
  assert.equal(reloaded.code, c.code);
  await reloaded.remove();
  assert.equal(srv.docs.size, 0); assert.equal(reloaded.linked, false);
  assert.equal(new Cloud({ fetchFn: srv.fetchFn, storage: store }).linked, false);
});
