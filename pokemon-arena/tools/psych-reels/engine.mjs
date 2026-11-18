// The drawing kit for the reels: a cartoon character rig (with faces and expressions), scenery, light and effects.
// Everything is drawn in a 540 x 960 "logical" frame (the page scales it 2x to 1080 x 1920).
export const W = 540, H = 960;
export const OL = '#1a1222';                       // the outline colour of every cartoon shape
export const FONT = '"Nirmala UI", "Mangal", "Segoe UI", sans-serif';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- maths
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));                 // 0..1 progress of t through [a,b]
export const ease = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * TAU / 3) + 1
};
export const E = (t, a, b, f = ease.inOut) => f(seg(t, a, b));
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const noise1 = x => { const i = Math.floor(x), f = x - i, h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u) * 2 - 1; };

export function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); }
export const shade = (c, t) => t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t);
export function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }

// ---------------------------------------------------------------- basic shapes with a cartoon outline
export function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
export function ink(c, fill, lw = 3, ol = OL) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = ol; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); } }
export function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
export function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, TAU); }
export function poly(c, pts, close = true) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath(); }
// a smooth closed blob through points (quadratic curves through midpoints)
export function blob(c, pts) {
  c.beginPath(); const n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  const s = m(n - 1); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
  c.closePath();
}
// a thick stroked line drawn as outline + fill colour (cartoon limbs, poles, ropes)
export function thick(c, pts, w, col, lw = 3, ol = OL) {
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (lw) { c.strokeStyle = ol; c.lineWidth = w + lw * 2; c.stroke(); }
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
export function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
export function rad(c, x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }

// ---------------------------------------------------------------- the camera
// cam(c, {x, y, z, r}) looks at (x, y) of the scene with zoom z (and a tilt r): call inside save/restore
export function cam(c, o = {}) {
  const z = o.z ?? 1, x = o.x ?? W / 2, y = o.y ?? H / 2;
  c.translate(W / 2, H / 2); if (o.r) c.rotate(o.r); c.scale(z, z); c.translate(-x, -y);
}
export function shake(t, amt, speed = 30) { return [noise1(t * speed) * amt, noise1(t * speed + 99) * amt]; }

// ---------------------------------------------------------------- the cartoon character
// toon(c, {x, y, h, face, t, pose, expr, look, style, talk, ...})
//   x, y   : where the feet touch the ground          h: height in pixels
//   face   : 1 right, -1 left, 0 front (anything between = turning)
//   pose   : { walk: phase, amp, run, lean, crouch, sit, armF:[sh,el], armB:[sh,el], legF:[hip,knee], legB:[hip,knee],
//              headTilt, headY, slump, breathe }   (angles in radians, 0 = hanging down, + = forward)
//   expr   : 'neutral' 'happy' 'joy' 'sad' 'cry' 'scared' 'shock' 'angry' 'tired' 'worried' 'smirk' 'determined' 'blank'
//   look   : [lx, ly] where the pupils look, -1..1
//   style  : { skin, hair, hairStyle, shirt, pants, shoes, top, beard, kid, old, crown, cap, mask, faceless, pack, ... }
export const STYLE = { skin: '#f2c49b', hair: '#3b2a26', hairStyle: 'short', shirt: '#4d79c7', pants: '#2f3550', shoes: '#2a2026', top: 'shirt', beard: null, eyes: '#2a1d1a' };
export function toon(c, o) {
  const S = { ...STYLE, ...(o.style || {}) }, P = o.pose || {}, t = o.t || 0;
  const h = o.h || 200, kid = S.kid ? 1 : 0, old = S.old ? 1 : 0;
  const f = o.face ?? 1, dir = f < 0 ? -1 : 1, turn = Math.abs(f);
  const lw = Math.max(1.6, h * 0.016);
  // proportions (chibi: big head)
  const R = h * (kid ? 0.225 : 0.2);                    // head radius
  const legL = h * (kid ? 0.125 : 0.14), armL = h * (kid ? 0.1 : 0.115);
  let hipY = -(legL * 2) - h * 0.01;
  const torsoH = h * (kid ? 0.22 : 0.27), shW = h * lerp(0.3, 0.22, turn) * (kid ? 0.9 : 1), hipW = h * lerp(0.27, 0.2, turn) * (kid ? .9 : 1);
  const legW = h * (kid ? 0.08 : 0.085), armW = h * (kid ? 0.066 : 0.07);
  // pose
  let aF = P.armF || [0.08, 0.15], aB = P.armB || (turn < 0.5 ? [0.08, 0.15] : [-0.05, 0.15]), lF = P.legF || [0.04, 0], lB = P.legB || [-0.04, 0];
  let lean = (P.lean || 0) + old * 0.12, bob = 0, headTilt = P.headTilt || 0;
  if (P.walk != null) {
    const ph = P.walk, A = (P.amp ?? 1) * (P.run ? 1.45 : 1);
    lF = [Math.sin(ph) * 0.5 * A, -Math.max(0, Math.cos(ph)) * (P.run ? 1.3 : 0.8) * A];
    lB = [Math.sin(ph + Math.PI) * 0.5 * A, -Math.max(0, Math.cos(ph + Math.PI)) * (P.run ? 1.3 : 0.8) * A];
    const elb = P.run ? 1.5 : 0.25;
    if (!P.armF) aF = [-Math.sin(ph) * 0.55 * A, elb];
    if (!P.armB) aB = [Math.sin(ph) * 0.55 * A, elb];
    bob = Math.abs(Math.sin(ph)) * h * (P.run ? 0.04 : 0.02);
    lean += P.run ? 0.22 : 0.04;
  }
  if (P.crouch) hipY += P.crouch * legL * 0.6;
  if (P.sit) { lF = [1.45, -1.45]; lB = [1.4, -1.45]; }
  const breathe = (P.breathe ?? 1) * Math.sin(t * 2.1) * h * 0.004;
  const slump = P.slump || 0;
  c.save();
  c.translate(o.x, o.y + (o.lift || 0));
  if (o.rot) c.rotate(o.rot);
  if (o.sq) c.scale(1 + o.sq, 1 - o.sq);
  if (dir < 0) c.scale(-1, 1);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  // ground shadow
  if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,0.28)'; ell(c, 0, 0, h * 0.2, h * 0.035); c.fill(); }
  c.translate(0, bob);
  const legX = h * lerp(0.055, 0.015, turn);
  const leg = (side, [hip, knee], col) => {
    const x0 = side * legX, y0 = hipY;
    const x1 = x0 + Math.sin(hip) * legL, y1 = y0 + Math.cos(hip) * legL, a2 = hip + knee;
    const x2 = x1 + Math.sin(a2) * legL, y2 = y1 + Math.cos(a2) * legL;
    thick(c, [[x0, y0], [x1, y1], [x2, y2]], legW, col, lw);
    // the shoe points forward
    c.save(); c.translate(x2, y2); c.rotate(P.sit ? 0 : -(a2) * 0.5);
    ell(c, h * 0.03 * (turn > .3 ? 1 : 0), h * 0.008, h * (turn > .3 ? 0.066 : 0.05), h * 0.036); ink(c, S.shoes, lw);
    c.restore();
  };
  const arm = (side, [sh, el], front) => {
    const fv = turn < 0.5, x0 = fv ? side * (shW / 2 + armW * 0.05) : side * (shW / 2 - armW * 0.35) * 0.25, y0 = -torsoH + armW * 0.7;
    const sx = fv ? side : 1;
    const x1 = x0 + Math.sin(sh) * armL * sx, y1 = y0 + Math.cos(sh) * armL, a2 = sh + el;
    const x2 = x1 + Math.sin(a2) * armL * sx, y2 = y1 + Math.cos(a2) * armL;
    const sleeve = S.top === 'suit' ? S.jacket || S.shirt : S.top === 'robe' ? S.robe || S.shirt : S.shirt;
    thick(c, [[x0, y0], [x1, y1]], armW * 1.08, sleeve, lw);
    thick(c, [[x1, y1], [x2, y2]], armW, S.bareArms ? S.skin : sleeve, lw);
    circ(c, x2, y2, h * 0.042); ink(c, S.skin, lw);
    if (front && o.hold) { c.save(); c.translate(x2, y2); c.rotate(-a2); o.hold(c, h); c.restore(); }
    return [x2, y2];
  };
  // the back pack sits behind everything
  const torsoTop = -torsoH;
  // --- legs
  c.save(); c.translate(0, 0);
  // (body frame: origin at the hips, leaning)
  if (S.top !== 'robe') { leg(-1, lB, shade(S.pants, -0.12)); leg(1, lF, S.pants); }
  else { leg(-1, lB, shade(S.pants, -0.12)); leg(1, lF, S.pants); }
  c.restore();
  c.save(); c.translate(0, hipY); c.rotate(lean + slump * 0.35);
  // pack (behind)
  if (S.pack) {
    const pk = S.pack, pw = h * (0.14 + pk * 0.09), ph = h * (0.2 + pk * 0.13);
    const px = turn > .5 ? -shW / 2 - pw * 0.55 : -pw / 2, py = torsoTop - h * 0.02 - (ph - torsoH) * 0.75;
    rr(c, px, py, pw, ph, pw * 0.3); ink(c, S.packColor || '#7a5236', lw);
    c.save(); rr(c, px, py, pw, ph, pw * 0.3); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px, py + ph * 0.55, pw, ph);
    if (S.packGlow) { c.fillStyle = rad(c, px + pw / 2, py + ph * 0.4, 0, pw, [[0, rgba(S.packGlow, 0.55)], [1, rgba(S.packGlow, 0)]]); c.fillRect(px, py, pw, ph); }
    c.restore();
    rr(c, px + pw * 0.15, py + ph * 0.18, pw * 0.7, ph * 0.22, 6); ink(c, shade(S.packColor || '#7a5236', 0.12), lw * .8);
  }
  // cape / cloak behind
  if (S.cape) { poly(c, [[-shW * .45, torsoTop + 4], [shW * .45, torsoTop + 4], [shW * .75 - turn * 20, -hipY - 6], [-shW * .85 - turn * 30, -hipY - 6]]); ink(c, S.cape, lw); }
  // back arm (in a side view it is behind the body)
  if (turn >= 0.5) arm(-1, aB, false);
  // hips / shorts
  rr(c, -hipW / 2, -h * 0.02, hipW, h * 0.07, h * 0.03); ink(c, S.pants, lw);
  // torso
  const tw = shW, rc = h * 0.08, tpath = () => { c.beginPath(); c.moveTo(-tw / 2, torsoTop + rc); c.quadraticCurveTo(-tw / 2, torsoTop, -tw / 2 + rc, torsoTop); c.lineTo(tw / 2 - rc, torsoTop); c.quadraticCurveTo(tw / 2, torsoTop, tw / 2, torsoTop + rc); c.quadraticCurveTo(tw / 2 + h * 0.025, torsoTop + torsoH * 0.65, hipW / 2, h * 0.025); c.quadraticCurveTo(0, h * 0.045, -hipW / 2, h * 0.025); c.quadraticCurveTo(-tw / 2 - h * 0.025, torsoTop + torsoH * 0.65, -tw / 2, torsoTop + rc); c.closePath(); };
  if (S.top === 'robe') { // long robe down to the ankles
    c.beginPath(); c.moveTo(-tw / 2, torsoTop + 8); c.lineTo(tw / 2, torsoTop + 8); c.lineTo(tw * 0.8, -hipY - h * 0.05); c.lineTo(-tw * 0.8, -hipY - h * 0.05); c.closePath(); ink(c, S.robe || S.shirt, lw);
    c.fillStyle = S.trim || '#f4ecd8'; c.fillRect(-tw * 0.8, -hipY - h * 0.08, tw * 1.6, h * 0.03); c.fillRect(-h * 0.02, torsoTop + 8, h * 0.04, -hipY - torsoTop - h * 0.1);
  }
  tpath(); ink(c, S.top === 'robe' ? S.robe || S.shirt : S.top === 'suit' ? S.jacket || S.shirt : S.shirt, lw);
  c.save(); tpath(); c.clip();
  if (S.stripes) { c.fillStyle = S.stripes; for (let yy = torsoTop + 6; yy < h * 0.05; yy += h * 0.045) c.fillRect(-tw, yy, tw * 2, h * 0.02); }
  if (S.top === 'suit') { // shirt V, tie, lapels
    poly(c, [[-h * 0.04, torsoTop], [h * 0.04, torsoTop], [0, torsoTop + h * 0.12]]); ink(c, S.shirtIn || '#f3f1ea', 0);
    poly(c, [[-h * 0.012, torsoTop + h * 0.01], [h * 0.012, torsoTop + h * 0.01], [h * 0.016, torsoTop + h * 0.1], [0, torsoTop + h * 0.125], [-h * 0.016, torsoTop + h * 0.1]]); ink(c, S.tie || '#b23a48', lw * .6);
    c.strokeStyle = shade(S.jacket || S.shirt, -0.3); c.lineWidth = lw; c.beginPath(); c.moveTo(-h * 0.04, torsoTop); c.lineTo(0, torsoTop + h * 0.15); c.lineTo(h * 0.04, torsoTop); c.stroke();
  }
  if (S.apron) { rr(c, -tw * 0.35, torsoTop + h * 0.04, tw * 0.7, torsoH, 6); ink(c, S.apron, lw * .7); }
  // cel shading on the shadow side
  c.fillStyle = 'rgba(30,10,40,0.20)'; c.fillRect(tw * 0.12, torsoTop - 5, tw, torsoH + 20);
  if (o.rim) { c.strokeStyle = o.rim; c.lineWidth = lw * 2.2; c.beginPath(); c.moveTo(-tw / 2 + 2, torsoTop + 10); c.lineTo(-hipW / 2 + 2, 0); c.stroke(); }
  c.restore();
  if (S.pack) { thick(c, [[-tw * 0.15 * (turn > .5 ? 1 : 2), torsoTop + 2], [-tw * 0.12, torsoTop + torsoH * 0.75]], h * 0.025, shade(S.packColor || '#7a5236', -0.2), lw * .7); if (turn < .5) thick(c, [[tw * 0.3, torsoTop + 2], [tw * 0.24, torsoTop + torsoH * 0.75]], h * 0.025, shade(S.packColor || '#7a5236', -0.2), lw * .7); }
  if (S.medal) { circ(c, 0, torsoTop + torsoH * 0.45, h * 0.025); ink(c, '#f2c94c', lw * .7); }
  // head (with neck)
  c.save();
  c.translate(0, torsoTop + breathe);
  rr(c, -h * 0.03, -h * 0.05, h * 0.06, h * 0.07, 4); ink(c, shade(S.skin, -0.12), lw);
  c.translate(h * 0.01 * turn, -R * 0.8 + (P.headY || 0) + slump * R * 0.25);
  c.rotate(headTilt + slump * 0.3);
  head(c, R, lw, S, o, turn, t);
  c.restore();
  // front arm(s)
  if (turn < 0.5) arm(-1, aB, false);
  arm(1, aF, true);
  c.restore();
  c.restore();
}

// the head, drawn around its centre; R = radius
function head(c, R, lw, S, o, turn, t) {
  const fx = turn * R * 0.33;   // the face moves towards where it looks
  const ex = o.expr || 'neutral';
  // hair at the back
  if (S.hairStyle === 'long' || S.hairStyle === 'bun') { ell(c, -R * 0.1 * turn, R * 0.25, R * 1.08, R * 1.15); ink(c, S.hair, lw); }
  // ears
  if (turn < 0.6) { for (const s of [-1, 1]) { ell(c, s * R * 0.98 + fx * 0.2, R * 0.08, R * 0.17, R * 0.22); ink(c, S.skin, lw); } }
  else { ell(c, -R * 0.12, R * 0.08, R * 0.16, R * 0.22); ink(c, S.skin, lw); }
  // the head
  const hp = () => { c.beginPath(); c.ellipse(0, 0, R, R * 1.02, 0, 0, TAU); };
  hp(); ink(c, S.skin, lw);
  c.save(); hp(); c.clip();
  c.fillStyle = 'rgba(80,20,60,0.13)'; ell(c, R * 1.25, R * 0.3, R * 0.72, R * 1.4); c.fill(); c.fillStyle = 'rgba(255,255,255,0.13)'; ell(c, -R * 0.45, -R * 0.55, R * 0.35, R * 0.2, -0.5); c.fill();
  if (S.dirt) { c.fillStyle = 'rgba(70,50,40,0.18)'; ell(c, -R * 0.4, R * 0.5, R * 0.3, R * 0.2); c.fill(); }
  c.restore();
  if (S.faceless) { hair(c, R, lw, S, turn); hats(c, R, lw, S, t); return; }
  // blush
  if (S.blush || ex === 'joy' || ex === 'happy') { c.fillStyle = 'rgba(240,110,110,0.30)'; ell(c, fx - R * 0.5 + turn * R * .15, R * 0.38, R * 0.17, R * 0.1); c.fill(); ell(c, fx + R * 0.5, R * 0.38, R * 0.17, R * 0.1); c.fill(); }
  if (S.beard) { c.beginPath(); c.moveTo(-R * 0.92, R * 0.05); c.quadraticCurveTo(-R * 0.9, R * 1.1 + (S.beardLen || 0) * R, fx, R * (1.2 + (S.beardLen || 0))); c.quadraticCurveTo(R * 0.9 + fx * .3, R * 1.1 + (S.beardLen || 0) * R, R * 0.92, R * 0.05); c.quadraticCurveTo(R * 0.6, R * 0.55, fx, R * 0.5); c.quadraticCurveTo(-R * 0.6, R * 0.55, -R * 0.92, R * 0.05); ink(c, S.beard, lw); }
  if (!S.mask) face(c, R, lw, S, o, turn, t, fx, ex);
  hair(c, R, lw, S, turn);
  if (S.mask) mask(c, R, lw, S.mask, S.maskColor, t, o.maskOff || 0);
  hats(c, R, lw, S, t);
}

function face(c, R, lw, S, o, turn, t, fx, ex) {
  const look = o.look || [0.25 * Math.sign(o.face ?? 1) * turn, 0];
  const blink = !o.noBlink && ((t + (o.blinkSeed || 0)) % 3.7) < 0.13;
  const eyeY = -R * 0.02, sp = R * lerp(0.4, 0.3, turn), ew = R * 0.15, eh = R * 0.2;
  const wide = ex === 'shock' || ex === 'scared' ? 1.25 : 1;
  // eyes
  for (const s of [-1, 1]) {
    const far = turn > 0.3 && s < 0, sc = far ? 0.82 : 1, x = fx + s * sp * (far ? 0.85 : 1), y = eyeY;
    if (blink || ex === 'closed' || ex === 'joy') {
      c.strokeStyle = OL; c.lineWidth = lw * 1.3; c.beginPath();
      if (ex === 'joy') c.arc(x, y + eh * 0.3, ew * sc, Math.PI * 1.15, Math.PI * 1.85); else c.arc(x, y - eh * 0.2, ew * sc, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke(); continue;
    }
    ell(c, x, y, ew * sc * wide, eh * sc * wide); ink(c, '#ffffff', lw);
    const pr = R * 0.085 * sc * (wide > 1 ? 0.75 : 1) * (S.kid ? 1.15 : 1);
    const px = x + look[0] * ew * 0.45, py = y + look[1] * eh * 0.4 + (ex === 'sad' || ex === 'cry' ? eh * 0.2 : 0);
    circ(c, px, py, pr); c.fillStyle = S.eyes; c.fill();
    circ(c, px - pr * 0.35, py - pr * 0.4, pr * 0.38); c.fillStyle = '#fff'; c.fill();
    // lids
    let lid = { tired: 0.5, sad: 0.35, cry: 0.35, angry: 0.3, determined: 0.25, blank: 0.45, worried: 0.15, smirk: 0.3 }[ex] || 0;
    if (o.lid != null) lid = o.lid;
    if (lid) {
      c.save(); ell(c, x, y, ew * sc * wide + .5, eh * sc * wide + .5); c.clip();
      const tilt = (ex === 'sad' || ex === 'cry' || ex === 'worried') ? s * 0.3 : (ex === 'angry' || ex === 'determined') ? -s * 0.4 : 0;
      c.translate(x, y - eh * sc); c.rotate(tilt); c.fillStyle = shade(S.skin, -0.05); c.fillRect(-ew * 2, -eh * 2, ew * 4, eh * 2 + eh * 2 * lid * sc);
      c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); c.moveTo(-ew * 2, eh * 2 * lid * sc); c.lineTo(ew * 2, eh * 2 * lid * sc); c.stroke();
      c.restore();
    }
  }
  // brows
  const bA = { angry: 0.45, determined: 0.3, sad: -0.4, cry: -0.45, worried: -0.35, scared: -0.3, shock: -0.1, happy: -0.05, smirk: 0.15 }[ex] || 0;
  const bY = { shock: -0.12, scared: -0.08, happy: -0.05, joy: -0.06 }[ex] || 0;
  for (const s of [-1, 1]) {
    const far = turn > 0.3 && s < 0, x = fx + s * sp * (far ? 0.85 : 1), y = eyeY - eh * 1.55 + bY * R;
    const tilt = -s * bA * (ex === 'smirk' && s < 0 ? -0.5 : 1);
    c.save(); c.translate(x, y); c.rotate(tilt); c.strokeStyle = S.brow || shade(S.hair, -0.1); c.lineWidth = R * 0.085; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-ew * 0.95, ex === 'happy' ? 2 : 0); c.quadraticCurveTo(0, -R * 0.06, ew * 0.95, ex === 'happy' ? 2 : 0); c.stroke(); c.restore();
  }
  // nose
  c.strokeStyle = shade(S.skin, -0.35); c.lineWidth = lw; c.beginPath();
  if (turn > 0.4) { c.moveTo(fx + R * 0.12, R * 0.08); c.quadraticCurveTo(fx + R * 0.32, R * 0.25, fx + R * 0.1, R * 0.28); }
  else { c.arc(fx, R * 0.2, R * 0.07, Math.PI * 0.1, Math.PI * 0.9); }
  c.stroke();
  // mouth
  const mx = fx + turn * R * 0.08, my = R * 0.5;
  let m = { neutral: 'flat2', happy: 'smile', joy: 'grin', sad: 'frown', cry: 'wail', scared: 'wavy', shock: 'o', angry: 'grit', tired: 'flat', worried: 'wavy', smirk: 'smirk', determined: 'flat', blank: 'flat' }[ex] || 'flat2';
  if (o.mouth) m = o.mouth;
  let open = 0;
  if (o.talk) open = (0.35 + 0.65 * Math.abs(Math.sin(t * 11) * Math.sin(t * 6.7 + 1))) * (typeof o.talk === 'number' ? o.talk : 1);
  c.strokeStyle = OL; c.lineWidth = lw * 1.2; c.lineCap = 'round';
  const mw = R * 0.22;
  if (open > 0.05 || m === 'o' || m === 'wail' || m === 'grin') {
    const oh = m === 'o' ? R * 0.16 : m === 'wail' ? R * 0.14 : m === 'grin' ? R * 0.2 : R * 0.04 + open * R * 0.16;
    const ow = m === 'o' ? R * 0.1 : m === 'grin' ? mw * 1.2 : mw * 0.85;
    c.beginPath();
    if (m === 'grin') { c.moveTo(mx - ow, my - oh * 0.3); c.lineTo(mx + ow, my - oh * 0.3); c.quadraticCurveTo(mx + ow, my + oh, mx, my + oh); c.quadraticCurveTo(mx - ow, my + oh, mx - ow, my - oh * 0.3); }
    else if (m === 'wail') { c.moveTo(mx - ow, my + oh * 0.6); c.quadraticCurveTo(mx, my - oh * 1.2, mx + ow, my + oh * 0.6); c.closePath(); }
    else c.ellipse(mx, my, ow, oh / 2 + 1, 0, 0, TAU);
    ink(c, '#5a1f2b', lw);
    c.save(); c.clip(); c.fillStyle = '#e46f7d'; ell(c, mx, my + oh * 0.55, ow * 0.7, oh * 0.4); c.fill(); if (m === 'grin') { c.fillStyle = '#fff'; c.fillRect(mx - ow, my - oh * 0.35, ow * 2, oh * 0.28); } c.restore();
  } else if (m === 'smile') { c.beginPath(); c.moveTo(mx - mw, my - R * 0.04); c.quadraticCurveTo(mx, my + R * 0.16, mx + mw, my - R * 0.04); c.stroke(); }
  else if (m === 'frown') { c.beginPath(); c.moveTo(mx - mw * 0.8, my + R * 0.06); c.quadraticCurveTo(mx, my - R * 0.1, mx + mw * 0.8, my + R * 0.06); c.stroke(); }
  else if (m === 'wavy') { c.beginPath(); c.moveTo(mx - mw, my); for (let i = 1; i <= 4; i++) c.lineTo(mx - mw + i * mw / 2, my + (i % 2 ? -1 : 1) * R * 0.04); c.stroke(); }
  else if (m === 'grit') { rr(c, mx - mw, my - R * 0.06, mw * 2, R * 0.12, 3); ink(c, '#fff', lw); c.beginPath(); for (let i = 1; i < 4; i++) { c.moveTo(mx - mw + i * mw / 2, my - R * 0.06); c.lineTo(mx - mw + i * mw / 2, my + R * 0.06); } c.moveTo(mx - mw, my); c.lineTo(mx + mw, my); c.lineWidth = lw * .6; c.stroke(); }
  else if (m === 'smirk') { c.beginPath(); c.moveTo(mx - mw * 0.7, my + R * 0.02); c.quadraticCurveTo(mx + mw * 0.3, my + R * 0.06, mx + mw, my - R * 0.08); c.stroke(); }
  else if (m === 'flat2') { c.beginPath(); c.moveTo(mx - mw * 0.6, my); c.quadraticCurveTo(mx, my + R * 0.04, mx + mw * 0.6, my); c.stroke(); }
  else { c.beginPath(); c.moveTo(mx - mw * 0.6, my + R * 0.02); c.lineTo(mx + mw * 0.6, my + R * 0.02); c.stroke(); }
  // tears and sweat
  if (ex === 'cry' || o.tears) {
    c.fillStyle = 'rgba(140,200,255,0.9)';
    for (const s of [-1, 1]) {
      const x = fx + s * sp * (turn > .3 && s < 0 ? .85 : 1);
      c.strokeStyle = 'rgba(140,200,255,0.85)'; c.lineWidth = R * 0.07; c.beginPath(); c.moveTo(x, eyeY + eh * 0.9); c.lineTo(x + s * R * 0.03, eyeY + eh * 0.9 + R * 0.45); c.stroke();
      const d = (t * 1.3 + (s > 0 ? 0.5 : 0)) % 1; drop(c, x + s * R * 0.05, eyeY + eh + d * R * 0.9, R * 0.07, 1 - d);
    }
  }
  if (o.sweat || ex === 'scared') { const d = (t * 0.6) % 1; drop(c, -R * 0.75, -R * 0.35 + d * R * 0.5, R * 0.1, 1); }
}
export function drop(c, x, y, r, a = 1) {
  c.save(); c.globalAlpha *= a; c.beginPath(); c.moveTo(x, y - r * 2); c.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r); c.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 2); ink(c, '#9fd6ff', Math.max(1, r * 0.25)); c.restore();
}
function hair(c, R, lw, S, turn) {
  const st = S.hairStyle, col = S.hair;
  if (st === 'bald') return;
  if (st === 'old') { for (const s of [-1, 1]) { blob(c, [[s * R * 0.75, -R * 0.45], [s * R * 1.12, -R * 0.1], [s * R * 1.0, R * 0.4], [s * R * 0.8, R * 0.05]]); ink(c, col, lw); } return; }
  c.beginPath();
  c.moveTo(-R * 1.02, R * 0.1);
  c.bezierCurveTo(-R * 1.15, -R * 1.2, R * 1.15, -R * 1.25, R * 1.03, R * 0.05);
  if (st === 'messy' || st === 'kid') {
    const n = 6; for (let i = 0; i <= n; i++) { const a = i / n; c.lineTo(R * lerp(0.95, -0.95, a) + (i % 2 ? 0 : 6 * (st === 'messy' ? 1 : .5)), -R * (0.35 + (i % 2 ? 0.05 : 0.28) * Math.sin(a * Math.PI) + 0.1 * Math.sin(a * Math.PI))); }
  } else if (st === 'neat') { c.quadraticCurveTo(R * 0.9, -R * 0.6, R * 0.2, -R * 0.62); c.quadraticCurveTo(-R * 0.4, -R * 0.35, -R * 0.95, -R * 0.2); }
  else if (st === 'long' || st === 'bun') { c.quadraticCurveTo(R * 0.6, -R * 0.75, -R * 0.1, -R * 0.55); c.quadraticCurveTo(-R * 0.7, -R * 0.4, -R * 1.02, R * 0.1); }
  else { // short with a fringe
    c.quadraticCurveTo(R * 0.85, -R * 0.5, R * 0.5, -R * 0.52); c.quadraticCurveTo(R * 0.25, -R * 0.38, 0, -R * 0.55); c.quadraticCurveTo(-R * 0.35, -R * 0.4, -R * 0.62, -R * 0.5); c.quadraticCurveTo(-R * 0.9, -R * 0.3, -R * 1.02, R * 0.1);
  }
  c.closePath(); ink(c, col, lw);
  c.fillStyle = 'rgba(255,255,255,0.18)'; ell(c, -R * 0.3, -R * 0.78, R * 0.3, R * 0.08, -0.3); c.fill();
  if (st === 'kid') { c.beginPath(); c.moveTo(0, -R * 0.98); c.quadraticCurveTo(R * 0.1, -R * 1.4, R * 0.35, -R * 1.3); c.quadraticCurveTo(R * 0.1, -R * 1.2, R * 0.15, -R * 0.95); ink(c, col, lw); }
  if (st === 'bun') { circ(c, -R * 0.2, -R * 1.05, R * 0.35); ink(c, col, lw); }
}
function hats(c, R, lw, S, t) {
  if (S.crown) {
    const g = S.crown === true ? '#f2c230' : S.crown;
    poly(c, [[-R * 0.62, -R * 0.72], [-R * 0.7, -R * 1.35], [-R * 0.35, -R * 1.0], [0, -R * 1.5], [R * 0.35, -R * 1.0], [R * 0.7, -R * 1.35], [R * 0.62, -R * 0.72]]); ink(c, g, lw);
    c.fillStyle = 'rgba(255,255,255,0.35)'; poly(c, [[-R * 0.55, -R * 0.82], [-R * 0.6, -R * 1.2], [-R * 0.42, -R * 0.95]]); c.fill();
    for (const [x, y, col] of [[0, -R * 0.88, '#d94a5a'], [-R * 0.38, -R * 0.84, '#4aa3d9'], [R * 0.38, -R * 0.84, '#4ad98a']]) { circ(c, x, y, R * 0.09); ink(c, col, lw * .7); }
  }
  if (S.cap) { c.beginPath(); c.moveTo(-R * 0.95, -R * 0.4); c.quadraticCurveTo(0, -R * 1.45, R * 0.95, -R * 0.4); c.closePath(); ink(c, S.cap, lw); rr(c, -R * 0.2, -R * 0.55, R * 1.4, R * 0.16, 6); ink(c, shade(S.cap, -0.25), lw); circ(c, 0, -R * 0.85, R * 0.12); ink(c, '#e8c547', lw * .7); }
  if (S.beret) { ell(c, -R * 0.15, -R * 0.82, R * 0.9, R * 0.32, -0.15); ink(c, S.beret, lw); circ(c, -R * 0.15, -R * 1.15, R * 0.07); ink(c, S.beret, lw * .6); }
  if (S.headband) { rr(c, -R * 1.0, -R * 0.55, R * 2.0, R * 0.2, 4); ink(c, S.headband, lw); poly(c, [[R * 0.4, -R * 0.6], [R * 0.6, -R * 1.5], [R * 0.75, -R * 0.6]]); ink(c, '#f4ecd8', lw * .8); }
}

// a theatre mask (worn, or held): type 'happy' 'success' 'strong' 'confident' 'sad' 'blank' 'cracked'
export function mask(c, R, lw, type, col, t = 0, off = 0) {
  c.save(); c.translate(0, -off * R * 0.3); c.rotate(off * 0.3);
  const C = col || { happy: '#ffd166', success: '#7fd1ff', strong: '#ff8a65', confident: '#c39bff', sad: '#9aa5b8', blank: '#efe6dc', cracked: '#efe6dc' }[type] || '#efe6dc';
  c.beginPath(); c.moveTo(-R * 0.92, -R * 0.45); c.quadraticCurveTo(0, -R * 0.82, R * 0.92, -R * 0.45); c.quadraticCurveTo(R * 0.95, R * 0.55, 0, R * 0.98); c.quadraticCurveTo(-R * 0.95, R * 0.55, -R * 0.92, -R * 0.45); c.closePath();
  ink(c, C, lw);
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, -R * 0.35, -R * 0.35, R * 0.4, R * 0.18, -0.4); c.fill(); c.fillStyle = 'rgba(0,0,0,0.12)'; ell(c, R * 0.6, R * 0.3, R * 0.5, R * 0.9); c.fill(); c.restore();
  // eye holes and painted face
  c.fillStyle = OL;
  const eye = (s, k) => { c.save(); c.translate(s * R * 0.36, -R * 0.08); ell(c, 0, 0, R * 0.17, R * 0.1 * k, s * -0.15); c.fill(); c.restore(); };
  if (type === 'happy') { eye(-1, 0.8); eye(1, 0.8); c.lineWidth = lw * 1.4; c.strokeStyle = OL; c.beginPath(); c.moveTo(-R * 0.4, R * 0.35); c.quadraticCurveTo(0, R * 0.8, R * 0.4, R * 0.35); c.stroke(); }
  else if (type === 'success') { eye(-1, 1); eye(1, 1); c.lineWidth = lw * 1.3; c.strokeStyle = OL; c.beginPath(); c.moveTo(-R * 0.32, R * 0.42); c.quadraticCurveTo(0, R * 0.62, R * 0.32, R * 0.42); c.stroke(); c.fillStyle = '#ffd54a'; star(c, R * 0.6, -R * 0.5, R * 0.16, R * 0.07, 5); c.fill(); }
  else if (type === 'strong') { eye(-1, 0.7); eye(1, 0.7); c.lineWidth = lw * 1.5; c.strokeStyle = OL; c.beginPath(); c.moveTo(-R * 0.3, R * 0.45); c.lineTo(R * 0.3, R * 0.45); c.stroke(); c.lineWidth = lw * 1.6; c.beginPath(); c.moveTo(-R * 0.6, -R * 0.35); c.lineTo(-R * 0.15, -R * 0.22); c.moveTo(R * 0.6, -R * 0.35); c.lineTo(R * 0.15, -R * 0.22); c.stroke(); }
  else if (type === 'confident') { eye(-1, 0.9); eye(1, 0.9); c.lineWidth = lw * 1.4; c.strokeStyle = OL; c.beginPath(); c.moveTo(-R * 0.35, R * 0.45); c.quadraticCurveTo(R * 0.1, R * 0.6, R * 0.4, R * 0.28); c.stroke(); }
  else if (type === 'sad') { eye(-1, 1); eye(1, 1); c.lineWidth = lw * 1.4; c.strokeStyle = OL; c.beginPath(); c.moveTo(-R * 0.35, R * 0.55); c.quadraticCurveTo(0, R * 0.25, R * 0.35, R * 0.55); c.stroke(); }
  else { eye(-1, 1); eye(1, 1); if (type === 'cracked') { c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); c.moveTo(R * 0.1, -R * 0.7); c.lineTo(-R * 0.05, -R * 0.3); c.lineTo(R * 0.15, 0); c.lineTo(0, R * 0.4); c.stroke(); } }
  // the string
  c.strokeStyle = '#3a2a2a'; c.lineWidth = lw * .8; c.beginPath(); c.moveTo(-R * 0.92, -R * 0.2); c.lineTo(-R * 1.02, -R * 0.15); c.moveTo(R * 0.92, -R * 0.2); c.lineTo(R * 1.02, -R * 0.15); c.stroke();
  c.restore();
}
export function star(c, x, y, r1, r2, n = 5, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }

// a walk phase that matches the ground speed (so the feet do not slide): px = pixels per second
export const walkPhase = (t, speed, h) => t * speed / (h * 0.35) * 1.0;

// ---------------------------------------------------------------- scenery
export function sky(c, top, bottom, y0 = 0, y1 = H) { c.fillStyle = lin(c, 0, y0, 0, y1, [[0, top], [1, bottom]]); c.fillRect(-W, -H, W * 3, H * 3); }
export function stars(c, seed, n, t, y1 = H * 0.6, col = '#fff') { const r = rng(seed); for (let i = 0; i < n; i++) { const x = r() * W, y = r() * y1, s = r() * 1.6 + 0.4, tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 3) + r() * 9); c.globalAlpha = 0.3 + tw * 0.7; c.fillStyle = col; c.fillRect(x, y, s, s); } c.globalAlpha = 1; }
export function moon(c, x, y, r, col = '#fff6d8', glow = 0.5) {
  c.fillStyle = rad(c, x, y, r * 0.8, r * 4.5, [[0, rgba(col, glow)], [1, rgba(col, 0)]]); c.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  circ(c, x, y, r); c.fillStyle = col; c.fill();
  c.fillStyle = 'rgba(0,0,0,0.07)'; circ(c, x - r * 0.3, y - r * 0.2, r * 0.22); c.fill(); circ(c, x + r * 0.35, y + r * 0.3, r * 0.15); c.fill();
}
export function sun(c, x, y, r, col = '#ffe08a', glow = 0.6) { c.fillStyle = rad(c, x, y, r * 0.5, r * 6, [[0, rgba(col, glow)], [0.4, rgba(col, glow * 0.25)], [1, rgba(col, 0)]]); c.fillRect(x - r * 7, y - r * 7, r * 14, r * 14); circ(c, x, y, r); c.fillStyle = '#fffbe8'; c.fill(); }
// light shafts from (x, y) pointing at angle a (0 = straight down), spread s
export function rays(c, x, y, a, s, len, col, alpha, t = 0, n = 5) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5, aa = a + k * s, w = s / n * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 2.1));
    const al = alpha * (0.55 + 0.45 * Math.sin(t * 0.9 + i * 1.7));
    const g = c.createLinearGradient(x, y, x + Math.sin(aa) * len, y + Math.cos(aa) * len); g.addColorStop(0, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(aa - w) * len, y + Math.cos(aa - w) * len); c.lineTo(x + Math.sin(aa + w) * len, y + Math.cos(aa + w) * len); c.closePath(); c.fill();
  }
  c.restore();
}
// floating dust / embers / snow in a box; vy < 0 floats up
export function dust(c, seed, n, t, box = [0, 0, W, H], col = '#fff3cf', size = 2, vy = -6, alpha = 0.7) {
  const r = rng(seed), [bx, by, bw, bh] = box;
  for (let i = 0; i < n; i++) {
    const x0 = r() * bw, y0 = r() * bh, sp = 0.4 + r(), ph = r() * 9;
    const x = bx + ((x0 + Math.sin(t * 0.5 * sp + ph) * 12) % bw + bw) % bw, y = by + ((y0 + t * vy * sp) % bh + bh) % bh;
    c.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * sp + ph))); c.fillStyle = col; circ(c, x, y, size * (0.5 + r())); c.fill();
  }
  c.globalAlpha = 1;
}
export function fog(c, y, h, col, alpha, t, seed = 1) { const r = rng(seed); for (let i = 0; i < 6; i++) { const x = ((r() * W * 1.6 + t * (8 + r() * 10)) % (W * 1.8)) - W * 0.4; c.fillStyle = rad(c, x, y + r() * h - h / 2, 0, h * (0.8 + r()), [[0, rgba(col, alpha)], [1, rgba(col, 0)]]); c.fillRect(x - h * 2, y - h * 2, h * 4, h * 4); } }
export function rain(c, t, n = 120, col = 'rgba(180,200,255,0.35)', seed = 4) { const r = rng(seed); c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < n; i++) { const x = r() * (W + 100) - 50, sp = 900 + r() * 500, y = ((r() * H + t * sp) % (H + 60)) - 30; c.moveTo(x, y); c.lineTo(x - 6, y + 22); } c.stroke(); }
export function hills(c, y, amp, col, seed, t = 0, drift = 0, ol = true) {
  const r = rng(seed), ph = r() * 9, ph2 = r() * 9; c.beginPath(); c.moveTo(-60, H + 50);
  for (let x = -60; x <= W + 60; x += 10) { const xx = x + t * drift; c.lineTo(x, y - amp * (0.6 * Math.sin(xx * 0.008 + ph) + 0.4 * Math.sin(xx * 0.021 + ph2))); }
  c.lineTo(W + 60, H + 50); c.closePath(); ink(c, col, ol ? 3 : 0);
}
export function mountains(c, y, col, seed, peaks = 4, hgt = 220, snow = null) {
  const r = rng(seed); const xs = []; for (let i = 0; i <= peaks; i++) xs.push([-80 + i * (W + 160) / peaks + (r() - .5) * 60, y - hgt * (0.55 + r() * 0.45)]);
  c.beginPath(); c.moveTo(-100, y + 400); c.lineTo(-100, y);
  for (let i = 0; i < xs.length; i++) { const [px, py] = xs[i]; c.lineTo(px - 80, y - (y - py) * 0.3); c.lineTo(px, py); c.lineTo(px + 70, y - (y - py) * 0.35); }
  c.lineTo(W + 100, y); c.lineTo(W + 100, y + 400); c.closePath(); ink(c, col, 3);
  if (snow) for (const [px, py] of xs) { poly(c, [[px - 28, py + 34], [px, py], [px + 26, py + 34], [px + 10, py + 26], [px - 2, py + 38], [px - 14, py + 27]]); ink(c, snow, 2.5); }
}
export function spookyTree(c, x, y, s, col, seed, t = 0, sway = 1) {
  const r = rng(seed); c.save(); c.translate(x, y); c.scale(s, s);
  const br = (len, ang, w, d) => { if (d === 0 || len < 6) return; c.save(); c.rotate(ang + Math.sin(t * 0.8 + seed + d) * 0.02 * sway * (5 - d)); thick(c, [[0, 0], [len * 0.15 * (r() - .5), -len * 0.5], [0, -len]], w, col, 0); c.translate(0, -len); const k = 2 + (r() < 0.4 ? 1 : 0); for (let i = 0; i < k; i++) br(len * (0.6 + r() * 0.2), (r() - .5) * 1.4, w * 0.65, d - 1); if (d <= 2) { c.strokeStyle = col; c.lineWidth = w * .5; c.beginPath(); c.arc(len * 0.1, -4, 7, Math.PI, Math.PI * 2.4); c.stroke(); } c.restore(); };
  c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-8, -40, -10, -140); c.lineTo(10, -140); c.quadraticCurveTo(8, -40, 28, 0); c.closePath(); c.fillStyle = col; c.fill();
  c.translate(0, -130); for (let i = 0; i < 3; i++) br(90 + r() * 40, -0.9 + i * 0.9 + (r() - .5) * 0.3, 14, 4);
  c.restore();
}
export function roundTree(c, x, y, s, trunk, leaf, seed, t = 0) {
  const r = rng(seed); c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.sin(t * 0.9 + seed) * 0.015);
  rr(c, -9, -90, 18, 92, 6); ink(c, trunk, 3);
  const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr0 = 55 + r() * 18; pts.push([Math.cos(a) * rr0, -125 + Math.sin(a) * rr0 * 0.85]); }
  blob(c, pts); ink(c, leaf, 3); c.fillStyle = 'rgba(255,255,255,0.15)'; ell(c, -18, -150, 26, 14, -0.4); c.fill(); c.fillStyle = 'rgba(0,0,0,0.15)'; ell(c, 20, -100, 40, 22); c.fill();
  c.restore();
}
export function grass(c, y, col, seed, t, n = 90, hgt = 16) { const r = rng(seed); c.strokeStyle = col; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < n; i++) { const x = r() * W, hh = hgt * (0.5 + r()), sw = Math.sin(t * 2 + x * 0.05) * 3; c.moveTo(x, y); c.quadraticCurveTo(x + sw * 0.5, y - hh * 0.5, x + sw, y - hh); } c.stroke(); }
export function brickWall(c, x, y, w, h, base, seed, bw = 46, bh = 22, mortar = null) {
  const r = rng(seed); c.fillStyle = mortar || shade(base, -0.45); c.fillRect(x, y, w, h);
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh) for (let xx = x - (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
    rr(c, xx + 2, yy + 2, bw - 4, bh - 4, 4); c.fillStyle = shade(base, (r() - 0.5) * 0.18); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(xx + 4, yy + 3, bw - 10, 3);
  }
}
export function stoneWall(c, x, y, w, h, base, seed) {
  const r = rng(seed); c.fillStyle = shade(base, -0.4); c.fillRect(x, y, w, h);
  for (let yy = y; yy < y + h; yy += 40) for (let xx = x - r() * 40; xx < x + w; xx += 50 + r() * 30) { const ww = 46 + r() * 30; blob(c, [[xx + 4, yy + 4], [xx + ww / 2, yy + 1], [xx + ww - 2, yy + 5], [xx + ww, yy + 34], [xx + ww / 2, yy + 38], [xx + 3, yy + 35]]); c.fillStyle = shade(base, (r() - 0.5) * 0.2); c.fill(); }
}
export function bars(c, x, y, w, h, n, col = '#4a4652', thickness = 9) { for (let i = 0; i < n; i++) { const xx = x + (i + 0.5) * w / n; rr(c, xx - thickness / 2, y, thickness, h, thickness / 2); ink(c, col, 2.5); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(xx - thickness / 2 + 2, y + 4, 2, h - 8); } for (const yy of [y + 8, y + h - 16]) { rr(c, x - 4, yy, w + 8, 10, 4); ink(c, col, 2.5); } }
export function door(c, x, y, w, h, open, col = '#7b5233', light = null) {
  // the opening (light behind), then the door panel swinging (open 0..1)
  rr(c, x - 6, y - 6, w + 12, h + 6, 6); ink(c, '#3a2c28', 3);
  c.fillStyle = light || '#120c10'; c.fillRect(x, y, w, h);
  const ww = w * Math.cos(open * Math.PI * 0.46);
  c.save(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + ww, y + open * 14); c.lineTo(x + ww, y + h - open * 10); c.lineTo(x, y + h); c.closePath(); ink(c, col, 3);
  c.clip(); c.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 1; i < 4; i++) c.fillRect(x + ww * i / 4 - 1, y, 2, h);
  c.restore();
  circ(c, x + ww - 12 * (ww / w), y + h * 0.52, 5); ink(c, '#d8b24a', 2);
}
export function clock(c, x, y, r, t, speed = 1, face = '#f7efdc', rimCol = '#7a5a3a') {
  circ(c, x, y, r); ink(c, rimCol, 3); circ(c, x, y, r * 0.86); ink(c, face, 2);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = OL; circ(c, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, i % 3 ? r * 0.025 : r * 0.05); c.fill(); }
  const hand = (a, l, w) => thick(c, [[x, y], [x + Math.sin(a) * l, y - Math.cos(a) * l]], w, OL, 0);
  hand(t * speed * TAU / 60, r * 0.7, r * 0.05); hand(t * speed * TAU / 720, r * 0.48, r * 0.08);
  circ(c, x, y, r * 0.07); c.fillStyle = '#c94a3a'; c.fill();
}
export function frame(c, x, y, w, h, draw, col = '#8b6239', rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); rr(c, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 4); ink(c, col, 3); c.fillStyle = '#efe4cc'; c.fillRect(-w / 2, -h / 2, w, h); c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip(); c.translate(-w / 2, -h / 2); if (draw) draw(c, w, h); c.restore(); c.strokeStyle = OL; c.lineWidth = 2; c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); }
export function trophy(c, x, y, s, col = '#f2c230', shine = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  rr(c, -26, -14, 52, 14, 3); ink(c, '#5b3d2a', 3); rr(c, -8, -40, 16, 28, 3); ink(c, col, 3);
  c.beginPath(); c.moveTo(-34, -100); c.lineTo(34, -100); c.quadraticCurveTo(34, -40, 0, -40); c.quadraticCurveTo(-34, -40, -34, -100); ink(c, col, 3);
  c.strokeStyle = OL; c.lineWidth = 9; c.beginPath(); c.arc(-34, -80, 14, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(34, -80, 14, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(-34, -80, 14, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(34, -80, 14, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.45)'; rr(c, -22, -95, 8, 40, 4); c.fill();
  if (shine) { c.globalAlpha = shine; c.fillStyle = '#fff'; star(c, 18, -88, 12, 3, 4, 0); c.fill(); c.globalAlpha = 1; }
  c.restore();
}
export function campfire(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = rad(c, 0, -30, 0, 260, [[0, 'rgba(255,170,70,0.45)'], [1, 'rgba(255,120,40,0)']]); c.fillRect(-300, -300, 600, 500);
  for (const a of [-0.4, 0.4, 0]) { c.save(); c.rotate(a); rr(c, -45, -8, 90, 16, 8); ink(c, '#6b4128', 3); c.restore(); }
  for (let i = 0; i < 3; i++) {
    const k = [1, 0.7, 0.45][i], col = ['#ff6a2b', '#ffab2e', '#fff1a6'][i];
    c.beginPath(); c.moveTo(-34 * k, -2);
    for (let j = 0; j <= 6; j++) { const u = j / 6, xx = lerp(-34 * k, 34 * k, u), hh = (60 + 40 * Math.sin(u * Math.PI)) * k * (0.8 + 0.3 * noise1(t * 6 + j * 3 + i)); c.lineTo(xx + noise1(t * 4 + j) * 6, -hh * Math.sin(u * Math.PI) - 4); }
    c.closePath(); ink(c, col, i ? 0 : 3);
  }
  c.restore();
  dust(c, 7, 14, t, [x - 40 * s, y - 220 * s, 80 * s, 200 * s], '#ffb347', 1.8 * s, -40, 0.9);
}
// a thought / speech bubble with (Hindi) text
export function bubble(c, x, y, w, h, text, o = {}) {
  const col = o.col || '#ffffff', tc = o.tc || OL, a = o.alpha ?? 1, sc = o.scale ?? 1;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sc, sc);
  if (o.thought) {
    const pts = []; const n = 12; for (let i = 0; i < n; i++) { const ang = i / n * TAU; pts.push([Math.cos(ang) * w / 2 * (1 + 0.08 * (i % 2)), Math.sin(ang) * h / 2 * (1 + 0.1 * (i % 2))]); }
    c.beginPath(); for (let i = 0; i < n; i++) { const [px, py] = pts[i]; const ang = i / n * TAU; c.moveTo(px + Math.cos(ang) * 1, py); c.arc(px * 0.85, py * 0.85, Math.min(w, h) * 0.22, 0, TAU); } c.fillStyle = OL; c.fill();
    c.beginPath(); for (let i = 0; i < n; i++) { const [px, py] = pts[i]; c.moveTo(px * 0.85 + Math.min(w, h) * 0.22 - 3, py * 0.85); c.arc(px * 0.85, py * 0.85, Math.min(w, h) * 0.22 - 3, 0, TAU); } c.fillStyle = col; c.fill();
    ell(c, 0, 0, w / 2 * 0.9, h / 2 * 0.85); c.fillStyle = col; c.fill();
    if (o.tail) { const [tx, ty] = o.tail; for (let i = 1; i <= 3; i++) { circ(c, tx * i / 4, ty * i / 4 + 6, 7 - i * 1.5 + 4); ink(c, col, 2.5); } }
  } else {
    rr(c, -w / 2, -h / 2, w, h, Math.min(24, h / 2)); ink(c, col, 3);
    if (o.tail) { const [tx, ty] = o.tail; c.beginPath(); c.moveTo(-12, h / 2 - 2); c.lineTo(tx, ty); c.lineTo(12, h / 2 - 2); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.moveTo(-12, h / 2); c.lineTo(tx, ty); c.lineTo(12, h / 2); c.stroke(); }
  }
  if (text) { c.fillStyle = tc; c.textAlign = 'center'; c.textBaseline = 'middle'; const fs = o.size || 22; c.font = `700 ${fs}px ${FONT}`; const lines = String(text).split('\n'); lines.forEach((l, i) => c.fillText(l, 0, (i - (lines.length - 1) / 2) * fs * 1.25 + 2)); }
  c.restore();
}
// big outlined cartoon text
export function title(c, text, x, y, size, o = {}) {
  c.save(); c.font = `${o.weight || 800} ${size}px ${FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const lines = Array.isArray(text) ? text : wrap(c, text, o.max || W - 60);
  lines.forEach((l, i) => {
    const yy = y + (i - (lines.length - 1) / 2) * size * (o.lh || 1.3);
    if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillText(l, x + size * 0.04, yy + size * 0.08); }
    c.strokeStyle = o.ol || OL; c.lineWidth = size * (o.olw || 0.2); c.strokeText(l, x, yy);
    c.fillStyle = o.col || '#fff'; c.fillText(l, x, yy);
  });
  c.restore();
  return lines.length;
}
export function wrap(c, text, max) { const words = String(text).split(/\s+/), out = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }

// a wolf (side view, facing right); col = body colour, glow = aura colour; howl 0..1 raises the head
export function wolf(c, x, y, s, col, o = {}) {
  const t = o.t || 0, howl = o.howl || 0, walk = o.walk;
  c.save(); c.translate(x, y); c.scale(s * (o.flip ? -1 : 1), s);
  if (o.glow) { c.fillStyle = rad(c, 0, -60, 10, 170, [[0, rgba(o.glow, 0.5)], [1, rgba(o.glow, 0)]]); c.fillRect(-200, -240, 400, 300); }
  const lw = 3.5, leg = (lx, ph) => { const a = walk != null ? Math.sin(walk + ph) * 0.45 : 0; thick(c, [[lx, -55], [lx + Math.sin(a) * 30, -28], [lx + Math.sin(a) * 34 + 4, 0]], 14, shade(col, ph ? -0.15 : 0), lw); };
  leg(-50, Math.PI); leg(40, 0);
  // tail
  c.beginPath(); c.moveTo(-70, -70); c.quadraticCurveTo(-120, -60 + Math.sin(t * 3) * 6, -130, -100 + Math.sin(t * 3) * 10); c.quadraticCurveTo(-100, -80, -70, -55); ink(c, col, lw);
  // body
  blob(c, [[-80, -78], [-30, -92], [30, -95], [70, -88], [80, -55], [30, -45], [-40, -45], [-82, -55]]); ink(c, col, lw);
  c.fillStyle = 'rgba(255,255,255,0.12)'; ell(c, -10, -82, 50, 8); c.fill();
  leg(-35, 0); leg(55, Math.PI);
  // head
  c.save(); c.translate(70, -88); c.rotate(-howl * 0.7);
  blob(c, [[-18, 10], [-10, -22], [6, -30], [30, -14], [62, -6], [64, 6], [40, 14], [10, 22]]); ink(c, col, lw);
  poly(c, [[-6, -20], [2, -48], [14, -26]]); ink(c, col, lw);
  poly(c, [[6, -24], [20, -46], [24, -20]]); ink(c, shade(col, -0.1), lw);
  ell(c, 14, -10, 6, 4, -0.2); c.fillStyle = o.eye || '#fff4a0'; c.fill();
  circ(c, 62, 0, 5); c.fillStyle = OL; c.fill();
  if (howl > 0.3) { c.beginPath(); c.moveTo(40, 10); c.lineTo(62, 8); c.lineTo(48, 18); c.closePath(); c.fillStyle = '#4a1a24'; c.fill(); }
  else if (o.snarl) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(36 + i * 6, 11); c.lineTo(39 + i * 6, 17); } c.stroke(); }
  c.restore();
  c.restore();
}

// a simple crowd figure (cheap): x, y feet; h; col; mood 'happy' 'clap' 'neutral' 'turn'
export function person(c, x, y, h, col, o = {}) { toon(c, { x, y, h, face: o.face ?? 0, t: o.t, style: { shirt: col, skin: o.skin || '#e8b98f', hair: o.hair || '#2d2220', hairStyle: o.hairStyle || 'short', pants: o.pants || '#3a3550', ...(o.style || {}) }, expr: o.expr || 'neutral', pose: o.pose, noShadow: o.noShadow, look: o.look, talk: o.talk, alpha: o.alpha, blinkSeed: x * 0.13 }); }

// ---------------------------------------------------------------- finishing: vignette, grain, colour, flash
let grainPat = null, vig = null;
export function finish(c, ctx2, o = {}) {
  // (c: the 2x context in logical units)
  if (o.grade) { c.save(); c.globalCompositeOperation = o.grade.mode || 'soft-light'; c.globalAlpha = o.grade.amt ?? 0.3; c.fillStyle = o.grade.col; c.fillRect(0, 0, W, H); c.restore(); }
  if (!vig) { vig = document.createElement('canvas'); vig.width = W; vig.height = H; const v = vig.getContext('2d'); v.fillStyle = rad(v, W / 2, H * 0.48, H * 0.28, H * 0.78, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.75)']]); v.fillRect(0, 0, W, H); }
  c.save(); c.globalAlpha = o.vignette ?? 0.85; c.drawImage(vig, 0, 0, W, H); c.restore();
  if (!grainPat) { const g = document.createElement('canvas'); g.width = g.height = 256; const gx = g.getContext('2d'), id = gx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gx.putImageData(id, 0, 0); grainPat = c.createPattern(g, 'repeat'); }
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = o.grain ?? 0.07; grainPat.setTransform(new DOMMatrix().translate(Math.random() * 256, Math.random() * 256).scale(0.5)); c.fillStyle = grainPat; c.fillRect(0, 0, W, H); c.restore();
}
export function flash(c, a, col = '#ffffff') { if (a <= 0) return; c.save(); c.globalAlpha = clamp(a); c.fillStyle = col; c.fillRect(0, 0, W, H); c.restore(); }
export function black(c, a) { flash(c, a, '#000000'); }
// a bright "speed line" burst behind a subject (anime-style emphasis)
export function burst(c, x, y, r0, r1, n, col, a, t = 0) { c.save(); c.globalAlpha *= a; c.fillStyle = col; const r = rng(3); for (let i = 0; i < n; i++) { const ang = i / n * TAU + r() * 0.1 + t * 0.2, w = 0.02 + r() * 0.03, rr0 = r0 * (0.8 + r() * 0.4); c.beginPath(); c.moveTo(x + Math.cos(ang - w) * rr0, y + Math.sin(ang - w) * rr0); c.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); c.lineTo(x + Math.cos(ang + w) * rr0, y + Math.sin(ang + w) * rr0); c.fill(); } c.restore(); }
// cartoon motion lines next to something moving
export function speedLines(c, x, y, len, n, dir = -1, col = 'rgba(255,255,255,0.6)', t = 0) { c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < n; i++) { const yy = y + (i - n / 2) * 14, off = ((t * 300 + i * 37) % 60); c.moveTo(x + dir * off, yy); c.lineTo(x + dir * (off + len * (0.5 + (i % 3) * 0.25)), yy); } c.stroke(); }
