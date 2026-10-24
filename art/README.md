# Painted art

Sprites cut from the art team's sheet (`docs/art/new-art-sheet.png`) by `python3 tools/slice-art.py` (needs pillow, numpy, scipy).
`js/view/new-art.js` lists what the game loads. **Anything not listed keeps its code-drawn vector art**, and a file that fails to load
falls back to its vector version, so the game never shows a hole.

## What is painted now

| Area | Painted | Still vector |
|---|---|---|
| Items | Chests (5 levels), Spirit Amulets (5 levels) | the other 31 families (see below) |
| UI icons | settings, quests, map, energy, heart, shop, coin, pearl, chest, amulet | the other 13 icons |
| Scenery | palm trees (3 lean variants), tree, flower bush, rocks (default palette) | grass, shells, flowers, reeds, pines and every tinted palette |
| Title screen | banner | |
| App icons | 512, 192, 180, 32 and maskable (upscaled from a 74 px original, so soft) | |

## Why not more

The sheet is a concept sheet rather than the production set described in `docs/graphics-spec.md`:

- **Resolution.** Sprites are about 45 px; the spec asks for 256 px. They are drawn upscaled and look soft at large zoom.
- **Levels.** Families have 5 sprites; the game has 5 to 10 levels per family (banana has 10). Only chests and amulets (5 levels each)
  match exactly. Stretching 5 sprites over more levels would give neighbouring levels the same picture, and players merge by matching pictures.
- **Different content.** Its obstacles, buildings and residents are not the game's (a Hut, a Tavern and a Farmer rather than the Windmill, the Cottage and Captain Beni),
  and each resident needs four expressions.
- **Mislabelled rows.** A cow sits in the chicken row, fish are labelled "Cow", banana has two sprites.

Adding a family later: add its sprites to `tools/slice-art.py` and `new-art.js`. A family is painted on every level or not at all (a test enforces this).
