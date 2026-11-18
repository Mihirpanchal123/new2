// Room 217 (कमरा नंबर 217) — a psychological-horror reel in the chalk style (chalk.mjs), one continuous board.
// Voices: a suspense narrator read in one natural take; the receptionist (and her trembling phone voice), "your own"
// muffled voice from behind the bathroom door, and an eerie pitched-down voice from the other side — each with
// effects in the mix (voice fx). The knocks are real knock sounds with a caption, not spoken.
import { W, H, clamp, lerp, seg, ease, E, rng } from '../engine.mjs';
import { CH, board, stroke, circlePts, rectPts, fill, stick, text, label, cross, question, door, sweat, scribble, step, boil } from '../chalk.mjs';

const G = 610;   // the floor line
const R = CH.red;
// the script ([voice] defaults to the narrator; gap = extra silence after the line)
const LINES = [
  { text: 'क्या हो अगर, किसी होटल में चेक-इन करते समय, रिसेप्शनिस्ट आपको सिर्फ़ एक चेतावनी दे…', gap: 0.25 },     // 0
  { text: 'रात 12 बजे के बाद, बाथरूम का दरवाज़ा मत खोलना।', voice: 'rec1', gap: 0.5 },                         // 1
  { text: 'आप कमरा नंबर 217 में पहुँचते हैं।', gap: 0 },                                                       // 2
  { text: 'सब कुछ सामान्य था।', gap: 0.15 },                                                                  // 3
  { text: 'लेकिन ठीक 12:07 पर, बाथरूम के अंदर से तीन बार दस्तक हुई।', gap: 0.25 },                               // 4
  { text: 'ठक… ठक… ठक…', silent: true, dur: 2.7, times: [0.25, 1.05, 1.85], gap: 0.4 },                          // 5 (knocks)
  { text: 'आपको लगा, शायद कोई अंदर फँसा हुआ है।', gap: 0 },                                                    // 6
  { text: 'आपने रिसेप्शन पर फ़ोन किया।', gap: 0 },                                                             // 7
  { text: 'रिसेप्शनिस्ट की आवाज़ काँप रही थी।', gap: 0 },                                                      // 8
  { text: 'उसने कहा…', gap: 0.55 },                                                                          // 9
  { text: 'सर, आपके कमरे में बाथरूम है ही नहीं।', voice: 'rec2', gap: 0.6, fx: { bandpass: [380, 3200], tremolo: [7, 0.35], gain: 1.15 } }, // 10
  { text: 'आपका दिल तेज़ी से धड़कने लगा।', gap: 0 },                                                            // 11
  { text: 'आपने धीरे-धीरे, अपने सामने देखा।', gap: 0 },                                                         // 12
  { text: 'दरवाज़ा अब भी वहीं था।', gap: 0.9 },                                                                // 13
  { text: 'अचानक, अंदर से आपकी ही आवाज़ आई…', gap: 0.35 },                                                    // 14
  { text: 'दरवाज़ा मत खोलना। मैं बाहर नहीं हूँ।', voice: 'you', gap: 0.7, fx: { lowpass: 950, wet: 0.55, gain: 1.25 } }, // 15
  { text: 'तभी दूसरी तरफ़ से, एक और आवाज़ आई…', gap: 0.45 },                                                    // 16
  { text: 'क्यों? तुम तो पहले ही अंदर आ चुके हो।', voice: 'other', gap: 1.0, fx: { rate: 0.86, wet: 0.7, gain: 1.2 } }, // 17
  { text: 'दरवाज़े के नीचे से, एक होटल की चाबी बाहर निकलती है।', gap: 0 },                                       // 18
  { text: 'उस पर लिखा है…', gap: 0.2 },                                                                       // 19
  { text: 'ROOM 217 — CHECK-IN: TOMORROW.', gap: 0 },                                                         // 20
];
function wordAt(L, word, fb = 0) { if (!L || L.a > 1e8) return fb; const i = (L.words || []).findIndex(o => o.w.replace(/[^ऀ-ॿ\w:]/g, '').includes(word)); return i >= 0 ? L.a + L.words[i].t : L.a + fb; }
const ws = (s, k, w, fb) => wordAt(s.lines[k], w, fb);

// ---------------------------------------------------------------- props
const box = (c, x, y, w, h, t, o = {}) => stroke(c, rectPts(x, y, w, h), t, { w: o.w || 2.8, p: o.p ?? 1, col: o.col, seed: o.seed ?? (x * 7 + y), alpha: o.alpha });
const line = (c, a, b, t, o = {}) => stroke(c, [a, b], t, { w: o.w || 2.6, p: o.p ?? 1, col: o.col, seed: o.seed ?? (a[0] + b[1]), alpha: o.alpha });
function suitcase(c, x, y, t, p = 1) { box(c, x - 22, y - 34, 44, 34, t, { p, seed: 71 }); stroke(c, [[x - 8, y - 34], [x - 8, y - 42], [x + 8, y - 42], [x + 8, y - 34]], t, { p, w: 2.4, seed: 72 }); }
function clock(c, x, y, s, label2, t, col = CH.chalk, a = 1) { box(c, x - s * 1.3, y - s * 0.6, s * 2.6, s * 1.2, t, { seed: 81, col, alpha: a }); text(c, label2, x, y + 2, s * 0.85, { col, alpha: a }); }
function bed(c, x, y, t, p = 1) { box(c, x, y - 60, 170, 60, t, { p, seed: 91 }); box(c, x, y - 110, 20, 110, t, { p, seed: 92 }); box(c, x + 26, y - 82, 54, 22, t, { p, seed: 93 }); line(c, [x + 10, y], [x + 10, y + 10], t, { p }); line(c, [x + 160, y], [x + 160, y + 10], t, { p }); }
function phoneSet(c, x, y, t, p = 1) { box(c, x - 26, y - 20, 52, 20, t, { p, seed: 101 }); stroke(c, [[x - 30, y - 30], [x - 18, y - 38], [x + 18, y - 38], [x + 30, y - 30]], t, { p, w: 4, seed: 102 }); }
function heart(c, x, y, s, t, k) { if (k <= 0) return; const b = 1 + 0.18 * Math.max(0, Math.sin(t * 14)) * (Math.sin(t * 7) > 0 ? 1 : 0.4); const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2, hx = 16 * Math.sin(a) ** 3, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x + hx * s * b / 16, y + hy * s * b / 16]); } fill(c, pts, R, 0.85 * k); stroke(c, pts, t, { col: R, w: 2, seed: 111, alpha: k }); }
function key(c, x, y, t, k, tag) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.5);
  stroke(c, circlePts(x, y, 16), t, { w: 3, seed: 121 }); stroke(c, circlePts(x, y, 6), t, { w: 2, seed: 122 });
  stroke(c, [[x + 16, y], [x + 70, y], [x + 70, y + 10], [x + 62, y + 10], [x + 62, y + 4], [x + 54, y + 4], [x + 54, y + 10]], t, { w: 3, seed: 123 });
  if (tag > 0) { stroke(c, [[x - 8, y - 14], [270, 420]], t, { w: 1.6, seed: 124, p: clamp(tag * 3) }); label(c, 'ROOM 217', 270, 330, 40, t, { k: tag, seed: 125 }); text(c, 'CHECK-IN: TOMORROW', 270, 395, 28, { col: R, alpha: seg(tag, 0.4, 1) }); }
  c.restore();
}
// the bathroom door, closed; shake = knock jolt; gap = the light under it
function bathDoor(c, x, t, o = {}) {
  const [dx, dy] = o.shake ? [Math.sin(t * 90) * 3 * o.shake, 0] : [0, 0];
  c.save(); c.translate(dx, dy);
  door(c, x, G, 92, 180, 0, t, { p: o.p ?? 1, seed: 131 });
  if (o.glow > 0) { fill(c, [[x + 4, G - 3], [x + 88, G - 3], [x + 88, G], [x + 4, G]], R, o.glow); const g = c.createRadialGradient(x + 46, G, 2, x + 46, G, 120); g.addColorStop(0, `rgba(232,87,79,${0.25 * o.glow})`); g.addColorStop(1, 'rgba(232,87,79,0)'); c.fillStyle = g; c.fillRect(x - 80, G - 120, 260, 160); }
  c.restore();
}
// a tall shadow with red eyes (scribbled darkness)
function shadow(c, x, t, k) {
  if (k <= 0) return; c.save(); c.globalAlpha *= clamp(k);
  const pts = [[x - 40, G], [x - 46, G - 200], [x - 30, G - 260], [x, G - 285], [x + 30, G - 260], [x + 46, G - 200], [x + 40, G]]; fill(c, pts, '#020203', 0.92);
  for (let i = 0; i < 4; i++) scribble(c, x, G - 150 - i * 30, 40, t, 1, '#3a3a40', 701 + i);
  for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 12, G - 240, 3.5, 0, Math.PI * 2); c.fillStyle = R; c.fill(); }
  c.restore();
}

// ---------------------------------------------------------------- scenes (L: line timing helpers)
function sReception(c, t, L) {
  const s0 = -0.3;
  line(c, [40, G], [500, G], t, { p: seg(t, s0, s0 + 0.4), seed: 1 });
  box(c, 330, 150, 150, 60, t, { p: seg(t, 0.2, 0.7), seed: 203 }); for (let i = 0; i < 5; i++) { line(c, [345 + i * 28, 162], [345 + i * 28, 180], t, { w: 1.8, seed: 204 + i, p: seg(t, 0.5, 0.9) }); }   // key board
  stick(c, { x: 400, y: 560, h: 170, t, p: seg(t, 0.1, 0.6), face: t > L.a(1) ? 'worried' : 'flat', look: -0.6, seed: 211 });   // behind the desk
  c.save(); c.fillStyle = '#0a0a0c'; c.fillRect(252, 472, 226, 136); c.restore();
  box(c, 250, 470, 230, 140, t, { p: seg(t, 0, 0.6), seed: 201 });                                   // the desk
  text(c, 'RECEPTION', 365, 520, 20, { col: CH.chalk, alpha: seg(t, 0.4, 0.8) });
  stroke(c, [...circlePts(330, 462, 10, 6, Math.PI, 0.5, 8), [320, 468], [340, 468]], t, { w: 2.2, seed: 202, p: seg(t, 0.4, 0.8) });  // bell
  stick(c, { x: 140, y: G, h: 165, t, p: seg(t, 0, 0.5), face: 'flat', look: 0.6, seed: 221, pose: { armR: [0.15, 0] } });
  suitcase(c, 190, G, t, seg(t, 0.3, 0.8));
  // her warning: a bubble with a clock (12:00) and a crossed-out door
  const k = seg(t, L.a(1) - 0.1, L.a(1) + 0.4);
  if (k > 0) { c.save(); c.globalAlpha *= clamp(k * 1.5); stroke(c, [...circlePts(240, 300, 105, 58, -0.9, 0.93, 26), [330, 340], [372, 372]], t, { w: 2.6, seed: 231, p: k }); clock(c, 195, 300, 22, '12:00', t); box(c, 270, 266, 38, 66, t, { seed: 232 }); cross(c, 289, 299, 26, t, seg(t, L.a(1) + 0.6, L.b(1)), R); c.restore(); }
}
function sCorridor(c, t, L) {
  const s0 = L.a(2) - 0.2;
  // perspective corridor: two walls converging to a far door
  for (const [a, b] of [[[40, 120], [220, 330]], [[500, 120], [320, 330]], [[40, G + 40], [220, 470]], [[500, G + 40], [320, 470]]]) line(c, a, b, t, { p: seg(t, s0, s0 + 0.5) });
  box(c, 220, 330, 100, 140, t, { p: seg(t, s0 + 0.2, s0 + 0.6), seed: 301 });
  [[70, 200, 70, 300], [140, 262, 46, 180]].forEach(([x, y, w, h], i) => box(c, x, y, w, h, t, { p: seg(t, s0 + 0.3, s0 + 0.8), seed: 302 + i }));
  box(c, 400, 200, 70, 300, t, { p: seg(t, s0 + 0.3, s0 + 0.8), seed: 304 });
  const t217 = L.w(2, '217', 0.8);
  text(c, '217', 435, 250, 26, { col: t > t217 ? R : CH.chalk, alpha: seg(t, s0 + 0.5, s0 + 0.9) });
  const walk = seg(t, s0 + 0.3, L.b(2) + 0.4), x = lerp(200, 330, ease.inOut(walk));
  stick(c, { x, y: G + 20, h: 170 + walk * 20, t, face: 'flat', pose: walk > 0 && walk < 1 ? { walk: t * 9 } : {}, seed: 311 });
  suitcase(c, x + 40, G + 20, t, 1);
}
function sRoom(c, t, L, o = {}) {
  const s0 = L.a(3) - 0.2, p = o.full ? 1 : seg(t, s0, s0 + 0.6);
  line(c, [30, G], [510, G], t, { seed: 1 });
  bed(c, 40, G, t, p); box(c, 230, 520, 60, 90, t, { p, seed: 401 });               // nightstand
  box(c, 60, 200, 130, 150, t, { p, seed: 402 }); line(c, [125, 200], [125, 350], t, { p, seed: 403 }); stroke(c, circlePts(160, 235, 12), t, { p, w: 2, seed: 404 });   // window + moon
  const t12 = L.w(4, '12:07', 0.9), late = t > t12;
  clock(c, 260, 500, 18, late ? '12:07' : '11:58', t, late ? R : CH.chalk, p);
  // the knocks: three jolts of the door + marks
  const kn = [0.25, 1.05, 1.85].map(d => L.a(5) + d), hit = kn.find(k => t >= k && t < k + 0.18);
  bathDoor(c, 390, t, { p, shake: hit ? 1 : 0, glow: o.glow ?? 0 });
  kn.forEach((k, i) => { const a = seg(t, k, k + 0.1) * (1 - seg(t, k + 0.5, k + 0.9)); if (a > 0) { for (const s of [-1, 1]) stroke(c, [[436 + s * 56, 450 - i * 30], [436 + s * 76, 440 - i * 30]], t, { col: R, w: 3, seed: 411 + i, alpha: a }); text(c, 'ठक', 436 + (i - 1) * 40, 400 - i * 8, 26, { col: R, alpha: a }); } });
  // you: sitting on the bed... then up, walking to the door
  const up = seg(t, L.a(6), L.a(6) + 0.6), toward = seg(t, L.a(6) + 0.3, L.b(6)), x = lerp(150, 320, ease.inOut(toward));
  if (o.you !== false) {
    if (up < 0.5) stick(c, { x: 150, y: G - 30, h: 150, t, p: o.full ? 1 : seg(t, s0 + 0.2, s0 + 0.7), face: t > kn[0] ? 'worried' : 'flat', look: t > kn[0] ? 1 : 0, pose: { sit: true }, seed: 421 });
    else stick(c, { x, y: G, h: 165, t, face: 'worried', look: 1, pose: toward > 0 && toward < 1 ? { walk: t * 8 } : {}, seed: 421 });
    if (t > L.a(6) + 0.5 && t < L.b(6) + 0.3) question(c, x, G - 200, 34, t, seg(t, L.a(6) + 0.5, L.a(6) + 0.8), CH.chalk);
  }
}
function sPhone(c, t, L) {
  const s0 = L.a(7) - 0.2;
  // left: you with the receiver; right: the receptionist, shaking; a cord of sound between
  line(c, [270, 150], [270, 640], t, { p: seg(t, s0, s0 + 0.4), seed: 501, alpha: 0.5 });
  phoneSet(c, 160, 560, t, seg(t, s0, s0 + 0.5));
  const you = stick(c, { x: 120, y: G, h: 165, t, p: seg(t, s0, s0 + 0.5), face: 'worried', look: 1, pose: { armR: [2.4, 0.9] }, seed: 511 });
  if (seg(t, s0, s0 + 0.5) > 0.7) { stroke(c, [[you.hand[0] - 4, you.hand[1] - 14], [you.hand[0] + 8, you.hand[1] - 18], [you.hand[0] + 12, you.hand[1] + 16], [you.hand[0], you.hand[1] + 18]], t, { w: 4, seed: 512 }); stroke(c, [[you.hand[0] + 6, you.hand[1] + 18], [you.hand[0] + 16, you.hand[1] + 50], [140, 545]], t, { w: 1.6, seed: 513 }); }
  const shake = t > L.a(8) ? Math.sin(t * 60) * 2.2 : 0;
  c.save(); c.translate(shake, 0);
  stick(c, { x: 420, y: 570, h: 170, t, p: seg(t, s0 + 0.2, s0 + 0.7), face: 'worried', look: -1, pose: { armL: [-2.4, -0.9] }, seed: 531 });
  c.save(); c.fillStyle = '#0a0a0c'; c.fillRect(332, 482, 176, 126); c.restore();
  box(c, 330, 480, 180, 130, t, { p: seg(t, s0 + 0.2, s0 + 0.7), seed: 521 });
  sweat(c, 446, 412, 7, t, seg(t, L.a(8), L.a(8) + 0.3));
  c.restore();
  // her words: the floor plan of 217 has no bathroom
  const k = seg(t, L.a(10) - 0.05, L.a(10) + 0.5), tn = L.w(10, 'नहीं', 1.8);
  if (k > 0) { c.save(); c.globalAlpha *= clamp(k * 1.4);
    box(c, 140, 120, 260, 190, t, { seed: 541, p: k, col: '#9fc3ea' }); text(c, 'ROOM 217', 270, 104, 18, { col: '#9fc3ea' });
    box(c, 160, 170, 90, 50, t, { seed: 542, col: '#9fc3ea' }); text(c, 'BED', 205, 196, 14, { col: '#9fc3ea' });
    stroke(c, rectPts(300, 140, 80, 90), t, { col: '#9fc3ea', w: 2, seed: 543, alpha: 0.6 }); text(c, 'बाथरूम?', 340, 186, 16, { col: '#9fc3ea' });
    cross(c, 340, 185, 40, t, seg(t, tn, tn + 0.4), R);
    c.restore(); }
}
function sDoorClose(c, t, L) {
  // the door, closer and closer; your heart
  const s0 = L.a(11) - 0.2, z = 1 + 0.5 * E(t, L.a(12), L.b(13) + 0.6, ease.inOut);
  c.save(); c.translate(436, 520); c.scale(z, z); c.translate(-436, -520);
  sRoom(c, t, L, { full: true, you: false, glow: seg(t, L.a(13), L.b(13)) });
  c.restore();
  const k = 1 - seg(t, L.a(12) + 0.3, L.a(12) + 0.9);
  if (k > 0) { stick(c, { x: 170, y: G, h: 165, t, face: 'worried', look: 1, seed: 611, alpha: k }); heart(c, 170, G - 110, 9, t, seg(t, L.a(11), L.a(11) + 0.3) * k); }
}
function sVoices(c, t, L) {
  // the door, big; your own faint shape inside it; then you turn: something stands behind you
  const s0 = L.a(14) - 0.2;
  line(c, [30, G], [510, G], t, { seed: 1 });
  bathDoor(c, 300, t, { glow: 1 });
  const ghost = seg(t, L.a(15) - 0.1, L.a(15) + 0.6) * (1 - seg(t, L.b(15) + 0.4, L.b(15) + 1));
  if (ghost > 0) { stick(c, { x: 346, y: G - 10, h: 140, t, face: 'sad', alpha: 0.35 * ghost, col: '#9fb4c9', seed: 711 }); for (const r of [26, 40, 54]) stroke(c, circlePts(346, 470, r, r, -0.6, 0.35, 10), t, { col: '#9fb4c9', w: 2, seed: 712 + r, alpha: 0.5 * ghost }); }
  const turn = t > L.a(16) + 0.4;
  stick(c, { x: 170, y: G, h: 170, t, face: turn ? 'o' : 'worried', look: turn ? -1 : 1, seed: 721 });
  sweat(c, 196, G - 175, 7, t, seg(t, L.a(15), L.a(15) + 0.3));
  shadow(c, 70, t, seg(t, L.a(16) + 0.3, L.a(17)) * (1 - seg(t, L.b(17) + 0.2, L.b(17) + 0.6)));
  // "you're already inside": the door frame closes round you
  const inside = seg(t, L.w(17, 'अंदर', 1.6), L.w(17, 'अंदर', 1.6) + 0.5);
  if (inside > 0) stroke(c, rectPts(110, G - 220, 120, 220), t, { p: inside, col: R, w: 3.4, seed: 731 });
}
function sKey(c, t, L) {
  const s0 = L.a(18) - 0.2, out = seg(t, L.a(18) + 0.5, L.b(18) + 0.2);
  line(c, [30, G], [510, G], t, { seed: 1 });
  bathDoor(c, 300, t, { glow: 1 - seg(t, L.b(20), L.b(20) + 1.2) * 0.7 });
  key(c, lerp(330, 200, ease.out(out)), G + 22, t, seg(t, L.a(18) + 0.4, L.a(18) + 0.8), seg(t, L.a(19) + 0.2, L.a(20) + 0.6));
}
const SCENES = [[0, sReception], [2, sCorridor], [3, sRoom], [7, sPhone], [11, sDoorClose], [14, sVoices], [18, sKey]];

export default {
  slug: 'room-217', title: 'इस होटल के बाथरूम का दरवाज़ा मत खोलना!',   // (shown on the cover only: titleOut 0) titleOut: 0, noFadeIn: true, endCard: false,
  bg: '#060607', vignette: 0.78, grain: 0.05,
  fonts: [{ family: 'Kalam', url: '/vendor/fonts/Kalam-Bold.ttf', weight: 700 }],
  // smaller captions than before (24 px instead of 34), up to 5 words
  subY: 700, subStyle: { mode: 'chalk', font: '"Kalam", "Nirmala UI", sans-serif', weight: 700, size: 24, words: 5, rows: 1, max: 470, active: '#e8574f', fill: '#ece8df', next: 'rgba(150,150,150,0.5)' },
  voices: {
    nar: { speaker: 'mukul_hi_suspense', model: 'bulbul:v4-flash', pace: 0.85 },        // the narrator: suspense, slow, calm
    rec1: { speaker: 'simran_hi_conversation', model: 'bulbul:v4-flash', pace: 0.95 },   // the receptionist, at the desk
    rec2: { speaker: 'simran_hi_conversation', model: 'bulbul:v4-flash', pace: 0.9 },    // ...and on the phone, shaking
    you: { speaker: 'aditya_hi_conversational', model: 'bulbul:v4-flash', pace: 0.95 },  // your own voice, behind the door
    other: { speaker: 'ratan_hi_latenight', model: 'bulbul:v4-flash', pace: 0.9 },      // the other voice (pitched down in the mix)
  },
  music: { root: 40, scale: 'phrygian', prog: [0, 1, 0, 6], chord: 6, level: 0.06, bells: false, pulse: false, warmth: 500, duck: 0.55, attack: 2 },
  ambience: tl => [{ type: 'room', from: 0, to: tl.total, gain: 0.5 }, { type: 'drone', from: 0, to: tl.total, gain: 0.45 }, { type: 'clock', from: 8, to: 30, gain: 0.25 }],
  cover: 60,
  shots: [
    { id: 'night', min: 0, lead: 0.1, tail: 2.2, oneTake: { paces: { nar: 0.85 }, tighten: 0.25 },
      vo: LINES,
      sfx: [
        [0.2, 'pop', { f: 1800, gain: 0.25 }],                                                    // the desk bell
        [s => s.lines[2].a - 0.1, 'steps', { n: 5, gap: 0.45, gain: 0.18 }], [s => s.lines[2].b - 0.2, 'creak', { dur: 1.2, gain: 0.25 }],
        ...[0.25, 1.05, 1.85].map(d => [s => s.lines[5].a + d, 'knock', { gain: 0.95 }]),
        [s => s.lines[7].a + 0.2, 'tap', { gain: 0.4 }], [s => s.lines[7].a + 0.6, 'glitch', {}],
        [s => s.lines[10].a - 0.4, 'whisper', { dur: 1.2, gain: 0.03 }],
        [s => s.lines[11].a, 'heartbeat', { n: 6, gap: 0.62, gain: 0.8 }],
        [s => s.lines[13].b + 0.1, 'drone', { dur: 3, gain: 0.6 }],
        [s => s.lines[16].b, 'riser', { dur: 1.2, gain: 0.25 }], [s => s.lines[17].a - 0.05, 'boom', { gain: 0.5 }],
        [s => ws(s, 17, 'अंदर', 1.6), 'stinger', { gain: 0.8, root: 40 }],
        [s => s.lines[18].a + 0.5, 'swish', { gain: 0.15 }], [s => s.lines[18].a + 0.9, 'metal', { gain: 0.08, len: 0.6, pitch: 1.4 }],
        [s => s.lines[20].a, 'stinger', { gain: 0.6, root: 40 }],
      ],
      draw(c, t0, S) {
        const t = step(t0), L = { a: k => S.line(k).a, b: k => S.line(k).b, w: (k, w, fb) => wordAt(S.line(k), w, fb) };
        board(c, { cy: 380 });
        // a slow flicker of the dark, more after midnight
        const late = t > L.a(4);
        const starts = SCENES.map(([k]) => (k === 0 ? -1 : L.a(k) - 0.2));
        SCENES.forEach(([k, fn], i) => {
          const s0 = starts[i], s1 = starts[i + 1] ?? 1e9;
          const a = (i ? clamp((t0 - s0) / 0.3) : 1) * clamp((s1 - t0) / 0.25); if (a <= 0) return;
          c.save(); c.globalAlpha = a; fn(c, t, L); c.restore();
        });
        if (late) { const fl = Math.max(0, Math.sin(t * 2.3) * Math.sin(t * 7.1)) * 0.25; c.fillStyle = `rgba(0,0,0,${fl})`; c.fillRect(0, 0, W, H); }
        if (t > L.w(17, 'अंदर', 1.6) && t < L.w(17, 'अंदर', 1.6) + 0.15) { c.fillStyle = 'rgba(232,87,79,0.35)'; c.fillRect(0, 0, W, H); }
      } },
  ],
};
