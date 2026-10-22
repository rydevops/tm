// Player-facing explanations: what a thing is, how to get or finish it, and what it gives. Numbers are read from the live game
// data, so the text stays right when the economy is tuned. Kept apart from the panels so every screen explains things the same way.
import { fmtTime } from './ui.js';
import { parseItemId } from '../core/util.js';

const pct = v => `${Math.round(v * 100)}%`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** How each live event earns tokens: [short rule, worked example]. */
export function eventRules(templateId) {
  return ({
    task_track: ['Create any item of level 3 or higher (by merging, from a generator, or from a chest). Each one earns tokens equal to its level.', 'Example: merging three Banana Flowers into a level 3 Green Banana earns 3 tokens; a level 6 item earns 6.'],
    merge_rush: ['Every merge earns one token per item merged. While it runs you also get double XP and double shimmer chance.', 'Example: merging 3 items earns 3 tokens; merging 5 at once earns 5.'],
    festival: ['Every item you deliver earns 2 tokens: to a resident for a quest or request, or to an expedition island goal.', 'Example: delivering a Ripe Banana to Beni earns 2 tokens.']
  })[templateId] || ['Earn tokens by playing while the event runs.', ''];
}

/** Currency and XP explainers: { title, what, earn: [], use: [] }. */
export function currencyHelp(g, kind) {
  const d = g.data, eco = d.economy, s = g.s;
  switch (kind) {
    case 'energy': return {
      title: 'Energy', what: `Tapping a generator (Seed Pouch, Toolbox, Lumber Yard and so on) costs 1 energy and makes a new item. You hold up to ${eco.energy.max}.`,
      earn: [`Refills by itself: +1 every ${fmtTime(eco.energy.regenSeconds)} (every ${fmtTime(eco.energy.firstDayRegenSeconds)} on your first day).`, 'Every level-up fills it completely.', `Daily tasks give +${eco.daily.energy} each; Energy Sparks on the board give energy when tapped.`, `The + button: +${eco.refill.coins.energy} for ${eco.refill.coins.cost} coins, or +${eco.refill.pearls.energy} for ${eco.refill.pearls.cost} pearls.`, `At 0 energy you can claim a free +${eco.energy.rescueFree} once a day.`],
      use: ['Generators on the main island. Expedition islands use their own charges instead.'] };
    case 'coins': return {
      title: 'Coins', what: 'The everyday money of the island.',
      earn: ['Sell items (Sell button, or the Market at the Trade Dock).', 'Trade Dock orders, quests, daily tasks, requests and achievements.', `Discovering a new item pays ${eco.discovery.coinsPerLevel} coins per item level.`, 'Tap coin bags on the board to collect them; merge them first for more.'],
      use: ['Buildings and zone unlocks', `The Magnet (${eco.magnet.cost} coins)`, 'Shop deals, storage slots and energy refills'] };
    case 'pearls': return {
      title: 'Pearls', what: 'A rare currency.',
      earn: [`Every 5th level (+${eco.levelUp.every5.pearls})`, `Finishing all weekly tasks (+${eco.weekly.pearls})`, 'Chests, event rewards, achievements and expedition islands', 'Tap pearl items on the board to collect them.'],
      use: [`Big energy refill (+${eco.refill.pearls.energy} for ${eco.refill.pearls.cost} pearls)`, 'Storage slots'] };
    case 'amulets': {
      const shrine = !!s.built.bld_spirit_shrine;
      return {
        title: 'Amulets', what: 'Opening a new zone of the island costs amulets (zones 3 and up).',
        earn: [
          'Story quests: some quests pay amulets. Before the Spirit Shrine they are the only source, and they pay exactly what the zones you are asked to open cost.',
          `Spirit Amulet items${shrine ? '' : ' (from zone 8 on)'}: the Spirit Shrine makes them, and chests or cleared obstacles sometimes drop them. Merge them up to level 5, then tap the finished amulet to add 1 to this counter.`,
          'Missing one because of a bug? Settings → Missing amulet?'],
        use: ['Unlocking zones. Tap a zone sign to see what it needs.'] };
    }
    case 'tickets': return {
      title: 'Expedition Tickets', what: 'Your first visit to each expedition island costs 1 ticket. Revisits are free. You can hold up to 10.',
      earn: ['Merge Expedition Supplies up to the top level (level 6), then tap it for 1 ticket.', 'Supplies come from chests, the day 7 daily gift and event rewards.'],
      use: ['Expeditions (map button)'] };
    case 'xp': return {
      title: 'Level and XP', what: `Level ${s.player.level}: ${s.player.xp} of ${g.xpForLevel(s.player.level)} XP to the next level.`,
      earn: ['Merging (higher levels give more)', 'Discovering new items', 'Finishing quests and building'],
      use: ['Each level-up refills your energy and gives a chest; every 5th level adds a bigger chest and pearls.', 'Zones need a minimum level, and new levels can open hidden pockets of land.'] };
  }
  return null;
}

/** What a generator makes right now, by item family ("Banana, Coconut"); families you have not unlocked yet are left out. */
export function generatorOutputs(g, genId) {
  const d = g.data, gen = d.genById[genId]; if (!gen) return '';
  const chains = [...new Set(gen.outputs.map(o => parseItemId(o.item).chain))];
  const open = chains.filter(c => g.chainUnlocked(c));
  const names = (open.length ? open : chains).map(c => d.chain(c)?.name).filter(Boolean);
  return names.join(', ') + (open.length && open.length < chains.length ? ', and more as you open new zones' : '');
}

/** One or two sentences on what to do with an item, by what kind of item it is. */
export function itemHelp(g, id) {
  const d = g.data, info = d.item(id); if (!info) return '';
  const ch = d.chain(info.chain), last = info.level >= ch.levels;
  if (ch.family === 'generator') {
    const outs = generatorOutputs(g, ch.generator);
    return `Generator: tap it to make ${outs || 'new items'} (costs 1 energy on the main island).${last ? '' : ' Merge three to upgrade it: higher tiers sometimes make better items or two at once.'}`;
  }
  if (ch.chest) return 'Chest: tap it to open. Bigger chests hold more and better items.';
  if (ch.currency) return `Tap to collect the ${ch.currency}. Merge three first to get more.`;
  if (ch.amuletLevel) return info.level === ch.amuletLevel ? 'Finished amulet: tap it to add 1 to your amulet counter (used to unlock zones).' : `Merge up to level ${ch.amuletLevel}, then tap the finished amulet to add 1 to your amulet counter.`;
  if (ch.ticketLevel) return info.level === ch.ticketLevel ? 'Tap it for 1 Expedition Ticket.' : `Merge up to level ${ch.ticketLevel}, then tap it for 1 Expedition Ticket.`;
  if (info.chain === 'pet') return last ? 'Tap the hatchling to meet a new pet. Pets give a lasting bonus.' : 'Pet egg: merge up to a hatchling, then tap it to meet a new pet.';
  if (info.chain === 'clearing_tools') return 'Clearing tool: drag it onto an obstacle that needs it (long-press an obstacle to see which tool). Each hit uses up one tool, and a tool that is too weak will not work.';
  if (ch.island) return `Island item: merge it and use it for this island's goals (tap the goal card on the left to see them).`;
  if (info.chain === 'sparks') return 'Tap to collect energy.';
  const uses = ['deliver to residents', 'use in build sites'];
  if (ch.sellable) uses.push('sell for coins');
  if (g.livingDefFor?.(id)) uses.push('place it on fertile soil or a perch so it keeps producing');
  return `Merge three to make the next level. Use it to ${uses.join(', ')}.`;
}

/** Everything a zone sign needs to say about one requirement. */
export function zoneRequirementHelp(g, key, r) {
  const d = g.data;
  switch (key) {
    case 'level': return 'Earn XP by merging, discovering items and finishing quests.';
    case 'amulets': return g.s.built.bld_spirit_shrine ? 'Merge Spirit Amulets from the Spirit Shrine to level 5 and tap them; some story quests also pay amulets.' : 'Amulets come from story quests: keep finishing the quests on the left. (Spirit Amulet items appear later, from zone 8.)';
    case 'cleared': return `Clear obstacles (grass, driftwood, rocks…) in ${d.zoneByN[r.zone.n - 1]?.name || 'the previous zone'} with tools from the Toolbox.`;
    case 'coins': return 'Sell spare items, fill trade orders and finish quests.';
  }
  return '';
}

/** Short lines for the How to play guide: [heading, text]. */
export function guideSections(g) {
  const d = g.data, eco = d.economy;
  return [
    ['Merging', `Drop an item onto two or more identical items (touching, diagonals count) to merge: 3 items make 1 of the next level, 4 make 2, 5 make 3 and so on. Shimmering ✨ items: three in one merge give an extra level.`],
    ['Generators and energy', `Tap a generator to make items. On the main island each tap costs 1 energy (+1 every ${fmtTime(eco.energy.regenSeconds)}, full refill on level-up).`],
    ['Quests', 'Your current quests are on the left. Tap one to see what it needs. Drag items onto the resident to deliver them. Rewards are paid automatically as soon as every goal is met.'],
    ['Daily and weekly tasks', `Each daily task pays ${eco.daily.coins} coins and ${eco.daily.energy} energy when done; finishing all ${eco.daily.count} also gives a chest, and a 7-day streak a bigger one. Finishing all weekly tasks gives a chest and ${eco.weekly.pearls} pearls. Everything is paid automatically.`],
    ['Requests', 'From level 3, residents ask for items each day. Drag the item onto them; the reward (coins or a chest) is paid when the request is complete.'],
    ['Obstacles', 'Drag a clearing tool from the Toolbox onto grass, driftwood and other obstacles. Long-press an obstacle to see which tool it needs. Some hide prizes.'],
    ['Buildings', 'Fill a build site with the items it asks for (drag them on, or use Auto-fill), pay the coins, and it is built. Many buildings become generators; some give a daily coin payout or a lasting bonus.'],
    ['Zones', 'Tap the sign on a fogged zone to see what it needs: a level, cleared obstacles in the zone before it, coins and, from zone 3, amulets.'],
    ['Events', `Every two weeks an event runs for a few days (from level 8). Earn tokens the way the event describes; each token milestone pays a reward automatically. While one runs, its card sits at the top of your quest list: tap it for the rules and rewards.`],
    ['Expeditions', 'Small islands with their own rule and goals. The first visit costs 1 Expedition Ticket. Bring up to five items from home. Finishing an island gives an Island Amulet for the Great Temple, plus other rewards.'],
    ['Storage and selling', 'Drag items into the tray at the bottom to keep them safe. Tap Sell to sell several items at once, or drag one onto it.'],
    ['Tips', 'Long-press (or tap) any item to see what it is and what to do with it. Tap the coins, energy, pearl, amulet and ticket counters at the top for details.']
  ];
}

export { pct, plural };
