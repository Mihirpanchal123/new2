// Tiny local web server so recording works reliably: node serve.mjs, then open http://localhost:8080
// It also runs the admin page (/admin) and its API (/api/site-config) like Netlify does, keeping the settings in
// server/site-config.local.json instead of Netlify Blobs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './server/site-config-core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.gif': 'image/gif', '.png': 'image/png', '.ogg': 'audio/ogg', '.css': 'text/css', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const CONFIG_FILE = path.join(ROOT, 'server', 'site-config.local.json');
const store = {
  get: async () => { try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) { return null; } },
  set: async c => fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2))
};

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/api/site-config') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 1e5) break; }
    const r = await handle({ method: req.method, body }, process.env, store);
    res.writeHead(r.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(r.json));
    return;
  }
  // the server's own code and data are not for the browser
  if (/^\/(server|netlify|node_modules)(\/|$)/.test(url)) { res.writeHead(404).end('Not found'); return; }
  const file = path.join(ROOT, url === '/' ? 'index.html' : url === '/admin' || url === '/admin/' ? 'admin.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Pokémon Arena running at http://localhost:${PORT}  (admin: http://localhost:${PORT}/admin)  (Ctrl+C to stop)`));
