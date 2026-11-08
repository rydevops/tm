import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { Game } from '../js/core/index.js';
import { buildCloudFile, readCloudFile, summarizeFull } from '../js/core/puter-cloud.js';

/** A game with items everywhere an item can be: the island, the tray, overflow, and an expedition island with its own tray and obstacles. */
function busyGame() {
  const { g, data, clock } = newGame({ seed: 21 });
  const b = g.home.board, free = b.freeCellsInOrder();
  b.items[free[0]] = { id: 'banana_03', s: 1 }; b.items[free[1]] = { id: 'lumber_02', s: 0, f: 1 }; b.items[free[2]] = { id: 'pet_01', s: 0, sp: 'pip' };
  b.items[free[3]] = { id: 'banana_02', s: 0 }; b.items[free[4]] = { id: 'banana_02', s: 0 };
  g.s.storage[0] = { id: 'stone_01', s: 1 }; g.s.storage[2] = { id: 'fiber_01', s: 0 }; g.s.overflow.push({ id: 'coconut_01', s: 0 });
  g.s.player.level = 30; g.s.player.tickets = 5;
  g.enterIsland('isl_frostfin', []);
  const ib = g.ctx.board, ifree = ib.freeCellsInOrder();
  ib.items[ifree[0]] = { id: 'penguin_02', s: 0 }; ib.items[ifree[1]] = { id: 'drinks_01', s: 1, f: 1 }; ib.items[ifree[2]] = { id: 'pet_01', s: 0, sp: 'coco' };
  g.ctx.tray[0] = { id: 'penguin_01', s: 0 }; g.ctx.overflow.push({ id: 'penguin_01', s: 0 });
  const ob = [...ib.obst].find(Boolean); ob.hidden = 'penguin_01';
  g.leaveIsland();
  return { g, data, clock };
}

test('every item the player holds survives save, the cloud file and restore, exactly', () => {
  const { g, data, clock } = busyGame();
  const doc = g.serialize();
  const restored = Game.fromSave(data, readCloudFile(buildCloudFile(doc, 1)), { now: clock.now });
  const again = restored.serialize();
  assert.deepEqual(again.home, doc.home, 'the island: every item with its place, shimmer, frozen and pet marks, and every obstacle');
  assert.deepEqual(again.state.storage, doc.state.storage); assert.deepEqual(again.state.overflow, doc.state.overflow);
  assert.deepEqual(again.islandBoards, doc.islandBoards, 'expedition islands: items, tray, overflow and obstacles with their hidden prizes');
  assert.equal(JSON.stringify(again.state), JSON.stringify(doc.state));
  const ob = again.islandBoards.isl_frostfin.obstacles.find(o => o.hidden); assert.equal(ob.hidden, 'penguin_01', 'a prize hiding under an island obstacle is kept');
  assert.equal(again.islandBoards.isl_frostfin.items.find(i => i.id === 'pet_01').sp, 'coco', 'and so is a pet mark on an island item');
});

test('the save summary counts every item, by name, wherever it is', () => {
  const { g } = busyGame();
  const inv = summarizeFull(g.serialize()).inventory;
  assert.equal(inv.onBoard.banana_02, 2); assert.equal(inv.onBoard.banana_03, 1); assert.equal(inv.onBoard.lumber_02, 1); assert.equal(inv.onBoard.gen_seed_01, 1, 'the Seed Pouch is an item too');
  assert.deepEqual(inv.inStorage, { fiber_01: 1, stone_01: 1 }); assert.equal(inv.overflow, 1);
  const ib = inv.islands.isl_frostfin.onBoard;
  assert.equal(ib.drinks_01, 1); assert.equal(ib.pet_01, 1); assert.ok(ib.penguin_02 >= 1, 'the expedition island is counted too');
  assert.deepEqual(inv.islands.isl_frostfin.inStorage, { penguin_01: 1 }); assert.equal(inv.islands.isl_frostfin.overflow, 1);
  const total = Object.values(inv.onBoard).reduce((s, n) => s + n, 0);
  assert.equal(total, g.home.board.items.filter(Boolean).length, 'the count matches the board');
});
