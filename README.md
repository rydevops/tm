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
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) runs the tests, rebuilds the data and the
   service worker, and publishes the site. (Or publish the repo root directly: every runtime file is
   committed, including `sw.js` and `icons/`.)

After any change to game files, run `npm run build` so `sw.js` gets a new cache version; otherwise
returning players keep seeing the old cached copy.

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

* Merges need 3 to 5 identical items that are 8-connected: **3 → 1** next level, **4 → 1 + a bonus of the same
  level**, **5 → 2** next level. Cascades chain automatically.
* Items at level 5 / 7 / 9 glow white / blue / gold. A pip strip under each item shows its level.
* The 30 × 40 island unlocks zone by zone (level, amulets, cleared %, coins). Pockets of fog open as you level up.
* Expedition islands have one special rule each: tide pools, cannon, vents, frozen items, sugar rush and darkness.

## Project layout

```
index.html, manifest.webmanifest, sw.js   PWA shell (sw.js is generated)
css/style.css                             all UI styling
js/core/                                  deterministic simulation (runs in the browser and in Node)
  game.js, cmd-board.js, cmd-world.js,    Game state + commands; the view only sends commands and listens to events
  cmd-quests.js, islands.js, merge.js …
  save.js                                 IndexedDB / localStorage persistence
js/view/                                  renderer, input, HUD, panels, tutorial, audio, procedural art
data/*.json                               generated game config (chains, items, zones, quests, economy …)
tools/                                    data generators, bot simulator, icon + service-worker builders, preview helpers
tests/                                    node:test suites (42 tests)
```

### Data pipeline

The JSON in `data/` is **generated** from the scripts `tools/data-*.mjs` by `npm run build:data`. Edit the
generators (or the JSON directly, if you prefer), then run `npm run build`. Text lives in `data/loc/en.json`.

### Tests and balance

```sh
npm test                                 # merge rules, game rules, islands (42 tests)
node tools/simulate.mjs 20               # a bot plays the real simulation and reports pacing / soft-locks
```

## Known limitations

* **Ads are a demo.** The optional rewarded ad is a 3-second placeholder; no ad network is included.
* **No real-money purchases.** The Pearls tab explains this; everything can be earned by playing.
* **Event Island** (the fourth event template) is not implemented. The other three templates
  (Task Track, Merge Rush, Festival Orders) run on a local fortnightly schedule, so events work offline.
* Local notifications are not implemented (a PWA cannot schedule them reliably offline).
* English only.
