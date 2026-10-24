// Pointer, wheel, pinch and keyboard input for the board canvas.
const DRAG_START = 7;

export class Input {
  constructor(canvas, app) {
    this.cv = canvas; this.app = app; this.pointers = new Map(); this.down = null; this.pinch = null; this.lastTap = { t: 0, x: 0, y: 0 };
    this.holdTimer = null; this.keys = new Set(); this.kbCarry = null;
    const opt = { passive: false };
    canvas.addEventListener('pointerdown', e => this.onDown(e), opt);
    canvas.addEventListener('pointermove', e => this.onMove(e), opt);
    canvas.addEventListener('pointerup', e => this.onUp(e), opt);
    canvas.addEventListener('pointercancel', e => this.onCancel(e), opt);
    canvas.addEventListener('wheel', e => this.onWheel(e), opt);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => this.onKey(e, true));
    window.addEventListener('keyup', e => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
  }
  get r() { return this.app.renderer; }
  get g() { return this.app.game; }
  pos(e) { const rc = this.cv.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; }

  /* ------------------------------------------------------------ pointer */
  onDown(e) {
    if (this.app.modalOpen()) return;
    e.preventDefault(); this.app.audio.ensure(); this.app.touchActivity();
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
    const [x, y] = this.pos(e);
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size === 2) { this.cancelDrag(true); this.beginPinch(); return; }
    if (this.pointers.size > 2) return;
    const r = this.r, idx = r.cellAt(x, y), b = this.g.ctx.board;
    const item = idx >= 0 && b.isOpen(idx) ? b.items[idx] : null;
    this.down = { id: e.pointerId, x, y, sx: x, sy: y, t: performance.now(), idx, item, moved: false, mode: null, mouse: e.pointerType === 'mouse', button: e.button };
    clearTimeout(this.holdTimer);
    if (item) this.holdTimer = setTimeout(() => { if (this.down && !this.down.moved && this.down.idx === idx) { this.down.long = true; this.app.onLongPress(idx); } }, 480);
  }
  onMove(e) {
    const [x, y] = this.pos(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x, y });
    if (this.pinch) { this.updatePinch(); return; }
    const d = this.down;
    if (!d || d.id !== e.pointerId) { if (e.pointerType === 'mouse') this.r.hover = this.r.cellAt(x, y); return; }
    e.preventDefault();
    const dist = Math.hypot(x - d.sx, y - d.sy);
    if (!d.moved && dist > DRAG_START) {
      d.moved = true; clearTimeout(this.holdTimer);
      const canDrag = d.item && !d.item.f && !this.g.s.settings.tapToMove && d.button !== 1 && d.button !== 2 && this.app.canDragItem(d.idx);
      if (canDrag) { d.mode = 'drag'; this.beginDrag({ type: 'board', idx: d.idx }, d.item, x, y, d.mouse ? 0 : 40); }
      else { d.mode = 'pan'; }
    }
    if (d.mode === 'drag') this.r.updateDrag(x, y);
    else if (d.mode === 'pan') { this.r.pan(x - d.x, y - d.y); }
    d.x = x; d.y = y;
  }
  onUp(e) {
    const [x, y] = this.pos(e);
    this.pointers.delete(e.pointerId);
    if (this.pinch) { if (this.pointers.size < 2) this.pinch = null; this.down = null; return; }
    const d = this.down; if (!d || d.id !== e.pointerId) return;
    clearTimeout(this.holdTimer); this.down = null;
    if (d.mode === 'drag') { this.finishDrag(e.clientX, e.clientY); return; }
    if (d.long) return;
    if (!d.moved) this.handleTap(x, y, d);
  }
  onCancel(e) { this.pointers.delete(e.pointerId); clearTimeout(this.holdTimer); if (this.down && this.down.mode === 'drag') this.cancelDrag(true); this.down = null; this.pinch = null; }
  onWheel(e) {
    if (this.app.modalOpen()) return;
    e.preventDefault(); const [x, y] = this.pos(e);
    this.r.zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  }

  /* ---------------------------------------------------------------- tap */
  handleTap(x, y, d) {
    const now = performance.now(), r = this.r;
    const dbl = now - this.lastTap.t < 320 && Math.hypot(x - this.lastTap.x, y - this.lastTap.y) < 30;
    this.lastTap = { t: now, x, y };
    const idx = d.idx;
    // a quick double tap on bare ground or sea recentres the view; on anything you can use (a building, a generator, an obstacle,
    // a gift) it is just two taps, so tapping a generator building twice in a row keeps producing
    const b = this.g.ctx.board, bare = idx < 0 || (!b.items[idx] && !b.struct[idx] && !b.obst[idx]);
    if (dbl && bare) { this.app.resetView(); return; }
    if (idx < 0) { this.app.clearSel(); return; }
    this.app.onTapCell(idx);
  }

  /* ---------------------------------------------------------------- drag */
  beginDrag(src, item, x, y, off = 40) {
    const r = this.r; r.drag = { src, item, px: x, py: y, off, over: -1, preview: null, dropState: null, scroll: [0, 0] };
    r.hint = null; r.selected = -1; r.updateDrag(x, y);
    this.app.audio.sfx('pickup'); this.app.haptic(8); this.app.onDragStart?.(src, item);
  }
  finishDrag(cx, cy) {
    const r = this.r, dr = r.drag; if (!dr) return;
    const target = this.app.uiDropTarget(cx, cy);
    const over = dr.over, src = dr.src;
    r.drag = null;
    if (target) this.app.onDropUI(src, target);
    else if (over >= 0) this.app.onDropBoard(src, over);
    else this.app.onDropNowhere(src);
  }
  cancelDrag(silent) { if (this.r.drag) { this.r.drag = null; } }

  /* --------------------------------------------------------------- pinch */
  beginPinch() {
    const pts = [...this.pointers.values()]; const [a, b] = pts;
    this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: this.r.cam.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    this.down = null; clearTimeout(this.holdTimer);
  }
  updatePinch() {
    const pts = [...this.pointers.values()]; if (pts.length < 2) return; const [a, b] = pts;
    const dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const target = this.pinch.z0 * dd / this.pinch.d0, cur = this.r.cam.zoom;
    this.r.zoomAt(cx, cy, target / cur); this.r.pan(cx - this.pinch.cx, cy - this.pinch.cy); this.pinch.cx = cx; this.pinch.cy = cy;
  }

  /* ------------------------------------------------------------ keyboard */
  onKey(e, down) {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const k = e.key.toLowerCase();
    if (!down) { this.keys.delete(k); return; }
    if (this.app.modalOpen()) { if (k === 'escape') this.app.closeTopModal(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const r = this.r, b = this.g.ctx.board;
    this.app.touchActivity();
    const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (arrows[k]) {
      e.preventDefault();
      if (r.cursor < 0) r.cursor = this.app.defaultCursor();
      const [dx, dy] = arrows[k]; const x = Math.max(0, Math.min(b.w - 1, b.x(r.cursor) + dx)), y = Math.max(0, Math.min(b.h - 1, b.y(r.cursor) + dy));
      r.cursor = b.idx(x, y); this.ensureVisible(r.cursor); this.updateKbDrag(); return;
    }
    if (k === ' ' || k === 'spacebar') {
      e.preventDefault(); this.app.audio.ensure();
      if (r.cursor < 0) r.cursor = this.app.defaultCursor();
      if (!this.kbCarry) {
        const it = b.items[r.cursor];
        if (it && !it.f && b.isOpen(r.cursor) && this.app.canDragItem(r.cursor)) { this.kbCarry = { type: 'board', idx: r.cursor }; const [sx, sy] = r.cellCenterScreen(r.cursor); r.drag = { src: this.kbCarry, item: it, px: sx, py: sy + 40, over: r.cursor, preview: null, dropState: null, scroll: [0, 0] }; r.updateDrag(sx, sy + 40); this.app.audio.sfx('pickup'); }
        else this.app.onTapCell(r.cursor);
      } else { const src = this.kbCarry; this.kbCarry = null; r.drag = null; this.app.onDropBoard(src, r.cursor); }
      return;
    }
    if (k === 'enter') { e.preventDefault(); this.app.audio.ensure(); if (r.cursor < 0) r.cursor = this.app.defaultCursor(); this.app.onTapCell(r.cursor); return; }
    if (k === 'm') { this.app.toggleMagnet(); return; }
    if (k === 'escape' && this.app.magnetMode) { this.app.endMagnet(); return; }
    if (k === 'escape') { if (this.kbCarry) { this.kbCarry = null; r.drag = null; } else if (this.app.sel) this.app.clearSel(); else { r.cursor = -1; } return; }
    if (k === 'h') { this.app.showHintNow(); return; }
    if (k === '+' || k === '=') r.zoomAt(r.W / 2, r.H / 2, 1.15);
    else if (k === '-' || k === '_') r.zoomAt(r.W / 2, r.H / 2, 1 / 1.15);
    else if (k === '0') this.app.resetView();
    else if (k === 'i' && r.cursor >= 0) this.app.onLongPress(r.cursor);
    else this.keys.add(k);
  }
  updateKbDrag() { const r = this.r; if (this.kbCarry && r.drag) { const [sx, sy] = r.cellCenterScreen(r.cursor); r.updateDrag(sx, sy + 40); } }
  ensureVisible(idx) {
    const r = this.r, [sx, sy] = r.cellCenterScreen(idx), m = 90; let dx = 0, dy = 0;
    if (sx < m) dx = m - sx; else if (sx > r.W - m) dx = r.W - m - sx; if (sy < m + 60) dy = m + 60 - sy; else if (sy > r.H - m - 120) dy = r.H - m - 120 - sy;
    if (dx || dy) { r.cam.tx = r.cam.x - dx / r.cam.zoom; r.cam.ty = r.cam.y - dy / r.cam.zoom; r.cam.tz = r.cam.zoom; }
  }
  /** Continuous WASD panning, called each frame. */
  tick(dt) {
    if (!this.keys.size || this.app.modalOpen()) return; let dx = 0, dy = 0; const sp = 520 * dt;
    if (this.keys.has('a')) dx += sp; if (this.keys.has('d')) dx -= sp; if (this.keys.has('w')) dy += sp; if (this.keys.has('s')) dy -= sp;
    if (dx || dy) this.r.pan(dx, dy);
  }
}
