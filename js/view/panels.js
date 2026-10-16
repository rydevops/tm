// Modal panels: quests, building, zones, shop, trade dock, journal, pets, expeditions, settings and celebrations.
import { h, icon, itemCanvas, fmt, fmtTime } from './ui.js';
import { parseItemId } from '../core/util.js';
import { VERSION, BUILD } from '../version.js';
import { checkForUpdate, builtLabel } from './updater.js';

const FALLBACK_GUIDES = {
  rook: { id: 'rook', name: 'Captain Rook', role: 'Pirate captain', skin: '#b9774c', hair: '#3b2a20', outfit: '#8b1e3f', accent: '#f4d35e' },
  luma: { id: 'luma', name: 'Luma', role: 'Lantern keeper', skin: '#e2b48a', hair: '#5b3a8a', outfit: '#3a2c6b', accent: '#ffd23f' },
  ember: { id: 'ember', name: 'Ember', role: 'Baby dragon', skin: '#e8602c', hair: '#ffb347', outfit: '#c43d12', accent: '#ffd23f' }
};

export class Panels {
  constructor(app) { this.app = app; }
  get g() { return this.app.game; }
  get d() { return this.app.data; }
  get ui() { return this.app.ui; }

  /* ----------------------------------------------------------- helpers */
  pill(kind, n) { return h('span', { class: 'pill' }, icon(kind), typeof n === 'number' ? fmt(n) : n); }
  tabs(list, cur, set, m) { return h('div', { class: 'tabs', role: 'tablist' }, list.map(([id, label, dot]) => h('button', { class: 'tab' + (id === cur ? ' active' : ''), role: 'tab', 'aria-selected': id === cur, onclick: () => { set(id); m.render(); } }, label, dot ? h('span', { class: 'dot' }, dot) : null))); }
  rewardChips(list) {
    const d = this.d;
    return h('div', { class: 'row wrap' }, (list || []).map(r => {
      switch (r.type) {
        case 'coins': return this.pill('coin', r.amount);
        case 'energy': return this.pill('energy', r.amount);
        case 'pearls': return this.pill('pearl', r.amount);
        case 'amulet': return this.pill('amulet', r.amount);
        case 'tickets': return this.pill('ticket', r.amount);
        case 'xp': return h('span', { class: 'pill' }, icon('star'), r.amount);
        case 'item': return h('span', { class: 'pill' }, itemCanvas(d, r.item, 22), (r.count > 1 ? r.count + '× ' : '') + d.name(r.item));
        default: return null;
      }
    }));
  }
  itemChip(id, text, cls = '') { return h('div', { class: 'ichip ' + cls, title: this.d.name(id) }, itemCanvas(this.d, id, 50), h('span', { class: 'cnt' }, text), h('span', null, this.d.name(id))); }
  res(idOrObj) { const d = this.d; return typeof idOrObj === 'string' ? (d.residentById[idOrObj] || FALLBACK_GUIDES[idOrObj]) : idOrObj; }
  face(id, expr = 'neutral', px = 80) {
    const r = this.res(id); const wrap = h('div', { class: 'face-lg', style: { width: px / 16 + 'rem', height: px / 16 + 'rem' } });
    if (r) wrap.append(this.ui.portrait(r, expr, px * 2));
    return wrap;
  }
  speak(id, text, expr = 'neutral') { const r = this.res(id); return h('div', { class: 'row', style: { alignItems: 'flex-start', marginBottom: '8px' } }, this.face(id, expr), h('div', { class: 'speech' }, h('b', { style: { display: 'block', fontSize: '0.8rem', color: 'var(--ink2)' } }, r?.name || ''), text)); }
  close(m) { m.close(); }
  progressBar(frac) { return h('div', { class: 'pbar' }, h('i', { style: { width: Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' } })); }
  ok(label = 'OK') { return m => h('button', { class: 'btn good', onclick: () => m.close() }, label); }
  zoneName(n) { return this.d.zoneByN[n]?.name || `Zone ${n}`; }

  /* ------------------------------------------------------------- quests */
  quests(start = 'story') {
    const g = this.g, d = this.d, s = g.s; let tab = start;
    this.ui.modal({
      title: 'Quests', cls: 'wide',
      render: m => {
        const ready = g.activeQuests().filter(q => g.questComplete(q)).length;
        const dailyReady = s.daily.tasks.filter(t => t.done).length;
        const wrap = h('div');
        wrap.append(this.tabs([['story', 'Story', ready || ''], ['daily', 'Daily'], ['weekly', 'Weekly'], ['requests', 'Requests']], tab, t => { tab = t; }, m));
        const body = h('div', { style: { paddingTop: '8px' } });
        if (tab === 'story') this.storyTab(body, m);
        else if (tab === 'daily') this.dailyTab(body, m);
        else if (tab === 'weekly') this.weeklyTab(body);
        else this.requestsTab(body);
        wrap.append(body); return wrap;
      }
    });
  }
  storyTab(body) {
    const g = this.g, d = this.d, qs = g.activeQuests();
    if (!qs.length) body.append(h('p', { class: 'center sub' }, 'No active story quests right now. Keep exploring and building!'));
    for (const q of qs) {
      const res = d.residentById[q.giver]; const prog = g.questProgress(q); const done = g.questComplete(q);
      body.append(h('div', { class: 'card' + (done ? ' good' : ''), style: { cursor: 'pointer' }, onclick: () => this.questDetail(q.id) },
        h('div', { class: 'row' }, this.face(q.giver, done ? 'excited' : 'neutral', 56), h('div', { style: { flex: 1 } }, h('b', null, res?.name || ''), h('div', { class: 'sub' }, d.t(q.textKey)))),
        prog.map(p => h('div', { style: { marginTop: '4px' } }, h('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 } }, h('span', null, p.text), h('span', null, `${Math.min(p.have, p.need)}/${p.need}`)), this.progressBar(p.have / p.need))),
        h('div', { style: { marginTop: '6px' } }, this.rewardChips(q.rewards))));
    }
  }
  dailyTab(body, m) {
    const g = this.g, s = g.s, eco = this.d.economy.daily;
    body.append(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, 'Today'), h('span', { class: 'pill gold' }, `🔥 Streak ${s.daily.streak}`)));
    body.append(h('p', { class: 'sub' }, `Each task: ${eco.coins} coins + ${eco.energy} energy. Finish all for a chest (streak of 7 earns a big one).`));
    s.daily.tasks.forEach((t, i) => {
      const need = g.objTarget(t.obj);
      body.append(h('div', { class: 'card' + (t.done ? ' good' : '') }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', null, t.text), this.progressBar((t.progress || 0) / need), h('div', { class: 'sub' }, t.done ? 'Done!' : `${Math.min(t.progress || 0, need)}/${need}`)),
        !t.done && !s.daily.rerolled ? h('button', { class: 'btn small ghost', 'aria-label': 'Swap this task for another', onclick: () => { g.rerollDaily(i); m.render(); } }, '↻ Swap') : null)));
    });
    body.append(h('p', { class: 'sub center' }, s.daily.allClaimed ? '✔ All tasks complete. Come back tomorrow!' : s.daily.rerolled ? 'Task swap used for today.' : 'You can swap one task per day.'));
  }
  weeklyTab(body) {
    const g = this.g, s = g.s, eco = this.d.economy.weekly;
    body.append(h('p', { class: 'sub' }, `Finish all ${eco.count} for a chest and ${eco.pearls} pearls.`));
    s.weekly.tasks.forEach(t => { const need = g.objTarget(t.obj); body.append(h('div', { class: 'card' + (t.done ? ' good' : '') }, h('b', null, t.text), this.progressBar((t.progress || 0) / need), h('div', { class: 'sub' }, t.done ? 'Done!' : `${Math.min(t.progress || 0, need)}/${need}`))); });
    if (s.weekly.claimed) body.append(h('p', { class: 'center sub' }, '✔ Weekly reward claimed.'));
  }
  requestsTab(body) {
    const g = this.g, s = g.s, d = this.d;
    if (s.player.level < 3) { body.append(h('p', { class: 'center sub' }, 'Residents start asking for favors at level 3.')); return; }
    body.append(h('p', { class: 'sub' }, 'Drag the item onto the resident to deliver it. New requests arrive every day.'));
    if (!s.requests.list.length) body.append(h('p', { class: 'center sub' }, 'No requests today.'));
    for (const r of s.requests.list) {
      const res = d.residentById[r.res];
      body.append(h('div', { class: 'card' + (r.done ? ' good' : '') }, h('div', { class: 'row' }, this.face(r.res, 'neutral', 56), h('div', { style: { flex: 1 } }, h('b', null, res?.name), h('div', { class: 'sub' }, `Bring ${r.count} × ${d.name(r.item)}`), this.progressBar(r.have / r.count), this.rewardChips([r.reward])), this.itemChip(r.item, `${Math.min(r.have, r.count)}/${r.count}`, r.done ? 'have' : ''))));
    }
  }
  questDetail(id) {
    const g = this.g, d = this.d, q = d.questById[id]; if (!q) return;
    this.ui.modal({
      title: 'Story quest', cls: 'small',
      render: () => {
        const prog = g.questProgress(q), done = g.questComplete(q);
        return h('div', null, this.speak(q.giver, d.t(q.textKey), done ? 'excited' : 'neutral'),
          prog.map(p => h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between', fontWeight: 700 } }, h('span', null, p.text), h('span', null, `${Math.min(p.have, p.need)}/${p.need}`)), this.progressBar(p.have / p.need), p.obj.item ? h('div', { style: { marginTop: '6px' } }, this.itemChip(p.obj.item, `${g.countItem(p.obj.item)} on island`)) : null)),
          h('div', { class: 'sub' }, 'Reward'), this.rewardChips(q.rewards));
      },
      footerRender: m => [h('button', { class: 'btn alt', onclick: () => { m.close(); this.focusGiver(q.giver); } }, 'Show me'), h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Close')]
    });
  }
  focusGiver(id) { const g = this.g; const c = g.residentCell?.(id); if (c != null) { this.ui.closeAll(); this.app.renderer.focusCell(c, 1.0); this.app.renderer.hint = { cells: [c], until: this.app.renderer.now() + 4 }; } }

  /* ------------------------------------------------------- build / zones */
  build(bldId) { this.building(bldId); }
  building(bldId) {
    const g = this.g, d = this.d, def = d.buildingById[bldId]; if (!def) return;
    this.ui.modal({
      title: def.name, cls: 'small',
      render: () => {
        const wrap = h('div'); const built = !!g.s.built[bldId];
        wrap.append(h('p', { class: 'sub' }, def.fn || ''));
        if (built) {
          if (def.perk) wrap.append(h('p', null, h('span', { class: 'pill good' }, this.perkText(def.perk))));
          if (def.daily) wrap.append(h('div', { class: 'row' }, h('span', { class: 'pill gold' }, icon('coin'), `${def.daily.coins} per day`), g.payoutReady(bldId) ? h('b', { style: { color: 'var(--good)' } }, 'Ready: tap the building!') : h('span', { class: 'sub' }, 'Collect once every 24 h')));
          const gen = g.generatorOfBuilding(bldId);
          if (gen && g.s.structs[gen.id]) { const ci = g.chargeInfo(gen.id); wrap.append(h('div', { class: 'card' }, h('b', null, `Tier ${ci.tier} · ${ci.charges}/${ci.cap} charges`), ci.seconds ? h('div', { class: 'sub' }, 'Next charge in ', h('span', { 'data-until': g.now() + ci.seconds * 1000 })) : h('div', { class: 'sub' }, 'Fully charged'))); }
        }
        const proj = g.projectFor(bldId);
        if (proj) wrap.append(this.projectBlock(proj, bldId));
        else if (built) wrap.append(h('p', { class: 'center sub' }, '✔ Fully built'));
        return wrap;
      }
    });
  }
  perkText(p) {
    const k = Object.keys(p)[0], v = p[k];
    return { storage: `+${v} storage slots`, energyRegen: `Energy regenerates ${Math.round(v * 100)}% faster`, giftBubble: `Gift bubbles ${Math.round(v * 100)}% more often`, shimmer: `+${Math.round(v * 100)}% shimmer chance`, tradePrice: `+${Math.round(v * 100)}% trade prices`, hiddenPrize: `+${Math.round(v * 100)}% hidden prizes`, chargeCap: `+${v} animal charges` }[k] || `${k}: ${v}`;
  }
  projectBlock(proj, bldId) {
    const g = this.g, d = this.d; const fill = g.projectFill(proj.key); const ready = g.projectReady(proj);
    const wrap = h('div');
    wrap.append(h('b', null, proj.kind === 'upgrade' ? `Upgrade: ${proj.name}` : 'Needs'));
    wrap.append(h('div', { class: 'grid g4', style: { gridTemplateColumns: 'repeat(4,1fr)', margin: '6px 0' } }, proj.items.map(r => { const have = Math.min(fill[r.item] || 0, r.count); return this.itemChip(r.item, `${have}/${r.count}`, have >= r.count ? 'have' : 'need'); })));
    wrap.append(h('p', { class: 'sub' }, 'Drag matching items onto the building, or use Auto-fill to pull them from your board and storage.'));
    if (proj.coins) wrap.append(h('div', { class: 'row' }, h('span', { class: 'pill' + (g.s.player.coins >= proj.coins ? '' : ' bad') }, icon('coin'), proj.coins)));
    const missingOnIsland = proj.items.some(r => (fill[r.item] || 0) < r.count && g.countItem(r.item) > 0);
    wrap.append(h('div', { class: 'row', style: { marginTop: '8px', justifyContent: 'center' } },
      h('button', { class: 'btn alt' + (missingOnIsland ? '' : ' off'), onclick: () => { const r = g.autoFillProject(bldId); this.app.audio.sfx(r.moved ? 'drop' : 'invalid'); this.app.afterCommand(); } }, 'Auto-fill'),
      h('button', { class: 'btn good' + (ready && g.s.player.coins >= (proj.coins || 0) ? '' : ' off'), onclick: () => { const r = g.build(bldId); if (r.ok) { this.ui.closeAll(); this.app.afterCommand(); } else this.app.toast(r.reason === 'noCoins' ? 'Not enough coins' : 'Still missing items', 'bad'); } }, proj.kind === 'upgrade' ? 'Upgrade' : 'Build')));
    return wrap;
  }
  zone(n) {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: this.zoneName(n), cls: 'small',
      render: () => {
        const r = g.zoneRequirements(n), z = r.zone; const req = (ok, label, extra) => h('div', { class: 'row', style: { padding: '4px 0', fontWeight: 700 } }, h('span', null, ok ? '✅' : '⬜'), h('span', { style: { flex: 1 } }, label), extra);
        return h('div', null, h('p', { class: 'sub' }, z.content),
          req(r.haveLevel, `Reach level ${r.level}`, h('span', { class: 'sub' }, `you: ${g.s.player.level}`)),
          r.amulets ? req(r.haveAmulets, `${r.amulets} Amulet${r.amulets > 1 ? 's' : ''}`, h('span', { class: 'sub' }, `you: ${g.s.player.amulets}`)) : null,
          req(r.haveCleared, `Clear ${Math.round(r.clearedPct * 100)}% of the previous zone`, h('span', { class: 'sub' }, `${Math.round(r.pct * 100)}%`)),
          r.coins ? req(r.haveCoins, `${r.coins} coins`, h('span', { class: 'sub' }, `you: ${fmt(g.s.player.coins)}`)) : null,
          !r.isNext ? h('p', { class: 'sub center' }, 'Unlock the earlier zones first.') : null,
          r.amulets && !r.haveAmulets ? h('p', { class: 'sub' }, 'Amulets: merge Amulet Shards, tap the finished amulet to collect it.') : null);
      },
      footerRender: m => { const r = g.zoneRequirements(n); const can = r.isNext && r.haveLevel && r.haveAmulets && r.haveCleared && r.haveCoins; return [h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Later'), h('button', { class: 'btn good' + (can ? '' : ' off'), onclick: () => { const res = g.unlockZone(n); if (res.ok) { m.close(); this.app.afterCommand(); } } }, 'Unlock')]; }
    });
  }
  zoneUnlocked(ev) {
    const z = this.d.zoneByN[ev.zone];
    this.ui.modal({ title: 'New zone!', cls: 'small', render: () => h('div', { class: 'center' }, h('div', { style: { fontSize: '3rem' } }, '🌴'), h('h3', null, ev.name), h('p', { class: 'sub' }, z.content), z.resident ? h('p', null, `${this.d.residentById[z.resident]?.name || ''} has joined the island!`) : null), footerRender: this.ok('Explore!') });
  }
  arrival(id, line) {
    const r = this.d.residentById[id]; if (!r) return;
    this.ui.modal({ title: 'A new neighbour!', cls: 'small', render: () => h('div', null, this.speak(id, line || `Hello, I'm ${r.name}!`, 'excited'), h('p', { class: 'sub center' }, `${r.name} · ${r.role}`)), footerRender: this.ok('Welcome!') });
  }
  resident(id) {
    const g = this.g, d = this.d, r = d.residentById[id]; if (!r) return;
    this.ui.modal({
      title: r.name, cls: 'small',
      render: () => {
        const qs = g.activeQuests().filter(q => q.giver === id); const reqs = g.s.requests.list.filter(x => x.res === id && !x.done);
        const line = qs.length ? d.t(qs[0].textKey) : d.t(`res.${id}.arrive`, 'Good to see you!');
        const w = h('div', null, this.speak(id, line, qs.length && g.questComplete(qs[0]) ? 'excited' : 'neutral'), h('p', { class: 'sub' }, `${r.role} · Favorite: ${r.fav}`));
        qs.forEach(q => w.append(h('div', { class: 'card', onclick: () => this.questDetail(q.id), style: { cursor: 'pointer' } }, h('b', null, 'Quest'), h('div', { class: 'sub' }, g.questProgress(q).map(p => p.text).join(' · ')))));
        reqs.forEach(x => w.append(h('div', { class: 'card' }, h('b', null, 'Request'), h('div', { class: 'row' }, this.itemChip(x.item, `${x.have}/${x.count}`), this.rewardChips([x.reward])))));
        return w;
      },
      footerRender: this.ok('Close')
    });
  }
  levelUp(ev) {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: `Level ${ev.level}!`, cls: 'small',
      render: () => h('div', { class: 'center' }, h('div', { style: { fontSize: '3rem' } }, '⭐'), h('p', { style: { fontWeight: 800 } }, 'Your energy is fully restored!'), this.rewardChips(ev.rewards), ev.pocket ? h('p', { class: 'sub' }, 'A hidden pocket of land opened up.') : null, this.nextUnlockText(ev.level)),
      footerRender: this.ok('Great!')
    });
  }
  nextUnlockText(level) {
    const d = this.d, g = this.g; const z = d.zones.find(z => z.n === g.nextZone()); if (!z) return null;
    return h('p', { class: 'sub' }, `Next zone: ${z.name} (level ${z.unlock.level})`);
  }

  /* ---------------------------------------------------------- economy */
  profile() {
    const g = this.g, s = g.s, d = this.d;
    this.ui.modal({
      title: 'Your journey', cls: 'small',
      render: () => {
        const need = g.xpForLevel(s.player.level); const st = s.stats;
        const row = (a, b) => h('div', { class: 'row', style: { justifyContent: 'space-between', padding: '2px 0', fontWeight: 700 } }, h('span', null, a), h('span', null, b));
        return h('div', null, h('h3', { class: 'center' }, `Level ${s.player.level}`), this.progressBar(s.player.xp / need), h('p', { class: 'sub center' }, `${s.player.xp} / ${need} XP`),
          row('Merges', fmt(st.merges)), row('Obstacles cleared', fmt(st.cleared)), row('Buildings built', st.built), row('Zones unlocked', `${s.zones.unlocked.length} / ${d.zones.length}`), row('Items discovered', `${st.discovered} / ${d.items.length}`), row('Play time', fmtTime(s.playtime)));
      },
      footerRender: this.ok('Close')
    });
  }
  shop() {
    const g = this.g, d = this.d; let tab = 'deals';
    this.ui.modal({
      title: 'Shop', cls: 'wide',
      render: m => {
        const s = g.s, eco = d.economy;
        const wrap = h('div'); wrap.append(this.tabs([['deals', 'Daily deals'], ['energy', 'Energy'], ['storage', 'Storage'], ['pearls', 'Pearls']], tab, t => { tab = t; }, m));
        const body = h('div', { style: { paddingTop: '8px' } });
        if (tab === 'deals') {
          body.append(h('p', { class: 'sub' }, 'Three fresh items every day.'));
          const deals = g.shopDeals();
          body.append(h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } }, deals.map((x, i) => h('div', { class: 'card center' }, this.itemChip(x.id, ''), x.bought ? h('b', null, 'Sold') : h('button', { class: 'btn small' + (s.player.coins >= x.price ? '' : ' off'), onclick: () => { const r = g.buyDeal(i); if (r.ok) { this.app.audio.sfx('coin'); this.app.afterCommand(); } } }, icon('coin'), x.price)))));
        } else if (tab === 'energy') this.energyBlock(body, m);
        else if (tab === 'storage') {
          const bought = s.flags.slotsBought || 0, cost = eco.storage.slotCost * (bought + 1);
          body.append(h('p', null, `Storage slots: ${s.storageSlots} / ${eco.storage.max}`));
          body.append(h('div', { class: 'row' }, h('button', { class: 'btn' + (s.storageSlots < eco.storage.max && s.player.coins >= cost ? '' : ' off'), onclick: () => { const r = g.buyStorageSlot(false); if (r.ok) this.app.audio.sfx('coin'); this.app.afterCommand(); } }, 'Buy slot ', icon('coin'), cost),
            h('button', { class: 'btn purple' + (s.storageSlots < eco.storage.max && s.player.pearls >= Math.max(5, Math.round(cost / 20)) ? '' : ' off'), onclick: () => { const r = g.buyStorageSlot(true); if (r.ok) this.app.audio.sfx('coin'); this.app.afterCommand(); } }, 'Buy slot ', icon('pearl'), Math.max(5, Math.round(cost / 20)))));
        } else {
          body.append(h('p', { class: 'center sub' }, 'Pearls come from chests, levels, weekly tasks and island rewards.'), h('p', { class: 'center sub' }, 'Real-money purchases are not part of this offline build. Everything in the game can be earned by playing.'));
        }
        wrap.append(body); return wrap;
      }
    });
  }
  energyBlock(body, m) {
    const g = this.g, d = this.d, eco = d.economy.refill, s = g.s; const en = g.energyNow(), cap = d.economy.energy.max;
    body.append(h('div', { class: 'row' }, icon('energy'), h('b', null, `${en} / ${cap}`), en < cap ? h('span', { class: 'sub' }, '  next +1 in ', h('span', { 'data-until': g.now() + g.secondsToNextEnergy() * 1000 })) : null));
    body.append(this.progressBar(en / cap));
    const act = (fn, snd = 'energy') => () => { const r = fn(); if (r.ok) { this.app.audio.sfx(snd); this.app.afterCommand(); m.render?.(); } else this.app.toast(r.reason === 'noCoins' ? 'Not enough coins' : r.reason === 'noPearls' ? 'Not enough pearls' : r.reason === 'cooldown' ? `Next ad in ${fmtTime(r.wait)}` : 'Not available', 'bad'); };
    const ad = g.adStatus();
    body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', null, `+${eco.coins.energy} energy`), h('div', { class: 'sub' }, 'Buy with coins')), h('button', { class: 'btn' + (s.player.coins >= eco.coins.cost ? '' : ' off'), onclick: act(() => g.refillEnergy('coins')) }, icon('coin'), eco.coins.cost))));
    body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', null, `+${eco.pearls.energy} energy`), h('div', { class: 'sub' }, 'Buy with pearls')), h('button', { class: 'btn purple' + (s.player.pearls >= eco.pearls.cost ? '' : ' off'), onclick: act(() => g.refillEnergy('pearls')) }, icon('pearl'), eco.pearls.cost))));
    body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', null, `+${eco.adEnergy} energy`), h('div', { class: 'sub' }, `Optional demo ad · ${ad.left} left today${ad.wait ? ' · wait ' + fmtTime(ad.wait) : ''}`)), h('button', { class: 'btn good' + (ad.ok ? '' : ' off'), onclick: () => this.demoAd(act(() => g.rewardAd())) }, '▶ Watch'))));
    if (en === 0) { const can = g.rescueEnergy; body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', null, 'Out of energy?'), h('div', { class: 'sub' }, 'A free emergency boost, once a day.')), h('button', { class: 'btn alt', onclick: act(() => g.rescueEnergy()) }, 'Claim')))); }
  }
  demoAd(done) {
    this.ui.modal({ title: 'Demo ad', cls: 'small', noClose: true, render: m => { const bar = h('div', { class: 'pbar' }, h('i', { style: { width: '0%', transition: 'width 3s linear' } })); setTimeout(() => { bar.firstChild.style.width = '100%'; }, 30); setTimeout(() => { m.close(); done(); }, 3100); return h('div', { class: 'center' }, h('div', { style: { fontSize: '3rem' } }, '📺'), h('p', null, 'This is a placeholder for an optional rewarded ad. No real ads are shown in this build.'), bar); } });
  }
  refill() {
    const g = this.g;
    this.ui.modal({ title: g.energyNow() <= 0 ? 'Out of energy!' : 'Energy', cls: 'small', render: m => { const b = h('div'); this.energyBlock(b, m); return b; } });
  }
  buySlot() { this.shop(); }
  overflow() {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: 'Overflow bubbles', cls: 'small',
      render: m => { const list = g.ctx.overflow; if (!list.length) { setTimeout(() => m.close(), 0); return h('p', null, 'Empty'); } return h('div', null, h('p', { class: 'sub' }, 'These items had no room. Free some space, then place them.'), list.map((it, i) => h('div', { class: 'card row' }, itemCanvas(d, it.id, 44, it.sp), h('b', { style: { flex: 1 } }, d.name(it.id)), h('button', { class: 'btn small', onclick: () => { const r = g.popOverflow(i, this.app.defaultCursorNearView()); if (!r.ok) this.app.toast(d.t('ui.noSpace'), 'bad'); else this.app.afterCommand(); } }, 'Place')))); },
      footerRender: this.ok('Close')
    });
  }
  trade() {
    const g = this.g, d = this.d; let tab = 'orders';
    if (!g.marketOpen()) { this.app.toast('Build the Market Stall first.'); return; }
    this.ui.modal({
      title: 'Trade Dock', cls: 'wide',
      render: m => {
        const wrap = h('div'); wrap.append(this.tabs([['orders', 'Orders'], ['market', 'Market']], tab, t => { tab = t; }, m));
        const body = h('div', { style: { paddingTop: '8px' } });
        if (tab === 'orders') {
          const orders = g.s.trade.orders; if (!orders.length) body.append(h('p', { class: 'center sub' }, 'New orders are on the way…'));
          orders.forEach(o => { const can = g.canFillOrder(o); body.append(h('div', { class: 'card' + (can ? ' good' : '') }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, o.merchant), h('span', { class: 'sub' }, '⏳ ', h('span', { 'data-until': o.expiresAt }))), h('div', { class: 'row wrap' }, o.items.map(r => this.itemChip(r.item, `${Math.min(g.countItem(r.item), r.count)}/${r.count}`, g.countItem(r.item) >= r.count ? 'have' : 'need'))), h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '6px' } }, this.pill('coin', o.reward), h('button', { class: 'btn good small' + (can ? '' : ' off'), onclick: () => { const r = g.fulfillOrder(o.id); if (r.ok) this.app.afterCommand(); } }, 'Deliver')))); });
          body.append(h('p', { class: 'sub center' }, `Every ${d.economy.trade.chestEvery}th order brings a bonus chest. Slots: ${g.tradeSlots()}`));
        } else {
          body.append(h('p', { class: 'sub' }, `Prices change daily. Sell 5+ of one item for a bulk bonus (+10%), 10+ for +25%${g.tradeTier() > 1 ? ' (and more with your dock tier)' : ''}.`));
          const inv = [...g.inventory().values()].filter(x => g.marketQuote(x.id, 1).unit > 0).sort((a, b) => d.item(b.id).sellValue - d.item(a.id).sellValue);
          if (!inv.length) body.append(h('p', { class: 'center sub' }, 'Nothing sellable on the island right now.'));
          inv.forEach(x => { const cat = d.chain(d.item(x.id).chain).tradeCategory || 'craft'; const tr = g.factorTrend(cat); const q1 = g.marketQuote(x.id, 1), qa = g.marketQuote(x.id, x.count);
            body.append(h('div', { class: 'card row' }, this.itemChip(x.id, '×' + x.count), h('div', { style: { flex: 1 } }, h('b', null, d.name(x.id)), h('div', { class: 'sub' }, `${Math.round(q1.unit)} each ${tr > 0 ? '▲' : tr < 0 ? '▼' : '•'}  ${cat}`)),
              h('button', { class: 'btn small ghost', onclick: () => { g.sellStack(x.id, 1); this.app.afterCommand(); } }, 'Sell 1'),
              x.count > 1 ? h('button', { class: 'btn small', onclick: () => { g.sellStack(x.id, x.count); this.app.afterCommand(); } }, 'All ', icon('coin', 'inl'), qa.total) : null)); });
        }
        wrap.append(body); return wrap;
      }
    });
  }

  /* ---------------------------------------------------------- journal */
  journal() {
    const g = this.g, d = this.d, s = g.s; let tab = 'items';
    this.ui.modal({
      title: 'Journal', cls: 'wide',
      render: m => {
        const wrap = h('div'); wrap.append(this.tabs([['items', 'Items'], ['ach', 'Achievements'], ['relics', 'Relics'], ['pets', 'Pets']], tab, t => { tab = t; }, m));
        const body = h('div', { style: { paddingTop: '8px' } });
        if (tab === 'items') {
          body.append(h('p', { class: 'sub' }, `Discovered ${s.stats.discovered} of ${d.items.length} items. Each first discovery pays coins and XP.`));
          for (const c of d.chains) {
            if (c.family === 'generator') continue;
            const ids = d.items.filter(i => i.chain === c.chain).map(i => i.id); const found = ids.filter(id => s.journal.discovered[id]).length;
            if (!found && !g.chainUnlocked(c.chain)) continue;
            body.append(h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, c.name), h('span', { class: 'pill' }, `${found}/${ids.length}`)), h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(3.6rem,1fr))', marginTop: '4px' } }, ids.map(id => { const known = !!s.journal.discovered[id]; return h('div', { class: 'ichip' + (known ? ' have' : ' unknown'), title: known ? d.name(id) : 'Not yet discovered' }, itemCanvas(d, id, 50), h('span', null, known ? d.name(id) : '???')); }))));
          }
        } else if (tab === 'ach') {
          const done = Object.keys(s.ach.done).length; body.append(h('p', { class: 'sub' }, `${done} of ${d.achievements.length} complete`));
          for (const a of d.achievements) { const v = g.statValue(a.stat), ok = !!s.ach.done[a.id]; body.append(h('div', { class: 'card' + (ok ? ' good' : '') }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, (ok ? '✔ ' : '') + a.text), this.rewardChips(this.achRewards(a.reward))), this.progressBar(v / a.goal), h('div', { class: 'sub' }, `${Math.min(v, a.goal)} / ${a.goal}`))); }
        } else if (tab === 'relics') {
          body.append(h('p', { class: 'sub' }, `Relics found in chests: ${s.journal.relics.length} / ${d.relics.length}. They are displayed in the Museum.`));
          body.append(h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(2,1fr)' } }, d.relics.map((n, i) => { const f = s.journal.relics.includes(i); return h('div', { class: 'card center', style: { opacity: f ? 1 : 0.45 } }, h('div', { style: { fontSize: '1.6rem' } }, f ? '🏺' : '❔'), h('b', null, f ? n : '???')); })));
        } else this.petList(body, m);
        wrap.append(body); return wrap;
      }
    });
  }
  achRewards(r = {}) { const o = []; if (r.coins) o.push({ type: 'coins', amount: r.coins }); if (r.pearls) o.push({ type: 'pearls', amount: r.pearls }); if (r.energy) o.push({ type: 'energy', amount: r.energy }); if (r.item) o.push({ type: 'item', item: r.item }); return o; }
  pets() {
    this.ui.modal({ title: 'Pets', cls: 'wide', render: m => { const b = h('div'); this.petList(b, m); return b; }, footerRender: this.ok('Close') });
  }
  petList(body, m) {
    const g = this.g, d = this.d, s = g.s; const slots = g.petSlots();
    body.append(h('p', { class: 'sub' }, `Active pets: ${s.activePets.length} / ${slots}. Merge Pet Eggs up to a hatchling and tap it to meet a new friend.`));
    for (const p of d.pets) {
      const own = s.petsOwned.includes(p.id), act = s.activePets.includes(p.id);
      body.append(h('div', { class: 'card row', style: { opacity: own ? 1 : 0.55 } }, h('div', { style: { width: '3.6rem', flex: 'none' } }, own ? itemCanvas(d, 'pet_06', 56, p.id) : h('div', { style: { fontSize: '2rem', textAlign: 'center' } }, '❔')),
        h('div', { style: { flex: 1 } }, h('b', null, own ? `${p.name} the ${p.species}` : '???'), h('div', { class: 'sub' }, own ? p.perk : 'Not found yet')),
        own ? h('button', { class: 'btn small ' + (act ? 'good' : 'ghost'), onclick: () => { if (act) s.activePets = s.activePets.filter(x => x !== p.id); else { if (s.activePets.length >= slots) s.activePets.shift(); s.activePets.push(p.id); } this.app.dirty = true; m.render(); } }, act ? 'Active' : 'Set active') : null));
    }
  }
  petFound(ev) {
    const d = this.d, p = d.petById[ev.pet]; if (!p) return;
    this.ui.modal({ title: ev.dup ? 'A familiar friend' : 'New pet!', cls: 'small', render: () => h('div', { class: 'center' }, itemCanvas(d, 'pet_06', 96, p.id), h('h3', null, `${p.name} the ${p.species}`), h('p', null, p.perk), ev.dup ? h('p', { class: 'sub' }, 'You already had this pet, so it left you 200 coins.') : h('p', { class: 'sub' }, 'Manage your pets from the Pets button.')), footerRender: this.ok('Aww!') });
  }
  event() {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: 'Event', cls: 'small',
      render: () => {
        const e = g.eventState(); const track = d.events.track;
        return h('div', null, h('h3', { class: 'center' }, `${e.template.name}: ${e.theme}`), h('p', { class: 'sub' }, e.template.desc), h('div', { class: 'row' }, h('span', { class: 'pill gold' }, `🎟 ${e.tokens} tokens`), e.active ? h('span', { class: 'sub' }, 'ends in ', h('span', { 'data-until': e.endMs })) : h('span', { class: 'sub' }, 'Not running')),
          track.slice(0, 15).map(([need, r], i) => h('div', { class: 'row', style: { padding: '3px 0', opacity: i < e.claimed ? 0.5 : 1 } }, h('span', null, i < e.claimed ? '✔' : '🎁'), h('span', { style: { flex: 1 } }, `${need} tokens`), this.rewardChips(this.achRewards(r)))));
      },
      footerRender: this.ok('Close')
    });
  }

  /* --------------------------------------------------------- expeditions */
  islands() {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: 'Expeditions', cls: 'wide',
      render: () => {
        const w = h('div'); w.append(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('p', { class: 'sub', style: { margin: 0 } }, 'Each island has one special rule. Your first visit costs 1 ticket.'), this.pill('ticket', g.s.player.tickets)));
        for (const def of d.islands) {
          const st = g.islandStatus(def.id); const goals = st.goals; const done = st.state === 'done';
          w.append(h('div', { class: 'card' + (done ? ' good' : ''), style: { opacity: st.unlocked ? 1 : 0.6 } }, h('div', { class: 'row' }, this.face(def.guide, 'neutral', 56), h('div', { style: { flex: 1 } }, h('b', null, def.name), h('div', { class: 'sub' }, st.unlocked ? def.story : `Unlocks at level ${def.level}`), st.unlocked ? h('div', { class: 'sub' }, `Goals: ${def.goals.filter((gl, i) => goals[i] >= (gl.count || 1)).length} / ${def.goals.length}${done ? ' ✔' : ''}`) : null),
            h('button', { class: 'btn small' + (st.unlocked ? '' : ' off'), onclick: () => this.enterIsland(def.id) }, done ? 'Revisit' : st.state === 'new' ? h('span', null, 'Go ', icon('ticket', 'inl'), '1') : 'Continue'))));
        }
        return w;
      },
      footerRender: this.ok('Close')
    });
  }
  harbor() { this.islands(); }
  enterIsland(id) {
    const g = this.g, d = this.d, def = d.islandById[id]; const st = g.islandStatus(id);
    if (!st.unlocked) { this.app.toast(`Unlocks at level ${def.level}`); return; }
    if (st.state === 'new' && g.s.player.tickets < 1) { this.app.toast('You need an Expedition Ticket. Find them in chests and on the board.', 'bad'); return; }
    const inv = [...g.inventory().values()].filter(x => d.item(x.id).family !== 'generator' && !d.chain(d.item(x.id).chain).chest && !d.chain(d.item(x.id).chain).currency).sort((a, b) => d.item(b.id).level - d.item(a.id).level);
    const pick = {}; const maxN = d.economy.island.supplySlots; const total = () => Object.values(pick).reduce((a, b) => a + b, 0);
    this.ui.modal({
      title: `To ${def.name}`, cls: 'wide',
      render: m => h('div', null, this.speak(def.guide, def.story),
        h('b', null, `Supply crate (${total()}/${maxN})`), h('p', { class: 'sub' }, 'Bring up to five items from home. They land next to the generator on the island. Choose useful tools or crops!'),
        h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(4.2rem,1fr))' } }, inv.map(x => h('button', { class: 'ichip' + (pick[x.id] ? ' pick' : ''), style: { font: 'inherit' }, onclick: () => { if (total() < maxN && (pick[x.id] || 0) < x.count) pick[x.id] = (pick[x.id] || 0) + 1; else if (pick[x.id]) delete pick[x.id]; m.render(); } }, itemCanvas(d, x.id, 46), h('span', null, d.name(x.id)), h('span', { class: 'cnt' }, `${pick[x.id] || 0}/${x.count}`))))),
      footerRender: m => [h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancel'), h('button', { class: 'btn good', onclick: () => {
        const skip = new Set(), srcs = []; for (const [iid, n] of Object.entries(pick)) for (let k = 0; k < n; k++) { const src = g.findItem(iid, skip); if (src) { skip.add(src.type === 'tray' ? `t${src.slot}` : `b${src.idx}`); srcs.push(src); } }
        const r = g.enterIsland(id, srcs); if (r.ok) { this.ui.closeAll(); this.app.afterCommand(); } else this.app.toast('Cannot travel: ' + r.reason, 'bad'); } }, 'Set sail ⛵')]
    });
  }
  islandGoals() {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: 'Island goals', cls: 'small',
      render: () => {
        const id = g.ctx.islandId; if (!id) return h('p', null, 'Not on an island.'); const def = d.islandById[id], st = g.islandState(id), ci = g.islandChargeInfo();
        return h('div', null, h('div', { class: 'row' }, this.pill('energy', `${ci.charges}/${ci.cap}`), ci.seconds ? h('span', { class: 'sub' }, 'next charge ', h('span', { 'data-until': g.now() + ci.seconds * 1000 })) : null),
          def.goals.map((gl, i) => { const p = st.goals[i] || 0, need = gl.count || 1; return h('div', { class: 'card' + (p >= need ? ' good' : '') }, h('b', null, `${p >= need ? '✔ ' : ''}${gl.text}`), this.progressBar(p / need), h('div', { class: 'sub' }, `${p}/${need}`)); }),
          h('p', { class: 'sub' }, `Rule: ${def.story}`), this.rewardsOfIsland(def));
      },
      footerRender: m => [h('button', { class: 'btn alt', onclick: () => { m.close(); this.app.leaveIsland(); } }, 'Go home'), h('button', { class: 'btn good', onclick: () => m.close() }, 'Keep playing')]
    });
  }
  rewardsOfIsland(def) { return h('div', { class: 'row wrap' }, h('span', { class: 'sub' }, 'Rewards:'), def.rewards.map(r => r.amulet ? this.pill('amulet', 1) : r.pearls ? this.pill('pearl', r.pearls) : r.item ? h('span', { class: 'pill' }, itemCanvas(this.d, r.item, 22), (r.count || 1) + '×') : null)); }
  islandGuide(id) { this.islandGoals(); }
  islandDone(id) {
    const def = this.d.islandById[id];
    this.ui.modal({ title: `${def.name} restored!`, cls: 'small', render: () => h('div', null, this.speak(def.guide, 'You did it! Thank you!', 'excited'), this.rewardsOfIsland(def), def.decor ? h('p', { class: 'sub' }, `Unlocked decoration: ${def.decor}`) : null), footerRender: m => [h('button', { class: 'btn alt', onclick: () => { m.close(); } }, 'Keep playing'), h('button', { class: 'btn good', onclick: () => { m.close(); this.app.leaveIsland(); } }, 'Go home')] });
  }

  /* ----------------------------------------------------- places & living */
  login() { this.cottage(true); }
  cottage(auto = false) {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: auto ? 'Daily gift' : "Marlene's Cottage", cls: 'small',
      render: () => {
        const cyc = d.economy.loginCycle, s = g.s; const avail = g.loginAvailable(); const y = s.login.claimed; const nextDay = avail ? (this.streakAlive() ? (s.login.day % 7) + 1 : 1) : null;
        return h('div', null, h('p', { class: 'sub' }, 'Come back every day for a bigger gift. Miss a day and the week starts over.'),
          h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, cyc.map((c, i) => { const day = i + 1; const claimed = !avail ? day <= s.login.day : (this.streakAlive() && day <= s.login.day); const isNext = nextDay === day;
            return h('div', { class: 'card center', style: { padding: '4px', borderColor: isNext ? 'var(--gold)' : undefined, background: claimed ? '#f0fff4' : undefined, marginBottom: 0 } }, h('div', { class: 'sub' }, `Day ${day}`), h('div', { class: 'row', style: { justifyContent: 'center' } }, c.items.slice(0, 2).map(id => itemCanvas(d, id, 28))), claimed ? '✔' : ''); })),
          !avail ? h('p', { class: 'center sub' }, 'Today\'s gift is claimed. See you tomorrow!') : null);
      },
      footerRender: m => g.loginAvailable() ? [h('button', { class: 'btn good', onclick: () => { const r = g.claimLogin(); if (r.ok) { this.app.audio.sfx('chest'); this.app.afterCommand(); } m.render(); } }, 'Claim gift')] : [this.ok('Close')(m)]
    });
  }
  streakAlive() { const g = this.g, s = g.s; if (!s.login.claimed) return false; const dk = t => new Date(t).toISOString().slice(0, 10); return s.login.claimed === dk(g.now() - 86400000) || s.login.claimed === dk(g.now()); }
  museum() {
    const g = this.g, d = this.d, s = g.s;
    this.ui.modal({ title: 'Museum', cls: 'small', render: () => h('div', null, h('p', { class: 'sub' }, `Relics found: ${s.journal.relics.length} / ${d.relics.length}`), s.journal.relics.length ? h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(2,1fr)' } }, s.journal.relics.map(i => h('div', { class: 'card center' }, h('div', { style: { fontSize: '1.6rem' } }, '🏺'), h('b', null, d.relics[i])))) : h('p', { class: 'center sub' }, 'Open chests to discover relics.'), (s.journal.decor || []).length ? h('p', { class: 'sub' }, 'Island decorations: ' + s.journal.decor.join(', ')) : null), footerRender: this.ok('Close') });
  }
  temple() {
    const g = this.g, d = this.d;
    this.ui.modal({
      title: 'Great Temple', cls: 'small',
      render: () => { const done = d.islands.filter(i => g.s.islands[i.id]?.state === 'done').length; const open = !!g.s.flags.sunGateOpen; return h('div', null, h('p', { class: 'sub' }, 'The Sun Gate opens when all six island amulets rest in the temple.'), h('div', { class: 'row center' }, h('b', null, `Islands restored: ${done} / 6`)), this.progressBar(done / 6), open ? h('p', { class: 'center', style: { fontWeight: 800 } }, '☀ The Sun Gate is open!') : null); },
      footerRender: m => g.s.flags.sunGateOpen ? [this.ok('Close')(m)] : [h('button', { class: 'btn good', onclick: () => { const r = g.openSunGate(); if (!r.ok) this.app.toast(r.reason === 'amulets' ? 'Restore all six islands first.' : 'Build the temple first.'); else this.app.afterCommand(); m.render(); } }, 'Open the Sun Gate')]
    });
  }
  living(slotId, kind) {
    const g = this.g, d = this.d; const slotKind = kind === 'soil' ? 'soil' : slotId.replace('perch_', '');
    const opts = d.living.filter(l => l.slot === slotKind);
    this.ui.modal({ title: kind === 'soil' ? 'Fertile Soil' : 'Animal Perch', cls: 'small', render: () => h('div', null, h('p', { class: 'sub' }, kind === 'soil' ? 'Drag a fully grown crop here to plant it. It keeps producing items while you are away.' : 'Drag the matching top-level animal here to move it in. It keeps producing.'), opts.map(l => h('div', { class: 'card row' }, itemCanvas(d, l.item, 44), h('div', { style: { flex: 1 } }, h('b', null, l.name), h('div', { class: 'sub' }, l.coins ? `${l.coins} coins every ${l.coinsEveryHours} h` : `Makes ${d.name(l.produces)} every ${l.everyHours} h (stores ${l.store})`))))), footerRender: this.ok('Close') });
  }
  welcomeBack(off) {
    const g = this.g, s = g.s;
    this.ui.modal({
      title: 'Welcome back!', cls: 'small',
      render: () => {
        const ready = s.living.filter(l => l.stored > 0).length; const pay = Object.keys(s.built).filter(b => this.d.buildingById[b].daily && g.payoutReady(b)).length;
        const gained = Math.max(0, off.energyAfter - off.energyBefore);
        const line = (a, b) => h('div', { class: 'row', style: { justifyContent: 'space-between', padding: '3px 0', fontWeight: 700 } }, h('span', null, a), h('span', null, b));
        return h('div', null, h('p', { class: 'center sub' }, `You were away for ${fmtTime(off.seconds)}.`), line('Energy restored', `+${gained}`), ready ? line('Farm items ready', ready) : null, pay ? line('Daily payouts ready', pay) : null, g.s.gifts.bubble ? line('A gift bubble is waiting', '🎁') : null, off.forwardCapped ? h('p', { class: 'sub' }, 'Offline progress is capped at 24 hours.') : null, off.backwards ? h('p', { class: 'sub' }, 'Your device clock moved backwards; timers were adjusted.') : null);
      },
      footerRender: this.ok('Let\'s go')
    });
  }

  /* ------------------------------------------------------------ settings */
  settings() {
    const app = this.app, g = this.g, s = g.s.settings;
    const set = (k, v) => { g.setSetting(k, v); app.applySettings(); app.dirty = true; };
    this.ui.modal({
      title: 'Settings', cls: 'wide',
      render: m => {
        const tog = (k, label, sub) => h('div', { class: 'toggle' }, h('div', null, h('div', null, label), sub ? h('div', { class: 'sub' }, sub) : null), h('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!s[k]), 'aria-label': label, onclick: e => { set(k, !s[k]); e.currentTarget.setAttribute('aria-checked', String(!!s[k])); if (k === 'musicOn') app.syncMusic(true); } }));
        const sld = (k, label, min, max, step, fmtv) => { const out = h('span', { class: 'sub' }, fmtv(s[k])); return h('div', null, h('div', { class: 'row', style: { justifyContent: 'space-between', fontWeight: 700 } }, h('span', null, label), out), h('input', { class: 'slider', type: 'range', min, max, step, value: s[k], 'aria-label': label, oninput: e => { const v = +e.target.value; set(k, v); out.textContent = fmtv(v); }, onchange: () => app.audio.sfx('ui') })); };
        const sel = (k, label, opts) => h('div', { class: 'toggle' }, h('span', null, label), h('div', { class: 'row' }, opts.map(([v, t]) => h('button', { class: 'btn small ' + (s[k] === v ? 'good' : 'ghost'), onclick: () => { set(k, v); m.render(); } }, t))));
        const sec = t => h('h4', { style: { margin: '12px 0 4px', color: 'var(--sea-d)' } }, t);
        const file = h('input', { type: 'file', accept: '.json,.txt,application/json', class: 'hidden', onchange: e => this.importSave(e.target.files[0]) });
        return h('div', null,
          sec('Sound'), tog('musicOn', 'Music'), sld('music', 'Music volume', 0, 1, 0.05, v => Math.round(v * 100) + '%'), tog('sfxOn', 'Sound effects'), sld('sfx', 'Effects volume', 0, 1, 0.05, v => Math.round(v * 100) + '%'), tog('haptics', 'Vibration', 'On devices that support it'),
          sec('Gameplay'), tog('hints', 'Hints', 'Highlights a move after a few idle seconds'), tog('confirmMerge', 'Confirm small merges', 'Ask before merging 3 or 4 items'), tog('tapToMove', 'Tap to move', 'Tap an item, then tap where it should go (no dragging)'),
          sec('Accessibility'), sld('textScale', 'Text size', 100, 150, 10, v => v + '%'), tog('patterns', 'Colour patterns', 'Adds a pattern to each item family so colour is never the only clue'), tog('reduceMotion', 'Reduce motion', 'Fewer particles, no screen shake or animation'),
          sec('Performance'), sel('quality', 'Graphics', [['high', 'High'], ['low', 'Low']]), sel('fpsCap', 'Frame rate', [[30, '30'], [60, '60']]),
          sec('Your save'), h('p', { class: 'sub' }, 'Progress is saved on this device only (no account, no server). Export a backup to move it to another browser.'),
          h('div', { class: 'row wrap' }, h('button', { class: 'btn alt small', onclick: () => this.exportSave() }, 'Export save'), h('button', { class: 'btn alt small', onclick: () => file.click() }, 'Import save'), file, h('button', { class: 'btn ghost small', onclick: () => this.ui.confirm({ title: 'Start over?', text: 'This erases your island forever. Export a backup first if unsure.', yes: 'Erase everything', no: 'Keep playing', onYes: () => app.newGame() }) }, 'Reset game')),
          sec('Replay'), h('div', { class: 'row wrap' }, h('button', { class: 'btn ghost small', onclick: () => { m.close(); g.s.tutorial = { step: 0, done: false }; app.tutorial.begin(); } }, 'Replay tutorial')),
          sec('About'), h('p', { class: 'sub' }, 'Tropical Merge · English. Art and music are generated by the game itself. Works offline once loaded.'),
          h('p', { class: 'sub' }, h('b', null, `Version ${VERSION}`), ` · build ${BUILD.slice(0, 7)} · ${builtLabel()}`),
          h('div', { class: 'row wrap' }, h('button', { class: 'btn alt small', onclick: async e => {
            const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Checking…';
            const r = await checkForUpdate(app, true);
            if (r === 'current') app.toast(`You have the latest version (v${VERSION}).`, 'good');
            else if (r === 'offline') app.toast('Could not reach the server. Are you offline?', 'bad');
            if (r !== 'updating') { btn.disabled = false; btn.textContent = 'Check for updates'; }
          } }, 'Check for updates')));
      },
      footerRender: this.ok('Done')
    });
  }
  exportSave() {
    const g = this.g, text = this.app.store.exportText(g.serialize());
    const blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `tropical-merge-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.app.toast('Save exported.', 'good');
  }
  async importSave(file) {
    if (!file) return;
    const text = await file.text(); const doc = this.app.store.importText(text);
    if (!doc || !doc.state) { this.app.toast('That file is not a valid save.', 'bad'); return; }
    this.ui.confirm({ title: 'Import this save?', text: 'It will replace the island on this device.', yes: 'Import', no: 'Cancel', onYes: async () => { await this.app.store.save(doc); location.reload(); } });
  }
}
