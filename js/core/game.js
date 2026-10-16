// Game: the deterministic simulation. State + commands; the view only sends commands and listens to events.
import { Board } from './board.js';
import { RNG, itemId, parseItemId, clamp, dayKey, weekKey } from './util.js';

export const SCHEMA = 3;
const HOUR = 3600 * 1000;

export const DEFAULT_SETTINGS = {
  musicOn: true, sfxOn: true, music: 0.5, sfx: 0.8, haptics: true, hints: true, confirmMerge: false, tapToMove: false,
  reduceMotion: false, textScale: 100, patterns: false, quality: 'high', fpsCap: 60, notifications: false, language: 'en'
};

export class Game {
  constructor(data, opts = {}) {
    this.data = data;
    this.now = opts.now || (() => Date.now());
    this.listeners = new Set();
    this.cascades = [];
    this.cascadeDepth = 0;
    this.nextObstacleId = 1;
    this.ctx = null;
    this.home = null;
  }

  // ------------------------------------------------------------------ creation
  static create(data, opts = {}) {
    const g = new Game(data, opts);
    g.s = g.newState(opts.seed ?? ((Math.random() * 2 ** 31) | 0));
    g.rng = new RNG(g.s.rngSeed);
    g.buildHome(true);
    g.afterLoad(true);
    return g;
  }

  static fromSave(data, doc, opts = {}) {
    const g = new Game(data, opts);
    g.s = doc.state;
    g.s.schema = SCHEMA;
    g.rng = new RNG(g.s.rngSeed);
    g.buildHome(false, doc.home);
    g.restoreIslands(doc.islandBoards || {});
    g.afterLoad(false, doc.savedAt);
    return g;
  }

  newState(seed) {
    const now = this.now();
    const eco = this.data.economy;
    return {
      schema: SCHEMA, savedAt: now, createdAt: now, playtime: 0, rngSeed: seed,
      player: { level: 1, xp: 0, energy: eco.energy.start, energyAt: now, coins: 0, pearls: 0, amulets: 0, amuletsSpent: 0, tickets: 0 },
      zones: { unlocked: [1], pockets: [], pocketsOpen: 0 },
      built: {}, siteFill: {}, structs: {}, living: [],
      storageSlots: eco.storage.start, storage: new Array(eco.storage.start).fill(null), overflow: [],
      quests: { active: [], done: [], progress: {}, started: {} },
      arrived: ['beni', 'marlene'],
      chains: this.data.chains.filter(c => c.unlockedByZone === 0).map(c => c.chain),
      journal: { discovered: {}, shimmer: {}, relics: [], pets: [], living: [] },
      petsOwned: [], activePets: [],
      stats: { merges: 0, merges4: 0, merges5: 0, cleared: 0, built: 0, storyQuests: 0, discovered: 0, coinsEarned: 0, level: 1, islandsDone: 0, livingPlaced: 0, relics: 0, shimmerMerged: 0, pets: 0, luau: 0, delivered: 0, dailyDone: 0, bestStreak: 0, sold: 0, orders: 0, highItems: 0, energySpent: 0, crop4: 0, chestsOpened: 0, zones: 1, requests: 0, eaten: 0, gifts: 0, taps: 0 },
      daily: { date: '', tasks: [], rerolled: false, streak: 0, lastAll: '', skips: 1, skipWeek: '', allClaimed: false },
      weekly: { week: '', tasks: [], claimed: false },
      login: { day: 0, claimed: '', },
      requests: { date: '', list: [] },
      trade: { orders: [], filled: 0, nextSlotAt: [] },
      ach: { done: {} },
      settings: { ...DEFAULT_SETTINGS },
      tutorial: { step: 0, done: false },
      islands: {}, event: null,
      gifts: { nextAt: now + 70000, bubble: null },
      adState: { day: '', count: 0, lastAt: 0 },
      flags: {}, daily_collect: {}, shopDeals: { date: '', items: [] }, rescue: { lastEnergy: 0, lastGift: 0 },
      petCrateAt: now + 24 * HOUR, firstDayUntil: now + this.data.economy.energy.firstDayHours * HOUR
    };
  }

  // ------------------------------------------------------------------ world building
  buildHome(fresh, saved) {
    const d = this.data, G = d.grid;
    const b = new Board(G.w, G.h);
    for (const z of d.zones) { const [x, y, w, h] = z.rect; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.land[b.idx(x + i, y + j)] = 1; }
    this.home = { id: 'home', kind: 'home', board: b, get tray() { return this._g.s.storage; }, get overflow() { return this._g.s.overflow; }, _g: this };
    this.ctx = this.home;
    if (fresh) {
      // place obstacles and starting items from the zone config
      for (const z of d.zones) {
        for (const o of z.obstacles) this.addObstacle(b, o.type, o.x, o.y, o.hidden);
        for (const st of z.start) b.items[b.idx(st.x, st.y)] = { id: st.item, s: 0 };
      }
      // pockets: assign
      for (const z of d.zones) z.pockets.forEach((cells, k) => this.s.zones.pockets.push({ zone: z.n, k, cells, open: false }));
    } else {
      b.items.fill(null);
      for (const c of saved.items) b.items[c.i] = { id: c.id, s: c.s || 0, ...(c.sp ? { sp: c.sp } : {}), ...(c.f ? { f: 1 } : {}) };
      for (const o of saved.obstacles) this.addObstacle(b, o.type, o.x, o.y, o.hidden, o.hits);
    }
    this.rebuildFog();
    this.rebuildStructures();
  }

  addObstacle(board, type, x, y, hidden, hits) {
    const def = this.data.obstacleById[type];
    const o = { id: this.nextObstacleId++, type, x, y, w: def.w, h: def.h, hits: hits ?? def.hits, ...(hidden ? { hidden } : {}) };
    for (let j = 0; j < def.h; j++) for (let i = 0; i < def.w; i++) board.obst[board.idx(x + i, y + j)] = o;
    return o;
  }

  rebuildFog() {
    const b = this.home.board, d = this.data;
    b.fog.fill(0);
    for (const z of d.zones) {
      const [x, y, w, h] = z.rect;
      const open = this.s.zones.unlocked.includes(z.n);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.fog[b.idx(x + i, y + j)] = open ? 0 : 1;
    }
    for (const p of this.s.zones.pockets) {
      if (!this.s.zones.unlocked.includes(p.zone) || p.open) continue;
      for (const [x, y] of p.cells) b.fog[b.idx(x, y)] = 2;
    }
  }

  /** Structure objects occupy cells permanently (sites, buildings, residents, soil, perches). */
  rebuildStructures() {
    const b = this.home.board, d = this.data;
    b.struct.fill(null);
    for (const z of d.zones) {
      for (const st of z.sites) {
        const def = d.buildingById[st.building];
        const obj = { kind: this.s.built[st.building] ? 'building' : 'site', id: st.building, x: st.x, y: st.y, w: st.w, h: st.h, zone: z.n, name: def.name };
        this.fillStruct(b, obj);
      }
      for (const r of z.residents) this.fillStruct(b, { kind: 'resident', id: r.id, x: r.x, y: r.y, w: 1, h: 1, zone: z.n, arrived: this.s.arrived.includes(r.id) });
      for (const s of z.soils) this.fillStruct(b, { kind: 'soil', id: s.id, x: s.x, y: s.y, w: 1, h: 1, zone: z.n });
      for (const p of z.perches) this.fillStruct(b, { kind: 'perch', id: `perch_${p.kind}`, slot: p.kind, x: p.x, y: p.y, w: 1, h: 1, zone: z.n });
    }
  }
  fillStruct(board, obj) { for (let j = 0; j < obj.h; j++) for (let i = 0; i < obj.w; i++) board.struct[board.idx(obj.x + i, obj.y + j)] = obj; }

  afterLoad(fresh, savedAt) {
    const s = this.s, now = this.now();
    // time sanity: cap forward credit at 24 h per session, flag backward jumps
    this.offline = { energyBefore: s.player.energy, seconds: 0, forwardCapped: false, backwards: false };
    if (!fresh && savedAt) {
      const delta = now - savedAt;
      this.offline.seconds = Math.max(0, Math.round(delta / 1000));
      const max = this.data.economy.offline.maxForwardHours * HOUR;
      if (delta > max) { this.shiftTimes(delta - max); this.offline.forwardCapped = true; }
      else if (delta < -60000) { this.shiftTimes(delta); this.offline.backwards = true; }
    }
    this.syncChains();
    this.initStructs();
    this.refreshQuests?.();
    this.rolloverDays?.();
    this.tick(0);
    this.offline.energyAfter = s.player.energy;
    if (fresh) {
      this.s.flags.fresh = true;
      this.setupIntro?.();
    }
  }

  /** Move every stored timestamp by `ms` (used for clock clamping). */
  shiftTimes(ms) {
    const s = this.s;
    const sh = o => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (/(At|Until)$/.test(k) && typeof o[k] === 'number' && o[k] > 0) o[k] += ms; };
    sh(s.player); sh(s.gifts); sh(s.adState); sh(s);
    if (s.gifts.bubble) s.gifts.bubble.expiresAt += ms;
    for (const k of Object.keys(s.structs)) sh(s.structs[k]);
    for (const l of s.living) sh(l);
    for (const o of s.trade.orders) { if (o.expiresAt) o.expiresAt += ms; }
    s.trade.nextSlotAt = s.trade.nextSlotAt.map(t => t + ms);
    for (const k of Object.keys(s.daily_collect)) s.daily_collect[k] += ms;
    for (const k of Object.keys(s.islands)) sh(s.islands[k]);
  }

  // ------------------------------------------------------------------ events
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, payload = {}) { const ev = { type, ...payload }; for (const fn of this.listeners) fn(ev); return ev; }

  // ------------------------------------------------------------------ perks
  perk(name) {
    const d = this.data;
    let v = 0;
    for (const id of Object.keys(this.s.built)) { const b = d.buildingById[id]; if (b?.perk?.[name]) v += b.perk[name]; }
    for (const pid of this.s.activePets) { const p = d.petById[pid]; if (p?.perkKey?.[name]) v += p.perkKey[name]; }
    if (name === 'shimmer' && this.eventMod?.('shimmerMult')) { /* handled by caller */ }
    const cap = d.perkCaps[name];
    return cap != null ? Math.min(cap, v) : v;
  }
  petSlots() { return this.s.player.level >= 20 ? 2 : 1; }

  // ------------------------------------------------------------------ chains
  syncChains() {
    const s = this.s, d = this.data;
    const maxZone = Math.max(...s.zones.unlocked);
    for (const c of d.chains) {
      if (c.island) continue;
      if (c.unlockedByZone <= maxZone && !s.chains.includes(c.chain)) s.chains.push(c.chain);
    }
  }
  chainUnlocked(key) { return this.s.chains.includes(key); }
  forceUnlockChain(key) { if (!this.s.chains.includes(key)) { this.s.chains.push(key); this.emit('chainUnlocked', { chain: key }); } }

  // ------------------------------------------------------------------ energy
  regenMs() {
    const eco = this.data.economy.energy, now = this.now();
    const base = (now < this.s.firstDayUntil ? eco.firstDayRegenSeconds : eco.regenSeconds) * 1000;
    return base / (1 + this.perk('energyRegen'));
  }
  syncEnergy() {
    const p = this.s.player, cap = this.data.economy.energy.max, now = this.now();
    if (p.energy >= cap) { p.energyAt = now; return; }
    const step = this.regenMs();
    const dt = now - p.energyAt;
    if (dt >= step) {
      const gain = Math.floor(dt / step);
      p.energy = Math.min(cap, p.energy + gain);
      p.energyAt = p.energy >= cap ? now : p.energyAt + gain * step;
    }
  }
  energyNow() { this.syncEnergy(); return this.s.player.energy; }
  secondsToNextEnergy() { this.syncEnergy(); const p = this.s.player; if (p.energy >= this.data.economy.energy.max) return 0; return Math.max(0, Math.ceil((p.energyAt + this.regenMs() - this.now()) / 1000)); }
  spendEnergy(n) {
    this.syncEnergy();
    const p = this.s.player, cap = this.data.economy.energy.max;
    if (p.energy < n) return false;
    if (p.energy >= cap) p.energyAt = this.now();
    p.energy -= n;
    this.s.stats.energySpent += n;
    this.noteEvent({ type: 'spend_energy', amount: n });
    return true;
  }
  addEnergy(n, { capped = false } = {}) {
    this.syncEnergy();
    const p = this.s.player, cap = this.data.economy.energy.max;
    if (capped) p.energy = Math.min(cap, p.energy + n); else p.energy += n;
    if (p.energy >= cap && p.energy - n < cap) p.energyAt = this.now();
    this.emit('currency', { kind: 'energy', delta: n });
  }
  addCoins(n, src) { if (!n) return; this.s.player.coins += n; if (n > 0) { this.s.stats.coinsEarned += n; this.noteEvent({ type: 'collect_currency', currency: 'coins', amount: n }); } this.emit('currency', { kind: 'coins', delta: n, src }); this.checkAchievements?.(); }
  addPearls(n) { this.s.player.pearls += n; this.emit('currency', { kind: 'pearls', delta: n }); }
  addAmulets(n) { this.s.player.amulets += n; this.emit('currency', { kind: 'amulets', delta: n }); }
  addTickets(n) { this.s.player.tickets = clamp(this.s.player.tickets + n, 0, 10); this.emit('currency', { kind: 'tickets', delta: n }); }
  spendCoins(n) { if (this.s.player.coins < n) return false; this.s.player.coins -= n; this.emit('currency', { kind: 'coins', delta: -n }); return true; }
  spendPearls(n) { if (this.s.player.pearls < n) return false; this.s.player.pearls -= n; this.emit('currency', { kind: 'pearls', delta: -n }); return true; }

  // ------------------------------------------------------------------ xp / levels
  xpForLevel(n) { const x = this.data.economy.xp; return Math.round(x.base * Math.pow(n, x.exp)); }
  mergeXp(level) { return level >= 2 ? Math.round(Math.pow(this.data.economy.xp.mergeGrowth, level - 2)) : 0; }
  addXP(n) {
    if (!n) return;
    const p = this.s.player, cap = this.data.economy.xp.levelCap;
    if (p.level >= cap) return;
    p.xp += n * (this.eventMod ? this.eventMod('xpMult') : 1);
    p.xp = Math.round(p.xp);
    let leveled = 0;
    while (p.level < cap && p.xp >= this.xpForLevel(p.level)) { p.xp -= this.xpForLevel(p.level); p.level++; leveled++; this.onLevelUp(p.level); }
    this.emit('xp', { level: p.level, xp: p.xp, need: this.xpForLevel(p.level), leveled });
  }
  onLevelUp(level) {
    const s = this.s, eco = this.data.economy.levelUp;
    s.stats.level = level;
    this.syncEnergy();
    const cap = this.data.economy.energy.max;
    if (s.player.energy < cap) { s.player.energy = cap; s.player.energyAt = this.now(); }
    const rewards = [{ type: 'item', item: eco.chest }];
    if (level % 5 === 0) { rewards.push({ type: 'item', item: eco.every5.chest }); rewards.push({ type: 'pearls', amount: eco.every5.pearls }); }
    const pocket = this.openPocket?.();
    this.emit('levelup', { level, rewards, pocket });
    for (const r of rewards) this.grantReward(r, null, 'levelup');
    this.noteState?.('level');
    this.checkAchievements?.();
  }

  // ------------------------------------------------------------------ rewards and item placement
  makeItem(id, opts = {}) {
    const it = { id, s: opts.s ? 1 : 0 };
    if (opts.sp) it.sp = opts.sp;
    return it;
  }
  grantReward(r, anchor, src = 'reward') {
    const d = this.data;
    switch (r.type) {
      case 'coins': this.addCoins(r.amount, src); break;
      case 'energy': this.addEnergy(r.amount); break;
      case 'pearls': this.addPearls(r.amount); break;
      case 'amulet': this.addAmulets(r.amount); break;
      case 'tickets': this.addTickets(r.amount); break;
      case 'xp': this.addXP(r.amount); break;
      case 'item': for (let i = 0; i < (r.count || 1); i++) this.addItem(this.makeItem(r.item), anchor, src, this.home); break;
      default: break;
    }
    this.emit('reward', { reward: r, src });
  }
  anchorCell(ctx = this.ctx) { return ctx.anchor ?? this.defaultAnchor(ctx); }
  defaultAnchor(ctx = this.ctx) { const b = ctx.board; return ctx.kind === 'home' ? (ctx.anchor ?? b.idx(14, 37)) : b.idx(b.w >> 1, b.h >> 1); }

  /** Put an item on the board near `anchor`, else the tray, else an overflow bubble, else convert to coins. */
  addItem(item, anchor, src = 'reward', ctx = this.ctx) {
    this.registerCreate(item, src, ctx);
    return this.placeItem(item, anchor ?? this.anchorCell(ctx), ctx, src);
  }
  placeItem(item, anchor, ctx = this.ctx, src = '') {
    const b = ctx.board;
    const cells = b.nearestEmpty(anchor, 1);
    if (cells.length) { b.items[cells[0]] = item; this.emit('place', { idx: cells[0], item, from: anchor, src, ctx: ctx.id }); return { where: 'board', idx: cells[0] }; }
    const tray = ctx.tray;
    const slot = tray.findIndex(t => !t);
    if (slot >= 0) { tray[slot] = item; this.emit('stored', { slot, item, ctx: ctx.id }); return { where: 'tray', slot }; }
    if (ctx.overflow.length < this.data.economy.storage.overflowMax) { ctx.overflow.push(item); this.emit('overflow', { item, ctx: ctx.id }); return { where: 'overflow' }; }
    // nothing fits: never lose value
    const val = this.data.sellValue(item.id);
    if (val) this.addCoins(val, 'autosell');
    this.emit('autosold', { item, coins: val });
    return { where: 'sold', coins: val };
  }

  /** Called whenever an item identity is created in any way: journal, discovery rewards, quests and stats. */
  registerCreate(item, src, ctx = this.ctx) {
    const d = this.data, s = this.s, it = d.item(item.id);
    if (!it) return;
    this.forceUnlockChain(it.chain);
    if (ctx.kind === 'home' || true) {
      if (!s.journal.discovered[item.id]) {
        s.journal.discovered[item.id] = 1; s.stats.discovered++;
        const c = d.economy.discovery.coinsPerLevel * it.level;
        this.addCoins(c, 'discovery');
        this.addXP(d.economy.xp.discovery * it.level);
        this.emit('discover', { item, coins: c });
      }
      if (item.s && !s.journal.shimmer[item.id]) s.journal.shimmer[item.id] = 1;
    }
    if (it.level >= 7) s.stats.highItems++;
    if (it.chain === 'banana' && it.level >= 4 || ['coconut', 'pineapple', 'mango', 'papaya', 'hibiscus', 'herbs'].includes(it.chain) && it.level >= 4) s.stats.crop4 = 1;
    if (it.id === 'meals_09') s.stats.luau++;
    this.noteEvent({ type: 'create_item', id: item.id, src });
  }

  // ------------------------------------------------------------------ rescue rules
  deadBoard(ctx = this.ctx) {
    const b = ctx.board;
    if (b.emptyCount() > 0 || ctx.tray.some(t => !t)) return false;
    const seen = new Set();
    for (let i = 0; i < b.n; i++) {
      const it = b.items[i];
      if (!it || seen.has(i) || it.f || this.data.isMax(it.id)) continue;
      const g = b.floodFill8(i, it.id);
      g.forEach(c => seen.add(c));
      if (g.length >= 2) return false; // carrying one more item completes a group (any generator spawn that matches)
    }
    return true;
  }

  // ------------------------------------------------------------------ time
  tick(dtMs = 0) {
    const s = this.s, now = this.now();
    s.playtime += dtMs / 1000;
    this.syncEnergy();
    this.tickStructs?.();
    this.tickLiving?.();
    this.tickGifts?.();
    this.tickTrade?.();
    this.tickIsland?.(dtMs);
    this.rolloverDays?.();
    s.savedAt = now;
  }
  initStructs() {
    for (const g of this.data.generators) {
      if (g.kind !== 'structure') continue;
      const bid = g.building;
      if (this.s.built[bid] && !this.s.structs[g.id]) this.s.structs[g.id] = { tier: 1, charges: this.chargeCap(g.id, 1), chargeAt: 0 };
    }
  }

  // ------------------------------------------------------------------ persistence
  serialize() {
    const b = this.home.board, items = [], obstacles = [], seen = new Set();
    for (let i = 0; i < b.n; i++) {
      const it = b.items[i];
      if (it) items.push({ i, id: it.id, ...(it.s ? { s: 1 } : {}), ...(it.sp ? { sp: it.sp } : {}), ...(it.f ? { f: 1 } : {}) });
      const o = b.obst[i];
      if (o && !seen.has(o.id)) { seen.add(o.id); obstacles.push({ type: o.type, x: o.x, y: o.y, hits: o.hits, ...(o.hidden ? { hidden: o.hidden } : {}) }); }
    }
    this.s.savedAt = this.now();
    return { schema: SCHEMA, savedAt: this.s.savedAt, state: this.s, home: { items, obstacles }, islandBoards: this.serializeIslands?.() || {} };
  }
}

export { dayKey, weekKey, itemId, parseItemId };
