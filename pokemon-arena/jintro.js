// =====================================================================
//  Journey's opening film: the legend of Valoria in pixel art (a meteor, its shards, the Mega Stones, Rayquaza,
//  Team Eclipse), then Professor Hazel's welcome. Drawn on a small art canvas and scaled up pixelated, shot like a
//  film: letterbox bars with the narration as subtitles, a camera that pushes in, tracks and punches on impacts,
//  slow motion on the big moments, light rays, shockwaves, a vignette. The bars slide away when Hazel speaks.
//  It plays by itself; a tap / Space speeds it along, Skip / Esc ends it.
//  JIntro.play({ name, look }) -> Promise, resolved when the film ends or is skipped.
// =====================================================================
const JIntro = (() => {
  const VS = 180;                                      // the short side of the screen, in art pixels
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3), easeIn = k => Math.pow(clamp(k, 0, 1), 3);
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sfx = (k, ...a) => { try { AudioFX.SFX[k](...a); } catch (e) {} };
  const SHARD_COLS = ['#7df9ff', '#ff7ad9', '#ffe066', '#9dff8a', '#b79bff'];
  const TAU = Math.PI * 2;

  let root, cv, ctx, art, g, VW, VH, S, FLOOR, GY, scale, raf, last, resolveFn, opts;
  let sc, si, T, lineI, full, typed, readT, ending, endT, flash, flashCol, shake, st;
  let punch = 0, tsc = 1, slowT = 0, view = null, still = false;
  const P = [];                                        // particles of the current scene
  let stars = [], ridges = [], mons = {}, ui = {}, vign = null;

  // ---------------------------------------------------------------------
  //  Music: an original score in two moods, scheduled a little ahead on the music bus
  // ---------------------------------------------------------------------
  const Score = (() => {
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const TR = {
      legend: { spb: 0.4, chords: [[57, 60, 64], [53, 57, 60], [48, 55, 64], [52, 55, 59]],
        lead: [0, 0, 0, 0, 76, 0, 72, 0, 0, 0, 0, 0, 77, 0, 76, 0, 0, 0, 0, 0, 79, 0, 76, 0, 0, 0, 74, 0, 71, 0, 0, 0], wave: 'sine', bell: [1, 0, 0, 1, 0, 0, 1, 0] },
      welcome: { spb: 0.29, chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]],
        lead: [72, 0, 76, 79, 77, 76, 74, 72, 74, 0, 0, 71, 74, 76, 74, 0, 72, 0, 76, 81, 79, 77, 76, 74, 76, 0, 0, 77, 76, 74, 72, 0], wave: 'square', bell: [0, 0, 1, 0, 0, 0, 1, 0] }
    };
    let timer = null, tr = null, step = 0, next = 0;
    const syn = () => AudioFX.synth;
    function note(at, i) {
      const s = syn(), ch = tr.chords[Math.floor(i / 8) % 4], k = i % 8;
      if (k === 0) {
        ch.forEach(m => s.tone({ type: 'triangle', f: mtof(m), dur: tr.spb * 8, g: 0.045, a: 0.35, at }));
        s.tone({ type: 'sine', f: mtof(ch[0] - 12), dur: tr.spb * 7.5, g: 0.11, a: 0.05, at });
      }
      if (tr.bell[k]) s.tone({ type: 'sine', f: mtof(ch[(i >> 1) % 3] + 24), dur: 1.1, g: 0.035, a: 0.005, at });
      const m = tr.lead[i % tr.lead.length];
      if (m) s.tone({ type: tr.wave, f: mtof(m), dur: tr.spb * 1.6, g: tr.wave === 'square' ? 0.03 : 0.07, a: 0.02, at });
    }
    function tick() {
      const s = syn(), now = s && s.now();
      if (!now || !tr) return;
      if (next < now) next = now + 0.05;
      while (next < now + 0.3) { note(next - now, step++); next += tr.spb; }
    }
    return {
      play(name) { tr = TR[name]; step = 0; next = 0; if (!timer) timer = setInterval(tick, 40); },
      fanfare() { const s = syn(); if (!s || !s.now()) return; [72, 76, 79, 84].forEach((m, i) => s.tone({ type: 'square', f: mtof(m), dur: 0.22, g: 0.05, at: i * 0.13 })); [60, 64, 67, 72].forEach(m => s.tone({ type: 'triangle', f: mtof(m), dur: 2.2, g: 0.06, a: 0.05, at: 0.52 })); },
      // a low swell under a big moment
      swell(dur = 1.2) { const s = syn(); if (!s || !s.now()) return; [45, 52, 57].forEach((m, i) => s.tone({ type: 'sawtooth', f: mtof(m), dur, g: 0.03, a: dur * 0.85, at: i * 0.02 })); },
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
  function glow(x, y, r, c, a = 1) { if (r <= 0 || a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
  function px(x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function sparkle(x, y, s, c) { px(x, y - s, c, 1, s * 2 + 1); px(x - s, y, c, s * 2 + 1, 1); }
  // the starfield; drift slides it sideways (the brighter, nearer stars faster: parallax)
  function drawStars(t, dim = 1, drift = 0) {
    for (const s of stars) {
      const a = (0.45 + 0.55 * Math.sin(t * s.tw + s.ph)) * s.b * dim; if (a <= 0.05) continue;
      g.globalAlpha = a; px((((s.x * VW - t * drift * s.b) % VW) + VW) % VW, s.y * VH, s.c);
    }
    g.globalAlpha = 1;
  }
  function ridge(r, col) { g.fillStyle = col; for (let x = 0; x < VW; x++) { const h = r.base + r.amp * (Math.sin(x * r.f1 + r.p1) * 0.6 + Math.sin(x * r.f2 + r.p2) * 0.4); g.fillRect(x, Math.round(h), 1, VH - Math.round(h)); } }
  const tints = new Map();
  function tint(img, col) {
    const k = col; let m = tints.get(img); if (!m) tints.set(img, m = new Map());
    if (!m.has(k)) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); m.set(k, c); }
    return m.get(k);
  }
  // a pixel person (16x22 frame), feet at x, y
  function person(look, dir, x, y, s, col) { const f = JArt.person(look)[dir][0], img = col ? tint(f, col) : f; g.drawImage(img, Math.round(x - 8 * s), Math.round(y - 21 * s), 16 * s, 22 * s); }
  // a Pokémon sprite (PMD actor: its canvas holds the current animation frame), feet at x, y
  function mon(a, x, y, s) { if (!a) return; const A = a.anim; g.drawImage(A.frames[0].img, Math.round(x - A.foot[0] * s), Math.round(y - A.foot[1] * s), A.w * s, A.h * s); }
  // the same in one flat colour (a silhouette of this very frame: the actor repaints, so nothing is cached)
  let flatCv = null;
  function monAs(a, x, y, s, col, alpha = 1) {
    if (!a || alpha <= 0) return;
    const A = a.anim, img = A.frames[0].img;
    if (!flatCv) flatCv = document.createElement('canvas');
    flatCv.width = img.width; flatCv.height = img.height;
    const x2 = flatCv.getContext('2d'); x2.drawImage(img, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = col; x2.fillRect(0, 0, img.width, img.height);
    g.globalAlpha = alpha; g.drawImage(flatCv, Math.round(x - A.foot[0] * s), Math.round(y - A.foot[1] * s), A.w * s, A.h * s); g.globalAlpha = 1;
  }
  const monFit = (a, h) => a ? clamp(Math.round(h / a.anim.bh), 1, 6) : 1;
  function burst(x, y, n, sp, cols, life = 0.8, grav = 0) { for (let i = 0; i < n; i++) { const an = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7); P.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life, t: 0, c: cols[i % cols.length], g: grav, s: 1 }); } }
  // dust kicked up along the ground
  function dust(x, y, n, w, col) { for (let i = 0; i < n; i++) { const d = (Math.random() - 0.5) * 2; P.push({ x: x + d * w, y, vx: d * 40, vy: -10 - Math.random() * 25, g: 30, life: 0.7 + Math.random() * 0.5, t: 0, c: col, s: 1 + (Math.random() < 0.3) }); } }
  function stepParts(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      if (p.land != null && p.y >= p.land && p.vy > 0) { p.vx = p.vy = 0; p.y = p.land; p.landed = true; }
      if (!p.landed) { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.trail && !p.landed && Math.random() < 0.7) P.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.45, t: 0, c: p.c, s: 1 });
      if (p.life && p.t >= p.life) { P.splice(i, 1); continue; }
      const a = p.life ? 1 - p.t / p.life : 1;
      g.globalAlpha = a;
      if (p.landed) sparkle(p.x, p.y, Math.sin(p.t * 6 + p.x) > 0.3 ? 2 : 1, p.c);
      else px(p.x, p.y, p.c, p.s, p.s);
      g.globalAlpha = 1;
    }
  }
  // light rays from a point: n spokes, turning by rot, fading with distance (rgb as 'r,g,b')
  function rays(x, y, n, len, rgb, rot, a = 1, w = 0.09) {
    if (a <= 0.01 || len <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, len); gr.addColorStop(0, `rgba(${rgb},${Math.min(1, a)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < n; i++) { const an = rot + i * TAU / n, ww = w * (0.55 + 0.45 * Math.sin(i * 2.7 + 1)); g.moveTo(x, y); g.lineTo(x + Math.cos(an - ww) * len, y + Math.sin(an - ww) * len); g.lineTo(x + Math.cos(an + ww) * len, y + Math.sin(an + ww) * len); g.closePath(); }
    g.fill(); g.restore();
  }
  function ring(x, y, r, w, col, a) { if (a <= 0.01 || r <= 0) return; g.globalAlpha = Math.min(1, a); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  // a shockwave from time t0: a ring that races out and thins away (squash < 1 flattens it onto the ground)
  function shock(t, t0, x, y, R, col = '#fff', dur = 0.9, squash = 1) {
    const k = (t - t0) / dur; if (k < 0 || k >= 1) return;
    const e = easeOut(k); g.save(); g.translate(x, y); g.scale(1, squash); ring(0, 0, e * R, Math.max(1, 3 * (1 - k)), col, 1 - k); g.restore();
  }
  // an anamorphic lens flare: a hot point with a long thin streak across the frame
  function flare(x, y, a, rgb = '200,220,255') {
    if (a <= 0.01) return;
    const gr = g.createLinearGradient(0, y, VW, y); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(clamp(x / VW, 0.01, 0.99), `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, Math.round(y), VW, 1); g.globalAlpha = a * 0.4; g.fillRect(0, Math.round(y) - 1, VW, 3); g.restore();
    glow(x, y, 14, `rgba(${rgb},${a})`); disc(x, y, 1.5, `rgba(255,255,255,${a})`);
  }
  // a lightning bolt, jagged and forked, from (x, y0) down to y1
  function bolt(x, y0, y1, seed, a) {
    if (a <= 0.01) return;
    const r = seeded(seed); let bx = x, by = y0;
    g.save(); g.globalAlpha = a; g.strokeStyle = '#eef8ff'; g.lineWidth = 1; g.shadowColor = '#9fd8ff'; g.shadowBlur = 5; g.beginPath(); g.moveTo(bx, by);
    while (by < y1) { by += 5 + r() * 8; bx += (r() - 0.5) * 14; g.lineTo(bx, by); if (r() < 0.2) { const fx = bx + (r() - 0.5) * 26, fy = by + 8 + r() * 12; g.lineTo(fx, fy); g.moveTo(bx, by); } }
    g.stroke(); g.restore();
  }
  // a band of clouds drifting sideways (seeded: the same clouds every frame)
  function clouds(t, y, speed, col, h, seed, n = 7) {
    const r = seeded(seed), span = VW + 140; g.fillStyle = col;
    for (let i = 0; i < n; i++) { const w = 40 + r() * 70, x0 = r() * span, yy = y + (r() - 0.5) * h, hh = h * (0.4 + r() * 0.5); const x = (((x0 - t * speed) % span) + span) % span - 70; g.beginPath(); g.ellipse(x, yy, w / 2, hh, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + w * 0.25, yy - hh * 0.5, w * 0.3, hh * 0.8, 0, 0, TAU); g.fill(); }
  }
  // speed lines (dir 1: sliding right, -1: left)
  function streaks(t, n, speed, len, col, seed, dir = -1, y0 = 0, y1 = VH) {
    const r = seeded(seed); g.fillStyle = col;
    for (let i = 0; i < n; i++) { const y = lerp(y0, y1, r()), sp = speed * (0.6 + r() * 0.8), l = Math.round(len * (0.5 + r())), span = VW + l; const x = (((r() * span + dir * t * sp) % span) + span) % span; g.fillRect(Math.round(x - l), Math.round(y), l, 1); }
  }
  function rain(t, n, col, seed) {
    const r = seeded(seed); g.fillStyle = col;
    for (let i = 0; i < n; i++) { const sp = 150 + r() * 80, x0 = r() * (VW + 60), y = ((r() * VH + t * sp) % (VH + 10)) - 5, x = ((x0 - (t * sp) * 0.35) % (VW + 60) + VW + 60) % (VW + 60) - 30; g.fillRect(Math.round(x), Math.round(y), 1, 4); }
  }
  // drifting motes of light
  function motes(t, n, col, seed, rise = 5) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) { const x = ((r() * VW + Math.sin(t * 0.7 + i) * 6) % VW + VW) % VW, y = ((r() * VH - t * rise * (0.5 + r())) % VH + VH) % VH; g.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); px(x, y, col); }
    g.globalAlpha = 1;
  }
  function shootingStar(t, t0, x, y, dx, dy) {
    const k = (t - t0) / 0.7; if (k < 0 || k > 1) return;
    const hx = x + dx * easeOut(k), hy = y + dy * easeOut(k);
    for (let i = 0; i < 16; i++) { const u = i / 16; g.globalAlpha = (1 - u) * (1 - k); px(hx - dx * 0.3 * u, hy - dy * 0.3 * u, '#fff'); }
    g.globalAlpha = 1;
  }
  // a colour washing in from the frame's edges (dread, heat)
  function edges(rgb, a) {
    if (a <= 0.01) return;
    const gr = g.createRadialGradient(VW / 2, VH / 2, S * 0.35, VW / 2, VH / 2, Math.hypot(VW, VH) * 0.6); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${a})`);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  // the meteor's head with its burning tail
  function meteor(x, y, dt, r = 3) {
    for (let i = 0; i < 5; i++) P.push({ x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: 30 + Math.random() * 40, vy: -20 - Math.random() * 30, life: 0.5 + Math.random() * 0.5, t: 0, c: ['#fff1a8', '#ffb347', '#ff6a3d', '#c23b22', '#ffe2b0'][i], s: 1 + (Math.random() < 0.35) });
    glow(x, y, r * 7 * (0.9 + Math.random() * 0.2), 'rgba(255,170,80,.9)');
    glow(x, y, r * 3, 'rgba(255,240,200,.9)');
    disc(x, y, r, '#fff6d0');
  }
  function megaStone(x, y, r, t) {
    glow(x, y, r * 2.6, 'rgba(150,200,255,.55)');
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#9fe8ff'); gr.addColorStop(0.7, '#6d74ff'); gr.addColorStop(1, '#b44cff');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // the swirl inside
    for (let i = -r * 0.6; i <= r * 0.6; i += 0.5) { const w = Math.sin(i * 0.5 + t * 3) * r * 0.25; px(x + i, y + w, 'rgba(255,255,255,.8)'); px(x + i, y - w, 'rgba(255,140,220,.8)'); }
    px(x - r * 0.45, y - r * 0.5, '#fff', 2, 1);
  }
  function keyStone(x, y, r, t) {
    g.strokeStyle = '#d9dce6'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + r * 0.4, r * 1.2, r * 0.55, 0, 0, TAU); g.stroke();
    g.strokeStyle = '#8c90a3'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + r * 0.4, r * 1.2, r * 0.55, 0, 0, Math.PI); g.stroke();
    megaStone(x, y - r * 0.2, r * 0.45, t);
  }
  // a rainbow strand that ripples from a to b
  function bond(ax, ay, bx, by, t, k = 1, amp = 4) {
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) * k));
    for (let i = 0; i <= n; i++) {
      const u = i / Math.max(1, Math.round(Math.hypot(bx - ax, by - ay))), x = lerp(ax, bx, u), y = lerp(ay, by, u), w = Math.sin(u * 12 - t * 8) * amp * Math.sin(u * Math.PI);
      px(x, y + w, `hsl(${(u * 300 + t * 200) % 360},100%,70%)`); px(x, y - w, `hsl(${(u * 300 + t * 200 + 180) % 360},100%,75%)`);
    }
  }
  // the energy that runs along a bond: a bright bead travelling from a to b
  function pulse(ax, ay, bx, by, t, speed = 0.9) { const u = (t * speed) % 1, x = lerp(ax, bx, u), y = lerp(ay, by, u); glow(x, y, 8, 'rgba(255,255,255,.9)'); disc(x, y, 1.5, '#fff'); }
  const meteorAt = k => [lerp(VW + 15, VW * 0.42, k), lerp(-15, FLOOR - S * 0.08, k)];
  const raySpin = (rgb, a) => (x, y, len, t, n = 14) => rays(x, y, n, len, rgb, t * 0.35, a);

  // ---------------------------------------------------------------------
  //  The scenes. draw(t, dt, st): t the scene's time, st its own state (fresh each time it starts)
  // ---------------------------------------------------------------------
  const SCENES = [
    { id: 'space', dur: 5.5, music: 'legend', lines: ['Long, long ago...'],
      start() { sfx('rumble', 3); },
      // a slow drift back through the stars
      cam: t => [1.3 - 0.26 * ease(t / 5.5), VW * 0.5, VH * 0.42],
      draw(t, dt) {
        sky('#04020c', '#140a30');
        glow(VW * 0.7 + Math.sin(t * 0.25) * 14, VH * 0.35, S * 0.6, 'rgba(120,60,200,.3)');
        glow(VW * 0.25 - t * 2, VH * 0.62, S * 0.45, 'rgba(40,120,200,.24)');
        glow(VW * 0.5 + t * 3, VH * 0.12, S * 0.35, 'rgba(255,90,160,.13)');
        drawStars(t, ease(t / 1.8), 3);
        shootingStar(t, 1.7, VW * 0.18, VH * 0.14, 80, 34);
        shootingStar(t, 3.9, VW * 0.8, VH * 0.08, -70, 40);
        motes(t, 16, '#b9a8ff', 3, 2);
      } },

    { id: 'meteor', dur: 6, lines: ['...a great meteor fell from the stars, blazing across the sky.'],
      start() { sfx('whoosh'); Score.swell(4); },
      // ride along with it: close on its head, easing back to show the world it is falling to
      cam(t) { const [x, y] = meteorAt(ease(t / 5.2)); return [lerp(1.55, 1.05, ease(t / 5.6)), lerp(x, VW / 2, 0.3), lerp(y, VH * 0.6, 0.3), 1]; },
      draw(t, dt, st) {
        sky('#04020c', '#0f1838'); drawStars(t, 1, 10);
        const k = ease(t / 5.2), [mx, my] = meteorAt(k);
        streaks(t, 22, 70, 8, 'rgba(200,220,255,.22)', 5, 1, 0, FLOOR);
        const cx = VW * 0.5, cy = FLOOR + S * 1.05, r = S * 1.2;
        glow(cx, cy, r * 1.12, 'rgba(110,200,255,.5)');
        g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
        g.fillStyle = '#1b4d8c'; g.fillRect(0, 0, VW, VH);
        const rr = seeded(7); for (let i = 0; i < 9; i++) disc(cx + (rr() - 0.5) * r * 1.6, cy - r + rr() * S * 0.4, 6 + rr() * 16, i % 3 ? '#3f8f4a' : '#5aa457');
        // the cloud tops sliding by under it
        g.globalAlpha = 0.5; clouds(t, cy - r + 10, 8, '#d7ecff', 4, 21, 6); g.globalAlpha = 1;
        g.restore();
        // the sky catches fire as it nears
        glow(mx, cy - r, r * 0.8, `rgba(255,150,80,${0.1 + 0.55 * k * k})`);
        meteor(mx, my, dt, 2 + k * 3);
        if (k > 0.55) ring(mx, my, 6 + k * 5 + Math.sin(t * 30), 1, 'rgba(255,230,190,.5)', (k - 0.55) * 2);   // the heat wave in front of it
        stepParts(dt);
        if (t > 5 && !st.hit) { st.hit = true; hit(0.9, '#ffe2b0', 5, 0.06); sfx('thunder'); }
      } },

    { id: 'valoria', dur: 7.5, lines: ['Over the Valoria region it shattered...', '...and its glowing shards rained down all across the land.'],
      // close on the falling star, then (after the blast) slowly back to see the shards come down everywhere
      cam: (t, st) => st.boom ? [lerp(1.22, 1, ease((t - 1.6) / 4.5)), VW * 0.55, FLOOR * 0.35] : [1.22, VW * 0.6, FLOOR * 0.3],
      draw(t, dt, st) {
        const bx = VW * 0.55, by = FLOOR * 0.35, since = st.boom ? t - 1.5 : -1;
        sky('#081236', '#2c427e', FLOOR); drawStars(t, 0.7);
        if (since >= 0) glow(bx, by, S * 1.1, 'rgba(255,220,170,.6)', Math.max(0, 1 - since / 2.5));   // the whole sky lit by the blast
        disc(VW * 0.17, FLOOR * 0.3, 8, '#f3efcf'); disc(VW * 0.17 + 3, FLOOR * 0.3 - 2, 7, '#e4dfba');
        g.globalAlpha = 0.6; clouds(t, FLOOR * 0.2, 5, '#1a2a5c', 5, 31, 5); g.globalAlpha = 1;
        ridge(ridges[0], '#2a3770'); ridge(ridges[1], '#1d2754'); ridge(ridges[2], '#121c3b');
        g.fillStyle = '#0d2350'; g.fillRect(0, FLOOR - 4, VW, VH);
        for (let i = 0; i < 14; i++) if (Math.sin(t * 3 + i * 7) > -0.2) px((i * 37) % VW, FLOOR - 1 + (i % 3) * 2, 'rgba(240,235,200,.55)', 3, 1);
        for (let i = 0; i < 9; i++) if (Math.sin(t * 2 + i) > -0.6) px(VW * (0.3 + i * 0.06), ridges[2].base + 5 + (i % 2) * 3, '#ffd96a');
        if (t < 1.5) { const k = ease(t / 1.5); meteor(lerp(VW * 0.9, bx, k), lerp(-10, by, k), dt, 3 + k); }
        else if (!st.boom) {
          st.boom = true; hit(1, '#fff', 8, 0.14); slowmo(0.22, 0.55); sfx('quake'); Score.swell(2);
          for (let i = 0; i < 40; i++) { const an = -Math.PI * (0.05 + Math.random() * 0.9), v = 35 + Math.random() * 85; P.push({ x: bx, y: by, vx: Math.cos(an) * v * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(an) * v, g: 70, t: 0, c: SHARD_COLS[i % 5], s: 2, trail: true, land: lerp(ridges[2].base + 4, FLOOR - 2, Math.random()) }); }
          burst(bx, by, 50, 100, ['#fff', '#ffe9a8', '#ffb347'], 0.8);
        }
        if (since >= 0) {
          rays(bx, by, 16, S * 0.9, '255,235,190', since * 0.4, Math.max(0, 0.75 - since * 0.35));
          shock(t, 1.5, bx, by, S * 0.7, '#fff', 1); shock(t, 1.72, bx, by, S * 0.5, '#ffe9a8', 1.1); shock(t, 2, bx, by, S * 0.9, 'rgba(160,220,255,.8)', 1.4);
          glow(bx, by, 18, 'rgba(255,255,255,.95)', Math.max(0, 1 - since / 1.2));
        }
        stepParts(dt);
      } },

    { id: 'stones', dur: 7.5, iris: () => [VW / 2, FLOOR * 0.48], outDur: 0.9, lines: ['The shards became Mega Stones and Key Stones...', '...stones that awaken only when a Pokémon and its trainer share a true bond.'],
      cam: t => [1 + 0.14 * ease(t / 7.5), VW / 2, FLOOR * 0.48],
      draw(t, dt, st) {
        sky('#07040f', '#140a26'); glow(VW / 2, FLOOR * 0.5, S * 0.75, 'rgba(140,80,255,.3)');
        motes(t, 22, '#cdb8ff', 9, 4);
        const cx = VW / 2, cy = FLOOR * 0.48, d = Math.min(VW * 0.28, S * 0.42);
        if (t < 1.6) {
          const y = lerp(FLOOR * 0.7, cy, ease(t / 1.4)), w = Math.abs(Math.cos(t * 4)) * 5 + 1;
          rays(cx, y, 12, S * 0.55, '180,150,255', t * 0.8, 0.4 * ease(t / 0.8));
          glow(cx, y, 22, 'rgba(160,230,255,.7)');
          g.fillStyle = '#c9f6ff'; g.beginPath(); g.moveTo(cx, y - 9); g.lineTo(cx + w, y); g.lineTo(cx, y + 9); g.lineTo(cx - w, y); g.fill();
          for (let i = 0; i < 3; i++) sparkle(cx + Math.cos(t * 3 + i * 2.1) * 16, y + Math.sin(t * 3 + i * 2.1) * 8, 1, '#fff');
        } else {
          if (!st.split) { st.split = true; hit(0.9, '#fff', 3, 0.05); sfx('glint'); burst(cx, cy, 36, 80, SHARD_COLS, 0.9); }
          shock(t, 1.6, cx, cy, S * 0.5, '#d9c8ff', 0.8);
          const k = ease((t - 1.6) / 0.9), ax = cx - d * k, bx = cx + d * k;
          rays(ax, cy, 10, S * 0.35, '140,210,255', t * 0.5, 0.25 * k); rays(bx, cy, 10, S * 0.35, '255,170,230', -t * 0.5, 0.25 * k);
          for (const [ox, sgn] of [[ax, 1], [bx, -1]]) for (let i = 0; i < 4; i++) { const an = t * 2 * sgn + i * TAU / 4; sparkle(ox + Math.cos(an) * 18, cy + Math.sin(an) * 7, Math.sin(t * 6 + i) > 0 ? 1 : 0, SHARD_COLS[i]); }
          if (t > 3.1) { if (!st.linked) { st.linked = true; sfx('mega'); } bond(ax + 12, cy, bx - 14, cy, t, 1, 5 * ease((t - 3.1) / 0.6)); if (t > 3.6) pulse(ax + 12, cy, bx - 14, cy, t); }
          megaStone(ax, cy + Math.sin(t * 2) * 1.5, 11, t); keyStone(bx, cy + Math.cos(t * 2) * 1.5, 11, t);
        }
        stepParts(dt);
      } },

    { id: 'bond', dur: 7, lines: ['When their hearts beat as one, the Pokémon Mega Evolves...', '...and its power soars beyond every limit.'],
      start() { if (mons.lucario) { mons.lucario.dir = 6; mons.lucario.act = null; } if (mons.mega) { mons.mega.dir = 6; mons.mega.act = null; } },
      // wide on the pair, push in on Lucario as the power gathers, ease back to see the Mega Evolution stand
      cam(t) { const push = ease((t - 2) / 2.2), back = ease((t - 4.7) / 1.8); return [1 + 0.26 * push - 0.14 * back, lerp(VW / 2, VW * 0.7, push), lerp(GY * 0.7, GY - S * 0.18, push)]; },
      draw(t, dt, st) {
        const fy = GY - 6, tx = VW * 0.28, mx = VW * 0.7, my = fy - S * 0.13;
        sky('#24164a', '#f08a5d', GY);
        // the low sun behind them, its rays turning
        rays(VW * 0.5, GY - 4, 18, S * 0.9, '255,200,140', t * 0.08, 0.22);
        glow(VW * 0.5, GY - 4, S * 0.6, 'rgba(255,200,120,.4)'); disc(VW * 0.5, GY - 4, S * 0.09, '#ffd88a');
        g.globalAlpha = 0.55; clouds(t, GY * 0.35, 4, '#4a2a5e', 4, 41, 5); g.globalAlpha = 1;
        g.fillStyle = '#3a2747'; g.fillRect(0, GY - 6, VW, VH);
        const ts = clamp(Math.round(S / 60), 2, 4);
        person(opts.look, 'right', tx, fy, ts);
        const wx = tx + 5 * ts, wy = fy - 10 * ts;
        const evolved = t >= 4.4, a = evolved ? mons.mega : mons.lucario;
        if (a) a.drive(dt, { moving: false, face: -1 });
        const ms = monFit(a, S * 0.32);
        if (evolved) { rays(mx, my, 16, S * 0.95, '255,255,255', t * 0.6, Math.max(0.12, 0.7 - (t - 4.4) * 0.3)); glow(mx, my, S * 0.38, `hsla(${(t * 120) % 360},100%,65%,.55)`); }
        // the energy spirals up around it as the stones answer each other
        if (t > 3 && t < 4.5) {
          const k = ease((t - 3) / 0.8);
          for (let i = 0; i < 28; i++) { const u = i / 28, an = t * 9 + u * 14, r0 = S * 0.13 * (1 - u * 0.4) * k; for (const s of [0, Math.PI]) { const x = mx + Math.cos(an + s) * r0, y = fy - u * S * 0.42 + Math.sin(an + s) * 2; g.globalAlpha = Math.cos(an + s) > 0 ? 1 : 0.4; px(x, y, `hsl(${(u * 360 + t * 300) % 360},100%,70%)`); } }
          g.globalAlpha = 1;
        }
        mon(a, mx, fy, ms);
        // it flickers between its forms, faster and faster, as a silhouette of light
        if (t > 3.3 && t < 4.4) { const f = 6 + (t - 3.3) * 30; if (Math.sin(t * f) > 0) monAs(mons.mega || a, mx, fy, monFit(mons.mega || a, S * 0.32), '#ffffff', 0.85); else monAs(a, mx, fy, ms, '#ffffff', 0.6); }
        if (t > 1.6 && !st.glint) { st.glint = true; sfx('glint'); }
        if (t > 1.6) { glow(wx, wy, 9, 'rgba(160,230,255,.8)'); sparkle(wx, wy, 1 + (Math.sin(t * 12) > 0), '#fff'); }
        if (t > 2.2 && t < 4.6) { bond(wx, wy, mx, my, t, 1, 4 * ease((t - 2.2) / 0.5)); if (t > 2.6) pulse(wx, wy, mx, my, t, 1.4); }
        if (t > 3.6 && t < 4.4) { const k = ease((t - 3.6) / 0.8); if (!st.orb) { st.orb = true; sfx('mega'); } glow(mx, my, S * 0.3 * k + 4, 'rgba(255,255,255,.95)'); disc(mx, my, S * 0.12 * k, '#fff'); }
        if (evolved && !st.pop) {
          st.pop = true; hit(1, '#fff', 7, 0.1); slowmo(0.25, 0.5); sfx('quake');
          burst(mx, my, 70, 120, ['#fff', '#9fe8ff', '#ff7ad9', '#ffe066'], 1); dust(mx, fy, 26, S * 0.12, '#8a6a8a');
          if (mons.mega) mons.mega.play('roar');
        }
        shock(t, 4.4, mx, my, S * 0.6, '#fff', 0.9); shock(t, 4.6, mx, fy, S * 0.55, '#ffe9a8', 1, 0.3);
        stepParts(dt);
      } },

    { id: 'rayquaza', dur: 7.5, lines: ['Legends say that the sky dragon Rayquaza...', '...still guards the crater where the meteor fell.'],
      start() { if (mons.rayquaza) mons.rayquaza.act = null; },
      // the camera tracks it across the storm
      cam(t) { const k = t / 7.2; return [1.18, lerp(-S * 0.5, VW + S * 0.5, k), GY * 0.62, 1]; },
      draw(t, dt, st) {
        sky('#081a26', '#24585c', GY); drawStars(t, 0.15);
        const bolts = [[0.9, 0.3], [3.7, 0.72], [5.9, 0.5]];
        let lit = 0;
        for (const [b, bxk] of bolts) { const u = t - b; if (u >= 0 && u < 0.25) lit = Math.max(lit, 1 - u / 0.25); if (u >= 0 && !st['b' + b]) { st['b' + b] = true; hit(0.55, '#dff4ff', 3, 0.03); sfx('thunder'); } }
        if (lit) { g.globalAlpha = lit * 0.35; g.fillStyle = '#cfefff'; g.fillRect(0, 0, VW, GY); g.globalAlpha = 1; }
        clouds(t, GY * 0.12, 6, 'rgba(10,30,42,.85)', 6, 51);
        for (const [b, bxk] of bolts) { const u = t - b; if (u >= 0 && u < 0.2) bolt(VW * bxk, GY * 0.12, GY * 0.7, 99 + b * 10, 1 - u / 0.2); }
        clouds(t, GY * 0.3, 14, 'rgba(14,40,52,.75)', 5, 52);
        g.fillStyle = '#231c2b'; g.fillRect(0, GY - 8, VW, VH);
        const cx = VW / 2, cy = GY - 6;
        g.globalAlpha = 0.18 + 0.08 * Math.sin(t * 5); g.fillStyle = '#7dffcf'; g.fillRect(cx - 6, 0, 12, cy); g.globalAlpha = 0.08; g.fillRect(cx - 12, 0, 24, cy); g.globalAlpha = 1;
        g.fillStyle = '#0e0a14'; g.beginPath(); g.ellipse(cx, cy, S * 0.28, 7, 0, 0, TAU); g.fill();
        glow(cx, cy, S * 0.22, 'rgba(120,255,210,.45)');
        for (let i = 0; i < 6; i++) sparkle(cx + Math.cos(i * 1.7) * S * 0.2, cy + Math.sin(i * 2.3) * 4, Math.sin(t * 4 + i) > 0.6 ? 1 : 0, SHARD_COLS[i % 5]);
        const a = mons.rayquaza, k = t / 7.2, s = monFit(a, S * 0.36);
        const x = lerp(-S * 0.5, VW + S * 0.5, k), y = GY * 0.74 + Math.sin(t * 1.6) * 8 - Math.sin(k * Math.PI) * GY * 0.07;
        if (a) a.drive(dt, { moving: true, vx: 220, vy: Math.cos(t * 1.6) * 20, face: 1 });
        if (Math.random() < 0.9) P.push({ x: x - S * 0.18, y: y - S * 0.12 + (Math.random() - 0.5) * 16, vx: -60 - Math.random() * 40, vy: 0, life: 0.6, t: 0, c: Math.random() < 0.5 ? '#9dffcf' : '#4fd38a', s: 1 });
        stepParts(dt);
        streaks(t, 16, 160, 14, 'rgba(200,255,235,.28)', 61, -1, y - S * 0.3, y + S * 0.1);   // the wind of its passing
        mon(a, x, y, s);
        clouds(t, GY * 0.5, 30, 'rgba(20,46,56,.55)', 4, 53, 4);   // wisps in front of it
        rain(t, 70, 'rgba(170,220,235,.35)', 71);
        if (t > 1.3 && !st.roar) { st.roar = true; sfx('Dragon', 1.2); sfx('rumble', 1.2); hit(0.2, '#9dffcf', 4, 0.05); if (a) a.play('roar'); }
      } },

    { id: 'eclipse', dur: 7.5, lines: ['But now a shadowy group called Team Eclipse hunts the shards...', '...to force that power from Pokémon, with no bond at all.'],
      // a slow, steady push in on them
      cam: t => [1 + 0.16 * ease((t - 2.5) / 5), VW / 2, GY * 0.68],
      draw(t, dt, st) {
        const k = ease((t - 0.3) / 3);
        const top = `rgb(${lerp(226, 22, k) | 0},${lerp(121, 10, k) | 0},${lerp(59, 44, k) | 0})`, bot = `rgb(${lerp(250, 60, k) | 0},${lerp(196, 20, k) | 0},${lerp(120, 70, k) | 0})`;
        sky(top, bot, GY); drawStars(t, k * 0.8);
        const sx = VW / 2, sy = GY * 0.36, r = S * 0.1;
        // totality: the corona's rays
        if (k > 0.85) rays(sx, sy, 22, S * 0.55, '210,170,255', t * 0.12, (k - 0.85) * 3, 0.05);
        glow(sx, sy, r * (3 + k * 1.5), k > 0.85 ? 'rgba(200,140,255,.75)' : 'rgba(255,210,110,.7)');
        disc(sx, sy, r, '#ffd36b');
        const mx = lerp(sx + r * 3.2, sx, k), my = lerp(sy - r * 0.6, sy, k);
        disc(mx, my, r * 1.02, '#14081f');
        if (k > 0.85) ring(sx, sy, r + 1, 1, 'rgba(230,200,255,.85)', 1);
        // the diamond ring: the last bead of sun flares just before it goes dark
        if (k > 0.78 && !st.ring) { st.ring = t; sfx('glint'); }
        if (st.ring) { const u = (t - st.ring) / 1.1; if (u < 1) flare(sx + r * 0.75, sy - r * 0.65, Math.sin(Math.min(1, u * 3) * Math.PI / 2) * (1 - u), '255,230,200'); }
        g.fillStyle = '#0c0614'; g.fillRect(0, GY - 4, VW, VH);
        motes(t, 26, '#7a3aa8', 13, 9);
        const gs = clamp(Math.round(S / 90), 2, 3), rise = ease((t - 3) / 1.2);
        if (t > 3 && !st.rumble) { st.rumble = true; sfx('rumble', 1.4); Score.swell(2.5); }
        for (let i = 0; i < 5; i++) {
          const x = VW / 2 + (i - 2) * 13 * gs, y = GY - 4 + (1 - rise) * 30 * gs + Math.abs(i - 2) * 2;
          person(JMaps.L.grunt, 'down', x, y, gs, '#1d0f2e');
          if (rise > 0.9) { const on = (t - 4.1) * 6 - Math.abs(i - 2); if (on > 0) { const ey = y - 13 * gs, w = Math.max(1, gs >> 1); px(x - 2 * gs, ey, '#ff3b5c', gs, w); px(x + 1 * gs, ey, '#ff3b5c', gs, w); if (on < 1.5) { glow(x - 1.5 * gs, ey, 6, 'rgba(255,60,90,.9)', 1.5 - on); } } }
        }
        if (rise > 0.9 && !st.eyes) { st.eyes = true; sfx('debuff'); }
        // a heartbeat of dread at the edges
        if (t > 4) {
          const n = Math.floor((t - 4) / 0.9), b = (t - 4) - n * 0.9, beat = Math.max(0, 1 - b / 0.35);
          edges('140,0,40', 0.15 + 0.35 * beat);
          if (st.beat !== n) { st.beat = n; sfx('rumble', 0.25); if (!still) shake = Math.max(shake, 1.5); }
        }
        stepParts(dt);
      } },

    { id: 'hazel', dur: 1, speaker: 'Prof. Hazel', music: 'welcome', fadeCol: '#fff',
      lines: ['Hello there! Welcome to the world of Pokémon!', 'My name is Hazel. People call me the Pokémon Professor!', 'This world is home to creatures called Pokémon. People and Pokémon live, work and battle side by side as partners.', 'I study the bond between them... and the Mega Evolution it can awaken.'],
      onLine(i, s) { if (i === 2) { s.throwT = T; sfx('whoosh'); } },
      cam: t => [1.08 - 0.08 * ease(t / 2.5), VW / 2, GY - 10],
      draw(t, dt, st) {
        sky('#bfe0ff', '#fff6dc', GY);
        g.globalAlpha = 0.85; clouds(t, GY * 0.22, 3, '#ffffff', 5, 81, 5); g.globalAlpha = 1;
        g.fillStyle = '#f2e3c4'; g.fillRect(0, GY - 6, VW, VH);
        motes(t, 12, '#fff3c4', 17, 3);
        const hs = clamp(Math.round(S / 34), 3, 7), out = st.throwT != null, fy = GY - 6;
        // she walks in from the side as the curtain opens
        const hx = lerp(VW / 2, VW / 2 - S * 0.2, out ? ease((T - st.throwT) / 0.5) : 0) + (1 - easeOut(t / 0.9)) * S * 0.25;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(hx, fy, 7 * hs, 2 * hs, 0, 0, TAU); g.fill();
        person(JMaps.L.hazel, 'down', hx, fy - Math.abs(Math.sin(t * 9)) * (t < 0.9 ? 2 : 0), hs);
        if (out) {
          const u = (T - st.throwT - 0.3) / 0.7, ex = VW / 2 + S * 0.25;
          if (u > 0 && u < 1) { const bx = lerp(hx + 6 * hs, ex, u), by = lerp(fy - 14 * hs, fy - 8, u) - Math.sin(u * Math.PI) * S * 0.2; g.save(); g.translate(bx, by); g.rotate(u * 10); disc(0, 0, 4, '#ee3b3b'); g.fillStyle = '#fff'; g.fillRect(-4, 0, 8, 4); px(-4, -0.5, '#1b1530', 8, 1); disc(0, 0, 1.2, '#fff'); g.restore(); }
          if (u >= 1) {
            if (!st.popped) { st.popped = T; sfx('pop'); hit(0.6, '#fff', 2, 0.03); burst(ex, fy - 10, 30, 70, ['#fff', '#ffe066', '#9fe8ff'], 0.7); }
            const since = T - st.popped;
            rays(ex, fy - 10, 12, S * 0.4, '255,255,255', since, Math.max(0, 0.8 - since * 1.2));
            const a = mons.eevee; if (a) { a.dir = 0; a.drive(dt, { moving: false, face: 1 }); }
            const hop = Math.max(0, Math.sin((T - st.throwT) * 5)) * 3, grow = easeOut(since / 0.35);
            g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(ex, fy, 12, 3, 0, 0, TAU); g.fill();
            if (grow < 1) monAs(a, ex, fy, Math.max(1, monFit(a, S * 0.2) * grow), '#ffffff');
            else mon(a, ex, fy - hop, monFit(a, S * 0.2));
          }
        }
        stepParts(dt);
      } },

    { id: 'player', dur: 1, speaker: 'Prof. Hazel', outDur: 1.6, outCol: '#fff',
      lines: [], // filled in by play() with the player's name
      cam: () => [1, VW / 2, GY],
      draw(t, dt, st) {
        sky('#bfe0ff', '#fff6dc', GY);
        g.globalAlpha = 0.85; clouds(t + 30, GY * 0.22, 3, '#ffffff', 5, 81, 5); g.globalAlpha = 1;
        g.fillStyle = '#f2e3c4'; g.fillRect(0, GY - 6, VW, VH);
        const base = clamp(Math.round(S / 34), 3, 7), k = ease(t / 0.7), out = ending ? ease(endT / 1.4) : 0;
        const s = lerp(base, 0.6, out), x = lerp(VW / 2 + S * 0.3, VW / 2, k), fy = lerp(GY - 6, GY * 0.62, out);
        if (out) rays(x, fy - 10 * s, 16, S * 0.9, '255,255,255', t, out * 0.8);
        g.globalAlpha = k;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x, fy, 7 * s, 2 * s, 0, 0, TAU); g.fill();
        const f = JArt.person(opts.look).down[0]; g.drawImage(f, Math.round(x - 8 * s), Math.round(fy - 21 * s), Math.max(1, 16 * s), Math.max(1, 22 * s));
        g.globalAlpha = 1;
        if (ending && !st.whoosh) { st.whoosh = true; sfx('start'); }
      } },

    { id: 'title', dur: 5.6, fadeCol: '#fff', outDur: 0.9,
      start() { Score.stop(); sfx('rumble', 1.3); },
      cam: t => [1 + 0.05 * ease(t / 5.6), VW / 2, VH * 0.38],
      draw(t, dt, st) {
        const cx = VW / 2, cy = ui.titleY != null ? ui.titleY : VH * 0.36, IN = 1.3;
        sky('#05030f', '#1a0f3a'); drawStars(t, 1, 4);
        glow(cx, cy, S * 0.8, 'rgba(110,60,200,.25)');
        if (t < IN) {
          // the shards come home: from all around, spiralling into one point
          const k = easeIn(t / IN);
          for (let i = 0; i < 12; i++) {
            const an = i * TAU / 12 + k * 2.4, d = (1 - k) * S * 1.1, x = cx + Math.cos(an) * d * 1.5, y = cy + Math.sin(an) * d * 0.55;
            glow(x, y, 7, 'rgba(170,220,255,.7)'); sparkle(x, y, 1, SHARD_COLS[i % 5]);
            if (Math.random() < 0.6) P.push({ x, y, vx: 0, vy: 0, life: 0.35, t: 0, c: SHARD_COLS[i % 5], s: 1 });
          }
          glow(cx, cy, 6 + k * 18, 'rgba(255,255,255,.9)');
        } else {
          if (!st.slam) { st.slam = true; hit(1, '#fff', 7, 0.1); Score.fanfare(); sfx('quake'); ui.title.classList.add('on'); burst(cx, cy, 80, 130, SHARD_COLS, 1.2); }
          const u = t - IN;
          rays(cx, cy, 16, S * 1.1, '255,216,74', t * 0.2, 0.32 * ease(u / 0.6));
          shock(t, IN, cx, cy, S * 1.2, '#fff', 1);
          flare(cx, cy, Math.max(0, 0.9 - u * 0.5), '255,230,170');
          for (let i = 0; i < 12; i++) { const an = t * 0.6 + i * (TAU / 12), x = cx + Math.cos(an) * S * 0.66, y = cy + Math.sin(an) * S * 0.22; glow(x, y, 6, 'rgba(160,220,255,.6)'); sparkle(x, y, 1, SHARD_COLS[i % 5]); }
        }
        stepParts(dt);
      } }
  ];

  // ---------------------------------------------------------------------
  //  The player: scenes, lines, input, frame loop
  // ---------------------------------------------------------------------
  const readTime = s => Math.max(1.7, s.length / 19);
  function enter(i) {
    si = i; sc = SCENES[i]; sc.lines = sc.lines || []; T = 0; lineI = -1; full = ''; typed = 0; readT = 0; ending = false; endT = 0; P.length = 0;
    st = {};
    if (sc.music) Score.play(sc.music);
    if (sc.start) sc.start(st);
    // the film is letterboxed; when Hazel talks to you the curtain opens
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
    // slow motion: time runs at tsc for a moment, then eases back to full speed
    if (slowT > 0) slowT -= rdt; else tsc = Math.min(1, tsc + rdt * 2.2);
    const dt = rdt * tsc;
    update(dt);
    if (!sc) return;
    g.imageSmoothingEnabled = false;                   // sprites scale up as crisp pixels
    g.save();
    if (shake > 0.2 && !still) { g.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake)); }
    shake *= Math.pow(0.02, rdt);
    sc.draw(T, dt, st);
    g.restore();
    if (flash > 0.01) { g.globalAlpha = Math.min(1, flash); g.fillStyle = flashCol; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; flash *= Math.pow(0.03, rdt); }
    const fin = 1 - clamp(T / 0.5, 0, 1), fout = ending ? clamp(endT / (sc.outDur || 0.5), 0, 1) : 0;
    if (fin > 0) { g.globalAlpha = fin; g.fillStyle = sc.fadeCol || '#000'; g.fillRect(0, 0, VW, VH); }
    if (fout > 0 && !sc.iris) { g.globalAlpha = fout; g.fillStyle = sc.outCol || (SCENES[si + 1] && SCENES[si + 1].fadeCol) || '#000'; g.fillRect(0, 0, VW, VH); }
    g.globalAlpha = 1;
    // the camera: crop the art canvas and blow the crop up to the screen
    const c = sc.cam ? sc.cam(T, st) : [1 + 0.06 * ease(T / Math.max(5, sc.dur)), VW / 2, VH * 0.45];
    const z = Math.max(1, c[0] + (still ? 0 : punch)), sw = VW / z, sh = VH / z;
    let sx = c[3] ? c[1] - sw / 2 : c[1] * (1 - 1 / z), sy = c[3] ? c[2] - sh / 2 : c[2] * (1 - 1 / z);
    sx = clamp(sx, 0, VW - sw); sy = clamp(sy, 0, VH - sh);
    view = { sx, sy, sw, sh };
    punch *= Math.pow(0.03, rdt);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    if (vign) ctx.drawImage(vign, 0, 0);
    // an iris closing on the scene's subject
    if (sc.iris && fout > 0) {
      const [ix, iy] = sc.iris(), X = (ix - sx) / sw * cv.width, Y = (iy - sy) / sh * cv.height, R = (1 - easeIn(fout)) * Math.hypot(cv.width, cv.height);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, cv.width, cv.height); ctx.arc(X, Y, Math.max(0, R), 0, TAU, true); ctx.fill();
    }
  }
  function resize() {
    const w = innerWidth, h = innerHeight, d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    if (w >= h) { VH = VS; VW = Math.round(VS * w / h); } else { VW = VS; VH = Math.round(VS * h / w); }
    art.width = VW; art.height = VH; S = Math.min(VW, VH);
    scale = h / VH;
    // the ground line sits just above the text box and the letterbox bar
    const bar = ui.bar ? ui.bar.offsetHeight : 0;
    FLOOR = VH - Math.ceil(Math.max(ui.box.offsetHeight + 30, bar + 22) / scale);
    GY = VH > VW * 1.2 ? Math.min(FLOOR, Math.round(VH * 0.6)) : FLOOR;   // where people stand: a tall phone lifts the stage to the middle
    const title = ui.title && ui.title.querySelector('b');
    ui.titleY = title ? (title.getBoundingClientRect().top + title.offsetHeight / 2) / scale : null;
    const r = seeded(11); stars = Array.from({ length: Math.round(VW * VH / 140) }, () => ({ x: r(), y: r() * 0.9, b: 0.4 + r() * 0.6, tw: 1 + r() * 3, ph: r() * 6, c: r() < 0.15 ? '#ffe9a8' : r() < 0.3 ? '#a8d8ff' : '#ffffff' }));
    ridges = [[0.62, 16], [0.72, 11], [0.82, 7]].map(([b, a], i) => ({ base: FLOOR * b, amp: a, f1: 0.02 + r() * 0.02, f2: 0.06 + r() * 0.05, p1: r() * 6, p2: r() * 6 + i }));
    // the vignette, at screen resolution
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
  const CSS = `
  .jintro { --bar: clamp(60px, 12vh, 112px); position: fixed; inset: 0; z-index: 400; background: #000; font-family: 'Tiny5', monospace; color: #fff; user-select: none; -webkit-user-select: none; touch-action: manipulation; cursor: pointer; transition: opacity .45s; overflow: hidden; }
  .jintro.out { opacity: 0; pointer-events: none; }
  .jintro canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
  .ji-bar { position: absolute; left: 0; right: 0; height: var(--bar); background: #000; z-index: 1; transition: transform 1.1s cubic-bezier(.65,0,.25,1); pointer-events: none; }
  .ji-bar.t { top: 0; box-shadow: 0 1px 0 rgba(255,255,255,.06); } .ji-bar.b { bottom: 0; box-shadow: 0 -1px 0 rgba(255,255,255,.06); }
  .jintro.open .ji-bar.t { transform: translateY(-100%); } .jintro.open .ji-bar.b { transform: translateY(100%); }
  .ji-box { position: absolute; z-index: 2; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(780px, calc(100% - 24px)); min-height: 92px; box-sizing: border-box; padding: 12px 18px 14px; background: rgba(12,8,28,.82); border: 3px solid #fff8ea; border-radius: 14px; box-shadow: 0 0 0 3px #1b1530, 0 6px 0 rgba(0,0,0,.4); font-size: clamp(16px, 2.4vw, 22px); line-height: 1.45; transition: opacity .3s, transform .3s; }
  .ji-box.off { opacity: 0; transform: translateX(-50%) translateY(6px); }
  /* the narration: subtitles in the lower letterbox bar */
  .ji-box.narr { min-height: 0; bottom: calc(var(--bar) / 2); transform: translate(-50%, 50%); background: none; border-color: transparent; box-shadow: none; text-align: center; color: #ece8ff; letter-spacing: .02em; text-shadow: 0 2px 0 #000, 0 0 12px rgba(140,110,255,.35); padding: 4px 18px; }
  .ji-box.narr.off { transform: translate(-50%, 50%); }
  .ji-box.narr .ji-more { display: none; }
  .ji-who { display: block; color: #ffd84a; font-size: .78em; margin-bottom: 2px; }
  .ji-more { position: absolute; right: 14px; bottom: 8px; font-size: 14px; opacity: 0; }
  .ji-box.ready .ji-more { opacity: 1; animation: jiBlink .9s steps(2) infinite; }
  .ji-skip { position: absolute; top: 12px; right: 12px; z-index: 3; font: inherit; font-size: 16px; color: #fff; background: rgba(0,0,0,.45); border: 2px solid rgba(255,255,255,.6); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
  .ji-skip:hover { background: rgba(255,255,255,.15); }
  .ji-title { position: absolute; z-index: 2; left: 0; right: 0; top: 30%; text-align: center; opacity: 0; pointer-events: none; }
  .ji-title.on { opacity: 1; }
  .ji-title b { display: inline-block; font-weight: 400; font-size: clamp(34px, 8vw, 88px); letter-spacing: .04em; color: transparent; background: linear-gradient(100deg, #ffd84a 0 42%, #fff8d6 50%, #ffd84a 58% 100%); background-size: 300% 100%; background-position: 100% 0; -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 4px 0 #a35a00) drop-shadow(0 4px 0 #1b1530) drop-shadow(0 0 18px rgba(255,216,74,.5)); }
  .ji-title.on b { animation: jiSlam .55s cubic-bezier(.2,1.5,.4,1) both, jiShine 2.6s .5s ease-in-out infinite; }
  .ji-title i { display: block; font-style: normal; font-size: clamp(16px, 3vw, 30px); color: #cfe3ff; margin-top: 12px; text-shadow: 0 3px 0 #1b1530; opacity: 0; letter-spacing: .3em; transition: opacity 1s .7s, letter-spacing 1.6s .7s cubic-bezier(.2,.8,.2,1); }
  .ji-title.on i { opacity: 1; letter-spacing: .04em; }
  @keyframes jiSlam { 0% { transform: scale(2.6); opacity: 0; } 60% { opacity: 1; } 100% { transform: none; opacity: 1; } }
  @keyframes jiShine { 0% { background-position: 100% 0; } 55%, 100% { background-position: 0 0; } }
  @keyframes jiBlink { 50% { opacity: .15; } }
  @media (prefers-reduced-motion: reduce) { .ji-bar { transition: none; } .ji-title.on b { animation: none; } }`;
  function build() {
    if (!document.getElementById('jintroCss')) { const s = document.createElement('style'); s.id = 'jintroCss'; s.textContent = CSS; document.head.append(s); }
    root = document.createElement('div'); root.className = 'jintro';
    root.innerHTML = `<canvas></canvas><div class="ji-bar t"></div><div class="ji-bar b"></div><div class="ji-title"><b>POKéMON JOURNEY</b><i>The Eclipse of Valoria</i></div>
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
    const want = { lucario: 'lucario', mega: 'lucario-mega', rayquaza: 'rayquaza', eevee: 'eevee' };
    const got = await Promise.race([Promise.all(Object.entries(want).map(([k, s]) => PixelMons.create(s).then(a => [k, a]).catch(() => [k, null]))), new Promise(r => setTimeout(() => r([]), 4000))]);
    for (const [k, a] of got) if (a) mons[k] = a;
  }
  async function play(o = {}) {
    if (root) return;
    opts = { name: o.name || '', look: o.look || (typeof OUTFITS !== 'undefined' && OUTFITS.red) };
    SCENES.find(s => s.id === 'player').lines = [
      opts.name ? `And you must be ${opts.name}, from Willowbrook Town!` : 'And you - you must be the new trainer from Willowbrook Town!',
      'Your very own Pokémon legend is about to unfold!',
      'A world of dreams and adventures with Pokémon awaits. Let\'s go!'];
    // no shaking, punching in or slow motion for those who asked for less motion
    still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
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
  // _jump(id): cut straight to a scene (tools/make-trailer.mjs); the film's own score stops unless that scene starts one
  const jump = id => { const i = SCENES.findIndex(s => s.id === id); if (!root || !sc || i < 0) return false; if (!SCENES[i].music) Score.stop(); enter(i); return true; };
  return { play, get playing() { return !!root; }, _skip: () => finish(), _advance: () => advance(), _scene: () => sc && sc.id, _jump: jump };
})();
