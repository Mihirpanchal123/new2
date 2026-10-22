// Bakes 2.5D sprite sheets for the Retro 2D mode from the 3D models (offline, build time).
//
//   node tools/bake-25d.mjs bulbasaur grovyle mewtwo dragonite
//
// The game must be served (start.bat / node serve.mjs) and Chrome must be running with remote debugging:
//   chrome --headless=new --remote-debugging-port=9334
// (set CHROME_PORT to use another port). Models are read from ./models, or from git history when that
// folder is gone:  MODELS_REV=b596552 node tools/bake-25d.mjs ...   (the commit before the models were removed)
// Output: sprites25d/<species>.png (one row per animation) and sprites25d/manifest.json. Species without a
// usable model are skipped; the game keeps their normal pixel sprite.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'sprites25d');
const PORT = process.env.CHROME_PORT || 9334;
const REV = process.env.MODELS_REV || '';
const species = process.argv.slice(2);
if (!species.length) { console.log('usage: node tools/bake-25d.mjs <species...>'); process.exit(1); }

const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'models.js'), 'utf8'), ctx);
const MODELS = ctx.window.MODELS;
// the model's file: from the working tree, else from the given git revision (binary-safe)
function modelBytes(file) {
  const p = path.join(ROOT, file);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  if (!REV) return null;
  const rel = path.relative(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: ROOT }).toString().trim(), p).replace(/\\/g, '/');
  try { return execFileSync('git', ['show', `${REV}:${rel}`], { cwd: ROOT, maxBuffer: 64 << 20 }); } catch { return null; }
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json().catch(() => null);
const target = list && list.find(t => t.type === 'page');
if (!target) { console.error(`No Chrome on port ${PORT}. Start: chrome --headless=new --remote-debugging-port=${PORT}`); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'bake failed'); return r.result.result.value; };
await send('Page.navigate', { url: 'http://localhost:8080/tools/bake-25d.html' });
for (let i = 0; i < 50 && !(await ev('!!window.bakerReady').catch(() => false)); i++) await new Promise(r => setTimeout(r, 200));

fs.mkdirSync(OUT, { recursive: true });
const manPath = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
for (const sp of species) {
  const m = MODELS[sp];
  const bytes = m && modelBytes(m.file);
  if (!bytes) { console.log(`${sp}: no model available - skipped (keeps its pixel sprite)`); continue; }
  // sprite height in art pixels: from the real size, in the same range as the hand-made sprites
  const heightPx = Math.round(Math.min(112, Math.max(54, 46 + m.height * 30)));
  try {
    const r = await ev(`bake(${JSON.stringify({ glbBase64: bytes.toString('base64'), heightPx })})`);
    fs.writeFileSync(path.join(OUT, sp + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    manifest[sp] = { file: `sprites25d/${sp}.png`, ...r.meta };
    console.log(`${sp}: ${Object.entries(r.meta.clips).map(([k, c]) => `${k} ${c.n}f`).join(', ')}  (${r.meta.fw}x${r.meta.fh} px frames)`);
  } catch (e) { console.log(`${sp}: bake failed - ${e.message.split('\n')[0]}`); }
}
fs.writeFileSync(manPath, JSON.stringify(manifest, null, 1));
process.exit(0);
