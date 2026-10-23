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
const BANNED = new Set(['skull-bash', 'razor-wind',
  'focus-punch', 'future-sight', 'self-destruct', 'explosion', 'dream-eater', 'belly-drum', 'curse', 'substitute', 'last-resort',
  'counter', 'mirror-coat', 'metal-burst', 'bide', 'synchronoise', 'swagger', 'flatter', 'mirror-move', 'sleep-talk', 'snore',
  'role-play', 'steel-beam', 'mind-blown', 'memento']);
// two-turn moves (charge, then strike; Fly/Dig hide the user in between) and moves that need a recharge turn
const TWO_TURN = {
  'solar-beam': { msg: 'took in sunlight!' }, 'solar-blade': { msg: 'absorbed light!' }, 'sky-attack': { msg: 'became cloaked in a harsh light!' },
  'meteor-beam': { msg: 'is overflowing with space power!' },
  fly: { msg: 'flew up high!', hide: 'fly' }, bounce: { msg: 'sprang up!', hide: 'fly' },
  dig: { msg: 'burrowed its way under the ground!', hide: 'dig' }, dive: { msg: 'hid underwater!', hide: 'dive' },
  'phantom-force': { msg: 'vanished instantly!', hide: 'vanish' }, 'shadow-force': { msg: 'vanished instantly!', hide: 'vanish' }
};
const RECHARGE_MOVES = new Set(['hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'roar-of-time', 'rock-wrecker', 'prismatic-laser', 'eternabeam']);
// the few moves that can reach a Pokémon in the sky or underground (value = damage multiplier)
const HITS_HIDDEN = { fly: { thunder: 1, hurricane: 1, gust: 2, twister: 2, 'sky-uppercut': 1, 'smack-down': 1 }, dig: { earthquake: 2, magnitude: 2, fissure: 1 }, dive: { surf: 2, whirlpool: 2 }, vanish: {} };
const moveTiming = id => TWO_TURN[id] ? (TWO_TURN[id].hide ? 0.8 : 0.65) : RECHARGE_MOVES.has(id) ? 0.7 : 1;
// classic TM moves, on top of the level-up learnsets
const NO_FLY = new Set(['gyarados', 'butterfree', 'beautifly', 'scyther', 'yanma', 'ledyba', 'ledian', 'masquerain', 'mothim', 'vespiquen', 'combee']);
const STARTERS = {
  grass: ['venusaur', 'meganium', 'sceptile', 'torterra', 'serperior', 'chesnaught', 'decidueye', 'rillaboom', 'meowscarada'],
  fire: ['charizard', 'typhlosion', 'blaziken', 'infernape', 'emboar', 'delphox', 'incineroar', 'cinderace', 'skeledirge'],
  water: ['blastoise', 'feraligatr', 'swampert', 'empoleon', 'samurott', 'greninja', 'primarina', 'inteleon', 'quaquaval']
};
function tmMoves(species) {
  const sp = DEX.species[species], out = [];
  if (sp.types.includes('Grass')) out.push('solar-beam');
  if (sp.types.includes('Flying') && !NO_FLY.has(species)) out.push('fly');
  if (sp.types.includes('Ground') || sp.types.includes('Rock')) out.push('dig');
  if (!sp.evolvesTo.length) out.push('hyper-beam');
  if (sp.types.includes('Water')) out.push('dive');
  // the ultimate moves taught to fully evolved starters
  if (STARTERS.grass.includes(species)) out.push('frenzy-plant');
  if (STARTERS.fire.includes(species)) out.push('blast-burn');
  if (STARTERS.water.includes(species)) out.push('hydro-cannon');
  return out.filter(id => MOVES[id]);
}
const UNIQUE_OK = new Set(['rest', 'protect', 'detect', 'shell-smash', 'wave-crash', 'aqua-cutter']);
const OK_META = new Set(['damage', 'ailment', 'net-good-stats', 'heal', 'damage-ailment', 'damage-raise', 'damage-lower', 'damage-heal', 'unique']);
const FIXED_DAMAGE = { 'seismic-toss': 'level', 'night-shade': 'level', 'dragon-rage': 40, 'sonic-boom': 20, 'super-fang': 'half', 'natures-madness': 'half', 'ruination': 'half' };
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

function learnable(species, level, withTMs = true) {
  const out = [];
  for (const [lvl, id] of DEX.species[species].learnset)
    if (lvl <= level && moveSupported(id) && !out.includes(id)) out.push(id);
  if (withTMs) for (const id of tmMoves(species)) if (moveSupported(id) && !out.includes(id)) out.push(id);
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
    return p * moveTiming(id);
  };
  const pool = learnable(species, level, false).map(id => ({ id, s: score(id) }));
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
  if (prefs.shorts) {
    try { await Rec.stream.getVideoTracks()[0].cropTo(await CropTarget.fromElement(document.getElementById('frame'))); }
    catch (e) { toast('This browser cannot crop the recording to 9:16 — crop it in your editor.', 5000); }
  }
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
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem('pokemon-arena-prefs') || '{}'); } catch (e) {}
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
  if (state && state.started && battleActive) {
    const pinch = [0, 1].some(p => { const m = active(p); return m && (m.hp / m.maxhp < 0.25 || state.players[p].team.filter(x => x.hp > 0).length === 1); });
    AudioFX.Music.setLevel(pinch ? 2 : 1);
  }
  for (const p of [0, 1]) {
    const m = active(p);
    if (!m) continue;
    World.setTint(p, m.status);
    World.setState(p, m.status, m.hp / m.maxhp);
    Broadcast.setName(p, m.name);
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
    const fx = FIXED_DAMAGE[m.id];
    return fx === 'level' ? u.level : fx === 'half' ? Math.max(1, Math.floor(t.hp / 2)) : fx;
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
    return s * (m.acc || 100) / 100 * moveTiming(m.id) + (m.priority > 0 && d >= t.hp ? 0.3 : 0);
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

const chooseAction = p => {
  const v = active(p).vol;
  if (v.charging) return Promise.resolve({ type: 'move', idx: v.charging.idx, mega: false });
  if (v.recharge) return Promise.resolve({ type: 'recharge' });
  return controllers[p] === 'cpu' ? chooseActionCPU(p) : chooseActionHuman(p);
};
// 3D: Fly / Dig take the Pokémon off the field until its next turn
async function hideMon(p, kind) {
  const A = World.actors[p];
  if (!A.visible) return;
  SFX.whoosh();
  World.focusOne(p);
  if (kind === 'fly') await tween(0.6, k => { A.lift = easeIn(k) * 8; A.opacity = 1 - k * k; });
  else if (kind === 'vanish') await tween(0.5, k => { A.opacity = 1 - k; });
  else { World.shake(0.25); SFX.rumble(0.6); await tween(0.55, k => { A.lift = -k * 1.4; A.opacity = 1 - k; }); }
  A.visible = false; A.lift = 0; A.opacity = 1; A.hidden = kind;
  World.overview();
}
async function unhideMon(p) {
  const A = World.actors[p];
  if (!A.hidden) return;
  const kind = A.hidden;
  A.hidden = null; A.visible = true;
  if (kind === 'fly') await tween(0.28, k => { A.lift = (1 - easeOut(k)) * 8; });
  else { World.shake(0.3); SFX.rumble(0.4); await tween(0.25, k => { A.lift = -(1 - k) * 1.4; }); }
  A.lift = 0;
}

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
  if (World.actors[p].hidden) { World.actors[p].hidden = null; World.actors[p].visible = true; }
  playCry(m, 0.8);
  SFX.faint();
  Broadcast.pop(p, 'ko');
  World.cheer(1);
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
  if (forced && state.started && pl.team.filter(x => x.hp > 0).length === 1) { Broadcast.bigText('LAST POKéMON!', 'last', 1400); World.cheer(0.9); }
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
  Broadcast.banner('MEGA EVOLUTION!', f.types[0]);
  World.focusOne(p, { elev: 0.2, dist: 0.85 });
  later(() => Broadcast.captureThumb(6, `MEGA ${u.name.toUpperCase()}!`), 1500);
  await VFX.other('megaevo', p);
  World.focusOne(p, { elev: 0.22, dist: 0.85 });
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
  const charged = !!(u.vol.charging && u.vol.charging.id === m.id);
  if (u.vol.charging) { delete u.vol.charging; await unhideMon(p); }

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

  if (idx >= 0 && !charged) m.ppLeft--;
  World.trainers.command(p);
  Broadcast.banner(m.name, m.type || 'Normal');
  await say(`${lbl(u)} used <b>${m.name}</b>!`, 900);
  if (TWO_TURN[m.id] && !charged) {
    u.vol.charging = { id: m.id, idx };
    if (TWO_TURN[m.id].hide) await hideMon(p, TWO_TURN[m.id].hide);
    else { World.focusOne(p, { elev: 0.3, dist: 0.9 }); World.flex(p); SFX.buff(); await VFX.status('charge', p).catch(() => {}); await wait(500); World.overview(); }
    await say(`${lbl(u)} ${TWO_TURN[m.id].msg}`);
    return;
  }

  const selfTarget = SELF_TARGETS.has(m.target) || m.id === 'rest';
  if (!selfTarget && t.hp <= 0) { await say('But there was no target...'); return; }
  if (m.id === 'fake-out' && u.turnsOut > 0) { await say('But it failed!'); return; }
  let hiddenMult = 1;
  if (!selfTarget && t.vol.charging && TWO_TURN[t.vol.charging.id] && TWO_TURN[t.vol.charging.id].hide) {
    const k = HITS_HIDDEN[TWO_TURN[t.vol.charging.id].hide][m.id];
    if (!k) { Broadcast.pop(1 - p, 'miss'); await say(`${lbl(u)}'s attack missed! ${lbl(t)} is ${TWO_TURN[t.vol.charging.id].hide === 'fly' ? 'up in the sky' : 'underground'}!`); return; }
    hiddenMult = k;
  }
  if (!selfTarget && t.vol.protect) {
    await VFX.move(m.id, p, 1 - p, { blocked: true });
    Broadcast.pop(1 - p, 'block');
    await say(`${lbl(t)} protected itself!`);
    return;
  }
  if (!selfTarget && m.acc != null) {
    const st = Math.max(-6, Math.min(6, u.stages.acc - t.stages.eva));
    if (rand() * 100 >= m.acc * accMult(st)) {
      await Promise.all([VFX.move(m.id, p, 1 - p, { miss: true }), wait(120).then(() => World.dodge(1 - p, p))]);
      Broadcast.pop(1 - p, 'miss');
      AudioFX.Crowd.gasp();
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
  if (eff === 0) { Broadcast.pop(1 - p, 'immune'); AudioFX.Crowd.gasp(); await say(`It doesn't affect ${lbl(t)}...`); return; }

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
    if (hiddenMult > 1) dmg = Math.floor(dmg * hiddenMult);
    dmg = Math.min(t.hp, Math.max(1, dmg));
    if (m.id === 'false-swipe' && dmg >= t.hp) dmg = t.hp - 1;
    t.hp -= dmg; total += dmg; landed++;
    if (crit) critHappened = true;
    u.dmgDealt = (u.dmgDealt || 0) + dmg;
    updateHud();
    Broadcast.damage(1 - p, dmg, { crit, eff });
    if (crit || t.hp <= 0) World.slowmo(0.35, 900);
    await World.hit(1 - p, p, eff * (crit ? 1.5 : 1) * (m.power || 60) / 80, { eff, crit, ko: t.hp <= 0 });
    if (crit && hits > 1) await say('A critical hit!', 700);
  }
  if (critHappened) Broadcast.pop(1 - p, 'crit'); else if (eff > 1) Broadcast.pop(1 - p, 'super'); else if (eff < 1) Broadcast.pop(1 - p, 'weak');
  // remember big moments for the highlights reel and thumbnail
  const ko = t.hp <= 0;
  const score = (ko ? 3 : 0) + (critHappened ? 2 : 0) + (eff > 1 ? 1.5 : 0) + total / t.maxhp * 2;
  if (score >= 2) {
    Broadcast.addMoment({ score, side: p, moveId: m.id, type: m.type || 'Normal', label: `${u.name}'s ${m.name}`, damage: total, power: eff * (m.power || 60) / 80,
      outcome: { eff, crit: critHappened, ko }, a: { modelKey: u.modelKey, sprite: u.sprite }, d: { modelKey: t.modelKey, sprite: t.sprite } });
    Broadcast.captureThumb(score, ko ? 'KNOCKOUT!' : critHappened ? 'CRITICAL HIT!' : 'SUPER EFFECTIVE!');
  }
  if (ko) u.kos = (u.kos || 0) + 1;
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

  if (t.hp <= 0 && prefs.replays !== false && !state.players[1 - p].team.some(x => x.hp > 0)) {
    Broadcast.bigText('REPLAY', 'replay', 1100);
    SFX.banner();
    await wait(800);
    const slow = World.slowmo(0.4, 2800);
    await VFX.move(m.id, p, 1 - p, { eff });
    World.focusOne(1 - p, { elev: 0.18, dist: 0.9 });
    await World.hit(1 - p, p, 2, { eff, crit: critHappened, ko: true });
    await slow;
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
  if (RECHARGE_MOVES.has(m.id) && landed > 0 && u.hp > 0) u.vol.recharge = true;
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
  const order = [0, 1].filter(p => actions[p].type === 'move' || actions[p].type === 'recharge').sort((a, b) =>
    (prio(b) - prio(a)) || (speedOf(active(b)) - speedOf(active(a))) || (rand() - 0.5));

  for (const p of order) {
    if (active(p).hp <= 0) continue;
    if (actions[p].type === 'recharge') { delete active(p).vol.recharge; World.blink(p); await say(`${lbl(active(p))} must recharge!`); continue; }
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
let lastSpecs = null, lastMeta = {}, autoTimer = null;

function showIntro(players) {
  const side = p => `<div class="vsteam"><div class="vsname p${p}" style="color:${p ? '#f87171' : '#60a5fa'}">${PLAYER[p]}${controllers[p] === 'cpu' ? ' (CPU)' : ''}</div>
    <div class="sprs">${players[p].team.map(m => `<img src="${m.sprite}" title="${m.name}" style="${p === 0 ? 'transform:scaleX(-1)' : ''}">`).join('')}</div>
    <div style="color:#cbd5e1">${players[p].team.map(m => `${m.name} Lv${m.level}`).join(' · ')}</div></div>`;
  $('intro').innerHTML = `<h1 class="logo">POKéMON ARENA</h1><div style="font-size:20px;color:#facc15;font-weight:800">${World.themeName(state.theme)}</div><div class="vs">${side(0)}<div class="vsword">VS</div>${side(1)}</div>`;
  $('intro').classList.remove('hidden');
}

async function startBattle(specs, meta = {}) {
  clearTimeout(autoTimer);
  lastSpecs = specs; lastMeta = meta;
  const fmt = meta.format || '1v1';
  let players, multi = null;
  if (fmt === 'royale' || fmt === 'brawl') {
    // multi battle (Retro 2D): one slot per Pokémon; Battle Royale gives each its own side, Team Brawl keeps the two teams
    const entries = fmt === 'royale' ? specs[0].map((s, i) => [s, i]) : specs.flatMap((t, side) => t.map(s => [s, side]));
    players = entries.map(([s, side]) => ({ team: [makeMon(s, side)], active: 0, usedMega: false }));
    multi = { mode: fmt, side: entries.map(([, side]) => side), names: fmt === 'royale' ? players.map(pl => pl.team[0].name) : [PLAYER[0], PLAYER[1]] };
  } else players = [0, 1].map(p => ({ team: specs[p].map(s => makeMon(s, p)), active: 0, usedMega: false }));
  state = { players, multi, token: ++battleToken, meta, started: false };
  battleActive = true;
  setPaused(false);
  try { await runBattle(); }
  catch (e) { if (!(e instanceof BattleAbort)) throw e; }
}

async function runRetroBattle() {
  $('builder').classList.add('hidden');
  $('endScreen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('bracket').classList.add('hidden');
  $('intro').classList.add('hidden');
  clearButtons();
  Broadcast.resetBattle();
  updateRecButtons();
  state.started = true;
  const w = await Retro.battle({ subtitle: state.meta.subtitle, lines: state.meta.lines });
  guard();
  // records / Hall of Fame track trainer battles; multi battles aren't recorded
  if (!state.multi) Stats.saveBattle({
    names: [PLAYER[0], PLAYER[1]], winner: w,
    mons: state.players.flatMap((pl, side) => pl.team.map(m => ({ species: m.species, name: m.name, side, kos: m.kos || 0, dmg: m.dmgDealt || 0 })))
  });
  battleActive = false;
  updateRecButtons();
  if (Tour.onBattleEnd(w)) return;
  showEnd(w);
}

async function runBattle() {
  if (prefs.mode === 'retro' || state.multi) return runRetroBattle();
  Retro.stop();
  if (!World.has3D) { toast('Loading 3D…', 6000); await window.load3D(); guard(); }
  World.reset();
  World.actors.forEach(a => { a.hidden = null; });
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
  Broadcast.resetBattle();
  $('bracket').classList.add('hidden');
  const arena = World.themeName(state.theme);
  await Broadcast.intro({
    battleNo: Stats.battleNo(), names: [PLAYER[0], PLAYER[1]], arena,
    subtitle: state.meta.subtitle ? `${state.meta.subtitle} · ${arena}` : arena,
    records: [Stats.recordText(PLAYER[0]), Stats.recordText(PLAYER[1])],
    teams: state.players.map(pl => pl.team.map(m => ({ name: m.name, sprite: m.sprite }))),
    lines: state.meta.lines
  });
  guard();
  state.started = true;
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
  AudioFX.Music.victory();
  World.cheer(1);
  Broadcast.bigText(`${PLAYER[w]} WINS!`, 'start', 1800);
  await say(`<b class="p${w}">${PLAYER[w]}</b> wins the battle!`, 1800);
  World.trainers.celebrate(w);
  World.trainers.dismay(1 - w, 4);
  VFX.victory(World.trainers.list[w].root.position);
  const endL = state.meta.endLines;
  if (endL) { Broadcast.speech(w, endL[w] && endL[w].win, 2600); Broadcast.speech(1 - w, endL[1 - w] && endL[1 - w].lose, 2600); }
  const champ = World.actors[w].visible ? World.actors[w].root.position : World.trainers.list[w].root.position;
  World.orbit(champ.clone().lerp(World.trainers.list[w].root.position, 0.5).setY(1.4), 11, 0.3, 0.35);
  await wait(3600);
  guard();
  Stats.saveBattle({
    names: [PLAYER[0], PLAYER[1]], winner: w,
    mons: state.players.flatMap((pl, side) => pl.team.map(m => ({ species: m.species, name: m.name, side, kos: m.kos || 0, dmg: m.dmgDealt || 0 })))
  });
  if (prefs.highlights !== false && Broadcast.hasMoments()) {
    splitRecording('highlights');
    await Broadcast.reel();
    guard();
    splitRecording('battle');
  }
  battleActive = false;
  updateRecButtons();
  if (Tour.onBattleEnd(w)) return;
  showEnd(w);
}

// cancel the running battle: stop its flow, timers, effects and menus
function abortBattle() {
  battleToken++;
  TIME_SCALE = 1;
  FX_TIME = 1;
  AudioFX.Music.stop();
  AudioFX.Crowd.stop();
  Broadcast.resetBattle();
  World.trainers.place();
  battleActive = false;
  Retro.stop();
  for (const rej of pendingChoices) rej(new BattleAbort());
  pendingChoices.clear();
  skipWait = null;
  World.clearTimers();
  if (World.has3D) VFX.clear();
  World.reset();
  World.trainers.reset();
  clearButtons();
  setPaused(false);
}
function exitToBuilder() {
  abortBattle();
  Tour.inMatch = false;
  Tour.restore();
  hideBracket();
  clearTimeout(autoTimer);
  $('endScreen').classList.add('hidden');
  $('intro').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('builder').classList.remove('hidden');
  updateRecButtons();
  renderTeams();
}
function restartBattle() { abortBattle(); startBattle(lastSpecs, lastMeta); }
function setPaused(v) {
  v = !!v && battleActive;
  PAUSED = v;
  AudioFX.suspend(v);
  document.body.classList.toggle('paused', v);
  $('pauseMenu').classList.toggle('hidden', !v);
  $('ctlPause').textContent = v ? '▶' : '⏸';
  // paused time is left out of recordings
  if (Rec.recorder) { if (v && Rec.recorder.state === 'recording') Rec.recorder.pause(); else if (!v && Rec.recorder.state === 'paused') Rec.recorder.resume(); }
}

function showEnd(w) {
  const m = state.multi;
  const left = m ? state.players.filter((pl, p) => m.side[p] === w && pl.team[0].hp > 0).length : state.players[w].team.filter(x => x.hp > 0).length;
  const sub = m && m.mode === 'royale' ? `Last one standing out of ${state.players.length}` : `${left} Pokémon remaining`;
  $('endTitle').textContent = `${m ? m.winnerName : PLAYER[w]} Wins!`;
  $('endSub').textContent = sub;
  $('endScreen').classList.remove('hidden');
  const label = `battle`;
  if (settings.auto) {
    let n = 5;
    const tick = () => {
      if (n === 0) {
        splitRecording(label);
        randomizeTeams(); startBattle(teams.map(t => t.map(s => ({ ...s }))), { format: settings.format });
        return;
      }
      $('endSub').textContent = `${sub} · next battle in ${n--}...`;
      autoTimer = setTimeout(tick, 1000);
    };
    autoTimer = setTimeout(tick, 1500);
  } else {
    setTimeout(() => splitRecording(label), 2500);
  }
}

$('rematchBtn').onclick = () => startBattle(lastSpecs, lastMeta);
$('thumbBtn').onclick = async () => {
  const url = await Broadcast.thumbnailURL([PLAYER[0], PLAYER[1]]);
  if (!url) { toast('No big moment to capture yet — win with a crit, KO or Mega Evolution!'); return; }
  const a = document.createElement('a'); a.href = url; a.download = `pokemon-thumbnail-${Date.now()}.png`; a.click();
  toast('Thumbnail saved to your Downloads folder');
};
$('tourneyBtn').onclick = () => openTourneySetup();
$('recordsBtn').onclick = () => openRecords();
$('randomBattleBtn').onclick = () => { randomizeTeams(); startBattle(teams.map(t => t.map(s => ({ ...s }))), { format: settings.format }); };
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
// battle format: 1v1 trainer battle, Battle Royale (free-for-all) or Team Brawl (whole teams on the field at once)
const FORMAT_SIZES = { '1v1': [1, 6], royale: [2, 8], brawl: [1, 4] };
const FORMAT_LABEL = { '1v1': 'Team size', royale: 'Entrants', brawl: 'Per team' };
const formatSizes = { '1v1': 3, royale: 8, brawl: 3, ...prefs.sizes };
settings.format = FORMAT_SIZES[prefs.format] ? prefs.format : '1v1';
const teamTitle = p => settings.format === 'royale' ? 'Entrants' : PLAYER[p];
function applyFormat(fmt) {
  settings.format = fmt;
  const [lo, hi] = FORMAT_SIZES[fmt];
  settings.teamSize = clamp(formatSizes[fmt], lo, hi);
  $('setSize').innerHTML = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(n => `<option ${n === settings.teamSize ? 'selected' : ''}>${n}</option>`).join('');
  $('sizeLbl').textContent = FORMAT_LABEL[fmt];
  document.querySelectorAll('.fmtSeg button').forEach(b => b.classList.toggle('on0', b.dataset.fmt === fmt));
  document.body.classList.toggle('fmtRoyale', fmt === 'royale');
  document.body.classList.toggle('fmtMulti', fmt !== '1v1');
  teams.forEach((t, p) => teams[p] = t.slice(0, settings.teamSize));
  if (fmt === 'royale') editing = 0;
  if (fmt !== '1v1' && prefs.mode === '3d') { applyMode('retro'); savePrefs(); toast('Battle Royale and Team Brawl play in Retro 2D.', 3000); }
  setEditing(editing);
}

function makeSpec(species, level) {
  const sp = DEX.species[species];
  const lv = Math.max(sp.minLevel, Math.min(100, level));
  return { species, level: lv, mega: null, moves: defaultMoves(species, lv) };
}

function randomTeam() {
  const LEGENDARY = ['mewtwo', 'rayquaza', 'articuno', 'zapdos', 'moltres', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'kyogre', 'groudon', 'latias', 'latios', 'dialga', 'palkia', 'giratina', 'darkrai'];
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
function randomizeTeams() { teams[0] = randomTeam(); teams[1] = settings.format === 'royale' ? [] : randomTeam(); }

// Pokédex generation tabs: national dex number ranges of each generation
const GENS = [[1, 151], [152, 251], [252, 386], [387, 493], [494, 649], [650, 721], [722, 809], [810, 905], [906, 1025]];
const genOf = id => GENS.findIndex(([a, b]) => id >= a && id <= b) + 1;
let dexGen = +prefs.dexGen || 0;                     // 0 = all generations
function renderGenTabs(counts) {
  $('genTabs').innerHTML = ['All', ...GENS.map((_, i) => `Gen ${i + 1}`)]
    .map((label, g) => `<button role="tab" data-gen="${g}" aria-selected="${g === dexGen}">${label}<small>${counts[g]}</small></button>`).join('');
  $('genTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    dexGen = +b.dataset.gen; prefs.dexGen = dexGen; savePrefs();
    renderDex();
    $('dex').scrollTop = 0;
    $('genTabs').querySelector('[aria-selected="true"]').scrollIntoView({ inline: 'nearest', block: 'nearest' });
  });
}

function renderDex() {
  const q = $('search').value.trim().toLowerCase(), tf = $('typeFilter').value, megaOnly = $('megaOnly').checked;
  const match = DEX.order.filter(n => {
    const s = DEX.species[n];
    return (!q || s.display.toLowerCase().includes(q)) && (!tf || s.types.includes(tf)) && (!megaOnly || s.megas.length);
  });
  // each tab counts what the search / type / Mega filters leave in that generation
  const counts = new Array(GENS.length + 1).fill(0);
  for (const n of match) { counts[0]++; counts[genOf(DEX.species[n].id)]++; }
  renderGenTabs(counts);
  const list = match.filter(n => !dexGen || genOf(DEX.species[n].id) === dexGen).sort((a, b) => DEX.species[a].id - DEX.species[b].id);
  $('dex').innerHTML = '';
  for (const n of list) {
    const s = DEX.species[n];
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
  $('dexCount').textContent = `${list.length} of ${DEX.order.length}`;
}

function renderTeams() {
  for (const p of [0, 1]) {
    const row = $('team' + p);
    const name = `${teamTitle(p)} <small>${teams[p].length}/${settings.teamSize}</small>`;
    $('edit' + p).innerHTML = name;
    row.classList.toggle('editing', editing === p);
    row.classList.toggle('compact', editing !== p);
    if (editing !== p) {
      // the team not being edited collapses to a strip of sprites; click to edit it
      row.innerHTML = `<div class="teamhead"><span style="color:${p ? '#f87171' : '#60a5fa'}">${teamTitle(p)}</span>
        <span class="muted">${controllers[p] === 'cpu' ? 'CPU' : 'Human'} · ${teams[p].length}/${settings.teamSize} · click to edit</span></div>
        <div class="strip">${teams[p].map(s => `<img src="${DEX.species[s.species].sprite}" title="${DEX.species[s.species].display} Lv${s.level}">`).join('') || '<span class="muted">No Pokémon yet</span>'}</div>`;
      row.onclick = () => setEditing(p);
      continue;
    }
    row.innerHTML = `<div class="teamhead"><span class="p${p}" style="color:${p ? '#f87171' : '#60a5fa'}">${teamTitle(p)}</span>
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
// phones: the settings fold away behind a button
$('settingsToggle').onclick = () => { const open = $('builder').classList.toggle('showSettings'); $('settingsToggle').setAttribute('aria-expanded', open); };
$('edit0').onclick = () => setEditing(0);
$('edit1').onclick = () => setEditing(1);
$('setSize').onchange = e => {
  settings.teamSize = +e.target.value;
  formatSizes[settings.format] = settings.teamSize; prefs.sizes = formatSizes; savePrefs();
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
{ const visual = World.cheer; World.cheer = v => { visual(v); AudioFX.Crowd.cheer(v); }; }
// broadcast preferences (saved in this browser)
const savePrefs = () => { try { localStorage.setItem('pokemon-arena-prefs', JSON.stringify(prefs)); } catch (e) {} };
const applyShorts = on => { document.body.classList.toggle('shorts', on); World.setShorts(on); World.trainers.place(); requestAnimationFrame(World.resize); };
$('setMusic').value = prefs.music ?? 0.6; AudioFX.setVolume('music', +$('setMusic').value);
$('setSfx').value = prefs.sfx ?? 0.85; AudioFX.setVolume('sfx', +$('setSfx').value);
$('setHpBars').checked = prefs.hpBars !== false; Broadcast.opts.hpBars = $('setHpBars').checked;
$('setHighlights').checked = prefs.highlights !== false;
$('setReplays').checked = prefs.replays !== false;
$('setSudden').value = String(prefs.suddenDeath ?? 60);
$('set25').checked = prefs.p25 !== false;
$('set25').onchange = e => { prefs.p25 = e.target.checked; savePrefs(); };
$('setLive3d').checked = prefs.live3d !== false;
$('setLive3d').onchange = e => { prefs.live3d = e.target.checked; savePrefs(); };
$('setShorts').checked = !!prefs.shorts; applyShorts(!!prefs.shorts);
// battle style: full 3D or the retro top-down pixel mode
const applyMode = mode => {
  prefs.mode = mode === '3d' ? '3d' : 'retro';                 // Retro is the default (light, no 3D engine)
  $('mode3d').classList.toggle('on0', prefs.mode === '3d');
  $('modeRetro').classList.toggle('on0', prefs.mode === 'retro');
  document.body.classList.toggle('retroMode', prefs.mode === 'retro');
};
applyMode(prefs.mode);
$('mode3d').onclick = () => {
  if (settings.format !== '1v1') { applyFormat('1v1'); prefs.format = '1v1'; toast('Battle Royale and Team Brawl are Retro 2D only — switched to 1v1.', 3500); }
  applyMode('3d'); savePrefs(); load3DNow();
};
document.querySelectorAll('.fmtSeg button').forEach(b => b.onclick = () => { applyFormat(b.dataset.fmt); prefs.format = settings.format; savePrefs(); });
function load3DNow() {
  if (World.has3D) return;
  toast('Loading 3D…', 6000);
  window.load3D().then(() => toast('3D ready', 1500)).catch(e => { console.error(e); toast('3D failed to load: ' + e.message, 5000); });
}
// runs once when the 3D engine finishes loading (boot.mjs)
window.init3D = () => {
  World.has3D = true;                                // every 3D script has loaded
  { const visual = World.cheer; World.cheer = v => { visual(v); AudioFX.Crowd.cheer(v); }; }
  World.setShorts(!!prefs.shorts);
  World.setTheme(settings.theme !== 'random' ? settings.theme : 'stadium');
  [0, 1].forEach(p => World.trainers.setup(p, settings.outfits[p], PLAYER[p]));
  World.trainers.place();
  World.resize();
};
$('modeRetro').onclick = () => { applyMode('retro'); savePrefs(); toast('Retro 2D: real-time pixel battles. Both Pokémon move and attack at the same time.', 3500); };
$('setChannel').value = prefs.channel || ''; Broadcast.opts.channel = prefs.channel || '';
$('setMusic').oninput = e => { prefs.music = +e.target.value; AudioFX.setVolume('music', prefs.music); savePrefs(); };
$('setSfx').oninput = e => { prefs.sfx = +e.target.value; AudioFX.setVolume('sfx', prefs.sfx); savePrefs(); };
$('setHpBars').onchange = e => { prefs.hpBars = e.target.checked; Broadcast.opts.hpBars = prefs.hpBars; savePrefs(); };
$('setHighlights').onchange = e => { prefs.highlights = e.target.checked; savePrefs(); };
$('setReplays').onchange = e => { prefs.replays = e.target.checked; savePrefs(); };
$('setSudden').onchange = e => { prefs.suddenDeath = +e.target.value; savePrefs(); };
$('setShorts').onchange = e => { prefs.shorts = e.target.checked; applyShorts(prefs.shorts); savePrefs(); };
$('setChannel').oninput = e => { prefs.channel = e.target.value.trim(); Broadcast.opts.channel = prefs.channel; savePrefs(); };
$('setLength').onchange = e => { settings.hpMult = +e.target.value; };
$('setPool').onchange = e => { settings.pool = e.target.value; };
World.themeKeys.forEach(k => $('setTheme').insertAdjacentHTML('beforeend', `<option value="${k}">${World.themeName(k)}</option>`));
$('setTheme').onchange = e => { settings.theme = e.target.value; if (settings.theme !== 'random') World.setTheme(settings.theme); };
$('randomBoth').onclick = () => { randomizeTeams(); renderTeams(); };
$('startBtn').onclick = () => {
  const fmt = settings.format;
  if (fmt === 'royale' ? teams[0].length < 2 : !teams[0].length || !teams[1].length) { toast(fmt === 'royale' ? 'A Battle Royale needs at least 2 Pokémon.' : 'Both players need at least one Pokémon.'); return; }
  if (teams.some(t => t.some(s => !s.moves.length)))
    toast('A Pokémon with no moves will use Struggle.', 3000);
  startBattle(teams.map(t => t.map(s => ({ ...s, moves: s.moves.slice() }))), { format: fmt });
};

renderDex();
applyFormat(settings.format);
startLoop();
// the 3D engine only loads if 3D mode is in use (it's heavy: three.js, WebGL, models)
if (prefs.mode === '3d') load3DNow();
