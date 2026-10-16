'use strict';
// =====================================================================
//  DATA & RULES
// =====================================================================
const DEX = window.POKEDEX;
const MOVES = DEX.moves;

const TYPE_COLORS = {
  Normal: '#a8a878', Fire: '#f08030', Water: '#6890f0', Electric: '#f8d030', Grass: '#78c850', Ice: '#98d8d8',
  Fighting: '#c03028', Poison: '#a040a0', Ground: '#e0c068', Flying: '#a890f0', Psychic: '#f85888', Bug: '#a8b820',
  Rock: '#b8a038', Ghost: '#705898', Dragon: '#7038f8', Dark: '#705848', Steel: '#b8b8d0', Fairy: '#ee99ac'
};
// attacking type -> { defending type: multiplier } (non-1x only)
const CHART = {
  Normal:   { Rock: .5, Ghost: 0, Steel: .5 },
  Fire:     { Fire: .5, Water: .5, Grass: 2, Ice: 2, Bug: 2, Rock: .5, Dragon: .5, Steel: 2 },
  Water:    { Fire: 2, Water: .5, Grass: .5, Ground: 2, Rock: 2, Dragon: .5 },
  Electric: { Water: 2, Electric: .5, Grass: .5, Ground: 0, Flying: 2, Dragon: .5 },
  Grass:    { Fire: .5, Water: 2, Grass: .5, Poison: .5, Ground: 2, Flying: .5, Bug: .5, Rock: 2, Dragon: .5, Steel: .5 },
  Ice:      { Fire: .5, Water: .5, Grass: 2, Ice: .5, Ground: 2, Flying: 2, Dragon: 2, Steel: .5 },
  Fighting: { Normal: 2, Ice: 2, Poison: .5, Flying: .5, Psychic: .5, Bug: .5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: .5 },
  Poison:   { Grass: 2, Poison: .5, Ground: .5, Rock: .5, Ghost: .5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Electric: 2, Grass: .5, Poison: 2, Flying: 0, Bug: .5, Rock: 2, Steel: 2 },
  Flying:   { Electric: .5, Grass: 2, Fighting: 2, Bug: 2, Rock: .5, Steel: .5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: .5, Dark: 0, Steel: .5 },
  Bug:      { Fire: .5, Grass: 2, Fighting: .5, Poison: .5, Flying: .5, Psychic: 2, Ghost: .5, Dark: 2, Steel: .5, Fairy: .5 },
  Rock:     { Fire: 2, Ice: 2, Fighting: .5, Ground: .5, Flying: 2, Bug: 2, Steel: .5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: .5 },
  Dragon:   { Dragon: 2, Steel: .5, Fairy: 0 },
  Dark:     { Fighting: .5, Psychic: 2, Ghost: 2, Dark: .5, Fairy: .5 },
  Steel:    { Fire: .5, Water: .5, Electric: .5, Ice: 2, Rock: 2, Steel: .5, Fairy: 2 },
  Fairy:    { Fire: .5, Fighting: 2, Poison: .5, Dragon: 2, Dark: 2, Steel: .5 }
};
const effectiveness = (atk, defs) => defs.reduce((m, d) => m * (CHART[atk] && d in CHART[atk] ? CHART[atk][d] : 1), 1);

const AILMENT = { paralysis: 'par', burn: 'brn', poison: 'psn', sleep: 'slp', freeze: 'frz', confusion: 'conf', 'leech-seed': 'seed', trap: 'trap', protect: 'protect' };
const MAJOR = ['par', 'brn', 'psn', 'slp', 'frz'];
// two-turn, recharge, self-KO and other moves this engine doesn't model
const BANNED = new Set(['solar-beam', 'solar-blade', 'sky-attack', 'skull-bash', 'razor-wind', 'fly', 'dig', 'dive', 'bounce',
  'phantom-force', 'shadow-force', 'hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'meteor-beam',
  'focus-punch', 'future-sight', 'self-destruct', 'explosion', 'dream-eater', 'belly-drum', 'curse', 'substitute', 'last-resort',
  'counter', 'mirror-coat', 'metal-burst', 'bide', 'synchronoise', 'swagger', 'flatter', 'mirror-move', 'sleep-talk', 'snore',
  'role-play', 'rock-wrecker', 'roar-of-time', 'prismatic-laser', 'eternabeam', 'steel-beam', 'mind-blown', 'memento']);
const UNIQUE_OK = new Set(['rest', 'protect', 'detect', 'shell-smash', 'wave-crash', 'aqua-cutter']);
const OK_META = new Set(['damage', 'ailment', 'net-good-stats', 'heal', 'damage-ailment', 'damage-raise', 'damage-lower', 'damage-heal', 'unique']);
const FIXED_DAMAGE = { 'seismic-toss': 'level', 'night-shade': 'level', 'dragon-rage': 40, 'sonic-boom': 20 };
const POWDER = new Set(['sleep-powder', 'stun-spore', 'poison-powder', 'spore', 'cotton-spore', 'rage-powder']);
const SELF_TARGETS = new Set(['user', 'users-field', 'user-and-allies', 'ally', 'user-or-ally']);
const STAT_KEY = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe', accuracy: 'acc', evasion: 'eva' };
const STAT_NAMES = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' };
const STATUS_INFO = {
  par: { label: 'PAR', color: '#eab308', msg: 'is paralyzed! It may be unable to move!' },
  brn: { label: 'BRN', color: '#ef4444', msg: 'was burned!' },
  psn: { label: 'PSN', color: '#a855f7', msg: 'was poisoned!' },
  slp: { label: 'SLP', color: '#6b7280', msg: 'fell asleep!' },
  frz: { label: 'FRZ', color: '#38bdf8', msg: 'was frozen solid!' }
};
const STRUGGLE = { id: 'struggle', name: 'Struggle', type: null, cat: 'physical', power: 50, acc: null, priority: 0, target: 'selected-pokemon', metaCat: 'damage', ailment: 'none', stats: [], drain: -25, flinch: 0, crit: 0, statChance: 0 };
// PokéAPI stores Wave Crash recoil as "unique"; fill it in
if (MOVES['wave-crash']) MOVES['wave-crash'].drain = -33;

function moveSupported(id) {
  const m = MOVES[id];
  if (!m || BANNED.has(id)) return false;
  if (!OK_META.has(m.metaCat)) return false;
  if (m.metaCat === 'unique' && !UNIQUE_OK.has(id)) return false;
  if (m.cat !== 'status' && !m.power && !(id in FIXED_DAMAGE)) return false;
  if (m.ailment !== 'none' && !AILMENT[m.ailment]) return false;
  if (m.cat === 'status' && id !== 'rest' && m.ailment === 'none' && !m.healing && !m.stats.length) return false;
  return true;
}

function learnable(species, level) {
  const out = [];
  for (const [lvl, id] of DEX.species[species].learnset)
    if (lvl <= level && moveSupported(id) && !out.includes(id)) out.push(id);
  return out;
}

function defaultMoves(species, level) {
  const sp = DEX.species[species];
  const score = id => {
    const m = MOVES[id];
    if (m.cat === 'status') {
      const selfBoost = SELF_TARGETS.has(m.target) && m.stats.some(([, c]) => c > 0);
      if (m.healing || id === 'rest') return 36;
      if (m.ailment === 'sleep') return 46;
      if (m.ailment === 'paralysis') return 40;
      if (selfBoost && m.stats.reduce((a, [, c]) => a + Math.max(0, c), 0) >= 2) return 44;
      if (selfBoost) return 32;
      if (m.ailment !== 'none') return 30;
      return 14;
    }
    let p = m.power || 60;
    if (m.maxHits) p *= m.minHits === m.maxHits ? m.minHits : 3;
    p *= (m.acc || 100) / 100;
    if (sp.types.includes(m.type)) p *= 1.5;
    if (m.drain < 0) p *= 0.9;
    return p;
  };
  const pool = learnable(species, level).map(id => ({ id, s: score(id) }));
  const chosen = [];
  while (chosen.length < 4 && pool.length) {
    const statusCount = chosen.filter(c => MOVES[c].cat === 'status').length;
    pool.forEach(o => {
      const m = MOVES[o.id];
      o.e = o.s;
      if (m.cat !== 'status' && chosen.some(c => MOVES[c].cat !== 'status' && MOVES[c].type === m.type)) o.e *= 0.45;
      if (m.cat === 'status' && statusCount >= 1) o.e *= 0.3;
    });
    pool.sort((a, b) => b.e - a.e);
    chosen.push(pool.shift().id);
  }
  return chosen;
}

// Rendering lives in core.js + arenas.js, 3D Pokémon in actors.js,
// move effects in vfx.js and trainers in trainers.js.

// =====================================================================
//  SOUND & RECORDING
// =====================================================================
let muted = false;
function playCry(mon, rate = 1) {
  if (muted || !mon.cry) return;
  const a = new Audio(mon.cry);
  a.volume = 0.35;
  a.playbackRate = rate;
  a.play().catch(() => {});
}

const toastEl = document.getElementById('toast');
let toastTimer;
function toast(text, ms = 2500) {
  toastEl.textContent = text;
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.style.opacity = 0, ms);
}

// Records the browser tab (3D arena + HUD + cries). Each battle is saved as its own file.
const Rec = { stream: null, recorder: null, chunks: [], mime: '', label: 'battle' };
const recBtn = document.getElementById('recBtn');
const recBtn2 = document.getElementById('recBtn2');
const inBattle = () => document.getElementById('builder').classList.contains('hidden');
function updateRecButtons() {
  recBtn.classList.toggle('hidden', !!Rec.stream || !inBattle());
  // in-battle controls stay out of recordings (Esc still pauses)
  document.getElementById('battleCtl').classList.toggle('hidden', !!Rec.stream || !battleActive);
  recBtn2.textContent = Rec.stream ? '⏹ Stop Recording' : '⏺ Record';
}
function pickMime() {
  const opts = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return opts.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
async function startRecording() {
  if (!navigator.mediaDevices?.getDisplayMedia) { toast('Recording not supported here — use Chrome/Edge, or Win+Alt+R (Game Bar).', 5000); return; }
  try {
    Rec.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 60 }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude'
    });
  } catch { toast('Recording cancelled.'); return; }
  Rec.mime = pickMime();
  Rec.stream.getVideoTracks()[0].addEventListener('ended', stopRecording);
  beginSegment();
  updateRecButtons();
  document.title = '● REC — Pokémon Arena';
  toast('Recording! Press R to stop. Each battle is saved as its own video.', 3500);
}
function beginSegment() {
  Rec.chunks = [];
  Rec.recorder = new MediaRecorder(Rec.stream, { mimeType: Rec.mime || undefined, videoBitsPerSecond: 10_000_000 });
  Rec.recorder.ondataavailable = e => e.data.size && Rec.chunks.push(e.data);
  const chunks = Rec.chunks, label = Rec.label, started = Date.now();
  // skip tiny leftover clips (e.g. stopping on the end screen)
  Rec.recorder.onstop = () => { if (Date.now() - started > 4000) saveVideo(chunks, label); };
  Rec.recorder.start(1000);
}
function saveVideo(chunks, label) {
  if (!chunks.length) return;
  const type = Rec.mime || 'video/webm';
  const blob = new Blob(chunks, { type });
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pokemon-${label}-${stamp}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast(`Saved ${a.download} to your Downloads folder`, 4000);
}
// Called when a battle finishes: close the current file and start a new one.
function splitRecording(label) {
  if (!Rec.recorder || Rec.recorder.state !== 'recording') return;
  Rec.recorder.stop();
  Rec.label = label || 'battle';
  beginSegment();
}
function stopRecording() {
  if (Rec.recorder && Rec.recorder.state !== 'inactive') Rec.recorder.stop();
  Rec.stream?.getTracks().forEach(t => t.stop());
  Rec.stream = Rec.recorder = null;
  updateRecButtons();
  document.title = 'Pokémon Arena';
}
recBtn.onclick = startRecording;
recBtn2.onclick = () => Rec.stream ? stopRecording() : startRecording();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'r' || e.key === 'R') Rec.stream ? stopRecording() : startRecording();
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && battleActive) setPaused(!PAUSED);
});

// =====================================================================
//  BATTLE STATE & HUD
// =====================================================================
const $ = id => document.getElementById(id);
const PLAYER = ['Player 1', 'Player 2'];
const settings = { teamSize: 3, level: 50, auto: false, theme: 'random', outfits: ['red', 'blue'], hpMult: 1, pool: 'final' };
const teams = [[], []];               // builder specs: { species, level, mega, moves }
const controllers = ['human', 'cpu'];
let state = null;
const active = p => state.players[p].team[state.players[p].active];
const lbl = mon => `<b class="p${mon.owner}">${mon.name}</b>`;
const typeBadge = t => `<span class="type" style="background:${TYPE_COLORS[t]}">${t.toUpperCase()}</span>`;

function calcStats(base, level) {
  const c = b => Math.floor((2 * b + 31) * level / 100) + 5; // IV 31, EV 0, neutral nature
  return { atk: c(base[1]), def: c(base[2]), spa: c(base[3]), spd: c(base[4]), spe: c(base[5]) };
}
const blankStages = () => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 });

function makeMon(spec, owner) {
  const sp = DEX.species[spec.species];
  // official HP formula; the optional 'Battle length' setting multiplies it for longer battles
  const maxhp = (Math.floor((2 * sp.base[0] + 31) * spec.level / 100) + spec.level + 10) * settings.hpMult;
  return {
    owner, species: sp.name, name: sp.display, level: spec.level, types: sp.types.slice(),
    stats: calcStats(sp.base, spec.level), maxhp, hp: maxhp, sprite: sp.sprite, cry: sp.cry, modelKey: sp.name,
    megaForm: spec.mega ? sp.megas.find(m => m.name === spec.mega) : null, isMega: false,
    status: null, sleepTurns: 0, vol: {}, stages: blankStages(), turnsOut: 0,
    moves: spec.moves.map(id => ({ id, ...MOVES[id], ppLeft: MOVES[id].pp }))
  };
}

function updateHud() {
  for (const p of [0, 1]) {
    const m = active(p);
    if (!m) continue;
    World.setTint(p, m.status);
    World.setState(p, m.status, m.hp / m.maxhp);
    const pct = Math.max(0, m.hp / m.maxhp * 100);
    const color = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444';
    const st = m.status ? STATUS_INFO[m.status] : null;
    const balls = state.players[p].team.map(x => `<div class="ball ${x.hp <= 0 ? 'dead' : ''}"></div>`).join('');
    $('panel' + p).innerHTML = `
      <div class="row"><span class="owner p${p}">${PLAYER[p]}${controllers[p] === 'cpu' ? ' (CPU)' : ''}</span><div class="balls">${balls}</div></div>
      <div class="row"><span class="pname">${m.name}</span>
        <span>${m.isMega ? '<span class="badge mega-badge">MEGA</span>' : ''}${st ? `<span class="badge" style="background:${st.color}">${st.label}</span>` : ''}
        <b style="margin-left:6px">Lv${m.level}</b></span></div>
      <div>${m.types.map(typeBadge).join('')}</div>
      <div class="hpwrap"><span class="hplabel">HP</span><div class="hpbar"><div class="hpfill" style="width:${pct}%;background:${color}"></div></div></div>
      <div class="hptext">${Math.max(0, m.hp)} / ${m.maxhp}</div>`;
  }
}

let skipWait = null;
$('msg').onclick = () => skipWait && skipWait();
async function say(html, ms = 1150) {
  guard();
  $('msg').innerHTML = html;
  await new Promise(res => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    later(finish, ms);
    skipWait = finish;
  });
  skipWait = null;
  guard();
}

// ---- battle lifecycle: every battle has a token; restart/exit invalidates it
let battleToken = 0, battleActive = false;
class BattleAbort extends Error {}
const pendingChoices = new Set();              // rejecters for choice menus waiting on a human
function guard() { if (!state || state.token !== battleToken) throw new BattleAbort(); }
function humanChoice(build) {
  return new Promise((res, rej) => {
    const finish = v => { pendingChoices.delete(rej); res(v); };
    pendingChoices.add(rej);
    build(finish);
  });
}
function clearButtons() { $('actions').innerHTML = ''; $('switches').innerHTML = ''; }
const canMega = p => { const u = active(p); return u.megaForm && !u.isMega && !state.players[p].usedMega; };

// =====================================================================
//  CHOOSING ACTIONS (human UI + CPU AI)
// =====================================================================
function chooseActionHuman(p) {
  return humanChoice(res => {
    const u = active(p);
    let mega = false;
    const done = a => { clearButtons(); res(a); };
    $('msg').innerHTML = `<b class="p${p}">${PLAYER[p]}</b>: What will ${u.name} do?`;
    clearButtons();
    if (u.moves.every(m => m.ppLeft <= 0)) {
      const b = document.createElement('button');
      b.className = 'mv'; b.style.background = '#6b7280';
      b.innerHTML = 'Struggle <small>no moves left</small>';
      b.onclick = () => done({ type: 'move', idx: -1, mega });
      $('actions').append(b);
    }
    u.moves.forEach((m, i) => {
      const b = document.createElement('button');
      b.className = 'mv'; b.style.background = TYPE_COLORS[m.type];
      const pow = m.power ? 'POW ' + m.power : FIXED_DAMAGE[m.id] ? 'FIXED' : 'STATUS';
      b.innerHTML = `${m.name} <small>${m.type} · ${pow} · PP ${m.ppLeft}/${m.pp}</small>`;
      b.disabled = m.ppLeft <= 0;
      b.onclick = () => done({ type: 'move', idx: i, mega });
      $('actions').append(b);
    });
    if (canMega(p)) {
      const b = document.createElement('button');
      b.className = 'sw megabtn';
      b.textContent = `Mega Evolve (${u.megaForm.stone})`;
      b.onclick = () => { mega = !mega; b.classList.toggle('on', mega); };
      $('switches').append(b);
    }
    state.players[p].team.forEach((m, i) => {
      if (i === state.players[p].active || m.hp <= 0) return;
      const b = document.createElement('button');
      b.className = 'sw';
      b.innerHTML = `<img src="${m.sprite}"> ${m.name} ${m.hp}/${m.maxhp}`;
      b.onclick = () => done({ type: 'switch', idx: i });
      $('switches').append(b);
    });
  });
}

function calcDamage(u, t, m, crit = false, roll = 0.925) {
  if (FIXED_DAMAGE[m.id] !== undefined) {
    if (effectiveness(m.type, t.types) === 0) return 0;
    return FIXED_DAMAGE[m.id] === 'level' ? u.level : FIXED_DAMAGE[m.id];
  }
  const phys = m.cat === 'physical';
  let aSt = u.stages[phys ? 'atk' : 'spa'], dSt = t.stages[phys ? 'def' : 'spd'];
  if (crit) { aSt = Math.max(0, aSt); dSt = Math.min(0, dSt); }
  const A = u.stats[phys ? 'atk' : 'spa'] * stageMult(aSt);
  const D = t.stats[phys ? 'def' : 'spd'] * stageMult(dSt);
  // official damage formula (Gen 5+)
  let dmg = Math.floor(Math.floor(Math.floor(2 * u.level / 5 + 2) * m.power * A / D) / 50) + 2;
  if (crit) dmg *= 1.5;
  dmg *= roll;
  if (m.type && u.types.includes(m.type)) dmg *= 1.5; // STAB
  dmg *= m.type ? effectiveness(m.type, t.types) : 1;
  if (phys && u.status === 'brn') dmg *= 0.5;
  return Math.floor(dmg);
}

function scoreMove(u, t, m) {
  if (m.ppLeft <= 0) return -1;
  if (m.cat !== 'status') {
    let d = calcDamage(u, t, m);
    if (m.maxHits) d *= m.minHits === m.maxHits ? m.minHits : 3;
    let s = Math.min(1.25, d / t.hp * (d >= t.hp ? 1.2 : 1));
    if (m.id === 'fake-out' && u.turnsOut > 0) s = 0;
    return s * (m.acc || 100) / 100 + (m.priority > 0 && d >= t.hp ? 0.3 : 0);
  }
  if (m.id === 'rest') return u.hp < u.maxhp * 0.35 && !u.status ? 0.7 : 0;
  if (m.ailment === 'protect') return u.vol.protectCount ? 0 : 0.08;
  if (m.healing) return Math.max(0, (1 - u.hp / u.maxhp) - 0.3) * 1.2;
  if (m.ailment !== 'none') {
    const code = AILMENT[m.ailment];
    if (MAJOR.includes(code) && !canStatus(t, code)) return 0;
    if (POWDER.has(m.id) && t.types.includes('Grass')) return 0;
    if (code === 'conf' && t.vol.conf) return 0;
    if (code === 'seed' && (t.vol.seed || t.types.includes('Grass'))) return 0;
    return (code === 'slp' ? 0.55 : code === 'par' ? 0.4 : 0.3) * (m.acc || 100) / 100;
  }
  if (m.stats.length) {
    const self = SELF_TARGETS.has(m.target);
    const who = self ? u : t;
    const room = m.stats.some(([s, c]) => { const st = who.stages[STAT_KEY[s]]; return self ? (c > 0 && st < 2) : (c < 0 && st > -2); });
    return room ? (self ? 0.35 : 0.2) * (u.hp / u.maxhp) : 0.02;
  }
  return 0.05;
}

function bestMatchupIdx(p) {
  const foe = active(1 - p);
  let best = -1, bestScore = -Infinity;
  state.players[p].team.forEach((m, i) => {
    if (m.hp <= 0 || i === state.players[p].active) return;
    const off = Math.max(0, ...m.moves.filter(x => x.cat !== 'status').map(x => effectiveness(x.type, foe.types) * (m.types.includes(x.type) ? 1.5 : 1)));
    const def = Math.max(...foe.types.map(ft => effectiveness(ft, m.types)));
    const s = off - def * 0.8 + m.hp / m.maxhp;
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

async function chooseActionCPU(p) {
  $('msg').innerHTML = `<b class="p${p}">${PLAYER[p]}</b> is thinking...`;
  await wait(450);
  const u = active(p), t = active(1 - p);
  const scored = u.moves.map((m, i) => ({ i, s: scoreMove(u, t, m) * (0.85 + Math.random() * 0.3) }));
  const best = scored.sort((a, b) => b.s - a.s)[0];
  if ((!best || best.s < 0.12) && Math.random() < 0.5) {
    const sw = bestMatchupIdx(p);
    if (sw >= 0) return { type: 'switch', idx: sw };
  }
  const idx = best && best.s > -1 ? best.i : -1;
  return { type: 'move', idx: u.moves.every(m => m.ppLeft <= 0) ? -1 : idx, mega: !!canMega(p) };
}

const chooseAction = p => controllers[p] === 'cpu' ? chooseActionCPU(p) : chooseActionHuman(p);

function chooseReplacement(p) {
  if (controllers[p] === 'cpu') return wait(400).then(() => bestMatchupIdx(p));
  return humanChoice(res => {
    $('msg').innerHTML = `<b class="p${p}">${PLAYER[p]}</b>: Choose your next Pokémon!`;
    clearButtons();
    state.players[p].team.forEach((m, i) => {
      if (m.hp <= 0) return;
      const b = document.createElement('button');
      b.className = 'sw';
      b.innerHTML = `<img src="${m.sprite}"> ${m.name} Lv${m.level} ${m.hp}/${m.maxhp}`;
      b.onclick = () => { clearButtons(); res(i); };
      $('switches').append(b);
    });
  });
}

// =====================================================================
//  BATTLE ENGINE
// =====================================================================
const stageMult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const accMult = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
const speedOf = m => m.stats.spe * stageMult(m.stages.spe) * (m.status === 'par' ? 0.5 : 1);
const hasAlive = p => state.players[p].team.some(m => m.hp > 0);
const battleOver = () => !hasAlive(0) || !hasAlive(1);
const rand = () => Math.random();

function canStatus(mon, s) {
  if (mon.status || mon.hp <= 0) return false;
  if (s === 'brn' && mon.types.includes('Fire')) return false;
  if (s === 'par' && mon.types.includes('Electric')) return false;
  if (s === 'psn' && (mon.types.includes('Poison') || mon.types.includes('Steel'))) return false;
  if (s === 'frz' && mon.types.includes('Ice')) return false;
  return true;
}
async function inflict(t, ailment, moveName) {
  const code = AILMENT[ailment];
  if (MAJOR.includes(code)) {
    if (!canStatus(t, code)) return false;
    t.status = code;
    if (code === 'slp') t.sleepTurns = 1 + Math.floor(rand() * 3);
    updateHud();
    await VFX.status(code, t.owner);
    await say(`${lbl(t)} ${STATUS_INFO[code].msg}`);
    return true;
  }
  if (code === 'conf') {
    if (t.vol.conf) return false;
    t.vol.conf = 2 + Math.floor(rand() * 4);
    await VFX.status('confused', t.owner);
    await say(`${lbl(t)} became confused!`);
    return true;
  }
  if (code === 'seed') {
    if (t.vol.seed || t.types.includes('Grass')) return false;
    t.vol.seed = true;
    await say(`${lbl(t)} was seeded!`);
    return true;
  }
  if (code === 'trap') {
    if (t.vol.trap) return false;
    t.vol.trap = 4 + Math.floor(rand() * 2);
    t.vol.trapName = moveName;
    await say(`${lbl(t)} was trapped by ${moveName}!`);
    return true;
  }
  return false;
}
async function changeStats(mon, changes) {
  for (const [stat, n] of changes) {
    const k = STAT_KEY[stat];
    if (!k) continue;
    const cur = mon.stages[k];
    if ((n > 0 && cur >= 6) || (n < 0 && cur <= -6)) {
      await say(`${lbl(mon)}'s ${STAT_NAMES[k]} won't go any ${n > 0 ? 'higher' : 'lower'}!`);
      continue;
    }
    mon.stages[k] = Math.max(-6, Math.min(6, cur + n));
    const word = n >= 3 ? 'rose drastically' : n === 2 ? 'rose sharply' : n > 0 ? 'rose' : n <= -3 ? 'severely fell' : n === -2 ? 'harshly fell' : 'fell';
    await say(`${lbl(mon)}'s ${STAT_NAMES[k]} ${word}!`, 900);
  }
}
async function hurt(p, amount) {
  const m = active(p);
  m.hp = Math.max(0, m.hp - amount);
  updateHud();
}
async function faint(p) {
  const m = active(p);
  playCry(m, 0.8);
  World.focusOne(p);
  World.trainers.dismay(p);
  if (World.actors[1 - p].visible) World.trainers.cheer(1 - p);
  await World.faint(p);
  World.overview();
  updateHud();
  await say(`${lbl(m)} fainted!`);
}

async function doSwitch(p, idx, forced) {
  const pl = state.players[p];
  if (!forced && World.actors[p].visible) {
    await say(`<b class="p${p}">${PLAYER[p]}</b>: Come back, ${active(p).name}!`, 800);
    await World.recall(p);
  }
  pl.active = idx;
  const m = active(p);
  m.stages = blankStages();
  m.vol = {};
  m.turnsOut = 0;
  World.setSpeedStat(p, m.stats.spe);
  updateHud();
  const out = World.sendOut(p, m);
  later(() => playCry(m), 550);
  await out;
  await say(`<b class="p${p}">${PLAYER[p]}</b>: Go! ${m.name}!`, 900);
}

async function megaEvolve(p) {
  const u = active(p), f = u.megaForm;
  state.players[p].usedMega = true;
  await say(`${lbl(u)}'s ${f.stone} is reacting to <b class="p${p}">${PLAYER[p]}</b>'s Key Stone!`, 1300);
  await World.trainers.mega(p);
  World.focusOne(p);
  await VFX.other('megaevo', p);
  u.modelKey = f.name;
  u.sprite = f.sprite;
  await World.megaSwap(p, u);
  const prev = u.name;
  u.isMega = true;
  u.name = f.display;
  u.types = f.types.slice();
  u.stats = calcStats(f.base, u.level);
  u.sprite = f.sprite;
  if (f.cry) u.cry = f.cry;
  playCry(u);
  updateHud();
  await say(`<b class="p${p}">${prev}</b> has Mega Evolved into <b class="p${p}">${f.display}</b>!`, 1500);
  World.overview();
}

async function useMove(p, idx) {
  const u = active(p), t = active(1 - p);
  const m = idx < 0 ? STRUGGLE : u.moves[idx];
  if (m.ailment !== 'protect') u.vol.protectCount = 0;

  // --- can the user act? ---
  if (u.status === 'slp') {
    if (u.sleepTurns > 0) { u.sleepTurns--; await VFX.status('slp', p); await say(`${lbl(u)} is fast asleep.`); return; }
    u.status = null; updateHud(); await say(`${lbl(u)} woke up!`);
  }
  if (u.status === 'frz') {
    if (rand() < 0.2) { u.status = null; updateHud(); await say(`${lbl(u)} thawed out!`); }
    else { await VFX.status('frz', p); await say(`${lbl(u)} is frozen solid!`); return; }
  }
  if (u.vol.flinch) { await VFX.status('flinch', p); await say(`${lbl(u)} flinched and couldn't move!`); return; }
  if (u.vol.conf) {
    u.vol.conf--;
    if (u.vol.conf === 0) await say(`${lbl(u)} snapped out of its confusion!`);
    else {
      await VFX.status('confused', p);
      await say(`${lbl(u)} is confused!`, 800);
      if (rand() < 1 / 3) {
        const self = { id: 'confusion-hit', type: null, cat: 'physical', power: 40 };
        await VFX.status('confusedselfhit', p);
        await World.blink(p);
        await hurt(p, Math.max(1, calcDamage(u, u, self)));
        await say('It hurt itself in its confusion!');
        if (u.hp <= 0) await faint(p);
        return;
      }
    }
  }
  if (u.status === 'par' && rand() < 0.25) { await VFX.status('par', p); await say(`${lbl(u)} is paralyzed! It can't move!`); return; }

  if (idx >= 0) m.ppLeft--;
  World.trainers.command(p);
  await say(`${lbl(u)} used <b>${m.name}</b>!`, 900);

  const selfTarget = SELF_TARGETS.has(m.target) || m.id === 'rest';
  if (!selfTarget && t.hp <= 0) { await say('But there was no target...'); return; }
  if (m.id === 'fake-out' && u.turnsOut > 0) { await say('But it failed!'); return; }
  if (!selfTarget && t.vol.protect) {
    await VFX.move(m.id, p, 1 - p, { blocked: true });
    await say(`${lbl(t)} protected itself!`);
    return;
  }
  if (!selfTarget && m.acc != null) {
    const st = Math.max(-6, Math.min(6, u.stages.acc - t.stages.eva));
    if (rand() * 100 >= m.acc * accMult(st)) {
      await Promise.all([VFX.move(m.id, p, 1 - p, { miss: true }), wait(120).then(() => World.dodge(1 - p, p))]);
      await say(`${lbl(u)}'s attack missed!`);
      return;
    }
  }

  // --- status moves ---
  if (m.cat === 'status') {
    if (m.id === 'rest') {
      if (u.hp === u.maxhp) { await say('But it failed!'); return; }
      await VFX.move(m.id, p, p);
      u.hp = u.maxhp; u.status = 'slp'; u.sleepTurns = 2;
      updateHud();
      await say(`${lbl(u)} slept and became healthy!`);
      return;
    }
    if (m.ailment === 'protect') {
      if (rand() < 1 / Math.pow(3, u.vol.protectCount || 0)) {
        u.vol.protect = true;
        u.vol.protectCount = (u.vol.protectCount || 0) + 1;
        await VFX.move(m.id, p, p);
        await say(`${lbl(u)} protected itself!`);
      } else { u.vol.protectCount = 0; await say('But it failed!'); }
      return;
    }
    if (m.healing > 0 && selfTarget) {
      if (u.hp === u.maxhp) { await say(`${lbl(u)}'s HP is full!`); return; }
      await VFX.move(m.id, p, p);
      u.hp = Math.min(u.maxhp, u.hp + Math.floor(u.maxhp * m.healing / 100));
      updateHud();
      await say(`${lbl(u)} restored HP!`);
      return;
    }
    if (selfTarget) { await VFX.move(m.id, p, p); await changeStats(u, m.stats); return; }
    if (POWDER.has(m.id) && t.types.includes('Grass')) { await say(`It doesn't affect ${lbl(t)}...`); return; }
    if (m.id === 'thunder-wave' && effectiveness('Electric', t.types) === 0) { await say(`It doesn't affect ${lbl(t)}...`); return; }
    await VFX.move(m.id, p, 1 - p);
    if (m.ailment !== 'none') {
      if (!(await inflict(t, m.ailment, m.name))) await say('But it failed!');
    }
    if (m.stats.length) await changeStats(t, m.stats);
    return;
  }

  // --- damaging moves ---
  const eff = m.type ? effectiveness(m.type, t.types) : 1;
  if (['earthquake', 'magnitude', 'bulldoze'].includes(m.id)) World.shake(0.4);
  await VFX.move(m.id, p, 1 - p, { eff });
  if (eff === 0) { await say(`It doesn't affect ${lbl(t)}...`); return; }

  let hits = 1;
  if (m.maxHits) {
    if (m.minHits === m.maxHits) hits = m.minHits;
    else { const r = rand(); hits = r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
  }
  let total = 0, landed = 0, critHappened = false;
  for (let h = 0; h < hits && t.hp > 0; h++) {
    if (h > 0) await VFX.move(m.id, p, 1 - p, { eff });
    const critStage = (m.crit || 0) + (m.id === 'aqua-cutter' ? 1 : 0);
    const crit = FIXED_DAMAGE[m.id] === undefined && rand() < [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
    let dmg = calcDamage(u, t, m, crit, (85 + Math.floor(rand() * 16)) / 100);
    dmg = Math.min(t.hp, Math.max(1, dmg));
    if (m.id === 'false-swipe' && dmg >= t.hp) dmg = t.hp - 1;
    t.hp -= dmg; total += dmg; landed++;
    if (crit) critHappened = true;
    updateHud();
    await World.hit(1 - p, p, eff * (crit ? 1.5 : 1) * (m.power || 60) / 80, { eff, crit, ko: t.hp <= 0 });
    if (crit && hits > 1) await say('A critical hit!', 700);
  }
  if (critHappened && hits === 1) await say('A critical hit!', 900);
  if (eff > 1 || critHappened) World.trainers.cheer(p);
  if (eff > 1) await say("It's super effective!", 900);
  if (eff < 1) await say("It's not very effective...", 900);
  if (hits > 1) await say(`Hit ${landed} time(s)!`, 900);

  if (m.drain > 0 && u.hp < u.maxhp) {
    u.hp = Math.min(u.maxhp, u.hp + Math.max(1, Math.floor(total * m.drain / 100)));
    updateHud();
    await say(`${lbl(t)} had its energy drained!`);
  }

  if (t.hp <= 0) await faint(1 - p);
  else {
    if (m.ailment !== 'none' && m.ailmentChance > 0 && rand() * 100 < m.ailmentChance) await inflict(t, m.ailment, m.name);
    if (m.flinch && rand() * 100 < m.flinch) t.vol.flinch = true; // only matters if the target hasn't moved yet
  }
  if (m.stats.length && u.hp > 0) {
    const chance = m.statChance || 100;
    if (rand() * 100 < chance) {
      if (m.metaCat === 'damage-raise') await changeStats(u, m.stats);
      else if (m.metaCat === 'damage-lower' && t.hp > 0) await changeStats(t, m.stats);
    }
  }
  if (m.drain < 0 && u.hp > 0) {
    const recoil = m.id === 'struggle' ? Math.floor(u.maxhp / 4) : Math.floor(total * -m.drain / 100);
    await hurt(p, Math.max(1, recoil));
    await World.blink(p);
    await say(`${lbl(u)} is damaged by recoil!`);
    if (u.hp <= 0) await faint(p);
  }
}

async function endOfTurn() {
  for (const p of [0, 1]) {
    const m = active(p);
    if (m.hp > 0 && (m.status === 'brn' || m.status === 'psn')) {
      await VFX.status(m.status, p);
      await World.blink(p);
      await hurt(p, Math.max(1, Math.floor(m.maxhp / (m.status === 'brn' ? 16 : 8))));
      await say(`${lbl(m)} is hurt by its ${m.status === 'brn' ? 'burn' : 'poison'}!`);
      if (m.hp <= 0) await faint(p);
    }
    if (m.hp > 0 && m.vol.seed) {
      const foe = active(1 - p);
      const amt = Math.max(1, Math.floor(m.maxhp / 8));
      if (foe.hp > 0) await VFX.other('leech', 1 - p, p);
      await World.blink(p);
      await hurt(p, amt);
      if (foe.hp > 0) foe.hp = Math.min(foe.maxhp, foe.hp + amt);
      updateHud();
      await say(`${lbl(m)}'s health is sapped by Leech Seed!`);
      if (m.hp <= 0) await faint(p);
    }
    if (m.hp > 0 && m.vol.trap) {
      await VFX.other('bound', p);
      await World.blink(p);
      await hurt(p, Math.max(1, Math.floor(m.maxhp / 8)));
      await say(`${lbl(m)} is hurt by ${m.vol.trapName}!`);
      if (--m.vol.trap <= 0) { delete m.vol.trap; if (m.hp > 0) await say(`${lbl(m)} was freed from ${m.vol.trapName}!`); }
      if (m.hp <= 0) await faint(p);
    }
    m.vol.flinch = false;
    m.vol.protect = false;
    m.turnsOut++;
  }
}

async function resolveTurn(actions) {
  for (const p of [0, 1])
    if (actions[p].type === 'switch') await doSwitch(p, actions[p].idx, false);

  const megas = [0, 1].filter(p => actions[p].type === 'move' && actions[p].mega && canMega(p))
    .sort((a, b) => speedOf(active(b)) - speedOf(active(a)));
  for (const p of megas) await megaEvolve(p);

  const prio = p => actions[p].idx >= 0 ? (active(p).moves[actions[p].idx].priority || 0) : 0;
  const order = [0, 1].filter(p => actions[p].type === 'move').sort((a, b) =>
    (prio(b) - prio(a)) || (speedOf(active(b)) - speedOf(active(a))) || (rand() - 0.5));

  for (const p of order) {
    if (active(p).hp <= 0) continue;
    await useMove(p, actions[p].idx);
    World.overview();
    if (battleOver()) return;
  }
  await endOfTurn();
  if (battleOver()) return;
  for (const p of [0, 1])
    if (active(p).hp <= 0 && hasAlive(p)) await doSwitch(p, await chooseReplacement(p), true);
}

// =====================================================================
//  BATTLE FLOW
// =====================================================================
let lastSpecs = null, autoTimer = null;

function showIntro(players) {
  const side = p => `<div class="vsteam"><div class="vsname p${p}" style="color:${p ? '#f87171' : '#60a5fa'}">${PLAYER[p]}${controllers[p] === 'cpu' ? ' (CPU)' : ''}</div>
    <div class="sprs">${players[p].team.map(m => `<img src="${m.sprite}" title="${m.name}" style="${p === 0 ? 'transform:scaleX(-1)' : ''}">`).join('')}</div>
    <div style="color:#cbd5e1">${players[p].team.map(m => `${m.name} Lv${m.level}`).join(' · ')}</div></div>`;
  $('intro').innerHTML = `<h1 class="logo">POKéMON ARENA</h1><div style="font-size:20px;color:#facc15;font-weight:800">${World.themeName(state.theme)}</div><div class="vs">${side(0)}<div class="vsword">VS</div>${side(1)}</div>`;
  $('intro').classList.remove('hidden');
}

async function startBattle(specs) {
  clearTimeout(autoTimer);
  lastSpecs = specs;
  state = {
    players: [0, 1].map(p => ({ team: specs[p].map(s => makeMon(s, p)), active: 0, usedMega: false })),
    token: ++battleToken
  };
  battleActive = true;
  setPaused(false);
  try { await runBattle(); }
  catch (e) { if (!(e instanceof BattleAbort)) throw e; }
}

async function runBattle() {
  World.reset();
  World.trainers.reset();
  state.theme = World.setTheme(settings.theme);
  [0, 1].forEach(p => World.trainers.setup(p, settings.outfits[p], PLAYER[p]));
  World.preload(state.players.flatMap(pl => pl.team.flatMap(m => [m.modelKey, ...(m.megaForm ? [m.megaForm.name] : [])])));
  $('builder').classList.add('hidden');
  $('endScreen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('panel0').innerHTML = $('panel1').innerHTML = $('msg').innerHTML = '';
  clearButtons();
  updateRecButtons();
  showIntro(state.players);
  await wait(2800);
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');

  await say('The battle begins!', 900);
  await doSwitch(0, 0, true);
  await doSwitch(1, 0, true);
  // turn limit keeps unattended auto-play from stalling on an endless stalemate
  const hpLeft = p => state.players[p].team.reduce((a, m) => a + Math.max(0, m.hp) / m.maxhp, 0);
  let turn = 0;
  while (!battleOver() && turn++ < 250) {
    const actions = [await chooseAction(0), await chooseAction(1)];
    await resolveTurn(actions);
  }
  if (!battleOver()) await say('The turn limit was reached! The side with more HP left wins.', 1600);
  const w = battleOver() ? (hasAlive(0) ? 0 : 1) : (hpLeft(0) >= hpLeft(1) ? 0 : 1);
  await say(`<b class="p${w}">${PLAYER[w]}</b> wins the battle!`, 1800);
  World.trainers.celebrate(w);
  World.trainers.dismay(1 - w, 4);
  VFX.victory(World.trainers.list[w].root.position);
  World.focusPoint(World.trainers.list[w].root.position.clone().setY(1.4), 9);
  await wait(1800);
  guard();
  battleActive = false;
  updateRecButtons();
  showEnd(w);
}

// cancel the running battle: stop its flow, timers, effects and menus
function abortBattle() {
  battleToken++;
  battleActive = false;
  for (const rej of pendingChoices) rej(new BattleAbort());
  pendingChoices.clear();
  skipWait = null;
  World.clearTimers();
  VFX.clear();
  World.reset();
  World.trainers.reset();
  clearButtons();
  setPaused(false);
}
function exitToBuilder() {
  abortBattle();
  clearTimeout(autoTimer);
  $('endScreen').classList.add('hidden');
  $('intro').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('builder').classList.remove('hidden');
  updateRecButtons();
  renderTeams();
}
function restartBattle() { abortBattle(); startBattle(lastSpecs); }
function setPaused(v) {
  v = !!v && battleActive;
  PAUSED = v;
  $('pauseMenu').classList.toggle('hidden', !v);
  $('ctlPause').textContent = v ? '▶' : '⏸';
  // paused time is left out of recordings
  if (Rec.recorder) { if (v && Rec.recorder.state === 'recording') Rec.recorder.pause(); else if (!v && Rec.recorder.state === 'paused') Rec.recorder.resume(); }
}

function showEnd(w) {
  const left = state.players[w].team.filter(m => m.hp > 0).length;
  $('endTitle').textContent = `${PLAYER[w]} Wins!`;
  $('endSub').textContent = `${left} Pokémon remaining`;
  $('endScreen').classList.remove('hidden');
  const label = `battle`;
  if (settings.auto) {
    let n = 5;
    const tick = () => {
      if (n === 0) {
        splitRecording(label);
        randomizeTeams(); startBattle(teams.map(t => t.map(s => ({ ...s }))));
        return;
      }
      $('endSub').textContent = `${left} Pokémon remaining · next battle in ${n--}...`;
      autoTimer = setTimeout(tick, 1000);
    };
    autoTimer = setTimeout(tick, 1500);
  } else {
    setTimeout(() => splitRecording(label), 2500);
  }
}

$('rematchBtn').onclick = () => startBattle(lastSpecs);
$('randomBattleBtn').onclick = () => { randomizeTeams(); startBattle(teams.map(t => t.map(s => ({ ...s })))); };
$('builderBtn').onclick = exitToBuilder;
$('ctlPause').onclick = () => setPaused(!PAUSED);
$('ctlRestart').onclick = restartBattle;
$('ctlExit').onclick = exitToBuilder;
$('pmResume').onclick = () => setPaused(false);
$('pmRestart').onclick = restartBattle;
$('pmExit').onclick = exitToBuilder;

// =====================================================================
//  TEAM BUILDER
// =====================================================================
let editing = 0;

function makeSpec(species, level) {
  const sp = DEX.species[species];
  const lv = Math.max(sp.minLevel, Math.min(100, level));
  return { species, level: lv, mega: null, moves: defaultMoves(species, lv) };
}

function randomTeam() {
  const LEGENDARY = ['mewtwo', 'rayquaza'];
  // balanced pool: fully evolved, non-legendary Pokémon only
  const pool = DEX.order.filter(n => DEX.species[n].minLevel <= settings.level &&
    (settings.pool === 'any' || (!DEX.species[n].evolvesTo.length && !LEGENDARY.includes(n))));
  const picks = [];
  while (picks.length < settings.teamSize && pool.length) picks.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return picks.map(n => {
    const s = makeSpec(n, settings.level);
    const megas = DEX.species[n].megas;
    if (megas.length && rand() < 0.6) s.mega = megas[Math.floor(rand() * megas.length)].name;
    return s;
  });
}
function randomizeTeams() { teams[0] = randomTeam(); teams[1] = randomTeam(); }

function renderDex() {
  const q = $('search').value.trim().toLowerCase(), tf = $('typeFilter').value, megaOnly = $('megaOnly').checked;
  $('dex').innerHTML = '';
  let shown = 0;
  for (const n of DEX.order) {
    const s = DEX.species[n];
    if (q && !s.display.toLowerCase().includes(q)) continue;
    if (tf && !s.types.includes(tf)) continue;
    if (megaOnly && !s.megas.length) continue;
    shown++;
    const c = document.createElement('div');
    c.className = 'dexcard';
    const evo = s.evoFrom ? `from ${DEX.species[s.evoFrom].display} · ${s.evoMethod}` : 'Base form';
    c.title = `${s.display}\n${evo}\nMin level ${s.minLevel}` + (s.megas.length ? `\nMega: ${s.megas.map(m => `${m.display} (${m.stone})`).join(', ')}` : '');
    c.innerHTML = `${s.megas.length ? '<span class="mg mega-badge">MEGA</span>' : ''}
      <div class="spr"><img loading="lazy" src="${s.sprite}"></div>
      <div class="nm">#${s.id} ${s.display}</div>
      <div>${s.types.map(typeBadge).join('')}</div>
      <div class="meta">${s.minLevel > 1 ? `Lv ${s.minLevel}+ · ${s.evoMethod}` : 'Base form'}</div>`;
    c.onclick = () => {
      if (teams[editing].length >= settings.teamSize) { toast(`${PLAYER[editing]}'s team is full (${settings.teamSize}). Remove one or raise team size.`); return; }
      teams[editing].push(makeSpec(n, settings.level));
      renderTeams();
    };
    $('dex').append(c);
  }
  $('dexCount').textContent = `${shown} of ${DEX.order.length}`;
}

function renderTeams() {
  for (const p of [0, 1]) {
    const row = $('team' + p);
    const name = `${PLAYER[p]} <small>${teams[p].length}/${settings.teamSize}</small>`;
    $('edit' + p).innerHTML = name;
    row.classList.toggle('editing', editing === p);
    row.classList.toggle('compact', editing !== p);
    if (editing !== p) {
      // the team not being edited collapses to a strip of sprites; click to edit it
      row.innerHTML = `<div class="teamhead"><span style="color:${p ? '#f87171' : '#60a5fa'}">${PLAYER[p]}</span>
        <span class="muted">${controllers[p] === 'cpu' ? 'CPU' : 'Human'} · ${teams[p].length}/${settings.teamSize} · click to edit</span></div>
        <div class="strip">${teams[p].map(s => `<img src="${DEX.species[s.species].sprite}" title="${DEX.species[s.species].display} Lv${s.level}">`).join('') || '<span class="muted">No Pokémon yet</span>'}</div>`;
      row.onclick = () => setEditing(p);
      continue;
    }
    row.innerHTML = `<div class="teamhead"><span class="p${p}" style="color:${p ? '#f87171' : '#60a5fa'}">${PLAYER[p]}</span>
      <input class="pname-input" data-name="${p}" value="${PLAYER[p]}" maxlength="14" title="Trainer name">
      <select data-outfit="${p}" title="Trainer outfit">${Object.entries(OUTFITS).map(([k, o]) => `<option value="${k}" ${settings.outfits[p] === k ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
      <select data-ctrl="${p}"><option value="human">Human</option><option value="cpu">CPU</option></select>
      <button class="small" data-rand="${p}">Random</button><button class="small" data-clear="${p}">Clear</button>
      <span style="font-weight:600;color:#94a3b8;font-size:12px">${teams[p].length}/${settings.teamSize}</span></div><div class="slots"></div>`;
    row.querySelector('[data-ctrl]').value = controllers[p];
    row.querySelector('[data-ctrl]').onchange = e => { controllers[p] = e.target.value; };
    row.querySelector('[data-name]').onchange = e => { PLAYER[p] = e.target.value.trim() || `Player ${p + 1}`; World.trainers.setup(p, settings.outfits[p], PLAYER[p]); };
    row.querySelector('[data-outfit]').onchange = e => { settings.outfits[p] = e.target.value; World.trainers.setup(p, settings.outfits[p], PLAYER[p]); };
    row.querySelector('[data-rand]').onclick = () => { teams[p] = randomTeam(); renderTeams(); };
    row.querySelector('[data-clear]').onclick = () => { teams[p] = []; renderTeams(); };
    row.onclick = e => { if (e.target === row || e.target.classList.contains('teamhead')) setEditing(p); };
    const slots = row.querySelector('.slots');
    for (let i = 0; i < settings.teamSize; i++) {
      const spec = teams[p][i];
      if (!spec) {
        const e = document.createElement('div');
        e.className = 'slot empty';
        e.textContent = 'Click a Pokémon above';
        e.onclick = () => setEditing(p);
        slots.append(e);
        continue;
      }
      slots.append(slotEl(p, i, spec));
    }
  }
}

function slotEl(p, i, spec) {
  const sp = DEX.species[spec.species];
  const el = document.createElement('div');
  el.className = 'slot';
  const avail = learnable(spec.species, spec.level);
  const moveOpts = sel => `<option value="">— none —</option>` + avail.map(id => {
    const m = MOVES[id];
    return `<option value="${id}" ${id === sel ? 'selected' : ''}>${m.name} (${m.type}${m.power ? ' ' + m.power : ''})</option>`;
  }).join('');
  const evos = sp.evolvesTo.map(n => DEX.species[n]).filter(e => e);
  el.innerHTML = `
    <button class="x" title="Remove">✕</button>
    <div class="hd"><img src="${sp.sprite}"><div><b>${sp.display}</b><div>${sp.types.map(typeBadge).join('')}</div></div></div>
    <div class="lvrow">Lv <input type="number" min="${sp.minLevel}" max="100" value="${spec.level}"> <span style="color:#94a3b8">min ${sp.minLevel}</span></div>
    ${sp.megas.length ? `<select data-mega><option value="">No Mega Stone</option>${sp.megas.map(m => `<option value="${m.name}" ${spec.mega === m.name ? 'selected' : ''}>${m.stone} → ${m.display}</option>`).join('')}</select>` : ''}
    ${[0, 1, 2, 3].map(k => `<select data-move="${k}">${moveOpts(spec.moves[k])}</select>`).join('')}
    <div>${sp.evoFrom ? `<button class="evo" data-devo>◀ ${DEX.species[sp.evoFrom].display}</button>` : ''}${evos.map(e => `<button class="evo" data-evo="${e.name}" title="${e.evoMethod}">${e.display} ▶</button>`).join('')}</div>`;
  el.querySelector('.x').onclick = () => { teams[p].splice(i, 1); renderTeams(); };
  el.querySelector('input').onchange = e => {
    spec.level = Math.max(sp.minLevel, Math.min(100, parseInt(e.target.value) || sp.minLevel));
    const ok = learnable(spec.species, spec.level);
    spec.moves = spec.moves.filter(id => ok.includes(id));
    if (!spec.moves.length) spec.moves = defaultMoves(spec.species, spec.level);
    renderTeams();
  };
  const megaSel = el.querySelector('[data-mega]');
  if (megaSel) megaSel.onchange = e => { spec.mega = e.target.value || null; };
  el.querySelectorAll('[data-move]').forEach(s => s.onchange = e => {
    const k = +e.target.dataset.move;
    const next = spec.moves.slice();
    next[k] = e.target.value;
    spec.moves = next.filter((id, j) => id && next.indexOf(id) === j);
    renderTeams();
  });
  const changeSpecies = name => {
    const ns = makeSpec(name, Math.max(spec.level, DEX.species[name].minLevel));
    if (!DEX.species[name].megas.some(m => m.name === spec.mega)) ns.mega = null; else ns.mega = spec.mega;
    teams[p][i] = ns;
    renderTeams();
  };
  el.querySelectorAll('[data-evo]').forEach(b => b.onclick = () => changeSpecies(b.dataset.evo));
  const devo = el.querySelector('[data-devo]');
  if (devo) devo.onclick = () => changeSpecies(sp.evoFrom);
  return el;
}

function setEditing(p) {
  editing = p;
  $('edit0').className = p === 0 ? 'on0' : '';
  $('edit1').className = p === 1 ? 'on1' : '';
  renderTeams();
}

// builder wiring
Object.keys(TYPE_COLORS).forEach(t => $('typeFilter').insertAdjacentHTML('beforeend', `<option>${t}</option>`));
$('search').oninput = renderDex;
$('typeFilter').onchange = renderDex;
$('megaOnly').onchange = renderDex;
$('edit0').onclick = () => setEditing(0);
$('edit1').onclick = () => setEditing(1);
$('setSize').onchange = e => {
  settings.teamSize = +e.target.value;
  teams.forEach((t, p) => teams[p] = t.slice(0, settings.teamSize));
  renderTeams();
};
$('setLevel').onchange = e => { settings.level = Math.max(1, Math.min(100, +e.target.value || 50)); e.target.value = settings.level; };
$('setSpeed').onchange = e => { SPEED = +e.target.value; };
$('setAuto').onchange = e => {
  settings.auto = e.target.checked;
  if (settings.auto) { controllers[0] = controllers[1] = 'cpu'; renderTeams(); }
};
$('setMute').onchange = e => { muted = e.target.checked; };
$('setLength').onchange = e => { settings.hpMult = +e.target.value; };
$('setPool').onchange = e => { settings.pool = e.target.value; };
World.themeKeys.forEach(k => $('setTheme').insertAdjacentHTML('beforeend', `<option value="${k}">${World.themeName(k)}</option>`));
$('setTheme').onchange = e => { settings.theme = e.target.value; if (settings.theme !== 'random') World.setTheme(settings.theme); };
$('randomBoth').onclick = () => { randomizeTeams(); renderTeams(); };
$('startBtn').onclick = () => {
  if (!teams[0].length || !teams[1].length) { toast('Both players need at least one Pokémon.'); return; }
  if (teams.some(t => t.some(s => !s.moves.length)))
    toast('A Pokémon with no moves will use Struggle.', 3000);
  startBattle(teams.map(t => t.map(s => ({ ...s, moves: s.moves.slice() }))));
};

renderDex();
renderTeams();
World.setTheme('stadium');
[0, 1].forEach(p => World.trainers.setup(p, settings.outfits[p], PLAYER[p]));
startLoop();
