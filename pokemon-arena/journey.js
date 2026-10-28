'use strict';
// =====================================================================
//  JOURNEY - the trainer's adventure across Valoria: walk the region's
//  towns, routes and houses (jmaps.js), talk to its people and follow its
//  story (jstory.js), catch wild Pokémon in the tall grass, battle
//  trainers and gym leaders with the animated battle engine (retro.js),
//  and grow your team (progress.js). Pixel art: jart.js.
// =====================================================================
const Journey = (() => {
  const SAVE_KEY = 'pokemon-arena-journey-v1';
  const TS = 16, WALK = 72, RUN = 128;
  const { ITEMS, BADGES, STARTERS, TRAINERS, T: TALK, META } = JStory;
  let G = null;                                        // the saved game
  const S = { map: null, solid: null, ground: [], npcs: [], player: null, keys: new Set(), event: false, menu: null, battle: false, warpLock: null, zoneLock: null, stepAcc: 0, frStep: 0, t: 0, lastT: 0, banner: null, hop: null, raf: 0, dialog: null, lastWin: false, emotes: [] };
  let active = false, root = null, cv = null, ctx = null, ui = null, scale = 3;
  const $q = (sel, el = root) => el.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sp = s => DEX.species[s];
  const dname = s => sp(s).display;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const sfx = (k, ...a) => { try { AudioFX.SFX[k](...a); } catch (e) {} };

  // =====================================================================
  //  The saved game
  // =====================================================================
  function newGame(name, outfit) {
    return { v: 1, name: name || 'Ash', outfit: outfit || 'red', map: 'home2f', x: 2 * TS + 8, y: 3 * TS + 13, dir: 'down', party: [], box: [], bag: {}, money: 3000,
      flags: {}, dex: { seen: {}, caught: {} }, badges: [], time: 0, lastCenter: null, steps: 0, repel: 0, created: Date.now() };
  }
  function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.v === 1 && validate(s) ? s : null; } catch (e) { return null; } }
  // keep only what still makes sense (a map, Pokémon and moves that exist)
  function validate(s) {
    if (!JMaps.M[s.map] || typeof s.name !== 'string') return false;
    const okMon = m => m && sp(m.species) && Array.isArray(m.moves) && m.moves.every(id => MOVES[id]) && m.level >= 1 && m.level <= 100;
    s.party = (s.party || []).filter(okMon); s.box = (s.box || []).filter(okMon);
    for (const m of [...s.party, ...s.box]) { m.pp = m.moves.map((id, i) => Math.min(MOVES[id].pp, (m.pp || [])[i] ?? MOVES[id].pp)); m.hp = Math.max(0, Math.min(Prog.hpMax(m.species, m.level), m.hp ?? 0)); m.friendship = m.friendship ?? 70; }
    s.bag = Object.fromEntries(Object.entries(s.bag || {}).filter(([k, n]) => ITEMS[k] && n > 0));
    s.flags = s.flags || {}; s.dex = s.dex || { seen: {}, caught: {} }; s.badges = (s.badges || []).filter(b => BADGES.some(x => x.id === b));
    // saves from before Chapter 2 existed: beating Luna now opens Route 2
    if (s.flags['badge.leaf']) s.flags.ch2 = true;
    return true;
  }
  function save(quiet = true) {
    if (!G) return;
    G.map = S.map ? S.map.id : G.map;
    if (S.player) { G.x = Math.round(S.player.x); G.y = Math.round(S.player.y); G.dir = S.player.dir; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); if (!quiet) toast('Game saved!'); } catch (e) { toast('Could not save (storage full?)'); }
  }
  const flag = k => !!G.flags[k];
  const conds = list => !list || list.every(c => c[0] === '!' ? !G.flags[c.slice(1)] : !!G.flags[c]);
  const bagN = id => G.bag[id] || 0;
  function addItem(id, n = 1) { G.bag[id] = bagN(id) + n; }
  function takeItem(id, n = 1) { G.bag[id] = Math.max(0, bagN(id) - n); if (!G.bag[id]) delete G.bag[id]; }

  // =====================================================================
  //  Maps: load, solidity, links
  // =====================================================================
  const lookOf = l => typeof l === 'string' ? (JMaps.L[l] || OUTFITS[l] || OUTFITS.red) : l;
  function loadMap(id, x, y, dir) {
    const m = JMaps.M[id];
    S.map = m;
    G.map = id;
    // the ground, painted once per map (two frames: water ripples, flowers sway)
    S.ground = [0, 1].map(fr => { const c = document.createElement('canvas'); c.width = m.w * TS; c.height = m.h * TS; const g = c.getContext('2d'); for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) JArt.tile(g, m, tx, ty, fr); return c; });
    S.npcs = m.npcs.map(n => ({ ...n, look: lookOf(n.look), px: n.x * TS + 8, py: n.y * TS + 13, homeX: n.x, homeY: n.y, tx: n.x, ty: n.y, step: 0, walkT: 0, moving: null, nextT: 1 + Math.random() * 3 }));
    for (const n of S.npcs) n.frames = JArt.person(n.look);
    S.player = { x, y, dir: dir || 'down', step: 0, walkT: 0, moving: false, frames: JArt.person(lookOf(G.outfit)) };
    S.warpLock = tileKey(...tileOf(x, y)); S.zoneLock = S.warpLock;
    refresh();
    palReset();
    if (m.kind !== 'inside' && (!S.banner || S.banner.id !== m.id)) showBanner(m.name);
    S.cam = null;
  }
  function refresh() {
    const m = S.map;
    S.solid = JMaps.solidGrid(m, G.flags);
    for (const n of S.npcs) n.hidden = !conds(n.show) || !!G.flags['gone.' + m.id + '.' + n.id];
  }
  const tileOf = (x, y) => [Math.floor(x / TS), Math.floor((y - 3) / TS)];
  const tileKey = (tx, ty) => tx + ',' + ty;
  const kindAt = (tx, ty) => { const r = S.map.rows[ty]; return r && r[tx] != null ? JArt.KIND[r[tx]] || 'grass' : null; };
  const chAt = (tx, ty) => { const r = S.map.rows[ty]; return r ? r[tx] : null; };
  function npcAtTile(tx, ty, except) { return S.npcs.find(n => !n.hidden && n !== except && (n.tx === tx && n.ty === ty || (n.moving && n.moving.tx === tx && n.moving.ty === ty))); }
  // is the tile blocked for walking (outside the map: only where an edge leads on)
  function blockedTile(tx, ty, who) {
    const m = S.map;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return !edgeFor(tx, ty);
    if (S.solid[ty][tx]) return true;
    if (who !== 'npc' && npcAtTile(tx, ty)) return true;
    if (who === 'npc' && (S.player && tileKey(...tileOf(S.player.x, S.player.y)) === tileKey(tx, ty))) return true;
    return false;
  }
  function edgeFor(tx, ty) {
    const m = S.map, side = ty < 0 ? 'n' : ty >= m.h ? 's' : tx < 0 ? 'w' : tx >= m.w ? 'e' : null;
    const e = side && m.edges[side];
    return e && conds(e.needs) ? { side, ...e } : null;
  }
  // the feet box of the player at (x, y)
  function boxFree(x, y, dirY) {
    const x0 = x - 5, x1 = x + 5, y0 = y - 5, y1 = y + 1;
    for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
      if (kindAt(tx, ty) === 'ledge') { if (dirY > 0) continue; return false; }
      if (blockedTile(tx, ty, 'player')) return false;
    }
    return true;
  }

  // =====================================================================
  //  Rendering
  // =====================================================================
  function resize() {
    if (!cv) return;
    const r = root.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    scale = Math.max(2, Math.round(Math.min(cv.width / (TS * 15), cv.height / (TS * 10))));
  }
  function personFrame(o) {
    const fr = o.frames[o.dir] || o.frames.down;
    return o.moving ? fr[[1, 0, 2, 0][Math.floor(o.walkT * (o.run ? 9 : 6.5)) % 4]] : fr[0];
  }
  function draw() {
    const m = S.map, p = S.player, mw = m.w * TS, mh = m.h * TS;
    // outdoors the map always fills the screen (a tall phone zooms in a little); rooms sit in the dark like the classics
    const k = m.kind === 'inside' ? scale : Math.min(8, Math.max(scale, Math.ceil(cv.height / mh), Math.ceil(cv.width / mw)));
    const W = cv.width / k, H = cv.height / k;
    let cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, p.x - W / 2));
    let cy = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, p.y - 8 - H / 2));
    cx = Math.round(cx); cy = Math.round(cy);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = m.kind === 'inside' ? '#18141e' : m.kind === 'cave' ? '#1a1612' : '#1d3a1a'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(k, 0, 0, k, -cx * k, -cy * k);
    ctx.drawImage(S.ground[Math.floor(S.t / 0.7) % 2], 0, 0);
    // everything that stands, back to front
    const list = [];
    const tx0 = Math.max(0, Math.floor(cx / TS) - 1), tx1 = Math.min(m.w - 1, Math.ceil((cx + W) / TS) + 1), ty0 = Math.max(0, Math.floor(cy / TS) - 1), ty1 = Math.min(m.h - 1, Math.ceil((cy + H) / TS) + 2);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = m.rows[ty][tx], k = JArt.KIND[ch];
      if (k === 'tree') list.push({ y: ty * TS + 15, img: JArt.tree((tx * 7 + ty * 3) % 3), x: tx * TS - 2, dy: 0 });
      else if (k === 'pine') list.push({ y: ty * TS + 15, img: JArt.pine(), x: tx * TS - 1, dy: 0 });
      else if (k === 'bush') list.push({ y: ty * TS + 15, img: JArt.bush(), x: tx * TS, dy: 0 });
      else if (k === 'rock') list.push({ y: ty * TS + 15, img: JArt.rock(), x: tx * TS, dy: 0 });
      else if (ch === 'X' && !G.flags['cut.' + m.id + '.' + tx + '.' + ty]) list.push({ y: ty * TS + 15, img: JArt.bush(), x: tx * TS, dy: 0, cut: true });
    }
    for (const b of m.buildings) { const img = JArt.building(b.b, b.variant || 0); list.push({ y: (b.y + JArt.BUILD[b.b].h) * TS - 1, img, x: b.x * TS, dy: 0, abs: (b.y + JArt.BUILD[b.b].h) * TS - img.height }); }
    for (const f of m.furniture) { const img = JArt.furniture(f.k), F0 = JArt.FURN[f.k]; list.push({ y: (f.y + F0.h) * TS - 1, img, x: f.x * TS, abs: (f.y + F0.h) * TS - img.height + 2 }); }
    for (const s of m.signs) list.push({ y: s.y * TS + 14, img: JArt.sign(), x: s.x * TS, abs: s.y * TS });
    for (const pr of m.props) {
      if (pr.k === 'bigtree') list.push({ y: (pr.y + 3) * TS - 1, img: bigTree(), x: pr.x * TS - 8, abs: (pr.y + 3) * TS - bigTree().height });
      else list.push({ y: pr.y * TS + 14, img: JArt[pr.k](), x: pr.x * TS + 2, abs: pr.y * TS + 16 - JArt[pr.k]().height });
    }
    for (const it of m.items) if (!it.hidden && !G.flags['it.' + m.id + '.' + it.x + '.' + it.y]) list.push({ y: it.y * TS + 12, img: it.item === 'shard' ? JArt.shard() : JArt.ballItem(), x: it.x * TS + 3, abs: it.y * TS + 4 });
    for (const n of S.npcs) if (!n.hidden) list.push({ y: n.py, person: n });
    list.push({ y: p.y + 0.5, person: p, me: true });
    if (pal.actor && palMon()) list.push({ y: pal.y, pal: true });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.pal) drawPal();
      else if (o.person) drawPerson(o.person);
      else ctx.drawImage(o.img, o.x, o.abs != null ? o.abs : o.y - o.img.height + 1 + (o.dy || 0));
    }
    // hidden items twinkle now and then
    for (const it of m.items) if (it.hidden && !G.flags['it.' + m.id + '.' + it.x + '.' + it.y]) { const ph = (S.t + it.x * 0.37 + it.y * 0.21) % 4; if (ph < 0.35) { ctx.fillStyle = 'rgba(255,255,255,.9)'; const s = ph < 0.17 ? 1 : 2; ctx.fillRect(it.x * TS + 7 - s, it.y * TS + 8, s * 2 + 1, 1); ctx.fillRect(it.x * TS + 7, it.y * TS + 8 - s, 1, s * 2 + 1); } }
    // emotes ("!")
    for (const e of S.emotes) { const o = e.who; ctx.fillStyle = '#ffffff'; ctx.fillRect(o.px - 4 || 0, o.py - 34, 9, 10); ctx.fillStyle = '#202028'; ctx.fillRect(o.px - 4, o.py - 34, 9, 1); ctx.fillRect(o.px - 4, o.py - 25, 9, 1); ctx.fillRect(o.px - 4, o.py - 34, 1, 10); ctx.fillRect(o.px + 4, o.py - 34, 1, 10); ctx.fillStyle = '#e04848'; ctx.fillRect(o.px, o.py - 32, 1, 4); ctx.fillRect(o.px, o.py - 27, 1, 1); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (m.dark) { const gr = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.25, cv.width / 2, cv.height / 2, cv.height * 0.85); const tint = m.kind === 'cave' ? '14,10,24' : '10,30,10'; gr.addColorStop(0, `rgba(${tint},0)`); gr.addColorStop(1, `rgba(${tint},${m.dark * 2})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height); }
  }
  let BIG = null;
  function bigTree() {
    if (BIG) return BIG;
    const c = document.createElement('canvas'); c.width = 64; c.height = 70; const g = c.getContext('2d');
    const P = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    P('#6a4428', 24, 40, 16, 28); P('#4a2e1a', 36, 40, 4, 28); P('#4a2e1a', 16, 62, 32, 6); P('#6a4428', 12, 64, 10, 4); P('#6a4428', 42, 64, 10, 4);
    P('#2e7a3a', 2, 18, 60, 28); P('#3c9446', 6, 6, 52, 34); P('#4aa850', 12, 2, 40, 26); P('#6cc464', 18, 6, 14, 8); P('#2e7a3a', 6, 40, 52, 4);
    for (let i = 0; i < 14; i++) P('#2e7a3a', 8 + (i * 13) % 46, 10 + (i * 7) % 28, 3, 2);
    P('#b88aff', 30, 56, 4, 4); P('#e0d0ff', 31, 57, 2, 2);
    BIG = c; return c;
  }
  function drawPerson(o) {
    const img = personFrame(o), x = Math.round(o.px ?? o.x), y = Math.round((o.py ?? o.y) - (o.hopZ || 0));
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 5, Math.round(o.py ?? o.y) - 1, 10, 2); ctx.fillRect(x - 4, Math.round(o.py ?? o.y) - 2, 8, 4);
    ctx.drawImage(img, x - 8, y - 21);
    const [tx, ty] = tileOf(o.px ?? o.x, o.py ?? o.y);
    if (kindAt(tx, ty) === 'tall' && !o.hopZ) ctx.drawImage(JArt.tallFront(), tx * TS, ty * TS);
  }

  // ---- the partner: the first Pokémon in the party that can still battle walks behind you. It follows your exact
  // path (a trail of your positions) PAL_GAP pixels back, so it never needs its own collision; A on it says how it feels.
  const PAL_GAP = 20;
  const pal = { species: null, actor: null, x: 0, y: 0, trail: [], face: 1, heart: 0 };
  const palMon = () => G && G.party.find(m => m.hp > 0);
  function palReset() {
    const p = S.player, [dx, dy] = DIRS[p.dir] || [0, 1];
    let x = p.x - dx * 16, y = p.y - dy * 16;
    const [tx, ty] = tileOf(x, y);
    if (tx < 0 || ty < 0 || tx >= S.map.w || ty >= S.map.h || S.solid[ty][tx]) { x = p.x; y = p.y; }
    pal.x = x; pal.y = y; pal.trail = [{ x, y }, { x: p.x, y: p.y }];
  }
  function stepPal(dt) {
    const m = palMon(), sp = m ? m.species : null;
    if (sp !== pal.species) {
      pal.species = sp; pal.actor = null;
      if (sp && typeof PixelMons !== 'undefined') PixelMons.create(sp).then(a => { if (pal.species === sp) pal.actor = a; }).catch(() => {});
    }
    if (!sp) return;
    const p = S.player, last = pal.trail[pal.trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 1) pal.trail.push({ x: p.x, y: p.y });
    // walk back along the trail from the player
    let need = PAL_GAP, i = pal.trail.length - 1, x = pal.trail[0].x, y = pal.trail[0].y;
    for (; i > 0; i--) {
      const a = pal.trail[i], b = pal.trail[i - 1], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d >= need) { x = a.x + (b.x - a.x) * need / d; y = a.y + (b.y - a.y) * need / d; break; }
      need -= d;
    }
    if (i > 1) pal.trail.splice(0, i - 1);              // what lies further back is never needed again
    const vx = (x - pal.x) / Math.max(dt, 1e-3), vy = (y - pal.y) / Math.max(dt, 1e-3), moving = Math.hypot(x - pal.x, y - pal.y) > 0.05;
    pal.x = x; pal.y = y;
    if (moving && Math.abs(vx) > 4) pal.face = Math.sign(vx);
    if (pal.actor) pal.actor.drive(dt, { moving, vx, vy, face: pal.face });
    pal.heart = Math.max(0, pal.heart - dt);
  }
  function drawPal() {
    const A = pal.actor.anim, k = A.bh > 30 ? 30 / A.bh : 1, x = Math.round(pal.x), y = Math.round(pal.y);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 4, y - 2, 8, 4);
    ctx.drawImage(A.frames[0].img, Math.round(x - A.foot[0] * k), Math.round(y + 1 - A.foot[1] * k), Math.round(A.w * k), Math.round(A.h * k));
    const [tx, ty] = tileOf(pal.x, pal.y);
    if (kindAt(tx, ty) === 'tall') ctx.drawImage(JArt.tallFront(), tx * TS, ty * TS);
    if (pal.heart > 0) {
      const hy = Math.round(y - A.bh * k - 10 - (1.6 - pal.heart) * 4);
      ctx.fillStyle = '#ff5a7a';
      for (const [dx, dy, w] of [[-3, 0, 2], [1, 0, 2], [-4, 1, 7], [-4, 2, 7], [-3, 3, 5], [-2, 4, 3], [-1, 5, 1]]) ctx.fillRect(x + dx, hy + dy, w, 1);
    }
  }
  // is the partner right in front of you?
  function palAhead() {
    if (!pal.actor || !palMon()) return false;
    const p = S.player, [dx, dy] = DIRS[p.dir];
    return Math.hypot(pal.x - (p.x + dx * 16), pal.y - (p.y + dy * 16)) < 12;
  }
  function talkPal() {
    const m = palMon(), n = Prog.nameOf(m), max = Prog.hpMax(m.species, m.level);
    pal.heart = 1.6; pal.actor.play('win'); sfx('pop');
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const line = m.status === 'slp' ? `${n} is yawning... it looks sleepy.`
      : m.status ? `${n} doesn't look well. A visit to the Pokémon Center would help.`
      : m.hp < max / 3 ? `${n} looks tired, but it's doing its best to keep up with you.`
      : m.friendship >= 220 ? pick([`${n} snuggles up to you. It loves being with you!`, `${n} is overjoyed to be walking with you!`])
      : m.friendship >= 150 ? pick([`${n} is happily keeping pace with you.`, `${n} hums along cheerfully.`, `${n} looks up at you with sparkling eyes.`])
      : m.friendship >= 90 ? pick([`${n} is looking around curiously.`, `${n} sniffs the air.`, `${n} gives a little cry.`])
      : pick([`${n} glances at you, still getting used to you.`, `${n} is keeping a careful eye on its surroundings.`]);
    return runScript(J => J.say(line));
  }

  // =====================================================================
  //  The world turning: input, walking, people, warps, grass
  // =====================================================================
  function inputVec() {
    const k = S.keys;
    let x = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), y = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0);
    if (S.stick && (Math.abs(S.stick.x) > 0.25 || Math.abs(S.stick.y) > 0.25)) { x = S.stick.x; y = S.stick.y; }
    return { x, y };
  }
  function step(dt) {
    S.t += dt;
    if (G) G.time += dt;
    for (const e of S.emotes) e.t -= dt;
    S.emotes = S.emotes.filter(e => e.t > 0);
    stepNpcs(dt);
    const p = S.player;
    if (S.hop) { stepHop(dt); return; }
    if (S.event || S.menu || S.battle || S.scripted || S.travel) { p.moving = !!S.scripted; return; }
    let { x: ix, y: iy } = inputVec();
    if (!ix && !iy) { p.moving = false; S.runHeld = false; return; }
    // the dominant direction sets the facing
    p.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'down' : 'up');
    const L = Math.hypot(ix, iy); ix /= L; iy /= L;
    p.run = (S.keys.has('run') || S.runBtn) && flag('shoes');
    const v = (p.run ? RUN : WALK) * dt;
    const ox = p.x, oy = p.y;
    // ledges: walking down onto one hops over it
    const [ftx, fty] = tileOf(p.x, p.y + 6);
    if (iy > 0.6 && kindAt(ftx, Math.floor((p.y + 2) / TS)) === 'ledge') { startHop(); return; }
    moveAxis(p, ix * v, 0, iy);
    moveAxis(p, 0, iy * v, iy);
    // slide around corners: blocked straight ahead but free a few pixels to the side
    if (p.x === ox && p.y === oy) cornerAssist(p, ix, iy, v);
    p.moving = p.x !== ox || p.y !== oy;
    if (p.moving) p.walkT += dt; else p.walkT = 0;
    const moved = Math.hypot(p.x - ox, p.y - oy);
    afterMove(moved, ix, iy);
  }
  function moveAxis(p, dx, dy, iy) {
    if (!dx && !dy) return;
    const nx = p.x + dx, ny = p.y + dy;
    if (boxFree(nx, ny, iy)) { p.x = nx; p.y = ny; return; }
    // leaving the map through an edge
    const [tx, ty] = tileOf(nx + Math.sign(dx) * 5, ny + Math.sign(dy) * 2);
    const e = (tx < 0 || ty < 0 || tx >= S.map.w || ty >= S.map.h) && edgeFor(tx, ty);
    if (e) { p.x = nx; p.y = ny; }
  }
  function cornerAssist(p, ix, iy, v) {
    const horiz = Math.abs(ix) > Math.abs(iy);
    for (const s of [1, -1]) for (let k = 2; k <= 7; k++) {
      const ox = horiz ? 0 : s * k, oy = horiz ? s * k : 0;
      if (boxFree(p.x + ox, p.y + oy, iy) && boxFree(p.x + ox + ix * 2, p.y + oy + iy * 2, iy)) { p.x += horiz ? 0 : s * Math.min(v, 1.2); p.y += horiz ? s * Math.min(v, 1.2) : 0; return; }
    }
  }
  function startHop() {
    const p = S.player, [tx] = tileOf(p.x, p.y), ty = Math.floor((p.y + 2) / TS);
    S.hop = { t: 0, y0: p.y, y1: (ty + 1) * TS + 13, x: tx * TS + 8 };
    p.dir = 'down'; sfx('whoosh');
  }
  function stepHop(dt) {
    const p = S.player, h = S.hop;
    h.t += dt / 0.38;
    const k = Math.min(1, h.t);
    p.y = h.y0 + (h.y1 - h.y0) * k; p.x += (h.x - p.x) * Math.min(1, dt * 10); p.hopZ = Math.sin(k * Math.PI) * 9; p.moving = true; p.walkT += dt;
    if (k >= 1) { p.hopZ = 0; S.hop = null; p.moving = false; }
  }
  function afterMove(moved, ix, iy) {
    const p = S.player, m = S.map;
    const [tx, ty] = tileOf(p.x, p.y), key = tileKey(tx, ty);
    // off the map: on to the next one
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return crossEdge(tx, ty);
    if (S.warpLock && S.warpLock !== key) S.warpLock = null;
    if (S.zoneLock && S.zoneLock !== key) S.zoneLock = null;
    // doors (walking up into one), mats (walking down), stairs
    if (!S.warpLock) {
      for (const b of m.buildings) for (const d of JMaps.doorsOf(b)) if (d.x === tx && d.y === ty && iy < 0) return enterBuilding(b);
      if (chAt(tx, ty) === 'm' && iy > 0 && m.outside) return exitBuilding();
      for (const w of m.warps) if (w.x === tx && w.y === ty) return warpTo(w.to, w.tx, w.ty, w.dir);
    }
    if (!S.zoneLock) for (const z of m.zones) if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h && conds(META[z.event] && META[z.event].needs) && conds(z.needs)) { S.zoneLock = key; return runEvent(z.event); }
    // trainers who see you
    if (spotCheck()) return;
    // steps: tall grass, friendship, repel
    if (moved > 0) {
      S.stepAcc += moved;
      while (S.stepAcc >= TS) {
        S.stepAcc -= TS; G.steps++;
        if (G.repel > 0 && --G.repel === 0) toast('The Repel wore off.');
        if (G.steps % 128 === 0) for (const mon of G.party) mon.friendship = Math.min(255, mon.friendship + 1);
        // wild Pokémon: in tall grass, anywhere on a cave floor, and in deep snow
        const enc = m.encounters && { tall: m.encounters.tall, cave: m.encounters.cave, snow: m.encounters.snow }[kindAt(tx, ty)];
        if (enc && Math.random() < enc.rate) { const w = rollWild(enc); if (w) return wildBattle(w); }
      }
    }
  }
  function rollWild(enc) {
    const total = enc.table.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total, species = enc.table[0][0];
    for (const [s, w] of enc.table) { if ((r -= w) < 0) { species = s; break; } }
    const level = enc.min + Math.floor(Math.random() * (enc.max - enc.min + 1));
    const lead = G.party.find(m => m.hp > 0);
    if (G.repel > 0 && lead && level < lead.level) return null;
    return { species, level };
  }
  function crossEdge(tx, ty) {
    const e = edgeFor(tx, ty), p = S.player;
    if (!e) return;
    const to = JMaps.M[e.to];
    let x = p.x, y = p.y;
    if (e.side === 'n') { x = p.x + (e.dx || 0) * TS; y = to.h * TS - 4; }
    if (e.side === 's') { x = p.x + (e.dx || 0) * TS; y = 13; }
    if (e.side === 'w') { x = to.w * TS - 6; y = p.y + (e.dy || 0) * TS; }
    if (e.side === 'e') { x = 6; y = p.y + (e.dy || 0) * TS; }
    loadMap(e.to, x, y, p.dir);
    save();
  }
  // one way through a door, mat or stairs at a time: the map only changes at the end of the fade, and until then the
  // player stands still. (Without this every frame on the tile set off another trip; the later ones reloaded the map
  // under a trainer who had already started walking up, and that walk never finished: the game hung.)
  async function passage(fn) {
    if (S.travel) return;
    S.travel = true; S.player.moving = false;
    try { await fn(); } finally { S.travel = false; }
  }
  function enterBuilding(b) {
    return passage(async () => {
      const p = S.player;
      if (!conds(b.needs)) { await runEvent(b.locked); p.y += 6; S.warpLock = tileKey(...tileOf(p.x, p.y)); return; }
      const to = JMaps.M[b.to];
      sfx('lock');
      await fade(() => loadMap(b.to, to.arrive.x * TS + 8, to.arrive.y * TS + 13, 'up'));
      if (to.isCenter) G.lastCenter = { map: to.id };
      save();
    });
  }
  function exitBuilding() {
    return passage(async () => {
      const m = S.map, out = JMaps.M[m.outside], b = out.buildings.find(bb => bb.to === m.id), d = JMaps.doorsOf(b)[0];
      sfx('lock');
      await fade(() => loadMap(out.id, d.x * TS + (JArt.BUILD[b.b].door.length > 1 ? 16 : 8), (d.y + 1) * TS + 13, 'down'));
      save();
    });
  }
  function warpTo(id, tx, ty, dir) { return passage(async () => { sfx('lock'); await fade(() => loadMap(id, tx * TS + 8, ty * TS + 13, dir)); save(); }); }

  // ---- people: wandering, scripted walks, trainers' eyes
  function stepNpcs(dt) {
    for (const n of S.npcs) {
      if (n.hidden) continue;
      if (n.moving) {
        const tx = n.moving.tx * TS + 8, ty = n.moving.ty * TS + 13, sp0 = (n.moving.speed || 56) * dt;
        const dx = tx - n.px, dy = ty - n.py, d = Math.hypot(dx, dy);
        n.walkT += dt;
        if (d <= sp0) { n.px = tx; n.py = ty; n.tx = n.moving.tx; n.ty = n.moving.ty; const done = n.moving.done; n.moving = null; if (done) done(); }
        else { n.px += dx / d * sp0; n.py += dy / d * sp0; }
        continue;
      }
      n.walkT = 0;
      if (!n.wander || S.event || S.menu) continue;
      n.nextT -= dt;
      if (n.nextT > 0) continue;
      n.nextT = 1.5 + Math.random() * 3;
      const dir = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)], [dx, dy] = DIRS[dir];
      n.dir = dir;
      const nx = n.tx + dx, ny = n.ty + dy;
      if (Math.abs(nx - n.homeX) > n.wander || Math.abs(ny - n.homeY) > n.wander || blockedTile(nx, ny, 'npc') || npcAtTile(nx, ny, n)) continue;
      n.moving = { tx: nx, ty: ny, speed: 40 };
    }
  }
  function npcWalk(n, dir, k, speed = 64) {
    return new Promise(res => {
      let left = k;
      const next = () => {
        if (left-- <= 0) return res();
        const [dx, dy] = DIRS[dir]; n.dir = dir;
        n.moving = { tx: n.tx + dx, ty: n.ty + dy, speed, done: next };
      };
      next();
    });
  }
  function spotCheck() {
    if (S.event) return false;
    const [ptx, pty] = tileOf(S.player.x, S.player.y);
    for (const n of S.npcs) {
      if (n.hidden || !n.trainer || G.flags[trFlag(n)] || n.moving) continue;
      const [dx, dy] = DIRS[n.dir], sight = TRAINERS[n.trainer].sight || 4;
      for (let k = 1; k <= sight; k++) {
        const tx = n.tx + dx * k, ty = n.ty + dy * k;
        if (S.solid[ty] == null || S.solid[ty][tx] || kindAt(tx, ty) == null) break;
        if (tx === ptx && ty === pty) { runTrainer(n, true); return true; }
        if (npcAtTile(tx, ty, n)) break;
      }
    }
    return false;
  }
  const trFlag = n => 'tr.' + S.map.id + '.' + n.id;

  // =====================================================================
  //  Interacting: what is in front of you
  // =====================================================================
  function interact() {
    if (S.event || S.menu || S.battle || S.hop) return;
    const p = S.player, [dx, dy] = DIRS[p.dir], [tx, ty] = tileOf(p.x, p.y), fx = tx + dx, fy = ty + dy, m = S.map;
    let n = npcAtTile(fx, fy);
    // across a counter (Nurse, clerk)
    if (!n) { const f2 = npcAtTile(fx + dx, fy + dy); if (f2 && f2.counter) n = f2; }
    if (n) return talkTo(n);
    const sign = m.signs.find(s => s.x === fx && s.y === fy);
    if (sign) return runScript(J => J.say(sign.text));
    const it = m.items.find(i => i.x === fx && i.y === fy && !G.flags['it.' + m.id + '.' + i.x + '.' + i.y]) || m.items.find(i => i.hidden && i.x === tx && i.y === ty && !G.flags['it.' + m.id + '.' + i.x + '.' + i.y]);
    if (it) return runScript(async J => { G.flags['it.' + m.id + '.' + it.x + '.' + it.y] = true; refresh(); await J.give(it.item, it.n || 1, true); });
    if (chAt(fx, fy) === 'X' && !G.flags['cut.' + m.id + '.' + fx + '.' + fy]) return runEvent('cutTree', { x: fx, y: fy });
    for (const f of m.furniture) { const F0 = JArt.FURN[f.k]; if (f.talk && fx >= f.x && fx < f.x + F0.w && fy >= f.y && fy < f.y + F0.h) return runEvent(f.talk); }
    if (palAhead()) return talkPal();
  }
  function talkTo(n) {
    if (!n.moving) n.dir = OPP[S.player.dir];
    if (n.trainer) return runTrainer(n, false);
    if (n.talk) return runEvent(n.talk, n);
  }
  async function runTrainer(n, spotted) {
    const tr = TRAINERS[n.trainer];
    await runScript(async J => {
      if (G.flags[trFlag(n)]) return J.say(tr.after || '...', n);
      if (spotted) {
        S.player.moving = false;
        J.emote(n, '!'); sfx('beep', true);
        await J.wait(600);
        // walk up to the player
        const [ptx, pty] = tileOf(S.player.x, S.player.y);
        const k = Math.abs(ptx - n.tx) + Math.abs(pty - n.ty) - 1;
        if (k > 0) await npcWalk(n, n.dir, k, 80);
        S.player.dir = OPP[n.dir];
      }
      await J.say(tr.before, n);
      const r = await J.battle(n.trainer, n);
      if (r === 'win') { G.flags[trFlag(n)] = true; if (tr.onWin) await TALK[tr.onWin](J, n); }
    });
  }
  async function runEvent(id, ctx) {
    const fn = TALK[id];
    if (!fn) return;
    await runScript(J => fn(J, ctx));
  }
  async function runScript(fn) {
    if (S.event) return;
    S.event = true; S.player.moving = false;
    try { await fn(J); }
    catch (e) { if (e && e.message !== 'left') console.error(e); }
    finally { S.event = false; S.scripted = false; closeDialog(); if (active) save(); }
  }

  // =====================================================================
  //  The dialog box
  // =====================================================================
  const fill = s => String(s).replace(/\{NAME\}/g, G.name).replace(/\{RIVAL\}/g, 'Sora');
  function whoOf(who) {
    if (!who) return null;
    if (typeof who === 'string') { const n = S.npcs.find(x => x.id === who); return n ? { name: n.name || '', face: n.frames.face } : { name: who }; }
    if (who.frames) return { name: who.name || '', face: who.frames.face };
    if (who.look) return { name: who.name, face: JArt.person(lookOf(who.look)).face };
    return who;
  }
  function showDialog(text, who) {
    const w = whoOf(who), box = ui.dialog;
    box.classList.remove('hidden');
    box.querySelector('.jd-name').textContent = w && w.name ? w.name : '';
    box.querySelector('.jd-name').classList.toggle('hidden', !(w && w.name));
    const face = box.querySelector('.jd-face');
    face.classList.toggle('hidden', !(w && w.face)); if (w && w.face) face.src = w.face;
    box.querySelector('.jd-opts').innerHTML = '';
    const t = box.querySelector('.jd-text');
    const full = fill(text);
    return new Promise(res => {
      let i = 0;
      S.dialog = { full, done: false, res, skip: () => { i = full.length; } };
      t.textContent = ''; box.classList.remove('more');
      const tick = () => {
        if (!active || !S.dialog || S.dialog.full !== full) return;
        i = Math.min(full.length, i + 2);
        t.textContent = full.slice(0, i);
        if (i < full.length) S.dialog.timer = setTimeout(tick, 22);
        else { S.dialog.done = true; box.classList.add('more'); }
      };
      tick();
    });
  }
  function advance() {
    const d = S.dialog;
    if (!d || d.opts) return;
    if (!d.done) { clearTimeout(d.timer); d.skip(); ui.dialog.querySelector('.jd-text').textContent = d.full; d.done = true; ui.dialog.classList.add('more'); return; }
    sfx('lock');
    S.dialog = null;
    d.res();
  }
  function closeDialog() { if (ui) ui.dialog.classList.add('hidden'); S.dialog = null; }
  async function say(text, who) {
    for (const t of Array.isArray(text) ? text : [text]) await showDialog(t, who);
  }
  async function ask(text, opts, who) {
    await showDialog(text, who).catch(() => {});
    return choose(opts);
  }
  // options next to the text (keys 1-9, arrows + A, click)
  function choose(opts) {
    return new Promise(res => {
      const box = ui.dialog, el = box.querySelector('.jd-opts');
      box.classList.remove('hidden', 'more');
      let sel = 0;
      const render = () => { el.innerHTML = opts.map((o, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}"><b>${i + 1}</b> ${esc(o)}</button>`).join(''); };
      render();
      const pickI = i => { el.innerHTML = ''; S.dialog = null; sfx('lock'); res(i); };
      S.dialog = { opts, done: true, move: d => { sel = (sel + d + opts.length) % opts.length; render(); }, pick: () => pickI(sel), pickI };
      el.onclick = e => { const b = e.target.closest('[data-i]'); if (b) pickI(+b.dataset.i); };
    });
  }
  // dialog shown while the full text is being typed: a click on the box advances
  function fade(fn) {
    return new Promise(res => {
      ui.fade.classList.add('on');
      setTimeout(async () => { try { await fn(); } catch (e) { console.error(e); } setTimeout(() => { ui.fade.classList.remove('on'); setTimeout(res, 260); }, 60); }, 260);
    });
  }
  function showBanner(name) {
    S.banner = { id: S.map.id };
    const b = ui.banner; b.textContent = name; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  // =====================================================================
  //  Pokémon: party, catching, XP, moves, evolution
  // =====================================================================
  function addMon(species, level, o = {}) {
    const m = Prog.newMon(species, level, o);
    G.dex.seen[species] = true; G.dex.caught[species] = true;
    if (G.party.length < 6) G.party.push(m); else G.box.push(m);
    return m;
  }
  async function gainXp(m, n) {
    m.xp += n;
    let grew = false;
    while (m.level < 100 && m.xp >= Prog.xpAt(m.species, m.level + 1)) {
      const before = Prog.hpMax(m.species, m.level);
      m.level++; grew = true;
      if (m.hp > 0) m.hp += Prog.hpMax(m.species, m.level) - before;
      m.friendship = Math.min(255, m.friendship + 2);
      sfx('buff');
      await say(`${Prog.nameOf(m)} grew to Lv. ${m.level}!`, { name: '', face: sp(m.species).sprite });
      for (const id of Prog.movesAt(m.species, m.level)) await learnMove(m, id);
    }
    if (grew) { const to = Prog.evoTarget(m, { why: 'level' }); if (to) await evolve(m, to); }
  }
  async function learnMove(m, id) {
    if (m.moves.includes(id) || !MOVES[id]) return;
    const nm = MOVES[id].name;
    if (m.moves.length < 4) { m.moves.push(id); m.pp.push(MOVES[id].pp); sfx('heal'); return say(`${Prog.nameOf(m)} learned ${nm}!`); }
    await say(`${Prog.nameOf(m)} wants to learn ${nm}, but it already knows four moves.`);
    const i = await ask(`Forget a move to learn ${nm}?`, [...m.moves.map(x => MOVES[x].name), `Don't learn ${nm}`]);
    if (i >= 4) return say(`${Prog.nameOf(m)} did not learn ${nm}.`);
    const old = MOVES[m.moves[i]].name;
    m.moves[i] = id; m.pp[i] = MOVES[id].pp;
    sfx('heal');
    await say(`1, 2 and... Poof! ${Prog.nameOf(m)} forgot ${old} and learned ${nm}!`);
  }
  // the evolution scene; B / Stop cancels it
  async function evolve(m, to) {
    const from = sp(m.species);
    await say(`What? ${Prog.nameOf(m)} is evolving!`);
    const el = ui.evo;
    el.innerHTML = `<div class="je-stage"><img class="je-a" src="${from.sprite}" alt=""><img class="je-b" src="${sp(to).sprite}" alt=""></div><div class="je-txt">${esc(Prog.nameOf(m))} is evolving...</div><button class="je-stop">Stop (B)</button>`;
    el.classList.remove('hidden');
    sfx('mega');
    const stopped = await new Promise(res => {
      let done = false;
      const fin = v => { if (done) return; done = true; S.evoStop = null; res(v); };
      el.querySelector('.je-stop').onclick = () => fin(true);
      S.evoStop = () => fin(true);
      el.classList.add('go');
      setTimeout(() => fin(false), 4200);
    });
    el.classList.remove('go');
    if (stopped) { el.classList.add('hidden'); return say(`Huh? ${Prog.nameOf(m)} stopped evolving!`); }
    el.classList.add('done');
    const oldName = Prog.nameOf(m), before = Prog.hpMax(m.species, m.level);
    m.species = to;
    if (m.hp > 0) m.hp += Prog.hpMax(to, m.level) - before;
    G.dex.seen[to] = G.dex.caught[to] = true;
    sfx('buff'); try { AudioFX.Music.victory(); } catch (e) {}
    el.querySelector('.je-txt').textContent = `Congratulations! ${oldName} evolved into ${dname(to)}!`;
    await new Promise(r => setTimeout(r, 2400));
    el.classList.add('hidden'); el.classList.remove('done');
    for (const id of Prog.movesAt(to, m.level)) await learnMove(m, id);
  }

  // =====================================================================
  //  Battles: the bridge to the battle engine
  // =====================================================================
  function wildBattle(w) {
    G.dex.seen[w.species] = true;
    return runScript(async J => {
      sfx('banner');
      await battleFlash();
      await J.battle({ wild: true, team: [[w.species, w.level]], theme: S.map.battle || 'forest' });
    });
  }
  function battleFlash() {
    return new Promise(res => { ui.fade.classList.add('flash'); setTimeout(() => { ui.fade.classList.remove('flash'); res(); }, 700); });
  }
  // a battle: def = a trainer id (TRAINERS) or { wild, team: [[species, level]], name, look, pay, before, lose, win, canLose, theme }
  async function battle(def, npc) {
    const id = typeof def === 'string' ? def : def.id;
    const tr = typeof def === 'string' ? { id, ...TRAINERS[def] } : def;
    const team = G.party.filter(m => m.hp > 0);
    if (!team.length) { await whiteout(); return 'lose'; }       // (nothing left to battle with: the Center, not a silent loss)
    const wild = !!tr.wild;
    const name = wild ? 'Wild ' + dname(tr.team[0][0]) : tr.name || (npc && npc.name) || 'Trainer';
    const look = wild ? null : lookOf(tr.look || (npc && npc.look) || 'man');
    const foes = tr.team.map(([s, L]) => ({ species: s, level: L, mega: null, moves: Prog.movesFor(s, L) }));
    for (const f of foes) G.dex.seen[f.species] = true;
    // the global battle settings, put back afterwards
    const saved = { controllers: controllers.slice(), names: PLAYER.slice(), outfits: settings.outfits.slice(), theme: settings.theme, hpMult: settings.hpMult };
    controllers[0] = Journey._auto ? 'cpu' : 'human'; controllers[1] = 'cpu';   // _auto: tests let the computer play your side
    PLAYER[0] = G.name; PLAYER[1] = name;
    settings.outfits = [lookOf(G.outfit), look || OUTFITS.red]; settings.theme = tr.theme || S.map.battle || 'forest'; settings.hpMult = 1;
    S.battle = true; S.keys.clear(); S.stick = null;
    root.classList.add('hidden');
    S.btl = { wild, foes: foes.length, team, throwing: false };
    let result;
    try {
      result = await new Promise(res => {
        const meta = { journey: { wild, title: wild ? `A WILD ${dname(tr.team[0][0]).toUpperCase()} APPEARED!` : `${name.toUpperCase()} WANTS TO BATTLE!`, cmd: c => battleCmd(c), onEnd: res },
          lines: [null, wild ? null : tr.before ? fill(tr.before).slice(0, 60) : null], endLines: wild ? null : [null, { win: tr.win || 'Hah!', lose: tr.lose || 'Oh no!' }] };
        startBattle([team.map(Prog.spec), foes], meta);
      });
    } finally {
      Object.assign(settings, { outfits: saved.outfits, theme: saved.theme, hpMult: saved.hpMult });
      saved.controllers.forEach((c, i) => controllers[i] = c); saved.names.forEach((n, i) => PLAYER[i] = n);
    }
    // what happened to our team
    const bt = state.players[0].team, ft = state.players[1].team;
    bt.forEach((b, i) => { const m = team[i]; if (!m) return; m.hp = Math.max(0, Math.round(b.hp)); m.status = b.hp > 0 ? b.status : null; m.pp = b.moves.map(x => x.ppLeft); m.fought = !!b.fought; });
    abortBattle();
    hideBattleMenu();
    S.battle = false;
    root.classList.remove('hidden');
    resize();
    try { AudioFX.Music.start(0); } catch (e) {}
    save();
    if (result && result.caught) {
      const f = ft[0];
      const m = addMon(f.species, f.level, { moves: f.moves.map(x => x.id), ball: S.btl.ball || 'poke', met: S.map.name });
      m.hp = Math.max(1, Math.round(f.hp)); m.status = f.status || null; m.pp = f.moves.map(x => x.ppLeft);
      await say(`Gotcha! ${dname(f.species)} was caught!`);
      if (G.box.includes(m)) await say(`Your party is full, so ${dname(f.species)} was sent to the PC box.`);
      if (Object.keys(G.dex.caught).length === 1) await say(`${dname(f.species)}'s data was added to the Pokédex.`);
      await shareXp(team, ft, false);
      save(); return 'caught';
    }
    if (result && result.ran) { await say('Got away safely!'); return 'ran'; }
    let win = result === 0;
    // the last Pokémon on both sides fainted together: a draw, and a draw with nothing left standing is a loss -
    // walking on with a fainted team would make every later battle end before it starts
    if (win && !G.party.some(m => m.hp > 0)) { win = false; await say('Both sides\' last Pokémon fainted at the same time... It\'s a draw!'); }
    S.lastWin = win;
    if (win) {
      await shareXp(team, ft, !wild);
      if (!wild) {
        const pay = (tr.pay || 20) * tr.team[tr.team.length - 1][1];
        G.money += pay;
        await say(`You defeated ${name}! You got ¥${pay} for winning!`);
      }
      return 'win';
    }
    if (tr.canLose) { for (const m of G.party) Prog.healFull(m); return 'lose'; }
    await whiteout();
    return 'lose';
  }
  // XP for every knocked-out foe, shared by the team members who fought (the Exp. Share gives the others half)
  async function shareXp(team, foes, trainer) {
    for (const f of foes) {
      if (f.hp > 0 && !f.caught) continue;
      for (const m of team) {
        if (m.hp <= 0) continue;
        const full = m.fought || team.length === 1;
        if (!full && !flag('expshare')) continue;
        const n = Math.max(1, Math.floor(Prog.xpYield(f.species, f.level, m.level, trainer) * (full ? 1 : 0.5)));
        await say(`${Prog.nameOf(m)} gained ${n} Exp. Points!`);
        await gainXp(m, n);
      }
    }
    for (const m of team) delete m.fought;
  }
  async function whiteout() {
    const lost = Math.floor(G.money / 2);
    G.money -= lost;
    await say([`You are out of usable Pokémon!`, `You panicked and dropped ¥${lost}...`, '... ... ...']);
    for (const m of G.party) Prog.healFull(m);
    await fade(() => {
      if (G.lastCenter && JMaps.M[G.lastCenter.map]) { const c = JMaps.M[G.lastCenter.map]; loadMap(c.id, c.arrive.x * TS + 8, (c.arrive.y - 2) * TS + 13, 'up'); }
      else loadMap('home1f', 6 * TS + 8, 5 * TS + 13, 'right');
    });
    await say(S.map.isCenter ? 'Your Pokémon have been healed. Please be more careful out there!' : 'You hurried home. Mom nursed your Pokémon back to health.');
    save();
  }
  // ---- the trainer's commands in a battle (retro.js shows the buttons)
  function battleCmd(c) {
    const R = Retro.journey;
    if (!R.running || S.btl.throwing) return;
    if (c === 'run') { if (S.btl.wild) { sfx('whoosh'); R.finish({ ran: true }); } return; }
    if (c === 'ball') {
      const balls = Object.keys(ITEMS).filter(k => ITEMS[k].pocket === 'balls' && bagN(k) > 0);
      if (!balls.length) { toast('You have no Poké Balls!'); return; }
      if (balls.length === 1) return throwBall(balls[0]);
      return battleMenu('Throw which ball?', balls.map(k => ({ label: `${ITEMS[k].name} ×${bagN(k)}`, fn: () => throwBall(k) })));
    }
    if (c === 'bag') {
      const meds = Object.keys(ITEMS).filter(k => ITEMS[k].pocket === 'medicine' && bagN(k) > 0 && !ITEMS[k].candy);
      if (!meds.length) { toast('No medicine in your Bag!'); return; }
      battleMenu('Use which item?', meds.map(k => ({ label: `${ITEMS[k].name} ×${bagN(k)}`, fn: () => battleMenu(`Use ${ITEMS[k].name} on...`, state.players[0].team.map((b, i) => ({ label: `${b.name} ${Math.ceil(Math.max(0, b.hp))}/${b.maxhp}${b.status ? ' ' + b.status.toUpperCase() : ''}`, fn: () => useInBattle(k, i) }))) })));
    }
  }
  async function throwBall(k) {
    hideBattleMenu();
    const R = Retro.journey, f = state.players[1].team[0], it = ITEMS[k];
    takeItem(k);
    S.btl.throwing = true; S.btl.ball = k;
    const r = Prog.catchRoll(f, sp(f.species).catchRate || 45, it.ball);
    try { const got = await R.throwBall({ col: it.col, band: it.band, shakes: r.shakes, caught: r.caught }); if (got) f.caught = true; }
    finally { S.btl.throwing = false; }
  }
  function useInBattle(k, i) {
    hideBattleMenu();
    const b = state.players[0].team[i], it = ITEMS[k], R = Retro.journey;
    const ok = applyItem(it, b, true);
    if (!ok) { toast('It won\'t have any effect.'); return; }
    takeItem(k);
    if (state.players[0].active === i) { R.healFx(0); const me = R.me(); if (me) me.cd = Math.max(me.cd || 0, 1.4); }
    toast(`Used ${it.name} on ${b.name}.`);
  }
  // item effects on a battle mon or a party member (hp field, status, maxhp from either)
  function applyItem(it, m, inBattle) {
    const max = inBattle ? m.maxhp : Prog.hpMax(m.species, m.level);
    if (it.revive) { if (m.hp > 0) return false; m.hp = Math.floor(max * it.revive); if (!inBattle) m.status = null; return true; }
    if (m.hp <= 0) return false;
    let did = false;
    if (it.heal && m.hp < max) { m.hp = Math.min(max, m.hp + it.heal); did = true; }
    if (it.cure && m.status && it.cure.includes(m.status)) { m.status = null; did = true; }
    return did;
  }
  function battleMenu(title, opts) {
    PAUSED = true;
    const el = ui.bmenu;
    el.innerHTML = `<div class="jb-box"><b>${esc(title)}</b>${opts.map((o, i) => `<button data-i="${i}">${esc(o.label)}</button>`).join('')}<button data-i="x" class="x">Back</button></div>`;
    el.classList.remove('hidden');
    el.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; if (b.dataset.i === 'x') return hideBattleMenu(); const o = opts[+b.dataset.i]; PAUSED = false; o.fn(); };
  }
  function hideBattleMenu() { if (!ui) return; ui.bmenu.classList.add('hidden'); if (S.battle) PAUSED = false; }

  // =====================================================================
  //  Menus: start menu, party, bag, Pokédex, trainer card, shop, PC
  // =====================================================================
  function openMenu(kind, data) {
    if (S.event && data === undefined) return;           // during a scene only a script opens a menu (with data: 0 counts)
    S.menu = kind; S.keys.clear();
    ui.panel.classList.remove('hidden');
    renderPanel(kind, data);
  }
  function closeMenu() { S.menu = null; ui.panel.classList.add('hidden'); ui.panel.innerHTML = ''; if (S.menuDone) { const d = S.menuDone; S.menuDone = null; d(); } }
  const hpBar = (hp, max) => { const k = Math.max(0, hp / max); return `<div class="jhp"><i style="width:${(k * 100).toFixed(0)}%;background:${k > 0.5 ? '#3ddc68' : k > 0.2 ? '#f5c518' : '#ef4444'}"></i></div>`; };
  const typeChips = s => sp(s).types.map(t => `<span class="jt" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('');
  function monRow(m, i, extra = '') {
    const max = Prog.hpMax(m.species, m.level);
    return `<button class="jmon ${m.hp <= 0 ? 'down' : ''}" data-m="${i}"><img src="${sp(m.species).sprite}" alt=""><div><b>${esc(Prog.nameOf(m))}</b> <small>Lv ${m.level}</small> ${m.status ? `<span class="jst">${m.status.toUpperCase()}</span>` : ''}<br>${hpBar(m.hp, max)}<small>${m.hp}/${max} HP</small></div>${extra}</button>`;
  }
  function renderPanel(kind, data) {
    const el = ui.panel;
    const head = (t, back = 'menu') => `<div class="jp-head"><b>${t}</b><button data-a="${back}">✕</button></div>`;
    if (kind === 'menu') {
      el.innerHTML = `<div class="jp jp-menu">${[['party', 'POKéMON', G.party.length > 0], ['dex', 'POKéDEX', flag('dex')], ['bag', 'BAG', true], ['card', G.name.toUpperCase(), true], ['save', 'SAVE', true], ['exit', 'EXIT', true], ['close', 'CLOSE', true]].filter(x => x[2]).map(([a, t]) => `<button data-a="${a}">${t}</button>`).join('')}</div>`;
    } else if (kind === 'party') {
      el.innerHTML = `<div class="jp">${head('POKéMON')}<div class="jparty">${G.party.map((m, i) => `<div class="jpslot"><span class="jgrip" title="Drag to move"><i></i><i></i><i></i></span>${monRow(m, i, i === 0 ? '<em class="lead">LEAD</em>' : '')}</div>`).join('')}</div>${G.party.length > 1 ? '<div class="jhint">Drag a Pokémon up or down to change the order. The first one goes out first in battle.</div>' : ''}</div>`;
    } else if (kind === 'mon') {
      const m = G.party[data], s = sp(m.species), st = calcStats(s.base, m.level), max = Prog.hpMax(m.species, m.level);
      const next = m.level < 100 ? Prog.xpAt(m.species, m.level + 1) - m.xp : 0;
      el.innerHTML = `<div class="jp">${head(esc(Prog.nameOf(m)), 'party')}<div class="jsum"><img src="${s.sprite}" alt=""><div><b>${esc(s.display)}</b> Lv ${m.level} ${typeChips(m.species)}<br>${hpBar(m.hp, max)}<small>${m.hp}/${max} HP · ${next} XP to next level · Friendship ${'♥'.repeat(1 + Math.floor(m.friendship / 64))}</small></div></div>
        <div class="jstats">${[['ATK', st.atk], ['DEF', st.def], ['SP.ATK', st.spa], ['SP.DEF', st.spd], ['SPEED', st.spe]].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div>
        <div class="jmoves">${m.moves.map((id, i) => `<div style="--c:${TYPE_COLORS[MOVES[id].type]}"><b>${esc(MOVES[id].name)}</b><small>${MOVES[id].type} · ${MOVES[id].cat} · ${MOVES[id].power || '-'} pow · PP ${m.pp[i]}/${MOVES[id].pp}</small></div>`).join('')}</div>
        <div class="jrow">${data > 0 ? `<button data-a="lead" data-m="${data}">Put first</button>` : ''}<small>Met: ${esc(m.met || 'Valoria')} · ${esc(ITEMS[m.ball] ? ITEMS[m.ball].name : 'Poké Ball')}</small></div></div>`;
    } else if (kind === 'bag') {
      const pocket = data || 'items', P0 = { items: 'Items', medicine: 'Medicine', balls: 'Poké Balls', tms: 'TMs', key: 'Key Items' };
      const list = Object.keys(G.bag).filter(k => ITEMS[k].pocket === pocket);
      el.innerHTML = `<div class="jp">${head('BAG')}<div class="jtabs">${Object.entries(P0).map(([k, t]) => `<button data-a="pocket" data-p="${k}" class="${k === pocket ? 'on' : ''}">${t}</button>`).join('')}</div>
        ${list.length ? list.map(k => `<button class="jitem" data-a="item" data-i="${k}"><b>${esc(ITEMS[k].name)}</b><span>×${G.bag[k]}</span><small>${esc(ITEMS[k].desc)}</small></button>`).join('') : '<div class="jempty">Nothing here yet.</div>'}
        <div class="jrow"><small>Money: ¥${G.money}</small></div></div>`;
    } else if (kind === 'useOn') {
      const it = ITEMS[data];
      el.innerHTML = `<div class="jp">${head('Use ' + esc(it.name) + ' on...', 'bag')}${G.party.map((m, i) => monRow(m, i, canUse(it, m) ? '<em class="ok">ABLE</em>' : '<em>-</em>')).join('')}</div>`;
      el.dataset.item = data;
    } else if (kind === 'dex') {
      const seen = Object.keys(G.dex.seen).length, caught = Object.keys(G.dex.caught).length;
      el.innerHTML = `<div class="jp jp-wide">${head(`POKéDEX · Seen ${seen} · Caught ${caught}`)}<div class="jdex">${DEX.order.map(n => { const s = sp(n), c = G.dex.caught[n], se = G.dex.seen[n]; return `<div class="${c ? 'c' : se ? 's' : 'u'}" title="${se ? esc(s.display) : '???'}"><small>${String(s.id).padStart(4, '0')}</small>${se ? `<img loading="lazy" src="${s.sprite}" alt="">` : '<i>?</i>'}<span>${se ? esc(s.display) : '???'}</span>${c ? '<b>●</b>' : ''}</div>`; }).join('')}</div></div>`;
    } else if (kind === 'card') {
      const h = Math.floor(G.time / 3600), mi = Math.floor(G.time / 60) % 60;
      el.innerHTML = `<div class="jp">${head('TRAINER CARD')}<div class="jcard"><img src="${JArt.person(lookOf(G.outfit)).face}" alt=""><div><b>${esc(G.name)}</b><br>Money ¥${G.money}<br>Pokédex ${Object.keys(G.dex.caught).length} caught<br>Time ${h}:${String(mi).padStart(2, '0')}</div></div>
        <div class="jbadges">${BADGES.map(b => `<div class="${G.badges.includes(b.id) ? 'got' : ''}" style="--c:${b.col}" title="${b.name} (${b.leader})"><i></i><small>${b.name.replace(' Badge', '')}</small></div>`).join('')}</div></div>`;
    } else if (kind === 'shop') {
      const stock = S.map.stock || ['poke', 'potion'];
      const mode = data || 'buy';
      const list = mode === 'buy' ? stock : Object.keys(G.bag).filter(k => ITEMS[k].price > 0);
      el.innerHTML = `<div class="jp">${head('POKé MART · ¥' + G.money, 'close')}<div class="jtabs"><button data-a="shopmode" data-p="buy" class="${mode === 'buy' ? 'on' : ''}">Buy</button><button data-a="shopmode" data-p="sell" class="${mode === 'sell' ? 'on' : ''}">Sell</button></div>
        ${list.length ? list.map(k => { const pr = mode === 'buy' ? ITEMS[k].price : Math.floor(ITEMS[k].price / 2); return `<div class="jshop"><div><b>${esc(ITEMS[k].name)}</b> <small>${mode === 'sell' ? 'You have ' + bagN(k) : esc(ITEMS[k].desc)}</small></div><span>¥${pr}</span>${[1, 5, 10].map(q => `<button data-a="${mode}" data-i="${k}" data-q="${q}" ${mode === 'buy' ? (G.money < pr * q ? 'disabled' : '') : (bagN(k) < q ? 'disabled' : '')}>×${q}</button>`).join('')}</div>`; }).join('') : '<div class="jempty">Nothing to sell.</div>'}</div>`;
    } else if (kind === 'pc') {
      el.innerHTML = `<div class="jp jp-wide">${head('POKéMON STORAGE', 'close')}<div class="jpc"><div><b>Party (${G.party.length}/6)</b>${G.party.map((m, i) => monRow(m, i, '<em>Deposit</em>').replace('data-m=', 'data-a="dep" data-m=')).join('')}</div>
        <div><b>Box (${G.box.length})</b>${G.box.length ? G.box.map((m, i) => monRow(m, i, '<em>Withdraw</em>').replace('data-m=', 'data-a="wd" data-m=')).join('') : '<div class="jempty">The box is empty.</div>'}</div></div></div>`;
    } else if (kind === 'starter') {
      const r = data || 0, [region, trio] = STARTERS[r];
      el.innerHTML = `<div class="jp jp-wide">${head('CHOOSE YOUR PARTNER', 'none')}<div class="jtabs">${STARTERS.map(([n], i) => `<button data-a="region" data-p="${i}" class="${i === r ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="jstart">${trio.map(s => `<button data-a="pickStarter" data-i="${s}"><img src="${sp(s).sprite}" alt=""><b>${esc(dname(s))}</b>${typeChips(s)}</button>`).join('')}</div><div class="jrow"><small>${region} starters. Pick any region's trio!</small></div></div>`;
    }
  }
  // the party list: drag a Pokémon up or down to reorder it (mouse: anywhere on its row; touch: by its grip, so the
  // list still scrolls). The others slide aside to show where it will land; a plain tap still opens its summary.
  function partyDrag(e) {
    if (S.menu !== 'party' || e.button > 0) return;
    const slot = e.target.closest('.jpslot');
    if (!slot) return;
    const grip = !!e.target.closest('.jgrip');
    if (e.pointerType !== 'mouse' && !grip) return;
    const list = slot.parentElement, slots = [...list.children], from = slots.indexOf(slot), last = slots.length - 1;
    if (last < 1) return;
    e.preventDefault();                                  // no native image drag or text selection
    const tops = slots.map(x => x.getBoundingClientRect().top), pitch = tops[1] - tops[0], y0 = e.clientY;
    let dragging = false, to = from;
    const move = ev => {
      if (!dragging) {
        if (Math.abs(ev.clientY - y0) < (grip ? 3 : 8)) return;
        dragging = true; slot.classList.add('drag'); list.classList.add('dragging');
      }
      ev.preventDefault();
      const dy = Math.max(tops[0] - tops[from], Math.min(tops[last] - tops[from], ev.clientY - y0));
      slot.style.transform = `translateY(${dy}px)`;
      const t = Math.max(0, Math.min(last, Math.round(from + dy / pitch)));
      if (t !== to) { to = t; sfx('lock'); }
      slots.forEach((x, i) => { if (x === slot) return; const sh = from < to && i > from && i <= to ? -pitch : from > to && i >= to && i < from ? pitch : 0; x.style.transform = sh ? `translateY(${sh}px)` : ''; });
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (!dragging) return;
      // the click that ends a drag is not a tap on the row
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener('click', swallow, true); setTimeout(() => removeEventListener('click', swallow, true), 60);
      if (to !== from) { G.party.splice(to, 0, G.party.splice(from, 1)[0]); sfx('pop'); save(); }
      if (S.menu === 'party') renderPanel('party');
    };
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  const canUse = (it, m) => it.revive ? m.hp <= 0 : it.heal ? m.hp > 0 && m.hp < Prog.hpMax(m.species, m.level) : it.cure ? !!m.status && it.cure.includes(m.status) && m.hp > 0 : it.candy ? m.level < 100 : it.evo ? !!Prog.evoTarget(m, { why: 'item', item: it.evo }) : it.tm ? tmOk(m, it.tm) : false;
  const tmOk = (m, id) => !m.moves.includes(id) && (tmMoves(m.species).includes(id) || sp(m.species).learnset.some(([, x]) => x === id));
  async function panelClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.a, k = S.menu;
    sfx('lock');
    if (a === 'none') return;
    if (a === 'close') return closeMenu();
    if (a === 'menu') return renderPanel(S.menu = 'menu');
    if (k === 'menu') {
      if (a === 'save') { save(false); return closeMenu(); }
      if (a === 'exit') { closeMenu(); save(); exitToBuilder(); return; }
      return renderPanel(S.menu = a);
    }
    if (a === 'party') return renderPanel(S.menu = 'party');
    if (a === 'bag') return renderPanel(S.menu = 'bag');
    if (k === 'party' && b.dataset.m != null) return renderPanel(S.menu = 'mon', +b.dataset.m);
    if (a === 'lead') { const i = +b.dataset.m; G.party.unshift(G.party.splice(i, 1)[0]); return renderPanel(S.menu = 'party'); }
    if (a === 'pocket') return renderPanel('bag', b.dataset.p);
    if (a === 'item') {
      const it = ITEMS[b.dataset.i];
      if (it.repel) { G.repel = it.repel; takeItem(b.dataset.i); toast('Wild Pokémon will stay away for a while.'); return renderPanel('bag', it.pocket); }
      if (it.heal || it.cure || it.revive || it.candy || it.evo || it.tm) return renderPanel(S.menu = 'useOn', b.dataset.i);
      toast(it.desc); return;
    }
    if (k === 'useOn' && b.dataset.m != null) {
      const id = ui.panel.dataset.item, it = ITEMS[id], m = G.party[+b.dataset.m];
      if (!canUse(it, m)) { toast('It won\'t have any effect.'); return; }
      closeMenu();
      await runScript(async () => {
        if (it.candy) { takeItem(id); await say(`${Prog.nameOf(m)} ate the Rare Candy!`); await gainXp(m, Prog.xpAt(m.species, m.level + 1) - m.xp); return; }
        if (it.evo) { takeItem(id); return evolve(m, Prog.evoTarget(m, { why: 'item', item: it.evo })); }
        if (it.tm) {
          if (m.moves.length < 4) { m.moves.push(it.tm); m.pp.push(MOVES[it.tm].pp); sfx('heal'); return say(`${Prog.nameOf(m)} learned ${MOVES[it.tm].name}!`); }
          return learnMove(m, it.tm);
        }
        takeItem(id); applyItem(it, m, false); sfx('heal');
        await say(`Used the ${it.name} on ${Prog.nameOf(m)}.`);
      });
      return;
    }
    if (a === 'shopmode') return renderPanel('shop', b.dataset.p);
    if (a === 'buy') { const id = b.dataset.i, q = +b.dataset.q, pr = ITEMS[id].price * q; if (G.money < pr) return; G.money -= pr; addItem(id, q); sfx('pop'); toast(`Bought ${q} ${ITEMS[id].name}${q > 1 ? 's' : ''}.`); return renderPanel('shop', 'buy'); }
    if (a === 'sell') { const id = b.dataset.i, q = +b.dataset.q; if (bagN(id) < q) return; takeItem(id, q); G.money += Math.floor(ITEMS[id].price / 2) * q; sfx('pop'); return renderPanel('shop', 'sell'); }
    if (a === 'dep') { if (G.party.length <= 1) { toast('You can\'t deposit your last Pokémon!'); return; } G.box.push(G.party.splice(+b.dataset.m, 1)[0]); return renderPanel('pc'); }
    if (a === 'wd') { if (G.party.length >= 6) { toast('Your party is full!'); return; } G.party.push(G.box.splice(+b.dataset.m, 1)[0]); return renderPanel('pc'); }
    if (a === 'region') return renderPanel('starter', +b.dataset.p);
    if (a === 'pickStarter' && S.pickRes) { const s = b.dataset.i; const r = S.pickRes; S.pickRes = null; closeMenu(); r(s); }
  }

  // =====================================================================
  //  J - the api the story scripts use
  // =====================================================================
  const findNpc = id => typeof id === 'string' ? S.npcs.find(n => n.id === id) : id;
  const J = {
    say: (t, who) => say(t, who && typeof who === 'string' ? findNpc(who) || who : who),
    ask: (t, opts, who) => ask(t, opts, who && typeof who === 'string' ? findNpc(who) || who : who),
    flag, get: k => G.flags[k], set: (k, v = true) => { G.flags[k] = v; }, unset: k => { delete G.flags[k]; },
    has: id => bagN(id), take: (id, n = 1) => takeItem(id, n), money: n => { G.money += n; },
    badges: () => G.badges.length,
    pick: a => a[Math.floor(Math.random() * a.length)],
    dname, wait: ms => new Promise(r => setTimeout(r, ms)),
    async give(id, n = 1, found) {
      n = n || 1; addItem(id, n); sfx('buff');
      const nm = ITEMS[id] ? ITEMS[id].name : id;
      await say(`${found ? 'You found' : 'You received'} ${n > 1 ? n + ' ' : ''}${nm}${n > 1 && !/s$/.test(nm) ? 's' : ''}!${found ? '' : ''}`);
      if (found && ITEMS[id]) await say(`You put the ${nm} in the ${{ items: 'Items', medicine: 'Medicine', balls: 'Poké Balls', tms: 'TMs', key: 'Key Items' }[ITEMS[id].pocket]} pocket.`);
    },
    async heal(jingle) { for (const m of G.party) Prog.healFull(m); if (jingle) { sfx('heal'); await J.wait(900); } },
    async healCenter() {
      const n = S.npcs.find(x => x.id === 'nurse');
      if (n) n.dir = 'right';
      await J.wait(300);
      for (let i = 0; i < Math.min(6, G.party.length); i++) { sfx('beep', false); await J.wait(260); }
      sfx('heal'); await J.wait(1100);
      for (const m of G.party) Prog.healFull(m);
      if (n) n.dir = 'down';
      G.lastCenter = { map: S.map.id };
    },
    battle: (def, npc) => battle(def, npc && typeof npc === 'string' ? findNpc(npc) : npc).then(r => { S.lastWin = r === 'win'; return r; }),
    lastWin: () => S.lastWin,
    async walk(id, [dir, k]) { const n = findNpc(id); if (n) await npcWalk(n, dir, k); },
    async face(id, dir) { const n = findNpc(id); if (n) n.dir = dir; },
    emote(id, ch) { const n = findNpc(id); if (n) S.emotes.push({ who: n, ch, t: 1 }); },
    async playerWalk(dir, k) {
      const p = S.player, [dx, dy] = DIRS[dir];
      S.scripted = true; p.dir = dir;
      const tx = p.x + dx * TS * k, ty = p.y + dy * TS * k;
      while (Math.hypot(tx - p.x, ty - p.y) > 1) { await new Promise(r => requestAnimationFrame(r)); const d = Math.min(Math.hypot(tx - p.x, ty - p.y), 1.4); p.x += dx * d; p.y += dy * d; p.walkT += 1 / 60; }
      p.x = tx; p.y = ty; S.scripted = false; p.moving = false;
      S.zoneLock = tileKey(...tileOf(p.x, p.y));
    },
    showNpc(id) { const n = findNpc(id); if (n) n.hidden = false; },
    hideNpc(id) { const n = findNpc(id); if (n) { n.hidden = true; G.flags['gone.' + S.map.id + '.' + n.id] = true; } },
    fade: fn => fade(fn),
    refresh: () => refresh(),
    addMon: (s, L, o) => addMon(s, L, o),
    pickStarter: () => new Promise(res => { S.pickRes = res; openMenu('starter', 0); }).then(async s => {
      const a = await ask(`${dname(s)}, the ${sp(s).types.join('/')} Pokémon. Is this your choice?`, ['Yes!', 'Let me think...']);
      return a === 0 ? s : J.pickStarter();
    }),
    rivalStarter(s) { for (const [, trio] of STARTERS) { const i = trio.indexOf(s); if (i >= 0) return trio[(i + 1) % 3]; } return 'eevee'; },
    // a trainer's Pokémon at level L: evolved as far as that level allows (Sora's starter grows with her)
    grown(s, L) { let m = { species: s, level: L, friendship: 0 }, to; while ((to = Prog.evoTarget(m, { why: 'level' }))) m = { ...m, species: to }; return m.species; },
    badge(id) { if (!G.badges.includes(id)) G.badges.push(id); G.flags['badge.' + id] = true; const b = BADGES.find(x => x.id === id); sfx('buff'); try { AudioFX.Music.victory(); } catch (e) {} showChapter(`${G.name} received the ${b.name}!`, '', b.col); },
    async cut(c) {
      sfx('slash');
      await say('Scyther, CUT!', { name: 'Ride Pager' });
      G.flags['cut.' + S.map.id + '.' + c.x + '.' + c.y] = true; refresh(); sfx('slash');
    },
    async chapter(title, sub) { showChapter(title, sub); await J.wait(3200); },
    // a ride somewhere else (the ferry, a train): fade out, arrive at (x, y) on map id
    travel: (id, x, y, dir = 'down') => fade(() => { loadMap(id, x * TS + 8, y * TS + 13, dir); save(); }),
    pc: () => new Promise(res => { S.menuDone = res; openMenu('pc', true); }),
    shop: () => new Promise(res => { S.menuDone = res; openMenu('shop', 'buy'); })
  };
  function showChapter(title, sub, col) {
    const el = ui.chapter;
    el.innerHTML = `<b style="${col ? `color:${col}` : ''}">${esc(fill(title))}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  // =====================================================================
  //  Input
  // =====================================================================
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run' };
  function onKey(e) {
    if (!active || S.battle || e.target.tagName === 'INPUT') return;
    const k = KEYMAP[e.code];
    // the dialog
    if (S.dialog) {
      if (S.dialog.opts) {
        if (k === 'up' || k === 'left') { S.dialog.move(-1); e.preventDefault(); }
        else if (k === 'down' || k === 'right') { S.dialog.move(1); e.preventDefault(); }
        else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyZ') { S.dialog.pick(); e.preventDefault(); }
        else if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < S.dialog.opts.length) S.dialog.pickI(i); }
        else if (e.code === 'Escape' || e.code === 'KeyX') S.dialog.pickI(S.dialog.opts.length - 1);
        return;
      }
      if (['Enter', 'Space', 'KeyE', 'KeyZ', 'KeyX', 'Escape'].includes(e.code)) { advance(); e.preventDefault(); }
      return;
    }
    if (S.evoStop && (e.code === 'KeyX' || e.code === 'Escape' || e.code === 'Backspace')) { S.evoStop(); return; }
    if (S.menu) { if (e.code === 'Escape' || e.code === 'KeyM') { if (S.menu === 'starter') return; S.menu === 'menu' || S.menu === 'shop' || S.menu === 'pc' ? closeMenu() : renderPanel(S.menu = 'menu'); } return; }
    if (k) { S.keys.add(k); e.preventDefault(); return; }
    if (['Enter', 'Space', 'KeyE', 'KeyZ'].includes(e.code)) { e.preventDefault(); interact(); return; }
    if ((e.code === 'Escape' || e.code === 'KeyM') && !S.event) { openMenu('menu'); e.preventDefault(); }
  }
  function onKeyUp(e) { const k = KEYMAP[e.code]; if (k) S.keys.delete(k); }
  // touch: a stick on the left, A / B on the right, a menu button
  function bindTouch() {
    const t = ui.touch, stick = t.querySelector('.jt-stick'), knob = stick.querySelector('i');
    let id = null, ox = 0, oy = 0;
    stick.addEventListener('pointerdown', e => { id = e.pointerId; const r = stick.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
    const move = e => { if (e.pointerId !== id) return; const dx = e.clientX - ox, dy = e.clientY - oy, L = Math.hypot(dx, dy), R0 = 46, k = Math.min(1, L / R0); S.stick = L ? { x: dx / L * k, y: dy / L * k } : null; knob.style.transform = `translate(${dx / (L || 1) * Math.min(L, R0)}px, ${dy / (L || 1) * Math.min(L, R0)}px)`; };
    stick.addEventListener('pointermove', move);
    const up = e => { if (e.pointerId !== id) return; id = null; S.stick = null; knob.style.transform = ''; };
    stick.addEventListener('pointerup', up); stick.addEventListener('pointercancel', up);
    t.querySelector('.jt-a').addEventListener('pointerdown', e => { e.preventDefault(); if (S.dialog) { S.dialog.opts ? S.dialog.pick() : advance(); } else interact(); });
    const b = t.querySelector('.jt-b');
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (S.evoStop) return S.evoStop(); if (S.dialog && !S.dialog.opts) return advance(); S.runBtn = true; });
    b.addEventListener('pointerup', () => { S.runBtn = false; }); b.addEventListener('pointercancel', () => { S.runBtn = false; });
    t.querySelector('.jt-menu').addEventListener('click', () => { if (S.menu) closeMenu(); else if (!S.event) openMenu('menu'); });
  }

  // =====================================================================
  //  Start / leave
  // =====================================================================
  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'journey'; root.className = 'hidden';
    root.innerHTML = `<canvas class="jcv"></canvas>
      <div class="jbanner"></div><div class="jchapter"></div>
      <div class="jdialog hidden"><img class="jd-face hidden" alt=""><div class="jd-name"></div><div class="jd-text"></div><div class="jd-opts"></div><i class="jd-more">▼</i></div>
      <div class="jpanel hidden"></div><div class="jevo hidden"></div><div class="jfade"></div>
      <button class="jmenu-btn" title="Menu (Esc / M)">☰</button>
      <div class="jtouch"><div class="jt-stick"><i></i></div><button class="jt-b">B</button><button class="jt-a">A</button><button class="jt-menu">MENU</button></div>`;
    document.getElementById('frame').append(root);
    const bm = document.createElement('div'); bm.className = 'jbmenu hidden'; document.getElementById('frame').append(bm);
    cv = root.querySelector('.jcv'); ctx = cv.getContext('2d');
    ui = { dialog: $q('.jdialog'), panel: $q('.jpanel'), evo: $q('.jevo'), fade: $q('.jfade'), banner: $q('.jbanner'), chapter: $q('.jchapter'), touch: $q('.jtouch'), bmenu: bm };
    ui.panel.addEventListener('click', panelClick);
    ui.panel.addEventListener('pointerdown', partyDrag);
    ui.dialog.addEventListener('click', e => { if (!e.target.closest('button')) advance(); });
    $q('.jmenu-btn').onclick = () => { if (S.menu) closeMenu(); else if (!S.event) openMenu('menu'); };
    bindTouch();
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKeyUp);
    addEventListener('resize', () => { if (active) resize(); });
    addEventListener('blur', () => S.keys.clear());
  }
  function loop(now) {
    if (!active) return;
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (S.lastT || now)) / 1000); S.lastT = now;
    if (S.battle) return;
    step(dt);
    stepPal(dt);
    draw();
  }
  function start(g) {
    build();
    G = g;
    active = true;
    document.body.classList.add('journey');
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchUI');
    $('builder').classList.add('hidden');
    root.classList.remove('hidden');
    ui.menuEl && ui.menuEl.remove();
    resize();
    loadMap(G.map, G.x, G.y, G.dir);
    try { AudioFX.Music.start(0); } catch (e) {}
    S.lastT = 0; cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(loop);
    if (!flag('intro')) runEvent('intro');
  }
  function leave() {
    if (!active) return;
    save();
    active = false; cancelAnimationFrame(S.raf);
    S.event = false; S.menu = null; S.battle = false; S.dialog = null; S.travel = false; S.keys.clear();
    if (S.pickRes) S.pickRes = null;
    document.body.classList.remove('journey');
    if (root) { root.classList.add('hidden'); closeDialog(); ui.panel.classList.add('hidden'); ui.bmenu.classList.add('hidden'); ui.evo.classList.add('hidden'); }
    try { AudioFX.Music.stop(); } catch (e) {}
  }
  // the title screen: continue, or a new trainer (name + look)
  function open() {
    build();
    const sv = readSave();
    const el = document.createElement('div');
    el.className = 'overlay jtitle';
    const looks = Object.keys(OUTFITS);
    let pick = 'red';
    el.innerHTML = `<div class="jt-box"><h1 class="logo">POKéMON JOURNEY</h1><div class="jt-sub">The Eclipse of Valoria</div>
      ${sv ? `<button class="btn" data-a="cont">▶ Continue - ${esc(sv.name)} · ${sv.badges.length} badge${sv.badges.length === 1 ? '' : 's'} · ${Object.keys(sv.dex.caught).length} caught · ${Math.floor(sv.time / 3600)}:${String(Math.floor(sv.time / 60) % 60).padStart(2, '0')}</button>` : ''}
      <div class="jt-new"><b>${sv ? 'New game' : 'Who are you?'}</b><input maxlength="10" placeholder="Your name" value="${sv ? '' : ''}">
      <div class="jt-looks">${looks.map(k => `<button data-l="${k}" class="${k === pick ? 'on' : ''}"><img src="${JArt.person(OUTFITS[k]).face}" alt=""><small>${OUTFITS[k].label}</small></button>`).join('')}</div>
      <button class="btn ${sv ? 'alt' : ''}" data-a="new">${sv ? 'Start over (erases your save)' : '★ Begin your journey'}</button></div>
      <button class="btn alt" data-a="film">🎬 Watch the intro</button><button class="btn alt" data-a="back">Back</button></div>`;
    document.body.append(el);
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-l]');
      if (l) { pick = l.dataset.l; el.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', b === l)); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'back') return el.remove();
      if (a.dataset.a === 'film') { el.classList.add('hidden'); JIntro.play({ name: sv ? sv.name : '', look: lookOf(sv ? sv.outfit : pick) }).then(() => el.classList.remove('hidden')); return; }
      if (a.dataset.a === 'cont') { el.remove(); return start(sv); }
      if (a.dataset.a === 'new') {
        if (sv && !confirm('Start a new game? Your saved journey will be erased.')) return;
        const name = el.querySelector('input').value.trim().slice(0, 10) || OUTFITS[pick].label;
        // the opening film first; the story then skips the legend it already showed
        el.remove();
        const g = newGame(name, pick);
        JIntro.play({ name, look: lookOf(pick) }).then(() => { g.flags.film = true; start(g); });
      }
    });
    setTimeout(() => { const i = el.querySelector('input'); if (i && !sv) i.focus(); }, 50);
  }
  return { open, leave, get active() { return active; }, save,
    // tests
    _G: () => G, _S: () => S, _pal: () => pal, _J: J, _start: g => start(g || newGame('Test', 'red')), _newGame: newGame, _warp: (id, tx, ty, dir) => loadMap(id, tx * TS + 8, ty * TS + 13, dir || 'down'),
    // tests: the whole map drawn at scale k, as a data URL
    _mapShot(id, k = 2) {
      const keep = { cv, ctx, scale, map: S.map ? S.map.id : null, x: S.player && S.player.x, y: S.player && S.player.y };
      const m = JMaps.M[id];
      loadMap(id, m.w * TS / 2, m.h * TS / 2, 'down');
      const c = document.createElement('canvas'); c.width = m.w * TS * k; c.height = m.h * TS * k;
      cv = c; ctx = c.getContext('2d'); scale = k;
      S.player.x = -999; draw();
      const url = c.toDataURL();
      cv = keep.cv; ctx = keep.ctx; scale = keep.scale;
      if (keep.map) loadMap(keep.map, keep.x, keep.y, 'down');
      return url;
    },
    _interact: interact, _advance: advance, _pick: i => S.dialog && S.dialog.pickI ? S.dialog.pickI(i) : null, _panel: () => S.menu, _panelClick: sel => { const b = ui.panel.querySelector(sel); if (b) b.click(); return !!b; },
    _battle: (def) => runScript(J0 => J0.battle(def)), _wild: (s, L) => wildBattle({ species: s, level: L }), _event: id => runEvent(id), _tile: () => tileOf(S.player.x, S.player.y), _menu: k => openMenu(k), _close: closeMenu };
})();
