// Procedural scenery for the island: palms, trees, bushes, rocks, shells and small ground details.
// Every sprite is painted once into a 128px canvas in the same storybook style as the items (100x100 design space, base at the bottom centre).
import { Painter, shade } from './artkit.js';

let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function setDecorCanvasFactory(fn) { makeCanvas = fn; }

/** Size of each kind as a fraction of one board cell, and whether it sways in the breeze. */
export const DECOR = {
  palm: { size: 1.55, sway: 0.035, shadow: 0.34 }, tree: { size: 1.2, sway: 0.015, shadow: 0.34 }, pine: { size: 1.25, sway: 0.01, shadow: 0.3 },
  lolli: { size: 1.05, sway: 0.02, shadow: 0.26 }, dead: { size: 1.05, sway: 0.006, shadow: 0.26 }, mush: { size: 0.7, sway: 0.01, shadow: 0.22 },
  bush: { size: 0.62, sway: 0.02, shadow: 0.24 }, reed: { size: 0.62, sway: 0.05, shadow: 0 }, rock: { size: 0.5, sway: 0, shadow: 0.3 },
  tuft: { size: 0.3, sway: 0.05, shadow: 0 }, flower: { size: 0.28, sway: 0.05, shadow: 0 }, shell: { size: 0.24, sway: 0, shadow: 0 },
  pebble: { size: 0.24, sway: 0, shadow: 0 }, star: { size: 0.2, sway: 0, shadow: 0 }, crystal: { size: 0.3, sway: 0, shadow: 0 },
  sprinkle: { size: 0.22, sway: 0, shadow: 0 }, crack: { size: 0.34, sway: 0, shadow: 0 }
};

const GREENS = { default: ['#2f9a46', '#3fb454', '#58c767'], pink: ['#e86aa8', '#f58ac0', '#ffb3d9'], snow: ['#cfe8f5', '#e6f6ff', '#ffffff'], night: ['#4a5db0', '#6577c8', '#8fa0e6'], ash: ['#5b4a47', '#6e5b57', '#827069'] };
const ROCKS = { default: ['#8e949a', '#b6bcc2'], snow: ['#a9bfd0', '#dcebf5'], night: ['#505a8a', '#7480b8'], ash: ['#4a3b39', '#6d5a56'], pink: ['#c9a0b8', '#ecc9dc'] };
const FLOWERS = ['#ffffff', '#ffd23f', '#ff8fa3', '#c9a7ff'];

const PAINT = {
  palm(P, v, tint) {
    const g = GREENS[tint] || GREENS.default, lean = [-13, 4, 15][v % 3], tx = 50 + lean, ty = 32;
    P.curve(50, 92, 50 + lean * 0.15, 62, tx, ty, '#9a6b3c', 9, { outline: true });
    P.curve(50, 92, 50 + lean * 0.15, 62, tx, ty, '#c99a62', 5, {});
    for (let k = 0; k < 4; k++) { const f = 0.2 + k * 0.2; P.line(50 + lean * f * f - 4, 92 - f * 58, 50 + lean * f * f + 4, 92 - f * 58 - 1.5, '#8a5d32', 1.4); }
    const angs = [-3.25, -2.75, -2.25, -1.8, -1.35, -0.9, -0.4, 0.1];
    angs.forEach((a, i) => {
      const L = 34 + (i % 2) * 4, cx = tx + Math.cos(a) * L * 0.55, cy = ty + Math.sin(a) * L * 0.55 - 8, ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + 9;
      P.curve(tx, ty, cx, cy, ex, ey, g[0], 8.5, { outline: true }); P.curve(tx, ty, cx, cy, ex, ey, g[i % 2 ? 1 : 2], 5.2, {});
    });
    P.circ(tx - 3, ty + 4, 3.6, '#7a4e26', { lw: 1.4 }); P.circ(tx + 4, ty + 5, 3.6, '#8a5d32', { lw: 1.4 });
  },
  tree(P, v) {
    const base = ['#3f9d45', '#4aa84a'][v % 2];
    P.rr(44, 58, 12, 34, 3, '#8a5d32'); P.line(50, 62, 50, 88, '#6b4423', 1.2);
    P.circ(32, 52, 19, shade(base, -0.08)); P.circ(68, 52, 19, shade(base, -0.08)); P.circ(50, 38, 25, base); P.circ(50, 56, 18, shade(base, -0.04));
    P.shine(42, 30, 11, 6, 0.4); for (const [x, y] of [[36, 52], [62, 46], [52, 62]]) P.circ(x, y, 2.4, '#e63946', { lw: 1 });
  },
  pine(P, v, tint) {
    const g = GREENS[tint] === GREENS.snow ? '#4f9d6a' : '#3a8f55';
    P.rr(46, 74, 8, 18, 2, '#7d4f24');
    [[78, 30], [58, 26], [38, 20]].forEach(([y, w], i) => { P.poly([[50 - w, y], [50, y - 30 + i * 4], [50 + w, y]], g); P.poly([[50 - w * 0.6, y - 12], [50, y - 30 + i * 4], [50 + w * 0.6, y - 12]], '#f4fbff', { line: false }); });
  },
  lolli(P, v) {
    const cols = [['#ff7eb6', '#fff'], ['#7ad1ff', '#fff'], ['#ffd54a', '#fff']][v % 3];
    P.rr(47, 50, 6, 42, 2, '#fff6ee'); P.circ(50, 34, 26, cols[0]);
    P.c.save(); P.c.strokeStyle = cols[1]; P.c.lineWidth = 4; P.c.lineCap = 'round'; P.c.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = 1.6 * a + 1; P.c.lineTo(50 + Math.cos(a) * r, 34 + Math.sin(a) * r); } P.c.stroke(); P.c.restore();
    P.shine(40, 22, 7, 4, 0.7);
  },
  dead(P) {
    P.curve(50, 92, 46, 60, 52, 28, '#4a3a38', 10, { outline: true });
    P.curve(50, 60, 36, 52, 24, 36, '#4a3a38', 6, { outline: true }); P.curve(52, 46, 66, 40, 76, 24, '#4a3a38', 6, { outline: true }); P.curve(52, 30, 46, 18, 50, 8, '#4a3a38', 5, { outline: true });
    P.curve(50, 92, 46, 60, 52, 28, '#6b5753', 4, {});
  },
  mush(P, v) {
    P.rr(44, 56, 12, 32, 5, '#e9e2f5'); P.ell(50, 54, 36, 24, ['#6f7ee0', '#a278e8', '#4fc3b8'][v % 3]);
    for (const [x, y, r] of [[36, 50, 4], [52, 42, 5], [64, 54, 3.5]]) P.circ(x, y, r, '#f4f1ff', { line: false });
    P.shine(38, 42, 9, 4, 0.5);
  },
  bush(P, v, tint) {
    const g = GREENS[tint] || GREENS.default;
    P.circ(32, 66, 20, g[0]); P.circ(66, 66, 22, g[1]); P.circ(48, 52, 24, g[1]); P.circ(48, 70, 18, g[0]); P.shine(40, 42, 10, 5, 0.35);
    if (tint === undefined || tint === 'default') for (const [x, y, i] of [[34, 60, 0], [58, 50, 1], [66, 70, 2], [44, 72, 3]]) P.circ(x, y, 3, FLOWERS[(i + v) % 4], { lw: 1 });
  },
  reed(P) {
    for (let i = 0; i < 6; i++) { const x = 28 + i * 9, top = 14 + (i % 3) * 14; P.curve(x, 92, x + (i % 2 ? 4 : -4), 56, x + (i - 2.5) * 2.4, top, '#6fae4a', 3.4, { outline: true }); if (i % 2 === 0) P.rr(x + (i - 2.5) * 2.4 - 3, top - 2, 6, 17, 3, '#8a5d32', { lw: 1.2 }); }
  },
  rock(P, v, tint) {
    const r = ROCKS[tint] || ROCKS.default;
    P.blob([[14, 80], [18, 50], [40, 30], [68, 34], [86, 56], [86, 82], [50, 90]], r[0]); P.blob([[28, 54], [42, 38], [64, 40], [60, 52]], r[1], { line: false }); P.line(46, 62, 56, 82, 'rgba(60,60,60,0.35)', 1.6);
  },
  tuft(P, v, tint) {
    const g = GREENS[tint] || GREENS.default;
    for (let i = 0; i < 6; i++) P.curve(50, 92, 50 + (i - 2.5) * 6, 66, 50 + (i - 2.5) * 13, 30 + (i % 3) * 8, g[i % 2 ? 1 : 0], 6, { line: false });
  },
  flower(P, v) {
    P.line(50, 92, 50, 52, '#4aa843', 4, {});
    for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; P.circ(50 + Math.cos(a) * 15, 40 + Math.sin(a) * 15, 11, FLOWERS[v % 4], { lw: 1.4 }); }
    P.circ(50, 40, 9, '#ffb100', { lw: 1.4 });
  },
  shell(P, v) {
    P.blob([[22, 70], [26, 46], [50, 34], [74, 46], [78, 70], [50, 80]], ['#fff1e6', '#ffd9d0', '#f6e7ff'][v % 3], { lw: 2 });
    for (let i = 0; i < 4; i++) P.line(50, 76, 30 + i * 13, 48, '#e1a898', 1.8);
  },
  pebble(P, v) { P.ell(34, 74, 20, 13, '#a3a9ae'); P.ell(64, 70, 24, 16, '#bcc2c6'); P.shine(60, 62, 8, 3, 0.5); },
  star(P) { P.sparkle(50, 56, 34, '#fff3b0'); },
  crystal(P) { P.poly([[50, 14], [66, 52], [58, 90], [42, 90], [34, 52]], '#bfe9ff'); P.poly([[50, 14], [58, 52], [50, 90], [42, 52]], '#e8f8ff', { line: false }); },
  sprinkle(P, v) { P.line(30, 60, 70, 40, ['#7ad1ff', '#ffd54a', '#9bcb4a', '#ffffff'][v % 4], 12, { outline: false }); },
  crack(P) { P.c.save(); P.c.strokeStyle = '#ff7a2a'; P.c.lineWidth = 6; P.c.lineCap = 'round'; P.c.beginPath(); P.c.moveTo(14, 60); P.c.lineTo(38, 76); P.c.lineTo(54, 52); P.c.lineTo(84, 66); P.c.stroke(); P.c.restore(); }
};

const cache = new Map();
/** Cached 128px sprite. `tint` picks a palette (default, pink, snow, night, ash). */
export function getDecor(kind, variant = 0, tint = 'default') {
  const key = `${kind}|${variant}|${tint}`; let cv = cache.get(key); if (cv) return cv;
  cv = makeCanvas(128, 128); const P = new Painter(cv.getContext('2d'), 128);
  try { (PAINT[kind] || PAINT.pebble)(P, variant, tint); } catch (e) { if (typeof console !== 'undefined') console.warn('decor error', kind, e); }
  P.end(); cache.set(key, cv); return cv;
}
export function clearDecorCache() { cache.clear(); }
