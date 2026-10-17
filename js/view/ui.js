// DOM layer: micro element builder, HUD, tray, quest tracker, toasts, info cards and the modal stack.
import { iconURL, getResidentPortrait } from './world-art.js';
import { itemIcon, getSprite } from './art.js';
import { versionLabel } from './updater.js';

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'data') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
export const icon = (name, cls = '') => h('img', { src: iconURL(name, 64), alt: '', class: cls, draggable: 'false' });
export function itemCanvas(data, id, size = 64, sp = null) { const c = itemIcon(data, id, size * 2, sp); c.style.width = c.style.height = size + 'px'; return c; }
export function fmt(n) { n = Math.round(n); if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k'; return String(n); }
export function fmtTime(sec) { sec = Math.max(0, Math.ceil(sec)); const m = Math.floor(sec / 60), s = sec % 60; if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`; return `${m}:${String(s).padStart(2, '0')}`; }

export class UI {
  constructor(app) {
    this.app = app; this.stack = []; this.toastTimers = []; this.sig = {}; this.infoEl = null; this.lootEl = null;
    this.hudRoot = document.getElementById('hud'); this.modalRoot = document.getElementById('modals'); this.toastRoot = document.getElementById('toasts');
  }
  get g() { return this.app.game; }
  get d() { return this.app.game.data; }

  /* ----------------------------------------------------------------- HUD */
  build() {
    const g = this.g, root = this.hudRoot; root.innerHTML = '';
    const E = this.el = {};
    E.lvlNum = h('b', null, '1'); E.lvlSmall = h('small', null, '');
    E.lvl = h('button', { class: 'lvl', 'aria-label': 'Player level', onclick: () => this.app.panels.profile() }, E.lvlNum, E.lvlSmall);
    const chip = (cls, ic, extra) => { const v = h('span', null, '0'); const el = h('div', { class: 'chip ' + cls }, icon(ic), v, extra); return { el, v }; };
    E.energyTime = h('small', null, '');
    E.plusE = h('button', { class: 'plus', 'aria-label': 'Refill energy', onclick: () => this.app.panels.refill() }, '+');
    E.ebar = h('div', { class: 'ebar' }, h('i'));
    E.energy = chip('energy', 'energy', [E.energyTime, E.plusE, E.ebar]);
    E.coins = chip('coins', 'coin'); E.pearls = chip('pearls', 'pearl'); E.amulets = chip('amulets', 'amulet');
    E.tickets = chip('tickets', 'ticket');
    E.coins.el.append(h('button', { class: 'plus', 'aria-label': 'Open shop', onclick: () => this.app.panels.shop() }, '+'));
    // magnet: sits just under the coin counter; tap it, then tap an item
    E.magnetTxt = h('span', null, '100');
    E.magnet = h('button', { class: 'magnetbtn hidden', 'aria-label': 'Magnet', onclick: () => this.app.toggleMagnet() }, icon('magnet', 'mi'), E.magnetTxt, icon('coin', 'mc'));
    E.coins.el.append(E.magnet);
    E.chips = h('div', { class: 'chips' }, E.energy.el, E.coins.el, E.pearls.el, E.amulets.el);
    E.settings = h('button', { class: 'round teal', 'aria-label': 'Settings', onclick: () => this.app.panels.settings() }, icon('gear'));
    root.append(h('div', { class: 'topbar' }, E.lvl, E.chips, E.settings));
    E.banner = h('div', { class: 'banner hidden' }); root.append(E.banner);
    E.tracker = h('div', { class: 'tracker', 'aria-label': 'Active quests' }); root.append(E.tracker);

    // right rail
    const rb = (name, ic, label, fn, cls = '') => { const dot = h('span', { class: 'dot hidden' }); const b = h('button', { class: `round rbtn ${cls}`, 'aria-label': label, onclick: fn }, icon(ic), dot, h('span', { class: 'label' }, label)); return { b, dot }; };
    E.btnQuest = rb('quest', 'quest', 'Quests', () => this.app.panels.quests());
    E.btnShop = rb('shop', 'shop', 'Shop', () => this.app.panels.shop(), 'red');
    E.btnTrade = rb('trade', 'trade', 'Trade dock', () => this.app.panels.trade(), 'teal');
    E.btnJournal = rb('journal', 'journal', 'Journal', () => this.app.panels.journal(), 'purple');
    E.btnPets = rb('pets', 'pet', 'Pets', () => this.app.panels.pets());
    E.btnMap = rb('map', 'map', 'Expeditions', () => this.app.panels.islands(), 'teal');
    E.rail = h('div', { class: 'rail' }, E.btnQuest.b, E.btnShop.b, E.btnTrade.b, E.btnJournal.b, E.btnPets.b, E.btnMap.b); root.append(E.rail);

    // dock
    E.tray = h('div', { class: 'tray', 'aria-label': 'Storage tray', data: { drop: 'trayany' } });
    E.sell = h('button', { class: 'sell', 'aria-label': 'Sell item: drag an item here', data: { drop: 'sell' }, onclick: () => this.toast('Drag an item here to sell it for coins.') }, icon('sell'), h('span', null, 'SELL'));
    E.leave = h('button', { class: 'sell leave hidden', 'aria-label': 'Return to the main island', onclick: () => this.app.leaveIsland() }, icon('boat'), h('span', null, 'HOME'));
    E.dock = h('div', { class: 'dock' }, E.leave, E.tray, E.sell); root.append(E.dock);
    root.append(h('div', { class: 'vtag', 'aria-hidden': 'true' }, versionLabel()));
    this.sig = {}; this.refresh(true);
  }

  refresh(force = false) {
    const g = this.g, E = this.el; if (!E) return; const s = g.s, p = s.player, eco = this.d.economy;
    const need = g.xpForLevel(p.level);
    this.set('lvl', p.level, () => { E.lvlNum.textContent = p.level; });
    this.set('xp', Math.round(p.xp / need * 100), v => E.lvl.style.setProperty('--xp', v));
    const isl0 = g.ctx.kind === 'island';
    if (isl0) {
      const ic = g.islandChargeInfo();
      this.set('enI', 'i' + ic.charges + '/' + ic.cap, () => { E.energy.v.textContent = `${ic.charges}/${ic.cap}`; E.ebar.firstChild.style.width = Math.min(100, ic.charges / ic.cap * 100) + '%'; E.energy.el.classList.toggle('low', ic.charges < 1); });
      this.set('entI', 'i' + ic.seconds, () => { E.energyTime.textContent = ic.seconds ? `+1 ${fmtTime(ic.seconds)}` : 'Full'; });
    } else {
    const en = g.energyNow(), cap = eco.energy.max;
    this.set('en', en, v => { E.energy.v.textContent = v; E.ebar.firstChild.style.width = Math.min(100, v / cap * 100) + '%'; E.energy.el.classList.toggle('low', v < 5); });
    const secs = en >= cap ? 0 : g.secondsToNextEnergy();
    this.set('ent', secs, v => { E.energyTime.textContent = v ? `+1 ${fmtTime(v)}` : (en > cap ? 'Full+' : 'Full'); });
    this.sig.enI = null; this.sig.entI = null;
    }
    this.set('co', p.coins, v => { E.coins.v.textContent = fmt(v); });
    this.set('pe', p.pearls, v => { E.pearls.v.textContent = fmt(v); });
    this.set('am', p.amulets, v => { E.amulets.v.textContent = fmt(v); });
    E.amulets.el.classList.toggle('hidden', p.amulets === 0 && !(s.zones.unlocked.length > 2) && !s.flags.sawAmulet);
    if (p.amulets > 0) s.flags.sawAmulet = 1;
    const isl = g.ctx.kind === 'island';
    E.leave.classList.toggle('hidden', !isl); E.sell.classList.toggle('hidden', false);
    E.rail.classList.toggle('hidden', isl);
    this.refreshChips(isl);
    this.refreshMagnet();
    this.refreshTracker(force);
    this.refreshRail();
    this.refreshTray(force);
    this.refreshBanner();
  }
  set(key, v, fn) { if (this.sig[key] !== v) { this.sig[key] = v; fn(v); } }
  refreshChips(isl) {
    const E = this.el, g = this.g, p = g.s.player; const hasTickets = g.s.zones.unlocked.length > 4 || p.tickets > 0;
    if (hasTickets && !E.tickets.el.isConnected) E.chips.append(E.tickets.el);
    if (E.tickets.el.isConnected) this.set('tk', p.tickets, v => { E.tickets.v.textContent = v; });
  }
  refreshMagnet() {
    const E = this.el, g = this.g, app = this.app;
    const info = g.magnetInfo(), show = !!g.s.tutorial.done, on = !!app.magnetMode;
    this.set('mgS', show, v => E.magnet.classList.toggle('hidden', !v));
    if (!show) return;
    this.set('mgT', info.ready ? 'c' + info.cost : 'w' + info.wait, () => { E.magnetTxt.textContent = info.ready ? String(info.cost) : fmtTime(info.wait); E.magnet.setAttribute('aria-label', info.ready ? `Magnet: ${info.cost} coins. Tap it, then tap an item to merge every matching item.` : `Magnet recharging: ${fmtTime(info.wait)} left`); });
    this.set('mgC', (info.ready ? 1 : 0) + ':' + (info.canAfford ? 1 : 0) + ':' + (on ? 1 : 0), () => { E.magnet.classList.toggle('cool', !info.ready); E.magnet.classList.toggle('poor', info.ready && !info.canAfford); E.magnet.classList.toggle('on', on); E.magnet.classList.toggle('ready', info.ready && info.canAfford && !on); });
  }
  refreshRail() {
    const E = this.el, g = this.g, s = g.s;
    E.btnTrade.b.classList.toggle('hidden', !g.marketOpen());
    E.btnPets.b.classList.toggle('hidden', !(s.petsOwned.length || s.player.level >= 10));
    E.btnMap.b.classList.toggle('hidden', s.player.level < this.d.islands[0].level - 3);
    E.btnJournal.b.classList.toggle('hidden', s.player.level < 3 && s.stats.discovered < 6);
    const dailyReady = (s.daily.tasks || []).some(t => t.done && !t.paid) ? 1 : 0;
    const readyQuests = g.activeQuests().filter(q => g.questComplete?.(q)).length;
    this.set('qd', readyQuests + (g.loginAvailable() ? 1 : 0) + dailyReady, v => { E.btnQuest.dot.textContent = v; E.btnQuest.dot.classList.toggle('hidden', !v); });
        this.set('tr', (s.trade.orders || []).filter(o => g.canFillOrder(o)).length, v => { E.btnTrade.dot.textContent = v; E.btnTrade.dot.classList.toggle('hidden', !v); });
  }
  refreshBanner() {
    const E = this.el, g = this.g; const ev = g.currentEvent?.();
    const text = ev && ev.active ? `🎉 ${ev.template.name}: ${ev.theme}` : '';
    this.set('bn', text, v => { E.banner.textContent = v; E.banner.classList.toggle('hidden', !v); if (v) { E.banner.onclick = () => this.app.panels.event(); E.banner.style.cursor = 'pointer'; } });
  }
  refreshTracker(force) {
    const E = this.el, g = this.g, d = this.d;
    if (g.ctx.kind === 'island') {
      const def = d.islandById[g.ctx.islandId], idx = g.currentGoalIndex(), st = g.islandState(g.ctx.islandId);
      const sig = 'isl' + g.ctx.islandId + JSON.stringify(st.goals);
      if (this.sig.trk === sig && !force) return; this.sig.trk = sig;
      E.tracker.innerHTML = '';
      def.goals.forEach((goal, i) => {
        const prog = st.goals[i] || 0, need = goal.count || 1, done = prog >= need;
        if (i > idx + 0 && !done && i !== idx) return;
        if (i < idx - 1 && done) return;
        E.tracker.append(h('button', { class: 'qcard' + (done ? ' done' : ''), onclick: () => this.app.panels.islandGoals() }, h('div', { class: 'txt' }, h('b', null, `${def.name} · Goal ${i + 1}`), this.islandGoalText(goal), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, prog / need * 100) + '%' } })))));
      });
      return;
    }
    const qs = g.activeQuests();
    const sig = qs.map(q => q.id + ':' + (g.s.quests.progress[q.id] || []).join(',')).join('|') + '|' + g.s.player.coins * 0;
    if (this.sig.trk === sig && !force) return; this.sig.trk = sig;
    E.tracker.innerHTML = '';
    for (const q of qs.slice(0, 3)) {
      const prog = g.questProgress(q); const res = d.residentById[q.giver];
      const first = prog.find(p => p.have < p.need) || prog[0]; const total = prog.reduce((s, p) => s + Math.min(1, p.have / p.need), 0) / prog.length;
      const done = g.questComplete(q);
      const face = h('div', { class: 'face' }); if (res) face.append(this.portrait(res, done ? 'excited' : 'neutral', 64));
      const txt = h('div', { class: 'txt' }, h('b', null, res ? res.name : ''), first.text + (first.need > 1 ? ` ${Math.min(first.have, first.need)}/${first.need}` : ''), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(total * 100) + '%' } })));
      E.tracker.append(h('button', { class: 'qcard' + (done ? ' done' : ''), onclick: () => this.app.panels.questDetail(q.id) }, face, txt, done ? h('span', { class: 'go' }, '✓') : null));
    }
  }
  islandGoalText(goal) { return this.app.goalText ? this.app.goalText(goal) : (goal.text || ''); }
  portrait(res, expr, px) { const c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(getResidentPortrait(res, expr, 128), 0, 0, px, px); return c; }

  /** Pulse a currency chip and float the gained amount. */
  bump(kind, delta) {
    const E = this.el; if (!E || !delta) return; const chip = E[kind]?.el; if (!chip || !chip.isConnected) return;
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    const r = chip.getBoundingClientRect(); const f = h('div', { class: 'floatnum' }, (delta > 0 ? '+' : '') + Math.round(delta));
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.bottom) + 'px'; document.getElementById('app').append(f); setTimeout(() => f.remove(), 1000);
  }
  /** Live countdowns: any element with data-until (ms timestamp) shows the time left. */
  tickTimers() {
    const now = this.g.now();
    for (const el of document.querySelectorAll('[data-until]')) { const left = (+el.dataset.until - now) / 1000; el.textContent = left > 0 ? fmtTime(left) : (el.dataset.done || 'Ready'); }
  }

  /* ------------------------------------------------------------- tray */
  refreshTray(force) {
    const E = this.el, g = this.g, ctx = g.ctx, tray = ctx.tray;
    const sig = tray.map(i => i ? i.id + (i.s ? '*' : '') : '-').join(',') + '|' + ctx.overflow.length + '|' + ctx.kind + '|' + (ctx.kind === 'home' ? g.s.storageSlots : 0) + '|' + (this.app.renderer?.drag?.src.type === 'tray' ? this.app.renderer.drag.src.slot : '');
    if (this.sig.tray === sig && !force) return; this.sig.tray = sig;
    E.tray.innerHTML = '';
    const dragSlot = this.app.renderer?.drag?.src.type === 'tray' ? this.app.renderer.drag.src.slot : -1;
    tray.forEach((it, i) => {
      const slot = h('div', { class: 'slot' + (it && i !== dragSlot ? ' full' : ''), data: { drop: 'tray', slot: i }, role: 'button', 'aria-label': it ? `Stored ${this.d.name(it.id)}` : 'Empty storage slot' });
      if (it && i !== dragSlot) {
        slot.append(itemCanvas(this.d, it.id, 44, it.sp));
        slot.addEventListener('pointerdown', e => this.app.startExternalDrag({ type: 'tray', slot: i }, it, e));
        slot.addEventListener('contextmenu', e => e.preventDefault());
      }
      E.tray.append(slot);
    });
    if (ctx.overflow.length) {
      const ob = h('button', { class: 'slot overflow', 'aria-label': 'Overflow items', onclick: () => this.app.panels.overflow() }, itemCanvas(this.d, ctx.overflow[0].id, 40, ctx.overflow[0].sp), h('span', { class: 'ofc' }, ctx.overflow.length));
      E.tray.append(ob);
    }
    if (ctx.kind === 'home' && g.s.storageSlots < this.d.economy.storage.max) E.tray.append(h('button', { class: 'slot buy', 'aria-label': 'Buy a storage slot', onclick: () => this.app.panels.buySlot() }, '+', h('br'), h('small', null, this.d.economy.storage.slotCost * ((g.s.flags.slotsBought || 0) + 1))));
  }

  /* ----------------------------------------------------------- toasts */
  toast(text, kind = '', ms = 2600) {
    const el = h('div', { class: 'toast ' + kind, role: 'status' }, text); this.toastRoot.append(el);
    while (this.toastRoot.children.length > 4) this.toastRoot.firstChild.remove();
    setTimeout(() => el.classList.add('out'), ms); setTimeout(() => el.remove(), ms + 450);
  }
  cascadeTag(text) { const el = h('div', { class: 'cascade-tag' }, text); document.getElementById('app').append(el); setTimeout(() => el.remove(), 1000); }
  loot(items, title = 'Found') {
    if (this.lootEl) this.lootEl.remove();
    const el = h('div', { class: 'infocard', style: { left: '50%', top: '28%', transform: 'translateX(-50%)', width: 'min(92vw,20rem)' } }, h('h4', { class: 'center' }, title), h('div', { class: 'chest-contents' }, items.map((id, i) => h('div', { class: 'ichip', style: { animationDelay: i * 0.08 + 's' } }, itemCanvas(this.d, id, 48), this.d.name(id)))));
    document.getElementById('app').append(el); this.lootEl = el; setTimeout(() => { if (this.lootEl === el) { el.remove(); this.lootEl = null; } }, 2800);
  }

  /* ------------------------------------------------------- info card */
  showInfo(html, sx, sy) {
    this.hideInfo();
    const el = h('div', { class: 'infocard', role: 'dialog' }, html); document.getElementById('app').append(el); this.infoEl = el;
    const W = window.innerWidth, H = window.innerHeight, r = el.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(W - r.width - 8, sx - r.width / 2)) + 'px'; el.style.top = Math.max(8, Math.min(H - r.height - 80, sy - r.height - 30)) + 'px';
    this._infoTimer = setTimeout(() => this.hideInfo(), 5200);
  }
  hideInfo() { if (this.infoEl) { this.infoEl.remove(); this.infoEl = null; } clearTimeout(this._infoTimer); }

  /* ------------------------------------------------------------ modals */
  /** Open a modal. opts: {title, body: Node|fn, footer, cls, tabs, onClose, render} Returns a handle. */
  modal(opts) {
    this.hideInfo();
    const m = { opts, el: null, closed: false };
    const bodyEl = h('div', { class: 'body' });
    const header = h('header', null, h('h2', null, opts.title || ''), opts.noClose ? null : h('button', { class: 'x', 'aria-label': 'Close', onclick: () => m.close() }, '✕'));
    const footer = h('footer', { class: opts.footer ? '' : 'hidden' });
    const box = h('div', { class: 'modal ' + (opts.cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' }, header, bodyEl, footer);
    const back = h('div', { class: 'backdrop', onpointerdown: e => { if (e.target === back && !opts.noClose) m.close(); } }, box);
    m.el = back; m.body = bodyEl; m.footer = footer; m.title = header.firstChild; m.box = box;
    m.render = () => {
      if (m.closed) return;
      const keep = bodyEl.scrollTop;
      bodyEl.innerHTML = '';
      const content = opts.render ? opts.render(m) : opts.body;
      if (content) bodyEl.append(content.nodeType ? content : String(content));
      footer.innerHTML = '';
      const f = opts.footerRender ? opts.footerRender(m) : null;
      if (f) { footer.classList.remove('hidden'); footer.append(...(Array.isArray(f) ? f : [f])); } else footer.classList.add('hidden');
      if (opts.titleRender) m.title.textContent = opts.titleRender(m);
      bodyEl.scrollTop = keep;
    };
    m.close = (res) => { if (m.closed) return; m.closed = true; back.remove(); this.stack = this.stack.filter(x => x !== m); this.app.audio.sfx('close'); opts.onClose?.(res); this.app.onModalChange(); };
    this.stack.push(m); this.modalRoot.append(back); m.render(); this.app.audio.sfx('open'); this.app.onModalChange();
    return m;
  }
  refreshModals() { for (const m of this.stack) m.render(); }
  top() { return this.stack[this.stack.length - 1]; }
  closeTop() { const m = this.top(); if (m && !m.opts.noClose) m.close(); }
  closeAll() { for (const m of [...this.stack]) m.close(); }
  confirm({ title = 'Are you sure?', text, yes = 'Yes', no = 'No', onYes, onNo, cls = 'small' }) {
    let answered = false;
    const m = this.modal({ title, cls, render: () => h('p', { class: 'center', style: { fontWeight: 700 } }, text), footerRender: mm => [h('button', { class: 'btn ghost', onclick: () => { answered = true; mm.close(); onNo?.(); } }, no), h('button', { class: 'btn good', onclick: () => { answered = true; mm.close(); onYes?.(); } }, yes)], onClose: () => { if (!answered) onNo?.(); } });
    return m;
  }
}
