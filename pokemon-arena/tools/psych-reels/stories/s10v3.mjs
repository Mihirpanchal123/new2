// 10 v3. The Man Who Won Every Argument — rebuilt in the "Aarav" art direction (adult.mjs).
// Aarav (our recurring young adult) wins every argument: in the group chat, at the office, at home... until the
// phone that never stopped buzzing goes quiet. Navy / cream / grey world, teal / coral / amber accents, adult
// proportions, cel shading, smear frames, hand-drawn accents, push-ins, pans, parallax, impact zooms,
// match cuts + shape + brush transitions. Narration: a friend telling you a story (Sarvam conversational voice).
import { W, H, FONT, clamp, lerp, seg, ease, E, rng, noise1, mix, shade, rgba, lin, rad, rr, ell, circ, poly, blob, cam } from '../engine.mjs';
import { PAL as P, S as SH, cel, person, walk, joints, handAt, accent, strokeW, phone, chat, avatar, texture, words, impact, layer, capsule } from '../adult.mjs';

// ---------------------------------------------------------------- the cast (Aarav is adult.mjs's default style)
const KABIR = { skin: '#b97f58', hair: '#1a1515', hairStyle: 'curly', top: '#5d6880', neckline: true, pants: '#2f3a4f', shoes: '#f3e9d2', stubble: true };
const RIYA = { skin: '#d9a57e', hair: '#2b1d1d', hairStyle: 'long', top: '#f3e9d2', jacket: '#ef6f5e', pants: '#3a3550', shoes: '#2a2026', browW: 0.034, eyes: '#2a1a14' };
const MOM = { skin: '#c99068', hair: '#2a2228', hairStyle: 'bun', grey: '#b9b4b8', top: '#cc8424', kurta: true, dupatta: '#2a9d8f', pants: '#5d4a6a', shoes: '#4a3a34', browW: 0.034 };
const NEHA = { skin: '#d2a07a', hair: '#3a2420', hairStyle: 'long', top: '#69c6b8', neckline: true, pants: '#26314f', shoes: '#efe7d6', browW: 0.034 };
const GHOST = st => ({ ...st, skin: '#6d7890', hair: '#4b556b', top: '#5d6880', jacket: st.jacket ? '#56617a' : null, dupatta: st.dupatta ? '#56617a' : null, pants: '#46506a', shoes: '#46506a', desat: true });

// when a word of a voice line is spoken (seconds into the shot); falls back to `fb` seconds after the line starts
function wordAt(L, word, fb = 0) {
  if (!L || L.a > 1e8) return fb;
  const i = (L.words || []).findIndex(o => o.w.replace(/[^ऀ-ॿ\w]/g, '').includes(word));
  return i >= 0 ? L.a + L.words[i].t : L.a + fb;
}
const wS = (s, k, word, fb) => wordAt(s.lines[k], word, fb);       // for sfx (gets the shot)
const wD = (S, k, word, fb) => wordAt(S.line(k), word, fb);        // for draw (gets the helpers)
const fs = (c, fill, lw = 2.4, ol = P.ink) => { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = ol; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); } };

// ---------------------------------------------------------------- sets
// the table, seen from above: the hook and the last shot (a bookend)
function tableTop(c, t, { lamp = 1, steam = 1, cold = 0 } = {}) {
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, mix('#22304f', '#1a2236', cold)], [1, mix('#141d33', '#0e1424', cold)]]); c.fillRect(-120, -120, W + 240, H + 240);
  c.strokeStyle = 'rgba(243,233,210,0.045)'; c.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const y = -80 + i * 72; c.beginPath(); for (let x = -120; x <= W + 120; x += 30) c.lineTo(x, y + Math.sin(x * 0.012 + i * 1.7) * 7 + Math.sin(x * 0.05 + i) * 2); c.stroke(); }
  if (lamp > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 130, 200, 30, 620, [[0, rgba(P.amber, 0.3 * lamp)], [0.5, rgba(P.amber, 0.09 * lamp)], [1, rgba(P.amber, 0)]]); c.fillRect(-120, -120, W + 240, H + 240); c.restore(); }
  // notebook + pen (bottom left)
  c.save(); c.translate(64, 830); c.rotate(0.2);
  rr(c, -120, -150, 230, 290, 10); fs(c, mix(P.cream, '#9aa3b5', cold * 0.5), 2.6);
  c.strokeStyle = rgba(P.navy, 0.18); c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-100, -110 + i * 30); c.lineTo(95, -110 + i * 30); c.stroke(); }
  strokeW(c, [[-90, -95], [-30, -100], [10, -92], [60, -98]], t, rgba(P.coral, 0.8), 3, 0.8, 5);
  c.restore();
  c.save(); c.translate(210, 900); c.rotate(-0.7); rr(c, -70, -6, 140, 12, 6); fs(c, P.amber, 2.4); rr(c, 52, -6, 18, 12, 4); fs(c, P.greyD, 2.4); c.restore();
  // the mug (top right), steam while it's warm
  c.save(); c.translate(445, 150);
  ell(c, 8, 12, 62, 60); c.fillStyle = 'rgba(5,8,20,0.35)'; c.fill();
  rr(c, 46, -14, 40, 28, 12); fs(c, mix(P.cream, '#9aa3b5', cold * 0.5), 2.6);
  circ(c, 0, 0, 56); fs(c, mix(P.cream, '#9aa3b5', cold * 0.5), 2.8);
  circ(c, 0, 0, 44); fs(c, mix('#5a3a28', '#2a2228', cold), 2);
  ell(c, -12, -14, 14, 7, -0.6); c.fillStyle = 'rgba(255,230,190,0.18)'; c.fill();
  c.restore();
  if (steam > 0) for (let i = 0; i < 3; i++) { const ph = t * 0.35 + i * 0.33, k = ph % 1, x0 = 432 + i * 13, y0 = 150 - k * 120; c.save(); c.globalAlpha = steam * Math.sin(k * Math.PI) * 0.3; c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + 16, y0 - 18, x0 - 16, y0 - 34, x0 + 4, y0 - 52); c.strokeStyle = P.creamL; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); c.restore(); }
}
// the phone's lock screen; buzz 0..1 = notifications still arriving, gone 0..1 = they've all disappeared
const NOTES = [
  ['Squad 🔥', 'Kabir: भाई, तू फिर शुरू हो गया 😂', P.amber],
  ['Squad 🔥', 'Neha: आरव, बस कर यार...', P.amber],
  ['Riya · ऑफ़िस', 'ठीक है, जैसा तुम कहो।', P.coral],
  ['मम्मी', 'खाना खाया?', P.teal],
];
function lockScreen(c, sw, sh, t, shown, gone, dark = 0) {
  c.fillStyle = lin(c, 0, 0, sw, sh, [[0, '#1d7166'], [0.55, '#1c2b4b'], [1, '#0b1428']]); c.fillRect(0, 0, sw, sh);
  c.save(); c.globalAlpha = 0.25; circ(c, sw * 0.85, sh * 0.2, sw * 0.5); c.fillStyle = P.tealL; c.fill(); circ(c, sw * 0.1, sh * 0.85, sw * 0.45); c.fillStyle = P.coral; c.fill(); c.restore();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = P.creamL;
  c.font = `300 ${sw * 0.25}px "Segoe UI", ${FONT}`; c.fillText('11:48', sw / 2, sh * 0.17);
  c.font = `600 ${sw * 0.055}px ${FONT}`; c.fillStyle = rgba(P.creamL, 0.85); c.fillText('बुधवार, 17 नवंबर', sw / 2, sh * 0.255);
  // notification cards
  const cw = sw * 0.9, chh = sh * 0.095;
  NOTES.forEach(([app, msg, col], i) => {
    const k = clamp(shown - i), out = clamp(gone * 1.6 - i * 0.18);
    if (k <= 0 || out >= 1) return;
    const y = sh * 0.33 + i * (chh + sh * 0.014) - ease.in(out) * sh * 0.25;
    c.save(); c.globalAlpha = ease.out(clamp(k * 2)) * (1 - out); c.translate(sw / 2, y + chh / 2); const s = 0.9 + 0.1 * ease.back(clamp(k * 1.5)); c.scale(s, s); c.translate(-sw / 2, -(y + chh / 2));
    rr(c, (sw - cw) / 2, y, cw, chh, sw * 0.04); c.fillStyle = 'rgba(243,233,210,0.93)'; c.fill();
    circ(c, (sw - cw) / 2 + chh * 0.45, y + chh / 2, chh * 0.24); c.fillStyle = col; c.fill();
    c.textAlign = 'left'; c.fillStyle = P.navy; c.font = `800 ${sw * 0.047}px ${FONT}`; c.fillText(app, (sw - cw) / 2 + chh * 0.85, y + chh * 0.33);
    c.font = `600 ${sw * 0.046}px ${FONT}`; c.fillStyle = '#33405e'; c.fillText(msg, (sw - cw) / 2 + chh * 0.85, y + chh * 0.69);
    c.textAlign = 'right'; c.font = `600 ${sw * 0.036}px ${FONT}`; c.fillStyle = P.greyD; c.fillText('अभी', sw - (sw - cw) / 2 - 10, y + chh * 0.33);
    c.restore();
  });
  if (shown > 4.2 && gone <= 0) { const k = clamp(shown - 4.2); c.save(); c.globalAlpha = k; rr(c, sw * 0.28, sh * 0.33 + 4 * (chh + sh * 0.014), sw * 0.44, chh * 0.5, chh * 0.25); c.fillStyle = 'rgba(243,233,210,0.85)'; c.fill(); c.fillStyle = P.navy; c.textAlign = 'center'; c.font = `800 ${sw * 0.045}px ${FONT}`; c.fillText('+38 नए मैसेज', sw / 2, sh * 0.33 + 4 * (chh + sh * 0.014) + chh * 0.25); c.restore(); }
  if (gone > 0.5) { c.save(); c.globalAlpha = clamp((gone - 0.5) * 2); c.textAlign = 'center'; c.fillStyle = rgba(P.creamL, 0.6); c.font = `600 ${sw * 0.05}px ${FONT}`; c.fillText('कोई नई सूचना नहीं', sw / 2, sh * 0.5); c.restore(); }
  if (dark > 0) { c.fillStyle = `rgba(4,6,14,${dark})`; c.fillRect(0, 0, sw, sh); }
}
// a living room at night (the sofa where Aarav argues in the group chat)
function livingRoom(c, t, camX = 0) {
  c.fillStyle = lin(c, 0, 0, 0, 720, [[0, '#17233f'], [1, '#22345a']]); c.fillRect(-200, -100, W + 400, 820);
  c.strokeStyle = 'rgba(243,233,210,0.04)'; c.lineWidth = 2; for (let x = -200; x < W + 200; x += 46) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, 720); c.stroke(); }
  // window with the city (parallax)
  c.save(); rr(c, 330, 120, 190, 250, 8); c.clip();
  c.fillStyle = lin(c, 0, 120, 0, 370, [[0, '#0b1428'], [1, '#2a3d63']]); c.fillRect(300, 100, 260, 300);
  layer(c, 0.25, camX, () => { const r = rng(7); for (let i = 0; i < 9; i++) { const bx = 300 + i * 30, bh = 60 + r() * 120; c.fillStyle = '#101a30'; c.fillRect(bx, 370 - bh, 26, bh); for (let w = 0; w < 6; w++) if (r() < 0.45) { c.fillStyle = rgba(P.amber, 0.7); c.fillRect(bx + 5 + (w % 2) * 10, 370 - bh + 10 + Math.floor(w / 2) * 16, 5, 7); } } });
  c.restore();
  rr(c, 330, 120, 190, 250, 8); fs(c, null, 5, '#3a4a6a'); thick2(c, [[425, 120], [425, 370]], 4, '#3a4a6a'); thick2(c, [[330, 245], [520, 245]], 4, '#3a4a6a');
  // a framed print
  c.save(); c.translate(150, 230); rr(c, -70, -85, 140, 170, 4); fs(c, P.cream, 3); rr(c, -56, -71, 112, 142, 2); fs(c, P.navyL, 0); circ(c, -10, -20, 30); fs(c, P.amber, 0); poly(c, [[-56, 71], [0, 0], [30, 30], [56, 0], [56, 71]]); fs(c, P.teal, 0); c.restore();
  // floor lamp glow (left)
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 40, 330, 10, 380, [[0, rgba(P.amber, 0.3)], [1, rgba(P.amber, 0)]]); c.fillRect(-200, -100, W + 400, H + 200); c.restore();
  thick2(c, [[40, 340], [40, 720]], 6, '#3a4a6a'); poly(c, [[10, 300], [70, 300], [56, 350], [24, 350]]); fs(c, P.amberL, 2.6);
  // floor
  c.fillStyle = lin(c, 0, 720, 0, H, [[0, '#2a2f45'], [1, '#141a2b']]); c.fillRect(-200, 720, W + 400, 400);
  c.strokeStyle = P.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, 720); c.lineTo(W + 200, 720); c.stroke();
}
function sofaBack(c) { cel(c, () => { c.beginPath(); c.roundRect(-40, 560, 470, 190, 34); }, '#5d6880', SH('#5d6880'), [6, 8], 3); }
function sofaSeat(c) { cel(c, () => { c.beginPath(); c.roundRect(-40, 722, 470, 100, 22); }, '#6a7690', SH('#6a7690'), [5, 10], 3); }
function sofaArm(c) { cel(c, () => { c.beginPath(); c.roundRect(380, 640, 80, 182, 30); }, '#56617a', SH('#56617a'), [6, 8], 3); }
function thick2(c, pts, w, col) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
// the office meeting room
function office(c, t, camX, chartK, crossP) {
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#4a5570'], [1, '#6f7b94']]); c.fillRect(-300, -100, W + 700, 760);
  // a wide window with the evening city (parallax)
  c.save(); rr(c, 300, 90, 460, 300, 6); c.clip();
  c.fillStyle = lin(c, 0, 90, 0, 390, [[0, '#1c2b4b'], [0.7, '#5d4a6a'], [1, '#cc8424']]); c.fillRect(280, 80, 500, 320);
  layer(c, -0.35, camX, () => { const r = rng(12); for (let i = 0; i < 16; i++) { const bx = 290 + i * 32, bh = 70 + r() * 170; c.fillStyle = '#16213a'; c.fillRect(bx, 390 - bh, 28, bh); for (let w = 0; w < 8; w++) if (r() < 0.4) { c.fillStyle = rgba(P.amberL, 0.75); c.fillRect(bx + 5 + (w % 2) * 11, 390 - bh + 12 + Math.floor(w / 2) * 18, 6, 8); } } });
  c.restore();
  rr(c, 300, 90, 460, 300, 6); fs(c, null, 6, '#2c3650'); for (const x of [453, 606]) thick2(c, [[x, 90], [x, 390]], 5, '#2c3650');
  // the wall screen with Riya's plan
  c.save(); c.translate(150, 250);
  rr(c, -135, -95, 270, 180, 8); fs(c, '#0f1830', 4);
  rr(c, -124, -84, 248, 158, 4); fs(c, P.creamL, 0);
  words(c, 'नया प्लान · Q3', -2, -64, 17, { col: P.navy, ol: false });
  [0.45, 0.62, 0.8, 1].forEach((v, i) => { const bh = 100 * v * ease.out(clamp(chartK * 1.4 - i * 0.15)); rr(c, -96 + i * 50, 62 - bh, 34, bh, 3); fs(c, i === 3 ? P.coral : P.amber, 2); });
  strokeW(c, [[-100, 30], [-40, 10], [20, -10], [90, -40]].slice(0, 1 + Math.floor(clamp(chartK * 1.3) * 3.99)), t, P.teal, 3.5, 0.6, 21);
  if (crossP > 0) accent(c, 'x', 0, -10, 95, t, { col: P.coral, p: crossP, lw: 5, seed: 8 });
  c.restore();
  // floor
  c.fillStyle = lin(c, 0, 640, 0, H, [[0, '#2a3046'], [1, '#161b2b']]); c.fillRect(-300, 640, W + 700, 420);
  c.strokeStyle = P.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-300, 640); c.lineTo(W + 400, 640); c.stroke();
}
function meetingTable(c) {
  cel(c, () => { c.beginPath(); c.moveTo(150, 640); c.lineTo(620, 640); c.lineTo(660, 700); c.lineTo(110, 700); c.closePath(); }, '#2c3650', SH('#2c3650'), [0, 6], 3);
  cel(c, () => { c.beginPath(); c.rect(118, 700, 534, 18); }, '#1c2440', SH('#1c2440'), [0, 4], 3);
  // laptops / cups on it
  c.save(); c.translate(250, 650); poly(c, [[-30, 0], [30, 0], [24, -40], [-24, -40]]); fs(c, P.greyD, 2.4); c.restore();
  ell(c, 520, 660, 12, 5); fs(c, P.cream, 2); rr(c, 508, 640, 24, 20, 3); fs(c, P.cream, 2.2);
}
// the kitchen at home
function kitchen(c, t) {
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#e9dcbf'], [1, '#f3e9d2']]); c.fillRect(-100, -100, W + 200, 760);
  c.strokeStyle = 'rgba(20,33,61,0.08)'; c.lineWidth = 1.5; for (let y = 330; y < 560; y += 30) { c.beginPath(); c.moveTo(-100, y); c.lineTo(W + 100, y); c.stroke(); } for (let x = -100; x < W + 100; x += 30) { c.beginPath(); c.moveTo(x, 330); c.lineTo(x, 560); c.stroke(); }
  // upper cabinets (navy) + window
  for (let i = 0; i < 4; i++) { cel(c, () => { c.beginPath(); c.roundRect(-20 + i * 120, 70, 110, 200, 6); }, P.navyM, SH(P.navyM), [4, 6], 3); circ(c, 70 + i * 120, 230, 5); fs(c, P.amber, 1.5); }
  // the pendant lamp + glow
  thick2(c, [[300, -20], [300, 300]], 3, P.ink); poly(c, [[262, 300], [338, 300], [322, 270], [278, 270]]); fs(c, P.amber, 2.4);
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 300, 320, 10, 420, [[0, rgba(P.amberL, 0.35)], [1, rgba(P.amberL, 0)]]); c.fillRect(-100, -100, W + 200, H + 200); c.restore();
  // counter
  cel(c, () => { c.beginPath(); c.rect(-40, 560, W + 80, 26); }, P.greyL, SH(P.greyL), [0, 6], 3);
  cel(c, () => { c.beginPath(); c.rect(-40, 586, W + 80, 120); }, P.navyM, SH(P.navyM), [0, 8], 3);
  // a steel pot + a bowl of curd on the counter
  c.save(); c.translate(70, 540); rr(c, -34, -36, 68, 40, 6); fs(c, P.greyL, 2.6); thick2(c, [[-44, -26], [-34, -26]], 5, P.greyD); c.restore();
  ell(c, 230, 552, 30, 9); fs(c, P.creamL, 2.4); c.beginPath(); c.ellipse(230, 552, 30, 22, 0, 0, Math.PI); fs(c, P.teal, 2.4);
  c.fillStyle = lin(c, 0, 700, 0, H, [[0, '#5d6880'], [1, '#2a3046']]); c.fillRect(-100, 706, W + 200, 300);
}
// a dusk street for the montage, in layers (parallax)
function street(c, t, camX) {
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#14213d'], [0.65, '#3a3f63'], [1, '#c98a52']]); c.fillRect(0, 0, W, 700);
  layer(c, 0.12, camX, () => { const r = rng(31); for (let i = -2; i < 30; i++) { const bx = i * 44, bh = 90 + r() * 150; c.fillStyle = '#28324f'; c.fillRect(bx, 560 - bh, 40, bh + 100); } });
  layer(c, 0.45, camX, () => { const r = rng(44); for (let i = -2; i < 34; i++) { const bx = i * 90, bh = 160 + r() * 160, col = ['#3a4566', '#4a5570', '#5d6880'][i % 3 < 0 ? 0 : i % 3]; c.beginPath(); c.rect(bx, 640 - bh, 84, bh); fs(c, col, 2.4); for (let w = 0; w < 10; w++) if (r() < 0.5) { c.beginPath(); c.rect(bx + 12 + (w % 3) * 22, 640 - bh + 16 + Math.floor(w / 3) * 34, 12, 18); fs(c, r() < 0.6 ? rgba(P.amberL, 0.85) : '#24304d', 0); } } });
  // pavement
  c.fillStyle = '#8d99ae'; c.fillRect(0, 640, W, 230); c.fillStyle = '#7a869c'; c.fillRect(0, 640, W, 14);
  layer(c, 1, camX, () => { c.strokeStyle = 'rgba(20,26,43,0.35)'; c.lineWidth = 2; for (let x = -100; x < 3000; x += 70) { c.beginPath(); c.moveTo(x, 654); c.lineTo(x - 30, 870); c.stroke(); }
    for (let x = 60; x < 3000; x += 300) { thick2(c, [[x, 650], [x, 300]], 8, '#1c2440'); thick2(c, [[x, 300], [x + 40, 300]], 6, '#1c2440'); ell(c, x + 44, 306, 16, 8); fs(c, P.amberL, 2); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x + 44, 320, 5, 160, [[0, rgba(P.amber, 0.35)], [1, rgba(P.amber, 0)]]); c.fillRect(x - 140, 260, 380, 520); c.restore(); } });
  c.fillStyle = '#2a3046'; c.fillRect(0, 870, W, 100);
}
// a bedroom at night
function bedroom(c, t, camX = 0) {
  c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#0b1428'], [1, '#17233f']]); c.fillRect(-200, -100, W + 400, 820);
  c.save(); rr(c, 300, 110, 210, 300, 6); c.clip();
  c.fillStyle = lin(c, 0, 110, 0, 410, [[0, '#070d1c'], [1, '#1c2b4b']]); c.fillRect(280, 100, 250, 330);
  circ(c, 455, 170, 26); c.fillStyle = '#e9e4d2'; c.fill();
  layer(c, 0.3, camX, () => { const r = rng(3); for (let i = 0; i < 9; i++) { const bx = 290 + i * 27, bh = 50 + r() * 150; c.fillStyle = '#0c1426'; c.fillRect(bx, 410 - bh, 24, bh); for (let w = 0; w < 6; w++) if (r() < 0.35) { c.fillStyle = rgba(P.amber, 0.6); c.fillRect(bx + 4 + (w % 2) * 9, 410 - bh + 10 + Math.floor(w / 2) * 15, 5, 6); } } });
  c.restore();
  rr(c, 300, 110, 210, 300, 6); fs(c, null, 5, '#24304d'); thick2(c, [[405, 110], [405, 410]], 4, '#24304d');
  // moonlight on the floor/wall
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 400, 260, 20, 360, [[0, 'rgba(140,170,230,0.14)'], [1, 'rgba(140,170,230,0)']]); c.fillRect(-200, -100, W + 400, H + 200); c.restore();
  c.fillStyle = lin(c, 0, 700, 0, H, [[0, '#1a2236'], [1, '#0b1020']]); c.fillRect(-200, 700, W + 400, 300);
}
function bed(c) {
  cel(c, () => { c.beginPath(); c.roundRect(-60, 600, 420, 120, 18); }, '#5d6880', SH('#5d6880'), [4, 10], 3);
  cel(c, () => { c.beginPath(); c.roundRect(-60, 712, 420, 70, 8); }, '#2c3650', SH('#2c3650'), [0, 6], 3);
  cel(c, () => { c.beginPath(); c.roundRect(-40, 560, 120, 60, 22); }, P.creamD, SH(P.creamD), [4, 6], 3);
}
// a chat app screen
function chatScreen(c, sw, sh, t, o) {
  c.fillStyle = '#0f1830'; c.fillRect(0, 0, sw, sh);
  c.save(); c.globalAlpha = 0.07; c.strokeStyle = P.creamL; c.lineWidth = 2; const r = rng(5); for (let i = 0; i < 26; i++) { const x = r() * sw, y = r() * sh; c.beginPath(); c.arc(x, y, 6 + r() * 8, 0, Math.PI * 1.4); c.stroke(); } c.restore();
  // header
  c.fillStyle = P.navyM; c.fillRect(0, 0, sw, sh * 0.125); c.strokeStyle = P.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(0, sh * 0.125); c.lineTo(sw, sh * 0.125); c.stroke();
  avatar(c, sw * 0.17, sh * 0.088, sh * 0.026, 'S', P.amber, { txt: P.navy });
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = P.creamL; c.font = `800 ${sw * 0.055}px ${FONT}`; c.fillText('Squad 🔥', sw * 0.26, sh * 0.077);
  c.font = `600 ${sw * 0.04}px ${FONT}`; c.fillStyle = rgba(P.creamL, 0.65); c.fillText(o.members, sw * 0.26, sh * 0.103);
  strokeW(c, [[sw * 0.08, sh * 0.073], [sw * 0.05, sh * 0.088], [sw * 0.08, sh * 0.103]], 0, P.creamL, 3, 0, 1);
  o.body(c, sw, sh);
  // input bar
  c.fillStyle = P.navyM; c.fillRect(0, sh * 0.915, sw, sh * 0.085);
  rr(c, sw * 0.04, sh * 0.928, sw * 0.76, sh * 0.058, sh * 0.03); c.fillStyle = '#0f1830'; c.fill();
  c.fillStyle = rgba(P.creamL, 0.45); c.font = `600 ${sw * 0.045}px ${FONT}`; c.fillText(o.typing || 'मैसेज लिखें', sw * 0.09, sh * 0.957);
  circ(c, sw * 0.89, sh * 0.957, sh * 0.03); c.fillStyle = P.teal; c.fill();
}
function sysPill(c, sw, y, text, k) {
  if (k <= 0) return; c.save(); c.globalAlpha = clamp(k * 2); const s = 0.85 + 0.15 * ease.back(clamp(k * 1.6));
  c.font = `700 ${sw * 0.043}px ${FONT}`; const tw = c.measureText(text).width + sw * 0.08;
  c.translate(sw / 2, y); c.scale(s, s); rr(c, -tw / 2, -sw * 0.04, tw, sw * 0.08, sw * 0.04); c.fillStyle = 'rgba(93,104,128,0.55)'; c.fill();
  c.fillStyle = P.creamL; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1); c.restore();
}

// ---------------------------------------------------------------- the reel
export default {
  slug: 'man-who-won-every-argument',
  title: 'वो जो हर बहस जीत जाता था',
  titleOut: 0, noFadeIn: true, endCard: false,
  subY: 690, subStyle: { fill: '#f6efe0', active: P.amber, hot: P.coralL, ol: P.ink, olw: 8, shadow: 'rgba(8,12,28,0.55)' },
  voices: {
    nar: { speaker: 'aditya_hi_conversational', model: 'bulbul:v4-flash', pace: 0.95 },   // a friend telling you about Aarav
    hero: { speaker: 'vaibhav_hi_social', model: 'bulbul:v4-flash', pace: 1.0 },          // Aarav
  },
  bg: P.navy, vignette: 0.5, grain: 0.05,
  grade: { col: '#1c2b4b', amt: 0.12 },
  wipeCols: [P.teal, P.amber, P.coral, P.navy],
  overlay: (c, T) => texture(c, T),
  music: tl => ({ root: 50, scale: 'dorian', prog: [0, 5, 3, 4], chord: 4.4, level: 0.13, duck: 0.3, warmth: 1300, bells: true, pulse: true,
    dyn: [[tl.at('walk').start, 1.1, 0.6], [tl.at('left').start, 0.35, 0.4], [tl.at('room').start, 0.55, 0.8], [tl.at('final').start, 0.9, 0.8], [tl.at('ask').start, 1.0, 0.5]] }),
  ambience: tl => [
    { type: 'room', from: 0, to: tl.total, gain: 0.8 },
    { type: 'crowd', from: tl.at('office').start, to: tl.at('home').start, gain: 0.25 },
    { type: 'city', from: tl.at('walk').start, to: tl.at('left').start, gain: 0.5 },
    { type: 'night', from: tl.at('room').start, to: tl.at('ask').start, gain: 0.5 },
  ],
  cover: { shot: 'chat', at: 0.8 },
  shots: [
    // 0. HOOK — from frame 0: his phone buzzing nonstop on the table... then nothing
    { id: 'hook', min: 4.4, lead: 0.1, tail: 0.6, vo: [{ text: 'आरव ने आज तक एक भी बहस नहीं हारी। || पर आज... उसका फ़ोन बजता ही नहीं।', pace: 0.85 }],
      sfx: [[0, 'vibrate', { n: 2, gap: 0.5, gain: 0.34 }], [0.05, 'notif', {}], [1.0, 'vibrate', { n: 2, gap: 0.5, gain: 0.3 }], [1.05, 'notif', { root: 83 }], [s => wS(s, 0, 'पर', 2.4) - 0.05, 'swish', { gain: 0.2 }]],
      draw(c, t, S) {
        const quiet = wD(S, 0, 'पर', 2.4), gone = E(t, quiet, quiet + 0.7), buzz = t < quiet ? 1 : 0;
        const bz = buzz && (t % 0.5) < 0.32 ? 1 : 0, jx = bz * Math.sin(t * 160) * 2.2, jy = bz * Math.cos(t * 140) * 1.6;
        c.save(); cam(c, { z: lerp(1.0, 1.1, E(t, 0, S.dur, ease.out)) * (1 + 0.03 * E(t, quiet, quiet + 0.4)), y: 470 });
        tableTop(c, t, { lamp: lerp(1, 0.55, gone), steam: 1 });
        phone(c, 270 + jx, 420 + jy, 270, (cc, sw, sh) => lockScreen(cc, sw, sh, t, 1 + t * 3.2, gone), { rot: -0.08 });
        if (bz) { accent(c, 'vibe', 270 + jx - 160, 300, 46, t, { col: P.amberL, seed: 3 }); accent(c, 'vibe', 270 + jx + 160, 560, 46, t, { col: P.amberL, seed: 4 }); }
        c.restore();
      } },
    // 1. THE GROUP CHAT — he argues with everyone, smirking, on the sofa (the phone grows into the room)
    { id: 'chat', min: 5, tr: 'shape', trShape: 'phone', trAt: [270, 420], trd: 0.55, trCol: P.amber, lead: 0.2,
      vo: [{ text: 'ग्रुप में कोई कुछ भी लिखे, आरव उसे *ग़लत* साबित कर देता।', pace: 0.85 }],
      sfx: [[0.25, 'notif', { root: 79 }], [s => wS(s, 0, 'आरव', 1.4) - 0.1, 'typing', { n: 10 }], [s => wS(s, 0, 'आरव', 1.4) + 0.35, 'sent', {}], [s => wS(s, 0, 'आरव', 1.4) + 0.75, 'sent', {}], [s => wS(s, 0, 'आरव', 1.4) + 1.15, 'sent', {}], [s => wS(s, 0, 'आरव', 1.4) + 1.55, 'smear', { gain: 0.25 }], [s => wS(s, 0, 'आरव', 1.4) + 1.6, 'sent', {}], [s => wS(s, 0, 'ग़लत', 3) + 0.5, 'notif', { root: 76, gain: 0.7 }]],
      draw(c, t, S) {
        const t0 = wD(S, 0, 'आरव', 1.4), camX = t * 6;
        c.save(); cam(c, { z: lerp(1.08, 1.2, E(t, 0, S.dur, ease.inOut)), x: 250 + camX, y: 520 });
        livingRoom(c, t, camX);
        sofaBack(c); sofaSeat(c);
        const flick = t > t0 + 1.5 && t < t0 + 1.75;
        const pose = tt => ({ sit: 30, lean: 0.1, headTilt: 0.12, armF: tt > t0 + 1.5 && tt < t0 + 1.75 ? [2.3, 0.3] : [0.75, 1.75 + Math.sin(tt * 30) * (tt > t0 - 0.1 && tt < t0 + 1.5 ? 0.05 : 0)], armB: [0.32, 1.85], handF: 'phone' });
        const Pn = { x: 150, y: 830, h: 430, t, face: { expr: 'smug', look: [0.5, 0.9] }, pose: pose(t), prop: { type: 'phone', on: true, facing: 'away', rot: -0.4 } };
        person(c, { ...Pn, prev: { ...Pn, pose: pose(t - 1 / 30) } });
        sofaArm(c);
        c.restore();
        // the chat, floating over the room (screen space)
        chat(c, 36, 96, 'मुझे लगता है ये फ़िल्म अच्छी थी 🎬', { name: 'Kabir', pop: seg(t, 0.2, 0.55), size: 16, max: 250, bg: '#2c3a5c', side: 'l' });
        const mine = ['नहीं।', 'IMDb पर 6.1 है।', 'स्क्रीनप्ले कमज़ोर था।', 'तू ग़लत है भाई 😂'];
        mine.forEach((m, i) => chat(c, 505, 180 + i * 54, m, { side: 'r', pop: seg(t, t0 + 0.3 + i * 0.4, t0 + 0.6 + i * 0.4), size: 17, bg: P.teal }));
        if (t > t0 + 1.7) accent(c, 'pop', 512, 350, 26, t, { col: P.amber, a: -0.4, seed: 4, k: 1 - seg(t, t0 + 2.6, t0 + 3) });
        chat(c, 36, 372, 'ठीक है भाई... 😶', { name: 'Kabir', pop: seg(t, wD(S, 0, 'ग़लत', 3) + 0.4, wD(S, 0, 'ग़लत', 3) + 0.7), size: 15, bg: '#2c3a5c', side: 'l' });
      } },
    // 2. THE OFFICE — Riya's plan; "ye nahi chalega" (impact zoom, a scribbled cross over her chart)
    { id: 'office', min: 5.2, tr: 'brush', trd: 0.7, lead: 0.2,
      vo: [{ text: 'ऑफ़िस में, हर आइडिया पर एक ही जवाब...', pace: 0.944 }, { text: 'ये नहीं चलेगा।', voice: 'hero', delay: 0.05, pace: 0.88 }], gap: 0.2,
      sfx: [[s => s.lines[1].a - 0.05, 'impact', { gain: 0.55 }], [s => s.lines[1].a + 0.3, 'scribble', { n: 6, gain: 0.12 }]],
      draw(c, t, S) {
        const tl = S.line(1).a, zap = t >= tl;
        const pan = E(t, 0, Math.max(0.5, tl - 0.1), ease.inOut);
        const z = lerp(1.25, 1.15, pan) * impact(t, tl - 0.04, 0.22), fx = zap ? lerp(lerp(150, 380, pan), 430, E(t, tl - 0.04, tl + 0.25, ease.out)) : lerp(150, 380, pan);
        c.save(); cam(c, { z, x: fx, y: zap ? lerp(520, 480, E(t, tl, tl + 0.3)) : 520 });
        office(c, t, fx - 270, seg(t, 0.2, 1.8), seg(t, tl + 0.15, tl + 0.6));
        person(c, { x: 270, y: 800, h: 410, t, style: RIYA, flip: 1, seed: 2, face: { expr: zap ? 'hurt' : 'happy', talk: !zap && t < tl - 0.3 ? 0.5 : 0, look: zap ? [1, 0.3] : [0.6, 0] }, pose: zap ? { armF: [0.25, 0.3], armB: [-0.1, 0.3], headTilt: 0.06 } : { armF: [0.7, 0.9], armB: [-1.35, 0.15], handB: 'point' } });
        const AP = { x: 470, y: 805, h: 410, t, flip: -1, face: { expr: zap ? 'smug' : 'annoyed', talk: S.speaking(t, 1) ? 0.8 : 0, look: [0.8, 0] }, pose: { sit: 37, lean: zap ? 0.05 : -0.12, armF: zap ? [1.25, 0.15] : [0.3, 1.35], handF: zap ? 'point' : 'open', armB: [0.2, 1.4] } };
        const prevP = { ...AP, pose: { ...AP.pose, armF: t - 1 / 30 >= tl ? [1.25, 0.15] : [0.3, 1.35] } };
        person(c, { ...AP, prev: prevP });
        meetingTable(c);
        // backs of colleagues in the foreground (parallax, darker)
        layer(c, 0.5, fx - 270, () => { for (const [x, s] of [[60, 1], [600, 1.1]]) { c.save(); c.translate(x, 960); c.scale(s, s); blob(c, [[-90, 0], [-80, -110], [-40, -150], [40, -150], [80, -110], [90, 0]]); fs(c, '#141b2e', 3); circ(c, 0, -190, 48); fs(c, '#141b2e', 3); c.restore(); } });
        if (zap) accent(c, 'pop', 470, 440, 34, t, { col: P.coral, a: -Math.PI / 2, seed: 2, k: 1 - seg(t, tl + 0.8, tl + 1.3) });
        c.restore();
      } },
    // 3. HOME — Mom says something; he flicks his phone in her face (smear frame), search result: "myth"
    { id: 'home', min: 5, tr: 'brush', trd: 0.7, lead: 0.2,
      vo: [{ text: 'मम्मी कुछ कहतीं, तो गूगल खोलकर दिखा देता।', pace: 0.85 }],
      sfx: [[s => wS(s, 0, 'गूगल', 2) - 0.1, 'smear', { gain: 0.3 }], [s => wS(s, 0, 'गूगल', 2) + 0.15, 'tap', {}], [s => wS(s, 0, 'गूगल', 2) + 0.35, 'pop', { f: 420, gain: 0.22 }]],
      draw(c, t, S) {
        const tg = wD(S, 0, 'गूगल', 2) - 0.1, out = t > tg;
        c.save(); cam(c, { z: lerp(1.1, 1.18, E(t, 0, S.dur)) * impact(t, tg + 0.1, 0.08), x: lerp(250, 290, E(t, 0, S.dur)), y: 500 });
        kitchen(c, t);
        person(c, { x: 150, y: 830, h: 400, t, style: MOM, seed: 5, face: { expr: out ? 'hurt' : 'happy', talk: !out && t > 0.2 ? 0.55 : 0, look: out ? [0.6, 0.2] : [1, 0] }, pose: out ? { armF: [0.15, 0.4], headTilt: 0.05 } : { armF: [0.9, 0.9], armB: [0.2, 0.6] } });
        const armAt = tt => tt > tg ? [lerp(0.35, 1.5, ease.out(seg(tt, tg, tg + 0.12))), lerp(1.4, 0.15, ease.out(seg(tt, tg, tg + 0.12)))] : [0.35, 1.4];
        const AP = { x: 410, y: 835, h: 420, t, flip: -1, face: { expr: out ? 'smug' : 'annoyed', look: [1, 0] }, pose: { armF: armAt(t), handF: 'phone', lean: out ? 0.06 : 0 }, prop: { type: 'phone', on: true, facing: out ? 'me' : 'away', rot: out ? 0 : -0.3 } };
        person(c, { ...AP, prev: { ...AP, pose: { ...AP.pose, armF: armAt(t - 1 / 30) } } });
        // mom's speech bubble (illustrated), it shrinks away when the phone comes out
        const bk = seg(t, 0.25, 0.6) * (1 - seg(t, tg + 0.1, tg + 0.45));
        if (bk > 0) { c.save(); c.translate(210, 300); c.scale(ease.back(bk), ease.back(bk)); c.globalAlpha = clamp(bk * 2); blob(c, [[-120, -40], [0, -62], [120, -40], [128, 22], [40, 50], [0, 92], [-12, 52], [-120, 34]]); fs(c, P.creamL, 3); words(c, ['रात को दही', 'नहीं खाते, बेटा...'], 0, -2, 21, { col: P.navy, ol: false, lh: 1.25 }); c.restore(); }
        // the search result card pops out of his phone
        const rk = seg(t, tg + 0.2, tg + 0.55);
        if (rk > 0) { const [hx, hy] = handAt(AP, 'F'); c.save(); c.translate(hx - 30, hy - 190); c.scale(ease.back(rk), ease.back(rk)); c.rotate(-0.04);
          rr(c, -110, -70, 220, 140, 14); fs(c, P.creamL, 3);
          rr(c, -96, -56, 192, 34, 17); fs(c, '#ffffff', 2); words(c, '🔍 रात को दही', -18, -39, 14, { col: P.greyD, ol: false });
          words(c, 'मिथक!', 0, 4, 30, { col: P.coral, ol: false }); words(c, 'नया रिसर्च कहता है...', 0, 44, 14, { col: P.navy, ol: false });
          c.restore(); accent(c, 'pop', hx - 30, hy - 270, 28, t, { col: P.amber, seed: 7, k: 1 - seg(t, tg + 1.2, tg + 1.8) }); }
        c.restore();
      } },
    // 4. "देखा? मैं ग़लत हो ही नहीं सकता।" — close-up, impact zoom, graphic background
    { id: 'smug', min: 2.8, tr: 'cut', lead: 0.12, vo: [{ text: 'देखा? | मैं *ग़लत* हो ही नहीं सकता।', voice: 'hero', pace: 0.88 }],
      sfx: [[0.02, 'impact', { gain: 0.45 }], [0.2, 'sparkle', { gain: 0.6 }]],
      draw(c, t, S) {
        c.fillStyle = P.navy; c.fillRect(0, 0, W, H);
        c.save(); c.translate(270, 330); c.rotate(t * 0.15); for (let i = 0; i < 14; i++) { c.rotate(TAU14); poly(c, [[0, 0], [700, -60], [700, 60]]); c.fillStyle = i % 2 ? rgba(P.amber, 0.13) : rgba(P.teal, 0.08); c.fill(); } c.restore();
        c.save(); cam(c, { z: impact(t, 0, 0.18) * lerp(1, 1.05, S.p), y: 480 });
        person(c, { x: 210, y: 1500, h: 1250, t, seed: 1, face: { expr: 'smug', talk: S.speaking(t, 0) ? 0.85 : 0, look: [0.7, -0.1] }, pose: { shrug: E(t, 0.1, 0.4) * (1 - E(t, 1.6, 2.1)), headTilt: -0.06, armF: [0.55, 1.2 + 0.25 * E(t, 0.1, 0.4)], handF: 'open' }, shadow: false });
        c.restore();
        accent(c, 'sparkle', 430, 230, 22, t, { col: P.amberL, k: seg(t, 0.25, 0.45) });
        accent(c, 'sparkle', 90, 170, 14, t + 0.5, { col: P.tealL, k: seg(t, 0.4, 0.6) });
        accent(c, 'pop', 400, 330, 40, t, { col: P.amber, a: -0.6, seed: 9, k: seg(t, 0.1, 0.3) });
      } },
    // 5. THE WALK — he keeps winning; the people he passes turn away and fade to grey (pan + parallax)
    { id: 'walk', min: 5.6, tr: 'brush', trd: 0.7, lead: 0.2, vo: [{ text: 'वो हर बहस जीतता गया... || और लोग, चुपचाप *दूर* होते गए।', pace: 0.923 }],
      sfx: [[0.1, 'steps', { n: 12, gap: 0.42, gain: 0.18, f: 900 }], ...[0, 1, 2, 3].map(i => [1.05 + i * 1.05, 'whoosh', { f: 300, f2: 900, dur: 0.5, gain: 0.14 }]), ...[0, 1, 2, 3].map(i => [1.1 + i * 1.05, 'chime', { notes: [[76], [79], [81], [83]][i], gain: 0.6 }])],
      draw(c, t, S) {
        const camX = t * 95, ax = 190 + camX;
        street(c, t, camX);
        c.save(); c.translate(-camX, 0);
        const cast = [[KABIR, 460], [RIYA, 560 + 95], [MOM, 660 + 190], [NEHA, 760 + 285]];
        let wins = 46;
        cast.forEach(([st, wx], i) => {
          const pass = 1.05 + i * 1.05, k = E(t, pass, pass + 0.6);
          if (t > pass) wins++;
          person(c, { x: wx, y: 820, h: 360, t, seed: i, flip: k > 0.5 ? 1 : -1, style: k > 0.5 ? GHOST(st) : st, alpha: 1 - k * 0.45, face: { expr: k > 0.2 ? 'hurt' : 'neutral', look: [k > 0.5 ? -1 : 1, 0] }, pose: { headTilt: k * 0.12, shrug: k * 0.4 } });
        });
        person(c, { x: ax, y: 830, h: 380, t, face: { expr: 'confident', look: [1, 0] }, pose: { ...walk(t * 6.4, 0.9), lean: 0.04 } });
        c.restore();
        layer(c, 1.6, camX, () => { for (let x = 0; x < 3200; x += 210) { c.beginPath(); c.roundRect(x, 880, 26, 120, 6); fs(c, '#0f1528', 2); } thick2(c, [[-50, 900], [3300, 900]], 10, '#0f1528'); });
        // the score
        c.save(); rr(c, 150, 70, 240, 54, 27); fs(c, 'rgba(12,20,40,0.82)', 2.6); words(c, `🏆 जीती बहसें: ${wins}`, 270, 98, 22, { col: P.amber, ol: false }); c.restore();
        const gone = cast.filter((_, i) => t > 1.05 + i * 1.05).length;
        for (let i = 0; i < 4; i++) avatar(c, 210 + i * 40, 152, 15, ['K', 'R', 'M', 'N'][i], i < gone ? P.greyD : [P.greyL, P.coral, P.amber, P.tealL][i], { txt: P.navy, alpha: i < gone ? 0.45 : 1 });
      } },
    // 6. THE GROUP GOES QUIET — "... left" x3 (the phone again, match-cut)
    { id: 'left', min: 4.2, tr: 'shape', trShape: 'circle', trAt: [270, 470], trd: 0.5, trCol: P.coral, lead: 0.2, vo: [{ text: 'फिर एक दिन, ग्रुप *शांत* हो गया।', pace: 0.825 }],
      sfx: [[0.5, 'pop', { f: 260, gain: 0.2 }], [1.1, 'pop', { f: 240, gain: 0.2 }], [1.7, 'pop', { f: 220, gain: 0.2 }], [2.5, 'typing', { n: 7 }], [3.25, 'sent', {}]],
      draw(c, t, S) {
        c.fillStyle = P.navyD; c.fillRect(0, 0, W, H);
        c.save(); cam(c, { z: lerp(1.0, 1.06, S.p), y: 470 });
        const n = [0.5, 1.1, 1.7].filter(x => t > x).length;
        phone(c, 270, 440, 330, (cc, sw, sh) => chatScreen(cc, sw, sh, t, {
          members: ['आप, Kabir, Neha, Riya', 'आप, Neha, Riya', 'आप, Riya', 'सिर्फ़ आप'][n],
          typing: t > 2.5 && t < 3.2 ? 'कहाँ हो सब? 😅'.slice(0, Math.floor((t - 2.5) * 22)) : null,
          body: (c2, sw2, sh2) => {
            c2.save(); c2.globalAlpha = 0.45;
            chat(c2, sw2 * 0.95, sh2 * 0.14, 'और वैसे भी, मैं सही था 🙂', { side: 'r', size: 13, bg: P.tealD, meta: '11:02 ✓✓', max: sw2 * 0.7 });
            chat(c2, sw2 * 0.05, sh2 * 0.23, 'ok', { side: 'l', size: 13, name: 'Neha', bg: '#2c3a5c' });
            c2.restore();
            ['Kabir ने ग्रुप छोड़ दिया', 'Neha ने ग्रुप छोड़ दिया', 'Riya ने ग्रुप छोड़ दिया'].forEach((s2, i) => sysPill(c2, sw2, sh2 * (0.37 + i * 0.075), s2, seg(t, [0.5, 1.1, 1.7][i], [0.5, 1.1, 1.7][i] + 0.3)));
            chat(c2, sw2 * 0.95, sh2 * 0.62, 'कहाँ हो सब? 😅', { side: 'r', size: 15, bg: P.teal, meta: '11:48 ✓', pop: seg(t, 3.25, 3.55), max: sw2 * 0.7 });
          } }), { rot: 0 });
        c.restore();
        if (t > 3.6) accent(c, 'q', 455, 300, 26, t, { col: P.coral, k: seg(t, 3.6, 3.9) });
      } },
    // 7. THE TWIST — his room at night, alone with the phone
    { id: 'room', min: 5.6, tr: 'black', trd: 0.7, lead: 0.35, vo: [{ text: 'लोग उससे बहस नहीं करते थे... || क्योंकि अब, वो उससे *बात* ही नहीं करते थे।', pace: 0.83 }],
      sfx: [[0.3, 'tick', { n: 10, gap: 0.6, gain: 0.08 }]],
      draw(c, t, S) {
        const camX = lerp(0, 30, S.p);
        c.save(); cam(c, { z: lerp(1.0, 1.14, E(t, 0, S.dur, ease.inOut)), x: 260 + camX, y: 560 });
        bedroom(c, t, camX);
        bed(c);
        const Pn = { x: 200, y: 850, h: 420, t, seed: 3, face: { expr: 'lonely', look: [0.6, 0.9] }, pose: { sit: 32, lean: 0.24, headTilt: 0.16, armF: [0.55, 1.75], armB: [0.3, 1.9], handF: 'phone' }, prop: { type: 'phone', on: true, facing: 'away', rot: -0.5 } };
        person(c, Pn);
        const [hx, hy] = handAt(Pn, 'F');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, hx + 10, hy - 30, 5, 160, [[0, 'rgba(170,235,225,0.32)'], [1, 'rgba(170,235,225,0)']]); c.fillRect(hx - 200, hy - 220, 400, 400); c.restore();
        c.restore();
      } },
    // 8. CLOSE — "every answer... no one to listen"; he puts the phone face down
    { id: 'close', min: 5, tr: 'fade', trd: 0.6, lead: 0.25, tail: 0.7, vo: [{ text: 'आज आरव के पास, हर बहस का जवाब है... ||| बस, *सुनने* वाला कोई नहीं।', pace: 0.926 }],
      sfx: [[s => s.dur - 1.05, 'thud', { gain: 0.25 }]],
      draw(c, t, S) {
        const down = E(t, S.dur - 1.4, S.dur - 0.9, ease.inOut), on = down < 0.6;
        c.save(); cam(c, { z: lerp(1.0, 1.08, S.p), y: 470 });
        bedroom(c, t, 0); c.fillStyle = 'rgba(4,6,14,0.35)'; c.fillRect(-100, -100, W + 200, H + 200);
        const Pn = { x: 200, y: 1230, h: 950, t, seed: 3, face: { expr: 'lonely', look: [0.6, lerp(0.9, 1, down)] }, pose: { lean: 0.08, headTilt: 0.12 + down * 0.06, armF: [lerp(0.7, 0.2, down), lerp(1.55, 0.4, down)], handF: 'phone' }, prop: { type: 'phone', on, facing: 'away', rot: -0.35 }, shadow: false };
        person(c, Pn);
        if (on) { const [hx, hy] = handAt(Pn, 'F'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, hx, hy - 60, 10, 330, [[0, 'rgba(170,235,225,0.3)'], [1, 'rgba(170,235,225,0)']]); c.fillRect(-100, -100, W + 200, H + 200); c.restore(); }
        c.restore();
      } },
    // 9. THE LINE — back to the table: same phone, same mug... cold now, silent (a bookend match cut)
    { id: 'final', min: 5.6, tr: 'black', trd: 0.8, lead: 0.4, tail: 0.9, vo: [{ text: 'बहस जीतकर, अक्सर हम वही इंसान *हार* जाते हैं... || जिससे बहस कर रहे थे।', pace: 0.88 }],
      sfx: [[0.3, 'piano', { notes: [62, 65, 69], gap: 0.5, gain: 0.55 }]],
      draw(c, t, S) {
        c.save(); cam(c, { z: lerp(1.04, 1.14, E(t, 0, S.dur, ease.out)), y: 470 });
        tableTop(c, t, { lamp: 0.2, steam: 0, cold: 0.6 });
        phone(c, 270, 420, 270, (cc, sw, sh) => lockScreen(cc, sw, sh, t, 0, 1, 0.85), { rot: -0.08 });
        c.restore();
        c.fillStyle = 'rgba(6,10,24,0.25)'; c.fillRect(0, 0, W, H);
      } },
    // 10. THE QUESTION — one simple question to the audience (no subtitles: the question is on screen)
    { id: 'ask', min: 5.2, tr: 'brush', trd: 0.8, lead: 0.4, tail: 1.3, noSubs: true, vo: [{ text: 'आपने आख़िरी बार, सिर्फ़ जीतने के लिए बहस कब की थी? || कमेंट में बताइए।', pace: 0.8 }],
      sfx: [[0.3, 'pop', { f: 330, gain: 0.25 }], [s => wS(s, 0, 'कमेंट', 3), 'notif', { root: 81, gain: 0.8 }]],
      draw(c, t, S) {
        c.fillStyle = P.cream; c.fillRect(0, 0, W, H);
        c.save(); c.globalAlpha = 0.5; for (let i = 0; i < 6; i++) { circ(c, (i * 137) % W, 120 + (i * 211) % 800, 40 + (i % 3) * 30); c.fillStyle = [rgba(P.teal, 0.12), rgba(P.amber, 0.14), rgba(P.coral, 0.1)][i % 3]; c.fill(); } c.restore();
        const k = ease.back(seg(t, 0.15, 0.6));
        c.save(); c.translate(270, 360); c.scale(k, k); c.rotate(-0.025);
        blob(c, [[-230, -150], [0, -175], [230, -150], [245, 0], [230, 140], [40, 160], [-30, 235], [-40, 160], [-230, 140], [-245, 0]]); cel(c, () => blob(c, [[-230, -150], [0, -175], [230, -150], [245, 0], [230, 140], [40, 160], [-30, 235], [-40, 160], [-230, 140], [-245, 0]]), P.navy, P.navyD, [-8, 8], 3.5);
        words(c, ['आपने आख़िरी बार', 'सिर्फ़ जीतने के लिए', 'बहस कब की थी?'], 0, -8, 36, { col: P.creamL, ol: false, lh: 1.32 });
        accent(c, 'underline', 0, 60, 120, t, { col: P.amber, p: seg(t, 1.0, 1.6), lw: 4, seed: 6 });
        c.restore();
        const k2 = seg(t, wD(S, 0, 'कमेंट', 3) - 0.1, wD(S, 0, 'कमेंट', 3) + 0.3);
        if (k2 > 0) { c.save(); c.globalAlpha = k2; c.translate(320, 690); const s = ease.back(k2); c.scale(s, s); rr(c, -150, -32, 300, 64, 32); fs(c, P.amber, 3); words(c, 'कमेंट में बताइए 👇', 0, 1, 26, { col: P.navy, ol: false }); c.restore(); }
        accent(c, 'dots', 320, 770, 30, t, { col: P.teal, k: seg(t, 0.8, 1.1) });
        person(c, { x: 40, y: 1420, h: 820, t, seed: 4, face: { expr: 'neutral', look: [0.6, -0.8] }, pose: { headTilt: -0.12 }, shadow: false, alpha: seg(t, 0.4, 0.8) });
      } },
  ],
};
const TAU14 = Math.PI * 2 / 14;
