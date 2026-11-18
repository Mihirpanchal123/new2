// 4. The King Who Wanted Everyone's Approval: validation and ego.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, person, sky, sun, stars, moon, hills, roundTree, grass, rays, dust, title, bubble, flash, black, burst, star, noise1 } from '../engine.mjs';

const KING = { crown: true, top: 'robe', robe: '#9a2a3e', cape: '#6a1a2a', trim: '#f4ecd8', hair: '#3a2a20', beard: '#3a2a20', beardLen: 0.05, skin: '#e0a77a', hairStyle: 'short', pants: '#4a1a24', shoes: '#3a1a14' };
const GOLDEN = { crown: '#ffe27a', top: 'robe', robe: '#e0b030', cape: '#c89a20', trim: '#ffe9a0', hair: '#c89a20', beard: '#c89a20', beardLen: 0.05, skin: '#f0c040', hairStyle: 'short', pants: '#c89a20', shoes: '#b08818', eyes: '#8a6a10', brow: '#a8801a' };
const KID = { kid: true, hairStyle: 'bun', hair: '#2a1a14', shirt: '#7ab0e0', pants: '#4a5a8a', skin: '#e2a47c' };
const CROWD = ['#e8735a', '#5aa0e8', '#6ac48a', '#e8c05a', '#b07ae0', '#e87aa8', '#5ac8c8'];

// the palace, feet at (x, gy); k = how far it has risen; tw = extra tower height; gold = how golden;
// flip 0..1 turns it round like a card: past half-way we see its back: just painted boards on wooden braces (a stage set)
function palace(c, x, gy, s, o = {}) {
  const k = o.k ?? 1, tw = o.tw ?? 0, gold = o.gold ?? 0, flip = o.flip ?? 0, t = o.t ?? 0;
  c.save(); c.translate(x, gy); c.scale(s, s);
  const sq = k < 1 ? ease.back(k) : 1; c.scale(1, Math.max(0.001, sq));
  const fx = Math.cos(flip * Math.PI), back = fx < 0;
  c.scale(Math.max(0.02, Math.abs(fx)), 1);
  const wood = '#b07a44', marble = back ? wood : mix('#f4ecdc', '#f2c94c', gold), trim = back ? shade(wood, -0.15) : '#e0aa2a', dome = back ? wood : mix('#f6d27a', '#f2b82a', gold);
  const win = col => back ? null : col, lw = 3;
  const flag = (fxp, fy, col) => { thick(c, [[fxp, fy], [fxp, fy - 50]], 3, '#5a4030', 1.5); if (back) return; c.beginPath(); c.moveTo(fxp, fy - 50); for (let i = 0; i <= 6; i++) c.lineTo(fxp + i * 7, fy - 48 + Math.sin(t * 6 + i) * 3 + i * 0.8); for (let i = 6; i >= 0; i--) c.lineTo(fxp + i * 7, fy - 30 + Math.sin(t * 6 + i) * 3 + i * 0.8); c.closePath(); ink(c, col, 2); };
  // towers behind the wings
  for (const sx of [-1, 1]) { const X = sx * 200, th = 240 + tw * 230; rr(c, X - 30, -th, 60, th, 6); ink(c, marble, lw); if (!back) for (let y = -th + 30; y < -180; y += 50) { rr(c, X - 9, y, 18, 26, 9); ink(c, '#5a4a7a', 2); } rr(c, X - 38, -th - 12, 76, 16, 4); ink(c, trim, lw); c.beginPath(); c.moveTo(X - 34, -th - 12); c.quadraticCurveTo(X, -th - 70, X + 34, -th - 12); c.closePath(); ink(c, dome, lw); flag(X, -th - 52, '#d8283a'); }
  rr(c, -260, -24, 520, 24, 4); ink(c, back ? wood : shade(marble, -0.15), lw);
  // wings with battlements
  for (const sx of [-1, 1]) { const X0 = sx > 0 ? 130 : -250; rr(c, X0, -170, 120, 150, 4); ink(c, marble, lw); for (let i = 0; i < 5; i++) { rr(c, X0 + 4 + i * 24, -188, 16, 20, 2); ink(c, marble, lw); } if (!back) for (const wx of [X0 + 30, X0 + 90]) { c.beginPath(); c.moveTo(wx - 14, -50); c.lineTo(wx - 14, -110); c.quadraticCurveTo(wx, -132, wx + 14, -110); c.lineTo(wx + 14, -50); c.closePath(); ink(c, '#5a4a7a', 2.5); } }
  // main hall
  rr(c, -135, -270, 270, 250, 4); ink(c, marble, lw);
  if (!back) {
    c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(50, -268, 83, 246);
    for (const xx of [-85, 85]) { c.beginPath(); c.moveTo(xx - 20, -150); c.lineTo(xx - 20, -215); c.quadraticCurveTo(xx, -245, xx + 20, -215); c.lineTo(xx + 20, -150); c.closePath(); ink(c, '#5a4a7a', 3); }
    c.beginPath(); c.moveTo(-42, -24); c.lineTo(-42, -125); c.quadraticCurveTo(0, -180, 42, -125); c.lineTo(42, -24); c.closePath(); ink(c, '#6a2a3a', 3);
    rr(c, -70, -150, 140, 12, 4); ink(c, trim, 2.5); for (let i = 0; i < 6; i++) { rr(c, -62 + i * 25, -138, 8, 16, 3); ink(c, trim, 1.5); }
    c.fillStyle = '#d8283a'; rr(c, -110, -260, 28, 80, 3); c.fill(); rr(c, 82, -260, 28, 80, 3); c.fill(); c.fillStyle = '#ffd24a'; circ(c, -96, -225, 7); c.fill(); circ(c, 96, -225, 7); c.fill();
  }
  rr(c, -150, -282, 300, 16, 4); ink(c, trim, lw);
  // the great dome
  c.beginPath(); c.moveTo(-95, -282); c.bezierCurveTo(-155, -360, -45, -420, 0, -470); c.bezierCurveTo(45, -420, 155, -360, 95, -282); c.closePath(); ink(c, dome, lw);
  if (!back) { c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, -42, -350, 15, 38, 0.3); c.fill(); }
  flag(0, -465, '#ffd24a');
  if (back) {
    // planks, braces and sandbags: it was never a real palace
    c.save(); c.beginPath(); c.rect(-250, -170, 120, 150); c.rect(130, -170, 120, 150); c.rect(-135, -270, 270, 250); for (const sx of [-1, 1]) c.rect(sx * 200 - 30, -240 - tw * 230, 60, 240 + tw * 230); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-260, -480 - tw * 230, 520, 460 + tw * 230); c.strokeStyle = 'rgba(60,30,10,0.45)'; c.lineWidth = 2; c.beginPath(); for (let xx = -250; xx < 260; xx += 26) { c.moveTo(xx, -24); c.lineTo(xx, -720); } c.stroke(); c.restore();
    for (const xx of [-210, -90, 40, 170]) { poly(c, [[xx, 0], [xx + 70, 0], [xx, -200]]); ink(c, '#8a5a2a', 3); thick(c, [[xx + 8, -60], [xx + 46, -60]], 6, '#6a4220', 2); ell(c, xx + 50, -8, 22, 12); ink(c, '#c8b48a', 2.5); }
  }
  c.restore();
}
function throne(c, x, gy, s) {
  c.save(); c.translate(x, gy); c.scale(s, s);
  c.beginPath(); c.moveTo(-70, -60); c.lineTo(-70, -300); c.quadraticCurveTo(-70, -360, 0, -380); c.quadraticCurveTo(70, -360, 70, -300); c.lineTo(70, -60); c.closePath(); ink(c, '#e0aa2a', 4);
  rr(c, -50, -300, 100, 220, 30); ink(c, '#9a2a3e', 3);
  c.fillStyle = '#fff3b0'; star(c, 0, -345, 18, 8); c.fill();
  rr(c, -95, -110, 190, 40, 10); ink(c, '#e0aa2a', 4); rr(c, -85, -70, 170, 70, 6); ink(c, '#c8901a', 4);
  for (const sx of [-1, 1]) { rr(c, sx * 95 - 15, -170, 30, 80, 10); ink(c, '#e0aa2a', 3); }
  c.restore();
}
function hall(c, t, o = {}) {
  c.fillStyle = lin(c, 0, 0, 0, 680, [[0, '#2a1630'], [1, '#4a2638']]); c.fillRect(-60, -60, W + 120, 760);
  // tall windows with light
  for (const x of [80, 270, 460]) { c.beginPath(); c.moveTo(x - 36, 420); c.lineTo(x - 36, 150); c.quadraticCurveTo(x, 90, x + 36, 150); c.lineTo(x + 36, 420); c.closePath(); ink(c, o.night ? '#1a2048' : '#ffe7b0', 4); }
  if (!o.night) for (const x of [80, 460]) rays(c, x, 260, x < 270 ? -0.6 : 0.6, 0.25, 600, '#ffe2a0', 0.12, t, 3);
  for (const x of [-10, 175, 365, 550]) { rr(c, x - 22, 80, 44, 600, 8); ink(c, '#c89a5a', 3); rr(c, x - 30, 70, 60, 20, 4); ink(c, '#e0aa2a', 3); }
  c.fillStyle = lin(c, 0, 680, 0, H, [[0, '#3a2030'], [1, '#160c14']]); c.fillRect(-60, 680, W + 120, 400);
  poly(c, [[230, 680], [310, 680], [470, 1000], [70, 1000]]); ink(c, '#9a2a3e', 0);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-60, 678, W + 120, 6);
}
function outside(c, t, o = {}) {
  sky(c, o.top || '#6ab0f0', o.bottom || '#ffe0b0', 0, 700); sun(c, o.sunX ?? 90, o.sunY ?? 160, 34, '#ffe08a', 0.4);
  for (let i = 0; i < 3; i++) { const x = ((i * 220 + t * 10) % 800) - 140, y = 120 + i * 50; c.fillStyle = 'rgba(255,255,255,0.85)'; blob(c, [[x, y], [x + 40, y - 24], [x + 90, y - 18], [x + 120, y + 4], [x + 60, y + 14]]); c.fill(); }
  hills(c, 660, 24, '#8fcf6a', 4, t);
  c.fillStyle = lin(c, 0, 650, 0, H, [[0, '#d8c08a'], [1, '#9a7a4a']]); c.fillRect(-60, 660, W + 120, 400);
}
const clapPose = (t, i) => { const k = Math.sin(t * 16 + i * 1.3); return { armF: [0.5, -1.6 - 0.35 * k], armB: [0.5, -1.6 - 0.35 * k] }; };
function crowd(c, t, y, n, h, o = {}) {
  const r = rng(o.seed || 3);
  for (let i = 0; i < n; i++) { const x = (i + 0.5) * W / n + (r() - 0.5) * 20, col = CROWD[i % CROWD.length]; const jump = o.cheer ? Math.abs(Math.sin(t * 6 + i)) * 10 : 0;
    person(c, x, y + (i % 2) * 14 - jump, h * (0.9 + r() * 0.2), col, { t: t + i, expr: o.expr || 'joy', face: 0, hairStyle: ['short', 'long', 'bun', 'messy'][i % 4], hair: ['#2a1a14', '#5a3a1a', '#1a1414', '#7a4a2a'][i % 4], pose: o.clap === false ? undefined : clapPose(t, i), look: o.look, alpha: o.alpha, style: o.cut ? { faceless: false } : undefined }); }
}
const kingAt = (c, x, y, h, t, o = {}) => toon(c, { x, y, h, face: o.face ?? 0, t, style: { ...KING, ...(o.style || {}) }, expr: o.expr || 'neutral', look: o.look, talk: o.talk, pose: o.pose, mouth: o.mouth, rim: o.rim, noShadow: o.noShadow, alpha: o.alpha });

export default {
  slug: 'king-who-wanted-approval',
  title: 'वो राजा, जिसे सबकी तारीफ़ चाहिए थी',
  accent: '#ffd24a',
  grade: { col: '#4a2a1a', amt: 0.14 },
  music: tl => ({ root: 48, scale: 'dorian', prog: [0, 3, 4, 3], chord: 4.8, level: 0.22, warmth: 1000, dyn: [[tl.at('more').start, 1.4, 1], [tl.at('child').start, 0.7, 0.8], [tl.at('silence').start, 0.08, 0.3], [tl.at('twist').start + 1.5, 0.9, 1.2], [tl.at('final').start, 0.7, 1]] }),
  ambience: tl => [{ type: 'room', from: 0, to: tl.at('build').start + 0.5 }, { type: 'birds', from: tl.at('build').start, to: tl.at('child').start, gain: 0.7 }, { type: 'crowd', from: tl.at('ask').start, to: tl.at('child').start, gain: 0.9 }, { type: 'room', from: tl.at('child').start, to: tl.total }, { type: 'clock', from: tl.at('silence').start, to: tl.at('twist').start }, { type: 'wind', from: tl.at('twist').start, to: tl.total, gain: 0.5 }],
  cover: { shot: 'twist', at: 0.6 },
  shots: [
    // 0. hook: a tiny king on a huge golden throne
    { id: 'hook', min: 4.6, vo: 'उसके पास पूरा *राज्य* था... || फिर भी, | वो ख़ुश नहीं था।', sfx: [[0.1, 'gong', { gain: 0.6 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.6, 1.0, E(t, 0, S.dur, ease.inOut)), y: lerp(520, 500, S.p) });
        hall(c, t);
        c.fillStyle = rad(c, 270, 560, 10, 260, [[0, 'rgba(255,220,140,0.35)'], [1, 'rgba(255,220,140,0)']]); c.fillRect(0, 0, W, H);
        throne(c, 270, 700, 0.95);
        kingAt(c, 270, 690 - 100 * 0.95 + 0.29 * 210, 210, t, { expr: 'sad', look: [0.3, 0.4], noShadow: true, pose: { sit: true, armF: [0.9, 0.9], armB: [0.9, 0.9] }, face: 0.6 });
        dust(c, 7, 30, t, [0, 100, W, 600], '#ffe2a0', 1.8, -6, 0.6);
        c.restore();
      } },
    // 1. the most beautiful palace rises
    { id: 'build', min: 5.5, tr: 'black', vo: 'उसने राज्य का सबसे *सुंदर* महल बनवाया।', sfx: [[0.3, 'boom', { gain: 0.5 }], [0.4, 'whoosh', { dur: 1.2, f: 150, f2: 1200 }], [1.6, 'chime']],
      draw(c, t, S) {
        const k = seg(t, 0.3, 1.8);
        const [sx, sy] = shake(t, 3 * (1 - seg(t, 0.3, 1.8)) * (t > 0.3 ? 1 : 0), 25);
        c.save(); c.translate(sx, sy); cam(c, { z: lerp(1.1, 1.0, S.p), y: 500 });
        outside(c, t);
        palace(c, 270, 670, 0.8, { k, t });
        if (t > 0.3 && t < 2.5) dust(c, 3, 30, t, [40, 560, 460, 120], '#e8d0a0', 4, -30, 0.8 * (1 - seg(t, 1.5, 2.5)));
        kingAt(c, 120, 820, 260, t, { face: 0.6, expr: k >= 1 ? 'smirk' : 'shock', look: [1, -0.8], pose: { armF: [0.4, 1.8], armB: [0.4, 1.8] } });
        c.restore();
        if (k >= 1) for (let i = 0; i < 5; i++) { const a = seg(t, 1.8 + i * 0.1, 2.5 + i * 0.1); c.save(); c.globalAlpha = Math.sin(a * Math.PI); c.fillStyle = '#fff6c0'; star(c, 140 + i * 70, 260 + (i % 2) * 60, 14, 5, 4, 0); c.fill(); c.restore(); }
      } },
    // 2. his rule: no enjoying it until everyone praises it
    { id: 'rule', min: 5.5, tr: 'fade', vo: 'पर उसने तय किया... || जब तक सब *तारीफ़* न करें, | वो इसका आनंद नहीं लेगा।',
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.15, S.p), x: 270, y: 520 });
        outside(c, t);
        palace(c, 300, 670, 0.8, { t });
        kingAt(c, 250, 830, 320, t, { face: 0, expr: 'determined', look: [0, 0], pose: { armF: [0.4, -2.1], armB: [0.4, -2.1] } });
        c.restore();
        // a "not yet" seal stamp
        const a = ease.back(seg(t, S.line(0).a + 2.4, S.line(0).a + 2.8)); if (a > 0) { c.save(); c.translate(400, 240); c.rotate(-0.2); c.scale(a, a); rr(c, -80, -36, 160, 72, 12); ink(c, 'rgba(200,40,50,0.15)', 5, '#c8283a'); title(c, 'अभी नहीं', 0, 0, 30, { col: '#c8283a', ol: '#fff', olw: 0.12, shadow: false }); c.restore(); }
      } },
    // 3. more: gardens, towers, golden statues
    { id: 'more', min: 6.5, tr: 'flash', vo: 'उसने बड़े बाग़ बनवाए, | ऊँची मीनारें... | सोने की *मूर्तियाँ*...', sfx: [[0.5, 'pop', { f: 300 }], [1.1, 'pop', { f: 360 }], [1.9, 'whoosh', { dur: 1.2, f: 200, f2: 1600 }], [3.6, 'coins', { n: 16 }], [3.7, 'chime']],
      draw(c, t, S) {
        const g = seg(t, 0.4, 1.6), tw = E(t, 1.9, 3.2, ease.back), st = seg(t, 3.5, 4.3);
        c.save(); cam(c, { z: lerp(1.05, 0.88, E(t, 0, S.dur)), y: lerp(520, 470, S.p) });
        outside(c, t, { top: '#5aa8f0' });
        palace(c, 270, 660, 0.78, { tw, gold: st * 0.6, t });
        // gardens popping up
        [[50, 700, 0.5], [490, 700, 0.5], [130, 730, 0.4], [410, 730, 0.4]].forEach(([x, y, s], i) => { const k = ease.back(seg(g, i * 0.15, i * 0.15 + 0.5)); if (k > 0) roundTree(c, x, y, s * k, '#7a5236', '#4fb04a', i + 3, t); });
        // fountain
        if (g > 0.5) { ell(c, 270, 760, 80, 18); ink(c, '#cfe8ff', 3); for (let i = 0; i < 10; i++) { const p = (t * 1.2 + i / 10) % 1, x = 270 + (i - 4.5) * 8 * p * 2, y = 750 - Math.sin(p * Math.PI) * 60; c.fillStyle = 'rgba(190,230,255,0.8)'; circ(c, x, y, 3); c.fill(); } }
        // golden statues of himself
        for (const [x, i] of [[95, 0], [445, 1]]) { const k = ease.back(clamp(st * 1.6 - i * 0.4)); if (k > 0) { rr(c, x - 38, 840 - 30, 76, 30, 4); ink(c, '#c8b08a', 3); c.save(); c.translate(x, 810); c.scale(k, k); toon(c, { x: 0, y: 0, h: 230, face: i ? -0.5 : 0.5, t: 0, style: GOLDEN, expr: 'smirk', noBlink: true, noShadow: true, pose: { armF: [2.6, 0.2], armB: [0.2, 0.2], breathe: 0 } }); c.restore(); burst(c, x, 700, 20, 90, 12, '#fff3b0', (1 - k) * 0.8 + (k > 0.98 ? 0 : 0.2)); } }
        c.restore();
      } },
    // 4. "is it enough?" on the balcony, to the crowd
    { id: 'ask', min: 4.4, tr: 'fade', vo: [{ text: 'क्या ये *काफ़ी* है?', voice: 'hero', pitch: '-6Hz', rate: '-8%' }], sfx: [[s => s.lines[0].b + 0.1, 'cheer', { dur: 2.2, gain: 0.16 }]],
      draw(c, t, S) {
        const cheer = t > S.line(0).b;
        c.save(); cam(c, { z: 1.0, y: 520 });
        outside(c, t, { top: '#4a90e0' });
        palace(c, 270, 560, 1.0, { tw: 1, gold: 0.6, t });
        // balcony
        rr(c, 150, 470, 240, 24, 6); ink(c, '#e0aa2a', 3); for (let x = 160; x < 390; x += 22) { rr(c, x, 494, 10, 40, 4); ink(c, '#f4ecdc', 2); } rr(c, 150, 534, 240, 14, 4); ink(c, '#e0aa2a', 3);
        kingAt(c, 270, 480, 200, t, { face: 0, expr: S.speaking(t, 0) ? 'worried' : 'happy', talk: S.speaking(t, 0) ? 1 : 0, look: [0, 1], noShadow: true, pose: { armF: [2.3, 0.4], armB: [2.3, 0.4] } });
        c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#c8a870'], [1, '#7a5a3a']]); c.fillRect(-40, 640, W + 80, 400);
        crowd(c, t, 830, 6, 170, { cheer, clap: cheer, look: [0, -1], expr: cheer ? 'joy' : 'neutral', seed: 4 });
        crowd(c, t + 0.5, 920, 5, 190, { cheer, clap: cheer, look: [0, -1], expr: cheer ? 'joy' : 'neutral', seed: 8 });
        c.restore();
      } },
    // 5. the applause never fills him
    { id: 'again', min: 5.5, tr: 'cut', vo: 'लोग ताली बजाते... || पर उसे हर बार | *और* चाहिए होता।', sfx: [[0, 'applause', { dur: 2.5, gain: 0.15 }], [s => s.lines[0].a + 2.2, 'whoosh', { dur: 1, f: 180, f2: 900 }]],
      draw(c, t, S) {
        const grow = E(t, S.line(0).a + 2, S.dur, ease.out);
        c.save(); cam(c, { z: lerp(1.05, 0.95, S.p), y: 500 });
        outside(c, t, { top: '#e08a5a', bottom: '#ffd0a0', sunX: 440, sunY: 300 });
        // a giant golden statue of himself rising behind
        c.save(); c.globalAlpha = 0.95; toon(c, { x: 270, y: 700, h: lerp(380, 820, grow), face: 0, t: 0, style: GOLDEN, expr: 'smirk', noBlink: true, noShadow: true, pose: { armF: [2.7, 0.2], armB: [0.3, 0.2], breathe: 0 } }); c.restore();
        c.fillStyle = lin(c, 0, 690, 0, H, [[0, '#c8a870'], [1, '#7a5a3a']]); c.fillRect(-40, 690, W + 80, 400);
        crowd(c, t, 900, 6, 160, { seed: 5 });
        // the king up close, eyes hungry for more
        kingAt(c, 400, 860, 300, t, { face: -0.4, expr: 'worried', look: [-0.6, -0.4], pose: { armF: [0.3, 1.5] } });
        c.restore();
        // "more!" bubbles
        const b = seg(t, S.line(0).a + 2.2, S.line(0).a + 2.6); if (b > 0) bubble(c, 420, 450, 110, 64, 'और!', { scale: ease.back(b), size: 30, tail: [-10, 50] });
      } },
    // 6. a child in the empty hall
    { id: 'child', min: 7, tr: 'black', vo: [{ text: 'महाराज... | क्या आपको *ख़ुद* | ये महल पसंद है?', voice: 'kid', delay: 1.2 }], sfx: [[0.2, 'steps', { n: 5, gap: 0.35, gain: 0.15, f: 1500 }]],
      draw(c, t, S) {
        const walk = E(t, 0, 1.8, ease.out);
        c.save(); cam(c, { z: lerp(0.9, 1.05, S.p), y: 520 });
        hall(c, t);
        throne(c, 370, 700, 0.8);
        kingAt(c, 370, 690 - 85 + 0.29 * 200, 200, t, { face: -0.6, expr: S.speaking(t, 0) || t > S.line(0).b ? 'shock' : 'neutral', look: [-1, 0.6], noShadow: true, pose: { sit: true, armF: [0.9, 0.9], armB: [0.9, 0.9] } });
        toon(c, { x: lerp(-40, 170, walk), y: 830, h: 210, face: 1, t, style: KID, expr: 'neutral', talk: S.speaking(t, 0) ? 0.8 : 0, look: [1, -0.6], pose: walk < 1 ? { walk: t * 8, amp: 0.6 } : { armB: [0.2, 0.3], armF: [0.6, 1.4] } });
        c.restore();
      } },
    // 7. silence
    { id: 'silence', min: 5, tr: 'cut', lead: 2.4, vo: 'राजा... ||| *चुप* हो गया।', sfx: [[0.1, 'tick', { n: 6, gap: 0.5, gain: 0.25 }]],
      draw(c, t, S) {
        c.fillStyle = '#120a14'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.12, S.p), y: 450 });
        c.fillStyle = rad(c, 270, 420, 10, 420, [[0, '#4a2a3a'], [1, '#120a14']]); c.fillRect(0, 0, W, H);
        toon(c, { x: 270, y: 450 + 0.72 * 620, h: 620, face: 0, t, style: KING, expr: 'blank', look: [0, 0.2], noShadow: true, noBlink: true, mouth: 'flat' });
        c.restore();
        // the silence, written in the air
        c.save(); c.globalAlpha = 0.5 * seg(t, 0.4, 1.4) * (1 - seg(t, 2.2, 2.6)); title(c, '. . .', W / 2, 130, 50, { col: '#d8c8e8' }); c.restore();
      } },
    // 8. the twist: the palace was a stage set, built for an audience
    { id: 'twist', min: 9, tr: 'fade', vo: ['उसे एहसास हुआ... || कि ये महल | उसने अपने लिए कभी बनाया ही नहीं था।', 'सिर्फ़ लोगों को *दिखाने* के लिए | बनाया था।'], gap: 0.25, sfx: [[0.6, 'creak', { dur: 2.2, gain: 0.4 }], [2.8, 'thud', { gain: 0.6 }], [s => s.lines[1].a, 'riser', { dur: 1.5, gain: 0.15 }]],
      draw(c, t, S) {
        const flat = E(t, 0.6, 2.8), zoom = E(t, 0, 3);
        c.save(); cam(c, { z: lerp(1.2, 0.95, zoom), y: lerp(500, 520, zoom) });
        sky(c, '#3a2a4a', '#c87a5a', 0, 700); sun(c, 450, 520, 40, '#ffb070', 0.4);
        c.fillStyle = lin(c, 0, 660, 0, H, [[0, '#8a6a4a'], [1, '#4a3424']]); c.fillRect(-60, 660, W + 120, 400);
        palace(c, 270, 670, 0.8, { tw: 1, gold: 0.6, flip: flat, t });
        // the cheering crowd was cardboard too: cutouts turning flat on sticks
        for (let i = 0; i < 6; i++) { if (i === 2 || i === 3) continue; const x = 45 + i * 90, fx = Math.cos(E(t, 0.9 + i * 0.12, 2.4 + i * 0.12) * Math.PI); thick(c, [[x, 920], [x, 820]], 6, '#a0703a', 2); c.save(); c.translate(x, 840); c.scale(Math.max(0.03, Math.abs(fx)), 1); if (fx > 0) person(c, 0, 0, 160, CROWD[i % CROWD.length], { t: 0, expr: 'joy', face: 0, noShadow: true, pose: clapPose(0, i) }); else toon(c, { x: 0, y: 0, h: 160, face: 0, t: 0, noShadow: true, style: { faceless: true, skin: '#b07a44', hair: '#b07a44', shirt: '#b07a44', pants: '#b07a44', shoes: '#b07a44', hairStyle: ['short', 'long', 'bun', 'messy'][i % 4] }, pose: clapPose(0, i) }); c.restore(); }
        kingAt(c, 270, 870, 300, t, { face: lerp(0, -0.7, E(t, 1, 2)), expr: t < 3 ? 'shock' : 'sad', look: [-1, -0.5], pose: { armF: [0.3, 0.2] } });
        c.restore();
      } },
    // 9. alone on the steps, crown in his hands
    { id: 'alone', min: 6, tr: 'black', vo: 'पूरा राज्य उसका था... || पर तालियों के बिना, | वो किसी चीज़ का *आनंद* नहीं ले पाया।', sfx: [[0.3, 'piano', { notes: [60, 63, 67], gap: 0.7, gain: 0.7 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), y: 520 });
        sky(c, '#1a1430', '#6a3a5a', 0, 700); stars(c, 6, 50, t, 400); moon(c, 440, 170, 30, '#f4ecd8', 0.35);
        palace(c, 270, 620, 0.7, { tw: 1, gold: 0.3, t });
        c.fillStyle = 'rgba(20,10,30,0.45)'; c.fillRect(-40, -40, W + 80, 700);
        for (let i = 0; i < 4; i++) { rr(c, 60 - i * 20, 620 + i * 26, 420 + i * 40, 26, 3); ink(c, shade('#c8b8a8', -0.3 - i * 0.05), 3); }
        toon(c, { x: 270, y: 700 + 0.29 * 280, h: 280, face: 0.7, t, style: { ...KING, crown: false }, expr: 'sad', look: [0.4, 0.8], noShadow: true, pose: { sit: true, legF: [1.5, -1.6], legB: [1.45, -1.6], armF: [1.0, 0.7], armB: [0.9, 0.8], slump: 0.4 },
          hold: (c, h) => { c.save(); c.rotate(1.2); c.translate(0, 6); const R = h * 0.09; poly(c, [[-R, 0], [-R * 1.1, -R], [-R * 0.5, -R * 0.5], [0, -R * 1.2], [R * 0.5, -R * 0.5], [R * 1.1, -R], [R, 0]]); ink(c, '#f2c230', 2.5); c.restore(); } });
        dust(c, 4, 20, t, [0, 300, W, 400], '#d8c8ff', 1.6, -4, 0.5);
        c.restore();
      } },
    // 10. the line to remember: one spotlight, the applause dies away
    { id: 'final', min: 7.5, tr: 'black', vo: 'अगर आपकी ख़ुशी | तालियों पर टिकी है... || तो ख़ामोशी | हमेशा *हार* जैसी लगेगी।', tail: 1.0, sfx: [[0, 'applause', { dur: 1.6, gain: 0.08 }]],
      draw(c, t, S) {
        c.fillStyle = '#07040a'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.15, E(t, 0, S.dur)), y: 520 });
        rays(c, 270, -60, 0, 0.32, 1000, '#fff0c8', 0.25, t, 2);
        c.fillStyle = rad(c, 270, 720, 10, 180, [[0, 'rgba(255,240,200,0.35)'], [1, 'rgba(255,240,200,0)']]); ell(c, 270, 720, 180, 34); c.fill();
        throne(c, 270, 720, 0.8);
        kingAt(c, 270, 710 - 85 + 0.29 * 220, 220, t, { face: 0.6, expr: 'sad', look: [0, 0.6], noShadow: true, pose: { sit: true, armF: [0.9, 0.9], armB: [0.9, 0.9], slump: 0.3 } });
        // empty seats fading into the dark
        for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const x = 30 + i * 80 + row * 40, y = 860 + row * 60; c.save(); c.globalAlpha = 0.6 - row * 0.2; rr(c, x - 24, y - 40, 48, 50, 8); ink(c, '#3a1a2a', 3); c.restore(); }
        c.restore();
      } },
  ],
};
