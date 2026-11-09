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

## Cloud save (optional, on Puter)

Settings → **Cloud save (Puter)** uses [puter.js](https://developer.puter.com/) so the island lives in the player's own Puter account
(free; no server of ours). **Sign in with Puter** opens Puter's sign-in window; **Save to cloud** writes `tropical-merge/save.json` into the app's
storage area of the account and a small record (`tropical-merge:save-meta`) beside it with **when it was saved**, when it was uploaded, level and
play time. **Restore from cloud** downloads it. Rules:

* **Restoring a save that is older than the one on this device always asks** ("Restore an OLDER save?"), showing both dates, how far apart they
  are and both levels, with "No, keep this device" as the safe choice. Newer or equal saves get the normal confirmation. A device that has hardly
  been played (level 1, under 2 minutes, no quest done) counts as having nothing to lose, so a fresh install restores without the scare.
* **Uploading over a cloud save this device has not seen** (another device saved since this one last synced) is held back and the player chooses
  between the cloud save and this device. A device that never synced meets an existing cloud save the same way, never a silent overwrite.
* puter.js is a third-party script, so it is **loaded only when cloud features are used** (settings loads it by itself only for players who have
  signed in before). Offline or blocked, the section just says Puter is not reachable; the game itself is unaffected.
* Earlier versions backed up to jsonhosting.com with a transfer code. **Restore from an old transfer code** still works (restore only, same older/newer
  question); new saves go to Puter.

* **What is in the cloud file:** one JSON file. An `info` block comes first and is human-readable (save and upload times as dates, schema and a summary: level, XP, coins, pearls, energy, amulets, tickets, quests done and running, areas, buildings, items on the island and in storage, discoveries, pets, achievements, streak). The complete save follows in `save`: the whole game state (all 39 sections, including every quest, currency, building, daily task and setting) plus the island board and island boards. The record also has `puterUser` and `file`: `{ path, relative, bytes }`, where `path` is the absolute path Puter reports for the file (`puter.fs.stat`), `relative` is the path the game uses and `bytes` its size, so another app can open the exact file; `path` is null if Puter does not say, which never stops a save. Both the record and the file's `info` carry `puterAppId`, the unique id Puter reports for this app (`puter.appID`; null if the SDK does not report one, which never stops a save). The summary includes an `inventory`: every item the player holds by id and count, on the island, in the storage tray, in overflow and on each expedition island; the read-back check compares it too, and Settings and the restore question show it in words ("It brings back 23 items on the island, 2 in storage"). After every upload the file is **read back and compared** with what was sent; if Puter did not keep all of it, the upload is reported as failed and nothing is marked saved. Settings shows the same facts in **What is in this save?**.

Code: `js/core/puter-cloud.js` (the rules), `js/view/cloudpanel.js` (the settings section and dialogs), `js/core/cloud.js` (old transfer codes).
Tests (`tests/puter-cloud.test.mjs`) use an in-memory stand-in for puter.js, since the real service needs a login.

## Rules in brief

* A merge happens when you **drop an item onto an identical item** so that the dropped item plus the connected group around it (8-connected) makes 3 or more. Dropping on an empty cell only places the item, so you can line up as many as you like first. There is **no upper limit**: every item in the group is used up and you get **n − 2** items of the next level (**3 → 1, 4 → 2, 5 → 3, 6 → 4** and so on). Three shimmering items in one merge upgrade the result by one extra level.
* **Quest Book** (purple book on the right rail, always visible): every one of the 220 story quests by act, with its objectives, rewards and status (done, running, locked and what unlocks it). Tapping an item chip opens "How to get it", a numbered path built from the game data (`js/core/howto.js`): the zone to open, the building and materials, the generator and its odds, and the merge ladder with the number of items needed. Item chips work the same way everywhere a quest, request, build site, daily task or island goal asks for an item, and the journey shows what you already hold (with a Show me button). Item chips inside a journey open their own journeys, so it can be followed down to the first Seed Pouch tap. UI in `js/view/questbook.js`.
* **Deliver / Fill the site buttons**: every running quest with item goals has a 📦 Deliver button (quest card, Quests list, Quest Book) that sends what is already on the board or in the tray to the giver (`autoDeliverQuest` in `js/core/cmd-world.js`), never more than the quest needs; build quests get 🧱 Fill the site.
* **Buying amulets and pearls**: Shop, Treasure tab, 1,000 coins each (`shop.buy` in `tools/data-world.mjs`).
* **Stronger tools hit harder**: on an obstacle that takes 2 or more hits, a clearing tool above the level it asks for counts as one extra hit per level above (a level 3 tool breaks a 2-hit bush that wants level 2 in one go). Single-hit obstacles and non-tool obstacles are unchanged. See `toolDamage` in `js/core/cmd-board.js`.
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
