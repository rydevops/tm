import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, blankBoard } from './helpers.mjs';

function arena() {
  const { g, data } = newGame();
  const b = blankBoard(8, 8);
  g.ctx = { id: 'test', kind: 'test', board: b, tray: [null, null, null], overflow: [], anchor: 0 };
  g.s.player.coins = 0;
  return { g, b, data };
}
const put = (b, id, x, y, extra = {}) => { b.items[b.idx(x, y)] = { id, s: 0, ...extra }; };
const count = (b, id) => b.items.filter(i => i && i.id === id).length;

test('sellList groups sellable items on the board and in the tray, skipping frozen ones and non-sellables', () => {
  const { g, b, data } = arena();
  put(b, 'banana_01', 0, 0); put(b, 'banana_01', 1, 0); put(b, 'banana_01', 2, 0, { f: 1 }); put(b, 'banana_02', 3, 0, { s: 1 });
  g.ctx.tray[1] = { id: 'banana_01', s: 0 };
  put(b, 'gen_seed_01', 5, 5);                                        // a generator is not for sale
  const list = g.sellList();
  const ban1 = list.find(x => x.id === 'banana_01');
  assert.equal(ban1.count, 3); assert.equal(ban1.value, data.sellValue('banana_01'));
  assert.equal(list.find(x => x.id === 'banana_02').shimmer, 1);
  assert.ok(!list.some(x => x.id === 'gen_seed_01'));
  // ordered by level within a chain
  assert.ok(list.findIndex(x => x.id === 'banana_01') < list.findIndex(x => x.id === 'banana_02'));
});

test('sellMany sells exactly the chosen amounts for the normal sell value, in one payment', () => {
  const { g, b, data } = arena();
  for (let x = 0; x < 5; x++) put(b, 'banana_01', x, 0);
  for (let x = 0; x < 2; x++) put(b, 'coconut_01', x, 2);
  let events = 0; g.on(e => { if (e.type === 'soldMany') events++; });
  const r = g.sellMany([{ id: 'banana_01', count: 3 }, { id: 'coconut_01', count: 2 }]);
  assert.ok(r.ok);
  assert.equal(r.count, 5);
  assert.equal(r.coins, 3 * data.sellValue('banana_01') + 2 * data.sellValue('coconut_01'));
  assert.equal(g.s.player.coins, r.coins);
  assert.equal(count(b, 'banana_01'), 2); assert.equal(count(b, 'coconut_01'), 0);
  assert.equal(events, 1);
  assert.equal(g.s.stats.sold, 5);
});

test('counts above what is owned are limited, zero and junk are ignored, nothing to sell is a refusal', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 0, 0); put(b, 'banana_01', 1, 0);
  const r = g.sellMany([{ id: 'banana_01', count: 99 }, { id: 'coconut_01', count: 4 }, { id: 'nope', count: 1 }, { id: 'banana_01', count: -2 }]);
  assert.equal(r.count, 2);
  assert.equal(g.sellMany([{ id: 'banana_01', count: 1 }]).reason, 'nothing');
  assert.equal(g.sellMany([]).reason, 'nothing');
  assert.equal(g.sellMany([{ id: 'banana_01', count: 'x' }]).reason, 'nothing');
});

test('shimmering and tray copies are sold last; frozen and generators are never sold', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 0, 0, { s: 1 }); put(b, 'banana_01', 1, 0); put(b, 'banana_01', 2, 0, { f: 1 });
  g.ctx.tray[0] = { id: 'banana_01', s: 0 };
  g.sellMany([{ id: 'banana_01', count: 1 }]);
  assert.ok(!b.items[b.idx(1, 0)], 'the plain board copy goes first');
  assert.ok(g.ctx.tray[0], 'the tray copy stays');
  g.sellMany([{ id: 'banana_01', count: 1 }]);
  assert.ok(!g.ctx.tray[0], 'then the plain tray copy');
  g.sellMany([{ id: 'banana_01', count: 5 }]);
  assert.ok(!b.items[b.idx(0, 0)], 'the shimmering one last');
  assert.ok(b.items[b.idx(2, 0)], 'the frozen one is never sold');
  put(b, 'gen_seed_01', 5, 5);
  assert.equal(g.sellMany([{ id: 'gen_seed_01', count: 1 }]).reason, 'nothing');
});
