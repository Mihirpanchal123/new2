// The chalk / doodle look (learnt from the reference reel, see stories/s1v2.mjs):
//   a near-black board with a soft spotlight, white hand-drawn lines that draw themselves on and "boil"
//   (re-drawn 7.5 times a second), stick figures, one simple metaphor per idea, and colour only when it means
//   something: yellow = emphasis / hope, red = danger / no, blue = cold, pink = the mind, green = growth.
// Motion runs on a hand-drawn cadence (12 drawings a second, see step()).
import { W, H, FONT, clamp, lerp, seg, ease, E, rng } from './engine.mjs';

export const CH = { chalk: '#efece4', yellow: '#f5c84c', red: '#e8574f', blue: '#86aee8', pink: '#e79bb4', green: '#8fd18a', grey: '#7c7c80', board: '#0a0a0c' };
export const HAND = '"Kalam", "Nirmala UI", sans-serif';
const TAU = Math.PI * 2;
export const boil = t => Math.floor(t * 7.5);
export const step = (t, fps = 12) => Math.floor(t * fps) / fps;
export const pop = (t, t0, d = 0.25) => ease.back(seg(t, t0, t0 + d));

// the board: near-black, a soft spotlight, optional warm glow (hope)
export function board(c, o = {}) {
  c.fillStyle = CH.board; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, o.cy ?? 420, 30, W / 2, o.cy ?? 420, 560); g.addColorStop(0, 'rgba(62,62,68,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (o.glow > 0) { const y = c.createRadialGradient(o.gx ?? W / 2, o.gy ?? 420, 10, o.gx ?? W / 2, o.gy ?? 420, o.gr ?? 420); y.addColorStop(0, `rgba(245,200,76,${0.32 * o.glow})`); y.addColorStop(1, 'rgba(245,200,76,0)'); c.fillStyle = y; c.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- the chalk line
// stroke(c, pts, t, {p (0..1 drawn), w, col, alpha, seed, wob, close})
export function stroke(c, pts, t, o = {}) {
  const p = o.p ?? 1; if (p <= 0 || pts.length < 2) return;
  const r = rng((o.seed ?? 1) * 7919 + boil(t) * 131), amp = o.wob ?? 0.9;
  const P = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[i + 1]; P.push(a); if (!b) break; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L / 14); for (let k = 1; k < n; k++) P.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
  const J = P.map(([x, y]) => [x + (r() - 0.5) * amp * 2, y + (r() - 0.5) * amp * 2]);
  let total = 0; const L = []; for (let i = 1; i < J.length; i++) { const l = Math.hypot(J[i][0] - J[i - 1][0], J[i][1] - J[i - 1][1]); L.push(l); total += l; }
  let rem = total * clamp(p);
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  c.beginPath(); c.moveTo(J[0][0], J[0][1]);
  for (let i = 1; i < J.length; i++) { const l = L[i - 1]; if (rem >= l) { c.lineTo(J[i][0], J[i][1]); rem -= l; } else { const k = rem / l; c.lineTo(lerp(J[i - 1][0], J[i][0], k), lerp(J[i - 1][1], J[i][1], k)); break; } }
  c.strokeStyle = o.col || CH.chalk; c.lineWidth = o.w || 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  if (o.grain !== false) { c.globalAlpha *= 0.28; c.translate(0.9, 0.7); c.lineWidth = (o.w || 3) * 0.45; c.stroke(); }
  c.restore();
}
// point lists for shapes
export const circlePts = (cx, cy, rx, ry = rx, a0 = -1.9, turns = 1.06, n = 0) => { const N = n || Math.max(18, Math.round((rx + ry) * 0.45)); return Array.from({ length: N + 1 }, (_, i) => { const a = a0 + i / N * TAU * turns; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }); };
export const rectPts = (x, y, w, h) => [[x - 2, y], [x + w, y + 1], [x + w - 1, y + h], [x, y + h - 1], [x + 1, y - 3]];
export function fill(c, pts, col, alpha = 1) { c.save(); c.globalAlpha *= alpha; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = col; c.fill(); c.restore(); }

// ---------------------------------------------------------------- the stick figure
// stick(c, {x, y (feet), h, t, p (draw-on), face, look, pose, alpha, col, cap, seed, w})
//   face: 'flat' 'smile' 'happy' 'sad' 'worried' 'o' ; pose: { armL:[a,e], armR:[a,e], legL:[a,e], legR:[a,e], walk, tilt, sit }
//   angles from straight down, + towards screen-right
export function stick(c, o) {
  const { x, y, h, t } = o, p = o.p ?? 1, col = o.col || CH.chalk, w = o.w || Math.max(2.2, h * 0.02), sd = o.seed ?? 3, po = o.pose || {};   // (always returns the geometry, even before it is drawn)
  const wk = po.walk != null ? Math.sin(po.walk) : 0;
  const armL = po.armL || [-0.36 - wk * 0.25, 0.08], armR = po.armR || [0.36 + wk * 0.25, -0.08];
  const legL = po.legL || (po.sit ? [-1.35, 1.35] : [-0.15 + wk * 0.38, po.walk != null ? Math.max(0, -wk) * 0.4 : 0]);
  const legR = po.legR || (po.sit ? [1.35, -1.35] : [0.15 - wk * 0.38, po.walk != null ? -Math.max(0, wk) * 0.4 : 0]);
  const hipY = po.sit ? y - 0.25 * h : y - 0.44 * h, top = po.sit ? hipY - 0.56 * h : y - h;
  const head = [x + (po.tilt || 0) * h * 0.05, top + 0.115 * h], R = 0.105 * h, sh = [x, top + 0.26 * h], hip = [x, hipY];
  const limb = (o0, [a, e], l1, l2) => { const k = [o0[0] + Math.sin(a) * l1, o0[1] + Math.cos(a) * l1]; return [o0, k, [k[0] + Math.sin(a + e) * l2, k[1] + Math.cos(a + e) * l2]]; };
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  stroke(c, circlePts(head[0], head[1], R, R, -1.7, 1.04), t, { p: seg(p, 0, 0.3), w, col, seed: sd });
  stroke(c, [[head[0], head[1] + R], hip], t, { p: seg(p, 0.3, 0.42), w, col, seed: sd + 1 });
  stroke(c, limb(sh, armL, 0.2 * h, 0.17 * h), t, { p: seg(p, 0.42, 0.58), w, col, seed: sd + 2 });
  stroke(c, limb(sh, armR, 0.2 * h, 0.17 * h), t, { p: seg(p, 0.5, 0.66), w, col, seed: sd + 3 });
  stroke(c, limb(hip, legL, 0.23 * h, 0.21 * h), t, { p: seg(p, 0.66, 0.84), w, col, seed: sd + 4 });
  stroke(c, limb(hip, legR, 0.23 * h, 0.21 * h), t, { p: seg(p, 0.78, 1), w, col, seed: sd + 5 });
  if (o.cap) stroke(c, [[head[0] - R * 1.1, head[1] - R * 0.55], [head[0] + R * 1.3, head[1] - R * 0.6], [head[0] + R * 0.9, head[1] - R * 1.05], [head[0] - R * 0.8, head[1] - R * 1.05], [head[0] - R * 1.1, head[1] - R * 0.55]], t, { p: seg(p, 0.2, 0.4), w: w * 0.9, col, seed: sd + 6 });
  // the face
  if (p > 0.3) {
    const f = o.face || 'flat', lx = (o.look || 0) * R * 0.25, ex = R * 0.36, ey = head[1] - R * 0.08, fw = Math.max(1.6, w * 0.7);
    if (f === 'happy') { for (const s of [-1, 1]) stroke(c, [[head[0] + s * ex - R * 0.14 + lx, ey + 2], [head[0] + s * ex + lx, ey - 2], [head[0] + s * ex + R * 0.14 + lx, ey + 2]], t, { w: fw, col, seed: sd + 7 + s, wob: 0.3 }); }
    else for (const s of [-1, 1]) { c.beginPath(); c.arc(head[0] + s * ex + lx, ey, Math.max(1.6, R * 0.1), 0, TAU); c.fillStyle = col; c.fill(); }
    if (f === 'worried' || f === 'sad') for (const s of [-1, 1]) stroke(c, [[head[0] + s * ex * 1.35 + lx, ey - R * 0.3], [head[0] + s * ex * 0.45 + lx, ey - R * (f === 'worried' ? 0.45 : 0.4)]], t, { w: fw * 0.9, col, seed: sd + 9 + s, wob: 0.3 });
    const my = head[1] + R * 0.42, mx = head[0] + lx;
    if (f === 'smile' || f === 'happy') stroke(c, [[mx - R * 0.3, my - R * 0.06], [mx, my + R * 0.1], [mx + R * 0.3, my - R * 0.06]], t, { w: fw, col, seed: sd + 11, wob: 0.3 });
    else if (f === 'sad') stroke(c, [[mx - R * 0.26, my + R * 0.08], [mx, my - R * 0.06], [mx + R * 0.26, my + R * 0.08]], t, { w: fw, col, seed: sd + 12, wob: 0.3 });
    else if (f === 'worried') stroke(c, [[mx - R * 0.26, my], [mx - R * 0.1, my - R * 0.06], [mx + R * 0.08, my + R * 0.04], [mx + R * 0.26, my - R * 0.03]], t, { w: fw, col, seed: sd + 13, wob: 0.3 });
    else if (f === 'o') stroke(c, circlePts(mx, my, R * 0.12), t, { w: fw, col, seed: sd + 14, wob: 0.2 });
    else stroke(c, [[mx - R * 0.2, my], [mx + R * 0.2, my]], t, { w: fw, col, seed: sd + 15, wob: 0.3 });
  }
  c.restore();
  return { head, R, hand: limb(sh, armR, 0.2 * h, 0.17 * h)[2], handL: limb(sh, armL, 0.2 * h, 0.17 * h)[2] };
}

// ---------------------------------------------------------------- props + marks
export function text(c, s, x, y, size, o = {}) {
  c.save(); c.globalAlpha *= o.alpha ?? 1; c.font = `${o.weight || 700} ${size}px ${HAND}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  c.fillStyle = o.col || CH.chalk; c.fillText(s, x, y); const m = c.measureText(s).width; c.restore(); return m;
}
// a hand-lettered label in a sketchy box; strike 0..1 draws a red line through it
export function label(c, s, x, y, size, t, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.5) * (o.alpha ?? 1); c.translate(x, y); const sc = 0.85 + 0.15 * ease.back(clamp(k)); c.scale(sc, sc);
  c.font = `700 ${size}px ${HAND}`; const tw = c.measureText(s).width, bw = tw + size * 0.9, bh = size * 1.45;
  stroke(c, rectPts(-bw / 2, -bh / 2, bw, bh), t, { p: clamp(k * 1.4), col: o.col || CH.chalk, w: 2.4, seed: o.seed ?? 21 });
  if (o.fill) fill(c, rectPts(-bw / 2, -bh / 2, bw, bh), o.fill, 0.18);
  text(c, s, 0, 2, size, { col: o.col || CH.chalk });
  if (o.strike > 0) stroke(c, [[-bw / 2 - 4, 3], [bw / 2 + 4, -2]], t, { p: o.strike, col: CH.red, w: 3.4, seed: (o.seed ?? 21) + 1 });
  c.restore();
}
export function cross(c, x, y, s, t, p = 1, col = CH.red, seed = 31) { stroke(c, [[x - s, y - s], [x + s, y + s]], t, { p: clamp(p * 2), col, w: 4, seed }); stroke(c, [[x + s, y - s], [x - s, y + s]], t, { p: clamp(p * 2 - 1), col, w: 4, seed: seed + 1 }); }
export function sparkle(c, x, y, s, t, col = CH.yellow, k = 1) { if (k <= 0) return; const r = s * (0.85 + 0.15 * Math.sin(boil(t) * 1.3)) * clamp(k); stroke(c, [[x - r, y], [x + r, y]], t, { col, w: 2.2, seed: 41, wob: 0.3 }); stroke(c, [[x, y - r], [x, y + r]], t, { col, w: 2.2, seed: 42, wob: 0.3 }); }
export function question(c, x, y, s, t, k = 1, col = CH.yellow) { if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(Math.sin(boil(t)) * 0.06); const sc = ease.back(clamp(k)); c.scale(sc, sc); text(c, '?', 0, 0, s, { col }); c.restore(); }
// a door in its frame; open 0..1 swings it (hinge on the left) and lets light out to the side `dir`
export function door(c, x, y, w, h, open, t, o = {}) {
  const p = o.p ?? 1;
  if (open > 0) { // light: the doorway glows, a wedge falls on the floor
    fill(c, [[x, y - h], [x + w, y - h], [x + w, y], [x, y]], CH.yellow, 0.75 * open);
    const d = o.dir ?? -1, far = x + (d < 0 ? 0 : w) + d * 240 * open;
    fill(c, [[x, y], [x + w, y], [far + (d < 0 ? 40 : 0), y + 26 * open], [far - (d < 0 ? 0 : 40) - (d < 0 ? 60 : -60) * open, y + 26 * open]], CH.yellow, 0.22 * open);
    const g = c.createRadialGradient(x + w / 2, y - h / 2, 5, x + w / 2, y - h / 2, 260); g.addColorStop(0, `rgba(245,200,76,${0.28 * open})`); g.addColorStop(1, 'rgba(245,200,76,0)'); c.fillStyle = g; c.fillRect(x - 300, y - h - 300, w + 600, h + 600);
  }
  stroke(c, rectPts(x, y - h, w, h), t, { p, w: 3.2, seed: o.seed ?? 51 });
  // the door leaf: a rectangle that narrows towards the hinge as it opens
  const fx = x + w - open * w * 0.78, sk = open * h * 0.07;
  if (p > 0.6) { stroke(c, [[x, y - h], [fx, y - h - sk], [fx, y + sk * 0.6], [x, y]], t, { p: seg(p, 0.6, 1), w: 3, seed: (o.seed ?? 51) + 1 }); c.beginPath(); c.arc(lerp(x, fx, 0.85), y - h * 0.48, 3, 0, TAU); c.fillStyle = CH.chalk; c.fill(); }
}
export function padlock(c, x, y, s, open, t, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.4);
  stroke(c, rectPts(x - s * 0.5, y, s, s * 0.8), t, { w: 2.6, seed: 61 });
  const ly = y - open * s * 0.35; stroke(c, [[x - s * 0.3, ly + s * 0.05], [x - s * 0.3, ly - s * 0.25], ...circlePts(x, ly - s * 0.25, s * 0.3, s * 0.3, Math.PI, 0.5, 10), [x + s * 0.3, ly + (open > 0.5 ? -s * 0.1 : s * 0.05)]], t, { w: 2.6, seed: 62 });
  c.beginPath(); c.arc(x, y + s * 0.38, 2.2, 0, TAU); c.fillStyle = CH.chalk; c.fill(); c.restore();
}
export function keys(c, x, y, s, t) { stroke(c, circlePts(x, y, s * 0.35), t, { w: 2.2, seed: 71 }); for (const [a, l] of [[1.2, 1], [1.9, 0.8]]) { const ex = x + Math.cos(a) * s * 1.3 * l, ey = y + Math.sin(a) * s * 1.3 * l; stroke(c, [[x + Math.cos(a) * s * 0.35, y + Math.sin(a) * s * 0.35], [ex, ey], [ex + 5, ey - 2]], t, { w: 2.2, seed: 72 + a }); } }
export function bars(c, x, y, w, h, t, p = 1) { stroke(c, rectPts(x, y, w, h), t, { p, w: 2.6, seed: 81 }); for (let i = 1; i < 4; i++) stroke(c, [[x + w * i / 4, y], [x + w * i / 4, y + h]], t, { p: seg(p, 0.4 + i * 0.1, 0.7 + i * 0.1), w: 2.4, seed: 82 + i }); }
export function cloud(c, cx, cy, rx, ry, t, p = 1, col = CH.chalk) { const n = 9, pts = []; for (let i = 0; i <= n * 6; i++) { const a = i / (n * 6) * TAU - 1.6, bump = 1 + 0.12 * Math.abs(Math.sin(i / 6 * Math.PI)); pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump]); } stroke(c, pts, t, { p, w: 2.8, seed: 91, col }); }
export function bubbles(c, x0, y0, x1, y1, t, p = 1) { for (let i = 0; i < 3; i++) { const k = seg(p, i * 0.25, i * 0.25 + 0.4); if (k > 0) stroke(c, circlePts(lerp(x0, x1, i / 2.5), lerp(y0, y1, i / 2.5), 4 + i * 3), t, { w: 2.2, seed: 95 + i, p: k }); } }
export function sun(c, x, y, r, t, k = 1) { if (k <= 0) return; c.save(); c.globalAlpha *= clamp(k * 1.5); fill(c, circlePts(x, y, r * k), CH.yellow, 0.95); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; stroke(c, [[x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35], [x + Math.cos(a) * r * (1.35 + 0.5 * k), y + Math.sin(a) * r * (1.35 + 0.5 * k)]], t, { col: CH.yellow, w: 2.4, seed: 101 + i, wob: 0.4 }); } c.restore(); }
export function bird(c, x, y, s, t, seed = 1) { const f = Math.sin(t * 9 + seed) * 0.5 + 0.5; stroke(c, [[x - s, y - s * 0.3 * f], [x, y + s * 0.15], [x + s, y - s * 0.3 * f]], t, { w: 2, seed: 111 + seed, wob: 0.3 }); }
export function brain(c, cx, cy, s, t, k = 1) { if (k <= 0) return; c.save(); c.globalAlpha *= clamp(k * 1.5); const pts = circlePts(cx, cy, s, s * 0.72, -1.6, 1, 24).map(([x, y], i) => [x + Math.sin(i * 1.7) * s * 0.06, y + Math.cos(i * 2.1) * s * 0.06]); fill(c, pts, CH.pink, 0.85); stroke(c, pts, t, { w: 2, col: '#b46a86', seed: 121 }); stroke(c, [[cx, cy - s * 0.65], [cx - s * 0.08, cy - s * 0.1], [cx + s * 0.05, cy + s * 0.3], [cx, cy + s * 0.65]], t, { w: 1.8, col: '#7a3a54', seed: 122 }); stroke(c, [[cx - s * 0.6, cy - s * 0.2], [cx - s * 0.3, cy - s * 0.3], [cx - s * 0.35, cy + s * 0.1]], t, { w: 1.6, col: '#7a3a54', seed: 123 }); stroke(c, [[cx + s * 0.6, cy - s * 0.15], [cx + s * 0.3, cy - s * 0.3], [cx + s * 0.4, cy + s * 0.15]], t, { w: 1.6, col: '#7a3a54', seed: 124 }); c.restore(); }
// chain links along an ellipse around (cx, cy); p = how much is drawn; burst 0..1 throws the links outwards
export function chain(c, cx, cy, rx, ry, t, o = {}) {
  const n = o.n || 12, p = o.p ?? 1, col = o.col || CH.grey, burst = o.burst || 0;
  for (let i = 0; i < n; i++) { const k = seg(p, i / n, (i + 1) / n); if (k <= 0) continue;
    const a = i / n * TAU + (o.a0 || 0), x = cx + Math.cos(a) * rx * (1 + burst * 1.6), y = cy + Math.sin(a) * ry * (1 + burst * 1.6) + burst * burst * 140, rot = a + Math.PI / 2 + (i % 2) * 0.0 + burst * i;
    c.save(); c.globalAlpha *= (1 - burst) * clamp(k * 2); c.translate(x, y); c.rotate(rot); stroke(c, circlePts(0, 0, (i % 2 ? 8 : 9) * (o.s || 1), (i % 2 ? 4 : 5) * (o.s || 1)), t, { w: 2.4, col, seed: 131 + i, wob: 0.4 }); c.restore(); }
}
export function scribble(c, cx, cy, r, t, p = 1, col = CH.red, seed = 141) { const rr = rng(seed), pts = []; let a = 0; for (let i = 0; i < 44; i++) { a += 0.6 + rr() * 0.9; const rad = r * (0.3 + rr() * 0.7); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } stroke(c, pts, t, { p, col, w: 2.2, seed }); }
export function tally(c, x, y, n, t, h = 40) { for (let i = 0; i < Math.floor(n); i++) { const g = Math.floor(i / 5), j = i % 5, gx = x + (g % 2) * 70, gy = y + Math.floor(g / 2) * (h + 18); if (j < 4) stroke(c, [[gx + j * 11, gy], [gx + j * 11 + 2, gy + h]], t, { w: 2.4, seed: 151 + i }); else stroke(c, [[gx - 6, gy + h * 0.75], [gx + 40, gy + h * 0.2]], t, { w: 2.4, seed: 151 + i }); } }
export function sweat(c, x, y, s, t, k = 1) { if (k <= 0) return; stroke(c, [[x, y - s], [x + s * 0.55, y + s * 0.3], ...circlePts(x, y + s * 0.3, s * 0.55, s * 0.5, 0, 0.5, 8), [x, y - s]], t, { w: 2, col: CH.blue, seed: 161, alpha: clamp(k) }); }
