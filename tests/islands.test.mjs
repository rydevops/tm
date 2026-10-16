import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { Game } from '../js/core/index.js';

function ready(level = 40) { const t = newGame(); t.g.s.player.level = level; t.g.s.player.tickets = 6; return t; }

test('entering an island costs a ticket once, needs the level, and builds its board', () => {
  const { g } = ready(10);
  assert.equal(g.enterIsland('isl_coral_atoll').reason, 'level');
  g.s.player.level = 12;
  const r = g.enterIsland('isl_coral_atoll');
  assert.ok(r.ok);
  assert.equal(g.s.player.tickets, 5);
  assert.equal(g.ctx.kind, 'island');
  assert.equal(g.ctx.board.w, 8); assert.equal(g.ctx.board.h, 10);
  assert.equal(g.ctx.structs.filter(s => s.kind === 'pool').length, 6);
  g.leaveIsland();
  g.enterIsland('isl_coral_atoll');
  assert.equal(g.s.player.tickets, 5); // free after the first time
});

test('island generator is free, has 6 charges and recharges every 5 minutes', () => {
  const { g, clock } = ready();
  g.enterIsland('isl_pirate_cove');
  const energy = g.s.player.energy;
  const gen = g.ctx.structs.find(s => s.kind === 'islandgen');
  const idx = g.ctx.board.idx(gen.x, gen.y);
  for (let i = 0; i < 6; i++) assert.ok(g.tap(idx).ok, 'tap ' + i);
  assert.equal(g.tap(idx).reason, 'noCharges');
  assert.ok(g.s.player.energy >= energy); // island taps never spend home energy
  clock.advance(5 * 60 * 1000 + 1000);
  assert.ok(g.tap(idx).ok);
});

test('supply crate carries up to 5 home items to the island', () => {
  const { g } = ready();
  const b = g.home.board;
  const cells = b.freeCellsInOrder().slice(0, 7);
  cells.forEach(c => { b.items[c] = { id: 'drinks_03', s: 0 }; });
  g.enterIsland('isl_frostfin', cells.map(c => ({ type: 'board', idx: c })));
  const onIsland = g.ctx.board.items.filter(i => i && i.id === 'drinks_03').length + g.ctx.tray.filter(i => i && i.id === 'drinks_03').length;
  assert.equal(onIsland, 5);
  g.leaveIsland();
  assert.equal(b.items.filter(i => i && i.id === 'drinks_03').length, 2);
});

test('tide pools: only Clownfish+ fills one; filling all six wakes the whale', () => {
  const { g } = ready();
  g.enterIsland('isl_coral_atoll');
  const b = g.ctx.board;
  const pools = g.ctx.structs.filter(s => s.kind === 'pool');
  const free = () => b.freeCellsInOrder()[0];
  let c = free(); b.items[c] = { id: 'sea_02', s: 0 };
  assert.equal(g.drop({ type: 'board', idx: c }, b.idx(pools[0].x, pools[0].y)).reason, 'needFish');
  let woke = false; g.on(e => { if (e.type === 'whaleAwake') woke = true; });
  for (const p of pools) { c = free(); b.items[c] = { id: 'sea_04', s: 0 }; assert.ok(g.drop({ type: 'board', idx: c }, b.idx(p.x, p.y)).ok); }
  assert.ok(woke);
});

test('cannon clears a 3x3 area of obstacles', () => {
  const { g } = ready();
  g.enterIsland('isl_pirate_cove');
  const b = g.ctx.board;
  const ob = b.obst.find(o => o);
  const target = b.idx(ob.x, ob.y);
  const before = b.obst.filter(Boolean).length;
  const c = b.freeCellsInOrder()[0];
  b.items[c] = { id: 'pirate_06', s: 0 };
  const r = g.drop({ type: 'board', idx: c }, target);
  assert.ok(r.cannon);
  assert.ok(b.obst.filter(Boolean).length < before);
});

test('frozen items cannot move and thaw with a level 3+ drink', () => {
  const { g } = ready();
  g.enterIsland('isl_frostfin');
  const b = g.ctx.board;
  const [a, c, d] = b.freeCellsInOrder();
  b.items[a] = { id: 'penguin_01', s: 0, f: 1 }; b.items[d] = { id: 'drinks_03', s: 0 };
  assert.equal(g.drop({ type: 'board', idx: a }, c).reason, 'frozen');
  const r = g.drop({ type: 'board', idx: d }, a);
  assert.ok(r.thawed === 1);
  assert.ok(!b.items[a].f);
});

test('darkness: a Paper Lantern lights a 3x3 area permanently', () => {
  const { g } = ready();
  g.enterIsland('isl_lantern');
  const b = g.ctx.board;
  const c = b.freeCellsInOrder().find(i => !g.ctx.lit[i]);
  const src = b.freeCellsInOrder().find(i => i !== c);
  b.items[src] = { id: 'lantern_03', s: 0 };
  const r = g.drop({ type: 'board', idx: src }, c);
  assert.ok(r.lit);
  assert.equal(g.ctx.lit[c], 1);
});

test('lava vents fill every 3 minutes, store 5 and are collected by tapping', () => {
  const { g, clock } = ready();
  g.enterIsland('isl_dragon_peak');
  const vent = g.ctx.structs.find(s => s.kind === 'vent');
  clock.advance(3 * 60 * 1000 * 6);
  g.tickIsland();
  assert.equal(g.ctx.vents[0].stored, 5);
  const r = g.tap(g.ctx.board.idx(vent.x, vent.y));
  assert.equal(r.n, 5);
});

test('island goals advance in order and completing all five awards the island amulet', () => {
  const { g } = ready();
  g.enterIsland('isl_dragon_peak');
  const st = g.s.islands.isl_dragon_peak;
  const b = g.ctx.board;
  // goal 1: clear 10 obstacles
  const obs = [...new Set(b.obst.filter(Boolean))].slice(0, 10);
  for (const o of obs) { o.hits = 0; g.finishObstacle(o, g.data.obstacleById[o.type], g.ctx); }
  assert.equal(st.goals[0], 10);
  // goal 2: create a Fire Crystal
  g.noteEvent({ type: 'create_item', id: 'ember_04' });
  g.noteEvent({ type: 'create_item', id: 'dragon_03' });
  g.noteEvent({ type: 'create_item', id: 'dragon_05' });
  assert.equal(g.currentGoalIndex(), 4);
  const c = b.freeCellsInOrder()[0]; b.items[c] = { id: 'ember_05', s: 0 };
  const guide = g.ctx.structs.find(s => s.kind === 'guide');
  g.drop({ type: 'board', idx: c }, b.idx(guide.x, guide.y));
  assert.equal(st.state, 'done');
  assert.ok(g.s.journal.islandAmulets.includes('isl_dragon_peak'));
});

test('island boards survive save and load', () => {
  const { g, data, clock } = ready();
  g.enterIsland('isl_coral_atoll');
  const idx = g.ctx.board.idx(...Object.values(g.ctx.structs.find(s => s.kind === 'islandgen')).slice(2, 4));
  g.tap(idx); g.tap(idx);
  g.leaveIsland();
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  g2.enterIsland('isl_coral_atoll');
  assert.deepEqual(g2.ctx.board.items.map(i => i && i.id), g.islandCtx.isl_coral_atoll.board.items.map(i => i && i.id));
  assert.equal(g2.ctx.charges, 4);
});
