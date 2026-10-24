import test from 'node:test';
import assert from 'node:assert/strict';
import { drawSea } from '../js/view/world-art.js';

/** A canvas context that records every call, so drawing code can be run and compared without a browser. */
function recorder() {
  const log = [];
  const target = { createLinearGradient: () => ({ addColorStop() {} }) };
  return { log, c: new Proxy(target, { get: (t, k) => (k in t ? t[k] : (...a) => { log.push(`${String(k)}(${a.map(x => (typeof x === 'number' ? x.toFixed(2) : '')).join(',')})`); }), set: () => true }) };
}

test('the sea draws crests and glints, and moves with time', () => {
  const a = recorder(), b = recorder();
  drawSea(a.c, 420, 800, 1, 0, 0, 1, false, false, {});
  drawSea(b.c, 420, 800, 2.5, 0, 0, 1, false, false, {});
  assert.ok(a.log.filter(x => x.startsWith('stroke')).length > 30, 'crests are drawn');
  assert.ok(a.log.some(x => x.startsWith('fill')), 'light bands and glints are drawn');
  assert.notDeepEqual(a.log, b.log, 'the water is animated');
});

test('reduced motion draws the same still sea at any time, and low quality draws less', () => {
  const a = recorder(), b = recorder(), low = recorder(), full = recorder();
  drawSea(a.c, 420, 800, 1, 50, 80, 1, false, true, {});
  drawSea(b.c, 420, 800, 9, 50, 80, 1, false, true, {});
  assert.deepEqual(a.log, b.log);
  drawSea(low.c, 420, 800, 3, 0, 0, 1, false, false, { low: true });
  drawSea(full.c, 420, 800, 3, 0, 0, 1, false, false, {});
  assert.ok(low.log.length < full.log.length);
});

test('the same camera gives the same picture, in the dark and at other zooms too', () => {
  const a = recorder(), b = recorder();
  drawSea(a.c, 420, 800, 1, 1000, 1000, 1, false, true, {});
  drawSea(b.c, 420, 800, 1, 1000 + 70 * 0.55 * 0 + 0, 1000, 1, false, true, {});
  assert.deepEqual(a.log, b.log, 'same camera, same picture');
  const night = recorder(); drawSea(night.c, 420, 800, 1, 0, 0, 2, true, false, { sea: ['#000', '#111'], foam: 'rgba(1,2,3,' });
  assert.ok(night.log.length > 10);
});
