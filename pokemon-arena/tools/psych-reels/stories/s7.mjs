// 7. The Man Who Could Hear Everyone's Thoughts: insecurity and the fear of judgment.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, sun, moon, stars, rays, dust, rain, bubble, title, flash, black, burst, noise1 } from '../engine.mjs';

// k = how small and grey he has become (0 = himself, 1 = shrunk)
const HERO = k => ({ shirt: mix('#f2b84b', '#6e6e7a', k), pants: mix('#3a5a9a', '#3a3a44', k), hair: '#2a1d18', hairStyle: 'messy', skin: '#e2b088', shoes: '#3a2a2a' });
const PEOPLE = [
  { shirt: '#d9643a', hairStyle: 'neat', hair: '#2a1d18', skin: '#e2b088', pants: '#3a3550' },
  { shirt: '#6a8fd0', hairStyle: 'long', hair: '#3a2420', skin: '#c99068', pants: '#4a3a5a' },
  { shirt: '#4fa36a', hairStyle: 'bun', hair: '#5a3a28', skin: '#f0c49a', pants: '#2f3550' },
  { top: 'suit', jacket: '#444a5a', pants: '#333a48', hairStyle: 'short', hair: '#1e1a18', skin: '#d9a77c', tie: '#3a8ad0' },
  { shirt: '#c56aa0', hairStyle: 'messy', hair: '#1e1612', skin: '#b9825a', pants: '#3a3a44' },
  { shirt: '#8a6ad0', hairStyle: 'old', hair: '#cfcac2', skin: '#e0ae84', pants: '#4a4a3a', beard: '#cfcac2', beardLen: -0.3 },
];
const STRANGER = { shirt: '#5a7a9a', hairStyle: 'long', hair: '#2a1d18', skin: '#d9a77c', pants: '#2f3550', shoes: '#222' };

function skyline(c, base, seed, col, winCol, scroll, scale = 1, night = false, t = 0) {
  const r = rng(seed), B = []; let x = 0; while (x < 1200) { const w = (60 + r() * 70) * scale, h = (140 + r() * 280) * scale; B.push([x, w, h, r()]); x += w + 6 * scale; }
  for (let rep = -1; rep <= 1; rep++) for (const [bx, w, h, k] of B) {
    const xx = ((bx - scroll) % 1200 + 1200) % 1200 + rep * 1200 - 200; if (xx > W + 50 || xx + w < -50) continue;
    rr(c, xx, base - h, w, h + 40, 4); ink(c, shade(col, (k - 0.5) * 0.15), 2.5);
    c.fillStyle = winCol; const r2 = rng(Math.floor(k * 1e6));
    for (let wy = base - h + 14 * scale; wy < base - 20 * scale; wy += 22 * scale) for (let wx = xx + 10 * scale; wx < xx + w - 14 * scale; wx += 18 * scale) if (r2() < (night ? 0.45 : 0.85)) { c.globalAlpha = night ? 0.6 + 0.4 * Math.sin(t + wx) : 0.5; c.fillRect(wx, wy, 9 * scale, 12 * scale); }
    c.globalAlpha = 1;
  }
}
function street(c, t, o = {}) {
  const night = !!o.night;
  sky(c, night ? '#0b1030' : o.top || '#9fd4ff', night ? '#2a2a55' : o.bottom || '#ffe9c8', 0, 640);
  if (night) stars(c, 5, 40, t, 300);
  skyline(c, 600, o.seed || 8, night ? '#1d2244' : '#b9a6c9', night ? '#ffd27a' : '#fff6c8', (o.scroll || 0) * 0.3, 0.85, night, t);
  skyline(c, 640, (o.seed || 8) + 5, night ? '#262c55' : '#9c8ab8', night ? '#ffe08a' : '#fff6c8', (o.scroll || 0) * 0.6, 1.05, night, t);
  c.fillStyle = night ? '#2a2a3a' : '#8d8a96'; c.fillRect(-100, 640, W + 200, 500); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-100, 640, W + 200, 10);
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 3; c.beginPath(); const sc = o.scroll || 0; for (let x = -((sc % 90) + 90); x < W + 90; x += 90) { c.moveTo(x, 650); c.lineTo(x - 40, H + 40); } c.stroke();
}
// a thought bubble that pops in at time a (relative), above a head at (x, y)
function thought(c, x, y, text, t, a, o = {}) {
  if (t < a) return; const k = ease.back(clamp((t - a) / 0.35)), out = o.until != null ? 1 - clamp((t - o.until) / 0.3) : 1;
  if (out <= 0) return;
  const w = o.w || Math.max(150, text.length * 11 + 40);
  bubble(c, x + (o.dx || 0), y - 70 + Math.sin(t * 2 + x) * 3, w, o.h || 66, text, { thought: true, tail: o.tail || [-(o.dx || 0) * 0.6, 60], size: o.size || 19, scale: k * out, col: o.col || '#ffffff', tc: o.tc || OL });
}

export default {
  slug: 'hear-thoughts',
  title: 'वो आदमी, जो सबके मन की बात सुन सकता था',
  titleSize: 36,
  accent: '#ffd25a',
  grade: { col: '#2a3a6e', amt: 0.12 },
  music: tl => ({ root: 52, scale: 'dorian', prog: [0, 3, 5, 4], chord: 4.6, level: 0.22, warmth: 1000, dyn: [[tl.at('judge').start, 1.2, 1], [tl.at('shrink').start, 0.7, 0.8], [tl.at('stranger').start, 0.5, 0.8], [tl.at('everyone').start, 1.2, 1], [tl.at('regrow').start, 1.6, 0.8], [tl.at('final').start, 1.1, 1]] }),
  ambience: tl => [
    { type: 'city', from: 0, to: tl.at('office').start + 0.3, gain: 1 },
    { type: 'room', from: tl.at('office').start, to: tl.at('stranger').start + 0.3 },
    { type: 'rain', from: tl.at('stranger').start, to: tl.at('everyone').start + 0.3, gain: 0.8 },
    { type: 'night', from: tl.at('stranger').start, to: tl.at('everyone').start + 0.3, gain: 0.6 },
    { type: 'city', from: tl.at('everyone').start, to: tl.at('final').start + 0.3, gain: 1 },
    { type: 'crowd', from: tl.at('final').start, to: tl.total, gain: 0.5 },
  ],
  cover: { shot: 'everyone', at: 0.6 },
  shots: [
    // 0. hook: whispers swirl around his head
    { id: 'hook', min: 4.8, vo: 'एक सुबह, | उसे अचानक | सबके मन की *आवाज़ें* सुनाई देने लगीं।', sfx: [[0.1, 'boom', { gain: 0.5 }], [0.3, 'whisper', { dur: 4, gain: 0.09 }], [1.0, 'glitch'], [2.4, 'glitch']],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1a1440'], [1, '#3a1f5a']]); c.fillRect(0, 0, W, H);
        const [sx, sy] = shake(t, 2 + E(t, 0, 3) * 2, 20);
        c.save(); c.translate(sx, sy); cam(c, { z: lerp(1.15, 1.0, E(t, 0, S.dur, ease.out)), y: 470 });
        // rings of sound
        for (let i = 0; i < 4; i++) { const p = (t * 0.6 + i / 4) % 1; c.strokeStyle = `rgba(200,180,255,${0.5 * (1 - p)})`; c.lineWidth = 4; c.beginPath(); c.arc(270, 470, 120 + p * 300, 0, Math.PI * 2); c.stroke(); }
        toon(c, { x: 270, y: 470 + 760 * 0.72, h: 760, face: 0, t, style: HERO(0), expr: t < 1 ? 'neutral' : 'shock', look: [Math.sin(t * 3), -0.3], noShadow: true, sweat: t > 1.5,
          pose: { armF: [lerp(0.2, 2.75, E(t, 0.8, 1.4)), lerp(0.2, 2.1, E(t, 0.8, 1.4))], armB: [lerp(0.2, 2.75, E(t, 0.8, 1.4)), lerp(0.2, 2.1, E(t, 0.8, 1.4))] } });
        // little bubbles orbiting the head
        const words = ['...?', 'हम्म', '!!', '...', 'उफ़', '?!', 'अरे'];
        words.forEach((w, i) => { const a = t * 0.8 + i / words.length * Math.PI * 2, r = 210 + Math.sin(t * 2 + i) * 20, k = clamp((t - 0.4 - i * 0.18) / 0.3); if (k <= 0) return; bubble(c, 270 + Math.cos(a) * r, 430 + Math.sin(a) * r * 0.75, 74, 48, w, { thought: true, size: 18, scale: ease.back(k) * 0.9 }); });
        c.restore();
      } },
    // 1. at first: a superpower!
    { id: 'super', min: 5, tr: 'flash', vo: 'पहले उसे लगा... | ये कोई *सुपरपावर* है।', sfx: [[0.2, 'steps', { n: 8, gap: 0.5, gain: 0.2 }], [0.6, 'pop'], [1.2, 'pop', { f: 360 }], [1.8, 'pop', { f: 420 }], [2.6, 'sparkle']],
      draw(c, t, S) {
        const scroll = t * 50;
        street(c, t, { scroll });
        const ppl = [[60, 0, 0.6, 'चाय पीनी है ☕'], [430, 1, -0.6, 'बस छूट जाएगी!'], [330, 2, -0.4, 'आज बारिश होगी?']];
        ppl.forEach(([x, si, f, txt], i) => { toon(c, { x, y: 660, h: 220, face: f, t, style: PEOPLE[si], expr: 'neutral', blinkSeed: i }); });
        toon(c, { x: 210, y: 740, h: 290, face: t > 2.2 ? 0 : 0.5, t, style: HERO(0), expr: t > 2 ? 'joy' : 'happy', look: [0.5, -0.6], pose: t > 2.2 ? { armF: [2.5, 0.3], armB: [2.5, 0.3] } : {} });
        ppl.forEach(([x, si, f, txt], i) => thought(c, x, [430, 300, 430][i], txt, t, 0.5 + i * 0.6, { size: 18, dx: i === 1 ? -50 : i === 0 ? 40 : -10 }));
        if (t > 2.2) { c.save(); c.globalAlpha = clamp((t - 2.2) * 2); title(c, '✨', 210, 380, 40, { shadow: false, olw: 0 }); c.restore(); }
      } },
    // 2. then: judgments
    { id: 'judge', min: 5.5, tr: 'fade', vo: 'फिर उसने सुना... || लोग उसके *कपड़ों* पर हँस रहे थे।', sfx: [[0.4, 'pop', { f: 200 }], [1.0, 'pop', { f: 180 }], [1.5, 'pop', { f: 160 }], [1.2, 'whisper', { dur: 3, gain: 0.08 }]],
      draw(c, t, S) {
        street(c, t, { scroll: 60, top: '#b0b8d8', bottom: '#e6d6c8' });
        const k = E(t, 0.5, 2.5);
        const ppl = [[70, 3, 0.6, 'ये कैसे कपड़े हैं?'], [450, 4, -0.6, 'हा हा हा!'], [350, 1, -0.5, 'कितना अजीब है!']];
        ppl.forEach(([x, si, f], i) => toon(c, { x, y: 660, h: 220, face: f, t, style: PEOPLE[si], expr: t > 0.4 + i * 0.5 ? 'smirk' : 'neutral', look: [x < 210 ? 1 : -1, 0.2], blinkSeed: i }));
        toon(c, { x: 210, y: 740, h: 285, face: 0.3, t, style: HERO(k * 0.2), expr: t < 1 ? 'happy' : t < 2.4 ? 'worried' : 'sad', look: t > 2 ? [0, 1] : [Math.sin(t * 4), 0], headTilt: 0, pose: { headTilt: t > 2 ? 0.25 : 0, armF: [0.3, 0.6], armB: [0.3, 0.6] } });
        ppl.forEach(([x, si, f, txt], i) => thought(c, x, [430, 300, 430][i], txt, t, 0.4 + i * 0.5, { col: '#ffd6d0', size: 18, dx: i === 0 ? 50 : i === 1 ? -60 : -20 }));
        c.save(); c.globalAlpha = 0.18 * k; c.fillStyle = '#ff4a3a'; c.fillRect(0, 0, W, H); c.restore();
      } },
    // 3. at the office: his mistakes, his face, his success
    { id: 'office', min: 6, tr: 'black', vo: 'उसकी ग़लतियों पर... | उसकी शक्ल पर... | उसकी *कामयाबी* पर सवाल।', sfx: [[0.3, 'thud', { gain: 0.5 }], [0.35, 'paper', { n: 18 }], [1.2, 'pop', { f: 180 }], [2.4, 'pop', { f: 160 }], [3.6, 'pop', { f: 140 }]],
      draw(c, t, S) {
        c.fillStyle = '#cfd6e0'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(0,0,0,0.06)'; for (let x = 0; x < W; x += 60) c.fillRect(x, 0, 30, 640);
        rr(c, 60, 150, 180, 120, 6); ink(c, '#9fd0ff', 3); rr(c, 300, 150, 180, 120, 6); ink(c, '#9fd0ff', 3);
        c.fillStyle = '#7a7f8c'; c.fillRect(-60, 640, W + 120, 400);
        // flying papers
        for (let i = 0; i < 12; i++) { const p = clamp((t - 0.3) / 1.6), r = rng(i + 3), x = 260 + (r() - 0.5) * 420 * p, y = 520 - Math.sin(p * Math.PI) * 160 * r() + p * 180; c.save(); c.translate(x, y); c.rotate(p * 8 * (r() - 0.5)); rr(c, -14, -18, 28, 36, 2); ink(c, '#fbf7ec', 2); c.restore(); }
        const L = S.line(0), q = seg(t, L.a, L.b);
        const ppl = [[70, 3, 0.6, 'फिर से ग़लती?', 0.15], [460, 0, -0.6, 'शक्ल तो देखो!', 0.45], [370, 2, -0.5, 'प्रमोशन? इसे?', 0.75]];
        ppl.forEach(([x, si, f], i) => toon(c, { x, y: 660, h: 225, face: f, t, style: PEOPLE[si], expr: 'smirk', look: [x < 230 ? 1 : -1, 0.3], blinkSeed: i }));
        toon(c, { x: 230, y: 760, h: 280, face: 0.6, t, style: HERO(0.35), expr: t < 0.6 ? 'shock' : 'sad', look: [0.6, 1], pose: { crouch: t < 2 ? 0.5 : 0.2, lean: t < 2 ? 0.4 : 0.15 } });
        ppl.forEach(([x, si, f, txt, at], i) => thought(c, x, 430, txt, q, at, { col: '#ffd6d0', size: 18, dx: i === 0 ? 50 : i === 1 ? -60 : 0 }));
      } },
    // 4. he shrinks and turns grey, giant bubbles loom
    { id: 'shrink', min: 6.5, tr: 'fade', vo: 'धीरे-धीरे | वो बोलने से डरने लगा... | अपनी पसंद के कपड़े पहनने से... | *ख़ुद जैसा* होने से।', sfx: [[0.5, 'whisper', { dur: 5, gain: 0.08 }], [1, 'heartbeat', { n: 5, gap: 0.9, gain: 0.5 }]],
      draw(c, t, S) {
        const k = E(t, 0.2, S.dur - 0.8);
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, mix('#5a5a7a', '#14121e', k)], [1, '#0c0a12']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.3, k), y: lerp(480, 600, k) });
        c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(-60, 690, W + 120, 400);
        const texts = ['अजीब!', 'हा हा!', 'नालायक', 'ये कपड़े?!', 'चुप रहो', 'कमज़ोर'];
        texts.forEach((txt, i) => { const a = i / texts.length * Math.PI * 2 + t * 0.15, r = lerp(200, 150, k), sc = lerp(0.7, 1.15, k); thought(c, 270 + Math.cos(a) * r, 560 + Math.sin(a) * r * 0.75 + 70, txt, t, 0.3 + i * 0.35, { col: '#e8e0f0', size: 20 * sc, w: 130 * sc, h: 60 * sc }); });
        const h = lerp(280, 130, k);
        toon(c, { x: 270, y: 680 + h * 0.29, h, face: 0.7, t, style: HERO(k), expr: k > 0.5 ? 'scared' : 'worried', look: [-0.6, -0.6], noShadow: true,
          pose: { sit: true, legF: [lerp(1.45, 2.3, k), lerp(-1.45, -2.6, k)], legB: [lerp(1.4, 2.25, k), lerp(-1.45, -2.6, k)], armF: [lerp(0.5, 1.35, k), 1.0], armB: [lerp(0.4, 1.2, k), 1.0], lean: lerp(0, 0.2, k) } });
        c.restore();
      } },
    // 5. a night bus stop, a stranger
    { id: 'stranger', min: 5, tr: 'black', vo: 'फिर एक रात, | बस स्टॉप पर, | उसने एक *अजनबी* के ख़याल सुने।', sfx: [[0.2, 'splash', { gain: 0.15 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), x: 270, y: 500 });
        street(c, t, { night: true, seed: 13 });
        // the lamp and the shelter
        thick(c, [[470, 640], [470, 260], [430, 240]], 10, '#3a3a4a', 3); ell(c, 425, 250, 26, 10); ink(c, '#ffe08a', 3);
        c.fillStyle = rad(c, 425, 260, 10, 340, [[0, 'rgba(255,224,138,0.35)'], [1, 'rgba(255,224,138,0)']]); c.fillRect(100, 200, 440, 500);
        rr(c, 70, 360, 380, 16, 4); ink(c, '#4a5a6a', 3); thick(c, [[80, 376], [80, 640]], 8, '#4a5a6a', 3); thick(c, [[440, 376], [440, 640]], 8, '#4a5a6a', 3);
        rr(c, 110, 560, 300, 18, 6); ink(c, '#6a4a3a', 3);
        toon(c, { x: 170, y: 560 + 250 * 0.29, h: 250, face: 0.6, t, style: HERO(0.85), expr: 'tired', look: [1, 0.3], noShadow: true, pose: { sit: true, legF: [1.45, -1.45], legB: [1.4, -1.45], armF: [0.5, 0.8], armB: [0.4, 0.7] } });
        toon(c, { x: 360, y: 560 + 240 * 0.29, h: 240, face: -0.6, t, style: STRANGER, expr: 'sad', look: [0, 1], noShadow: true, pose: { sit: true, legF: [1.45, -1.45], legB: [1.4, -1.45], armF: [1.2, 1.1], armB: [1.1, 1.0], headTilt: 0.12 },
          hold: (c, h) => { rr(c, -8, -14, 16, 26, 3); ink(c, '#222', 2); c.fillStyle = '#9fd6ff'; c.fillRect(-5, -11, 10, 18); } });
        rain(c, t, 110, 'rgba(170,190,255,0.3)');
        c.restore();
      } },
    // 6. her thought: about herself
    { id: 'herthought', min: 4.8, tr: 'fade', vo: [{ text: 'क्या मैं कभी | किसी चीज़ में *अच्छी* हो पाऊँगी?', voice: 'f' }], sfx: [[0.2, 'chime', { notes: [76, 72, 69], gap: 0.2, gain: 0.5 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.35, x: 300, y: 470 });
        street(c, t, { night: true, seed: 13 });
        c.fillStyle = rad(c, 425, 260, 10, 340, [[0, 'rgba(255,224,138,0.35)'], [1, 'rgba(255,224,138,0)']]); c.fillRect(100, 200, 440, 500);
        rr(c, 110, 560, 300, 18, 6); ink(c, '#6a4a3a', 3);
        toon(c, { x: 170, y: 560 + 250 * 0.29, h: 250, face: 0.6, t, style: HERO(0.8), expr: t > 1.2 ? 'shock' : 'tired', look: [1, -0.4], noShadow: true, pose: { sit: true, legF: [1.45, -1.45], legB: [1.4, -1.45], armF: [0.5, 0.8], armB: [0.4, 0.7] } });
        toon(c, { x: 360, y: 560 + 240 * 0.29, h: 240, face: -0.6, t, style: STRANGER, expr: 'cry', look: [0, 1], noShadow: true, pose: { sit: true, legF: [1.45, -1.45], legB: [1.4, -1.45], armF: [1.2, 1.1], armB: [1.1, 1.0], headTilt: 0.12 } });
        thought(c, 350, 380, 'क्या मैं कभी\nअच्छी हो पाऊँगी?', t, 0.3, { w: 220, h: 96, size: 20, col: '#dfe9ff', dx: 0 });
        rain(c, t, 110, 'rgba(170,190,255,0.3)');
        c.restore();
      } },
    // 7. next morning: every bubble is about themselves
    { id: 'everyone', min: 6, tr: 'flash', vo: 'अगली सुबह | उसने ध्यान से सुना... || कोई भी उसके बारे में | *नहीं* सोच रहा था।', sfx: [[0.6, 'pop', { f: 420 }], [1.0, 'pop', { f: 460 }], [1.4, 'pop', { f: 500 }], [1.8, 'pop', { f: 540 }], [2.2, 'pop', { f: 580 }]],
      draw(c, t, S) {
        const scroll = 120 + t * 30;
        street(c, t, { scroll, top: '#ffd9a8', bottom: '#fff1d8' });
        const ppl = [[60, 0, 0.5, 'मेरा EMI...', 670], [175, 3, 0.3, 'बॉस नाराज़ है?', 690], [390, 1, -0.4, 'मोटी दिख रही हूँ?', 690], [490, 5, -0.6, 'मेरे घुटने...', 670]];
        ppl.forEach(([x, si, f, , y], i) => toon(c, { x, y, h: 220, face: f, t, style: PEOPLE[si], expr: 'worried', look: [0, 0.6], blinkSeed: i }));
        toon(c, { x: 280, y: 770, h: lerp(200, 240, E(t, 2, S.dur)), face: 0, t, style: HERO(lerp(0.75, 0.55, E(t, 2, S.dur))), expr: t < 2.4 ? 'worried' : 'shock', look: [Math.sin(t * 1.5), -0.5] });
        ppl.forEach(([x, si, f, txt, y], i) => thought(c, x, [430, 300, 430, 300][i], txt, t, 0.5 + i * 0.4, { size: 17, dx: [55, 0, 0, -65][i] }));
      } },
    // 8. the twist: pull back, everyone has their own storm
    { id: 'storms', min: 5.5, tr: 'fade', vo: 'हर कोई... || अपनी ही *लड़ाई* लड़ रहा था।', sfx: [[0.1, 'riser', { dur: 1.8, gain: 0.15 }], [1.9, 'boom', { gain: 0.5 }], [2, 'stinger', { gain: 0.6 }]],
      draw(c, t, S) {
        const k = E(t, 0, 2.2, ease.out);
        c.save(); cam(c, { z: lerp(1.2, 0.62, k), x: 270, y: lerp(560, 520, k) });
        sky(c, '#ffd9a8', '#fff1d8', -500, 640);
        skyline(c, 640, 21, '#b9a6c9', '#fff6c8', 0, 1.2);
        c.fillStyle = '#8d8a96'; c.fillRect(-400, 640, W + 800, 800);
        const r = rng(9);
        for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
          const x = -230 + i * 125 + row * 40 + r() * 20, y = 700 + row * 90, h = 170 + row * 25, st = PEOPLE[(i + row) % PEOPLE.length];
          if (row === 1 && i === 4) { toon(c, { x: 280, y, h: h * 1.05, face: 0, t, style: HERO(0.5), expr: 'shock', look: [Math.sin(t), -0.6] }); continue; }
          toon(c, { x, y, h, face: (i % 3) - 1, t, style: st, expr: ['worried', 'sad', 'tired'][i % 3], look: [0, 0.7], blinkSeed: i + row * 9 });
          // a little storm cloud of worry over every head
          const cy = y - h - 40 + Math.sin(t * 2 + i) * 4; c.fillStyle = '#5a5a6e'; blob(c, [[x - 40, cy], [x - 20, cy - 26], [x + 10, cy - 30], [x + 38, cy - 12], [x + 30, cy + 10], [x - 30, cy + 12]]); c.fill(); c.strokeStyle = OL; c.lineWidth = 3; c.stroke();
          if (((t * 3 + i + row) % 4) < 0.25) { thick(c, [[x, cy + 10], [x - 8, cy + 26], [x + 4, cy + 26], [x - 6, cy + 44]], 3, '#ffe24a', 0); }
          c.strokeStyle = 'rgba(160,190,255,0.7)'; c.lineWidth = 2; c.beginPath(); for (let d = 0; d < 4; d++) { const yy = cy + 14 + ((t * 80 + d * 11 + i * 7) % 30); c.moveTo(x - 24 + d * 14, yy); c.lineTo(x - 27 + d * 14, yy + 7); } c.stroke();
        }
        c.restore();
      } },
    // 9. he grows back: colour returns
    { id: 'regrow', min: 5, tr: 'flash', vo: 'और उस दिन... || वो फिर से *ख़ुद* बनकर चला।', sfx: [[0.2, 'sparkle'], [0.4, 'chime', { notes: [76, 79, 83, 88], gap: 0.1 }], [1.4, 'steps', { n: 6, gap: 0.45, gain: 0.25 }]],
      draw(c, t, S) {
        const k = E(t, 0, 1.6, ease.back), g = E(t, 0, 1.6);
        street(c, t, { scroll: t * 120, top: '#8fd0ff', bottom: '#fff1c8' });
        burst(c, 270, 520, 40, 600, 30, 'rgba(255,220,120,0.18)', g, t);
        toon(c, { x: 270, y: 760, h: lerp(200, 310, k), face: t > 1.6 ? 1 : 0, t, style: HERO(1 - g), expr: t > 1 ? 'joy' : 'happy', look: [1, -0.2], pose: t > 1.6 ? { walk: t * 7, amp: 0.9 } : { armF: [2.6, 0.2], armB: [2.6, 0.2] } });
        dust(c, 3, 30, t, [100, 300, 340, 400], '#fff1a0', 2.5, -30, g);
      } },
    // 10. the line to remember: on stage, the audience busy with themselves
    { id: 'final', min: 7.5, tr: 'black', vo: 'तुम उन लोगों की फ़िक्र में | ज़िंदगी गँवा रहे हो... || जो ख़ुद | अपनी ही *फ़िक्र* में डूबे हैं।', tail: 1.1, sfx: [[0.2, 'bell', { f: 392, gain: 0.5 }]],
      draw(c, t, S) {
        c.fillStyle = '#120c18'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.15, 1.0, E(t, 0, S.dur, ease.out)), y: 470 });
        // curtains and stage
        c.fillStyle = '#6a1a2a'; for (const s of [-1, 1]) { c.beginPath(); const x0 = s < 0 ? -40 : W + 40; c.moveTo(x0, -40); c.lineTo(W / 2 + s * 150, -40); c.quadraticCurveTo(W / 2 + s * 170, 200, x0 + s * -40, 420); c.lineTo(x0, 420); c.closePath(); ink(c, '#7a1f30', 3); }
        rr(c, -40, 440, W + 80, 30, 4); ink(c, '#5a3a28', 3);
        // spotlight on him
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lin(c, 0, -40, 0, 450, [[0, 'rgba(255,240,200,0.05)'], [1, 'rgba(255,240,200,0.3)']]); poly(c, [[230, -40], [310, -40], [380, 450], [160, 450]]); c.fill(); c.restore();
        toon(c, { x: 270, y: 450, h: 230, face: 0, t, style: HERO(0), expr: t < 2.5 ? 'worried' : 'happy', look: [0, 0.6], rim: '#fff0c8' });
        // the audience, from behind, each with a bubble about themselves
        const items = ['मेरा काम...', 'मेरा वज़न...', 'मेरे बिल...', 'मेरा फ़ोन', 'मेरा दिल...'];
        for (let i = 0; i < 5; i++) {
          const x = 60 + i * 105, y = 700;
          circ(c, x, y - 70, 42); ink(c, PEOPLE[i].hair === '#cfcac2' ? '#cfcac2' : PEOPLE[i].hair, 3);
          rr(c, x - 52, y - 40, 104, 120, 30); ink(c, PEOPLE[i].shirt || PEOPLE[i].jacket, 3);
          rr(c, x - 60, y + 10, 120, 70, 10); ink(c, '#3a1a2a', 3);
          thought(c, x, y - 60, items[i], t, 1.0 + i * 0.35, { size: 15, w: 112, h: 52, dx: 0, col: '#f0ecff' });
        }
        c.restore();
      } },
  ],
};
