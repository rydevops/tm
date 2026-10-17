// Procedural world art: ground, obstacles, buildings, residents, fog, sea and icons.
import { Painter, OUT, shade, mix, artRng, hashStr } from './artkit.js';

let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function setWorldCanvasFactory(fn) { makeCanvas = fn; }

/* ------------------------------------------------------------------ ground */
export const THEME = {
  cove: { a: '#f2dfa6', b: '#ead291', deco: 'shell', edge: '#d9bd78' },
  farm: { a: '#a5cf6a', b: '#97c45c', deco: 'furrow', edge: '#7aa54a' },
  meadow: { a: '#82d66e', b: '#72c860', deco: 'flower', edge: '#58a84c' },
  creek: { a: '#86cb8e', b: '#76bd80', deco: 'pebble', edge: '#5c9f6c' },
  lagoon: { a: '#ecdfaa', b: '#9ad9dc', deco: 'ripple', edge: '#c9b87a' },
  orchard: { a: '#a8d674', b: '#98c864', deco: 'leaf', edge: '#78a94c' },
  hills: { a: '#bccb80', b: '#aabb70', deco: 'rock', edge: '#8c9c58' },
  shrine: { a: '#72b283', b: '#62a274', deco: 'moss', edge: '#4c8860' },
  hollow: { a: '#9a90d0', b: '#8a80c0', deco: 'glow', edge: '#6e65a6' },
  cliffs: { a: '#b2c0a8', b: '#a2b298', deco: 'rock', edge: '#88987e' },
  harbor: { a: '#cfaa70', b: '#be9a60', deco: 'plank', edge: '#9a7a44' },
  temple: { a: '#ddd3ac', b: '#cec49e', deco: 'tile', edge: '#aca27c' },
  pirate: { a: '#d2a870', b: '#c29860', deco: 'plank', edge: '#9c7440' },
  volcano: { a: '#75625f', b: '#655452', deco: 'lava', edge: '#4a3a38' },
  ice: { a: '#e6f6ff', b: '#d2ecfa', deco: 'ice', edge: '#a9d3ea' },
  candy: { a: '#ffd6ec', b: '#ffc5e2', deco: 'sprinkle', edge: '#f2a6cc' },
  night: { a: '#41528a', b: '#384878', deco: 'star', edge: '#26335c' },
};

export function drawGroundTile(c, themeKey, x, y, s, hash) {
  const th = THEME[themeKey] || THEME.meadow;
  const alt = ((x / s + y / s) | 0) % 2;
  c.fillStyle = alt ? th.a : th.b; c.fillRect(x, y, s, s);
  const r = artRng(hash);
  // soft inner highlight
  const g = c.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.07)');
  c.fillStyle = g; c.fillRect(x, y, s, s);
  const u = s / 64, n = 1 + ((r() * 3) | 0);
  const spot = (cb) => { const px = x + (0.15 + r() * 0.7) * s, py = y + (0.15 + r() * 0.7) * s; cb(px, py); };
  c.lineCap = 'round';
  switch (th.deco) {
    case 'shell': if (r() < 0.45) spot((px, py) => { c.fillStyle = '#fff1e6'; c.strokeStyle = '#d9a98c'; c.lineWidth = u; c.beginPath(); c.ellipse(px, py, 3.2 * u, 2.4 * u, r() * 3, 0, 7); c.fill(); c.stroke(); }); break;
    case 'furrow': c.strokeStyle = 'rgba(80,120,30,0.35)'; c.lineWidth = 1.4 * u; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 8 * u, y + (14 + i * 16) * u); c.lineTo(x + 56 * u, y + (12 + i * 16) * u); c.stroke(); } break;
    case 'flower': if (r() < 0.55) spot((px, py) => { const col = ['#fff', '#ffd23f', '#ff8fa3', '#c9a7ff'][(r() * 4) | 0]; c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(px + Math.cos(k * 1.256) * 2.2 * u, py + Math.sin(k * 1.256) * 2.2 * u, 1.5 * u, 0, 7); c.fill(); } c.fillStyle = '#f7b500'; c.beginPath(); c.arc(px, py, 1.2 * u, 0, 7); c.fill(); }); break;
    case 'pebble': for (let i = 0; i < n; i++) spot((px, py) => { c.fillStyle = 'rgba(120,130,140,0.55)'; c.beginPath(); c.ellipse(px, py, 2.6 * u, 1.8 * u, 0, 0, 7); c.fill(); }); break;
    case 'ripple': c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.3 * u; spot((px, py) => { c.beginPath(); c.arc(px, py, 5 * u, 3.4, 6); c.stroke(); }); break;
    case 'leaf': if (r() < 0.5) spot((px, py) => { c.fillStyle = 'rgba(60,120,30,0.45)'; c.beginPath(); c.ellipse(px, py, 3.4 * u, 1.5 * u, r() * 3, 0, 7); c.fill(); }); break;
    case 'rock': if (r() < 0.4) spot((px, py) => { c.fillStyle = 'rgba(110,110,100,0.5)'; c.beginPath(); c.ellipse(px, py, 3.6 * u, 2.4 * u, 0, 0, 7); c.fill(); }); c.strokeStyle = 'rgba(70,80,40,0.18)'; c.lineWidth = u; c.beginPath(); c.moveTo(x + 6 * u, y + 40 * u); c.lineTo(x + 30 * u, y + 34 * u); c.stroke(); break;
    case 'moss': for (let i = 0; i < n; i++) spot((px, py) => { c.fillStyle = 'rgba(40,110,60,0.35)'; c.beginPath(); c.arc(px, py, 3.2 * u, 0, 7); c.fill(); }); break;
    case 'glow': if (r() < 0.5) spot((px, py) => { c.fillStyle = 'rgba(255,255,200,0.5)'; c.beginPath(); c.arc(px, py, 1.6 * u, 0, 7); c.fill(); }); break;
    case 'plank': c.strokeStyle = 'rgba(90,60,20,0.38)'; c.lineWidth = 1.4 * u; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x, y + i * 16 * u); c.lineTo(x + s, y + i * 16 * u); c.stroke(); } c.fillStyle = 'rgba(90,60,20,0.4)'; c.beginPath(); c.arc(x + 6 * u, y + 8 * u, 1 * u, 0, 7); c.arc(x + 58 * u, y + 24 * u, 1 * u, 0, 7); c.fill(); break;
    case 'tile': c.strokeStyle = 'rgba(120,110,80,0.35)'; c.lineWidth = 1.6 * u; c.strokeRect(x + 3 * u, y + 3 * u, s - 6 * u, s - 6 * u); break;
    case 'lava': if (r() < 0.35) spot((px, py) => { c.strokeStyle = 'rgba(255,120,40,0.6)'; c.lineWidth = 1.6 * u; c.beginPath(); c.moveTo(px - 6 * u, py); c.lineTo(px, py + 3 * u); c.lineTo(px + 6 * u, py - 2 * u); c.stroke(); }); break;
    case 'ice': c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.3 * u; if (r() < 0.5) spot((px, py) => { c.beginPath(); c.moveTo(px - 6 * u, py); c.lineTo(px + 6 * u, py + 2 * u); c.stroke(); }); break;
    case 'sprinkle': for (let i = 0; i < 3; i++) spot((px, py) => { c.strokeStyle = ['#fff', '#7ad1ff', '#ffd54a', '#9bcb4a'][(r() * 4) | 0]; c.lineWidth = 1.8 * u; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 3 * u, py + 1.5 * u); c.stroke(); }); break;
    case 'star': if (r() < 0.5) spot((px, py) => { c.fillStyle = 'rgba(255,240,170,0.75)'; c.beginPath(); c.arc(px, py, 1.3 * u, 0, 7); c.fill(); }); break;
  }
  // faint cell grid so merging reads as a grid
  c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

/** Pre-render the land layer of a board into one canvas. themeAt(i) -> theme key. */
export function renderGround(board, cell, themeAt) {
  const cv = makeCanvas(board.w * cell, board.h * cell); const c = cv.getContext('2d');
  for (let i = 0; i < board.n; i++) {
    if (!board.land[i]) continue;
    const x = board.x(i) * cell, y = board.y(i) * cell;
    drawGroundTile(c, themeAt(i), x, y, cell, hashStr('g' + i));
  }
  // shore: wet sand rim + foam on land/sea borders
  const edge = Math.max(3, cell * 0.12);
  for (let i = 0; i < board.n; i++) {
    if (!board.land[i]) continue;
    const bx = board.x(i), by = board.y(i), x = bx * cell, y = by * cell;
    const nb = (dx, dy) => { const nx = bx + dx, ny = by + dy; return board.inBounds(nx, ny) && board.land[board.idx(nx, ny)]; };
    c.fillStyle = 'rgba(120,90,40,0.28)';
    if (!nb(0, -1)) c.fillRect(x, y, cell, edge);
    if (!nb(0, 1)) c.fillRect(x, y + cell - edge, cell, edge);
    if (!nb(-1, 0)) c.fillRect(x, y, edge, cell);
    if (!nb(1, 0)) c.fillRect(x + cell - edge, y, edge, cell);
  }
  return cv;
}

/* -------------------------------------------------------------------- sea */
export function drawSea(c, W, H, t, scrollX, scrollY, scale, night = false, reduce = false) {
  const g = c.createLinearGradient(0, 0, 0, H);
  if (night) { g.addColorStop(0, '#1d2a52'); g.addColorStop(1, '#101a38'); } else { g.addColorStop(0, '#3fc1d1'); g.addColorStop(1, '#2a9fc2'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = night ? 'rgba(160,180,255,0.18)' : 'rgba(255,255,255,0.22)'; c.lineWidth = Math.max(1.5, 2 * scale); c.lineCap = 'round';
  const step = 90 * scale, tt = reduce ? 0 : t;
  for (let gy = -1; gy * step < H + step; gy++) {
    for (let gx = -1; gx * step < W + step; gx++) {
      const ox = ((gx * step + scrollX * 0.6) % (W + step * 2) + (W + step * 2)) % (W + step * 2) - step;
      const oy = ((gy * step + scrollY * 0.6) % (H + step * 2) + (H + step * 2)) % (H + step * 2) - step;
      const jitter = ((gx * 7 + gy * 13) & 7) * 6 * scale;
      const wob = Math.sin(tt * 0.9 + gx + gy) * 6 * scale;
      c.beginPath(); c.moveTo(ox + jitter, oy + wob); c.quadraticCurveTo(ox + jitter + 14 * scale, oy + wob - 6 * scale, ox + jitter + 28 * scale, oy + wob); c.stroke();
    }
  }
}

/* ----------------------------------------------------------------- obstacles */
const WD = '#a8713a', WDD = '#7d4f24', GRN = '#5fbf4f', GRD = '#3b9a3a';

const OBST = {
  tall_grass(P) { for (let i = 0; i < 9; i++) P.curve(50, 86, 20 + i * 7.5, 54 - (i % 3) * 8, 14 + i * 9, 24 + (i % 4) * 7, i % 2 ? GRN : '#7fd36b', 5.5, { outline: true }); },
  thorn_bush(P) { P.blob([[14, 70], [18, 42], [42, 28], [70, 34], [86, 56], [80, 80], [40, 86]], '#4e8a3a'); for (const [x, y] of [[30, 44], [50, 34], [70, 46], [78, 66], [24, 66], [52, 70]]) { P.poly([[x - 3, y + 3], [x, y - 9], [x + 3, y + 3]], '#d9d0b0', { lw: 1.2 }); } for (const [x, y] of [[40, 56], [62, 58]]) P.circ(x, y, 3, '#e63946', { lw: 1 }); },
  dense_brush(P) { P.circ(34, 60, 22, GRD); P.circ(64, 58, 24, '#4aa843'); P.circ(50, 42, 22, GRN); P.circ(44, 68, 16, '#58b84c'); for (let i = 0; i < 5; i++) P.leaf(30 + i * 10, 66, 16, 5, -1.6 + (i - 2) * 0.4, '#82d86a'); },
  vine_tangle(P) { P.blob([[16, 74], [20, 44], [50, 30], [80, 44], [84, 74], [50, 84]], '#3d8f45'); for (let i = 0; i < 4; i++) P.curve(18 + i * 20, 80, 30 + i * 12, 40, 14 + i * 22, 24 + (i % 2) * 8, '#2a6e35', 4, { outline: true }); for (const [x, y] of [[36, 46], [62, 52], [50, 70]]) P.leaf(x, y, 14, 5, x * 0.1, '#7fd36b'); P.circ(70, 40, 3.4, '#ff8fa3', { lw: 1 }); },
  small_stump(P) { P.ell(50, 82, 28, 8, 'rgba(60,40,20,0.3)', { line: false }); P.rr(24, 40, 52, 42, 8, WD); P.ell(50, 40, 26, 11, '#e8c186'); P.ell(50, 40, 16, 6.5, 'rgba(0,0,0,0)', { stroke: '#b98d4f', lw: 1.4 }); P.ell(50, 40, 7, 3, 'rgba(0,0,0,0)', { stroke: '#b98d4f', lw: 1.2 }); P.line(32, 50, 32, 78, WDD, 1.4); P.line(66, 52, 68, 76, WDD, 1.4); P.leaf(76, 52, 14, 5, -0.5, GRN); },
  big_stump(P) { P.ell(100, 88, 62, 9, 'rgba(60,40,20,0.3)', { line: false }); P.rr(30, 30, 140, 56, 12, WD); P.ell(100, 32, 70, 18, '#e8c186'); for (const r of [1, 0.66, 0.36]) P.ell(100, 32, 70 * r, 18 * r, 'rgba(0,0,0,0)', { stroke: '#b98d4f', lw: 1.5 }); for (const x of [50, 80, 120, 150]) P.line(x, 46, x + (x > 100 ? 3 : -3), 84, WDD, 1.6); P.leaf(160, 56, 20, 7, -0.6, GRN); P.circ(46, 60, 3, WDD, { line: false }); },
  boulder(P) { P.ell(100, 184, 76, 10, 'rgba(60,40,20,0.3)', { line: false }); P.blob([[24, 170], [20, 110], [46, 54], [96, 32], [154, 50], [182, 108], [178, 170], [100, 186]], '#9aa0a6'); P.blob([[44, 112], [58, 66], [100, 48], [136, 62]], '#bcc2c8', { line: false }); P.line(98, 52, 90, 100, '#5f666c', 2.2); P.line(90, 100, 124, 140, '#5f666c', 2); P.line(60, 130, 90, 100, '#5f666c', 2); P.blob([[40, 150], [60, 130], [86, 164], [60, 176]], '#7e858b', { line: false }); P.leaf(30, 152, 22, 8, -0.6, GRN); P.leaf(30, 152, 18, 7, -1.3, GRD); },
  rubble_pile(P) { P.ell(100, 184, 80, 10, 'rgba(60,40,20,0.3)', { line: false }); const rocks = [[50, 150, 30], [100, 160, 34], [150, 150, 28], [74, 110, 28], [124, 112, 30], [100, 70, 26]]; rocks.forEach(([x, y, r], i) => P.poly([[x - r, y + r * 0.5], [x - r * 0.7, y - r * 0.6], [x + r * 0.3, y - r * 0.9], [x + r, y - r * 0.1], [x + r * 0.7, y + r * 0.7]], ['#8b9096', '#a6abb0', '#7a8086'][i % 3])); P.rr(60, 118, 60, 8, 1, '#c4693f'); P.rr(110, 150, 30, 8, 1, '#c4693f'); P.line(30, 160, 52, 130, WD, 4, { outline: true }); },
  driftwood(P) { P.curve(14, 70, 44, 44, 86, 52, '#b79a74', 11, { outline: true }); P.curve(38, 58, 52, 70, 66, 76, '#b79a74', 7, { outline: true }); P.curve(62, 48, 74, 32, 84, 28, '#b79a74', 6, { outline: true }); P.circ(24, 66, 2.4, '#7d6648', { line: false }); P.ell(50, 86, 26, 5, 'rgba(60,40,20,0.25)', { line: false }); },
  locked_crate(P) { P.rr(16, 28, 68, 56, 5, '#b9854f'); for (const y of [40, 56, 72]) P.line(16, y, 84, y, WDD, 1.6); P.line(16, 28, 84, 84, WDD, 3.5, { outline: true }); P.line(84, 28, 16, 84, WDD, 3.5, { outline: true }); P.rr(40, 46, 20, 22, 5, '#ffd23f'); P.circ(50, 55, 3.6, '#5a4a14', { line: false }); P.rr(48.4, 55, 3.2, 8, 1, '#5a4a14', { line: false }); P.curve(42, 46, 50, 30, 58, 46, '#c0c6cb', 4, { outline: true }); },
  hungry_boar(P) { P.ell(50, 86, 30, 6, 'rgba(60,40,20,0.3)', { line: false }); P.blob([[14, 66], [20, 44], [46, 36], [72, 42], [84, 62], [70, 80], [30, 80]], '#8a5a3c'); P.blob([[56, 44], [76, 40], [90, 56], [82, 70], [62, 68]], '#9c6a48'); P.ell(88, 58, 7, 6, '#e8a0a0'); P.circ(86, 58, 1.4, '#6b3030', { line: false }); P.circ(91, 58, 1.4, '#6b3030', { line: false }); P.circ(74, 50, 2.6, '#2b1d14', { line: false }); P.poly([[68, 40], [64, 28], [76, 38]], '#7a4a2c'); P.poly([[84, 66], [92, 76], [80, 70]], '#f4f1ea'); for (const x of [26, 44, 62]) P.rr(x, 74, 7, 14, 2, '#6e4630'); P.curve(14, 56, 6, 48, 8, 38, '#6e4630', 3, { outline: true }); for (let i = 0; i < 6; i++) P.line(28 + i * 8, 38, 26 + i * 8, 28, '#5e3a24', 2.4); P.text('?', 40, 24, 16, '#fff'); },
  mud_pit(P) { P.c.save(); P.c.scale(1.5, 1); P.blob([[10, 54], [22, 30], [64, 24], [130, 22], [180, 32], [192, 56], [170, 78], [100, 84], [34, 80]], '#7a5636'); P.blob([[30, 54], [60, 40], [130, 38], [168, 52], [130, 70], [70, 68]], '#9a7048', { line: false }); for (const [x, y] of [[50, 50], [100, 56], [150, 50]]) P.ell(x, y, 8, 3.5, '#b58a5c', { line: false }); for (const x of [40, 90, 140, 170]) P.circ(x, 34 + (x % 20), 3, '#b58a5c', { line: false }); P.c.restore(); },
  sealed_gate(P) { P.rr(14, 22, 72, 66, 4, '#8a8f98'); P.rr(18, 28, 64, 56, 3, '#a9aeb6'); P.line(50, 28, 50, 84, '#5a5f68', 2); for (const y of [38, 54, 70]) P.line(18, y, 82, y, '#5a5f68', 1.6); P.circ(50, 54, 12, '#ffd23f'); P.circ(50, 54, 7, '#7a5a14'); P.rr(48.4, 54, 3.2, 10, 1, '#7a5a14', { line: false }); P.sparkle(80, 24, 6); P.rr(8, 84, 84, 8, 3, '#7a7f88'); },
  fallen_tree(P) { P.ell(100, 82, 80, 8, 'rgba(60,40,20,0.25)', { line: false }); P.rr(14, 40, 172, 38, 18, '#9c6b3a'); P.ell(176, 59, 10, 19, '#e8c186'); P.ell(176, 59, 5, 10, 'rgba(0,0,0,0)', { stroke: '#b98d4f', lw: 1.2 }); for (const x of [40, 80, 120, 150]) P.line(x, 44, x + 4, 74, WDD, 1.6); P.leaf(50, 42, 24, 8, -0.9, GRN); P.leaf(120, 42, 24, 8, -1.2, GRD); P.leaf(150, 76, 20, 7, 0.9, GRN); },
};

export function getObstacleSprite(type, def, S = 128) {
  const key = `ob|${type}|${S}`; if (cacheW.has(key)) return cacheW.get(key);
  const w = def.w, h = def.h;
  const cv = makeCanvas(w * S, h * S); const c = cv.getContext('2d');
  const P = new Painter(c, S);
  const fn = OBST[type]; try { if (fn) fn(P); else P.circ(50, 50, 30, '#888'); } catch (e) { P.circ(50, 50, 30, '#f66'); }
  P.end();
  cacheW.set(key, cv); return cv;
}
const cacheW = new Map();

/** Cracks drawn per hit taken (0..1 of damage). */
export function drawCracks(c, x, y, w, h, dmg) {
  if (dmg <= 0) return;
  c.save(); c.strokeStyle = 'rgba(40,25,15,0.85)'; c.lineWidth = Math.max(2, Math.min(w, h) * 0.03); c.lineCap = 'round'; c.lineJoin = 'round';
  const n = Math.ceil(dmg * 3);
  for (let i = 0; i < n; i++) {
    const sx = x + w * (0.3 + 0.2 * i), sy = y + h * 0.18;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + w * 0.06, sy + h * 0.18); c.lineTo(sx - w * 0.05, sy + h * 0.34); c.lineTo(sx + w * 0.07, sy + h * 0.52); c.stroke();
  }
  c.restore();
}

/* ---------------------------------------------------------------- buildings */
function house(P, x, y, w, h, wall, roof, o = {}) {
  P.rr(x, y + h * 0.38, w, h * 0.62, 3, wall);
  P.poly([[x - w * 0.08, y + h * 0.42], [x + w / 2, y - h * 0.05 + (o.roofUp || 0)], [x + w * 1.08, y + h * 0.42]], roof);
  if (o.beam !== false) P.line(x - w * 0.04, y + h * 0.42, x + w * 1.04, y + h * 0.42, shade(roof, -0.3), 2);
  if (o.door !== false) { P.rr(x + w * 0.4, y + h * 0.66, w * 0.2, h * 0.34, 4, o.doorCol || '#7d4f24'); P.circ(x + w * 0.56, y + h * 0.84, 1.3, '#ffd23f', { line: false }); }
  if (o.win !== false) for (const k of [0.14, 0.7]) { P.rr(x + w * k, y + h * 0.54, w * 0.16, h * 0.16, 2, '#bfe9ff'); P.line(x + w * (k + 0.08), y + h * 0.54, x + w * (k + 0.08), y + h * 0.7, '#7d4f24', 1.2); }
}
function stripes(P, x, y, w, h, n, c1, c2) { const sw = w / n; for (let i = 0; i < n; i++) P.poly([[x + i * sw, y], [x + (i + 1) * sw, y], [x + (i + 1) * sw - 2, y + h], [x + i * sw - 2, y + h]], i % 2 ? c2 : c1, { lw: 1.2 }); }
const post = (P, x, y, h = 20) => { P.rr(x - 2.5, y, 5, h, 1.5, '#8a5d32'); };

const BLD = {
  bld_welcome_dock(P) { P.rr(6, 40, 288, 34, 3, '#c9904e'); for (let i = 1; i < 10; i++) P.line(6 + i * 28.8, 40, 6 + i * 28.8, 74, '#8a5d32', 1.6); for (const x of [14, 100, 200, 286]) post(P, x, 70, 26); P.rr(220, 14, 36, 28, 3, '#b9854f'); P.line(220, 28, 256, 28, '#8a5d32', 1.5); P.line(238, 14, 238, 42, '#8a5d32', 1.5); P.curve(30, 44, 60, 60, 90, 44, '#d6b27a', 3, { outline: true }); P.rr(120, 20, 4, 22, 1, '#6b4423'); P.circ(122, 18, 6, '#ffe27a'); P.circ(122, 18, 12, 'rgba(255,230,120,0.3)', { line: false }); },
  bld_cottage(P) { house(P, 24, 24, 252, 170, '#f4e3c0', '#d9863a', { roofUp: -6 }); P.rr(210, 8, 22, 40, 3, '#a06a48'); P.curve(222, 6, 212, -6, 224, -16, 'rgba(255,255,255,0.7)', 5); P.rr(86, 130, 38, 38, 3, '#7d4f24'); P.line(86, 150, 124, 150, '#5e3a1c', 1.5); P.rr(156, 112, 40, 40, 3, '#bfe9ff'); P.line(176, 112, 176, 152, '#7d4f24', 2); P.line(156, 132, 196, 132, '#7d4f24', 2); P.rr(148, 150, 56, 7, 2, '#7d4f24'); for (let i = 0; i < 5; i++) P.circ(154 + i * 11, 150, 4, ['#ff4d6d', '#ffd23f', '#ff8fa3'][i % 3], { lw: 1 }); },
  bld_lumber_yard(P) { P.rr(14, 100, 90, 90, 3, '#b9854f'); P.poly([[6, 104], [60, 50], [112, 104]], '#8a5d32'); P.line(14, 130, 104, 130, '#8a5d32', 1.5); P.line(14, 160, 104, 160, '#8a5d32', 1.5); for (let i = 0; i < 4; i++) P.ell(150, 170 - i * 22, 36, 11, '#a8713a'); for (let i = 0; i < 4; i++) P.ell(186, 170 - i * 22, 11, 11, '#e8c186', { lw: 1.6 }); P.line(124, 100, 124, 170, '#7d4f24', 5, { outline: true }); P.poly([[110, 130], [140, 100], [150, 104], [122, 140]], '#c0c6cb'); },
  bld_hen_house(P) { P.rr(40, 96, 124, 86, 4, '#d9533f'); P.poly([[28, 100], [102, 44], [176, 100]], '#8a5d32'); P.rr(86, 128, 32, 54, 4, '#fff1d6'); P.ell(102, 132, 16, 8, '#fff1d6'); P.poly([[118, 182], [160, 190], [110, 190]], '#b9854f'); for (let i = 0; i < 4; i++) P.line(122 + i * 9, 184 - i * 0.5, 122 + i * 9 + 2, 190, '#8a5d32', 1.6); P.ell(52, 168, 14, 10, '#f6f2ea'); P.ell(46, 178, 7, 5, '#ffd23f'); P.circ(60, 160, 1.6, '#2b1d14', { line: false }); P.poly([[62, 164], [68, 166], [62, 168]], '#f4a024'); P.rr(60, 110, 24, 14, 2, '#fff1d6', {}); },
  bld_market_stall(P) { P.rr(14, 72, 172, 24, 3, '#b9854f'); post(P, 22, 30, 70); post(P, 178, 30, 70); stripes(P, 10, 16, 180, 28, 6, '#e63946', '#fff'); P.poly([[10, 44], [190, 44], [182, 56], [18, 56]], '#e63946', { lw: 1.4 }); for (const [x, c] of [[40, '#ffb347'], [66, '#e63946'], [92, '#9bcb4a'], [120, '#ffd23f'], [150, '#ff8fa3']]) P.circ(x, 66, 9, c, { lw: 1.4 }); P.rr(60, 80, 80, 12, 2, '#fff1d6'); P.text('$', 100, 86, 11, '#7a5a1a', { outline: false }); },
  bld_stone_quarry(P) { P.poly([[10, 190], [30, 100], [100, 40], [200, 70], [280, 130], [292, 190]], '#8f959b'); P.poly([[30, 100], [100, 40], [140, 70], [70, 120]], '#b3b9bf', { line: false }); for (const [x, y] of [[120, 130], [170, 150], [210, 120], [90, 160]]) { P.rr(x, y, 36, 22, 2, '#cfd4d8'); P.line(x + 4, y + 6, x + 32, y + 6, '#9aa0a6', 1.2); } P.with(p => { p.rr(-3, -30, 6, 56, 2, '#b9854f'); p.poly([[-18, -30], [18, -30], [10, -42], [-10, -42]], '#8d99a1'); }, 252, 150, 0.7); P.rr(30, 150, 30, 16, 2, '#c4693f'); },
  bld_kitchen_hearth(P) { P.rr(30, 80, 140, 108, 6, '#c9a36a'); for (let i = 0; i < 4; i++) P.line(30, 106 + i * 20, 170, 106 + i * 20, '#9a7a44', 1.4); P.poly([[22, 84], [100, 30], [178, 84]], '#a85a3a'); P.rr(72, 120, 56, 56, 28, '#3b2a22'); P.rr(80, 142, 40, 34, 18, '#ff8a3c'); P.rr(88, 154, 24, 22, 12, '#ffd23f'); P.rr(138, 20, 24, 40, 3, '#7a4a2c'); P.curve(150, 18, 140, 4, 152, -6, 'rgba(255,255,255,0.7)', 5); P.curve(150, -4, 160, -12, 150, -20, 'rgba(255,255,255,0.5)', 4); },
  bld_cow_shed(P) { P.rr(24, 76, 252, 112, 4, '#d9533f'); P.poly([[12, 82], [150, 14], [288, 82]], '#8a5d32'); P.poly([[24, 82], [150, 24], [276, 82]], '#a8713a', { line: false }); P.rr(96, 108, 108, 80, 3, '#fff1d6'); P.line(96, 108, 204, 188, '#d9533f', 4); P.line(204, 108, 96, 188, '#d9533f', 4); P.rr(144, 44, 24, 22, 3, '#fff1d6'); P.rr(30, 190, 240, 6, 2, '#6b4423'); },
  bld_fishing_dock(P) { P.rr(6, 44, 288, 28, 3, '#c9904e'); for (let i = 1; i < 10; i++) P.line(6 + i * 28.8, 44, 6 + i * 28.8, 72, '#8a5d32', 1.6); for (const x of [14, 110, 210, 286]) post(P, x, 68, 28); P.line(240, 44, 270, 6, '#6b4423', 3, { outline: true }); P.curve(270, 6, 292, 30, 280, 74, 'rgba(255,255,255,0.8)', 1.4); P.rr(30, 24, 30, 22, 3, '#b9854f'); P.blob([[100, 20], [150, 20], [140, 40], [110, 40]], '#e63946'); P.curve(100, 20, 124, 4, 150, 20, '#8a5d32', 2); P.poly([[170, 40], [190, 28], [200, 40]], '#ff9a76', { lw: 1.4 }); },
  bld_juice_stand(P) { P.rr(14, 40, 172, 54, 4, '#ffb347'); stripes(P, 8, 8, 184, 34, 6, '#2ec4b6', '#fff'); P.poly([[8, 42], [192, 42], [182, 54], [18, 54]], '#2ec4b6', { lw: 1.4 }); P.rr(20, 64, 160, 12, 3, '#fff1d6'); for (const [x, c] of [[44, '#ff8a3c'], [80, '#9bcb4a'], [116, '#c77dff'], [152, '#ff6b8a']]) { P.rr(x - 9, 56, 18, 18, 4, 'rgba(235,248,255,0.8)'); P.rr(x - 7, 62, 14, 11, 3, c, { line: false }); } },
  bld_windmill(P) { P.poly([[60, 190], [76, 60], [124, 60], [140, 190]], '#f4e3c0'); P.poly([[60, 190], [76, 60], [100, 60], [100, 190]], '#e8d2a4', { line: false }); P.poly([[64, 66], [100, 20], [136, 66]], '#c0452e'); P.rr(88, 140, 24, 50, 12, '#7d4f24'); P.rr(94, 92, 12, 16, 3, '#bfe9ff'); P.with(p => { for (let i = 0; i < 4; i++) p.with(q => { q.rr(-3, -2, 6, 70, 2, '#8a5d32'); q.rr(-14, 10, 28, 46, 2, '#fff7e0'); q.line(-14, 28, 14, 28, '#d9c9a0', 1.4); q.line(-14, 42, 14, 42, '#d9c9a0', 1.4); }, 0, 0, i * Math.PI / 2 + 0.5); p.circ(0, 0, 8, '#8a5d32'); }, 100, 60); },
  bld_beach_cafe(P) { P.rr(24, 70, 252, 120, 5, '#fff1d6'); P.poly([[12, 74], [150, 16], [288, 74]], '#2ec4b6'); P.rr(58, 110, 40, 80, 4, '#7d4f24'); P.rr(124, 104, 72, 46, 3, '#bfe9ff'); P.line(160, 104, 160, 150, '#7d4f24', 2); P.rr(118, 148, 84, 8, 2, '#7d4f24'); P.rr(214, 112, 52, 42, 3, '#ffffff'); P.text('CAFE', 240, 134, 15, '#2ec4b6', { outline: false }); P.line(150, 36, 150, 70, '#f2cc8f', 1); P.with(p => { p.line(0, 0, 0, 38, '#6b4423', 3); p.poly([[-26, 0], [26, 0], [0, -20]], '#e63946'); }, 26, 150); },
  bld_goat_pen(P) { P.rr(10, 84, 280, 104, 6, '#9ac96b'); for (let i = 0; i < 12; i++) { post(P, 18 + i * 24, 70, 40); } P.line(10, 96, 290, 96, '#b9854f', 6, { outline: true }); P.line(10, 122, 290, 122, '#b9854f', 6, { outline: true }); P.rr(190, 130, 80, 44, 4, '#b9854f'); P.poly([[184, 134], [230, 98], [276, 134]], '#8a5d32'); for (let i = 0; i < 6; i++) P.line(60 + i * 8, 170, 56 + i * 9, 150, '#d9b84a', 3, { outline: true }); },
  bld_cliff_bridge(P) { P.poly([[0, 20], [40, 20], [40, 90], [0, 90]], '#9ba88e'); P.poly([[360, 20], [400, 20], [400, 90], [360, 90]], '#9ba88e'); P.curve(30, 50, 200, 90, 370, 50, '#8a5d32', 6, { outline: true }); for (let i = 0; i <= 14; i++) { const t = i / 14, x = 30 + t * 340, y = 50 + Math.sin(t * Math.PI) * 20; P.rr(x - 7, y - 3, 14, 10, 1, '#c9904e'); P.line(x, y - 3, x, y - 22, '#6b4423', 2); } P.curve(30, 28, 200, 68, 370, 28, '#d6b27a', 3.5, { outline: true }); },
  bld_spirit_shrine(P) { P.rr(40, 240, 220, 36, 4, '#a9aeb6'); P.rr(60, 210, 180, 34, 4, '#bfc4ca'); for (const x of [84, 196]) { P.rr(x, 90, 28, 124, 4, '#d9534f'); } P.rr(60, 70, 180, 22, 6, '#d9534f'); P.rr(44, 40, 212, 20, 8, '#4a4f58'); P.rr(100, 100, 100, 14, 3, '#4a4f58'); P.circ(150, 160, 22, 'rgba(160,255,230,0.45)', { line: false }); P.circ(150, 160, 12, '#bff5ea'); P.circ(146, 158, 2, '#2b3a45', { line: false }); P.circ(154, 158, 2, '#2b3a45', { line: false }); P.sparkle(190, 130, 8, '#fff'); P.sparkle(114, 140, 6, '#fff'); for (const x of [20, 270]) { P.rr(x, 220, 12, 40, 2, '#9aa0a6'); P.circ(x + 6, 214, 7, 'rgba(255,230,120,0.9)'); } },
  bld_nest_of_wonders(P) { P.curve(100, 190, 100, 120, 100, 80, '#8a5d32', 18, { outline: true }); for (let i = 0; i < 6; i++) P.leaf(100, 90, 60, 14, -Math.PI / 2 + (i - 2.5) * 0.7, i % 2 ? '#5fbf4f' : '#3b9a3a'); P.ell(100, 92, 70, 26, '#b08a52'); for (let i = 0; i < 12; i++) P.line(36 + i * 11, 92 + Math.sin(i) * 12, 52 + i * 11, 84 + Math.cos(i) * 10, '#7d5a30', 3); for (const [x, c] of [[76, '#ffd6a8'], [102, '#e8e1f2'], [126, '#bfe9ff']]) { P.ell(x, 78, 11, 15, c); P.circ(x - 3, 72, 2, 'rgba(255,255,255,0.8)', { line: false }); } P.sparkle(160, 56, 8); P.sparkle(40, 64, 6); },
  bld_museum(P) { P.rr(10, 250, 280, 40, 4, '#c8cdd2'); P.rr(30, 220, 240, 34, 4, '#dfe3e6'); for (let i = 0; i < 6; i++) { P.rr(46 + i * 40, 100, 20, 126, 3, '#f1f3f4'); P.rr(42 + i * 40, 92, 28, 12, 2, '#dfe3e6'); P.rr(42 + i * 40, 222, 28, 8, 2, '#dfe3e6'); } P.poly([[18, 96], [150, 20], [282, 96]], '#d9cfa8'); P.poly([[48, 92], [150, 38], [252, 92]], '#ece4c4', { line: false }); P.circ(150, 72, 12, '#ffd23f'); P.rr(110, 150, 80, 76, 4, '#7d4f24'); P.text('★', 150, 188, 28, '#ffd23f'); },
  bld_lighthouse(P) { P.poly([[70, 190], [84, 54], [116, 54], [130, 190]], '#fff'); P.poly([[72, 170], [76, 140], [124, 140], [128, 170]], '#e63946', { lw: 1.4 }); P.poly([[78, 116], [82, 88], [118, 88], [122, 116]], '#e63946', { lw: 1.4 }); P.rr(78, 34, 44, 24, 3, '#3b3f4a'); P.rr(84, 40, 32, 14, 2, '#ffe97a'); P.poly([[72, 36], [100, 8], [128, 36]], '#c0452e'); P.rr(90, 150, 20, 40, 10, '#7d4f24'); P.poly([[116, 46], [200, 20], [200, 70]], 'rgba(255,240,150,0.45)', { line: false }); P.poly([[84, 46], [0, 20], [0, 70]], 'rgba(255,240,150,0.45)', { line: false }); },
  bld_greenhouse(P) { P.rr(20, 96, 260, 94, 3, 'rgba(210,240,250,0.65)'); P.poly([[20, 100], [60, 40], [240, 40], [280, 100]], 'rgba(210,240,250,0.75)'); for (let i = 1; i < 7; i++) P.line(20 + i * 37, 100, 20 + i * 37, 190, '#8d99a1', 2); for (let i = 1; i < 4; i++) P.line(60 + i * 45, 40, 40 + i * 50, 100, '#8d99a1', 2); P.line(20, 140, 280, 140, '#8d99a1', 2); for (let i = 0; i < 6; i++) { const x = 44 + i * 40; P.leaf(x, 190, 40, 10, -1.6 + (i % 3 - 1) * 0.3, i % 2 ? '#5fbf4f' : '#3b9a3a'); P.circ(x + 2, 140 - (i % 2) * 8, 6, ['#ff4d6d', '#ffd23f', '#c77dff'][i % 3], { lw: 1.2 }); } P.rr(20, 188, 260, 8, 2, '#8a5d32'); },
  bld_aquarium(P) { P.rr(20, 210, 260, 70, 5, '#c8cdd2'); P.blob([[24, 210], [24, 120], [70, 60], [150, 40], [230, 60], [276, 120], [276, 210]], 'rgba(150,220,245,0.7)'); P.blob([[44, 210], [44, 130], [80, 84], [150, 70], [220, 84], [256, 130], [256, 210]], 'rgba(60,170,210,0.55)', { line: false }); for (const [x, y, c] of [[100, 150, '#ff9a3c'], [170, 120, '#ffd23f'], [200, 170, '#ff6b9a']]) { P.ell(x, y, 16, 9, c, { lw: 1.4 }); P.poly([[x + 14, y], [x + 26, y - 8], [x + 26, y + 8]], c, { lw: 1.4 }); P.circ(x - 8, y - 2, 1.6, '#2b1d14', { line: false }); } P.curve(60, 210, 54, 170, 64, 140, '#e85d75', 5, { outline: true }); P.curve(240, 210, 246, 180, 236, 150, '#47d1c4', 5, { outline: true }); P.rr(110, 232, 80, 48, 4, '#7d4f24'); },
  bld_harbor(P) { P.rr(6, 130, 388, 40, 3, '#c9904e'); for (let i = 1; i < 14; i++) P.line(6 + i * 27.7, 130, 6 + i * 27.7, 170, '#8a5d32', 1.6); for (const x of [14, 130, 270, 386]) post(P, x, 166, 30); P.poly([[40, 180], [150, 180], [136, 196], [54, 196]], '#e63946'); P.line(96, 180, 96, 120, '#6b4423', 3); P.poly([[98, 124], [98, 174], [136, 174]], '#fff1d6'); P.poly([[250, 180], [350, 180], [338, 196], [262, 196]], '#2a9d8f'); P.line(300, 180, 300, 130, '#6b4423', 3); P.poly([[302, 134], [302, 174], [336, 174]], '#fff1d6'); P.rr(172, 40, 14, 92, 2, '#e07a5f'); P.rr(172, 40, 90, 12, 2, '#e07a5f'); P.line(256, 52, 256, 90, '#4a4f58', 2); P.rr(246, 90, 20, 14, 2, '#ffd23f'); P.rr(150, 104, 60, 28, 3, '#b9854f'); },
  bld_great_temple(P) { P.rr(10, 340, 380, 50, 4, '#bfc4ca'); P.rr(40, 300, 320, 44, 4, '#cfd4d8'); P.rr(70, 262, 260, 42, 4, '#dfe3e6'); for (let i = 0; i < 6; i++) { P.rr(86 + i * 46, 120, 26, 146, 3, '#f1f3f4'); P.rr(80 + i * 46, 108, 38, 14, 2, '#dfe3e6'); } P.poly([[70, 112], [200, 28], [330, 112]], '#d9cfa8'); P.poly([[100, 108], [200, 48], [300, 108]], '#ece4c4', { line: false }); P.circ(200, 78, 22, 'rgba(255,230,120,0.5)', { line: false }); P.circ(200, 78, 13, '#ffd23f'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.line(200 + Math.cos(a) * 16, 78 + Math.sin(a) * 16, 200 + Math.cos(a) * 24, 78 + Math.sin(a) * 24, '#ffd23f', 2.4); } P.rr(168, 188, 64, 80, 30, '#4a3a2a'); P.circ(200, 220, 8, 'rgba(160,255,230,0.8)', { line: false }); P.sparkle(60, 80, 8); P.sparkle(346, 90, 8); },
};

export function getBuildingSprite(id, w, h, state = 'built', S = 128) {
  const key = `bd|${id}|${state}|${S}`; if (cacheW.has(key)) return cacheW.get(key);
  const cv = makeCanvas(w * S, h * S); const c = cv.getContext('2d');
  const P = new Painter(c, S);
  const fn = BLD[id];
  if (state === 'site') { c.globalAlpha = 0.34; }
  try { if (fn) fn(P); else { P.rr(20, 20, 60 * w, 60 * h, 6, '#c9a36a'); } } catch (e) { P.rr(10, 10, 80, 80, 6, '#f66'); console.warn('bld', id, e); }
  c.globalAlpha = 1;
  P.end();
  if (state === 'site') {
    // tint to a pale blueprint and add a dashed glowing outline
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(140,200,255,0.55)'; c.fillRect(0, 0, cv.width, cv.height); c.restore();
  }
  cacheW.set(key, cv); return cv;
}

/* --------------------------------------------------------------- residents */
const EXPR = {
  neutral: { brow: 0, mouth: 'flat', eye: 1 },
  happy: { brow: -1, mouth: 'smile', eye: 0.85 },
  worried: { brow: 2, mouth: 'frown', eye: 1.1 },
  excited: { brow: -2, mouth: 'open', eye: 1.2 },
};
export const EXPRESSIONS = Object.keys(EXPR);

function hairBack(P, id, hair) {
  switch (id) {
    case 'marlene': P.blob([[30, 36], [26, 62], [34, 80], [50, 84], [66, 80], [74, 62], [70, 36], [50, 18]], hair); break;
    case 'tala': P.circ(50, 14, 11, hair); break;
    case 'lena': P.circ(66, 22, 10, hair); break;
    case 'rosa': P.blob([[30, 40], [32, 64], [40, 68], [60, 68], [68, 64], [70, 40], [50, 22]], hair); break;
    case 'kai': break;
    default: break;
  }
}
function hairFront(P, id, hair, skin) {
  const top = (h = 0) => P.blob([[30, 40], [32, 26 - h], [50, 18 - h], [68, 26 - h], [70, 40], [60, 34], [40, 34]], hair);
  switch (id) {
    case 'marlene': top(2); P.blob([[50, 20], [66, 28], [70, 44], [60, 34]], hair); break;
    case 'beni': P.blob([[32, 40], [34, 62], [44, 78], [50, 82], [56, 78], [66, 62], [68, 40], [60, 52], [40, 52]], '#e8e8e8'); break;
    case 'mateo': top(0); P.blob([[34, 52], [38, 60], [50, 62], [62, 60], [66, 52], [58, 56], [42, 56]], shade(hair, 0.1)); break;
    case 'tala': top(2); break;
    case 'rosa': top(2); break;
    case 'kai': top(4); P.line(30, 36, 70, 36, '#e63946', 5, { outline: true }); P.poly([[68, 36], [80, 30], [74, 42]], '#e63946'); break;
    case 'victor': top(0); break;
    case 'okoye': top(0); P.blob([[34, 54], [50, 58], [66, 54], [62, 64], [38, 64]], shade(hair, 0.15), { line: false }); break;
    case 'lena': top(1); P.blob([[30, 40], [32, 54], [36, 58], [38, 40]], hair); P.blob([[70, 40], [68, 54], [64, 58], [62, 40]], hair); break;
    default: top(0);
  }
}
function hat(P, id, accent) {
  switch (id) {
    case 'beni': P.ell(50, 28, 28, 8, '#1f2a44'); P.poly([[30, 28], [34, 8], [66, 8], [70, 28]], '#f1f5f9'); P.rr(33, 20, 34, 7, 2, '#1f2a44'); P.circ(50, 17, 4, accent, { lw: 1.2 }); break;
    case 'mateo': P.rr(30, 22, 40, 12, 6, accent); P.poly([[62, 30], [82, 32], [62, 36]], shade(accent, -0.2)); break;
    case 'rosa': P.rr(32, 12, 36, 16, 8, '#fff'); P.circ(38, 12, 9, '#fff'); P.circ(50, 8, 10, '#fff'); P.circ(62, 12, 9, '#fff'); P.rr(32, 24, 36, 8, 2, '#fff'); break;
    case 'victor': P.blob([[30, 32], [32, 14], [50, 8], [68, 14], [70, 32]], '#ffd23f'); P.rr(26, 28, 48, 7, 3, '#e6b422'); P.rr(46, 8, 8, 10, 2, '#e6b422', { line: false }); break;
    case 'okoye': P.ell(50, 26, 32, 7, '#7a5a36'); P.blob([[34, 26], [36, 10], [50, 6], [64, 10], [66, 26]], '#8a6a46'); P.rr(36, 20, 28, 5, 1, accent, { line: false }); break;
    case 'lena': P.ell(50, 24, 30, 7, '#c8a868'); P.blob([[36, 24], [38, 10], [50, 6], [62, 10], [64, 24]], '#d8b878'); P.rr(38, 19, 24, 4, 1, '#7a5a36', { line: false }); break;
    default: break;
  }
}
function drawFace(P, id, e, skin) {
  const x = EXPR[e] || EXPR.neutral;
  const eyeR = 3.2 * x.eye;
  P.circ(40, 46, eyeR, '#2b1d14', { line: false }); P.circ(60, 46, eyeR, '#2b1d14', { line: false });
  P.circ(41, 45, eyeR * 0.35, '#fff', { line: false }); P.circ(61, 45, eyeR * 0.35, '#fff', { line: false });
  const bw = 2.2;
  const by = 38 - (x.brow === 2 ? 1 : 0);
  P.line(34, by - (x.brow === 2 ? -2 : x.brow < 0 ? 1 : 0) + (x.brow < 0 ? -1 : 0), 45, by - (x.brow === 2 ? 3 : x.brow < 0 ? 2 : 0), '#4a3022', bw);
  P.line(55, by - (x.brow === 2 ? 3 : x.brow < 0 ? 2 : 0), 66, by - (x.brow === 2 ? -2 : x.brow < 0 ? 1 : 0) + (x.brow < 0 ? -1 : 0), '#4a3022', bw);
  P.ell(34, 54, 4.5, 2.6, 'rgba(255,110,120,0.4)', { line: false }); P.ell(66, 54, 4.5, 2.6, 'rgba(255,110,120,0.4)', { line: false });
  const c = P.c;
  if (x.mouth === 'smile') { c.beginPath(); c.moveTo(41, 57); c.quadraticCurveTo(50, 67, 59, 57); c.lineWidth = 2.2; c.strokeStyle = '#7a2e2e'; c.stroke(); }
  else if (x.mouth === 'frown') { c.beginPath(); c.moveTo(42, 62); c.quadraticCurveTo(50, 55, 58, 62); c.lineWidth = 2.2; c.strokeStyle = '#7a2e2e'; c.stroke(); P.curve(66, 42, 68, 48, 66, 52, 'rgba(120,200,255,0.9)', 2); }
  else if (x.mouth === 'open') { P.ell(50, 61, 6, 5, '#7a2e2e', { lw: 1.4 }); P.ell(50, 63, 3.6, 2, '#ff8a8a', { line: false }); }
  else { P.line(43, 60, 57, 60, '#7a2e2e', 2.2); }
}
export function paintResident(P, r, expr = 'neutral') {
  const skin = r.skin, hair = r.hair, outfit = r.outfit, accent = r.accent;
  hairBack(P, r.id, hair);
  // shoulders / outfit
  P.blob([[10, 100], [16, 80], [34, 72], [50, 76], [66, 72], [84, 80], [90, 100]], outfit);
  P.poly([[40, 74], [50, 90], [60, 74]], shade(outfit, 0.25), { lw: 1.4 });
  if (r.id === 'victor' || r.id === 'okoye') P.rr(34, 82, 32, 5, 2, accent, { lw: 1.2 });
  P.rr(44, 64, 12, 14, 4, shade(skin, -0.08));
  P.ell(50, 46, 24, 26, skin);
  P.ell(26.5, 48, 3.8, 5.5, skin); P.ell(73.5, 48, 3.8, 5.5, skin);
  hairFront(P, r.id, hair, skin);
  drawFace(P, r.id, expr, skin);
  if (r.id === 'tala' || r.id === 'lena') { P.circ(40, 46, 8, 'rgba(255,255,255,0.15)', { lw: 1.6, stroke: '#4a3a2a' }); P.circ(60, 46, 8, 'rgba(255,255,255,0.15)', { lw: 1.6, stroke: '#4a3a2a' }); P.line(48, 46, 52, 46, '#4a3a2a', 1.6); }
  if (r.id === 'mateo' || r.id === 'victor') { P.blob([[34, 56], [40, 70], [50, 74], [60, 70], [66, 56], [58, 62], [42, 62]], shade(hair, 0.05), { line: false }); }
  if (r.id === 'beni') { P.blob([[36, 58], [42, 78], [50, 84], [58, 78], [64, 58], [56, 64], [44, 64]], '#f1f1f1'); }
  hat(P, r.id, accent);
}
export function getResidentPortrait(r, expr = 'neutral', px = 128) {
  const key = `rp|${r.id}|${expr}|${px}`; if (cacheW.has(key)) return cacheW.get(key);
  const cv = makeCanvas(px, px); const c = cv.getContext('2d'); const P = new Painter(c, px);
  paintResident(P, r, expr); P.end(); cacheW.set(key, cv); return cv;
}

/* -------------------------------------------------------- misc structures */
export function getStructSprite(kind, S = 128) {
  const key = `st|${kind}|${S}`; if (cacheW.has(key)) return cacheW.get(key);
  const cv = makeCanvas(S, S); const c = cv.getContext('2d'); const P = new Painter(c, S);
  if (kind === 'soil') { P.blob([[10, 56], [22, 34], [50, 28], [78, 34], [92, 56], [78, 78], [50, 84], [22, 78]], '#7a5236'); P.blob([[22, 56], [34, 42], [50, 38], [66, 42], [78, 56], [66, 70], [50, 72], [34, 70]], '#5e3f25', { line: false }); for (const [x, y] of [[30, 54], [50, 50], [68, 58], [42, 64]]) P.ell(x, y, 5, 1.8, '#8a6040', { line: false }); }
  else if (kind === 'perch') { P.ell(50, 84, 32, 7, '#7a5236'); P.rr(14, 66, 72, 14, 4, '#c9904e'); for (const x of [24, 50, 76]) P.line(x, 66, x, 80, '#8a5d32', 1.6); P.curve(20, 60, 50, 50, 80, 60, '#d9b27a', 3, { outline: true }); P.curve(24, 66, 50, 58, 76, 66, '#e8cb97', 2); }
  else if (kind === 'cloud') { P.circ(50, 56, 30, '#fff'); }
  P.end(); cacheW.set(key, cv); return cv;
}

/* --------------------------------------------------------------------- fog */
export function getFogTile(kind, S = 128) {
  const key = `fog|${kind}|${S}`; if (cacheW.has(key)) return cacheW.get(key);
  const cv = makeCanvas(S, S); const c = cv.getContext('2d');
  const r = artRng(kind === 2 ? 7 : 3);
  const base = kind === 2 ? [150, 130, 200] : [226, 236, 244], hi = kind === 2 ? [190, 170, 235] : [255, 255, 255], lo = kind === 2 ? [118, 100, 168] : [196, 214, 230];
  c.fillStyle = `rgba(${base.join(',')},1)`; c.fillRect(0, 0, S, S);
  // blobs are drawn at nine offsets so the texture tiles seamlessly across neighbouring fog cells
  for (let i = 0; i < 16; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.12 + r() * 0.14), col = i % 3 === 0 ? lo : hi;
    for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
      const g = c.createRadialGradient(x + ox, y + oy, rad * 0.05, x + ox, y + oy, rad);
      g.addColorStop(0, `rgba(${col.join(',')},${i % 3 === 0 ? 0.35 : 0.7})`); g.addColorStop(1, `rgba(${col.join(',')},0)`);
      c.fillStyle = g; c.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  cacheW.set(key, cv); return cv;
}

/* ------------------------------------------------------------------- icons */
const ICONS = {
  coin(P) { P.circ(50, 50, 38, '#ffd23f'); P.circ(50, 50, 28, 'rgba(0,0,0,0)', { stroke: '#b57f12', lw: 2.4 }); P.text('$', 50, 52, 38, '#b57f12', { outline: false }); P.shine(36, 34, 8, 4, 0.7); },
  pearl(P) { P.circ(50, 52, 34, '#f4e8ee'); P.circ(50, 52, 34, 'rgba(0,0,0,0)', { stroke: '#d6b4c4', lw: 1.5 }); P.shine(38, 38, 10, 5, 0.9); },
  energy(P) { P.poly([[58, 6], [24, 54], [46, 54], [38, 94], [76, 42], [52, 42]], '#ffd23f'); P.shine(44, 30, 4, 10, 0.6); },
  amulet(P) { P.circ(50, 56, 30, '#e6b422'); P.circ(50, 56, 22, '#3d8f8f'); P.star(50, 56, 15, 4, '#bff5ea', { inner: 5 }); P.curve(28, 28, 50, 6, 72, 28, '#c9962b', 4, { outline: true }); },
  ticket(P) { P.rr(8, 24, 84, 52, 6, '#f4e3b0'); P.rr(8, 24, 22, 52, 5, '#e63946'); P.star(62, 50, 14, 5, '#e63946', { inner: 6 }); },
  star(P) { P.star(50, 52, 42, 5, '#ffd23f', { inner: 18 }); P.shine(40, 36, 6, 3, 0.7); },
  heart(P) { P.blob([[50, 90], [12, 56], [14, 30], [34, 22], [50, 38], [66, 22], [86, 30], [88, 56]], '#e63946'); P.shine(32, 36, 6, 3, 0.7); },
  lock(P) { P.curve(30, 48, 30, 14, 70, 14, '#c0c6cb', 9, { outline: true }); P.line(70, 14, 70, 48, '#c0c6cb', 9, { outline: true }); P.rr(20, 44, 60, 46, 8, '#ffd23f'); P.circ(50, 64, 6, '#5a4a14'); P.rr(47.5, 64, 5, 14, 2, '#5a4a14'); },
  quest(P) { P.rr(18, 12, 64, 78, 6, '#f4e3b0'); P.rr(18, 12, 64, 12, 6, '#c8934a'); P.rr(18, 78, 64, 12, 6, '#c8934a'); for (let i = 0; i < 4; i++) P.line(28, 36 + i * 10, 72, 36 + i * 10, '#8a6a36', 3); },
  shop(P) { P.rr(14, 40, 72, 50, 4, '#ffb347'); stripes(P, 8, 14, 84, 30, 5, '#e63946', '#fff'); P.rr(40, 58, 20, 32, 3, '#7d4f24'); },
  hammer(P) { P.with(p => { p.rr(-5, -10, 10, 56, 3, '#b9854f'); p.rr(-24, -28, 48, 24, 5, '#8d99a1'); p.rr(-24, -28, 48, 8, 4, '#c0c6cb', { line: false }); }, 50, 40, 0.7); },
  trade(P) { P.rr(10, 44, 80, 46, 4, '#b9854f'); stripes(P, 6, 12, 88, 28, 6, '#2ec4b6', '#fff'); P.circ(34, 58, 8, '#ffd23f'); P.circ(54, 62, 8, '#e63946'); P.circ(72, 58, 8, '#9bcb4a'); },
  journal(P) { P.rr(16, 10, 68, 82, 6, '#3a86a8'); P.rr(16, 10, 12, 82, 4, '#2b6a86'); P.circ(56, 44, 14, '#ffd23f'); P.text('✦', 56, 45, 18, '#7a5a14', { outline: false }); P.line(34, 74, 74, 74, '#bfe9ff', 3); },
  pet(P) { P.ell(50, 62, 26, 24, '#ff9a55'); P.circ(50, 38, 20, '#ff9a55'); P.poly([[34, 28], [38, 10], [46, 24]], '#ff9a55'); P.poly([[66, 28], [62, 10], [54, 24]], '#ff9a55'); P.circ(43, 38, 3, '#2b1d14', { line: false }); P.circ(57, 38, 3, '#2b1d14', { line: false }); P.circ(50, 46, 3, '#e66', { line: false }); },
  map(P) { P.poly([[10, 22], [36, 14], [64, 22], [90, 14], [90, 78], [64, 86], [36, 78], [10, 86]], '#f4e3b0'); P.line(36, 14, 36, 78, '#c8a868', 1.6); P.line(64, 22, 64, 86, '#c8a868', 1.6); P.line(24, 60, 44, 40, '#e63946', 3); P.line(44, 60, 24, 40, '#e63946', 3); P.curve(48, 70, 62, 40, 80, 56, '#6aa84f', 3); },
  magnet(P) {
    const ring = (r0, r1) => { const o = [], i = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; o.push([50 + r1 * Math.cos(a), 46 + r1 * Math.sin(a)]); i.push([50 + r0 * Math.cos(a), 46 + r0 * Math.sin(a)]); } return o.concat(i.reverse()); };
    P.poly(ring(17, 37), '#e63946'); P.rr(13, 14, 24, 32, 2, '#e63946'); P.rr(63, 14, 24, 32, 2, '#e63946');
    P.rr(13, 14, 24, 14, 2, '#dfe6ea'); P.rr(63, 14, 24, 14, 2, '#dfe6ea'); P.shine(30, 56, 4, 8, 0.5);
  },
  gear(P) { P.circ(50, 50, 30, '#8d99a1'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.rr(50 + Math.cos(a) * 30 - 7, 50 + Math.sin(a) * 30 - 7, 14, 14, 3, '#8d99a1'); } P.circ(50, 50, 30, '#8d99a1'); P.circ(50, 50, 12, '#e8eef2'); },
  sell(P) { P.circ(50, 50, 38, '#2ec4b6'); P.text('$', 50, 52, 44, '#fff'); },
  sound(P) { P.poly([[12, 38], [34, 38], [58, 18], [58, 82], [34, 62], [12, 62]], '#e8eef2'); P.curve(68, 36, 80, 50, 68, 64, '#e8eef2', 5, { outline: true }); P.curve(76, 24, 96, 50, 76, 76, '#e8eef2', 5, { outline: true }); },
  chest(P) { P.rr(14, 46, 72, 40, 5, '#c9962b'); P.poly([[14, 46], [18, 22], [82, 22], [86, 46]], '#ffd23f'); P.rr(40, 40, 20, 22, 4, '#ffe27a'); },
  gift(P) { P.rr(16, 42, 68, 46, 4, '#e63946'); P.rr(12, 30, 76, 16, 4, '#ff6b6b'); P.rr(44, 30, 12, 58, 0, '#ffd23f', { line: false }); P.blob([[50, 30], [30, 12], [22, 24], [44, 30]], '#ffd23f'); P.blob([[50, 30], [70, 12], [78, 24], [56, 30]], '#ffd23f'); },
  sun(P) { P.circ(50, 50, 22, '#ffd23f'); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; P.line(50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30, 50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, '#ffb347', 5, { outline: true }); } },
  boat(P) { P.poly([[12, 62], [88, 62], [76, 86], [24, 86]], '#8a5d32'); P.line(50, 62, 50, 14, '#6b4423', 4, { outline: true }); P.poly([[54, 18], [86, 54], [54, 58]], '#fff'); P.poly([[46, 26], [20, 54], [46, 58]], '#fff'); },
};
export function iconCanvas(name, px = 64) {
  const key = `ic|${name}|${px}`; if (cacheW.has(key)) return cacheW.get(key);
  const cv = makeCanvas(px, px); const c = cv.getContext('2d'); const P = new Painter(c, px);
  (ICONS[name] || ICONS.star)(P); P.end(); cacheW.set(key, cv); return cv;
}
export function iconURL(name, px = 64) {
  const key = `iu|${name}|${px}`; if (cacheW.has(key)) return cacheW.get(key);
  const url = iconCanvas(name, px).toDataURL('image/png'); cacheW.set(key, url); return url;
}
export const ICON_NAMES = Object.keys(ICONS);
