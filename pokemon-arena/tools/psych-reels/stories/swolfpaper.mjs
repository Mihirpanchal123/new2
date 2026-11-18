// "Wolf mentality" — the PAPER CUT-OUT version of stories/swolf.mjs (same scenes, timings, lines and voices; art: paper.mjs).
// Originally: a Hindi 2D-clay remake of the user's reference video (Downloads/wolf mentality.mp4):
// the same storyboard, the same scene timings and the same lines (translated), each line starting at the
// original line's timestamp. Voices: every sentence is recorded whole (never split), at one steady pace per
// character, and starts exactly when the original line starts. Art: clay.mjs (plasticine, stop-motion on twos).
import { W, H, clamp, lerp, seg, ease, E, rng, mix, shade, rgba } from '../engine.mjs';
import { clay, blob, ball, slab, groove, worm, glow, backdrop, wolf, wolfHead, pig, sheep, sheepBack, vortex, plaque, setPose, pose, q, STEP, P as PATH } from '../paper.mjs';

// the dialogue: [line, who, start time of the original line (s)]
const LINES = [
  { text: 'ये कैसी दुनिया बन गई है?', voice: 'pig', at: 0.3 },
  { text: 'पहले ऐसा नहीं था।', voice: 'pig', at: 2.52 },
  { text: 'पक्का? देखो।', at: 4.11 },
  { text: '1995।', at: 8.42 },
  { text: 'लोग दिन भर, टीवी के सामने बिताते थे।', at: 10.32 },
  { text: '1938।', at: 15.41 },
  { text: 'लोग दिन भर, रेडियो से चिपके रहते थे।', at: 17.07 },
  { text: '1929।', at: 20.25 },
  { text: 'लोग दिन भर, अख़बारों में डूबे रहते थे।', at: 21.93 },
  { text: '1650।', at: 26.9 },
  { text: 'लोग दिन भर, चौक में किसी का भी भाषण सुनते थे।', at: 28.57 },
  { text: 'सन 50 ईसवी।', at: 34.22 },
  { text: 'लोग दिन भर, लड़ाइयाँ देखते रहते थे।', at: 35.96 },
  { text: 'साल बीतते गए,', at: 39.19 },
  { text: 'पर इंसान का दिमाग़ नहीं बदला।', at: 40.45 },
  { text: 'भेड़ें हमेशा भेड़ें रहेंगी,', at: 42.37 },
  { text: 'और भेड़िये, हमेशा भेड़िये।', at: 43.9 },
  { text: 'कहानी पर क़ाबू करो, सब कुछ तुम्हारे क़ाबू में।', at: 46.3 },
  { text: 'तुम सोचने के लिए आज़ाद हो, वही जो वो तय करें।', at: 49.45 },
  { text: 'या फिर, चुप रहो, देखो, सीखो, लाइक और फ़ॉलो करो,', at: 52.6 },
  { text: 'और चुपचाप बदलते रहो, जब तक तुम भेड़िया न बन जाओ।', at: 56.55 },
];
// the original's scene changes: time-travel swirls, a flash, hard cuts
const SWIRLS = [[6.0, 7.75], [13.0, 14.75], [19.4, 20.1], [25.3, 26.1], [32.1, 32.95], [45.4, 46.05]];
const FLASH = 38.7, CUTS = [50.45, 55.95, 58.77];
const YEARS = [[3, '1995'], [5, '1938'], [7, '1929'], [9, '1650'], [11, 'सन 50 ई.']];

// ---------------------------------------------------------------- sets
const G = 715;   // the floor line in the standing scenes
function crowd(c, t, o) {   // rows of sheep behind + backs in front
  const r = rng(o.seed || 5);
  for (let row = 0; row < o.rows; row++) { const y = o.y0 + row * o.dy, s = o.s0 + row * o.ds, n = Math.ceil(W / (s * 1.05)) + 1; for (let i = 0; i < n; i++) { const x = (i + (row % 2) * 0.5) * s * 1.05 - s * 0.3 + (r() - 0.5) * s * 0.3; if (o.gap && Math.abs(x - 275) < o.gap && row >= o.rows - 2) continue; sheep(c, x, y + (r() - 0.5) * 6, s, { seed: 900 + row * 40 + i, tint: 0.45 - row * 0.12, prop: o.prop, glow: o.prop === 'phone' ? 1 : 0, lid: 0.55, scarfCol: ['#6d6158', '#5c5a6e', '#6e5a4a'][i % 3] }); } }
  for (let i = 0; i < o.backs; i++) { const x = (i + 0.5) * W / o.backs + (r() - 0.5) * 30; sheepBack(c, x, 905 + (i % 2) * 34, 118 + r() * 22, { seed: 980 + i, tint: 0.35, prop: o.backProp, phone: o.prop === 'phone', scarfCol: ['#5d534b', '#4e4a5c'][i % 2] }); }
}
function street(c, t) {
  backdrop(c, '#151b27', '#2b3341');
  for (let i = 0; i < 6; i++) { const x = -30 + i * 100, h = 260 + ((i * 97) % 160); slab(c, x, 420 - h, 92, h + 160, 6, ['#252c39', '#2c3443', '#222936'][i % 3], { seed: 100 + i, light: 0.5 }); for (let w = 0; w < 10; w++) if ((i * 7 + w * 3) % 4) { const wx = x + 14 + (w % 3) * 26, wy = 420 - h + 20 + Math.floor(w / 3) * 44; c.fillStyle = (i + w) % 3 ? 'rgba(210,230,255,0.55)' : 'rgba(255,220,160,0.5)'; c.fillRect(wx, wy, 14, 22); } }
  worm(c, [[110, 640], [110, 360], [140, 345]], 7, '#3b4352', { seed: 120 }); ball(c, 146, 352, 13, 7, '#e9eef6', { seed: 121 }); glow(c, 146, 360, 120, '#cfe0ff', 0.35);
  slab(c, -40, 560, W + 80, 460, 0, '#2a2f38', { seed: 122, shadow: false, light: 0.6 });
  c.fillStyle = 'rgba(200,215,240,0.06)'; c.fillRect(0, 500, W, 80);
}
function room1995(c, t) {
  backdrop(c, '#6a5038', '#3d2e22');
  c.save(); c.globalAlpha = 0.18; for (let y = 40; y < 560; y += 40) for (let x = 20; x < W; x += 44) ball(c, x + (y % 80 ? 22 : 0), y, 6, 8, '#d9b98a', { seed: x + y, shadow: false, edge: false, tex: false, shine: 0 }); c.restore();
  slab(c, -40, 560, W + 80, 420, 0, '#5a3f2c', { seed: 200, shadow: false });
  ball(c, 270, 760, 250, 70, '#7a4a3a', { seed: 201, shadow: false });     // rug
  for (const [x, y, w, h] of [[300, 150, 70, 86], [390, 170, 44, 40], [440, 170, 44, 40]]) { slab(c, x, y, w, h, 6, '#6b4a2e', { seed: x }); slab(c, x + 8, y + 8, w - 16, h - 16, 3, '#b9a07c', { seed: x + 1, shadow: false }); }
  worm(c, [[70, 560], [70, 230]], 6, '#3a2a1e', { seed: 202 }); blob(c, [[30, 230], [110, 230], [96, 180], [44, 180]], '#e8d2a2', { seed: 203 }); glow(c, 70, 230, 230, '#ffd29a', 0.45);
  slab(c, 330, 420, 230, 120, 30, '#7b5a3e', { seed: 204 }); slab(c, 320, 380, 250, 70, 30, '#8a6747', { seed: 205 });     // sofa
  sheep(c, 430, 410, 50, { seed: 206, tint: 0.1, lid: 0.8 });
  slab(c, 18, 430, 130, 110, 8, '#4a3526', { seed: 207 }); slab(c, 30, 440, 106, 80, 18, '#2a2a2e', { seed: 208 });       // TV
  const flick = 0.85 + 0.15 * Math.sin(pose(t) * 1.7); slab(c, 42, 450, 82, 60, 14, `rgb(${210 * flick | 0},${228 * flick | 0},255)`, { seed: 209, shine: 1.5 }); glow(c, 83, 480, 260, '#bcd6ff', 0.4 * flick);
  worm(c, [[60, 430], [45, 395]], 2.5, '#2a2a2e', { seed: 210, shadow: false }); worm(c, [[100, 430], [118, 392]], 2.5, '#2a2a2e', { seed: 211, shadow: false });
}
function room1938(c, t) {
  backdrop(c, '#3a3028', '#1e1813');
  slab(c, 30, 140, 130, 220, 6, '#1b2433', { seed: 300 }); for (const x of [30, 128]) slab(c, x - 10, 120, 42, 270, 14, '#5a2f2c', { seed: 301 + x });     // window + curtains
  slab(c, 260, 120, 70, 90, 6, '#4a3424', { seed: 303 }); slab(c, 270, 130, 50, 70, 3, '#8a7a62', { seed: 304, shadow: false });                       // portrait
  slab(c, -40, 560, W + 80, 420, 0, '#3a2a1f', { seed: 305, shadow: false });
  slab(c, 380, 380, 150, 150, 18, '#6a4428', { seed: 306 }); slab(c, 396, 400, 118, 62, 30, '#3b2a1c', { seed: 307 });             // radio
  for (let i = 0; i < 6; i++) groove(c, [[404 + i * 18, 404], [404 + i * 18, 458]], '#000', 2, 0.4);
  ball(c, 455, 495, 28, 14, '#f2c56b', { seed: 308, shine: 1.5 }); glow(c, 455, 495, 160, '#ffc56b', 0.45);
  slab(c, 470, 330, 26, 50, 8, '#b8925a', { seed: 309 }); ball(c, 483, 318, 9, 14, '#fff0c0', { seed: 310 }); glow(c, 483, 318, 200, '#ffcf7a', 0.5);     // lamp
}
function street1929(c, t) {
  backdrop(c, '#9b968e', '#55514b');
  for (const [x, w, h] of [[-30, 150, 520], [120, 110, 430], [360, 120, 470], [470, 120, 540]]) { slab(c, x, 540 - h, w, h + 40, 4, '#77706a', { seed: x, light: 0.6 }); for (let k = 0; k < 8; k++) { c.fillStyle = 'rgba(40,36,32,0.45)'; c.fillRect(x + 14 + (k % 2) * (w / 2), 540 - h + 30 + Math.floor(k / 2) * 70, w / 3, 40); } }
  slab(c, -40, 540, W + 80, 440, 0, '#5d5852', { seed: 400, shadow: false });
  c.fillStyle = 'rgba(220,215,205,0.28)'; c.fillRect(0, 300, W, 260);
}
function square1650(c, t) {
  backdrop(c, '#a39c92', '#5f574e');
  for (const [x, w, h] of [[-40, 170, 260], [330, 200, 280]]) { slab(c, x, 520 - h, w, h + 30, 4, '#cfc4b0', { seed: x }); for (let k = 0; k < 4; k++) groove(c, [[x + 10 + k * w / 4, 520 - h], [x + 10 + k * w / 4, 540]], '#3a2a1c', 5, 0.7); groove(c, [[x, 520 - h * 0.55], [x + w, 520 - h * 0.55]], '#3a2a1c', 5, 0.7); blob(c, [[x - 12, 520 - h], [x + w / 2, 520 - h - 110], [x + w + 12, 520 - h]], '#5a4434', { seed: x + 1, smooth: false }); }
  slab(c, -40, 540, W + 80, 440, 0, '#6a6158', { seed: 500, shadow: false });
  worm(c, [[455, 480], [455, 250]], 14, '#4a3a2c', { seed: 501 }); worm(c, [[415, 300], [495, 300]], 12, '#4a3a2c', { seed: 502 });
  slab(c, 40, 410, 130, 110, 6, '#8b857a', { seed: 503 });                                     // plinth + preacher (left, in view)
  const arm = Math.sin(q(t) * 3) * 0.2;
  blob(c, [[78, 412], [132, 412], [124, 330], [86, 330]], '#2d2622', { seed: 504 });
  worm(c, [[92, 345], [68, 312 - arm * 40], [60, 290 - arm * 40]], 8, '#2d2622', { seed: 505 }); worm(c, [[118, 345], [142, 312 + arm * 40], [150, 290 + arm * 40]], 8, '#2d2622', { seed: 506 });
  sheep(c, 105, 318, 34, { seed: 507, tint: 0.1, lid: 0.2 });
}
function arena(c, t) {
  backdrop(c, '#c9bfae', '#8e826f');
  for (let i = 0; i < 6; i++) { slab(c, -40, 140 + i * 50, W + 80, 46, 8, shade('#a99c86', -i * 0.05), { seed: 600 + i, light: 0.6 }); c.fillStyle = 'rgba(60,50,40,0.35)'; for (let k = 0; k < 44; k++) c.fillRect(k * 13 + (i % 2) * 6, 150 + i * 50, 7, 10); }
  ball(c, 270, 600, 330, 120, '#d8c8a6', { seed: 610, shadow: false });
  const k = q(t) * 4, f = Math.sin(k) * 8;                                                    // two fighters
  for (const [x, d] of [[440 + f, 1], [496 - f, -1]]) { ball(c, x, 420, 8, 9, '#2a2420', { seed: 611 + d }); worm(c, [[x, 428], [x, 460]], 9, '#2a2420', { seed: 613 + d }); worm(c, [[x, 460], [x - 8, 482]], 6, '#2a2420', { seed: 615 + d }); worm(c, [[x, 460], [x + 8, 482]], 6, '#2a2420', { seed: 617 + d }); worm(c, [[x, 436], [x + d * 22, 424 - Math.abs(f)]], 5, '#2a2420', { seed: 619 + d }); worm(c, [[x + d * 22, 424 - Math.abs(f)], [x + d * 40, 412 - Math.abs(f)]], 2.5, '#d9d9d9', { seed: 621 + d, shadow: false }); }
}
function yacht(c, t) {
  const g = c.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#5b4a5e'); g.addColorStop(0.55, '#e7a46a'); g.addColorStop(1, '#f2d29a'); c.fillStyle = g; c.fillRect(0, 0, W, 520);
  ball(c, 170, 400, 56, 56, '#fff1cf', { seed: 700, shine: 0.3, shadow: false }); glow(c, 170, 400, 260, '#ffd9a0', 0.55);
  slab(c, -40, 470, W + 80, 140, 0, '#7a6a76', { seed: 701, shadow: false }); for (let i = 0; i < 9; i++) groove(c, [[120 + (i % 3) * 18, 490 + i * 12], [220 - (i % 3) * 18, 490 + i * 12]], '#ffe9c0', 3, 0.6);
  slab(c, -40, 600, W + 80, 420, 0, '#8a6a4f', { seed: 702, shadow: false }); for (let i = 0; i < 8; i++) groove(c, [[0, 640 + i * 44], [W, 640 + i * 44]], '#000', 2, 0.3);
  worm(c, [[-20, 470], [W + 20, 470]], 6, '#d8d0c4', { seed: 703 }); for (let x = 20; x < W; x += 90) worm(c, [[x, 470], [x, 600]], 5, '#d8d0c4', { seed: 704 + x });
}
function hall(c, t) {
  backdrop(c, '#121519', '#07090b');
  for (const x of [40, 160, 380, 500]) slab(c, x - 24, 80, 48, 600, 6, '#1e2328', { seed: 800 + x, light: 0.4 });
  // the eye
  const p = 0.85 + 0.15 * Math.sin(q(t) * 3); glow(c, 270, 200, 220, '#8fe3e0', 0.35 * p);
  worm(c, [[180, 200], [225, 168], [270, 160], [315, 168], [360, 200]], 7, '#bff3ef', { seed: 801, shadow: false }); worm(c, [[180, 200], [225, 232], [270, 240], [315, 232], [360, 200]], 7, '#bff3ef', { seed: 802, shadow: false });
  ball(c, 270, 200, 26, 26, '#173c40', { seed: 803, shadow: false }); worm(c, [[262, 186], [258, 214]], 5, '#bff3ef', { seed: 804, shadow: false }); worm(c, [[278, 186], [282, 214]], 5, '#bff3ef', { seed: 805, shadow: false });
}
function spotlight(c, t) {
  backdrop(c, '#120e0b', '#060504');
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,214,160,0.45)'); g.addColorStop(1, 'rgba(255,214,160,0.03)');
  c.save(); c.beginPath(); c.moveTo(200, 40); c.lineTo(340, 40); c.lineTo(560, H); c.lineTo(-20, H); c.closePath(); c.fillStyle = g; c.fill(); c.restore();
  ball(c, 270, 40, 80, 16, '#d8b88a', { seed: 900, shine: 1.2 }); glow(c, 270, 50, 200, '#ffd8a0', 0.45);
}

// ---------------------------------------------------------------- the cast in the standing scenes
function duo(c, t, S, o = {}) {
  const wolfTalk = LINES.some((l, k) => l.voice !== 'pig' && S.speaking(t, k)) ? 0.4 + 0.6 * Math.abs(Math.sin(q(t) * 11)) : 0;
  const pigTalk = [0, 1].some(k => S.speaking(t, k)) ? 0.4 + 0.6 * Math.abs(Math.sin(q(t) * 13)) : 0;
  const gest = [[5.2, 5.9, 'snap'], [11.8, 12.8, 'point'], [18.6, 19.3, 'point'], [24.6, 25.3, 'point'], [31.4, 32.1, 'point'], [37.4, 38.4, 'point']].find(([a, b]) => t >= a && t < b);
  const closed = t > 4.0 && t < 5.2;
  wolf(c, 200, G, 360, { talk: wolfTalk, expr: closed ? 'closed' : (t > 12 && t < 13) || (t > 37 && t < 38.6) ? 'grin' : 'smug', arm: gest ? gest[2] : 'down', look: 0.6 });
  pig(c, 360, G + 6, 240, { talk: pigTalk, expr: o.scared ? 'scared' : 'worried', hands: t < 6 ? 'down' : 'clasp' });
}
const SCENES = [   // [from, to, set, crowd options]
  [0, 6.875, street, { rows: 3, y0: 560, dy: 52, s0: 46, ds: 12, prop: 'phone', backs: 4, gap: 150, seed: 1 }],
  [6.875, 13.875, room1995, { rows: 0, backs: 4, seed: 2, extra: 'tv' }],
  [13.875, 19.75, room1938, { rows: 2, y0: 600, dy: 56, s0: 50, ds: 12, backs: 4, gap: 150, seed: 3 }],
  [19.75, 25.7, street1929, { rows: 3, y0: 560, dy: 52, s0: 46, ds: 12, prop: 'paper', backs: 4, backProp: 'cap', gap: 150, seed: 4 }],
  [25.7, 32.525, square1650, { rows: 3, y0: 560, dy: 52, s0: 46, ds: 12, prop: 'scarf', backs: 4, backProp: 'scarf', gap: 150, seed: 5 }],
  [32.525, FLASH + 0.12, arena, { rows: 0, backs: 4, backProp: 'scarf', seed: 6 }],
];
function standing(c, t, S, sc) {
  const [, , set, cr] = sc;
  set(c, t);
  if (cr.extra === 'tv') { for (let i = 0; i < 3; i++) sheep(c, 60 + i * 64, 640, 46, { seed: 960 + i, tint: 0.15, lid: 0.75, look: -1 }); }
  if (cr.rows) crowd(c, t, { ...cr, backs: 0 });
  duo(c, t, S, { scared: SWIRLS.some(([a, b]) => t > a - 0.3 && t < b) });
  if (cr.backs) crowd(c, t, { ...cr, rows: 0 });
}
function yachtScene(c, t, S) {
  yacht(c, t);
  // a deck chair + side table with the bottle (the good life), the wolf at the rail, glass in hand
  slab(c, 20, 690, 200, 40, 14, '#d9d2c4', { seed: 1001 }); slab(c, 20, 600, 60, 110, 14, '#d0c8b8', { seed: 1002 }); worm(c, [[40, 730], [40, 790]], 6, '#6a4a32', { seed: 1003 }); worm(c, [[200, 730], [200, 790]], 6, '#6a4a32', { seed: 1004 });
  slab(c, 236, 700, 70, 14, 6, '#6a4a32', { seed: 1005 }); worm(c, [[250, 714], [250, 790]], 5, '#6a4a32', { seed: 1006 }); worm(c, [[292, 714], [292, 790]], 5, '#6a4a32', { seed: 1007 });
  slab(c, 258, 652, 22, 50, 6, '#3e5a3a', { seed: 1008, shine: 1.6 });
  const talk = [13, 14, 15, 16].some(k => S.speaking(t, k)) ? 0.4 + 0.6 * Math.abs(Math.sin(q(t) * 11)) : 0, toast = t > 44.6;
  wolf(c, 380, 790, 380, { seed: 1100, talk, expr: t > 43.9 && t < 45.4 ? 'grin' : 'smug', arm: toast ? 'up' : 'snap', look: -0.6 });
  // the glass in his raised hand
  const gx = 380 + 30 * 3.8, gy = 790 + (toast ? -98 : -84) * 3.8 - 6;
  slab(c, gx - 15, gy - 26, 30, 38, 6, 'rgba(230,240,245,0.55)', { seed: 1110, shine: 2 }); slab(c, gx - 12, gy - 10, 24, 20, 4, '#c27a2c', { seed: 1111, shadow: false }); ball(c, gx - 3, gy - 8, 6, 5, '#f6f6f6', { seed: 1112, shadow: false });
  glow(c, 170, 400, 340, '#ffd9a0', 0.12);
}
function hallScene(c, t, S) {
  hall(c, t);
  slab(c, 236, 470, 68, 110, 6, '#3a2a1f', { seed: 1201 }); slab(c, 196, 570, 148, 30, 4, '#2a2420', { seed: 1202 });
  wolf(c, 270, 520, 150, { seed: 1300, talk: (S.speaking(t, 17) || S.speaking(t, 18)) ? 0.4 + 0.6 * Math.abs(Math.sin(q(t) * 11)) : 0, arm: t > 49.6 ? 'point' : 'down' });
  slab(c, 228, 452, 84, 120, 8, '#4a3626', { seed: 1203 }); groove(c, [[240, 470], [300, 470]], '#000', 2, 0.4);
  const r = rng(12); for (let row = 0; row < 8; row++) for (let i = 0; i < 10; i++) sheep(c, (i + (row % 2) * 0.5) * 58 - 10, 620 + row * 46, 26 + row * 5, { seed: 1400 + row * 20 + i, tint: 0.55 - row * 0.05, lid: 0.6 });
  glow(c, 270, 200, 500, '#7fd6d2', 0.06);
}
function spotScene(c, t, S) {
  spotlight(c, t);
  const talk = (S.speaking(t, 19) || S.speaking(t, 20)) ? 0.4 + 0.6 * Math.abs(Math.sin(q(t) * 11)) : 0;
  if (t < CUTS[1]) { const z = E(t, CUTS[0], CUTS[1], ease.inOut); const h = lerp(560, 760, z); wolf(c, 270, lerp(1010, 1180, z), h, { seed: 1500, talk, expr: t > 53.6 && t < 54.6 ? 'grin' : 'smug' }); }
  else { const close = t < CUTS[2] ? 1 : 1.25, u = 9.5 * close * lerp(1, 1.04, seg(t, CUTS[1], 60)); c.save(); slab(c, 270 - 30 * u, 420 + 14 * u, 60 * u, 60 * u, 10 * u, '#3d4049', { seed: 1600 }); slab(c, 270 - 7 * u, 420 + 14 * u, 14 * u, 22 * u, 3 * u, '#f1ede4', { seed: 1601, shadow: false }); slab(c, 270 - 2.4 * u, 420 + 15 * u, 4.8 * u, 18 * u, 2 * u, '#8e2b2b', { seed: 1602 }); wolfHead(c, 270, 420, u, { seed: 1500, talk, expr: 'smug', lid: 0.55 }); c.restore(); }
}

// ---------------------------------------------------------------- the reel
let cache = null;
export default {
  slug: 'wolf-mentality-hindi-paper', title: 'भेड़िया मानसिकता', titleOut: 0, noFadeIn: true, endCard: false,
  bg: '#0b0907', vignette: 0.55, grain: 0.03,
  fonts: [{ family: 'Kalam', url: '/vendor/fonts/Kalam-Bold.ttf', weight: 700 }],
  subY: 790, subStyle: { mode: 'chalk', font: '"Kalam", "Nirmala UI", sans-serif', weight: 700, size: 32, words: 4, rows: 1, max: 470, active: '#f3c969', fill: '#f6f0e6', next: 'rgba(200,190,175,0.55)', backing: 0.42 },
  voices: {
    nar: { speaker: 'ratan_hi_latenight', model: 'bulbul:v4-flash', pace: 1.15 },   // the wolf: deep, smooth, sly
    pig: { speaker: 'advait_hi_character', model: 'bulbul:v4-flash', pace: 1.0 },   // the pig: higher, anxious
  },
  music: { root: 45, scale: 'minor', prog: [0, 5, 3, 4], chord: 4.5, level: 0.07, bells: true, warmth: 900, duck: 0.45, attack: 1.2 },
  ambience: tl => [{ type: 'crowd', from: 0, to: 6, gain: 0.25 }, { type: 'room', from: 6, to: 20, gain: 0.5 }, { type: 'city', from: 20, to: 26, gain: 0.35 }, { type: 'crowd', from: 26, to: 38.7, gain: 0.35 }, { type: 'river', from: 38.7, to: 45.6, gain: 0.5 }, { type: 'drone', from: 45.6, to: 61, gain: 0.5 }],
  cover: 10.5,
  shots: [
    { id: 'film', min: 60.4, lead: 0, tail: 0.8,   // each sentence recorded whole, one steady pace per character, placed at the original's time
      vo: LINES,
      sfx: [
        [5.55, 'pop', { f: 900, gain: 0.35 }],
        ...SWIRLS.map(([a, b]) => [a - 0.05, 'whoosh', { f: 200, f2: 2200, dur: Math.max(0.6, b - a), gain: 0.4 }]),
        ...SWIRLS.map(([a, b]) => [a, 'riser', { dur: Math.max(0.5, (b - a) * 0.8), gain: 0.18 }]),
        [8.2, 'glitch', {}], [15.2, 'glitch', {}], [20.4, 'paper', { n: 16, gain: 0.25 }], [27.6, 'whisper', { dur: 2, gain: 0.05 }],
        [34.0, 'clank', { n: 3, gap: 0.5 }], [36.4, 'clank', { n: 2, gap: 0.45 }], [FLASH, 'whoosh', { dur: 0.4, gain: 0.3 }], [44.9, 'pop', { f: 900, gain: 0.3 }],
        [CUTS[0], 'hit', { gain: 0.3 }], [CUTS[1], 'hit', { gain: 0.25 }], [CUTS[2], 'boom', { gain: 0.4 }],
      ],
      draw(c, t0, S) {
        // stop motion: one pose per 1/12 s, rendered once and held for the in-between frames
        const p = pose(t0), t = p / STEP;
        if (!cache) { cache = { cv: document.createElement('canvas'), p: -1 }; cache.cv.width = W * 2; cache.cv.height = H * 2; cache.c = cache.cv.getContext('2d'); }
        if (cache.p !== p) {
          cache.p = p; setPose(t0); const g = cache.c; g.setTransform(2, 0, 0, 2, 0, 0); g.globalAlpha = 1; g.fillStyle = '#0b0907'; g.fillRect(0, 0, W, H);
          // a tiny frame-to-frame camera jitter, like a hand-moved stop-motion set
          const r = rng(p * 7 + 3); g.translate((r() - 0.5) * 1.6, (r() - 0.5) * 1.6);
          const sw = SWIRLS.find(([a, b]) => t >= a && t < b);
          const scene = tt => SCENES.find(([a, b]) => tt >= a && tt < b);
          if (t >= FLASH + 0.12 && t < SWIRLS[5][0]) yachtScene(g, t, S);
          else if (t >= SWIRLS[5][1] && t < CUTS[0]) hallScene(g, t, S);
          else if (t >= CUTS[0]) spotScene(g, t, S);
          else if (sw && sw[1] <= SCENES[5][1] + 0.1) {
            const k = (t - sw[0]) / (sw[1] - sw[0]), sc = scene(t);
            g.save(); g.translate(W / 2, H * 0.48); g.rotate(Math.sin(Math.PI * k) * (k < 0.5 ? 0.9 : -0.9) * k); const zz = 1 + 0.35 * Math.sin(Math.PI * k); g.scale(zz, zz); g.translate(-W / 2, -H * 0.48);
            const [, , set, cr] = sc; set(g, t); if (cr.rows) crowd(g, t, { ...cr, backs: 0 }); g.restore();
            vortex(g, k, t); duo(g, t, S, { scared: true });
          }
          else if (sw) { const k = (t - sw[0]) / (sw[1] - sw[0]); (t < (sw[0] + sw[1]) / 2 ? yachtScene : hallScene)(g, t, S); vortex(g, k, t); }
          else { const sc = scene(t); if (sc) standing(g, t, S, sc); }
          if (t >= FLASH && t < FLASH + 0.3) { g.fillStyle = `rgba(255,250,240,${1 - (t - FLASH) / 0.3})`; g.fillRect(0, 0, W, H); }
          // the year, pressed into a clay plaque
          for (const [k, y] of YEARS) { const L = S.line(k); if (L.a < 1e8) plaque(g, y, 270, 150, 46, seg(t, L.a - 0.05, L.a + 0.3) * (1 - seg(t, L.b + 1.0, L.b + 1.4)), t); }
        }
        c.drawImage(cache.cv, 0, 0, W, H);
      } },
  ],
};
