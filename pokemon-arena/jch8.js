'use strict';
// =====================================================================
//  JOURNEY - Chapter 8: Champion of Valoria. Victory Road, a two-floor
//  cave east of Frostvale, climbs to the Pokémon League on its plateau.
//  Sora waits for one last battle near the top; then the Elite Four,
//  Champion Aurelia, the Hall of Fame - and home to Willowbrook.
// =====================================================================
(() => {
  const { def, grid, L } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- new people
  const LK = {
    c8guard: { hat: 'cap', hatColor: 0x2a3a6a, hatFront: 0xf0d048, hair: 0x2b1d14, hairStyle: 'short', top: 0x2a3a6a, sleeves: 'long', inner: 0xf0d048, legs: 0x2a2a34, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    c8acef: { hat: null, hair: 0x2d6ad8, hairStyle: 'long', top: 0xe8e8f0, sleeves: 'short', inner: 0xd83838, legs: 0x2a2a34, legStyle: 'skirt', shoes: 0xd83838, bag: null },
    c8acem: { hat: null, hair: 0x3a7a3a, hairStyle: 'spiky', top: 0xe8e8f0, sleeves: 'long', inner: 0x2d8cf0, legs: 0x2a2a34, legStyle: 'pants', shoes: 0x2d8cf0, bag: null },
    c8belt: { hat: 'bandana', hatColor: 0x1a1a1a, hair: 0x1a1a1a, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'short', inner: 0xf4f4f4, legs: 0xf4f4f4, legStyle: 'pants', shoes: 0xf6cfa8, bag: null, scarf: 0x1a1a1a },
    c8vet: { hat: null, hair: 0xb8b8c0, hairStyle: 'short', top: 0x6a5a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: 0x5a4a2a, scarf: 0xc84848 },
    c8tamer: { hat: null, hair: 0xc0392b, hairStyle: 'spiky', top: 0x2a5a4a, sleeves: 'long', inner: 0xf0d048, legs: 0x2a2a34, legStyle: 'pants', shoes: 0x2a1e14, bag: null, scarf: 0xc0392b },
    // the Elite Four and the Champion
    c8morrigan: { hat: null, hair: 0x1a1a24, hairStyle: 'long', top: 0x2a1a3a, sleeves: 'long', inner: 0x8a3ac8, legs: 0x1a1a24, legStyle: 'skirt', shoes: 0x2a1a3a, bag: null, scarf: 0x8a3ac8 },
    c8bram: { hat: 'bandana', hatColor: 0xc84828, hair: 0x5a3a20, hairStyle: 'spiky', top: 0x8a6a4a, sleeves: 'none', inner: 0x8a6a4a, legs: 0x4a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: null },
    c8seraphine: { hat: null, hair: 0xf0a0c8, hairStyle: 'pigtails', top: 0xf8e8f4, sleeves: 'short', inner: 0xc058c8, legs: 0xf0a0c8, legStyle: 'skirt', shoes: 0xffffff, bag: null },
    c8talon: { hat: null, hair: 0x2a8a7a, hairStyle: 'spiky', top: 0x1a3a3a, sleeves: 'long', inner: 0xd8a028, legs: 0x1a2a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: null, scarf: 0xc0392b },
    c8aurelia: { hat: null, hair: 0xf0c848, hairStyle: 'long', top: 0xf8f4e8, sleeves: 'long', inner: 0xd8a028, legs: 0xf8f4e8, legStyle: 'skirt', shoes: 0xd8a028, bag: null, scarf: 0xd8a028 }
  };
  Object.assign(L, LK);

  // ---- items (shared ids: only if no other chapter made them first)
  const item = (k, v) => { if (!ITEMS[k]) ITEMS[k] = v; };
  item('hyperpotion', { name: 'Hyper Potion', pocket: 'medicine', price: 1200, heal: 120, desc: 'Restores 120 HP.' });
  item('maxrevive', { name: 'Max Revive', pocket: 'medicine', price: 0, revive: 1, desc: 'Revives a fainted Pokémon with all its HP.' });
  item('tm:earthquake', { name: 'TM Earthquake', pocket: 'tms', price: 0, tm: 'earthquake', desc: 'Teaches Earthquake: a powerful quake that hits hard.' });
  item('tm:dragon-claw', { name: 'TM Dragon Claw', pocket: 'tms', price: 0, tm: 'dragon-claw', desc: 'Teaches Dragon Claw: slashes with sharp claws.' });

  // ---- trainers: Victory Road (50-53), the Elite Four (52-56), the Champion (56-60)
  Object.assign(TRAINERS, {
    c8vera: { team: [['ninetales', 50], ['starmie', 50], ['ampharos', 51]], pay: 22, theme: 'volcano', before: 'Seven badges, huh? So do I. Only one of us is getting out of this cave on top!', lose: 'Seven badges... and still not enough.', after: 'Everyone on Victory Road has seven badges. Not everyone has what it takes for the eighth step.' },
    c8koji: { team: [['hitmonlee', 50], ['hitmonchan', 50], ['machamp', 51]], pay: 22, theme: 'volcano', before: 'HIYAA! I train in the dark so my fists see what my eyes cannot!', lose: 'My fists... saw nothing coming.', after: 'Bram of the Elite Four is my master\'s master. Psychic, Flying or Fairy for his fighters, Water or Grass for his rocks - and courage.' },
    c8dorian: { team: [['aggron', 51], ['skarmory', 51], ['rhydon', 52]], pay: 24, theme: 'volcano', before: 'I\'ve walked this road thirty years and never reached the top. Maybe today I\'ll stop you instead!', lose: 'Thirty-one years, then.', after: 'Hidden things glow in this cave. Look in the corners - the old meteor scattered its pieces even down here.' },
    c8rowan: { team: [['scizor', 51], ['gyarados', 52], ['gliscor', 52]], pay: 22, theme: 'volcano', before: 'The League is right above us. Let\'s see if you deserve the daylight!', lose: 'Right. Daylight\'s yours.', after: 'There\'s a girl in a blue cap waiting near the exit. She\'s been pacing for hours.' },
    c8wen: { team: [['dragonair', 51], ['gabite', 52], ['altaria', 53]], pay: 24, theme: 'volcano', before: 'Dragons sleep in the deepest caves. Wake mine - if you dare!', lose: 'Their roar... went quiet.', after: 'Talon of the Elite Four raised dragons from eggs. Ice and Fairy moves - and Dragon moves, if you\'re brave.' },
    // ---- the Elite Four
    c8morrigan: { team: [['umbreon', 52], ['honchkrow', 53], ['zoroark', 53], ['kingambit', 54]], pay: 120, theme: 'stadium', onWin: 'c8e1Win', before: 'Welcome to the Pokémon League. I am Morrigan of the Elite Four. Shadows hide nothing from me - not your fear, not your doubt. Let me see them!', lose: 'Hm. No shadow on you at all. How bright.', after: 'Go on. Bram waits beyond that door, and he is not gentle.' },
    c8bram: { team: [['hitmontop', 53], ['golem', 54], ['machamp', 54], ['rhyperior', 55]], pay: 120, theme: 'stadium', onWin: 'c8e2Win', before: 'Bram of the Elite Four! Rock does not bend and fists do not lie. Hit me with everything you have!', lose: 'HA! You hit like an avalanche!', after: 'Seraphine is next. Don\'t let the flowers fool you - she\'s the cleverest of us.' },
    c8seraphine: { team: [['clefable', 54], ['espeon', 54], ['alakazam', 55], ['gardevoir', 55]], pay: 120, theme: 'stadium', onWin: 'c8e3Win', before: 'I am Seraphine of the Elite Four. I already know how this battle ends... but I would love to be surprised.', lose: 'Oh! I didn\'t see that at all. Thank you.', after: 'Talon guards the last door. His dragons are older than I am.' },
    c8talon: { team: [['kingdra', 55], ['flygon', 55], ['haxorus', 56], ['dragonite', 56]], pay: 120, theme: 'stadium', onWin: 'c8e4Win', before: 'I am Talon, the last of the Elite Four. I raised these dragons from eggs. They have never once lost their nerve. Have you?', lose: '...They are bowing to you. They have never done that.', after: 'Beyond that door is the Champion. Aurelia. Go - and let your bond do the talking.' },
    c8aurelia: { team: [['arcanine', 57], ['milotic', 57], ['metagross', 58], ['scizor', 58], ['garchomp', 59], ['ho-oh', 60]], pay: 200, theme: 'stadium', name: 'Champion Aurelia', look: 'c8aurelia', before: 'Then let us begin. Show me the bond that carried you all the way here!', lose: 'Magnificent... I have waited years for a battle like this.', win: 'Not yet. But you are closer than you think.' }
  });

  // =====================================================================
  //  Victory Road 1F - a badge check at the mouth, then a big cave: a hall
  //  west, a high passage east to the stairs, a ledge back down
  // =====================================================================
  {
    const B = grid(40, 30, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(0, 10, 0, 11);              // the mouth, from Frostvale
    carve(1, 8, 6, 13);               // the gatehouse hollow (the guard checks badges)
    carve(7, 10, 11, 11);             // past the guard
    carve(10, 3, 15, 26);             // the west hall
    carve(3, 19, 9, 23);              // a side pocket off the hall
    carve(15, 3, 36, 6);              // the high passage east
    carve(28, 6, 36, 26);             // the east hall
    carve(10, 23, 36, 26);            // the low passage back west
    carve(18, 10, 25, 19);            // a chamber with a still pool
    carve(21, 19, 22, 22);            // up into the chamber from the low passage
    B.fill(20, 12, 23, 15, '~');
    B.fill(28, 13, 36, 13, 'v');      // a ledge: a quick way back down the east hall
    B.put(36, 4, '<');                // stairs up to 2F
    for (const [x, y] of [[12, 5], [14, 16], [11, 21], [31, 9], [34, 18], [26, 25], [17, 24], [5, 22], [8, 20], [19, 11], [33, 4], [24, 17], [30, 22]]) B.put(x, y, 'r');
    def({ id: 'victoryroad', name: 'Victory Road', kind: 'cave', chapter: 8, rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.3,
      encounters: { cave: { rate: 0.06, min: 45, max: 49, table: [['golbat', 24], ['graveler', 20], ['onix', 12], ['machoke', 14], ['lairon', 10], ['marowak', 10], ['sneasel', 6], ['gabite', 4]] } },
      edges: { w: { to: 'frostvale', dy: 0 } },
      // the guard's checkpoint: the whole width of the way in
      zones: [{ x: 7, y: 10, w: 1, h: 2, event: 'c8gate', block: true }],
      warps: [{ x: 36, y: 4, to: 'victoryroad2', tx: 3, ty: 24, dir: 'right' }],
      signs: [{ x: 3, y: 8, text: 'VICTORY ROAD\nOnly trainers with all seven Gym Badges may pass.' }],
      items: [{ x: 18, y: 18, item: 'shard', n: 1, hidden: true }, { x: 25, y: 10, item: 'ultra', n: 2 }, { x: 3, y: 19, item: 'tm:earthquake', n: 1 },
        { x: 36, y: 26, item: 'revive', n: 1 }, { x: 10, y: 3, item: 'hyperpotion', n: 1, hidden: true }],
      npcs: [{ id: 'guard', x: 6, y: 9, dir: 'down', look: L.c8guard, name: 'League Guard', talk: 'c8guard' },
        { id: 'vera', x: 14, y: 8, dir: 'left', look: L.c8acef, name: 'Ace Trainer Vera', trainer: 'c8vera' },
        { id: 'koji', x: 22, y: 4, dir: 'down', look: L.c8belt, name: 'Black Belt Koji', trainer: 'c8koji' },
        { id: 'dorian', x: 32, y: 20, dir: 'left', look: L.c8vet, name: 'Veteran Dorian', trainer: 'c8dorian' }] });
  }

  // =====================================================================
  //  Victory Road 2F - an underground lake, a ledge, and the climb to
  //  daylight, where Sora is waiting
  // =====================================================================
  {
    const B = grid(36, 28, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(2, 20, 9, 25);              // the landing (stairs down)
    carve(5, 8, 8, 20);               // the west climb
    carve(5, 8, 30, 11);              // the long gallery
    B.fill(11, 9, 20, 10, '~');       // the underground lake (walk round it)
    carve(27, 11, 30, 22);            // the east drop
    carve(14, 17, 30, 22);            // the lower cavern
    carve(14, 11, 15, 17);            // a passage back up to the gallery
    B.fill(27, 14, 30, 14, 'v');      // a ledge down the east drop
    carve(17, 1, 21, 8);              // the last climb
    carve(18, 0, 20, 0);              // daylight: the League plateau
    B.put(2, 24, '>');
    for (const [x, y] of [[7, 22], [6, 12], [10, 8], [23, 11], [29, 12], [18, 20], [24, 18], [21, 2], [17, 7], [9, 25]]) B.put(x, y, 'r');
    def({ id: 'victoryroad2', name: 'Victory Road', kind: 'cave', chapter: 8, rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.26,
      encounters: { cave: { rate: 0.06, min: 46, max: 50, table: [['golbat', 22], ['graveler', 16], ['steelix', 8], ['machoke', 14], ['rhydon', 10], ['lairon', 10], ['gabite', 8], ['sableye', 8], ['sneasel', 4]] } },
      edges: { n: { to: 'league', dx: -4 } },
      warps: [{ x: 2, y: 24, to: 'victoryroad', tx: 35, ty: 4, dir: 'left' }],
      // Sora: the whole width of the last climb
      zones: [{ x: 17, y: 4, w: 5, h: 1, event: 'c8sora' }],
      items: [{ x: 9, y: 20, item: 'revive', n: 1 }, { x: 30, y: 8, item: 'tm:dragon-claw', n: 1 }, { x: 30, y: 22, item: 'fullheal', n: 2 },
        { x: 14, y: 22, item: 'rarecandy', n: 1, hidden: true }, { x: 5, y: 8, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'rowan', x: 8, y: 14, dir: 'left', look: L.c8acem, name: 'Ace Trainer Rowan', trainer: 'c8rowan' },
        { id: 'wen', x: 25, y: 8, dir: 'down', look: L.c8tamer, name: 'Dragon Tamer Wen', trainer: 'c8wen' },
        { id: 'sora', x: 19, y: 2, dir: 'down', look: L.sora, name: 'Sora', talk: 'c8sora', show: ['!c8rival'] }] });
  }

  // =====================================================================
  //  The Pokémon League - a plateau above the clouds; the golden hall
  // =====================================================================
  {
    const B = grid(32, 24, '.').border('T', { s: [14, 16] }, 1);
    B.fill(1, 1, 30, 1, 'p').fill(1, 1, 1, 22, 'p').fill(30, 1, 30, 22, 'p');
    B.fill(14, 9, 16, 23, ',');                 // the road up from Victory Road
    B.fill(6, 9, 25, 10, ',');                  // the plaza
    B.fill(4, 12, 10, 14, '*').fill(21, 12, 27, 14, '*');
    B.fill(2, 21, 11, 22, 'r').fill(19, 21, 29, 22, 'r');   // where the plateau drops away
    B.put(5, 4, 'r').put(26, 5, 'r').put(24, 18, 'r').put(6, 17, 'r');
    def({ id: 'league', name: 'Pokémon League', kind: 'town', chapter: 8, rows: B.rows(), music: 'town', battle: 'stadium',
      buildings: [{ b: 'gym', x: 12, y: 3, to: 'leaguelobby', variant: 7 }],
      edges: { s: { to: 'victoryroad2', dx: 4 } },
      signs: [{ x: 17, y: 11, text: 'POKéMON LEAGUE\nThe Elite Four and the Champion await.' }, { x: 13, y: 19, text: 'VICTORY ROAD\nThe way back down.' }],
      props: [{ k: 'lamp', x: 11, y: 8 }, { k: 'lamp', x: 20, y: 8 }],
      items: [{ x: 28, y: 4, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'sora', x: 18, y: 10, dir: 'left', look: L.sora, name: 'Sora', talk: 'c8soraLeague', show: ['c8rival', '!champion'] },
        { id: 'vet', x: 8, y: 11, dir: 'right', look: L.oldman, name: 'Old Trainer Hal', wander: 2, talk: 'c8plateauVet' }] });
  }

  // ---- the League lobby: a Pokémon Center and a shop in one (a whiteout comes back here)
  {
    const B = grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm');
    B.fill(7, 0, 7, 8, 'R');
    def({ id: 'leaguelobby', name: 'Pokémon League', kind: 'inside', chapter: 8, outside: 'league', isCenter: true, rows: B.rows(),
      stock: ['ultra', 'great', 'hyperpotion', 'superpotion', 'fullheal', 'revive', 'repel'],
      arrive: { x: 7, y: 8 },
      furniture: [{ k: 'counter', x: 1, y: 4 }, { k: 'healer', x: 4, y: 3 }, { k: 'counter', x: 10, y: 4 }, { k: 'martshelf', x: 10, y: 1 }, { k: 'pc', x: 1, y: 1, talk: 'boxPc' },
        { k: 'statue', x: 6, y: 1, talk: 'c8leagueStatue' }, { k: 'statue', x: 8, y: 1, talk: 'c8leagueStatue' }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }, { k: 'sofa', x: 11, y: 7 }],
      warps: [{ x: 7, y: 0, to: 'elite1', tx: 6, ty: 10, dir: 'up' }],
      npcs: [{ id: 'nurse', x: 2, y: 3, dir: 'down', look: L.nurse, name: 'Nurse Bell', talk: 'nurse', counter: true },
        { id: 'clerk', x: 12, y: 3, dir: 'down', look: L.clerk, name: 'Clerk', talk: 'clerk', counter: true },
        { id: 'lguard', x: 9, y: 2, dir: 'down', look: L.c8guard, name: 'League Guard', talk: 'c8lobbyGuard' }] });
  }

  // ---- the Elite Four's rooms in a row, then the Champion's: in at the bottom, on through the top door - which is
  // sealed (a blocking zone) until the room's trainer is beaten. The flags stay, so a whiteout keeps your place.
  const ROOMS = [
    { id: 'elite1', name: 'Elite Four - Morrigan', floor: 'o', npc: { id: 'morrigan', look: L.c8morrigan, name: 'Elite Four Morrigan', trainer: 'c8morrigan' }, flag: 'c8e1', who: 'Morrigan',
      paint: B => B.fill(1, 3, 2, 9, 'k').fill(10, 3, 11, 9, 'k') },
    { id: 'elite2', name: 'Elite Four - Bram', floor: 'c', npc: { id: 'bram', look: L.c8bram, name: 'Elite Four Bram', trainer: 'c8bram' }, flag: 'c8e2', who: 'Bram',
      paint: B => { for (const [x, y] of [[2, 3], [10, 3], [2, 8], [10, 8], [3, 6], [9, 6], [1, 5], [11, 5]]) B.put(x, y, 'r'); } },
    { id: 'elite3', name: 'Elite Four - Seraphine', floor: 'P', npc: { id: 'seraphine', look: L.c8seraphine, name: 'Elite Four Seraphine', trainer: 'c8seraphine' }, flag: 'c8e3', who: 'Seraphine',
      paint: B => B.fill(1, 6, 3, 9, '*').fill(9, 6, 11, 9, '*') },
    { id: 'elite4', name: 'Elite Four - Talon', floor: 'o', npc: { id: 'talon', look: L.c8talon, name: 'Elite Four Talon', trainer: 'c8talon' }, flag: 'c8e4', who: 'Talon',
      paint: B => B.fill(1, 2, 2, 9, 'L').fill(10, 2, 11, 9, 'L') },
    { id: 'champion', name: 'Champion\'s Room', floor: '+', npc: { id: 'aurelia', look: L.c8aurelia, name: 'Champion Aurelia', talk: 'c8champion' }, flag: 'c8champ', who: 'the Champion',
      paint: B => B.fill(1, 1, 2, 10, 'h').fill(10, 1, 11, 10, 'h') }
  ];
  ROOMS.forEach((r, i) => {
    const B = grid(13, 12, r.floor).border('#');
    r.paint(B);
    B.fill(6, 0, 6, 11, 'R').fill(5, 2, 7, 4, 'R');   // the doorways, the carpet and the dais
    const prev = i ? { to: ROOMS[i - 1].id, tx: 6, ty: 2 } : { to: 'leaguelobby', tx: 7, ty: 1 };
    const next = ROOMS[i + 1] ? ROOMS[i + 1].id : 'halloffame';
    def({ id: r.id, name: r.name, kind: 'inside', chapter: 8, rows: B.rows(), battle: 'stadium', music: 'gym',
      furniture: [{ k: 'statue', x: 5, y: 1, talk: 'c8eliteStatue' }, { k: 'statue', x: 7, y: 1, talk: 'c8eliteStatue' }, { k: 'plant', x: 3, y: 10 }, { k: 'plant', x: 9, y: 10 }],
      warps: [{ x: 6, y: 11, ...prev, dir: 'down' }, { x: 6, y: 0, to: next, tx: 6, ty: next === 'halloffame' ? 8 : 10, dir: 'up' }],
      zones: [{ x: 6, y: 1, w: 1, h: 1, event: 'c8seal' + (i + 1), block: true }],
      npcs: [{ x: 6, y: 4, dir: 'down', ...r.npc }] });
    on('c8seal' + (i + 1), { needs: ['!' + r.flag] }, async J => {
      await J.say(`A shimmering barrier seals the door. It will open once you have defeated ${r.who}.`);
      await J.playerWalk('down', 1);
    });
  });

  // ---- the Hall of Fame
  {
    const B = grid(13, 10, '+').border('#');
    B.fill(6, 3, 6, 9, 'R').fill(4, 3, 8, 4, 'R');
    def({ id: 'halloffame', name: 'Hall of Fame', kind: 'inside', chapter: 8, rows: B.rows(), music: 'gym',
      furniture: [{ k: 'machine', x: 5, y: 1, talk: 'c8hofMachine' }, { k: 'statue', x: 2, y: 2, talk: 'c8hofStatue' }, { k: 'statue', x: 10, y: 2, talk: 'c8hofStatue' },
        { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 11, y: 8 }],
      warps: [{ x: 6, y: 9, to: 'champion', tx: 6, ty: 2, dir: 'down' }],
      npcs: [{ id: 'aurelia', x: 8, y: 5, dir: 'left', look: L.c8aurelia, name: 'Champion Aurelia', talk: 'c8aureliaHof', show: ['c8champ'] }] });
  }

  // =====================================================================
  //  Events
  // =====================================================================
  // ---- Victory Road: the badge check
  on('c8guard', {}, (J, n) => J.say(J.flag('c8gate') ? ['Victory Road is a maze of rock and dark water. Your Pokémon will be tested at every turn.', 'The Pokémon League is at the top. Good luck, trainer.'] : 'This is Victory Road. Only trainers with all seven Gym Badges may go on. Step forward and I\'ll check yours.', n));
  on('c8gate', { needs: ['!c8gate'], sets: ['c8gate'] }, async J => {
    J.emote('guard', '!');
    await J.say('Halt! Let me see your badges.', 'guard');
    if (J.badges() < 7) {
      await J.say(`${J.badges()} of seven... I'm sorry. Come back when you have all seven Gym Badges.`, 'guard');
      await J.playerWalk('left', 1);
      return;
    }
    await J.say(['Leaf, Tide, Spark, Ember, Mind, Iron, Glacier... all seven, and every one of them earned.', 'Victory Road is open to you. The Pokémon League waits at the top!'], 'guard');
    J.set('c8gate'); J.refresh();
  });

  // ---- Sora's last battle, near the top of Victory Road
  on('c8sora', { needs: ['!c8rival'], sets: ['c8rival'] }, async J => {
    J.emote('sora', '!');
    await J.say(['{NAME}! I knew it. I KNEW you\'d come up this way.', 'Hey... remember the day we got our first Pokémon? Same lab, same morning. You were still in your pajamas.', 'Seven badges each. One road. One League at the end of it.', 'Before you go through those doors, I need to know which of us has grown more. No holding back - not today!'], 'sora');
    const rs = J.get('rivalStarter') || 'eevee';
    await J.battle({ id: 'c8rival', name: 'Sora', look: 'sora', team: [['staraptor', 52], ['luxray', 53], ['gyarados', 53], ['togekiss', 54], ['lucario', 54], [J.grown(rs, 55), 55]], pay: 60, theme: 'volcano', canLose: true,
      before: 'This is the one that counts!', lose: '...Yeah. Yeah, that was you. All you.', win: 'I did it! ...But it doesn\'t feel like the end.' });
    if (J.lastWin()) await J.say(['Ha... You know what? I\'m not even mad.', 'We started on the same day, with the same Professor, in the same little town. And you just kept going.', 'Go show the Champion what that looks like. I\'ll be right behind you - watching.'], 'sora');
    else await J.say(['I won... but you\'re not done, I can tell. You never are.', 'Go on, {NAME}. The League\'s right up there. Show them what Willowbrook trainers are made of!'], 'sora');
    await J.say('Here - let me patch up your team. Can\'t have you walking in there half-beaten!', 'sora');
    await J.heal(true);
    await J.walk('sora', ['up', 2]);
    J.set('c8rival'); J.refresh();
  });

  // ---- the plateau
  on('c8soraLeague', {}, (J, n) => J.say(['Look at it, {NAME}. The Pokémon League. We\'re really here.', 'I\'ll wait out here. When you come out as Champion, the first battle\'s mine. Deal?'], n));
  on('c8plateauVet', {}, (J, n) => J.say(['I made it this far forty years ago. Lost to the second of the Elite Four.', 'Inside, you face them one after another. Heal in the lobby first - you can always walk back to rest.'], n));
  on('c8lobbyGuard', {}, (J, n) => J.say(J.flag('champion') ? 'Champion {NAME}! The Elite Four are training for your next visit.' : ['Beyond this door are the Elite Four, and past them the Champion.', 'Each door opens once its master is beaten - and stays open. If you fall, you\'ll wake up here, and you can pick up where you left off.'], n));
  on('c8leagueStatue', {}, J => J.say(J.flag('champion') ? 'POKéMON LEAGUE\nChampion: {NAME}' : 'POKéMON LEAGUE\nChampion: AURELIA. Undefeated for eleven years.'));
  on('c8eliteStatue', {}, J => J.say('A golden Pokémon statue. Its eyes seem to follow you to the door.'));

  // ---- the Elite Four: each one opens the next door
  const opened = (flag, who, line) => async J => {
    J.set(flag); J.refresh();
    await J.say(line, who);
    await J.say('With a soft chime, the barrier on the far door fades away.');
  };
  on('c8e1Win', { sets: ['c8e1'] }, opened('c8e1', 'morrigan', 'The door behind me is open. Morrigan of the shadows bows to you.'));
  on('c8e2Win', { sets: ['c8e2'] }, opened('c8e2', 'bram', 'Go on through! I\'ll be doing push-ups until you come back.'));
  on('c8e3Win', { sets: ['c8e3'] }, opened('c8e3', 'seraphine', 'The future just changed. I like it.'));
  on('c8e4Win', { sets: ['c8e4'] }, opened('c8e4', 'talon', 'Go. The Champion has been waiting for you longer than you know.'));

  // ---- the Champion, and the Hall of Fame
  async function hallOfFame(J) {
    const G = typeof Journey !== 'undefined' && Journey._G ? Journey._G() : null;
    const party = G ? G.party : [], name = G ? G.name : 'Trainer';
    const nick = m => typeof Prog !== 'undefined' && Prog.nameOf ? Prog.nameOf(m) : J.dname(m.species);
    await J.say(['This is the Hall of Fame. Every Champion of Valoria, and every Pokémon who stood beside them, is remembered here.', 'Place your Poké Balls on the machine, {NAME}.'], 'aurelia');
    J.set('c8hofTeam', party.map(m => `${nick(m)} Lv. ${m.level}`).join(', '));
    for (const m of party) await J.say(`${nick(m)} - Lv. ${m.level} ${J.dname(m.species)}... registered!`);
    await J.chapter('Champion of Valoria!', `${name} and their Pokémon are entered into the Hall of Fame`);
    J.set('champion');
    await J.say(['The meteor\'s stones answer to the bond between a trainer and their Pokémon. Today all of Valoria saw yours.', 'Go home for a while, Champion. Someone there will want to hear all about it.'], 'aurelia');
    await J.travel('willowbrook', 12, 9, 'down');
    await J.say(['Back in Willowbrook, the town square is just as you left it on that first morning.', 'Mom is waiting at the door, and the lights are on in Professor Hazel\'s lab. Sora\'s Staraptor circles overhead.', 'The journey that began with one Pokémon from Hazel\'s lab is complete... but Valoria is wide, and there is always another road.']);
    await J.chapter('The End', 'Thank you for playing!');
  }
  on('c8champion', { sets: ['c8champ', 'champion', 'c8hofTeam'] }, async (J, n) => {
    if (J.flag('c8champ')) return J.say(J.flag('champion') ? 'Champion {NAME}. Come back whenever you want a rematch - I will be ready.' : 'The Hall of Fame is through the door behind me. Go on - it is yours.', n);
    await J.say(['So you are {NAME}. Morrigan, Bram, Seraphine, Talon... all four of them, in one day.', 'I am Aurelia, Champion of Valoria. When I was a girl, a golden bird came down from the sky and chose to stay with me. Everything I know about bonds began then.', 'I heard what you did at the Skyspire. The whole region did.'], n);
    if (await J.battle('c8aurelia', n) !== 'win') return;
    await J.say(['...It is over. And it is yours.', 'Congratulations, {NAME}. You are the new Champion of Valoria!'], n);
    J.set('c8champ'); J.refresh();
    await J.say('Come with me. There is one more room in the League - the one every trainer dreams of.', n);
    await J.travel('halloffame', 6, 6, 'up');
    await hallOfFame(J);
  });
  on('c8aureliaHof', {}, (J, n) => J.say(J.flag('champion') ? 'Your names are written here forever now. Mine is right beside them - one line up.' : 'The machine is waiting for your Pokémon, {NAME}.', n));
  on('c8hofMachine', { needs: ['c8champ'], sets: ['champion', 'c8hofTeam'] }, async J => {
    if (!J.flag('c8champ')) return J.say('The Hall of Fame machine is dark.');
    if (!J.flag('champion')) return hallOfFame(J);
    await J.say(`HALL OF FAME - Champion: {NAME}\n${J.get('c8hofTeam') || ''}`);
  });
  on('c8hofStatue', {}, J => J.say('A statue of a golden bird with rainbow wings. The plaque reads: "For every bond that carried a trainer here."'));

  chapter({ n: 8, title: 'Champion of Valoria', start: { map: 'victoryroad', x: 1, y: 10, dir: 'right' }, level: 50, badge: null, center: 'leaguelobby',
    goals: ['c8gate', 'c8rival', 'c8e1', 'c8e2', 'c8e3', 'c8e4', 'c8champ', 'champion'] });
})();
