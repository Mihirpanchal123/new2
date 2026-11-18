// 6. The Two Wolves Inside a Man: internal conflict and self-control.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, sun, moon, stars, rays, dust, fog, hills, mountains, spookyTree, roundTree, grass, campfire, wolf, bubble, title, flash, black, burst, noise1 } from '../engine.mjs';

const ELDER = { old: true, hair: '#dcd8d0', hairStyle: 'long', beard: '#dcd8d0', beardLen: 0.25, skin: '#b9825a', shirt: '#7a4a2a', pants: '#4a3a2a', headband: '#b0402a', shoes: '#3a2a1e' };
const BOY = { kid: true, hairStyle: 'kid', hair: '#1e1612', skin: '#c48a5e', shirt: '#4f8fb0', pants: '#4a3a2a', shoes: '#3a2a1e' };
const MAN = { hairStyle: 'messy', hair: '#1e1612', skin: '#c48a5e', shirt: '#4f8fb0', pants: '#4a3a2a', shoes: '#3a2a1e' };
const BULLY = { kid: true, hairStyle: 'messy', hair: '#3a2a20', skin: '#e0ae84', shirt: '#c9433a', pants: '#2f3550' };
const GIRL = { kid: true, hairStyle: 'long', hair: '#2a1d18', skin: '#e8b48a', shirt: '#e88aa8', pants: '#5a4a7a' };
const RED = { col: '#5a1f2a', glow: '#ff3b3b', eye: '#ff6a3a' }, GOLD = { col: '#e8b04a', glow: '#ffd27a', eye: '#bff4ff' };

// a fluffy cartoon wolf, side view facing right (feet at y); o: t, walk, howl, snarl, flip
function fwolf(c, x, y, s, C, o = {}) {
  const t = o.t || 0, lw = 4.5, col = C.col, dk = shade(col, -0.28), lt = shade(col, 0.22), w = o.walk;
  c.save(); c.translate(x, y); c.scale(s * (o.flip ? -1 : 1), s);
  if (C.glow) { c.fillStyle = rad(c, 20, -120, 10, 230, [[0, rgba(C.glow, 0.42)], [1, rgba(C.glow, 0)]]); c.fillRect(-260, -360, 540, 400); }
  c.fillStyle = 'rgba(0,0,0,0.25)'; ell(c, 10, 2, 120, 12); c.fill();
  const leg = (x0, y0, ph, hind, colr) => {
    const a = w != null ? Math.sin(w + ph) * 0.45 : 0, lift = w != null ? Math.max(0, Math.cos(w + ph)) * 0.5 : 0;
    const x1 = x0 + Math.sin(a) * 42, y1 = y0 + Math.cos(a) * 42, a2 = a + (hind ? 0.45 : -0.1) - lift * (hind ? -0.6 : 0.8);
    const x2 = x1 + Math.sin(a2) * 42, y2 = Math.min(0, y1 + Math.cos(a2) * 42);
    thick(c, [[x0, y0], [x1, y1], [x2, y2]], hind ? 26 : 22, colr, lw);
    ell(c, x2 + 8, y2 - 4, 16, 9); ink(c, colr, lw);
  };
  // far legs, tail
  leg(-40, -95, Math.PI, true, dk); leg(85, -90, 0, false, dk);
  c.save(); c.translate(-85, -105); c.rotate(Math.sin(t * 3) * 0.15 - 0.2);
  blob(c, [[0, 8], [-30, -10], [-70, -30], [-95, -60], [-80, -40], [-105, -42], [-60, -2], [-20, 18]]); ink(c, col, lw);
  c.fillStyle = lt; blob(c, [[-70, -38], [-92, -55], [-85, -42]]); c.fill();
  c.restore();
  // body with fur
  blob(c, [[-100, -100], [-60, -132], [0, -126], [55, -142], [100, -132], [108, -96], [86, -66], [30, -70], [-30, -66], [-95, -72]]); ink(c, col, lw);
  c.fillStyle = lt; ell(c, -10, -118, 60, 9, -0.05); c.fill();
  poly(c, [[-40, -70], [-30, -54], [-20, -70], [-6, -55], [6, -70], [18, -56], [28, -70]]); ink(c, col, 0); c.strokeStyle = OL; c.lineWidth = lw; c.beginPath(); c.moveTo(-40, -70); c.lineTo(-30, -54); c.lineTo(-20, -70); c.lineTo(-6, -55); c.lineTo(6, -70); c.lineTo(18, -56); c.lineTo(28, -70); c.stroke();
  // chest ruff
  poly(c, [[80, -140], [118, -112], [98, -106], [112, -88], [90, -86], [98, -66], [70, -76]]); ink(c, lt, lw);
  // near legs
  leg(-55, -92, 0, true, col); leg(70, -88, Math.PI, false, col);
  // head
  c.save(); c.translate(80, -140); c.rotate(-(o.howl || 0) * 0.65);
  poly(c, [[10, -35], [14, -85], [34, -45]]); ink(c, dk, lw);
  blob(c, [[-22, -8], [-4, -48], [30, -50], [68, -28], [100, -16], [96, -2], [62, 6], [24, 16], [-10, 14]]); ink(c, col, lw);
  poly(c, [[-4, -40], [-2, -92], [22, -48]]); ink(c, col, lw); poly(c, [[2, -48], [3, -78], [15, -50]]); ink(c, shade(col, 0.35), 0);
  poly(c, [[-12, 6], [-26, 22], [0, 14], [-4, 28], [16, 14]]); ink(c, lt, lw * 0.8);
  // the eye glows
  c.save(); c.translate(36, -24); c.rotate(-0.25); c.fillStyle = rad(c, 0, 0, 1, 22, [[0, rgba(C.eye, 0.8)], [1, rgba(C.eye, 0)]]); c.fillRect(-22, -22, 44, 44); ell(c, 0, 0, 10, o.snarl ? 4 : 6); c.fillStyle = C.eye; c.fill(); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke(); c.restore();
  c.strokeStyle = OL; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(20, -40); c.lineTo(50, -30 + (o.snarl ? 6 : 0)); c.stroke();
  circ(c, 99, -12, 7); c.fillStyle = OL; c.fill();
  if ((o.howl || 0) > 0.3) { poly(c, [[62, 4], [98, 0], [70, 18]]); ink(c, '#4a1a24', lw * 0.7); }
  else { c.beginPath(); c.moveTo(96, -2); c.lineTo(58, 6); c.stroke(); if (o.snarl) { c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { poly(c, [[64 + i * 8, 4], [68 + i * 8, 13], [72 + i * 8, 3]]); c.fill(); } } }
  c.restore();
  c.restore();
}
// a wolf made of smoke and firelight
function spirit(c, x, y, s, W_, t, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.01) return;
  c.save(); c.globalAlpha *= a;
  const r = rng(o.seed || 3);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { const p = (t * 0.35 + r()) % 1, px = x + (r() - 0.5) * 220 * s, py = y - 60 * s - p * 200 * s; c.fillStyle = rgba(W_.glow, 0.12 * (1 - p)); circ(c, px + Math.sin(t + i) * 10 * s, py, (20 + r() * 30) * s * (1 - p * 0.5)); c.fill(); }
  c.restore();
  fwolf(c, x, y + Math.sin(t * 1.4 + (o.seed || 0)) * 6 * s, s, W_, { t, howl: o.howl || 0, snarl: o.snarl, walk: o.walk, flip: o.flip });
  c.restore();
}
function seated(c, x, y, h, t, o = {}) {
  const hug = o.hug ?? 0; let face = o.face ?? 1; if (Math.abs(face) < 0.6) face = (face < 0 ? -1 : 1) * 0.6;
  toon(c, { x, y: y + h * 0.29, h, face, t, style: o.style, expr: o.expr || 'neutral', look: o.look, noShadow: true, talk: o.talk, rim: o.rim, mouth: o.mouth,
    pose: { sit: true, legF: [lerp(1.45, 2.3, hug), lerp(-1.45, -2.6, hug)], legB: [lerp(1.4, 2.25, hug), lerp(-1.45, -2.6, hug)], armF: o.armF || [lerp(0.5, 1.35, hug), lerp(0.7, 1.0, hug)], armB: o.armB || [lerp(0.4, 1.2, hug), lerp(0.6, 1.0, hug)], headTilt: o.headTilt ?? 0, lean: o.lean ?? lerp(0.05, 0.18, hug) } });
}
// the night clearing with the fire
function clearing(c, t, o = {}) {
  sky(c, '#060818', '#1a1638', 0, 650); stars(c, 6, 70, t, 450); moon(c, 430, 150, 26, '#fff4d6', 0.3);
  for (let i = 0; i < 6; i++) spookyTree(c, -40 + i * 120 + (i % 2) * 30, 650, 0.9 + (i % 3) * 0.15, '#0c0b1a', 20 + i, t, 0.5);
  fog(c, 600, 120, '#2a2450', 0.35, t, 3);
  c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#1d1a26'], [1, '#0a080e']]); c.fillRect(-100, 640, W + 200, 500);
  if (o.fire !== false) campfire(c, 270, 660, 0.9, t);
  // logs to sit on
  for (const lx of [110, 430]) { rr(c, lx - 70, 606, 140, 26, 12); ink(c, '#5a3a24', 3); }
}
// floating trait words around a wolf, revealed one by one
function traits(c, words, cx, cy, k, col, t) {
  const n = words.length;
  words.forEach((w, i) => { const p = clamp(k * n - i); if (p <= 0) return; const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.4, x = cx + Math.cos(a) * 165, y = cy + Math.sin(a) * 120 + Math.sin(t * 2 + i) * 5; c.save(); c.translate(x, y); const s = ease.back(clamp(p * 2)); c.scale(s, s); title(c, w, 0, 0, 28, { col }); c.restore(); });
}
// a sunny village lane
function lane(c, t, o = {}) {
  sky(c, '#7cc4ff', '#ffeec8', 0, 620); sun(c, 440, 170, 30, '#fff1b0', 0.4);
  hills(c, 520, 40, '#8fcf6a', 4, t, 0); roundTree(c, 80, 560, 0.8, '#6b4a30', '#5aa84a', 3, t); roundTree(c, 470, 550, 0.7, '#6b4a30', '#4f9a40', 7, t);
  c.fillStyle = '#7dbf5a'; c.fillRect(-100, 580, W + 200, 500); grass(c, 600, '#5a9a42', 3, t, 80, 14);
  c.fillStyle = '#d8b884'; poly(c, [[-100, 700], [W + 100, 680], [W + 100, 780], [-100, 800]]); c.fill();
}

export default {
  slug: 'two-wolves',
  title: 'तुम्हारे अंदर के दो भेड़िये',
  accent: '#ffc65a',
  grade: { col: '#2a2a5e', amt: 0.14 },
  music: tl => ({ root: 45, scale: 'phrygian', prog: [0, 1, 0, 6], chord: 5.0, level: 0.24, warmth: 700, pulse: false, dyn: [[tl.at('fight').start, 1.5, 0.8], [tl.at('ask').start, 0.6, 0.6], [tl.at('day').start, 1.0, 1], [tl.at('twist').start, 1.5, 1.2], [tl.at('final').start, 1.2, 1]] }),
  ambience: tl => [{ type: 'fire', from: 0, to: tl.at('day').start + 0.4, gain: 0.9 }, { type: 'night', from: 0, to: tl.at('day').start + 0.4, gain: 0.8 }, { type: 'birds', from: tl.at('day').start, to: tl.at('exam').start }, { type: 'room', from: tl.at('exam').start, to: tl.at('twist').start + 0.3 }, { type: 'wind', from: tl.at('twist').start, to: tl.total, gain: 0.7 }, { type: 'birds', from: tl.at('final').start, to: tl.total, gain: 0.7 }],
  cover: { shot: 'fight', at: 0.5 },
  shots: [
    // 0. hook: two pairs of eyes open in the dark
    { id: 'hook', min: 4.8, vo: [{ text: 'हर इंसान के अंदर... || दो *भेड़िये* रहते हैं।', voice: 'old' }], sfx: [[0.2, 'growl', { dur: 1.6, gain: 0.25 }], [0.1, 'boom', { gain: 0.6 }], [1.6, 'howl', { dur: 2.4, gain: 0.08 }]],
      draw(c, t, S) {
        c.fillStyle = '#04030a'; c.fillRect(0, 0, W, H);
        const k = E(t, 1.4, 3.8);
        c.save(); cam(c, { z: lerp(1.6, 1.0, E(t, 0, S.dur, ease.out)), y: 470 });
        fog(c, 520, 200, '#3a2a5a', 0.4 * k, t, 7);
        // the eyes first, then the wolves around them
        spirit(c, 100, 600, 0.85, RED, t, { alpha: k * 0.95, snarl: true, seed: 1 });
        spirit(c, 440, 600, 0.85, GOLD, t, { alpha: k * 0.95, flip: true, seed: 2 });
        const open = E(t, 0.3, 0.7);
        for (const [x, col] of [[199, '#ff4a2a'], [341, '#9fefff']]) { c.save(); c.globalAlpha = 1 - k * 0.8; c.fillStyle = rad(c, x, 461, 0, 40, [[0, rgba(col, 0.9)], [1, rgba(col, 0)]]); c.fillRect(x - 40, 421, 80, 80); ell(c, x, 461, 9, 6 * open); c.fillStyle = col; c.fill(); c.restore(); }
        c.restore();
      } },
    // 1. the campfire: the elder and the boy
    { id: 'fire', min: 5, tr: 'black', vo: 'एक रात, | अलाव के पास, | एक बूढ़े योद्धा ने | अपने पोते से कहा...', sfx: [[0.2, 'whoosh', { dur: 1, gain: 0.15 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.15, 1.0, E(t, 0, S.dur)), x: 270, y: 500 });
        clearing(c, t);
        seated(c, 110, 610, 250, t, { style: ELDER, expr: 'smirk', face: 1, look: [1, 0], rim: '#ffb060', talk: t > S.line(0).b - 0.6 ? 0.5 : 0 });
        seated(c, 430, 610, 210, t, { style: BOY, expr: 'happy', face: -1, look: [1, 0], rim: '#ffb060', hug: 0.6 });
        c.restore();
      } },
    // 2. the dark wolf rises from the smoke
    { id: 'red', min: 5, tr: 'fade', vo: [{ text: 'एक भेड़िया है... || *डर*, | ग़ुस्सा, | जलन, | और लालच।', voice: 'old' }], sfx: [[0.3, 'growl', { dur: 2, gain: 0.3 }], [0.2, 'whoosh', { f: 200, f2: 900, dur: 1.2 }]],
      draw(c, t, S) {
        const k = E(t, 0, 1.6, ease.out);
        c.save(); cam(c, { z: 1.05, x: 270, y: 470 });
        clearing(c, t);
        c.fillStyle = rad(c, 270, 400, 10, 380, [[0, rgba('#ff3b3b', 0.25 * k)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        spirit(c, 270 - 10, lerp(640, 470, k), lerp(0.4, 1.35, k), RED, t, { alpha: k, snarl: true, seed: 1 });
        seated(c, 110, 610, 250, t, { style: ELDER, expr: 'determined', face: 1, look: [0.6, -1], talk: S.speaking(t, 0) ? 0.7 : 0, rim: '#ff6a5a' });
        seated(c, 430, 610, 210, t, { style: BOY, expr: 'scared', face: -1, look: [1, -1], hug: 0.9, rim: '#ff6a5a' });
        const L = S.line(0); traits(c, ['डर', 'ग़ुस्सा', 'जलन', 'लालच'], 270, 330, seg(t, L.a + 0.9, L.b - 0.2), '#ff8a7a', t);
        c.restore();
      } },
    // 3. the golden wolf
    { id: 'gold', min: 5, tr: 'fade', vo: [{ text: 'और दूसरा... || *हिम्मत*, | दया, | सब्र, | और अनुशासन।', voice: 'old' }], sfx: [[0.3, 'chime'], [0.4, 'howl', { dur: 2.2, f: 520, gain: 0.08 }]],
      draw(c, t, S) {
        const k = E(t, 0, 1.6, ease.out);
        c.save(); cam(c, { z: 1.05, x: 270, y: 470 });
        clearing(c, t);
        c.fillStyle = rad(c, 270, 400, 10, 380, [[0, rgba('#ffd27a', 0.3 * k)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        spirit(c, 280, lerp(640, 470, k), lerp(0.4, 1.35, k), GOLD, t, { alpha: k, flip: true, howl: E(t, 0.6, 1.4) * (1 - E(t, 2.6, 3.2)), seed: 2 });
        seated(c, 110, 610, 250, t, { style: ELDER, expr: 'happy', face: 1, look: [0.6, -1], talk: S.speaking(t, 0) ? 0.7 : 0, rim: '#ffd27a' });
        seated(c, 430, 610, 210, t, { style: BOY, expr: 'shock', face: -1, look: [1, -1], hug: 0.5, rim: '#ffd27a' });
        const L = S.line(0); traits(c, ['हिम्मत', 'दया', 'सब्र', 'अनुशासन'], 270, 330, seg(t, L.a + 0.9, L.b - 0.2), '#ffe08a', t);
        c.restore();
      } },
    // 4. they fight, every day, inside you
    { id: 'fight', min: 4.8, tr: 'flash', vo: [{ text: 'ये दोनों | हर रोज़, | हर इंसान के अंदर *लड़ते* हैं।', voice: 'old' }], sfx: [[0.2, 'growl', { dur: 1.2, gain: 0.35 }], [0.9, 'hit'], [1.8, 'hit', { gain: 0.6 }], [2.6, 'growl', { dur: 1, gain: 0.3 }], [3.2, 'hit']],
      draw(c, t, S) {
        const ph = t * 2.2, clash = Math.pow(Math.abs(Math.sin(ph)), 8);
        const [sx, sy] = shake(t, 6 * clash, 25);
        c.fillStyle = '#07050f'; c.fillRect(0, 0, W, H);
        c.save(); c.translate(sx, sy); cam(c, { z: 1.0, y: 480, r: Math.sin(t * 0.8) * 0.03 });
        c.fillStyle = rad(c, 160, 480, 10, 400, [[0, 'rgba(255,59,59,0.28)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        c.fillStyle = rad(c, 380, 480, 10, 400, [[0, 'rgba(255,210,122,0.28)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        const d = 70 + 50 * Math.cos(ph);
        spirit(c, 270 - d - 60, 560 + Math.sin(ph) * 20, 1.15, RED, t, { snarl: true, seed: 1, walk: t * 6 });
        spirit(c, 270 + d + 60, 560 - Math.sin(ph) * 20, 1.15, GOLD, t, { flip: true, snarl: true, seed: 2, walk: t * 6 + 1 });
        if (clash > 0.3) { burst(c, 270, 470, 20, 180, 18, '#fff3c0', clash); }
        dust(c, 4, 40, t, [60, 300, 420, 360], '#ffcf8a', 2.5, -30, 0.8);
        c.restore();
      } },
    // 5. the boy asks
    { id: 'ask', min: 3.6, tr: 'fade', vo: [{ text: 'दादा जी... | इनमें से *जीतता* कौन है?', voice: 'kid' }],
      draw(c, t, S) {
        c.fillStyle = '#0b0812'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 460 });
        c.fillStyle = rad(c, 120, 700, 20, 520, [[0, 'rgba(255,170,80,0.5)'], [1, 'rgba(255,120,40,0)']]); c.fillRect(0, 0, W, H);
        spookyTree(c, 470, 900, 1.4, '#120f22', 9, t, 0.4);
        toon(c, { x: 290, y: 440 + 800 * 0.72, h: 800, face: -0.35, t, style: BOY, expr: 'worried', talk: S.speaking(t, 0) ? 1 : 0, look: [-0.8, -0.2], noShadow: true, rim: '#ffb060' });
        dust(c, 7, 20, t, [0, 400, 300, 400], '#ffb347', 2, -30, 0.8);
        c.restore();
      } },
    // 6. the elder answers
    { id: 'answer', min: 4.4, tr: 'fade', vo: [{ text: 'वही... ||| जिसे तुम *खाना* खिलाते हो।', voice: 'old' }], sfx: [[0.1, 'piano', { notes: [57, 64, 69], gap: 0.35, gain: 0.7 }]],
      draw(c, t, S) {
        c.fillStyle = '#0b0812'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.08, 1.0, S.p), y: 460 });
        c.fillStyle = rad(c, 430, 700, 20, 520, [[0, 'rgba(255,170,80,0.5)'], [1, 'rgba(255,120,40,0)']]); c.fillRect(0, 0, W, H);
        spookyTree(c, 60, 900, 1.4, '#120f22', 4, t, 0.4);
        toon(c, { x: 250, y: 440 + 800 * 0.72, h: 800, face: 0.35, t, style: { ...ELDER, old: false }, expr: t > S.line(0).b - 0.8 ? 'happy' : 'smirk', talk: S.speaking(t, 0) ? 0.8 : 0, look: [0.8, 0.2], noShadow: true, rim: '#ffb060' });
        dust(c, 3, 20, t, [240, 400, 300, 400], '#ffb347', 2, -30, 0.8);
        c.restore();
      } },
    // 7. from the next day: two little wolves follow him around
    { id: 'day', min: 5.5, tr: 'black', vo: 'अगले दिन से, | उसका हर छोटा *फ़ैसला*... | किसी एक भेड़िये को खिलाने लगा।', sfx: [[0.3, 'steps', { n: 9, gap: 0.42, gain: 0.2 }], [0.5, 'sparkle']],
      draw(c, t, S) {
        c.save(); c.translate(0, -120); lane(c, t);
        const x = lerp(-60, 330, E(t, 0, S.dur * 0.8, ease.sine)), walking = t < S.dur * 0.8;
        spirit(c, x - 120, 735, 0.42, RED, t, { alpha: 0.85, walk: walking ? t * 9 : null, seed: 1 });
        toon(c, { x, y: 740, h: 270, face: 1, t, style: BOY, expr: 'happy', look: [1, 0], pose: { walk: walking ? t * 8.5 : null, amp: 0.8 } });
        spirit(c, x + 110, 760, 0.42, GOLD, t, { alpha: 0.85, walk: walking ? t * 9 + 1 : null, seed: 2 });
        c.restore();
      } },
    // 8. choice one: anger, then patience
    { id: 'anger', min: 5, tr: 'flash', vo: 'ग़ुस्सा आया... || पर उसने *सब्र* चुना।', sfx: [[0.2, 'pop', { f: 200 }], [0.5, 'growl', { dur: 1.2, gain: 0.3 }], [2.2, 'whoosh', { dur: 1.2, gain: 0.2 }], [2.6, 'chime']],
      draw(c, t, S) {
        c.save(); c.translate(0, -120); lane(c, t);
        const calm = E(t, S.line(0).a + 1.2, S.line(0).a + 2.2);
        // the bully runs off with his ball, laughing
        const bx = lerp(360, 600, E(t, 0.4, 3.0, ease.in));
        toon(c, { x: bx, y: 740, h: 250, face: 1, t, style: BULLY, expr: 'smirk', look: [-1, 0], pose: { walk: t > 0.4 ? t * 10 : null, run: true }, hold: (c, h) => { circ(c, 0, 10, 18); ink(c, '#ff8a3a', 2.5); } });
        if (t < 2) bubble(c, 420, 400, 110, 50, 'हा हा!', { tail: [-10, 60], size: 24, scale: ease.back(seg(t, 0.3, 0.6)) });
        spirit(c, 120, 690, lerp(0.95, 0.4, calm), RED, t, { alpha: lerp(0.95, 0.5, calm), snarl: calm < 0.5, seed: 1 });
        spirit(c, 420, 760, lerp(0.42, 0.62, calm), GOLD, t, { alpha: lerp(0.5, 0.95, calm), flip: true, seed: 2 });
        const [sx] = shake(t, 3 * (1 - calm), 30);
        toon(c, { x: 230 + sx, y: 745, h: 250, face: 0.6, t, style: BOY, expr: calm < 0.4 ? 'angry' : calm < 0.9 ? 'closed' : 'happy', mouth: calm < 0.4 ? 'grit' : null, look: [1, 0], pose: { armF: [lerp(0.5, 0.1, calm), lerp(1.6, 0.2, calm)], armB: [lerp(0.4, 0.05, calm), lerp(1.6, 0.2, calm)] } });
        if (calm < 0.5) { c.save(); c.globalAlpha = 1 - calm * 2; c.fillStyle = 'rgba(255,60,40,0.18)'; c.fillRect(0, 0, W, H); for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; c.fillStyle = `rgba(255,255,255,${0.6 * (1 - p)})`; circ(c, 200 + i * 30, 460 - p * 80, 12 + p * 14); c.fill(); } c.restore(); }
        if (calm > 0.1 && calm < 1) { c.save(); c.globalAlpha = Math.sin(calm * Math.PI) * 0.7; c.strokeStyle = '#bff4ff'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(235, 520, 60 + i * 30 + calm * 40, 0, Math.PI * 2); c.stroke(); } c.restore(); }
        c.restore();
      } },
    // 9. choice two: a girl falls, he helps
    { id: 'help', min: 4.6, tr: 'flash', vo: 'किसी को गिरते देखा... | तो हाथ *बढ़ाया*।', sfx: [[0.3, 'thud', { gain: 0.5 }], [0.4, 'paper', { n: 10 }], [2.0, 'sparkle']],
      draw(c, t, S) {
        c.save(); c.translate(0, -120); lane(c, t);
        const k = E(t, 1.2, 2.4);
        // books on the ground
        const r = rng(4); for (let i = 0; i < 4; i++) { const bx = 260 + i * 40 + r() * 10, by = 770 + r() * 10, up = k > (i + 1) / 5; if (up) continue; c.save(); c.translate(bx, by); c.rotate(r() - 0.5); rr(c, -18, -6, 36, 12, 2); ink(c, ['#d94a5a', '#4aa3d9', '#4ad98a', '#f2c94c'][i], 2.5); c.restore(); }
        spirit(c, 90, 700, 0.38, RED, t, { alpha: 0.5, seed: 1 });
        spirit(c, 430, 690, lerp(0.62, 0.8, k), GOLD, t, { alpha: 0.95, flip: true, howl: E(t, 2.4, 3.0) * 0.6, seed: 2 });
        // the girl gets up
        const up = E(t, 2.2, 3.2);
        toon(c, { x: 380, y: 760, h: 230, face: -0.7, t, style: GIRL, expr: up > 0.5 ? 'joy' : 'sad', look: [-1, 0], pose: { crouch: lerp(0.9, 0, up), lean: lerp(0.4, 0, up), armF: [lerp(1.2, 0.3, up), 0.4] } });
        toon(c, { x: 175, y: 760, h: 250, face: 0.8, t, style: BOY, expr: 'happy', look: [1, 0.3], pose: { crouch: lerp(0.6, 0.1, up), lean: lerp(0.35, 0, up), armF: [lerp(1.0, 1.4, up), 0.3] },
          hold: (c, h) => { if (k > 0.3) { rr(c, -18, -2, 36, 30, 2); ink(c, '#d94a5a', 2); rr(c, -16, -12, 32, 10, 2); ink(c, '#4aa3d9', 2); } } });
        c.restore();
      } },
    // 10. choice three: the exam
    { id: 'exam', min: 5.2, tr: 'flash', vo: 'आसान रास्ता था... || पर उसने *मेहनत* चुनी।', sfx: [[0.3, 'whisper', { dur: 1.5, gain: 0.06 }], [2.2, 'scribble', { n: 16 }]],
      draw(c, t, S) {
        c.fillStyle = '#e9d6b0'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#2f5a48'; rr(c, 40, 120, 460, 240, 8); c.fill(); c.strokeStyle = '#6b4a30'; c.lineWidth = 10; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '700 30px "Nirmala UI"'; c.textAlign = 'center'; c.fillText('परीक्षा', 270, 200); c.fillText('2 + 2 × 2 = ?', 270, 260);
        const no = E(t, 1.6, 2.4);
        // the boy at his desk
        toon(c, { x: 230, y: 700, h: 280, face: 0.7, t, style: BOY, expr: no < 0.5 ? 'worried' : 'determined', look: no < 0.5 ? [-1, 0] : [0.6, 1], pose: { armF: [1.2, 0.9 + Math.sin(t * 14) * 0.1 * no], armB: [1.0, 0.8], headTilt: no < 0.5 ? -0.1 : 0.15 } });
        rr(c, 120, 640, 320, 24, 6); ink(c, '#8a5a3a', 3); c.fillStyle = '#6b4428'; c.fillRect(140, 664, 280, 300);
        c.save(); c.translate(320, 640); c.rotate(-0.06); rr(c, -50, -10, 100, 14, 2); ink(c, '#fbf7ec', 2); c.restore();
        // the neighbour's paper, and the red wolf whispering
        spirit(c, 70, 520, lerp(0.5, 0.3, no), RED, t, { alpha: lerp(0.95, 0.4, no), snarl: true, seed: 1 });
        if (no < 0.8) bubble(c, 120, 330, 160, 56, 'नकल कर ले!', { alpha: 1 - no, tail: [10, 60], size: 24, col: '#ffd6d0' });
        spirit(c, 460, 560, lerp(0.55, 0.85, no), GOLD, t, { alpha: lerp(0.5, 1, no), flip: true, seed: 2 });
        if (no > 0.4) { c.save(); c.globalAlpha = no; title(c, '✓', 350, 590, 40, { col: '#5ad98a' }); c.restore(); }
      } },
    // 11. the twist: years later, the golden wolf is huge, the dark one sleeps
    { id: 'twist', min: 6.5, tr: 'black', vo: 'भेड़िये | कभी असली दुश्मन थे ही नहीं... || वो थे, | उसके हर दिन के *फ़ैसले*।', sfx: [[0.2, 'riser', { dur: 1.5, gain: 0.15 }], [1.6, 'boom', { gain: 0.5 }], [1.7, 'howl', { dur: 3, f: 480, gain: 0.12 }]],
      draw(c, t, S) {
        const k = E(t, 0.5, 2.5, ease.out);
        sky(c, '#ff9a6a', '#ffe0a0', 0, 640); sun(c, 270, 520, 60, '#fff1b0', 0.8);
        rays(c, 270, 520, Math.PI, 2.2, 700, '#fff1c0', 0.12, t, 9);
        mountains(c, 640, '#b06a6a', 5, 5, 200, '#ffe8d8'); hills(c, 680, 30, '#5a7a4a', 9, t, 0);
        c.fillStyle = '#4a6a3e'; c.fillRect(-100, 680, W + 200, 400);
        c.save(); cam(c, { z: lerp(1.25, 1.0, E(t, 0, 4)), y: 560 });
        spirit(c, 340, 690, lerp(0.7, 1.55, k), GOLD, t, { alpha: 0.9, flip: true, howl: E(t, 1.6, 2.4) * (1 - E(t, 4.5, 5.5)), seed: 2 });
        toon(c, { x: 250, y: 760, h: 300, face: 0.4, t, style: MAN, expr: 'smirk', look: [0.4, -0.3], rim: '#ffe08a', pose: { armF: [0.15, 0.2] } });
        // the dark wolf: small, curled up asleep
        c.save(); c.translate(120, 760); c.scale(0.4, 0.4); ell(c, 0, -40, 110, 50); ink(c, RED.col, 6); circ(c, 70, -60, 40); ink(c, RED.col, 6); c.strokeStyle = OL; c.lineWidth = 6; c.beginPath(); c.arc(80, -60, 12, 0.2, Math.PI - 0.2); c.stroke(); c.restore();
        for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; c.save(); c.globalAlpha = 1 - p; title(c, 'z', 150 + p * 20 + i * 4, 700 - p * 50, 16 + p * 10, { col: '#fff' }); c.restore(); }
        c.restore();
      } },
    // 12. the line to remember: two roads, he walks the golden one
    { id: 'final', min: 7.5, tr: 'fade', vo: 'तुम्हारा चरित्र इससे नहीं बनता, | कि तुम क्या महसूस करते हो... || बल्कि इससे, | कि तुम बार-बार | क्या *चुनते* हो।', tail: 1.1, sfx: [[0.3, 'steps', { n: 10, gap: 0.55, gain: 0.18 }], [5, 'gong', { gain: 0.5 }]],
      draw(c, t, S) {
        sky(c, '#2a2a5e', '#ffb07a', 0, 600);
        // left: a dark forest; right: a sunrise
        c.save(); c.fillStyle = lin(c, 0, 0, W, 0, [[0, 'rgba(10,8,20,0.75)'], [0.45, 'rgba(10,8,20,0.5)'], [0.75, 'rgba(10,8,20,0)']]); c.fillRect(-100, -100, W + 200, H + 200); c.restore();
        sun(c, 420, 470, 42, '#fff1b0', 0.7);
        for (let i = 0; i < 3; i++) spookyTree(c, 30 + i * 70, 600, 0.8, '#0c0b1a', 40 + i, t, 0.5);
        hills(c, 600, 20, '#3a4a3a', 2, t, 0);
        c.fillStyle = '#2e3a2a'; c.fillRect(-100, 600, W + 200, 400);
        // the fork in the road
        c.fillStyle = '#3a2a4a'; poly(c, [[230, 960], [300, 960], [200, 600], [170, 600]]); c.fill();
        c.fillStyle = '#e8c27a'; poly(c, [[250, 960], [340, 960], [400, 600], [370, 600]]); c.fill();
        c.fillStyle = rgba('#fff1c0', 0.25 + 0.1 * Math.sin(t * 2)); poly(c, [[280, 960], [320, 960], [392, 600], [380, 600]]); c.fill();
        // he walks up the golden road, getting smaller, the golden wolf beside him
        const p = E(t, 0.3, S.dur - 0.5, ease.sine), s = lerp(1, 0.45, p), x = lerp(270, 380, p), y = lerp(850, 640, p);
        spirit(c, x + 70 * s, y + 6, 0.55 * s, GOLD, t, { alpha: 0.95, walk: t * 7, seed: 2 });
        toon(c, { x, y, h: 290 * s, face: 0.8, t, style: MAN, expr: 'happy', look: [1, -0.2], rim: '#ffe08a', pose: { walk: t * 6, amp: 0.7 } });
        spirit(c, 150, 640, 0.25, RED, t, { alpha: 0.35, seed: 1 });
        dust(c, 5, 26, t, [260, 400, 280, 400], '#fff1c0', 1.8, -10, 0.6);
      } },
  ],
};
