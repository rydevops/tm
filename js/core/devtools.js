// Developer tuning: change almost any number the game uses, on this device only. Values are kept in localStorage as a list of
// overrides (path -> number) and applied to the loaded game data at start-up (before a game exists) and again live from the dev panel.
// Nothing here touches the player's save, the version or the update notes. "Reset" puts back the numbers the game shipped with.
//
// Paths:  eco:<dotted path in economy.json>     e.g. eco:magnet.cost, eco:drops.minSec
//         sell:<item id>                         sell value of one item
//         shop:<item id>                         price of one item in the daily shop (when unset: sell value x shop.priceMult)
//         zone:<n>:<unlock key>                  zone unlock requirement (level, amulets, coins, clearedPct)
//         bld:<building id>                      coin cost of a building
//
// Besides the numbers there are a few on/off testing switches (flags), kept in the same storage entry:
//         completeQuests                         shows a "Complete" button on story quests that finishes them without the items

const KEY = 'tropical-merge-dev-v1';
export const DEV_PASSWORD = 'dev';
export const FLAGS = { completeQuests: 'Complete objectives' };
export const checkPassword = text => String(text || '').trim().toLowerCase() === DEV_PASSWORD;

const SKIP = new Set(['grid', 'save', 'ads', 'zone', 'hints']);      // unsafe, unused at run time, or baked into other data at build time (zones and sell values have their own editors)
const FRACTION_NAME = /(chance|bonus|mult|exp|growth|pct|factor|levelup|doubledrop|stagger|extra)/i;   // settings whose values are naturally fractions

const LABELS = {
  'magnet.cost': 'Magnet cost (coins)', 'magnet.cooldownSec': 'Magnet cooldown (seconds)',
  'drops.minSec': 'Balloons: shortest wait (seconds)', 'drops.maxSec': 'Balloons: longest wait (seconds)', 'drops.minCount': 'Balloons per wave (min)', 'drops.maxCount': 'Balloons per wave (max)',
  'drops.fallSec': 'Balloon fall time (seconds)', 'drops.maxOnGround': 'Most gifts on the ground', 'drops.retrySec': 'Retry when the board is full (seconds)', 'drops.minFreeCells': 'Free cells needed for a wave',
  'energy.max': 'Energy cap', 'energy.regenSeconds': 'Seconds per energy', 'energy.start': 'Starting energy',
  'refill.coins.cost': 'Energy refill price (coins)', 'refill.coins.energy': 'Energy per coin refill', 'refill.pearls.cost': 'Energy refill price (pearls)', 'refill.pearls.energy': 'Energy per pearl refill',
  'shop.priceMult': 'Shop price = sell value x', 'shop.dealCount': 'Shop deals per day', 'storage.slotCost': 'Tray slot price (coins)', 'shimmer.chance': 'Shimmer chance (0 to 1)',
  'merge.cascadeDelayMs': 'Chain merge delay (ms)', 'xp.base': 'XP for level 2', 'xp.exp': 'XP growth between levels'
};
const GROUP_NAMES = { energy: 'Energy', refill: 'Refills', sell: 'Selling', xp: 'XP and levels', levelUp: 'Level-up rewards', discovery: 'Discoveries', clear: 'Clearing obstacles', merge: 'Merging', magnet: 'Magnet', shimmer: 'Shimmer items', drops: 'Gift balloons', storage: 'Storage', zone: 'Zone unlocking (build-time values)', trade: 'Trade dock', generators: 'Generators', eat: 'Eating', hints: 'Hints', island: 'Expedition islands', daily: 'Daily tasks', weekly: 'Weekly tasks', offline: 'Offline', shop: 'Shop' };
const humanize = s => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

const isNum = v => typeof v === 'number' && Number.isFinite(v);
function walk(obj, base, out) {
  if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, base ? `${base}.${i}` : String(i), out));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, base ? `${base}.${k}` : k, out);
  else if (isNum(obj)) out.push(base);
}
const dig = (root, parts) => { let o = root; for (let i = 0; i < parts.length - 1; i++) { o = o?.[parts[i]]; if (o == null) return null; } return { o, k: parts[parts.length - 1] }; };

export class DevTweaks {
  constructor(data, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.data = data; this.store = storage;
    this.defaults = new Map();        // path -> shipped value (numbers only; shop: has no default)
    this.ecoPaths = [];
    const eco = [];
    for (const [k, v] of Object.entries(data.economy)) if (!SKIP.has(k)) walk(v, k, eco);
    for (let i = eco.length - 1; i >= 0; i--) if (/^sell\.(base|growth|table)/.test(eco[i])) eco.splice(i, 1);
    for (const p of eco) { this.ecoPaths.push(p); this.defaults.set('eco:' + p, this._read('eco:' + p)); }
    for (const it of data.items) if (it.sellValue > 0) this.defaults.set('sell:' + it.id, it.sellValue);
    for (const z of data.zones) for (const k of ['level', 'amulets', 'coins', 'clearedPct']) if (isNum(z.unlock?.[k])) this.defaults.set(`zone:${z.n}:${k}`, z.unlock[k]);
    for (const b of data.buildings) if (isNum(b.coins)) this.defaults.set('bld:' + b.id, b.coins);
    this.values = this._load();
    this.flags = this._loadFlags();
  }

  // ------------------------------------------------------------ storage
  _load() { try { const o = JSON.parse(this.store?.getItem(KEY) || 'null'); return o && o.values && typeof o.values === 'object' ? { ...o.values } : {}; } catch (e) { return {}; } }
  _loadFlags() { try { const o = JSON.parse(this.store?.getItem(KEY) || 'null'); return o && o.flags && typeof o.flags === 'object' ? Object.fromEntries(Object.entries(o.flags).filter(([k, v]) => k in FLAGS && v === true)) : {}; } catch (e) { return {}; } }
  _save() { try { if (Object.keys(this.values).length || Object.keys(this.flags || {}).length) this.store?.setItem(KEY, JSON.stringify({ v: 1, values: this.values, flags: this.flags })); else this.store?.removeItem(KEY); } catch (e) { /* private mode: changes last for this visit only */ } }

  // ------------------------------------------------------------ on/off testing switches
  flag(name) { return !!this.flags[name]; }
  setFlag(name, on) { if (!(name in FLAGS)) return false; if (on) this.flags[name] = true; else delete this.flags[name]; this._save(); return !!on; }

  // ------------------------------------------------------------ reading and writing the live data
  _read(path) {
    const d = this.data, [kind, rest] = [path.slice(0, path.indexOf(':')), path.slice(path.indexOf(':') + 1)];
    if (kind === 'eco') { const t = dig(d.economy, rest.split('.')); return t ? t.o[t.k] : undefined; }
    if (kind === 'sell') return d.itemById[rest]?.sellValue;
    if (kind === 'shop') return d.shopOverride[rest];
    if (kind === 'zone') { const [n, k] = rest.split(':'); return d.zoneByN[n]?.unlock?.[k]; }
    if (kind === 'bld') return d.buildings.find(b => b.id === rest)?.coins;
    return undefined;
  }
  _write(path, v) {
    const d = this.data, kind = path.slice(0, path.indexOf(':')), rest = path.slice(path.indexOf(':') + 1);
    if (kind === 'eco') { const t = dig(d.economy, rest.split('.')); if (t) t.o[t.k] = v; }
    else if (kind === 'sell') { if (d.itemById[rest]) d.itemById[rest].sellValue = v; }
    else if (kind === 'shop') { if (v == null) delete d.shopOverride[rest]; else d.shopOverride[rest] = v; }
    else if (kind === 'zone') { const [n, k] = rest.split(':'); const z = d.zoneByN[n]; if (z?.unlock) z.unlock[k] = v; }
    else if (kind === 'bld') { const b = d.buildings.find(x => x.id === rest); if (b) b.coins = v; }
  }
  known(path) { return this.defaults.has(path) || (path.startsWith('shop:') && !!this.data.itemById[path.slice(5)]); }

  /** Apply every saved override to the loaded data. Unknown paths (from an older build) are ignored. */
  applySaved() { for (const [p, v] of Object.entries(this.values)) if (this.known(p) && isNum(v)) this._write(p, v); return this; }

  get(path) { return path in this.values ? this.values[path] : this.defaults.get(path); }
  def(path) { return this.defaults.get(path); }
  changed(path) { return path in this.values; }
  count() { return Object.keys(this.values).length; }

  /** Clean up what was typed: a finite number >= 0, whole when the setting is a count. Returns null for nonsense. */
  clean(path, raw) {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    const def = this.defaults.get(path), parts = path.split(/[.:]/);
    const fractional = parts.some(p => FRACTION_NAME.test(p)) || (def != null && !Number.isInteger(def));
    const whole = path.startsWith('sell:') || path.startsWith('shop:') || path.startsWith('bld:') || (path.startsWith('zone:') && !path.endsWith(':clearedPct')) || (def != null && !fractional && def >= 1);
    return whole ? Math.round(n) : Math.round(n * 1e6) / 1e6;
  }
  /** Set a value (null / '' / nonsense puts the default back). Returns the value now in force. */
  set(path, raw) {
    if (!this.known(path)) return undefined;
    const v = raw === null || raw === '' ? null : this.clean(path, raw);
    if (v === null || (this.defaults.has(path) && v === this.defaults.get(path))) { this.reset(path); return this.get(path); }
    this.values[path] = v; this._write(path, v); this._save();
    return v;
  }
  reset(path) { if (!(path in this.values)) return; delete this.values[path]; this._write(path, this.defaults.has(path) ? this.defaults.get(path) : null); this._save(); }
  resetAll() { for (const p of Object.keys(this.values)) { this._write(p, this.defaults.has(p) ? this.defaults.get(p) : null); } this.values = {}; this._save(); }

  // ------------------------------------------------------------ lists for the panel
  /** Economy numbers grouped by top-level section: [{ group, title, fields: [{ path, label, def }] }] */
  ecoGroups() {
    const groups = new Map();
    for (const p of this.ecoPaths) {
      const g = p.split('.')[0];
      if (!groups.has(g)) groups.set(g, { group: g, title: GROUP_NAMES[g] || humanize(g), fields: [] });
      const rest = p.split('.').slice(1);
      const label = LABELS[p] || (rest.length ? rest.map(humanize).join(' › ') : humanize(g));
      groups.get(g).fields.push({ path: 'eco:' + p, label, def: this.defaults.get('eco:' + p) });
    }
    return [...groups.values()];
  }
  itemRows() {
    const d = this.data;
    return d.items.filter(it => it.sellValue > 0 || this.defaults.has('sell:' + it.id)).map(it => ({ id: it.id, name: d.name ? d.name(it.id) : it.id, level: it.level, chain: it.chain, sellPath: 'sell:' + it.id, shopPath: 'shop:' + it.id, autoShop: () => (this.defaults.get('sell:' + it.id) ?? 0) * d.economy.shop.priceMult }))
      .filter(r => d.chain(r.chain)?.sellable);
  }
  zoneRows() { return this.data.zones.map(z => ({ n: z.n, name: z.name, fields: ['level', 'amulets', 'coins', 'clearedPct'].filter(k => this.defaults.has(`zone:${z.n}:${k}`)).map(k => ({ path: `zone:${z.n}:${k}`, key: k, def: this.defaults.get(`zone:${z.n}:${k}`) })) })); }
  buildingRows() { return this.data.buildings.filter(b => this.defaults.has('bld:' + b.id)).map(b => ({ id: b.id, name: b.name, path: 'bld:' + b.id, def: this.defaults.get('bld:' + b.id) })); }
}
