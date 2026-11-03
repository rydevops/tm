import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { itemJourney, questActs, zoneNeeds } from '../js/core/howto.js';

test('amulets and pearls cost 1000 coins each in the shop', () => {
  const { g, data } = newGame();
  assert.equal(data.economy.shop.buy.amulet, 1000); assert.equal(data.economy.shop.buy.pearls, 1000);
  g.s.player.coins = 7500;
  const a0 = g.s.player.amulets, p0 = g.s.player.pearls;
  assert.ok(g.buyCurrency('amulet').ok); assert.equal(g.s.player.amulets, a0 + 1); assert.equal(g.s.player.coins, 6500);
  assert.ok(g.buyCurrency('pearls', 5).ok); assert.equal(g.s.player.pearls, p0 + 5); assert.equal(g.s.player.coins, 1500);
  assert.equal(g.buyCurrency('pearls').ok, true); assert.equal(g.s.player.coins, 500);
  assert.equal(g.buyCurrency('amulet').reason, 'noCoins'); assert.equal(g.s.player.amulets, a0 + 1, 'nothing is given when the coins are short');
  assert.equal(g.buyCurrency('gold').reason, 'how'); assert.equal(g.buyCurrency('amulet', 0).reason, 'how'); assert.equal(g.buyCurrency('amulet', -3).reason, 'how');
});

test('a bought amulet counts towards opening a zone', () => {
  const { g } = newGame();
  g.s.player.level = 5; g.s.player.coins = 5000; g.s.flags.cleared = { 1: 999, 2: 999 }; g.s.zones.unlocked = [1, 2];
  assert.equal(g.unlockZone(3).reason, 'amulets');
  g.buyCurrency('amulet');
  assert.ok(g.unlockZone(3).ok);
});

test('the quest book lists every story quest in six acts, in order', () => {
  const { data } = newGame();
  const acts = questActs(data);
  assert.equal(acts.length, 6);
  assert.equal(acts.reduce((s, a) => s + a.quests.length, 0), data.quests.length);
  assert.equal(data.quests.length, 220);
  acts.forEach((a, i) => assert.ok(a.quests.every(q => q.act === i + 1)));
});

test('"how to get it" starts at the beginning of the game for the very first items', () => {
  const { data } = newGame();
  let J = itemJourney(data, 'banana_03');
  assert.equal(J.makers[0].gen.id, 'gen_seed'); assert.equal(J.makers[0].how.kind, 'start', 'the Seed Pouch is there from the start');
  assert.deepEqual(J.ladder.map(l => l.level), [1, 2, 3]); assert.equal(J.need.best, 5); assert.equal(J.need.plain, 9);
  J = itemJourney(data, 'banana_01'); assert.equal(J.need.best, 1); assert.equal(J.ladder.length, 1);
  J = itemJourney(data, 'clearing_tools_04'); assert.equal(J.makers[0].gen.id, 'gen_toolbox');
});

test('"how to get it" names the zone, the building and the materials on the way', () => {
  const { data } = newGame();
  const J = itemJourney(data, 'lumber_03');
  const m = J.makers[0];
  assert.equal(m.gen.id, 'gen_lumber'); assert.equal(m.how.kind, 'build'); assert.equal(m.how.building.id, 'bld_lumber_yard');
  assert.ok(m.how.building.items.length && m.how.building.items.every(i => data.itemById[i.id] && i.count > 0));
  assert.deepEqual(m.how.zone, zoneNeeds(data, 2)); assert.equal(m.how.zone.level, data.zoneByN[2].unlock.level);
  assert.ok(J.drops.some(o => o.id === 'driftwood'), 'driftwood piles drop wood before the yard exists');
  const A = itemJourney(data, 'amulet_03');
  assert.equal(A.makers[0].how.building.id, 'bld_spirit_shrine'); assert.equal(A.makers[0].how.zone.n, 8); assert.ok(A.makers[0].how.zone.amulets > 0);
  const P = itemJourney(data, 'penguin_04'); assert.equal(P.island.id, 'isl_frostfin');
  const G = itemJourney(data, 'gen_garden_01'); assert.equal(G.genSource.kind, 'gift'); assert.equal(G.genSource.zone.n, 3);
  assert.equal(itemJourney(data, 'gen_seed_01').genSource.kind, 'start');
  assert.equal(itemJourney(data, 'nope_01'), null);
});

test('every item in every quest can be traced back to a way of getting it', () => {
  const { data } = newGame();
  const ids = new Set();
  for (const q of data.quests) { for (const o of q.objectives) if (o.item) ids.add(o.item); for (const r of q.rewards) if (r.item) ids.add(r.item); }
  assert.ok(ids.size > 60);
  const lost = [];
  for (const id of ids) {
    const J = itemJourney(data, id);
    if (!J) { lost.push(id + ' unknown'); continue; }
    const way = J.makers.length || J.island || J.drops.length || J.chests.length || J.genSource || J.kind;
    if (!way) lost.push(id);
    assert.equal(J.ladder[J.ladder.length - 1].id, id, 'the ladder ends at the item');
    for (const m of J.makers) if (m.how.kind === 'build') for (const i of m.how.building.items) assert.ok(data.itemById[i.id], `${id}: material ${i.id} exists`);
  }
  assert.deepEqual(lost, []);
});
