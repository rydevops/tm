// Item painters, part B: animals, food, treasure, sea, magic, dragons and special items.
import { shade, mix, artRng } from './artkit.js';
import { crateBox, basketBox, goldSparkles } from './art-items-a.js';

const WOOD = '#b9854f', WOODD = '#8a5d32';

function eyes(P, x, y, gap, r = 2.4) {
  P.circ(x - gap, y, r, '#2b1d14', { line: false }); P.circ(x + gap, y, r, '#2b1d14', { line: false });
  P.circ(x - gap + r * 0.3, y - r * 0.3, r * 0.35, '#fff', { line: false }); P.circ(x + gap + r * 0.3, y - r * 0.3, r * 0.35, '#fff', { line: false });
}
function blush(P, x, y, gap, r = 3) { P.ell(x - gap, y, r, r * 0.6, 'rgba(255,120,140,0.55)', { line: false }); P.ell(x + gap, y, r, r * 0.6, 'rgba(255,120,140,0.55)', { line: false }); }

export const ANIMALS = {
  chicken(P, L) {
    P.shadow();
    const egg = (x, y, s, col, spots = false) => P.with(p => { p.ell(0, 0, 17, 22, col, { rot: 0.1 }); if (spots) for (const [a, b] of [[-6, -6], [5, 2], [-3, 10], [7, -10], [-9, 5]]) p.ell(a, b, 2.2, 1.6, '#a0764a', { line: false }); p.shine(-6, -10, 3, 8, 0.6); }, x, y, 0, s);
    const hen = (x, y, s, body, comb = '#e63946', extra) => P.with(p => {
      p.ell(0, 6, 22, 20, body); p.ell(-10, 12, 11, 8, shade(body, -0.12), { rot: 0.6 });
      p.ell(14, -14, 11, 11, body); p.poly([[8, -26], [12, -34], [16, -26], [20, -33], [22, -24]], comb);
      p.poly([[23, -14], [33, -11], [23, -8]], '#f4a024'); p.ell(18, -6, 3, 5, comb); p.circ(16, -16, 2, '#2b1d14', { line: false });
      p.poly([[-20, 0], [-32, -10], [-28, 6]], shade(body, -0.2)); p.line(-4, 24, -4, 34, '#e08a1e', 2.4); p.line(8, 24, 8, 34, '#e08a1e', 2.4);
      if (extra) extra(p);
    }, x, y, 0, s);
    if (L === 1) egg(50, 56, 1.3, '#fdf5e6');
    else if (L === 2) egg(50, 56, 1.3, '#fdf5e6', true);
    else if (L === 3) { egg(50, 62, 1.15, '#fdf5e6', true); P.poly([[36, 46], [44, 52], [50, 44], [58, 52], [64, 46], [62, 56], [38, 56]], '#fff', { line: true }); P.circ(46, 56, 2, '#2b1d14', { line: false }); P.circ(56, 56, 2, '#2b1d14', { line: false }); P.poly([[48, 58], [54, 58], [51, 63]], '#f4a024'); }
    else if (L === 4) { P.ell(50, 62, 22, 20, '#ffe066'); P.ell(50, 40, 15, 14, '#ffe066'); eyes(P, 50, 38, 6); P.poly([[46, 42], [54, 42], [50, 48]], '#f4a024'); P.line(42, 82, 42, 90, '#e08a1e', 2.4); P.line(58, 82, 58, 90, '#e08a1e', 2.4); P.leaf(28, 62, 12, 5, 2.6, '#ffd23f'); blush(P, 50, 44, 11, 2.5); }
    else if (L === 5) hen(48, 56, 0.95, '#f4e3c4', '#e63946');
    else if (L === 6) hen(48, 56, 1.1, '#f6f2ea', '#e63946');
    else if (L === 7) hen(48, 54, 1.15, '#b5452c', '#e63946', p => { p.poly([[-20, -2], [-38, -22], [-34, -4], [-42, -8], [-30, 12]], '#2a9d8f'); p.poly([[-20, 0], [-34, -14], [-30, 8]], '#264653'); });
    else { P.ell(50, 54, 36, 36, 'rgba(255,220,90,0.35)', { line: false }); hen(48, 54, 1.1, '#ffd23f', '#ff9f1c', p => { p.sparkle(-20, -26, 7); }); goldSparkles(P); }
  },
  cow(P, L) {
    P.shadow();
    const cow = (x, y, s, spots, bell, ribbon) => P.with(p => {
      p.rr(-26, -12, 50, 30, 12, '#fff'); p.rr(-24, 14, 8, 16, 3, '#fff'); p.rr(-6, 14, 8, 16, 3, '#fff'); p.rr(10, 14, 8, 16, 3, '#fff');
      if (spots) { p.blob([[-20, -8], [-8, -12], [-6, 0], [-18, 4]], '#2b2118', { line: false }); p.blob([[6, -4], [18, -8], [22, 6], [8, 8]], '#2b2118', { line: false }); }
      p.rr(18, -22, 24, 28, 10, '#fff'); p.ell(36, 0, 11, 8, '#ffb3c1'); p.circ(33, 0, 1.5, '#8a4a5a', { line: false }); p.circ(40, 0, 1.5, '#8a4a5a', { line: false });
      p.circ(28, -10, 2.2, '#2b1d14', { line: false }); p.circ(38, -12, 2.2, '#2b1d14', { line: false });
      p.poly([[22, -22], [18, -34], [27, -26]], '#f2e8c9'); p.poly([[36, -24], [42, -35], [42, -22]], '#f2e8c9'); p.ell(20, -22, 5, 3, '#fff', { rot: 0.6 });
      p.line(-26, -4, -34, 8, '#fff', 3, { outline: true }); p.circ(-34, 9, 2.4, '#2b2118', { line: false });
      if (bell) { p.circ(32, 8, 4, '#ffd23f'); p.line(26, 5, 40, 5, '#c0392b', 2.4); }
      if (ribbon) { p.poly([[-6, -14], [4, -14], [8, -2], [-2, -6], [-10, -2]], '#e63946'); p.circ(-1, -12, 5, '#ffd23f'); }
    }, x, y, 0, s);
    if (L === 1) { for (let i = 0; i < 6; i++) P.line(34 + i * 6, 76, 28 + i * 9, 48 - (i % 2) * 4, '#d9b84a', 2.6, { outline: true }); }
    else if (L === 2) { P.rr(22, 40, 56, 42, 8, '#d9b84a'); for (let k = 0; k < 5; k++) P.line(26, 48 + k * 7, 74, 46 + k * 7, '#a8873a', 1.5); P.line(22, 52, 78, 52, '#7a5a36', 3); P.line(22, 70, 78, 70, '#7a5a36', 3); }
    else if (L === 3) P.with(p => { p.rr(-18, -6, 36, 22, 9, '#f6e6c8'); p.rr(-16, 12, 6, 14, 2, '#f6e6c8'); p.rr(8, 12, 6, 14, 2, '#f6e6c8'); p.rr(10, -20, 22, 24, 9, '#f6e6c8'); p.ell(26, 0, 8, 6, '#ffb3c1'); p.circ(20, -10, 2.2, '#2b1d14', { line: false }); p.circ(30, -12, 2.2, '#2b1d14', { line: false }); p.ell(10, -20, 5, 3, '#f6e6c8', { rot: 0.5 }); p.ell(32, -22, 5, 3, '#f6e6c8', { rot: -0.5 }); }, 44, 58, 0, 1.3);
    else if (L === 4) cow(46, 54, 1.0, true, false, false);
    else if (L === 5) cow(46, 54, 1.1, false, false, false);
    else if (L === 6) cow(46, 54, 1.1, true, false, false);
    else if (L === 7) cow(46, 54, 1.1, true, true, false);
    else { cow(46, 54, 1.1, true, true, true); P.sparkle(18, 20, 7); P.sparkle(84, 28, 5); }
  },
  goat(P, L) {
    P.shadow();
    const goat = (x, y, s, body, horn, size = 1, extra) => P.with(p => {
      p.rr(-24, -8, 44, 26, 11, body); for (const px of [-22, -8, 8, 16]) p.rr(px, 14, 6, 16, 2, shade(body, -0.1));
      p.rr(14, -22, 22, 26, 9, body); p.ell(28, 2, 8, 6, shade(body, 0.2)); p.circ(22, -10, 2, '#2b1d14', { line: false }); p.circ(31, -12, 2, '#2b1d14', { line: false });
      p.curve(30, 6, 30, 16, 28, 20, '#e8dcc0', 3.5, { outline: true });
      const h = 9 * size; p.curve(18, -22, 10, -22 - h, 6, -24 - h * 1.2, horn, 4, { outline: true }); p.curve(30, -24, 38, -24 - h, 42, -26 - h * 1.2, horn, 4, { outline: true });
      p.ell(14, -14, 5, 3, body, { rot: 0.6 }); p.ell(38, -16, 5, 3, body, { rot: -0.6 }); p.line(-24, -2, -32, -8, body, 4, { outline: true });
      if (extra) extra(p);
    }, x, y + (size > 1 ? 10 : 0), 0, s * (size > 1 ? 0.88 : 1));
    if (L === 1) { for (let i = 0; i < 3; i++) { P.line(50, 86, 34 + i * 16, 56, '#5e8f3a', 2.5, { outline: true }); for (let k = 0; k < 3; k++) P.circ(34 + i * 16 + (k - 1) * 5, 52 + (k === 1 ? -4 : 0), 5.5, LEAFC); } }
    else if (L === 2) { P.blob([[22, 38], [50, 30], [78, 38], [82, 80], [18, 80]], '#d8c39a'); P.rr(30, 28, 40, 10, 3, '#a97a38'); P.curve(30, 48, 50, 56, 70, 48, '#7a5a36', 1.5); P.text('G', 50, 62, 18, '#fff5d8'); }
    else if (L === 3) goat(48, 54, 1.0, '#f6efe0', '#b9a37a', 0.4);
    else if (L === 4) goat(46, 54, 1.1, '#f1e6d0', '#b9a37a', 0.7);
    else if (L === 5) goat(46, 54, 1.15, '#e8dcc0', '#9a8458', 1);
    else if (L === 6) goat(46, 54, 1.2, '#cfc3a8', '#6e5a36', 1.6, p => { p.rr(-8, 2, 26, 8, 4, '#a89878', { line: false }); });
    else if (L === 7) { P.poly([[0, 90], [30, 50], [50, 70], [74, 38], [100, 90]], '#9da5ab'); goat(48, 50, 1.15, '#7e7466', '#d9c9a0', 1.9); }
    else { goat(46, 54, 1.2, '#fff4d2', '#ffd23f', 2, p => { p.sparkle(-6, -36, 7); }); P.sparkle(16, 22, 6); P.sparkle(86, 40, 5); }
  },
};
const LEAFC = '#6bbf59';

export const FOODS = {
  dairy(P, L) {
    P.shadow();
    if (L === 1) { P.blob([[50, 24], [66, 52], [64, 70], [50, 76], [36, 70], [34, 52]], '#f4faff'); P.shine(42, 54, 4, 10, 0.8); P.circ(50, 62, 0.1, '#fff', { line: false }); }
    else if (L === 2) { P.rr(30, 34, 40, 50, 10, '#e8f1f5'); P.rr(38, 24, 24, 14, 4, '#cfe0e8'); P.curve(70, 44, 90, 52, 70, 70, '#cfe0e8', 4, { outline: true }); P.rr(36, 50, 28, 14, 2, '#fff', { line: false }); P.shine(38, 56, 3, 12, 0.7); }
    else if (L === 3) { P.rr(24, 44, 52, 38, 8, '#c8934a'); P.ell(50, 46, 28, 8, '#fff4cf'); P.ell(50, 44, 22, 5, '#fffdf0', { line: false }); P.curve(24, 56, 10, 62, 24, 72, '#c8934a', 3.5, { outline: true }); }
    else if (L === 4) { P.poly([[16, 50], [60, 36], [88, 50], [88, 72], [44, 86], [16, 72]], '#ffe27a'); P.poly([[16, 50], [60, 36], [88, 50], [44, 64]], '#fff1a8'); P.line(44, 64, 44, 86, '#caa63a', 1.2); P.shine(30, 52, 8, 2.5, 0.6); }
    else if (L === 5) { P.blob([[18, 66], [26, 44], [50, 34], [76, 44], [84, 66], [70, 80], [32, 80]], '#fff6d6'); P.ell(40, 56, 4, 3, '#f1e3b3'); P.ell(62, 62, 5, 3.5, '#f1e3b3'); P.leaf(66, 36, 14, 5, -1.5, LEAFC); P.shine(34, 52, 8, 3, 0.7); }
    else if (L === 6) { P.ell(50, 62, 36, 22, '#ffd54a'); P.ell(50, 54, 36, 18, '#ffe27a'); P.poly([[50, 54], [86, 54], [74, 72]], '#fff', { line: false }); for (const [x, y] of [[30, 54], [62, 66], [46, 58]]) P.circ(x, y, 3.5, '#d9a61e', { lw: 1.2 }); }
    else { P.ell(50, 74, 42, 14, '#c8934a'); P.ell(50, 70, 38, 11, '#e8c186'); for (const [x, y, c] of [[30, 64, '#ffd54a'], [50, 60, '#fff6d6'], [68, 64, '#ffb347']]) { P.poly([[x - 9, y], [x + 9, y - 6], [x + 9, y + 8], [x - 9, y + 8]], c); } P.circ(24, 70, 3, '#7a1f3d'); P.circ(77, 70, 3, '#7a1f3d'); P.sparkle(78, 36, 6); }
  },
  meals(P, L) {
    P.shadow();
    const plate = (x, y, rx, ry) => { P.ell(x, y, rx, ry, '#fdfcf8'); P.ell(x, y - 1, rx * 0.78, ry * 0.7, '#eef2f5', { line: false }); };
    if (L === 1) { P.blob([[36, 70], [42, 58], [58, 56], [66, 68], [56, 76], [42, 76]], '#fffdf5'); P.circ(48, 66, 1.4, '#e6dcc0', { line: false }); }
    else if (L === 2) { P.circ(50, 62, 22, '#f4e0b0'); P.shine(42, 54, 8, 4, 0.7); P.circ(60, 70, 0.1, '#fff', { line: false }); }
    else if (L === 3) { P.ell(50, 62, 36, 18, '#e8c485'); P.ell(50, 60, 30, 13, '#f2d9a6', { line: false }); for (const [x, y] of [[36, 60], [52, 56], [62, 64]]) P.ell(x, y, 3, 2, '#c8934a', { line: false }); }
    else if (L === 4) { plate(50, 70, 36, 14); P.ell(38, 56, 18, 12, '#e9a43d'); P.ell(60, 58, 18, 12, '#f2b94f'); P.ell(50, 48, 18, 12, '#e9a43d'); P.shine(44, 44, 6, 3, 0.5); }
    else if (L === 5) { P.ell(50, 72, 34, 12, '#c9904e'); P.ell(50, 62, 36, 16, '#e8b36a'); P.ell(50, 60, 28, 11, '#ffe9a3'); for (const [x, y, c] of [[38, 58, '#e63946'], [52, 55, '#9bcb4a'], [62, 62, '#ffb347'], [46, 64, '#e63946']]) P.circ(x, y, 4.5, c, { lw: 1.4 }); }
    else if (L === 6) { P.rr(20, 52, 60, 32, 14, '#3a86a8'); P.ell(50, 52, 30, 10, '#f0a43a'); P.ell(50, 51, 24, 7, '#f7c35a', { line: false }); for (const [x, y] of [[40, 50], [56, 52], [50, 48]]) P.circ(x, y, 3, '#c0392b', { lw: 1.2 }); P.curve(34, 40, 30, 28, 36, 20, 'rgba(255,255,255,0.75)', 3); P.curve(52, 38, 48, 24, 54, 16, 'rgba(255,255,255,0.75)', 3); }
    else if (L === 7) { P.ell(50, 66, 42, 16, '#d6c6a8'); P.ell(50, 62, 38, 13, '#fffaf0'); P.blob([[22, 60], [40, 48], [60, 52], [64, 62], [40, 70]], '#f08a6a'); P.circ(70, 58, 8, '#9bcb4a'); P.circ(64, 66, 6, '#ffb347'); P.leaf(30, 56, 10, 4, 3.5, LEAFC); }
    else if (L === 8) { P.ell(50, 74, 44, 12, '#9c6b3a'); P.ell(50, 70, 40, 10, '#c8934a'); P.ell(32, 60, 14, 9, '#fff'); P.ell(50, 56, 13, 8, '#fff'); P.ell(68, 60, 14, 9, '#fff'); P.circ(32, 58, 7, '#f08a6a'); P.circ(50, 54, 6, '#9bcb4a'); P.circ(68, 58, 7, '#ffb347'); P.rr(20, 34, 60, 10, 5, '#e63946'); P.sparkle(20, 24, 5); }
    else { P.ell(50, 78, 46, 10, '#7a5230'); P.rr(10, 48, 80, 30, 4, '#c8934a'); P.ell(50, 48, 40, 10, '#e8c186'); for (let i = 0; i < 7; i++) P.circ(18 + i * 11, 44 + (i % 2) * 3, 6, ['#e63946', '#ffb347', '#9bcb4a', '#f08a6a', '#ffd23f', '#c77dff', '#ff8fa3'][i], { lw: 1.4 }); P.star(50, 20, 10, 5, '#ffd23f'); P.sparkle(14, 20, 6); P.sparkle(86, 24, 6); }
  },
  drinks(P, L) {
    P.shadow();
    const glass = (x, y, w, h, col, straw = true) => { P.poly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2 - 4, y + h / 2], [x - w / 2 + 4, y + h / 2]], 'rgba(235,248,255,0.65)'); P.poly([[x - w / 2 + 1.5, y - h / 6], [x + w / 2 - 1.5, y - h / 6], [x + w / 2 - 4.5, y + h / 2 - 1.5], [x - w / 2 + 4.5, y + h / 2 - 1.5]], col, { line: false }); if (straw) P.line(x + 4, y - h / 2 - 10, x + 2, y + h / 4, '#ff6b8a', 3, { outline: true }); P.shine(x - w / 3, y, 2, h / 3, 0.7); };
    if (L === 1) { P.circ(50, 62, 14, '#ffb347'); for (const [x, y] of [[30, 44], [70, 40], [24, 64], [76, 66], [40, 30]]) P.circ(x, y, 4, '#ffd27a', { lw: 1.4 }); }
    else if (L === 2) glass(50, 58, 36, 46, '#ffb347');
    else if (L === 3) { P.rr(26, 36, 40, 50, 8, 'rgba(235,248,255,0.65)'); P.rr(28, 52, 36, 32, 6, '#ff8a5c', { line: false }); P.curve(66, 46, 84, 52, 66, 72, '#cfe0e8', 4, { outline: true }); P.shine(32, 60, 2.5, 14, 0.7); P.circ(36, 34, 6, '#ffd54a'); }
    else if (L === 4) { glass(50, 58, 34, 52, '#c77dff'); P.ell(50, 34, 12, 5, '#fff', { lw: 1.2 }); P.circ(60, 28, 5, '#e63946'); }
    else if (L === 5) { glass(50, 60, 38, 46, '#ff6b4a'); P.leaf(40, 36, 18, 7, -2.2, LEAFC); P.circ(36, 34, 5, '#ffd54a'); P.circ(62, 34, 4, '#e63946'); P.poly([[58, 32], [70, 22], [72, 34]], '#ff8fa3'); }
    else if (L === 6) { P.poly([[30, 36], [70, 36], [54, 62], [46, 62]], 'rgba(235,248,255,0.65)'); P.poly([[34, 40], [66, 40], [54, 58], [46, 58]], '#56cfe1', { line: false }); P.line(50, 62, 50, 82, '#cfe0e8', 4, { outline: true }); P.ell(50, 84, 16, 4, '#cfe0e8'); P.circ(66, 36, 7, '#ffd54a'); P.sparkle(26, 30, 6); P.line(56, 24, 62, 38, '#ff6b8a', 3, { outline: true }); }
    else if (L === 7) { P.ell(50, 74, 42, 12, '#7a5230'); P.ell(50, 70, 40, 10, '#c8934a'); glass(30, 54, 18, 28, '#ff6b4a', false); glass(50, 50, 18, 30, '#56cfe1', false); glass(70, 54, 18, 28, '#9bcb4a', false); }
    else { P.rr(10, 54, 80, 34, 3, '#8a5d32'); P.rr(10, 50, 80, 8, 3, '#c8934a'); P.poly([[8, 22], [92, 22], [86, 8], [14, 8]], '#e63946'); for (let i = 0; i < 4; i++) P.poly([[14 + i * 20, 8], [24 + i * 20, 8], [28 + i * 20, 22], [18 + i * 20, 22]], '#fff', { line: false }); P.rr(14, 22, 4, 28, 1, WOODD); P.rr(82, 22, 4, 28, 1, WOODD); glass(50, 46, 14, 20, '#ff6b4a'); P.sparkle(76, 40, 5); }
  },
  sweets(P, L) {
    P.shadow();
    if (L === 1) { P.poly([[42, 74], [34, 50], [50, 28], [60, 48], [58, 74]], '#ffd0f0'); P.poly([[58, 74], [60, 48], [76, 58], [70, 76]], '#b8a3ff'); P.shine(44, 46, 3, 10, 0.7); }
    else if (L === 2) { P.circ(50, 58, 24, '#ff6b9a'); P.curve(30, 52, 50, 40, 70, 52, '#fff', 4); P.curve(30, 62, 50, 50, 70, 62, '#fff', 4); P.shine(40, 48, 6, 3, 0.7); P.poly([[22, 54], [10, 44], [10, 70]], '#ffb3d1'); P.poly([[78, 54], [90, 44], [90, 70]], '#ffb3d1'); }
    else if (L === 3) { P.blob([[26, 44], [50, 36], [74, 44], [80, 84], [20, 84]], '#7ad1ff'); P.curve(26, 46, 50, 54, 74, 46, '#ff6b9a', 6, { outline: true }); for (const [x, y, c] of [[40, 24, '#ff6b9a'], [54, 22, '#ffd54a'], [64, 30, '#9bcb4a']]) P.circ(x, y, 7, c); P.circ(50, 66, 8, '#fff', { line: false }); }
    else if (L === 4) { P.poly([[26, 52], [74, 52], [68, 86], [32, 86]], '#ffd0e8'); for (let i = 0; i < 4; i++) P.line(34 + i * 10, 54, 36 + i * 8, 84, '#ff9fc9', 1.4); P.blob([[22, 52], [28, 36], [50, 28], [72, 36], [78, 52]], '#fff'); P.circ(50, 24, 6, '#e63946'); }
    else if (L === 5) { P.rr(16, 62, 68, 22, 5, '#ffd0e8'); P.rr(16, 40, 68, 22, 5, '#b8f0d8'); P.rr(16, 62, 68, 6, 3, '#fff', { line: false }); P.rr(16, 40, 68, 6, 3, '#fff', { line: false }); P.rr(16, 28, 68, 12, 4, '#fff'); for (const x of [26, 42, 58, 74]) P.circ(x, 24, 4, ['#e63946', '#ffd54a', '#9bcb4a', '#7ad1ff'][(x / 16) | 0 & 3]); }
    else if (L === 6) { for (let i = 0; i < 3; i++) P.rr(26 + i * 4, 70 - i * 22, 48 - i * 8, 18, 6, ['#ff6b9a', '#ffd54a', '#7ad1ff'][i]); P.rr(40, 28, 20, 14, 4, '#b8f0d8'); P.circ(50, 24, 6, '#e63946'); P.sparkle(80, 30, 5); }
    else { P.poly([[14, 50], [50, 18], [86, 50], [86, 86], [14, 86]], '#b9742f'); P.poly([[10, 54], [50, 14], [90, 54], [80, 54], [50, 26], [20, 54]], '#fff'); P.rr(40, 60, 20, 26, 4, '#7a4a1e'); P.rr(22, 58, 14, 14, 2, '#ffd54a'); P.rr(64, 58, 14, 14, 2, '#ffd54a'); for (let i = 0; i < 4; i++) P.circ(24 + i * 17, 48, 3.5, ['#e63946', '#9bcb4a', '#7ad1ff', '#ffd54a'][i], { lw: 1.2 }); P.sparkle(84, 20, 6); }
  },
};

export const TREASURE = {
  coins(P, L) {
    P.shadow();
    const coin = (x, y, r, col) => { P.circ(x, y, r, col); P.circ(x, y, r * 0.68, 'rgba(0,0,0,0)', { lw: 1.2, stroke: shade(col, -0.35) }); P.text('$', x, y + 0.5, r * 1.05, shade(col, -0.35), { outline: false }); P.shine(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, 0.6); };
    const cols = ['#cd7f32', '#c0c8cf', '#ffd23f'];
    if (L <= 3) coin(50, 56, 28, cols[L - 1]);
    else if (L === 4) { for (const [x, y, c] of [[30, 70, 0], [56, 72, 1], [44, 60, 2], [68, 60, 2], [32, 50, 1], [52, 46, 2]]) coin(x, y, 14, cols[c]); }
    else if (L === 5) { for (let i = 0; i < 4; i++) { P.ell(50, 78 - i * 12, 28, 8, '#ffd23f'); P.rr(22, 70 - i * 12, 56, 8, 0, '#e6b422', { line: false }); } P.ell(50, 38, 28, 8, '#ffe27a'); P.sparkle(76, 24, 5); }
    else if (L === 6) { P.blob([[24, 44], [36, 30], [64, 30], [78, 46], [84, 82], [18, 82]], '#c8934a'); P.rr(32, 28, 36, 8, 4, '#8a5d32'); P.line(34, 36, 66, 36, '#e63946', 3); P.text('$', 50, 62, 26, '#ffd23f'); }
    else if (L === 7) { P.rr(14, 44, 72, 44, 5, '#8a5d32'); P.poly([[14, 44], [20, 22], [80, 22], [86, 44]], '#a87440'); P.rr(14, 44, 72, 6, 2, '#ffd23f', { line: false }); for (const [x, y] of [[30, 38], [50, 34], [68, 38]]) coin(x, y, 9, '#ffd23f'); P.rr(44, 52, 12, 12, 3, '#ffd23f'); P.circ(50, 58, 2, '#8a5d32', { line: false }); }
    else { P.ell(50, 80, 44, 10, '#c9962b'); for (let i = 0; i < 10; i++) coin(18 + (i % 5) * 16, 70 - Math.floor(i / 5) * 14, 11, '#ffd23f'); coin(50, 40, 14, '#fff0a0'); P.rr(30, 22, 40, 14, 4, '#ffd23f'); P.sparkle(22, 24, 7); P.sparkle(80, 30, 6); P.sparkle(50, 8, 5); }
  },
  sparks(P, L) {
    P.shadow(50, 90, 22, 4, 0.18);
    const glowc = ['#ffe566', '#ffd23f', '#ffb347', '#ff9f1c', '#ff7b00', '#ff5a36'][L - 1];
    P.circ(50, 52, 30, 'rgba(255,230,120,0.28)', { line: false });
    if (L === 1) { P.star(50, 52, 24, 4, '#ffe566', { inner: 8 }); }
    else if (L === 2) { P.circ(50, 52, 18, '#ffe566'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.line(50 + Math.cos(a) * 22, 52 + Math.sin(a) * 22, 50 + Math.cos(a) * 30, 52 + Math.sin(a) * 30, '#ffd23f', 3, { outline: true }); } P.shine(43, 45, 6, 3, 0.8); }
    else if (L === 3) { P.circ(50, 52, 26, '#ffd23f'); P.circ(50, 52, 16, '#fff3a0', { line: false }); P.star(50, 52, 12, 4, '#fff', { inner: 4, line: false }); P.shine(40, 42, 8, 4, 0.7); }
    else if (L === 4) { P.rr(34, 36, 32, 46, 8, '#ffb347'); P.rr(38, 40, 24, 38, 6, '#fff3a0', { line: false }); P.rr(40, 26, 20, 12, 4, '#8a5d32'); P.curve(40, 26, 50, 8, 60, 26, '#8a5d32', 3, { outline: true }); P.star(50, 58, 8, 4, '#ff9f1c', { inner: 3 }); }
    else if (L === 5) { P.circ(50, 52, 24, '#ff9f1c'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; P.poly([[50 + Math.cos(a - 0.12) * 24, 52 + Math.sin(a - 0.12) * 24], [50 + Math.cos(a) * 36, 52 + Math.sin(a) * 36], [50 + Math.cos(a + 0.12) * 24, 52 + Math.sin(a + 0.12) * 24]], '#ffd23f', { lw: 1.4 }); } P.circ(50, 52, 14, '#fff0a0', { line: false }); P.shine(43, 45, 5, 3, 0.8); }
    else { P.circ(50, 52, 30, '#ff7b00'); P.circ(50, 52, 22, '#ffb347', { line: false }); P.circ(50, 52, 13, '#fff3a0', { line: false }); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4; P.sparkle(50 + Math.cos(a) * 38, 52 + Math.sin(a) * 38, 5); } P.shine(40, 42, 8, 4, 0.8); }
  },
  pearls(P, L) {
    P.shadow(50, 90, 24, 4, 0.18);
    const shell = L <= 2;
    const cols = ['#f4f1ea', '#f4f1ea', '#f4e8ee', '#ffc0d6', '#3a3d4a', '#fff2bd'];
    const pearl = (x, y, r, col) => { P.circ(x, y, r, col); P.shine(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.17, 0.85); };
    if (L === 1) { P.blob([[34, 62], [40, 48], [56, 46], [66, 58], [58, 70], [42, 70]], '#f4f1ea'); P.sparkle(66, 42, 5, '#fff'); }
    else if (L === 2) pearl(50, 56, 15, cols[1]);
    else if (L === 3) pearl(50, 56, 22, cols[2]);
    else if (L === 4) pearl(50, 56, 24, cols[3]);
    else if (L === 5) { P.circ(50, 56, 24, '#2d303c'); P.circ(50, 56, 24, 'rgba(0,0,0,0)', { line: false }); P.ell(42, 46, 8, 4, 'rgba(120,255,220,0.5)', { line: false, rot: -0.6 }); P.ell(58, 66, 8, 3, 'rgba(200,120,255,0.5)', { line: false, rot: -0.6 }); P.shine(40, 44, 5, 3, 0.9); }
    else { pearl(50, 58, 21, cols[5]); P.poly([[28, 40], [36, 28], [43, 38], [50, 22], [57, 38], [64, 28], [72, 40], [72, 46], [28, 46]], '#ffd23f'); for (const x of [36, 50, 64]) P.circ(x, 40, 2, '#e63946', { lw: 1 }); }
    if (L >= 3 && L < 6) P.sparkle(74, 32, 5, '#fff');
  },
  chest(P, L) {
    P.shadow();
    const tiers = [
      { b: '#a8713a', l: '#c99a58', m: '#7d4f24' },
      { b: '#8a5d32', l: '#b9854f', m: '#c0c6cb' },
      { b: '#c9962b', l: '#ffd23f', m: '#8a5d1e' },
      { b: '#9aa5ad', l: '#dfe6ea', m: '#4d5a63' },
      { b: '#e6b422', l: '#fff0a0', m: '#b57f12' },
    ][L - 1];
    if (L === 1) { P.rr(14, 54, 72, 32, 3, tiers.b); for (let i = 0; i < 4; i++) P.line(14, 60 + i * 7, 86, 60 + i * 7, tiers.m, 1.4); P.rr(14, 44, 72, 12, 3, tiers.l); P.line(30, 44, 30, 56, tiers.m, 1.6); P.line(70, 44, 70, 56, tiers.m, 1.6); P.rr(44, 52, 12, 10, 2, '#c0c6cb'); return; }
    P.rr(14, 46, 72, 40, 5, tiers.b); P.poly([[14, 46], [18, 22], [82, 22], [86, 46]], tiers.l);
    P.rr(14, 42, 72, 8, 2, tiers.m, { flat: true }); P.rr(40, 40, 20, 22, 4, L === 2 ? '#c0c6cb' : '#ffe27a'); P.circ(50, 51, 3, '#3a2a1e', { line: false }); P.rr(48.5, 51, 3, 7, 1, '#3a2a1e', { line: false });
    for (const x of [24, 76]) P.line(x, 24, x + (x < 50 ? -1 : 1), 86, tiers.m, 3.6, { outline: true });
    if (L >= 3) P.sparkle(80, 20, 6); if (L >= 4) P.sparkle(18, 28, 5); if (L >= 5) { P.ell(50, 54, 40, 36, 'rgba(255,230,120,0.25)', { line: false }); P.sparkle(50, 10, 7); }
  },
};

export const SEA = {
  sea(P, L) {
    const water = (a = 0.0) => P.ell(50, 78, 38, 9, 'rgba(70,160,200,0.25)', { line: false });
    water();
    if (L === 1) { for (const [x, y] of [[34, 46], [48, 60], [62, 44], [54, 34], [40, 66], [68, 62]]) P.circ(x, y, 5.5, '#9be0a0', { lw: 1.4 }); }
    else if (L === 2) { P.blob([[24, 54], [40, 40], [62, 42], [74, 56], [60, 66], [38, 66]], '#ff9a76'); P.poly([[72, 52], [88, 44], [86, 66]], '#ffb59a'); P.circ(34, 50, 2.2, '#2b1d14', { line: false }); for (let i = 0; i < 4; i++) P.line(36 + i * 8, 66, 34 + i * 8, 76, '#ff9a76', 2, { outline: true }); }
    else if (L === 3) { P.blob([[12, 54], [34, 38], [66, 40], [84, 54], [66, 66], [34, 68]], '#9fb4c8'); P.poly([[80, 54], [94, 40], [94, 68]], '#7f95aa'); P.circ(24, 52, 2.4, '#2b1d14', { line: false }); P.ell(48, 58, 24, 6, '#e8eef3', { line: false }); }
    else if (L === 4) { P.blob([[14, 54], [34, 36], [64, 38], [80, 54], [64, 70], [34, 70]], '#ff7a1f'); P.poly([[78, 54], [94, 38], [94, 70]], '#ff7a1f'); P.rr(36, 38, 8, 32, 2, '#fff', { line: true }); P.rr(58, 40, 7, 28, 2, '#fff', { line: true }); P.circ(26, 50, 2.6, '#2b1d14', { line: false }); P.shine(40, 44, 8, 3, 0.4); }
    else if (L === 5) { P.blob([[40, 20], [58, 22], [58, 38], [50, 46], [54, 66], [46, 84], [36, 66], [42, 46]], '#ffc83d'); P.circ(54, 28, 2, '#2b1d14', { line: false }); P.poly([[58, 26], [72, 28], [58, 32]], '#ffb21f'); P.curve(46, 84, 30, 84, 32, 72, '#ffc83d', 3.5, { outline: true }); for (let i = 0; i < 4; i++) P.line(40, 44 + i * 6, 48, 46 + i * 6, '#e29a14', 1.6); }
    else if (L === 6) { P.blob([[16, 56], [30, 38], [58, 34], [80, 46], [82, 62], [56, 74], [30, 70]], '#6aa84f'); P.blob([[26, 56], [38, 44], [60, 42], [72, 52], [56, 66], [34, 64]], '#8bc34a', { line: false }); for (const [x, y] of [[44, 52], [56, 48], [64, 58], [40, 62]]) P.poly([[x - 4, y], [x, y - 4], [x + 4, y], [x, y + 4]], '#5b8c3a', { line: false }); P.circ(80, 52, 8, '#8bc34a'); P.circ(83, 50, 1.8, '#2b1d14', { line: false }); P.ell(26, 74, 10, 5, '#6aa84f'); P.ell(64, 76, 10, 5, '#6aa84f'); }
    else if (L === 7) { P.blob([[8, 58], [26, 40], [56, 38], [84, 50], [92, 40], [90, 66], [60, 70], [30, 72]], '#6b93b8'); P.blob([[22, 62], [44, 54], [74, 58], [56, 70], [32, 70]], '#e8f2f8', { line: false }); P.circ(26, 52, 2.4, '#2b1d14', { line: false }); P.poly([[44, 40], [50, 20], [60, 40]], '#5a7fa3'); }
    else if (L === 8) { P.poly([[8, 50], [50, 30], [92, 50], [78, 62], [50, 80], [22, 62]], '#4a5f7a'); P.poly([[50, 30], [92, 50], [78, 62], [50, 56]], '#667d9a'); P.poly([[50, 80], [50, 92], [54, 80]], '#4a5f7a', { lw: 1.6 }); P.circ(36, 50, 2, '#e8eef3', { line: false }); P.circ(64, 50, 2, '#e8eef3', { line: false }); P.line(40, 56, 60, 56, '#e8eef3', 1.4); }
    else { P.blob([[8, 58], [24, 36], [60, 32], [90, 52], [84, 70], [50, 76], [20, 72]], '#3b6ea5'); P.blob([[18, 64], [44, 58], [80, 64], [50, 74], [24, 72]], '#e8f2f8', { line: false }); P.circ(30, 50, 2.8, '#fff', { line: false }); P.circ(30, 50, 1.4, '#1c2b3a', { line: false }); P.curve(40, 28, 40, 14, 34, 8, '#9fd8ff', 3); P.curve(46, 28, 52, 12, 60, 10, '#9fd8ff', 3); P.poly([[88, 56], [98, 44], [98, 70]], '#2f5a8a'); }
  },
  shells(P, L) {
    P.shadow();
    if (L === 1) { P.blob([[34, 66], [44, 52], [62, 54], [68, 68], [52, 74]], '#f7d9c4'); P.line(46, 56, 50, 70, '#e0b69e', 1.3); }
    else if (L === 2) { P.blob([[18, 66], [30, 40], [50, 34], [70, 40], [82, 66], [50, 80]], '#ffd6e0'); for (let i = -3; i <= 3; i++) P.line(50, 76, 50 + i * 10, 42 + Math.abs(i) * 3, '#e89ab0', 1.5); P.shine(36, 50, 6, 3, 0.7); }
    else if (L === 3) { P.blob([[22, 64], [28, 44], [50, 34], [74, 44], [80, 66], [62, 80], [38, 78]], '#f4c7a3'); P.curve(34, 62, 36, 44, 56, 42, '#c98b6a', 3); P.curve(44, 62, 46, 52, 58, 50, '#c98b6a', 3); P.circ(52, 58, 3, '#c98b6a', { line: false }); P.poly([[68, 66], [88, 72], [70, 76]], '#f4c7a3'); }
    else if (L === 4) { P.star(50, 54, 38, 5, '#ff8a5c', { inner: 15 }); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; P.line(50, 54, 50 + Math.cos(a) * 28, 54 + Math.sin(a) * 28, '#ffc3a0', 1.6); P.circ(50 + Math.cos(a) * 20, 54 + Math.sin(a) * 20, 1.6, '#ffd9c4', { line: false }); } P.shine(44, 42, 6, 3, 0.5); }
    else if (L === 5) { P.curve(50, 90, 50, 60, 50, 40, '#e85d75', 6, { outline: true }); P.curve(50, 62, 34, 52, 26, 30, '#e85d75', 5, { outline: true }); P.curve(50, 54, 66, 44, 74, 22, '#e85d75', 5, { outline: true }); P.curve(50, 44, 52, 28, 46, 12, '#e85d75', 5, { outline: true }); for (const [x, y] of [[26, 30], [74, 22], [46, 12], [50, 40]]) P.circ(x, y, 4, '#ff9aa9', { lw: 1.4 }); }
    else if (L === 6) { P.line(50, 92, 50, 70, '#b13e6a', 5, { outline: true }); P.poly([[50, 72], [8, 38], [26, 20], [50, 14], [74, 20], [92, 38]], '#ff6b9a'); for (let i = -3; i <= 3; i++) P.line(50, 72, 50 + i * 12, 20 + Math.abs(i) * 4, '#c93d6e', 1.4); P.shine(34, 32, 8, 3, 0.5); }
    else { P.ell(50, 84, 42, 8, '#e8d9a8'); P.curve(18, 84, 14, 56, 20, 36, '#ff6b9a', 6, { outline: true }); P.curve(40, 84, 40, 48, 36, 20, '#ff9a3c', 6, { outline: true }); P.curve(62, 84, 66, 50, 70, 26, '#b86bff', 6, { outline: true }); P.curve(82, 84, 84, 60, 80, 44, '#47d1c4', 6, { outline: true }); P.star(30, 66, 8, 5, '#ff8a5c', { lw: 1.4 }); P.circ(60, 70, 7, '#ffd6e0'); P.sparkle(78, 20, 6); }
  },
};

export const MAGIC = {
  amulet(P, L) {
    P.shadow(50, 92, 22, 4, 0.16);
    if (L === 1) { P.circ(50, 52, 24, 'rgba(160,255,230,0.3)', { line: false }); P.blob([[50, 20], [64, 40], [58, 64], [50, 80], [42, 64], [36, 40]], 'rgba(190,255,240,0.85)'); P.circ(44, 44, 2.2, '#2b3a45', { line: false }); P.circ(56, 44, 2.2, '#2b3a45', { line: false }); P.shine(42, 34, 3, 8, 0.8); }
    else if (L === 2) { P.poly([[26, 34], [48, 24], [46, 56], [30, 62]], '#7fd1c4'); P.poly([[52, 44], [76, 36], [72, 74], [54, 70]], '#5bb8c9'); P.sparkle(78, 26, 6, '#fff'); }
    else if (L === 3) { P.poly([[50, 14], [72, 40], [62, 82], [38, 82], [28, 40]], '#5bb8c9'); P.poly([[50, 14], [72, 40], [50, 52]], '#8fe3ee', { line: false }); P.line(50, 52, 38, 82, '#2f7f8f', 1.4); P.line(50, 52, 62, 82, '#2f7f8f', 1.4); P.line(28, 40, 50, 52, '#2f7f8f', 1.4); P.sparkle(78, 24, 5, '#fff'); }
    else if (L === 4) { P.curve(26, 20, 50, 4, 74, 20, '#c9962b', 3, { outline: true }); P.circ(50, 56, 28, '#e6b422'); P.circ(50, 56, 22, '#3d8f8f'); P.star(50, 56, 14, 4, '#bff5ea', { inner: 5 }); P.circ(50, 56, 22, 'rgba(0,0,0,0)', { lw: 1.6, stroke: '#7a5a14' }); P.shine(38, 42, 6, 3, 0.5); }
    else { P.curve(22, 18, 50, 0, 78, 18, '#c9962b', 3, { outline: true }); P.ell(50, 54, 36, 36, 'rgba(160,255,230,0.3)', { line: false }); P.circ(50, 56, 28, '#ffd23f'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; P.circ(50 + Math.cos(a) * 25, 56 + Math.sin(a) * 25, 3, '#7a5a14', { line: false }); } P.circ(50, 56, 20, '#2f8f8f'); P.star(50, 56, 16, 6, '#e0fff8', { inner: 6 }); P.circ(50, 56, 5, '#ffd23f'); P.sparkle(16, 26, 7); P.sparkle(86, 36, 6); }
  },
  lantern(P, L) {
    P.shadow(50, 92, 22, 4, 0.16);
    const glow = (x, y, r, a = 0.35) => P.circ(x, y, r, `rgba(255,230,120,${a})`, { line: false });
    const paper = (x, y, s, col) => P.with(p => { p.line(0, -34, 0, -26, '#8a5d32', 2); p.blob([[-18, -22], [0, -28], [18, -22], [24, 0], [18, 22], [0, 28], [-18, 22], [-24, 0]], col); p.rr(-10, -30, 20, 6, 2, '#8a5d32'); p.rr(-10, 24, 20, 6, 2, '#8a5d32'); for (const k of [-10, 0, 10]) p.line(k, -24, k * 1.2, 24, shade(col, -0.25), 1.2); p.line(-3, 30, -3, 40, '#e63946', 2); p.line(3, 30, 3, 40, '#e63946', 2); }, x, y, 0, s);
    if (L === 1) { glow(50, 52, 26, 0.3); P.ell(50, 52, 9, 7, '#2b3a45'); P.ell(50, 56, 7, 5, '#ffe566'); P.circ(50, 62, 4, '#ffe566', { line: false }); P.curve(44, 46, 38, 36, 32, 38, '#a9bcc8', 3); P.curve(56, 46, 62, 36, 68, 38, '#a9bcc8', 3); }
    else if (L === 2) { glow(50, 56, 30); P.rr(32, 34, 36, 50, 9, 'rgba(220,245,255,0.7)'); P.rr(34, 40, 32, 42, 7, 'rgba(255,230,120,0.35)', { line: false }); P.rr(32, 28, 36, 8, 3, '#8a5d32'); P.circ(50, 62, 6, '#ffe566'); P.circ(42, 70, 2.4, '#ffe566', { line: false }); P.circ(58, 52, 2.4, '#ffe566', { line: false }); }
    else if (L === 3) { glow(50, 52, 32, 0.3); paper(50, 52, 1.25, '#ff7a59'); }
    else if (L === 4) { P.curve(8, 24, 50, 44, 92, 24, '#8a5d32', 2.4); const cols = ['#ff7a59', '#ffd23f', '#6bbf59', '#56b6e8', '#c77dff']; for (let i = 0; i < 5; i++) { const t = i / 4, x = 14 + t * 72, y = 28 + Math.sin(t * Math.PI) * 14; glow(x, y + 12, 12, 0.3); paper(x, y + 12, 0.42, cols[i]); } }
    else if (L === 5) { glow(50, 52, 34, 0.35); P.with(p => { p.star(0, 0, 32, 5, '#ffd23f', { inner: 15 }); p.star(0, 0, 18, 5, '#fff3a0', { inner: 8, line: false }); }, 50, 52); P.line(50, 14, 50, 6, '#8a5d32', 2); }
    else if (L === 6) { glow(50, 52, 38, 0.3); P.circ(50, 52, 28, '#fff6d6'); P.circ(60, 46, 24, '#f6e8b0', { line: false }); P.circ(40, 62, 3, '#e5d79a', { line: false }); P.circ(54, 66, 2.4, '#e5d79a', { line: false }); P.rr(38, 82, 24, 6, 3, '#8a5d32'); P.rr(44, 78, 12, 6, 1, '#8a5d32'); P.shine(40, 40, 6, 3, 0.8); }
    else { glow(50, 46, 42, 0.35); paper(50, 44, 1.5, '#ffd23f'); P.sparkle(18, 22, 7); P.sparkle(84, 26, 6); P.sparkle(80, 74, 5); }
  },
};

export const CREATURES = {
  dragon(P, L) {
    P.shadow();
    const col = ['#fff', '#ffe6c9', '#7fd36b', '#6bbf59', '#4aa84a', '#ff7a3c', '#4a8fe0', '#8a6ad8', '#ffbe2e'][L - 1];
    const egg = (c, spots, glow) => { if (glow) P.circ(50, 54, 34, 'rgba(255,170,80,0.35)', { line: false }); P.ell(50, 56, 22, 28, c); for (const [x, y] of spots) P.poly([[x, y - 6], [x + 6, y + 4], [x - 6, y + 4]], shade(c, -0.25), { lw: 1.3 }); P.shine(40, 42, 4, 10, 0.5); };
    if (L === 1) egg('#e8e1f2', [[40, 48], [56, 40], [58, 64], [42, 70]]);
    else if (L === 2) egg('#ffd6a8', [[40, 48], [56, 40], [58, 64], [42, 70]], true);
    else {
      const sc = 0.66 + 0.05 * L; const wing = L >= 3 ? Math.min(0.8, 0.4 + (L - 2) * 0.1) : 0;
      P.with(p => {
        if (L >= 4) p.poly([[-12, -4], [-48 * wing - 14, -34 * wing - 10], [-30 * wing - 14, -4], [-40 * wing - 10, 12 * wing], [-10, 6]], shade(col, -0.15));
        if (L >= 4) p.poly([[12, -4], [48 * wing + 14, -34 * wing - 10], [30 * wing + 14, -4], [40 * wing + 10, 12 * wing], [10, 6]], shade(col, -0.15));
        p.curve(-12, 22, -36, 28, -42, 8, col, 8, { outline: true }); p.poly([[-44, 4], [-52, 0], [-44, 12]], shade(col, 0.2));
        p.ell(0, 12, 22, 22, col); p.ell(0, 16, 12, 16, shade(col, 0.45), { line: false });
        p.circ(0, -16, 17, col); p.ell(0, -8, 10, 7, shade(col, 0.3)); p.circ(-3, -7, 1.2, '#2b1d14', { line: false }); p.circ(3, -7, 1.2, '#2b1d14', { line: false });
        p.poly([[-12, -28], [-8, -42], [-3, -30]], '#f4e3b0'); p.poly([[12, -28], [8, -42], [3, -30]], '#f4e3b0');
        eyes(p, 0, -18, 7, 3.2); p.ell(-10, 30, 7, 5, col); p.ell(10, 30, 7, 5, col);
        if (L >= 6) { p.poly([[0, -2], [-5, 4], [5, 4]], '#ff7a1f'); }
        if (L >= 9) p.sparkle(22, -34, 7);
      }, 50, 52, 0, sc);
      if (L >= 9) { P.sparkle(14, 20, 6); P.sparkle(88, 70, 5); }
    }
  },
  pet(P, L, N, info) {
    P.shadow();
    const sp = info?.sp || 'marlow';
    const hue = { pip: '#e63946', coco: '#8d6e63', shelly: '#2a9d8f', biscuit: '#d4a373', mochi: '#bcb8b1', marlow: '#6c757d' }[sp] || '#ff9a55';
    const egg = spots => { P.ell(50, 56, 22, 28, '#f6f2ea'); if (spots) for (const [x, y] of [[40, 48], [58, 42], [56, 66], [42, 70]]) P.circ(x, y, 3.6, hue, { lw: 1.2 }); P.shine(40, 42, 4, 10, 0.6); };
    if (L === 1) egg(false); else if (L === 2) egg(true);
    else {
      const s = 0.62 + L * 0.075;
      P.with(p => {
        const light = shade(hue, 0.5);
        if (sp === 'shelly') p.ell(0, 12, 26, 20, '#1f7a6e');
        if (sp === 'pip') { p.poly([[-14, 20], [-30, 36], [-20, 40], [-8, 28]], '#ffb703'); p.poly([[14, 20], [30, 36], [20, 40], [8, 28]], '#3a86ff'); }
        p.ell(0, 14, 20, 18, hue); p.ell(0, 18, 11, 12, light, { line: false });
        if (sp === 'shelly') { p.ell(0, 12, 22, 14, '#2a9d8f'); for (const [x, y] of [[-10, 10], [0, 6], [10, 10], [0, 16]]) p.poly([[x - 5, y], [x, y - 4], [x + 5, y], [x, y + 4]], '#3dbfae', { lw: 1.2 }); }
        p.circ(0, -10, 20, hue); p.ell(0, -4, 12, 9, light, { line: false });
        if (sp === 'marlow') { p.poly([[-18, -20], [-14, -38], [-5, -24]], hue); p.poly([[18, -20], [14, -38], [5, -24]], hue); p.poly([[-15, -24], [-13, -33], [-8, -26]], '#ffb3c1', { line: false }); p.poly([[15, -24], [13, -33], [8, -26]], '#ffb3c1', { line: false }); for (const k of [-1, 1]) { p.line(k * 8, -3, k * 22, -6, '#fff', 1); p.line(k * 8, -1, k * 22, 1, '#fff', 1); } }
        if (sp === 'biscuit') { p.ell(-20, -10, 7, 14, shade(hue, -0.25), { rot: 0.3 }); p.ell(20, -10, 7, 14, shade(hue, -0.25), { rot: -0.3 }); }
        if (sp === 'coco') { p.circ(-19, -12, 7, hue); p.circ(19, -12, 7, hue); p.circ(-19, -12, 3.5, light, { line: false }); p.circ(19, -12, 3.5, light, { line: false }); }
        if (sp === 'mochi') { p.ell(-8, -12, 6, 8, '#6b5d52', { rot: 0.5 }); p.ell(8, -12, 6, 8, '#6b5d52', { rot: -0.5 }); }
        if (sp === 'shelly') { p.circ(-18, -4, 4, hue); p.circ(18, -4, 4, hue); }
        if (sp === 'pip') { p.poly([[-4, -28], [0, -40], [4, -28], [8, -38], [8, -26]], '#ffb703'); }
        eyes(p, 0, -12, 8, 3.2);
        if (sp === 'pip') p.poly([[-5, -8], [5, -8], [0, 2]], '#ffb703'); else p.circ(0, -6, 2.4, '#2b1d14', { line: false });
        blush(p, 0, -5, 12, 3.2);
        if (sp !== 'pip' && sp !== 'shelly') p.curve(18, 20, 36, 14, 32, -4, hue, 7, { outline: true });
        p.ell(-9, 30, 7, 4.5, hue); p.ell(9, 30, 7, 4.5, hue);
        if (L >= 6) { p.sparkle(24, -34, 7); p.circ(0, 4, 3, '#ffd23f'); }
      }, 50, 50, 0, s);
      if (L >= 6) { P.sparkle(14, 22, 6); P.sparkle(86, 44, 5); }
    }
  },
  penguin(P, L) {
    P.shadow();
    const peng = (s, emp, chick) => P.with(p => {
      p.ell(0, 6, chick ? 18 : 21, chick ? 22 : 28, chick ? '#9aa5b5' : '#2b3a52'); p.ell(0, 10, chick ? 11 : 14, chick ? 15 : 21, '#fff', { line: false });
      p.circ(0, -22, chick ? 14 : 15, chick ? '#9aa5b5' : '#2b3a52'); p.ell(0, -18, 10, 8, '#fff', { line: false });
      eyes(p, 0, -24, 6, 2.6); p.poly([[-4, -18], [4, -18], [0, -12]], '#ff9f1c');
      p.ell(-20, 6, 5, 14, chick ? '#7d8899' : '#1f2a3d', { rot: 0.2 }); p.ell(20, 6, 5, 14, chick ? '#7d8899' : '#1f2a3d', { rot: -0.2 });
      p.ell(-8, 32, 8, 3.5, '#ff9f1c'); p.ell(8, 32, 8, 3.5, '#ff9f1c');
      if (emp) { p.rr(-9, -8, 18, 6, 3, '#ffd23f'); p.ell(-14, -22, 4, 6, '#ffd23f', { line: false }); p.ell(14, -22, 4, 6, '#ffd23f', { line: false }); p.sparkle(24, -38, 6); }
    }, 50, 52, 0, s);
    if (L === 1) { P.circ(50, 62, 22, '#f4fbff'); P.circ(40, 52, 7, '#fff', { line: false }); P.shine(40, 52, 5, 3, 0.9); P.sparkle(70, 40, 5, '#fff'); }
    else if (L === 2) { P.poly([[20, 66], [30, 40], [52, 30], [76, 42], [82, 66], [60, 78], [34, 76]], '#bfe9ff'); P.poly([[30, 40], [52, 30], [46, 54]], '#e6f7ff', { line: false }); P.line(46, 54, 36, 76, '#7fbfe0', 1.2); P.line(46, 54, 76, 42, '#7fbfe0', 1.2); }
    else if (L === 3) { P.ell(50, 56, 22, 28, '#e8f7ff'); for (const [x, y] of [[40, 48], [58, 42], [56, 66], [42, 70]]) P.circ(x, y, 3.4, '#8bd0f5', { lw: 1.2 }); P.shine(40, 42, 4, 10, 0.6); }
    else if (L === 4) peng(0.85, false, true);
    else if (L === 5) peng(0.92, false, false);
    else if (L === 6) peng(1.0, false, false);
    else peng(1.1, true, false);
  },
};

export const SPECIAL = {
  supplies(P, L) {
    P.shadow();
    const paper = '#f4e3b0';
    if (L === 1) { P.blob([[22, 36], [40, 28], [64, 36], [76, 54], [64, 68], [40, 72], [26, 60]], paper); P.curve(32, 48, 44, 40, 54, 52, '#c0392b', 1.6); P.curve(46, 60, 56, 56, 64, 60, '#7a5a36', 1.4); P.line(36, 58, 44, 64, '#c0392b', 2); P.line(44, 58, 36, 64, '#c0392b', 2); }
    else if (L === 2) { P.poly([[18, 30], [82, 30], [78, 74], [22, 74]], paper); P.curve(24, 56, 40, 40, 58, 54, '#6aa84f', 3); P.curve(58, 54, 70, 46, 76, 58, '#6aa84f', 3); P.line(60, 38, 70, 48, '#c0392b', 3); P.line(70, 38, 60, 48, '#c0392b', 3); }
    else if (L === 3) { P.rr(14, 26, 72, 52, 3, '#fff1c8'); P.circ(50, 52, 18, 'rgba(0,0,0,0)', { lw: 1.6, stroke: '#5b8fb9' }); P.circ(50, 52, 9, 'rgba(0,0,0,0)', { lw: 1.4, stroke: '#5b8fb9' }); P.line(50, 30, 50, 74, '#5b8fb9', 1.2); P.line(28, 52, 72, 52, '#5b8fb9', 1.2); P.star(70, 36, 7, 4, '#c0392b', { inner: 2.6 }); }
    else if (L === 4) { P.with(p => { p.rr(-34, -8, 30, 16, 4, '#c9962b'); p.rr(-8, -11, 22, 22, 4, '#e6b422'); p.rr(12, -8, 24, 16, 4, '#c9962b'); p.circ(-18, 0, 4, '#8fd3ff'); p.shine(-4, -6, 6, 2.5, 0.8); p.rr(-30, -5, 5, 10, 1, '#fff', { line: false }); }, 50, 52, -0.5); }
    else if (L === 5) { P.circ(50, 54, 32, '#e6b422'); P.circ(50, 54, 26, '#fff6d6'); P.star(50, 54, 22, 8, '#c0392b', { inner: 6 }); P.poly([[50, 54], [58, 38], [50, 30]], '#1d3557'); P.circ(50, 54, 4, '#e6b422'); P.rr(44, 16, 12, 8, 3, '#c9962b'); }
    else { P.rr(10, 28, 80, 48, 4, '#f4e3b0'); P.rr(10, 28, 22, 48, 3, '#e63946'); for (let i = 0; i < 5; i++) P.line(33, 36 + i * 9, 33, 40 + i * 9, '#7a5a36', 2); P.text('TICKET', 60, 44, 11, '#7a3d1e', { outline: false }); P.star(60, 62, 8, 5, '#e63946', { inner: 3 }); P.sparkle(82, 24, 6); }
  },
  pirate(P, L) {
    P.shadow();
    if (L === 1) { P.circ(50, 56, 22, '#a8851f'); P.circ(50, 56, 15, 'rgba(0,0,0,0)', { lw: 1.5, stroke: '#6b5413' }); for (const [x, y] of [[44, 52], [56, 52], [44, 60], [56, 60]]) P.circ(x, y, 1.8, '#3d2f0a', { line: false }); }
    else if (L === 2) { P.rr(20, 38, 60, 36, 6, '#d4a62a'); P.rr(32, 46, 36, 20, 3, 'rgba(0,0,0,0)', { lw: 3, stroke: '#7a5e12' }); P.rr(46, 38, 8, 36, 0, '#7a5e12', { line: false }); P.shine(28, 44, 8, 2.5, 0.6); }
    else if (L === 3) { P.blob([[22, 42], [50, 36], [78, 42], [76, 62], [58, 70], [42, 66], [24, 62]], '#2b2b33'); P.line(22, 46, 8, 34, '#2b2b33', 3, { outline: true }); P.line(78, 46, 92, 34, '#2b2b33', 3, { outline: true }); P.shine(34, 46, 6, 2.5, 0.2); }
    else if (L === 4) { P.poly([[10, 62], [22, 36], [50, 24], [78, 36], [90, 62], [50, 54]], '#2b2b33'); P.poly([[10, 62], [50, 54], [90, 62], [86, 68], [50, 62], [14, 68]], '#1d1d24'); P.circ(50, 40, 8, '#f4f1ea'); P.circ(46, 39, 1.6, '#2b2b33', { line: false }); P.circ(54, 39, 1.6, '#2b2b33', { line: false }); P.line(44, 46, 56, 46, '#2b2b33', 1.5); P.star(50, 60, 5, 5, '#ffd23f', { inner: 2 }); }
    else if (L === 5) { P.poly([[26, 26], [74, 26], [88, 80], [12, 80]], '#9c2d3a'); P.poly([[34, 26], [66, 26], [50, 54]], '#f4efe6'); for (const y of [56, 66, 76]) P.circ(50, y, 2.8, '#ffd23f', { lw: 1 }); P.rr(10, 74, 80, 6, 0, '#c9962b', { flat: true }); P.star(24, 40, 5, 5, '#ffd23f', { inner: 2 }); P.star(76, 40, 5, 5, '#ffd23f', { inner: 2 }); }
    else if (L === 6) { P.circ(30, 74, 11, '#6b4423'); P.circ(30, 74, 4, '#d9b27a'); P.rr(28, 40, 64, 24, 12, '#3d3f4a'); P.rr(72, 36, 22, 32, 8, '#2b2d36'); P.circ(94, 52, 6, '#1a1b22'); P.line(26, 44, 72, 44, '#6e7280', 1.5); P.rr(18, 62, 52, 10, 3, '#8a5d32'); P.circ(66, 74, 10, '#6b4423'); P.circ(66, 74, 4, '#d9b27a'); P.sparkle(18, 30, 6); }
    else { P.ell(50, 88, 40, 6, 'rgba(70,160,200,0.45)', { line: false }); P.poly([[12, 62], [88, 62], [76, 84], [24, 84]], '#8a5d32'); P.line(50, 62, 50, 14, '#6b4423', 3.5, { outline: true }); P.poly([[52, 16], [82, 40], [52, 56]], '#f4efe6'); P.poly([[48, 22], [26, 40], [48, 56]], '#f4efe6'); P.poly([[50, 14], [62, 8], [50, 4]], '#e63946'); P.line(12, 62, 4, 52, '#6b4423', 3, { outline: true }); P.circ(36, 72, 2.2, '#ffd23f', { line: false }); P.circ(50, 72, 2.2, '#ffd23f', { line: false }); P.circ(64, 72, 2.2, '#ffd23f', { line: false }); }
  },
  ember(P, L) {
    P.shadow(50, 92, 22, 4, 0.2);
    const gem = (col, s = 1, facets = true) => P.with(p => { p.poly([[0, -30], [20, -8], [14, 24], [0, 32], [-14, 24], [-20, -8]], col); if (facets) { p.poly([[0, -30], [20, -8], [0, -2]], shade(col, 0.4), { line: false }); p.line(0, -2, 14, 24, shade(col, -0.4), 1.2); p.line(0, -2, -14, 24, shade(col, -0.4), 1.2); p.line(-20, -8, 0, -2, shade(col, -0.4), 1.2); } }, 50, 54, 0, s);
    if (L === 1) { for (const [x, y, r] of [[36, 62, 6], [52, 52, 8], [64, 66, 5], [44, 74, 4], [66, 46, 4]]) P.circ(x, y, r, '#6e6a68', { lw: 1.4 }); P.circ(52, 52, 3, '#ff7a3c', { line: false }); }
    else if (L === 2) { P.blob([[30, 64], [34, 46], [54, 38], [68, 54], [58, 70], [40, 72]], '#4d3b38'); P.line(40, 52, 56, 64, '#ff7a3c', 2.4); P.line(52, 46, 60, 58, '#ff9f3c', 2); }
    else if (L === 3) { P.circ(50, 54, 30, 'rgba(255,120,40,0.28)', { line: false }); P.blob([[24, 62], [28, 40], [50, 28], [74, 42], [76, 66], [52, 82], [32, 76]], '#3e3331'); P.curve(34, 48, 48, 58, 66, 48, '#ff7a3c', 3); P.curve(36, 64, 52, 56, 68, 66, '#ff9f3c', 3); P.shine(38, 42, 6, 3, 0.3); }
    else if (L === 4) { P.circ(50, 54, 34, 'rgba(255,120,40,0.28)', { line: false }); gem('#ff5a2c'); }
    else if (L === 5) { P.circ(50, 54, 36, 'rgba(255,230,120,0.3)', { line: false }); gem('#ffd23f', 1.1); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P.line(50 + Math.cos(a) * 34, 54 + Math.sin(a) * 34, 50 + Math.cos(a) * 44, 54 + Math.sin(a) * 44, '#fff3a0', 2.5); } }
    else if (L === 6) { P.circ(50, 54, 38, 'rgba(120,200,255,0.3)', { line: false }); gem('#5bb8ff', 1.1); P.poly([[70, 18], [60, 38], [68, 38], [58, 58]], '#fff7a8', { lw: 1.2 }); }
    else { P.circ(50, 54, 38, 'rgba(255,90,40,0.35)', { line: false }); P.blob([[50, 24], [72, 34], [78, 58], [64, 82], [50, 90], [36, 82], [22, 58], [28, 34]], '#e63946'); P.blob([[50, 36], [64, 44], [66, 60], [50, 80], [36, 60], [38, 44]], '#ff7a3c', { line: false }); P.blob([[50, 48], [58, 56], [50, 70], [42, 56]], '#ffd23f', { line: false }); P.shine(38, 38, 6, 3, 0.7); P.sparkle(80, 22, 6); }
  },
};

export const GENS = {
  gen_seed(P, L) {
    P.shadow();
    const w = L === 1 ? 0 : L === 2 ? 1 : 2;
    if (w === 0) { P.blob([[24, 80], [20, 54], [38, 40], [62, 40], [80, 54], [76, 80]], '#c9a36a'); P.rr(34, 34, 32, 10, 5, '#8a5d32'); P.curve(34, 44, 50, 52, 66, 44, '#6b4423', 2); for (const [x, y, c] of [[40, 62, '#6bbf59'], [56, 58, '#ffd23f'], [50, 72, '#e63946']]) P.circ(x, y, 5, c, { lw: 1.4 }); P.leaf(50, 36, 18, 5, -1.6, LEAFC); }
    else if (w === 1) { P.blob([[16, 84], [12, 52], [34, 34], [66, 34], [88, 52], [84, 84]], '#d9a95f'); P.rr(30, 28, 40, 12, 5, '#8a5d32'); P.rr(14, 62, 72, 8, 0, '#8a5d32', { flat: true }); for (let i = 0; i < 3; i++) P.circ(32 + i * 18, 52, 5, ['#6bbf59', '#ffd23f', '#e63946'][i], { lw: 1.4 }); P.circ(50, 74, 6, '#ffd23f'); P.leaf(50, 30, 22, 6, -1.6, LEAFC); P.leaf(50, 30, 20, 6, -2.4, '#4caf50'); }
    else { P.rr(12, 50, 76, 38, 5, '#8a5d32'); P.poly([[12, 50], [18, 26], [82, 26], [88, 50]], '#c8934a'); P.rr(12, 46, 76, 8, 2, '#ffd23f', { flat: true }); P.rr(40, 46, 20, 22, 4, '#ffd23f'); for (let i = 0; i < 3; i++) P.leaf(32 + i * 18, 26, 20, 6, -1.6 + (i - 1) * 0.5, [LEAFC, '#ff8fa3', '#ffd23f'][i]); P.sparkle(80, 22, 6); }
  },
  gen_garden(P, L) {
    P.shadow();
    P.poly([[10, 72], [50, 52], [90, 72], [50, 92]], '#8a5d32'); P.poly([[18, 72], [50, 56], [82, 72], [50, 86]], '#5e3f23', { line: false });
    const n = L + 1;
    for (let i = 0; i < n + 1; i++) { const x = 28 + (i % 3) * 22, y = 68 + (i % 2) * 6 - Math.floor(i / 3) * 10; P.leaf(x, y, 20, 6, -1.6, LEAFC); P.leaf(x, y, 16, 5, -2.3, '#4caf50'); if (L >= 2) P.circ(x + 1, y - 18, 4, ['#ff4d6d', '#ffd23f', '#c77dff'][i % 3], { lw: 1.2 }); }
    if (L === 3) { P.sparkle(82, 34, 6); P.rr(8, 54, 6, 28, 2, WOODD); P.rr(86, 54, 6, 28, 2, WOODD); }
  },
  gen_toolbox(P, L) {
    P.shadow();
    const col = ['#d94f4f', '#3a86a8', '#6a4c93'][L - 1];
    P.rr(12, 46, 76, 40, 5, col); P.rr(12, 46, 76, 12, 5, shade(col, 0.3)); P.curve(34, 46, 50, 22, 66, 46, '#8d99a1', 6, { outline: true });
    P.line(12, 64, 88, 64, shade(col, -0.35), 1.5); P.rr(44, 58, 12, 10, 2, '#f4d35e');
    P.with(p => { p.rr(-3, -16, 6, 24, 2, '#b9854f'); p.rr(-8, -22, 16, 9, 2, '#c0c6cb'); }, 70, 40, 0.5); P.with(p => { p.rr(-2.5, -14, 5, 22, 2, '#e63946'); p.rr(-6, -20, 12, 8, 2, '#c0c6cb'); }, 30, 38, -0.4);
    if (L === 3) P.sparkle(82, 26, 6);
  },
};
