// Source tables for chains, generators and items (spec sections 6-9).
// `node tools/build-data.mjs` exports these as JSON files in /data.

// [key, display name, family, unlockZone (0 = start, 99 = island only), level names[], options]
export const CHAINS = [
  // ---- crops and garden
  ['banana', 'Banana', 'crop', 0, ['Banana Bud', 'Banana Flower', 'Green Banana', 'Ripe Banana', 'Banana Pair', 'Banana Hand', 'Banana Bunch', 'Banana Crate', 'Banana Cart', 'Golden Banana Stalk'], { gen: ['gen_seed'], trade: 'fruit', shimmer: 0.04, tags: ['fruit'] }],
  ['coconut', 'Coconut', 'crop', 2, ['Coconut Blossom', 'Green Coconut', 'Brown Coconut', 'Cracked Coconut', 'Coconut Cream Jar', 'Coconut Oil Bottle', 'Coconut Crate', 'Palm Seedling', 'Coconut Palm'], { gen: ['gen_seed'], trade: 'fruit', shimmer: 0.04, tags: ['fruit'] }],
  ['pineapple', 'Pineapple', 'crop', 4, ['Pineapple Sprout', 'Pineapple Plant', 'Green Pineapple', 'Ripe Pineapple', 'Sliced Pineapple', 'Pineapple Basket', 'Pineapple Crate', 'Pineapple Pyramid'], { gen: ['gen_seed'], trade: 'fruit', shimmer: 0.04, tags: ['fruit'] }],
  ['mango', 'Mango', 'crop', 6, ['Mango Seed', 'Mango Sprout', 'Mango Blossom', 'Green Mango', 'Ripe Mango', 'Mango Basket', 'Mango Crate', 'Mango Tree'], { gen: ['gen_seed'], trade: 'fruit', shimmer: 0.04, tags: ['fruit'] }],
  ['papaya', 'Papaya', 'crop', 7, ['Papaya Seed', 'Papaya Seedling', 'Papaya Sapling', 'Green Papaya', 'Ripe Papaya', 'Papaya Basket', 'Papaya Crate', 'Papaya Grove'], { gen: ['gen_garden'], trade: 'fruit', shimmer: 0.04, tags: ['fruit'] }],
  ['hibiscus', 'Hibiscus', 'crop', 3, ['Flower Seed', 'Sprout', 'Bud', 'Hibiscus Bloom', 'Hibiscus Bouquet', 'Flower Lei', 'Garland Arch', 'Blossom Garden'], { gen: ['gen_garden'], trade: 'craft', shimmer: 0.04, tags: ['flower'] }],
  ['herbs', 'Herbs', 'crop', 3, ['Herb Seed', 'Herb Sprout', 'Mint Sprig', 'Lemongrass Stalk', 'Ginger Root', 'Vanilla Pod', 'Spice Bundle', 'Spice Chest'], { gen: ['gen_garden'], trade: 'spice', shimmer: 0.04, tags: ['herb'] }],
  // ---- materials and tools
  ['clearing_tools', 'Clearing Tools', 'tool', 0, ['Hand Trowel', 'Garden Shears', 'Hoe', 'Machete', 'Hatchet', 'Felling Axe', 'Pickaxe', 'Sledgehammer'], { gen: ['gen_toolbox'], trade: 'craft', shimmer: 0, toolTags: true }],
  ['lumber', 'Lumber', 'material', 2, ['Twig', 'Branch', 'Log', 'Rough Plank', 'Smooth Plank', 'Beam', 'Plank Stack', 'Timber Frame', 'Roof Truss'], { gen: ['gen_lumber'], trade: 'craft', shimmer: 0.04 }],
  ['stone', 'Stone', 'material', 4, ['Pebble', 'Flint', 'Stone', 'Cut Stone', 'Brick', 'Brick Stack', 'Stone Block', 'Mason Pillar'], { gen: ['gen_quarry'], trade: 'craft', shimmer: 0.04 }],
  ['fiber', 'Fiber and Rope', 'material', 2, ['Palm Fiber', 'Twine', 'Cord', 'Rope', 'Rope Coil', 'Fishing Net', 'Woven Mat', 'Hammock'], { gen: ['gen_lumber'], trade: 'craft', shimmer: 0.04 }],
  ['hardware', 'Hardware', 'material', 0, ['Rusty Nail', 'Nails', 'Screws', 'Hinge', 'Lock', 'Pipe Set', 'Hardware Kit', "Mechanic's Toolbox"], { gen: ['gen_toolbox'], trade: 'craft', shimmer: 0.04 }],
  // ---- animals
  ['chicken', 'Chicken', 'animal', 3, ['Egg', 'Speckled Egg', 'Hatching Egg', 'Chick', 'Young Hen', 'Hen', 'Proud Rooster', 'Golden Hen'], { gen: ['gen_hen'], trade: 'dairy', shimmer: 0.04 }],
  ['cow', 'Cow', 'animal', 5, ['Hay Tuft', 'Hay Bundle', 'Calf', 'Young Cow', 'Cow', 'Spotted Cow', 'Bell Cow', 'Champion Cow'], { gen: ['gen_cow'], trade: 'dairy', shimmer: 0.04 }],
  ['goat', 'Goat', 'animal', 7, ['Clover', 'Feed Sack', 'Kid Goat', 'Young Goat', 'Goat', 'Billy Goat', 'Mountain Goat', 'Golden-Horn Goat'], { gen: ['gen_goat'], trade: 'dairy', shimmer: 0.04 }],
  // ---- food
  ['dairy', 'Dairy', 'food', 5, ['Milk Drop', 'Milk Jug', 'Cream Pot', 'Butter Block', 'Soft Cheese', 'Cheese Wheel', 'Cheese Platter'], { gen: ['gen_cow'], trade: 'dairy', shimmer: 0.04 }],
  ['meals', 'Island Meals', 'food', 4, ['Flour Pinch', 'Dough Ball', 'Flatbread', 'Banana Fritter', 'Fruit Tart', 'Coconut Curry Bowl', 'Grilled Platter', 'Family Feast', 'Luau Banquet'], { gen: ['gen_hearth'], trade: 'meals', shimmer: 0.04, tags: ['meal'] }],
  ['drinks', 'Drinks', 'food', 6, ['Fruit Splash', 'Juice Glass', 'Juice Pitcher', 'Smoothie', 'Tropical Punch', 'Sparkling Mocktail', 'Drink Tray', 'Beach Bar Counter'], { gen: ['gen_juice'], trade: 'meals', shimmer: 0.04, tags: ['drink'] }],
  // ---- currency and reward chains
  ['coins', 'Coins', 'treasure', 0, ['Copper Coin', 'Silver Coin', 'Gold Coin', 'Coin Pile', 'Coin Stack', 'Coin Bag', 'Coin Chest', 'Treasure Hoard'], { currency: 'coins', collect: [5, 17, 58, 200, 680, 2300, 7800, 26000], sellable: false, shimmer: 0 }],
  ['sparks', 'Energy Sparks', 'energy', 0, ['Spark', 'Glow', 'Orb', 'Lantern', 'Sunstone', 'Sun Core'], { currency: 'energy', collect: [2, 7, 22, 70, 200, 500], sellable: false, shimmer: 0 }],
  ['pearls', 'Pearls', 'treasure', 0, ['Pearl Chip', 'Small Pearl', 'Round Pearl', 'Rose Pearl', 'Black Pearl', 'Crown Pearl'], { currency: 'pearls', collect: [1, 3, 8, 22, 60, 150], sellable: false, shimmer: 0 }],
  ['chest', 'Chests', 'special', 0, ['Driftwood Crate', 'Wooden Chest', 'Brass Chest', 'Silver Chest', 'Golden Chest'], { chest: true, sellable: false, shimmer: 0 }],
  // ---- sea and shore
  ['sea', 'Sea Life', 'sea', 5, ['Plankton', 'Shrimp', 'Sardine', 'Clownfish', 'Seahorse', 'Sea Turtle', 'Dolphin', 'Manta Ray', 'Whale'], { gen: ['gen_fishing'], trade: 'fish', shimmer: 0.04 }],
  ['shells', 'Shells and Coral', 'sea', 5, ['Shell Chip', 'Seashell', 'Spiral Shell', 'Starfish', 'Coral Branch', 'Coral Fan', 'Coral Reef'], { gen: ['gen_fishing'], trade: 'craft', shimmer: 0.04 }],
  // ---- magic and creatures
  ['amulet', 'Spirit Amulets', 'magic', 8, ['Spirit Wisp', 'Charm Fragment', 'Amulet Shard', 'Carved Amulet', 'Ancient Amulet'], { gen: ['gen_shrine'], trade: 'craft', valueMultiplier: 2, shimmer: 0, amuletLevel: 5 }],
  ['dragon', 'Dragons', 'dragon', 99, ['Dragon Egg', 'Warm Egg', 'Hatchling', 'Whelp', 'Young Dragon', 'Ember Dragon', 'Storm Dragon', 'Elder Dragon', 'Sun Dragon'], { gen: ['gen_roost'], trade: 'craft', valueMultiplier: 2, shimmer: 0 }],
  ['pet', 'Pet Eggs', 'pet', 9, ['Pet Egg', 'Speckled Pet Egg', 'Hatchling Pet', 'Young Pet', 'Adult Pet', 'Island Companion'], { gen: ['gen_nest'], trade: 'craft', valueMultiplier: 2, shimmer: 0 }],
  ['supplies', 'Expedition Supplies', 'special', 5, ['Map Scrap', 'Map Piece', 'Sea Chart', 'Spyglass', "Captain's Compass", 'Voyage Ticket'], { sellable: false, shimmer: 0, ticketLevel: 6 }],
  // ---- island-exclusive chains
  ['pirate', 'Pirate Gear', 'special', 99, ['Tarnished Button', 'Brass Buckle', 'Eyepatch', 'Tricorn Hat', "Captain's Coat", 'Cannon', 'Pirate Ship Model'], { island: 'isl_pirate_cove', shimmer: 0, trade: 'craft' }],
  ['ember', 'Ember Crystals', 'dragon', 99, ['Ash Flake', 'Ember Chip', 'Ember Stone', 'Fire Crystal', 'Sun Prism', 'Storm Crystal', 'Dragon Heart'], { island: 'isl_dragon_peak', shimmer: 0, trade: 'craft' }],
  ['penguin', 'Penguins', 'animal', 99, ['Snowball', 'Ice Chunk', 'Penguin Egg', 'Penguin Chick', 'Young Penguin', 'Penguin', 'Emperor Penguin'], { island: 'isl_frostfin', shimmer: 0, trade: 'craft' }],
  ['sweets', 'Sweets', 'food', 99, ['Sugar Crystal', 'Candy Drop', 'Gumdrop Bag', 'Cupcake', 'Layer Cake', 'Candy Tower', 'Gingerbread House'], { island: 'isl_sugar_cay', shimmer: 0, trade: 'meals' }],
  ['lantern', 'Lanterns', 'magic', 99, ['Firefly', 'Glow Jar', 'Paper Lantern', 'Lantern String', 'Star Lantern', 'Moon Lamp', 'Sky Lantern'], { island: 'isl_lantern', shimmer: 0, trade: 'craft' }],
  // ---- portable generators (3 tiers each, merge three-to-one)
  ['gen_seed', 'Seed Pouch', 'generator', 0, ['Seed Pouch', 'Seed Satchel', 'Seed Chest'], { generator: 'gen_seed', sellable: false, shimmer: 0 }],
  ['gen_garden', 'Garden Plot', 'generator', 3, ['Garden Plot', 'Garden Bed', 'Garden Terrace'], { generator: 'gen_garden', sellable: false, shimmer: 0 }],
  ['gen_toolbox', 'Toolbox', 'generator', 0, ['Toolbox', 'Tool Chest', 'Workshop Trunk'], { generator: 'gen_toolbox', sellable: false, shimmer: 0 }]
];

export const HOME_CHAIN_COUNT = 28;
export const ISLAND_CHAIN_KEYS = ['pirate', 'ember', 'penguin', 'sweets', 'lantern'];

// Generators (spec section 9). `outputs` use weights; entries are only offered once their chain is unlocked.
export const GENERATORS = [
  { id: 'gen_seed', name: 'Seed Pouch', kind: 'portable', cost: 'energy', unlock: 0, obstacleDrop: { chance: 0.06, types: [['driftwood', 2], ['tall_grass', 2], ['thorn_bush', 1]], radius: [2, 5], minFree: 12 }, outputs: [['banana_01', 40], ['coconut_01', 25], ['pineapple_01', 20], ['mango_01', 15]] },
  { id: 'gen_garden', name: 'Garden Plot', kind: 'portable', cost: 'energy', unlock: 3, outputs: [['papaya_01', 35], ['hibiscus_01', 35], ['herbs_01', 30]] },
  { id: 'gen_toolbox', name: 'Toolbox', kind: 'portable', cost: 'energy', unlock: 0, outputs: [['clearing_tools_01', 50], ['hardware_01', 50]] },
  { id: 'gen_lumber', name: 'Lumber Yard', kind: 'structure', building: 'bld_lumber_yard', cost: 'energy', unlock: 2, outputs: [['lumber_01', 60], ['fiber_01', 40]],
    upgrades: [{ coins: 400, items: [['lumber_04', 2]] }, { coins: 1200, items: [['lumber_06', 2]] }] },
  { id: 'gen_quarry', name: 'Stone Quarry', kind: 'structure', building: 'bld_stone_quarry', cost: 'energy', unlock: 4, outputs: [['stone_01', 100]],
    upgrades: [{ coins: 600, items: [['stone_04', 2]] }, { coins: 1800, items: [['stone_06', 2]] }] },
  { id: 'gen_hen', name: 'Hen House', kind: 'structure', building: 'bld_hen_house', cost: 'charge', unlock: 3, outputs: [['chicken_01', 100]], charges: [6, 8, 10], rechargeMin: [10, 8, 6],
    upgrades: [{ coins: 350, items: [['lumber_04', 3]] }, { coins: 1000, items: [['lumber_05', 3]] }] },
  { id: 'gen_cow', name: 'Cow Shed', kind: 'structure', building: 'bld_cow_shed', cost: 'charge', unlock: 5, outputs: [['cow_01', 55], ['dairy_01', 45]], charges: [6, 8, 10], rechargeMin: [10, 8, 6],
    upgrades: [{ coins: 700, items: [['lumber_05', 3]] }, { coins: 1800, items: [['lumber_06', 2]] }] },
  { id: 'gen_goat', name: 'Goat Pen', kind: 'structure', building: 'bld_goat_pen', cost: 'charge', unlock: 7, outputs: [['goat_01', 100]], charges: [6, 8, 10], rechargeMin: [10, 8, 6],
    upgrades: [{ coins: 900, items: [['lumber_05', 3]] }, { coins: 2200, items: [['lumber_06', 2]] }] },
  { id: 'gen_hearth', name: 'Kitchen Hearth', kind: 'structure', building: 'bld_kitchen_hearth', cost: 'energy', unlock: 4, outputs: [['meals_01', 100]],
    upgrades: [{ coins: 600, items: [['stone_05', 3]] }, { coins: 1600, items: [['stone_06', 2]] }] },
  { id: 'gen_juice', name: 'Juice Stand', kind: 'structure', building: 'bld_juice_stand', cost: 'energy', unlock: 6, outputs: [['drinks_01', 100]],
    upgrades: [{ coins: 900, items: [['lumber_05', 3]] }, { coins: 2000, items: [['lumber_06', 2]] }] },
  { id: 'gen_fishing', name: 'Fishing Dock', kind: 'structure', building: 'bld_fishing_dock', cost: 'energy', unlock: 5, outputs: [['sea_01', 50], ['shells_01', 50]],
    upgrades: [{ coins: 800, items: [['fiber_05', 2]] }, { coins: 2000, items: [['fiber_06', 2]] }] },
  { id: 'gen_shrine', name: 'Spirit Shrine', kind: 'structure', building: 'bld_spirit_shrine', cost: 'energy', unlock: 8, outputs: [['amulet_01', 100]],
    outputsByTier: { 2: [['amulet_01', 80], ['amulet_02', 20]], 3: [['amulet_01', 70], ['amulet_02', 30]] },
    upgrades: [{ coins: 2500, items: [['stone_07', 2]] }, { coins: 6000, items: [['stone_08', 1]] }] },
  { id: 'gen_nest', name: 'Nest of Wonders', kind: 'structure', building: 'bld_nest_of_wonders', cost: 'charge', unlock: 9, outputs: [['pet_01', 100]], charges: [3, 4, 5], rechargeMin: [60, 45, 30],
    upgrades: [{ coins: 3000, items: [['lumber_08', 1]] }, { coins: 7000, items: [['lumber_09', 2]] }] },
  { id: 'gen_roost', name: 'Dragon Roost', kind: 'structure', building: 'island', cost: 'energy', unlock: 99, outputs: [['dragon_01', 100]] }
];

// Tier tables (spec section 9)
export const GEN_TIERS = {
  1: { levelUp: 0.0, doubleDrop: 0.0 },
  2: { levelUp: 0.2, doubleDrop: 0.08 },
  3: { levelUp: 0.35, doubleDrop: 0.15 }
};

export const CHEST_TABLES = {
  chest_01: { count: 2, minLevel: 2, maxLevel: 3, extras: [['coins_01', 30, 2], ['sparks_01', 20, 1], [null, 50, 0]], picks: 1 },
  chest_02: { count: 3, minLevel: 3, maxLevel: 4, extras: [['coins_02', 30, 1], ['sparks_02', 20, 1], ['chest_01', 20, 1], ['amulet_02', 10, 1], [null, 20, 0]], picks: 1 },
  chest_03: { count: 4, minLevel: 4, maxLevel: 5, extras: [['coins_03', 30, 1], ['sparks_03', 20, 1], ['chest_02', 20, 1], ['pearls_01', 10, 1], ['supplies_02', 10, 1], [null, 10, 0]], picks: 2 },
  chest_04: { count: 5, minLevel: 5, maxLevel: 6, extras: [['coins_04', 25, 1], ['sparks_04', 20, 1], ['chest_03', 20, 1], ['pearls_02', 15, 1], ['amulet_03', 10, 1], ['relic', 10, 1]], picks: 2 },
  chest_05: { count: 6, minLevel: 6, maxLevel: 7, extras: [['coins_05', 25, 1], ['sparks_05', 20, 1], ['pearls_03', 15, 1], ['amulet_04', 15, 1], ['relic', 15, 1], ['supplies_06', 10, 1]], picks: 2 }
};

export const RELICS = [
  'Stone Idol', 'Old Lantern', 'Shell Necklace', 'Rusted Compass', 'Clay Jar', 'Bone Flute', 'Jade Mask', 'Ancient Coin', 'Carved Paddle', 'Pearl Comb',
  'Sun Disc', 'Moon Mirror', 'Wooden Drum', 'Fishbone Hook', 'Obsidian Blade', 'Feathered Cloak', 'Temple Bell', 'Spirit Totem', 'Coral Crown', 'Tide Chart',
  "Elena's Locket", "Elena's Journal", 'Gold Frog', 'Turtle Brooch', 'Silver Spoon', 'Island Map', 'Painted Gourd', 'Bronze Gong', 'Lava Glass', 'Frost Pendant',
  'Candy Cane Idol', 'Pirate Flag', "Captain Rook's Key", 'Dragon Scale', 'Glowing Seed', 'Wisp Lantern', 'Carved Staff', 'Harbor Bell', 'Sunstone Ring', 'Luma Feather'
];
