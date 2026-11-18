// 5. The Man Who Was Always Running Late: living in the future, forgetting the present.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, moon, stars, rays, dust, rain, clock, frame, trophy, bubble, title, flash, black, burst, speedLines, noise1, star } from '../engine.mjs';

const hero = k => ({ top: 'suit', jacket: '#2d3550', pants: '#262c44', tie: '#c0392b', hair: mix('#2a1d18', '#d8d4ce', k), hairStyle: 'neat', skin: '#e2b088', shoes: '#151515', beard: k > 0.7 ? mix('#2a1d18', '#d8d4ce', k) : null, beardLen: -0.25 });
const MOM = { hairStyle: 'bun', hair: '#3a2420', shirt: '#d0607a', pants: '#4a3048', skin: '#e8b48a', blush: true };
const DAD = { hairStyle: 'old', hair: '#bdb6ac', shirt: '#6b8f5a', pants: '#4a4a3a', skin: '#d9a77c', beard: '#bdb6ac', beardLen: -0.3 };
const KID = { kid: true, hairStyle: 'kid', hair: '#2a1d18', shirt: '#f2b84b', pants: '#3a4a7a', skin: '#e8b48a' };
const SIS = { kid: true, hairStyle: 'long', hair: '#3a2420', shirt: '#7fc8a9', pants: '#3a4a7a', skin: '#e8b48a' };
const FRIEND1 = { shirt: '#e07a3f', hair: '#1e1a18', hairStyle: 'messy', skin: '#c99068', pants: '#3a3550' };
const FRIEND2 = { shirt: '#4fa3a5', hair: '#5a3a28', hairStyle: 'short', skin: '#f0c49a', pants: '#2f3550' };
// a stride matched to the ground speed so the feet do not slide
const stride = (t, speed, h) => t * speed * Math.PI / (0.37 * h);

// a room: wall with soft wallpaper, a window, a floor
function room(c, t, o = {}) {
  const wall = o.wall || '#e9c9a0', floorY = o.floorY ?? 660;
  c.fillStyle = wall; c.fillRect(-60, -60, W + 120, floorY + 60);
  c.fillStyle = rgba(shade(wall, -0.2), 0.35); for (let x = -40; x < W + 60; x += 46) c.fillRect(x, -60, 14, floorY + 60);
  c.fillStyle = lin(c, 0, floorY, 0, H, [[0, o.floor || '#9a6b45'], [1, shade(o.floor || '#9a6b45', -0.35)]]); c.fillRect(-60, floorY, W + 120, H - floorY + 60);
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.beginPath(); for (let y = floorY + 30; y < H + 40; y += 36) { c.moveTo(-60, y); c.lineTo(W + 60, y); } c.stroke();
  thick(c, [[-60, floorY], [W + 60, floorY]], 8, shade(wall, -0.35), 0);
  if (o.window !== false) { const wx = o.wx ?? 330, wy = o.wy ?? 170; rr(c, wx - 8, wy - 8, 156, 186, 6); ink(c, '#f4ecd8', 3); c.fillStyle = o.night ? lin(c, 0, wy, 0, wy + 170, [[0, '#0f1a3a'], [1, '#2a3460']]) : lin(c, 0, wy, 0, wy + 170, [[0, '#8fd0ff'], [1, '#fff0c4']]); c.fillRect(wx, wy, 140, 170); c.strokeStyle = '#f4ecd8'; c.lineWidth = 6; c.beginPath(); c.moveTo(wx + 70, wy); c.lineTo(wx + 70, wy + 170); c.moveTo(wx, wy + 85); c.lineTo(wx + 140, wy + 85); c.stroke(); }
}
// city buildings, scrolling sideways (parallax)
function skyline(c, base, seed, col, winCol, scroll, scale = 1, night = false, t = 0) {
  const r = rng(seed), B = []; let x = 0; while (x < 1200) { const w = (60 + r() * 70) * scale, h = (120 + r() * 260) * scale; B.push([x, w, h, r()]); x += w + 6 * scale; }
  for (let rep = -1; rep <= 1; rep++) for (const [bx, w, h, k] of B) {
    const xx = ((bx - scroll) % 1200 + 1200) % 1200 + rep * 1200 - 200; if (xx > W + 50 || xx + w < -50) continue;
    rr(c, xx, base - h, w, h + 40, 4); ink(c, shade(col, (k - 0.5) * 0.15), 2.5);
    c.fillStyle = winCol; const r2 = rng(Math.floor(k * 1e6));
    for (let wy = base - h + 14 * scale; wy < base - 20 * scale; wy += 22 * scale) for (let wx = xx + 10 * scale; wx < xx + w - 14 * scale; wx += 18 * scale) if (r2() < (night ? 0.45 : 0.85)) { c.globalAlpha = night ? 0.6 + 0.4 * Math.sin(t + wx) : 0.55; c.fillRect(wx, wy, 9 * scale, 12 * scale); }
    c.globalAlpha = 1;
  }
}
function sidewalk(c, y, scroll, col = '#8d8a96') { c.fillStyle = col; c.fillRect(-60, y, W + 120, H - y + 60); c.fillStyle = shade(col, -0.25); c.fillRect(-60, y, W + 120, 10); c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 3; c.beginPath(); for (let x = -((scroll % 90) + 90); x < W + 90; x += 90) { c.moveTo(x, y + 10); c.lineTo(x - 40, H + 40); } c.stroke(); }
function table(c, x, y, w, col = '#8a5a3a') { rr(c, x - w / 2, y, w, 18, 6); ink(c, col, 3); for (const lx of [x - w / 2 + 14, x + w / 2 - 26]) { rr(c, lx, y + 16, 12, 80, 3); ink(c, shade(col, -0.2), 3); } }
function chair(c, x, y, col = '#7a4f30', flip = 1) { c.save(); c.translate(x, y); c.scale(flip, 1); rr(c, -26, -10, 52, 12, 4); ink(c, col, 3); rr(c, 18, -90, 10, 82, 4); ink(c, col, 3); rr(c, -24, 0, 8, 56, 3); ink(c, shade(col, -0.2), 3); rr(c, 16, 0, 8, 56, 3); ink(c, shade(col, -0.2), 3); rr(c, 12, -92, 18, 30, 5); ink(c, col, 3); c.restore(); }
function steam(c, x, y, t, a = 0.6) { c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.beginPath(); for (let k = 0; k <= 10; k++) { const yy = y - k * 5, xx = x + (i - 1) * 8 + Math.sin(t * 3 + k * 0.6 + i * 2) * 4; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); } }
function cup(c, x, y, t) { rr(c, x - 12, y - 22, 24, 22, 4); ink(c, '#f4ecd8', 2.5); c.strokeStyle = OL; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 13, y - 12, 6, -1.4, 1.4); c.stroke(); steam(c, x, y - 26, t); }
function plate(c, x, y) { ell(c, x, y, 34, 9); ink(c, '#f7f3ea', 2.5); circ(c, x - 8, y - 6, 9); ink(c, '#e8a54a', 2); circ(c, x + 10, y - 5, 8); ink(c, '#f2d16b', 2); }
// the little family photograph
function familyPhoto(c, w, h, t, warm = 1) {
  c.fillStyle = mix('#c9a982', '#f4d9a8', warm); c.fillRect(0, 0, w, h);
  c.fillStyle = rgba('#ffffff', 0.25); circ(c, w * 0.7, h * 0.25, h * 0.5); c.fill();
  toon(c, { x: w * 0.25, y: h * 1.02, h: h * 0.95, face: 0, t: 1, style: DAD, expr: 'happy', noShadow: true, noBlink: true });
  toon(c, { x: w * 0.75, y: h * 1.02, h: h * 0.9, face: 0, t: 1, style: MOM, expr: 'joy', noShadow: true, noBlink: true });
  toon(c, { x: w * 0.5, y: h * 1.02, h: h * 0.62, face: 0, t: 1, style: KID, expr: 'joy', noShadow: true, noBlink: true });
  c.fillStyle = 'rgba(120,80,40,0.18)'; c.fillRect(0, 0, w, h);
}

export default {
  slug: 'always-running-late',
  title: 'वो आदमी, जो हमेशा देर से था',
  accent: '#ffc56a',
  grade: { col: '#3a2a5e', amt: 0.14 },
  music: tl => ({ root: 48, scale: 'minor', prog: [0, 5, 2, 6], chord: 4.4, level: 0.22, pulse: true, warmth: 950, dyn: [[tl.at('years').start, 1.4, 1], [tl.at('success').start + 2, 1.1, 1], [tl.at('home').start, 0.5, 0.8], [tl.at('empty').start, 0.75, 1], [tl.at('twist').start, 1.3, 1.2], [tl.at('final').start, 0.9, 1]] }),
  ambience: tl => [
    { type: 'clock', from: 0, to: tl.at('kitchen').start + 1, gain: 0.8 },
    { type: 'room', from: tl.at('kitchen').start, to: tl.at('friends').start + 0.5 },
    { type: 'city', from: tl.at('friends').start, to: tl.at('office').start + 0.5, gain: 1.1 },
    { type: 'rain', from: tl.at('party').start, to: tl.at('office').start + 0.4, gain: 1.2 },
    { type: 'clock', from: tl.at('office').start, to: tl.at('success').start, gain: 0.9 },
    { type: 'wind', from: tl.at('home').start, to: tl.at('twist').start + 1, gain: 0.6 },
    { type: 'clock', from: tl.at('empty').start, to: tl.at('twist').start + 2.5, gain: 0.7 },
  ],
  cover: { shot: 'empty', at: 0.5 },
  shots: [
    // 0. hook: a man sprinting in front of a giant clock whose hands whirl
    { id: 'hook', min: 4.4, vo: 'उसके पास हर चीज़ के लिए वक़्त था... ||| सिवाय *आज* के।', sfx: [[0.1, 'boom', { gain: 0.6 }], [0.2, 'tick', { n: 8, gap: 0.5 }], [0.3, 'run', { n: 14, gap: 0.24, gain: 0.25 }]],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1b1440'], [1, '#3a1f4a']]); c.fillRect(0, 0, W, H);
        burst(c, 270, 440, 60, 700, 36, 'rgba(255,200,120,0.08)', 1, t);
        const [sx, sy] = shake(t, 2, 12);
        c.save(); cam(c, { z: lerp(1.25, 1.0, E(t, 0, 2.5, ease.out)), y: 470 }); c.translate(sx, sy);
        clock(c, 270, 430, 215, t, 90, '#f7efdc', '#b07a3a');
        // flying papers and coins
        for (let i = 0; i < 10; i++) { const p = (t * 0.8 + i / 10) % 1, x = W + 40 - p * (W + 120), y = 300 + i * 40 + Math.sin(p * 8 + i) * 30; c.save(); c.translate(x, y); c.rotate(p * 9 + i); rr(c, -14, -18, 28, 36, 3); ink(c, '#fbf6ea', 2.5); c.restore(); }
        speedLines(c, 160, 560, 120, 9, -1, 'rgba(255,255,255,0.7)', t);
        toon(c, { x: 270, y: 690, h: 300, face: 1, t, style: hero(0), expr: 'worried', sweat: true, pose: { walk: t * 14, run: true }, look: [1, 0],
          hold: (c, h) => { rr(c, -6, 0, 34, 26, 4); ink(c, '#5a3a22', 2.5); } });
        c.restore();
      } },
    // 1. skips breakfast: runs past the table while his mother holds out a plate
    { id: 'kitchen', min: 4.4, tr: 'flash', vo: 'वो सुबह का नाश्ता छोड़ देता, | ताकि *वक़्त* बचे।', sfx: [[0.3, 'run', { n: 8, gap: 0.24, gain: 0.3 }], [1.2, 'whoosh', { dur: 0.5 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.05, x: 270, y: 500 });
        room(c, t, { wall: '#f0d3a8', floor: '#a0704a' });
        clock(c, 140, 230, 48, t, 20);
        table(c, 270, 560, 300);
        plate(c, 230, 556); cup(c, 320, 556, t);
        const x = lerp(640, -120, E(t, 0.4, 2.2, ease.sine));
        const lookAt = clamp((x - 400) / 200, -1, 1);
        toon(c, { x: 410, y: 680, h: 280, face: -0.7, t, style: MOM, expr: t < 1.2 ? 'happy' : 'sad', look: [lookAt, 0], talk: t > 0.4 && t < 1.2 ? 0.6 : 0, pose: { armF: t < 1.6 ? [1.5, 0.2] : [0.2, 0.3] },
          hold: (c, h) => { if (t < 1.6) { ell(c, 0, -4, 26, 7); ink(c, '#f7f3ea', 2); circ(c, -6, -9, 7); ink(c, '#e8a54a', 2); } } });
        toon(c, { x, y: 720, h: 300, face: -1, t, style: hero(0.05), expr: 'worried', look: [1, 0], pose: { walk: stride(t, 430, 300), run: true }, hold: (c, h) => { rr(c, -6, 0, 34, 26, 4); ink(c, '#5a3a22', 2.5); } });
        if (t > 0.4 && t < 2.2) speedLines(c, x + 90, 560, 80, 7, 1, 'rgba(90,60,40,0.4)', t);
        c.restore();
      } },
    // 2. friends wave from a cafe; "later!"
    { id: 'friends', min: 5, tr: 'slide', vo: ['दोस्त बुलाते, | तो एक ही जवाब होता...', { text: 'अभी नहीं यार, | *बाद में*!', voice: 'hero' }], gap: 0.15, sfx: [[0.2, 'run', { n: 16, gap: 0.26, gain: 0.25 }]],
      draw(c, t, S) {
        const scroll = t * 260;
        sky(c, '#8fd0ff', '#ffe7c0', 0, 640);
        skyline(c, 640, 5, '#b9a6c9', '#fff6c8', scroll * 0.3, 0.9);
        sidewalk(c, 640, scroll);
        // the cafe and the friends slide by
        const cx = 640 - t * 80;
        c.save(); c.translate(cx, 0);
        rr(c, -120, 330, 260, 310, 6); ink(c, '#e9d8c0', 3); c.fillStyle = '#c94a3a'; for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#f4ecd8' : '#c94a3a'; c.fillRect(-130 + i * 45, 320, 45, 34); } c.strokeStyle = OL; c.lineWidth = 3; c.strokeRect(-130, 320, 270, 34);
        rr(c, -100, 380, 220, 120, 6); ink(c, '#ffe9b0', 3);
        table(c, 10, 590, 150, '#6b4a30');
        const wave = Math.sin(t * 9) * 0.35;
        toon(c, { x: -50, y: 680, h: 230, face: 0.4, t, style: FRIEND1, expr: 'joy', pose: { armF: [2.6 + wave, 0.3] } });
        toon(c, { x: 80, y: 680, h: 225, face: -0.3, t, style: FRIEND2, expr: 'happy', pose: { armF: [2.4 - wave, 0.4] } });
        cup(c, -10, 586, t); cup(c, 40, 586, t);
        if (t < S.line(0).b + 0.3) bubble(c, 20, 250, 150, 54, 'आजा यार!', { tail: [-20, 50], size: 24, scale: ease.back(seg(t, 0.2, 0.6)) });
        c.restore();
        toon(c, { x: 125, y: 730, h: 300, face: 1, t, style: hero(0.1), expr: S.speaking(t, 1) ? 'smirk' : 'worried', talk: S.speaking(t, 1) ? 1 : 0, look: [-1, 0], pose: { walk: t * 13, run: true, armB: [2.4, 1.6] },
          hold: (c, h) => { rr(c, -6, 0, 34, 26, 4); ink(c, '#5a3a22', 2.5); } });
        speedLines(c, 35, 590, 90, 7, -1, 'rgba(255,255,255,0.8)', t);
      } },
    // 3. the family party at night: he walks away on the phone in the rain
    { id: 'party', min: 5, tr: 'black', vo: 'घर में जश्न होता... || और वो हमेशा | किसी *ज़रूरी* मीटिंग में।', sfx: [[0.3, 'piano', { notes: [72, 76, 79, 84], gap: 0.25, gain: 0.6 }], [1.2, 'steps', { n: 6, gap: 0.5, gain: 0.2 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), x: 270, y: 480 });
        sky(c, '#0b1030', '#262a55', 0, 600); stars(c, 3, 40, t, 260);
        // the house with a warm window
        rr(c, 40, 260, 340, 400, 6); ink(c, '#4a3a4a', 3);
        poly(c, [[20, 270], [210, 120], [400, 270]]); ink(c, '#6a2f3a', 3);
        c.fillStyle = rad(c, 210, 420, 10, 260, [[0, 'rgba(255,200,110,0.45)'], [1, 'rgba(255,200,110,0)']]); c.fillRect(0, 160, 480, 500);
        rr(c, 80, 330, 260, 190, 6); ink(c, '#ffd88a', 3);
        c.save(); rr(c, 80, 330, 260, 190, 6); c.clip();
        c.fillStyle = '#ffcf7a'; c.fillRect(80, 330, 260, 190);
        // the family inside, singing around a cake
        const sway = Math.sin(t * 3) * 0.1;
        toon(c, { x: 130, y: 560, h: 170, face: 0.4, t, style: DAD, expr: 'joy', pose: { armF: [2.5 + sway, 0.3] } });
        toon(c, { x: 290, y: 560, h: 165, face: -0.4, t, style: MOM, expr: 'joy', pose: { armF: [2.5 - sway, 0.3] } });
        toon(c, { x: 210, y: 538, h: 140, face: 0, t, style: SIS, expr: 'joy' });
        rr(c, 175, 492, 70, 30, 6); ink(c, '#f7d6e0', 2.5); for (let i = 0; i < 3; i++) { rr(c, 190 + i * 18, 483, 5, 10, 2); ink(c, '#fff6f0', 1.5); circ(c, 192 + i * 18, 479 + Math.sin(t * 9 + i) * 1.5, 3.5); c.fillStyle = '#ffb347'; c.fill(); }
        c.restore();
        c.strokeStyle = '#4a3a4a'; c.lineWidth = 6; c.beginPath(); c.moveTo(210, 330); c.lineTo(210, 520); c.moveTo(80, 425); c.lineTo(340, 425); c.stroke();
        // the street, and him walking away with the phone
        c.fillStyle = '#2a2a3a'; c.fillRect(-100, 660, W + 200, 400);
        const x = lerp(330, 520, E(t, 0.8, S.dur));
        toon(c, { x, y: 790, h: 300, face: 1, t, style: hero(0.2), expr: 'neutral', talk: (t % 2.4) < 1.6 ? 0.6 : 0, look: [1, 0], pose: { walk: t > 0.8 ? stride(t, 60, 300) : null, amp: 0.7, armF: [2.9, 0.9] },
          hold: (c, h) => { rr(c, -5, -20, 14, 26, 3); ink(c, '#222', 2); c.fillStyle = '#9fd6ff'; c.fillRect(-2, -17, 8, 20); } });
        rain(c, t, 140, 'rgba(170,190,255,0.35)');
        c.restore();
      } },
    // 4. the office: "once I'm successful, then I'll live"
    { id: 'office', min: 5, tr: 'fade', vo: [{ text: 'बस एक बार *कामयाब* हो जाऊँ... | फिर ज़िंदगी जी लूँगा।', voice: 'hero' }], sfx: [[0.2, 'scribble', { n: 14 }], [2.5, 'paper', { n: 10, gain: 0.2 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.15, 1.0, E(t, 0, S.dur)), x: 270, y: 470 });
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1d2340'], [1, '#0e1022']]); c.fillRect(-60, -60, W + 120, H + 120);
        skyline(c, 560, 11, '#2a3058', '#ffe08a', t * 4, 0.8, true, t);
        rr(c, 20, 120, 500, 460, 8); c.strokeStyle = '#3a4270'; c.lineWidth = 10; c.stroke();
        clock(c, 440, 210, 50, t, 150, '#f7efdc', '#6a6a8a');
        // laptop glow on him, then the desk in front of him
        c.fillStyle = rad(c, 270, 520, 10, 260, [[0, 'rgba(140,200,255,0.4)'], [1, 'rgba(140,200,255,0)']]); c.fillRect(0, 260, W, 500);
        toon(c, { x: 270, y: 715, h: 330, face: 0, t, style: hero(0.3), expr: S.speaking(t, 0) ? 'determined' : 'tired', talk: S.speaking(t, 0) ? 1 : 0, look: [0, 0.3], rim: '#9fd6ff', pose: { armF: [0.35 + Math.sin(t * 12) * 0.04, -0.9], armB: [0.35 + Math.cos(t * 11) * 0.04, -0.9] } });
        rr(c, 10, 600, 520, 30, 6); ink(c, '#5a4030', 3); c.fillStyle = '#3a2a20'; c.fillRect(20, 630, 500, 400);
        for (let p = 0; p < 4; p++) { const px = 30 + p * 60 + (p > 1 ? 300 : 0), n = 6 + (p * 3) % 5; for (let i = 0; i < n; i++) { rr(c, px + Math.sin(i * 3 + p) * 4, 590 - i * 9, 56, 10, 2); ink(c, '#f7f3ea', 1.8); } }
        poly(c, [[195, 602], [345, 602], [333, 552], [207, 552]]); ink(c, '#b8bcc8', 3); c.fillStyle = '#9fd6ff'; poly(c, [[214, 594], [326, 594], [318, 560], [222, 560]]); c.fill();
        c.restore();
      } },
    // 5. years pass: he runs on a turning clock face; hair turns grey
    { id: 'years', min: 5.5, tr: 'black', vo: 'साल गुज़रते गए... || और वो *भागता* रहा।', sfx: [[0.1, 'tick', { n: 14, gap: 0.35 }], [0.2, 'run', { n: 20, gap: 0.26, gain: 0.2 }], [0.3, 'whoosh', { dur: 4.5, gain: 0.25 }]],
      draw(c, t, S) {
        const k = E(t, 0, S.dur, ease.inOut), day = Math.sin(t * 2.6) * 0.5 + 0.5;
        sky(c, mix('#0d1236', '#7fc4ff', day), mix('#2a2050', '#ffd9a0', day), 0, H);
        if (day < 0.4) stars(c, 9, 40, t, 400);
        // sun / moon arc
        const a = t * 2.6; c.save(); c.translate(270, 900); c.rotate(a); circ(c, 0, -640, 34); c.fillStyle = '#fff3c0'; c.fill(); circ(c, 0, 640, 26); c.fillStyle = '#e6ecff'; c.fill(); c.restore();
        // the clock-wheel he runs on
        c.save(); c.translate(270, 1000); c.rotate(-t * 1.6);
        circ(c, 0, 0, 340); ink(c, '#f7efdc', 6); circ(c, 0, 0, 300); ink(c, '#efe2c8', 3);
        for (let i = 0; i < 12; i++) { c.save(); c.rotate(i * Math.PI / 6); rr(c, -6, -330, 12, 28, 4); ink(c, '#3a2a20', 2); c.restore(); }
        c.restore();
        toon(c, { x: 270, y: 662, h: 300, face: 1, t, style: hero(k), expr: k > 0.6 ? 'tired' : 'worried', sweat: true, look: [1, 0], pose: { walk: t * 12, run: true, lean: 0.1 + k * 0.1 } });
        speedLines(c, 150, 540, 90, 7, -1, 'rgba(255,255,255,0.6)', t);
        title(c, `${Math.floor(lerp(25, 60, k))} साल की उम्र`, W / 2, 250, 36, { col: '#ffe08a' });
      } },
    // 6. success: a penthouse, money, trophies... and nobody
    { id: 'success', min: 6, tr: 'flash', vo: 'और एक दिन, | वो सच में *कामयाब* हो गया। || पैसा, | नाम... | सब कुछ।', sfx: [[0.1, 'coins', { n: 20 }], [0.3, 'cheer', { dur: 2.5, gain: 0.12 }], [2.8, 'chime']],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.12, S.p), x: 270, y: 480 });
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#0d0f26'], [1, '#2a1a3a']]); c.fillRect(-60, -60, W + 120, H + 120);
        skyline(c, 640, 21, '#1d2244', '#ffd27a', 0, 1, true, t);
        for (let i = 0; i < 4; i++) { c.strokeStyle = '#4a4470'; c.lineWidth = 6; c.beginPath(); c.moveTo(i * 180 - 10, -40); c.lineTo(i * 180 - 10, 650); c.stroke(); }
        c.fillStyle = lin(c, 0, 650, 0, H, [[0, '#3a2a40'], [1, '#150d1a']]); c.fillRect(-60, 650, W + 120, 400);
        trophy(c, 70, 650, 0.9, '#f2c230', Math.sin(t * 3) * 0.5 + 0.5); trophy(c, 470, 650, 1.1, '#f2c230', Math.sin(t * 3 + 1) * 0.5 + 0.5);
        // falling coins and notes
        for (let i = 0; i < 18; i++) { const p = ((t * 0.5 + i / 18) % 1), x = 30 + (i * 53) % 480, y = -30 + p * 720; c.save(); c.translate(x, y); c.rotate(p * 6 + i); if (i % 2) { ell(c, 0, 0, 11 * Math.abs(Math.cos(t * 4 + i)) + 2, 11); ink(c, '#f2c230', 2); } else { rr(c, -16, -8, 32, 16, 2); ink(c, '#7fc87f', 2); } c.restore(); }
        const fade = E(t, S.line(0).b - 1.5, S.line(0).b + 0.5);
        toon(c, { x: 270, y: 780, h: 320, face: 0, t, style: hero(0.85), expr: fade < 0.5 ? 'joy' : 'neutral', look: [lerp(0, 0.8, fade), 0], pose: { armF: [lerp(2.4, 0.1, fade), 0.2], armB: [lerp(2.4, 0.1, fade), 0.2] }, rim: '#ffd27a' });
        c.restore();
        if (fade > 0.3) { c.save(); c.globalAlpha = (fade - 0.3) * 0.8; c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H); c.restore(); }
      } },
    // 7. he returns to his childhood home
    { id: 'home', min: 4.6, tr: 'black', vo: 'फिर, एक दिन... || वो अपने *बचपन* के घर लौटा।', sfx: [[0.3, 'steps', { n: 5, gap: 0.6, gain: 0.25 }], [3.2, 'creak', { dur: 1.6, gain: 0.4 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.18, E(t, 0, S.dur)), x: 300, y: 470 });
        sky(c, '#d77a5a', '#f4c48a', 0, 650);
        circ(c, 120, 330, 40); c.fillStyle = 'rgba(255,240,200,0.8)'; c.fill();
        // the old house, faded paint, a broken fence
        rr(c, 200, 300, 300, 360, 4); ink(c, '#b39a86', 3); poly(c, [[180, 310], [350, 170], [520, 310]]); ink(c, '#7a4a3a', 3);
        c.fillStyle = 'rgba(80,60,50,0.25)'; for (let i = 0; i < 7; i++) c.fillRect(210 + i * 40, 300 + (i % 3) * 30, 22, 300);
        const open = E(t, 3.2, 4.4) * 0.8;
        rr(c, 300, 470, 90, 190, 4); c.fillStyle = '#120a10'; c.fill();
        c.save(); c.beginPath(); c.moveTo(300, 470); c.lineTo(300 + 90 * Math.cos(open * 1.4), 470 + open * 10); c.lineTo(300 + 90 * Math.cos(open * 1.4), 660 - open * 8); c.lineTo(300, 660); c.closePath(); ink(c, '#6a4a32', 3); c.restore();
        rr(c, 410, 380, 70, 70, 4); ink(c, '#3a3040', 3); c.strokeStyle = OL; c.beginPath(); c.moveTo(420, 390); c.lineTo(470, 440); c.stroke();
        c.fillStyle = '#7a8a4a'; c.fillRect(-100, 650, W + 200, 400);
        for (let i = 0; i < 9; i++) { const fx = -20 + i * 40; c.save(); c.translate(fx, 650); c.rotate((i % 3 - 1) * 0.12); rr(c, -6, -60, 12, 64, 3); ink(c, '#a08a6a', 2.5); c.restore(); }
        dust(c, 4, 30, t, [0, 300, W, 400], '#ffe0b0', 1.6, -4, 0.6);
        const x = lerp(60, 280, E(t, 0.3, 3.4, ease.sine));
        toon(c, { x, y: 780, h: 310, face: 1, t, style: { ...hero(0.95), old: true }, expr: 'tired', look: [1, -0.2], pose: { walk: t < 3.4 ? stride(t, 70, 310) : null, amp: 0.6 } });
        c.restore();
      } },
    // 8. an old photograph under the dust
    { id: 'photo', min: 5, tr: 'fade', vo: 'दीवार पर, | धूल से ढकी... | एक पुरानी *तस्वीर* टंगी थी।', sfx: [[1.4, 'swish', { gain: 0.25 }], [2.1, 'swish', { gain: 0.2 }], [2.4, 'piano', { notes: [64, 67, 72], gap: 0.4, gain: 0.7 }]],
      draw(c, t, S) {
        c.fillStyle = '#2a1e22'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.22, E(t, 0, S.dur)), x: 270, y: 430 });
        room(c, t, { wall: '#8a7466', floor: '#4a3428', window: false });
        c.fillStyle = 'rgba(20,10,20,0.4)'; c.fillRect(-60, -60, W + 120, H + 120);
        rays(c, -40, 80, -0.9, 0.3, 700, '#ffe7b0', 0.18, t, 4);
        frame(c, 270, 400, 260, 200, (cc, w, h) => {
          familyPhoto(cc, w, h, t);
          // dust layer being wiped away by his hand
          const wipe = E(t, 1.2, 2.6);
          cc.fillStyle = 'rgba(150,140,130,0.85)'; cc.fillRect(w * wipe, 0, w, h);
          if (wipe < 1) { cc.fillStyle = 'rgba(150,140,130,0.4)'; cc.fillRect(w * wipe - 30, 0, 30, h); }
        }, '#6b4a2a');
        dust(c, 8, 40, t, [100, 250, 340, 380], '#f4e6d0', 1.8, -8, 0.7);
        // his hand
        const hx = lerp(120, 420, E(t, 1.2, 2.6)), hy = 420 + Math.sin(t * 6) * 10;
        if (t > 0.9 && t < 3.0) { thick(c, [[hx - 140, 760], [hx - 30, hy + 60], [hx, hy]], 30, '#2d3550', 3); circ(c, hx, hy, 18); ink(c, '#d9a77c', 3); }
        c.restore();
      } },
    // 9. the empty chairs: ghosts of the family laugh at the table, then fade
    { id: 'empty', min: 6, tr: 'fade', vo: 'जिनके लिए वो हमेशा कहता था, | "*बाद में*"... ||| वो अब वहाँ नहीं थे।', sfx: [[0.3, 'whisper', { dur: 2, gain: 0.04 }], [2.0, 'chime', { notes: [88, 84, 79, 76], gap: 0.18, gain: 0.6 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.05, 1.0, S.p), x: 270, y: 470 });
        room(c, t, { wall: '#6e5e5a', floor: '#3e2c24', wx: 200, wy: 150 });
        c.fillStyle = 'rgba(20,10,30,0.35)'; c.fillRect(-60, -60, W + 120, H + 120);
        rays(c, 270, 230, 0.1, 0.4, 600, '#ffe2b0', 0.16, t, 4);
        clock(c, 90, 220, 44, 0, 1, '#d8ccb8', '#5a4a3a');
        chair(c, 120, 630, '#6a4a30', 1); chair(c, 420, 630, '#6a4a30', -1);
        table(c, 270, 560, 320, '#5a3a28');
        plate(c, 180, 556); plate(c, 270, 556); plate(c, 360, 556);
        // the ghosts of the past
        const g = (1 - E(t, 2.0, 3.6)) * (0.45 + 0.1 * Math.sin(t * 5)) * E(t, 0.1, 0.8);
        if (g > 0.01) {
          toon(c, { x: 135, y: 640, h: 240, face: 0.6, t, style: DAD, expr: 'joy', alpha: g, noShadow: true, pose: { armF: [1.3, 0.6] } });
          toon(c, { x: 405, y: 640, h: 235, face: -0.6, t, style: MOM, expr: 'joy', alpha: g, noShadow: true, pose: { armF: [1.2, 0.8] } });
          toon(c, { x: 270, y: 640, h: 170, face: 0, t, style: KID, expr: 'joy', alpha: g, noShadow: true, pose: { armF: [2.5, 0.3], armB: [2.5, 0.3] } });
          dust(c, 2, 30, t, [80, 300, 380, 330], '#cfe8ff', 2, -14, g * 1.5);
        }
        c.restore();
        // he stands at the edge, reaching out
        toon(c, { x: 470, y: 790, h: 300, face: -1, t, style: { ...hero(1), old: true }, expr: t < 2.2 ? 'shock' : 'cry', look: [1, -0.2], pose: { armF: [lerp(0.2, 1.6, E(t, 0.6, 1.8)), 0.1] } });
      } },
    // 10. the twist line: close-up, the clock stops
    { id: 'twist', min: 6.5, tr: 'fade', vo: 'जिस भविष्य के लिए वो भागता रहा, | वो आ तो गया... || पर उन लोगों के *बिना*, | जिनसे वो प्यार करता था।', sfx: [[0.1, 'tick', { n: 6, gap: 0.6, gain: 0.3 }], [3.8, 'gong', { gain: 0.5 }]],
      draw(c, t, S) {
        c.fillStyle = '#140d16'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), y: 470 });
        // the big clock behind, its second hand slowing to a stop
        const stopT = Math.min(t, 3.8) - Math.max(0, Math.min(t, 3.8) - 2.5) ** 2 * 0.2;
        c.globalAlpha = 0.6; clock(c, 270, 330, 230, stopT * 60, 1, '#cfc2aa', '#5a4a3a'); c.globalAlpha = 1;
        c.fillStyle = rad(c, 270, 520, 60, 520, [[0, 'rgba(20,13,22,0)'], [1, 'rgba(20,13,22,0.85)']]); c.fillRect(0, 0, W, H);
        toon(c, { x: 290, y: 440 + 820 * 0.72, h: 820, face: 0.25, t, style: { ...hero(1) }, expr: 'cry', look: [-0.1, 1], noShadow: true, rim: '#ffcf8a', pose: { armF: [0.3, -1.6], armB: [0.3, -1.6] } });
        const by = Math.sin(t * 1.5) * 3;
        frame(c, 290, 690 + by, 220, 160, (cc, w, hh) => familyPhoto(cc, w, hh, t), '#6b4a2a', Math.sin(t) * 0.02);
        for (const hx of [229, 351]) { circ(c, hx, 735 + by, 30); ink(c, '#d9a77c', 4); }
        c.restore();
      } },
    // 11. the line to remember: an open pocket watch with the family photo; it stops
    { id: 'final', min: 7, tr: 'black', vo: 'ज़िंदगी बनाने में | इतने भी व्यस्त मत हो जाना... || कि उसे *जीना* ही भूल जाओ।', tail: 1.1, sfx: [[0.3, 'tick', { n: 5, gap: 1.0, gain: 0.25 }], [5.5, 'bell', { f: 523, gain: 0.6 }]],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#2a1830'], [1, '#0a060c']]); c.fillRect(0, 0, W, H);
        c.fillStyle = rad(c, 270, 440, 20, 360, [[0, 'rgba(255,200,120,0.3)'], [1, 'rgba(255,200,120,0)']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.2, 1.0, E(t, 0, S.dur, ease.out)), y: 440 });
        // chain
        c.strokeStyle = '#c9a24a'; c.lineWidth = 4; for (let i = 0; i < 12; i++) { ell(c, 270 + Math.sin(i * 0.5) * 20, 80 + i * 18, 6, 9); c.stroke(); }
        // the lid (open, above) and the watch
        const open = E(t, 0.3, 1.6, ease.back);
        c.save(); c.translate(270, 260); c.scale(1, lerp(0.05, 1, open)); circ(c, 0, 0, 150); ink(c, '#d9b452', 5); circ(c, 0, 0, 120); ink(c, '#f2d77a', 3);
        c.save(); circ(c, 0, 0, 112); c.clip(); c.translate(-112, -85); familyPhoto(c, 224, 170, t); c.restore();
        c.restore();
        rr(c, 255, 380, 30, 26, 6); ink(c, '#d9b452', 3);
        circ(c, 270, 560, 160); ink(c, '#d9b452', 5);
        const stopT = t < 4.5 ? t : 4.5;
        clock(c, 270, 560, 140, stopT * 60, 1, '#f7efdc', '#b8923a');
        c.restore();
        dust(c, 6, 24, t, [60, 160, 420, 600], '#ffe0a8', 1.8, -10, 0.6);
      } },
  ],
};
