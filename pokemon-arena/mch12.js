'use strict';
// =====================================================================
//  JOURNEY II - Chapter 12: The Council of Lights, the Epilogue and the
//  post-game. Dawn has come. East of Highwatch the Ashen Coast runs to
//  Emberlight, where Warden Solenne kept her Light burning by hand all
//  through the Long Night; then Victory Strand, and the Council of
//  Lights: four Councillors and the Champion - the Lamplighter, Ada,
//  who sealed the Echo once before, and Okafor's mother. The Hall of
//  Flight, and Lantern Night again in Tidemark: midnight passes, a new
//  day begins, Teo is back, and Juno races you to the pier.
//  Post-game: the Echo Rifts (an old amber, the three who keep memory,
//  a time-traveller) and rematches with Cassius, Okafor and Juno.
//  Story: docs/journey2/story.md · Build plan: docs/journey2/world.md
// =====================================================================
(() => {
  const { def, grid, L, M, center, mart, SPOTS } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES, T } = MStory;

  // ---- new people
  Object.assign(L, {
    m12hiker: { hat: 'beanie', hatColor: 0x8a3a2a, hatFront: 0x8a3a2a, hair: 0x3a2a1e, hairStyle: 'short', top: 0x8a6a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x4a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: 0x6a4a2a },
    m12acef: { hat: null, hair: 0xd85030, hairStyle: 'pigtails', top: 0x2a2a34, sleeves: 'short', inner: 0xf07a30, legs: 0x2a2a34, legStyle: 'skirt', shoes: 0xf07a30, bag: null },
    m12acem: { hat: null, hair: 0x1a1a24, hairStyle: 'spiky', top: 0xf4f0e8, sleeves: 'long', inner: 0xd85030, legs: 0x2a2a34, legStyle: 'pants', shoes: 0xd85030, bag: null, scarf: 0xd85030 },
    m12ranger: { hat: 'sunhat', hatColor: 0x5a6a3a, hatBand: 0xd85030, hair: 0x6a3a1a, hairStyle: 'long', top: 0x5a6a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: 0x7a5a30 },
    m12firekeep: { hat: 'bandana', hatColor: 0xd85030, hair: 0x2a1a14, hairStyle: 'short', top: 0x8a2a1a, sleeves: 'none', inner: 0xffd84a, legs: 0x3a2a1e, legStyle: 'pants', shoes: 0x2a1e14, bag: null, skin: '#a86a4a' },
    // the Council of Lights
    m12sibyl: { hat: null, hair: 0xe8e8f0, hairStyle: 'long', top: 0x6a4ab0, sleeves: 'long', inner: 0xf0d8ff, legs: 0x4a2a7a, legStyle: 'skirt', shoes: 0x2a1a3a, bag: null, scarf: 0xf0d048 },
    m12rook: { hat: null, hair: 0x1a1a24, hairStyle: 'spiky', top: 0x1a1a24, sleeves: 'long', inner: 0x6a2a3a, legs: 0x1a1a24, legStyle: 'pants', shoes: 0x0a0a10, bag: null, scarf: 0x6a2a3a, skin: '#c88a5a' },
    m12thane: { hat: 'bandana', hatColor: 0xc84828, hair: 0x5a3a20, hairStyle: 'short', top: 0xe8dcc0, sleeves: 'none', inner: 0xe8dcc0, legs: 0x3a2a1e, legStyle: 'pants', shoes: 0x2a1e14, bag: null, scarf: 0xc84828, skin: '#7a4a2a' },
    m12ione: { hat: null, hair: 0xf0d048, hairStyle: 'spiky', top: 0x2a3a5a, sleeves: 'long', inner: 0xf0d048, legs: 0x2a2a34, legStyle: 'skirt', shoes: 0xf0d048, bag: 0x5a5a68 },
    m12guard: { hat: 'cap', hatColor: 0xf4f0e8, hatFront: 0xd85030, hair: 0x2b1d14, hairStyle: 'short', top: 0xf4f0e8, sleeves: 'long', inner: 0xd85030, legs: 0x2a2a34, legStyle: 'pants', shoes: 0x2a2a34, bag: null }
  });

  // ---- items
  const tm = (move, name, desc) => { if (!ITEMS['tm:' + move]) ITEMS['tm:' + move] = { name: 'TM ' + name, pocket: 'tms', price: 0, tm: move, desc }; };
  tm('fire-blast', 'Fire Blast', 'Teaches Fire Blast: an all-consuming blast of fire that may burn the target.');
  tm('stone-edge', 'Stone Edge', 'Teaches Stone Edge: stabs with sharpened stones. Lands critical hits easily.');
  tm('dark-pulse', 'Dark Pulse', 'Teaches Dark Pulse: a horrible aura of dark thoughts that may make the target flinch.');
  tm('close-combat', 'Close Combat', 'Teaches Close Combat: an all-out brawl that lowers the user\'s defenses.');
  tm('dazzling-gleam', 'Dazzling Gleam', 'Teaches Dazzling Gleam: a blinding flash of light.');
  tm('thunder', 'Thunder', 'Teaches Thunder: a wicked thunderbolt that may paralyze the target.');
  Object.assign(ITEMS, {
    m12amber: { name: 'Old Amber', pocket: 'key', price: 0, desc: 'A lump of ancient amber from an Echo Rift. Something with wings is sleeping inside it. Aide Remy can wake it.' },
    m12letter: { name: 'Lantern Note', pocket: 'key', price: 0, desc: 'Nell\'s handwriting, found folded in the Hall of Flight: "Don\'t be late. Love, N." It is warm.' }
  });

  // ---- the clue notebook
  Object.assign(CLUES, {
    m12arrive: 'Dawn on the Ashen Coast. Emberlight, the last Light, is east - then Victory Strand, and the Council of Lights.',
    'badge.ember': 'Warden Solenne kept the Emberlight burning by hand the whole Long Night. The Ember Badge: all eight Lights!',
    m12gate: 'The Council of Lights: Sibyl (Psychic), Rook (Dark), Thane (Fighting), Ione (Electric)... and the Champion.',
    m12champ: 'The Champion was the Lamplighter - Ada. She sealed the Echo once, fifty years ago. And she is Okafor\'s mother.',
    m12hof: 'Why the Lost Days never touched me: I was born on Lantern Night, under a lighthouse Ada lit herself. The Lantern-folk\'s blessing.',
    m12newday: 'The day AFTER Lantern Night. Everyone remembers. Teo is back.',
    end: 'Juno and I raced to the end of the pier, like when we were little. The journey is over. The days go on.',
    m12riftopen: 'POST-GAME: the Echo Rifts are open. One is up a crack in the cliffs of the Ashen Coast.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // the Ashen Coast (52-55)
    m12brannoc: { team: [['graveler', 53], ['camerupt', 53], ['steelix', 54]], pay: 26, theme: 'volcano', look: 'm12hiker', name: 'Hiker Brannoc', before: 'Look at that! RED rocks! BLUE sky! I\'ve been hiking in grey for weeks. Celebrate with me!', lose: 'Still a great day. Best ordinary day ever.', after: 'Funny thing - I used to want every day to be perfect. Now I just want them to be different.' },
    m12lys: { team: [['rapidash', 54], ['skarmory', 54], ['kingdra', 55]], pay: 28, theme: 'volcano', look: 'm12acef', name: 'Ace Trainer Lys', before: 'Seven badges? Eight? Doesn\'t matter. You still go through me!', lose: 'Fine! Go get your eighth, then!', after: 'Solenne\'s Pokémon burn hot. Water, Rock and Ground cool them right down.' },
    m12ode: { team: [['sharpedo', 53], ['tentacruel', 53], ['gyarados', 54]], pay: 24, theme: 'beach', look: 'fisher', name: 'Fisher Ode', before: 'The fish are biting again! They stopped during the Long Night. Even fish need a tomorrow!', lose: 'Reeled in!', after: 'Black sand, white surf. I could stand here till the next Lantern Night.' },
    m12saoirse: { team: [['arcanine', 54], ['houndoom', 54], ['krookodile', 55]], pay: 28, theme: 'volcano', look: 'm12ranger', name: 'Ranger Saoirse', before: 'The Rifts in these cliffs have been humming since dawn. Something old is stirring. You first, though!', lose: 'You\'d do well in the Rifts. Later.', after: 'There\'s a crack in the cliffs up north-east that rings like a bell. Not yet, it says. Not yet.' },
    // Victory Strand (55-57)
    m12dov: { team: [['staraptor', 55], ['manectric', 55], ['ninetales', 56]], pay: 28, theme: 'beach', look: 'm12acem', name: 'Ace Trainer Dov', before: 'Victory Strand! Every trainer who walks this beach is headed for the Council. Most of them come back the same way!', lose: 'Guess you\'re going all the way.', after: 'Thane of the Council hits like a falling cliff. Psychic, Flying or Fairy moves land best.' },
    m12mira: { team: [['gardevoir', 55], ['espeon', 56], ['togekiss', 56]], pay: 28, theme: 'beach', look: 'm12acef', name: 'Ace Trainer Mira', before: 'I\'ve dreamed of the Council since I was little. Show me what a real challenger looks like!', lose: 'So that\'s what it looks like.', after: 'Rook keeps the dark. Fighting, Bug and Fairy moves - and a bright heart.' },
    m12ugo: { team: [['machamp', 56], ['hitmonlee', 55], ['lucario', 56]], pay: 26, theme: 'beach', look: 'c8belt', name: 'Black Belt Ugo', before: 'HYAH! I trained on this sand every day of the Long Night! The same day, over and over. I got VERY good at it!', lose: 'A new day... a new lesson!', after: 'Sibyl reads the future. Dark and Ghost moves are the one thing she never sees coming.' },
    m12pira: { team: [['dragonair', 56], ['gabite', 56], ['altaria', 57]], pay: 28, theme: 'beach', look: 'c8tamer', name: 'Dragon Tamer Pira', before: 'The Champion raised a Dragonite from an egg, they say. I want to see if you can handle mine!', lose: 'Tamed...', after: 'Ione\'s Electric Pokémon can\'t touch a Ground type. Bring one.' },
    // the Emberlight (56-60)
    m12gym1: { team: [['rapidash', 56], ['magmar', 57]], pay: 26, theme: 'volcano', look: 'm12firekeep', name: 'Firekeeper Cole', before: 'This Light never went out! Not for one second! Feel that heat? That\'s pride!', lose: 'Banked my coals...', after: 'Solenne fed the lamp with her own Pokémon\'s fire, day and night. Nobody ever saw her sleep.' },
    m12gym2: { team: [['ninetales', 57], ['houndoom', 57]], pay: 26, theme: 'volcano', look: 'm12acef', name: 'Firekeeper Brynn', before: 'Mind the lava! The Warden says it keeps visitors honest!', lose: 'I got singed. By you!', after: 'Water and Ground moves. And maybe something to cure burns.' },
    m12gym3: { team: [['camerupt', 57], ['arcanine', 58]], pay: 26, theme: 'volcano', look: 'm12firekeep', name: 'Firekeeper Idris', before: 'Last step to the lamp room. The Warden\'s waiting. She\'s grumpy. She\'s always grumpy. Good luck!', lose: 'Burned out!', after: 'Go on up. Say hi from Idris. She won\'t say hi back.' },
    m12solenne: { team: [['ninetales', 57], ['camerupt', 57], ['magmortar', 58], ['volcarona', 59], ['arcanine', 60]], pay: 110, theme: 'volcano', gym: 8, onWin: 'm12solenneWin', look: 'solenne', name: 'Warden Solenne',
      before: 'Seven Wardens slept through the Long Night. I didn\'t. Let\'s see if your fire burns hotter than mine!', lose: '...Hotter than my Light. Fine. FINE. You win.' },
    // the Council of Lights (58-61)
    m12sibyl: { team: [['espeon', 58], ['slowbro', 58], ['meowstic', 58], ['gallade', 59], ['alakazam', 60]], pay: 110, theme: 'stadium', onWin: 'm12c1Win', look: 'm12sibyl', name: 'Councillor Sibyl',
      before: 'Every Lantern Night for forty years I saw the same future: grey. This morning, I saw nothing at all. Surprise me!', lose: 'Unforeseen. Delightfully unforeseen.', after: 'Go on. Rook is next. He is softer than he looks. Do not tell him I said so.' },
    m12rook: { team: [['umbreon', 59], ['weavile', 59], ['krookodile', 59], ['zoroark', 60], ['kingambit', 60]], pay: 110, theme: 'stadium', onWin: 'm12c2Win', look: 'm12rook', name: 'Councillor Rook',
      before: 'I keep the dark between the Lights. People fear it. They shouldn\'t. Show me you can walk through it!', lose: 'You carry your own light. Good.', after: 'Thane is next. He will want to shake your hand. Do not let him.' },
    m12thane: { team: [['hitmontop', 59], ['poliwrath', 59], ['medicham', 60], ['annihilape', 60], ['machamp', 61]], pay: 110, theme: 'stadium', onWin: 'm12c3Win', look: 'm12thane', name: 'Councillor Thane',
      before: 'THANE! Hearth and fist! I held the Highwatch pass all through the Long Night! Show me your spirit!', lose: 'HA! My knuckles are ringing like a bell!', after: 'Ione guards the last door. Mind her sparks.' },
    m12ione: { team: [['jolteon', 60], ['eelektross', 60], ['luxray', 60], ['magnezone', 61], ['electivire', 61]], pay: 110, theme: 'stadium', onWin: 'm12c4Win', look: 'm12ione', name: 'Councillor Ione',
      before: 'I wired every lighthouse in Meridia. Then I sold the Lumen Company my plans for the Great Lantern, and never asked why. I\'m asking now - of you!', lose: 'The current\'s yours. Go on. She\'s waiting.', after: 'The Champion has been Champion for fifty years. She has never once been late.' },
    m12ada: { team: [['lapras', 64], ['florges', 63], ['hydreigon', 64], ['gardevoir', 63], ['chandelure', 64], ['dragonite', 66]], pay: 220, theme: 'stadium', look: 'ada', name: 'Champion Ada',
      before: 'Show me everything you remembered, when no one else could!', lose: '...There it is. A light that has seen the dark and kept walking.', win: 'Not yet, little lamp. But you are close.' }
  });

  // =====================================================================
  //  The Ashen Coast - from Highwatch down to the sea: black sand, ash
  //  fields under the mountains, lava pools, and a crack in the cliffs
  //  that rings like a bell (an Echo Rift, open after the story)
  // =====================================================================
  {
    const B = grid(40, 22, '.').border('r', { w: [12, 14], e: [8, 10] }, 1);
    B.fill(1, 1, 38, 6, 'o');                                         // the ash fields
    B.fill(1, 17, 38, 18, ':').fill(1, 19, 38, 20, '~');              // black sand, and the sea
    B.fill(3, 8, 9, 10, ';').fill(15, 13, 20, 16, ';').fill(24, 4, 28, 6, ';').fill(26, 11, 29, 12, ';').fill(33, 2, 37, 5, ';');
    B.fill(5, 2, 8, 4, 'L').fill(18, 2, 21, 3, 'L').fill(34, 12, 37, 15, 'L');
    // the road: in from Highwatch, north, east, south, east, north, and out to Emberlight
    B.fill(0, 12, 12, 14, ',').fill(10, 8, 12, 14, ',').fill(10, 8, 25, 10, ',').fill(23, 8, 25, 15, ',').fill(23, 13, 32, 15, ',').fill(30, 8, 32, 15, ',').fill(30, 8, 39, 10, ',');
    B.fill(1, 11, 6, 11, 'r').fill(1, 15, 6, 15, 'r');                // the narrow mouth of the coast road
    B.fill(29, 1, 29, 3, 'r').fill(31, 1, 31, 3, 'r').fill(30, 1, 30, 2, 'P');   // the Rift crack in the cliffs
    for (const [x, y] of [[14, 3], [3, 5], [11, 2], [16, 6], [27, 2], [36, 7], [2, 16], [9, 16], [27, 16], [38, 16], [21, 12], [19, 7]]) B.put(x, y, 'r');
    def({ id: 'ashencoast', name: 'Ashen Coast', kind: 'route', rows: B.rows(), music: 'route', battle: 'volcano',
      encounters: { tall: { rate: 0.1, min: 50, max: 54, table: [['camerupt', 14], ['rapidash', 12], ['houndoom', 12], ['magmar', 10], ['graveler', 12], ['krokorok', 12], ['skarmory', 8], ['golbat', 10], ['larvesta', 2]] } },
      edges: { w: { to: 'highwatch', dy: 0 }, e: { to: 'emberlight', dy: 0 } },
      warps: [{ x: 30, y: 1, to: 'rift1', tx: 14, ty: 17, dir: 'up' }],
      zones: [{ x: 3, y: 12, w: 1, h: 3, event: 'm12arrive' }, { x: 30, y: 3, w: 1, h: 1, event: 'm12riftShut', block: true }],
      signs: [{ x: 8, y: 11, text: 'ASHEN COAST\nWest: Highwatch · East: Emberlight' }, { x: 33, y: 7, text: 'DANGER: the cliffs here ring like a bell at night.\nThe Ranger Corps advises: do NOT climb into the crack.' }],
      items: [{ x: 38, y: 1, item: 'ultra', n: 3 }, { x: 1, y: 17, item: 'hyperpotion', n: 1, hidden: true }, { x: 6, y: 6, item: 'revive', n: 1 },
        { x: 21, y: 5, item: 'rarecandy', n: 1, hidden: true }, { x: 37, y: 18, item: 'tm:stone-edge', n: 1 }, { x: 15, y: 11, item: 'fullheal', n: 2, hidden: true }],
      npcs: [{ id: 'brannoc', x: 17, y: 9, dir: 'left', look: L.m12hiker, name: 'Hiker Brannoc', trainer: 'm12brannoc' },
        { id: 'lys', x: 24, y: 12, dir: 'up', look: L.m12acef, name: 'Ace Trainer Lys', trainer: 'm12lys' },
        { id: 'ode', x: 12, y: 17, dir: 'up', look: L.fisher, name: 'Fisher Ode', trainer: 'm12ode' },
        { id: 'saoirse', x: 28, y: 12, dir: 'left', look: L.m12ranger, name: 'Ranger Saoirse', trainer: 'm12saoirse' },
        { id: 'abel', x: 7, y: 12, dir: 'down', look: L.keeper, name: 'Former Lightkeeper Abel', talk: 'm12abel' },
        { id: 'remy', x: 32, y: 4, dir: 'left', look: L.aide, name: 'Aide Remy', talk: 'm12remy', show: ['end'] }] });
  }

  // =====================================================================
  //  Emberlight - a town of red roofs on the volcanic coast, under the
  //  eighth Light, which never went out
  // =====================================================================
  {
    const B = grid(32, 26, '.').border('r', { w: [8, 10], e: [14, 16] }, 1);
    B.fill(1, 20, 30, 21, ':').fill(1, 22, 30, 24, '~');             // the beach and the sea
    B.fill(0, 8, 28, 10, 'u');                                        // the main street
    B.fill(15, 10, 16, 19, 'u').fill(15, 20, 16, 24, 'b');            // down to the pier
    B.fill(18, 10, 20, 16, 'u').fill(18, 14, 31, 16, 'u');            // and east to Victory Strand
    B.fill(22, 11, 28, 12, '*').fill(2, 17, 9, 19, 'o').fill(22, 18, 27, 19, 'o').fill(28, 18, 29, 19, 'L');
    B.fill(29, 2, 30, 6, 'o');
    for (const [x, y] of [[1, 1], [9, 1], [21, 2], [30, 12], [1, 16], [13, 18]]) B.put(x, y, 'r');
    def({ id: 'emberlight', name: 'Emberlight', kind: 'town', rows: B.rows(), music: 'town', battle: 'volcano', fly: { x: 19, y: 11 },
      buildings: [{ b: 'center', x: 3, y: 2, to: 'embercenter' }, { b: 'mart', x: 10, y: 3, to: 'embermart' },
        { b: 'lighthouse', x: 24, y: 1, to: 'embergym', variant: 7 },
        { b: 'house', x: 3, y: 12, to: 'm12house1', variant: 3 }, { b: 'house3', x: 9, y: 12, to: 'm12house2' }],
      signs: [{ x: 1, y: 7, text: 'EMBERLIGHT\nThe Light that never went out.' }, { x: 29, y: 8, text: 'THE EMBERLIGHT\nWarden: SOLENNE\nThe eighth of the Eight Lights of Meridia.' },
        { x: 21, y: 17, text: 'EAST: VICTORY STRAND\nand the Council of Lights' }],
      props: [{ k: 'lamp', x: 14, y: 7 }, { k: 'lamp', x: 21, y: 7 }, { k: 'lamp', x: 17, y: 13 }, { k: 'mailbox', x: 2, y: 15 }],
      edges: { w: { to: 'ashencoast', dy: 0 }, e: { to: 'victorystrand', dy: 0 } },
      items: [{ x: 1, y: 19, item: 'ultra', n: 2, hidden: true }, { x: 30, y: 2, item: 'hyperpotion', n: 2 }, { x: 27, y: 20, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'ozzie', x: 8, y: 9, dir: 'right', look: L.oldman, name: 'Old Ozzie', wander: 2, talk: 'm12ozzie' },
        { id: 'kit', x: 23, y: 19, dir: 'down', look: L.kid, name: 'Kit', wander: 2, talk: 'm12kit' },
        { id: 'tess', x: 13, y: 9, dir: 'down', look: L.keeperf, name: 'Former Lightkeeper Tess', talk: 'm12tess' },
        { id: 'sailor', x: 16, y: 23, dir: 'down', look: L.sailor, name: 'Sailor Bram', talk: 'm12sailor' },
        { id: 'juno', x: 19, y: 12, dir: 'left', look: L.juno, name: 'Juno', talk: 'm12junoEmber', show: ['!badge.ember'] }] });
  }
  center('embercenter', 'emberlight', { chapter: 12 });
  mart('embermart', 'emberlight', ['ultra', 'great', 'hyperpotion', 'superpotion', 'fullheal', 'burnheal', 'revive', 'repel'], { chapter: 12 });
  def({ id: 'm12house1', name: 'House', kind: 'inside', outside: 'emberlight', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'stove', x: 4, y: 1 }, { k: 'table', x: 5, y: 3 }, { k: 'plant', x: 7, y: 1 }, { k: 'tv', x: 6, y: 1, talk: 'tv' }],
    npcs: [{ id: 'dad', x: 2, y: 4, dir: 'right', look: L.man, name: 'Mr. Hale', talk: 'm12dad' }, { id: 'tot', x: 6, y: 5, dir: 'left', look: L.kid, name: 'Pim', talk: 'm12pim' }] });
  def({ id: 'm12house2', name: 'Solenne\'s House', kind: 'inside', outside: 'emberlight', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'bed', x: 1, y: 1 }, { k: 'shelf', x: 3, y: 1, talk: 'm12soShelf' }, { k: 'desk', x: 6, y: 3, talk: 'm12soDesk' }, { k: 'plant', x: 7, y: 1 }],
    npcs: [{ id: 'gran', x: 3, y: 4, dir: 'right', look: L.oldlady, name: 'Granny Ember', talk: 'm12gran' }] });

  // ---- the Emberlight: Warden Solenne's gym. Lava channels with one gap each, zig-zagging up to the stairs
  {
    const B = grid(15, 14, 'g').border('#').fill(1, 13, 13, 13, 'g').put(7, 13, 'm').put(7, 1, '<');
    B.fill(1, 10, 5, 10, 'L').fill(9, 10, 13, 10, 'L').fill(3, 7, 13, 7, 'L').fill(1, 4, 11, 4, 'L');
    def({ id: 'embergym', name: 'The Emberlight', kind: 'inside', gym: true, outside: 'emberlight', battle: 'volcano', music: 'gym', rows: B.rows(), arrive: { x: 7, y: 12 },
      furniture: [{ k: 'statue', x: 5, y: 12, talk: 'm12gymStatue' }, { k: 'statue', x: 9, y: 12, talk: 'm12gymStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }],
      warps: [{ x: 7, y: 1, to: 'embergym2', tx: 5, ty: 6, dir: 'up' }],
      npcs: [{ id: 'g1', x: 12, y: 11, dir: 'left', look: L.m12firekeep, name: 'Firekeeper Cole', trainer: 'm12gym1' },
        { id: 'g2', x: 9, y: 8, dir: 'left', look: L.m12acef, name: 'Firekeeper Brynn', trainer: 'm12gym2' },
        { id: 'g3', x: 6, y: 5, dir: 'right', look: L.m12firekeep, name: 'Firekeeper Idris', trainer: 'm12gym3' },
        { id: 'guide', x: 2, y: 12, dir: 'right', look: L.worker, name: 'Gym Guide', talk: 'm12guide' }] });
    def({ id: 'embergym2', name: 'The Emberlight - Lamp Room', kind: 'inside', gym: true, battle: 'volcano', music: 'gym',
      rows: grid(11, 9, 'g').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').fill(1, 6, 2, 7, 'L').fill(8, 6, 9, 7, 'L').rows(),
      furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm12lamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }],
      warps: [{ x: 5, y: 7, to: 'embergym', tx: 7, ty: 2, dir: 'down' }],
      npcs: [{ id: 'solenne', x: 5, y: 2, dir: 'down', look: L.solenne, name: 'Warden Solenne', trainer: 'm12solenne' }] });
  }
  // where Solenne stands when a chapter asks for the Wardens in their towns
  SPOTS.solenne = { map: 'emberlight', x: 25, y: 11, dir: 'down' };

  // =====================================================================
  //  Victory Strand - a long black-sand beach under the cliffs, the last
  //  road to the Council of Lights
  // =====================================================================
  {
    const B = grid(40, 22, '.').border('r', { w: [14, 16], n: [30, 32] }, 1);
    B.fill(1, 18, 38, 19, ':').fill(1, 20, 38, 20, '~');
    B.fill(3, 3, 10, 8, ';').fill(16, 13, 22, 16, ';').fill(28, 9, 37, 14, ';').fill(15, 2, 21, 6, ';');
    B.fill(34, 1, 38, 5, 'p').fill(1, 1, 2, 12, 'p');
    B.fill(0, 14, 14, 16, ',').fill(12, 9, 14, 16, ',').fill(12, 9, 26, 11, ',').fill(24, 4, 26, 11, ',').fill(24, 4, 32, 6, ',').fill(30, 0, 32, 6, ',');
    B.fill(16, 12, 22, 12, 'v').fill(28, 15, 36, 15, 'v');
    for (const [x, y] of [[6, 11], [9, 13], [20, 8], [28, 2], [36, 8], [4, 16], [34, 17], [23, 17]]) B.put(x, y, 'r');
    def({ id: 'victorystrand', name: 'Victory Strand', kind: 'route', rows: B.rows(), music: 'route', battle: 'beach',
      encounters: { tall: { rate: 0.1, min: 53, max: 56, table: [['rapidash', 10], ['staraptor', 10], ['pelipper', 12], ['skarmory', 10], ['houndoom', 10], ['manectric', 10], ['arcanine', 8], ['ninetales', 6], ['gabite', 6], ['dragonair', 6]] } },
      edges: { w: { to: 'emberlight', dy: 0 }, n: { to: 'council', dx: -17 } },
      signs: [{ x: 11, y: 17, text: 'VICTORY STRAND\nNorth: the Council of Lights' }],
      items: [{ x: 37, y: 13, item: 'tm:dark-pulse', n: 1 }, { x: 3, y: 3, item: 'ultra', n: 2 }, { x: 38, y: 17, item: 'maxrevive', n: 1, hidden: true },
        { x: 18, y: 4, item: 'hyperpotion', n: 2, hidden: true }, { x: 8, y: 17, item: 'revive', n: 2 }, { x: 22, y: 14, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'dov', x: 9, y: 15, dir: 'left', look: L.m12acem, name: 'Ace Trainer Dov', trainer: 'm12dov' },
        { id: 'mira', x: 19, y: 10, dir: 'down', look: L.m12acef, name: 'Ace Trainer Mira', trainer: 'm12mira' },
        { id: 'ugo', x: 25, y: 7, dir: 'left', look: L.c8belt, name: 'Black Belt Ugo', trainer: 'm12ugo' },
        { id: 'pira', x: 29, y: 5, dir: 'down', look: L.c8tamer, name: 'Dragon Tamer Pira', trainer: 'm12pira' },
        { id: 'shell', x: 26, y: 17, dir: 'down', look: L.lass, name: 'Shell Collector Wynn', wander: 2, talk: 'm12wynn' }] });
  }

  // =====================================================================
  //  The Council of Lights - the League grounds on the headland: a white
  //  spire with a lamp at the top, and a gate that counts your badges
  // =====================================================================
  {
    const B = grid(30, 24, '.').border('T', { s: [13, 15] }, 1);
    B.fill(1, 1, 28, 1, 'p').fill(1, 1, 1, 22, 'p').fill(28, 1, 28, 22, 'p');
    B.fill(13, 11, 15, 23, ',').fill(5, 12, 24, 13, ',');            // the road and the plaza
    B.fill(2, 19, 12, 19, 'f').fill(16, 19, 27, 19, 'f');              // the gate fence
    B.fill(4, 15, 10, 17, '*').fill(18, 15, 25, 17, '*').fill(3, 3, 8, 8, '*').fill(21, 3, 26, 8, '*');
    for (const [x, y] of [[4, 21], [24, 21], [10, 2], [19, 2]]) B.put(x, y, 'r');
    def({ id: 'council', name: 'Council of Lights', kind: 'town', rows: B.rows(), music: 'town', battle: 'stadium', fly: { x: 14, y: 15 },
      buildings: [{ b: 'tower', x: 11, y: 3, to: 'councilhall' }],
      edges: { s: { to: 'victorystrand', dx: 17 } },
      zones: [{ x: 13, y: 19, w: 3, h: 1, event: 'm12gate', block: true }],
      signs: [{ x: 16, y: 21, text: 'THE COUNCIL OF LIGHTS\nSight · Shadow · Strength · Spark\n...and the Champion.' }, { x: 12, y: 11, text: 'Here every Light of Meridia is remembered.' }],
      props: [{ k: 'lamp', x: 10, y: 11 }, { k: 'lamp', x: 18, y: 11 }, { k: 'lamp', x: 12, y: 18 }, { k: 'lamp', x: 16, y: 18 }],
      items: [{ x: 2, y: 21, item: 'ultra', n: 2, hidden: true }, { x: 26, y: 14, item: 'tm:dazzling-gleam', n: 1 }],
      npcs: [{ id: 'guard', x: 12, y: 20, dir: 'right', look: L.m12guard, name: 'Council Guard', talk: 'm12guard' },
        { id: 'juno', x: 17, y: 13, dir: 'left', look: L.juno, name: 'Juno', talk: 'm12junoCouncil', show: ['m12gate', '!m12champ'] },
        { id: 'vet', x: 7, y: 13, dir: 'right', look: L.c8vet, name: 'Old Challenger Fen', wander: 2, talk: 'm12fen' }] });
  }

  // ---- the Council hall: a Pokémon Center and a shop in one (a whiteout comes back here)
  {
    const B = grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm');
    B.fill(7, 0, 7, 8, 'R');
    def({ id: 'councilhall', name: 'Council of Lights', kind: 'inside', outside: 'council', isCenter: true, rows: B.rows(),
      stock: ['ultra', 'great', 'hyperpotion', 'superpotion', 'fullheal', 'revive', 'repel'],
      arrive: { x: 7, y: 8 },
      furniture: [{ k: 'counter', x: 1, y: 4 }, { k: 'healer', x: 4, y: 3 }, { k: 'counter', x: 10, y: 4 }, { k: 'martshelf', x: 10, y: 1 }, { k: 'pc', x: 1, y: 1, talk: 'boxPc' },
        { k: 'statue', x: 6, y: 1, talk: 'm12hallStatue' }, { k: 'statue', x: 8, y: 1, talk: 'm12hallStatue' }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }, { k: 'sofa', x: 11, y: 7 }],
      warps: [{ x: 7, y: 0, to: 'council1', tx: 6, ty: 10, dir: 'up' }],
      npcs: [{ id: 'nurse', x: 2, y: 3, dir: 'down', look: L.nurse, name: 'Nurse Bell', talk: 'nurse', counter: true },
        { id: 'clerk', x: 12, y: 3, dir: 'down', look: L.clerk, name: 'Clerk', talk: 'clerk', counter: true },
        { id: 'hguard', x: 9, y: 2, dir: 'down', look: L.m12guard, name: 'Council Guard', talk: 'm12hallGuard' }] });
  }

  // ---- the four Councillors' rooms in a row, then the Champion's: in at the bottom, on through the top door - sealed
  // (a blocking zone) until the room's master is beaten. The flags stay, so a whiteout keeps your place.
  const ROOMS = [
    { id: 'council1', name: 'Council of Lights - Sight', floor: 'P', npc: { id: 'sibyl', look: L.m12sibyl, name: 'Councillor Sibyl', trainer: 'm12sibyl' }, flag: 'm12c1', who: 'Councillor Sibyl',
      paint: B => B.fill(1, 6, 3, 9, '*').fill(9, 6, 11, 9, '*') },
    { id: 'council2', name: 'Council of Lights - Shadow', floor: 'o', npc: { id: 'rook', look: L.m12rook, name: 'Councillor Rook', trainer: 'm12rook' }, flag: 'm12c2', who: 'Councillor Rook',
      paint: B => B.fill(1, 3, 2, 9, 'k').fill(10, 3, 11, 9, 'k') },
    { id: 'council3', name: 'Council of Lights - Strength', floor: 'c', npc: { id: 'thane', look: L.m12thane, name: 'Councillor Thane', trainer: 'm12thane' }, flag: 'm12c3', who: 'Councillor Thane',
      paint: B => { for (const [x, y] of [[2, 3], [10, 3], [2, 8], [10, 8], [3, 6], [9, 6], [1, 5], [11, 5]]) B.put(x, y, 'r'); } },
    { id: 'council4', name: 'Council of Lights - Spark', floor: 'h', npc: { id: 'ione', look: L.m12ione, name: 'Councillor Ione', trainer: 'm12ione' }, flag: 'm12c4', who: 'Councillor Ione',
      paint: B => B.fill(1, 2, 2, 9, '=').fill(10, 2, 11, 9, '=') },
    { id: 'championroom', name: 'Champion\'s Room', floor: 'b', npc: { id: 'ada', look: L.ada, name: 'Champion Ada', talk: 'm12champ' }, flag: 'm12champ', who: 'the Champion',
      paint: B => B.fill(1, 1, 2, 10, '~').fill(10, 1, 11, 10, '~') }
  ];
  ROOMS.forEach((r, i) => {
    const B = grid(13, 12, r.floor).border('#');
    r.paint(B);
    B.fill(6, 0, 6, 11, 'R').fill(5, 2, 7, 4, 'R');
    const prev = i ? { to: ROOMS[i - 1].id, tx: 6, ty: 2 } : { to: 'councilhall', tx: 7, ty: 1 };
    const next = ROOMS[i + 1] ? ROOMS[i + 1].id : 'hallofflight';
    def({ id: r.id, name: r.name, kind: 'inside', rows: B.rows(), battle: 'stadium', music: 'gym',
      furniture: [{ k: 'statue', x: 5, y: 1, talk: 'm12roomStatue' }, { k: 'statue', x: 7, y: 1, talk: 'm12roomStatue' }, { k: 'plant', x: 3, y: 10 }, { k: 'plant', x: 9, y: 10 }],
      warps: [{ x: 6, y: 11, ...prev, dir: 'down' }, { x: 6, y: 0, to: next, tx: 6, ty: next === 'hallofflight' ? 8 : 10, dir: 'up' }],
      zones: [{ x: 6, y: 1, w: 1, h: 1, event: 'm12seal' + (i + 1), block: true }],
      npcs: [{ x: 6, y: 4, dir: 'down', ...r.npc }] });
    on('m12seal' + (i + 1), { needs: ['!' + r.flag] }, async J => {
      await J.say(`A curtain of warm light seals the door. It will open once you have defeated ${r.who}.`);
      await J.playerWalk('down', 1);
    });
  });

  // ---- the Hall of Flight
  {
    const B = grid(13, 10, '+').border('#');
    B.fill(6, 3, 6, 9, 'R').fill(4, 3, 8, 4, 'R');
    def({ id: 'hallofflight', name: 'Hall of Flight', kind: 'inside', rows: B.rows(), music: 'gym',
      furniture: [{ k: 'machine', x: 5, y: 1, talk: 'm12hofMachine' }, { k: 'statue', x: 2, y: 2, talk: 'm12hofStatue' }, { k: 'statue', x: 10, y: 2, talk: 'm12hofStatue' },
        { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 11, y: 8 }],
      warps: [{ x: 6, y: 9, to: 'championroom', tx: 6, ty: 2, dir: 'down' }],
      items: [{ x: 10, y: 7, item: 'm12letter', n: 1, hidden: true }],
      npcs: [{ id: 'ada', x: 8, y: 5, dir: 'left', look: L.ada, name: 'Champion Ada', talk: 'm12hof', show: ['m12champ'] },
        { id: 'okafor', x: 4, y: 5, dir: 'right', look: L.okafor, name: 'Prof. Okafor', talk: 'm12okHall', show: ['m12champ'] }] });
  }

  // =====================================================================
  //  Post-game: the Echo Rifts - three places the Echo let fall out of
  //  time when it closed, one behind another, up a crack in the cliffs
  //  of the Ashen Coast
  // =====================================================================
  {
    // the Amber Hollow: a cave of old amber; the idol of Uxie
    const B = grid(30, 20, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(12, 14, 16, 18); carve(14, 19, 14, 19, 'P');
    carve(5, 9, 24, 13); carve(13, 13, 15, 14);
    carve(2, 2, 8, 9); carve(20, 2, 27, 9); carve(8, 5, 20, 6);
    B.fill(3, 3, 4, 4, ':').fill(25, 7, 26, 8, ':').fill(10, 11, 12, 12, ':').fill(24, 2, 24, 2, 'P');
    for (const [x, y] of [[6, 11], [18, 10], [22, 12], [2, 8], [27, 4], [12, 16]]) B.put(x, y, 'r');
    def({ id: 'rift1', name: 'Echo Rift - The Amber Hollow', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.3,
      encounters: { cave: { rate: 0.09, min: 56, max: 60, table: [['golett', 14], ['golurk', 8], ['sableye', 14], ['gabite', 12], ['pupitar', 10], ['lairon', 12], ['spiritomb', 6], ['aerodactyl', 4]] } },
      warps: [{ x: 14, y: 19, to: 'ashencoast', tx: 30, ty: 2, dir: 'down' }, { x: 24, y: 2, to: 'rift2', tx: 3, ty: 17, dir: 'up' }],
      furniture: [{ k: 'statue', x: 5, y: 2, talk: 'm12uxie' }],
      items: [{ x: 3, y: 8, item: 'm12amber', n: 1 }, { x: 23, y: 13, item: 'ultra', n: 3 }, { x: 8, y: 9, item: 'rarecandy', n: 1, hidden: true }, { x: 27, y: 9, item: 'maxrevive', n: 1 }],
      npcs: [] });
  }
  {
    // the Frozen Hour: a moment of snow that never finished falling; the idol of Mesprit
    const B = grid(30, 20, 'C');
    const carve = (x0, y0, x1, y1, c = 'n') => B.fill(x0, y0, x1, y1, c);
    carve(1, 15, 8, 18); carve(3, 19, 3, 19, 'C');
    carve(4, 4, 7, 15); carve(4, 4, 25, 7); carve(22, 4, 25, 16); carve(10, 12, 25, 16); carve(10, 9, 12, 12);
    B.fill(14, 5, 18, 6, 'i').fill(15, 13, 20, 14, 'i').put(3, 18, 'P').put(25, 4, 'P');
    for (const [x, y] of [[5, 10], [9, 6], [20, 5], [23, 10], [13, 15], [7, 17]]) B.put(x, y, 'r');
    def({ id: 'rift2', name: 'Echo Rift - The Frozen Hour', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.2,
      encounters: { snow: { rate: 0.09, min: 57, max: 61, table: [['frigibax', 10], ['arctibax', 6], ['froslass', 12], ['glalie', 12], ['sneasel', 12], ['weavile', 8], ['dreepy', 6], ['drakloak', 4], ['misdreavus', 10], ['rotom', 6]] } },
      warps: [{ x: 3, y: 18, to: 'rift1', tx: 24, ty: 3, dir: 'down' }, { x: 25, y: 4, to: 'rift3', tx: 11, ty: 15, dir: 'up' }],
      furniture: [{ k: 'statue', x: 11, y: 9, talk: 'm12mesprit' }],
      items: [{ x: 24, y: 16, item: 'ultra', n: 3 }, { x: 1, y: 15, item: 'hyperpotion', n: 2, hidden: true }, { x: 4, y: 4, item: 'tm:thunder', n: 1 }, { x: 16, y: 12, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [] });
  }
  {
    // the First Night: where the Lantern-folk first sealed the Echo; the idol of Azelf, and a time-traveller at the heart
    const B = grid(24, 18, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(9, 12, 13, 16); carve(11, 16, 11, 16, 'P');
    carve(3, 8, 20, 12); carve(3, 3, 6, 8); carve(17, 3, 20, 8); carve(11, 1, 11, 8);
    B.fill(9, 9, 13, 10, 'P').fill(4, 4, 5, 5, 'P').fill(18, 4, 19, 5, 'P');
    def({ id: 'rift3', name: 'Echo Rift - The First Night', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.35,
      encounters: { cave: { rate: 0.09, min: 58, max: 63, table: [['deino', 8], ['zweilous', 6], ['larvesta', 8], ['beldum', 6], ['gimmighoul', 8], ['porygon', 6], ['chingling', 10], ['chimecho', 10], ['dusclops', 10], ['lampent', 12], ['mismagius', 6]] } },
      warps: [{ x: 11, y: 16, to: 'rift2', tx: 25, ty: 5, dir: 'down' }],
      furniture: [{ k: 'statue', x: 18, y: 3, talk: 'm12azelf' }],
      zones: [{ x: 11, y: 3, w: 1, h: 1, event: 'm12celebi' }],
      items: [{ x: 3, y: 3, item: 'tm:close-combat', n: 1 }, { x: 20, y: 11, item: 'maxrevive', n: 1 }, { x: 11, y: 1, item: 'master', n: 1, hidden: true }],
      npcs: [] });
  }

  for (const id of ['ashencoast', 'emberlight', 'embercenter', 'embermart', 'm12house1', 'm12house2', 'embergym', 'embergym2', 'victorystrand', 'council', 'councilhall',
    ...ROOMS.map(r => r.id), 'hallofflight', 'rift1', 'rift2', 'rift3']) M[id].chapter = 12;

  // =====================================================================
  //  The Epilogue in Tidemark: Lantern Night again, then the morning
  //  after. These people join the Prologue's map (they only show once
  //  the epilogue has begun).
  // =====================================================================
  if (M.tidemark) {
    const t = M.tidemark;
    if (!t.dock) t.dock = { x: 14, y: 15, dir: 'down' };    // where the epilogue sets you down (the checker lands there too)
    t.npcs.push({ id: 'm12juno', x: 14, y: 17, dir: 'up', look: L.juno, name: 'Juno', talk: 'm12junoRace', show: ['m12newday', '!m12race'] },
      { id: 'm12teo', x: 15, y: 17, dir: 'up', look: L.teo, name: 'Teo', talk: 'm12teo', show: ['m12newday'] },
      { id: 'm12mom', x: 12, y: 17, dir: 'up', look: L.mom, name: 'Mom', talk: 'm12mom', show: ['m12newday'] },
      { id: 'm12okafor', x: 13, y: 12, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm12okafor', show: ['m12newday'] },
      { id: 'm12ada', x: 15, y: 12, dir: 'down', look: L.ada, name: 'Ada', talk: 'm12adaHome', show: ['m12newday'] },
      { id: 'm12cassius', x: 22, y: 19, dir: 'down', look: L.cassius, name: 'Cassius', talk: 'm12cassius', show: ['m12newday'] },
      { id: 'm12junoPier', x: 15, y: 22, dir: 'up', look: L.juno, name: 'Juno', talk: 'm12junoPier', show: ['m12raced'] });
    // the finish line: the foot of the pier
    t.zones.push({ x: 14, y: 21, w: 2, h: 1, event: 'm12finish' });
  }

  // =====================================================================
  //  Events
  // =====================================================================
  const JUNO = { name: 'Juno', look: 'juno' };
  const mine = J => J.dname(J.get('mystarter') || 'eevee');
  const junoTeam = (J, lv) => { const rs = J.get('rivalStarter') || 'eevee'; return [[J.grown(rs, lv), lv], ['manectric', lv - 3], ['staraptor', lv - 3], ['lucario', lv - 2], ['sharpedo', lv - 4], ['togekiss', lv - 3]]; };

  // ---- the Ashen Coast
  on('m12arrive', { needs: ['!m12arrive'], sets: ['m12arrive'] }, async J => {
    J.set('m12arrive');
    await J.say(['Morning on the Ashen Coast. The surf is white, the sand is black, and the sky is so blue it almost hurts.', `${mine(J)} sneezes at the sea breeze, then does it again, on purpose, because it can.`]);
    await J.say(['Your Ride Pager buzzes. A message from Juno:', '"Teo opened his eyes!!! He said my hair looks stupid. HE\'S BACK. Going home to sit on him. See you at the Council - don\'t you DARE be Champion without me watching. -J"']);
    await J.say('East along the coast road: Emberlight, the last of the Eight Lights. Then Victory Strand, and the Council of Lights.');
  });
  on('m12abel', {}, (J, n) => J.say(J.flag('end') ? ['I\'m a postman now. The Last Mail Route, they call it. Every letter the Lantern ever kept, I deliver.', 'Turns out I like giving things back.'] : ['I used to be a Lightkeeper. I\'m still a Lightkeeper, I suppose - just without the Company.', 'Mr. Vale sent us all a letter at dawn. It just said: "Give it all back. I\'m sorry. Be on time."'], n));
  on('m12riftShut', { needs: ['!end'] }, async J => {
    await J.say(['A crack in the cliffs, taller than a house. Grey light breathes out of it, and somewhere inside, something rings like a bell.', 'It feels like the Echo... but older. Not yet, it seems to say. Not yet.']);
    await J.playerWalk('down', 1);
  });
  on('m12remy', { needs: ['end'], sets: ['m12riftopen', 'm12aero'] }, async (J, n) => {
    J.set('m12riftopen');
    if (J.flag('m12aero')) return J.say(['How\'s the Aerodactyl? Mine sneezed on a sample this morning. Professor Okafor says that\'s "data".', 'The Rifts go deep. Three of them, one behind another. Bring Ultra Balls - and bring a Master Ball if you\'ve got one.'], n);
    if (J.has('m12amber')) {
      await J.say(['Is that... OLD AMBER? From the Rift? Hold still - this portable reviver is Professor Okafor\'s, and I\'m only allowed to use it "in emergencies".', 'This counts. This definitely counts.'], n);
      J.take('m12amber');
      await J.fade(async () => { await J.wait(700); });
      await J.say(['The reviver whirs, clanks, and pings. The amber glows... cracks... and something with wings unfolds out of it, blinking at the sky.', 'It has been asleep since before the Lantern-folk. It looks at you as if you were the first morning it has ever seen.']);
      J.addMon('aerodactyl', 55, { met: 'Echo Rift' });
      J.set('m12aero');
      return J.say('You got an Aerodactyl! (If your party is full, it went to the PC.)');
    }
    await J.say(['Remember me? Remy, from the Professor\'s field station! I patched up your very first Pokémon.', 'Now I study the Echo Rifts. When the Echo closed, little pieces of lost time fell out - right into these cliffs.'], n);
    return J.say(['The crack behind me is open now. People say there\'s amber deep inside, with ancient Pokémon asleep in it.', 'Bring me any amber you find, and I\'ll wake it up for you.'], n);
  });

  // ---- Emberlight
  on('m12ozzie', {}, (J, n) => J.say(J.flag('badge.ember') ? 'Solenne gave you a badge? She\'s never given ANYONE anything. Not even a smile. Well done, kid.' : ['All through the Long Night, everything was grey - except the Emberlight. Red as a heart.', 'I\'d sit by my window and watch it. Kept me from forgetting what red looked like.'], n));
  on('m12kit', {}, (J, n) => J.say(J.pick(['I\'m gonna be a Firekeeper! I can already say "hot" in four languages!', 'Did you know the sand is black because it\'s made of old volcano? I licked some. Don\'t lick it.', 'The Warden carried buckets of coal up the lighthouse every night. Hundreds! I counted to forty and fell asleep.']), n));
  on('m12tess', {}, (J, n) => J.say(J.flag('m12champ') ? 'Champion! I knew it. I knew it the moment you didn\'t forget us.' : ['I was a Lightkeeper. I handed out free lanterns, right here on this street. Everyone was so happy.', 'Solenne slammed her door in my face. Every single day. I think she\'s the only one who was right.'], n));
  on('m12sailor', {}, (J, n) => J.say(['Every ship on the coast steered by the Emberlight through the Long Night. It was the only light left that meant anything.', 'There\'s no Lumen lantern in that tower. Just fire, and a very stubborn woman.'], n));
  on('m12junoEmber', {}, (J, n) => J.say(['Surprise! Okay, I said the Council, but Teo kicked me out. He said I was "hovering". I do NOT hover.', 'Last Light, {NAME}. Solenne\'s tough - Fire types melt everything. Water, Rock, Ground. Go on, I\'ll be at the Council!'], n));
  on('m12dad', {}, (J, n) => J.say(['I got a day back this morning. Pim\'s first word. It was "lamp". I\'d forgotten it for a year.', 'I\'m never letting anyone take another day off me. Not even the bad ones. They\'re mine.'], n));
  on('m12pim', {}, (J, n) => J.say('LAMP! ...I know lots of words now. But Papa likes that one best.', n));
  on('m12gran', {}, (J, n) => J.say(J.flag('badge.ember') ? ['You beat my granddaughter? Then sit down. Have some soup. She\'ll come home tonight and sleep for a week, finally.'] : ['Solenne? Up in the Light, where she always is. She hasn\'t been home to sleep since the sky went grey.', 'She\'s fierce, that one. Like her mother. Go and tell her to come home for dinner.'], n));
  on('m12soShelf', {}, J => J.say('A shelf of trophies, all a bit scorched. And one photo, turned to the wall. On the back: "Mama. The last good day."'));
  on('m12soDesk', {}, J => J.say('A logbook of the Emberlight, in heavy handwriting. Every page for weeks says the same thing: "Lit. Still lit. STILL LIT."'));
  on('m12guide', {}, (J, n) => J.say(J.flag('badge.ember') ? 'You did it! Eight Lights! I\'ve been the guide here nine years and never said that to anybody.' : ['Welcome to the Emberlight, challenger! The floor is lava. Literally - mind the channels.', 'Each channel has one gap. Find it, zig, zag, and climb to the lamp room. Water, Rock and Ground moves - and Burn Heals!'], n));
  on('m12gymStatue', {}, J => J.say(J.flag('badge.ember') ? 'THE EMBERLIGHT - WARDEN: SOLENNE\nTrainers who have earned the Ember Badge: {NAME}' : 'THE EMBERLIGHT - WARDEN: SOLENNE\nThe eighth of the Eight Lights of Meridia. It has never gone out.'));
  on('m12lamp', {}, J => J.say('The great lamp of the Emberlight. No crystal, no Lumen lantern: just a bed of white-hot coals fed by Fire Pokémon, roaring like a living thing.'));
  on('m12solenneWin', { sets: ['badge.ember', 'm12ember'] }, async J => {
    await J.say(['...Ha. You know what I did all Long Night? I fed this lamp. Coal and fire, every hour, by hand. I didn\'t dare sleep - if I slept, I\'d dream my best day, and never wake up.', 'And here you come, fresh off saving the world, and burn hotter than me anyway.'], 'solenne');
    await J.say('Fine. You\'ve earned it. The Ember Badge - the eighth.', 'solenne');
    J.badge('ember');
    await J.give('tm:fire-blast');
    await J.say(['The Lumen people took a day off me too, you know. The day my mother died.', 'I got it back at dawn. It hurt like a burn. I\'m glad. ...That\'s the whole trick, isn\'t it? Keep it, and keep walking.'], 'solenne');
    await J.say(['Victory Strand is east of town. The Council of Lights is at the end of it.', 'And {NAME}... tell the Champion I said she owes me a visit. She\'ll know what it means.'], 'solenne');
    J.set('m12ember');
  });

  // ---- Victory Strand
  on('m12wynn', {}, (J, n) => J.say(J.pick([['I collect shells from every Lantern Night. This one\'s from the night that didn\'t happen. It\'s grey.', 'I\'m keeping it anyway. It happened to ME.'], ['The tide brought in a paper lantern this morning. Still dry. Someone let it go a long, long time ago.']]), n));

  // ---- the Council grounds
  on('m12guard', {}, (J, n) => J.say(J.flag('m12gate') ? ['The Council of Lights waits in the spire. Four Councillors, then the Champion.', 'Every door opens once its master is beaten - and stays open. Heal in the hall first!'] : 'The Council of Lights. Only trainers who carry all Eight Lights may pass. Step forward and I\'ll check your badges.', n));
  on('m12gate', { needs: ['!m12gate'], sets: ['m12gate'] }, async J => {
    J.emote('guard', '!');
    await J.say('Halt, challenger! Your badges, please.', 'guard');
    if (J.badges() < 8) {
      await J.say(`${J.badges()} of eight Lights... I'm sorry. Come back when all eight are shining for you.`, 'guard');
      await J.playerWalk('down', 1);
      return;
    }
    await J.say(['Beacon, Gear, Moss, Ochre, Pearl, Veil, Crown... and Ember. All Eight Lights of Meridia.', 'The Council of Lights is open to you. Go on up!'], 'guard');
    J.set('m12gate'); J.refresh();
    J.emote('juno', '!');
    await J.say('{NAME}!! Over here! I made it! I would have been here sooner but I stopped to buy you a snack and then I ate the snack.', 'juno');
  });
  on('m12junoCouncil', {}, async (J, n) => {
    await J.say(J.pick([['Teo made me promise to tell him every single move. EVERY one. So win in an interesting way, okay?'],
      ['I\'m not nervous. You\'re nervous. I\'m vibrating with excitement, which is completely different.'],
      ['Remember when we were six and you said you\'d be Champion and I said I\'d deliver you the trophy? I\'m holding you to it.']]), n);
    if (await J.ask('Patch up your team?', ['Yes, please', 'I\'m good'], n) !== 0) return J.say('Then GO! I\'ll be right here, yelling.', n);
    await J.heal(true);
    await J.say('Courier\'s kit, final edition. Now go win, so I can say I knew you when.', n);
  });
  on('m12fen', {}, (J, n) => J.say(J.flag('m12champ') ? 'The new Champion! I lost to Ada fifty years ago. I\'ll lose to you next year. Something to look forward to!' : ['Fifty years I\'ve walked up to that spire, and fifty years I\'ve walked back down.', 'The Champion has kept the Council since before your parents were born. Nobody knows her name. She just calls herself "the Lamplighter".'], n));
  on('m12hallGuard', {}, (J, n) => J.say(J.flag('m12champ') ? 'Champion {NAME}! The Councillors are already arguing about who gets the first rematch.' : ['Beyond this door: the Council of Lights - Sight, Shadow, Strength and Spark - and the Champion.', 'If you fall, you\'ll wake up here. The doors you\'ve opened stay open.'], n));
  on('m12hallStatue', {}, J => J.say(J.flag('m12champ') ? 'THE COUNCIL OF LIGHTS\nChampion: {NAME}' : 'THE COUNCIL OF LIGHTS\nChampion: THE LAMPLIGHTER. Undefeated for fifty years.'));
  on('m12roomStatue', {}, J => J.say('A statue of a lighthouse keeper, lantern raised. The lantern is real, and lit.'));

  // ---- the Councillors: each one opens the next door
  const opened = (flag, who, line) => async J => {
    J.set(flag); J.refresh();
    await J.say(line, who);
    await J.say('With a soft chime, the light over the far door fades away.');
  };
  on('m12c1Win', { sets: ['m12c1'] }, opened('m12c1', 'sibyl', 'The future just opened like a door. Go through it.'));
  on('m12c2Win', { sets: ['m12c2'] }, opened('m12c2', 'rook', 'The dark lets you pass. It always would have.'));
  on('m12c3Win', { sets: ['m12c3'] }, opened('m12c3', 'thane', 'GO! I\'ll be doing push-ups until you come back!'));
  on('m12c4Win', { sets: ['m12c4'] }, opened('m12c4', 'ione', 'One door left. She\'s been waiting for you longer than you know.'));

  // ---- the Champion: the Lamplighter
  on('m12champ', { needs: ['m12c4'], sets: ['m12champ', 'm12met'] }, async (J, n) => {
    if (J.flag('m12champ')) return J.say(J.flag('end') ? 'Champion {NAME}. Come back whenever you like. I will put the kettle on.' : 'The Hall of Flight is through the door behind me. Go on, little lamp.', n);
    if (!J.flag('m12met')) {
      await J.say(['Hello, little lamp. Surprised?', 'I did tell you I keep the last working lighthouse. I never said it was my only job.'], n);
      await J.say(['My name is Ada. In Saltmere they call me the Lamplighter. Up here, for fifty years, they have called me Champion.'], n);
      await J.say(['When I was younger than Amara is now, the Echo tore open once before.', 'I climbed Frostcrown with nothing but a lantern and a stubborn heart, and the Warden of the Veil and I closed it together. I thought it would stay closed forever.'], n);
      await J.say(['Then my daughter grew up brilliant, and curious, and opened it again.', 'Yes. Amara Okafor is my daughter. She has my stubbornness and her father\'s terrible handwriting.'], n);
      await J.say(['She was afraid, all those years. Afraid of what she\'d done, afraid to tell Cassius. Afraid to tell me.', 'I gave you Lapras because I knew where you were going. I have watched you every step of the way.'], n);
      await J.say(['Now let me feel it for myself, {NAME}. Everything you remembered, when no one else could.', 'Come. Show me!'], n);
      J.set('m12met');
    } else await J.say('Back again, little lamp? Good. Lamps should never give up. Show me!', n);
    if (await J.battle('m12ada', n) !== 'win') return;
    await J.say(['...There it is.', 'A light that has seen the dark, and kept walking anyway. Congratulations, {NAME}. You are the Champion of Meridia.'], n);
    J.set('m12champ'); J.refresh();
    await J.say('Come with me. There is a room up here I have been keeping for you.', n);
    await J.travel('hallofflight', 6, 6, 'up');
    await T.m12hof(J, 'ada');
  });

  // ---- the Hall of Flight, and home for Lantern Night
  async function hallOfFlight(J) {
    const G = typeof Journey !== 'undefined' && Journey._G ? Journey._G() : null;
    const party = G ? G.party : [], name = G ? G.name : 'Trainer';
    const nick = m => typeof Prog !== 'undefined' && Prog.nameOf ? Prog.nameOf(m) : J.dname(m.species);
    await J.say(['This is the Hall of Flight. Every Champion of Meridia, and every Pokémon who stood beside them, is remembered here.', 'Remembered properly - not kept. There is a difference.'], 'ada');
    await J.say('Place your Poké Balls on the machine, Champion.', 'ada');
    J.set('m12hofTeam', party.map(m => `${nick(m)} Lv. ${m.level}`).join(', '));
    for (const m of party) await J.say(`${nick(m)} - Lv. ${m.level} ${J.dname(m.species)}... remembered!`);
    await J.chapter('Champion of Meridia!', `${name} and their Pokémon are entered into the Hall of Flight`);
    await J.say(['Mum.', 'I... came up the back stairs. I didn\'t want to miss it.'], 'okafor');
    await J.say('Amara. You never could stay away from a good ending.', 'ada');
    await J.say(['{NAME}, there\'s something we owe you. You always asked why the Lost Days never touched you.', 'Mum - you tell it. You were there.'], 'okafor');
    await J.say(['Some years ago, on Lantern Night, the Tidemark Light would not catch. The old Warden was ill, and the crystal was cold.', 'And on the pier, in the dark, a young woman was having a baby a little earlier than planned.'], 'ada');
    await J.say(['I happened to be in Tidemark. I climbed the stairs and lit that lamp with my own two hands.', 'And you were born under it. On Lantern Night. Under a lit lighthouse.'], 'ada');
    await J.say(['The Lantern-folk had a blessing for a child born like that: a child who cannot be made to forget.', 'That\'s why Tidemark gives a partner to every child born on Lantern Night. Mum started the tradition... because of you.'], 'okafor');
    await J.say(['So, you see, I have been waiting a very long time to meet you properly, little lamp.', 'Now. Tomorrow is Lantern Night - the first real one in a long while. Come home. All of us.'], 'ada');
    await J.give('master');
    await J.say('A Master Ball. For the day you meet something that has waited a very long time for you. Those things exist, out in the Rifts.', 'ada');
    J.set('m12hof');
    // ---- Lantern Night, again
    await J.travel('tidemark', 14, 15, 'down');
    await J.say(['The next night. Lantern Night, in Tidemark.', 'The whole village is in the square. So is half of Meridia: Wardens, couriers, Lightkeepers in ordinary coats, and an old man from Highwatch telling anyone who\'ll listen that he was Champion once.']);
    await J.say(['Mara has polished the Tidemark Light until it gleams. Out on the dark horizon, the other Lights wait for midnight - and a ninth, high on Frostcrown, glowing gold.', 'You hold two paper lanterns. One for every day you want to remember... and one for Nell.']);
    await J.say(['Midnight.', 'A thousand lanterns rise over the harbour like slow golden stars. Yours goes up with them. The second one, you let go of last.']);
    await J.say(['And then all nine Lights of Meridia blaze out together across the sea...', '...and stay lit.']);
    await J.fade(async () => { await J.wait(900); });
    await J.say(['The clock in the square ticks past twelve. Then one. Then two.', 'Nobody forgets anything.']);
    await J.fade(async () => { J.set('m12newday'); J.refresh(); await J.wait(900); });
    await J.say(['Morning. A real one.', 'The day AFTER Lantern Night - the first one Tidemark has seen in a long, long time. Gulls. Coffee. Somebody\'s Slakoth snoring on a doorstep.']);
    J.emote('m12teo', '!');
    await J.say(['{NAME}!!! Is it true?! Juno says you\'re the CHAMPION! She says you cried in the Hall of Flight!', 'I was asleep for AGES. I had the longest dream. It was the same afternoon, over and over. I won\'t eat ice cream for a week.'], 'm12teo');
    await J.say(['I said no such thing! ...I said you PROBABLY cried.', 'Hey. {NAME}. You remember what you owe me?'], 'm12juno');
    await J.say(['A race. A real one. From the top of the village to the end of the pier - like when we were little.', 'Talk to me when you\'re ready. And stretch. You\'re going to need it.'], 'm12juno');
  }
  on('m12hof', { needs: ['m12champ'], sets: ['m12hofTeam', 'm12hof', 'm12newday'], travel: [{ map: 'tidemark', needs: ['m12hof'] }] }, async (J, n) => {
    if (!J.flag('m12champ')) return;
    if (!J.flag('m12hof')) return hallOfFlight(J);
    return J.say(J.flag('end') ? 'Your names are written here now, little lamp. Mine is just above them. It is a good place to be.' : 'Home, Champion. Tidemark is waiting.', n);
  });
  on('m12okHall', {}, (J, n) => J.say(J.flag('m12hof') ? ['Mum and I are going to have tea. A very long tea. Twenty years of tea.', 'Thank you, {NAME}. For all of it.'] : 'Go on - put your team on the machine. I want to see.', n));
  on('m12hofMachine', {}, J => J.say(J.flag('m12hof') ? `HALL OF FLIGHT - Champion: {NAME}\n${J.get('m12hofTeam') || ''}` : 'The Hall of Flight machine glows softly, waiting.'));
  on('m12hofStatue', {}, J => J.say('A statue of a Corviknight with a lantern hanging from its beak. The plaque reads: "For every light that found its way home."'));

  // ---- the morning after: the race to the pier, and Juno's last battle
  on('m12junoRace', { needs: ['m12newday'], sets: ['m12race'] }, async (J, n) => {
    if (J.flag('m12race')) return;
    await J.say(['Okay. Rules. From the north gate, all the way down, to the foot of the pier. First one onto the boards wins.', 'No Corviknight. No Lapras. Legs only. Running Shoes allowed, because I\'m generous.'], n);
    if (await J.ask('Ready to race?', ['Let\'s go!', 'Not yet'], n) !== 0) return J.say('Stalling, huh? Fine. I\'ll be stretching. Loudly.', n);
    await J.fade(() => J.hideNpc('m12juno'));
    await J.warp('tidemark', 14, 2, 'down');
    await J.say(['The north gate of Tidemark. Juno crouches on the line beside you, grinning.', 'Down the street, the whole village has turned out to watch. Teo is standing on a crate.']);
    await J.say(['On your marks...', 'Get set...'], JUNO);
    await J.say('GO!!!', JUNO);
    J.set('m12race'); J.set('m12raceT', Date.now()); J.refresh();
  });
  on('m12finish', { needs: ['m12race', '!m12raced'], sets: ['m12raced', 'end'] }, async J => {
    const secs = Math.max(0, (Date.now() - (J.get('m12raceT') || 0)) / 1000);
    const won = secs < 3.6;
    J.set('m12raced'); J.refresh();
    if (won) {
      await J.say([`Your feet hit the boards of the pier - ${secs.toFixed(1)} seconds! - and a heartbeat later, Juno skids in beside you, gasping.`, 'The whole village cheers. Teo falls off his crate.']);
      await J.say(['No. NO. You... you WON? I\'m a professional! I run for a LIVING!', '...Ha. Ha ha! Okay. Okay, Champion. That one\'s yours. Fair and square.'], 'm12junoPier');
      await J.give('rarecandy', 2);
    } else {
      await J.say([`You hit the boards of the pier after ${secs.toFixed(1)} seconds... and Juno is already there, leaning on a post as if she\'s been waiting all morning.`, 'The whole village cheers anyway. Teo cheers loudest.']);
      await J.say(['Courier\'s honour: anything, anywhere, by morning. And I got here before breakfast.', 'Don\'t look so sad. You can be Champion of everything except running.'], 'm12junoPier');
    }
    await J.say(['...Hey. {NAME}. One more thing.', 'When I took your key in Highwatch, I thought I was saving Teo. I almost lost both of you.', 'I never said sorry properly. So. Sorry. And thank you. And...'], 'm12junoPier');
    await J.say(['...And one last battle! Our first one was on this pier, the night the light went out. I want our last one here too.', 'Well - the last one of THIS journey. Don\'t get comfortable.'], 'm12junoPier');
    await J.battle({ id: 'm12junoLast', name: 'Juno', look: 'juno', team: junoTeam(J, 62), pay: 60, theme: 'beach', canLose: true,
      before: 'For Teo! For the pier! For bragging rights FOREVER!', lose: 'Yeah. Yeah, that was you. All of you.', win: 'HA! The pier is MINE!' });
    await J.say(J.lastWin() ? ['That\'s it. That\'s the one I\'m going to tell Teo about when we\'re old and boring.', 'You know what? I don\'t even want a rematch. ...I do. Obviously. But not today.'] : ['I won! On the pier! Where it all started! Somebody write this DOWN!', '...You let me win, didn\'t you. Don\'t answer that.'], 'm12junoPier');
    await J.heal(false);
    // the ending
    await J.say(['Teo comes running down the pier, Mom behind him with breakfast, Okafor and Ada behind her, arguing gently about tea.', 'Old Tobin is fishing. Pip is looking for treasure. Out on the sea, the Tidemark Light turns, steady and warm, in broad daylight.']);
    await J.say([`${mine(J)} sits down on the end of the pier beside you and looks at the water, the way it did on the very first night.`, 'This time, nothing looks back but the sky.']);
    await J.say(['Somewhere, a man is walking along a beach, carrying a brass lantern with a small violet flame in it. He is early.', 'Somewhere, a girl in grey let go of a hand, and was finally, properly, remembered.']);
    await J.say(['The days don\'t stop for anyone. They go, one after another, and they don\'t come back.', 'But you were there for every one of them. And so, from now on, is everyone else.']);
    await J.chapter('The End', 'Thank you for playing Journey II: The Lost Days of Meridia');
    J.set('end'); J.refresh();
    await J.say(['(The Echo Rifts have opened in the cliffs of the Ashen Coast. Cassius, Okafor and Juno will battle you again here in Tidemark.)', 'Your journey continues!']);
  });
  on('m12teo', {}, (J, n) => J.say(J.flag('end') ? J.pick([['When I grow up I\'m gonna be a courier AND a Champion. Juno says I can\'t be both. I\'m gonna be both.'], ['I don\'t remember the grey much. Just a really long afternoon. And Juno\'s voice, telling me to come home.']]) : ['Juno\'s been stretching for ten minutes. She does this. She\'s going to say it\'s "just warming up".', 'Beat her! ...No, don\'t! ...I can\'t decide!'], n));
  on('m12mom', {}, (J, n) => J.say(J.flag('end') ? ['My Champion. Come home for dinner. You can tell me everything - and I\'ll remember every word.'] : ['Happy day-after-Lantern-Night, sweetheart. Do you know how long I\'ve waited to say that?', 'Ada told me she lit the lighthouse the night you were born. I always thought it was the lighthouse keeper\'s apprentice. Fancy that.'], n));
  on('m12adaHome', {}, (J, n) => J.say(J.flag('end') ? ['Amara wants me to retire. I told her I will retire when someone can beat me twice.', 'Come back to the Council sometime, little lamp. I am not done learning from you.'] : ['Tidemark looks just as it did the night you were born. A little more colour, perhaps.', 'Go on, Juno is waiting for you. That girl could outrun a Rapidash.'], n));

  // ---- post-game rematches: Okafor, Cassius and Juno, here in Tidemark
  const rematch = (who, flag, def, pre, after) => async (J, n) => {
    if (!J.flag('end')) return J.say(pre, n);
    if (await J.ask(J.flag(flag) ? 'Battle again?' : 'Battle?', ['Battle!', 'Not now'], n) !== 0) return J.say(after, n);
    const r = await J.battle({ ...def(J), canLose: true }, n);
    if (r === 'win' && !J.flag(flag)) { J.set(flag); await J.give('rarecandy', 1); }
    return J.say(after, n);
  };
  on('m12okafor', {}, rematch('okafor', 'm12re.okafor',
    () => ({ id: 'm12reOkafor', name: 'Prof. Okafor', look: 'okafor', team: [['chimecho', 62], ['slowking', 63], ['porygon-z', 63], ['espeon', 63], ['gallade', 64], ['dragapult', 64]], pay: 50, theme: 'beach',
      before: 'For science! And for the record, I have been practising.', lose: 'Fascinating. Truly. Let me write that down.', win: 'Ha! Mum would be proud. Don\'t tell her I said that.' }),
    ['Mum and I are going to fix the field station together. She keeps re-labelling my jars.', 'And {NAME}... thank you. For remembering, when I wanted so badly to forget.'],
    ['Pokémon that move through time, a Champion for a mother, and a student who can\'t forget. My research has never been better.']));
  on('m12cassius', {}, rematch('cassius', 'm12re.cassius',
    () => ({ id: 'm12reCassius', name: 'Cassius', look: 'cassius', team: [['mismagius', 65], ['dusknoir', 65], ['aegislash', 66], ['chandelure', 66], ['gardevoir', 67], ['metagross', 67]], pay: 60, theme: 'beach',
      before: 'A battle for its own sake. No Lantern, no grief. Just the two of us, and the sea.', lose: 'Wonderful. I will remember this one - and I will let it go.', win: 'Still got it. ...Don\'t tell the Council.' }),
    ['I sent my lantern up last night. One for Nell. I let go of it first, before I could change my mind.', 'I am going to walk to every town in Meridia and give back every day I took. It will take years. I will be on time for all of them.'],
    ['Thank you, {NAME}. The morning is very bright. I had forgotten how bright.']));
  on('m12junoPier', { needs: ['m12raced'] }, rematch('juno', 'm12re.juno',
    J => ({ id: 'm12reJuno', name: 'Juno', look: 'juno', team: junoTeam(J, 66), pay: 60, theme: 'beach',
      before: 'Rematch! Rematch rematch REMATCH!', lose: 'Okay but I was going easy. I was NOT going easy.', win: 'Courier\'s honour: I always deliver!' }),
    'Catching your breath? Ha! I\'m not even winded.',
    ['Same time tomorrow? And the day after? And the day after that?', 'Every day\'s a new one now, {NAME}. I\'m going to beat you in at least half of them.']));

  // ---- the Echo Rifts: the idols of the three who keep memory, and a time-traveller
  const idol = (flag, sp, lv, wake) => async J => {
    if (J.flag(flag)) return J.say('An old stone idol of the Lantern-folk. Whatever lived in it has gone. It is only stone now.');
    if (!J.flag('end')) return J.say('An old stone idol of the Lantern-folk.');
    await J.say(wake);
    const r = await J.battle({ wild: true, team: [[sp, lv]], theme: 'icecave', canLose: true });
    if (r === 'win' || r === 'caught') {
      J.set(flag);
      if (r === 'win') await J.say(`The ${J.dname(sp)} hovers for a moment, looks at you as if memorising your face, and vanishes into the stone light.`);
    } else if (r === 'ran') await J.say('The idol\'s eyes close again. It will wait.');
  };
  on('m12uxie', { needs: ['end'], sets: ['m12uxie'] }, idol('m12uxie', 'uxie', 65, ['An old stone idol of a small, sleeping Pokémon with its eyes shut. The Lantern-folk letters read: "IT KEEPS WHAT IS KNOWN."', 'The idol\'s eyes... open.']));
  on('m12mesprit', { needs: ['end'], sets: ['m12mesprit'] }, idol('m12mesprit', 'mesprit', 65, ['An old stone idol of a small Pokémon with a pink head, frozen mid-smile. "IT KEEPS WHAT IS FELT."', 'Snow that has been falling for a thousand years stops in the air... and the idol laughs.']));
  on('m12azelf', { needs: ['end'], sets: ['m12azelf'] }, idol('m12azelf', 'azelf', 65, ['An old stone idol of a small blue Pokémon with a stubborn little face. "IT KEEPS WHAT IS CHOSEN."', 'The idol stirs, and stares you down - daring you to choose.']));
  on('m12celebi', { needs: ['end', '!m12celebi'], sets: ['m12celebi'] }, async J => {
    if (J.flag('m12celebi') || !J.flag('end')) return;
    await J.say(['At the very top of the First Night, the air smells of rain from a thousand years ago.', 'A small green Pokémon is floating there, turning slowly - as if it has been waiting for someone who would remember it was here.']);
    const r = await J.battle({ wild: true, team: [['celebi', 65]], theme: 'forest', canLose: true });
    if (r === 'win' || r === 'caught') {
      J.set('m12celebi');
      if (r === 'win') await J.say('Celebi circles you once, laughing, and flickers away - into some other morning, long ago or far ahead.');
    } else await J.say('Celebi flickers out of sight. The air still smells of old rain. Perhaps it will come back.');
  });

  // ---- the chapter: starts where Corviknight sets you down after the Long Night, at the west end of the Ashen Coast
  chapter({ n: 12, title: 'The Council of Lights', start: { map: 'ashencoast', x: 1, y: 13, dir: 'right' }, level: 56, badge: 'ember', center: 'embercenter',
    goals: ['m12arrive', 'badge.ember', 'm12ember', 'm12gate', 'm12c1', 'm12c2', 'm12c3', 'm12c4', 'm12met', 'm12champ', 'm12hof', 'm12newday', 'm12race', 'm12raced', 'end'] });
})();
