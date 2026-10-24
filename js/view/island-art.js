// Procedural island. The board is still a square grid of cells, but the land you see is not: a smooth, noisy coastline is grown around the
// land cells, with shallow lagoon water, a wet-sand rim, a beach and blended grass biomes. Foam and wave lines follow the coast and move,
// and palms, trees, bushes, rocks and shells are scattered around the shore. Fog is drawn as a scalloped cloud bank instead of square tiles.
import { hexToRgb, artRng, hashStr } from './artkit.js';
import { THEME } from './world-art.js';
import { getDecor, DECOR } from './island-decor.js';

let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function setIslandCanvasFactory(fn) { makeCanvas = fn; }

/** Field levels: grass starts at TG, the waterline is TC, the shallows fade out at TS. */
export const TG = 0.42, TC = 0.17, TS = 0.02, MARGIN = 7;

const PALETTES = {
  home: { beach: [[247, 230, 174], [214, 190, 130]], water: [[40, 184, 208], [150, 240, 226]], trees: ['palm', 'palm', 'palm', 'tree'], tint: 'default', sea: ['#3fc1d1', '#2a9fc2'], foam: 'rgba(255,255,255,' },
  lagoon: { beach: [[247, 230, 174], [214, 190, 130]], water: [[40, 184, 208], [150, 240, 226]], trees: ['palm', 'palm', 'reed'], tint: 'default', sea: ['#3cc6cf', '#29a4bf'], foam: 'rgba(255,255,255,' },
  pirate: { beach: [[238, 208, 150], [200, 166, 108]], water: [[40, 176, 200], [140, 226, 214]], trees: ['palm', 'palm', 'rock'], tint: 'default', sea: ['#38b3c4', '#278aa8'], foam: 'rgba(255,255,255,' },
  volcano: { beach: [[96, 82, 80], [66, 54, 54]], water: [[44, 120, 140], [110, 190, 190]], trees: ['dead', 'dead', 'rock'], tint: 'ash', sea: ['#2f7f90', '#1f5a70'], foam: 'rgba(235,245,245,' },
  ice: { beach: [[244, 251, 255], [205, 228, 242]], water: [[96, 184, 226], [210, 244, 255]], trees: ['pine', 'pine', 'pine', 'rock'], tint: 'snow', sea: ['#6cc1e6', '#4aa6d6'], foam: 'rgba(255,255,255,' },
  candy: { beach: [[255, 236, 246], [240, 200, 224]], water: [[110, 196, 236], [200, 236, 255]], trees: ['lolli', 'lolli', 'bush'], tint: 'pink', sea: ['#74c8f0', '#52a9e0'], foam: 'rgba(255,255,255,' },
  night: { beach: [[110, 125, 185], [80, 92, 150]], water: [[28, 50, 110], [70, 100, 170]], trees: ['mush', 'mush', 'dead', 'rock'], tint: 'night', sea: ['#1d2a52', '#101a38'], foam: 'rgba(190,205,255,' }
};
/** Which small ground detail a theme's `deco` produces. */
const GROUND = { shell: ['shell'], furrow: ['tuft'], flower: ['flower', 'tuft'], pebble: ['pebble', 'tuft'], ripple: ['shell', 'tuft'], leaf: ['tuft'], rock: ['pebble', 'tuft'], moss: ['tuft'], glow: ['star'], plank: [], tile: [], lava: ['crack'], ice: ['crystal'], sprinkle: ['sprinkle'], star: ['star'] };

/* ------------------------------------------------------------------ maths */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function hash2(ix, iy, seed) { let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
/** Running-sum box blurs with zero padding; three passes approximate a gaussian of sigma ~ r + 0.5 samples. */
function boxH(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const o = y * w; let sum = 0;
    for (let x = -r; x <= r; x++) if (x >= 0 && x < w) sum += src[o + x];
    for (let x = 0; x < w; x++) { dst[o + x] = sum * inv; const add = x + r + 1, rem = x - r; sum += (add < w ? src[o + add] : 0) - (rem >= 0 ? src[o + rem] : 0); }
  }
}
function boxV(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) if (y >= 0 && y < h) sum += src[y * w + x];
    for (let y = 0; y < h; y++) { dst[y * w + x] = sum * inv; const add = y + r + 1, rem = y - r; sum += (add < h ? src[add * w + x] : 0) - (rem >= 0 ? src[rem * w + x] : 0); }
  }
}

/** Marching squares: one Path2D of short segments along field == level (sample (i,j) sits at world (px(i), py(j))). */
function contourPath(F, FW, FH, level, px, py) {
  const p = new Path2D();
  for (let j = 0; j < FH - 1; j++) {
    for (let i = 0; i < FW - 1; i++) {
      const a = F[j * FW + i], b = F[j * FW + i + 1], c = F[(j + 1) * FW + i + 1], d = F[(j + 1) * FW + i];
      const idx = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = px(i), x1 = px(i + 1), y0 = py(j), y1 = py(j + 1);
      const Tx = x0 + (level - a) / (b - a) * (x1 - x0), Ty = y0;
      const Rx = x1, Ry = y0 + (level - b) / (c - b) * (y1 - y0);
      const Bx = x0 + (level - d) / (c - d) * (x1 - x0), By = y1;
      const Lx = x0, Ly = y0 + (level - a) / (d - a) * (y1 - y0);
      const seg = (ax, ay, bx, by) => { p.moveTo(ax, ay); p.lineTo(bx, by); };
      switch (idx) {
        case 1: case 14: seg(Lx, Ly, Tx, Ty); break;
        case 2: case 13: seg(Tx, Ty, Rx, Ry); break;
        case 3: case 12: seg(Lx, Ly, Rx, Ry); break;
        case 4: case 11: seg(Rx, Ry, Bx, By); break;
        case 5: seg(Lx, Ly, Tx, Ty); seg(Rx, Ry, Bx, By); break;
        case 6: case 9: seg(Tx, Ty, Bx, By); break;
        case 7: case 8: seg(Lx, Ly, Bx, By); break;
        case 10: seg(Tx, Ty, Rx, Ry); seg(Lx, Ly, Bx, By); break;
        default: break;
      }
    }
  }
  return p;
}

/* ------------------------------------------------------------------- bake */
/**
 * Build everything static about an island for `board`: the shaded ground+water canvas, the coastline paths used for animated foam,
 * and the scenery list. o: {cell, themeAt(i)->theme key, palette, quality, seed}.
 */
export function buildIsland(board, o) {
  const { cell, themeAt, palette = 'home', quality = 'high', seed = 1 } = o;
  const low = quality === 'low', FS = low ? 6 : 8, M = MARGIN, kb = low ? 0.28 : 0.4, pal = PALETTES[palette] || PALETTES.home;
  const FW = (board.w + 2 * M) * FS, FH = (board.h + 2 * M) * FS, N = FW * FH;
  const cx = i => (i + 0.5) / FS - M, cy = j => (j + 0.5) / FS - M; // sample -> cell coordinates
  const px = i => cx(i) * cell, py = j => cy(j) * cell;            // sample -> world

  // land coverage and biome colours (colour is blurred together with coverage so biomes blend smoothly and continue past the coast)
  const mask = new Float32Array(N), cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N);
  const cellCol = new Array(board.n);
  for (let k = 0; k < board.n; k++) if (board.land[k]) { const th = THEME[themeAt(k)] || THEME.meadow, a = hexToRgb(th.a); cellCol[k] = a; }
  for (let j = 0; j < FH; j++) {
    const yy = Math.floor(cy(j));
    for (let i = 0; i < FW; i++) {
      const xx = Math.floor(cx(i)); if (xx < 0 || yy < 0 || xx >= board.w || yy >= board.h) continue;
      const k = board.idx(xx, yy); if (!board.land[k]) continue;
      const n = j * FW + i, col = cellCol[k]; mask[n] = 1; cr[n] = col[0]; cg[n] = col[1]; cb[n] = col[2];
    }
  }
  const tmp = new Float32Array(N), rad = Math.round(1.2 * FS);
  for (const arr of [mask, cr, cg, cb]) for (let pass = 0; pass < 3; pass++) { boxH(arr, tmp, FW, FH, rad); boxV(tmp, arr, FW, FH, rad); }

  // the coastline field: blurred coverage plus layered noise, plus a few islets out at sea
  const dth = THEME[palette === 'home' ? 'meadow' : palette] || THEME.meadow, dflt = hexToRgb(dth.a);
  const sd = (seed | 0) & 0xffff, F = new Float32Array(N), Nm = new Float32Array(N), Nw = new Float32Array(N), Gr = new Float32Array(N), Gg = new Float32Array(N), Gb = new Float32Array(N);
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
    const n = j * FW + i, x = cx(i), y = cy(j), m = Math.max(mask[n], 1e-5);
    F[n] = mask[n] + (vnoise(x / 6, y / 6, sd) - 0.5) * 0.22 + (vnoise(x / 2.2, y / 2.2, sd + 7) - 0.5) * 0.11 + (vnoise(x / 0.9, y / 0.9, sd + 13) - 0.5) * 0.03;
    const known = smooth(0.004, 0.05, mask[n]); // far from any land cell there is no biome colour to continue (islets): fall back to the palette's own
    Gr[n] = lerp(dflt[0], cr[n] / m, known); Gg[n] = lerp(dflt[1], cg[n] / m, known); Gb[n] = lerp(dflt[2], cb[n] / m, known);
    Nm[n] = 0.6 * vnoise(x * 1.1, y * 1.1, sd + 3) + 0.4 * vnoise(x * 2.6, y * 2.6, sd + 5);
    Nw[n] = vnoise(x * 0.9, y * 0.9, sd + 9);
  }
  const rng = artRng(hashStr(`isl${seed}`) || 1), islets = [];
  const want = low ? 2 : Math.max(3, Math.round((board.w + board.h) / 9));
  for (let tries = 0; tries < 80 && islets.length < want; tries++) {
    const x = -M + 2 + rng() * (board.w + 2 * M - 4), y = -M + 2 + rng() * (board.h + 2 * M - 4);
    const i = clamp(Math.round(x * FS + M * FS - 0.5), 0, FW - 1), j = clamp(Math.round(y * FS + M * FS - 0.5), 0, FH - 1);
    if (mask[j * FW + i] > 0.004 || islets.some(q => Math.hypot(q[0] - x, q[1] - y) < 3.2)) continue;
    islets.push([x, y, 0.5 + rng() * 0.25, 0.5 + rng() * 0.25]);
  }
  for (const [x, y, amp, s] of islets) {
    const r = s * 3.2, i0 = Math.max(0, Math.floor((x - r + M) * FS)), i1 = Math.min(FW - 1, Math.ceil((x + r + M) * FS)), j0 = Math.max(0, Math.floor((y - r + M) * FS)), j1 = Math.min(FH - 1, Math.ceil((y + r + M) * FS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d2 = (cx(i) - x) ** 2 + (cy(j) - y) ** 2; F[j * FW + i] += amp * Math.exp(-d2 / (2 * s * s)); }
  }
  const sample = (arr, x, y) => { // bilinear, x/y in cells
    const fx = clamp((x + M) * FS - 0.5, 0, FW - 1.001), fy = clamp((y + M) * FS - 0.5, 0, FH - 1.001), i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, o = j * FW + i;
    return lerp(lerp(arr[o], arr[o + 1], tx), lerp(arr[o + FW], arr[o + FW + 1], tx), ty);
  };

  // shade every pixel: shallow water -> wet sand -> dry sand -> grass
  const BW = Math.ceil((board.w + 2 * M) * cell * kb), BH = Math.ceil((board.h + 2 * M) * cell * kb);
  const cv = makeCanvas(BW, BH), g = cv.getContext('2d'), img = g.createImageData(BW, BH), d = img.data;
  const [sandDry, sandWet] = pal.beach, [wMid, wBright] = pal.water;
  for (let py_ = 0; py_ < BH; py_++) {
    const yc = (py_ + 0.5) / kb / cell - M, fy = clamp((yc + M) * FS - 0.5, 0, FH - 1.001), j = fy | 0, ty = fy - j;
    for (let px_ = 0; px_ < BW; px_++) {
      const xc = (px_ + 0.5) / kb / cell - M, fx = clamp((xc + M) * FS - 0.5, 0, FW - 1.001), i = fx | 0, tx = fx - i, o = j * FW + i, o2 = o + FW;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      const f = F[o] * w00 + F[o + 1] * w10 + F[o2] * w01 + F[o2 + 1] * w11, q = (py_ * BW + px_) * 4;
      if (f < TS) continue; // open sea: transparent, the animated sea shows through
      // water
      const s = clamp((f - TS) / (TC - TS), 0, 1), nw = Nw[o] * w00 + Nw[o + 1] * w10 + Nw[o2] * w01 + Nw[o2 + 1] * w11;
      const wk = clamp(Math.pow(s, 1.25) + (nw - 0.5) * 0.16 * s, 0, 1);
      let r = lerp(wMid[0], wBright[0], wk), gg = lerp(wMid[1], wBright[1], wk), b = lerp(wMid[2], wBright[2], wk), a = smooth(0, 0.5, s) * 0.96;
      if (f > TC - 0.012) {
        // land
        const wet = 1 - smooth(TC, TC + 0.045, f), sr = lerp(sandDry[0], sandWet[0], wet), sg = lerp(sandDry[1], sandWet[1], wet), sb = lerp(sandDry[2], sandWet[2], wet);
        const gm = smooth(TG - 0.04, TG + 0.05, f), m = (Nm[o] * w00 + Nm[o + 1] * w10 + Nm[o2] * w01 + Nm[o2 + 1] * w11 - 0.5) * 0.16 + 1 - 0.04 * gm * (1 - smooth(TG + 0.05, TG + 0.16, f));
        const lr = lerp(sr, (Gr[o] * w00 + Gr[o + 1] * w10 + Gr[o2] * w01 + Gr[o2 + 1] * w11) * m, gm), lg = lerp(sg, (Gg[o] * w00 + Gg[o + 1] * w10 + Gg[o2] * w01 + Gg[o2 + 1] * w11) * m, gm), lb = lerp(sb, (Gb[o] * w00 + Gb[o + 1] * w10 + Gb[o2] * w01 + Gb[o2 + 1] * w11) * m, gm);
        const wl = smooth(TC - 0.012, TC + 0.004, f);
        r = lerp(r, lr, wl); gg = lerp(gg, lg, wl); b = lerp(b, lb, wl); a = lerp(a, 1, wl);
      }
      d[q] = r; d[q + 1] = gg; d[q + 2] = b; d[q + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  // faint cell markers: the items live on a grid even though the island is not square
  g.save(); g.scale(kb, kb); g.translate(M * cell, M * cell);
  g.lineWidth = 2.4; g.strokeStyle = 'rgba(40,60,20,0.10)'; g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let k = 0; k < board.n; k++) {
    if (!board.land[k]) continue;
    const x = board.x(k) * cell + 4, y = board.y(k) * cell + 4;
    g.beginPath(); if (g.roundRect) g.roundRect(x, y, cell - 8, cell - 8, 14); else g.rect(x, y, cell - 8, cell - 8); g.fill(); g.stroke();
  }
  g.restore();

  // animated shoreline paths: the waterline plus nested lines out into the shallows
  const wpx = i => px(i), wpy = j => py(j);
  const foam = contourPath(F, FW, FH, TC, wpx, wpy), levels = low ? 5 : 7, waves = [];
  for (let k = 0; k < levels; k++) waves.push(contourPath(F, FW, FH, lerp(TS + 0.035, TC - 0.015, k / (levels - 1)), wpx, wpy));
  const swell = contourPath(F, FW, FH, lerp(TS, TC, 0.45), wpx, wpy);
  const glints = [], grng = artRng(hashStr(`glint${seed}`) || 1), nGlint = low ? 90 : 220;                                                // twinkles scattered over the shallows
  for (let guard = 0; glints.length < nGlint && guard < nGlint * 80; guard++) {
    const x = -M + grng() * (board.w + 2 * M), y = -M + grng() * (board.h + 2 * M), f = sample(F, x, y);   // its own random stream, so the scenery stays where it was
    if (f > TS + 0.05 && f < TC - 0.04) glints.push({ x: x * cell, y: y * cell, ph: grng() * 6.283, r: 0.6 + grng() * 0.8 });
  }

  // scenery
  const decor = [];
  const nearestLand = (x, y) => {
    let best = 9; const x0 = Math.floor(x), y0 = Math.floor(y);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const gx = x0 + dx, gy = y0 + dy; if (!board.inBounds(gx, gy) || !board.land[board.idx(gx, gy)]) continue;
      const ex = Math.max(gx - x, 0, x - (gx + 1)), ey = Math.max(gy - y, 0, y - (gy + 1)); best = Math.min(best, Math.hypot(ex, ey));
    }
    return best;
  };
  const place = (kind, x, y, v, tint, size = 1) => decor.push({ kind, v, tint, x: x * cell, y: y * cell, s: size, ph: rng() * 6.283 });
  const spaced = (x, y, min) => !decor.some(q => q.s && DECOR[q.kind].size > 0.4 && Math.hypot(q.x / cell - x, q.y / cell - y) < min);
  const tries = Math.round((low ? 1800 : 4200) * Math.max(1, ((board.w + 2 * M) * (board.h + 2 * M)) / 2376)); // scenery density stays the same on bigger maps
  for (let n = 0; n < tries; n++) {
    const x = -M + 1 + rng() * (board.w + 2 * M - 2), y = -M + 1 + rng() * (board.h + 2 * M - 2), f = sample(F, x, y);
    if (f < TC - 0.09 || f > TG) continue;
    const dist = nearestLand(x, y), r = rng();
    if (f >= TC + 0.02 && f <= 0.3 && dist >= 0.75 && r < 0.7 && spaced(x, y, 0.8)) {
      const kind = pal.trees[(rng() * pal.trees.length) | 0], e = 0.12, gx = sample(F, x + e, y) - sample(F, x - e, y);
      place(kind, x, y, gx > 0.04 ? 0 : gx < -0.04 ? 2 : 1, pal.tint, 0.9 + rng() * 0.25); // lean away from the land, towards the water
    } else if (f >= 0.27 && f <= 0.4 && dist >= 0.45 && r < 0.35 && spaced(x, y, 0.5)) place(r < 0.2 ? 'bush' : 'tuft', x, y, (rng() * 4) | 0, pal.tint, 0.9 + rng() * 0.3);
    else if (f >= TC - 0.09 && f <= 0.26 && dist >= 0.55 && r < 0.2 && spaced(x, y, 0.55)) place('rock', x, y, (rng() * 2) | 0, pal.tint, 0.8 + rng() * 0.5);
    else if (f >= TC + 0.01 && f <= 0.3 && dist >= 0.5 && r < 0.45) place('shell', x, y, (rng() * 3) | 0, 'default', 0.8 + rng() * 0.5);
  }
  for (let k = 0; k < board.n; k++) { // small details inside the cells; kept tiny and low so items read clearly on top
    if (!board.land[k]) continue;
    const th = THEME[themeAt(k)] || THEME.meadow, opts = GROUND[th.deco] || [], bx = board.x(k), by = board.y(k);
    if (!opts.length) continue;
    const count = rng() < 0.55 ? (rng() < 0.28 ? 2 : 1) : 0;
    for (let c = 0; c < count; c++) {
      const kind = opts[(rng() * opts.length) | 0];
      place(kind, bx + 0.14 + rng() * 0.72, by + 0.3 + rng() * 0.62, (rng() * 4) | 0, ['ice', 'night', 'volcano', 'candy'].includes(themeAt(k)) ? pal.tint : 'default', 0.8 + rng() * 0.5);
    }
  }
  decor.sort((a, b) => a.y - b.y);

  return { board, palette, quality, cell, canvas: cv, x0: -M * cell, y0: -M * cell, kb, foam, waves, swell, glints, decor, pal, fieldAt: (x, y) => sample(F, x, y) };
}

/* ------------------------------------------------------------------- draw */
/** Ground + water canvas (only the visible part), then the animated shoreline. view = {x0,y0,x1,y1} in world units. */
export function drawIslandBase(c, isl, view, t, reduce) {
  const { kb, x0, y0, canvas } = isl;
  const vx0 = Math.max(view.x0, x0), vy0 = Math.max(view.y0, y0), vx1 = Math.min(view.x1, x0 + canvas.width / kb), vy1 = Math.min(view.y1, y0 + canvas.height / kb);
  if (vx1 > vx0 && vy1 > vy0) {
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(canvas, (vx0 - x0) * kb, (vy0 - y0) * kb, (vx1 - vx0) * kb, (vy1 - vy0) * kb, vx0, vy0, vx1 - vx0, vy1 - vy0);
  }
  drawShore(c, isl, view, t, reduce);
}

function sparkle(c, x, y, r) { const q = r * 0.22; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + q, y - q); c.lineTo(x + r, y); c.lineTo(x + q, y + q); c.lineTo(x, y + r); c.lineTo(x - q, y + q); c.lineTo(x - r, y); c.lineTo(x - q, y - q); c.closePath(); c.fill(); }

/**
 * The animated coast, cartoon style. From the open sea in: a slow pulse of lighter water over the shallows, wave fronts that roll up the
 * beach (each with a teal underline), a standing foam line with an outline and a wet halo on the sand, crawling blobs of foam just off the
 * edge, and glints twinkling in the shallows. Reduced motion draws one still frame of the same thing.
 */
function drawShore(c, isl, view, t, reduce) {
  const { waves, foam, swell, pal, glints } = isl, n = waves.length, A = pal.foam, tt = reduce ? 0 : t, low = isl.quality === 'low';
  const deep = pal.water[0].join(','), light = pal.water[1].join(',');
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // a slow swell pulsing in the shallows: a pale band and a turquoise one, out of step
  c.strokeStyle = `${A}${(0.07 + 0.05 * Math.sin(tt * 0.8)).toFixed(3)})`; c.lineWidth = 34; c.stroke(swell);
  // wave fronts rolling in towards the beach, thickening and fading as they break
  const fronts = 2;
  for (let k = 0; k < fronts; k++) {
    const p = reduce ? 0.3 + k * 0.4 : ((tt / 6.5 + k / fronts) % 1), f = p * (n - 1), env = Math.sin(p * Math.PI);
    for (let i = Math.max(0, Math.floor(f) - 1); i <= Math.min(n - 1, Math.ceil(f) + 1); i++) {
      const w = 1 - Math.abs(i - f) / 1.15; if (w <= 0) continue;
      c.strokeStyle = `${A}${(0.66 * env * w).toFixed(3)})`; c.lineWidth = 2.4 + 4.5 * p; c.stroke(waves[i]);
    }
  }
  // the standing foam line: outline, wet halo, white line
  const breathe = reduce ? 0 : Math.sin(tt * 1.3);
  c.strokeStyle = `rgba(${deep},0.22)`; c.lineWidth = 11 + 2 * breathe; c.stroke(foam);
  c.strokeStyle = `${A}${(0.28 + 0.08 * breathe).toFixed(3)})`; c.lineWidth = 15 + 3 * breathe; c.stroke(foam);
  c.strokeStyle = `${A}0.92)`; c.lineWidth = 5 + 1.2 * breathe; c.stroke(foam);
  // blobs of foam crawling along the edge, two layers moving in opposite directions
  if (!low) {
    c.strokeStyle = `${A}0.8)`; c.lineWidth = 7; c.setLineDash([10, 28]); c.lineDashOffset = -tt * 9; c.stroke(waves[n - 2]);
    c.strokeStyle = `${A}0.55)`; c.lineWidth = 5; c.setLineDash([5, 36]); c.lineDashOffset = tt * 6; c.stroke(waves[n - 3]);
    c.setLineDash([]);
  }
  // glints in the shallows
  c.fillStyle = `${A}1)`;
  for (const q of glints) {
    if (q.x < view.x0 || q.x > view.x1 || q.y < view.y0 || q.y > view.y1) continue;
    const tw = Math.max(0, Math.sin(tt * 1.7 + q.ph)), k = tw * tw * tw; if (k < 0.06) continue;
    c.globalAlpha = 0.9 * k; sparkle(c, q.x, q.y, 7 * q.r * k);
  }
  c.restore();
}

/** Scenery sorted by depth; trees and reeds sway. */
export function drawIslandDecor(c, isl, view, t, reduce) {
  const { decor, cell } = isl;
  let lo = 0, hi = decor.length; const ymin = view.y0 - 0.05 * cell;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (decor[mid].y < ymin) lo = mid + 1; else hi = mid; }
  const ymax = view.y1 + 1.8 * cell;
  for (let i = lo; i < decor.length; i++) {
    const q = decor[i]; if (q.y > ymax) break;
    const def = DECOR[q.kind], s = def.size * cell * q.s;
    if (q.x < view.x0 - s || q.x > view.x1 + s) continue;
    if (def.shadow) { c.fillStyle = 'rgba(40,30,10,0.2)'; c.beginPath(); c.ellipse(q.x + s * 0.04, q.y + s * 0.02, s * def.shadow, s * def.shadow * 0.3, 0, 0, 7); c.fill(); }
    const spr = getDecor(q.kind, q.v, q.tint), rot = def.sway && !reduce ? Math.sin(t * 1.4 + q.ph) * def.sway : 0;
    if (rot) { c.save(); c.translate(q.x, q.y); c.rotate(rot); c.drawImage(spr, -s / 2, -s * 0.9, s, s); c.restore(); }
    else c.drawImage(spr, q.x - s / 2, q.y - s * 0.9, s, s);
  }
}

/* -------------------------------------------------------------------- fog */
/** A cloud bank over locked zones and pockets: scalloped edges, spilling a little over the beach but never over open cells. */
export function bakeFog(board, cell, getTile, fieldAt = () => 0) {
  const M = MARGIN, kf = Math.min(0.5, Math.sqrt(5.5e6 / ((board.w + 2 * M) * (board.h + 2 * M) * cell * cell))), W = Math.ceil((board.w + 2 * M) * cell * kf), H = Math.ceil((board.h + 2 * M) * cell * kf); // the bank is capped at ~5.5M pixels: larger canvases draw extremely slowly
  const cv = makeCanvas(W, H), g = cv.getContext('2d'), rng = artRng(4242);
  g.scale(kf, kf); g.translate(M * cell, M * cell);
  // kind per cell: 0 open, 1/2 fog, -1 sea. A notch of sea boxed in by fog on every side would show bare ground through the cloud, so it is fogged too.
  const kinds = new Int8Array(board.n).fill(-1);
  for (let k = 0; k < board.n; k++) if (board.land[k]) kinds[k] = board.fog[k];
  const nb4 = (x, y) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => (board.inBounds(x + dx, y + dy) ? kinds[board.idx(x + dx, y + dy)] : -1));
  const ghosts = [];
  for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
    if (kinds[board.idx(x, y)] !== -1) continue;
    const n4 = nb4(x, y), fogged = n4.filter(v => v > 0).length; if (!n4.includes(0) && (fogged >= 2 || (fogged >= 1 && fieldAt(x + 0.5, y + 0.5) > 0.3))) ghosts.push(board.idx(x, y));
  }
  for (const k of ghosts) kinds[k] = 1;
  const fogAt = (x, y) => (board.inBounds(x, y) ? kinds[board.idx(x, y)] : -1);
  for (const kind of [1, 2]) {
    const halo = kind === 2 ? 'rgba(200,180,255,0.55)' : 'rgba(236,246,255,0.6)';
    const sides = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const inner = [], rects = [], arcs = [];
    for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
      if (fogAt(x, y) !== kind) continue;
      const X = x * cell, Y = y * cell;
      const open = sides.map(([dx, dy]) => { const f = fogAt(x + dx, y + dy); return f > 0 ? 0 : f < 0 ? 2 : 1; }); // 0 joined to fog, 1 open land, 2 coast
      if (!open[0] && !open[1] && !open[2] && !open[3]) { inner.push([X - 0.5, Y - 0.5, cell + 1, cell + 1]); continue; }
      const L = open[3] === 1 ? 0.1 : 0, R = open[1] === 1 ? 0.1 : 0, T = open[0] === 1 ? 0.1 : 0, B = open[2] === 1 ? 0.1 : 0;
      rects.push([X + L * cell - 0.5, Y + T * cell - 0.5, (1 - L - R) * cell + 1, (1 - T - B) * cell + 1]);
      sides.forEach(([dx, dy], s) => {
        if (!open[s]) return;
        const out = open[s] === 2, rad = (out ? 0.52 : 0.27) * cell, off = (out ? 0.12 : -0.13) * cell;
        for (let k = 0; k < 3; k++) {
          const tt = (k + 0.5) / 3 + (rng() - 0.5) * 0.12, ex = dx ? (dx > 0 ? X + cell : X) : X + tt * cell, ey = dy ? (dy > 0 ? Y + cell : Y) : Y + tt * cell;
          arcs.push([ex + dx * off, ey + dy * off, rad * (0.85 + rng() * 0.3)]);
        }
      });
    }
    // The glow around the scalloped edge is a slightly larger, translucent copy of the same circles. (A blurred shadow per shape made large
    // maps take minutes to rasterise, because every shadow works on a canvas-sized layer.)
    g.fillStyle = halo;
    for (const [ex, ey, r] of arcs) { g.beginPath(); g.arc(ex, ey, r + cell * 0.07, 0, 7); g.fill(); }
    g.fillStyle = g.createPattern(getTile(kind, 256), 'repeat');
    for (const r of inner) g.fillRect(r[0], r[1], r[2], r[3]);
    for (const r of rects) g.fillRect(r[0], r[1], r[2], r[3]);
    for (const [ex, ey, r] of arcs) { g.beginPath(); g.arc(ex, ey, r, 0, 7); g.fill(); }
  }
  return { canvas: cv, x0: -M * cell, y0: -M * cell, kf };
}
export function drawFogBank(c, fog, view, t, reduce) {
  const { canvas, x0, y0, kf } = fog, dx = reduce ? 0 : Math.sin(t * 0.25) * 4, dy = reduce ? 0 : Math.cos(t * 0.21) * 3;
  const vx0 = Math.max(view.x0, x0), vy0 = Math.max(view.y0, y0), vx1 = Math.min(view.x1, x0 + canvas.width / kf), vy1 = Math.min(view.y1, y0 + canvas.height / kf);
  if (vx1 <= vx0 || vy1 <= vy0) return;
  c.save(); c.globalAlpha = 0.96; c.imageSmoothingEnabled = true;
  c.drawImage(canvas, (vx0 - x0) * kf, (vy0 - y0) * kf, (vx1 - vx0) * kf, (vy1 - vy0) * kf, vx0 + dx, vy0 + dy, vx1 - vx0, vy1 - vy0);
  c.restore();
}
