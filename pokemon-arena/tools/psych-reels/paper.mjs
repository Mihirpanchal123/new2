// PAPER CUT-OUT (stop-motion craft paper), used by stories/swolfpaper.mjs. Same API + characters as clay.mjs
// (this file was derived from it); only the material differs: flat coloured paper with fibres, scissor-cut edges
// that show the light paper core, small lifted shadows between layers, brass split pins at the puppet joints,
// and cut-out stop motion (10 poses a second, pieces shifting slightly from pose to pose).
import { W, H, FONT, clamp, lerp, seg, ease, E, rng, noise1, mix, shade, rgba } from './engine.mjs';

const TAU = Math.PI * 2;
export const STEP = 10;                                   // cut-out stop motion: poses per second
export const pose = t => Math.floor(t * STEP);
export const q = t => pose(t) / STEP;                     // time snapped to the pose
let T_POSE = 0; export function setPose(t) { T_POSE = pose(t); }
// a little per-pose wobble (clay re-touched between frames); seed keeps each shape's own wobble
export const jit = (seed, amt = 1) => { const r = rng(seed * 9973 + T_POSE * 131); return [(r() - 0.5) * 2 * amt, (r() - 0.5) * 2 * amt]; };

// ---------------------------------------------------------------- texture (paper fibres)
let fib = null, fibBig = null;
function fibre(c, big) {
  if (big ? fibBig : fib) return big ? fibBig : fib;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'), r = rng(big ? 41 : 17);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) { const x = r() * 256, y = r() * 256, a = r() * TAU, l = 4 + r() * 16; g.strokeStyle = `rgba(${110 + r() * 40 | 0},${95 + r() * 30 | 0},${80 + r() * 20 | 0},${0.06 + r() * 0.12})`; g.lineWidth = 0.5 + r() * 0.7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.5, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,70,50,${0.04 + r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 1, 1); }
  for (let i = 0; i < 12; i++) { const x = r() * 256, y = r() * 256, rr = 20 + r() * 50, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,100,80,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  const p = c.createPattern(cv, 'repeat'); if (big) fibBig = p; else fib = p; return p;
}

// ---------------------------------------------------------------- the paper piece
// clay(c, path, col, [x, y, w, h], o): a cut-out piece of coloured paper — flat colour, fibres, a crisp lifted
// shadow underneath, and the light paper core showing along the scissor-cut edge. (Named clay() so stories can switch kits.)
export function clay(c, path, col, box, o = {}) {
  const [x, y, w, h] = box, s = Math.max(w, h), big = s > 220;
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  if (o.shadow !== false) { c.save(); c.shadowColor = `rgba(25,15,8,${Math.min(0.5, (o.shadowA ?? 0.42) * 0.95)})`; c.shadowBlur = Math.min(9, 1.5 + s * 0.025); c.shadowOffsetX = Math.min(5, 1.2 + s * 0.012); c.shadowOffsetY = Math.min(7, 1.8 + s * 0.02); path(); c.fillStyle = col; c.fill(); c.restore(); }
  path(); c.fillStyle = col; c.fill();
  c.save(); path(); c.clip();
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, `rgba(255,252,240,${0.09 * (o.light ?? 1)})`); g.addColorStop(1, `rgba(40,25,10,${0.11 * (o.rim ?? 1)})`); c.fillStyle = g; c.fillRect(x - 4, y - 4, w + 8, h + 8);
  if (o.tex !== false) { c.globalCompositeOperation = 'multiply'; c.globalAlpha *= big ? 0.85 : 0.75; const p = fibre(c, big); p.setTransform?.(new DOMMatrix().translate((o.seed || 0) * 29 % 256, (o.seed || 0) * 53 % 256)); c.fillStyle = p; c.fillRect(x - 4, y - 4, w + 8, h + 8); }
  c.restore();
  if (o.edge !== false) { path(); c.strokeStyle = mix(col.startsWith('#') ? col : '#888888', '#fffaf0', 0.5); c.globalAlpha *= 0.8; c.lineWidth = o.edgeW ?? Math.max(0.9, Math.min(2, s * 0.01)); c.lineJoin = 'round'; c.stroke(); }
  c.restore();
}
// shape helpers (paths) — paper puppets shift a little from pose to pose
export const P = {
  ell: (c, x, y, rx, ry, rot = 0, seed = 1, wob = 0.8) => () => { const [a, b] = jit(seed, wob * 0.8); c.beginPath(); c.ellipse(x + a, y + b, Math.max(0.5, rx), Math.max(0.5, ry), rot + a * 0.004, 0, TAU); },
  rr: (c, x, y, w, h, r, seed = 1, wob = 0.7) => () => { const [a, b] = jit(seed, wob * 0.8); c.beginPath(); c.roundRect(x + a, y + b, w, h, Math.min(r, 6)); },
  poly: (c, pts, seed = 1, wob = 0.8, smooth = true) => () => { const [a, b] = jit(seed, wob * 0.8); const J = pts.map(p => [p[0] + a, p[1] + b]); c.beginPath(); if (!smooth) { J.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); return; } const n = J.length, m = i => [(J[i % n][0] + J[(i + 1) % n][0]) / 2, (J[i % n][1] + J[(i + 1) % n][1]) / 2]; const s0 = m(n - 1); c.moveTo(s0[0], s0[1]); for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(J[i][0], J[i][1], e[0], e[1]); } c.closePath(); },
};
export const boxOf = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; };
export const blob = (c, pts, col, o = {}) => clay(c, P.poly(c, pts, o.seed ?? 1, o.wob ?? 0.8, o.smooth ?? true), col, boxOf(pts), o);
export const ball = (c, x, y, rx, ry, col, o = {}) => clay(c, P.ell(c, x, y, rx, ry, o.rot || 0, o.seed ?? 1, o.wob ?? 0.6), col, [x - rx, y - ry, rx * 2, ry * 2], o);
export const slab = (c, x, y, w, h, r, col, o = {}) => clay(c, P.rr(c, x, y, w, h, r, o.seed ?? 1, o.wob ?? 0.6), col, [x, y, w, h], o);
// a drawn line on the paper (pencil / ink)
export function groove(c, pts, col = '#000', w = 2, a = 0.35) { c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = rgba(col, Math.min(0.75, a * 1.4)); c.lineWidth = Math.max(0.8, w * 0.8); c.stroke(); c.restore(); }
// a paper strip (limbs, brows, tails): flat colour, a lifted shadow, a light cut edge
export function worm(c, pts, w, col, o = {}) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const [a, b] = jit(o.seed ?? 3, (o.wob ?? 0.6) * 0.8), J = pts.map(p => [p[0] + a, p[1] + b]);
  const path = () => { c.beginPath(); J.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
  if (o.shadow !== false) { c.save(); c.shadowColor = 'rgba(25,15,8,0.42)'; c.shadowBlur = Math.min(6, w * 0.25); c.shadowOffsetX = Math.min(4, 1 + w * 0.08); c.shadowOffsetY = Math.min(5, 1.5 + w * 0.12); path(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.restore(); }
  path(); c.strokeStyle = col.startsWith('#') ? mix(col, '#fffaf0', 0.5) : col; c.lineWidth = w; c.stroke();
  path(); c.strokeStyle = col; c.lineWidth = Math.max(1, w - 2.2); c.stroke();
  c.restore();
}
// light: tissue-paper glow
export function glow(c, x, y, r, col, a = 0.5) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a * 0.85)); g.addColorStop(1, rgba(col, 0)); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
// the card behind everything: a gradient sheet with fibres
export function backdrop(c, top, bottom, y0 = 0, y1 = H) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120); c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.9; c.fillStyle = fibre(c, true); c.fillRect(-60, -60, W + 120, H + 120); c.restore(); }
// a split pin (brad) holding a puppet joint
export function brad(c, x, y, r) { c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 2; c.shadowOffsetY = 1; c.beginPath(); c.arc(x, y, r, 0, TAU); const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); g.addColorStop(0, '#f4e7c2'); g.addColorStop(0.6, '#b8975a'); g.addColorStop(1, '#6e5530'); c.fillStyle = g; c.fill(); c.restore(); }

// ---------------------------------------------------------------- characters
export const WOLF = { fur: '#8a8e96', furD: '#6d7179', muzzle: '#e6dccb', inner: '#d9b4a0', suit: '#3d4049', shirt: '#f1ede4', tie: '#8e2b2b', eye: '#e9b23c' };
// the wolf, front view; feet at (x, y), height h. o: { expr: 'smug'|'grin'|'talk'|'closed'|'raise', talk (0..1), arm: 'down'|'up'|'snap'|'point', look }
export function wolf(c, x, y, h, o = {}) {
  const u = h / 100, C = WOLF, talk = o.talk || 0, sd = o.seed ?? 500;
  c.save(); c.translate(x, y);
  ball(c, 0, 0, 24 * u, 3.5 * u, 'rgba(0,0,0,0.35)', { shadow: false, edge: false, shine: 0, tex: false });
  // tail (behind)
  worm(c, [[12 * u, -40 * u], [24 * u, -30 * u], [30 * u, -16 * u]], 9 * u, C.furD, { seed: sd + 1 });
  // legs + shoes
  for (const s of [-1, 1]) { slab(c, s * 9 * u - 5 * u, -44 * u, 10 * u, 40 * u, 4 * u, C.suit, { seed: sd + 2 + s }); ball(c, s * 10 * u, -3 * u, 8 * u, 3.6 * u, '#1d1b1e', { seed: sd + 4 + s }); }
  // jacket
  const jacket = [[-21 * u, -78 * u], [21 * u, -78 * u], [24 * u, -60 * u], [20 * u, -40 * u], [0, -37 * u], [-20 * u, -40 * u], [-24 * u, -60 * u]];
  blob(c, jacket, C.suit, { seed: sd + 6 });
  for (let i = -3; i <= 3; i++) groove(c, [[i * 6 * u, -76 * u], [i * 6.4 * u, -40 * u]], '#ffffff', 0.8, 0.08);   // pinstripes
  blob(c, [[-7 * u, -79 * u], [7 * u, -79 * u], [3 * u, -58 * u], [-3 * u, -58 * u]], C.shirt, { seed: sd + 7, shadow: false });
  blob(c, [[-2.6 * u, -77 * u], [2.6 * u, -77 * u], [3.2 * u, -61 * u], [0, -57 * u], [-3.2 * u, -61 * u]], C.tie, { seed: sd + 8 });
  for (const s of [-1, 1]) blob(c, [[s * 7 * u, -79 * u], [s * 13 * u, -75 * u], [s * 4 * u, -58 * u]], shade(C.suit, 0.08), { seed: sd + 9 + s, smooth: false });   // lapels
  slab(c, 10 * u, -70 * u, 6 * u, 2.6 * u, 1 * u, C.shirt, { seed: sd + 12, shadow: false });   // pocket square
  // arms: left always down; right per gesture
  const armR = o.arm || 'down';
  worm(c, [[-21 * u, -74 * u], [-25 * u, -58 * u], [-24 * u, -44 * u]], 9 * u, C.suit, { seed: sd + 13 });
  ball(c, -24 * u, -41 * u, 5 * u, 5.4 * u, C.muzzle, { seed: sd + 14 });
  if (armR === 'down') { worm(c, [[21 * u, -74 * u], [25 * u, -58 * u], [24 * u, -44 * u]], 9 * u, C.suit, { seed: sd + 15 }); ball(c, 24 * u, -41 * u, 5 * u, 5.4 * u, C.muzzle, { seed: sd + 16 }); }
  else { const hy = armR === 'up' ? -98 * u : -84 * u; worm(c, [[21 * u, -74 * u], [31 * u, -66 * u], [30 * u, hy + 8 * u]], 9 * u, C.suit, { seed: sd + 15 }); ball(c, 30 * u, hy + 3 * u, 5.4 * u, 6 * u, C.muzzle, { seed: sd + 16 }); if (armR === 'point' || armR === 'up') worm(c, [[30 * u, hy], [30.5 * u, hy - 6 * u]], 2.6 * u, C.muzzle, { seed: sd + 17, shadow: false }); if (armR === 'snap') { worm(c, [[32 * u, hy + 1 * u], [35 * u, hy - 3 * u]], 2.4 * u, C.muzzle, { seed: sd + 17, shadow: false }); } }
  for (const sx of [-1, 1]) brad(c, sx * 20 * u, -73 * u, 1.6 * u);   // split pins at the shoulders
  // the head
  wolfHead(c, 0, -96 * u, u, o);
  c.restore();
}
export function wolfHead(c, x, y, u, o = {}) {
  const C = WOLF, sd = (o.seed ?? 500) + 40, talk = o.talk || 0, ex = o.expr || 'smug';
  c.save(); c.translate(x, y);
  // ears
  for (const s of [-1, 1]) { blob(c, [[s * 7 * u, -10 * u], [s * 16 * u, -27 * u], [s * 19 * u, -6 * u]], C.fur, { seed: sd + s, smooth: false }); blob(c, [[s * 10 * u, -10 * u], [s * 16 * u, -22 * u], [s * 17 * u, -8 * u]], C.inner, { seed: sd + 3 + s, smooth: false, shadow: false }); }
  // head with cheek fluff
  blob(c, [[-16 * u, -10 * u], [-10 * u, -17 * u], [10 * u, -17 * u], [16 * u, -10 * u], [18 * u, 2 * u], [21 * u, 8 * u], [15 * u, 10 * u], [10 * u, 16 * u], [-10 * u, 16 * u], [-15 * u, 10 * u], [-21 * u, 8 * u], [-18 * u, 2 * u]], C.fur, { seed: sd + 6 });
  // muzzle
  blob(c, [[-9 * u, 1 * u], [9 * u, 1 * u], [10 * u, 10 * u], [6 * u, 17 * u], [-6 * u, 17 * u], [-10 * u, 10 * u]], C.muzzle, { seed: sd + 7 });
  // eyes: whites, amber iris, heavy lids
  const lid = ex === 'closed' ? 1 : ex === 'grin' ? 0.55 : o.lid ?? 0.48, look = o.look || 0;
  for (const s of [-1, 1]) {
    ball(c, s * 7 * u, -4 * u, 4.8 * u, 4 * u, '#f6f2ea', { seed: sd + 8 + s, shine: 0.6 });
    if (lid < 0.95) { ball(c, s * 7 * u + look * 1.5 * u, -3.4 * u, 2.2 * u, 2.4 * u, C.eye, { seed: sd + 10 + s, shadow: false, edge: false }); ball(c, s * 7 * u + look * 1.5 * u, -3.2 * u, 1.1 * u, 1.3 * u, '#141012', { seed: sd + 12 + s, shadow: false, edge: false, tex: false }); }
    // the lid comes down from the top
    c.save(); c.beginPath(); c.ellipse(s * 7 * u, -4 * u, 5 * u, 4.2 * u, 0, 0, TAU); c.clip(); slab(c, s * 7 * u - 6 * u, -9.5 * u, 12 * u, (1.2 + lid * 7) * u, 0, C.fur, { seed: sd + 14 + s, shadow: false, edge: false }); c.restore();
    worm(c, [[s * 2.6 * u, -9.4 * u + (ex === 'grin' ? -0.8 : 0) * u], [s * 11.6 * u, -11.2 * u]], 2.8 * u, '#2a2726', { seed: sd + 16 + s });   // brows: flat, sly
  }
  // nose
  ball(c, 0, 4.5 * u, 4 * u, 2.8 * u, '#1c1a1c', { seed: sd + 18, shine: 1.4 });
  // mouth
  const open = ex === 'grin' ? 0.5 + talk * 0.5 : talk;
  if (open > 0.05) { blob(c, [[-6 * u, 10 * u], [6 * u, 10 * u], [4 * u, (11 + open * 5) * u], [-4 * u, (11 + open * 5) * u]], '#4a1c22', { seed: sd + 19, shadow: false }); slab(c, -5 * u, 9.6 * u, 10 * u, 1.6 * u, 0.8 * u, '#f6f2ea', { seed: sd + 20, shadow: false, edge: false }); }
  else groove(c, [[-7 * u, 10 * u], [-2 * u, 12 * u], [3 * u, 11.6 * u], [7.5 * u, 9 * u]], '#000', 1.4 * u, 0.6);
  c.restore();
}
export const PIG = { skin: '#e7a9a5', skinD: '#c98a86', coat: '#6a5243', shirt: '#ece4d6', tie: '#4d6b3e' };
// the pig: shorter, nervous. o: { expr: 'worried'|'scared'|'talk', talk, hands: 'clasp'|'down'|'open' }
export function pig(c, x, y, h, o = {}) {
  const u = h / 100, C = PIG, sd = o.seed ?? 700, talk = o.talk || 0;
  c.save(); c.translate(x, y);
  ball(c, 0, 0, 24 * u, 3.5 * u, 'rgba(0,0,0,0.35)', { shadow: false, edge: false, shine: 0, tex: false });
  for (const s of [-1, 1]) { slab(c, s * 9 * u - 5 * u, -34 * u, 10 * u, 31 * u, 4 * u, '#4a3b31', { seed: sd + s }); ball(c, s * 10 * u, -3 * u, 8 * u, 3.6 * u, '#2a1f1a', { seed: sd + 2 + s }); }
  blob(c, [[-23 * u, -72 * u], [23 * u, -72 * u], [27 * u, -50 * u], [24 * u, -30 * u], [-24 * u, -30 * u], [-27 * u, -50 * u]], C.coat, { seed: sd + 4 });
  blob(c, [[-7 * u, -73 * u], [7 * u, -73 * u], [3 * u, -52 * u], [-3 * u, -52 * u]], C.shirt, { seed: sd + 5, shadow: false });
  blob(c, [[-2.4 * u, -71 * u], [2.4 * u, -71 * u], [3 * u, -56 * u], [0, -52 * u], [-3 * u, -56 * u]], C.tie, { seed: sd + 6 });
  if ((o.hands || 'clasp') === 'clasp') { worm(c, [[-22 * u, -67 * u], [-20 * u, -52 * u], [-6 * u, -47 * u]], 9 * u, C.coat, { seed: sd + 7 }); worm(c, [[22 * u, -67 * u], [20 * u, -52 * u], [6 * u, -47 * u]], 9 * u, C.coat, { seed: sd + 8 }); ball(c, 0, -47 * u, 7 * u, 5.5 * u, C.skin, { seed: sd + 9 }); groove(c, [[-2 * u, -51 * u], [-2 * u, -43 * u]], '#000', 0.9 * u, 0.35); }
  else for (const s of [-1, 1]) { worm(c, [[s * 22 * u, -67 * u], [s * 27 * u, -52 * u], [s * 26 * u, -40 * u]], 9 * u, C.coat, { seed: sd + 7 + s }); ball(c, s * 26 * u, -37 * u, 5 * u, 5 * u, C.skin, { seed: sd + 9 + s }); }
  for (const sx of [-1, 1]) brad(c, sx * 21 * u, -66 * u, 1.6 * u);
  // head
  c.translate(0, -88 * u);
  for (const s of [-1, 1]) blob(c, [[s * 9 * u, -12 * u], [s * 20 * u, -20 * u], [s * 17 * u, -6 * u]], C.skinD, { seed: sd + 11 + s, smooth: false });
  ball(c, 0, 0, 19 * u, 17 * u, C.skin, { seed: sd + 13 });
  const ex = o.expr || 'worried';
  for (const s of [-1, 1]) {
    ball(c, s * 7 * u, -5 * u, 4.2 * u, ex === 'scared' ? 5 * u : 4.2 * u, '#f6f2ea', { seed: sd + 14 + s });
    ball(c, s * 7 * u, -4.4 * u, 1.6 * u, 1.9 * u, '#1d1416', { seed: sd + 16 + s, shadow: false, edge: false });
    worm(c, [[s * 3 * u, -13.5 * u + (ex === 'scared' ? -2 : 0) * u], [s * 11 * u, -10.5 * u]], 2 * u, C.skinD, { seed: sd + 18 + s });   // inner ends up: worried
  }
  ball(c, 0, 4.5 * u, 7.5 * u, 5.4 * u, C.skinD, { seed: sd + 20 });
  for (const s of [-1, 1]) ball(c, s * 2.6 * u, 4.5 * u, 1.3 * u, 2 * u, '#5a2e30', { seed: sd + 21 + s, shadow: false, edge: false, tex: false });
  if (talk > 0.05) blob(c, [[-4 * u, 11 * u], [4 * u, 11 * u], [3 * u, (12 + talk * 4) * u], [-3 * u, (12 + talk * 4) * u]], '#5a1c26', { seed: sd + 23, shadow: false });
  else groove(c, [[-4 * u, 12 * u], [-1 * u, 11.2 * u], [2 * u, 12 * u], [4 * u, 11.4 * u]], '#000', 1.1 * u, 0.5);
  c.restore();
}
export const SHEEP = { wool: '#d8d2c6', woolD: '#b9b2a6', face: '#4b4744', faceL: '#5e5955' };
// a sheep facing us (heads in a crowd). o: { tint (0..1 darker), prop: 'phone'|'paper'|'cap'|'scarf'|null, glow (phone light), lid, look, seed }
export function sheep(c, x, y, s, o = {}) {
  const sd = o.seed ?? 900, tint = o.tint || 0, wool = shade(SHEEP.wool, -tint), woolD = shade(SHEEP.woolD, -tint), face = shade(SHEEP.face, -tint * 0.5);
  c.save(); c.translate(x, y);
  // wool shoulders behind the head
  for (const [dx, dy, rr] of [[-0.46, 0.5, 0.36], [0.46, 0.5, 0.36], [-0.2, 0.62, 0.34], [0.2, 0.62, 0.34]]) ball(c, dx * s, dy * s, rr * s, rr * s * 0.86, dx < 0 ? woolD : wool, { seed: sd + Math.round(dx * 10 + dy * 7), wob: 0.4, shadowA: 0.25 });
  for (const sg of [-1, 1]) ball(c, sg * s * 0.34, -s * 0.04, s * 0.17, s * 0.08, face, { seed: sd + 10 + sg, rot: sg * 0.35 });   // ears
  ball(c, 0, 0.04 * s, s * 0.25, s * 0.33, face, { seed: sd + 12 });
  for (const [dx, dy, rr] of [[-0.16, -0.3, 0.15], [0.16, -0.3, 0.15], [0, -0.38, 0.16]]) ball(c, dx * s, dy * s, rr * s, rr * s * 0.85, wool, { seed: sd + 13 + Math.round(dx * 9), wob: 0.4, shadowA: 0.2 });   // the tuft
  if (o.prop === 'cap') slab(c, -s * 0.34, -s * 0.46, s * 0.68, s * 0.18, s * 0.09, shade('#3b3633', -tint), { seed: sd + 14 });
  if (o.prop === 'scarf') { blob(c, [[-s * 0.4, -s * 0.18], [0, -s * 0.5], [s * 0.4, -s * 0.18], [s * 0.34, s * 0.42], [-s * 0.34, s * 0.42]], shade(o.scarfCol || '#6d6158', -tint), { seed: sd + 15 }); ball(c, 0, 0.06 * s, s * 0.22, s * 0.29, face, { seed: sd + 12, shadow: false }); }
  const lid = o.lid ?? 0.45;
  for (const sg of [-1, 1]) { ball(c, sg * s * 0.1, -s * 0.03, s * 0.075, s * 0.07, '#efe9df', { seed: sd + 16 + sg, shadow: false }); ball(c, sg * s * 0.1 + (o.look || 0) * s * 0.02, -s * 0.015, s * 0.033, s * 0.038, '#121012', { seed: sd + 18 + sg, shadow: false, edge: false, tex: false }); c.save(); c.beginPath(); c.ellipse(sg * s * 0.1, -s * 0.03, s * 0.08, s * 0.075, 0, 0, TAU); c.clip(); c.fillStyle = face; c.fillRect(sg * s * 0.1 - s * 0.1, -s * 0.12, s * 0.2, s * 0.09 * (0.3 + lid)); c.restore(); }
  ball(c, 0, s * 0.19, s * 0.09, s * 0.05, shade(face, -0.25), { seed: sd + 19, shadow: false, edge: false });
  groove(c, [[-s * 0.05, s * 0.27], [0, s * 0.29], [s * 0.05, s * 0.27]], '#000', Math.max(1, s * 0.02), 0.5);
  if (o.prop === 'phone') { const gx = 0, gy = s * 0.55; if (o.glow !== 0) glow(c, gx, gy - s * 0.45, s * 0.8, '#bfe3ff', 0.35 * (o.glow ?? 1)); slab(c, gx - s * 0.12, gy - s * 0.12, s * 0.24, s * 0.36, s * 0.04, '#dff2ff', { seed: sd + 20, shine: 1.5, shadowA: 0.2 }); ball(c, gx - s * 0.18, gy + s * 0.1, s * 0.08, s * 0.07, face, { seed: sd + 21, shadow: false }); ball(c, gx + s * 0.18, gy + s * 0.1, s * 0.08, s * 0.07, face, { seed: sd + 22, shadow: false }); }
  if (o.prop === 'paper') { blob(c, [[-s * 0.5, s * 0.3], [s * 0.5, s * 0.26], [s * 0.55, s * 0.82], [-s * 0.55, s * 0.86]], shade('#e6dfcf', -tint), { seed: sd + 23, smooth: false }); for (let i = 0; i < 4; i++) groove(c, [[-s * 0.4, s * (0.42 + i * 0.1)], [s * 0.4, s * (0.4 + i * 0.1)]], '#000', Math.max(0.8, s * 0.02), 0.35); }
  c.restore();
}

// a sheep seen from behind (the foreground of a crowd)
export function sheepBack(c, x, y, s, o = {}) {
  const sd = o.seed ?? 950, tint = o.tint ?? 0.25, wool = shade(SHEEP.wool, -tint), woolD = shade(SHEEP.woolD, -tint);
  c.save(); c.translate(x, y);
  const r = rng(sd); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI + Math.PI, rr = s * (0.5 + r() * 0.12); ball(c, Math.cos(a) * s * 0.5, s * 0.4 + Math.sin(a) * s * 0.2, rr, rr * 0.85, i % 2 ? wool : woolD, { seed: sd + i, wob: 0.5, shadowA: 0.3 }); }
  for (const sg of [-1, 1]) ball(c, sg * s * 0.34, -s * 0.1, s * 0.18, s * 0.08, shade(SHEEP.face, -tint * 0.5), { seed: sd + 10 + sg, rot: -sg * 0.4 });
  if (o.prop === 'cap') ball(c, 0, -s * 0.18, s * 0.34, s * 0.2, shade('#34302d', -tint), { seed: sd + 12 });
  else if (o.prop === 'scarf') ball(c, 0, -s * 0.1, s * 0.36, s * 0.34, shade(o.scarfCol || '#5d534b', -tint), { seed: sd + 12 });
  else ball(c, 0, -s * 0.12, s * 0.3, s * 0.27, wool, { seed: sd + 12 });
  if (o.phone) glow(c, 0, -s * 0.4, s * 0.8, '#bfe3ff', 0.25);
  c.restore();
}
// the time-travel vortex: strips of coloured paper spinning past (k 0..1 through the transition)
export function vortex(c, k, t, cols = ['#c9a27a', '#7f8ea8', '#e8d9bd', '#9a5a48', '#5c4a3c']) {
  const a = Math.sin(Math.PI * clamp(k)); if (a <= 0) return;
  c.save(); c.translate(W / 2, H * 0.48);
  for (let i = 0; i < 22; i++) { const r0 = 50 + i * 30, rot = q(t) * (2 + i * 0.08) + i * 0.8; c.save(); c.globalAlpha = a * 0.92; c.shadowColor = 'rgba(20,12,6,0.45)'; c.shadowBlur = 4; c.shadowOffsetY = 3; c.beginPath(); c.arc(0, 0, r0, rot, rot + 1.2 + (i % 3) * 0.45); c.strokeStyle = cols[i % cols.length]; c.lineWidth = 16 + (i % 4) * 5; c.lineCap = 'butt'; c.stroke(); c.restore(); }
  c.restore();
  c.save(); const g = c.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, H * 0.6); g.addColorStop(0, `rgba(255,240,215,${0.18 * a})`); g.addColorStop(1, `rgba(20,14,10,${0.45 * a})`); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
}
// a paper tag taped on (the year cards)
export function plaque(c, text, x, y, size, k, t) {
  if (k <= 0) return; c.save(); c.translate(x, y); const s = ease.back(clamp(k)); c.scale(s, s); c.globalAlpha *= clamp(k * 2);
  c.font = `800 ${size}px ${FONT}`; const tw = c.measureText(text).width + size * 0.9;
  slab(c, -tw / 2, -size * 0.75, tw, size * 1.5, 4, '#efe4cc', { seed: 1201 });
  c.save(); c.rotate(-0.06); c.globalAlpha *= 0.75; slab(c, -size * 0.55, -size * 0.98, size * 1.1, size * 0.42, 2, '#e9dcae', { seed: 1202, shadow: false }); c.restore();   // a strip of tape
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3a2a1e'; c.fillText(text, 0, 2);
  c.restore();
}
