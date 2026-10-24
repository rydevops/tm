// Item sprite factory: procedural vector painters -> cached canvases, plus pip strips, glow tiers and overlays.
import { Painter, OUT } from './artkit.js';
import { CROPS, TOOLS, MATERIALS } from './art-items-a.js';
import { ANIMALS, FOODS, TREASURE, SEA, MAGIC, CREATURES, SPECIAL, GENS } from './art-items-b.js';
import { itemArt, drawFit } from './new-art.js';

const PAINTERS = Object.assign({}, CROPS, TOOLS, MATERIALS, ANIMALS, FOODS, TREASURE, SEA, MAGIC, CREATURES, SPECIAL, GENS);

export const SPRITE_PX = 192; // internal sprite resolution (design space is vector, so this is only the raster cache size)
const cache = new Map();
let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export function setCanvasFactory(fn) { makeCanvas = fn; }

export function paintItemSprite(ctx, size, chain, level, levels, info = {}) {
  const P = new Painter(ctx, size);
  const fn = PAINTERS[chain];
  try {
    if (fn) fn(P, level, levels, info);
    else { P.circ(50, 54, 28, '#ffd23f'); P.text(String(level), 50, 54, 26, '#fff'); }
  } catch (e) {
    P.circ(50, 54, 28, '#ff6b6b'); P.text('?', 50, 54, 28, '#fff');
    if (typeof console !== 'undefined') console.warn('sprite error', chain, level, e);
  }
  P.end();
}

/** An item from the painted sheet: a soft ground shadow, then the art as large as the cell allows, above the level pips. */
function paintNewItem(ctx, px, img) {
  ctx.save(); ctx.fillStyle = 'rgba(40,25,10,0.22)'; ctx.beginPath(); ctx.ellipse(px * 0.5, px * 0.865, px * 0.28, px * 0.045, 0, 0, 7); ctx.fill(); ctx.restore();
  drawFit(ctx, img, px * 0.07, px * 0.04, px * 0.86, px * 0.82);
}

/** Cached sprite canvas for an item id like banana_04 (pets get a species-tinted variant). */
export function getSprite(data, id, sp = null, px = SPRITE_PX) {
  const key = `${id}|${sp || ''}|${px}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const info = data.item(id);
  const ch = data.chain(info.chain);
  cv = makeCanvas(px, px);
  const art = itemArt(id);
  if (art) { paintNewItem(cv.getContext('2d'), px, art); cache.set(key, cv); return cv; }
  paintItemSprite(cv.getContext('2d'), px, info.chain, info.level, ch.levels, { sp, id });
  cache.set(key, cv);
  return cv;
}
export function clearSpriteCache() { cache.clear(); }

const GLOW = { white: ['255,255,255', 0.0], blue: ['110,190,255', 0.0], gold: ['255,214,90', 0.0] };

/** Level pip strip (1-10 dots, every fifth gold) drawn at the bottom of a cell. */
export function drawPips(ctx, level, x, y, w, size) {
  const n = Math.min(10, level);
  const r = Math.max(1.6, size * 0.028), step = Math.min(r * 2.9, (w * 0.9) / 10);
  const total = (n - 1) * step; let cx = x + w / 2 - total / 2;
  for (let i = 1; i <= n; i++, cx += step) {
    const gold = i % 5 === 0;
    ctx.beginPath();
    if (gold) { const rr = r * 1.35; ctx.moveTo(cx, y - rr); ctx.lineTo(cx + rr, y); ctx.lineTo(cx, y + rr); ctx.lineTo(cx - rr, y); ctx.closePath(); }
    else ctx.arc(cx, y, r, 0, 7);
    ctx.fillStyle = gold ? '#ffd23f' : '#ffffff'; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.5); ctx.strokeStyle = OUT; ctx.stroke();
  }
}

/**
 * Draw a board item into cell rect (x,y,s). opts: {t, scale, alpha, pips, numbers, patterns, reduce, hint, lifted}
 */
export function drawItem(ctx, data, item, x, y, s, o = {}) {
  const info = data.item(item.id); if (!info) return;
  const t = o.t || 0, sc = o.scale || 1;
  const cx = x + s / 2, cy = y + s / 2;
  const glow = info.art?.glow || 'none';
  if (glow !== 'none' && !o.bare) {
    const [rgb] = GLOW[glow];
    const pulse = o.reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2 + (cx + cy) * 0.01);
    const a = (glow === 'white' ? 0.28 : glow === 'blue' ? 0.36 : 0.46) * (0.7 + 0.3 * pulse);
    const g = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 0.56 * sc);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * 0.56 * sc, 0, 7); ctx.fill();
  }
  const spr = getSprite(data, item.id, item.sp);
  const ds = s * 0.9 * sc;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const isMax = info.isMax && info.family !== 'generator' && !o.reduce;
  const bob = isMax ? Math.sin(t * 2 + cx * 0.02) * s * 0.02 : 0;
  ctx.drawImage(spr, cx - ds / 2, cy - ds / 2 - s * 0.03 + bob, ds, ds);
  ctx.restore();
  if (item.s) drawShimmer(ctx, cx, cy, s, t, o.reduce);
  if (item.f) drawFrozen(ctx, x, y, s);
  if (o.pips !== false && info.family !== 'generator' && !info.chain.startsWith('coins') && o.pips !== 'none') drawPips(ctx, info.level, x, y + s * 0.9, s, s);
  if (o.numbers && info.family !== 'generator') {
    ctx.font = `800 ${Math.round(s * 0.2)}px system-ui,sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.lineWidth = s * 0.05; ctx.strokeStyle = OUT; ctx.strokeText(String(info.level), x + s - s * 0.06, y + s * 0.04); ctx.fillStyle = '#fff'; ctx.fillText(String(info.level), x + s - s * 0.06, y + s * 0.04);
  }
  if (o.patterns) drawPattern(ctx, info, x, y, s);
}

function drawShimmer(ctx, cx, cy, s, t, reduce) {
  ctx.save();
  const n = 3;
  for (let i = 0; i < n; i++) {
    const ph = reduce ? i * 2 : t * 1.6 + i * 2.1;
    const a = 0.5 + 0.5 * Math.sin(ph);
    const ang = i * 2.1 + 0.6, rr = s * (0.26 + 0.05 * i);
    const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr * 0.9, r = s * 0.075 * (0.5 + a);
    ctx.fillStyle = `rgba(255,248,190,${0.5 + 0.5 * a})`; ctx.strokeStyle = 'rgba(255,170,40,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.25, py - r * 0.25); ctx.lineTo(px + r, py); ctx.lineTo(px + r * 0.25, py + r * 0.25); ctx.lineTo(px, py + r); ctx.lineTo(px - r * 0.25, py + r * 0.25); ctx.lineTo(px - r, py); ctx.lineTo(px - r * 0.25, py - r * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.lineWidth = Math.max(2, s * 0.03); ctx.strokeStyle = 'rgba(255,225,110,0.75)';
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.43, 0, 7); ctx.stroke();
  ctx.restore();
}
function drawFrozen(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(170,225,255,0.5)'; ctx.fillRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.025);
  ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.2); ctx.lineTo(x + s * 0.45, y + s * 0.4); ctx.lineTo(x + s * 0.35, y + s * 0.6); ctx.moveTo(x + s * 0.8, y + s * 0.3); ctx.lineTo(x + s * 0.6, y + s * 0.5); ctx.lineTo(x + s * 0.75, y + s * 0.8); ctx.stroke();
  ctx.restore();
}
/** Optional colour-blind pattern: a small corner shape keyed to the family, never colour alone. */
function drawPattern(ctx, info, x, y, s) {
  const fam = ['crop', 'material', 'animal', 'food', 'treasure', 'sea', 'tool', 'magic', 'dragon', 'energy', 'special', 'pet'];
  const k = Math.max(0, fam.indexOf(info.family)); const r = s * 0.07, px = x + s * 0.12, py = y + s * 0.12;
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
  ctx.beginPath();
  const sides = 3 + (k % 5);
  for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / sides; const X = px + Math.cos(a) * r, Y = py + Math.sin(a) * r; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

/** Render any item to a standalone canvas with pips (for panels / info cards / DOM). */
export function itemIcon(data, id, size = 96, sp = null) {
  const cv = makeCanvas(size, size); const c = cv.getContext('2d');
  const spr = getSprite(data, id, sp); c.drawImage(spr, 0, 0, size, size);
  const info = data.item(id);
  if (info && info.family !== 'generator') drawPips(c, info.level, 0, size * 0.93, size, size * 0.8);
  return cv;
}
