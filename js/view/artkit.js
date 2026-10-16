// Tiny vector toolkit for the procedural storybook art. Everything is drawn in a 100x100 design space.
export const OUT = '#3a2a1e';

export function hexToRgb(h) {
  if (h.startsWith('rgb')) return h.match(/[\d.]+/g).slice(0, 3).map(Number);
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  const m = v => Math.round(v + (t - v) * p);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export class Painter {
  constructor(ctx, size) {
    this.c = ctx; this.size = size;
    ctx.save(); ctx.scale(size / 100, size / 100);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  }
  end() { this.c.restore(); }
  _paint(col, box, o) {
    const c = this.c;
    if (col) {
      if (o.flat || !box) c.fillStyle = col;
      else {
        const [x0, y0, x1, y1] = box;
        const g = c.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.22));
        c.fillStyle = g;
      }
      c.fill();
    }
    if (o.line !== false) { c.lineWidth = o.lw || 2.2; c.strokeStyle = o.stroke || OUT; c.stroke(); }
  }
  shadow(cx = 50, cy = 90, rx = 30, ry = 6, a = 0.22) {
    const c = this.c; c.save(); c.fillStyle = `rgba(40,25,10,${a})`;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); c.restore();
  }
  ell(cx, cy, rx, ry, col, o = {}) {
    const c = this.c; c.beginPath(); c.ellipse(cx, cy, rx, ry, o.rot || 0, 0, 7);
    this._paint(col, [cx - rx, cy - ry, cx + rx, cy + ry], o);
  }
  circ(cx, cy, r, col, o = {}) { this.ell(cx, cy, r, r, col, o); }
  rect(x, y, w, h, col, o = {}) { this.rr(x, y, w, h, o.r ?? 1.5, col, o); }
  rr(x, y, w, h, r, col, o = {}) {
    const c = this.c; c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
    this._paint(col, [x, y, x + w, y + h], o);
  }
  poly(pts, col, o = {}) {
    const c = this.c; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (!o.open) c.closePath();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    this._paint(col, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], o);
  }
  /** smooth closed blob through points (quadratic midpoints) */
  blob(pts, col, o = {}) {
    const c = this.c, n = pts.length; c.beginPath();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]); c.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    c.closePath();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    this._paint(col, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], o);
  }
  /** pointed leaf from (x,y) pointing at angle a (radians) */
  leaf(x, y, len, w, a, col, o = {}) {
    const c = this.c; c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.45, -w, len, 0); c.quadraticCurveTo(len * 0.45, w, 0, 0);
    this._paint(col, [0, -w, len, w], o);
    if (o.vein !== false) { c.beginPath(); c.moveTo(len * 0.1, 0); c.lineTo(len * 0.85, 0); c.lineWidth = 0.9; c.strokeStyle = shade(col, -0.35); c.stroke(); }
    c.restore();
  }
  star(cx, cy, r, n, col, o = {}) {
    const pts = []; const ri = o.inner ?? r * 0.45;
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? ri : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    this.poly(pts, col, o);
  }
  line(x1, y1, x2, y2, col, w = 2, o = {}) {
    const c = this.c; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    if (o.outline) { c.lineWidth = w + 2.4; c.strokeStyle = OUT; c.stroke(); }
    c.lineWidth = w; c.strokeStyle = col; c.stroke();
  }
  curve(x1, y1, cx, cy, x2, y2, col, w = 2, o = {}) {
    const c = this.c; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2);
    if (o.outline) { c.lineWidth = w + 2.4; c.strokeStyle = OUT; c.stroke(); }
    c.lineWidth = w; c.strokeStyle = col; c.stroke();
  }
  shine(cx, cy, rx, ry, a = 0.55) {
    const c = this.c; c.save(); c.fillStyle = `rgba(255,255,255,${a})`;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, -0.6, 0, 7); c.fill(); c.restore();
  }
  sparkle(cx, cy, r, col = '#fff7c2') {
    this.poly([[cx, cy - r], [cx + r * 0.22, cy - r * 0.22], [cx + r, cy], [cx + r * 0.22, cy + r * 0.22], [cx, cy + r], [cx - r * 0.22, cy + r * 0.22], [cx - r, cy], [cx - r * 0.22, cy - r * 0.22]], col, { lw: 1.2 });
  }
  text(s, x, y, size, col = '#fff', o = {}) {
    const c = this.c; c.font = `800 ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.outline !== false) { c.lineWidth = size * 0.22; c.strokeStyle = OUT; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  with(fn, tx = 0, ty = 0, rot = 0, sc = 1) {
    const c = this.c; c.save(); c.translate(tx, ty); c.rotate(rot); c.scale(sc, sc); fn(this); c.restore();
  }
}

/** deterministic tiny PRNG for art variation */
export function artRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}
export function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
