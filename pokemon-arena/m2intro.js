// =====================================================================
//  Journey II's opening film: The Lost Days of Meridia, in pixel art. The eight lighthouses of Meridia, the
//  Lantern-folk sealing the door to the Echo, the grey world where lost moments are kept, Lantern Night in Tidemark,
//  the midnight the Tidemark light went out, Brassport and its free lanterns, the girl in grey under the canal, the
//  Great Lantern on Frostcrown and what sleeps beneath it; then Professor Okafor's welcome and the title.
//  Shot like Journey 1's film (jintro.js): letterbox bars with the narration as subtitles, a camera that pushes in,
//  tracks and punches on impacts, slow motion on the big moments, light rays, shockwaves, a vignette. The bars slide
//  away when Okafor speaks. It plays by itself; a tap / Space speeds it along, Skip / Esc ends it.
//  MIntro.play({ name, look, noScore }) -> Promise, resolved when the film ends or is skipped (noScore: the film's own
//  music stays off, its sound effects play: tools/make-trailer2.mjs lays its own score over it).
// =====================================================================
const MIntro = (() => {
  const VS = 180;                                      // the short side of the screen, in art pixels
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3), easeIn = k => Math.pow(clamp(k, 0, 1), 3);
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sfx = (k, ...a) => { try { AudioFX.SFX[k](...a); } catch (e) {} };
  const TAU = Math.PI * 2;
  // the eight Wardens' colours: the bands on their lighthouses
  const BANDS = ['#e04848', '#3c78d0', '#7a8a9a', '#3c9a58', '#b07a3a', '#e878a8', '#7a58b8', '#d85030'];
  const LANTERN = ['#ffb347', '#ffd27a', '#ff9a3d', '#ffe3a0'];
  const L = () => (typeof MMaps === 'object' && MMaps.L) || {};

  let root, cv, ctx, art, g, VW, VH, S, FLOOR, GY, scale, raf, last, resolveFn, opts;
  let sc, si, T, lineI, full, typed, readT, ending, endT, flash, flashCol, shake, st;
  let punch = 0, tsc = 1, slowT = 0, still = false, noScore = false;
  const P = [];                                        // particles of the current scene
  let stars = [], ridges = [], mons = {}, ui = {}, vign = null;

  // ---------------------------------------------------------------------
  //  Music: an original score, scheduled a little ahead on the synth. legend: a music-box waltz in D minor;
  //  mystery: low and ticking, for the city and what lies under it; welcome: warm, for the Professor
  // ---------------------------------------------------------------------
  const Score = (() => {
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const TR = {
      legend: { spb: 0.36, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
        lead: [74, 0, 77, 0, 81, 0, 0, 0, 79, 0, 77, 0, 76, 0, 0, 0, 77, 0, 74, 0, 72, 0, 0, 0, 73, 0, 76, 0, 81, 0, 0, 0], wave: 'sine', bell: [1, 0, 1, 0, 1, 0, 1, 0] },
      mystery: { spb: 0.42, chords: [[45, 48, 52], [41, 45, 48], [43, 46, 50], [40, 44, 47]],
        lead: [0, 0, 69, 0, 0, 0, 72, 71, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 65, 0, 0, 0, 67, 69, 0, 0, 0, 0, 68, 0, 0, 0], wave: 'triangle', bell: [0, 1, 0, 1, 0, 1, 0, 1], tick: true },
      welcome: { spb: 0.3, chords: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]],
        lead: [77, 0, 81, 84, 82, 81, 79, 77, 79, 0, 0, 76, 79, 81, 79, 0, 77, 0, 81, 86, 84, 82, 81, 79, 81, 0, 0, 82, 81, 79, 77, 0], wave: 'square', bell: [0, 0, 1, 0, 0, 0, 1, 0] }
    };
    let timer = null, tr = null, step = 0, next = 0;
    const syn = () => AudioFX.synth;
    function note(at, i) {
      const s = syn(), ch = tr.chords[Math.floor(i / 8) % 4], k = i % 8;
      if (k === 0) {
        ch.forEach(m => s.tone({ type: 'triangle', f: mtof(m), dur: tr.spb * 8, g: 0.04, a: 0.4, at }));
        s.tone({ type: 'sine', f: mtof(ch[0] - 12), dur: tr.spb * 7.5, g: 0.11, a: 0.05, at });
      }
      if (tr.bell[k]) s.tone({ type: 'sine', f: mtof(ch[(i >> 1) % 3] + 24), dur: 1.2, g: 0.03, a: 0.005, at });
      if (tr.tick) s.tone({ type: 'square', f: k % 2 ? 2200 : 1800, dur: 0.03, g: 0.012, at });   // a clock, always ticking
      const m = tr.lead[i % tr.lead.length];
      if (m) s.tone({ type: tr.wave, f: mtof(m), dur: tr.spb * 1.7, g: tr.wave === 'square' ? 0.028 : 0.065, a: 0.02, at });
    }
    function tick() {
      const s = syn(), now = s && s.now();
      if (!now || !tr) return;
      if (next < now) next = now + 0.05;
      while (next < now + 0.3) { note(next - now, step++); next += tr.spb; }
    }
    return {
      play(name) { tr = TR[name]; step = 0; next = 0; if (!timer) timer = setInterval(tick, 40); },
      fanfare() { const s = syn(); if (!s || !s.now()) return; [74, 77, 81, 86].forEach((m, i) => s.tone({ type: 'square', f: mtof(m), dur: 0.24, g: 0.05, at: i * 0.14 })); [62, 65, 69, 74].forEach(m => s.tone({ type: 'triangle', f: mtof(m), dur: 2.6, g: 0.06, a: 0.05, at: 0.56 })); },
      // a low swell under a big moment
      swell(dur = 1.2) { const s = syn(); if (!s || !s.now()) return; [38, 45, 50].forEach((m, i) => s.tone({ type: 'sawtooth', f: mtof(m), dur, g: 0.03, a: dur * 0.85, at: i * 0.02 })); },
      // the midnight bell
      bell(n = 1) { const s = syn(); if (!s || !s.now()) return; for (let i = 0; i < n; i++) { s.tone({ type: 'sine', f: mtof(62), dur: 2.4, g: 0.08, a: 0.005, at: i * 0.75 }); s.tone({ type: 'sine', f: mtof(74.1), dur: 1.6, g: 0.03, a: 0.005, at: i * 0.75 }); } },
      stop() { clearInterval(timer); timer = null; tr = null; }
    };
  })();

  // ---------------------------------------------------------------------
  //  The camera and the film's timing: a scene's cam(t) gives [zoom, x, y] (that point holds still while the
  //  view zooms around it) or [zoom, x, y, 1] (the view centres on it: tracking). On top: a punch on impacts.
  // ---------------------------------------------------------------------
  function slowmo(k, dur) { if (!still) { tsc = k; slowT = dur; } }
  function hit(f = 1, col = '#fff', sh = 5, pz = 0.08) { flash = Math.max(flash, f); flashCol = col; if (!still) { shake = Math.max(shake, sh); punch = Math.max(punch, pz); } }

  // ---------------------------------------------------------------------
  //  Drawing helpers (art pixels)
  // ---------------------------------------------------------------------
  function sky(top, bottom, y1 = VH) { const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  function disc(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, TAU); g.fill(); }
  function glow(x, y, r, c, a = 1) { if (r <= 0 || a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = Math.min(1, a); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
  function px(x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function sparkle(x, y, s, c) { px(x, y - s, c, 1, s * 2 + 1); px(x - s, y, c, s * 2 + 1, 1); }
  function drawStars(t, dim = 1, drift = 0, y1 = VH) {
    for (const s of stars) {
      const a = (0.45 + 0.55 * Math.sin(t * s.tw + s.ph)) * s.b * dim; if (a <= 0.05 || s.y * VH > y1) continue;
      g.globalAlpha = a; px((((s.x * VW - t * drift * s.b) % VW) + VW) % VW, s.y * VH, s.c);
    }
    g.globalAlpha = 1;
  }
  function ridge(r, col, base = r.base) { g.fillStyle = col; for (let x = 0; x < VW; x++) { const h = base + r.amp * (Math.sin(x * r.f1 + r.p1) * 0.6 + Math.sin(x * r.f2 + r.p2) * 0.4); g.fillRect(x, Math.round(h), 1, VH - Math.round(h)); } }
  const tints = new Map();
  function tint(img, col) {
    let m = tints.get(img); if (!m) tints.set(img, m = new Map());
    if (!m.has(col)) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); m.set(col, c); }
    return m.get(col);
  }
  // a pixel person (16x22 frame), feet at x, y; flip: drawn upside down (a reflection, feet up at y)
  function person(look, dir, x, y, s, col, flip = false) {
    if (!look) return;
    const f = JArt.person(look)[dir][0], img = col ? tint(f, col) : f;
    if (!flip) { g.drawImage(img, Math.round(x - 8 * s), Math.round(y - 21 * s), 16 * s, 22 * s); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(1, -1); g.drawImage(img, -8 * s, -21 * s, 16 * s, 22 * s); g.restore();
  }
  // a Pokémon sprite (PMD actor: its canvas holds the current animation frame), feet at x, y
  function mon(a, x, y, s, flip = false) {
    if (!a) return;
    const A = a.anim;
    if (!flip) { g.drawImage(A.frames[0].img, Math.round(x - A.foot[0] * s), Math.round(y - A.foot[1] * s), A.w * s, A.h * s); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(1, -1); g.drawImage(A.frames[0].img, -A.foot[0] * s, -A.foot[1] * s, A.w * s, A.h * s); g.restore();
  }
  // the same in one flat colour (a silhouette of this very frame)
  let flatCv = null;
  function monAs(a, x, y, s, col, alpha = 1) {
    if (!a || alpha <= 0) return;
    const A = a.anim, img = A.frames[0].img;
    if (!flatCv) flatCv = document.createElement('canvas');
    flatCv.width = img.width; flatCv.height = img.height;
    const x2 = flatCv.getContext('2d'); x2.drawImage(img, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = col; x2.fillRect(0, 0, img.width, img.height);
    g.globalAlpha = alpha; g.drawImage(flatCv, Math.round(x - A.foot[0] * s), Math.round(y - A.foot[1] * s), A.w * s, A.h * s); g.globalAlpha = 1;
  }
  const monFit = (a, h) => a ? clamp(Math.round(h / a.anim.bh), 1, 8) : 1;
  function burst(x, y, n, sp, cols, life = 0.8, grav = 0) { for (let i = 0; i < n; i++) { const an = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7); P.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life, t: 0, c: cols[i % cols.length], g: grav, s: 1 }); } }
  function dust(x, y, n, w, col) { for (let i = 0; i < n; i++) { const d = (Math.random() - 0.5) * 2; P.push({ x: x + d * w, y, vx: d * 40, vy: -10 - Math.random() * 25, g: 30, life: 0.7 + Math.random() * 0.5, t: 0, c: col, s: 1 + (Math.random() < 0.3) }); } }
  function stepParts(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.trail && Math.random() < 0.7) P.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.45, t: 0, c: p.c, s: 1 });
      if (p.life && p.t >= p.life) { P.splice(i, 1); continue; }
      g.globalAlpha = p.life ? 1 - p.t / p.life : 1;
      px(p.x, p.y, p.c, p.s, p.s);
      g.globalAlpha = 1;
    }
  }
  function rays(x, y, n, len, rgb, rot, a = 1, w = 0.09) {
    if (a <= 0.01 || len <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, len); gr.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < n; i++) { const an = rot + i * TAU / n, ww = w * (0.55 + 0.45 * Math.sin(i * 2.7 + 1)); g.moveTo(x, y); g.lineTo(x + Math.cos(an - ww) * len, y + Math.sin(an - ww) * len); g.lineTo(x + Math.cos(an + ww) * len, y + Math.sin(an + ww) * len); g.closePath(); }
    g.fill(); g.restore();
  }
  function ring(x, y, r, w, col, a) { if (a <= 0.01 || r <= 0) return; g.globalAlpha = Math.min(1, a); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  function shock(t, t0, x, y, R, col = '#fff', dur = 0.9, squash = 1) {
    const k = (t - t0) / dur; if (k < 0 || k >= 1) return;
    const e = easeOut(k); g.save(); g.translate(x, y); g.scale(1, squash); ring(0, 0, e * R, Math.max(1, 3 * (1 - k)), col, 1 - k); g.restore();
  }
  function flare(x, y, a, rgb = '200,220,255') {
    if (a <= 0.01) return;
    const gr = g.createLinearGradient(0, y, VW, y); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(clamp(x / VW, 0.01, 0.99), `rgba(${rgb},${Math.min(1, a)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, Math.round(y), VW, 1); g.globalAlpha = Math.min(1, a) * 0.4; g.fillRect(0, Math.round(y) - 1, VW, 3); g.restore();
    glow(x, y, 14, `rgba(${rgb},${Math.min(1, a)})`); disc(x, y, 1.5, `rgba(255,255,255,${Math.min(1, a)})`);
  }
  function clouds(t, y, speed, col, h, seed, n = 7) {
    const r = seeded(seed), span = VW + 140; g.fillStyle = col;
    for (let i = 0; i < n; i++) { const w = 40 + r() * 70, x0 = r() * span, yy = y + (r() - 0.5) * h, hh = h * (0.4 + r() * 0.5); const x = (((x0 - t * speed) % span) + span) % span - 70; g.beginPath(); g.ellipse(x, yy, w / 2, hh, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + w * 0.25, yy - hh * 0.5, w * 0.3, hh * 0.8, 0, 0, TAU); g.fill(); }
  }
  // falling snow (or rising ash): n flakes drifting
  function snow(t, n, col, seed, speed = 14, size = 1) {
    const r = seeded(seed); g.fillStyle = col;
    for (let i = 0; i < n; i++) { const sp = speed * (0.6 + r() * 0.8), x = ((r() * VW + Math.sin(t * 0.8 + i) * 8 - t * 5) % VW + VW) % VW, y = ((r() * VH + t * sp) % (VH + 4)) - 2; g.fillRect(Math.round(x), Math.round(y), size + (r() < 0.2), size); }
  }
  function motes(t, n, col, seed, rise = 5) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) { const x = ((r() * VW + Math.sin(t * 0.7 + i) * 6) % VW + VW) % VW, y = ((r() * VH - t * rise * (0.5 + r())) % VH + VH) % VH; g.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); px(x, y, col); }
    g.globalAlpha = 1;
  }
  function edges(rgb, a) {
    if (a <= 0.01) return;
    const gr = g.createRadialGradient(VW / 2, VH / 2, S * 0.35, VW / 2, VH / 2, Math.hypot(VW, VH) * 0.6); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${a})`);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  // drain the colour from everything drawn so far (k: 0 none, 1 all): the Echo's grey
  function desat(k) { if (k <= 0.01) return; g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = Math.min(1, k); g.fillStyle = '#808080'; g.fillRect(0, 0, VW, VH); g.restore(); }

  // ---- Meridia's things
  // the sea from y0 down, with glints drifting on it
  function sea(y0, t, top, bot, glint = '#9fc4ff', seed = 3, n = 70) {
    const gr = g.createLinearGradient(0, y0, 0, VH); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, Math.round(y0), VW, VH - Math.round(y0));
    const r = seeded(seed), dh = VH - y0;
    for (let i = 0; i < n; i++) {
      const u = Math.pow(r(), 1.5), yy = y0 + 1 + u * dh, w = 2 + r() * 6 * (1 + u * 2), x = ((r() * (VW + 20) + t * (1.5 + r() * 3)) % (VW + 20)) - 10;
      g.globalAlpha = 0.1 + 0.22 * Math.abs(Math.sin(t * 1.3 + i * 1.7)); px(x, yy, glint, Math.round(w), 1);
    }
    g.globalAlpha = 1;
  }
  // a column of broken light on the water under a bright thing (the moon, a lamp)
  function shimmer(x, y0, y1, w, col, t, a = 1) {
    for (let y = Math.round(y0); y < y1; y += 2) { const k = (y - y0) / Math.max(1, y1 - y0), ww = w * (0.4 + k) * (0.6 + 0.4 * Math.sin(y * 0.9 + t * 4)); g.globalAlpha = a * (1 - k) * (0.5 + 0.5 * Math.sin(y * 1.7 + t * 6)); px(x - ww / 2 + Math.sin(y * 0.5 + t * 2) * 1.5, y, col, Math.max(1, Math.round(ww)), 1); }
    g.globalAlpha = 1;
  }
  // a lighthouse, base at (x, y), h tall, striped in its Warden's colour; lamp 0-1. Returns where the lamp is
  function lighthouse(x, y, h, band, lamp = 1, dark = 0) {
    const w0 = Math.max(3, h * 0.24), w1 = Math.max(2, h * 0.15), top = y - h;
    for (let yy = 0; yy < h; yy++) {
      const k = yy / h, w = lerp(w0, w1, k), Y = Math.round(y - yy - 1), x0 = Math.round(x - w / 2), ww = Math.max(1, Math.round(w));
      g.fillStyle = Math.floor(k * 6) % 2 ? band : '#ece6da'; g.fillRect(x0, Y, ww, 1);
      g.fillStyle = 'rgba(10,8,30,.35)'; g.fillRect(x0 + Math.round(ww * 0.62), Y, ww - Math.round(ww * 0.62), 1);   // the shaded side
    }
    if (dark) { g.globalAlpha = dark; g.fillStyle = '#0c0a1c'; g.fillRect(Math.round(x - w0 / 2) - 1, Math.round(top), Math.round(w0) + 2, Math.round(h)); g.globalAlpha = 1; }
    const gw = Math.round(w1 + Math.max(2, h * 0.09)), lh = Math.max(2, Math.round(h * 0.11)), lw = Math.max(1, Math.round(w1 * 0.8));
    g.fillStyle = '#2a2438'; g.fillRect(Math.round(x - gw / 2), Math.round(top), gw, Math.max(1, Math.round(h * 0.03)));
    g.fillStyle = lamp > 0.05 ? `rgb(${lerp(70, 255, lamp) | 0},${lerp(70, 244, lamp) | 0},${lerp(84, 200, lamp) | 0})` : '#3a3a4a';
    g.fillRect(Math.round(x - lw / 2), Math.round(top - lh), lw, lh);
    g.fillStyle = '#2a2438'; g.beginPath(); g.moveTo(Math.round(x - lw / 2) - 1, Math.round(top - lh)); g.lineTo(Math.round(x + lw / 2) + 1, Math.round(top - lh)); g.lineTo(x, Math.round(top - lh - Math.max(2, lh * 0.9))); g.closePath(); g.fill();
    const ly = top - lh / 2;
    if (lamp > 0.02) glow(x, ly, h * 0.45 * lamp + 3, `rgba(255,232,170,${0.85 * lamp})`);
    return [x, ly];
  }
  // a lighthouse's turning beam, seen from the side: it swings left and right, brightest as it faces us
  function sweep(lx, ly, t, speed, ph, len, a = 1, rgb = '255,236,180') {
    if (a <= 0.01) return;
    const an = t * speed + ph, c = Math.cos(an), s = Math.sin(an), L2 = len * Math.abs(c), d = c >= 0 ? 1 : -1;
    if (L2 > 2) {
      const ex = lx + d * L2, spread = 2 + L2 * 0.13, gr = g.createLinearGradient(lx, ly, ex, ly);
      gr.addColorStop(0, `rgba(${rgb},${0.6 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.moveTo(lx, ly - 1); g.lineTo(ex, ly - spread); g.lineTo(ex, ly + spread * 0.6); g.lineTo(lx, ly + 1); g.closePath(); g.fill(); g.restore();
    }
    if (s > 0.85) flare(lx, ly, (s - 0.85) * 6 * a, rgb);
  }
  // a paper lantern (s: its half-width); grey: one the Echo has drained
  function paperLantern(x, y, s, a = 1, col = LANTERN[0], grey = 0) {
    if (a <= 0.01) return;
    if (grey < 1) glow(x, y, 5 * s + 2, `rgba(255,170,70,${0.5 * a * (1 - grey)})`);
    g.globalAlpha = a; g.fillStyle = grey ? `rgb(${lerp(parseInt(col.slice(1, 3), 16), 150, grey) | 0},${lerp(parseInt(col.slice(3, 5), 16), 150, grey) | 0},${lerp(parseInt(col.slice(5, 7), 16), 158, grey) | 0})` : col;
    const w = Math.max(1, Math.round(2 * s)), h = Math.max(2, Math.round(2.5 * s));
    g.fillRect(Math.round(x - s), Math.round(y - h / 2), w, h);
    g.fillStyle = grey ? '#d8d8de' : '#fff2c8'; g.fillRect(Math.round(x - s), Math.round(y - h / 2), w, 1);
    g.globalAlpha = 1;
  }
  // a row of houses (a village or city skyline) from x0 to x1 standing on y; lit windows
  function houses(x0, x1, y, seed, col, win, lit = 0.6, t = 0, tall = 1) {
    const r = seeded(seed);
    for (let x = x0; x < x1;) {
      const w = Math.round(10 + r() * 12), h = Math.round((8 + r() * 10) * tall), roof = r() < 0.75;
      g.fillStyle = col; g.fillRect(x, y - h, w, h);
      if (roof) { g.beginPath(); g.moveTo(x - 1, y - h); g.lineTo(x + w + 1, y - h); g.lineTo(x + w / 2, y - h - Math.round(w * 0.45)); g.closePath(); g.fill(); }
      for (let wy = y - h + 3; wy < y - 3; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (r() < lit) { const f = 0.75 + 0.25 * Math.sin(t * 2 + wx * 0.7 + wy); g.globalAlpha = f; px(wx, wy, win, 2, 2); g.globalAlpha = 1; }
      x += w + Math.round(r() * 3);
    }
  }
  // a turning gear (Brassport's skyline)
  function gear(x, y, r, rot, col) {
    g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    for (let i = 0; i < 8; i++) { const an = rot + i * TAU / 8; g.save(); g.translate(x + Math.cos(an) * r, y + Math.sin(an) * r); g.rotate(an); g.fillRect(-1, -1.5, 2.5, 3); g.restore(); }
    disc(x, y, Math.max(1, r * 0.35), '#140c08');
  }
  // a lost moment, kept in the Echo: a little framed picture turning slowly as it drifts
  const PANES = [
    ['#e8a070', '#7a5a8a', 'sun'], ['#a8c8e8', '#6a9a5a', 'pair'], ['#f0d8a0', '#a8705a', 'cake'],
    ['#7090c0', '#2a4a7a', 'light'], ['#d8a8c8', '#8a7aa8', 'pair'], ['#c0d8a0', '#5a8a6a', 'sun']];
  function pane(x, y, w, h, rot, kind, a = 1) {
    const sx = Math.abs(Math.cos(rot)); if (sx < 0.06 || a <= 0.01) return;
    const [top, ground, icon] = PANES[kind % PANES.length];
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(sx, 1); g.globalAlpha = a;
    g.fillStyle = '#e6e4ec'; g.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
    g.fillStyle = top; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = ground; g.fillRect(-w / 2, h * 0.15, w, h * 0.35);
    if (icon === 'sun') disc(w * 0.15, -h * 0.05, h * 0.18, '#fff0c0');
    if (icon === 'pair') { g.fillStyle = '#3a2a3a'; g.fillRect(-w * 0.2, -h * 0.12, 2, h * 0.3); g.fillRect(w * 0.08, -h * 0.05, 2, h * 0.22); disc(-w * 0.2 + 1, -h * 0.17, 1.4, '#3a2a3a'); disc(w * 0.08 + 1, -h * 0.1, 1.2, '#3a2a3a'); }
    if (icon === 'cake') { g.fillStyle = '#fff'; g.fillRect(-w * 0.22, 0, w * 0.44, h * 0.15); g.fillStyle = '#e84a6a'; g.fillRect(-0.5, -h * 0.15, 1, h * 0.15); disc(0, -h * 0.2, 1, '#ffd84a'); }
    if (icon === 'light') { g.fillStyle = '#f0ece0'; g.fillRect(-1.5, -h * 0.3, 3, h * 0.45); disc(0, -h * 0.32, 2, '#ffe9a8'); }
    g.restore(); g.globalAlpha = 1;
  }
  // a stopped clock: almost midnight, for ever
  function clock(x, y, r, t, a = 1) {
    g.globalAlpha = a; disc(x, y, r + 1, '#5a5a66'); disc(x, y, r, '#dcdce4');
    for (let i = 0; i < 12; i++) { const an = i * TAU / 12; px(x + Math.cos(an) * (r - 2), y + Math.sin(an) * (r - 2), '#5a5a66'); }
    const tr = Math.sin(t * 40) * 0.015;                 // it trembles, but never moves on
    g.strokeStyle = '#2a2a34'; g.lineWidth = 1; g.beginPath();
    g.moveTo(x, y); g.lineTo(x + Math.cos(-Math.PI / 2 - 0.05 + tr) * r * 0.55, y + Math.sin(-Math.PI / 2 - 0.05 + tr) * r * 0.55);
    g.moveTo(x, y); g.lineTo(x + Math.cos(-Math.PI / 2 - 0.1 - tr) * r * 0.85, y + Math.sin(-Math.PI / 2 - 0.1 - tr) * r * 0.85); g.stroke();
    g.globalAlpha = 1;
  }
  // the rift: a tear in the night with the grey of the Echo behind it (open 0-1)
  function rift(x, y, h, open, t) {
    if (open <= 0.01) return;
    const w = h * 0.28 * open;
    glow(x, y, h * 0.9, `rgba(200,200,220,${0.35 * open})`);
    g.save(); g.beginPath(); g.ellipse(x, y, w, h / 2, 0, 0, TAU); g.clip();
    g.fillStyle = '#8a8a96'; g.fillRect(x - w, y - h / 2, w * 2, h);
    const r = seeded(Math.floor(t * 12) + 5);
    for (let i = 0; i < 70; i++) px(x - w + r() * w * 2, y - h / 2 + r() * h, r() < 0.5 ? '#c8c8d2' : '#5a5a66');   // static
    for (let i = 0; i < 4; i++) pane(x + Math.sin(t * 0.6 + i * 1.6) * w * 0.5, y - h * 0.35 + ((t * 6 + i * h * 0.25) % h), 8, 6, t + i, i, 0.7);
    g.restore();
    g.strokeStyle = `rgba(240,240,255,${0.6 + 0.4 * Math.sin(t * 9)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, w, h / 2, 0, 0, TAU); g.stroke();
  }

  // ---------------------------------------------------------------------
  //  The scenes. draw(t, dt, st): t the scene's time, st its own state (fresh each time it starts).
  //  onLine(i, st): a narration line comes up (the big beats hang off the words, whatever the reading speed)
  // ---------------------------------------------------------------------
  const HY = () => Math.round(FLOOR * 0.62);           // the horizon over the sea
  const SCENES = [
    { id: 'coast', dur: 7, music: 'legend', lines: ['Far across the sea lies Meridia...', '...a land of eight great lighthouses, watching over the waves.'],
      start() { sfx('rumble', 2); },
      // a slow pan along the coast, from the near light to the far ones
      cam: t => [1.28 - 0.1 * ease(t / 9), lerp(VW * 0.3, VW * 0.66, ease(t / 9)), VH * 0.5, 1],
      draw(t, dt) {
        const hy = HY();
        sky('#04081c', '#1c3462', hy); drawStars(t, ease(t / 1.5), 1.5, hy);
        glow(VW * 0.82, VH * 0.16, S * 0.35, 'rgba(200,220,255,.25)'); disc(VW * 0.82, VH * 0.16, 7, '#eef2ff'); disc(VW * 0.82 - 2, VH * 0.16 - 1, 6, '#dde4f8');
        g.globalAlpha = 0.5; clouds(t, hy * 0.35, 3, '#1a2a52', 5, 7, 5); g.globalAlpha = 1;
        ridge(ridges[0], '#16224a', hy - 6); ridge(ridges[1], '#101a3a', hy - 2);
        sea(hy, t, '#0e2350', '#030714');
        shimmer(VW * 0.82, hy + 1, VH, 9, '#cdd8ff', t, 0.7);
        // the eight lights: one near on its cliff, seven along the far shore
        const far = [[0.3, 13], [0.42, 10], [0.52, 12], [0.63, 9], [0.74, 11], [0.86, 8], [0.95, 10]];
        far.forEach(([k, h], i) => {
          const x = VW * k, y = hy - 1 - (i % 2);
          g.fillStyle = '#0b1230'; g.fillRect(Math.round(x - 8), y, 16, 2);
          const [lx, ly] = lighthouse(x, y, h, BANDS[i + 1], 0.9 + 0.1 * Math.sin(t * 3 + i));
          sweep(lx, ly, t, 0.9 + i * 0.07, i * 1.3, 40 + h * 2, 0.7);
          shimmer(x, hy + 2, hy + 22, 3, '#ffe9b0', t + i, 0.5);
        });
        // a Lapras swimming the strait
        const lp = mons.lapras;
        if (lp) {
          lp.drive(dt, { moving: true, vx: -30, vy: 0, face: -1 });
          const x = lerp(VW * 0.8, VW * 0.45, t / 10), y = hy + 34, s = 1;
          g.save(); g.beginPath(); g.rect(0, 0, VW, y - 2); g.clip(); mon(lp, x, y + 2, s); g.restore();
          g.globalAlpha = 0.5; px(x - 10, y - 2, '#9fc4ff', 20, 1); px(x + 8 + Math.sin(t * 4) * 2, y - 1, '#9fc4ff', 10, 1); g.globalAlpha = 1;
        }
        // the near cliff and its light
        g.fillStyle = '#070b1e'; g.beginPath(); g.moveTo(0, VH); g.lineTo(0, FLOOR - 26); g.lineTo(VW * 0.1, FLOOR - 30); g.lineTo(VW * 0.17, FLOOR - 22); g.lineTo(VW * 0.24, FLOOR + 4); g.lineTo(VW * 0.26, VH); g.closePath(); g.fill();
        const [lx, ly] = lighthouse(VW * 0.1, FLOOR - 29, 54, BANDS[0], 1);
        sweep(lx, ly, t, 0.8, 0.4, S * 0.9, 1);
        motes(t, 10, '#b8c8ff', 3, 2);
      } },

    { id: 'lanternfolk', dur: 7, lines: ['Long ago, the Lantern-folk built those lights for a reason.', 'Their beams kept a door shut: the door to the Echo.'],
      onLine(i, s) { if (i === 1) { s.sealT = T; sfx('whoosh'); Score.swell(2); } },
      // up at the tear in the sky, easing back as the beams meet
      cam: (t, st) => { const k = st.sealT != null ? ease((t - st.sealT) / 2.4) : 0; return [lerp(1.25, 1.06, k) + 0.04 * ease(t / 3), VW / 2, lerp(VH * 0.4, VH * 0.5, k)]; },
      draw(t, dt, st) {
        const hy = HY(), rx = VW / 2, ry = VH * 0.38, since = st.sealT != null ? t - st.sealT : -1;
        sky('#120a24', '#3a2350', hy); drawStars(t, 0.6, 0, hy);
        // the rift: wide open, then sealed by the beams
        const open = since < 0 ? 0.85 + 0.15 * Math.sin(t * 2) : Math.max(0, 1 - easeIn((since - 0.6) / 1.4));
        // grey motes pulled in toward it
        if (open > 0.1 && Math.random() < 0.7) { const an = Math.random() * TAU, d = S * (0.4 + Math.random() * 0.3); P.push({ x: rx + Math.cos(an) * d, y: ry + Math.sin(an) * d * 0.6, vx: -Math.cos(an) * d * 0.9, vy: -Math.sin(an) * d * 0.55, life: 1, t: 0, c: '#b8b8c8', s: 1 }); }
        rift(rx, ry, S * 0.36, open, t);
        ridge(ridges[1], '#24163a', hy - 4);
        sea(hy, t, '#1c1236', '#08050f', '#a890d8', 5, 40);
        // the eight lights on the shore send their beams to the tear
        for (let i = 0; i < 8; i++) {
          const x = VW * (0.06 + i * 0.125), y = hy - 1, [lx, ly] = lighthouse(x, y, 10 + (i % 3) * 2, BANDS[i], since >= 0 ? 1 : 0.5);
          if (since >= 0) {
            const k = easeOut(since / 0.6), ex = lerp(lx, rx, k), ey = lerp(ly, ry, k);
            g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,236,180,${0.55 * Math.max(0.25, open)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(ex, ey); g.stroke(); g.restore();
            glow(ex, ey, 6, 'rgba(255,240,200,.8)');
          }
        }
        // the Lantern-folk, robed, each with a lantern held high
        const ps = 2;
        for (let i = 0; i < 5; i++) {
          const x = VW * (0.18 + i * 0.16), y = FLOOR - 2 + (i % 2) * 2;
          person(L().oldman || L().man, 'up', x, y, ps, '#2a1a3c');
          const ly = y - 20 * ps - 2 + Math.sin(t * 2 + i) * 0.6;
          glow(x + 5 * ps, ly, 16, 'rgba(255,170,80,.25)');
          paperLantern(x + 5 * ps, ly, 1.6, 1, LANTERN[i % 4]);
        }
        if (since >= 2 && !st.sealed) { st.sealed = true; hit(1, '#fff', 7, 0.12); slowmo(0.25, 0.5); sfx('quake'); burst(rx, ry, 60, 110, ['#fff', '#ffe9a8', '#c8c8d8'], 1); }
        if (st.sealed) {
          const u = since - 2;
          rays(rx, ry, 16, S * 0.8, '255,236,190', u * 0.4, Math.max(0, 0.7 - u * 0.3));
          shock(t, st.sealT + 2, rx, ry, S * 0.8, '#fff', 1);
          // the seal left behind: eight points of light in a ring
          for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + u * 0.3; sparkle(rx + Math.cos(an) * 14, ry + Math.sin(an) * 14, Math.sin(t * 5 + i) > 0 ? 1 : 0, '#ffe9a8'); }
        }
        stepParts(dt);
      } },

    { id: 'echo', dur: 7, lines: ['A grey and silent world, where every lost moment is kept.', 'Nothing there ever changes. And nothing is ever let go.'],
      start(s) { const r = seeded(17); s.panes = Array.from({ length: 16 }, (_, i) => ({ x: r(), y: r(), sp: 3 + r() * 5, rot: r() * 6, rs: 0.3 + r() * 0.6, w: 10 + Math.round(r() * 10), k: i })); sfx('rumble', 1.5); },
      // drifting up through it, slowly
      cam: t => [1.12 + 0.08 * ease(t / 8), VW / 2, lerp(VH * 0.62, VH * 0.4, ease(t / 9))],
      draw(t, dt, st) {
        const hy = HY();
        sky('#2a2a34', '#6a6a76', hy);
        // the same coast, still and grey: the lights are dark here
        ridge(ridges[0], '#4a4a56', hy - 6); ridge(ridges[1], '#3c3c48', hy - 2);
        g.fillStyle = '#54545e'; g.fillRect(0, hy, VW, VH - hy);
        for (let i = 0; i < 26; i++) px((i * 53) % VW, hy + 3 + ((i * 7) % (VH - hy - 4)), '#6a6a74', 6 + (i % 4) * 3, 1);   // waves that never move
        for (let i = 0; i < 6; i++) lighthouse(VW * (0.12 + i * 0.16), hy - 1, 10 + (i % 2) * 3, BANDS[i], 0);
        // a splash, stopped in the air
        for (let i = 0; i < 18; i++) { const an = -Math.PI * (0.15 + 0.7 * (i / 18)), d = 6 + (i % 5) * 3; px(VW * 0.7 + Math.cos(an) * d, hy + 10 + Math.sin(an) * d * 1.3, '#b8b8c2'); }
        clock(VW * 0.5, VH * 0.36, 12, t, 0.9);
        desat(1);
        // what is kept here: moments, still faintly coloured, drifting up
        for (const p of st.panes) {
          const y = (((p.y * (VH + 30) - t * p.sp) % (VH + 30)) + VH + 30) % (VH + 30) - 15, x = p.x * VW + Math.sin(t * 0.5 + p.k) * 6;
          glow(x, y, p.w, 'rgba(220,220,240,.18)');
          pane(x, y, p.w, Math.round(p.w * 0.75), p.rot + t * p.rs, p.k, 0.75);
        }
        motes(t, 30, '#d8d8e4', 11, -4);               // the dust falls up
        edges('20,20,28', 0.45);
      } },

    { id: 'festival', dur: 7, lines: ['Every year, on Lantern Night, the people send paper lanterns into the sky...', '...one for every day they want to remember.'],
      start(s) { s.lan = []; s.spawn = 0; sfx('glint'); },
      cam: t => [1.2 - 0.12 * ease(t / 9), VW * 0.45, lerp(FLOOR * 0.85, FLOOR * 0.55, ease(t / 9))],
      draw(t, dt, st) {
        const hy = HY(), wy = FLOOR - 6;
        sky('#0c0a2a', '#4a2a5a', hy); drawStars(t, 0.7, 0, hy);
        glow(VW * 0.5, hy, S * 0.7, 'rgba(255,140,80,.18)');
        // Tidemark on its hill, its windows lit, string lights over the square
        g.fillStyle = '#140c24'; g.beginPath(); g.moveTo(0, wy); g.lineTo(0, hy - 10); g.quadraticCurveTo(VW * 0.25, hy - 22, VW * 0.55, wy - 6); g.lineTo(VW * 0.55, wy); g.closePath(); g.fill();
        houses(4, VW * 0.5, wy - 4, 23, '#1c1230', '#ffcf7a', 0.7, t);
        for (let i = 0; i < 3; i++) { const x0 = VW * (0.05 + i * 0.15), x1 = x0 + VW * 0.13; for (let k = 0; k <= 10; k++) { const u = k / 10, x = lerp(x0, x1, u), y = wy - 20 + Math.sin(u * Math.PI) * 5 - i * 2; px(x, y, (k + i) % 3 ? '#ffd27a' : '#ff8a6a'); } }
        // the harbour, and the Tidemark light at the end of the pier
        sea(wy, t, '#1a1438', '#06040e', '#ffb8a0', 9, 40);
        g.fillStyle = '#2a1a1a'; g.fillRect(VW * 0.55, wy - 2, VW * 0.36, 3); for (let x = VW * 0.56; x < VW * 0.9; x += 7) g.fillRect(Math.round(x), wy, 1, 6);
        const [lx, ly] = lighthouse(VW * 0.88, wy - 2, 48, BANDS[0], 1);
        sweep(lx, ly, t, 0.7, 2, S * 0.8, 0.9);
        shimmer(VW * 0.88, wy + 2, VH, 7, '#ffe3a8', t, 0.7);
        // the crowd on the pier, lanterns in their hands
        const looks = ['man', 'woman', 'kid', 'oldlady', 'sailor', 'fisher', 'kid', 'woman'].map(k => L()[k]).filter(Boolean);
        looks.forEach((lk, i) => { const x = VW * (0.585 + i * 0.038), y = wy - 2 + (i % 2); person(lk, 'up', x, y, 1); g.globalAlpha = 0.6; person(lk, 'up', x, y, 1, '#1a0e2a'); g.globalAlpha = 1; });
        // the lanterns rising, a few at a time, over the whole village
        st.spawn -= dt;
        if (st.spawn <= 0) { st.spawn = 0.12; st.lan.push({ x: VW * (0.05 + Math.random() * 0.85), y: wy - 6 - Math.random() * 10, vy: -(5 + Math.random() * 7), ph: Math.random() * 6, s: Math.random() < 0.3 ? 2 : 1.3, c: LANTERN[Math.floor(Math.random() * 4)] }); }
        for (let i = st.lan.length - 1; i >= 0; i--) {
          const l = st.lan[i]; l.y += l.vy * dt; if (l.y < -10) { st.lan.splice(i, 1); continue; }
          const x = l.x + Math.sin(t * 0.9 + l.ph) * 3;
          paperLantern(x, l.y, l.s * (0.7 + 0.3 * clamp((l.y) / FLOOR, 0, 1)), 1, l.c);
          if (l.y > hy - 30) { g.globalAlpha = 0.35; px(x, wy + (wy - l.y) * 0.25 + 2, '#ffb86a', 2, 1); g.globalAlpha = 1; }   // their glints in the water
        }
        motes(t, 12, '#ffd8a0', 4, 3);
      } },

    { id: 'midnight', dur: 8, lines: ['But this year, at the stroke of midnight...', '...the Tidemark light flickered, and went out.', 'And when the sun came up, a whole day had vanished.'],
      start(s) { const r = seeded(31); s.lan = Array.from({ length: 40 }, () => ({ x: r() * VW, y: r() * FLOOR * 0.75, s: 0.9 + r() * 0.9, c: LANTERN[Math.floor(r() * 4)], ph: r() * 6, v: 6 + r() * 10 })); Score.bell(3); },
      onLine(i, s) {
        if (i === 1) { s.outT = T; Score.stop(); }
        if (i === 2) { s.dawnT = T; sfx('debuff'); }
      },
      // close on the lamp room, and back as the grey spreads
      cam: (t, st) => { const k = st.outT != null ? ease((t - st.outT - 1.4) / 2.5) : 0; return [lerp(1.5 + 0.1 * ease(t / 4), 1.05, k), VW / 2, lerp(VH * 0.36, VH * 0.5, k)]; },
      draw(t, dt, st) {
        const hy = HY(), wy = FLOOR - 6, out = st.outT != null ? t - st.outT : -1, dawn = st.dawnT != null ? ease((t - st.dawnT) / 2.5) : 0;
        // the lamp: blazing brighter and brighter, then the flicker, then dark
        let lamp = 1;
        if (out < 0) lamp = 1;
        else if (out < 1.3) { const on = Math.sin(out * 40) + Math.sin(out * 23) > -0.6 + out * 1.4; lamp = on ? 1 - out * 0.4 : 0.1; if (on !== st.on) { st.on = on; if (!on) sfx('zap'); } }
        else { lamp = 0; if (!st.dark) { st.dark = true; hit(0.9, '#000', 3, 0.04); sfx('rumble', 1.6); } }
        const top = `rgb(${lerp(10, 150, dawn) | 0},${lerp(10, 150, dawn) | 0},${lerp(36, 160, dawn) | 0})`, bot = `rgb(${lerp(40, 196, dawn) | 0},${lerp(30, 192, dawn) | 0},${lerp(70, 196, dawn) | 0})`;
        sky(top, bot, hy); drawStars(t, 1 - dawn, 0, hy);
        houses(0, VW * 0.4, wy, 23, '#1c1230', '#ffcf7a', out < 1.3 ? 0.6 : 0.1, t);
        sea(wy, t, '#16122e', '#06040e', '#c8b8e8', 9, 40);
        const x = VW / 2, base = wy + 2, h = Math.round(FLOOR * 0.56), [lx, ly] = lighthouse(x, base, h, BANDS[0], lamp);
        if (lamp > 0.5 && out < 0) { rays(lx, ly, 14, S * (0.55 + 0.25 * ease(t / 4)), '255,236,180', t * 0.3, 0.35 + 0.25 * ease(t / 4)); sweep(lx, ly, t, 0.8, 0, S * 1.1, 1); }
        if (lamp > 0.5 && out >= 0) sweep(lx, ly, t, 0.8, 0, S * 1.1, lamp);
        // the lanterns: bright, then drained of colour and drawn away east, on the wind
        for (const l of st.lan) {
          const pull = out > 1.3 ? easeIn((out - 1.3) / 3) : 0, gx = l.x + pull * VW * 1.1 * (0.6 + l.s * 0.3), gy = l.y + Math.sin(t + l.ph) * 2 - pull * 10;
          paperLantern(gx, gy, l.s, 1 - pull * 0.6, l.c, clamp((out - 1.2) * 1.5, 0, 1));
          if (pull > 0.05 && Math.random() < 0.15) P.push({ x: gx, y: gy, vx: 30, vy: -3, life: 0.6, t: 0, c: '#b0b0bc', s: 1 });
        }
        stepParts(dt);
        // the grey creeps in after the light dies
        if (out > 1.3) desat(clamp((out - 1.3) / 2.2, 0, 0.92));
        if (out > 1.3 && dawn < 1) edges('10,10,20', 0.5 * (1 - dawn));
      } },

    { id: 'brassport', dur: 7, music: 'mystery', lines: ['In the shining city of Brassport, every home has a free Lumen lantern.', 'No crime. No sorrow... and nobody can remember why.'],
      start(s) {
        const r = seeded(41); s.win = [];
        for (let i = 0; i < 90; i++) s.win.push({ x: r() * VW, y: FLOOR * (0.45 + r() * 0.4), ph: r() * 6, sp: 0.25 + r() * 0.3 });
      },
      onLine(i, s) { if (i === 1) { s.pushT = T; Score.swell(3); } },
      // across the canal at the tower; push in on its crown
      cam: (t, st) => { const k = st.pushT != null ? ease((t - st.pushT) / 3.5) : 0; return [lerp(1.06, 1.6, k), VW / 2, lerp(VH * 0.55, VH * 0.3, k)]; },
      draw(t, dt, st) {
        const wy = FLOOR - 10, tx = VW / 2, ttop = VH * 0.27;
        sky('#0e0a14', '#4a3020', wy); drawStars(t, 0.3, 0, wy);
        glow(tx, wy - 20, S * 0.8, 'rgba(255,180,90,.2)');
        // the far skyline, the gears, the near skyline
        houses(-8, VW + 8, wy - 14, 51, '#24160e', '#c89a5a', 0.4, t, 2.2);
        gear(VW * 0.2, wy - 52, 7, t * 0.6, '#3a2814'); gear(VW * 0.25, wy - 44, 4, -t * 1.05, '#3a2814'); gear(VW * 0.8, wy - 48, 6, -t * 0.5, '#3a2814');
        // the Lumen sky tower, a crown of gold light at the top
        g.fillStyle = '#2e1e12'; g.beginPath(); g.moveTo(tx - 14, wy); g.lineTo(tx - 6, ttop + 18); g.lineTo(tx + 6, ttop + 18); g.lineTo(tx + 14, wy); g.closePath(); g.fill();
        g.fillStyle = '#3e2a16'; g.fillRect(tx - 11, ttop + 14, 22, 3); g.fillRect(tx - 2, ttop + 2, 4, 12);
        for (let y = ttop + 24; y < wy - 4; y += 6) { g.globalAlpha = 0.8; px(tx - 2, y, '#ffe0a0', 4, 2); g.globalAlpha = 1; }
        const cr = 0.8 + 0.2 * Math.sin(t * 2);
        glow(tx, ttop, 26 * cr, 'rgba(255,214,120,.8)'); ring(tx, ttop, 7 + Math.sin(t * 3) * 1.5, 1, '#ffe9a8', 0.8); disc(tx, ttop, 3, '#fff6d8');
        // a man in white on the tower's balcony, looking out over his city
        person(L().cassius, 'down', tx + 6, ttop + 14, 1);
        houses(-4, VW * 0.42, wy, 52, '#3a2614', '#ffd98a', 0.75, t, 1.6); houses(VW * 0.58, VW + 6, wy, 53, '#3a2614', '#ffd98a', 0.75, t, 1.6);
        // every window gives up a thread of light, and every thread runs to the crown
        for (const w of st.win) {
          const u = ((t * w.sp + w.ph) % 1), cx = lerp(w.x, tx, u), cy = lerp(w.y, ttop, u) - Math.sin(u * Math.PI) * 18;
          g.globalAlpha = Math.sin(u * Math.PI); glow(cx, cy, 3, 'rgba(190,225,255,.6)'); px(cx, cy, '#e8f4ff'); g.globalAlpha = 1;
        }
        // the canal, the city upside down in it
        sea(wy, t, '#2a1a10', '#08050a', '#ffd08a', 13, 50);
        shimmer(tx, wy + 1, VH, 8, '#ffd98a', t, 0.6);
        for (let i = 0; i < 10; i++) shimmer(VW * (0.05 + i * 0.1), wy + 1, wy + 14, 2, '#ffd98a', t + i, 0.45);
        motes(t, 14, '#ffe0a0', 6, 2);
      } },

    { id: 'nell', dur: 7, lines: ['Someone is stealing the days of Meridia.', 'And on the other side of the water... someone is waiting.'],
      onLine(i, s) { if (i === 1) { s.showT = T; sfx('glint'); sfx('rumble', 0.6); } },
      cam: (t, st) => { const k = st.showT != null ? ease((t - st.showT) / 2.5) : 0; return [lerp(1.04, 1.25, k), VW / 2, lerp(VH * 0.5, VH * 0.72, k)]; },
      draw(t, dt, st) {
        const wl = Math.round(VH * 0.56), since = st.showT != null ? t - st.showT : -1, k = since < 0 ? 0 : ease(since / 1.6);
        // the embankment: brick, a railing, a Lumen lamp
        sky('#0a0812', '#22182a', wl);
        g.fillStyle = '#3a2a24'; g.fillRect(0, wl - 22, VW, 22);
        for (let y = wl - 22; y < wl; y += 4) for (let x = ((y / 4) % 2) * 4; x < VW; x += 8) px(x, y, '#2a1e1a', 7, 3);
        g.fillStyle = '#1a1214'; g.fillRect(0, wl - 30, VW, 1); for (let x = 2; x < VW; x += 6) g.fillRect(x, wl - 30, 1, 8);
        const lmx = VW * 0.22; g.fillStyle = '#2a1e14'; g.fillRect(lmx, wl - 50, 2, 28); g.fillRect(lmx - 2, wl - 54, 6, 4);
        glow(lmx + 1, wl - 52, 22, 'rgba(255,214,140,.7)'); disc(lmx + 1, wl - 52, 2, '#fff2c8');
        // the water, and what it shows: the lamp, and a girl in grey with a Litwick, looking up
        const ref = st.ref || (st.ref = document.createElement('canvas')); if (ref.width !== VW || ref.height !== VH - wl) { ref.width = VW; ref.height = VH - wl; }
        const keep = g; g = ref.getContext('2d'); g.imageSmoothingEnabled = false;
        sky('#1a1424', '#05040a', VH - wl);
        g.fillStyle = '#2a1e1a'; g.fillRect(0, 0, VW, 10);
        glow(lmx + 1, 34, 18, 'rgba(255,214,140,.45)');
        if (k > 0) {
          g.globalAlpha = k; glow(VW / 2, 34, 40, 'rgba(200,200,230,.25)');
          person(L().nell, 'down', VW / 2, 6, 2, null, true);
          const lw = mons.litwick; if (lw) { lw.drive(dt, { moving: false, face: 1 }); mon(lw, VW / 2 + 18, 6, 1, true); glow(VW / 2 + 18, 6 + 14, 10, 'rgba(170,120,255,.6)'); }
          g.globalAlpha = 1;
        }
        g = keep;
        // the reflection, rippled line by line
        for (let y = 0; y < VH - wl; y++) { const off = Math.round(Math.sin(y * 0.35 - t * 3) * (0.6 + y * 0.015) + (since >= 0 ? Math.sin(y * 0.8 - since * 8) * Math.max(0, 2 - since) : 0)); g.drawImage(ref, 0, y, VW, 1, off, wl + y, VW, 1); }
        g.globalAlpha = 0.4; for (let y = wl; y < VH; y += 3) px(0, y, '#05040a', VW, 1); g.globalAlpha = 1;
        // rings on the water where she is
        if (since >= 0) for (let i = 0; i < 3; i++) { const u = ((since * 0.5 + i / 3) % 1); g.save(); g.translate(VW / 2, wl + 8); g.scale(1, 0.25); ring(0, 0, 6 + u * 60, 1, '#c8c8e0', (1 - u) * 0.6); g.restore(); }
        // the colour goes out of the world around the water
        desat(0.4 * k);
        motes(t, 10, '#c8c8e0', 21, -2);
      } },

    { id: 'veil', dur: 8, lines: ['High on the frozen peaks of Frostcrown, a Great Lantern is rising...', '...and deep beneath it, something ancient is beginning to wake.'],
      start() { sfx('rumble', 2); },
      onLine(i, s) { if (i === 1) { s.downT = T; Score.swell(3); sfx('rumble', 2.5); } },
      // the summit, then down through the mountain to what sleeps in it
      cam: (t, st) => { const k = st.downT != null ? ease((t - st.downT) / 2.6) : 0; return [1.5, VW / 2, lerp(0, VH * 0.72, k), 1]; },
      draw(t, dt, st) {
        const since = st.downT != null ? t - st.downT : -1, peak = VH * 0.3, mg = VH * 0.58;
        sky('#060814', '#1a2440', mg); drawStars(t, 0.8, 0, mg);
        // the beam of the Great Lantern into the clouds
        g.globalAlpha = 0.16 + 0.06 * Math.sin(t * 4); g.fillStyle = '#ffe9a8'; g.fillRect(VW / 2 - 3, 0, 6, peak); g.globalAlpha = 0.07; g.fillRect(VW / 2 - 8, 0, 16, peak); g.globalAlpha = 1;
        g.globalAlpha = 0.6; clouds(t, peak * 0.4, 6, '#2a3458', 5, 61, 5); g.globalAlpha = 1;
        ridge(ridges[0], '#1a2444', peak + 30); ridge(ridges[1], '#24305a', peak + 44);
        // the mountain: snow on its shoulders, rock below
        g.fillStyle = '#c8d4ec'; g.beginPath(); g.moveTo(-10, mg); g.lineTo(VW * 0.32, peak + 22); g.lineTo(VW / 2, peak + 6); g.lineTo(VW * 0.68, peak + 24); g.lineTo(VW + 10, mg); g.closePath(); g.fill();
        g.fillStyle = '#8a9ab8'; g.beginPath(); g.moveTo(VW / 2, peak + 6); g.lineTo(VW * 0.68, peak + 24); g.lineTo(VW + 10, mg); g.lineTo(VW * 0.55, mg); g.closePath(); g.fill();
        // the Great Lantern, still in its scaffold
        const tx = VW / 2, tb = peak + 8;
        g.fillStyle = '#4a3a2a'; g.fillRect(tx - 5, tb - 30, 10, 30);
        g.strokeStyle = '#7a6a4a'; g.lineWidth = 1; g.beginPath(); for (let y = tb - 30; y < tb; y += 5) { g.moveTo(tx - 8, y); g.lineTo(tx + 8, y + 5); g.moveTo(tx + 8, y); g.lineTo(tx - 8, y + 5); } g.stroke();
        glow(tx, tb - 34, 18 + Math.sin(t * 3) * 2, 'rgba(255,220,140,.85)'); disc(tx, tb - 34, 3, '#fff6d8');
        // inside the mountain: dark rock, ice, and the colossus asleep
        g.fillStyle = '#0a0e1c'; g.fillRect(0, mg, VW, VH - mg);
        const r = seeded(71); for (let i = 0; i < 30; i++) { const x = r() * VW, y = mg + r() * (VH - mg); g.globalAlpha = 0.5; px(x, y, '#2a4a6a', 2 + Math.round(r() * 3), 1); g.globalAlpha = 1; }
        for (let i = 0; i < 9; i++) { const x = VW * (0.05 + i * 0.11), y = mg + 2; g.fillStyle = '#6a9ac8'; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y); g.lineTo(x, y + 6 + (i % 3) * 3); g.closePath(); g.fill(); }
        const a = mons.golurk, gy = VH - 15, gs = a ? Math.max(1, Math.floor((gy - mg - 4) / a.anim.bh)) : 1, gx = VW / 2;
        if (a) {
          a.drive(dt, { moving: false, face: 1 });
          const lit = since > 1.6 ? ease((since - 1.6) / 0.8) : 0;
          monAs(a, gx - 1, gy, gs, '#3a6a9a', 0.5 + lit * 0.4); monAs(a, gx + 1, gy, gs, '#3a6a9a', 0.5 + lit * 0.4);
          monAs(a, gx, gy, gs, '#0c1426');
          if (lit > 0) {
            const cy = gy - a.anim.bh * gs * 0.55;
            glow(gx, cy, 20 * lit + 4, 'rgba(120,230,255,.9)'); disc(gx, cy, 2.5 * lit, '#e8fcff');
            const ey = gy - a.anim.bh * gs * 0.86; px(gx - 4, ey, '#a8f4ff', 3, 1); px(gx + 2, ey, '#a8f4ff', 3, 1); glow(gx, ey, 10 * lit, 'rgba(140,240,255,.7)');
          }
          if (since > 2.4 && !st.wake) { st.wake = true; hit(0.8, '#bff4ff', 8, 0.1); slowmo(0.3, 0.5); sfx('quake'); dust(gx, mg + 4, 30, VW * 0.4, '#8aa8c8'); a.play('roar'); }
          if (st.wake) { shock(t, st.downT + 2.4, gx, gy - a.anim.bh * gs * 0.55, S * 0.7, '#bff4ff', 1); if (Math.floor(t * 2) !== st.beat) { st.beat = Math.floor(t * 2); if (!still) shake = Math.max(shake, 2); } }
        }
        snow(t, 70, 'rgba(230,240,255,.8)', 81, 16);
        stepParts(dt);
        edges('0,10,30', 0.4);
      } },

    { id: 'okafor', dur: 1, speaker: 'Prof. Okafor', music: 'welcome', fadeCol: '#fff',
      lines: ['Hello there! Welcome to Meridia, the land of lighthouses!', 'My name is Amara Okafor. People around here just call me the Professor.', 'This world is full of creatures called Pokémon. Here, people and Pokémon live, work and battle side by side as partners.', 'I study how Pokémon move through time... and why some of them remember what we forget.'],
      onLine(i, s) { if (i === 2) { s.throwT = T; sfx('whoosh'); } },
      cam: t => [1.08 - 0.08 * ease(t / 2.5), VW / 2, GY - 10],
      draw(t, dt, st) {
        const hy = Math.round(GY * 0.62);
        sky('#bfe4ff', '#fff2dc', hy);
        g.globalAlpha = 0.85; clouds(t, hy * 0.35, 3, '#ffffff', 5, 81, 5); g.globalAlpha = 1;
        sea(hy, t, '#7ac0e8', '#3a8ac0', '#ffffff', 3, 40);
        lighthouse(VW * 0.85, hy, 26, BANDS[0], 0.3);
        g.fillStyle = '#f2e2bc'; g.fillRect(0, GY - 8, VW, VH); g.fillStyle = '#e8d4a8'; g.fillRect(0, GY - 8, VW, 2);
        motes(t, 10, '#fff3c4', 17, 3);
        const hs = clamp(Math.round(S / 34), 3, 7), out = st.throwT != null, fy = GY - 6;
        const hx = lerp(VW / 2, VW / 2 - S * 0.2, out ? ease((T - st.throwT) / 0.5) : 0) + (1 - easeOut(t / 0.9)) * S * 0.25;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(hx, fy, 7 * hs, 2 * hs, 0, 0, TAU); g.fill();
        person(L().okafor, 'down', hx, fy - Math.abs(Math.sin(t * 9)) * (t < 0.9 ? 2 : 0), hs);
        if (out) {
          const u = (T - st.throwT - 0.3) / 0.7, ex = VW / 2 + S * 0.25;
          if (u > 0 && u < 1) { const bx = lerp(hx + 6 * hs, ex, u), by = lerp(fy - 14 * hs, fy - 8, u) - Math.sin(u * Math.PI) * S * 0.2; g.save(); g.translate(bx, by); g.rotate(u * 10); disc(0, 0, 4, '#ee3b3b'); g.fillStyle = '#fff'; g.fillRect(-4, 0, 8, 4); px(-4, -0.5, '#1b1530', 8, 1); disc(0, 0, 1.2, '#fff'); g.restore(); }
          if (u >= 1) {
            if (!st.popped) { st.popped = T; sfx('pop'); hit(0.6, '#fff', 2, 0.03); burst(ex, fy - 18, 30, 70, ['#fff', '#ffe066', '#9fe8ff'], 0.7); }
            const since = T - st.popped, a = mons.chimecho, grow = easeOut(since / 0.35), cy = fy - 14 - Math.sin(T * 2) * 3;
            rays(ex, fy - 18, 12, S * 0.4, '255,255,255', since, Math.max(0, 0.8 - since * 1.2));
            if (a) { a.drive(dt, { moving: false, face: -1 }); if (grow < 1) monAs(a, ex, cy, Math.max(1, monFit(a, S * 0.26) * grow), '#ffffff'); else mon(a, ex, cy, monFit(a, S * 0.26)); }
            // it rings: little notes drift up
            if (since > 0.5 && Math.floor(since * 1.4) !== st.ring) { st.ring = Math.floor(since * 1.4); sfx('glint'); P.push({ x: ex + 8, y: cy - 20, vx: 6, vy: -14, life: 1.4, t: 0, c: '#6a8ad8', s: 2 }); }
            g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(ex, fy, 10, 2.5, 0, 0, TAU); g.fill();
          }
        }
        stepParts(dt);
      } },

    { id: 'player', dur: 1, speaker: 'Prof. Okafor', outDur: 1.6, outCol: '#fff',
      lines: [], // filled in by play() with the player's name
      cam: () => [1, VW / 2, GY],
      draw(t, dt, st) {
        const hy = Math.round(GY * 0.62);
        sky('#bfe4ff', '#fff2dc', hy);
        g.globalAlpha = 0.85; clouds(t + 30, hy * 0.35, 3, '#ffffff', 5, 81, 5); g.globalAlpha = 1;
        sea(hy, t, '#7ac0e8', '#3a8ac0', '#ffffff', 3, 40);
        lighthouse(VW * 0.85, hy, 26, BANDS[0], 0.3);
        g.fillStyle = '#f2e2bc'; g.fillRect(0, GY - 8, VW, VH); g.fillStyle = '#e8d4a8'; g.fillRect(0, GY - 8, VW, 2);
        const base = clamp(Math.round(S / 34), 3, 7), k = ease(t / 0.7), out = ending ? ease(endT / 1.4) : 0;
        const s = lerp(base, 0.6, out), x = lerp(VW / 2 + S * 0.3, VW / 2, k), fy = lerp(GY - 6, GY * 0.62, out);
        if (out) rays(x, fy - 10 * s, 16, S * 0.9, '255,255,255', t, out * 0.8);
        g.globalAlpha = k;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x, fy, 7 * s, 2 * s, 0, 0, TAU); g.fill();
        const f = JArt.person(opts.look).down[0]; g.drawImage(f, Math.round(x - 8 * s), Math.round(fy - 21 * s), Math.max(1, 16 * s), Math.max(1, 22 * s));
        g.globalAlpha = 1;
        if (ending && !st.whoosh) { st.whoosh = true; sfx('start'); }
      } },

    { id: 'title', dur: 6, fadeCol: '#fff', outDur: 0.9,
      start(s) { Score.stop(); sfx('rumble', 1.3); const r = seeded(91); s.lan = Array.from({ length: 24 }, (_, i) => ({ an: i * TAU / 24, d: 0.8 + r() * 0.6, c: LANTERN[i % 4] })); },
      cam: t => [1 + 0.05 * ease(t / 6), VW / 2, VH * 0.4],
      draw(t, dt, st) {
        const cx = VW / 2, cy = ui.titleY != null ? ui.titleY : VH * 0.36, IN = 1.4, hy = HY() + 10;
        sky('#04060f', '#141c3a', hy); drawStars(t, 1, 2, hy);
        glow(cx, cy, S * 0.8, 'rgba(70,110,200,.25)');
        sea(hy, t, '#0c1838', '#03050c', '#9fc4ff', 3, 50);
        const [lx, ly] = lighthouse(VW * 0.07, hy - 1, 40, BANDS[0], 1); sweep(lx, ly, t, 0.9, 0.2, S * 1.2, 0.9);
        lighthouse(VW * 0.93, hy - 1, 22, BANDS[5], 0.9);
        shimmer(VW * 0.07, hy + 1, VH, 6, '#ffe9b0', t, 0.6);
        if (t < IN) {
          // the lost days come home: lanterns from all around, spiralling into one point
          const k = easeIn(t / IN);
          for (const l of st.lan) {
            const an = l.an + k * 2.6, d = (1 - k) * S * l.d, x = cx + Math.cos(an) * d * 1.6, y = cy + Math.sin(an) * d * 0.55;
            paperLantern(x, y, 1.4, 1, l.c);
            if (Math.random() < 0.4) P.push({ x, y, vx: 0, vy: 0, life: 0.35, t: 0, c: l.c, s: 1 });
          }
          glow(cx, cy, 6 + k * 18, 'rgba(255,240,200,.9)');
        } else {
          if (!st.slam) { st.slam = true; hit(1, '#fff', 7, 0.1); Score.fanfare(); sfx('quake'); ui.title.classList.add('on'); burst(cx, cy, 80, 130, LANTERN.concat(['#fff', '#cfe6ff']), 1.2); }
          const u = t - IN;
          rays(cx, cy, 16, S * 1.1, '255,216,140', t * 0.2, 0.3 * ease(u / 0.6));
          shock(t, IN, cx, cy, S * 1.2, '#fff', 1);
          flare(cx, cy, Math.max(0, 0.9 - u * 0.5), '255,230,170');
          for (let i = 0; i < 8; i++) { const an = t * 0.5 + i * (TAU / 8), x = cx + Math.cos(an) * S * 0.7, y = cy + Math.sin(an) * S * 0.24; paperLantern(x, y, 1.2, 0.9, LANTERN[i % 4]); }
        }
        stepParts(dt);
      } }
  ];

  // ---------------------------------------------------------------------
  //  The player: scenes, lines, input, frame loop (as in jintro.js)
  // ---------------------------------------------------------------------
  const readTime = s => Math.max(1.7, s.length / 19);
  function enter(i) {
    si = i; sc = SCENES[i]; sc.lines = sc.lines || []; T = 0; lineI = -1; full = ''; typed = 0; readT = 0; ending = false; endT = 0; P.length = 0;
    st = {};
    if (sc.music && !noScore) Score.play(sc.music);
    if (sc.start) sc.start(st);
    root.classList.toggle('open', !!sc.speaker);
    ui.box.classList.add('off'); ui.box.classList.remove('ready');
  }
  function showLine(i) {
    lineI = i; full = sc.lines[i]; typed = 0; readT = 0;
    ui.who.textContent = sc.speaker || ''; ui.who.style.display = sc.speaker ? '' : 'none';
    ui.box.classList.toggle('narr', !sc.speaker);
    ui.box.classList.remove('off', 'ready');
    ui.text.textContent = '';
    if (sc.onLine) sc.onLine(i, st);
  }
  const lineDone = () => lineI >= 0 && typed >= full.length;
  const allRead = () => !sc.lines.length || (lineI === sc.lines.length - 1 && lineDone() && readT >= readTime(full));
  function next() { if (si + 1 >= SCENES.length) return finish(); enter(si + 1); }
  function beginEnd() { if (ending) return; ending = true; endT = 0; ui.box.classList.add('off'); }
  function advance() {
    if (!sc || ending) return;
    if (lineI >= 0 && !lineDone()) { typed = full.length; return; }
    if (lineI >= 0 && lineI < sc.lines.length - 1) return showLine(lineI + 1);
    if (T > 0.6) beginEnd();
  }
  function update(dt) {
    T += dt;
    if (lineI < 0 && sc.lines.length && T >= 0.6) showLine(0);
    if (lineI >= 0) {
      if (typed < full.length) { typed = Math.min(full.length, typed + dt * 40); ui.text.textContent = full.slice(0, Math.floor(typed)); if (typed >= full.length) ui.box.classList.add('ready'); }
      else { readT += dt; if (readT >= readTime(full) && lineI < sc.lines.length - 1) showLine(lineI + 1); }
    }
    if (!ending && T >= sc.dur && allRead()) beginEnd();
    if (ending && (endT += dt) >= (sc.outDur || 0.5)) next();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const rdt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!sc) return;
    if (slowT > 0) slowT -= rdt; else tsc = Math.min(1, tsc + rdt * 2.2);
    const dt = rdt * tsc;
    update(dt);
    if (!sc) return;
    g.imageSmoothingEnabled = false;
    g.save();
    if (shake > 0.2 && !still) g.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    shake *= Math.pow(0.02, rdt);
    sc.draw(T, dt, st);
    g.restore();
    if (flash > 0.01) { g.globalAlpha = Math.min(1, flash); g.fillStyle = flashCol; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; flash *= Math.pow(0.03, rdt); }
    const fin = 1 - clamp(T / 0.5, 0, 1), fout = ending ? clamp(endT / (sc.outDur || 0.5), 0, 1) : 0;
    if (fin > 0) { g.globalAlpha = fin; g.fillStyle = sc.fadeCol || '#000'; g.fillRect(0, 0, VW, VH); }
    if (fout > 0) { g.globalAlpha = fout; g.fillStyle = sc.outCol || (SCENES[si + 1] && SCENES[si + 1].fadeCol) || '#000'; g.fillRect(0, 0, VW, VH); }
    g.globalAlpha = 1;
    const c = sc.cam ? sc.cam(T, st) : [1 + 0.06 * ease(T / Math.max(5, sc.dur)), VW / 2, VH * 0.45];
    const z = Math.max(1, c[0] + (still ? 0 : punch)), sw = VW / z, sh = VH / z;
    let sx = c[3] ? c[1] - sw / 2 : c[1] * (1 - 1 / z), sy = c[3] ? c[2] - sh / 2 : c[2] * (1 - 1 / z);
    sx = clamp(sx, 0, VW - sw); sy = clamp(sy, 0, VH - sh);
    punch *= Math.pow(0.03, rdt);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    if (vign) ctx.drawImage(vign, 0, 0);
  }
  function resize() {
    const w = innerWidth, h = innerHeight, d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    if (w >= h) { VH = VS; VW = Math.round(VS * w / h); } else { VW = VS; VH = Math.round(VS * h / w); }
    art.width = VW; art.height = VH; S = Math.min(VW, VH);
    scale = h / VH;
    const bar = ui.bar ? ui.bar.offsetHeight : 0;
    FLOOR = VH - Math.ceil(Math.max(ui.box.offsetHeight + 30, bar + 22) / scale);
    GY = VH > VW * 1.2 ? Math.min(FLOOR, Math.round(VH * 0.6)) : FLOOR;
    const title = ui.title && ui.title.querySelector('b');
    ui.titleY = title ? (title.getBoundingClientRect().top + title.offsetHeight / 2) / scale : null;
    const r = seeded(13); stars = Array.from({ length: Math.round(VW * VH / 140) }, () => ({ x: r(), y: r() * 0.9, b: 0.4 + r() * 0.6, tw: 1 + r() * 3, ph: r() * 6, c: r() < 0.15 ? '#ffe9a8' : r() < 0.3 ? '#a8d8ff' : '#ffffff' }));
    ridges = [[0.62, 6], [0.72, 4], [0.82, 3]].map(([b, a], i) => ({ base: FLOOR * b, amp: a, f1: 0.02 + r() * 0.02, f2: 0.06 + r() * 0.05, p1: r() * 6, p2: r() * 6 + i }));
    vign = document.createElement('canvas'); vign.width = cv.width; vign.height = cv.height;
    const vg = vign.getContext('2d'), gr = vg.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.35, cv.width / 2, cv.height / 2, Math.hypot(cv.width, cv.height) * 0.55);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); vg.fillStyle = gr; vg.fillRect(0, 0, cv.width, cv.height);
  }
  function onKey(e) {
    if (!root) return;
    if (e.code === 'Escape') { e.preventDefault(); finish(); return; }
    if (['Space', 'Enter', 'KeyZ', 'KeyX', 'KeyE'].includes(e.code)) { e.preventDefault(); advance(); }
    e.stopPropagation();
  }
  function finish() {
    if (!root) return;
    cancelAnimationFrame(raf); Score.stop();
    removeEventListener('keydown', onKey, true); removeEventListener('resize', resize);
    const el = root; root = null; sc = null;
    el.classList.add('out'); setTimeout(() => el.remove(), 450);
    const r = resolveFn; resolveFn = null; if (r) r();
  }
  // the film's look is jintro.js's (.jintro ...): the same bars, subtitles, box and Skip button; only the title differs
  const CSS = `
  .jintro.mintro .ji-title b { font-size: clamp(30px, 7vw, 80px); background: linear-gradient(100deg, #ffe08a 0 42%, #ffffff 50%, #ffe08a 58% 100%); background-size: 300% 100%; background-position: 100% 0; -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 4px 0 #8a4a10) drop-shadow(0 4px 0 #0c1430) drop-shadow(0 0 20px rgba(120,190,255,.55)); }
  .jintro.mintro .ji-title i { color: #d8e8ff; }
  .jintro.mintro .ji-box.narr { text-shadow: 0 2px 0 #000, 0 0 12px rgba(255,200,120,.3); }`;
  function build() {
    // the shared film styles live in jintro.js; make sure they are on the page (it builds them on its first play)
    if (!document.getElementById('jintroCss') && typeof JIntro === 'object' && JIntro._css) { const s = document.createElement('style'); s.id = 'jintroCss'; s.textContent = JIntro._css; document.head.append(s); }
    if (!document.getElementById('mintroCss')) { const s = document.createElement('style'); s.id = 'mintroCss'; s.textContent = CSS; document.head.append(s); }
    root = document.createElement('div'); root.className = 'jintro mintro';
    root.innerHTML = `<canvas></canvas><div class="ji-bar t"></div><div class="ji-bar b"></div><div class="ji-title"><b>POKéMON JOURNEY II</b><i>The Lost Days of Meridia</i></div>
      <div class="ji-box off"><span class="ji-who"></span><span class="ji-t"></span><span class="ji-more">▼</span></div><button class="ji-skip">Skip ▸▸</button>`;
    document.body.append(root);
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
    art = document.createElement('canvas'); g = art.getContext('2d');
    ui = { box: root.querySelector('.ji-box'), who: root.querySelector('.ji-who'), text: root.querySelector('.ji-t'), title: root.querySelector('.ji-title'), bar: root.querySelector('.ji-bar.b') };
    root.querySelector('.ji-skip').addEventListener('click', e => { e.stopPropagation(); finish(); });
    root.addEventListener('click', advance);
    addEventListener('keydown', onKey, true);
    addEventListener('resize', resize);
  }
  async function loadMons() {
    if (typeof PixelMons === 'undefined') return;
    const want = { lapras: 'lapras', litwick: 'litwick', golurk: 'golurk', chimecho: 'chimecho' };
    const got = await Promise.race([Promise.all(Object.entries(want).map(([k, s]) => PixelMons.create(s).then(a => [k, a]).catch(() => [k, null]))), new Promise(r => setTimeout(() => r([]), 4000))]);
    for (const [k, a] of got) if (a) mons[k] = a;
  }
  async function play(o = {}) {
    if (root) return;
    opts = { name: o.name || '', look: o.look || (typeof OUTFITS !== 'undefined' && OUTFITS.red) };
    SCENES.find(s => s.id === 'player').lines = [
      opts.name ? `And you must be ${opts.name}, the birthday trainer from Tidemark!` : 'And you must be the birthday trainer from Tidemark!',
      'Tonight is Lantern Night - the night you meet your very first partner.',
      'Hold on to every moment. Something tells me they are about to become very precious. Let\'s go!'];
    still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    noScore = !!o.noScore;
    flash = 0; shake = 0; punch = 0; tsc = 1; slowT = 0; last = 0;
    build();
    resize();
    const done = new Promise(r => resolveFn = r);
    await loadMons();
    if (!root) return done;                            // skipped while loading
    enter(0);
    raf = requestAnimationFrame(frame);
    return done;
  }
  // _jump(id): cut straight to a scene (tools/make-trailer2.mjs); the film's own score stops unless that scene starts one
  const jump = id => { const i = SCENES.findIndex(s => s.id === id); if (!root || !sc || i < 0) return false; if (!SCENES[i].music) Score.stop(); enter(i); return true; };
  return { play, get playing() { return !!root; }, _skip: () => finish(), _advance: () => advance(), _scene: () => sc && sc.id, _jump: jump, _line: () => lineI };
})();
