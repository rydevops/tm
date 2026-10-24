import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { Game, SCHEMA } from '../js/core/index.js';
import { remapValue, makeRefit } from '../js/core/refit.js';

const ID = /^([a-z]+(?:_[a-z]+)*)_(\d{2})$/;
/** Every string anywhere in `v` that looks like an item id of a known chain but is not an item. */
function strayIds(v, data, out = []) {
  if (typeof v === 'string') { const m = ID.exec(v); if (m && data.chainByKey[m[1]] && !data.itemById[v]) out.push(v); }
  else if (Array.isArray(v)) v.forEach(x => strayIds(x, data, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { strayIds(k, data, out); strayIds(x, data, out); }
  return out;
}
const oldSave = (g, mutate) => { const doc = JSON.parse(JSON.stringify(g.serialize())); doc.schema = 4; doc.state.schema = 4; mutate(doc); return doc; };

test('the old-to-new level maps cover every old level and stay inside the new ladders', () => {
  const { data } = newGame();
  const r = data.refit;
  assert.ok(Object.keys(r.chains).length >= 20);
  for (const [chain, f] of Object.entries(r.chains)) {
    assert.equal(f.legacy.length, f.oldNames.length, chain);
    assert.equal(f.levels, data.chain(chain).levels, chain);
    for (const L of f.legacy) assert.ok(L >= 1 && L <= f.levels, `${chain}: level ${L}`);
    assert.equal(Math.max(...f.legacy), f.levels, `${chain}: the top old level must reach the top new level`);
  }
  assert.equal(data.legacyId('chicken_08'), 'chicken_04');
  assert.equal(data.legacyId('gen_seed_02'), 'gen_seed_02');
  assert.equal(data.legacyId('chest_03'), 'chest_03');
  assert.equal(data.legacyLevel('lantern', 3), 2);
});

test('a save from before the new art is moved onto the new ladders: board, tray, overflow, shop, journal, site fill and quests', () => {
  const { g, data, clock } = newGame();
  const b = g.home.board, free = b.freeCellsInOrder();
  const doc = oldSave(g, d => {
    d.home.items.push({ i: free[0], id: 'chicken_08' }, { i: free[1], id: 'lumber_09' }, { i: free[2], id: 'fiber_07' }, { i: free[3], id: 'meals_09' });
    d.state.storage[0] = { id: 'hardware_05', s: 0 };
    d.state.overflow.push({ id: 'sea_09', s: 0 });
    d.state.journal.discovered = { chicken_01: 1, chicken_02: 1, chicken_07: 1, banana_01: 1 };
    d.state.siteFill = { bld_welcome_dock: { lumber_03: 1, fiber_02: 1, fiber_01: 1 } };
    d.state.shopDeals = { date: 'x', items: [{ id: 'dairy_06', price: 5, bought: false }] };
    d.state.requests = { date: 'x', list: [{ id: 'r_beni', res: 'beni', item: 'sea_06', count: 2, have: 3, done: false, reward: { type: 'coins', amount: 40 } }] };
    d.state.daily.tasks = [{ id: 'd_create_sweets_04', text: 'Create 1 Cupcake', obj: { type: 'create_item', item: 'sweets_04', count: 1 }, progress: 0, done: false }];
  });
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  const at = id => g2.home.board.items.filter(Boolean).filter(i => i.id === id).length;
  assert.equal(at('chicken_04'), 1, 'Golden Hen is the top hen now');
  assert.equal(at('lumber_09'), 1);
  assert.equal(at('fiber_04'), 1, 'old Hammock is the top fibre');
  assert.equal(at('meals_04'), 1, 'old Luau Banquet is the top meal');
  assert.equal(g2.s.storage[0].id, 'hardware_07', 'the old Lock is the new Padlock');
  assert.equal(g2.s.overflow[0].id, 'sea_08');
  assert.deepEqual(Object.keys(g2.s.journal.discovered).sort(), ['banana_01', 'chicken_01', 'chicken_04']);
  assert.equal(g2.s.stats.discovered, 3);
  assert.deepEqual(g2.s.siteFill.bld_welcome_dock, { lumber_03: 1, fiber_01: 2 }, 'old ids that share a new level add up');
  assert.equal(g2.s.shopDeals.items[0].id, 'dairy_03');
  assert.equal(g2.s.requests.list[0].item, 'sea_05');
  assert.notEqual(g2.s.daily.tasks[0].obj.item, 'sweets_04', 'a daily task for a moved item is rolled again');
  assert.deepEqual(strayIds(g2.serialize(), data), []);
  assert.equal(g2.s.schema, SCHEMA);
  assert.equal(g2.s.flags.refitNotice.migrated, true);
});

test('the item check removes items that no longer exist, pays coins for them and says so once', () => {
  const { g, data, clock } = newGame();
  const b = g.home.board, free = b.freeCellsInOrder();
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  doc.home.items.push({ i: free[0], id: 'herbs_08' }, { i: free[1], id: 'ghostfruit_03' });            // a level above the top, and a chain that is gone
  doc.state.journal.discovered.herbs_08 = 1;
  doc.state.living.push({ item: 'chicken_08', slot: 'hen', readyAt: 0, stored: 0 });
  doc.state.quests.progress.act1_q99 = [1];
  const coins = doc.state.player.coins;
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  assert.equal(g2.home.board.items.filter(Boolean).filter(i => i.id === 'herbs_08' || i.id === 'ghostfruit_03').length, 0);
  assert.equal(g2.s.journal.discovered.herbs_08, undefined);
  assert.equal(g2.s.living.length, 0);
  assert.equal(g2.s.quests.progress.act1_q99, undefined);
  assert.ok(g2.s.player.coins > coins, 'coins are paid for what was removed');
  assert.ok(g2.s.flags.refitNotice.removed >= 3);
  assert.equal(g2.s.flags.refitNotice.migrated, false);
  assert.deepEqual(strayIds(g2.serialize(), data), []);
  // a clean save changes nothing and says nothing
  const clean = Game.fromSave(data, JSON.parse(JSON.stringify(g.serialize())), { now: clock.now });
  assert.equal(clean.s.flags.refitNotice, undefined);
});

test('story quest progress is kept and clamped to the current objectives', () => {
  const { g, data, clock } = newGame();
  const doc = oldSave(g, d => { const id = d.state.quests.active[0]; d.state.quests.progress[id] = [9, 9, 9]; });
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  for (const id of g2.s.quests.active) {
    const q = data.questById[id];
    assert.equal(g2.s.quests.progress[id].length, q.objectives.length);
    q.objectives.forEach((o, i) => assert.ok(g2.s.quests.progress[id][i] <= g2.objTarget(o)));
  }
});

test('remapping merges counts when two old levels share a new level and leaves other chains alone', () => {
  const r = makeRefit({ chains: { fiber: { levels: 4, legacy: [1, 1, 2, 2, 3, 3, 4, 4] } } });
  assert.deepEqual(remapValue({ fiber_01: 2, fiber_02: 3, lumber_05: 1, list: ['fiber_08', 'gen_seed_01'] }, r), { fiber_01: 5, lumber_05: 1, list: ['fiber_04', 'gen_seed_01'] });
  assert.deepEqual(remapValue({ chain: 'fiber', minLevel: 5 }, r), { chain: 'fiber', minLevel: 3 });
});

test('the shipped data only names items that exist, and every quest and island goal can be reached', () => {
  const { data } = newGame();
  const bad = [];
  for (const q of data.quests) for (const o of q.objectives) {
    if (o.item && !data.itemById[o.item]) bad.push(`${q.id}: ${o.item}`);
    if (o.item && data.itemById[o.item] && !data.chain(data.itemById[o.item].chain).source.length) bad.push(`${q.id}: ${o.item} has no source`);
  }
  for (const i of data.islands) for (const gl of i.goals) if (gl.item && !data.itemById[gl.item]) bad.push(`${i.id}.${gl.id}: ${gl.item}`);
  assert.deepEqual(bad, []);
  assert.deepEqual(strayIds([data.raw.generators, data.raw.obstacles, data.raw.buildings, data.raw.chests, data.raw.economy, data.raw.pets, data.raw.events], data), []);
  // the top of every chain a quest names is really reachable by merging: its previous level exists
  for (const it of data.items) if (it.level > 1) assert.ok(data.itemById[`${it.chain}_${String(it.level - 1).padStart(2, '0')}`], it.id);
});

test('no quest, goal, hint or achievement text still names an item that was retired', () => {
  const { data } = newGame();
  const current = new Set(data.items.map(i => data.name(i.id)));
  const retired = [...new Set(Object.values(data.refit.chains).flatMap(c => c.oldNames))].filter(n => n.includes(' ') && !current.has(n));
  const texts = [...data.quests.map(q => [q.id, data.t(q.textKey)]), ...data.achievements.map(a => [a.id, a.text]), ...data.obstacles.filter(o => o.hint).map(o => [o.id, o.hint]),
    ...data.islands.flatMap(i => [[i.id, i.story], ...i.goals.map(g => [`${i.id}.${g.id}`, g.text])])];
  const bad = texts.flatMap(([id, t]) => retired.filter(n => t.includes(n)).map(n => `${id}: "${n}"`));
  assert.deepEqual(bad, []);
  // the first quests read right with the new names
  assert.match(data.t(data.questById.act1_q01.textKey), /Baby Bananas into a Banana Bud/);
  assert.equal(data.name(data.questById.act1_q01.objectives[0].item), 'Banana Bud');
});
