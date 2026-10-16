import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, blankBoard } from './helpers.mjs';

function arena(w = 8, h = 8) {
  const { g, data, clock } = newGame();
  const b = blankBoard(w, h);
  g.ctx = { id: 'test', kind: 'test', board: b, tray: [null, null, null], overflow: [], anchor: 0 };
  return { g, b, data, clock };
}
const put = (b, id, x, y, extra = {}) => { b.items[b.idx(x, y)] = { id, s: 0, ...extra }; };
const at = (b, x, y) => b.items[b.idx(x, y)];
const count = (b, id) => b.items.filter(i => i && i.id === id).length;

test('3 connected same items -> 1 next-level item at the drop cell', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 1); put(b, 'banana_01', 5, 5);
  const r = g.drop({ type: 'board', idx: b.idx(5, 5) }, b.idx(3, 1));
  assert.ok(r.ok && r.merged);
  assert.equal(at(b, 3, 1).id, 'banana_02');
  assert.equal(count(b, 'banana_01'), 0);
  assert.equal(count(b, 'banana_02'), 1);
});

test('4 connected -> 1 next-level + 1 same-level bonus on the nearest free cell', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 1); put(b, 'banana_01', 1, 2); put(b, 'banana_01', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(2, 2));
  assert.equal(r.size, 4);
  assert.equal(at(b, 2, 2).id, 'banana_02');
  assert.equal(count(b, 'banana_01'), 1);
  assert.equal(count(b, 'banana_02'), 1);
});

test('5 connected -> 2 next-level items', () => {
  const { g, b } = arena();
  [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2]].forEach(([x, y]) => put(b, 'banana_01', x, y));
  put(b, 'banana_01', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 2));
  assert.equal(r.size, 5);
  assert.equal(count(b, 'banana_02'), 2);
  assert.equal(count(b, 'banana_01'), 1); // 6 placed, 5 consumed
});

test('7 connected -> exactly 5 consumed (closest first), 2 remain', () => {
  const { g, b } = arena(10, 4);
  for (let x = 0; x < 7; x++) put(b, 'coconut_01', x, 1);
  put(b, 'coconut_01', 9, 3);
  // drop in the middle of the row: the group already holds 7 items + the carried one = 8 connected
  const r = g.drop({ type: 'board', idx: b.idx(9, 3) }, b.idx(3, 2));
  assert.equal(r.size, 5);
  assert.equal(count(b, 'coconut_02'), 2);
  assert.equal(count(b, 'coconut_01'), 3);
  assert.equal(r.event.picked.length, 5);
});

test('pair only -> rejected, carried item returns to origin', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 5, 5);
  const r = g.drop({ type: 'board', idx: b.idx(5, 5) }, b.idx(1, 1));
  assert.equal(r.ok, false);
  assert.equal(at(b, 5, 5).id, 'banana_01');
  assert.equal(at(b, 1, 1).id, 'banana_01');
  assert.equal(count(b, 'banana_01'), 2);
});

test('pair on the board + carried item = merge (carried joins the group)', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 1); put(b, 'banana_01', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(1, 1));
  assert.ok(r.merged);
  assert.equal(at(b, 1, 1).id, 'banana_02');
  assert.equal(at(b, 6, 6), null);
});

test('diagonal-only adjacency counts as connected', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 2); put(b, 'banana_01', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 3));
  assert.ok(r.merged);
  assert.equal(at(b, 3, 3).id, 'banana_02');
});

test('max-level items never merge', () => {
  const { g, b } = arena();
  put(b, 'banana_10', 1, 1); put(b, 'banana_10', 2, 1); put(b, 'banana_10', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 1));
  assert.equal(r.ok, true);          // simply moved
  assert.equal(r.merged, undefined);
  assert.equal(count(b, 'banana_10'), 3);
  const r2 = g.drop({ type: 'board', idx: b.idx(3, 1) }, b.idx(2, 1));
  assert.equal(r2.reason, 'maxLevel');
});

test('bonus items fall back to the tray, then overflow bubbles, when the board has no room', () => {
  const { g, b } = arena(4, 4);
  // fill the board with unmergeable singletons
  const ids = ['banana_03', 'coconut_03', 'mango_03', 'papaya_03'];
  let k = 0;
  for (let i = 0; i < b.n; i++) put(b, `${['lumber', 'stone', 'fiber', 'hardware', 'herbs', 'hibiscus', 'chicken', 'cow'][(i * 3 + (i >> 2)) % 8]}_0${1 + (i % 4) + 1}`, i % 4, (i / 4) | 0);
  const free = b.freeCellsInOrder();
  assert.equal(free.length, 0);
  const r1 = g.placeItem({ id: 'banana_01', s: 0 }, 0, g.ctx);
  assert.equal(r1.where, 'tray');
  g.ctx.tray.fill({ id: 'x', s: 0 });
  const r2 = g.placeItem({ id: 'banana_01', s: 0 }, 0, g.ctx);
  assert.equal(r2.where, 'overflow');
  g.ctx.overflow.push({}, {});
  const r3 = g.placeItem({ id: 'banana_01', s: 0 }, 0, g.ctx);
  assert.equal(r3.where, 'sold');
});

test('5-merge on an otherwise full board places both results on the board (consumed cells free up)', () => {
  const { g, b } = arena(4, 4);
  for (let i = 0; i < b.n; i++) put(b, ['lumber_02', 'stone_02', 'fiber_02', 'hardware_02'][((i % 4) + ((i / 4) | 0)) % 4], i % 4, (i / 4) | 0);
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]].forEach(([x, y]) => put(b, 'banana_01', x, y));
  put(b, 'banana_01', 3, 3);
  b.items[b.idx(2, 1)] = null;          // the single free cell, adjacent to the group
  const r = g.drop({ type: 'board', idx: b.idx(3, 3) }, b.idx(2, 1));
  assert.equal(r.size, 5);
  assert.equal(count(b, 'banana_02'), 2);
  assert.equal(g.ctx.tray.filter(Boolean).length, 0);
});

test('a merge that creates a group of 3 cascades after the delay step', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 1); put(b, 'banana_01', 6, 6);
  put(b, 'banana_02', 4, 1); put(b, 'banana_02', 5, 1);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 1));
  assert.ok(r.merged);
  assert.equal(g.cascades.length >= 1, true);
  assert.equal(count(b, 'banana_02'), 3);           // not resolved yet
  assert.equal(g.stepCascade(), true);
  assert.equal(count(b, 'banana_03'), 1);
  assert.equal(count(b, 'banana_02'), 0);
});

test('cascades are capped at 5 steps per player action', () => {
  const { g, b } = arena(12, 4);
  // a staircase that keeps producing triples
  put(b, 'banana_01', 0, 0); put(b, 'banana_01', 1, 0); put(b, 'banana_01', 11, 3);
  for (let lvl = 2; lvl <= 8; lvl++) { put(b, `banana_0${lvl}`, 2 * (lvl - 1) + 1, 0 + 0); }
  g.drop({ type: 'board', idx: b.idx(11, 3) }, b.idx(2, 0));
  g.settle();
  assert.ok(g.cascadeDepth <= 5);
});

test('same chain, different level is not identical -> swap', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1); put(b, 'banana_02', 2, 2);
  const r = g.drop({ type: 'board', idx: b.idx(1, 1) }, b.idx(2, 2));
  assert.ok(r.swapped);
  assert.equal(at(b, 1, 1).id, 'banana_02');
  assert.equal(at(b, 2, 2).id, 'banana_01');
});

test('shimmer: bonus coins on merge; 3 shimmer items upgrade one extra level', () => {
  const { g, b } = arena();
  put(b, 'banana_01', 1, 1, { s: 1 }); put(b, 'banana_01', 2, 1, { s: 1 }); put(b, 'banana_01', 6, 6, { s: 1 });
  const coins = g.s.player.coins;
  g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 1));
  assert.equal(at(b, 3, 1).id, 'banana_03');
  assert.ok(g.s.player.coins >= coins + 30); // 10 x result level (3)
  const g2 = arena();
  put(g2.b, 'banana_01', 1, 1, { s: 1 }); put(g2.b, 'banana_01', 2, 1); put(g2.b, 'banana_01', 6, 6);
  const c2 = g2.g.s.player.coins;
  g2.g.drop({ type: 'board', idx: g2.b.idx(6, 6) }, g2.b.idx(3, 1));
  assert.equal(at(g2.b, 3, 1).id, 'banana_02');
  assert.ok(g2.g.s.player.coins >= c2 + 20);
});

test('confirm-before-merge asks for 3 and 4 item merges only', () => {
  const { g, b } = arena();
  g.s.settings.confirmMerge = true;
  put(b, 'banana_01', 1, 1); put(b, 'banana_01', 2, 1); put(b, 'banana_01', 6, 6);
  const r = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 1));
  assert.equal(r.confirm, 'merge');
  assert.equal(at(b, 6, 6).id, 'banana_01');
  const r2 = g.drop({ type: 'board', idx: b.idx(6, 6) }, b.idx(3, 1), { confirmed: true });
  assert.ok(r2.merged);
});
