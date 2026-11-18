// The "Aarav" art direction (stories/s10v3.mjs onwards): a cinematic explainer look for young adults.
//   palette   deep navy, warm cream, muted grey  +  teal, coral, amber accents
//   people    adult proportions (about 6.7 heads tall), clean medium-weight dark outlines, two-tone cel shading
//   motion    a rig (joint angles), smear frames on fast moves, hand-drawn accents that "boil" at 12 fps
//   extras    phone + chat UI, floating chat bubbles, a paper texture over the frame
// Everything is drawn in the 540x960 logical space of engine.mjs.
import { W, H, FONT, clamp, lerp, seg, ease, E, rng, noise1, mix, shade, rgba, lin, rad, rr, ell, circ, poly, blob } from './engine.mjs';

export const PAL = {
  navy: '#14213d', navyD: '#0b1428', navyM: '#1c2b4b', navyL: '#2a3d63',
  cream: '#f3e9d2', creamD: '#dfcfae', creamL: '#fbf6ea',
  grey: '#8d99ae', greyD: '#5d6880', greyL: '#c4cbd7',
  teal: '#2a9d8f', tealD: '#1d7166', tealL: '#69c6b8',
  coral: '#ef6f5e', coralD: '#c24e40', coralL: '#f8a194',
  amber: '#f4a940', amberD: '#cc8424', amberL: '#fbd08c',
  ink: '#131a2c',
};
const TAU = Math.PI * 2;
// the cel shadow of a colour: darker and pulled towards navy (cool shadows, warm light)
export const S = (col, k = 0.3) => mix(col, '#1a2140', k);

// ---------------------------------------------------------------- shading + lines
// two-tone cel shading: the shape in its shadow colour, then the lit part (the same shape moved towards the light) on top
// path() builds the path; off = where the shadow falls (the light comes from the other side)
export function cel(c, path, base, shadowCol, off, lw, ol = PAL.ink) {
  path(); c.fillStyle = shadowCol; c.fill();
  c.save(); path(); c.clip(); c.translate(-off[0], -off[1]); path(); c.fillStyle = base; c.fill(); c.restore();
  if (lw) { path(); c.lineWidth = lw; c.strokeStyle = ol; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
// a tapered capsule from a to b (limbs)
export function capsule(c, a, b, w0, w1) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  c.beginPath(); c.arc(a[0], a[1], w0 / 2, ang + Math.PI / 2, ang - Math.PI / 2); c.arc(b[0], b[1], w1 / 2, ang - Math.PI / 2, ang + Math.PI / 2); c.closePath();
}
// a hand-drawn line: the points wobble a little and "boil" (re-drawn 12 times a second, like hand animation)
export function wobble(c, pts, t, amt = 1.2, seed = 1) {
  const f = Math.floor(t * 12), r = rng(seed * 977 + f * 13);
  c.beginPath(); pts.forEach(([x, y], i) => { const dx = (r() - 0.5) * amt * 2, dy = (r() - 0.5) * amt * 2; i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy); });
}
export function strokeW(c, pts, t, col, w, amt = 1.2, seed = 1) { wobble(c, pts, t, amt, seed); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }

// ---------------------------------------------------------------- hand-drawn accents
// kind: 'vibe' (a buzzing phone), 'pop' (emphasis ticks), 'sparkle', 'sweat', 'x' (a scribbled cross), 'underline',
//       'circle' (a scribbled ring), 'motion' (speed lines, dir = -1 left / 1 right), 'q' (a question mark), 'dots' (...)
export function accent(c, kind, x, y, s, t, o = {}) {
  const col = o.col || PAL.cream, k = o.k ?? 1, lw = (o.lw || 3) * Math.max(0.6, s / 30), seed = o.seed || 3;
  if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k); c.translate(x, y);
  if (kind === 'vibe') { for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) { const r = s * (0.55 + i * 0.22), a0 = sg > 0 ? -0.5 : Math.PI - 0.5; c.beginPath(); c.arc(0, 0, r + (Math.floor(t * 24) % 2) * 1.5, sg > 0 ? -0.45 : Math.PI - 0.45, sg > 0 ? 0.45 : Math.PI + 0.45); c.strokeStyle = col; c.lineWidth = lw * (1 - i * 0.2); c.lineCap = 'round'; c.stroke(); } }
  else if (kind === 'pop') { for (let i = 0; i < (o.n || 3); i++) { const a = (o.a ?? -Math.PI / 2) + (i - ((o.n || 3) - 1) / 2) * 0.55; strokeW(c, [[Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55], [Math.cos(a) * s, Math.sin(a) * s]], t, col, lw, 0.8, seed + i); } }
  else if (kind === 'sparkle') { const r = s * (0.8 + 0.2 * Math.sin(t * 9)); c.rotate(t * 0.6); c.beginPath(); for (let i = 0; i < 8; i++) { const rr2 = i % 2 ? r * 0.22 : r, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); c.fillStyle = col; c.fill(); }
  else if (kind === 'sweat') { c.beginPath(); c.moveTo(0, -s * 0.6); c.quadraticCurveTo(s * 0.45, s * 0.1, 0, s * 0.35); c.quadraticCurveTo(-s * 0.45, s * 0.1, 0, -s * 0.6); c.fillStyle = '#bfe6f2'; c.fill(); c.strokeStyle = PAL.ink; c.lineWidth = lw * 0.6; c.stroke(); }
  else if (kind === 'x') { const p = o.p ?? 1; const a = clamp(p * 2), b = clamp(p * 2 - 1); strokeW(c, [[-s, -s], [lerp(-s, s, a), lerp(-s, s, a)]], t, col, lw * 1.5, 1.8, seed); if (b > 0) strokeW(c, [[s, -s], [lerp(s, -s, b), lerp(-s, s, b)]], t, col, lw * 1.5, 1.8, seed + 1); }
  else if (kind === 'underline') { const p = o.p ?? 1, n = 8, pts = []; for (let i = 0; i <= n * p; i++) pts.push([-s + 2 * s * i / n, Math.sin(i * 1.3) * 2.5]); if (pts.length > 1) strokeW(c, pts, t, col, lw, 1, seed); }
  else if (kind === 'circle') { const p = o.p ?? 1, n = 26, pts = []; for (let i = 0; i <= n * p * 1.08; i++) { const a = -Math.PI * 0.6 + i / n * TAU; pts.push([Math.cos(a) * s * (o.rx || 1.4), Math.sin(a) * s * (o.ry || 0.8)]); } if (pts.length > 1) strokeW(c, pts, t, col, lw, 1.6, seed); }
  else if (kind === 'motion') { const d = o.dir || -1; for (let i = 0; i < (o.n || 4); i++) { const yy = (i - 1.5) * s * 0.45, l = s * (0.8 + (i % 2) * 0.5); strokeW(c, [[0, yy], [d * l, yy]], t, col, lw * 0.8, 0.6, seed + i); } }
  else if (kind === 'q') { c.font = `800 ${s * 1.6}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.rotate(Math.sin(t * 3) * 0.12); c.lineWidth = lw * 1.4; c.strokeStyle = PAL.ink; c.strokeText('?', 0, 0); c.fillStyle = col; c.fillText('?', 0, 0); }
  else if (kind === 'dots') { for (let i = 0; i < 3; i++) { const b = Math.max(0, Math.sin(t * 6 - i * 0.9)) * s * 0.25; circ(c, (i - 1) * s * 0.55, -b, s * 0.16); c.fillStyle = col; c.fill(); } }
  c.restore();
}

// ---------------------------------------------------------------- the rig
// person(c, P): P = { x, y (feet), h (height), flip (1 faces right, -1 left), t, alpha, style, pose, face, prop, prev }
//   pose: { lean, bob, shrug, headTilt, headY, sit (hip height, in % of h), armF:[shoulder, elbow], armB:[..],
//           legF:[hip, knee], legB:[..], handF, handB ('open' 'fist' 'point' 'phone' 'flat') }  angles: 0 = down, + = forward
//   face: { expr, look:[x,y], talk (0..1), blink (false = never) }
//   prev: the same P a moment earlier -> smear frames on fast hands
// The recurring hero, Aarav: ~25, wavy swept hair, light stubble, teal overshirt over a cream tee, navy chinos, white sneakers.
export const AARAV = { skin: '#c68a62', hair: '#221d27', top: '#f3e9d2', jacket: '#2a9d8f', pants: '#26314f', shoes: '#efe7d6', sole: '#8d99ae', hairStyle: 'aarav', stubble: true };
const BASE = { skin: '#c68a62', hair: '#221d27', top: '#8d99ae', jacket: null, pants: '#26314f', shoes: '#2a2026', sole: '#5d6880', hairStyle: 'neat', stubble: false };
export function walk(ph, amp = 1) {
  return {
    bob: -Math.abs(Math.cos(ph)) * 1.3 * amp,
    legF: [Math.sin(ph) * 0.42 * amp, -Math.max(0, Math.sin(ph + 1.3)) * 0.75 * amp - 0.06],
    legB: [-Math.sin(ph) * 0.42 * amp, -Math.max(0, Math.sin(ph + 1.3 + Math.PI)) * 0.75 * amp - 0.06],
    armF: [-Math.sin(ph) * 0.32 * amp, 0.22], armB: [Math.sin(ph) * 0.32 * amp, 0.22],
  };
}
export function joints(P) {
  const u = P.h / 100, po = P.pose || {}, lean = po.lean || 0, bob = (po.bob || 0) * u;
  const hipY = po.sit ? -po.sit * u : -50 * u + bob;
  const hip = [0, hipY];
  const rot = p => { const dx = p[0] - hip[0], dy = p[1] - hip[1], cs = Math.cos(lean), sn = Math.sin(lean); return [hip[0] + dx * cs - dy * sn, hip[1] + dx * sn + dy * cs]; };
  const up = y => hipY + (y + 50) * u;        // torso heights measured as if the hip were at -50
  const sh = (po.shrug || 0) * 3 * u;
  const arm = (s, a, e) => { const A = a + lean, el = [s[0] + Math.sin(A) * 17 * u, s[1] + Math.cos(A) * 17 * u], B = A + e, wr = [el[0] + Math.sin(B) * 15 * u, el[1] + Math.cos(B) * 15 * u]; return { s, el, wr, ang: B }; };
  const leg = (hx, a, k) => { const h0 = [hx, hipY], kn = [h0[0] + Math.sin(a) * 24.5 * u, h0[1] + Math.cos(a) * 24.5 * u], B = a + k, an = [kn[0] + Math.sin(B) * 23.5 * u, kn[1] + Math.cos(B) * 23.5 * u]; return { h: h0, kn, an }; };
  const sitLeg = po.sit ? [1.45, -1.45] : [0, 0];
  const aF = po.armF || [0.08, 0.15], aB = po.armB || [-0.04, 0.12];
  return {
    u, lean, hip, up,
    shF: rot([-4 * u, up(-80) - sh]), shB: rot([6 * u, up(-80.5) - sh]),
    neck: rot([1.5 * u, up(-81)]), head: rot([2.5 * u, up(-91.6) + (po.headY || 0) * u]),
    armF: arm(rot([-4 * u, up(-79) - sh]), aF[0], aF[1]), armB: arm(rot([6 * u, up(-79.5) - sh]), aB[0], aB[1]),
    legF: leg(-2 * u, (po.legF || sitLeg)[0], (po.legF || sitLeg)[1]), legB: leg(3 * u, (po.legB || sitLeg)[0], (po.legB || sitLeg)[1]),
  };
}
// where a hand is on screen (for props that follow a hand)
export function handAt(P, which = 'F') { const J = joints(P), w = (which === 'F' ? J.armF : J.armB).wr, f = P.flip ?? 1; return [P.x + w[0] * f, P.y + w[1]]; }

export function person(c, P) {
  const J = joints(P), u = J.u, st = P.style ? { ...BASE, ...P.style } : AARAV, po = P.pose || {}, lw = Math.max(1.7, 2.7 * P.h / 500), t = P.t || 0;
  c.save(); c.globalAlpha *= P.alpha ?? 1; c.translate(P.x, P.y); if ((P.flip ?? 1) < 0) c.scale(-1, 1);
  if (P.shadow !== false && !po.sit) { ell(c, 1 * u, 0, 17 * u, 2.4 * u); c.fillStyle = 'rgba(8,12,28,0.3)'; c.fill(); }
  const back = st.desat ? 0 : 0.14;
  // back arm, legs, back hair, torso, head, front arm
  drawArm(c, J.armB, st, u, lw, back, po.handB || 'open', null, t);
  if (st.hairStyle === 'long' || st.hairStyle === 'bun') hairBack(c, J, st, u, lw, po);
  drawLeg(c, J.legB, st, u, lw, back); drawLeg(c, J.legF, st, u, lw, 0);
  drawTorso(c, J, st, u, lw);
  drawHead(c, J, P, st, u, lw, t);
  if (P.prev) smear(c, joints(P.prev).armF, J.armF, st, u);
  drawArm(c, J.armF, st, u, lw, 0, po.handF || 'open', P.prop, t, P);
  c.restore();
}
// a smear frame: when a hand travels far in one frame, a stretched streak of its sleeve joins where it was and where it is
function smear(c, A0, A1, st, u) {
  const d = Math.hypot(A1.wr[0] - A0.wr[0], A1.wr[1] - A0.wr[1]); if (d < 5 * u) return;
  const k = clamp((d - 5 * u) / (14 * u));
  c.save(); c.globalAlpha *= 0.55 + 0.35 * k;
  const w = 4.6 * u; capsule(c, A0.wr, A1.wr, w * 0.5, w * 1.1); c.fillStyle = st.jacket || st.top; c.fill();
  capsule(c, A0.el, A1.el, w * 0.35, w * 0.9); c.fill();
  c.strokeStyle = rgba(PAL.cream, 0.7); c.lineWidth = 1.4; c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { const nx = -(A1.wr[1] - A0.wr[1]) / d * i * 2.2 * u, ny = (A1.wr[0] - A0.wr[0]) / d * i * 2.2 * u; c.beginPath(); c.moveTo(A0.wr[0] + nx, A0.wr[1] + ny); c.lineTo(lerp(A0.wr[0], A1.wr[0], 0.75) + nx, lerp(A0.wr[1], A1.wr[1], 0.75) + ny); c.stroke(); }
  c.restore();
}
function drawArm(c, A, st, u, lw, dark, hand, prop, t, P) {
  const sl = shade(st.jacket || st.top, -dark), sk = shade(st.skin, -dark), off = [-1.2 * u, 1.0 * u];
  cel(c, () => capsule(c, A.s, A.el, 6.4 * u, 5.4 * u), sl, S(sl), off, lw);
  cel(c, () => capsule(c, A.el, A.wr, 5.4 * u, 4.6 * u), sl, S(sl), off, lw);
  // the hand
  c.save(); c.translate(A.wr[0], A.wr[1]); c.rotate(-A.ang);
  if (hand === 'fist') { cel(c, () => ell(c, 0, 2.2 * u, 2.7 * u, 2.9 * u), sk, S(sk), [-0.6 * u, 0.5 * u], lw); }
  else if (hand === 'point') { cel(c, () => { c.beginPath(); c.roundRect(-2.6 * u, -0.5 * u, 5.2 * u, 5.2 * u, 2 * u); }, sk, S(sk), [-0.6 * u, 0.5 * u], lw); cel(c, () => capsule(c, [0.6 * u, 3.5 * u], [0.9 * u, 9 * u], 1.6 * u, 1.4 * u), sk, S(sk), [-0.3 * u, 0.3 * u], lw * 0.9); }
  else { cel(c, () => { c.beginPath(); c.roundRect(-2.5 * u, -0.6 * u, 5 * u, 6.4 * u, 2.3 * u); }, sk, S(sk), [-0.6 * u, 0.5 * u], lw); cel(c, () => capsule(c, [2 * u, 1 * u], [3.6 * u, 3.6 * u], 1.6 * u, 1.3 * u), sk, S(sk), [-0.3 * u, 0.3 * u], lw * 0.9); }
  c.restore();
  if (prop && prop.type === 'phone') phoneProp(c, A, u, lw, prop, t);
}
function phoneProp(c, A, u, lw, prop, t) {
  c.save(); c.translate(A.wr[0] + (prop.dx || 1) * u, A.wr[1] + (prop.dy || 1.5) * u); c.rotate(prop.rot ?? -0.1);
  const w = 5.6 * u, h = 11 * u;
  if (prop.on) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 0, 0, 2, 22 * u, [[0, 'rgba(160,230,220,0.35)'], [1, 'rgba(160,230,220,0)']]); c.fillRect(-25 * u, -25 * u, 50 * u, 50 * u); c.restore(); }
  rr(c, -w / 2, -h / 2, w, h, 1.2 * u); c.fillStyle = PAL.navyD; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.ink; c.stroke();
  if (prop.facing !== 'away') { rr(c, -w / 2 + 0.6 * u, -h / 2 + 0.8 * u, w - 1.2 * u, h - 1.6 * u, 0.8 * u); c.fillStyle = prop.on ? (prop.screen || '#dff4ef') : '#0d1220'; c.fill(); }
  c.restore();
}
function drawLeg(c, L, st, u, lw, dark) {
  const p = shade(st.pants, -dark), off = [-1.3 * u, 1 * u];
  if (st.skirt) { /* long kurta covers the thighs: only shins */ }
  cel(c, () => capsule(c, L.h, L.kn, 8.6 * u, 6.8 * u), p, S(p), off, lw);
  cel(c, () => capsule(c, L.kn, L.an, 6.8 * u, 5.2 * u), p, S(p), off, lw);
  // the shoe, pointing forward
  const sh = shade(st.shoes, -dark), ax = L.an[0], ay = L.an[1];
  cel(c, () => { c.beginPath(); c.moveTo(ax - 3 * u, ay - 2.2 * u); c.lineTo(ax + 4 * u, ay - 1.6 * u); c.quadraticCurveTo(ax + 8.4 * u, ay - 1 * u, ax + 8.2 * u, ay + 1.6 * u); c.lineTo(ax - 3.4 * u, ay + 1.8 * u); c.closePath(); }, sh, S(sh, 0.22), [-0.8 * u, 0.6 * u], lw);
  c.beginPath(); c.moveTo(ax - 3.3 * u, ay + 0.9 * u); c.lineTo(ax + 8.2 * u, ay + 0.9 * u); c.strokeStyle = st.sole || PAL.grey; c.lineWidth = lw * 0.9; c.stroke();
}
function drawTorso(c, J, st, u, lw) {
  const up = J.up;
  c.save(); c.translate(J.hip[0], J.hip[1]); c.rotate(J.lean); c.translate(-J.hip[0], -J.hip[1]);
  const len = st.kurta ? 13 : 0;                 // a kurta / long top hangs lower
  const body = () => blob(c, [[-8.6 * u, up(-80.5)], [-3 * u, up(-82.6)], [6 * u, up(-82.6)], [10.2 * u, up(-79)], [11.2 * u, up(-70)], [9.8 * u, up(-60)], [8.6 * u + len * 0.25 * u, up(-50 + len)], [0, up(-48.2 + len)], [-8.4 * u - len * 0.2 * u, up(-50 + len)], [-9.8 * u, up(-61)], [-10.2 * u, up(-72)]]);
  const outer = st.jacket || st.top;
  cel(c, body, outer, S(outer), [-2.2 * u, 1.2 * u], lw);
  if (st.jacket) { // the open overshirt shows the tee
    c.save(); body(); c.clip();
    const tee = () => poly(c, [[1.6 * u, up(-82)], [7.6 * u, up(-81.5)], [10.6 * u, up(-72)], [10 * u, up(-61)], [8.8 * u, up(-50)], [3.6 * u, up(-48)], [2.4 * u, up(-62)], [2 * u, up(-74)]]);
    cel(c, tee, st.top, S(st.top, 0.22), [-1 * u, 0.8 * u], lw * 0.9);
    // collar flaps + a chest pocket
    poly(c, [[1 * u, up(-82.4)], [4.6 * u, up(-76.5)], [-1.2 * u, up(-78.6)]]); c.fillStyle = shade(outer, -0.12); c.fill(); c.lineWidth = lw * 0.85; c.strokeStyle = PAL.ink; c.stroke();
    rr(c, -6.4 * u, up(-74), 5 * u, 4.6 * u, 0.8 * u); c.lineWidth = lw * 0.6; c.stroke();
    c.restore();
  } else if (st.neckline) { c.beginPath(); c.moveTo(-1 * u, up(-82.4)); c.quadraticCurveTo(3 * u, up(-77), 7 * u, up(-82.4)); c.strokeStyle = PAL.ink; c.lineWidth = lw * 0.8; c.stroke(); }
  if (st.dupatta) { cel(c, () => blob(c, [[-6 * u, up(-82)], [2 * u, up(-81)], [9 * u, up(-66)], [6 * u, up(-56)], [1 * u, up(-70)], [-7 * u, up(-78)]]), st.dupatta, S(st.dupatta), [-1 * u, 0.8 * u], lw * 0.9); }
  c.restore();
  // the neck
  const sk = st.skin; cel(c, () => capsule(c, [J.neck[0], J.neck[1] + 1.5 * u], [J.head[0] - 0.6 * u, J.head[1] + 4.5 * u], 6.4 * u, 6 * u), sk, S(sk, 0.4), [-1.2 * u, 1 * u], lw);
}

// ---------------------------------------------------------------- the head (3/4 view, facing right), in head units
const HEAD = [[-0.42, -0.10], [-0.38, -0.38], [-0.12, -0.53], [0.19, -0.51], [0.40, -0.35], [0.45, -0.10], [0.46, 0.10], [0.39, 0.30], [0.23, 0.45], [0.06, 0.49], [-0.15, 0.41], [-0.30, 0.22], [-0.40, 0.06]];
const EXPR = {
  neutral: { b: [0, 0, 0, 0], lid: 0.88, m: 'flat' },
  smug: { b: [0.22, 0.045, -0.12, -0.015], lid: 0.64, lt: -0.25, m: 'smirk' },
  confident: { b: [-0.1, 0, -0.1, 0], lid: 0.75, m: 'smile' },
  happy: { b: [0.1, 0.03, 0.1, 0.03], lid: 0.72, m: 'grin' },
  annoyed: { b: [-0.32, -0.02, -0.32, -0.02], lid: 0.6, lt: -0.45, m: 'down' },
  surprised: { b: [0.12, 0.07, 0.12, 0.07], lid: 1.15, m: 'o' },
  sad: { b: [0.36, 0.02, 0.36, 0.02], lid: 0.6, lt: 0.5, m: 'frown' },
  lonely: { b: [0.26, 0, 0.26, 0], lid: 0.48, lt: 0.35, m: 'flat' },
  hurt: { b: [0.42, 0.03, 0.42, 0.03], lid: 0.72, lt: 0.5, m: 'frown' },
  tired: { b: [0.08, -0.01, 0.08, -0.01], lid: 0.42, lt: 0.1, m: 'flat' },
};
function drawHead(c, J, P, st, u, lw, t) {
  const po = P.pose || {}, fc = P.face || {}, ex = EXPR[fc.expr || 'neutral'] || EXPR.neutral, hu = 16 * u, L = lw / hu;
  c.save(); c.translate(J.head[0], J.head[1]); c.rotate(J.lean + (po.headTilt || 0)); c.scale(hu, hu);
  const sk = st.skin, skS = mix(sk, '#4a2840', 0.32);
  // ear (behind the face outline), head, stubble
  cel(c, () => ell(c, -0.13, 0.05, 0.085, 0.12), sk, skS, [-0.02, 0.02], L);
  cel(c, () => blob(c, HEAD), sk, skS, [-0.075, 0.045], L);
  c.beginPath(); c.arc(-0.13, 0.05, 0.045, -1.2, 1.4); c.strokeStyle = PAL.ink; c.lineWidth = L * 0.7; c.stroke();
  if (st.stubble) { c.save(); blob(c, HEAD); c.clip(); c.fillStyle = 'rgba(40,30,50,0.1)'; ell(c, 0.16, 0.37, 0.3, 0.15); c.fill(); c.restore(); }
  if (st.blush !== false) { c.fillStyle = rgba(PAL.coral, 0.16); ell(c, 0.13, 0.15, 0.07, 0.04); c.fill(); }
  // eyes
  const look = fc.look || [0, 0];
  let lid = ex.lid; if (fc.blink !== false) { const ph = (t + (P.seed || 0) * 1.7) % 3.6; if (ph < 0.12) lid = 0.05; }
  if (fc.lid != null) lid = fc.lid;
  eye(c, 0.10, -0.02, 1, lid, look, L, st, ex.lt || 0, 1);
  eye(c, 0.335, -0.03, 0.72, lid, look, L, st, ex.lt || 0, -1);
  // brows
  const [aN, rN, aF, rF] = ex.b, bw = st.browW || 0.042;
  browLine(c, [0.02, -0.148 - rN + aN * 0.02], [0.18, -0.168 - rN - aN * 0.1], bw, st.hair);
  browLine(c, [0.275, -0.168 - rF - aF * 0.1], [0.385, -0.15 - rF + aF * 0.02], bw * 0.85, st.hair);
  // nose on the profile edge
  c.beginPath(); c.moveTo(0.415, -0.06); c.quadraticCurveTo(0.47, 0.06, 0.5, 0.115); c.quadraticCurveTo(0.47, 0.15, 0.4, 0.145); c.lineTo(0.38, 0.0); c.closePath(); c.fillStyle = sk; c.fill();
  c.beginPath(); c.moveTo(0.415, -0.06); c.quadraticCurveTo(0.47, 0.06, 0.5, 0.115); c.quadraticCurveTo(0.47, 0.15, 0.4, 0.145); c.strokeStyle = PAL.ink; c.lineWidth = L; c.stroke();
  c.beginPath(); c.arc(0.42, 0.115, 0.022, 0.4, 2.6); c.lineWidth = L * 0.6; c.stroke();
  mouth(c, fc.talk ? ex.m : ex.m, fc.talk ? fc.talk * (0.35 + 0.65 * Math.abs(Math.sin(t * 13.5))) * (0.55 + 0.45 * noise1(t * 6)) : 0, L);
  if (st.glasses) { c.strokeStyle = PAL.ink; c.lineWidth = L * 0.9; rr(c, 0.02, -0.08, 0.17, 0.12, 0.04); c.stroke(); rr(c, 0.27, -0.085, 0.12, 0.12, 0.04); c.stroke(); c.beginPath(); c.moveTo(0.19, -0.03); c.lineTo(0.27, -0.035); c.stroke(); c.beginPath(); c.moveTo(0.02, -0.04); c.lineTo(-0.12, -0.03); c.stroke(); }
  hairFront(c, st, L, t);
  c.restore();
}
// an eye: white almond, iris, and an upper lid that comes down over it (open 1 = wide awake, 0.5 = heavy-lidded)
// tilt > 0 drops the outer corner of the lid (sad), < 0 drops the inner corner (angry / smug)
function eye(c, x, y, sx, open, look, L, st, tilt = 0, inner = 1) {
  const w = 0.08 * sx, h0 = 0.056 * Math.min(1.15, Math.max(open, 0.9));
  if (open < 0.12) { c.beginPath(); c.moveTo(x - w, y + 0.008); c.quadraticCurveTo(x, y + 0.032, x + w, y + 0.008); c.strokeStyle = PAL.ink; c.lineWidth = L * 1.2; c.lineCap = 'round'; c.stroke(); return; }
  const almond = () => { c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.2, y - h0 * 2, x + w, y - h0 * 0.15); c.quadraticCurveTo(x + w * 0.1, y + h0 * 1.5, x - w, y); c.closePath(); };
  // where the lid edge sits: from the top of the eye (closed) down to its middle; inner = +1 if the inner corner is on the right
  const cover = clamp(1 - open, 0, 0.85), ly = (side) => y - h0 * 0.95 + cover * h0 * 1.75 + side * tilt * h0 * 0.9;
  const lA = ly(inner), lB = ly(-inner);   // left / right ends of the lid edge
  c.save(); almond(); c.fillStyle = '#f7f1e6'; c.fill(); c.clip();
  const ix = x + look[0] * 0.03 * sx, iy = y - h0 * 0.12 + look[1] * 0.022;
  circ(c, ix, iy, 0.042 * Math.min(1, sx + 0.12)); c.fillStyle = st.eyes || '#3a2418'; c.fill();
  circ(c, ix, iy, 0.023 * Math.min(1, sx + 0.12)); c.fillStyle = '#120c10'; c.fill();
  circ(c, ix + 0.013, iy - 0.015, 0.0095); c.fillStyle = '#fff'; c.fill();
  // the lid (skin) over the top of the eye
  c.beginPath(); c.moveTo(x - w * 1.2, y - h0 * 3); c.lineTo(x + w * 1.2, y - h0 * 3); c.lineTo(x + w * 1.2, lB); c.lineTo(x - w * 1.2, lA); c.closePath(); c.fillStyle = mix(st.skin, '#4a2840', 0.12); c.fill();
  c.restore();
  // lash line along the lid edge (thick), the crease above, a soft lower line
  c.save(); almond(); c.clip(); c.beginPath(); c.moveTo(x - w * 1.2, lA); c.lineTo(x + w * 1.2, lB); c.strokeStyle = PAL.ink; c.lineWidth = L * 1.6; c.stroke(); c.restore();
  if (cover < 0.05) { c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.2, y - h0 * 2, x + w, y - h0 * 0.15); c.strokeStyle = PAL.ink; c.lineWidth = L * 1.4; c.lineCap = 'round'; c.stroke(); }
  c.beginPath(); c.moveTo(x - w * 0.8, y - h0 * 1.55 + cover * h0 * 0.6); c.quadraticCurveTo(x, y - h0 * 2.05 + cover * h0 * 0.6, x + w * 0.8, y - h0 * 1.15 + cover * h0 * 0.6); c.strokeStyle = rgba(PAL.ink, 0.5); c.lineWidth = L * 0.5; c.stroke();
  c.beginPath(); c.moveTo(x - w * 0.7, y + h0 * 0.35); c.quadraticCurveTo(x, y + h0 * 0.85, x + w * 0.8, y + h0 * 0.2); c.strokeStyle = rgba(PAL.ink, 0.55); c.lineWidth = L * 0.45; c.stroke();
}
function browLine(c, a, b, w, col) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.018, b[0], b[1]); c.strokeStyle = shade(col, -0.1); c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
function mouth(c, type, open, L) {
  c.strokeStyle = PAL.ink; c.lineWidth = L * 1.05; c.lineCap = 'round';
  const q = (a, m, b) => { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke(); };
  if (open > 0.06) { // talking
    const w = 0.07, h = 0.012 + 0.06 * open, cy = 0.285 + (type === 'smirk' ? -0.008 : 0);
    c.beginPath(); c.ellipse(0.255, cy, w, h, type === 'smirk' ? -0.15 : 0, 0, TAU); c.fillStyle = '#3b1a22'; c.fill(); c.stroke();
    c.save(); c.clip(); ell(c, 0.26, cy + h * 0.9, w * 0.6, h * 0.5); c.fillStyle = '#c95d5d'; c.fill(); c.restore();
    return;
  }
  if (type === 'smile') q([0.17, 0.25], [0.25, 0.315], [0.335, 0.24]);
  else if (type === 'smirk') { q([0.18, 0.285], [0.26, 0.295], [0.335, 0.235]); c.beginPath(); c.moveTo(0.335, 0.235); c.lineTo(0.345, 0.225); c.stroke(); }
  else if (type === 'grin') { c.beginPath(); c.moveTo(0.16, 0.25); c.quadraticCurveTo(0.25, 0.36, 0.34, 0.24); c.closePath(); c.fillStyle = '#3b1a22'; c.fill(); c.stroke(); c.save(); c.clip(); c.fillStyle = '#fbf6ea'; c.fillRect(0.15, 0.24, 0.2, 0.03); c.restore(); }
  else if (type === 'down') q([0.18, 0.29], [0.25, 0.27], [0.325, 0.292]);
  else if (type === 'frown') q([0.18, 0.305], [0.25, 0.262], [0.325, 0.305]);
  else if (type === 'o') { ell(c, 0.26, 0.29, 0.035, 0.048); c.fillStyle = '#3b1a22'; c.fill(); c.stroke(); }
  else q([0.18, 0.28], [0.25, 0.285], [0.325, 0.275]);
}
// hair in front of the head; style.hairStyle: aarav (wavy, swept), curly, long, bun, neat, bald
function hairFront(c, st, L, t) {
  const hc = st.hair, hs = S(hc, 0.45), hl = mix(hc, '#9fb3d6', 0.22);
  const hs2 = st.hairStyle;
  if (hs2 === 'aarav') {
    const pts = [[-0.44, 0.07], [-0.48, -0.22], [-0.38, -0.5], [-0.12, -0.66], [0.18, -0.68], [0.42, -0.56], [0.53, -0.36], [0.38, -0.31], [0.24, -0.36], [0.1, -0.27], [-0.04, -0.31], [-0.2, -0.2], [-0.27, 0.0], [-0.36, 0.14]];
    cel(c, () => blob(c, pts), hc, hs, [-0.05, 0.05], L);
    c.strokeStyle = hl; c.lineWidth = L * 0.8; c.lineCap = 'round';
    for (const [a, b, m] of [[[-0.2, -0.55], [0.3, -0.5], [0.05, -0.62]], [[-0.3, -0.38], [0.1, -0.38], [-0.12, -0.47]]]) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke(); }
  } else if (hs2 === 'curly') {
    const pts = []; for (let i = 0; i < 18; i++) { const a = Math.PI * 0.92 + i / 17 * Math.PI * 1.12, r = 0.56 + (i % 2) * 0.07; pts.push([Math.cos(a) * r * 0.95 + 0.02, Math.sin(a) * r * 0.9 - 0.12]); }
    pts.push([0.36, -0.3], [0.1, -0.28], [-0.2, -0.16], [-0.3, 0.06], [-0.4, 0.08]);
    cel(c, () => blob(c, pts), hc, hs, [-0.05, 0.05], L);
  } else if (hs2 === 'long' || hs2 === 'bun') {
    const pts = [[-0.44, 0.1], [-0.47, -0.25], [-0.34, -0.52], [-0.08, -0.65], [0.22, -0.64], [0.44, -0.48], [0.48, -0.28], [0.36, -0.36], [0.16, -0.42], [-0.04, -0.34], [-0.22, -0.16], [-0.3, 0.1], [-0.34, 0.26]];
    cel(c, () => blob(c, pts), hc, hs, [-0.05, 0.05], L);
    if (st.grey) { c.strokeStyle = st.grey; c.lineWidth = L * 1.6; c.beginPath(); c.moveTo(0.3, -0.56); c.quadraticCurveTo(0.05, -0.55, -0.15, -0.4); c.stroke(); }
  } else if (hs2 === 'neat') {
    const pts = [[-0.43, 0.04], [-0.46, -0.25], [-0.33, -0.5], [-0.05, -0.62], [0.25, -0.6], [0.44, -0.44], [0.47, -0.3], [0.3, -0.34], [0.05, -0.4], [-0.18, -0.24], [-0.28, -0.02], [-0.36, 0.12]];
    cel(c, () => blob(c, pts), hc, hs, [-0.05, 0.05], L);
    if (st.grey) { c.fillStyle = st.grey; ell(c, -0.3, -0.05, 0.06, 0.12); c.fill(); }
  }
}
function hairBack(c, J, st, u, lw, po) {
  const hu = 16 * u;
  c.save(); c.translate(J.head[0], J.head[1]); c.rotate(J.lean + (po.headTilt || 0)); c.scale(hu, hu);
  const hc = st.hair, L = lw / hu;
  if (st.hairStyle === 'long') cel(c, () => blob(c, [[-0.46, -0.3], [-0.2, -0.55], [0.2, -0.5], [0.12, 0.4], [0.0, 1.05], [-0.42, 1.1], [-0.58, 0.6], [-0.55, 0.1]]), hc, S(hc, 0.45), [-0.05, 0.04], L);
  else { cel(c, () => circ(c, -0.4, -0.42, 0.2), hc, S(hc, 0.45), [-0.04, 0.04], L); }
  c.restore();
}

// ---------------------------------------------------------------- phone + chat UI
// a phone (portrait) centred at (x, y), w wide; draw(c, sw, sh) paints the screen in its own coords (0..sw, 0..sh)
export function phone(c, x, y, w, draw, o = {}) {
  const h = w * 2.05, b = w * 0.045;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0);
  if (o.shadow !== false) { c.save(); c.translate(w * 0.05, w * 0.08); rr(c, -w / 2, -h / 2, w, h, w * 0.12); c.fillStyle = 'rgba(5,8,20,0.35)'; c.fill(); c.restore(); }
  rr(c, -w / 2, -h / 2, w, h, w * 0.12); c.fillStyle = '#0c1222'; c.fill(); c.lineWidth = Math.max(2, w * 0.012); c.strokeStyle = PAL.ink; c.stroke();
  rr(c, -w / 2 + b * 0.4, -h / 2 + b * 0.4, w - b * 0.8, h - b * 0.8, w * 0.11); c.strokeStyle = 'rgba(160,180,210,0.35)'; c.lineWidth = 1.2; c.stroke();
  c.save(); rr(c, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, w * 0.09); c.clip(); c.translate(-w / 2 + b, -h / 2 + b);
  draw(c, w - 2 * b, h - 2 * b);
  c.restore();
  rr(c, -w * 0.12, -h / 2 + b * 1.6, w * 0.24, b * 1.3, b); c.fillStyle = '#05070f'; c.fill();   // the camera notch
  c.restore();
}
// a chat bubble at (x, y) (its top-left; right-aligned when side = 'r'), returns its height. pop 0..1 scales it in.
export function chat(c, x, y, text, o = {}) {
  const size = o.size || 15, max = o.max || 200, pad = size * 0.6, side = o.side || 'l', pop = o.pop ?? 1;
  if (pop <= 0) return 0;
  c.save(); c.font = `${o.weight || 700} ${size}px ${FONT}`;
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const wd of words) { const tt = cur ? cur + ' ' + wd : wd; if (c.measureText(tt).width > max && cur) { lines.push(cur); cur = wd; } else cur = tt; } if (cur) lines.push(cur);
  const tw = Math.max(...lines.map(l => c.measureText(l).width), o.name ? c.measureText(o.name).width * 0.8 : 0), lh = size * 1.32;
  const bw = tw + pad * 2, bh = lines.length * lh + pad * 1.2 + (o.name ? size * 0.95 : 0) + (o.meta ? size * 0.7 : 0);
  const bx = side === 'r' ? x - bw : x;
  const k = ease.back(clamp(pop)); c.translate(side === 'r' ? x : x, y + bh / 2); c.scale(k, k); c.translate(-(side === 'r' ? x : x), -(y + bh / 2));
  c.globalAlpha *= clamp(pop * 2);
  rr(c, bx, y, bw, bh, size * 0.8); c.fillStyle = o.bg || (side === 'r' ? PAL.teal : '#26365a'); c.fill();
  if (o.outline !== false) { c.lineWidth = o.lw || 2; c.strokeStyle = PAL.ink; c.stroke(); }
  // the little tail
  c.beginPath(); if (side === 'r') { c.moveTo(bx + bw - 4, y + bh - 12); c.lineTo(bx + bw + 7, y + bh); c.lineTo(bx + bw - 16, y + bh - 3); } else { c.moveTo(bx + 4, y + bh - 12); c.lineTo(bx - 7, y + bh); c.lineTo(bx + 16, y + bh - 3); } c.closePath(); c.fillStyle = o.bg || (side === 'r' ? PAL.teal : '#26365a'); c.fill();
  let ty = y + pad * 0.6;
  c.textBaseline = 'top'; c.textAlign = 'left';
  if (o.name) { c.font = `800 ${size * 0.78}px ${FONT}`; c.fillStyle = o.nameCol || PAL.amber; c.fillText(o.name, bx + pad, ty); ty += size * 0.95; c.font = `${o.weight || 700} ${size}px ${FONT}`; }
  c.fillStyle = o.col || PAL.creamL; for (const l of lines) { c.fillText(l, bx + pad, ty + 1); ty += lh; }
  if (o.meta) { c.font = `600 ${size * 0.58}px ${FONT}`; c.textAlign = 'right'; c.fillStyle = o.metaCol || 'rgba(243,233,210,0.7)'; c.fillText(o.meta, bx + bw - pad * 0.7, y + bh - size * 0.85); }
  c.restore();
  return bh;
}
// a round avatar with initials
export function avatar(c, x, y, r, name, col, o = {}) {
  c.save(); c.globalAlpha *= o.alpha ?? 1; circ(c, x, y, r); c.fillStyle = col; c.fill(); c.lineWidth = Math.max(1.5, r * 0.12); c.strokeStyle = o.ring || PAL.ink; c.stroke();
  c.font = `800 ${r * 0.95}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = o.txt || PAL.creamL; c.fillText(name, x, y + r * 0.06); c.restore();
}

// ---------------------------------------------------------------- texture + text
let paper = null;
// a subtle paper/print texture over the frame (fibres + soft blotches): "two-tone cel shading with subtle texture"
export function texture(c, T, amt = 1) {
  if (!paper) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const g = cv.getContext('2d'), r = rng(42);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, rr2 = 30 + r() * 90; g.fillStyle = rad(g, x, y, 0, rr2, [[0, `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.12)`], [1, 'rgba(128,128,128,0)']]); g.fillRect(x - rr2, y - rr2, rr2 * 2, rr2 * 2); }
    g.lineWidth = 0.6; for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512, a = r() * TAU, l = 3 + r() * 9; g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.08 + r() * 0.1})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    paper = c.createPattern(cv, 'repeat');
  }
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.22 * amt; paper.setTransform(new DOMMatrix().scale(0.75)); c.fillStyle = paper; c.fillRect(0, 0, W, H); c.restore();
}
// bold Devanagari text with an ink outline (titles, on-screen words)
export function words(c, text, x, y, size, o = {}) {
  c.save(); c.font = `${o.weight || 800} ${size}px ${FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const lines = Array.isArray(text) ? text : [text];
  lines.forEach((l, i) => { const yy = y + (i - (lines.length - 1) / 2) * size * (o.lh || 1.3); if (o.ol !== false) { c.strokeStyle = o.ol || PAL.ink; c.lineWidth = size * (o.olw ?? 0.18); c.strokeText(l, x, yy); } c.fillStyle = o.col || PAL.creamL; c.fillText(l, x, yy); });
  c.restore();
}
// the camera's "impact zoom": a quick punch-in at t0 that settles (returns a zoom multiplier)
export const impact = (t, t0, amt = 0.16) => { if (t < t0) return 1; const k = t - t0; return 1 + amt * Math.exp(-k * 7) * (k < 0.06 ? k / 0.06 : 1); };
// parallax: translate a layer by the camera's x offset times its depth (0 = fixed, 1 = moves with the world)
export function layer(c, depth, camX, draw) { c.save(); c.translate(-camX * depth, 0); draw(); c.restore(); }
