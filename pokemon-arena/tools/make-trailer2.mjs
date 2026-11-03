// Makes the trailer for Journey II - The Lost Days of Meridia - from the game itself, the way tools/make-trailer.mjs
// makes Journey 1's: a director script inside the page stages real shots and records the tab with the browser's
// MediaRecorder (the picture: a capture of the tab, so menus, dialog and battle HUD are in it; the sound: the game's
// Web Audio, tapped where it leaves for the speakers). Act 1 is the opening film (m2intro.js) cut to the trailer's
// score with title cards between its scenes; Act 2 is the game, in story order: Meridia's towns, the lost day and the
// clue notebook, Cassius, the Echo and Nell, the ghost train, catching, the Gala heist, surfing, a Warden, Okafor's
// secret, Juno's rain battle, the Long Night and Fly, Cassius, the Warden of the Veil, the Champion, a new day.
// --cut=film records the opening film on its own instead, whole, with its own music.
// Runs headless in Chrome or Edge; no npm packages, no ffmpeg.
// Usage: node tools/make-trailer2.mjs [--cut=trailer|film] [--out=videos/journey2-trailer.mp4] [--webm] [--size=1280x720] [--show]
//   --cut   trailer (default: videos/journey2-trailer.mp4) or film (default: videos/journey2-opening.mp4)
//   --webm  record WebM (VP9 / Opus) instead of MP4 (H.264 / AAC)
//   --stills=<dir>  also save a still of every shot there (a contact sheet to check the cut by)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { remux } from './remux-mp4.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const WEBM = !!arg('webm', false), SHOW = !!arg('show', false), STILLS = arg('stills', '');
const [W, H] = String(arg('size', '1280x720')).split('x').map(Number);
const CUT = arg('cut', 'trailer') === 'film' ? 'film' : 'trailer';
const OUT = path.resolve(ROOT, arg('out', `videos/${CUT === 'film' ? 'journey2-opening' : 'journey2-trailer'}.${WEBM ? 'webm' : 'mp4'}`));
const t0 = Date.now(), stamp = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's';

// ---- a static server for the game, and the browser over the DevTools protocol
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.ogg': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end('Not found'); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browserPath = arg('browser', process.env.CHROME_PATH) || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => fs.existsSync(p));
if (!browserPath) { console.log('No Chrome or Edge found: pass --browser=<path> or set CHROME_PATH'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'journey2-trailer-'));
const browser = spawn(browserPath, [...(SHOW ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
  '--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) { await sleep(250); try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = tabs.find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {} }
if (!wsUrl) { console.log('The browser did not start'); process.exit(2); }
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.onopen = r);
let msgId = 0;
const pending = new Map(), problems = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; problems.push('JS error: ' + ((d.exception && d.exception.description) || d.text).split('\n').slice(0, 3).join(' | ')); }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'log'].includes(m.params.type)) { const s = m.params.args.map(a => a.description || a.value).join(' '); if (s.startsWith('[trailer]')) { lastLog = Date.now(); console.log(stamp() + '  ' + s.slice(10)); if (STILLS) still(s.slice(10)); } else if (m.params.type === 'error') problems.push('console.error: ' + s.split('\n')[0]); }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
// the director logs every shot; a long silence means it is stuck: say where, with a picture, and stop
let lastLog = Date.now();
setInterval(async () => {
  if (Date.now() - lastLog < 45000) return;
  lastLog = Date.now() + 1e9;
  console.log('FAILED: no new shot for 45 s - the director is stuck');
  try { console.log('  game:', await ev('JSON.stringify({ map: Journey._S().map && Journey._S().map.id, event: !!Journey._S().event, menu: Journey._S().menu, battle: !!Journey._S().battle, dialog: Journey._S().dialog && Journey._S().dialog.full })')); const shot = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(os.tmpdir(), 'journey2-trailer-stuck.png'); fs.writeFileSync(f, Buffer.from(shot.result.data, 'base64')); console.log('  screenshot:', f); } catch (e) {}
  if (problems.length) console.log('  ' + problems.join('\n  '));
  quit(1);
}, 2000);
// a still of a shot a moment after it starts
let stillN = 0;
function still(s) {
  const m = /^\s*[\d.]+s\s+(.+)$/.exec(s); if (!m || /^done/.test(m[1])) return;
  const name = String(++stillN).padStart(2, '0') + '-' + m[1].replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) + '.jpg';
  setTimeout(async () => { try { const d = await ev('__trailer.still()'); if (d) { fs.mkdirSync(STILLS, { recursive: true }); fs.writeFileSync(path.join(STILLS, name), Buffer.from(d.split(',')[1], 'base64')); } } catch (e) { console.log('  (no still: ' + e.message + ')'); } }, 1600);
}
const send = (method, params = {}) => new Promise(r => { const i = ++msgId; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
async function ev(expr, gesture = false) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture });
  if (r.result && r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
  return r.result.result.value;
}
async function quit(code) { try { ws.close(); } catch (e) {} browser.kill(); server.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(code); }
await send('Page.enable'); await send('Runtime.enable');
// the tab capture records the window's real page area, so size the window until that area is exactly W x H
// (an emulated viewport would be laid out at W x H but captured at the window's size, cut off)
async function fitWindow() {
  for (let i = 0; i < 4; i++) {
    const [iw, ih] = await ev('[innerWidth, innerHeight]');
    if (iw === W && ih === H) return;
    const win = await send('Browser.getWindowForTarget'), b = (await send('Browser.getWindowBounds', { windowId: win.result.windowId })).result.bounds;
    await send('Browser.setWindowBounds', { windowId: win.result.windowId, bounds: { width: b.width + W - iw, height: b.height + H - ih } });
    await sleep(400);
  }
  const [iw, ih] = await ev('[innerWidth, innerHeight]');
  if (iw !== W || ih !== H) console.log(`note: the page area is ${iw}x${ih}, not ${W}x${H}`);
}
await fitWindow();
await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`typeof Journey === 'object' && typeof MIntro === 'object' && typeof MStory === 'object' && typeof Retro === 'object'`).catch(() => false)) break; }
await sleep(800);

// =====================================================================
//  The director (runs inside the page)
// =====================================================================
function director(opt) {
  const W8 = ms => new Promise(r => setTimeout(r, ms));
  const log = s => console.log('[trailer] ' + s);
  const $ = s => document.querySelector(s);

  // ---- sound: everything the game sends to the speakers also goes to the recording; cries (<audio>) are routed in
  const taps = new Map();
  const connect0 = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) {
    const r = connect0.call(this, dest, ...a);
    if (dest instanceof AudioDestinationNode) { const c = this.context; if (!taps.has(c)) taps.set(c, c.createMediaStreamDestination()); if (!window.__trCtx) window.__trCtx = c; connect0.call(this, taps.get(c)); }
    return r;
  };
  const Audio0 = window.Audio;
  window.Audio = function (src) { const a = new Audio0(src); const c = window.__trCtx; if (c) { try { c.createMediaElementSource(a).connect(c.destination); } catch (e) {} } return a; };

  // ---- the overlay: black cover, title cards, lower-third captions
  const css = document.createElement('style');
  css.textContent = `
  #fpsMeter, #recBtn, #battleCtl, .ji-skip, .jmenu-btn, .jt-menu { display: none !important; }
  #tr { position: fixed; inset: 0; z-index: 100000; pointer-events: none; font-family: 'Tiny5', monospace; color: #fff; }
  #tr .blk { position: absolute; inset: 0; background: #000; opacity: 1; transition: opacity .35s; }
  #tr .blk.off { opacity: 0; }
  #tr .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; opacity: 0; transition: opacity .3s; }
  #tr .card.on { opacity: 1; }
  #tr .card b { font-weight: 400; font-size: 58px; letter-spacing: .08em; color: #fff; text-shadow: 0 0 24px rgba(160,140,255,.55), 0 4px 0 #1b1530; }
  #tr .card i { font-style: normal; font-size: 30px; letter-spacing: .14em; color: #ffd84a; text-shadow: 0 3px 0 #1b1530; }
  #tr .card.on b { animation: trIn 2.6s cubic-bezier(.15,.8,.25,1) both; }
  #tr .card.on i { animation: trIn 2.6s .25s cubic-bezier(.15,.8,.25,1) both; }
  #tr .card.logo b { font-size: 92px; letter-spacing: .04em; color: transparent; background: linear-gradient(100deg, #ffd84a 0 42%, #fff8d6 50%, #ffd84a 58% 100%); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 5px 0 #a35a00) drop-shadow(0 5px 0 #1b1530) drop-shadow(0 0 26px rgba(255,216,74,.55)); text-shadow: none; }
  #tr .card.logo.on b { animation: trSlam .6s cubic-bezier(.2,1.5,.4,1) both, trShine 2.4s .6s ease-in-out infinite; }
  #tr .card.logo i { color: #cfe3ff; font-size: 34px; }
  #tr .card small { font-size: 22px; color: #e8e4ff; letter-spacing: .12em; opacity: 0; transition: opacity .8s 1s; }
  #tr .card.on small { opacity: .9; }
  #tr .card .tags { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; max-width: 1000px; }
  #tr .card .tags span { font-size: 18px; padding: 6px 12px; border: 2px solid rgba(255,216,74,.7); border-radius: 999px; color: #ffe9a8; opacity: 0; animation: trPop .4s both; }
  #tr .low { position: absolute; left: 56px; bottom: 74px; display: flex; flex-direction: column; gap: 6px; padding: 12px 22px 14px 20px; border-left: 6px solid #ffd84a; background: linear-gradient(90deg, rgba(10,6,24,.86), rgba(10,6,24,0)); transform: translateX(-40px); opacity: 0; transition: transform .45s cubic-bezier(.2,.9,.2,1), opacity .35s; }
  #tr .low.on { transform: none; opacity: 1; }
  #tr .low.br, #tr .low.tr { left: auto; right: 56px; align-items: flex-end; text-align: right; border-left: 0; border-right: 6px solid #ffd84a; padding: 12px 20px 14px 22px; background: linear-gradient(270deg, rgba(10,6,24,.86), rgba(10,6,24,0)); transform: translateX(40px); }
  #tr .low.tr { bottom: auto; top: 64px; }
  #tr .low.br.on, #tr .low.tr.on { transform: none; }
  #tr .low b { font-weight: 400; font-size: 40px; letter-spacing: .06em; text-shadow: 0 3px 0 #000; }
  #tr .low i { font-style: normal; font-size: 20px; color: #ffd84a; letter-spacing: .1em; text-shadow: 0 2px 0 #000; }
  #tr .fl { position: absolute; inset: 0; background: #fff; opacity: 0; }
  #tr .fl.go { animation: trFlash .5s ease-out both; }
  @keyframes trIn { from { letter-spacing: .5em; opacity: 0; filter: blur(4px); } 30% { opacity: 1; filter: none; } }
  @keyframes trSlam { from { transform: scale(2.4); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
  @keyframes trShine { 0% { background-position: 100% 0; } 55%, 100% { background-position: 0 0; } }
  @keyframes trFlash { from { opacity: .9; } to { opacity: 0; } }
  @keyframes trPop { from { transform: translateY(10px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }`;
  document.head.append(css);
  const tr = document.createElement('div'); tr.id = 'tr';
  tr.innerHTML = '<div class="blk"></div><div class="low"><b></b><i></i></div><div class="card"><b></b><i></i><small></small><div class="tags"></div></div><div class="fl"></div>';
  document.body.append(tr);
  const blk = tr.querySelector('.blk'), low = tr.querySelector('.low'), card = tr.querySelector('.card'), fl = tr.querySelector('.fl');
  const cover = on => blk.classList.toggle('off', !on);
  function showCard(big, sub = '', o = {}) {
    card.className = 'card' + (o.logo ? ' logo' : '');
    card.querySelector('b').textContent = big; card.querySelector('i').textContent = sub;
    card.querySelector('small').textContent = o.small || '';
    card.querySelector('.tags').innerHTML = (o.tags || []).map((t, i) => `<span style="animation-delay:${1.2 + i * 0.12}s">${t}</span>`).join('');
    void card.offsetWidth; card.classList.add('on');
  }
  const hideCard = () => card.classList.remove('on');
  // a caption in a corner the shot leaves free: bl (bottom left), br (bottom right: battles keep their moves bottom left), tr (top right: the dialog box is at the bottom)
  function caption(big, sub = '', at = 'bl') { if (!big) { low.classList.remove('on'); return; } low.querySelector('b').textContent = big; low.querySelector('i').textContent = sub; low.className = 'low ' + at; void low.offsetWidth; low.classList.add('on'); }
  const flash = () => { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); };

  // ---- the score: the game's own synth voices, the game's music silenced (its sound effects stay)
  const MU = AudioFX.Music, note = MU.note.bind(MU), hit = MU.hit.bind(MU), now = () => AudioFX.synth.now();
  MU.stop(); MU.start = () => {}; MU.victory = () => {}; MU.setLevel = () => {};
  try { AudioFX.Crowd.start = () => {}; AudioFX.Crowd.stop && AudioFX.Crowd.stop(); } catch (e) {}
  const Score = {
    mode: 'off', step: 0, next: 0, timer: null,
    PROG: [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'M']],
    LEAD: [[74, 0, 0, 0, 77, 0, 0, 0, 81, 0, 79, 0, 77, 0, 76, 0], [74, 0, 0, 0, 77, 0, 0, 0, 82, 0, 0, 0, 81, 0, 79, 0], [76, 0, 0, 0, 79, 0, 0, 0, 84, 0, 0, 0, 82, 0, 81, 0], [73, 0, 0, 0, 76, 0, 0, 0, 81, 0, 0, 0, 79, 0, 76, 0]],
    set(mode) { this.mode = mode; this.step = 0; this.next = now() + 0.05; if (!this.timer) this.timer = setInterval(() => this.tick(), 25); },
    tick() {
      const t = now(); if (!t || this.mode === 'off') return;
      const bpm = this.mode === 'drive' ? 140 : 76, sd = 60 / bpm / 4;
      while (this.next < t + 0.15) { this.play(this.step, this.next, sd); this.next += sd; this.step++; }
    },
    play(i, t, sd) {
      const bar = Math.floor(i / 16), s = i % 16, [root, q] = this.PROG[bar % 4], ch = [root, root + (q === 'm' ? 3 : 4), root + 7];
      if (this.mode === 'legend') {
        if (s === 0) { ch.forEach(m => { note('sawtooth', m, t, sd * 16, 0.028, 900); note('triangle', m + 12, t, sd * 16, 0.03, 2000); }); note('sine', root - 24, t, sd * 15, 0.16, 400); }
        if (s === 0 || s === 8) hit('kick', t, s ? 0.25 : 0.4);
        if (s % 4 === 2) hit('hat', t, 0.02);
        if (s === 6 || s === 14) note('triangle', ch[(bar + s) % 3] + 24, t, sd * 6, 0.03, 4000);
      } else if (this.mode === 'rise') {
        // a snare roll and a climbing tone into the title
        hit('snare', t, 0.05 + Math.min(0.25, i * 0.006)); if (s % 2 === 0) hit('hat', t, 0.05);
        if (s === 0) note('sawtooth', 45 + bar * 2, t, sd * 16, 0.05, 1200 + bar * 600);
      } else if (this.mode === 'drive') {
        if (s === 0) ch.forEach(m => { note('sawtooth', m, t, sd * 16, 0.026, 1300); note('sawtooth', m + 0.08, t, sd * 16, 0.018, 1000); });
        if (s % 4 === 0) hit('kick', t, 0.55);
        if (s === 4 || s === 12) hit('snare', t, 0.24);
        hit('hat', t, s % 4 === 2 ? 0.06 : 0.03);
        if (s % 2 === 0) note('sawtooth', root - 12 + (s === 14 ? 7 : 0), t, sd * 1.8, 0.12, 700);
        note('square', [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24][s % 4], t, sd * 0.9, 0.018, 2600);
        const m = this.LEAD[bar % 4][s]; if (m && bar % 8 >= 4) note('square', m, t, sd * 3.5, 0.035, 3800);
        if (m && bar % 8 >= 4) note('triangle', m - 12, t, sd * 3.5, 0.03, 3000);
      }
    },
    boom(big = 1) { const t = now() + 0.01; hit('kick', t, 0.9 * big); note('sawtooth', 33, t, 2.2, 0.18 * big, 500); note('sine', 45, t, 2, 0.2 * big, 300); try { AudioFX.SFX.rumble(1.2); } catch (e) {} },
    chord(big = 1) { const t = now() + 0.02; [50, 57, 62, 65, 69].forEach(m => note('sawtooth', m, t, 4, 0.03 * big, 2200)); note('sine', 33, t, 4, 0.2, 400); hit('kick', t, 0.9); }
  };

  // ---- the game (Journey II: the world Meridia)
  const J = () => Journey._J, G = () => Journey._G(), S = () => Journey._S(), TS = 16;
  const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key|^Arrow/, ''), bubbles: true }));
  const tap = code => { key('keydown', code); key('keyup', code); };
  const busy = () => S().dialog || S().event || S().battle || S().menu || S().evoStop;
  // clear whatever the game is in the middle of (behind the black cover)
  async function drain(ms = 8000) {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const s = S();
      if (s.evoStop) s.evoStop();
      else if (s.dialog) tap('Enter');
      else if (s.menu) Journey._close ? Journey._close() : tap('Escape');
      else if (s.battle) { try { Retro.journey.finish({ ran: true }); } catch (e) {} }
      else if (!s.event) {
        const box = document.querySelector('#journey .jdialog'); if (box) box.classList.add('hidden');
        return;
      }
      await W8(120);
    }
  }
  const DEXM = POKEDEX.moves;
  function mon(species, level, moves, extra = {}) {
    const m = Prog.newMon(species, level, { met: 'Meridia' });
    if (moves) { m.moves = moves.filter(id => DEXM[id]); m.pp = m.moves.map(id => DEXM[id].pp); }
    return Object.assign(m, extra);
  }
  // a save near the end of the story: every chapter done, every badge, a strong team, the Lapras and the Corviknight
  function save0() {
    Journey._world('meridia');
    const g = Journey._newGame('Kai', 'red'), C = MStory.CHAPTERS;
    for (const f of ['intro', 'shoes', 'starter', 'dex', 'film', 'notebook']) g.flags[f] = true;
    for (const c of Object.values(C)) for (const f of c.goals) g.flags[f] = true;
    for (const m of Object.values(MMaps.M)) for (const n of m.npcs || []) if (n.trainer) g.flags['tr.' + m.id + '.' + n.id] = true;
    Object.assign(g.flags, { rivalStarter: 'mudkip', mystarter: 'cyndaquil', 'ride.surf': true, 'ride.fly': true, longnight: true, dawn: true });
    g.badges = MStory.BADGES.map(b => b.id);
    for (const b of g.badges) g.flags['badge.' + b] = true;
    g.visited = Object.values(MMaps.M).filter(m => m.fly && !m.echoOf).map(m => m.id);
    g.money = 87650; g.repel = 99999; g.time = 41 * 3600 + 8 * 60;
    g.party = [
      mon('typhlosion', 62, ['eruption', 'flamethrower', 'focus-blast', 'fire-blast']),
      mon('greninja', 61, ['hydro-pump', 'dark-pulse', 'ice-beam', 'water-shuriken']),
      mon('lucario', 61, ['aura-sphere', 'flash-cannon', 'close-combat', 'dragon-pulse']),
      mon('corviknight', 60, ['brave-bird', 'iron-head', 'body-press', 'drill-peck']),
      mon('lapras', 60, ['surf', 'ice-beam', 'freeze-dry', 'thunderbolt']),
      mon('gardevoir', 60, ['moonblast', 'psychic', 'shadow-ball', 'thunderbolt'])];
    g.bag = { shoes: 1, pokedex: 1, notebook: 1, expshare: 1, potion: 12, superpotion: 8, hyperpotion: 5, revive: 4, fullheal: 3, great: 10, ultra: 6 };
    POKEDEX.order.forEach((s, i) => { if (i < 230 && (i * 7) % 10 < 8) { g.dex.seen[s] = true; if ((i * 3) % 5 < 3) g.dex.caught[s] = true; } });
    for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
    const st = MMaps.M.tidemark.fly; g.map = 'tidemark'; g.x = st.x * TS + 8; g.y = st.y * TS + 13; g.dir = 'down';
    return g;
  }
  const heal = () => { for (const m of G().party) Prog.healFull(m); };
  // walk about: the longest open way from here, turning when blocked (on the water too, while surfing)
  async function wander(ms, run = false) {
    const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    // (surfing: only the water, so the ride does not end on the first beach)
    const open = (x, y) => { const s = S(); if (!s.solid[y] || s.solid[y][x] === undefined) return false; return s.surf ? s.map.rows[y][x] === '~' : !s.solid[y][x]; };
    const runFrom = ([dx, dy]) => { const [x, y] = Journey._tile(); let k = 0; while (k < 14 && open(x + dx * (k + 1), y + dy * (k + 1))) k++; return k; };
    const end = performance.now() + ms;
    let held = null, last = null, stuck = 0;
    if (run) key('keydown', 'ShiftLeft');
    while (performance.now() < end) {
      if (busy()) { if (held) { key('keyup', held); held = null; } await W8(100); continue; }
      const p = S().player, here = p.x + ',' + p.y;
      if (!held || (here === last && ++stuck > 2)) {
        if (held) key('keyup', held);
        const opts = Object.entries(DIR).map(([k, d]) => [k, runFrom(d) + (k === held ? -5 : 0) + (k === 'ArrowLeft' || k === 'ArrowRight' ? 1.5 : 0)]).sort((a, b) => b[1] - a[1]);
        held = opts[0][0]; key('keydown', held); stuck = 0;
      } else if (here !== last) stuck = 0;
      last = here;
      await W8(140);
    }
    if (held) key('keyup', held);
    if (run) key('keyup', 'ShiftLeft');
  }
  // in a battle: our side picks attacking moves (never a status move), the way a player taps them
  let fightT = null;
  function fight(on) {
    clearInterval(fightT); fightT = null; if (!on) return;
    fightT = setInterval(() => {
      const row = document.getElementById('rrow0'); if (!row || typeof state === 'undefined' || !state.players) return;
      const P = state.players[0], u = P.team[P.active]; if (!u) return;
      const b = [...row.querySelectorAll('.rmv:not([disabled])')].filter(x => u.moves[+x.dataset.i] && u.moves[+x.dataset.i].cat !== 'status' && !x.classList.contains('q'));
      if (b.length) b[Math.floor(Math.random() * b.length)].click();
    }, 450);
  }
  const waitFor = async (fn, ms = 8000) => { const end = performance.now() + ms; while (performance.now() < end) { if (fn()) return true; await W8(60); } return false; };
  async function battleOn(start) { const old = document.getElementById('rrow0'); start(); await waitFor(() => { const r = document.getElementById('rrow0'); return r && r !== old && S().battle && (!Retro._debug || Retro._debug().T > 0.15); }, 15000); await W8(150); }
  async function endBattle() { fight(false); await drain(); heal(); }
  // to a map, on the nearest open tile to (x, y) (water counts while surfing)
  async function warp(id, x, y, dir = 'down') {
    Journey._warp(id, x, y, dir); await W8(80);
    const s = S(), ok = (a, b) => !!s.solid[b] && s.solid[b][a] !== undefined && (!s.solid[b][a] || (s.surf && s.map.rows[b][a] === '~'));
    if (!ok(x, y)) { let best = null; for (let r = 1; r < 12 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dy) === r) && ok(x + dx, y + dy)) { best = [x + dx, y + dy]; break; } if (best) Journey._warp(id, best[0], best[1], dir); }
    await W8(220);
  }
  const spot = id => { const m = MMaps.M[id]; return m.fly || m.arrive || { x: m.w >> 1, y: m.h >> 1 }; };
  async function walkAbout(id, ms, run, at) { const p = at || spot(id); await warp(id, p.x, p.y, p.dir || 'down'); cover(false); await wander(ms, run); cover(true); await W8(330); await drain(1500); }
  // a line of the story, said where it happens
  async function line(map, x, y, dir, text, who) {
    await warp(map, x, y, dir);
    const said = J().say(text, who); await W8(150); cover(false);
    await W8(Math.max(2300, text.length * 34)); cover(true); await W8(330); tap('Enter'); await said.catch(() => {}); await drain(1500);
  }

  // ---- the shots
  let scr = null;
  async function capture() {
    key('keydown', 'ShiftRight'); key('keyup', 'ShiftRight');
    await waitFor(() => window.__trCtx, 3000);
    if (window.__trCtx && window.__trCtx.state !== 'running') await window.__trCtx.resume();
    scr = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, width: opt.w, height: opt.h }, audio: false, preferCurrentTab: true });
    return true;
  }
  async function run() {
    const aud = taps.get(window.__trCtx);
    const tracks = [...scr.getVideoTracks(), ...(aud ? aud.stream.getAudioTracks() : [])];
    const types = opt.webm ? ['video/webm;codecs=vp9,opus', 'video/webm'] : ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus'];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 6_000_000, videoKeyFrameIntervalDuration: 1000, audioBitsPerSecond: 192_000 });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const stopped = new Promise(r => rec.onstop = r);
    log(`recording ${scr.getVideoTracks()[0].getSettings().width}x${scr.getVideoTracks()[0].getSettings().height} as ${mime}${aud ? ' with sound' : ' (no sound)'}`);
    rec.start(1000);
    const T0 = performance.now(), mark = s => log(`${((performance.now() - T0) / 1000).toFixed(1).padStart(5)}s  ${s}`);
    const look = OUTFITS.red;
    Journey._world('meridia');

    if (opt.cut === 'film') {
      // ===== The opening film, whole, with its own music
      mark('the opening film');
      const done = MIntro.play({ name: 'Kai', look });
      await waitFor(() => MIntro._scene(), 6000); cover(false);
      let sc = null;
      while (MIntro.playing) { const s = MIntro._scene(); if (s && s !== sc) { sc = s; mark('film: ' + s); } await W8(200); }
      await done; await W8(600);
    } else {
      // ===== Act 1: the legend (the opening film, cut to the trailer's score)
      Score.set('legend');
      mark('cold open');
      MIntro.play({ name: 'Kai', look, noScore: true });
      showCard('POKéMON ARENA', 'PRESENTS'); Score.boom(0.6);
      await waitFor(() => MIntro._scene(), 6000);
      await W8(2200); hideCard(); await W8(300);
      MIntro._jump('coast'); await W8(200); cover(false); mark('film: the eight lights'); await W8(5400);
      MIntro._jump('lanternfolk'); mark('film: the Lantern-folk seal the Echo'); await W8(7900);
      cover(true); await W8(350);
      showCard('THEY KEPT A DOOR SHUT', 'FOR A THOUSAND YEARS'); Score.boom(); await W8(2300); hideCard(); await W8(250);
      MIntro._jump('echo'); await W8(150); cover(false); mark('film: the Echo'); await W8(4600);
      MIntro._jump('festival'); mark('film: Lantern Night'); await W8(4800);
      MIntro._jump('midnight'); mark('film: midnight'); await W8(8600);
      cover(true); await W8(350);
      showCard('NOW THE DAYS ARE VANISHING', 'AND NO ONE REMEMBERS'); Score.boom(1.1); await W8(2400); hideCard(); await W8(250);
      MIntro._jump('brassport'); await W8(150); cover(false); mark('film: Brassport'); await W8(8600);
      MIntro._jump('nell'); mark('film: the girl in grey'); await W8(6800);
      cover(true); await W8(350);
      showCard('ONLY YOU REMEMBER', 'YOU AND YOUR PARTNER'); Score.boom(); await W8(2300); hideCard(); await W8(250);
      MIntro._jump('veil'); await W8(150); cover(false); mark('film: Frostcrown'); await W8(9400);
      cover(true); await W8(350);
      showCard('SOMEONE IS STEALING', 'THE LOST DAYS'); Score.boom(1.2); await W8(2300); hideCard();
      Score.set('rise'); await W8(1400);
      MIntro._jump('title'); await W8(100); cover(false); Score.set('off'); mark('film: the title');
      await W8(1350); Score.chord(); await W8(3700);
      cover(true); await W8(400);
      MIntro._skip(); await W8(500);

      // ===== Act 2: the game
      Journey._start(save0());
      await W8(700); await drain(2000);
      Score.set('drive'); mark('gameplay');
      // the region
      caption('EXPLORE MERIDIA', '12 CHAPTERS · TOWNS, CITIES, JUNGLES & ISLES');
      mark('exploring');
      await walkAbout('tidemark', 2300);
      await walkAbout('brassport_s', 2100, true);
      await walkAbout('mossgrove', 2000);
      await walkAbout('wildheart', 2000, true, { x: 24, y: 18 });
      await walkAbout('saltmere', 2000);
      await walkAbout('highwatch', 2100, true);
      caption(null);
      // the mystery
      caption('A MYSTERY TO SOLVE', 'WHO IS STEALING THE LOST DAYS?', 'tr');
      mark('story: the lost day');
      await line('tidemark', 14, 15, 'down', '...Today? But Lantern Night was yesterday. Your partner looks up at you. It remembers too.');
      { const p = spot('tidemark'); await warp('tidemark', p.x, p.y); }
      Journey._menu('notebook'); await W8(150); cover(false); mark('the clue notebook'); await W8(2300);
      cover(true); await W8(330); Journey._close(); await drain();
      await line('brassport_n', 19, 14, 'up', 'Because nobody - NOBODY - should ever have to lose what they love.', { name: 'Cassius Vale', look: 'cassius' });
      caption(null);
      // the Echo
      caption('CROSS INTO THE ECHO', 'A GREY WORLD WHERE LOST MOMENTS ARE KEPT');
      mark('the Echo');
      await walkAbout('echo_oldrail', 2400, false, { x: 13, y: 22, dir: 'up' });
      await line('echo_oldrail', 12, 24, 'up', 'Who am I? ...I don\'t know. I\'ve been here a long time. Time doesn\'t really go, here.', { name: 'Nell', look: 'nell' });
      caption('RIDE THE GHOST TRAIN', 'THE LANTERN EXPRESS, LOST 20 YEARS AGO');
      await walkAbout('ghosttrain1', 2200, false, { x: 3, y: 3, dir: 'right' });
      caption(null);
      // catching, in the Echo
      caption('CATCH WILD POKéMON', 'IN BOTH WORLDS', 'br');
      await warp('echo_oldrail', 10, 30, 'up');
      const keepBag = Object.assign({}, G().bag); G().bag = { master: 1, potion: 3 };
      await battleOn(() => Journey._wild('litwick', 22)); cover(false); mark('catching');
      await W8(1900);
      for (let i = 0; i < 20 && !(S().btl && S().btl.throwing) && !S().dialog; i++) { const bb = $('#rrow0 [data-c=ball]'); if (bb) bb.click(); await W8(300); }
      await waitFor(() => S().dialog, 9000); await W8(1600);
      cover(true); await W8(350); caption(null); await drain(); G().bag = keepBag; heal();
      // the heist: the Gala's guards back at their posts (the trailer only looks; they don't send anyone back)
      caption('THE GALA HEIST', 'SLIP PAST THE LIGHTKEEPERS');
      G().flags.ch6 = false;
      await warp('sky2', 17, 19, 'up');
      const watchers = S().npcs.filter(n => n.watch); for (const n of watchers) { n.keepWatch = n.watch; n.watch = null; }
      cover(false); mark('the Gala'); await wander(2600);
      cover(true); await W8(330); for (const n of watchers) n.watch = n.keepWatch;
      G().flags.ch6 = true; await drain(1500);
      caption(null);
      // surfing
      caption('SURF THE DROWNED ISLES', 'RIDE LAPRAS ACROSS THE SEA LANES');
      S().surf = true; Journey._warp('sealane1', 12, 5, 'right'); await W8(300); cover(false); mark('surfing');
      await wander(3000); cover(true); await W8(330); S().surf = false; await drain(1500);
      caption(null);
      // a Warden
      caption('BATTLE THE EIGHT WARDENS', 'REAL-TIME ANIMATED BATTLES', 'br');
      await warp('archway', 16, 12, 'up');
      await battleOn(() => Journey._battle('corin')); cover(false); mark('Warden Corin'); fight(true);
      await W8(7600);
      cover(true); await W8(350); caption(null); await endBattle();
      // the story's people
      caption('FRIENDS · RIVALS · SECRETS', '', 'tr');
      mark('story: the secrets');
      await line('saltmere', 15, 10, 'down', 'Twenty years ago, Cassius and I were partners. Two young scientists with one stubborn idea.', { name: 'Prof. Okafor', look: 'okafor' });
      await line('frostpass', 10, 16, 'up', 'He can save Teo. He promised. When the Lantern\'s lit, Teo stops fading. Forever.', { name: 'Juno', look: 'juno' });
      caption(null);
      // the rain battle
      showCard('JUNO\'S CHOICE'); Score.boom(); flash();
      await warp('frostpass', 10, 16, 'up');
      await battleOn(() => Journey._battle({ name: 'Juno', look: 'juno', team: [['manectric', 42], ['staraptor', 42], ['sharpedo', 41], ['lucario', 43], ['swampert', 44]], theme: 'icecave', canLose: true }));
      await W8(900); hideCard(); cover(false); mark('the rain battle'); fight(true);
      caption('THE RAIN BATTLE', 'YOUR BEST FRIEND · YOUR RIVAL', 'br');
      await W8(6800); caption(null);
      cover(true); await W8(350); await endBattle();
      // the Long Night
      showCard('THE LONG NIGHT'); Score.boom(1.1);
      G().flags.dawn = false;
      { const p = spot('brassport_s'); await warp('brassport_s', p.x, p.y); }
      await W8(1300); hideCard(); cover(false); mark('the Long Night');
      caption('MERIDIA FROZEN IN ITS HAPPIEST DAY', 'WAKE THE WARDENS FROM THEIR BEST MEMORIES');
      await wander(3000, true); cover(true); await W8(330); await drain(1500);
      Journey._menu('fly'); await W8(150); cover(false); caption('FLY ON CORVIKNIGHT', 'ANYWHERE YOU HAVE BEEN'); mark('fly'); await W8(2000);
      cover(true); await W8(330); Journey._close(); await drain(); caption(null);
      // Cassius
      await line('lanterntop', 8, 10, 'up', '...Papa?', { name: 'Nell', look: 'nell' });
      caption('CASSIUS VALE', 'THE LANTERN AT THE END OF THE WORLD', 'br');
      await battleOn(() => Journey._battle('m11cassius')); cover(false); mark('Cassius'); fight(true);
      await W8(8400);
      cover(true); await W8(350); caption(null); await endBattle();
      G().flags.dawn = true;
      // the colossus
      showCard('THE WARDEN OF THE VEIL', 'AWAKENS'); Score.boom(1.3); flash();
      await warp('lanterntop', 8, 9, 'up');
      await battleOn(() => Journey._battle({ name: 'Warden of the Veil', wild: true, team: [['golurk', 60]], theme: 'icecave' }));
      await W8(900); hideCard(); cover(false); mark('the Warden of the Veil'); fight(true);
      await W8(6200);
      cover(true); await W8(350); await endBattle();
      // the Champion
      caption('THE COUNCIL OF LIGHTS', 'CHAMPION ADA, THE LAMPLIGHTER', 'br');
      await warp('councilhall', 7, 7, 'up');
      await battleOn(() => Journey._battle('m12ada')); cover(false); mark('Champion Ada'); fight(true);
      await W8(6600);
      cover(true); await W8(350); caption(null); await endBattle();
      // dawn: a new day
      caption('A NEW DAY BEGINS', '', 'tr');
      await line('tidemark', 15, 21, 'up', 'Race you to the pier, {NAME}! Loser carries the winner\'s lantern!', { name: 'Juno', look: 'juno' });
      caption(null);
      // the menus
      caption('COLLECT 8 BADGES', 'FILL YOUR POKéDEX');
      { const p = spot('emberlight'); await warp('emberlight', p.x, p.y); }
      Journey._menu('card'); await W8(150); cover(false); mark('menus'); await W8(1600);
      Journey._close(); Journey._menu('party'); await W8(1400);
      cover(true); await W8(350); caption(null); Journey._close(); await drain();

      // ===== The end card
      Score.set('off'); Score.chord(1.2); flash(); mark('end card');
      showCard('POKéMON JOURNEY II', 'THE LOST DAYS OF MERIDIA', { logo: true, small: 'PLAY NOW  ·  ★ JOURNEY II IN POKéMON ARENA', tags: ['12 CHAPTERS', '8 WARDENS', 'THE ECHO', 'A MYSTERY TO SOLVE', 'SURF & FLY', 'REAL-TIME BATTLES'] });
      await W8(6800); hideCard(); await W8(900);
    }
    rec.stop(); await stopped;
    scr.getTracks().forEach(t => t.stop()); clearInterval(Score.timer);
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    window.__trBlob = blob;
    mark(`done: ${(blob.size / 1048576).toFixed(1)} MB`);
    return { size: blob.size, mime, secs: (performance.now() - T0) / 1000 };
  }
  // the recording, a slice at a time (base64) for the runner to save
  async function slice(i, n) { const b = window.__trBlob.slice(i, i + n); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000)); return btoa(s); }
  // a frame of the recording, as a JPEG data URL (--stills)
  async function still() { if (!scr || typeof ImageCapture === 'undefined') return null; const b = await new ImageCapture(scr.getVideoTracks()[0]).grabFrame(); const c = document.createElement('canvas'); c.width = b.width; c.height = b.height; c.getContext('2d').drawImage(b, 0, 0); return c.toDataURL('image/jpeg', 0.7); }
  window.__trailer = { capture, run, slice, still };
}

console.log(`Journey II ${CUT === 'film' ? 'opening film' : 'trailer'} · ${W}x${H} · ${path.basename(browserPath)}${SHOW ? ' (visible)' : ''}`);
await ev(`(${director.toString()})(${JSON.stringify({ w: W, h: H, webm: WEBM, cut: CUT })}); true`);
let res;
try {
  await ev('__trailer.capture()', true);
  await sleep(600);
  await fitWindow();
  res = await ev('__trailer.run()', true);
}
catch (e) { console.log('FAILED: ' + e.message); if (problems.length) console.log('  ' + problems.join('\n  ')); await quit(1); }
if (!res || !res.size) { console.log('FAILED: the recording is empty'); await quit(1); }
const ext = res.mime.startsWith('video/mp4') ? '.mp4' : '.webm', out = OUT.replace(/\.(mp4|webm)$/i, '') + ext;
fs.mkdirSync(path.dirname(out), { recursive: true });
const fd = fs.openSync(out, 'w'), STEP = 4 << 20;
for (let i = 0; i < res.size; i += STEP) fs.writeSync(fd, Buffer.from(await ev(`__trailer.slice(${i}, ${STEP})`), 'base64'));
fs.closeSync(fd);
// the recorder writes a streaming (fragmented) MP4: no duration, no index, so players cannot seek in it and some apps
// will not take it. Rewrite it as an ordinary MP4 (the same video and sound, not re-encoded)
if (ext === '.mp4') { const r = remux(fs.readFileSync(out)); if (r) { fs.writeFileSync(out, r.buf); console.log(`${stamp()}  made seekable: ${r.seconds.toFixed(1)} s · ${r.tracks.map(t => `${t.kind === 'vide' ? 'video' : 'audio'} ${t.samples} frames${t.kind === 'vide' ? ` (${t.keyframes} keyframes)` : ''}`).join(' · ')}`); } }
if (problems.length) console.log('page problems:\n  ' + problems.slice(0, 8).join('\n  '));
console.log(`${stamp()}  saved ${path.relative(process.cwd(), out)} · ${res.secs.toFixed(1)} s · ${(res.size / 1048576).toFixed(1)} MB · ${res.mime}`);
await quit(0);
