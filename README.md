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
| Pick up and merge | Drag an item | Drag an item | Arrows move the cursor, **Space** picks up / drops |
| Tap / use generator / open | Tap | Click | **Enter** |
| Item info | Long press | Long press / **I** | **I** |
| Pan / zoom | Drag the ground / pinch | Drag / wheel | **WASD** / **+ −** , **0** resets |
| Hint | idle 8 s (20 s for a generator) | | **H** |

Accessibility options (Settings): text size up to 150%, colour patterns, reduce motion, haptics and sound
toggles, tap-to-move (no dragging), confirm small merges. Level pips and shapes are always shown, so colour
is never the only cue.

## Rules in brief

* A merge happens when you **drop an item onto an identical item** so that the dropped item plus the connected group around it (8-connected) makes 3 or more. Dropping on an empty cell only places the item, so you can line up 4 or 5 first. **3 → 1** next level, **4 → 1 + a bonus of the same
  level**, **5 → 2** next level. Cascades chain automatically.
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
tests/                                    node:test suites (54 tests)
```

### Data pipeline

The JSON in `data/` is **generated** from the scripts `tools/data-*.mjs` by `npm run build:data`. Edit the
generators (or the JSON directly, if you prefer), then run `npm run build`. Text lives in `data/loc/en.json`.

### Tests and balance

```sh
npm test                                 # merge rules, game rules, islands, gift drops (54 tests)
node tools/simulate.mjs 20               # a bot plays the real simulation and reports pacing / soft-locks
```

## Known limitations

* **Ads are a demo.** The optional rewarded ad is a 3-second placeholder; no ad network is included.
* **No real-money purchases.** The Pearls tab explains this; everything can be earned by playing.
* **Event Island** (the fourth event template) is not implemented. The other three templates
  (Task Track, Merge Rush, Festival Orders) run on a local fortnightly schedule, so events work offline.
* Local notifications are not implemented (a PWA cannot schedule them reliably offline).
* English only.
