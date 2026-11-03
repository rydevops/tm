// "How do I get this?": the whole way to an item from the start of the game, worked out from the game's own data, so it can never drift
// from the rules. Used by the Quest Book. Pure functions: no DOM, no state.
import { parseItemId, itemId } from './util.js';

const sum = list => list.reduce((s, x) => s + x, 0);

/** What opening a zone asks for. */
export function zoneNeeds(d, n) {
  const z = d.zoneByN[n]; if (!z) return null;
  return { n, name: z.name, level: z.unlock.level, amulets: z.unlock.amulets, coins: z.unlock.coins, free: n === 1 };
}

/** The ways to make one item of the lowest level of a chain, and what each way needs first. */
function makersOf(d, chain) {
  const out = [];
  for (const gen of d.generators) {
    const all = [...(gen.outputs || []), ...Object.values(gen.outputsByTier || {}).flat()].filter(o => parseItemId(o.item)?.chain === chain);
    if (!all.length) continue;
    const total = sum((gen.outputs || []).map(o => o.weight)) || 1;
    const outputs = (gen.outputs || []).map(o => ({ id: o.item, pct: Math.round(o.weight / total * 100) }));
    const mk = { gen: { id: gen.id, name: gen.name, kind: gen.kind, cost: gen.cost, outputs, upgrades: gen.upgrades ? gen.upgrades.length : 0 }, how: null };
    if (gen.kind === 'portable') {
      const start = d.zones.find(z => z.start.some(s => s.item.startsWith(gen.id + '_')));
      const gift = d.zones.find(z => (z.gifts || []).some(g => g.startsWith(gen.id + '_')));
      mk.how = start ? { kind: 'start' } : gift ? { kind: 'gift', zone: zoneNeeds(d, gift.n) } : { kind: 'reward' };
    } else if (gen.building === 'island') {
      const isl = d.islands.find(i => (i.genOutputs || []).some(([id]) => parseItemId(id)?.chain === chain));
      mk.how = { kind: 'island', island: isl ? { id: isl.id, name: isl.name, level: isl.level } : null };
    } else {
      const b = d.buildingById[gen.building];
      mk.how = b ? { kind: 'build', building: { id: b.id, name: b.name, coins: b.coins, items: b.items.map(i => ({ id: i.item, count: i.count })) }, zone: zoneNeeds(d, b.zone) } : { kind: 'reward' };
    }
    out.push(mk);
  }
  const rank = m => ({ start: 0, gift: 1, build: 2, island: 3, reward: 4 }[m.how.kind]);
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Everything to know about getting `id`, from nothing to the item in hand. Returns null for an unknown item. */
export function itemJourney(d, id) {
  const it = d.itemById[id]; if (!it) return null;
  const ch = d.chainByKey[it.chain];
  const makers = makersOf(d, it.chain);
  const outLevels = makers.flatMap(m => m.gen.outputs.map(o => parseItemId(o.id).level));
  const startLevel = Math.min(it.level, outLevels.length ? Math.min(...outLevels) : 1);
  const ladder = [];
  for (let l = startLevel; l <= it.level; l++) { const x = d.itemById[itemId(it.chain, l)]; ladder.push({ id: x.id, name: d.name(x.id), level: l }); }
  const steps = it.level - startLevel;
  // merging n matching items makes n-2 of the next level: one needs 3, and chaining big merges costs 2 more items per level
  const need = { best: steps === 0 ? 1 : 2 * steps + 1, plain: Math.pow(3, steps), steps };
  const drops = d.obstacles.filter(o => o.drops && (o.drops.items || []).some(x => parseItemId(x)?.chain === it.chain)).map(o => ({ id: o.id, name: o.name }));
  const chests = Object.entries(d.chestTables).filter(([, t]) => (t.extras || []).some(e => e[0] && parseItemId(e[0])?.chain === it.chain)).map(([cid]) => cid);
  const island = ch.island ? d.islands.find(i => i.id === ch.island) : null;
  // a portable generator item (Seed Pouch, Garden Plot, Toolbox) is given at the start or when a zone opens
  let genSource = null;
  if (ch.generator) {
    const start = d.zones.find(z => z.start.some(x => x.item.startsWith(ch.generator + '_')));
    const gift = d.zones.find(z => (z.gifts || []).some(x => x.startsWith(ch.generator + '_')));
    genSource = start ? { kind: 'start' } : gift ? { kind: 'gift', zone: zoneNeeds(d, gift.n) } : { kind: 'reward' };
  }
  return {
    genSource,
    item: { id, name: d.name(id), level: it.level, levels: ch.levels, chain: it.chain, chainName: ch.name, isMax: it.isMax },
    ladder, startLevel, need, makers, drops, chests,
    island: island ? { id: island.id, name: island.name, level: island.level } : null,
    zone: ch.unlockedByZone > 0 && ch.unlockedByZone < 99 ? zoneNeeds(d, ch.unlockedByZone) : null,
    kind: ch.chest ? 'chest' : ch.currency ? 'currency' : ch.generator ? 'generator' : it.chain === 'supplies' ? 'supplies' : null,
    currency: ch.currency || null
  };
}

/** The first levels of the story, grouped into acts. */
export function questActs(d) {
  const acts = [];
  for (const q of d.quests) { (acts[q.act - 1] ||= { act: q.act, quests: [] }).quests.push(q); }
  return acts.filter(Boolean);
}
