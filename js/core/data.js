// Loads all versioned config files and builds lookup indices. Works in browsers (fetch) and node (fs).
import { parseItemId, itemId } from './util.js';

const FILES = ['chains', 'items', 'generators', 'chests', 'obstacles', 'buildings', 'zones', 'residents', 'pets', 'quests', 'islands', 'economy', 'events'];

export async function loadData(reader) {
  const out = {};
  for (const f of FILES) out[f] = await reader(`data/${f}.json`);
  out.loc = await reader('data/loc/en.json');
  return new Data(out);
}

export class Data {
  constructor(raw) {
    this.raw = raw;
    this.economy = raw.economy;
    this.shopOverride = {};
    this.loc = raw.loc || {};
    this.chains = raw.chains;
    this.chainByKey = Object.fromEntries(raw.chains.map(c => [c.chain, c]));
    this.items = raw.items;
    this.itemById = Object.fromEntries(raw.items.map(i => [i.id, i]));
    this.generators = raw.generators.generators;
    this.genTiers = raw.generators.tiers;
    this.genById = Object.fromEntries(this.generators.map(g => [g.id, g]));
    this.chestTables = raw.chests.tables;
    this.relics = raw.chests.relics;
    this.obstacles = raw.obstacles;
    this.obstacleById = Object.fromEntries(raw.obstacles.map(o => [o.id, o]));
    this.buildings = raw.buildings.buildings;
    this.perkCaps = raw.buildings.perkCaps;
    this.buildingById = Object.fromEntries(this.buildings.map(b => [b.id, b]));
    this.grid = raw.zones.grid;
    this.zones = raw.zones.zones;
    this.zoneByN = Object.fromEntries(this.zones.map(z => [z.n, z]));
    this.residents = raw.residents.residents;
    this.residentById = Object.fromEntries(this.residents.map(r => [r.id, r]));
    this.pets = raw.pets.pets;
    this.petById = Object.fromEntries(this.pets.map(p => [p.id, p]));
    this.living = raw.pets.living;
    this.quests = raw.quests.quests;
    this.questById = Object.fromEntries(this.quests.map(q => [q.id, q]));
    this.questIndex = Object.fromEntries(this.quests.map((q, i) => [q.id, i]));
    this.dailyTemplates = raw.quests.daily;
    this.weeklyTemplates = raw.quests.weekly;
    this.achievements = raw.quests.achievements;
    this.islands = raw.islands.islands;
    this.islandById = Object.fromEntries(this.islands.map(i => [i.id, i]));
    this.events = raw.events;
    // cell -> zone lookup for the home grid
    this.cellZone = new Int8Array(this.grid.w * this.grid.h);
    for (const z of this.zones) { const [x, y, w, h] = z.rect; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.cellZone[(y + j) * this.grid.w + x + i] = z.n; }
  }
  t(key, fallback) { return this.loc[key] ?? fallback ?? key; }
  item(id) { return this.itemById[id]; }
  chain(key) { return this.chainByKey[key]; }
  name(id) { const it = this.itemById[id]; return it ? this.t(it.nameKey, id) : id; }
  desc(id) { const it = this.itemById[id]; return it ? this.t(it.descKey, '') : ''; }
  nextId(id) { const it = this.itemById[id]; if (!it || it.isMax) return null; return itemId(it.chain, it.level + 1); }
  maxLevel(chainKey) { return this.chainByKey[chainKey].levels; }
  isMax(id) { const it = this.itemById[id]; return !it || it.isMax; }
  parse(id) { return parseItemId(id); }
  sellValue(id) { return this.itemById[id]?.sellValue || 0; }
  /** What the daily shop charges for an item. `shopOverride` (id -> coins) is filled by dev mode; otherwise it follows the sell value. */
  shopPrice(id) { const o = this.shopOverride && this.shopOverride[id]; return o != null ? o : this.sellValue(id) * this.economy.shop.priceMult; }
  /** Does `id` satisfy an accepts-spec like {chain, minLevel} / {item} / {category, minLevel}? */
  matches(id, spec) {
    if (!spec) return false;
    const it = this.itemById[id];
    if (!it) return false;
    if (spec.item) return it.id === spec.item;
    if (spec.chain && it.chain !== spec.chain) return false;
    if (spec.category) { const ch = this.chainByKey[it.chain]; if (ch.tradeCategory !== spec.category) return false; }
    if (spec.minLevel && it.level < spec.minLevel) return false;
    if (spec.tag && !it.tags.includes(spec.tag)) return false;
    return true;
  }
}
