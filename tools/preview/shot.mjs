// Usage: node tools/preview/shot.mjs <page.html?query> <out.png> [width height]
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(new URL('../../', import.meta.url).pathname);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); } }); }).listen(0);
const port = srv.address().port;
const [page, out, w = 1100, h = 800] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[console]', m.text()); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:${port}/${page}`);
await p.waitForFunction(() => window.DONE !== undefined, null, { timeout: 30000 }).catch(() => console.log('timeout waiting for DONE'));
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close(); srv.close();
