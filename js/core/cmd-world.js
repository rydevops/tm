// World commands: structures, build sites, zones and pockets, living items, trade dock, eating, daily payouts.
import { parseItemId, dayNumber, hashStr, clamp } from './util.js';

const HOUR = 3600 * 1000;
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installWorldCommands(Game) {
  const P = Game.prototype;

  // ---------------------------------------------------------------- struct taps and drops
  P.generatorOfBuilding = function (bldId) { return this.data.generators.find(g => g.building === bldId) || null; };

  P.structAnchor = function (st) { const b = this.ctx.board; return b.idx(st.x + (st.w >> 1), st.y + st.h - 1); };

  P.tapStruct = function (st, idx) {
    const d = this.data;
    if (st.kind === 'gift') return this.openGift(st);
    if (st.kind === 'site') { this.emit('openBuild', { building: st.id }); return { ok: true, action: 'build', building: st.id }; }
    if (st.kind === 'resident') { if (!st.arrived && !this.s.arrived.includes(st.id)) return { ok: true, action: 'none' }; this.emit('openResident', { id: st.id }); return { ok: true, action: 'resident', id: st.id }; }
    if (st.kind === 'soil' || st.kind === 'perch') {
      const lv = this.s.living.find(l => l.slot === st.id);
      if (lv) return this.collectLiving(st.id);
      this.emit('openLiving', { slot: st.id, kind: st.kind }); return { ok: true, action: 'livingInfo' };
    }
    if (st.kind === 'building') {
      const def = d.buildingById[st.id];
      const gen = this.generatorOfBuilding(st.id);
      if (gen && gen.kind === 'structure' && this.s.structs[gen.id]) return this.tapStructGenerator(gen, st);
      if (def.tradeDock) { this.emit('openTrade', {}); return { ok: true, action: 'trade' }; }
      if (def.harbor) { this.emit('openHarbor', {}); return { ok: true, action: 'harbor' }; }
      if (def.museum) { this.emit('openMuseum', {}); return { ok: true, action: 'museum' }; }
      if (def.temple) { this.emit('openTemple', {}); return { ok: true, action: 'temple' }; }
      if (st.id === 'bld_cottage') { this.emit('openCottage', {}); return { ok: true, action: 'cottage' }; }
      if (def.daily) return this.collectBuildingDaily(st.id);
      this.emit('openBuilding', { building: st.id });
      return { ok: true, action: 'building' };
    }
    return { ok: true, action: 'none' };
  };

  P.dropOnStruct = function (st, item, idx, opts) {
    const d = this.data, info = d.item(item.id);
    if (st.kind === 'resident') {
      if (!this.s.arrived.includes(st.id)) return fail('noOne', { bounce: true });
      return this.deliverToResident(st.id, item);
    }
    if (st.kind === 'site' || st.kind === 'building') {
      const def = d.buildingById[st.id];
      if (st.kind === 'building' && def.tradeDock) return this.sellAtStall(item);
      if (st.kind === 'building' && def.eats) {
        if (info.chain === 'meals' && info.level >= d.economy.eat.minLevel) return this.eatMeal(item);
      }
      const r = this.deliverToProject(st.id, item);
      if (r.ok) return r;
      return r;
    }
    if (st.kind === 'soil' || st.kind === 'perch') return this.placeLiving(item, st);
    return fail('blocked', { bounce: true });
  };

  // ---------------------------------------------------------------- structure generators and charges
  P.chargeCap = function (genId, tier) {
    const g = this.data.genById[genId];
    if (!g || !g.charges) return 0;
    let cap = g.charges[tier - 1];
    if (['gen_hen', 'gen_cow', 'gen_goat'].includes(genId)) cap += this.perk('chargeCap');
    return cap;
  };
  P.chargeIntervalMs = function (genId, tier) { return this.data.genById[genId].rechargeMin[tier - 1] * 60000; };

  P.tickStructs = function () {
    const now = this.now();
    for (const g of this.data.generators) {
      const st = this.s.structs[g.id];
      if (!st || g.cost !== 'charge') continue;
      const cap = this.chargeCap(g.id, st.tier), step = this.chargeIntervalMs(g.id, st.tier);
      if (st.charges >= cap) { st.chargeAt = 0; continue; }
      if (!st.chargeAt) st.chargeAt = now + step;
      while (st.charges < cap && now >= st.chargeAt) { st.charges++; st.chargeAt += step; }
      if (st.charges >= cap) st.chargeAt = 0;
    }
  };
  P.chargeInfo = function (genId) {
    const st = this.s.structs[genId]; if (!st) return null;
    this.tickStructs();
    const cap = this.chargeCap(genId, st.tier);
    return { charges: st.charges, cap, seconds: st.chargeAt ? Math.max(0, Math.ceil((st.chargeAt - this.now()) / 1000)) : 0, tier: st.tier };
  };

  P.tapStructGenerator = function (gen, st) {
    this.cascadeDepth = 0;
    const state = this.s.structs[gen.id];
    const anchor = this.structAnchor(st);
    if (gen.cost === 'charge') {
      this.tickStructs();
      if (state.charges <= 0) return fail('noCharges', { seconds: Math.max(0, Math.ceil((state.chargeAt - this.now()) / 1000)) });
      const r = this.spawn(gen, state.tier, anchor, { cost: 'none' });
      if (r.ok) {
        const wasFull = state.charges >= this.chargeCap(gen.id, state.tier);
        state.charges--;
        if (wasFull || !state.chargeAt) state.chargeAt = this.now() + this.chargeIntervalMs(gen.id, state.tier);
        r.charges = state.charges;
      }
      return r;
    }
    return this.spawn(gen, state.tier, anchor, { cost: 'energy' });
  };

  // ---------------------------------------------------------------- build sites and upgrade projects
  P.projectFor = function (bldId) {
    const d = this.data, def = d.buildingById[bldId];
    if (!def) return null;
    if (!this.s.built[bldId]) return { key: bldId, kind: 'build', items: def.items, coins: def.coins, name: def.name };
    const gen = this.generatorOfBuilding(bldId);
    if (gen && gen.upgrades) {
      const st = this.s.structs[gen.id];
      if (st && st.tier < 3) { const up = gen.upgrades[st.tier - 1]; return { key: `${gen.id}:up${st.tier + 1}`, kind: 'upgrade', items: up.items, coins: up.coins, name: `${def.name} tier ${st.tier + 1}`, gen: gen.id }; }
    }
    return null;
  };
  P.projectFill = function (key) { return this.s.siteFill[key] || (this.s.siteFill[key] = {}); };
  P.projectReady = function (proj) {
    const fill = this.projectFill(proj.key);
    return proj.items.every(r => (fill[r.item] || 0) >= r.count);
  };

  P.deliverToProject = function (bldId, item) {
    const proj = this.projectFor(bldId);
    if (!proj) return fail('nothingNeeded', { bounce: true });
    const fill = this.projectFill(proj.key);
    const req = proj.items.find(r => r.item === item.id && (fill[r.item] || 0) < r.count);
    if (!req) return fail('notNeeded', { bounce: true, hint: 'Not needed here' });
    fill[item.id] = (fill[item.id] || 0) + 1;
    this.emit('projectFill', { building: bldId, item: item.id, fill: fill[item.id], need: req.count });
    return { ok: true, consumed: true, delivered: true };
  };

  /** Pull matching items from the board and tray straight into a project (used by the "Fill" button). */
  P.autoFillProject = function (bldId) {
    const proj = this.projectFor(bldId); if (!proj) return fail('nothingNeeded');
    const ctx = this.ctx, b = ctx.board, fill = this.projectFill(proj.key);
    let moved = 0;
    for (const req of proj.items) {
      while ((fill[req.item] || 0) < req.count) {
        const src = this.findItem(req.item);
        if (!src) break;
        this.lift(src); fill[req.item] = (fill[req.item] || 0) + 1; moved++;
        this.emit('projectFill', { building: bldId, item: req.item, fill: fill[req.item], need: req.count });
      }
    }
    return { ok: true, moved };
  };

  /** Locate one item by id on the board or in the tray; prefers the tray so the board stays tidy. */
  P.findItem = function (id, skip = null) {
    const ctx = this.ctx;
    for (let i = 0; i < ctx.tray.length; i++) if (ctx.tray[i]?.id === id && !(skip && skip.has(`t${i}`))) return { type: 'tray', slot: i };
    for (let i = 0; i < ctx.board.n; i++) { const it = ctx.board.items[i]; if (it && it.id === id && !it.f && !(skip && skip.has(`b${i}`))) return { type: 'board', idx: i }; }
    return null;
  };
  P.countItem = function (id) {
    const ctx = this.ctx; let n = 0;
    for (const t of ctx.tray) if (t?.id === id) n++;
    for (const it of ctx.board.items) if (it && it.id === id && !it.f) n++;
    return n;
  };

  /** Build (or upgrade) once the site is filled and the coins are there. `opts.free` (developer testing) skips both. */
  P.build = function (bldId, opts = {}) {
    const d = this.data, s = this.s;
    const proj = this.projectFor(bldId);
    if (!proj) return fail('nothing');
    if (!opts.free) {
      if (!this.projectReady(proj)) return fail('missing');
      if (proj.coins && s.player.coins < proj.coins) return fail('noCoins', { need: proj.coins });
      if (proj.coins) this.spendCoins(proj.coins);
    }
    delete s.siteFill[proj.key];
    if (proj.kind === 'upgrade') {
      const st = s.structs[proj.gen]; st.tier++; st.charges = this.chargeCap(proj.gen, st.tier);
      this.emit('upgraded', { building: bldId, generator: proj.gen, tier: st.tier });
      this.addXP(d.economy.xp.build / 2);
      return { ok: true, upgraded: true, tier: st.tier };
    }
    s.built[bldId] = true;
    s.stats.built++;
    const def = d.buildingById[bldId];
    if (def.perk?.storage) { for (let i = 0; i < def.perk.storage; i++) s.storage.push(null); s.storageSlots += def.perk.storage; }
    this.rebuildStructures();
    this.initStructs();
    this.addXP(d.economy.xp.build);
    this.emit('built', { building: bldId });
    this.noteEvent({ type: 'build', building: bldId });
    this.noteState?.('build');
    this.checkAchievements?.();
    return { ok: true, built: true };
  };

  // ---------------------------------------------------------------- zones and pockets
  P.nextZone = function () { return Math.max(...this.s.zones.unlocked) + 1; };
  P.zoneRequirements = function (n) {
    const d = this.data, z = d.zoneByN[n], s = this.s;
    if (!z) return null;
    const prev = d.zoneByN[n - 1];
    const cleared = s.flags.cleared?.[n - 1] || 0;
    const base = prev ? prev.obstacleBase : 0;
    const pct = base ? Math.min(1, cleared / base) : 1;
    return {
      zone: z, level: z.unlock.level, amulets: z.unlock.amulets, coins: z.unlock.coins, clearedPct: z.unlock.clearedPct,
      haveLevel: s.player.level >= z.unlock.level, haveAmulets: s.player.amulets >= z.unlock.amulets,
      haveCoins: s.player.coins >= z.unlock.coins, pct, haveCleared: pct >= z.unlock.clearedPct,
      isNext: n === this.nextZone()
    };
  };
  /** Open the next zone when its requirements are met. `opts.force` (developer testing) skips the requirements and the payment. */
  P.unlockZone = function (n, opts = {}) {
    const s = this.s, d = this.data;
    const r = this.zoneRequirements(n);
    if (!r || !r.isNext) return fail('notNext');
    if (!opts.force) {
      if (!r.haveLevel) return fail('level');
      if (!r.haveAmulets) return fail('amulets');
      if (!r.haveCleared) return fail('cleared');
      if (!r.haveCoins) return fail('coins');
      this.spendCoins(r.coins);
      s.player.amulets -= r.amulets; s.player.amuletsSpent += r.amulets;
    }
    s.zones.unlocked.push(n);
    s.stats.zones = s.zones.unlocked.length;
    this.rebuildFog();
    this.syncChains();
    const z = r.zone;
    if (z.resident && !s.arrived.includes(z.resident)) { s.arrived.push(z.resident); this.rebuildStructures(); this.emit('arrive', { id: z.resident, line: d.t(`res.${z.resident}.arrive`, '') }); }
    this.giveZoneGifts(n);
    this.emit('zoneUnlocked', { zone: n, rect: z.rect, name: z.name });
    this.noteEvent({ type: 'unlock_zone', zone: n });
    this.noteState?.('zone');
    this.checkAchievements?.();
    return { ok: true, zone: n };
  };

  /**
   * Hand out the generators a zone brings (zones.json `gifts`, e.g. the Garden Plot in zone 3) once per zone. A player who already
   * owns one of that generator, at any tier, is not given another. Also run on load, so saves that opened the zone before gifts
   * existed get theirs.
   */
  P.giveZoneGifts = function (n) {
    const s = this.s, d = this.data, z = d.zoneByN[n];
    const given = s.flags.zoneGifts || (s.flags.zoneGifts = {});
    if (!z?.gifts?.length || given[n]) return 0;
    given[n] = 1;
    const home = this.home, owned = chain => [...home.board.items, ...home.tray, ...home.overflow].some(it => it && parseItemId(it.id).chain === chain);
    const anchor = (z.resident && this.residentCell(z.resident)) ?? this.anchorCell(home);
    let count = 0;
    for (const id of z.gifts) {
      if (owned(parseItemId(id).chain)) continue;
      this.addItem(this.makeItem(id), anchor, 'zone', home); count++;
      this.emit('zoneGift', { zone: n, item: id });
    }
    return count;
  };
  P.giveAllZoneGifts = function () { for (const n of this.s.zones.unlocked) this.giveZoneGifts(n); };

  P.openPocket = function () {
    const s = this.s, b = this.home.board;
    const p = s.zones.pockets.find(p => !p.open && s.zones.unlocked.includes(p.zone));
    if (!p) return null;
    p.open = true; s.zones.pocketsOpen++;
    for (const [x, y] of p.cells) b.fog[b.idx(x, y)] = 0;
    this.emit('pocketOpened', { cells: p.cells.map(([x, y]) => b.idx(x, y)), zone: p.zone });
    return p;
  };

  // ---------------------------------------------------------------- residents
  P.residentCell = function (id) { const b = this.home.board; for (let i = 0; i < b.n; i++) { const st = b.struct[i]; if (st && st.kind === 'resident' && st.id === id) return i; } return null; };

  P.deliverToResident = function (resId, item) {
    const d = this.data, s = this.s;
    const ok = this.wantsDelivery(resId, item.id);
    if (!ok) {
      const other = this.whoWants(item.id);
      return fail('notWanted', { bounce: true, hint: other ? `${d.residentById[other].name} wants this` : `${d.residentById[resId]?.name || 'They'} doesn't need this` });
    }
    s.stats.delivered++;
    this.emit('delivered', { resident: resId, item });
    this.noteEvent({ type: 'deliver', id: item.id, giver: resId });
    return { ok: true, consumed: true, delivered: true };
  };
  P.wantsDelivery = function (resId, id) {
    const d = this.data, s = this.s;
    for (const qid of s.quests.active) {
      const q = d.questById[qid];
      if (q.giver !== resId) continue;
      for (let i = 0; i < q.objectives.length; i++) {
        const o = q.objectives[i];
        if (o.type === 'deliver_item' && o.item === id && (s.quests.progress[qid]?.[i] || 0) < o.count) return true;
      }
    }
    if (s.requests.list.some(r => !r.done && r.res === resId && r.item === id && r.have < r.count)) return true;
    for (const t of [...s.daily.tasks, ...s.weekly.tasks]) if (!t.done && t.obj.type === 'deliver_item' && t.obj.item === id) return true;
    return false;
  };
  P.whoWants = function (id) {
    const d = this.data, s = this.s;
    for (const qid of s.quests.active) {
      const q = d.questById[qid];
      for (let i = 0; i < q.objectives.length; i++) { const o = q.objectives[i]; if (o.type === 'deliver_item' && o.item === id && (s.quests.progress[qid]?.[i] || 0) < o.count) return q.giver; }
    }
    return null;
  };

  // ---------------------------------------------------------------- living items (the farm)
  P.livingDefFor = function (id) { return this.data.living.find(l => l.item === id); };
  P.placeLiving = function (item, st) {
    const s = this.s, d = this.data;
    const def = this.livingDefFor(item.id);
    if (!def) return fail('notLiving', { bounce: true, hint: st.kind === 'soil' ? 'Only a top-level farm item can be planted here' : 'Needs its matching top-level animal' });
    const slotKind = st.kind === 'soil' ? 'soil' : st.slot;
    if (def.slot !== slotKind) return fail('wrongSlot', { bounce: true, hint: def.slot === 'soil' ? 'Plant it in Fertile Soil' : `Needs the ${def.slot} perch` });
    if (s.living.some(l => l.slot === st.id)) return fail('occupied', { bounce: true });
    const interval = (def.everyHours || def.coinsEveryHours) * HOUR;
    s.living.push({ item: item.id, slot: st.id, readyAt: this.now() + interval, stored: 0 });
    s.stats.livingPlaced = new Set(s.living.map(l => l.item)).size;
    if (!s.journal.living.includes(item.id)) s.journal.living.push(item.id);
    this.emit('livingPlaced', { slot: st.id, item: item.id, def });
    this.noteEvent({ type: 'place_living_item', item: item.id });
    this.checkAchievements?.();
    return { ok: true, consumed: true, living: true };
  };
  P.tickLiving = function () {
    const now = this.now();
    for (const l of this.s.living) {
      const def = this.livingDefFor(l.item);
      const step = (def.everyHours || def.coinsEveryHours) * HOUR;
      while (l.stored < def.store && now >= l.readyAt) { l.stored++; l.readyAt += step; }
      if (l.stored >= def.store) l.readyAt = now + step;
    }
  };
  P.collectLiving = function (slot) {
    const l = this.s.living.find(x => x.slot === slot);
    if (!l) return fail('empty');
    this.tickLiving();
    const def = this.livingDefFor(l.item);
    if (l.stored <= 0) return { ok: true, action: 'livingWait', seconds: Math.max(0, Math.ceil((l.readyAt - this.now()) / 1000)) };
    const wasFull = l.stored >= def.store;
    const n = l.stored; l.stored = 0;
    if (wasFull) l.readyAt = this.now() + (def.everyHours || def.coinsEveryHours) * HOUR;
    const b = this.ctx.board;
    let anchor = this.defaultAnchor();
    for (let i = 0; i < b.n; i++) { const st = b.struct[i]; if (st && st.id === slot) { anchor = i; break; } }
    if (def.coins) this.addCoins(def.coins * n, 'dragon');
    else for (let i = 0; i < n * (def.count || 1); i++) this.addItem(this.makeItem(def.produces), anchor, 'farm');
    this.emit('livingCollected', { slot, n });
    return { ok: true, action: 'living', n };
  };

  // ---------------------------------------------------------------- eat at the hearth
  P.eatMeal = function (item) {
    const info = this.data.item(item.id), eco = this.data.economy.eat;
    const gain = eco.baseEnergy * Math.pow(2, info.level - eco.minLevel);
    this.addEnergy(gain);
    this.s.stats.eaten++;
    this.emit('ate', { item, energy: gain });
    this.checkAchievements?.();
    return { ok: true, consumed: true, energy: gain };
  };

  // ---------------------------------------------------------------- building daily payouts
  P.collectBuildingDaily = function (bldId) {
    const def = this.data.buildingById[bldId], s = this.s, now = this.now();
    const last = s.daily_collect[bldId] || 0;
    if (now - last < 24 * HOUR) { this.emit('payoutWait', { building: bldId, seconds: Math.ceil((last + 24 * HOUR - now) / 1000) }); return { ok: true, action: 'wait', seconds: Math.ceil((last + 24 * HOUR - now) / 1000) }; }
    s.daily_collect[bldId] = now;
    this.addCoins(def.daily.coins, 'payout');
    this.emit('payout', { building: bldId, coins: def.daily.coins });
    return { ok: true, action: 'payout', coins: def.daily.coins };
  };
  P.payoutReady = function (bldId) { return this.s.built[bldId] && this.now() - (this.s.daily_collect[bldId] || 0) >= 24 * HOUR; };

  // ---------------------------------------------------------------- trade dock
  P.tradeTier = function () { const z = Math.max(...this.s.zones.unlocked); return z >= 10 ? 3 : z >= 6 ? 2 : 1; };
  P.marketOpen = function () { return !!this.s.built.bld_market_stall; };
  P.dailyFactor = function (category, dayOffset = 0) {
    const [lo, hi] = this.data.economy.trade.dailyFactor;
    const dn = dayNumber(this.now()) + dayOffset;
    const h = hashStr(`${this.s.rngSeed}:${category}:${dn}`) / 4294967296;
    return lo + (hi - lo) * h;
  };
  P.factorTrend = function (category) { const a = this.dailyFactor(category, 0), b = this.dailyFactor(category, -1); return a > b + 0.005 ? 1 : a < b - 0.005 ? -1 : 0; };
  P.marketUnit = function (id) {
    const d = this.data, it = d.item(id), ch = d.chain(it.chain), eco = d.economy.trade;
    if (!ch.sellable) return 0;
    const cat = ch.tradeCategory || 'craft';
    return it.sellValue * (eco.categoryMult[cat] || 1) * this.dailyFactor(cat) * (1 + this.perk('tradePrice'));
  };
  P.bulkBonus = function (count) {
    const eco = this.data.economy.trade, tier = eco.tiers[this.tradeTier()];
    let bonus = 0;
    for (const [n, b] of eco.bulk) if (count >= n) bonus = b;
    return bonus ? bonus + tier.bulkBonus : 0;
  };
  P.marketQuote = function (id, count) { const unit = this.marketUnit(id); const bonus = this.bulkBonus(count); return { unit, bonus, total: Math.round(unit * count * (1 + bonus)) }; };
  P.sellAtStall = function (item) {
    if (!this.marketOpen()) return fail('noMarket', { bounce: true });
    const q = this.marketQuote(item.id, 1);
    if (!q.unit) return fail('notSellable', { bounce: true });
    this.addCoins(Math.round(q.unit), 'market');
    this.s.stats.sold++;
    this.emit('sold', { item, coins: Math.round(q.unit), market: true });
    return { ok: true, consumed: true, coins: Math.round(q.unit) };
  };
  P.inventory = function () {
    const ctx = this.ctx, map = new Map();
    const add = it => { if (!it || it.f) return; const m = map.get(it.id) || { id: it.id, count: 0 }; m.count++; map.set(it.id, m); };
    for (const it of ctx.board.items) add(it);
    for (const it of ctx.tray) add(it);
    return map;
  };
  P.sellStack = function (id, count) {
    if (!this.marketOpen()) return fail('noMarket');
    const have = this.countItem(id);
    count = Math.min(count, have);
    if (count <= 0) return fail('none');
    const q = this.marketQuote(id, count);
    if (!q.unit) return fail('notSellable');
    for (let i = 0; i < count; i++) { const src = this.findItem(id); this.lift(src); }
    this.addCoins(q.total, 'market');
    this.s.stats.sold += count;
    this.emit('soldStack', { id, count, coins: q.total });
    this.checkAchievements?.();
    return { ok: true, coins: q.total, count };
  };

  const MERCHANTS = ['Captain Rook', 'Auntie Mele', 'Old Pedro', 'Miss Nalani', 'Chef Bao', 'Sailor Jun', 'Mr. Pelican', 'Lulu the Florist'];
  P.tradeSlots = function () { return this.data.economy.trade.tiers[this.tradeTier()].slots; };
  P.newOrder = function () {
    const d = this.data, rng = this.rng, now = this.now();
    const chainsOk = d.chains.filter(c => c.sellable && !c.island && c.family !== 'generator' && this.chainUnlocked(c.chain) && c.chain !== 'dragon' && c.chain !== 'pet' && c.chain !== 'amulet' && c.chain !== 'clearing_tools');
    if (!chainsOk.length) return null;
    const lines = rng.range(1, 2), items = [];
    let total = 0;
    for (let i = 0; i < lines; i++) {
      const c = rng.pick(chainsOk);
      const cap = Math.max(2, Math.floor(c.levels * 0.7));
      const lvl = rng.range(2, Math.min(5, cap));
      const id = `${c.chain}_${String(lvl).padStart(2, '0')}`;
      if (items.some(x => x.item === id)) continue;
      const count = Math.max(2, rng.range(2, lvl <= 3 ? 8 : 4));
      items.push({ item: id, count });
      total += d.sellValue(id) * count;
    }
    return { id: `o${now}_${rng.int(1e6)}`, merchant: rng.pick(MERCHANTS), items, reward: Math.round(total * d.economy.trade.orderMult), expiresAt: now + d.economy.trade.orderExpireSec * 1000 };
  };
  P.tickTrade = function () {
    if (!this.marketOpen()) return;
    const t = this.s.trade, now = this.now(), slots = this.tradeSlots();
    let expired = 0;
    t.orders = t.orders.filter(o => { if (o.expiresAt > now) return true; expired++; return false; });
    for (let i = 0; i < expired; i++) { const o = this.newOrder(); if (o) t.orders.push(o); }
    const due = t.nextSlotAt.filter(x => x <= now).length;
    t.nextSlotAt = t.nextSlotAt.filter(x => x > now);
    for (let i = 0; i < due; i++) { const o = this.newOrder(); if (o) t.orders.push(o); }
    while (t.orders.length + t.nextSlotAt.length < slots) { const o = this.newOrder(); if (!o) break; t.orders.push(o); }
  };
  P.canFillOrder = function (o) { return o.items.every(r => this.countItem(r.item) >= r.count); };
  P.fulfillOrder = function (orderId) {
    const t = this.s.trade, i = t.orders.findIndex(o => o.id === orderId);
    if (i < 0) return fail('gone');
    const o = t.orders[i];
    if (!this.canFillOrder(o)) return fail('missing');
    for (const r of o.items) for (let k = 0; k < r.count; k++) this.lift(this.findItem(r.item));
    t.orders.splice(i, 1);
    t.nextSlotAt.push(this.now() + this.data.economy.trade.orderRefillSec * 1000);
    t.filled++;
    this.s.stats.orders++;
    this.addCoins(o.reward, 'order');
    let chest = false;
    if (t.filled % this.data.economy.trade.chestEvery === 0) { this.addItem(this.makeItem('chest_02'), null, 'order'); chest = true; }
    this.emit('orderDone', { order: o, chest });
    this.checkAchievements?.();
    return { ok: true, coins: o.reward, chest };
  };
}
