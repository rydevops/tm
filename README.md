# Tropical Merge

A single-player, free-to-play merge-3 island restoration game. Merge matching items, clear the jungle,
build the town, meet the residents and restore six expedition islands. It is an installable PWA that
plays fully offline, in portrait or landscape, with touch, mouse or keyboard.

Everything is generated at runtime: **all art is drawn procedurally** on canvas and **all music and sound
effects are synthesised** with WebAudio. There are no image or audio files to download, and no server.
Saves live in the browser (IndexedDB with two rolling backups and a localStorage mirror).

## Play

```sh
node tools/serve.mjs 8080      # then open http://localhost:8080
```

Any static file server works; the game uses only relative paths, so it can live in a sub-folder.

### Deploy to GitHub Pages

1. Push this folder to a GitHub repository (branch `main`).
2. In **Settings → Pages**, publish from the `main` branch (root). Every runtime file is committed.
3. The workflow `.github/workflows/build.yml` runs on every push: it rebuilds the generated files
   (`data/*.json`, `sw.js`, `js/version.js`, `version.json`) and commits them back, then runs the tests.
   Without Node on your machine you never need to run the build yourself. (Locally: `npm run build`.)

### Updates and versions

* The version shown in game (small tag above the tray, and **Settings → About**) is `v<package.json version> · <build id>`.
  The build id is a content hash of every shipped file, so it changes on every deploy. Bump `version` in
  `package.json` for a human-friendly number.
* `sw.js` is **network-first**: online, every file is revalidated with the server, so a new deploy is used
  immediately and cannot get stuck in a cache. The cache is only an offline fallback.
* A running game polls `version.json` (never cached) every 5 minutes and whenever you return to the tab.
  If a newer build is deployed it saves, clears its caches and reloads itself once you pause (no panel open,
  nothing being dragged). **Settings → About → Check for updates** does the same on demand.

## Controls

| Action | Touch | Mouse | Keyboard |
| --- | --- | --- | --- |
| Pick up and merge | Drag an item, or tap it then tap the target | Drag, or click then click | Arrows move the cursor, **Space** picks up / drops |
| Tap / use generator / open | Tap | Click | **Enter** |
| Item info | Long press | Long press / **I** | **I** |
| Pan / zoom | Drag the ground / pinch | Drag / wheel | **WASD** / **+ −** , **0** resets |
| Hint | idle 8 s (20 s for a generator) | | **H** |

Accessibility options (Settings): text size up to 150%, colour patterns, reduce motion, haptics and sound
toggles, tap only (turns dragging off; tap-then-tap always works), confirm small merges. Level pips and shapes are always shown, so colour
is never the only cue.

## Cloud save (optional)

Settings → **Cloud save** backs the island up to [jsonhosting.com](https://jsonhosting.com) (free, no account). The save is gzip-compressed and
AES-GCM encrypted on the device first, so the service only stores scrambled text. **Back up to cloud** creates the copy and shows a *transfer code*
(`TM1~id~editKey~key`); **Sync now** updates it; **Restore from code** on another device downloads, decrypts and replaces that device's island.
If another device changed the cloud copy since this one last synced, the game asks which one to keep. The code is the password: whoever holds it can
read and replace the cloud copy. Code: `js/core/cloud.js`; tests use an in-memory stand-in for the service (`tests/cloud.test.mjs`).
Known limits of the service: 1 MB per document, 100 requests per hour per IP, and documents nobody opens for 12 months may be deleted. Keep exporting
a file as the real backup.

## Rules in brief

* A merge happens when you **drop an item onto an identical item** so that the dropped item plus the connected group around it (8-connected) makes 3 or more. Dropping on an empty cell only places the item, so you can line up as many as you like first. There is **no upper limit**: every item in the group is used up and you get **n − 2** items of the next level (**3 → 1, 4 → 2, 5 → 3, 6 → 4** and so on). Three shimmering items in one merge upgrade the result by one extra level.
* **Strong tools**: using a tool two or more levels above what an obstacle needs asks first. Tick "Don't ask me again" in that question, or switch **Confirm strong tools** off in Settings, to skip it (turn it back on in the same place).
* **Selling**: tap the Sell button to open a list of everything you own (board and tray, not frozen items). Pick how many of each to sell (− / + / typed number / All, or Select all) and sell them in one go for their normal sell value. Plain items go first, then tray items, and shimmering ones last; valuable items (level 5+) ask for one extra confirmation. Dragging a single item onto the button still sells it.
* **Magnet** (button under the coin counter, or press **M**): costs 100 coins and recharges for 2 minutes. Tap it, then tap an item with 3 or more copies on the board (they glow). Every copy anywhere on the board, connected or not, is pulled in and merged with the normal rule (n items → n − 2 of the next level). It never works on top-level items, ignores frozen items and the tray, and charges nothing unless it works. The pulled-in cells free up first, so the results always fit.
* **Dev mode** (Settings, Developer, password `DEV` in any case): a tuning panel for the magnet, balloon timing, energy, refills, storage, XP, trade, per-item sell and shop prices, zone and building costs, plus quick cheats and a **Complete objectives** testing switch: it adds a ✔ Complete button to story quests (quest list and quest card) that finishes the quest without the items. Buildings get built, zones open and levels are gained as needed, then the normal rewards are paid, so you can test how the island progresses. Changes apply at once, are stored on this device only, and never change the version or show the What's new window. See `js/core/devtools.js`. The password is only a speed bump: it is readable in the source.
* **Help in the game**: tap any counter at the top (energy, coins, pearls, amulets, tickets) or the level badge, long-press any item, or open a zone sign, building, event or quest to see what it needs, how to get it and what it gives. Settings has a **How to play** guide. The text lives in `js/view/help.js` and reads its numbers from the game data.
* **Painted art**: most items (24 chains plus chests and amulets), some icons and scenery and the title banner use the art team's painted sprites; the rest is still drawn in code. The item chains follow the art (names and number of levels), old saves are moved onto the new ladders on load, and the build checks that every quest and reward still names a real item. See `art/README.md`.
* Items at level 5 / 7 / 9 glow white / blue / gold. A pip strip under each item shows its level.
* The 60 × 80 island (the opening Shipwreck Cove is 16 × 12) unlocks zone by zone (level, amulets, cleared %, coins). Pockets of fog open as you level up.
* Expedition islands have one special rule each: tide pools, cannon, vents, frozen items, sugar rush and darkness.
* **Gift balloons**: every 3 to 5 minutes (once the tutorial is done) 1 to 3 balloons float down near the part of the island you are looking at. Each balloon pops when it lands and leaves a gift on the ground; tap it to open it. Gifts only ever hold level 1 items; higher player levels just get more of them. Tuning lives in `drops` in `tools/data-world.mjs`.

## Project layout

```
index.html, manifest.webmanifest, sw.js   PWA shell (sw.js is generated)
css/style.css                             all UI styling
js/core/                                  deterministic simulation (runs in the browser and in Node)
  game.js, cmd-board.js, cmd-world.js,    Game state + commands; the view only sends commands and listens to events
  cmd-quests.js, islands.js, drops.js,
  merge.js …
  save.js                                 IndexedDB / localStorage persistence
js/view/                                  renderer, input, HUD, panels, tutorial, audio, procedural art
  island-art.js, island-decor.js          the island itself: organic coastline, beaches, shore waves, scenery, cloud-bank fog
data/*.json                               generated game config (chains, items, zones, quests, economy …)
tools/                                    data generators, bot simulator, icon + service-worker builders, preview helpers
tests/                                    node:test suites (110 tests)
```

### Data pipeline

The JSON in `data/` is **generated** from the scripts `tools/data-*.mjs` by `npm run build:data`. Edit the
generators (or the JSON directly, if you prefer), then run `npm run build`. Text lives in `data/loc/en.json`.

### Tests and balance

```sh
npm test                                 # merge rules, game rules, islands, gift drops (110 tests)
node tools/simulate.mjs 20               # a bot plays the real simulation and reports pacing / soft-locks
```

## Known limitations

* **Ads are a demo.** The optional rewarded ad is a 3-second placeholder; no ad network is included.
* **No real-money purchases.** The Pearls tab explains this; everything can be earned by playing.
* **Event Island** (the fourth event template) is not implemented. The other three templates
  (Task Track, Merge Rush, Festival Orders) run on a local fortnightly schedule, so events work offline.
* Local notifications are not implemented (a PWA cannot schedule them reliably offline).
* English only.
