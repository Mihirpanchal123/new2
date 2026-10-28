// Draws Journey maps to PNG files, the whole map at 2x, the way the game paints them (ground, buildings, people,
// items): for looking over a map while making it. Needs Chrome or Edge (or CHROME_PATH). No npm packages.
// Usage: node tools/mapshot.mjs <outDir> <mapId> [mapId...]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [, , outDir, ...ids] = process.argv;
if (!outDir || !ids.length) { console.log('Usage: node tools/mapshot.mjs <outDir> <mapId> [mapId...]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), file = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (e, d) => e ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(d));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const exe = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-mapshot-'));
const browser = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1200,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { await sleep(250); try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {} }
const ws = new WebSocket(wsUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text); return r.result.result.value; };
const done = code => { try { ws.close(); } catch (e) {} browser.kill(); server.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(code); };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`typeof Journey === 'object'`).catch(() => false)) break; }
if (errors.length) { console.log('the page has errors:\n  ' + errors.join('\n  ')); done(1); }
await ev(`localStorage.clear(); Journey._start(); true`);
await sleep(400);
let bad = 0;
for (const m of ids) {
  try {
    const url = await ev(`Journey._mapShot(${JSON.stringify(m)}, 2)`);
    const file = path.join(outDir, `map-${m}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', file);
  } catch (e) { bad++; console.log(`${m}: ${e.message.split('\n')[0]}`); }
}
done(bad ? 1 : 0);
