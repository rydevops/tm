import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';
import { VERSION, BUILD, BUILT } from '../js/version.js';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('js/version.js, version.json and package.json agree on the version and build id', () => {
  const vj = JSON.parse(read('version.json'));
  assert.equal(JSON.parse(read('package.json')).version, VERSION);
  assert.equal(vj.version, VERSION);
  assert.equal(vj.build, BUILD);
  assert.equal(vj.built, BUILT);
  assert.ok(/^[0-9a-f]{10}$/.test(BUILD), `build id ${BUILD}`);
  assert.ok(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(BUILT), `built ${BUILT}`);
});

test('sw.js is named after the build, precaches every shipped file and fetches network-first', () => {
  const sw = read('sw.js'), vj = JSON.parse(read('version.json'));
  assert.ok(sw.includes(`const CACHE = 'tropical-merge-${BUILD}';`));
  const list = JSON.parse(/const FILES = (\[[^\]]*\]);/.exec(sw)[1]);
  assert.deepEqual(list.filter(f => f !== './'), vj.files);
  for (const f of ['index.html', 'js/version.js', 'js/view/updater.js', 'js/core/drops.js']) assert.ok(list.includes(f), `${f} is not precached`);
  for (const f of vj.files) read(f); // every listed file exists
  assert.ok(sw.includes("cache: 'reload'"), 'install must bypass the HTTP cache');
  assert.ok(sw.includes("fetch(req.url, { cache: 'no-cache' })"), 'fetches must revalidate with the server');
  assert.ok(sw.includes("endsWith('/version.json')"), 'version.json must never be served from a cache');
});
