import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { newGame, ROOT } from './helpers.mjs';
import { NEW_ART } from '../js/view/new-art.js';

const files = () => [...Object.values(NEW_ART.items), ...Object.values(NEW_ART.icons), ...Object.values(NEW_ART.decor).flat(), NEW_ART.banner];
const pngSize = f => { const b = fs.readFileSync(path.join(ROOT, f)); assert.equal(b.subarray(1, 4).toString(), 'PNG', f + ' is not a PNG'); assert.equal(b[25], 6, f + ' must be RGBA (colour type 6)'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('every painted-art file the game loads exists and is a transparent PNG', () => {
  for (const f of new Set(files())) { const [w, h] = pngSize(f); assert.ok(w > 8 && h > 8, f); }
});

test('painted item art only covers whole families, so a level ladder is never half painted and half vector', () => {
  const { data } = newGame();
  const fams = new Set(Object.keys(NEW_ART.items).map(id => data.item(id).chain));
  assert.ok(fams.size >= 1);
  for (const id of Object.keys(NEW_ART.items)) assert.ok(data.item(id), `${id} is not an item`);
  for (const fam of fams) for (const it of data.items.filter(i => i.chain === fam)) assert.ok(NEW_ART.items[it.id], `${it.id} is missing: ${fam} must be painted on every level or none`);
});

test('painted icons and scenery use names the game has', async () => {
  const world = fs.readFileSync(path.join(ROOT, 'js/view/world-art.js'), 'utf8'), decor = fs.readFileSync(path.join(ROOT, 'js/view/island-decor.js'), 'utf8');
  for (const name of Object.keys(NEW_ART.icons)) assert.match(world, new RegExp(`\\b${name}\\(P`), `icon ${name} has no vector fallback to fall back on`);
  for (const kind of Object.keys(NEW_ART.decor)) assert.match(decor, new RegExp(`\\b${kind}\\(P`), `decor ${kind} has no vector fallback`);
});

test('the title banner is on the loading screen and in the offline file list', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /art\/splash-banner\.png/);
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8'));
  for (const f of new Set(files())) assert.ok(v.files.includes(f), `${f} is not in version.json: run npm run build`);
});
