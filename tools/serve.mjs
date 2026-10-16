// Tiny static server for local play: node tools/serve.mjs [port]
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(new URL('../', import.meta.url).pathname), port = +process.argv[2] || 8080;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('not found'); } else { res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); } }); }).listen(port, () => console.log(`Tropical Merge on http://localhost:${port}`));
