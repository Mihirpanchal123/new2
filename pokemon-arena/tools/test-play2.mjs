// Plays JOURNEY II (Meridia) in a real browser, the way a player does, and fails the moment the game gets stuck.
// Built from tools/test-play.mjs (Journey 1's bot: the same keys, pathing, battles and watchdog) by an auto-player:
// for each chapter it reads the goals (MStory.CHAPTERS) and, step after step, walks to the nearest person, zone or
// object whose event can run now (its needs are met) and sets a flag still missing - the story checker's logic, played
// for real. It crosses Echo Shrines (face + A) and surfs (face the water + A, answer Yes).
// A bot inside the page walks with the arrow keys (finding its way through doors, stairs, ledges and map edges),
// talks with Enter, answers questions with the number keys, clicks the starter picker, the shop and the PC, and in
// battle clicks the move buttons, BALL, RUN and BAG. A watchdog fails the run when nothing on screen changes for a
// while (no text, no movement, no menu, no battle progress), and any JavaScript error or missing file fails it too.
// On a failure it prints what was on screen, the last lines of dialog and a screenshot path.
//
// Usage: node tools/test-play2.mjs [--from=chN] [--chapter=N] [--seed=N] [--show] [--browser=path]
//   --from     start at the start of chapter N with a ready-made save (default ch1: a new game)
//   --chapter  play up to the end of this chapter (default: the last one there is)
//   --seed     picks the starter and the bot's random choices (default: random; printed so a run can be repeated)
//   --show     open a visible browser window to watch it play
// Needs Chrome or Edge installed (or --browser / CHROME_PATH). No npm packages.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const SEED = +arg('seed', Math.floor(Math.random() * 1e6));
const SHOW = !!arg('show', false);
const STUCK_S = 30;                                   // nothing on screen changed for this long: stuck
const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's';

// ---------------------------------------------------------------------
//  A static server for the game (like serve.mjs, on a free port)
// ---------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.ogg': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// ---------------------------------------------------------------------
//  The browser, over the DevTools protocol
// ---------------------------------------------------------------------
const browserPath = arg('browser', process.env.CHROME_PATH) || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => fs.existsSync(p));
if (!browserPath) { console.log('No Chrome or Edge found: pass --browser=<path> or set CHROME_PATH'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-play-'));
const browser = spawn(browserPath, [...(SHOW ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,800',
  '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = tabs.find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {}
}
if (!wsUrl) { console.log('The browser did not start'); process.exit(2); }
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.onopen = r);
let msgId = 0;
const pending = new Map(), problems = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; problems.push('JS error: ' + ((d.exception && d.exception.description) || d.text).split('\n').slice(0, 4).join(' | ')); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('console.error: ' + m.params.args.map(a => a.description || a.value).join(' ').split('\n').slice(0, 4).join(' | '));
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) problems.push(`HTTP ${m.params.response.status}: ${m.params.response.url.replace(/^https?:\/\/[^/]+/, '')}`);
  if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
let failed = false;
// every request gets an answer within 30 s or the run fails (a lost reply would otherwise leave the run waiting for ever)
const send = (method, params = {}) => new Promise((r, j) => {
  const i = ++msgId, t = setTimeout(() => { pending.delete(i); j(new Error(`no reply from the browser to ${method} in 30 s`)); }, 30000);
  pending.set(i, m => { clearTimeout(t); r(m); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
ws.onclose = () => { for (const [, r] of pending) r({ result: { exceptionDetails: { text: 'the browser connection closed' } } }); pending.clear(); };
async function ev(expr) {
  let r;
  // no reply: fail the run with the usual report (while already failing, let the report skip what it cannot read)
  try { r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); }
  catch (e) { if (failed) throw e; return die(e.message); }
  if (r.result && r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text).split('\n')[0]);
  return r.result.result.value;
}
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

// ---------------------------------------------------------------------
//  The bot (runs inside the page). Everything it does goes through the game's real controls.
// ---------------------------------------------------------------------
function botMain(seed) {
  const J = Journey, S = () => J._S(), G = () => J._G(), M = MMaps.M, TS = 16;
  let rs = seed >>> 0 || 1;
  const rnd = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296;
  const B = window.__bot = { status: 'idle', msg: '', goal: null, transcript: [], seen: { battles: 0, wild: 0, caught: 0, items: 0, potions: 0 }, policy: { wild: 'run', starter: null, think: 1, answers: [] }, menuTask: null, rnd };
  const say = s => { B.transcript.push(s); if (B.transcript.length > 400) B.transcript.splice(0, 100); };
  // ---- keys and clicks
  const KEY = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ShiftLeft: 'Shift', Enter: 'Enter', Escape: 'Escape' };
  const DIRKEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const fire = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code.startsWith('Digit') ? code.slice(5) : KEY[code] || code, bubbles: true }));
  const held = new Set();
  function hold(codes) {
    for (const c of [...held]) if (!codes.includes(c)) { fire('keyup', c); held.delete(c); }
    // the game drops held keys when a menu or battle opens: press again if it no longer knows
    const k = S().keys;
    for (const c of codes) if (!held.has(c) || (c !== 'ShiftLeft' && !k.has({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[c]))) { if (held.has(c)) fire('keyup', c); fire('keydown', c); held.add(c); }
  }
  const tap = code => { fire('keydown', code); fire('keyup', code); };
  const $$ = sel => [...document.querySelectorAll(sel)];
  const visible = el => el && !el.closest('.hidden') && el.offsetParent !== null;
  const click = el => { el.click(); };

  // ---- where things are
  const conds = list => !list || list.every(c => c[0] === '!' ? !G().flags[c.slice(1)] : !!G().flags[c]);
  const center = (x, y) => ({ x: x * TS + 8, y: y * TS + 13 });
  const tileOf = (x, y) => [Math.floor(x / TS), Math.floor((y - 3) / TS)];
  const me = () => { const p = S().player; const [tx, ty] = tileOf(p.x, p.y); return { map: S().map.id, x: p.x, y: p.y, tx, ty, dir: p.dir }; };
  // a map's walls for planning: the engine's solid grid, the people standing about, and blocking event zones
  function walls(id, opts) {
    const m = M[id], live = S().map.id === id;
    const W = (live ? S().solid : MMaps.solidGrid(m, G().flags)).map(r => r.slice());
    if (G().flags['ride.surf']) m.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '~' && !m.props.some(p => p.x === x && p.y === y)) W[y][x] = false; }));
    const people = live ? S().npcs.filter(n => !n.hidden).flatMap(n => n.moving ? [[n.tx, n.ty], [n.moving.tx, n.moving.ty]] : [[n.tx, n.ty]])
      : m.npcs.filter(n => conds(n.show) && !G().flags['gone.' + id + '.' + n.id]).map(n => [n.x, n.y]);
    for (const [x, y] of people) if (W[y]) W[y][x] = true;
    for (const z of m.zones) if (z.block && conds(MStory.META[z.event] && MStory.META[z.event].needs)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) W[y][x] = true;
    for (const b of m.buildings) if (!conds(b.needs)) for (const d of MMaps.doorsOf(b)) W[d.y][d.x] = true;
    if (opts && opts.free && opts.free.map === id) W[opts.free.y][opts.free.x] = false;
    for (const a of B.avoid || []) if (a.map === id && W[a.y]) W[a.y][a.x] = true;
    return W;
  }
  // every move from (id, x, y): [dir, to-map, x, y, kind]
  function moves(id, x, y, W, opts) {
    const m = M[id], out = [];
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) {
        const side = ny < 0 ? 'n' : ny >= m.h ? 's' : nx < 0 ? 'w' : 'e', e = m.edges[side];
        if (!e || !conds(e.needs)) continue;
        const t = M[e.to], tx = side === 'n' || side === 's' ? x + (e.dx || 0) : side === 'w' ? t.w - 1 : 0, ty = side === 'w' || side === 'e' ? y + (e.dy || 0) : side === 'n' ? t.h - 1 : 0;
        if (tx >= 0 && ty >= 0 && tx < t.w && ty < t.h && !walls(e.to, opts)[ty][tx]) out.push([dir, e.to, tx, ty, 'edge']);
        continue;
      }
      const ch = m.rows[ny][nx];
      if (ch === 'v') { if (dir === 'down' && ny + 1 < m.h && !W[ny + 1][nx]) out.push([dir, id, nx, ny + 1, 'hop']); continue; }
      if (m.rows[y][x] === 'v') continue;
      // an Echo Shrine ahead: A takes you to the twin map, on this same tile
      const twin = m.echo || m.echoOf;
      if ((m.shrines || []).some(sh => sh.x === nx && sh.y === ny)) { if (G().flags.echo && twin && M[twin] && !walls(twin, opts)[y][x]) out.push([dir, twin, x, y, 'shrine']); continue; }
      if (W[ny][nx]) continue;
      if (ch === '~' && m.rows[y][x] !== '~') { out.push([dir, id, nx, ny, 'surf']); continue; }
      const door = m.buildings.find(b => MMaps.doorsOf(b).some(d => d.x === nx && d.y === ny));
      if (door) { if (dir === 'up') { const t = M[door.to]; out.push(conds(door.needs) ? [dir, door.to, t.arrive.x, t.arrive.y, 'door'] : [dir, id, nx, ny, 'walk']); } continue; }
      if (ch === 'm' && m.outside && dir === 'down') { const o = M[m.outside], b = o.buildings.find(bb => bb.to === id), d = MMaps.doorsOf(b)[0]; out.push([dir, o.id, d.x + (JArt.BUILD[b.b].door.length > 1 ? 1 : 0), d.y + 1, 'mat']); continue; }
      const w = m.warps.find(w => w.x === nx && w.y === ny);
      if (w) { out.push([dir, w.to, w.tx, w.ty, 'warp']); continue; }
      out.push([dir, id, nx, ny, 'walk']);
    }
    return out;
  }
  // the cheapest way to any of the goal tiles (tall grass costs more: fewer wild battles on the way)
  function plan(goals, opts) {
    const here = me(), key = (id, x, y) => id + ':' + x + ',' + y;
    const isGoal = new Set(goals.map(g => key(g.map, g.x, g.y)));
    const start = key(here.map, here.tx, here.ty);
    const prev = new Map([[start, null]]), cost = new Map([[start, 0]]);
    const buckets = [[[here.map, here.tx, here.ty]]];
    const wallCache = {};
    const W = id => wallCache[id] || (wallCache[id] = walls(id, opts));
    for (let c = 0; c < buckets.length; c++) {
      for (const [id, x, y] of buckets[c] || []) {
        const k = key(id, x, y);
        if (cost.get(k) !== c) continue;
        if (isGoal.has(k)) { const path = []; let cur = k; while (prev.get(cur)) { path.unshift(prev.get(cur).step); cur = prev.get(cur).from; } return path; }
        for (const [dir, tid, tx, ty, kind] of moves(id, x, y, W(id), opts)) {
          const tk = key(tid, tx, ty), tall = M[tid].rows[ty] && M[tid].rows[ty][tx] === ';' && !(opts && opts.grass);
          const nc = c + (tall ? 4 : 1);
          if (cost.has(tk) && cost.get(tk) <= nc) continue;
          cost.set(tk, nc); prev.set(tk, { from: k, step: { dir, map: tid, x: tx, y: ty, kind, fromMap: id } });
          (buckets[nc] = buckets[nc] || []).push([tid, tx, ty]);
        }
      }
    }
    return null;
  }
  // where to stand to talk to / use something at (x, y) on map id, and which way to face
  function standFor(id, tx, ty, o = {}) {
    if (o.on) return [{ map: id, x: tx, y: ty, face: null }];
    const m = M[id], out = [];
    const npc = m.npcs.find(n => n.x === tx && n.y === ty);
    const tiles = [[tx, ty]];
    const f = m.furniture.find(f => tx >= f.x && tx < f.x + JArt.FURN[f.k].w && ty >= f.y && ty < f.y + JArt.FURN[f.k].h);
    if (f) for (let y = f.y; y < f.y + JArt.FURN[f.k].h; y++) for (let x = f.x; x < f.x + JArt.FURN[f.k].w; x++) tiles.push([x, y]);
    for (const [x, y] of tiles) for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const sx = x - dx, sy = y - dy;
      if (sx >= 0 && sy >= 0 && sx < m.w && sy < m.h && !tiles.some(([a, b]) => a === sx && b === sy)) out.push({ map: id, x: sx, y: sy, face: dir });
      if (npc && npc.counter) out.push({ map: id, x: x - 2 * dx, y: y - 2 * dy, face: dir });
    }
    return out;
  }

  // ---- the screen: dialog, choices, menus, battles
  let lastAct = 0, lastText = null, lastMap = null, mapT = 0;
  const textNow = () => { const t = document.querySelector('#journey .jd-text'); return t ? t.textContent : ''; };
  const nameNow = () => { const t = document.querySelector('#journey .jd-name'); return t && !t.classList.contains('hidden') ? t.textContent : ''; };
  function answer(text, opts) {
    for (const [re, i] of B.policy.answers) if (new RegExp(re).test(text)) return Math.min(i, opts.length - 1);
    if (/Is this your choice\?/.test(text) && B.policy.think > 0) { B.policy.think--; return 1; }
    return 0;
  }
  function screen(now) {
    const s = S();
    if (s.battle) { hold([]); battle(now); return true; }
    if (s.evoStop) { hold([]); return true; }
    if (s.dialog) {
      hold([]);
      if (now - lastAct < 110) return true;
      lastAct = now;
      if (s.dialog.opts) {
        const text = lastText || '', i = answer(text, s.dialog.opts);
        say(`    > ${s.dialog.opts[i]}`);
        tap('Digit' + (i + 1));
        return true;
      }
      // a whiteout (a battle lost on the way): train the party up so the same trainer is not lost to for ever
      if (s.dialog.full !== lastText && /out of usable Pokémon/.test(s.dialog.full)) { B.seen.whiteouts = (B.seen.whiteouts || 0) + 1; G().party = G().party.map(m => Object.assign(Prog.newMon(m.species, Math.min(100, m.level + 6), { met: m.met }), { uid: m.uid, ball: m.ball, friendship: m.friendship })); say('    [whiteout: party trained up 6 levels]'); }
      if (s.dialog.full !== lastText) { lastText = s.dialog.full; say(`${nameNow() ? nameNow() + ': ' : ''}${s.dialog.full}`); }
      tap('Enter');
      return true;
    }
    if (s.menu) {
      hold([]);
      if (now - lastAct < 220) return true;
      lastAct = now;
      if (s.menu === 'starter') {
        const tabs = $$('#journey .jpanel [data-a=region]');
        const [r, i] = B.policy.starter || [Math.floor(rnd() * tabs.length), Math.floor(rnd() * 3)];
        B.policy.starter = [r, i];
        if (tabs[r] && !tabs[r].classList.contains('on')) { click(tabs[r]); return true; }
        const picks = $$('#journey .jpanel [data-a=pickStarter]');
        say(`    [picks ${picks[i].dataset.i}]`); click(picks[i]);
        return true;
      }
      if (B.menuTask && B.menuTask(s.menu)) return true;
      tap('Escape');
      return true;
    }
    return false;
  }
  // in a battle: our moves by clicking their buttons; wild ones: BALL / RUN as the policy says; a Potion now and then
  let throws = 0;
  function battle(now) {
    const R = Retro.journey, s = S();
    if (!R.running || (s.btl && s.btl.throwing)) return;
    if (now - lastAct < 400) return;
    lastAct = now;
    const bm = document.querySelector('.jbmenu');
    if (visible(bm)) {
      // the battle bag: a Potion on the one that is out (or Back)
      const btns = [...bm.querySelectorAll('button[data-i]')], pot = btns.find(b => /Potion|Berry/.test(b.textContent)), ball = btns.find(b => /Ball/.test(b.textContent));
      const pick = ball || pot || (/Use .* on/.test(bm.textContent) ? btns[state.players[0].active] : null) || btns.find(b => b.dataset.i === 'x');
      if (pick) { say(`    [battle menu: ${pick.textContent.trim()}]`); click(pick); }
      return;
    }
    const row = document.getElementById('rrow0');
    if (!row) return;
    const wild = s.btl && s.btl.wild, mine = state.players[0].team[state.players[0].active];
    const balls = Object.keys(G().bag).filter(k => MStory.ITEMS[k].pocket === 'balls').length;
    if (wild && B.policy.wild === 'catch' && throws < 4 && balls) { const b = row.querySelector('[data-c=ball]'); if (b) { throws++; say('    [BALL]'); click(b); return; } }
    if (wild && B.policy.wild === 'run') { const b = row.querySelector('[data-c=run]'); if (b) { say('    [RUN]'); click(b); return; } }
    if (B.policy.potion && mine && mine.hp > 0 && mine.hp < mine.maxhp * 0.5 && (G().bag.potion || G().bag.oran)) {
      const b = row.querySelector('[data-c=bag]'); if (b) { B.policy.potion--; B.seen.potions++; say('    [BAG]'); click(b); return; }
    }
    // mostly moves that do damage (a status move now and then)
    const mv = [...row.querySelectorAll('.rmv:not([disabled])')], hits = mine ? mv.filter(b => mine.moves[+b.dataset.i].cat !== 'status') : [];
    const pool = hits.length && rnd() < 0.85 ? hits : mv;
    if (pool.length) click(pool[Math.floor(rnd() * pool.length)]);
  }

  // ---- goals. goto: stand on a tile · talk: walk up to someone / something and press Enter (on: stand on it, for
  // hidden items) · trigger: step onto a tile that starts an event · grass: walk the tall grass until a wild battle
  // has been played out · press: press a key (Escape: the menu) and let the menu task drive
  let path = null, stepT = 0, tries = 0, idleT = 0;
  B.start = goal => { B.goal = { ...goal }; B.status = 'busy'; B.msg = ''; path = null; tries = 0; idleT = 0; B.avoid = []; throws = 0; return true; };
  const done = () => { B.status = 'done'; B.goal = null; hold([]); };
  const fail = msg => { B.status = 'fail'; B.msg = msg; B.goal = null; hold([]); };
  const busy = () => { const s = S(); return !!(s.event || s.menu || s.battle || s.dialog || s.hop || s.scripted || s.evoStop || s.travel); };
  function targetsOf(g) {
    if (g.type === 'trigger') return [{ map: g.map, x: g.x, y: g.y }];
    if (g.type === 'goto') {
      // someone is standing on the spot (a trainer who walked up, say): next to it will do
      const taken = S().map.id === g.map && S().npcs.some(n => !n.hidden && n.tx === g.x && n.ty === g.y);
      return taken ? Object.values(DIRS).map(([dx, dy]) => ({ map: g.map, x: g.x + dx, y: g.y + dy })) : [{ map: g.map, x: g.x, y: g.y }];
    }
    if (g.type === 'grass') { const [x, y] = g.spots[g.k % g.spots.length]; return [{ map: g.map, x, y }]; }
    let { map, x, y } = g;
    if (g.npc) {
      if (S().map.id === map) { const n = S().npcs.find(n => n.id === g.npc && !n.hidden); if (!n) return []; x = n.tx; y = n.ty; }
      else { const n = M[map].npcs.find(n => n.id === g.npc); if (!n) return []; x = n.x; y = n.y; }
    }
    return standFor(map, x, y, g);
  }
  // walk toward the nearest target tile; returns that target once standing in the middle of it
  function travel(now, targets, opts) {
    const here = me();
    if (here.map !== lastMap) { lastMap = here.map; mapT = now; path = null; }
    if (now - mapT < 350) { hold([]); return null; }                    // a new map fading in
    const at = targets.find(t => t.map === here.map && t.x === here.tx && t.y === here.ty);
    const c = center(here.tx, here.ty);
    // arrived: anywhere near the middle will do. Turning to face a person next to you walks you up to 3 px toward
    // them before you bump (up to 8 px upward: the feet sit low in the tile): demanding the exact middle after that turns you back
    // away to re-centre, and the bot would turn back and forth for ever
    if (at && Math.abs(here.x - c.x) < 4 && Math.abs(here.y - c.y) < 9) { hold([]); return at; }
    if (at) { steer(c, here); return null; }
    // plan from this tile (again after every step: people walk about)
    if (path && path.length && now - stepT > 2500) {                    // no progress: something is in the way
      B.avoid.push({ map: path[0].map, x: path[0].x, y: path[0].y }); path = null;
      if (++tries > 6) { fail(`can't get from ${here.map} ${here.tx},${here.ty} (px ${here.x.toFixed(1)},${here.y.toFixed(1)}) toward ${JSON.stringify(targets[0])}`); return null; }
    }
    if (!path) {
      path = plan(targets, opts);
      if (!path) { fail(`no way from ${here.map} ${here.tx},${here.ty} to ${JSON.stringify(targets.slice(0, 3))}`); return null; }
      stepT = now;
    }
    const st = path[0];
    if (!st) { path = null; return null; }
    if (B.goal && B.goal.type === 'trigger' && targets.some(t => t.map === st.map && t.x === st.x && t.y === st.y)) B.goal.armed = true;
    if (here.map !== st.fromMap) { path = null; return null; }          // not where the plan began (a warp, a whiteout): plan again
    if (st.map === here.map && here.tx === st.x && here.ty === st.y) {  // on the next tile: settle in its middle, then plan the next step
      const cc = center(st.x, st.y);
      if (Math.abs(here.x - cc.x) < 2.5 && Math.abs(here.y - cc.y) < 2.5) { path = null; hold([]); return null; }
      steer(cc, here); return null;
    }
    if (st.kind === 'shrine' || st.kind === 'surf') {
      if (here.dir !== st.dir) { if (!B.faceT || now - B.faceT > 300) { B.faceT = now; const k = DIRKEY[st.dir]; fire('keydown', k); requestAnimationFrame(() => requestAnimationFrame(() => fire('keyup', k))); } return null; }
      hold([]);
      if (!B.useT || now - B.useT > 900) { B.useT = now; stepT = now; say(`    [Enter: ${st.kind} at ${here.map} ${here.tx},${here.ty}]`); tap('Enter'); }
      return null;
    }
    const [dx] = DIRS[st.dir];
    // keep to the middle of the row / column while walking, so the feet never catch a corner
    const perp = dx ? here.y - c.y : here.x - c.x;
    if (Math.abs(perp) > 1.6) { hold([dx ? (perp > 0 ? 'ArrowUp' : 'ArrowDown') : (perp > 0 ? 'ArrowLeft' : 'ArrowRight')]); return null; }
    const far = path.length > 2 && path[1].dir === st.dir && G().flags.shoes;
    hold(far ? [DIRKEY[st.dir], 'ShiftLeft'] : [DIRKEY[st.dir]]);
    return null;
  }
  function steer(cc, here) {
    const dx = cc.x - here.x, dy = cc.y - here.y;
    if (Math.abs(dx) >= 2.5) hold([dx > 0 ? 'ArrowRight' : 'ArrowLeft']);
    else if (Math.abs(dy) >= 2.5) hold([dy > 0 ? 'ArrowDown' : 'ArrowUp']);
    else hold([]);
  }
  function tick() {
    requestAnimationFrame(tick);
    if (!J.active || B.status !== 'busy') return;
    const now = performance.now(), g = B.goal, s = S();
    if (!!s.battle !== !!B.inBattle) { B.inBattle = !!s.battle; say(s.battle ? `    [battle: ${state.players[1].team.map(m => m.name + ' Lv' + m.level).join(', ')}]` : '    [battle over]'); }
    // something on screen (or a script running): deal with it; it counts for the goal only once the goal has begun it
    if (screen(now) || busy()) {
      hold([]); idleT = 0;
      stepT = now; path = null;                                         // time in a battle or a talk is not time stuck; plan afresh after it
      if ((g.type === 'talk' || g.type === 'press') && g.pressed) g.started = true;
      // the trainer we are walking up to saw us first and started the battle: that is the talk
      if (g.type === 'talk' && g.npc && s.battle && !g.started) { const n = M[g.map].npcs.find(n => n.id === g.npc); if (n && n.name && PLAYER[1] === n.name) g.started = true; }
      if (g.type === 'trigger') g.started = true;
      if (g.type === 'grass' && s.battle) g.started = true;
      return;
    }
    // a talk / trigger / grass battle / menu is over once it has run and the screen stays quiet for a moment
    if (g.started) { if (!idleT) idleT = now; if (now - idleT > 300) done(); return; }
    if (g.type === 'press') {
      if (!g.pressed) { g.pressed = now; if (g.key) tap(g.key); else (0, eval)(g.js); }
      else if (now - g.pressed > 1500) fail(`${g.key ? 'pressing ' + g.key : g.js} did nothing`);
      return;
    }
    const targets = targetsOf(g);
    if (!targets.length) return fail(`${g.npc} is not on ${g.map}`);
    const at = travel(now, targets, { free: g.type === 'trigger' ? targets[0] : null, grass: g.type === 'grass' });
    if (!at) return;
    if (g.type === 'goto') return done();
    if (g.type === 'grass') { g.k++; return; }
    if (g.type === 'trigger') { if (!g.atT) g.atT = now; else if (now - g.atT > 1500) fail(`stepping onto ${g.map} ${g.x},${g.y} started nothing`); return; }
    // talk: face it, then Enter
    const here = me();
    if (at.face && here.dir !== at.face) {
      if (!g.facing || now - g.facing > 300) { g.facing = now; const k = DIRKEY[at.face]; fire('keydown', k); requestAnimationFrame(() => requestAnimationFrame(() => fire('keyup', k))); }
      return;
    }
    if (!g.pressed) { g.pressed = now; say(`    [Enter at ${here.map} ${here.tx},${here.ty} facing ${here.dir}]`); tap('Enter'); return; }
    if (now - g.pressed > 1500) fail(`pressing Enter at ${here.map} ${here.tx},${here.ty} facing ${here.dir} did nothing (${g.npc || g.x + ',' + g.y})`);
  }
  requestAnimationFrame(tick);

  // ---- the auto-player: the nearest thing that moves the story on. A person whose talk can run now (its needs are met)
  // and sets a flag not set yet; a trainer whose win does; a story zone; a piece of furniture. Flags the chapter still
  // needs come first, then any other story flag, then (to clear the way) any trainer not beaten yet.
  B.nextTarget = (missing, tried) => {
    const META = MStory.META, TR = MStory.TRAINERS, F = G().flags, want = new Set(missing), unset = f => !F[f];
    const cands = [];
    const add = (sets, goal, label, low) => { const key = JSON.stringify(goal); if ((tried[key] || 0) >= 3) return; cands.push({ pri: low ? 3 : sets.some(f => want.has(f) && unset(f)) ? 0 : 1, goal, label, key }); };
    for (const m of Object.values(M)) {
      for (const n of m.npcs) {
        if (!conds(n.show) || F['gone.' + m.id + '.' + n.id]) continue;
        const e = n.talk && META[n.talk];
        if (e && conds(e.needs) && (e.sets || []).some(unset)) add(e.sets, { type: 'talk', map: m.id, npc: n.id }, `talk: ${n.name || n.id} (${m.id}, ${n.talk})`);
        if (n.trainer && !F['tr.' + m.id + '.' + n.id]) {
          const tr = TR[n.trainer], w = tr && tr.onWin && META[tr.onWin];
          if (w && conds(w.needs) && (w.sets || []).some(unset)) add(w.sets, { type: 'talk', map: m.id, npc: n.id }, `battle: ${n.name || n.id} (${m.id})`);
          else add([], { type: 'talk', map: m.id, npc: n.id }, `battle: ${n.name || n.id} (${m.id}, to clear the way)`, true);
        }
      }
      for (const z of m.zones) { const e = META[z.event]; if (e && conds(e.needs) && conds(z.needs) && (e.sets || []).some(unset)) add(e.sets, { type: 'trigger', map: m.id, x: z.x, y: z.y }, `scene: ${z.event} (${m.id} ${z.x},${z.y})`); }
      for (const f of m.furniture) { const e = f.talk && META[f.talk]; if (e && conds(e.needs) && (e.sets || []).some(unset)) add(e.sets, { type: 'talk', map: m.id, x: f.x, y: f.y }, `use: ${f.k} (${m.id}, ${f.talk})`); }
    }
    for (const pri of [0, 1, 3]) {
      let best = null;
      for (const c of cands.filter(c => c.pri === pri)) {
        const targets = targetsOf(c.goal);
        if (!targets.length) continue;
        const p = plan(targets, { free: c.goal.type === 'trigger' ? targets[0] : null });
        if (p && (!best || p.length < best.len)) best = { ...c, len: p.length };
      }
      if (best) return best;
    }
    return null;
  };

  // ---- for the test runner
  B.sig = () => {
    const s = S(), p = s.player, R = Retro.journey;
    // in a battle: HP, and the fighters themselves (where they are, what they do, their stat changes, their last move)
    const hp = s.battle && window.state && state.players ? state.players.map(pl => pl.team.map(m => Math.round(m.hp)).join('/')).join(' vs ') : '';
    const fx = s.battle && Retro._debug ? Retro._debug().F.map(f => f && [Math.round(f.x / 8), Math.round(f.y / 8), f.state, f.busy, JSON.stringify(f.mon.stages), f.lastMove && f.lastMove.id]) : '';
    return JSON.stringify([s.map && s.map.id, p && Math.round(p.x), p && Math.round(p.y), s.dialog && (s.dialog.full || 'choice'), textNow().length, s.menu, $$('#journey .jpanel button').length, s.battle, hp, fx, R && R.running, s.event, !!s.evoStop, B.transcript.length, B.status]);
  };
  B.where = () => { const s = S(), p = s.player; const t = p ? tileOf(p.x, p.y) : []; return { map: s.map && s.map.id, tile: t, px: p && [Math.round(p.x), Math.round(p.y)], dir: p && p.dir, event: s.event, menu: s.menu, battle: s.battle, dialog: s.dialog ? s.dialog.opts ? { choice: s.dialog.opts } : s.dialog.full : null, text: textNow(), goal: B.goal, status: B.status, msg: B.msg,
    walk: { steps: G().steps, repel: G().repel, stepAcc: s.stepAcc, hop: !!s.hop, warpLock: s.warpLock, zoneLock: s.zoneLock, keys: [...s.keys], tileKind: s.player && JArt.KIND[s.map.rows[tileOf(s.player.x, s.player.y)[1]][tileOf(s.player.x, s.player.y)[0]]] },
    clock: { PAUSED, TIME_SCALE, FX_TIME, pauseMenu: !document.getElementById('pauseMenu').classList.contains('hidden'), bmenu: !document.querySelector('.jbmenu').classList.contains('hidden') },
    fight: s.battle && Retro._debug ? (() => { const d = Retro._debug(); return { running: d.running, T: d.T && +d.T.toFixed(2), megaHold: d.megaHold, megaPending: d.megaPending, shot: d.shot, tweens: tweens.length, btl: s.btl && { throwing: s.btl.throwing, wild: s.btl.wild },
      F: d.F.map(f => f && { p: f.p, mon: f.mon.name, hp: Math.round(f.mon.hp), state: f.state, busy: !!f.busy, acting: !!f.acting, stuck: !!f.stuck, status: f.mon.status, cd: +(f.cd || 0).toFixed(2), stagger: +(f.stagger || 0).toFixed(2), holdT: +(f.holdT || 0).toFixed(2), queued: f.queued, plan: f.plan, forceMove: f.forceMove, ready: !!f.ready, rechargeUntil: f.rechargeUntil, invuln: !!f.invuln, protectUntil: f.protectUntil, lastMove: f.lastMove && f.lastMove.id }),
      team: state.players.map(pl => pl.team.map(m => m.name + ':' + Math.round(m.hp)).join(',') + ' active ' + pl.active) }; })() : null }; };
  return true;
}

// ---------------------------------------------------------------------
//  Running goals, with the watchdog
// ---------------------------------------------------------------------
async function screenshot() {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(os.tmpdir(), `journey-play-fail-${Date.now()}.png`);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  return file;
}
async function die(why) {
  failed = true;
  console.log(`\n${stamp()}  FAIL: ${why}`);
  if (problems.length && !why.includes(problems[0])) console.log('  errors in the page:\n    ' + problems.join('\n    '));
  try {
    console.log('  on screen:', JSON.stringify(await ev('__bot.where()')));
    // is the battle clock still moving? (a frozen clock and a stalled-but-ticking battle are different bugs)
    const t1 = await ev('Retro._debug ? Retro._debug().T : null'); await sleep(1000); const t2 = await ev('Retro._debug ? Retro._debug().T : null');
    if (t1 != null) console.log(`  battle clock: ${t1.toFixed(2)} -> ${t2.toFixed(2)} over 1 s`);
    console.log('  last dialog:\n' + (await ev('__bot.transcript.slice(-15)')).map(l => '    | ' + l).join('\n'));
    console.log('  screenshot:', await screenshot());
  } catch (e) { console.log('  (could not read the page: ' + e.message + ')'); }
  console.log(`  repeat with: node tools/test-play2.mjs --seed=${SEED}${FROM > 1 ? ' --from=ch' + FROM : ''}${CHAPTER ? ' --chapter=' + CHAPTER : ''}`);
  await quit(1);
}
async function quit(code) { try { ws.close(); } catch (e) {} browser.kill(); server.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(code); }
const checkProblems = async () => { if (problems.length) await die(problems.join('\n        ')); };
// run one goal to its end (or fail): talks, walks and everything that happens on the way (battles, events, choices)
async function step(label, goal, limitS = 240) {
  console.log(`${stamp()}  ${label}`);
  await ev(`__bot.start(${JSON.stringify(goal)})`);
  let sig = '', sigT = Date.now();
  const end = Date.now() + limitS * 1000;
  for (;;) {
    await sleep(250);
    await checkProblems();
    const [status, msg, s] = await ev('[__bot.status, __bot.msg, __bot.sig()]');
    if (status === 'done') return;
    if (status === 'fail') return die(`${label}: ${msg}`);
    if (s !== sig) { sig = s; sigT = Date.now(); }
    else if (Date.now() - sigT > STUCK_S * 1000) return die(`${label}: the game is stuck - nothing changed on screen for ${STUCK_S}s`);
    if (Date.now() > end) return die(`${label}: still not done after ${limitS}s`);
  }
}
const G = expr => ev(`(() => { const G = Journey._G(), S = Journey._S(); return ${expr}; })()`);
async function expect(label, expr) { if (!(await G(expr))) await die(`expected ${label} (${expr})`); }
const talk = (label, map, who, o = {}) => step(label, typeof who === 'string' ? { type: 'talk', map, npc: who, ...o } : { type: 'talk', map, x: who[0], y: who[1], ...o });
const goto = (label, map, x, y) => step(label, { type: 'goto', map, x, y });
const trigger = (label, map, x, y) => step(label, { type: 'trigger', map, x, y });
const grass = (label, map, spots, wild) => ev(`__bot.policy.wild = ${JSON.stringify(wild)}; true`).then(() => step(label, { type: 'grass', map, spots, k: 0 }));
const policy = js => ev(`(() => { const P = __bot.policy, B = __bot; ${js}; return true; })()`);
// test shortcut: raise the party to level L (the story's battles are what is tested, not how long it takes to train)
const boost = L => ev(`(() => { const G = Journey._G(); G.party = G.party.map(m => m.level >= ${L} ? m : Object.assign(Prog.newMon(m.species, ${L}, { met: m.met }), { uid: m.uid, ball: m.ball, friendship: m.friendship })); return true; })()`);
// play a trainer battle again (after a loss, the bot comes back stronger) until it is won
async function beat(label, map, npc, flag, L) {
  for (let i = 0; i < 3; i++) {
    await talk(label + (i ? ` (try ${i + 1})` : ''), map, npc);
    if (await G(`!!G.flags[${JSON.stringify(flag)}]`)) return;
    console.log(`${stamp()}    lost - training up and trying again`);
    await boost(L + 6 * (i + 1));
  }
  await die(`${label}: lost three times`);
}
// the same for a battle that starts by stepping onto a spot (a story zone)
async function beatAt(label, map, x, y, flag, L) {
  for (let i = 0; i < 3 && !(await G(`!!G.flags[${JSON.stringify(flag)}]`)); i++) {
    if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(L + 6 * i); }
    await goto(label + (i ? ` (try ${i + 1})` : ''), map, x, y);
  }
  if (!(await G(`!!G.flags[${JSON.stringify(flag)}]`))) await die(`${label}: lost three times`);
}

// ---------------------------------------------------------------------
//  The playthrough: chapter after chapter, the auto-player until every goal flag is set
// ---------------------------------------------------------------------
const CHAPTER = +arg('chapter', 0) || 0, FROM = +String(arg('from', 'ch1')).replace(/\D/g, '') || 1;
console.log(`Journey II playthrough · seed ${SEED} · ${path.basename(browserPath)}${SHOW ? ' (visible)' : ''}${FROM > 1 ? ' · from chapter ' + FROM : ''}`);
async function load(seed) {
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`typeof Journey === 'object' && typeof Retro === 'object' && typeof MStory === 'object' && !!document.getElementById('journey2Btn')`).catch(() => false)) break; }
  await ev('Journey._world("meridia")');
  await ev(`(${botMain.toString()})(${seed})`);
}
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await load(SEED);
async function title(how) {
  await ev(`document.getElementById('journey2Btn').click(); true`);
  await sleep(400);
  if (how === 'new') await ev(`(() => { const t = document.querySelector('.jtitle'); t.querySelector('input').value = 'Tester'; t.querySelectorAll('[data-l]')[1].click(); t.querySelector('[data-a=new]').click(); return true; })()`);
  else await ev(`document.querySelector('.jtitle [data-a=cont]').click(); true`);
  await sleep(600);
}
// the start of chapter n, as a save: what a player has who finished the chapters before it
const START_OF = n => `(() => {
  const C = MStory.CHAPTERS, c = C[${n}], grown = Journey._J.grown;
  const g = Journey._newGame('Tester', 'blue');
  for (const k of Object.keys(C)) if (+k < ${n}) for (const f of C[k].goals) g.flags[f] = true;
  Object.assign(g.flags, { rivalStarter: 'mudkip', mystarter: 'torchic' });
  // every badge the chapters before it give (a chapter may give two: its goals list them as badge.<id>)
  g.badges = MStory.BADGES.map(b => b.id).filter(id => g.flags['badge.' + id]);
  g.money = 6000 + 3000 * ${n};
  g.party = ['torchic', 'pikachu', 'rookidee', 'eevee'].map(s => Prog.newMon(grown(s, c.level + 4), c.level + 4, { met: 'Meridia' }));
  g.bag = { shoes: 1, pokedex: 1, notebook: 1, expshare: 1, poke: 10, great: 10, ultra: 5, potion: 10, superpotion: 10, fullheal: 5, revive: 5 };
  for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
  g.map = c.start.map; g.x = c.start.x * 16 + 8; g.y = c.start.y * 16 + 13; g.dir = c.start.dir || 'down';
  localStorage.setItem('pokemon-arena-journey2-v1', JSON.stringify(g));
  return true;
})()`;
if (FROM === 1) { console.log(`${stamp()}  title screen: new game`); await title('new'); await expect('the game to start in your room', `Journey.active && S.map.id === MStory.START.map`); }
else {
  if (!(await ev(`!!MStory.CHAPTERS[${FROM}] && !!MMaps.M[MStory.CHAPTERS[${FROM}].start.map]`))) await die(`chapter ${FROM} is not registered or its start map is missing`);
  console.log(`${stamp()}  title screen: Continue (a save from the start of Chapter ${FROM})`);
  await ev(START_OF(FROM)); await title('cont');
  await expect(`the start of Chapter ${FROM}`, `Journey.active && S.map.id === MStory.CHAPTERS[${FROM}].start.map`);
}
async function chapterDone(n) {
  const missingFlags = await G(`(MStory.CHAPTERS[${n}] ? MStory.CHAPTERS[${n}].goals : []).filter(f => !G.flags[f])`);
  if (missingFlags.length) await die(`Chapter ${n} is over but these story flags were never set: ${missingFlags.join(', ')}`);
  console.log(`${stamp()}  Chapter ${n} done: every story flag set`);
}
// one chapter: the auto-player's next step, again and again, until every goal is set. A step that changes no flag is
// tried at most three times; a battle that changes nothing (lost) trains the party up first
async function autoChapter(n) {
  const c = await ev(`(() => { const c = MStory.CHAPTERS[${n}]; return c && { title: c.title, level: c.level, goals: c.goals }; })()`);
  if (!c) return die(`chapter ${n} is not registered`);
  console.log(`${stamp()}  ===== Chapter ${n}: ${c.title} =====`);
  let level = c.level + 4;
  await boost(level);
  const tried = {};
  for (let round = 0; round < 500; round++) {
    const missing = await G(`${JSON.stringify(c.goals)}.filter(f => !G.flags[f])`);
    if (!missing.length) return chapterDone(n);
    const next = await ev(`__bot.nextTarget(${JSON.stringify(missing)}, ${JSON.stringify(tried)})`);
    if (!next) return die(`Chapter ${n}: nothing left the player can do, but these flags are still missing: ${missing.join(', ')}`);
    const before = await G('JSON.stringify(G.flags)');
    await boost(level);
    await step(next.label, next.goal, 300);
    const after = await G('JSON.stringify(G.flags)');
    if (after !== before) { for (const k of Object.keys(tried)) delete tried[k]; }
    else {
      tried[next.key] = (tried[next.key] || 0) + 1;
      if (/^battle/.test(next.label)) { level += 6; console.log(`${stamp()}    no change - training up to Lv ${level}`); await boost(level); }
    }
  }
  return die(`Chapter ${n}: still not done after 500 steps`);
}
const LAST = CHAPTER || Math.max(...(await ev('Object.keys(MStory.CHAPTERS).map(Number)')));
for (let n = FROM; n <= LAST; n++) await autoChapter(n);
console.log(`\n${stamp()}  PASS: played through${CHAPTER ? ' to the end of Chapter ' + CHAPTER : ''} (seed ${SEED})`);
await quit(0);
