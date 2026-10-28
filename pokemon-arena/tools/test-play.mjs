// Plays Journey in a real browser, the way a player does, and fails the moment the game gets stuck.
// A bot inside the page walks with the arrow keys (finding its way through doors, stairs, ledges and map edges),
// talks with Enter, answers questions with the number keys, clicks the starter picker, the shop and the PC, and in
// battle clicks the move buttons, BALL, RUN and BAG. A watchdog fails the run when nothing on screen changes for a
// while (no text, no movement, no menu, no battle progress), and any JavaScript error or missing file fails it too.
// On a failure it prints what was on screen, the last lines of dialog and a screenshot path.
//
// Usage: node tools/test-play.mjs [--chapter=1|2] [--seed=N] [--show] [--browser=path]
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
const send = (method, params = {}) => new Promise(r => { const i = ++msgId; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text).split('\n')[0]);
  return r.result.result.value;
}
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

// ---------------------------------------------------------------------
//  The bot (runs inside the page). Everything it does goes through the game's real controls.
// ---------------------------------------------------------------------
function botMain(seed) {
  const J = Journey, S = () => J._S(), G = () => J._G(), M = JMaps.M, TS = 16;
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
    const W = (live ? S().solid : JMaps.solidGrid(m, G().flags)).map(r => r.slice());
    const people = live ? S().npcs.filter(n => !n.hidden).flatMap(n => n.moving ? [[n.tx, n.ty], [n.moving.tx, n.moving.ty]] : [[n.tx, n.ty]])
      : m.npcs.filter(n => conds(n.show) && !G().flags['gone.' + id + '.' + n.id]).map(n => [n.x, n.y]);
    for (const [x, y] of people) if (W[y]) W[y][x] = true;
    for (const z of m.zones) if (z.block && conds(JStory.META[z.event] && JStory.META[z.event].needs)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) W[y][x] = true;
    for (const b of m.buildings) if (!conds(b.needs)) for (const d of JMaps.doorsOf(b)) W[d.y][d.x] = true;
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
      if (W[ny][nx]) continue;
      const door = m.buildings.find(b => JMaps.doorsOf(b).some(d => d.x === nx && d.y === ny));
      if (door) { if (dir === 'up') { const t = M[door.to]; out.push(conds(door.needs) ? [dir, door.to, t.arrive.x, t.arrive.y, 'door'] : [dir, id, nx, ny, 'walk']); } continue; }
      if (ch === 'm' && m.outside && dir === 'down') { const o = M[m.outside], b = o.buildings.find(bb => bb.to === id), d = JMaps.doorsOf(b)[0]; out.push([dir, o.id, d.x + (JArt.BUILD[b.b].door.length > 1 ? 1 : 0), d.y + 1, 'mat']); continue; }
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
    const balls = Object.keys(G().bag).filter(k => JStory.ITEMS[k].pocket === 'balls').length;
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
    if (at && Math.abs(here.x - c.x) < 2.5 && Math.abs(here.y - c.y) < 2.5) { hold([]); return at; }
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
      if (g.type === 'trigger' && g.armed) g.started = true;
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
let failed = false;
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
  console.log(`  repeat with: node tools/test-play.mjs --seed=${SEED}${CHAPTER ? ' --chapter=' + CHAPTER : ''}`);
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
//  The playthrough
// ---------------------------------------------------------------------
// Sections run in order; --from=<section> starts at one with a ready-made save (the end of the chapter before) so a
// change late in the story can be checked without playing everything before it.
// Chapters 3 and on are played by tools/play/chN.mjs (one file per chapter); --from=chN starts it from a save made
// from the chapter list (JStory.CHAPTERS: the badges and story flags of the chapters before, a party at its level).
const CHAPTER = +arg('chapter', 0) || 0, FROM = arg('from', 'story1');
const PLAYDIR = path.join(ROOT, 'tools', 'play');
const CHSCRIPTS = (fs.existsSync(PLAYDIR) ? fs.readdirSync(PLAYDIR) : []).filter(f => /^ch\d+\.mjs$/.test(f)).map(f => 'ch' + parseInt(f.slice(2))).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
const SECTIONS = ['story1', 'extras', 'story2', ...CHSCRIPTS];
if (!SECTIONS.includes(FROM)) { console.log(`--from must be one of: ${SECTIONS.join(', ')}`); await quit(2); }
const chapterOf = s => ({ story1: 1, extras: 1, story2: 2 })[s] || parseInt(s.slice(2));
const runs = s => SECTIONS.indexOf(s) >= SECTIONS.indexOf(FROM) && (!CHAPTER || chapterOf(s) <= CHAPTER);
console.log(`Journey playthrough · seed ${SEED} · ${path.basename(browserPath)}${SHOW ? ' (visible)' : ''}${FROM !== 'story1' ? ' · from ' + FROM : ''}`);
async function load(seed) {
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`typeof Journey === 'object' && typeof Retro === 'object' && !!document.getElementById('journeyBtn')`).catch(() => false)) break; }
  await ev(`(${botMain.toString()})(${seed})`);
}
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
await load(SEED);
// the save at the end of Chapter 1 (what a player has who beat Luna)
const END_OF_CH1 = `(() => {
  const g = Journey._newGame('Tester', 'blue');
  for (const f of ['intro', 'shoes', 'starter', 'rival1', 'dex', 'granny', 'oldman', 'soraR1', 'nico', 'shardQuest', 'gruntsFled', 'shard1', 'luna_back', 'badge.leaf', 'ride.cut', 'tr.route1.tim', 'tr.route1.mia', 'tr.whisperwood.rick', 'tr.whisperwood.lily', 'tr.gym1.fern', 'tr.gym1.ivo', 'tr.gym1.tess', 'tr.gym1.luna']) g.flags[f] = true;
  Object.assign(g.flags, { rivalStarter: 'piplup', shardsGiven: 1, momGifts: 1 });
  g.badges = ['leaf']; g.money = 4200;
  g.party = [Prog.newMon('chimchar', 24, { met: 'Willowbrook Town' }), Prog.newMon('pidgey', 20, { met: 'Route 1' })];
  g.bag = { shoes: 1, pokedex: 1, ridepager: 1, linkstone: 1, poke: 8, great: 1, potion: 6, antidote: 1, 'tm:magical-leaf': 1 };
  for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
  g.map = 'verdant'; g.x = 14 * 16 + 8; g.y = 14 * 16 + 13; g.lastCenter = { map: 'center_verdant' };
  localStorage.setItem('pokemon-arena-journey-v1', JSON.stringify(g));
  return true;
})()`;
async function title(how) {
  await ev(`document.getElementById('journeyBtn').click(); true`);
  await sleep(400);
  if (how === 'new') {
    await ev(`(() => { const t = document.querySelector('.jtitle'); t.querySelector('input').value = 'Tester'; t.querySelectorAll('[data-l]')[1].click(); t.querySelector('[data-a=new]').click(); return true; })()`);
    // a new game opens with a film (jintro.js): watch a little of it, then skip it with Escape like a player
    if (await ev(`typeof JIntro === 'object'`)) {
      for (let i = 0; i < 20 && !(await ev('JIntro.playing')); i++) await sleep(150);
      if (!(await ev('JIntro.playing'))) await die('the opening film did not start');
      console.log(`${stamp()}  the opening film: watch a few seconds, then Escape`);
      await sleep(3000);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
      for (let i = 0; i < 40 && !(await ev('Journey.active')); i++) await sleep(150);
      await checkProblems();
    }
  } else await ev(`document.querySelector('.jtitle [data-a=cont]').click(); true`);
  await sleep(600);
}
// the start of chapter n, as a save: what a player has who finished the chapters before it
const START_OF = n => `(() => {
  const C = JStory.CHAPTERS, c = C[${n}], grown = Journey._J.grown;
  const g = Journey._newGame('Tester', 'blue');
  for (const f of ['intro', 'shoes', 'starter', 'rival1', 'dex', 'film']) g.flags[f] = true;
  for (const k of Object.keys(C)) if (+k < ${n}) for (const f of C[k].goals) g.flags[f] = true;
  g.flags.rivalStarter = 'piplup';
  g.badges = Object.values(C).filter(x => x.n < ${n} && x.badge).map(x => x.badge);
  for (const b of g.badges) g.flags['badge.' + b] = true;
  g.money = 6000 + 3000 * ${n};
  g.party = ['chimchar', 'pidgey', 'mareep'].map(s => Prog.newMon(grown(s, c.level), c.level, { met: 'Valoria' }));
  g.bag = { shoes: 1, pokedex: 1, ridepager: 1, expshare: 1, poke: 10, great: 10, potion: 10, superpotion: 10, fullheal: 5, revive: 3 };
  for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
  g.map = c.start.map; g.x = c.start.x * 16 + 8; g.y = c.start.y * 16 + 13; g.dir = c.start.dir || 'down';
  g.lastCenter = c.center ? { map: c.center } : null;
  localStorage.setItem('pokemon-arena-journey-v1', JSON.stringify(g));
  return true;
})()`;
if (FROM === 'story1') { console.log(`${stamp()}  title screen: new game`); await title('new'); await expect('the game to start in your room', `Journey.active && S.map.id === 'home2f'`); }
else if (FROM === 'extras' || FROM === 'story2') { console.log(`${stamp()}  title screen: Continue (a save from the end of Chapter 1)`); await ev(END_OF_CH1); await title('cont'); await expect('the saved game', `Journey.active && G.badges.length === 1`); }
else {
  const n = chapterOf(FROM);
  if (!(await ev(`!!JStory.CHAPTERS[${n}] && !!JMaps.M[JStory.CHAPTERS[${n}].start.map]`))) await die(`chapter ${n} is not registered or its start map is missing`);
  console.log(`${stamp()}  title screen: Continue (a save from the start of Chapter ${n})`);
  await ev(START_OF(n)); await title('cont');
  await expect(`the start of Chapter ${n}`, `Journey.active && S.map.id === JStory.CHAPTERS[${n}].start.map`);
}
// after a chapter: every story flag it lists was set
async function chapterDone(n) {
  const missingFlags = await G(`(JStory.CHAPTERS[${n}] ? JStory.CHAPTERS[${n}].goals : []).filter(f => !G.flags[f])`);
  if (missingFlags.length) await die(`Chapter ${n} is over but these story flags were never set: ${missingFlags.join(', ')}`);
  console.log(`${stamp()}  Chapter ${n} done: every story flag set`);
}

// ===== Chapter 1 =====
if (runs('story1')) {
  await step('intro', { type: 'goto', map: 'home2f', x: 2, y: 4 });
  await talk('the TV in your room', 'home2f', [5, 1]);
  await talk('your PC', 'home2f', [3, 1]);
  await talk('Mom: Running Shoes', 'home1f', 'mom');
  await expect('the Running Shoes', `G.flags.shoes && G.bag.shoes`);
  await trigger('try to leave town with no Pokémon', 'willowbrook', 12, 2);
  await expect('to be sent back', `S.map.id === 'willowbrook' && Math.floor((S.player.y - 3) / 16) >= 3 && !G.flags.starter`);
  await talk('the town sign', 'willowbrook', [10, 3]);
  await talk('Granny Rue', 'wbhouse', 'granny');
  await talk("Sora's mom", 'sorahouse', 'soramom');
  await talk('Sora at home', 'sorahouse', 'sora');
  await talk('the lab Aide', 'lab', 'aide');
  await talk('Prof. Hazel: choose a starter, rival battle', 'lab', 'hazel');
  await expect('a starter, the rival battle and the Pokédex', `G.flags.starter && G.flags.rival1 && G.flags.dex && G.party.length === 1 && G.bag.pokedex`);
  console.log(`${stamp()}    starter: ${await G('G.party[0].species')} (rival: ${await G('G.flags.rivalStarter')})`);
  await boost(18);
  await talk('Old Man Bo: catching lesson', 'route1', 'oldman');
  await talk('item: Potion', 'route1', [16, 32]);
  await talk('hidden item: Oran Berry', 'route1', [4, 37], { on: true });
  await policy('P.potion = 1');
  await talk('Youngster Tim', 'route1', 'tim');
  await talk('Lass Mia', 'route1', 'mia');
  await talk('item: Poké Ball', 'route1', [4, 14]);
  await talk('hidden item: Antidote', 'route1', [16, 5], { on: true });
  await goto('north through Route 1 (Sora is waiting)', 'route1', 10, 3);
  await expect('Sora on Route 1', `G.flags.soraR1`);
  await grass('wild Pokémon in the grass: catch one', 'route1', [[5, 31], [6, 34], [5, 33], [7, 32]], 'catch');
  await goto('to Verdant Town', 'verdant', 14, 14);
  await talk('the worker at the rockslide', 'verdant', 'worker');
  await trigger('the locked gym door', 'verdant', 21, 20);
  await expect('the gym to stay locked', `S.map.id === 'verdant' && !G.flags.luna_back`);
  await talk('the Gym Guide', 'verdant', 'guide');
  await policy(`P.answers = [['Heal your', 0]]`);
  await talk('Nurse Bell: heal', 'center_verdant', 'nurse');
  await policy(`B.menuTask = menu => { if (menu !== 'pc') return false; const q = s => [...document.querySelectorAll('#journey .jpanel ' + s)]; if (!B.did && Journey._G().party.length > 1) { B.did = 1; q('[data-a=dep]').pop().click(); return true; } if (B.did === 1) { B.did = 2; q('[data-a=wd]')[0].click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the PC: deposit and withdraw', 'center_verdant', [11, 1]);
  await expect('the party back together', `G.box.length === 0`);
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=potion][data-q="5"]').click(); return true; } if (B.did === 1) { B.did = 2; q('[data-a=shopmode][data-p=sell]').click(); return true; } if (B.did === 2) { B.did = 3; const s = q('[data-a=sell][data-i=antidote]'); if (s) { s.click(); return true; } } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: buy and sell', 'mart_verdant', 'clerk');
  await expect('5 Potions bought and an Antidote sold', `G.money === ${money} - 1500 + 50 && G.bag.potion >= 5`);
  await talk('Nico: Link Stone', 'vhouse', 'kid');
  await talk("Nico's dad", 'vhouse', 'dad');
  await talk('Astronomer Orrin: the shard quest', 'astrohouse', 'orrin');
  await talk('the telescope', 'astrohouse', [4, 1]);
  await expect('the Link Stone and the shard quest', `G.bag.linkstone && G.flags.shardQuest`);
  await talk('Bug Catcher Rick', 'whisperwood', 'rick');
  await talk('Bug Catcher Lily', 'whisperwood', 'lily');
  await talk('item: Great Ball', 'whisperwood', [24, 22]);
  await goto('Team Eclipse at the ancient tree', 'whisperwood', 14, 8);
  await expect('Luna saved and a Meteor Shard', `G.flags.luna_back && G.bag.shard === 1`);
  await talk('Orrin: hand in the shard', 'astrohouse', 'orrin');
  await expect('the shard handed in', `G.flags.shardsGiven === 1 && !G.bag.shard`);
  await beat('Aroma Lady Fern', 'gym1', 'fern', 'tr.gym1.fern', 18);
  await beat('Camper Ivo', 'gym1', 'ivo', 'tr.gym1.ivo', 18);
  await beat('Aroma Lady Tess', 'gym1', 'tess', 'tr.gym1.tess', 18);
  await beat('Leader Luna', 'gym1', 'luna', 'badge.leaf', 18);
  await expect('the Leaf Badge, the TM and the Ride Pager', `G.badges.includes('leaf') && G.bag['tm:magical-leaf'] && G.bag.ridepager && G.flags['ride.cut']`);
  await talk('the gym statue', 'gym1', [5, 14]);
  await talk('Cut the small tree', 'verdant', [4, 21]);
  await talk('item behind it: Rare Candy', 'verdant', [4, 22]);
  await expect('the Rare Candy', `G.bag.rarecandy >= 1`);
}

// ===== Around the story: the menus, saving, losing =====
if (runs('extras')) {
  if (!(await G('G.bag.rarecandy'))) await G(`(G.bag.rarecandy = 1, true)`);
  await policy(`B.menuTask = menu => { const q = s => document.querySelector('#journey .jpanel ' + s); const seq = B.seq || (B.seq = ['party', '[data-m="0"]', '[data-a=party]', '[data-a=menu]', 'dex', '[data-a=menu]', 'card', '[data-a=menu]', 'bag', '[data-a=pocket][data-p=medicine]', '[data-a=item][data-i=rarecandy]', 'mon0']); const n = seq.shift(); if (!n) { B.seq = null; B.menuTask = null; return false; } if (n === 'mon0') { q('[data-m="0"]').click(); return true; } const el = /^[a-z]+$/.test(n) ? q('[data-a=' + n + ']') : q(n); if (!el) { console.error('menu: no ' + n + ' in ' + menu); return false; } el.click(); return true; }`);
  const lv = await G('G.party[0].level');
  await step('the menus: Pokémon, summary, Pokédex, card, bag, use a Rare Candy', { type: 'press', key: 'Escape' }, 120);
  await expect('the Rare Candy to raise the level', `G.party[0].level === ${lv} + 1`);
  await talk('Mom: badge gift and heal', 'home1f', 'mom');
  // save, reload, continue
  await G(`(Journey.save(), true)`);
  const where = await G(`[S.map.id, G.badges.length, Object.keys(G.flags).length, G.party.length].join()`);
  console.log(`${stamp()}  reload the page and Continue`);
  await send('Page.reload');
  await load(SEED + 1);
  await title('cont');
  await expect(`the saved game back (${where})`, `[S.map.id, G.badges.length, Object.keys(G.flags).length, G.party.length].join() === ${JSON.stringify(where)}`);
  // losing: a whiteout sends you to the Pokémon Center and the game goes on
  await goto('out to Route 1', 'route1', 10, 30);
  await G(`(G.party.forEach(m => { m.hp = 1; }), true)`);
  await policy(`P.wild = 'fight'`);
  await step('lose a battle to a wild Lv 60 Onix on purpose (whiteout)', { type: 'press', js: `Journey._wild('onix', 60)` });
  await expect('to wake up at the Pokémon Center', `S.map.id === 'center_verdant' && G.party.every(m => m.hp > 0)`);
  await talk('Nurse Bell after the whiteout', 'center_verdant', 'nurse');
}
if (runs('story1')) await chapterDone(1);

// ===== Chapter 2 =====
if (runs('story2')) {
  await boost(24);
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 1`);
  await goto('Verdant Town: the rockslide is gone', 'verdant', 26, 11);
  await expect('the worker gone and the road east open', `S.npcs.every(n => n.id !== 'worker' || n.hidden) && G.flags.ch2`);
  await goto('east onto Route 2', 'route2', 2, 11);
  await talk('the Route 2 sign', 'route2', [2, 10]);
  await talk('the worker by the rocks', 'route2', 'worker2');
  await beat('Hiker Dale', 'route2', 'dale', 'tr.route2.dale', 24);
  await talk('hidden item: TM Rock Tomb', 'route2', [24, 3], { on: true });
  await talk('hidden item: Oran Berry', 'route2', [4, 3], { on: true });
  await beat('Picnicker Joy', 'route2', 'joy', 'tr.route2.joy', 24);
  await talk('item: Meteor Shard in the meadow', 'route2', [46, 4]);
  await expect('the Meteor Shard', `G.bag.shard === 1`);
  await beat('Fisherman Gil', 'route2', 'gil', 'tr.route2.gil', 24);
  await talk('item: Super Potion', 'route2', [3, 20]);
  await talk('item: Great Ball', 'route2', [20, 19]);
  await beat('Camper Ren', 'route2', 'ren', 'tr.route2.ren', 24);
  await grass('wild Pokémon on Route 2: catch one', 'route2', [[20, 12], [24, 14], [18, 13], [22, 11]], 'catch');
  await policy(`P.wild = 'run'`);
  await goto('on to Port Coralis (Sora is waiting)', 'port', 8, 10);
  await expect('the second battle with Sora', `G.flags.rival2`);
  await talk('Sailor Pip', 'port', 'greeter');
  await trigger('the locked gym door', 'port', 24, 17);
  await expect('the gym to stay locked', `S.map.id === 'port' && !G.flags.rex_back`);
  await talk('the Gym Guide', 'port', 'guide2');
  await talk('Sailor Hal at the cave', 'port', 'guard');
  await talk('the ferryman', 'port', 'ferry');
  await talk('the town sign', 'port', [14, 11]);
  await talk('hidden item: Potions on the beach', 'port', [31, 19], { on: true });
  await talk('Marina: a gift', 'phouse', 'marina');
  await talk('Old Salt Ned', 'fhouse', 'oldsalt');
  await talk('Nurse: heal', 'center_port', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=great][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: a Great Ball', 'mart_port', 'clerk');
  await expect('a Great Ball bought', `G.money === ${money} - 600`);
  await talk('the museum: the empty case', 'museum', [6, 4]);
  await talk('Curator Wells', 'museum', 'curator');
  await talk('Rex at the museum', 'museum', 'rex');
  await expect('Rex to send you to Seacliff Cave', `G.flags.museum`);
  await goto('north into Seacliff Cave', 'seacliff', 10, 19);
  await beat('Eclipse Grunt in the tunnel', 'seacliff', 'grunt3', 'tr.seacliff.grunt3', 24);
  await grass('wild Pokémon on the cave floor', 'seacliff', [[5, 14], [15, 14], [8, 13], [18, 15]], 'run');
  await talk('hidden item: Meteor Shard in the side room', 'seacliff', [4, 4], { on: true });
  await expect('both shards', `G.bag.shard === 2`);
  await talk('item: Great Balls', 'seacliff', [9, 3]);
  await talk('item: Super Potion', 'seacliff', [20, 14]);
  await beat('Eclipse Grunt in the east passage', 'seacliff', 'grunt4', 'tr.seacliff.grunt4', 24);
  for (let i = 0; i < 3 && !(await G('G.flags.kael')); i++) {
    if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(24 + 6 * i); }
    await goto('Admin Kael and the stolen meteorite' + (i ? ` (try ${i + 1})` : ''), 'seacliff', 18, 5);
  }
  await expect('Kael beaten and the Coral Meteorite', `G.flags.kael && G.bag.meteorite`);
  await talk('item: Full Heal', 'seacliff', [23, 2]);
  await talk('Curator Wells: return the meteorite', 'museum', 'curator');
  await expect('the meteorite home, a Water Stone and Rex back at the gym', `G.flags.meteorite_back && G.flags.rex_back && G.bag.waterstone && !G.bag.meteorite`);
  await talk('the museum case again', 'museum', [6, 4]);
  await talk('Orrin: hand in two shards', 'astrohouse', 'orrin');
  await expect('the shards handed in', `G.flags.shardsGiven >= 2 && !G.bag.shard`);
  await beat('Swimmer Nia', 'gym2', 'nia', 'tr.gym2.nia', 24);
  await beat('Fisherman Otto', 'gym2', 'otto', 'tr.gym2.otto', 24);
  await beat('Swimmer Kai', 'gym2', 'kai', 'tr.gym2.kai', 24);
  await beat('Leader Rex', 'gym2', 'rex', 'badge.tide', 24);
  await expect('the Tide Badge, TM Water Pulse and the Exp. Share', `G.badges.includes('tide') && G.bag['tm:water-pulse'] && G.bag.expshare && G.flags.expshare`);
  await talk('the gym statue', 'gym2', [5, 14]);
  await talk('the ferryman (Chapter 3 is next)', 'port', 'ferry');
  // the Exp. Share: a Pokémon that sits a battle out still gets Exp. Points
  // (fainted ones get nothing, as in the main games: heal first)
  if (await G('G.party.length') > 1) {
    await talk('Nurse: heal before the test', 'center_port', 'nurse');
    const xp = await G('JSON.stringify(G.party.map(m => m.level < 100 ? m.xp : -1))');
    await goto('out onto the beach', 'port', 12, 19);
    await policy(`P.wild = 'fight'`);
    await step('a wild battle with the Exp. Share', { type: 'press', js: `Journey._wild('magikarp', 12)` });
    await expect('Exp. Points for every Pokémon that sat out', `G.party.slice(1).every((m, i) => ${xp}[i + 1] < 0 || m.xp > ${xp}[i + 1])`);
  }
  // a TM from the Bag
  await policy(`B.menuTask = menu => { const q = s => document.querySelector('#journey .jpanel ' + s); const seq = B.seq || (B.seq = ['bag', '[data-a=pocket][data-p=tms]', '[data-a=item][data-i="tm:water-pulse"]', 'able']); const n = seq.shift(); if (!n) { B.seq = null; B.menuTask = null; return false; } if (n === 'able') { const rows = [...document.querySelectorAll('#journey .jpanel [data-m]')]; (rows.find(b => b.querySelector('.ok')) || rows[0]).click(); return true; } const el = /^[a-z]+$/.test(n) ? q('[data-a=' + n + ']') : q(n); if (!el) { console.error('menu: no ' + n + ' in ' + menu); return false; } el.click(); return true; }`);
  await step('the Bag: teach TM Water Pulse', { type: 'press', key: 'Escape' }, 120);
  const learned = await G(`G.party.some(m => m.moves.includes('water-pulse'))`);
  console.log(`${stamp()}    ${learned ? 'a party Pokémon learned Water Pulse' : 'no one in the party can learn Water Pulse (the menu said so)'}`);
  await chapterDone(2);
}

// ===== Chapter 3 and on: tools/play/chN.mjs =====
// each exports a default async function (t) that plays its chapter with these helpers
const t = { step, talk, goto, trigger, grass, beat, beatAt, expect, policy, boost, G, ev, die, stamp, sleep, send,
  press: (label, key) => step(label, { type: 'press', key }),
  wild: (label, species, level) => step(label, { type: 'press', js: `Journey._wild(${JSON.stringify(species)}, ${level})` }) };
for (const sec of CHSCRIPTS) {
  if (!runs(sec)) continue;
  const n = chapterOf(sec);
  console.log(`${stamp()}  ===== Chapter ${n}: ${await ev(`(JStory.CHAPTERS[${n}] || {}).title || '?'`)} =====`);
  const mod = await import('file:///' + path.join(PLAYDIR, sec + '.mjs').split(path.sep).join('/'));
  await mod.default(t);
  await chapterDone(n);
}
console.log(`\n${stamp()}  PASS: played through${CHAPTER ? ' to the end of Chapter ' + CHAPTER : ''} (seed ${SEED})`);
await quit(0);
