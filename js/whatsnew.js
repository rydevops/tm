// "What's new" notes, written by hand. Add one entry per release that players should hear about (keep each to a few short lines).
// The window opens once per version: the version a device last showed is remembered in localStorage.
export const NOTES = {
  '2.2.3': [
    'Fixed: Check for updates could sit on "Checking…" for a long time on a slow connection. It now updates within a few seconds, and says "Updating…".',
    'Pictures are now fetched by build number, so an update can never show an older cached picture.'
  ],
  '2.2.2': [
    'Fixed: on phones the storage tray could not be scrolled, so slots beyond the first few were out of reach. Swipe sideways to scroll it; pull an item upward to drag it out. The tray also keeps its place when you store or take something.'
  ],
  '2.2.1': [
    'Fixed: tapping a building such as the Lumber Yard twice quickly sent the view back to the first zone. Double-tapping now only recentres the view on bare ground or sea, so you can keep tapping a generator.'
  ],
  '2.2.0': [
    'Tap and drop: tap an item to pick it up, then tap where it goes. A character delivers it, a build site takes it, an obstacle uses the tool, a matching item merges with it, a tray slot stores it and Sell sells it.',
    'Tap the picked-up item again for its details. Dragging still works exactly as before.'
  ],
  '2.1.0': [
    'The sea is alive: rolling cartoon waves, drifting light and twinkles on the open water.',
    'Coasts have rolling surf, crawling foam and sparkling shallows, on every island. Reduce motion in Settings keeps the water still.'
  ],
  '2.0.0': [
    'New painted art for almost every item: bananas, flowers, tools, logs, stones, goats, hens, drinks, coins, sea life, penguins, lanterns and more.',
    'Item chains now match the art, so many have new names and fewer or different levels. Your items were moved to the matching new ones and quests were updated to ask for them.',
    'Anything that no longer exists was swapped for coins.'
  ],
  '1.9.0': [
    'New painted art: treasure chests, spirit amulets, trees, palms, rocks and several icons.',
    'A new title screen.'
  ],
  '1.8.0': [
    'Tap the energy, coin, pearl, amulet or ticket counter at the top to see what it is, how to get it and what it is for.',
    'Events now explain exactly how to earn tokens and show your progress to the next reward. The running event has its own card above your quests.',
    'Items, zones, buildings, quests and expeditions now say what they need and what you get. New: Settings → How to play.'
  ],
  '1.7.3': [
    'Missing an amulet? Open Settings and tap "Give me 1 amulet" under Missing amulet. Each island can claim it once.'
  ],
  '1.7.2': [
    'Fixed: islands started before amulets existed could not open Hen Meadow. If the story asks you to open a zone, you now always have the amulets it needs.',
    'Opening Hen Meadow now gives you a Garden Plot. Tap it for flowers, herbs and papaya.',
    'Already opened Hen Meadow? Your Garden Plot is waiting on the island now.'
  ],
  '1.7.1': [
    'Fixed: an amulet earned from a story quest could go missing, so a zone such as Hen Meadow could not be opened.',
    'Missing quest amulets are now given back automatically.'
  ],
  '1.7.0': [
    'The "stronger than needed" tool question now has a "Don\'t ask me again" box.',
    'You can turn the question back on any time in Settings under Confirm strong tools.'
  ],
  '1.6.0': [
    'Tap the Sell button to choose exactly what to sell and how many of each, then sell it all at once.',
    'Dragging an item onto the Sell button still works.'
  ],
  '1.5.0': [
    'New Magnet button under your coins. Tap it, then tap an item: every matching item on the board is pulled in and merged at once.',
    'Same merge rule as always: 3 items make 1 of the next level, 4 make 2, 5 make 3, and so on.',
    'It needs 3 or more matching items, does not work on top-level items, costs 100 coins and recharges for 2 minutes.'
  ],
  '1.4.0': [
    'Bigger merges: merge any number of matching items at once. 3 make 1 of the next level, 4 make 2, 5 make 3, and so on with no limit.',
    'Items only merge when you drop one onto a matching item, so you can line up a big group first.',
    'Your island is four times bigger, and so are the locked areas.',
    'Gift balloons now drift down and leave level 1 items for you to collect.',
    'Cloud save: back up your game and restore it on another device from Settings.',
    'Reset Island now really starts over.'
  ]
};

const KEY = 'tropical-merge-seen-v1';
const read = st => { try { return st ? st.getItem(KEY) : null; } catch (e) { return null; } };

/** Notes to show for this version, or null when there is nothing new / they were already shown. */
export function pendingNotes(version, storage = (typeof localStorage !== 'undefined' ? localStorage : null), notes = NOTES) {
  if (!version || read(storage) === version) return null;
  return notes[version] && notes[version].length ? notes[version] : null;
}
/** Remember that this version's window was handled (shown, or not needed). */
export function markSeen(version, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { storage?.setItem(KEY, version); } catch (e) { /* private mode: it may show again next time */ }
}
