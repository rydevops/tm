// First-run tutorial (about five minutes): short speech bubbles with a spotlight, driven by game events.
import { h } from './ui.js';
import { CELL } from './renderer.js';

export class Tutorial {
  constructor(app) { this.app = app; this.root = null; this.spot = null; this.active = false; this.stepDef = null; this.el = {}; this.spotTarget = null; }
  get g() { return this.app.game; }
  get st() { return this.g.s.tutorial; }

  steps() {
    const g = this.g;
    const nm = id => g.data.name(id), want = nm(g.data.questById.act1_q02.objectives[0].item);   // the item Beni's first delivery asks for
    const cellOf = id => { const b = g.ctx.board; for (let i = 0; i < b.n; i++) if (b.items[i] && b.items[i].id === id) return i; return -1; };
    return [
      { who: 'beni', text: "Welcome to Isla Solana, kiddo! She's seen better days, but we'll fix her up together. Let me show you how it works.", next: true },
      { who: 'marlene', text: `Matching items can be merged. Two ${nm('banana_01')}s are touching. Drag the third one right onto one of them and the three will merge into something better.`, enter: () => this.placeBananas(), spot: () => this.bananaCells(), done: ev => ev.type === 'merge' },
      { who: 'beni', text: 'Nice! Tap the Seed Pouch to grow another seed. Each tap costs 1 energy (the bolt up top), and energy refills over time.', spot: () => ({ cell: cellOf('gen_seed_01') }), done: ev => ev.type === 'spawn' },
      { who: 'marlene', text: 'Tip: items only merge when you drop one onto a matching item, so you can line up as many as you like first. Merge 3 for one, 4 for two, 5 for three, and so on! If you pause for a moment, a hint will show you a move.', next: true },
      { who: 'beni', text: 'Your current job is on the left. Tap the quest card any time to see what it needs and what you get.', spot: () => ({ el: '.tracker' }), next: true },
      { who: 'beni', text: `Keep merging bananas: ${nm('banana_01')}, ${nm('banana_02')}, then a ${want}. Drag the ${want} onto me and I will give you a chest!`, spot: () => ({ cell: g.residentCell('beni') }), done: ev => ev.type === 'delivered', skipIf: () => g.s.quests.done.includes('act1_q02') },
      { who: 'marlene', text: 'Tall Grass blocks the way. Tap the Toolbox to get tools, then drag a Machete onto the grass to clear it.', spot: () => ({ cell: cellOf('gen_toolbox_01') }), done: ev => ev.type === 'cleared', skipIf: () => g.s.stats.cleared > 0 },
      { who: 'beni', text: 'Running out of room? Drag any item into the tray at the bottom to keep it safe for later. Tap the coin button to sell spare items.', spot: () => ({ el: '.tray' }), next: true },
      { who: 'marlene', text: "You've got it! Finish Beni's quests, repair the Welcome Dock and the island will start to come alive. Good luck!", next: true, last: true }
    ];
  }

  begin() {
    const g = this.g, s = g.s;
    if (s.tutorial.done) { this.hide(); this.app.afterBoot(); return; }
    if (s.quests.done.length >= 4 || s.player.level >= 3) { this.finish(true); return; }
    this.build(); this.steps_ = this.steps(); this.enterStep(true);
  }
  build() {
    if (this.root) return;
    this.face = h('div', { class: 'face' }); this.p = h('p', null, ''); this.btns = h('div', { class: 'row' });
    this.root = h('div', { class: 'tut hidden', role: 'status', 'aria-live': 'polite' }, h('div', { class: 'bubble' }, this.face, h('div', { style: { flex: 1 } }, this.p, this.btns)));
    this.spot = h('div', { class: 'spot hidden' });
    const app = document.getElementById('app'); app.append(this.spot, this.root);
  }
  hide() { this.active = false; this.root?.classList.add('hidden'); this.spot?.classList.add('hidden'); }
  finish(silent = false) {
    this.st.done = true; this.hide(); this.app.dirty = true;
    this.root?.remove(); this.spot?.remove(); this.root = this.spot = null;
    if (!silent) this.app.audio.sfx('quest');
    this.app.afterBoot();
  }
  enterStep(first = false) {
    const g = this.g, steps = this.steps_ || (this.steps_ = this.steps());
    while (this.st.step < steps.length && steps[this.st.step].skipIf?.()) this.st.step++;
    if (this.st.step >= steps.length) { this.finish(); return; }
    const def = steps[this.st.step]; this.stepDef = def; this.active = true; this.entered = false;
    this.p.textContent = def.text;
    this.face.innerHTML = ''; const res = this.app.data.residentById[def.who]; if (res) this.face.append(this.app.ui.portrait(res, 'neutral', 96));
    this.btns.innerHTML = '';
    if (def.next) this.btns.append(h('button', { class: 'btn small good', onclick: () => this.advance() }, def.last ? "Let's play!" : 'Next'));
    this.btns.append(h('button', { class: 'btn small ghost', onclick: () => this.finish() }, 'Skip tutorial'));
    if (!this.entered) { def.enter?.(); this.entered = true; }
    this.root.classList.remove('hidden'); this.app.dirty = true;
    this.app.audio.sfx('ui');
  }
  advance() { this.st.step++; this.app.dirty = true; if (this.st.step >= this.steps_.length) this.finish(); else this.enterStep(); }

  onEvent(ev) {
    if (!this.active || !this.stepDef || this.stepDef.next) return;
    if (this.stepDef.done?.(ev)) setTimeout(() => { if (this.active) this.advance(); }, 700);
  }
  update() {
    if (!this.active || !this.stepDef) return;
    if (this.stepDef.skipIf?.() && !this.stepDef.next) this.advance();
  }
  frame() {
    if (!this.active || !this.root) return;
    const modal = this.app.modalOpen();
    this.root.classList.toggle('hidden', modal);
    const def = this.stepDef; let t = null;
    if (def && def.spot && !modal) { try { t = def.spot(); } catch (e) { t = null; } }
    const r = this.app.renderer;
    let cy = null; if (t && t.cell != null && t.cell >= 0) cy = r.cellCenterScreen(t.cell)[1]; else if (t && t.cells && t.cells.length) cy = r.cellCenterScreen(t.cells[0])[1];
    this.root.classList.toggle('top', cy != null && cy > r.H * 0.42);
    if (!t) { this.spot.classList.add('hidden'); return; }
    if (t.cells && t.cells.length) {
      const pts = t.cells.map(c => r.cellCenterScreen(c)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const pad = CELL * r.cam.zoom * 0.7;
      this.place(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2, true);
    } else if (t.cell != null && t.cell >= 0) {
      const [x, y] = r.cellCenterScreen(t.cell); const s = CELL * r.cam.zoom * 1.2; this.place(x - s / 2, y - s / 2, s, s, false);
    } else if (t.el) {
      const el = document.querySelector(t.el); if (!el) { this.spot.classList.add('hidden'); return; }
      const b = el.getBoundingClientRect(); this.place(b.left - 4, b.top - 4, b.width + 8, b.height + 8, true);
    } else this.spot.classList.add('hidden');
  }
  place(x, y, w, hgt, rounded) {
    const s = this.spot.style; s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = hgt + 'px'; s.borderRadius = rounded ? '18px' : '50%';
    this.spot.classList.remove('hidden');
  }

  /** Put three Baby Bananas on the board so one drag makes a merge. */
  placeBananas() {
    const g = this.g, b = g.ctx.board; if (g.s.flags.tutBananas) return; g.s.flags.tutBananas = 1;
    const free = b.nearestEmpty(g.defaultAnchor(), 30); const ok = c => c >= 0 && b.isEmpty(c);
    const cells = [];
    for (const a of free) {
      const ax = b.x(a), ay = b.y(a), mid = b.inBounds(ax + 1, ay) ? b.idx(ax + 1, ay) : -1, cc = b.inBounds(ax + 1, ay + 3) ? b.idx(ax + 1, ay + 3) : -1;
      if (ok(a) && ok(mid) && ok(cc)) { cells.push(a, mid, cc); break; }
    }
    this.banana = [];
    if (cells.length === 3) for (const c of cells) { const it = g.makeItem('banana_01'); b.items[c] = it; g.registerCreate(it, 'tutorial'); this.banana.push(c); this.app.renderer.setAnim(c, 'pop', 0.4); }
    else for (let i = 0; i < 3; i++) { const r = g.addItem(g.makeItem('banana_01'), null, 'tutorial'); if (r.where === 'board') this.banana.push(r.idx); }
    this.app.renderer.focusCell(this.banana[0] ?? g.defaultAnchor(), 0.9);
  }
  bananaCells() {
    const b = this.g.ctx.board; const cells = (this.banana || []).filter(c => b.items[c]?.id === 'banana_01');
    return { cells };
  }
}
