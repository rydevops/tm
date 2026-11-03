// The Quest Book: every story quest in the game (what it needs, what it gives, whether you are there yet), open from the first minute,
// and a "how do I get this?" journey for any item in it, from the start of the game to the item in your hand.
import { h, icon, itemCanvas, fmt } from './ui.js';
import { itemJourney, questActs, held } from '../core/howto.js';

const ACTS = {
  1: { name: 'Landfall', color: '#2ec4b6', emoji: '⛵' },
  2: { name: 'Hens and Hearths', color: '#ff9f1c', emoji: '🍳' },
  3: { name: 'Lagoon and Sunset', color: '#3a86ff', emoji: '🌅' },
  4: { name: 'Hills and Shrine', color: '#7cb518', emoji: '⛰️' },
  5: { name: 'Wonder Hollow', color: '#9b5de5', emoji: '✨' },
  6: { name: 'The Great Voyage', color: '#ef476f', emoji: '🧭' }
};
const OBJ_ICON = {
  build: ['icon', 'hammer'], unlock_zone: ['icon', 'map'], reach_level: ['icon', 'star'], spend_energy: ['icon', 'energy'], collect_currency: ['icon', 'coin'],
  island_complete: ['icon', 'boat'], visit_island: ['icon', 'boat'], clear_obstacle: ['emoji', '🌿'], clear_special: ['emoji', '🔓'], merge_count: ['emoji', '✨'],
  merge_bonus: ['emoji', '💥'], create_level: ['emoji', '⭐'], requests_done: ['emoji', '💬'], sun_gate: ['emoji', '☀️'], place_living_item: ['emoji', '🐾'],
  fill_pool: ['emoji', '💧'], use_item: ['emoji', '🎯'], thaw: ['emoji', '🧊'], sugar_rush: ['emoji', '🍬'], light_area: ['emoji', '🏮']
};

export function installQuestBook(Panels) {
  const P = Panels.prototype;

  /** Small coloured mark: an icon image or an emoji. */
  P.qbGlyph = function (kind, v) { return kind === 'icon' ? icon(v, 'qb-gi') : h('span', { class: 'qb-ge' }, v); };

  /* ---------------------------------------------------------------- the book */
  P.questBook = function (startAct = null) {
    const g = this.g, d = this.d, s = g.s, acts = questActs(d);
    const currentAct = () => { const q = d.questById[s.quests.active[0]]; return q ? q.act : (acts.find(a => a.quests.some(x => !s.quests.done.includes(x.id)))?.act || 1); };
    let act = startAct || currentAct(), filter = 'all';
    this.ui.modal({
      title: 'Quest Book', cls: 'wide book',
      render: m => {
        this.qbRefresh = () => m.render();
        const total = d.quests.length, done = s.quests.done.length;
        const wrap = h('div', { class: 'qb' });
        // hero: progress ring and a line of what this is
        const pct = Math.round(done / total * 100);
        wrap.append(h('div', { class: 'qb-hero' },
          h('div', { class: 'qb-ring', style: { '--p': pct } }, h('div', { class: 'qb-ring-in' }, h('b', null, done), h('small', null, `of ${total}`))),
          h('div', { class: 'qb-hero-t' }, h('h3', null, 'Every story quest'), h('p', null, 'See what each one needs and what it pays. Tap any item to see how to get it, from the very start.'),
            h('div', { class: 'row wrap' }, h('span', { class: 'pill gold' }, `${pct}% of the story told`), s.quests.active.length ? h('button', { class: 'btn small alt', onclick: () => { act = currentAct(); filter = 'all'; m.render(); } }, '★ Where I am') : null))));
        // acts
        wrap.append(h('div', { class: 'qb-acts', role: 'tablist' }, acts.map(a => {
          const A = ACTS[a.act] || ACTS[1], dn = a.quests.filter(q => s.quests.done.includes(q.id)).length, cur = a.act === currentAct();
          return h('button', { class: 'qb-act' + (a.act === act ? ' on' : ''), role: 'tab', 'aria-selected': a.act === act, style: { '--ac': A.color }, onclick: () => { act = a.act; m.render(); } },
            h('span', { class: 'qb-act-e' }, A.emoji), h('b', null, `Act ${a.act}`), h('small', null, A.name), h('span', { class: 'qb-act-bar' }, h('i', { style: { width: Math.round(dn / a.quests.length * 100) + '%' } })), cur ? h('span', { class: 'qb-act-now' }, '★') : null);
        })));
        // filters
        const cur = acts.find(a => a.act === act) || acts[0];
        const counts = { all: cur.quests.length, active: cur.quests.filter(q => s.quests.active.includes(q.id)).length, todo: cur.quests.filter(q => !s.quests.done.includes(q.id)).length, done: cur.quests.filter(q => s.quests.done.includes(q.id)).length };
        wrap.append(h('div', { class: 'qb-filters' }, [['all', 'All'], ['active', 'Now'], ['todo', 'To do'], ['done', 'Done']].map(([id, label]) => h('button', { class: 'qb-f' + (filter === id ? ' on' : ''), onclick: () => { filter = id; m.render(); } }, label, h('small', null, counts[id])))));
        const A = ACTS[act] || ACTS[1];
        wrap.append(h('div', { class: 'qb-banner', style: { '--ac': A.color } }, h('span', null, A.emoji), h('div', null, h('b', null, `Act ${act}: ${A.name}`), h('small', null, `${counts.done} of ${counts.all} done`))));
        const list = cur.quests.filter(q => filter === 'all' || (filter === 'active' && s.quests.active.includes(q.id)) || (filter === 'todo' && !s.quests.done.includes(q.id)) || (filter === 'done' && s.quests.done.includes(q.id)));
        if (!list.length) wrap.append(h('p', { class: 'center sub', style: { padding: '18px 0' } }, filter === 'done' ? 'Nothing finished in this act yet.' : filter === 'active' ? 'No quest is running in this act right now.' : 'Nothing to show.'));
        for (const q of list) wrap.append(this.qbCard(q, A.color));
        return wrap;
      },
      footerRender: m => [h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Close')]
    });
  };

  /** One quest: who asks, what they say, what you need, what you get. */
  P.qbCard = function (q, color) {
    const g = this.g, d = this.d, s = g.s;
    const done = s.quests.done.includes(q.id), active = s.quests.active.includes(q.id), status = done ? 'done' : active ? 'active' : 'locked';
    const prog = active ? g.questProgress(q) : null, giver = d.residentById[q.giver], no = d.questIndex[q.id] + 1;
    const need = q.objectives.map((o, i) => this.qbObjective(o, prog ? prog[i] : null, done));
    const wait = !done && !active ? q.requires.map(id => d.questById[id]).filter(r => r && !s.quests.done.includes(r.id)) : [];
    const lockLine = wait.length ? h('div', { class: 'qb-lock' }, icon('lock', 'qb-gi'), h('span', null, `Starts after “${this.qbShort(d.t(wait[wait.length - 1].textKey))}”`)) : null;
    return h('div', { class: `qb-card ${status}`, style: { '--ac': color } },
      h('div', { class: 'qb-side' }, this.face(q.giver, done ? 'excited' : 'neutral', 52), h('span', { class: 'qb-badge ' + status, 'aria-label': status === 'done' ? 'Done' : status === 'active' ? 'In progress' : 'Locked' }, status === 'done' ? '✔' : status === 'active' ? '★' : '🔒')),
      h('div', { class: 'qb-main' },
        h('div', { class: 'qb-head' }, h('b', null, giver?.name || q.giver), h('span', { class: 'qb-no' }, `#${no}`), status === 'active' && g.questComplete(q) ? h('span', { class: 'pill good' }, 'Ready!') : null),
        h('p', { class: 'qb-say' }, d.t(q.textKey)),
        h('div', { class: 'qb-lab' }, 'You need'), h('div', { class: 'qb-chips' }, need),
        h('div', { class: 'qb-lab give' }, 'You get'), h('div', { class: 'qb-chips' }, this.qbRewards(q.rewards)),
        status === 'active' ? h('div', { class: 'qb-quick' }, ...this.quickButtons(q, () => this.qbRefresh?.())) : null,
        lockLine));
  };
  P.qbShort = function (t) { const x = String(t).replace(/\s+/g, ' ').trim(); return x.length > 54 ? x.slice(0, 52).trimEnd() + '…' : x; };

  /** One thing a quest needs. Items open their journey; buildings and zones open their own panels. */
  P.qbObjective = function (o, p, done) {
    const g = this.g, d = this.d, text = g.objectiveText(o);
    const state = done ? ' ok' : p && p.have >= p.need ? ' ok' : '';
    const count = p && !done ? h('em', { class: 'qb-n' }, `${Math.min(p.have, p.need)}/${p.need}`) : done ? h('em', { class: 'qb-n ok' }, '✔') : null;
    if (o.item && d.itemById[o.item]) {
      const n = o.count || 1;
      return h('button', { class: 'qb-chip item' + state, 'aria-label': `${text}. Tap to see how to get it.`, onclick: e => { e.stopPropagation(); this.itemJourney(o.item); } },
        itemCanvas(d, o.item, 38), h('span', { class: 't' }, (n > 1 ? n + '× ' : '') + d.name(o.item), h('small', null, o.type === 'create_item' ? 'create' : o.type === 'place_living_item' ? 'place' : 'deliver')), count, h('i', { class: 'qb-how' }, 'how?'));
    }
    const [kind, v] = OBJ_ICON[o.type] || ['emoji', '•'];
    const open = o.type === 'build' ? () => this.building(o.building) : o.type === 'unlock_zone' ? () => this.zone(o.zone) : null;
    const attrs = { class: 'qb-chip' + state + (open ? ' link' : ''), onclick: open ? e => { e.stopPropagation(); open(); } : undefined };
    return h(open ? 'button' : 'div', attrs, this.qbGlyph(kind, v), h('span', { class: 't' }, text), count, open ? h('i', { class: 'qb-how' }, 'open') : null);
  };

  P.qbRewards = function (list) {
    const d = this.d;
    return (list || []).map(r => {
      switch (r.type) {
        case 'coins': return h('span', { class: 'qb-chip gain' }, icon('coin', 'qb-gi'), h('span', { class: 't' }, fmt(r.amount)));
        case 'energy': return h('span', { class: 'qb-chip gain' }, icon('energy', 'qb-gi'), h('span', { class: 't' }, `${r.amount} energy`));
        case 'pearls': return h('span', { class: 'qb-chip gain' }, icon('pearl', 'qb-gi'), h('span', { class: 't' }, `${r.amount} pearls`));
        case 'amulet': return h('span', { class: 'qb-chip gain' }, icon('amulet', 'qb-gi'), h('span', { class: 't' }, `${r.amount} amulet${r.amount > 1 ? 's' : ''}`));
        case 'tickets': return h('span', { class: 'qb-chip gain' }, icon('ticket', 'qb-gi'), h('span', { class: 't' }, `${r.amount} ticket${r.amount > 1 ? 's' : ''}`));
        case 'xp': return h('span', { class: 'qb-chip gain' }, icon('star', 'qb-gi'), h('span', { class: 't' }, `${r.amount} XP`));
        case 'item': return d.itemById[r.item] ? h('button', { class: 'qb-chip gain item', 'aria-label': `${d.name(r.item)}. Tap to see how to get it.`, onclick: e => { e.stopPropagation(); this.itemJourney(r.item); } }, itemCanvas(d, r.item, 34), h('span', { class: 't' }, (r.count > 1 ? r.count + '× ' : '') + d.name(r.item)), h('i', { class: 'qb-how' }, 'how?')) : null;
        default: return null;
      }
    }).filter(Boolean);
  };

  /* ------------------------------------------------------------- the journey */
  /** "How do I get this?": a numbered path from the first step to the item. Item chips on the way open their own journey. */
  P.itemJourney = function (id) {
    const g = this.g, d = this.d, s = g.s, J = itemJourney(d, id); if (!J) return;
    this.ui.modal({
      title: 'How to get it', cls: 'wide book',
      render: () => {
        const wrap = h('div', { class: 'qb jr' });
        const seen = !!s.journal.discovered[id];
        wrap.append(h('div', { class: 'jr-hero' }, h('div', { class: 'jr-sprite' }, itemCanvas(d, id, 88)),
          h('div', { class: 'jr-ht' }, h('h3', null, J.item.name), h('div', { class: 'sub' }, `${J.item.chainName} · level ${J.item.level} of ${J.item.levels}`), h('span', { class: 'pill ' + (seen ? 'good' : '') }, seen ? '✔ You have made this before' : 'Not discovered yet'))));
        wrap.append(this.jrNow(J, held(g, J.ladder.map(l => l.id))));
        this.jrHeld = held(g, J.ladder.map(l => l.id)).counts;
        const steps = this.jrSteps(J);
        steps.forEach((st, i) => wrap.append(this.jrStep(i + 1, st)));
        return wrap;
      },
      footerRender: m => [h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Close')]
    });
  };

  /** "Where you are now": what you already hold on the way to this item, what to do next, and a button that takes you to it. */
  P.jrNow = function (J, hold) {
    const d = this.d, goal = J.item.id, n = hold.counts[goal] || 0;
    const have = J.ladder.filter(l => hold.counts[l.id] > 0 && l.id !== goal);
    let say, cls = '';
    if (n > 0) { say = `You have ${n} ${J.item.name} right now.`; cls = ' ok'; }
    else if (have.length) {
      const top = have[have.length - 1], cnt = hold.counts[top.id], nxt = J.ladder[J.ladder.findIndex(l => l.id === top.id) + 1];
      say = `You hold ${have.map(l => `${hold.counts[l.id]}× ${l.name}`).join(', ')}. ${cnt >= 3 ? `Merge your ${top.name} into ${nxt.name}.` : `Make ${3 - cnt} more ${top.name} and merge them into ${nxt.name}.`}`;
    } else say = 'You have none of this on the island yet. Start at step 1.';
    return h('div', { class: 'jr-now' + cls }, h('span', { class: 'jr-now-i' }, n > 0 ? '✔' : have.length ? '➜' : '📍'), h('div', { class: 'jr-now-t' }, h('b', null, 'Where you are now'), h('span', null, say)),
      hold.cell >= 0 && this.g.ctx.kind === 'home' ? h('button', { class: 'btn small alt', onclick: () => this.jrFind(hold.cell) }, 'Show me') : null);
  };
  /** Close the books and point at the item on the island. */
  P.jrFind = function (cell) { this.ui.closeAll(); const r = this.app.renderer; r.focusCell(cell, 1.0); r.hint = { cells: [cell], until: r.now() + 5 }; };

  P.jrStep = function (n, st) {
    return h('div', { class: 'jr-step' + (st.done ? ' done' : '') + (st.last ? ' last' : '') },
      h('div', { class: 'jr-num' }, st.done ? '✔' : String(n)),
      h('div', { class: 'jr-card' }, h('div', { class: 'jr-t' }, h('b', null, st.title), st.done ? h('span', { class: 'pill good' }, st.doneText || 'Done') : null), ...st.body));
  };
  P.jrChip = function (id, count, extra = '') {
    const d = this.d;
    return h('button', { class: 'qb-chip item mini ' + extra, 'aria-label': `${d.name(id)}. Tap for how to get it.`, onclick: () => this.itemJourney(id) }, itemCanvas(d, id, 34), h('span', { class: 't' }, (count > 1 ? count + '× ' : '') + d.name(id)));
  };
  P.jrZone = function (z) {
    const s = this.g.s, open = s.zones.unlocked.includes(z.n);
    return {
      title: `Open ${z.name}`, done: open, doneText: 'Open',
      body: [h('p', { class: 'sub' }, 'The area has to be opened first.'), h('div', { class: 'qb-chips' },
        h('span', { class: 'qb-chip' + (s.player.level >= z.level ? ' ok' : '') }, icon('star', 'qb-gi'), h('span', { class: 't' }, `Level ${z.level}`)),
        z.amulets ? h('span', { class: 'qb-chip' + (s.player.amulets >= z.amulets ? ' ok' : '') }, icon('amulet', 'qb-gi'), h('span', { class: 't' }, `${z.amulets} amulet${z.amulets > 1 ? 's' : ''}`)) : null,
        z.coins ? h('span', { class: 'qb-chip' + (s.player.coins >= z.coins ? ' ok' : '') }, icon('coin', 'qb-gi'), h('span', { class: 't' }, fmt(z.coins))) : null,
        z.n > 1 ? h('span', { class: 'qb-chip' }, h('span', { class: 'qb-ge' }, '🌿'), h('span', { class: 't' }, '70% of the last zone cleared')) : null),
      h('button', { class: 'btn small alt', onclick: () => this.zone(z.n) }, 'Show this zone')].filter(Boolean)
    };
  };

  /** The steps of a journey, in order. Each is { title, body[], done? }. */
  P.jrSteps = function (J) {
    const g = this.g, d = this.d, s = g.s, steps = [];
    const base = J.ladder[0];
    const mergeStep = () => {
      if (J.ladder.length < 2) return null;
      const row = h('div', { class: 'jr-ladder' });
      J.ladder.forEach((l, i) => {
        if (i) row.append(h('span', { class: 'jr-arrow', 'aria-hidden': 'true' }, h('small', null, '3'), '→'));
        const n = this.jrHeld ? this.jrHeld[l.id] || 0 : 0;
        row.append(h('button', { class: 'jr-rung' + (l.id === J.item.id ? ' goal' : '') + (n ? ' has' : ''), 'aria-label': `${l.name}, level ${l.level}${n ? `, you have ${n}` : ''}`, onclick: () => l.id !== J.item.id && this.itemJourney(l.id) }, itemCanvas(d, l.id, 44), h('small', null, l.name), n ? h('em', { class: 'jr-have' }, '×' + n) : null));
      });
      return { title: `Merge up to ${J.item.name}`, body: [h('div', { class: 'jr-scroll' }, row),
        h('p', { class: 'sub' }, `Drop an item onto matching ones that touch it: 3 make 1 of the next level. Merge more at once for more: 4 make 2, 5 make 3. Making one ${J.item.name} takes about ${J.need.best} ${base.name} when you merge in big groups (${J.need.plain} if you only ever merge 3).`)] };
    };
    const makeStep = m => ({
      title: m.gen.cost === 'charge' ? 'Tap it: uses a charge' : 'Tap it: costs 1 energy',
      body: [h('p', { class: 'sub' }, `Each tap makes ${m.gen.outputs.length > 1 ? 'one of these' : 'this'}${m.gen.cost === 'charge' ? '. Charges refill over time.' : '. Energy refills over time and on every level-up.'}`),
        h('div', { class: 'qb-chips' }, m.gen.outputs.map(o => h('span', { class: 'jr-out' }, this.jrChip(o.id, 1), m.gen.outputs.length > 1 ? h('small', null, `${o.pct}%`) : null)))]
    });

    if (J.genSource) {                                              // a generator item itself
      const how = J.genSource;
      if (how.kind === 'start') steps.push({ title: 'You begin with it', done: true, doneText: 'From the start', body: [h('p', { class: 'sub' }, 'It is on your island when the game starts. Tap it to make items; merge three to upgrade it.')] });
      else if (how.kind === 'gift') steps.push(this.jrZone(how.zone), { title: 'It is a gift', body: [h('p', { class: 'sub' }, `Opening ${how.zone.name} puts one on your island. Merge three to upgrade it.`)] });
      else steps.push({ title: 'Earned as a reward', body: [h('p', { class: 'sub' }, 'Quests and events give these. Merge three to upgrade it.')] });
      const m = mergeStep(); if (m) steps.push(m);
    } else if (J.makers.length) {
      const m = J.makers[0], how = m.how, route = [];
      // before the maker exists, the first wood (or whatever it is) comes from clearing an obstacle that drops it
      const early = J.drops.length && how.kind === 'build' && !s.built[how.building.id];
      const target = early ? route : steps;
      if (early) {
        const dr = J.drops[0], hits = d.obstacleById[dr.id]?.hits || 1;
        steps.push({ title: `Clear a ${dr.name}`, body: [h('p', { class: 'sub' }, `${dr.name}s lie around the island from the start. Drag ${dr.tool ? 'a ' + d.name(dr.tool) : 'a tool'} onto one (it takes ${hits === 1 ? 'one hit' : hits + ' hits'}) and ${dr.count ? `${dr.count[0]} to ${dr.count[1]}` : 'a few'} of these drop out. The Seed Pouch sometimes grows a new one if you run out.`),
          h('div', { class: 'qb-chips' }, dr.tool ? this.jrChip(dr.tool, 1) : null, ...[...new Set(dr.items)].map(x => this.jrChip(x, 1)))] });
        const mg0 = mergeStep(); if (mg0) steps.push(mg0);
      }
      if ((how.kind === 'build' || how.kind === 'gift') && how.zone && how.zone.n > 1) target.push(this.jrZone(how.zone));
      if (how.kind === 'start') target.push({ title: `Start with the ${m.gen.name}`, done: true, doneText: 'From the start', body: [h('div', { class: 'qb-chips' }, this.jrChip(`${m.gen.id}_01`, 1)), h('p', { class: 'sub' }, 'It is already on your island when the game begins.')] });
      else if (how.kind === 'gift') target.push({ title: `Get the ${m.gen.name}`, body: [h('div', { class: 'qb-chips' }, this.jrChip(`${m.gen.id}_01`, 1)), h('p', { class: 'sub' }, `It is given to you when ${how.zone.name} opens.`)] });
      else if (how.kind === 'build') {
        const built = !!s.built[how.building.id];
        target.push({ title: `Build the ${how.building.name}`, done: built, doneText: 'Built',
          body: [h('p', { class: 'sub' }, 'Bring these to the build site, pay the coins, and it makes items for you.'), h('div', { class: 'qb-chips' }, how.building.items.map(i => this.jrChip(i.id, i.count)), how.building.coins ? h('span', { class: 'qb-chip' }, icon('coin', 'qb-gi'), h('span', { class: 't' }, fmt(how.building.coins))) : null),
            h('button', { class: 'btn small alt', onclick: () => this.building(how.building.id) }, 'Show the building')] });
      } else if (how.kind === 'island') target.push({ title: `Sail to ${how.island ? how.island.name : 'the island'}`, body: [h('p', { class: 'sub' }, `An expedition island${how.island ? ` (level ${how.island.level})` : ''}. Your first visit costs 1 expedition ticket.`), h('button', { class: 'btn small alt', onclick: () => this.islands() }, 'Open expeditions')] });
      target.push(makeStep(m));
      if (early) steps.push(...route.map((st, i) => ({ ...st, title: (i === 0 ? 'Later, for plenty: ' : 'Later: ') + st.title })));
      else { const mg = mergeStep(); if (mg) steps.push(mg); }
      if (J.makers.length > 1) steps.push({ title: 'Other ways', body: J.makers.slice(1).map(o => h('p', { class: 'sub' }, `${o.gen.name}: ${o.how.kind === 'build' ? 'needs the ' + o.how.building.name + ' built' : o.how.kind === 'island' ? 'on an expedition island' : 'also makes it'}.`)) });
    } else if (J.island) {
      steps.push({ title: `Sail to ${J.island.name}`, body: [h('p', { class: 'sub' }, `An expedition island (level ${J.island.level}); your first visit costs 1 expedition ticket. Its generator makes this family of items there.`), h('button', { class: 'btn small alt', onclick: () => this.islands() }, 'Open expeditions')] });
      const isl = d.islandById[J.island.id];
      const outs = (isl.genOutputs || []).filter(([x]) => x.startsWith(J.item.chain + '_'));
      if (outs.length) steps.push({ title: 'Tap the island generator', body: [h('p', { class: 'sub' }, 'On islands it uses charges, not energy.'), h('div', { class: 'qb-chips' }, [...new Set(outs.map(([x]) => x))].map(x => this.jrChip(x, 1)))] });
      const mg = mergeStep(); if (mg) steps.push(mg);
    } else {
      // coins, sparks, pearls, chests, supplies: earned, then merged
      const where = [];
      if (J.drops.length) where.push(h('p', { class: 'sub' }, `Found when you clear ${J.drops.map(x => x.name).join(' or ')}.`));
      if (J.chests.length) where.push(h('p', { class: 'sub' }, 'Dropped by chests:'), h('div', { class: 'qb-chips' }, J.chests.map(c => this.jrChip(c, 1))));
      if (J.kind === 'chest') where.push(h('p', { class: 'sub' }, 'Quest rewards, level-ups, daily and weekly tasks, trade orders and achievements all give chests.'));
      if (J.currency) where.push(h('p', { class: 'sub' }, `Tap a ${J.currency} item to add it to your wallet. Merge first and it is worth more.`));
      if (J.kind === 'supplies') where.push(h('p', { class: 'sub' }, 'The top supply is an Expedition Ticket. Tap it to add the ticket to your wallet.'));
      if (J.zone && J.zone.n > 1) steps.push(this.jrZone(J.zone));
      steps.push({ title: 'Earn the first one', body: where.length ? where : [h('p', { class: 'sub' }, 'Quests, chests and events give it.')] });
      const mg = mergeStep(); if (mg) steps.push(mg);
    }
    if (J.drops.length && J.makers.length && !steps.some(st => st.title.startsWith('Clear a '))) steps.push({ title: 'Also from obstacles', body: [h('p', { class: 'sub' }, `Clearing ${J.drops.map(x => x.name).join(' or ')} drops some too.`)] });
    if (J.chests.length && J.makers.length) steps.push({ title: 'Also from chests', body: [h('div', { class: 'qb-chips' }, J.chests.map(c => this.jrChip(c, 1)))] });
    steps.forEach((st, i) => { st.last = i === steps.length - 1; });
    return steps;
  };
}
