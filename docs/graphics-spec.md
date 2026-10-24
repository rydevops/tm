# Tropical Merge: Graphics Specification

> **Update (v2.0.0):** the item ladders in this document (level counts and names) are the original plan. The game now follows the art team's latest sheet; the current ladders are listed in `art/README.md` and `tools/art-ladders.json`.

**Purpose.** This document describes every graphic in Tropical Merge so that an external art team can produce sprite sheets to replace the current art. Today the game draws all of its art in code (procedural vector drawing on an HTML canvas); nothing is loaded from image files except the five app icons. For each graphic this spec covers what it is for, what it looks like now, how and where the game draws it, how big it appears, what effects and animation the engine adds on top, and what we need delivered.

**Version.** Written against game version 1.8.0. Every description and number comes from the source files listed in each section (mainly `js/view/art-items-a.js`, `js/view/art-items-b.js`, `js/view/art.js`, `js/view/world-art.js`, `js/view/island-art.js`, `js/view/island-decor.js` and `js/view/renderer.js`).

**How to read the descriptions.** Positions and sizes refer to a **100 × 100 design square** per board cell: x runs left to right, y runs top to bottom, and (50, 50) is the centre. Multi-cell graphics use 100 units per cell, so a 3 × 2 building is a 300 × 200 design space. Colours are given as hex values from the current art. They are the reference palette, not a hard requirement, but each family's dominant colour must stay recognisable (see section 2.6).

---

## Contents

1. [The game in one paragraph](#1-the-game-in-one-paragraph)
2. [Art direction](#2-art-direction)
3. [Delivery format for sprite sheets](#3-delivery-format-for-sprite-sheets)
4. [How a frame is drawn (layer order)](#4-how-a-frame-is-drawn-layer-order)
5. [Item sprites (259 items in 33 families)](#5-item-sprites)
6. [Item overlays drawn by the engine](#6-item-overlays-drawn-by-the-engine)
7. [Obstacles (14)](#7-obstacles)
8. [Buildings (22) and construction sites](#8-buildings-and-construction-sites)
9. [Residents and guides (portraits and board tokens)](#9-residents-and-guides)
10. [Board structures: living slots, expedition-island fixtures](#10-board-structures)
11. [Terrain: sea, island ground, coast and zone themes](#11-terrain)
12. [Island scenery (decor)](#12-island-scenery-decor)
13. [Fog and zone signs](#13-fog-and-zone-signs)
14. [Gift balloons](#14-gift-balloons)
15. [Effects, particles and feedback](#15-effects-particles-and-feedback)
16. [UI icons, app icons and splash](#16-ui-icons-app-icons-and-splash)
17. [Accessibility requirements](#17-accessibility-requirements)
18. [Deliverables checklist and acceptance criteria](#18-deliverables-checklist-and-acceptance-criteria)
19. [Notes for the integrating engineers](#19-notes-for-the-integrating-engineers)
20. [Appendix A: master palette](#appendix-a-master-palette)

---

## 1. The game in one paragraph

Tropical Merge is a casual merge game for phones and desktop browsers. The player restores an overgrown tropical island laid out on a grid (60 × 80 cells for the home island). They tap **generators** to create items, then drag identical items together: three items merge into one of the next level, four into two, and so on. Merged items are delivered to **residents** (quests), used to build **buildings**, or sold. **Obstacles** (grass, stumps, boulders…) are cleared with tools. **Fog** hides zones that are not unlocked yet. Six small **expedition islands** each have their own look and rule. The tone is warm, bright, friendly and cosy, like a children's storybook: no violence, no horror, nothing sharp-edged.

---

## 2. Art direction

### 2.1 Style

- **Storybook vector cartoon.** Simple, chunky, rounded shapes with a clean outline, flat-ish colour with one soft gradient, and one white highlight. Think "sticker on a picture book page", not painterly or realistic.
- **Readable at a glance on a small phone.** An item appears as small as **~40 px** across (zoomed out on a phone) and as large as **~300 px** (zoomed in on a high-density screen). The silhouette must read at 40 px.
- **Lighting from the upper left.** Highlights are top-left; the darker side is bottom-right.
- **Front or three-quarter view**, slightly from above. Characters and animals face the viewer or face right.
- **Cosy tropical palette**: turquoise sea, warm sand, saturated fruit colours, leafy greens and honey-coloured wood.

### 2.2 Outline

- Every shape has a **dark warm-brown outline, `#3a2a1e`** (constant `OUT` in the code). It is never pure black.
- Outline width is **2.2 design units** (≈ 2.2 % of the cell width): about 5–6 px on a 256 px item sprite. Small details use 1–1.5 units.
- **Round joins and round caps** everywhere: no mitred spikes.
- Some interior lines (wood grain, veins, seams) are drawn in a darker shade of the fill colour instead of the outline colour.

### 2.3 Fill and shading

The current renderer fills most shapes with a **diagonal linear gradient from the shape's top-left to its bottom-right**:

| Stop | Colour |
|---|---|
| 0 % (top-left) | base colour blended 28 % toward white |
| 55 % | base colour |
| 100 % (bottom-right) | base colour blended 22 % toward black |

New art should keep this "soft, lit from upper left" feel. It can use cel-shading or painted gradients, as long as the light direction and the soft, low-contrast look stay the same.

### 2.4 Recurring details (the "house style")

| Detail | Description | Where used |
|---|---|---|
| **Ground shadow** | A soft ellipse under the object: centre (50, 90), radii 30 × 6, colour `rgba(40,25,10,0.22)`. Lighter (alpha 0.16–0.18) for floating or glowing things. | Almost every item |
| **Shine** | A small white ellipse, 55 % opacity (up to 85 % for glass and pearls), tilted −35°, placed top-left on the shape. | Fruit, glass, gems, metal, eggs |
| **Sparkle** | A four-pointed star (long points, pinched waist), pale cream `#fff7c2` with an outline. | Top-tier items, magic, gold |
| **Gold sparkle set** | Three sparkles at about (18, 22) r 8, (84, 18) r 6 and (80, 50) r 5. | "Golden" top-level items |
| **Halo** | A soft translucent circle behind the object (e.g. `rgba(255,220,90,0.35)` gold, `rgba(160,255,230,0.3)` spirit mint). | Top-level and magic items |
| **Crate** | Honey wood box (`#b9854f`) with darker slat lines (`#8a5d32`): two horizontal and two vertical. | "Crate" levels of crop chains |
| **Basket** | Woven tan basket (`#d9a95f`) with curved weave lines and a rim band. | "Basket" levels |
| **Cart** | Wooden cart with two dark wheels and a pull handle to the right. | Banana Cart |
| **Soil mound** | Brown oval (`#7a5236`) with a lighter highlight patch. | Sprout levels |
| **Leaf** | Pointed almond leaf with a darker centre vein; greens `#4caf50` and `#2f8f45` alternate. | Plants everywhere |

### 2.5 Progression within a family

Every item family is a ladder of levels (5 to 10 levels). The art must make the ladder obvious:

- **Size grows, detail grows, value grows.** Early levels are a single small thing (seed, sprout, egg, chip). Middle levels are the "hero" object (a ripe fruit, a hen). Late levels are a collection or product (basket, crate, cart, platter). The top level is a grand, glowing version (a golden stalk, a palm tree, a treasure hoard).
- **Neighbouring levels must not look alike.** The player merges by matching identical sprites, so two adjacent levels need different silhouettes, not just a colour change. Where the current art only changes colour (for example Green Banana vs Ripe Banana), keep the colour change strong and consider adding a second cue.
- **Top levels carry "precious" signals**: sparkles, halo, gold accents. The engine also adds a coloured glow (section 6.1).

### 2.6 Colour identity per family

Each family needs one dominant, consistent colour so players can sort the board by eye. Keep these anchors:

| Family | Anchor colour | | Family | Anchor colour |
|---|---|---|---|---|
| Banana | yellow `#f6d44a` | | Coins | gold `#ffd23f` / copper / silver |
| Coconut | brown `#7a5236` | | Energy Sparks | warm yellow-orange `#ffd23f` → `#ff7b00` |
| Pineapple | golden `#f2b32a` + green crown | | Pearls | pearly white `#f4f1ea`, pinks |
| Mango | orange `#ff9f3c` | | Chests | wood → brass → silver → gold |
| Papaya | orange `#ff8a3c`, green skin | | Sea Life | blues, oranges, greens |
| Hibiscus | red-pink `#ff4d6d` | | Shells and Coral | peach and coral pinks |
| Herbs | fresh green `#8cc152`, tan roots | | Spirit Amulets | teal `#3d8f8f` / mint, gold frame |
| Clearing Tools | steel grey `#9aa5ad`, wood handle | | Lanterns | warm glow yellow, paper reds |
| Lumber | honey wood `#d9a05b` | | Dragons / Ember | fiery orange, gem colours |
| Stone | greys and brick `#c4693f` | | Pet Eggs | per species (section 5.27) |
| Fiber and Rope | tan rope `#d6b27a` | | Penguins | navy `#2b3a52`, white, ice blue |
| Hardware | steel grey + red accents | | Sweets | candy pink `#ff6b9a`, pastels |
| Chicken | cream / white, red comb | | Expedition Supplies | parchment `#f4e3b0`, red marks |
| Cow | white with black spots, pink muzzle | | Pirate Gear | black, crimson, brass |
| Goat | cream to grey-brown, curved horns | | Generators | wood, sack tan, toolbox red/blue/purple |
| Dairy | milk white, butter yellow | | | |
| Island Meals | dough cream, golden fried, colourful plates | | | |
| Drinks | glass + bright juice colours, pink straw | | | |

### 2.7 Things to avoid

- Pure black outlines, hard drop shadows, or realistic textures.
- Text inside sprites. Exceptions: the "$" on coins, "TICKET" on the Voyage Ticket and "CAFE" on the Beach Cafe sign. These may stay or be replaced with symbols.
- Thin details that vanish at 40 px.
- Baking engine effects into sprites: glow, level pips, shimmer, frozen ice, selection highlights, construction-site tint. The engine draws these (sections 6 and 8.2).

---

## 3. Delivery format for sprite sheets

### 3.1 Files

| Requirement | Value |
|---|---|
| Image format | PNG-32 (RGBA), sRGB, **straight (non-premultiplied) alpha** |
| Sheet (atlas) size | Up to 4096 × 4096 px; power-of-two preferred |
| Atlas data | One JSON per sheet in **TexturePacker "JSON (Hash)"** format: frame rectangle, `rotated: false`, `trimmed`, `spriteSourceSize`, `sourceSize` |
| Frame names | Exactly the **sprite IDs** in this document (e.g. `banana_04`, `bld_hen_house`, `obstacle/boulder`, `portrait/beni/happy`, `icon/coin`) |
| Padding | 2 px between frames, plus 2 px edge extrusion (bleed) to stop filtering seams |
| Trimming | Allowed if `spriteSourceSize`/`sourceSize` are exported, so the engine can restore the original frame box and anchor. Untrimmed is fine too. |
| Rotation in atlas | Not allowed |
| Source files | Layered masters (PSD, Affinity, or SVG/AI) at **2× the delivery size**, one layer per part, for future edits and variants |

### 3.2 Frame sizes (delivery resolution)

Sizes are chosen so the art stays sharp at the largest on-screen size: a board cell is 72 world units, zoom goes up to 1.8×, and the device pixel ratio is capped at 2.5, so a cell can reach about 324 physical pixels.

| Category | Frame size | Notes |
|---|---|---|
| Items (1 cell) | **256 × 256** | Art centred; see safe area in 3.3 |
| Obstacles | **256 px per cell** (e.g. 2 × 2 boulder = 512 × 512) | Top-left of the frame = top-left of the footprint |
| Buildings | **256 px per cell** (e.g. Great Temple 4 × 4 = 1024 × 1024) | Same anchoring; optional overhang, see 8.1 |
| Resident portraits | **256 × 256** per expression | Head and shoulders, see 9.1 |
| Scenery decor | **256 × 256** | Base (where it touches the ground) at bottom centre, (128, 230) |
| Living slots (soil, perch) | 256 × 256 | |
| Fog texture | **512 × 512 seamless tile**, ×2 kinds | Must tile without visible edges |
| Ground textures (optional) | 512 × 512 seamless tile per zone theme | See 11.3 |
| UI icons | **128 × 128** | Shown at 16–64 CSS px |
| Particles (optional) | 64 × 64 | See 15.1 |
| App icons | 512, 192, 180, 32 px and a 512 maskable | See 16.2 |

### 3.3 Safe areas for item frames

The engine draws the item sprite at **90 % of the cell**, nudged up by 3 % of the cell. Then it adds overlays in fixed places, so keep these zones in mind:

```
 0% ┌──────────────────────────────┐
    │ ▲ colour-blind      level #  │  top-left: optional family mark   top-right: optional level number
    │                              │
    │      main artwork lives      │  keep the main silhouette inside ~8%–92% horizontally
    │      in this central area    │  and ~6%–88% vertically
    │                              │
 88%│· · · ground shadow · · · · · │  shadow ellipse sits at ~90%
 90%│  ● ● ● ● ◆ ● ● ● ● ◆         │  level pips strip (centred), bottom 10%
100%└──────────────────────────────┘
```

- **Bottom 10 %**: the level pips (section 6.4) are drawn over the art here. Do not put important detail here.
- **Top-left corner, 12 % × 12 %**: optional colour-blind family marker.
- **Top-right corner, 25 % × 20 %**: optional level number.
- Art may touch the frame edges slightly (sparkles, leaves), but the main silhouette should stay inside the central area.

### 3.4 Variants and states

Unless stated otherwise each graphic is a **single static frame**. The engine adds movement (bobbing, swaying, squash, shake and fades; section 15). The extra frames we need are:

- **Construction-site state** for every building: optional, because the engine can tint the built art (8.2).
- **Damage states** for multi-hit obstacles: optional (7.2).
- **Four expressions** per resident portrait (9.1).
- **Six species** for pet levels 3 to 6 (5.27).
- **Palette tints** for some scenery pieces (12.2).

---

## 4. How a frame is drawn (layer order)

The board is drawn every frame on one canvas, back to front (`Renderer.draw` in `js/view/renderer.js`). Knowing the order helps with outlines and shadows: things later in the list overlap earlier ones.

1. **Sea**: full-screen vertical gradient with moving white wave strokes (11.1).
2. **Island base**: pre-rendered ground, beach and shallow water, then the animated shoreline foam and waves (11.2).
3. **Scenery decor**: palms, trees, bushes, rocks, shells and grass tufts, depth-sorted by their base y (12).
4. **Structures**: buildings, construction sites, residents, living slots and island fixtures (8, 9, 10).
5. **Obstacles** (7).
6. **Items**, each on a faint rounded "plate" (6.7).
7. **Fog bank** over locked zones and pockets (13).
8. **Darkness overlay**, Lantern Isle only (10.3).
9. **Gift balloons** (14).
10. **Hints and highlights**: hint glow, magnet targets (15.4).
11. **Effects**: rings, flying items, particles, floating text (15).
12. **Dragged item** and drop-target outlines (15.5).
13. **Zone signs**, in screen space over the fog (13.3).
14. **Keyboard cursor** (15.5).

HUD, panels, buttons and text are HTML and CSS above the canvas. The only bitmap art they use is the **UI icons** (16.1), item sprites, and resident portraits.

---

## 5. Item sprites

**What items are.** Items are the pieces on the board. The player drags, merges, delivers and sells them. Each family is a ladder; the level number is shown by the pips under the item (6.4).

**Where they appear.**
- On the board at 90 % of a 72-unit cell (about 40–290 physical px, depending on zoom and screen).
- Lifted under the finger while dragging, at 115 % with a drop shadow.
- In panels and lists at 22–96 CSS px: quest cards, the item info popup, shop deals, the sell list, the journal, reward chips, and the "loot" popup when a chest opens.
- In the tray (storage) at the bottom of the screen.

**Current implementation.** `js/view/art-items-a.js` and `js/view/art-items-b.js` contain one painter function per family, called with the level. `js/view/art.js` caches each sprite as a 192 × 192 bitmap (`getSprite`) and draws it with `drawItem`.

**Sprite ID** = the item ID (`<family>_<two-digit level>`, e.g. `mango_05`). The same ID is stored as `art.sprite` in `data/items.json`.

**Glow** = the engine-drawn glow tier for that item (none / white / blue / gold, section 6.1). It is listed here so the art can be designed to sit inside that glow; do not paint it into the sprite.

All items have the standard ground shadow (2.4) unless noted.

### 5.1 Banana (`banana`), 10 levels, crop

The first family the player meets (tutorial). It comes from the Seed Pouch.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `banana_01` | Banana Bud | none | A short green stalk (`#5e8f3a`) rising from the bottom centre, topped by a teardrop-shaped **plum-magenta bud** (`#a8456b`) pointing up, with a lighter pink inner highlight (`#d96c8d`). |
| 2 | `banana_02` | Banana Flower | none | A green stalk with **six pointed pink petals** fanning upward like a crown, alternating hot pink `#e8587f` and deeper `#c93d66`, around a round yellow centre `#ffd34d`. |
| 3 | `banana_03` | Green Banana | none | **One large curved banana**, unripe lime green (`#8fcf4a`), lying almost horizontally and slightly tilted, curving up to the right. Brown stem tip at the upper right, a pale highlight line along the inner curve. |
| 4 | `banana_04` | Ripe Banana | none | The same banana in **ripe yellow** `#f6d44a`. Make the change from level 3 strong (consider brown freckles). |
| 5 | `banana_05` | Banana Pair | white | **Two yellow bananas**, one in front of the other, offset diagonally (lower-left and upper-right). |
| 6 | `banana_06` | Banana Hand | white | **Five bananas stacked vertically**, fanning slightly, joined at the top by a green rounded stem cap. |
| 7 | `banana_07` | Banana Bunch | blue | A **thick green stalk** coming down from the top, with **eight bananas hanging in two rows** around it, curving outward. Drawn at about 85 % scale, slightly up-left. |
| 8 | `banana_08` | Banana Crate | blue | A **wooden slatted crate** filling the lower half, with **three yellow bananas** lying on top. |
| 9 | `banana_09` | Banana Cart | gold | A **wooden cart** (box, two dark brown spoked wheels with tan hubs, a pull handle angled up to the right) loaded with three bananas. |
| 10 | `banana_10` | Golden Banana Stalk | gold | Max level. A **soft golden halo** disc behind, a golden-brown stalk from the top, **six golden bananas** (`#ffcf3a`) in two rows, and the gold sparkle set. It should feel like a trophy. |

### 5.2 Coconut (`coconut`), 9 levels, crop

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `coconut_01` | Coconut Blossom | none | A thin green stem with **five cream petals** (`#f7efd5`) fanning upward around a small yellow centre. |
| 2 | `coconut_02` | Green Coconut | none | A **round green coconut** (`#8cc152`) with the classic **three dark "eyes"** (small dots in a triangle) and a shine. |
| 3 | `coconut_03` | Brown Coconut | none | The same round nut in **brown** (`#7a5236`) with three eyes. |
| 4 | `coconut_04` | Cracked Coconut | none | A brown coconut split open by a **zig-zag crack**, showing the **white flesh** (`#fff7e8`) inside the lower half. |
| 5 | `coconut_05` | Coconut Cream Jar | white | A **pale blue-white jar** with a wooden lid band and a cream label printed with a little brown cloud symbol. |
| 6 | `coconut_06` | Coconut Oil Bottle | white | A **tall golden bottle** (`#e8c35a`), rounded, with a wooden cork, a cream label and a brown dot emblem. |
| 7 | `coconut_07` | Coconut Crate | blue | A wooden crate with **three brown coconuts** sitting on top. |
| 8 | `coconut_08` | Palm Seedling | blue | A soil mound with a short stem and **five large green palm leaves** fanning out. |
| 9 | `coconut_09` | Coconut Palm | gold | Max level. A **full coconut palm**: a thick, slightly curved tan trunk (`#a67c52`) rising from the bottom, **six big fronds** spreading at the top, and two brown coconuts under the crown. |

### 5.3 Pineapple (`pineapple`), 8 levels, crop

The pineapple body is an upright oval with a **diamond (cross-hatch) grid** in a darker shade and a crown of **seven spiky leaves**.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `pineapple_01` | Pineapple Sprout | none | A soil mound with **four short spiky leaves**. |
| 2 | `pineapple_02` | Pineapple Plant | none | A soil mound with **seven longer spiky leaves** and a tiny yellow-green fruit nub in the middle. |
| 3 | `pineapple_03` | Green Pineapple | none | A **whole pineapple, unripe green** (`#9bcb4a`) with its leaf crown. |
| 4 | `pineapple_04` | Ripe Pineapple | none | The same in **ripe golden** `#f2b32a`. |
| 5 | `pineapple_05` | Sliced Pineapple | white | **Three stacked yellow pineapple rings** (`#ffd54a`) with pale cores, and two leaves on top. |
| 6 | `pineapple_06` | Pineapple Basket | white | A woven basket holding **three small pineapples**. |
| 7 | `pineapple_07` | Pineapple Crate | blue | A wooden crate with **three pineapples** on top. |
| 8 | `pineapple_08` | Pineapple Pyramid | blue | Max level. **Six small pineapples stacked in a pyramid** (3-2-1) plus the gold sparkle set. |

### 5.4 Mango (`mango`), 8 levels, crop

The mango fruit is a plump kidney shape with a lighter **blush** patch on the right, a small leaf at the top and a shine.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `mango_01` | Mango Seed | none | A flat **oval husk** in tan-brown (`#a7835a`), tilted diagonally, with a darker ridge line along its length. |
| 2 | `mango_02` | Mango Sprout | none | A soil mound, a short stem, **one bronze-red young leaf** (`#b4482b`) and one green leaf. |
| 3 | `mango_03` | Mango Blossom | none | A **diagonal branch** with four leaves, each with a small **pink blossom** (`#ffb7c5`) with a yellow centre. |
| 4 | `mango_04` | Green Mango | none | A **large unripe mango**, green (`#8cc152`) with a pale green blush. |
| 5 | `mango_05` | Ripe Mango | white | A **ripe mango**, orange (`#ff9f3c`) with a yellow blush (`#ffcf5c`). |
| 6 | `mango_06` | Mango Basket | white | A woven basket with **three ripe mangoes** in slightly different oranges. |
| 7 | `mango_07` | Mango Crate | blue | A wooden crate with **three mangoes** on top. |
| 8 | `mango_08` | Mango Tree | blue | Max level. A **small mango tree**: a thick brown trunk and a round canopy (three overlapping green circles) with three ripe mangoes. |

### 5.5 Papaya (`papaya`), 8 levels, crop (from the Garden Plot)

The papaya is a tall oval, slightly tilted, with a shine.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `papaya_01` | Papaya Seed | none | A **cream oval dish of papaya pulp** (`#f4d39a`) dotted with **small glossy black seeds**. |
| 2 | `papaya_02` | Papaya Seedling | none | A soil mound with a short stem and two leaves. |
| 3 | `papaya_03` | Papaya Sapling | none | A **thin tan trunk** with **six palm-like leaves** at the top. |
| 4 | `papaya_04` | Green Papaya | none | A **tall green papaya** (`#9bcb4a`). |
| 5 | `papaya_05` | Ripe Papaya | white | An **orange papaya cut open**, showing deep orange flesh and a line of **black seeds** down the middle. |
| 6 | `papaya_06` | Papaya Basket | white | A basket with **three small papayas**. |
| 7 | `papaya_07` | Papaya Crate | blue | A crate with **three papayas**. |
| 8 | `papaya_08` | Papaya Grove | blue | Max level. **Two papaya trees** side by side (thin trunks with leaf crowns) with papayas hanging under the leaves. |

### 5.6 Hibiscus (`hibiscus`), 8 levels, crop (from the Garden Plot)

The open flower has **five rounded petals**, a dark red centre, and a **yellow stamen** curving up and to the right, tipped with small pollen dots.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `hibiscus_01` | Flower Seed | none | A small **brown oval seed** (`#8a6a43`) with two tan flecks. |
| 2 | `hibiscus_02` | Sprout | none | A soil mound, a short stem and two leaves. |
| 3 | `hibiscus_03` | Bud | none | A green stem with two leaves, topped by a **closed pink bud** (`#ff6b8a`) with a centre seam line. |
| 4 | `hibiscus_04` | Hibiscus Bloom | none | One **large open red hibiscus** (`#ff4d6d`) with two leaves below. |
| 5 | `hibiscus_05` | Hibiscus Bouquet | white | **Three stems in a cream paper cone**, with three flowers in red, pink (`#ff8fa3`) and orange (`#ffb347`). |
| 6 | `hibiscus_06` | Flower Lei | white | A **ring of green cord** with **eight small flowers** around it in red, orange, pink and yellow. |
| 7 | `hibiscus_07` | Garland Arch | blue | A **wooden garden arch** on two short posts with **six flowers** along the curve. |
| 8 | `hibiscus_08` | Blossom Garden | blue | Max level. A green garden mound with **seven flowers** in red, orange, pink, yellow and purple (`#c77dff`), plus sparkles. |

### 5.7 Herbs (`herbs`), 8 levels, crop (from the Garden Plot)

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `herbs_01` | Herb Seed | none | A small **tan dish of dark seeds**. |
| 2 | `herbs_02` | Herb Sprout | none | A soil mound with **three small leaves**. |
| 3 | `herbs_03` | Mint Sprig | none | An **upright stem** with **five bright leaves** alternating left and right, in two greens. |
| 4 | `herbs_04` | Lemongrass Stalk | none | **Four long, thin, yellow-green blades** rising from one point at the bottom. |
| 5 | `herbs_05` | Ginger Root | white | A **knobbly tan ginger root** (`#e1b66a`) lying sideways, with a lighter top and one small leaf. |
| 6 | `herbs_06` | Vanilla Pod | white | **Three long, thin, dark-brown vanilla pods** standing in a loose curved bundle. |
| 7 | `herbs_07` | Spice Bundle | blue | **Four herb blades** (green, tan, light green, orange) tied in a bundle with a **red band** and twine. |
| 8 | `herbs_08` | Spice Chest | blue | Max level. A **wooden spice chest** with a tan lid, a gold clasp and three herb leaves peeking out, plus sparkles. |

### 5.8 Clearing Tools (`clearing_tools`), 8 levels, tool

Tools are dragged onto obstacles. Each obstacle needs a minimum tool level, and stronger tools also work. All tools are drawn **tilted about 30° anticlockwise**, with honey-wood handles (`#b9854f`) and steel heads that get **brighter with level**: grey `#9aa5ad` (levels 1–3), light steel `#b9c5cd` (4–6), near-white `#dfe6ea` (7–8). From level 5 a **sparkle** appears top-right and grows with level. A thin white highlight runs along each blade.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `clearing_tools_01` | Hand Trowel | none | A short wooden handle and a **trapezoid scoop blade**. |
| 2 | `clearing_tools_02` | Garden Shears | none | **Two crossed blades** with a red pivot bolt and **two red handles**. |
| 3 | `clearing_tools_03` | Hoe | none | A long handle with a flat **T-shaped hoe blade** at the top. |
| 4 | `clearing_tools_04` | Machete | none | A short handle and a **long, slightly widening blade**. |
| 5 | `clearing_tools_05` | Hatchet | white | A medium handle with an **angular axe head** to one side. |
| 6 | `clearing_tools_06` | Felling Axe | white | A long handle with a **big axe head** and a darker back. |
| 7 | `clearing_tools_07` | Pickaxe | blue | A long handle with a **curved two-pointed pick head**. |
| 8 | `clearing_tools_08` | Sledgehammer | blue | A handle with a **large rectangular hammer head**: lighter top band, darker bottom band, and its own sparkle. |

### 5.9 Lumber (`lumber`), 9 levels, material

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `lumber_01` | Twig | none | A thin **diagonal brown twig** with one side shoot and one small leaf. |
| 2 | `lumber_02` | Branch | none | A **thicker branch** with two side branches. |
| 3 | `lumber_03` | Log | none | A **horizontal rounded log**: bark `#a8713a` with a grain line, and a **cream end-grain face** on the right showing growth rings. |
| 4 | `lumber_04` | Rough Plank | none | A **darker, rough plank** tilted about 15°, with a grain line and two nail dots. |
| 5 | `lumber_05` | Smooth Plank | white | A **light honey-coloured plank** (`#efc27d`), clean and smooth. |
| 6 | `lumber_06` | Beam | white | A **thick squared beam** seen from the front: lighter top face and a darker underside strip. |
| 7 | `lumber_07` | Plank Stack | blue | **Four planks stacked** on top of each other in alternating shades. |
| 8 | `lumber_08` | Timber Frame | blue | A **rectangular timber frame**: two posts, top and middle rails, and a diagonal brace. |
| 9 | `lumber_09` | Roof Truss | gold | Max level. An **A-frame roof truss**: a triangle with a crossbar, a central king post and diagonal struts. |

### 5.10 Stone (`stone`), 8 levels, material

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `stone_01` | Pebble | none | A **smooth grey pebble** with a smaller one beside it, plus a shine. |
| 2 | `stone_02` | Flint | none | A **sharp, angular dark-grey shard** with a lighter facet and edge lines. |
| 3 | `stone_03` | Stone | none | A **large rounded grey rock** with a lighter top and a small crack. |
| 4 | `stone_04` | Cut Stone | none | A **neat beige block** in three-quarter (isometric) view, with a lighter top face. |
| 5 | `stone_05` | Brick | white | **Terracotta bricks** (`#c4693f`) in a small panel with mortar lines in a cross. |
| 6 | `stone_06` | Brick Stack | white | **Five bricks stacked in a pyramid** (two, one, two). |
| 7 | `stone_07` | Stone Block | blue | A **big pale-grey dressed block** in isometric view. |
| 8 | `stone_08` | Mason Pillar | blue | Max level. A **fluted classical column** with a capital and base, plus a sparkle. |

### 5.11 Fiber and Rope (`fiber`), 8 levels, material

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `fiber_01` | Palm Fiber | none | **Six tan fibre strands** fanning up from one point, in two tans. |
| 2 | `fiber_02` | Twine | none | A **ball of tan twine** with wrap lines and a loose tail flicking up to the right. |
| 3 | `fiber_03` | Cord | none | A **flat spiral coil of cord** (concentric loops in light and dark tan, outlined dark brown) with a dark hub. |
| 4 | `fiber_04` | Rope | none | A **thick rope** arching across the frame, with diagonal twist marks. |
| 5 | `fiber_05` | Rope Coil | white | **Four stacked oval rope loops**, like a coiled ship's rope. |
| 6 | `fiber_06` | Fishing Net | white | A **trapezoid of square net mesh** in tan cords with a dark border, see-through between the cords. |
| 7 | `fiber_07` | Woven Mat | blue | A **rectangular woven rug**: terracotta base with navy, cream and green stripes. |
| 8 | `fiber_08` | Hammock | blue | Max level. **Two wooden posts** with a **striped hammock** (terracotta and cream) sagging between them, plus a sparkle. |

### 5.12 Hardware (`hardware`), 8 levels, material

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `hardware_01` | Rusty Nail | none | **One rust-orange nail** lying diagonally, with a rust speck. |
| 2 | `hardware_02` | Nails | none | **Four grey nails** scattered at different angles. |
| 3 | `hardware_03` | Screws | none | **Three silver screws** standing upright with thread lines. |
| 4 | `hardware_04` | Hinge | none | An **open door hinge**: two grey plates and a darker central knuckle, with four screw holes. |
| 5 | `hardware_05` | Lock | white | A **golden padlock** (`#e6b422`) with a silver shackle and a dark keyhole. Also the key item for Locked Crates. |
| 6 | `hardware_06` | Pipe Set | white | **Grey pipes** in an L-shape with a **red valve wheel** and a red joint. |
| 7 | `hardware_07` | Hardware Kit | blue | A **terracotta box** with a lighter lid, a grey handle, three nails sticking up and a cream label. |
| 8 | `hardware_08` | Mechanic's Toolbox | blue | Max level. A **red toolbox** with a lighter lid, a grey arched handle, a yellow latch and a sparkle. |

### 5.13 Chicken (`chicken`), 8 levels, animal (Hen House)

The hen faces right: a round body, a darker wing, a small round head with a **red zig-zag comb**, an orange beak, a red wattle, a little tail, and two orange legs.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `chicken_01` | Egg | none | A **cream egg** (`#fdf5e6`), slightly tilted, with a shine. |
| 2 | `chicken_02` | Speckled Egg | none | The same egg with **brown speckles**. |
| 3 | `chicken_03` | Hatching Egg | none | A speckled egg **cracked across the top**, with a jagged white shell edge and a chick's **eyes and orange beak** peeking out. |
| 4 | `chicken_04` | Chick | none | A **round fluffy yellow chick** (`#ffe066`) with big eyes, rosy blush, a tiny beak, a small wing and little orange legs. |
| 5 | `chicken_05` | Young Hen | white | A slightly **small cream-tan hen**. |
| 6 | `chicken_06` | Hen | white | A **full-size white hen**. |
| 7 | `chicken_07` | Proud Rooster | blue | A **chestnut-red rooster** (`#b5452c`) with a big **teal and navy tail plume**. |
| 8 | `chicken_08` | Golden Hen | blue | Max level. A **golden-yellow hen** with an orange comb, a golden halo and sparkles. |

### 5.14 Cow (`cow`), 8 levels, animal (Cow Shed)

The cow faces right: a rounded rectangular white body, three visible legs, a head on the right with a **pink muzzle** and nostrils, two cream horns, a floppy ear, and a tail with a dark tuft.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `cow_01` | Hay Tuft | none | **Six golden straw blades** fanning up. |
| 2 | `cow_02` | Hay Bundle | none | A **rectangular hay bale** with straw lines and two brown twine bands. |
| 3 | `cow_03` | Calf | none | A **small cream calf** with a pink muzzle and little ears (no horns). |
| 4 | `cow_04` | Young Cow | none | A smaller **white cow with black patches**. |
| 5 | `cow_05` | Cow | white | A **plain white cow**, full size. |
| 6 | `cow_06` | Spotted Cow | white | A **white cow with black patches**, full size. Make it clearly different from level 4 (size, pose or patch pattern). |
| 7 | `cow_07` | Bell Cow | blue | A spotted cow wearing a **gold cow bell** on a red strap. |
| 8 | `cow_08` | Champion Cow | blue | Max level. The bell cow plus a **red prize rosette** with a gold centre on its back, and sparkles. |

### 5.15 Goat (`goat`), 8 levels, animal (Goat Pen)

The goat faces right: a rounded body, four legs, a head with a lighter muzzle, a small **beard**, ears, and **two curved horns** that get longer with level.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `goat_01` | Clover | none | **Three stems** each topped by a cluster of round **green clover leaves**. |
| 2 | `goat_02` | Feed Sack | none | A **burlap feed sack** with a tied brown top band, a stitch line and a **"G"** printed on it (the letter may be replaced by a goat-head emblem). |
| 3 | `goat_03` | Kid Goat | none | A small **white kid** with tiny horn nubs. |
| 4 | `goat_04` | Young Goat | none | A cream goat with short horns. |
| 5 | `goat_05` | Goat | white | A full goat with full horns. |
| 6 | `goat_06` | Billy Goat | white | A **grey-tan goat** with **large dark horns** and a darker chest band. |
| 7 | `goat_07` | Mountain Goat | blue | A **dark grey-brown goat** with long pale horns, **standing on grey rocky peaks**. |
| 8 | `goat_08` | Golden-Horn Goat | blue | Max level. A **cream goat** with long **golden horns** and sparkles. |

### 5.16 Dairy (`dairy`), 7 levels, food (Cow Shed)

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `dairy_01` | Milk Drop | none | A **white milk droplet** with a strong shine. |
| 2 | `dairy_02` | Milk Jug | none | A **pale-blue milk jug** with a handle on the right, a lid and a white label. |
| 3 | `dairy_03` | Cream Pot | none | A **tan clay pot** brimming with cream, with a side handle. |
| 4 | `dairy_04` | Butter Block | none | A **butter-yellow block** in isometric view with a lighter top. |
| 5 | `dairy_05` | Soft Cheese | white | A **round soft cheese** in cream with small dimples and a leaf garnish. |
| 6 | `dairy_06` | Cheese Wheel | white | A **yellow cheese wheel** with a **wedge cut out** and round holes. |
| 7 | `dairy_07` | Cheese Platter | blue | Max level. A **round wooden board** with three cheese wedges (yellow, cream, orange), two dark-red grapes and a sparkle. |

### 5.17 Island Meals (`meals`), 9 levels, food (Kitchen Hearth)

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `meals_01` | Flour Pinch | none | A **small white heap of flour**. |
| 2 | `meals_02` | Dough Ball | none | A **round cream dough ball** with a shine. |
| 3 | `meals_03` | Flatbread | none | An **oval golden flatbread** with toasted brown spots. |
| 4 | `meals_04` | Banana Fritter | none | A **white plate** with **three golden-orange fritters** piled up. |
| 5 | `meals_05` | Fruit Tart | white | A **pastry tart** with a golden rim and custard filling, topped with red, green and orange fruit. |
| 6 | `meals_06` | Coconut Curry Bowl | white | A **teal-blue bowl** of **orange curry** with red chilli bits and **two steam wisps** rising. |
| 7 | `meals_07` | Grilled Platter | blue | A plate with a **salmon-pink grilled fillet**, a green vegetable, an orange vegetable and a herb sprig. |
| 8 | `meals_08` | Family Feast | blue | A **wooden tray** with three white bowls of food (salmon, green, orange), a **red ribbon banner** above and a sparkle. |
| 9 | `meals_09` | Luau Banquet | gold | Max level. A **long wooden banquet table** heaped with **seven colourful fruits**, a **gold star** above and sparkles. |

### 5.18 Drinks (`drinks`), 8 levels, food (Juice Stand)

Glasses are drawn **semi-transparent** (pale blue-white, `rgba(235,248,255,0.65)`) with the drink colour inside, a tall **shine stripe**, and usually a **pink straw** (`#ff6b8a`).

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `drinks_01` | Fruit Splash | none | An **orange juice droplet** with five smaller droplets flying around it. |
| 2 | `drinks_02` | Juice Glass | none | A **tapered glass of orange juice** with a straw. |
| 3 | `drinks_03` | Juice Pitcher | none | A **glass pitcher** of orange-red juice with a handle and a lemon slice on the rim. |
| 4 | `drinks_04` | Smoothie | none | A glass of **purple smoothie** (`#c77dff`) with a whipped-cream top and a cherry. |
| 5 | `drinks_05` | Tropical Punch | white | A glass of **red-orange punch** with a leaf, a lemon slice, a cherry and a pink paper umbrella. |
| 6 | `drinks_06` | Sparkling Mocktail | white | A **stemmed cocktail glass** of **turquoise drink** (`#56cfe1`) with a lemon slice, a straw and a sparkle. |
| 7 | `drinks_07` | Drink Tray | blue | A **round wooden tray** with **three glasses** (red, turquoise and green). |
| 8 | `drinks_08` | Beach Bar Counter | blue | Max level. A **little wooden bar counter** with a **red-and-white striped awning** on two posts, a drink on the counter and a sparkle. |

### 5.19 Coins (`coins`), 8 levels, treasure (currency)

Tapping a coin item adds coins to the player's wallet. **Coins have no level pips** (6.4). Coin discs have an inner ring and a **"$"** in a darker shade of the coin colour.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `coins_01` | Copper Coin | none | **One large copper coin** (`#cd7f32`). |
| 2 | `coins_02` | Silver Coin | none | **One silver coin** (`#c0c8cf`). |
| 3 | `coins_03` | Gold Coin | none | **One gold coin** (`#ffd23f`). |
| 4 | `coins_04` | Coin Pile | none | **Six smaller coins** in a loose pile: copper, silver and gold. |
| 5 | `coins_05` | Coin Stack | white | **A neat stack of four gold coins** seen from the side, with a sparkle. |
| 6 | `coins_06` | Coin Bag | white | A **tan money sack** tied with a red cord, with a big gold **"$"** on it. |
| 7 | `coins_07` | Coin Chest | blue | An **open wooden chest** brimming with gold coins, with a gold band and lock. |
| 8 | `coins_08` | Treasure Hoard | blue | Max level. A **heap of ten gold coins** on a golden mound, a big pale coin and a gold bar on top, and three sparkles. |

### 5.20 Energy Sparks (`sparks`), 6 levels, energy (currency)

Tapping a spark gives energy. Every level sits on a **soft warm-yellow glow disc** (`rgba(255,230,120,0.28)`) and has a lighter ground shadow. Colour shifts from pale yellow to deep orange as level rises.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `sparks_01` | Spark | none | A **four-pointed yellow star** (`#ffe566`). |
| 2 | `sparks_02` | Glow | none | A **yellow ball** with **eight short rays** around it and a shine. |
| 3 | `sparks_03` | Orb | none | A **gold sphere** with a pale core and a **white four-pointed star** at its centre. |
| 4 | `sparks_04` | Lantern | none | A small **orange lantern** with a pale glowing window, a brown cap and handle, and an orange star emblem. |
| 5 | `sparks_05` | Sunstone | white | An **orange disc** surrounded by **twelve yellow triangular rays** (a sun), with a pale core. |
| 6 | `sparks_06` | Sun Core | white | Max level. A **layered sun**: orange rim, amber middle, pale centre, with **eight sparkles orbiting** it. |

### 5.21 Pearls (`pearls`), 6 levels, treasure (currency)

Tapping a pearl item adds pearls. Pearls are glossy spheres with a strong shine (85 %). Levels 3 to 5 have a small white sparkle at the upper right.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `pearls_01` | Pearl Chip | none | An **irregular off-white fragment** with a white sparkle. |
| 2 | `pearls_02` | Small Pearl | none | A **small white pearl**. |
| 3 | `pearls_03` | Round Pearl | none | A **larger pearl** with a faint pink tint (`#f4e8ee`). |
| 4 | `pearls_04` | Rose Pearl | none | A **pink pearl** (`#ffc0d6`). |
| 5 | `pearls_05` | Black Pearl | white | A **dark charcoal pearl** (`#2d303c`) with **teal and violet iridescent** sheen streaks. |
| 6 | `pearls_06` | Crown Pearl | white | Max level. A **cream-gold pearl** wearing a **little gold crown** set with three red gems. |

### 5.22 Chests (`chest`), 5 levels, special

Tapping a chest opens it and spills its contents onto the board. Bigger chests hold more. Chests are a key reward and must look **exciting and clearly openable**.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `chest_01` | Driftwood Crate | none | A **low slatted crate** of weathered light wood (`#a8713a`) with a lid band and a **small grey latch**. Humbler than the other chests. |
| 2 | `chest_02` | Wooden Chest | none | A classic **treasure chest**: dark wood body, **domed lid**, two vertical **metal bands**, and a **silver lock plate** with a keyhole. |
| 3 | `chest_03` | Brass Chest | none | The same shape in **brass/gold-brown** with a yellow lock plate and a sparkle. |
| 4 | `chest_04` | Silver Chest | none | **Silver** body and lid, darker grey bands, a gold lock and two sparkles. |
| 5 | `chest_05` | Golden Chest | white | Max level. **Gold** body and pale-gold lid, a **soft golden halo** and three sparkles. |

### 5.23 Sea Life (`sea`), 9 levels, sea (Fishing Dock)

Sea creatures have **no ground shadow**. Instead a **translucent blue water ellipse** (`rgba(70,160,200,0.25)`) sits under them. Fish face **left**, with the tail on the right.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `sea_01` | Plankton | none | **Six small green bubbles** (`#9be0a0`) in a cluster. |
| 2 | `sea_02` | Shrimp | none | A **coral-pink curled shrimp** with a fan tail, little legs and a dot eye. |
| 3 | `sea_03` | Sardine | none | A **slim grey-blue fish** with a pale belly. |
| 4 | `sea_04` | Clownfish | none | An **orange clownfish** with **two white bands** outlined dark. |
| 5 | `sea_05` | Seahorse | white | An **upright yellow seahorse** with a curled tail, a snout pointing right and ridge lines on its belly. |
| 6 | `sea_06` | Sea Turtle | white | A **green sea turtle** seen from above: a shell with diamond plates, a head on the right, and four flippers. |
| 7 | `sea_07` | Dolphin | blue | A **blue-grey dolphin** with a pale belly and a dorsal fin, gently arched. |
| 8 | `sea_08` | Manta Ray | blue | A **dark navy manta ray** (diamond shape) with a lighter wing, a tail and pale eye spots. |
| 9 | `sea_09` | Whale | gold | Max level. A **big friendly blue whale** with a white belly, a happy eye, a **water spout** from its head and a raised tail. |

### 5.24 Shells and Coral (`shells`), 7 levels, sea (Fishing Dock)

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `shells_01` | Shell Chip | none | A **small peach shell fragment**. |
| 2 | `shells_02` | Seashell | none | A **pink scallop shell** with fan ribs. |
| 3 | `shells_03` | Spiral Shell | none | A **peach conch** with spiral lines and a pointed tip to the right. |
| 4 | `shells_04` | Starfish | none | An **orange five-armed starfish** with lighter arm lines and dots. |
| 5 | `shells_05` | Coral Branch | white | A **pink-red branching coral** with round nodules on the tips. |
| 6 | `shells_06` | Coral Fan | white | A **pink fan coral** on a short stalk with radiating ribs. |
| 7 | `shells_07` | Coral Reef | blue | Max level. A **sandy base** with **four coral branches** (pink, orange, purple, teal), a starfish, a shell and a sparkle. |

### 5.25 Spirit Amulets (`amulet`), 5 levels, magic (Spirit Shrine, from zone 8)

Merging up to level 5 and tapping the finished amulet adds 1 to the player's **amulet counter** (used to unlock zones). The family should feel **mystical and spirit-like**: mint and teal glows with gold framing. Lighter ground shadow.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `amulet_01` | Spirit Wisp | none | A **translucent mint ghost-flame** (`rgba(190,255,240,0.85)`) with **two little dot eyes**, inside a soft mint halo. Cute, not scary. |
| 2 | `amulet_02` | Charm Fragment | none | **Two teal crystal shards** (`#7fd1c4`, `#5bb8c9`) and a white sparkle. |
| 3 | `amulet_03` | Amulet Shard | none | A **pentagonal teal crystal** with a lighter top facet and facet lines, plus a sparkle. |
| 4 | `amulet_04` | Carved Amulet | none | A **gold round pendant** (`#e6b422`) with a **teal stone** centre carved with a **pale four-pointed star**, hanging from a gold cord loop. |
| 5 | `amulet_05` | Ancient Amulet | white | Max level. A **larger gold pendant** in a mint halo: a **ring of twelve bead dots**, a teal centre with a **six-pointed pale star**, a gold boss in the middle, sparkles and a gold cord. |

### 5.26 Dragons (`dragon`), 9 levels, dragon

**Not obtainable in the current game.** Its generator (the "Roost") is locked behind an unused zone. Deliver it at lower priority, but in the same style. The dragon is a **chibi baby dragon facing the viewer**: round body with a pale belly, round head with a snout, two cream horns, big shiny eyes, two feet, and a **tail curling to the left** with a spade tip. It grows larger with level.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `dragon_01` | Dragon Egg | none | A **lavender egg** (`#e8e1f2`) with **darker triangular spikes** and a shine. |
| 2 | `dragon_02` | Warm Egg | none | A **peach egg** (`#ffd6a8`) with spikes and a **warm orange glow** behind. |
| 3 | `dragon_03` | Hatchling | none | A small **light-green dragon** (`#7fd36b`), no wings. |
| 4 | `dragon_04` | Whelp | none | A green dragon (`#6bbf59`) with **small wings** spread behind. |
| 5 | `dragon_05` | Young Dragon | white | A darker green dragon (`#4aa84a`) with bigger wings. |
| 6 | `dragon_06` | Ember Dragon | white | An **orange dragon** (`#ff7a3c`) with a small **flame mark** on its chest. |
| 7 | `dragon_07` | Storm Dragon | blue | A **blue dragon** (`#4a8fe0`) with a flame mark. |
| 8 | `dragon_08` | Elder Dragon | blue | A **purple dragon** (`#8a6ad8`) with the widest wings. |
| 9 | `dragon_09` | Sun Dragon | gold | Max level. A **golden dragon** (`#ffbe2e`) with sparkles. |

### 5.27 Pet Eggs (`pet`), 6 levels, pet (Nest of Wonders)

Merging up to level 6 and tapping it gives the player a permanent **pet companion**. Six species exist, and the sprite at levels 3 to 6 **changes by species**. The engine passes the species as a variant (`sp`). Levels 1 and 2 are eggs; the speckles of level 2 use the species colour.

**Sprite IDs:** `pet_01` and `pet_02` (eggs, one version each; for `pet_02` either deliver one generic speckle colour or one per species), then `pet_03/<species>` … `pet_06/<species>` for each of the six species (**24 creature frames**). Level 6 is also used large (96 CSS px) in the "New pet!" popup and the pet list.

| Lv | Name | Look |
|---|---|---|
| 1 | Pet Egg | A **plain white egg** (`#f6f2ea`) with a shine. |
| 2 | Speckled Pet Egg | The same egg with **four spots in the species colour**. |
| 3 | Hatchling Pet | A **small chibi animal** facing the viewer: round body with a lighter belly, a big round head with a lighter muzzle, big shiny eyes, rosy blush, little feet. |
| 4 | Young Pet | Same, a bit larger. |
| 5 | Adult Pet | Same, larger again. |
| 6 | Island Companion | Largest, plus a **gold collar tag** and sparkles. |

| Species ID | Name | Species | Colour | Distinguishing features |
|---|---|---|---|---|
| `pip` | Pip | Parrot | red `#e63946` | **One yellow and one blue wing** at the sides, a **yellow beak** (triangle) instead of a nose, a yellow head crest. No tail. |
| `coco` | Coco | Capuchin monkey | brown `#8d6e63` | **Round ears** on the sides with lighter insides, a curling tail. |
| `shelly` | Shelly | Sea turtle | teal `#2a9d8f` | A **dark-teal shell** behind and around the body with lighter **diamond plates**, small side flippers. No tail. |
| `biscuit` | Biscuit | Puppy | tan `#d4a373` | **Long floppy darker ears**, a curling tail. |
| `mochi` | Mochi | Sloth | grey `#bcb8b1` | **Dark brown eye patches** slanting down from the eyes, a sleepy look, a tail. |
| `marlow` | Marlow | Cat | grey `#6c757d` | **Pointed ears with pink insides**, **white whiskers**, a curling tail. |

### 5.28 Penguins (`penguin`), 7 levels, animal: Frostfin Isle only

These items exist only on the ice expedition island.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `penguin_01` | Snowball | none | A **round white snowball** (`#f4fbff`) with a bright shine and a white sparkle. |
| 2 | `penguin_02` | Ice Chunk | none | A **faceted pale-blue ice chunk** with a lighter top facet and facet lines. |
| 3 | `penguin_03` | Penguin Egg | none | A **pale-blue egg** with sky-blue spots. |
| 4 | `penguin_04` | Penguin Chick | none | A **fluffy grey chick**: grey body and head, white face and belly, big eyes, an orange beak, small flippers and orange feet. |
| 5 | `penguin_05` | Young Penguin | white | A **navy penguin** (`#2b3a52`) with a white belly and face. |
| 6 | `penguin_06` | Penguin | white | The same, full size. |
| 7 | `penguin_07` | Emperor Penguin | blue | Max level. A larger penguin with a **gold bib** and **gold cheek patches**, plus a sparkle. |

### 5.29 Sweets (`sweets`), 7 levels, food: Sugar Cay only

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `sweets_01` | Sugar Crystal | none | Two **pastel crystals**, pink (`#ffd0f0`) and lavender (`#b8a3ff`), with a shine. |
| 2 | `sweets_02` | Candy Drop | none | A **round pink candy** (`#ff6b9a`) with white swirl stripes and **twisted wrapper ends** on both sides. |
| 3 | `sweets_03` | Gumdrop Bag | none | A **light-blue sweet bag** tied with a pink ribbon, with three gumdrops (pink, yellow, green) bouncing above. |
| 4 | `sweets_04` | Cupcake | none | A cupcake in a **pink striped paper case**, white frosting swirl and a **red cherry**. |
| 5 | `sweets_05` | Layer Cake | white | A **two-layer cake** (pink bottom, mint top) with white frosting and four coloured candies on top. |
| 6 | `sweets_06` | Candy Tower | white | **Three stacked rounded tiers** (pink, yellow, blue), a mint top, a cherry and a sparkle. |
| 7 | `sweets_07` | Gingerbread House | blue | Max level. A **gingerbread house** with a white icing roof edge, a chocolate door, yellow windows, candy dots and a sparkle. |

### 5.30 Lanterns (`lantern`), 7 levels, magic: Lantern Isle only

Lantern Isle is a night island, so these items **glow**: a warm translucent glow disc (`rgba(255,230,120,0.3–0.35)`) sits behind most levels.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `lantern_01` | Firefly | none | A **dark little firefly** with a **glowing yellow abdomen**, two pale curved wings and a warm glow. |
| 2 | `lantern_02` | Glow Jar | none | A **glass jar** with a wooden lid, a warm glow inside and three glowing dots (fireflies). |
| 3 | `lantern_03` | Paper Lantern | none | A **round red-orange paper lantern** (`#ff7a59`) with vertical ribs, brown top and bottom caps, a hanging string and **two red tassels**. |
| 4 | `lantern_04` | Lantern String | none | A **drooping string** across the frame with **five small paper lanterns** (red, yellow, green, blue, purple), each glowing. |
| 5 | `lantern_05` | Star Lantern | white | A **gold five-pointed star lantern** with a paler inner star, hanging from a short cord. |
| 6 | `lantern_06` | Moon Lamp | white | A **pale moon sphere** with soft craters, on a small brown stand, glowing. |
| 7 | `lantern_07` | Sky Lantern | blue | Max level. A **large golden paper lantern** with a big glow and three sparkles. |

### 5.31 Pirate Gear (`pirate`), 7 levels, special: Pirate Cove only

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `pirate_01` | Tarnished Button | none | A **dull gold button** with an inner ring and four thread holes. |
| 2 | `pirate_02` | Brass Buckle | none | A **rectangular brass belt buckle** with a centre bar and a shine. |
| 3 | `pirate_03` | Eyepatch | none | A **black eyepatch** with its strap running off both sides. |
| 4 | `pirate_04` | Tricorn Hat | none | A **black tricorn pirate hat** with a **cute white skull** (round, friendly) and a gold star on the brim. |
| 5 | `pirate_05` | Captain's Coat | white | A **crimson captain's coat** (`#9c2d3a`) with white lapels and shirt, gold buttons, a gold hem and gold stars. |
| 6 | `pirate_06` | Cannon | white | A **dark grey cannon** on a **wooden carriage** with two spoked wheels, plus a sparkle. |
| 7 | `pirate_07` | Pirate Ship Model | blue | Max level. A **toy pirate ship**: a wooden hull with gold portholes, a mast with **two white sails**, a **red pennant**, and a strip of water underneath. |

### 5.32 Ember Crystals (`ember`), 7 levels, dragon: Dragon Peak only

Volcanic stones and gems with fiery inner light. Lighter ground shadow; glow discs behind levels 3 to 7.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `ember_01` | Ash Flake | none | **Five grey ash pebbles** with one glowing orange ember speck. |
| 2 | `ember_02` | Ember Chip | none | A **dark volcanic rock chip** with **glowing orange cracks**. |
| 3 | `ember_03` | Ember Stone | none | A **larger dark rock** with **glowing orange lava veins** and an orange glow. |
| 4 | `ember_04` | Fire Crystal | none | A **faceted red-orange gem** (`#ff5a2c`), hexagonal and pointed at the top, in an orange glow. |
| 5 | `ember_05` | Sun Prism | white | A **gold gem** with **six short light rays** around it, in a warm glow. |
| 6 | `ember_06` | Storm Crystal | white | A **blue gem** (`#5bb8ff`) with a **yellow lightning bolt**, in a blue glow. |
| 7 | `ember_07` | Dragon Heart | blue | Max level. A **red heart-shaped gem** with **orange and yellow inner layers** (like a flame), in a red glow, with a sparkle. |

### 5.33 Expedition Supplies (`supplies`), 6 levels, special

Merging to level 6 and tapping it gives an **Expedition Ticket** (used to visit islands). The family has a **nautical, map-and-adventure** feel: parchment with red markings.

| Lv | Sprite ID | Name | Glow | Look |
|---|---|---|---|---|
| 1 | `supplies_01` | Map Scrap | none | A **torn scrap of parchment** (`#f4e3b0`) with a red dotted route and a **red X**. |
| 2 | `supplies_02` | Map Piece | none | A **rectangular parchment** with a green coastline and a red X. |
| 3 | `supplies_03` | Sea Chart | none | A **cream sea chart** with a **blue compass rose** (two circles and a crosshair) and a red star. |
| 4 | `supplies_04` | Spyglass | none | A **brass telescope** lying diagonally, in three telescoping sections, with a blue lens. |
| 5 | `supplies_05` | Captain's Compass | white | A **gold compass** with a cream face, a **red eight-pointed star** and a navy needle. |
| 6 | `supplies_06` | Voyage Ticket | white | A **cream ticket** with a **red stub** on the left, a perforation line, the word **"TICKET"**, a red star and a sparkle. |

### 5.34 Seed Pouch (`gen_seed`), 3 levels, generator

**Generators** are items the player **taps** to create new items (1 energy per tap on the main island). They show no level pips. A level-1 Seed Pouch is on the board from the start. It makes banana, coconut, pineapple and mango items.

| Lv | Sprite ID | Name | Look |
|---|---|---|---|
| 1 | `gen_seed_01` | Seed Pouch | A **tan drawstring sack** (`#c9a36a`) with a brown tie, a drawstring curve, three **colourful seeds** (green, yellow, red) printed on it and **one leaf** sprouting from the top. |
| 2 | `gen_seed_02` | Seed Satchel | A **bigger sack** with a brown strap band across it, four seeds and **two leaves**. |
| 3 | `gen_seed_03` | Seed Chest | A **wooden chest** with a gold band and lock, **three sprouts** (green, pink, yellow) growing out of the lid, and a sparkle. |

### 5.35 Garden Plot (`gen_garden`), 3 levels, generator

Given when zone 3 opens. Makes papaya, hibiscus and herb items.

| Lv | Sprite ID | Name | Look |
|---|---|---|---|
| 1 | `gen_garden_01` | Garden Plot | A **diamond-shaped (isometric) raised garden bed** with a dark-brown soil inset and **rows of small green sprouts**. |
| 2 | `gen_garden_02` | Garden Bed | The same bed with **more sprouts** now **flowering** (pink, yellow and purple blossoms). |
| 3 | `gen_garden_03` | Garden Terrace | A fuller flowering bed with **two wooden corner posts** and a sparkle. |

### 5.36 Toolbox (`gen_toolbox`), 3 levels, generator

On the board from the start. Makes clearing tools and hardware.

| Lv | Sprite ID | Name | Look |
|---|---|---|---|
| 1 | `gen_toolbox_01` | Toolbox | A **red toolbox** (`#d94f4f`) with a lighter lid, a grey arched handle, a yellow latch, and a **hammer and a red screwdriver** poking out at angles. |
| 2 | `gen_toolbox_02` | Tool Chest | The same design in **blue** (`#3a86a8`). Make it visibly larger or more elaborate too, not only recoloured. |
| 3 | `gen_toolbox_03` | Workshop Trunk | The same design in **purple** (`#6a4c93`) plus a sparkle. Again, add more detail than a recolour. |

---

## 6. Item overlays drawn by the engine

These are drawn **on top of (or behind) the item sprite at run time**. Do **not** paint them into item sprites. Listed here so the art leaves room for them; optional sprite versions are noted (`js/view/art.js`).

### 6.1 Glow tiers (behind the item)

A soft **radial glow disc behind the item**, radius 56 % of the cell, fading from the centre to fully transparent. It **pulses** gently in opacity (period ≈ 2.9 s, out of phase per cell; constant when Reduce Motion is on). The tier comes from each item's `art.glow` value and generally follows the item's level:

| Tier | Colour | Peak opacity | Typical levels |
|---|---|---|---|
| none | none | none | lower levels |
| white | `rgb(255,255,255)` | 28 % | 5 to 6 |
| blue | `rgb(110,190,255)` | 36 % | 7 to 8 |
| gold | `rgb(255,214,90)` | 46 % | 9 to 10 (top of the longest families) |

*Optional deliverable:* three 256 × 256 radial glow sprites (white, blue, gold), soft-edged and centred.

### 6.2 Max-level bob

Top-level items (not generators) **bob up and down** by ±2 % of the cell (sine, ≈ 3.1 s period). No art needed; just make sure nothing in a max-level sprite is cropped by a 2 % vertical move.

### 6.3 Shimmer (special "shiny" items)

About 4 % of spawned low-level items are **shimmering**. Three shimmering items in one merge give an extra level. Shimmer is shown with:

- **Three small four-pointed sparkles** in pale yellow (`rgba(255,248,190)`) with thin orange outlines, placed around the item at about 26–36 % of the cell from its centre. Each one **twinkles**, growing and shrinking in size and opacity, out of phase with the others.
- A **thin gold ring** (`rgba(255,225,110,0.75)`, 3 % of the cell thick) around the item at 43 % radius.

*Optional deliverable:* a 4-frame twinkle animation of the shimmer sparkle (64 × 64) and a ring sprite.

### 6.4 Level pips (under the item)

A strip of small markers centred at **90 % of the cell height**, one per level up to 10. **Every fifth marker is a gold diamond** (`#ffd23f`); the others are **white dots**. All are outlined in `#3a2a1e`. Pips are **not shown** on generators or coins. In panels the pips sit at 93 % of the icon height.

*Optional deliverable:* `pip/dot` and `pip/diamond` sprites (32 × 32).

### 6.5 Frozen items (Frostfin Isle rule)

On the ice island some spawned items are **frozen** and cannot be moved until thawed. The engine draws:

- A **pale-blue translucent square** (`rgba(170,225,255,0.5)`) over 88 % of the cell.
- Two **white crack lines** like broken ice.

*Optional deliverable:* a 256 × 256 "ice block" overlay with transparent centre detail, so the item stays visible underneath.

### 6.6 Optional accessibility markers

- **Level number** (setting "numbers"): white bold number with a dark outline, in the top-right corner.
- **Colour-blind family marker** (setting "Colour patterns"): a small white polygon in the top-left corner, with a different number of sides per family group (3 to 7 sides). *Optional deliverable:* a set of 12 small family glyphs (48 × 48), one per family group: crop, material, animal, food, treasure, sea, tool, magic, dragon, energy, special, pet. Each should be a simple white shape with a dark outline, readable at 12 px.

### 6.7 Item plate

Every occupied cell has a faint **rounded-square plate** under the item: white at 16 % opacity, inset 4 units, corner radius 14. It makes items read as "on the grid". This is drawn by the engine; no art needed.

---

## 7. Obstacles

**What they are.** Obstacles cover land the player must clear. Most are cleared by **dragging a clearing tool of at least a certain level** onto them; some need a special item. Multi-hit obstacles take several tools. Clearing pays coins, sometimes drops a hidden prize, and counts toward unlocking the next zone.

**Current implementation.** `getObstacleSprite` in `js/view/world-art.js`, cached at 128 px per cell. Each obstacle is drawn inside its footprint rectangle (`w × h` cells), with the top-left of the sprite at the top-left of the footprint. The design space is 100 units per cell.

**Sprite IDs:** `obstacle/<id>`.

### 7.1 Catalogue

| ID | Name | Footprint | Hits | Cleared with | Look |
|---|---|---|---|---|---|
| `tall_grass` | Tall Grass | 1 × 1 | 1 | Clearing tool level 1+ | **Nine thick blades of grass** springing up and outward from one root point at the bottom, alternating mid-green `#5fbf4f` and light `#7fd36b`, curving like a lush tuft. |
| `thorn_bush` | Thorn Bush | 1 × 1 | 1 | tool level 2+ | A **round dark-green bush** (`#4e8a3a`) with **six pale cream thorns** pointing up and two **red berries**. |
| `dense_brush` | Dense Brush | 1 × 1 | 2 | tool level 3+ | A **thick clump of four overlapping round shrubs** in three greens with **five bright leaves** poking up in front. |
| `vine_tangle` | Vine Tangle | 1 × 1 | 2 | tool level 4+ | A **dark-green mound** wrapped in **four thick looping darker vines**, with three bright leaves and one **small pink flower**. |
| `small_stump` | Small Stump | 1 × 1 | 2 | tool level 5+ | A **short tree stump**: bark body `#a8713a`, **cream top face with growth rings**, bark crack lines, and a tiny green leaf sprouting from the side. Soft shadow below. |
| `big_stump` | Big Stump | 2 × 1 | 3 | tool level 6+ | A **wide, low stump** spanning two cells: long bark body, big oval cream top with three rings, bark lines, a knot hole, a sprouting leaf. |
| `boulder` | Boulder | 2 × 2 | 3 | tool level 7+ | A **huge rounded grey boulder** filling two by two cells, with a lighter top-left face, dark **crack lines**, a darker lower patch and **two leaves** at its base. |
| `rubble_pile` | Rubble Pile | 2 × 2 | 4 | tool level 8+ | A **heap of six angular grey rocks** in three greys, with **two broken terracotta bricks** and a **wooden plank** sticking out. |
| `driftwood` | Driftwood Pile | 1 × 1 | 1 | tool level 1+ | **Sun-bleached grey-tan driftwood** (`#b79a74`): one long curved log with a branch and a smaller twig, and a knot. The most common obstacle on the starting beach. |
| `locked_crate` | Locked Crate | 1 × 1 | 1 | a **Lock** (Hardware level 5) | A **wooden crate** with a big **X-brace**, a **gold padlock** in the centre with a silver shackle. Opening it gives a prize. |
| `hungry_boar` | Hungry Boar | 1 × 1 | 1 | any **ripe fruit** (level 4+) | A **chubby brown wild boar** facing right: pink snout, little white **tusk**, an ear, short legs, a curly tail, a ridge of bristly hair, and a **white "?"** above its head meaning "I'm hungry". Friendly, not aggressive. It wanders off once fed. |
| `mud_pit` | Mud Pit | 3 × 1 | 3 | **Cut Stone** (Stone level 4) ×3 | A **wide, flat puddle of brown mud** across three cells: darker rim `#7a5636`, lighter centre `#9a7048`, light **bubbles** and splatter dots. It is paved over with stone. |
| `sealed_gate` | Sealed Gate | 1 × 1 | 1 | opens by itself when the act's story ends | A **grey stone gate** with an inner panel, a vertical seam, horizontal bands, a **gold seal medallion** with a keyhole in the centre, a stone base and a sparkle. It must look "magically locked", not breakable. |
| `fallen_tree` | Fallen Tree | 2 × 1 | 2 | **Smooth Plank** (Lumber level 5) ×2 | A **fallen tree trunk** lying horizontally across two cells, with a cut end on the right showing rings, bark lines and a few green leaves still attached. It is bridged with planks. |

### 7.2 Obstacle states and engine overlays

- **Damage cracks** (multi-hit obstacles only): after each hit the engine draws 1 to 3 **dark crack lines** (zig-zag, `rgba(40,25,15,0.85)`) from the top. More hits taken means more cracks. *Optional deliverable:* damage-state frames `obstacle/<id>/damage1` and `/damage2` (and `/damage3` for Rubble Pile) showing the obstacle progressively broken; the engine would then use these instead of drawn cracks.
- **Hits-left badge**: a dark pill in the top-left showing "×N" in white. This is drawn by the engine.
- **Required-tool badge**: a white circle in the bottom-right corner with the **sprite of the minimum tool** inside (at 42 % of a cell) and the tool level number. Keep the bottom-right of obstacle art free of crucial detail.
- **Hit reaction**: the whole sprite **shakes** horizontally (±5 units, decaying) and squashes 6 % for 0.3 s. Green leaf particles (`#b8e6a0`) burst out and the screen shakes slightly.
- **Cleared**: the obstacle disappears with a sand-coloured particle burst (`#e0c288`) and a white ring (section 15).
- **In darkness** (Lantern Isle): drawn at 50 % opacity where the land is unlit.

---

## 8. Buildings and construction sites

**What they are.** Buildings sit on fixed **sites** on the home island. A site first appears as a **construction site** (blueprint). The player delivers items and pays coins, and the building is **built**. Built buildings are either **generators** (tap to make items, using energy or charges), give a **daily coin payout**, give a lasting **perk**, or are story landmarks.

**Current implementation.** `getBuildingSprite` in `js/view/world-art.js`, cached at 128 px per cell. Each building is drawn inside its footprint (`w × h` cells), top-left anchored. The design space is 100 units per cell, so the Hen House (2 × 2) is 200 × 200 and the Great Temple (4 × 4) is 400 × 400.

**Sprite IDs:** `building/<id>` (built), and optionally `building/<id>/site`.

### 8.1 Footprint and overhang

The current art stays inside the footprint; anything above the top edge is cut off (for example the cottage chimney smoke). New art may **overhang the top of the footprint by up to 25 % of its height** (roofs, chimneys, masts, flags) if the frame includes that headroom and the atlas JSON gives a **pivot** at the footprint's top-left. Engineering will adjust the draw offset. Nothing may overhang left, right or below, because neighbouring cells hold items.

### 8.2 Construction-site state

How the engine draws a site today:
1. The built sprite at **34 % opacity**, then **tinted pale blue** (`rgba(140,200,255,0.55)` on top), like a blueprint.
2. A **dashed rounded outline** around the footprint, glowing pale gold. Its opacity pulses and the dashes **march** around the edge.
3. A **hammer icon** in the centre, or a **star icon** when all items are delivered and it's ready to build. The icon bobs ±3 units.
4. A **progress bar** near the bottom edge: a dark pill filled green as items are delivered.

*Optional deliverable:* a dedicated `building/<id>/site` frame per building: scaffolding, foundation stakes or a half-built frame in the same footprint. If supplied, the engine shows it instead of the blue tint but keeps the dashed outline, icon and progress bar.

### 8.3 Engine badges on built buildings

- **Tier badge**: a dark circle in the bottom-left with "T1", "T2" or "T3" in yellow.
- **Energy badge** (energy-cost generators): a blue circle with "⚡" in the bottom-right.
- **Charge pill** (charge-based animal buildings): a dark pill along the bottom showing "⚡ n/cap".
- **Ready badges** in the top-right: a green "✓" when a daily payout is ready, or a yellow "▲" when an upgrade is ready.

Keep the bottom-left, bottom-right and top-right corners free of crucial detail.

### 8.4 Catalogue

Every building is drawn front-on with a slight top-down feel, standing on the ground line at the bottom of its footprint.

| ID | Name | Footprint | Zone | Role | Look |
|---|---|---|---|---|---|
| `bld_welcome_dock` | Welcome Dock | 3 × 1 | 1 | Story start; the boat arrives here | A **long wooden pier** of planks across the whole width, on **four posts** going down into the water. A **small wooden crate** sits at the right, a **coiled rope** swags between posts, and a **lamp post** with a glowing yellow lamp and soft halo stands near the middle. |
| `bld_cottage` | Marlene's Cottage | 3 × 2 | 1 | Home base: +4 storage slots, daily reward chest | A **cosy cottage** with cream walls (`#f4e3c0`) and an **orange-terracotta roof**: a roof beam, a brown door with a gold knob, a big cross-paned window with a **flower box** of red, yellow and pink flowers, two small windows, and a **brick chimney** with a curl of smoke. The player's home: warm and inviting. |
| `bld_lumber_yard` | Lumber Yard | 2 × 2 | 2 | Generator: lumber and fibre (energy) | A **wooden shed** with a dark peaked roof and plank lines on the left, a **stack of four logs** with cream ends on the right, and an **axe** leaning on a post between them. |
| `bld_hen_house` | Hen House | 2 × 2 | 3 | Generator: chickens and eggs (charges) | A **red barn-style coop** (`#d9533f`) with a brown peaked roof, a **cream arched pop-hole door**, a little **ramp** with cleats, a cream window, and a **white hen** with a yellow chick in front at the left. |
| `bld_market_stall` | Market Stall | 2 × 1 | 3 | Trade dock tier 1 (opens Trade Dock) | A **wooden market stall** on two posts with a **red-and-white striped awning** and a scalloped red valance, a counter with **five fruits** (orange, red, green, yellow, pink), and a cream sign with a **"$"**. |
| `bld_stone_quarry` | Stone Quarry | 3 × 2 | 4 | Generator: stone (energy) | A **grey rock face** sloping from the left up to a peak and down to the right, with a lighter upper face, **four cut stone blocks** stacked around, a **pickaxe** leaning on the right and a red brick. |
| `bld_kitchen_hearth` | Kitchen Hearth | 2 × 2 | 4 | Generator: meals; drag meals here to eat for energy | A **warm stone-walled kitchen** in tan stone with course lines and a terracotta peaked roof. A big arched **fireplace opening** in the middle glows orange-yellow, and a **chimney** puffs **two smoke curls**. |
| `bld_cow_shed` | Cow Shed | 3 × 2 | 5 | Generator: cows and dairy (charges) | A **classic red barn**: a wide red body, a brown gambrel-style roof with a lighter inner gable, **big cream barn doors with a red X-brace**, a cream loft window and a dark foundation strip. |
| `bld_fishing_dock` | Fishing Dock | 3 × 1 | 5 | Generator: sea life and shells (energy) | A **wooden pier** on posts with a **fishing rod** angled up at the right and its line dropping into the water, a **wooden crate**, a **red rowing boat** upside down on the planks, and a **pink fish** on the deck. |
| `bld_juice_stand` | Juice Stand | 2 × 1 | 6 | Generator: drinks (energy) | An **orange kiosk** with a **teal-and-white striped awning** and a teal valance, a cream counter, and **four glass jars** of juice (orange, green, purple, pink). |
| `bld_windmill` | Windmill | 2 × 2 | 6 | Perk: energy regenerates 10 % faster | A **cream tower windmill** tapering upward with a shaded side, a red conical cap, an arched brown door, a small window, and **four cream sails** on a hub. *Animation request:* the sails should be a **separate sprite** (`building/bld_windmill/sails`) so the engine can rotate them slowly. |
| `bld_beach_cafe` | Beach Cafe | 3 × 2 | 6 | Daily coin payout | A **cream beach cafe** with a **teal roof**, a brown door, a big window with a counter shelf, a white **"CAFE" sign** in teal letters, and a red **beach umbrella** on a pole at the front left. |
| `bld_goat_pen` | Goat Pen | 3 × 2 | 7 | Generator: goats (charges) | A **grassy fenced paddock**: a green ground patch, a **row of twelve fence posts** with two rails, a small **wooden goat shelter** with a peaked roof at the right, and a **hay pile**. |
| `bld_cliff_bridge` | Cliff Bridge | 4 × 1 | 7 | Story landmark: connects to the Shrine Grove | Two **grey-green cliff edges** at the far left and right, joined by a **sagging rope-and-plank suspension bridge**: fifteen planks along a curved rope with vertical hangers, and a top hand-rope. |
| `bld_spirit_shrine` | Spirit Shrine | 3 × 3 | 8 | Generator: Spirit Amulets (energy) | A **Japanese-style shrine gate (torii)**: two **red pillars**, a red lower beam, a **dark curved top beam**, and a dark plaque. In the middle a **glowing mint spirit orb** with two tiny dot eyes (the same spirit as Spirit Wisp). Two **stone lanterns** with warm lights stand at the sides, on **two grey stone steps**, with sparkles. |
| `bld_nest_of_wonders` | Nest of Wonders | 2 × 2 | 9 | Generator: Pet Eggs (charges) | A **big tree**: a thick trunk and six large leaves, holding a **huge woven twig nest** with **three pastel eggs** (peach, lavender, sky blue) and sparkles. Magical and whimsical. |
| `bld_museum` | Museum | 3 × 3 | 9 | Shows relics found in chests | A **classical museum**: a stepped grey base, **six white columns**, a cream **triangular pediment** with a gold round emblem, and a **brown door** with a **gold star**. |
| `bld_lighthouse` | Lighthouse | 2 × 2 | 10 | Perk: gift balloons 20 % more often | A **white lighthouse** with **two red bands**, a dark lamp room with a **bright yellow window**, a red cone roof, an arched door, and **two pale-yellow light beams** shining left and right. *Animation request:* beams as a separate sprite (`building/bld_lighthouse/beams`) so they can rotate or pulse. |
| `bld_greenhouse` | Greenhouse | 3 × 2 | 10 | Perk: shimmer chance +1 % | A **glass greenhouse**: translucent pale-blue panes in grey frames, a glass gable roof, and **six plants** inside (green leaves with red, yellow and purple flowers), on a wooden sill. |
| `bld_aquarium` | Aquarium | 3 × 3 | 11 | Shows sea life; fish pay coins daily | A **domed glass aquarium** on a grey stone base: translucent pale-blue dome, deeper blue water inside, **three fish** (orange, yellow, pink), **two coral fronds** (pink, teal) and a brown entrance door. |
| `bld_harbor` | Harbor | 4 × 2 | 11 | Upgrades the boat: free weekly ticket, world map | A **long harbour pier** on posts with **two moored sailboats** (red hull and teal hull, cream sails), a **crane** with a hanging cargo crate, and a wooden shed. |
| `bld_great_temple` | Great Temple | 4 × 4 | 12 | Finale: holds six Island Amulets; opens the Sun Gate | The **grand finale building**: **three stepped grey-white platforms**, **six tall white columns**, a cream **pediment** with a **golden sun emblem** (disc and eight rays, with a glow), a **dark arched doorway** with a **mint spirit glow**, and sparkles. It should feel monumental and sacred: the biggest, most impressive sprite in the game. |

### 8.5 Building feedback (engine)

- **Built**: a gold particle burst and a ring at the building, and the camera centres on it.
- **Delivering an item to a site**: a small green particle puff (`#9be37f`).
- A **green glowing outline** around the footprint while a suitable item is dragged over it.

---

## 9. Residents and guides

### 9.1 Portraits

**What they are.** The island's characters. **Residents** live on the home island, give quests and requests and appear in dialogue. **Guides** lead each expedition island.

**Where they appear.**
- **Dialogue panels** (speech bubble with a face): 56–80 CSS px.
- **Quest tracker cards** on the left of the HUD: 36 CSS px.
- **On the board** as a round token (9.3).
- Arrival popups ("A new neighbour!").

**Format.** A **head-and-shoulders bust**, facing the viewer, in a 100 × 100 design square:

- Shoulders and outfit fill the bottom (y 72–100) and run off the bottom edge, with a V-neck collar in a lighter shade.
- The neck is at (50, 64–78).
- The head is an oval centred at (50, 46) with radii 24 × 26, with ears at the sides.
- Eyes at (40, 46) and (60, 46): dark, round, with a white catch-light. Eyebrows sit above the eyes.
- Two **rosy blush** ellipses on the cheeks.
- The mouth is at y ≈ 60.

The portrait is shown **clipped to a circle** of radius 41 % of the cell, so keep the face inside the central circle.

**Expressions.** Four frames per character, all used in the game:

| Expression | Eyes | Brows | Mouth | Extra | Used when |
|---|---|---|---|---|---|
| `neutral` | normal size | level | short flat line | none | default dialogue |
| `happy` | slightly smaller (smiling) | raised a little | **smile** curve | none | resident on the board, guide tokens |
| `worried` | slightly larger | **slanted up in the middle** | **frown** curve | a light-blue **sweat drop** at the right temple | sad or troubled lines |
| `excited` | larger | raised high | **open mouth** (dark with pink tongue) | none | quest complete, waiting for a delivery, new arrival |

**Sprite IDs:** `portrait/<id>/<expression>`.

### 9.2 Characters

Skin, hair, outfit and accent colours come from `data/residents.json`. Hair, hats and glasses are drawn per character (`paintResident` in `js/view/world-art.js`).

| ID | Name | Role | Skin | Hair | Outfit | Accent | Distinguishing features |
|---|---|---|---|---|---|---|---|
| `marlene` | Marlene Reyes | Protagonist; the player's guide and friend | `#e2a07a` | `#b8431f` auburn | `#2a9d8f` teal | `#f4d35e` | **Long auburn hair** flowing down behind the shoulders, with a side-swept fringe. Warm, capable, friendly. |
| `beni` | Captain Beni | Ferry captain; first quest giver; the tutorial host | `#c98a5e` | `#d8d8d8` grey | `#264653` navy | `#e9c46a` | A **full white beard** and moustache, a **white captain's cap** with a navy band and brim and a **gold badge**. Grandfatherly and jolly. |
| `mateo` | Mateo | Carpenter | `#b9774c` | `#3b2a20` dark brown | `#e76f51` terracotta | `#f4a261` | **Short dark hair**, a **short beard**, an **orange cap** with a brim to the right. |
| `tala` | Tala | Healer | `#a8683f` | `#1f1a17` black | `#6a994e` leaf green | `#f2e8cf` | Black hair in a **top bun**, **round glasses**. Calm and wise. |
| `rosa` | Nonna Rosa | Cook | `#e9b78d` | `#bfbfbf` grey | `#d62828` red | `#fcbf49` | Grey hair, a **tall puffy white chef's hat**. A grandmother cook. |
| `kai` | Kai | Young fisher | `#c58c63` | `#2b2118` dark | `#00b4d8` sky blue | `#ffd166` | A young teen with a fuller fringe and a **red headband** with tied ends flying to the right. Energetic. |
| `victor` | Victor Crane | Resort developer | `#e7b894` | `#2d2d2d` | `#f8f9fa` white suit | `#adb5bd` | Short hair, a **short beard**, a **yellow hard hat**, and a grey band across the chest (tie or lanyard). |
| `okoye` | Dr. Imani Okoye | Vet and naturalist | `#8d5a3b` | `#17110d` | `#8ac926` lime green | `#ffffff` | A **tan safari hat** with a white band, a chest strap. Also the Frostfin Isle guide. |
| `lena` | Lena | Archaeologist | `#f0c3a0` | `#6a3b1b` brown | `#9d6b53` khaki-brown | `#ffca3a` | Brown hair with a **side bun** and side locks, **round glasses**, a **pale explorer's pith hat**. |
| `rook` | Captain Rook | Guide: Pirate Cove | `#b9774c` | `#3b2a20` | `#8b1e3f` crimson | `#f4d35e` | *Currently drawn with the generic fallback (short hair, no hat).* **Design request:** a friendly pirate captain: **tricorn hat**, gold trim, maybe an eyepatch, cheerful. |
| `luma` | Luma | Guide: Lantern Isle | `#e2b48a` | `#5b3a8a` purple | `#3a2c6b` indigo | `#ffd23f` | *Currently the generic fallback.* **Design request:** a **lantern keeper**: purple hair, a starry indigo hood or shawl, and a small glowing lantern or star hair pin. |
| `ember` | Ember | Guide: Dragon Peak | `#e8602c` orange | `#ffb347` | `#c43d12` | `#ffd23f` | *Currently drawn as a human face with orange skin.* **Design request:** a **baby dragon** character portrait in the style of the Dragon family (5.26): orange, big eyes, little horns. Same four expressions. |

Rosa also guides **Sugar Cay**, Kai guides **Coral Atoll**, and Okoye guides **Frostfin Isle**.

### 9.3 Resident token on the board

A resident who has arrived appears on their home cell as a **round token**:

- A white disc (75 % opacity) of radius 43 % of the cell, with a **3-unit ring in the resident's outfit colour**.
- The `happy` portrait clipped to a circle inside it. The portrait switches to `excited` when the resident has an active quest.
- The whole token **bobs** ±2 units (≈ 3.1 s period).
- A **red "!" badge** (circle `#ff5a5f`, white outline) in the top-right when the resident wants something.
- When an item is delivered: **pink heart particles** (`#ff9ec7`) and a floating **"♥"**.

*Optional deliverable:* a dedicated `token/<id>` (256 × 256 round badge) if the team prefers a full-body chibi figure or a framed badge to a clipped portrait. Keep it readable at 40 px.

---

## 10. Board structures

### 10.1 Living slots (home island)

| ID | Name | Purpose | Look |
|---|---|---|---|
| `struct/soil` | Fertile Soil | Drop a fully grown crop here and it keeps producing items over time. | A **rounded patch of tilled dark soil**: an outer brown ring `#7a5236`, a darker inner bed `#5e3f25`, and four lighter furrow marks. |
| `struct/perch` | Animal Perch | Move a top-level animal here (hen, cow, goat) and it keeps producing. | A **wooden feeding platform**: a low plank box on a dirt patch with three slats, and a **straw or hay bedding** curve on top. |

When occupied, the **item sprite is drawn on top**, 10 % higher than the cell centre, with no pips. A **green number badge** shows how many products are waiting.

### 10.2 Expedition-island fixtures

These appear only on expedition islands (`drawStruct` in `js/view/renderer.js`).

| ID | Name | Island | Purpose | Current look | Request |
|---|---|---|---|---|---|
| `struct/islandgen` | Island generator | all | The island's free generator. It uses **island charges** instead of energy. | A Seed Pouch (or a Toolbox on the ice island) on a white disc, **pulsing** in size (±4 %), with a dark **charge pill** "⚡ n/cap" below. | A themed generator per island: pirate treasure sack, volcanic egg basket, ice box, candy jar, lantern basket, shell basket. Sprite IDs `struct/islandgen/<palette>`. |
| `struct/guide` | Island guide | all | The guide character. | The guide's `happy` portrait in a round token. | Uses the portraits (9.2). |
| `struct/pool` | Tide pool | Coral Atoll | Fill it by delivering items. | **Empty:** a dark-blue oval (`#3a8fb7`) with a dark rim and a white **"?"**. **Filled:** a bright-blue oval (`#5bc0eb`) with a pale rim and **three white bubbles** circling. | Rock-ringed tide pool, empty (dry sand and pebbles) and filled (sparkling water with a starfish). |
| `struct/vent` | Lava vent | Dragon Peak | Produces items over time; tap to collect. | A **dark oval crater** with an orange rim and a **pulsing orange glow** inside; an orange number badge for stored items. | Volcanic vent with glowing magma and a heat shimmer; idle and active frames. |

### 10.3 Darkness overlay (Lantern Isle)

On Lantern Isle, unlit land cells are covered with **deep navy** `rgba(10,14,40,0.82)` with a **28-unit feathered (blurred) edge**, so the darkness has soft edges. Items in dark cells are hidden, and obstacles there are drawn at 50 % opacity. Lighting areas with lanterns reveals the island. *Optional deliverable:* a soft-edged "light pool" sprite (512 × 512 radial) for lit areas.

---

## 11. Terrain

The island is **not** built from tiles. At load time the game **generates one picture** of the whole island from the grid of land cells (`buildIsland` in `js/view/island-art.js`). The result is a smooth, organic coastline with shallow water, wet sand, a beach, and grass biomes that blend into each other. The item grid stays square underneath and is shown by faint rounded cell markers.

Because this picture is computed, terrain is the area **where we least need sprite sheets**. What we need from the art team is **textures and colour targets** that the generator can use (11.3), plus the sea.

### 11.1 Open sea (background)

- Fills the screen behind everything: a **vertical gradient** from turquoise `#3fc1d1` (top) to deeper `#2a9fc2` (bottom).
- Over it, a grid of short **white wave strokes** (22 % opacity, roughly every 90 units). Each stroke is a small arc like a "~", and they **drift with the camera** at 60 % parallax and **bob** slowly.
- **Night variant** (Lantern Isle): navy gradient `#1d2a52` → `#101a38`, with pale-blue strokes at 18 %.
- *Deliverable:* `terrain/sea_day` and `terrain/sea_night`, 512 × 512 **seamless tiles** of open water in the flat storybook style (gentle colour variation, a few wave marks). The engine will scroll them with parallax. Optionally also `terrain/wave_mark` sprites (3 to 4 variants, 64 × 32) to scatter and animate.

### 11.2 Island base (generated) and shoreline

From the open sea inward, the generated island has these bands:

1. **Shallow water**: a turquoise band hugging the coast, from mid sea blue (`rgb(40,184,208)`) at the outer edge to a bright lagoon colour (`rgb(150,240,226)`) at the beach, with soft noise. Its outer edge fades into the open sea.
2. **Waterline** (fixed level): **wet sand** `rgb(214,190,130)` blending quickly to **dry sand** `rgb(247,230,174)`.
3. **Beach** band, then a soft blend into **grass**, whose colour comes from the **zone theme** of the nearest land cell (11.3). Biome colours are blurred so neighbouring zones blend smoothly, with gentle brightness noise.
4. **Islets**: a few tiny sandbar islands are scattered out at sea for charm.
5. **Cell markers**: every land cell gets a faint **rounded square** (white 5 % fill, dark-green 10 % outline) so players see the grid.

**Animated shoreline** (drawn every frame):
- A **slow swell**: a wide, very faint white band in the shallows that pulses.
- **Two wave fronts** rolling in toward the beach, thickening and fading as they "break" (6.5 s cycle).
- A **standing foam line** at the waterline: a bright white core (5 units) with a softer, wider halo (15 units) that "breathes".

**Palettes per island** (beach dry and wet, water mid and bright, which trees grow, scenery tint):

| Palette | Used by | Beach (dry / wet) | Water (mid / bright) | Trees | Tint |
|---|---|---|---|---|---|
| `home` | Home island | `#f7e6ae` / `#d6be82` | `#28b8d0` / `#96f0e2` | palms (mostly), round trees | default |
| `lagoon` | Coral Atoll | same as home | same as home | palms, reeds | default |
| `pirate` | Pirate Cove | `#eed096` / `#c8a66c` | `#28b0c8` / `#8ce2d6` | palms, rocks | default |
| `volcano` | Dragon Peak | dark ash `#605250` / `#423636` | `#2c788c` / `#6ebebe` | dead trees, rocks | ash |
| `ice` | Frostfin Isle | snow `#f4fbff` / `#cde4f2` | `#60b8e2` / `#d2f4ff` | snowy pines, rocks | snow |
| `candy` | Sugar Cay | pink sugar `#ffecf6` / `#f0c8e0` | `#6ec4ec` / `#c8ecff` | lollipop trees, bushes | pink |
| `night` | Lantern Isle | `#6e7db9` / `#505c96` | `#1c326e` / `#4664aa` | glowing mushrooms, dead trees, rocks | night |

*Optional deliverables:* `terrain/sand_<palette>` and `terrain/shallows_<palette>`, 512 × 512 seamless textures. The generator would multiply or overlay them for subtle grain. Keep them low-contrast so items stay readable on top.

### 11.3 Zone themes (grass biomes)

Each of the 12 home-island zones has a theme. The theme's main colour tints the grass, and its "deco" sets which small ground details are scattered inside cells (section 12). The other five themes are used by expedition-island palettes.

| Theme | Used by | Grass colours (a / b) | Ground details |
|---|---|---|---|
| `cove` | Zone 1 Shipwreck Cove | sandy `#f2dfa6` / `#ead291` | shells |
| `farm` | Zone 2 Overgrown Farmstead | `#a5cf6a` / `#97c45c` | grass tufts (furrows) |
| `meadow` | Zone 3 Hen Meadow and Market Row | bright `#82d66e` / `#72c860` | flowers, tufts |
| `creek` | Zone 4 Stonebrook | `#86cb8e` / `#76bd80` | pebbles, tufts |
| `lagoon` | Zone 5 Lagoon Bend | sand `#ecdfaa` / aqua `#9ad9dc` | shells, tufts |
| `orchard` | Zone 6 Mango Orchard and Sunset Beach | `#a8d674` / `#98c864` | tufts (fallen leaves) |
| `hills` | Zone 7 Goat Hills | dry `#bccb80` / `#aabb70` | pebbles, tufts |
| `shrine` | Zone 8 Whispering Shrine Grove | mossy `#72b283` / `#62a274` | tufts (moss) |
| `hollow` | Zone 9 Wonder Hollow | lavender `#9a90d0` / `#8a80c0` | tiny glowing stars |
| `cliffs` | Zone 10 Lantern Cliffs | sage grey `#b2c0a8` / `#a2b298` | pebbles, tufts |
| `harbor` | Zone 11 Coral Harbor | planked `#cfaa70` / `#be9a60` | none (boardwalk) |
| `temple` | Zone 12 Temple Heights | stone tile `#ddd3ac` / `#cec49e` | none (paving) |
| `pirate` | Pirate Cove | `#d2a870` / `#c29860` | none (planks) |
| `volcano` | Dragon Peak | ash `#75625f` / `#655452` | glowing lava cracks |
| `ice` | Frostfin Isle | `#e6f6ff` / `#d2ecfa` | ice crystals |
| `candy` | Sugar Cay | `#ffd6ec` / `#ffc5e2` | sprinkles |
| `night` | Lantern Isle | `#41528a` / `#384878` | tiny stars |

*Optional deliverable:* `terrain/ground_<theme>`, a 512 × 512 **seamless, low-contrast** texture per theme (17 total) carrying that biome's character: wood planks for `harbor` and `pirate`, paving slabs for `temple`, soft grass for the meadow themes. The engine would blend them by the same biome mask.

---

## 12. Island scenery (decor)

**What it is.** Purely decorative scenery scattered by the island generator: trees and bushes on the beach and grass edges around the coast, plus tiny ground details inside cells. It never blocks gameplay. Items are drawn on top of the in-cell details, so those are kept tiny and low.

**Current implementation.** `js/view/island-decor.js`. Each piece is painted once into a 128 px canvas, then drawn sorted by depth (base y). Some pieces **sway** in the breeze: the engine rotates them around their base. Some have a **soft oval ground shadow**.

**Anchoring.** The **base point** (where it touches the ground) is at the **bottom centre**: in the 100-unit design square, x = 50 and y ≈ 90. The engine draws the sprite at `size × cell`, with its bottom 10 % below the base point.

### 12.1 Catalogue

| Kind | Size (× cell) | Sway (radians) | Shadow | Variants | Look |
|---|---|---|---|---|---|
| `palm` | 1.55 | 0.035 | yes | 3 **lean** directions: left, slight right, right (it leans toward the sea) | A **coconut palm**: a curved tan trunk with ring marks and a lighter inner stripe, **eight long arching fronds** in two greens, and two coconuts under the crown. |
| `tree` | 1.2 | 0.015 | yes | 2 green shades | A **round leafy tree**: a short brown trunk, a canopy of four overlapping green circles, a shine and **three red fruits**. |
| `pine` | 1.25 | 0.01 | yes | none | A **snowy pine**: three stacked green triangles, each with a **white snow cap**, and a brown trunk. |
| `lolli` | 1.05 | 0.02 | yes | 3 colours: pink, blue, yellow | A **giant lollipop tree**: a white stick and a round candy with a **white spiral** swirl. |
| `dead` | 1.05 | 0.006 | yes | none | A **bare, twisted dark-grey tree** with three branches. Spooky-cute, never scary. |
| `mush` | 0.7 | 0.01 | yes | 3 cap colours: blue, purple, teal | A **glowing mushroom**: a pale stem and a big rounded cap with white spots and a shine. |
| `bush` | 0.62 | 0.02 | yes | 4 flower arrangements | A **round green bush** of overlapping circles; in the default tint it is dotted with **four small flowers** (white, yellow, pink, lilac). |
| `reed` | 0.62 | 0.05 | no | none | **Six tall reeds** with **brown cattail heads** on every other stalk. |
| `rock` | 0.5 | none | yes | 2 | A **rounded grey rock** with a lighter top face and a crack. |
| `tuft` | 0.3 | 0.05 | no | 4 | A small **grass tuft** of six blades fanning up. |
| `flower` | 0.28 | 0.05 | no | 4 colours: white, yellow, pink, lilac | A **single small flower**: a green stem, five round petals and a yellow-orange centre. |
| `shell` | 0.24 | none | no | 3 colours: cream, peach, lilac | A **tiny scallop shell** with ribs. |
| `pebble` | 0.24 | none | no | 1 | **Two small grey pebbles**. |
| `star` | 0.2 | none | no | 1 | A **tiny pale-yellow sparkle** on the ground (magic and night biomes). |
| `crystal` | 0.3 | none | no | 1 | A **small ice crystal** shard, pale blue. |
| `sprinkle` | 0.22 | none | no | 4 colours: blue, yellow, green, white | A single **candy sprinkle** (a rounded dash). |
| `crack` | 0.34 | none | no | 1 | A **glowing orange lava crack** (zig-zag) in the ground. |

### 12.2 Palette tints

Some scenery is repainted for the island palette: `palm`, `bush`, `tuft` and `rock` come in five tints. `default` is the tropical greens and greys. `pink` is candy-pink foliage and pink-grey rocks. `snow` is frosted pale blue-white foliage and blue-grey rocks. `night` is indigo-blue foliage and dusky rocks. `ash` is ashen brown-grey foliage and dark rocks.

**Sprite IDs:** `decor/<kind>/<variant>` and, for tinted kinds, `decor/<kind>/<variant>/<tint>`.

### 12.3 Animation

Sway is a sine rotation around the base: angle = sway × sin(1.4 t + random phase). No frames are needed. If the team prefers **frame-based sway** for palms (fronds moving independently), deliver 4–6 loop frames per palm variant: `decor/palm/<v>/f0`…`f5`.

---

## 13. Fog and zone signs

### 13.1 Fog bank

**What it is.** Land that is not unlocked yet is hidden under a **bank of soft clouds**. Two kinds exist:

- **Kind 1, locked zone:** cool white-blue cloud, base `rgb(226,236,244)`, highlights white, shadows `rgb(196,214,230)`.
- **Kind 2, hidden pocket:** small patches revealed on level-up; **lavender** cloud, base `rgb(150,130,200)`, highlights `rgb(190,170,235)`, shadows `rgb(118,100,168)`.

**How it's drawn.** The fog is baked into one large image: fully fogged cells are filled with a **seamless cloud texture**. Edges facing open land become **scalloped**: rows of overlapping circles (3 per cell edge) that look like puffy cloud bumps. Edges facing the sea **billow outward** past the coast with larger circles. A slightly larger, translucent copy of the circles forms a **soft glowing halo** around the bank. The bank is drawn at 96 % opacity and **drifts** a few units in a slow loop.

**Deliverables:**
- `fog/tile_1` and `fog/tile_2`: 512 × 512 **seamless** soft cloud textures in the two palettes (fluffy cumulus feel, gentle internal shading, no hard edges).
- *Optional:* `fog/puff_1` and `fog/puff_2`, 3 variants each (256 × 256): individual cloud-puff shapes with soft edges, to replace the plain scallop circles at the edge of the bank.

### 13.2 Unlock reveal

When a zone is unlocked, the fog is re-baked without it. Sparkle bursts (14 random cells, pale yellow `#fff6a8`) play over the zone and the camera pans to it. *Optional deliverable:* a "cloud parting" effect sheet (8 frames, 512 × 512) of puffs drifting apart and fading.

### 13.3 Zone signs

A **sign card** is drawn in screen space over the centre of each locked zone:
- A white rounded card, 150 × 56 (or 150 × 78 for the next unlockable zone, at 94 % opacity with an **orange border** `#ffb347`). Other zones get a grey border at 72 % opacity.
- A **padlock icon** (`icon/lock`) at the top-left, "Zone N" in bold, and the zone name below.
- On the next zone, one more line: "Tap to unlock!" in green when all requirements are met, otherwise "Lv X · N amulets · Nc" in red.

These are HTML-style text on a card. Optionally deliver a decorative **wooden signpost frame** (`ui/zone_sign`, 9-slice-able, 512 × 256) to replace the plain white card.

---

## 14. Gift balloons

**What they are.** Every few minutes **one to three balloons** float down from the sky, each carrying a **gift box**. When one lands, the balloon **pops** and the gift stays on the ground, glowing, until the player taps it for a small reward.

**Current look** (`drawDrops` in `js/view/renderer.js`):
- **Balloon:** an upright oval (radii 46 % × 56 % of a cell) with a radial gradient (light at the upper left), a small triangular knot at the bottom, an outline and a white shine. Colours cycle through **red `#ff5a5f`, orange `#ffb347`, sky blue `#5bc0eb`, green `#9be37f`, purple `#c58bff`**.
- **String:** a thin dark line down to the gift.
- **Gift:** the `icon/gift` art at 80 % of a cell: a **red box** with a lighter lid band, a **yellow ribbon** and a **yellow bow**.
- **Falling:** about 10 s from 12 cells above. The balloon **sways** side to side and **tilts**, slowing toward the ground. The landing spot's **shadow** grows as it nears.
- **Landing:** a quick **squash** (0.18 s), one small **hop**, and the balloon **swells 35 % and vanishes** (0.14 s). Coloured **confetti scraps** (balloon colour and white) burst out, with a puff of **sand dust** and a white ring.
- **Waiting gift:** a **pulsing pale-gold glow** under it, a soft shadow, and a twinkling sparkle at its top-right.

**Deliverables:**
- `balloon/<colour>` ×5 (256 × 320): balloon with knot and shine, **no string** (the engine draws the string).
- `gift/box` (256 × 256), which can share art with `icon/gift`.
- *Optional:* `balloon/pop`, 4–6 frames of a balloon bursting into scraps (any colour; the engine can tint a white version).

---

## 15. Effects, particles and feedback

All of these are **drawn procedurally** by the engine (`js/view/renderer.js`, `js/view/app.js`). They are listed so the art team can supply **optional sprites** that match the new style. If none are supplied, the procedural versions stay. Under the **Reduce Motion** setting, particles are cut to a few and no shaking or bobbing happens.

### 15.1 Particles

| Effect | Shape | Colour(s) | Trigger |
|---|---|---|---|
| Burst | Mix of **8-point stars** and **round dots** (3–7 units), flying outward and falling with gravity, fading over 0.5–0.9 s | Varies by event, see below | Most events |
| Merge burst | as Burst, 10 + 2 × level particles | Pale yellow `#fff6a8` (levels 1–4), white (5–6), sky blue `#7fd0ff` (7–8), gold `#ffd54a` (9+) | Every merge |
| Spawn puff | 6 small white particles | white | Tapping a generator |
| Collect | 16 particles + floating "+N" | Coins gold `#ffd54a`, energy cyan `#7be0ff`, pearls lilac `#e6c8ff`, amulets and tickets gold | Tapping a coin, spark or pearl item |
| Chest open | 28 big gold particles + gold ring | `#ffd54a` | Opening a chest |
| Obstacle hit | 6 leafy particles | `#b8e6a0` | Each tool hit |
| Obstacle cleared | 18 sandy particles + white ring | `#e0c288` | Obstacle removed |
| Delivered | 12 pink particles + floating "♥" | `#ff9ec7`, `#ff6b9d` | Item given to a resident |
| Build or deliver to site | small green puff | `#9be37f` | Item delivered to a site |
| Shimmer item appears | 8 pale-yellow particles | `#fff6a8` | A shimmering item spawns |
| Balloon pop | 18 confetti dots + 7 dust dots | balloon colour and white; dust `#e8d6a8` | Gift balloon lands |

*Optional deliverable:* `fx/star`, `fx/dot`, `fx/leaf`, `fx/heart`, `fx/confetti` and `fx/sparkle` particle sprites (64 × 64, white or neutral so the engine can tint them).

### 15.2 Rings

An **expanding circle outline** that thins and fades over about 0.6 s, eased out. It is white or coloured and is used for big merges (4+ items or level 5+), chest opening, clearing, building and balloon pops. *Optional:* `fx/ring` (a 256 × 256 soft ring, tintable).

### 15.3 Floating text

Bold rounded numbers or words with a dark outline that **rise about 46 units and fade** over 1.1 s: "+25" (coins, in gold), "+5" (energy, in cyan), "♥", "Bonus ×2!" (green, 4-item merge), "Mega ×3!" (gold, 5+ items), "Magnet ×N!" (pink-red). The font is the game's rounded system UI font; no art needed.

### 15.4 Item motion (procedural)

| Motion | Description |
|---|---|
| **Flight** | When items merge, the other items **fly into the target cell** along a short arc (0.2 s, or 0.42 s with the magnet), shrinking 25 % and fading at the end. New items from generators and chests **fly out** from their source to their cell. |
| **Merge pop** | The new item scales from 40 % with an **overshoot bounce** (0.4 s). |
| **Pop-in** | Newly placed items scale up with a small overshoot and fade in (0.3 s). |
| **Bounce** | A small upward hop (12 units) when an item is moved or a generator is tapped. |
| **Shake** | Horizontal wobble when a drop is invalid or an obstacle is hit. |
| **Screen shake** | A small camera shake on big merges (level 7+), tool hits, and the pirate cannon. |
| **Selected** | With "tap to move" on, the selected item lifts 4 units over a **pale-yellow halo** disc. |

### 15.5 Highlights and drag feedback

- **Hint**: when the player is idle, a possible merge is shown with **glowing pale-yellow rounded outlines** on the cells (pulsing, with a soft glow), and a **👆 pointing-hand emoji** slides from one item to the other. *Optional deliverable:* `ui/hand_pointer` (128 × 128) to replace the emoji.
- **Magnet targets**: cells the magnet can pull are outlined in **pulsing pink-red** with a light pink fill.
- **While dragging**: the carried item is drawn at 115 % size about 40 px above the finger, with a soft dark oval shadow. Drop-target outlines:
  - **Green glow** when the drop merges, clears an obstacle or feeds a building or resident. A green "×N" badge shows how many items the merge will make.
  - **Red outline** when the drop is not allowed.
  - **Dashed white** for a plain move or swap.
- **Keyboard cursor**: a white dashed rectangle with an inner teal line on the focused cell.

### 15.6 HUD effects (HTML and CSS)

Counters "bump" (scale) when they change, a "Chain ×N" tag appears for cascades, and toasts slide in at the top. These use CSS; no art needed.

---

## 16. UI icons, app icons and splash

### 16.1 UI icons

Small symbols used across the HUD and panels, currently drawn in the same storybook style and shown as 64 px images. They appear at **16–64 CSS px** (the coin counter, buttons, reward pills, the right-hand button rail). **Sprite IDs:** `icon/<name>`, 128 × 128, centred, with about 6 % padding. They must read at 16 px.

| Name | Used for | Current look |
|---|---|---|
| `coin` | Coins counter, prices | A **gold coin** with an inner ring, a "$" and a shine. |
| `pearl` | Pearls counter, prices | A **pale pink-white pearl** with a big shine. |
| `energy` | Energy counter, refills | A **yellow lightning bolt** with a shine. |
| `amulet` | Amulet counter, zone requirements | A **gold pendant** with a teal centre and a pale four-pointed star, on a gold cord. |
| `ticket` | Tickets counter, expeditions | A **cream ticket** with a red stub and a red star. |
| `star` | XP, ready-to-build marker on sites | A **gold five-pointed star** with a shine. |
| `heart` | Affection / favourites | A **red heart** with a shine. |
| `lock` | Locked zone signs | A **gold padlock** with a silver shackle and a keyhole. |
| `quest` | Quests button | A **parchment scroll** with rolled wooden ends and text lines. |
| `shop` | Shop button | A **little shop front**: orange body, red-and-white awning, brown door. |
| `hammer` | Construction sites | A **hammer**: wooden handle, grey head, tilted. |
| `trade` | Trade Dock button | A **market stall** with a teal-and-white awning and three fruits. |
| `journal` | Journal button | A **blue book** with a darker spine, a gold medallion with a "✦", and a light line. |
| `pet` | Pets button | An **orange cat face and body** with pointed ears, dot eyes and a pink nose. |
| `map` | Expeditions button | A **folded treasure map** with a red X and a green dotted path. |
| `magnet` | Magnet button | A **red horseshoe magnet** with silver tips. |
| `gear` | Settings button | A **grey cog** with eight teeth and a pale centre. |
| `sell` | Sell button | A **teal circle** with a white "$". |
| `sound` | Sound settings | A **speaker** with two sound-wave arcs, pale grey. |
| `chest` | Chest rewards | A **gold treasure chest**. |
| `gift` | Gift balloons, gift rewards | A **red present** with a yellow ribbon and bow. |
| `sun` | Sun Gate | A **yellow sun** with ten orange rays. |
| `boat` | "Home" button on islands | A **sailboat**: brown hull, mast, two white sails. |

### 16.2 App icons

The app icon is already a PNG, rendered by `tools/make-icons.mjs` from game art. It shows a **sky-to-sea gradient** background (`#6fd8ee` → `#2a9fc2` → `#1d7a99`), a **glowing sun**, a **sandy island arc** at the bottom with **white wave lines**, a large **Pineapple Pyramid**, a **Ripe Mango**, a small **Green Banana** and **Brown Coconut**, and four white sparkles.

**Deliverables:**
- `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180), `favicon-32.png`.
- `icon-maskable-512.png`, with all important art inside the central **80 %** (Android safe zone).
- The design should be simple and bold enough to read at 32 px.

### 16.3 Splash and branding

The loading screen currently shows a **🌴 emoji** above the title "Tropical Merge" on a card. *Optional deliverables:* `ui/logo` (a wordmark or logo for the title, 1024 × 512, transparent) and `ui/splash_art` (a 1080 × 1920 portrait illustration of the island) for the loading screen.

### 16.4 Emoji currently used as graphics

The UI uses a few emoji in place of art. Each could optionally get a matching icon: 🌴 (splash, new zone popup), ⭐ (level-up popup), 🎉 (event card), 🎟 (event tokens), 🔥 (daily streak), ✨ (shimmer), 🏺 (relics), ❔ (unknown pet or relic), ⚡ (charge pills), 📺 (demo ad), 👆 (hint hand), ☀ (Sun Gate), ⛵ (set sail). If supplied, name them `icon/<word>`, e.g. `icon/token`, `icon/streak`, `icon/relic`.

---

## 17. Accessibility requirements

These apply to all deliverables:

1. **Silhouette first.** Every item level must be recognisable by **shape alone** (test in greyscale at 40 px). Players with colour-vision deficiency must still be able to match items.
2. **No colour-only differences between adjacent levels.** Where the current art relies on colour (Green and Ripe Banana; Green and Ripe Mango; the cow levels; toolbox levels), add a shape or detail difference.
3. **Contrast against the ground.** Items sit on sand, grass of many hues, wood planks, ice, pink candy and dark night ground. The dark outline must keep every item readable on all of them; avoid large areas of colour that match a biome without an outline.
4. **Motion.** Do not bake animation into static frames. The engine disables bobbing, swaying, shaking and most particles when **Reduce Motion** is on, so every sprite must look complete standing still.
5. **No flashing.** Optional animated effects must not flash more than 3 times per second.
6. **Text in sprites.** Avoid it. The game is localisable and sprite text cannot be translated.

---

## 18. Deliverables checklist and acceptance criteria

### 18.1 Required

| # | Set | Frames | Frame size | Section |
|---|---|---|---|---|
| 1 | Item sprites (all families, levels) | 255 + 24 pet species variants = **279** | 256 × 256 | 5 |
| 2 | Obstacles | **14** | 256 per cell | 7 |
| 3 | Buildings (built) | **22** | 256 per cell | 8 |
| 4 | Resident and guide portraits (12 characters × 4 expressions) | **48** | 256 × 256 | 9 |
| 5 | Living slots (soil, perch) | **2** | 256 × 256 | 10.1 |
| 6 | Island scenery (kinds × variants × tints) | **≈ 91** | 256 × 256 | 12 |
| 7 | Fog tiles (2 kinds, seamless) | **2** | 512 × 512 | 13.1 |
| 8 | Sea tiles (day and night, seamless) | **2** | 512 × 512 | 11.1 |
| 9 | Gift balloons (5 colours) and gift box | **6** | 256 × 320 / 256 × 256 | 14 |
| 10 | UI icons | **23** | 128 × 128 | 16.1 |
| 11 | App icons | **5** | 512, 192, 180, 32, 512 maskable | 16.2 |
| 12 | Layered source files for everything above | | 2× size | 3.1 |

### 18.2 Optional (nice to have)

| Set | Frames | Section |
|---|---|---|
| Construction-site frames per building | 22 | 8.2 |
| Windmill sails and lighthouse beams as separate parts | 2 | 8.4 |
| Obstacle damage states | 13 | 7.2 |
| Expedition-island generators, tide pools, lava vents | 6 + 2 + 2 | 10.2 |
| Glow-tier discs, shimmer sparkle (4 frames), shimmer ring, pips, ice overlay | ≈ 10 | 6 |
| Colour-blind family glyphs | 12 | 6.6 |
| Particle sprites, ring | 7 | 15.1, 15.2 |
| Ground textures per theme, sand and shallows textures | 17 + 14 | 11.2, 11.3 |
| Fog puffs and cloud-parting effect | 6 + 8 | 13 |
| Balloon pop animation | 4–6 | 14 |
| Zone sign frame, hand pointer, logo, splash art, emoji replacements | ≈ 17 | 13.3, 15.5, 16.3, 16.4 |
| Resident board tokens (full-body or framed) | 12 | 9.3 |
| Frame-animated palms | 18 | 12.3 |

### 18.3 Acceptance criteria

A delivery is accepted when:

1. **Every required sprite ID** listed in this document is present in an atlas JSON, spelled exactly as written.
2. Frames have the stated size, transparent background, straight alpha, and no stray semi-transparent pixels around the edges. Run a check on a black and a white background.
3. Items stay inside the safe area (3.3). Pips at the bottom and badges in the corners do not hide key detail.
4. The **level ladder reads clearly**: shown side by side, each family progresses from small and simple to large and precious, and no two adjacent levels share a silhouette.
5. The style is consistent across all sheets: the same outline colour and weight, light from the upper left, and soft shading.
6. The game looks right in the **phone-size check**: on a 390 × 844 screen at the default zoom, every item is identifiable at a glance on every biome ground colour.
7. No engine effect (glow, pips, shimmer, frozen ice, blueprint tint, badges) is painted into a sprite.

---

## 19. Notes for the integrating engineers

This section is for the internal team; the art team can skip it.

- **One swap point per category.**
  - Items: `getSprite(data, id, sp)` in `js/view/art.js`. Return the atlas frame instead of the painted canvas. `sp` is the pet species, giving frame `pet_0L/<sp>` for levels 3–6.
  - Obstacles: `getObstacleSprite`.
  - Buildings: `getBuildingSprite(id, w, h, state)`. Use `/site` if it exists; otherwise keep the blue tint.
  - Portraits: `getResidentPortrait(r, expr)`.
  - Living slots: `getStructSprite`.
  - Fog: `getFogTile`.
  - Icons: `iconCanvas` and `iconURL`.
  - Decor: `getDecor(kind, variant, tint)` in `js/view/island-decor.js`.
- **Keep the painters as fallbacks** while art arrives in batches: if a frame is missing from the atlas, call the existing procedural painter.
- **Overhang**: buildings with headroom need a draw offset from the atlas pivot (8.1).
- **Separate animated parts** (windmill sails, lighthouse beams) need a small addition in `drawStruct`.
- **Guides `rook`, `luma` and `ember`** are not in `data/residents.json` today. Panels use `FALLBACK_GUIDES` in `js/view/panels.js`, and the board's `guide` structure looks them up in `residents`, so those three do not appear as board tokens at all. Add them to the data when their portraits land.
- **Unused content**: the `dragon` family (zone 99 roost) and the `event_island` event template are in the data but not reachable. The dragon sprites are still listed in 5.26 for completeness.
- **Service worker**: new atlas files must be added to the cached file list (`tools/make-sw.mjs`, then `npm run build`) so the game still works offline.
- **Sprite memory**: today items are cached at 192 px. At 256 px, 279 item frames in one 4096 atlas fit about 15 × 15 = 225 frames per page, so plan for two item atlas pages.

---

## Appendix A: master palette

Colours that recur across the current art. Use them as the starting palette.

| Role | Hex |
|---|---|
| Outline (all shapes) | `#3a2a1e` |
| Ground shadow | `rgba(40,25,10,0.22)` |
| Sparkle fill | `#fff7c2` |
| Gold / treasure | `#ffd23f`, `#e6b422`, `#c9962b` |
| Honey wood | `#b9854f`, dark `#8a5d32`, light `#d9a05b`, pale `#efc27d` |
| Bark / log | `#a8713a`, `#7d4f24` |
| Leaf greens | `#4caf50`, `#2f8f45`, `#5fbf4f`, `#3b9a3a`, `#6bbf59`, `#7fd36b` |
| Stem green | `#5e8f3a` |
| Soil | `#7a5236`, dark `#5e3f25` |
| Steel | `#9aa5ad`, `#b9c5cd`, `#dfe6ea`, dark `#8d99a1` |
| Stone grey | `#9ca3a8`, `#8a8f98`, light `#bfc4c9` |
| Brick | `#c4693f` |
| Cream / parchment | `#f4e3b0`, `#fff1d6`, `#f4efe6` |
| Glass | `rgba(235,248,255,0.65)` |
| Accent red | `#e63946` |
| Accent pink | `#ff6b8a`, `#ff4d6d`, `#ff8fa3` |
| Accent orange | `#ff9f3c`, `#ffb347`, `#ff7a3c` |
| Accent teal | `#2ec4b6`, `#2a9d8f` |
| Accent purple | `#c77dff`, `#6a4c93` |
| Spirit mint | `#bff5ea`, `rgba(160,255,230,0.3)` |
| Sea (open) | `#3fc1d1` → `#2a9fc2` |
| UI teal (brand) | `#2a9fc2`, dark `#1d7a99` |
| UI ink | `#2f3b4a`, secondary `#5d6b7a` |
