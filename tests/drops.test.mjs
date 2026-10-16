import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { Game } from '../js/core/index.js';

const MIN = 60 * 1000;

/** A new game with the jungle cleared (so free cells never limit a test) and the tutorial still running. */
function fresh(opts) {
  const ctx = newGame(opts);
  ctx.g.home.board.obst.fill(null);
  ctx.cfg = ctx.data.economy.drops;
  return ctx;
}
/** A game past the tutorial with the drop timer armed. */
function setup(opts) {
  const ctx = fresh(opts);
  ctx.g.s.tutorial.done = true;
  ctx.g.tick(0);
  return ctx;
}
/** Advance to the next wave and return the drops it created. */
function nextWave({ g, clock }) {
  clock.advance(g.s.drops.nextAt - clock.now() + 1);
  const before = g.s.drops.list.length;
  g.tick(0);
  return g.s.drops.list.slice(before);
}

test('no balloons until the tutorial is done; the first wave comes 3-5 minutes after that', () => {
  const { g, clock } = fresh();
  g.tick(0);
  assert.equal(g.s.drops.nextAt, 0);
  g.s.tutorial.done = true;
  const t0 = clock.now(); g.tick(0);
  const wait = g.s.drops.nextAt - t0;
  assert.ok(wait >= 3 * MIN && wait <= 5 * MIN, `first wave in ${wait} ms`);
  clock.advance(wait - 1000); g.tick(0);
  assert.equal(g.s.drops.list.length, 0);
  clock.advance(2000); g.tick(0);
  assert.ok(g.s.drops.list.length >= 1);
});

test('each wave has 1-3 gifts on distinct free cells, and waves are 3-5 minutes apart', () => {
  const ctx = setup({ seed: 7 });
  const { g, clock } = ctx;
  const counts = new Set();
  let lastWaveAt = null;
  for (let w = 0; w < 30; w++) {
    g.s.drops.list.length = 0; g.rebuildStructures(); // keep the ground clear so the cap never interferes
    const wave = nextWave(ctx), at = clock.now();
    assert.ok(wave.length >= 1 && wave.length <= 3, `wave of ${wave.length}`);
    counts.add(wave.length);
    assert.equal(new Set(wave.map(d => d.cell)).size, wave.length);
    const next = g.s.drops.nextAt - at;
    assert.ok(next >= 3 * MIN && next <= 5 * MIN, `next wave in ${next} ms`);
    if (lastWaveAt != null) assert.ok(at - lastWaveAt >= 3 * MIN && at - lastWaveAt <= 5 * MIN + 1, `waves ${at - lastWaveAt} ms apart`);
    lastWaveAt = at;
  }
  assert.deepEqual([...counts].sort(), [1, 2, 3]);
});

test('balloons are staggered, each falls for fallSec, and its cell stays blocked while it floats', () => {
  const ctx = setup({ seed: 3 });
  const { g, cfg } = ctx;
  const b = g.home.board;
  let heard = null; g.on(ev => { if (ev.type === 'giftDrop') heard = ev; });
  const wave = nextWave(ctx), [dr] = wave;
  assert.ok(heard && heard.count === wave.length);
  for (const d of wave) assert.equal(d.landAt - d.startAt, cfg.fallSec * 1000);
  for (let i = 1; i < wave.length; i++) {
    const gap = wave[i].startAt - wave[i - 1].startAt;
    assert.ok(gap >= cfg.staggerSec[0] * 1000 && gap <= cfg.staggerSec[1] * 1000, `stagger ${gap}`);
  }
  const st = b.struct[dr.cell];
  assert.equal(st.kind, 'gift'); assert.equal(st.drop, dr);
  assert.ok(!b.isEmpty(dr.cell));
  assert.equal(g.landedGifts().length, 0);
  // tapping while it is still in the air does nothing; nothing can be dropped onto it
  assert.equal(g.tap(dr.cell).action, 'none');
  assert.ok(b.struct[dr.cell]);
  assert.equal(g.dropOnStruct(st, { id: 'banana_01', s: 0 }, dr.cell, {}).ok, false);
});

test('a landed gift opens into items near its cell and leaves nothing behind', () => {
  const ctx = setup({ seed: 11 });
  const { g, clock, cfg } = ctx;
  const b = g.home.board;
  const [dr] = nextWave(ctx);
  clock.advance(cfg.fallSec * 1000 + 1);
  assert.ok(g.landedGifts().includes(dr));
  let opened = null; g.on(ev => { if (ev.type === 'chestOpened') opened = ev; });
  const itemsBefore = b.items.filter(Boolean).length, listBefore = g.s.drops.list.length;
  const res = g.tap(dr.cell);
  assert.equal(res.action, 'gift');
  assert.ok(res.contents.length >= cfg.tiers[0].table.count);
  assert.ok(opened && opened.gift && opened.idx === dr.cell);
  assert.equal(g.s.drops.list.length, listBefore - 1);
  assert.ok(!g.s.drops.list.includes(dr));
  assert.ok(!b.struct[dr.cell]);
  assert.ok(b.items.filter(Boolean).length > itemsBefore);
  assert.equal(g.s.stats.giftDrops, 1);
  assert.ok(b.items[dr.cell]); // the first item landed in the freed cell
});

test('gift quality follows the player level', () => {
  const { g, cfg } = setup();
  g.s.player.level = 1; assert.equal(g.dropTier(), cfg.tiers[0]);
  g.s.player.level = 10; assert.equal(g.dropTier(), cfg.tiers[1]);
  g.s.player.level = 40; assert.equal(g.dropTier(), cfg.tiers[2]);
});

test('drops survive a save and reload, including mid-flight, and keep their cells blocked', () => {
  const ctx = setup({ seed: 5 });
  const { g, data, clock, cfg } = ctx;
  const wave = nextWave(ctx);
  clock.advance(4000);
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  assert.equal(g2.s.drops.list.length, wave.length);
  for (const dr of wave) {
    const st = g2.home.board.struct[dr.cell];
    assert.equal(st.kind, 'gift'); assert.equal(st.drop.landAt, dr.landAt);
  }
  clock.advance(cfg.fallSec * 1000 + 6000);
  assert.equal(g2.landedGifts().length, wave.length);
  assert.equal(g2.tap(wave[0].cell).action, 'gift');
});

test('a long absence does not stack up waves', () => {
  const ctx = setup({ seed: 9 });
  const { g, data, clock } = ctx;
  const doc = JSON.parse(JSON.stringify(g.serialize()));
  clock.advance(5 * 60 * MIN);
  const g2 = Game.fromSave(data, doc, { now: clock.now });
  assert.ok(g2.s.drops.list.length >= 1 && g2.s.drops.list.length <= 3);
  const n = g2.s.drops.list.length;
  g2.tick(0);
  assert.equal(g2.s.drops.list.length, n);
  assert.ok(g2.s.drops.nextAt > clock.now());
});

test('the ground holds at most maxOnGround gifts', () => {
  const ctx = setup({ seed: 2 });
  const { g, cfg } = ctx;
  for (let w = 0; w < 12; w++) nextWave(ctx);
  assert.equal(g.s.drops.list.length, cfg.maxOnGround);
  assert.equal(new Set(g.s.drops.list.map(d => d.cell)).size, cfg.maxOnGround);
});

test('a packed board postpones the wave and retries soon', () => {
  const ctx = setup({ seed: 6 });
  const { g, clock, cfg } = ctx;
  const b = g.home.board, free = b.freeCellsInOrder();
  for (const i of free.slice(0, free.length - (cfg.minFreeCells - 1))) b.items[i] = { id: 'banana_01', s: 0 };
  clock.advance(g.s.drops.nextAt - clock.now() + 1); g.tick(0);
  assert.equal(g.s.drops.list.length, 0);
  assert.ok(g.s.drops.nextAt - clock.now() <= cfg.retrySec * 1000);
});

test('no balloons while the player is away from the home island', () => {
  const ctx = setup({ seed: 4 });
  const { g, clock } = ctx;
  clock.advance(g.s.drops.nextAt - clock.now() + 1);
  const home = g.ctx;
  g.ctx = { kind: 'island' }; g.tickDrops();
  assert.equal(g.s.drops.list.length, 0);
  g.ctx = home; g.tickDrops();
  assert.ok(g.s.drops.list.length >= 1);
});
