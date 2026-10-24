// Story quest generator: 220 quests in 6 acts (spec section 13).
// Act 1's first 12 quests are the spec's sample chain; every act's finale is a 3-part, 3-chain order.
import { CHAINS } from './data-chains.mjs';

const MAX = Object.fromEntries(CHAINS.map(c => [c[0], c[4].length]));
const pad = n => String(n).padStart(2, '0');
const iid = (chain, level) => `${chain}_${pad(level)}`;

function rngFactory(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PLAN_COUNTS = [28, 36, 38, 40, 40, 38];

const SPECIALTY = {
  marlene: null,
  beni: ['banana', 'coconut', 'fiber', 'sea', 'shells', 'lumber'],
  mateo: ['lumber', 'stone', 'hardware', 'fiber', 'clearing_tools'],
  tala: ['herbs', 'hibiscus', 'papaya'],
  rosa: ['meals', 'dairy', 'drinks', 'pineapple', 'banana', 'coconut'],
  kai: ['sea', 'shells', 'drinks'],
  victor: ['drinks', 'meals', 'mango', 'shells', 'hibiscus'],
  okoye: ['chicken', 'cow', 'goat', 'dairy', 'pet'],
  lena: ['amulet', 'stone', 'shells', 'hardware', 'hibiscus']
};

const LINES = {
  marlene: ['Grandma never made it look this hard.', 'One thing at a time. I can do this.', 'The island is waking up, I can feel it.', 'Okay, Elena. Show me what you would do.', 'If I can fix a roof, I can fix anything.', 'I keep finding her handwriting everywhere.'],
  beni: ['Back in my day, we did this with one hand tied.', 'I once caught a fish bigger than this boat. Almost.', 'The tide waits for no one, but I will wait for you.', 'Bring it here and I will tell you a story.', 'Aye, that will do nicely.', 'I am not soft. I just have allergies. To sentiment.'],
  mateo: ['Measure twice. Cut once. Deliver once.', 'It has to be right.', 'Hm. Almost. Bring me a better one.', 'A good build starts with good materials.', 'Do not rush the joints.', 'That is not crooked. That is character. Fine, I will fix it.'],
  tala: ['The garden always knows what it needs.', 'Patience is also a medicine.', 'I know a remedy for most things. Not for hurry.', 'Your grandmother would have laughed at this mess. Fondly.', 'Bring me something green and I will do the rest.', 'Some secrets keep better in soil.'],
  rosa: ['Stand up straight! Cooking is a sport!', 'You are too thin. Eat first, merge later.', 'Fresh. I said fresh. Do you hear me?', 'Make it good and I will name a dish after you.', 'My mother did it with one pan and a prayer.', 'Mamma mia, you did it. Do not let it go to your head.'],
  kai: ['Hurry, the tide is turning!', 'I found a shell with a map on it. For real.', 'I am ten and a half. I can do this.', 'Whoa. Can we keep that one?', 'The reef is not going to fix itself. Neither is the dock.', 'I saw something big under the water. Probably.'],
  victor: ['Sentiment is lovely. Spreadsheets are lovelier.', 'I never lose a bet. I have never made one before.', 'Fine, you have my attention. Not my signature. Yet.', 'Impressive. Do it again, faster.', 'I may have misjudged this place.', 'Do not tell anyone I helped. I have a reputation.'],
  okoye: ['Animals do not lie. They just do not explain.', 'Mind the horns. And the opinions.', 'Good. They are calmer already.', 'Clean hands, kind voice. That is the whole job.', 'The goats judge you. I judge the goats back.', 'Remarkable. Absolutely remarkable.'],
  lena: ['Oh! Oh, I have notes on this somewhere.', 'Do not touch it! ...Okay, touch it, but gently.', 'This changes everything. Again.', 'Fascinating. I lost my pencil. Again.', 'It is older than it looks. I am older than I look. Do not ask.', 'Elena was here. Her marks are everywhere.']
};

const R = (type, rest) => Object.assign({ type }, rest);
const coins = amount => R('coins', { amount });
const energy = amount => R('energy', { amount });
const item = (id, count = 1) => R('item', { item: id, count });
const amulet = amount => R('amulet', { amount });
const pearls = amount => R('pearls', { amount });

// ---- Act 1: the spec's first 12 quests, written out exactly
const act1Head = [
  { giver: 'beni', text: "Let's get you ashore. Merge those Baby Bananas into a Banana Bud.", o: [{ type: 'create_item', item: 'banana_02', count: 1 }], r: [coins(20), energy(5)] },
  { giver: 'beni', text: 'You need to eat before you build. Bring me a Ripe Banana.', o: [{ type: 'deliver_item', item: 'banana_04', count: 1 }], r: [item('chest_01')] },
  { giver: 'marlene', text: 'The grass is as tall as I am. Clear 3 Tall Grass.', o: [{ type: 'clear_obstacle', obstacle: 'tall_grass', count: 3 }], r: [item('clearing_tools_01', 2)] },
  { giver: 'beni', text: 'The dock needs fiber and logs. Driftwood on the beach will do: one Fiber Tuft and one Long Log.', o: [{ type: 'deliver_item', item: 'fiber_02', count: 1 }, { type: 'deliver_item', item: 'lumber_03', count: 1 }], r: [item('lumber_04')] },
  { giver: 'marlene', text: 'Repair the dock. Beni deserves a proper landing.', o: [{ type: 'build', building: 'bld_welcome_dock' }], r: [coins(50)] },
  { giver: 'beni', text: "Grandma's cottage is still standing, barely. Clear 8 obstacles around it.", o: [{ type: 'clear_obstacle', obstacle: 'any', count: 8 }], r: [item('chest_02')] },
  { giver: 'marlene', text: 'A letter under the floorboards! The floor needs one good Cut Log first.', o: [{ type: 'deliver_item', item: 'lumber_04', count: 1 }], r: [amulet(1)] },
  { giver: 'mateo', text: 'A roof first, questions later. One Cut Log and a nail.', o: [{ type: 'deliver_item', item: 'lumber_04', count: 1 }, { type: 'deliver_item', item: 'hardware_01', count: 1 }], r: [energy(30)] },
  { giver: 'mateo', text: 'Show me you can handle tools. Make a Hoe.', o: [{ type: 'create_item', item: 'clearing_tools_03', count: 1 }], r: [item('chest_03')] },
  { giver: 'marlene', text: 'The farmstead is calling. Reach level 3 and open the way.', o: [{ type: 'unlock_zone', zone: 2 }], r: [coins(40)] },
  { giver: 'mateo', text: 'Bring coconuts for the roof glue.', o: [{ type: 'deliver_item', item: 'coconut_03', count: 2 }], r: [item('gen_seed_02')] },
  { giver: 'beni', text: 'The lumber yard has been a swamp for years. Build it!', o: [{ type: 'build', building: 'bld_lumber_yard' }], r: [item('sparks_01', 3)] }
];

// ---- Beat plans for the rest. g = gate quest, sides = filler count, pool = chains with live generators.
const P = (g, sides, pool, lv) => ({ g, sides, pool, lv });
const G = (giver, text, o, r) => ({ giver, text, o, r });
const dl = (it, n = 1) => ({ type: 'deliver_item', item: it, count: n });
const cr = (it, n = 1) => ({ type: 'create_item', item: it, count: n });
const bd = b => ({ type: 'build', building: b });
const uz = z => ({ type: 'unlock_zone', zone: z });
const lvl = n => ({ type: 'reach_level', level: n });
const cl = (n, obstacle = 'any') => ({ type: 'clear_obstacle', obstacle, count: n });
const ig = island => ({ type: 'island_complete', island });

const A1 = ['banana', 'coconut', 'clearing_tools', 'lumber', 'hardware', 'fiber'];
const A2a = [...A1, 'hibiscus', 'herbs', 'chicken'];
const A2 = [...A2a, 'stone', 'pineapple', 'meals'];
const A3a = [...A2, 'dairy', 'cow', 'sea', 'shells'];
const A3 = [...A3a, 'mango', 'drinks'];
const A4 = [...A3, 'goat', 'papaya'];
const A4b = [...A4, 'amulet'];
const A5 = [...A4b, 'pet'];

const PLANS = [
  { act: 1, head: act1Head, beats: [
    P(G('marlene', 'The cottage needs a roof before it needs a name.', [bd('bld_cottage')], [item('chest_02')]), 1, A1, [2, 4]),
    P(G('mateo', 'Make me a Machete. Hard brush deserves a sharper answer.', [cr('clearing_tools_04', 1)], [item('chest_03')]), 2, A1, [2, 4]),
    P(G('beni', 'The letter speaks of six amulets. Bring me coconuts and I will tell you the tale.', [dl('coconut_04', 2)], [item('sparks_02', 2)]), 2, A1, [2, 4]),
    P(G('marlene', 'Look at it all. Reach level 4.', [lvl(4)], [coins(60)]), 2, A1, [3, 4]),
    P(G('mateo', 'A proper gate: a hinge, two Cut Logs, patience.', [dl('hardware_04', 1), dl('lumber_04', 2)], [item('chest_03')]), 2, A1, [3, 5]),
    P(G('beni', 'The ferry has seen better days. Make her proud: two Fiber Stalks for the lines.', [dl('fiber_04', 2)], [energy(30)]), 2, A1, [3, 5]),
    P(G('marlene', 'Level 5. The meadow beyond the farm is waiting.', [lvl(5)], [coins(100)]), 1, A1, [3, 5])
  ], finale: G('marlene', 'Every great work needs one great day. Logs, coconut and banana: bring me all three.', [dl('lumber_04', 2), dl('coconut_05', 1), dl('banana_05', 1)], [item('chest_03'), coins(150)]) },
  { act: 2, beats: [
    P(G('marlene', 'Grandma wrote about a meadow with a market row. Let us open it.', [uz(3)], [item('chest_02')]), 0, A1, [3, 4]),
    P(G('tala', 'You have hands. The meadow needs them. Clear 8 obstacles.', [cl(8)], [item('chest_02')]), 2, A2a, [3, 5]),
    P(G('mateo', 'Hens before hammers. Build the Hen House.', [bd('bld_hen_house')], [item('sparks_02', 2)]), 2, A2a, [3, 5]),
    P(G('tala', 'An Orange Blossom, please. For the healing tea. It also smells nice.', [cr('hibiscus_04', 1)], [item('chest_03')]), 2, A2a, [3, 5]),
    P(G('mateo', 'A market needs a stall. Build the Market Stall.', [bd('bld_market_stall')], [coins(120)]), 2, A2a, [3, 5]),
    P(G('tala', 'My grandmother knew yours. Bring me some mint and I will tell you how.', [dl('herbs_03', 2)], [amulet(1)]), 2, A2a, [3, 5]),
    P(G('marlene', 'Level 8 and an amulet in hand. Stonebrook is next.', [lvl(8)], [coins(120)]), 1, A2a, [3, 5]),
    P(G('marlene', 'Open Stonebrook. The creek is singing.', [uz(4)], [item('chest_03')]), 0, A2a, [3, 5]),
    P(G('rosa', 'Is that a stove? A kitchen! Build me a Hearth, bambino.', [bd('bld_kitchen_hearth')], [item('sparks_03', 1)]), 2, A2, [3, 5]),
    P(G('mateo', 'Stone for the foundations. Build the Quarry.', [bd('bld_stone_quarry')], [item('chest_03')]), 2, A2, [3, 5]),
    P(G('rosa', 'A Green Bowl. Crisp outside, wholesome inside. Make one.', [cr('meals_04', 1)], [energy(40)]), 2, A2, [3, 5]),
    P(G('tala', 'The recipe book shows a map of old amulet sites. Bring basil so I can steady my hands.', [dl('herbs_05', 1)], [item('chest_03')]), 2, A2, [4, 5]),
    P(G('marlene', 'Rosa wants to host a Harvest Supper. Level 10, for the long table.', [lvl(10)], [coins(150)]), 1, A2, [4, 5])
  ], finale: G('rosa', 'The Harvest Supper! A Tomato Bowl, a posy, and basil for the soup. Every plate matters.', [dl('meals_05', 1), dl('hibiscus_05', 1), dl('herbs_05', 1)], [amulet(2), item('chest_04')]) },
  { act: 3, beats: [
    P(G('marlene', 'Lagoon Bend glitters on the map. Let us wake it.', [uz(5)], [item('chest_03')]), 0, A2, [3, 5]),
    P(G('kai', 'A dock! A real fishing dock! Build it, please please please.', [bd('bld_fishing_dock')], [item('sparks_03', 1)]), 2, A3a, [3, 5]),
    P(G('mateo', 'The animals need a roof of their own. Build the Cow Shed.', [bd('bld_cow_shed')], [item('chest_03')]), 2, A3a, [3, 6]),
    P(G('kai', 'I want to see a Dolphin. A real one. Make one!', [cr('sea_03', 1)], [coins(80)]), 2, A3a, [3, 6]),
    P(G('rosa', 'Butter for the tart. Make a Butter Box, creamy and proud.', [cr('dairy_05', 1)], [energy(40)]), 2, A3a, [3, 6]),
    P(G('marlene', 'Level 14 and two amulets. The orchard is next.', [lvl(14)], [coins(150)]), 1, A3a, [3, 6]),
    P(G('marlene', 'Sunset Beach, here we come.', [uz(6)], [item('chest_03')]), 0, A3a, [3, 6]),
    P(G('victor', 'Charming place. I would like to buy it. All of it. The bay, the beach, the hens.', [cl(10)], [coins(200)]), 2, A3, [4, 6]),
    P(G('marlene', 'He bets I cannot prove the island is worth more as a home. Sunset Festival, here we come. Build the Juice Stand.', [bd('bld_juice_stand')], [item('chest_03')]), 2, A3, [4, 6]),
    P(G('mateo', 'The Windmill. It will catch every breath of wind we have.', [bd('bld_windmill')], [item('sparks_03', 2)]), 2, A3, [4, 6]),
    P(G('kai', 'The first shell map! Bring me a Pink Sponge and I will show you.', [cr('shells_04', 1)], [amulet(2)]), 2, A3, [4, 6]),
    P(G('rosa', 'Beach Cafe? Yes. A cafe with a view. Build it!', [bd('bld_beach_cafe')], [item('chest_04')]), 2, A3, [4, 6]),
    P(G('victor', 'Fine. You are not terrible. I will upgrade the market stall, for the festival.', [dl('drinks_04', 2)], [coins(250)]), 2, A3, [4, 6]),
    P(G('marlene', 'Level 17. Hills! Goats! A bridge, probably.', [lvl(17)], [coins(150)]), 1, A3, [4, 6])
  ], finale: G('marlene', 'The Sunset Festival is tonight. A Coconut Cooler, two Tomato Bowls and a Crab for the centerpiece.', [dl('drinks_05', 1), dl('meals_05', 2), dl('sea_05', 1)], [amulet(3), item('chest_04')]) },
  { act: 4, beats: [
    P(G('marlene', 'The hills are open. Let us see what is up there.', [uz(7)], [item('chest_03')]), 0, A3, [4, 6]),
    P(G('okoye', 'Goats do not need a pen. They need a respectful audience. Build the pen anyway.', [bd('bld_goat_pen')], [item('chest_03')]), 2, A4, [4, 6]),
    P(G('okoye', 'A Young Goat, please. And please do not name it.', [cr('goat_04', 1)], [energy(40)]), 2, A4, [4, 6]),
    P(G('mateo', 'The cliff path needs a bridge. Beams and twisted fiber.', [bd('bld_cliff_bridge')], [item('chest_04')]), 2, A4, [4, 6]),
    P(G('tala', 'Papaya for the remedies. Make a Green Papaya.', [cr('papaya_04', 1)], [coins(100)]), 2, A4, [4, 6]),
    P(G('marlene', 'Level 20 and the shrine grove is waiting.', [lvl(20)], [coins(200)]), 1, A4, [4, 6]),
    P(G('marlene', 'Whispers on the wind. Open the Grove.', [uz(8)], [item('chest_04')]), 0, A4, [4, 6]),
    P(G('lena', 'Oh! It is the shrine from the sketch! Do not step on that stone, I am not done recording it.', [cl(8)], [amulet(3), item('amulet_04')]), 2, A4, [4, 6]),
    P(G('lena', 'Repair the Shrine. Blue crystals, gently, and a carved amulet.', [bd('bld_spirit_shrine')], [item('chest_04')]), 2, A4b, [4, 6]),
    P(G('lena', 'A shard. Make me one. I need to compare it to Elena\'s sketch.', [cr('amulet_03', 1)], [coins(200)]), 2, A4b, [4, 6]),
    P(G('tala', 'Did you see that flicker at the shrine? That was no firefly. Bring me a Lavender Sprig.', [dl('herbs_06', 1)], [item('chest_04')]), 2, A4b, [4, 6]),
    P(G('victor', 'A second storm is coming. My survey team is on the cliffs. I need fiber, beams and a padlock. Please.', [dl('fiber_05', 1), dl('lumber_06', 1), dl('hardware_05', 1)], [coins(300)]), 2, A4b, [5, 6]),
    P(G('okoye', 'Butter for the rescued team. A whole box of it.', [dl('dairy_06', 1)], [energy(60)]), 2, A4b, [5, 6]),
    P(G('marlene', 'Level 24. The hollow behind the grove hums.', [lvl(24)], [coins(250)]), 1, A4b, [5, 6])
  ], finale: G('victor', 'The team is safe. I owe you. Fiber, two beams and a Spotted Cow for the farm: consider it a down payment.', [dl('fiber_06', 1), dl('lumber_06', 2), dl('cow_06', 1)], [amulet(2), item('chest_05')]) },
  { act: 5, beats: [
    P(G('marlene', 'Something hums beyond the grove. Open Wonder Hollow.', [uz(9)], [item('chest_04')]), 0, A4b, [5, 6]),
    P(G('okoye', 'The Nest of Wonders. Short planks and posies: pretty, structural.', [bd('bld_nest_of_wonders')], [item('chest_04')]), 2, A5, [5, 6]),
    P(G('okoye', 'Eggs! Hatch a Pet Egg to a Hatchling Pet.', [cr('pet_03', 1)], [energy(60)]), 2, A5, [5, 6]),
    P(G('lena', 'The Museum! Elena\'s expeditions need a home.', [bd('bld_museum')], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('lena', 'A carved amulet for the exhibit. Please.', [cr('amulet_04', 1)], [coins(300)]), 2, A5, [5, 7]),
    P(G('marlene', 'Level 28. The lantern cliffs call.', [lvl(28)], [coins(300)]), 1, A5, [5, 7]),
    P(G('marlene', 'The cliffs shine at dusk. Let us go there.', [uz(10)], [item('chest_04')]), 0, A5, [5, 7]),
    P(G('victor', 'The lighthouse. I will pay for it. Do not make it a thing.', [bd('bld_lighthouse')], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('tala', 'A greenhouse for the rare blooms. Shimmer luck, you know.', [bd('bld_greenhouse')], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('beni', 'I run the light now, apparently. Bring me a Young Pet and I will tell you what I saw on the sea.', [cr('pet_04', 1)], [pearls(10), energy(60)]), 2, A5, [5, 7]),
    P(G('lena', 'Elena kept a coral fan from her first voyage. Bring me one and I will restore her cabinet.', [dl('shells_06', 1)], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('kai', 'The harbor must be near! Bring me a Crab so I can ask the tide.', [dl('sea_05', 1)], [coins(350)]), 2, A5, [5, 7]),
    P(G('marlene', 'Level 32. The harbor is next.', [lvl(32)], [coins(300)]), 1, A5, [5, 7])
  ], finale: G('lena', 'The museum is ready for its first show. A posy, a pet and a crystal cluster.', [dl('hibiscus_07', 1), dl('pet_05', 1), dl('stone_07', 1)], [amulet(2), item('chest_05')]) },
  { act: 6, beats: [
    P(G('marlene', 'The harbor is waiting. Open Coral Harbor.', [uz(11)], [item('chest_04')]), 0, A5, [5, 7]),
    P(G('kai', 'I will run the harbor! Beni says I can. Build it!', [bd('bld_harbor')], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('kai', 'The Aquarium! Crabs and shells. I will name them all.', [bd('bld_aquarium')], [item('chest_05')]), 2, A5, [5, 7]),
    P(G('beni', 'The boat is ready. The Coral Atoll first: the old drowned village.', [ig('isl_coral_atoll')], [pearls(30), item('chest_05')]), 1, A5, [5, 7]),
    P(G('beni', 'Next: Pirate Cove. Captain Rook left a treasure.', [ig('isl_pirate_cove')], [pearls(30), item('chest_05')]), 1, A5, [5, 7]),
    P(G('okoye', 'Dragon Peak. The baby needs us.', [ig('isl_dragon_peak')], [pearls(30), item('chest_05')]), 1, A5, [5, 7]),
    P(G('okoye', 'Frostfin Isle. Penguins and wind. Bring drinks.', [ig('isl_frostfin')], [pearls(30), item('chest_05')]), 1, A5, [5, 7]),
    P(G('rosa', 'Sugar Cay! My childhood. Do not tell anyone I cried.', [ig('isl_sugar_cay')], [pearls(30), item('chest_05')]), 1, A5, [5, 7]),
    P(G('marlene', 'The last island: Lantern Isle. Luma\'s home. The sixth amulet.', [ig('isl_lantern')], [pearls(50), item('chest_05')]), 1, A5, [5, 7]),
    P(G('marlene', 'Level 36. The Temple Heights are ours.', [lvl(36)], [coins(500)]), 1, A5, [5, 7]),
    P(G('marlene', 'Open Temple Heights. Elena is up there somewhere, in the stone.', [uz(12)], [item('chest_05')]), 0, A5, [5, 7]),
    P(G('lena', 'Build the Great Temple. Three pillars, three ancient amulets.', [bd('bld_great_temple')], [item('chest_05'), pearls(50)]), 2, A5, [5, 7])
  ], finale: G('marlene', 'Six amulets. Luma, are you there? The Sun Gate waits.', [{ type: 'sun_gate' }], [pearls(150), item('chest_05', 2)]) }
];

function buildAct(plan, rng, target, startNo) {
  const out = [];
  let no = startNo;
  const mk = (giver, text, objectives, rewards, requires) => {
    const id = `act${plan.act}_q${pad(no++)}`;
    return { id, giver, act: plan.act, text, objectives, requires, rewards };
  };
  // pad sides so total hits the spec's per-act count
  const gateCount = plan.beats.length + 1;
  let sidesTotal = plan.beats.reduce((s, b) => s + b.sides, 0);
  let need = target - (startNo - 1) - gateCount - sidesTotal;
  const beats = plan.beats.map((b, k) => ({ ...b, index: k }));
  let i = 0;
  while (need > 0) { if (beats[i % beats.length].g.o[0].type !== 'unlock_zone') { beats[i % beats.length].sides++; need--; } i++; }
  while (need < 0) { const b = beats.find(x => x.sides > 0); b.sides--; need++; }
  let prev = plan.head ? [plan.head[plan.head.length - 1]._id] : [];
  for (const b of beats) {
    const gate = mk(b.g.giver, b.g.text, b.g.o, b.g.r, prev.slice());
    out.push(gate);
    const sideIds = [];
    for (let s = 0; s < b.sides; s++) {
      const f = filler(rng, plan.act, b, s);
      const q = mk(f.giver, f.text, f.o, f.r, [gate.id]);
      out.push(q);
      sideIds.push(q.id);
    }
    prev = [gate.id, ...sideIds];
  }
  const fin = mk(plan.finale.giver, plan.finale.text, plan.finale.o, plan.finale.r, prev);
  out.push(fin);
  return out;
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function weighted(rng, entries) { let t = entries.reduce((s, e) => s + e[1], 0), r = rng() * t; for (const [v, w] of entries) { if ((r -= w) <= 0) return v; } return entries[0][0]; }

const AVOID = { 2: { rosa: 7 }, 3: { victor: 6 }, 4: { lena: 6 } };
function filler(rng, act, beat, idx) {
  let giverPool = { 1: ['beni', 'marlene', 'mateo'], 2: ['tala', 'rosa', 'mateo', 'marlene'], 3: ['kai', 'victor', 'rosa', 'mateo', 'beni'], 4: ['okoye', 'lena', 'tala', 'victor', 'mateo'], 5: ['lena', 'okoye', 'victor', 'beni', 'kai', 'tala'], 6: ['kai', 'beni', 'lena', 'rosa', 'okoye', 'victor', 'marlene'] }[act];
  const avoid = AVOID[act] || {};
  giverPool = giverPool.filter(g => !(avoid[g] && beat.index < avoid[g]));
  const giver = pick(rng, giverPool);
  const kind = weighted(rng, [['deliver', 38], ['create', 18], ['clear', 14], ['merge', 8], ['bonus', 8], ['energy', 7], ['coins', 7]]);
  const [lo, hi] = beat.lv;
  const spec = SPECIALTY[giver];
  let chains = beat.pool.filter(c => !['clearing_tools'].includes(c) || kind === 'create');
  if (spec) { const x = chains.filter(c => spec.includes(c)); if (x.length) chains = x; }
  const chain = pick(rng, chains);
  const maxLvl = Math.min(MAX[chain], hi);
  const L = Math.max(2, Math.min(maxLvl, lo + Math.floor(rng() * (hi - lo + 1))));
  const line = LINES[giver][Math.floor(rng() * LINES[giver].length)];
  const countFor = L <= 3 ? 2 + Math.floor(rng() * 3) : L === 4 ? 2 + Math.floor(rng() * 2) : L === 5 ? 1 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
  const scale = 1 + act * 0.5;
  let o, r;
  switch (kind) {
    case 'deliver': o = [dl(iid(chain, L), countFor)]; break;
    case 'create': o = [cr(iid(chain, Math.min(MAX[chain], L)), L >= 5 ? 1 : 1 + Math.floor(rng() * 2))]; break;
    case 'clear': o = [cl(Math.round((5 + rng() * 8) * (1 + act * 0.15)))]; break;
    case 'merge': o = [{ type: 'merge_count', chain: 'any', count: Math.round((10 + rng() * 25) * (1 + act * 0.2)) }]; break;
    case 'bonus': o = [{ type: 'merge_bonus', size: rng() < 0.5 ? 4 : 5, count: 2 + Math.floor(rng() * 4) }]; break;
    case 'energy': o = [{ type: 'spend_energy', amount: Math.round((30 + rng() * 60) * (1 + act * 0.2)) }]; break;
    default: o = [{ type: 'collect_currency', currency: 'coins', amount: Math.round((80 + rng() * 120) * scale) }];
  }
  const rk = rng();
  if (rk < 0.45) r = [coins(Math.round((20 + rng() * 40) * scale))];
  else if (rk < 0.75) r = [energy(Math.round((8 + rng() * 14) * (1 + act * 0.2)))];
  else if (rk < 0.9) r = [item('sparks_01', 1 + Math.floor(rng() * 2))];
  else r = [item(act >= 3 ? 'chest_03' : 'chest_02')];
  return { giver, text: line, o, r };
}

export function generateQuests() {
  const rng = rngFactory(20261016);
  const all = [];
  for (const plan of PLANS) {
    const target = PLAN_COUNTS[plan.act - 1];
    let startNo = 1;
    let out = [];
    if (plan.head) {
      let prevId = null;
      for (const h of plan.head) {
        const id = `act1_q${pad(startNo++)}`;
        const q = { id, giver: h.giver, act: 1, text: h.text, objectives: h.o, requires: prevId ? [prevId] : [], rewards: h.r };
        out.push(q); prevId = id; h._id = id;
      }
    }
    const body = buildAct(plan, rng, target, startNo);
    out = out.concat(body);
    if (plan.act > 1) out[0].requires = [all[all.length - 1].id];
    if (out.length !== target) throw new Error(`Act ${plan.act} has ${out.length} quests, wanted ${target}`);
    all.push(...out);
  }
  balanceAmulets(all);
  return all;
}

// Soft-lock guard: the amulets a player can have earned from quests that precede a zone's gate quest must cover
// the cumulative amulet cost of that zone. Rewards that sit after the gate are pulled forward onto the gate's prerequisite.
const ZONE_AMULET_COST = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6];
function balanceAmulets(all) {
  const byId = new Map(all.map(q => [q.id, q]));
  const amuletOf = q => (q.rewards || []).filter(r => r.type === 'amulet').reduce((s, r) => s + r.amount, 0);
  // quests that must be finished before quest q (transitive)
  const before = q => { const seen = new Set(), st = [...(q.requires || [])]; while (st.length) { const id = st.pop(); if (seen.has(id)) continue; seen.add(id); st.push(...(byId.get(id).requires || [])); } return seen; };
  let cum = 0;
  all.forEach((gate, gi) => {
    const o = gate.objectives.find(x => x.type === 'unlock_zone'); if (!o) return;
    cum += ZONE_AMULET_COST[o.zone - 1];
    const pre = before(gate);
    const supply = () => [...pre].reduce((s, id) => s + amuletOf(byId.get(id)), 0);
    while (supply() < cum) {
      const src = all.slice(gi + 1).find(q => amuletOf(q) > 0 && !pre.has(q.id)); if (!src) break;
      const amt = amuletOf(src); src.rewards = src.rewards.filter(r => r.type !== 'amulet');
      if (!src.rewards.length) src.rewards = [coins(100)];
      const host = byId.get(gate.requires[gate.requires.length - 1]);
      const ex = host.rewards.find(r => r.type === 'amulet'); if (ex) ex.amount += amt; else host.rewards.push(amulet(amt));
    }
  });
}
