// Board simulator (spec section 21 developer tools): a heuristic bot plays the real simulation to find soft-locks and check pacing.
// Usage: node tools/simulate.mjs [days=14] [seed=1] [--verbose]
import { newGame } from '../tests/helpers.mjs';
import { parseItemId } from '../js/core/util.js';

const days = parseFloat(process.argv[2] || '14');
const seed = parseInt(process.argv[3] || '1', 10);
const verbose = process.argv.includes('--verbose');
const { g, data, clock } = newGame({ seed });
const b = () => g.home.board;
const DAY = 86400000;
const start = clock.now();

const genForChain = chain => {
  const c = data.chain(chain);
  for (const gid of c.source || []) {
    const gen = data.genById[gid];
    if (!gen) continue;
    if (gen.kind === 'portable') { const idx = b().items.findIndex(i => i && i.id.startsWith(gid + '_')); if (idx >= 0) return { type: 'portable', idx, gen }; }
    else if (g.s.built[gen.building]) return { type: 'struct', gen };
  }
  return null;
};

function wantBonus() {
  let w = 0;
  for (const qid of g.s.quests.active) { const q = data.questById[qid], prog = g.s.quests.progress[qid]; q.objectives.forEach((o, i) => { if (o.type === 'merge_bonus' && (prog[i] || 0) < o.count) w = Math.max(w, o.size); }); }
  return w;
}
function targets() {
  const out = []; // {id, count, kind}
  for (const qid of g.s.quests.active) {
    const q = data.questById[qid], prog = g.s.quests.progress[qid];
    q.objectives.forEach((o, i) => {
      if (o.type === 'deliver_item') out.push({ id: o.item, count: o.count - (prog[i] || 0), kind: 'deliver', giver: q.giver });
      if (o.type === 'create_item') out.push({ id: o.item, count: o.count - (prog[i] || 0), kind: 'create' });
      if (o.type === 'build') { const p = g.projectFor(o.building); if (p) for (const r of p.items) out.push({ id: r.item, count: r.count - (g.projectFill(p.key)[r.item] || 0), kind: 'project', bld: o.building }); }
    });
  }
  // next unbuilt building in unlocked zones
  for (const z of data.zones) { if (!g.s.zones.unlocked.includes(z.n)) continue; for (const st of z.sites) { const p = g.projectFor(st.building); if (p && p.kind === 'build') { for (const r of p.items) { const need = r.count - (g.projectFill(p.key)[r.item] || 0); if (need > 0) out.push({ id: r.item, count: need, kind: 'project', bld: st.building }); } break; } } }
  // clearing tools for the cheapest reachable obstacle
  let minTier = 99;
  for (let i = 0; i < b().n; i++) { const o = b().obst[i]; if (o && b().isOpen(i)) { const def = data.obstacleById[o.type]; if (def.tool && def.accepts?.minLevel < minTier) minTier = def.accepts.minLevel; } }
  if (minTier < 99) out.push({ id: `clearing_tools_${String(minTier).padStart(2, '0')}`, count: 3, kind: 'tool' });
  return out.filter(t => t.count > 0);
}

function protectedIds() { const s = new Map(); for (const t of targets()) if (t.kind !== 'create') s.set(t.id, (s.get(t.id) || 0) + t.count); return s; }

let stuckTicks = 0, actions = 0;
const log = [];
const note = (k, v) => log.push(`${((clock.now() - start) / DAY).toFixed(2)}d  ${k} ${v}`);

function collect() {
  const board = b();
  for (let i = 0; i < board.n; i++) {
    const it = board.items[i]; if (!it) continue;
    const info = data.item(it.id); if (!info) { console.log('UNKNOWN ITEM', JSON.stringify(it), i); process.exit(1); }
    const ch = data.chain(info.chain);
    if (ch.chest || ch.currency || (ch.amuletLevel === info.level) || (ch.ticketLevel === info.level) || (info.chain === 'pet' && info.level === 6)) { g.tap(i); g.settle(); return true; }
  }
  return false;
}
function unstore() {
  const board = b(); const tray = g.ctx.tray;
  for (let k = 0; k < tray.length; k++) {
    const it = tray[k]; if (!it) continue;
    const info = data.item(it.id), ch = data.chain(info.chain);
    const valuable = ch.chest || ch.currency || info.chain === 'amulet' || info.chain === 'pet';
    if (!valuable && board.emptyCount() < 6) continue;
    const spot = board.freeCellsInOrder ? board.nearestEmpty(board.idx(15, 36), 1)[0] : -1;
    if (spot === undefined || spot < 0) continue;
    const r = g.drop({ type: 'tray', slot: k }, spot, { confirmed: true });
    if (r.ok) { g.settle(); return true; }
  }
  return false;
}
function deliver() {
  const board = b();
  for (const t of targets()) {
    if (t.kind === 'create') continue;
    const slot = g.findItem(t.id);
    if (!slot) continue;
    if (t.kind === 'deliver') { const cell = g.residentCell(t.giver); if (cell == null) continue; const r = g.drop(slot, cell); if (r.ok) { g.settle(); return true; } }
    if (t.kind === 'project') { const dest = [...Array(board.n).keys()].find(i => board.struct[i]?.id === t.bld); if (dest != null) { const r = g.drop(slot, dest); if (r.ok) { g.settle(); return true; } } }
  }
  return false;
}
function buildOrUnlock() {
  for (const z of data.zones) for (const st of z.sites) { if (!g.s.zones.unlocked.includes(z.n) || g.s.built[st.building]) continue; const p = g.projectFor(st.building); if (p && g.projectReady(p) && g.s.player.coins >= p.coins) { const r = g.build(st.building); if (r.ok) { note('built', st.building); return true; } } }
  const n = g.nextZone();
  if (n <= 12) { const r = g.unlockZone(n); if (r.ok) { note('zone', n); return true; } }
  // generator upgrades are bought when affordable and filled
  return false;
}
function clearObstacles() {
  const board = b();
  for (let i = 0; i < board.n; i++) {
    const o = board.obst[i]; if (!o || !board.isOpen(i)) continue;
    const def = data.obstacleById[o.type]; if (!def.accepts || !def.tool && !def.accepts) continue;
    const slot = findMatching(def.accepts);
    if (slot) { const r = g.drop(slot, i, { confirmed: true }); if (r.ok) { g.settle(); return true; } }
  }
  return false;
}
function findMatching(spec) {
  const board = b();
  let best = null, bl = 99;
  for (let i = 0; i < board.n; i++) { const it = board.items[i]; if (it && !it.f && data.matches(it.id, spec)) { const l = data.item(it.id).level; if (l < bl) { bl = l; best = { type: 'board', idx: i }; } } }
  return best;
}
function merges() {
  const board = b(), prot = protectedIds();
  const seen = new Set(); const groups = [];
  for (let i = 0; i < board.n; i++) {
    const it = board.items[i]; if (!it || seen.has(i) || it.f || data.isMax(it.id)) continue;
    const grp = board.floodFill8(i, it.id); grp.forEach(c => seen.add(c));
    if (grp.length >= 3) groups.push({ id: it.id, cells: grp });
  }
  if (!groups.length) return false;
  const tgt = targets();
  const wantedMax = chain => chain === 'amulet' ? 5 : Math.max(0, ...tgt.map(t => parseItemId(t.id)).filter(p => p.chain === chain).map(p => p.level));
  const crowded = board.emptyCount() < 8, wb = wantBonus();
  groups.sort((a, c) => c.cells.length - a.cells.length);
  for (const grp of groups) {
    if (wb && grp.cells.length < wb && !crowded) continue;
    const p = parseItemId(grp.id), have = g.countItem(grp.id), keep = prot.get(grp.id) || 0;
    if (p.level >= wantedMax(p.chain) && !crowded) { if (!(wantedMax(p.chain) === 0 && p.level <= 3)) continue; }
    if (keep && have - Math.min(grp.cells.length, 5) < keep && !crowded) { if (grp.cells.length < have) continue; continue; }
    if (p.level >= 6 && wantedMax(p.chain) <= p.level && !crowded) continue;
    const [a, c] = grp.cells; const r = g.drop({ type: 'board', idx: a }, c, { confirmed: true });
    if (r.ok) { g.settle(); return true; }
  }
  return false;
}
let moveBudget = 0, lastMerges = 0;
function consolidate() {
  if (g.s.stats.merges !== lastMerges) { lastMerges = g.s.stats.merges; moveBudget = 12; }
  if (moveBudget <= 0) return false;

  // a human drags scattered copies together; the bot moves one stray item next to the biggest group of the same id
  const board = b(), byId = new Map();
  for (let i = 0; i < board.n; i++) { const it = board.items[i]; if (it && !it.f && !data.isMax(it.id) && data.item(it.id).family !== 'generator') { if (!byId.has(it.id)) byId.set(it.id, []); byId.get(it.id).push(i); } }
  const tgt = targets(); const wanted = new Set(tgt.map(t => parseItemId(t.id).chain));
  const ids = [...byId.entries()].filter(([id, cells]) => cells.length >= 3).sort((a, c) => (wanted.has(parseItemId(c[0]).chain) ? 1 : 0) - (wanted.has(parseItemId(a[0]).chain) ? 1 : 0) || parseItemId(a[0]).level - parseItemId(c[0]).level);
  for (const [id, cells] of ids) {
    const seen = new Set(), groups = [];
    for (const c of cells) { if (seen.has(c)) continue; const grp = board.floodFill8(c, id); grp.forEach(x => seen.add(x)); groups.push(grp); }
    groups.sort((a, c) => c.length - a.length);
    if (groups[0].length >= Math.max(3, wantBonus()) || groups.length < 2) continue;
    const main = groups[0];
    for (const stray of groups.slice(1).flat()) {
      let spot = -1;
      for (const m of main) { for (const n of board.neighbors8(m)) if (board.isOpen(n) && board.isEmpty(n) && !board.struct[n]) { spot = n; break; } if (spot >= 0) break; }
      if (spot < 0) { // no free cell: swap with a neighbour that is not part of this id
        outer: for (const m of main) for (const n of board.neighbors8(m)) { const o = board.items[n]; if (o && o.id !== id && !o.f && !board.struct[n] && data.item(o.id).family !== 'generator') { spot = n; break outer; } }
      }
      if (spot < 0) break;
      const r = g.drop({ type: 'board', idx: stray }, spot, { confirmed: true });
      if (r.ok) { moveBudget--; g.settle(); return true; }
    }
  }
  return false;
}
function produce() {
  const tgt = targets().filter(t => t.kind !== 'create' || true);
  tgt.sort((a, c) => parseItemId(a.id).level - parseItemId(c.id).level);
  const order = [];
  for (const t of tgt) { const p = parseItemId(t.id); if (!order.includes(p.chain)) order.push(p.chain); }
  for (const chain of order) {
    const gsrc = genForChain(chain); if (!gsrc) continue;
    if (gsrc.type === 'portable') { const r = g.tap(gsrc.idx); if (r.ok) { g.settle(); return true; } if (r.reason === 'noEnergy') return 'energy'; }
    else { const st = [...Array(b().n).keys()].map(i => b().struct[i]).find(s => s && s.id === gsrc.gen.building); const r = g.tap(b().idx(st.x, st.y + st.h - 1)); if (r.ok) { g.settle(); return true; } if (r.reason === 'noEnergy') return 'energy'; }
  }
  // nothing specific: spend on a generator that exists
  for (const gid of ['gen_seed', 'gen_toolbox', 'gen_garden']) { const idx = b().items.findIndex(i => i && i.id.startsWith(gid + '_')); if (idx >= 0) { const r = g.tap(idx); if (r.ok) { g.settle(); return true; } if (r.reason === 'noEnergy') return 'energy'; } }
  return false;
}
function declutter() {
  const board = b();
  if (board.emptyCount() > 3) return false;
  const prot = protectedIds();
  const tgt = targets();
  const needChain = new Map([['amulet', 5]]); // chains with a pending create/deliver target: keep their intermediates
  for (const t of tgt) { const p = parseItemId(t.id); needChain.set(p.chain, Math.max(needChain.get(p.chain) || 0, p.level)); }
  // surplus clearing tools: keep at most 3 per level
  const toolCount = {};
  let best = -1, bv = 1e9;
  for (let i = 0; i < board.n; i++) {
    const it = board.items[i]; if (!it) continue; const info = data.item(it.id);
    if (info.family === 'generator') continue;
    if ((prot.get(it.id) || 0) > 0) continue;
    const ch = data.chain(info.chain); if (!ch.sellable) continue;
    if (info.chain === 'clearing_tools') { toolCount[it.id] = (toolCount[it.id] || 0) + 1; if (toolCount[it.id] <= 3) continue; }
    else if (needChain.has(info.chain) && info.level < needChain.get(info.chain)) continue;
    if (info.sellValue < bv) { bv = info.sellValue; best = i; }
  }
  if (best < 0) return false;
  return g.sell({ type: 'board', idx: best }, { confirmed: true }).ok;
}

const endAt = start + days * DAY;
let lastReport = 0;
while (clock.now() < endAt && actions < 400000) {
  actions++;
  g.tick(0);
  const _t = {}; 
  let did = collect() || unstore() || deliver() || buildOrUnlock() || clearObstacles();
  if (!did) did = merges();
  if (!did) did = consolidate();
  if (!did) did = declutter();
  if (!did) { const r = produce(); if (r === 'energy') { clock.advance(60 * 1000); g.tick(60000); did = true; } else did = r; }
  if (!did) { stuckTicks++; clock.advance(10 * 60 * 1000); g.tick(0); if (g.s.gifts.bubble) g.popGift(); if (stuckTicks > 60) { note('STUCK', JSON.stringify(g.s.quests.active)); break; } }
  else stuckTicks = 0;
  if (g.s.gifts.bubble) g.popGift();
  const d = Math.floor((clock.now() - start) / DAY);
  if (d > lastReport) { lastReport = d; if (verbose || d % 2 === 0) note(`day ${d}`, `lvl ${g.s.player.level} zones ${g.s.zones.unlocked.length} quests ${g.s.quests.done.length}/220 coins ${g.s.player.coins} built ${Object.keys(g.s.built).length} empty ${b().emptyCount()} cleared ${g.s.stats.cleared} energySpent ${g.s.stats.energySpent}`); }
}
console.log(log.join('\n'));
const elapsed = (clock.now() - start) / DAY;
console.log(`\nResult after ${elapsed.toFixed(1)} simulated days (${actions} bot actions):`);
console.log(`  level ${g.s.player.level}, zones ${g.s.zones.unlocked.length}/12, story quests ${g.s.quests.done.length}/220, buildings ${Object.keys(g.s.built).length}/22`);
console.log(`  merges ${g.s.stats.merges} (4x ${g.s.stats.merges4}, 5x ${g.s.stats.merges5}), obstacles ${g.s.stats.cleared}, energy spent ${g.s.stats.energySpent}`);
console.log(`  active quests: ${g.s.quests.active.map(id => id + ' [' + data.questById[id].objectives.map(o => g.objectiveText(o)).join(', ') + ']').join(' | ')}`);
if (process.argv.includes('--board')) {
  const board = b(); const counts = {};
  board.items.forEach(it => { if (it) counts[it.id] = (counts[it.id] || 0) + 1; });
  console.log('board items:', JSON.stringify(counts));
  const obs = {}; board.obst.forEach((o, i) => { if (o && board.isOpen(i)) obs[o.type] = (obs[o.type] || 0) + 1; });
  console.log('open obstacles:', JSON.stringify(obs));
  console.log('targets:', JSON.stringify(targets()));
  console.log('tray:', JSON.stringify(g.ctx.tray.filter(Boolean).map(i => i.id)));
}
if (process.argv.includes('--zone')) { const n = g.nextZone(); console.log('ZONE', n, 'need', JSON.stringify(g.data ? '' : data.zoneByN[n].unlock), 'have amulets', g.s.player.amulets, 'coins', g.s.player.coins, 'lvl', g.s.player.level); console.log('UNLOCK', JSON.stringify(g.unlockZone(n))); const c = {}; b().items.forEach(i => { if (i && i.id.startsWith('amulet')) c[i.id] = (c[i.id] || 0) + 1; }); console.log('amulet items', JSON.stringify(c), 'tray', JSON.stringify(g.ctx.tray.filter(x => x && x.id.startsWith('amulet')).map(x => x.id))); }
if (process.argv.includes('--tools')) {
  const c = {}; b().items.forEach(i => { if (i && i.id.startsWith('clearing')) c[i.id] = (c[i.id] || 0) + 1; });
  console.log('TOOLS', JSON.stringify(c), 'energy', g.s.energy?.value ?? JSON.stringify(g.s.energy));
  const idx = b().items.findIndex(i => i && i.id.startsWith('gen_toolbox'));
  console.log('toolbox idx', idx, JSON.stringify(b().items[idx]), JSON.stringify(g.tap(idx)));
  console.log('stuck?', JSON.stringify(g.s.quests.active), 'empty', b().emptyCount());
}
