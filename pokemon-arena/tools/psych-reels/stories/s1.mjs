// 1. The Prisoner Who Had No Chains: fear of change and comfort zones.
import { W, H, OL, clamp, lerp, seg, ease, E, rng, mix, shade, rgba, lin, rad, rr, ink, ell, circ, poly, blob, thick, cam, shake, toon, sky, sun, rays, dust, hills, roundTree, grass, stoneWall, bars, title, bubble, flash, black, burst, noise1 } from '../engine.mjs';

const PRIS = { shirt: '#d9cfb8', stripes: '#8d8574', pants: '#77705f', hair: '#3a2a22', hairStyle: 'messy', skin: '#e9b98f', shoes: '#4a3a30', dirt: true };
const aged = k => ({ ...PRIS, hair: mix('#3a2a22', '#c9c4bd', k), beard: k > 0.08 ? mix('#3a2a22', '#d4d0ca', k) : null, beardLen: k * 0.6 });
const OLD = aged(1);
const GUARD = { shirt: '#2f4466', pants: '#25324a', cap: '#2a3b5a', hair: '#1e1a18', skin: '#d9a77c', hairStyle: 'short', shoes: '#151515' };

// the cell, seen from inside: back wall, high window with light, barred door on the right, the cot, tally marks
function cell(c, t, o = {}) {
  const wallA = o.wallA ?? 1;
  c.save(); c.globalAlpha *= wallA;
  stoneWall(c, -40, -40, W + 80, 700, o.warm ? '#6a5a55' : '#4f4a58', 11);
  c.fillStyle = lin(c, 0, 0, 0, 680, [[0, 'rgba(10,6,20,0.65)'], [0.6, 'rgba(10,6,20,0.15)'], [1, 'rgba(10,6,20,0.4)']]); c.fillRect(-40, -40, W + 80, 720);
  // floor
  c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#3a3440'], [1, '#1d1922']]); c.fillRect(-40, 640, W + 80, 400);
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.beginPath(); for (let i = -6; i < 12; i++) { c.moveTo(W / 2 + i * 30, 640); c.lineTo(W / 2 + i * 110, H + 40); } c.stroke();
  thick(c, [[-40, 640], [W + 40, 640]], 4, '#2a2530', 0);
  // window
  const wx = 92, wy = 150, ww = 130, wh = 110;
  rr(c, wx - 12, wy - 12, ww + 24, wh + 24, 8); ink(c, '#3a3540', 3);
  c.fillStyle = o.night ? lin(c, 0, wy, 0, wy + wh, [[0, '#0d1838'], [1, '#22305a']]) : lin(c, 0, wy, 0, wy + wh, [[0, '#9fd3ff'], [1, '#fff1c7']]); c.fillRect(wx, wy, ww, wh);
  if (!o.night) { circ(c, wx + ww * 0.7, wy + wh * 0.35, 16); c.fillStyle = '#fff8dc'; c.fill(); }
  bars(c, wx, wy, ww, wh, 4, '#2e2a33', 8);
  // tally marks
  tally(c, o.tally ?? 60, 290, 110, t);
  // door: barred, on the right
  const dx = 340, dy = 330, dw = 150, dh = 310, open = o.open || 0;
  c.fillStyle = o.corridor || '#141018'; c.fillRect(dx, dy, dw, dh);
  if (o.doorLight) { c.fillStyle = rad(c, dx + dw / 2, dy + dh * 0.6, 10, 260, [[0, rgba('#fff2c4', o.doorLight)], [1, rgba('#ffcf7a', o.doorLight * 0.3)]]); c.fillRect(dx, dy, dw, dh); }
  if (o.inCorridor) o.inCorridor(c);
  rr(c, dx - 10, dy - 12, dw + 20, dh + 12, 6); c.strokeStyle = OL; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#2a2530'; c.lineWidth = 9; c.stroke();
  // the barred door panel swings towards us (narrower as it opens)
  const pw = dw * Math.cos(open * Math.PI * 0.47), sx = dx + dw - pw;
  if (pw > 4) { c.save(); bars(c, dx, dy, pw, dh, Math.max(1, Math.round(5 * pw / dw)), '#38343f', 10); c.restore(); }
  // lock
  const lx = dx + 12 + (dw - pw) * 0, ly = dy + dh * 0.5;
  if (pw > 30) { rr(c, dx + pw - 26, ly - 14, 22, 26, 4); ink(c, '#b08a3a', 2.5); c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.arc(dx + pw - 15, ly - 14, 7, Math.PI, 0); c.stroke(); }
  c.restore();
  // cot + bucket
  if (o.cot !== false) { c.save(); c.globalAlpha *= wallA; rr(c, 40, 700, 220, 26, 6); ink(c, '#6b5440', 3); rr(c, 46, 684, 208, 22, 10); ink(c, '#9a9488', 3); for (const x of [52, 236]) { rr(c, x, 724, 12, 40, 3); ink(c, '#5a4636', 3); } c.restore(); }
  // light from the window
  if (!o.night) rays(c, wx + ww / 2, wy + wh / 2, -0.55 + Math.sin(t * 0.2) * 0.03, 0.32, 760, '#ffe7a8', 0.16 * (o.ray ?? 1), t, 5);
  dust(c, 31, 40, t, [80, 200, 420, 520], '#fff2c8', 1.6, -5, 0.55);
}
// scratched day marks, filling a box on the wall (they get smaller as the years pile up)
function tally(c, n, x0, y0, t, bw = 220, bh = 150) {
  c.save(); c.strokeStyle = 'rgba(235,225,205,0.55)'; c.lineCap = 'round';
  const groups = Math.ceil(n / 5), s = Math.min(1, Math.sqrt(bw * bh / (groups * 17 * 24))), per = Math.max(1, Math.floor(bw / (17 * s)));
  c.lineWidth = 2.2 * Math.max(0.5, s); c.beginPath();
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5), k = i % 5, row = Math.floor(g / per), col = g % per;
    const x = x0 + col * 17 * s, y = y0 + row * 24 * s;
    if (k < 4) { c.moveTo(x + k * 3 * s, y); c.lineTo(x + k * 3 * s + s, y + 15 * s); } else { c.moveTo(x - 2 * s, y + 12 * s); c.lineTo(x + 12 * s, y + 3 * s); }
  }
  c.stroke(); c.restore();
}
// a man sitting on the cot (hugging his knees when sad)
function seated(c, x, y, h, t, o = {}) {
  const hug = o.hug ?? 0; let face = o.face ?? 1; if (Math.abs(face) < 0.6) face = (face < 0 ? -1 : 1) * 0.6;   // (side-ish, so the arms can hug the knees)
  toon(c, { x, y: y + h * 0.29, h, face, t, style: o.style || PRIS, expr: o.expr || 'sad', look: o.look, noShadow: true, lid: o.lid, tears: o.tears,
    pose: { sit: true, legF: [lerp(1.45, 2.3, hug), lerp(-1.45, -2.6, hug)], legB: [lerp(1.4, 2.25, hug), lerp(-1.45, -2.6, hug)], armF: o.armF || [lerp(0.4, 1.35, hug), lerp(0.6, 1.0, hug)], armB: o.armB || [lerp(0.3, 1.2, hug), lerp(0.6, 1.0, hug)], headTilt: o.headTilt ?? 0, lean: o.lean ?? lerp(0, 0.18, hug), slump: o.slump || 0 } });
}

export default {
  slug: 'prisoner-no-chains',
  title: 'वो कैदी, जिसकी कोई ज़ंजीर नहीं थी',
  accent: '#ffcf6a',
  grade: { col: '#2b3c6e', amt: 0.18 },
  music: tl => ({ root: 45, scale: 'minor', prog: [0, 5, 3, 4], chord: 5.5, level: 0.24, warmth: 800, dyn: [[tl.at('door').start - 0.5, 1.3, 1], [tl.at('twist').start - 3.5, 1.7, 1], [tl.at('twist').start + 0.2, 0.55, 0.4], [tl.at('final').start, 1.1, 1]] }),
  ambience: tl => [{ type: 'cave', from: 0, to: tl.at('twist').start + 1 }, { type: 'birds', from: tl.at('dream').start, to: tl.at('dream').start + tl.at('dream').dur + 0.6, gain: 1.2 }, { type: 'birds', from: tl.at('twist').start + 1.2, to: tl.at('final').start + 2 }, { type: 'wind', from: tl.at('twist').start + 1, to: tl.total, gain: 0.5 }],
  cover: { shot: 'twist', at: 0.75 },
  shots: [
    // 0. the hook: an eye behind bars in the dark
    { id: 'hook', min: 4.4, vo: 'बीस साल... ||| एक ही अंधेरी कोठरी।', sfx: [[0.15, 'boom'], [2.6, 'metal', { gain: 0.08 }]],
      draw(c, t, S) {
        c.fillStyle = '#07050b'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.35, 1.05, E(t, 0, S.dur, ease.out)), y: 470 });
        c.fillStyle = rad(c, 270, 470, 30, 380, [[0, 'rgba(255,214,150,0.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        const look = [Math.sin(t * 0.9) * 0.8, 0.1];
        toon(c, { x: 270, y: 470 + 1400 * 0.82, h: 1400, face: 0, t, style: aged(0.45), expr: 'worried', look, noShadow: true, noBlink: t < 1.2 });
        // a slit of light across the eyes
        c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = lin(c, 0, 360, 0, 600, [[0, '#090612'], [0.32, '#ffffff'], [0.58, '#ffffff'], [1, '#090612']]); c.fillRect(-100, 0, W + 200, H); c.restore();
        for (const x of [70, 210, 350, 490]) { rr(c, x - 22, -40, 44, H + 80, 20); ink(c, '#1d1a22', 4); c.fillStyle = 'rgba(255,220,170,0.18)'; c.fillRect(x - 14, -40, 6, H + 80); }
        c.restore();
      } },
    // 1. the cell: he stares at the little window every morning
    { id: 'cell', min: 3.8, vo: 'हर सुबह | वो उस छोटी-सी खिड़की से | बाहर देखता,', tr: 'black',
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.0, 1.12, E(t, 0, S.dur)), x: 250, y: 520 });
        cell(c, t, { tally: 140 });
        seated(c, 150, 684, 265, t, { style: aged(0.3), expr: 'tired', look: [-0.5, -1], headTilt: -0.15, face: 0.6 });
        c.restore();
      } },
    // 2. the dream through the window
    { id: 'dream', min: 6, vo: 'और आज़ादी के सपने बुनता। || खुला आसमान, | हरे खेत, | एक नई ज़िंदगी।', sfx: [[0.2, 'chime']],
      draw(c, t, S) {
        const z = lerp(1.0, 1.08, E(t, 0, S.dur));
        c.save(); cam(c, { z, y: 450 });
        // the world outside
        sky(c, '#5fb2ff', '#ffe9b8', 120, 640); sun(c, 380, 250, 34, '#fff1b0', 0.5 + Math.sin(t) * 0.05);
        for (let i = 0; i < 4; i++) { const x = ((i * 170 + t * 14) % 760) - 120, y = 210 + i * 34; c.fillStyle = 'rgba(255,255,255,0.92)'; blob(c, [[x, y], [x + 40, y - 26], [x + 90, y - 20], [x + 120, y + 4], [x + 60, y + 14]]); c.fill(); }
        hills(c, 520, 40, '#8fd26a', 3, t, 0); roundTree(c, 140, 520, 0.7, '#7a5236', '#5fb54a', 2, t); hills(c, 580, 30, '#6cbf54', 8, t, 0); roundTree(c, 420, 590, 0.55, '#7a5236', '#4fa83f', 5, t);
        // birds
        for (let i = 0; i < 5; i++) { const bx = 80 + ((i * 97 + t * 55) % 460), by = 260 + Math.sin(t * 1.3 + i) * 30 + i * 18, fl = Math.sin(t * 12 + i * 2) * 8; c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.moveTo(bx - 12, by - fl); c.quadraticCurveTo(bx - 5, by - 6, bx, by); c.quadraticCurveTo(bx + 5, by - 6, bx + 12, by - fl); c.stroke(); }
        // the window frame and wall around it
        c.save(); c.beginPath(); c.rect(-200, -200, W + 400, H + 400); c.rect(70, 150, 400, 470); c.clip('evenodd'); stoneWall(c, -200, -200, W + 400, H + 400, '#4f4a58', 4); c.fillStyle = 'rgba(10,6,20,0.45)'; c.fillRect(-200, -200, W + 400, H + 400); c.restore();
        rr(c, 70, 150, 400, 470, 6); c.strokeStyle = OL; c.lineWidth = 5; c.stroke();
        bars(c, 70, 150, 400, 470, 5, '#2e2a33', 18);
        // his hands on the bars and the back of his head
        for (const hx of [190, 350]) { circ(c, hx, 470 + Math.sin(t * 2 + hx) * 2, 17); ink(c, '#e9b98f', 3); }
        c.restore();
        c.save(); c.translate(270, 900); const R = 170; ell(c, 0, 0, R, R * 1.02); ink(c, '#3d2c24', 4); c.fillStyle = 'rgba(255,255,255,0.08)'; ell(c, -50, -90, 70, 20, -0.3); c.fill(); c.restore();
        // warm sparkle of hope
        dust(c, 12, 26, t, [80, 160, 380, 460], '#fff6cf', 2, -10, 0.8);
      } },
    // 3. the escape attempts: a quick montage
    { id: 'wall', min: 2.4, tr: 'flash', vo: 'उसने दीवारें तोड़ने की कोशिश की...', sfx: [[0.3, 'clank', { n: 4, gap: 0.35 }]],
      draw(c, t, S) {
        const hit = (t * 2.85) % 1, sw = Math.sin(hit * Math.PI * 2);
        const [sx, sy] = hit < 0.15 ? shake(t, 4) : [0, 0];
        c.save(); c.translate(sx, sy); cam(c, { z: 1.2, x: 220, y: 560 });
        cell(c, t, { tally: 70, ray: 0.6, cot: false });
        // cracks
        c.strokeStyle = OL; c.lineWidth = 3; c.beginPath(); c.moveTo(70, 420); c.lineTo(95, 455); c.lineTo(80, 490); c.moveTo(95, 455); c.lineTo(130, 470); c.stroke();
        toon(c, { x: 215, y: 770, h: 290, face: -1, t, style: aged(0.15), expr: 'angry', mouth: 'grit', pose: { armF: [2.0 + sw * 0.6, 0.3], armB: [0.9, 0.8], lean: -0.12, legF: [0.25, 0], legB: [-0.3, 0] },
          hold: (c, h) => { rr(c, -6, -2, 12, 46, 4); ink(c, '#9aa0a8', 2.5); } });
        if (hit < 0.25) { burst(c, 110, 470, 10, 70, 12, '#fff1c4', 1 - hit * 4); dust(c, 9, 14, t, [70, 430, 90, 90], '#cfc6b8', 3, 30, 1 - hit * 4); }
        c.restore();
      } },
    { id: 'dig', min: 2.2, tr: 'flash', vo: 'सुरंगें खोदीं...', sfx: [[0.1, 'dig', { n: 5 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.4, x: 200, y: 700 });
        cell(c, t, { tally: 90, ray: 0.5 });
        // the hole
        ell(c, 210, 770, 70, 22); ink(c, '#0c0910', 3);
        const k = (t * 2.2) % 1;
        toon(c, { x: 235, y: 772, h: 250, face: -1, t, style: aged(0.25), expr: 'determined', pose: { crouch: 0.7, lean: 0.55, armF: [1.2 + Math.sin(k * Math.PI * 2) * 0.6, 0.6], armB: [1.0 + Math.cos(k * Math.PI * 2) * 0.5, 0.5], legF: [0.6, -0.9], legB: [-0.2, -0.6] } });
        // flying dirt
        for (let i = 0; i < 8; i++) { const p = ((t * 1.7 + i / 8) % 1), x = 200 + (i % 2 ? 1 : -1) * p * 130, y = 760 - Math.sin(p * Math.PI) * 120; circ(c, x, y, 5 + (i % 3)); ink(c, '#6b5440', 2); }
        c.restore();
      } },
    { id: 'bars', min: 2.4, tr: 'flash', vo: 'हर रास्ता ढूँढा।', sfx: [[0.1, 'metal', { gain: 0.14 }], [0.6, 'metal', { gain: 0.12 }], [1.1, 'metal', { gain: 0.14 }]],
      draw(c, t, S) {
        const [sx, sy] = shake(t, 3, 18);
        c.save(); cam(c, { z: 1.3, x: 400, y: 520 });
        cell(c, t, { tally: 110, ray: 0.5 });
        toon(c, { x: 410 + sx, y: 700, h: 300, face: 0, t, style: aged(0.35), expr: 'angry', mouth: 'grit', pose: { armF: [2.6 + sy * 0.05, 0.5], armB: [2.6 - sy * 0.05, 0.5] } });
        bars(c, 330 + sx * 0.6, 330, 150, 310, 5, '#38343f', 10);
        c.restore();
      } },
    // 4. years pass
    { id: 'years', min: 5.5, tr: 'black', vo: ['दिन, महीनों में बदले, | महीने, सालों में...', 'और बीस साल बीत गए।'], gap: 0.15, sfx: [[0.2, 'tick', { n: 12, gap: 0.42 }], [0.4, 'whoosh', { dur: 4 }]],
      draw(c, t, S) {
        const k = E(t, 0, S.line(1).a + 0.6, ease.inOut);
        const day = Math.sin(t * 3.2) * 0.5 + 0.5;
        c.save(); cam(c, { z: 1.08, x: 260, y: 540 });
        cell(c, t * 5, { tally: Math.floor(lerp(120, 1400, k)), ray: 0.3 + day });
        seated(c, 150, 684, 265, t, { style: aged(k), expr: k > 0.7 ? 'tired' : 'sad', hug: k * 0.8, slump: k * 0.5, look: [0.3, 0.6] });
        // day / night flicker
        c.fillStyle = `rgba(10,20,60,${(1 - day) * 0.35 * (1 - seg(t, S.line(1).a, S.line(1).a + 0.5))})`; c.fillRect(-100, -100, W + 200, H + 200);
        // calendar pages flying off
        for (let i = 0; i < 9; i++) { const p = ((t * 0.9 + i / 9) % 1); if (t > S.line(1).a + 0.5) break; const x = 430 - p * 330 + Math.sin(p * 9 + i) * 20, y = 170 + p * 380 + Math.sin(i) * 40; c.save(); c.translate(x, y); c.rotate(p * 6 + i); rr(c, -18, -22, 36, 44, 3); ink(c, '#f4ecdc', 2.5); c.fillStyle = '#c94a3a'; c.fillRect(-18, -22, 36, 10); c.restore(); }
        c.restore();
        title(c, String(Math.floor(lerp(1, 20, k))) + ' साल', W / 2, 250, 44, { col: '#ffd884' });
      } },
    // 5. the guard forgets the lock
    { id: 'guard', min: 5.4, tr: 'black', vo: 'फिर एक सुबह, || पहरेदार | दरवाज़े पर ताला लगाना भूल गया।', sfx: [[0.2, 'steps', { n: 7, gap: 0.5, gain: 0.3 }], [1.0, 'keys'], [3.6, 'creak', { dur: 1.4, gain: 0.35 }]],
      draw(c, t, S) {
        const gx = lerp(250, 560, E(t, 0.2, 4.2, ease.sine));
        const open = E(t, 3.6, 5.2) * 0.12;
        c.save(); cam(c, { z: lerp(1.05, 1.12, S.p), x: 300, y: 540 });
        cell(c, t, { tally: 1400, open, corridor: '#1a141c', inCorridor: c => {
          c.save(); c.beginPath(); c.rect(340, 330, 150, 310); c.clip();
          toon(c, { x: gx, y: 640, h: 230, face: 1, t, style: GUARD, expr: t < 2.5 ? 'tired' : 'neutral', mouth: t > 1 && t < 2.2 ? 'o' : null, pose: { walk: t * 7.5, amp: 0.8, armF: [0.5, 1.6] }, hold: (c, h) => { c.strokeStyle = '#d8c070'; c.lineWidth = 3; c.beginPath(); c.arc(0, 10, 8, 0, Math.PI * 2); c.stroke(); rr(c, 4, 14, 4, 14, 2); ink(c, '#d8c070', 1.5); } });
          c.restore(); } });
        seated(c, 150, 684, 265, t, { style: OLD, expr: 'blank', hug: 0.8, slump: 0.4, look: [0.6, 0] });
        c.restore();
        if (t > 3.6) { const a = seg(t, 3.6, 4.0) * (1 - seg(t, 5, 5.6)); bubble(c, 420, 260, 74, 52, '?!', { alpha: a, size: 30, scale: ease.back(seg(t, 3.6, 4.0)) }); }
      } },
    // 6. the door swings wide open: light floods in
    { id: 'door', min: 4.4, vo: 'दरवाज़ा... || पूरा खुला था।', sfx: [[0.1, 'creak', { dur: 2.2, gain: 0.55 }], [1.2, 'heartbeat', { n: 5, gap: 0.85, gain: 0.7 }]],
      draw(c, t, S) {
        const open = lerp(0.12, 1, E(t, 0, 2.4, ease.out)), L = E(t, 0.3, 2.6);
        c.save(); cam(c, { z: lerp(1.0, 1.15, E(t, 0, S.dur)), x: 300, y: 540 });
        cell(c, t, { tally: 1400, open, doorLight: L, corridor: '#2a1f1c', ray: 0.5 });
        // a long path of light on the floor towards him
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lin(c, 415, 640, 160, 900, [[0, rgba('#ffe1a0', 0.45 * L)], [1, rgba('#ffe1a0', 0)]]); poly(c, [[340, 640], [490, 640], [330, 960], [60, 960]]); c.fill(); c.restore();
        seated(c, 150, 684, 265, t, { style: OLD, expr: t > 1 ? 'shock' : 'blank', hug: lerp(0.8, 0.3, E(t, 1, 2)), look: [1, -0.1], face: 0.7, rim: '#ffd88a' });
        c.restore();
      } },
    // 7. he steps towards the light... and goes back
    { id: 'steps', min: 6, tr: 'cut', vo: [{ text: 'लेकिन... ||| वो बाहर नहीं निकला।', delay: 1.6 }], sfx: [[0.4, 'steps', { n: 3, gap: 0.45, gain: 0.25 }], [1.9, 'heartbeat', { n: 3, gap: 0.6 }], [3.7, 'steps', { n: 2, gap: 0.5, gain: 0.2 }]],
      draw(c, t, S) {
        // stand, walk 3 steps towards the door, freeze, back off and sit again
        const fwd = E(t, 0.4, 1.8), back = E(t, 3.6, 4.9);
        const x = lerp(lerp(170, 300, fwd), 170, back), moving = (t > 0.4 && t < 1.8) || (t > 3.6 && t < 4.9);
        const sitting = t > 4.9;
        c.save(); cam(c, { z: lerp(1.15, 1.3, E(t, 0, 3)), x: 320, y: 560 });
        cell(c, t, { tally: 1400, open: 1, doorLight: 1, corridor: '#2a1f1c', ray: 0.5 });
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lin(c, 415, 640, 160, 900, [[0, 'rgba(255,225,160,0.45)'], [1, 'rgba(255,225,160,0)']]); poly(c, [[340, 640], [490, 640], [330, 960], [60, 960]]); c.fill(); c.restore();
        if (sitting) seated(c, 150, 684, 265, t, { style: OLD, expr: 'cry', hug: E(t, 4.9, 5.4) * 0.9, slump: 0.5, face: -0.6 });
        else {
          const [tx] = t > 1.8 && t < 3.6 ? shake(t, 1.5, 25) : [0];
          toon(c, { x: x + tx, y: 780, h: 280, face: back > 0 ? -1 : 1, t, style: OLD, expr: t < 1.8 ? 'worried' : t < 3.6 ? 'scared' : 'sad', look: t < 3.6 ? [1, -0.2] : [-1, 0.3], rim: '#ffd88a', sweat: t > 1.8,
            pose: { walk: moving ? t * 6 : null, amp: 0.6, lean: 0.12, armF: t > 1.8 && t < 3.6 ? [0.9 + Math.sin(t * 2) * 0.1, 0.9] : undefined } });
        }
        c.restore();
      } },
    // 8. the guard comes back: "why don't you run?"
    { id: 'ask', min: 4.5, tr: 'fade', vo: [{ text: 'तुम भागते क्यों नहीं? | दरवाज़ा तो खुला है!', voice: 'm2' }],
      draw(c, t, S) {
        c.save(); cam(c, { z: 1.25, x: 340, y: 540 });
        cell(c, t, { tally: 1400, open: 1, doorLight: 0.8, corridor: '#2a1f1c', ray: 0.5, inCorridor: c => toon(c, { x: 415, y: 640, h: 240, face: -0.7, t, style: GUARD, expr: 'shock', talk: S.speaking(t, 0) ? 1 : 0, look: [-1, 0.4], pose: { armF: [1.6, 0.9], armB: [-0.4, -1.2] } }) });
        seated(c, 150, 684, 265, t, { style: OLD, expr: 'sad', hug: 0.9, slump: 0.5, face: 0.5, look: [0.6, 0.2] });
        c.restore();
      } },
    // 9. his answer: a close-up
    { id: 'answer', min: 5, tr: 'fade', vo: [{ text: 'क्योंकि मुझे नहीं पता, || इन दीवारों के बाहर... | *कैसे* जिया जाता है।', voice: 'old' }], sfx: [[0.1, 'piano', { notes: [57, 60, 64], gap: 0.6, gain: 0.8 }]],
      draw(c, t, S) {
        c.fillStyle = '#120d16'; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.1, S.p), y: 470 });
        stoneWall(c, -60, -60, W + 120, H + 120, '#3f3a48', 21); c.fillStyle = 'rgba(8,5,14,0.55)'; c.fillRect(-60, -60, W + 120, H + 120);
        // warm light from the door on the right
        c.fillStyle = rad(c, 620, 420, 20, 520, [[0, 'rgba(255,214,140,0.55)'], [1, 'rgba(255,214,140,0)']]); c.fillRect(0, 0, W, H);
        toon(c, { x: 270, y: 470 + 1100 * 0.82, h: 1100, face: 0.35, t, style: OLD, expr: 'cry', talk: S.speaking(t, 0) ? 0.5 : 0, look: [-0.3, 0.6], noShadow: true, rim: '#ffd88a' });
        c.restore();
      } },
    // 10. the twist: there were no walls at all, and the lock had never been shut
    { id: 'twist', min: 7, tr: 'cut', lead: 1.9, vo: 'सच तो ये था... || कि उस दरवाज़े पर | कभी *ताला* लगा ही नहीं था।', sfx: [[0, 'riser', { dur: 1.8 }], [1.75, 'shatter'], [1.8, 'boom']],
      draw(c, t, S) {
        const k = E(t, 1.8, 3.6, ease.out), z = lerp(1.3, 0.78, E(t, 1.8, 5.5, ease.inOut));
        c.save(); cam(c, { z, x: 260, y: lerp(560, 620, k) });
        // the open world behind
        sky(c, '#ffb27a', '#ffe7b0', -300, 700); sun(c, 420, 420, 46, '#ffe08a', 0.7);
        hills(c, 640, 26, '#7fbf5f', 3, t, 0); roundTree(c, 30, 650, 0.8, '#6b4a30', '#5aa84a', 9, t); roundTree(c, 520, 640, 0.6, '#6b4a30', '#4f9a40', 13, t);
        c.fillStyle = '#6fb352'; c.fillRect(-400, 640, W + 800, 800); grass(c, 660, '#4f8f3a', 2, t, 140, 18); grass(c, 820, '#4f8f3a', 5, t, 120, 22);
        // a chalk square on the grass: all that's left of "the cell"
        c.strokeStyle = rgba('#f4f1e6', 0.9 * k); c.lineWidth = 5; c.setLineDash([16, 10]); c.strokeRect(40, 640, 460, 180); c.setLineDash([]);
        // the walls blowing away in pieces
        if (t < 1.8) cell(c, t, { tally: 1400, open: 1, doorLight: 0.8, corridor: '#2a1f1c' });
        else if (k < 1) {
          const r = rng(5); c.save(); c.globalAlpha = 1 - k;
          for (let i = 0; i < 46; i++) { const px = r() * W, py = r() * 640, vx = (px - 270) * 1.6, vy = (py - 500) * 1.2 - 200; c.save(); c.translate(px + vx * k, py + vy * k + 400 * k * k); c.rotate(k * (r() - .5) * 8); rr(c, -26, -18, 52, 36, 6); ink(c, '#4f4a58', 3); c.restore(); }
          c.restore(); flash(c, 1 - seg(t, 1.8, 2.3));
        }
        seated(c, 190, 770, 265, t, { style: OLD, expr: t < 4 ? 'shock' : 'sad', hug: 0.9, slump: 0.3, look: [0, -0.5], face: 0.7 });
        // the door still stands... with an open padlock hanging from it
        const dx = 340, dy = 330; c.save(); c.globalAlpha = k;
        bars(c, dx, dy, 150, 310, 5, '#38343f', 10);
        const sw = Math.sin(t * 2.4) * 0.25 * (1 - seg(t, 4, 7));
        c.translate(dx + 150 - 15, dy + 160); c.rotate(sw); rr(c, -14, 18, 30, 34, 5); ink(c, '#d0a84a', 3);
        c.strokeStyle = OL; c.lineWidth = 7; c.beginPath(); c.arc(-14, 18, 13, Math.PI * 1.0, Math.PI * 1.9); c.stroke(); c.strokeStyle = '#c6c3cc'; c.lineWidth = 4; c.stroke();
        c.restore();
        c.restore();
        if (t > 4) { const a = ease.back(seg(t, 4.2, 4.8)); c.save(); c.translate(W / 2, 200); c.scale(a, a); title(c, 'ताला कभी बंद था ही नहीं', 0, 0, 34, { col: '#ffe08a' }); c.restore(); }
      } },
    // 11. his own fear was the prison
    { id: 'fear', min: 5, vo: 'उसे किसी जेल ने नहीं... || उसके अपने *डर* ने | क़ैद कर रखा था।', sfx: [[0.3, 'whisper', { dur: 3, gain: 0.06 }], [0.1, 'drone']],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.1, 1.3, S.p), x: 270, y: 560 });
        sky(c, '#d98a64', '#f6cf98', -300, 700); hills(c, 600, 26, '#6aa54f', 3, t, 0);
        c.fillStyle = '#5f9c48'; c.fillRect(-400, 600, W + 800, 800); grass(c, 640, '#4a8436', 7, t, 140, 18);
        c.strokeStyle = 'rgba(244,241,230,0.9)'; c.lineWidth = 5; c.setLineDash([16, 10]); c.strokeRect(60, 600, 420, 240); c.setLineDash([]);
        // dark smoke rising from his head, forming prison bars around him
        const k = E(t, 0.3, 3.5);
        seated(c, 270, 700, 230, t, { style: OLD, expr: 'scared', hug: 0.95, slump: 0.3, face: 0, look: [0, -0.4] });
        c.save(); c.globalAlpha = 0.85 * k;
        for (let i = 0; i < 7; i++) { const x = 90 + i * 60, top = lerp(560, 260, k) + Math.sin(i * 2 + t) * 10; c.fillStyle = lin(c, 0, top, 0, 760, [[0, 'rgba(20,10,30,0)'], [0.3, 'rgba(20,10,30,0.85)'], [1, 'rgba(20,10,30,0.9)']]); rr(c, x - 9 + noise1(t * 2 + i) * 3, top, 18, 760 - top, 9); c.fill(); }
        c.fillStyle = 'rgba(20,10,30,0.85)'; for (let i = 0; i < 9; i++) { const a = t * 0.6 + i, r0 = 30 + (i * 13) % 50; circ(c, 270 + Math.cos(a) * r0 * 1.6, lerp(500, 270, k) + Math.sin(a * 1.3) * 18, 24 + (i % 3) * 8); c.fill(); }
        c.restore();
        c.restore();
      } },
    // 12. the line to remember: the walls are inside the mind
    { id: 'final', min: 8, tr: 'black', vo: 'कभी-कभी | जो दीवारें हमें रोकती हैं, || वो हमारे चारों ओर नहीं... ||| *हमारे दिमाग़ के अंदर* होती हैं।', tail: 1.0, sfx: [[0.2, 'gong', { gain: 0.6 }]],
      draw(c, t, S) {
        c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1a1030'], [1, '#05030a']]); c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.25, 1.0, E(t, 0, S.dur, ease.out)), y: 470 });
        // a big head in profile...
        const head = () => { c.beginPath(); c.moveTo(150, 760); c.bezierCurveTo(120, 640, 70, 520, 110, 400); c.bezierCurveTo(150, 250, 330, 210, 420, 300); c.bezierCurveTo(470, 350, 470, 400, 455, 430); c.lineTo(490, 500); c.lineTo(455, 515); c.quadraticCurveTo(470, 560, 445, 575); c.quadraticCurveTo(455, 610, 420, 625); c.quadraticCurveTo(400, 680, 330, 670); c.lineTo(330, 760); c.closePath(); };
        head(); c.fillStyle = '#2b2236'; c.fill();
        // ...with a prison wall inside it
        c.save(); head(); c.clip();
        stoneWall(c, 60, 200, 450, 600, '#5a5266', 77); c.fillStyle = rad(c, 290, 470, 20, 260, [[0, 'rgba(255,214,140,0.35)'], [1, 'rgba(10,5,20,0.7)']]); c.fillRect(0, 0, W, H);
        // a tiny him, facing a tiny open door of light inside his own head
        const dk = E(t, 1.5, 4);
        c.fillStyle = rgba('#fff0c0', 0.9 * dk); rr(c, 300, 410, 70, 120, 6); c.fill();
        rays(c, 335, 470, -1.6, 0.6, 260, '#ffe7a8', 0.25 * dk, t, 4);
        toon(c, { x: 230, y: 530, h: 110, face: 1, t, style: OLD, expr: 'worried', look: [1, 0], rim: '#ffd88a' });
        c.restore();
        head(); c.strokeStyle = '#ffcf6a'; c.lineWidth = 4; c.stroke();
        c.restore();
      } },
  ],
};
