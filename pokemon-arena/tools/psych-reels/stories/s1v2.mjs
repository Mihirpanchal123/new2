// 1 v2. The Prisoner With No Chains — in the chalk style, with the reference reel's pacing (see chalk.mjs).
// One continuous board: the voice never waits for the picture; the drawing changes under it on the key words,
// with a quick fade through dark only between big ideas. Pauses stay short and grammatical (~0.25 s at a comma,
// ~0.5 s at a full stop). Structure: a question hook -> the story -> what people assume -> "but psychologically..."
// -> the mechanism -> "not because X, but because Y" -> a two-line ending + one question.
import { W, H, clamp, lerp, seg, ease, E } from '../engine.mjs';
import { CH, board, stroke, circlePts, rectPts, fill, stick, text, label, cross, sparkle, question, door, padlock, keys, bars, cloud, bubbles, sun, bird, brain, chain, scribble, tally, sweat, step } from '../chalk.mjs';

const G = 600;   // the ground line (it never moves: the board's continuity)
// the script, with plain punctuation: it is read in ONE take (oneTake below), so the pauses are the voice's own
const LINES = [
  { text: 'कभी ग़ौर किया है, कुछ लोग दरवाज़ा खुला होने पर भी, बाहर क्यों नहीं निकलते?', gap: 0 },   // 0  hook
  { text: 'एक कैदी था। बीस साल, एक ही कोठरी में।', gap: 0 },                                        // 1
  { text: 'हर दिन, वो आज़ादी के सपने देखता।', gap: 0 },                                                // 2
  { text: 'दीवार तोड़ने की कोशिश की, सुरंग खोदी, हर रास्ता ढूँढा।', gap: 0 },                         // 3  three attempts
  { text: 'फिर एक सुबह, पहरेदार ताला लगाना भूल गया।', gap: 0 },                                         // 4
  { text: 'दरवाज़ा पूरा खुला था।', gap: 0 },                                                        // 5
  { text: 'लेकिन वो बाहर नहीं निकला।', gap: 0 },                                                       // 6
  { text: 'लोग कहते, वो पागल है, या डरपोक।', gap: 0 },                                               // 7  what people assume
  { text: 'लेकिन मनोविज्ञान की नज़र से, बात कुछ और थी।', gap: 0 },                                     // 8  the reframe
  { text: 'बीस साल में, उसके दिमाग़ ने उस कोठरी को ही घर मान लिया था।', gap: 0 },                         // 9  the mechanism
  { text: 'और बाहर की दुनिया, आज़ादी नहीं, ख़तरा लगने लगी थी।', gap: 0 },                              // 10
  { text: 'वो दीवारों की वजह से नहीं रुका।', gap: 0 },                                              // 11 not because...
  { text: 'बल्कि इसलिए, क्योंकि डर, उसकी आदत बन चुका था।', gap: 0 },                                  // 12 ...but because
  { text: 'कुछ ज़ंजीरें, पैरों में नहीं होतीं।', gap: 0 },                                            // 13 the ending
  { text: 'वो दिमाग़ में होती हैं।', gap: 0 },                                                        // 14
  { text: 'और आपकी ज़ंजीर, कौन-सी है?', gap: 0 },                                                    // 15 the question
];

function wordAt(L, word, fb = 0) {
  if (!L || L.a > 1e8) return fb;
  const i = (L.words || []).findIndex(o => o.w.replace(/[^ऀ-ॿ\w]/g, '').includes(word));
  return i >= 0 ? L.a + L.words[i].t : L.a + fb;
}
const ws = (s, k, w, fb) => wordAt(s.lines[k], w, fb);

// ---------------------------------------------------------------- scenes (t = time on the hand-drawn cadence)
function sHook(c, t, L) {
  const td = L.w(0, 'दरवाज़ा', 1.2), open = E(t, td + 0.1, td + 0.8);
  door(c, 330, G, 92, 175, open, t, { p: seg(t, -0.1, 0.45), dir: -1 });
  stick(c, { x: 180, y: G, h: 170, t, p: seg(t, -0.15, 0.35), face: t > L.w(0, 'क्यों', 3) ? 'worried' : 'flat', look: 0.5, seed: 11 });
  question(c, 182, G - 205, 44, t, seg(t, L.w(0, 'क्यों', 3), L.w(0, 'क्यों', 3) + 0.3));
}
function sCell(c, t, L) {
  const s0 = L.a(1) - 0.2;
  stroke(c, rectPts(90, 360, 360, G - 360), t, { p: seg(t, s0, s0 + 0.7), w: 3, seed: 201 });
  bars(c, 240, 385, 60, 42, t, seg(t, s0 + 0.3, s0 + 0.9));
  stick(c, { x: 170, y: G, h: 165, t, p: seg(t, s0 + 0.1, s0 + 0.6), face: 'sad', look: 0.3, seed: 21 });
  const tb = L.w(1, 'बीस', 1);
  tally(c, 318, 440, 20 * seg(t, tb, L.b(1) + 0.2), t, 34);
  text(c, '20 साल', 362, 572, 28, { col: CH.yellow, alpha: seg(t, tb + 0.2, tb + 0.5) });
  // the dream: thought bubbles to a cloud with the sun, green hills, birds
  const d0 = L.a(2), dOut = 1 - seg(t, L.a(3) - 0.1, L.a(3) + 0.3);
  if (t > d0 && dOut > 0) {
    c.save(); c.globalAlpha *= dOut;
    bubbles(c, 192, 400, 236, 330, t, seg(t, d0, d0 + 0.45));
    cloud(c, 300, 232, 138, 84, t, seg(t, d0 + 0.25, d0 + 0.8));
    const k = seg(t, L.w(2, 'आज़ादी', 0.8) - 0.1, L.w(2, 'आज़ादी', 0.8) + 0.4);
    sun(c, 250, 210, 17, t, k);
    if (k > 0) { stroke(c, [[192, 268], [232, 246], [268, 262], [305, 240], [348, 266], [400, 250]], t, { p: k, col: CH.green, w: 2.8, seed: 207 }); bird(c, 330 + Math.sin(t) * 8, 205, 9, t, 1); bird(c, 362 + Math.sin(t + 1) * 8, 222, 7, t, 2); }
    c.restore();
  }
  // three attempts, three panels, three red crosses
  const aOut = 1 - seg(t, L.b(3) + 0.25, L.b(3) + 0.6);
  ['दीवार', 'सुरंग', 'रास्ता'].forEach((wd, i) => {
    const tw = L.w(3, wd, 0.2 + i), k = seg(t, tw - 0.05, tw + 0.35); if (k <= 0) return;
    const px = 48 + i * 152, py = 140, pw = 140, ph = 120;
    c.save(); c.globalAlpha *= aOut;
    stroke(c, rectPts(px, py, pw, ph), t, { p: k, w: 2.6, seed: 211 + i });
    const kk = seg(t, tw + 0.1, tw + 0.5);
    if (i === 0) { for (let r = 0; r < 4; r++) stroke(c, [[px + 72, py + 22 + r * 24], [px + pw - 10, py + 22 + r * 24]], t, { p: kk, w: 2, seed: 221 + r }); for (let r = 0; r < 4; r++) stroke(c, [[px + 92 + (r % 2) * 22, py + 10 + r * 24], [px + 92 + (r % 2) * 22, py + 22 + r * 24]], t, { p: kk, w: 2, seed: 225 + r });
      const a = -0.7 + 0.55 * Math.abs(Math.sin(t * 7)); c.save(); c.translate(px + 40, py + 98); c.rotate(a); stroke(c, [[0, 0], [0, -62]], t, { p: kk, w: 3, seed: 229 }); stroke(c, rectPts(-14, -74, 28, 14), t, { p: kk, w: 2.6, seed: 230 }); c.restore();
      if (kk > 0.6) stroke(c, [[px + 76, py + 30], [px + 84, py + 48], [px + 78, py + 62], [px + 88, py + 82]], t, { w: 2, col: CH.yellow, seed: 231 }); }
    if (i === 1) { stroke(c, [[px + 8, py + 48], [px + pw - 8, py + 48]], t, { p: kk, w: 2.4, seed: 241 }); stroke(c, circlePts(px + 70, py + 48, 32, 40, 0, 0.5, 14), t, { p: kk, w: 2.4, seed: 242 }); c.save(); c.translate(px + 104, py + 40 + Math.abs(Math.sin(t * 6)) * 10); c.rotate(0.5); stroke(c, [[0, -40], [0, 18]], t, { p: kk, w: 3, seed: 243 }); stroke(c, [[-9, 18], [9, 18], [6, 34], [-6, 34], [-9, 18]], t, { p: kk, w: 2.4, seed: 244 }); c.restore(); }
    if (i === 2) { const path = [[px + 14, py + 96], [px + 40, py + 40], [px + 72, py + 88], [px + 104, py + 30], [px + 122, py + 62]]; for (let s = 0; s < path.length - 1; s++) for (let d = 0; d < 3; d++) { const a = path[s], b = path[s + 1], f0 = d / 3, f1 = d / 3 + 0.18; stroke(c, [[lerp(a[0], b[0], f0), lerp(a[1], b[1], f0)], [lerp(a[0], b[0], f1), lerp(a[1], b[1], f1)]], t, { p: seg(kk, s / 4, (s + 1) / 4), w: 2.4, seed: 251 + s * 3 + d }); } }
    cross(c, px + pw / 2, py + ph / 2, 36, t, seg(t, L.b(3) - 0.45 + i * 0.12, L.b(3) - 0.1 + i * 0.12));
    c.restore();
  });
}
function sDoor(c, t, L) {
  const s0 = L.a(4) - 0.2, open = E(t, L.a(5) + 0.05, L.a(5) + 0.9), tf = L.w(4, 'भूल', 1.8);
  door(c, 300, G, 100, 190, open, t, { p: seg(t, s0, s0 + 0.6), dir: -1, seed: 301 });
  padlock(c, 392, G - 102, 22, seg(t, tf, tf + 0.3), t, { k: seg(t, s0 + 0.4, s0 + 0.7) * (1 - seg(t, L.a(5), L.a(5) + 0.3)) });
  sparkle(c, 414, G - 132, 9, t, CH.yellow, seg(t, tf, tf + 0.2) * (1 - seg(t, L.a(5) + 0.4, L.a(5) + 0.8)));
  // the guard walks off with the keys
  const gw = seg(t, L.a(4) + 0.3, L.b(4) + 0.4);
  if (gw < 1) { const g = stick(c, { x: lerp(450, 610, gw), y: G, h: 160, t, cap: true, face: 'flat', pose: gw > 0 ? { walk: t * 10 } : {}, p: seg(t, s0 + 0.1, s0 + 0.5), seed: 311 }); if (seg(t, s0 + 0.1, s0 + 0.5) > 0.6) keys(c, g.hand[0] + 4, g.hand[1] + 6, 9, t); }
  // the prisoner: steps towards the light... stops... steps back
  const tn = L.w(6, 'नहीं', 1.2), go = seg(t, L.a(6), tn), back = seg(t, tn + 0.15, tn + 0.7);
  const px = 160 + 70 * ease.inOut(go) - 40 * ease.inOut(back), walking = (go > 0 && go < 1) || (back > 0 && back < 1);
  stick(c, { x: px, y: G, h: 165, t, p: seg(t, s0 + 0.15, s0 + 0.7), face: t > tn ? 'worried' : 'flat', look: 0.5, pose: walking ? { walk: t * 10 } : {}, seed: 321 });
  sweat(c, px + 25, G - 170, 7, t, seg(t, tn + 0.1, tn + 0.3));
}
function sJudge(c, t, L) {
  const s0 = L.a(7) - 0.2, tk = L.w(8, 'कुछ', 1.4), tm = L.w(8, 'मनोविज्ञान', 0.4);
  stick(c, { x: 270, y: G, h: 170, t, p: seg(t, s0, s0 + 0.5), face: 'sad', seed: 401 });
  const side = 1 - 0.65 * seg(t, L.a(8), L.a(8) + 0.4);
  stick(c, { x: 85, y: G, h: 115, t, p: seg(t, s0 + 0.2, s0 + 0.6), face: 'flat', alpha: side, pose: { armR: [1.5, 0.05] }, seed: 411 });
  stick(c, { x: 455, y: G, h: 115, t, p: seg(t, s0 + 0.3, s0 + 0.7), face: 'flat', alpha: side, pose: { armL: [-1.5, -0.05] }, seed: 421 });
  const tp = L.w(7, 'पागल', 0.8), td = L.w(7, 'डरपोक', 1.6);
  label(c, 'पागल?', 140, 300, 32, t, { k: seg(t, tp, tp + 0.3), col: CH.blue, strike: seg(t, tk, tk + 0.35), seed: 431 });
  label(c, 'डरपोक?', 400, 300, 32, t, { k: seg(t, td, td + 0.3), strike: seg(t, tk + 0.15, tk + 0.5), seed: 433 });
  const mk = seg(t, tm - 0.05, tm + 0.5);
  if (mk > 0) { bubbles(c, 284, 408, 296, 338, t, mk); cloud(c, 270, 236, 84, 62, t, mk); brain(c, 270, 238, 40, t, seg(t, tm + 0.3, tm + 0.7)); }
}
function house(c, t, L, roofP) {
  stroke(c, rectPts(150, 410, 240, G - 410), t, { w: 3, seed: 501 });
  bars(c, 318, 428, 46, 32, t, 1);
  if (roofP > 0) stroke(c, [[138, 412], [270, 322], [402, 412]], t, { p: roofP, w: 3.2, seed: 502 });
}
function sHome(c, t, L) {
  const s0 = L.a(9) - 0.2, tg = L.w(9, 'घर', 2.4), t10 = L.a(10);
  c.save(); c.globalAlpha *= seg(t, s0, s0 + 0.5); house(c, t, L, seg(t, tg - 0.1, tg + 0.4)); c.restore();
  const warm = seg(t, tg, tg + 0.5) * (1 - seg(t, t10 + 0.4, t10 + 1));
  if (warm > 0) fill(c, rectPts(150, 410, 240, G - 410), CH.yellow, 0.12 * warm);
  text(c, 'घर', 270, 384, 32, { col: CH.yellow, alpha: seg(t, tg, tg + 0.3) });
  stick(c, { x: 270, y: G, h: 140, t, p: seg(t, s0 + 0.1, s0 + 0.6), face: t > t10 + 0.3 ? 'worried' : t > tg ? 'smile' : 'flat', seed: 511 });
  scribble(c, 78, 480, 56, t, seg(t, t10, t10 + 1.6), CH.red, 521); scribble(c, 466, 488, 56, t, seg(t, t10 + 0.3, t10 + 1.9), CH.red, 531);
  const ta = L.w(10, 'आज़ादी', 0.8), tn = L.w(10, 'नहीं', 1.4), tk = L.w(10, 'ख़तरा', 1.8);
  label(c, 'आज़ादी', 145, 236, 32, t, { k: seg(t, ta, ta + 0.3), strike: seg(t, tn, tn + 0.3), seed: 541 });
  label(c, 'ख़तरा!', 395, 236, 34, t, { k: seg(t, tk, tk + 0.3), col: CH.red, seed: 543 });
}
function sChain(c, t, L) {
  const tdr = L.w(12, 'डर', 1), tad = L.w(12, 'आदत', 2), t13 = L.a(13), tno = L.w(13, 'नहीं', 1.2);
  // the walls go: it was never the walls
  const walls = 1 - seg(t, L.a(11) + 0.4, L.b(11) + 0.2);
  if (walls > 0) { c.save(); c.globalAlpha *= walls; house(c, t, L, 1); c.restore(); }
  const ex = seg(t, L.a(11) + 0.4, L.b(11) + 0.2);   // the red mess outside fades with them
  if (ex < 1) { c.save(); c.globalAlpha *= 1 - ex; scribble(c, 78, 480, 56, t, 1, CH.red, 521); scribble(c, 466, 488, 56, t, 1, CH.red, 531); c.restore(); }
  // push in to his head on the last line
  const z = 1 + 0.38 * E(t, L.a(14) - 0.1, L.b(14) + 0.2), hy = G - 140 + 0.115 * 140;
  c.save(); c.translate(270, hy); c.scale(z, z); c.translate(-270, -hy);
  stick(c, { x: 270, y: G, h: 140, t, face: t > tdr ? 'worried' : 'flat', seed: 511 });
  chain(c, 270, hy, 40, 12, t, { p: seg(t, tdr - 0.1, tdr + 0.8), col: t > tad ? CH.red : CH.chalk, n: 14, s: 0.85 });
  text(c, 'डर', 345, hy - 58, 34, { col: CH.red, alpha: seg(t, tdr, tdr + 0.3) * (1 - seg(t, L.a(14), L.a(14) + 0.3)) });
  chain(c, 270, G - 5, 40, 8, t, { p: seg(t, t13, t13 + 0.6), col: CH.grey, n: 12, s: 0.8 });
  cross(c, 270, G - 8, 26, t, seg(t, tno, tno + 0.35));
  c.restore();
}
function sFree(c, t, L) {
  const s0 = L.a(15) - 0.2, tb = L.w(15, 'ज़ंजीर', 0.4), burst = seg(t, tb, tb + 0.9), light = seg(t, tb + 0.1, tb + 0.9);
  door(c, 400, G, 82, 170, light, t, { p: light, dir: -1, seed: 601 });
  const walk = seg(t, tb + 0.6, L.b(15) + 1.0), px = 215 + 95 * ease.inOut(walk), hy = G - 150 + 0.115 * 150;
  stick(c, { x: px, y: G, h: 150, t, p: seg(t, s0, s0 + 0.4), face: burst > 0.3 ? 'happy' : 'worried', pose: walk > 0 && walk < 1 ? { walk: t * 9 } : {}, seed: 611 });
  chain(c, px, hy, 42, 12, t, { p: seg(t, s0, s0 + 0.3), col: CH.red, n: 14, s: 0.85, burst });
  for (const [x, y, s, d] of [[150, 300, 8, 0.2], [430, 270, 10, 0.4], [360, 360, 7, 0.6], [110, 420, 6, 0.8]]) sparkle(c, x, y, s, t, CH.yellow, seg(t, tb + 0.4 + d, tb + 0.7 + d));
}
const SCENES = [[0, sHook, 'fade'], [1, sCell, 'fade'], [4, sDoor, 'fade'], [7, sJudge, 'fade'], [9, sHome, 'fade'], [11, sChain, 'cut'], [15, sFree, 'fade']];

export default {
  slug: 'prisoner-no-chains-chalk',
  title: 'वो कैदी, जिसकी कोई ज़ंजीर नहीं थी',
  titleOut: 0, noFadeIn: true, endCard: false,
  bg: CH.board, vignette: 0.55, grain: 0.035,
  fonts: [{ family: 'Kalam', url: '/vendor/fonts/Kalam-Bold.ttf', weight: 700 }],
  subY: 672, subStyle: { mode: 'chalk', font: '"Kalam", "Nirmala UI", sans-serif', weight: 700, size: 34, words: 4, rows: 1, max: 470, active: CH.yellow, fill: '#f3f0e8', next: 'rgba(150,150,150,0.45)' },
  voices: { nar: { speaker: 'kabir_hi_conversational', model: 'bulbul:v4-flash', pace: 0.8 } },   // read in one take at 0.8 = the reference reel's speaking rate   // calm, ~125 Hz like the reference
  music: { root: 45, scale: 'minor', prog: [0, 5, 3, 4], chord: 6, level: 0.035, bells: false, pulse: false, warmth: 700, duck: 0.5, attack: 1.5 },   // barely there: the voice carries it
  ambience: tl => [{ type: 'room', from: 0, to: tl.total, gain: 0.35 }],
  cover: 22,
  shots: [
    { id: 'board', min: 0, lead: 0.05, tail: 1.5, oneTake: { pace: 0.8, tighten: 0.5 },
      vo: LINES,
      sfx: [
        [0.05, 'scribble', { n: 5, gain: 0.05 }],
        [s => ws(s, 0, 'दरवाज़ा', 1.2) + 0.1, 'creak', { dur: 0.9, gain: 0.12 }],
        [s => s.lines[1].a - 0.1, 'scribble', { n: 8, gain: 0.05 }],
        [s => ws(s, 3, 'दीवार', 0.2), 'clank', { n: 2, gap: 0.2 }], [s => ws(s, 3, 'सुरंग', 1.2), 'dig', { n: 2 }], [s => ws(s, 3, 'रास्ता', 2.2), 'scribble', { n: 4, gain: 0.06 }],
        [s => s.lines[3].b - 0.4, 'swish', { gain: 0.1 }],
        [s => s.lines[4].a + 0.3, 'keys', { n: 6 }], [s => ws(s, 4, 'भूल', 1.8), 'lock', {}],
        [s => s.lines[5].a + 0.05, 'creak', { dur: 1.3, gain: 0.18 }], [s => ws(s, 5, 'खुला', 0.8), 'chime', { notes: [76, 81], gain: 0.5 }],
        [s => s.lines[6].a, 'steps', { n: 2, gap: 0.4, gain: 0.12 }], [s => ws(s, 6, 'नहीं', 1.2), 'heartbeat', { n: 2, gap: 0.6, gain: 0.25 }],
        [s => ws(s, 7, 'पागल', 0.8), 'whisper', { dur: 1.4, gain: 0.04 }],
        [s => ws(s, 8, 'मनोविज्ञान', 0.4), 'pop', { f: 360, gain: 0.15 }],
        [s => ws(s, 9, 'घर', 2.4), 'chime', { notes: [72, 76, 79], gain: 0.4 }],
        [s => s.lines[10].a, 'scribble', { n: 10, gain: 0.07 }], [s => ws(s, 10, 'ख़तरा', 1.8), 'hit', { gain: 0.2 }],
        [s => ws(s, 12, 'डर', 1), 'clank', { n: 3, gap: 0.18 }],
        [s => ws(s, 15, 'ज़ंजीर', 0.4), 'shatter', {}], [s => ws(s, 15, 'ज़ंजीर', 0.4) + 0.3, 'chime', { notes: [79, 84, 88], gain: 0.6 }],
      ],
      draw(c, t0, S) {
        const t = step(t0);
        const L = { a: k => S.line(k).a, b: k => S.line(k).b, w: (k, w, fb) => wordAt(S.line(k), w, fb) };
        const tb = L.w(15, 'ज़ंजीर', 0.4);
        board(c, { glow: seg(t, tb + 0.1, tb + 1.3), gx: 430, gy: 470, gr: 460 });
        stroke(c, [[40, G], [500, G]], t, { p: seg(t, -0.3, 0.2), w: 3, seed: 1 });
        const starts = SCENES.map(([k]) => (k === 0 ? -1 : L.a(k) - 0.2));
        SCENES.forEach(([k, fn, how], i) => {
          const s0 = starts[i], s1 = starts[i + 1] ?? 1e9, nextHow = SCENES[i + 1]?.[2];
          const aIn = i === 0 ? 1 : how === 'cut' ? (t0 >= s0 ? 1 : 0) : clamp((t0 - s0) / 0.3);
          const aOut = nextHow === 'cut' ? (t0 < s1 ? 1 : 0) : clamp((s1 - t0) / 0.25);
          const a = aIn * aOut; if (a <= 0) return;
          c.save(); c.globalAlpha = a; fn(c, t, L); c.restore();
        });
      } },
  ],
};
