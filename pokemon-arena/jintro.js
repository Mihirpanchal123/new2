// =====================================================================
//  Journey's opening film: the legend of Valoria in pixel art (a meteor, its shards, the Mega Stones, Rayquaza,
//  Team Eclipse), then Professor Hazel's welcome. Drawn on a small art canvas and scaled up pixelated; the text
//  types out in a box below. It plays by itself; a tap / Space speeds it along, Skip / Esc ends it.
//  JIntro.play({ name, look }) -> Promise, resolved when the film ends or is skipped.
// =====================================================================
const JIntro = (() => {
  const VS = 180;                                      // the short side of the screen, in art pixels
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sfx = (k, ...a) => { try { AudioFX.SFX[k](...a); } catch (e) {} };
  const SHARD_COLS = ['#7df9ff', '#ff7ad9', '#ffe066', '#9dff8a', '#b79bff'];

  let root, cv, ctx, art, g, VW, VH, S, FLOOR, GY, scale, raf, last, resolveFn, opts;
  let sc, si, T, lineI, full, typed, readT, ending, endT, flash, flashCol, shake;
  const P = [];                                        // particles of the current scene
  let stars = [], ridges = [], mons = {}, ui = {};

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
      stop() { clearInterval(timer); timer = null; tr = null; }
    };
  })();

  // ---------------------------------------------------------------------
  //  Drawing helpers (art pixels)
  // ---------------------------------------------------------------------
  function sky(top, bottom, y1 = VH) { const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  function disc(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); g.fill(); }
  function glow(x, y, r, c, a = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
  function px(x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function sparkle(x, y, s, c) { px(x, y - s, c, 1, s * 2 + 1); px(x - s, y, c, s * 2 + 1, 1); }
  function drawStars(t, dim = 1) {
    for (const s of stars) { const a = (0.45 + 0.55 * Math.sin(t * s.tw + s.ph)) * s.b * dim; if (a <= 0.05) continue; g.globalAlpha = a; px(s.x * VW, s.y * VH, s.c); }
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
  // a Pokémon sprite (PMD actor), feet at x, y
  function mon(a, x, y, s) { if (!a) return; const A = a.anim; g.drawImage(A.frames[0].img, Math.round(x - A.foot[0] * s), Math.round(y - A.foot[1] * s), A.w * s, A.h * s); }
  const monFit = (a, h) => a ? clamp(Math.round(h / a.anim.bh), 1, 6) : 1;
  function burst(x, y, n, sp, cols, life = 0.8, grav = 0) { for (let i = 0; i < n; i++) { const an = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random() * 0.7); P.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life, t: 0, c: cols[i % cols.length], g: grav, s: 1 }); } }
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
  // the meteor's head with its burning tail
  function meteor(x, y, dt, r = 3) {
    for (let i = 0; i < 4; i++) P.push({ x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: 30 + Math.random() * 30, vy: -20 - Math.random() * 25, life: 0.5 + Math.random() * 0.4, t: 0, c: ['#fff1a8', '#ffb347', '#ff6a3d', '#c23b22'][i], s: 1 + (Math.random() < 0.3) });
    glow(x, y, r * 6, 'rgba(255,170,80,.9)');
    disc(x, y, r, '#fff6d0');
  }
  function megaStone(x, y, r, t) {
    glow(x, y, r * 2.6, 'rgba(150,200,255,.55)');
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#9fe8ff'); gr.addColorStop(0.7, '#6d74ff'); gr.addColorStop(1, '#b44cff');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    // the swirl inside
    for (let i = -r * 0.6; i <= r * 0.6; i += 0.5) { const w = Math.sin(i * 0.5 + t * 3) * r * 0.25; px(x + i, y + w, 'rgba(255,255,255,.8)'); px(x + i, y - w, 'rgba(255,140,220,.8)'); }
    px(x - r * 0.45, y - r * 0.5, '#fff', 2, 1);
  }
  function keyStone(x, y, r, t) {
    g.strokeStyle = '#d9dce6'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + r * 0.4, r * 1.2, r * 0.55, 0, 0, Math.PI * 2); g.stroke();
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

  // ---------------------------------------------------------------------
  //  The scenes
  // ---------------------------------------------------------------------
  const SCENES = [
    { id: 'space', dur: 4.5, music: 'legend', lines: ['Long, long ago...'],
      draw(t) { sky('#04020c', '#140a30'); glow(VW * 0.7, VH * 0.35, S * 0.5, 'rgba(120,60,200,.25)'); glow(VW * 0.25, VH * 0.6, S * 0.4, 'rgba(40,120,200,.2)'); drawStars(t); } },

    { id: 'meteor', dur: 6, lines: ['...a great meteor fell from the stars, blazing across the sky.'],
      start() { sfx('whoosh'); },
      draw(t, dt) {
        sky('#04020c', '#0f1838'); drawStars(t);
        const cx = VW * 0.5, cy = FLOOR + S * 1.05, r = S * 1.2;
        glow(cx, cy, r * 1.12, 'rgba(110,200,255,.5)');
        g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#1b4d8c'; g.fillRect(0, 0, VW, VH);
        const rr = seeded(7); for (let i = 0; i < 9; i++) disc(cx + (rr() - 0.5) * r * 1.6, cy - r + rr() * S * 0.4, 6 + rr() * 16, i % 3 ? '#3f8f4a' : '#5aa457');
        g.restore();
        const k = ease(t / 5.2);
        meteor(lerp(VW + 15, VW * 0.42, k), lerp(-15, FLOOR - S * 0.08, k), dt, 2 + k * 2);
        stepParts(dt);
      } },

    { id: 'valoria', dur: 7.5, lines: ['Over the Valoria region it shattered...', '...and its glowing shards rained down all across the land.'],
      draw(t, dt) {
        sky('#081236', '#2c427e', FLOOR); drawStars(t, 0.7);
        disc(VW * 0.17, FLOOR * 0.22, 8, '#f3efcf'); disc(VW * 0.17 + 3, FLOOR * 0.22 - 2, 7, '#e4dfba');
        ridge(ridges[0], '#2a3770'); ridge(ridges[1], '#1d2754'); ridge(ridges[2], '#121c3b');
        g.fillStyle = '#0d2350'; g.fillRect(0, FLOOR - 4, VW, VH);
        for (let i = 0; i < 14; i++) if (Math.sin(t * 3 + i * 7) > -0.2) px((i * 37) % VW, FLOOR - 1 + (i % 3) * 2, 'rgba(240,235,200,.55)', 3, 1);
        for (let i = 0; i < 9; i++) if (Math.sin(t * 2 + i) > -0.6) px(VW * (0.3 + i * 0.06), ridges[2].base + 5 + (i % 2) * 3, '#ffd96a');
        if (t < 1.5) { const k = ease(t / 1.5); meteor(lerp(VW * 0.9, VW * 0.55, k), lerp(-10, FLOOR * 0.35, k), dt, 3); }
        else if (!this.boom) {
          this.boom = true; flash = 1; flashCol = '#fff'; shake = 7; sfx('quake');
          const x = VW * 0.55, y = FLOOR * 0.35;
          for (let i = 0; i < 36; i++) { const an = -Math.PI * (0.05 + Math.random() * 0.9), v = 35 + Math.random() * 85; P.push({ x, y, vx: Math.cos(an) * v * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(an) * v, g: 70, t: 0, c: SHARD_COLS[i % 5], s: 2, trail: true, land: lerp(ridges[2].base + 4, FLOOR - 2, Math.random()) }); }
          burst(x, y, 40, 90, ['#fff', '#ffe9a8', '#ffb347'], 0.7);
        }
        if (this.boom) { const k = (t - 1.5) / 0.9; if (k < 1) { g.strokeStyle = `rgba(255,240,200,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(VW * 0.55, FLOOR * 0.35, k * S * 0.6, 0, Math.PI * 2); g.stroke(); } }
        stepParts(dt);
      } },

    { id: 'stones', dur: 7.5, lines: ['The shards became Mega Stones and Key Stones...', '...stones that awaken only when a Pokémon and its trainer share a true bond.'],
      draw(t, dt) {
        sky('#07040f', '#140a26'); glow(VW / 2, FLOOR * 0.5, S * 0.7, 'rgba(140,80,255,.28)');
        const cx = VW / 2, cy = FLOOR * 0.48, d = Math.min(VW * 0.28, S * 0.42);
        if (t < 1.6) {
          const y = lerp(FLOOR * 0.7, cy, ease(t / 1.4)), w = Math.abs(Math.cos(t * 4)) * 5 + 1;
          glow(cx, y, 22, 'rgba(160,230,255,.7)');
          g.fillStyle = '#c9f6ff'; g.beginPath(); g.moveTo(cx, y - 9); g.lineTo(cx + w, y); g.lineTo(cx, y + 9); g.lineTo(cx - w, y); g.fill();
          for (let i = 0; i < 3; i++) sparkle(cx + Math.cos(t * 3 + i * 2.1) * 16, y + Math.sin(t * 3 + i * 2.1) * 8, 1, '#fff');
        } else {
          if (!this.split) { this.split = true; flash = 0.9; flashCol = '#fff'; sfx('glint'); burst(cx, cy, 30, 70, SHARD_COLS, 0.9); }
          const k = ease((t - 1.6) / 0.9);
          if (t > 3.1) { if (!this.linked) { this.linked = true; sfx('mega'); } bond(cx - d * k + 12, cy, cx + d * k - 14, cy, t, 1, 5 * ease((t - 3.1) / 0.6)); }
          megaStone(cx - d * k, cy, 11, t); keyStone(cx + d * k, cy, 11, t);
        }
        stepParts(dt);
      } },

    { id: 'bond', dur: 7, lines: ['When their hearts beat as one, the Pokémon Mega Evolves...', '...and its power soars beyond every limit.'],
      start() { if (mons.lucario) { mons.lucario.dir = 6; } if (mons.mega) mons.mega.dir = 6; },
      draw(t, dt) {
        sky('#24164a', '#f08a5d', GY); glow(VW / 2, GY, S * 0.6, 'rgba(255,200,120,.35)');
        g.fillStyle = '#3a2747'; g.fillRect(0, GY - 6, VW, VH);
        const ts = clamp(Math.round(S / 60), 2, 4), tx = VW * 0.28, mx = VW * 0.7, fy = GY - 6;
        person(opts.look, 'right', tx, fy, ts);
        const wx = tx + 5 * ts, wy = fy - 10 * ts;
        const evolved = t >= 4.4, a = evolved ? mons.mega : mons.lucario;
        if (a) a.drive(dt, { moving: false, face: -1 });
        const ms = monFit(a, S * 0.32);
        if (evolved) { glow(mx, fy - S * 0.15, S * 0.35, `hsla(${(t * 120) % 360},100%,65%,.55)`); }
        mon(a, mx, fy, ms);
        if (t > 1.6 && !this.glint) { this.glint = true; sfx('glint'); }
        if (t > 1.6) sparkle(wx, wy, 1 + (Math.sin(t * 12) > 0), '#fff');
        if (t > 2.2 && t < 4.6) bond(wx, wy, mx, fy - S * 0.13, t, 1, 4 * ease((t - 2.2) / 0.5));
        if (t > 3.2 && t < 4.4) { const k = ease((t - 3.2) / 1); if (!this.orb) { this.orb = true; sfx('mega'); } glow(mx, fy - S * 0.13, S * 0.3 * k + 4, 'rgba(255,255,255,.95)'); disc(mx, fy - S * 0.13, S * 0.13 * k, '#fff'); }
        if (evolved && !this.pop) { this.pop = true; flash = 1; flashCol = '#fff'; shake = 4; burst(mx, fy - S * 0.13, 60, 110, ['#fff', '#9fe8ff', '#ff7ad9', '#ffe066'], 0.9); }
        stepParts(dt);
      } },

    { id: 'rayquaza', dur: 7.5, lines: ['Legends say that the sky dragon Rayquaza...', '...still guards the crater where the meteor fell.'],
      draw(t, dt) {
        sky('#0b2232', '#2d6a6a', GY); drawStars(t, 0.25);
        for (let i = 0; i < 6; i++) { const y = GY * (0.15 + i * 0.12), x = ((i * 97 - t * (8 + i * 3)) % (VW + 120) + VW + 120) % (VW + 120) - 60; g.fillStyle = 'rgba(14,40,52,.65)'; g.beginPath(); g.ellipse(x, y, 50, 5, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#231c2b'; g.fillRect(0, GY - 8, VW, VH);
        const cx = VW / 2, cy = GY - 6;
        g.globalAlpha = 0.18 + 0.06 * Math.sin(t * 5); g.fillStyle = '#7dffcf'; g.fillRect(cx - 6, 0, 12, cy); g.globalAlpha = 1;
        g.fillStyle = '#0e0a14'; g.beginPath(); g.ellipse(cx, cy, S * 0.28, 7, 0, 0, Math.PI * 2); g.fill();
        glow(cx, cy, S * 0.22, 'rgba(120,255,210,.45)');
        for (let i = 0; i < 6; i++) sparkle(cx + Math.cos(i * 1.7) * S * 0.2, cy + Math.sin(i * 2.3) * 4, Math.sin(t * 4 + i) > 0.6 ? 1 : 0, SHARD_COLS[i % 5]);
        const a = mons.rayquaza, k = t / 7.2, s = monFit(a, S * 0.36);
        const x = lerp(-S * 0.5, VW + S * 0.5, k), y = GY * 0.68 + Math.sin(t * 1.6) * 8;
        if (a) a.drive(dt, { moving: true, vx: 220, vy: Math.cos(t * 1.6) * 20, face: 1 });
        if (Math.random() < 0.9) P.push({ x: x - S * 0.18, y: y - S * 0.12 + (Math.random() - 0.5) * 16, vx: -60 - Math.random() * 40, vy: 0, life: 0.6, t: 0, c: Math.random() < 0.5 ? '#9dffcf' : '#4fd38a', s: 1 });
        stepParts(dt);
        mon(a, x, y, s);
        if (t > 1.3 && !this.roar) { this.roar = true; sfx('Dragon', 1.2); sfx('rumble', 1.2); shake = 3; }
      } },

    { id: 'eclipse', dur: 7.5, lines: ['But now a shadowy group called Team Eclipse hunts the shards...', '...to force that power from Pokémon, with no bond at all.'],
      draw(t, dt) {
        const k = ease((t - 0.3) / 3);
        const top = `rgb(${lerp(226, 22, k) | 0},${lerp(121, 10, k) | 0},${lerp(59, 44, k) | 0})`, bot = `rgb(${lerp(250, 60, k) | 0},${lerp(196, 20, k) | 0},${lerp(120, 70, k) | 0})`;
        sky(top, bot, GY); drawStars(t, k * 0.8);
        const sx = VW / 2, sy = GY * 0.36, r = S * 0.1;
        glow(sx, sy, r * (3 + k * 1.5), k > 0.85 ? 'rgba(200,140,255,.75)' : 'rgba(255,210,110,.7)');
        disc(sx, sy, r, '#ffd36b');
        disc(lerp(sx + r * 3.2, sx, k), lerp(sy - r * 0.6, sy, k), r * 1.02, '#14081f');
        if (k > 0.85) { g.strokeStyle = 'rgba(230,200,255,.85)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, r + 1, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = '#0c0614'; g.fillRect(0, GY - 4, VW, VH);
        const gs = clamp(Math.round(S / 90), 2, 3), rise = ease((t - 3) / 1.2);
        if (t > 3 && !this.rumble) { this.rumble = true; sfx('rumble', 1.4); }
        for (let i = 0; i < 5; i++) {
          const x = VW / 2 + (i - 2) * 13 * gs, y = GY - 4 + (1 - rise) * 30 * gs + Math.abs(i - 2) * 2;
          person(JMaps.L.grunt, 'down', x, y, gs, '#1d0f2e');
          if (rise > 0.9) { px(x - 2 * gs, y - 13 * gs, '#ff3b5c', gs, Math.max(1, gs >> 1)); px(x + 1 * gs, y - 13 * gs, '#ff3b5c', gs, Math.max(1, gs >> 1)); }
        }
        stepParts(dt);
      } },

    { id: 'hazel', dur: 1, speaker: 'Prof. Hazel', music: 'welcome', fadeCol: '#fff',
      lines: ['Hello there! Welcome to the world of Pokémon!', 'My name is Hazel. People call me the Pokémon Professor!', 'This world is home to creatures called Pokémon. People and Pokémon live, work and battle side by side as partners.', 'I study the bond between them... and the Mega Evolution it can awaken.'],
      onLine(i) { if (i === 2) { this.throwT = T; sfx('whoosh'); } },
      draw(t, dt) {
        sky('#bfe0ff', '#fff6dc', GY); g.fillStyle = '#f2e3c4'; g.fillRect(0, GY - 6, VW, VH);
        const hs = clamp(Math.round(S / 34), 3, 7), out = this.throwT != null, hx = lerp(VW / 2, VW / 2 - S * 0.2, out ? ease((T - this.throwT) / 0.5) : 0), fy = GY - 6;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(hx, fy, 7 * hs, 2 * hs, 0, 0, Math.PI * 2); g.fill();
        person(JMaps.L.hazel, 'down', hx, fy, hs);
        if (out) {
          const u = (T - this.throwT - 0.3) / 0.7, ex = VW / 2 + S * 0.25;
          if (u > 0 && u < 1) { const bx = lerp(hx + 6 * hs, ex, u), by = lerp(fy - 14 * hs, fy - 8, u) - Math.sin(u * Math.PI) * S * 0.2; disc(bx, by, 4, '#ee3b3b'); g.fillStyle = '#fff'; g.fillRect(bx - 4, by, 8, 4); px(bx - 4, by - 0.5, '#1b1530', 8, 1); disc(bx, by, 1.2, '#fff'); }
          if (u >= 1) {
            if (!this.popped) { this.popped = true; sfx('pop'); flash = 0.6; flashCol = '#fff'; burst(ex, fy - 10, 24, 60, ['#fff', '#ffe066', '#9fe8ff'], 0.6); }
            const a = mons.eevee; if (a) { a.dir = 0; a.drive(dt, { moving: false, face: 1 }); }
            const hop = Math.max(0, Math.sin((T - this.throwT) * 5)) * 3;
            g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(ex, fy, 12, 3, 0, 0, Math.PI * 2); g.fill();
            mon(a, ex, fy - hop, monFit(a, S * 0.2));
          }
        }
        stepParts(dt);
      } },

    { id: 'player', dur: 1, speaker: 'Prof. Hazel', outDur: 1.6, outCol: '#fff',
      lines: [], // filled in by play() with the player's name
      draw(t, dt) {
        sky('#bfe0ff', '#fff6dc', GY); g.fillStyle = '#f2e3c4'; g.fillRect(0, GY - 6, VW, VH);
        const base = clamp(Math.round(S / 34), 3, 7), k = ease(t / 0.7), out = ending ? ease(endT / 1.4) : 0;
        const s = lerp(base, 0.6, out), x = lerp(VW / 2 + S * 0.3, VW / 2, k), fy = lerp(GY - 6, GY * 0.62, out);
        g.globalAlpha = k;
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x, fy, 7 * s, 2 * s, 0, 0, Math.PI * 2); g.fill();
        const f = JArt.person(opts.look).down[0]; g.drawImage(f, Math.round(x - 8 * s), Math.round(fy - 21 * s), Math.max(1, 16 * s), Math.max(1, 22 * s));
        g.globalAlpha = 1;
        if (ending && !this.whoosh) { this.whoosh = true; sfx('start'); }
      } },

    { id: 'title', dur: 4.8, fadeCol: '#fff', outDur: 0.9,
      start() { Score.stop(); Score.fanfare(); ui.title.classList.add('on'); },
      draw(t, dt) {
        sky('#05030f', '#1a0f3a'); drawStars(t);
        for (let i = 0; i < 12; i++) { const an = t * 0.6 + i * (Math.PI * 2 / 12), x = VW / 2 + Math.cos(an) * S * 0.62, y = VH * 0.4 + Math.sin(an) * S * 0.2; glow(x, y, 6, 'rgba(160,220,255,.6)'); sparkle(x, y, 1, SHARD_COLS[i % 5]); }
      } }
  ];

  // ---------------------------------------------------------------------
  //  The player: scenes, lines, input, frame loop
  // ---------------------------------------------------------------------
  const readTime = s => Math.max(1.7, s.length / 19);
  function enter(i) {
    si = i; sc = SCENES[i]; sc.lines = sc.lines || []; T = 0; lineI = -1; full = ''; typed = 0; readT = 0; ending = false; endT = 0; P.length = 0;
    for (const k of ['boom', 'split', 'linked', 'glint', 'orb', 'pop', 'roar', 'rumble', 'popped', 'whoosh']) sc[k] = false;
    sc.throwT = null;
    if (sc.music) Score.play(sc.music);
    if (sc.start) sc.start();
    ui.box.classList.add('off'); ui.box.classList.remove('ready');
  }
  function showLine(i) {
    lineI = i; full = sc.lines[i]; typed = 0; readT = 0;
    ui.who.textContent = sc.speaker || ''; ui.who.style.display = sc.speaker ? '' : 'none';
    ui.box.classList.toggle('narr', !sc.speaker);
    ui.box.classList.remove('off', 'ready');
    ui.text.textContent = '';
    if (sc.onLine) sc.onLine(i);
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
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!sc) return;
    update(dt);
    if (!sc) return;
    g.imageSmoothingEnabled = false;                   // sprites scale up as crisp pixels
    g.save();
    if (shake > 0.2) { g.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake)); shake *= Math.pow(0.02, dt); }
    sc.draw(T, dt);
    g.restore();
    if (flash > 0.01) { g.globalAlpha = flash; g.fillStyle = flashCol; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; flash *= Math.pow(0.03, dt); }
    const fin = 1 - clamp(T / 0.5, 0, 1), fout = ending ? clamp(endT / (sc.outDur || 0.5), 0, 1) : 0;
    if (fin > 0) { g.globalAlpha = fin; g.fillStyle = sc.fadeCol || '#000'; g.fillRect(0, 0, VW, VH); }
    if (fout > 0) { g.globalAlpha = fout; g.fillStyle = sc.outCol || (SCENES[si + 1] && SCENES[si + 1].fadeCol) || '#000'; g.fillRect(0, 0, VW, VH); }
    g.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, 0, 0, cv.width, cv.height);
  }
  function resize() {
    const w = innerWidth, h = innerHeight, d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    if (w >= h) { VH = VS; VW = Math.round(VS * w / h); } else { VW = VS; VH = Math.round(VS * h / w); }
    art.width = VW; art.height = VH; S = Math.min(VW, VH);
    scale = h / VH;
    FLOOR = VH - Math.ceil((ui.box.offsetHeight + 30) / scale);   // the ground line sits just above the text box
    GY = VH > VW * 1.2 ? Math.min(FLOOR, Math.round(VH * 0.6)) : FLOOR;   // where people stand: a tall phone lifts the stage to the middle
    const r = seeded(11); stars = Array.from({ length: Math.round(VW * VH / 140) }, () => ({ x: r(), y: r() * 0.9, b: 0.4 + r() * 0.6, tw: 1 + r() * 3, ph: r() * 6, c: r() < 0.15 ? '#ffe9a8' : r() < 0.3 ? '#a8d8ff' : '#ffffff' }));
    ridges = [[0.62, 16], [0.72, 11], [0.82, 7]].map(([b, a], i) => ({ base: FLOOR * b, amp: a, f1: 0.02 + r() * 0.02, f2: 0.06 + r() * 0.05, p1: r() * 6, p2: r() * 6 + i }));
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
  .jintro { position: fixed; inset: 0; z-index: 400; background: #000; font-family: 'Tiny5', monospace; color: #fff; user-select: none; -webkit-user-select: none; touch-action: manipulation; cursor: pointer; transition: opacity .45s; }
  .jintro.out { opacity: 0; pointer-events: none; }
  .jintro canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
  .ji-box { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(780px, calc(100% - 24px)); min-height: 92px; box-sizing: border-box; padding: 12px 18px 14px; background: rgba(12,8,28,.82); border: 3px solid #fff8ea; border-radius: 14px; box-shadow: 0 0 0 3px #1b1530, 0 6px 0 rgba(0,0,0,.4); font-size: clamp(16px, 2.4vw, 22px); line-height: 1.45; transition: opacity .3s; }
  .ji-box.off { opacity: 0; }
  .ji-box.narr { background: rgba(4,2,12,.6); border-color: rgba(255,255,255,.35); box-shadow: none; text-align: center; color: #e8e4ff; }
  .ji-who { display: block; color: #ffd84a; font-size: .78em; margin-bottom: 2px; }
  .ji-more { position: absolute; right: 14px; bottom: 8px; font-size: 14px; opacity: 0; }
  .ji-box.ready .ji-more { opacity: 1; animation: jiBlink .9s steps(2) infinite; }
  .ji-skip { position: absolute; top: 12px; right: 12px; z-index: 2; font: inherit; font-size: 16px; color: #fff; background: rgba(0,0,0,.45); border: 2px solid rgba(255,255,255,.6); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
  .ji-skip:hover { background: rgba(255,255,255,.15); }
  .ji-title { position: absolute; left: 0; right: 0; top: 30%; text-align: center; opacity: 0; transform: scale(.9); transition: opacity .9s, transform 1.2s cubic-bezier(.2,1.4,.4,1); pointer-events: none; }
  .ji-title.on { opacity: 1; transform: none; }
  .ji-title b { display: block; font-weight: 400; font-size: clamp(34px, 8vw, 88px); color: #ffd84a; letter-spacing: .04em; text-shadow: 0 4px 0 #a35a00, 0 8px 0 #1b1530, 0 0 34px rgba(255,216,74,.55); }
  .ji-title i { display: block; font-style: normal; font-size: clamp(16px, 3vw, 30px); color: #cfe3ff; margin-top: 12px; text-shadow: 0 3px 0 #1b1530; }
  @keyframes jiBlink { 50% { opacity: .15; } }`;
  function build() {
    if (!document.getElementById('jintroCss')) { const st = document.createElement('style'); st.id = 'jintroCss'; st.textContent = CSS; document.head.append(st); }
    root = document.createElement('div'); root.className = 'jintro';
    root.innerHTML = `<canvas></canvas><div class="ji-title"><b>POKéMON JOURNEY</b><i>The Eclipse of Valoria</i></div>
      <div class="ji-box off"><span class="ji-who"></span><span class="ji-t"></span><span class="ji-more">▼</span></div><button class="ji-skip">Skip ▸▸</button>`;
    document.body.append(root);
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
    art = document.createElement('canvas'); g = art.getContext('2d');
    ui = { box: root.querySelector('.ji-box'), who: root.querySelector('.ji-who'), text: root.querySelector('.ji-t'), title: root.querySelector('.ji-title') };
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
    flash = 0; shake = 0; last = 0;
    build();
    resize();
    const done = new Promise(r => resolveFn = r);
    await loadMons();
    if (!root) return done;                            // skipped while loading
    enter(0);
    raf = requestAnimationFrame(frame);
    return done;
  }
  return { play, get playing() { return !!root; }, _skip: () => finish(), _advance: () => advance(), _scene: () => sc && sc.id };
})();
