// Downloads Pokémon data, sprites and cries from PokéAPI and writes ../data.js
// Usage:  node tools/build-data.mjs
// Raw API responses are cached in tools/.cache so re-runs are fast.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools', '.cache');
const API = 'https://pokeapi.co/api/v2';

// Evolution-chain starting species. Every member of each chain is included.
const ROOTS = [
  'bulbasaur', 'charmander', 'squirtle', 'pichu', 'pidgey', 'abra', 'machop', 'gastly',
  'magikarp', 'dratini', 'eevee', 'scyther', 'kangaskhan', 'mewtwo', 'mareep', 'houndour',
  'larvitar', 'treecko', 'torchic', 'mudkip', 'ralts', 'aron', 'absol', 'bagon', 'beldum',
  'rayquaza', 'munchlax', 'riolu', 'gible',
  // Gen 1
  'caterpie', 'weedle', 'nidoran-f', 'nidoran-m', 'vulpix', 'igglybuff', 'zubat', 'oddish', 'growlithe', 'poliwag',
  'geodude', 'ponyta', 'slowpoke', 'magnemite', 'onix', 'cubone', 'rhyhorn', 'horsea', 'staryu', 'lapras',
  'aerodactyl', 'articuno', 'zapdos', 'moltres', 'mew', 'porygon', 'tyrogue', 'elekid', 'magby',
  'cleffa', 'bellsprout', 'pinsir', 'meowth', 'psyduck', 'mankey', 'sandshrew', 'diglett', 'tentacool', 'ditto',
  // Gen 2
  'chikorita', 'cyndaquil', 'totodile', 'togepi', 'heracross', 'sneasel', 'skarmory', 'raikou', 'entei', 'suicune',
  'lugia', 'ho-oh', 'phanpy', 'wooper', 'celebi', 'murkrow', 'misdreavus', 'gligar',
  // Gen 3
  'wingull', 'shroomish', 'slakoth', 'trapinch', 'swablu', 'feebas', 'duskull', 'snorunt', 'spheal',
  'kyogre', 'groudon', 'latias', 'latios',
  'mawile', 'meditite', 'electrike', 'shuppet', 'sableye', 'carvanha', 'numel', 'chingling',
  'regirock', 'regice', 'registeel', 'jirachi', 'deoxys',
  // Gen 4
  'turtwig', 'chimchar', 'piplup', 'shinx', 'starly', 'buneary', 'dialga', 'palkia', 'giratina', 'darkrai',
  'snover', 'happiny', 'spiritomb', 'rotom', 'croagunk',
  'uxie', 'mesprit', 'azelf', 'heatran', 'regigigas', 'cresselia', 'shaymin', 'arceus',
  // Gen 5
  'snivy', 'tepig', 'oshawott', 'zorua', 'axew', 'deino', 'litwick',
  'audino', 'drilbur', 'venipede', 'scraggy', 'tynamo', 'golett', 'larvesta', 'sandile', 'pawniard', 'rufflet', 'vullaby',
  'victini', 'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'landorus', 'reshiram', 'zekrom', 'kyurem',
  'keldeo', 'meloetta', 'genesect',
  // Gen 6
  'froakie', 'fennekin', 'chespin', 'honedge', 'goomy',
  'litleo', 'flabebe', 'espurr', 'inkay', 'binacle', 'skrelp', 'hawlucha', 'noibat',
  'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
  // Gen 7
  'rowlet', 'litten', 'popplio', 'rockruff', 'mimikyu',
  'crabrawler', 'wimpod', 'drampa',
  'tapu-koko', 'tapu-lele', 'tapu-bulu', 'tapu-fini', 'cosmog', 'necrozma', 'magearna', 'marshadow', 'zeraora', 'meltan',
  // Gen 8
  'grookey', 'scorbunny', 'sobble', 'dreepy',
  'toxel', 'rookidee', 'impidimp', 'falinks', 'applin', 'duraludon',
  'zacian', 'zamazenta', 'eternatus', 'kubfu', 'calyrex', 'zarude',
  // Gen 9
  'sprigatito', 'fuecoco', 'quaxly', 'tinkatink',
  'charcadet', 'gimmighoul', 'nacli', 'capsakid', 'glimmet', 'tatsugiri', 'frigibax',
  'koraidon', 'miraidon', 'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'ogerpon', 'terapagos', 'pecharunt'
];
const EXCLUDE = new Set(['kleavor']);
// moves taught by TM / move tutor (game.js tmMoves) that no level-up learnset includes
const EXTRA_MOVES = ['solar-beam', 'fly', 'dig', 'hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'dive', 'bounce'];

const MEGA_STONES = {
  'venusaur-mega': 'Venusaurite', 'charizard-mega-x': 'Charizardite X', 'charizard-mega-y': 'Charizardite Y',
  'blastoise-mega': 'Blastoisinite', 'pidgeot-mega': 'Pidgeotite', 'alakazam-mega': 'Alakazite',
  'gengar-mega': 'Gengarite', 'gyarados-mega': 'Gyaradosite', 'kangaskhan-mega': 'Kangaskhanite',
  'scizor-mega': 'Scizorite', 'mewtwo-mega-x': 'Mewtwonite X', 'mewtwo-mega-y': 'Mewtwonite Y',
  'ampharos-mega': 'Ampharosite', 'houndoom-mega': 'Houndoominite', 'tyranitar-mega': 'Tyranitarite',
  'sceptile-mega': 'Sceptilite', 'blaziken-mega': 'Blazikenite', 'swampert-mega': 'Swampertite',
  'gardevoir-mega': 'Gardevoirite', 'gallade-mega': 'Galladite', 'aggron-mega': 'Aggronite',
  'absol-mega': 'Absolite', 'salamence-mega': 'Salamencite', 'metagross-mega': 'Metagrossite',
  'rayquaza-mega': 'Dragon Ascent', 'lucario-mega': 'Lucarionite', 'garchomp-mega': 'Garchompite',
  // Legends: Z-A
  'raichu-mega-x': 'Raichunite X', 'raichu-mega-y': 'Raichunite Y', 'dragonite-mega': 'Dragoninite',
  'absol-mega-z': 'Absolite Z', 'lucario-mega-z': 'Lucarionite Z', 'garchomp-mega-z': 'Garchompite Z',
  'beedrill-mega': 'Beedrillite', 'slowbro-mega': 'Slowbronite', 'steelix-mega': 'Steelixite', 'aerodactyl-mega': 'Aerodactylite',
  'heracross-mega': 'Heracronite', 'altaria-mega': 'Altarianite', 'glalie-mega': 'Glalitite', 'latias-mega': 'Latiasite',
  'latios-mega': 'Latiosite', 'lopunny-mega': 'Lopunnite', 'starmie-mega': 'Starminite', 'skarmory-mega': 'Skarmorite',
  'feraligatr-mega': 'Feraligite', 'staraptor-mega': 'Staraptite', 'darkrai-mega': 'Darkranite', 'meganium-mega': 'Meganiumite',
  'emboar-mega': 'Emboarite', 'froslass-mega': 'Froslassite', 'chandelure-mega': 'Chandelurite', 'greninja-mega': 'Greninjite',
  'delphox-mega': 'Delphoxite', 'chesnaught-mega': 'Chesnaughtite',
  // X/Y, Omega Ruby / Alpha Sapphire
  'pinsir-mega': 'Pinsirite', 'mawile-mega': 'Mawilite', 'medicham-mega': 'Medichamite', 'manectric-mega': 'Manectite',
  'banette-mega': 'Banettite', 'abomasnow-mega': 'Abomasite', 'sableye-mega': 'Sablenite', 'audino-mega': 'Audinite',
  'sharpedo-mega': 'Sharpedonite', 'diancie-mega': 'Diancite', 'camerupt-mega': 'Cameruptite',
  // Legends: Z-A
  'clefable-mega': 'Clefablite', 'victreebel-mega': 'Victreebelite', 'excadrill-mega': 'Excadrite', 'scolipede-mega': 'Scolipite',
  'scrafty-mega': 'Scraftinite', 'eelektross-mega': 'Eelektrossite', 'pyroar-mega': 'Pyroarite', 'floette-mega': 'Floettite',
  'malamar-mega': 'Malamarite', 'barbaracle-mega': 'Barbaracite', 'dragalge-mega': 'Dragalgite', 'hawlucha-mega': 'Hawluchanite',
  'zygarde-mega': 'Zygardite', 'drampa-mega': 'Drampanite', 'falinks-mega': 'Falinksite'
};

// PokéAPI has no effect data yet for many newer moves (meta is null); fill in what the battle engine reads.
// A few variable-power moves get a fixed typical power (noted).
const MOVE_FIX = {
  'make-it-rain': { metaCat: 'damage-raise', statChance: 100 },           // lowers the user's Sp. Atk (stat_changes)
  'armor-cannon': { metaCat: 'damage-raise', statChance: 100 },           // lowers the user's Def / Sp. Def
  'electro-shot': { metaCat: 'damage-raise', statChance: 100 },           // Sp. Atk +1 while it charges
  'mystical-power': { metaCat: 'damage-raise', stats: [['special-attack', 1]], statChance: 100 },
  'bitter-blade': { metaCat: 'damage-heal', drain: 50 },
  'malignant-chain': { metaCat: 'damage-ailment', ailment: 'poison', ailmentChance: 50 },
  'mortal-spin': { metaCat: 'damage-ailment', ailment: 'poison', ailmentChance: 100 },
  'sandsear-storm': { metaCat: 'damage-ailment', ailment: 'burn', ailmentChance: 20 },
  'wildbolt-storm': { metaCat: 'damage-ailment', ailment: 'paralysis', ailmentChance: 20 },
  'bleakwind-storm': { metaCat: 'damage-lower', stats: [['speed', -1]], statChance: 30 },
  'syrup-bomb': { metaCat: 'damage-lower' },
  'ivy-cudgel': { metaCat: 'damage', crit: 1 },
  'collision-course': { metaCat: 'damage' }, 'electro-drift': { metaCat: 'damage' }, 'glaive-rush': { metaCat: 'damage' },
  'kowtow-cleave': { metaCat: 'damage' }, 'tera-starstorm': { metaCat: 'damage' }, 'fickle-beam': { metaCat: 'damage' },
  'salt-cure': { metaCat: 'damage' },
  'rage-fist': { metaCat: 'damage', power: 75 },                           // grows with every hit taken in the games
  'ruination': { metaCat: 'damage', power: null },                         // halves the target's HP (FIXED_DAMAGE in game.js)
  'spicy-extract': { metaCat: 'net-good-stats' },                          // foe: Attack +2, Defense -2
  'lunar-blessing': { metaCat: 'heal', healing: 25, target: 'user' },
  'thousand-arrows': { ailment: 'none', ailmentChance: 0 },
  'crush-grip': { power: 100 }, 'grass-knot': { power: 80 }                // HP / weight based in the games
};

const VERSION_PREF =['scarlet-violet', 'sword-shield', 'ultra-sun-ultra-moon', 'sun-moon',
  'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url) {
  const key = url.replace(API, '').replace(/[^a-z0-9-]+/gi, '_') + '.json';
  const file = path.join(CACHE, key);
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const json = await res.json();
      await fs.writeFile(file, JSON.stringify(json));
      return json;
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(500 * attempt);
    }
  }
}

async function download(url, dest) {
  if (!url) return null;
  try { await fs.access(dest); return true; } catch {}
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch (e) {
      if (attempt === 4) { console.warn('  ! failed', url); return null; }
      await sleep(500 * attempt);
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const english = names => (names.find(n => n.language.name === 'en') || {}).name;
const statsOf = p => ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
  .map(s => p.stats.find(x => x.stat.name === s).base_stat);
const typesOf = p => p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name[0].toUpperCase() + t.type.name.slice(1));
const cap = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

function learnset(p) {
  const byVg = {};
  for (const m of p.moves)
    for (const d of m.version_group_details)
      if (d.move_learn_method.name === 'level-up')
        (byVg[d.version_group.name] ||= []).push([Math.max(1, d.level_learned_at), m.move.name]);
  const vg = VERSION_PREF.find(v => byVg[v]?.length) || Object.keys(byVg)[0];
  const seen = new Map();
  for (const [lvl, mv] of (byVg[vg] || [])) if (!seen.has(mv) || seen.get(mv) > lvl) seen.set(mv, lvl);
  return [...seen].map(([mv, lvl]) => [lvl, mv]).sort((a, b) => a[0] - b[0]);
}

function evoMethod(d, parentMin) {
  if (!d) return { min: 1, text: 'Base form' };
  const t = d.trigger.name;
  if (t === 'level-up' && d.min_level) return { min: d.min_level, text: `Lv ${d.min_level}` };
  if (t === 'level-up') {
    const why = d.min_happiness ? 'Friendship' : d.known_move_type ? `Knows ${cap(d.known_move_type.name)} move` : d.location ? 'Special location' : 'Level up';
    return { min: Math.max(parentMin + 15, 18), text: why + (d.time_of_day ? ` (${d.time_of_day})` : '') };
  }
  if (t === 'use-item') return { min: Math.max(parentMin + 15, 25), text: cap(d.item.name) };
  if (t === 'trade') return { min: Math.max(parentMin + 10, 36), text: 'Trade' };
  return { min: Math.max(parentMin + 15, 25), text: cap(t) };
}

async function main() {
  await fs.mkdir(CACHE, { recursive: true });
  await fs.mkdir(path.join(ROOT, 'sprites'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'cries'), { recursive: true });

  // 1. walk evolution chains
  console.log('Reading evolution chains...');
  const evo = {}; // species -> { from, min, text, to: [] }
  const order = [];
  for (const root of ROOTS) {
    const sp = await getJSON(`${API}/pokemon-species/${root}`);
    const chain = await getJSON(sp.evolution_chain.url);
    (function walk(node, parent, parentMin) {
      const name = node.species.name;
      if (EXCLUDE.has(name)) return;
      const m = parent ? evoMethod(node.evolution_details[0], parentMin) : { min: 1, text: 'Base form' };
      if (!evo[name]) { evo[name] = { from: parent, min: m.min, text: m.text, to: [] }; order.push(name); }
      if (parent) evo[parent].to.push(name);
      node.evolves_to.forEach(n => walk(n, name, m.min));
    })(chain.chain, null, 1);
  }
  console.log(`  ${order.length} species`);

  // 2. species + pokemon details
  console.log('Reading Pokémon...');
  const species = {};
  const allMoves = new Set();
  const sprites = [];
  await pool(order, 8, async name => {
    const sp = await getJSON(`${API}/pokemon-species/${name}`);
    const def = sp.varieties.find(v => v.is_default).pokemon.name;
    const p = await getJSON(`${API}/pokemon/${def}`);
    const ls = learnset(p);
    ls.forEach(([, m]) => allMoves.add(m));
    const display = english(sp.names) || cap(name);
    const entry = {
      id: sp.id, name, display, types: typesOf(p), base: statsOf(p),
      minLevel: evo[name].min, evoFrom: evo[name].from, evoMethod: evo[name].text, evolvesTo: evo[name].to,
      learnset: ls, sprite: null, cry: null, megas: []
    };
    sprites.push([entry, p]);
    for (const v of sp.varieties) {
      const vn = v.pokemon.name;
      if (!vn.includes('-mega')) continue;
      const mp = await getJSON(`${API}/pokemon/${vn}`);
      const suffix = vn.endsWith('-x') ? ' X' : vn.endsWith('-y') ? ' Y' : vn.endsWith('-z') ? ' Z' : '';
      // forms that each have a Mega (meowstic-female-mega, tatsugiri-droopy-mega...) keep the form in the name
      const form = vn.slice(name.length).replace(/-mega(-[xyz])?$/, '').replace(/^-/, '');
      const mega = { name: vn, display: `Mega ${display}${suffix}${form ? ` (${cap(form)})` : ''}`, types: typesOf(mp), base: statsOf(mp),
        stone: MEGA_STONES[vn] || display.replace(/[^A-Za-z]/g, '').replace(/[aeiou]$/i, '') + 'ite' + suffix, sprite: null, cry: null };
      entry.megas.push(mega);
      sprites.push([mega, mp]);
    }
    species[name] = entry;
  });

  // 3. sprites + cries
  console.log(`Downloading ${sprites.length} sprites and cries...`);
  await pool(sprites, 8, async ([entry, p]) => {
    const gif = p.sprites.other?.showdown?.front_default;
    const png = p.sprites.front_default;
    const url = gif || png;
    if (url) {
      const file = `sprites/${entry.name}${gif ? '.gif' : '.png'}`;
      if (await download(url, path.join(ROOT, file))) entry.sprite = file;
    }
    const cry = p.cries?.latest || p.cries?.legacy;
    if (cry && entry.sprite) {
      const file = `cries/${entry.name}.ogg`;
      if (await download(cry, path.join(ROOT, file))) entry.cry = file;
    }
  });
  // a Mega with no artwork yet (e.g. Mega Zygarde) can't be shown, so leave it out
  for (const s of Object.values(species)) s.megas = s.megas.filter(m => m.sprite || console.log(`  skipped ${m.name}: no sprite`));

  // 4. moves
  EXTRA_MOVES.forEach(m => allMoves.add(m));
  console.log(`Reading ${allMoves.size} moves...`);
  const moves = {};
  await pool([...allMoves], 10, async name => {
    const m = await getJSON(`${API}/move/${name}`);
    const meta = m.meta || {};
    moves[name] = {
      name: english(m.names) || cap(name),
      type: cap(m.type.name),
      cat: m.damage_class.name,           // physical | special | status
      power: m.power, acc: m.accuracy, pp: m.pp || 5, priority: m.priority,
      target: m.target.name,
      metaCat: meta.category?.name || null,
      ailment: meta.ailment?.name || 'none',
      ailmentChance: meta.ailment_chance || 0,
      flinch: meta.flinch_chance || 0,
      crit: meta.crit_rate || 0,
      drain: meta.drain || 0,             // + heals user by % of damage, - recoil
      healing: meta.healing || 0,         // % of max HP
      minHits: meta.min_hits || null, maxHits: meta.max_hits || null,
      statChance: meta.stat_chance || 0,
      stats: m.stat_changes.map(s => [s.stat.name, s.change]),
      ...MOVE_FIX[name]
    };
  });

  const out = { order, species, moves };
  const js = '// Generated by tools/build-data.mjs from PokéAPI — do not edit by hand.\nwindow.POKEDEX = ' + JSON.stringify(out) + ';\n';
  await fs.writeFile(path.join(ROOT, 'data.js'), js);
  const megaCount = Object.values(species).reduce((n, s) => n + s.megas.length, 0);
  console.log(`Done: ${order.length} Pokémon, ${megaCount} Mega forms, ${Object.keys(moves).length} moves -> data.js`);
}

main().catch(e => { console.error(e); process.exit(1); });
