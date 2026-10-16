// App: glues the simulation (Game) to the renderer, input, audio, HUD and panels.
import { DEFAULT_SETTINGS, planMerge } from '../core/index.js';
import { Renderer, CELL } from './renderer.js';
import { Input } from './input.js';
import { AudioEngine, musicIndexForZone, musicIndexForIsland } from './audio.js';
import { UI, h, icon, itemCanvas, fmt, fmtTime } from './ui.js';
import { Panels } from './panels.js';
import { Tutorial } from './tutorial.js';

const GLOW = lvl => (lvl >= 9 ? '#ffd54a' : lvl >= 7 ? '#7fd0ff' : lvl >= 5 ? '#ffffff' : '#fff6a8');
const OB_SOUND = { tall_grass: 'rustle', thorn_bush: 'rustle', dense_brush: 'rustle', vine_tangle: 'rustle', small_stump: 'chop', big_stump: 'chop', driftwood: 'chop', fallen_tree: 'chop', locked_crate: 'chop', boulder: 'boulder', rubble_pile: 'boulder', mud_pit: 'boulder' };

export class App {
  constructor(data, store) {
    this.data = data; this.store = store; this.game = null;
    this.canvas = document.getElementById('board');
    this.audio = new AudioEngine();
    this.ui = new UI(this);
    this.renderer = new Renderer(this.canvas, this);
    this.input = new Input(this.canvas, this);
    this.panels = new Panels(this);
    this.tutorial = new Tutorial(this);
    this.queue = []; this.dirty = false; this.lastActivity = performance.now(); this.hintShownAt = 0;
    this.sel = null; this.lastFrame = 0; this.lastHud = 0; this.cascTimer = null; this.audioUnlocked = false; this.musicIdx = -1;
    this.lastDiscover = 0; this.lastOverflowToast = 0; this.saveFailed = false; this.running = false;
    window.addEventListener('resize', () => { if (this.game) { this.renderer.resize(); this.renderer.clampCamera(); } });
    window.addEventListener('orientationchange', () => setTimeout(() => this.game && this.renderer.resize(), 200));
    const unlock = () => { if (!this.audioUnlocked) { this.audioUnlocked = true; this.audio.ensure(); this.syncMusic(true); } this.touchActivity(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.game) return;
      if (document.hidden) { this.save(true); this.audio.suspend(); } else { this.audio.resume(); this.game.tick(0); this.ui.refresh(true); }
    });
    window.addEventListener('pagehide', () => this.save(true));
    window.addEventListener('beforeunload', () => this.save(true));
  }

  /* ------------------------------------------------------------- lifecycle */
  attach(game, { fresh = false } = {}) {
    this.game = game; this.unsub?.(); this.unsub = game.on(ev => this.onEvent(ev));
    this.renderer.resize(); this.renderer.setContext(true);
    this.ui.build(); this.applySettings();
    if (!this.running) { this.running = true; requestAnimationFrame(t => this.loop(t)); this.second = setInterval(() => this.everySecond(), 1000); this.saver = setInterval(() => this.save(false), 5000); }
    this.syncMusic(true);
    // first things the player sees
    if (fresh || !game.s.tutorial.done) this.tutorial.begin(); else this.afterBoot();
  }
  afterBoot() {
    const g = this.game, off = g.offline;
    if (off && off.seconds > 180) this.enqueue(() => this.panels.welcomeBack(off));
    if (g.loginAvailable() && g.s.tutorial.done) this.enqueue(() => this.panels.login());
  }
  modalOpen() { return this.ui.stack.length > 0; }
  closeTopModal() { this.ui.closeTop(); }
  onModalChange() { this.ui.hideInfo(); this.pump(); }
  enqueue(fn) { this.queue.push(fn); this.pump(); }
  pump() { if (this.ui.stack.length || !this.queue.length || this.pumping) return; this.pumping = true; setTimeout(() => { this.pumping = false; if (!this.ui.stack.length && this.queue.length) this.queue.shift()(); }, 250); }
  touchActivity() { this.lastActivity = performance.now(); }

  /* ------------------------------------------------------------ main loop */
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    if (document.hidden || !this.game) return;
    const cap = this.game.s.settings.fpsCap || 60, min = 1000 / cap;
    if (ts - this.lastFrame < min - 3) return;
    const dt = Math.min(0.1, (ts - this.lastFrame) / 1000 || 0.016); this.lastFrame = ts;
    this.input.tick(dt);
    this.renderer.tickDrag();
    this.renderer.frame(ts);
    this.dragFeedback();
    if (ts - this.lastHud > 250 || this.hudDirty) { this.lastHud = ts; this.hudDirty = false; this.ui.refresh(); }
    this.tutorial.frame();
  }
  /** Highlights the tray slot or sell button under a dragged item. */
  dragFeedback() {
    const dr = this.renderer.drag; const els = this.hovered || [];
    for (const e of els) e.classList.remove('over'); this.hovered = [];
    if (!dr) return;
    const el = document.elementFromPoint(dr.px, dr.py); const t = el && el.closest && el.closest('[data-drop]');
    if (t) { t.classList.add('over'); this.hovered.push(t); }
  }
  everySecond() {
    const g = this.game; if (!g) return;
    g.viewAnchor = g.ctx.kind === 'home' ? this.defaultCursorNearView(0.4) : null; // gift balloons land near what the player is looking at
    g.tick(1000);
    this.ui.tickTimers();
    this.tutorial.update();
    this.checkHints();
    this.hudDirty = true;
    if (g.cascades.length) this.scheduleCascade();
  }

  /* ----------------------------------------------------------------- save */
  save(sync = false) {
    const g = this.game; if (!g || (!this.dirty && !sync)) return;
    g.s.flags.cam = { x: Math.round(this.renderer.cam.x), y: Math.round(this.renderer.cam.y), zoom: +this.renderer.cam.zoom.toFixed(2) };
    this.dirty = false;
    const doc = g.serialize();
    if (sync) this.store.quickSave(doc);
    else this.store.save(doc).then(ok => { if (!ok && !this.saveFailed) { this.saveFailed = true; this.ui.toast('Could not save. Is browser storage blocked? Use Settings → Export save.', 'bad', 6000); } });
  }
  async newGame() {
    await this.store.clear();
    location.reload();
  }

  /* ------------------------------------------------------------- settings */
  applySettings() {
    const s = this.game.s.settings;
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (s[k] === undefined) s[k] = DEFAULT_SETTINGS[k];
    document.documentElement.style.setProperty('--ts', String(s.textScale / 100));
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    this.audio.setVolumes({ master: 1, music: s.music, sfx: s.sfx });
    this.audio.setMute({ music: !s.musicOn, sfx: !s.sfxOn });
    this.renderer.resize();
    this.renderer.clampCamera();
  }
  haptic(ms) { if (this.game?.s.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
  syncMusic(force = false) {
    if (!this.audioUnlocked || !this.game) return;
    const g = this.game, ctx = g.ctx;
    const idx = ctx.kind === 'island' ? musicIndexForIsland(ctx.islandId) : musicIndexForZone(Math.max(...g.s.zones.unlocked));
    this.audio.night = ctx.rule === 'darkness';
    if (force || idx !== this.musicIdx) { this.musicIdx = idx; this.audio.setMusic(idx); }
  }

  /* ------------------------------------------------------------ commands */
  toast(text, kind = '') { this.ui.toast(text, kind); }
  afterCommand() {
    this.dirty = true; this.hudDirty = true; this.touchActivity();
    this.ui.refresh(true);
    if (this.game.cascades.length) this.scheduleCascade();
    this.tutorial.update();
  }
  scheduleCascade() {
    if (this.cascTimer) return;
    this.cascTimer = setTimeout(() => {
      this.cascTimer = null; const g = this.game;
      if (g.cascades.length) { g.stepCascade(); this.dirty = true; this.hudDirty = true; }
      if (g.cascades.length) this.scheduleCascade();
    }, 250);
  }
  dockTop() { const d = this.ui.el?.dock; return d ? d.getBoundingClientRect().top : this.renderer.H - 90; }
  resetView() { const r = this.renderer; if (this.game.ctx.kind === 'island') r.fitBoard(); else r.focusCell(this.game.defaultAnchor(), 0.85); r.clampCamera(); }
  defaultCursor() { const g = this.game; return g.ctx.kind === 'island' ? g.ctx.anchor : g.defaultAnchor(); }
  canDragItem(idx) { const it = this.game.ctx.board.items[idx]; return !!it && !it.f; }
  onDragStart() { this.ui.hideInfo(); this.sel = null; this.renderer.selected = -1; this.ui.refreshTray(true); }

  tappable(it) {
    const d = this.data, info = d.item(it.id), ch = d.chain(info.chain);
    return info.family === 'generator' || !!ch.chest || !!ch.currency || ch.amuletLevel === info.level || ch.ticketLevel === info.level || (info.chain === 'pet' && info.level === 6);
  }
  onTapCell(idx) {
    const g = this.game, b = g.ctx.board, r = this.renderer, s = g.s.settings;
    this.ui.hideInfo();
    if (!b.isOpen(idx)) return this.tapLocked(idx);
    // tap-to-move: a selected item goes to the tapped cell
    if (s.tapToMove && this.sel) {
      const src = this.sel; this.clearSel();
      if (src.type === 'board' && src.idx === idx) return;
      return this.doDrop(src, idx);
    }
    const it = b.items[idx];
    if (s.tapToMove && it && !it.f && !this.tappable(it)) { this.sel = { type: 'board', idx }; r.selected = idx; this.audio.sfx('pickup'); return; }
    if (it && it.f) { this.toast('Frozen! Thaw it with a Sorbet or better.'); this.audio.sfx('invalid'); return; }
    const res = g.tap(idx);
    this.handleTap(res, idx);
    this.afterCommand();
  }
  clearSel() { this.sel = null; this.renderer.selected = -1; }
  tapLocked(idx) {
    const g = this.game, d = this.data;
    if (g.ctx.kind !== 'home') return;
    const b = g.ctx.board;
    if (b.fog[idx] === 2) { this.toast('A hidden pocket. It opens when you level up!'); return; }
    const z = d.cellZone[idx];
    if (z && z === g.nextZone()) this.panels.zone(z);
    else if (z) this.toast('Unlock the earlier zones first.');
  }
  handleTap(res, idx) {
    const g = this.game, r = this.renderer, a = this.audio;
    if (!res) return;
    if (!res.ok) {
      switch (res.reason) {
        case 'noEnergy': a.sfx('invalid'); this.panels.refill(); break;
        case 'noSpace': a.sfx('invalid'); this.toast(this.data.t('ui.noSpace'), 'bad'); r.setAnim(idx, 'shake', 0.3); r.screenShake(2); break;
        case 'noCharges': a.sfx('invalid'); this.toast(res.seconds ? `Recharging… next charge in ${fmtTime(res.seconds)}` : 'No charges left', 'bad'); break;
        default: a.sfx('invalid'); if (res.hint) this.toast(res.hint);
      }
      return;
    }
    switch (res.action) {
      case 'info': this.showItemInfo(idx); a.sfx('tap'); break;
      case 'obstacle': this.audio.sfx('tap'); r.setAnim('ob' + res.obstacle.id, 'shake', 0.35); this.toast(res.hint || 'Needs something else'); break;
      case 'livingWait': this.toast(`Not ready yet: ${fmtTime(res.seconds)}`); break;
      case 'wait': this.toast(`Come back in ${fmtTime(res.seconds)} for your daily coins.`); break;
      case 'amulet': a.sfx('level'); r.burst(idx, '#ffd54a', 24, 1.3); r.ring(idx); break;
      default: break;
    }
  }
  showItemInfo(idx) {
    const g = this.game, d = this.data, it = g.ctx.board.items[idx]; if (!it) return;
    const info = d.item(it.id), ch = d.chain(info.chain), next = d.nextId(it.id);
    const [sx, sy] = this.renderer.cellCenterScreen(idx);
    const src = { type: 'board', idx };
    const sell = ch.sellable && info.sellValue ? h('button', { class: 'btn small alt', onclick: () => { this.ui.hideInfo(); this.doSell(src); } }, 'Sell ', icon('coin', 'inl'), info.sellValue) : null;
    const store = h('button', { class: 'btn small ghost', onclick: () => { this.ui.hideInfo(); this.doStore(src); } }, 'Store');
    const body = h('div', null,
      h('div', { class: 'row' }, itemCanvas(d, it.id, 48, it.sp), h('div', null, h('h4', null, d.name(it.id)), h('div', { class: 'sub' }, `Level ${info.level} of ${ch.levels}${it.s ? ' · Shimmer ✨' : ''}`))),
      h('p', { class: 'sub' }, d.desc(it.id) || ''),
      h('p', { class: 'sub' }, next ? `Merges into: ${d.name(next)}` : d.t('ui.maxLevel', 'Max level')),
      h('div', { class: 'row' }, sell, store));
    this.ui.showInfo(body, sx, sy);
  }
  onLongPress(idx) {
    const g = this.game, b = g.ctx.board;
    if (b.items[idx]) { this.showItemInfo(idx); this.haptic(10); return; }
    if (b.obst[idx]) { const ob = b.obst[idx], def = this.data.obstacleById[ob.type]; this.toast(`${def.name}: ${g.toolHint(def)} · ${ob.hits} hit${ob.hits === 1 ? '' : 's'} left`); }
  }

  doDrop(src, to, confirmed = false) {
    const g = this.game, r = this.renderer, a = this.audio;
    const item = g.peek(src);
    const res = g.drop(src, to, { confirmed });
    if (!res.ok) {
      if (res.reason === 'confirm') {
        if (res.confirm === 'merge') this.ui.confirm({ title: 'Merge?', text: `Merge ${res.size} items?`, yes: 'Merge', no: 'Cancel', onYes: () => this.doDrop(src, to, true) });
        else this.ui.confirm({ title: 'Use this tool?', text: res.hint || 'This tool is stronger than needed. Use it anyway?', yes: 'Use it', no: 'Keep it', onYes: () => this.doDrop(src, to, true) });
        return res;
      }
      a.sfx('invalid');
      if (res.reason === 'locked') this.toast('That area is still locked.');
      else if (res.reason === 'maxLevel') this.toast(this.data.t('ui.maxLevel', 'Max level'));
      else if (res.reason === 'noGroup') { /* silent bounce */ }
      else if (res.hint) this.toast(res.hint);
      else if (res.reason === 'needTool') this.toast(this.data.t('ui.needTool'));
      if (src.type === 'board') r.setAnim(src.idx, 'bounce', 0.3);
      if (res.bounce && to >= 0) r.setAnim(to, 'bounce', 0.3);
      this.afterCommand();
      return res;
    }
    if (res.placed) { a.sfx('drop'); r.setAnim(to, 'bounce', 0.18); }
    else if (res.swapped) { a.sfx('swap'); r.setAnim(to, 'bounce', 0.2); if (src.type === 'board') r.setAnim(src.idx, 'bounce', 0.2); }
    this.afterCommand();
    return res;
  }
  onDropBoard(src, idx) { this.doDrop(src, idx); }
  onDropNowhere() { this.afterCommand(); }
  uiDropTarget(cx, cy) {
    const el = document.elementFromPoint(cx, cy), t = el && el.closest && el.closest('[data-drop]');
    if (!t) return null;
    const kind = t.dataset.drop;
    return kind === 'tray' ? { kind, slot: +t.dataset.slot } : { kind };
  }
  onDropUI(src, target) {
    if (target.kind === 'sell') this.doSell(src);
    else if (target.kind === 'tray') this.dropToTray(src, target.slot);
    else if (target.kind === 'trayany') this.doStore(src);
    else this.afterCommand();
  }
  doSell(src, confirmed = false) {
    const g = this.game, it = g.peek(src); if (!it) return;
    const res = g.sell(src, { confirmed });
    if (!res.ok) {
      this.audio.sfx('invalid');
      if (res.reason === 'confirm') this.ui.confirm({ title: 'Sell item?', text: `Sell ${this.data.name(it.id)} for ${res.value} coins?`, yes: 'Sell', no: 'Keep', onYes: () => this.doSell(src, true) });
      else if (res.reason === 'notSellable') this.toast("This can't be sold.");
    }
    this.afterCommand();
  }
  doStore(src) {
    const res = this.game.store(src);
    if (!res.ok) { this.audio.sfx('invalid'); if (res.reason === 'trayFull') this.toast('Storage is full. Buy a slot or sell something.'); }
    else this.audio.sfx('drop');
    this.afterCommand();
  }
  dropToTray(src, slot) {
    const g = this.game, ctx = g.ctx, tray = ctx.tray, item = g.peek(src);
    if (!item || item.f) { this.afterCommand(); return; }
    if (src.type === 'tray') {
      if (src.slot !== slot) { [tray[src.slot], tray[slot]] = [tray[slot], tray[src.slot]]; this.audio.sfx('swap'); }
    } else if (!tray[slot]) {
      g.lift(src); tray[slot] = item; g.emit('stored', { slot, item, from: src, ctx: ctx.id });
    } else if (src.type === 'board') {
      const other = tray[slot]; g.lift(src); g.restore(src, other); tray[slot] = item; this.audio.sfx('swap');
    } else { this.toast('That slot is taken.'); this.audio.sfx('invalid'); }
    this.afterCommand();
  }
  /** Pointer went down on a tray slot: becomes a drag if the finger moves, a tap otherwise. */
  startExternalDrag(src, item, e) {
    if (this.modalOpen()) return;
    e.preventDefault(); this.audio.ensure(); this.touchActivity();
    const sx = e.clientX, sy = e.clientY; let dragging = false; const id = e.pointerId;
    const move = ev => {
      if (ev.pointerId !== id) return;
      const rc = this.canvas.getBoundingClientRect(), x = ev.clientX - rc.left, y = ev.clientY - rc.top;
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8 && !this.game.s.settings.tapToMove) { dragging = true; this.input.beginDrag(src, item, x, y, ev.pointerType === 'mouse' ? 0 : 40); }
      if (dragging) { this.renderer.updateDrag(x, y); ev.preventDefault(); }
    };
    const up = ev => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (dragging) this.input.finishDrag(ev.clientX, ev.clientY);
      else this.tapTray(src);
    };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  tapTray(src) {
    const it = this.game.peek(src); if (!it) return;
    const g = this.game, r = this.renderer;
    if (g.s.settings.tapToMove) { this.sel = src; this.audio.sfx('pickup'); this.toast('Now tap a spot on the island.'); return; }
    // tap a stored item: put it back on the board near the anchor
    const b = g.ctx.board, cells = b.nearestEmpty(this.defaultCursorNearView(), 1);
    if (!cells.length) { this.toast(this.data.t('ui.noSpace'), 'bad'); this.audio.sfx('invalid'); return; }
    this.doDrop(src, cells[0]);
  }
  defaultCursorNearView(fy = 0.55) {
    const r = this.renderer, g = this.game, b = g.ctx.board;
    const [wx, wy] = r.screenToWorld(r.W / 2, r.H * fy); const cx = Math.max(0, Math.min(b.w - 1, Math.floor(wx / CELL))), cy = Math.max(0, Math.min(b.h - 1, Math.floor(wy / CELL)));
    return b.idx(cx, cy);
  }
  leaveIsland() { const res = this.game.leaveIsland(); if (res.ok) this.afterCommand(); }
  goalText(goal) { return goal.text; }

  /* ---------------------------------------------------------------- hints */
  computeHint() {
    const g = this.game, b = g.ctx.board, d = this.data;
    const needed = g.neededChains(); const byId = new Map();
    for (let i = 0; i < b.n; i++) { const it = b.items[i]; if (it && !it.f && b.isOpen(i) && (!b.lit || b.lit[i]) && !d.isMax(it.id) && d.item(it.id).family !== 'generator') { (byId.get(it.id) || byId.set(it.id, []).get(it.id)).push(i); } }
    // 1. an item a resident wants right now
    if (g.ctx.kind === 'home') {
      for (let i = 0; i < b.n; i++) { const it = b.items[i]; if (!it || it.f || !b.isOpen(i)) continue; const who = g.whoWants(it.id); if (who) { const rc = g.residentCell(who); if (rc != null && b.isOpen(rc)) return { kind: 'deliver', cells: [i], arrowTo: rc }; } }
    }
    // 1b. a gift waiting on the ground
    if (g.ctx.kind === 'home') { const gift = g.landedGifts()[0]; if (gift) return { kind: 'gift', cells: [gift.cell] }; }
    // 2. a merge: drag one loose item onto a matching item that already touches the rest of the group
    let best = null;
    for (const [id, cells] of byId) {
      if (cells.length < 3) continue;
      const chain = d.item(id).chain; const base = (needed.has(chain) ? 100 : 0) - d.item(id).level;
      for (const q of cells.slice(0, 16)) {
        const item = b.items[q]; b.items[q] = null;
        for (const a of cells) {
          if (a === q) continue;
          const plan = planMerge(b, a, item, d, { maxGroup: d.economy.merge.maxGroup });
          if (!plan) continue;
          const score = base + plan.size * 2 - b.dist(a, q) * 0.1;
          if (!best || score > best.score) best = { score, from: q, to: a, cells: [q, ...plan.pickedCells.filter(c => c !== q)] };
        }
        b.items[q] = item;
      }
    }
    if (best) return { kind: 'merge', cells: best.cells, arrowTo: best.to, from: best.from };
    // 3. a generator to tap
    const energy = g.ctx.kind === 'island' ? g.islandChargeInfo().charges : g.energyNow();
    if (energy > 0) {
      for (let i = 0; i < b.n; i++) { const it = b.items[i]; if (it && b.isOpen(i) && d.item(it.id).family === 'generator') return { kind: 'generator', cells: [i] }; }
      if (g.ctx.kind === 'island') return { kind: 'generator', cells: [g.ctx.anchor] };
    }
    return null;
  }
  showHintNow() {
    const hint = this.computeHint(); if (!hint) { this.toast('Nothing to suggest. Try clearing space or selling spare items.'); return; }
    this.setHint(hint);
  }
  setHint(hint) {
    const r = this.renderer; this.hintShownAt = performance.now();
    // for a merge hint the arrow goes from the loose item toward the group
    const cells = hint.kind === 'merge' ? [hint.from, ...hint.cells.filter(c => c !== hint.from)] : hint.cells;
    r.hint = { cells: hint.cells, arrowTo: hint.arrowTo, from: cells[0], until: r.now() + 6 };
    if (hint.kind === 'merge' && hint.from != null) r.hint.cells = hint.cells;
    this.audio.sfx('hint');
  }
  checkHints() {
    const g = this.game, s = g.s.settings; if (!s.hints || this.modalOpen() || this.renderer.drag || this.tutorial.active) return;
    const idle = (performance.now() - this.lastActivity) / 1000;
    if (idle < 8 || performance.now() - this.hintShownAt < 14000 || this.renderer.hint) return;
    const hint = this.computeHint(); if (!hint) return;
    if (hint.kind === 'generator' && idle < 20) return;
    this.setHint(hint);
  }

  /* --------------------------------------------------------------- events */
  onEvent(ev) {
    const g = this.game, r = this.renderer, a = this.audio, d = this.data;
    this.dirty = true; this.hudDirty = true;
    const here = !ev.ctx || ev.ctx === g.ctx.id;
    this.tutorial.onEvent(ev);
    switch (ev.type) {
      case 'merge': if (here) this.onMerge(ev); break;
      case 'shimmerBonus': if (here) { r.floatText(ev.idx, `+${ev.coins}`, '#ffd54a', 22, -20); a.sfx('shimmer'); } break;
      case 'place': if (here) this.onPlace(ev); break;
      case 'spawn': if (here) { a.sfx('spawn'); r.burst(ev.from, '#ffffff', 6, 0.6); r.setAnim(ev.from, 'bounce', 0.25); } break;
      case 'stored': a.sfx('drop'); break;
      case 'overflow': if (performance.now() - this.lastOverflowToast > 3000) { this.lastOverflowToast = performance.now(); this.toast('Storage is full: the item is waiting in an overflow bubble.', 'bad'); } break;
      case 'autosold': this.toast(`No space anywhere! Sold for ${ev.coins} coins.`, 'bad'); break;
      case 'swap': break;
      case 'hit': if (here) { const ob = ev.obstacle; r.setAnim('ob' + ob.id, 'shake', 0.3); r.screenShake(2); r.burst(g.ctx.board.idx(ob.x, ob.y), '#b8e6a0', 6, 0.7); a.sfx('hit', OB_SOUND[ob.type] || 'crack'); this.haptic(10); } break;
      case 'cleared': if (here) { const cells = ev.cells; r.burst(cells[0], '#e0c288', 18, 1); r.ring(cells[0], 'rgba(255,255,255,0.8)', 0.6); a.sfx('clear'); this.haptic(18); } break;
      case 'collect': {
        if (!here) break; const col = { coins: '#ffd54a', energy: '#7be0ff', pearls: '#e6c8ff', amulets: '#ffd54a', tickets: '#ffd54a' }[ev.kind] || '#fff';
        r.burst(ev.idx, col, 16, 1); r.floatText(ev.idx, `+${ev.amount}`, col, 26);
        a.sfx(ev.kind === 'energy' ? 'energy' : ev.kind === 'amulets' || ev.kind === 'tickets' ? 'level' : 'coin'); this.haptic(12); break;
      }
      case 'sold': a.sfx('sell'); this.ui.bump('coins', ev.coins); break;
      case 'soldStack': a.sfx('sell'); this.toast(`Sold ${ev.count} × ${d.name(ev.id)} for ${ev.coins} coins`, 'gold'); break;
      case 'currency': if (ev.delta > 0 && ev.kind !== 'tickets') this.ui.bump(ev.kind, ev.delta); else if (ev.kind === 'tickets' && ev.delta > 0) this.ui.bump('tickets', ev.delta); break;
      case 'chestOpened': if (here) { r.burst(ev.idx, '#ffd54a', 28, 1.4); r.ring(ev.idx, 'rgba(255,215,90,0.9)', 1.2); a.sfx('chest'); this.haptic(25); this.ui.loot(ev.contents, ev.gift ? 'Gift!' : 'Found'); } break;
      case 'discover': if (performance.now() - this.lastDiscover > 1800) { this.lastDiscover = performance.now(); this.toast(`New: ${d.name(ev.item.id)}  +${ev.coins} coins`, 'gold', 2200); } break;
      case 'levelup': a.sfx('level'); this.haptic([30, 40, 30]); this.enqueue(() => this.panels.levelUp(ev)); if (ev.pocket) this.toast('A hidden pocket of land opened up!', 'good'); break;
      case 'questDone': a.sfx('quest'); this.toast('Quest complete!', 'good'); break;
      case 'questStarted': if (g.s.tutorial.done) this.hudDirty = true; break;
      case 'arrive': a.sfx('resident'); this.enqueue(() => this.panels.arrival(ev.id, ev.line)); break;
      case 'zoneUnlocked': a.sfx('zone'); this.haptic([40, 40, 60]); this.onZoneUnlocked(ev); break;
      case 'pocketOpened': for (const c of ev.cells.slice(0, 12)) r.burst(c, '#fff6a8', 6, 0.8); a.sfx('zone'); break;
      case 'built': a.sfx('built'); this.haptic([30, 30, 50]); this.onBuilt(ev); break;
      case 'upgraded': a.sfx('built'); this.toast(`Upgraded to tier ${ev.tier}!`, 'good'); break;
      case 'projectFill': a.sfx('drop'); { const st = this.findStruct(ev.building); if (st) r.burst(g.ctx.board.idx(st.x + (st.w >> 1), st.y), '#9be37f', 8, 0.8); } break;
      case 'giftDrop': a.sfx('balloon'); this.toast(ev.count > 1 ? `${ev.count} gift balloons are floating down!` : 'A gift balloon is floating down!', 'gold'); break;
      case 'toast': this.toast(ev.text); break;
      case 'openBuild': a.sfx('open'); this.panels.build(ev.building); break;
      case 'openBuilding': this.panels.building(ev.building); break;
      case 'openResident': this.panels.resident(ev.id); break;
      case 'openTrade': this.panels.trade(); break;
      case 'openCottage': this.panels.cottage(); break;
      case 'openMuseum': this.panels.museum(); break;
      case 'openTemple': this.panels.temple(); break;
      case 'openHarbor': this.panels.harbor(); break;
      case 'openLiving': this.panels.living(ev.slot, ev.kind); break;
      case 'openIslandGuide': this.panels.islandGuide(ev.island); break;
      case 'enterIsland': case 'leaveIsland': this.onContextChange(); break;
      case 'islandGoal': a.sfx('ui'); break;
      case 'islandGoalDone': a.sfx('quest'); this.toast('Island goal complete!', 'good'); break;
      case 'islandDone': a.sfx('zone'); this.enqueue(() => this.panels.islandDone(ev.island)); break;
      case 'petCollected': a.sfx('pet'); this.enqueue(() => this.panels.petFound(ev)); break;
      case 'relic': a.sfx('level'); this.toast(`Relic found: ${ev.relic.name}!`, 'gold', 3500); break;
      case 'achievement': a.sfx('quest'); this.toast(`Achievement: ${ev.achievement.text || ev.achievement.id}`, 'gold', 3200); break;
      case 'dailyDone': a.sfx('quest'); this.toast('Daily task complete! +20 coins, +10 energy', 'good'); break;
      case 'dailyAll': a.sfx('level'); this.toast(`All daily tasks done! Streak: ${ev.streak}`, 'gold', 3500); break;
      case 'weeklyDone': a.sfx('level'); this.toast('Weekly tasks complete! Chest and pearls earned.', 'gold', 3500); break;
      case 'requestDone': a.sfx('quest'); this.toast('Request complete!', 'good'); break;
      case 'orderDone': a.sfx('coin'); this.toast(`Order delivered! +${ev.order.reward} coins${ev.chest ? ' and a chest' : ''}`, 'gold'); break;
      case 'delivered': a.sfx('resident'); { const rc = typeof ev.resident === 'string' ? g.residentCell?.(ev.resident) : null; if (rc != null && g.ctx.kind === 'home') { r.burst(rc, '#ff9ec7', 12, 1); r.floatText(rc, '♥', '#ff6b9d', 30); } } break;
      case 'ate': a.sfx('energy'); this.toast(`Yum! +${Math.round(ev.energy)} energy`, 'good'); break;
      case 'livingPlaced': a.sfx('built'); break;
      case 'livingCollected': a.sfx('coin'); break;
      case 'payout': a.sfx('coin'); this.toast(`Daily payout: +${ev.coins} coins`, 'gold'); break;
      case 'sunGate': a.sfx('zone'); this.toast('The Sun Gate is open!', 'gold', 4000); break;
      case 'chainUnlocked': if (g.s.tutorial.done) this.toast(`New item family: ${d.chain(ev.chain)?.name || ev.chain}`, 'gold'); break;
      case 'cannonFired': a.sfx('boulder'); r.screenShake(5); break;
      case 'lit': a.sfx('shimmer'); break;
      case 'thawed': a.sfx('shimmer'); break;
      case 'poolFilled': a.sfx('whoosh'); break;
      case 'whaleAwake': this.toast('The whale is awake!', 'gold'); a.sfx('zone'); break;
      case 'ventCollected': a.sfx('coin'); break;
      case 'sugarFull': this.toast('Sugar rush! Your next merge gives a free bonus item.', 'gold'); a.sfx('level'); break;
      case 'sugarBonus': a.sfx('bonus5'); break;
      case 'newDay': this.toast('A new day on Isla Solana!'); break;
      case 'eventTier': this.toast(`Event reward tier ${ev.tier} claimed!`, 'gold'); break;
      case 'petGift': this.toast('Biscuit dug up a Driftwood Crate!', 'good'); break;
      case 'setting': break;
      default: break;
    }
    if (ev.type !== 'setting') { this.modalDirty = true; if (!this.modalRaf) this.modalRaf = requestAnimationFrame(() => { this.modalRaf = 0; if (this.modalDirty) { this.modalDirty = false; this.ui.refreshModals(); } }); }
  }
  onMerge(ev) {
    const g = this.game, r = this.renderer, a = this.audio, t = ev.target;
    for (const p of ev.picked) if (!p.virtual && p.idx !== t) r.flight(p.item, p.idx, t, 0.2, 0);
    r.setAnim(t, 'merge', 0.4, 0.18);
    const col = GLOW(ev.level);
    setTimeout(() => { r.burst(t, col, 10 + ev.level * 2, 1 + ev.level * 0.05); if (ev.size >= 4 || ev.level >= 5) r.ring(t, col === '#ffffff' ? 'rgba(255,255,255,0.9)' : col, ev.level >= 7 ? 1.4 : 0.8); }, 160);
    for (const bo of ev.bonus) if (bo.where.where === 'board') r.setAnim(bo.where.idx, 'pop', 0.3, 0.32);
    a.sfx('merge', ev.level);
    if (ev.size === 4) { setTimeout(() => a.sfx('bonus4'), 120); r.floatText(t, 'Bonus!', '#8dff9a', 24, -34); }
    if (ev.size >= 5) { setTimeout(() => a.sfx('bonus5'), 120); r.floatText(t, 'Double!', '#ffd54a', 26, -34); }
    if (ev.cascade) { a.sfx('cascade'); this.ui.cascadeTag(`Chain ×${g.cascadeDepth + 1}`); }
    if (ev.level >= 7) r.screenShake(3);
    this.haptic(ev.level >= 7 ? 28 : ev.size >= 4 ? 20 : 12);
  }
  onPlace(ev) {
    const r = this.renderer, a = this.audio;
    const fromMerge = ev.src === 'merge';
    if (!fromMerge && ev.from != null && ev.from !== ev.idx && ['generator', 'chest', 'obstacle', 'hidden', 'farm', 'reward', 'quest', 'sugar', 'vent'].includes(ev.src)) {
      r.setAnim(ev.idx, 'pop', 0.25, 0.22); r.flight(ev.item, ev.from, ev.idx, 0.26, 0);
    } else if (!fromMerge) r.setAnim(ev.idx, 'pop', 0.3);
    if (ev.item.s) { a.sfx('shimmer'); r.burst(ev.idx, '#fff6a8', 8, 0.7); }
  }
  findStruct(bldId) { const b = this.game.ctx.board; for (let i = 0; i < b.n; i++) { const st = b.struct[i]; if (st && st.id === bldId) return st; } return null; }
  onZoneUnlocked(ev) {
    const g = this.game, r = this.renderer, b = g.ctx.board; const [x, y, w, h] = ev.rect;
    for (let k = 0; k < 14; k++) r.burst(b.idx(x + Math.floor(Math.random() * w), y + Math.floor(Math.random() * h)), '#fff6a8', 8, 1);
    r.focusCell(b.idx(x + (w >> 1), y + (h >> 1)), 0.7);
    this.syncMusic();
    this.enqueue(() => this.panels.zoneUnlocked(ev));
  }
  onBuilt(ev) {
    const r = this.renderer, g = this.game; const st = this.findStruct(ev.building); if (!st) return;
    const c = g.ctx.board.idx(st.x + (st.w >> 1), st.y + (st.h >> 1));
    r.burst(c, '#ffd54a', 30, 1.4); r.ring(c, 'rgba(255,230,120,0.9)', 1.4); r.focusCell(c, null);
    this.toast(`${this.data.buildingById[ev.building].name} built!`, 'good');
  }
  onContextChange() {
    this.renderer.setContext(false); this.clearSel();
    this.ui.build(); this.syncMusic(true); this.hintShownAt = performance.now(); this.touchActivity();
  }
}
