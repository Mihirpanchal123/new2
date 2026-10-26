'use strict';
// =====================================================================
//  OVERWORLD — the open world of Adventure mode: a seeded map of
//  connected biome regions (grassland -> forest -> riverlands -> caves ->
//  highlands -> ancient ruins), with obstacles, water, carved paths,
//  resource nodes and landmarks. The same seed always builds the same
//  world (saves store the seed, not the map). Collision queries and the
//  pixel art live here; retro.js draws it, adventure.js plays on it.
// =====================================================================
const Overworld = (() => {
  const GEN_VERSION = 1;                 // bump when generation changes (old saves then re-place the player at camp)
  const TS = 16, PX = 3, TW = TS * PX;   // a tile is 16 art pixels = 48 world units (PX as in retro.js)
  const COLS = 200, ROWS = 150;          // a medium world: ~9600 x 7200 world units (about 45 s to walk across)
  const CH = 16;                         // chunk: 16 x 16 tiles, painted on first sight and cached

  // ground kinds
  const G = { GRASS: 0, FOREST: 1, SAND: 2, WATER: 3, PATH: 4, CAVE: 5, HIGH: 6, SNOW: 7, RUIN: 8, BRIDGE: 9 };
  // objects on a tile (all solid except the decor ones)
  const O = { NONE: 0, TREE: 1, PINE: 2, ROCK: 3, BOULDER: 4, WALL: 5, CLIFF: 6, RUINWALL: 7, PILLAR: 8, DEADTREE: 9, TALLGRASS: 10, REED: 11 };
  const SOLID = new Set([O.TREE, O.PINE, O.ROCK, O.BOULDER, O.WALL, O.CLIFF, O.RUINWALL, O.PILLAR, O.DEADTREE]);

  // Biomes in order of danger. share = part of the world's regions; the generation rules below read these.
  // Gameplay (level ranges, encounters, what nodes yield) is configured in adventure.js by biome id.
  const BIOMES = {
    grass:  { name: 'Starting Grassland', share: 0.14, ground: G.GRASS, mini: '#7cc35a', nodes: { berry: 0.007, herb: 0.003, apple: 0.0015, sticks: 0.003, pebbles: 0.002 } },
    forest: { name: 'Whispering Forest', share: 0.2, ground: G.FOREST, mini: '#2f7a3a', nodes: { berry: 0.006, mushroom: 0.007, herb: 0.004, sticks: 0.006, apple: 0.001 } },
    river:  { name: 'Riverlands', share: 0.18, ground: G.GRASS, mini: '#8fcf6a', nodes: { berry: 0.005, herb: 0.005, sticks: 0.003, pebbles: 0.003, mushroom: 0.002 } },
    cave:   { name: 'Echo Caves', share: 0.16, ground: G.CAVE, mini: '#5a4a52', dark: true, nodes: { ore: 0.009, crystal: 0.002, mushroom: 0.006, pebbles: 0.004 } },
    high:   { name: 'Windswept Highlands', share: 0.18, ground: G.HIGH, mini: '#a8b0a0', cold: true, nodes: { berry: 0.003, ore: 0.004, herb: 0.003, pebbles: 0.004 } },
    ruins:  { name: 'Ancient Ruins', share: 0.14, ground: G.RUIN, mini: '#b8a888', nodes: { crystal: 0.004, relic: 0.0012, herb: 0.002, ore: 0.002 } }
  };
  const ORDER = ['grass', 'forest', 'river', 'cave', 'high', 'ruins'];
  // one landmark per biome (adventure.js gives them meaning): where in the biome's danger band it sits (0 = nearest)
  const LANDMARKS = { grass: { kind: 'camp' }, forest: { kind: 'oak', band: 0.5 }, river: { kind: 'lake', band: 0.5 }, cave: { kind: 'grotto', band: 0.6 }, high: { kind: 'summit', band: 0.7 }, ruins: { kind: 'altar', band: 1 } };

  // ---------------------------------------------------------------------
  //  Seeded randomness and value noise
  // ---------------------------------------------------------------------
  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
    const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, s) => noise(x, y, s) * 0.55 + noise(x * 2.1, y * 2.1, s + 1) * 0.3 + noise(x * 4.3, y * 4.3, s + 2) * 0.15;

  // ---------------------------------------------------------------------
  //  Generation
  // ---------------------------------------------------------------------
  let W = null;                                       // the current world
  const idx = (x, y) => y * COLS + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

  function generate(seed) {
    seed = (seed >>> 0) || 1;
    const rnd = mulberry32(seed), S = seed % 100000;
    const N = COLS * ROWS;
    const ground = new Uint8Array(N), obj = new Uint8Array(N), region = new Int16Array(N), path = new Uint8Array(N);
    // 1. regions: jittered seed points, tiles join the nearest one (domain-warped, so borders wind organically)
    const GX = 7, GY = 5, regs = [];
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++)
      regs.push({ i: regs.length, sx: (gx + 0.5 + (rnd() - 0.5) * 0.7) * COLS / GX, sy: (gy + 0.5 + (rnd() - 0.5) * 0.7) * ROWS / GY, n: 0, cx: 0, cy: 0, adj: new Set() });
    const spawnReg = regs[Math.floor(GY / 2) * GX];   // the start is on the west edge, the danger grows eastward and outward
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const wx = x + (fbm(x / 22, y / 22, S + 11) - 0.5) * 26, wy = y + (fbm(x / 22, y / 22, S + 17) - 0.5) * 26;
      let best = 0, bd = Infinity;
      for (const r of regs) { const d = (wx - r.sx) ** 2 + (wy - r.sy) ** 2; if (d < bd) { bd = d; best = r.i; } }
      region[idx(x, y)] = best;
      const r = regs[best]; r.n++; r.cx += x; r.cy += y;
    }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const a = region[idx(x, y)];
      if (x + 1 < COLS && region[idx(x + 1, y)] !== a) { regs[a].adj.add(region[idx(x + 1, y)]); regs[region[idx(x + 1, y)]].adj.add(a); }
      if (y + 1 < ROWS && region[idx(x, y + 1)] !== a) { regs[a].adj.add(region[idx(x, y + 1)]); regs[region[idx(x, y + 1)]].adj.add(a); }
    }
    for (const r of regs) { r.cx = r.n ? r.cx / r.n : r.sx; r.cy = r.n ? r.cy / r.n : r.sy; }
    // 2. danger: steps away from the start region, distance, and a little randomness; biomes follow the ranking
    const depth = new Map([[spawnReg.i, 0]]), q = [spawnReg.i];
    while (q.length) { const a = q.shift(); for (const b of regs[a].adj) if (!depth.has(b)) { depth.set(b, depth.get(a) + 1); q.push(b); } }
    for (const r of regs) r.score = (depth.get(r.i) ?? 9) + Math.hypot(r.cx - spawnReg.cx, (r.cy - spawnReg.cy) * 1.2) / 55 + rnd() * 0.9;
    spawnReg.score = -1;
    const ranked = regs.slice().sort((a, b) => a.score - b.score);
    let acc = 0, bi = 0;
    ranked.forEach((r, k) => {
      while (bi < ORDER.length - 1 && k >= Math.round((acc + BIOMES[ORDER[bi]].share) * regs.length)) acc += BIOMES[ORDER[bi++]].share;
      r.biome = ORDER[bi];
    });
    // where each region sits inside its biome's band (0 = the safest of that biome, 1 = the most dangerous)
    for (const b of ORDER) { const rs = ranked.filter(r => r.biome === b); rs.forEach((r, k) => { r.band = rs.length > 1 ? k / (rs.length - 1) : 0.5; }); }
    const biomeAt = new Uint8Array(N);
    for (let i = 0; i < N; i++) biomeAt[i] = ORDER.indexOf(regs[region[i]].biome);
    // 3. terrain per biome
    const bAt = (x, y) => ORDER[biomeAt[idx(x, y)]];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = idx(x, y), b = bAt(x, y), r = rnd();
      ground[i] = BIOMES[b].ground;
      if (b === 'grass') {
        if (fbm(x / 7, y / 7, S + 21) > 0.6) obj[i] = O.TALLGRASS;
        if (r < 0.03 * (fbm(x / 10, y / 10, S + 22) > 0.55 ? 3 : 1)) obj[i] = O.TREE;
        else if (r < 0.04) obj[i] = O.ROCK;
      } else if (b === 'forest') {
        const dense = fbm(x / 9, y / 9, S + 31);
        if (r < (dense > 0.47 ? 0.6 : dense > 0.38 ? 0.22 : 0.05)) obj[i] = rnd() < 0.35 ? O.PINE : O.TREE;
        else if (r > 0.985) obj[i] = O.ROCK;
        else if (fbm(x / 6, y / 6, S + 32) > 0.66) obj[i] = O.TALLGRASS;
      } else if (b === 'river') {
        const lake = fbm(x / 13, y / 13, S + 41), ridge = Math.abs(fbm(x / 34, y / 34, S + 42) - 0.5);
        if (lake > 0.63 || ridge < 0.022) ground[i] = G.WATER;
        else if (r < 0.04) obj[i] = O.TREE;
        else if (r < 0.05) obj[i] = O.ROCK;
      } else if (b === 'cave') {
        if (r < 0.46) obj[i] = O.WALL;
      } else if (b === 'high') {
        if (fbm(x / 11, y / 11, S + 51) > 0.56) ground[i] = G.SNOW;
        if (fbm(x / 6, y / 6, S + 52) > 0.64) obj[i] = O.CLIFF;
        else if (r < 0.05) obj[i] = O.PINE;
        else if (r < 0.075) obj[i] = O.BOULDER;
      } else if (b === 'ruins') {
        if (fbm(x / 8, y / 8, S + 61) > 0.6) ground[i] = G.GRASS;   // overgrown patches
        const wallLine = (x % 9 === 0 || y % 9 === 0), cross = x % 9 === 0 && y % 9 === 0;
        if (cross && r < 0.7) obj[i] = O.PILLAR;
        else if (wallLine && hash(Math.floor(x / 9) + (x % 9 === 0 ? 50 : 0), Math.floor(y / 9) + (y % 9 === 0 ? 70 : 0), S) < 0.72 && (x + y) % 9 > 2 && r > 0.22) obj[i] = O.RUINWALL;
        else if (r < 0.02) obj[i] = O.DEADTREE;
        else if (r < 0.035) obj[i] = O.BOULDER;
      }
    }
    // caves: a few rounds of cellular automata turn the noise into caverns (anything outside the caves counts as rock,
    // so every cave region is sealed by walls; the carved paths become its entrances)
    for (let it = 0; it < 5; it++) {
      const next = obj.slice();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (bAt(x, y) !== 'cave') continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (!inside(xx, yy) || bAt(xx, yy) !== 'cave' || obj[idx(xx, yy)] === O.WALL) n++;
        }
        next[idx(x, y)] = n >= 5 ? O.WALL : n <= 2 ? O.NONE : obj[idx(x, y)];
      }
      obj.set(next);
    }
    // riverbanks: sand next to the water, reeds along it
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (ground[i] === G.WATER) continue;
      let wet = false;
      for (let dy = -2; dy <= 2 && !wet; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx, y + dy) && ground[idx(x + dx, y + dy)] === G.WATER && Math.abs(dx) + Math.abs(dy) <= 2) { wet = true; break; }
      if (wet && bAt(x, y) !== 'cave') { ground[i] = G.SAND; if (obj[i] === O.TREE || obj[i] === O.TALLGRASS) obj[i] = O.NONE; if (hash(x, y, S + 71) < 0.12) obj[i] = O.REED; }
    }
    // the world's edge: a solid border three tiles deep, in the biome's own look
    const edgeObj = b => b === 'cave' ? O.WALL : b === 'high' ? O.CLIFF : b === 'ruins' ? O.RUINWALL : b === 'forest' ? O.PINE : O.TREE;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const e = Math.min(x, y, COLS - 1 - x, ROWS - 1 - y);
      if (e < 3 && (e < 2 || hash(x, y, S + 81) < 0.6)) { const i = idx(x, y); obj[i] = edgeObj(bAt(x, y)); if (ground[i] === G.WATER) ground[i] = G.SAND; }
    }
    // 4. the start: a clear, safe clearing on the west side with the camp in the middle
    const spawn = { x: clamp(Math.round(spawnReg.cx), 14, COLS - 14), y: clamp(Math.round(spawnReg.cy), 14, ROWS - 14) };
    clearDisc(spawn.x, spawn.y, 6, G.GRASS);
    // 5. paths: a spanning tree over the regions (plus a few loops) carved with A*, so every region is reachable
    const centre = r => { const x = Math.round(r.cx), y = Math.round(r.cy); return region[idx(x, y)] === r.i ? { x, y } : nearestOf(r.i, x, y); };
    function nearestOf(ri, x0, y0) { let best = { x: Math.round(regs[ri].sx), y: Math.round(regs[ri].sy) }, bd = Infinity; for (let y = 0; y < ROWS; y += 2) for (let x = 0; x < COLS; x += 2) if (region[idx(x, y)] === ri) { const d = (x - x0) ** 2 + (y - y0) ** 2; if (d < bd) { bd = d; best = { x, y }; } } return best; }
    for (const r of regs) { const c = r === spawnReg ? spawn : centre(r); r.px = clamp(c.x, 4, COLS - 5); r.py = clamp(c.y, 4, ROWS - 5); }
    const edges = [];
    for (const r of regs) for (const b of r.adj) if (b > r.i) edges.push({ a: r.i, b, d: Math.hypot(r.px - regs[b].px, r.py - regs[b].py) });
    edges.sort((e1, e2) => e1.d - e2.d);
    const parent = regs.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const carve = [];
    for (const e of edges) { const ra = find(e.a), rb = find(e.b); if (ra !== rb) { parent[ra] = rb; carve.push(e); } else if (rnd() < 0.18) carve.push(e); }
    for (const e of carve) carvePath(regs[e.a], regs[e.b]);
    // the forest hides a few narrow trails: only the trees are gone, no dirt shows the way
    for (const r of regs) if (r.biome === 'forest' && rnd() < 0.7) {
      let x = r.px, y = r.py, an = rnd() * 6.28;
      for (let k = 0; k < 40; k++) { an += (rnd() - 0.5) * 0.9; x = clamp(Math.round(x + Math.cos(an) * 1.2), 4, COLS - 5); y = clamp(Math.round(y + Math.sin(an) * 1.2), 4, ROWS - 5); const i = idx(x, y); if (bAt(x, y) === 'forest' && SOLID.has(obj[i])) obj[i] = O.NONE; }
    }
    function carvePath(ra, rb) {
      const route = astar(ra.px, ra.py, rb.px, rb.py);
      if (!route) return;
      for (const [x, y] of route) {
        const tunnel = bAt(x, y) === 'cave';
        for (let dy = 0; dy <= (tunnel ? 1 : 0) + 1; dy++) for (let dx = 0; dx <= (tunnel ? 1 : 0) + 1; dx++) {
          const xx = x + dx - (tunnel ? 1 : 0), yy = y + dy - (tunnel ? 1 : 0);
          if (!inside(xx, yy) || Math.min(xx, yy, COLS - 1 - xx, ROWS - 1 - yy) < 2) continue;
          const i = idx(xx, yy);
          if (SOLID.has(obj[i]) || obj[i] === O.REED) obj[i] = O.NONE;
          if (dx > 1 || dy > 1) continue;                     // the outer ring of a tunnel is only cleared, not paved
          path[i] = 1;
          if (ground[i] === G.WATER) ground[i] = G.BRIDGE;
          else if (ground[i] !== G.BRIDGE && ground[i] !== G.CAVE && ground[i] !== G.RUIN) ground[i] = G.PATH;
        }
      }
    }
    // A* over tiles: open ground is cheap, existing paths cheaper; obstacles and water cost more (they get cleared / bridged)
    function astar(x0, y0, x1, y1) {
      const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), open = [[0, idx(x0, y0)]];
      cost[idx(x0, y0)] = 0;
      const push = (f, i) => { open.push([f, i]); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
      const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break; [open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
      const goal = idx(x1, y1);
      while (open.length) {
        const [, i] = pop();
        if (i === goal) break;
        const x = i % COLS, y = (i / COLS) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (!inside(xx, yy) || Math.min(xx, yy, COLS - 1 - xx, ROWS - 1 - yy) < 3) continue;
          const j = idx(xx, yy), o = obj[j];
          const step = path[j] ? 0.5 : o === O.WALL ? 6 : SOLID.has(o) ? 5 : ground[j] === G.WATER ? 7 : 1 + hash(xx, yy, S + 91) * 0.6;
          const c = cost[i] + step;
          if (c < cost[j]) { cost[j] = c; from[j] = i; push(c + (Math.abs(xx - x1) + Math.abs(yy - y1)) * 0.9, j); }
        }
      }
      if (from[goal] < 0 && goal !== idx(x0, y0)) return null;
      const out = [];
      for (let i = goal; i >= 0; i = from[i]) out.push([i % COLS, (i / COLS) | 0]);
      return out;
    }
    function clearDisc(cx, cy, rad, g) {
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        if (!inside(x, y) || (x - cx) ** 2 + (y - cy) ** 2 > rad * rad + 1) continue;
        const i = idx(x, y);
        obj[i] = O.NONE;
        if (ground[i] === G.WATER) ground[i] = G.SAND;   // nothing that is cleared stands in the water
        else if (g != null) ground[i] = g;
      }
    }
    // 6. landmarks, one per biome, in the region at the right point of the biome's danger band
    const landmarks = [];
    for (const b of ORDER) {
      const L = LANDMARKS[b], rs = regs.filter(r => r.biome === b);
      if (!rs.length) continue;
      const r = L.kind === 'camp' ? spawnReg : rs.reduce((best, r2) => Math.abs(r2.band - L.band) < Math.abs(best.band - L.band) ? r2 : best);
      // beside the end of the region's path, so its clearing always joins the path network
      const x = r === spawnReg ? spawn.x + 2 : r.px + 2, y = r === spawnReg ? spawn.y - 1 : r.py - 1;
      if (r !== spawnReg) clearDisc(x, y, 3, b === 'cave' ? G.CAVE : b === 'ruins' ? G.RUIN : null);
      landmarks.push({ id: L.kind, kind: L.kind, biome: b, tx: x, ty: y });
    }
    // 7. reachability from the start (spawns and nodes only go where the player can walk)
    const reach = new Uint8Array(N), fq = [idx(spawn.x, spawn.y)];
    reach[fq[0]] = 1;
    while (fq.length) {
      const i = fq.pop(), x = i % COLS, y = (i / COLS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (!inside(xx, yy)) continue;
        const j = idx(xx, yy);
        if (!reach[j] && !SOLID.has(obj[j]) && ground[j] !== G.WATER) { reach[j] = 1; fq.push(j); }
      }
    }
    // 8. resource nodes (deterministic positions; what they hold and when they regrow is adventure.js's business)
    const nodes = [];
    const nearMark = (x, y, d) => landmarks.some(l => Math.abs(l.tx - x) <= d && Math.abs(l.ty - y) <= d);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (!reach[i] || path[i] || obj[i] === O.REED || nearMark(x, y, 2) || (Math.abs(x - spawn.x) < 3 && Math.abs(y - spawn.y) < 3)) continue;
      const dens = BIOMES[bAt(x, y)].nodes, r = hash(x, y, S + 101);
      let a = 0;
      for (const [kind, p] of Object.entries(dens)) { a += p; if (r < a) { nodes.push({ id: x + ',' + y, kind, tx: x, ty: y, biome: bAt(x, y) }); break; } }
    }
    // hidden caches: off the paths, deep in a region, one in about half the regions past the start
    const caches = [];
    for (const r of regs) {
      if (r === spawnReg || hash(r.i, 7, S) > 0.55) continue;
      for (let k = 0; k < 60; k++) {
        const x = clamp(Math.round(r.px + (hash(r.i, k, S + 111) - 0.5) * 26), 4, COLS - 5), y = clamp(Math.round(r.py + (hash(r.i, k, S + 112) - 0.5) * 22), 4, ROWS - 5), i = idx(x, y);
        if (region[i] !== r.i || !reach[i] || path[i] || obj[i] !== O.NONE && obj[i] !== O.TALLGRASS) continue;
        let nearPath = false;
        for (let dy = -3; dy <= 3 && !nearPath; dy++) for (let dx = -3; dx <= 3; dx++) if (inside(x + dx, y + dy) && path[idx(x + dx, y + dy)]) { nearPath = true; break; }
        if (nearPath || nodes.some(n => n.tx === x && n.ty === y)) continue;
        caches.push({ id: 'cache' + r.i, tx: x, ty: y, biome: r.biome });
        break;
      }
    }
    W = { seed, COLS, ROWS, ground, obj, region, path, biomeAt, reach, regs, spawn, landmarks, nodes, caches, chunks: new Map(), props: new Map(), mini: null };
    return W;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------------
  //  Queries (world units; one tile = TW units)
  // ---------------------------------------------------------------------
  const tileOf = v => Math.floor(v / TW);
  function solidTile(tx, ty, fly) {
    if (!inside(tx, ty)) return true;
    const i = idx(tx, ty);
    return SOLID.has(W.obj[i]) || (!fly && W.ground[i] === G.WATER);
  }
  const blocked = (x, y, fly) => solidTile(tileOf(x), tileOf(y), fly);
  // a footprint (circle of radius r around the feet) touches no solid tile
  function free(x, y, r, fly) {
    const tx0 = tileOf(x - r), tx1 = tileOf(x + r), ty0 = tileOf(y - r * 0.6), ty1 = tileOf(y + r * 0.6);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (solidTile(tx, ty, fly)) {
      const nx = clamp(x, tx * TW, tx * TW + TW), ny = clamp(y, ty * TW, ty * TW + TW);
      if ((nx - x) ** 2 + ((ny - y) / 0.6) ** 2 < r * r) return false;
    }
    return true;
  }
  const biomeAt = (x, y) => { const tx = clamp(tileOf(x), 0, COLS - 1), ty = clamp(tileOf(y), 0, ROWS - 1); return ORDER[W.biomeAt[idx(tx, ty)]]; };
  // where a world point sits inside its biome's danger band (0..1), from its region
  const bandAt = (x, y) => { const tx = clamp(tileOf(x), 0, COLS - 1), ty = clamp(tileOf(y), 0, ROWS - 1); return W.regs[W.region[idx(tx, ty)]].band; };
  const reachable = (x, y) => { const tx = tileOf(x), ty = tileOf(y); return inside(tx, ty) && !!W.reach[idx(tx, ty)]; };
  const onPath = (x, y) => { const tx = tileOf(x), ty = tileOf(y); return inside(tx, ty) && !!W.path[idx(tx, ty)]; };
  // the nearest free spot to (x, y), searching outward ring by ring (a lunge or a knockback can end inside a tree)
  function nearestFree(x, y, r, fly) {
    if (free(x, y, r, fly)) return { x, y };
    for (let d = 8; d < TW * 6; d += 8) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, xx = x + Math.cos(a) * d, yy = y + Math.sin(a) * d;
      if (free(xx, yy, r, fly)) return { x: xx, y: yy };
    }
    return { x, y };
  }
  const tileCentre = (tx, ty) => ({ x: tx * TW + TW / 2, y: ty * TW + TW / 2 });

  // ---------------------------------------------------------------------
  //  Pixel art: ground chunks (painted once per chunk on first sight) and
  //  the standing props (trees, rocks, walls...) drawn depth-sorted with the
  //  Pokémon by retro.js
  // ---------------------------------------------------------------------
  const rgbOf = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const PAL = {
    [G.GRASS]: ['#6fb44f', '#64a847', '#78bd57', '#5d9e43'].map(rgbOf),
    [G.FOREST]: ['#3e7d3a', '#367234', '#448640', '#30692f'].map(rgbOf),
    [G.SAND]: ['#e4cf98', '#dcc58a', '#ebd8a6', '#d5bc80'].map(rgbOf),
    [G.WATER]: ['#3c86c8', '#3a7fc0', '#4290d2', '#3577b6'].map(rgbOf),
    [G.PATH]: ['#c9a676', '#bf9b6a', '#d1b082', '#b48f60'].map(rgbOf),
    [G.CAVE]: ['#8a7266', '#806a5e', '#957c6f', '#76625a'].map(rgbOf),
    [G.HIGH]: ['#9aa58a', '#919c82', '#a3ae93', '#88937a'].map(rgbOf),
    [G.SNOW]: ['#eaf2fb', '#dde8f5', '#f5f9fd', '#cfdcee'].map(rgbOf),
    [G.RUIN]: ['#bcae90', '#b2a486', '#c6b89a', '#a89a7c'].map(rgbOf),
    [G.BRIDGE]: ['#9a6e44', '#8e643c', '#a6784c', '#845c36'].map(rgbOf)
  };
  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const P_ = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function pixCircle(g, c, cx, cy, r, ry = r) { g.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
  function outline(c, col = '#1a1a22') {
    const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), s = d.data, o = new Uint8ClampedArray(s);
    const [r, gg, b] = rgbOf(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (s[i + 3] > 0) continue;
      if ((x > 0 && s[i - 1] > 0) || (x < w - 1 && s[i + 7] > 0) || (y > 0 && s[i - w * 4 + 3] > 0) || (y < h - 1 && s[i + w * 4 + 3] > 0)) { o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255; }
    }
    d.data.set(o); g.putImageData(d, 0, 0);
    return c;
  }
  function groundAtPx(ax, ay) {
    // art-pixel lookup with a little jitter, so the borders between ground kinds are ragged instead of tile-square
    const jx = (hash(ax >> 1, ay >> 1, 5) - 0.5) * 5, jy = (hash(ax >> 1, ay >> 1, 6) - 0.5) * 5;
    const tx = clamp(Math.floor((ax + jx) / TS), 0, COLS - 1), ty = clamp(Math.floor((ay + jy) / TS), 0, ROWS - 1);
    const g = W.ground[idx(tx, ty)];
    // keep the water edge and bridges crisp (bridges are drawn on top; water must match what blocks)
    const own = W.ground[idx(clamp(Math.floor(ax / TS), 0, COLS - 1), clamp(Math.floor(ay / TS), 0, ROWS - 1))];
    return own === G.WATER || own === G.BRIDGE || g === G.WATER || g === G.BRIDGE ? own : g;
  }
  function paintChunk(cx, cy) {
    const AW = CH * TS, c = newCanvas(AW, AW), g = c.getContext('2d'), img = g.createImageData(AW, AW), d = img.data;
    const ox = cx * AW, oy = cy * AW;
    for (let y = 0; y < AW; y++) for (let x = 0; x < AW; x++) {
      const ax = ox + x, ay = oy + y, gk = groundAtPx(ax, ay), P = PAL[gk];
      const big = hash(ax >> 3, ay >> 3, 3), mid = hash(ax >> 2, ay >> 2, 4), fine = hash(ax, ay, 9);
      let col = P[Math.min(P.length - 1, Math.floor((big * 0.5 + mid * 0.3 + fine * 0.2) * P.length))];
      if (gk === G.WATER) { const wave = (ay + Math.round(Math.sin(ax * 0.15 + (ay >> 3)) * 2)) % 9 === 0; if (wave) col = [120, 180, 235]; }
      if (gk === G.GRASS && fine > 0.94) col = [col[0] + 10, col[1] + 24, col[2] + 8];
      if (gk === G.PATH && fine > 0.96) col = [150, 120, 90];
      if (gk === G.CAVE && fine > 0.97) col = [168, 146, 130];
      if (gk === G.RUIN && ((ax % TS === 0) || (ay % (TS / 2) === 0 && ((ax >> 3) + (ay >> 3)) % 2 === 0))) col = [150, 138, 112];   // flagstones
      if (gk === G.BRIDGE && ax % 4 === 0) col = [110, 76, 46];
      const i = (y * AW + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // flat decor: tall grass, reeds, flowers, pebbles, water edges
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const wx = cx * CH + tx, wy = cy * CH + ty;
      if (!inside(wx, wy)) continue;
      const i = idx(wx, wy), o = W.obj[i], x0 = tx * TS, y0 = ty * TS, gk = W.ground[i];
      if (o === O.TALLGRASS) for (let k = 0; k < 7; k++) { const x = x0 + hash(wx, wy, k) * 14 + 1, y = y0 + hash(wx, wy, k + 9) * 12 + 3; P_(g, '#2f6e2a', x, y, 1, 3); P_(g, '#4b9a3a', x + 1, y - 1, 1, 4); P_(g, '#7cc860', x + 2, y, 1, 2); }
      if (o === O.REED) for (let k = 0; k < 4; k++) { const x = x0 + 3 + k * 3, y = y0 + 4 + hash(wx, wy, k) * 4; P_(g, '#4f7a2e', x, y, 1, 8); P_(g, '#7a4a26', x, y - 2, 1, 3); }
      if (gk === G.GRASS && o === O.NONE && hash(wx, wy, 13) < 0.08) for (let k = 0; k < 3; k++) P_(g, ['#ffffff', '#ffe066', '#ff8ac4', '#9ad0ff'][Math.floor(hash(wx, wy, k + 20) * 4)], x0 + hash(wx, wy, k + 30) * 14, y0 + hash(wx, wy, k + 40) * 14, 1, 1);
      if (gk === G.HIGH && o === O.NONE && hash(wx, wy, 17) < 0.3) for (let k = 0; k < 3; k++) { const x = x0 + hash(wx, wy, k + 50) * 13, y = y0 + 3 + hash(wx, wy, k + 60) * 11; P_(g, '#6f7f56', x, y, 3, 2); P_(g, '#8c9c6a', x + 1, y - 1, 1, 2); if (hash(wx, wy, k + 70) < 0.25) P_(g, hash(wx, wy, k + 80) < 0.5 ? '#c8a8e8' : '#ffffff', x + 1, y - 2, 1, 1); }
      if ((gk === G.HIGH || gk === G.CAVE) && hash(wx, wy, 14) < 0.12) { const x = x0 + hash(wx, wy, 15) * 12, y = y0 + hash(wx, wy, 16) * 12; P_(g, 'rgba(0,0,0,.25)', x, y + 1, 3, 1); P_(g, gk === G.CAVE ? '#a8907e' : '#b8bfae', x, y, 3, 1); }
      if (gk === G.WATER) {
        // a darker rim where water meets land
        for (const [dx, dy, ex, ey, w, h] of [[0, -1, 0, 0, TS, 1], [0, 1, 0, TS - 1, TS, 1], [-1, 0, 0, 0, 1, TS], [1, 0, TS - 1, 0, 1, TS]])
          if (inside(wx + dx, wy + dy) && W.ground[idx(wx + dx, wy + dy)] !== G.WATER && W.ground[idx(wx + dx, wy + dy)] !== G.BRIDGE) P_(g, '#2a5f94', x0 + ex, y0 + ey, w, h);
      }
      if (gk === G.BRIDGE) { P_(g, '#5e3e22', x0, y0, TS, 1); P_(g, '#5e3e22', x0, y0 + TS - 1, TS, 1); for (let k = 2; k < TS; k += 4) P_(g, '#6e4a2a', x0, y0 + k, TS, 1); }
    }
    return c;
  }
  function chunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = W.chunks.get(key);
    if (c) { W.chunks.delete(key); W.chunks.set(key, c); return c; }   // most recently used last
    c = paintChunk(cx, cy);
    W.chunks.set(key, c);
    if (W.chunks.size > 70) W.chunks.delete(W.chunks.keys().next().value);
    return c;
  }
  // draw the ground of the visible rectangle v (world units) on ctx (already in world transform)
  function drawGround(ctx, v) {
    const cw = CH * TW;
    const cx0 = Math.max(0, Math.floor(v.x0 / cw)), cx1 = Math.min(Math.ceil(COLS / CH) - 1, Math.floor(v.x1 / cw));
    const cy0 = Math.max(0, Math.floor(v.y0 / cw)), cy1 = Math.min(Math.ceil(ROWS / CH) - 1, Math.floor(v.y1 / cw));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(chunk(cx, cy), cx * cw, cy * cw, cw, cw);
  }
  // water glints: a few light pixels that come and go on the visible water
  function drawWaterGlints(ctx, v, t) {
    const tx0 = Math.max(0, tileOf(v.x0)), tx1 = Math.min(COLS - 1, tileOf(v.x1)), ty0 = Math.max(0, tileOf(v.y0)), ty1 = Math.min(ROWS - 1, tileOf(v.y1));
    const step = Math.floor(t * 2.5);
    ctx.fillStyle = 'rgba(220,240,255,.85)';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (W.ground[idx(tx, ty)] !== G.WATER || hash(tx, ty, step) > 0.22) continue;
      ctx.fillRect(Math.round(tx * TW + hash(tx, ty, step + 1) * (TW - 9)), Math.round(ty * TW + hash(tx, ty, step + 2) * (TW - 6)), PX * 3, PX);
    }
  }
  // ---- prop sprites: a few variants of each, painted once (anchor = the middle of the bottom edge) ----
  let SPR = null;
  function sprite(w, h, paint, line = '#1a1a22') { const c = newCanvas(w, h), g = c.getContext('2d'); paint(g, w, h); if (line) outline(c, line); return c; }
  function buildSprites() {
    const r = mulberry32(99);
    const R = (a, b) => a + r() * (b - a);
    const tree = (dark, mid, lite, trunk = '#6e4a2a') => sprite(30, 38, g => {
      P_(g, 'rgba(0,0,0,.25)', 6, 34, 18, 3);
      P_(g, trunk, 13, 22, 4, 13); P_(g, '#4e3420', 13, 22, 1, 13);
      pixCircle(g, dark, 15, 15, 12, 11); pixCircle(g, mid, 14, 13, 10, 9); pixCircle(g, lite, 11, 10, 5, 4);
      for (let k = 0; k < 6; k++) P_(g, lite, R(6, 24), R(6, 20), 1, 1);
    });
    const pine = (snow) => sprite(24, 42, g => {
      P_(g, 'rgba(0,0,0,.25)', 5, 38, 14, 3);
      P_(g, '#5a3e2a', 11, 33, 3, 7);
      for (let y = 0; y < 34; y++) { const w = Math.round(1 + (y % 11) * 0.55 + y * 0.22); P_(g, snow && y % 11 < 3 ? '#eef4fb' : y % 11 < 2 ? '#3f8a52' : '#245c3a', 12 - w, 2 + y, w * 2, 1); }
    });
    const rock = (s, c1, c2, c3) => sprite(Math.round(18 * s), Math.round(14 * s), (g, w, h) => {
      P_(g, 'rgba(0,0,0,.22)', 2, h - 3, w - 4, 2);
      pixCircle(g, c3, w / 2, h - 6 * s, w / 2 - 2, h / 2 - 3); pixCircle(g, c2, w / 2 - 1, h - 7 * s, w / 2 - 3, h / 2 - 4); P_(g, c1, w / 2 - 3 * s, h - 10 * s, 3 * s, 1);
    });
    const block = (top, top2, face, face2, h = 26) => sprite(16, h, g => {   // a wall / cliff block: top face over a front face
      P_(g, face, 0, h - 12, 16, 12); P_(g, face2, 0, h - 3, 16, 3);
      for (let k = 0; k < 4; k++) P_(g, face2, R(1, 13), h - R(4, 11), R(2, 4), 1);
      P_(g, top, 0, 0, 16, h - 12); P_(g, top2, 0, 0, 16, 1); for (let k = 0; k < 5; k++) P_(g, top2, R(1, 14), R(1, h - 14), 2, 1);
    }, null);
    const topOnly = (top, top2) => sprite(16, 16, g => { P_(g, top, 0, 0, 16, 16); for (let k = 0; k < 6; k++) P_(g, top2, R(1, 14), R(1, 14), 2, 1); }, null);
    const bricks = (h = 26) => sprite(16, h, g => {
      P_(g, '#8a7e68', 0, 0, 16, h); P_(g, '#a89c84', 0, 0, 16, h - 12);
      for (let y = h - 12; y < h; y += 4) { P_(g, '#6e6452', 0, y, 16, 1); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) P_(g, '#6e6452', x, y, 1, 4); }
      for (let k = 0; k < 4; k++) P_(g, '#5f8a3e', R(0, 14), R(0, h - 13), 2, 1);   // moss
    }, null);
    const pillar = (broken) => sprite(14, broken ? 22 : 40, (g, w, h) => {
      P_(g, 'rgba(0,0,0,.25)', 1, h - 3, 12, 3);
      P_(g, '#a89c84', 2, broken ? 4 : 5, 10, h - 8); P_(g, '#c8bca2', 3, broken ? 4 : 5, 2, h - 8); P_(g, '#7e7460', 10, 5, 2, h - 8);
      P_(g, '#bcb096', 0, h - 5, 14, 3);
      if (!broken) { P_(g, '#bcb096', 0, 2, 14, 3); P_(g, '#d8ccb2', 0, 2, 14, 1); }
      else for (let k = 0; k < 4; k++) P_(g, '#a89c84', 2 + k * 2, 2 + (k % 2) * 2, 2, 2);
    });
    const dead = () => sprite(26, 34, g => {
      P_(g, 'rgba(0,0,0,.22)', 6, 30, 14, 3);
      P_(g, '#5a4636', 12, 10, 3, 22);
      for (const [x0, y0, x1, y1] of [[13, 14, 5, 6], [13, 12, 21, 4], [13, 20, 22, 14], [13, 18, 4, 13], [8, 9, 6, 3], [19, 7, 22, 2]]) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) P_(g, '#5a4636', x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, 2, 2); }
    });
    SPR = {
      [O.TREE]: { grass: [tree('#2f6a2a', '#3f8a35', '#62b04a'), tree('#2c6428', '#3a8232', '#5aa646'), tree('#336e2c', '#47923a', '#6cba52')],
        forest: [tree('#1d4a24', '#2a6232', '#3f8040', '#5a3e2a'), tree('#1a4422', '#265a2e', '#3a7a3a', '#5a3e2a')],
        river: [tree('#2f6a2a', '#45923a', '#6cba52'), tree('#3a6e2a', '#4f9a38', '#78c45a')] },
      [O.PINE]: { any: [pine(false), pine(false)], high: [pine(true), pine(true)] },
      [O.ROCK]: { any: [rock(1, '#d8d8d0', '#a0a098', '#6e6e68'), rock(0.9, '#d0ccc0', '#9a968a', '#666258')] },
      [O.BOULDER]: { any: [rock(1.5, '#d8d8d0', '#a0a098', '#6e6e68'), rock(1.35, '#ccc6b8', '#968e80', '#625a50')] },
      [O.WALL]: { front: [block('#2a2026', '#3e3238', '#5e4a46', '#40322f')], top: [topOnly('#2a2026', '#382b31')] },
      [O.RUINWALL]: { front: [bricks()], top: [topOnly('#a89c84', '#bcb096')] },
      [O.PILLAR]: { any: [pillar(false), pillar(true), pillar(false)] },
      [O.DEADTREE]: { any: [dead(), dead()] }
    };
    SPR.node = buildNodeSprites(R);
    SPR.mark = buildMarkSprites();
  }
  function buildNodeSprites(R) {
    const bush = (berry) => sprite(18, 14, g => { P_(g, 'rgba(0,0,0,.2)', 2, 11, 14, 2); pixCircle(g, '#2f6a2a', 9, 8, 8, 5); pixCircle(g, '#45923a', 8, 7, 6, 4); if (berry) for (const [x, y] of [[4, 6], [9, 4], [13, 7], [7, 9], [11, 10]]) { P_(g, berry, x, y, 2, 2); P_(g, '#ffffff', x, y, 1, 1); } });
    return {
      berry: { full: bush('#3a6ef0'), empty: bush(null) },
      herb: { full: sprite(12, 12, g => { for (let k = 0; k < 5; k++) { const x = 2 + k * 2; P_(g, '#3f8a35', x, 4 + (k % 2) * 2, 1, 8 - (k % 2) * 2); P_(g, '#9ae070', x - 1, 3 + (k % 2) * 2, 3, 2); } P_(g, '#ffffff', 5, 2, 2, 1); }), empty: sprite(12, 12, g => { P_(g, '#3f6a2a', 3, 9, 6, 2); }) },
      mushroom: { full: sprite(14, 12, g => { for (const [x, y, s] of [[4, 7, 3], [10, 8, 2]]) { P_(g, '#f0e8d8', x - 1, y, 2, 4); pixCircle(g, '#d23a3a', x, y, s + 1, s); P_(g, '#ffffff', x - 1, y - 1, 1, 1); } }), empty: sprite(14, 12, g => { P_(g, '#6e5a44', 3, 10, 8, 1); }) },
      apple: { full: sprite(30, 38, g => { P_(g, 'rgba(0,0,0,.25)', 6, 34, 18, 3); P_(g, '#6e4a2a', 13, 22, 4, 13); pixCircle(g, '#2f6a2a', 15, 15, 12, 11); pixCircle(g, '#3f8a35', 14, 13, 10, 9); for (const [x, y] of [[8, 12], [15, 8], [20, 14], [12, 18], [19, 20]]) { P_(g, '#e03a2a', x, y, 3, 3); P_(g, '#ffd0c0', x, y, 1, 1); } }),
        empty: sprite(30, 38, g => { P_(g, 'rgba(0,0,0,.25)', 6, 34, 18, 3); P_(g, '#6e4a2a', 13, 22, 4, 13); pixCircle(g, '#2f6a2a', 15, 15, 12, 11); pixCircle(g, '#3f8a35', 14, 13, 10, 9); }) },
      sticks: { full: sprite(16, 10, g => { for (const [x0, y0, x1] of [[2, 6, 13], [3, 8, 14], [4, 4, 12]]) for (let x = x0; x <= x1; x++) P_(g, x % 3 ? '#8a5e34' : '#6e4a2a', x, y0 + (x - x0) * 0.1, 1, 2); }), empty: null },
      pebbles: { full: sprite(14, 10, g => { for (const [x, y] of [[3, 5], [8, 6], [6, 3], [10, 4]]) { P_(g, '#8e8a80', x, y, 3, 2); P_(g, '#c8c4b8', x, y, 2, 1); } }), empty: null },
      ore: { full: sprite(18, 15, g => { P_(g, 'rgba(0,0,0,.25)', 2, 12, 14, 2); pixCircle(g, '#5e5654', 9, 8, 7, 6); pixCircle(g, '#7a706c', 8, 7, 5, 4); for (const [x, y] of [[5, 6], [10, 4], [12, 9], [7, 10]]) { P_(g, '#e8a040', x, y, 2, 2); P_(g, '#fff0a0', x, y, 1, 1); } }), empty: sprite(18, 15, g => { pixCircle(g, '#5e5654', 9, 10, 6, 4); }) },
      crystal: { full: sprite(16, 20, g => { P_(g, 'rgba(0,0,0,.25)', 2, 17, 12, 2); for (const [x, h, c] of [[4, 10, '#7ad8ff'], [8, 15, '#a8e8ff'], [12, 8, '#5ab4f0']]) { P_(g, c, x - 1, 18 - h, 3, h); P_(g, '#ffffff', x - 1, 18 - h, 1, h - 2); } }), empty: sprite(16, 20, g => { P_(g, '#4a6a7e', 3, 16, 10, 2); }) },
      relic: { full: sprite(14, 12, g => { P_(g, 'rgba(0,0,0,.25)', 1, 10, 12, 2); P_(g, '#c8a040', 3, 3, 8, 7); P_(g, '#f0d070', 4, 4, 6, 2); P_(g, '#8a6a20', 6, 6, 2, 3); }), empty: null }
    };
  }
  function buildMarkSprites() {
    return {
      camp: sprite(64, 46, g => {
        P_(g, 'rgba(0,0,0,.25)', 4, 40, 40, 4);
        for (let y = 0; y < 26; y++) { const w = Math.round(y * 0.85) + 1; P_(g, y % 6 < 1 ? '#c0392b' : '#e74c3c', 24 - w, 14 + y, w * 2, 1); }
        P_(g, '#7a1e14', 22, 30, 5, 10); P_(g, '#3a2a28', 23, 12, 2, 4);
        // campfire
        P_(g, 'rgba(0,0,0,.25)', 46, 40, 14, 3);
        for (const [x, y] of [[46, 38], [52, 39], [57, 38]]) P_(g, '#6e4a2a', x, y, 5, 2);
        pixCircle(g, '#ff7a1a', 52, 33, 4, 5); pixCircle(g, '#ffd23f', 52, 35, 2, 3);
        // stones ring
        for (let a = 0; a < 6.28; a += 0.8) P_(g, '#8e8a80', 52 + Math.cos(a) * 7, 39 + Math.sin(a) * 2, 2, 2);
      }),
      oak: sprite(56, 64, g => { P_(g, 'rgba(0,0,0,.28)', 10, 58, 36, 5); P_(g, '#5a3e2a', 24, 34, 9, 26); P_(g, '#4e3420', 24, 34, 2, 26); for (const [x, y] of [[18, 58], [34, 58]]) P_(g, '#5a3e2a', x, y - 2, 6, 3); pixCircle(g, '#1d4a24', 28, 24, 26, 22); pixCircle(g, '#2a6232', 27, 21, 22, 18); pixCircle(g, '#3f8040', 22, 16, 11, 8); for (let k = 0; k < 10; k++) P_(g, '#ffe066', 8 + Math.random() * 40, 8 + Math.random() * 30, 1, 1); }),
      lake: sprite(40, 30, g => { P_(g, 'rgba(0,0,0,.25)', 4, 26, 32, 3); P_(g, '#a8a090', 6, 14, 28, 12); P_(g, '#c8c0b0', 6, 14, 28, 2); pixCircle(g, '#4aa0e0', 20, 14, 10, 4); P_(g, '#bfe6ff', 14, 12, 6, 1); P_(g, '#a8a090', 18, 2, 4, 12); P_(g, '#bfe6ff', 19, 0, 2, 3); }),
      grotto: sprite(40, 34, g => { P_(g, 'rgba(0,0,0,.3)', 4, 30, 32, 3); for (const [x, h, c] of [[8, 16, '#7ad8ff'], [14, 26, '#a8e8ff'], [20, 30, '#c8f4ff'], [26, 22, '#7ad8ff'], [32, 14, '#5ab4f0']]) { P_(g, c, x - 2, 32 - h, 5, h); P_(g, '#ffffff', x - 2, 32 - h, 1, h - 2); } }),
      summit: sprite(26, 40, g => { P_(g, 'rgba(0,0,0,.25)', 2, 36, 22, 3); for (let k = 0; k < 6; k++) { const w = 20 - k * 3; P_(g, k % 2 ? '#8e8a80' : '#a8a498', 13 - w / 2, 34 - k * 5, w, 5); } P_(g, '#6e4a2a', 12, 2, 2, 10); P_(g, '#e74c3c', 14, 2, 8, 5); }),
      altar: sprite(60, 40, g => { P_(g, 'rgba(0,0,0,.3)', 4, 34, 52, 5); P_(g, '#8a7e68', 4, 24, 52, 12); P_(g, '#a89c84', 4, 24, 52, 3); P_(g, '#8a7e68', 14, 14, 32, 10); P_(g, '#bcb096', 14, 14, 32, 2); pixCircle(g, '#9a7bff', 30, 10, 5, 5); pixCircle(g, '#e0d0ff', 29, 9, 2, 2); }),
      cache: sprite(18, 14, g => { P_(g, 'rgba(0,0,0,.25)', 1, 12, 16, 2); P_(g, '#8a5a2a', 2, 4, 14, 9); P_(g, '#a8763e', 2, 4, 14, 3); P_(g, '#e0b040', 8, 6, 2, 3); P_(g, '#5a3a18', 2, 7, 14, 1); }),
      cacheOpen: sprite(18, 14, g => { P_(g, 'rgba(0,0,0,.25)', 1, 12, 16, 2); P_(g, '#8a5a2a', 2, 6, 14, 7); P_(g, '#5a3a18', 3, 7, 12, 3); P_(g, '#a8763e', 2, 1, 14, 4); }),
      campfire: sprite(20, 16, g => { P_(g, 'rgba(0,0,0,.25)', 2, 13, 16, 3); for (const [x, y] of [[3, 12], [9, 13], [13, 12]]) P_(g, '#6e4a2a', x, y, 5, 2); pixCircle(g, '#ff7a1a', 10, 8, 4, 5); pixCircle(g, '#ffd23f', 10, 10, 2, 3); for (let a = 0; a < 6.28; a += 0.8) P_(g, '#8e8a80', 10 + Math.cos(a) * 7, 13 + Math.sin(a) * 2, 2, 2); })
    };
  }
  // Highland cliffs: each tile is drawn knowing its neighbours, so a group of cliff tiles reads as one rock formation:
  // a lit plateau (grass or snow) on top, a layered rock face with cracks where the ground drops away to the south
  // (with its shadow on the ground), and a dark outline wherever the formation ends. Built on first use, then cached.
  const CLIFFS = new Map();
  function cliffSprite(snow, south, openL, openR, openN, v) {
    const key = [snow, south, openL, openR, openN, v].map(Number).join('');
    if (CLIFFS.has(key)) return CLIFFS.get(key);
    const PLAT = 16, FACE = 14, H = south ? PLAT : PLAT + FACE + 2;
    const c = newCanvas(16, H), g = c.getContext('2d');
    const r = mulberry32(1 + parseInt(key, 3) * 7919), R = (a, b) => a + r() * (b - a);
    const top = snow ? ['#f5f9fe', '#ffffff', '#d6e2f1', '#ffffff'] : ['#a2b67c', '#b6c88c', '#8c9e68', '#c6d49c'];   // a shade lighter than the ground below
    // plateau: mottled turf or snow, a few stones poking through
    P_(g, top[0], 0, 0, 16, PLAT);
    for (let k = 0; k < 14; k++) P_(g, k % 3 ? top[1] : top[2], R(0, 15), R(0, PLAT - 1), R(1, 3), 1);
    for (let k = 0; k < 2; k++) { const x = R(2, 12), y = R(2, PLAT - 4); P_(g, '#8e8676', x, y, 3, 2); P_(g, '#b0a690', x, y, 2, 1); }
    if (!snow && v === 1) for (let k = 0; k < 3; k++) P_(g, ['#c8a8e8', '#ffffff'][k % 2], R(2, 13), R(2, PLAT - 3), 1, 1);   // heather
    if (!south) {
      // the rock face: lit at the top, darker toward the foot, layered, cracked
      const y0 = PLAT;
      for (let y = 0; y < FACE; y++) P_(g, y < 3 ? '#b4a890' : y < 8 ? '#988e7a' : '#7a7262', 0, y0 + y, 16, 1);
      for (const sy of [4, 8, 11]) { let x = 0; while (x < 16) { const len = Math.round(R(3, 7)); P_(g, '#625a4c', x, y0 + sy + (r() < 0.3 ? 1 : 0), len, 1); x += len + Math.round(R(1, 3)); } }
      for (let k = 0; k < 2 + v; k++) { let x = Math.round(R(2, 13)); for (let y = Math.round(R(1, 5)); y < FACE - 1; y++) { if (r() < 0.25) x += r() < 0.5 ? -1 : 1; P_(g, '#4e473c', x, y0 + y); } }
      for (let k = 0; k < 4; k++) P_(g, '#c8bca2', R(1, 14), y0 + R(1, FACE - 2), 1, 1);
      if (!snow) for (let k = 0; k < 3; k++) P_(g, '#6f8a4a', R(0, 15), y0 + R(0, 4), R(1, 3), 1);   // moss hanging over the lip
      P_(g, snow ? '#ffffff' : '#c2d090', 0, y0 - 1, 16, 1);                                       // the lit lip
      if (snow) for (let k = 0; k < 5; k++) P_(g, '#f2f6fb', R(0, 15), y0, 1, Math.round(R(1, 3)));   // snow drips over the edge
      P_(g, '#4a443a', 0, y0 + FACE - 1, 16, 1);
      P_(g, 'rgba(20,16,30,.32)', 0, y0 + FACE, 16, 2);                                           // its shadow on the ground
      if (openR) for (let y = 0; y < FACE; y++) P_(g, 'rgba(30,24,20,.28)', 13, y0 + y, 3, 1);    // the shaded side
    }
    // outlines where the formation ends (the plateau's edge, and the face's sides)
    const ink = '#2e2a26', rows = south ? PLAT : PLAT + FACE;
    if (openN) P_(g, ink, 0, 0, 16, 1);
    if (openL) P_(g, ink, 0, 0, 1, rows);
    if (openR) P_(g, ink, 15, 0, 1, rows);
    if (openN && openL) { g.clearRect(0, 0, 1, 1); P_(g, ink, 1, 1); }
    if (openN && openR) { g.clearRect(15, 0, 1, 1); P_(g, ink, 14, 1); }
    CLIFFS.set(key, c);
    return c;
  }
  // the standing props of one chunk (built once): { x, y (feet, world units), img, w, h }
  function chunkProps(cx, cy) {
    const key = cx + ',' + cy;
    let list = W.props.get(key);
    if (list) return list;
    if (!SPR) buildSprites();
    list = [];
    for (let ty = cy * CH; ty < Math.min(ROWS, cy * CH + CH); ty++) for (let tx = cx * CH; tx < Math.min(COLS, cx * CH + CH); tx++) {
      const i = idx(tx, ty), o = W.obj[i];
      if (!SOLID.has(o)) continue;
      const b = ORDER[W.biomeAt[i]], set = SPR[o], hv = hash(tx, ty, 77);
      let img;
      if (o === O.CLIFF) {
        const same = (x, y) => inside(x, y) && W.obj[idx(x, y)] === O.CLIFF;
        const south = same(tx, ty + 1);
        img = cliffSprite(W.ground[i] === G.SNOW, south, !same(tx - 1, ty), !same(tx + 1, ty), !same(tx, ty - 1), Math.floor(hv * 3));
        list.push({ x: tx * TW + TW / 2, y: ty * TW + TW + (south ? 0 : 2 * PX), img, top: !south });
        continue;
      }
      if (o === O.WALL || o === O.RUINWALL) {
        const south = inside(tx, ty + 1) && W.obj[idx(tx, ty + 1)] === o;
        img = (south ? set.top : set.front)[0];
        list.push({ x: tx * TW + TW / 2, y: ty * TW + TW, img, top: !south });
        continue;
      }
      const vars = set[b] || set.any || set.grass;
      img = vars[Math.floor(hv * vars.length)];
      // trees and rocks sit with a little jitter so the forest doesn't read as a grid
      list.push({ x: tx * TW + TW / 2 + (hash(tx, ty, 78) - 0.5) * 12, y: ty * TW + TW - 4 + (hash(tx, ty, 79) - 0.5) * 6, img });
    }
    W.props.set(key, list);
    return list;
  }
  // every prop whose sprite can show in the view rectangle (tall sprites reach up, so look a chunk further down)
  function visibleProps(v, out) {
    const cw = CH * TW;
    const cx0 = Math.max(0, Math.floor((v.x0 - 60) / cw)), cx1 = Math.min(Math.ceil(COLS / CH) - 1, Math.floor((v.x1 + 60) / cw));
    const cy0 = Math.max(0, Math.floor(v.y0 / cw)), cy1 = Math.min(Math.ceil(ROWS / CH) - 1, Math.floor((v.y1 + 140) / cw));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++)
      for (const p of chunkProps(cx, cy)) if (p.x > v.x0 - 60 && p.x < v.x1 + 60 && p.y > v.y0 && p.y < v.y1 + 140) out.push(p);
    return out;
  }
  // draw one prop (ctx in world transform); a wall/cliff block's top sits on its tile
  function drawProp(ctx, p) {
    const w = p.img.width * PX, h = p.img.height * PX;
    ctx.drawImage(p.img, Math.round(p.x - w / 2), Math.round(p.y - h), w, h);
  }
  const sprites = () => { if (!SPR) buildSprites(); return SPR; };

  // ---------------------------------------------------------------------
  //  Minimap: one pixel per tile, biome colours, darker obstacles, water,
  //  paths; unexplored tiles stay dark (fog of war)
  // ---------------------------------------------------------------------
  function miniBase() {
    if (W.mini) return W.mini;
    const c = newCanvas(COLS, ROWS), g = c.getContext('2d'), img = g.createImageData(COLS, ROWS), d = img.data;
    for (let i = 0; i < COLS * ROWS; i++) {
      const b = ORDER[W.biomeAt[i]], gk = W.ground[i], o = W.obj[i];
      let col = rgbOf(BIOMES[b].mini);
      if (gk === G.WATER) col = [58, 126, 196];
      else if (gk === G.BRIDGE || W.path[i]) col = gk === G.CAVE ? [140, 120, 124] : [214, 184, 138];
      else if (gk === G.SAND) col = [228, 207, 152];
      else if (gk === G.SNOW) col = [232, 240, 250];
      if (SOLID.has(o)) col = col.map(v => v * 0.55);
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return (W.mini = c);
  }

  return {
    GEN_VERSION, TS, TW, COLS, ROWS, G, O, BIOMES, ORDER,
    generate, get world() { return W; },
    get size() { return { w: COLS * TW, h: ROWS * TW }; },
    blocked, free, nearestFree, biomeAt, bandAt, reachable, onPath, tileOf, tileCentre, solidTile, inside,
    drawGround, drawWaterGlints, visibleProps, drawProp, sprites, miniBase, hash
  };
})();
if (typeof module !== 'undefined') module.exports = Overworld;
