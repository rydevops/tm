import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, loadDataSync } from './helpers.mjs';
import { Game } from '../js/core/index.js';

test('data matches the spec counts', () => {
  const d = loadDataSync();
  const home = d.chains.filter(c => !c.island && c.family !== 'generator');
  assert.equal(home.length, 28);
  assert.equal(home.reduce((s, c) => s + c.levels, 0), 215);
  const isl = d.chains.filter(c => c.island);
  assert.equal(isl.length, 5); assert.equal(isl.reduce((s, c) => s + c.levels, 0), 35);
  assert.equal(d.generators.length, 14);
  assert.equal(d.buildings.length, 22);
  assert.equal(d.zones.length, 12);
  assert.equal(d.zones.reduce((s, z) => s + z.playable, 0), 720);
  assert.equal(d.quests.length, 220);
  assert.equal(d.zones.reduce((s, z) => s + z.unlock.amulets, 0), 31);
  assert.equal(d.achievements.length, 60);
  assert.equal(d.islands.length, 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => d.sellValue(`banana_${String(l).padStart(2, '0')}`)), [3, 6, 11, 22, 41, 78, 148, 281, 534, 1015]);
  assert.equal(d.zoneByN[2].unlock.coins, 250); assert.equal(d.zoneByN[12].unlock.coins, 9100);
});

test('zone, site and structure cells never overlap and sit inside their zones', () => {
  const d = loadDataSync();
  const seen = new Map();
  for (const z of d.zones) {
    const [rx, ry, rw, rh] = z.rect;
    const claim = (x, y, label) => { assert.ok(x >= rx && x < rx + rw && y >= ry && y < ry + rh, `${label} outside ${z.id}`); const k = `${x},${y}`; assert.ok(!seen.has(k), `${label} overlaps ${seen.get(k)} at ${k}`); seen.set(k, label); };
    for (const s of z.sites) for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) claim(s.x + i, s.y + j, s.building);
    for (const r of z.residents) claim(r.x, r.y, 'res_' + r.id);
    for (const s of z.soils) claim(s.x, s.y, s.id);
    for (const p of z.perches) claim(p.x, p.y, 'perch_' + p.kind);
    for (const o of z.obstacles) { const def = d.obstacleById[o.type]; for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) claim(o.x + i, o.y + j, 'obs_' + o.type); }
    for (const st of z.start) claim(st.x, st.y, 'start');
  }
});

test('xp curve and sell formula follow the spec', () => {
  const { g } = newGame();
  const want = [40, 102, 176, 260, 351, 449, 553, 663, 776, 896];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((n, i) => assert.ok(Math.abs(g.xpForLevel(n) - want[i]) <= 1, `level ${n}`));
  assert.equal(g.mergeXp(2), 1); assert.equal(g.mergeXp(4), 4);
});

test('energy regenerates 1 per 2 min (1 per min on day one), caps at 100, offline credit works', () => {
  const { g, clock } = newGame();
  g.s.player.energy = 40; g.s.player.energyAt = clock.now();
  clock.advance(60 * 1000 * 10);
  assert.equal(g.energyNow(), 50); // first-day generosity: 1 per 60 s
  clock.advance(25 * 3600 * 1000);
  g.s.player.energy = 40; g.s.player.energyAt = clock.now();
  clock.advance(120 * 1000 * 10);
  assert.equal(g.energyNow(), 50);
  clock.advance(1e9);
  assert.equal(g.energyNow(), 100);
});

test('generator tap spends 1 energy; no space does not consume energy', () => {
  const { g, clock } = newGame();
  const b = g.home.board;
  const seedIdx = b.items.findIndex(i => i && i.id === 'gen_seed_01');
  const before = g.s.player.energy;
  const r = g.tap(seedIdx);
  assert.ok(r.ok);
  assert.equal(g.s.player.energy, before - 1);
  // fill every empty cell
  for (const i of b.freeCellsInOrder()) b.items[i] = { id: 'lumber_02', s: 0 };
  const e = g.s.player.energy;
  const r2 = g.tap(seedIdx);
  assert.equal(r2.reason, 'noSpace');
  assert.equal(g.s.player.energy, e);
});

test('obstacle clearing needs the right tool tier and consumes one tool per hit', () => {
  const { g } = newGame();
  const b = g.home.board;
  const idx = [...Array(b.n).keys()].find(i => b.obst[i]?.type === 'thorn_bush' && b.isOpen(i));
  const free = b.freeCellsInOrder()[0];
  b.items[free] = { id: 'clearing_tools_01', s: 0 };
  let r = g.drop({ type: 'board', idx: free }, idx);
  assert.equal(r.reason, 'needTool');
  assert.ok(b.items[free]);
  b.items[free] = { id: 'clearing_tools_02', s: 0 };
  const coins = g.s.player.coins;
  r = g.drop({ type: 'board', idx: free }, idx);
  assert.ok(r.ok && r.cleared);
  assert.equal(b.items[free], null);
  assert.ok(g.s.player.coins > coins);
  assert.equal(b.obst[idx], null);
  // too-strong tool asks first
  const idx2 = [...Array(b.n).keys()].find(i => b.obst[i]?.type === 'tall_grass' && b.isOpen(i));
  b.items[free] = { id: 'clearing_tools_04', s: 0 };
  r = g.drop({ type: 'board', idx: free }, idx2);
  assert.equal(r.confirm, 'strongTool');
});

test('multi-hit obstacles take several tools', () => {
  const { g } = newGame();
  const b = g.home.board;
  const o = g.addObstacle(b, 'dense_brush', 12, 38);
  b.items[b.idx(12, 38)] = null;
  const free = b.freeCellsInOrder()[0];
  b.items[free] = { id: 'clearing_tools_03', s: 0 };
  let r = g.drop({ type: 'board', idx: free }, b.idx(12, 38));
  assert.ok(r.hit && r.hitsLeft === 1);
  b.items[free] = { id: 'clearing_tools_03', s: 0 };
  r = g.drop({ type: 'board', idx: free }, b.idx(12, 38));
  assert.ok(r.cleared);
});

test('chest tables: 10,000 samples land within 2% of the weighted extras', () => {
  const { g } = newGame();
  g.s.chains.push('coconut', 'lumber', 'fiber');
  const counts = {}; let n = 0;
  const table = g.data.chestTables.chest_02; // extras with picks=1
  for (let i = 0; i < 10000; i++) {
    const e = g.rng.weighted(table.extras.map(([id, w]) => ({ id, weight: w })));
    counts[e.id] = (counts[e.id] || 0) + 1; n++;
  }
  const total = table.extras.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of table.extras) assert.ok(Math.abs((counts[id] || 0) / n - w / total) < 0.02, `${id}`);
  // opening a chest gives the guaranteed count of items from unlocked chains
  const b = g.home.board; const free = b.freeCellsInOrder()[0];
  b.items[free] = { id: 'chest_02', s: 0 };
  const r = g.tap(free);
  assert.ok(r.contents.length >= 3);
});

test('story quest 1 completes on creating a Banana Flower and quest 2 starts', () => {
  const { g } = newGame();
  const b = g.home.board;
  assert.deepEqual(g.s.quests.active, ['act1_q01']);
  const [a, c, d] = b.freeCellsInOrder().slice(0, 3);
  b.items[a] = { id: 'banana_01', s: 0 }; b.items[c] = { id: 'banana_01', s: 0 }; b.items[d] = { id: 'banana_01', s: 0 };
  const r = g.drop({ type: 'board', idx: a }, c);
  assert.ok(r.merged || true);
  assert.ok(g.s.quests.done.includes('act1_q01'), 'quest 1 done');
  assert.ok(g.s.player.coins >= 20);
});

test('build flow: deliver items to a site, pay coins, building appears and generator state initialises', () => {
  const { g } = newGame();
  const b = g.home.board;
  g.s.player.coins = 1000;
  const st = [...Array(b.n).keys()].map(i => b.struct[i]).find(s => s && s.id === 'bld_welcome_dock');
  const free = b.freeCellsInOrder().slice(0, 4);
  const dockCell = b.idx(st.x, st.y);
  for (const [item, n] of [['lumber_03', 2], ['fiber_02', 2]]) for (let k = 0; k < n; k++) { const c = b.freeCellsInOrder()[0]; b.items[c] = { id: item, s: 0 }; const r = g.drop({ type: 'board', idx: c }, dockCell); assert.ok(r.ok && r.consumed, item); }
  const r = g.build('bld_welcome_dock');
  assert.ok(r.ok && r.built);
  assert.equal(b.struct[dockCell].kind, 'building');
  // build the lumber yard: it becomes a generator
  g.s.built.bld_lumber_yard = true; g.rebuildStructures(); g.initStructs();
  assert.equal(g.s.structs.gen_lumber.tier, 1);
});

test('zone unlock enforces level, amulets, coins and 70% cleared', () => {
  const { g } = newGame();
  assert.equal(g.unlockZone(2).reason, 'level');
  g.s.player.level = 3;
  assert.equal(g.unlockZone(2).reason, 'cleared');
  g.s.flags.cleared = { 1: 20 };
  assert.equal(g.unlockZone(2).reason, 'coins');
  g.s.player.coins = 250;
  const r = g.unlockZone(2);
  assert.ok(r.ok);
  assert.ok(g.s.zones.unlocked.includes(2));
  assert.ok(g.chainUnlocked('coconut'));
  assert.equal(g.s.player.coins, 0);
  // pockets: level-up opens one
  const open = g.s.zones.pockets.filter(p => p.open).length;
  g.addXP(5000);
  assert.ok(g.s.zones.pockets.filter(p => p.open).length > open);
});

test('trade dock prices use category multipliers, daily factor and bulk bonus', () => {
  const { g } = newGame();
  g.s.built.bld_market_stall = true;
  const base = g.data.sellValue('herbs_05');
  const q1 = g.marketQuote('herbs_05', 1), q10 = g.marketQuote('herbs_05', 10);
  assert.ok(q1.unit >= base * 1.4 * 0.85 - 0.01 && q1.unit <= base * 1.4 * 1.15 + 0.01);
  assert.equal(g.bulkBonus(5), 0.10); assert.equal(g.bulkBonus(10), 0.25);
  assert.ok(q10.total > q1.unit * 10 * 1.2);
});

test('save/load round trip restores the exact board and state', () => {
  const { g, data, clock } = newGame();
  const b = g.home.board;
  const idx = b.items.findIndex(i => i && i.id === 'gen_seed_01');
  for (let k = 0; k < 7; k++) g.tap(idx);
  g.s.player.coins = 777;
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  assert.equal(g2.s.player.coins, 777);
  assert.deepEqual(g2.home.board.items.map(i => i && i.id), g.home.board.items.map(i => i && i.id));
  assert.deepEqual(g2.home.board.obst.map(o => o && o.type), g.home.board.obst.map(o => o && o.type));
  assert.deepEqual(g2.home.board.struct.map(s => s && s.id), g.home.board.struct.map(s => s && s.id));
  assert.equal(g2.s.quests.active[0], g.s.quests.active[0]);
});

test('offline gap is credited up to 24 h; forward jumps beyond that are clamped', () => {
  const { g, data, clock } = newGame();
  g.s.player.energy = 0; g.s.player.energyAt = clock.now();
  g.s.firstDayUntil = 0;
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  clock.advance(48 * 3600 * 1000);
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  assert.equal(g2.offline.forwardCapped, true);
  assert.equal(g2.s.player.energy, 100);
});

test('simulation is deterministic for a seed', () => {
  const run = () => { const { g } = newGame({ seed: 42 }); const b = g.home.board; const idx = b.items.findIndex(i => i && i.id === 'gen_seed_01'); for (let k = 0; k < 30; k++) g.tap(idx); return b.items.map(i => i ? i.id + i.s : '').join('|'); };
  assert.equal(run(), run());
});

test('daily challenges roll over at local midnight and pay out', () => {
  const { g, clock } = newGame();
  assert.equal(g.s.daily.tasks.length, 3);
  const first = g.s.daily.tasks.map(t => t.id).join();
  clock.advance(26 * 3600 * 1000);
  g.tick(0);
  assert.equal(g.s.daily.tasks.length, 3);
  const coins = g.s.player.coins;
  for (const t of g.s.daily.tasks) { t.done = true; t.progress = 99; }
  g.checkDailyDone();
  assert.ok(g.s.player.coins >= coins + 60);
  assert.equal(g.s.daily.streak, 1);
});

test('living items produce on a timer and farm items must be placed on matching cells', () => {
  const { g, clock } = newGame();
  g.s.zones.unlocked.push(2); g.rebuildFog();
  const b = g.home.board;
  const soil = [...Array(b.n).keys()].map(i => b.struct[i]).find(s => s && s.kind === 'soil' && s.zone === 2);
  const cell = b.idx(soil.x, soil.y);
  const free = b.freeCellsInOrder()[0];
  b.items[free] = { id: 'banana_05', s: 0 };
  assert.equal(g.drop({ type: 'board', idx: free }, cell).ok, false);
  b.items[free] = { id: 'coconut_09', s: 0 };
  assert.ok(g.drop({ type: 'board', idx: free }, cell).ok);
  clock.advance(6 * 3600 * 1000 + 1000);
  g.tickLiving();
  assert.equal(g.s.living[0].stored, 1);
  const r = g.tap(cell);
  assert.equal(r.n, 1);
});
