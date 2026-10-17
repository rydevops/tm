// "What's new" notes, written by hand. Add one entry per release that players should hear about (keep each to a few short lines).
// The window opens once per version: the version a device last showed is remembered in localStorage.
export const NOTES = {
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
