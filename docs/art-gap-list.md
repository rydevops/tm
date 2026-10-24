# Art gap list: what is still missing from the sprite sheets

**Audience:** the art team. **From:** the Tropical Merge developers. Written against the latest sheet (the one with the white panels and tiny labels) and the earlier one (transparent background); game version 1.9.0.

Everything described here is specified in detail in `docs/graphics-spec.md` (sprite IDs, sizes, the look of the current art). This list says **what is wrong or missing in what we received**, in priority order, so the next delivery can be dropped straight into the game.

---

## 1. Summary

**Already in the game (nothing more to do):** all 5 chests and all 5 spirit amulets (first sheet), 10 UI icons (settings, quests, map, energy, heart, shop, coin, pearl, chest, amulet), palm trees, a tree, a flower bush and rocks, the title banner, and the app icons.

**Not usable yet:** the other **249 items in 34 families** (this includes the 3 generator families), every obstacle, building, resident portrait, fog and sea tile, and the pet creatures. The reasons, most important first:

1. **Neighbouring levels look the same.** Players merge by matching pictures, so two levels that look alike are a bug. This is the most common problem (mangoes, pineapples, coins, goats, chickens, penguins, lanterns, pearls…).
2. **The ladder doesn't match the item names.** The game names a level "Banana Bud" and shows its picture beside the name. Today level 1 is a plain banana (not a bud) and level 4 is a strawberry.
3. **Too few levels.** Most families have 5 sprites; the game needs 5–10 (banana 10, coconut 9, lumber 9, meals 9, sea life 9).
4. **Too small.** Sprites are about 33–45 px. We need **256 px** (see section 2).
5. **Wrong content.** Obstacles, buildings and residents are different from the game's (section 4).
6. **Flattened sheet.** The latest sheet is baked onto white with panel frames and garbled labels (section 2).

---

## 2. Fixes that apply to every sprite

| # | Problem today | What we need |
|---|---|---|
| 1 | **Resolution.** Most sprites are about 33–45 px tall. The game shows an item at up to ~300 px on a high-density phone. | Items **256 × 256 px**. Obstacles and buildings **256 px per grid cell** (e.g. a 2×2 boulder is 512 × 512). Portraits 256 × 256. Icons 128 × 128. See section 3 of the spec. |
| 2 | **Background.** The latest sheet is painted onto a white page with panel frames; sprites touch or overlap. The first sheet had a faint haze in the transparent area. | **Transparent PNG (RGBA, straight alpha)**, one sprite per frame, no panel, no frame, no text, no shadow baked in (the engine draws shadows, glow, level pips and shimmer). Sprites must not overlap or touch each other. |
| 3 | **Labels.** Panel titles don't match the contents ("Herbs" over coconuts, "Clearing" over pineapples, "Hardware" over hammers labelled "rope"). The small labels are unreadable. | **No text in the image.** Deliver a list (CSV or JSON) of `sprite ID → file`, using the exact IDs in the spec (`banana_01` … `banana_10`, `chest_03`, and so on). |
| 4 | **Level count.** Families have 5 sprites. | **Exactly the number of levels in section 3**, in order, one sprite per level. |
| 5 | **Distinct levels.** Many levels differ only in shade or size. | Each level needs a different **silhouette**. Test: shrink the whole ladder to 40 px and convert to greyscale. Every level must still be tellable apart. |
| 6 | **Ladder meaning.** Pictures don't follow the item names (seed, sprout, bud, bloom…). | Follow the level names in section 3 literally. Early levels are small and simple (seed, sprout, egg, chip); middle levels are the hero object; late levels are a collection or a product (basket, crate, cart); the top level is grand and golden. |
| 7 | **Perspective.** Buildings and several objects are drawn isometric (from above, at an angle). The game board is shown front-on, with items drawn upright. | Draw buildings **front-on, slightly from above**, as described in the spec, or tell us if isometric is a deliberate change and we will adapt the grid. |
| 8 | **Layered sources.** | Layered master files (PSD, Affinity or SVG) at 2× size, one layer per part, so we can make variants. |

---

## 3. Item families, level by level

The game has 259 item sprites in 36 families (including 9 generator sprites). Chests (5) and spirit amulets (5) are done and are not listed. In each row, "Game needs" shows the level number and name the sprite must depict. Families are grouped by when players first meet them, so Tier 1 matters most.

### Tier 1: seen in the first minutes (zones 0–2). Fix first.

| Family | Game needs | The sheet shows | What to fix |
|---|---|---|---|
| `banana` · 10 levels | 1 Banana Bud → 2 Banana Flower → 3 Green Banana → 4 Ripe Banana → 5 Banana Pair → 6 Banana Hand → 7 Banana Bunch → 8 Banana Crate → 9 Banana Cart → 10 Golden Banana Stalk | 10 sprites, so the count is right. Levels 1–3 are three nearly identical single bananas; level 4 is a **red strawberry-like fruit**; the last two overlap each other and include crates. | Levels 1 and 2 must be a banana **bud** and **flower** (not bananas). Level 3 green vs level 4 ripe must differ clearly. No strawberry. Each level a separate, non-overlapping sprite. |
| `clearing_tools` · 8 levels | 1 Hand Trowel → 2 Garden Shears → 3 Hoe → 4 Machete → 5 Hatchet → 6 Felling Axe → 7 Pickaxe → 8 Sledgehammer | 5 axes of almost the same design. | Eight **different tools**: trowel, shears, hoe, machete, hatchet, felling axe, pickaxe, sledgehammer. The game ties each obstacle to a tool level, so the tools must be recognisable. |
| `hardware` · 8 levels | 1 Rusty Nail → 2 Nails → 3 Screws → 4 Hinge → 5 Lock → 6 Pipe Set → 7 Hardware Kit → 8 Mechanic's Toolbox | A panel of 5 hammers and axes labelled "rope", and a separate panel of 5 nails. | Needed: rusty nail, nails, screws, hinge, **lock** (a Locked Crate needs it), pipe set, hardware kit, toolbox. |
| `coins` · 8 levels | 1 Copper Coin → 2 Silver Coin → 3 Gold Coin → 4 Coin Pile → 5 Coin Stack → 6 Coin Bag → 7 Coin Chest → 8 Treasure Hoard | 10 almost identical gold coins. | Eight levels: copper, silver and gold coin must look like different metals; then pile, stack, bag, chest, hoard. Ten identical coins cannot be told apart. |
| `sparks` · 6 levels | 1 Spark → 2 Glow → 3 Orb → 4 Lantern → 5 Sunstone → 6 Sun Core | Two panels of lightning bolts (5 yellow; 5 blue/green/yellow ones that look smeared). | Six distinct shapes: spark, glow, orb, lantern, sunstone, sun core. If lightning bolts are the intended look, tell us and we will rename the items; either way each level needs a clearly different picture. |
| `pearls` · 6 levels | 1 Pearl Chip → 2 Small Pearl → 3 Round Pearl → 4 Rose Pearl → 5 Black Pearl → 6 Crown Pearl | 5 pearls in shells, nearly the same. | Needed: pearl chip, small, round, rose, **black**, crown pearl. The black pearl and crown must stand out. |
| `gen_seed` · 3 levels | 1 Seed Pouch → 2 Seed Satchel → 3 Seed Chest | Not found. The sheet's generators are 4 generic gold-and-blue crates. | 3 levels: seed pouch (sack), satchel, seed chest. This is the player's very first tap. |
| `gen_toolbox` · 3 levels | 1 Toolbox → 2 Tool Chest → 3 Workshop Trunk | Not found. | 3 levels: red toolbox, blue tool chest, purple workshop trunk (each larger or more detailed, not only recoloured). |
| `coconut` · 9 levels | 1 Coconut Blossom → 2 Green Coconut → 3 Brown Coconut → 4 Cracked Coconut → 5 Coconut Cream Jar → 6 Coconut Oil Bottle → 7 Coconut Crate → 8 Palm Seedling → 9 Coconut Palm | About 10 whole or halved brown coconuts. | Only levels 2–4 exist. Needed: blossom, cream jar, oil bottle, crate, palm seedling, full palm. |
| `lumber` · 9 levels | 1 Twig → 2 Branch → 3 Log → 4 Rough Plank → 5 Smooth Plank → 6 Beam → 7 Plank Stack → 8 Timber Frame → 9 Roof Truss | 5 logs, near-identical. | Needed: twig, branch, log, rough plank, smooth plank, beam, plank stack, timber frame, roof truss. |
| `fiber` · 8 levels | 1 Palm Fiber → 2 Twine → 3 Cord → 4 Rope → 5 Rope Coil → 6 Fishing Net → 7 Woven Mat → 8 Hammock | 5 hay or straw bundles. | Needed: palm fibre, twine, cord, rope, rope coil, fishing net, woven mat, hammock. Straw is not rope. |

### Tier 2: zones 3–5

| Family | Game needs | The sheet shows | What to fix |
|---|---|---|---|
| `hibiscus` · 8 levels | 1 Flower Seed → 2 Sprout → 3 Bud → 4 Hibiscus Bloom → 5 Hibiscus Bouquet → 6 Flower Lei → 7 Garland Arch → 8 Blossom Garden | 11 open flowers in different colours (one is a leaf cluster). | The ladder is a growth story: seed, sprout, bud, then bloom, bouquet, lei, arch, garden. Only open blooms exist. Seed, sprout, bud, bouquet, lei, arch and garden are missing. |
| `herbs` · 8 levels | 1 Herb Seed → 2 Herb Sprout → 3 Mint Sprig → 4 Lemongrass Stalk → 5 Ginger Root → 6 Vanilla Pod → 7 Spice Bundle → 8 Spice Chest | 5 leafy plants, the last two with purple flowers. | Needed: seed, sprout, mint sprig, lemongrass, ginger root, vanilla pod, spice bundle, spice chest. |
| `chicken` · 8 levels | 1 Egg → 2 Speckled Egg → 3 Hatching Egg → 4 Chick → 5 Young Hen → 6 Hen → 7 Proud Rooster → 8 Golden Hen | 5 white chickens, nearly the same. | Needed: egg, speckled egg, hatching egg, chick, then young hen, hen, rooster, golden hen. No eggs or chick exist. |
| `gen_garden` · 3 levels | 1 Garden Plot → 2 Garden Bed → 3 Garden Terrace | Not found. | 3 levels: garden plot, garden bed (flowering), garden terrace. |
| `stone` · 8 levels | 1 Pebble → 2 Flint → 3 Stone → 4 Cut Stone → 5 Brick → 6 Brick Stack → 7 Stone Block → 8 Mason Pillar | 5: two pebbles, a grey stone, a green mossy stone, a blue crystal rock. | Needed: flint, cut stone, brick, brick stack, stone block, mason pillar. Bricks and cut stone are used to clear obstacles and build. |
| `pineapple` · 8 levels | 1 Pineapple Sprout → 2 Pineapple Plant → 3 Green Pineapple → 4 Ripe Pineapple → 5 Sliced Pineapple → 6 Pineapple Basket → 7 Pineapple Crate → 8 Pineapple Pyramid | 10 near-identical whole pineapples (a few on a blue pot, one with a flower). | Needed: sprout, plant (on soil), sliced rings, basket, crate, pyramid of pineapples. Only green vs ripe whole pineapple exist. |
| `meals` · 9 levels | 1 Flour Pinch → 2 Dough Ball → 3 Flatbread → 4 Banana Fritter → 5 Fruit Tart → 6 Coconut Curry Bowl → 7 Grilled Platter → 8 Family Feast → 9 Luau Banquet | 5 bowls of food that look alike. | Needed: flour, dough, flatbread, fritter, tart, curry bowl, grilled platter, family feast, luau banquet. |
| `cow` · 8 levels | 1 Hay Tuft → 2 Hay Bundle → 3 Calf → 4 Young Cow → 5 Cow → 6 Spotted Cow → 7 Bell Cow → 8 Champion Cow | **Not found** in this sheet. | All 8 levels: hay tuft, hay bundle, calf, young cow, cow, spotted cow, bell cow, champion cow. |
| `dairy` · 7 levels | 1 Milk Drop → 2 Milk Jug → 3 Cream Pot → 4 Butter Block → 5 Soft Cheese → 6 Cheese Wheel → 7 Cheese Platter | 5 milk bottles and jars. | Needed: milk drop, jug, cream pot, butter block, soft cheese, cheese wheel, cheese platter. No butter or cheese. |
| `sea` · 9 levels | 1 Plankton → 2 Shrimp → 3 Sardine → 4 Clownfish → 5 Seahorse → 6 Sea Turtle → 7 Dolphin → 8 Manta Ray → 9 Whale | 5: three fish in different colours, a turtle, a yellow fish or seahorse. | Needed: plankton, shrimp, sardine, clownfish, seahorse, sea turtle, dolphin, manta ray, whale. |
| `shells` · 7 levels | 1 Shell Chip → 2 Seashell → 3 Spiral Shell → 4 Starfish → 5 Coral Branch → 6 Coral Fan → 7 Coral Reef | 5: three shells and two corals. | Needed: shell chip, seashell, spiral shell, starfish, coral branch, coral fan, coral reef. |
| `supplies` · 6 levels | 1 Map Scrap → 2 Map Piece → 3 Sea Chart → 4 Spyglass → 5 Captain's Compass → 6 Voyage Ticket | 4 wooden crates. | Needed: map scrap, map piece, sea chart, spyglass, compass, voyage ticket. The ladder is maps and a ticket, not crates. |

### Tier 3: zones 6–9

| Family | Game needs | The sheet shows | What to fix |
|---|---|---|---|
| `mango` · 8 levels | 1 Mango Seed → 2 Mango Sprout → 3 Mango Blossom → 4 Green Mango → 5 Ripe Mango → 6 Mango Basket → 7 Mango Crate → 8 Mango Tree | 5 ripe mangoes that differ only in shade. | Needed: seed, sprout, blossom branch, green mango, basket, crate, tree. Ripe mango exists. |
| `drinks` · 8 levels | 1 Fruit Splash → 2 Juice Glass → 3 Juice Pitcher → 4 Smoothie → 5 Tropical Punch → 6 Sparkling Mocktail → 7 Drink Tray → 8 Beach Bar Counter | 5: coconut cups and glasses. | Needed: splash, juice glass, pitcher, smoothie, punch, mocktail, drink tray, bar counter. |
| `papaya` · 8 levels | 1 Papaya Seed → 2 Papaya Seedling → 3 Papaya Sapling → 4 Green Papaya → 5 Ripe Papaya → 6 Papaya Basket → 7 Papaya Crate → 8 Papaya Grove | 5: whole and cut-open papayas. | Needed: seed, seedling, sapling, basket, crate, grove. Green vs ripe papaya must differ. |
| `goat` · 8 levels | 1 Clover → 2 Feed Sack → 3 Kid Goat → 4 Young Goat → 5 Goat → 6 Billy Goat → 7 Mountain Goat → 8 Golden-Horn Goat | 5 white goats, nearly the same. | Needed: clover, feed sack, kid, young goat, goat, billy goat, mountain goat, golden-horn goat. |
| `pet` · 6 levels | 1 Pet Egg → 2 Speckled Pet Egg → 3 Hatchling Pet → 4 Young Pet → 5 Adult Pet → 6 Island Companion | 10 coloured eggs. | 2 egg levels, then **creatures**: 4 levels × 6 species (Pip the parrot, Coco the monkey, Shelly the turtle, Biscuit the puppy, Mochi the sloth, Marlow the cat) = 24 frames. No creatures exist. |

### Tier 4: expedition islands and unreleased content

| Family | Game needs | The sheet shows | What to fix |
|---|---|---|---|
| `penguin` · 7 levels | 1 Snowball → 2 Ice Chunk → 3 Penguin Egg → 4 Penguin Chick → 5 Young Penguin → 6 Penguin → 7 Emperor Penguin | 5 near-identical penguins. | Needed: snowball, ice chunk, egg, then chick, young penguin, penguin, emperor. The first three are not penguins. |
| `sweets` · 7 levels | 1 Sugar Crystal → 2 Candy Drop → 3 Gumdrop Bag → 4 Cupcake → 5 Layer Cake → 6 Candy Tower → 7 Gingerbread House | 5 cupcakes of growing size. | Needed: sugar crystal, candy drop, gumdrop bag, cupcake, layer cake, candy tower, gingerbread house. |
| `lantern` · 7 levels | 1 Firefly → 2 Glow Jar → 3 Paper Lantern → 4 Lantern String → 5 Star Lantern → 6 Moon Lamp → 7 Sky Lantern | About 4–5 near-identical hanging lanterns. | Needed: firefly, glow jar, paper lantern, lantern string, star lantern, moon lamp, sky lantern. |
| `pirate` · 7 levels | 1 Tarnished Button → 2 Brass Buckle → 3 Eyepatch → 4 Tricorn Hat → 5 Captain's Coat → 6 Cannon → 7 Pirate Ship Model | About 5: a tricorn hat, a spyglass, a cannon and similar. | Needed: button, buckle, eyepatch, tricorn hat, captain's coat, cannon, ship model. Hat and cannon can be reused. |
| `ember` · 7 levels | 1 Ash Flake → 2 Ember Chip → 3 Ember Stone → 4 Fire Crystal → 5 Sun Prism → 6 Storm Crystal → 7 Dragon Heart | **Not found.** | All 7 levels: ash flake, ember chip, ember stone, fire crystal, sun prism, storm crystal, dragon heart. |
| `dragon` · 9 levels | 1 Dragon Egg → 2 Warm Egg → 3 Hatchling → 4 Whelp → 5 Young Dragon → 6 Ember Dragon → 7 Storm Dragon → 8 Elder Dragon → 9 Sun Dragon | 5 red-orange fire creatures, nearly the same. | Not yet reachable in the game. 9 levels: two eggs, then a dragon that grows and changes colour (green → orange → blue → purple → gold). |

---

## 4. Content that doesn't match the game

These sheet sections exist but show different things from the ones the game uses.

### 4.1 Obstacles (14 in the game)

| Game obstacle | Footprint (cells) | In the sheet? |
|---|---|---|
| Tall Grass | 1 × 1 | **Missing.** Cleared in the first quests. |
| Thorn Bush | 1 × 1 | Roughly ("thorns", a ring of branches). Needs a bush with thorns and red berries. |
| Dense Brush | 1 × 1 | Roughly ("bush"). |
| Vine Tangle | 1 × 1 | Roughly ("vines"). |
| Small Stump | 1 × 1 | Roughly ("stump"). |
| Big Stump | **2 × 1** | **Missing.** Sheet sprites are all one-cell shapes. |
| Boulder | **2 × 2** | A boulder exists but is one-cell size and needs to fill 2 × 2 cells. |
| Rubble Pile | **2 × 2** | **Missing.** |
| Driftwood Pile | 1 × 1 | **Missing.** Very common on the starting beach. |
| Locked Crate | 1 × 1 | Roughly ("crate"). Needs a visible padlock. |
| Hungry Boar | 1 × 1 | **Missing.** A friendly wild boar with a "?" |
| Mud Pit | **3 × 1** | **Missing.** |
| Sealed Gate | 1 × 1 | **Missing.** A magically sealed stone gate. |
| Fallen Tree | **2 × 1** | **Missing.** |

The sheet's cactus, coral, web, barrel and mine have no counterpart in the game; drop them or tell us what they are for. Multi-cell obstacles need a frame that spans the whole footprint (256 px per cell).

### 4.2 Buildings (22 in the game)

The sheet shows 22 buildings, but they are different ones (hut, house, farm, tavern, bakery, clinic, school, gazebo, tent, campfire, barn, stable, workshop…). Only a few correspond to the game's: windmill, lighthouse, market, a dock, a temple, a barn. We need the game's own 22 (names, footprints and looks in section 8 of the spec), front-on, at the right proportions: for example the Welcome Dock is a long **3 × 1** pier, the Cliff Bridge is **4 × 1**, and the Great Temple is **4 × 4** and should be the most impressive sprite in the game. Optional but valuable: a construction-site frame for each, and the windmill sails and lighthouse beams as separate sprites so they can move.

### 4.3 Residents and guides (12 characters × 4 expressions = 48 frames)

The sheet's residents are a Farmer, Chef, Explorer, Fisherman, Scientist, Child, Elder, Merchant and similar. The game has specific characters, and each needs **four expressions** (neutral, happy, worried, excited), head and shoulders, on a transparent background:

Marlene (auburn hair), Captain Beni (white beard, captain's cap), Mateo (carpenter), Tala (healer), Nonna Rosa (cook), Kai (young fisher), Victor Crane (resort developer), Dr. Okoye (naturalist), Lena (archaeologist), and the three expedition guides: Captain Rook (pirate), Luma (lantern keeper) and Ember (baby dragon). Appearance details are in section 9 of the spec. The sheet's circular portrait style is fine to keep.

### 4.4 Other board pieces

| Piece | In the game | In the sheet | Needed |
|---|---|---|---|
| Living slots | Fertile Soil patch, Animal Perch | 8 "living slots" (bed, hammock, pet bed, garden plot, hatchery, stables, workshop, clinic) | The two the game uses. |
| Generators | Seed Pouch, Garden Plot, Toolbox (3 levels each) | 4 generic gold-and-blue crates | See Tier 1 and Tier 2 in section 3. |
| Fog | Two seamless cloud textures, 512 × 512 (locked zone, hidden pocket) | 5 small objects labelled "Fog" (tables, a tent, a signpost) in the latest sheet; 5 cloud puffs in the first | **2 seamless tiles** that repeat without visible edges. |
| Sea | Two seamless water tiles, 512 × 512 (day, night) | Isometric water blocks, not tileable | **2 seamless tiles.** |
| Gift balloons | 5 single balloons (red, orange, blue, green, purple) with a knot, about 256 × 320, plus a gift box | 4–5 balloons about 30 px wide, including a bunch and a heart | 5 single balloons at full size. |

### 4.5 UI icons (23 in the game)

Already in the game: settings, quests, map, energy, heart, shop, coin, pearl, chest, amulet.
**Still needed:** ticket, lock, hammer, trade, journal, pet, magnet, sell, sound, sun, boat. The latest sheet has a gift and a star, but their labels don't match their pictures, so please confirm which is which.

### 4.6 App icon and banner

- **App icon:** the sheet's icons are about 47–74 px; we need a **1024 × 1024** source with no baked-in rounded corners (the phone applies its own mask) and the important art inside the central 80 %.
- **Title banner:** the current banner is 527 px wide. Phones show it about 390 px wide at 3× density, so we need about **1600 px wide** (same proportions), with no panel frame.

### 4.7 Scenery (optional, lower priority)

Palms, a tree, a bush and rocks are in. Still vector: pine, lollipop tree, dead tree, mushroom, reed, grass tuft, small flower, shell, pebble, star, crystal, sprinkle, lava crack, plus the pink, snow, night and ash colour versions of palm, bush, tuft and rock. Each is a small decorative sprite; see section 12 of the spec.

---

## 5. Suggested delivery order

1. **Batch 1: first-hour content.** All Tier 1 families, plus the first three generators, Tall Grass and Driftwood, and the Welcome Dock and Marlene's Cottage. This gets a new player through the opening on the new art.
2. **Batch 2: Tier 2 families, the two living slots, the portraits of the first 5 residents, 2 fog tiles and 2 sea tiles.**
3. **Batch 3: Tier 3, the remaining obstacles and buildings, the other residents and guides, and the balloons.**
4. **Batch 4: Tier 4 (expedition islands), pet creatures (24 frames), optional construction sites, scenery and effects.**

We can integrate each batch as it arrives; a family only switches to the new art once all of its levels are delivered, so a half-delivered family never mixes two styles.

## 6. How we will check a delivery

1. Every sprite ID in the list exists, spelled exactly, and has the stated pixel size and a transparent background.
2. Each family has the right number of levels, in order, matching the item names.
3. Shrink each ladder to 40 px in greyscale: all levels are distinguishable.
4. No sprite contains a shadow, glow, level markers or text.
5. The outline colour, outline weight and lighting direction are consistent across all families (see section 2 of the spec).
