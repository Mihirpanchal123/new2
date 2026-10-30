'use strict';
// =====================================================================
//  JOURNEY II - Chapter 6: What the Professor Buried. South out of
//  Brassport the old coast road sinks into the salt marsh and ends in
//  Saltmere, where Professor Okafor has locked herself inside her
//  institute with a twenty-year-old secret. Warden Celeste keeps the
//  Saltmere Light; out on the cape, the Lamplighter keeps the oldest
//  lamp of all - and a Lapras that can carry you across the sea.
//  Side story: The Garden That Remembers (flags m6g.*).
//  Plan: docs/journey2/world.md. Story: docs/journey2/story.md.
// =====================================================================
(() => {
  const { def, grid, L, center, mart, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m6posy: { hat: 'sunhat', hatColor: 0xf4e8c8, hatBand: 0xe878a8, hair: 0xe8e8e8, hairStyle: 'long', top: 0xa8c878, sleeves: 'long', inner: 0xfff4c8, legs: 0x6a8a4a, legStyle: 'skirt', shoes: 0x6a4a2a, bag: null },
    m6tamsin: { hat: null, hair: 0x9a5a2a, hairStyle: 'pigtails', top: 0xf4f4f4, sleeves: 'long', inner: 0xe0a030, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a3a48, bag: 0x8a5a30 }
  });

  // ---- items
  Object.assign(ITEMS, {
    m6pager: { name: 'Ride Pager', pocket: 'key', price: 0, desc: 'The Lamplighter\'s old pager. Face deep water and press A: her Lapras comes and carries you across.' },
    m6seedtin: { name: 'Seed Tin', pocket: 'key', price: 0, desc: 'A rusty tin of flower seeds from the drowned farm on the Sunken Road. "B + P" is scratched into the lid.' },
    m6ribbon: { name: 'Blue Ribbon', pocket: 'key', price: 0, desc: 'A faded first-prize ribbon from the Saltmere Flower Show. Nobody ever came to collect it.' },
    m6bottle: { name: 'Bottle Letter', pocket: 'key', price: 0, desc: 'A message in a green glass bottle, washed up on a sandbar. The cork is sealed with candle wax. It says "POSY" on the outside.' }
  });
  ITEMS['tm:dazzling-gleam'] = ITEMS['tm:dazzling-gleam'] || { name: 'TM Dazzling Gleam', pocket: 'tms', price: 0, tm: 'dazzling-gleam', desc: 'Teaches Dazzling Gleam: a blinding flash of fairy light that hits every foe.' };
  ITEMS['tm:calm-mind'] = ITEMS['tm:calm-mind'] || { name: 'TM Calm Mind', pocket: 'tms', price: 0, tm: 'calm-mind', desc: 'Teaches Calm Mind: quiet focus that raises Sp. Atk and Sp. Def.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m6junoRoad: 'Juno on the Sunken Road: Teo slept two whole days and "looked right through" her. She\'s going home to watch him. She asked me to ask Okafor about the photo - for both of us.',
    m6arrive: 'Saltmere. Professor Okafor came back from Brassport in the middle of the night and locked herself in her institute.',
    okconfess: 'OKAFOR\'S SECRET: twenty years ago she and Cassius opened the Echo. The midnight train fell in with his daughter NELL aboard. Okafor sealed it - and never told him one small heartbeat was still on the other side.',
    m6corvel: 'Agent Corvel came to "escort" Okafor to Mr. Vale. The Company wants her where it can see her.',
    m6ada: 'The Lamplighter of Lastlight lent me her old Lapras. "I have seen the Grey before, child," she said. She wouldn\'t say when.',
    ch7: 'Okafor: the Lantern-folk\'s records lie in the DROWNED ARCHIVE, past the Archway Isles. Surf east from Saltmere along the Sea Lanes. Warden Corin keeps those waters.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // the Sunken Road
    m6lew: { team: [['poliwhirl', 30], ['quagsire', 31], ['golduck', 31]], pay: 20, theme: 'forest', before: 'Shh! The marsh fish only bite when it\'s quiet. ...You stepped on my line. Battle!', lose: 'Reeled in. Me, not the fish.', after: 'This road sank in one night, twenty years back. Grandpa swore he heard a train whistle under the water.' },
    m6fern: { team: [['gloom', 30], ['floette', 31], ['bellossom', 32]], pay: 20, theme: 'forest', before: 'Breathe in! Marsh lilies, sea pinks... and a battle! The best perfume of all.', lose: 'Wilted. Beautifully, but wilted.', after: 'There used to be a flower farm on this road. Bram and Posy\'s. The sea took it, but the flowers keep coming back.' },
    m6keeper: { team: [['golbat', 31], ['lampent', 32]], pay: 30, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'Oh dear. I\'m only checking the lanterns along the road. Must we? ...We must. I\'m so sorry.', lose: 'That was entirely my fault. Thank you for the lesson.', after: 'Director Hask says the lanterns along this road "fill up" faster than anywhere else. I never ask what with.' },
    m6dunstan: { team: [['graveler', 31], ['onix', 31], ['rhyhorn', 32]], pay: 22, theme: 'forest', before: 'Old roads are a hiker\'s best friend. Sunken ones? Even better. Rocks, go!', lose: 'Sunk like the road...', after: 'Saltmere\'s just south. Smell that? Salt, lamp oil, and lemon cake.' },
    m6ollie: { team: [['luxio', 31], ['staravia', 32]], pay: 20, theme: 'forest', before: 'I\'m camping out here till I see the ghost train! Battle me while I wait!', lose: 'No train AND no win...', after: 'They say the train went into the sea fog and never came out. I\'ll see it one day. Probably at midnight. Everything spooky is at midnight.' },
    // Lamplighter's Cape
    m6rook: { team: [['pelipper', 32], ['sealeo', 33]], pay: 24, theme: 'beach', before: 'Ahoy! Nobody walks the cape without a reason. What\'s yours? ...Tell me after the battle!', lose: 'Sunk without a trace!', after: 'The old lady at the end of the cape never takes a Lumen lantern. Twelve times they\'ve offered. Twelve times, the door.' },
    m6isla: { team: [['swablu', 31], ['staravia', 32], ['altaria', 33]], pay: 24, theme: 'beach', before: 'The wind on the cape is perfect for flying! And for battling!', lose: 'Blown away...', after: 'At night, the Lastlight\'s beam is blue, not gold. Nobody knows why. Nobody asks the Lamplighter.' },
    // Saltmere Light: Warden Celeste's gym
    m6g1: { team: [['jigglypuff', 32], ['clefairy', 32], ['togepi', 33]], pay: 24, theme: 'stadium', before: 'Welcome to the Garden of the Light! Mind the hedges - and mind my darlings!', lose: 'Oh, my poor darlings...', after: 'Celeste\'s Pokémon are tough as old rope under all that sparkle. Steel and Poison moves cut through Fairy types.' },
    m6g2: { team: [['floette', 33], ['kirlia', 34]], pay: 24, theme: 'stadium', before: 'Every flower in this hall was planted by the Warden herself. Don\'t you dare trample one!', lose: 'Trampled. Me, I mean.', after: 'The Warden lost a day, you know. Her wedding day. She has the ring and the photos, and nothing in her heart to go with them.' },
    m6g3: { team: [['tinkatink', 33], ['wigglytuff', 34]], pay: 24, theme: 'stadium', before: 'Last hedge before the lamp room! My Tinkatink has been polishing its hammer all morning!', lose: 'Bonk. That was us.', after: 'Up you go. Celeste\'s Florges is the last thing standing between you and the Pearl Badge.' },
    celeste: { team: [['mawile', 34], ['togetic', 35], ['clefable', 35], ['tinkatuff', 36], ['florges', 37]], pay: 100, theme: 'stadium', gym: 5, onWin: 'm6celesteWin', look: 'celeste', name: 'Warden Celeste',
      before: 'Grace is a kind of strength, darling. Let me show you how much of it I have!', lose: 'Oh, well done. Truly. That was the loveliest defeat of my life.' }
  });

  // =====================================================================
  //  The Sunken Road - the old coast road south from Brassport, half
  //  swallowed by the salt marsh twenty years ago (in a single night)
  // =====================================================================
  {
    const B = grid(24, 40, '.').border('T', { n: [6, 8], s: [14, 16] });
    B.fill(1, 1, 2, 38, 'T').fill(21, 1, 22, 38, 'T');
    B.fill(3, 1, 5, 4, 'T').fill(9, 1, 20, 4, 'T');                         // the cutting at the top of the road
    // the old road: south, east, south, back west, south, east and south again to Saltmere
    B.fill(6, 0, 8, 9, ',').fill(6, 8, 19, 9, ',').fill(18, 8, 19, 21, ',').fill(5, 20, 19, 21, ',').fill(5, 20, 6, 31, ',').fill(5, 30, 16, 31, ',').fill(14, 30, 16, 39, ',');
    // the marsh that ate the middle of the road; an old boardwalk still crosses it
    B.fill(3, 11, 15, 17, '~').fill(9, 10, 9, 19, 'b').fill(4, 13, 6, 15, ':');
    // tall grass and reeds
    B.fill(3, 5, 5, 9, ';').fill(10, 5, 20, 7, ';').fill(16, 10, 17, 19, ';').fill(3, 23, 4, 29, ';').fill(8, 33, 12, 38, ';').fill(17, 26, 20, 37, ';').fill(20, 10, 20, 19, ';');
    B.fill(17, 32, 20, 32, 'v');                                             // a ledge down through the south meadow
    // Bram and Posy's drowned flower farm: a broken fence and the last of the sea pinks
    B.fill(7, 23, 13, 28, 'f').fill(8, 24, 12, 27, ':').put(10, 23, ',').fill(8, 27, 9, 27, '*').fill(12, 24, 12, 25, '*');
    B.put(14, 24, 'r').put(15, 26, 'r').put(3, 32, 'r').put(20, 23, 'B').put(13, 33, 'B').fill(17, 23, 18, 24, '*');
    def({ id: 'sunkenroad', name: 'Sunken Road', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 29, max: 33, table: [['gloom', 14], ['staravia', 12], ['flabebe', 12], ['wingull', 10], ['quagsire', 10], ['croagunk', 10], ['flaaffy', 8], ['jigglypuff', 8], ['slowpoke', 8], ['nidorina', 5], ['floette', 3]] },
        water: { rate: 0.08, min: 28, max: 33, table: [['psyduck', 24], ['magikarp', 20], ['quagsire', 18], ['poliwhirl', 16], ['slowpoke', 10], ['golduck', 8], ['feebas', 4]] } },
      edges: { n: { to: 'brassport_s', dx: 24 }, s: { to: 'saltmere', dx: 0 } },
      zones: [{ x: 6, y: 3, w: 3, h: 1, event: 'm6junoRoad' }],
      signs: [{ x: 9, y: 5, text: 'SUNKEN ROAD\nBrassport - Saltmere\n(Mind the marsh. The marsh minds no one.)' }, { x: 12, y: 22, text: 'BRAM & POSY\'S FLOWER FARM\nSea pinks - marsh lilies - "the best on the coast"\nThe rest of the sign has rotted away.' },
        { x: 17, y: 38, text: 'SALTMERE - just ahead!\nSalt, sea and starlight.' }],
      props: [{ k: 'lumenlamp', x: 5, y: 8 }, { k: 'lumenlamp', x: 17, y: 22 }, { k: 'lumenlamp', x: 13, y: 29 }, { k: 'lumenlamp', x: 17, y: 34 }],
      items: [{ x: 5, y: 14, item: 'rarecandy', n: 1 }, { x: 11, y: 25, item: 'm6seedtin', n: 1 }, { x: 20, y: 5, item: 'superpotion', n: 1 }, { x: 10, y: 36, item: 'great', n: 3 },
        { x: 3, y: 35, item: 'revive', n: 1, hidden: true }, { x: 20, y: 38, item: 'ultra', n: 1, hidden: true }, { x: 16, y: 12, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'juno', x: 7, y: 5, dir: 'up', look: L.juno, name: 'Juno', talk: 'm6junoRoad', show: ['!m6junoRoad'] },
        { id: 'lew', x: 9, y: 14, dir: 'down', look: L.fisher, name: 'Fisherman Lew', trainer: 'm6lew' },
        { id: 'fern', x: 13, y: 6, dir: 'down', look: L.aroma, name: 'Aroma Lady Fern', trainer: 'm6fern' },
        { id: 'keeper', x: 19, y: 13, dir: 'left', look: L.keeper, name: 'Lightkeeper', trainer: 'm6keeper' },
        { id: 'dunstan', x: 6, y: 26, dir: 'right', look: L.hiker, name: 'Hiker Dunstan', trainer: 'm6dunstan' },
        { id: 'ollie', x: 19, y: 30, dir: 'left', look: L.camper, name: 'Camper Ollie', trainer: 'm6ollie' },
        { id: 'marsh', x: 15, y: 22, dir: 'down', look: L.oldman, name: 'Marsh-walker Abe', talk: 'm6abe' }] });
  }

  // =====================================================================
  //  Saltmere - a salt-and-starlight town on the sea. Okafor's institute,
  //  the Saltmere Light (Warden Celeste), Posy's garden, the pier east to
  //  the Sea Lanes; the cape path south to the Lastlight
  // =====================================================================
  {
    const B = grid(30, 28, '.').border('T', { n: [14, 16], e: [10, 16], s: [2, 4] });
    B.fill(13, 1, 13, 3, 'T').fill(17, 1, 17, 3, 'T');                       // the town gate
    B.fill(21, 1, 28, 26, '~').fill(29, 10, 29, 16, '~');                     // the sea (east: the Sea Lanes)
    B.fill(19, 1, 20, 26, ':').fill(18, 1, 24, 10, ':');                      // the beach and the lighthouse headland
    B.fill(14, 0, 16, 13, 'u').fill(1, 7, 18, 8, 'u').fill(1, 12, 20, 13, 'u').fill(2, 14, 4, 27, ',');
    B.fill(21, 12, 25, 13, 'b');                                              // the pier
    B.fill(25, 20, 27, 22, ':');                                              // a sandbar out in the bay
    B.fill(5, 9, 12, 11, '*').fill(1, 25, 1, 26, '*');
    // Posy's garden: three beds, bare until she remembers
    B.fill(13, 20, 18, 24, 'f').fill(14, 21, 17, 23, ':').put(15, 20, ',');
    const base = B.rows();
    def({ id: 'saltmere', name: 'Saltmere', kind: 'town', rows: base, music: 'town', battle: 'beach', fly: { x: 15, y: 10 }, center: { map: 'center_saltmere' },
      dock: { x: 21, y: 13, dir: 'left' },
      encounters: { water: { rate: 0.08, min: 30, max: 34, table: [['tentacool', 26], ['wingull', 20], ['magikarp', 16], ['horsea', 12], ['staryu', 10], ['psyduck', 10], ['pelipper', 4], ['lapras', 2]] } },
      buildings: [{ b: 'center', x: 2, y: 2, to: 'center_saltmere' }, { b: 'mart', x: 8, y: 3, to: 'mart_saltmere' },
        { b: 'lab', x: 5, y: 15, to: 'okinst', needs: ['m6door'], locked: 'm6instLocked' },
        { b: 'house3', x: 13, y: 15, to: 'saltposy' }, { b: 'house', x: 6, y: 22, to: 'salthouse', variant: 4 },
        { b: 'lighthouse', x: 20, y: 2, to: 'saltgym', variant: 4 }],
      signs: [{ x: 12, y: 1, text: 'SALTMERE\nSalt, sea and starlight.' }, { x: 18, y: 11, text: 'SALTMERE LIGHT\nWarden: CELESTE\nThe fifth of the Eight Lights of Meridia.' },
        { x: 12, y: 19, text: 'OKAFOR INSTITUTE OF TEMPORAL ECOLOGY\n"Every moment leaves a footprint."' }, { x: 1, y: 14, text: 'SOUTH: LAMPLIGHTER\'S CAPE\nThe Lastlight. (No lanterns, thank you.)' },
        { x: 20, y: 14, text: 'EAST: THE SEA LANES\nArchway Isles - Gullwing Isle\nNo ferry. Ask a Lapras.' }],
      props: [{ k: 'lumenlamp', x: 1, y: 6 }, { k: 'lumenlamp', x: 12, y: 14 }, { k: 'lumenlamp', x: 18, y: 6 }, { k: 'lamp', x: 13, y: 9 }, { k: 'lamp', x: 17, y: 9 }, { k: 'lamp', x: 13, y: 11 }, { k: 'lamp', x: 17, y: 11 },
        { k: 'mailbox', x: 18, y: 17 }, { k: 'mailbox', x: 11, y: 21 }],
      edges: { n: { to: 'sunkenroad', dx: 0 }, e: { to: 'sealane1', dy: 0 }, s: { to: 'lastcape', dx: 6 } },
      zones: [{ x: 14, y: 2, w: 3, h: 1, event: 'm6arrive' }],
      items: [{ x: 26, y: 21, item: 'm6bottle', n: 1 }, { x: 1, y: 22, item: 'superpotion', n: 1 }, { x: 19, y: 25, item: 'revive', n: 1, hidden: true }, { x: 23, y: 1, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'tamsin', x: 9, y: 20, dir: 'left', look: L.m6tamsin, name: 'Aide Tamsin', talk: 'm6tamsin', show: ['!ride.surf'] },
        { id: 'posy', x: 16, y: 22, dir: 'left', look: L.m6posy, name: 'Grandma Posy', talk: 'm6posy' },
        { id: 'okpier', x: 23, y: 12, dir: 'left', look: L.okafor, name: 'Prof. Okafor', talk: 'm6sendoff', show: ['ride.surf', '!ch7'] },
        { id: 'harlan', x: 25, y: 13, dir: 'right', look: L.fisher, name: 'Old Harlan', talk: 'm6harlan' },
        { id: 'lk', x: 11, y: 8, dir: 'down', look: L.keeperf, name: 'Lightkeeper', talk: 'm6lanternKeeper' },
        { id: 'sailor', x: 19, y: 16, dir: 'right', look: L.sailor, name: 'Sailor Bex', talk: 'm6sailor' },
        { id: 'guide', x: 20, y: 10, dir: 'up', look: L.man, name: 'Gym Guide', talk: 'm6gymGuide' },
        { id: 'lady', x: 3, y: 10, dir: 'down', look: L.woman, wander: 1, talk: 'm6saltLady' },
        { id: 'kid', x: 9, y: 10, dir: 'down', look: L.lass, name: 'Mina', wander: 2, talk: 'm6saltKid' }] });
    // the garden blooms as Posy remembers: one bed per memory, and the whole plot when she remembers Bram (the ground is
    // painted when the map loads, so the story re-enters the map after each memory)
    const cache = {};
    const bloom = n => base.map((r, y) => {
      if (y >= 21 && y <= 20 + Math.min(3, n)) return r.slice(0, 14) + '****' + r.slice(18);
      if (n >= 4 && y === 19) return r.slice(0, 13) + '**' + r[15] + '**' + r.slice(18);   // and around her door
      return r;
    });
    Object.defineProperty(M.saltmere, 'rows', { configurable: true, enumerable: true, get() {
      let f = {};
      try { f = Journey._G().flags || {}; } catch (e) {}
      const n = ['m6g.seedsBack', 'm6g.ribbonBack', 'm6g.bottleBack'].filter(k => f[k]).length + (f['m6g.done'] ? 1 : 0);
      return cache[n] || (cache[n] = bloom(n));
    } });
  }
  center('center_saltmere', 'saltmere', { chapter: 6 });
  mart('mart_saltmere', 'saltmere', ['poke', 'great', 'ultra', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'iceheal', 'fullheal', 'revive', 'repel'], { chapter: 6 });
  M.mart_saltmere.name = 'Saltmere Mart';

  // ---- the Okafor Institute: the lab downstairs, the records room upstairs
  // (the door mat sits in a narrow porch: after the confession Agent Corvel stands in it, and nobody leaves without
  // getting past him)
  def({ id: 'okinst', name: 'Okafor Institute', kind: 'inside', outside: 'saltmere', rows: grid(15, 11, '+').border('#').put(7, 10, 'm').put(13, 1, '<').fill(5, 4, 9, 6, 'R').rows(),
    arrive: { x: 7, y: 9 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm6machine' }, { k: 'shelf', x: 3, y: 1, talk: 'm6shelf' }, { k: 'shelf', x: 5, y: 1, talk: 'm6shelf' }, { k: 'pc', x: 8, y: 1, talk: 'm6okpc' },
      { k: 'shelf', x: 10, y: 1, talk: 'm6shelf' }, { k: 'desk', x: 1, y: 5, talk: 'm6desk' }, { k: 'table', x: 11, y: 5 }, { k: 'chair', x: 13, y: 5 }, { k: 'plant', x: 1, y: 9 }, { k: 'plant', x: 13, y: 9 }, { k: 'boxes', x: 12, y: 3 }],
    warps: [{ x: 13, y: 1, to: 'okinst2', tx: 9, ty: 2, dir: 'down' }],
    npcs: [{ id: 'okafor', x: 7, y: 3, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm6okafor', show: ['!ride.surf'] },
      { id: 'corvel', x: 7, y: 9, dir: 'up', look: L.agent, name: 'Agent Corvel', talk: 'm6corvel', watch: 'm6corvel', sight: 5, show: ['okconfess', '!m6corvel'] },
      { id: 'lk', x: 6, y: 9, dir: 'right', look: L.keeper, name: 'Lightkeeper', talk: 'm6corvel', show: ['okconfess', '!m6corvel'] }] });
  def({ id: 'okinst2', name: 'Okafor Institute - Records', kind: 'inside', rows: grid(11, 8, '_').border('#').put(9, 1, '>').fill(3, 4, 6, 5, 'R').rows(),
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm6log1' }, { k: 'shelf', x: 3, y: 1, talk: 'm6log2' }, { k: 'shelf', x: 5, y: 1, talk: 'm6log3' }, { k: 'desk', x: 1, y: 4, talk: 'm6log4' },
      { k: 'machine', x: 7, y: 4, talk: 'm6lens' }, { k: 'boxes', x: 8, y: 6 }, { k: 'boxes', x: 9, y: 6 }, { k: 'plant', x: 1, y: 6 }],
    warps: [{ x: 9, y: 1, to: 'okinst', tx: 13, ty: 2, dir: 'down' }],
    items: [{ x: 5, y: 6, item: 'tm:calm-mind', n: 1 }, { x: 7, y: 2, item: 'rarecandy', n: 1, hidden: true }] });
  // ---- Posy's cottage and the flower-show judge's house
  def({ id: 'saltposy', name: 'Posy\'s cottage', kind: 'inside', outside: 'saltmere', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm6posyLantern' }, { k: 'stove', x: 4, y: 1 }, { k: 'shelf', x: 5, y: 1, talk: 'm6posyShelf' }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 1, y: 4 }, { k: 'plant', x: 7, y: 5 }],
    npcs: [{ id: 'arlo', x: 6, y: 3, dir: 'left', look: L.kid, name: 'Arlo', talk: 'm6arlo' }] });
  def({ id: 'salthouse', name: 'Fenn\'s house', kind: 'inside', outside: 'saltmere', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm6fennShelf' }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'fenn', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Judge Fenn', talk: 'm6fenn' }, { id: 'wife', x: 1, y: 5, dir: 'right', look: L.oldlady, name: 'Hester', talk: 'm6hester' }] });

  // ---- the Saltmere Light: Warden Celeste's gym (a garden of hedges; the lamp room is the arena)
  {
    const B = grid(15, 14, 'g').border('#').fill(1, 13, 13, 13, 'g').put(7, 13, 'm').put(7, 1, '<');
    B.fill(1, 3, 11, 3, 'B').fill(3, 6, 13, 6, 'B').fill(1, 9, 11, 9, 'B');
    B.fill(1, 1, 2, 2, '*').fill(12, 1, 13, 2, '*').fill(4, 4, 9, 5, '*').fill(4, 7, 10, 8, '*').fill(3, 10, 8, 11, '*').fill(2, 12, 3, 12, '~').fill(11, 12, 12, 12, '~');
    def({ id: 'saltgym', name: 'Saltmere Light', kind: 'inside', gym: true, outside: 'saltmere', battle: 'stadium', music: 'gym', rows: B.rows(), arrive: { x: 7, y: 12 },
      furniture: [{ k: 'statue', x: 5, y: 12, talk: 'm6gymStatue' }, { k: 'statue', x: 9, y: 12, talk: 'm6gymStatue' }],
      warps: [{ x: 7, y: 1, to: 'saltgym2', tx: 5, ty: 6, dir: 'up' }],
      npcs: [{ id: 'g1', x: 10, y: 10, dir: 'left', look: L.lass, name: 'Lass Dottie', trainer: 'm6g1' },
        { id: 'g2', x: 2, y: 7, dir: 'right', look: L.aroma, name: 'Gardener Primrose', trainer: 'm6g2' },
        { id: 'g3', x: 12, y: 4, dir: 'left', look: L.picnicker, name: 'Tinker Wynn', trainer: 'm6g3' }] });
    def({ id: 'saltgym2', name: 'Saltmere Light - Lamp Room', kind: 'inside', gym: true, battle: 'stadium', music: 'gym',
      rows: grid(11, 9, 'g').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').fill(1, 6, 2, 6, '*').fill(8, 6, 9, 6, '*').rows(),
      furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm6saltlamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }],
      warps: [{ x: 5, y: 7, to: 'saltgym', tx: 7, ty: 2, dir: 'down' }],
      npcs: [{ id: 'celeste', x: 5, y: 2, dir: 'down', look: L.celeste, name: 'Warden Celeste', trainer: 'celeste' }] });
  }

  // =====================================================================
  //  Lamplighter's Cape and the Lastlight - the oldest lamp on the coast,
  //  on no map, kept by an old woman who will not take a Lumen lantern
  // =====================================================================
  {
    const B = grid(20, 24, '~').border('r', { n: [8, 10] });
    B.fill(5, 1, 13, 22, '.').fill(8, 0, 10, 0, ',');
    B.fill(5, 3, 5, 7, 'r').fill(13, 9, 13, 14, 'r').put(5, 18, 'r').put(13, 4, 'r');
    B.fill(8, 0, 10, 3, ',').fill(8, 3, 9, 14, ',').fill(9, 14, 12, 14, ',').fill(12, 14, 12, 22, ',').fill(9, 22, 12, 22, ',');
    B.fill(6, 5, 7, 11, ';').fill(10, 7, 12, 12, ';').fill(6, 16, 6, 21, '*');
    B.fill(2, 10, 3, 11, ':').put(16, 6, 'r').put(15, 17, 'r').put(17, 12, 'r');
    def({ id: 'lastcape', name: 'Lamplighter\'s Cape', kind: 'route', rows: B.rows(), music: 'route', battle: 'beach',
      encounters: { tall: { rate: 0.12, min: 30, max: 33, table: [['wingull', 20], ['swablu', 16], ['flabebe', 14], ['pelipper', 10], ['rookidee', 10], ['jigglypuff', 10], ['floette', 6], ['altaria', 4], ['drampa', 2]] },
        water: { rate: 0.08, min: 30, max: 34, table: [['tentacool', 30], ['wingull', 20], ['horsea', 16], ['staryu', 14], ['tentacruel', 8], ['seadra', 6], ['lapras', 2]] } },
      edges: { n: { to: 'saltmere', dx: -6 } },
      buildings: [{ b: 'lighthouse', x: 7, y: 15, to: 'lastlight', variant: 7 }],
      signs: [{ x: 10, y: 4, text: 'LAMPLIGHTER\'S CAPE\nTHE LASTLIGHT - the light that never went out.\nNo salesmen. No lanterns. No exceptions.' }],
      items: [{ x: 2, y: 10, item: 'ultra', n: 2 }, { x: 12, y: 8, item: 'superpotion', n: 1 }, { x: 6, y: 22, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'rook', x: 10, y: 5, dir: 'left', look: L.sailor, name: 'Sailor Rook', trainer: 'm6rook' },
        { id: 'isla', x: 8, y: 12, dir: 'down', look: L.picnicker, name: 'Bird Keeper Isla', trainer: 'm6isla' }] });
  }
  def({ id: 'lastlight', name: 'The Lastlight', kind: 'inside', outside: 'lastcape', rows: grid(11, 12, '_').border('#').fill(1, 11, 9, 11, '_').put(5, 11, 'm').put(9, 1, '<').fill(3, 6, 7, 8, 'R').rows(),
    arrive: { x: 5, y: 10 },
    furniture: [{ k: 'stove', x: 1, y: 1 }, { k: 'fridge', x: 2, y: 1 }, { k: 'shelf', x: 4, y: 1, talk: 'm6adaShelf' }, { k: 'shelf', x: 6, y: 1, talk: 'm6adaPhotos' },
      { k: 'table', x: 2, y: 4 }, { k: 'chair', x: 1, y: 4 }, { k: 'bed', x: 9, y: 8 }, { k: 'plant', x: 1, y: 10 }, { k: 'plant', x: 9, y: 10 }, { k: 'sofa', x: 1, y: 7 }],
    warps: [{ x: 9, y: 1, to: 'lastlight2', tx: 5, ty: 6, dir: 'up' }],
    npcs: [{ id: 'ada', x: 6, y: 4, dir: 'down', look: L.ada, name: 'The Lamplighter', talk: 'm6ada' }] });
  def({ id: 'lastlight2', name: 'The Lastlight - Lamp Room', kind: 'inside', rows: grid(11, 9, '+').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').rows(),
    furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm6lastlamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }, { k: 'machine', x: 1, y: 5, talk: 'm6scope' }],
    warps: [{ x: 5, y: 7, to: 'lastlight', tx: 9, ty: 2, dir: 'down' }],
    items: [{ x: 9, y: 6, item: 'moonstone', n: 1, hidden: true }] });

  MMaps.SPOTS.celeste = { map: 'saltmere', x: 22, y: 10, dir: 'down' };
  for (const id of ['sunkenroad', 'saltmere', 'center_saltmere', 'mart_saltmere', 'okinst', 'okinst2', 'saltposy', 'salthouse', 'saltgym', 'saltgym2', 'lastcape', 'lastlight', 'lastlight2']) M[id].chapter = 6;

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- the Sunken Road: Juno, heading home
  on('m6junoRoad', { needs: ['!m6junoRoad'], sets: ['m6junoRoad'] }, async J => {
    if (J.flag('m6junoRoad')) return;
    await J.emote('juno', '!');
    await J.say(['{NAME}! Wait up - I\'ve been running since Brassport.', 'You saw that photo too. At the Gala. Cassius Vale and Professor Okafor, standing in front of a wrecked train.'], 'juno');
    await J.say(['Our Okafor. The one who gave us our partners. Who patched my knee when I fell off the pier.', 'If she knew about all this the whole time...'], 'juno');
    await J.say(['...Teo slept for two whole days, {NAME}. Mom says he\'s just tired.', 'This morning he looked right through me. Like I was a window.'], 'juno');
    await J.say(['I\'m going home to sit with him. Somebody has to.', 'Okafor came down this road last night - a Lightkeeper told me she was "in a terrible hurry, the poor thing". She\'s in Saltmere.', 'Ask her. Ask her for both of us.'], 'juno');
    await J.give('superpotion', 3);
    await J.say(['And {NAME}... if somebody offered me a way to fix Teo - any way at all -', '...Forget it. Forget I said anything. Go!'], 'juno');
    await J.fade(() => J.hideNpc('juno'));
    J.set('m6junoRoad');
  });
  on('m6abe', {}, (J, n) => J.say(J.flag('ch7') ? ['The marsh has been quieter since you came through. Or maybe I\'ve been listening less.', 'Either way, I sleep better.'] : ['This road sank in a single night, twenty years ago. Farm, fences, the old mile-post, all of it.', 'Same night the midnight train vanished up on the Old Rail Line. Folk said the two were connected.', 'I say the sea was hungry. But on still nights, out on the boardwalk... I hear a whistle.'], n));

  // ---- Saltmere
  on('m6arrive', { needs: ['!m6arrive'], sets: ['m6arrive'] }, async J => {
    await J.say(['Saltmere: white houses, blue doors, and a lighthouse on the headland with a pink band around its waist.', 'A Lumen lantern glows on almost every porch.']);
    await J.say(['Oh! A trainer - are you here for the Professor?', 'She came back from Brassport at two in the morning, white as a sheet, and locked herself in the Institute.', 'I\'m her aide, Tamsin. She won\'t open the door. Not even for me. I\'m by the Institute, if you want to try.'], { name: 'Aide Tamsin', look: 'm6tamsin' });
    J.set('m6arrive');
  });
  on('m6tamsin', { needs: ['m6arrive'], sets: ['m6door'] }, async (J, n) => {
    if (J.flag('okconfess')) return J.say(['She told you, didn\'t she. I could hear her crying through the floor.', 'I\'ve worked for her six years. She never once cried. Thank you for staying with her.'], n);
    if (J.flag('m6door')) return J.say('The door\'s open. Go on in - she\'s waiting for you.', n);
    await J.say(['She won\'t answer. I\'ve knocked, I\'ve called, I\'ve slid three cups of tea under the door.', 'The tea came back. Untouched.'], n);
    if (await J.ask('Slide the photo from the Gala under the door?', ['Slide it under', 'Not yet'], n) !== 0) return J.say('If you think of anything that might reach her... I\'ll be here.', n);
    await J.say(['You crouch down and slide the old photograph under the door: two young scientists in front of a wrecked train.', '...', 'Footsteps. A long silence. Then the lock turns.']);
    await J.say('Come in, {NAME}. Just you.', { name: 'Prof. Okafor', look: 'okafor' });
    J.set('m6door'); J.refresh();
  });
  on('m6instLocked', {}, J => J.say(J.flag('m6arrive') ? 'The Institute door is locked. A card in the window says CLOSED in the Professor\'s handwriting, pressed hard enough to tear the paper.' : 'The Institute door is locked.'));

  // ---- Okafor's confession
  on('m6okafor', { needs: ['m6door'], sets: ['okconfess'] }, async (J, n) => {
    if (J.flag('okconfess')) {
      if (!J.flag('m6corvel')) return J.say('Someone is at the door. I heard boots on the step. ...Go and see, {NAME}. Please.', n);
      if (!J.flag('badge.pearl')) return J.say(['The Lamplighter will want to see that you can look after yourself. Celeste\'s Light is on the headland.', 'Win the Pearl Badge, then take the cape path south of town.'], n);
      return J.say(['Lastlight is at the end of the cape, south of town. Tell her... tell her Amara sent you.', 'No. Don\'t tell her anything. She\'ll know.'], n);
    }
    await J.say(['You found the photo. Of course you did. You always were the kind of child who opens every drawer.', 'Sit down, {NAME}. I\'ve been rehearsing this for twenty years, and I still don\'t know how it starts.'], n);
    await J.say(['Twenty years ago, Cassius and I were partners. Two young scientists with one stubborn idea.', 'Some Pokémon see time the way we see a road - behind, ahead. We wanted to see it too.'], n);
    await J.say(['We built a lens out of a lighthouse crystal. The very first thing the Lumen Company ever "borrowed", though it had no name then.', 'One night we pointed it at the Old Rail Line, at midnight... and something on the other side looked back.'], n);
    await J.say(['We opened the Echo, {NAME}. Only a crack. A grey, silent crack in the world.', 'And at that exact moment, the midnight train came round the bend.'], n);
    await J.say(['Cassius\'s daughter was on that train. Nell. Eight years old, with a Litwick she never put down.', 'She was coming to watch her father change the world.'], n);
    await J.say(['The train went into the Grey. And the crack began to widen - over the rails, over the marsh, toward the coast.', 'It would have swallowed everything. So I turned the lens around... and I closed it.'], n);
    await J.say(['...With the train inside.', 'That was the choice. The coast, or the train. I chose the coast. I would choose it again. I tell myself that every day.'], n);
    await J.say(['But here is the part I have never said aloud.', 'When the Echo closed, my instruments still showed one heartbeat on the other side. Small. Steady. A child\'s.'], n);
    await J.say(['I told Cassius that everyone was lost. I told him there was nothing anyone could have done.', 'I told myself it was kinder. That if he knew, he would tear the world open to reach her.'], n);
    await J.say(['He grieved. And then he stopped grieving and started building. The Company. The lanterns. Now this "Great Lantern".', 'If I had told him the truth... perhaps none of this would have happened. Or perhaps all of it would have happened sooner. I have never known which.'], n);
    await J.say('You\'ve... seen her? A girl in grey, in the Echo, with a Litwick?', n);
    await J.say(['She hasn\'t aged a day. Has she.', 'Of course not. The Echo keeps everything exactly as it was. Nothing lost. Nothing ever changing.', 'That\'s what he wants for all of us, {NAME}. I\'m sure of it now.'], n);
    J.set('okconfess');
    await J.say(['The Lantern-folk tried something like this once, long ago. They wrote everything down - in a great library that the sea took. The Drowned Archive.', 'It lies beyond the Archway Isles, east across the Sea Lanes. If Cassius\'s plan has a weakness, it will be in there.'], n);
    await J.say(['To cross the sea you need a ride. There\'s one Pokémon on this coast that could carry you: the Lamplighter\'s Lapras, out at the Lastlight.', 'She\'ll want to see that you can stand on your own feet first. Win Celeste\'s badge. Then go to the cape.'], n);
    await J.say('(You write it all in the notebook. Your hand is shaking a little.)');
  });
  on('m6corvel', { needs: ['okconfess'], sets: ['m6corvel'] }, async J => {
    if (J.flag('m6corvel') || !J.flag('okconfess')) return;
    await J.emote('corvel', '!');
    await J.say(['Good afternoon. Agent Corvel, Lumen Company. So sorry to barge in.', 'Professor Okafor - Mr. Vale requests the pleasure of your company in Brassport. Tonight. He was most particular.'], 'corvel');
    await J.say('He sends Lightkeepers to fetch me now? Tell Cassius that if he wants to talk to me, he can knock on my door himself.', { name: 'Prof. Okafor', look: 'okafor' });
    await J.say(['I\'m afraid "requests" was a polite word for it. And this child is in the way.', 'You\'ll forgive me. I am going to have to move you.'], 'corvel');
    if (await J.battle({ id: 'm6corvel', name: 'Agent Corvel', look: 'agent', team: [['golbat', 33], ['toxicroak', 34], ['houndoom', 35]], pay: 60, theme: 'city', before: 'Shall we keep this tidy?', lose: 'Not tidy at all.' }, 'corvel') !== 'win') return;
    await J.say(['...How embarrassing. Very well. I shall report that the Professor was "unavailable".', 'Mr. Vale will be disappointed. He is so rarely disappointed. You should see it, it\'s quite something.'], 'corvel');
    await J.fade(() => { J.hideNpc('corvel'); J.hideNpc('lk'); });
    J.set('m6corvel');
    await J.say(['Thank you, {NAME}. Twice in one day you\'ve opened a door for me.', 'They\'ll come back. Go - Celeste first, then the Lastlight. And hurry.'], { name: 'Prof. Okafor', look: 'okafor' });
  });
  on('m6machine', {}, J => J.say(J.flag('okconfess') ? 'A drift detector, the twin of the one in Tidemark. Its needle points north-east, toward Brassport, and trembles.' : 'A tall machine full of dials. A strip of paper reads: DRIFT - BRASSPORT - 61 DAYS (THIS MONTH).'));
  on('m6shelf', {}, J => J.say(J.pick(['"The Memory of Water: Pokémon and Tides". Dog-eared.', '"Celebi in Folklore and Fact". A bookmark at the chapter "Why It Never Stays".', '"Lantern-folk Ruins of the Wildheart". The margins are full of Okafor\'s handwriting.'])));
  on('m6okpc', {}, J => J.say(J.flag('okconfess') ? 'An unsent e-mail to C. VALE. The subject line is "Nell". The body is empty. It was saved twenty years ago.' : 'The screen is locked. The wallpaper is a photo of Tidemark at sunrise.'));
  on('m6desk', {}, J => J.say('A pile of letters from children all over the coast: "Dear Professor, my Pokémon remembered my birthday before I did..." She has answered every one.'));
  on('m6log1', {}, J => J.say(['LAB BOOK 1 (twenty years old). "Lens assembled. Crystal on loan from the Tidemark Light. C.V. calls it our telescope for yesterday."']));
  on('m6log2', {}, J => J.say(J.flag('okconfess') ? ['LAB BOOK 2. "Midnight. Contact. The far side is GREY. Train 114 crossing at -" The line stops. The next page is torn out.', 'On the page after: "One heartbeat. I am closing it anyway. God forgive me."'] : 'LAB BOOK 2. The pages are glued together with something that may once have been tea.'));
  on('m6log3', {}, J => J.say(['A newspaper clipping, yellow with age: "MIDNIGHT TRAIN LOST IN SEA FOG - 41 ABOARD - SEARCH CALLED OFF".', 'One name is circled in pencil: NELL VALE, AGE 8.']));
  on('m6log4', {}, J => J.say(J.flag('okconfess') ? 'A drawing of a little girl and a Litwick, in a child\'s crayon. It\'s signed "NELL" and addressed "to Auntie Amara".' : 'A drawing in crayon, turned face-down.'));
  on('m6lens', {}, J => J.say('A brass housing with an empty socket where a crystal used to sit. Etched on the side: "OKAFOR & VALE - SEE YOU YESTERDAY".'));

  // ---- the Saltmere Light: Warden Celeste
  on('m6celesteWin', { sets: ['badge.pearl'] }, async J => {
    await J.say(['Darling, that was magnificent. Here: the Pearl Badge. Wear it somewhere it can catch the light.'], 'celeste');
    J.badge('pearl');
    await J.give('tm:dazzling-gleam');
    await J.say(['Dazzling Gleam: all the light I have, all at once. Use it generously.', 'Do you know, I lost a day too. My wedding day. I have the ring and the photographs, and my wife tells me I cried through the vows.'], 'celeste');
    await J.say(['I don\'t remember any of it. So we\'re going to do it all again next spring, and this time I am keeping every second.', 'Whoever is taking our days, {NAME} - make them give mine back. I\'ll want it for the anniversary.'], 'celeste');
    if (!J.flag('ride.surf')) await J.say('And if you\'re going out to the Lastlight, take the Lamplighter my love. She taught me to battle when I was smaller than you.', 'celeste');
  });
  on('m6gymStatue', {}, J => J.say(J.flag('badge.pearl') ? 'SALTMERE LIGHT - WARDEN: CELESTE\nTrainers who have earned the Pearl Badge: {NAME}' : 'SALTMERE LIGHT - WARDEN: CELESTE\n"Grace is a kind of strength."'));
  on('m6saltlamp', {}, J => J.say('The great lamp of the Saltmere Light. Its crystal glows a soft pearly pink, steady as a heartbeat.'));
  on('m6gymGuide', {}, (J, n) => J.say(J.flag('badge.pearl') ? 'The Pearl Badge! You out-sparkled Celeste. I didn\'t think that was physically possible.' : ['Celeste uses Fairy types: pretty, and hard as nails.', 'Poison and Steel moves hit them hard, and Dragon moves do nothing at all. Her Mawile and Tinkatuff are part Steel - bring Fire or Ground for those.'], n));

  // ---- the Lamplighter
  on('m6ada', { needs: ['okconfess', 'm6corvel', 'badge.pearl'], sets: ['m6ada', 'ride.surf'] }, async (J, n) => {
    if (J.flag('ride.surf')) return J.say(J.flag('ch7') ? ['Lapras came home last night to sleep under the light, then swam off again to find you. She has decided you\'re hers.', 'Go carefully, child. The sea remembers everything, but it forgives slowly.'] : ['Amara\'s on the pier, I expect. Pacing. She used to pace like that before exams.', 'Go on. She\'ll want to see you off.'], n);
    if (!J.flag('okconfess')) return J.say(['A visitor. I don\'t get many. Fewer since I started shutting the door on men with lanterns.', 'You have the look of someone who doesn\'t know why they came. Come back when you do. I\'ll put the kettle on.'], n);
    if (!J.flag('badge.pearl') || !J.flag('m6corvel')) return J.say(['So she finally told someone. Good. Twenty years is a long time to carry a stone.', 'You want to cross the sea. The sea doesn\'t care how brave you are, child. Bring me Celeste\'s badge and we\'ll talk.'], n);
    await J.say(['The Pearl Badge. Celeste always did hand them out with a little speech. Did she cry? She cries.', 'Sit. No - stand, you\'re young. Listen.'], n);
    await J.say(['I have kept this light for longer than Saltmere has had a name. It burns the old way: no crystal, no Company, no lanterns.', 'Just a flame that remembers what it\'s for.'], n);
    await J.say(['I have seen the Grey before, child. A long time ago. I\'ll tell you about it when you have seen more of it.', 'For now you need a way across the water. Come.'], n);
    await J.fade(async () => { await J.wait(500); });
    await J.say(['She takes you down to the rocks below the Lastlight and whistles - two notes, low and long.', 'Out of the blue water rises a Lapras, old and enormous, with a scar across her shell. She lays her head on the Lamplighter\'s shoulder.']);
    await J.say(['She carried me across every sea in Meridia, once. She\'s been waiting a long time for someone worth carrying again.', 'Don\'t make me wrong about you.'], n);
    J.addMon('lapras', 34, { met: 'Lastlight' });
    await J.say('Lapras joined your team!');
    await J.give('m6pager');
    J.set('ride.surf'); J.set('m6ada');
    await J.say(['That pager calls her wherever you are. Face deep water and press A, and she\'ll come.', 'And {NAME}: the sea lanes east of Saltmere go to the Archway Isles. Corin keeps the Veil Light there. He\'s strange. You\'ll like him.'], n);
    await J.heal(true);
    await J.say(['Amara will be on the pier. She won\'t say goodbye; she never does. Let her try anyway.'], n);
    J.refresh();
  });
  on('m6adaShelf', {}, J => J.say(['Old trophies, every one turned to face the wall.', 'You turn one around. The plate reads: MERIDIA LEAGUE - CHAMP... The rest is scratched away.']));
  on('m6adaPhotos', {}, J => J.say(['Photographs. A young woman with a Lapras on a stormy sea. A little girl with very serious eyes, holding a Togepi upside down.', 'On the back of the second one: "A., age 7. Already arguing with me about tides."']));
  on('m6lastlamp', {}, J => J.say(['There is no crystal in the Lastlight\'s lamp. In the lens housing, a Chandelure dozes, its blue flames turning slowly.', 'It opens one eye at you, decides you\'re acceptable, and goes back to sleep.']));
  on('m6scope', {}, J => J.say(J.flag('ride.surf') ? 'A brass telescope pointed east. Through it: the Sea Lanes, the white arch of Archway, and a dark shape under the water past it - the roof of something enormous.' : 'A brass telescope pointed east, at the sea.'));

  // ---- the send-off
  on('m6sendoff', { needs: ['ride.surf'], sets: ['ch7'] }, async (J, n) => {
    await J.say(['She gave you Lapras. Of course she did. She never gave me anything I didn\'t argue for first.', '...Don\'t look at me like that. I\'m allowed one secret that isn\'t a disaster.'], n);
    await J.say(['I\'m going back to Tidemark tonight, to sit with Teo and Juno. The Company won\'t try anything in front of the whole village.', 'And I can watch the drift. If it moves, I\'ll know where Cassius is going next.'], n);
    await J.say(['East, along the Sea Lanes: the Archway Isles. Warden Corin keeps the Veil Light, and the Drowned Archive lies in his waters.', 'Find out what the Lantern-folk knew. Find out what Cassius is building. And {NAME}...'], n);
    await J.say(['...Thank you for not looking at me differently.', 'Or for being kind enough to pretend.'], n);
    await J.give('ultra', 3);
    await J.fade(() => J.hideNpc('okpier'));
    await J.chapter('Chapter 6 complete!', 'Next: Chapter 7 - The Drowned Archive');
    J.set('ch7'); J.refresh();
    await J.chapter('Chapter 7', 'The Drowned Archive');
  });

  // ---- Saltmere's people
  on('m6harlan', {}, (J, n) => J.say(J.flag('ride.surf') ? ['Is that the Lamplighter\'s Lapras? I haven\'t seen her in forty years! She saved my father in the storm of \'61.', 'Tell her Harlan says hello. She won\'t remember me. That\'s all right.'] : ['No ferry east any more. The sea lanes got too rough, and the Company bought the last boat to "repurpose" it.', 'The Lamplighter used to ride a Lapras out there. Before your time. Before mine, nearly.'], n));
  on('m6lanternKeeper', {}, (J, n) => J.say(J.flag('okconfess') ? ['Free lanterns! Keeps the bad days aw- ...You\'re looking at me like you know something.', 'I just hand them out. I\'m sure they\'re perfectly nice lanterns. I have one at home. I sleep wonderfully.'] : ['Free lanterns, courtesy of the Lumen Company! Hang it by your door and sleep sweet.', 'No? Ah. Well. Terribly sorry to have bothered you.'], n));
  on('m6sailor', {}, (J, n) => J.say(J.flag('ride.surf') ? 'With a Lapras you can go anywhere! Gullwing\'s north of the first sea lane, Archway\'s at the end of the second. Stay off the reefs!' : 'Out there\'s the Sea Lanes: islands, reefs, swimmers who\'ll battle anything that floats. Without a boat you\'re stuck on the sand like me.', n));
  on('m6saltLady', {}, (J, n) => J.say(J.flag('badge.pearl') ? 'You beat Celeste? She\'ll talk about it for weeks. She talks about everything for weeks. It\'s lovely.' : 'Have you met our Warden? She waters every flower in the gym herself. Fifteen hundred flowers! She sings to them.', n));
  on('m6saltKid', {}, (J, n) => J.say(J.flag('m6g.done') ? 'Grandma Posy\'s garden is all blooming! She gave me a flower for my hair. Look! ...You can\'t see it. It fell out. But it was there.' : 'Grandma Posy\'s garden never grows anything. She plants seeds every spring and forgets what they were.', n));

  // ---- side story: The Garden That Remembers
  on('m6posy', { sets: ['m6g.met', 'm6g.seedsBack', 'm6g.ribbonBack', 'm6g.bottleBack', 'm6g.done'] }, async (J, n) => {
    if (J.flag('m6g.done')) return J.say(J.pick([['Sea pinks, marsh lilies and Bram\'s silly yellow daisies. Every single one remembered.', 'Come and sit in it whenever you like, dear. A garden wants visitors.'], 'I put the lantern in the cupboard. Some nights I miss sleeping so soundly. Then I come out here, and I don\'t.']), n);
    if (!J.flag('m6g.met')) {
      await J.say(['Oh! A visitor in my garden. Not that there\'s much garden to visit.', 'I\'m Posy. I planted these beds, I\'m certain of it. I just can\'t remember what grew in them.'], n);
      await J.say(['Every spring I put seeds in, and every spring they don\'t come up. The soil knows something I don\'t.', 'My grandson gave me one of those Lumen lanterns. I sleep beautifully. But every morning there\'s a little less of me.'], n);
      await J.say(['If you ever find anything that belongs to this garden - anything at all - bring it to me, would you?', 'Old things know the way home. Sometimes they just need carrying.'], n);
      J.set('m6g.met');
    }
    const memories = [
      ['m6seedtin', 'm6g.seedsBack', ['A seed tin... "B + P". Oh. Oh, I know this tin.', 'Bram and I had a flower farm on the old coast road. Sea pinks as far as you could see. Then the sea took the road one night - all of it, in one night.', 'We saved one tin of seeds. He made me promise to plant them somewhere the sea couldn\'t reach.']],
      ['m6ribbon', 'm6g.ribbonBack', ['The Blue Ribbon! Forty years we won that show. Bram said the judges were bribed with my lemon cake.', 'They were, a little. Fenn still asks for the recipe.', 'The last year, Bram was too ill to come, so I never collected it. I didn\'t want it without him.']],
      ['m6bottle', 'm6g.bottleBack', ['...That\'s his handwriting. On the bottle.', 'He threw a bottle off Lamplighter\'s Cape the summer before he passed. He wouldn\'t tell me what was in it. "You\'ll get it when you need it," he said.', '"Posy. When you forget me - and you will, love, everyone forgets - plant something. I\'ll be the thing that comes up."']]];
    let any = false;
    for (const [item, f, lines] of memories) {
      if (J.flag(f) || !J.has(item)) continue;
      any = true;
      await J.say(lines, n);
      J.take(item);
      J.set(f);
      await J.warp('saltmere', 15, 22, 'right');
      await J.say('A warm breath of wind crosses the garden. In one of the bare beds, green shoots push up through the soil - and bloom.');
    }
    const back = ['m6g.seedsBack', 'm6g.ribbonBack', 'm6g.bottleBack'].filter(f => J.flag(f)).length;
    if (back === 3 && !J.flag('m6g.done')) {
      await J.say(['Bram. I remember Bram.', 'His terrible singing. His muddy boots on my clean floor. The way he held my hand in the waiting room, at the very end.', 'It hurts, dear. Oh, it hurts. Good.'], 'posy');
      await J.say(['I\'d rather remember being sad than forget being happy. Arlo can have that lantern back. I\'m done sleeping through my life.'], 'posy');
      J.set('m6g.done');
      await J.warp('saltmere', 15, 22, 'right');
      await J.say('The whole garden is in bloom: sea pinks, marsh lilies, and a row of silly yellow daisies along the fence.');
      await J.say(['This little one has been living under the daisies for years. Waiting for them to come back, I think. Bram planted its flower.', 'It wants to go with you. Take care of it.'], 'posy');
      J.addMon('floette', 33, { met: 'Saltmere' });
      await J.say('Floette joined your team!');
      return;
    }
    if (!any && J.flag('m6g.met')) return J.say(back ? `${back} of my beds remember now. The soil is listening. Keep your eyes open for anything else that belongs here, dear.` : 'Anything that belongs to this garden, dear. The old coast road, the flower show... Bram always said things find their way home.', n);
  });
  on('m6posyLantern', {}, J => J.say(J.flag('m6g.done') ? 'The Lumen lantern sits on the shelf, unplugged. A note on it says "ARLO - RETURN TO SENDER. LOVE, GRAN."' : 'A Lumen lantern glows on the shelf with a soft golden light. Standing close, you feel drowsy and oddly calm... and a little emptier.'));
  on('m6posyShelf', {}, J => J.say('Flower-press books, a jar of buttons, and a wedding photo: a young Posy laughing, and a tall man with mud on his boots.'));
  on('m6arlo', {}, (J, n) => J.say(J.flag('m6g.done') ? ['Gran gave the lantern back. She was crying in the garden all morning.', 'But she was smiling too. I don\'t get grown-ups.'] : ['I gave Gran a Lumen lantern so she\'d sleep better. She sleeps great now!', 'She just keeps asking me who Grandpa Bram was. I tell her every day.'], n));
  on('m6fenn', { needs: ['m6g.met'], sets: ['m6g.ribbon'] }, async (J, n) => {
    if (J.flag('m6g.ribbon')) return J.say('Forty years I judged that show, and forty years Posy\'s lemon cake was the best bribe in Saltmere. Don\'t tell anyone.', n);
    if (!J.flag('m6g.met')) return J.say('I judged the Saltmere Flower Show for forty years. Sea pinks are the hardest flower in the world to fake, you know.', n);
    await J.say(['Posy\'s garden? Bless her. Bram and Posy won my show every single year.', 'The last year they never came to collect the ribbon. I kept it. I couldn\'t tell you why... I just knew someone would come for it.'], n);
    await J.give('m6ribbon');
    J.set('m6g.ribbon');
    await J.say('Give it to her with my love. And tell her the recipe is still a state secret.', n);
  });
  on('m6hester', {}, (J, n) => J.say('Fenn kept every ribbon that was never collected. There\'s a whole drawer of them. He says each one is a story waiting for its ending.', n));
  on('m6fennShelf', {}, J => J.say('Rows of flower-show trophies, and one drawer full of uncollected ribbons, each with a name tag.'));

  chapter({ n: 6, title: 'What the Professor Buried', start: { map: 'sunkenroad', x: 7, y: 1, dir: 'down' }, level: 33, badge: 'pearl', center: 'center_saltmere',
    goals: ['m6junoRoad', 'm6arrive', 'm6door', 'okconfess', 'm6corvel', 'badge.pearl', 'm6ada', 'ride.surf', 'ch7'] });
})();
