// 10. The Man Who Won Every Argument: ego and the need to be right.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, rays, dust, trophy, title, bubble, flash, burst, star, noise1, walkPhase } from '../engine.mjs';

const ME = { top: 'suit', jacket: '#2d3a5a', shirt: '#2d3a5a', tie: '#c94a3a', pants: '#252b3d', hairStyle: 'neat', hair: '#1a1414', skin: '#e2b48e', shoes: '#141018' };
const FRIEND = { shirt: '#e0874a', pants: '#3a3550', hairStyle: 'messy', hair: '#3a2418', skin: '#d9a77c' };
const COLL = { shirt: '#6aa0c8', pants: '#2f3550', hairStyle: 'long', hair: '#5a3220', skin: '#f0c49b' };
const MOM = { hairStyle: 'bun', hair: '#4a4040', shirt: '#9a4a7a', pants: '#4a2a3a', skin: '#d9a77c' };
const DAD = { hairStyle: 'old', hair: '#c9c4bd', shirt: '#6a7a52', pants: '#3d3a2a', skin: '#cf9f78', beard: '#c9c4bd', beardLen: 0.05 };
const SIS = { hairStyle: 'long', hair: '#2a1a1a', shirt: '#4ab09a', pants: '#2a4a4a', skin: '#e0b08a', kid: true };
const GHOST = { shirt: '#a9c6ea', pants: '#8aa6ce', hair: '#9ab6dc', skin: '#c8dcf4', shoes: '#8aa6ce' };
const gold = k => mix('#f2c230', '#8a8a92', k);

// a room: wall, wainscot, floor
function room(c, wall, floor, o = {}) {
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, shade(wall, -0.25)], [1, wall]]); c.fillRect(-80, -80, W + 160, 740);
  c.fillStyle = shade(wall, -0.18); c.fillRect(-80, 470, W + 160, 170); thick(c, [[-80, 470], [W + 80, 470]], 6, shade(wall, 0.15), 2);
  c.fillStyle = lin(c, 0, 640, 0, H, [[0, floor], [1, shade(floor, -0.45)]]); c.fillRect(-80, 640, W + 160, 420);
  thick(c, [[-80, 640], [W + 80, 640]], 5, shade(floor, -0.3), 0);
  if (o.lamp) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, o.lamp[0], o.lamp[1], 10, 420, [[0, 'rgba(255,214,150,0.32)'], [1, 'rgba(255,214,150,0)']]); c.fillRect(-80, -80, W + 160, H + 160); c.restore(); }
}
function hud(c, wins, people, t, a = 1) {
  c.save(); c.globalAlpha = a;
  rr(c, 22, 74, 150, 44, 22); ink(c, 'rgba(20,14,30,0.75)', 2.5); trophy(c, 46, 112, 0.28, '#f2c230'); title(c, 'जीत: ' + wins, 110, 96, 22, { col: '#ffd84a', shadow: false });
  rr(c, W - 172, 74, 150, 44, 22); ink(c, 'rgba(20,14,30,0.75)', 2.5); title(c, 'लोग: ' + people, W - 97, 96, 22, { col: people <= 1 ? '#ff6b6b' : '#bfe3ff', shadow: false });
  c.restore();
}
function popTrophy(c, x, y, t, t0, s = 0.8) { const k = ease.back(seg(t, t0, t0 + 0.45)); if (k <= 0) return; c.save(); c.translate(x, y - (1 - k) * 30); c.scale(k, k); burst(c, 0, -40, 20, 110, 14, 'rgba(255,220,120,0.4)', clamp(1 - seg(t, t0 + 0.4, t0 + 1.4)), t); trophy(c, 0, 0, s, '#f2c230', 0.6 + 0.4 * Math.sin(t * 6)); c.restore(); }
// the debate: two bubbles, his grows and pushes theirs away
function clash(c, t, t0, them, me, xT, xM, y) {
  const k = E(t, t0, t0 + 1.2);
  bubble(c, lerp(xT, xT + 70, k), y - k * 30, 170 * (1 - k * 0.6), 64 * (1 - k * 0.6), k > 0.6 ? '' : them, { alpha: 1 - k * 0.7, size: 20, tail: [-30 + k * 30, 60], col: '#ffffff' });
  const g = E(t, t0 + 0.2, t0 + 1.0, ease.back);
  if (g > 0) bubble(c, xM + g * 20, y - 30, 200 * g + 10, 80 * g + 6, g > 0.5 ? me : '', { size: 26, tail: [20, 70], col: '#ffe9a0', tc: '#8a1a1a' });
}

export default {
  slug: 'man-who-won-every-argument',
  title: 'वो जो हर बहस जीत जाता था',
  accent: '#ffd84a',
  grade: { col: '#4a2a5a', amt: 0.14 },
  music: tl => ({ root: 46, scale: 'harmonic', prog: [0, 5, 3, 4], chord: 5, level: 0.22, warmth: 950, dyn: [[tl.at('montage').start, 1.4, 1], [tl.at('hall').start, 0.6, 0.6], [tl.at('twist').start - 0.5, 1.6, 0.8], [tl.at('final').start, 0.9, 1]] }),
  ambience: tl => [{ type: 'room', from: 0, to: tl.total }, { type: 'crowd', from: tl.at('cafe').start, to: tl.at('gotit').start, gain: 0.6 }, { type: 'drone', from: tl.at('hall').start, to: tl.total, gain: 0.7 }],
  cover: { shot: 'hall', at: 0.6 },
  shots: [
    // 0. hook: the champion on his podium, the applause stops
    { id: 'hook', min: 4.6, vo: 'ये आदमी | ज़िंदगी में कभी कोई बहस नहीं *हारा*।', sfx: [[0.1, 'cheer', { dur: 2.2, gain: 0.2 }], [0.15, 'gong', { gain: 0.5 }]],
      draw(c, t, S) {
        c.fillStyle = '#0b0812'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.25, 1.0, E(t, 0, S.dur, ease.out)), y: 500 });
        rays(c, 270, -40, 0, 0.45, 900, '#fff1c4', 0.22, t, 3);
        c.fillStyle = rad(c, 270, 700, 10, 230, [[0, 'rgba(255,230,160,0.35)'], [1, 'rgba(255,230,160,0)']]); c.fillRect(0, 400, W, 500);
        rr(c, 150, 700, 240, 120, 6); ink(c, '#5a3a6a', 3); title(c, '1', 270, 760, 60, { col: '#ffd84a' });
        toon(c, { x: 270, y: 700, h: 300, face: 0, t, style: ME, expr: 'smirk', pose: { armF: [2.9, 0.1], armB: [2.9, 0.1] } });
        trophy(c, 270, 445 + Math.sin(t * 2) * 3, 0.9, '#f2c230', 0.7 + 0.3 * Math.sin(t * 5));
        // confetti
        const r = rng(4); for (let i = 0; i < 40; i++) { const x = r() * W, sp = 60 + r() * 80, y = ((r() * 900 + t * sp) % 1000) - 50; c.save(); c.translate(x + Math.sin(t * 3 + i) * 10, y); c.rotate(t * 4 + i); c.fillStyle = ['#ffd84a', '#ff6b6b', '#4cc9f0', '#06d6a0'][i % 4]; c.fillRect(-4, -2, 8, 4); c.restore(); }
        c.restore();
      } },
    // 1. smart, and always right
    { id: 'intro', min: 4.4, tr: 'black', vo: 'वो बेहद होशियार था... | और हमेशा *सही* होता था।', sfx: [[0.1, 'steps', { n: 7, gap: 0.5, gain: 0.25 }]],
      draw(c, t, S) {
        const x = lerp(60, 300, E(t, 0, S.dur, ease.sine));
        c.save(); cam(c, { z: 1.1, x: x + 20, y: 540 });
        room(c, '#5b6d8f', '#4a3a3a', { lamp: [300, 120] });
        // a bookcase of fat books
        for (let s = 0; s < 3; s++) { thick(c, [[-60, 230 + s * 80], [W + 400, 230 + s * 80]], 8, '#6b4428', 2); const r = rng(s + 3); for (let x2 = -50; x2 < W + 380; x2 += 22 + r() * 8) { rr(c, x2, 230 + s * 80 - 60 + r() * 10, 18, 56, 3); ink(c, ['#c94a3a', '#3a6ac9', '#3a9a6a', '#c9a23a'][(x2 | 0) % 4], 2); } }
        toon(c, { x, y: 790, h: 300, face: 1, t, style: ME, expr: 'smirk', pose: { walk: walkPhase(t, 45, 300) * 1.5, amp: 0.6, lean: -0.08, armF: [0.2, 1.6] }, hold: (c) => { c.save(); c.rotate(1.3); rr(c, -22, -4, 44, 32, 3); ink(c, '#3a3a6a', 2.5); c.restore(); } });
        c.restore();
        if (t > 1.5) { const a = ease.back(seg(t, 1.5, 1.9)); c.save(); c.translate(W / 2, 250); c.scale(a, a); title(c, 'IQ: 160', 0, 0, 40, { col: '#9fe0ff' }); c.restore(); }
      } },
    // 2. the friend at the café
    { id: 'cafe', min: 5.4, tr: 'fade', vo: 'दोस्त कुछ कहते, | तो वो फ़ौरन उन्हें *ग़लत* साबित कर देता।', sfx: [[1.2, 'whoosh', { f: 400, f2: 1500, dur: 0.5 }], [2.1, 'chime'], [3.0, 'steps', { n: 4, gap: 0.5, gain: 0.2 }]],
      draw(c, t, S) {
        const leave = E(t, 2.8, S.dur), alpha = 1 - E(t, 3.4, S.dur);
        c.save(); cam(c, { z: 1.12, x: 280, y: 540 });
        room(c, '#b8865a', '#5a3a2a', { lamp: [270, 150] });
        rr(c, 60, 140, 170, 200, 8); ink(c, '#cfe8ff', 4); thick(c, [[145, 140], [145, 340]], 6, '#6b4428', 0);
        toon(c, { x: lerp(400, 600, leave), y: 790, h: 285, face: leave > 0 ? 1 : -1, t, style: FRIEND, expr: t < 1.2 ? 'happy' : 'sad', talk: t < 1.2 ? 0.7 : 0, alpha, pose: leave > 0 ? { walk: t * 6 } : { armF: [1.0, 0.8] } });
        toon(c, { x: 160, y: 790, h: 300, face: 1, t, style: ME, expr: t > 1.2 ? 'smirk' : 'neutral', talk: t > 1.2 && t < 2.4 ? 1 : 0, pose: t > 1.2 ? { armF: [1.7, -0.2] } : {} });
        // café table in front
        rr(c, 200, 690, 150, 14, 4); ink(c, '#6b4428', 3); thick(c, [[275, 700], [275, 800]], 10, '#4a2a18');
        c.save(); rr(c, 255, 664, 26, 26, 4); ink(c, '#f4f0e6', 2.5); c.restore();
        clash(c, t, 0.4, 'मुझे लगता है...', 'ग़लत!', 410, 200, 430);
        popTrophy(c, 160, 360, t, 2.0, 0.6);
        c.restore();
      } },
    // 3. the office meeting
    { id: 'office', min: 5.2, tr: 'slide', vo: 'दफ़्तर की हर मीटिंग में, | उसने हर किसी को *हरा* दिया।', sfx: [[1.0, 'whoosh', { f: 400, f2: 1500, dur: 0.5 }], [1.9, 'chime', { notes: [79, 83, 86, 91] }], [2.8, 'steps', { n: 4, gap: 0.5, gain: 0.2 }]],
      draw(c, t, S) {
        const leave = E(t, 2.6, S.dur), alpha = 1 - E(t, 3.2, S.dur);
        c.save(); cam(c, { z: 1.12, x: 280, y: 540 });
        room(c, '#7f97ad', '#3f4652', { lamp: [270, 100] });
        // the whiteboard with a chart, then crossed out
        c.save(); c.translate(0, 70); rr(c, 270, 170, 230, 160, 6); ink(c, '#fbfbf6', 4);
        c.strokeStyle = '#3a6ac9'; c.lineWidth = 4; c.beginPath(); c.moveTo(290, 300); c.lineTo(340, 260); c.lineTo(390, 280); c.lineTo(470, 200); c.stroke();
        if (t > 1.3) { const k = E(t, 1.3, 1.7); c.strokeStyle = '#d9333f'; c.lineWidth = 7; c.beginPath(); c.moveTo(290, 190); c.lineTo(lerp(290, 480, k), lerp(190, 310, k)); c.stroke(); c.beginPath(); c.moveTo(480, 190); c.lineTo(lerp(480, 290, k), lerp(190, 310, k)); c.stroke(); }
        c.restore();
        toon(c, { x: lerp(400, 620, leave), y: 790, h: 280, face: leave > 0 ? 1 : -1, t, style: COLL, expr: t < 1.0 ? 'happy' : 'worried', talk: t < 1.0 ? 0.6 : 0, alpha, pose: leave > 0 ? { walk: t * 6 } : { armF: [2.2, 0.3] } });
        toon(c, { x: 150, y: 790, h: 300, face: 1, t, style: ME, expr: 'angry', talk: t > 0.9 && t < 2.2 ? 1 : 0, pose: { armF: [1.8, -0.1], lean: 0.08 } });
        rr(c, 60, 700, 420, 18, 5); ink(c, '#2e3540', 3);
        clash(c, t, 0.3, 'मेरा आइडिया...', 'बकवास!', 400, 190, 420);
        popTrophy(c, 150, 360, t, 1.9, 0.6);
        c.restore();
        hud(c, 2, 9, t, 1);
      } },
    // 4. "I can never be wrong"
    { id: 'gotit', min: 3.8, tr: 'cut', vo: [{ text: 'मैं *ग़लत* हो ही नहीं सकता।', voice: 'hero' }], sfx: [[0.1, 'hit', { gain: 0.5 }], [0.2, 'sparkle']],
      draw(c, t, S) {
        c.fillStyle = '#2a1a3a'; c.fillRect(0, 0, W, H);
        burst(c, 270, 470, 60, 600, 26, 'rgba(255,216,74,0.18)', 1, t);
        c.save(); cam(c, { z: lerp(1.0, 1.06, S.p), y: 470 });
        toon(c, { x: 270, y: 470 + 900 * 0.72, h: 900, face: 0.2, t, style: ME, expr: 'smirk', talk: S.speaking(t, 0) ? 0.7 : 0, noShadow: true, look: [0.4, -0.2] });
        c.restore();
        const k = ease.back(seg(t, 0.4, 0.8)); c.save(); c.globalAlpha = clamp(k); c.fillStyle = '#fff'; star(c, 330, 520, 18 * k, 4 * k, 4, t * 2); c.fill(); c.restore();
      } },
    // 5. each win: a trophy comes, a person goes
    { id: 'montage', min: 6.4, tr: 'black', vo: 'हर जीत के साथ | एक *ट्रॉफ़ी* आती... || और एक इंसान चला जाता।', sfx: [[0.6, 'chime'], [1.6, 'chime', { notes: [77, 81, 84, 89] }], [2.6, 'chime', { notes: [79, 83, 86, 91] }], [3.6, 'chime', { notes: [81, 84, 88, 93] }], [4.6, 'chime', { notes: [72, 76, 79, 84] }]],
      draw(c, t, S) {
        const n = clamp(Math.floor((t - 0.6) / 1.0) + 1, 0, 5);
        c.save(); cam(c, { z: 1.2, x: 280, y: 600 });
        room(c, '#6a4a7a', '#3a2a3a', { lamp: [150, 200] });
        thick(c, [[20, 520], [300, 520]], 10, '#8a5a34', 2);
        for (let i = 0; i < 5; i++) if (i < n) { const k = ease.back(seg(t, 0.6 + i, 1.0 + i)); c.save(); c.translate(45 + i * 55, 515); c.scale(k, k); trophy(c, 0, 0, 0.45, '#f2c230', 0.5); c.restore(); }
        toon(c, { x: 150, y: 790, h: 300, face: 1, t, style: ME, expr: 'smirk', pose: { armF: [0.9, 1.6], armB: [0.9, 1.6] } });
        const crowd = [FRIEND, COLL, MOM, DAD, SIS];
        crowd.forEach((st, i) => {
          const tg = 0.6 + i * 1.0, go = E(t, tg, tg + 0.9), alpha = 1 - go;
          if (alpha <= 0.01) return;
          const x = 300 + i * 46 + go * 120;
          toon(c, { x, y: 790 - i * 6, h: st.kid ? 200 : 250 - i * 6, face: go > 0 ? 1 : -1, t, style: st, expr: go > 0 ? 'sad' : 'neutral', alpha, pose: go > 0 ? { walk: t * 7 } : {} });
        });
        c.restore();
        hud(c, 2 + n, 9 - n, t);
      } },
    // 6. the family dinner, chairs emptying
    { id: 'dinner', min: 6.4, tr: 'black', vo: 'धीरे-धीरे | दोस्त ग़ायब हो गए... || घरवालों ने भी | उससे बात करना *बंद* कर दिया।', sfx: [[1.4, 'whoosh', { f: 300, f2: 900, dur: 0.8, gain: 0.2 }], [2.8, 'whoosh', { f: 300, f2: 900, dur: 0.8, gain: 0.2 }], [4.2, 'whoosh', { f: 300, f2: 900, dur: 0.8, gain: 0.2 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.18, 1.26, S.p), x: 280, y: 590 });
        room(c, '#8a5a3a', '#4a2a1a', { lamp: [290, 200] });
        // chandelier
        thick(c, [[290, -20], [290, 300]], 4, '#3a2a1a', 0); rr(c, 240, 300, 100, 20, 8); ink(c, '#c9a23a', 3); for (let i = 0; i < 4; i++) { circ(c, 252 + i * 25, 295, 7); c.fillStyle = '#fff1b0'; c.fill(); }
        const fam = [[260, MOM, 1.2], [360, DAD, 2.6], [455, SIS, 4.0]];
        for (const [x, st, tg] of fam) {
          rr(c, x - 45, 420, 90, 260, 14); ink(c, '#5a3420', 3);   // chair back
          const a = 1 - E(t, tg, tg + 1.0);
          if (a > 0.01) toon(c, { x, y: 735, h: st.kid ? 250 : 280, face: -0.6, t, style: st, expr: t > tg - 0.6 ? 'sad' : 'worried', alpha: a, look: [-1, 0.2] });
        }
        toon(c, { x: 120, y: 730, h: 300, face: 1, t, style: ME, expr: 'angry', talk: (t % 2) < 1.2 ? 0.9 : 0, pose: { armF: [1.7 + Math.sin(t * 4) * 0.2, -0.1] } });
        // the table
        rr(c, 40, 640, 470, 22, 6); ink(c, '#6b3a20', 3); c.fillStyle = '#f4ecdc'; c.fillRect(46, 630, 458, 12);
        for (const x of [260, 360, 455]) { ell(c, x, 630, 26, 7); ink(c, '#fbfbf6', 2); }
        rr(c, 60, 662, 430, 140, 4); ink(c, '#5a2e18', 3);
        c.restore();
        const gone = (t > 2.2 ? 1 : 0) + (t > 3.6 ? 1 : 0) + (t > 5.0 ? 1 : 0);
        hud(c, 7, Math.max(0, 4 - gone - 1), t);
      } },
    // 7. alone in a magnificent hall of trophies
    { id: 'hall', min: 6.6, tr: 'black', vo: 'और एक दिन, | वो अपनी जीतों से भरे | एक शानदार कमरे में खड़ा था... ||| बिल्कुल *अकेला*।', sfx: [[0.3, 'steps', { n: 7, gap: 0.62, gain: 0.35, f: 900 }], [4.8, 'bell', { f: 330, gain: 0.6 }]],
      draw(c, t, S) {
        const pull = E(t, 0, S.dur, ease.inOut);
        c.save(); cam(c, { z: lerp(1.35, 0.92, pull), x: 270, y: lerp(620, 500, pull) });
        hall(c, t, 0);
        const x = lerp(200, 270, E(t, 0.3, 4.5));
        toon(c, { x, y: 800, h: 230, face: t < 4.5 ? 1 : 0, t, style: ME, expr: t < 4.5 ? 'neutral' : 'worried', look: t < 4.5 ? [1, -0.4] : [Math.sin(t * 1.4), -0.4], pose: t < 4.5 ? { walk: t * 5.5, amp: 0.5 } : {} });
        c.restore();
      } },
    // 8. "why does winning feel so lonely?"
    { id: 'ask', min: 5, tr: 'fade', vo: [{ text: 'जीतना... || इतना *अकेला* क्यों लगता है?', voice: 'hero', rate: '-8%' }], sfx: [[0.1, 'piano', { notes: [58, 61, 65], gap: 0.6, gain: 0.7 }], [2.6, 'whisper', { dur: 2, gain: 0.05 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 470 });
        hall(c, t, 0.2); c.fillStyle = 'rgba(10,5,20,0.45)'; c.fillRect(-100, -100, W + 200, H + 200);
        toon(c, { x: 270, y: 470 + 950 * 0.72, h: 950, face: 0.25, t, style: ME, expr: 'sad', talk: S.speaking(t, 0) ? 0.5 : 0, noShadow: true, look: [0.3, -0.5], rim: '#ffd88a', tears: t > 2.5 });
        c.restore();
      } },
    // 9. the twist: every trophy cost a person
    { id: 'twist', min: 7, tr: 'cut', lead: 1.6, vo: 'उसने हर बहस जीती... || पर लगभग हर *रिश्ता* | हार गया।', sfx: [[0, 'riser', { dur: 1.5 }], [1.5, 'boom'], [1.6, 'shatter']],
      draw(c, t, S) {
        const k = E(t, 1.5, 4.5);
        c.save(); cam(c, { z: lerp(1.0, 0.92, k), y: 520 });
        hall(c, t, k);
        // the trophies' shine leaves them, and the people they cost walk away as ghosts
        const ghosts = [FRIEND, COLL, MOM, DAD, SIS];
        if (t > 1.5) ghosts.forEach((st, i) => { const p = E(t, 1.6 + i * 0.25, 5.5 + i * 0.25), gx = [70, 150, 390, 470, 300][i]; toon(c, { x: gx + (gx < 270 ? -1 : 1) * p * 120, y: 790 - p * 60, h: (st.kid ? 190 : 240) * (1 - p * 0.3), face: gx < 270 ? -1 : 1, t, style: { ...st, ...GHOST, hairStyle: st.hairStyle, kid: st.kid }, expr: 'sad', alpha: 0.55 * (1 - p * 0.7) * clamp((t - 1.6 - i * 0.25) * 3), pose: { walk: t * 4 } }); });
        toon(c, { x: 270, y: 800, h: 240, face: 0, t, style: ME, expr: t > 1.6 ? 'shock' : 'worried', look: [Math.sin(t * 1.3), 0], pose: { armF: [0.6, 1.2], armB: [0.6, 1.2] } });
        c.restore();
        if (t < 1.9) flash(c, t > 1.5 ? 0.8 * (1 - seg(t, 1.5, 1.9)) : 0);
        if (t > 3) { const a = ease.back(seg(t, 3, 3.5)); c.save(); c.translate(W / 2, 140); c.scale(a, a); title(c, 'जीत: 99   ·   लोग: 0', 0, 0, 34, { col: '#ff8a8a' }); c.restore(); }
      } },
    // 10. the final line: dinner with trophies
    { id: 'final', min: 8, tr: 'black', vo: 'कभी-कभी | अहंकार को बचाने की *क़ीमत*... || वही लोग होते हैं, | जिनके सामने | हम ख़ुद को साबित करना चाहते थे।', tail: 1.1, sfx: [[0.3, 'stinger', { gain: 0.6 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.4, 1.12, E(t, 0, S.dur, ease.out)), x: 280, y: 590 });
        room(c, '#4a3040', '#2a1a1a');
        c.fillStyle = 'rgba(5,3,10,0.5)'; c.fillRect(-80, -80, W + 160, H + 160);
        // one candle
        const fl = 0.85 + 0.15 * noise1(t * 7);
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 300, 590, 5, 330 * fl, [[0, 'rgba(255,190,110,0.5)'], [1, 'rgba(255,190,110,0)']]); c.fillRect(-80, -80, W + 160, H + 160); c.restore();
        for (const x of [260, 360, 455]) { rr(c, x - 45, 420, 90, 260, 14); ink(c, '#3a2018', 3); trophy(c, x, 630, 0.75, '#c9a23a', 0.3); }
        toon(c, { x: 120, y: 735, h: 300, face: 0.6, t, style: ME, expr: 'sad', look: [1, 0.3], rim: '#ffb870', pose: { slump: 0.4, armF: [1.3, 0.8] } });
        rr(c, 40, 640, 470, 22, 6); ink(c, '#4a2a18', 3); c.fillStyle = '#d8d0c0'; c.fillRect(46, 630, 458, 12);
        rr(c, 60, 662, 430, 140, 4); ink(c, '#3a1e10', 3);
        rr(c, 293, 560, 14, 60, 3); ink(c, '#f4ecdc', 2); c.fillStyle = '#ffcf6a'; ell(c, 300, 548 - fl * 4, 6, 12 * fl); c.fill();
        dust(c, 13, 18, t, [0, 200, W, 500], '#ffcf8a', 1.4, -6, 0.5);
        c.restore();
      } },
  ],
};
// the grand hall of trophies; dull 0..1 turns the gold grey
function hall(c, t, dull) {
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#2a0f1a'], [1, '#5a1f2a']]); c.fillRect(-120, -120, W + 240, 780);
  for (const x of [20, 520]) { rr(c, x - 26, 60, 52, 590, 4); ink(c, '#c9b48a', 3); rr(c, x - 36, 50, 72, 24, 3); ink(c, '#d8c49a', 3); }
  for (let row = 0; row < 3; row++) {
    const y = 250 + row * 125; thick(c, [[50, y], [490, y]], 10, '#6b3a20', 2);
    for (let i = 0; i < 8; i++) { const x = 78 + i * 55, sh = (1 - dull) * (0.5 + 0.5 * Math.sin(t * 3 + i + row * 2)); trophy(c, x, y - 5, 0.42, gold(dull), sh); }
  }
  c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#3a1a20'], [1, '#12060a']]); c.fillRect(-120, 640, W + 240, 420);
  c.fillStyle = mix('#a8202e', '#4a3a40', dull); poly(c, [[230, 640], [310, 640], [430, 1000], [110, 1000]]); c.fill();
  rays(c, 270, -60, 0, 0.35, 950, '#fff1c4', 0.16 * (1 - dull * 0.7), t, 3);
  dust(c, 17, 30, t, [80, 100, 380, 700], '#ffe6a8', 1.5, -5, 0.6 * (1 - dull * 0.5));
}
