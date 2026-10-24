// The painted art changed many item ladders (fewer, different levels). This file moves an older save onto the new ladders and then
// checks that nothing in a save refers to an item that no longer exists. It never loses progress silently: items that cannot be kept
// are swapped for coins and the player is told once (flags.refitNotice).
import { parseItemId, itemId, clamp } from './util.js';

const ID = /^([a-z]+(?:_[a-z]+)*)_(\d{2})$/;
const DAY_KINDS = ['create', 'clear', 'merge', 'bonus', 'deliver', 'spend'];

/** `manifest` is data/refit.json: { chains: { chain: { levels, legacy: [new level for old level 1..n] } } }. */
export function makeRefit(manifest) {
  const chains = (manifest && manifest.chains) || {};
  const mapLevel = (chain, level) => { const f = chains[chain]; return f && level >= 1 ? f.legacy[Math.min(level, f.legacy.length) - 1] : level; };
  const mapId = id => { const m = typeof id === 'string' && ID.exec(id); return m && chains[m[1]] ? itemId(m[1], mapLevel(m[1], +m[2])) : id; };
  return { chains, mapLevel, mapId };
}

/** Rewrites every legacy item id (values and object keys) in any JSON-like value. Keys that collapse into one add up (counts) or keep the first value. */
export function remapValue(v, refit) {
  if (typeof v === 'string') return refit.mapId(v);
  if (Array.isArray(v)) return v.map(x => remapValue(x, refit));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const nk = refit.mapId(k), nv = remapValue(x, refit);
      if (nk in out) { out[nk] = typeof nv === 'number' && typeof out[nk] === 'number' ? out[nk] + nv : out[nk]; } else out[nk] = nv;
    }
    if (typeof v.chain === 'string' && typeof v.minLevel === 'number' && refit.chains[v.chain]) out.minLevel = refit.mapLevel(v.chain, v.minLevel);
    return out;
  }
  return v;
}

/** Schema 4 -> 5 on the raw save document (state, home board, island boards). */
export function remapDoc(doc, refit) {
  const s = doc.state;
  // daily tasks carry the item in their id and text; remember which ones change so they can be re-rolled once the game is loaded
  for (const t of (s.daily && s.daily.tasks) || []) if (t && t.obj && t.obj.item && refit.mapId(t.obj.item) !== t.obj.item) t.stale = true;
  return { ...doc, state: remapValue(s, refit), home: remapValue(doc.home, refit), islandBoards: remapValue(doc.islandBoards || {}, refit) };
}

export function installRefit(Game) {
  const P = Game.prototype;

  P.itemValueGuess = function (id) {
    const d = this.data, p = parseItemId(id), ch = p && d.chainByKey[p.chain];
    if (ch && !ch.currency && !ch.chest) return d.sellValue(itemId(ch.chain, clamp(p.level, 1, ch.levels))) || 10;
    return 10;
  };

  /**
   * Removes everything in the save that names an item the game no longer has, and fixes quest and goal progress to match the current
   * data. Safe to run on every load. Returns what it changed; the same numbers are kept in flags.refitNotice for the view.
   */
  P.checkItems = function (migrated) {
    const d = this.data, s = this.s, rep = { removed: 0, coins: 0, tasks: 0, quests: 0, migrated: !!migrated };
    const ok = id => !!d.itemById[id];
    const lose = id => { rep.removed++; rep.coins += this.itemValueGuess(id); };
    const sweepList = (list, getId, keep) => { for (let i = list.length - 1; i >= 0; i--) if (list[i] && !ok(getId(list[i]))) { lose(getId(list[i])); if (keep) list[i] = null; else list.splice(i, 1); } };

    const b = this.home && this.home.board;
    if (b) for (let i = 0; i < b.items.length; i++) { const it = b.items[i]; if (it && !ok(it.id)) { lose(it.id); b.items[i] = null; } }
    sweepList(s.storage, x => x.id, true);
    sweepList(s.overflow, x => x.id);
    const dealsBefore = s.shopDeals.items.length;
    s.shopDeals.items = s.shopDeals.items.filter(x => ok(x.id));
    if (s.shopDeals.items.length !== dealsBefore) s.shopDeals.date = '';
    s.trade.orders = s.trade.orders.filter(o => (o.items || []).every(x => ok(x.id || x.item)));
    s.requests.list = s.requests.list.filter(r => ok(r.item));
    s.living = s.living.filter(l => { if (d.living.some(x => x.item === l.item) && ok(l.item)) return true; rep.removed++; rep.coins += 200; return false; });
    s.journal.living = (s.journal.living || []).filter(ok);
    for (const [key, fill] of Object.entries(s.siteFill || {})) for (const [id, n] of Object.entries(fill)) if (!ok(id)) { rep.removed += n; rep.coins += n * this.itemValueGuess(id); delete fill[id]; }
    for (const id of Object.keys(s.journal.discovered || {})) if (!ok(id)) delete s.journal.discovered[id];
    s.stats.discovered = Object.keys(s.journal.discovered || {}).length;

    // items waiting in island boards
    for (const doc of Object.values(this.islandDocs || {})) {
      doc.items = (doc.items || []).filter(c => { if (ok(c.id)) return true; lose(c.id); return false; });
      for (const list of [doc.tray, doc.overflow]) if (Array.isArray(list)) sweepList(list, x => x.id, list === doc.tray);
    }

    // daily tasks that asked for an item whose level moved or vanished are rolled again (finished ones stay as they are)
    s.daily.tasks.forEach((t, i) => {
      const gone = t.obj && t.obj.item && !ok(t.obj.item);
      if ((t.stale || gone) && !t.done) {
        const kind = DAY_KINDS.find(k => t.id.startsWith(`d_${k}`)) || 'merge';
        s.daily.tasks[i] = this.makeDailyTask(kind); rep.tasks++;
      }
      delete t.stale;
    });
    s.weekly.tasks = s.weekly.tasks.filter(t => !(t.obj && t.obj.item && !ok(t.obj.item)));

    // story quests: only quests that still exist, with progress that fits the objectives
    s.quests.active = s.quests.active.filter(id => d.questById[id]);
    for (const id of Object.keys(s.quests.progress)) if (!d.questById[id]) delete s.quests.progress[id];
    for (const id of s.quests.active) {
      const q = d.questById[id], prog = s.quests.progress[id] || [];
      const fixed = q.objectives.map((o, i) => Math.min(prog[i] || 0, this.objTarget(o)));
      if (fixed.length !== prog.length || fixed.some((n, i) => n !== prog[i])) rep.quests++;
      s.quests.progress[id] = fixed;
    }
    // island goals
    for (const [id, st] of Object.entries(s.islands || {})) {
      const def = d.islandById[id]; if (!def || !Array.isArray(st.goals)) continue;
      st.goals = def.goals.map((g, i) => Math.min(st.goals[i] || 0, g.count || 1));
    }

    if (rep.coins) this.s.player.coins += rep.coins;
    if (rep.removed || migrated) s.flags.refitNotice = { removed: rep.removed, coins: rep.coins, migrated: !!migrated };
    return rep;
  };
}
