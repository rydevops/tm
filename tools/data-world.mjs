// Source tables for the world: zones, buildings, obstacles, residents, pets, islands, economy (spec sections 4, 10-16).

// The island is laid out on a base 30 x 40 plan (see BASE_ZONES) and every zone, including the locked ones, is scaled
// SCALE times in each direction (SCALE 2 = 4x the area). Building, obstacle and item art keeps its size, so the extra
// ground is open space to merge in. Obstacle counts grow more slowly than the area (see OBST_*), so zones stay open.
export const SCALE = 2;
export const GRID = { w: 30 * SCALE, h: 40 * SCALE };
const OBST_START = 2.5;   // obstacle multiplier for the opening zone's fixed counts
const OBST_ZONE = 2;      // obstacle multiplier for every later zone (area grows 4x)

export const OBSTACLES = [
  { id: 'tall_grass', name: 'Tall Grass', tier: 1, w: 1, h: 1, hits: 1, accepts: { chain: 'clearing_tools', minLevel: 1 }, tool: true },
  { id: 'thorn_bush', name: 'Thorn Bush', tier: 2, w: 1, h: 1, hits: 1, accepts: { chain: 'clearing_tools', minLevel: 2 }, tool: true },
  { id: 'dense_brush', name: 'Dense Brush', tier: 3, w: 1, h: 1, hits: 2, accepts: { chain: 'clearing_tools', minLevel: 3 }, tool: true },
  { id: 'vine_tangle', name: 'Vine Tangle', tier: 4, w: 1, h: 1, hits: 2, accepts: { chain: 'clearing_tools', minLevel: 4 }, tool: true },
  { id: 'small_stump', name: 'Small Stump', tier: 5, w: 1, h: 1, hits: 2, accepts: { chain: 'clearing_tools', minLevel: 5 }, tool: true },
  { id: 'big_stump', name: 'Big Stump', tier: 6, w: 2, h: 1, hits: 3, accepts: { chain: 'clearing_tools', minLevel: 6 }, tool: true },
  { id: 'boulder', name: 'Boulder', tier: 7, w: 2, h: 2, hits: 3, accepts: { chain: 'clearing_tools', minLevel: 7 }, tool: true },
  { id: 'rubble_pile', name: 'Rubble Pile', tier: 8, w: 2, h: 2, hits: 4, accepts: { chain: 'clearing_tools', minLevel: 8 }, tool: true },
  // special obstacles
  { id: 'driftwood', name: 'Driftwood Pile', tier: 1, w: 1, h: 1, hits: 1, accepts: { chain: 'clearing_tools', minLevel: 1 }, tool: true, drops: { items: ['lumber_01', 'fiber_01'], count: [2, 3], noHidden: true } },
  { id: 'locked_crate', name: 'Locked Crate', tier: 3, w: 1, h: 1, hits: 1, accepts: { chain: 'hardware', minLevel: 5 }, reward: { item: 'chest_02' }, hint: 'Needs a Padlock' },
  { id: 'hungry_boar', name: 'Hungry Boar', tier: 4, w: 1, h: 1, hits: 1, accepts: { category: 'fruit', minLevel: 4 }, reward: { hiddenItems: 2 }, hint: 'Feed it a ripe fruit (level 4+)' },
  { id: 'mud_pit', name: 'Mud Pit', tier: 4, w: 3, h: 1, hits: 3, accepts: { item: 'stone_04' }, hint: 'Pave it with 3 Big Stone' },
  { id: 'sealed_gate', name: 'Sealed Gate', tier: 5, w: 1, h: 1, hits: 1, accepts: null, hint: 'Opens when the story quest is done' },
  { id: 'fallen_tree', name: 'Fallen Tree', tier: 5, w: 2, h: 1, hits: 2, accepts: { chain: 'lumber', minLevel: 5 }, hint: 'Build a bridge with 2 Rough Poles' }
];

// Rect = [x, y, w, h] on the base plan. Playable cells per zone match spec section 12 (720 total before scaling).
const BASE_ZONES = [
  { n: 1, id: 'zone_01', name: 'Shipwreck Cove', rect: [10, 34, 8, 6], level: 1, amulets: 0, theme: 'cove', resident: 'beni',
    content: 'Seed Pouch, Toolbox, Welcome Dock, Marlene\'s Cottage',
    sites: [['bld_welcome_dock', 12, 39], ['bld_cottage', 15, 34]],
    residents: { beni: [11, 39], marlene: [16, 37], mateo: [17, 38] },
    keepClear: [11, 36, 5, 3],
    start: [['gen_seed_01', 12, 37], ['gen_toolbox_01', 14, 37]],
    counts: [['driftwood', 9], ['tall_grass', 6], ['thorn_bush', 5]], fixedObstacles: [{ type: 'tall_grass', x: 13, y: 35, hidden: 'chest_01' }] },
  { n: 2, id: 'zone_02', name: 'Overgrown Farmstead', rect: [18, 35, 10, 5], level: 3, amulets: 0, theme: 'farm', resident: 'mateo',
    content: 'Lumber Yard, coconut chain',
    sites: [['bld_lumber_yard', 25, 35]], residents: {}, soil: [[18, 39], [19, 39], [20, 39]],
    density: 0.6, tiers: [1, 4], counts: [['driftwood', 4]] },
  { n: 3, id: 'zone_03', name: 'Hen Meadow and Market Row', rect: [20, 28, 8, 7], level: 5, amulets: 1, theme: 'meadow', resident: 'tala',
    content: 'Hen House, Garden Plot, Market Stall (trade dock)', gifts: ['gen_garden_01'],
    sites: [['bld_hen_house', 20, 28], ['bld_market_stall', 24, 28]], residents: { tala: [23, 31] }, soil: [[26, 32], [27, 32], [27, 33]], perks: { hen: [22, 32] },
    density: 0.6, tiers: [1, 4], special: [['hungry_boar', 1]] },
  { n: 4, id: 'zone_04', name: 'Stonebrook', rect: [10, 28, 10, 6], level: 8, amulets: 1, theme: 'creek', resident: 'rosa',
    content: 'Stone Quarry, Kitchen Hearth, pineapple chain',
    sites: [['bld_stone_quarry', 10, 28], ['bld_kitchen_hearth', 17, 28]], residents: { rosa: [15, 31] },
    density: 0.62, tiers: [2, 6], special: [['mud_pit', 1], ['locked_crate', 2]] },
  { n: 5, id: 'zone_05', name: 'Lagoon Bend', rect: [10, 22, 10, 6], level: 11, amulets: 2, theme: 'lagoon', resident: 'kai',
    content: 'Cow Shed, Fishing Dock, sea chains',
    sites: [['bld_cow_shed', 10, 22], ['bld_fishing_dock', 10, 26]], residents: { kai: [13, 25] }, soil: [[17, 27]], perks: { cow: [14, 23] },
    density: 0.62, tiers: [2, 6], special: [['locked_crate', 2], ['hungry_boar', 1]] },
  { n: 6, id: 'zone_06', name: 'Mango Orchard and Sunset Beach', rect: [20, 20, 8, 8], level: 14, amulets: 2, theme: 'orchard', resident: 'victor',
    content: 'Juice Stand, Windmill, Beach Cafe, mango chain',
    sites: [['bld_juice_stand', 20, 20], ['bld_windmill', 25, 20], ['bld_beach_cafe', 22, 26]], residents: { victor: [23, 23] }, soil: [[27, 24]],
    density: 0.62, tiers: [2, 6], special: [['fallen_tree', 1], ['locked_crate', 2]] },
  { n: 7, id: 'zone_07', name: 'Goat Hills', rect: [20, 12, 8, 8], level: 17, amulets: 3, theme: 'hills', resident: 'okoye',
    content: 'Goat Pen, Cliff Bridge, papaya chain',
    sites: [['bld_goat_pen', 20, 12], ['bld_cliff_bridge', 20, 17]], residents: { okoye: [24, 15] }, soil: [[26, 18]],
    density: 0.64, tiers: [3, 8], special: [['sealed_gate', 1], ['mud_pit', 1]] },
  { n: 8, id: 'zone_08', name: 'Whispering Shrine Grove', rect: [10, 16, 10, 6], level: 20, amulets: 3, theme: 'shrine', resident: 'lena',
    content: 'Spirit Shrine (repair), amulet production',
    sites: [['bld_spirit_shrine', 13, 17]], residents: { lena: [17, 20] }, soil: [[11, 20]],
    density: 0.64, tiers: [3, 8], special: [['locked_crate', 2], ['fallen_tree', 1]] },
  { n: 9, id: 'zone_09', name: 'Wonder Hollow', rect: [10, 8, 8, 8], level: 24, amulets: 4, theme: 'hollow', resident: null,
    content: 'Nest of Wonders, Museum',
    sites: [['bld_nest_of_wonders', 10, 8], ['bld_museum', 14, 12]], residents: {}, soil: [[12, 14]],
    density: 0.64, tiers: [3, 8], special: [['hungry_boar', 1], ['mud_pit', 1]] },
  { n: 10, id: 'zone_10', name: 'Lantern Cliffs', rect: [18, 4, 8, 8], level: 28, amulets: 4, theme: 'cliffs', resident: null,
    content: 'Lighthouse, Greenhouse, Dragon Perch',
    sites: [['bld_lighthouse', 24, 4], ['bld_greenhouse', 18, 8]], residents: {}, soil: [[21, 10]], perks: { dragon: [22, 6] },
    density: 0.66, tiers: [3, 8], special: [['sealed_gate', 1], ['locked_crate', 2]] },
  { n: 11, id: 'zone_11', name: 'Coral Harbor', rect: [4, 5, 6, 11], level: 32, amulets: 5, theme: 'harbor', resident: null,
    content: 'Aquarium, Harbor (boat upgrade)',
    sites: [['bld_aquarium', 4, 6], ['bld_harbor', 4, 13]], residents: {}, soil: [[8, 10]],
    density: 0.66, tiers: [3, 8], special: [['fallen_tree', 1], ['mud_pit', 1]] },
  { n: 12, id: 'zone_12', name: 'Temple Heights', rect: [10, 0, 8, 8], level: 36, amulets: 6, theme: 'temple', resident: null,
    content: 'Great Temple, finale',
    sites: [['bld_great_temple', 12, 1]], residents: {}, soil: [[11, 6]],
    density: 0.66, tiers: [3, 8], special: [['sealed_gate', 1], ['locked_crate', 2]] }
];

/** Scale one base-plan zone to the final grid. Clusters (soil rows) keep their shape; everything else spreads out. */
function scaleZone(z) {
  const K = SCALE, pt = ([x, y]) => [x * K, y * K];
  const o = { ...z, rect: z.rect.map(v => v * K) };
  if (z.sites) o.sites = z.sites.map(([b, x, y]) => [b, x * K, y * K]);
  if (z.residents) o.residents = Object.fromEntries(Object.entries(z.residents).map(([id, p]) => [id, pt(p)]));
  if (z.perks) o.perks = Object.fromEntries(Object.entries(z.perks).map(([k, p]) => [k, pt(p)]));
  if (z.soil) { const [x0, y0] = z.soil[0]; o.soil = z.soil.map(([x, y]) => [x0 * K + (x - x0), y0 * K + (y - y0)]); }
  if (z.keepClear) o.keepClear = z.keepClear.map(v => v * K);
  if (z.start) o.start = z.start.map(([item, x, y]) => [item, ...(START_POS[item] || pt([x, y]))]);
  if (z.fixedObstacles) o.fixedObstacles = z.fixedObstacles.map(f => ({ ...f, x: f.x * K, y: f.y * K }));
  const mult = z.n === 1 ? OBST_START : OBST_ZONE;
  if (z.counts) o.counts = z.counts.map(([t, n]) => [t, Math.round(n * mult)]);
  if (z.special) o.special = z.special.map(([t, n]) => [t, n * K]);
  if (z.density) o.density = +(z.density * mult / (K * K)).toFixed(3);
  return o;
}
// The opening generators sit close together in the middle of the cleared start area.
const START_POS = { gen_seed_01: [25, 74], gen_toolbox_01: [27, 74] };
export const ZONES = BASE_ZONES.map(scaleZone);

// Buildings (spec section 11). items: [[itemId, count]]
export const BUILDINGS = [
  { id: 'bld_welcome_dock', name: 'Welcome Dock', w: 3, h: 1, zone: 1, items: [['lumber_03', 2], ['fiber_02', 2]], coins: 0, fn: 'Story start; the boat arrives here' },
  { id: 'bld_cottage', name: "Marlene's Cottage", w: 3, h: 2, zone: 1, items: [['lumber_04', 2]], coins: 100, fn: 'Home base: +4 storage slots, daily reward chest', perk: { storage: 4 } },
  { id: 'bld_lumber_yard', name: 'Lumber Yard', w: 2, h: 2, zone: 2, items: [['lumber_03', 2], ['fiber_03', 2]], coins: 150, fn: 'Generator', generator: 'gen_lumber' },
  { id: 'bld_hen_house', name: 'Hen House', w: 2, h: 2, zone: 3, items: [['lumber_04', 3], ['hardware_02', 2]], coins: 0, fn: 'Generator (charge-based)', generator: 'gen_hen' },
  { id: 'bld_market_stall', name: 'Market Stall', w: 2, h: 1, zone: 3, items: [['lumber_04', 2]], coins: 200, fn: 'Trade dock tier 1', tradeDock: true },
  { id: 'bld_stone_quarry', name: 'Stone Quarry', w: 3, h: 2, zone: 4, items: [['hardware_04', 3], ['lumber_03', 4]], coins: 500, fn: 'Generator', generator: 'gen_quarry' },
  { id: 'bld_kitchen_hearth', name: 'Kitchen Hearth', w: 2, h: 2, zone: 4, items: [['stone_05', 3], ['lumber_06', 2]], coins: 0, fn: 'Generator; eat meals for energy', generator: 'gen_hearth', eats: true },
  { id: 'bld_cow_shed', name: 'Cow Shed', w: 3, h: 2, zone: 5, items: [['lumber_04', 4], ['hardware_02', 3]], coins: 600, fn: 'Generator', generator: 'gen_cow' },
  { id: 'bld_fishing_dock', name: 'Fishing Dock', w: 3, h: 1, zone: 5, items: [['fiber_04', 3], ['lumber_04', 3]], coins: 0, fn: 'Generator', generator: 'gen_fishing' },
  { id: 'bld_juice_stand', name: 'Juice Stand', w: 2, h: 1, zone: 6, items: [['lumber_05', 3], ['mango_06', 3]], coins: 0, fn: 'Generator', generator: 'gen_juice' },
  { id: 'bld_windmill', name: 'Windmill', w: 2, h: 2, zone: 6, items: [['lumber_06', 3], ['hardware_07', 2]], coins: 1000, fn: 'Perk: energy regeneration +10%', perk: { energyRegen: 0.10 } },
  { id: 'bld_beach_cafe', name: 'Beach Cafe', w: 3, h: 2, zone: 6, items: [['fiber_07', 4], ['coconut_05', 3]], coins: 0, fn: 'Delivers meals for a daily coin payout', daily: { coins: 150 } },
  { id: 'bld_goat_pen', name: 'Goat Pen', w: 3, h: 2, zone: 7, items: [['lumber_04', 4], ['fiber_04', 2]], coins: 0, fn: 'Generator', generator: 'gen_goat' },
  { id: 'bld_cliff_bridge', name: 'Cliff Bridge', w: 4, h: 1, zone: 7, items: [['lumber_06', 4], ['fiber_05', 2]], coins: 0, fn: 'Connects to the Shrine Grove' },
  { id: 'bld_spirit_shrine', name: 'Spirit Shrine', w: 3, h: 3, zone: 8, items: [['stone_07', 3], ['amulet_04', 1]], coins: 2000, fn: 'Generator', generator: 'gen_shrine' },
  { id: 'bld_nest_of_wonders', name: 'Nest of Wonders', w: 2, h: 2, zone: 9, items: [['lumber_09', 2], ['hibiscus_05', 5]], coins: 0, fn: 'Generator', generator: 'gen_nest' },
  { id: 'bld_museum', name: 'Museum', w: 3, h: 3, zone: 9, items: [['lumber_08', 4], ['stone_08', 2]], coins: 0, fn: 'Displays relics; every 5 relics gives a perk', museum: true },
  { id: 'bld_lighthouse', name: 'Lighthouse', w: 2, h: 2, zone: 10, items: [['stone_08', 3], ['hardware_07', 1]], coins: 0, fn: 'Perk: gift balloons 20% more often', perk: { balloonRate: 0.20 } },
  { id: 'bld_greenhouse', name: 'Greenhouse', w: 3, h: 2, zone: 10, items: [['lumber_05', 4], ['hibiscus_05', 6]], coins: 0, fn: 'Perk: shimmer chance +1%', perk: { shimmer: 0.01 } },
  { id: 'bld_aquarium', name: 'Aquarium', w: 3, h: 3, zone: 11, items: [['shells_07', 3], ['sea_06', 2]], coins: 0, fn: 'Displays sea life; fish pay coins daily', daily: { coins: 250 } },
  { id: 'bld_harbor', name: 'Harbor', w: 4, h: 2, zone: 11, items: [['lumber_08', 3], ['hardware_07', 2]], coins: 0, fn: 'Upgrades the boat: 1 free Voyage Ticket per week, world map', harbor: true },
  { id: 'bld_great_temple', name: 'Great Temple', w: 4, h: 4, zone: 12, items: [['stone_08', 3], ['amulet_05', 3]], coins: 5000, fn: 'Finale; opens the Sun Gate', temple: true }
];

export const PERK_CAPS = { energyRegen: 0.25, balloonRate: 0.5, shimmer: 0.02 };

export const RESIDENTS = [
  { id: 'marlene', name: 'Marlene Reyes', role: 'Protagonist', zone: 1, skin: '#e2a07a', hair: '#b8431f', outfit: '#2a9d8f', accent: '#f4d35e', fav: 'Banana fritters' },
  { id: 'beni', name: 'Captain Beni', role: 'Ferry captain', zone: 1, skin: '#c98a5e', hair: '#d8d8d8', outfit: '#264653', accent: '#e9c46a', fav: 'Grilled fish' },
  { id: 'mateo', name: 'Mateo', role: 'Carpenter', zone: 2, skin: '#b9774c', hair: '#3b2a20', outfit: '#e76f51', accent: '#f4a261', fav: 'Coconut curry' },
  { id: 'tala', name: 'Tala', role: 'Healer', zone: 3, skin: '#a8683f', hair: '#1f1a17', outfit: '#6a994e', accent: '#f2e8cf', fav: 'Mint tea' },
  { id: 'rosa', name: 'Nonna Rosa', role: 'Cook', zone: 4, skin: '#e9b78d', hair: '#bfbfbf', outfit: '#d62828', accent: '#fcbf49', fav: 'Fruit tart' },
  { id: 'kai', name: 'Kai', role: 'Young fisher', zone: 5, skin: '#c58c63', hair: '#2b2118', outfit: '#00b4d8', accent: '#ffd166', fav: 'Smoothies' },
  { id: 'victor', name: 'Victor Crane', role: 'Resort developer', zone: 6, skin: '#e7b894', hair: '#2d2d2d', outfit: '#f8f9fa', accent: '#adb5bd', fav: 'Sparkling mocktail' },
  { id: 'okoye', name: 'Dr. Imani Okoye', role: 'Vet and naturalist', zone: 7, skin: '#8d5a3b', hair: '#17110d', outfit: '#8ac926', accent: '#ffffff', fav: 'Cheese platter' },
  { id: 'lena', name: 'Lena', role: 'Archaeologist', zone: 8, skin: '#f0c3a0', hair: '#6a3b1b', outfit: '#9d6b53', accent: '#ffca3a', fav: 'Spice bun' }
];

export const PETS = [
  { id: 'pip', name: 'Pip', species: 'Parrot', perk: 'Gift balloons arrive 10% more often', perkKey: { balloonRate: 0.10 }, color: '#e63946' },
  { id: 'coco', name: 'Coco', species: 'Capuchin monkey', perk: 'Hidden-prize chance on obstacles +4%', perkKey: { hiddenPrize: 0.04 }, color: '#8d6e63' },
  { id: 'shelly', name: 'Shelly', species: 'Sea turtle', perk: '+1 charge cap on all animal buildings', perkKey: { chargeCap: 1 }, color: '#2a9d8f' },
  { id: 'biscuit', name: 'Biscuit', species: 'Puppy', perk: 'Digs up a Driftwood Crate every 24 h', perkKey: { dailyCrate: 1 }, color: '#d4a373' },
  { id: 'mochi', name: 'Mochi', species: 'Sloth', perk: 'Energy regeneration +5%', perkKey: { energyRegen: 0.05 }, color: '#bcb8b1' },
  { id: 'marlow', name: 'Marlow', species: 'Cat', perk: 'Trade dock prices +5%', perkKey: { tradePrice: 0.05 }, color: '#495057' }
];

export const LIVING = [
  { item: 'coconut_09', slot: 'soil', produces: 'coconut_03', everyHours: 6, store: 5, name: 'Coconut Palm' },
  { item: 'mango_08', slot: 'soil', produces: 'mango_03', everyHours: 6, store: 5, name: 'Mango Tree' },
  { item: 'papaya_08', slot: 'soil', produces: 'papaya_03', everyHours: 6, store: 5, name: 'Papaya Grove' },
  { item: 'banana_10', slot: 'soil', produces: 'banana_05', everyHours: 12, store: 3, name: 'Golden Banana Stalk' },
  { item: 'chicken_08', slot: 'hen', produces: 'chicken_03', everyHours: 24, store: 1, name: 'Golden Hen' },
  { item: 'cow_08', slot: 'cow', produces: 'dairy_02', count: 2, everyHours: 12, store: 4, name: 'Champion Cow' },
  { item: 'dragon_09', slot: 'dragon', coinsEveryHours: 24, coins: 200, store: 1, name: 'Sun Dragon' }
];

// Expedition islands (spec section 14). Goals use objective types resolved in islands.js.
export const ISLANDS = [
  { id: 'isl_coral_atoll', name: 'Coral Atoll', level: 12, w: 8, h: 10, rule: 'tidepools', guide: 'kai', palette: 'lagoon',
    story: "Kai's shell map leads to a drowned village that Elena once helped. The giant octopus guardian sleeps below.",
    genOutputs: [['sea_01', 30], ['sea_02', 20], ['sea_03', 12], ['shells_01', 20], ['shells_02', 12], ['shells_03', 6]],
    obstacles: [['thorn_bush', 8], ['dense_brush', 6], ['vine_tangle', 3]], pools: 6,
    goals: [
      { id: 'g1', text: 'Clear 8 obstacles', type: 'clear_obstacle', count: 8 },
      { id: 'g2', text: 'Fill 2 tide pools with a Sea Turtle or better', type: 'fill_pool', count: 2 },
      { id: 'g3', text: 'Create a Coral Fan', type: 'create_item', item: 'shells_06', count: 1 },
      { id: 'g4', text: 'Show Kai a Crab', type: 'deliver_item', item: 'sea_06', count: 1 },
      { id: 'g5', text: 'Fill all 6 tide pools to wake the Giant Octopus', type: 'fill_pool', count: 6 }
    ],
    rewards: [{ amulet: 'island' }, { item: 'chest_04', count: 2 }, { pearls: 50 }], decor: 'Aquarium blueprint' },
  { id: 'isl_pirate_cove', name: 'Pirate Cove', level: 16, w: 9, h: 11, rule: 'cannon', guide: 'rook', palette: 'pirate',
    story: "Captain Rook's crew left Elena a treasure to guard. The cove is full of locked chests.",
    genOutputs: [['pirate_01', 40], ['pirate_02', 30], ['pirate_03', 20], ['pirate_04', 10]],
    obstacles: [['thorn_bush', 6], ['dense_brush', 6], ['small_stump', 3], ['boulder', 2]], special: [['locked_crate', 5]],
    goals: [
      { id: 'g1', text: 'Turn a Pirate Wheel to open the beach gate', type: 'use_item', item: 'pirate_06', count: 1 },
      { id: 'g2', text: "Deliver 3 Pirate Spyglasses to the crew's ghost", type: 'deliver_item', item: 'pirate_05', count: 3 },
      { id: 'g3', text: 'Open all 5 Locked Crates', type: 'clear_special', obstacle: 'locked_crate', count: 5 },
      { id: 'g4', text: 'Deliver a Big Coin to the harbor chest', type: 'deliver_item', item: 'coins_05', count: 1 },
      { id: 'g5', text: 'Build the Pirate Ship: deliver 2 Pirate Wheels', type: 'deliver_item', item: 'pirate_07', count: 2 }
    ],
    rewards: [{ amulet: 'island' }, { item: 'chest_03', count: 2 }], decor: 'Pirate Ship decor' },
  { id: 'isl_dragon_peak', name: 'Dragon Peak', level: 22, w: 10, h: 12, rule: 'vents', guide: 'ember', palette: 'volcano',
    story: 'A baby dragon fell from its nest into the storm. Return it to the Peak.',
    genOutputs: [['dragon_01', 55], ['ember_01', 30], ['ember_02', 15]],
    obstacles: [['dense_brush', 6], ['vine_tangle', 6], ['small_stump', 5], ['boulder', 3]], vents: 3,
    goals: [
      { id: 'g1', text: 'Clear 10 obstacles', type: 'clear_obstacle', count: 10 },
      { id: 'g2', text: 'Create a Fire Crystal', type: 'create_item', item: 'ember_04', count: 1 },
      { id: 'g3', text: 'Hatch a Flame Whelp', type: 'create_item', item: 'dragon_03', count: 1 },
      { id: 'g4', text: 'Raise a Flame Drake', type: 'create_item', item: 'dragon_05', count: 1 },
      { id: 'g5', text: 'Return the baby dragon: deliver a Sun Prism', type: 'deliver_item', item: 'ember_05', count: 1 }
    ],
    rewards: [{ amulet: 'island' }, { item: 'chest_05', count: 1 }, { item: 'dragon_09' }], decor: 'Blaze Dragon placement' },
  { id: 'isl_frostfin', name: 'Frostfin Isle', level: 26, w: 10, h: 12, rule: 'frozen', guide: 'okoye', palette: 'ice',
    story: 'The penguin colony has lost its warm spring. Help Dr. Okoye find it.',
    genOutputs: [['penguin_01', 45], ['penguin_02', 30], ['penguin_03', 25]],
    obstacles: [['dense_brush', 5], ['vine_tangle', 6], ['small_stump', 5], ['boulder', 3]], frozenRate: 0.2,
    goals: [
      { id: 'g1', text: 'Thaw 3 frozen items with a Drink', type: 'thaw', count: 3 },
      { id: 'g2', text: 'Raise a Penguin', type: 'create_item', item: 'penguin_04', count: 1 },
      { id: 'g3', text: 'Raise 2 Tall Penguins', type: 'create_item', item: 'penguin_05', count: 2 },
      { id: 'g4', text: 'Clear 10 obstacles', type: 'clear_obstacle', count: 10 },
      { id: 'g5', text: 'Bring Dr. Okoye an Emperor Penguin', type: 'deliver_item', item: 'penguin_07', count: 1 }
    ],
    rewards: [{ amulet: 'island' }, { item: 'chest_05', count: 1 }], decor: 'Penguin pet-skin set' },
  { id: 'isl_sugar_cay', name: 'Sugar Cay', level: 30, w: 11, h: 13, rule: 'sugar', guide: 'rosa', palette: 'candy',
    story: "Rosa's childhood bakery island is overrun by a sticky syrup flood.",
    genOutputs: [['sweets_01', 45], ['sweets_02', 30], ['sweets_03', 25]],
    obstacles: [['dense_brush', 6], ['vine_tangle', 6], ['small_stump', 6], ['big_stump', 3]],
    goals: [
      { id: 'g1', text: 'Fill the Sugar Rush meter 3 times', type: 'sugar_rush', count: 3 },
      { id: 'g2', text: 'Bake 2 Cherry Cupcakes', type: 'create_item', item: 'sweets_03', count: 2 },
      { id: 'g3', text: 'Clear 12 obstacles', type: 'clear_obstacle', count: 12 },
      { id: 'g4', text: 'Create a Berry Cupcake', type: 'create_item', item: 'sweets_04', count: 1 },
      { id: 'g5', text: 'Serve Rosa a Party Cupcake', type: 'deliver_item', item: 'sweets_07', count: 1 }
    ],
    rewards: [{ amulet: 'island' }, { item: 'chest_05', count: 2 }], decor: 'Cake Tower decor' },
  { id: 'isl_lantern', name: 'Lantern Isle', level: 34, w: 12, h: 14, rule: 'darkness', guide: 'luma', palette: 'night',
    story: "Luma's home. The island is half dark, and the last amulet waits in its center.",
    genOutputs: [['lantern_01', 45], ['lantern_02', 30], ['lantern_03', 25]],
    obstacles: [['dense_brush', 6], ['vine_tangle', 6], ['small_stump', 6], ['boulder', 3]],
    goals: [
      { id: 'g1', text: 'Light 3 areas with Glow Lanterns', type: 'light_area', count: 3 },
      { id: 'g2', text: 'Create a Bright Lantern', type: 'create_item', item: 'lantern_04', count: 1 },
      { id: 'g3', text: 'Clear 12 obstacles', type: 'clear_obstacle', count: 12 },
      { id: 'g4', text: 'Deliver 3 Glow Lanterns', type: 'deliver_item', item: 'lantern_03', count: 3 },
      { id: 'g5', text: 'Give Luma a Grand Lantern', type: 'deliver_item', item: 'lantern_07', count: 1 }
    ],
    rewards: [{ amulet: 'island' }, { pearls: 100 }], decor: 'Sky Lantern decor' }
];

export const ECONOMY = {
  grid: GRID,
  energy: { max: 100, regenSeconds: 120, firstDayRegenSeconds: 60, firstDayHours: 24, start: 100, rescueFree: 10 },
  refill: { adEnergy: 25, adsPerDay: 4, adCooldownMin: 10, coins: { energy: 20, cost: 120 }, pearls: { energy: 100, cost: 25 } },
  sell: { base: 3, growth: 1.9, table: [3, 6, 11, 22, 41, 78, 148, 281, 534, 1015], confirmFromLevel: 5 },
  xp: { base: 40, exp: 1.35, levelCap: 60, mergeGrowth: 1.9, obstacle: 2, questBase: 20, questPerAct: 5, build: 50, discovery: 2 },
  levelUp: { chest: 'chest_02', every5: { chest: 'chest_03', pearls: 10 } },
  discovery: { coinsPerLevel: 5 },
  clear: { coinsPerTier: 5, hiddenPrizeChance: 0.08, strongToolConfirmGap: 2 },
  merge: { gatherMs: 150, cascadeDelayMs: 250, cascadeCap: 5, shimmerBonusCoinsPerLevel: 10, shimmerLevelUpCount: 3 },
  // Magnet: tap it, then tap an item; every matching item on the board merges at once. Costs coins and then recharges.
  magnet: { cost: 100, cooldownSec: 120 },
  shimmer: { chance: 0.04, maxSpawnLevel: 4 },
  // Balloon gift drops: every minSec..maxSec a wave of minCount..maxCount balloons floats down near the view and leaves gifts on the ground.
  drops: {
    minSec: 180, maxSec: 300, minCount: 1, maxCount: 3, fallSec: 10, staggerSec: [1, 2.5], fallCells: 12, radius: 3, minFreeCells: 5, maxOnGround: 6, retrySec: 30,
    // Balloon gifts only ever hold level 1 items; higher player levels just get more of them.
    tiers: [
      { minLevel: 1, table: { count: 2, minLevel: 1, maxLevel: 1, extras: [['coins_01', 30, 2], ['sparks_01', 25, 1], [null, 45, 0]], picks: 1 } },
      { minLevel: 10, table: { count: 3, minLevel: 1, maxLevel: 1, extras: [['coins_01', 30, 3], ['sparks_01', 25, 1], [null, 45, 0]], picks: 1 } },
      { minLevel: 25, table: { count: 4, minLevel: 1, maxLevel: 1, extras: [['coins_01', 30, 3], ['sparks_01', 25, 2], ['pearls_01', 10, 1], [null, 35, 0]], picks: 1 } }
    ]
  },
  storage: { start: 6, max: 30, slotCost: 100, overflowMax: 3 },
  zone: { coinsBase: 250, coinsExp: 1.5, clearedPct: 0.7, pocketPct: 0.25, pocketSize: 6 * SCALE * SCALE },
  trade: {
    categoryMult: { spice: 1.4, meals: 1.3, fish: 1.2, dairy: 1.1, fruit: 1.0, craft: 0.9 },
    dailyFactor: [0.85, 1.15], bulk: [[5, 0.10], [10, 0.25]],
    tiers: { 1: { slots: 4, bulkBonus: 0 }, 2: { slots: 6, bulkBonus: 0.05 }, 3: { slots: 8, bulkBonus: 0.10 } },
    orderMult: 1.6, orderRefillSec: 300, orderExpireSec: 21600, chestEvery: 5
  },
  generators: { tiers: { 1: { levelUp: 0, doubleDrop: 0 }, 2: { levelUp: 0.2, doubleDrop: 0.08 }, 3: { levelUp: 0.35, doubleDrop: 0.15 } }, nestExtra: 0 },
  eat: { minLevel: 6, baseEnergy: 15 },
  hints: { idleSec: 8, generatorSec: 20 },
  island: { charges: 6, rechargeSec: 300, trayStart: 3, supplySlots: 5, refill: { coins: { cost: 90, charges: 3 }, pearls: { cost: 12, charges: 6 }, adCharges: 3 } },   // expedition charges can be topped up like energy
  daily: { count: 3, coins: 20, energy: 10, allChest: 'chest_03', streakChest: 'chest_05', freeSkipPerWeek: 1 },
  weekly: { count: 5, chest: 'chest_05', pearls: 20 },
  loginCycle: [
    { items: ['sparks_01', 'sparks_01'] }, { items: ['chest_01'] }, { items: ['sparks_02', 'sparks_02'] }, { items: ['chest_02'] },
    { items: ['coins_03', 'coins_03'] }, { items: ['sparks_03', 'pearls_01', 'pearls_01'] }, { items: ['supplies_05', 'chest_03'] }
  ],
  offline: { maxForwardHours: 24 },
  save: { intervalSec: 5, debounceMs: 1000, backups: 2 },
  ads: { demo: true, rewardedOptional: true },
  shop: { dealCount: 3, dealLevelRange: [3, 5], priceMult: 2, packs: [] }
};

export const DAILY_TEMPLATES = [
  { id: 'create', text: 'Create {count} {item}', type: 'create_item' },
  { id: 'clear', text: 'Clear {count} obstacles', type: 'clear_obstacle', range: [6, 15] },
  { id: 'merge', text: 'Perform {count} merges', type: 'merge_count', range: [10, 30] },
  { id: 'bonus', text: 'Do {count} five-item merges', type: 'merge_bonus', size: 5, range: [2, 5] },
  { id: 'deliver', text: 'Deliver {count} {item}', type: 'deliver_item' },
  { id: 'spend', text: 'Spend {count} energy', type: 'spend_energy', range: [30, 80] }
];

export const WEEKLY_TEMPLATES = [
  { text: 'Complete {count} resident requests', type: 'requests_done', range: [8, 12] },
  { text: 'Create {count} items of level 6 or higher', type: 'create_level', minLevel: 6, range: [3, 5] },
  { text: 'Clear {count} obstacles', type: 'clear_obstacle', range: [60, 100] },
  { text: 'Perform {count} merges', type: 'merge_count', range: [120, 200] },
  { text: 'Perform {count} five-item merges', type: 'merge_bonus', size: 5, range: [10, 20] },
  { text: 'Spend {count} energy', type: 'spend_energy', range: [250, 400] },
  { text: 'Visit {count} islands', type: 'visit_island', range: [2, 2] }
];

export const EVENT_TEMPLATES = [
  { id: 'task_track', name: 'Task Track', days: 7, desc: 'Create items of level 3 or higher: each one earns tokens equal to its level.' },
  { id: 'merge_rush', name: 'Merge Rush', days: 3, desc: 'Every merge earns one token per item merged, plus double XP and double shimmer chance.' },
  { id: 'festival', name: 'Festival Orders', days: 5, desc: 'Every item you deliver to a resident or an island goal earns 2 tokens.' },
  { id: 'event_island', name: 'Event Island', days: 12, desc: 'A separate board with five goals and a milestone track.' }
];

export const EVENT_TRACK = [
  [20, { coins: 50 }], [50, { energy: 15 }], [90, { item: 'chest_02' }], [140, { coins: 80 }], [200, { pearls: 10 }],
  [270, { item: 'chest_03' }], [350, { energy: 40 }], [430, { coins: 200 }], [520, { item: 'chest_04' }], [640, { pearls: 40 }],
  [780, { item: 'sparks_03', count: 3 }], [940, { item: 'chest_05' }], [1120, { item: 'supplies_06' }], [1320, { pearls: 60 }], [1550, { pearls: 100, coins: 1000 }]
];

export const THEMES = [
  ['Snow Festival', 'snow'], ['Lunar New Year Parade', 'lantern'], ['Cozy Cabin', 'cabin'], ['Penguin Vacation', 'penguin'],
  ['Spring Garden', 'garden'], ['Egg Hunt', 'egg'], ['Clover Cove', 'clover'], ['Nature Reserve Rescue', 'reserve'],
  ['Pirate Treasure Hunt', 'pirate'], ['Music Festival', 'music'], ['Beach Night Party', 'party'], ['Dino Park', 'dino'],
  ['Pumpkin Season', 'pumpkin'], ['Raccoon Picnic', 'picnic'], ['Detective Mystery', 'detective'], ['Harvest Moon Feast', 'moon'],
  ['Sweet Planet', 'sweet'], ['Zoo Village', 'zoo'], ['Enchanted Ball', 'ball'], ['Space Explorers', 'space'],
  ['Book of Wishes', 'wishes'], ['Black Friday Market', 'market'], ['Starfruit Season', 'star'], ['Kite Festival', 'kite']
];
