// Exports every config table as JSON into /data (spec section 21: data-driven, versioned config).
// Run: node tools/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAINS, GENERATORS, CHEST_TABLES, RELICS, GEN_TIERS } from './data-chains.mjs';
import * as W from './data-world.mjs';
import { generateQuests } from './data-quests.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });
const write = (name, obj) => fs.writeFileSync(path.join(DATA, name), JSON.stringify(obj));
const pad = n => String(n).padStart(2, '0');

function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const loc = {};

// ---------------- chains and items
const USES = {
  crop: 'Deliver to residents, sell at the Trade Dock, or use in build sites.',
  tool: 'Drop on an obstacle to clear it. One tool is used per hit.',
  material: 'Deliver to build sites and residents.',
  animal: 'Deliver to farm quests. The top level can live on the farm.',
  food: 'Deliver to residents and orders.',
  treasure: 'Tap to collect it into your wallet. Merge first for more.',
  energy: 'Tap to collect energy. Merge first for more.',
  special: 'Tap to open or collect.',
  sea: 'Deliver to quests and the aquarium.',
  magic: 'Used for amulets and shrines.',
  dragon: 'Deliver to island quests. The top level can live on the island.',
  pet: 'Hatch into a permanent island companion.',
  generator: 'Tap to spawn items. Merge three of a kind to upgrade it.'
};
const chains = [], items = [];
for (const c of CHAINS) {
  const [key, name, family, unlockZone, levels, o] = c;
  const n = levels.length;
  const chain = {
    chain: key, name, family, levels: n, unlockedByZone: unlockZone, island: o.island || null,
    source: o.gen || (o.island ? ['island'] : ['reward']), mergeable: true,
    shimmerChance: o.shimmer || 0, tradeCategory: o.trade || null,
    valueMultiplier: o.valueMultiplier || 1, sellable: o.sellable !== false && !o.currency && !o.chest,
    currency: o.currency || null, chest: !!o.chest, generator: o.generator || null,
    amuletLevel: o.amuletLevel || null, ticketLevel: o.ticketLevel || null
  };
  chains.push(chain);
  levels.forEach((nm, i) => {
    const L = i + 1;
    const id = `${key}_${pad(L)}`;
    const tags = [key, ...(o.tags || [])];
    if (o.toolTags) tags.push(`clearing_tool_${L}`);
    if (['crop'].includes(family) && L >= 4) tags.push('edible');
    if (['food'].includes(family)) tags.push('edible');
    const base = L <= W.ECONOMY.sell.table.length ? W.ECONOMY.sell.table[L - 1] : Math.round(3 * Math.pow(1.9, L - 1));
    const sell = chain.sellable ? base * chain.valueMultiplier : 0;
    const item = {
      id, chain: key, level: L, nameKey: `item.${id}.name`, descKey: `item.${id}.desc`, family,
      sellValue: sell, xpOnCreate: L >= 2 ? Math.round(Math.pow(1.9, L - 2)) : 0, isMax: L === n, tags,
      useRules: [family === 'tool' ? 'obstacle' : o.currency || o.chest ? 'none' : 'resident', ...(chain.sellable ? ['trade dock'] : [])],
      rarityFlags: o.shimmer ? ['shimmerAllowed'] : [],
      art: { sprite: id, glow: L >= 9 ? 'gold' : L >= 7 ? 'blue' : L >= 5 ? 'white' : 'none' }
    };
    if (o.collect) item.collect = o.collect[i];
    items.push(item);
    loc[item.nameKey] = nm;
    loc[item.descKey] = `${name}, level ${L} of ${n}${L === n ? ' (max level)' : ''}. ${USES[family] || ''}`;
  });
}

// ---------------- generators
const generators = GENERATORS.map(g => ({
  ...g,
  outputs: g.outputs.map(([item, weight]) => ({ item, weight })),
  outputsByTier: g.outputsByTier ? Object.fromEntries(Object.entries(g.outputsByTier).map(([t, arr]) => [t, arr.map(([item, weight]) => ({ item, weight }))])) : undefined,
  upgrades: g.upgrades ? g.upgrades.map(u => ({ coins: u.coins, items: u.items.map(([item, count]) => ({ item, count })) })) : undefined
}));

// ---------------- obstacles
const obstacles = W.OBSTACLES;

// ---------------- buildings
const buildings = W.BUILDINGS.map(b => ({ ...b, items: b.items.map(([item, count]) => ({ item, count })) }));
const bById = Object.fromEntries(buildings.map(b => [b.id, b]));

// ---------------- zones (layout + obstacle placement)
const rng = mulberry(7161026);
let soilNo = 0;
const zones = [];
let totalPlayable = 0;
for (const z of W.ZONES) {
  const [rx, ry, rw, rh] = z.rect;
  const cell = (x, y) => `${x},${y}`;
  const inRect = (x, y) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  const reserved = new Set();
  const reserve = (x, y, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (!inRect(x + i, y + j)) throw new Error(`${z.id}: reserved cell outside zone ${x + i},${y + j}`); const k = cell(x + i, y + j); if (reserved.has(k)) throw new Error(`${z.id}: overlap at ${k}`); reserved.add(k); } };
  const sites = (z.sites || []).map(([b, x, y]) => { const def = bById[b]; reserve(x, y, def.w, def.h); return { building: b, x, y, w: def.w, h: def.h }; });
  const residents = Object.entries(z.residents || {}).map(([id, [x, y]]) => { reserve(x, y); return { id, x, y }; });
  const soils = (z.soil || []).map(([x, y]) => { reserve(x, y); soilNo++; return { id: `soil_${pad(soilNo)}`, x, y }; });
  const perches = Object.entries(z.perks || {}).map(([kind, [x, y]]) => { reserve(x, y); return { kind, x, y }; });
  let keep = new Set();
  if (z.keepClear) { const [kx, ky, kw, kh] = z.keepClear; for (let j = 0; j < kh; j++) for (let i = 0; i < kw; i++) { keep.add(cell(kx + i, ky + j)); } }
  const start = (z.start || []).map(([item, x, y]) => { if (!inRect(x, y)) throw new Error('start outside'); keep.add(cell(x, y)); return { item, x, y }; });
  keep.forEach(k => { if (reserved.has(k)) throw new Error(`${z.id}: keepClear overlaps ${k}`); });
  const occupied = new Set([...reserved, ...keep]);
  const placed = []; // obstacles
  const gridFree = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (!inRect(x + i, y + j) || occupied.has(cell(x + i, y + j))) return false; } return true; };
  const occupy = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occupied.add(cell(x + i, y + j)); };
  const tryPlace = (type, attempts = 200) => {
    const def = obstacles.find(o => o.id === type);
    for (let a = 0; a < attempts; a++) {
      const x = rx + Math.floor(rng() * rw), y = ry + Math.floor(rng() * rh);
      if (gridFree(x, y, def.w, def.h)) { occupy(x, y, def.w, def.h); placed.push({ type, x, y }); return def; }
    }
    return null;
  };
  for (const f of z.fixedObstacles || []) { occupy(f.x, f.y, 1, 1); placed.push({ ...f }); }
  for (const [type, count] of z.counts || []) for (let i = 0; i < count; i++) tryPlace(type);
  for (const [type, count] of z.special || []) for (let i = 0; i < count; i++) tryPlace(type);
  const area = rw * rh;
  const freeCells = area - reserved.size - keep.size;
  if (z.density) {
    const target = Math.round(freeCells * z.density);
    let used = placed.reduce((s, p) => { const d = obstacles.find(o => o.id === p.type); return s + d.w * d.h; }, 0);
    const [t0, t1] = z.tiers;
    const tierIds = obstacles.filter(o => o.tier >= t0 && o.tier <= t1 && o.tool && o.id !== 'driftwood').sort((a, b) => a.tier - b.tier);
    let guard = 0;
    while (used < target && guard++ < 2000) {
      const weights = tierIds.map(o => (t1 - o.tier + 1.5));
      let r = rng() * weights.reduce((s, w) => s + w, 0), pick = tierIds[0];
      for (let i = 0; i < tierIds.length; i++) { if ((r -= weights[i]) <= 0) { pick = tierIds[i]; break; } }
      if (used + pick.w * pick.h > target + 1) { const small = tierIds.filter(o => o.w * o.h === 1); if (!small.length) break; pick = small[Math.floor(rng() * small.length)]; }
      const d = tryPlace(pick.id, 120);
      if (d) used += d.w * d.h;
    }
  }
  // pockets: two 6-cell blocks near the far corners of the rect (zones 2+)
  const pockets = [];
  if (z.n >= 2) {
    const cx = rx + rw / 2, cy = ry + rh / 2;
    const cands = [];
    for (const [bw, bh] of [[3, 2], [2, 3]]) for (let y = ry; y + bh <= ry + rh; y++) for (let x = rx; x + bw <= rx + rw; x++) {
      let ok = true; const cs = [];
      for (let j = 0; j < bh && ok; j++) for (let i = 0; i < bw; i++) { if (reserved.has(cell(x + i, y + j)) || keep.has(cell(x + i, y + j))) { ok = false; break; } cs.push([x + i, y + j]); }
      if (ok) cands.push({ cs, d: Math.hypot(x + bw / 2 - cx, y + bh / 2 - cy) });
    }
    cands.sort((a, b) => b.d - a.d);
    const used = new Set();
    for (const c of cands) {
      if (pockets.length >= 2) break;
      if (c.cs.some(([x, y]) => used.has(cell(x, y)))) continue;
      // avoid cutting an obstacle in half
      const set = new Set(c.cs.map(([x, y]) => cell(x, y)));
      const cut = placed.some(p => { const d = obstacles.find(o => o.id === p.type); const cov = []; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) cov.push(cell(p.x + i, p.y + j)); const inside = cov.filter(k => set.has(k)).length; return inside > 0 && inside < cov.length; });
      if (cut) continue;
      c.cs.forEach(([x, y]) => used.add(cell(x, y)));
      pockets.push(c.cs);
    }
  }
  // obstacle total outside pockets (for the 70% rule)
  const pocketSet = new Set(pockets.flat().map(([x, y]) => cell(x, y)));
  const base = placed.filter(p => !pocketSet.has(cell(p.x, p.y))).length;
  totalPlayable += area;
  zones.push({
    id: z.id, n: z.n, name: z.name, rect: z.rect, playable: area, theme: z.theme,
    unlock: { level: z.level, amulets: z.amulets, coins: Math.round(W.ECONOMY.zone.coinsBase * Math.pow(z.n - 1, W.ECONOMY.zone.coinsExp) / 50) * 50, clearedPct: z.n === 1 ? 0 : W.ECONOMY.zone.clearedPct },
    content: z.content, resident: z.resident, sites, residents, soils, perches, start, pockets, obstacles: placed, obstacleBase: base
  });
}
if (totalPlayable !== 720) throw new Error('Playable cell total should be 720, got ' + totalPlayable);

// ---------------- quests
const quests = generateQuests();
const questOut = quests.map(q => {
  loc[`q.${q.id.replace('_', '.')}`] = q.text;
  return { id: q.id, giver: q.giver, act: q.act, textKey: `q.${q.id.replace('_', '.')}`, objectives: q.objectives, requires: q.requires, rewards: q.rewards };
});
if (questOut.length !== 220) throw new Error('quest count ' + questOut.length);

// ---------------- achievements (60)
const ACH = [];
const A = (id, text, stat, goal, reward) => ACH.push({ id, text, stat, goal, reward });
[[100, 'coins', 50], [500, 'coins', 100], [2500, 'chest_02'], [10000, 'chest_04']].forEach(([g, r, a], i) => A(`merges_${g}`, `Perform ${g.toLocaleString('en-US')} merges`, 'merges', g, r === 'coins' ? { coins: a } : { item: r }));
A('bonus_hunter', 'Bonus Hunter: 50 five-item merges', 'merges5', 50, { item: 'chest_03' });
A('bonus_master', 'Bonus Master: 500 five-item merges', 'merges5', 500, { pearls: 40 });
A('bonus4_100', 'Perform 100 four-item merges', 'merges4', 100, { item: 'chest_03' });
[[25, { coins: 50 }], [100, { coins: 150 }], [500, { pearls: 25 }], [1500, { item: 'chest_05' }]].forEach(([g, r]) => A(`clear_${g}`, g === 500 ? `Green Thumb: clear ${g} obstacles` : `Clear ${g} obstacles`, 'cleared', g, r));
[[1, { coins: 50 }], [5, { item: 'chest_02' }], [11, { item: 'chest_03' }], [22, { pearls: 100 }]].forEach(([g, r]) => A(`build_${g}`, g === 22 ? 'Master Builder: build all 22 home buildings' : `Build ${g} building${g > 1 ? 's' : ''}`, 'built', g, r));
[[10, { coins: 100 }], [50, { item: 'chest_03' }], [100, { pearls: 25 }], [220, { pearls: 100 }]].forEach(([g, r]) => A(`quests_${g}`, `Complete ${g} story quests`, 'storyQuests', g, r));
[[10, { coins: 50 }], [50, { item: 'chest_02' }], [100, { item: 'chest_03' }], [215, { pearls: 150 }]].forEach(([g, r]) => A(`disc_${g}`, `Discover ${g} items`, 'discovered', g, r));
[[5, { energy: 25 }], [10, { item: 'chest_02' }], [25, { item: 'chest_04' }], [40, { pearls: 50 }], [60, { pearls: 100 }]].forEach(([g, r]) => A(`level_${g}`, `Reach level ${g}`, 'level', g, r));
[[1000, { coins: 100 }], [20000, { item: 'chest_03' }], [200000, { pearls: 50 }]].forEach(([g, r]) => A(`coins_${g}`, `Collect ${g.toLocaleString('en-US')} coins`, 'coinsEarned', g, r));
[[1, { item: 'chest_03' }], [3, { pearls: 30 }], [6, { pearls: 150 }]].forEach(([g, r]) => A(`isl_${g}`, g === 6 ? 'Globetrotter: complete all 6 islands' : `Complete ${g} island${g > 1 ? 's' : ''}`, 'islandsDone', g, r));
[[1, { coins: 100 }], [4, { item: 'chest_04' }], [7, { item: 'chest_05' }]].forEach(([g, r]) => A(`living_${g}`, g === 7 ? 'Animal Friend: place all 7 living items' : `Place ${g} living item${g > 1 ? 's' : ''}`, 'livingPlaced', g, r));
[[5, { coins: 100 }], [20, { item: 'chest_03' }], [40, { pearls: 50 }]].forEach(([g, r]) => A(`relic_${g}`, `Find ${g} relics`, 'relics', g, r));
[[10, { coins: 50 }], [100, { item: 'chest_04' }], [500, { pearls: 50 }]].forEach(([g, r]) => A(`shimmer_${g}`, g === 100 ? `Shimmer Seeker: merge ${g} shimmer items` : `Merge ${g} shimmer items`, 'shimmerMerged', g, r));
[[1, { coins: 50 }], [3, { item: 'chest_03' }], [6, { pearls: 50 }]].forEach(([g, r]) => A(`pets_${g}`, `Collect ${g} pet${g > 1 ? 's' : ''}`, 'pets', g, r));
[[10, { coins: 50 }], [10, null]].slice(0, 1).forEach(([g, r]) => A(`luau_${g}`, `Chef's Table: create ${g} Luau Banquets`, 'luau', g, { pearls: 30 }));
[[20, { coins: 80 }], [100, { item: 'chest_03' }]].forEach(([g, r]) => A(`deliver_${g}`, `Deliver ${g} items to residents`, 'delivered', g, r));
[[1, { coins: 50 }], [7, { item: 'chest_04' }], [30, { pearls: 50 }]].forEach(([g, r]) => A(`daily_${g}`, g === 7 ? 'Complete a 7-day challenge streak' : `Complete ${g} daily challenge${g > 1 ? 's' : ''}`, g === 7 ? 'bestStreak' : 'dailyDone', g, r));
[[10, { coins: 100 }], [50, { item: 'chest_03' }]].forEach(([g, r]) => A(`sell_${g}`, `Sell ${g} items at the market`, 'sold', g, r));
[[5, { coins: 100 }], [25, { item: 'chest_04' }]].forEach(([g, r]) => A(`orders_${g}`, `Complete ${g} trade orders`, 'orders', g, r));
[[5, { item: 'chest_03' }], [10, { item: 'chest_04' }]].forEach(([g, r]) => A(`lvl7_${g}`, `Create ${g} items of level 7 or higher`, 'highItems', g, r));
[[50, { item: 'chest_02' }], [500, { pearls: 30 }]].forEach(([g, r]) => A(`energy_${g}`, `Spend ${g.toLocaleString('en-US')} energy`, 'energySpent', g, r));
A('first_harvest', 'First Harvest: create any level 4 crop', 'crop4', 1, { coins: 20 });
A('open_chests_25', 'Open 25 chests', 'chestsOpened', 25, { item: 'chest_03' });
A('open_chests_100', 'Open 100 chests', 'chestsOpened', 100, { pearls: 40 });
A('zones_6', 'Unlock 6 zones', 'zones', 6, { item: 'chest_03' });
A('zones_12', 'Unlock all 12 zones', 'zones', 12, { pearls: 75 });
A('fill_10', 'Complete 10 resident requests', 'requests', 10, { coins: 150 });
A('eat_5', 'Eat 5 meals at the Hearth', 'eaten', 5, { item: 'sparks_03' });
A('gifts_20', 'Pop 20 gift bubbles', 'gifts', 20, { coins: 100 });
if (ACH.length < 60) { let k = 0; while (ACH.length < 60) { k++; A(`taps_${k * 250}`, `Tap generators ${k * 250} times`, 'taps', k * 250, { coins: 50 * k }); } }
if (ACH.length > 60) ACH.length = 60;

// ---------------- UI strings (English)
const UI = {
  'ui.title': 'Tropical Merge', 'ui.play': 'Play', 'ui.continue': 'Continue', 'ui.newGame': 'New game',
  'ui.energy': 'Energy', 'ui.coins': 'Coins', 'ui.pearls': 'Pearls', 'ui.level': 'Level',
  'ui.noSpace': 'No space. Merge, store or sell!', 'ui.maxLevel': 'Max level',
  'ui.needTool': 'Needs a stronger tool', 'ui.welcomeBack': 'Welcome back'
};
Object.assign(loc, UI);
const arrive = {
  beni: "Welcome to Isla Solana, kiddo. She's seen better days. So have I.",
  mateo: "I heard hammering. Thought it was a woodpecker. Turns out it's you.",
  tala: 'The herbs here have been lonely. They will be glad of company.',
  rosa: 'Who left this kitchen in such a state? Never mind. I will fix it.',
  kai: 'I am Kai! I know every shell on this island. Well, almost.',
  victor: 'Victor Crane. I have an offer for the bay. Do not look at me like that.',
  okoye: 'Dr. Okoye. I treat animals. Goats, mostly. And their opinions.',
  lena: 'Oh! A person! Quick, mind that stone, it is a thousand years old.'
};
Object.entries(arrive).forEach(([k, v]) => { loc[`res.${k}.arrive`] = v; });

// ---------------- islands
const islands = W.ISLANDS;

// ---------------- write everything
write('chains.json', chains);
write('items.json', items);
write('generators.json', { generators, tiers: GEN_TIERS });
write('chests.json', { tables: CHEST_TABLES, relics: RELICS });
write('obstacles.json', obstacles);
write('buildings.json', { buildings, perkCaps: W.PERK_CAPS });
write('zones.json', { grid: W.GRID, zones });
write('residents.json', { residents: W.RESIDENTS });
write('pets.json', { pets: W.PETS, living: W.LIVING });
write('quests.json', { quests: questOut, daily: W.DAILY_TEMPLATES, weekly: W.WEEKLY_TEMPLATES, achievements: ACH });
write('islands.json', { islands });
write('economy.json', W.ECONOMY);
write('events.json', { templates: W.EVENT_TEMPLATES, track: W.EVENT_TRACK, themes: W.THEMES });
fs.mkdirSync(path.join(DATA, 'loc'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'loc', 'en.json'), JSON.stringify(loc));
const manifest = { version: 1, built: new Date().toISOString().slice(0, 10), files: ['chains', 'items', 'generators', 'chests', 'obstacles', 'buildings', 'zones', 'residents', 'pets', 'quests', 'islands', 'economy', 'events'].map(n => `data/${n}.json`).concat(['data/loc/en.json']) };
fs.writeFileSync(path.join(DATA, 'manifest.json'), JSON.stringify(manifest));

const homeChains = chains.filter(c => !c.island && c.family !== 'generator' && c.chain !== 'dragon' || c.chain === 'dragon');
console.log(`chains: ${chains.length} total (${chains.filter(c => !c.island && c.family !== 'generator').length} home, ${chains.filter(c => c.island).length} island, ${chains.filter(c => c.family === 'generator').length} portable generator)`);
console.log(`items: ${items.length}; home item levels: ${items.filter(i => !chains.find(c => c.chain === i.chain).island && chains.find(c => c.chain === i.chain).family !== 'generator').length}`);
console.log(`generators: ${generators.length}, buildings: ${buildings.length}, zones: ${zones.length}, playable: ${totalPlayable}, quests: ${questOut.length}, achievements: ${ACH.length}`);
console.log('obstacles placed:', zones.map(z => z.obstacles.length).join(' '), 'total', zones.reduce((s, z) => s + z.obstacles.length, 0));
console.log('amulets required:', zones.reduce((s, z) => s + z.unlock.amulets, 0), 'zone coins:', zones.map(z => z.unlock.coins).join(' '));
