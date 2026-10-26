'use strict';
// =====================================================================
//  ADVENTURE — the open-world survival RPG mode. One Pokémon explores a
//  seeded world (world.js) and fights wild Pokémon with the battle
//  engine itself (retro.js: the same moves, animations, damage formula
//  and AI). On top: experience and levels on the official stat
//  formulas, moves unlocked from the real level-up learnsets, stamina,
//  hunger, gathering, crafting, landmarks, bosses, quests and saving.
//  Every balancing value is in ADV and the tables below it.
// =====================================================================
const Adventure = (() => {
  const ADV = {
    zoom: 1,
    startLevel: 5,
    move: { walk: 215, dashMul: 1.6 },                 // the player's walking pace (world units / s) and the dash boost
    range: 620,                                        // the player's attack reach
    wildRange: 500,                                    // a wild Pokémon's attack reach (and it never attacks from off screen)
    notice: 1.4,                                       // seconds an aggressive one needs to notice you before it turns hostile ("?" first)
    weakGap: 6, strongGap: 4,                          // this many levels below you: it won't start a fight; above: territorial (reacts only up close)
    detect: 430,                                       // an aggressive wild Pokémon notices the player this close
    leash: 1400,                                       // ...and gives up past this distance
    wander: 260,                                       // wild Pokémon roam this far from where they appeared
    light: 520,                                        // radius of the light around the player in the caves
    maxWild: 6, maxAttackers: 2,                       // wild Pokémon on the map / attacking at the same time
    gap: { player: [1.6, 0.55], wild: [2.6, 0.95] },   // seconds between attacks, slowest..fastest (from base Speed)
    xp: { mult: 1.25, elite: 1.8, boss: 4, biome: 40, discover: [0, 80, 150, 260, 420, 700], cache: 30 },
    levelUpHeal: 0.2,                                  // share of max HP restored on a level-up
    stamina: { base: 100, perLevel: 1.5, regen: 16, dash: 26, tired: 1.2 },
    hunger: { drain: 100 / 600, cold: 1.5, dash: 1.6, warn: 30, critical: 10, starveFloor: 0.25, starveRate: 0.01 },
    regen: { delay: 8, rate: 0.008, minHunger: 40 },   // slow HP recovery out of combat when well fed (share of max HP / s)
    rest: { hungerCost: 8 },
    faint: { hp: 0.5, hunger: 35, delay: 2.6 },
    spawn: { interval: 1.1, min: 780, max: 1250, despawn: 1900, gap: 320, safe: 560 },
    level: { pull: 0.3, spread: 2, elite: 0.05, eliteBonus: [3, 5], eliteHp: 1.6, eliteSize: 1.28, bossHp: 3, bossSize: 1.45 },
    save: { key: 'pokemon-arena-adventure-v1', every: 45 }
  };
  // what lives where: level range, how many at once, and the encounter table [species, weight, 'rare'?]. Entries are
  // base forms; a wild Pokémon evolves to the stage its level allows (a level 12 Caterpie is a Butterfree)
  const BIOME_PLAY = {
    grass: { lv: [1, 5], cap: 4, table: [['pidgey', 10], ['rookidee', 6], ['caterpie', 8], ['weedle', 8], ['nidoran-f', 5], ['nidoran-m', 5], ['meowth', 5], ['starly', 7], ['shinx', 5], ['buneary', 4], ['igglybuff', 3], ['pichu', 1.5, 'rare'], ['eevee', 1, 'rare'], ['riolu', 1, 'rare']],
      loot: [['oran', 0.35], ['stick', 0.2], ['apple', 0.1]] },
    forest: { lv: [4, 10], cap: 5, table: [['caterpie', 6], ['weedle', 6], ['oddish', 7], ['bellsprout', 6], ['shroomish', 6], ['venipede', 5], ['zorua', 3], ['murkrow', 4], ['applin', 3], ['flabebe', 4], ['pidgey', 4], ['scyther', 1, 'rare'], ['heracross', 1, 'rare'], ['pinsir', 1, 'rare']],
      loot: [['oran', 0.25], ['mushroom', 0.25], ['stick', 0.25], ['leppa', 0.08]] },
    river: { lv: [7, 15], cap: 5, table: [['psyduck', 7], ['poliwag', 7], ['wooper', 6], ['magikarp', 5], ['horsea', 4], ['tentacool', 4], ['wingull', 6], ['slowpoke', 4], ['staryu', 3], ['goomy', 3], ['binacle', 3], ['wimpod', 3], ['tynamo', 3], ['feebas', 1, 'rare'], ['lapras', 0.6, 'rare']],
      loot: [['oran', 0.3], ['rawst', 0.15], ['stone', 0.2], ['sitrus', 0.08]] },
    cave: { lv: [12, 22], cap: 5, table: [['zubat', 9], ['geodude', 8], ['diglett', 5], ['onix', 3], ['aron', 5], ['drilbur', 4], ['sableye', 3], ['gastly', 4], ['duskull', 4], ['noibat', 4], ['nacli', 4], ['rockruff', 3], ['mawile', 2], ['gible', 1, 'rare'], ['larvitar', 1, 'rare'], ['deino', 1, 'rare']],
      loot: [['ore', 0.3], ['stone', 0.3], ['mushroom', 0.15], ['crystal', 0.05]] },
    high: { lv: [18, 30], cap: 5, table: [['ponyta', 5], ['growlithe', 5], ['phanpy', 5], ['rhyhorn', 4], ['gligar', 4], ['swablu', 4], ['rufflet', 4], ['vullaby', 4], ['machop', 4], ['mankey', 4], ['houndour', 4], ['snover', 4], ['snorunt', 4], ['sneasel', 3], ['skarmory', 2], ['absol', 1, 'rare'], ['aerodactyl', 1, 'rare'], ['frigibax', 1, 'rare']],
      loot: [['sitrus', 0.25], ['ore', 0.2], ['leppa', 0.15], ['herb', 0.15]] },
    ruins: { lv: [25, 45], cap: 5, table: [['golett', 6], ['honedge', 5], ['gastly', 5], ['misdreavus', 4], ['shuppet', 4], ['litwick', 4], ['abra', 4], ['ralts', 3], ['espurr', 4], ['inkay', 3], ['porygon', 2], ['beldum', 2], ['spiritomb', 1, 'rare']],
      loot: [['crystal', 0.2], ['sitrus', 0.3], ['relic', 0.05], ['herb', 0.2]] }
  };
  // territorial bosses: one guards each biome's landmark; beaten bosses stay beaten (saved)
  const BOSSES = {
    oak: { species: 'heracross', level: 13, name: 'Great Oak Guardian' },
    lake: { species: 'gyarados', level: 20, name: 'Lord of the Lake' },
    grotto: { species: 'onix', level: 26, name: 'Grotto Colossus' },
    summit: { species: 'arcanine', level: 33, name: 'Summit Sentinel' },
    altar: { species: 'registeel', level: 46, name: 'Ancient Guardian' }
  };
  const LANDMARK_NAMES = { camp: 'Base Camp', oak: 'The Great Oak', lake: 'Crystal Lake', grotto: 'Glimmering Grotto', summit: 'Windy Summit', altar: 'Ancient Altar' };
  // items. use: hp / stamina (share or points), food (hunger points), cure (a status or 'all'), xp, camp
  const ITEMS = {
    oran: { name: 'Oran Berry', ic: ['berry', '#3a6ef0'], desc: 'Restores 30% HP.', use: { hp: 0.3, food: 8 } },
    sitrus: { name: 'Sitrus Berry', ic: ['berry', '#f0c830'], desc: 'Restores 50% HP.', use: { hp: 0.5, food: 10 } },
    pecha: { name: 'Pecha Berry', ic: ['berry', '#ff9ac8'], desc: 'Cures poison. Sweet.', use: { cure: 'psn', food: 12 } },
    rawst: { name: 'Rawst Berry', ic: ['berry', '#5ac8b0'], desc: 'Cures a burn.', use: { cure: 'brn', food: 10 } },
    cheri: { name: 'Cheri Berry', ic: ['berry', '#e8403a'], desc: 'Cures paralysis.', use: { cure: 'par', food: 10 } },
    leppa: { name: 'Leppa Berry', ic: ['berry', '#e8783a'], desc: 'Restores 60 stamina.', use: { stamina: 60, food: 8 } },
    apple: { name: 'Apple', ic: ['apple'], desc: 'Filling: +35 hunger, +15 stamina.', use: { food: 35, stamina: 15 } },
    mushroom: { name: 'Tiny Mushroom', ic: ['mushroom'], desc: '+18 hunger.', use: { food: 18 } },
    herb: { name: 'Healing Herb', ic: ['herb'], desc: 'Bitter. Restores 20% HP and cures any status.', use: { hp: 0.2, cure: 'all', food: 4 } },
    juice: { name: 'Berry Juice', ic: ['bottle', '#7a5af0'], desc: 'Restores 60% HP.', use: { hp: 0.6, food: 10 } },
    stew: { name: 'Forest Stew', ic: ['bowl'], desc: '+60 hunger and 30 stamina.', use: { food: 60, stamina: 30 } },
    tonic: { name: 'Energy Tonic', ic: ['bottle', '#5ad66a'], desc: 'Full stamina; it regenerates faster for 60 s.', use: { stamina: 999, buff: 60 } },
    elixir: { name: 'Max Elixir', ic: ['bottle', '#ff5ac8'], desc: 'Full HP and stamina; cures any status.', use: { hp: 1, stamina: 999, cure: 'all' } },
    relic: { name: 'Old Relic', ic: ['relic'], desc: 'Study it to learn from the past (+XP).', use: { xp: 250 } },
    kit: { name: 'Campfire Kit', ic: ['kit'], desc: 'Set up a campsite where you stand: rest and save there.', use: { camp: true } },
    stick: { name: 'Stick', ic: ['stick'], desc: 'Crafting material.' },
    stone: { name: 'Stone', ic: ['stone'], desc: 'Crafting material.' },
    ore: { name: 'Iron Ore', ic: ['ore'], desc: 'Crafting material from the caves.' },
    crystal: { name: 'Glow Crystal', ic: ['crystal'], desc: 'A rare crystal. Crafting material.' }
  };
  // what a resource node gives, how it is gathered and when it grows back (seconds of play)
  const NODE_PLAY = {
    berry: { verb: 'Pick berries', regrow: 150, yield: { grass: [['oran', 2, 3], ['pecha', 0, 1]], forest: [['oran', 1, 2], ['cheri', 0, 1], ['leppa', 0, 1]], river: [['oran', 1, 2], ['rawst', 0, 1], ['sitrus', 0, 1]], high: [['sitrus', 1, 2], ['leppa', 0, 1]], any: [['oran', 1, 2]] } },
    herb: { verb: 'Gather herbs', regrow: 200, yield: { any: [['herb', 1, 2]] } },
    mushroom: { verb: 'Pick mushrooms', regrow: 180, yield: { any: [['mushroom', 1, 2]] } },
    apple: { verb: 'Shake the tree', regrow: 240, yield: { any: [['apple', 1, 3]] } },
    sticks: { verb: 'Collect sticks', regrow: 300, yield: { any: [['stick', 2, 3]] } },
    pebbles: { verb: 'Collect stones', regrow: 300, yield: { any: [['stone', 1, 3]] } },
    ore: { verb: 'Mine ore', regrow: 420, yield: { any: [['ore', 1, 2], ['stone', 0, 1]] } },
    crystal: { verb: 'Mine crystal', regrow: 900, yield: { any: [['crystal', 1, 1]] } },
    relic: { verb: 'Dig up relic', regrow: Infinity, yield: { any: [['relic', 1, 1]] } }
  };
  const RECIPES = [
    { out: 'juice', n: 1, need: { oran: 3 } },
    { out: 'stew', n: 1, need: { mushroom: 2, apple: 1, herb: 1 } },
    { out: 'tonic', n: 1, need: { leppa: 1, herb: 2 } },
    { out: 'kit', n: 1, need: { stick: 5, stone: 3 } },
    { out: 'elixir', n: 1, need: { sitrus: 1, crystal: 1, herb: 2 } }
  ];
  // quests, taken in order (three at a time). goal: collect (item), defeat (optional biome / elite / boss), discover
  // (a landmark), craft (item), level
  const QUESTS = [
    { id: 'forage', title: 'Forage', desc: 'Pick 5 Oran Berries.', goal: { type: 'collect', item: 'oran', n: 5 }, reward: { xp: 60, items: { apple: 2 } } },
    { id: 'first', title: 'First Steps', desc: 'Defeat 3 wild Pokémon.', goal: { type: 'defeat', n: 3 }, reward: { xp: 80, items: { sitrus: 1 } } },
    { id: 'kit', title: 'Home Away From Home', desc: 'Craft a Campfire Kit (5 Sticks, 3 Stones).', goal: { type: 'craft', item: 'kit', n: 1 }, reward: { xp: 100, items: { stew: 1 } } },
    { id: 'oak', title: 'The Great Oak', desc: 'Find the Great Oak in the Whispering Forest.', goal: { type: 'discover', id: 'oak', n: 1 }, reward: { xp: 150, items: { leppa: 2 } } },
    { id: 'lv10', title: 'Growing Strong', desc: 'Reach level 10.', goal: { type: 'level', n: 10 }, reward: { xp: 120, items: { tonic: 1 } } },
    { id: 'forest', title: 'Forest Patrol', desc: 'Defeat 6 Pokémon in the Whispering Forest.', goal: { type: 'defeat', biome: 'forest', n: 6 }, reward: { xp: 200, items: { juice: 1 } } },
    { id: 'alpha', title: 'Alpha Hunter', desc: 'Defeat an Alpha Pokémon.', goal: { type: 'defeat', elite: true, n: 1 }, reward: { xp: 250, items: { sitrus: 2 } } },
    { id: 'lake', title: 'Crystal Lake', desc: 'Reach Crystal Lake in the Riverlands.', goal: { type: 'discover', id: 'lake', n: 1 }, reward: { xp: 260, items: { rawst: 2, sitrus: 1 } } },
    { id: 'guardian', title: 'Guardian of the Oak', desc: 'Defeat the boss that guards the Great Oak.', goal: { type: 'defeat', boss: 'oak', n: 1 }, reward: { xp: 300, items: { elixir: 1 } } },
    { id: 'ore', title: 'Into the Dark', desc: 'Mine 5 Iron Ore in the Echo Caves.', goal: { type: 'collect', item: 'ore', n: 5 }, reward: { xp: 400, items: { tonic: 1 } } },
    { id: 'grotto', title: 'Glimmering Grotto', desc: 'Find the crystal grotto deep in the caves.', goal: { type: 'discover', id: 'grotto', n: 1 }, reward: { xp: 500, items: { crystal: 2 } } },
    { id: 'lv25', title: 'Seasoned Explorer', desc: 'Reach level 25.', goal: { type: 'level', n: 25 }, reward: { xp: 600, items: { elixir: 1 } } },
    { id: 'summit', title: 'Windy Summit', desc: 'Climb to the summit of the Highlands.', goal: { type: 'discover', id: 'summit', n: 1 }, reward: { xp: 800, items: { sitrus: 3 } } },
    { id: 'altar', title: 'The Ancient Altar', desc: 'Find the altar at the heart of the ruins.', goal: { type: 'discover', id: 'altar', n: 1 }, reward: { xp: 1200, items: { elixir: 2 } } },
    { id: 'legend', title: 'Legend of the Ruins', desc: 'Defeat the Ancient Guardian.', goal: { type: 'defeat', boss: 'altar', n: 1 }, reward: { xp: 3000, items: { elixir: 3 } } }
  ];
  // the people of the world (drawn with the pixel-trainer art; outfits as in OUTFITS). where: at the camp, or on the
  // path of the first region of a biome. The Trader keeps a campfire (a second rest-and-save spot)
  const NPCS = {
    ranger: { name: 'Ranger Ivy', where: 'camp', role: 'quests',
      outfit: { hat: 'cap', hatColor: 0x2e7d32, hatFront: 0xffffff, hair: 0x6b3d1f, hairStyle: 'long', top: 0x3f8a52, sleeves: 'long', inner: 0xe9d8a6, legs: 0x6b5a45, legStyle: 'pants', shoes: 0x4e342e, bag: 0xe9b949 } },
    hiker: { name: 'Hiker Bram', where: 'forest', role: 'tips', gift: { leppa: 2, tonic: 1 },
      outfit: { hat: 'beanie', hatColor: 0xc0392b, hatFront: 0xffffff, hair: 0x7a4a26, hairStyle: 'short', top: 0x795548, sleeves: 'long', inner: 0x795548, legs: 0x4e5b31, legStyle: 'pants', shoes: 0x3e2723, bag: 0x46b04a },
      tips: ['Wild Pokémon with a big red glow are Alphas. Tough, but they always drop something good.',
        'The Echo Caves are pitch dark past your own light. Bring berries before you go in.',
        'Up in the Highlands the cold makes you hungry fast. Pack food!',
        'Out of a fight and well fed, your Pokémon slowly gets its strength back.',
        'Five Sticks and three Stones make a Campfire Kit: a place to rest anywhere.',
        'Every landmark has a guardian. Beat it and it stays beaten.'] },
    trader: { name: 'Trader Milo', where: 'river', role: 'trade', camp: true,
      outfit: { hat: 'bandana', hatColor: 0x8e44ad, hair: 0x2b1d14, hairStyle: 'short', top: 0xe67e22, sleeves: 'short', inner: 0xf5f0e6, legs: 0x2f3e5f, legStyle: 'pants', shoes: 0x333333, bag: 0x8a5a2a, scarf: 0xf1c40f },
      trades: [{ give: { stone: 3 }, get: { oran: 2 } }, { give: { stick: 4 }, get: { apple: 2 } }, { give: { mushroom: 3 }, get: { leppa: 1 } }, { give: { ore: 2 }, get: { sitrus: 1 } }, { give: { crystal: 1 }, get: { elixir: 1 } }] },
    scholar: { name: 'Scholar Wren', where: 'high', role: 'study',
      outfit: { hat: 'sunhat', hatColor: 0xe8dcc0, hatBand: 0x5a3a20, hair: 0xd9d9d9, hairStyle: 'long', top: 0x34495e, sleeves: 'long', inner: 0xecf0f1, legs: 0x34495e, legStyle: 'skirt', shoes: 0x5d4037, necklace: 0xf1c40f },
      study: [{ give: 'relic', xp: 600, get: { elixir: 1 } }, { give: 'crystal', xp: 150, get: {} }] }
  };
  // the Pokémon one can start with: base forms of every generation's starters, plus a few favourites
  const STARTER_LIST = ['bulbasaur', 'charmander', 'squirtle', 'chikorita', 'cyndaquil', 'totodile', 'treecko', 'torchic', 'mudkip', 'turtwig', 'chimchar', 'piplup', 'snivy', 'tepig', 'oshawott', 'froakie', 'fennekin', 'chespin', 'rowlet', 'litten', 'popplio', 'grookey', 'scorbunny', 'sobble', 'sprigatito', 'fuecoco', 'quaxly', 'eevee', 'riolu', 'pichu', 'dratini', 'larvitar'];

  const R = (a, b) => a + Math.random() * (b - a);
  const pickW = list => { let t = list.reduce((a, e) => a + e[1], 0) * Math.random(); for (const e of list) if ((t -= e[1]) <= 0) return e; return list[list.length - 1]; };
  const tri = () => Math.random() + Math.random() - 1;    // -1..1, most often near 0
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / 0.75);
  const OW = Overworld;

  let P = null;              // the run: the player's Pokémon, inventory, world changes (what is saved)
  let wm = null;             // retro.js's open-world controls while the mode runs
  let active = false, loading = false;
  let hud = null;            // cached HUD elements
  let panel = null;          // the open panel ('bag' | 'moves' | 'quests') or null
  let near = null;           // what E would interact with
  const keys = new Set();
  const S = { lastCd: 0, saveT: 0, encT: 0, tired: 0, buffT: 0, combatT: -99, warned: 0, starveT: 0, respawnAt: 0, spawning: 0, cdMax: 1, hudT: 0, fogDirty: true, lastBiome: null, miniT: 0 };

  // ---------------------------------------------------------------------
  //  Pokémon: the official stat formulas (game.js), level-up learnsets
  // ---------------------------------------------------------------------
  const xpFor = L => L * L * L;                          // the "medium fast" growth curve
  const hpFor = (sp, L) => Math.floor((2 * sp.base[0] + 31) * L / 100) + L + 10;
  const levelMoves = (species, L) => learnable(species, L, false);   // supported level-up moves known by level L
  const stMax = () => Math.round(ADV.stamina.base + (P.level - 1) * ADV.stamina.perLevel);
  const moveCost = m => Math.round(clamp(6 + (m.power || 0) * 0.12 + 60 / Math.max(1, m.pp || 20), 5, 40));
  const baseSpe = mon => (DEX.species[mon.species] || { base: [0, 0, 0, 0, 0, 60] }).base[5];
  // a wild Pokémon knows its four most recent level-up moves (as in the games)
  function wildMoves(species, L) {
    const out = [];
    for (const [lv, id] of DEX.species[species].learnset) if (lv <= L && moveSupported(id)) { const k = out.indexOf(id); if (k >= 0) out.splice(k, 1); out.push(id); }
    return out.slice(-4);
  }
  // the stage a wild Pokémon of this level has reached (level evolutions only count when the level allows)
  function evolveFor(species, L) {
    for (let guard = 0; guard < 4; guard++) {
      const next = DEX.species[species].evolvesTo.filter(e => DEX.species[e] && DEX.species[e].minLevel <= L);
      if (!next.length) break;
      species = next[Math.floor(Math.random() * next.length)];
    }
    return species;
  }
  function playerMon() {
    const mon = makeMon({ species: P.species, level: P.level, mega: null, moves: P.equipped }, 0, 1);
    mon.hp = clamp(Math.round(P.hp ?? mon.maxhp), 1, mon.maxhp);   // a save never starts fainted
    mon.status = P.status || null;
    return mon;
  }
  function equipMoves() {
    const m = P.mon;
    m.moves = P.equipped.map(id => ({ id, ...MOVES[id], ppLeft: MOVES[id].pp }));
    const f = wm && wm.player;
    if (f && f.mon === m) { f.plan = f.queued = null; }
    S.hudMoves = '';
  }
  // the four moves a new Pokémon starts with: the newest level-up moves, attacks first
  function bestFour(ids) {
    const atk = ids.filter(id => MOVES[id].cat !== 'status'), st = ids.filter(id => MOVES[id].cat === 'status');
    return [...atk.slice(-3), ...st.slice(-1), ...atk.slice(0, -3)].slice(0, 4);
  }

  // ---------------------------------------------------------------------
  //  Progression: experience, levels, stat growth, new moves, evolution
  // ---------------------------------------------------------------------
  function gainXp(n, why) {
    if (!P || n <= 0) return;
    n = Math.round(n);
    P.xp += n;
    const f = wm && wm.player;
    if (f) wm.float(f.x, f.top - 54, `+${n} XP`, 'info', 1100);
    if (why) note(`<b class="ax">+${n} XP</b> ${esc(why)}`);
    while (P.level < 100 && P.xp >= xpFor(P.level + 1)) levelUp();
    S.hudXp = -1;
  }
  function levelUp() {
    const m = P.mon, sp = DEX.species[P.species], before = { hp: m.maxhp, ...m.stats };
    P.level++;
    m.level = P.level;
    m.stats = calcStats(sp.base, P.level);
    const maxhp = hpFor(sp, P.level);
    m.hp = Math.min(maxhp, m.hp + (maxhp - m.maxhp) + Math.round(maxhp * ADV.levelUpHeal));
    m.maxhp = maxhp;
    P.stamina = Math.min(stMax(), P.stamina + 20);
    const gains = [['HP', m.maxhp - before.hp], ['ATK', m.stats.atk - before.atk], ['DEF', m.stats.def - before.def], ['SPA', m.stats.spa - before.spa], ['SPD', m.stats.spd - before.spd], ['SPE', m.stats.spe - before.spe]].filter(g => g[1] > 0);
    wm.big(`LEVEL ${P.level}!`, 'small', 1800);
    note(`<b class="al">LEVEL UP!</b> ${esc(m.name)} is now Lv ${P.level}: ${gains.map(([k, v]) => `${k} +${v}`).join(' · ')}`);
    if (wm.player) wm.levelUp(wm.player);
    // new moves from the learnset
    for (const id of levelMoves(P.species, P.level)) {
      if (P.unlocked.includes(id)) continue;
      P.unlocked.push(id);
      if (P.equipped.length < 4) { P.equipped.push(id); equipMoves(); note(`<b class="am">NEW MOVE!</b> ${esc(m.name)} learned ${esc(MOVES[id].name)}!`); }
      else note(`<b class="am">NEW MOVE!</b> ${esc(MOVES[id].name)} unlocked: press <kbd>M</kbd> to equip it.`);
      if (wm.player) wm.text(wm.player, MOVES[id].name.toUpperCase() + '!', 'eff');
    }
    // a level evolution
    const evo = sp.evolvesTo.map(n => DEX.species[n]).find(e => e && /^Lv/.test(e.evoMethod) && e.minLevel <= P.level);
    if (evo) P.pendingEvo = evo.name;                // it evolves once the fight is over
    quest('level', { n: P.level });
    S.hudMoves = '';
  }
  async function evolve(to) {
    const from = P.mon.name, sp = DEX.species[to], f = wm.player;
    P.species = to;
    const m = P.mon, hpShare = m.hp / m.maxhp;
    Object.assign(m, { species: sp.name, name: sp.display, types: sp.types.slice(), stats: calcStats(sp.base, P.level), sprite: sp.sprite, cry: sp.cry, modelKey: sp.name });
    m.maxhp = hpFor(sp, P.level); m.hp = Math.max(1, Math.round(m.maxhp * hpShare));
    for (const id of levelMoves(to, P.level)) if (!P.unlocked.includes(id)) P.unlocked.push(id);
    wm.big('EVOLUTION!', 'mega', 2000);
    note(`<b class="al">EVOLUTION!</b> ${esc(from)} evolved into ${esc(sp.display)}!`);
    if (f && f.state === 'idle') {
      const at = { x: f.x, y: f.y };
      await wm.respawnPlayer(m, at.x, at.y);
      if (wm.player) wm.levelUp(wm.player);
    }
    S.hudMoves = '';
    // a Pokémon that jumped several levels may be ready for its next stage straight away
    const next = sp.evolvesTo.map(n => DEX.species[n]).find(e => e && /^Lv/.test(e.evoMethod) && e.minLevel <= P.level);
    if (next) P.pendingEvo = next.name;
    save();
  }

  // ---------------------------------------------------------------------
  //  Inventory, using items, crafting
  // ---------------------------------------------------------------------
  const count = id => P.inv[id] || 0;
  function addItem(id, n = 1, at) {
    if (!ITEMS[id] || n <= 0) return;
    P.inv[id] = Math.min(999, count(id) + n);
    if (at) wm.float(at.x, at.y - 60, `+${n} ${esc(ITEMS[id].name)}`, 'up', 1200);
    quest('collect', { item: id, n });
    S.hudQuick = '';
    if (panel === 'bag') renderPanel();
  }
  function takeItem(id, n = 1) {
    if (count(id) < n) return false;
    P.inv[id] -= n;
    if (!P.inv[id]) delete P.inv[id];
    S.hudQuick = '';
    return true;
  }
  function useItem(id) {
    const it = ITEMS[id], f = wm && wm.player;
    if (!it || !it.use || !count(id)) return false;
    if (!f || f.state !== 'idle') { toast('Not now!'); return false; }
    const u = it.use, m = P.mon;
    // refuse when it would do nothing at all
    const would = (u.hp && m.hp < m.maxhp) || (u.stamina && P.stamina < stMax()) || (u.food && P.hunger < 98) || (u.cure && m.status && (u.cure === 'all' || u.cure === m.status)) || u.xp || u.camp || u.buff;
    if (!would) { wm.text(f, 'NO EFFECT', 'weak'); return false; }
    if (u.camp) {
      if (wm.engaged) { wm.text(f, 'NOT IN A FIGHT!', 'miss'); return false; }
      if (!OW.reachable(f.x, f.y) || OW.onPath(f.x, f.y)) { wm.text(f, 'NOT HERE', 'miss'); return false; }
      P.camps.push({ x: Math.round(f.x + 50), y: Math.round(f.y) });
      P.rest = { x: Math.round(f.x), y: Math.round(f.y) };
      note('<b class="am">CAMPSITE</b> Set up a campfire: rest and save here.');
    }
    takeItem(id);
    if (u.hp) { const amt = Math.min(m.maxhp - m.hp, Math.max(1, Math.round(m.maxhp * u.hp))); m.hp += amt; wm.heal(f, amt); }
    if (u.stamina) P.stamina = Math.min(stMax(), P.stamina + u.stamina);
    if (u.food) P.hunger = Math.min(100, P.hunger + u.food);
    if (u.cure && m.status && (u.cure === 'all' || u.cure === m.status)) { m.status = null; wm.text(f, 'CURED!', 'info'); }
    if (u.buff) S.buffT = u.buff;
    if (u.xp) gainXp(u.xp, `Studied the ${it.name}`);
    if (!u.hp) AudioFX.SFX.pop();
    S.hudQuick = '';
    if (panel === 'bag') renderPanel();
    return true;
  }
  const canCraft = r => Object.entries(r.need).every(([id, n]) => count(id) >= n);
  function craft(r) {
    if (!canCraft(r)) return false;
    for (const [id, n] of Object.entries(r.need)) takeItem(id, n);
    P.inv[r.out] = count(r.out) + r.n;
    AudioFX.SFX.buff();
    note(`<b class="am">CRAFTED</b> ${esc(ITEMS[r.out].name)}`);
    quest('craft', { item: r.out, n: r.n });
    renderPanel();
    return true;
  }

  // ---------------------------------------------------------------------
  //  The world: resource nodes, caches, landmarks, campsites
  // ---------------------------------------------------------------------
  const nodePos = n => ({ x: n.tx * OW.TW + OW.TW / 2, y: n.ty * OW.TW + OW.TW - 8 });
  const nodeReady = n => !(P.nodes[n.id] > P.time);
  function rollYield(table) {
    const out = [];
    for (const [id, lo, hi] of table) { const k = Math.floor(R(lo, hi + 1)); if (k > 0) out.push([id, k]); }
    return out;
  }
  function gather(n) {
    const np = NODE_PLAY[n.kind], f = wm.player;
    if (!np || !nodeReady(n)) return;
    const got = rollYield(np.yield[n.biome] || np.yield.any);
    if (!got.length) got.push([(np.yield[n.biome] || np.yield.any)[0][0], 1]);
    const at = nodePos(n);
    got.forEach(([id, k], i) => setTimeout(() => active && addItem(id, k, { x: at.x, y: at.y - i * 26 }), i * 120));
    P.nodes[n.id] = P.time + np.regrow;
    wm.pickup(at.x, at.y, n.kind === 'crystal' ? '#a8e8ff' : n.kind === 'ore' ? '#e8a040' : '#9aff9a');
    if (f) f.bump(4);
  }
  function openCache(c) {
    if (P.caches.includes(c.id)) return;
    P.caches.push(c.id);
    const at = nodePos(c), lv = BIOME_PLAY[c.biome];
    const pool = { grass: ['oran', 'apple', 'sitrus'], forest: ['sitrus', 'leppa', 'juice'], river: ['sitrus', 'rawst', 'juice'], cave: ['crystal', 'ore', 'tonic'], high: ['sitrus', 'tonic', 'leppa'], ruins: ['elixir', 'crystal', 'relic'] }[c.biome] || ['oran'];
    pool.forEach((id, i) => setTimeout(() => active && addItem(id, i === 0 ? 2 : 1, { x: at.x, y: at.y - i * 26 }), i * 140));
    wm.pickup(at.x, at.y, '#ffe066');
    gainXp(ADV.xp.cache * (1 + OW.ORDER.indexOf(c.biome)) + lv.lv[0], 'Found a hidden cache');
  }
  const campPos = () => { const c = OW.world.landmarks.find(l => l.kind === 'camp'); return { x: c.tx * OW.TW + OW.TW / 2, y: c.ty * OW.TW + OW.TW }; };
  const restSpots = () => [campPos(), ...P.camps, ...people.filter(p => p.camp).map(p => p.camp)];
  const safeAt = (x, y) => restSpots().some(c => Math.hypot(c.x - x, c.y - y) < ADV.spawn.safe);
  function rest(at) {
    const f = wm.player, m = P.mon;
    if (!f || f.state !== 'idle') return;
    if (wm.wilds().some(o => o.aggro && o.state === 'idle')) { wm.text(f, 'ENEMIES NEARBY!', 'miss'); return; }
    m.hp = m.maxhp; m.status = null; P.stamina = stMax();
    P.hunger = Math.max(0, P.hunger - ADV.rest.hungerCost);
    P.time += 60;                                      // a short rest: the world moves on a little
    P.rest = { x: Math.round(at.x), y: Math.round(at.y + 40) };
    wm.heal(f, 0);
    const ok = save();
    wm.big('RESTED', 'small', 1400);
    note(`<b class="am">REST</b> HP and stamina restored. ${ok ? 'Game saved.' : '<b class="aw">Could not save!</b>'}`);
  }
  function discover(l) {
    if (P.discovered.includes(l.id)) return;
    P.discovered.push(l.id);
    const k = OW.ORDER.indexOf(l.biome);
    wm.big(`${LANDMARK_NAMES[l.kind].toUpperCase()}`, 'small', 2000);
    if (ADV.xp.discover[k]) gainXp(ADV.xp.discover[k], `Discovered ${LANDMARK_NAMES[l.kind]}`);
    quest('discover', { id: l.id });
    S.fogDirty = true;
  }
  // world-space props from the run: nodes, caches, landmarks, campsites (retro.js sorts them with everything else)
  function props(v, list) {
    if (!P || !wm) return list;
    const spr = OW.sprites(), W = OW.world, TW = OW.TW;
    const inV = (x, y) => x > v.x0 - 120 && x < v.x1 + 120 && y > v.y0 - 20 && y < v.y1 + 160;
    for (const n of W.nodes) {
      const x = n.tx * TW + TW / 2, y = n.ty * TW + TW - 8;
      if (!inV(x, y)) continue;
      const s = spr.node[n.kind], img = nodeReady(n) ? s.full : s.empty;
      if (img) list.push({ x, y, img });
    }
    for (const c of W.caches) { const x = c.tx * TW + TW / 2, y = c.ty * TW + TW - 8; if (inV(x, y)) list.push({ x, y, img: P.caches.includes(c.id) ? spr.mark.cacheOpen : spr.mark.cache }); }
    for (const l of W.landmarks) { const x = l.tx * TW + TW / 2, y = l.ty * TW + TW; if (inV(x, y)) list.push({ x, y, img: spr.mark[l.kind] }); }
    for (const c of [...P.camps, ...people.filter(p => p.camp).map(p => p.camp)]) if (inV(c.x, c.y)) list.push({ x: c.x, y: c.y, img: spr.mark.campfire });
    return list;
  }
  // what E would act on: the nearest node, cache or rest spot within reach of the player's feet
  function findNear(f) {
    const W = OW.world, TW = OW.TW, reach = 80;
    let best = null, bd = reach;
    const consider = (x, y, o) => { const d = Math.hypot(x - f.x, (y - f.y) / 0.8) * (o.kind === 'npc' ? 0.7 : 1); if (d < bd) { bd = d; best = { ...o, x, y }; } };   // people come first
    for (const n of W.nodes) if (nodeReady(n) && Math.abs(n.tx * TW - f.x) < 140 && Math.abs(n.ty * TW - f.y) < 140) consider(n.tx * TW + TW / 2, n.ty * TW + TW - 8, { kind: 'node', n, label: NODE_PLAY[n.kind].verb });
    for (const c of W.caches) if (!P.caches.includes(c.id)) consider(c.tx * TW + TW / 2, c.ty * TW + TW - 8, { kind: 'cache', c, label: 'Open the cache' });
    const cp = campPos();
    consider(cp.x, cp.y, { kind: 'rest', label: 'Rest & save', at: cp });
    for (const c of P.camps) consider(c.x, c.y, { kind: 'rest', label: 'Rest & save', at: c });
    for (const p of people) { consider(p.t.x, p.t.y, { kind: 'npc', p, label: 'Talk to ' + p.def.name }); if (p.camp) consider(p.camp.x, p.camp.y, { kind: 'rest', label: 'Rest & save', at: p.camp }); }
    return best;
  }
  function interact() {
    const f = wm && wm.player;
    if (!f || f.state !== 'idle' || f.busy || !near) return;
    if (near.kind === 'node') gather(near.n);
    else if (near.kind === 'cache') openCache(near.c);
    else if (near.kind === 'rest') rest(near.at);
    else if (near.kind === 'npc') talk(near.p);
  }

  // ---------------------------------------------------------------------
  //  Encounters: what appears, where, at which level
  // ---------------------------------------------------------------------
  // level = the region's danger within the biome's range, pulled a little toward the player's level, with some
  // random spread; rare finds and Alphas run higher. The biome's range always holds (Alphas may exceed it a little)
  function wildLevel(biome, x, y, kind) {
    const [lo, hi] = BIOME_PLAY[biome].lv, band = OW.bandAt(x, y);
    let L = lo + (hi - lo) * (0.15 + band * 0.6);
    L += (P.level - L) * ADV.level.pull * (P.level > L ? 1 : 0.5);
    L += tri() * ADV.level.spread;
    if (kind === 'rare') L += R(1, 3);
    if (kind === 'elite') L += R(...ADV.level.eliteBonus);
    return Math.round(clamp(L, lo, hi + (kind === 'elite' ? ADV.level.eliteBonus[1] : 0)));
  }
  // how a species behaves in the wild (from its base stats and types): it attacks on sight, only fights back, or runs
  function temperOf(sp, elite) {
    if (elite) return 'aggressive';
    const [, atk, , spa, , spe] = sp.base, off = Math.max(atk, spa), h = OW.hash(sp.id, 3, 7);
    if (sp.types.some(t => ['Dark', 'Fighting', 'Dragon', 'Poison', 'Fire', 'Ghost'].includes(t)) || off >= 85) return h < 0.85 ? 'aggressive' : 'neutral';
    if (spe >= 70 && off < 65) return h < 0.6 ? 'timid' : 'neutral';
    return h < 0.45 ? 'aggressive' : 'neutral';
  }
  async function spawnWild(biome, x, y, o = {}) {
    const B = BIOME_PLAY[biome];
    const entry = o.species ? [o.species, 1] : pickW(B.table);
    const elite = !o.boss && (o.elite ?? Math.random() < ADV.level.elite);
    const kind = o.boss ? 'boss' : elite ? 'elite' : entry[2] === 'rare' ? 'rare' : 'common';
    const L = o.level || wildLevel(biome, x, y, kind);
    const species = o.boss ? entry[0] : evolveFor(entry[0], L);
    const sp = DEX.species[species];
    if (!sp) return null;
    const mon = makeMon({ species, level: L, mega: null, moves: wildMoves(species, L) }, 1, 1);
    const hpK = o.boss ? ADV.level.bossHp : elite ? ADV.level.eliteHp : 1;
    mon.maxhp = mon.hp = Math.round(mon.maxhp * hpK);
    const props = { temper: temperOf(sp, elite || o.boss), elite, boss: o.boss || null, rare: kind === 'rare', biome,
      tag: o.boss ? 'BOSS' : elite ? 'ALPHA' : null, size: o.boss ? ADV.level.bossSize : elite ? ADV.level.eliteSize : 1 };
    if (elite || o.boss) { props.aura = o.boss ? '#b46aff' : '#ff6a3a'; props.auraT = Infinity; }
    S.spawning++;
    try { return await wm.spawn(mon, x, y, props); }
    finally { S.spawning--; }
  }
  function inView(x, y, m = 80) { const v = wm.view(); return x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m * 2; }
  function encounterStep(dt) {
    const pl = wm.player;
    if (!pl || pl.state !== 'idle') return;
    for (const f of wm.wilds()) {
      if (f.state !== 'idle') continue;
      // far behind the player and not fighting: it goes (it will be someone else next time)
      if (!f.aggro && !f.boss && dist(f, pl) > ADV.spawn.despawn) { wm.despawn(f); continue; }
      if (f.boss && dist(f, pl) > ADV.spawn.despawn * 1.3) wm.despawn(f);
      if (f.rare && !f.seen && inView(f.x, f.y, 0)) { f.seen = true; note(`<b class="am">RARE!</b> A wild ${esc(f.mon.name)} appeared!`); }
      if (!f.tag && !f.rare && !f.seen && inView(f.x, f.y, 0) && f.mon.level - P.level >= ADV.strongGap + 1) { f.seen = true; note(`<b class="aw">DANGER</b> A wild Lv ${f.mon.level} ${esc(f.mon.name)} is much stronger than you. Keep your distance!`); }
      if (f.tag && !f.seen && inView(f.x, f.y, 0)) { f.seen = true; note(`<b class="aw">${f.boss ? 'BOSS' : 'ALPHA'}!</b> ${f.boss ? esc(BOSSES[f.boss].name) + ': ' : 'A towering '}Lv ${f.mon.level} ${esc(f.mon.name)}`); }
    }
    // territorial bosses wait at their landmark
    for (const l of OW.world.landmarks) {
      const b = BOSSES[l.kind];
      if (!b || P.bosses.includes(l.kind) || S.bossUp === l.kind) continue;
      const at = { x: l.tx * OW.TW + OW.TW / 2, y: l.ty * OW.TW + OW.TW * 2.5 };
      if (dist(at, pl) < 1200 && !wm.wilds().some(f => f.boss === l.kind)) {
        S.bossUp = l.kind;
        spawnWild(l.biome, at.x, at.y, { boss: l.kind, species: b.species, level: b.level }).finally(() => { S.bossUp = null; });
      }
    }
    if ((S.encT -= dt) > 0) return;
    S.encT = ADV.spawn.interval * R(0.7, 1.3);
    const here = OW.biomeAt(pl.x, pl.y), alive = wm.wilds().filter(f => f.state === 'idle' && !f.boss).length + S.spawning;
    if (alive >= BIOME_PLAY[here].cap || wm.slot() < 0) return;
    // a spot just out of sight: reachable ground, away from camps and from other wild Pokémon; in the player's own
    // biome if there is one (narrow caves have little open floor), else across the border
    for (let k = 0; k < 24; k++) {
      const a = R(0, Math.PI * 2), r = R(ADV.spawn.min, ADV.spawn.max), x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r * 0.75;
      if (!OW.reachable(x, y) || !OW.free(x, y, 20) || safeAt(x, y) || inView(x, y) || wm.wilds().some(o => dist(o, { x, y }) < ADV.spawn.gap)) continue;
      if (k < 18 && OW.biomeAt(x, y) !== here) continue;
      spawnWild(OW.biomeAt(x, y), x, y);
      break;
    }
  }
  function onFaint(f, by) {
    if (f.p === 0) {
      S.respawnAt = wm.time + ADV.faint.delay;
      note('<b class="aw">FAINTED!</b> You will wake up at your last rest spot.');
      return;
    }
    const pl = wm.player;
    if (!f.hitT && by !== pl) return;                 // knocked out by something else: no reward
    const sp = DEX.species[f.mon.species], bst = sp.base.reduce((a, b) => a + b, 0);
    // the Gen 5 scaled formula: a foe above your level is worth more, one far below it much less (farming weak
    // Pokémon slows down, so the next biome becomes the better place to grow)
    const L = f.mon.level, scale = clamp(((2 * L + 10) / (L + P.level + 10)) ** 2.5, 0.15, 3);
    const xp = bst * 0.21 * L / 7 * scale * ADV.xp.mult * (f.boss ? ADV.xp.boss : f.elite ? ADV.xp.elite : 1);
    P.stats.kos++;
    gainXp(xp, `${f.tag ? f.tag + ' ' : ''}${f.mon.name} defeated`);
    // loot: the biome's table (Alphas and bosses roll more and always give something good)
    const B = BIOME_PLAY[f.biome] || BIOME_PLAY.grass, rolls = f.boss ? 4 : f.elite ? 2 : 1;
    const got = {};
    for (let i = 0; i < rolls; i++) for (const [id, p] of B.loot) if (Math.random() < p * (f.boss ? 2 : 1)) got[id] = (got[id] || 0) + 1;
    if (f.elite) got.sitrus = (got.sitrus || 0) + 1;
    if (f.boss) { got.elixir = (got.elixir || 0) + 1; got.crystal = (got.crystal || 0) + 2; }
    Object.entries(got).forEach(([id, k], i) => setTimeout(() => active && addItem(id, k, { x: f.x, y: f.y - 30 - i * 26 }), 300 + i * 140));
    if (f.boss) { P.bosses.push(f.boss); wm.big(`${BOSSES[f.boss].name.toUpperCase()} DEFEATED!`, 'small', 2400); save(); }
    quest('defeat', { biome: f.biome, elite: f.elite, boss: f.boss });
  }
  function respawn() {
    S.respawnAt = 0;
    const m = P.mon;
    m.hp = Math.max(1, Math.round(m.maxhp * ADV.faint.hp)); m.status = null;
    P.stamina = stMax() * 0.5; P.hunger = Math.max(P.hunger, ADV.faint.hunger);
    for (const f of wm.wilds()) if (f.aggro) { f.aggro = false; f.goal = null; }
    const at = P.rest || campPos();
    wm.respawnPlayer(m, at.x, at.y).then(() => { wm.big('BACK AT CAMP', 'small', 1600); });
  }

  // ---------------------------------------------------------------------
  //  Survival: hunger, stamina, out-of-combat recovery
  // ---------------------------------------------------------------------
  function survivalStep(dt, f) {
    const m = P.mon, biome = OW.biomeAt(f.x, f.y);
    P.time += dt;
    const cold = OW.BIOMES[biome].cold ? ADV.hunger.cold : 1;
    const prev = P.hunger;
    P.hunger = Math.max(0, P.hunger - ADV.hunger.drain * cold * (P.dashing ? ADV.hunger.dash : 1) * dt);
    if (prev > ADV.hunger.warn && P.hunger <= ADV.hunger.warn) { wm.text(f, 'HUNGRY...', 'info'); note('<b class="aw">HUNGRY</b> Stamina recovers more slowly. Eat something!'); }
    if (prev > ADV.hunger.critical && P.hunger <= ADV.hunger.critical) { wm.text(f, 'STARVING!', 'crit'); note('<b class="aw">STARVING</b> Your Pokémon is weakening. Find food!'); }
    if (S.buffT > 0) S.buffT -= dt;
    if (S.tired > 0) S.tired -= dt;
    // stamina: recovers when not dashing, slower when hungry
    if (!P.dashing && !f.busy) {
      const k = P.hunger <= ADV.hunger.critical ? 0.4 : P.hunger <= ADV.hunger.warn ? 0.7 : 1;
      P.stamina = Math.min(stMax(), P.stamina + ADV.stamina.regen * k * (S.buffT > 0 ? 1.6 : 1) * dt);
    }
    if (wm.engaged || f.busy) S.combatT = wm.time;
    // out of combat and fed: HP slowly comes back; starving: it slowly drains (never below a floor)
    if (P.hunger <= 0) {
      const floor = Math.ceil(m.maxhp * ADV.hunger.starveFloor);
      if (m.hp > floor) { S.starveAcc = (S.starveAcc || 0) + m.maxhp * ADV.hunger.starveRate * dt; if (S.starveAcc >= 1) { m.hp = Math.max(floor, m.hp - Math.floor(S.starveAcc)); S.starveAcc %= 1; } }
      if ((S.starveT -= dt) <= 0) { S.starveT = 8; wm.text(f, 'STARVING!', 'crit'); }
    } else if (P.hunger >= ADV.regen.minHunger && wm.time - S.combatT > ADV.regen.delay && m.hp < m.maxhp && m.hp > 0) {
      S.regenAcc = (S.regenAcc || 0) + m.maxhp * ADV.regen.rate * dt;
      if (S.regenAcc >= 1) { m.hp = Math.min(m.maxhp, m.hp + Math.floor(S.regenAcc)); S.regenAcc %= 1; }
    }
  }

  // ---------------------------------------------------------------------
  //  Quests
  // ---------------------------------------------------------------------
  // The Ranger at camp hands out quests (three at a time, in order) and pays the rewards when you report back
  const questDef = id => QUESTS.find(q => q.id === id);
  const questReady = a => a.n >= questDef(a.id).goal.n;
  const nextQuest = () => P.quests.active.length < 3 ? QUESTS.find(q => !P.quests.done.includes(q.id) && !P.quests.active.some(a => a.id === q.id)) : null;
  function acceptQuest(q) {
    const a = { id: q.id, n: 0 };
    P.quests.active.push(a);
    // already true (a level reached, a place found before the quest was taken)
    if (q.goal.type === 'level') a.n = P.level;
    if (q.goal.type === 'discover' && P.discovered.includes(q.goal.id)) a.n = 1;
    if (q.goal.type === 'defeat' && q.goal.boss && P.bosses.includes(q.goal.boss)) a.n = 1;
    a.told = questReady(a);
    note(`<b class="aq">NEW QUEST</b> ${esc(q.title)}: ${esc(q.desc)}`);
    S.hudQuest = '';
  }
  function turnIn(a) {
    const q = questDef(a.id);
    P.quests.active.splice(P.quests.active.indexOf(a), 1);
    P.quests.done.push(q.id);
    note(`<b class="aq">QUEST COMPLETE</b> ${esc(q.title)}`);
    wm.big('QUEST COMPLETE!', 'small', 1600);
    Object.entries(q.reward.items || {}).forEach(([id, n]) => { P.inv[id] = count(id) + n; });
    if (q.reward.xp) gainXp(q.reward.xp, q.title);
    S.hudQuest = S.hudQuick = '';
  }
  function quest(type, d) {
    if (!P) return;
    for (const a of P.quests.active) {
      const g = questDef(a.id).goal;
      if (g.type !== type) continue;
      if (type === 'collect' && g.item === d.item) a.n += d.n;
      else if (type === 'craft' && g.item === d.item) a.n += d.n;
      else if (type === 'discover' && g.id === d.id) a.n = 1;
      else if (type === 'level') a.n = d.n;
      else if (type === 'defeat' && (!g.biome || g.biome === d.biome) && (!g.elite || d.elite) && (!g.boss || g.boss === d.boss)) a.n++;
    }
    checkQuests();
    S.hudQuest = '';
  }
  // a quest whose goal is met waits for the report at camp
  function checkQuests() {
    for (const a of P.quests.active) if (!a.told && questReady(a)) {
      a.told = true;
      note(`<b class="aq">QUEST DONE</b> ${esc(questDef(a.id).title)}: report to ${esc(NPCS.ranger.name)} at camp.`);
      AudioFX.SFX.buff();
    }
  }

  // ---------------------------------------------------------------------
  //  People: where they stand, and what they say. Talking pauses the world
  // ---------------------------------------------------------------------
  let people = [];                                    // { id, def, t (retro.js npc), camp? }
  // the camp for the Ranger; otherwise the end of the path in the safest region of the biome that has no landmark
  // in it (the landmarks have their guardians), so each one stands on open, reachable ground
  function npcSpot(def) {
    const W = OW.world, TW = OW.TW;
    if (def.where === 'camp') { const c = campPos(); return { x: c.x - TW * 3, y: c.y + TW }; }
    const marks = new Set(W.landmarks.map(l => W.region[l.ty * OW.COLS + l.tx]));
    const rs = W.regs.filter(r => r.biome === def.where).sort((a, b) => a.band - b.band);
    const r = rs.find(r2 => !marks.has(r2.i)) || rs[0];
    return { x: r.px * TW + TW / 2 + (marks.has(r.i) ? -TW * 6 : 0), y: r.py * TW + TW };
  }
  function placePeople() {
    people = [];
    for (const [id, def] of Object.entries(NPCS)) {
      let at = npcSpot(def);
      at = OW.nearestFree(at.x, at.y, 14);
      const p = { id, def, t: wm.npc(def.outfit, at.x, at.y) };
      if (def.camp) { const c = OW.nearestFree(at.x + 150, at.y + 20, 14); p.camp = { x: c.x, y: c.y }; }
      people.push(p);
    }
  }
  const met = id => P.npc.met.includes(id);
  // dialogue box: a portrait, a line, and numbered answers (keys 1-6 or a tap); E / Esc closes it
  let talkOpts = [];
  function say(p, text, opts) {
    talkOpts = [...opts, { label: 'Bye', fn: closePanel }];
    if (panel !== 'talk') { panel = 'talk'; keys.clear(); PAUSED = true; }
    hud.panel.className = 'ah-panel ah-talk';
    hud.panel.innerHTML = `<img src="${p.t.portrait}" alt=""><div><b>${esc(p.def.name)}</b><p>${esc(text)}</p><div class="ah-opts">${talkOpts.map((o, i) => `<button class="ah-btn ${o.label === 'Bye' ? 'alt' : ''}" data-o="${i}" ${o.off ? 'disabled' : ''}><kbd>${i + 1}</kbd> ${esc(o.label)}</button>`).join('')}</div></div>`;
    hud.panel.querySelectorAll('[data-o]').forEach(b => b.onclick = () => pickOpt(+b.dataset.o));
  }
  function pickOpt(i) { const o = talkOpts[i]; if (o && !o.off) o.fn(); }
  const itemsText = o => Object.entries(o).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(' + ');
  function talk(p) {
    const first = !met(p.id);
    if (first) P.npc.met.push(p.id);
    wm.pose(p.t, 'cheer', 0.8);
    const def = p.def;
    if (def.role === 'quests') {
      const ready = P.quests.active.filter(questReady), offer = nextQuest();
      const opts = [];
      if (ready.length) opts.push({ label: `Report: ${ready.map(a => questDef(a.id).title).join(', ')}`, fn: () => { ready.forEach(turnIn); talk(p); } });
      if (offer) opts.push({ label: `Accept: ${offer.title}`, fn: () => { acceptQuest(offer); talk(p); } });
      const text = first ? `Welcome to Base Camp! I'm ${def.name}. Rest by the fire to heal and save. I'll have jobs for you, too.`
        : ready.length ? 'Back already? Let\'s see what you did out there.'
        : offer ? `I need a hand: ${offer.desc}`
        : P.quests.active.length ? 'Good luck out there. Come back when you are done.' : 'You have done everything I asked. The whole region owes you!';
      return say(p, text, opts);
    }
    if (def.role === 'tips') {
      if (!P.npc.gift) {
        return say(p, `Heading into the forest? Take these, from one explorer to another: ${itemsText(def.gift)}.`, [{ label: 'Thank you!', fn: () => { P.npc.gift = true; Object.entries(def.gift).forEach(([id, n]) => addItem(id, n, p.t)); talk(p); } }]);
      }
      const tip = def.tips[P.npc.tip % def.tips.length];
      return say(p, tip, [{ label: 'Any other tips?', fn: () => { P.npc.tip++; talk(p); } }]);
    }
    if (def.role === 'trade') {
      const opts = def.trades.map(tr => ({ label: `${itemsText(tr.give)} → ${itemsText(tr.get)}`, off: !Object.entries(tr.give).every(([id, n]) => count(id) >= n),
        fn: () => { for (const [id, n] of Object.entries(tr.give)) takeItem(id, n); for (const [id, n] of Object.entries(tr.get)) addItem(id, n, p.t); AudioFX.SFX.pop(); talk(p); } }));
      return say(p, first ? `Name's ${def.name}. Swap your finds for supplies, and sit by my fire if you need a rest.` : 'What will it be?', opts);
    }
    if (def.role === 'study') {
      const opts = def.study.map(s => ({ label: `Give 1 ${ITEMS[s.give].name} (+${s.xp} XP${Object.keys(s.get).length ? ', ' + itemsText(s.get) : ''})`, off: !count(s.give),
        fn: () => { takeItem(s.give); gainXp(s.xp, `${def.name} studied the ${ITEMS[s.give].name}`); for (const [id, n] of Object.entries(s.get)) addItem(id, n, p.t); talk(p); } }));
      return say(p, first ? `Ah, a traveller! I study the ancient ruins to the east. Bring me Old Relics or Glow Crystals and I'll share what I learn.` : 'Found anything old?', opts);
    }
  }
  // people turn to face the player nearby, and wave when it first comes close
  function peopleStep(f) {
    for (const p of people) {
      const d = Math.hypot(p.t.x - f.x, p.t.y - f.y);
      if (d < 500) p.t.p = f.x < p.t.x ? 1 : 0;
      if (d < 260 && !p.waved) { p.waved = true; wm.pose(p.t, 'cheer', 1.2); }
      if (d > 600) p.waved = false;
    }
  }

  // ---------------------------------------------------------------------
  //  Save / load (localStorage). The world itself is rebuilt from its seed;
  //  only what changed is saved. Loading validates everything.
  // ---------------------------------------------------------------------
  function exploredB64() { let s = ''; const e = P.explored; for (let i = 0; i < e.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) if (e[i + k]) b |= 1 << k; s += String.fromCharCode(b); } return btoa(s); }
  function exploredFrom(b64) {
    const e = new Uint8Array(OW.COLS * OW.ROWS);
    try { const s = atob(b64 || ''); for (let i = 0; i < s.length && i * 8 < e.length; i++) { const b = s.charCodeAt(i); for (let k = 0; k < 8; k++) if (b & (1 << k)) e[i * 8 + k] = 1; } } catch (err) {}
    return e;
  }
  function snapshot() {
    const f = wm && wm.player, m = P.mon;
    // saved while fainted: it is saved as it will wake up (at the rest spot, with the respawn HP)
    const down = !f || f.state !== 'idle' || S.respawnAt;
    if (down) { const at = P.rest || campPos(); P.x = at.x; P.y = at.y; } else { P.x = Math.round(f.x); P.y = Math.round(f.y); }
    const hp = down ? Math.max(m.hp, Math.round(m.maxhp * ADV.faint.hp)) : m.hp;
    return {
      v: 1, gen: OW.GEN_VERSION, seed: P.seed, time: Math.round(P.time), savedAt: Date.now(),
      player: { species: P.species, level: P.level, xp: P.xp, hp, status: down ? null : m.status, stamina: Math.round(P.stamina), hunger: Math.round(P.hunger * 10) / 10, unlocked: P.unlocked, equipped: P.equipped, x: P.x, y: P.y },
      inv: P.inv, quick: P.quick, nodes: P.nodes, caches: P.caches, discovered: P.discovered, biomes: P.biomes, bosses: P.bosses, camps: P.camps, rest: P.rest,
      quests: { active: P.quests.active.map(a => ({ id: a.id, n: a.n })), done: P.quests.done }, npc: P.npc, stats: P.stats, explored: exploredB64()
    };
  }
  function save() {
    if (!P || !active) return false;
    try { localStorage.setItem(ADV.save.key, JSON.stringify(snapshot())); S.saveT = 0; return true; }
    catch (e) { console.warn('adventure save failed', e); return false; }
  }
  function readSave() { try { const raw = localStorage.getItem(ADV.save.key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  // a save from storage -> a clean run, or null. Anything missing or invalid falls back to a safe default.
  function validate(s) {
    if (!s || typeof s !== 'object' || s.v !== 1 || !s.player) return null;
    const num = (v, lo, hi, d) => Number.isFinite(+v) ? clamp(+v, lo, hi) : d;
    const p = s.player, sp = DEX.species[p.species];
    if (!sp) return null;
    const level = Math.round(num(p.level, Math.max(1, sp.minLevel), 100, Math.max(ADV.startLevel, sp.minLevel)));
    const known = levelMoves(sp.name, level);
    let unlocked = Array.isArray(p.unlocked) ? [...new Set(p.unlocked.filter(id => known.includes(id)))] : [];
    for (const id of known) if (!unlocked.includes(id)) unlocked.push(id);   // anything the level grants is known
    let equipped = Array.isArray(p.equipped) ? [...new Set(p.equipped.filter(id => unlocked.includes(id)))].slice(0, 4) : [];
    if (!equipped.length) equipped = bestFour(unlocked);
    const inv = {};
    if (s.inv && typeof s.inv === 'object') for (const [id, n] of Object.entries(s.inv)) if (ITEMS[id] && Number.isFinite(+n) && +n > 0) inv[id] = Math.min(999, Math.floor(+n));
    const ids = (a, ok) => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && ok(x)))] : [];
    const seed = Math.floor(num(s.seed, 1, 4294967295, 0));
    if (!seed) return null;
    const pt = o => o && Number.isFinite(+o.x) && Number.isFinite(+o.y) ? { x: Math.round(+o.x), y: Math.round(+o.y) } : null;
    const q = s.quests && typeof s.quests === 'object' ? s.quests : {};
    const qActive = Array.isArray(q.active) ? q.active.filter(a => a && questDef(a.id)).map(a => ({ id: a.id, n: Math.max(0, Math.floor(num(a.n, 0, 1e6, 0))) })) : [];
    const nodes = {};
    if (s.nodes && typeof s.nodes === 'object') for (const [id, t] of Object.entries(s.nodes)) if (/^\d+,\d+$/.test(id) && (Number.isFinite(+t) || t === null)) nodes[id] = t === null ? Infinity : +t;
    return {
      seed, sameGen: s.gen === OW.GEN_VERSION, time: num(s.time, 0, 1e9, 0),
      species: sp.name, level, xp: Math.max(xpFor(level), Math.floor(num(p.xp, 0, 1e9, 0))), hp: num(p.hp, 0, 9999, null),
      status: ['brn', 'psn', 'par'].includes(p.status) ? p.status : null,
      stamina: num(p.stamina, 0, 999, 100), hunger: num(p.hunger, 0, 100, 100), unlocked, equipped, x: num(p.x, 0, 1e6, null), y: num(p.y, 0, 1e6, null),
      inv, quick: Array.isArray(s.quick) ? s.quick.slice(0, 3).map(id => ITEMS[id] && ITEMS[id].use ? id : null) : null,
      nodes, caches: ids(s.caches, x => /^cache\d+$/.test(x)), discovered: ids(s.discovered, x => x in LANDMARK_NAMES), biomes: ids(s.biomes, x => OW.ORDER.includes(x)),
      bosses: ids(s.bosses, x => x in BOSSES), camps: Array.isArray(s.camps) ? s.camps.map(pt).filter(Boolean).slice(0, 20) : [], rest: pt(s.rest),
      quests: { active: qActive, done: ids(q.done, x => !!questDef(x)) },
      npc: { met: ids(s.npc && s.npc.met, x => x in NPCS), gift: !!(s.npc && s.npc.gift), tip: Math.floor(num(s.npc && s.npc.tip, 0, 1e6, 0)) }, stats: { kos: Math.floor(num(s.stats && s.stats.kos, 0, 1e7, 0)) }, explored: s.explored
    };
  }
  function newRun(species, seed) {
    const sp = DEX.species[species], level = Math.max(ADV.startLevel, sp.minLevel), unlocked = levelMoves(species, level);
    return { seed, sameGen: true, time: 0, species, level, xp: xpFor(level), hp: null, status: null, stamina: 100, hunger: 100, unlocked, equipped: bestFour(unlocked), x: null, y: null,
      inv: { oran: 3, apple: 2 }, quick: ['oran', 'apple', 'herb'], nodes: {}, caches: [], discovered: ['camp'], biomes: [], bosses: [], camps: [], rest: null, quests: { active: [], done: [] }, npc: { met: [], gift: false, tip: 0 }, stats: { kos: 0 }, explored: '' };
  }

  // ---------------------------------------------------------------------
  //  Input
  // ---------------------------------------------------------------------
  const MOVE_KEYS = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  function onKeyDown(e) {
    if (!active || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const pauseOpen = !document.getElementById('pauseMenu').classList.contains('hidden');
    if (MOVE_KEYS[e.code] || e.code === 'Space') e.preventDefault();
    if (e.code === 'Escape' && panel) { closePanel(); return; }
    if (pauseOpen) return;
    if (panel === 'talk') {
      const d = /^(Digit|Numpad)(\d)$/.exec(e.code);
      if (d) pickOpt(+d[2] - 1); else if (e.code === 'KeyE' && !e.repeat) closePanel();
      return;
    }
    if (e.code === 'KeyI' || e.code === 'KeyB' || e.code === 'KeyC') { togglePanel('bag'); return; }
    if (e.code === 'KeyM') { togglePanel('moves'); return; }
    if (e.code === 'KeyJ') { togglePanel('quests'); return; }
    if (panel) return;
    keys.add(e.code);
    if (e.repeat) return;
    const d = /^(Digit|Numpad)(\d)$/.exec(e.code);
    if (d && +d[2] >= 1 && +d[2] <= 4) useMove(+d[2] - 1);
    if (d && +d[2] >= 5 && +d[2] <= 7) { const id = P.quick[+d[2] - 5]; if (id) useItem(id); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyQ' || e.code === 'Tab') { e.preventDefault(); wm.cycleTarget(); }
  }
  const onKeyUp = e => keys.delete(e.code);
  const onBlur = () => keys.clear();
  function useMove(i) {
    const r = wm.queueMove(i);
    if (r === 'ok') S.hudMoves = '';
    return r;
  }
  // ---- touch: a floating stick (it appears where the left thumb lands), the four moves in an arc around E (right),
  // RUN (a toggle), the menus. Pointer events, so a mouse can use them too. They show on touch screens, or as soon
  // as the screen is touched. On a phone held upright the game turns to landscape (see orient) ----
  const touch = { x: 0, y: 0, mag: 0, run: false, id: null, upT: 0 };
  const isTouch = () => matchMedia('(pointer: coarse)').matches;
  const onTouchStart = () => { if (!document.body.classList.contains('touchUI')) { document.body.classList.add('touchUI'); orient(); } };
  const buzz = ms => { try { if (document.body.classList.contains('touchUI') && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  // a pointer position on the game frame (CSS px from its top-left), also when the frame is turned to landscape
  function frameXY(e) {
    if (document.body.classList.contains('rotLand')) return { x: e.clientY, y: innerWidth - e.clientX };
    const r = document.getElementById('frame').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function bindTouch(el) {
    const zone = el.querySelector('.ah-zone'), stick = el.querySelector('.ah-stick'), knob = stick.querySelector('i');
    let cx = 0, cy = 0;
    const aim = e => {
      const p = frameXY(e), R = stick.offsetWidth / 2;
      let dx = (p.x - cx) / R, dy = (p.y - cy) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      knob.style.transform = `translate(${(dx * 62).toFixed(1)}%, ${(dy * 62).toFixed(1)}%)`;
      const mag = Math.min(1, m);
      if (mag < 0.14) { touch.mag = 0; return; }                         // dead zone
      touch.x = dx / mag; touch.y = dy / mag; touch.mag = Math.min(1, (mag - 0.14) / 0.7);   // full speed well before the rim
    };
    const release = e => {
      if (e && e.pointerId !== touch.id) return;
      touch.id = null; touch.mag = 0; touch.upT = performance.now();
      knob.style.transform = ''; stick.style.left = stick.style.top = ''; stick.classList.add('idle');
    };
    // the stick jumps to where the thumb lands in the left part of the screen
    zone.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = frameXY(e), R = stick.offsetWidth / 2, W = zone.offsetWidth, H = el.offsetHeight;
      cx = clamp(p.x, R + 8, W - 8); cy = clamp(p.y, R + 8, H - R - 8);
      stick.style.left = (cx - R) + 'px'; stick.style.top = (cy - R) + 'px'; stick.classList.remove('idle');
      touch.id = e.pointerId; zone.setPointerCapture(e.pointerId); aim(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === touch.id) aim(e); });
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
    const run = el.querySelector('[data-t="run"]');
    run.addEventListener('pointerdown', e => { e.preventDefault(); touch.run = !touch.run; touch.upT = performance.now(); buzz(10); });   // (it stays on until you stand still a moment)
    el.querySelector('[data-t="use"]').addEventListener('pointerdown', e => { e.preventDefault(); buzz(10); if (panel === 'talk') closePanel(); else interact(); });
    el.querySelectorAll('.ah-tmenu [data-t]').forEach(b => b.onclick = () => { buzz(8); if (b.dataset.t === 'rotate') { prefs.advLandscape = prefs.advLandscape === false; savePrefs(); orient(); toast(prefs.advLandscape === false ? 'Landscape off: the game follows your phone.' : 'Landscape on.', 1800); } else togglePanel(b.dataset.t); });
    hud.tmoves.addEventListener('pointerdown', e => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); buzz(12); useMove(+b.dataset.i); });
    hud.use = el.querySelector('[data-t="use"] small'); hud.run = run;
    if (isTouch()) document.body.classList.add('touchUI');
  }
  // pick a target by tapping / clicking a wild Pokémon
  function onPick(e) {
    if (!active || panel || !wm) return;
    const p = frameXY(e), w = wm.toWorld(p.x, p.y), o = wm.wildAt(w.x, w.y);
    if (o && wm.setTarget(o)) buzz(10);
  }
  // landscape on phones: real fullscreen + orientation lock where the browser allows it, else the game frame is
  // turned 90° while the phone is held upright (Settings: the ⟳ button; remembered)
  function orient() {
    const want = active && document.body.classList.contains('touchUI') && prefs.advLandscape !== false && innerHeight > innerWidth;
    if (document.body.classList.contains('rotLand') === want) return;
    document.body.classList.toggle('rotLand', want);
    dispatchEvent(new Event('resize'));
  }
  function goLandscape() {
    if (!isTouch() || prefs.advLandscape === false) return;
    try {
      const el = document.documentElement;
      const fs = !document.fullscreenElement && el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve();
      fs.then(() => screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null).catch(() => {}).finally(orient);
    } catch (e) {}
  }
  function input(f, dt) {
    let x = 0, y = 0;
    for (const k of keys) { const d = MOVE_KEYS[k]; if (d === 'u') y -= 1; else if (d === 'd') y += 1; else if (d === 'l') x -= 1; else if (d === 'r') x += 1; }
    x = clamp(x, -1, 1); y = clamp(y, -1, 1);
    let L = Math.hypot(x, y);
    if (L) { x /= L; y /= L; }
    else if (touch.mag > 0) { x = touch.x; y = touch.y; L = touch.mag; }
    let dash = false;
    if (touch.run && (S.tired > 0 || (!touch.mag && touch.id === null && performance.now() - touch.upT > 600))) touch.run = false;
    if (L && (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space') || touch.run) && S.tired <= 0 && P.stamina > 0) {
      dash = true;
      P.stamina -= ADV.stamina.dash * dt;
      if (P.stamina <= 0) { P.stamina = 0; S.tired = ADV.stamina.tired; wm.text(f, 'OUT OF BREATH', 'info'); }
    }
    P.dashing = dash;
    return { x, y, dash };
  }

  // ---------------------------------------------------------------------
  //  HUD (DOM over the canvas, retro styled like the battle HUD)
  // ---------------------------------------------------------------------
  const ICONS = {};
  function icon(id) {
    if (ICONS[id]) return ICONS[id];
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    const P_ = (col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const disc = (col, cx, cy, r) => { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); P_(col, cx - w, cy + y, w * 2 + 1, 1); } };
    const [kind, col] = ITEMS[id].ic;
    const K = '#1b1530';
    if (kind === 'berry') { disc(K, 8, 9, 6); disc(col, 8, 9, 5); P_('#ffffff', 5, 6, 2, 2); P_('#2f6a2a', 7, 1, 2, 3); P_('#5ab04a', 9, 2, 3, 2); }
    else if (kind === 'apple') { disc(K, 8, 9, 6); disc('#e03a2a', 8, 9, 5); P_('#ffd0c0', 5, 6, 2, 2); P_('#6e4a2a', 8, 1, 1, 4); P_('#5ab04a', 9, 2, 3, 2); }
    else if (kind === 'mushroom') { P_(K, 6, 8, 4, 7); P_('#f0e8d8', 7, 8, 2, 6); disc(K, 8, 7, 6); disc('#d23a3a', 8, 7, 5); P_(K, 2, 9, 13, 1); P_('#ffffff', 5, 4, 2, 2); P_('#ffffff', 10, 6, 2, 1); }
    else if (kind === 'herb') { for (let k = 0; k < 4; k++) { P_(K, 3 + k * 3, 3 + (k % 2) * 2, 3, 12 - (k % 2) * 2); P_('#4f9a3a', 4 + k * 3, 4 + (k % 2) * 2, 1, 10 - (k % 2) * 2); P_('#9ae070', 3 + k * 3, 3 + (k % 2) * 2, 3, 2); } }
    else if (kind === 'bottle') { P_(K, 4, 4, 8, 11); P_(K, 6, 1, 4, 4); P_('#e8f4ff', 5, 5, 6, 9); P_(col, 5, 8, 6, 6); P_('#8a5a2a', 7, 2, 2, 2); P_('#ffffff', 6, 6, 1, 3); }
    else if (kind === 'bowl') { P_(K, 1, 7, 14, 7); P_('#a8763e', 2, 8, 12, 5); P_('#c86a2a', 2, 7, 12, 2); P_('#5ab04a', 4, 6, 2, 1); P_('#f0e8d8', 9, 6, 2, 1); P_('#ffffff', 4, 2, 1, 3); P_('#ffffff', 10, 1, 1, 3); }
    else if (kind === 'stick') { for (let k = 0; k < 12; k++) { P_(K, 2 + k, 12 - k * 0.8, 3, 3); } for (let k = 0; k < 12; k++) P_(k % 3 ? '#a8763e' : '#6e4a2a', 3 + k, 12.5 - k * 0.8, 1, 1); }
    else if (kind === 'stone') { disc(K, 8, 9, 6); disc('#9a968a', 8, 9, 5); P_('#c8c4b8', 5, 6, 3, 2); P_('#6e6a60', 10, 11, 2, 2); }
    else if (kind === 'ore') { disc(K, 8, 9, 6); disc('#6e6462', 8, 9, 5); for (const [x, y] of [[5, 7], [9, 5], [10, 10], [6, 11]]) { P_('#e8a040', x, y, 2, 2); P_('#fff0a0', x, y, 1, 1); } }
    else if (kind === 'crystal') { for (const [x, h, c2] of [[4, 8, '#5ab4f0'], [8, 13, '#a8e8ff'], [12, 7, '#7ad8ff']]) { P_(K, x - 2, 15 - h, 4, h + 1); P_(c2, x - 1, 15 - h, 2, h); P_('#ffffff', x - 1, 15 - h, 1, h - 2); } }
    else if (kind === 'relic') { P_(K, 2, 3, 12, 11); P_('#c8a040', 3, 4, 10, 9); P_('#f0d070', 4, 5, 8, 2); P_('#8a6a20', 7, 8, 2, 4); }
    else if (kind === 'kit') { P_(K, 1, 9, 14, 6); P_('#8a5e34', 2, 10, 12, 4); for (let k = 0; k < 3; k++) P_('#6e4a2a', 3 + k * 4, 10, 2, 4); P_('#ff7a1a', 6, 3, 4, 6); P_('#ffd23f', 7, 5, 2, 3); }
    return (ICONS[id] = c.toDataURL());
  }
  const note = html => wm && wm.notify(html);
  function buildHud() {
    const el = wm.hudEl;
    el.innerHTML = `
      <div class="ah-card">
        <div class="por"><img alt=""></div>
        <div class="nm"><span></span><small></small></div>
        <div class="chips"></div>
        <div class="bar hp"><i class="lag"></i><i class="fill"></i><span></span></div>
        <div class="bar st"><i class="fill"></i><span></span></div>
        <div class="bar xp"><i class="fill"></i><span></span></div>
        <div class="bar hu"><i class="fill"></i><span></span></div>
      </div>
      <div class="ah-map"><canvas width="${OW.COLS}" height="${OW.ROWS}"></canvas><div class="ah-biome"></div></div>
      <div class="ah-quests"></div>
      <div class="ah-bar"><div class="ah-moves"></div><div class="ah-quick"></div></div>
      <div class="ah-keys"><kbd>WASD</kbd> move <kbd>Shift</kbd> dash <kbd>1-4</kbd> attack <kbd>E</kbd> interact <kbd>Q</kbd>/click target <kbd>5-7</kbd> items <kbd>I</kbd> bag <kbd>M</kbd> moves <kbd>J</kbd> quests <kbd>Esc</kbd> pause</div>
      <div class="rfeed ah-feed" id="rFeed"></div>
      <div class="ah-hurt"></div>
      <div class="ah-touch"><div class="ah-zone"></div><div class="ah-stick idle"><i></i></div>
        <button class="ah-run" data-t="run">RUN</button>
        <div class="ah-tmenu"><button data-t="bag">BAG</button><button data-t="moves">MOVES</button><button data-t="quests">QUESTS</button><button data-t="rotate" title="Landscape on/off">⟳</button></div>
        <div class="ah-cluster"><div class="ah-tmoves"></div><button class="ah-use" data-t="use"><b>E</b><small></small></button></div></div>
      <div class="ah-panel hidden"></div>`;
    const $q = s => el.querySelector(s);
    hud = { card: $q('.ah-card'), por: $q('.por img'), nm: $q('.nm span'), lv: $q('.nm small'), chips: $q('.chips'),
      hp: $q('.bar.hp .fill'), hpLag: $q('.bar.hp .lag'), hpN: $q('.bar.hp span'), st: $q('.bar.st .fill'), stN: $q('.bar.st span'), stBar: $q('.bar.st'),
      xp: $q('.bar.xp .fill'), xpN: $q('.bar.xp span'), hu: $q('.bar.hu .fill'), huN: $q('.bar.hu span'), huBar: $q('.bar.hu'),
      map: $q('.ah-map canvas'), biome: $q('.ah-biome'), quests: $q('.ah-quests'), moves: $q('.ah-moves'), quick: $q('.ah-quick'), panel: $q('.ah-panel') };
    hud.mapG = hud.map.getContext('2d');
    hud.fog = document.createElement('canvas'); hud.fog.width = OW.COLS; hud.fog.height = OW.ROWS;
    hud.moves.onclick = e => { const b = e.target.closest('[data-i]'); if (b) useMove(+b.dataset.i); };
    hud.quick.onclick = e => { const b = e.target.closest('[data-q]'); if (b && P.quick[+b.dataset.q]) useItem(P.quick[+b.dataset.q]); };
    hud.map.onclick = () => togglePanel('quests');
    hud.tmoves = $q('.ah-tmoves'); hud.hurt = $q('.ah-hurt');
    bindTouch(el);
    S.hudMoves = S.hudTMoves = S.hudQuick = S.hudQuest = ''; S.hudXp = -1; S.fogDirty = true;
    for (const k in S) if (k.startsWith('last')) S[k] = null;
  }
  const setW = (el, k) => { const w = (clamp(k, 0, 1) * 100).toFixed(1) + '%'; if (el.style.width !== w) el.style.width = w; };
  const setT = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  function updateHud() {
    if (!hud) return;
    const m = P.mon, f = wm.player;
    if (hud.por.getAttribute('src') !== m.sprite) hud.por.setAttribute('src', m.sprite);
    setT(hud.nm, m.name); setT(hud.lv, 'Lv ' + P.level);
    const chips = m.types.map(t => `<span class="chip" style="background:${TYPE_COLORS[t]}">${t.toUpperCase()}</span>`).join('') + (m.status ? `<span class="chip" style="background:${STATUS_INFO[m.status].color}">${STATUS_INFO[m.status].label}</span>` : '') + (S.buffT > 0 ? '<span class="chip" style="background:#5ad66a">TONIC</span>' : '');
    if (chips !== S.lastChips) { S.lastChips = chips; hud.chips.innerHTML = chips; }
    const hk = m.hp / m.maxhp;
    setW(hud.hp, hk); setW(hud.hpLag, hk);
    hud.hp.style.backgroundColor = hk > 0.5 ? '#3ddc68' : hk > 0.2 ? '#f5c518' : '#ef4444';
    setT(hud.hpN, `${Math.max(0, Math.ceil(m.hp))}/${m.maxhp}`);
    setW(hud.st, P.stamina / stMax()); setT(hud.stN, `${Math.floor(P.stamina)}`);
    hud.stBar.classList.toggle('tired', S.tired > 0);
    const x0 = xpFor(P.level), x1 = xpFor(P.level + 1);
    setW(hud.xp, P.level >= 100 ? 1 : (P.xp - x0) / (x1 - x0)); setT(hud.xpN, P.level >= 100 ? 'MAX' : `${P.xp - x0}/${x1 - x0}`);
    setW(hud.hu, P.hunger / 100); setT(hud.huN, P.hunger <= ADV.hunger.critical ? 'STARVING' : P.hunger <= ADV.hunger.warn ? 'HUNGRY' : 'FED');
    hud.huBar.classList.toggle('warn', P.hunger <= ADV.hunger.warn);
    hud.huBar.classList.toggle('crit', P.hunger <= ADV.hunger.critical);
    // moves: name, type colour, stamina cost; the shared cooldown sweeps over them; the queued one is marked
    const sig = P.equipped.join() + '|' + P.level;
    if (sig !== S.hudMoves) {
      S.hudMoves = sig;
      hud.moves.innerHTML = m.moves.map((mv, i) => `<button class="ah-mv" data-i="${i}" style="--c:${TYPE_COLORS[mv.type] || '#888'}" title="${esc(mv.name)}: ${esc(moveLine(mv))}"><b>${i + 1}</b><span>${esc(mv.name)}</span><small>${moveCost(mv)}</small><i class="cd"></i></button>`).join('');
    }
    if (f) {
      if (f.cd > S.lastCd + 0.15) S.cdMax = Math.max(0.3, f.cd);
      S.lastCd = f.cd;
      const cdk = f.busy ? 1 : clamp(f.cd / S.cdMax, 0, 1);
      hud.moves.querySelectorAll('.ah-mv').forEach((b, i) => {
        b.querySelector('.cd').style.height = (cdk * 100).toFixed(0) + '%';
        b.classList.toggle('q', f.queued === i);
        b.classList.toggle('poor', P.stamina < moveCost(m.moves[i]));
      });
    }
    const qsig = P.quick.join() + '|' + P.quick.map(id => id ? count(id) : 0).join();
    if (qsig !== S.hudQuick) {
      S.hudQuick = qsig;
      hud.quick.innerHTML = P.quick.map((id, i) => `<button class="ah-qs ${id && count(id) ? '' : 'empty'}" data-q="${i}" title="${id ? esc(ITEMS[id].name + ': ' + ITEMS[id].desc) : 'Empty: set a quick item in the bag (I)'}"><b>${i + 5}</b>${id ? `<img src="${icon(id)}" alt=""><small>${count(id)}</small>` : ''}</button>`).join('');
    }
    if (hud.use) setT(hud.use, near ? near.label.split(' ')[0].toUpperCase() : '');
    if (hud.run) hud.run.classList.toggle('on', touch.run);
    if (sig !== S.hudTMoves) {
      S.hudTMoves = sig;
      hud.tmoves.innerHTML = m.moves.map((mv, i) => `<button class="ah-tm t${i}" data-i="${i}" style="--c:${TYPE_COLORS[mv.type] || '#888'}"><span>${esc(mv.name)}</span><small>${moveCost(mv)}</small><i class="cd"></i></button>`).join('');
    }
    if (f) {
      const cdk = f.busy ? 1 : clamp(f.cd / S.cdMax, 0, 1);
      hud.tmoves.querySelectorAll('.ah-tm').forEach((b, i) => {
        b.querySelector('.cd').style.background = cdk > 0.01 ? `conic-gradient(rgba(10,8,24,.62) ${(cdk * 360).toFixed(0)}deg, transparent 0)` : 'none';
        b.classList.toggle('q', f.queued === i);
        b.classList.toggle('poor', P.stamina < moveCost(m.moves[i]));
      });
    }
    // hit: the screen edges flash red (and the phone buzzes)
    if (S.lastHp != null && m.hp < S.lastHp && f && f.state === 'idle') { buzz(35); hud.hurt.classList.remove('on'); void hud.hurt.offsetWidth; hud.hurt.classList.add('on'); }
    S.lastHp = m.hp;
    // quest tracker
    const qs = P.quests.active.map(a => { const q = questDef(a.id); return questReady(a) ? `<div class="rdy"><b>✔ ${esc(q.title)}</b><span>Report to ${esc(NPCS.ranger.name)} at camp</span></div>` : `<div><b>${esc(q.title)}</b><span>${esc(q.desc)}</span>${q.goal.n > 1 ? `<i>${Math.min(a.n, q.goal.n)}/${q.goal.n}</i>` : ''}</div>`; }).join('')
      + (nextQuest() && P.quests.active.length < 3 ? `<div class="rdy"><b>${P.quests.active.length ? 'More work' : 'Find work'}</b><span>Talk to ${esc(NPCS.ranger.name)} at camp</span></div>` : '');
    if (qs !== S.hudQuest) { S.hudQuest = qs; hud.quests.innerHTML = qs; }
  }
  // minimap: the whole world, unexplored parts dark; landmarks found, campsites, the player
  function updateMap(f) {
    const g = hud.mapG, fog = hud.fog.getContext('2d');
    if (S.fogDirty) {
      fog.clearRect(0, 0, OW.COLS, OW.ROWS);
      fog.fillStyle = '#0d0a18';
      for (let i = 0; i < P.explored.length; i++) if (!P.explored[i]) fog.fillRect(i % OW.COLS, (i / OW.COLS) | 0, 1, 1);
      S.fogDirty = false;
    }
    g.drawImage(OW.miniBase(), 0, 0);
    g.drawImage(hud.fog, 0, 0);
    const TW = OW.TW;
    for (const l of OW.world.landmarks) if (P.discovered.includes(l.id) || l.kind === 'camp') { g.fillStyle = l.kind === 'camp' ? '#ff5a5a' : BOSSES[l.kind] && !P.bosses.includes(l.kind) ? '#b46aff' : '#ffe066'; g.fillRect(l.tx - 2, l.ty - 2, 5, 5); g.fillStyle = '#1b1530'; g.fillRect(l.tx - 1, l.ty - 1, 3, 3); g.fillStyle = l.kind === 'camp' ? '#ff5a5a' : '#ffe066'; g.fillRect(l.tx, l.ty, 1, 1); }
    for (const p of people) if (p.id === 'ranger' || met(p.id)) { const tx = Math.floor(p.t.x / TW), ty = Math.floor(p.t.y / TW); g.fillStyle = '#1b1530'; g.fillRect(tx - 2, ty - 2, 4, 4); g.fillStyle = '#5ae0ff'; g.fillRect(tx - 1, ty - 1, 2, 2); }
    for (const c of P.camps) { g.fillStyle = '#ff9a3a'; g.fillRect(Math.floor(c.x / TW) - 1, Math.floor(c.y / TW) - 1, 3, 3); }
    if (f) {
      const tx = Math.floor(f.x / TW), ty = Math.floor(f.y / TW);
      g.fillStyle = '#ffffff'; g.fillRect(tx - 2, ty - 2, 5, 5);
      g.fillStyle = Math.floor(wm.time * 3) % 2 ? '#2563eb' : '#60a5fa'; g.fillRect(tx - 1, ty - 1, 3, 3);
    }
    const b = f ? OW.biomeAt(f.x, f.y) : null;
    if (b) { const [lo, hi] = BIOME_PLAY[b].lv; setT(hud.biome, `${OW.BIOMES[b].name} · Lv ${lo}-${hi}`); }
  }
  // reveal the map around the player
  function explore(f) {
    const tx = Math.floor(f.x / OW.TW), ty = Math.floor(f.y / OW.TW), r = 10;
    const fog = hud && hud.fog.getContext('2d');
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
      if (x < 0 || y < 0 || x >= OW.COLS || y >= OW.ROWS || (x - tx) ** 2 + (y - ty) ** 2 > r * r) continue;
      const i = y * OW.COLS + x;
      if (!P.explored[i]) { P.explored[i] = 1; if (fog) fog.clearRect(x, y, 1, 1); }
    }
  }
  const CAT = { physical: 'Physical', special: 'Special', status: 'Status' };
  function moveLine(mv) {
    const parts = [mv.type, CAT[mv.cat]];
    if (mv.power) parts.push(`Power ${mv.power}`);
    if (mv.acc) parts.push(`Acc ${mv.acc}`);
    if (mv.ailment && mv.ailment !== 'none' && mv.ailmentChance !== 0) parts.push(`${mv.ailment}${mv.ailmentChance ? ' ' + mv.ailmentChance + '%' : ''}`);
    if (mv.stats && mv.stats.length) parts.push(mv.stats.map(([s, c]) => `${s.replace('special-', 'sp. ')} ${c > 0 ? '+' : ''}${c}`).join(', '));
    if (mv.drain > 0) parts.push(`drains ${mv.drain}%`); else if (mv.drain < 0) parts.push(`recoil ${-mv.drain}%`);
    if (mv.healing) parts.push(`heals ${mv.healing}%`);
    if (mv.priority > 0) parts.push('fast');
    parts.push(`${moveCost(mv)} stamina`);
    return parts.join(' · ');
  }
  // ---- panels: bag (items + crafting), moves (equip + stats), quests. The world holds still while one is open ----
  function togglePanel(name) { if (panel === name) closePanel(); else openPanel(name); }
  function openPanel(name) {
    if (!wm || !wm.player) return;
    panel = name; keys.clear();
    PAUSED = true;
    renderPanel();
  }
  function closePanel() {
    panel = null; S.sel = null;
    hud.panel.className = 'ah-panel hidden';
    if (document.getElementById('pauseMenu').classList.contains('hidden')) PAUSED = false;
  }
  function renderPanel() {
    if (!panel || !hud || panel === 'talk') return;
    hud.panel.className = 'ah-panel';
    const tabs = `<div class="ah-tabs">${[['bag', 'Bag (I)'], ['moves', 'Moves (M)'], ['quests', 'Quests (J)']].map(([k, l]) => `<button data-tab="${k}" class="${panel === k ? 'on' : ''}">${l}</button>`).join('')}<button class="x" data-close>✕</button></div>`;
    let body = '';
    if (panel === 'bag') {
      const ids = Object.keys(P.inv).filter(id => count(id) > 0).sort((a, b) => (!!ITEMS[b].use - !!ITEMS[a].use) || ITEMS[a].name.localeCompare(ITEMS[b].name));
      const sel = S.sel && count(S.sel) ? S.sel : ids[0];
      const it = sel && ITEMS[sel];
      body = `<div class="ah-cols"><div><h3>Items</h3><div class="ah-grid">${ids.map(id => `<button class="ah-it ${id === sel ? 'on' : ''}" data-it="${id}" title="${esc(ITEMS[id].name)}"><img src="${icon(id)}" alt=""><small>${count(id)}</small></button>`).join('') || '<p class="muted">Empty. Gather berries, herbs and materials with E.</p>'}</div>
        ${it ? `<div class="ah-desc"><b>${esc(it.name)}</b> ×${count(sel)}<p>${esc(it.desc)}</p>${it.use ? `<button class="ah-btn" data-use="${sel}">Use</button> ${[0, 1, 2].map(k => `<button class="ah-btn alt ${P.quick[k] === sel ? 'on' : ''}" data-slot="${k}" data-id="${sel}">Quick ${k + 5}</button>`).join('')}` : '<p class="muted">Material: used in crafting.</p>'}</div>` : ''}</div>
        <div><h3>Crafting</h3>${RECIPES.map((r, i) => `<div class="ah-rec ${canCraft(r) ? 'ok' : ''}"><img src="${icon(r.out)}" alt=""><div><b>${esc(ITEMS[r.out].name)}</b><span>${Object.entries(r.need).map(([id, n]) => `<em class="${count(id) >= n ? 'have' : 'miss'}">${count(id)}/${n} ${esc(ITEMS[id].name)}</em>`).join(' ')}</span></div><button class="ah-btn" data-craft="${i}" ${canCraft(r) ? '' : 'disabled'}>Craft</button></div>`).join('')}</div></div>`;
    } else if (panel === 'moves') {
      const m = P.mon, sp = DEX.species[P.species];
      const upcoming = sp.learnset.filter(([lv, id]) => lv > P.level && moveSupported(id) && !P.unlocked.includes(id)).slice(0, 4);
      body = `<div class="ah-cols"><div><h3>Equipped <small>(click a slot, then a move to put there)</small></h3>${[0, 1, 2, 3].map(k => { const id = P.equipped[k], mv = id && MOVES[id]; return `<button class="ah-slot ${S.slot === k ? 'on' : ''}" data-eq="${k}" style="--c:${mv ? TYPE_COLORS[mv.type] : '#555'}"><b>${k + 1}</b>${mv ? `<span>${esc(mv.name)}</span><small>${esc(moveLine(mv))}</small>` : '<span class="muted">— empty —</span>'}</button>`; }).join('')}
        <h3>Stats</h3><div class="ah-stats">${[['HP', m.maxhp], ['Attack', m.stats.atk], ['Defense', m.stats.def], ['Sp. Atk', m.stats.spa], ['Sp. Def', m.stats.spd], ['Speed', m.stats.spe], ['Stamina', stMax()], ['Knockouts', P.stats.kos]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>
        <div><h3>Unlocked moves</h3>${P.unlocked.map(id => { const mv = MOVES[id]; return `<button class="ah-mvrow ${P.equipped.includes(id) ? 'eq' : ''}" data-mv="${id}" style="--c:${TYPE_COLORS[mv.type]}"><span>${esc(mv.name)}</span><small>${esc(moveLine(mv))}</small></button>`; }).join('')}
        ${upcoming.length ? `<h3>Coming up</h3>${upcoming.map(([lv, id]) => `<div class="ah-next">Lv ${lv} · ${esc(MOVES[id].name)} <small>${esc(MOVES[id].type)}</small></div>`).join('')}` : ''}</div></div>`;
    } else {
      body = `<div class="ah-cols"><div><h3>Active quests</h3>${P.quests.active.map(a => { const q = questDef(a.id); return `<div class="ah-quest"><b>${questReady(a) ? '✔ ' : ''}${esc(q.title)}</b><p>${esc(q.desc)}${questReady(a) ? ` <em>Report to ${esc(NPCS.ranger.name)}.</em>` : ''}</p><span>${Math.min(a.n, q.goal.n)}/${q.goal.n} · Reward: ${q.reward.xp} XP${Object.entries(q.reward.items || {}).map(([id, n]) => `, ${n}× ${esc(ITEMS[id].name)}`).join('')}</span></div>`; }).join('') || (nextQuest() ? `<p class="muted">${esc(NPCS.ranger.name)} at camp has work for you.</p>` : '<p class="muted">All quests complete!</p>')}
        <h3>Completed</h3><p class="muted">${P.quests.done.map(id => esc(questDef(id).title)).join(' · ') || 'None yet.'}</p></div>
        <div><h3>Places</h3>${OW.world.landmarks.map(l => `<div class="ah-next">${P.discovered.includes(l.id) || l.kind === 'camp' ? `<b>${esc(LANDMARK_NAMES[l.kind])}</b> <small>${esc(OW.BIOMES[l.biome].name)}${BOSSES[l.kind] ? (P.bosses.includes(l.kind) ? ' · guardian defeated' : ' · guarded!') : ''}</small>` : `<span class="muted">??? <small>${esc(OW.BIOMES[l.biome].name)}</small></span>`}</div>`).join('')}
        <h3>People</h3>${people.map(p => `<div class="ah-next">${met(p.id) ? `<b>${esc(p.def.name)}</b> <small>${esc({ quests: 'quests', tips: 'tips', trade: 'trades supplies, campfire', study: 'studies relics' }[p.def.role])}</small>` : '<span class="muted">???</span>'}</div>`).join('')}
        <h3>Biomes</h3>${OW.ORDER.map(b => `<div class="ah-next">${P.biomes.includes(b) ? `<b>${esc(OW.BIOMES[b].name)}</b>` : '<span class="muted">???</span>'} <small>Lv ${BIOME_PLAY[b].lv[0]}-${BIOME_PLAY[b].lv[1]}</small></div>`).join('')}
        <p class="muted">World seed ${P.seed}</p></div></div>`;
    }
    hud.panel.innerHTML = tabs + body;
    const pe = hud.panel;
    pe.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { panel = b.dataset.tab; renderPanel(); });
    pe.querySelector('[data-close]').onclick = closePanel;
    pe.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { S.sel = b.dataset.it; renderPanel(); });
    pe.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { closePanel(); useItem(b.dataset.use); });
    pe.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { const k = +b.dataset.slot; P.quick[k] = P.quick[k] === b.dataset.id ? null : b.dataset.id; S.hudQuick = ''; renderPanel(); });
    pe.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => craft(RECIPES[+b.dataset.craft]));
    pe.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { S.slot = +b.dataset.eq; renderPanel(); });
    pe.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => equip(b.dataset.mv, S.slot ?? P.equipped.length));
  }
  // put move id into slot k (swapping if it is already equipped elsewhere)
  function equip(id, k) {
    if (!P.unlocked.includes(id)) return;
    k = clamp(k, 0, 3);
    const eq = P.equipped.slice(), at = eq.indexOf(id);
    if (at >= 0) { if (k < eq.length) eq[at] = eq[k]; else eq.splice(at, 1); }
    if (k < eq.length) eq[k] = id; else eq.push(id);
    P.equipped = [...new Set(eq.filter(Boolean))].slice(0, 4);
    equipMoves();
    S.slot = null;
    renderPanel();
  }

  // ---------------------------------------------------------------------
  //  The host: what retro.js asks the open world
  // ---------------------------------------------------------------------
  const host = {
    cfg: { range: ADV.range, wildRange: ADV.wildRange, notice: ADV.notice, weakGap: ADV.weakGap, strongGap: ADV.strongGap, detect: ADV.detect, leash: ADV.leash, wander: ADV.wander, light: ADV.light, maxWild: ADV.maxWild, maxAttackers: ADV.maxAttackers },
    input,
    speed(f) {
      if (f.p === 0) return ADV.move.walk * (0.9 + baseSpe(f.mon) / 500) * (P.dashing ? ADV.move.dashMul : 1) * (P.hunger <= 0 ? 0.85 : 1);
      return clamp(100 + baseSpe(f.mon) * 1.1, 120, 235) * (f.flee ? 1.1 : 1);
    },
    // seconds between attacks, from base Speed (fast species attack more often; Alphas and bosses a little faster)
    gap(f) {
      const k = clamp((baseSpe(f.mon) - 20) / 120, 0, 1), [slow, fast] = f.p === 0 ? ADV.gap.player : ADV.gap.wild;
      return (slow + (fast - slow) * k) * (f.tag ? 0.85 : 1);
    },
    canAfford: (f, i) => !!f.mon.moves[i] && P.stamina >= moveCost(f.mon.moves[i]),
    spend(f) {
      const m = f.mon.moves[f.queued];
      if (!m) return true;
      const c = moveCost(m);
      if (P.stamina < c) { wm.text(f, 'TOO TIRED!', 'info'); f.queued = null; return false; }
      P.stamina -= c;
      return true;
    },
    safe: safeAt,
    alert(f) { if (f.tag) AudioFX.SFX.banner(); },
    faint: onFaint,
    gone() {},
    step(dt) {
      if (!wm) return;                                 // the engine runs a frame or two before Retro.world() hands over its controls
      const f = wm.player;
      if (S.respawnAt && wm.time >= S.respawnAt) respawn();
      if (!f || f.state !== 'idle') return;
      if (P.pendingEvo && !f.busy && !wm.engaged) { const to = P.pendingEvo; P.pendingEvo = null; evolve(to); return; }
      survivalStep(dt, f);
      encounterStep(dt);
      // discoveries: landmarks, and each biome the first time
      for (const l of OW.world.landmarks) if (!P.discovered.includes(l.id) && Math.hypot(l.tx * OW.TW + OW.TW / 2 - f.x, l.ty * OW.TW + OW.TW / 2 - f.y) < 420) discover(l);   // in plain sight
      const b = OW.biomeAt(f.x, f.y);
      if (b !== S.lastBiome) {
        S.lastBiome = b;
        if (BIOME_PLAY[b].lv[0] >= P.level + 3) note(`<b class="aw">CAREFUL</b> Wild Pokémon in the ${esc(OW.BIOMES[b].name)} are Lv ${BIOME_PLAY[b].lv[0]}-${BIOME_PLAY[b].lv[1]}; you are Lv ${P.level}.`);
        if (!P.biomes.includes(b)) { P.biomes.push(b); if (P.biomes.length > 1) { wm.big(OW.BIOMES[b].name.toUpperCase(), 'small', 2200); gainXp(ADV.xp.biome * OW.ORDER.indexOf(b), `Entered the ${OW.BIOMES[b].name}`); } }
        else note(`${esc(OW.BIOMES[b].name)} · Lv ${BIOME_PLAY[b].lv[0]}-${BIOME_PLAY[b].lv[1]}`);
      }
      explore(f);
      peopleStep(f);
      near = f.busy ? null : findNear(f);
      if ((S.saveT += dt) > ADV.save.every && !wm.engaged) save();
    },
    frame() {
      if (!P || !hud || !wm) return;
      updateHud();
      if ((S.miniT -= 1) <= 0) { S.miniT = 8; updateMap(wm.player); }
    },
    props,
    // world-space prompt over what E would act on
    draw(ctx, v) {
      if (!wm) return;
      const f = wm.player;
      if (!near || !f || f.state !== 'idle' || panel) return;
      const PXU = 3, y = near.y - (near.kind === 'rest' ? 150 : near.kind === 'npc' ? 118 : near.n && near.n.kind === 'apple' ? 130 : 70);
      ctx.font = `${6 * PXU}px Tiny5, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = near.label.toUpperCase(), w = ctx.measureText(label).width + 13 * PXU, x0 = Math.round(near.x - w / 2);
      ctx.fillStyle = 'rgba(27,21,48,.88)'; ctx.fillRect(x0, y - 6 * PXU, w, 12 * PXU);
      ctx.fillStyle = '#facc15'; ctx.fillRect(x0 + 2 * PXU, y - 4 * PXU, 8 * PXU, 8 * PXU);
      ctx.fillStyle = '#1b1530'; ctx.fillText('E', x0 + 6 * PXU, y + PXU * 0.5);
      ctx.fillStyle = '#ffffff'; ctx.fillText(label, near.x + 5 * PXU, y + PXU * 0.5);
      const bob = Math.sin(wm.time * 6) * PXU;
      ctx.fillStyle = 'rgba(27,21,48,.88)'; ctx.fillRect(Math.round(near.x - PXU * 2), y + 6 * PXU + bob, PXU * 4, PXU * 2);
    }
  };

  // ---------------------------------------------------------------------
  //  Start / leave
  // ---------------------------------------------------------------------
  async function start(run) {
    if (loading) return;
    loading = true;
    try {
      exitMenus();
      const W = OW.generate(run.seed);
      P = { ...run, inv: { ...run.inv }, explored: exploredFrom(run.explored), npc: run.npc || { met: [], gift: false, tip: 0 } };
      P.quick = (P.quick || ['oran', 'apple', 'herb']).concat([null, null, null]).slice(0, 3);
      P.mon = playerMon();
      // where to stand: the saved spot if it is still good ground in this world, else the last rest spot, else camp
      const sp = OW.tileCentre(W.spawn.x, W.spawn.y);
      const good = o => o && o.x != null && OW.reachable(o.x, o.y) && OW.free(o.x, o.y, 14);
      if (!run.sameGen) { P.nodes = {}; P.camps = []; P.rest = null; toast('The world generator changed since this save: you wake up at camp.', 4000); }
      if (P.rest && !good(P.rest)) P.rest = null;
      P.camps = P.camps.filter(good);
      const at = run.sameGen && good({ x: run.x, y: run.y }) ? { x: run.x, y: run.y } : P.rest || { x: sp.x, y: sp.y + 60 };
      // a battle state the engine can read (slot 0 = the player; retro.js adds a slot per wild Pokémon)
      state = { players: [{ team: [P.mon], active: 0, usedMega: true }], multi: { mode: 'wild' }, token: ++battleToken, meta: {}, started: true };
      battleActive = true;
      setPaused(false);
      document.body.classList.add('adventure');
      $('pmExit').textContent = '💾 Save & exit';
      wm = await Retro.world({ host, player: P.mon, x: at.x, y: at.y, zoom: ADV.zoom });
      active = true;
      buildHud();
      placePeople();
      for (const a of P.quests.active) a.told = questReady(a);
      updateRecButtons();
      addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('blur', onBlur); addEventListener('touchstart', onTouchStart, { passive: true });
      document.getElementById('rcv').addEventListener('pointerdown', onPick); addEventListener('resize', orient);
      orient();
      S.lastBiome = null; S.saveT = 0; S.encT = 2; S.respawnAt = 0; S.combatT = -99;
      if (!P.biomes.length) { P.biomes.push('grass'); S.lastBiome = 'grass'; }
      explore(wm.player);
      wm.big(P.time > 0 ? 'WELCOME BACK!' : 'ADVENTURE START!', 'small', 2000);
      if (P.time === 0) note(`Talk to ${NPCS.ranger.name} at camp (<kbd>E</kbd>). Explore, fight wild Pokémon, gather food, rest by the fire to save.`);
      save();
    } catch (e) {
      if (!(e instanceof BattleAbort)) { console.error(e); toast('Could not start the adventure: ' + e.message, 5000); }
      leave(false);
      exitToBuilder();
    } finally { loading = false; }
  }
  // stop the mode (called when leaving to the builder; game.js stops the engine itself)
  function leave(doSave = true) {
    if (active && doSave) save();
    active = false; panel = null; hud = null; near = null;
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur); removeEventListener('touchstart', onTouchStart);
    Object.assign(touch, { mag: 0, run: false, id: null });
    document.getElementById('rcv').removeEventListener('pointerdown', onPick);
    removeEventListener('resize', orient);
    document.body.classList.remove('rotLand');
    if (document.fullscreenElement) { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} document.exitFullscreen().catch(() => {}); }
    keys.clear();
    document.body.classList.remove('adventure');
    $('pmExit').textContent = '✕ Exit to team builder';
    wm = null;
  }
  addEventListener('beforeunload', () => { if (active) save(); });

  // ---------------------------------------------------------------------
  //  The start screen: continue, or pick a starter (and optionally a seed)
  // ---------------------------------------------------------------------
  const menu = document.createElement('div');
  menu.className = 'overlay center hidden'; menu.id = 'advMenu';
  document.body.append(menu);
  function exitMenus() { menu.classList.add('hidden'); $('builder').classList.add('hidden'); $('endScreen').classList.add('hidden'); }
  function openMenu() {
    const sv = validate(readSave());
    const p1 = teams[0][0] && DEX.species[teams[0][0].species];
    const list = [...STARTER_LIST, ...(p1 && p1.minLevel <= ADV.startLevel && !STARTER_LIST.includes(p1.name) ? [p1.name] : [])].filter(n => DEX.species[n]);
    menu.innerHTML = `<div class="adv-box">
      <h1 class="logo">Pokémon Adventure</h1>
      <p class="adv-sub">Explore a wild world with one Pokémon. Fight, level up, learn moves, gather food, survive.</p>
      ${sv ? `<div class="adv-cont"><img src="${DEX.species[sv.species].sprite}" alt=""><div><b>${esc(DEX.species[sv.species].display)}</b> · Lv ${sv.level}<br><small>${sv.discovered.length} places found · ${sv.quests.done.length} quests done · seed ${sv.seed}</small></div><button class="btn" id="advContinue">▶ Continue</button></div>` : ''}
      <h3>${sv ? 'Or start a new adventure' : 'Choose your partner'}</h3>
      <div class="adv-grid">${list.map(n => { const s = DEX.species[n]; return `<button class="adv-st" data-sp="${n}" title="${esc(s.display)}"><img loading="lazy" src="${s.sprite}" alt=""><span>${esc(s.display)}</span><small>${s.types.join(' / ')}</small></button>`; }).join('')}</div>
      <div class="adv-row"><label>World seed <input id="advSeed" type="text" placeholder="random" maxlength="10"></label><label title="On a phone held upright the game turns to landscape"><input type="checkbox" id="advLand" ${prefs.advLandscape === false ? '' : 'checked'}> 📱 Landscape on phones</label><button class="btn alt" id="advBack">Back</button></div>
      ${sv ? '<p class="adv-warn">Starting a new adventure replaces your saved one.</p>' : ''}
    </div>`;
    menu.classList.remove('hidden');
    $('builder').classList.add('hidden');
    menu.querySelector('#advLand').onchange = e => { prefs.advLandscape = e.target.checked; savePrefs(); };
    menu.querySelector('#advBack').onclick = () => { menu.classList.add('hidden'); $('builder').classList.remove('hidden'); };
    if (sv) menu.querySelector('#advContinue').onclick = () => { goLandscape(); start(sv); };
    menu.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => {
      if (sv && !confirm('Start over? Your saved adventure will be replaced.')) return;
      const typed = menu.querySelector('#advSeed').value.trim();
      const seed = typed ? (/^\d+$/.test(typed) ? +typed : [...typed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)) % 4294967295 || 1 : 1 + Math.floor(Math.random() * 2147483646);
      goLandscape();
      start(newRun(b.dataset.sp, seed));
    });
  }

  return {
    open: openMenu, leave, save,
    get active() { return active; },
    get cfg() { return ADV; },
    // test hooks
    _state: () => P && { species: P.species, level: P.level, xp: P.xp, hp: P.mon.hp, maxhp: P.mon.maxhp, stamina: P.stamina, hunger: P.hunger, inv: { ...P.inv }, equipped: P.equipped.slice(), unlocked: P.unlocked.slice(), quests: JSON.parse(JSON.stringify(P.quests)), discovered: P.discovered.slice(), time: P.time, seed: P.seed, near: near && near.label },
    _touch: () => touch, _P: () => P, _wm: () => wm, _people: () => people.map(p => ({ id: p.id, x: Math.round(p.t.x), y: Math.round(p.t.y), biome: OW.biomeAt(p.t.x, p.t.y), reach: OW.reachable(p.t.x, p.t.y) })), _talk: id => talk(people.find(p => p.id === id)), _opt: i => pickOpt(i), _talkText: () => panel === 'talk' ? hud.panel.textContent : null, _validate: validate, _snapshot: () => snapshot(), _gainXp: (n) => gainXp(n, 'test'), _spawn: (b, x, y, o) => spawnWild(b, x, y, o), _use: useItem, _interact: interact, _keys: keys, _craft: i => craft(RECIPES[i]), _equip: equip
  };
})();
