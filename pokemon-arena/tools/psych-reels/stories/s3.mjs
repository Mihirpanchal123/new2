// 3. The Boy Who Was Afraid of Shadows: anxiety and overthinking.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, stars, moon, fog, spookyTree, mountains, hills, grass, dust, rays, title, bubble, flash, black, burst, star, noise1, speedLines } from '../engine.mjs';

const BOY = { kid: true, hairStyle: 'kid', hair: '#3a2418', shirt: '#e8a33a', pants: '#3a4a7a', skin: '#e2a47c', shoes: '#3a2a26' };
const SHADE = { kid: true, hairStyle: 'kid', hair: '#07040c', shirt: '#07040c', pants: '#07040c', skin: '#07040c', shoes: '#07040c', eyes: '#07040c', faceless: true };

// the night forest, scrolling with sx; the moon sits on the right (ahead of him while he walks right)
function forest(c, t, sx = 0, o = {}) {
  sky(c, o.top || '#070a1e', o.bottom || '#283a6a', 0, 700); stars(c, 5, 70, t, 520);
  moon(c, o.moonX ?? 430, o.moonY ?? 190, o.moonR ?? 46, '#f4f0d8', 0.55);
  const layer = (k, col, seed, s, y, n) => { const r = rng(seed); for (let i = 0; i < n; i++) { const base = r() * (W + 300); const x = ((base - sx * k) % (W + 300) + (W + 300)) % (W + 300) - 150; spookyTree(c, x, y, s * (0.8 + r() * 0.4), col, seed + i, t, 0.6); } };
  layer(0.25, '#1a2448', 11, 0.9, 640, 6);
  fog(c, 600, 120, '#6a7ab0', 0.18, t, 2);
  layer(0.55, '#111833', 23, 1.2, 690, 5);
  c.fillStyle = lin(c, 0, 660, 0, H, [[0, '#141a30'], [1, '#07080f']]); c.fillRect(-60, 660, W + 120, 400);
  c.fillStyle = 'rgba(200,210,255,0.06)'; ell(c, 270, 690, 380, 26); c.fill();
  fog(c, 700, 80, '#8090c0', 0.12, t * 1.5, 7);
}
// the boy's shadow: k = 0 a plain shadow, 1 = a monster (horns, claws, burning eyes)
function shadow(c, x, y, h, pose, t, k = 0, o = {}) {
  c.save(); c.globalAlpha *= o.alpha ?? 0.92;
  if (k > 0.01) { c.fillStyle = rad(c, x, y - h * 0.6, 10, h * 0.9, [[0, `rgba(80,10,60,${0.35 * k})`], [1, 'rgba(80,10,60,0)']]); c.fillRect(x - h, y - h * 1.6, h * 2, h * 2); }
  // ragged smoke around the edges
  if (k > 0.01) { const r = rng(9); c.fillStyle = 'rgba(7,4,12,0.85)'; for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = h * (0.12 + r() * 0.16); circ(c, x + Math.cos(a + t * 0.6) * d * 0.6, y - h * 0.6 + Math.sin(a + t) * d * 1.4, h * 0.05 * (0.6 + r()) * k); c.fill(); } }
  toon(c, { x, y, h, face: o.face ?? 1, t, style: SHADE, pose, noShadow: true });
  const f = o.face ?? 1, hx = x + h * 0.01 * f, hy = y - h * 0.72 + (pose?.headY || 0), R = h * 0.225;
  if (k > 0.01) {
    c.save(); c.globalAlpha *= k;
    // horns
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + s * R * 0.5, hy - R * 0.6); c.quadraticCurveTo(hx + s * R * 1.3, hy - R * 1.3, hx + s * R * 0.9, hy - R * 2.0); c.quadraticCurveTo(hx + s * R * 0.8, hy - R * 1.2, hx + s * R * 0.15, hy - R * 0.85); c.fillStyle = '#07040c'; c.fill(); }
    // burning eyes and teeth
    const ex = hx + f * R * 0.3;
    for (const s of [-1, 1]) { c.save(); c.translate(ex + s * R * 0.32, hy - R * 0.05); c.rotate(-s * f * 0.3); c.fillStyle = rad(c, 0, 0, 1, R * 0.6, [[0, 'rgba(255,90,60,0.6)'], [1, 'rgba(255,90,60,0)']]); c.fillRect(-R * 0.6, -R * 0.6, R * 1.2, R * 1.2); ell(c, 0, 0, R * 0.17, R * 0.08 * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.7 + 1)) ** 0.1)); c.fillStyle = '#ffd24a'; c.fill(); c.restore(); }
    c.fillStyle = '#e8e0f0'; c.beginPath(); for (let i = 0; i < 6; i++) { const xx = ex - R * 0.4 + i * R * 0.16; c.moveTo(xx, hy + R * 0.42); c.lineTo(xx + R * 0.08, hy + R * 0.62); c.lineTo(xx + R * 0.16, hy + R * 0.42); } c.fill();
    c.restore();
  }
  c.restore();
}
const run = (t, rate = 11) => ({ walk: t * rate, run: true });

export default {
  slug: 'boy-afraid-of-shadows',
  title: 'वो लड़का, जो परछाइयों से डरता था',
  accent: '#8fb4ff',
  grade: { col: '#1e2c6e', amt: 0.2 },
  music: tl => ({ root: 43, scale: 'phrygian', prog: [0, 1, 0, 6], chord: 4.6, level: 0.24, warmth: 700, pulse: true, dyn: [[tl.at('run').start, 1.5, 0.8], [tl.at('tired').start, 0.6, 0.8], [tl.at('turn').start, 1.8, 0.5], [tl.at('twist').start + 0.5, 0.4, 0.4], [tl.at('calm').start, 0.8, 1.5]] }),
  ambience: tl => [{ type: 'night', from: 0, to: tl.total }, { type: 'wind', from: 0, to: tl.at('twist').start, gain: 0.8 }, { type: 'river', from: tl.at('river').start, to: tl.at('river').start + tl.at('river').dur + 0.4 }, { type: 'heart', from: tl.at('hide').start, to: tl.at('hide').start + tl.at('hide').dur, gain: 0.8 }, { type: 'birds', from: tl.at('calm').start, to: tl.total, gain: 0.6 }],
  cover: { shot: 'turn', at: 0.7 },
  shots: [
    // 0. hook: eyes open in the dark forest, something huge rises
    { id: 'hook', min: 4.4, vo: 'उस जंगल में... || कोई उसका *पीछा* कर रहा था।', sfx: [[0.2, 'growl', { dur: 2 }], [0.1, 'boom']],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.25, 1.05, E(t, 0, S.dur, ease.out)), y: 480 });
        forest(c, t, 0, { moonX: 470, moonY: 120, moonR: 30 });
        const k = E(t, 0.3, 2.5, ease.out);
        shadow(c, 270, 700 + (1 - k) * 200, 620, { armF: [1.2, 0.6], armB: [1.4, 0.4], lean: 0.1 }, t, 1, { face: 0.3, alpha: 0.95 });
        c.restore();
        flash(c, (1 - seg(t, 0, 0.3)) * 0.5, '#000');
      } },
    // 1. walking at night, his shadow behind him
    { id: 'walk', min: 8, tr: 'black', vo: ['एक छोटा लड़का, | हर रात | इसी जंगल से *घर* लौटता।', 'और हर क़दम पर, | उसके पीछे | एक *डरावनी* परछाईं चलती।'], gap: 0.2, sfx: [[0.3, 'steps', { n: 15, gap: 0.5, gain: 0.2 }], [s => s.lines[1].a + 1.6, 'growl', { dur: 1.2, gain: 0.14 }]],
      draw(c, t, S) {
        const tb = S.line(1).a + 1.5, sx = t * 40, back = t > tb ? E(t, tb, tb + 0.4) : 0, mon = E(t, S.line(1).a - 0.3, S.line(1).a + 1.2);
        c.save(); cam(c, { z: 1.05, y: 520 });
        forest(c, t, sx);
        const ph = t * 6.5;
        shadow(c, 150, 740, lerp(250, 340, mon), { walk: ph, amp: 0.7 }, t, 0.6 * mon, { alpha: lerp(0.5, 0.92, mon) });
        toon(c, { x: 330, y: 780, h: 250, face: lerp(1, -0.8, back), t, style: BOY, expr: back ? 'scared' : 'worried', look: back ? [-1, -0.3] : [1, 0], pose: { walk: ph, amp: 0.7 }, rim: '#cfd8ff' });
        c.restore();
      } },
    // 2. he runs; the shadow grows
    { id: 'run', min: 4.8, tr: 'cut', vo: 'वो जितना तेज़ भागता... | परछाईं उतनी ही *बड़ी* हो जाती।', sfx: [[0, 'run', { n: 16, gap: 0.28, gain: 0.3 }], [0.2, 'heartbeat', { n: 6, gap: 0.55, gain: 0.6 }], [2.4, 'growl', { dur: 1.8, gain: 0.22 }]],
      draw(c, t, S) {
        const sx = t * 260, k = E(t, 0, S.dur);
        const [shx, shy] = shake(t, 2.5, 18);
        c.save(); c.translate(shx, shy); cam(c, { z: 1.05, y: 520 });
        forest(c, t, sx);
        const ph = t * 12;
        shadow(c, lerp(150, 170, k), 760, lerp(360, 560, k), run(t, 12), t, lerp(0.6, 1, k), { face: 1 });
        toon(c, { x: 360, y: 790, h: 250, face: 1, t, style: BOY, expr: 'scared', look: [-1, 0], pose: { walk: ph, run: true }, sweat: true, rim: '#cfd8ff' });
        speedLines(c, 280, 610, 70, 6, -1, 'rgba(200,210,255,0.45)', t);
        c.restore();
      } },
    // 3. he hides behind a tree; it finds him
    { id: 'hide', min: 5, tr: 'fade', vo: 'वो पेड़ों के पीछे छिपा... || पर वो उसे हर बार *ढूँढ* लेती।', sfx: [[2.4, 'whoosh', { dur: 0.8, f: 200, f2: 900 }], [2.6, 'growl', { dur: 1.6, gain: 0.25 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.1, 1.22, S.p), x: 290, y: 520 });
        forest(c, t, 300);
        // the peeking monster head appears around the trunk
        const k = E(t, 2.3, 3.2, ease.out);
        shadow(c, lerp(120, 200, k), 900, 700, { lean: 0.3 * k, armF: [1.8, 0.8] }, t, 1, { face: 1, alpha: 0.95 * k });
        // the big trunk
        c.beginPath(); c.moveTo(210, 960); c.quadraticCurveTo(240, 600, 220, 200); c.lineTo(330, 200); c.quadraticCurveTo(310, 600, 350, 960); c.closePath(); ink(c, '#20160f', 4); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(300, 200, 20, 760);
        toon(c, { x: 400, y: 790, h: 260, face: -0.8, t, style: BOY, expr: t < 2.4 ? 'worried' : 'scared', mouth: t > 2.4 ? 'wavy' : null, look: [-1, -0.2], pose: { armF: [2.6, 1.6], lean: -0.1, crouch: 0.2 }, sweat: true, rim: '#cfd8ff' });
        c.restore();
      } },
    // 4. mountains
    { id: 'mountain', min: 2.8, tr: 'flash', vo: 'उसने पहाड़ चढ़े,', sfx: [[0.1, 'whoosh'], [0.4, 'steps', { n: 5, gap: 0.4, f: 1200 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.0, y: 480 + t * 10 });
        sky(c, '#0a0d24', '#3a4a7a', 0, 700); stars(c, 9, 60, t, 500); moon(c, 440, 150, 34);
        mountains(c, 760, '#1e2650', 3, 4, 360, '#c8d0f0');
        // the slope he climbs
        poly(c, [[-40, 960], [-40, 820], [560, 420], [600, 960]]); ink(c, '#2a335f', 4);
        const k = S.p, x = lerp(170, 330, k), y = 820 - (x + 40) * 0.667 + 6;
        shadow(c, x - 120, y + 80, 300, { walk: t * 7, lean: 0.4 }, t, 0.8, { alpha: 0.85 });
        toon(c, { x, y, h: 240, face: 1, t, style: BOY, expr: 'determined', pose: { walk: t * 7, amp: 0.9, lean: 0.35, armF: [2.2 + Math.sin(t * 7) * 0.4, 0.4] }, rim: '#cfd8ff' });
        c.restore();
      } },
    // 5. rivers
    { id: 'river', min: 2.8, tr: 'flash', vo: 'नदियाँ पार कीं,', sfx: [[0.3, 'splash'], [1.2, 'splash', { gain: 0.3 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.0, y: 520 });
        forest(c, t, 600);
        c.fillStyle = lin(c, 0, 660, 0, 900, [[0, '#2a4a8a'], [1, '#132448']]); c.fillRect(-40, 660, W + 80, 260);
        c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const y = 690 + i * 28, o = (t * 60 + i * 40) % 80; c.beginPath(); for (let x = -40 - o; x < W + 40; x += 80) { c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 6, x + 40, y); } c.stroke(); }
        const stones = [90, 230, 370, 500]; stones.forEach(x => { ell(c, x, 790, 52, 16); ink(c, '#4a4e66', 3); });
        // hopping from stone to stone
        const p = S.p * 3, i = Math.min(2, Math.floor(p)), f = p - i, x = lerp(stones[i], stones[i + 1], f), y = 780 - Math.sin(f * Math.PI) * 90;
        toon(c, { x, y, h: 230, face: 1, t, style: BOY, expr: 'scared', pose: { legF: [0.9, -1.2], legB: [-0.6, -0.5], armF: [2.4, 0.3], armB: [-1.2, 0.4] }, noShadow: true, rim: '#cfd8ff' });
        c.fillStyle = 'rgba(200,220,255,0.5)'; for (let j = 0; j < 6; j++) { const a = (f + j / 6) * 3; if (f < 0.2) circ(c, stones[i] + Math.cos(j) * 30 * f * 5, 785 - Math.abs(Math.sin(j * 2)) * 30 * f * 5, 3); c.fill(); }
        c.restore();
      } },
    // 6. years of running: he grows up while running
    { id: 'years', min: 3.4, tr: 'flash', vo: 'और *सालों* तक भागता रहा।', sfx: [[0, 'run', { n: 10, gap: 0.3, gain: 0.25 }], [0.2, 'whoosh', { dur: 2.5 }]],
      draw(c, t, S) {
        const k = S.p;
        c.fillStyle = '#060814'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: 1.0, y: 500 });
        sky(c, mix('#070a1e', '#1a1030', k), mix('#283a6a', '#4a2a5a', k), 0, 700);
        // moon phases spinning by
        for (let i = 0; i < 5; i++) { const x = ((i * 140 - t * 220) % 700 + 700) % 700 - 80; circ(c, x, 200, 26); c.fillStyle = '#f4f0d8'; c.fill(); circ(c, x + 26 - i * 13, 196, 26); c.fillStyle = '#1a1838'; c.fill(); }
        c.fillStyle = '#10142a'; c.fillRect(-40, 700, W + 80, 300);
        const h = lerp(220, 300, k);
        shadow(c, 160, 760, h * 1.5, run(t, 12), t, 0.9);
        toon(c, { x: 340, y: 790, h, face: 1, t, style: { ...BOY, kid: k < 0.5, hairStyle: k < 0.5 ? 'kid' : 'messy', shirt: mix('#e8a33a', '#a0603a', k) }, expr: 'tired', pose: run(t, 12), sweat: true, rim: '#cfd8ff' });
        speedLines(c, 260, 600, 80, 6, -1, 'rgba(200,210,255,0.4)', t);
        c.restore();
      } },
    // 7. exhausted; he decides to face it
    { id: 'tired', min: 6, tr: 'black', vo: 'आख़िरकार, | थककर चूर... || उसने तय किया | कि अब वो *मुड़कर* सामना करेगा।', sfx: [[0.2, 'heartbeat', { n: 3, gap: 1, gain: 0.4 }]],
      draw(c, t, S) {
        const up = E(t, S.line(0).a + 2.2, S.line(0).a + 3.2);
        c.save(); cam(c, { z: lerp(1.05, 1.2, S.p), x: 290, y: 520 });
        sky(c, '#0a0d24', '#3a3a6a', 0, 700); stars(c, 4, 60, t, 500); moon(c, 450, 230, 40);
        hills(c, 720, 30, '#161c38', 5, t);
        const pant = Math.sin(t * 7) * 0.05 * (1 - up);
        shadow(c, 140, 770, 380, { crouch: lerp(0.8, 0, up), lean: lerp(0.5, 0, up) }, t, 0.7);
        toon(c, { x: 330, y: 790, h: 290, face: 1, t, style: { ...BOY, kid: false, hairStyle: 'messy' }, expr: up > 0.5 ? 'determined' : 'tired', look: up > 0.5 ? [1, 0] : [0, 0.7], sweat: up < 0.5, mouth: up < 0.5 ? 'o' : null,
          pose: { crouch: lerp(0.8, 0, up), lean: lerp(0.55 + pant, 0, up), armF: up > 0.5 ? [0.3, 1.7] : [0.9, 0.2], armB: up > 0.5 ? [0.3, 1.7] : [0.7, 0.2], legF: [lerp(0.6, 0.15, up), lerp(-0.9, 0, up)], legB: [lerp(-0.3, -0.15, up), lerp(-0.6, 0, up)] }, rim: '#cfd8ff' });
        c.restore();
      } },
    // 8. he turns around: the monster towers over him
    { id: 'turn', min: 4.2, tr: 'cut', vo: [{ text: 'कौन हो तुम?!', voice: 'kid', delay: 0.9 }], sfx: [[0.1, 'whoosh', { dur: 0.4 }], [0.5, 'growl', { dur: 2.5, gain: 0.35 }], [0.6, 'boom', { gain: 0.6 }]],
      draw(c, t, S) {
        const [sx, sy] = shake(t, 4 * (1 - seg(t, 0.6, 3)), 22);
        c.save(); c.translate(sx, sy); cam(c, { z: lerp(1.0, 1.12, S.p), x: 270, y: 470 });
        forest(c, t, 900, { moonX: 520, moonY: 210 });
        shadow(c, 200, 800, lerp(500, 760, E(t, 0, 1.5, ease.out)), { armF: [2.4, 0.6], armB: [2.2, 0.7], lean: 0.12 }, t, 1, { face: 1 });
        toon(c, { x: 400, y: 820, h: 290, face: lerp(1, -1, E(t, 0, 0.4)), t, style: { ...BOY, kid: false, hairStyle: 'messy' }, expr: 'scared', talk: S.speaking(t, 0) ? 1 : 0, look: [-1, -0.9], pose: { armF: [0.9, 1.2], lean: 0.1 }, sweat: true, rim: '#ffe6b0' });
        c.restore();
      } },
    // 9. the twist: it's only his shadow; he waves and it waves
    { id: 'twist', min: 8, tr: 'cut', lead: 1.6, vo: 'पर तब उसने देखा... ||| वो राक्षस, | उसकी अपनी ही *परछाईं* थी।', sfx: [[0.1, 'sparkle'], [0.2, 'chime', { notes: [72, 76, 79, 84], gap: 0.15 }]],
      draw(c, t, S) {
        const k = E(t, 0.2, 2.2), wave = Math.sin(t * 7) * 0.3 * seg(t, 3, 3.5);
        c.save(); cam(c, { z: lerp(1.2, 1.0, E(t, 0, 3, ease.out)), x: 280, y: 480 });
        forest(c, t, 900, { moonX: 500, moonY: lerp(210, 260, k), moonR: lerp(46, 56, k) });
        rays(c, 520, 260, -1.3, 0.5, 700, '#f4f0d8', 0.18 * k, t, 4);
        const wv = E(t, 2.5, 3), arm = t > 2.5 ? [lerp(0.1, 2.5, wv) + wave, 0.3] : [lerp(2.4, 0.1, k), lerp(0.6, 0.2, k)], fc = lerp(-1, 0, wv);
        shadow(c, 175, 800, lerp(760, 430, k), { armF: arm, lean: lerp(0.12, 0, k) }, t, 1 - k, { face: fc });
        toon(c, { x: 390, y: 820, h: 290, face: fc, t, style: { ...BOY, kid: false, hairStyle: 'messy' }, expr: t < 2.5 ? 'shock' : 'joy', look: [-1, -0.3], pose: { armF: arm }, rim: '#ffe6b0' });
        c.restore();
      } },
    // 10. it was never chasing him
    { id: 'calm', min: 5.5, tr: 'fade', vo: 'जिससे वो पूरी ज़िंदगी भागता रहा... || वो कभी उसका *पीछा* | कर ही नहीं रहा था।',
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 520 });
        sky(c, '#1a2a5a', '#e8a07a', 0, 700); moon(c, 460, 170, 34, '#f8f2dc', 0.3);
        hills(c, 690, 30, '#2a3a5a', 3, t); hills(c, 740, 24, '#1e2a44', 6, t);
        c.fillStyle = '#18213a'; c.fillRect(-40, 740, W + 80, 300);
        // sitting side by side: him and his ordinary shadow
        ell(c, 270, 760, 150, 26); ink(c, '#3a4058', 3);
        shadow(c, 190, 745 + 0.29 * 260, 260, { sit: true, legF: [1.5, -1.5], legB: [1.45, -1.5], armF: [0.6, 0.4] }, t, 0, { face: 0.7, alpha: 0.8 });
        toon(c, { x: 340, y: 745 + 0.29 * 260, h: 260, face: -0.7, t, style: { ...BOY, kid: false, hairStyle: 'messy' }, expr: 'happy', look: [-1, 0.2], noShadow: true, pose: { sit: true, armF: [0.6, 0.4] } });
        dust(c, 14, 22, t, [0, 380, W, 340], '#fff1a0', 2.2, -5, 0.8);
        c.restore();
      } },
    // 11. the line to remember: a monster in a thought bubble pops
    { id: 'final', min: 7, tr: 'black', vo: 'कभी-कभी | हमारा *दिमाग़* ऐसे राक्षस बना लेता है... || जो हक़ीक़त ने | कभी बनाए ही नहीं।', tail: 1.0, sfx: [[s => s.lines[0].a + 3.4, 'pop', { f: 500, gain: 0.5 }], [s => s.lines[0].a + 3.4, 'sparkle']],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#121a3a'], [1, '#05060c']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.1, 1.0, E(t, 0, S.dur, ease.out)), y: 480 });
        const pop = S.line(0).a + 3.4, k = seg(t, pop, pop + 0.4);
        toon(c, { x: 270, y: 900, h: 620, face: 0, t, style: { ...BOY, kid: false, hairStyle: 'messy' }, expr: t < pop ? 'worried' : 'happy', look: [0.4, -1], noShadow: true, rim: '#8fb4ff' });
        // the thought bubble with a tiny monster in it
        if (t < pop + 0.05) {
          const g = ease.back(seg(t, 0.3, 1.0)), wob = 1 + Math.sin(t * 6) * 0.03 + seg(t, pop - 0.6, pop) * 0.15;
          for (let i = 1; i <= 3; i++) { circ(c, 330 + i * 18, 470 - i * 34, (4 + i * 4) * g); ink(c, '#f0f2ff', 3); }
          c.save(); c.translate(400, 240); c.scale(g * wob, g * wob);
          bubble(c, 0, 0, 230, 180, '', { thought: true, col: '#f0f2ff' });
          c.save(); c.translate(0, 70); shadow(c, 0, 0, 140, { armF: [2.4, 0.6], armB: [2.2, 0.6] }, t, 1, { face: 0 }); c.restore();
          c.restore();
        } else {
          burst(c, 400, 240, 30, 160 + k * 60, 18, '#f0f2ff', 1 - k, t);
          for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.save(); c.globalAlpha = 1 - k; c.fillStyle = '#fff1a0'; star(c, 400 + Math.cos(a) * (40 + k * 140), 240 + Math.sin(a) * (40 + k * 140), 9, 4); c.fill(); c.restore(); }
        }
        c.restore();
      } },
  ],
};
