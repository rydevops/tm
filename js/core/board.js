// Grid board: land mask, fog, items, obstacles and structures. Pure data + helpers, no rules.

export class Board {
  constructor(w, h) {
    this.w = w; this.h = h; this.n = w * h;
    this.land = new Uint8Array(this.n);   // 1 = playable ground
    this.fog = new Uint8Array(this.n);    // 0 open, 1 locked zone, 2 pocket
    this.items = new Array(this.n).fill(null);
    this.obst = new Array(this.n).fill(null);
    this.struct = new Array(this.n).fill(null);
    this.lit = null;                      // island darkness rule (Uint8Array) when used
  }
  idx(x, y) { return y * this.w + x; }
  x(i) { return i % this.w; }
  y(i) { return (i / this.w) | 0; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  /** The 8 neighbours of a cell (orthogonal + diagonal). */
  neighbors8(i) {
    const x = this.x(i), y = this.y(i), out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (this.inBounds(nx, ny)) out.push(this.idx(nx, ny));
    }
    return out;
  }
  dist(a, b) { return Math.max(Math.abs(this.x(a) - this.x(b)), Math.abs(this.y(a) - this.y(b))); }
  isOpen(i) { return this.land[i] === 1 && this.fog[i] === 0; }
  /** A cell that can accept a placed item right now. */
  isEmpty(i) { return this.land[i] === 1 && this.fog[i] === 0 && !this.items[i] && !this.obst[i] && !this.struct[i]; }
  emptyCount() { let c = 0; for (let i = 0; i < this.n; i++) if (this.isEmpty(i)) c++; return c; }
  /** Breadth-first search outward from `from` for the nearest empty cell(s). Ties: lowest row, then lowest column. */
  nearestEmpty(from, count = 1, exclude = null) {
    const found = [];
    if (this.isEmpty(from) && !(exclude && exclude.has(from))) { found.push(from); if (found.length >= count) return found; }
    const seen = new Uint8Array(this.n); seen[from] = 1;
    let frontier = [from];
    // The search crosses any cell, so it can reach land beyond obstacles: use ring expansion by Chebyshev distance.
    const maxR = Math.max(this.w, this.h);
    for (let r = 1; r <= maxR && found.length < count; r++) {
      const ring = [];
      const fx = this.x(from), fy = this.y(from);
      for (let y = fy - r; y <= fy + r; y++) for (let x = fx - r; x <= fx + r; x++) {
        if (Math.max(Math.abs(x - fx), Math.abs(y - fy)) !== r) continue;
        if (!this.inBounds(x, y)) continue;
        const i = this.idx(x, y);
        if (this.isEmpty(i) && !(exclude && exclude.has(i))) ring.push(i);
      }
      ring.sort((a, b) => this.y(a) - this.y(b) || this.x(a) - this.x(b));
      for (const i of ring) { found.push(i); if (found.length >= count) break; }
    }
    return found;
  }
  /** Cells that hold identical item identity connected through 8-neighbour adjacency. Starts at `start` (must hold an item). */
  floodFill8(start, id, skip = null) {
    const group = [], seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const c = stack.pop();
      group.push(c);
      for (const nb of this.neighbors8(c)) {
        if (seen.has(nb)) continue;
        const it = this.items[nb];
        if (!it || it.id !== id || it.f) continue;
        if (skip && skip.has(nb)) continue;
        seen.add(nb); stack.push(nb);
      }
    }
    return group;
  }
  freeCellsInOrder() { const out = []; for (let i = 0; i < this.n; i++) if (this.isEmpty(i)) out.push(i); return out; }
}
