import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { DevTweaks, checkPassword } from '../js/core/devtools.js';

const mem = () => { const m = new Map(); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('the password is DEV in any case, and nothing else', () => {
  for (const ok of ['DEV', 'dev', 'Dev', 'dEv', ' dev ']) assert.ok(checkPassword(ok), ok);
  for (const bad of ['', 'de', 'devs', 'admin', null, undefined]) assert.ok(!checkPassword(bad), String(bad));
});

test('changing a value changes the live game data and persists; reset puts the shipped value back', () => {
  const { data } = newGame(), st = mem();
  const dev = new DevTweaks(data, st);
  assert.equal(data.economy.magnet.cost, 100);
  dev.set('eco:magnet.cost', '250');
  assert.equal(data.economy.magnet.cost, 250);
  assert.ok(dev.changed('eco:magnet.cost'));
  // a fresh start reads the saved overrides
  const { data: d2 } = newGame();
  new DevTweaks(d2, st).applySaved();
  assert.equal(d2.economy.magnet.cost, 250);
  dev.reset('eco:magnet.cost');
  assert.equal(data.economy.magnet.cost, 100);
  assert.equal(st.m.size, 0);
});

test('the magnet really uses the tuned cost and cooldown', () => {
  const { g, data } = newGame();
  const dev = new DevTweaks(data, mem());
  dev.set('eco:magnet.cost', 40); dev.set('eco:magnet.cooldownSec', 15);
  const info = g.magnetInfo();
  assert.equal(info.cost, 40); assert.equal(info.cooldownSec, 15);
});

test('balloon timing, item prices, shop prices, zone and building costs are all tunable', () => {
  const { g, data } = newGame(), dev = new DevTweaks(data, mem());
  dev.set('eco:drops.minSec', 5); dev.set('eco:drops.maxSec', 6);
  g.s.drops = { nextAt: 0, seq: 0, list: [] };
  const w = g.dropDelay(); assert.ok(w >= 5000 / 2 && w <= 6000 + 1, String(w));
  const id = data.items.find(i => i.sellValue > 0 && data.chain(i.chain).sellable).id;
  dev.set('sell:' + id, 77); assert.equal(data.sellValue(id), 77);
  assert.equal(data.shopPrice(id), 77 * data.economy.shop.priceMult);
  dev.set('shop:' + id, 5); assert.equal(data.shopPrice(id), 5);
  dev.reset('shop:' + id); assert.equal(data.shopPrice(id), 77 * data.economy.shop.priceMult);
  dev.set('zone:2:coins', 10); assert.equal(data.zoneByN[2].unlock.coins, 10);
  const b = data.buildings[0]; dev.set('bld:' + b.id, 3); assert.equal(b.coins, 3);
});

test('existing shop deals follow price changes', () => {
  const { g, data } = newGame(), dev = new DevTweaks(data, mem());
  const deals = g.shopDeals(); const id = deals[0].id;
  dev.set('shop:' + id, 9);
  assert.equal(g.shopDeals().find(x => x.id === id).price, 9);
  dev.resetAll();
  assert.equal(g.shopDeals().find(x => x.id === id).price, data.sellValue(id) * data.economy.shop.priceMult);
});

test('bad input is rejected and counts are kept whole', () => {
  const { data } = newGame(), dev = new DevTweaks(data, mem());
  for (const bad of ['abc', '-5', '', NaN, Infinity]) dev.set('eco:magnet.cost', bad);
  assert.equal(data.economy.magnet.cost, 100);
  assert.equal(dev.set('eco:magnet.cost', '99.6'), 100);   // cost is a whole number of coins
  dev.set('eco:shimmer.chance', '0.123'); assert.equal(data.economy.shimmer.chance, 0.123);
  assert.equal(dev.set('eco:nope.nothing', 5), undefined);
});

test('resetAll restores every number, and setting the shipped value counts as no change', () => {
  const { data } = newGame(), dev = new DevTweaks(data, mem());
  dev.set('eco:energy.max', 500); dev.set('eco:drops.minCount', 4);
  dev.set('eco:magnet.cost', 100);
  assert.equal(dev.count(), 2);
  dev.resetAll();
  assert.equal(dev.count(), 0);
  assert.equal(data.economy.energy.max, 100); assert.equal(data.economy.drops.minCount, 1);
});

test('the panel lists the main groups and skips values that would break the game', () => {
  const { data } = newGame(), dev = new DevTweaks(data, mem());
  const groups = dev.ecoGroups().map(g => g.group);
  for (const g of ['magnet', 'drops', 'energy', 'shop', 'storage']) assert.ok(groups.includes(g), g);
  assert.ok(!groups.includes('grid') && !groups.includes('zone') && !groups.includes('save'));
  const paths = dev.ecoGroups().flatMap(g => g.fields.map(f => f.path));
  assert.ok(!paths.some(p => /^eco:sell\.(base|growth|table)/.test(p)));
  assert.ok(dev.itemRows().length > 50);
});

test('testing switches are off by default, persist on this device, and ignore unknown names', () => {
  const { data } = newGame(), st = mem();
  const dev = new DevTweaks(data, st);
  assert.equal(dev.flag('completeQuests'), false);
  assert.equal(dev.setFlag('nonsense', true), false);
  dev.setFlag('completeQuests', true);
  assert.equal(new DevTweaks(newGame().data, st).flag('completeQuests'), true);
  dev.setFlag('completeQuests', false);
  assert.equal(new DevTweaks(newGame().data, st).flag('completeQuests'), false);
  assert.equal(st.m.size, 0);
});

test('a story quest can be completed without the items and pays its rewards', () => {
  const { g } = newGame();
  const q = g.activeQuests()[0];
  const coins = g.s.player.coins;
  assert.ok(!g.questComplete(q));
  const r = g.devCompleteQuest(q.id);
  assert.ok(r.ok);
  assert.ok(g.s.quests.done.includes(q.id));
  assert.ok(!g.s.quests.active.includes(q.id));
  assert.ok(g.s.player.coins >= coins);
  assert.equal(g.devCompleteQuest(q.id).reason, 'notActive');
});

test('completing every story quest with the dev button walks the whole island story to the end', () => {
  const { g, data } = newGame();
  let guard = 0;
  while (g.s.quests.active.length && guard++ < 1000) assert.ok(g.devCompleteQuest(g.s.quests.active[0]).ok, g.s.quests.active[0]);
  assert.equal(g.s.quests.done.length, data.quests.length);
  // state objectives were made true for real: buildings stand, zones are open, the gate is open
  for (const q of data.quests) for (const o of q.objectives) {
    if (o.type === 'build') assert.ok(g.s.built[o.building], o.building);
    if (o.type === 'unlock_zone') assert.ok(g.s.zones.unlocked.includes(o.zone), 'zone ' + o.zone);
    if (o.type === 'island_complete') assert.equal(g.s.islands[o.island].state, 'done');
  }
  assert.ok(g.s.flags.sunGateOpen);
});
