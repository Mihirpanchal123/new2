// Live 3D preview: every model of models3d/manifest.json (or a chosen few) through retro3d.js, the exact
// pipeline of Retro 2D battles, in a grid - to check models, framing and animations. Open it via the server:
// http://localhost:8080/tools/live3d-preview.html?from=0&n=48
import * as L from '../retro3d.js';

const q = new URLSearchParams(location.search);
const man = await (await fetch('models3d/manifest.json')).json();
const all = Object.keys(man);
const keys = q.get('keys') ? q.get('keys').split(',') : all.slice(+(q.get('from') || 0), +(q.get('from') || 0) + +(q.get('n') || 48));
const Z = +(q.get('zoom') || 1), CW = 150 * Z, CH = 150 * Z, cols = Math.max(1, Math.min(keys.length, Math.floor((innerWidth - 10) / CW)));
const cv = document.getElementById('c'), g = cv.getContext('2d');
cv.width = cols * CW; cv.height = Math.ceil(keys.length / cols) * CH;
g.imageSmoothingEnabled = false;

const cells = [];
await Promise.all(keys.map(async (k, i) => {
  const t0 = performance.now();
  let live = null, err = null;
  try { live = await L.create(k); } catch (e) { err = e.message; }
  cells[i] = { k, live, err, ms: Math.round(performance.now() - t0), face: 1, moving: false };
}));
window.__ready = true;
window.__errors = cells.filter(c => !c.live).map(c => c.k + ': ' + (c.err || 'no model'));

const act = (kind, style) => { for (const c of cells) if (c.live) c.live.play(kind, style); };
window.__act = act;
window.__set = o => { for (const c of cells) Object.assign(c, o); };
addEventListener('keydown', e => {
  // [kind, Retro move style]
  const k = { 1: ['attack', 'fist'], 2: ['attack', 'kick'], 3: ['attack', 'fang'], 4: ['attack', 'claw'], 5: ['attack', 'charge'], 6: ['attack', 'tail'],
    q: ['special', 'beam'], w: ['special', 'orb'], e: ['special', 'bolt'], r: ['special', 'quake'], g: ['guard', 'shield'], b: ['roar', 'buff'],
    7: ['hurt'], 8: ['roar'], 9: ['win'], d: ['down'] }[e.key];
  if (k) act(...k);
  if (e.key === 'm') for (const c of cells) c.moving = !c.moving;
  if (e.key === 'f') for (const c of cells) c.face = -c.face;
  if (e.key === '0') location.reload();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const lives = cells.filter(c => c && c.live);
  for (const c of lives) c.live.drive(dt, { face: c.face, vx: c.moving ? 120 * c.face : 0, vy: 0, moving: c.moving, sleep: false, frozen: false, slow: false, stagger: !!(c.live.fx && c.live.fx.name === 'stun') });
  L.renderAll(lives.map(c => c.live));
  g.fillStyle = '#2b2d3a'; g.fillRect(0, 0, cv.width, cv.height);
  cells.forEach((c, i) => {
    if (!c) return;
    const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
    g.fillStyle = (i + Math.floor(i / cols)) % 2 ? '#353848' : '#30323f'; g.fillRect(x, y, CW, CH);
    g.fillStyle = '#8fd'; g.fillText(c.k, x + 4, y + 12);
    g.fillStyle = '#99a'; g.fillText(`${man[c.k] ? man[c.k].anim || 'full' : '?'} ${c.ms}ms`, x + 4, y + 24);
    if (!c.live) { g.fillStyle = '#f77'; g.fillText(c.err || 'no model', x + 4, y + 40); return; }
    // at its size in battle (art pixels), clipped to the cell
    const a = c.live.anim, fx = x + CW / 2, fy = y + CH - 10 * Z;
    g.fillStyle = '#667'; g.fillText(`${a.bw}x${a.bh}`, x + CW - 44, y + 12);
    g.save(); g.beginPath(); g.rect(x, y + 26, CW, CH - 26); g.clip();
    g.globalAlpha = 0.32; g.drawImage(c.live.shadow.frames[0].img, fx - a.foot[0] * Z, fy - a.foot[1] * Z, a.w * Z, a.h * Z);
    g.globalAlpha = 1; g.drawImage(a.frames[0].img, fx - a.foot[0] * Z, fy - a.foot[1] * Z, a.w * Z, a.h * Z);
    g.restore();
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
