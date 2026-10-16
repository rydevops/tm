import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, Data, Board } from '../js/core/index.js';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadDataSync() {
  const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const names = ['chains', 'items', 'generators', 'chests', 'obstacles', 'buildings', 'zones', 'residents', 'pets', 'quests', 'islands', 'economy', 'events'];
  const raw = {};
  for (const n of names) raw[n] = rd(`data/${n}.json`);
  raw.loc = rd('data/loc/en.json');
  return new Data(raw);
}
export function newGame(opts = {}) {
  const data = loadDataSync();
  let t = opts.start ?? 1_800_000_000_000;
  const clock = { now: () => t, advance: ms => { t += ms; }, set: v => { t = v; } };
  const g = Game.create(data, { now: clock.now, seed: opts.seed ?? 12345 });
  return { g, data, clock };
}
/** Blank open test board with only the given land cells. */
export function blankBoard(w = 8, h = 8) {
  const b = new Board(w, h);
  b.land.fill(1);
  return b;
}
