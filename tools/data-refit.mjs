// The art team's latest sheet changed the item ladders (fewer, different levels in many chains). The generators in data-chains.mjs,
// data-world.mjs and data-quests.mjs are still written against the LEGACY ladders, so this module is the one place that translates
// everything they produce to the current ladders: item ids, level requirements, names inside texts, and the chain definitions.
// The same old-to-new maps (tools/art-ladders.json, `legacy`) are shipped in data/refit.json so a saved game can be migrated at load.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAINS } from './data-chains.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LADDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/art-ladders.json'), 'utf8'));
const pad = n => String(n).padStart(2, '0');
const LEGACY_NAMES = Object.fromEntries(CHAINS.map(c => [c[0], c[4]]));

/** Level of the current ladder that a legacy level became. Chains without new art keep their level. */
export function mapLevel(chain, level) {
  const f = LADDERS[chain];
  if (!f || !(level >= 1)) return level;
  return f.legacy[Math.min(level, f.legacy.length) - 1];
}

const ID = /^([a-z]+(?:_[a-z]+)*)_(\d{2})$/;
export function remapId(id) {
  const m = typeof id === 'string' && ID.exec(id);
  return m && LADDERS[m[1]] ? `${m[1]}_${pad(mapLevel(m[1], +m[2]))}` : id;
}

/** Walks any JSON-like value and rewrites every legacy item id (values and object keys) and every {chain, minLevel} requirement. */
export function remapDeep(v) {
  if (typeof v === 'string') return remapId(v);
  if (Array.isArray(v)) return v.map(remapDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[remapId(k)] = remapDeep(x);
    if (typeof v.chain === 'string' && typeof v.minLevel === 'number' && LADDERS[v.chain]) out.minLevel = mapLevel(v.chain, v.minLevel);
    return out;
  }
  return v;
}

/** Chain tuples with the new level names, display name, collect values and ticket level. */
export function refitChains() {
  return CHAINS.map(([key, name, family, zone, levels, o]) => {
    const f = LADDERS[key];
    if (!f) return [key, name, family, zone, levels, o];
    const opts = { ...o };
    if (f.collect) opts.collect = f.collect;
    if (f.ticketLevel) opts.ticketLevel = f.ticketLevel;
    return [key, f.name || name, family, zone, f.levels, opts];
  });
}

// ---- names inside texts
// Texts are written with the current names. staleNames finds retired multi-word item names that survive in a sentence (single words such
// as "Log" or "Hen" are ordinary prose, so they are not policed), unless the same words are a current item name.
const current = new Set([...Object.values(LADDERS).flatMap(f => f.levels), ...CHAINS.filter(c => !LADDERS[c[0]]).flatMap(c => c[4])]);
const retired = Object.entries(LADDERS).flatMap(([k]) => LEGACY_NAMES[k]).filter((n, i, a) => n.includes(' ') && !current.has(n) && a.indexOf(n) === i);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RETIRED_RE = retired.length ? new RegExp(`\\b(${[...retired].sort((a, b) => b.length - a.length).map(escRe).join('|')})\\b`, 'g') : null;
export const staleNames = text => (typeof text === 'string' && RETIRED_RE ? [...text.matchAll(RETIRED_RE)].map(m => m[1]) : []);

/** Sum the counts of repeated item entries ([id, n] pairs or {item, count} objects) that remapping may have made identical. */
export function mergePairs(list) {
  const out = [];
  for (const e of list) {
    const id = Array.isArray(e) ? e[0] : e.item;
    const hit = out.find(x => (Array.isArray(x) ? x[0] : x.item) === id);
    if (!hit) { out.push(Array.isArray(e) ? [...e] : { ...e }); continue; }
    if (Array.isArray(hit)) hit[1] += e[1]; else hit.count = (hit.count || 1) + (e.count || 1);
  }
  return out;
}

/** The file the game ships to migrate older saves: for each refit chain, old level -> new level, and the new ladder length. */
export function refitManifest() {
  return {
    version: 2,
    chains: Object.fromEntries(Object.entries(LADDERS).map(([k, f]) => [k, { levels: f.levels.length, legacy: f.legacy, oldNames: LEGACY_NAMES[k] }]))
  };
}
