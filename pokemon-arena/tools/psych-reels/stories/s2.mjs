// 2. The Man Who Always Wore a Mask: people-pleasing and losing your identity.
import { rain, W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, person, mask, star, rays, dust, title, bubble, flash, black, burst, noise1, sky, stars, moon, fog } from '../engine.mjs';

const MAN = { shirt: '#e8e2d4', pants: '#3a4258', hair: '#2e2420', hairStyle: 'neat', skin: '#e8b48a', shoes: '#2a2026' };
const SUIT = { ...MAN, top: 'suit', jacket: '#3b4a6b', tie: '#c8a03a' };
// where the head of a toon is (front view): centre and radius
const headAt = (x, y, h) => [x, y - 0.72 * h, 0.2 * h];

function room(c, wall, floor, seed = 1, pattern = '#ffffff') {
  c.fillStyle = wall; c.fillRect(-60, -60, W + 120, 760);
  const r = rng(seed); c.fillStyle = rgba(pattern, 0.06);
  for (let y = 0; y < 700; y += 46) for (let x = (y / 46) % 2 ? 23 : 0; x < W + 40; x += 46) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-6, -6, 12, 12); c.restore(); }
  c.fillStyle = shade(wall, -0.25); c.fillRect(-60, 640, W + 120, 14);
  c.fillStyle = lin(c, 0, 650, 0, H, [[0, floor], [1, shade(floor, -0.45)]]); c.fillRect(-60, 650, W + 120, 400);
}
function lampLight(c, x, y, col, a, r = 320) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y, 5, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
// a mask flying off a face: k 0..1 of the flight
function flyingMask(c, x, y, R, type, k, dir = -1) {
  if (k <= 0 || k >= 1) return;
  c.save(); c.globalAlpha *= 1 - ease.in(k);
  c.translate(x + dir * k * R * 3.2, y - Math.sin(k * Math.PI) * R * 1.6 + k * k * R * 3); c.rotate(dir * k * 5); c.scale(1 - k * 0.3, 1 - k * 0.3);
  mask(c, R, Math.max(2, R * 0.04), type); c.restore();
}
// a hand pulling at something (big, cartoon)
function hand(c, x, y, s, skin = MAN.skin, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  for (let i = 0; i < 4; i++) { rr(c, -22 + i * 12, -46 + Math.abs(i - 1.5) * 5, 12, 36, 6); ink(c, skin, 3); }
  ell(c, 0, -6, 28, 24); ink(c, skin, 3); rr(c, 18, -26, 30, 12, 6); ink(c, skin, 3);
  c.restore();
}
// the four public faces
const SCENES = { happy: 'दोस्तों', success: 'दफ़्तर', strong: 'घर', confident: 'अजनबी' };

export default {
  slug: 'man-with-masks',
  title: 'वो आदमी, जिसके पास बहुत सारे चेहरे थे',
  accent: '#c39bff',
  grade: { col: '#3a2a6e', amt: 0.16 },
  music: tl => ({ root: 47, scale: 'harmonic', prog: [0, 3, 5, 4], chord: 5, level: 0.22, warmth: 900, dyn: [[tl.at('love').start, 1.3, 1], [tl.at('mirror').start, 0.7, 0.6], [tl.at('peel').start, 1.6, 1.2], [tl.at('blank').start, 0.45, 0.3], [tl.at('final').start, 1.1, 1]] }),
  ambience: tl => [{ type: 'room', from: 0, to: tl.total }, { type: 'rain', from: tl.at('tired').start, to: tl.at('tired').start + tl.at('tired').dur + 0.5, gain: 0.8 }, { type: 'crowd', from: tl.at('happy').start, to: tl.at('strong').start, gain: 0.7 }, { type: 'city', from: tl.at('confident').start, to: tl.at('love').start + tl.at('love').dur, gain: 0.7 }, { type: 'clock', from: tl.at('mirror').start, to: tl.at('peel').start, gain: 0.5 }, { type: 'drone', from: tl.at('blank').start, to: tl.at('final').start + 2 }],
  cover: { shot: 'blank', at: 0.55 },
  shots: [
    // 0. hook: a wall of masks swinging in the dark, a spotlight finds them
    { id: 'hook', min: 4.4, vo: 'उसके पास एक नहीं... || *कई* चेहरे थे।', sfx: [[0.1, 'boom'], [1.2, 'whoosh', { dur: 1 }]],
      draw(c, t, S) {
        c.fillStyle = '#0a0710'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.3, 1.0, E(t, 0, S.dur, ease.out)), y: 470 });
        const sx = 270 + Math.sin(t * 0.9) * 140;
        c.fillStyle = rad(c, sx, 470, 20, 300, [[0, 'rgba(255,230,190,0.32)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        const types = ['happy', 'success', 'strong', 'confident', 'sad', 'happy', 'confident', 'success', 'strong'];
        types.forEach((ty, i) => {
          const x = 110 + (i % 3) * 160, y = 300 + Math.floor(i / 3) * 180, sw = Math.sin(t * 1.6 + i * 1.3) * 0.12;
          c.strokeStyle = '#3a3040'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 90); c.lineTo(x, y - 52); c.stroke(); circ(c, x, y - 92, 4); ink(c, '#7a6a5a', 2);
          c.save(); c.translate(x, y - 52); c.rotate(sw); c.translate(0, 52);
          const lit = clamp(1 - Math.abs(x - sx) / 200); c.globalAlpha = 0.35 + 0.65 * lit; mask(c, 58, 3, ty); c.restore();
        });
        c.restore();
      } },
    // 1. with friends: the happy mask
    { id: 'happy', min: 4, tr: 'black', vo: 'दोस्तों के सामने | वो *ख़ुश* वाला मुखौटा पहनता,', sfx: [[0.6, 'pop', { f: 400 }], [1.2, 'applause', { dur: 2, gain: 0.08 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.08, 1.0, S.p), y: 520 });
        room(c, '#3a2a5a', '#4a3a3a', 2, '#ffd166');
        // party lights
        for (let i = 0; i < 9; i++) { const x = 30 + i * 60, y = 140 + Math.sin(i * 0.8) * 20, col = ['#ff6b6b', '#ffd166', '#6be0ff', '#a98bff'][i % 4], on = 0.5 + 0.5 * Math.sin(t * 4 + i); c.strokeStyle = '#1a1222'; c.lineWidth = 2; if (i) { c.beginPath(); c.moveTo(x - 60, 140 + Math.sin((i - 1) * 0.8) * 20); c.quadraticCurveTo(x - 30, y + 20, x, y); c.stroke(); } lampLight(c, x, y + 10, col, 0.25 * on, 70); circ(c, x, y + 10, 8); ink(c, col, 2); }
        const b = Math.abs(Math.sin(t * 5)) * 6;
        person(c, 95, 790, 250, '#ff8a65', { t, expr: 'joy', face: 0.6, talk: 0.6, hair: '#5a3020', style: { hairStyle: 'messy' } });
        person(c, 445, 790, 245, '#6bcf8f', { t: t + 1, expr: 'joy', face: -0.6, hair: '#1a1410', style: { hairStyle: 'long' } });
        toon(c, { x: 270, y: 800, h: 300, face: 0, t, lift: -b, style: { ...MAN, shirt: '#e85a8a', mask: 'happy' }, pose: { armF: [2.5, 0.4], armB: [2.5, 0.4] } });
        c.restore();
        dust(c, 4, 30, t, [0, 100, W, 600], '#ffe7a8', 2, -14, 0.6);
      } },
    // 2. at work: the successful mask
    { id: 'success', min: 3.2, tr: 'slide', vo: 'दफ़्तर में *कामयाब* वाला,', sfx: [[0.1, 'swish'], [0.6, 'chime', { notes: [79, 83, 86] }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 520 });
        room(c, '#2c3e55', '#3a3f4a', 5, '#7fd1ff');
        // window with the city
        rr(c, 60, 120, 420, 330, 6); ink(c, '#0f1a2c', 4);
        for (let i = 0; i < 9; i++) { const x = 70 + i * 47, hh = 120 + (i * 53) % 150; c.fillStyle = '#1d2c44'; c.fillRect(x, 450 - hh, 40, hh); c.fillStyle = 'rgba(255,220,130,0.5)'; for (let y = 460 - hh; y < 440; y += 22) for (let xx = x + 6; xx < x + 36; xx += 12) if ((xx * 7 + y * 3) % 5 < 3) c.fillRect(xx, y, 5, 8); }
        thick(c, [[270, 120], [270, 450]], 8, '#0f1a2c', 0); thick(c, [[60, 285], [480, 285]], 8, '#0f1a2c', 0);
        // a rising chart on the screen behind
        toon(c, { x: 270, y: 800, h: 300, face: 0, t, style: { ...SUIT, mask: 'success' }, pose: { armF: [0.3, 2.3], armB: [0.6, 0.4] } });
        person(c, 90, 800, 240, '#8aa0c8', { t, expr: 'happy', face: 0.7, style: { top: 'suit', jacket: '#5a5a6a', hairStyle: 'short' }, pose: { armF: [1.6, 0.2] } });
        person(c, 455, 800, 235, '#c8a08a', { t: t + 2, expr: 'happy', face: -0.7, hair: '#4a3020', style: { top: 'suit', jacket: '#6a4a5a', hairStyle: 'bun' }, pose: { armF: [1.5, 0.3] } });
        c.restore();
        // thumbs-up stars
        for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.save(); c.globalAlpha = 1 - k; c.fillStyle = '#ffd54a'; star(c, 120 + i * 150, 330 - k * 120, 16, 7); c.fill(); c.restore(); }
      } },
    // 3. at home: the strong mask
    { id: 'strong', min: 3.2, tr: 'slide', vo: 'घर पर *मज़बूत* वाला,', sfx: [[0.1, 'swish']],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 520 });
        room(c, '#5a3a2a', '#4a3528', 7, '#ffcf8a');
        lampLight(c, 270, 260, '#ffc070', 0.35, 360);
        // a hanging lamp
        thick(c, [[270, -20], [270, 200]], 3, '#2a1a12', 0); poly(c, [[230, 240], [310, 240], [290, 200], [250, 200]]); ink(c, '#c8803a', 3);
        // the family around him
        person(c, 90, 800, 220, '#9a6a9a', { t, expr: 'worried', face: 0.7, hair: '#cfcac4', style: { hairStyle: 'bun', old: true }, look: [1, -0.4] });
        person(c, 450, 800, 170, '#6ab0e0', { t, expr: 'worried', face: -0.7, style: { kid: true, hairStyle: 'kid' }, look: [-1, -0.6] });
        toon(c, { x: 275, y: 800, h: 300, face: 0, t, style: { ...MAN, shirt: '#8a5a3a', mask: 'strong' }, pose: { armF: [0.55, 1.9], armB: [0.55, 1.9] } });
        c.restore();
      } },
    // 4. with strangers: the confident mask
    { id: 'confident', min: 3.6, tr: 'slide', vo: 'और अजनबियों के सामने, | *बेफ़िक्र* वाला।', sfx: [[0.1, 'swish'], [0.4, 'steps', { n: 6, gap: 0.42, gain: 0.25 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.0, y: 520 });
        sky(c, '#1b1640', '#5a3a6a', 0, 640); stars(c, 3, 50, t, 400);
        for (let i = 0; i < 7; i++) { const x = ((i * 95 - t * 40) % 700 + 700) % 700 - 80, hh = 200 + (i * 71) % 170; rr(c, x, 640 - hh, 84, hh + 10, 4); ink(c, '#251d3a', 3); c.fillStyle = 'rgba(255,214,120,0.45)'; for (let y = 660 - hh; y < 620; y += 26) for (let xx = x + 10; xx < x + 76; xx += 18) if ((xx + y + i) % 3) c.fillRect(xx, y, 8, 12); }
        c.fillStyle = '#2a2436'; c.fillRect(-50, 640, W + 100, 400); c.fillStyle = '#3a3346'; c.fillRect(-50, 640, W + 100, 20);
        // street lamp
        const lx = ((420 - t * 40) % 700 + 700) % 700 - 80; thick(c, [[lx, 660], [lx, 330]], 8, '#3a3346'); circ(c, lx, 320, 14); ink(c, '#ffe6a0', 3); lampLight(c, lx, 330, '#ffd88a', 0.4, 220);
        person(c, 110, 800, 230, '#4a6a8a', { t, expr: 'smirk', face: 0.8, look: [1, 0], style: { hairStyle: 'short' } });
        person(c, 450, 805, 235, '#8a4a6a', { t: t + 3, expr: 'happy', face: -0.8, look: [-1, 0], hair: '#6a3a1a', style: { hairStyle: 'long' } });
        toon(c, { x: 280, y: 810, h: 300, face: 0.4, t, style: { ...MAN, shirt: '#3a2a4a', top: 'suit', jacket: '#4a3a6a', mask: 'confident' }, pose: { walk: t * 7, amp: 0.5 } });
        c.restore();
      } },
    // 5. everyone loves him: hearts, applause, the spotlight
    { id: 'love', min: 4.8, tr: 'flash', vo: 'सब उसे *पसंद* करते थे। || हर कोई कहता, | कितना अच्छा इंसान है।', sfx: [[0.2, 'cheer', { dur: 3.5, gain: 0.14 }], [0.3, 'sparkle']],
      draw(c, t, S) {
        c.fillStyle = '#140c22'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(0.95, 1.08, S.p), y: 520 });
        rays(c, 270, -40, 0, 0.5, 950, '#fff0c8', 0.22, t, 3);
        c.fillStyle = rad(c, 270, 800, 10, 200, [[0, 'rgba(255,240,200,0.35)'], [1, 'rgba(255,240,200,0)']]); ell(c, 270, 800, 200, 40); c.fill();
        const crowd = [[60, '#ff8a65', 'joy'], [150, '#6bcf8f', 'happy'], [390, '#7fa0ff', 'joy'], [480, '#c39bff', 'happy']];
        crowd.forEach(([x, col, ex], i) => person(c, x, 880, 220, col, { t: t + i, expr: ex, face: x < 270 ? 0.7 : -0.7, look: [x < 270 ? 1 : -1, -0.5], pose: { armF: [2.6 + Math.sin(t * 9 + i) * 0.3, 0.5], armB: [2.4 - Math.sin(t * 9 + i) * 0.3, 0.5] } }));
        toon(c, { x: 270, y: 800, h: 300, face: 0, t, style: { ...SUIT, mask: ['happy', 'success', 'strong', 'confident'][Math.floor(t * 2.5) % 4] }, pose: { armF: [2.0, 0.3], armB: [2.0, 0.3] } });
        // hearts floating up
        for (let i = 0; i < 12; i++) { const k = (t * 0.45 + i / 12) % 1, x = 40 + (i * 83) % 460 + Math.sin(k * 6 + i) * 18, y = 760 - k * 560; c.save(); c.globalAlpha = Math.sin(k * Math.PI); c.translate(x, y); c.scale(0.8 + (i % 3) * 0.3, 0.8 + (i % 3) * 0.3); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-18, -6, -8, -20, 0, -8); c.bezierCurveTo(8, -20, 18, -6, 0, 8); ink(c, '#ff5c7a', 2.5); c.restore(); }
        c.restore();
      } },
    // 5b. walking home alone in the rain, the masks in his hands
    { id: 'tired', min: 5, tr: 'black', vo: 'पर हर मुखौटे के पीछे... || वो अंदर ही अंदर | *थकता* जा रहा था।', sfx: [[0.2, 'steps', { n: 9, gap: 0.55, gain: 0.22 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), x: 270, y: 520 });
        sky(c, '#0e0c1c', '#2a2440', 0, 650);
        for (let i = 0; i < 6; i++) { const x = i * 100 - 20, hh = 260 + (i * 61) % 160; rr(c, x, 650 - hh, 92, hh + 10, 3); ink(c, '#18142a', 3); c.fillStyle = 'rgba(255,214,120,0.25)'; for (let y = 670 - hh; y < 630; y += 30) for (let xx = x + 12; xx < x + 84; xx += 22) if ((xx * 3 + y + i) % 4 === 0) c.fillRect(xx, y, 9, 13); }
        c.fillStyle = '#1c1828'; c.fillRect(-50, 650, W + 100, 400);
        // puddle reflections
        c.fillStyle = 'rgba(255,214,140,0.12)'; ell(c, 330, 760, 120, 10); c.fill();
        thick(c, [[380, 660], [380, 300]], 8, '#2a2436'); circ(c, 380, 290, 14); ink(c, '#ffe6a0', 3); lampLight(c, 380, 300, '#ffd88a', 0.3, 240);
        rays(c, 380, 300, 0, 0.5, 420, '#ffe6a0', 0.12, t, 3);
        const x = lerp(140, 320, S.p);
        toon(c, { x, y: 780, h: 300, face: 1, t, expr: 'tired', style: { ...SUIT, mask: null }, pose: { walk: t * 5, amp: 0.45, slump: 0.35, armF: [0.2, 0.3] },
          hold: (c, h) => { c.save(); c.rotate(0.3); ['happy', 'success', 'strong'].forEach((ty, i) => { c.save(); c.translate(i * 6, 10 + i * 6); c.rotate(i * 0.2); mask(c, h * 0.07, 2, ty); c.restore(); }); c.restore(); } });
        rain(c, t, 140, 'rgba(180,190,255,0.3)');
        c.restore();
      } },
    // 6. one night, alone, at the mirror
    { id: 'mirror', min: 5.5, tr: 'fade', vo: 'उस रात, | थका-हारा वो *आईने* के सामने खड़ा हुआ... || और मुखौटा उतारा।', sfx: [[0.3, 'steps', { n: 3, gap: 0.6, gain: 0.2 }]],
      draw(c, t, S) {
        c.fillStyle = '#0d0a14'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.35, E(t, 0, S.dur)), y: lerp(520, 470, S.p) });
        room(c, '#231b33', '#1c1724', 9, '#c39bff');
        // the mirror (oval) with his reflection
        const mx = 270, my = 430;
        c.save(); ell(c, mx, my, 150, 220); ink(c, '#2a2238', 0); c.clip();
        c.fillStyle = lin(c, 0, 210, 0, 650, [[0, '#3a3456'], [1, '#1a1628']]); c.fillRect(0, 0, W, H);
        toon(c, { x: mx, y: 900, h: 560, face: 0, t, style: { ...MAN, shirt: '#3b4a6b', mask: 'happy' }, noShadow: true, pose: { slump: 0.25 } });
        c.fillStyle = 'rgba(255,255,255,0.08)'; poly(c, [[160, 260], [220, 230], [130, 560], [110, 520]]); c.fill();
        c.restore();
        ell(c, mx, my, 150, 220); c.strokeStyle = OL; c.lineWidth = 22; c.stroke(); c.strokeStyle = '#b08a4a'; c.lineWidth = 16; c.stroke();
        // a lamp to the side
        lampLight(c, 470, 330, '#ffc080', 0.3, 260);
        c.restore();
      } },
    // 7. the twist: under the mask, another mask... again and again
    { id: 'peel', min: 7.5, tr: 'cut', vo: ['लेकिन नीचे... ||| एक और *मुखौटा* था।', 'उसने वो भी उतारा। || फिर एक और... | फिर एक और।'], gap: 0.25,
      sfx: [[0.3, 'pop', { f: 250 }], [0.35, 'whoosh', { dur: 0.5 }], [0.6, 'hit', { gain: 0.5 }], [s => s.lines[1].a + 0.2, 'pop', { f: 280 }], [s => s.lines[1].a + 1.4, 'pop', { f: 320 }], [s => s.lines[1].a + 2.4, 'pop', { f: 360 }], [s => s.lines[1].a + 3.2, 'pop', { f: 420 }], [s => s.lines[1].a + 3.2, 'heartbeat', { n: 4, gap: 0.55 }]],
      draw(c, t, S) {
        // peel times
        const l1 = S.line(1).a, peels = [0.3, l1 + 0.2, l1 + 1.4, l1 + 2.4, l1 + 3.2], order = ['happy', 'sad', 'strong', 'success', 'cracked', 'blank'];
        let n = 0; for (const p of peels) if (t > p) n++;
        const [sx, sy] = shake(t, n > 2 ? 3 : 1.2, 20);
        c.fillStyle = '#0d0a14'; c.fillRect(0, 0, W, H);
        c.save(); c.translate(sx, sy); cam(c, { z: 1.0 + n * 0.04, y: 470 });
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#2e2846'], [1, '#120f1c']]); c.fillRect(-40, -40, W + 80, H + 80);
        const h = 760, [hx, hy, R] = headAt(270, 1000, h);
        toon(c, { x: 270, y: 1000, h, face: 0, t, style: { ...MAN, shirt: '#3b4a6b', mask: order[n] }, noShadow: true, maskOff: 0 });
        // the hand pulling the next mask, and the masks flying off
        const next = peels[n]; if (next != null && next - t < 0.6) { const k = 1 - (next - t) / 0.6; hand(c, hx + R * 0.95, hy + R * 0.2 - k * R * 0.2, 1.6, MAN.skin, -0.4); }
        peels.forEach((p, i) => flyingMask(c, hx, hy, R, order[i], (t - p) / 0.9, i % 2 ? 1 : -1));
        // a pile of masks growing at the bottom
        for (let i = 0; i < n; i++) { c.save(); c.translate(90 + i * 95, 880 - (i % 2) * 20); c.rotate((i % 2 ? 0.4 : -0.3)); mask(c, 46, 3, order[i]); c.restore(); }
        if (n >= 3) burst(c, hx, hy, R * 1.3, R * 3, 40, 'rgba(195,155,255,0.25)', 1, t);
        c.restore();
      } },
    // 8. the blank face
    { id: 'blank', min: 6, tr: 'flash', lead: 1.2, vo: 'और तब उसे एहसास हुआ... || कि उसे अपना *असली चेहरा* | याद ही नहीं था।', sfx: [[0, 'boom'], [0.05, 'shatter']],
      draw(c, t, S) {
        c.fillStyle = '#08060c'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.15, 1.0, E(t, 0, 3, ease.out)), y: 470 });
        const mx = 270, my = 450;
        c.fillStyle = rad(c, mx, my, 20, 380, [[0, 'rgba(195,155,255,0.25)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        c.save(); ell(c, mx, my, 190, 270); c.clip();
        c.fillStyle = lin(c, 0, 180, 0, 720, [[0, '#4a4266'], [1, '#1a1628']]); c.fillRect(0, 0, W, H);
        const [hx, hy] = [mx, my - 20];
        toon(c, { x: mx, y: hy + 0.72 * 700, h: 700, face: 0, t, style: { ...MAN, shirt: '#3b4a6b', faceless: true }, noShadow: true, pose: { headTilt: Math.sin(t * 0.7) * 0.06 } });
        // a crack across the mirror
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(380, 250); c.lineTo(330, 330); c.lineTo(350, 370); c.lineTo(290, 470); c.moveTo(330, 330); c.lineTo(420, 380); c.stroke();
        c.restore();
        ell(c, mx, my, 190, 270); c.strokeStyle = OL; c.lineWidth = 24; c.stroke(); c.strokeStyle = '#b08a4a'; c.lineWidth = 17; c.stroke();
        // the masks lying around the frame
        ['happy', 'sad', 'strong', 'success', 'cracked'].forEach((ty, i) => { c.save(); c.translate(70 + i * 100, 830 + (i % 2) * 24); c.rotate(-0.5 + i * 0.25); mask(c, 40, 3, ty); c.restore(); });
        c.restore();
        if (t > S.line(0).a + 2.5) { const a = ease.back(seg(t, S.line(0).a + 2.5, S.line(0).a + 3)); c.save(); c.translate(W / 2, 110); c.scale(a, a); title(c, 'मैं कौन हूँ?', 0, 0, 40, { col: '#e6d6ff' }); c.restore(); }
      } },
    // 9. what happened to him
    { id: 'why', min: 5, tr: 'fade', vo: 'सबके मन का बनते-बनते... || वो *ख़ुद* को ही भूल गया।', sfx: [[0.2, 'whisper', { dur: 3, gain: 0.05 }]],
      draw(c, t, S) {
        c.fillStyle = '#0d0a14'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.12, S.p), y: 540 });
        room(c, '#1c1628', '#16121e', 9, '#c39bff');
        rays(c, 420, -30, 0.35, 0.3, 900, '#c9b8ff', 0.16, t, 3);
        // masks floating around him like ghosts, smiling at him
        ['happy', 'success', 'strong', 'confident', 'happy', 'success'].forEach((ty, i) => { const a = t * 0.5 + i * Math.PI / 3, x = 270 + Math.cos(a) * 190, y = 470 + Math.sin(a) * 120 + Math.sin(t * 2 + i) * 8; c.save(); c.globalAlpha = 0.85; c.translate(x, y); c.rotate(Math.sin(t + i) * 0.2); mask(c, 34, 2.5, ty); c.restore(); });
        // he sits on the floor, holding his knees, faceless
        toon(c, { x: 270, y: 780 + 0.29 * 260, h: 260, face: 0.7, t, style: { ...MAN, shirt: '#3b4a6b', faceless: true }, noShadow: true, pose: { sit: true, legF: [2.3, -2.6], legB: [2.25, -2.6], armF: [1.35, 1.0], armB: [1.2, 1.0], lean: 0.18, slump: 0.4 } });
        c.restore();
      } },
    // 10. the line to remember: the real face is still there, small, waiting
    { id: 'final', min: 7.5, tr: 'black', vo: 'सबका प्यार पाने में | ज़िंदगी ऐसे मत बिताना... || कि ख़ुद से ही *अजनबी* बन जाओ।', tail: 1.0, sfx: [[0.2, 'chime', { notes: [71, 74, 78, 83], gap: 0.25 }]],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1a1030'], [1, '#05030a']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.1, 1.0, E(t, 0, S.dur, ease.out)), y: 480 });
        const mx = 270, my = 430;
        c.save(); ell(c, mx, my, 170, 240); c.clip();
        c.fillStyle = lin(c, 0, 190, 0, 670, [[0, '#3a3456'], [1, '#1a1628']]); c.fillRect(0, 0, W, H);
        // in the mirror: his true face slowly comes back (the mask-less him, smiling softly)
        const k = E(t, 1.5, 5);
        toon(c, { x: mx, y: 900, h: 560, face: 0, t, style: { ...MAN, shirt: '#3b4a6b', faceless: k < 0.5 }, noShadow: true, expr: 'happy', alpha: 1 });
        c.fillStyle = rad(c, mx, my, 10, 260, [[0, rgba('#fff3d0', 0.35 * k)], [1, 'rgba(255,243,208,0)']]); c.fillRect(0, 0, W, H);
        c.restore();
        ell(c, mx, my, 170, 240); c.strokeStyle = OL; c.lineWidth = 22; c.stroke(); c.strokeStyle = '#d8b46a'; c.lineWidth = 15; c.stroke();
        // the masks, put down for good
        ['happy', 'success', 'strong', 'confident'].forEach((ty, i) => { c.save(); c.globalAlpha = 1 - k * 0.6; c.translate(110 + i * 105, 840); c.rotate(-0.3 + i * 0.2); mask(c, 36, 3, ty); c.restore(); });
        dust(c, 21, 30, t, [80, 200, 380, 500], '#fff3d0', 2, -8, 0.6 * k);
        c.restore();
      } },
  ],
};
