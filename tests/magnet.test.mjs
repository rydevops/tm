import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, blankBoard } from './helpers.mjs';

function arena(w = 10, h = 8) {
  const { g, data, clock } = newGame();
  const b = blankBoard(w, h);
  g.ctx = { id: 'test', kind: 'test', board: b, tray: [null, null, null], overflow: [], anchor: 0 };
  g.s.player.coins = 1000;
  return { g, b, data, clock };
}
const put = (b, id, x, y, extra = {}) => { b.items[b.idx(x, y)] = { id, s: 0, ...extra }; };
const count = (b, id) => b.items.filter(i => i && i.id === id).length;
const spentBy = (g, fn) => { let n = 0; const off = g.on(e => { if (e.type === 'currency' && e.kind === 'coins' && e.delta < 0) n -= e.delta; }); fn(); off(); return n; };
const topOf = (data, id) => { while (!data.isMax(id)) id = data.nextId(id); return id; };

test('magnet pulls in every matching item on the board, however scattered, and gives n-2 of the next level', () => {
  const { g, b } = arena();
  const spots = [[0, 0], [9, 0], [4, 4], [0, 7], [9, 7], [5, 1], [2, 6]];
  spots.forEach(([x, y]) => put(b, 'banana_01', x, y));
  put(b, 'banana_01', 7, 3, { s: 0 });
  put(b, 'coconut_01', 3, 3);                                    // a different item is left alone
  const r = g.useMagnet(b.idx(4, 4));
  assert.ok(r.ok && r.merged && r.magnet);
  assert.equal(r.size, 8);
  assert.equal(count(b, 'banana_01'), 0);
  assert.equal(count(b, 'banana_02'), 6);
  assert.equal(count(b, 'coconut_01'), 1);
});

test('magnet costs 100 coins, then recharges for 2 minutes (nothing is charged for a refused use)', () => {
  const { g, b, clock } = arena();
  for (const [x, y] of [[0, 0], [5, 5], [9, 7]]) put(b, 'banana_01', x, y);
  for (const [x, y] of [[1, 0], [6, 5], [8, 7]]) put(b, 'coconut_01', x, y);
  let r;
  assert.equal(spentBy(g, () => { r = g.useMagnet(b.idx(0, 0)); }), 100);
  assert.ok(r.ok);
  assert.equal(g.magnetInfo().ready, false);
  assert.equal(g.magnetInfo().wait, 120);
  assert.equal(spentBy(g, () => { assert.equal(g.useMagnet(b.idx(1, 0)).reason, 'cooldown'); }), 0);
  clock.advance(119_000);
  assert.equal(g.useMagnet(b.idx(1, 0)).reason, 'cooldown');
  clock.advance(1_500);
  assert.ok(g.magnetInfo().ready);
  assert.equal(spentBy(g, () => { assert.ok(g.useMagnet(b.idx(1, 0)).ok); }), 100);
  assert.equal(g.s.stats.magnets, 2);
});

test('magnet refuses (and charges nothing) with fewer than 3, max level, frozen items, no item, or too few coins', () => {
  const { g, b, data } = arena();
  const top = topOf(data, 'banana_01');
  put(b, 'banana_01', 0, 0); put(b, 'banana_01', 1, 0);
  for (const x of [0, 1, 2]) put(b, top, x, 5);
  for (const x of [3, 4, 5]) put(b, 'coconut_01', x, 2, { f: 1 });
  for (const x of [3, 4, 5]) put(b, 'mango_01', x, 7);
  assert.equal(g.useMagnet(b.idx(0, 0)).reason, 'tooFew');
  assert.equal(g.useMagnet(b.idx(0, 5)).reason, 'maxLevel');
  assert.equal(g.useMagnet(b.idx(3, 2)).reason, 'frozen');
  assert.equal(g.useMagnet(b.idx(9, 9 - 2)).reason, 'empty');
  g.s.player.coins = 99;
  assert.equal(g.useMagnet(b.idx(3, 7)).reason, 'noCoins');
  assert.equal(g.s.player.coins, 99);
  assert.ok(g.magnetInfo().ready, 'a refused use must not start the cooldown');
  g.s.player.coins = 100;
  assert.equal(spentBy(g, () => { assert.ok(g.useMagnet(b.idx(3, 7)).ok); }), 100);
});

test('frozen copies and items in the tray are not pulled in', () => {
  const { g, b } = arena();
  for (const x of [0, 1, 2]) put(b, 'banana_01', x, 0);
  put(b, 'banana_01', 5, 5, { f: 1 });
  g.ctx.tray[0] = { id: 'banana_01', s: 0 };
  const r = g.useMagnet(b.idx(0, 0));
  assert.equal(r.size, 3);
  assert.equal(count(b, 'banana_01'), 1);          // the frozen one
  assert.equal(g.ctx.tray[0].id, 'banana_01');
});

test('on a completely full board every result still fits (the pulled-in cells are freed first)', () => {
  const { g, b } = arena(4, 4);
  const filler = ['lumber_02', 'stone_02', 'fiber_02', 'hardware_02'];
  for (let i = 0; i < b.n; i++) put(b, filler[((i % 4) + ((i / 4) | 0)) % 4], i % 4, (i / 4) | 0);
  const cells = [[0, 0], [3, 0], [1, 2], [2, 3], [3, 3], [0, 3]];
  cells.forEach(([x, y]) => put(b, 'banana_01', x, y));
  const r = g.useMagnet(b.idx(1, 2));
  assert.ok(r.ok);
  assert.equal(count(b, 'banana_02'), 4);
  assert.equal(g.ctx.tray.filter(Boolean).length, 0);
  assert.equal(g.ctx.overflow.length, 0);
});

test('the results of a multi-item pull are not merged again straight away', () => {
  const { g, b } = arena();
  for (let k = 0; k < 6; k++) put(b, 'banana_01', k, 0);
  g.useMagnet(b.idx(2, 0));
  g.settle();
  assert.equal(count(b, 'banana_02'), 4);
  assert.equal(count(b, 'banana_03'), 0);
});

test('magnetTargets lists exactly the usable groups', () => {
  const { g, b, data } = arena();
  for (const x of [0, 1, 2]) put(b, 'banana_01', x, 0);
  for (const x of [0, 1]) put(b, 'coconut_01', x, 2);
  const top = topOf(data, 'mango_01');
  for (const x of [0, 1, 2]) put(b, top, x, 4);
  assert.deepEqual(g.magnetTargets().sort((a, c) => a - c), [b.idx(0, 0), b.idx(1, 0), b.idx(2, 0)]);
});

test('the cooldown timestamp moves with the other timers when the clock jumps', () => {
  const { g, b } = arena();
  for (const x of [0, 1, 2]) put(b, 'banana_01', x, 0);
  g.useMagnet(b.idx(0, 0));
  const at = g.s.magnetAt;
  g.shiftTimes(-5000);
  assert.equal(g.s.magnetAt, at - 5000);
});
