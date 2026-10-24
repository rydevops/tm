# Painted art

Sprites cut from the art team's sheets by `python3 tools/slice-art.py` (needs pillow, numpy, scipy; the cutting helpers are in `tools/artcut.py`):

- `docs/art/new-art-sheet.png`: chests, amulets, UI icons, scenery, title banner, app icon (picked by position).
- `docs/art/new-art-sheet-v3.png`: the item ladders, one row per family. `tools/art-ladders.json` says where each row is, what each sprite is called and how the old levels map onto the new ones.

`art/manifest.json` lists every item sprite; the game loads exactly those (`js/view/new-art.js`). **Anything not listed keeps its code-drawn vector art**, and a family whose files fail to load falls back to vector as a whole, so the game never shows a hole or a half-painted ladder.

## The items follow the art

The item chains were changed to match the pictures: each level of a painted family *is* one sprite on the sheet, named after what it shows. Many chains got fewer or different levels (a hen ladder of 4 instead of 8, for example). Everything that used the old ladders is translated by `tools/data-refit.mjs` when the data is built (`npm run build`):

- item ids in generators, buildings, obstacles, zones, quests, chests, rewards, shop and islands, and level requirements such as "a Lock or better";
- hand-written quest, goal and hint texts were rewritten with the new names, and the build fails if a retired item name is left in a text, an id points at an item that does not exist, or a quest asks for an item nothing can make;
- old saves are moved on load (`js/core/refit.js`): every item and counter is mapped to its new level, quests keep their progress, and anything that no longer exists is removed and paid back in coins. The player sees a one-time notice.

Painted families (old levels → new levels, then the names, in level order):

| Family | Levels | Names |
|---|---|---|
| `banana` | 10 → 10 | Baby Banana, Banana Bud, Ripe Banana, Green Bananas, Banana Pair, Banana Duo, Banana Bunch, Banana Planter, Banana Crate, Golden Banana Hand |
| `herbs` | 8 → 5 | Leafy Herb, Mint Plant, Basil Plant, Lavender Sprig, Lavender Bush |
| `hibiscus` | 8 → 9 | Pink Blossom, Red Blossom, Golden Blossom, Orange Blossom, Purple Blossom, Sunny Posy, Pink and Red Posy, Orange Posy, Violet Posy |
| `clearing_tools` | 8 → 8 | Hand Trowel, Garden Shears, Hoe, Machete, Hatchet, Felling Axe, Pickaxe, Sledgehammer |
| `lumber` | 9 → 9 | Small Log, Log, Long Log, Cut Log, Rough Pole, Smooth Beam, Timber Stack, Plank, Short Plank |
| `stone` | 8 → 7 | Pebble, Flint, Stone, Big Stone, Mossy Rock, Blue Crystals, Emerald Crystals |
| `fiber` | 8 → 4 | Fiber Tuft, Fiber Stalk, Twisted Fiber, Fiber Rope |
| `goat` | 8 → 9 | Newborn Kid, Little Kid, Kid Goat, Young Goat, Goat, Tall Goat, Billy Goat, Horned Billy, Elder Goat |
| `hardware` | 8 → 8 | Nail, Nails, Screw, Hinge, Pipe Pieces, Pipe Set, Padlock, Toolbox |
| `chicken` | 8 → 4 | Hen, Plump Hen, Fluffy Hen, Proud Hen |
| `dairy` | 7 → 4 | Milk Bottle, Cream Jar, Butter Box, Big Milk Bottle |
| `meals` | 9 → 4 | Rainbow Bowl, Green Bowl, Tomato Bowl, Feast Bowl |
| `drinks` | 8 → 4 | Fruit Cocktail, Berry Cooler, Coconut Cooler, Orange Juice Mug |
| `coins` | 8 → 8 | Tiny Coin, Small Coin, Coin, Large Coin, Big Coin, Dollar Coin, Skull Coin, Star Coin |
| `sparks` | 6 → 5 | Spark, Zap, Bolt, Blue Bolt, Mega Bolt |
| `pearls` | 6 → 4 | Pearl Shell, Pink Pearl, Rose Pearl, Moon Pearl |
| `sea` | 9 → 8 | Blue Fish, Golden Fish, Dolphin, Sea Turtle, Crab, Starfish, Octopus, Giant Octopus |
| `shells` | 7 → 4 | Seashell, Pink Sponge, Red Coral, Coral Fan |
| `lantern` | 7 → 4 | Iron Lantern, Glow Lantern, Bright Lantern, Grand Lantern |
| `dragon` | 9 → 4 | Flame Hatchling, Flame Whelp, Flame Drake, Blaze Dragon |
| `penguin` | 7 → 5 | Penguin Chick, Young Penguin, Penguin, Tall Penguin, Emperor Penguin |
| `sweets` | 7 → 4 | Pink Cupcake, Cherry Cupcake, Berry Cupcake, Party Cupcake |
| `supplies` | 6 → 5 | Compass, Spyglass, Treasure Map, Ship's Wheel, Anchor |
| `pirate` | 7 → 3 | Pirate Hat, Pirate Spyglass, Pirate Wheel |

Still vector (the sheets have no art for them): coconut, pineapple, mango, papaya, cow, ember crystals, pet eggs and the six generators. Chests and amulets (5 levels, from the first sheet) are painted. Their ladders did not change.

## Notes on the art

- **Resolution.** Sprites are about 45 to 90 px; the spec asks for 256 px. They are drawn upscaled and look soft at large zoom.
- **Cut quality.** Some sprites on the sheet overlap or touch (hens and goats side by side, diagonal logs, coins, the crab and its seaweed). They are separated with a flood-fill from one marked point per sprite, so a few edges are slightly ragged. A cleaner sheet with a gap between sprites would improve them.
- **Odd rows.** The coin row skips the number 8 (it has 8 coins), the goat row has an orphan 9, the dragons are small flame creatures, the pirate row has 3 sprites, and the supplies row is a compass, spyglass, map, wheel and anchor rather than map pieces and a ticket. The top supply (the anchor) is the Expedition Ticket.
- **Different content.** The sheet's obstacles, buildings and residents are not the game's, so those stay as they are.

Adding or changing a family: edit `tools/art-ladders.json` (rectangle, number of sprites, names, `legacy` map), run `python3 tools/slice-art.py`, then `npm run build` and `npm test`.
