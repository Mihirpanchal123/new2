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
    UNIT = fw / VW;
    root.style.setProperty('--u', UNIT + 'px');
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
    crack: ['1....', '.1..1', '..11.', '.1...', '1....'],
    fist: ['.1111..', '1222211', '1222221', '1222221', '1222231', '.11111.']
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
  // draws an animated sprite standing at (x, y) (feet), optionally mirrored / flashed / tinted.
  // o.sx / o.sy: signed stretch (a turn passes sx through 0), o.skew: lean, o.rot: tilt
  function drawSprite(a, t, x, y, s, flip, o = {}) {
    const img = frameAt(a, t), b = a.box;
    const w = a.w * s, h = a.h * s;
    const ox = ((b.x0 + b.x1 + 1) / 2) * s, oy = (b.y1 + 1) * s;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.translate(Math.round(x), Math.round(y));
    if (o.skew) ctx.transform(1, 0, o.skew, 1, 0, 0);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx ?? (flip ? -1 : 1), o.sy || 1);
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
  //  Fighters + movement: steering with acceleration, circling the foe at
  //  a range that suits the next move, hop-walk, lean into the run, a
  //  paper-flip turn, jelly squash & stretch, afterimages when dashing
  // ---------------------------------------------------------------------
  let UNIT = 1;
  const LEVITATE = new Set(['gengar', 'gengar-mega', 'haunter', 'gastly', 'beldum', 'metang', 'metagross', 'metagross-mega', 'mismagius', 'bronzong', 'latios', 'latias', 'rotom', 'magnemite', 'magneton', 'magnezone', 'koffing', 'weezing', 'misdreavus', 'unown', 'uxie', 'mesprit', 'azelf', 'giratina-origin', 'cresselia', 'flygon', 'vibrava', 'hydreigon', 'mewtwo', 'mew', 'celebi', 'jirachi', 'deoxys', 'dusknoir', 'chandelure', 'lampent', 'litwick', 'porygon-z']);
  class Fighter {
    constructor(p, mon, anim) {
      Object.assign(this, { p, mon, anim, x: 0, y: 0, z: 0, jz: 0, vx: 0, vy: 0, kx: 0, ky: 0, face: p ? -1 : 1, faceVis: p ? -1 : 1, alpha: 1, white: 0, whiteCol: '#ffffff', pop: 1, sink: 0,
        state: 'idle', busy: false, cd: 0.5 + 120 / (speedOf(mon) + 40) + R(0, 0.35), sleepT: mon.status === 'slp' ? 3 : 0, goal: null, goalT: 0, tick: 3, protectUntil: 0, queued: null, forceMove: null, plan: null, ready: false,
        thawT: 0, zT: 0, sq: 0, sqv: 0, crouch: 0, crouchT: 0, walkPh: 0, speed: 0, orbit: Math.random() < 0.5 ? -1 : 1, after: 0, afterT: 0, afterCol: '#bfe0ff', trail: [], lean: 0, tilt: 0, aura: null, auraT: 0, dashing: false, shiver: 0, rotA: 0, rotS: 0, rotSV: 0 });
      this.hover = mon.types.includes('Flying') || LEVITATE.has(mon.species) || LEVITATE.has(mon.modelKey) ? 18 : 0;
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
    mouth() { return { x: this.x + this.face * this.w * 0.3, y: this.cy - this.h * 0.08 }; }
    bump(v) { this.sqv += v; }                 // + squashes flat, - stretches tall
  }
  const center = f => ({ x: f.cx, y: f.cy });
  const clampField = f => { f.x = clamp(f.x, field.x0, field.x1); f.y = clamp(f.y, field.y0, field.y1); };
  // everything about timing comes from the real stats
  const spd = m => speedOf(m);                                            // Speed x stage x paralysis
  const tempo = f => clamp((spd(f.mon) + 60) / 170, 0.7, 1.45);           // >1 = snappier body motion
  const actionGap = m => 0.9 + 210 / (spd(m) + 40);                      // seconds between attacks
  function statRatio(att, def, mv) {                                      // attacking stat vs defending stat
    const phys = !mv || mv.cat !== 'special';
    const A = att.stats[phys ? 'atk' : 'spa'] * stageMult(att.stages[phys ? 'atk' : 'spa']);
    const D = def.stats[phys ? 'def' : 'spd'] * stageMult(def.stages[phys ? 'def' : 'spd']);
    return A / Math.max(1, D);
  }
  function expectedFrac(att, def, mv) {                                   // official damage as a share of the target's HP
    if (!mv || mv.cat === 'status' || !mv.power) return 0;
    let dmg = calcDamage(att, def, mv, false, 0.925);
    if (mv.maxHits) dmg *= mv.minHits === mv.maxHits ? mv.minHits : 3;
    return dmg / Math.max(1, def.hp);
  }
  function maxSpeed(f) {
    const m = f.mon;
    return clamp(80 + spd(m) * 0.6, 90, 240) * (m.hp / m.maxhp < 0.25 ? 0.85 : 1);
  }
  const isContact = mv => !!mv && classify({ id: mv.id, ...mv }).startsWith('contact');
  function wantDist(f, foe) {
    const plan = f.plan != null && f.plan >= 0 ? f.mon.moves[f.plan] : null;
    if (isContact(plan) && f.cd < 1.6) return f.r + foe.r + 46;         // close in before a physical hit
    const physical = f.mon.stats.atk > f.mon.stats.spa * 1.15;
    return (portrait ? 250 : 330) - (physical ? 60 : 0) + (f.mon.hp / f.mon.maxhp < 0.3 ? 60 : 0);
  }
  function pickGoal(f) {
    const foe = foeOf(f);
    if (!foe || foe.state !== 'idle') {
      const s = spots.start[f.p];
      return { x: clamp(s.x + R(-90, 90), field.x0, field.x1), y: clamp(s.y + R(-70, 70), field.y0, field.y1) };
    }
    if (Math.random() < 0.2) f.orbit *= -1;
    // circle around the foe, a step at a time, at the preferred range
    const ang = Math.atan2((f.y - foe.y) / 0.62, f.x - foe.x) + f.orbit * R(0.3, 0.85);
    const dd = wantDist(f, foe) * R(0.85, 1.12);
    return { x: clamp(foe.x + Math.cos(ang) * dd, field.x0, field.x1), y: clamp(foe.y + Math.sin(ang) * dd * 0.62, field.y0, field.y1) };
  }
  function dust(x, y, s = 1, col = TH && TH.ground === 'snow' ? ['#ffffff', '#e6eef8', '#cfdcee'] : ['#d8c4a4', '#bba486', '#9a8466']) {
    for (let i = 0; i < 1 + s * 2; i++) spawn({ kind: 'smoke', c: col, x: x + R(-8, 8) * s, y: y + R(-3, 3), vx: R(-40, 40) * s, vy: R(-22, -4), drag: 3, life: R(0.35, 0.65), s0: 1 + s, s1: 2 + s * 1.6, a: 0.5 });
  }
  function stepFighter(f, dt) {
    const m = f.mon;
    f.white = Math.max(0, f.white - dt * 5);
    f.sqv += (-f.sq * 240 - f.sqv * 12) * dt;
    f.sq = clamp(f.sq + f.sqv * dt, -0.45, 0.45);
    f.crouch += (f.crouchT - f.crouch) * Math.min(1, dt * 14);
    f.faceVis += (f.face - f.faceVis) * Math.min(1, dt * 15);
    f.shiver = Math.max(0, f.shiver - dt);
    f.rotSV += (-f.rotS * 200 - f.rotSV * 11) * dt; f.rotS = clamp(f.rotS + f.rotSV * dt, -0.45, 0.45);
    if (!f.busy && !f.dashing) f.rotA *= Math.exp(-dt * 8);
    if (f.after > 0) {
      f.after -= dt;
      if ((f.afterT -= dt) <= 0) { f.afterT = 0.03; f.trail.push({ x: f.x, y: f.y - f.z, a: 0.6, sx: f.faceVis, t: T, rot: f.tilt + f.rotA }); }
    }
    for (const g of f.trail) g.a -= dt * 2.8;
    while (f.trail.length && f.trail[0].a <= 0) f.trail.shift();
    const bob = f.hover ? f.hover + Math.sin(T * 2.6 + f.p * 2) * 5 : 0;
    if (f.state !== 'idle') { f.z = bob * (1 - f.sink) + f.jz; return; }
    // knockback slide
    f.x += f.kx * dt; f.y += f.ky * dt;
    const fr = Math.exp(-dt * 6); f.kx *= fr; f.ky *= fr;
    if (Math.hypot(f.kx, f.ky) > 110 && !f.hover && Math.random() < dt * 40) dust(f.x - Math.sign(f.kx) * 8, f.y, 0.8);
    let tvx = 0, tvy = 0;
    const canWalk = !f.busy && !f.stuck && running && !f.dashing && !(T < (f.stagger || 0));
    if (canWalk) {
      f.goalT -= dt;
      if (!f.goal || f.goalT <= 0 || Math.hypot(f.goal.x - f.x, f.goal.y - f.y) < 12) { f.goal = pickGoal(f); f.goalT = R(0.8, 2.0); }
      const dx = f.goal.x - f.x, dy = f.goal.y - f.y, d = Math.hypot(dx, dy) || 1;
      const sp = maxSpeed(f) * Math.min(1, d / 90);           // ease into the stop
      tvx = dx / d * sp; tvy = dy / d * sp;
      if (m.vol.conf) { tvx += Math.sin(T * 5 + f.p) * 70; tvy += Math.cos(T * 4.3) * 45; }
      if (!f.hover && m.stats.spe * stageMult(m.stages.spe) > 95 && (f.hopT = (f.hopT ?? R(1.5, 3)) - dt) <= 0) {
        f.hopT = R(2, 3.5);
        const fo = foeOf(f);
        if (fo && fo.state === 'idle') {
          const ax = f.x - fo.x, ay = f.y - fo.y, L = Math.hypot(ax, ay) || 1, sd = Math.random() < 0.5 ? -1 : 1;
          f.kx += -ay / L * 420 * sd; f.ky += ax / L * 300 * sd; f.after = 0.25; f.afterCol = '#ffffff';
          tw(0.22, k => { f.jz = Math.sin(k * Math.PI) * 18; }).then(() => { f.jz = 0; f.bump(3); dust(f.x, f.y, 0.6); });
        }
      }
    }
    if (!f.dashing) {
      const k = 1 - Math.exp(-dt * (canWalk ? 4.5 : 9));
      f.vx += (tvx - f.vx) * k; f.vy += (tvy - f.vy) * k;
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    f.speed = Math.hypot(f.vx, f.vy);
    // hop-walk: one hop per stride, a little squash on each footfall
    const stride = 24 + f.h * 0.2, prev = f.walkPh;
    if (f.speed > 14 && !f.hover) f.walkPh += f.speed * dt / stride;
    else f.walkPh += (Math.ceil(f.walkPh) - f.walkPh) * Math.min(1, dt * 10);
    if (Math.floor(f.walkPh) !== Math.floor(prev) && f.speed > 40) { f.bump(1.4); if (f.speed > 115) dust(f.x, f.y, 0.5); }
    const hop = f.hover ? 0 : Math.abs(Math.sin(f.walkPh * Math.PI)) * (3 + f.h * 0.035) * Math.min(1, f.speed / 70);
    f.z = bob + f.jz + hop;
    f.lean += (clamp(f.vx / 240, -1, 1) * (f.hover ? 0.2 : 0.1) - f.lean) * Math.min(1, dt * 8);
    f.tilt += ((f.hover ? clamp(f.vx / 300, -1, 1) * 0.12 : 0) - f.tilt) * Math.min(1, dt * 6);
    const foe = foeOf(f);
    if (foe && foe.state === 'idle' && !f.dashing && !foe.dashing) {
      const dx = f.x - foe.x, dy = f.y - foe.y, d = Math.hypot(dx, dy) || 1, min = f.r + foe.r + 14;
      if (d < min) { f.x += dx / d * (min - d) * 0.5; f.y += dy / d * (min - d) * 0.5; }
      if (Math.abs(foe.x - f.x) > 12) f.face = Math.sign(foe.x - f.x);
    } else if (f.speed > 40 && !f.dashing) f.face = Math.sign(f.vx) || f.face;
    clampField(f);
    if (!running || m.hp <= 0) return;
    // status over time (one "turn" = 3 s)
    if (m.status === 'slp') {
      f.sleepT -= dt;
      if ((f.zT -= dt) <= 0) { f.zT = 0.7; spawn({ bm: 'zzz', c: ['#ffffff', '#cfe3ff', '#8fb3ff'], x: f.x + f.face * f.w * 0.2, y: f.top + 6, vx: R(10, 25) * f.face, vy: -30, life: 1.4, s0: 2, s1: 3, fade: true }); }
      if (f.sleepT <= 0) { m.status = null; text(f, 'WOKE UP!', 'info'); hud(f.p); f.bump(-4); }
    }
    if ((f.tick -= dt) <= 0) { f.tick = 3; statusTick(f); }
    if (m.status === 'par' && Math.random() < dt * 0.8) { f.shiver = 0.25; for (let i = 0; i < 3; i++) sparkP(f.x + R(-f.w / 2, f.w / 2), f.cy + R(-f.h / 3, f.h / 3), R(0, 6.28), R(60, 140), '#fff59a', 0.2); }
    if (m.status === 'brn' && Math.random() < dt * 5) flameP(f.x + R(-f.w / 3, f.w / 3), f.cy + R(0, f.h / 3), R(-10, 10), -55, 2, 0.5);
    if (m.status === 'psn' && Math.random() < dt * 3) spawn({ kind: 'blob', c: ['#d68cf5', '#a54ad8'], x: f.x + R(-f.w / 3, f.w / 3), y: f.cy, vy: -35, life: 0.7, s0: 1, s1: 2, pop: true });
    if (m.status === 'frz' && Math.random() < dt * 3) spawn({ kind: 'mote', c: ['#e2f8ff'], x: f.x + R(-f.w / 2, f.w / 2), y: f.cy + R(-f.h / 2, f.h / 3), vy: -10, life: 0.8, s0: 1, s1: 1 });
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
  //  Effect engine: pixel discs + soft additive glow, ground light pools,
  //  layered flames / smoke / sparks / droplets / debris with gravity,
  //  branching lightning, rippling beams, trailing projectiles, camera
  //  punch-in, hit-stop and a scene dim for big moves
  // ---------------------------------------------------------------------
  const lightsFx = [];
  let camX = 0, camY = 0, camZ = 1, camT = null, dimA = 0, dimTarget = 0, dimUntil = 0, hsTimer = null;
  const discCache = new Map();
  function disc(r, col) {
    r = clamp(Math.round(r), 1, 26);
    const key = r + col;
    let c = discCache.get(key);
    if (c) return c;
    c = newCanvas(2 * r + 1, 2 * r + 1);
    const g = c.getContext('2d');
    g.fillStyle = col;
    for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(r - w, r + y, 2 * w + 1, 1); }
    discCache.set(key, c);
    return c;
  }
  function drawDisc(x, y, r, col) { const c = disc(r, col), s = c.width * PX; ctx.drawImage(c, sn(x) - s / 2, sn(y) - s / 2, s, s); }
  const glowCache = new Map();
  function glowTex(col) {
    let c = glowCache.get(col);
    if (c) return c;
    c = newCanvas(64, 64);
    const g = c.getContext('2d'), [r, gg, b] = rgbOf(col);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.28, `rgba(${r},${gg},${b},.55)`); gr.addColorStop(0.6, `rgba(${r},${gg},${b},.16)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowCache.set(col, c);
    return c;
  }
  function glow(x, y, r, col, a = 1) {
    if (a <= 0.01 || r < 1) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(glowTex(col), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function line(x0, y0, x1, y1, col, w, add) {
    if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    if (add) ctx.globalCompositeOperation = 'source-over';
  }
  function lightAt(x, y, r, col, life = 0.4, a = 0.8, follow = null) { lightsFx.push({ x, y, r, col, life, a, age: 0, follow }); }
  function camPunch(x, y, amt = 0.06, dur = 0.35) { camT = { x, y, z: 1 + amt, until: T + dur }; }
  function dimTo(a, sec) { dimTarget = a; dimUntil = T + sec; }
  function hitStop(ms) {
    if (TIME_SCALE < 0.2) return;
    const prev = TIME_SCALE;
    TIME_SCALE = 0.04;
    clearTimeout(hsTimer);
    hsTimer = setTimeout(() => { if (TIME_SCALE === 0.04) TIME_SCALE = prev; }, ms);
  }
  // particles. kinds: flame smoke blob drop spark mote glow ring streak debris + bm / sq bitmaps
  function spawn(o) {
    if (parts.length > 1900 && !o.must) return o;
    o.age = -(o.delay || 0); o.z = o.z || 0; o.seed = Math.random() * 9;
    if (!o.kind) o.kind = o.bm ? 'bm' : o.sq ? 'sq' : 'blob';
    parts.push(o);
    return o;
  }
  function flameP(x, y, vx, vy, s = 4, life = 0.6, o = {}) {
    return spawn({ kind: 'flame', c: o.c || TP.Fire.c, x, y, vx, vy, drag: o.drag ?? 1.4, life, s0: s, s1: Math.max(0.6, s * 0.2), delay: o.delay, z: o.z, vz: o.vz, g: o.g });
  }
  function smokeP(x, y, s = 4, life = 1.1, col = ['#8a7a76', '#6a5e5c', '#4a4240'], o = {}) {
    return spawn({ kind: 'smoke', c: col, x, y, vx: o.vx ?? R(-16, 16), vy: o.vy ?? R(-46, -18), drag: 0.9, life, s0: s, s1: s * (o.grow || 2), delay: o.delay, a: o.a ?? 0.65 });
  }
  function sparkP(x, y, an, sp, col = '#ffe66a', life = 0.35, o = {}) {
    return spawn({ kind: 'spark', c: [col], x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, drag: o.drag ?? 2.6, life, delay: o.delay, g2: o.g2 || 0 });
  }
  function moteP(x, y, col, o = {}) { return spawn({ kind: 'mote', c: [col], x, y, vx: o.vx || 0, vy: o.vy || 0, drag: o.drag ?? 1, life: o.life || 0.7, s0: o.s || 1, s1: o.s || 1, delay: o.delay, path: o.path }); }
  function glowP(x, y, r0, r1, col, life = 0.3, a = 1, delay = 0) { return spawn({ kind: 'glow', c: [col], x, y, s0: r0, s1: r1, life, a, delay, must: true }); }
  function ringP(x, y, r0, r1, col, life = 0.4, o = {}) { return spawn({ kind: 'ring', c: [col], x, y, s0: r0, s1: r1, life, flat: o.flat ?? 0.45, w: o.w || 1, delay: o.delay, must: true }); }
  // legacy helpers used by the rules / status code
  function burst(at, type, power = 1) { impactAt(type, at.x, at.y, at.y + 26, power * 0.75, { quiet: true }); }
  function smoke(at, n = 6, col = ['#8a7a76', '#6a5e5c', '#4a4240'], s = 3) { for (let i = 0; i < n; i++) smokeP(at.x + R(-14, 14), at.y + R(-8, 8), s, R(0.6, 1.1), col); }
  function star(at, type, size = 4, life = 0.28) { const P = tp(type); powAt(at.x, at.y, size * 8, [P.c[0], P.c[1], P.c[2], P.c[4] || P.c[3]], { life }); }
  function ringFx(x, y, r0, r1, col, life = 0.45, o = {}) { rings.push({ x, y, r0, r1, col, life, age: -(o.delay || 0), flat: o.flat ?? 0.45, w: o.w || 1 }); }
  function flash(col = '#fff', a = 0.5) { flashCol = col; flashA = Math.max(flashA, a); }
  function shakeIt(a) { shake = Math.max(shake, a); }
  function beamFx(o) { o.age = 0; o.len = 0; beams.push(o); return o; }
  function boltFx(o) { o.age = 0; o.ptT = -1; bolts.push(o); return o; }
  function shoot(o) { return new Promise(res => { o.res = res; o.age = 0; o.trailT = 0; o.hist = []; projs.push(o); }); }

  // ---- per-type impact kits ----
  const IMP = {
    Fire: { glow: '#ffb347', light: '#ff8a2a', main: 'flame', smoke: true, sparks: '#ffcf5a', ring: '#ffc070', decal: 'scorch' },
    Water: { glow: '#a8e2ff', light: '#5ab4ff', main: 'drop', mist: ['#ffffff', '#d8f1ff', '#a8d8f5'], ring: '#ffffff', decal: 'wet' },
    Electric: { glow: '#fff59a', light: '#ffe94a', main: 'spark', sparks: '#fff27a', bolts: true, ring: '#fff59a', decal: 'scorch' },
    Grass: { glow: '#c8ff9a', light: '#7be35a', main: 'leaf', motes: '#d8ffb0', ring: '#c8ff9a', decal: 'leaf' },
    Ice: { glow: '#e2f8ff', light: '#9be2ff', main: 'shard', mist: ['#ffffff', '#eafaff', '#c8ecff'], ring: '#ffffff', decal: 'frost' },
    Fighting: { glow: '#ffd59a', light: '#ffb04a', main: 'star', lines: '#fff1c2', dust: true, ring: '#ffd08a', decal: 'crack' },
    Poison: { glow: '#e6b0ff', light: '#c56bf0', main: 'goo', mist: ['#d68cf5', '#a54ad8', '#6d2398'], ring: '#d68cf5', decal: 'goo' },
    Ground: { glow: '#f0d4a0', light: '#d9ad6a', main: 'debris', dust: true, ring: '#e2c08a', decal: 'crack' },
    Flying: { glow: '#ffffff', light: '#e2efff', main: 'gust', lines: '#ffffff', ring: '#ffffff' },
    Psychic: { glow: '#ffb8e0', light: '#ff6ec0', main: 'mote', motes: '#ffc8e8', rings: '#ff9ccf', ring: '#ff9ccf' },
    Bug: { glow: '#e6ff9a', light: '#bde04a', main: 'needle', motes: '#eaff9a', ring: '#cdeb5a' },
    Rock: { glow: '#f2e6c8', light: '#cdb684', main: 'debris', dust: true, ring: '#d8c49a', decal: 'crack' },
    Ghost: { glow: '#cdb0ff', light: '#8a5af0', main: 'wisp', mist: ['#8d5fe6', '#5a34a8', '#2a165a'], ring: '#b993f5' },
    Dragon: { glow: '#c0b0ff', light: '#7a5aff', main: 'flame', fc: TP.Dragon.c, sparks: '#d0c4ff', ring: '#a898ff' },
    Dark: { glow: '#b090c8', light: '#6a4a80', main: 'wisp', mist: ['#4a2e5a', '#2e1a3a', '#160c1c'], lines: '#d8c8e8', ring: '#8f6ea3' },
    Steel: { glow: '#ffffff', light: '#e6edf6', main: 'spark', sparks: '#ffffff', star: true, ring: '#eef2f8' },
    Fairy: { glow: '#ffd0ee', light: '#ff9bd6', main: 'heart', motes: '#ffe0f4', ring: '#ffd6ef' },
    Normal: { glow: '#ffffff', light: '#fff6e0', main: 'star', lines: '#ffffff', dust: true, ring: '#ffffff' }
  };
  function impactAt(type, x, y, gy, pw = 1, o = {}) {
    const K = IMP[type] || IMP.Normal, P = tp(type), n = pw;
    const h = Math.max(4, gy - y);                     // height of the hit above the ground
    glowP(x, y, 8, 34 * pw, '#ffffff', 0.12, 1);
    glowP(x, y, 14, 95 * pw, K.glow, 0.42, 0.95);
    if (!o.quiet) lightAt(x, gy, 150 * pw, K.light, 0.55, 0.9);
    switch (K.main) {
      case 'flame': for (let i = 0; i < 14 * n; i++) { const an = R(0, 6.28), sp = R(70, 260) * pw; flameP(x, y, Math.cos(an) * sp, Math.sin(an) * sp * 0.7 - 50, R(3, 6) * Math.min(1.4, pw), R(0.35, 0.75), { c: K.fc }); } break;
      case 'drop': for (let i = 0; i < 22 * n; i++) { const an = R(0, 6.28), sp = R(40, 200) * pw; spawn({ kind: 'drop', c: [pick(['#5ab4ff', '#8fd0ff', '#ffffff'])], x, y: gy, z: h, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.5, vz: R(80, 330), g: 950, life: 1.2, s0: R(1, 2), splash: true }); } break;
      case 'spark': for (let i = 0; i < 18 * n; i++) sparkP(x, y, R(0, 6.28), R(160, 420) * pw, K.sparks, R(0.2, 0.45)); break;
      case 'leaf': for (let i = 0; i < 12 * n; i++) spawn({ bm: 'leaf', c: P.c.slice(1), x, y: gy, z: h, vx: R(-160, 160) * pw, vy: R(-60, 60), vz: R(60, 220), g: 260, drag: 1.5, life: R(0.9, 1.4), s0: 2, s1: 2, rot: R(0, 6), spin: R(-8, 8) }); break;
      case 'shard': for (let i = 0; i < 14 * n; i++) spawn({ bm: 'shard', c: ['#ffffff', '#e2f8ff', '#8fd8ff'], x, y: gy, z: h, vx: R(-220, 220) * pw, vy: R(-80, 80), vz: R(60, 260), g: 800, life: R(0.6, 1), s0: 2, s1: 2, rot: R(0, 6), spin: R(-14, 14), bounce: true }); break;
      case 'star': powAt(x, y, 22 + pw * 16, type === 'Normal' ? POW_C : [P.c[0], P.c[1], P.c[2], P.c[4] || P.c[3]]); for (let i = 0; i < 6 * n; i++) spawn({ bm: 'star', c: ['#ffffff', P.c[1]], x, y, vx: R(-200, 200), vy: R(-200, 120), drag: 3, life: 0.4, s0: 2, s1: 1 }); break;
      case 'goo': for (let i = 0; i < 12 * n; i++) spawn({ kind: 'blob', c: [pick(['#a54ad8', '#c56bf0', '#6d2398']), '#f0c8ff'], x, y: gy, z: h, vx: R(-170, 170) * pw, vy: R(-70, 70), vz: R(60, 260), g: 900, life: 1.1, s0: R(1.5, 3), s1: 1, land: q => addDecal('goo', q.x, q.y, 0.3) }); break;
      case 'debris': for (let i = 0; i < 9 * n; i++) spawn({ kind: 'debris', c: type === 'Rock' ? ['#9a8356', '#cdb684', '#4a3c24'] : ['#7a5432', '#a8773e', '#3b2814'], x, y: gy, z: h * 0.6, vx: R(-200, 200) * pw, vy: R(-80, 80), vz: R(120, 320), g: 1000, life: R(0.8, 1.2), s0: pick([2, 2, 3]), rot: R(0, 6), spin: R(-10, 10), bounce: true }); break;
      case 'gust': for (let i = 0; i < 6; i++) { const an = i / 6 * 6.28 + R(-0.2, 0.2); spawn({ kind: 'streak', c: ['#ffffff'], x: x + Math.cos(an) * 12, y: y + Math.sin(an) * 9, vx: Math.cos(an) * 340, vy: Math.sin(an) * 260, drag: 4, life: 0.3, len: 28, ang: an }); } for (let i = 0; i < 5; i++) spawn({ bm: 'gust', c: ['#ffffff', '#e6f1ff'], x, y, vx: R(-180, 180), vy: R(-150, 80), drag: 3, life: 0.4, s0: 2, s1: 3, fade: true }); break;
      case 'mote': for (let i = 0; i < 16 * n; i++) { const an = R(0, 6.28); moteP(x, y, K.motes, { vx: Math.cos(an) * R(80, 240), vy: Math.sin(an) * R(60, 180), drag: 3, life: R(0.4, 0.8), s: 1 }); } break;
      case 'needle': for (let i = 0; i < 10 * n; i++) { const an = R(0, 6.28); spawn({ bm: 'needle', c: P.c.slice(1), x, y, vx: Math.cos(an) * 260, vy: Math.sin(an) * 200, drag: 4, life: 0.35, s0: 2, s1: 2, rot: an + 1.57 }); } break;
      case 'wisp': for (let i = 0; i < 12 * n; i++) smokeP(x + R(-16, 16), y + R(-12, 12), R(2, 4), R(0.6, 1.1), K.mist, { vx: R(-60, 60), vy: R(-80, -20), a: 0.8 }); break;
      case 'heart': for (let i = 0; i < 9 * n; i++) spawn({ bm: i % 3 ? 'star' : 'heart', c: ['#ffffff', '#ffd6ef', '#ff8ed0'], x, y, vx: R(-180, 180), vy: R(-200, 80), drag: 2.5, life: R(0.5, 0.9), s0: 2, s1: 2, fade: true }); break;
    }
    if (K.mist) for (let i = 0; i < 4 * n; i++) smokeP(x + R(-12, 12), y + R(-10, 10), R(2, 4), R(0.5, 0.9), K.mist, { a: 0.5 });
    if (K.smoke) for (let i = 0; i < 4 * n; i++) smokeP(x + R(-14, 14), y + R(-10, 6), R(3, 5), R(0.9, 1.5), undefined, { delay: 0.12 + i * 0.03 });
    if (K.sparks && K.main !== 'spark') for (let i = 0; i < 10 * n; i++) sparkP(x, y, R(0, 6.28), R(140, 380) * pw, K.sparks, R(0.25, 0.5));
    if (K.motes && K.main !== 'mote') for (let i = 0; i < 8 * n; i++) moteP(x, y, K.motes, { vx: R(-160, 160), vy: R(-160, 80), drag: 3, life: 0.7 });
    if (K.bolts) for (let i = 0; i < 3; i++) { const an = R(0, 6.28), L = R(40, 80) * pw; boltFx({ ax: x, ay: y, bx: x + Math.cos(an) * L, by: y + Math.sin(an) * L * 0.8, jag: 14, c: TP.Electric.c, life: 0.22, w: 0.6 }); }
    if (K.lines) shapes.push({ kind: 'lines', x, y, r0: 20 * pw, r1: 70 * pw, col: K.lines, n: 12, life: 0.2, age: 0 });
    if (K.rings) { ringP(x, y, 6, 60 * pw, K.rings, 0.4, { flat: 1, w: 1 }); ringP(x, y, 6, 90 * pw, K.rings, 0.5, { flat: 0.4, delay: 0.06 }); }
    if (K.star) powAt(x, y, 18 + pw * 14, ['#ffffff', '#f2f6ff', '#aeb9c8', '#3e4550'], { life: 0.22 });
    if (K.dust) dust(x, gy, 1.2 * pw);
    if (!o.quiet) {
      ringFx(x, gy, 8, 34 + 40 * pw, K.ring, 0.38);
      if (K.decal && pw > 0.8) addDecal(K.decal, x, gy, 0.6 + pw * 0.35);
    }
  }

  // ---- update ----
  function stepFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age < 0) continue;
      if (q.age >= q.life) { parts.splice(i, 1); continue; }
      if (q.path) { const pt = q.path(q.age / q.life); q.x = pt.x; q.y = pt.y; if (pt.z !== undefined) q.z = pt.z; continue; }
      if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; }
      if (q.sway) q.vx += Math.sin(q.age * 6 + q.seed) * q.sway * dt;
      if (q.g2) q.vy += q.g2 * dt;
      q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt;
      if (q.vz !== undefined) {
        q.vz -= (q.g || 0) * dt; q.z += q.vz * dt;
        if (q.z <= 0 && q.vz < 0) {
          q.z = 0;
          if (q.land) { q.land(q); q.land = null; }
          if (q.splash) { ringP(q.x, q.y, 2, 9, '#d8f1ff', 0.25, { flat: 0.45 }); parts.splice(i, 1); continue; }
          if (q.bounce && q.vz < -90) { q.vz *= -0.35; q.vx *= 0.6; q.vy *= 0.6; } else { q.vz = 0; q.g = 0; q.vx *= 0.5; q.vy *= 0.5; q.spin = 0; }
        }
      }
    }
    for (let i = projs.length - 1; i >= 0; i--) {
      const o = projs[i];
      o.age += dt;
      const tgt = o.toPt || (o.to && o.to.state === 'idle' ? { x: o.to.cx + (o.miss ? o.missOff : 0), y: o.to.cy + (o.miss ? o.missOff * 0.4 : 0) } : o.last);
      if (tgt) o.last = tgt;
      if (!o.dist0) o.dist0 = Math.hypot(o.last.x - o.x, o.last.y - o.y) || 1;
      // optional curving flight (homing leaves, aura sphere)
      if (o.curve) { o.cv = (o.cv ?? o.curve) * Math.exp(-dt * 3); }
      const dx = o.last.x - o.x, dy = o.last.y - o.y, d = Math.hypot(dx, dy);
      const step = o.speed * dt;
      if (d <= step + 2) { o.x = o.last.x; o.y = o.last.y; projs.splice(i, 1); o.res(o); continue; }
      let ux = dx / d, uy = dy / d;
      if (o.cv) { const c = o.cv; const nx = ux - uy * c, ny = uy + ux * c, L = Math.hypot(nx, ny); ux = nx / L; uy = ny / L; }
      o.x += ux * step; o.y += uy * step;
      o.ang = Math.atan2(uy, ux);
      const prog = clamp(1 - d / o.dist0, 0, 1);
      o.arcK = o.arc ? Math.sin(prog * Math.PI) * o.arc : 0;
      o.hist.push({ x: o.x, y: o.y - o.arcK });
      if (o.hist.length > (o.histLen || 10)) o.hist.shift();
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
      const L = Math.max(1, full), ex = b.ax + (b.bx - b.ax) * b.len / L, ey = b.ay + (b.by - b.ay) * b.len / L;
      // shed particles along the beam and spray at the head
      if (Math.random() < dt * 40) { const k = Math.random() * b.len / L; moteP(b.ax + (b.bx - b.ax) * k, b.ay + (b.by - b.ay) * k + R(-b.w * 0.6, b.w * 0.6), b.c[1], { vx: R(-30, 30), vy: R(-40, 10), life: 0.4 }); }
      if (b.reached && Math.random() < dt * 60) { const an = Math.atan2(b.ay - ey, b.ax - ex) + R(-1.1, 1.1); sparkP(ex, ey, an, R(150, 360), b.c[1], R(0.2, 0.35)); }
      if (b.deco === 'fire' && Math.random() < dt * 50) { const k = Math.random() * b.len / L; flameP(b.ax + (b.bx - b.ax) * k, b.ay + (b.by - b.ay) * k, R(-20, 20), R(-80, -30), R(2, 3), 0.4); }
    }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.age += dt; if (b.age > b.life) bolts.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.age += dt; if (r.age > r.life) rings.splice(i, 1); }
    for (let i = shapes.length - 1; i >= 0; i--) { const s = shapes[i]; s.age += dt; if (s.vx) { s.x += s.vx * dt; s.y += s.vy * dt; } if (s.age > s.life) { if (s.done) s.done(s); shapes.splice(i, 1); } }
    for (let i = lightsFx.length - 1; i >= 0; i--) { const l = lightsFx[i]; l.age += dt; if (l.follow) { const p = l.follow(); if (p) { l.x = p.x; l.y = p.y; } } if (l.age > l.life) lightsFx.splice(i, 1); }
    shake = Math.max(0, shake - dt * 30);
    flashA = Math.max(0, flashA - dt * 2.5);
    dimA += ((T < dimUntil ? dimTarget : 0) - dimA) * Math.min(1, dt * (T < dimUntil ? 8 : 3));
    // camera: punch toward the action, then settle back
    const want = camT && T < camT.until ? camT : { x: VW / 2, y: VH / 2, z: 1 };
    const kc = Math.min(1, dt * (want.z > camZ ? 10 : 3.2));
    camZ += (want.z - camZ) * kc; camX += (want.x - camX) * kc; camY += (want.y - camY) * kc;
  }

  // ---- drawing ----
  function drawBm(name, c, x, y, s, flip = false, rot = 0) {
    const img = bmCanvas(name, c[0], c[1] || c[0], c[2] || c[1] || c[0]);
    const w = img.width * s * PX / 2, h = img.height * s * PX / 2;
    if (!flip && !rot) { ctx.drawImage(img, sn(x - w / 2), sn(y - h / 2), w, h); return; }
    ctx.save(); ctx.translate(sn(x), sn(y)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
  }
  function drawParticle(q) {
    const k = clamp(q.age / q.life, 0, 1), y = q.y - (q.z || 0);
    switch (q.kind) {
      case 'flame': {
        const c = q.c, n = c.length, i = Math.min(n - 3, Math.floor(k * (n - 2)));
        const s = q.s0 + (q.s1 - q.s0) * k, fl = 1 + Math.sin(T * 40 + q.seed * 5) * 0.16, lean = Math.sin(T * 9 + q.seed) * PX * 0.6;
        if (k < 0.5) glow(q.x, y, s * PX * 2.6, c[1], 0.2 * (1 - k * 2));
        // teardrop tongue: wide base, narrowing tip that flickers sideways
        drawDisc(q.x, y, s * fl, c[i + 2]);
        drawDisc(q.x + lean, y - s * PX * 0.8, s * 0.7 * fl, c[i + 2]);
        if (s > 1.6) drawDisc(q.x + lean * 2, y - s * PX * 1.5, s * 0.38, c[i + 2]);
        drawDisc(q.x, y + PX * 0.3, s * 0.68 * fl, c[i + 1]);
        drawDisc(q.x + lean, y - s * PX * 0.6, s * 0.42, c[i + 1]);
        if (s > 2) drawDisc(q.x, y, s * 0.32, c[i]);
        break;
      }
      case 'smoke':
        ctx.globalAlpha = (q.a ?? 0.65) * (1 - k) * Math.min(1, k * 8 + 0.15);
        drawDisc(q.x, y, q.s0 + (q.s1 - q.s0) * k, q.c[Math.min(q.c.length - 1, Math.floor(k * q.c.length))]);
        break;
      case 'blob': {
        const s = q.s0 + (q.s1 - q.s0) * k;
        drawDisc(q.x, y, s, q.c[0]);
        if (q.c[1] && s >= 1.5) drawDisc(q.x - PX * 0.6, y - PX * 0.6, Math.max(0.6, s * 0.35), q.c[1]);
        break;
      }
      case 'drop': drawDisc(q.x, y, q.s0, q.c[0]); if (q.s0 > 1.4) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sn(q.x) - PX, sn(y) - PX, PX, PX); } break;
      case 'spark': {
        const sp = Math.hypot(q.vx, q.vy) || 1, L = Math.min(36, 4 + sp * 0.06), ux = q.vx / sp, uy = q.vy / sp;
        ctx.globalAlpha = 1 - k * k;
        line(q.x, y, q.x - ux * L, y - uy * L, q.c[0], PX * 1.6, true);
        line(q.x, y, q.x - ux * L * 0.5, y - uy * L * 0.5, '#ffffff', PX * 0.8, true);
        break;
      }
      case 'mote': glow(q.x, y, (q.s0 + 2) * PX * 2.2, q.c[0], 0.7 * (1 - k)); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff'; ctx.fillRect(sn(q.x) - PX / 2, sn(y) - PX / 2, PX, PX); break;
      case 'glow': glow(q.x, y, q.s0 + (q.s1 - q.s0) * easeOut(k), q.c[0], (q.a ?? 1) * (1 - k)); break;
      case 'ring': ctx.globalAlpha = 1 - k; pixRing(q.x, y, q.s0 + (q.s1 - q.s0) * easeOut(k), q.flat, q.c[0], q.w); break;
      case 'streak': { ctx.globalAlpha = (1 - k) * 0.9; const L = q.len * (1 - k * 0.5); line(q.x, y, q.x - Math.cos(q.ang) * L, y - Math.sin(q.ang) * L, q.c[0], PX * 0.9, false); break; }
      case 'debris': drawBm('rock', q.c, q.x, y, q.s0, false, (q.rot || 0) + (q.spin || 0) * q.age); break;
      case 'sq': {
        let c = q.c;
        if (q.ramp) c = [c[Math.min(c.length - 1, Math.floor(k * c.length))]];
        ctx.globalAlpha = q.fade ? Math.min(1, (1 - k) * 1.6) : 1;
        if (q.add) ctx.globalCompositeOperation = 'lighter';
        const w = Math.max(1, Math.round(q.s0 + (q.s1 - q.s0) * k)) * PX;
        ctx.fillStyle = c[0]; ctx.fillRect(sn(q.x - w / 2), sn(y - w / 2), w, w);
        break;
      }
      default: {
        let c = q.c;
        if (q.ramp) { const i = Math.min(c.length - 1, Math.floor(k * c.length)); c = [c[i], c[Math.max(0, i - 1)], c[Math.min(c.length - 1, i + 1)]]; }
        ctx.globalAlpha = q.fade ? Math.min(1, (1 - k) * 1.6) : 1;
        if (q.add) ctx.globalCompositeOperation = 'lighter';
        drawBm(q.bm, c, q.x, y, Math.max(1, Math.round(q.s0 + (q.s1 - q.s0) * k)), q.flip, q.rot ? q.rot + (q.spin || 0) * q.age : 0);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  function pixRing(x, y, r, flat, col, w = 1) {
    const n = Math.max(12, Math.floor(r * 6.28 / PX));
    ctx.fillStyle = col;
    const s = PX * w;
    for (let i = 0; i < n; i++) { const a = i / n * 6.28; ctx.fillRect(sn(x + Math.cos(a) * r - s / 2), sn(y + Math.sin(a) * r * flat - s / 2), s, s); }
  }
  function beamHead(b) {
    const full = Math.hypot(b.bx - b.ax, b.by - b.ay) || 1;
    return { ex: b.ax + (b.bx - b.ax) * b.len / full, ey: b.ay + (b.by - b.ay) * b.len / full };
  }
  function drawBeam(b) {
    const { ex, ey } = beamHead(b);
    const fade = clamp((b.life - b.age) / 0.2, 0, 1) * clamp(b.age / 0.05, 0, 1);
    const w = b.w * fade * (1 + Math.sin(T * 50) * 0.06);
    if (w < 0.5) return;
    const L = Math.hypot(ex - b.ax, ey - b.ay), ang = Math.atan2(ey - b.ay, ex - b.ax);
    ctx.save();
    ctx.translate(b.ax, b.ay); ctx.rotate(ang);
    // soft outer glow
    ctx.globalCompositeOperation = 'lighter';
    const [r, g, bl] = rgbOf(b.c[1]);
    const gr = ctx.createLinearGradient(0, -w * 2.4, 0, w * 2.4);
    gr.addColorStop(0, `rgba(${r},${g},${bl},0)`); gr.addColorStop(0.5, `rgba(${r},${g},${bl},.5)`); gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
    ctx.fillStyle = gr; ctx.fillRect(0, -w * 2.4, L, w * 4.8);
    ctx.globalCompositeOperation = 'source-over';
    // body with a rippling edge
    const rainbow = b.deco === 'rainbow';
    for (let s = 0; s < L; s += 6) {
      const ww = w * (0.84 + 0.16 * Math.sin(s * 0.085 - T * 40));
      if (rainbow) { const hue = (s * 0.9 - T * 700) % 360; ctx.fillStyle = `hsl(${hue},85%,55%)`; ctx.fillRect(s, -ww * 0.6, 6.5, ww * 1.2); ctx.fillStyle = `hsl(${hue},95%,75%)`; ctx.fillRect(s, -ww * 0.35, 6.5, ww * 0.7); continue; }
      ctx.fillStyle = b.c[3]; ctx.fillRect(s, -ww * 0.62, 6.5, ww * 1.24);
      ctx.fillStyle = b.c[2]; ctx.fillRect(s, -ww * 0.47, 6.5, ww * 0.94);
      ctx.fillStyle = b.c[1]; ctx.fillRect(s, -ww * 0.3, 6.5, ww * 0.6);
    }
    // energy pulses running down the beam + white-hot core
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
    for (let s = (T * 950) % 52; s < L; s += 52) { ctx.fillStyle = b.c[0]; ctx.fillRect(s, -w * 0.42, 14, w * 0.84); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -w * 0.13, L, w * 0.26);
    if (b.deco === 'ice') for (let s = 16; s < L; s += 24) { ctx.save(); ctx.translate(s, Math.sin(s * 0.3) * w * 0.3); ctx.rotate(0.785); ctx.fillStyle = '#ffffff'; ctx.fillRect(-w * 0.5, -w * 0.5, w, w); ctx.fillStyle = b.c[2]; ctx.fillRect(-w * 0.32, -w * 0.32, w * 0.64, w * 0.64); ctx.restore(); }
    if (b.deco === 'rings') for (let s = (T * 520) % 64; s < L; s += 64) { ctx.strokeStyle = b.c[0]; ctx.lineWidth = PX * 1.5; ctx.beginPath(); ctx.ellipse(s, 0, w * 0.3, w * 1.15, 0, 0, 6.28); ctx.stroke(); }
    if (b.deco === 'spiral') for (const ph of [0, Math.PI]) { for (let s = 0; s < L; s += 7) { const yy = Math.sin(s * 0.06 - T * 22 + ph) * w * 0.95; ctx.fillStyle = s % 14 < 7 ? b.c[0] : b.c[1]; ctx.fillRect(s, yy - PX, PX * 2, PX * 2); } }
    if (b.deco === 'dark') for (let s = (T * 400) % 46; s < L; s += 46) { ctx.strokeStyle = '#2a1238'; ctx.lineWidth = PX * 2; ctx.beginPath(); ctx.arc(s - w, 0, w * 1.3, -0.9, 0.9); ctx.stroke(); }
    if (b.deco === 'gems') for (let s = (T * 300) % 40; s < L; s += 40) drawBm('star', ['#ffffff', '#ffe0f0'], s, Math.sin(s + T * 9) * w * 0.8, 2);
    ctx.restore();
    // muzzle + head flares
    glow(b.ax, b.ay, w * 3.4, b.c[1], 0.95);
    drawDisc(b.ax, b.ay, w / PX * 0.55, '#ffffff');
    glow(ex, ey, w * (b.reached ? 4.6 : 3), b.c[1], 0.95);
    drawDisc(ex, ey, w / PX * (b.reached ? 0.8 : 0.5), '#ffffff');
  }
  function boltPoints(ax, ay, bx, by, jag) {
    let pts = [{ x: ax, y: ay }, { x: bx, y: by }];
    let amp = jag;
    const branches = [];
    for (let it = 0; it < 5; it++) {
      const np = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, off = R(-1, 1) * amp;
        const m = { x: (a.x + b.x) / 2 - dy / L * off, y: (a.y + b.y) / 2 + dx / L * off };
        np.push(m, b);
        if (it === 1 && Math.random() < 0.45) { const an = Math.atan2(dy, dx) + R(-0.9, 0.9), bl = L * R(0.5, 0.9); branches.push([m, { x: m.x + Math.cos(an) * bl, y: m.y + Math.sin(an) * bl }]); }
      }
      pts = np; amp *= 0.55;
    }
    return { pts, branches: branches.map(([a, b]) => boltPoints2(a, b, jag * 0.35)) };
  }
  function boltPoints2(a, b, jag) {
    let pts = [a, b], amp = jag;
    for (let it = 0; it < 3; it++) { const np = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, off = R(-1, 1) * amp; np.push({ x: (p.x + q.x) / 2 - dy / L * off, y: (p.y + q.y) / 2 + dx / L * off }, q); } pts = np; amp *= 0.55; }
    return pts;
  }
  function strokePts(pts, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
  function drawBolt(b) {
    if (b.from) { const m = b.from.state === 'idle' ? b.from.mouth() : null; if (m) { b.ax = m.x; b.ay = m.y; } }
    if (b.to && b.to.state === 'idle') { b.bx = b.to.cx + (b.off || 0); b.by = b.to.cy; }
    if (!b.geo || T - b.ptT > 0.05) { b.ptT = T; b.geo = boltPoints(b.ax, b.ay, b.bx, b.by, b.jag); }
    const w = b.w || 1, fl = Math.random() < 0.15 ? 0.4 : 1, a = clamp((b.life - b.age) / 0.12, 0, 1) * fl;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * a; strokePts(b.geo.pts, b.c[2], 10 * w); b.geo.branches.forEach(p => strokePts(p, b.c[2], 6 * w));
    ctx.globalAlpha = 0.9 * a; strokePts(b.geo.pts, b.c[1], 4 * w); b.geo.branches.forEach(p => strokePts(p, b.c[1], 2.5 * w));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a; strokePts(b.geo.pts, '#ffffff', 1.8 * w); b.geo.branches.forEach(p => strokePts(p, '#ffffff', 1 * w));
    ctx.globalAlpha = 1;
    glow(b.bx, b.by, 40 * w, b.c[1], 0.7 * a);
  }
  function drawProj(o) {
    const y = o.y - (o.arcK || 0);
    if (o.draw) { o.draw(o, o.x, y); return; }
    if (o.bm) { drawBm(o.bm, o.c, o.x, y, o.s || 3, o.flip, o.spin ? o.age * o.spin : (o.rotAlong ? o.ang + 1.57 : 0)); return; }
    orbDraw(o, o.x, y);
  }
  // glowing energy orb with a tapered trail
  function orbDraw(o, x, y) {
    const r = o.r || 12, P = o.c;
    o.hist.forEach((h, i) => { const k = (i + 1) / o.hist.length; ctx.globalAlpha = k * 0.6; drawDisc(h.x, h.y, (r / PX) * k * 0.85, P[2]); });
    ctx.globalAlpha = 1;
    glow(x, y, r * 2.8, P[1], 0.85);
    const wob = 1 + Math.sin(T * 30 + (o.seed || 0)) * 0.08;
    drawDisc(x, y, r / PX * wob, P[3]);
    drawDisc(x, y, r / PX * 0.78 * wob, P[2]);
    drawDisc(x - PX * 0.5, y - PX * 0.5, r / PX * 0.5, P[1]);
    drawDisc(x - PX, y - PX, Math.max(1, r / PX * 0.22), P[0]);
  }
  function drawShape(s) {
    const k = s.age / s.life;
    if (SHAPE2[s.kind]) { if (k >= 0) SHAPE2[s.kind](s, k); return; }
    switch (s.kind) {
      case 'boom': { const sc = s.s * (k < 0.3 ? 0.6 + k * 1.6 : 1.1 - (k - 0.3) * 0.4); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; drawBm('boom', s.c, s.x, s.y, sc, false, s.rot || 0); ctx.globalAlpha = 1; break; }
      case 'lines': {
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < s.n; i++) { const a = i / s.n * 6.28 + (s.rot || 0), r0 = s.r0 + (s.r1 - s.r0) * k, r1 = r0 + 26; line(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0 * 0.8, s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1 * 0.8, s.col, PX, false); }
        ctx.globalAlpha = 1; break;
      }
      case 'slash': {
        const L = s.len * Math.min(1, k * 4), fade = k > 0.5 ? (1 - k) * 2 : 1;
        ctx.globalAlpha = fade;
        glow(s.x, s.y, s.len * 0.6, s.col, 0.5 * fade);
        for (let pass = 0; pass < 2; pass++) {
          const n = Math.ceil(L / PX), w = pass ? PX * 1.2 : PX * 3;
          ctx.fillStyle = pass ? '#ffffff' : s.col;
          for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), cw = w * Math.sin(Math.PI * t) + PX * 0.5; ctx.fillRect(sn(s.x + Math.cos(s.a) * (i * PX - s.len / 2) - cw / 2), sn(s.y + Math.sin(s.a) * (i * PX - s.len / 2) + Math.sin(t * Math.PI) * s.bend - cw / 2), cw, cw); }
        }
        ctx.globalAlpha = 1; break;
      }
      case 'pillar': {
        const hgt = s.h * (k < 0.2 ? k / 0.2 : 1) * (k > 0.75 ? (1 - k) / 0.25 : 1);
        glow(s.x, s.y - hgt * 0.5, s.w * 1.6, s.c[1], 0.6);
        for (let i = 0; i < s.n; i++) {
          const ox = (i / (s.n - 1) - 0.5) * s.w, hh = hgt * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + T * 14)));
          for (let j = 0; j < 4; j++) { const ww = (s.w / s.n) * (1.1 - j * 0.22), h2 = hh * (1 - j * 0.2); ctx.fillStyle = s.c[3 - j]; ctx.fillRect(sn(s.x + ox - ww / 2), sn(s.y - h2), sn(ww) || PX, sn(h2)); }
        }
        break;
      }
      case 'column': {                                    // light pillar from the sky
        const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85, w = s.w * (0.6 + 0.4 * a);
        ctx.globalCompositeOperation = 'lighter';
        const [r, g, b] = rgbOf(s.col);
        const gr = ctx.createLinearGradient(s.x - w, 0, s.x + w, 0);
        gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(0.5, `rgba(${r},${g},${b},${0.85 * a})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr; ctx.fillRect(s.x - w, -40, w * 2, s.y + 40);
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x - w * 0.15, -40, w * 0.3, s.y + 40);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        glow(s.x, s.y, w * 2.4, s.col, a);
        break;
      }
      case 'shield': {
        const f = s.f; if (!f || f.state !== 'idle' || T > f.protectUntil) { s.age = s.life; return; }
        const r = Math.max(f.w, f.h) * 0.62, pulse = 0.25 + Math.sin(T * 12) * 0.08;
        glow(f.cx, f.cy, r * 1.3, '#5affb0', pulse + 0.15);
        ctx.strokeStyle = '#c8ffe4'; ctx.lineWidth = PX * 0.8; ctx.globalAlpha = 0.7;
        for (let i = 0; i < 6; i++) { const a0 = i / 6 * 6.28 + T; ctx.beginPath(); for (let j = 0; j <= 6; j++) { const a = j / 6 * 6.28; const hx = f.cx + Math.cos(a0) * r * 0.5 + Math.cos(a) * r * 0.28, hy = f.cy + Math.sin(a0) * r * 0.5 + Math.sin(a) * r * 0.28; j ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy); } ctx.stroke(); }
        ctx.globalAlpha = 1;
        pixRing(f.cx, f.cy, r, 1, '#d6fff0', 1);
        break;
      }
      case 'jaws': {
        const gap = s.r * (1 - Math.min(1, k * 3.5));
        ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
        glow(s.x, s.y, s.r * 1.6, s.col || '#ffffff', 0.4);
        for (const sgn of [-1, 1]) for (let i = -3; i <= 3; i++) drawBm('shard', ['#ffffff', '#ffffff', '#c9d6e3'], s.x + i * 10, s.y + sgn * (gap + 8) - sgn * Math.abs(i) * 2, 2.5, false, sgn > 0 ? Math.PI : 0);
        ctx.globalAlpha = 1; break;
      }
      case 'spike': {
        const hh = s.h * Math.min(1, k * 6) * (k > 0.7 ? (1 - k) / 0.3 : 1);
        for (let yy = 0; yy < hh; yy += PX) {
          const w = Math.max(PX, (1 - yy / hh) * (s.wide || 18));
          ctx.fillStyle = s.c[3]; ctx.fillRect(sn(s.x - w / 2), sn(s.y - yy), sn(w) || PX, PX);
          ctx.fillStyle = s.c[1]; ctx.fillRect(sn(s.x - w / 2), sn(s.y - yy), sn(w / 2) || PX, PX);
        }
        break;
      }
      case 'arc': {
        const r = 10 + k * (s.grow || 46), span = s.full ? Math.PI : 0.95, n = Math.max(6, Math.floor(r * span * 2 / PX));
        ctx.globalAlpha = 1 - k; ctx.fillStyle = s.col;
        for (let i = 0; i <= n; i++) { const a = s.a - span + (span * 2) * i / n; ctx.fillRect(sn(s.x + Math.cos(a) * r - PX), sn(s.y + Math.sin(a) * r - PX), PX * 2, PX * 2); }
        glow(s.x, s.y, r, s.col, 0.25 * (1 - k));
        ctx.globalAlpha = 1; break;
      }
      case 'crystal': {                                   // ice crystals grow out of the target, then shatter
        const g = Math.min(1, k * 4);
        glow(s.x, s.y, 60, '#bfeaff', 0.6 * (1 - k));
        for (const c of s.spikes) {
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(c.a);
          const L = c.l * g;
          ctx.fillStyle = '#4fa9e6'; ctx.beginPath(); ctx.moveTo(0, -c.w); ctx.lineTo(L, 0); ctx.lineTo(0, c.w); ctx.fill();
          ctx.fillStyle = '#e2f8ff'; ctx.beginPath(); ctx.moveTo(0, -c.w * 0.5); ctx.lineTo(L * 0.92, 0); ctx.lineTo(0, 0); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'vine': {                                      // vine lash: extends, cracks, retracts
        const e = k < 0.45 ? easeOut(k / 0.45) : 1 - easeIn((k - 0.45) / 0.55);
        const f = s.f, a = f.state === 'idle' ? f.mouth() : { x: s.ax, y: s.ay };
        const bx = a.x + (s.bx - a.x) * e, by = a.y + (s.by - a.y) * e;
        const mx = (a.x + bx) / 2 + s.bend, my = (a.y + by) / 2 - Math.abs(s.bend) * 0.8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1f5a22'; ctx.lineWidth = PX * 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
        ctx.strokeStyle = '#4fb83f'; ctx.lineWidth = PX * 1.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
        ctx.strokeStyle = '#a6eb6a'; ctx.lineWidth = PX * 0.6; ctx.beginPath(); ctx.moveTo(a.x, a.y - 2); ctx.quadraticCurveTo(mx, my - 2, bx, by - 2); ctx.stroke();
        for (let t = 0.2; t < 1; t += 0.25) { const lx = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * bx, ly = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * by; drawBm('leaf', TP.Grass.c.slice(1), lx, ly - 5, 2); }
        break;
      }
      case 'swords': {                                    // Swords Dance: blades circling the user
        const f = s.f; if (!f || f.state !== 'idle') break;
        const n = 4, rad = f.w * 0.75;
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.28 + k * 10, x = f.cx + Math.cos(a) * rad, y = f.cy + Math.sin(a) * rad * 0.45;
          ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2);
          ctx.fillStyle = '#7a8496'; ctx.fillRect(-PX, -PX * 9, PX * 2, PX * 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-PX, -PX * 9, PX, PX * 12);
          ctx.fillStyle = '#d9a441'; ctx.fillRect(-PX * 3, PX * 3, PX * 6, PX); ctx.fillRect(-PX, PX * 4, PX * 2, PX * 3);
          ctx.restore();
          glow(x, y - 12, 22, '#ffffff', 0.4);
        }
        break;
      }
      case 'moon': {                                      // Moonblast: a moon gathers over the user
        const a = Math.min(1, k * 3), r = s.r * a;
        glow(s.x, s.y, r * 3, '#ffb8e6', 0.9 * a);
        drawDisc(s.x, s.y, r / PX, '#ffd6ef'); drawDisc(s.x - PX, s.y - PX, r / PX * 0.8, '#fff0fa');
        drawDisc(s.x + r * 0.3, s.y + r * 0.2, Math.max(1, r / PX * 0.18), '#f6b8dc'); drawDisc(s.x - r * 0.35, s.y + r * 0.35, Math.max(1, r / PX * 0.12), '#f6b8dc');
        break;
      }
      case 'fist': {                                      // a big pixel fist (Shadow Punch / Meteor Mash...)
        const sc = s.s * (k < 0.25 ? 0.5 + k * 2 : 1);
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        glow(s.x, s.y, 40 * sc / 3, s.c[1], 0.7);
        drawBm('fist', s.c, s.x, s.y, sc, s.flip);
        ctx.globalAlpha = 1; break;
      }
    }
  }
  // ---------------------------------------------------------------------
  //  Rendering
  // ---------------------------------------------------------------------
  const STATUS_FILTER = { frz: 'saturate(0.35) brightness(1.3) hue-rotate(160deg)', psn: 'saturate(1.2) hue-rotate(-25deg)' };
  function drawFighter(f) {
    const m = f.mon;
    const t = m.status === 'frz' || m.status === 'slp' ? 0.4 : T * (m.status === 'par' ? 0.5 : 1);
    const breathe = f.state === 'idle' && f.speed < 20 ? Math.sin(T * (m.hp / m.maxhp < 0.3 ? 5 : 2.6) + f.p) * 0.022 : 0;
    const sleep = m.status === 'slp' ? 0.14 : 0;
    const sy = (1 - f.sq * 0.3 - f.crouch * 0.12 + breathe - sleep) * (1 - f.sink * 0.4);
    const sxm = (1 + f.sq * 0.22 + f.crouch * 0.07 - breathe * 0.5 + sleep * 0.5);
    const jit = f.white > 0.5 || f.shiver > 0 ? R(-2.5, 2.5) : 0;
    const s = f.scale * (0.2 + 0.8 * f.pop);
    // afterimages
    for (const g of f.trail) drawSprite(f.anim, g.t + f.p * 0.37, g.x, g.y, s, false, { sx: -g.sx * sxm, sy, rot: g.rot || 0, alpha: Math.max(0, g.a) * 0.55 * f.alpha, white: 1, whiteCol: f.afterCol });
    if (f.aura && T < f.auraT) { glow(f.cx, f.cy, Math.max(f.w, f.h) * 0.9, f.aura, 0.55 + Math.sin(T * 14) * 0.15); }
    drawSprite(f.anim, t + f.p * 0.37, f.x + jit, f.y - f.z, s, false,
      { sx: -f.faceVis * sxm, sy, skew: -f.lean, rot: f.tilt + f.rotA + f.rotS, alpha: f.alpha, white: Math.min(1, f.white), whiteCol: f.whiteCol, filter: STATUS_FILTER[m.status] || null });
  }
  function render() {
    const z = camZ, hw = VW / 2 / z, hh = VH / 2 / z;
    const cx = clamp(camX, hw, VW - hw), cy = clamp(camY, hh, VH - hh);
    const ox = VW / 2 - cx * z + (shake > 0 ? R(-shake, shake) : 0), oy = VH / 2 - cy * z + (shake > 0 ? R(-shake, shake) : 0);
    ctx.setTransform(SC * z, 0, 0, SC * z, SC * ox, SC * oy);
    fxEl.style.transform = z > 1.001 || shake > 0 ? `translate(${ox * UNIT}px, ${oy * UNIT}px) scale(${z})` : '';
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
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
    // shadows (Pokémon, and anything flying through the air)
    for (const f of F) if (f && f.state !== 'gone') {
      const lift = clamp(f.z / 120, 0, 0.5);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * f.alpha * (1 - lift)})`;
      const rx = f.w * 0.36 * (f.hover ? 0.75 : 1) * (0.2 + 0.8 * f.pop) * (1 - lift * 0.6);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, rx * 0.32, 0, 0, 6.28); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (const q of parts) if (q.age >= 0 && q.z > 8 && (q.kind === 'debris' || q.kind === 'drop' || q.kind === 'blob' || q.bm === 'rock' || q.bm === 'shard')) { const r = 3 + 4 * (q.s0 || 2) / (1 + q.z / 140); ctx.beginPath(); ctx.ellipse(q.x, q.y, r, r * 0.4, 0, 0, 6.28); ctx.fill(); }
    for (const o of projs) if (o.arcK > 6 || o.shadow) { ctx.beginPath(); ctx.ellipse(o.x, o.y + (o.groundOff || 30), 8, 3, 0, 0, 6.28); ctx.fill(); }
    const objs = [];
    for (const t of TR) if (t) objs.push({ y: t.y, d: () => drawTrainer(t) });
    for (const f of F) if (f && f.state !== 'gone') objs.push({ y: f.y, d: () => drawFighter(f) });
    objs.sort((a, b) => a.y - b.y).forEach(o => o.d());
    // scene dims for big moves so the effect carries the light
    if (dimA > 0.01) { ctx.fillStyle = `rgba(8,4,20,${dimA})`; ctx.fillRect(-40, -40, VW + 80, VH + 80); }
    // ground light pools (fire, lightning, beams light the floor)
    for (const l of lightsFx) {
      const k = l.age / l.life, a = l.a * (k < 0.1 ? k / 0.1 : Math.pow(1 - k, 1.4));
      ctx.save(); ctx.translate(l.x, l.y); ctx.scale(1, 0.5); glow(0, 0, l.r, l.col, a); ctx.restore();
    }
    for (const b of beams) {
      const { ex, ey } = beamHead(b), gy0 = b.from ? b.from.y : b.ay + 40, gy1 = b.to ? b.to.y : ey + 40, fade = clamp((b.life - b.age) / 0.2, 0, 1);
      for (const k of [0.15, 0.5, 0.85]) { ctx.save(); ctx.translate(b.ax + (ex - b.ax) * k, gy0 + (gy1 - gy0) * k); ctx.scale(1, 0.45); glow(0, 0, b.w * 5, b.c[1], 0.45 * fade); ctx.restore(); }
    }
    for (const s of shapes) if (s.kind === 'pillar' || s.kind === 'spike' || s.kind === 'crystal') drawShape(s);
    for (const q of parts) if (q.age >= 0) drawParticle(q);
    for (const o of projs) drawProj(o);
    for (const b of beams) drawBeam(b);
    for (const b of bolts) drawBolt(b);
    for (const s of shapes) if (s.kind !== 'pillar' && s.kind !== 'spike' && s.kind !== 'crystal') drawShape(s);
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
    if (flashA > 0) { ctx.globalAlpha = flashA; ctx.fillStyle = flashCol; ctx.fillRect(-40, -40, VW + 80, VH + 80); ctx.globalAlpha = 1; }
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
    const pl = state.players[p];
    row.insertAdjacentHTML('beforeend', '<div class="rparty">' + pl.team.map((x, i) => i === pl.active ? '' : `<button class="rsw" data-s="${i}" ${x.hp <= 0 ? 'disabled' : ''} title="Switch to ${esc(x.name)}"><img src="${x.sprite}" alt=""></button>`).join('') + '</div>');
    row.querySelectorAll('.rmv').forEach(b => b.onclick = () => queueMove(p, +b.dataset.i));
    row.querySelectorAll('.rsw').forEach(b => b.onclick = () => { const f = F[p]; if (f && f.state === 'idle') { f.queuedSwitch = +b.dataset.s; b.classList.add('q'); } });
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
    floatAt(clamp(f.x + awayX(f) * 85, 130, VW - 130), Math.max(f.top - 20 - n * 28, VH * 0.25), s, cls, 1300);
  }
  function awayX(f) { const o = foeOf(f); return o && o.state === 'idle' && Math.abs(o.x - f.x) < 260 ? (Math.sign(f.x - o.x) || (f.p ? 1 : -1)) : 0; }
  function number(f, amt, i = 0, kind = '') { floatAt(f.x + awayX(f) * 62 + R(-8, 8) + i * 12, Math.max(f.top + 16 - i * 14, VH * 0.25 + 42), String(amt), 'dmg ' + kind, 1000); }
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
  //  Generic styles are built from per-type kits (projectile, stream,
  //  beam, impact); popular moves get their own signature animation.
  // ---------------------------------------------------------------------
  const PAL = m => tp(m.type || 'Normal');
  const side = () => (Math.random() < 0.5 ? -1 : 1);
  const AURA_C = ['#ffffff', '#bfe6ff', '#4aa8ff', '#1e5ad6', '#0c2a7a'];
  // anticipation: crouch, an aura and energy gathering at the mouth, then a recoil on release
  async function charge(f, m, sec = 0.3, o = {}) {
    sec = Math.max(0.12, sec / tempo(f));
    const P = PAL(m), col = o.col || P.c[1];
    f.crouchT = 1; f.aura = col; f.auraT = T + sec + 0.15;
    if (o.dim) dimTo(o.dim, sec + (o.hold ?? 0.7));
    for (let i = 0; i < (o.motes || 18); i++) {
      const an = R(0, 6.28), r = R(30, 80);
      moteP(0, 0, o.moteCol || col, { life: sec, delay: i * sec / 24, s: 1, path: k => { const mo = f.mouth(); return { x: mo.x + Math.cos(an) * r * (1 - k), y: mo.y + Math.sin(an) * r * (1 - k) }; } });
    }
    spawn({ kind: 'glow', c: [col], x: 0, y: 0, s0: 4, s1: o.size || 36, life: sec + 0.06, a: 0.9, must: true, path: () => f.mouth() });
    await wait(sec * 1000);
    f.crouchT = 0; f.bump(-5);
    f.kx -= f.face * (o.recoil ?? 90);
  }
  async function windup(f, d, sec = 0.14) {
    const dir = Math.sign(d.x - f.x) || f.face, x0 = f.x;
    f.face = dir; f.crouchT = 1;
    await tw(sec, k => { f.x = x0 - dir * 18 * easeOut(k); });
    f.crouchT = 0;
  }
  async function dashTo(f, d, sec = 0.16, o = {}) {
    const sx = f.x, sy = f.y, dir = Math.sign(d.x - f.x) || f.face;
    const tx = d.x - dir * (f.r + d.r) * 0.7, ty = d.y + (o.dy || 0);
    f.dashing = true; f.face = dir; f.after = sec + 0.12; f.afterCol = o.afterCol || '#cfe6ff'; f.bump(-4);
    SFX.whoosh();
    await tw(sec, k => {
      const e = easeIn(k);
      f.x = sx + (tx - sx) * e; f.y = sy + (ty - sy) * e;
      if (o.jump) f.jz = Math.sin(k * Math.PI) * o.jump;
      if (o.trail) o.trail(f);
      else if (Math.random() < 0.5 && !f.hover) dust(f.x, f.y, 0.6);
    });
    f.jz = 0;
    for (let i = 0; i < 4; i++) spawn({ kind: 'streak', c: ['#ffffff'], x: f.x - dir * 10, y: f.cy + R(-f.h / 3, f.h / 3), vx: -dir * 320, vy: 0, drag: 5, life: 0.25, len: 44, ang: dir > 0 ? 0 : Math.PI });
    return { sx, sy };
  }
  async function bounceBack(f, s, h = 18) {
    const x0 = f.x, y0 = f.y, bx = x0 + (s.sx - x0) * 0.6, by = y0 + (s.sy - y0) * 0.6;
    await tw(0.3, k => { const e = easeOut(k); f.x = x0 + (bx - x0) * e; f.y = y0 + (by - y0) * e; f.jz = Math.sin(k * Math.PI) * h; });
    f.jz = 0; f.dashing = false; f.bump(3);
  }
  // element trail while dashing (Flare Blitz burns, Spark crackles...)
  function elementTrail(type) {
    const P = tp(type);
    return f => {
      if (type === 'Fire') flameP(f.x + R(-10, 10), f.cy + R(-f.h / 3, f.h / 3), R(-30, 30), R(-60, -20), R(2, 4), 0.45);
      else if (type === 'Electric') sparkP(f.x, f.cy + R(-f.h / 3, f.h / 3), R(0, 6.28), R(80, 200), '#fff27a', 0.25);
      else if (type === 'Water') spawn({ kind: 'blob', c: ['#5ab4ff', '#ffffff'], x: f.x + R(-10, 10), y: f.cy + R(-f.h / 3, f.h / 3), vx: R(-40, 40), vy: R(-40, 20), g2: 500, life: 0.5, s0: 2, s1: 1 });
      else if (type === 'Ice') moteP(f.x + R(-10, 10), f.cy + R(-f.h / 3, f.h / 3), '#e2f8ff', { life: 0.5 });
      else if (type === 'Dragon') flameP(f.x + R(-10, 10), f.cy + R(-f.h / 3, f.h / 3), R(-30, 30), R(-60, -20), R(2, 4), 0.45, { c: TP.Dragon.c });
      else if (type === 'Ghost' || type === 'Dark') smokeP(f.x, f.cy + R(-f.h / 3, f.h / 3), 3, 0.5, IMP[type].mist, { a: 0.6 });
      else moteP(f.x, f.cy + R(-f.h / 3, f.h / 3), P.c[1], { life: 0.4 });
    };
  }
  // ---- projectiles per type ----
  function projFor(m, big) {
    const t = m.type || 'Normal', P = tp(t), r = big ? 19 : 12;
    const base = { r, c: P.c, speed: big ? 660 : 820, seed: Math.random() * 9 };
    switch (t) {
      case 'Fire': return { ...base, draw: (o, x, y) => { glow(x, y, o.r * 3.4, '#ff9a3a', 0.95); const f = 1 + Math.sin(T * 40) * 0.1; drawDisc(x, y, o.r / PX * f, '#d9381e'); drawDisc(x, y - PX * 0.5, o.r / PX * 0.72 * f, '#ff8c1a'); drawDisc(x, y - PX, o.r / PX * 0.42, '#ffd23f'); drawDisc(x, y - PX, Math.max(1, o.r / PX * 0.18), '#fff7c2'); },
        trail: o => { flameP(o.x + R(-5, 5), o.y - o.arcK + R(-5, 5), R(-25, 25), R(-50, -15), o.r / PX * 0.75, 0.4); if (Math.random() < 0.25) smokeP(o.x, o.y - o.arcK, 2, 0.7); } };
      case 'Water': return { ...base, c: ['#ffffff', '#bfe9ff', '#5ab4ff', '#2b6fd6', '#1b3f8a'],
        trail: o => { if (Math.random() < 0.5) spawn({ kind: 'drop', c: ['#8fd0ff'], x: o.x + R(-6, 6), y: o.y - o.arcK + R(-6, 6), vx: R(-20, 20), vy: R(-20, 10), g2: 600, life: 0.5, s0: 1 }); if (m.id === 'water-pulse' && Math.random() < 0.15) ringP(o.x, o.y - o.arcK, 4, 26, '#bfe9ff', 0.35, { flat: 1 }); } };
      case 'Electric': return { ...base, c: ['#ffffff', '#fff59a', '#ffe000', '#d9a800', '#7a5a00'],
        draw: (o, x, y) => { orbDraw(o, x, y); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = R(0, 6.28), L = o.r * R(1.2, 2.2); line(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, '#fff59a', PX * 0.8, true); } ctx.globalCompositeOperation = 'source-over'; },
        trail: o => sparkP(o.x, o.y - o.arcK, R(0, 6.28), R(60, 160), '#fff27a', 0.22) };
      case 'Grass': return { ...base, c: ['#ffffff', '#d8ffa0', '#7ad84a', '#2f8a2a', '#14421a'],
        draw: (o, x, y) => { orbDraw(o, x, y); for (let i = 0; i < 3; i++) { const a = T * 9 + i * 2.09; drawBm('leaf', TP.Grass.c.slice(1), x + Math.cos(a) * o.r * 1.5, y + Math.sin(a) * o.r * 0.9, 2, false, a); } },
        trail: o => moteP(o.x + R(-6, 6), o.y - o.arcK + R(-6, 6), '#c8ff9a', { life: 0.4 }) };
      case 'Ice': return { ...base, c: ['#ffffff', '#eafaff', '#9be2ff', '#4fa9e6', '#2a5f9e'],
        draw: (o, x, y) => { glow(x, y, o.r * 3, '#c8f0ff', 0.9); for (let i = 0; i < 5; i++) drawBm('shard', ['#ffffff', '#e2f8ff', '#4fa9e6'], x, y, 3, false, T * 6 + i * 1.256); drawDisc(x, y, o.r / PX * 0.4, '#ffffff'); },
        trail: o => moteP(o.x + R(-6, 6), o.y - o.arcK + R(-6, 6), '#e2f8ff', { life: 0.5 }) };
      case 'Psychic': return { ...base, c: ['#ffffff', '#ffd0ec', '#ff7ac4', '#c0307e', '#5c1238'],
        draw: (o, x, y) => { orbDraw(o, x, y); ctx.strokeStyle = '#ffd0ec'; ctx.lineWidth = PX; ctx.beginPath(); ctx.ellipse(x, y, o.r * 1.7, o.r * 0.55, T * 4, 0, 6.28); ctx.stroke(); },
        trail: o => moteP(o.x, o.y - o.arcK, '#ffb0dc', { life: 0.45 }) };
      case 'Ghost': case 'Dark': {
        const rim = t === 'Ghost' ? '#8a5af0' : '#6a4a80', core = t === 'Ghost' ? '#1e0f36' : '#120a18';
        return { ...base, draw: (o, x, y) => { glow(x, y, o.r * 3.2, rim, 0.9); drawDisc(x, y, o.r / PX * 1.08, rim); drawDisc(x, y, o.r / PX * 0.86, core); for (let i = 0; i < 4; i++) { const a = T * 7 + i * 1.57; drawDisc(x + Math.cos(a) * o.r * 0.55, y + Math.sin(a) * o.r * 0.55, 1, rim); } },
          trail: o => smokeP(o.x + R(-4, 4), o.y - o.arcK + R(-4, 4), R(2, 3), 0.55, IMP[t].mist, { vx: R(-20, 20), vy: R(-30, 0), a: 0.75 }) };
      }
      case 'Dragon': return { ...base, draw: (o, x, y) => { glow(x, y, o.r * 3.2, '#9f8cff', 0.95); drawDisc(x, y, o.r / PX, '#3a22a8'); drawDisc(x, y - PX * 0.5, o.r / PX * 0.7, '#6447ee'); drawDisc(x, y - PX, o.r / PX * 0.35, '#e6dcff'); },
        trail: o => flameP(o.x + R(-5, 5), o.y - o.arcK + R(-5, 5), R(-25, 25), R(-40, -10), o.r / PX * 0.7, 0.4, { c: TP.Dragon.c }) };
      case 'Fairy': return { ...base, c: ['#ffffff', '#ffe0f4', '#ff9bd6', '#e05aa6', '#8a2a60'],
        trail: o => { if (Math.random() < 0.4) spawn({ bm: 'star', c: ['#ffffff', '#ffd6ef'], x: o.x + R(-8, 8), y: o.y - o.arcK + R(-8, 8), life: 0.4, s0: 2, s1: 1 }); } };
      case 'Fighting': return { ...base, c: AURA_C, speed: 760, curve: m.id === 'aura-sphere' ? 0.06 * side() : 0, trail: o => moteP(o.x + R(-5, 5), o.y - o.arcK + R(-5, 5), '#8fd0ff', { life: 0.4 }) };
      case 'Poison': return { ...base, arc: 70, speed: 600, draw: (o, x, y) => { glow(x, y, o.r * 2.4, '#c56bf0', 0.6); drawDisc(x, y, o.r / PX, '#4e1a70'); drawDisc(x, y, o.r / PX * 0.8, '#8e34c4'); drawDisc(x - PX, y - PX, o.r / PX * 0.35, '#e7b0ff'); },
        trail: o => { if (Math.random() < 0.4) spawn({ kind: 'blob', c: ['#8e34c4'], x: o.x, y: o.y - o.arcK, vy: 20, g2: 500, life: 0.5, s0: 1.5, s1: 1 }); } };
      case 'Steel': return { ...base, c: ['#ffffff', '#f2f6ff', '#c3cedd', '#7d899a', '#3e4550'], trail: o => sparkP(o.x, o.y - o.arcK, R(0, 6.28), R(40, 120), '#ffffff', 0.2) };
      case 'Ground': return { ...base, arc: 45, c: ['#f6e2b4', '#c99a5a', '#946a3a', '#5a3e22', '#3b2814'], trail: o => { if (Math.random() < 0.4) spawn({ kind: 'blob', c: ['#7a5432'], x: o.x, y: o.y - o.arcK, vy: 20, g2: 600, life: 0.45, s0: 1.5, s1: 1 }); } };
      case 'Rock': return { ...base, arc: 90, speed: 620, shadow: true, groundOff: 40, draw: (o, x, y) => drawBm('rock', ['#8a7a62', '#bcae90', '#4a4032'], x, y, big ? 7 : 5, false, o.age * 8), trail: o => { if (Math.random() < 0.2) dust(o.x, o.y - o.arcK, 0.3); } };
      default: return { ...base, trail: o => moteP(o.x + R(-5, 5), o.y - o.arcK + R(-5, 5), P.c[1], { life: 0.35 }) };
    }
  }
  async function fire(f, d, m, o, extra = {}) {
    const mo = f.mouth();
    return shoot({ x: mo.x, y: mo.y, to: d, miss: o.miss, missOff: R(55, 80) * side(), ...projFor(m, extra.big), ...extra });
  }
  const S = {};
  S.orb = async (f, d, m, o, hit, big = false) => {
    await charge(f, m, big ? 0.5 : 0.28, { dim: big ? 0.28 : 0, size: big ? 50 : 34 });
    if (!on) return;
    SFX.whoosh();
    const q = await fire(f, d, m, o, { big });
    hit();
    if (o.miss) { impactAt(m.type || 'Normal', q.x, q.y, q.y + 30, 0.5); return; }
    if (big) { camPunch(d.cx, d.cy, 0.07, 0.35); shakeIt(9); smoke(center(d), 7); }
  };
  function streamEmit(m, x, y, ux, uy, L, pw) {
    const t = m.type || 'Normal', sp = R(560, 690), s = R(-0.12, 0.12), vx = (ux - uy * s) * sp, vy = (uy + ux * s) * sp, life = L / sp * R(0.95, 1.12);
    switch (t) {
      case 'Fire': flameP(x, y, vx, vy, R(3, 5.5) * pw, life, { drag: 0.25 }); if (Math.random() < 0.15) smokeP(x + vx * life * 0.8, y + vy * life * 0.8, 3, 0.9, undefined, { delay: life * 0.7 }); break;
      case 'Dragon': flameP(x, y, vx, vy, R(3, 5) * pw, life, { drag: 0.25, c: TP.Dragon.c }); break;
      case 'Water': spawn({ kind: 'blob', c: [pick(['#5ab4ff', '#8fd0ff', '#3a8ae6']), '#ffffff'], x, y, vx, vy, life, s0: R(2.5, 4.2) * pw, s1: 2 }); if (Math.random() < 0.35) spawn({ kind: 'drop', c: ['#bfe9ff'], x, y, vx: vx * 0.5, vy: vy * 0.5 + R(-40, 0), g2: 700, life: life * 1.4, s0: 1 }); break;
      case 'Ice': if (Math.random() < 0.5) spawn({ bm: 'shard', c: ['#ffffff', '#e2f8ff', '#4fa9e6'], x, y, vx, vy, life, s0: 2, s1: 2, rot: R(0, 6), spin: 12 }); else moteP(x, y, '#e2f8ff', { vx, vy, drag: 0, life }); if (Math.random() < 0.3) smokeP(x, y, 3, life * 1.3, ['#ffffff', '#e8f6ff', '#cfe8f8'], { vx: vx * 0.6, vy: vy * 0.6, a: 0.45 }); break;
      case 'Poison': smokeP(x, y, R(3, 5) * pw, life * 1.5, ['#c56bf0', '#8e34c4', '#4e1a70'], { vx: vx * 0.65, vy: vy * 0.65, a: 0.6, grow: 1.6 }); break;
      case 'Flying': if (Math.random() < 0.5) spawn({ kind: 'streak', c: ['#ffffff'], x, y, vx, vy, life, len: 30, ang: Math.atan2(vy, vx) }); else smokeP(x, y, 2, life, ['#ffffff', '#eef4ff', '#dce8f5'], { vx, vy, a: 0.4 }); break;
      case 'Ground': spawn({ kind: 'blob', c: [pick(['#7a5432', '#946a3a', '#5a3e22']), '#c99a5a'], x, y, vx, vy, life, s0: R(2, 3.5), s1: 2 }); break;
      default: { const P = tp(t); spawn({ bm: P.bm, c: P.c, ramp: true, x, y, vx, vy, life, s0: 2, s1: 3 }); }
    }
  }
  S.stream = async (f, d, m, o, hit) => {
    const pw = (m.power || 60) >= 100 ? 1.35 : (m.power || 60) <= 40 ? 0.75 : 1;
    const offY = o.miss ? R(45, 65) * side() : 0;
    await charge(f, m, 0.16, { motes: 8, size: 24, recoil: 30 });
    SFX.stream(m.type, 0.85);
    const t0 = T, K = IMP[m.type] || IMP.Normal;
    lightAt(f.x, f.y, 140, K.light, 1.0, 0.7, () => { const mo = f.mouth(); return { x: (mo.x + d.cx) / 2, y: (f.y + d.y) / 2 }; });
    let hitDone = false;
    while (T - t0 < 0.85 && on) {
      const mo = f.mouth(), tx = d.cx, ty = d.cy + offY, dx = tx - mo.x, dy = ty - mo.y, L = Math.hypot(dx, dy) || 1;
      for (let i = 0; i < 4; i++) streamEmit(m, mo.x, mo.y, dx / L, dy / L, L, pw);
      f.kx -= f.face * 8;
      if (!hitDone && T - t0 > 0.3) { hitDone = true; hit(); }
      if (hitDone && !o.miss && Math.random() < 0.5) impactAt(m.type || 'Normal', tx + R(-10, 10), ty + R(-10, 10), d.y, 0.35, { quiet: true });
      await wait(30);
    }
    if (!hitDone) hit();
    if (m.type === 'Fire' && !o.miss) for (let k = 0.35; k < 1; k += 0.3) addDecal('scorch', f.x + (d.x - f.x) * k, f.y + (d.y - f.y) * k, 0.6);
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
      shakeIt(10); flash('#ffffff', 0.3); cheer = 1; AudioFX.Crowd.cheer(1);
      camPunch(mid.x, mid.y, 0.1, 1.2); dimTo(0.35, 1.2);
      lightAt(mid.x, mid.y + 60, 260, '#ffffff', 1.2, 0.8);
      for (let i = 0; i < 18; i++) later(() => { if (tk !== token) return; impactAt(i % 2 ? b1.m.type : b2.m.type, mid.x + R(-10, 10), mid.y + R(-10, 10), mid.y + 60, 0.6, { quiet: true }); if (i % 4 === 0) ringP(mid.x, mid.y, 6, 70, '#ffffff', 0.3, { flat: 1 }); }, i * 50);
      await wait(950);
      if (tk !== token) return;
      const power = b => { const u = b.owner.mon, mv = b.m, phys = mv.cat === 'physical'; return (mv.power || 60) * u.stats[phys ? 'atk' : 'spa'] * stageMult(u.stages[phys ? 'atk' : 'spa']) * (u.types.includes(mv.type) ? 1.5 : 1) * R(0.85, 1.15); };
      const w = power(b1) >= power(b2) ? b1 : b2, l = w === b1 ? b2 : b1;
      c.winner = w;
      l.life = l.age + 0.12;
      impactAt(w.m.type, mid.x, mid.y, mid.y + 60, 1.6);
      c.res();
    })();
  }
  const BEAM = {
    'hyper-beam': { c: ['#ffffff', '#ffd27a', '#ff9a2a', '#d9541e'], deco: 'rings', w: 28, dim: 0.4, shake: 5 },
    'solar-beam': { c: ['#ffffff', '#f6ffb0', '#c8f05a', '#5aa83a'], w: 32, dim: 0.3, shake: 4 },
    'flash-cannon': { c: ['#ffffff', '#f2f6ff', '#c3cedd', '#7d899a'], w: 22, dim: 0.25 },
    'dragon-pulse': { c: ['#ffffff', '#b8a8ff', '#6a4cf0', '#2e1a9a'], deco: 'spiral', w: 22, dim: 0.25 },
    'dark-pulse': { c: ['#f0e0ff', '#a070c8', '#4a2a5a', '#1a0c24'], deco: 'dark', w: 22, dim: 0.3 },
    'aurora-beam': { c: ['#ffffff', '#bff8ff', '#7ad8ff', '#4a8ad6'], deco: 'rainbow', w: 16 },
    'psybeam': { c: ['#ffffff', '#ffb0e0', '#e05aa6', '#8a2a60'], deco: 'rainbow', w: 16 },
    'power-gem': { c: ['#ffffff', '#ffe0f0', '#ff8ac4', '#c03a7a'], deco: 'gems', w: 18 },
    'steel-beam': { c: ['#ffffff', '#f2f6ff', '#c3cedd', '#7d899a'], w: 30, dim: 0.35, shake: 5 }
  };
  S.beam = async (f, d, m, o, hit) => {
    const P = PAL(m), B = BEAM[m.id] || { c: P.c.slice(0, 4), w: (m.power || 60) >= 100 ? 24 : 16, deco: m.type === 'Ice' ? 'ice' : m.type === 'Fire' ? 'fire' : null };
    if (m.cat !== 'status') maybeClash(d, f);
    await charge(f, m, m.id === 'solar-beam' ? 0.9 : 0.34, { dim: B.dim || 0.15, col: B.c[1], size: B.w * 2.2, hold: 1.0, motes: m.id === 'solar-beam' ? 40 : 18, moteCol: m.id === 'solar-beam' ? '#fff8a0' : null });
    if (!on || f.state !== 'idle') return;
    SFX.beam(m.type, 0.6);
    const mo = f.mouth(), mOff = side();
    const b = beamFx({ from: f, to: o.miss ? null : d, owner: f, m, ax: mo.x, ay: mo.y, bx: d.cx + (o.miss ? 90 : 0), by: d.cy + (o.miss ? 60 * mOff : 0), w: B.w, c: B.c, life: 0.85, deco: B.deco });
    if (B.shake) { shakeIt(B.shake); later(() => shakeIt(B.shake), 300); }
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
    if (!o.miss && B.w >= 24) camPunch(d.cx, d.cy, 0.06, 0.5);
    await wait(Math.max(0, (b.life - b.age) * 1000));
  };
  S.bolt = async (f, d, m, o, hit) => {
    const pw = (m.power || 60) >= 80 ? 1 : 0.65;
    await charge(f, m, 0.22, { col: '#fff59a', motes: 10, size: 26, recoil: 40 });
    SFX.zap(); SFX.thunder && pw >= 1 && SFX.zap();
    const off = o.miss ? 80 * side() : 0;
    for (let i = 0; i < (pw >= 1 ? 3 : 1); i++) later(() => boltFx({ from: f, to: o.miss ? null : d, off, ax: f.mouth().x, ay: f.mouth().y, bx: d.cx + off, by: d.cy + (o.miss ? 30 : 0), jag: 30 * pw, c: TP.Electric.c, life: 0.42, w: pw }), i * 90);
    lightAt(d.x + off, d.y, 200 * pw, '#ffe94a', 0.6, 0.9);
    flash('#fffbe0', 0.12 * pw);
    await wait(90);
    hit();
    if (!o.miss) { const fz = d; for (let i = 0; i < 8; i++) later(() => { if (fz.state === 'idle') { fz.white = 0.8; fz.whiteCol = '#fff59a'; sparkP(fz.x + R(-fz.w / 2, fz.w / 2), fz.cy + R(-fz.h / 2, fz.h / 2), R(0, 6.28), R(60, 160), '#fff27a', 0.2); } }, i * 50); }
    await wait(380);
  };
  S.sky = async (f, d, m, o, hit) => {
    await charge(f, m, 0.4, { col: '#fff59a', dim: 0.5, hold: 0.9, size: 30 });
    const tx = d.x + (o.miss ? 85 * side() : 0), ty = d.y;
    // a dark cloud gathers, then the bolt
    for (let i = 0; i < 8; i++) smokeP(tx + R(-60, 60), field.y0 - 40 + R(-10, 10), R(5, 7), 0.9, ['#3a3a4a', '#2a2a36', '#1a1a22'], { vx: R(-10, 10), vy: 0, a: 0.75 });
    await wait(250);
    SFX.thunder(); flash('#fffbe0', 0.6);
    boltFx({ ax: tx + R(-30, 30), ay: field.y0 - 60, bx: tx, by: ty - (o.miss ? 0 : d.z + d.h * 0.4), jag: 44, c: TP.Electric.c, life: 0.55, w: 2.2 });
    later(() => boltFx({ ax: tx + R(-50, 50), ay: field.y0 - 60, bx: tx + R(-10, 10), by: ty - 10, jag: 40, c: TP.Electric.c, life: 0.3, w: 1.2 }), 120);
    lightAt(tx, ty, 300, '#ffe94a', 0.8, 1);
    await wait(80);
    hit();
    addDecal('scorch', tx, ty, 1.5); ringP(tx, ty, 10, 110, '#fff59a', 0.5); shakeIt(10); camPunch(tx, ty - 40, 0.08, 0.4);
    for (let i = 0; i < 20; i++) sparkP(tx, ty - 10, R(3.3, 6.1), R(200, 480), '#fff27a', R(0.3, 0.6));
    await wait(450);
  };
  S.quake = async (f, d, m, o, hit) => {
    const big = (m.power || 60) >= 90;
    f.crouchT = 1;
    await tw(0.32, k => { f.jz = Math.sin(k * Math.PI) * (big ? 46 : 30); });
    f.jz = 0; f.crouchT = 0; f.bump(9);
    SFX.quake(); shakeIt(big ? 16 : 10); camPunch(f.x, f.y - 30, 0.05, 0.5);
    for (let i = 0; i < 3; i++) ringFx(f.x, f.y, 20, Math.max(VW, VH) * 0.5, i ? '#8a6a44' : '#f0d4a0', 0.9, { delay: i * 0.14, w: 2 });
    dust(f.x, f.y, 3);
    // cracks race across the ground toward the target, rocks pop up everywhere
    const steps = 7;
    for (let s = 0; s <= steps; s++) later(() => { const k = s / steps; addDecal('crack', f.x + (d.x - f.x) * k + R(-14, 14), f.y + (d.y - f.y) * k + R(-8, 8), 0.8 + k * 0.4); }, s * 28);
    for (let i = 0; i < (big ? 16 : 9); i++) { const kk = Math.random(), gx = clamp(f.x + (d.x - f.x) * kk + R(-50, 50), field.x0, field.x1), gy = clamp(f.y + (d.y - f.y) * kk + R(-30, 30), field.y0, field.y1); spawn({ kind: 'debris', c: ['#7a5432', '#a8773e', '#3b2814'], x: gx, y: gy, z: 0, vz: R(160, 340), g: 1000, vx: R(-30, 30), vy: R(-10, 10), life: R(0.7, 1.1), s0: pick([2, 2, 3]), rot: R(0, 6), spin: R(-10, 10), bounce: true, delay: R(0, 0.25) }); }
    await wait(260);
    hit();
    dust(d.x, d.y, 2.2);
    await wait(500);
  };
  S.rockslide = async (f, d, m, o, hit) => {
    SFX.rumble(0.9);
    const big = m.id === 'rock-slide';
    for (let i = 0; i < (big ? 7 : 4); i++) {
      const tx = d.x + R(-55, 55) + (o.miss ? 100 * side() : 0), ty = d.y + R(-20, 20);
      spawn({ kind: 'debris', c: ['#8a7a62', '#bcae90', '#4a4032'], x: tx, y: ty, z: 520, vz: -260, g: 1600, life: 1.15, delay: i * 0.08, s0: pick([5, 6, 7]), rot: R(0, 6), spin: R(-4, 4), must: true,
        land: q => { dust(q.x, q.y, 1.6, ['#cdb89a', '#b39c7e', '#8a7454']); shakeIt(5); addDecal('crack', q.x, q.y, 0.8); for (let j = 0; j < 5; j++) spawn({ kind: 'debris', c: ['#8a7a62', '#bcae90', '#4a4032'], x: q.x, y: q.y, z: 4, vz: R(120, 260), g: 1000, vx: R(-150, 150), vy: R(-60, 60), life: 0.7, s0: 2, rot: R(0, 6), spin: 10 }); SFX.impact('Rock', 0.8, 1); } });
    }
    await wait(560);
    hit();
    await wait(450);
  };
  S.spikes = async (f, d, m, o, hit) => {
    const P = PAL(m), ax = f.x, ay = f.y, bx = d.x + (o.miss ? 90 * side() : 0), by = d.y;
    SFX.rumble(0.6);
    for (let i = 1; i <= 8; i++) {
      const k = i / 8, last = i === 8;
      later(() => {
        const x = ax + (bx - ax) * k + R(-8, 8), y = ay + (by - ay) * k + R(-5, 5);
        shapes.push({ kind: 'spike', x, y, c: P.c, h: last ? 110 : 26 + k * 40, wide: last ? 40 : 18, life: last ? 0.8 : 0.6, age: 0 });
        if (last) shapes.push({ kind: 'spike', x: x - 22, y: y + 4, c: P.c, h: 70, wide: 26, life: 0.75, age: 0 }, { kind: 'spike', x: x + 22, y: y + 6, c: P.c, h: 64, wide: 24, life: 0.75, age: 0 });
        dust(x, y, last ? 2 : 0.8); addDecal('crack', x, y, 0.6);
        if (i % 2) SFX.slash();
      }, i * 42);
    }
    await wait(8 * 42 + 30);
    hit();
    await wait(380);
  };
  S.geyser = async (f, d, m, o, hit) => {
    const P = PAL(m), tx = d.x + (o.miss ? 85 * side() : 0), ty = d.y, fire = m.type === 'Fire';
    await charge(f, m, 0.25, { dim: 0.3, hold: 1.1 });
    if (m.id === 'lava-plume') { ringFx(f.x, f.y, 10, 260, '#ff8a2a', 0.6, { w: 2 }); for (let i = 0; i < 26; i++) { const an = i / 26 * 6.28; flameP(f.x + Math.cos(an) * 30, f.y + Math.sin(an) * 14, Math.cos(an) * 260, Math.sin(an) * 120, 4, 0.6); } }
    // the ground glows and cracks under the target, then erupts
    ringFx(tx, ty, 6, 50, P.c[2], 0.35);
    lightAt(tx, ty, 120, fire ? '#ff6a1a' : '#d9ad6a', 0.9, 0.9);
    addDecal('crack', tx, ty, 1);
    for (let i = 0; i < 12; i++) spawn({ sq: 1, c: P.c, ramp: true, x: tx + R(-30, 30), y: ty + R(-8, 8), vy: -40, life: 0.3, delay: i * 0.025, s0: 2, s1: 1 });
    SFX.rumble(0.7); shakeIt(4);
    await wait(300);
    shapes.push({ kind: 'pillar', x: tx, y: ty + 6, w: 70, h: 150 + (m.power || 80) * 0.45, n: 7, c: fire ? ['#fff7c2', '#ffd23f', '#ff8c1a', '#d9381e'] : [P.c[0], P.c[1], P.c[2], P.c[3]], life: 0.9, age: 0 });
    for (let i = 0; i < 30; i++) (fire ? flameP(tx + R(-30, 30), ty, R(-50, 50), R(-460, -240), R(3, 5), R(0.5, 0.9), { delay: i * 0.012 }) : spawn({ kind: 'debris', c: ['#7a5432', '#a8773e', '#3b2814'], x: tx + R(-24, 24), y: ty, z: 10, vz: R(300, 560), g: 1100, vx: R(-90, 90), vy: R(-30, 30), life: 1.1, s0: pick([2, 3]), rot: R(0, 6), spin: 10, bounce: true, delay: i * 0.01 }));
    for (let i = 0; i < 8; i++) smokeP(tx + R(-30, 30), ty - R(40, 140), R(4, 6), 1.4, undefined, { delay: 0.3 + i * 0.04 });
    SFX.impact(m.type, 1.4, 1);
    hit();
    addDecal(fire ? 'scorch' : 'crack', tx, ty, 1.6); shakeIt(9); camPunch(tx, ty - 60, 0.06, 0.45);
    await wait(750);
  };
  S.wave = async (f, d, m, o, hit) => {
    const P = PAL(m), t = m.type;
    SFX.stream(t, 1.1);
    if (t !== 'Water') dimTo(0.2, 1.2);
    const ax = f.x, ay = f.y, dx = d.x - ax, dy = d.y - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const t0 = T, dur = 1.0;
    let done = false;
    while (T - t0 < dur && on) {
      const k = (T - t0) / dur * 1.35, cx = ax + dx * k, cy = ay + dy * k;
      for (let i = -5; i <= 5; i++) {
        const px = cx + nx * i * 18 + R(-6, 6), py = cy + ny * i * 18;
        if (t === 'Water' || t === 'Ground') {
          const col = t === 'Water' ? ['#3a8ae6', '#5ab4ff', '#8fd0ff'] : ['#5a3e22', '#7a5432', '#946a3a'];
          spawn({ kind: 'blob', c: [pick(col), '#ffffff'], x: px, y: py, z: R(10, 70), vz: R(-40, 60), g: 300, vx: ux * 120, vy: uy * 120, life: 0.45, s0: R(3, 5), s1: 2 });
          if (Math.random() < 0.35) spawn({ kind: 'blob', c: ['#ffffff', '#e8f8ff'], x: px, y: py, z: R(60, 90), vx: ux * 140, vy: uy * 140, life: 0.3, s0: 2, s1: 1 });
        } else if (t === 'Ice') {
          spawn({ kind: 'streak', c: ['#ffffff'], x: px, y: py - R(0, 60), vx: ux * 700, vy: uy * 700 + 80, life: 0.25, len: 30, ang: Math.atan2(uy * 700 + 80, ux * 700) });
          if (Math.random() < 0.4) spawn({ bm: 'shard', c: ['#ffffff', '#e2f8ff', '#4fa9e6'], x: px, y: py - R(0, 60), vx: ux * 500, vy: uy * 500, life: 0.3, s0: 2, s1: 2, rot: R(0, 6), spin: 14 });
          if (Math.random() < 0.3) smokeP(px, py - R(0, 40), 4, 0.6, ['#ffffff', '#eef8ff', '#d8ecf8'], { vx: ux * 200, vy: uy * 200, a: 0.45 });
        } else flameP(px, py - R(0, 30), ux * 140, uy * 140 - 60, R(3, 5), 0.45, { c: t === 'Fire' ? undefined : P.c });
      }
      if (!done && k >= 1) { done = true; hit(); }
      await wait(30);
    }
    if (!done) hit();
    if (t === 'Water') addDecal('wet', d.x, d.y, 1.6);
    if (t === 'Ice') addDecal('frost', d.x, d.y, 1.6);
  };
  S.sound = async (f, d, m, o, hit) => {
    SFX.sonic();
    const col = m.type === 'Bug' ? '#cdeb5a' : m.type === 'Dark' ? '#a070c8' : m.type === 'Fairy' ? '#ff9bd6' : '#ffffff';
    f.bump(-6);
    for (let i = 0; i < 6; i++) later(() => {
      if (!on) return;
      const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x);
      shapes.push({ kind: 'arc', x: mo.x, y: mo.y, a, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, col, life: 0.6, age: 0, grow: 60 });
      if (i % 2) spawn({ bm: 'note', c: [col, '#ffffff'], x: mo.x, y: mo.y, vx: Math.cos(a) * 300 + R(-40, 40), vy: Math.sin(a) * 300 + R(-60, 0), life: 0.7, s0: 2, s1: 2, fade: true });
    }, i * 75);
    await wait(380);
    hit();
    await wait(250);
  };
  async function tornado(x, y, m, sec = 1.0, colOverride) {
    const P = PAL(m), col = colOverride || (m.type === 'Dragon' ? TP.Dragon.c : m.type === 'Fire' ? TP.Fire.c : P.c);
    for (let i = 0; i < 110; i++) {
      const ph = R(0, 6.28), hh = R(0, 170), spin = R(10, 16);
      const kind = m.type === 'Fire' || m.type === 'Dragon' ? 'flame' : i % 3 ? 'streak' : 'smoke';
      spawn({ kind, c: kind === 'smoke' ? ['#ffffff', '#e6eef8', '#cdd8e6'] : col, x, y, life: sec * R(0.6, 1), delay: i * sec / 140, s0: 3, s1: 1, len: 18, ang: 0, a: 0.5,
        path: k => { const rr = 12 + (hh * k) * 0.35 + Math.sin(T * 3) * 4, a = ph + k * spin; return { x: x + Math.cos(a) * rr + Math.sin(k * 6 + T * 2) * 8, y: y - hh * k - 4 + Math.sin(a) * rr * 0.3 }; } });
    }
    for (let i = 0; i < 6; i++) dust(x + R(-20, 20), y, 1);
  }
  S.wind = async (f, d, m, o, hit) => {
    SFX.whoosh();
    if (m.id === 'hurricane' || m.id === 'twister') {
      await charge(f, m, 0.25, { col: '#ffffff', dim: 0.2 });
      const tx = d.x + (o.miss ? 80 * side() : 0), ty = d.y;
      tornado(tx, ty, m, 1.1);
      await wait(300); hit(); if (!o.miss) { d.jz = 0; tw(0.6, k => { if (d.state === 'idle') d.jz = Math.sin(k * Math.PI) * 50; }).then(() => { d.jz = 0; }); }
      await wait(700);
      return;
    }
    await crescents(f, d, m, o, hit, 3);
  };
  // wind / psychic / water blades: glowing crescents flying at the target
  async function crescents(f, d, m, o, hit, n = 3) {
    const P = PAL(m), col = m.type === 'Psychic' ? '#ff9ccf' : m.type === 'Water' ? '#8fd0ff' : m.type === 'Fighting' ? '#ffd59a' : '#ffffff';
    await charge(f, m, 0.18, { col, motes: 8, size: 22, recoil: 40 });
    let first = null;
    for (let i = 0; i < n; i++) {
      const mo = f.mouth();
      SFX.slash();
      const pr = shoot({ x: mo.x, y: mo.y + (i - (n - 1) / 2) * 18, to: d, miss: o.miss, missOff: 70 * side(), speed: 880, seed: i,
        draw: (q, x, y) => { glow(x, y, 34, col, 0.7); ctx.save(); ctx.translate(x, y); ctx.rotate(q.ang || 0); ctx.strokeStyle = col; ctx.lineWidth = PX * 2.2; ctx.beginPath(); ctx.arc(-10, 0, 20, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = PX; ctx.beginPath(); ctx.arc(-10, 0, 20, -0.9, 0.9); ctx.stroke(); ctx.restore(); },
        trail: q => spawn({ kind: 'streak', c: [col], x: q.x, y: q.y, vx: 0, vy: 0, life: 0.18, len: 26, ang: q.ang || 0 }) });
      if (!first) first = pr.then(() => hit());
      pr.then(q => { if (!o.miss) impactAt(m.type || 'Flying', q.x, q.y, d.y, 0.5, { quiet: true }); });
      await wait(90);
    }
    await first;
    await wait(250);
  }
  const MULTI_BM = { Grass: 'leaf', Bug: 'needle', Ice: 'shard', Water: 'bubble', Steel: 'shard', Normal: 'star', Rock: 'rock', Dragon: 'shard', Fairy: 'heart', Psychic: 'star', Fire: 'flame', Ground: 'rock' };
  S.multi = async (f, d, m, o, hit) => {
    const P = PAL(m), bm = MULTI_BM[m.type] || P.bm, homing = m.id === 'magical-leaf' || m.id === 'swift';
    const n = m.id === 'leaf-storm' || m.id === 'petal-dance' || m.id === 'petal-blizzard' ? 14 : 6;
    if (n > 6) return storm(f, d, m, o, hit);
    await charge(f, m, 0.15, { motes: 8, size: 22, recoil: 30 });
    let first = null;
    for (let i = 0; i < n; i++) {
      if (!on) return;
      const mo = f.mouth();
      SFX.whoosh();
      const pr = shoot({ x: mo.x, y: mo.y + R(-12, 12), to: d, miss: o.miss, missOff: R(50, 80) * side(), speed: R(700, 880), bm, c: homing ? ['#ffffff', P.c[1], P.c[2]] : P.c.slice(1), s: 3, spin: bm === 'leaf' || bm === 'star' ? 14 : 0, rotAlong: bm === 'needle' || bm === 'shard', arc: homing ? 0 : R(-30, 30), curve: homing ? R(0.5, 0.9) * side() : 0,
        trail: q => homing ? moteP(q.x, q.y - q.arcK, P.c[1], { life: 0.3 }) : spawn({ kind: 'streak', c: [P.c[1]], x: q.x, y: q.y - q.arcK, vx: 0, vy: 0, life: 0.12, len: 16, ang: q.ang || 0 }) });
      if (!first) first = pr.then(() => hit());
      pr.then(q => { if (!o.miss) impactAt(m.type || 'Normal', q.x, q.y, d.y, 0.35, { quiet: true }); });
      await wait(70);
    }
    await first;
    await wait(250);
  };
  // Leaf Storm / Petal Dance: a spiralling storm that rolls into the target
  async function storm(f, d, m, o, hit) {
    const petals = m.id !== 'leaf-storm';
    await charge(f, m, 0.3, { dim: 0.2, col: petals ? '#ffb0d8' : '#a6eb6a' });
    SFX.stream('Grass', 1.1);
    const tx = d.cx + (o.miss ? 80 * side() : 0), ty = d.cy;
    for (let i = 0; i < 70; i++) {
      const ph = R(0, 6.28), rr = R(14, 46), mo = f.mouth(), delay = i * 0.012;
      spawn({ bm: petals && i % 2 ? 'heart' : 'leaf', c: petals ? ['#ffb0d8', '#ffe0f0', '#e05aa6'] : TP.Grass.c.slice(1), x: mo.x, y: mo.y, life: 0.8, delay, s0: 2, s1: 2, rot: R(0, 6), spin: 16,
        path: k => { const e = easeIn(k), a = ph + k * 14; return { x: mo.x + (tx - mo.x) * e + Math.cos(a) * rr * (1 - e * 0.4), y: mo.y + (ty - mo.y) * e + Math.sin(a) * rr * 0.6 }; } });
    }
    await wait(700);
    hit();
    if (!o.miss) tornado(d.x, d.y, m, 0.6, petals ? ['#ffb0d8', '#ffe0f0', '#e05aa6'] : null);
    await wait(400);
  }
  S.vortex = async (f, d, m, o, hit) => {
    const t = m.type, tx = d.x, ty = d.y;
    SFX.stream(t, 1.0);
    const col = t === 'Fire' ? TP.Fire.c : t === 'Water' ? ['#ffffff', '#bfe9ff', '#5ab4ff', '#2b6fd6'] : t === 'Ground' ? ['#f6e2b4', '#d9ad6a', '#a8773e', '#6e4a26'] : tp(t).c;
    for (let i = 0; i < 90; i++) {
      const ph = i / 90 * 6.28 * 4, hh = (i % 12) * 8;
      spawn({ kind: t === 'Fire' ? 'flame' : 'blob', c: t === 'Fire' ? TP.Fire.c : [col[i % 3 + 1], col[0]], x: tx, y: ty, life: 1.0, delay: i * 0.008, s0: 3, s1: 1.5,
        path: k => ({ x: tx + Math.cos(ph + k * 12) * (d.r + 14 - k * 6), y: ty - hh * (0.4 + k * 0.6) - 6 + Math.sin(ph + k * 12) * 12 }) });
    }
    lightAt(tx, ty, 120, (IMP[t] || IMP.Normal).light, 1.1, 0.8);
    await wait(160); hit(); await wait(850);
  };
  S.drain = async (f, d, m, o, hit) => {
    await charge(f, m, 0.2, { col: '#a6ff7a', motes: 10 });
    hit();
    if (o.miss) return;
    const kiss = m.id === 'draining-kiss';
    for (let i = 0; i < 18; i++) {
      const ox = R(-24, 24), oy = R(-24, 24), bend = R(-80, 80);
      const pt = k => { const a = center(d), b = center(f); return { x: a.x + ox * (1 - k) + (b.x - a.x) * k, y: a.y + oy * (1 - k) + (b.y - a.y) * k - Math.sin(k * Math.PI) * (50 + bend * 0.3) }; };
      if (kiss) spawn({ bm: 'heart', c: ['#ff8ed0', '#ffd6ef'], x: 0, y: 0, life: 0.8, delay: 0.25 + i * 0.035, s0: 2, s1: 2, path: pt });
      else moteP(0, 0, '#a6ff7a', { life: 0.8, delay: 0.25 + i * 0.035, s: 1.4, path: pt });
    }
    later(() => { if (f.state === 'idle') { glowP(f.cx, f.cy, 10, 70, '#a6ff7a', 0.5, 0.8); f.white = 0.5; f.whiteCol = '#c8ffb0'; } }, 900);
    await wait(950);
  };
  // ---- precise physical moves: every contact move has its own look ----
  // v: claw blade x chop fang fist palm kick tail wing spin tongue bone clap charge
  const C_DRAGON = ['#efe8ff', '#9070ff', '#6a3cf0', '#22107a'], C_STEEL = ['#ffffff', '#f2f6ff', '#aeb9c8', '#56606e'], C_WHITE = ['#ffffff', '#ffffff', '#d8d4cc', '#7a7468'];
  const C_FIRE = ['#fff7c2', '#ffd23f', '#ff7a1a', '#c22a10'], C_ICE = ['#ffffff', '#e2f8ff', '#8fd8ff', '#2f7fc8'], C_ELEC = ['#ffffff', '#fff59a', '#ffd800', '#a07a00'];
  const C_DARK = ['#f0e0ff', '#a878d0', '#4a2560', '#160a1e'], C_GRASS = ['#ffffff', '#c8ff9a', '#4fb83f', '#1a5020'], C_BUG = ['#ffffff', '#ecff9a', '#9ac22c', '#46600e'];
  const C_FIGHT = ['#fff6dc', '#ffc870', '#f07a24', '#a03a10'], C_WATER = ['#ffffff', '#c8ecff', '#4aa8f0', '#1c4fa8'], C_PSY = ['#ffffff', '#ffc8e8', '#f0539f', '#8a1f5c'];
  const C_GHOST = ['#f4ecff', '#c8a8ff', '#7d4fd6', '#2e1a5c'], C_GROUND = ['#fff0d0', '#e8c890', '#a8773e', '#5a3e22'], C_FLY = ['#ffffff', '#ffffff', '#c6dcf5', '#6a88b0'];
  const CT = {
    'dragon-claw': { v: 'claw', c: C_DRAGON, el: 'Dragon', size: 1.5, aura: true, marks: true },
    'metal-claw': { v: 'claw', c: C_STEEL, el: 'Steel', size: 1.1 },
    'scratch': { v: 'claw', c: C_WHITE, size: 0.85 },
    'slash': { v: 'claw', c: C_WHITE, size: 1.15 },
    'fury-cutter': { v: 'blade', c: C_BUG, el: 'Bug' },
    'x-scissor': { v: 'x', c: C_BUG, el: 'Bug', size: 1.2 },
    'cross-chop': { v: 'x', c: C_FIGHT, el: 'Fighting', size: 1.2 },
    'night-slash': { v: 'blade', c: C_DARK, el: 'Dark', size: 1.25 },
    'leaf-blade': { v: 'blade', c: C_GRASS, el: 'Grass', size: 1.35, aura: true },
    'sacred-sword': { v: 'blade', c: ['#ffffff', '#e6f2ff', '#8fb8ff', '#3050c8'], size: 1.4, aura: true },
    'false-swipe': { v: 'blade', c: C_WHITE, size: 0.9 },
    'aerial-ace': { v: 'blade', c: C_FLY, size: 1.1, fast: true },
    'dual-chop': { v: 'chop', c: C_DRAGON, el: 'Dragon', n: 2 },
    'bite': { v: 'fang', c: C_DARK, el: 'Dark' },
    'crunch': { v: 'fang', c: C_DARK, el: 'Dark', size: 1.3 },
    'fire-fang': { v: 'fang', c: C_FIRE, el: 'Fire', size: 1.15 },
    'ice-fang': { v: 'fang', c: C_ICE, el: 'Ice', size: 1.15 },
    'thunder-fang': { v: 'fang', c: C_ELEC, el: 'Electric', size: 1.15 },
    'fire-punch': { v: 'fist', c: C_FIRE, el: 'Fire' },
    'thunder-punch': { v: 'fist', c: C_ELEC, el: 'Electric' },
    'dynamic-punch': { v: 'fist', c: C_FIGHT, el: 'Fighting', size: 1.4 },
    'hammer-arm': { v: 'fist', c: C_FIGHT, el: 'Fighting', size: 1.4, overhead: true },
    'meteor-mash': { v: 'fist', c: C_STEEL, el: 'Steel', size: 1.3, aura: true },
    'rock-smash': { v: 'fist', c: C_GROUND, el: 'Rock' },
    'revenge': { v: 'fist', c: C_FIGHT, el: 'Fighting' },
    'counter': { v: 'fist', c: C_FIGHT, el: 'Fighting' },
    'reversal': { v: 'fist', c: C_FIGHT, el: 'Fighting', size: 1.2 },
    'vital-throw': { v: 'palm', c: C_FIGHT, el: 'Fighting' },
    'seismic-toss': { v: 'slam', c: C_FIGHT },
    'pound': { v: 'palm', c: C_WHITE },
    'force-palm': { v: 'palm', c: ['#ffffff', '#cfe6ff', '#4aa8ff', '#1e5ad6'], el: 'Fighting', size: 1.2 },
    'low-kick': { v: 'kick', c: C_FIGHT, low: true },
    'low-sweep': { v: 'kick', c: C_FIGHT, low: true },
    'double-kick': { v: 'kick', c: C_FIGHT, n: 2 },
    'blaze-kick': { v: 'kick', c: C_FIRE, el: 'Fire', size: 1.2 },
    'stomp': { v: 'slam', c: C_WHITE },
    'iron-tail': { v: 'tail', c: C_STEEL, el: 'Steel', size: 1.25 },
    'aqua-tail': { v: 'tail', c: C_WATER, el: 'Water', size: 1.2 },
    'dragon-tail': { v: 'tail', c: C_DRAGON, el: 'Dragon', size: 1.2 },
    'slam': { v: 'tail', c: C_WHITE },
    'wing-attack': { v: 'wing', c: C_FLY },
    'dual-wingbeat': { v: 'wing', c: C_FLY, n: 2 },
    'rapid-spin': { v: 'spin', c: C_WHITE },
    'lick': { v: 'tongue', c: C_GHOST, el: 'Ghost' },
    'bone-rush': { v: 'bone', c: C_GROUND, n: 3 },
    'nuzzle': { v: 'charge', c: C_ELEC, el: 'Electric' },
    'spark': { v: 'charge', c: C_ELEC, el: 'Electric' },
    'waterfall': { v: 'charge', c: C_WATER, el: 'Water', size: 1.2, aura: true },
    'zen-headbutt': { v: 'charge', c: C_PSY, el: 'Psychic', aura: true },
    'knock-off': { v: 'palm', c: C_DARK, el: 'Dark' },
    'payback': { v: 'charge', c: C_DARK, el: 'Dark' },
    'assurance': { v: 'fist', c: C_DARK, el: 'Dark' },
    'beat-up': { v: 'fist', c: C_DARK, el: 'Dark', n: 3 },
    'foul-play': { v: 'charge', c: C_DARK, el: 'Dark', aura: true },
    'comeuppance': { v: 'charge', c: C_DARK, el: 'Dark' },
    'double-hit': { v: 'tail', c: C_WHITE, n: 2 },
    'fake-out': { v: 'clap', c: C_WHITE, fast: true },
    'quick-attack': { v: 'charge', c: C_WHITE, fast: true, blur: true },
    'extreme-speed': { v: 'charge', c: ['#ffffff', '#fff6d0', '#ffd27a', '#8a5a10'], fast: true, blur: true, size: 1.25 },
    'sucker-punch': { v: 'fist', c: C_DARK, el: 'Dark', fast: true, blur: true },
    'feint': { v: 'palm', c: C_WHITE, fast: true, blur: true },
    'high-horsepower': { v: 'slam', c: C_GROUND, el: 'Ground', size: 1.3 },
    'shadow-punch': { v: 'fist', c: C_GHOST, el: 'Ghost' },
    'dragon-rush': { v: 'charge', c: C_DRAGON, el: 'Dragon', aura: true, size: 1.3 },
    'brave-bird': { v: 'charge', c: ['#ffffff', '#cfe8ff', '#5aa8ff', '#1e4ab0'], aura: true, size: 1.4 },
    'flare-blitz': { v: 'charge', c: C_FIRE, el: 'Fire', aura: true, size: 1.4 },
    'flame-charge': { v: 'charge', c: C_FIRE, el: 'Fire', aura: true },
    'wave-crash': { v: 'charge', c: C_WATER, el: 'Water', aura: true, size: 1.4 },
    'iron-head': { v: 'charge', c: C_STEEL, el: 'Steel', aura: true },
    'giga-impact': { v: 'charge', c: ['#ffffff', '#ffd27a', '#ff9a2a', '#b8401a'], aura: true, size: 1.5 },
    'dragon-ascent': { v: 'charge', c: ['#ffffff', '#b8f0a0', '#3aa86a', '#145a30'], aura: true, size: 1.4 }
  };
  const TYPE_CT = { Dragon: C_DRAGON, Steel: C_STEEL, Fire: C_FIRE, Ice: C_ICE, Electric: C_ELEC, Dark: C_DARK, Grass: C_GRASS, Bug: C_BUG, Fighting: C_FIGHT, Water: C_WATER, Psychic: C_PSY, Ghost: C_GHOST, Ground: C_GROUND, Rock: C_GROUND, Flying: C_FLY };
  // tapered stroke along sample points (a slash / talon / tail swipe), drawn as glow + body + white core
  function taperStroke(pts, w, c, head = 1, alpha = 1) {
    const n = pts.length, last = Math.max(1, Math.floor((n - 1) * head));
    for (let pass = 0; pass < 4; pass++) {
      const wm = [2.6, 1.3, 1, 0.36][pass], col = [c[2], c[3], c[1], c[0]][pass];
      ctx.globalAlpha = alpha * (pass === 0 ? 0.5 : 1);
      if (pass === 0) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col;
      for (let i = 0; i <= last; i++) {
        const t = i / (n - 1), r = Math.max(0.6, w * Math.sin(Math.PI * Math.min(1, t * 1.05)) * wm) / 2;
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, r, 0, 6.28); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
  function curvePts(x0, y0, cx, cy, x1, y1, n = 26) {
    const p = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1), u = 1 - t; p.push({ x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 }); }
    return p;
  }
  const SHAPE2 = {
    // raking energy claws: talons sweep one after another, then the marks glow and fade
    claw: (s, k) => {
      const n = s.n || 3, size = 78 * (s.size || 1), dir = s.dir || 1;
      const rx = dir * 0.95, ry = 1.15, L = Math.hypot(rx, ry), px = ry / L, py = -rx / L;
      if (k < 0.4) glow(s.x, s.y, size * 1.4, s.c[2], 0.5 * (1 - k / 0.4));
      for (let i = 0; i < n; i++) {
        const kk = clamp((k - i * 0.07) / 0.3, 0, 1);
        if (kk <= 0) continue;
        const off = (i - (n - 1) / 2) * size * 0.34, ox = px * off, oy = py * off;
        const pts = curvePts(s.x - dir * size * 0.5 + ox, s.y - size * 0.62 + oy, s.x + dir * size * 0.28 + ox, s.y - size * 0.18 + oy, s.x + dir * size * 0.42 + ox, s.y + size * 0.6 + oy);
        const fade = k > 0.55 ? (1 - k) / 0.45 : 1;
        taperStroke(pts, size * 0.2, s.c, easeOut(kk), fade);
        if (kk < 1) { const h = pts[Math.floor(easeOut(kk) * (pts.length - 1))]; glow(h.x, h.y, 26, s.c[1], 0.9); }
      }
    },
    // one long crescent blade sweep
    blade: (s, k) => {
      const r = 66 * (s.size || 1), e = easeOut(clamp(k / 0.3, 0, 1)), fade = k > 0.5 ? (1 - k) / 0.5 : 1;
      const a0 = s.a0, a1 = s.a1, pts = [];
      for (let i = 0; i < 28; i++) { const a = a0 + (a1 - a0) * i / 27; pts.push({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r * 0.75 }); }
      if (k < 0.35) glow(s.x, s.y, r * 1.5, s.c[2], 0.55 * (1 - k / 0.35));
      taperStroke(pts, r * 0.32, s.c, e, fade);
    },
    tongue: (s, k) => {
      const f = s.f, a = f.state === 'idle' ? f.mouth() : { x: s.ax, y: s.ay };
      const e = k < 0.45 ? easeOut(k / 0.45) : 1 - easeIn((k - 0.45) / 0.55);
      const bx = a.x + (s.bx - a.x) * e, by = a.y + (s.by - a.y) * e;
      const pts = curvePts(a.x, a.y, (a.x + bx) / 2, (a.y + by) / 2 - 30, bx, by, 18);
      ctx.fillStyle = '#7a2a4a';
      pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, 7 - i * 0.12, 0, 6.28); ctx.fill(); });
      ctx.fillStyle = '#ff7aa8';
      pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y - 1, 5 - i * 0.1, 0, 6.28); ctx.fill(); });
    },
    bone: (s, k) => {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot + k * 14); ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-26, -5, 52, 10);
      ctx.fillStyle = '#f2ead8'; ctx.fillRect(-24, -3, 48, 6);
      for (const sx of [-26, 26]) for (const sy of [-6, 6]) { ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 6.28); ctx.fill(); ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 6.28); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // Mega Evolution: a sphere of light around the Pokémon with a turning rainbow rim
    megaorb: (s, k) => {
      const f = s.f; if (!f) return;
      const x = f.cx, y = f.cy, R0 = Math.max(f.w, f.h) * 0.75;
      const grow = s.phase === 'burst' ? 1 + easeOut(k) * 1.6 : 0.35 + 0.65 * easeOut(Math.min(1, k * 1.6));
      const r = R0 * grow * (1 + Math.sin(T * 16) * 0.03), a = s.phase === 'burst' ? 1 - k : 1;
      glow(x, y, r * 2.2, '#ffffff', 0.55 * a);
      ctx.globalAlpha = 0.28 * a; drawDisc(x, y, r / PX, '#fff8ff'); ctx.globalAlpha = 1;
      const segs = 36;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs * 6.28 + T * 3, hue = (i / segs * 360 + T * 240) % 360;
        ctx.strokeStyle = `hsla(${hue},95%,65%,${a})`; ctx.lineWidth = PX * 1.6;
        ctx.beginPath(); ctx.arc(x, y, r, t0, t0 + 6.28 / segs + 0.02); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`; ctx.lineWidth = PX * 0.7;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * (0.25 + j * 0.25), T * (1.5 + j * 0.7), 0, 6.28); ctx.stroke(); }
    },
    // rainbow double helix of light from the Key Stone to the Pokémon
    helix: (s, k) => {
      const f = s.f; if (!f) return;
      const a = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const x0 = s.x0, y0 = s.y0, x1 = f.cx, y1 = f.cy, n = 48, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      ctx.globalCompositeOperation = 'lighter';
      for (const ph of [0, Math.PI]) for (let i = 0; i <= n; i++) {
        const t = i / n, w = Math.sin(t * Math.PI) * 22, sp = Math.sin(t * 14 - T * 18 + ph);
        const x = x0 + (x1 - x0) * t + nx * w * sp, y = y0 + (y1 - y0) * t + ny * w * sp - Math.sin(t * Math.PI) * 40;
        ctx.globalAlpha = a * (0.6 + 0.4 * Math.cos(t * 14 - T * 18 + ph));
        ctx.fillStyle = `hsl(${(t * 360 + T * 300) % 360},95%,65%)`;
        ctx.fillRect(sn(x) - PX, sn(y) - PX, PX * 2, PX * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    // an original Mega emblem: a rainbow ring around a flame-shaped gem
    megasym: (s, k) => {
      const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1, sc = (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1) * s.size;
      ctx.save(); ctx.translate(s.x, s.y - k * 20); ctx.scale(sc, sc); ctx.globalAlpha = a;
      glow(0, 0, 60, '#ffffff', 0.6 * a);
      const g = ctx.createConicGradient ? ctx.createConicGradient(T * 2, 0, 0) : null;
      if (g) ['#ff5a5a', '#ffd23f', '#5aff8a', '#5ad6ff', '#b87bff', '#ff5a5a'].forEach((c, i) => g.addColorStop(i / 5, c));
      ctx.strokeStyle = g || '#ffd23f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.28); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.28); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(16, 0, 0, 20); ctx.quadraticCurveTo(-16, 0, 0, -20); ctx.fill();
      ctx.fillStyle = g || '#ff7be3'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(10, 0, 0, 13); ctx.quadraticCurveTo(-10, 0, 0, -13); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
  };
  // ---- hand-drawn strike effects: impact stars, jaws, motion smears ----
  const POW_C = ['#ffffff', '#fff3a0', '#ffb52a', '#6a2410'];
  function powAt(x, y, r = 30, c = POW_C, o = {}) { shapes.push({ kind: 'pow', x, y, r, c, life: o.life || 0.32, age: -(o.delay || 0), rot: R(-0.4, 0.4), n: o.n || 9 }); }
  Object.assign(SHAPE2, {
    // layered spiky impact star (cleaner than a bitmap at any size)
    pow: (s, k) => {
      if (!s.pts) { s.pts = []; for (let i = 0; i < s.n * 2; i++) s.pts.push(i % 2 ? R(0.36, 0.5) : R(0.82, 1.12)); }
      const sc = s.r * (k < 0.16 ? 0.4 + 0.75 * easeOut(k / 0.16) : 1.15 - (k - 0.16) * 0.4), a = k > 0.5 ? (1 - k) / 0.5 : 1;
      glow(s.x, s.y, sc * 2, s.c[2], 0.6 * a);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot + k * 0.4); ctx.globalAlpha = a;
      const path = mul => { ctx.beginPath(); s.pts.forEach((r, i) => { const an = i / s.pts.length * 6.283, x = Math.cos(an) * r * sc * mul, y = Math.sin(an) * r * sc * mul; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
      path(1.1); ctx.fillStyle = s.c[3]; ctx.fill();
      path(1); ctx.fillStyle = s.c[2]; ctx.fill();
      path(0.7); ctx.fillStyle = s.c[1]; ctx.fill();
      path(0.4); ctx.fillStyle = s.c[0]; ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // big jaws: open wide, snap shut, grind, fade
    fangs: (s, k) => {
      const sz = s.size, W = 84 * sz;
      const open = k < 0.42 ? easeOut(k / 0.42) : k < 0.5 ? 1 - easeIn((k - 0.42) / 0.08) : 0;
      const gap = 4 * sz + open * 40 * sz, sc = k < 0.42 ? 0.75 + 0.25 * easeOut(k / 0.42) : 1 + (k < 0.6 ? (0.6 - k) * 0.4 : 0);
      const a = k > 0.75 ? (1 - k) / 0.25 : 1, shk = k > 0.5 && k < 0.75 ? R(-3, 3) : 0;
      glow(s.x, s.y, W * (k > 0.5 && k < 0.6 ? 1.6 : 1.1), s.c[1], (k > 0.5 ? 0.8 : 0.45) * a);
      ctx.save(); ctx.translate(s.x + shk, s.y); ctx.scale(sc, sc); ctx.globalAlpha = a;
      ctx.lineJoin = 'round';
      for (const up of [1, -1]) {
        const n = 6, bow = t => 12 * sz * (1 - (2 * t - 1) ** 2);
        const baseY = t => -up * (gap + bow(t));
        // gum
        ctx.strokeStyle = s.gum; ctx.lineWidth = 9 * sz; ctx.lineCap = 'round';
        ctx.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20, x = -W / 2 + t * W, y = baseY(t) - up * 5 * sz; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, x = -W / 2 + t * W, by = baseY(t), hw = W / n * 0.46, h = (i === 1 || i === n - 2 ? 26 : 16) * sz, tip = by + up * h;
          ctx.beginPath(); ctx.moveTo(x - hw, by); ctx.lineTo(x + hw, by); ctx.lineTo(x + (i < n / 2 ? 2 : -2) * sz, tip); ctx.closePath();
          ctx.fillStyle = s.tooth; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#1a1420'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + hw, by); ctx.lineTo(x + (i < n / 2 ? 2 : -2) * sz, tip); ctx.closePath();
          ctx.fillStyle = 'rgba(120,140,170,.35)'; ctx.fill();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // motion smear: a comet-shaped crescent that sweeps and leaves a fading tail
    smear: (s, k) => {
      const e = easeOut(clamp(k / 0.42, 0, 1)), tailK = clamp((k - 0.18) / 0.6, 0, 1);
      const ah = s.a0 + (s.a1 - s.a0) * e, at = s.a0 + (s.a1 - s.a0) * Math.min(e, easeIn(tailK));
      if (Math.abs(ah - at) < 0.02) return;
      const m = 26, fl = s.flat ?? 0.8;
      const layer = (mul, col, alpha, add) => {
        ctx.beginPath();
        const pts = [];
        for (let j = 0; j < m; j++) { const t = j / (m - 1), a = at + (ah - at) * t, th = s.w * mul * (0.12 + 0.88 * t) * (1 - Math.pow(t, 8) * 0.5); pts.push([a, th]); }
        pts.forEach(([a, th], j) => { const x = s.x + Math.cos(a) * (s.r + th / 2), y = s.y + Math.sin(a) * (s.r + th / 2) * fl; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        for (let j = m - 1; j >= 0; j--) { const [a, th] = pts[j]; ctx.lineTo(s.x + Math.cos(a) * (s.r - th / 2), s.y + Math.sin(a) * (s.r - th / 2) * fl); }
        ctx.closePath();
        ctx.globalAlpha = alpha; if (add) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = col; ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      };
      const fade = k > 0.55 ? (1 - k) / 0.45 : 1;
      layer(1.7, s.c[2], 0.35 * fade, true);
      layer(1, s.c[1], 0.95 * fade);
      layer(0.45, s.c[0], fade);
    }
  });
  SHAPE2.cut = (s, k) => {
    const e = easeOut(clamp(k / 0.3, 0, 1)), fade = k > 0.5 ? (1 - k) / 0.5 : 1, pts = [];
    for (let i = 0; i < 20; i++) { const t = i / 19; pts.push({ x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t }); }
    if (k < 0.3) glow((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 70, s.c[2], 0.5);
    taperStroke(pts, s.w, s.c, e, fade);
  };
  const GUM = { Fire: '#a8281a', Ice: '#2f6fb0', Electric: '#a07a00', Dark: '#3a1846', Poison: '#5a1a70', Psychic: '#8a1f5c' };
  // ---- strike choreography: wind-up -> lunge -> strike(s) -> recover ----
  function strikeImpact(f, d, at, spec, size = 1) {
    const c = spec.c, pc = spec.el || spec.v === 'fist' || spec.v === 'kick' ? [c[0], c[1], c[2], c[3]] : POW_C;
    powAt(at.x, at.y, 30 * size * (spec.size || 1), pc);
    shapes.push({ kind: 'lines', x: at.x, y: at.y, r0: 20 * size, r1: 70 * size, col: '#ffffff', n: 10, life: 0.18, age: 0, rot: R(0, 1) });
    d.rotSV += f.face * 9 * size; d.shiver = 0.15;
    hitStop(55 + 25 * size);
  }
  async function windup2(f, d, spec, big) {
    const dir = Math.sign(d.x - f.x) || f.face, x0 = f.x;
    f.face = dir; f.crouchT = 1;
    await tw((big ? 0.2 : 0.14) / tempo(f), k => { const e = easeOut(k); f.x = x0 - dir * (big ? 26 : 18) * e; f.rotA = -dir * 0.14 * e; });
    f.crouchT = 0;
  }
  async function lunge(f, d, spec, big) {
    const sx = f.x, sy = f.y, dir = f.face, reach = spec.v === 'fang' ? 0.72 : spec.v === 'tail' ? 0.9 : 0.8;
    const tx = d.x - dir * (f.r + d.r) * reach, ty = d.y + (spec.low ? 4 : 0);
    const jump = spec.v === 'kick' && !spec.low ? 30 : spec.v === 'slam' ? 80 : spec.v === 'wing' ? 22 : 0;
    const sec = (spec.fast ? 0.08 : big ? 0.19 : 0.15) / tempo(f);
    f.dashing = true; f.after = sec + (spec.blur ? 0.45 : 0.14); f.afterCol = spec.c[1]; f.bump(-5);
    if (spec.blur) { glowP(f.cx, f.cy, 10, 60, '#ffffff', 0.25, 0.8); for (let i = 0; i < 10; i++) spawn({ kind: 'streak', c: ['#ffffff'], x: f.cx + R(-30, 30), y: f.cy + R(-f.h / 2, f.h / 2), vx: dir * 900, vy: 0, life: 0.22, len: 70, ang: dir > 0 ? 0 : Math.PI, delay: i * 0.012 }); }
    SFX.whoosh();
    const trail = spec.el ? elementTrail(spec.el) : null;
    await tw(sec, k => {
      const e = easeIn(k);
      f.x = sx + (tx - sx) * e; f.y = sy + (ty - sy) * e;
      f.rotA = dir * (spec.v === 'fang' || spec.v === 'charge' ? 0.22 : 0.12) * k;
      if (jump) f.jz = Math.sin(k * Math.PI * (spec.v === 'slam' ? 1 : 0.75)) * jump;
      if (trail) trail(f); else if (Math.random() < 0.5 && !f.hover && !jump) dust(f.x, f.y, 0.6);
    });
    if (spec.v === 'slam') f.jz = 0;
    for (let i = 0; i < 4; i++) spawn({ kind: 'streak', c: ['#ffffff'], x: f.x - dir * 12, y: f.cy + R(-f.h / 3, f.h / 3), vx: -dir * 340, vy: 0, drag: 5, life: 0.22, len: 46, ang: dir > 0 ? 0 : Math.PI });
    return { sx, sy };
  }
  async function recover(f, s, big) {
    const x0 = f.x, y0 = f.y, z0 = f.jz, bx = x0 + (s.sx - x0) * 0.62, by = y0 + (s.sy - y0) * 0.62, r0 = f.rotA;
    await tw((big ? 0.38 : 0.32) / tempo(f), k => { const e = easeOut(k); f.x = x0 + (bx - x0) * e; f.y = y0 + (by - y0) * e; f.jz = z0 * (1 - e) + Math.sin(k * Math.PI) * (big ? 26 : 18); f.rotA = r0 * (1 - e); });
    f.jz = 0; f.rotA = 0; f.dashing = false; f.bump(4);
    if (!f.hover) dust(f.x, f.y, 0.8);
  }
  const STRIKE = {
    async claw(f, d, spec, h, landed) {
      const dir = f.face, at = { x: d.cx, y: d.cy };
      SFX.slash(); later(() => SFX.slash(), 70);
      shapes.push({ kind: 'claw', x: at.x, y: at.y, dir, c: spec.c, n: 3, size: spec.size || 1, life: spec.marks ? 0.8 : 0.6, age: 0 });
      if (spec.el === 'Dragon') for (let i = 0; i < 16; i++) flameP(at.x + R(-34, 34), at.y + R(-30, 30), R(-40, 40), R(-120, -50), R(2, 4), 0.55, { c: TP.Dragon.c, delay: 0.1 + i * 0.02 });
      await tw(0.13, k => { f.rotA = dir * (-0.28 + 0.6 * easeOut(k)); if (k > 0.55 && !landed.done) { landed(); strikeImpact(f, d, at, spec, 0.8); } });
      for (let i = 0; i < 10; i++) later(() => sparkP(at.x + R(-30, 30), at.y + R(-30, 30), R(0, 6.28), R(120, 260), spec.c[1], 0.3), i * 20);
    },
    async blade(f, d, spec, h, landed, xcut) {
      const dir = f.face, at = { x: d.cx, y: d.cy }, sz = spec.size || 1;
      SFX.slash();
      const a0 = dir > 0 ? -2.3 : -0.84, sw = dir > 0 ? 2.6 : -2.6;
      shapes.push({ kind: 'blade', x: at.x, y: at.y, a0, a1: a0 + sw, c: spec.c, size: sz, life: 0.5, age: 0 });
      if (xcut) { later(() => SFX.slash(), 100); shapes.push({ kind: 'blade', x: at.x, y: at.y, a0: dir > 0 ? 2.3 : 0.84, a1: (dir > 0 ? 2.3 : 0.84) - sw, c: spec.c, size: sz, life: 0.5, age: -0.1 }); }
      await tw(0.14, k => { f.rotA = dir * (-0.35 + 0.75 * easeOut(k)); if (k > 0.5 && !landed.done) { landed(); strikeImpact(f, d, at, spec, 0.8); } });
      if (xcut) { await wait(100); powAt(at.x, at.y, 26 * sz, [spec.c[0], spec.c[1], spec.c[2], spec.c[3]]); }
    },
    async x(f, d, spec, h, landed) { return STRIKE.blade(f, d, spec, h, landed, true); },
    async chop(f, d, spec, h, landed) {
      const dir = f.face, at = { x: d.cx, y: d.cy - 6 };
      await tw(0.1, k => { f.jz = Math.sin(k * Math.PI * 0.5) * 16; f.rotA = -dir * 0.2 * k; });
      SFX.slash();
      { const sd = (h % 2 ? -1 : 1) * dir; shapes.push({ kind: 'cut', x0: at.x - sd * 30, y0: at.y - 62, x1: at.x + sd * 22, y1: at.y + 48, w: 22, c: spec.c, life: 0.42, age: 0 }); }
      await tw(0.08, k => { f.jz = 16 * (1 - k); f.rotA = dir * 0.3 * k; if (k > 0.6 && !landed.done) { landed(); strikeImpact(f, d, at, spec, 0.8); } });
    },
    async fang(f, d, spec, h, landed) {
      // a lunging bite: the jaws open over the target, snap shut, and the attacker shakes its head
      const sz = (spec.size || 1) * clamp(d.w / 95, 0.85, 1.5), at = { x: d.cx + R(-4, 4), y: d.cy - 4 }, life = 0.62;
      shapes.push({ kind: 'fangs', x: at.x, y: at.y, size: sz, c: spec.c, tooth: spec.el === 'Ice' ? '#eafaff' : '#ffffff', gum: GUM[spec.el] || '#6a1a2a', life, age: 0 });
      f.sqv -= 6;
      await wait(life * 0.42 * 1000);
      SFX.slash(); SFX.impact(spec.el || 'Dark', 1, 1);
      landed(); strikeImpact(f, d, at, spec, 1);
      shakeIt(5); d.shiver = 0.35;
      if (spec.el === 'Fire') for (let i = 0; i < 18; i++) flameP(at.x + R(-40, 40), at.y + R(-20, 20), R(-30, 30), R(-140, -60), R(3, 5), 0.6);
      if (spec.el === 'Ice') { const spikes = []; for (let i = 0; i < 8; i++) spikes.push({ a: i / 8 * 6.28, l: R(26, 44), w: R(5, 8) }); shapes.push({ kind: 'crystal', x: at.x, y: at.y, spikes, life: 0.5, age: 0 }); }
      if (spec.el === 'Electric') for (let i = 0; i < 4; i++) boltFx({ ax: at.x - 40, ay: at.y + R(-20, 20), bx: at.x + 40, by: at.y + R(-20, 20), jag: 12, c: TP.Electric.c, life: 0.3, w: 0.7 });
      if (spec.el === 'Dark') smoke(at, 4, IMP.Dark.mist, 3);
      await tw(0.26, k => { f.rotA = Math.sin(k * 26) * 0.12 * (1 - k) + f.face * 0.15; });
      if (sz >= 1.3) { await wait(60); powAt(at.x + R(-10, 10), at.y + R(-10, 10), 34, POW_C); SFX.impact('Dark', 0.8, 1); d.rotSV += f.face * 6; }
    },
    async fist(f, d, spec, h, landed) {
      const dir = f.face, sz = spec.size || 1, at = { x: d.cx - dir * 6, y: d.cy + (spec.overhead ? -10 : 0) };
      if (spec.overhead) await tw(0.12, k => { f.jz = Math.sin(k * Math.PI * 0.5) * 30; f.rotA = -dir * 0.25 * k; });
      const x0 = f.x;
      await tw(0.06, k => { f.x = x0 + dir * 14 * k; f.rotA = dir * 0.25 * k; if (spec.overhead) f.jz = 30 * (1 - k); });
      shapes.push({ kind: 'fist', x: at.x, y: at.y, s: 4 * sz, c: [spec.c[2], spec.c[0], spec.c[3]], flip: dir < 0, life: 0.3, age: 0, vx: dir * 40, vy: spec.overhead ? 140 : 0 });
      landed(); strikeImpact(f, d, at, spec, sz);
      ringP(at.x, at.y, 8, 70 * sz, spec.c[1], 0.3, { flat: 1, w: 2 });
      if (spec.el === 'Electric') for (let i = 0; i < 3; i++) boltFx({ ax: at.x, ay: at.y, bx: at.x + R(-70, 70), by: at.y + R(-60, 60), jag: 14, c: TP.Electric.c, life: 0.3, w: 0.8 });
      if (spec.overhead) { shakeIt(9); dust(d.x, d.y, 2); addDecal('crack', d.x, d.y, 1); }
      await tw(0.08, k => { f.x = x0 + dir * 14 * (1 - k * 0.5); });
    },
    async palm(f, d, spec, h, landed) {
      const dir = f.face, sz = spec.size || 1, at = { x: d.cx - dir * 8, y: d.cy }, x0 = f.x;
      await tw(0.06, k => { f.x = x0 + dir * 10 * k; f.rotA = dir * 0.18 * k; });
      glowP(at.x, at.y, 10, 90 * sz, spec.c[1], 0.3, 1);
      for (let i = 0; i < 3; i++) ringP(at.x, at.y, 6, (50 + i * 22) * sz, spec.c[i ? 1 : 0], 0.35, { flat: 1, w: 2, delay: i * 0.05 });
      landed(); strikeImpact(f, d, at, spec, 0.9 * sz);
    },
    async kick(f, d, spec, h, landed) {
      // jump kick; the second kick of Double Kick is a spinning kick from the other side
      const dir = f.face, sz = spec.size || 1;
      if (h > 0) {
        const x0 = f.x, tx = d.x - dir * (f.r + d.r) * 0.6;
        f.face = -dir; later(() => { f.face = dir; }, 90);       // quick spin
        await tw(0.16, k => { f.x = x0 + (tx - x0) * k; f.jz = Math.sin(k * Math.PI) * 34 + 10; f.rotA = -dir * 0.4 * k; });
      }
      const at = { x: d.cx - dir * 4, y: d.cy + (spec.low ? d.h * 0.28 : -6) };
      const a0 = spec.low ? (dir > 0 ? 2.6 : 0.54) : (h % 2 ? (dir > 0 ? -2.4 : -0.74) : (dir > 0 ? 2.2 : 0.94));
      const a1 = spec.low ? (dir > 0 ? 0.7 : 2.44) : (h % 2 ? (dir > 0 ? 0.2 : 2.94) : (dir > 0 ? -0.5 : -2.64));
      shapes.push({ kind: 'smear', x: f.x + dir * f.w * 0.15, y: f.cy - f.z * 0.1, r: f.w * 0.55 + 18, w: 26 * sz, a0, a1, c: spec.c, life: 0.36, age: 0, flat: 0.85 });
      SFX.whoosh();
      await tw(0.1, k => { f.rotA = dir * (h % 2 ? -0.45 : 0.45) * easeOut(k); if (k > 0.6 && !landed.done) { landed(); strikeImpact(f, d, at, spec, 0.9 * sz); } });
      if (spec.el === 'Fire') for (let i = 0; i < 14; i++) flameP(at.x + R(-20, 20), at.y + R(-16, 16), dir * R(60, 180), R(-120, -30), R(3, 5), 0.5);
      dust(d.x, d.y, 0.8);
      await tw(0.12, k => { f.jz = Math.max(0, f.jz * (1 - k)); });
    },
    async tail(f, d, spec, h, landed) {
      // turn around and whip the tail through the target
      const dir = f.face, sz = spec.size || 1, at = { x: d.cx, y: d.cy + 8 };
      f.face = -dir;
      later(() => { f.face = dir; }, 200);
      await wait(70);
      SFX.slash();
      { const rr = Math.max(50, Math.hypot(d.cx - f.cx, d.cy - f.cy)) * 0.95, a0 = dir > 0 ? -2.0 : -1.14, a1 = dir > 0 ? 0.75 : 2.39; shapes.push({ kind: 'smear', x: f.cx, y: f.cy, r: rr, w: 34 * sz, a0, a1, c: spec.c, life: 0.45, age: 0, flat: 0.85 }); }
      await tw(0.12, k => { f.rotA = -dir * 0.2 * Math.sin(k * Math.PI); if (k > 0.5 && !landed.done) { landed(); strikeImpact(f, d, at, spec, sz); } });
      if (spec.el === 'Water') for (let i = 0; i < 16; i++) spawn({ kind: 'drop', c: ['#8fd0ff'], x: at.x, y: d.y, z: 30, vx: R(-200, 200), vy: R(-60, 60), vz: R(100, 260), g: 900, life: 1, s0: R(1, 2), splash: true });
    },
    async wing(f, d, spec, h, landed) {
      const dir = f.face, at = { x: d.cx, y: d.cy };
      SFX.whoosh();
      for (const side2 of [1, -1]) shapes.push({ kind: 'smear', x: at.x - dir * 6, y: at.y - 4, r: 58, w: 30, a0: side2 > 0 ? -2.7 : -0.44, a1: side2 > 0 ? -0.5 : -2.64, c: spec.c, life: 0.4, age: side2 > 0 ? 0 : -0.07, flat: 0.85 });
      await tw(0.12, k => { f.jz = Math.max(f.jz, 18) + Math.sin(k * Math.PI) * 10; f.rotA = dir * 0.2 * k; if (k > 0.5 && !landed.done) { landed(); strikeImpact(f, d, at, spec, 0.8); } });
      for (let i = 0; i < 6; i++) spawn({ bm: 'gust', c: ['#ffffff', '#e6f1ff'], x: at.x, y: at.y, vx: R(-160, 160), vy: R(-120, 60), drag: 3, life: 0.45, s0: 2, s1: 2, fade: true });
    },
    async spin(f, d, spec, h, landed) {
      const at = { x: d.cx, y: d.cy };
      for (let i = 0; i < 6; i++) later(() => { f.face = -f.face; }, i * 45);
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; spawn({ kind: 'streak', c: ['#ffffff'], x: f.cx + Math.cos(a) * f.w * 0.6, y: f.cy + Math.sin(a) * f.h * 0.3, vx: -Math.sin(a) * 300, vy: Math.cos(a) * 150, life: 0.3, len: 22, ang: a + 1.57 }); }
      await wait(160);
      f.face = Math.sign(d.x - f.x) || 1;
      landed(); strikeImpact(f, d, at, spec, 0.8);
    },
    async tongue(f, d, spec, h, landed) {
      shapes.push({ kind: 'tongue', f, ax: f.mouth().x, ay: f.mouth().y, bx: d.cx, by: d.cy, life: 0.55, age: 0 });
      await wait(230);
      landed(); strikeImpact(f, d, { x: d.cx, y: d.cy }, spec, 0.6);
      d.white = 1; d.whiteCol = '#c8a8ff';
      await wait(200);
    },
    async bone(f, d, spec, h, landed) {
      const dir = f.face, at = { x: d.cx, y: d.cy - 6 };
      shapes.push({ kind: 'bone', x: at.x - dir * 20, y: at.y - 20, rot: R(0, 6), life: 0.35, age: 0, vx: dir * 120, vy: 60 });
      await tw(0.1, k => { f.rotA = dir * (-0.3 + 0.6 * k); });
      landed(); strikeImpact(f, d, at, spec, 0.8);
    },
    async clap(f, d, spec, h, landed) {
      const at = { x: d.cx, y: d.cy };
      for (const sd of [-1, 1]) { glowP(at.x + sd * 34, at.y, 6, 40, '#ffffff', 0.2, 1); spawn({ kind: 'streak', c: ['#ffffff'], x: at.x + sd * 40, y: at.y, vx: -sd * 300, vy: 0, life: 0.15, len: 30, ang: sd > 0 ? Math.PI : 0 }); }
      await wait(90);
      landed(); strikeImpact(f, d, at, spec, 1.1);
      d.jz = 0; tw(0.2, k => { if (d.state === 'idle') d.jz = Math.sin(k * Math.PI) * 14; }).then(() => { d.jz = 0; });
    },
    async slam(f, d, spec, h, landed) {
      const sz = spec.size || 1;
      f.bump(12);
      landed(); strikeImpact(f, d, { x: d.cx, y: d.cy }, spec, sz);
      ringFx(d.x, d.y, 10, 130 * sz, '#ffffff', 0.45, { w: 2 }); dust(d.x, d.y, 2.6); addDecal('crack', d.x, d.y, 1.2); shakeIt(9);
      await wait(80);
    },
    async charge(f, d, spec, h, landed) {
      const dir = f.face, sz = spec.size || 1, at = { x: d.cx - dir * (d.w * 0.25), y: d.cy }, x0 = f.x;
      await tw(0.05, k => { f.x = x0 + dir * 10 * k; });
      landed(); strikeImpact(f, d, at, spec, sz);
      ringP(at.x, at.y, 8, 70 * sz, spec.c[1], 0.3, { flat: 1, w: 2 });
      if ((spec.size || 1) >= 1.3) { ringFx(d.x, d.y, 10, 120, spec.c[1], 0.4, { w: 2 }); dust(d.x, d.y, 1.8); }
    }
  };
  S.contact = async (f, d, m, o, hit, variant) => {
    const t = m.type || 'Normal';
    const spec = CT[m.id] || { v: { fist: 'fist', kick: 'kick', jaws: 'fang', claws: 'claw', tail: 'tail' }[variant] || 'charge', c: TYPE_CT[t] || C_WHITE, el: t !== 'Normal' ? t : null };
    const big = (m.power || 60) >= 100 || (spec.size || 1) >= 1.3, c = spec.c, n = spec.n || 1;
    if (spec.aura || big) { f.aura = c[1]; f.auraT = T + 0.8; dimTo(big ? 0.3 : 0.18, 0.9); for (let i = 0; i < 14; i++) moteP(f.cx + R(-f.w / 2, f.w / 2), f.cy + R(-f.h / 2, f.h / 2), c[1], { vy: -70, life: 0.5, delay: i * 0.015 }); }
    if (!spec.fast) await windup2(f, d, spec, big);
    const s = await lunge(f, d, spec, big);
    if (!on) return;
    const strike = STRIKE[spec.v] || STRIKE.charge;
    for (let h = 0; h < n; h++) {
      if (d.state !== 'idle' && h > 0) break;
      const landed = () => {
        if (landed.done) return;
        landed.done = true;
        if (h === 0) hit();
        else { impactAt(spec.el || t, d.cx, d.cy, d.y, 0.5, { quiet: true }); d.white = 1; d.bump(3); SFX.impact(t, 0.6, 1); }
      };
      await strike(f, d, spec, h, landed);
      landed();
      if (n > 1 && h < n - 1) await wait(70);
    }
    if (big) camPunch(d.cx, d.cy, 0.06, 0.3);
    await wait(big ? 150 : 90);
    await recover(f, s, big);
  };
  // ---- signature moves ----
  const SIG = {};
  SIG['ember'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.15, { motes: 8, size: 20, recoil: 30 });
    let first = null;
    for (let i = 0; i < 3; i++) { const pr = fire(f, d, m, o, { r: 7, speed: 760, arc: R(-20, 20) }); if (!first) first = pr.then(() => hit()); await wait(90); }
    await first; await wait(200);
  };
  SIG['mystical-fire'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#ff7ad0' });
    const q = await fire(f, d, m, o, { draw: (q, x, y) => { glow(x, y, 44, '#ff7ad0', 0.9); drawDisc(x, y, 5, '#c0307e'); drawDisc(x, y - PX, 3.5, '#ff8c1a'); drawDisc(x, y - PX, 1.5, '#fff7c2'); }, trail: q => flameP(q.x, q.y, R(-20, 20), R(-40, -10), 2.5, 0.4, { c: ['#fff0fa', '#ffb0e0', '#ff5aa8', '#a0206a', '#3a1030'] }) });
    hit(); if (o.miss) impactAt('Fire', q.x, q.y, q.y + 30, 0.5);
  };
  SIG['inferno'] = async (f, d, m, o, hit) => {
    await S.orb(f, d, m, o, hit, true);
    if (o.miss || d.state !== 'idle') return;
    for (let i = 0; i < 40; i++) later(() => { if (d.state === 'idle') flameP(d.x + R(-d.w / 2, d.w / 2), d.y - R(0, d.h * 0.6), R(-20, 20), R(-120, -60), R(3, 5), 0.6); }, i * 22);
  };
  SIG['fire-spin'] = S.vortex;
  SIG['flare-blitz'] = SIG['flame-charge'] = async (f, d, m, o, hit) => {
    for (let i = 0; i < 20; i++) flameP(f.x + R(-f.w / 2, f.w / 2), f.y - R(0, f.h), R(-20, 20), R(-140, -60), R(3, 5), 0.6, { delay: i * 0.01 });
    lightAt(f.x, f.y, 150, '#ff8a2a', 0.8, 0.8, () => ({ x: f.x, y: f.y }));
    await S.contact(f, d, m, o, hit, 'charge');
  };
  SIG['thunderbolt'] = S.bolt;
  SIG['thunder-shock'] = async (f, d, m, o, hit) => S.bolt(f, d, { ...m, power: 40 }, o, hit);
  SIG['discharge'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#fff59a', dim: 0.3 });
    SFX.zap(); SFX.zap();
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.28 + R(-0.2, 0.2), L = R(120, 220); boltFx({ ax: f.cx, ay: f.cy, bx: f.cx + Math.cos(an) * L, by: f.cy + Math.sin(an) * L * 0.7, jag: 22, c: TP.Electric.c, life: 0.5, w: 0.9 }); }
    boltFx({ from: f, to: o.miss ? null : d, ax: f.cx, ay: f.cy, bx: d.cx + (o.miss ? 80 : 0), by: d.cy, jag: 30, c: TP.Electric.c, life: 0.5, w: 1.3 });
    lightAt(f.x, f.y, 260, '#ffe94a', 0.6, 1); flash('#fffbe0', 0.15);
    await wait(100); hit(); await wait(450);
  };
  SIG['zap-cannon'] = async (f, d, m, o, hit) => S.orb(f, d, m, o, hit, true);
  SIG['solar-beam'] = S.beam;
  SIG['leaf-storm'] = SIG['petal-dance'] = SIG['petal-blizzard'] = storm;
  SIG['vine-whip'] = SIG['power-whip'] = async (f, d, m, o, hit) => {
    const big = m.id === 'power-whip';
    for (let i = 0; i < 2; i++) {
      const mo = f.mouth();
      shapes.push({ kind: 'vine', f, ax: mo.x, ay: mo.y, bx: d.cx + (o.miss ? 70 * side() : R(-8, 8)), by: d.cy + R(-10, 10), bend: (i ? -1 : 1) * R(40, 80), life: 0.45, age: 0 });
      SFX.slash();
      await wait(200);
      if (i === 0) hit(); else if (!o.miss) impactAt('Grass', d.cx, d.cy, d.y, big ? 0.8 : 0.5, { quiet: true });
      await wait(60);
    }
    await wait(150);
  };
  SIG['seed-bomb'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.15, { motes: 6, size: 18, recoil: 30 });
    let first = null;
    for (let i = 0; i < 3; i++) {
      const pr = fire(f, d, m, o, { bm: 'seed', c: ['#8a6a3a', '#c9a46a', '#5a4020'], s: 3, spin: 10, arc: 80 + i * 15, speed: 620, shadow: true });
      pr.then(q => { if (!o.miss || i) { impactAt('Grass', q.x, q.y, q.y + 30, 0.6, { quiet: true }); glowP(q.x, q.y, 10, 60, '#ffe08a', 0.3); smoke({ x: q.x, y: q.y }, 3); } });
      if (!first) first = pr.then(() => hit());
      await wait(110);
    }
    await first; await wait(250);
  };
  SIG['blizzard'] = S.wave;
  SIG['freeze-dry'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#c8f0ff', dim: 0.2 });
    const tx = d.cx + (o.miss ? 80 * side() : 0), ty = d.cy;
    const spikes = []; for (let i = 0; i < 9; i++) spikes.push({ a: i / 9 * 6.28 + R(-0.2, 0.2), l: R(30, 56), w: R(6, 10) });
    shapes.push({ kind: 'crystal', x: tx, y: ty, spikes, life: 0.7, age: 0, done: () => { for (let i = 0; i < 16; i++) spawn({ bm: 'shard', c: ['#ffffff', '#e2f8ff', '#4fa9e6'], x: tx, y: ty, vx: R(-260, 260), vy: R(-220, 120), drag: 2, life: 0.6, s0: 2, s1: 2, rot: R(0, 6), spin: 12 }); SFX.impact('Ice', 1, 1); } });
    SFX.status('frz');
    await wait(200); hit(); await wait(550);
  };
  SIG['ice-shard'] = async (f, d, m, o, hit) => S.multi(f, d, { ...m }, o, hit);
  SIG['psychic'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#ff9ccf', dim: 0.3, hold: 1.2 });
    if (o.miss || d.state !== 'idle') { ringP(d.x + 80, d.cy, 8, 60, '#ff9ccf', 0.5, { flat: 1 }); hit(); return; }
    // the target is gripped by psychic power, lifted, shaken and slammed down
    d.whiteCol = '#ff9ccf';
    for (let i = 0; i < 4; i++) ringP(d.cx, d.cy, 10, 70, '#ff9ccf', 0.6, { flat: 1, delay: i * 0.12 });
    await tw(0.45, k => { if (d.state === 'idle') { d.jz = easeOut(k) * 60; d.white = 0.45 + Math.sin(k * 30) * 0.2; d.shiver = 0.1; } });
    d.white = 0;
    await tw(0.12, k => { if (d.state === 'idle') d.jz = 60 * (1 - k); });
    d.jz = 0;
    hit();
    shakeIt(9); dust(d.x, d.y, 2.2); addDecal('crack', d.x, d.y, 1.1); camPunch(d.x, d.y, 0.06, 0.3);
    await wait(250);
  };
  SIG['confusion'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.2, { col: '#ff9ccf', motes: 10 });
    for (let i = 0; i < 3; i++) ringP(d.cx + (o.miss ? 80 : 0), d.cy, 8, 50, '#ffb0dc', 0.45, { flat: 1, delay: i * 0.1 });
    await wait(300); hit(); await wait(200);
  };
  SIG['psyshock'] = SIG['psystrike'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#ff9ccf', dim: 0.25 });
    const tx = d.cx + (o.miss ? 80 * side() : 0), ty = d.cy;
    for (let i = 0; i < 8; i++) {
      const an = -Math.PI / 2 + R(-0.9, 0.9), sx = tx + Math.cos(an) * 220, sy = ty + Math.sin(an) * 220;
      shoot({ x: sx, y: sy, toPt: { x: tx + R(-10, 10), y: ty + R(-10, 10) }, speed: 900, bm: 'shard', c: ['#ffffff', '#ffd0ec', '#e05aa6'], s: 3, rotAlong: true, trail: q => moteP(q.x, q.y, '#ff9ccf', { life: 0.3 }) })
        .then(q => impactAt('Psychic', q.x, q.y, d.y, 0.35, { quiet: true }));
      await wait(40);
    }
    await wait(250); hit(); await wait(250);
  };
  SIG['future-sight'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.35, { col: '#ff9ccf', dim: 0.35, hold: 1.2 });
    const tx = d.x + (o.miss ? 90 * side() : 0);
    ringFx(tx, d.y, 10, 60, '#ff9ccf', 0.4);
    await wait(300);
    shapes.push({ kind: 'column', x: tx, y: d.y, w: 46, col: '#ff7ac4', life: 0.8, age: 0 });
    lightAt(tx, d.y, 220, '#ff6ec0', 0.8, 1); SFX.beam('Psychic', 0.5);
    await wait(120); hit(); await wait(600);
  };
  SIG['psycho-cut'] = SIG['air-slash'] = SIG['aqua-cutter'] = SIG['vacuum-wave'] = async (f, d, m, o, hit) => crescents(f, d, m, o, hit, m.id === 'air-slash' ? 3 : m.id === 'vacuum-wave' ? 1 : 2);
  SIG['shadow-ball'] = async (f, d, m, o, hit) => S.orb(f, d, m, o, hit, false);
  SIG['hex'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.25, { col: '#b993f5', dim: 0.3 });
    const tx = d.x + (o.miss ? 80 * side() : 0);
    for (let i = 0; i < 26; i++) flameP(tx + R(-d.w / 2, d.w / 2), d.y - R(0, 10), R(-15, 15), R(-160, -70), R(3, 5), 0.7, { c: ['#f0e6ff', '#c9a8ff', '#8a5af0', '#4a2a94', '#1e0f36'], delay: i * 0.015 });
    lightAt(tx, d.y, 140, '#8a5af0', 0.9, 0.9);
    await wait(250); hit(); await wait(450);
  };
  SIG['night-shade'] = async (f, d, m, o, hit) => S.beam(f, d, { ...m, id: 'dark-pulse' }, o, hit);
  SIG['shadow-punch'] = async (f, d, m, o, hit) => {
    // a ghostly fist rises out of the target's shadow
    await charge(f, m, 0.2, { col: '#b993f5' });
    const tx = d.cx + (o.miss ? 80 * side() : 0);
    smoke({ x: tx, y: d.y }, 6, IMP.Ghost.mist, 3);
    await wait(150);
    shapes.push({ kind: 'fist', x: tx, y: d.cy, s: 5, c: ['#7d4fd6', '#d8c4ff', '#2e1a5c'], flip: f.face < 0, life: 0.35, age: 0, vy: -60, vx: 0 });
    hit(); await wait(350);
  };
  SIG['meteor-mash'] = SIG['dynamic-punch'] = SIG['hammer-arm'] = async (f, d, m, o, hit) => {
    if (m.id === 'meteor-mash') { f.aura = '#dfe6f0'; f.auraT = T + 0.6; }
    await S.contact(f, d, { ...m, power: Math.max(100, m.power || 0) }, o, hit, 'fist');
  };
  SIG['bullet-punch'] = async (f, d, m, o, hit) => {
    const s = await dashTo(f, d, 0.1, { afterCol: '#e6ebf2' });
    for (let i = 0; i < 4; i++) {
      const at = { x: d.cx + R(-12, 12), y: d.cy + R(-14, 14) };
      powAt(at.x, at.y, 20, ['#ffffff', '#f2f6ff', '#aeb9c8', '#3e4550'], { life: 0.18 });
      for (let j = 0; j < 4; j++) sparkP(at.x, at.y, R(0, 6.28), R(120, 260), '#ffffff', 0.2);
      SFX.impact('Steel', 0.6, 1);
      if (i === 0) hit();
      f.x += f.face * 4; await wait(55); f.x -= f.face * 4;
    }
    await bounceBack(f, s, 12);
  };
  SIG['close-combat'] = SIG['outrage'] = SIG['thrash'] = async (f, d, m, o, hit) => {
    // a furious flurry: several dashes and blows from different sides
    const rage = m.id !== 'close-combat';
    if (rage) { f.aura = '#ff4a4a'; f.auraT = T + 1.4; }
    const s = await dashTo(f, d, 0.14, { afterCol: rage ? '#ff8a8a' : '#ffd59a' });
    for (let i = 0; i < 6; i++) {
      if (!on || d.state !== 'idle') break;
      const ang = R(0, 6.28), at = { x: d.cx + Math.cos(ang) * 14, y: d.cy + Math.sin(ang) * 14 };
      f.x = d.x - Math.cos(ang) * (f.r + d.r) * 0.6; f.y = clamp(d.y - Math.sin(ang) * 20, field.y0, field.y1); f.face = Math.sign(d.x - f.x) || f.face; f.after = 0.12;
      powAt(at.x, at.y, i === 5 ? 40 : 26, rage ? ['#ffffff', '#ffb0b0', '#ff3a3a', '#5a0a0a'] : POW_C, { life: 0.2 }); d.rotSV += f.face * 5;
      shapes.push({ kind: 'lines', x: at.x, y: at.y, r0: 16, r1: 50, col: '#ffffff', n: 8, life: 0.15, age: 0, rot: R(0, 1) });
      SFX.impact(rage ? 'Dragon' : 'Fighting', 0.7, 1);
      d.white = 1; d.bump(3); d.shiver = 0.1;
      if (i === 0) hit();
      await wait(85);
    }
    shakeIt(8);
    await bounceBack(f, s, 22);
  };
  SIG['aura-sphere'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.35, { col: '#6ab8ff', size: 44 });
    const q = await fire(f, d, m, o, { r: 15, curve: 0.5 * side() });
    hit(); if (o.miss) impactAt('Fighting', q.x, q.y, q.y + 30, 0.5);
    else ringP(d.cx, d.cy, 8, 70, '#8fd0ff', 0.4, { flat: 1 });
  };
  SIG['rock-throw'] = SIG['rock-tomb'] = SIG['smack-down'] = async (f, d, m, o, hit) => {
    f.crouchT = 1; await wait(160); f.crouchT = 0; f.bump(-5);
    const q = await fire(f, d, m, o, { big: m.id === 'rock-tomb' });
    hit();
    dust(q.x, q.y + 30, 1.4);
    if (m.id === 'rock-tomb' && !o.miss) for (let i = 0; i < 4; i++) { const an = i / 4 * 6.28; shapes.push({ kind: 'spike', x: d.x + Math.cos(an) * (d.r + 10), y: d.y + Math.sin(an) * 10, c: TP.Rock.c, h: 50, wide: 26, life: 0.9, age: 0 }); }
  };
  SIG['ancient-power'] = async (f, d, m, o, hit) => {
    // rocks rise and orbit the user, then fly at the target
    const rocks = [];
    for (let i = 0; i < 5; i++) { const ph = i / 5 * 6.28; rocks.push(spawn({ kind: 'debris', c: ['#8a7a62', '#bcae90', '#4a4032'], x: 0, y: 0, life: 0.6, s0: 3, rot: ph, spin: 4, path: k => ({ x: f.cx + Math.cos(ph + k * 6) * f.w * 0.8, y: f.cy - 20 * k + Math.sin(ph + k * 6) * 20 }) })); }
    glowP(f.cx, f.cy, 10, 80, '#f2e6c8', 0.6, 0.6);
    await wait(600);
    let first = null;
    for (let i = 0; i < 5; i++) { const ph = i / 5 * 6.28; const pr = shoot({ x: f.cx + Math.cos(ph) * f.w * 0.8, y: f.cy - 20 + Math.sin(ph) * 20, to: d, miss: o.miss, missOff: 70 * side(), speed: 800, draw: (q, x, y) => { glow(x, y, 26, '#f2e6c8', 0.5); drawBm('rock', ['#8a7a62', '#bcae90', '#4a4032'], x, y, 3, false, q.age * 9); } }); if (!first) first = pr.then(() => hit()); await wait(50); }
    await first; await wait(250);
  };
  SIG['heavy-slam'] = SIG['body-slam'] = async (f, d, m, o, hit) => {
    // leap high and come crashing down on the target
    const sx = f.x, sy = f.y, tx = d.x + (o.miss ? 70 * side() : 0), ty = d.y + 2;
    f.dashing = true; f.crouchT = 1; await wait(140); f.crouchT = 0; f.bump(-7);
    SFX.whoosh();
    await tw(0.42, k => { f.x = sx + (tx - sx) * k; f.y = sy + (ty - sy) * k; f.jz = Math.sin(k * Math.PI) * 130 * (k < 0.5 ? 1 : 1); });
    f.jz = 0; f.bump(10);
    hit();
    SFX.quake(); shakeIt(13); camPunch(tx, ty - 30, 0.07, 0.35);
    ringFx(tx, ty, 10, 160, '#ffffff', 0.5, { w: 2 }); dust(tx, ty, 3); addDecal('crack', tx, ty, 1.4);
    await wait(180);
    await bounceBack(f, { sx, sy }, 30);
  };
  SIG['moonblast'] = async (f, d, m, o, hit) => {
    dimTo(0.4, 1.6);
    const mx = f.cx, my = f.top - 50;
    shapes.push({ kind: 'moon', x: mx, y: my, r: 26, life: 0.85, age: 0 });
    for (let i = 0; i < 20; i++) moteP(0, 0, '#ffd6ef', { life: 0.7, delay: i * 0.03, path: k => ({ x: mx + Math.cos(i) * 90 * (1 - k), y: my + Math.sin(i) * 60 * (1 - k) }) });
    SFX.heal();
    await wait(800);
    const q = await shoot({ x: mx, y: my, to: d, miss: o.miss, missOff: 70 * side(), speed: 760, r: 18, c: ['#ffffff', '#ffe0f4', '#ff9bd6', '#e05aa6'], trail: q => spawn({ bm: 'star', c: ['#ffffff', '#ffd6ef'], x: q.x + R(-10, 10), y: q.y + R(-10, 10), life: 0.45, s0: 2, s1: 1 }) });
    hit(); if (!o.miss) camPunch(d.cx, d.cy, 0.06, 0.3); else impactAt('Fairy', q.x, q.y, q.y + 30, 0.5);
  };
  SIG['dazzling-gleam'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.3, { col: '#ffd0ee', dim: 0.4, hold: 0.9 });
    flash('#ffe6f6', 0.35);
    glowP(f.cx, f.cy, 20, 380, '#ffc8ec', 0.6, 0.9);
    for (let i = 0; i < 16; i++) { const an = i / 16 * 6.28; spawn({ kind: 'streak', c: ['#ffd6ef'], x: f.cx, y: f.cy, vx: Math.cos(an) * 700, vy: Math.sin(an) * 520, life: 0.4, len: 60, ang: an }); }
    for (let i = 0; i < 30; i++) moteP(f.cx, f.cy, '#ffe0f4', { vx: R(-400, 400), vy: R(-300, 300), drag: 2, life: 0.8 });
    lightAt(f.x, f.y, 320, '#ff9bd6', 0.7, 0.9);
    await wait(150); hit(); await wait(400);
  };
  SIG['draining-kiss'] = S.drain;
  SIG['__unused_quick'] = async (f, d, m, o, hit) => {
    // a blur: barely visible dash with long afterimages
    const s = await dashTo(f, d, 0.08, { afterCol: '#ffffff' });
    f.after = 0.3;
    hit();
    for (let i = 0; i < 8; i++) spawn({ kind: 'streak', c: ['#ffffff'], x: d.cx + R(-60, 60), y: d.cy + R(-30, 30), vx: f.face * 600, vy: 0, life: 0.2, len: 60, ang: f.face > 0 ? 0 : Math.PI });
    await wait(90);
    await bounceBack(f, s, 14);
  };
  SIG['giga-impact'] = SIG['double-edge'] = SIG['brave-bird'] = SIG['wave-crash'] = SIG['dragon-rush'] = SIG['zen-headbutt'] = SIG['iron-head'] = async (f, d, m, o, hit) => {
    const t = m.type || 'Normal', col = PAL(m).c[1];
    f.aura = m.id === 'brave-bird' ? '#8fd0ff' : col; f.auraT = T + 0.9;
    dimTo(0.3, 0.9);
    for (let i = 0; i < 18; i++) moteP(f.cx + R(-f.w, f.w), f.cy + R(-f.h, f.h), f.aura, { vy: -60, life: 0.5, delay: i * 0.015 });
    await wait(200);
    await S.contact(f, d, { ...m, power: Math.max(110, m.power || 0) }, o, hit, 'charge');
    if (!o.miss) { camPunch(d.cx, d.cy, 0.08, 0.35); hitStop(110); impactAt(t, d.cx, d.cy, d.y, 1.3, { quiet: true }); }
  };
  SIG['swift'] = S.multi;
  SIG['smog'] = SIG['belch'] = S.stream;
  SIG['mud-shot'] = S.stream;
  SIG['sand-tomb'] = S.vortex;
  SIG['whirlpool'] = S.vortex;
  // ---- status moves ----
  function rise(f, col, n = 14, bm = 'up') {
    for (let i = 0; i < n; i++) spawn({ bm, c: [col, '#ffffff', col], x: f.x + R(-f.w / 2, f.w / 2), y: f.y - R(0, 10), vy: R(-140, -80), drag: 1, life: 0.8, delay: i * 0.035, s0: 2, s1: 2, fade: true });
  }
  S.buff = async (f, d, m, o, hit) => {
    const id = m.id, col = id === 'dragon-dance' ? '#9f8cff' : id === 'bulk-up' || id === 'belly-drum' ? '#ff6a4a' : id === 'nasty-plot' ? '#a070c8' : id === 'calm-mind' ? '#ff9ccf' : id === 'growth' ? '#a6eb6a' : id === 'iron-defense' || id === 'harden' || id === 'acid-armor' || id === 'autotomize' ? '#e6ebf2' : '#ffb36a';
    SFX.buff();
    f.aura = col; f.auraT = T + 0.9; f.bump(-6);
    lightAt(f.x, f.y, 140, col, 0.9, 0.8);
    if (id === 'swords-dance') shapes.push({ kind: 'swords', f, life: 0.9, age: 0 });
    if (id === 'dragon-dance') for (let i = 0; i < 30; i++) flameP(f.x + R(-f.w / 2, f.w / 2), f.y - R(0, f.h * 0.6), R(-15, 15), R(-150, -70), R(3, 4), 0.6, { c: id === 'dragon-dance' ? ['#ffe0d0', '#ff8a6a', '#9f5aff', '#3a22a8', '#1c1058'] : undefined, delay: i * 0.02 });
    if (id === 'agility' || id === 'autotomize' || id === 'double-team') { const x0 = f.x; f.after = 0.6; await tw(0.5, k => { f.x = x0 + Math.sin(k * Math.PI * 4) * 40; }); f.x = x0; }
    if (id === 'iron-defense' || id === 'harden' || id === 'defense-curl' || id === 'acid-armor' || id === 'withdraw' || id === 'cotton-guard' || id === 'stockpile') { for (let i = 0; i < 4; i++) later(() => { f.white = 0.9; f.whiteCol = col; }, i * 120); shapes.push({ kind: 'slash', x: f.cx, y: f.cy, a: -0.8, len: f.h, bend: 0, col: '#ffffff', life: 0.4, age: 0 }); }
    if (id === 'shell-smash') { for (let i = 0; i < 14; i++) spawn({ kind: 'debris', c: ['#e8dcc0', '#c8b890', '#8a7a5a'], x: f.x, y: f.y, z: f.h * 0.5, vz: R(150, 300), g: 900, vx: R(-200, 200), vy: R(-80, 80), life: 0.9, s0: 2, rot: R(0, 6), spin: 10, bounce: true }); SFX.impact('Rock', 0.8, 1); }
    ringFx(f.x, f.y, 10, f.r * 2.2, col, 0.55); ringFx(f.x, f.y, 10, f.r * 1.5, '#ffffff', 0.5, { delay: 0.12 });
    rise(f, col);
    await wait(450); hit(); await wait(200);
  };
  S.debuff = async (f, d, m, o, hit, variant) => {
    SFX.debuff();
    const bm = variant === 'hearts' ? 'heart' : 'spark', c = variant === 'hearts' ? TP.Fairy.c : ['#ffffff', '#d0d8ff', '#8090c0'];
    if (m.id === 'sand-attack' || m.id === 'smokescreen') { for (let i = 0; i < 14; i++) smokeP(d.cx + R(-30, 30), d.cy + R(-20, 20), R(4, 6), 1.2, m.id === 'smokescreen' ? ['#3a3438', '#2a2428', '#1a1418'] : ['#e2c08a', '#c99a5a', '#a8773e'], { a: 0.8, delay: 0.2 + i * 0.02 }); await wait(500); hit(); return; }
    if (m.id === 'scary-face' || m.id === 'leer' || m.id === 'glare') { f.white = 0.8; f.whiteCol = '#ff4a4a'; shapes.push({ kind: 'lines', x: f.cx, y: f.cy, r0: 20, r1: 60, col: '#ff6a6a', n: 10, life: 0.4, age: 0 }); }
    for (let i = 0; i < 8; i++) { const a = f.mouth(), b = center(d), ox = R(-16, 16); spawn({ bm, c, x: a.x, y: a.y, life: 0.5, delay: i * 0.05, s0: 2, s1: 3, path: k => ({ x: a.x + (b.x - a.x) * k + ox, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 30 }) }); }
    await wait(600); hit(); await wait(150);
  };
  S.shield = async (f, d, m, o, hit) => { SFX.shield(); f.bump(-5); glowP(f.cx, f.cy, 10, 90, '#5affb0', 0.4, 0.8); hit(); await wait(450); };
  S.heal = async (f, d, m, o, hit) => {
    SFX.heal();
    const col = m.id === 'rest' ? '#bcd6ff' : m.id === 'synthesis' || m.id === 'morning-sun' ? '#fff3a0' : m.id === 'moonlight' ? '#ffd6ef' : '#a6ff9a';
    shapes.push({ kind: 'column', x: f.x, y: f.y, w: f.w * 0.6, col, life: 0.9, age: 0 });
    lightAt(f.x, f.y, 160, col, 1, 0.9);
    for (let i = 0; i < 16; i++) spawn({ bm: 'plus', c: ['#7be35a', '#e6ffd0', '#3ea82a'], x: f.x + R(-f.w / 2, f.w / 2), y: f.cy + R(0, f.h / 2), vy: -80, life: 0.9, delay: i * 0.04, s0: 2, s1: 2, fade: true });
    await wait(500); hit(); f.white = 0.6; f.whiteCol = col; await wait(250);
  };
  S.powder = async (f, d, m, o, hit) => {
    SFX.powder();
    const col = m.id === 'stun-spore' ? ['#fff59a', '#ffe000', '#c9a400'] : m.id === 'poison-powder' ? ['#e7b0ff', '#c56bf0', '#8e34c4'] : m.id === 'cotton-spore' ? ['#ffffff', '#f4f4f4', '#dcdcdc'] : ['#d8ffb0', '#9ad86a', '#5a9a3a'];
    for (let i = 0; i < 60; i++) { const a = f.mouth(), ox = R(-34, 34), oy = R(-34, 34); spawn({ kind: 'mote', c: [col[i % 3]], x: a.x, y: a.y, life: 1.0, delay: i * 0.01, s0: 1, s1: 1, path: k => { const b = center(d); return { x: a.x + (b.x - a.x) * k + ox * Math.sin(k * 3), y: a.y + (b.y - a.y) * k + oy * Math.sin(k * 3) }; } }); }
    await wait(900); hit(); await wait(150);
  };
  S.hypno = async (f, d, m, o, hit) => {
    SFX.status('confused');
    if (m.id === 'confuse-ray') { const q = await shoot({ x: f.mouth().x, y: f.mouth().y, to: d, speed: 420, r: 10, c: ['#ffffff', '#fff3a0', '#ffd23f', '#c99a00'], curve: 0.8 }); hit(); return q; }
    for (let i = 0; i < 4; i++) later(() => { if (!on) return; const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x); shapes.push({ kind: 'arc', x: mo.x, y: mo.y, a, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, col: '#ff8ad8', life: 0.8, age: 0, full: true }); }, i * 110);
    await wait(650); hit(); await wait(150);
  };
  S.seed = async (f, d, m, o, hit) => {
    for (let i = 0; i < 3; i++) { const a = f.mouth(), b = { x: d.x + (i - 1) * 16, y: d.y - 6 }; spawn({ bm: 'seed', c: ['#8a6a3a', '#c9a46a', '#5a4020'], x: a.x, y: a.y, life: 0.55, delay: i * 0.08, s0: 2, s1: 2, path: k => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 70 }) }); }
    await wait(700); hit(); addDecal('leaf', d.x, d.y); await wait(150);
  };
  S.wisp = async (f, d, m, o, hit) => {
    SFX.status('brn');
    for (let i = 0; i < 3; i++) { const ph = i / 3 * 6.28; spawn({ kind: 'flame', c: ['#e8f4ff', '#a8d8ff', '#5aa0ff', '#2a5ad6', '#0c2a7a'], x: 0, y: 0, life: 1.0, s0: 4, s1: 3, path: k => { const a = center(f), b = center(d), e = Math.max(0, (k - 0.4) / 0.6); const cx = a.x + (b.x - a.x) * e, cy = a.y + (b.y - a.y) * e; return { x: cx + Math.cos(ph + k * 12) * 28 * (1 - e * 0.6), y: cy + Math.sin(ph + k * 12) * 14 }; } }); }
    await wait(1000); hit(); await wait(100);
  };
  S.twave = async (f, d, m, o, hit) => {
    SFX.zap();
    ringP(d.cx, d.cy, 10, d.r * 2, '#fff59a', 0.5, { flat: 1 });
    boltFx({ ax: f.mouth().x, ay: f.mouth().y, bx: d.cx, by: d.cy, jag: 14, c: TP.Electric.c, life: 0.3, w: 0.7 });
    await wait(300); hit(); await wait(200);
  };
  S.toxic = async (f, d, m, o, hit) => {
    SFX.status('psn');
    for (let i = 0; i < 12; i++) { const a = f.mouth(), b = center(d), ox = R(-14, 14); spawn({ kind: 'blob', c: ['#a54ad8', '#f0c8ff'], x: a.x, y: a.y, life: 0.55, delay: i * 0.03, s0: 2.5, s1: 2, path: k => ({ x: a.x + (b.x - a.x) * k + ox, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 45 }) }); }
    await wait(650); hit(); await wait(150);
  };
  const WEATHER = { 'sunny-day': 'sun', 'rain-dance': 'rain', 'sandstorm': 'sand', 'snowscape': 'snow' };
  S.generic = async (f, d, m, o, hit) => {
    const w = WEATHER[m.id];
    if (w) {
      SFX.buff();
      if (w === 'sun') { flash('#fff3c0', 0.3); lightAt(VW / 2, VH / 2, VW * 0.6, '#ffd27a', 1.6, 0.6); }
      for (let i = 0; i < 160; i++) {
        const x = R(-50, VW), y = R(-40, VH * 0.4), delay = R(0, 1.2);
        if (w === 'rain') spawn({ kind: 'streak', c: ['#bfe0ff'], x, y, vx: 120, vy: 900, life: 0.8, len: 22, ang: Math.atan2(900, 120), delay });
        else if (w === 'sand') spawn({ sq: 1, c: ['#e2c08a'], x: -20, y: R(0, VH), vx: R(500, 800), vy: R(-30, 30), life: 1.6, s0: 1, s1: 1, delay });
        else if (w === 'snow') spawn({ sq: 1, c: ['#ffffff'], x, y, vx: R(-30, 30), vy: R(80, 140), life: 3, s0: 1, s1: 1, delay, fade: true });
        else if (i < 30) moteP(R(0, VW), R(0, VH), '#fff3a0', { vy: -20, life: 1.4, delay });
      }
      await wait(600); hit(); await wait(300);
      return;
    }
    impactAt(m.type || 'Normal', f.cx, f.cy, f.y, 0.6, { quiet: true }); SFX.buff(); f.bump(-5); await wait(400); hit();
  };

  // ---- status moves with real body language ----
  Object.assign(SHAPE2, {
    // thick travelling sound wave (Growl, Roar, Hyper Voice...)
    wave2: (s, k) => {
      const r = 14 + k * (s.grow || 70), a = (1 - k) * (k < 0.1 ? k / 0.1 : 1), span = s.span || 0.9;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.strokeStyle = s.col; ctx.lineWidth = PX * 4.5;
      ctx.beginPath(); ctx.arc(0, 0, r, -span, span); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.lineWidth = PX * 1.8; ctx.strokeStyle = s.jag ? s.col : '#ffffff';
      ctx.beginPath();
      if (s.jag) { for (let i = 0; i <= 14; i++) { const t = -span + 2 * span * i / 14, rr = r + (i % 2 ? 6 : -6); i ? ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr); } }
      else ctx.arc(0, 0, r, -span, span);
      ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // 4-point twinkle (an eye glint / sparkle)
    glint: (s, k) => {
      const sc = s.r * (k < 0.3 ? easeOut(k / 0.3) : 1 - (k - 0.3) / 0.7 * 0.6), a = k > 0.6 ? (1 - k) / 0.4 : 1;
      glow(s.x, s.y, sc * 2.4, s.col, 0.8 * a);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(k * 1.2); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sc * 0.18, sc * 0.18); ctx.lineTo(0, sc); ctx.lineTo(-sc * 0.18, sc * 0.18); ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // anger mark (Taunt / Torment / Swagger)
    anger: (s, k) => {
      const sc = (k < 0.2 ? easeOut(k / 0.2) * 1.2 : 1 + Math.sin(k * 30) * 0.06) * s.r, a = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(sc / 20, sc / 20); ctx.globalAlpha = a;
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 2 + 0.785);
        ctx.strokeStyle = '#5a0a0a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(5, -6); ctx.quadraticCurveTo(14, 0, 5, 6); ctx.stroke();
        ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(5, -6); ctx.quadraticCurveTo(14, 0, 5, 6); ctx.stroke();
        ctx.restore();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    // hypnotic spiral over the target
    spiral: (s, k) => {
      const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1, R0 = s.r;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(T * 6); ctx.globalAlpha = a;
      for (const [col, w] of [['#ff6ec0', 6], ['#ffffff', 2.5]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const t = i / 80, ang = t * 6.28 * 3, rr = t * R0; i ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.7) : ctx.moveTo(0, 0); }
        ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      glow(s.x, s.y, R0 * 1.6, '#ff9ccf', 0.4 * a);
    },
    // hexagon force-field dome bursting out (Protect / Detect)
    dome: (s, k) => {
      const f = s.f; if (!f) return;
      const r = Math.max(f.w, f.h) * 0.66 * (k < 0.2 ? easeOut(k / 0.2) * 1.1 : 1.1 - (k - 0.2) * 0.12), a = k > 0.7 ? (1 - k) / 0.3 : 1;
      glow(f.cx, f.cy, r * 1.5, s.col, 0.55 * a);
      ctx.save(); ctx.translate(f.cx, f.cy); ctx.globalAlpha = a;
      ctx.fillStyle = s.col; ctx.globalAlpha = 0.16 * a; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.85 * a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
      const hs = r * 0.3;
      for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) {
        const cx = gx * hs * 1.5, cy = gy * hs * 1.73 + (gx % 2 ? hs * 0.87 : 0);
        if (cx * cx + cy * cy > (r - hs * 0.4) ** 2) continue;
        ctx.beginPath(); for (let j = 0; j <= 6; j++) { const an = j / 6 * 6.28; const hx = cx + Math.cos(an) * hs * 0.95, hy = cy + Math.sin(an) * hs * 0.95; j ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy); } ctx.stroke();
      }
      ctx.lineWidth = PX * 1.4; ctx.strokeStyle = s.col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
  });
  const eyeOf = f => ({ x: f.x + f.face * f.w * 0.16, y: f.top + f.h * 0.24 });
  function soundBurst(f, d, col, n = 5, o = {}) {
    for (let i = 0; i < n; i++) later(() => {
      if (!on || f.state !== 'idle') return;
      const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x);
      shapes.push({ kind: 'wave2', x: mo.x, y: mo.y, a, vx: Math.cos(a) * (o.speed || 520), vy: Math.sin(a) * (o.speed || 520), col, jag: o.jag, span: o.span, grow: o.grow, life: o.life || 0.65, age: 0 });
      if (o.notes && i % 2) spawn({ bm: 'note', c: [col, '#ffffff'], x: mo.x, y: mo.y, vx: Math.cos(a) * 300 + R(-40, 40), vy: Math.sin(a) * 300 + R(-60, 0), life: 0.7, s0: 2, s1: 2, fade: true });
    }, i * (o.gap || 80));
  }
  function shrinkFoe(d, col = '#7aa8ff') {
    if (d.state !== 'idle') return;
    d.bump(5); d.shiver = 0.25;
    for (let j = 0; j < 7; j++) spawn({ bm: 'down', c: [col, '#ffffff', col], x: d.x + R(-d.w / 2, d.w / 2), y: d.top + R(-10, 10), vy: 90, life: 0.7, delay: j * 0.05, s0: 2, s1: 2, fade: true });
  }
  S.sound = async (f, d, m, o, hit) => {
    const status = m.cat === 'status', id = m.id;
    const col = id === 'screech' ? '#ff5a5a' : id === 'metal-sound' ? '#dfe6f0' : id === 'supersonic' ? '#bfe6ff' : m.type === 'Bug' ? '#cdeb5a' : m.type === 'Dark' ? '#b080d8' : m.type === 'Fairy' ? '#ff9bd6' : id === 'sing' || id === 'perish-song' ? '#c8a8ff' : '#ffffff';
    const roar = id === 'roar' || id === 'noble-roar' || id === 'hyper-voice' || id === 'boomburst';
    // rear back, then let it out
    f.crouchT = 1;
    await tw(0.16, k => { f.rotA = -f.face * 0.18 * k; });
    f.crouchT = 0; f.bump(-8);
    await tw(0.08, k => { f.rotA = -f.face * 0.18 + f.face * 0.3 * k; });
    if (roar) { shakeIt(6); dimTo(0.15, 0.8); }
    SFX.sonic();
    soundBurst(f, d, col, roar ? 6 : 5, { jag: id === 'screech' || id === 'snarl', span: id === 'supersonic' ? 0.5 : roar ? 1.2 : 0.9, notes: id === 'sing' || id === 'perish-song' || id === 'growl' || id === 'round', grow: roar ? 110 : 70 });
    await wait(380);
    hit();
    if (status) shrinkFoe(d, id === 'screech' || id === 'metal-sound' ? '#7aa8ff' : '#ff9a6a');
    else if (d.state === 'idle') { d.shiver = 0.3; }
    await wait(300);
  };
  const STATUS_SIG = {};
  STATUS_SIG['tail-whip'] = async (f, d, m, o, hit) => {
    // turn round and wag the tail at the foe
    const dir = f.face;
    for (let i = 0; i < 6; i++) later(() => { f.face = i % 2 ? dir : -dir; f.jz = 0; }, i * 90);
    await tw(0.55, k => { f.jz = Math.abs(Math.sin(k * Math.PI * 3)) * 8; f.rotA = Math.sin(k * Math.PI * 6) * 0.15; });
    f.face = dir; f.jz = 0;
    for (let i = 0; i < 3; i++) spawn({ kind: 'streak', c: ['#ffffff'], x: f.x - dir * f.w * 0.4, y: f.cy + (i - 1) * 10, vx: -dir * 60, vy: 0, life: 0.3, len: 20, ang: Math.PI / 2 });
    hit(); shrinkFoe(d);
    await wait(250);
  };
  STATUS_SIG['leer'] = STATUS_SIG['scary-face'] = STATUS_SIG['glare'] = STATUS_SIG['mean-look'] = STATUS_SIG['block'] = async (f, d, m, o, hit) => {
    const scary = m.id !== 'leer', col = scary ? '#ff4a4a' : '#ffffff', e = eyeOf(f);
    dimTo(scary ? 0.45 : 0.25, 1.0);
    shapes.push({ kind: 'glint', x: e.x, y: e.y, r: 36, col, life: 0.6, age: 0 });
    SFX.status('flinch');
    await wait(260);
    // piercing glare lines
    for (let i = 0; i < 5; i++) { const off = (i - 2) * 8; spawn({ kind: 'streak', c: [col], x: d.cx, y: d.cy + off, vx: 0, vy: 0, life: 0.3, len: Math.hypot(d.cx - e.x, d.cy - e.y), ang: Math.atan2(d.cy - e.y, d.cx - e.x), delay: i * 0.03 }); }
    if (scary) { f.white = 0.8; f.whiteCol = '#ff4a4a'; shapes.push({ kind: 'lines', x: d.cx, y: d.cy, r0: 30, r1: 80, col: '#ff6a6a', n: 12, life: 0.35, age: 0 }); }
    await wait(150);
    hit(); shrinkFoe(d, scary ? '#ff9a6a' : '#7aa8ff');
    await wait(300);
  };
  STATUS_SIG['taunt'] = STATUS_SIG['torment'] = STATUS_SIG['swagger'] = STATUS_SIG['flatter'] = async (f, d, m, o, hit) => {
    // a cocky hop, then the foe boils over
    await tw(0.35, k => { f.jz = Math.abs(Math.sin(k * Math.PI * 2)) * 14; f.rotA = Math.sin(k * Math.PI * 4) * 0.12; });
    f.jz = 0;
    shapes.push({ kind: 'anger', x: d.x - d.face * d.w * 0.22, y: d.top + 4, r: 38, life: 1.2, age: 0 });
    d.white = 0.7; d.whiteCol = '#ff4a4a'; d.shiver = 0.4;
    SFX.status('flinch');
    await wait(250); hit(); await wait(450);
  };
  STATUS_SIG['disable'] = STATUS_SIG['spite'] = STATUS_SIG['curse'] = STATUS_SIG['destiny-bond'] = STATUS_SIG['imprison'] = STATUS_SIG['perish-song'] = async (f, d, m, o, hit) => {
    const ghost = m.id !== 'disable', col = ghost ? '#8a5af0' : '#ff9ccf';
    dimTo(0.4, 1.3);
    f.aura = col; f.auraT = T + 1.1;
    for (let i = 0; i < 16; i++) smokeP(f.x + R(-f.w / 2, f.w / 2), f.y - R(0, f.h * 0.5), R(3, 5), 1, ghost ? IMP.Ghost.mist : ['#ffc8e8', '#ff9ccf', '#c0307e'], { vy: -60, a: 0.7, delay: i * 0.03 });
    await wait(400);
    for (let i = 0; i < 10; i++) { const a = center(f), b = center(d), ox = R(-20, 20); moteP(0, 0, col, { life: 0.6, delay: i * 0.04, s: 1.5, path: k => ({ x: a.x + (b.x - a.x) * k + ox * Math.sin(k * 6), y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 40 }) }); }
    await wait(550);
    if (d.state === 'idle') { d.white = 0.7; d.whiteCol = col; d.shiver = 0.3; ringP(d.cx, d.cy, 8, 60, col, 0.4, { flat: 1 }); }
    hit(); await wait(250);
  };
  STATUS_SIG['charm'] = STATUS_SIG['sweet-kiss'] = STATUS_SIG['baby-doll-eyes'] = STATUS_SIG['attract'] = STATUS_SIG['captivate'] = async (f, d, m, o, hit) => {
    const e = eyeOf(f);
    shapes.push({ kind: 'glint', x: e.x, y: e.y, r: 20, col: '#ff9bd6', life: 0.45, age: 0 });
    await tw(0.3, k => { f.rotA = Math.sin(k * Math.PI * 2) * 0.15; f.jz = Math.sin(k * Math.PI) * 10; });
    SFX.heal();
    for (let i = 0; i < 8; i++) { const a = f.mouth(), b = center(d), ox = R(-24, 24); spawn({ bm: 'heart', c: ['#ff5aa8', '#ffd6ef', '#c0307e'], x: a.x, y: a.y, life: 0.7, delay: i * 0.06, s0: 3, s1: 4, path: k => ({ x: a.x + (b.x - a.x) * k + ox * Math.sin(k * 3.14), y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 50 + Math.sin(k * 12 + i) * 6 }) }); }
    await wait(800);
    for (let i = 0; i < 6; i++) spawn({ bm: 'heart', c: ['#ff5aa8', '#ffd6ef', '#c0307e'], x: d.cx + R(-30, 30), y: d.cy + R(-20, 10), vy: -60, life: 0.7, s0: 2, s1: 2, fade: true });
    hit(); shrinkFoe(d, '#ff9a6a'); await wait(200);
  };
  STATUS_SIG['feather-dance'] = async (f, d, m, o, hit) => {
    await tw(0.4, k => { f.jz = Math.sin(k * Math.PI) * 18; f.rotA = Math.sin(k * Math.PI * 4) * 0.2; });
    for (let i = 0; i < 18; i++) spawn({ bm: 'gust', c: ['#ffffff', '#e6f1ff', '#b8c8dc'], x: d.cx + R(-60, 60), y: d.top - R(30, 90), vx: R(-20, 20), vy: R(30, 60), sway: 80, life: 1.1, delay: i * 0.03, s0: 2, s1: 2, rot: R(0, 6), spin: R(-3, 3), fade: true });
    await wait(600); hit(); shrinkFoe(d, '#ff9a6a'); await wait(200);
  };
  STATUS_SIG['yawn'] = async (f, d, m, o, hit) => {
    f.crouchT = 1; await wait(200); f.crouchT = 0; f.bump(-6);
    const q = await shoot({ x: f.mouth().x, y: f.mouth().y, to: d, speed: 260, r: 14, c: ['#ffffff', '#f2f6ff', '#d8e6f5', '#a8bcd4'], curve: 0.4, trail: q => { if (Math.random() < 0.1) spawn({ bm: 'zzz', c: ['#ffffff', '#cfe3ff', '#8fb3ff'], x: q.x, y: q.y, vy: -30, life: 0.8, s0: 2, s1: 2, fade: true }); } });
    ringP(q.x, q.y, 6, 40, '#ffffff', 0.3, { flat: 1 }); hit(); await wait(200);
  };
  S.shield = async (f, d, m, o, hit) => {
    const detect = m.id === 'detect';
    if (detect) { const e = eyeOf(f); shapes.push({ kind: 'glint', x: e.x, y: e.y, r: 24, col: '#ffffff', life: 0.4, age: 0 }); await wait(200); }
    SFX.shield(); f.bump(-6);
    shapes.push({ kind: 'dome', f, col: m.id === 'wide-guard' || m.id === 'quick-guard' ? '#ffd23f' : '#5affb0', life: 1.2, age: 0 });
    flash('#e0fff0', 0.12);
    hit(); await wait(800);
  };
  S.twave = async (f, d, m, o, hit) => {
    await charge(f, m, 0.2, { col: '#fff59a', motes: 10, size: 24, recoil: 20 });
    SFX.zap();
    boltFx({ from: f, to: d, ax: f.mouth().x, ay: f.mouth().y, bx: d.cx, by: d.cy, jag: 16, c: TP.Electric.c, life: 0.3, w: 0.8 });
    await wait(120);
    // a crackling ring of static closes around the target
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * 6.28, a1 = a0 + 1.05, r = Math.max(d.w, d.h) * 0.55; boltFx({ ax: d.cx + Math.cos(a0) * r, ay: d.cy + Math.sin(a0) * r * 0.7, bx: d.cx + Math.cos(a1) * r, by: d.cy + Math.sin(a1) * r * 0.7, jag: 8, c: TP.Electric.c, life: 0.85, w: 0.8 }); }
    ringP(d.cx, d.cy, d.r * 2.2, d.r * 1.2, '#fff59a', 0.5, { flat: 0.7, w: 2 });
    if (d.state === 'idle') { d.white = 0.7; d.whiteCol = '#fff59a'; d.shiver = 0.5; }
    await wait(250); hit(); await wait(500);
  };
  S.hypno = async (f, d, m, o, hit) => {
    SFX.status('confused');
    if (m.id === 'confuse-ray') { const q = await shoot({ x: f.mouth().x, y: f.mouth().y, to: d, speed: 420, r: 12, c: ['#ffffff', '#fff3a0', '#ffd23f', '#c99a00'], curve: 0.8, trail: q => moteP(q.x, q.y, '#fff3a0', { life: 0.4 }) }); hit(); if (d.state === 'idle') { d.rotSV += 8; } return q; }
    const e = eyeOf(f);
    shapes.push({ kind: 'glint', x: e.x, y: e.y, r: 20, col: '#ff9ccf', life: 0.4, age: 0 });
    for (let i = 0; i < 4; i++) later(() => { if (!on) return; const mo = f.mouth(), a = Math.atan2(d.cy - mo.y, d.cx - mo.x); shapes.push({ kind: 'wave2', x: mo.x, y: mo.y, a, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, col: '#ff8ad8', span: 1.4, grow: 30, life: 0.8, age: 0 }); }, i * 110);
    await wait(500);
    shapes.push({ kind: 'spiral', x: d.cx, y: d.top + 10, r: 34, life: 0.9, age: 0 });
    await wait(350); hit(); await wait(350);
  };
  SIG['confusion'] = async (f, d, m, o, hit) => {
    await charge(f, m, 0.22, { col: '#ff9ccf', motes: 12 });
    const tx = d.cx + (o.miss ? 80 : 0);
    for (let i = 0; i < 4; i++) ringP(tx, d.cy, 10, 70, i % 2 ? '#ffb0dc' : '#ffffff', 0.5, { flat: 1, w: 2, delay: i * 0.09 });
    glowP(tx, d.cy, 10, 80, '#ff9ccf', 0.6, 0.7);
    await wait(200);
    if (!o.miss && d.state === 'idle') { d.whiteCol = '#ff9ccf'; tw(0.4, k => { if (d.state === 'idle') { d.rotS = Math.sin(k * 30) * 0.12 * (1 - k); d.white = 0.4 * (1 - k); } }); }
    hit(); await wait(300);
  };
  for (const [id, fn] of Object.entries(STATUS_SIG)) SIG[id] = fn;

  // ---------------------------------------------------------------------
  //  Hit reactions
  // ---------------------------------------------------------------------
  function impactFx(d, m, eff, crit, frac = 0.2) {
    const at = { x: d.cx + R(-6, 6), y: d.cy + R(-6, 6) }, type = m.type || 'Normal';
    const pwMove = clamp((m.power || 60) / 80, 0.6, 1.6) * (eff > 1 ? 1.2 : eff < 1 ? 0.75 : 1);
    const pwDmg = clamp(0.5 + frac * 2.6, 0.5, 2.0);
    const pw = (pwMove + pwDmg) / 2 * (crit ? 1.2 : 1);
    d.lastFrac = frac;
    impactAt(type, at.x, at.y, d.y, pw);
    d.white = 1; d.whiteCol = '#ffffff'; d.bump(4 + pw * 3); d.shiver = 0.12;
    const foe = foeOf(d); d.rotSV += (Math.sign(d.x - (foe ? foe.x : d.x - 1)) || 1) * 5 * pw;
    const stg = clamp((frac - 0.12) * 2.2, 0, 0.8) + (crit ? 0.3 : 0);
    if (stg > 0.08) { d.stagger = Math.max(d.stagger || 0, T + stg); d.goal = null; }
    if (crit) shapes.push({ kind: 'dizzy', f: d, life: 0.9, age: 0 });
    if (eff < 1) shapes.push({ kind: 'dome', f: d, col: '#9fc4ff', life: 0.35, age: 0 });
    if (eff > 1 || crit) trainerPose(d.p, 'dismay', 0.9);
    SFX.impact(type, pw, eff);
    if (pw > 1.15 || crit) { shakeIt(4 + pw * 4); hitStop(crit ? 110 : 70); }
    if (crit || pw > 1.5) camPunch(at.x, at.y, crit ? 0.09 : 0.06, 0.3);
    return pw;
  }
  function knock(d, from, pw) {
    const dx = d.x - from.x, dy = d.y - from.y, L = Math.hypot(dx, dy) || 1;
    const ratio = statRatio(from.mon, d.mon, from.lastMove), push = clamp(Math.sqrt(ratio), 0.4, 1.6);
    if (ratio < 0.8 && (d.lastFrac || 0) < 0.2) {
      // the defender is much sturdier: it digs in and barely moves
      d.crouchT = 0.8; later(() => { d.crouchT = 0; }, 220);
      dust(d.x, d.y, 1.2);
      glowP(d.cx, d.cy, 10, Math.max(d.w, d.h) * 0.7, from.lastMove && from.lastMove.cat === 'special' ? '#bcd6ff' : '#e8e0d0', 0.3, 0.6);
    }
    pw *= push;
    d.kx += dx / L * 300 * pw; d.ky += dy / L * 130 * pw + R(-30, 30);
    if (pw > 1.2) { d.goal = { x: clamp(d.x + dx / L * 130, field.x0, field.x1), y: clamp(d.y + dy / L * 70, field.y0, field.y1) }; d.goalT = 1; }
    if (pw > 1.15 && !d.hover && d.state === 'idle') {
      // big hits launch the target into a short tumble
      tw(0.38, k => { if (d.state === 'idle') d.jz = Math.sin(k * Math.PI) * 22 * pw; }).then(() => { d.jz = 0; if (d.state === 'idle') { d.bump(6); dust(d.x, d.y, 1.4); } });
    }
  }
  function dodge(d, from) {
    const dx = d.x - from.x, dy = d.y - from.y, L = Math.hypot(dx, dy) || 1, s = side();
    d.kx += -dy / L * 380 * s; d.ky += dx / L * 380 * s;
    d.after = 0.3; d.afterCol = '#ffffff';
    tw(0.25, k => { d.jz = Math.sin(k * Math.PI) * 16; }).then(() => { d.jz = 0; d.bump(3); });
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
    if (eff === 0) { text(d, 'NO EFFECT', 'weak'); AudioFX.Crowd.gasp(); d.bump(-5); tw(0.3, k => { if (d.state === 'idle') d.jz = Math.sin(k * Math.PI) * 12; }).then(() => { d.jz = 0; }); return; }
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
      if (h === 0) { pw = impactFx(d, m, eff, c, dmg / t.maxhp); number(d, dmg, 0, c ? 'crit' : eff > 1 ? 'super' : ''); }
      else later(() => { if (on && d.state !== 'gone') { impactFx(d, m, eff, c, dmg / t.maxhp); number(d, dmg, h); } }, h * 160);
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
      u.hp = Math.max(0, u.hp - recoil); f.white = 0.8; number(f, recoil, 0, 'burn'); hud(p);
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
    const planned = f.plan != null && f.plan >= 0 && u.moves[f.plan] && u.moves[f.plan].ppLeft > 0 ? f.plan : null;
    let idx = f.forceMove ?? f.queued ?? planned ?? chooseMove(f, d);
    f.forceMove = f.queued = f.plan = null;
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
        u.hp = Math.max(0, u.hp - dmg); number(f, dmg); f.white = 1; f.whiteCol = '#ffffff'; f.bump(6); f.shiver = 0.3; hud(p);
        impactAt('Normal', f.cx, f.cy, f.y, 0.5, { quiet: true });
        if (u.hp <= 0) koFighter(f);
        await wait(500);
        return;
      }
    }
    if (u.status === 'par' && Math.random() < 0.25) { text(f, 'FULLY PARALYZED!', 'info'); SFX.status('par'); f.shiver = 0.5; burst(center(f), 'Electric', 0.7); await wait(500); return; }
    if (idx >= 0) m.ppLeft--;
    f.lastMove = m;
    pill(p, m.name);
    trainerPose(p, 'throw', 0.6);
    if (Math.random() < ((m.power || 0) >= 100 ? 0.75 : 0.28)) speech(p, pick([`Use ${m.name}!`, `${m.name}, now!`, `Go, ${m.name}!`]), 1100);
    if (m.cat !== 'status') react(d, f, m);
    const selfT = SELF_TARGETS.has(m.target) || m.id === 'rest';
    let miss = false;
    if (!selfT && m.acc != null) { const st = clamp(u.stages.acc - d.mon.stages.eva, -6, 6); miss = Math.random() * 100 >= m.acc * accMult(st); }
    const [style, variant] = classify(m).split(':');
    if (m.cat !== 'status') SFX.cast(m.type || 'Normal');
    let done = false;
    const hit = (mult = 1) => { if (done || tk !== token) return; done = true; resolveHit(f, d, m, miss, mult); };
    const fx = SIG[m.id] || S[style] || S.generic;
    let r;
    try { r = await fx(f, selfT ? f : d, m, { miss }, hit, style === 'orb' && !SIG[m.id] ? variant === 'big' : variant); }
    catch (e) { if (e instanceof BattleAbort) throw e; console.warn('retro fx', m.id, e); }
    chk(tk);
    f.dashing = false; f.crouchT = 0; f.jz = 0;
    if (r !== 'nohit') hit();
    if (controllers[p] === 'human') humanRow(p);
  }
  let cinemaUntil = 0;
  async function doMega(f, tk) {
    cinemaUntil = T + 3.7;
    const p = f.p, u = f.mon, fm = u.megaForm;
    state.players[p].usedMega = true;
    const tr = TR[p], ks = { x: tr.x + (p ? -12 : 12), y: tr.y - 84 };
    const RB = ['#ff5a5a', '#ffb84a', '#fff35a', '#5aff8a', '#5ad6ff', '#9a7bff', '#ff7be3'];
    f.busy = true; f.vx = f.vy = 0;
    // 1. the trainer raises the Key Stone; the arena darkens and it starts to shine
    trainerPose(p, 'cheer', 3.2);
    speech(p, 'Mega Evolve!', 1500);
    SFX.mega();
    dimTo(0.62, 3.4);
    camPunch((ks.x + f.cx) / 2, (ks.y + f.cy) / 2, 0.05, 3.2);
    const ksGlow = spawn({ kind: 'glow', c: ['#ffffff'], x: ks.x, y: ks.y, s0: 6, s1: 70, life: 3.0, a: 0.9, must: true });
    for (let i = 0; i < 4; i++) ringP(ks.x, ks.y, 4, 60, RB[i * 2 % 7], 0.6, { flat: 1, delay: i * 0.15 });
    lightAt(tr.x, tr.y, 160, '#ffffff', 3, 0.7);
    await wait(500); chk(tk);
    // 2. a rainbow helix links the Key Stone and the Mega Stone; the Pokémon starts to glow
    shapes.push({ kind: 'helix', f, x0: ks.x, y0: ks.y, life: 1.6, age: 0 });
    for (let i = 0; i < 30; i++) moteP(0, 0, RB[i % 7], { life: 0.7, delay: i * 0.035, s: 1.5, path: k => ({ x: ks.x + (f.cx - ks.x) * k, y: ks.y + (f.cy - ks.y) * k - Math.sin(k * Math.PI) * 40 }) });
    f.aura = '#ffffff'; f.auraT = T + 3;
    await tw(0.8, k => { f.white = k * 0.6; f.whiteCol = '#ffffff'; }); chk(tk);
    // 3. a sphere of light closes around it and drinks in energy from all sides
    const orb = { kind: 'megaorb', f, phase: 'grow', life: 1.25, age: 0 };
    shapes.push(orb);
    lightAt(f.x, f.y, 240, '#ffffff', 2.2, 0.9, () => ({ x: f.x, y: f.y }));
    for (let i = 0; i < 70; i++) { const an = R(0, 6.28), r0 = R(160, 260); spawn({ kind: 'streak', c: [RB[i % 7]], x: 0, y: 0, life: 0.5, delay: i * 0.015, len: 26, ang: an + Math.PI, path: k => ({ x: f.cx + Math.cos(an) * r0 * (1 - easeIn(k)), y: f.cy + Math.sin(an) * r0 * 0.7 * (1 - easeIn(k)) }) }); }
    await tw(1.15, k => { f.white = 0.6 + k * 0.4; f.shiver = k > 0.5 ? 0.08 : 0; if (k > 0.6) shake = Math.max(shake, (k - 0.6) * 8); }); chk(tk);
    const anim = await getAnim(fm.sprite); chk(tk);
    // 4. the sphere shatters: flash, shockwave, rainbow shards - the new form stands revealed
    orb.age = orb.life;
    shapes.push({ kind: 'megaorb', f, phase: 'burst', life: 0.45, age: 0 });
    flash('#ffffff', 0.95); shakeIt(13); hitStop(140); camPunch(f.cx, f.cy, 0.12, 0.7);
    u.modelKey = fm.name; u.isMega = true; u.name = fm.display; u.types = fm.types.slice(); u.stats = calcStats(fm.base, u.level); u.sprite = fm.sprite;
    if (fm.cry) u.cry = fm.cry;
    f.anim = anim; f.fit(); f.bump(-10); f.white = 1;
    for (let i = 0; i < 40; i++) { const an = R(0, 6.28), sp = R(220, 520); spawn({ bm: 'shard', c: ['#ffffff', RB[i % 7], RB[(i + 3) % 7]], x: f.cx, y: f.cy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.75, drag: 2.2, life: R(0.6, 1.1), s0: 3, s1: 2, rot: R(0, 6), spin: R(-14, 14), must: true }); }
    for (let i = 0; i < 28; i++) { const an = i / 28 * 6.28; spawn({ kind: 'streak', c: [RB[i % 7]], x: f.cx, y: f.cy, vx: Math.cos(an) * 700, vy: Math.sin(an) * 520, life: 0.5, len: 60, ang: an, must: true }); }
    ringP(f.x, f.y, 10, 220, '#ffffff', 0.6, { w: 2 }); ringP(f.x, f.y, 10, 160, '#ffd6ff', 0.6, { delay: 0.08 }); ringP(f.cx, f.cy, 10, 120, '#ffffff', 0.5, { flat: 1 });
    impactAt(u.types[0], f.cx, f.cy, f.y, 1.5, { quiet: true });
    dust(f.x, f.y, 3);
    lightAt(f.x, f.y, 300, '#ffd6ff', 1.2, 1);
    ksGlow.life = Math.min(ksGlow.life, ksGlow.age + 0.3);
    playCry(u);
    big('MEGA EVOLUTION!', 'mega', 1900);
    shapes.push({ kind: 'megasym', x: f.cx, y: f.top - 46, size: 1.1, life: 1.6, age: 0 });
    later(() => Broadcast.captureThumb(6, `MEGA ${u.name.toUpperCase()}!`), 200);
    cheer = 1; AudioFX.Crowd.cheer(1);
    hud(p);
    // 5. a power-up flex: the aura flickers in its new type colour
    const col = (IMP[u.types[0]] || IMP.Normal).glow;
    f.aura = col; f.auraT = T + 1.1;
    await tw(0.5, k => { f.white = 1 - k; f.whiteCol = '#ffffff'; }); chk(tk);
    for (let i = 0; i < 3; i++) later(() => { if (f.state === 'idle') { f.bump(-5); ringP(f.x, f.y, 8, f.r * 2.4, col, 0.4); } }, i * 180);
    await wait(500);
  }
  function think(f, dt) {
    if (f.state !== 'idle' || f.busy || T < cinemaUntil) return;
    if (f.stuck) {
      if (f.mon.status === 'frz' && (f.thawT += dt) > 2.5) { f.thawT = 0; if (Math.random() < 0.3) { f.mon.status = null; text(f, 'THAWED OUT!', 'info'); hud(f.p); f.bump(-5); for (let i = 0; i < 10; i++) spawn({ bm: 'shard', c: ['#ffffff', '#e2f8ff', '#4fa9e6'], x: f.cx, y: f.cy, vx: R(-200, 200), vy: R(-200, 80), drag: 2, life: 0.5, s0: 2, s1: 2, rot: R(0, 6), spin: 10 }); } }
      return;
    }
    const foe = foeOf(f);
    if (!foe || foe.state !== 'idle') return;
    if (T < (f.stagger || 0)) return;
    const cpu = controllers[f.p] === 'cpu';
    if (f.queuedSwitch != null) { const i = f.queuedSwitch; f.queuedSwitch = null; if (canSwitchTo(f.p, i)) { f.busy = true; switchOut(f, i, token).catch(swallow); return; } }
    if (cpu && f.plan == null) f.plan = chooseMove(f, foe);
    f.cd -= dt;
    // telegraph: a short ready crouch just before it acts
    f.crouchT = f.cd > 0 && f.cd < 0.3 ? 0.55 : 0;
    if (f.cd > 0) return;
    f.crouchT = 0;
    if (cpu && f.forceMove == null) {
      const swi = considerSwitch(f, foe);
      if (swi >= 0) { f.busy = true; switchOut(f, swi, token).catch(swallow); return; }
      const pm = f.plan >= 0 ? f.mon.moves[f.plan] : null;
      if (foe.protectUntil > T && (!pm || !(pm.cat === 'status' && SELF_TARGETS.has(pm.target)))) { f.cd = 0.25; return; }
    }
    if (!cpu && f.queued == null && f.forceMove == null) {
      if (!f.ready) { f.ready = true; document.getElementById('rrow' + f.p)?.classList.add('ready'); }
      return;
    }
    // physical attackers close the distance before they swing
    if (cpu && f.forceMove == null && f.plan >= 0 && isContact(f.mon.moves[f.plan])) {
      const dd = Math.hypot(foe.x - f.x, foe.y - f.y);
      if (dd > f.r + foe.r + 150 && (f.approach = (f.approach || 0) + dt) < 1.3) { f.goal = { x: foe.x - (Math.sign(foe.x - f.x) || 1) * (f.r + foe.r + 40), y: foe.y + R(-10, 10) }; f.goalT = 0.3; return; }
    }
    f.approach = 0;
    f.ready = false;
    document.getElementById('rrow' + f.p)?.classList.remove('ready');
    f.busy = true;
    f.vx *= 0.3; f.vy *= 0.3;
    const tk = token;
    act(f, tk).catch(swallow).finally(() => {
      if (tk !== token) return;
      f.busy = false;
      f.cd = actionGap(f.mon) + R(-0.25, 0.4) + (f.extraCd || 0);
      if (f.lastMove && (f.lastMove.priority || 0) > 0) f.cd *= 0.6;
      f.extraCd = 0;
      f.goal = null;
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
    // the ball arcs out, bounces once and bursts open
    spawn({ bm: 'ball', c: ['#e23b3b', '#ffffff', '#1a1a22'], x: hand.x, y: hand.y, life: 0.62, s0: 2, s1: 2, rot: 0.01, spin: 18, must: true,
      path: k => { const e = Math.min(1, k / 0.8); const bx = hand.x + (dest.x - hand.x) * e, by = hand.y + (dest.y - 8 - hand.y) * e - Math.sin(e * Math.PI) * 120; return k < 0.8 ? { x: bx, y: by } : { x: dest.x, y: dest.y - 8 - Math.sin((k - 0.8) / 0.2 * Math.PI) * 18 }; } });
    await wait(620); chk(tk);
    SFX.pop();
    glowP(dest.x, dest.y - 30, 10, 110, '#ffffff', 0.45, 1);
    lightAt(dest.x, dest.y, 160, '#ffffff', 0.6, 0.9);
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.28; spawn({ kind: 'streak', c: ['#ffffff'], x: dest.x, y: dest.y - 24, vx: Math.cos(an) * 380, vy: Math.sin(an) * 280, life: 0.3, len: 30, ang: an }); }
    for (let i = 0; i < 14; i++) moteP(dest.x, dest.y - 24, '#ffffff', { vx: R(-200, 200), vy: R(-200, 100), drag: 3, life: 0.6 });
    ringP(dest.x, dest.y, 6, 70, '#ffffff', 0.4);
    flash('#ffffff', 0.12);
    const f = new Fighter(p, mon, anim);
    f.x = dest.x; f.y = dest.y; f.face = f.faceVis = p ? -1 : 1; f.pop = 0; f.white = 1; f.whiteCol = '#ffffff'; f.enterT = T;
    F[p] = f;
    playCry(mon);
    await tw(0.32, k => { f.pop = easeOut(k); f.white = 1 - k * 0.6; }); chk(tk);
    f.pop = 1; f.bump(-7);
    dust(f.x, f.y, 1.5);
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
    camPunch(f.cx, f.cy, last ? 0.12 : 0.07, last ? 1.2 : 0.6);
    later(() => Broadcast.captureThumb(last ? 5 : 3, last ? 'KNOCKOUT!' : `${mon.name.toUpperCase()} FAINTED!`), 40);
    for (const b of beams) if (b.owner === f) b.life = Math.min(b.life, b.age + 0.1);
    hud(p);
    const pinch = [0, 1].some(q => state.players[q].team.filter(x => x.hp > 0).length === 1);
    if (pinch) AudioFX.Music.setLevel(2);
    (async () => {
      // knocked up, crash down, then the trainer's ball recalls it in a red beam
      f.white = 1; f.whiteCol = '#ffffff'; f.dashing = false;
      await tw(0.28, k => { f.jz = Math.sin(k * Math.PI) * 26; });
      f.jz = 0; f.bump(10); dust(f.x, f.y, 1.8); shakeIt(4);
      await tw(0.4, k => { f.sink = k * 0.45; f.white = 0; }); chk(tk);
      await wait(250); chk(tk);
      await recallFx(f, tk);
      f.state = 'gone';
      if (F[p] === f) F[p] = null;
      if (!state.players[p].team.some(x => x.hp > 0)) return endBattle(false);
      await wait(700); chk(tk);
      if (ended) return;
      const pl = state.players[p];
      const foeNow = F[1 - p], idx = foeNow ? pl.team.reduce((b, m, i) => m.hp > 0 && (b < 0 || matchup(m, foeNow.mon) > matchup(pl.team[b], foeNow.mon)) ? i : b, -1) : bestMatchupIdx(p);
      pl.active = idx >= 0 ? idx : pl.team.findIndex(x => x.hp > 0);
      await sendOut(p, tk, false);
    })().catch(swallow);
  }
  // ---------------------------------------------------------------------
  //  Strategy: switching out of bad matchups, reactive Protect
  // ---------------------------------------------------------------------
  const SW = { n: [0, 0], t: [-99, -99] };
  // how well `mon` does against `foeMon`: its best hit, minus the worst hit it can take, plus health
  function matchup(mon, foeMon) {
    const best = (a, b) => Math.min(1.2, Math.max(0, ...a.moves.filter(mv => mv.ppLeft > 0).map(mv => expectedFrac(a, b, mv) * (mv.acc || 100) / 100)));
    const off = best(mon, foeMon), def = best(foeMon, mon);
    return off - def * 0.9 + (spd(mon) > spd(foeMon) ? 0.12 : 0) + mon.hp / mon.maxhp * 0.25;
  }
  function considerSwitch(f, foe) {
    const p = f.p, pl = state.players[p];
    if (f.forceMove != null || SW.n[p] >= 3 || T - SW.t[p] < 12 || T - (f.enterT || 0) < 5) return -1;
    if (pl.team.filter(m => m.hp > 0).length < 2) return -1;
    const cur = matchup(f.mon, foe.mon);
    let best = -1, bs = -Infinity;
    pl.team.forEach((m, i) => { if (i !== pl.active && m.hp > 0) { const v = matchup(m, foe.mon); if (v > bs) { bs = v; best = i; } } });
    if (best < 0) return -1;
    const gain = bs - cur, low = f.mon.hp / f.mon.maxhp;
    if ((gain > 0.45 && Math.random() < 0.55) || (gain > 0.25 && low < 0.3 && Math.random() < 0.3)) return best;
    return -1;
  }
  const canSwitchTo = (p, i) => { const pl = state.players[p]; return i !== pl.active && pl.team[i] && pl.team[i].hp > 0 && T - SW.t[p] > 3; };
  // the trainer's ball pulls the Pokémon back in a red beam
  async function recallFx(f, tk) {
    const tr = TR[f.p], hand = { x: tr.x + (f.p ? -12 : 12), y: tr.y - 80 };
    SFX.pop();
    beamFx({ ax: hand.x, ay: hand.y, bx: f.cx, by: f.cy, w: 7, c: ['#ffffff', '#ff9a9a', '#ff3a3a', '#a01818'], life: 0.6 });
    f.whiteCol = '#ff5a5a';
    await tw(0.5, k => { f.white = Math.min(1, k * 4); f.pop = 1 - easeIn(k); f.alpha = k > 0.75 ? (1 - k) * 4 : 1; }); chk(tk);
    glowP(f.cx, f.cy, 6, 50, '#ff5a5a', 0.3, 0.8);
    for (let i = 0; i < 8; i++) moteP(0, 0, '#ff8a8a', { life: 0.35, delay: i * 0.02, path: k => ({ x: f.cx + (hand.x - f.cx) * k, y: f.cy + (hand.y - f.cy) * k }) });
  }
  async function switchOut(f, idx, tk) {
    const p = f.p, pl = state.players[p], mon = f.mon;
    SW.n[p]++; SW.t[p] = T;
    f.state = 'recall'; f.vx = f.vy = 0;
    for (const b of beams) if (b.owner === f) b.life = Math.min(b.life, b.age + 0.1);
    trainerPose(p, 'throw', 1.1);
    speech(p, `${mon.name}, come back!`, 1300);
    pill(p, 'Switch!');
    await wait(220); chk(tk);
    await recallFx(f, tk);
    f.state = 'gone';
    if (F[p] === f) F[p] = null;
    mon.stages = blankStages(); mon.vol = {};
    pl.active = idx;
    hud(p);
    await wait(350); chk(tk);
    if (ended) return;
    await sendOut(p, tk, false);
  }
  // the defender reads a big incoming attack and throws up Protect in time
  function react(d, f, m) {
    if (!d || d.state !== 'idle' || d.busy || d.stuck || controllers[d.p] !== 'cpu' || T < (d.stagger || 0) || canMega(d.p)) return;
    const idx = d.mon.moves.findIndex(mv => mv.ppLeft > 0 && mv.ailment === 'protect');
    if (idx < 0 || (d.mon.vol.protectCount || 0) > 0) return;
    const frac = expectedFrac(f.mon, d.mon, m);
    if (frac < 0.22) return;
    const quick = clamp(0.55 + (spd(d.mon) / Math.max(1, spd(f.mon))) * 0.35, 0.4, 1.1);   // slow Pokémon react late
    const chance = clamp(0.2 + (frac - 0.22) * 1.3, 0, 0.88) * quick * (isContact(m) ? 0.85 : 1);
    if (Math.random() > chance) return;
    d.forceMove = idx; d.cd = 0;
  }
  SHAPE2.dizzy = (s, k) => {
    const f = s.f; if (!f || f.state !== 'idle') return;
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    for (let i = 0; i < 3; i++) { const an = T * 7 + i * 2.09; drawBm('star', ['#fff35a', '#ffffff', '#c99a00'], f.cx + Math.cos(an) * f.w * 0.35, f.top - 4 + Math.sin(an) * 7, 2); }
    ctx.globalAlpha = 1;
  };
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
    parts.length = beams.length = bolts.length = rings.length = projs.length = shapes.length = lightsFx.length = 0;
    F[0] = F[1] = null;
    fxEl.innerHTML = ''; hudEl.innerHTML = ''; fxEl.style.transform = '';
    camT = null; camZ = 1; dimA = dimTarget = 0;
    root.classList.add('hidden');
    World.skip3D = false; World.captureSource = null;
    if (rj) rj(new BattleAbort());
  }
  function battle(opts = {}) {
    stop();
    on = true; ended = false; running = false; token++;
    const tk = token;
    T = 0; clockT = 0; cheer = 0; shake = 0; flashA = 0; cinemaUntil = 0; SW.n = [0, 0]; SW.t = [-99, -99]; camX = VW / 2; camY = VH / 2; camZ = 1; camT = null;
    root.classList.remove('hidden');
    World.skip3D = true; World.captureSource = cv;
    resize(); layout(); camX = VW / 2; camY = VH / 2;
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
  return { battle, stop, get active() { return on; }, themeName: k => (THEMES[THEME_MAP[k]] || THEMES.plaza).name, _debug: () => ({ F, TR, parts, beams, T, clockT, running, VW, VH, field, SW }),
    // test hook: play one move's effect (no damage) with the battle paused
    _place: () => { running = false; F.forEach((f, p) => { if (f) { f.x = VW * (p ? 0.62 : 0.38); f.y = VH * 0.62; f.kx = f.ky = f.vx = f.vy = 0; f.face = p ? -1 : 1; f.jz = 0; f.rotA = 0; f.dashing = false; f.busy = false; } }); parts.length = 0; shapes.length = 0; },
    _testMove: async (id, visual) => { running = false; const f = F[0], d = F[1]; if (!f || !d) return 'no fighters'; const m = { id, ...MOVES[id], ppLeft: 9 }; const [style, variant] = classify(m).split(':'); let hit = false; const selfT = SELF_TARGETS.has(m.target) || id === 'rest'; await (SIG[id] || S[style] || S.generic)(f, selfT ? f : d, m, { miss: false }, () => { if (hit) return; hit = true; if (visual && m.cat !== 'status') { const pw = impactFx(d, m, 1, false); knock(d, f, pw * 0.4); } }, style === 'orb' && !SIG[id] ? variant === 'big' : variant); f.dashing = false; f.crouchT = 0; f.jz = 0; return hit ? (SIG[id] ? 'sig:' : '') + style : 'NOHIT ' + style; } };
})();
