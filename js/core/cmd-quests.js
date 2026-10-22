// Quests, daily/weekly challenges, resident requests, achievements, login rewards, shop, refills, gifts and live events.
import { parseItemId, dayKey, weekKey, dayNumber, clamp, itemId } from './util.js';

const HOUR = 3600 * 1000, DAY = 24 * HOUR;
const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function installQuestCommands(Game) {
  const P = Game.prototype;

  // ---------------------------------------------------------------- objective helpers
  P.objTarget = function (o) {
    switch (o.type) {
      case 'build': case 'unlock_zone': case 'reach_level': case 'island_complete': case 'sun_gate': case 'island_goal': return 1;
      case 'spend_energy': return o.amount;
      case 'collect_currency': return o.amount;
      default: return o.count || 1;
    }
  };
  P.objStateBased = function (o) { return ['build', 'unlock_zone', 'reach_level', 'island_complete', 'sun_gate'].includes(o.type); };
  P.objSatisfied = function (o) {
    const s = this.s;
    switch (o.type) {
      case 'build': return !!s.built[o.building];
      case 'unlock_zone': return s.zones.unlocked.includes(o.zone);
      case 'reach_level': return s.player.level >= o.level;
      case 'island_complete': return s.islands[o.island]?.state === 'done';
      case 'sun_gate': return !!s.flags.sunGateOpen;
      default: return false;
    }
  };
  P.objectiveText = function (o) {
    const d = this.data, n = o.count || 1;
    switch (o.type) {
      case 'create_item': return `Create ${n > 1 ? n + '× ' : ''}${d.name(o.item)}`;
      case 'deliver_item': return `Deliver ${n > 1 ? n + '× ' : ''}${d.name(o.item)}`;
      case 'clear_obstacle': return o.obstacle && o.obstacle !== 'any' ? `Clear ${n} ${d.obstacleById[o.obstacle]?.name || o.obstacle}` : `Clear ${n} obstacles`;
      case 'clear_special': return `Open ${n} ${d.obstacleById[o.obstacle]?.name || o.obstacle}`;
      case 'build': return `Build the ${d.buildingById[o.building]?.name || o.building}`;
      case 'merge_count': return `Perform ${n} merges`;
      case 'merge_bonus': return `Do ${n} merge${n > 1 ? 's' : ''} of ${o.size}+ items`;
      case 'reach_level': return `Reach level ${o.level}`;
      case 'spend_energy': return `Spend ${o.amount} energy`;
      case 'collect_currency': return `Collect ${o.amount} ${o.currency}`;
      case 'place_living_item': return `Place ${d.name(o.item)} on the farm`;
      case 'visit_island': return `Visit ${d.islandById[o.island]?.name || 'an island'}`;
      case 'island_complete': return `Complete ${d.islandById[o.island]?.name || 'the island'}`;
      case 'unlock_zone': return `Open ${d.zoneByN[o.zone].name}`;
      case 'sun_gate': return 'Open the Sun Gate with six Island Amulets';
      case 'create_level': return `Create ${n} items of level ${o.minLevel}+`;
      case 'requests_done': return `Complete ${n} resident requests`;
      case 'fill_pool': return `Fill ${n} tide pool${n > 1 ? 's' : ''}`;
      case 'use_item': return `Use ${d.name(o.item)}`;
      case 'thaw': return `Thaw ${n} frozen items`;
      case 'sugar_rush': return `Fill the Sugar Rush meter ${n}×`;
      case 'light_area': return `Light ${n} dark areas`;
      default: return o.type;
    }
  };

  P.objInc = function (o, ev, giver) {
    switch (o.type) {
      case 'create_item': { if (ev.type !== 'create_item') return 0; const p = parseItemId(ev.id), q = parseItemId(o.item); return p.chain === q.chain && p.level >= q.level ? 1 : 0; }
      case 'create_level': { if (ev.type !== 'create_item') return 0; return parseItemId(ev.id).level >= o.minLevel ? 1 : 0; }
      case 'deliver_item': { if (ev.type !== 'deliver') return 0; if (giver && ev.giver !== giver) return 0; return ev.id === o.item ? 1 : 0; }
      case 'clear_obstacle': return ev.type === 'clear_obstacle' && (!o.obstacle || o.obstacle === 'any' || o.obstacle === ev.obstacle) ? 1 : 0;
      case 'clear_special': return ev.type === 'clear_obstacle' && ev.obstacle === o.obstacle ? 1 : 0;
      case 'merge_count': return ev.type === 'merge' && (!o.chain || o.chain === 'any' || o.chain === ev.chain) ? 1 : 0;
      case 'merge_bonus': return ev.type === 'merge' && ev.size >= o.size ? 1 : 0;
      case 'spend_energy': return ev.type === 'spend_energy' ? ev.amount : 0;
      case 'collect_currency': return ev.type === 'collect_currency' && ev.currency === o.currency ? ev.amount : 0;
      case 'place_living_item': return ev.type === 'place_living_item' && (!o.item || o.item === ev.item) ? 1 : 0;
      case 'visit_island': return ev.type === 'visit_island' && (!o.island || o.island === ev.island) ? 1 : 0;
      case 'requests_done': return ev.type === 'request_done' ? 1 : 0;
      case 'fill_pool': case 'thaw': case 'light_area': case 'sugar_rush': return ev.type === o.type ? 1 : 0;
      case 'use_item': return ev.type === 'use_item' && ev.id === o.item ? 1 : 0;
      case 'deliver_island': return 0;
      default: return 0;
    }
  };

  // ---------------------------------------------------------------- events -> progress
  P.noteEvent = function (ev) {
    (this.evq || (this.evq = [])).push(ev);
    if (this.evBusy) return;
    this.evBusy = true;
    try { while (this.evq.length) this.processEvent(this.evq.shift()); } finally { this.evBusy = false; }
  };

  P.processEvent = function (ev) {
    const d = this.data, s = this.s;
    let touched = false;
    for (const qid of s.quests.active.slice()) {
      const q = d.questById[qid], prog = s.quests.progress[qid];
      q.objectives.forEach((o, i) => {
        if (this.objStateBased(o)) return;
        const inc = this.objInc(o, ev, q.giver);
        if (inc > 0) { const t = this.objTarget(o); const before = prog[i]; prog[i] = Math.min(t, prog[i] + inc); if (prog[i] !== before) touched = true; }
      });
    }
    for (const list of [s.daily.tasks, s.weekly.tasks, this.islandTasks?.() || []]) {
      for (const t of list) {
        if (t.done) continue;
        const inc = this.objInc(t.obj, ev, null);
        if (inc > 0) { t.progress = Math.min(this.objTarget(t.obj), t.progress + inc); if (t.progress >= this.objTarget(t.obj)) t.done = true; touched = true; }
      }
    }
    this.eventModProcess?.(ev);
    // resident requests
    if (ev.type === 'deliver') {
      for (const r of s.requests.list) {
        if (r.done || r.res !== ev.giver || r.item !== ev.id) continue;
        r.have++;
        if (r.have >= r.count) { r.done = true; this.completeRequest(r); }
        touched = true; break;
      }
    }
    this.islandProgress?.(ev);
    if (touched) { this.checkDailyDone?.(); this.refreshQuests(); this.emit('progress', { ev }); }
  };

  P.noteState = function () { this.refreshQuests(); };

  // ---------------------------------------------------------------- story quests
  P.questComplete = function (q) {
    const prog = this.s.quests.progress[q.id];
    return q.objectives.every((o, i) => this.objStateBased(o) ? this.objSatisfied(o) : (prog[i] || 0) >= this.objTarget(o));
  };
  P.syncStateObjectives = function (q) {
    const prog = this.s.quests.progress[q.id];
    q.objectives.forEach((o, i) => { if (this.objStateBased(o)) prog[i] = this.objSatisfied(o) ? 1 : 0; });
  };
  P.arriveResident = function (id) {
    const s = this.s, d = this.data;
    if (s.arrived.includes(id) || !d.residentById[id]) return;
    s.arrived.push(id); this.rebuildStructures();
    this.emit('arrive', { id, line: d.t(`res.${id}.arrive`, '') });
  };
  P.activateQuest = function (q) {
    const s = this.s, d = this.data;
    s.quests.active.push(q.id);
    s.quests.progress[q.id] = q.objectives.map(() => 0);
    s.quests.started[q.id] = this.now();
    this.arriveResident(q.giver);
    for (const o of q.objectives) if (o.item) { const p = parseItemId(o.item); if (p && d.chainByKey[p.chain] && !d.chainByKey[p.chain].island) this.forceUnlockChain(p.chain); }
    this.syncStateObjectives(q);
    this.emit('questStarted', { quest: q });
  };
  P.refreshQuests = function () {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const s = this.s, d = this.data;
      let changed = true, guard = 0;
      while (changed && guard++ < 60) {
        changed = false;
        for (const id of s.quests.active.slice()) {
          const q = d.questById[id];
          this.syncStateObjectives(q);
          this.rescueClearObjectives(q);
          if (this.questComplete(q)) { this.completeQuest(q); changed = true; }
        }
        if (s.quests.active.length < 3) {
          for (const q of d.quests) {
            if (s.quests.active.length >= 3) break;
            if (s.quests.done.includes(q.id) || s.quests.active.includes(q.id)) continue;
            if (!q.requires.every(r => s.quests.done.includes(r))) continue;
            this.activateQuest(q); changed = true;
          }
        }
      }
    } finally { this.refreshing = false; }
  };
  /** Rescue rule: a clear-obstacle objective can never starve. If nothing left to clear is reachable, it counts as done. */
  P.rescueClearObjectives = function (q) {
    const prog = this.s.quests.progress[q.id], b = this.home.board;
    q.objectives.forEach((o, i) => {
      if (o.type !== 'clear_obstacle' || (prog[i] || 0) >= o.count) return;
      let avail = 0; const seen = new Set();
      for (let c = 0; c < b.n; c++) { const ob = b.obst[c]; if (ob && b.isOpen(c) && !seen.has(ob.id)) { seen.add(ob.id); if (!o.obstacle || o.obstacle === 'any' || o.obstacle === ob.type) avail++; } }
      if (prog[i] + avail < o.count && avail === 0) prog[i] = o.count;
    });
  };
  P.completeQuest = function (q) {
    const s = this.s, d = this.data;
    s.quests.active = s.quests.active.filter(x => x !== q.id);
    if (s.quests.done.includes(q.id)) return;
    s.quests.done.push(q.id);
    s.stats.storyQuests++;
    delete s.quests.progress[q.id];
    const anchor = this.residentCell(q.giver) ?? this.anchorCell();
    for (const r of q.rewards) this.grantReward(r, anchor, 'quest');
    this.addXP(d.economy.xp.questBase + d.economy.xp.questPerAct * q.act);
    this.emit('questDone', { quest: q });
    // act finale: open the sealed gates of that act's zones
    const actQuests = d.quests.filter(x => x.act === q.act);
    if (actQuests[actQuests.length - 1].id === q.id) this.openActGates(q.act);
    this.checkAchievements?.();
  };
  /**
   * Developer testing: finish a story quest without the items. Counted objectives are filled up; state objectives are made true
   * the way the game would (the building is built, zones are opened, levels are gained, the island is completed, the Sun Gate opens),
   * so the rest of the island progresses normally. The quest then completes and pays its rewards as usual.
   */
  P.devCompleteQuest = function (qid) {
    const d = this.data, s = this.s, q = d.questById[qid];
    if (!q || !s.quests.active.includes(qid)) return fail('notActive');
    const openZonesTo = n => { while (this.nextZone() <= n && d.zoneByN[this.nextZone()]) if (!this.unlockZone(this.nextZone(), { force: true }).ok) break; };
    const prog = s.quests.progress[qid];
    q.objectives.forEach((o, i) => {
      switch (o.type) {
        case 'build': {
          if (s.built[o.building]) break;
          const z = d.zones.find(z => z.sites?.some(st => st.building === o.building));
          if (z) openZonesTo(z.n);
          this.build(o.building, { free: true });
          break;
        }
        case 'unlock_zone': openZonesTo(o.zone); break;
        case 'reach_level': { const cap = d.economy.xp.levelCap; while (s.player.level < Math.min(o.level, cap)) this.addXP(Math.max(1, this.xpForLevel(s.player.level) - s.player.xp)); break; }
        case 'island_complete': if (this.islandState(o.island).state !== 'done') this.completeIsland(o.island); break;
        case 'sun_gate': if (!s.flags.sunGateOpen) { s.flags.sunGateOpen = true; this.emit('sunGate', {}); } break;
        default: prog[i] = this.objTarget(o);
      }
    });
    this.refreshQuests();
    if (!s.quests.done.includes(qid)) return fail('stuck');
    this.emit('progress', { ev: { type: 'dev' } });
    return { ok: true };
  };
  P.openActGates = function (act) {
    const b = this.home.board, zs = [act * 2 - 1, act * 2];
    const seen = new Set();
    for (let i = 0; i < b.n; i++) { const o = b.obst[i]; if (o && o.type === 'sealed_gate' && !seen.has(o.id) && zs.includes(this.data.cellZone[i])) { seen.add(o.id); this.finishObstacle(o, this.data.obstacleById[o.type], this.home); } }
  };
  P.activeQuests = function () { return this.s.quests.active.map(id => this.data.questById[id]); };
  P.questProgress = function (q) { const p = this.s.quests.progress[q.id] || []; return q.objectives.map((o, i) => ({ obj: o, have: p[i] || 0, need: this.objTarget(o), text: this.objectiveText(o) })); };
  P.openSunGate = function () {
    const s = this.s;
    const done = this.data.islands.filter(i => s.islands[i.id]?.state === 'done').length;
    if (!s.built.bld_great_temple) return fail('noTemple');
    if (done < 6) return fail('amulets', { have: done });
    s.flags.sunGateOpen = true;
    this.emit('sunGate', {});
    this.noteState('gate');
    return { ok: true };
  };

  // ---------------------------------------------------------------- daily / weekly / requests
  P.rolloverDays = function () {
    const s = this.s, now = this.now(), today = dayKey(now), wk = weekKey(now);
    if (s.weekly.week !== wk) {
      s.weekly.week = wk; s.weekly.claimed = false; s.daily.skips = this.data.economy.daily.freeSkipPerWeek;
      s.weekly.tasks = this.makeWeekly();
    }
    if (s.daily.date !== today) {
      const prevDay = s.daily.date, y = dayKey(now - DAY);
      if (s.daily.lastAll && s.daily.lastAll !== y) {
        const gap = Math.round((dayNumber(now) - dayNumber(new Date(s.daily.lastAll + 'T12:00:00').getTime())));
        if (gap === 2 && s.daily.skips > 0) s.daily.skips--; else if (gap > 1) s.daily.streak = 0;
      }
      s.daily.date = today; s.daily.rerolled = false; s.daily.allClaimed = false;
      s.daily.tasks = this.makeDaily();
      if (this.s.player.level >= 3) { s.requests.date = today; s.requests.list = this.makeRequests(); }
      s.shopDeals.date = ''; s.adState.day = today; s.adState.count = 0;
      this.emit('newDay', {});
    }
    if (this.s.activePets.includes('biscuit') && now >= s.petCrateAt) { s.petCrateAt = now + DAY; this.addItem(this.makeItem('chest_01'), null, 'pet'); this.emit('petGift', { pet: 'biscuit' }); }
  };
  P.unlockedCreatableChains = function () {
    const d = this.data;
    return d.chains.filter(c => !c.island && !c.currency && !c.chest && c.family !== 'generator' && c.chain !== 'supplies' && c.chain !== 'dragon' && this.chainUnlocked(c.chain));
  };
  P.makeDailyTask = function (kind) {
    const d = this.data, rng = this.rng, chains = this.unlockedCreatableChains();
    const nm = id => d.name(id);
    switch (kind) {
      case 'create': { const c = rng.pick(chains.filter(c => c.chain !== 'clearing_tools') || chains); const L = Math.max(3, Math.min(c.levels, Math.round(c.levels * 0.4))); const id = itemId(c.chain, L); const n = rng.range(1, 2); return { id: `d_create_${id}`, text: `Create ${n} ${nm(id)}`, obj: { type: 'create_item', item: id, count: n }, progress: 0, done: false }; }
      case 'clear': { const n = rng.range(6, 15); return { id: 'd_clear', text: `Clear ${n} obstacles`, obj: { type: 'clear_obstacle', obstacle: 'any', count: n }, progress: 0, done: false }; }
      case 'merge': { const n = rng.range(10, 30); return { id: 'd_merge', text: `Perform ${n} merges`, obj: { type: 'merge_count', chain: 'any', count: n }, progress: 0, done: false }; }
      case 'bonus': { const n = rng.range(2, 5); return { id: 'd_bonus', text: `Do ${n} five-item merges`, obj: { type: 'merge_bonus', size: 5, count: n }, progress: 0, done: false }; }
      case 'deliver': { const need = [...this.neededChains()]; const pool = chains.filter(c => c.family !== 'tool'); const c = need.length && rng.chance(0.6) ? d.chainByKey[rng.pick(need)] : rng.pick(pool); const L = Math.max(2, Math.min(c.levels - 1, Math.round(c.levels * 0.4))); const id = itemId(c.chain, L); return { id: `d_deliver_${id}`, text: `Deliver 1 ${nm(id)} to any resident`, obj: { type: 'deliver_item', item: id, count: 1 }, progress: 0, done: false }; }
      default: { const n = rng.range(30, 80); return { id: 'd_spend', text: `Spend ${n} energy`, obj: { type: 'spend_energy', amount: n }, progress: 0, done: false }; }
    }
  };
  P.makeDaily = function () {
    const kinds = this.rng.shuffle(['create', 'clear', 'merge', 'bonus', 'deliver', 'spend']);
    const pick = kinds.filter(k => !(k === 'deliver' && this.s.arrived.length < 3)).slice(0, this.data.economy.daily.count);
    return pick.map(k => this.makeDailyTask(k));
  };
  P.makeWeekly = function () {
    const rng = this.rng, lvl = this.s.player.level;
    const T = [
      () => { const n = rng.range(8, 12); return { text: `Complete ${n} resident requests`, obj: { type: 'requests_done', count: n } }; },
      () => { const n = rng.range(3, 5); return { text: `Create ${n} items of level 6 or higher`, obj: { type: 'create_level', minLevel: 6, count: n } }; },
      () => { const n = rng.range(60, 100); return { text: `Clear ${n} obstacles`, obj: { type: 'clear_obstacle', obstacle: 'any', count: n } }; },
      () => { const n = rng.range(120, 200); return { text: `Perform ${n} merges`, obj: { type: 'merge_count', chain: 'any', count: n } }; },
      () => { const n = rng.range(10, 20); return { text: `Perform ${n} five-item merges`, obj: { type: 'merge_bonus', size: 5, count: n } }; },
      () => { const n = rng.range(250, 400); return { text: `Spend ${n} energy`, obj: { type: 'spend_energy', amount: n } }; },
      () => ({ text: 'Visit 2 islands', obj: { type: 'visit_island', count: 2 } })
    ];
    const idx = rng.shuffle(T.map((_, i) => i)).filter(i => !(i === 6 && lvl < 12));
    return idx.slice(0, this.data.economy.weekly.count).map((i, k) => { const t = T[i](); return { id: `w${k}`, text: t.text, obj: t.obj, progress: 0, done: false }; });
  };
  P.rerollDaily = function (i) {
    const s = this.s;
    if (s.daily.rerolled) return fail('used');
    const t = s.daily.tasks[i]; if (!t || t.done) return fail('invalid');
    const have = new Set(s.daily.tasks.map(x => x.id.split('_')[1]));
    for (let k = 0; k < 10; k++) { const kind = this.rng.pick(['create', 'clear', 'merge', 'bonus', 'deliver', 'spend']); if (have.has(kind)) continue; s.daily.tasks[i] = this.makeDailyTask(kind); s.daily.rerolled = true; this.emit('progress', {}); return { ok: true }; }
    return fail('none');
  };
  P.checkDailyDone = function () {
    const s = this.s, eco = this.data.economy;
    for (const t of s.daily.tasks) {
      if (t.done && !t.paid) { t.paid = true; s.stats.dailyDone++; this.addCoins(eco.daily.coins, 'daily'); this.addEnergy(eco.daily.energy); this.emit('dailyDone', { task: t }); this.checkAchievements?.(); }
    }
    if (!s.daily.allClaimed && s.daily.tasks.length && s.daily.tasks.every(t => t.done)) {
      s.daily.allClaimed = true; s.daily.lastAll = s.daily.date; s.daily.streak++;
      s.stats.bestStreak = Math.max(s.stats.bestStreak, s.daily.streak);
      this.addItem(this.makeItem(eco.daily.allChest), null, 'daily');
      if (s.daily.streak % 7 === 0) this.addItem(this.makeItem(eco.daily.streakChest), null, 'daily');
      this.emit('dailyAll', { streak: s.daily.streak });
    }
    if (!s.weekly.claimed && s.weekly.tasks.length && s.weekly.tasks.every(t => t.done)) {
      s.weekly.claimed = true; this.addItem(this.makeItem(eco.weekly.chest), null, 'weekly'); this.addPearls(eco.weekly.pearls); this.emit('weeklyDone', {});
    }
  };
  P.makeRequests = function () {
    const d = this.data, rng = this.rng, out = [];
    for (const id of this.s.arrived) {
      if (id === 'marlene') continue;
      const spec = { beni: ['banana', 'coconut', 'sea'], mateo: ['lumber', 'stone', 'hardware'], tala: ['herbs', 'hibiscus', 'papaya'], rosa: ['meals', 'dairy', 'drinks'], kai: ['sea', 'shells', 'drinks'], victor: ['drinks', 'meals', 'mango'], okoye: ['chicken', 'cow', 'goat'], lena: ['amulet', 'shells', 'stone'] }[id] || [];
      const pool = spec.filter(c => this.chainUnlocked(c));
      if (!pool.length) continue;
      const chain = d.chainByKey[rng.pick(pool)];
      const L = rng.range(2, Math.min(4, chain.levels));
      const count = L <= 2 ? rng.range(2, 3) : rng.range(1, 2);
      out.push({ id: `r_${id}`, res: id, item: itemId(chain.chain, L), count, have: 0, done: false, reward: rng.chance(0.5) ? { type: 'coins', amount: 20 * L + 20 } : { type: 'item', item: 'chest_01' } });
    }
    return out;
  };
  P.completeRequest = function (r) {
    const anchor = this.residentCell(r.res) ?? this.anchorCell();
    this.grantReward(r.reward, anchor, 'request');
    this.s.stats.requests++;
    this.emit('requestDone', { request: r });
    this.noteEvent({ type: 'request_done' });
    this.checkAchievements?.();
  };

  // ---------------------------------------------------------------- achievements
  P.statValue = function (key) {
    const s = this.s;
    if (key === 'level') return s.player.level;
    if (key === 'zones') return s.zones.unlocked.length;
    if (key === 'pets') return s.petsOwned.length;
    if (key === 'discovered') return Object.keys(s.journal.discovered).length;
    if (key === 'relics') return s.journal.relics.length;
    if (key === 'built') return Object.keys(s.built).length;
    if (key === 'islandsDone') return this.data.islands.filter(i => s.islands[i.id]?.state === 'done').length;
    return s.stats[key] || 0;
  };
  P.checkAchievements = function () {
    const s = this.s;
    for (const a of this.data.achievements) {
      if (s.ach.done[a.id]) continue;
      if (this.statValue(a.stat) >= a.goal) {
        s.ach.done[a.id] = this.now();
        const r = a.reward || {};
        if (r.coins) this.addCoins(r.coins, 'ach');
        if (r.pearls) this.addPearls(r.pearls);
        if (r.energy) this.addEnergy(r.energy);
        if (r.item) this.addItem(this.makeItem(r.item), null, 'ach');
        this.emit('achievement', { achievement: a });
      }
    }
  };

  // ---------------------------------------------------------------- login reward
  P.loginAvailable = function () { return this.s.login.claimed !== dayKey(this.now()); };
  P.claimLogin = function () {
    const s = this.s, now = this.now();
    if (!this.loginAvailable()) return fail('claimed');
    const y = dayKey(now - DAY);
    const next = s.login.claimed === y ? (s.login.day % 7) + 1 : 1;
    s.login.day = next; s.login.claimed = dayKey(now);
    const rewards = this.data.economy.loginCycle[next - 1];
    for (const id of rewards.items) this.addItem(this.makeItem(id), null, 'login');
    this.emit('login', { day: next, rewards });
    return { ok: true, day: next, rewards };
  };

  // ---------------------------------------------------------------- shop, refills, ads
  P.shopDeals = function () {
    const s = this.s, eco = this.data.economy.shop;
    const today = dayKey(this.now());
    if (s.shopDeals.date !== today) {
      s.shopDeals.date = today;
      const pool = this.itemPool(eco.dealLevelRange[0], eco.dealLevelRange[1]).filter(id => this.data.chain(parseItemId(id).chain).sellable);
      const picks = [];
      while (picks.length < eco.dealCount && pool.length) { const id = this.rng.pick(pool); if (!picks.includes(id)) picks.push(id); }
      s.shopDeals.items = picks.map(id => ({ id, price: this.data.shopPrice(id), bought: false }));
    }
    for (const it of s.shopDeals.items) if (!it.bought) it.price = this.data.shopPrice(it.id); // follows price changes made in dev mode
    return s.shopDeals.items;
  };
  P.buyDeal = function (i) {
    const deal = this.shopDeals()[i];
    if (!deal || deal.bought) return fail('gone');
    if (!this.spendCoins(deal.price)) return fail('noCoins');
    deal.bought = true;
    this.addItem(this.makeItem(deal.id), null, 'shop');
    this.emit('bought', { deal });
    return { ok: true };
  };
  P.refillEnergy = function (how) {
    const eco = this.data.economy.refill;
    if (how === 'coins') { if (!this.spendCoins(eco.coins.cost)) return fail('noCoins'); this.addEnergy(eco.coins.energy); return { ok: true }; }
    if (how === 'pearls') { if (!this.spendPearls(eco.pearls.cost)) return fail('noPearls'); this.addEnergy(eco.pearls.energy); return { ok: true }; }
    return fail('how');
  };
  P.adStatus = function () {
    const s = this.s, eco = this.data.economy.refill, now = this.now();
    const left = eco.adsPerDay - s.adState.count;
    const wait = Math.max(0, Math.ceil((s.adState.lastAt + eco.adCooldownMin * 60000 - now) / 1000));
    return { left, wait, ok: left > 0 && wait === 0 };
  };
  P.rewardAd = function () {
    const st = this.adStatus(), eco = this.data.economy.refill;
    if (!st.ok) return fail(st.left <= 0 ? 'limit' : 'cooldown', st);
    this.s.adState.count++; this.s.adState.lastAt = this.now();
    this.addEnergy(eco.adEnergy);
    return { ok: true, energy: eco.adEnergy };
  };
  P.rescueEnergy = function () {
    const s = this.s, now = this.now();
    this.syncEnergy();
    if (s.player.energy > 0 || now - s.rescue.lastEnergy < DAY) return fail('no');
    s.rescue.lastEnergy = now; this.addEnergy(this.data.economy.energy.rescueFree);
    return { ok: true };
  };

  // ---------------------------------------------------------------- settings
  P.setSetting = function (k, v) { this.s.settings[k] = v; this.emit('setting', { k, v }); };

  // ---------------------------------------------------------------- live events (offline-capable local schedule)
  const PERIOD_DAYS = 14;
  P.currentEvent = function () {
    const d = this.data, now = this.now();
    const days = Math.floor(now / DAY);
    const period = Math.floor(days / PERIOD_DAYS), within = days - period * PERIOD_DAYS;
    const order = ['task_track', 'merge_rush', 'festival'];
    const tpl = d.events.templates.find(t => t.id === order[period % 3]);
    const theme = d.events.themes[period % d.events.themes.length];
    const startMs = period * PERIOD_DAYS * DAY;
    const endMs = startMs + tpl.days * DAY;
    const id = `evt_${theme[1]}_${period}`;
    const active = now >= startMs && now < endMs && this.s.player.level >= 8;
    const upcoming = !active && now >= startMs + PERIOD_DAYS * DAY - DAY;
    return { id, template: tpl, theme: theme[0], startMs, endMs, active, upcoming, period };
  };
  P.eventState = function () {
    const e = this.currentEvent(), s = this.s;
    if (!s.event || s.event.id !== e.id) {
      // event ended: grant every reached tier automatically, then reset
      if (s.event && !s.event.settled) this.settleEvent();
      s.event = { id: e.id, tokens: 0, claimed: 0, settled: false };
    }
    return { ...e, ...s.event };
  };
  P.eventMod = function (name) {
    const e = this.currentEvent();
    if (!e.active || e.template.id !== 'merge_rush') return name === 'xpMult' || name === 'shimmerMult' ? 1 : 0;
    if (name === 'xpMult' || name === 'shimmerMult') return 2;
    return 0;
  };
  P.eventModProcess = function (ev) {
    const e = this.currentEvent(), s = this.s;
    if (!e.active) return;
    const st = this.eventState();
    if (e.template.id === 'task_track' && ev.type === 'create_item') { const lv = parseItemId(ev.id).level; if (lv >= 3) { st.tokens += lv; s.event.tokens = st.tokens; this.claimEventTiers(); } }
    if (e.template.id === 'festival' && ev.type === 'deliver') { s.event.tokens += 2; this.claimEventTiers(); }
    if (e.template.id === 'merge_rush' && ev.type === 'merge') { s.event.tokens += ev.size; this.claimEventTiers(); }
  };
  P.claimEventTiers = function () {
    const s = this.s, track = this.data.events.track;
    while (s.event.claimed < track.length && s.event.tokens >= track[s.event.claimed][0]) {
      const [, r] = track[s.event.claimed]; s.event.claimed++;
      if (r.coins) this.addCoins(r.coins, 'event');
      if (r.energy) this.addEnergy(r.energy);
      if (r.pearls) this.addPearls(r.pearls);
      if (r.item) this.grantReward({ type: 'item', item: r.item, count: r.count || 1 }, null, 'event');
      this.emit('eventTier', { tier: s.event.claimed });
    }
  };
  P.settleEvent = function () { if (this.s.event) { this.claimEventTiers(); this.s.event.settled = true; } };
}
