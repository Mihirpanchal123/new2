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
  // the showcase moves (staged animations, signature moves): a Pokémon that learns one by level can use it at any level
  for (const id of SHOWCASE) if (sp.learnset.some(([, m]) => m === id)) out.push(id);
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
// PokéAPI has no effect data for Wave Crash: it is a damaging move with 33% recoil; fill it in
if (MOVES['wave-crash']) Object.assign(MOVES['wave-crash'], { metaCat: 'damage', drain: -33 });
// newer moves PokéAPI has no effect data for, filled in (simplified where the real effect needs a mechanic this game
// does not have: Comeuppance hits for a fixed 80, Axe Kick's crash on a miss and Gigaton Hammer's cooldown are left out)
const MOVE_PATCH = {
  'aqua-cutter': { metaCat: 'damage' }, 'raging-fury': { metaCat: 'damage' }, 'gigaton-hammer': { metaCat: 'damage' }, 'axe-kick': { metaCat: 'damage' },
  comeuppance: { metaCat: 'damage', power: 80 },
  'flower-trick': { metaCat: 'damage', crit: 3 },                                            // always a critical hit, never misses
  'dire-claw': { metaCat: 'damage-ailment', ailment: 'poison', ailmentChance: 50 },
  'torch-song': { metaCat: 'damage-raise', statChance: 100 },                              // raises its Sp. Atk
  'aqua-step': { metaCat: 'damage-raise', statChance: 100 },                               // raises its Speed
  'headlong-rush': { metaCat: 'damage-raise', statChance: 100, stats: [['defense', -1], ['special-defense', -1]] }
};
for (const [id, p] of Object.entries(MOVE_PATCH)) if (MOVES[id]) Object.assign(MOVES[id], p);
// moves with a staged animation in Retro 2D (and signature moves): default movesets prefer them, and the taught ones
// (Wave Crash, Hydro Cannon...) count too, so a new team shows them off without setting anything up
const SHOWCASE = new Set(['flamethrower', 'flare-blitz', 'psychic', 'ancient-power', 'aura-sphere', 'close-combat', 'hydro-cannon', 'wave-crash',
  'torch-song', 'aqua-step', 'flower-trick', 'gigaton-hammer', 'headlong-rush', 'raging-fury', 'dire-claw', 'axe-kick', 'aqua-cutter', 'comeuppance']);

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
    return p * moveTiming(id) * (SHOWCASE.has(id) ? 1.35 : 1);
  };
  const pool = [...new Set([...learnable(species, level, false), ...learnable(species, level).filter(id => SHOWCASE.has(id))])].map(id => ({ id, s: score(id) }));
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

// Battles play in Retro 2D (retro.js); this file holds the rules, the team builder and the menus.

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

// Records the browser tab (arena + HUD + cries). Each battle is saved as its own file.
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

function makeMon(spec, owner, hpMult = settings.hpMult) {
  const sp = DEX.species[spec.species];
  // official HP formula; the optional 'Battle length' setting multiplies it for longer battles (Adventure passes 1)
  const maxhp = (Math.floor((2 * sp.base[0] + 31) * spec.level / 100) + spec.level + 10) * hpMult;
  // Journey carries HP, status and PP from battle to battle (spec.hp / status / pp); everyone else starts fresh
  return {
    owner, species: sp.name, name: spec.nick || sp.display, level: spec.level, types: sp.types.slice(),
    stats: calcStats(sp.base, spec.level), maxhp, hp: spec.hp != null ? Math.min(maxhp, spec.hp) : maxhp, sprite: sp.sprite, cry: sp.cry, modelKey: sp.name,
    megaForm: spec.mega ? sp.megas.find(m => m.name === spec.mega) : null, isMega: false,
    status: spec.status || null, sleepTurns: spec.status === 'slp' ? 2 : 0, vol: {}, stages: blankStages(), turnsOut: 0,
    moves: spec.moves.map((id, i) => ({ id, ...MOVES[id], ppLeft: spec.pp && spec.pp[i] != null ? Math.min(MOVES[id].pp, spec.pp[i]) : MOVES[id].pp }))
  };
}



// ---- battle lifecycle: every battle has a token; restart/exit invalidates it
let battleToken = 0, battleActive = false;
class BattleAbort extends Error {}
function guard() { if (!state || state.token !== battleToken) throw new BattleAbort(); }
const canMega = p => { const u = active(p); return u.megaForm && !u.isMega && !state.players[p].usedMega; };


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




// =====================================================================
//  BATTLE ENGINE
// =====================================================================
const stageMult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const accMult = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
const speedOf = m => m.stats.spe * stageMult(m.stages.spe) * (m.status === 'par' ? 0.5 : 1);
const rand = () => Math.random();

function canStatus(mon, s) {
  if (mon.status || mon.hp <= 0) return false;
  if (s === 'brn' && mon.types.includes('Fire')) return false;
  if (s === 'par' && mon.types.includes('Electric')) return false;
  if (s === 'psn' && (mon.types.includes('Poison') || mon.types.includes('Steel'))) return false;
  if (s === 'frz' && mon.types.includes('Ice')) return false;
  return true;
}






// =====================================================================
//  BATTLE FLOW
// =====================================================================
let lastSpecs = null, lastMeta = {}, autoTimer = null;


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
  try { await runRetroBattle(); }
  catch (e) { if (!(e instanceof BattleAbort)) throw e; }
}

async function runRetroBattle() {
  $('builder').classList.add('hidden');
  $('endScreen').classList.add('hidden');
  $('bracket').classList.add('hidden');
  Broadcast.resetBattle();
  updateRecButtons();
  state.started = true;
  const w = await Retro.battle({ subtitle: state.meta.subtitle, lines: state.meta.lines });
  guard();
  // Journey: the result goes back to the world (no records, no end screen)
  if (state.meta.journey) { battleActive = false; updateRecButtons(); state.meta.journey.onEnd(w); return; }
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


// cancel the running battle: stop its flow, timers, effects and menus
function abortBattle() {
  battleToken++;
  TIME_SCALE = 1;
  FX_TIME = 1;
  AudioFX.Music.stop();
  AudioFX.Crowd.stop();
  Broadcast.resetBattle();
  battleActive = false;
  Retro.stop();
  World.clearTimers();
  setPaused(false);
}
function exitToBuilder() {
  if (Adventure.active) Adventure.leave();             // saves the adventure before the engine stops
  if (Journey.active) Journey.leave();
  abortBattle();
  Tour.inMatch = false;
  Tour.restore();
  hideBracket();
  clearTimeout(autoTimer);
  $('endScreen').classList.add('hidden');
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
$('advBtn').onclick = () => Adventure.open();
$('journeyBtn').onclick = () => Journey.open();
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
    row.querySelector('[data-name]').onchange = e => { PLAYER[p] = e.target.value.trim() || `Player ${p + 1}`; };
    row.querySelector('[data-outfit]').onchange = e => { settings.outfits[p] = e.target.value; };
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
// broadcast preferences (saved in this browser)
const savePrefs = () => { try { localStorage.setItem('pokemon-arena-prefs', JSON.stringify(prefs)); } catch (e) {} };
const applyShorts = on => document.body.classList.toggle('shorts', on);
$('setMusic').value = prefs.music ?? 0.6; AudioFX.setVolume('music', +$('setMusic').value);
$('setSfx').value = prefs.sfx ?? 0.85; AudioFX.setVolume('sfx', +$('setSfx').value);
$('setReplays').checked = prefs.replays !== false;
$('setFlashes').checked = prefs.flashes !== false;
$('setCutins').checked = prefs.cutins !== false;
$('setSudden').value = String(prefs.suddenDeath ?? 60);
$('setShorts').checked = !!prefs.shorts; applyShorts(!!prefs.shorts);
document.body.classList.add('retroMode');                   // Retro 2D is the battle view
document.querySelectorAll('.fmtSeg button').forEach(b => b.onclick = () => { applyFormat(b.dataset.fmt); prefs.format = settings.format; savePrefs(); });
$('setChannel').value = prefs.channel || ''; Broadcast.opts.channel = prefs.channel || '';
$('setMusic').oninput = e => { prefs.music = +e.target.value; AudioFX.setVolume('music', prefs.music); savePrefs(); };
$('setSfx').oninput = e => { prefs.sfx = +e.target.value; AudioFX.setVolume('sfx', prefs.sfx); savePrefs(); };
$('setReplays').onchange = e => { prefs.replays = e.target.checked; savePrefs(); };
// the FPS readout (fps.js): on unless turned off; the checkbox or F3, in any mode
const setFps = v => { prefs.fps = v; $('setFps').checked = v; FPS.show(v); savePrefs(); };
$('setFps').checked = prefs.fps !== false; FPS.show(prefs.fps !== false);
$('setFps').onchange = e => setFps(e.target.checked);
addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); setFps(!FPS.on); } });
$('setFlashes').onchange = e => { prefs.flashes = e.target.checked; savePrefs(); };
$('setCutins').onchange = e => { prefs.cutins = e.target.checked; savePrefs(); };
$('setSudden').onchange = e => { prefs.suddenDeath = +e.target.value; savePrefs(); };
$('setShorts').onchange = e => { prefs.shorts = e.target.checked; applyShorts(prefs.shorts); savePrefs(); };
$('setChannel').oninput = e => { prefs.channel = e.target.value.trim(); Broadcast.opts.channel = prefs.channel; savePrefs(); };
$('setLength').onchange = e => { settings.hpMult = +e.target.value; };
$('setPool').onchange = e => { settings.pool = e.target.value; };
World.themeKeys.forEach(k => $('setTheme').insertAdjacentHTML('beforeend', `<option value="${k}">${World.themeName(k)}</option>`));
$('setTheme').onchange = e => { settings.theme = e.target.value; };
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
