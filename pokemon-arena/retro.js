'use strict';
// =====================================================================
//  RETRO 2D — top-down pixel-art battles in real time.
//  Same Pokémon, moves, damage formula, type chart and AI as the 3D mode,
//  drawn on a 2D canvas: animated sprites, an original pixel plaza,
//  pixel move effects and a broadcast-style HUD. Both Pokémon move and
//  attack at the same time (each on its own cooldown), so beams can clash.
// =====================================================================
const Retro = (() => {
  const root = document.getElementById('retro');
  const cv = document.getElementById('rcv');
  const ctx = cv.getContext('2d');
  const hudEl = document.getElementById('rHud');
  const fxEl = document.getElementById('rFx');
  const PX = 3;                        // one art pixel in virtual units
  const SPR = 1.7;                     // sprite scale on the field
  let VW = 1280, VH = 720, portrait = false, SC = 1;
  let on = false, token = 0, running = false, ended = false;
  let T = 0, clockT = 0;
  let resolveBattle = null, rejectBattle = null;
  const F = [null, null];              // fighters on the field
  const TR = [null, null];             // trainers
  let TH = null, field = null, spots = null, bg = null, front = null, decal = null, lights = [], crowd = [];
  let shake = 0, flashA = 0, flashCol = '#fff', cheer = 0;
  const parts = [], beams = [], bolts = [], rings = [], projs = [], shapes = [];

  const sn = v => Math.round(v / PX) * PX;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const rgbOf = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const chk = tk => { if (tk !== token || !on) throw new BattleAbort(); };
  const swallow = e => { if (!(e instanceof BattleAbort)) console.warn('retro', e); };
  const tw = (sec, fn) => tween(sec, fn);
  const foeOf = f => F[1 - f.p];

  // ---------------------------------------------------------------------
  //  Canvas size: 720 virtual units on the short side, the frame's aspect
  // ---------------------------------------------------------------------
  function resize() {
    const [fw, fh] = frameSize();
    portrait = fh > fw;
    if (portrait) { VW = 720; VH = Math.round(720 * fh / fw); } else { VH = 720; VW = Math.round(720 * fw / fh); }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const k = Math.min(dpr * fw / VW, 2560 / Math.max(VW, VH));
    cv.width = Math.round(VW * k); cv.height = Math.round(VH * k);
    SC = cv.width / VW;
    root.style.setProperty('--u', (fw / VW) + 'px');
    root.classList.toggle('port', portrait);
  }
  function layout() {
    if (!portrait) {
      field = { x0: VW * 0.19, x1: VW * 0.81, y0: VH * 0.37, y1: VH * 0.83 };
      spots = { trainer: [{ x: VW * 0.105, y: VH * 0.6 }, { x: VW * 0.895, y: VH * 0.6 }], start: [{ x: VW * 0.3, y: VH * 0.6 }, { x: VW * 0.7, y: VH * 0.6 }] };
    } else {
      field = { x0: VW * 0.12, x1: VW * 0.88, y0: VH * 0.33, y1: VH * 0.83 };
      spots = { trainer: [{ x: VW * 0.16, y: VH * 0.875 }, { x: VW * 0.84, y: VH * 0.285 }], start: [{ x: VW * 0.4, y: VH * 0.72 }, { x: VW * 0.6, y: VH * 0.44 }] };
    }
  }

  // ---------------------------------------------------------------------
  //  Tiny pixel bitmaps for effects (1 = main, 2 = light, 3 = dark)
  // ---------------------------------------------------------------------
  const BM = {
    flame: ['..1..', '.121.', '.121.', '12321', '12221', '.111.'],
    leaf: ['...11', '..121', '.1211', '121..', '11...'],
    rock: ['.111.', '12211', '12131', '11331', '.111.'],
    shard: ['..1..', '.121.', '.121.', '12221', '.121.', '..1..'],
    bubble: ['.111.', '1.221', '1..21', '1...1', '.111.'],
    star: ['..2..', '..2..', '22122', '..2..', '..2..'],
    spark: ['2...2', '.2.2.', '..1..', '.2.2.', '2...2'],
    heart: ['11.11', '12111', '11111', '.111.', '..1..'],
    note: ['..111', '..1.1', '..1..', '111..', '111..'],
    zzz: ['1111', '..1.', '.1..', '1111'],
    plus: ['.1.', '121', '.1.'],
    up: ['..1..', '.121.', '12221', '..2..', '..2..'],
    down: ['..2..', '..2..', '12221', '.121.', '..1..'],
    smoke: ['.111.', '11211', '12221', '11211', '.111.'],
    gust: ['..111.', '.1....', '1.....', '1.....', '.1....', '..111.'],
    needle: ['2', '1', '1', '3'],
    seed: ['.1.', '121', '131', '.1.'],
    boom: ['...2...', '.2.1.2.', '..111..', '2111112', '..111..', '.2.1.2.', '...2...'],
    ball: ['..333..', '.31113.', '3111113', '3332333', '3222223', '.32223.', '..333..'],
    crack: ['1....', '.1..1', '..11.', '.1...', '1....']
  };
  const bmCache = new Map();
  function bmCanvas(name, c1, c2 = c1, c3 = c1) {
    const key = name + c1 + c2 + c3;
    let c = bmCache.get(key);
    if (c) return c;
    const rows = BM[name];
    c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ch === '1' ? c1 : ch === '2' ? c2 : c3; g.fillRect(x, y, 1, 1); } }));
    bmCache.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------------
  //  Type palettes: [light, main, mid, dark] + the particle shape
  // ---------------------------------------------------------------------
  const TP = {
    Fire: { c: ['#fff7c2', '#ffd23f', '#ff8c1a', '#d9381e', '#5a2a22'], bm: 'flame' },
    Water: { c: ['#ffffff', '#bfe9ff', '#5ab4ff', '#2b6fd6', '#1b3f8a'], bm: 'bubble' },
    Electric: { c: ['#ffffff', '#fff59a', '#ffe000', '#d9a800', '#7a5a00'], bm: 'spark' },
    Grass: { c: ['#eaffc2', '#a6eb6a', '#4fb83f', '#24782c', '#14421a'], bm: 'leaf' },
    Ice: { c: ['#ffffff', '#e2f8ff', '#9be2ff', '#4fa9e6', '#2a5f9e'], bm: 'shard' },
    Fighting: { c: ['#fff1c2', '#ffbf5a', '#f07a24', '#b8401a', '#5c1e0e'], bm: 'star' },
    Poison: { c: ['#f6dcff', '#d68cf5', '#a54ad8', '#6d2398', '#3a1052'], bm: 'bubble' },
    Ground: { c: ['#f6e2b4', '#d9ad6a', '#a8773e', '#6e4a26', '#3b2814'], bm: 'rock' },
    Flying: { c: ['#ffffff', '#eef5ff', '#c6dcf5', '#93b1d4', '#5a7499'], bm: 'gust' },
    Psychic: { c: ['#ffe6f3', '#ff9ccf', '#f0539f', '#b02a6e', '#5c1238'], bm: 'star' },
    Bug: { c: ['#f6ffc0', '#cdeb5a', '#98bd2c', '#5f7d16', '#33450a'], bm: 'needle' },
    Rock: { c: ['#f2e6c8', '#cdb684', '#9a8356', '#665534', '#3a301c'], bm: 'rock' },
    Ghost: { c: ['#efe3ff', '#b993f5', '#7d4fd6', '#4a2a94', '#22124a'], bm: 'smoke' },
    Dragon: { c: ['#e6dcff', '#9f8cff', '#6447ee', '#3a22a8', '#1c1058'], bm: 'flame' },
    Dark: { c: ['#e2d6ea', '#8f6ea3', '#5a3a6e', '#33203f', '#140a1a'], bm: 'smoke' },
    Steel: { c: ['#ffffff', '#e6ebf2', '#b3bdcb', '#76808f', '#3e4550'], bm: 'shard' },
    Fairy: { c: ['#ffffff', '#ffd6ef', '#ff9bd6', '#e05aa6', '#8a2a60'], bm: 'heart' },
    Normal: { c: ['#ffffff', '#f6f2e6', '#ddd4bd', '#a89d82', '#5e5646'], bm: 'star' }
  };
  const tp = type => TP[type] || TP.Normal;

  // ---------------------------------------------------------------------
  //  Animated sprites: every GIF frame decoded once (WebCodecs ImageDecoder)
  // ---------------------------------------------------------------------
  const ANIM = new Map();
  function opaqueBox(img, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };
    return { x0, y0, x1, y1 };
  }
  function getAnim(src) {
    if (ANIM.has(src)) return ANIM.get(src);
    const pr = (async () => {
      let frames = [];
      try {
        if (!('ImageDecoder' in window)) throw new Error('no decoder');
        const buf = await (await fetch(src)).arrayBuffer();
        const dec = new ImageDecoder({ data: buf, type: src.endsWith('.png') ? 'image/png' : 'image/gif' });
        await dec.tracks.ready;
        const n = dec.tracks.selectedTrack.frameCount;
        for (let i = 0; i < n; i++) {
          const r = await dec.decode({ frameIndex: i });
          const bmp = await createImageBitmap(r.image);
          frames.push({ img: bmp, dur: Math.max(0.02, (r.image.duration || 80000) / 1e6) });
          r.image.close();
        }
        dec.close();
      } catch (e) {
        const img = new Image(); img.src = src;
        await img.decode().catch(() => {});
        frames = [{ img, dur: 1 }];
      }
      const w = frames[0].img.width, h = frames[0].img.height;
      // union of the opaque area over a few frames: feet line + visual centre
      let box = null;
      for (let i = 0; i < frames.length; i += Math.max(1, Math.floor(frames.length / 4))) {
        const b = opaqueBox(frames[i].img, w, h);
        box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
      }
      const total = frames.reduce((a, f) => a + f.dur, 0);
      return { frames, total, w, h, box, bw: box.x1 - box.x0 + 1, bh: box.y1 - box.y0 + 1, src };
    })();
    ANIM.set(src, pr);
    return pr;
  }
  function frameAt(a, t) {
    if (a.frames.length === 1) return a.frames[0].img;
    let k = t % a.total;
    for (const f of a.frames) { if ((k -= f.dur) < 0) return f.img; }
    return a.frames[0].img;
  }
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d');
  // draws an animated sprite standing at (x, y) (feet), optionally mirrored / flashed / tinted
  function drawSprite(a, t, x, y, s, flip, o = {}) {
    const img = frameAt(a, t), b = a.box;
    const w = a.w * s, h = a.h * s * (o.sy || 1);
    const ox = ((b.x0 + b.x1 + 1) / 2) * s, oy = (b.y1 + 1) * s * (o.sy || 1);
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    if (o.filter) ctx.filter = o.filter;
    if (o.white > 0) {
      if (scratch.width !== a.w || scratch.height !== a.h) { scratch.width = a.w; scratch.height = a.h; }
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, a.w, a.h); sctx.drawImage(img, 0, 0);
      sctx.globalCompositeOperation = 'source-atop';
      sctx.fillStyle = o.whiteCol || '#fff'; sctx.globalAlpha = o.white; sctx.fillRect(0, 0, a.w, a.h); sctx.globalAlpha = 1;
      ctx.drawImage(scratch, -ox, -oy, w, h);
    } else ctx.drawImage(img, -ox, -oy, w, h);
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  //  Themes: an original pixel plaza (the reference look) + 4 more places
  // ---------------------------------------------------------------------
  const THEMES = {
    plaza: { name: 'Prism Plaza', ground: 'fan', pal: ['#b98a68', '#ad7f60', '#c39575', '#a27459', '#b68768'], mortar: '#7d5843', edge: '#6a4a3a', top: 'town', side: 'posts', lights: true, amb: null },
    park: { name: 'Verdant Park', ground: 'grass', pal: ['#5fa24c', '#559944', '#68ad53', '#4d8f3f'], edge: '#3c6e31', top: 'trees', side: 'fence', lights: false, amb: 'firefly' },
    beach: { name: 'Sunset Beach', ground: 'sand', pal: ['#ead39b', '#e0c78c', '#f1dca8', '#d9bc80'], edge: '#c9a86c', top: 'sea', side: 'rope', lights: false, amb: null },
    snow: { name: 'Frost Village', ground: 'snow', pal: ['#eaf2fb', '#dde8f5', '#f5f9fd', '#cfdcee'], edge: '#b6c8e0', top: 'pines', side: 'fence', lights: true, amb: 'snow' },
    volcano: { name: 'Magma Quarry', ground: 'basalt', pal: ['#4e3d3b', '#433533', '#5a4643', '#3a2e2c', '#544040'], mortar: '#221817', edge: '#2a1e1c', top: 'lava', side: 'torches', lights: false, amb: 'ember' }
  };
  const THEME_MAP = { stadium: 'plaza', city: 'plaza', forest: 'park', beach: 'beach', icecave: 'snow', volcano: 'volcano' };

  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // fish-scale ("fan") cobbles like a European plaza
  function groundFan(d, W, H, th, Rr) {
    const P = th.pal.map(rgbOf), M = rgbOf(th.mortar);
    const ringW = Rr / 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = null;
      const r0 = Math.floor(y / Rr);
      for (let r = r0 + 1; r >= r0 - 1 && !hit; r--) {
        const off = (r & 1) ? Rr : 0;
        const cx = Math.round((x - off) / (2 * Rr)) * 2 * Rr + off, cy = (r + 1) * Rr;
        for (const ccx of [cx, cx - 2 * Rr, cx + 2 * Rr]) {
          const dx = x - ccx, dy = cy - y, dd = Math.hypot(dx, dy);
          if (dd <= Rr) { hit = { dd, dx, dy, r, cx: ccx }; break; }
        }
      }
      let col;
      if (!hit) col = M;
      else {
        const ring = Math.min(2, Math.floor(hit.dd / ringW));
        const a = (Math.atan2(hit.dy, hit.dx) + Math.PI * 2) % (Math.PI * 2);
        const nseg = [3, 7, 11][ring];
        const segF = a / (Math.PI * 2) * nseg * 2;
        const seg = Math.floor(segF);
        const fr = hit.dd - ring * ringW;
        const edge = fr < 0.9 || Math.min(segF - seg, 1 - (segF - seg)) * hit.dd * Math.PI / nseg < 0.55 || hit.dd > Rr - 0.7;
        if (edge) col = M;
        else {
          const base = P[Math.floor(hash(hit.r, hit.cx, ring * 31 + seg) * P.length)];
          const lit = fr / ringW < 0.4 ? 14 : fr / ringW > 0.8 ? -12 : 0;
          const n = (hash(x, y, 7) - 0.5) * 5;
          col = base.map(v => v + lit + n);
        }
      }
      const i = (y * W + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  function groundNoise(d, W, H, th, kind) {
    const P = th.pal.map(rgbOf);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // two octaves of blocky value noise + a fine dither
      const big = hash(Math.floor(x / 9), Math.floor(y / 9), 3), mid = hash(Math.floor(x / 4), Math.floor(y / 4), 5), fine = hash(x, y, 9);
      let k = big * 0.5 + mid * 0.3 + fine * 0.2;
      let col = P[Math.min(P.length - 1, Math.floor(k * P.length))].slice();
      if (kind === 'sand' && ((y + Math.round(Math.sin(x * 0.07 + Math.floor(y / 11)) * 2.5)) % 11 === 0)) col = col.map(v => v - 18);
      if (kind === 'snow' && fine > 0.985) col = [255, 255, 255];
      if (kind === 'snow' && big < 0.18) col = col.map((v, j) => v - (j === 2 ? 4 : 16));
      if (kind === 'grass' && fine > 0.93) col = col.map((v, j) => v + (j === 1 ? 22 : 8));
      const i = (y * W + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  const P_ = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function pixLine(g, c, x0, y0, x1, y1, w = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    g.fillStyle = c;
    for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w);
  }
  function pixCircle(g, c, cx, cy, r, ry = r) {
    g.fillStyle = c;
    for (let y = -ry; y <= ry; y++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  }
  // pixel people for the crowd
  const SKINS = ['#f6cfa8', '#e9b48a', '#c98d5f', '#8d5a3a', '#f3d9c0'];
  const HAIRS = ['#2b1d14', '#6b3d1f', '#d9a441', '#1e1e2a', '#9a6430', '#c0392b', '#7f8c8d', '#e8e0d0'];
  const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff79b0', '#7f5af0'];
  function personCanvas() {
    const c = newCanvas(9, 15), g = c.getContext('2d');
    const s = pick(SKINS), h = pick(HAIRS), sh = pick(SHIRTS), pa = pick(['#2c3e50', '#34495e', '#5d4037', '#1e272e', '#576574']);
    const hat = Math.random() < 0.25 ? pick(['#c0392b', '#2980b9', '#f39c12', '#ffffff']) : null;
    P_(g, s, 2, 1, 5, 5); P_(g, h, 2, 0, 5, 2); P_(g, h, 1, 1, 1, 4); P_(g, h, 7, 1, 1, 3);
    if (hat) { P_(g, hat, 1, 0, 7, 2); }
    P_(g, '#1a1a22', 3, 3, 1, 1); P_(g, '#1a1a22', 5, 3, 1, 1);
    P_(g, sh, 2, 6, 5, 5); P_(g, sh, 1, 6, 1, 3); P_(g, sh, 7, 6, 1, 3); P_(g, s, 1, 9, 1, 2); P_(g, s, 7, 9, 1, 2);
    P_(g, pa, 2, 11, 5, 3); P_(g, '#1a1a22', 2, 14, 2, 1); P_(g, '#1a1a22', 5, 14, 2, 1);
    outline(c, '#2a1d24');
    return c;
  }
  function umbrella(g, cx, cy, r, c1, c2) {
    P_(g, 'rgba(0,0,0,.28)', cx - r + 3, cy - r * 0.55 + 5, r * 2, r * 1.1);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const a = Math.atan2(y, x), seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8);
      const edge = x * x + y * y > (r - 1) * (r - 1);
      P_(g, edge ? '#3a2a2a' : seg % 2 ? c1 : c2, cx + x, cy + y);
    }
    P_(g, '#3a2a2a', cx, cy, 1, 1);
  }
  function buildingRow(g, W, top) {
    let x = -Math.floor(Math.random() * 20);
    const facades = ['#7d6676', '#725d6d', '#8a7282', '#6c5867', '#80697a'];
    while (x < W) {
      const bw = Math.floor(R(34, 62)), col = pick(facades), h = top - 9;
      P_(g, col, x, 0, bw, h);
      P_(g, '#4a3a48', x, 0, bw, 2); P_(g, '#5a4858', x + bw - 1, 0, 1, h);
      for (let wy = 4; wy < h - 15; wy += 11) for (let wx = x + 4; wx < x + bw - 7; wx += 9) {
        const lit = Math.random() < 0.35;
        P_(g, '#3e3040', wx - 1, wy - 1, 7, 9);
        P_(g, lit ? '#ffd98a' : '#3d4d6e', wx, wy, 5, 7);
        if (lit) P_(g, '#fff1c4', wx + 1, wy + 1, 1, 2); else P_(g, '#55688f', wx, wy, 5, 1);
        P_(g, '#9a8794', wx - 1, wy + 7, 7, 1);
      }
      // ground floor: awning + door/shopfront
      const aw = pick([['#c0392b', '#f5f0e6'], ['#2e8b57', '#f5f0e6'], ['#2c5d9e', '#f5f0e6'], ['#8e44ad', '#f5f0e6']]);
      for (let i = 0; i < bw - 2; i++) { P_(g, Math.floor(i / 3) % 2 ? aw[0] : aw[1], x + 1 + i, h - 13, 1, 4); if (i % 3 === 1) P_(g, Math.floor(i / 3) % 2 ? aw[0] : aw[1], x + 1 + i, h - 9, 1, 1); }
      P_(g, '#2c2230', x + 2, h - 8, bw - 4, 8);
      for (let i = x + 4; i < x + bw - 6; i += 7) P_(g, Math.random() < 0.6 ? '#f6c66a' : '#5d6f96', i, h - 7, 5, 6);
      x += bw;
    }
    // sidewalk strip
    P_(g, '#c4a084', 0, top - 9, W, 9); P_(g, '#a8846a', 0, top - 9, W, 1); P_(g, '#8f6e58', 0, top - 1, W, 1);
    for (let i = 0; i < W; i += 6) P_(g, '#b39176', i, top - 8, 1, 7);
  }
  function towerBase(g, cx, top) {
    const legs = [[-34, -16], [34, 16]];
    for (const [a, b] of legs) {
      for (let k = -2; k <= 2; k++) pixLine(g, k === 0 ? '#9a5a52' : '#6e3b3b', cx + a + k, -2, cx + b + k, top - 6, 1);
      for (let y = 2; y < top - 8; y += 7) {
        const t0 = y / (top - 6), t1 = (y + 7) / (top - 6);
        pixLine(g, '#5a2f30', cx + a + (b - a) * t0 - 2, y, cx + a + (b - a) * t1 + 2, y + 7);
        pixLine(g, '#5a2f30', cx + a + (b - a) * t0 + 2, y, cx + a + (b - a) * t1 - 2, y + 7);
      }
    }
    P_(g, '#6e3b3b', cx - 30, 10, 60, 3); P_(g, '#9a5a52', cx - 30, 10, 60, 1);
  }
  function trees(g, W, top, dark, mid, lite) {
    P_(g, dark, 0, 0, W, top - 6);
    for (let i = 0; i < W / 9; i++) {
      const x = R(-6, W + 6), y = R(-2, top - 14), r = R(7, 13);
      pixCircle(g, '#1f3d1d', x + 1, y + 2, r); pixCircle(g, mid, x, y, r); pixCircle(g, lite, x - r * 0.3, y - r * 0.35, r * 0.45);
    }
    P_(g, '#2f5a2a', 0, top - 8, W, 4);
    for (let i = 0; i < W; i += 4) pixCircle(g, i % 8 ? '#3f7a35' : '#4a8a3c', i, top - 8, 3);
    P_(g, '#7a5a3a', 0, top - 4, W, 4); P_(g, '#5e4430', 0, top - 1, W, 1);
  }
  function seaTop(g, W, top) {
    for (let y = 0; y < top - 8; y++) { const k = y / (top - 8); P_(g, k < 0.3 ? '#2c6aa8' : k < 0.65 ? '#3683c4' : '#4aa0d8', 0, y, W, 1); }
    for (let i = 0; i < W / 3; i++) P_(g, '#bfe6ff', R(0, W), R(0, top - 12), R(2, 6), 1);
    for (let x = 0; x < W; x++) { const y = top - 9 + Math.round(Math.sin(x * 0.18) * 1.5); P_(g, '#ffffff', x, y, 1, 2); P_(g, '#d8f1ff', x, y + 2, 1, 2); }
    for (const px of [W * 0.06, W * 0.94]) {
      pixLine(g, '#8a5a32', px, top + 4, px + 6, top - 26, 3);
      for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; pixLine(g, '#2e8b3a', px + 6, top - 26, px + 6 + Math.cos(an) * 14, top - 26 + Math.sin(an) * 7 + 3, 2); }
    }
  }
  function pinesTop(g, W, top) {
    P_(g, '#2c3e5a', 0, 0, W, top - 6);
    let x = 0;
    while (x < W) {
      if (Math.random() < 0.3) {
        const bw = R(22, 34);
        P_(g, '#6b4f3a', x, top - 26, bw, 20); P_(g, '#e8f1fb', x - 2, top - 30, bw + 4, 5);
        P_(g, '#ffd98a', x + 5, top - 20, 5, 5); P_(g, '#ffd98a', x + bw - 10, top - 20, 5, 5);
        x += bw + 4;
      } else {
        const h = R(18, 30), w = h * 0.55;
        for (let y = 0; y < h; y++) { const ww = w * (y / h); P_(g, y % 6 < 2 ? '#e8f1fb' : '#1f5a3e', x + w - ww, top - 6 - h + y, ww * 2, 1); }
        x += w * 1.6;
      }
    }
    P_(g, '#dce8f5', 0, top - 7, W, 7);
  }
  function lavaTop(g, W, top) {
    P_(g, '#2a1e1c', 0, 0, W, top - 6);
    for (let i = 0; i < W / 4; i++) { P_(g, pick(['#3a2b29', '#33221f', '#45322e']), R(0, W), R(0, top - 22), R(4, 12), R(3, 7)); }
    for (let x = 0; x < W; x++) {
      const y = top - 20 + Math.round(Math.sin(x * 0.05) * 2);
      P_(g, '#ff7a1a', x, y, 1, 8); P_(g, '#ffc44a', x, y + 2, 1, 3);
      if (hash(x, 1) > 0.8) P_(g, '#fff0a0', x, y + 3, 1, 1);
    }
    P_(g, '#1c1312', 0, top - 8, W, 3);
  }
  function sideDecor(g, kind, x, y0, y1) {
    for (let y = y0; y < y1; y += 8) {
      if (kind === 'posts') { P_(g, '#2e2430', x, y, 2, 5); P_(g, '#5a4a58', x, y, 2, 1); if (y + 8 < y1) pixLine(g, '#3e3440', x + 1, y + 4, x + 1, y + 8); }
      else if (kind === 'fence') { P_(g, '#6e4a2a', x, y, 3, 7); P_(g, '#9a6e44', x, y, 3, 1); P_(g, '#6e4a2a', x + 1, y, 1, 8); }
      else if (kind === 'rope') { P_(g, '#8a6a44', x, y, 2, 4); if (y + 8 < y1) pixLine(g, '#e8d8b0', x + 1, y + 2, x + 1, y + 8); }
      else if (kind === 'torches' && (y - y0) % 32 === 0) { P_(g, '#3a2a28', x - 1, y, 4, 8); P_(g, '#ff9a2a', x, y - 3, 2, 3); P_(g, '#ffe08a', x, y - 2, 2, 1); }
    }
  }
  function buildTheme(key) {
    TH = THEMES[key];
    const AW = Math.ceil(VW / PX), AH = Math.ceil(VH / PX);
    bg = newCanvas(AW, AH); front = newCanvas(AW, AH);
    const g = bg.getContext('2d'), fg = front.getContext('2d');
    const img = g.createImageData(AW, AH);
    if (TH.ground === 'fan') groundFan(img.data, AW, AH, TH, 15);
    else if (TH.ground === 'basalt') groundFan(img.data, AW, AH, TH, 11);
    else groundNoise(img.data, AW, AH, TH, TH.ground);
    g.putImageData(img, 0, 0);
    const top = Math.round(AH * (portrait ? 0.15 : 0.215)), bot = Math.round(AH * (portrait ? 0.9 : 0.865));
    // grass tufts / flowers, basalt lava cracks
    if (TH.ground === 'grass') for (let i = 0; i < AW * AH / 90; i++) { const x = R(0, AW), y = R(top, bot); P_(g, '#3f7f35', x, y, 1, 2); P_(g, '#3f7f35', x + 2, y, 1, 2); P_(g, '#78c060', x + 1, y - 1, 1, 2); if (Math.random() < 0.08) P_(g, pick(['#fff', '#ffe066', '#ff8ac4']), x + 4, y - 2, 1, 1); }
    if (TH.ground === 'basalt') for (let i = 0; i < 9; i++) { let x = R(0, AW), y = R(top, bot); for (let s = 0; s < 40; s++) { x += R(-1.5, 1.5); y += R(-1, 1); P_(g, s % 5 ? '#ff6a10' : '#ffd060', x, y, 1, 1); } }
    // worn centre + darker rim (gives the field a soft spotlight)
    const vg = g.createRadialGradient(AW / 2, AH * 0.6, AH * 0.1, AW / 2, AH * 0.6, Math.max(AW, AH) * 0.7);
    vg.addColorStop(0, 'rgba(255,230,190,0.10)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,0,30,0.35)');
    g.fillStyle = vg; g.fillRect(0, 0, AW, AH);
    // old scuffs on the field
    for (let i = 0; i < 14; i++) scorch(g, R(AW * 0.2, AW * 0.8), R(top + 10, bot - 6), R(2, 5), 0.18);
    // top band
    if (TH.top === 'town') { buildingRow(g, AW, top); towerBase(g, Math.round(AW / 2), top); for (let i = 0; i < AW / 40; i++) { const x = R(10, AW - 10); if (Math.abs(x - AW / 2) < 40) continue; cafeTable(g, x, top - 4); } }
    else if (TH.top === 'trees') trees(g, AW, top, '#24461f', '#356b2d', '#4f8f3e');
    else if (TH.top === 'sea') seaTop(g, AW, top);
    else if (TH.top === 'pines') pinesTop(g, AW, top);
    else if (TH.top === 'lava') lavaTop(g, AW, top);
    // sides
    const sx = portrait ? [AW * 0.05, AW * 0.95] : [AW * 0.075, AW * 0.925];
    sx.forEach(x => sideDecor(g, TH.side, Math.round(x), top + 6, bot - 4));
    // bottom: a paved strip with the crowd, planters and umbrellas
    P_(g, TH.edge, 0, bot, AW, AH - bot);
    for (let i = 0; i < AW; i += 5) P_(g, 'rgba(0,0,0,.12)', i, bot + 1, 1, AH - bot);
    P_(g, 'rgba(0,0,0,.25)', 0, bot, AW, 1);
    const cols = [['#d63031', '#f5f0e6'], ['#2d5fa8', '#f5f0e6'], ['#2e8b57', '#f5f0e6'], ['#e17055', '#ffeaa7']];
    const nU = Math.max(2, Math.round(AW / 110));
    for (let i = 0; i < nU; i++) { const c = cols[i % cols.length]; umbrella(fg, Math.round(AW * (i + 0.5) / nU + R(-12, 12)), Math.round(AH - (AH - bot) * 0.45), 9, c[0], c[1]); }
    for (let i = 0; i < AW / 60; i++) { const x = R(8, AW - 8), y = bot + 2; P_(fg, '#6e4a2a', x, y, 10, 4); for (let k = 0; k < 5; k++) P_(fg, pick(['#e84393', '#fdcb6e', '#ff7675', '#a29bfe']), x + 1 + k * 2, y - 2, 1, 2); P_(fg, '#2e8b57', x, y - 1, 10, 1); }
    // crowd
    crowd = [];
    const rowsY = [bot + 9, AH - 2];
    for (const ry of rowsY) for (let x = R(0, 10); x < AW - 6; x += R(10, 19)) if (Math.random() < 0.8) crowd.push({ x, y: ry + R(-2, 2), c: personCanvas(), ph: R(0, 6.28), sp: R(7, 11) });
    if (TH.top === 'town') for (let i = 0; i < AW / 55; i++) { const x = R(8, AW - 8); if (Math.abs(x - AW / 2) > 36) crowd.push({ x, y: top - 6, c: personCanvas(), ph: R(0, 6.28), sp: R(6, 9) }); }
    crowd.sort((a, b) => a.y - b.y);
    // string lights (wires baked, bulbs animated)
    lights = [];
    if (TH.lights) {
      const yTop = top * PX + 6, yBot = bot * PX - 22;
      const xs = portrait ? [[0.1, 0.1], [0.34, 0.4], [0.66, 0.6], [0.9, 0.9]] : [[0.14, 0.14], [0.32, 0.39], [0.68, 0.61], [0.86, 0.86]];
      const strand = (pts) => {
        for (let i = 0; i < pts.length - 1; i++) pixLine(g, 'rgba(50,30,34,.45)', pts[i].x / PX, pts[i].y / PX, pts[i + 1].x / PX, pts[i + 1].y / PX);
        let acc = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const L = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
          for (; acc < L; acc += 21) { const k = acc / L; lights.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k, ph: Math.random() * 6.28, c: Math.random() < 0.15 ? '#ffb3d1' : '#ffe9a8' }); }
          acc -= L;
        }
      };
      for (const [a, b] of xs) { const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push({ x: VW * (a + (b - a) * k) + Math.sin(k * Math.PI) * 10, y: yTop + (yBot - yTop) * k }); } strand(pts); }
      const posts = xs.map(([, b]) => VW * b);
      for (let i = 0; i < posts.length - 1; i++) { const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push({ x: posts[i] + (posts[i + 1] - posts[i]) * t, y: yBot + 26 * (1 - (2 * t - 1) ** 2) }); } strand(pts); }
      for (const x of posts) { P_(g, '#2a2028', x / PX - 1, yBot / PX - 4, 2, 12); P_(g, '#ffe9a8', x / PX - 1, yBot / PX - 6, 3, 3); }
    }
    // scorch / decal layer keeps old marks when rebuilt
    const old = decal;
    decal = newCanvas(AW, AH);
    if (old) decal.getContext('2d').drawImage(old, 0, 0, AW, AH);
  }
  function cafeTable(g, x, y) { P_(g, 'rgba(0,0,0,.25)', x - 3, y + 1, 7, 2); pixCircle(g, '#f2ece2', x, y - 1, 3, 2); P_(g, '#8a7282', x - 6, y - 2, 2, 3); P_(g, '#8a7282', x + 5, y - 2, 2, 3); }
  // dark burnt blotch with dithered rim
  function scorch(g, x, y, r, a = 0.55, col = '20,12,10') {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 1.4; xx <= r * 1.4; xx++) {
      const d = Math.hypot(xx / 1.4, yy) / r;
      if (d > 1 || (d > 0.6 && Math.random() < d - 0.25)) continue;
      g.fillStyle = `rgba(${col},${a * (1 - d * 0.5)})`;
      g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    }
  }
  function addDecal(kind, x, y, s = 1, type) {
    const g = decal.getContext('2d'), ax = x / PX, ay = y / PX;
    if (kind === 'scorch') { scorch(g, ax, ay, 5 * s, 0.6); for (let i = 0; i < 6 * s; i++) { const an = R(0, 6.28), rr = R(3, 8) * s; pixLine(g, 'rgba(25,15,12,.5)', ax, ay, ax + Math.cos(an) * rr * 1.4, ay + Math.sin(an) * rr); } }
    else if (kind === 'crack') { for (let i = 0; i < 5; i++) { let px = ax, py = ay, an = R(0, 6.28); for (let k = 0; k < 7 * s; k++) { const nx = px + Math.cos(an) * 2, ny = py + Math.sin(an) * 1.4; pixLine(g, 'rgba(40,24,16,.6)', px, py, nx, ny); px = nx; py = ny; an += R(-0.7, 0.7); } } scorch(g, ax, ay, 3 * s, 0.35); }
    else if (kind === 'frost') scorch(g, ax, ay, 6 * s, 0.45, '210,240,255');
    else if (kind === 'wet') scorch(g, ax, ay, 6 * s, 0.25, '30,40,70');
    else if (kind === 'goo') scorch(g, ax, ay, 5 * s, 0.4, '110,40,140');
    else if (kind === 'leaf') for (let i = 0; i < 8; i++) P_(g, pick(['#3fa83a', '#6ccf4a', '#24782c']), ax + R(-8, 8), ay + R(-5, 5), 1, 1);
  }

  // ---------------------------------------------------------------------
  //  Pixel trainers (original art, colours from the 3D outfits)
  // ---------------------------------------------------------------------
  function outline(c, col = '#1a1a22') {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    const d = g.getImageData(0, 0, W, H).data;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
    g.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) g.fillRect(x, y, 1, 1);
  }
  function trainerArt(o, pose) {
    const c = newCanvas(18, 30), g = c.getContext('2d');
    const C = n => n == null ? null : hex(n);
    const skin = '#f6cfa8', hair = C(o.hair), top = C(o.top), inner = C(o.inner ?? o.top), legs = C(o.legs), shoes = C(o.shoes), hatC = C(o.hatColor);
    const oy = pose === 'cheer' ? 0 : 1;
    const p = (col, x, y, w = 1, h = 1) => { if (col) P_(g, col, 1 + x, oy + y, w, h); };
    const headDy = pose === 'dismay' ? 1 : 0;
    if (o.hairStyle === 'long') p(hair, 4, 8 + headDy, 8, 8);
    if (o.legStyle === 'pants') { p(legs, 5, 19, 2, 7); p(legs, 9, 19, 2, 7); p(legs, 5, 19, 6, 2); }
    else if (o.legStyle === 'shorts') { p(legs, 5, 19, 6, 3); p(skin, 5, 22, 2, 4); p(skin, 9, 22, 2, 4); }
    else { p(legs, 4, 18, 8, 4); p(skin, 5, 22, 2, 4); p(skin, 9, 22, 2, 4); }
    p(shoes, 4, 26, 3, 2); p(shoes, 9, 26, 3, 2);
    p(top, 4, 12, 8, 7); if (inner !== top) p(inner, 7, 12, 2, 7);
    if (o.scarf) p(C(o.scarf), 4, 11, 8, 2);
    if (o.necklace) p(C(o.necklace), 7, 13, 2, 1);
    if (o.bag) { for (let i = 0; i < 6; i++) p('#5a3a20', 5 + i, 12 + i); p(C(o.bag), 11, 17, 2, 3); }
    const armSeg = i => i >= 6 ? skin : o.sleeves === 'long' ? top : (o.sleeves === 'short' && i < 3) ? top : skin;
    const arm = (x, up) => { for (let i = 0; i < 7; i++) p(armSeg(i), x, up ? 12 - i : 12 + i, 2, 1); };
    arm(2, pose === 'cheer');
    arm(12, pose === 'cheer' || pose === 'throw');
    if (pose === 'throw') { p('#e23b3b', 12, 4, 2, 1); p('#ffffff', 12, 5, 2, 1); }
    const hy = 2 + headDy;
    p(skin, 4, hy + 2, 8, 8);
    p(hair, 4, hy, 8, 4); p(hair, 4, hy + 4, 1, 4); p(hair, 11, hy + 4, 1, 3);
    if (o.hairStyle === 'spiky') for (let x = 3; x < 13; x += 2) p(hair, x, hy - 1, 1, 2);
    if (o.hairStyle === 'pigtails') { p(hair, 2, hy + 5, 2, 4); p(hair, 12, hy + 5, 2, 4); }
    if (pose !== 'dismay') { p('#1a1a22', 8, hy + 6, 1, 2); p('#1a1a22', 10, hy + 6, 1, 2); }
    else { p('#1a1a22', 8, hy + 7, 1, 1); p('#1a1a22', 10, hy + 7, 1, 1); }
    if (pose === 'cheer') p('#b03030', 9, hy + 9, 2, 1);
    switch (o.hat) {
      case 'cap': p(hatC, 4, hy - 1, 8, 4); p(C(o.hatFront), 6, hy, 3, 2); p(hatC, 10, hy + 3, 4, 1); break;
      case 'capback': p(hatC, 4, hy - 1, 8, 4); p(C(o.hatFront), 4, hy + 2, 8, 1); p(hatC, 2, hy + 3, 3, 1); break;
      case 'sunhat': p(hatC, 2, hy + 2, 12, 2); p(hatC, 5, hy - 1, 6, 3); p(C(o.hatBand), 5, hy + 1, 6, 1); break;
      case 'bandana': p(hatC, 4, hy, 8, 3); p('#ffffff', 6, hy + 1, 1, 1); p('#ffffff', 9, hy + 1, 1, 1); p(hatC, 2, hy + 2, 2, 2); break;
      case 'beanie': p(hatC, 4, hy - 1, 8, 4); p(C(o.hatFront), 7, hy - 2, 2, 1); p(C(o.hatFront), 4, hy + 2, 8, 1); break;
    }
    outline(c);
    return c;
  }
  function makeTrainer(p, outfitKey) {
    const o = OUTFITS[outfitKey] || OUTFITS.red;
    const frames = {};
    for (const pose of ['idle', 'throw', 'cheer', 'dismay']) frames[pose] = trainerArt(o, pose);
    // HUD portrait: head and shoulders on a sky tile
    const pc = newCanvas(18, 16), pg = pc.getContext('2d');
    pg.fillStyle = p ? '#ffd1e3' : '#bfe3ff'; pg.fillRect(0, 0, 18, 16);
    pg.drawImage(frames.idle, 0, 1, 18, 16, 0, 0, 18, 16);
    return { p, x: spots.trainer[p].x, y: spots.trainer[p].y, frames, pose: 'idle', poseUntil: 0, portrait: pc.toDataURL(), jump: 0 };
  }
  function trainerPose(p, pose, sec = 1.1) { const t = TR[p]; if (t) { t.pose = pose; t.poseUntil = T + sec; } }
  function drawTrainer(t) {
    const pose = T < t.poseUntil ? t.pose : 'idle';
    const img = t.frames[pose];
    let y = t.y;
    if (pose === 'cheer') y -= Math.abs(Math.sin(T * 9)) * 14;
    else if (pose === 'idle' && Math.floor(T * 1.6 + t.p) % 2) y += 1.5;
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, 22, 7, 0, 0, 6.28); ctx.fill();
    ctx.save();
    ctx.translate(Math.round(t.x), Math.round(y));
    if (t.p === 1) ctx.scale(-1, 1);
    ctx.drawImage(img, -9 * PX, -29 * PX, 18 * PX, 30 * PX);
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  //  Fighters
  // ---------------------------------------------------------------------
  const LEVITATE = new Set(['gengar', 'gengar-mega', 'haunter', 'gastly', 'beldum', 'metang', 'metagross', 'metagross-mega', 'mismagius', 'bronzong', 'latios', 'latias', 'rotom', 'magnemite', 'magneton', 'magnezone', 'koffing', 'weezing', 'misdreavus', 'unown', 'uxie', 'mesprit', 'azelf', 'giratina-origin', 'cresselia', 'flygon', 'vibrava', 'hydreigon', 'mewtwo', 'mew', 'celebi', 'jirachi', 'deoxys', 'dusknoir', 'chandelure', 'lampent', 'litwick', 'porygon-z']);
  class Fighter {
    constructor(p, mon, anim) {
      Object.assign(this, { p, mon, anim, x: 0, y: 0, z: 0, jz: 0, vx: 0, vy: 0, kx: 0, ky: 0, face: p ? -1 : 1, alpha: 1, white: 0, pop: 1, sink: 0,
        state: 'idle', busy: false, cd: R(0.9, 1.6), sleepT: mon.status === 'slp' ? 3 : 0, goal: null, goalT: 0, tick: 3, protectUntil: 0, queued: null, forceMove: null, ready: false, wob: 0, thawT: 0, zT: 0 });
      this.hover = mon.types.includes('Flying') || LEVITATE.has(mon.species) || LEVITATE.has(mon.modelKey) ? 16 : 0;
      this.fit();
    }
    fit() {
      const h = Math.max(this.anim.bh, this.anim.bw * 0.8), th = h <= 85 ? h : 85 + (h - 85) * 0.4;
      this.scale = th / h * SPR;
      this.h = this.anim.bh * this.scale; this.w = this.anim.bw * this.scale;
      this.r = Math.max(20, this.w * 0.34);
    }
    get cx() { return this.x; }
    get cy() { return this.y - this.z - this.h * 0.5; }
    get top() { return this.y - this.z - this.h; }
    get alive() { return this.mon.hp > 0 && this.state === 'idle'; }
    get stuck() { return this.mon.status === 'slp' || this.mon.status === 'frz'; }
    mouth() { return { x: this.x + this.face * this.w * 0.28, y: this.cy - this.h * 0.08 }; }
  }
  const center = f => ({ x: f.cx, y: f.cy });
  const clampField = f => { f.x = clamp(f.x, field.x0, field.x1); f.y = clamp(f.y, field.y0, field.y1); };
  function moveSpeed(f) { return clamp(70 + f.mon.stats.spe * stageMult(f.mon.stages.spe) * 0.45, 80, 175) * (f.mon.status === 'par' ? 0.5 : 1); }
  function pickGoal(f) {
    const foe = foeOf(f);
    for (let i = 0; i < 12; i++) {
      const g = { x: R(field.x0, field.x1), y: R(field.y0, field.y1) };
      if (!foe || foe.state !== 'idle') { if (Math.hypot(g.x - f.x, g.y - f.y) < 260) return g; continue; }
      const d = Math.hypot(g.x - foe.x, g.y - foe.y);
      const want = portrait ? [190, 420] : [240, 520];
      if (d > want[0] && d < want[1] && Math.hypot(g.x - f.x, g.y - f.y) < 300) return g;
    }
    return { x: f.x + R(-60, 60), y: f.y + R(-40, 40) };
  }
  function stepFighter(f, dt) {
    const m = f.mon;
    f.white = Math.max(0, f.white - dt * 5);
    f.wob = Math.max(0, f.wob - dt * 3);
    f.z = (f.hover ? f.hover + Math.sin(T * 3 + f.p * 2) * 4 : 0) + f.jz;
    if (f.state !== 'idle') return;
    // knockback decays; walking toward the current goal when free
    f.x += f.kx * dt; f.y += f.ky * dt;
    const fr = Math.exp(-dt * 7); f.kx *= fr; f.ky *= fr;
    if (!f.busy && !f.stuck && running) {
      f.goalT -= dt;
      if (!f.goal || f.goalT <= 0 || Math.hypot(f.goal.x - f.x, f.goal.y - f.y) < 8) { f.goal = pickGoal(f); f.goalT = R(1.2, 2.6); }
      const dx = f.goal.x - f.x, dy = f.goal.y - f.y, d = Math.hypot(dx, dy);
      if (d > 4) { const s = Math.min(d, moveSpeed(f) * dt); f.x += dx / d * s; f.y += dy / d * s; f.walk = true; } else f.walk = false;
    } else f.walk = false;
    const foe = foeOf(f);
    if (foe && foe.state === 'idle' && !f.dashing && !foe.dashing) {
      const dx = f.x - foe.x, dy = f.y - foe.y, d = Math.hypot(dx, dy) || 1, min = f.r + foe.r + 16;
      if (d < min) { f.x += dx / d * (min - d) * 0.5; f.y += dy / d * (min - d) * 0.5; }
      if (Math.abs(foe.x - f.x) > 10 && !f.dashing) f.face = Math.sign(foe.x - f.x);
    }
    clampField(f);
    if (!running || m.hp <= 0) return;
    // status over time (one "turn" = 3 s)
    if (m.status === 'slp') {
      f.sleepT -= dt;
      if ((f.zT -= dt) <= 0) { f.zT = 0.7; spawn({ bm: 'zzz', c: ['#ffffff', '#cfe3ff', '#8fb3ff'], x: f.x + f.face * f.w * 0.2, y: f.top + 6, vx: R(10, 25) * f.face, vy: -30, life: 1.4, s0: 2, s1: 3, fade: true }); }
      if (f.sleepT <= 0) { m.status = null; text(f, 'WOKE UP!', 'info'); hud(f.p); }
    }
    if ((f.tick -= dt) <= 0) { f.tick = 3; statusTick(f); }
    if (m.status === 'par' && Math.random() < dt * 0.6) spawn({ bm: 'spark', c: ['#fff59a', '#ffffff'], x: f.x + R(-f.w / 2, f.w / 2), y: f.cy + R(-f.h / 3, f.h / 3), life: 0.25, s0: 2, s1: 1 });
    if (m.status === 'brn' && Math.random() < dt * 4) spawn({ bm: 'flame', c: TP.Fire.c.slice(1), x: f.x + R(-f.w / 3, f.w / 3), y: f.cy + R(0, f.h / 3), vy: -45, life: 0.5, s0: 2, s1: 1, ramp: true });
    if (m.status === 'psn' && Math.random() < dt * 3) spawn({ bm: 'bubble', c: ['#d68cf5', '#f6dcff'], x: f.x + R(-f.w / 3, f.w / 3), y: f.cy, vy: -35, life: 0.7, s0: 1, s1: 2 });
  }
  function statusTick(f) {
    const m = f.mon, foe = foeOf(f);
    if (m.status === 'brn' || m.status === 'psn') {
      const amt = Math.max(1, Math.floor(m.maxhp / (m.status === 'brn' ? 16 : 8)));
      m.hp = Math.max(0, m.hp - amt); f.white = 0.6;
      number(f, amt, 0, m.status === 'brn' ? 'burn' : 'psn');
      burst(center(f), m.status === 'brn' ? 'Fire' : 'Poison', 0.6);
      hud(f.p);
      if (m.hp <= 0) return koFighter(f);
    }
    if (m.vol.seed) {
      const amt = Math.max(1, Math.floor(m.maxhp / 8));
      m.hp = Math.max(0, m.hp - amt); f.white = 0.6;
      number(f, amt, 0, 'psn');
      if (foe && foe.alive) {
        foe.mon.hp = Math.min(foe.mon.maxhp, foe.mon.hp + amt);
        const a = center(f), b = center(foe);
        for (let i = 0; i < 6; i++) spawn({ bm: 'plus', c: ['#7be35a', '#e6ffd0'], x: a.x, y: a.y, life: 0.7, delay: i * 0.06, s0: 2, s1: 2, path: k => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 40 }) });
        hud(foe.p);
      }
      hud(f.p);
      if (m.hp <= 0) return koFighter(f);
    }
    if (m.vol.trap) {
      const amt = Math.max(1, Math.floor(m.maxhp / 8));
      m.hp = Math.max(0, m.hp - amt); f.white = 0.6;
      number(f, amt, 0);
      ringFx(f.x, f.y, 10, f.r * 1.6, tp('Normal').c[2], 0.5);
      if (--m.vol.trap <= 0) { delete m.vol.trap; text(f, 'BREAKS FREE!', 'info'); }
      hud(f.p);
      if (m.hp <= 0) return koFighter(f);
    }
    m.vol.flinch = false;
    m.turnsOut++;
  }

  // ---------------------------------------------------------------------
  //  Effect primitives (pixel particles, beams, bolts, rings, projectiles)
  // ---------------------------------------------------------------------
  // particle: {x,y,z,vx,vy,vz,g,life,delay,s0,s1,c:[colours],bm|sq,ramp,fade,add,path(k),drag,rot}
  function spawn(o) { o.age = -(o.delay || 0); o.z = o.z || 0; parts.push(o); return o; }
  function burst(at, type, power = 1, o = {}) {
    const P = tp(type), n = Math.round(14 * power);
    for (let i = 0; i < n; i++) {
      const an = R(0, 6.28), sp = R(60, 230) * power;
      spawn({ bm: o.bm || P.bm, c: P.c, x: at.x, y: at.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.75 - 30, drag: 3, life: R(0.35, 0.7), s0: power > 1.2 ? 3 : 2, s1: 1, ramp: true });
    }
    for (let i = 0; i < n * 0.7; i++) { const an = R(0, 6.28), sp = R(80, 260) * power; spawn({ sq: 1, c: P.c, x: at.x, y: at.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.75, drag: 4, life: R(0.2, 0.45), s0: 2, s1: 1, ramp: true, add: true }); }
  }
  function smoke(at, n = 6, col = ['#6a5a58', '#8a7a76', '#4a3e3c'], s = 3) {
    for (let i = 0; i < n; i++) spawn({ bm: 'smoke', c: col, x: at.x + R(-14, 14), y: at.y + R(-8, 8), vx: R(-20, 20), vy: R(-40, -15), drag: 1.5, life: R(0.6, 1.1), s0: s, s1: s + 1, fade: true, under: false });
  }
  function star(at, type, size = 4, life = 0.28) {
    const P = tp(type);
    shapes.push({ kind: 'boom', x: at.x, y: at.y, c: [P.c[1], P.c[0], P.c[3]], s: size, life, age: 0 });
  }
  function ringFx(x, y, r0, r1, col, life = 0.45, o = {}) { rings.push({ x, y, r0, r1, col, life, age: -(o.delay || 0), flat: o.flat ?? 0.45, w: o.w || 1 }); }
  function flash(col = '#fff', a = 0.5) { flashCol = col; flashA = Math.max(flashA, a); }
  function shakeIt(a) { shake = Math.max(shake, a); }
  function beamFx(o) { o.age = 0; o.len = 0; beams.push(o); return o; }
  function boltFx(o) { o.age = 0; o.seed = 0; bolts.push(o); return o; }
  // projectile homing on a fighter (or flying past it on a miss); resolves on arrival
  function shoot(o) {
    return new Promise(res => { o.res = res; o.age = 0; o.trailT = 0; projs.push(o); });
  }
  function stepFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age < 0) continue;
      if (q.age >= q.life) { parts.splice(i, 1); continue; }
      if (q.path) { const pt = q.path(q.age / q.life); q.x = pt.x; q.y = pt.y; if (pt.z !== undefined) q.z = pt.z; continue; }
      if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; }
      q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt;
      if (q.vz !== undefined) { q.vz -= (q.g || 0) * dt; q.z += q.vz * dt; if (q.z < 0) { q.z = 0; q.vz *= -0.3; } }
    }
    for (let i = projs.length - 1; i >= 0; i--) {
      const o = projs[i];
      o.age += dt;
      const tgt = o.toPt || (o.to && o.to.state === 'idle' ? { x: o.to.cx + (o.miss ? o.missOff : 0), y: o.to.cy + (o.miss ? o.missOff * 0.4 : 0) } : o.last);
      if (tgt) o.last = tgt;
      const dx = o.last.x - o.x, dy = o.last.y - o.y, d = Math.hypot(dx, dy);
      const step = o.speed * dt;
      if (d <= step + 2) { o.x = o.last.x; o.y = o.last.y; projs.splice(i, 1); o.res(o); continue; }
      o.x += dx / d * step; o.y += dy / d * step;
      o.arcK = o.arc ? Math.sin(Math.min(1, o.age * o.speed / (o.dist0 || (o.dist0 = d + step * 1))) * Math.PI) * o.arc : 0;
      if ((o.trailT -= dt) <= 0 && o.trail) { o.trailT = 0.016; o.trail(o); }
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.age += dt;
      if (b.from && b.from.state === 'idle') { const m = b.from.mouth(); b.ax = m.x; b.ay = m.y; }
      if (b.to && b.to.state === 'idle' && !b.stopAt) { b.bx = b.to.cx; b.by = b.to.cy; }
      const full = Math.hypot(b.bx - b.ax, b.by - b.ay), maxL = b.stopAt ? b.stopAt * full : full;
      b.len = Math.min(maxL, b.len + 1700 * dt);
      if (!b.reached && b.len >= maxL - 1) { b.reached = true; b.onReach && b.onReach(); }
      if (b.age > b.life) { beams.splice(i, 1); continue; }
      if (Math.random() < dt * 30) {
        const k = Math.random() * b.len / Math.max(1, full), x = b.ax + (b.bx - b.ax) * k, y = b.ay + (b.by - b.ay) * k;
        spawn({ bm: b.bm || 'spark', c: b.c, x, y, vx: R(-50, 50), vy: R(-60, 20), life: 0.4, s0: 2, s1: 1, ramp: true });
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.age += dt; if (b.age > b.life) bolts.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.age += dt; if (r.age > r.life) rings.splice(i, 1); }
    for (let i = shapes.length - 1; i >= 0; i--) { const s = shapes[i]; s.age += dt; if (s.vx) { s.x += s.vx * dt; s.y += s.vy * dt; } if (s.age > s.life) shapes.splice(i, 1); }
    shake = Math.max(0, shake - dt * 30);
    flashA = Math.max(0, flashA - dt * 2.5);
  }
  function drawBm(name, c, x, y, s, flip = false, rot = 0) {
    const img = bmCanvas(name, c[0], c[1] || c[0], c[2] || c[1] || c[0]);
    const w = img.width * s * PX / 2, h = img.height * s * PX / 2;
    if (!flip && !rot) { ctx.drawImage(img, sn(x - w / 2), sn(y - h / 2), w, h); return; }
    ctx.save(); ctx.translate(sn(x), sn(y)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
  }
  function drawParticle(q) {
    const k = q.age / q.life;
    const s = Math.max(1, Math.round(q.s0 + (q.s1 - q.s0) * k));
    let c = q.c;
    if (q.ramp) { const i = Math.min(c.length - 1, Math.floor(k * c.length)); c = [c[i], c[Math.max(0, i - 1)], c[Math.min(c.length - 1, i + 1)]]; }
    ctx.globalAlpha = q.fade ? Math.min(1, (1 - k) * 1.6) : 1;
    if (q.add) ctx.globalCompositeOperation = 'lighter';
    const y = q.y - (q.z || 0);
    if (q.sq) { ctx.fillStyle = c[0]; const w = s * PX; ctx.fillRect(sn(q.x - w / 2), sn(y - w / 2), w, w); }
    else drawBm(q.bm, c, q.x, y, s, q.flip, q.rot ? q.rot + (q.spin || 0) * q.age : 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  function pixRing(x, y, r, flat, col, w = 1) {
    const n = Math.max(12, Math.floor(r * 6.28 / PX));
    ctx.fillStyle = col;
    const s = PX * w;
    for (let i = 0; i < n; i++) { const a = i / n * 6.28; ctx.fillRect(sn(x + Math.cos(a) * r - s / 2), sn(y + Math.sin(a) * r * flat - s / 2), s, s); }
  }
  function drawBeam(b) {
    const full = Math.hypot(b.bx - b.ax, b.by - b.ay) || 1;
    const ex = b.ax + (b.bx - b.ax) * b.len / full, ey = b.ay + (b.by - b.ay) * b.len / full;
    const fade = Math.min(1, (b.life - b.age) / 0.18);
    const w = b.w * (1 + Math.sin(T * 45) * 0.1) * fade;
    const ang = Math.atan2(ey - b.ay, ex - b.ax);
    ctx.save();
    ctx.translate(b.ax, b.ay); ctx.rotate(ang);
    const L = Math.hypot(ex - b.ax, ey - b.ay);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35; ctx.fillStyle = b.c[2]; ctx.fillRect(0, -w * 1.1, L, w * 2.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.c[3]; ctx.fillRect(0, -w * 0.62, L, w * 1.24);
    ctx.fillStyle = b.c[1]; ctx.fillRect(0, -w * 0.45, L, w * 0.9);
    ctx.fillStyle = b.c[0]; ctx.fillRect(0, -w * 0.2, L, w * 0.4);
    // segmented crystals (ice) / rings (hyper beam) along the beam
    if (b.deco === 'ice') for (let s = 18; s < L; s += 26) { ctx.save(); ctx.translate(s, Math.sin(s * 0.3 + T * 8) * 3); ctx.rotate(0.785); ctx.fillStyle = '#ffffff'; ctx.fillRect(-w * 0.45, -w * 0.45, w * 0.9, w * 0.9); ctx.fillStyle = b.c[2]; ctx.fillRect(-w * 0.3, -w * 0.3, w * 0.6, w * 0.6); ctx.restore(); }
    if (b.deco === 'rings') for (let s = (T * 400) % 60; s < L; s += 60) { ctx.fillStyle = b.c[0]; ctx.fillRect(s, -w * 0.9, PX * 2, w * 1.8); }
    ctx.restore();
    // glowing source and head
    const head = Math.max(PX * 3, w * 0.9);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = b.c[1]; ctx.globalAlpha = 0.6;
    ctx.fillRect(sn(b.ax - head), sn(b.ay - head), head * 2, head * 2);
    ctx.fillRect(sn(ex - head), sn(ey - head), head * 2, head * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = b.c[0]; ctx.fillRect(sn(ex - head * 0.6), sn(ey - head * 0.6), head * 1.2, head * 1.2);
  }
  function drawBolt(b) {
    const segs = b.segs || 9;
    if (!b.pts || T - (b.ptT || 0) > 0.05) {
      b.ptT = T; b.pts = [];
      for (let i = 0; i <= segs; i++) { const k = i / segs, off = i === 0 || i === segs ? 0 : R(-1, 1) * b.jag; b.pts.push({ x: b.ax + (b.bx - b.ax) * k + off * (b.by - b.ay) / (Math.hypot(b.bx - b.ax, b.by - b.ay) || 1), y: b.ay + (b.by - b.ay) * k - off * (b.bx - b.ax) / (Math.hypot(b.bx - b.ax, b.by - b.ay) || 1) }); }
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < b.pts.length - 1; i++) {
      const a = b.pts[i], c = b.pts[i + 1];
      const n = Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / PX);
      ctx.fillStyle = pass ? b.c[0] : b.c[2];
      const s = pass ? PX : PX * 3;
      if (!pass) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; }
      for (let j = 0; j <= n; j++) ctx.fillRect(sn(a.x + (c.x - a.x) * j / n - s / 2), sn(a.y + (c.y - a.y) * j / n - s / 2), s, s);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  function drawProj(o) {
    const y = o.y - (o.arcK || 0);
    if (o.bm) { drawBm(o.bm, o.c, o.x, y, o.s || 3, o.flip, o.spin ? o.age * o.spin : 0); return; }
    const r = o.r || 12, P = o.c;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.fillStyle = P[2];
    ctx.beginPath(); ctx.arc(o.x, y, r * 1.7, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // pixel orb: dark rim, main, light core
    const g = (rr, c) => { ctx.fillStyle = c; for (let yy = -rr; yy <= rr; yy += PX) { const w = Math.sqrt(Math.max(0, rr * rr - yy * yy)); ctx.fillRect(sn(o.x - w), sn(y + yy), sn(w * 2) || PX, PX); } };
    g(r, P[3]); g(r * 0.8, P[2]); g(r * 0.5, P[1]); g(r * 0.22, P[0]);
  }
  function drawShape(s) {
    const k = s.age / s.life;
    if (s.kind === 'boom') { const sc = s.s * (k < 0.3 ? 0.6 + k * 1.6 : 1.1 - (k - 0.3) * 0.4); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; drawBm('boom', s.c, s.x, s.y, sc, false, s.rot || 0); ctx.globalAlpha = 1; }
    else if (s.kind === 'slash') {
      const L = s.len * Math.min(1, k * 4), fade = k > 0.5 ? (1 - k) * 2 : 1;
      ctx.globalAlpha = fade;
      for (let pass = 0; pass < 2; pass++) {
        const n = Math.ceil(L / PX), w = pass ? PX : PX * 2.5;
        ctx.fillStyle = pass ? '#ffffff' : s.col;
        for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), cw = w * Math.sin(Math.PI * t) + PX * 0.5; ctx.fillRect(sn(s.x + Math.cos(s.a) * (i * PX - s.len / 2) - cw / 2), sn(s.y + Math.sin(s.a) * (i * PX - s.len / 2) + Math.sin(t * Math.PI) * s.bend - cw / 2), cw, cw); }
      }
      ctx.globalAlpha = 1;
    } else if (s.kind === 'pillar') {
      // flame tongues rising out of the ground (Overheat / Lava Plume style)
      const hgt = s.h * (k < 0.25 ? k / 0.25 : 1) * (k > 0.75 ? (1 - k) / 0.25 : 1);
      for (let i = 0; i < s.n; i++) {
        const ox = (i / (s.n - 1) - 0.5) * s.w, hh = hgt * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + T * 14)));
        const cols = s.c;
        for (let j = 0; j < 4; j++) {
          const ww = (s.w / s.n) * (1 - j * 0.22), h2 = hh * (1 - j * 0.2);
          ctx.fillStyle = cols[3 - j];
          ctx.fillRect(sn(s.x + ox - ww / 2), sn(s.y - h2), sn(ww) || PX, sn(h2));
        }
      }
    } else if (s.kind === 'shield') {
      const f = s.f; if (!f || f.state !== 'idle' || T > f.protectUntil) { s.age = s.life; return; }
      const r = Math.max(f.w, f.h) * 0.62;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(T * 12) * 0.08;
      ctx.fillStyle = '#5affb0'; ctx.beginPath(); ctx.arc(f.cx, f.cy, r, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      pixRing(f.cx, f.cy, r, 1, '#b6ffd9', 1);
    } else if (s.kind === 'spike') {
      const hh = s.h * Math.min(1, k * 5) * (k > 0.7 ? (1 - k) / 0.3 : 1);
      for (let yy = 0; yy < hh; yy += PX) {
        const w = Math.max(PX, (1 - yy / hh) * 16);
        ctx.fillStyle = s.c[3]; ctx.fillRect(sn(s.x - w / 2), sn(s.y - yy), sn(w) || PX, PX);
        ctx.fillStyle = s.c[1]; ctx.fillRect(sn(s.x - w / 2), sn(s.y - yy), sn(w / 2) || PX, PX);
      }
    } else if (s.kind === 'arc') {
      const r = 10 + k * 46, span = s.full ? Math.PI : 0.95, n = Math.max(6, Math.floor(r * span * 2 / PX));
      ctx.globalAlpha = 1 - k; ctx.fillStyle = s.col;
      for (let i = 0; i <= n; i++) { const a = s.a - span + (span * 2) * i / n; ctx.fillRect(sn(s.x + Math.cos(a) * r - PX), sn(s.y + Math.sin(a) * r - PX), PX * 2, PX * 2); }
      ctx.globalAlpha = 1;
    } else if (s.kind === 'jaws') {
      const gap = s.r * (1 - Math.min(1, k * 3));
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      for (const sgn of [-1, 1]) for (let i = -3; i <= 3; i++) drawBm('shard', ['#ffffff', '#ffffff', '#c9d6e3'], s.x + i * 9, s.y + sgn * (gap + 6), 2, false, sgn > 0 ? Math.PI : 0);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------
  //  Rendering
  // ---------------------------------------------------------------------
  function drawFighter(f) {
    const m = f.mon;
    const filter = m.status === 'frz' ? 'saturate(0.35) brightness(1.3) hue-rotate(160deg)' : m.status === 'psn' ? 'saturate(1.2) hue-rotate(-25deg)' : null;
    const t = m.status === 'frz' || m.status === 'slp' ? 0.4 : T * (m.status === 'par' ? 0.5 : 1);
    const sy = 1 + Math.sin(T * 38) * 0.12 * f.wob;
    const jit = f.white > 0.5 ? R(-2, 2) : 0;
    drawSprite(f.anim, t + f.p * 0.37, f.x + jit, f.y - f.z + f.sink * f.h * 0.25, f.scale * (0.2 + 0.8 * f.pop) * (1 - f.sink * 0.15), f.face > 0,
      { alpha: f.alpha, white: Math.min(1, f.white), filter, sy });
  }
  function render() {
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    if (shake > 0) ctx.translate(R(-shake, shake), R(-shake, shake));
    const BW = bg.width * PX, BH = bg.height * PX;
    ctx.drawImage(bg, 0, 0, BW, BH);
    ctx.drawImage(decal, 0, 0, BW, BH);
    for (const r of rings) {
      if (r.age < 0) continue;
      const k = r.age / r.life, rr = r.r0 + (r.r1 - r.r0) * easeOut(k);
      ctx.globalAlpha = 1 - k;
      pixRing(r.x, r.y, rr, r.flat, r.col, r.w);
    }
    ctx.globalAlpha = 1;
    // shadows, then trainers + Pokémon sorted by depth
    for (const f of F) if (f && f.state !== 'gone') {
      ctx.fillStyle = `rgba(0,0,0,${0.3 * f.alpha})`;
      const rx = f.w * 0.36 * (f.hover ? 0.75 : 1) * (0.2 + 0.8 * f.pop);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, rx * 0.32, 0, 0, 6.28); ctx.fill();
    }
    const objs = [];
    for (const t of TR) if (t) objs.push({ y: t.y, d: () => drawTrainer(t) });
    for (const f of F) if (f && f.state !== 'gone') objs.push({ y: f.y, d: () => drawFighter(f) });
    objs.sort((a, b) => a.y - b.y).forEach(o => o.d());
    for (const s of shapes) if (s.kind === 'pillar' || s.kind === 'spike') drawShape(s);
    for (const q of parts) if (q.age >= 0) drawParticle(q);
    for (const o of projs) drawProj(o);
    for (const b of beams) drawBeam(b);
    for (const b of bolts) drawBolt(b);
    for (const s of shapes) if (s.kind !== 'pillar' && s.kind !== 'spike') drawShape(s);
    // crowd (cheers when something big happens) + umbrellas/planters in front
    for (const c of crowd) {
      const bob = Math.max(0, Math.sin(T * c.sp + c.ph)) * (0.3 + cheer * 3.2);
      ctx.drawImage(c.c, Math.round(c.x) * PX, (Math.round(c.y - 15 - bob)) * PX, 9 * PX, 15 * PX);
    }
    ctx.drawImage(front, 0, 0, BW, BH);
    if (lights.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const tw2 = 0.65 + 0.35 * Math.sin(T * 2.5 + l.ph);
        ctx.globalAlpha = 0.16 * tw2; ctx.fillStyle = l.c; ctx.fillRect(sn(l.x) - 6, sn(l.y) - 6, 12, 12);
        ctx.globalAlpha = 0.85 * tw2; ctx.fillRect(sn(l.x) - 1.5, sn(l.y) - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (flashA > 0) { ctx.globalAlpha = flashA; ctx.fillStyle = flashCol; ctx.fillRect(-20, -20, VW + 40, VH + 40); ctx.globalAlpha = 1; }
  }
  function ambient(dt) {
    if (!TH || !TH.amb) return;
    const rate = { firefly: 3, snow: 26, ember: 9 }[TH.amb];
    let n = rate * dt; while (n > 0) {
      if (Math.random() < n) {
        if (TH.amb === 'snow') spawn({ sq: 1, c: ['#ffffff'], x: R(0, VW), y: R(-20, VH * 0.3), vx: R(-15, 15), vy: R(40, 75), life: R(6, 12), s0: 1, s1: 1, fade: true });
        else if (TH.amb === 'ember') spawn({ sq: 1, c: ['#ffd060', '#ff8a2a', '#ff5010'], ramp: true, add: true, x: R(0, VW), y: R(VH * 0.4, VH), vx: R(-10, 10), vy: R(-50, -25), life: R(2, 4), s0: 1, s1: 1, fade: true });
        else spawn({ sq: 1, c: ['#eaff8a'], add: true, x: R(field.x0, field.x1), y: R(field.y0, field.y1), vx: R(-12, 12), vy: R(-12, 12), life: R(2, 4), s0: 1, s1: 1, fade: true });
      }
      n -= 1;
    }
  }

  // ---------------------------------------------------------------------
  //  HUD (crisp DOM over the canvas) + floating text
  // ---------------------------------------------------------------------
  const STAGE_LBL = { atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE', acc: 'ACC', eva: 'EVA' };
  const STATUS_WORD = { brn: 'BURNED!', psn: 'POISONED!', par: 'PARALYZED!', slp: 'FELL ASLEEP!', frz: 'FROZEN SOLID!' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function buildHud() {
    hudEl.innerHTML = [0, 1].map(p => `
      <div class="rp p${p}" id="rp${p}">
        <div class="por"><img alt=""></div>
        <div class="nm"></div>
        <div class="chips"></div>
        <div class="hp"><div class="lag"></div><div class="fill"></div><span class="num"></span></div>
        <div class="tr"><img alt="" src="${TR[p].portrait}"></div>
        <div class="party"></div>
        <div class="pill"></div>
      </div>`).join('') + '<div class="rtimer" id="rTimer">0:00</div><div class="rctl" id="rCtl"></div>';
    const ctl = document.getElementById('rCtl');
    [0, 1].forEach(p => {
      if (controllers[p] !== 'human') return;
      const row = document.createElement('div');
      row.className = 'rrow p' + p; row.id = 'rrow' + p;
      ctl.append(row);
    });
    lastTimer = -1;
  }
  let lastTimer = -1;
  function humanRow(p) {
    const row = document.getElementById('rrow' + p);
    if (!row) return;
    const m = active(p);
    row.innerHTML = m.moves.map((mv, i) => `<button class="rmv" data-i="${i}" style="--c:${TYPE_COLORS[mv.type] || '#888'}" ${mv.ppLeft <= 0 ? 'disabled' : ''}><b>${i + 1}</b> ${esc(mv.name)}<small>${mv.ppLeft}/${mv.pp}</small></button>`).join('');
    row.querySelectorAll('.rmv').forEach(b => b.onclick = () => queueMove(p, +b.dataset.i));
  }
  function queueMove(p, i) {
    const f = F[p], m = active(p);
    if (!f || f.state !== 'idle' || !m.moves[i] || m.moves[i].ppLeft <= 0) return;
    f.queued = i;
    document.querySelectorAll(`#rrow${p} .rmv`).forEach(b => b.classList.toggle('q', +b.dataset.i === i));
  }
  function hud(p) {
    if (p === undefined) { hud(0); hud(1); return; }
    const el = document.getElementById('rp' + p);
    if (!el || !state) return;
    const pl = state.players[p], m = pl.team[pl.active];
    const img = el.querySelector('.por img');
    if (img.getAttribute('src') !== m.sprite) img.setAttribute('src', m.sprite);
    const por = el.querySelector('.por');
    por.style.borderColor = TYPE_COLORS[m.types[0]];
    por.classList.toggle('dead', m.hp <= 0);
    el.querySelector('.nm').textContent = m.name;
    const chips = m.types.map(t => `<span class="chip" style="background:${TYPE_COLORS[t]}">${t.toUpperCase()}</span>`);
    if (m.isMega) chips.push('<span class="chip mega">MEGA</span>');
    if (m.status) chips.push(`<span class="chip" style="background:${STATUS_INFO[m.status].color}">${STATUS_INFO[m.status].label}</span>`);
    if (m.vol.conf) chips.push('<span class="chip" style="background:#d946ef">CNF</span>');
    for (const k of Object.keys(STAGE_LBL)) { const v = m.stages[k]; if (v) chips.push(`<span class="chip ${v > 0 ? 'up' : 'down'}">${STAGE_LBL[k]}${v > 0 ? '+' : ''}${v}</span>`); }
    el.querySelector('.chips').innerHTML = chips.join('');
    const pct = clamp(m.hp / m.maxhp * 100, 0, 100);
    const fill = el.querySelector('.fill');
    fill.style.width = pct + '%';
    fill.style.backgroundColor = pct > 50 ? '#3ddc68' : pct > 20 ? '#f5c518' : '#ef4444';
    el.querySelector('.lag').style.width = pct + '%';
    el.querySelector('.num').textContent = Math.max(0, Math.ceil(m.hp));
    el.querySelector('.party').innerHTML = pl.team.map((x, i) => `<i class="ball ${x.hp <= 0 ? 'dead' : ''} ${i === pl.active ? 'on' : ''}"></i>`).join('') + `<b class="tn">${esc(PLAYER[p])}</b>`;
    if (controllers[p] === 'human') humanRow(p);
  }
  function pill(p, name) {
    const el = document.querySelector(`#rp${p} .pill`);
    if (!el) return;
    el.textContent = name + '!';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    const tk = token;
    clearTimeout(el._t);
    el._t = setTimeout(() => { if (tk === token) el.classList.remove('show'); }, 1800);
  }
  function floatAt(x, y, html, cls, ms = 1100) {
    const el = document.createElement('div');
    el.className = 'rf ' + cls; el.innerHTML = html;
    el.style.left = `calc(var(--u) * ${x.toFixed(1)})`; el.style.top = `calc(var(--u) * ${y.toFixed(1)})`;
    fxEl.append(el);
    later(() => el.remove(), ms);
    return el;
  }
  const stacks = [{ t: -9, n: 0 }, { t: -9, n: 0 }];
  function text(f, s, cls = 'info') {
    const st = stacks[f.p];
    if (T - st.t > 0.7) st.n = 0;
    st.t = T;
    const n = st.n++;
    floatAt(clamp(f.x, 120, VW - 120), Math.max(f.top - 22 - n * 30, VH * 0.25), s, cls, 1300);
  }
  function number(f, amt, i = 0, kind = '') { floatAt(f.x + R(-16, 16) + i * 12, f.cy - 4 - i * 14, String(amt), 'dmg ' + kind, 1000); }
  function big(s, cls = '', ms = 2200) {
    const el = document.createElement('div');
    el.className = 'rbig ' + cls; el.textContent = s;
    fxEl.append(el);
    later(() => el.remove(), ms);
  }
  function speech(p, s, ms = 1600) { const t = TR[p]; if (t && s) floatAt(clamp(t.x, 110, VW - 110), t.y - 112, esc(s), 'rgo', ms); }

  // ---------------------------------------------------------------------
  //  Move -> effect style (same groups as the 3D effects)
  // ---------------------------------------------------------------------
  const GROUP = {
    stream: 'flamethrower hydro-pump water-gun dragon-breath acid-spray powder-snow icy-wind gust incinerate scald mud-shot sludge smog fire-pledge water-pledge flame-wheel bubble'.split(' '),
    beam: 'ice-beam aurora-beam psybeam signal-beam charge-beam flash-cannon dragon-pulse solar-beam hyper-beam bubble-beam power-gem tri-attack mirror-shot steel-beam origin-pulse dark-pulse'.split(' '),
    'orb:big': 'fire-blast focus-blast zap-cannon draco-meteor inferno blast-burn'.split(' '),
    orb: 'shadow-ball energy-ball aura-sphere sludge-bomb electro-ball moonblast water-pulse mist-ball weather-ball seed-bomb mud-bomb ice-ball gyro-ball dragon-rage night-shade psyshock psychic confusion ember extrasensory'.split(' '),
    bolt: 'thunderbolt thunder-shock discharge shock-wave parabolic-charge nuzzle'.split(' '),
    sky: 'thunder'.split(' '),
    quake: 'earthquake bulldoze magnitude stomping-tantrum fissure'.split(' '),
    rockslide: 'rock-slide rock-throw rock-tomb ancient-power smack-down rock-blast'.split(' '),
    spikes: 'stone-edge icicle-crash precipice-blades'.split(' '),
    geyser: 'earth-power eruption lava-plume overheat'.split(' '),
    wave: 'surf muddy-water heat-wave blizzard'.split(' '),
    sound: 'hyper-voice bug-buzz uproar round echoed-voice boomburst disarming-voice snarl'.split(' '),
    wind: 'hurricane twister air-cutter whirlwind'.split(' '),
    multi: 'bullet-seed pin-missile icicle-spear swift razor-leaf magical-leaf petal-dance leaf-storm water-shuriken ice-shard spike-cannon twineedle scale-shot barrage'.split(' '),
    vortex: 'fire-spin whirlpool sand-tomb wrap bind infestation'.split(' '),
    drain: 'absorb mega-drain giga-drain leech-life draining-kiss horn-leech'.split(' '),
    'contact:jaws': 'bite crunch hyper-fang super-fang fire-fang ice-fang thunder-fang poison-fang psychic-fangs jaw-lock'.split(' '),
    'contact:claws': 'scratch slash night-slash x-scissor leaf-blade psycho-cut cross-poison fury-cutter sacred-sword shadow-claw dragon-claw metal-claw crush-claw false-swipe cut air-slash aerial-ace razor-shell fury-swipes'.split(' '),
    'contact:tail': 'iron-tail aqua-tail dragon-tail poison-tail slam tail-slap'.split(' ')
  };
  const LOOKUP = {};
  for (const [style, ids] of Object.entries(GROUP)) for (const id of ids) LOOKUP[id] = style;
  const RECHARGE = new Set(['hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'roar-of-time', 'rock-wrecker', 'prismatic-laser']);
  function classify(mv) {
    const id = mv.id;
    if (LOOKUP[id]) return LOOKUP[id];
    if (mv.cat === 'status') {
      if (mv.ailment === 'protect') return 'shield';
      if (id === 'rest' || mv.healing > 0) return 'heal';
      if (id === 'leech-seed') return 'seed';
      if (id === 'will-o-wisp') return 'wisp';
      if (id === 'thunder-wave' || id === 'glare') return 'twave';
      if (id === 'toxic') return 'toxic';
      if (['sleep-powder', 'stun-spore', 'poison-powder', 'spore', 'cotton-spore', 'sweet-scent'].includes(id)) return 'powder';
      if (['growl', 'screech', 'supersonic', 'sing', 'metal-sound', 'noble-roar', 'roar', 'perish-song'].includes(id)) return 'sound';
      if (['hypnosis', 'confuse-ray', 'yawn', 'swagger', 'flatter'].includes(id) || mv.ailment === 'sleep' || mv.ailment === 'confusion') return 'hypno';
      if (mv.target === 'user' || mv.target === 'users-field') return mv.stats.length ? 'buff' : 'generic';
      if (['charm', 'sweet-kiss', 'baby-doll-eyes', 'captivate', 'attract'].includes(id)) return 'debuff:hearts';
      return 'debuff';
    }
    if (/punch|palm|jab|hammer|arm-thrust|mash|uppercut|chop|smash/.test(id)) return 'contact:fist';
    if (/kick|stomp|knee/.test(id)) return 'contact:kick';
    if (/fang|bite|crunch/.test(id)) return 'contact:jaws';
    if (/claw|slash|scissor|cut|blade|swipe|sword/.test(id)) return 'contact:claws';
    if (/tail/.test(id)) return 'contact:tail';
    if (mv.cat === 'physical') return 'contact:charge';
    if (/beam|cannon|ray/.test(id)) return 'beam';
    if (/voice|sound|buzz|song/.test(id)) return 'sound';
    if (/wave|storm/.test(id)) return 'wave';
    if (/wind|gust/.test(id)) return 'wind';
    return 'orb';
  }

  // ---------------------------------------------------------------------
  //  Move effects. Each calls hit() at the moment of impact.
  // ---------------------------------------------------------------------
  const PAL = m => tp(m.type || 'Normal');
  const side = () => (Math.random() < 0.5 ? -1 : 1);
  async function charge(f, m, sec = 0.3) {
    const P = PAL(m);
    for (let i = 0; i < 14; i++) {
      const an = R(0, 6.28), r = R(26, 50);
      spawn({ sq: 1, c: P.c, add: true, x: 0, y: 0, life: sec, delay: i * sec / 18, s0: 2, s1: 1, path: k => { const mo = f.mouth(); return { x: mo.x + Math.cos(an) * r * (1 - k), y: mo.y + Math.sin(an) * r * (1 - k) }; } });
    }
    await wait(sec * 1000);
  }
  const S = {};
  S.orb = async (f, d, m, o, hit, big = false) => {
    const P = PAL(m);
    await charge(f, m, big ? 0.45 : 0.25);
    if (!on) return;
    SFX.whoosh();
    const mo = f.mouth();
    const q = await shoot({ x: mo.x, y: mo.y, to: d, miss: o.miss, missOff: R(55, 75) * side(), speed: big ? 640 : 780, r: big ? 18 : 11, c: P.c,
      trail: q => spawn({ sq: 1, c: P.c.slice(1), ramp: true, x: q.x + R(-5, 5), y: q.y + R(-5, 5), life: 0.3, s0: big ? 3 : 2, s1: 1 }) });
    hit();
    if (o.miss) { burst({ x: q.x, y: q.y }, m.type, 0.5); return; }
    if (big) { star(center(d), m.type, 7, 0.4); smoke(center(d), 8); shakeIt(9); addDecal(m.type === 'Fire' ? 'scorch' : 'crack', d.x, d.y, 1.4); }
  };
  S.stream = async (f, d, m, o, hit) => {
    const P = PAL(m), offY = o.miss ? R(45, 65) * side() : 0;
    SFX.stream(m.type, 0.8);
    const t0 = T;
    let hitDone = false;
    while (T - t0 < 0.8 && on) {
      const mo = f.mouth(), tx = d.cx, ty = d.cy + offY, dx = tx - mo.x, dy = ty - mo.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      for (let i = 0; i < 3; i++) {
        const sp = R(520, 640), s = R(-0.13, 0.13);
        spawn({ bm: P.bm === 'gust' || P.bm === 'star' ? 'smoke' : P.bm, c: P.c, ramp: true, x: mo.x, y: mo.y, vx: (ux - uy * s) * sp, vy: (uy + ux * s) * sp, life: L / sp * R(0.95, 1.15), s0: 2, s1: 4 });
      }
      if (!hitDone && T - t0 > 0.32) { hitDone = true; hit(); }
      await wait(30);
    }
    if (!hitDone) hit();
  };
  function maybeClash(r, attacker) {
    if (!r || r.state !== 'idle' || r.busy || r.stuck || controllers[r.p] !== 'cpu' || canMega(r.p)) return;
    const idx = r.mon.moves.findIndex(mv => mv.ppLeft > 0 && mv.cat !== 'status' && classify({ id: mv.id, ...mv }) === 'beam' && effectiveness(mv.type, attacker.mon.types) > 0);
    if (idx < 0 || Math.random() > 0.5) return;
    r.forceMove = idx; r.cd = 0;
  }
  function startClash(b1, b2) {
    const c = {};
    c.done = new Promise(res => { c.res = res; });
    b1.clash = b2.clash = c;
    b1.stopAt = b2.stopAt = 0.5;
    b1.life = b2.life = 99;
    const tk = token;
    (async () => {
      await wait(250);
      if (tk !== token) return;
      const mid = { x: (b1.ax + b2.ax) / 2, y: (b1.ay + b2.ay) / 2 };
      floatAt(mid.x, mid.y - 46, 'CLASH!', 'clash', 1300);
      SFX.impact('Normal', 1.6); SFX.thunder();
      shakeIt(10); flash('#ffffff', 0.35); cheer = 1; AudioFX.Crowd.cheer(1);
      for (let i = 0; i < 18; i++) {
        later(() => { if (tk !== token) return; burst(mid, i % 2 ? b1.m.type : b2.m.type, 0.7); if (i % 4 === 0) ringFx(mid.x, mid.y, 6, 60, '#ffffff', 0.3, { flat: 1 }); }, i * 50);
      }
      await wait(950);
      if (tk !== token) return;
      const power = b => { const u = b.owner.mon, mv = b.m, phys = mv.cat === 'physical'; return (mv.power || 60) * u.stats[phys ? 'atk' : 'spa'] * stageMult(u.stages[phys ? 'atk' : 'spa']) * (u.types.includes(mv.type) ? 1.5 : 1) * R(0.85, 1.15); };
      const w = power(b1) >= power(b2) ? b1 : b2, l = w === b1 ? b2 : b1;
      c.winner = w;
      l.life = l.age + 0.12;
      star(mid, w.m.type, 7, 0.4);
      burst(mid, w.m.type, 1.6);
      c.res();
    })();
  }
  S.beam = async (f, d, m, o, hit) => {
    const P = PAL(m);
    if (m.cat !== 'status') maybeClash(d, f);
    await charge(f, m, 0.3);
    if (!on || f.state !== 'idle') return;
    SFX.beam(m.type, 0.6);
    const deco = m.type === 'Ice' ? 'ice' : (m.id === 'hyper-beam' || m.id === 'giga-impact') ? 'rings' : null;
    const mo = f.mouth(), mOff = side();
    const b = beamFx({ from: f, to: o.miss ? null : d, owner: f, m, ax: mo.x, ay: mo.y, bx: d.cx + (o.miss ? 80 : 0), by: d.cy + (o.miss ? 55 * mOff : 0),
      w: (m.power || 60) >= 120 ? 24 : 16, c: P.c, life: 0.85, deco, bm: P.bm === 'star' ? 'spark' : P.bm });
    const other = beams.find(x => x !== b && x.owner === d && x.to === f && b.to === d && !x.reached && !x.clash && x.age < x.life);
    if (other) startClash(b, other);
    await new Promise(res => { b.onReach = res; if (b.reached) res(); });
    if (b.clash) {
      await b.clash.done;
      if (b.clash.winner !== b) return 'nohit';
      b.stopAt = null; b.reached = false; b.life = b.age + 0.55;
      await new Promise(res => { b.onReach = res; });
      hit(0.6);
      return;
    }
    hit();
    await wait(Math.max(0, (b.life - b.age) * 1000));
  };
  S.bolt = async (f, d, m, o, hit) => {
    SFX.zap();
    const mo = f.mouth(), tgt = o.miss ? { x: d.cx + 75 * side(), y: d.cy + 30 } : center(d);
    boltFx({ ax: mo.x, ay: mo.y, bx: tgt.x, by: tgt.y, jag: 24, c: TP.Electric.c, life: 0.45, segs: 10 });
    later(() => boltFx({ ax: mo.x, ay: mo.y, bx: tgt.x, by: tgt.y, jag: 30, c: TP.Electric.c, life: 0.3, segs: 8 }), 120);
    await wait(90);
    hit();
    for (let i = 0; i < 10; i++) spawn({ bm: 'spark', c: TP.Electric.c, x: tgt.x + R(-20, 20), y: tgt.y + R(-20, 20), life: 0.35, delay: i * 0.03, s0: 3, s1: 1 });
    await wait(380);
  };
  S.sky = async (f, d, m, o, hit) => {
    SFX.thunder(); flash('#fffbe0', 0.55);
    const tx = d.x + (o.miss ? 85 * side() : 0), ty = d.y;
    boltFx({ ax: tx + R(-40, 40), ay: -10, bx: tx, by: ty - (o.miss ? 0 : d.z + d.h * 0.4), jag: 34, c: TP.Electric.c, life: 0.55, segs: 14 });
    await wait(80);
    hit();
    addDecal('scorch', tx, ty, 1.3); ringFx(tx, ty, 10, 80, '#fff59a', 0.45); shakeIt(7);
    await wait(450);
  };
  S.quake = async (f, d, m, o, hit) => {
    await tw(0.28, k => { f.jz = Math.sin(k * Math.PI) * 34; });
    f.jz = 0;
    SFX.quake(); shakeIt(13);
    for (let i = 0; i < 3; i++) ringFx(f.x, f.y, 20, Math.max(VW, VH) * 0.45, i ? '#8a6a44' : '#e2b878', 0.9, { delay: i * 0.15, w: 2 });
    addDecal('crack', f.x, f.y, 1.5);
    for (let i = 0; i < 16; i++) spawn({ bm: 'rock', c: TP.Ground.c.slice(1), x: f.x + R(-200, 200), y: f.y + R(-90, 90), z: 0, vz: R(150, 300), g: 900, vx: R(-30, 30), vy: 0, life: R(0.6, 0.9), s0: 2, s1: 2 });
    await wait(260);
    hit();
    addDecal('crack', d.x, d.y, 1.1);
    await wait(500);
  };
  S.rockslide = async (f, d, m, o, hit) => {
    const P = m.type === 'Rock' ? TP.Rock : PAL(m);
    SFX.rumble(0.8);
    for (let i = 0; i < 6; i++) spawn({ bm: 'rock', c: P.c.slice(1), x: d.x + R(-45, 45) + (o.miss ? 95 * side() : 0), y: d.y + R(-18, 18), z: 460, vz: -250, g: 1500, life: 1.0, delay: i * 0.07, s0: 5, s1: 5 });
    await wait(520);
    hit();
    smoke({ x: d.x, y: d.y }, 7, ['#b8a07a', '#d6c4a0', '#8a7454']); shakeIt(6); addDecal('crack', d.x, d.y, 1.1);
    await wait(420);
  };
  S.spikes = async (f, d, m, o, hit) => {
    const P = PAL(m), ax = f.x, ay = f.y, bx = d.x + (o.miss ? 90 * side() : 0), by = d.y;
    for (let i = 1; i <= 8; i++) {
      const k = i / 8;
      later(() => { shapes.push({ kind: 'spike', x: ax + (bx - ax) * k, y: ay + (by - ay) * k, c: P.c, h: 22 + k * 34, life: 0.65, age: 0 }); if (i % 2) SFX.slash(); }, i * 45);
    }
    await wait(8 * 45 + 30);
    hit();
    await wait(350);
  };
  S.geyser = async (f, d, m, o, hit) => {
    const P = PAL(m), tx = d.x + (o.miss ? 85 * side() : 0), ty = d.y;
    ringFx(tx, ty, 6, 46, P.c[2], 0.35);
    for (let i = 0; i < 10; i++) spawn({ sq: 1, c: P.c, ramp: true, x: tx + R(-30, 30), y: ty + R(-8, 8), vy: -40, life: 0.3, delay: i * 0.03, s0: 2, s1: 1 });
    SFX.rumble(0.7);
    await wait(320);
    shapes.push({ kind: 'pillar', x: tx, y: ty + 6, w: 66, h: 130 + (m.power || 80) * 0.4, n: 7, c: [P.c[0], P.c[1], P.c[2], P.c[3]], life: 0.85, age: 0 });
    for (let i = 0; i < 26; i++) spawn({ bm: P.bm, c: P.c, ramp: true, x: tx + R(-30, 30), y: ty, vx: R(-40, 40), vy: R(-420, -220), drag: 1.5, life: R(0.5, 0.9), delay: i * 0.012, s0: 3, s1: 1 });
    SFX.impact(m.type, 1.3, 1);
    hit();
    addDecal(m.type === 'Fire' ? 'scorch' : 'crack', tx, ty, 1.5); shakeIt(7);
    await wait(700);
  };
  S.wave = async (f, d, m, o, hit) => {
    const P = PAL(m);
    SFX.stream(m.type, 1.0);
    const ax = f.x, ay = f.y - 10, dx = d.x - ax, dy = d.y - 10 - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const t0 = T;
    let done = false;
    while (T - t0 < 0.95 && on) {
      const k = (T - t0) / 0.95 * 1.3, cx = ax + dx * k, cy = ay + dy * k;
      for (let i = -4; i <= 4; i++) spawn({ bm: m.type === 'Water' ? 'bubble' : P.bm, c: P.c, ramp: true, x: cx + nx * i * 17 + R(-6, 6), y: cy + ny * i * 17 - R(0, 26), vx: ux * 90, vy: uy * 90 - 50, life: 0.45, s0: 3, s1: 2 });
      if (!done && k >= 1) { done = true; hit(); }
      await wait(30);
    }
    if (!done) hit();
  };
  S.sound = async (f, d, m, o, hit) => {
    SFX.sonic();
    const col = m.type === 'Bug' ? '#cdeb5a' : m.type === 'Dark' ? '#8f6ea3' : m.type === 'Fairy' ? '#ff9bd6' : '#ffffff';
    for (let i = 0; i < 5; i++) {
      later(() => {
        if (!on) return;
        const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x);
        shapes.push({ kind: 'arc', x: mo.x, y: mo.y, a, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, col, life: 0.6, age: 0 });
      }, i * 85);
    }
    await wait(380);
    hit();
    await wait(250);
  };
  S.wind = async (f, d, m, o, hit) => {
    const P = PAL(m);
    SFX.whoosh();
    if (m.id === 'hurricane' || m.id === 'twister') {
      const tx = d.x + (o.miss ? 80 * side() : 0), ty = d.y;
      for (let i = 0; i < 70; i++) { const ph = R(0, 6.28), hh = R(0, 150); spawn({ bm: i % 3 ? 'gust' : 'smoke', c: m.type === 'Dragon' ? TP.Dragon.c : P.c, x: tx, y: ty, life: 1.0, delay: i * 0.008, s0: 2, s1: 3, fade: true, path: k => ({ x: tx + Math.cos(ph + k * 14) * (14 + hh * 0.35), y: ty - hh * k - 4 + Math.sin(ph + k * 14) * 6 }) }); }
      await wait(300); hit(); await wait(600);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const mo = f.mouth();
      const pr = shoot({ x: mo.x, y: mo.y + (i - 1) * 16, to: d, miss: o.miss, missOff: 70 * side(), speed: 820, bm: 'gust', c: P.c, s: 4, flip: f.face < 0,
        trail: q => spawn({ sq: 1, c: ['#ffffff'], x: q.x, y: q.y, life: 0.15, s0: 1, s1: 1, fade: true }) });
      if (i === 0) pr.then(() => hit());
      await wait(80);
    }
    await wait(350);
  };
  const MULTI_BM = { Grass: 'leaf', Bug: 'needle', Ice: 'shard', Water: 'bubble', Steel: 'shard', Normal: 'star', Rock: 'rock', Dragon: 'shard', Fairy: 'heart', Psychic: 'star' };
  S.multi = async (f, d, m, o, hit) => {
    const P = PAL(m), bm = MULTI_BM[m.type] || P.bm;
    const n = m.id === 'leaf-storm' || m.id === 'petal-dance' ? 12 : 6;
    let first = null;
    for (let i = 0; i < n; i++) {
      if (!on) return;
      const mo = f.mouth();
      SFX.whoosh();
      const pr = shoot({ x: mo.x, y: mo.y + R(-10, 10), to: d, miss: o.miss, missOff: R(50, 80) * side(), speed: R(700, 860), bm, c: P.c, s: 3, spin: bm === 'leaf' || bm === 'star' ? 12 : 0, arc: R(-30, 30) });
      if (!first) first = pr.then(() => hit());
      pr.then(q => { if (!o.miss) for (let j = 0; j < 4; j++) spawn({ sq: 1, c: P.c, ramp: true, x: q.x, y: q.y, vx: R(-120, 120), vy: R(-120, 60), drag: 4, life: 0.3, s0: 2, s1: 1 }); });
      await wait(70);
    }
    await first;
    await wait(250);
  };
  S.vortex = async (f, d, m, o, hit) => {
    const P = PAL(m), tx = d.x, ty = d.y;
    SFX.stream(m.type, 0.9);
    for (let i = 0; i < 60; i++) { const ph = i / 60 * 6.28 * 3, hh = (i % 10) * 9; spawn({ bm: P.bm === 'star' ? 'smoke' : P.bm, c: P.c, ramp: true, x: tx, y: ty, life: 0.9, delay: i * 0.01, s0: 3, s1: 2, path: k => ({ x: tx + Math.cos(ph + k * 10) * (d.r + 12), y: ty - hh - 6 + Math.sin(ph + k * 10) * 12 }) }); }
    await wait(150); hit(); await wait(800);
  };
  S.drain = async (f, d, m, o, hit) => {
    const P = PAL(m);
    await charge(f, m, 0.2);
    hit();
    if (o.miss) return;
    for (let i = 0; i < 12; i++) { const a = center(d), ox = R(-20, 20), oy = R(-20, 20); spawn({ sq: 1, c: ['#a6ff7a', '#eaffd8', '#4fd63a'], add: true, x: a.x, y: a.y, life: 0.8, delay: 0.25 + i * 0.04, s0: 3, s1: 2, path: k => { const b = center(f); return { x: a.x + ox + (b.x - a.x - ox) * k, y: a.y + oy + (b.y - a.y - oy) * k - Math.sin(k * Math.PI) * 50 }; } }); }
    await wait(900);
  };
  S.contact = async (f, d, m, o, hit, variant) => {
    const sx = f.x, sy = f.y, dir = Math.sign(d.x - f.x) || f.face;
    const tx = d.x - dir * (f.r + d.r) * 0.75, ty = d.y;
    f.dashing = true; f.face = dir;
    SFX.whoosh();
    await tw(0.2, k => { const e = easeIn(k); f.x = sx + (tx - sx) * e; f.y = sy + (ty - sy) * e; if (Math.random() < 0.4) spawn({ bm: 'smoke', c: ['#d8c8b0', '#f0e6d6', '#b8a890'], x: f.x, y: f.y, vx: -dir * 40, vy: -10, life: 0.35, s0: 2, s1: 1, fade: true }); });
    if (!on) return;
    const at = center(d), col = PAL(m).c;
    if (variant === 'claws') { SFX.slash(); for (let i = -1; i <= 1; i++) shapes.push({ kind: 'slash', x: at.x + i * 12, y: at.y + i * 4, a: -0.9 + i * 0.12, len: 70, bend: 0, col: col[2], life: 0.3, age: 0 }); }
    else if (variant === 'jaws') shapes.push({ kind: 'jaws', x: at.x, y: at.y, r: 34, life: 0.35, age: 0 });
    else if (variant === 'tail') { SFX.slash(); shapes.push({ kind: 'slash', x: at.x, y: at.y, a: 0.2, len: 90, bend: 14, col: col[2], life: 0.3, age: 0 }); }
    if (['Fire', 'Ice', 'Electric', 'Poison', 'Ghost', 'Dark', 'Psychic', 'Dragon', 'Water', 'Grass', 'Fairy'].includes(m.type)) burst(at, m.type, 0.9);
    hit();
    await wait(110);
    const x0 = f.x, y0 = f.y, bx = x0 + (sx - x0) * 0.65, by = y0 + (sy - y0) * 0.65;
    await tw(0.3, k => { const e = easeOut(k); f.x = x0 + (bx - x0) * e; f.y = y0 + (by - y0) * e; f.jz = Math.sin(k * Math.PI) * 16; });
    f.jz = 0; f.dashing = false;
  };
  // ---- status moves
  S.buff = async (f, d, m, o, hit) => {
    SFX.buff();
    ringFx(f.x, f.y, 10, f.r * 2, '#ffb36a', 0.5); ringFx(f.x, f.y, 10, f.r * 1.4, '#ffe0b0', 0.5, { delay: 0.12 });
    for (let i = 0; i < 12; i++) spawn({ sq: 1, c: PAL(m).c, add: true, x: f.x + R(-f.w / 2, f.w / 2), y: f.y, vy: R(-120, -60), life: 0.7, delay: i * 0.03, s0: 2, s1: 1 });
    await wait(450); hit(); await wait(200);
  };
  S.debuff = async (f, d, m, o, hit, variant) => {
    SFX.debuff();
    const bm = variant === 'hearts' ? 'heart' : 'spark', c = variant === 'hearts' ? TP.Fairy.c : ['#ffffff', '#d0d8ff', '#8090c0'];
    for (let i = 0; i < 8; i++) { const a = f.mouth(), b = center(d), ox = R(-16, 16); spawn({ bm, c, x: a.x, y: a.y, life: 0.5, delay: i * 0.05, s0: 2, s1: 3, path: k => ({ x: a.x + (b.x - a.x) * k + ox, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 30 }) }); }
    await wait(600); hit(); await wait(150);
  };
  S.shield = async (f, d, m, o, hit) => { SFX.shield(); hit(); await wait(450); };
  S.heal = async (f, d, m, o, hit) => {
    SFX.heal();
    ringFx(f.x, f.y, 8, f.r * 1.8, '#7dffa0', 0.6);
    for (let i = 0; i < 14; i++) spawn({ bm: 'plus', c: ['#7be35a', '#e6ffd0', '#3ea82a'], x: f.x + R(-f.w / 2, f.w / 2), y: f.cy + R(0, f.h / 2), vy: -70, life: 0.8, delay: i * 0.04, s0: 2, s1: 2, fade: true });
    await wait(500); hit(); await wait(200);
  };
  S.powder = async (f, d, m, o, hit) => {
    SFX.powder();
    const col = m.id === 'stun-spore' ? ['#fff59a', '#ffe000', '#c9a400'] : m.id === 'poison-powder' ? ['#e7b0ff', '#c56bf0', '#8e34c4'] : ['#d8ffb0', '#9ad86a', '#5a9a3a'];
    for (let i = 0; i < 40; i++) { const a = f.mouth(), ox = R(-30, 30), oy = R(-30, 30); spawn({ sq: 1, c: col, x: a.x, y: a.y, life: 0.9, delay: i * 0.012, s0: 1, s1: 2, fade: true, path: k => { const b = center(d); return { x: a.x + (b.x - a.x) * k + ox * Math.sin(k * 3), y: a.y + (b.y - a.y) * k + oy * Math.sin(k * 3) }; } }); }
    await wait(800); hit(); await wait(150);
  };
  S.hypno = async (f, d, m, o, hit) => {
    SFX.status('confused');
    for (let i = 0; i < 4; i++) later(() => { if (!on) return; const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x); shapes.push({ kind: 'arc', x: mo.x, y: mo.y, a, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, col: '#ff8ad8', life: 0.8, age: 0, full: true }); }, i * 110);
    await wait(650); hit(); await wait(150);
  };
  S.seed = async (f, d, m, o, hit) => {
    for (let i = 0; i < 3; i++) { const a = f.mouth(), b = { x: d.x + (i - 1) * 16, y: d.y - 6 }; spawn({ bm: 'seed', c: ['#8a6a3a', '#c9a46a', '#5a4020'], x: a.x, y: a.y, life: 0.55, delay: i * 0.08, s0: 2, s1: 2, path: k => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 70 }) }); }
    await wait(700); hit(); addDecal('leaf', d.x, d.y); await wait(150);
  };
  S.wisp = async (f, d, m, o, hit) => {
    SFX.status('brn');
    for (let i = 0; i < 3; i++) { const ph = i / 3 * 6.28; spawn({ bm: 'flame', c: ['#a8d8ff', '#5aa0ff', '#2a5ad6'], x: 0, y: 0, life: 1.0, s0: 3, s1: 3, path: k => { const a = center(f), b = center(d), e = Math.max(0, (k - 0.4) / 0.6); const cx = a.x + (b.x - a.x) * e, cy = a.y + (b.y - a.y) * e; return { x: cx + Math.cos(ph + k * 12) * 26 * (1 - e * 0.6), y: cy + Math.sin(ph + k * 12) * 14 }; } }); }
    await wait(1000); hit(); await wait(100);
  };
  S.twave = async (f, d, m, o, hit) => {
    SFX.zap();
    ringFx(d.x, d.cy, 10, d.r * 2, '#fff59a', 0.5, { flat: 1 });
    boltFx({ ax: f.mouth().x, ay: f.mouth().y, bx: d.cx, by: d.cy, jag: 14, c: TP.Electric.c, life: 0.3, segs: 7 });
    await wait(300); hit(); await wait(200);
  };
  S.toxic = async (f, d, m, o, hit) => {
    SFX.status('psn');
    for (let i = 0; i < 12; i++) { const a = f.mouth(), b = center(d), ox = R(-14, 14); spawn({ bm: 'bubble', c: TP.Poison.c.slice(1), x: a.x, y: a.y, life: 0.55, delay: i * 0.03, s0: 2, s1: 3, path: k => ({ x: a.x + (b.x - a.x) * k + ox, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 45 }) }); }
    await wait(650); hit(); await wait(150);
  };
  S.generic = async (f, d, m, o, hit) => { burst(center(f), m.type || 'Normal', 0.7); SFX.buff(); await wait(400); hit(); };

  // ---------------------------------------------------------------------
  //  Combat rules (real time; same formulas as the turn-based engine)
  // ---------------------------------------------------------------------
  function impactFx(d, m, eff, crit) {
    const at = { x: d.cx + R(-8, 8), y: d.cy + R(-8, 8) }, type = m.type || 'Normal';
    const pw = clamp((m.power || 60) / 80, 0.6, 1.6) * (eff > 1 ? 1.25 : eff < 1 ? 0.7 : 1) * (crit ? 1.3 : 1);
    star(at, m.cat === 'physical' && type === 'Normal' ? 'Fighting' : type, 3 + pw * 2);
    burst(at, type, pw);
    ringFx(d.x, d.y, 8, 30 + 30 * pw, tp(type).c[1], 0.35);
    d.white = 1; d.wob = 1;
    SFX.impact(type, pw, eff);
    if (pw > 1.2 || crit) shakeIt(4 + pw * 4);
    if (type === 'Fire' && pw > 0.9) addDecal('scorch', d.x, d.y, 0.8);
    else if (type === 'Ground' || type === 'Rock' || type === 'Fighting') addDecal('crack', d.x, d.y, 0.7);
    else if (type === 'Water') addDecal('wet', d.x, d.y);
    else if (type === 'Ice') addDecal('frost', d.x, d.y, 0.8);
    else if (type === 'Poison') addDecal('goo', d.x, d.y, 0.7);
    else if (pw > 1.2) addDecal('scorch', d.x, d.y, 0.6);
    return pw;
  }
  function knock(d, from, pw) {
    const dx = d.x - from.x, dy = d.y - from.y, L = Math.hypot(dx, dy) || 1;
    d.kx += dx / L * 260 * pw; d.ky += dy / L * 120 * pw + R(-30, 30);
  }
  function dodge(d, from) {
    const dx = d.x - from.x, dy = d.y - from.y, L = Math.hypot(dx, dy) || 1, s = side();
    d.kx += -dy / L * 300 * s; d.ky += dx / L * 300 * s;
    tw(0.25, k => { d.jz = Math.sin(k * Math.PI) * 14; }).then(() => { d.jz = 0; });
  }
  function inflictRT(f, ailment, moveName) {
    const t = f.mon, code = AILMENT[ailment];
    if (MAJOR.includes(code)) {
      if (!canStatus(t, code)) return false;
      t.status = code;
      if (code === 'slp') f.sleepT = (1 + Math.floor(Math.random() * 3)) * 3;
      text(f, STATUS_WORD[code], 'info');
      SFX.status(code);
      if (code === 'frz') { burst(center(f), 'Ice', 1); addDecal('frost', f.x, f.y); }
      if (code === 'brn') burst(center(f), 'Fire', 0.8);
      if (code === 'par') burst(center(f), 'Electric', 0.8);
      if (code === 'psn') burst(center(f), 'Poison', 0.8);
      hud(f.p);
      return true;
    }
    if (code === 'conf') { if (t.vol.conf) return false; t.vol.conf = 2 + Math.floor(Math.random() * 4); text(f, 'CONFUSED!', 'info'); SFX.status('confused'); hud(f.p); return true; }
    if (code === 'seed') { if (t.vol.seed || t.types.includes('Grass')) return false; t.vol.seed = true; text(f, 'SEEDED!', 'info'); return true; }
    if (code === 'trap') { if (t.vol.trap) return false; t.vol.trap = 4 + Math.floor(Math.random() * 2); t.vol.trapName = moveName; text(f, 'TRAPPED!', 'info'); return true; }
    return false;
  }
  function changeStatsRT(f, changes) {
    const m = f.mon;
    for (const [stat, n] of changes) {
      const k = STAT_KEY[stat];
      if (!k) continue;
      const cur = m.stages[k];
      if ((n > 0 && cur >= 6) || (n < 0 && cur <= -6)) { text(f, `${STAGE_LBL[k]} MAXED`, 'info'); continue; }
      m.stages[k] = clamp(cur + n, -6, 6);
      text(f, `${STAGE_LBL[k]} ${n > 0 ? '+' : ''}${n}`, n > 0 ? 'up' : 'down');
      for (let j = 0; j < 6; j++) spawn({ bm: n > 0 ? 'up' : 'down', c: n > 0 ? ['#ff8a3a', '#ffd0a0', '#c04a10'] : ['#4a8aff', '#bcd6ff', '#1e4aa8'], x: f.x + R(-f.w / 2, f.w / 2), y: n > 0 ? f.y - 8 : f.top, vy: n > 0 ? -80 : 80, life: 0.8, delay: j * 0.07, s0: 2, s1: 2, fade: true });
    }
    hud(f.p);
  }
  function statusMove(f, d, m) {
    const u = f.mon, t = d.mon, selfT = SELF_TARGETS.has(m.target) || m.id === 'rest';
    if (m.id === 'rest') {
      if (u.hp === u.maxhp) return text(f, 'BUT IT FAILED!', 'miss');
      number(f, u.maxhp - u.hp, 0, 'heal');
      u.hp = u.maxhp; u.status = 'slp'; f.sleepT = 6;
      text(f, 'FELL ASLEEP!', 'info'); hud(f.p);
      return;
    }
    if (m.ailment === 'protect') {
      if (Math.random() < 1 / Math.pow(3, u.vol.protectCount || 0)) {
        u.vol.protectCount = (u.vol.protectCount || 0) + 1;
        f.protectUntil = T + 1.9;
        shapes.push({ kind: 'shield', f, life: 2.2, age: 0 });
        text(f, 'PROTECTED!', 'info');
      } else { u.vol.protectCount = 0; text(f, 'BUT IT FAILED!', 'miss'); }
      return;
    }
    if (m.healing > 0 && selfT) {
      if (u.hp === u.maxhp) return text(f, 'HP IS FULL!', 'info');
      const amt = Math.min(u.maxhp - u.hp, Math.floor(u.maxhp * m.healing / 100));
      u.hp += amt; number(f, amt, 0, 'heal'); hud(f.p);
      return;
    }
    if (selfT) return changeStatsRT(f, m.stats);
    if (POWDER.has(m.id) && t.types.includes('Grass')) return text(d, 'NO EFFECT', 'weak');
    if (m.id === 'thunder-wave' && effectiveness('Electric', t.types) === 0) return text(d, 'NO EFFECT', 'weak');
    if (m.ailment !== 'none' && !inflictRT(d, m.ailment, m.name) && !m.stats.length) text(d, 'BUT IT FAILED!', 'miss');
    if (m.stats.length) changeStatsRT(d, m.stats);
  }
  function resolveHit(f, d, m, miss, mult = 1) {
    const u = f.mon, t = d.mon, p = f.p;
    const selfT = SELF_TARGETS.has(m.target) || m.id === 'rest';
    if (f.state !== 'idle' && m.cat === 'status') return;
    if (!selfT && d.state !== 'idle') return;
    if (!selfT && d.protectUntil > T) { text(d, 'BLOCKED!', 'info'); SFX.block(); ringFx(d.cx, d.cy, d.r, d.r * 2.2, '#b6ffd9', 0.3, { flat: 1 }); return; }
    if (!selfT && miss) { dodge(d, f); text(d, 'MISSED!', 'miss'); AudioFX.Crowd.gasp(); return; }
    if (m.cat === 'status') return statusMove(f, selfT ? f : d, m);
    const eff = m.type ? effectiveness(m.type, t.types) : 1;
    if (eff === 0) { text(d, 'NO EFFECT', 'weak'); AudioFX.Crowd.gasp(); return; }
    let hits = 1;
    if (m.maxHits) {
      if (m.minHits === m.maxHits) hits = m.minHits;
      else { const r = Math.random(); hits = r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
    }
    let total = 0, landed = 0, crit = false, pw = 1;
    for (let h = 0; h < hits && t.hp > 0; h++) {
      const critStage = (m.crit || 0) + (m.id === 'aqua-cutter' ? 1 : 0);
      const c = FIXED_DAMAGE[m.id] === undefined && Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
      let dmg = Math.floor(calcDamage(u, t, m, c, (85 + Math.floor(Math.random() * 16)) / 100) * mult);
      dmg = Math.min(t.hp, Math.max(1, dmg));
      if (m.id === 'false-swipe' && dmg >= t.hp) dmg = t.hp - 1;
      t.hp -= dmg; total += dmg; landed++;
      if (c) crit = true;
      u.dmgDealt = (u.dmgDealt || 0) + dmg;
      if (h === 0) { pw = impactFx(d, m, eff, c); number(d, dmg, 0, c ? 'crit' : eff > 1 ? 'super' : ''); }
      else later(() => { if (on && d.state !== 'gone') { impactFx(d, m, eff, c); number(d, dmg, h); } }, h * 160);
    }
    knock(d, f, pw);
    if (t.status === 'frz' && m.type === 'Fire' && t.hp > 0) { t.status = null; text(d, 'THAWED OUT!', 'info'); }
    if (crit) text(d, 'CRITICAL!', 'crit');
    if (eff > 1) text(d, 'SUPER EFFECTIVE!', 'eff');
    else if (eff < 1) text(d, 'NOT VERY EFFECTIVE', 'weak');
    if (hits > 1) text(d, `${landed} HITS!`, 'info');
    if (eff > 1 || crit) { trainerPose(p, 'cheer', 1.1); cheer = Math.max(cheer, 0.8); AudioFX.Crowd.cheer(0.6); }
    hud(d.p);
    const ko = t.hp <= 0;
    const score = (ko ? 3 : 0) + (crit ? 2 : 0) + (eff > 1 ? 1.5 : 0) + total / t.maxhp * 2;
    if (score >= 2) later(() => Broadcast.captureThumb(score, ko ? 'KNOCKOUT!' : crit ? 'CRITICAL HIT!' : 'SUPER EFFECTIVE!'), 60);
    if (ko) { u.kos = (u.kos || 0) + 1; koFighter(d); }
    else {
      if (m.ailment !== 'none' && m.ailmentChance > 0 && Math.random() * 100 < m.ailmentChance) inflictRT(d, m.ailment, m.name);
      if (m.flinch && Math.random() * 100 < m.flinch) { text(d, 'FLINCHED!', 'info'); if (d.busy) d.extraCd = (d.extraCd || 0) + 1; else d.cd += 1; }
    }
    if (m.drain > 0 && u.hp < u.maxhp && u.hp > 0) { const amt = Math.min(u.maxhp - u.hp, Math.max(1, Math.floor(total * m.drain / 100))); u.hp += amt; number(f, amt, 0, 'heal'); hud(p); }
    if (m.stats.length && u.hp > 0 && Math.random() * 100 < (m.statChance || 100)) {
      if (m.metaCat === 'damage-raise') changeStatsRT(f, m.stats);
      else if (m.metaCat === 'damage-lower' && t.hp > 0) changeStatsRT(d, m.stats);
    }
    if (m.drain < 0 && u.hp > 0) {
      const recoil = Math.max(1, m.id === 'struggle' ? Math.floor(u.maxhp / 4) : Math.floor(total * -m.drain / 100));
      u.hp = Math.max(0, u.hp - recoil); f.white = 0.8; number(f, recoil); text(f, 'RECOIL!', 'info'); hud(p);
      if (u.hp <= 0) koFighter(f);
    }
    if (RECHARGE.has(m.id) && u.hp > 0) { text(f, 'MUST RECHARGE', 'info'); f.extraCd = (f.extraCd || 0) + 2.2; }
  }
  function chooseMove(f, d) {
    const u = f.mon, t = d.mon;
    if (u.moves.every(mv => mv.ppLeft <= 0)) return -1;
    const scored = u.moves.map((mv, i) => ({ i, s: scoreMove(u, t, mv) * (0.85 + Math.random() * 0.3) })).sort((a, b) => b.s - a.s);
    return scored[0].s > -1 ? scored[0].i : -1;
  }
  async function act(f, tk) {
    const p = f.p, u = f.mon, d = foeOf(f);
    if (canMega(p)) { await doMega(f, tk); return; }
    let idx = f.forceMove ?? f.queued ?? chooseMove(f, d);
    f.forceMove = f.queued = null;
    document.querySelectorAll(`#rrow${p} .rmv`).forEach(b => b.classList.remove('q'));
    if (idx >= 0 && (!u.moves[idx] || u.moves[idx].ppLeft <= 0)) idx = u.moves.findIndex(mv => mv.ppLeft > 0);
    const m = idx < 0 ? STRUGGLE : u.moves[idx];
    if (m.ailment !== 'protect') u.vol.protectCount = 0;
    if (u.vol.conf) {
      u.vol.conf--;
      if (u.vol.conf === 0) { text(f, 'SNAPPED OUT!', 'info'); hud(p); }
      else if (Math.random() < 1 / 3) {
        text(f, 'HURT ITSELF!', 'info'); SFX.status('confusedselfhit');
        const dmg = Math.max(1, calcDamage(u, u, { id: 'confusion-hit', type: null, cat: 'physical', power: 40 }));
        u.hp = Math.max(0, u.hp - dmg); number(f, dmg); f.white = 1; f.wob = 1; hud(p);
        if (u.hp <= 0) koFighter(f);
        await wait(500);
        return;
      }
    }
    if (u.status === 'par' && Math.random() < 0.25) { text(f, 'FULLY PARALYZED!', 'info'); SFX.status('par'); burst(center(f), 'Electric', 0.7); await wait(500); return; }
    if (idx >= 0) m.ppLeft--;
    pill(p, m.name);
    trainerPose(p, 'throw', 0.6);
    const selfT = SELF_TARGETS.has(m.target) || m.id === 'rest';
    let miss = false;
    if (!selfT && m.acc != null) { const st = clamp(u.stages.acc - d.mon.stages.eva, -6, 6); miss = Math.random() * 100 >= m.acc * accMult(st); }
    const [style, variant] = classify(m).split(':');
    if (m.cat !== 'status') SFX.cast(m.type || 'Normal');
    let done = false;
    const hit = (mult = 1) => { if (done || tk !== token) return; done = true; resolveHit(f, d, m, miss, mult); };
    let r;
    try { r = await (S[style] || S.generic)(f, selfT ? f : d, m, { miss }, hit, style === 'orb' ? variant === 'big' : variant); }
    catch (e) { if (e instanceof BattleAbort) throw e; console.warn('retro fx', m.id, e); }
    chk(tk);
    if (r !== 'nohit') hit();
    if (controllers[p] === 'human') humanRow(p);
  }
  async function doMega(f, tk) {
    const p = f.p, u = f.mon, fm = u.megaForm;
    state.players[p].usedMega = true;
    const tr = TR[p];
    trainerPose(p, 'cheer', 1.6);
    ringFx(tr.x, tr.y - 70, 4, 46, '#ffffff', 0.5, { flat: 1 });
    speech(p, 'Mega Evolve!', 1400);
    SFX.mega();
    const cols = ['#ff5a5a', '#ffb84a', '#fff35a', '#5aff8a', '#5ad6ff', '#9a7bff', '#ff7be3'];
    for (let i = 0; i < 70; i++) { const an = i / 70 * 6.28 * 3; spawn({ sq: 1, c: [cols[i % 7]], add: true, x: 0, y: 0, life: 1.3, delay: i * 0.012, s0: 2, s1: 2, path: k => ({ x: f.cx + Math.cos(an + k * 9) * (70 * (1 - k) + 10), y: f.cy + Math.sin(an + k * 9) * (46 * (1 - k) + 8) }) }); }
    await wait(1400); chk(tk);
    const anim = await getAnim(fm.sprite); chk(tk);
    flash('#ffffff', 0.85); shakeIt(8);
    u.modelKey = fm.name; u.isMega = true; u.name = fm.display; u.types = fm.types.slice(); u.stats = calcStats(fm.base, u.level); u.sprite = fm.sprite;
    if (fm.cry) u.cry = fm.cry;
    f.anim = anim; f.fit();
    burst(center(f), u.types[0], 1.6); ringFx(f.x, f.y, 10, 130, '#ffffff', 0.6);
    playCry(u);
    big('MEGA EVOLUTION!', 'mega', 1800);
    later(() => Broadcast.captureThumb(6, `MEGA ${u.name.toUpperCase()}!`), 200);
    cheer = 1; AudioFX.Crowd.cheer(1);
    hud(p);
    await wait(500);
  }
  function think(f, dt) {
    if (f.state !== 'idle' || f.busy) return;
    if (f.stuck) {
      if (f.mon.status === 'frz' && (f.thawT += dt) > 2.5) { f.thawT = 0; if (Math.random() < 0.3) { f.mon.status = null; text(f, 'THAWED OUT!', 'info'); hud(f.p); } }
      return;
    }
    const foe = foeOf(f);
    if (!foe || foe.state !== 'idle') return;
    f.cd -= dt * (f.mon.status === 'par' ? 0.6 : 1);
    if (f.cd > 0) return;
    if (controllers[f.p] === 'human' && f.queued == null && f.forceMove == null) {
      if (!f.ready) { f.ready = true; document.getElementById('rrow' + f.p)?.classList.add('ready'); }
      return;
    }
    f.ready = false;
    document.getElementById('rrow' + f.p)?.classList.remove('ready');
    f.busy = true;
    const tk = token;
    act(f, tk).catch(swallow).finally(() => {
      if (tk !== token) return;
      f.busy = false;
      f.cd = clamp(3.5 - f.mon.stats.spe * stageMult(f.mon.stages.spe) / 150, 2.0, 3.4) + R(0, 1) + (f.extraCd || 0);
      f.extraCd = 0;
    });
  }

  // ---------------------------------------------------------------------
  //  Send-outs, knockouts, intro and the end of the battle
  // ---------------------------------------------------------------------
  async function sendOut(p, tk, first) {
    const pl = state.players[p], mon = pl.team[pl.active];
    mon.stages = blankStages(); mon.vol = {}; mon.turnsOut = 0;
    const anim = await getAnim(mon.sprite); chk(tk);
    const tr = TR[p];
    const dest = { ...spots.start[p] };
    const foe = F[1 - p];
    if (!first && foe && foe.state === 'idle') {
      dest.x = clamp(foe.x + (p ? 1 : -1) * (portrait ? 140 : 300), field.x0, field.x1);
      dest.y = portrait ? clamp(foe.y + (p ? -1 : 1) * 260, field.y0, field.y1) : clamp(foe.y + R(-60, 60), field.y0, field.y1);
    }
    trainerPose(p, 'throw', 0.8);
    hud(p);
    speech(p, `Go! ${mon.name}!`);
    await wait(220); chk(tk);
    SFX.whoosh();
    const hand = { x: tr.x + (p ? -12 : 12), y: tr.y - 80 };
    spawn({ bm: 'ball', c: ['#e23b3b', '#ffffff', '#1a1a22'], x: hand.x, y: hand.y, life: 0.55, s0: 2, s1: 2, rot: 0.01, spin: 16,
      path: k => ({ x: hand.x + (dest.x - hand.x) * k, y: hand.y + (dest.y - 24 - hand.y) * k - Math.sin(k * Math.PI) * 110 }) });
    await wait(550); chk(tk);
    SFX.pop();
    burst({ x: dest.x, y: dest.y - 24 }, 'Normal', 1.1);
    ringFx(dest.x, dest.y, 6, 64, '#ffffff', 0.4);
    flash('#ffffff', 0.12);
    const f = new Fighter(p, mon, anim);
    f.x = dest.x; f.y = dest.y; f.face = p ? -1 : 1; f.pop = 0; f.white = 1;
    F[p] = f;
    playCry(mon);
    await tw(0.3, k => { f.pop = easeOut(k); }); chk(tk);
    f.pop = 1;
    hud(p);
    if (!first && pl.team.filter(x => x.hp > 0).length === 1) big('LAST POKéMON!', 'small', 1500);
    return f;
  }
  function koFighter(f) {
    if (f.state !== 'idle') return;
    f.state = 'faint';
    const p = f.p, mon = f.mon, tk = token;
    playCry(mon, 0.8); SFX.faint();
    big(`${mon.name.toUpperCase()} FAINTED!`, '', 2100);
    cheer = 1; AudioFX.Crowd.cheer(1);
    trainerPose(p, 'dismay', 2.4);
    trainerPose(1 - p, 'cheer', 1.6);
    const last = !state.players[p].team.some(x => x.hp > 0);
    if (last) World.slowmo(0.35, 1300);
    later(() => Broadcast.captureThumb(last ? 5 : 3, last ? 'KNOCKOUT!' : `${mon.name.toUpperCase()} FAINTED!`), 40);
    for (const b of beams) if (b.owner === f) b.life = Math.min(b.life, b.age + 0.1);
    hud(p);
    const pinch = [0, 1].some(q => state.players[q].team.filter(x => x.hp > 0).length === 1);
    if (pinch) AudioFX.Music.setLevel(2);
    (async () => {
      await tw(0.8, k => { f.alpha = 1 - k; f.sink = k; f.white = k < 0.35 ? 1 : 0; });
      chk(tk);
      f.state = 'gone';
      smoke({ x: f.x, y: f.y - 10 }, 5, ['#e8e0f0', '#ffffff', '#b8b0c8']);
      if (F[p] === f) F[p] = null;
      if (!state.players[p].team.some(x => x.hp > 0)) return endBattle(false);
      await wait(900); chk(tk);
      if (ended) return;
      const pl = state.players[p];
      const idx = bestMatchupIdx(p);
      pl.active = idx >= 0 ? idx : pl.team.findIndex(x => x.hp > 0);
      await sendOut(p, tk, false);
    })().catch(swallow);
  }
  function confetti() {
    const cols = ['#ff5a5a', '#ffd23f', '#5ad6ff', '#7be35a', '#ff8ad8', '#ffffff'];
    for (let i = 0; i < 160; i++) spawn({ sq: 1, c: [pick(cols)], x: R(0, VW), y: R(-200, -10), vx: R(-40, 40), vy: R(110, 210), life: R(3, 4.5), delay: R(0, 1.2), s0: 2, s1: 2 });
  }
  function endBattle(timeUp) {
    if (ended) return;
    ended = true; running = false;
    const tk = token;
    const hpLeft = q => state.players[q].team.reduce((a, m) => a + Math.max(0, m.hp) / m.maxhp, 0);
    const alive = q => state.players[q].team.some(m => m.hp > 0);
    const w = !alive(0) ? 1 : !alive(1) ? 0 : (hpLeft(0) >= hpLeft(1) ? 0 : 1);
    (async () => {
      if (timeUp) { big('TIME UP!', '', 1600); await wait(1600); chk(tk); }
      await wait(700); chk(tk);
      AudioFX.Music.victory();
      cheer = 1; AudioFX.Crowd.cheer(1);
      big(`${PLAYER[w].toUpperCase()} WINS!`, 'win', 3600);
      trainerPose(w, 'cheer', 5); trainerPose(1 - w, 'dismay', 5);
      confetti();
      const endL = state.meta.endLines;
      if (endL) { speech(w, endL[w] && endL[w].win, 2800); speech(1 - w, endL[1 - w] && endL[1 - w].lose, 2800); }
      await wait(3800); chk(tk);
      const res = resolveBattle;
      resolveBattle = rejectBattle = null;
      if (res) res(w);
    })().catch(swallow);
  }
  async function intro(opts, tk) {
    AudioFX.Crowd.start(); AudioFX.Music.start(0);
    const team = p => state.players[p].team.map(m => `<img src="${m.sprite}" alt="">`).join('');
    const card = document.createElement('div');
    card.className = 'rcard';
    card.innerHTML = `<div class="rc-no">BATTLE #${Stats.battleNo()}${Broadcast.opts.channel ? ' · ' + esc(Broadcast.opts.channel) : ''}</div>
      <div class="rc-row">
        <div class="rc-side p0"><img class="rc-tr" src="${TR[0].portrait}" alt=""><div><div class="rc-name">${esc(PLAYER[0])}</div><div class="rc-team">${team(0)}</div></div></div>
        <div class="rc-vs">VS</div>
        <div class="rc-side p1"><div><div class="rc-name">${esc(PLAYER[1])}</div><div class="rc-team">${team(1)}</div></div><img class="rc-tr" src="${TR[1].portrait}" alt=""></div>
      </div>
      <div class="rc-sub">${opts.subtitle ? esc(opts.subtitle) + ' · ' : ''}${TH.name}</div>`;
    fxEl.append(card);
    SFX.banner();
    const lines = opts.lines;
    if (lines) { later(() => speech(0, lines[0], 1800), 900); later(() => speech(1, lines[1], 1800), 1700); }
    await wait(3000); chk(tk);
    card.classList.add('out');
    later(() => card.remove(), 450);
    for (const n of ['3', '2', '1']) { big(n, 'count', 650); SFX.beep(false); await wait(620); chk(tk); }
    big('FIGHT!', 'count', 900); SFX.beep(true); SFX.start();
    cheer = 1; AudioFX.Crowd.cheer(0.8);
  }

  // ---------------------------------------------------------------------
  //  Main loop hook + public API
  // ---------------------------------------------------------------------
  function update(dt) {
    if (!on) return;
    T += dt;
    if (running) { clockT += dt; if (clockT > 600) endBattle(true); }
    cheer = Math.max(0, cheer - dt * 0.3);
    for (const f of F) if (f) stepFighter(f, dt);
    if (running) for (const f of F) if (f) think(f, dt);
    ambient(dt);
    stepFx(dt);
    render();
    const sec = Math.floor(clockT);
    if (sec !== lastTimer) { lastTimer = sec; const el = document.getElementById('rTimer'); if (el) el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
  }
  updaters.push(update);
  addEventListener('resize', () => {
    if (!on) return;
    const oldW = VW, oldH = VH;
    resize(); layout();
    buildTheme(Object.keys(THEMES).find(k => THEMES[k] === TH) || 'plaza');
    TR.forEach((t, p) => { if (t) { t.x = spots.trainer[p].x; t.y = spots.trainer[p].y; } });
    F.forEach(f => { if (f) { f.x *= VW / oldW; f.y *= VH / oldH; f.goal = null; clampField(f); } });
  });
  addEventListener('keydown', e => {
    if (!on || e.target.tagName === 'INPUT') return;
    const n = +e.key;
    if (n >= 1 && n <= 4) { const p = controllers[0] === 'human' ? 0 : controllers[1] === 'human' ? 1 : -1; if (p >= 0) queueMove(p, n - 1); }
  });

  function stop() {
    const rj = rejectBattle;
    resolveBattle = rejectBattle = null;
    on = false; running = false; ended = true; token++;
    parts.length = beams.length = bolts.length = rings.length = projs.length = shapes.length = 0;
    F[0] = F[1] = null;
    fxEl.innerHTML = ''; hudEl.innerHTML = '';
    root.classList.add('hidden');
    World.skip3D = false; World.captureSource = null;
    if (rj) rj(new BattleAbort());
  }
  function battle(opts = {}) {
    stop();
    on = true; ended = false; running = false; token++;
    const tk = token;
    T = 0; clockT = 0; cheer = 0; shake = 0; flashA = 0;
    root.classList.remove('hidden');
    World.skip3D = true; World.captureSource = cv;
    resize(); layout();
    decal = null;
    const key = settings.theme === 'random' ? pick(Object.keys(THEMES)) : (THEME_MAP[settings.theme] || 'plaza');
    buildTheme(key);
    TR[0] = makeTrainer(0, settings.outfits[0]);
    TR[1] = makeTrainer(1, settings.outfits[1]);
    buildHud();
    hudEl.classList.add('hidden');
    const srcs = state.players.flatMap(pl => pl.team.flatMap(m => [m.sprite, ...(m.megaForm ? [m.megaForm.sprite] : [])]));
    const loading = Promise.all(srcs.map(getAnim));
    const result = new Promise((res, rej) => { resolveBattle = res; rejectBattle = rej; });
    (async () => {
      await intro(opts, tk);
      await loading; chk(tk);
      hudEl.classList.remove('hidden');
      hud();
      await Promise.all([sendOut(0, tk, true), wait(160).then(() => sendOut(1, tk, true))]);
      chk(tk);
      running = true;
      AudioFX.Music.setLevel(1);
    })().catch(e => { if (!(e instanceof BattleAbort)) { console.error(e); const rj = rejectBattle; resolveBattle = rejectBattle = null; if (rj) rj(e); } });
    return result;
  }
  return { battle, stop, get active() { return on; }, themeName: k => (THEMES[THEME_MAP[k]] || THEMES.plaza).name, _debug: () => ({ F, TR, parts, beams, T, clockT, running, VW, VH, field }),
    // test hook: play one move's effect (no damage) with the battle paused
    _testMove: async id => { running = false; const f = F[0], d = F[1]; if (!f || !d) return 'no fighters'; const m = { id, ...MOVES[id], ppLeft: 9 }; const [style, variant] = classify(m).split(':'); let hit = false; const selfT = SELF_TARGETS.has(m.target) || id === 'rest'; await (S[style] || S.generic)(f, selfT ? f : d, m, { miss: false }, () => { hit = true; }, style === 'orb' ? variant === 'big' : variant); return hit ? style : 'NOHIT ' + style; } };
})();
