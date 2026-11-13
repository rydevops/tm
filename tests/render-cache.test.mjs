// The renderer's cached layers: a still frame copies them without drawing anything again, a pan only paints the strip that came into
// view, a pinch stretches the old layer until the zoom settles, and only the cells that changed are painted again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { blankBoard } from './helpers.mjs';
import { drawSea } from '../js/view/world-art.js';

// a canvas that does nothing but remember its size, enough for the renderer's layer bookkeeping
const ctx2d = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const fakeCanvas = (w = 0, h = 0) => { const c = { width: w, height: h, getBoundingClientRect: () => ({ width: 400, height: 800 }) }; const g = ctx2d(); c.getContext = () => g; return c; };
globalThis.document = globalThis.document || { createElement: () => fakeCanvas() };
globalThis.window = globalThis.window || { devicePixelRatio: 3 };
const { Renderer, CELL } = await import('../js/view/renderer.js');

function setup() {
  const board = blankBoard(60, 80);
  const app = { game: { ctx: { kind: 'home', board }, s: { settings: {} } } };
  const R = new Renderer(fakeCanvas(), app);
  R.resize(); R.isl = {}; R.cam.zoom = 1; R.cam.x = 1000; R.cam.y = 1000; R.zoomChangedAt = -1e9;
  const calls = [];
  const paint = (g, v) => calls.push(v);
  const blit = () => R.blit(R.c, 'ground', [0, 0], null, paint);
  return { R, board, calls, blit };
}

test('the screen is capped at 2 device pixels per CSS pixel (1.25 on low quality)', () => {
  const { R } = setup();
  assert.equal(R.dpr, 2);
  R.settings.quality = 'low'; R.resize(); assert.equal(R.dpr, 1.25);
});

test('a still camera copies the layer without painting it again', () => {
  const { calls, blit } = setup();
  blit(); assert.equal(calls.length, 1, 'painted once');
  for (let k = 0; k < 10; k++) blit();
  assert.equal(calls.length, 1, 'then only copied');
});

test('a pan inside the margin paints nothing; past it only the strips that came into view are painted', () => {
  const { R, calls, blit } = setup();
  blit(); const full = calls[0];
  R.pan(-30, 0); blit(); assert.equal(calls.length, 1, 'still inside the margin');
  R.pan(-200, 0); blit();
  assert.equal(R.stats.shifts, 1);
  const strip = calls[calls.length - 1];
  assert.ok(Math.abs(strip.x1 - strip.x0 - (230 + 2 * CELL)) < 2, 'a strip as wide as the pan (plus a little overlap), not the whole layer');
  assert.equal(strip.y1 - strip.y0, full.y1 - full.y0 + 2 * CELL, 'as tall as the layer (plus a little overlap)');
  const L = R.layers.ground; assert.ok(L.x0 <= R.cam.x && L.x1 >= R.cam.x + R.W / R.cam.zoom, 'the moved layer covers the screen');
});

test('while a pinch is moving the old layer is stretched; once the zoom settles it is painted again', () => {
  const { R, calls, blit } = setup();
  blit();
  R.zoomAt(200, 400, 1.05); R.zoomChangedAt = performance.now(); blit();
  assert.equal(calls.length, 1, 'stretched, not painted, mid-pinch');
  R.zoomChangedAt = performance.now() - 1000; blit();
  assert.equal(calls.length, 2, 'painted at the new zoom when it settles');
  assert.equal(R.layers.ground.z, R.cam.zoom);
});

test('a different board, size or resolution paints a fresh layer', () => {
  const { R, calls, blit } = setup();
  blit(); R.app.game.ctx = { kind: 'island', board: blankBoard(20, 20) }; R.cam.x = 0; R.cam.y = 0; blit();
  assert.equal(calls.length, 2);
  R.invalidateLayers(); blit(); assert.equal(calls.length, 3);
});

test('cell fingerprints change when the item, obstacle, fog or darkness changes, and ignore cells drawn live', () => {
  const { R, board } = setup();
  const live = { items: new Set(), obst: new Set() }, i = board.idx(10, 10);
  const sig = () => R.cellSig(board, i, live);
  const empty = sig();
  board.items[i] = { id: 'wood_01' }; const one = sig(); assert.notEqual(one, empty);
  board.items[i] = { id: 'wood_02' }; assert.notEqual(sig(), one, 'a merge changes it');
  board.items[i].s = 1; const shiny = sig(); board.items[i].s = 0; assert.notEqual(shiny, sig(), 'sparkle');
  live.items.add(i); assert.equal(sig(), empty, 'a live item is not in the layer');
  live.items.clear(); board.items[i] = null;
  board.fog[board.idx(11, 10)] = 1; assert.notEqual(sig(), empty, 'fog next door changes the cloud edge here');
  board.fog[board.idx(11, 10)] = 0; assert.equal(sig(), empty);
  const ob = { id: 7, type: 'bush', hits: 2, x: 10, y: 10, w: 1, h: 1 }; board.obst[i] = ob; const two = sig();
  ob.hits = 1; assert.notEqual(sig(), two, 'a hit changes it');
});

test('slow frames lower the resolution step by step, fast frames bring it back', () => {
  const { R } = setup();
  for (let k = 0; k < 400; k++) R.adapt(0.06);
  assert.ok(R.perf.scale < 1 && R.perf.scale >= 0.6, `scaled down to ${R.perf.scale}`);
  assert.ok(R.dpr < 2);
  for (let k = 0; k < 4000; k++) R.adapt(0.012);
  assert.equal(R.perf.scale, 1); assert.equal(R.dpr, 2);
  R.adapt(5); assert.equal(R.perf.scale, 1, 'a long pause (a hidden tab) is ignored');
});

test('sea crests hidden under the island are skipped', () => {
  const count = covered => { let n = 0; const c = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : (k === 'stroke' ? () => n++ : () => {})), set: () => true }); drawSea(c, 420, 800, 1, 0, 0, 1, false, false, { covered }); return n; };
  const all = count(null), half = count((x) => x < 210), none = count(() => true);
  assert.ok(all > 30);
  assert.ok(half < all && half > 0);
  assert.equal(none, 0);
});
