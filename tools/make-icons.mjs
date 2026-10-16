// Renders the app icons from the game's own procedural art. Usage: node tools/make-icons.mjs
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(new URL('../', import.meta.url).pathname);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); } }); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
const render = async (pad, sizes, names) => {
  await p.goto(`http://localhost:${port}/tools/preview/icon.html?pad=${pad}`);
  await p.waitForFunction(() => window.DONE, null, { timeout: 30000 });
  for (let i = 0; i < sizes.length; i++) {
    const url = await p.evaluate(s => { const src = document.getElementById('c'); const o = document.createElement('canvas'); o.width = o.height = s; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, s, s); return o.toDataURL('image/png'); }, sizes[i]);
    fs.writeFileSync(path.join(root, 'icons', names[i]), Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', names[i]);
  }
};
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
await render(0, [512, 192, 180, 32], ['icon-512.png', 'icon-192.png', 'apple-touch-icon.png', 'favicon-32.png']);
await render(0.1, [512], ['icon-maskable-512.png']);
await b.close(); srv.close();
