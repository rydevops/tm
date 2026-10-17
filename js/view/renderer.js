// Canvas renderer for the island board: camera, ground, fog, structures, obstacles, items, effects and drag feedback.
import { drawItem, getSprite, SPRITE_PX } from './art.js';
import { getObstacleSprite, getBuildingSprite, getResidentPortrait, getStructSprite, getFogTile, drawSea, drawCracks, iconCanvas } from './world-art.js';
import { previewMerge } from '../core/merge.js';
import { hashStr, shade, OUT } from './artkit.js';
import { buildIsland, drawIslandBase, drawIslandDecor, bakeFog, drawFogBank } from './island-art.js';

export const CELL = 72;
const BALLOONS = ['#ff5a5f', '#ffb347', '#5bc0eb', '#9be37f', '#c58bff'];
const EASE = t => 1 - Math.pow(1 - t, 3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Renderer {
  constructor(canvas, app) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.app = app;
    this.cam = { x: 0, y: 0, zoom: 0.9, tx: null, ty: null, tz: null };
    this.W = 0; this.H = 0; this.dpr = 1;
    this.drag = null;            // {src:{type,idx|slot|i}, item, px, py, over, preview}
    this.hover = -1;             // keyboard / mouse hover cell
    this.cursor = -1;            // keyboard cursor cell
    this.anim = new Map();       // cell -> {kind, t0, dur, from}
    this.parts = []; this.floats = []; this.rings = []; this.flights = [];
    this.hint = null;            // {cells:[], kind, until}
    this.t = 0; this.last = 0; this.shake = 0;
    this.selected = -1;          // tap-to-move selection
    this.magnetCells = null;     // Set of cells the magnet could use while it is armed
    this.dirtyHud = false;
    this.fogPulse = 0;
    this.popped = new Set();     // gift-drop ids whose balloon pop has already been shown
  }

  /* --------------------------------------------------------------- setup */
  get game() { return this.app.game; }
  get data() { return this.app.game.data; }
  get ctxG() { return this.app.game.ctx; }
  get settings() { return this.app.game.s.settings; }
  get reduce() { return !!this.settings.reduceMotion; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings?.quality === 'low' ? 1.25 : 2.5);
    const r = this.cv.getBoundingClientRect();
    this.W = Math.max(50, r.width); this.H = Math.max(50, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
  }

  /** Called whenever the active context changes (home <-> island). */
  setContext(initial = false) {
    const ctx = this.ctxG, b = ctx.board;
    this.anim.clear(); this.flights.length = 0; this.hint = null; this.drag = null; this.cursor = -1; this.selected = -1; this.magnetCells = null;
    if (ctx.kind === 'home') {
      const saved = this.game.s.flags.cam;
      if (saved && initial) { this.cam.x = saved.x; this.cam.y = saved.y; this.cam.zoom = saved.zoom; }
      else this.focusCell(this.game.defaultAnchor ? this.game.defaultAnchor(ctx) : b.idx(26, 75), 0.85, true);
    } else this.fitBoard();
    this.clampCamera();
  }
  fitBoard() {
    const b = this.ctxG.board; const zw = this.W / ((b.w + 3) * CELL), zh = (this.H - 220) / ((b.h + 3) * CELL);
    this.cam.zoom = clamp(Math.min(zw, zh), 0.5, 1.6);
    this.cam.x = (b.w * CELL) / 2 - this.W / 2 / this.cam.zoom; this.cam.y = (b.h * CELL) / 2 - (this.H - 60) / 2 / this.cam.zoom;
  }
  focusCell(idx, zoom = null, instant = false) {
    const b = this.ctxG.board, x = (b.x(idx) + 0.5) * CELL, y = (b.y(idx) + 0.5) * CELL;
    const z = zoom || this.cam.zoom;
    const nx = x - this.W / 2 / z, ny = y - this.H / 2 / z;
    if (instant || this.reduce) { this.cam.x = nx; this.cam.y = ny; this.cam.zoom = z; this.cam.tx = null; }
    else { this.cam.tx = nx; this.cam.ty = ny; this.cam.tz = z; }
  }
  clampCamera() {
    const b = this.ctxG.board, z = this.cam.zoom, m = 2.5 * CELL;
    const vw = this.W / z, vh = this.H / z, ww = b.w * CELL, wh = b.h * CELL;
    this.cam.x = vw >= ww + 2 * m ? (ww - vw) / 2 : clamp(this.cam.x, -m, ww + m - vw);
    this.cam.y = vh >= wh + 2 * m ? (wh - vh) / 2 : clamp(this.cam.y, -m - 80 / z, wh + m + 200 / z - vh);
  }
  zoomAt(px, py, factor) {
    const z0 = this.cam.zoom, z1 = clamp(z0 * factor, 0.45, 1.8);
    const wx = this.cam.x + px / z0, wy = this.cam.y + py / z0;
    this.cam.zoom = z1; this.cam.x = wx - px / z1; this.cam.y = wy - py / z1; this.cam.tx = null; this.clampCamera();
  }
  pan(dx, dy) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.cam.tx = null; this.clampCamera(); }

  screenToWorld(px, py) { return [this.cam.x + px / this.cam.zoom, this.cam.y + py / this.cam.zoom]; }
  worldToScreen(wx, wy) { return [(wx - this.cam.x) * this.cam.zoom, (wy - this.cam.y) * this.cam.zoom]; }
  cellAt(px, py) {
    const [wx, wy] = this.screenToWorld(px, py), b = this.ctxG.board;
    const cx = Math.floor(wx / CELL), cy = Math.floor(wy / CELL);
    if (!b.inBounds(cx, cy)) return -1; return b.idx(cx, cy);
  }
  cellCenterScreen(idx) { const b = this.ctxG.board; return this.worldToScreen((b.x(idx) + 0.5) * CELL, (b.y(idx) + 0.5) * CELL); }

  /* ------------------------------------------------------------ effects */
  now() { return performance.now() / 1000; }
  setAnim(idx, kind, dur = 0.3, delay = 0, extra = {}) { this.anim.set(idx, { kind, t0: this.now() + delay, dur, ...extra }); }
  burst(idx, color = '#fff6a8', n = 14, power = 1) {
    if (this.reduce) n = Math.min(n, 4);
    const b = this.ctxG.board; const x = (b.x(idx) + 0.5) * CELL, y = (b.y(idx) + 0.5) * CELL;
    for (let i = 0; i < n && this.parts.length < 500; i++) {
      const a = Math.random() * 6.283, v = (60 + Math.random() * 140) * power;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, t: 0, color, size: 3 + Math.random() * 4, shape: Math.random() < 0.5 ? 'star' : 'dot', g: 260 });
    }
  }
  ring(idx, color = 'rgba(255,230,120,0.9)', big = 1) { const b = this.ctxG.board; this.rings.push({ x: (b.x(idx) + 0.5) * CELL, y: (b.y(idx) + 0.5) * CELL, t: 0, life: 0.55 + big * 0.1, color, r1: CELL * (0.9 + big * 0.7) }); }
  floatText(idx, text, color = '#fff', size = 22, dy = 0) { const b = this.ctxG.board; this.floats.push({ x: (b.x(idx) + 0.5) * CELL, y: (b.y(idx) + 0.2) * CELL + dy, text, color, t: 0, life: 1.1, size }); }
  flight(item, fromIdx, toIdx, dur = 0.22, delay = 0, onDone = null) {
    const b = this.ctxG.board;
    this.flights.push({ item, fx: (b.x(fromIdx) + 0.5) * CELL, fy: (b.y(fromIdx) + 0.5) * CELL, tx: (b.x(toIdx) + 0.5) * CELL, ty: (b.y(toIdx) + 0.5) * CELL, t0: this.now() + delay, dur, arc: 0, to: toIdx, onDone });
  }
  screenShake(a = 4) { if (!this.reduce) this.shake = Math.max(this.shake, a); }

  /* ------------------------------------------------------------- helpers */
  zoneTheme(i) {
    const ctx = this.ctxG, d = this.data;
    if (ctx.kind === 'island') return d.islandById[ctx.islandId].palette;
    const zn = d.cellZone[i]; return zn ? d.zones[zn - 1].theme : 'meadow';
  }
  /** The baked island for the active board, rebuilt when the board, palette or graphics quality changes. */
  ensureIsland() {
    const ctx = this.ctxG, b = ctx.board, q = this.settings.quality, pal = ctx.kind === 'island' ? this.data.islandById[ctx.islandId].palette : 'home';
    const cur = this.isl;
    if (cur && cur.board === b && cur.quality === q && cur.palette === pal) return cur;
    this.isl = buildIsland(b, { cell: CELL, themeAt: i => this.zoneTheme(i), palette: pal, quality: q, seed: ctx.kind === 'island' ? hashStr(ctx.islandId) : 20241 });
    this.fog = null;
    return this.isl;
  }
  visibleRange() {
    const b = this.ctxG.board, z = this.cam.zoom;
    const x0 = clamp(Math.floor(this.cam.x / CELL) - 1, 0, b.w - 1), x1 = clamp(Math.ceil((this.cam.x + this.W / z) / CELL) + 1, 0, b.w - 1);
    const y0 = clamp(Math.floor(this.cam.y / CELL) - 1, 0, b.h - 1), y1 = clamp(Math.ceil((this.cam.y + this.H / z) / CELL) + 1, 0, b.h - 1);
    return { x0, x1, y0, y1 };
  }

  /* ---------------------------------------------------------------- frame */
  frame(ts) {
    const now = ts / 1000, dt = Math.min(0.05, now - (this.last || now)); this.last = now; this.t = now;
    const g = this.game; if (!g || !g.ctx) return;
    // camera easing
    const cam = this.cam;
    if (cam.tx != null) { const k = 1 - Math.pow(0.0008, dt); cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.zoom += (cam.tz - cam.zoom) * k; if (Math.abs(cam.tx - cam.x) < 0.5 && Math.abs(cam.ty - cam.y) < 0.5) cam.tx = null; this.clampCamera(); }
    // effects update
    for (const p of this.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < f.life);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < r.life);
    this.flights = this.flights.filter(f => { if (this.now() >= f.t0 + f.dur) { f.onDone?.(); return false; } return true; });
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 18);
    this.draw();
  }

  draw() {
    const c = this.c, dpr = this.dpr, ctxG = this.ctxG, b = ctxG.board, d = this.data, z = this.cam.zoom, t = this.t;
    const night = ctxG.kind === 'island' && ctxG.rule === 'darkness';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSea(c, this.W, this.H, t, this.cam.x * z, this.cam.y * z, z, night, this.reduce);
    const sh = this.shake ? [(Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake] : [0, 0];
    c.setTransform(dpr * z, 0, 0, dpr * z, (-this.cam.x * z + sh[0]) * dpr, (-this.cam.y * z + sh[1]) * dpr);
    const { x0, x1, y0, y1 } = this.visibleRange();
    const o = { t, reduce: this.reduce, pips: true, numbers: !!this.settings.numbers, patterns: !!this.settings.patterns };

    // --- island: shaded ground and water, animated shoreline, scenery
    const isl = this.ensureIsland(), view = { x0: this.cam.x - 40, y0: this.cam.y - 40, x1: this.cam.x + this.W / z + 40, y1: this.cam.y + this.H / z + 40 };
    drawIslandBase(c, isl, view, t, this.reduce);
    drawIslandDecor(c, isl, view, t, this.reduce);

    // --- structures
    const drawn = new Set();
    for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) {
      if (!b.inBounds(x, y)) continue; const i = b.idx(x, y), st = b.struct[i];
      if (!st || drawn.has(st)) continue; drawn.add(st);
      if (b.fog[i] === 1 && st.kind !== 'islandgen') continue;
      this.drawStruct(c, st, o);
    }
    // --- obstacles
    const seenOb = new Set();
    for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) {
      if (!b.inBounds(x, y)) continue; const i = b.idx(x, y), ob = b.obst[i];
      if (!ob || seenOb.has(ob)) continue; seenOb.add(ob); this.drawObstacle(c, ob, o);
    }
    // --- items
    const dragSrc = this.drag && this.drag.src.type === 'board' ? this.drag.src.idx : -1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = b.idx(x, y), it = b.items[i]; if (!it || i === dragSrc || b.fog[i] === 1) continue;
      if (b.lit && !b.lit[i]) continue;
      this.drawBoardItem(c, it, x, y, i, o);
    }
    // --- fog
    this.drawFog(c);
    // --- darkness overlay (Lantern Isle)
    if (b.lit) {
      c.save(); c.fillStyle = 'rgba(10,14,40,0.82)'; c.shadowColor = 'rgba(10,14,40,0.82)'; c.shadowBlur = this.reduce ? 0 : 28; // feathered edge so the dark never looks like a square
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = b.idx(x, y); if (b.land[i] && !b.lit[i]) c.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5); }
      c.restore();
    }
    // --- balloon gift drops (above the fog: balloons drift in from the sky)
    this.drawDrops(c);
    // --- hints, highlights
    this.drawHighlights(c, o);
    // --- effects
    for (const r of this.rings) { const k = r.t / r.life; c.strokeStyle = r.color; c.globalAlpha = 1 - k; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(r.x, r.y, r.r1 * EASE(k), 0, 7); c.stroke(); c.globalAlpha = 1; }
    for (const f of this.flights) this.drawFlight(c, f, o);
    for (const p of this.parts) { const k = p.t / p.life; c.globalAlpha = 1 - k; c.fillStyle = p.color; if (p.shape === 'star') { this.starPath(c, p.x, p.y, p.size * 1.4); c.fill(); } else { c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, 7); c.fill(); } }
    c.globalAlpha = 1;
    for (const f of this.floats) { const k = f.t / f.life; c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; c.font = `800 ${f.size}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = 'rgba(40,25,10,0.85)'; const yy = f.y - EASE(k) * 46; c.strokeText(f.text, f.x, yy); c.fillStyle = f.color; c.fillText(f.text, f.x, yy); }
    c.globalAlpha = 1;
    // --- drag
    if (this.drag) this.drawDrag(c, o);
    // --- zone lock labels (screen-space UI over fog)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawZoneLabels(c);
    // keyboard cursor
    if (this.cursor >= 0) { const [sx, sy] = this.worldToScreen(b.x(this.cursor) * CELL, b.y(this.cursor) * CELL); c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 5]); c.strokeRect(sx + 2, sy + 2, CELL * z - 4, CELL * z - 4); c.setLineDash([]); c.strokeStyle = '#2b7a9b'; c.lineWidth = 1.5; c.strokeRect(sx + 4, sy + 4, CELL * z - 8, CELL * z - 8); }
  }

  starPath(c, x, y, r) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }

  /* ---------------------------------------------------------- items & anim */
  drawBoardItem(c, it, x, y, i, o) {
    const X = x * CELL, Y = y * CELL, a = this.anim.get(i); let sc = 1, alpha = 1, dx = 0, dy = 0;
    // plate under the item
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); if (c.roundRect) c.roundRect(X + 4, Y + 4, CELL - 8, CELL - 8, 14); else c.rect(X + 4, Y + 4, CELL - 8, CELL - 8); c.fill();
    if (a) {
      const k = (this.now() - a.t0) / a.dur;
      if (k < 0) { if (a.kind === 'pop' || a.kind === 'merge') return; }
      else if (k >= 1) this.anim.delete(i);
      else if (a.kind === 'pop') { sc = EASE(k) * 1.0 + Math.sin(k * Math.PI) * 0.18; alpha = Math.min(1, k * 3); }
      else if (a.kind === 'merge') { sc = 0.4 + EASE(k) * 0.6 + Math.sin(k * Math.PI) * 0.35; }
      else if (a.kind === 'shake') { dx = Math.sin(k * 40) * 5 * (1 - k); }
      else if (a.kind === 'bounce') { dy = -Math.sin(k * Math.PI) * 12; }
      else if (a.kind === 'hit') { sc = 1 - Math.sin(k * Math.PI) * 0.12; dx = Math.sin(k * 30) * 3 * (1 - k); }
    }
    if (this.selected === i) { dy -= 4; c.fillStyle = 'rgba(255,240,150,0.5)'; c.beginPath(); c.arc(X + CELL / 2, Y + CELL / 2, CELL * 0.48, 0, 7); c.fill(); }
    if (sc !== 1 || dx || dy) { c.save(); c.translate(X + CELL / 2 + dx, Y + CELL / 2 + dy); c.scale(sc, sc); c.translate(-CELL / 2, -CELL / 2); c.globalAlpha = alpha; drawItem(c, this.data, it, 0, 0, CELL, o); c.restore(); }
    else drawItem(c, this.data, it, X, Y, CELL, o);
    // generator charge dots on portable generators are not needed; hint ready-to-collect on currency handled by art
  }

  /* ----------------------------------------------------------- gift drops */
  // A drop is a balloon carrying a gift. It floats down to its reserved cell, the balloon pops on touchdown and the gift stays on the ground.
  // Everything is derived from the drop's startAt/landAt, so a reload mid-flight just resumes the descent.
  drawDrops(c) {
    const g = this.game, list = g.s.drops?.list; if (!list?.length || this.ctxG.kind !== 'home') return;
    const b = this.ctxG.board, now = g.now(), e = this.data.economy.drops, gs = CELL * 0.8;
    const hang = gs * 0.5 + CELL * 0.7 + CELL * 0.56; // gift centre -> balloon centre
    for (const dr of list) {
      if (now < dr.startAt || b.fog[dr.cell] === 1) continue;
      const X = (b.x(dr.cell) + 0.5) * CELL, Y = (b.y(dr.cell) + 0.5) * CELL, col = BALLOONS[dr.id % BALLOONS.length];
      if (now < dr.landAt) {
        const k = clamp((now - dr.startAt) / (dr.landAt - dr.startAt), 0, 1);
        this.drawFalling(c, dr, X, Y, k, e.fallCells * CELL, hang, gs, col);
        continue;
      }
      const age = (now - dr.landAt) / 1000;
      if (!this.popped.has(dr.id)) { this.popped.add(dr.id); if (age < 1.5) this.popBalloon(X, Y - hang, X, Y, col); }
      this.drawLanded(c, X, Y, age, hang, gs, col);
    }
  }
  drawFalling(c, dr, X, Y, k, fall, hang, gs, col) {
    const e = 0.5 * k + 0.5 * (1 - (1 - k) * (1 - k)); // drifts down, easing into the landing
    const sway = this.reduce ? 0 : Math.sin(this.t * 1.7 + dr.ph) * CELL * 0.32 * (1 - e);
    const tilt = this.reduce ? 0 : Math.cos(this.t * 1.7 + dr.ph) * 0.12 * (1 - e);
    // the landing spot's shadow grows as the gift gets closer
    c.save(); c.globalAlpha = 0.08 + 0.22 * e; c.fillStyle = '#28190a'; c.beginPath(); c.ellipse(X, Y + gs * 0.36, gs * (0.16 + 0.22 * e), gs * 0.07, 0, 0, 7); c.fill(); c.restore();
    c.save(); c.translate(X + sway, Y - fall * (1 - e) - hang); c.rotate(tilt);
    this.drawBalloon(c, col, hang, gs);
    c.restore();
  }
  /** Balloon, string and gift hanging below it, in a frame whose origin is the balloon centre. */
  drawBalloon(c, col, hang, gs, balloon = true, gift = true) {
    const rx = CELL * 0.46, ry = CELL * 0.56;
    if (gift) {
      c.strokeStyle = 'rgba(60,40,25,0.8)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, ry + 5); c.lineTo(0, hang - gs * 0.42); c.stroke();
      c.drawImage(iconCanvas('gift', 128), -gs / 2, hang - gs / 2, gs, gs);
    }
    if (!balloon) return;
    const gr = c.createRadialGradient(-rx * 0.3, -ry * 0.35, rx * 0.1, 0, 0, ry * 1.05);
    gr.addColorStop(0, shade(col, 0.4)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.25));
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = OUT; c.fillStyle = col;
    c.beginPath(); c.moveTo(0, ry - 3); c.lineTo(-7, ry + 8); c.lineTo(7, ry + 8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-rx * 0.4, -ry * 0.38, rx * 0.17, ry * 0.3, -0.45, 0, 7); c.fill();
  }
  drawLanded(c, X, Y, age, hang, gs, col) {
    const t = this.t;
    c.fillStyle = 'rgba(255,255,255,0.16)'; this.rrect(c, X - CELL / 2 + 4, Y - CELL / 2 + 4, CELL - 8, CELL - 8, 14); c.fill();
    // touchdown: a quick squash, then one small hop
    let sx = 1, sy = 1, lift = 0;
    if (!this.reduce) {
      if (age < 0.18) { const q = Math.sin(age / 0.18 * Math.PI); sy = 1 - 0.2 * q; sx = 1 + 0.12 * q; }
      else if (age < 0.5) lift = -Math.sin((age - 0.18) / 0.32 * Math.PI) * CELL * 0.14;
    }
    c.save(); c.globalAlpha = 0.28; c.fillStyle = '#28190a'; c.beginPath(); c.ellipse(X, Y + gs * 0.36, gs * 0.34, gs * 0.09, 0, 0, 7); c.fill(); c.restore();
    // a soft pulsing glow tells the player there is something to collect
    const pulse = this.reduce ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3 + X * 0.01);
    const glow = c.createRadialGradient(X, Y, CELL * 0.1, X, Y, CELL * 0.55);
    glow.addColorStop(0, `rgba(255,236,150,${0.25 + 0.2 * pulse})`); glow.addColorStop(1, 'rgba(255,236,150,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(X, Y, CELL * 0.55, 0, 7); c.fill();
    c.save(); c.translate(X, Y + gs * 0.4 + lift); c.scale(sx, sy); c.drawImage(iconCanvas('gift', 128), -gs / 2, -gs * 0.9, gs, gs); c.restore();
    if (!this.reduce) {
      const ph = t * 1.6 + X * 0.02, a = 0.5 + 0.5 * Math.sin(ph);
      c.fillStyle = `rgba(255,248,190,${0.4 + 0.6 * a})`; this.starPath(c, X + gs * 0.36, Y - gs * 0.36, CELL * 0.1 * (0.6 + a)); c.fill();
    }
    // the balloon's last frame: it swells and vanishes
    if (age < 0.14) {
      const q = age / 0.14; c.save(); c.globalAlpha = 1 - q; c.translate(X, Y - hang); c.scale(1 + 0.35 * q, 1 + 0.35 * q);
      this.drawBalloon(c, col, hang, gs, true, false); c.restore();
    }
  }
  /** Balloon pop: coloured scraps rain down onto the gift, with a puff of dust where it lands. */
  popBalloon(bx, by, gx, gy, col) {
    const n = this.reduce ? 5 : 18;
    for (let i = 0; i < n && this.parts.length < 500; i++) {
      const a = Math.random() * 6.283, v = 90 + Math.random() * 170;
      this.parts.push({ x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.6 + Math.random() * 0.5, t: 0, color: i % 4 ? col : '#ffffff', size: 3 + Math.random() * 4, shape: 'dot', g: 320 });
    }
    for (let i = 0; i < (this.reduce ? 2 : 7) && this.parts.length < 500; i++) {
      const a = -Math.PI * Math.random(), v = 40 + Math.random() * 70;
      this.parts.push({ x: gx + (Math.random() - 0.5) * CELL * 0.5, y: gy + CELL * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, life: 0.4 + Math.random() * 0.3, t: 0, color: '#e8d6a8', size: 3 + Math.random() * 3, shape: 'dot', g: 120 });
    }
    this.rings.push({ x: bx, y: by, t: 0, life: 0.35, color: 'rgba(255,255,255,0.9)', r1: CELL * 0.8 });
    this.app.audio.sfx('pop'); setTimeout(() => this.app.audio.sfx('drop'), 150);
  }

  drawFlight(c, f, o) {
    const k = clamp((this.now() - f.t0) / f.dur, 0, 1); if (this.now() < f.t0) return;
    const e = EASE(k), x = f.fx + (f.tx - f.fx) * e, y = f.fy + (f.ty - f.fy) * e - Math.sin(k * Math.PI) * CELL * 0.35 * (f.arc || 0.6);
    c.save(); c.translate(x, y); c.scale(1 - k * 0.25, 1 - k * 0.25); c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 * 0.8 + 0.2 : 1;
    drawItem(c, this.data, f.item, -CELL / 2, -CELL / 2, CELL, { ...o, pips: false, bare: true }); c.restore();
  }

  /* ----------------------------------------------------------- structures */
  drawStruct(c, st, o) {
    const g = this.game, d = this.data, t = this.t, X = st.x * CELL, Y = st.y * CELL, W = st.w * CELL, H = st.h * CELL;
    switch (st.kind) {
      case 'site': {
        const def = d.buildingById[st.id];
        c.drawImage(getBuildingSprite(st.id, st.w, st.h, 'site', 128), X, Y, W, H);
        const pulse = this.reduce ? 0.7 : 0.55 + 0.45 * Math.sin(t * 3 + st.x);
        c.save(); c.setLineDash([10, 7]); c.lineDashOffset = this.reduce ? 0 : -t * 18; c.lineWidth = 4; c.strokeStyle = `rgba(255,236,150,${0.55 + 0.4 * pulse})`; c.shadowColor = 'rgba(255,220,100,0.9)'; c.shadowBlur = 12 * pulse;
        this.rrect(c, X + 3, Y + 3, W - 6, H - 6, 14); c.stroke(); c.restore();
        const proj = g.projectFor(st.id), ready = proj && g.projectReady(proj);
        const ic = iconCanvas(ready ? 'star' : 'hammer', 64), s = CELL * 0.62, by = this.reduce ? 0 : Math.sin(t * 3 + st.x) * 3;
        c.drawImage(ic, X + W / 2 - s / 2, Y + H / 2 - s / 2 + by, s, s);
        if (proj) this.drawProjectPips(c, proj, X, Y + H - 14, W);
        break;
      }
      case 'building': {
        c.drawImage(getBuildingSprite(st.id, st.w, st.h, 'built', 128), X, Y, W, H);
        const gen = g.generatorOfBuilding?.(st.id);
        if (gen && gen.kind === 'structure' && g.s.structs[gen.id]) this.drawGenBadge(c, gen, st, X, Y, W, H);
        const def = d.buildingById[st.id];
        if (def?.daily && g.payoutReady?.(st.id)) this.drawBadge(c, X + W - 18, Y + 18, '✓', '#52d273');
        else { const up = g.projectFor(st.id); if (up && up.kind === 'upgrade' && g.projectReady(up)) this.drawBadge(c, X + W - 18, Y + 18, '▲', '#ffd23f'); }
        break;
      }
      case 'resident': {
        if (!st.arrived && !g.s.arrived.includes(st.id)) break;
        const r = d.raw.residents.residents.find(x => x.id === st.id); if (!r) break;
        const wants = g.s.quests.active.some(id => { const q = d.questById[id]; return q.giver === st.id; });
        const bob = this.reduce ? 0 : Math.sin(t * 2 + st.x) * 2;
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(X + CELL / 2, Y + CELL / 2 + bob, CELL * 0.43, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = r.outfit; c.stroke();
        c.save(); c.beginPath(); c.arc(X + CELL / 2, Y + CELL / 2 + bob, CELL * 0.41, 0, 7); c.clip();
        c.drawImage(getResidentPortrait(r, wants ? 'excited' : 'happy', 128), X + CELL * 0.05, Y + CELL * 0.03 + bob, CELL * 0.9, CELL * 0.9); c.restore();
        if (wants) this.drawBadge(c, X + CELL - 10, Y + 10 + bob, '!', '#ff5a5f');
        break;
      }
      case 'soil': case 'perch': {
        c.drawImage(getStructSprite(st.kind === 'soil' ? 'soil' : 'perch', 128), X, Y, CELL, CELL);
        const lv = g.s.living.find(l => l.slot === st.id);
        if (lv) {
          drawItem(c, d, { id: lv.item, s: 0 }, X, Y - CELL * 0.1, CELL, { ...o, pips: false });
          const def = g.livingDefFor?.(lv.item); if (def && lv.stored > 0) this.drawBadge(c, X + CELL - 12, Y + 12, String(lv.stored), '#52d273');
        }
        break;
      }
      case 'islandgen': {
        const def = d.islandById[this.ctxG.islandId]; const info = g.islandChargeInfo?.() || { charges: 0, cap: 0 };
        const pulse = this.reduce ? 1 : 1 + Math.sin(t * 3) * 0.04;
        c.save(); c.translate(X + CELL / 2, Y + CELL / 2); c.scale(pulse, pulse);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(0, 0, CELL * 0.48, 0, 7); c.fill();
        const gid = def.palette === 'ice' ? 'gen_toolbox_01' : 'gen_seed_01';
        drawItem(c, d, { id: gid, s: 0 }, -CELL / 2, -CELL / 2, CELL, { ...o, pips: false, bare: true }); c.restore();
        this.drawChargePill(c, X + CELL / 2, Y + CELL - 6, info.charges, info.cap);
        break;
      }
      case 'guide': {
        const r = d.raw.residents.residents.find(x => x.id === st.id); if (!r) break;
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(X + CELL / 2, Y + CELL / 2, CELL * 0.43, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = r.outfit; c.stroke();
        c.save(); c.beginPath(); c.arc(X + CELL / 2, Y + CELL / 2, CELL * 0.41, 0, 7); c.clip(); c.drawImage(getResidentPortrait(r, 'happy', 128), X + CELL * 0.05, Y + CELL * 0.03, CELL * 0.9, CELL * 0.9); c.restore();
        break;
      }
      case 'pool': {
        c.fillStyle = st.filled ? '#5bc0eb' : '#3a8fb7'; c.beginPath(); c.ellipse(X + CELL / 2, Y + CELL / 2, CELL * 0.42, CELL * 0.32, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = st.filled ? '#bdeeff' : '#1d4d68'; c.stroke();
        if (!st.filled) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `800 ${CELL * 0.3}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', X + CELL / 2, Y + CELL / 2); }
        else { c.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2; c.beginPath(); c.arc(X + CELL / 2 + Math.cos(a) * 12, Y + CELL / 2 + Math.sin(a) * 6, 3, 0, 7); c.fill(); } }
        break;
      }
      case 'vent': {
        c.fillStyle = '#3b2a28'; c.beginPath(); c.ellipse(X + CELL / 2, Y + CELL * 0.6, CELL * 0.4, CELL * 0.28, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ff7a3c'; c.stroke();
        const vs = this.ctxG.vents?.[parseInt(String(st.id).split('_')[1], 10) - 1] || null; const glow = this.reduce ? 0.6 : 0.5 + 0.5 * Math.sin(t * 4);
        c.fillStyle = `rgba(255,140,50,${0.4 + 0.4 * glow})`; c.beginPath(); c.ellipse(X + CELL / 2, Y + CELL * 0.6, CELL * 0.26, CELL * 0.17, 0, 0, 7); c.fill();
        if (vs && vs.stored > 0) this.drawBadge(c, X + CELL - 12, Y + 14, String(vs.stored), '#ff7a3c');
        break;
      }
    }
  }
  rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  drawBadge(c, x, y, text, color) {
    c.save(); c.fillStyle = color; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
    c.fillStyle = '#fff'; c.font = '800 14px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + 1); c.restore();
  }
  drawChargePill(c, cx, cy, n, cap) {
    c.save(); const w = 40, h = 16; this.rrect(c, cx - w / 2, cy - h / 2, w, h, 8); c.fillStyle = 'rgba(30,40,50,0.8)'; c.fill();
    c.fillStyle = n > 0 ? '#ffd23f' : '#ff7b7b'; c.font = '800 11px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`⚡ ${n}/${cap}`, cx, cy + 1); c.restore();
  }
  drawGenBadge(c, gen, st, X, Y, W, H) {
    const g = this.game; const stt = g.s.structs[gen.id]; if (!stt) return;
    if (gen.cost === 'charge') { const cap = g.chargeCap(gen.id, stt.tier); this.drawChargePill(c, X + W / 2, Y + H - 8, stt.charges, cap); }
    else { c.save(); this.drawBadge(c, X + W - 14, Y + H - 14, '⚡', '#2b7a9b'); c.restore(); }
    c.fillStyle = 'rgba(30,40,50,0.8)'; c.beginPath(); c.arc(X + 14, Y + H - 14, 11, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.font = '800 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('T' + stt.tier, X + 14, Y + H - 13);
  }
  drawProjectPips(c, proj, X, Y, W) {
    const g = this.game, fill = g.projectFill(proj.key), total = proj.items.reduce((s, r) => s + r.count, 0);
    const have = proj.items.reduce((s, r) => s + Math.min(fill[r.item] || 0, r.count), 0);
    const w = Math.min(W - 24, 120); const x = X + (W - w) / 2;
    c.save(); this.rrect(c, x, Y - 6, w, 12, 6); c.fillStyle = 'rgba(30,40,50,0.7)'; c.fill(); if (have) { this.rrect(c, x + 1.5, Y - 4.5, Math.max(8, (w - 3) * have / total), 9, 5); c.fillStyle = '#52d273'; c.fill(); } c.restore();
  }

  /* ------------------------------------------------------------ obstacles */
  drawObstacle(c, ob, o) {
    const d = this.data, def = d.obstacleById[ob.type], X = ob.x * CELL, Y = ob.y * CELL, W = ob.w * CELL, H = ob.h * CELL;
    const b = this.ctxG.board; if (b.fog[b.idx(ob.x, ob.y)] === 1) return;
    let dx = 0, sc = 1;
    const a = this.anim.get('ob' + ob.id);
    if (a) { const k = (this.now() - a.t0) / a.dur; if (k >= 1) this.anim.delete('ob' + ob.id); else if (k >= 0) { dx = Math.sin(k * 36) * 5 * (1 - k); sc = 1 - Math.sin(k * Math.PI) * 0.06; } }
    c.save(); c.translate(X + W / 2 + dx, Y + H / 2); c.scale(sc, sc);
    if (b.lit && !b.lit[b.idx(ob.x, ob.y)]) c.globalAlpha = 0.5;
    c.drawImage(getObstacleSprite(ob.type, def, 128), -W / 2, -H / 2, W, H); c.restore();
    if (def.hits > 1) drawCracks(c, X, Y, W, H, 1 - ob.hits / def.hits);
    if (def.hits > 1) { c.save(); this.rrect(c, X + 3, Y + 3, 26, 17, 8); c.fillStyle = 'rgba(30,40,50,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = '800 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×' + ob.hits, X + 16, Y + 12); c.restore(); }
    // required tool badge
    if (def.tool && def.accepts?.minLevel) {
      const tid = `clearing_tools_${String(def.accepts.minLevel).padStart(2, '0')}`; const s = CELL * 0.42;
      c.save(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(X + W - s * 0.55, Y + H - s * 0.55, s * 0.6, 0, 7); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(40,25,10,0.6)'; c.stroke();
      c.drawImage(getSprite(d, tid), X + W - s * 1.1, Y + H - s * 1.1, s, s);
      c.fillStyle = '#3a2a1e'; c.font = '800 11px system-ui'; c.textAlign = 'center'; c.fillText(def.accepts.minLevel, X + W - s * 0.55, Y + H - 2); c.restore();
    }
  }

  /* ----------------------------------------------------------------- fog */
  /** Cloud bank over locked zones and pockets; re-baked only when the fog changes. */
  drawFog(c) {
    const b = this.ctxG.board; let sig = 0; for (let i = 0; i < b.n; i++) if (b.fog[i]) sig = (sig * 31 + i * 3 + b.fog[i]) >>> 0;
    if (!this.fog || this.fog.sig !== sig) { this.fog = bakeFog(b, CELL, getFogTile, this.ensureIsland().fieldAt); this.fog.sig = sig; }
    const z = this.cam.zoom;
    drawFogBank(c, this.fog, { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + this.W / z, y1: this.cam.y + this.H / z }, this.t, this.reduce);
  }
  drawZoneLabels(c) {
    const g = this.game, d = this.data; if (this.ctxG.kind !== 'home') return;
    const z = this.cam.zoom, next = g.nextZone();
    for (const zone of d.zones) {
      if (g.s.zones.unlocked.includes(zone.n)) continue;
      const [x, y, w, h] = zone.rect; const [sx, sy] = this.worldToScreen((x + w / 2) * CELL, (y + h / 2) * CELL);
      if (sx < -200 || sx > this.W + 200 || sy < -100 || sy > this.H + 100) continue;
      const isNext = zone.n === next, req = zone.unlock;
      const ready = isNext && (() => { const q = g.zoneRequirements(zone.n); return q && q.haveLevel && q.haveAmulets && q.haveCleared && q.haveCoins; })();
      c.save(); c.translate(sx, sy); const s = clamp(z * 1.1, 0.7, 1.2); c.scale(s, s);
      const wBox = 150, hBox = isNext ? 78 : 56; this.rrect(c, -wBox / 2, -hBox / 2, wBox, hBox, 16); c.fillStyle = isNext ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.72)'; c.fill(); c.lineWidth = 3; c.strokeStyle = isNext ? '#ffb347' : 'rgba(120,140,160,0.7)'; c.stroke();
      c.drawImage(iconCanvas('lock', 48), -wBox / 2 + 8, -hBox / 2 + 8, 28, 28);
      c.fillStyle = '#2f3b4a'; c.font = '800 13px system-ui,sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(`Zone ${zone.n}`, -wBox / 2 + 42, -hBox / 2 + 22);
      c.font = '600 11px system-ui'; c.fillStyle = '#5a6a7a'; c.fillText(zone.name.length > 20 ? zone.name.slice(0, 19) + '…' : zone.name, -wBox / 2 + 10, -hBox / 2 + 44 - (isNext ? 0 : 6));
      if (isNext) { c.font = '700 11px system-ui'; c.fillStyle = ready ? '#2e9f55' : '#d9534f'; c.fillText(ready ? 'Tap to unlock!' : `Lv ${req.level} · ${req.amulets} amulet${req.amulets === 1 ? '' : 's'} · ${req.coins}c`, -wBox / 2 + 10, hBox / 2 - 10); }
      c.restore();
    }
  }

  /* ---------------------------------------------------------- highlights */
  drawHighlights(c, o) {
    const t = this.t, b = this.ctxG.board;
    if (this.magnetCells) {
      const pulse = this.reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * 6);
      c.save(); c.lineWidth = 4; c.strokeStyle = `rgba(255,120,120,${0.6 + 0.4 * pulse})`; c.fillStyle = `rgba(255,150,150,${0.12 + 0.12 * pulse})`;
      for (const i of this.magnetCells) { if (!b.items[i]) continue; this.rrect(c, b.x(i) * CELL + 4, b.y(i) * CELL + 4, CELL - 8, CELL - 8, 16); c.fill(); c.stroke(); }
      c.restore();
    }
    if (this.hint && (this.now() < this.hint.until)) {
      const pulse = this.reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * 5);
      c.save(); c.lineWidth = 5; c.shadowColor = 'rgba(255,240,120,1)'; c.shadowBlur = 16 * pulse; c.strokeStyle = `rgba(255,244,150,${0.55 + 0.45 * pulse})`;
      for (const i of this.hint.cells) { this.rrect(c, b.x(i) * CELL + 3, b.y(i) * CELL + 3, CELL - 6, CELL - 6, 16); c.stroke(); }
      c.restore();
      if (this.hint.arrowTo != null && this.hint.cells.length) {
        const f = this.hint.cells[0], to = this.hint.arrowTo; const k = (t * 1.2) % 1;
        const fx = (b.x(f) + 0.5) * CELL, fy = (b.y(f) + 0.5) * CELL, tx = (b.x(to) + 0.5) * CELL, ty = (b.y(to) + 0.5) * CELL;
        c.font = `${CELL * 0.55}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👆', fx + (tx - fx) * k, fy + (ty - fy) * k + CELL * 0.2);
      }
    } else if (this.hint) this.hint = null;
  }

  /* ---------------------------------------------------------------- drag */
  drawDrag(c, o) {
    const dr = this.drag, b = this.ctxG.board, z = this.cam.zoom;
    // merge preview / drop target outline
    if (dr.over >= 0) {
      const ok = dr.dropState; // 'merge' | 'clear' | 'struct' | 'swap' | 'bad' | null
      if (dr.preview && dr.preview.cells) {
        c.save(); c.lineWidth = 4; c.strokeStyle = 'rgba(80,230,140,0.95)'; c.shadowColor = 'rgba(80,230,140,0.9)'; c.shadowBlur = 12;
        for (const i of dr.preview.cells) { this.rrect(c, b.x(i) * CELL + 4, b.y(i) * CELL + 4, CELL - 8, CELL - 8, 15); c.stroke(); }
        c.restore();
      } else if (ok === 'struct' || ok === 'clear') {
        const i = dr.over, ob = b.obst[i], st = b.struct[i], X = (ob || st).x * CELL, Y = (ob || st).y * CELL, W = (ob || st).w * CELL, H = (ob || st).h * CELL;
        c.save(); c.lineWidth = 4; c.strokeStyle = 'rgba(80,230,140,0.95)'; c.shadowColor = 'rgba(80,230,140,0.9)'; c.shadowBlur = 12; this.rrect(c, X + 3, Y + 3, W - 6, H - 6, 14); c.stroke(); c.restore();
      } else if (ok === 'bad') {
        const i = dr.over; c.save(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,100,100,0.9)'; this.rrect(c, b.x(i) * CELL + 4, b.y(i) * CELL + 4, CELL - 8, CELL - 8, 15); c.stroke(); c.restore();
      } else {
        const i = dr.over; c.save(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([6, 5]); this.rrect(c, b.x(i) * CELL + 4, b.y(i) * CELL + 4, CELL - 8, CELL - 8, 15); c.stroke(); c.restore();
      }
      if (dr.preview && dr.preview.badge) {
        const X = (b.x(dr.over) + 0.5) * CELL, Y = b.y(dr.over) * CELL - 6;
        c.save(); this.rrect(c, X - 30, Y - 22, 60, 24, 12); c.fillStyle = '#2e9f55'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.font = '800 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(dr.preview.badge, X, Y - 9); c.restore();
      }
    }
    // the carried item, lifted above the finger
    const [wx, wy] = this.screenToWorld(dr.px, dr.py - (dr.off ?? 40));
    const s = CELL * 1.15;
    c.save(); c.globalAlpha = 0.28; c.fillStyle = '#000'; c.beginPath(); c.ellipse(wx + 4, wy + CELL * 0.5 + 6, CELL * 0.34, CELL * 0.12, 0, 0, 7); c.fill(); c.restore();
    drawItem(c, this.data, dr.item, wx - s / 2, wy - s / 2, s, { ...o, pips: true });
  }

  /** Update the drag target and compute feedback state. */
  updateDrag(px, py) {
    const dr = this.drag; if (!dr) return;
    dr.px = px; dr.py = py;
    const [wx, wy] = this.screenToWorld(px, py - (dr.off ?? 40)); const b = this.ctxG.board;
    const cx = Math.floor(wx / CELL), cy = Math.floor(wy / CELL);
    const over = b.inBounds(cx, cy) ? b.idx(cx, cy) : -1;
    dr.preview = null; dr.dropState = null;
    if (over >= 0 && b.isOpen(over)) {
      const g = this.game, d = this.data, it = dr.item, t = b.items[over], ob = b.obst[over], st = b.struct[over];
      if (ob) { const def = d.obstacleById[ob.type]; dr.dropState = def.accepts && d.matches(it.id, def.accepts) ? 'clear' : 'bad'; }
      else if (st) { dr.dropState = this.structAccepts(st, it) ? 'struct' : 'bad'; }
      else if (t && t.id !== it.id) dr.dropState = 'swap';
      else if (t && !it.f) {
        // the dragged item is lifted off the board while previewing, exactly as the real drop does
        const sidx = dr.src.type === 'board' ? dr.src.idx : -1, held = sidx >= 0 ? b.items[sidx] : null;
        if (sidx >= 0) b.items[sidx] = null;
        const pv = sidx === over ? null : previewMerge(b, over, it, d);
        if (sidx >= 0) b.items[sidx] = held;
        if (pv) { dr.preview = pv; dr.dropState = 'merge'; }
      }
    }
    dr.over = over;
    // edge auto-scroll
    const m = 44, sp = 6; let dx = 0, dy = 0;
    const dockTop = this.app.dockTop ? this.app.dockTop() : this.H - 90;
    if (px < m) dx = sp; else if (px > this.W - m) dx = -sp; if (py < m + 60) dy = sp; else if (py > dockTop - 50 && py < dockTop) dy = -sp;
    const el = typeof document !== 'undefined' ? document.elementFromPoint(px, py) : null;
    if (el && el.closest && el.closest('[data-drop],.rail,.topbar,.tracker')) { dx = 0; dy = 0; }
    dr.scroll = [dx, dy];
  }
  structAccepts(st, it) {
    const g = this.game, d = this.data;
    if (st.kind === 'resident') return g.wantsDelivery ? g.wantsDelivery(st.id, it.id) : true;
    if (st.kind === 'site') { const p = g.projectFor(st.id); if (!p) return false; const f = g.projectFill(p.key); return p.items.some(r => r.item === it.id && (f[r.item] || 0) < r.count); }
    if (st.kind === 'building') { const def = d.buildingById[st.id]; if (def.tradeDock) return true; if (def.eats) return it.id.startsWith('meals_'); const p = g.projectFor(st.id); if (!p) return false; const f = g.projectFill(p.key); return p.items.some(r => r.item === it.id && (f[r.item] || 0) < r.count); }
    if (st.kind === 'soil' || st.kind === 'perch') return !!g.livingDefFor?.(it.id);
    if (st.kind === 'pool' || st.kind === 'guide' || st.kind === 'islandgen') return true;
    return false;
  }
  tickDrag() { const dr = this.drag; if (dr && dr.scroll && (dr.scroll[0] || dr.scroll[1])) { this.pan(dr.scroll[0] * 2, dr.scroll[1] * 2); this.updateDrag(dr.px, dr.py); } }
}
