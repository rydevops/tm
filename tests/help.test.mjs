import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './helpers.mjs';
import { eventRules, currencyHelp, itemHelp, zoneRequirementHelp, guideSections } from '../js/view/help.js';

const clean = (t, where) => { assert.equal(typeof t, 'string', where); assert.ok(t.length > 10, `${where}: too short`); assert.ok(!/undefined|NaN|null|\[object/.test(t), `${where}: ${t}`); };

test('every item has a "how to use" line', () => {
  const { g, data } = newGame();
  for (const it of data.items) clean(itemHelp(g, it.id), it.id);
  assert.match(itemHelp(g, 'gen_garden_01'), /Papaya|Hibiscus|Herbs/);
  assert.match(itemHelp(g, 'amulet_02'), /level 5/);
  assert.match(itemHelp(g, 'supplies_05'), /Ticket/);
});

test('every counter, zone requirement and guide section explains itself', () => {
  const { g } = newGame();
  for (const k of ['energy', 'coins', 'pearls', 'amulets', 'tickets', 'xp']) {
    const c = currencyHelp(g, k); clean(c.title + ' ' + c.what, k);
    assert.ok(c.earn.length && c.use.length, k); [...c.earn, ...c.use].forEach(t => clean(t, k));
  }
  const r = g.zoneRequirements(3);
  for (const k of ['level', 'amulets', 'cleared', 'coins']) clean(zoneRequirementHelp(g, k, r), 'zone ' + k);
  // before the Spirit Shrine, the amulet hint points at story quests (the only source then)
  assert.match(zoneRequirementHelp(g, 'amulets', r), /story quests/);
  for (const [head, text] of guideSections(g)) clean(head + ': ' + text, head);
});

test('event rules shown to players match how tokens are really earned', () => {
  for (const id of ['task_track', 'merge_rush', 'festival']) eventRules(id).forEach(t => clean(t, id));
  const run = (tpl, fn) => {
    const { g } = newGame();
    g.s.player.level = 10;
    const e = g.currentEvent();
    g.currentEvent = () => ({ ...e, template: g.data.events.templates.find(t => t.id === tpl), active: true });
    g.eventState();
    fn(g);
    return g.s.event.tokens;
  };
  // Task Track: an item of level 3+ earns its level in tokens; lower levels earn nothing
  assert.equal(run('task_track', g => { g.noteEvent({ type: 'create_item', id: 'banana_05' }); g.noteEvent({ type: 'create_item', id: 'banana_02' }); }), 5);
  // Merge Rush: one token per item merged
  assert.equal(run('merge_rush', g => g.noteEvent({ type: 'merge', size: 5, chain: 'banana' })), 5);
  // Festival: 2 tokens per delivery
  assert.equal(run('festival', g => g.noteEvent({ type: 'deliver', id: 'banana_04', giver: 'beni' })), 2);
});
