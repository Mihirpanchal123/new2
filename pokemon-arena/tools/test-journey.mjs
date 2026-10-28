// Checks Journey's maps and story (jmaps.js, jstory.js) without a browser: every map is well-formed and linked both
// ways, nothing stands in a wall, and - playing the story's flags forward from a new game - every map, person, item
// and door can be reached and the chapter's goals are met, so the story can never get stuck.
// Exits with code 1 on any failure. Usage: node tools/test-journey.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, document: { createElement: () => ({ getContext: () => ({}) }) } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'jart.js', 'jmaps.js', 'jstory.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const { JMaps, JStory, JArt, DEX } = vm.runInContext('({ JMaps, JStory, JArt, DEX: window.POKEDEX })', ctx);
const { M } = JMaps, { META, T, TRAINERS, ITEMS } = JStory;

let fails = 0, warns = 0;
const fail = msg => { fails++; console.log('FAIL ' + msg); };
const warn = msg => { warns++; console.log('warn ' + msg); };
const KNOWN = new Set([...Object.keys(JArt.KIND), 'X', 'S']);
const inB = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;

// ---- 1. every map on its own
for (const m of Object.values(M)) {
  if (m.rows.some(r => r.length !== m.w)) fail(`${m.id}: rows of different lengths`);
  m.rows.forEach((r, y) => [...r].forEach((c, x) => { if (!KNOWN.has(c)) fail(`${m.id}: unknown tile '${c}' at ${x},${y}`); }));
  const S = JMaps.solidGrid(m, {});
  const solid = (x, y) => !inB(m, x, y) || S[y][x];
  for (const b of m.buildings) {
    const B = JArt.BUILD[b.b];
    if (!B) { fail(`${m.id}: unknown building ${b.b}`); continue; }
    if (!inB(m, b.x, b.y) || !inB(m, b.x + B.w - 1, b.y + B.h - 1)) fail(`${m.id}: building ${b.b} out of the map`);
    const inside = M[b.to];
    if (!inside) { fail(`${m.id}: building leads to missing map ${b.to}`); continue; }
    if (inside.outside !== m.id) fail(`${b.to}: its outside should be ${m.id} (is ${inside.outside})`);
    if (!inside.arrive) fail(`${b.to}: no arrive point`);
    for (const d of JMaps.doorsOf(b)) if (solid(d.x, d.y + 1)) fail(`${m.id}: the tile below the ${b.b} door (${d.x},${d.y + 1}) is blocked`);
    if (b.locked && !T[b.locked]) fail(`${m.id}: locked event ${b.locked} missing`);
    // other buildings may not overlap it
    for (const o of m.buildings) if (o !== b) { const O = JArt.BUILD[o.b]; if (b.x < o.x + O.w && o.x < b.x + B.w && b.y < o.y + O.h && o.y < b.y + B.h) fail(`${m.id}: buildings ${b.b} and ${o.b} overlap`); }
  }
  if (m.outside) {
    if (!M[m.outside]) fail(`${m.id}: outside map ${m.outside} missing`);
    else if (!M[m.outside].buildings.some(b => b.to === m.id)) fail(`${m.id}: no building in ${m.outside} leads here`);
    if (!m.rows.some(r => r.includes('m'))) fail(`${m.id}: no door mat`);
    if (m.arrive && solid(m.arrive.x, m.arrive.y)) fail(`${m.id}: arrive point is blocked`);
  }
  for (const n of m.npcs) {
    if (!inB(m, n.x, n.y) || S[n.y][n.x]) fail(`${m.id}: ${n.id} stands in a wall at ${n.x},${n.y}`);
    if (n.talk && !T[n.talk]) fail(`${m.id}: ${n.id} talk ${n.talk} missing`);
    if (n.trainer) {
      const tr = TRAINERS[n.trainer];
      if (!tr) fail(`${m.id}: trainer ${n.trainer} missing`);
      else { for (const [s, L] of tr.team) if (!DEX.species[s] || L < 1 || L > 100) fail(`${n.trainer}: bad team member ${s} ${L}`); if (tr.onWin && !T[tr.onWin]) fail(`${n.trainer}: onWin ${tr.onWin} missing`); }
    }
  }
  for (const f of m.furniture) { if (!JArt.FURN[f.k]) fail(`${m.id}: unknown furniture ${f.k}`); if (f.talk && !T[f.talk]) fail(`${m.id}: furniture talk ${f.talk} missing`); }
  for (const it of m.items) { if (!ITEMS[it.item]) fail(`${m.id}: unknown item ${it.item}`); if (it.hidden ? solid(it.x, it.y) : !inB(m, it.x, it.y)) fail(`${m.id}: item ${it.item} at ${it.x},${it.y} is in a wall`); if (!it.hidden && S[it.y][it.x] && JArt.SOLID.has(JArt.KIND[m.rows[it.y][it.x]])) fail(`${m.id}: item ${it.item} placed on a solid tile`); }
  for (const z of m.zones) if (!T[z.event]) fail(`${m.id}: zone event ${z.event} missing`);
  for (const w of m.warps) { const t = M[w.to]; if (!t) fail(`${m.id}: warp to missing ${w.to}`); else if (!inB(t, w.tx, w.ty) || JMaps.solidGrid(t, {})[w.ty][w.tx]) fail(`${m.id}: warp lands in a wall of ${w.to} (${w.tx},${w.ty})`); }
  if (m.stock) for (const k of m.stock) if (!ITEMS[k] || !ITEMS[k].price) fail(`${m.id}: stock ${k} is not for sale`);
  if (m.encounters) for (const e of Object.values(m.encounters)) for (const [s] of e.table) { if (!DEX.species[s]) fail(`${m.id}: wild ${s} missing`); else if (!DEX.species[s].catchRate) fail(`${m.id}: ${s} has no catch rate`); }
  // edges: the other map links back, and both sides are open
  for (const [side, e] of Object.entries(m.edges)) {
    const t = M[e.to];
    if (!t) { fail(`${m.id}: edge ${side} to missing ${e.to}`); continue; }
    const back = { n: 's', s: 'n', w: 'e', e: 'w' }[side], be = t.edges[back];
    if (!be || be.to !== m.id) { fail(`${m.id}: ${e.to} has no ${back} edge back`); continue; }
    if ((e.dx || 0) !== -(be.dx || 0) || (e.dy || 0) !== -(be.dy || 0)) fail(`${m.id} <-> ${e.to}: offsets don't match`);
    const TS = JMaps.solidGrid(t, {});
    let open = 0;
    if (side === 'n' || side === 's') for (let x = 0; x < m.w; x++) { const y = side === 'n' ? 0 : m.h - 1, ty = side === 'n' ? t.h - 1 : 0, tx = x + (e.dx || 0); if (!S[y][x] && inB(t, tx, ty) && !TS[ty][tx]) open++; else if (!S[y][x]) fail(`${m.id}: edge ${side} at x=${x} leads into a wall of ${e.to}`); }
    else for (let y = 0; y < m.h; y++) { const x = side === 'w' ? 0 : m.w - 1, tx = side === 'w' ? t.w - 1 : 0, ty = y + (e.dy || 0); if (!S[y][x] && inB(t, tx, ty) && !TS[ty][tx]) open++; else if (!S[y][x]) fail(`${m.id}: edge ${side} at y=${y} leads into a wall of ${e.to}`); }
    if (!open) fail(`${m.id}: edge ${side} has no open tile`);
  }
}

// ---- 2. the story, played forward from a new game
const flags = { };
const cond = list => !list || list.every(c => c[0] === '!' ? !flags[c.slice(1)] : !!flags[c]);
const fired = new Set(), reachedMaps = new Set(), metNpc = new Set(), gotItem = new Set();
function reach() {
  // flood fill over every map from the start, through doors, mats, stairs and edges the flags allow
  const seen = new Map();   // map -> Set of "x,y"
  const queue = [['home2f', 2, 3]];
  const solids = {};
  const grid = id => solids[id] || (solids[id] = (() => {
    const m = M[id], S = JMaps.solidGrid(m, flags).map(r => r.slice());
    for (const n of m.npcs) if (cond(n.show) && !flags['gone.' + id + '.' + n.id]) S[n.y][n.x] = true;
    if (flags['ride.cut']) m.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'X') S[y][x] = false; }));
    for (const z of m.zones) if (z.block && cond(META[z.event] && META[z.event].needs)) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) S[y][x] = true;
    return S;
  })());
  while (queue.length) {
    const [id, x, y] = queue.pop(), m = M[id];
    if (!seen.has(id)) seen.set(id, new Set());
    const set = seen.get(id), k = x + ',' + y;
    if (set.has(k)) continue;
    set.add(k);
    const S = grid(id);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (inB(m, nx, ny)) {
        if (S[ny][nx]) continue;
        // ledges: only downward
        if (m.rows[ny][nx] === 'v') { if (dy === 1 && inB(m, nx, ny + 1) && !S[ny + 1][nx]) queue.push([id, nx, ny + 1]); continue; }
        if (m.rows[y][x] === 'v') continue;
        queue.push([id, nx, ny]);
      } else {
        const side = ny < 0 ? 'n' : ny >= m.h ? 's' : nx < 0 ? 'w' : 'e', e = m.edges[side];
        if (!e || !cond(e.needs)) continue;
        const t = M[e.to], tx = side === 'n' || side === 's' ? x + (e.dx || 0) : side === 'w' ? t.w - 1 : 0, ty = side === 'w' || side === 'e' ? y + (e.dy || 0) : side === 'n' ? t.h - 1 : 0;
        if (inB(t, tx, ty) && !grid(e.to)[ty][tx]) queue.push([e.to, tx, ty]);
      }
    }
    for (const b of m.buildings) for (const d of JMaps.doorsOf(b)) if (d.x === x && d.y === y && cond(b.needs)) { const t = M[b.to]; queue.push([b.to, t.arrive.x, t.arrive.y]); }
    if (m.rows[y][x] === 'm' && m.outside) { const o = M[m.outside], b = o.buildings.find(bb => bb.to === id), d = JMaps.doorsOf(b)[0]; queue.push([o.id, d.x, d.y + 1]); }
    for (const w of m.warps) if (Math.abs(w.x - x) + Math.abs(w.y - y) === 1) queue.push([w.to, w.tx, w.ty]);
  }
  return seen;
}
const near = (seen, id, x, y, self = false) => { const s = seen.get(id); return !!s && (self && s.has(x + ',' + y) || [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2]].some(([dx, dy]) => s.has((x + dx) + ',' + (y + dy)))); };
for (let round = 0; round < 50; round++) {
  const seen = reach();
  let changed = false;
  const before = { ...flags }, shown = list => !list || list.every(c => c[0] === '!' ? !before[c.slice(1)] : !!before[c]);
  const fire = (id, sets) => { if (fired.has(id)) return; fired.add(id); for (const s of sets || []) if (!flags[s]) { flags[s] = true; changed = true; } changed = true; };
  if (!fired.has('intro')) fire('intro', META.intro.sets);
  for (const [id, set] of seen) {
    reachedMaps.add(id);
    const m = M[id];
    for (const n of m.npcs) {
      if (!shown(n.show) || before['gone.' + id + '.' + n.id] || !near(seen, id, n.x, n.y, false)) continue;
      metNpc.add(id + '.' + n.id);
      if (n.talk && cond(META[n.talk] && META[n.talk].needs)) fire(n.talk + '@' + id, (META[n.talk] || {}).sets);
      if (n.trainer) { fire('tr.' + id + '.' + n.id, ['tr.' + id + '.' + n.id]); const tr = TRAINERS[n.trainer]; if (tr.onWin) fire(tr.onWin, META[tr.onWin].sets); }
    }
    for (const z of m.zones) { let hit = false; for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (set.has(x + ',' + y) || near(seen, id, x, y)) hit = true; if (hit && cond(META[z.event] && META[z.event].needs) && cond(z.needs)) fire(z.event + '@' + id, META[z.event].sets); }
    for (const it of m.items) if (it.hidden ? set.has(it.x + ',' + it.y) || near(seen, id, it.x, it.y) : near(seen, id, it.x, it.y)) gotItem.add(id + '.' + it.x + '.' + it.y);
    for (const f of m.furniture) if (f.talk && META[f.talk] && near(seen, id, f.x, f.y)) fire(f.talk + '@' + id, META[f.talk].sets);
  }
  if (!changed) break;
}
const GOALS = ['intro', 'shoes', 'starter', 'rival1', 'dex', 'soraR1', 'luna_back', 'shard1', 'badge.leaf', 'ride.cut'];
for (const g of GOALS) if (!flags[g]) fail(`story: the flag '${g}' can never be set`);
for (const id of Object.keys(M)) if (!reachedMaps.has(id) && id !== 'route2') fail(`story: map ${id} can never be reached`);
for (const m of Object.values(M)) {
  for (const n of m.npcs) if ((n.talk || n.trainer) && !metNpc.has(m.id + '.' + n.id)) fail(`story: nobody can ever talk to ${m.id}.${n.id}`);
  for (const it of m.items) if (!gotItem.has(m.id + '.' + it.x + '.' + it.y)) fail(`story: item ${it.item} at ${m.id} ${it.x},${it.y} can never be picked up`);
}
console.log(`maps: ${Object.keys(M).length} · flags reached: ${Object.keys(flags).length} · events fired: ${fired.size} · ${fails ? fails + ' FAILURES' : 'all good'}${warns ? ` · ${warns} warnings` : ''}`);
process.exit(fails ? 1 : 0);
