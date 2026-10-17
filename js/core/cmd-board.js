// Board commands: drag/drop, merge resolution, generators, chests, obstacles, sell and store.
import { planMerge } from './merge.js';
import { parseItemId } from './util.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installBoardCommands(Game) {
  const P = Game.prototype;

  // ---------------------------------------------------------------- source helpers
  P.peek = function (src) {
    const ctx = this.ctx;
    if (src.type === 'board') return ctx.board.items[src.idx];
    if (src.type === 'tray') return ctx.tray[src.slot];
    if (src.type === 'overflow') return ctx.overflow[src.i];
    return null;
  };
  P.lift = function (src) {
    const ctx = this.ctx, it = this.peek(src);
    if (!it) return null;
    if (src.type === 'board') ctx.board.items[src.idx] = null;
    else if (src.type === 'tray') ctx.tray[src.slot] = null;
    else if (src.type === 'overflow') ctx.overflow.splice(src.i, 1);
    return it;
  };
  P.restore = function (src, item) {
    const ctx = this.ctx;
    if (src.type === 'board') ctx.board.items[src.idx] = item;
    else if (src.type === 'tray') ctx.tray[src.slot] = item;
    else if (src.type === 'overflow') ctx.overflow.splice(src.i, 0, item);
  };

  // ---------------------------------------------------------------- drop
  /** Drag `src` and drop it on board cell `to`. Returns {ok, ...}. On !ok the item is back where it started. */
  P.drop = function (src, to, opts = {}) {
    this.cascadeDepth = 0;
    const ctx = this.ctx, b = ctx.board, d = this.data;
    const item = this.peek(src);
    if (!item) return fail('empty');
    if (item.f) return fail('frozen');
    if (src.type === 'board' && src.idx === to) return { ok: true, noop: true };
    if (!b.inBounds(b.x(to), b.y(to)) || !b.isOpen(to)) return fail('locked');
    this.lift(src);
    const res = this.dropLifted(src, item, to, opts);
    if (!res.ok) this.restore(src, item);
    else { this.s.flags.moved = (this.s.flags.moved || 0) + 1; this.emit('moved', { src, to, item, ctx: ctx.id }); }
    return res;
  };

  P.dropLifted = function (src, item, to, opts) {
    const ctx = this.ctx, b = ctx.board, d = this.data;
    const ob = b.obst[to], st = b.struct[to], target = b.items[to];
    if (ctx.kind === 'island') { const pre = this.islandPreDrop(item, to, src, opts); if (pre) return pre; }
    if (ob) return this.clearObstacle(ob, item, opts);
    if (st) return this.dropOnStruct(st, item, to, opts);
    if (target) {
      if (target.id === item.id) {
        if (d.isMax(item.id)) return fail('maxLevel');
        const plan = planMerge(b, to, item, d);
        if (!plan) return fail('noGroup', { bounce: true });
        if (this.s.settings.confirmMerge && plan.size < 5 && !opts.confirmed) return fail('confirm', { confirm: 'merge', size: plan.size });
        return this.execMerge(ctx, plan, to, item);
      }
      // different identity: swap
      if (src.type === 'overflow') return fail('swapBlocked');
      b.items[to] = item;
      if (src.type === 'board') b.items[src.idx] = target; else ctx.tray[src.slot] = target;
      this.emit('swap', { a: src, to, ctx: ctx.id });
      return { ok: true, swapped: true, item };
    }
    // empty cell: just place it. Merging only happens when dropped onto an identical item.
    b.items[to] = item;
    return { ok: true, placed: true, idx: to };
  };

  // ---------------------------------------------------------------- merge
  P.execMerge = function (ctx, plan, dropIdx, carried) {
    const b = ctx.board, d = this.data, s = this.s;
    const resChain = d.item(plan.resultId);
    const picked = plan.picked.map(e => ({ idx: e.idx, item: e.item, virtual: e.virtual }));
    for (const idx of plan.pickedCells) b.items[idx] = null;
    b.items[dropIdx] = null;
    let sp = plan.sp;
    if (resChain.chain === 'pet' && resChain.level >= 3 && !sp) sp = this.rollPetSpecies();
    const result = { id: plan.resultId, s: 0, ...(sp ? { sp } : {}) };
    b.items[dropIdx] = result;
    const placed = [{ idx: dropIdx, item: result }];
    const bonus = [];
    for (const bo of plan.bonus) {
      const it = { id: bo.id, s: 0, ...(sp ? { sp } : {}) };
      const r = this.placeItem(it, dropIdx, ctx, 'merge');
      bonus.push({ item: it, where: r });
      if (r.where === 'board') placed.push({ idx: r.idx, item: it });
    }
    // rewards
    const level = resChain.level;
    let xp = this.mergeXp(level) * plan.count;
    if (plan.shimmerCount) {
      const coins = d.economy.merge.shimmerBonusCoinsPerLevel * level;
      this.addCoins(coins, 'shimmer');
      s.stats.shimmerMerged += plan.shimmerCount;
      this.emit('shimmerBonus', { idx: dropIdx, coins, count: plan.shimmerCount });
    }
    this.addXP(xp);
    s.stats.merges++;
    if (plan.size === 4) s.stats.merges4++;
    if (plan.size >= 5) s.stats.merges5++;
    const parsed = parseItemId(plan.seedId);
    const ev = this.emit('merge', { ctx: ctx.id, target: dropIdx, picked, result, bonus, size: plan.size, level, shimmer: plan.shimmerCount, cascade: this.cascadeDepth > 0, seed: plan.seedId });
    this.registerCreate(result, 'merge', ctx);
    for (const bo of bonus) this.registerCreate(bo.item, 'merge', ctx);
    this.noteEvent({ type: 'merge', chain: parsed.chain, size: plan.size, level });
    this.islandAfterMerge?.(ctx, plan);
    // a merge that hands out several items keeps them as they are (they would otherwise be eaten by an instant re-merge)
    if (plan.count === 1) for (const p of placed) this.cascades.push({ idx: p.idx, id: p.item.id, ctx: ctx.id });
    this.checkAchievements?.();
    return { ok: true, merged: true, size: plan.size, idx: dropIdx, result, event: ev };
  };

  P.rollPetSpecies = function () {
    const d = this.data, s = this.s;
    const free = d.pets.filter(p => !s.petsOwned.includes(p.id));
    const pool = free.length ? free : d.pets;
    return this.rng.pick(pool).id;
  };

  /** Resolve one pending cascade check. Returns true if a merge happened. */
  P.stepCascade = function () {
    const cap = this.data.economy.merge.cascadeCap;
    while (this.cascades.length) {
      const c = this.cascades.shift();
      if (this.cascadeDepth >= cap) { this.cascades.length = 0; return false; }
      const ctx = this.ctx.id === c.ctx ? this.ctx : null;
      if (!ctx) continue;
      const it = ctx.board.items[c.idx];
      if (!it || it.id !== c.id) continue;
      const plan = planMerge(ctx.board, c.idx, null, this.data);
      if (!plan) continue;
      this.cascadeDepth++;
      this.execMerge(ctx, plan, c.idx, null);
      return true;
    }
    return false;
  };
  P.settle = function () { let n = 0; while (this.cascades.length && n++ < 50) this.stepCascade(); };

  // ---------------------------------------------------------------- obstacles
  P.toolHint = function (def) {
    const d = this.data;
    if (def.hint) return def.hint;
    if (def.accepts?.chain === 'clearing_tools') return `Needs a ${d.name(`clearing_tools_${String(def.accepts.minLevel).padStart(2, '0')}`)} or better`;
    return 'Needs something else';
  };

  P.clearObstacle = function (ob, item, opts = {}) {
    const d = this.data, def = d.obstacleById[ob.type], ctx = this.ctx;
    if (!def.accepts) return fail('needItem', { hint: def.hint, bounce: true, obstacle: ob.type });
    if (!d.matches(item.id, def.accepts)) return fail('needTool', { hint: this.toolHint(def), obstacle: ob.type, bounce: true });
    const parsed = parseItemId(item.id);
    if (def.tool && def.accepts.chain === 'clearing_tools' && parsed.level >= def.accepts.minLevel + d.economy.clear.strongToolConfirmGap && !opts.confirmed)
      return fail('confirm', { confirm: 'strongTool', hint: 'This tool is stronger than needed' });
    ob.hits--;
    this.emit('hit', { obstacle: ob, item, hitsLeft: ob.hits, ctx: ctx.id });
    if (ob.hits > 0) return { ok: true, consumed: true, hit: true, hitsLeft: ob.hits };
    this.finishObstacle(ob, def, ctx);
    return { ok: true, consumed: true, cleared: true };
  };

  P.finishObstacle = function (ob, def, ctx = this.ctx, silent = false) {
    const b = ctx.board, d = this.data, s = this.s, eco = d.economy.clear;
    const cells = [];
    for (let j = 0; j < ob.h; j++) for (let i = 0; i < ob.w; i++) { const c = b.idx(ob.x + i, ob.y + j); if (b.obst[c] === ob) { b.obst[c] = null; cells.push(c); } }
    const anchor = cells[0];
    this.emit('cleared', { obstacle: ob, cells, ctx: ctx.id });
    if (ctx.kind === 'home') {
      const zn = d.cellZone[anchor];
      s.flags.cleared = s.flags.cleared || {};
      s.flags.cleared[zn] = (s.flags.cleared[zn] || 0) + 1;
    }
    s.stats.cleared++;
    this.addCoins(eco.coinsPerTier * def.tier, 'obstacle');
    this.addXP(d.economy.xp.obstacle * def.tier);
    // drops
    if (def.drops) {
      const n = this.rng.range(def.drops.count[0], def.drops.count[1]);
      for (let i = 0; i < n; i++) this.addItem(this.makeItem(this.rng.pick(def.drops.items)), anchor, 'obstacle', ctx);
    }
    if (ob.hidden) this.addItem(this.makeItem(ob.hidden), anchor, 'hidden', ctx);
    else if (!def.drops?.noHidden && ctx.kind === 'home' && def.tool) {
      if (this.rng.chance(eco.hiddenPrizeChance + this.perk('hiddenPrize'))) this.spillHiddenPrize(anchor, ctx);
    }
    if (def.reward?.item) this.addItem(this.makeItem(def.reward.item), anchor, 'obstacle', ctx);
    if (def.reward?.hiddenItems) for (let i = 0; i < def.reward.hiddenItems; i++) this.spillHiddenPrize(anchor, ctx);
    this.noteEvent({ type: 'clear_obstacle', obstacle: ob.type, special: !def.tool });
    this.islandAfterClear?.(ob, ctx);
    this.checkAchievements?.();
    this.noteState?.('cleared');
  };

  P.spillHiddenPrize = function (anchor, ctx = this.ctx) {
    const d = this.data;
    const kind = this.rng.weighted([{ k: 'item', weight: 60 }, { k: 'chest', weight: 25 }, { k: 'shard', weight: 15 }]).k;
    let id;
    if (kind === 'chest') id = 'chest_02';
    else if (kind === 'shard' && this.chainUnlocked('amulet')) id = 'amulet_03';
    else {
      const pool = this.itemPool(2, 4);
      id = pool.length ? this.rng.pick(pool) : 'banana_02';
    }
    this.emit('hiddenPrize', { anchor, item: id });
    this.addItem(this.makeItem(id), anchor, 'hidden', ctx);
  };

  /** Items of unlocked chains in a level range (used by hidden prizes and chests). */
  P.itemPool = function (min, max, { weightNeeded = false } = {}) {
    const d = this.data, out = [];
    for (const c of d.chains) {
      if (c.island || c.family === 'generator' || c.currency || c.chest || c.chain === 'supplies' || c.chain === 'dragon') continue;
      if (!this.chainUnlocked(c.chain)) continue;
      const cap = Math.max(1, Math.floor(c.levels * 0.7));
      const hi = Math.min(max, cap), lo = Math.min(min, hi);
      for (let L = lo; L <= hi; L++) out.push(`${c.chain}_${String(L).padStart(2, '0')}`);
    }
    return out;
  };

  // ---------------------------------------------------------------- generators
  P.generatorInfo = function (itemId_) {
    const p = parseItemId(itemId_);
    if (!p) return null;
    const gen = this.data.genById[p.chain];
    if (!gen) return null;
    return { gen, tier: p.level };
  };

  P.pickOutput = function (gen, tier, ctx) {
    const d = this.data;
    let outs = (gen.outputsByTier && gen.outputsByTier[tier]) || gen.outputs;
    if (ctx.kind === 'home') outs = outs.filter(o => this.chainUnlocked(parseItemId(o.item).chain));
    if (!outs.length) outs = gen.outputs.slice(0, 1);
    return this.rng.weighted(outs).item;
  };

  /** Core spawn used by portable generators (board items) and structure generators. */
  P.spawn = function (gen, tier, anchor, { cost = 'energy' } = {}) {
    const ctx = this.ctx, b = ctx.board, d = this.data, eco = d.economy;
    if (!b.nearestEmpty(anchor, 1).length) return fail('noSpace');
    if (cost === 'energy') { if (!this.spendEnergy(1)) return fail('noEnergy'); }
    this.s.stats.taps++;
    const tierDef = eco.generators.tiers[tier] || eco.generators.tiers[1];
    const out = [];
    const count = this.rng.chance(tierDef.doubleDrop) ? 2 : 1;
    for (let k = 0; k < count; k++) {
      let id = this.pickOutput(gen, tier, ctx);
      let p = parseItemId(id);
      if (this.rng.chance(tierDef.levelUp) && p.level < d.maxLevel(p.chain)) { p = { chain: p.chain, level: p.level + 1 }; id = `${p.chain}_${String(p.level).padStart(2, '0')}`; }
      const chain = d.chain(p.chain);
      let shimmerP = chain.shimmerChance > 0 && p.level <= eco.shimmer.maxSpawnLevel ? chain.shimmerChance + this.perk('shimmer') : 0;
      if (this.eventMod) shimmerP *= this.eventMod('shimmerMult');
      const it = this.makeItem(id, { s: shimmerP > 0 && this.rng.chance(shimmerP) });
      if (ctx.kind === 'island' && ctx.rule === 'frozen' && this.rng.chance(ctx.frozenRate || 0.2)) it.f = 1;
      if (k === 0 || b.nearestEmpty(anchor, 1).length) {
        this.registerCreate(it, 'generator', ctx);
        const r = this.placeItem(it, anchor, ctx, 'generator');
        out.push({ item: it, where: r });
      }
    }
    this.emit('spawn', { from: anchor, out, ctx: ctx.id });
    this.checkAchievements?.();
    return { ok: true, spawned: out };
  };

  P.tapGeneratorItem = function (idx) {
    const it = this.ctx.board.items[idx];
    const gi = this.generatorInfo(it.id);
    if (!gi) return fail('notGenerator');
    const free = this.ctx.kind !== 'home';
    if (free) return this.islandSpawn(gi.gen, gi.tier, idx);
    return this.spawn(gi.gen, gi.tier, idx, { cost: 'energy' });
  };

  // ---------------------------------------------------------------- tap
  P.tap = function (idx) {
    this.cascadeDepth = 0;
    const ctx = this.ctx, b = ctx.board, d = this.data;
    const it = b.items[idx];
    if (it) {
      const info = d.item(it.id);
      if (info.family === 'generator') return this.tapGeneratorItem(idx);
      const ch = d.chain(info.chain);
      if (ch.chest) return this.openChest(idx);
      if (ch.currency) return this.collectItem(idx);
      if (ch.amuletLevel === info.level) { b.items[idx] = null; this.addAmulets(1); this.emit('collect', { idx, item: it, kind: 'amulets', amount: 1 }); this.noteState?.('amulet'); return { ok: true, action: 'amulet' }; }
      if (ch.ticketLevel === info.level) { b.items[idx] = null; this.addTickets(1); this.emit('collect', { idx, item: it, kind: 'tickets', amount: 1 }); return { ok: true, action: 'ticket' }; }
      if (info.chain === 'pet' && info.level === 6) { b.items[idx] = null; return this.collectPet(it, idx); }
      return { ok: true, action: 'info', item: it };
    }
    const ob = b.obst[idx];
    if (ob) { const def = d.obstacleById[ob.type]; this.emit('obstacleTap', { obstacle: ob, hint: this.toolHint(def) }); return { ok: true, action: 'obstacle', obstacle: ob, hint: this.toolHint(def) }; }
    const st = b.struct[idx];
    if (st) return this.tapStruct(st, idx);
    return { ok: true, action: 'none' };
  };

  P.collectItem = function (idx) {
    const ctx = this.ctx, b = ctx.board, d = this.data;
    const it = b.items[idx], info = d.item(it.id), ch = d.chain(info.chain);
    const amount = info.collect;
    b.items[idx] = null;
    if (ch.currency === 'coins') this.addCoins(amount, 'item');
    else if (ch.currency === 'energy') this.addEnergy(amount);
    else if (ch.currency === 'pearls') this.addPearls(amount);
    this.noteEvent({ type: 'collect_currency', currency: ch.currency === 'energy' ? 'energy' : ch.currency, amount: ch.currency === 'coins' ? 0 : amount });
    this.emit('collect', { idx, item: it, kind: ch.currency, amount });
    this.checkAchievements?.();
    return { ok: true, action: 'collect', kind: ch.currency, amount };
  };

  P.collectPet = function (it, idx) {
    const s = this.s;
    const id = it.sp || this.rollPetSpecies();
    const dup = s.petsOwned.includes(id);
    if (!dup) { s.petsOwned.push(id); s.stats.pets = s.petsOwned.length; s.journal.pets.push(id); if (s.activePets.length < this.petSlots()) s.activePets.push(id); }
    else this.addCoins(200, 'pet-dup');
    this.emit('petCollected', { pet: id, dup, idx });
    this.checkAchievements?.();
    return { ok: true, action: 'pet', pet: id, dup };
  };

  // ---------------------------------------------------------------- chests
  P.neededChains = function () {
    const out = new Set(), d = this.data;
    for (const qid of this.s.quests.active) {
      const q = d.questById[qid];
      q.objectives.forEach((o, i) => {
        if ((o.type === 'deliver_item' || o.type === 'create_item') && (this.s.quests.progress[qid]?.[i] || 0) < (o.count || 1)) out.add(parseItemId(o.item).chain);
      });
    }
    return out;
  };

  P.openChest = function (idx) {
    const ctx = this.ctx, b = ctx.board, s = this.s;
    const it = b.items[idx];
    const table = this.data.chestTables[it.id];
    if (!table) return fail('noTable');
    b.items[idx] = null;
    s.stats.chestsOpened++;
    const out = this.rollChest(table, ctx);
    this.emit('chestOpened', { idx, chest: it, contents: out, ctx: ctx.id });
    for (const id of out) this.addItem(this.makeItem(id), idx, 'chest', ctx);
    this.checkAchievements?.();
    return { ok: true, action: 'chest', contents: out };
  };

  /** Roll the item ids a chest table yields (relics are granted on the spot). */
  P.rollChest = function (table, ctx = this.ctx) {
    const d = this.data;
    const out = [];
    const needed = this.neededChains();
    const pool = [];
    for (const c of d.chains) {
      if (c.island || c.family === 'generator' || c.currency || c.chest || c.chain === 'supplies' || c.chain === 'dragon') continue;
      if (ctx.kind === 'home' && !this.chainUnlocked(c.chain)) continue;
      const cap = Math.max(1, Math.floor(c.levels * 0.7));
      const hi = Math.min(table.maxLevel, cap), lo = Math.min(table.minLevel, hi);
      for (let L = lo; L <= hi; L++) pool.push({ id: `${c.chain}_${String(L).padStart(2, '0')}`, weight: needed.has(c.chain) ? 1.4 : 1 });
    }
    if (!pool.length) pool.push({ id: 'banana_02', weight: 1 });
    for (let i = 0; i < table.count; i++) out.push(this.rng.weighted(pool).id);
    // weighted extras
    const extras = table.extras.map(([id, w, n]) => ({ id, weight: w, n }));
    for (let k = 0; k < table.picks; k++) {
      const e = this.rng.weighted(extras);
      if (!e.id) continue;
      if (e.id === 'relic') { const r = this.findRelic(); if (r) this.emit('relic', { relic: r }); else this.addCoins(300, 'relic-dup'); continue; }
      if (e.id.startsWith('amulet') && !this.chainUnlocked('amulet')) continue;
      for (let j = 0; j < e.n; j++) out.push(e.id);
    }
    return out;
  };

  P.findRelic = function () {
    const s = this.s, d = this.data;
    const left = d.relics.map((n, i) => i).filter(i => !s.journal.relics.includes(i));
    if (!left.length) return null;
    const i = this.rng.pick(left);
    s.journal.relics.push(i);
    s.stats.relics = s.journal.relics.length;
    this.checkAchievements?.();
    return { index: i, name: d.relics[i] };
  };

  // ---------------------------------------------------------------- sell / store
  P.sell = function (src, opts = {}) {
    const d = this.data, ctx = this.ctx;
    const it = this.peek(src);
    if (!it) return fail('empty');
    const info = d.item(it.id), ch = d.chain(info.chain);
    if (!ch.sellable || !info.sellValue) return fail('notSellable');
    if (info.level >= d.economy.sell.confirmFromLevel && !opts.confirmed) return fail('confirm', { confirm: 'sell', value: info.sellValue });
    this.lift(src);
    this.addCoins(info.sellValue, 'sell');
    this.s.stats.sold++;
    this.emit('sold', { item: it, coins: info.sellValue, src });
    return { ok: true, coins: info.sellValue };
  };

  P.store = function (src) {
    const ctx = this.ctx;
    const slot = ctx.tray.findIndex(t => !t);
    if (slot < 0) return fail('trayFull');
    const it = this.peek(src);
    if (!it) return fail('empty');
    if (src.type === 'tray') return fail('already');
    this.lift(src);
    ctx.tray[slot] = it;
    this.emit('stored', { slot, item: it, from: src, ctx: ctx.id });
    return { ok: true, slot };
  };

  /** Take a gift bubble / overflow bubble onto the board. */
  P.popOverflow = function (i, anchor) {
    const ctx = this.ctx, it = ctx.overflow[i];
    if (!it) return fail('empty');
    const cells = ctx.board.nearestEmpty(anchor ?? this.anchorCell(), 1);
    if (!cells.length) return fail('noSpace');
    ctx.overflow.splice(i, 1);
    ctx.board.items[cells[0]] = it;
    this.emit('place', { idx: cells[0], item: it, from: anchor, src: 'overflow', ctx: ctx.id });
    return { ok: true, idx: cells[0] };
  };

  P.buyStorageSlot = function (usePearls = false) {
    const s = this.s, eco = this.data.economy.storage;
    if (s.storageSlots >= eco.max) return fail('max');
    const bought = s.flags.slotsBought || 0, cost = eco.slotCost * (bought + 1);
    if (usePearls) { if (!this.spendPearls(Math.max(5, Math.round(cost / 20)))) return fail('noPearls'); }
    else if (!this.spendCoins(cost)) return fail('noCoins', { cost });
    s.flags.slotsBought = bought + 1;
    s.storageSlots++; s.storage.push(null);
    this.emit('storageSlots', { slots: s.storageSlots });
    return { ok: true, cost };
  };
  P.perkStorage = function () { let v = 0; for (const id of Object.keys(this.s.built)) { const b = this.data.buildingById[id]; if (b?.perk?.storage) v += b.perk.storage; } return v; };
}
