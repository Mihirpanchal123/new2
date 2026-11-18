// 8. The Man Who Wanted to Become Perfect: perfectionism and procrastination.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, rays, dust, clock, frame, title, bubble, flash, burst, star, noise1 } from '../engine.mjs';

const ART = { shirt: '#e6dcc6', apron: '#5f86b3', beret: '#b8384a', hair: '#2b1d18', hairStyle: 'short', pants: '#3d3a4a', skin: '#e8b48c', shoes: '#3a2a22' };
const aged = k => ({ ...ART, hair: mix('#2b1d18', '#cfcac2', k), beard: k > 0.15 ? mix('#2b1d18', '#d8d3cb', k) : null, beardLen: k * 0.3, apron: mix('#5f86b3', '#5c6470', k) });
const OLDART = { top: 'robe', robe: '#5b4a7a', trim: '#e8d9b0', shirt: '#5b4a7a', hair: '#e9e5de', hairStyle: 'old', beard: '#ece8e0', beardLen: 0.55, skin: '#dcae88', shoes: '#2a2026' };
const PAINT = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f43'];

// the studio: warm plaster wall, big window, wooden floor, the easel with its canvas
function studio(c, t, o = {}) {
  const age = o.age || 0, night = o.night || 0;
  c.fillStyle = lin(c, 0, 0, 0, 700, [[0, mix('#c9a57a', '#5d4e48', age)], [1, mix('#e8cfa6', '#7a6a60', age)]]); c.fillRect(-60, -60, W + 120, 760);
  // plaster stains
  const r = rng(8); c.fillStyle = 'rgba(120,80,40,0.045)'; for (let i = 0; i < 9; i++) { ell(c, r() * W, r() * 600, 30 + r() * 50, 18 + r() * 30); c.fill(); }
  // window
  const wx = 40, wy = 110, ww = 170, wh = 230;
  rr(c, wx - 10, wy - 10, ww + 20, wh + 20, 6); ink(c, '#7a5638', 3);
  c.fillStyle = lin(c, 0, wy, 0, wy + wh, night > 0.5 ? [[0, '#101a3a'], [1, '#2a3560']] : [[0, '#8fcaf7'], [1, '#ffe8be']]); c.fillRect(wx, wy, ww, wh);
  c.strokeStyle = '#7a5638'; c.lineWidth = 7; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
  // floor
  c.fillStyle = lin(c, 0, 690, 0, H, [[0, mix('#8a5d3b', '#4a3a32', age)], [1, mix('#5a3a24', '#2a201c', age)]]); c.fillRect(-60, 690, W + 120, 400);
  c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 6; i++) { const y = 700 + i * i * 9 + i * 12; c.moveTo(-60, y); c.lineTo(W + 60, y); } c.stroke();
  thick(c, [[-60, 690], [W + 60, 690]], 5, mix('#6b4428', '#3a2c26', age), 0);
  if (o.wall) o.wall(c);
  if (!night) rays(c, wx + ww / 2, wy + wh / 2, -0.75, 0.35, 780, '#fff1c8', 0.15 * (1 - age * 0.6), t, 4);
  dust(c, 21, 30 + age * 40, t, [0, 100, W, 600], '#fff2d0', 1.5, -4, 0.5 + age * 0.3);
}
function easel(c, x, y, s = 1, draw) {
  c.save(); c.translate(x, y); c.scale(s, s);
  thick(c, [[-70, 0], [0, -330]], 11, '#8a5a34'); thick(c, [[70, 0], [0, -330]], 11, '#8a5a34'); thick(c, [[0, 10], [0, -300]], 9, '#74492a');
  rr(c, -86, -110, 172, 12, 3); ink(c, '#74492a', 3);
  rr(c, -78, -300, 156, 190, 3); ink(c, '#fbf8f0', 3);
  c.save(); c.beginPath(); c.rect(-78, -300, 156, 190); c.clip(); c.translate(-78, -300); if (draw) draw(c, 156, 190); c.restore();
  c.restore();
}
function paperBall(c, x, y, r, seed, rot = 0) {
  const R = rng(seed); const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; pts.push([Math.cos(a) * r * (0.8 + R() * 0.35), Math.sin(a) * r * (0.8 + R() * 0.35)]); }
  c.save(); c.translate(x, y); c.rotate(rot); blob(c, pts); ink(c, '#f4f0e6', 2.5);
  c.strokeStyle = 'rgba(80,60,40,0.45)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo((R() - .5) * r, (R() - .5) * r); c.lineTo((R() - .5) * r * 1.2, (R() - .5) * r * 1.2); } c.stroke(); c.restore();
}
function balls(c, n, seed, t, top = 700) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = R() * (W + 40) - 20, row = Math.floor(i / 22), y = 900 - row * 22 + R() * 30; if (y < top) continue; paperBall(c, x, y, 14 + R() * 8, seed + i, R() * 6); } }
// stacks of blank canvases (leaning rows filling a wall)
function blanks(c, x0, y0, w, h, cols, rows, seed, color = 0, t = 0) {
  const R = rng(seed), cw = w / cols, ch = h / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = x0 + k * cw + (R() - .5) * 6, y = y0 + r * ch + (R() - .5) * 4, rot = (R() - .5) * 0.06;
    c.save(); c.translate(x + cw / 2, y + ch / 2); c.rotate(rot);
    rr(c, -cw * 0.45, -ch * 0.45, cw * 0.9, ch * 0.9, 2); ink(c, '#fbf8f0', 2);
    if (color > 0) { // colour spreading from the brush stroke
      const d = Math.hypot(x - 270, y - 420) / 600; const k2 = clamp((color - d) * 3);
      if (k2 > 0) {
        c.globalAlpha = k2; const col = PAINT[(r * 7 + k * 3) % PAINT.length], col2 = PAINT[(r + k * 5 + 2) % PAINT.length], m = (r * 3 + k * 2) % 4, ox = (R() - .5) * cw * 0.3, oy = (R() - .5) * ch * 0.3;
        c.save(); c.beginPath(); c.rect(-cw * 0.45, -ch * 0.45, cw * 0.9, ch * 0.9); c.clip();
        if (m === 0) { c.fillStyle = col; ell(c, ox, oy, cw * 0.3, ch * 0.28, R() * 3); c.fill(); }
        else if (m === 1) { c.fillStyle = col; c.fillRect(-cw * 0.45, ch * 0.05, cw * 0.9, ch * 0.4); c.fillStyle = col2; circ(c, cw * 0.15, -ch * 0.15, cw * 0.12); c.fill(); }
        else if (m === 2) { c.fillStyle = col; poly(c, [[-cw * 0.4, ch * 0.4], [ox, -ch * 0.3], [cw * 0.4, ch * 0.4]]); c.fill(); }
        else { c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(-cw * 0.4, oy); c.bezierCurveTo(-cw * 0.1, -ch * 0.4, cw * 0.1, ch * 0.4, cw * 0.4, oy); c.stroke(); }
        c.strokeStyle = col2; c.lineWidth = 3; c.beginPath(); c.moveTo(-cw * 0.35, ch * 0.25); c.quadraticCurveTo(0, -ch * 0.3 + oy, cw * 0.35, ch * 0.15); c.stroke();
        c.restore(); c.globalAlpha = 1;
      }
    } else R(), R(), R();
    c.restore();
  }
}
const pencil = len => (c, h) => { c.save(); c.rotate(-0.4); rr(c, -4, -len * 0.2, 8, len, 3); ink(c, '#f2c230', 2); poly(c, [[-4, len * 0.8], [4, len * 0.8], [0, len * 0.8 + 12]]); ink(c, '#e8c9a0', 2); c.restore(); };
const brush = col => (c, h) => { c.save(); c.rotate(-0.2); rr(c, -3, -20, 6, 60, 3); ink(c, '#8a5a34', 2); rr(c, -4, 38, 8, 10, 2); ink(c, '#c0c0c8', 1.5); poly(c, [[-4, 47], [4, 47], [0, 62]]); ink(c, col, 1.5); c.restore(); };
const cane = (c, h) => { thick(c, [[0, -6], [4, h * 0.45]], 6, '#6b4428', 2); };

export default {
  slug: 'man-who-wanted-perfect',
  title: 'वो जो परफ़ेक्ट बनना चाहता था',
  accent: '#ffd166',
  grade: { col: '#5a3a2a', amt: 0.14 },
  music: tl => ({ root: 48, scale: 'dorian', prog: [0, 3, 5, 4], chord: 5, level: 0.22, warmth: 950, dyn: [[tl.at('years').start, 0.7, 1], [tl.at('twist').start - 3, 1.7, 1], [tl.at('twist').start + 0.3, 0.5, 0.4], [tl.at('final').start, 1.2, 1]] }),
  ambience: tl => [{ type: 'room', from: 0, to: tl.total }, { type: 'clock', from: tl.at('years').start, to: tl.at('visit').start, gain: 0.7 }, { type: 'birds', from: tl.at('studio').start, to: tl.at('try').start, gain: 0.6 }],
  cover: { shot: 'reveal', at: 0.7 },
  shots: [
    // 0. hook: a pencil that never touches the canvas
    { id: 'hook', min: 4.4, vo: 'एक कैनवास... || जो कभी *भरा* ही नहीं गया।', sfx: [[0.15, 'boom'], [1.4, 'heartbeat', { n: 3, gap: 0.7, gain: 0.5 }]],
      draw(c, t, S) {
        c.fillStyle = '#0b0710'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.15, 1.0, E(t, 0, S.dur, ease.out)) });
        c.fillStyle = rad(c, 270, 430, 40, 460, [[0, 'rgba(255,240,200,0.4)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        rr(c, 90, 210, 360, 440, 4); ink(c, '#fffdf6', 5);
        c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(90, 560, 360, 90);
        // the pencil comes down, trembles a hair away, pulls back
        const k = E(t, 0.3, 1.8) * (1 - E(t, 3.0, 4.2)), [sx, sy] = shake(t, 2.5 * seg(t, 1.6, 3), 22);
        c.save(); c.translate(420 - 110 * k + sx, 60 + 330 * k + sy); c.rotate(0.55);
        rr(c, -14, -260, 28, 260, 6); ink(c, '#f2c230', 4); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-10, -255, 6, 250);
        rr(c, -14, -290, 28, 34, 5); ink(c, '#e58fa0', 4); poly(c, [[-14, 0], [14, 0], [0, 46]]); ink(c, '#efd2a8', 4); poly(c, [[-5, 30], [5, 30], [0, 46]]); ink(c, '#2a2026', 0);
        c.restore();
        if (t > 1.8 && t < 3.0) { c.strokeStyle = 'rgba(30,20,30,0.5)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(305 + sx, 395 + sy, 14 + i * 9 + (t * 30) % 9, 0, Math.PI * 2); c.stroke(); } }
        c.restore();
      } },
    // 1. the young artist and his dream
    { id: 'studio', min: 5.5, tr: 'black', vo: 'एक नौजवान चित्रकार का | बस एक सपना था, || दुनिया की सबसे *परफ़ेक्ट* पेंटिंग बनाना।', sfx: [[0.3, 'steps', { n: 4, gap: 0.42, gain: 0.25 }], [2.4, 'sparkle']],
      draw(c, t, S) {
        const x = lerp(-40, 175, E(t, 0, 2.0, ease.out)), walking = t < 2.0;
        c.save(); cam(c, { z: lerp(1.05, 1.15, S.p), x: 270, y: 560 });
        studio(c, t);
        easel(c, 360, 790, 1.05);
        toon(c, { x, y: 800, h: 300, face: 1, t, style: ART, expr: t > 2 ? 'joy' : 'happy', pose: walking ? { walk: t * 7.5, amp: 0.8 } : { armF: [2.95 + Math.sin(t * 6) * 0.12, -0.15], armB: [-0.3, 0.3] } });
        if (t > 2.2) { const a = ease.back(seg(t, 2.2, 2.7)); c.save(); c.globalAlpha = clamp(a); for (let i = 0; i < 6; i++) { const ang = t * 0.8 + i; c.fillStyle = '#ffd166'; star(c, 360 + Math.cos(ang) * 120 * a, 600 + Math.sin(ang) * 90 * a, 10, 4, 4, t); c.fill(); } c.restore(); }
        c.restore();
      } },
    // 2. preparing: sharpening pencils, buying brushes
    { id: 'prep', min: 4.8, vo: 'उसने पेंसिलें तराशीं, | सबसे महँगे *ब्रश* ख़रीदे...', sfx: [[0.2, 'scribble', { n: 14 }], [2.2, 'pop', { f: 400 }], [2.5, 'pop', { f: 500 }], [2.8, 'pop', { f: 600 }], [3.1, 'pop', { f: 700 }], [3.4, 'coins', { n: 6 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.45, x: 260, y: 560 });
        studio(c, t);
        toon(c, { x: 230, y: 790, h: 290, face: 1, t, style: ART, expr: 'determined', look: [0.6, 0.6], pose: { armF: [1.5 + Math.sin(t * 14) * 0.15, 0.6], armB: [1.2, 1.0] }, hold: pencil(50) });
        // the table (in front of him)
        rr(c, 120, 640, 330, 22, 5); ink(c, '#8a5a34', 3); thick(c, [[140, 660], [140, 790]], 12, '#74492a'); thick(c, [[430, 660], [430, 790]], 12, '#74492a');
        // a jar of perfect pencils, growing
        const n = Math.floor(lerp(2, 14, E(t, 0, 2.2))); rr(c, 330, 575, 54, 66, 8); ink(c, 'rgba(200,230,255,0.6)', 3);
        for (let i = 0; i < n; i++) { const a = -0.35 + i / 14 * 0.7; c.save(); c.translate(357, 600); c.rotate(a); rr(c, -3, -85, 6, 85, 2); ink(c, PAINT[i % 6], 1.5); c.restore(); }
        // brushes lined up, popping in
        rr(c, 395, 590, 44, 52, 6); ink(c, '#8fb3c9', 3);
        for (let i = 0; i < 5; i++) { const k = ease.back(seg(t, 2.2 + i * 0.3, 2.5 + i * 0.3)); if (k <= 0) continue; c.save(); c.translate(404 + i * 7, 600); c.rotate(Math.PI + (i - 2) * 0.12); c.scale(k, k); brush(PAINT[i])(c, 0); c.restore(); }
        // shavings curling away
        for (let i = 0; i < 10; i++) { const p = (t * 1.3 + i / 10) % 1; if (t > 2.2) break; const x = 300 + p * 60 + Math.sin(i) * 10, y = 600 + p * p * 160; c.save(); c.translate(x, y); c.rotate(p * 8 + i); c.strokeStyle = '#d9a86a'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 1.4); c.stroke(); c.restore(); }
        c.restore();
      } },
    // 3. studying the masters, decorating the studio
    { id: 'study', min: 4.8, vo: 'बड़े-बड़े कलाकारों को पढ़ा, | अपना स्टूडियो *सजाया*।', sfx: [[0.3, 'paper', { n: 6, gain: 0.15 }], [1.8, 'pop'], [2.3, 'pop'], [2.8, 'pop']],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), x: 270, y: 520 });
        studio(c, t, { wall: c => {
          const pics = [
            (c, w, h) => { c.fillStyle = '#1d3b7a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd166'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w * (0.2 + i * 0.2), h * 0.35, 8 + i * 2, 0, 5); c.stroke(); } c.fillStyle = '#0b1a3a'; c.fillRect(0, h * 0.75, w, h); },
            (c, w, h) => { c.fillStyle = '#e9d8b0'; c.fillRect(0, 0, w, h); circ(c, w / 2, h * 0.45, w * 0.22); ink(c, '#d9a77c', 2); c.fillStyle = '#3a2a22'; c.fillRect(w * 0.3, h * 0.7, w * 0.4, h * 0.3); c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(w / 2, h * 0.5, 6, 0.2, 2.9); c.stroke(); },
            (c, w, h) => { c.fillStyle = '#8fd26a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd166'; for (let i = 0; i < 3; i++) { circ(c, w * (0.25 + i * 0.25), h * 0.4, 9); c.fill(); } c.fillStyle = '#5a8a3a'; c.fillRect(0, h * 0.65, w, h); },
          ];
          pics.forEach((p, i) => { const k = ease.back(seg(t, 1.8 + i * 0.5, 2.2 + i * 0.5)); if (k <= 0) return; frame(c, 300 + i * 85 - (i === 1 ? 0 : 0), 200 + (i % 2) * 40, 62 * k, 78 * k, p, '#b8860b', (i - 1) * 0.04); });
        } });
        // a stack of books growing
        const nb = Math.floor(lerp(1, 7, E(t, 0, 2))); for (let i = 0; i < nb; i++) { rr(c, 330 + (i % 2) * 6, 760 - i * 20, 110, 18, 3); ink(c, PAINT[(i * 2) % 6], 2.5); }
        toon(c, { x: 200, y: 800, h: 300, face: 1, t, style: ART, expr: 'happy', look: [0.4, 0.5], pose: { armF: [1.3, 0.9], armB: [1.1, 1.1] }, hold: (c) => { c.save(); c.rotate(1.2); rr(c, -26, -6, 52, 36, 3); ink(c, '#c94a3a', 2.5); c.fillStyle = '#fbf8f0'; c.fillRect(-22, -2, 44, 28); c.restore(); } });
        c.restore();
      } },
    // 4. he tries... and sees a flaw
    { id: 'try', min: 6, tr: 'black', vo: 'पर जब भी वो रंग भरने बैठता, || उसे कुछ न कुछ *कमी* दिख जाती।', sfx: [[1.6, 'pop', { f: 250 }], [2.4, 'hit', { gain: 0.5 }], [3.6, 'paper', { n: 18 }]],
      draw(c, t, S) {
        const reach = E(t, 0.3, 1.6), oops = t > 2.3, rip = E(t, 3.4, 4.2);
        c.save(); const [sx, sy] = t > 2.3 && t < 2.7 ? shake(t, 5) : [0, 0]; c.translate(sx, sy); cam(c, { z: lerp(1.25, 1.4, S.p), x: 300, y: 560 });
        studio(c, t);
        if (rip < 1) easel(c, 360, 790, 1.05, (c, w, h) => { if (t > 1.6) { circ(c, w * 0.4, h * 0.5, 6); c.fillStyle = '#ff6b6b'; c.fill(); } if (oops) { c.strokeStyle = 'rgba(220,30,40,0.85)'; c.lineWidth = 4; c.beginPath(); c.arc(w * 0.4, h * 0.5, 22 + Math.sin(t * 10) * 3, 0, Math.PI * 2); c.stroke(); } });
        else easel(c, 360, 790, 1.05);
        if (rip > 0 && rip < 1) paperBall(c, lerp(360, 220, rip), lerp(600, 560, rip), lerp(60, 22, rip), 3, rip * 4);
        toon(c, { x: 215, y: 800, h: 300, face: 1, t, style: ART, expr: oops ? (t < 3.4 ? 'shock' : 'angry') : 'determined', look: [1, 0], sweat: oops,
          pose: { armF: rip > 0 ? [2.2, 0.8] : [lerp(0.5, 1.75, reach), lerp(0.6, 0.15, reach)], armB: [0.4, 0.6], lean: reach * 0.08 }, hold: rip > 0 ? null : brush('#ff6b6b') });
        if (oops && t < 3.6) { const a = ease.back(seg(t, 2.3, 2.6)); c.save(); c.translate(300, 420); c.scale(a, a); title(c, '✗', 0, 0, 70, { col: '#ff4d5a' }); c.restore(); }
        c.restore();
      } },
    // 5. canvas after canvas thrown away
    { id: 'crumple', min: 4.6, tr: 'cut', vo: 'एक कैनवास फेंका, | फिर दूसरा... || फिर *सौ*।', sfx: [[0.1, 'paper', { n: 12 }], [0.9, 'paper', { n: 12 }], [1.7, 'paper', { n: 12 }], [2.4, 'paper', { n: 20 }], [3.1, 'paper', { n: 20 }]],
      draw(c, t, S) {
        const n = Math.floor(lerp(3, 110, E(t, 0.2, S.dur - 0.5, ease.in)));
        c.save(); cam(c, { z: 1.1, x: 270, y: 560 });
        studio(c, t);
        easel(c, 360, 790, 1.05);
        balls(c, n, 41, t, 640);
        // balls flying out of his hands
        for (let i = 0; i < 4; i++) { const p = (t * 1.6 + i / 4) % 1; paperBall(c, 230 + p * 260 * (i % 2 ? 1 : -0.6), 600 - Math.sin(p * Math.PI) * 220 + p * 200, 18, 90 + i, p * 9); }
        toon(c, { x: 230, y: 800, h: 300, face: 0, t, style: ART, expr: 'angry', mouth: 'grit', pose: { armF: [1.6 + Math.sin(t * 12) * 0.9, 0.5], armB: [1.6 + Math.cos(t * 12) * 0.9, 0.5] } });
        c.restore();
        title(c, String(Math.max(1, n - 2)), W / 2, 210, 64, { col: '#ffd166' });
      } },
    // 6. years pass in front of an empty canvas
    { id: 'years', min: 5, tr: 'black', vo: 'और साल *गुज़रते* गए।', lead: 0.8, sfx: [[0.2, 'whoosh', { dur: 3.5 }], [0.2, 'tick', { n: 8, gap: 0.45 }]],
      draw(c, t, S) {
        const k = E(t, 0, S.dur - 0.4);
        c.save(); cam(c, { z: lerp(1.0, 1.2, S.p), x: 280, y: 540 });
        studio(c, t * 4, { age: k, night: Math.sin(t * 4) > 0.3 ? 1 : 0 });
        clock(c, 420, 160, 46, t * 900, 1);
        easel(c, 380, 790, 1.05);
        // cobwebs
        c.save(); c.globalAlpha = k; c.strokeStyle = 'rgba(240,240,240,0.6)'; c.lineWidth = 1.5; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(W, 0); c.lineTo(W - 140 + i * 25, 140 - i * 25); c.stroke(); } for (let r = 30; r < 140; r += 25) { c.beginPath(); c.arc(W, 0, r, Math.PI * 0.5, Math.PI); c.stroke(); } c.restore();
        // sitting on a stool, staring
        rr(c, 160, 690, 90, 14, 4); ink(c, '#74492a', 3); thick(c, [[175, 700], [168, 790]], 8, '#74492a'); thick(c, [[235, 700], [242, 790]], 8, '#74492a');
        toon(c, { x: 205, y: 690 + 290 * 0.29, h: 290, face: 0.8, t, style: aged(k), expr: k > 0.5 ? 'tired' : 'worried', look: [1, -0.1], noShadow: true, pose: { sit: true, armF: [0.9, 0.9], armB: [0.7, 1.0], slump: k * 0.6 } });
        c.restore();
        title(c, String(Math.floor(lerp(1, 30, k))) + ' साल', W / 2, 250, 44, { col: '#ffd884' });
      } },
    // 7. an old artist visits
    { id: 'visit', min: 5, tr: 'fade', vo: [{ text: 'एक दिन, | एक बूढ़ा कलाकार | उससे मिलने आया।' }, { text: 'तुम्हारी *पेंटिंग्स* कहाँ हैं?', voice: 'old' }], sfx: [[0.2, 'door'], [1.2, 'steps', { n: 4, gap: 0.6, gain: 0.2 }]],
      draw(c, t, S) {
        const open = E(t, 0.1, 1.4), ox = lerp(560, 400, E(t, 1.0, 3.0, ease.out)), walking = t > 1.0 && t < 3.0;
        c.save(); cam(c, { z: 1.12, x: 290, y: 540 });
        studio(c, t, { age: 1 });
        // the door on the right
        c.fillStyle = rad(c, 480, 560, 20, 260, [[0, rgba('#fff2c4', 0.9 * open)], [1, rgba('#ffcf7a', 0.3 * open)]]); c.fillRect(420, 360, 120, 330);
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lin(c, 480, 690, 300, 960, [[0, rgba('#ffe1a0', 0.4 * open)], [1, rgba('#ffe1a0', 0)]]); poly(c, [[420, 690], [540, 690], [420, 960], [180, 960]]); c.fill(); c.restore();
        rr(c, 410, 350, 140, 340, 4); c.strokeStyle = '#5a3a24'; c.lineWidth = 10; c.stroke();
        toon(c, { x: ox, y: 800, h: 290, face: -1, t, style: OLDART, expr: S.speaking(t, 1) ? 'neutral' : 'happy', talk: S.speaking(t, 1) ? 0.7 : 0, rim: '#ffd88a', pose: walking ? { walk: t * 5, amp: 0.5 } : { armF: [0.3, 0.2] }, hold: cane });
        toon(c, { x: 170, y: 800, h: 290, face: 1, t, style: aged(1), expr: t > 1.2 ? 'shock' : 'tired', look: [1, -0.2] });
        c.restore();
      } },
    // 8. the reveal: hundreds of blank canvases
    { id: 'reveal', min: 5.5, tr: 'cut', vo: 'उसने सैकड़ों *ख़ाली* कैनवासों की तरफ़ | इशारा किया।', sfx: [[0.1, 'whoosh', { dur: 1.2 }], [1.2, 'boom', { gain: 0.6 }]],
      draw(c, t, S) {
        const pull = E(t, 0.4, 3.0, ease.inOut);
        c.save(); cam(c, { z: lerp(1.6, 0.95, pull), x: lerp(200, 270, pull), y: lerp(560, 500, pull) });
        studio(c, t, { age: 1 });
        blanks(c, -20, 40, W + 40, 650, 9, 9, 7);
        toon(c, { x: 400, y: 800, h: 280, face: -1, t, style: OLDART, expr: 'shock', rim: '#ffd88a', hold: cane });
        toon(c, { x: 170, y: 800, h: 290, face: 1, t, style: aged(1), expr: 'smirk', look: [-0.5, -0.8], pose: { armF: [2.6, 0.1], armB: [0.2, 0.3] } });
        c.restore();
      } },
    // 9. the old artist's words
    { id: 'words', min: 6, tr: 'fade', vo: [{ text: 'बेटा, | तुमने पूरी ज़िंदगी | कुछ बनाने की *तैयारी* में गुज़ार दी... || बनाने में नहीं।', voice: 'old' }], sfx: [[0.2, 'piano', { notes: [60, 63, 67], gap: 0.7, gain: 0.7 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.5, 1.6, S.p), x: 290, y: 520 });
        studio(c, t, { age: 1 });
        blanks(c, -20, 40, W + 40, 650, 9, 9, 7);
        c.fillStyle = 'rgba(20,10,20,0.35)'; c.fillRect(-100, -100, W + 200, H + 200);
        toon(c, { x: 400, y: 800, h: 290, face: -0.8, t, style: OLDART, expr: 'sad', talk: S.speaking(t, 0) ? 0.6 : 0, rim: '#ffd88a', hold: cane, pose: { armB: [1.2, 0.9] } });
        toon(c, { x: 200, y: 800, h: 290, face: 0.8, t, style: aged(1), expr: t > S.line(0).b - 1.2 ? 'cry' : 'sad', look: [1, 0], pose: { slump: E(t, 1, 4) * 0.4 } });
        c.restore();
      } },
    // 10. the twist: the perfect painting only ever lived in his head
    { id: 'twist', min: 7, tr: 'cut', lead: 1.6, vo: 'उसकी सबसे बड़ी रुकावट | हुनर की कमी नहीं थी... || *परफ़ेक्शन* की ज़िद थी।', sfx: [[0, 'riser', { dur: 1.5 }], [1.5, 'pop', { f: 200, gain: 0.5 }], [1.55, 'boom']],
      draw(c, t, S) {
        const pop = t > 1.5, k = E(t, 1.5, 4.5);
        c.fillStyle = '#120c18'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 0.8, k), y: 520 });
        // an endless hall of blank canvases
        for (let row = 0; row < 4; row++) { c.save(); c.globalAlpha = 1 - row * 0.2; blanks(c, -260 + row * 60, 40 + row * 70, W + 520 - row * 120, 560 - row * 120, 14 - row * 2, 7 - row, 70 + row); c.restore(); }
        c.fillStyle = 'rgba(15,8,25,0.45)'; c.fillRect(-300, -300, W + 600, H + 600);
        toon(c, { x: 270, y: 820, h: 300, face: 0, t, style: aged(1), expr: pop ? 'shock' : 'joy', look: [0, -1] });
        if (!pop) { // the golden perfect painting in a thought bubble
          const a = ease.back(seg(t, 0.1, 0.6)) * (1 + Math.sin(t * 6) * 0.03); c.save(); c.translate(270, 330); c.scale(a, a);
          bubble(c, 0, 0, 300, 230, '', { thought: true, tail: [0, 170], col: '#fff3c4' });
          frame(c, 0, 0, 180, 130, (c, w, h) => { c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#ff9f43'], [1, '#ffd166']]); c.fillRect(0, 0, w, h); circ(c, w * 0.7, h * 0.35, 18); c.fillStyle = '#fff6d0'; c.fill(); c.fillStyle = '#5fb54a'; c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.4, h * 0.45, w, h * 0.8); c.lineTo(w, h); c.fill(); }, '#d4a020');
          burst(c, 0, 0, 100, 190, 18, 'rgba(255,230,150,0.5)', 1, t);
          c.restore();
        } else if (t < 2.2) { const p = seg(t, 1.5, 2.2); for (let i = 0; i < 14; i++) { const ang = i / 14 * Math.PI * 2; c.fillStyle = rgba('#fff3c4', 1 - p); circ(c, 270 + Math.cos(ang) * 200 * p, 330 + Math.sin(ang) * 160 * p, 10 * (1 - p) + 2); c.fill(); } }
        c.restore();
        if (pop) flash(c, 0.9 * (1 - seg(t, 1.5, 1.9)));
        if (t > 3) { const a = ease.back(seg(t, 3, 3.5)); c.save(); c.translate(W / 2, 170); c.scale(a, a); title(c, 'रुकावट = परफ़ेक्शन', 0, 0, 36, { col: '#ffd166' }); c.restore(); }
      } },
    // 11. one imperfect stroke, and colour spreads everywhere
    { id: 'final', min: 8, tr: 'black', vo: 'एक अधूरी पेंटिंग, | जो मौजूद है, || उस परफ़ेक्ट पेंटिंग से कहीं बेहतर है... || जो कभी *शुरू* ही नहीं हुई।', tail: 1.0, sfx: [[1.0, 'whoosh', { f: 600, f2: 2000, dur: 0.6 }], [1.8, 'chime'], [2.6, 'sparkle']],
      draw(c, t, S) {
        const stroke = E(t, 0.9, 1.8), spread = E(t, 1.8, 6.5, ease.out) * 1.6;
        c.save(); cam(c, { z: lerp(1.35, 1.0, E(t, 1.5, 5)), x: 290, y: 520 });
        studio(c, t, { age: lerp(1, 0.3, spread / 1.6) });
        blanks(c, -20, 40, W + 40, 650, 9, 9, 7, spread, t);
        easel(c, 370, 800, 1.05, (c, w, h) => { c.lineCap = 'round'; const len = 300; c.setLineDash([len, len]); c.lineDashOffset = len * (1 - stroke); c.strokeStyle = lin(c, 0, 0, w, 0, [[0, '#ff6b6b'], [0.5, '#ffd166'], [1, '#4cc9f0']]); c.lineWidth = 18; c.beginPath(); c.moveTo(14, h * 0.7); c.bezierCurveTo(w * 0.3, h * 0.1, w * 0.6, h * 0.95, w - 12, h * 0.3); c.stroke(); c.setLineDash([]); });
        toon(c, { x: 215, y: 800, h: 300, face: 1, t, style: aged(1), expr: t > 2 ? 'joy' : 'determined', tears: t > 2.5, look: [1, 0], pose: { armF: [lerp(1.0, 2.0, stroke) - Math.sin(stroke * Math.PI) * 0.4, 0.3], armB: [0.3, 0.5] }, hold: brush('#ff6b6b') });
        dust(c, 5, 40 * clamp(spread), t, [0, 100, W, 600], '#ffd166', 2.4, -14, 0.9);
        c.restore();
      } },
  ],
};
