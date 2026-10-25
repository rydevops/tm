// Expedition islands (spec section 14): separate boards that reuse the home engine, each with one unique rule.
import { Board } from './board.js';
import { RNG, hashStr, dayKey, parseItemId, itemId } from './util.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installIslandCommands(Game) {
  const P = Game.prototype;

  P.restoreIslands = function (docs) { this.islandDocs = docs || {}; this.islandCtx = this.islandCtx || {}; };
  P.serializeIslands = function () {
    const out = { ...(this.islandDocs || {}) };
    for (const [id, ctx] of Object.entries(this.islandCtx || {})) out[id] = this.serializeIslandCtx(ctx);
    return out;
  };
  P.serializeIslandCtx = function (ctx) {
    const b = ctx.board, items = [], obstacles = [], seen = new Set();
    for (let i = 0; i < b.n; i++) {
      const it = b.items[i];
      if (it) items.push({ i, id: it.id, ...(it.s ? { s: 1 } : {}), ...(it.f ? { f: 1 } : {}) });
      const o = b.obst[i];
      if (o && !seen.has(o.id)) { seen.add(o.id); obstacles.push({ type: o.type, x: o.x, y: o.y, hits: o.hits }); }
    }
    return {
      items, obstacles, tray: ctx.tray, overflow: ctx.overflow, charges: ctx.charges, chargeAt: ctx.chargeAt,
      structs: ctx.structs.map(s => ({ ...s })), lit: ctx.lit ? Array.from(ctx.lit) : null, sugar: ctx.sugar, vents: ctx.vents
    };
  };

  // ---------------------------------------------------------------- state helpers
  P.islandState = function (id) {
    const s = this.s;
    if (!s.islands[id]) s.islands[id] = { state: 'new', goals: [0, 0, 0, 0, 0], visits: 0, rewardDay: '' };
    return s.islands[id];
  };
  P.islandStatus = function (id) {
    const d = this.data, def = d.islandById[id], st = this.islandState(id);
    const level = this.s.player.level;
    const unlocked = level >= def.level;
    const firstCost = st.state === 'new' ? 1 : 0;
    return { def, state: st.state, unlocked, ticketsNeeded: firstCost, canGo: unlocked && this.s.player.tickets >= firstCost, goals: st.goals };
  };

  // ---------------------------------------------------------------- context construction
  P.buildIslandCtx = function (id, doc) {
    const d = this.data, def = d.islandById[id];
    const board = new Board(def.w, def.h); board.land.fill(1);
    const ctx = {
      id, kind: 'island', islandId: id, board, tray: new Array(d.economy.island.trayStart).fill(null), overflow: [], rule: def.rule,
      structs: [], charges: d.economy.island.charges, chargeAt: 0, frozenRate: def.frozenRate || 0.2, sugar: { meter: 0, last: 0, armed: false }, vents: [], lit: null, anchor: null
    };
    const gx = def.w >> 1, gy = def.h - 2;
    const gen = { kind: 'islandgen', id: `${id}_gen`, x: gx, y: gy, w: 1, h: 1 };
    ctx.anchor = board.idx(gx, gy);
    const guide = { kind: 'guide', id: def.guide, x: Math.max(0, gx - 2), y: gy, w: 1, h: 1, name: def.guide };
    const putStruct = s => { ctx.structs.push(s); board.struct[board.idx(s.x, s.y)] = s; };
    if (doc) {
      doc.items.forEach(c => { board.items[c.i] = { id: c.id, s: c.s || 0, ...(c.f ? { f: 1 } : {}) }; });
      doc.obstacles.forEach(o => this.addObstacle(board, o.type, o.x, o.y, null, o.hits));
      ctx.tray = doc.tray; ctx.overflow = doc.overflow; ctx.charges = doc.charges; ctx.chargeAt = doc.chargeAt;
      ctx.sugar = doc.sugar || ctx.sugar; ctx.vents = doc.vents || [];
      for (const s of doc.structs) putStruct(s);
      if (doc.lit) ctx.lit = Uint8Array.from(doc.lit);
      board.lit = ctx.lit;
    } else {
      const rng = new RNG(hashStr(`${this.s.rngSeed}:${id}`));
      putStruct(gen); putStruct(guide);
      const keep = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) keep.add(board.idx(Math.min(def.w - 1, Math.max(0, gx + dx)), Math.min(def.h - 1, Math.max(0, gy + dy))));
      keep.add(board.idx(guide.x, guide.y));
      const freeCells = () => { const out = []; for (let i = 0; i < board.n; i++) if (board.isEmpty(i) && !keep.has(i)) out.push(i); return out; };
      const randFree = () => { const f = freeCells(); return f.length ? rng.pick(f) : -1; };
      if (def.rule === 'tidepools') for (let k = 0; k < def.pools; k++) { const c = randFree(); if (c >= 0) putStruct({ kind: 'pool', id: `pool_${k + 1}`, x: board.x(c), y: board.y(c), w: 1, h: 1, filled: false }); }
      if (def.rule === 'vents') for (let k = 0; k < def.vents; k++) { const c = randFree(); if (c >= 0) { putStruct({ kind: 'vent', id: `vent_${k + 1}`, x: board.x(c), y: board.y(c), w: 1, h: 1 }); ctx.vents.push({ stored: 1, readyAt: this.now() + 180000 }); } }
      if (def.rule === 'darkness') { ctx.lit = new Uint8Array(board.n); board.lit = ctx.lit; this.lightArea(ctx, gx, gy, 2); }
      const place = (type, n) => { for (let k = 0; k < n; k++) { const def2 = d.obstacleById[type]; for (let a = 0; a < 80; a++) { const c = randFree(); if (c < 0) break; const x = board.x(c), y = board.y(c); let ok = x + def2.w <= board.w && y + def2.h <= board.h; for (let j = 0; ok && j < def2.h; j++) for (let i = 0; ok && i < def2.w; i++) if (!board.isEmpty(board.idx(x + i, y + j)) || keep.has(board.idx(x + i, y + j))) ok = false; if (ok) { this.addObstacle(board, type, x, y); break; } } } };
      for (const [t, n] of def.obstacles || []) place(t, n);
      for (const [t, n] of def.special || []) place(t, n);
      // starter items next to the generator
      const start = def.genOutputs.slice(0, 2).map(o => o[0]);
      for (const sid of [start[0], start[0], start[1] || start[0]]) { const c = board.nearestEmpty(ctx.anchor, 1)[0]; if (c != null) board.items[c] = { id: sid, s: 0 }; }
    }
    return ctx;
  };

  P.lightArea = function (ctx, cx, cy, r = 1) {
    const b = ctx.board; let n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (b.inBounds(x, y)) { const i = b.idx(x, y); if (!ctx.lit[i]) { ctx.lit[i] = 1; n++; } } }
    return n;
  };

  // ---------------------------------------------------------------- entering and leaving
  P.enterIsland = function (id, supply = []) {
    const d = this.data, s = this.s, def = d.islandById[id];
    if (!def) return fail('unknown');
    if (this.ctx.kind === 'island') return fail('already');
    const st = this.islandState(id);
    if (s.player.level < def.level) return fail('level', { level: def.level });
    if (st.state === 'new') { if (s.player.tickets < 1) return fail('tickets'); s.player.tickets--; st.state = 'in_progress'; this.emit('currency', { kind: 'tickets', delta: -1 }); }
    this.islandCtx = this.islandCtx || {};
    let ctx = this.islandCtx[id];
    if (!ctx) { ctx = this.buildIslandCtx(id, this.islandDocs?.[id] || null); this.islandCtx[id] = ctx; delete this.islandDocs?.[id]; }
    // supply crate: up to 5 home items travel with the player
    const carried = [];
    for (const src of supply.slice(0, d.economy.island.supplySlots)) {
      const it = this.peek(src); if (!it) continue;
      if (it.f) continue;
      this.lift(src); carried.push(it);
    }
    this.syncIslandCharges(ctx);
    this.ctx = ctx;
    for (const it of carried) this.placeItem(it, ctx.anchor, ctx, 'supply');
    st.visits++;
    this.noteEvent({ type: 'visit_island', island: id });
    this.emit('enterIsland', { island: id });
    // once finished, a free daily chest waits at the harbor
    if (st.state === 'done' && st.rewardDay !== dayKey(this.now())) { st.rewardDay = dayKey(this.now()); this.addItem(this.makeItem('chest_02'), null, 'island', this.home); this.emit('islandDaily', { island: id }); }
    return { ok: true };
  };
  P.leaveIsland = function () {
    if (this.ctx.kind !== 'island') return fail('notThere');
    const id = this.ctx.islandId;
    this.cascades.length = 0;
    this.ctx = this.home;
    this.emit('leaveIsland', { island: id });
    return { ok: true };
  };

  // ---------------------------------------------------------------- generator, charges and vents
  P.syncIslandCharges = function (ctx) {
    const eco = this.data.economy.island, now = this.now(), step = eco.rechargeSec * 1000;
    if (ctx.charges >= eco.charges) { ctx.chargeAt = 0; return; }
    if (!ctx.chargeAt) ctx.chargeAt = now + step;
    while (ctx.charges < eco.charges && now >= ctx.chargeAt) { ctx.charges++; ctx.chargeAt += step; }
    if (ctx.charges >= eco.charges) ctx.chargeAt = 0;
  };
  P.tickIsland = function () {
    const ctx = this.ctx;
    if (ctx.kind !== 'island') return;
    this.syncIslandCharges(ctx);
    const now = this.now();
    for (const v of ctx.vents) { while (v.stored < 5 && now >= v.readyAt) { v.stored++; v.readyAt += 180000; } if (v.stored >= 5) v.readyAt = now + 180000; }
  };
  /** Top up the island's charges (the expedition's own energy) with coins, pearls or a demo ad. The ad shares the daily limit of energy ads. */
  P.refillIslandCharges = function (how) {
    const ctx = this.ctx, eco = this.data.economy.island, cap = eco.charges;
    if (ctx.kind !== 'island') return fail('notIsland');
    this.syncIslandCharges(ctx);
    if (ctx.charges >= cap) return fail('full');
    let n;
    if (how === 'coins') { n = eco.refill.coins.charges; if (!this.spendCoins(eco.refill.coins.cost)) return fail('noCoins'); }
    else if (how === 'pearls') { n = eco.refill.pearls.charges; if (!this.spendPearls(eco.refill.pearls.cost)) return fail('noPearls'); }
    else if (how === 'ad') { const st = this.adStatus(); if (!st.ok) return fail(st.left <= 0 ? 'limit' : 'cooldown', st); this.s.adState.count++; this.s.adState.lastAt = this.now(); n = eco.refill.adCharges; }
    else return fail('how');
    ctx.charges = Math.min(cap, ctx.charges + n);
    if (ctx.charges >= cap) ctx.chargeAt = 0;
    return { ok: true, charges: ctx.charges };
  };
  P.islandChargeInfo = function () { const ctx = this.ctx; this.syncIslandCharges(ctx); return { charges: ctx.charges, cap: this.data.economy.island.charges, seconds: ctx.chargeAt ? Math.max(0, Math.ceil((ctx.chargeAt - this.now()) / 1000)) : 0 }; };

  P.islandSpawn = function (gen, tier, idx) { return this.islandTapGen(); };
  P.islandTapGen = function () {
    const ctx = this.ctx, d = this.data, def = d.islandById[ctx.islandId];
    this.syncIslandCharges(ctx);
    if (ctx.charges <= 0) return fail('noCharges', { seconds: Math.max(0, Math.ceil((ctx.chargeAt - this.now()) / 1000)) });
    const genDef = { id: `${ctx.islandId}_gen`, outputs: def.genOutputs.map(([item, weight]) => ({ item, weight })) };
    const r = this.spawn(genDef, 1, ctx.anchor, { cost: 'none' });
    if (r.ok) { const was = ctx.charges >= d.economy.island.charges; ctx.charges--; if (was || !ctx.chargeAt) ctx.chargeAt = this.now() + d.economy.island.rechargeSec * 1000; r.charges = ctx.charges; }
    return r;
  };

  // ---------------------------------------------------------------- struct taps and drops on islands
  const baseTapStruct = P.tapStruct;
  P.tapStruct = function (st, idx) {
    if (this.ctx.kind === 'island') {
      if (st.kind === 'islandgen') return this.islandTapGen();
      if (st.kind === 'guide') { this.emit('openIslandGuide', { island: this.ctx.islandId }); return { ok: true, action: 'guide' }; }
      if (st.kind === 'pool') { this.emit('toast', { text: st.filled ? 'This pool is full.' : `Drop a ${this.data.name(itemId('sea', this.poolMinLevel()))} or better here.` }); return { ok: true, action: 'pool' }; }
      if (st.kind === 'vent') return this.collectVent(st);
    }
    return baseTapStruct.call(this, st, idx);
  };
  const baseDropOnStruct = P.dropOnStruct;
  P.dropOnStruct = function (st, item, idx, opts) {
    if (this.ctx.kind === 'island') {
      if (st.kind === 'islandgen' || st.kind === 'vent') return fail('blocked', { bounce: true });
      if (st.kind === 'guide') return this.islandDeliver(item);
      if (st.kind === 'pool') return this.fillPool(st, item);
      return fail('blocked', { bounce: true });
    }
    return baseDropOnStruct.call(this, st, item, idx, opts);
  };

  P.currentGoalIndex = function (id = this.ctx.islandId) { const def = this.data.islandById[id], st = this.islandState(id); return def.goals.findIndex((g, i) => st.goals[i] < (g.count || 1)); };
  P.islandDeliver = function (item) {
    const ctx = this.ctx, def = this.data.islandById[ctx.islandId], gi = this.currentGoalIndex();
    if (gi < 0) return fail('done', { bounce: true });
    const g = def.goals[gi];
    if (g.type !== 'deliver_item' || g.item !== item.id) return fail('notWanted', { bounce: true, hint: `Current goal: ${g.text}` });
    this.noteEvent({ type: 'deliver', id: item.id, giver: 'island' });
    this.emit('delivered', { resident: ctx.islandId, item });
    return { ok: true, consumed: true, delivered: true };
  };

  /** Tide pools take sea life from the fourth level of the old ladder up. */
  P.poolMinLevel = function () { return this.data.legacyLevel('sea', 4); };

  P.fillPool = function (pool, item) {
    const d = this.data, info = d.item(item.id);
    if (pool.filled) return fail('full', { bounce: true, hint: 'This pool is already full' });
    if (info.chain !== 'sea' || info.level < this.poolMinLevel()) return fail('needFish', { bounce: true, hint: `Needs a ${d.name(itemId('sea', this.poolMinLevel()))} or better` });
    pool.filled = true;
    const ctx = this.ctx, def = d.islandById[ctx.islandId];
    this.emit('poolFilled', { pool });
    // reveals hidden items nearby
    const anchor = ctx.board.idx(pool.x, pool.y);
    const n = this.rng.range(1, 2);
    for (let i = 0; i < n; i++) this.addItem(this.makeItem(this.rng.weighted(def.genOutputs.map(([item, weight]) => ({ item, weight }))).item), anchor, 'hidden', ctx);
    this.noteEvent({ type: 'fill_pool' });
    if (ctx.structs.filter(s => s.kind === 'pool').every(s => s.filled)) this.emit('whaleAwake', {});
    return { ok: true, consumed: true };
  };

  P.collectVent = function (vent) {
    const ctx = this.ctx, v = ctx.vents[ctx.structs.filter(s => s.kind === 'vent').indexOf(vent)];
    this.tickIsland();
    if (!v || v.stored <= 0) return { ok: true, action: 'ventWait' };
    const n = v.stored; v.stored = 0; v.readyAt = this.now() + 180000;
    const anchor = ctx.board.idx(vent.x, vent.y);
    for (let i = 0; i < n; i++) this.addItem(this.makeItem('ember_01'), anchor, 'vent', ctx);
    this.emit('ventCollected', { n });
    return { ok: true, action: 'vent', n };
  };

  // ---------------------------------------------------------------- pre-drop hooks (cannon, lantern, thaw)
  P.islandPreDrop = function (item, to, src, opts) {
    const ctx = this.ctx;
    if (ctx.kind !== 'island') return null;
    const b = ctx.board, d = this.data, info = d.item(item.id);
    if (ctx.rule === 'cannon' && info.chain === 'pirate' && info.isMax) {          // the top pirate item
      const cx = b.x(to), cy = b.y(to), hit = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (b.inBounds(x, y)) { const o = b.obst[b.idx(x, y)]; if (o) hit.add(o); } }
      this.emit('cannonFired', { cell: to, cells: [...hit].length });
      for (const o of hit) { o.hits = 0; this.finishObstacle(o, d.obstacleById[o.type], ctx); }
      this.noteEvent({ type: 'use_item', id: item.id });
      return { ok: true, consumed: true, cannon: true };
    }
    if (ctx.rule === 'darkness' && info.chain === 'lantern' && info.level >= d.legacyLevel('lantern', 3)) {
      const n = this.lightArea(ctx, b.x(to), b.y(to), 1);
      if (!n) return fail('alreadyLit', { bounce: true, hint: 'Already lit' });
      this.emit('lit', { cell: to });
      this.noteEvent({ type: 'light_area' });
      return { ok: true, consumed: true, lit: true };
    }
    if (ctx.rule === 'frozen' && info.chain === 'drinks' && info.level >= d.legacyLevel('drinks', 3)) {
      const cells = [to, ...b.neighbors8(to)].filter(c => b.items[c]?.f);
      if (!cells.length) return null;
      for (const c of cells) { delete b.items[c].f; this.noteEvent({ type: 'thaw' }); }
      this.emit('thawed', { cells });
      return { ok: true, consumed: true, thawed: cells.length };
    }
    return null;
  };

  P.islandAfterMerge = function (ctx, plan) {
    if (ctx.kind !== 'island' || ctx.rule !== 'sugar') return;
    const now = this.now(), sg = ctx.sugar;
    if (sg.armed) {
      // the meter was full: this merge gives a free bonus item
      sg.armed = false; sg.meter = 0; sg.last = now;
      const it = { id: plan.resultId, s: 0 };
      this.placeItem(it, ctx.anchor, ctx, 'sugar');
      this.registerCreate(it, 'sugar', ctx);
      this.emit('sugarBonus', {});
      return;
    }
    if (now - sg.last > 10000) sg.meter = 0;
    sg.last = now; sg.meter = Math.min(100, sg.meter + 20);
    if (sg.meter >= 100) { sg.armed = true; this.emit('sugarFull', {}); this.noteEvent({ type: 'sugar_rush' }); }
    this.emit('sugarMeter', { meter: sg.meter });
  };
  P.islandAfterClear = function () {};

  // ---------------------------------------------------------------- goals
  P.islandProgress = function (ev) {
    const ctx = this.ctx;
    if (ctx.kind !== 'island') return;
    const id = ctx.islandId, def = this.data.islandById[id], st = this.islandState(id);
    if (st.state !== 'in_progress') return;
    const gi = this.currentGoalIndex(id);
    if (gi < 0) return;
    const g = def.goals[gi];
    let inc = 0;
    switch (g.type) {
      case 'clear_obstacle': inc = ev.type === 'clear_obstacle' ? 1 : 0; break;
      case 'clear_special': inc = ev.type === 'clear_obstacle' && ev.obstacle === g.obstacle ? 1 : 0; break;
      case 'create_item': { if (ev.type !== 'create_item') break; const p = parseItemId(ev.id), q = parseItemId(g.item); inc = p.chain === q.chain && p.level >= q.level ? 1 : 0; break; }
      case 'deliver_item': inc = ev.type === 'deliver' && ev.giver === 'island' && ev.id === g.item ? 1 : 0; break;
      case 'fill_pool': inc = ev.type === 'fill_pool' ? 1 : 0; break;
      case 'use_item': inc = ev.type === 'use_item' && ev.id === g.item ? 1 : 0; break;
      case 'thaw': inc = ev.type === 'thaw' ? 1 : 0; break;
      case 'sugar_rush': inc = ev.type === 'sugar_rush' ? 1 : 0; break;
      case 'light_area': inc = ev.type === 'light_area' ? 1 : 0; break;
      default: break;
    }
    if (!inc) return;
    // tide pool goal 5 counts every filled pool in total, not just new ones
    if (g.type === 'fill_pool' && g.count === 6) st.goals[gi] = Math.min(g.count, ctx.structs.filter(s => s.kind === 'pool' && s.filled).length);
    else st.goals[gi] = Math.min(g.count || 1, st.goals[gi] + inc);
    this.emit('islandGoal', { island: id, goal: gi, progress: st.goals[gi], need: g.count || 1 });
    if (st.goals[gi] >= (g.count || 1)) {
      this.emit('islandGoalDone', { island: id, goal: gi });
      if (this.currentGoalIndex(id) < 0) this.completeIsland(id);
    }
  };

  P.completeIsland = function (id) {
    const def = this.data.islandById[id], st = this.islandState(id), s = this.s;
    st.state = 'done';
    s.stats.islandsDone = this.data.islands.filter(i => s.islands[i.id]?.state === 'done').length;
    for (const r of def.rewards) {
      if (r.amulet) { s.journal.islandAmulets = s.journal.islandAmulets || []; if (!s.journal.islandAmulets.includes(id)) s.journal.islandAmulets.push(id); }
      else if (r.item) for (let k = 0; k < (r.count || 1); k++) this.addItem(this.makeItem(r.item), null, 'island', this.home);
      else if (r.pearls) this.addPearls(r.pearls);
    }
    if (def.decor) { s.journal.decor = s.journal.decor || []; s.journal.decor.push(def.decor); }
    this.emit('islandDone', { island: id });
    this.noteEvent({ type: 'island_done', island: id });
    this.noteState?.('island');
    this.checkAchievements?.();
  };
}
