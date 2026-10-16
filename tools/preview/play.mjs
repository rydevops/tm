// Boots the full game in Chromium and runs a script. Usage: node tools/preview/play.mjs <script.mjs>
// The script default-exports async ({page, shot, sleep}) => {}.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(new URL('../../', import.meta.url).pathname);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); } }); }).listen(0);
const port = srv.address().port;
const script = (await import(path.resolve(process.argv[2]))).default;
const [w, hh] = (process.argv[3] || '420x800').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: w, height: hh }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { const t = m.type(); if (['error', 'warning'].includes(t)) { const x = m.text(); if (!/favicon|icon-192|404/.test(x)) { errs.push(x); console.log('[console.' + t + ']', x); } } });
page.on('pageerror', e => { errs.push(e.message); console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.__tm, null, { timeout: 30000 }).catch(() => console.log('app did not start'));
await page.waitForTimeout(800);
const shot = async name => page.screenshot({ path: `/tmp/claude-0/shots/${name}.png` });
const sleep = ms => page.waitForTimeout(ms);
try { await script({ page, shot, sleep, port }); } catch (e) { console.log('[script error]', e.stack || e.message); }
console.log('errors:', errs.length);
await b.close(); srv.close();
