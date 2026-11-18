// Shared helpers + 3D city engine for the Dholavira films. Needs W, H, TAU, FRAME, CURT defined first.
// ---------- helpers ----------
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eIn = t => Math.pow(clamp(t), 3);
const eInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const prog = (u, a, b) => clamp((u - a) / (b - a));
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${Math.min(255, c[0]) | 0},${Math.min(255, c[1]) | 0},${Math.min(255, c[2]) | 0},${a})`;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
function sky(ctx, stops, h) { const g = ctx.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, h + 50); }
function glow(ctx, x, y, r, col) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
function txt(ctx, s, x, y, size, col = '#fff', align = 'center', weight = 700, outline = 7) {
  ctx.save(); ctx.font = `${weight} ${size}px "Nirmala UI", "Segoe UI", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (col.startsWith('rgba(')) { const k = col.lastIndexOf(','), al = parseFloat(col.slice(k + 1)); if (!(al > 0)) { ctx.restore(); return; } ctx.globalAlpha *= Math.min(1, al); col = col.slice(0, k) + ',1)'; }
  if (outline) { ctx.lineWidth = outline; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, col, lw) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * lw * 2, y2 - Math.sin(a) * lw * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a - .45) * lw * 4, y2 - Math.sin(a - .45) * lw * 4); ctx.lineTo(x2 - Math.cos(a + .45) * lw * 4, y2 - Math.sin(a + .45) * lw * 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function title(ctx, s, y, a, size) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px "Nirmala UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 30; const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, '#fff6dc'); g.addColorStop(.5, '#f5c66a'); g.addColorStop(1, '#c98f2e'); ctx.fillStyle = g; ctx.fillText(s, W / 2, y); ctx.restore();
}
function pill(ctx, s, x, y, size, a, col = 'rgba(255,255,255,.92)', bg = 'rgba(0,0,0,.45)') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `600 ${size}px "Nirmala UI", "Segoe UI", sans-serif`; const w = ctx.measureText(s).width;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2 - size * .7, y - size * .9, w + size * 1.4, size * 1.8, size * .9); ctx.fill();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore();
}

// ---------- textures ----------
const noise = [0, 1, 2, 3].map(s => {
  const c = mk(540, 960), x = c.getContext('2d'), d = x.createImageData(540, 960), r = rng(100 + s);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return c;
});
const fogC = (() => {
  const c = mk(2400, 900), x = c.getContext('2d'), r = rng(77); x.filter = 'blur(38px)';
  for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,255,255,${.22 + r() * .35})`; x.beginPath(); x.ellipse(r() * 2400, 280 + r() * 360, 150 + r() * 380, 50 + r() * 110, 0, 0, TAU); x.fill(); }
  return c;
})();
function fog(ctx, y, alpha, off, scale = 1) {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; const w = 2400 * scale, h = 900 * scale, x0 = mod(off, w) - w;
  for (let x = x0; x < W; x += w) ctx.drawImage(fogC, x, y - h / 2, w, h); ctx.restore();
}
function rain(ctx, u, a) {
  if (a <= 0) return; const r = rng(5); ctx.save(); ctx.strokeStyle = `rgba(210,225,240,${.45 * a})`; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 320; i++) { const sp = 1500 + r() * 900, x = mod(r() * W * 1.3 - u * sp * .25, W * 1.3) - W * .15, y = mod(r() * H - u * -sp, H + 200) - 100, l = 40 + r() * 50; ctx.moveTo(x, y); ctx.lineTo(x - l * .25, y + l); }
  ctx.stroke(); ctx.restore();
}
function dust(ctx, u, n, col, seed = 3) {
  const r = rng(seed); ctx.save(); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = mod(r() * W + u * (12 + r() * 30), W), y = mod(r() * H - u * (6 + r() * 14) + Math.sin(u + i) * 10, H), s = 1 + r() * 3; ctx.globalAlpha = .3 + .5 * r(); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// =====================================================================
//  3D ENGINE — perspective camera, clipped polygons, boxes, reservoirs
// =====================================================================
function camera(o) {
  const sY = Math.sin(o.yaw), cY = Math.cos(o.yaw), sP = Math.sin(o.pitch), cP = Math.cos(o.pitch);
  const F = [cP * sY, cP * cY, -sP], R = [cY, -sY, 0], U = [sY * sP, cY * sP, cP];
  const C = [o.tx - F[0] * o.dist, o.ty - F[1] * o.dist, (o.tz || 0) - F[2] * o.dist];
  const f = o.f || 1500, cx = W / 2, cy = o.cy || H * .42;
  const cs = (x, y, z) => { const dx = x - C[0], dy = y - C[1], dz = z - C[2]; return [dx * R[0] + dy * R[1], dx * U[0] + dy * U[1] + dz * U[2], dx * F[0] + dy * F[1] + dz * F[2]]; };
  return { C, F, R, U, f, cx, cy, cs, hz: cy - f * Math.tan(o.pitch), p(x, y, z) { const [a, b, c] = cs(x, y, z); return c > 1 ? [cx + f * a / c, cy - f * b / c, c] : null; } };
}
const NEAR = 1.5;
function proj(cam, pts) {
  const c = pts.map(p => cam.cs(p[0], p[1], p[2])), o = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
    if (ia) o.push(a);
    if (ia !== ib) { const t = (NEAR - a[2]) / (b[2] - a[2]); o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
  }
  return o.length >= 3 ? o.map(q => [cam.cx + cam.f * q[0] / q[2], cam.cy - cam.f * q[1] / q[2]]) : null;
}
function path2(ctx, s) { ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
function fill3(ctx, cam, pts, fill) { const s = proj(cam, pts); if (!s) return null; path2(ctx, s); ctx.fillStyle = fill; ctx.fill(); return s; }
function seg3(ctx, cam, a, b) {
  let A = cam.cs(a[0], a[1], a[2]), B = cam.cs(b[0], b[1], b[2]); if (A[2] < NEAR && B[2] < NEAR) return;
  if (A[2] < NEAR || B[2] < NEAR) { const t = (NEAR - A[2]) / (B[2] - A[2]), M = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR]; if (A[2] < NEAR) A = M; else B = M; }
  ctx.moveTo(cam.cx + cam.f * A[0] / A[2], cam.cy - cam.f * A[1] / A[2]); ctx.lineTo(cam.cx + cam.f * B[0] / B[2], cam.cy - cam.f * B[1] / B[2]);
}
const rect3 = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
function ribbon(pts, w, z = 0) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    L.push([pts[i][0] - dy * w / 2, pts[i][1] + dx * w / 2, z]); R.push([pts[i][0] + dy * w / 2, pts[i][1] - dx * w / 2, z]);
  }
  return [...L, ...R.reverse()];
}
function polyLen(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }
function polyAt(pts, cum, s) {
  let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const t = clamp((s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)); return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
}
function hull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------- palettes (light, sky) ----------
const PALS = {
  gold: { sky: [[0, '#2f4b7c'], [.5, '#b9857a'], [.8, '#f0a874'], [1, '#ffd49a']], L: norm([-.8, -.3, .42]), amb: .5, bright: 1.0, tint: [1.1, .97, .84], haze: [255, 200, 155], water: [[48, 90, 124], [118, 140, 152]], glow: 'rgba(255,190,120,.55)', shadow: 1 },
  day: { sky: [[0, '#6f9fd0'], [.5, '#a9c6e0'], [.8, '#e2e6e0'], [1, '#f4efe2']], L: norm([.35, -.6, .75]), amb: .58, bright: 1.0, tint: [1.03, 1, .95], haze: [232, 232, 228], water: [[52, 110, 140], [150, 200, 220]], glow: 'rgba(255,255,230,.35)', shadow: .9 },
  storm: { sky: [[0, '#252a36'], [.5, '#3c4350'], [.8, '#5b6270'], [1, '#7a808a']], L: norm([.2, -.4, .9]), amb: .8, bright: .62, tint: [.92, .96, 1.04], haze: [110, 118, 130], water: [[40, 70, 90], [100, 130, 150]], glow: 'rgba(0,0,0,0)', shadow: .2 },
  sunset: { sky: [[0, '#2b2d5c'], [.45, '#8a4f7d'], [.78, '#f08a5d'], [1, '#ffc98b']], L: norm([-.85, .1, .3]), amb: .5, bright: .92, tint: [1.15, .9, .8], haze: [255, 165, 125], water: [[74, 63, 106], [243, 154, 106]], glow: 'rgba(255,150,90,.6)', shadow: 1 },
  dusk: { sky: [[0, '#151a3d'], [.42, '#4b3a6b'], [.78, '#d9745a'], [1, '#f2a46a']], L: norm([-.9, .2, .2]), amb: .5, bright: .74, tint: [1.12, .88, .86], haze: [220, 130, 110], water: [[58, 48, 80], [217, 128, 90]], glow: 'rgba(255,140,90,.5)', shadow: .9 },
  night: { sky: [[0, '#04060d'], [.5, '#0b1128'], [.8, '#18213f'], [1, '#283152']], L: norm([.3, .5, .6]), amb: .6, bright: .5, tint: [.8, .9, 1.2], haze: [30, 40, 70], water: [[20, 30, 50], [60, 80, 120]], glow: 'rgba(170,190,255,.12)', shadow: .4, stars: true },
  today: { sky: [[0, '#7fa6c8'], [.5, '#b8cbd8'], [.8, '#e3ddd0'], [1, '#efe6d6']], L: norm([.4, -.5, .7]), amb: .58, bright: .98, tint: [1, 1, .97], haze: [230, 225, 215], water: [[60, 100, 120], [150, 190, 200]], glow: 'rgba(255,255,230,.3)', shadow: .85 },
};
function mixPal(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const ms = (x, y) => rgba(mixc(hex(x), hex(y), t));
  return {
    sky: a.sky.map((s, i) => [lerp(s[0], b.sky[i][0], t), ms(s[1], b.sky[i][1])]), skyMixed: true,
    L: norm(mixc(a.L, b.L, t)), amb: lerp(a.amb, b.amb, t), bright: lerp(a.bright, b.bright, t), tint: mixc(a.tint, b.tint, t),
    haze: mixc(a.haze, b.haze, t), water: [mixc(a.water[0], b.water[0], t), mixc(a.water[1], b.water[1], t)], glow: t < .5 ? a.glow : b.glow, shadow: lerp(a.shadow, b.shadow, t),
  };
}
function shadeCol(col, P, nx, ny, nz, a = 1) {
  const L = P.L, k = (P.amb + (1 - P.amb) * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])) * P.bright, T = P.tint;
  return rgba([col[0] * k * T[0], col[1] * k * T[1], col[2] * k * T[2]], a);
}

// ---------- materials ----------
const SALT = [238, 230, 216], GROUND = [200, 160, 114], TOWN = [214, 182, 138], CERE = [226, 202, 162];
const STONE = [216, 188, 146], STONE2 = [196, 166, 126], BRICK = [192, 146, 104], PLAT = [204, 174, 132], RUINC = [158, 140, 118], BED = [224, 204, 170];

// ---------- the world ----------
const mansarY = x => 425 + 50 * Math.sin(x / 290) + 18 * Math.sin(x / 97);
const manharY = x => -420 + 42 * Math.sin(x / 260 + 1) + 16 * Math.sin(x / 83 + 2);
const WORLD = (() => {
  const r = rng(42), rh = rng(99), boxes = [], streets = [];
  const add = (x0, y0, x1, y1, h, col, o = {}) => boxes.push({ x0, y0, x1, y1, z0: o.z0 || 0, h, hr: o.hr ?? Math.max(.6, h * .15), col, kind: o.kind || 'house', hsh: rh() });
  const ring = (x0, y0, x1, y1, t, h, col, hr, z0 = 0, seg = 40) => {
    for (const [a, b] of [[y0, y0 + t], [y1 - t, y1]]) for (let x = x0; x < x1 - .1; x += seg) add(x, a, Math.min(x1, x + seg), b, h, col, { hr, z0, kind: 'wall' });
    for (const [a, b] of [[x0, x0 + t], [x1 - t, x1]]) for (let y = y0 + t; y < y1 - t - .1; y += seg) add(a, y, b, Math.min(y1 - t, y + seg), h, col, { hr, z0, kind: 'wall' });
  };
  const grid = (x0, y0, x1, y1, dens = 1) => {
    const P = 15;
    for (let ix = 0; x0 + ix * P + 11 <= x1; ix++) for (let iy = 0; y0 + iy * P + 11 <= y1; iy++) {
      if (ix % 5 === 2 || iy % 6 === 3) continue;
      if (r() > dens) continue;
      const x = x0 + ix * P, y = y0 + iy * P, w = 9 + r() * 4, d = 9 + r() * 4, h = 3.6 + r() * 2.4;
      add(x + (13 - w) / 2, y + (13 - d) / 2, x + (13 + w) / 2, y + (13 + d) / 2, h, mixc(STONE, BRICK, r() * .7), { kind: 'house' });
    }
    for (let ix = 2; x0 + ix * P + 11 <= x1; ix += 5) streets.push({ ax: 'y', c: x0 + ix * P + 6.5, a: y0, b: y1 });
    for (let iy = 3; y0 + iy * P + 11 <= y1; iy += 6) streets.push({ ax: 'x', c: y0 + iy * P + 6.5, a: x0, b: x1 });
  };
  // outer fortification with bastions
  ring(-385, -310, 385, 310, 14, 9, STONE2, 2.4);
  for (let x = -385; x <= 385; x += 110) for (const y of [-310, 310]) add(x - 11, y - 11, x + 11, y + 11, 11, STONE2, { hr: 3, kind: 'wall' });
  for (let y = -200; y <= 200; y += 110) for (const x of [-385, 385]) add(x - 11, y - 11, x + 11, y + 11, 11, STONE2, { hr: 3, kind: 'wall' });
  // citadel: castle + bailey on raised platforms
  add(-40, -285, 100, -165, 12, PLAT, { hr: 9, kind: 'plat' });
  ring(-40, -285, 100, -165, 6, 4.5, STONE, 1.2, 12, 35);
  for (const [a, b, c, d, h] of [[-22, -268, 28, -232, 5], [40, -262, 84, -220, 6.5], [-24, -214, 18, -184, 4], [32, -206, 82, -182, 4.5]]) add(a, b, c, d, h, STONE, { z0: 12, kind: 'house', hr: 1 });
  add(-175, -285, -40, -180, 8, PLAT, { hr: 6, kind: 'plat' });
  ring(-175, -285, -40, -180, 5, 3, STONE, 1, 8, 34);
  for (let x = -165; x < -55; x += 22) for (let y = -272; y < -195; y += 24) if (r() < .8) add(x, y, x + 15, y + 15, 3.8 + r() * 1.5, mixc(STONE, BRICK, r() * .4), { z0: 8, kind: 'house', hr: .8 });
  // middle town (walled) and lower town
  ring(-265, -100, 145, 150, 8, 6, STONE2, 1.6);
  grid(-255, -90, 135, 140, .95);
  grid(165, -235, 322, 290, .9);
  grid(-365, 170, 145, 292, .55);
  // check dams on the seasonal streams
  for (const [x, f] of [[560, mansarY], [300, manharY], [-260, manharY]]) add(x - 7, f(x) - 26, x + 7, f(x) + 26, 3.2, STONE2, { hr: 1.2, kind: 'dam' });
  const res = [
    { x0: 332, y0: -245, x1: 369, y1: 255, d: 9, steps: 3, ins: 3.2 },
    { x0: -345, y0: -294, x1: -195, y1: -266, d: 6, steps: 2, ins: 3 },
    { x0: 115, y0: -294, x1: 315, y1: -262, d: 7, steps: 2, ins: 3 },
  ];
  const channels = [
    [[560, mansarY(560) - 20], [530, 360], [440, 326], [352, 302], [352, 252]],
    [[300, manharY(300) + 20], [270, -350], [215, -320], [215, -290]],
    [[-260, manharY(-260) + 20], [-268, -340], [-270, -290]],
  ];
  const mansar = [], manhar = [];
  for (let x = 2600; x >= -2400; x -= 40) { mansar.push([x, mansarY(x)]); manhar.push([x, manharY(x)]); }
  const island = [], islandOuter = [];
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, rr = 2100 + 260 * Math.sin(a * 3 + 1) + 160 * Math.sin(a * 7) + 70 * (r() - .5); island.push([900 + Math.cos(a) * rr * 1.25, -900 + Math.sin(a) * rr, 0]); islandOuter.push([900 + Math.cos(a) * (rr + 120) * 1.25, -900 + Math.sin(a) * (rr + 120), 0]); }
  const patches = [];
  for (let k = 0; k < 9; k++) { const cx = 300 + r() * 2200, cy = -2200 + r() * 1900, R = 150 + r() * 260, pts = []; if (Math.hypot(cx, cy) < 700) continue; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; pts.push([cx + Math.cos(a) * R * (.7 + r() * .5), cy + Math.sin(a) * R * (.6 + r() * .4), 0]); } patches.push(pts); }
  const shrubs = [];
  for (let i = 0; i < 700; i++) { const a = r() * TAU, d = 420 + r() * 1500, x = Math.cos(a) * d, y = Math.sin(a) * d; shrubs.push({ x, y, r: 2 + r() * 3.5, inside: false }); }
  for (let i = 0; i < 260; i++) shrubs.push({ x: (r() - .5) * 740, y: (r() - .5) * 590, r: 1.2 + r() * 2.2, inside: true });
  const walkers = [], cloth = [[214, 196, 166], [176, 72, 52], [232, 222, 202], [128, 94, 62], [70, 88, 120], [190, 150, 70]];
  for (const s of streets) { const n = Math.max(1, Math.round((s.b - s.a) / 45)); for (let i = 0; i < n; i++) walkers.push({ s, ph: r() * 1000, v: (r() < .5 ? -1 : 1) * (1 + r() * .6), off: (r() - .5) * 5, col: cloth[(r() * cloth.length) | 0] }); }
  return { boxes, res, channels, mansar, manhar, island, islandOuter, patches, shrubs, walkers, streets, cum: { mansar: polyLen(mansar), manhar: polyLen(manhar), ch: channels.map(polyLen) } };
})();
const MAIN_ST = WORLD.streets.find(s => s.ax === 'x' && s.c > 40 && s.c < 60 && s.a < -200);

function drawBox(ctx, cam, b, P) {
  const C = cam.C, { x0, y0, x1, y1, z0 } = b, z1 = z0 + b.hh, col = b.cc;
  if (C[1] < y0) fill3(ctx, cam, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], shadeCol(col, P, 0, -1, 0));
  if (C[1] > y1) fill3(ctx, cam, [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], shadeCol(col, P, 0, 1, 0));
  if (C[0] < x0) fill3(ctx, cam, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], shadeCol(col, P, -1, 0, 0));
  if (C[0] > x1) fill3(ctx, cam, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], shadeCol(col, P, 1, 0, 0));
  if (C[2] > z1) fill3(ctx, cam, rect3(x0, y0, x1, y1, z1), shadeCol(mixc(col, [255, 245, 225], .08), P, 0, 0, 1));
}
function drawRes(ctx, cam, R, level, P, ruin, u, glint) {
  const C = cam.C, steps = R.steps, dz = R.d / steps, ins = R.ins;
  const rr = k => [R.x0 + k * ins, R.y0 + k * ins, R.x1 - k * ins, R.y1 - k * ins];
  const rim = proj(cam, rect3(R.x0, R.y0, R.x1, R.y1, 0)); if (!rim) return;
  const stone = mixc([186, 160, 122], RUINC, ruin * .7);
  ctx.save(); path2(ctx, rim); ctx.clip();
  for (let k = 0; k < steps; k++) {
    const [a, b, c, d] = rr(k), zt = -k * dz, zb = -(k + 1) * dz;
    if (k > 0) fill3(ctx, cam, rect3(...rr(k - 1), zt), shadeCol(stone, P, 0, 0, 1));
    if (C[1] < d) fill3(ctx, cam, [[a, d, zt], [c, d, zt], [c, d, zb], [a, d, zb]], shadeCol(stone, P, 0, -1, 0));
    if (C[1] > b) fill3(ctx, cam, [[a, b, zt], [c, b, zt], [c, b, zb], [a, b, zb]], shadeCol(stone, P, 0, 1, 0));
    if (C[0] < c) fill3(ctx, cam, [[c, b, zt], [c, d, zt], [c, d, zb], [c, b, zb]], shadeCol(stone, P, -1, 0, 0));
    if (C[0] > a) fill3(ctx, cam, [[a, b, zt], [a, d, zt], [a, d, zb], [a, b, zb]], shadeCol(stone, P, 1, 0, 0));
  }
  fill3(ctx, cam, rect3(...rr(steps - 1), -R.d), shadeCol(mixc(stone, [90, 80, 70], .35), P, 0, 0, 1));
  const lv = level * (1 - ruin);
  if (lv > .01) {
    const zw = -R.d + lv * R.d * .94, kw = Math.min(steps - 1, Math.floor(-zw / dz)), ri = rr(kw);
    const clipK = proj(cam, rect3(...ri, -kw * dz));
    if (clipK) {
      ctx.save(); path2(ctx, clipK); ctx.clip();
      const s = proj(cam, rect3(...ri, zw));
      if (s) {
        const ys = s.map(q => q[1]), g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
        g.addColorStop(0, rgba(P.water[1], .95)); g.addColorStop(1, rgba(P.water[0], .97)); path2(ctx, s); ctx.fillStyle = g; ctx.fill();
        const rg = rng(R.x0 * 7 + 11); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 26; i++) { const x = lerp(ri[0], ri[2], rg()), y = lerp(ri[1], ri[3], mod(rg() + u * .02, 1)), l = 3 + rg() * 8; seg3(ctx, cam, [x, y, zw], [x + l * Math.cos(u + i), y + l * .3, zw]); }
        ctx.stroke();
        if (glint) {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 40; i++) {
            const p = cam.p(lerp(ri[0], ri[2], rg()), lerp(ri[1], ri[3], rg()), zw); const k = Math.pow(Math.max(0, Math.sin(u * 3.1 + i * 1.7)), 10) * glint; if (!p || k < .02) continue;
            const sz = 6 + 14 * k; ctx.strokeStyle = `rgba(255,240,200,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[0] - sz, p[1]); ctx.lineTo(p[0] + sz, p[1]); ctx.moveTo(p[0], p[1] - sz * .6); ctx.lineTo(p[0], p[1] + sz * .6); ctx.stroke();
            glow(ctx, p[0], p[1], sz * 2.2, `rgba(255,220,160,${.5 * k})`);
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      ctx.restore();
    }
  }
  ctx.restore();
}
function flowDash(ctx, cam, pts, cum, u, speed, col, lw, z = .4, gap = 34, len = 14) {
  const tot = cum[cum.length - 1]; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.beginPath();
  for (let s = mod(u * speed, gap); s < tot - len; s += gap) { const a = polyAt(pts, cum, s), b = polyAt(pts, cum, s + len); seg3(ctx, cam, [a[0], a[1], z], [b[0], b[1], z]); }
  ctx.stroke(); ctx.restore();
}

// o: camera {tx,ty,tz,yaw,pitch,dist,f,cy} + pal, u, ruin, wet (streams), level (reservoirs), channelWater, people, salt, glint
function renderCity(ctx, o) {
  const P = o.pal, cam = camera(o), C = cam.C, ruin = o.ruin || 0, u = o.u || 0, hz = cam.hz, bur = o.buried || 0;
  if (hz > 0) { sky(ctx, P.sky, hz + 4); if (P.stars) { const r = rng(31); ctx.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * hz, s = r() * 1.8 + .3; ctx.globalAlpha = (.3 + .7 * r()) * (.7 + .3 * Math.sin(u * 2 + i)); ctx.fillRect(x, y, s, s); } ctx.globalAlpha = 1; } }
  const sp = cam.p(C[0] + P.L[0] * 1e5, C[1] + P.L[1] * 1e5, C[2] + P.L[2] * 1e5);
  if (sp && hz > 0) glow(ctx, sp[0], sp[1], 760, P.glow);
  const y0 = Math.max(0, hz), sg = ctx.createLinearGradient(0, y0, 0, H);
  sg.addColorStop(0, shadeCol(mixc(SALT, P.haze, .5), P, 0, 0, 1)); sg.addColorStop(1, shadeCol(SALT, P, 0, 0, 1)); ctx.fillStyle = sg; ctx.fillRect(0, y0, W, H - y0);
  if (o.rann) { ctx.fillStyle = rgba(mixc(P.water[0], P.water[1], .4), .6 * o.rann); ctx.fillRect(0, y0, W, H - y0); ctx.strokeStyle = `rgba(255,255,255,${.25 * o.rann})`; ctx.lineWidth = 1.5; ctx.beginPath(); const r = rng(13); for (let i = 0; i < 140; i++) { const yy = y0 + Math.pow(r(), 1.6) * (H - y0), xx = mod(r() * W + u * 8 * (1 + (yy - y0) / 300), W + 100) - 50, l = 6 + (yy - y0) * .08; ctx.moveTo(xx, yy); ctx.lineTo(xx + l, yy); } ctx.stroke(); }
  if (o.salt) {
    const r = rng(9), gx = Math.round(C[0] / 70) * 70, gy = Math.round(C[1] / 70) * 70; ctx.save(); ctx.strokeStyle = shadeCol([150, 135, 115], P, 0, 0, 1, .35); ctx.lineWidth = 1.3; ctx.beginPath();
    for (let k = -30; k <= 30; k++) { const j = (r() - .5) * 40, j2 = (r() - .5) * 120; seg3(ctx, cam, [gx + k * 70 + j, gy - 2100, 0], [gx + k * 70 - j + j2, gy + 2100, 0]); seg3(ctx, cam, [gx - 2100, gy + k * 70 + j, 0], [gx + 2100, gy + k * 70 - j + j2, 0]); }
    ctx.stroke(); ctx.restore();
  }
  fill3(ctx, cam, WORLD.islandOuter, shadeCol(mixc(GROUND, SALT, .5), P, 0, 0, 1));
  fill3(ctx, cam, WORLD.island, shadeCol(GROUND, P, 0, 0, 1));
  for (const p of WORLD.patches) fill3(ctx, cam, p, shadeCol(mixc(GROUND, [150, 118, 86], .45), P, 0, 0, 1));
  // seasonal streams
  const wet = o.wet || 0;
  for (const [pts, cum] of [[WORLD.mansar, WORLD.cum.mansar], [WORLD.manhar, WORLD.cum.manhar]]) {
    fill3(ctx, cam, ribbon(pts, 40, .05), shadeCol(mixc(BED, GROUND, .25), P, 0, 0, 1));
    if (wet > 0) { fill3(ctx, cam, ribbon(pts, 26 * Math.sqrt(wet), .1), rgba(mixc(P.water[0], P.water[1], .25), .85 * Math.min(1, wet * 2))); flowDash(ctx, cam, pts, cum, u, 26, `rgba(230,245,255,${.55 * wet})`, 2, .2, 46, 12); }
  }
  // town ground
  fill3(ctx, cam, rect3(-385, -310, 385, 310, .1), shadeCol(mixc(TOWN, RUINC, ruin * .5), P, 0, 0, 1));
  fill3(ctx, cam, rect3(-175, -165, 100, -108, .15), shadeCol(mixc(CERE, RUINC, ruin * .4), P, 0, 0, 1));
  // channels from the dams to the reservoirs
  WORLD.channels.forEach((ch, i) => {
    if (o.noChannels) return;
    fill3(ctx, cam, ribbon(ch, 8, .2), shadeCol(mixc(STONE2, RUINC, ruin), P, 0, 0, 1, 1 - ruin * .6));
    if (o.channelWater) { fill3(ctx, cam, ribbon(ch, 4.5, .3), rgba(P.water[0], .9 * o.channelWater)); flowDash(ctx, cam, ch, WORLD.cum.ch[i], u, 30, `rgba(220,245,255,${.8 * o.channelWater})`, 2.5, .5, 22, 8); }
  });
  for (const R of WORLD.res) { drawRes(ctx, cam, R, o.level ?? .78, P, ruin, u, o.glint || 0); if (bur) fill3(ctx, cam, rect3(R.x0 - 2, R.y0 - 2, R.x1 + 2, R.y1 + 2, .3), shadeCol(mixc(TOWN, GROUND, .6), P, 0, 0, 1, bur)); }
  // scrub
  for (const s of WORLD.shrubs) {
    const a = s.inside ? ruin : 1; if (a <= .02) continue;
    const p = cam.p(s.x, s.y, 0); if (!p || p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
    const rr = s.r * cam.f / p[2]; if (rr < .5) continue;
    ctx.fillStyle = shadeCol([92, 98, 62], P, 0, 0, 1, .85 * a); ctx.beginPath(); ctx.ellipse(p[0], p[1] - rr * .4, rr, rr * .7, 0, 0, TAU); ctx.fill();
  }
  // boxes (+ people)
  const list = [];
  const keep = o.keep || 0, grow = o.grow ?? 1;
  for (const b of WORLD.boxes) {
    if (o.noDams && b.kind === 'dam') continue;
    const g = b.kind === 'house' ? clamp((grow - b.hsh) * 10) : 1; if (g <= 0) continue;
    const rb = b.kind === 'house' && b.hsh < keep ? 0 : ruin;
    b.hh = lerp(b.h, b.hr, rb) * g * (1 - bur * .8); b.cc = rb ? mixc(b.col, RUINC, rb * .85) : b.col; if (bur) b.cc = mixc(b.cc, GROUND, bur * .7); list.push(b);
  }
  if (o.people && ruin < .5) for (const w of WORLD.walkers) {
    const s = mod(w.ph + u * w.v, w.s.b - w.s.a) + w.s.a, x = w.s.ax === 'x' ? s : w.s.c + w.off, y = w.s.ax === 'x' ? w.s.c + w.off : s;
    list.push({ x0: x - .35, y0: y - .35, x1: x + .35, y1: y + .35, z0: 0, hh: 1.7, cc: w.col, kind: 'person' });
  }
  // shadows
  const sx = -P.L[0] / Math.max(.22, P.L[2]), sy = -P.L[1] / Math.max(.22, P.L[2]);
  ctx.beginPath();
  for (const b of list) {
    if (b.z0 > 0 || b.hh < .8) continue; const dx = sx * b.hh, dy = sy * b.hh;
    const s = proj(cam, hull([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1], [b.x0 + dx, b.y0 + dy], [b.x1 + dx, b.y0 + dy], [b.x1 + dx, b.y1 + dy], [b.x0 + dx, b.y1 + dy]]).map(q => [q[0], q[1], .2]));
    if (s) { s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
  }
  ctx.fillStyle = `rgba(40,20,25,${.3 * P.shadow})`; ctx.fill();
  for (const b of list) { const cx = (b.x0 + b.x1) / 2 - C[0], cy = (b.y0 + b.y1) / 2 - C[1], cz = b.z0 + b.hh / 2 - C[2]; b.d2 = cx * cx + cy * cy + cz * cz; }
  list.sort((a, b) => b.d2 - a.d2);
  for (const b of list) {
    if (b.kind === 'house' || b.kind === 'person') { const p = cam.p((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.z0); if (!p || p[0] < -250 || p[0] > W + 250 || p[1] < -300 || p[1] > H + 300) continue; }
    drawBox(ctx, cam, b, P);
  }
  // atmosphere
  if (hz > -300) { const g = ctx.createLinearGradient(0, hz - 120, 0, hz + 260); g.addColorStop(0, rgba(P.haze, 0)); g.addColorStop(.35, rgba(P.haze, .32)); g.addColorStop(1, rgba(P.haze, 0)); ctx.fillStyle = g; ctx.fillRect(0, hz - 120, W, 380); }
  else { const g = ctx.createLinearGradient(0, 0, 0, H * .5); g.addColorStop(0, rgba(P.haze, .35)); g.addColorStop(1, rgba(P.haze, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .5); }
  return cam;
}
function label3(ctx, cam, X, Y, Z, s, a, o = {}) {
  const p = cam.p(X, Y, Z); if (!p || a <= 0) return;
  const col = o.col || '#ffffff', dx = o.dx || 0, dy = o.dy ?? -130, size = o.size || 46;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px "Nirmala UI", sans-serif`;
  const w = ctx.measureText(s).width; let tx = clamp(p[0] + dx, w / 2 + 40, W - w / 2 - 40); const ty = p[1] + dy;
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(lerp(p[0], tx, .85), lerp(p[1], ty + (dy < 0 ? size * .6 : -size * .6), 1)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; txt(ctx, s, tx, ty, size, col, 'center', 700, 8);
  if (o.sub) txt(ctx, o.sub, tx, ty + (dy < 0 ? -size * .95 : size * .95), size * .58, 'rgba(255,255,255,.9)', 'center', 600, 6);
  ctx.restore();
}

// =====================================================================
//  2D props
// =====================================================================
function person(c, x, y, s, ph, dir, col, o = {}) {
  const sw = Math.sin(ph), skin = o.skin || '#5b3a26', dark = '#3a2418';
  c.save(); c.translate(x, y); c.scale(dir, 1); c.lineCap = 'round'; c.lineJoin = 'round';
  const limb = (a, shade, back) => { c.strokeStyle = shade; c.lineWidth = s * .055; c.beginPath(); c.moveTo(0, -s * .48); c.quadraticCurveTo(Math.sin(a) * s * .1 + s * .03, -s * .25, Math.sin(a) * s * .19, -Math.max(0, Math.cos(a + 1.2)) * s * .02); c.stroke(); };
  limb(-sw * .8, dark); // back leg
  if (!o.pot) { c.strokeStyle = dark; c.lineWidth = s * .045; c.beginPath(); c.moveTo(0, -s * .78); c.lineTo(sw * s * .1, -s * .52); c.stroke(); }
  c.fillStyle = skin; c.beginPath(); c.roundRect(-s * .075, -s * .83, s * .15, s * .36, s * .05); c.fill();
  limb(sw * .8, skin);
  c.fillStyle = col; c.beginPath(); c.moveTo(-s * .095, -s * .56); c.lineTo(s * .095, -s * .56); c.lineTo(s * .12 + sw * s * .03, -s * .28); c.lineTo(-s * .11 + sw * s * .02, -s * .28); c.closePath(); c.fill();
  if (o.shawl) { c.fillStyle = o.shawl; c.beginPath(); c.moveTo(-s * .08, -s * .82); c.lineTo(s * .04, -s * .82); c.lineTo(s * .08, -s * .6); c.lineTo(-s * .08, -s * .66); c.closePath(); c.fill(); }
  c.fillStyle = skin; c.beginPath(); c.arc(s * .012, -s * .9, s * .062, 0, TAU); c.fill();
  if (o.hat) { c.fillStyle = o.hat; c.beginPath(); c.ellipse(s * .012, -s * .95, s * .13, s * .025, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(s * .012, -s * .955, s * .065, Math.PI, TAU); c.fill(); c.restore(); return; }
  c.fillStyle = '#1e1410'; c.beginPath(); c.arc(-s * .02, -s * .93, s * .05, Math.PI * .9, Math.PI * 2.05); c.fill(); c.beginPath(); c.arc(-s * .06, -s * .9, s * .028, 0, TAU); c.fill();
  if (o.pot) {
    c.strokeStyle = skin; c.lineWidth = s * .045; c.beginPath(); c.moveTo(0, -s * .78); c.lineTo(s * .06, -s * .93); c.lineTo(s * .03, -s * 1.0); c.stroke();
    const g = c.createLinearGradient(-s * .08, 0, s * .08, 0); g.addColorStop(0, '#c0643a'); g.addColorStop(1, '#7a3a20'); c.fillStyle = g; c.beginPath(); c.ellipse(0, -s * 1.03, s * .085, s * .07, 0, 0, TAU); c.fill(); c.fillRect(-s * .035, -s * 1.12, s * .07, s * .04);
  } else { c.strokeStyle = skin; c.lineWidth = s * .045; c.beginPath(); c.moveTo(0, -s * .78); c.lineTo(-sw * s * .1, -s * .52); c.stroke(); }
  c.restore();
}
const STREET = (() => { const r = rng(7), houses = []; let x = 0; while (x < 3200) { const w = 170 + r() * 190, h = 190 + r() * 130; houses.push({ x, w, h, door: r() < .75, dx: .2 + r() * .45, par: r() < .55, tone: r(), win: r() < .6 }); x += w + (r() < .3 ? 70 + r() * 90 : 8); } return { houses, len: x }; })();
const CRACKS = (() => { const r = rng(21), L = []; for (let i = 0; i < 300; i++) { let X = (r() - .5) * 90, Z = r() * 140, a = r() * TAU; const pts = [[X, Z]]; for (let k = 0; k < 6; k++) { a += (r() - .5) * 1.3; const st = .6 + r() * 2.2; X += Math.cos(a) * st; Z += Math.sin(a) * st * .8; pts.push([X, Z]); } L.push(pts); } return L; })();
const shimC = mk(W, 220);

