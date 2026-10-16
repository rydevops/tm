// Item painters, part A: crops, tools and building materials.
import { shade, mix } from './artkit.js';

const WOOD = '#b9854f', WOODD = '#8a5d32', LEAF = '#4caf50', LEAFD = '#2f8f45', SOIL = '#7a5236';

export function crateBox(P, y = 56) {
  P.rr(14, y, 72, 32, 3, WOOD);
  P.line(14, y + 11, 86, y + 11, WOODD, 1.6); P.line(14, y + 22, 86, y + 22, WOODD, 1.6);
  P.line(26, y + 1, 26, y + 31, WOODD, 1.6); P.line(74, y + 1, 74, y + 31, WOODD, 1.6);
}
export function basketBox(P) {
  P.blob([[16, 56], [50, 52], [84, 56], [78, 86], [50, 90], [22, 86]], '#d9a95f');
  for (let i = 0; i < 4; i++) P.curve(20 + i * 2, 62 + i * 7, 50, 66 + i * 7, 80 - i * 2, 62 + i * 7, '#a97a38', 1.4);
  P.rr(14, 52, 72, 8, 4, '#c8934a');
}
export function cartBox(P) {
  P.rr(10, 54, 72, 26, 3, WOOD);
  P.line(10, 64, 82, 64, WOODD, 1.5);
  P.circ(28, 84, 9, '#6b4423'); P.circ(28, 84, 3.5, '#d9b27a');
  P.circ(66, 84, 9, '#6b4423'); P.circ(66, 84, 3.5, '#d9b27a');
  P.line(82, 62, 96, 50, WOODD, 3.5, { outline: true });
}
export function goldSparkles(P) { P.sparkle(18, 22, 8); P.sparkle(84, 18, 6); P.sparkle(80, 50, 5); }

export function bananaFruit(P, x, y, rot, sc, col = '#f6d44a') {
  P.with(p => {
    const c = p.c; c.beginPath();
    c.moveTo(-22, -4); c.quadraticCurveTo(-4, 22, 24, -16); c.quadraticCurveTo(26, -20, 22, -21);
    c.quadraticCurveTo(-2, 8, -22, -12); c.quadraticCurveTo(-26, -9, -22, -4);
    p._paint(col, [-24, -20, 26, 14], {});
    p.ell(24, -19, 2.6, 2.2, '#6b4a1e', { lw: 1 });
    p.curve(-18, -3, -2, 9, 18, -9, shade(col, 0.5), 1.1);
  }, x, y, rot, sc);
}
function bananaStalkTop(P) {
  P.curve(50, 8, 48, 26, 50, 40, '#5e8f3a', 5, { outline: true });
}

function fruitLeaves(P, x, y, n = 5, len = 22) {
  for (let i = 0; i < n; i++) P.leaf(x, y, len, 7, -Math.PI / 2 + (i - (n - 1) / 2) * 0.55, i % 2 ? LEAF : LEAFD);
}

function sproutMound(P) {
  P.ell(50, 80, 26, 10, SOIL);
  P.ell(44, 76, 8, 3, shade(SOIL, 0.2), { line: false });
}

export const CROPS = {
  banana(P, L) {
    if (L >= 7 && !P._in) { P._in = 1; P.with(p => CROPS.banana(p, L), 7.5, 9, 0, 0.85); P._in = 0; return; }
    P.shadow();
    if (L === 1) { P.curve(50, 84, 48, 60, 50, 40, '#5e8f3a', 4, { outline: true }); P.blob([[50, 20], [62, 34], [56, 52], [46, 52], [40, 34]], '#a8456b'); P.blob([[50, 24], [57, 34], [52, 46], [47, 46], [44, 34]], '#d96c8d', { line: false }); }
    else if (L === 2) { P.curve(50, 86, 52, 62, 50, 46, '#5e8f3a', 4, { outline: true }); for (let i = 0; i < 6; i++) P.leaf(50, 44, 26, 8, -Math.PI / 2 + (i - 2.5) * 0.65, i % 2 ? '#e8587f' : '#c93d66'); P.circ(50, 44, 5, '#ffd34d'); }
    else if (L === 3) { bananaFruit(P, 50, 56, -0.1, 1.5, '#8fcf4a'); }
    else if (L === 4) { bananaFruit(P, 50, 56, -0.1, 1.5, '#f6d44a'); }
    else if (L === 5) { bananaFruit(P, 44, 66, -0.25, 1.25); bananaFruit(P, 56, 52, -0.15, 1.25); }
    else if (L === 6) { for (let i = 0; i < 5; i++) bananaFruit(P, 48 + i * 2, 36 + i * 11, -0.1 - i * 0.05, 1.2); P.rr(40, 20, 20, 10, 4, '#5e8f3a'); }
    else if (L === 7) { bananaStalkTop(P); for (let i = 0; i < 8; i++) { const a = (i % 4) - 1.5, rowY = 30 + Math.floor(i / 4) * 28; bananaFruit(P, 50 + a * 11, rowY + (i % 2) * 8 + 12, 1.3 * (a / 2), 1.0); } P.circ(50, 14, 5, '#5e8f3a'); }
    else if (L === 8) { crateBox(P, 52); for (let i = 0; i < 3; i++) bananaFruit(P, 32 + i * 18, 52 - (i % 2) * 6, -0.2 + i * 0.2, 1.1); }
    else if (L === 9) { cartBox(P); for (let i = 0; i < 3; i++) bananaFruit(P, 24 + i * 18, 52, -0.2 + i * 0.2, 1.1); }
    else { P.ell(50, 54, 36, 36, 'rgba(255,220,90,0.35)', { line: false }); P.curve(50, 8, 48, 26, 50, 38, '#c9962b', 5, { outline: true }); for (let i = 0; i < 6; i++) { const a = (i % 3) - 1; bananaFruit(P, 50 + a * 13, 42 + Math.floor(i / 3) * 24, 1.2 * a * 0.5, 1.15, '#ffcf3a'); } goldSparkles(P); }
  },
  coconut(P, L) {
    P.shadow();
    const nut = (x, y, r, col, o = {}) => { P.circ(x, y, r, col); if (o.eyes !== false) { P.circ(x - r * 0.3, y - r * 0.1, r * 0.13, '#3a2a1e', { line: false }); P.circ(x + r * 0.15, y - r * 0.25, r * 0.13, '#3a2a1e', { line: false }); P.circ(x - r * 0.05, y + r * 0.2, r * 0.13, '#3a2a1e', { line: false }); } P.shine(x - r * 0.35, y - r * 0.45, r * 0.25, r * 0.14); };
    if (L === 1) { P.curve(50, 86, 50, 60, 50, 46, '#5e8f3a', 3.5, { outline: true }); for (let i = 0; i < 5; i++) P.leaf(50, 44, 20, 7, -Math.PI / 2 + (i - 2) * 0.6, '#f7efd5'); P.circ(50, 44, 4, '#ffd34d'); }
    else if (L === 2) nut(50, 54, 28, '#8cc152');
    else if (L === 3) nut(50, 54, 28, '#7a5236');
    else if (L === 4) { P.circ(50, 56, 28, '#7a5236'); P.poly([[24, 46], [38, 56], [50, 44], [62, 56], [76, 46], [80, 56], [20, 56]], '#fff7e8'); P.ell(50, 62, 22, 14, '#fff7e8', { line: false }); P.poly([[22, 54], [38, 62], [50, 50], [62, 62], [78, 54]], '#7a5236', { open: true, line: true }); }
    else if (L === 5) { P.rr(30, 40, 40, 44, 8, '#e8f1f5'); P.rr(36, 32, 28, 10, 3, '#a97a38'); P.rr(34, 52, 32, 22, 4, '#fff7e8'); P.text('☁', 50, 63, 16, '#7a5236', { outline: false }); P.shine(38, 56, 4, 12, 0.5); }
    else if (L === 6) { P.rr(36, 34, 28, 52, 9, '#e8c35a'); P.rr(42, 20, 16, 16, 3, '#c8934a'); P.rr(36, 54, 28, 18, 2, '#fff7e8'); P.circ(50, 63, 5, '#7a5236'); P.shine(41, 50, 3, 12, 0.5); }
    else if (L === 7) { crateBox(P, 52); for (let i = 0; i < 3; i++) nut(30 + i * 20, 52, 11, '#7a5236', { eyes: false }); }
    else if (L === 8) { P.ell(50, 84, 24, 8, SOIL); P.curve(50, 84, 46, 60, 50, 44, '#5e8f3a', 5, { outline: true }); for (let i = 0; i < 5; i++) P.leaf(50, 44, 30, 8, -Math.PI / 2 + (i - 2) * 0.7, i % 2 ? LEAF : LEAFD); }
    else { P.curve(46, 90, 60, 60, 50, 28, '#a67c52', 9, { outline: true }); for (let i = 0; i < 6; i++) P.leaf(52, 28, 40, 9, -Math.PI / 2 + (i - 2.5) * 0.62, i % 2 ? LEAF : LEAFD); P.circ(48, 34, 5, '#7a5236'); P.circ(58, 34, 5, '#7a5236'); }
  },
  pineapple(P, L) {
    P.shadow();
    const pine = (cx, cy, s, col = '#f2b32a', crown = true) => {
      P.with(p => {
        if (crown) for (let i = 0; i < 7; i++) p.leaf(0, -22, 26, 6, -Math.PI / 2 + (i - 3) * 0.38, i % 2 ? LEAF : LEAFD);
        p.ell(0, 4, 20, 27, col);
        for (let k = -2; k <= 2; k++) { p.line(-16, k * 9, 16, k * 9 + 3, shade(col, -0.3), 1.2); }
        for (let k = -2; k <= 2; k++) { p.line(k * 7, -20, k * 7 + 4, 28, shade(col, -0.3), 1.2); }
        p.shine(-8, -8, 4, 9, 0.4);
      }, cx, cy, 0, s);
    };
    if (L === 1) { sproutMound(P); fruitLeaves(P, 50, 76, 4, 22); }
    else if (L === 2) { sproutMound(P); fruitLeaves(P, 50, 76, 7, 30); P.ell(50, 74, 7, 8, '#cdd96a'); }
    else if (L === 3) pine(50, 60, 1.05, '#9bcb4a');
    else if (L === 4) pine(50, 60, 1.05);
    else if (L === 5) { for (let i = 0; i < 3; i++) { P.ell(50, 60 + (i - 1) * 18, 30, 10, '#ffd54a'); P.ell(50, 60 + (i - 1) * 18, 10, 4, '#fff1a8', { line: true }); } P.leaf(50, 28, 20, 6, -1.9, LEAF); P.leaf(50, 28, 20, 6, -1.2, LEAFD); }
    else if (L === 6) { basketBox(P); pine(34, 50, 0.5); pine(66, 50, 0.5); pine(50, 42, 0.55); }
    else if (L === 7) { crateBox(P, 54); pine(32, 48, 0.5); pine(52, 44, 0.55); pine(70, 48, 0.5); }
    else { pine(30, 78, 0.42); pine(70, 78, 0.42); pine(50, 78, 0.42); pine(40, 54, 0.42); pine(60, 54, 0.42); pine(50, 30, 0.42); goldSparkles(P); }
  },
  mango(P, L) {
    P.shadow();
    const mg = (cx, cy, s, a, b) => P.with(p => {
      p.blob([[-20, -2], [-8, -22], [14, -20], [24, 2], [12, 22], [-8, 22]], a);
      p.blob([[2, -12], [14, -14], [20, 0], [12, 14], [2, 12]], b, { line: false });
      p.leaf(2, -20, 14, 5, -0.6, LEAF); p.shine(-10, -8, 4, 8, 0.45);
    }, cx, cy, 0, s);
    if (L === 1) { P.ell(50, 62, 14, 22, '#a7835a', { rot: 0.5 }); P.line(42, 52, 58, 72, '#7a5a36', 1.5); }
    else if (L === 2) { sproutMound(P); P.curve(50, 76, 50, 62, 52, 50, '#5e8f3a', 3.5, { outline: true }); P.leaf(52, 52, 22, 7, -0.5, '#b4482b'); P.leaf(50, 56, 22, 7, -2.6, LEAF); }
    else if (L === 3) { P.curve(26, 80, 46, 56, 74, 44, '#8a6a43', 4.5, { outline: true }); for (let i = 0; i < 4; i++) { const x = 40 + i * 10, y = 62 - i * 5; P.leaf(x, y, 22, 7, -1.2 + i * 0.1, LEAF); P.circ(x + 4, y - 4, 4.5, '#ffb7c5', { lw: 1.2 }); P.circ(x + 4, y - 4, 1.6, '#ffe36a', { line: false }); } }
    else if (L === 4) mg(50, 56, 1.4, '#8cc152', '#b8d86a');
    else if (L === 5) mg(50, 56, 1.4, '#ff9f3c', '#ffcf5c');
    else if (L === 6) { basketBox(P); mg(32, 50, 0.7, '#ff9f3c', '#ffcf5c'); mg(68, 50, 0.7, '#ffb347', '#ffd97a'); mg(50, 44, 0.75, '#ff7a3c', '#ffcf5c'); }
    else if (L === 7) { crateBox(P, 54); mg(32, 48, 0.7, '#ff9f3c', '#ffcf5c'); mg(52, 44, 0.75, '#ff7a3c', '#ffcf5c'); mg(72, 48, 0.7, '#ffb347', '#ffd97a'); }
    else { P.curve(50, 90, 54, 66, 50, 44, '#8a5d32', 10, { outline: true }); P.circ(50, 34, 28, LEAFD); P.circ(34, 40, 18, LEAF); P.circ(68, 40, 18, LEAF); mg(36, 34, 0.38, '#ff9f3c', '#ffcf5c'); mg(62, 28, 0.38, '#ff7a3c', '#ffcf5c'); mg(54, 46, 0.38, '#ffb347', '#ffd97a'); }
  },
  papaya(P, L) {
    P.shadow();
    const pp = (cx, cy, s, a, b, open = false) => P.with(p => {
      p.ell(0, 2, 17, 28, a, { rot: 0.18 });
      if (open) { p.ell(0, 4, 9, 20, '#ffb347', { line: false, rot: 0.18 }); for (let i = 0; i < 6; i++) p.circ(-3 + (i % 2) * 5, -8 + i * 5, 1.6, '#2b2118', { line: false }); }
      p.shine(-8, -10, 3, 9, 0.4);
    }, cx, cy, 0, s);
    if (L === 1) { for (let i = 0; i < 5; i++) P.ell(40 + (i % 3) * 10, 58 + Math.floor(i / 3) * 12, 3.2, 5, '#2b2118', { rot: 0.5 }); P.ell(50, 64, 22, 16, '#f4d39a', { line: true }); for (let i = 0; i < 6; i++) P.ell(38 + (i % 3) * 12, 58 + Math.floor(i / 3) * 10, 3, 4.5, '#2b2118', { rot: 0.4 }); }
    else if (L === 2) { sproutMound(P); P.curve(50, 78, 50, 62, 50, 48, '#5e8f3a', 3.5, { outline: true }); P.leaf(50, 50, 20, 7, -0.6, LEAF); P.leaf(50, 50, 20, 7, -2.5, LEAFD); }
    else if (L === 3) { P.curve(50, 90, 52, 60, 50, 36, '#9a7a4e', 7, { outline: true }); for (let i = 0; i < 6; i++) P.leaf(50, 36, 30, 9, -Math.PI / 2 + (i - 2.5) * 0.7, i % 2 ? LEAF : LEAFD); }
    else if (L === 4) pp(50, 56, 1.4, '#9bcb4a');
    else if (L === 5) pp(50, 56, 1.4, '#ff9f3c', '', true);
    else if (L === 6) { basketBox(P); pp(34, 48, 0.55, '#ff9f3c'); pp(66, 48, 0.55, '#ffb347'); pp(50, 42, 0.6, '#ff8a3c'); }
    else if (L === 7) { crateBox(P, 54); pp(32, 48, 0.55, '#ff9f3c'); pp(52, 44, 0.6, '#ff8a3c'); pp(72, 48, 0.55, '#ffb347'); }
    else { P.curve(30, 92, 34, 60, 30, 34, '#9a7a4e', 6, { outline: true }); P.curve(70, 92, 66, 56, 70, 30, '#9a7a4e', 6, { outline: true }); for (let i = 0; i < 5; i++) { P.leaf(30, 34, 24, 7, -Math.PI / 2 + (i - 2) * 0.7, LEAF); P.leaf(70, 30, 24, 7, -Math.PI / 2 + (i - 2) * 0.7, LEAFD); } pp(36, 50, 0.35, '#ff9f3c'); pp(64, 48, 0.35, '#ff8a3c'); }
  },
  hibiscus(P, L) {
    P.shadow();
    const flower = (cx, cy, s, col = '#ff4d6d', rot = 0) => P.with(p => {
      for (let i = 0; i < 5; i++) p.leaf(0, 0, 22, 12, rot + i * Math.PI * 2 / 5, col, { vein: false });
      p.circ(0, 0, 5, shade(col, -0.35), { lw: 1 });
      p.curve(0, 0, 6, -8, 11, -14, '#ffd34d', 2.2);
      for (let k = 0; k < 4; k++) p.circ(10 + k, -13 - k * 0.8, 1.6, '#ffe97a', { line: false });
    }, cx, cy, 0, s);
    if (L === 1) { P.ell(50, 66, 17, 11, '#8a6a43'); P.ell(44, 63, 4, 2.5, '#d9b27a', { line: false }); P.ell(55, 68, 4, 2.5, '#d9b27a', { line: false }); }
    else if (L === 2) { sproutMound(P); P.curve(50, 78, 50, 62, 50, 50, '#5e8f3a', 3.5, { outline: true }); P.leaf(50, 52, 22, 7, -0.5, LEAF); P.leaf(50, 52, 22, 7, -2.6, LEAFD); }
    else if (L === 3) { P.curve(50, 88, 50, 64, 50, 44, '#5e8f3a', 4, { outline: true }); P.leaf(50, 70, 20, 7, -0.6, LEAF); P.leaf(50, 62, 20, 7, -2.5, LEAFD); P.blob([[50, 20], [62, 36], [56, 54], [44, 54], [38, 36]], '#ff6b8a'); P.line(50, 24, 50, 50, '#c93d66', 1.2); }
    else if (L === 4) { P.leaf(50, 90, 26, 8, -2.3, LEAFD); P.leaf(50, 90, 26, 8, -0.8, LEAF); flower(50, 50, 1.45); }
    else if (L === 5) { for (let i = 0; i < 3; i++) P.line(50, 90, 30 + i * 20, 56, '#5e8f3a', 3, { outline: true }); P.poly([[34, 62], [66, 62], [58, 94], [42, 94]], '#f7efd5'); flower(30, 44, 0.8, '#ff4d6d', 0.3); flower(70, 44, 0.8, '#ff8fa3', 1); flower(50, 34, 0.85, '#ffb347', 2); }
    else if (L === 6) { P.ell(50, 54, 33, 33, 'rgba(0,0,0,0)', { line: true, lw: 3, stroke: '#5e8f3a' }); const cols = ['#ff4d6d', '#ffb347', '#ff8fa3', '#ffd34d']; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; flower(50 + Math.cos(a) * 33, 54 + Math.sin(a) * 33, 0.45, cols[i % 4], a); } }
    else if (L === 7) { P.rr(10, 86, 6, 8, 1, WOODD); P.rr(84, 86, 6, 8, 1, WOODD); P.curve(12, 88, 12, 20, 50, 20, '#8a5d32', 6, { outline: true }); P.curve(50, 20, 88, 20, 88, 88, '#8a5d32', 6, { outline: true }); const cols = ['#ff4d6d', '#ffb347', '#ff8fa3', '#ffd34d']; for (let i = 0; i < 6; i++) { const t = i / 5; flower(14 + t * 72, 22 + Math.sin(t * Math.PI) * -6 + (i === 0 || i === 5 ? 28 : 0), 0.4, cols[i % 4], i); } }
    else { P.ell(50, 80, 38, 12, '#6bbf59'); const cols = ['#ff4d6d', '#ffb347', '#ff8fa3', '#ffd34d', '#c77dff']; for (let i = 0; i < 7; i++) flower(18 + i * 11, 74 - (i % 2) * 16 - (i === 3 ? 12 : 0), 0.5, cols[i % 5], i); goldSparkles(P); }
  },
  herbs(P, L) {
    P.shadow();
    if (L === 1) { for (let i = 0; i < 5; i++) P.ell(38 + i * 6, 64 + (i % 2) * 8, 3, 5, '#6b4423', { rot: 0.5 }); P.ell(50, 70, 24, 10, '#c9a36a', { line: true }); for (let i = 0; i < 5; i++) P.ell(38 + i * 6, 68 + (i % 2) * 5, 2.6, 4.4, '#4a2e17', { rot: 0.5 }); }
    else if (L === 2) { sproutMound(P); for (let i = 0; i < 3; i++) P.leaf(50, 76, 24, 7, -Math.PI / 2 + (i - 1) * 0.6, i === 1 ? LEAF : LEAFD); }
    else if (L === 3) { P.curve(50, 92, 50, 60, 50, 30, '#4a8a3c', 3.5, { outline: true }); for (let i = 0; i < 5; i++) { P.leaf(50, 40 + i * 11, 18, 8, i % 2 ? -0.2 : -2.9, i % 2 ? '#7fd36b' : '#5cbd5c'); } }
    else if (L === 4) { for (let i = 0; i < 4; i++) { P.leaf(50, 90, 66, 4.5, -1.35 - (i - 1.5) * 0.28, i % 2 ? '#a9d65a' : '#8cc152'); } }
    else if (L === 5) { P.blob([[18, 60], [36, 46], [62, 50], [84, 40], [88, 56], [60, 72], [36, 76], [20, 74]], '#e1b66a'); P.blob([[30, 58], [50, 52], [70, 52]], '#f1d28f', { line: false }); P.line(28, 66, 74, 60, '#b88a42', 1.4); P.leaf(46, 48, 22, 6, -1.4, LEAF); P.shine(34, 58, 8, 3, 0.5); }
    else if (L === 6) { for (let i = 0; i < 3; i++) { P.curve(34 + i * 14, 88, 30 + i * 18, 56, 34 + i * 12, 16, '#3b2a22', 6, { outline: true }); } P.circ(36, 20, 1, '#fff', { line: false }); }
    else if (L === 7) { for (let i = 0; i < 4; i++) P.leaf(50, 70, 44, 7, -Math.PI / 2 + (i - 1.5) * 0.45, ['#8cc152', '#e1b66a', '#a9d65a', '#d9863a'][i]); P.line(36, 62, 64, 62, '#c93d66', 5, { outline: true }); P.line(40, 74, 60, 74, '#b88a42', 3); }
    else { crateBox(P, 52); P.rr(10, 44, 80, 12, 3, '#d9a95f'); P.circ(50, 62, 6, '#ffd34d'); for (let i = 0; i < 3; i++) P.leaf(34 + i * 16, 44, 22, 6, -1.5 + (i - 1) * 0.4, [LEAF, '#e1b66a', '#a9d65a'][i]); goldSparkles(P); }
  },
};

export function toolHead(P, L) {
  return L < 3 ? '#9aa5ad' : L < 6 ? '#b8c4cc' : '#d7dee3';
}
export const TOOLS = {
  clearing_tools(P, L) {
    P.shadow(50, 92, 28, 4);
    const steel = L < 4 ? '#9aa5ad' : L < 7 ? '#b9c5cd' : '#dfe6ea';
    const handle = WOOD;
    P.with(p => {
      if (L === 1) { p.rr(-4, -4, 8, 54, 3, handle); p.poly([[-14, -6], [14, -6], [10, -34], [-10, -34]], steel); p.line(-9, -8, -7, -30, '#fff', 1.3); }
      else if (L === 2) { p.poly([[-4, 10], [-34, -22], [-26, -30], [0, 0]], steel); p.poly([[4, 10], [34, -22], [26, -30], [0, 0]], steel); p.circ(0, 4, 3.5, '#d34', { lw: 1.2 }); p.rr(-12, 8, 8, 40, 3, '#e65c5c'); p.rr(4, 8, 8, 40, 3, '#e65c5c'); }
      else if (L === 3) { p.rr(-3, -14, 6, 62, 3, handle); p.poly([[-20, -16], [20, -16], [20, -28], [4, -28], [4, -34], [-4, -34], [-4, -28], [-20, -28]], steel); }
      else if (L === 4) { p.rr(-4, 4, 8, 44, 3, handle); p.poly([[-6, 6], [6, 6], [10, -42], [-6, -48]], steel); p.line(-1, 2, 3, -38, '#fff', 1.3); }
      else if (L === 5) { p.rr(-3, -20, 6, 66, 3, handle); p.poly([[2, -22], [26, -36], [30, -10], [2, -8]], steel); p.line(8, -22, 24, -30, '#fff', 1.3); }
      else if (L === 6) { p.rr(-3, -26, 6, 74, 3, handle); p.poly([[2, -34], [32, -44], [38, -6], [2, -10]], steel); p.poly([[2, -34], [-8, -30], [-8, -14], [2, -10]], '#8d99a1'); p.line(12, -34, 32, -38, '#fff', 1.4); }
      else if (L === 7) { p.rr(-3, -24, 6, 72, 3, handle); p.blob([[-30, -24], [-6, -38], [0, -42], [6, -38], [30, -24], [24, -18], [4, -28], [-4, -28], [-24, -18]], steel); p.line(-24, -22, -6, -34, '#fff', 1.3); }
      else { p.rr(-3, -10, 6, 60, 3, handle); p.rr(-20, -36, 40, 28, 5, steel); p.rr(-20, -36, 40, 8, 4, shade(steel, 0.35)); p.rr(-20, -16, 40, 8, 3, '#8d99a1'); p.sparkle(14, -30, 5); }
    }, 52, L === 2 ? 44 : 46, -0.5, L >= 6 ? 1.0 : 1.12);
    if (L >= 5) P.sparkle(80, 24, 4.5 + (L - 5));
  },
};

export const MATERIALS = {
  lumber(P, L) {
    P.shadow();
    const log = (x, y, w, h, rot = 0) => P.with(p => { p.rr(-w / 2, -h / 2, w, h, h / 2.4, '#a8713a'); p.ell(w / 2, 0, h * 0.28, h / 2, '#e8c186', { lw: 1.6 }); p.ell(w / 2, 0, h * 0.13, h * 0.26, '#c99a58', { line: false }); p.line(-w / 2 + 4, -h / 4, w / 2 - 6, -h / 4, '#7d4f24', 1.1); }, x, y, rot);
    const plank = (x, y, w, h, rot = 0, col = '#d9a05b') => P.with(p => { p.rr(-w / 2, -h / 2, w, h, 1.5, col); p.line(-w / 2 + 3, -h / 6, w / 2 - 3, -h / 6, shade(col, -0.2), 1); p.circ(-w / 2 + 6, 0, 1.4, shade(col, -0.35), { line: false }); p.circ(w / 2 - 6, 0, 1.4, shade(col, -0.35), { line: false }); }, x, y, rot);
    if (L === 1) { P.curve(22, 72, 50, 54, 78, 38, '#8a5d32', 5, { outline: true }); P.curve(46, 58, 54, 66, 58, 76, '#8a5d32', 3, { outline: true }); P.leaf(66, 44, 12, 5, -1, LEAF); }
    else if (L === 2) { P.curve(18, 78, 48, 50, 82, 28, '#8a5d32', 8, { outline: true }); P.curve(42, 56, 54, 74, 62, 82, '#8a5d32', 5, { outline: true }); P.curve(60, 42, 78, 50, 88, 56, '#8a5d32', 4, { outline: true }); }
    else if (L === 3) log(50, 58, 62, 30, -0.1);
    else if (L === 4) { plank(50, 60, 76, 22, -0.25, '#c9904e'); P.line(24, 62, 70, 52, '#7d4f24', 1); }
    else if (L === 5) plank(50, 58, 80, 24, -0.2, '#efc27d');
    else if (L === 6) { P.rr(10, 40, 80, 22, 2, '#d9a05b'); P.rr(10, 40, 80, 8, 2, '#efc27d'); P.line(14, 52, 86, 52, '#a8713a', 1.2); P.rr(10, 62, 80, 4, 1, '#a8713a'); }
    else if (L === 7) { for (let i = 0; i < 4; i++) plank(50, 80 - i * 14, 74, 12, 0, i % 2 ? '#efc27d' : '#d9a05b'); }
    else if (L === 8) { P.rr(14, 18, 8, 70, 1.5, '#d9a05b'); P.rr(78, 18, 8, 70, 1.5, '#d9a05b'); P.rr(14, 18, 72, 8, 1.5, '#efc27d'); P.rr(14, 50, 72, 6, 1.5, '#efc27d'); P.line(18, 24, 82, 52, '#a8713a', 4, { outline: true }); }
    else { P.poly([[10, 78], [50, 20], [90, 78], [80, 78], [50, 36], [20, 78]], '#d9a05b'); P.rr(18, 62, 64, 6, 1, '#efc27d'); P.line(50, 36, 50, 62, '#a8713a', 4, { outline: true }); P.line(34, 54, 50, 62, '#a8713a', 3); P.line(66, 54, 50, 62, '#a8713a', 3); }
  },
  stone(P, L) {
    P.shadow();
    const brick = (x, y, w, h, col = '#c4693f') => { P.rr(x, y, w, h, 2, col); P.line(x + 2, y + 3, x + w - 3, y + 3, shade(col, 0.3), 1, {}); };
    if (L === 1) { P.blob([[24, 70], [34, 58], [52, 56], [64, 66], [60, 78], [34, 80]], '#b9bec2'); P.circ(66, 72, 7, '#a2a8ad'); P.shine(40, 63, 6, 3); }
    else if (L === 2) { P.poly([[26, 70], [36, 46], [60, 38], [76, 58], [68, 78], [38, 80]], '#8a8f98'); P.poly([[36, 46], [60, 38], [54, 56]], '#aeb3bb', { line: false }); P.line(36, 46, 54, 56, '#4d5159', 1.3); P.line(54, 56, 76, 58, '#4d5159', 1.3); }
    else if (L === 3) { P.blob([[16, 74], [22, 50], [46, 34], [74, 42], [86, 66], [74, 82], [34, 84]], '#9ca3a8'); P.blob([[28, 62], [40, 48], [60, 48]], '#b8bfc4', { line: false }); P.line(48, 44, 52, 58, '#6e757a', 1.3); P.shine(38, 52, 8, 4, 0.4); }
    else if (L === 4) { P.poly([[18, 40], [62, 28], [86, 40], [86, 70], [42, 82], [18, 70]], '#b6a999'); P.poly([[18, 40], [62, 28], [86, 40], [42, 52]], '#d5cbbd'); P.line(42, 52, 42, 82, '#7d7266', 1.2); P.line(42, 52, 86, 40, '#7d7266', 1.2); P.line(18, 40, 42, 52, '#7d7266', 1.2); }
    else if (L === 5) { brick(16, 40, 68, 28, '#c4693f'); P.line(50, 40, 50, 68, '#8f4a2a', 1.3); P.line(16, 54, 84, 54, '#8f4a2a', 1.3); P.shine(26, 46, 6, 2.5); }
    else if (L === 6) { brick(10, 70, 38, 16); brick(52, 70, 38, 16); brick(30, 52, 38, 16); brick(10, 34, 38, 16); brick(52, 34, 38, 16); }
    else if (L === 7) { P.poly([[14, 38], [50, 22], [86, 38], [86, 74], [50, 90], [14, 74]], '#bfc4c9'); P.poly([[14, 38], [50, 22], [86, 38], [50, 54]], '#dfe3e6'); P.line(50, 54, 50, 90, '#6e757a', 1.3); P.line(14, 56, 50, 72, '#8a9096', 1); }
    else { P.rr(30, 14, 40, 10, 2, '#dfe3e6'); P.rr(36, 24, 28, 54, 1, '#cfd4d8'); for (const x of [41, 50, 59]) P.line(x, 26, x, 76, '#9aa0a6', 1.3); P.rr(30, 78, 40, 10, 2, '#dfe3e6'); P.sparkle(76, 24, 5); }
  },
  fiber(P, L) {
    P.shadow();
    const ropeCol = '#d6b27a';
    if (L === 1) { for (let i = 0; i < 6; i++) P.curve(50, 84, 30 + i * 8, 56, 26 + i * 10, 30 + (i % 2) * 6, i % 2 ? '#c7a66a' : '#b8924f', 3.4, { outline: true }); }
    else if (L === 2) { P.circ(50, 56, 24, '#d6b27a'); for (let i = -2; i <= 2; i++) P.curve(30, 56 + i * 8, 50, 50 + i * 8, 70, 56 + i * 8, '#a8813f', 1.5); P.curve(60, 38, 76, 20, 86, 26, '#d6b27a', 3.5, { outline: true }); }
    else if (L === 3) { P.circ(50, 58, 28, 'rgba(0,0,0,0)'); for (let k = 0; k < 4; k++) P.ell(50, 60, 26 - k * 5, 22 - k * 4, k % 2 ? '#c7a66a' : '#e0c18a', { lw: 3.5, line: true, stroke: '#7d5a2c' }); P.ell(50, 60, 6, 5, '#7d5a2c'); }
    else if (L === 4) { P.curve(14, 70, 50, 20, 86, 70, ropeCol, 7, { outline: true }); for (let i = 0; i < 7; i++) P.line(20 + i * 10, 62 - Math.sin(i / 6 * Math.PI) * 28 + 10, 24 + i * 10, 68 - Math.sin(i / 6 * Math.PI) * 28 + 10, '#a8813f', 1.3); }
    else if (L === 5) { for (let k = 0; k < 4; k++) P.ell(50, 62 - k * 3, 36 - k * 4, 22 - k * 3, 'rgba(0,0,0,0)', { line: true, lw: 5, stroke: '#6e4f24' }); for (let k = 0; k < 4; k++) P.ell(50, 62 - k * 3, 36 - k * 4, 22 - k * 3, 'rgba(0,0,0,0)', { line: true, lw: 3, stroke: k % 2 ? '#d6b27a' : '#e8cb97' }); }
    else if (L === 6) { P.poly([[12, 30], [88, 30], [92, 76], [8, 76]], 'rgba(214,178,122,0.25)', { line: false }); const c = P.c; c.save(); c.beginPath(); c.moveTo(12, 30); c.lineTo(88, 30); c.lineTo(92, 76); c.lineTo(8, 76); c.closePath(); c.clip(); for (let x = 0; x <= 100; x += 11) P.line(x, 20, x + (x - 50) * 0.1, 84, '#c7a66a', 2.2); for (let y = 30; y <= 80; y += 11) P.line(0, y, 100, y, '#c7a66a', 2.2); c.restore(); c.beginPath(); c.moveTo(12, 30); c.lineTo(88, 30); c.lineTo(92, 76); c.lineTo(8, 76); c.closePath(); c.lineWidth = 2.4; c.strokeStyle = '#6e4f24'; c.stroke(); }
    else if (L === 7) { P.rr(10, 34, 80, 44, 3, '#e07a5f'); for (let i = 0; i < 6; i++) { P.rr(10 + i * 14, 34, 7, 44, 0, i % 2 ? '#f2cc8f' : '#3d405b', { line: false }); } for (let i = 0; i < 4; i++) P.rr(10, 38 + i * 11, 80, 5, 0, i % 2 ? '#f4f1de' : '#81b29a', { line: false }); P.rr(10, 34, 80, 44, 3, null); }
    else { P.curve(12, 52, 50, 84, 88, 52, '#e07a5f', 15, { outline: true }); P.curve(12, 52, 50, 84, 88, 52, '#f2cc8f', 6); P.rr(8, 18, 6, 64, 3, WOOD); P.rr(86, 18, 6, 64, 3, WOOD); P.line(12, 30, 12, 52, '#6e4f24', 1.5); P.line(88, 30, 88, 52, '#6e4f24', 1.5); P.sparkle(50, 40, 5); }
  },
  hardware(P, L) {
    P.shadow();
    const nail = (x, y, rot, col = '#a8a29a', l = 34) => P.with(p => { p.rr(-1.6, -l / 2, 3.2, l, 1.2, col); p.ell(0, -l / 2, 5, 2.2, shade(col, 0.15)); }, x, y, rot);
    if (L === 1) { nail(50, 54, -0.6, '#a5622f', 44); P.circ(50, 54, 0.1, '#fff', { line: false }); P.circ(36, 44, 2, '#7a3d17', { line: false }); }
    else if (L === 2) { nail(34, 58, -0.4); nail(48, 54, 0.1); nail(62, 58, 0.5); nail(48, 66, -0.9); }
    else if (L === 3) { for (let i = 0; i < 3; i++) P.with(p => { p.rr(-3, -22, 6, 44, 2, '#b9bfc4'); p.ell(0, -22, 7, 3, '#d3d8dc'); for (let k = 0; k < 6; k++) p.line(-4, -14 + k * 7, 4, -11 + k * 7, '#6b7279', 1.4); }, 30 + i * 20, 56, 0.2 * (i - 1)); }
    else if (L === 4) { P.rr(14, 38, 30, 38, 3, '#c0c6cb'); P.rr(56, 38, 30, 38, 3, '#c0c6cb'); P.rr(44, 42, 12, 30, 4, '#8d99a1'); for (const y of [46, 66]) { P.circ(26, y, 3, '#5a636a', { lw: 1.2 }); P.circ(74, y, 3, '#5a636a', { lw: 1.2 }); } P.circ(50, 57, 3, '#d3d8dc'); }
    else if (L === 5) { P.curve(34, 50, 34, 14, 66, 14, '#c0c6cb', 8, { outline: true }); P.line(66, 14, 66, 50, '#c0c6cb', 8, { outline: true }); P.rr(22, 46, 56, 40, 6, '#e6b422'); P.circ(50, 62, 5, '#5a4a14'); P.rr(48, 62, 4, 12, 1, '#5a4a14'); P.shine(32, 56, 5, 2.5, 0.5); }
    else if (L === 6) { P.rr(10, 26, 80, 12, 6, '#8d99a1'); P.rr(10, 26, 80, 5, 3, '#c0c6cb', { line: false }); P.rr(70, 40, 12, 40, 6, '#8d99a1'); P.rr(14, 66, 40, 12, 6, '#c0c6cb'); P.circ(76, 26, 10, '#e07a5f'); P.rr(66, 64, 22, 10, 3, '#e07a5f'); }
    else if (L === 7) { P.rr(12, 40, 76, 44, 4, '#e07a5f'); P.rr(12, 40, 76, 12, 4, '#f2a28c'); P.rr(40, 34, 20, 8, 3, '#8d99a1'); for (let i = 0; i < 3; i++) nail(28 + i * 22, 36, 0.3 * (i - 1), '#b9bfc4', 20); P.rr(44, 58, 12, 8, 2, '#f2cc8f'); }
    else { P.rr(10, 44, 80, 40, 6, '#d94f4f'); P.rr(10, 44, 80, 12, 6, '#ef7676'); P.curve(34, 44, 50, 18, 66, 44, '#8d99a1', 6, { outline: true }); P.rr(44, 58, 12, 10, 2, '#f4d35e'); P.line(10, 62, 90, 62, '#8f2f2f', 1.5); P.sparkle(80, 30, 5); }
  },
};
