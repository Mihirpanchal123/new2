// 9. The Man Who Carried Everyone's Problems: people-pleasing and emotional boundaries.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, sun, rays, dust, rain, title, bubble, flash, burst, star, noise1, walkPhase } from '../engine.mjs';

const HERO = { shirt: '#3fa37a', pants: '#2f3550', hair: '#2a1d18', hairStyle: 'neat', skin: '#d9a77c', shoes: '#2a2026', packColor: '#7a5236' };
const FRIEND = { shirt: '#4a6fa5', pants: '#3a3550', hair: '#1e1a18', hairStyle: 'messy', skin: '#e0b08a' };
const COLL = { top: 'suit', jacket: '#4a4f5c', shirt: '#4a4f5c', tie: '#c9a227', pants: '#30333d', hairStyle: 'short', hair: '#4a321e', skin: '#c99a72' };
const MOM = { hairStyle: 'bun', hair: '#2a1a1a', shirt: '#b5487a', pants: '#5a2f45', skin: '#d9a77c' };
const DAD = { hairStyle: 'old', hair: '#c9c4bd', shirt: '#8a7a52', pants: '#3d3a2a', skin: '#cf9f78', beard: '#c9c4bd', beardLen: 0.05 };
const ORB = { sad: '#5ab4ff', work: '#ffa23a', hope: '#ff5a6e' };

function orb(c, x, y, r, col, t = 0) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y, 0, r * 3, [[0, rgba(col, 0.6)], [1, rgba(col, 0)]]); c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6); c.restore();
  circ(c, x, y, r * (1 + Math.sin(t * 5 + x) * 0.05)); ink(c, col, Math.max(1.5, r * 0.18));
  c.fillStyle = 'rgba(255,255,255,0.7)'; circ(c, x - r * 0.35, y - r * 0.35, r * 0.3); c.fill();
}
// our own back pack (so the orbs can sit exactly in its mouth): geometry in the hip frame, facing right
const SEQ = ['#5ab4ff', '#ffa23a', '#ff5a6e', '#ff5a6e', '#ffa23a', '#5ab4ff', '#ff5a6e'];
function packGeo(h, pack) { const pw = h * (0.14 + pack * 0.09), ph = h * (0.2 + pack * 0.13); return { pw, ph, px: -0.06 * h - pw, py: -0.29 * h - (ph - 0.27 * h) * 0.75 }; }
function packTop(x, y, h, pack, lean = 0) { const { pw, px, py } = packGeo(h, pack), lx = px + pw / 2, ly = py, hipY = y - h * 0.29, c = Math.cos(lean), s = Math.sin(lean); return [x + lx * c - ly * s, hipY + lx * s + ly * c, pw]; }
// a man carrying the pack: the pack (with its glowing load), the man, the straps
function carrier(c, o) {
  const { x, y, h, t } = o, pack = o.pack ?? 0, P = o.pose || {};
  const lean = (P.lean || 0) + (P.walk != null ? (P.run ? 0.22 : 0.04) : 0) + (P.slump || 0) * 0.35;
  const bob = P.walk != null ? Math.abs(Math.sin(P.walk)) * h * (P.run ? 0.04 : 0.02) : 0;
  const hipY = y + bob - h * 0.29 + (P.crouch || 0) * h * 0.14 * 0.6;
  const { pw, ph, px, py } = packGeo(h, pack), n = Math.max(0, Math.round((pack - 0.3) / 0.5)), glow = o.glow || '#ffd27a';
  if (pack > 0) {
    c.save(); c.translate(x, hipY); c.rotate(lean);
    if (n) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, px + pw / 2, py, 0, pw * 1.1, [[0, rgba(glow, 0.45)], [1, rgba(glow, 0)]]); c.fillRect(px - pw, py - pw, pw * 3, pw * 2); c.restore(); }
    for (let i = 0; i < n; i++) orb(c, px + pw * (n === 1 ? 0.5 : 0.18 + 0.64 * i / (n - 1)), py - pw * 0.01 - (i % 2) * pw * 0.06 + Math.sin(t * 2 + i) * 1.5, pw * 0.12, SEQ[i % SEQ.length], t);
    rr(c, px, py, pw, ph, pw * 0.28); ink(c, '#7a5236', Math.max(2, h * 0.012));
    c.save(); rr(c, px, py, pw, ph, pw * 0.28); c.clip(); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px, py + ph * 0.6, pw, ph);
    if (n) { c.fillStyle = rad(c, px + pw / 2, py + ph * 0.3, 0, pw, [[0, rgba(glow, 0.4)], [1, rgba(glow, 0)]]); c.fillRect(px, py, pw, ph); }
    c.restore();
    rr(c, px + pw * 0.15, py + ph * 0.2, pw * 0.7, ph * 0.2, 6); ink(c, '#8c6242', Math.max(1.5, h * 0.01));
    c.restore();
  }
  toon(c, { ...o, style: { ...HERO, ...(o.style || {}) } });
  if (pack > 0) { c.save(); c.translate(x, hipY); c.rotate(lean); thick(c, [[-0.07 * h, -0.26 * h], [-0.055 * h, -0.05 * h]], h * 0.028, '#5a3a24', Math.max(1.5, h * 0.01)); c.restore(); }
}
// a flying orb from (ax,ay) to (bx,by), progress p
function fly(c, ax, ay, bx, by, p, col, t, r = 14) { if (p <= 0 || p >= 1) return; const x = lerp(ax, bx, p), y = lerp(ay, by, p) - Math.sin(p * Math.PI) * 140; for (let i = 1; i < 6; i++) { const q = Math.max(0, p - i * 0.03); c.globalAlpha = 0.25 * (1 - i / 6); orb(c, lerp(ax, bx, q), lerp(ay, by, q) - Math.sin(q * Math.PI) * 140, r * (1 - i * 0.1), col, t); } c.globalAlpha = 1; orb(c, x, y, r, col, t); }

// the city street: sky, two rows of buildings scrolling at different speeds, the pavement, lamps
function city(c, t, scroll = 0, o = {}) {
  const dusk = o.dusk || 0, gloom = o.gloom || 0;
  sky(c, mix(mix('#7fc4ff', '#2a3566', dusk), '#3a4252', gloom), mix(mix('#ffe7c2', '#f39a6b', dusk), '#5b6270', gloom), 0, 700);
  if (!gloom) sun(c, 420, 220 + dusk * 200, 34, '#ffe08a', 0.5);
  const row = (speed, base, hgt, col, win, seed, y0) => {
    const r = rng(seed), widths = []; let tot = 0; for (let i = 0; i < 12; i++) { const w = 60 + r() * 60; widths.push([w, hgt * (0.5 + r() * 0.5), r()]); tot += w; }
    let x = -((scroll * speed) % tot) - 40;
    for (let k = 0; k < 2; k++) for (const [w, hh, q] of widths) {
      if (x > W + 20) break;
      if (x + w > -20) { rr(c, x, y0 - hh, w - 6, hh + 10, 4); ink(c, col, 3);
        for (let wy = y0 - hh + 14; wy < y0 - 20; wy += 26) for (let wx = x + 10; wx < x + w - 22; wx += 20) { const lit = noise1(wx * 0.37 + wy * 0.11 + seed) > 0.1 - dusk * 0.4; c.fillStyle = lit ? rgba(win, 0.35 + dusk * 0.55) : 'rgba(0,0,0,0.18)'; c.fillRect(wx, wy, 11, 14); } }
      x += w;
    }
  };
  row(0.25, 0, 330, mix(mix('#9db3d6', '#3a4570', dusk), '#4a5060', gloom), '#fff2b0', 3, 640);
  row(0.6, 0, 260, mix(mix('#c98f6a', '#5a4058', dusk), '#555a66', gloom), '#ffe08a', 9, 700);
  // pavement
  c.fillStyle = mix(mix('#b7aea3', '#5e5866', dusk), '#4c4f57', gloom); c.fillRect(-60, 700, W + 120, 400);
  c.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = -1; i < 9; i++) { const x = i * 80 - ((scroll) % 80); c.fillRect(x, 700, 3, 300); }
  thick(c, [[-60, 700], [W + 60, 700]], 5, mix('#8a8278', '#3a3640', dusk), 0);
  // lamp posts
  for (let i = -1; i < 4; i++) { const x = i * 260 - (scroll * 1.0) % 260 + 60; thick(c, [[x, 700], [x, 470], [x + 26, 455]], 8, '#2e2c36', 2.5); circ(c, x + 30, 462, 9); ink(c, dusk > 0.4 || gloom ? '#ffe08a' : '#f4ecd8', 2.5); if (dusk > 0.4 || gloom) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x + 30, 470, 4, 120, [[0, 'rgba(255,220,140,0.35)'], [1, 'rgba(255,220,140,0)']]); c.fillRect(x - 100, 350, 260, 260); c.restore(); } }
}

export default {
  slug: 'man-who-carried-everything',
  title: 'वो जो सबका बोझ उठाता था',
  accent: '#7fd3ff',
  grade: { col: '#2a4a6e', amt: 0.14 },
  music: tl => ({ root: 47, scale: 'minor', prog: [0, 3, 5, 6], chord: 5, level: 0.22, warmth: 900, pulse: false, dyn: [[tl.at('heavy').start, 1.3, 1], [tl.at('fall').start, 0.4, 0.2], [tl.at('twist').start - 1, 1.6, 1], [tl.at('final').start, 1.1, 1]] }),
  ambience: tl => [{ type: 'city', from: 0, to: tl.at('twist').start }, { type: 'rain', from: tl.at('heavy').start + 1, to: tl.at('answer').start + tl.at('answer').dur, gain: 1.1 }, { type: 'drone', from: tl.at('twist').start, to: tl.at('final').start, gain: 0.8 }, { type: 'birds', from: tl.at('final').start, to: tl.total, gain: 0.8 }],
  cover: { shot: 'twist', at: 0.6 },
  shots: [
    // 0. hook: a heavy glowing pack and a smile that is holding on
    { id: 'hook', min: 4.6, vo: 'इस आदमी की पीठ पर | एक बैग है... || जो किसी को *दिखता* नहीं।', sfx: [[0.15, 'boom'], [1.0, 'heartbeat', { n: 4, gap: 0.8, gain: 0.6 }]],
      draw(c, t, S) {
        c.fillStyle = '#0b0a14'; c.fillRect(0, 0, W, H);
        c.fillStyle = rad(c, 270, 420, 30, 420, [[0, 'rgba(255,200,120,0.28)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.6, 1.15, E(t, 0, S.dur, ease.out)), x: 250, y: 470 });
        const [sx, sy] = shake(t, 1.2, 20);
        carrier(c, { x: 300 + sx, y: 860, h: 520, face: 0.85, t, pack: 3, glow: '#ffb85a', expr: 'happy', sweat: true, pose: { lean: 0.18, armF: [0.5, 1.3], armB: [0.6, 1.2] }, look: [0.6, -0.2], rim: '#ffd27a' });
        c.restore();
        dust(c, 3, 22, t, [0, 200, W, 600], '#ffd27a', 1.8, -10, 0.6);
      } },
    // 1. every day, smiling through the city
    { id: 'walk', min: 4.5, tr: 'black', vo: 'वो हर दिन | मुस्कुराते हुए | शहर से गुज़रता।', sfx: [[0.1, 'steps', { n: 9, gap: 0.45, gain: 0.22 }]],
      draw(c, t, S) {
        const sc = t * 90;
        c.save(); cam(c, { z: 1.1, x: 260, y: 560 });
        city(c, t, sc);
        carrier(c, { x: 220, y: 790, h: 290, face: 1, t, pack: 0.3, expr: 'happy', pose: { walk: walkPhase(t, 90, 290) * 1.6 } });
        c.restore();
      } },
    // 2. the friend gives his sadness
    { id: 'friend', min: 4.6, vo: 'दोस्त ने उसे | अपनी *उदासी* दे दी...', sfx: [[1.2, 'whoosh', { f: 500, f2: 1500, dur: 0.6 }], [1.9, 'pop', { f: 260 }]],
      draw(c, t, S) {
        const p = E(t, 1.1, 1.9, ease.inOut), pack = t > 1.9 ? 0.9 : 0.3;
        c.save(); cam(c, { z: 1.12, x: 280, y: 560 });
        city(c, t, 400);
        toon(c, { x: 410, y: 790, h: 280, face: -1, t, style: FRIEND, expr: 'cry', pose: { armF: t < 1.9 ? [lerp(0.5, 1.6, E(t, 0.3, 1.1)), 0.2] : [0.3, 0.3] } });
        carrier(c, { x: 180, y: 790, h: 290, face: 1, t, pack: pack, expr: t > 1.9 ? 'happy' : 'worried', sq: t > 1.9 && t < 2.2 ? 0.04 : 0, look: [1, 0] });
        const [bx, by] = packTop(180, 790, 290, pack, 0);
        if (t < 1.1) orb(c, 410 - 120, 790 - 175 + Math.sin(t * 3) * 3, 15, ORB.sad, t);
        fly(c, 290, 615, bx, by, p, ORB.sad, t);
        if (t > 1.9)
        c.restore();
      } },
    // 3. the colleague gives his responsibilities
    { id: 'coll', min: 4.2, tr: 'slide', vo: 'साथी ने अपनी *ज़िम्मेदारियाँ*...', sfx: [[0.9, 'paper', { n: 8, gain: 0.2 }], [1.0, 'whoosh', { f: 500, f2: 1500, dur: 0.6 }], [1.7, 'pop', { f: 220 }]],
      draw(c, t, S) {
        const p = E(t, 0.9, 1.7), pack = t > 1.7 ? 1.5 : 0.9;
        c.save(); cam(c, { z: 1.12, x: 280, y: 560 });
        city(c, t, 900);
        toon(c, { x: 410, y: 790, h: 290, face: -1, t, style: COLL, expr: 'worried', talk: t < 0.9 ? 0.6 : 0, pose: { armF: [lerp(0.4, 1.7, E(t, 0.2, 0.9)), 0.2] }, hold: t < 0.9 ? (c) => { rr(c, -18, 0, 36, 44, 3); ink(c, '#f4f0e6', 2); } : null });
        carrier(c, { x: 180, y: 790, h: 290, face: 1, t, pack: pack, expr: 'happy', sq: t > 1.7 && t < 2 ? 0.05 : 0, look: [1, 0] });
        const [bx, by] = packTop(180, 790, 290, pack, 0);
        fly(c, 290, 610, bx, by, p, ORB.work, t, 16);
        c.restore();
      } },
    // 4. the family gives their expectations
    { id: 'family', min: 4.4, tr: 'slide', vo: 'और घरवालों ने अपनी *उम्मीदें*।', sfx: [[0.8, 'whoosh', { f: 500, f2: 1500, dur: 0.6 }], [1.5, 'pop', { f: 200 }], [1.3, 'whoosh', { f: 500, f2: 1500, dur: 0.6 }], [2.0, 'pop', { f: 180 }]],
      draw(c, t, S) {
        const p1 = E(t, 0.7, 1.5), p2 = E(t, 1.2, 2.0), pack = t > 2.0 ? 2.3 : t > 1.5 ? 1.9 : 1.5;
        c.save(); cam(c, { z: 1.12, x: 290, y: 560 });
        city(c, t, 1500, { dusk: 0.4 });
        toon(c, { x: 470, y: 790, h: 270, face: -1, t, style: DAD, expr: 'determined', pose: { armF: [lerp(0.3, 1.6, E(t, 0.1, 0.7)), 0.2] } });
        toon(c, { x: 380, y: 790, h: 260, face: -1, t, style: MOM, expr: 'smirk', pose: { armF: [lerp(0.3, 1.7, E(t, 0.4, 1.2)), 0.1] } });
        carrier(c, { x: 170, y: 790, h: 290, face: 1, t, pack: pack, expr: 'happy', sweat: t > 2, sq: t > 2 && t < 2.3 ? 0.06 : 0, look: [1, 0], pose: { lean: t > 2 ? 0.08 : 0 } });
        const [bx, by] = packTop(170, 790, 290, pack, t > 2 ? 0.08 : 0);
        fly(c, 420, 610, bx, by, p1, ORB.hope, t, 16); fly(c, 300, 620, bx, by, p2, ORB.hope, t, 16);
        c.restore();
      } },
    // 5. "don't worry, I've got this!"
    { id: 'gotit', min: 3.8, tr: 'cut', vo: [{ text: 'चिंता मत करो, *मैं हूँ ना!*', voice: 'hero' }], sfx: [[0.1, 'sparkle']],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.55, x: 220, y: 520 });
        city(c, t, 1500, { dusk: 0.5 });
        burst(c, 220, 520, 60, 420, 22, 'rgba(255,240,180,0.25)', 1, t);
        carrier(c, { x: 210, y: 790, h: 300, face: 0.7, t, pack: 2.6, expr: 'joy', talk: S.speaking(t, 0) ? 0.8 : 0, sweat: true, pose: { lean: 0.06, armF: [2.2, 1.2] } });
        // a sparkle on the smile
        const k = ease.back(seg(t, 0.6, 1.0)); c.save(); c.globalAlpha = clamp(k); c.fillStyle = '#fff'; star(c, 270, 470, 16 * k, 4 * k, 4, t * 2); c.fill(); c.restore();
        c.restore();
      } },
    // 6. heavier every day, still smiling
    { id: 'heavy', min: 6, tr: 'black', vo: 'बैग हर दिन भारी होता गया... || पर उसकी *मुस्कान* | कभी नहीं उतरी।', sfx: [[0.1, 'steps', { n: 8, gap: 0.7, gain: 0.3, f: 500 }], [2.5, 'thud', { gain: 0.3 }]],
      draw(c, t, S) {
        const k = E(t, 0, S.dur), pack = lerp(2.6, 3.6, k), lean = lerp(0.2, 0.45, k), sc = 1500 + t * 35;
        c.save(); cam(c, { z: 1.1, x: 270, y: 560 });
        city(c, t, sc, { gloom: 1 });
        rain(c, t, 140);
        carrier(c, { x: 230, y: 790, h: 290, face: 1, t, pack: pack, glow: '#ff9a5a', expr: 'happy', sweat: true, pose: { walk: walkPhase(t, 35, 290) * 1.6, amp: 0.45, lean: lean - 0.04, crouch: k * 0.4 } });
        c.restore();
      } },
    // 7. and one day he falls
    { id: 'fall', min: 4.4, tr: 'cut', vo: [{ text: 'और फिर एक दिन... ||| वो *गिर* पड़ा।', delay: 0.6 }], sfx: [[0.5, 'creak', { dur: 0.6, gain: 0.25 }], [1.25, 'thud', { gain: 0.9 }], [1.3, 'boom', { gain: 0.6 }], [1.4, 'pop', { f: 300 }], [1.55, 'pop', { f: 360 }], [1.7, 'pop', { f: 420 }]],
      draw(c, t, S) {
        const k = E(t, 0.4, 1.25, ease.in), [sx, sy] = t > 1.25 && t < 1.6 ? shake(t, 7) : [0, 0];
        c.save(); c.translate(sx, sy); cam(c, { z: 1.15, x: 270, y: 650 });
        city(c, t, 1700, { gloom: 1 });
        rain(c, t, 140);
        // knees buckle, then he falls flat forward
        if (t < 1.25) carrier(c, { x: 240, y: 790, h: 290, face: 1, t, pack: 3.6, glow: '#ff9a5a', expr: 'scared', pose: { lean: lerp(0.45, 1.0, k), crouch: lerp(0.4, 1.2, k), legF: [0.9 * k, -1.6 * k], legB: [0.5 * k, -1.6 * k], armF: [1.4 * k, 0.4] } });
        else {
          c.save(); c.translate(120, 760); c.rotate(Math.PI / 2 - 0.02); carrier(c, { x: 0, y: 0, h: 290, face: 1, t, pack: 3.6, glow: '#ff9a5a', expr: 'closed', noShadow: true, pose: { armF: [2.6, 0.3], armB: [2.4, 0.3] } }); c.restore();
        }
        // spilled orbs rolling away
        if (t > 1.3) { const r = rng(5); for (let i = 0; i < 9; i++) { const p = E(t, 1.3, 3.2, ease.out), dir = r() > 0.5 ? 1 : -1, x = 200 + dir * (40 + r() * 230) * p, y = 770 - Math.abs(Math.sin(p * Math.PI * (1.5 + r()))) * 60 * (1 - p); orb(c, x, y, 12 + r() * 6, [ORB.sad, ORB.work, ORB.hope][i % 3], t); } }
        c.restore();
      } },
    // 8. they gather: why did you never tell us?
    { id: 'ask', min: 5, tr: 'fade', vo: [{ text: 'तुमने हमें कभी बताया क्यों नहीं, | कि तुम इतने *परेशान* थे?', voice: 'f' }],
      draw(c, t, S) {
        const k = E(t, 0, 1.6, ease.out);
        c.save(); cam(c, { z: 1.12, x: 270, y: 560 });
        city(c, t, 1700, { gloom: 1 });
        rain(c, t, 90, 'rgba(180,200,255,0.25)');
        toon(c, { x: lerp(600, 455, k), y: 790, h: 270, face: -1, t, style: MOM, expr: 'cry', talk: S.speaking(t, 0) ? 0.7 : 0, pose: { walk: t < 1.6 ? t * 7 : null, armF: t > 1.6 ? [1.3, 0.6] : undefined } });
        toon(c, { x: lerp(-60, 60, k), y: 790, h: 280, face: 1, t, style: FRIEND, expr: 'shock', pose: { walk: t < 1.6 ? t * 7 : null } });
        toon(c, { x: lerp(660, 530, k), y: 790, h: 290, face: -1, t, style: COLL, expr: 'worried', pose: { walk: t < 1.6 ? t * 7 : null } });
        // he sits up, the pack beside him
        rr(c, 320, 700, 100, 100, 30); ink(c, '#7a5236', 3); orb(c, 345, 700, 12, ORB.hope, t); orb(c, 372, 694, 13, ORB.work, t); orb(c, 398, 702, 11, ORB.sad, t);
        toon(c, { x: 175, y: 790 - 0.02 * 280, h: 280, face: 0.7, t, style: { ...HERO, dirt: true }, expr: 'tired', noShadow: true, pose: { sit: true, legF: [1.6, -0.2], legB: [1.55, -0.2], armB: [-0.5, 0.2], slump: 0.3 } });
        c.restore();
      } },
    // 9. his answer
    { id: 'answer', min: 6, tr: 'fade', vo: [{ text: 'क्योंकि मुझे लगा... || मज़बूत होने का मतलब है, | कभी कुछ *नीचे* न रखना।', voice: 'hero' }], sfx: [[0.2, 'piano', { notes: [59, 62, 66], gap: 0.7, gain: 0.7 }]],
      draw(c, t, S) {
        c.fillStyle = '#141826'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 470 });
        city(c, t, 1700, { gloom: 1 }); c.fillStyle = 'rgba(10,14,30,0.55)'; c.fillRect(-50, -50, W + 100, H + 100);
        rain(c, t, 70, 'rgba(180,200,255,0.22)');
        toon(c, { x: 270, y: 470 + 1000 * 0.72, h: 1000, face: 0.3, t, style: { ...HERO, dirt: true }, expr: 'cry', mouth: S.speaking(t, 0) ? null : 'smile', talk: S.speaking(t, 0) ? 0.45 : 0, noShadow: true, rim: '#9fc8ff', look: [-0.2, 0.5] });
        c.restore();
      } },
    // 10. the twist: he was drowning, and nobody saw
    { id: 'twist', min: 7.5, tr: 'black', lead: 1.0, vo: 'वो सबका बोझ उठाने में इतना खो गया, | कि किसी ने देखा ही नहीं... || वो ख़ुद *डूब* रहा था।', sfx: [[0, 'splash', { gain: 0.6 }], [0.2, 'whoosh', { f: 200, f2: 600, dur: 2 }], [3, 'heartbeat', { n: 4, gap: 1, gain: 0.5 }]],
      draw(c, t, S) {
        const sink = E(t, 0, S.dur, ease.sine);
        c.save(); cam(c, { z: lerp(1.0, 1.08, sink), y: lerp(440, 490, sink) });
        // above the surface: the others, dry and chatting, not looking down
        sky(c, '#ffc58a', '#ffe9c4', -200, 230);
        c.fillStyle = '#8a6a4a'; rr(c, -40, 200, W + 80, 30, 4); ink(c, '#8a6a4a', 3);
        toon(c, { x: 110, y: 200, h: 150, face: 1, t, style: FRIEND, expr: 'happy', talk: Math.sin(t * 2) > 0 ? 0.6 : 0 });
        toon(c, { x: 230, y: 200, h: 155, face: -1, t, style: COLL, expr: 'happy' });
        toon(c, { x: 380, y: 200, h: 145, face: 1, t, style: MOM, expr: 'smirk', talk: Math.sin(t * 2 + 2) > 0 ? 0.6 : 0 });
        toon(c, { x: 460, y: 200, h: 150, face: -1, t, style: DAD, expr: 'happy' });
        // the water
        c.fillStyle = lin(c, 0, 230, 0, 1100, [[0, '#2b7fb8'], [0.4, '#123a6a'], [1, '#050b22']]); c.fillRect(-100, 230, W + 200, 1000);
        c.strokeStyle = 'rgba(200,235,255,0.7)'; c.lineWidth = 3; c.beginPath(); for (let x = -60; x <= W + 60; x += 10) c.lineTo(x, 232 + Math.sin(x * 0.05 + t * 2) * 4); c.stroke();
        rays(c, 270, 220, 0, 0.9, 800, '#bfe6ff', 0.12, t, 6);
        // him, sinking with the pack, among his load
        const y = lerp(560, 760, sink);
        c.save(); c.translate(270, y); c.rotate(0.25 + Math.sin(t * 0.8) * 0.05);
        carrier(c, { x: 0, y: 0, h: 280, face: 0.7, t, pack: 3.4, glow: '#ffb85a', expr: t > 3 ? 'closed' : 'sad', noShadow: true, pose: { armF: [2.6 + Math.sin(t) * 0.2, 0.3], armB: [2.2, 0.4], legF: [0.3, -0.4], legB: [-0.2, -0.3] } });
        c.restore();
        const r = rng(9); for (let i = 0; i < 14; i++) { const ox = r() * W, oy = 380 + r() * 520, col = [ORB.sad, ORB.work, ORB.hope][i % 3]; orb(c, ox + Math.sin(t + i) * 10, oy + Math.sin(t * 0.7 + i) * 12 + sink * 60, 10 + r() * 10, col, t); }
        dust(c, 4, 30, t, [150, 300, 240, 600], '#d8f2ff', 2.2, -45, 0.7);
        c.restore();
      } },
    // 11. the final line: put it down, let them carry their own
    { id: 'final', min: 8, tr: 'iris', vo: 'आप सबकी *परवाह* कर सकते हैं... || बिना सबका बोझ उठाए।', tail: 1.2, sfx: [[0.6, 'thud', { gain: 0.4 }], [1.2, 'chime'], [1.4, 'whoosh', { f: 600, f2: 2400, dur: 1 }], [2.6, 'sparkle']],
      draw(c, t, S) {
        const down = E(t, 0.2, 0.9), give = E(t, 1.2, 2.8, ease.inOut);
        c.save(); cam(c, { z: lerp(1.2, 1.0, E(t, 0, 3)), x: 270, y: 540 });
        city(c, t, 2000, { dusk: 0.15 });
        const people = [[60, FRIEND, 1, 270, ORB.sad], [400, COLL, -1, 285, ORB.work], [490, MOM, -1, 260, ORB.hope]];
        for (const [x, st, f, h, col] of people) { const hasIt = give >= 1; toon(c, { x, y: 790, h, face: f, t, style: st, expr: hasIt ? 'happy' : 'neutral', pose: { armF: hasIt ? [1.5, 0.3] : [0.2, 0.2] }, hold: hasIt ? (c) => orb(c, 0, 14, 11, col, t) : null }); }
        // the pack set down, orbs floating back to their owners
        rr(c, 120, 690, 100, 100, 28); ink(c, '#7a5236', 3);
        for (const [i, [x, , , h, col]] of people.entries()) { if (give > 0 && give < 1) { const p = clamp(give * 1.2 - i * 0.1); orb(c, lerp(170, x + 30, p), lerp(690, 790 - h * 0.35, p) - Math.sin(p * Math.PI) * 140, 13, col, t); } }
        toon(c, { x: 260, y: 790, h: 300, face: 0, t, style: HERO, expr: give > 0.5 ? 'joy' : 'happy', rim: '#ffd27a', pose: down < 1 ? { crouch: Math.sin(down * Math.PI) * 0.6 } : { armF: [lerp(0.3, 2.9, E(t, 2.8, 3.6)), 0], armB: [lerp(0.3, 2.9, E(t, 2.8, 3.6)), 0] } });
        dust(c, 11, 26, t, [0, 300, W, 400], '#fff2c4', 2, -12, 0.7);
        c.restore();
      } },
  ],
};
