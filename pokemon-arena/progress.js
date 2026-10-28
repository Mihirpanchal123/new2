'use strict';
// =====================================================================
//  PROGRESS - how a trainer's Pokémon grow (Journey): the official growth
//  curves, XP from a battle, the moves learned on the way, evolution (by
//  level, stone, friendship, time of day) and the Poké Ball catch odds.
//  A member is { uid, species, nick, level, xp, hp, status, moves, pp,
//  friendship, ball, met }.
// =====================================================================
const Prog = (() => {
  // the total XP needed to reach level n, per growth curve
  const CURVES = {
    fast: n => Math.floor(4 * n ** 3 / 5),
    medium: n => n ** 3,
    'medium-slow': n => Math.max(0, Math.floor(6 / 5 * n ** 3 - 15 * n ** 2 + 100 * n - 140)),
    slow: n => Math.floor(5 * n ** 3 / 4),
    'slow-then-very-fast': n => n <= 50 ? Math.floor(n ** 3 * (100 - n) / 50) : n <= 68 ? Math.floor(n ** 3 * (150 - n) / 100) : n <= 98 ? Math.floor(n ** 3 * Math.floor((1911 - 10 * n) / 3) / 500) : Math.floor(n ** 3 * (160 - n) / 100),
    'fast-then-very-slow': n => n <= 15 ? Math.floor(n ** 3 * ((n + 1) / 3 + 24) / 50) : n <= 36 ? Math.floor(n ** 3 * (n + 14) / 50) : Math.floor(n ** 3 * (n / 2 + 32) / 50)
  };
  const sp = s => DEX.species[s];
  const xpAt = (species, n) => n <= 1 ? 0 : (CURVES[sp(species).growth] || CURVES.medium)(n);
  const hpMax = (species, L) => Math.floor((2 * sp(species).base[0] + 31) * L / 100) + L + 10;
  // supported moves learned exactly at level L (level-up only)
  const movesAt = (species, L) => [...new Set(sp(species).learnset.filter(([lv, id]) => lv === L && moveSupported(id)).map(([, id]) => id))];
  // a wild or trainer Pokémon's moves: the last four it learned by level L
  function movesFor(species, L) {
    const out = [];
    for (const [lv, id] of sp(species).learnset) if (lv <= L && moveSupported(id)) { const k = out.indexOf(id); if (k >= 0) out.splice(k, 1); out.push(id); }
    const four = out.slice(-4);
    return four.length ? four : defaultMoves(species, L).slice(0, 4);
  }
  let uidN = 0;
  const newUid = () => Date.now().toString(36) + (uidN++).toString(36) + Math.random().toString(36).slice(2, 5);
  function newMon(species, level, o = {}) {
    const moves = o.moves || movesFor(species, level);
    return { uid: newUid(), species, nick: o.nick || null, level, xp: xpAt(species, level), hp: hpMax(species, level), status: null,
      moves, pp: moves.map(id => MOVES[id].pp), friendship: o.friendship ?? 70, ball: o.ball || 'poke', met: o.met || '' };
  }
  const nameOf = m => m.nick || sp(m.species).display;
  // the battle spec of a member (game.js makeMon)
  const spec = m => ({ species: m.species, level: m.level, mega: m.mega || null, moves: m.moves.slice(), hp: m.hp, status: m.status, pp: m.pp.slice(), nick: m.nick });
  function healFull(m) { m.hp = hpMax(m.species, m.level); m.status = null; m.pp = m.moves.map(id => MOVES[id].pp); }
  // XP for beating a Pokémon (scaled Gen 5 formula): trainer battles pay 1.5x
  function xpYield(foeSpecies, foeLevel, myLevel, trainer) {
    const b = sp(foeSpecies).baseExp || 60;
    const v = (b * foeLevel / 5) * Math.pow((2 * foeLevel + 10) / (foeLevel + myLevel + 10), 2.5) + 1;
    return Math.max(1, Math.floor(v * (trainer ? 1.5 : 1)));
  }
  // what a member evolves into now. ctx = { why: 'level' | 'item', item, night }
  function evoTarget(m, ctx = {}) {
    for (const to of sp(m.species).evolvesTo) {
      const e = sp(to); if (!e) continue;
      const how = e.evoMethod || '';
      if (ctx.why === 'item') {
        if (ctx.item && how === ctx.item) return to;
        if (ctx.item === 'Link Stone' && how === 'Trade') return to;
        continue;
      }
      if (ctx.why !== 'level') continue;
      if (/^Lv \d+/.test(how)) { if (m.level >= e.minLevel) return to; continue; }
      if (/Stone$|^Trade$|Apple$/.test(how)) continue;
      if (/^Friendship/.test(how)) {
        if (m.friendship < 160) continue;
        if (/\(day\)/.test(how) && ctx.night) continue;
        if (/\(night\)/.test(how) && !ctx.night) continue;
        return to;
      }
      if (/\(night\)/.test(how) && !ctx.night) continue;
      if (/\(day\)/.test(how) && ctx.night) continue;
      // anything else (a special place, a known move...) evolves at the level the data gives it
      if (m.level >= (e.minLevel || 100)) return to;
    }
    return null;
  }
  // the stone (or item) names that make some Pokémon evolve
  const EVO_ITEMS = ['Fire Stone', 'Water Stone', 'Thunder Stone', 'Leaf Stone', 'Moon Stone', 'Sun Stone', 'Dusk Stone', 'Dawn Stone', 'Shiny Stone', 'Ice Stone', 'Link Stone'];
  // a Poké Ball throw (Gen 3/4 formula): shakes 0-3, caught
  function catchRoll(foe, catchRate, ballMult, rnd = Math.random) {
    const M = foe.maxhp, H = Math.max(1, foe.hp);
    const st = foe.status === 'slp' || foe.status === 'frz' ? 2 : foe.status ? 1.5 : 1;
    const a = Math.floor((3 * M - 2 * H) * catchRate * ballMult / (3 * M)) * st;
    if (ballMult >= 255 || a >= 255) return { shakes: 3, caught: true };
    const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a)));
    let shakes = 0;
    while (shakes < 4 && rnd() * 65536 < b) shakes++;
    return { shakes: Math.min(3, shakes), caught: shakes === 4 };
  }
  return { CURVES, xpAt, hpMax, movesAt, movesFor, newMon, nameOf, spec, healFull, xpYield, evoTarget, EVO_ITEMS, catchRoll };
})();
