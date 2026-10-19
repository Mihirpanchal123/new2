'use strict';
// =====================================================================
//  BROADCAST — the "TV" layer: move banners, damage numbers, pop-ups,
//  overhead HP bars, the cinematic intro, trainer speech bubbles,
//  highlight reels and thumbnails
// =====================================================================
const Broadcast = (() => {
  const $id = id => document.getElementById(id);
  const layer = $id('fxLayer');
  const opts = { hpBars: true, highlights: true, channel: '' };
  const v = new THREE.Vector3(), tmp = new THREE.Vector3();
  const TYPE_BG = {
    Normal: '#a8a878', Fire: '#f08030', Water: '#6890f0', Electric: '#e8c020', Grass: '#58b848', Ice: '#68c8d8',
    Fighting: '#c03028', Poison: '#a040a0', Ground: '#c8a048', Flying: '#8878e0', Psychic: '#f85888', Bug: '#98a818',
    Rock: '#b8a038', Ghost: '#705898', Dragon: '#7038f8', Dark: '#5a4838', Steel: '#9898b8', Fairy: '#e888a8'
  };
  const toScreen = pos => {
    v.copy(pos).project(camera);
    const [w, h] = frameSize();
    return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h, v.z < 1];
  };
  const hudVisible = () => !$id('hud').classList.contains('hidden');
  const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };

  // ---- DOM elements anchored to 3D points, animated on the game clock ----
  const floaters = [];
  function floater(node, anchor, life, update) { layer.append(node); floaters.push({ node, anchor, life, age: 0, update }); }
  const hpBars = [0, 1].map(p => { const b = el(`ohp ohp${p}`, '<div class="ohp-name"></div><div class="ohp-bar"><div class="ohp-fill"></div></div>'); layer.append(b); return b; });
  updaters.push(dt => {
    const sdt = dt / SPEED;
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.age += sdt;
      const k = f.age / f.life;
      if (k >= 1) { f.node.remove(); floaters.splice(i, 1); continue; }
      const [x, y, vis] = toScreen(f.anchor());
      f.node.style.display = vis ? 'block' : 'none';
      f.update(f.node, k, x, y);
    }
    for (const p of [0, 1]) {
      const a = World.actors[p], bar = hpBars[p];
      const show = opts.hpBars && a.visible && a.form && hudVisible() && a.opacity > 0.5;
      bar.style.display = show ? 'block' : 'none';
      if (!show) continue;
      a.anchor('top', tmp); tmp.y += 0.45;
      const [x, y] = toScreen(tmp);
      bar.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      const f = clamp(a.hpFrac === undefined ? 1 : a.hpFrac, 0, 1);
      const fill = bar.lastChild.firstChild;
      fill.style.width = f * 100 + '%';
      fill.style.background = f > 0.5 ? '#22c55e' : f > 0.2 ? '#eab308' : '#ef4444';
    }
  });
  const setName = (p, name) => { hpBars[p].firstChild.textContent = name; };

  // ---- move banner, damage numbers, pop-ups, big centre text -------------
  const banner = (text, type = 'Normal') => {
    const b = $id('moveBanner');
    b.innerHTML = `<span>${text}</span>`;
    b.style.setProperty('--tc', TYPE_BG[type] || TYPE_BG.Normal);
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    SFX.banner();
  };
  const damage = (p, amount, { crit = false, eff = 1 } = {}) => {
    const cls = crit ? 'crit' : eff > 1 ? 'super' : eff < 1 ? 'weak' : '';
    const node = el(`dmg ${cls}`, `-${amount}`);
    const jitter = (Math.random() - 0.5) * 0.8;
    floater(node, () => World.anchor(p, 'top', tmp).add(v.set(jitter, 0.2, 0)), 1.3, (n, k, x, y) => {
      const s = k < 0.12 ? 0.4 + k / 0.12 * 0.9 : 1.3 - Math.min(0.3, (k - 0.12) * 1.5);
      n.style.transform = `translate(${x}px, ${y - k * 70}px) translate(-50%, -50%) scale(${s})`;
      n.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    });
  };
  const POP = { crit: 'CRITICAL HIT!', super: "IT'S SUPER EFFECTIVE!", weak: 'Not very effective…', immune: 'NO EFFECT', miss: 'MISS!', block: 'BLOCKED!', ko: 'K.O.!' };
  const pop = (p, kind) => {
    const node = el(`popx ${kind}`, POP[kind] || kind);
    floater(node, () => World.anchor(p, 'top', tmp).add(v.set(0, 1.1, 0)), 1.4, (n, k, x, y) => {
      const s = k < 0.1 ? 0.3 + k * 7 : 1;
      n.style.transform = `translate(${x}px, ${y - k * 25}px) translate(-50%, -50%) scale(${s})`;
      n.style.opacity = k > 0.75 ? (1 - k) / 0.25 : 1;
    });
  };
  const bigText = (text, cls = '', ms = 900) => {
    const b = $id('bigText');
    b.className = cls; b.innerHTML = text;
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    b.style.animationDuration = (ms * SPEED) + 'ms';
  };
  const speech = (p, text, ms = 2200) => {
    if (!text) return;
    const node = el(`speech s${p}`, text);
    const tr = World.trainers.list[p];
    floater(node, () => tmp.copy(tr.root.position).add(v.set(0, 3.4, 0)), ms / 1000, (n, k, x, y) => {
      n.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${k < 0.08 ? k / 0.08 : 1})`;
      n.style.opacity = k > 0.85 ? (1 - k) / 0.15 : 1;
    });
  };

  // ---- cinematic intro ------------------------------------------------------
  let skipResolve = null;
  $id('frame').addEventListener('pointerdown', () => skipResolve && skipResolve());
  addEventListener('keydown', e => { if (e.code === 'Space' && skipResolve) skipResolve(); });

  async function intro(o) {
    const L = $id('introLayer');
    let skipped = false;
    const skipP = new Promise(r => { skipResolve = () => { skipped = true; r(); }; });
    const step = ms => skipped ? Promise.resolve() : Promise.race([wait(ms), skipP]);
    L.innerHTML = '';
    L.classList.remove('hidden');
    AudioFX.Crowd.start();
    AudioFX.Music.start(0);
    World.trainers.hide();

    // 1. drone fly-over + title card
    const title = el('titleCard', `<div class="tc-no">BATTLE #${o.battleNo}</div>
      <div class="tc-vs"><span class="p0n">${o.names[0]}</span><b>VS</b><span class="p1n">${o.names[1]}</span></div>
      <div class="tc-sub">${o.subtitle || o.arena}</div>${opts.channel ? `<div class="tc-ch">${opts.channel}</div>` : ''}`);
    L.append(title);
    let ft = 0;
    const F = 3.3;
    World.camScript((dt) => {
      ft += dt;
      const k = Math.min(1, ft / F), e = ease(k);
      Cam.target.set(0, 0.8, 0);
      Cam.dist = lerp(52, 25, e); Cam.elev = lerp(0.42, 0.9, e); Cam.az = Cam.baseAz - 2.2 + 2.2 * e;
      camera.position.set(Math.sin(Cam.az) * Math.cos(Cam.elev) * Cam.dist, 0.8 + Math.sin(Cam.elev) * Cam.dist, Math.cos(Cam.az) * Math.cos(Cam.elev) * Cam.dist);
      camera.lookAt(Cam.target);
      return k < 1;
    });
    SFX.whoosh();
    World.cheer(0.7);
    await step(3300);
    title.classList.add('out');

    // 2. trainer walk-outs with lower-thirds
    for (const p of [0, 1]) {
      if (skipped) break;
      // look from the field towards the trainer, so the stands are the backdrop
      const ts = World.trainers.spot(p);
      World.focusPoint(ts.clone().multiplyScalar(0.97).setY(1.5), 8.5, 0.26, Math.atan2(-ts.x, -ts.z) + (p === 0 ? -0.55 : 0.55));
      const lt = el(`lowerThird lt${p}`, `<div class="lt-name">${o.names[p]}</div><div class="lt-sub">${o.records[p] || ''}</div>`);
      L.append(lt);
      World.trainers.walkIn(p, 1.5);
      World.cheer(0.6);
      await step(1500);
      speech(p, o.lines && o.lines[p], 1800);
      await step(900);
      lt.classList.add('out');
    }
    World.trainers.place();
    World.trainers.spotsOff();

    // 3. team reveal
    if (!skipped) {
      World.overview();
      const rv = el('reveal', [0, 1].map(p => `<div class="rv-side rv${p}"><div class="rv-name">${o.names[p]}</div><div class="rv-balls">${o.teams[p].map(m => `<div class="rv-card"><div class="rv-inner"><div class="rv-ball"></div><div class="rv-mon"><img src="${m.sprite}"><span>${m.name}</span></div></div></div>`).join('')}</div></div>`).join('<div class="rv-vs">VS</div>'));
      L.append(rv);
      const cards = [...rv.querySelectorAll('.rv-card')];
      for (let i = 0; i < cards.length && !skipped; i++) { cards[i].classList.add('flip'); SFX.reveal(i); await step(170); }
      await step(1400);
      rv.classList.add('out');
    }

    // 4. comment prompt
    if (!skipped) {
      const pr = el('prompt', `WHO WILL WIN?<div><span class="p0n">${o.names[0]}</span> or <span class="p1n">${o.names[1]}</span></div><small>Comment your pick below!</small>`);
      L.append(pr);
      await step(1800);
      pr.classList.add('out');
    }

    // 5. countdown
    World.overview();
    for (const n of [3, 2, 1]) { if (skipped) break; bigText(String(n), 'count', 650); SFX.beep(false); await step(650); }
    bigText('BATTLE START!', 'start', 1000);
    SFX.start();
    World.cheer(1);
    AudioFX.Music.setLevel(1);
    await step(600);
    skipResolve = null;
    World.trainers.place();
    World.trainers.spotsOff();
    L.classList.add('hidden');
    L.innerHTML = '';
  }

  // ---- highlights + thumbnails ------------------------------------------------
  const moments = [];
  let thumb = null;
  const addMoment = m => moments.push(m);
  async function captureThumb(score, headline) {
    if (thumb && thumb.score >= score) return;
    const url = await World.captureFrame();
    thumb = { score, url, headline };
  }
  async function thumbnailURL(names) {
    if (!thumb) return null;
    const img = new Image();
    img.src = thumb.url;
    await img.decode();
    const tall = img.height > img.width;
    const W = tall ? 720 : 1280, H = tall ? 1280 : 720;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const s = Math.max(W / img.width, H / img.height);
    g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    const grd = g.createLinearGradient(0, H * 0.45, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.8)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.lineJoin = 'round';
    const big = (txt, y, size, fill) => { g.font = `900 ${size}px Segoe UI, Arial Black, sans-serif`; g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(txt, W / 2, y); g.fillStyle = fill; g.fillText(txt, W / 2, y); };
    big(thumb.headline, H - (tall ? 260 : 150), tall ? 78 : 96, '#facc15');
    big(`${names[0]} vs ${names[1]}`, H - (tall ? 160 : 60), tall ? 52 : 56, '#ffffff');
    if (opts.channel) { g.font = '700 28px Segoe UI, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'left'; g.fillText(opts.channel, 30, 50); }
    return c.toDataURL('image/png');
  }
  // replay the top moments of the battle in slow motion
  async function reel() {
    const top = moments.slice().sort((a, b) => b.score - a.score).slice(0, 3);
    if (!top.length) return false;
    $id('hud').classList.add('hidden');
    World.actors.forEach(a => { a.visible = false; });
    bigText('HIGHLIGHTS', 'start', 1200);
    SFX.banner();
    await wait(1100);
    for (let i = 0; i < top.length; i++) {
      const m = top[i], a = m.side, d = 1 - m.side;
      await World.placeInstant(a, m.a);
      await World.placeInstant(d, m.d);
      World.actors[d].hpFrac = 1;
      World.overview();
      banner(`#${i + 1}  ${m.label}`, m.type);
      await wait(900);
      const slow = World.slowmo(0.55, 2400);
      await VFX.move(m.moveId, a, d, m.outcome);
      if (m.damage) damage(d, m.damage, m.outcome);
      if (m.outcome.crit) pop(d, 'crit'); else if (m.outcome.eff > 1) pop(d, 'super');
      await World.hit(d, a, m.power || 1, m.outcome);
      await slow;
      await wait(700);
    }
    World.actors.forEach(a => { a.visible = false; });
    return true;
  }

  return {
    opts, setName, banner, damage, pop, bigText, speech, intro, addMoment, captureThumb, thumbnailURL, reel,
    hasMoments: () => moments.length > 0,
    resetBattle() { moments.length = 0; thumb = null; floaters.splice(0).forEach(f => f.node.remove()); skipResolve = null; $id('introLayer').classList.add('hidden'); $id('introLayer').innerHTML = ''; },
    skipIntro() { if (skipResolve) skipResolve(); }
  };
})();
