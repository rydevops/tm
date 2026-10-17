import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingNotes, markSeen, NOTES } from '../js/whatsnew.js';
import { VERSION } from '../js/version.js';

const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test("what's new shows once per version", () => {
  const st = mem(), notes = { '2.0.0': ['a', 'b'] };
  assert.deepEqual(pendingNotes('2.0.0', st, notes), ['a', 'b']);
  markSeen('2.0.0', st);
  assert.equal(pendingNotes('2.0.0', st, notes), null);
  assert.equal(pendingNotes('2.1.0', st, notes), null);                       // new version without notes: nothing to show
  assert.deepEqual(pendingNotes('2.0.0', mem(), notes), ['a', 'b']);          // another device that never saw it
});

test('storage failures never throw', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.doesNotThrow(() => markSeen('1.0.0', bad));
  assert.deepEqual(pendingNotes('1.0.0', bad, { '1.0.0': ['a'] }), ['a']);
});

test('the current version has release notes', () => {
  assert.ok(NOTES[VERSION] && NOTES[VERSION].length >= 1, `add NOTES['${VERSION}'] to js/whatsnew.js`);
});
