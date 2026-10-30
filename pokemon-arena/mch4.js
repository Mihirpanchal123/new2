'use strict';
// =====================================================================
//  JOURNEY II - Chapter 4: The Wildheart. The Old Rail Line climbs out of
//  the city into the jungle. Mossgrove lives in the roots of giant trees
//  under Warden Ilse's Light (Bug); east, the Wildheart River swallowed
//  the old Lantern Bridge twenty years ago - but in the Echo it still
//  stands. Beyond lies Ochre, a town built on the ruins of the Lantern-
//  folk, where Warden Bastian (Rock) has gone down into the Lantern Ruins
//  after the Lumen Company. The mural there tells why the lighthouses
//  were built; and Juno brings the news that Teo is fading.
//  Side story: the Lighthouse Kids Club and the ghost of Mossgrove.
//  The plan: docs/journey2/world.md.
// =====================================================================
(() => {
  const { def, grid, L, center, mart, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m4ranger: { hat: 'sunhat', hatColor: 0x5a7a3a, hatBand: 0xb08a3a, hair: 0x3a2a1e, hairStyle: 'short', top: 0x6a8a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x4a5a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x8a5a30 },
    m4digger: { hat: 'sunhat', hatColor: 0xd8b878, hatBand: 0x8a5a30, hair: 0x6a3a1a, hairStyle: 'long', top: 0xc89058, sleeves: 'short', inner: 0xf4e8c8, legs: 0x7a5a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x7a5a30, skin: '#a86a4a' },
    m4poppy: { hat: 'capback', hatColor: 0xffd84a, hatFront: 0x3a3a48, hair: 0xc0392b, hairStyle: 'pigtails', top: 0x3a3a48, sleeves: 'short', inner: 0xffd84a, legs: 0x3a5aa8, legStyle: 'shorts', shoes: 0xffd84a, bag: 0xe07a50 },
    m4fen: { hat: null, hair: 0x2b1d14, hairStyle: 'spiky', top: 0x58b85c, sleeves: 'short', inner: 0x58b85c, legs: 0x5a4a3a, legStyle: 'shorts', shoes: 0x3a3a48, bag: null, skin: '#c88a5a' },
    m4moth: { hat: 'beanie', hatColor: 0x9a6ab8, hatFront: 0xffd84a, hair: 0xe8e0d0, hairStyle: 'short', top: 0x9a6ab8, sleeves: 'long', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x9a6ab8, bag: 0x5a5a68 },
    m4biscuit: { hat: null, hair: 0xd9a441, hairStyle: 'long', top: 0xe8a040, sleeves: 'short', inner: 0xffffff, legs: 0xe878a8, legStyle: 'skirt', shoes: 0xe04848, bag: 0xe8c890 },
    m4ollie: { hat: 'bandana', hatColor: 0xe04848, hair: 0x2b1d14, hairStyle: 'short', top: 0x4a98e8, sleeves: 'short', inner: 0x4a98e8, legs: 0xe8c890, legStyle: 'shorts', shoes: 0x3a3a48, bag: 0x8a5a30, skin: '#7a4a2a' }
  });

  // ---- items
  ITEMS['tm:bug-buzz'] = ITEMS['tm:bug-buzz'] || { name: 'TM Bug Buzz', pocket: 'tms', price: 0, tm: 'bug-buzz', desc: 'Teaches Bug Buzz: a damaging sound wave that may lower the target\'s Sp. Def.' };
  ITEMS['tm:rock-slide'] = ITEMS['tm:rock-slide'] || { name: 'TM Rock Slide', pocket: 'tms', price: 0, tm: 'rock-slide', desc: 'Teaches Rock Slide: large boulders are hurled at the foe. It may make the target flinch.' };
  ITEMS['tm:shadow-ball'] = ITEMS['tm:shadow-ball'] || { name: 'TM Shadow Ball', pocket: 'tms', price: 0, tm: 'shadow-ball', desc: 'Teaches Shadow Ball: a shadowy blob that may lower the target\'s Sp. Def.' };
  Object.assign(ITEMS, {
    m4rubbing: { name: 'Mural Rubbing', pocket: 'key', price: 0, desc: 'Bastian\'s charcoal rubbing of the Lantern-folk mural: eight lights in a ring around a grey door, and a giant asleep beneath a crown of frost.' },
    m4clubbadge: { name: 'Kids Club Badge', pocket: 'key', price: 0, desc: 'A bottle cap with a lighthouse drawn on it in marker. Proof that you are an Honorary Member of the Lighthouse Kids Club.' },
    m4pass: { name: 'Courier Pass', pocket: 'key', price: 0, desc: 'A Reyes Couriers pass for the Lumen Gala: "SERVICE - FLOWERS". Juno says Madame Odile, the tailor in the sky tower lobby, will do the rest.' }
  });

  // ---- the clue notebook
  Object.assign(CLUES, {
    m4ilse: 'Warden Ilse lost a day too: the day Lumen surveyors came to "measure" her Light. They asked about the Lantern Ruins at Ochre.',
    m4nell: 'Nell, in the Echo on the old Lantern Bridge: "The lights were built so the Grey stays shut. When they go dark, things fall in."',
    m4agent: 'Agent Vesper of the Lumen Company was copying the mural in the Lantern Ruins. "The Director wants every word about the Great Lantern."',
    ruinslore: 'The Lantern-folk mural: the Eight Lights hold the Echo shut. A lantern that keeps days instead of letting them go "opens the Grey". A giant sleeps under a crown of frost.',
    teofade: 'Teo is fading. He forgets Juno\'s name; the edges of him look like an old photo. The free Lumen lantern by his bed glows brighter every night.',
    ch5: 'Juno\'s lead: the Lumen Gala in Cassius\'s sky tower in Brassport. She delivers the flowers; Madame Odile the tailor (tower lobby) will dress me as a guest.'
  });

  // ---- trainers
  const rsTeam = (J, list) => { const rs = J.get('rivalStarter') || 'eevee'; return [[J.grown(rs, list[0]), list[0]], ...list.slice(1)]; };
  Object.assign(TRAINERS, {
    // the Wildheart
    m4tam: { team: [['kakuna', 21], ['metapod', 21], ['beedrill', 23]], pay: 18, theme: 'forest', before: 'My net, my rules! The Wildheart\'s bugs are the best in Meridia!', lose: 'Bzzzt... my Beedrill is buzzing off.', after: 'Ilse caught her first Scyther right here. With a jam jar, she says. I don\'t believe her.' },
    m4sage: { team: [['gloom', 22], ['weepinbell', 23]], pay: 20, theme: 'forest', before: 'Breathe in... the Wildheart smells of rain and old stone. Now battle!', lose: 'What a fragrant defeat.', after: 'The forest remembers everything. Every root, every footprint. Not like people.' },
    m4lark: { team: [['vigoroth', 22], ['staravia', 23]], pay: 18, theme: 'forest', before: 'Lunch break is over! Battle break begins!', lose: 'Back to lunch, then.', after: 'The old bridge fell twenty years ago, the night the lights all flickered. My gran says the river screamed.' },
    m4holt: { team: [['breloom', 23], ['pinsir', 23], ['mankey', 22]], pay: 22, theme: 'forest', look: 'm4ranger', name: 'Ranger Holt', before: 'Ranger\'s duty: test everyone who walks the Wildheart. Show me!', lose: 'You walk the forest well.', after: 'Odd thing - Lumen people came through last week with crates of lanterns. Heading for Ochre. Never came back this way.' },
    m4dov: { team: [['graveler', 23], ['onix', 23], ['drilbur', 22]], pay: 22, theme: 'forest', before: 'I\'m hiking to the Lantern Ruins! My rocks will crush yours on the way!', lose: 'Crumbled like an old wall...', after: 'Bastian\'s Light is in Ochre. Rock types. Grass and Water are your friends there, and Fighting works too.' },
    m4wren: { team: [['applin', 23], ['shroomish', 22], ['oddish', 22]], pay: 18, theme: 'forest', before: 'I grow things! Apples, mushrooms, and battle skills!', lose: 'Uprooted!', after: 'Applin lives inside apples. I never eat apples now. Just in case.' },
    // the Lantern Ruins
    m4lk1: { team: [['murkrow', 24], ['golbat', 24]], pay: 30, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'So sorry - the ruins are closed for a Company survey. Please turn around. Please?', lose: 'Oh dear. That wasn\'t in the survey plan.', after: 'The Agent is in the deep chamber, copying the old pictures. Something about "the Great Lantern".' },
    m4lk2: { team: [['houndour', 24], ['croagunk', 25]], pay: 30, theme: 'forest', look: 'keeperf', name: 'Lightkeeper', before: 'A Warden came storming through here already. You\'re not a Warden, are you? Oh no, you\'re worse.', lose: 'Sorry, sorry. I\'ll get out of your way.', after: 'Lumen lights the way. That\'s what they told us. Down here it\'s so dark...' },
    m4lk3: { team: [['magnemite', 25], ['litwick', 25], ['zubat', 24]], pay: 30, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'The Director said nobody comes down here. I\'m afraid I have to insist. Politely.', lose: 'The Director will be so polite about this.', after: 'Do you ever wonder where the days go? ...Me neither. I\'m not paid to wonder.' },
    m4maniac: { team: [['golett', 24], ['sandile', 24], ['cubone', 25]], pay: 26, theme: 'forest', look: 'hiker', name: 'Ruin Maniac Abe', before: 'These ruins are MINE to explore! Well, Bastian\'s. Well, the Lantern-folk\'s. Battle!', lose: 'Ruined! Ha! Get it?', after: 'Golett were made by the Lantern-folk, I\'m sure of it. Guardians of clay. Some of them are still on duty down here.' },
    // the Mossgrove Light: Warden Ilse (Bug)
    m4g1: { team: [['venipede', 23], ['whirlipede', 24]], pay: 24, theme: 'forest', look: 'bug', name: 'Bug Catcher Nils', before: 'Welcome to the Mossgrove Light! The vines are our walls, and the bugs are our guards!', lose: 'Squashed...', after: 'Fire and Flying moves hit most bugs hard. Rock too!' },
    m4g2: { team: [['butterfree', 24], ['beedrill', 24]], pay: 24, theme: 'forest', look: 'aroma', name: 'Keeper Lys', before: 'Wings and stings! Can you dodge both?', lose: 'Fluttered away.', after: 'Ilse\'s Heracross is part Fighting. Flying and Psychic moves go right through it.' },
    m4g3: { team: [['wimpod', 24], ['pinsir', 25]], pay: 24, theme: 'forest', look: 'm4ranger', name: 'Keeper Oren', before: 'Last guard before the lamp room! My bugs never run. ...Except Wimpod. Wimpod always runs.', lose: 'Wimpod, come back!', after: 'Go on up. Ilse\'s been humming all day. That means she\'s excited.' },
    ilse: { team: [['whirlipede', 24], ['butterfree', 25], ['heracross', 26], ['scyther', 27]], pay: 100, theme: 'forest', gym: 3, onWin: 'm4ilseWin', look: 'ilse', name: 'Warden Ilse', before: 'Bugs remember every season they\'ve ever lived through. Let\'s see if you\'re worth remembering!', lose: 'Oh! You flew right past my swarm!' },
    // the Ochre Light: Warden Bastian (Rock)
    m4g4: { team: [['geodude', 25], ['nacli', 26]], pay: 24, theme: 'stadium', look: 'm4digger', name: 'Digger Uma', before: 'Every rock in this Light was carried from the ruins. Mind your head!', lose: 'Dug my own hole there.', after: 'Bastian\'s Aerodactyl came out of a fossil from the ruins. It\'s older than the lighthouse!' },
    m4g5: { team: [['rockruff', 26], ['onix', 26]], pay: 24, theme: 'stadium', look: 'hiker', name: 'Hiker Bram', before: 'Solid as a mountain, me! Let\'s see you move me!', lose: 'Moved...', after: 'Water, Grass, Fighting, Ground, Steel. Rock has a lot of weak spots, but it hits like a landslide.' },
    m4g6: { team: [['larvitar', 26], ['graveler', 27]], pay: 24, theme: 'stadium', look: 'm4digger', name: 'Digger Tove', before: 'The lamp room is up those stairs. You\'ll have to dig through me first!', lose: 'Bedrock... reached.', after: 'Bastian\'s slow to talk, quick to think. Don\'t let the hat fool you.' },
    bastian: { team: [['onix', 27], ['naclstack', 27], ['lycanroc', 28], ['aerodactyl', 29]], pay: 100, theme: 'stadium', gym: 4, onWin: 'm4bastianWin', look: 'bastian', name: 'Warden Bastian', before: 'Stone is a memory that refuses to leave. Show me what you refuse to let go of.', lose: '...Well. Even mountains wear down.' }
  });

  // =====================================================================
  //  Mossgrove - a forest town in the roots of giant trees, under Warden
  //  Ilse's Light. The Old Rail Line comes up from the south; the
  //  Wildheart begins at the east gate.
  // =====================================================================
  {
    const B = grid(30, 26, '.').border('T', { s: [9, 11], e: [11, 13] }, 1);
    B.fill(1, 1, 20, 1, 'T').fill(1, 2, 1, 9, 'T').fill(27, 1, 28, 8, 'T');
    // the roads: up from the Old Rail Line, the main street east to the Wildheart, and the lanes to the doors
    B.fill(9, 14, 11, 25, ',').fill(2, 12, 29, 13, ',').fill(25, 11, 29, 11, ',').fill(24, 9, 24, 11, ',');
    B.fill(4, 8, 4, 11, ',').fill(10, 8, 10, 11, ',').fill(13, 11, 18, 11, ',').fill(12, 19, 17, 19, ',').fill(5, 19, 8, 19, ',');
    // the forest closes in around the road from the south; the east gate (the ranger keeps it)
    B.fill(7, 20, 8, 24, 'T').fill(12, 20, 13, 24, 'T').fill(28, 10, 28, 10, 'T').fill(28, 14, 28, 14, 'T');
    // the pond, flowers and a little garden
    B.fill(15, 20, 21, 24, ':').fill(16, 21, 20, 23, '~').fill(2, 21, 5, 23, '*').fill(19, 3, 21, 5, '*').fill(26, 18, 28, 19, '*').fill(7, 9, 8, 10, '*');
    def({ id: 'mossgrove', name: 'Mossgrove', kind: 'town', rows: B.rows(), music: 'town', battle: 'forest', fly: { x: 10, y: 13 }, center: { map: 'center_mossgrove' },
      buildings: [{ b: 'lighthouse', x: 22, y: 2, to: 'mossgym', variant: 2, needs: ['m4ilse'], locked: 'm4gymLocked' },
        { b: 'center', x: 13, y: 6, to: 'center_mossgrove' }, { b: 'mart', x: 14, y: 15, to: 'mart_mossgrove' },
        { b: 'house', x: 2, y: 4, to: 'mossgrove_elder', variant: 2 }, { b: 'house3', x: 8, y: 4, to: 'mossgrove_club' }, { b: 'house2', x: 3, y: 15, to: 'mossgrove_hollin' }],
      signs: [{ x: 8, y: 14, text: 'MOSSGROVE\nA town that grows where the old trees let it.' }, { x: 21, y: 10, text: 'MOSSGROVE LIGHT\nWarden: ILSE\nThe third of the Eight Lights of Meridia.' },
        { x: 27, y: 14, text: 'EAST: THE WILDHEART\nRangers\' advice: stay on the path. The forest moves.' }, { x: 12, y: 8, text: 'THE LIGHTHOUSE KIDS CLUB\nMembers only!!! (and grown-ups who knock)' },
        { x: 6, y: 19, text: 'The Hollin house' }],
      props: [{ k: 'bigtree', x: 23, y: 20 }, { k: 'bigtree', x: 24, y: 15 }, { k: 'lumenlamp', x: 2, y: 11 }, { k: 'lumenlamp', x: 8, y: 11 }, { k: 'lumenlamp', x: 19, y: 11 },
        { k: 'lumenlamp', x: 13, y: 14 }, { k: 'lamp', x: 12, y: 18 }, { k: 'mailbox', x: 1, y: 8 }, { k: 'mailbox', x: 2, y: 19 }],
      edges: { s: { to: 'oldrail', dx: 0 }, e: { to: 'wildheart', dy: 0 } },
      zones: [{ x: 9, y: 22, w: 3, h: 1, event: 'm4arrive' }, { x: 28, y: 11, w: 1, h: 3, event: 'm4ranger', block: true }],
      items: [{ x: 3, y: 22, item: 'superpotion', n: 1 }, { x: 20, y: 3, item: 'great', n: 2 }, { x: 27, y: 23, item: 'rarecandy', n: 1, hidden: true }, { x: 1, y: 13, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'ilse', x: 25, y: 10, dir: 'down', look: L.ilse, name: 'Warden Ilse', talk: 'm4ilseMeet', show: ['!m4ilse'] },
        { id: 'ranger', x: 27, y: 10, dir: 'down', look: L.m4ranger, name: 'Ranger Pell', talk: 'm4rangerTalk' },
        { id: 'tomas', x: 12, y: 16, dir: 'left', look: L.oldman, name: 'Old Tomas', talk: 'm4tomas' },
        { id: 'fen', x: 18, y: 20, dir: 'down', look: L.m4fen, name: 'Fen', talk: 'm4fen' },
        { id: 'carver', x: 20, y: 9, dir: 'down', look: L.man, name: 'Carver Aldo', talk: 'm4carver' },
        { id: 'kid', x: 6, y: 13, dir: 'down', look: L.kid, wander: 2, talk: 'm4mgKid' },
        { id: 'gran', x: 3, y: 10, dir: 'right', look: L.oldlady, name: 'Granny Moss', talk: 'm4mgGran' }] });
  }
  center('center_mossgrove', 'mossgrove');
  mart('mart_mossgrove', 'mossgrove', ['poke', 'great', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'fullheal', 'repel', 'leafstone']);
  def({ id: 'mossgrove_elder', name: 'Elder Rowan\'s house', kind: 'inside', outside: 'mossgrove', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm4elderShelf' }, { k: 'stove', x: 4, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 1, y: 3 }],
    npcs: [{ id: 'rowan', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Elder Rowan', talk: 'm4elder' }] });
  def({ id: 'mossgrove_club', name: 'Lighthouse Kids Club HQ', kind: 'inside', outside: 'mossgrove', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(3, 3, 7, 4, 'R').rows(), arrive: { x: 5, y: 6 },
    furniture: [{ k: 'desk', x: 1, y: 1, talk: 'm4clubMap' }, { k: 'boxes', x: 8, y: 1 }, { k: 'boxes', x: 9, y: 1 }, { k: 'boxes', x: 9, y: 2 }, { k: 'tv', x: 5, y: 1, talk: 'tv' }, { k: 'plant', x: 1, y: 6 }],
    npcs: [{ id: 'poppy', x: 5, y: 3, dir: 'down', look: L.m4poppy, name: 'Captain Poppy', talk: 'm4poppy' }] });
  def({ id: 'mossgrove_hollin', name: 'The Hollin house', kind: 'inside', outside: 'mossgrove', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 3, 6, 4, 'R').rows(), arrive: { x: 5, y: 6 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm4lantern' }, { k: 'shelf', x: 4, y: 1 }, { k: 'tv', x: 7, y: 1, talk: 'tv' }, { k: 'sofa', x: 7, y: 4 }, { k: 'plant', x: 9, y: 6 }, { k: 'plant', x: 1, y: 6 }],
    npcs: [{ id: 'hollin', x: 3, y: 4, dir: 'right', look: L.woman, name: 'Mrs. Hollin', talk: 'm4hollin' }, { id: 'son', x: 8, y: 3, dir: 'down', look: L.youngster, name: 'Danny', talk: 'm4danny' }] });

  // ---- the Mossgrove Light: Warden Ilse's gym (vine walls; the lamp room is upstairs)
  def({ id: 'mossgym', name: 'Mossgrove Light', kind: 'inside', gym: true, outside: 'mossgrove', battle: 'forest', music: 'gym',
    rows: grid(15, 14, 'g').border('#').put(7, 13, 'm').fill(1, 10, 10, 10, 'V').fill(4, 7, 13, 7, 'V').fill(1, 4, 10, 4, 'V').fill(5, 1, 9, 2, 'R').put(7, 1, '<').rows(),
    arrive: { x: 7, y: 12 },
    furniture: [{ k: 'statue', x: 5, y: 12, talk: 'm4gymStatue' }, { k: 'statue', x: 9, y: 12, talk: 'm4gymStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }, { k: 'plant', x: 1, y: 12 }, { k: 'plant', x: 13, y: 12 }],
    warps: [{ x: 7, y: 1, to: 'mossgym2', tx: 5, ty: 6, dir: 'up' }],
    npcs: [{ id: 'nils', x: 13, y: 11, dir: 'left', look: L.bug, name: 'Bug Catcher Nils', trainer: 'm4g1' },
      { id: 'lys', x: 1, y: 8, dir: 'right', look: L.aroma, name: 'Keeper Lys', trainer: 'm4g2' },
      { id: 'oren', x: 13, y: 5, dir: 'left', look: L.m4ranger, name: 'Keeper Oren', trainer: 'm4g3' }] });
  def({ id: 'mossgym2', name: 'Mossgrove Light - Lamp Room', kind: 'inside', gym: true, battle: 'forest', music: 'gym',
    rows: grid(11, 9, 'g').border('#').fill(3, 3, 7, 4, 'R').put(5, 7, '>').rows(),
    furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm4mossLamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }, { k: 'plant', x: 1, y: 6 }, { k: 'plant', x: 9, y: 6 }],
    warps: [{ x: 5, y: 7, to: 'mossgym', tx: 7, ty: 2, dir: 'down' }],
    npcs: [{ id: 'ilse', x: 5, y: 2, dir: 'down', look: L.ilse, name: 'Warden Ilse', trainer: 'ilse' }] });

  // =====================================================================
  //  The Wildheart - a jungle of giant trees, cut in two by the Wildheart
  //  River. The Lantern Bridge fell twenty years ago; in the Echo it
  //  still stands (the shrines on both banks switch worlds).
  // =====================================================================
  {
    const B = grid(48, 36, '.').border('T', { w: [11, 13], e: [20, 22] });
    // the river and its banks; the stumps of the old bridge
    B.fill(21, 1, 25, 34, '~').fill(20, 10, 20, 23, ':').fill(26, 10, 26, 23, ':').fill(20, 16, 21, 17, 'b').fill(25, 16, 26, 17, 'b');
    B.fill(22, 27, 24, 29, ':');                                         // a little island (only the Echo's planks reach it)
    // --- the west bank: forest walls, the path north and round to the bridge, the long way south
    B.fill(1, 1, 20, 5, 'T').fill(1, 6, 3, 10, 'T').fill(1, 14, 3, 34, 'T').fill(1, 30, 20, 34, 'T').fill(16, 6, 20, 9, 'T').fill(16, 10, 19, 14, 'T');
    B.fill(6, 1, 11, 4, '.').fill(6, 2, 8, 3, '*').put(9, 5, ',');      // the hidden grove and the old keeper's hut
    B.fill(0, 11, 5, 13, ',').fill(4, 6, 5, 13, ',').fill(4, 6, 15, 7, ',').fill(14, 6, 15, 17, ',').fill(14, 16, 19, 17, ',');
    B.fill(4, 13, 5, 29, ',').fill(4, 28, 20, 29, ',');
    B.fill(6, 8, 13, 15, ';').fill(8, 10, 9, 11, 'T').fill(12, 13, 13, 14, 'T');
    B.fill(6, 18, 18, 27, ';').fill(9, 20, 11, 22, 'T').fill(15, 19, 17, 20, 'T').fill(6, 16, 13, 17, '.').fill(16, 18, 19, 18, '.').fill(19, 19, 19, 27, '.');
    B.fill(6, 24, 8, 25, '*');
    // --- the east bank: the path from the bridge, north round the giant trees, and east to Ochre
    B.fill(27, 1, 46, 4, 'T').fill(27, 5, 30, 7, 'T').fill(43, 5, 46, 18, 'T').fill(27, 33, 46, 34, 'T').fill(27, 18, 31, 22, 'T');
    B.fill(27, 16, 33, 17, ',').fill(32, 6, 33, 17, ',').fill(32, 6, 42, 7, ',').fill(41, 6, 42, 22, ',').fill(41, 20, 47, 22, ',');
    B.fill(32, 17, 33, 27, ',').fill(32, 26, 38, 27, ',').fill(37, 21, 38, 27, ',').fill(37, 21, 41, 22, ',');
    B.fill(34, 9, 40, 15, ';').fill(27, 24, 31, 32, ';').fill(39, 24, 46, 32, ';').fill(34, 29, 38, 32, ';').fill(43, 23, 46, 24, 'T');
    B.fill(34, 12, 35, 13, 'T').fill(39, 9, 40, 10, 'T').fill(28, 11, 30, 13, '*');
    // the old Lantern-folk stones among the grass
    B.put(35, 30, 'r').put(37, 30, 'r').put(35, 32, 'r').put(37, 32, 'r').fill(29, 27, 29, 28, 'r');
    def({ id: 'wildheart', name: 'The Wildheart', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 19, max: 23, table: [['kakuna', 12], ['metapod', 10], ['oddish', 12], ['bellsprout', 10], ['shroomish', 10], ['venipede', 10], ['mankey', 8], ['beedrill', 5], ['butterfree', 5], ['gloom', 5], ['vigoroth', 4], ['heracross', 3], ['pinsir', 3], ['applin', 3], ['scyther', 2], ['zorua', 2]] } },
      edges: { w: { to: 'mossgrove', dy: 0 }, e: { to: 'ochre', dy: -7 } },
      buildings: [{ b: 'house', x: 1, y: 1, deco: true }],
      furniture: [{ k: 'boxes', x: 8, y: 1, talk: 'm4ghost' }],
      signs: [{ x: 6, y: 11, text: 'THE WILDHEART\nMossgrove (west) - Ochre (east, across the river)' },
        { x: 19, y: 18, text: 'THE LANTERN BRIDGE\nBuilt by the Lantern-folk. Fell on the night the lights flickered, twenty years ago.\n(Someone has scratched: "IT STILL STANDS ON THE OTHER SIDE")' },
        { x: 36, y: 31, text: 'An old stone, worn smooth. Carved on it: eight little lighthouses in a ring, and in the middle a door, shut tight.' },
        { x: 44, y: 19, text: 'EAST: OCHRE\nThe town on the old stones.' }, { x: 10, y: 5, text: '(A sign, half eaten by moss: "KEEPER\'S HUT - PRIVATE")' }],
      props: [{ k: 'bigtree', x: 28, y: 8 }, { k: 'bigtree', x: 35, y: 18 }, { k: 'bigtree', x: 10, y: 24 }],
      items: [{ x: 7, y: 26, item: 'superpotion', n: 1 }, { x: 16, y: 27, item: 'leafstone', n: 1 }, { x: 46, y: 25, item: 'ultra', n: 1 }, { x: 28, y: 32, item: 'revive', n: 1 },
        { x: 11, y: 1, item: 'awakening', n: 2, hidden: true }, { x: 19, y: 27, item: 'great', n: 2, hidden: true }, { x: 40, y: 8, item: 'fullheal', n: 1, hidden: true }, { x: 6, y: 9, item: 'potion', n: 3, hidden: true }],
      npcs: [{ id: 'tam', x: 8, y: 9, dir: 'left', look: L.bug, name: 'Bug Catcher Tam', trainer: 'm4tam' },
        { id: 'lark', x: 11, y: 8, dir: 'up', look: L.picnicker, name: 'Picnicker Lark', trainer: 'm4lark' },
        { id: 'sage', x: 10, y: 18, dir: 'left', look: L.aroma, name: 'Aroma Lady Sage', trainer: 'm4sage' },
        { id: 'wren', x: 13, y: 26, dir: 'down', look: L.picnicker, name: 'Gardener Wren', trainer: 'm4wren' },
        { id: 'holt', x: 31, y: 12, dir: 'right', look: L.m4ranger, name: 'Ranger Holt', trainer: 'm4holt' },
        { id: 'dov', x: 39, y: 26, dir: 'left', look: L.hiker, name: 'Hiker Dov', trainer: 'm4dov' },
        { id: 'moth', x: 18, y: 22, dir: 'left', look: L.m4moth, name: 'Moth', talk: 'm4moth' },
        { id: 'tansy', x: 28, y: 15, dir: 'down', look: L.oldlady, name: 'Old Tansy', talk: 'm4tansy' }] });
  }
  // ---- the Wildheart in the Echo: grey and silent; the Lantern Bridge still stands, and planks reach the island
  MMaps.echoTwin('wildheart', 'echo_wildheart', [{ x: 19, y: 15 }, { x: 27, y: 15 }], {
    name: 'The Wildheart (Echo)',
    encounters: { tall: { rate: 0.1, min: 20, max: 24, table: [['gastly', 18], ['duskull', 14], ['shuppet', 14], ['misdreavus', 10], ['litwick', 12], ['zorua', 8], ['murkrow', 10], ['venipede', 8], ['spiritomb', 2]] } },
    zones: [{ x: 22, y: 16, w: 1, h: 2, event: 'm4nell' }],
    signs: [{ x: 19, y: 18, text: 'THE LANTERN BRIDGE\nThe sign is new. The paint is still wet. Nobody has scratched anything on it yet.' }],
    items: [{ x: 23, y: 28, item: 'rarecandy', n: 1 }, { x: 22, y: 27, item: 'ultra', n: 2, hidden: true }],
    npcs: [{ id: 'nell', x: 23, y: 16, dir: 'left', look: L.nell, name: 'Nell', talk: 'm4nellTalk' }]
  }, B => {
    B.fill(20, 16, 26, 17, 'b').put(21, 28, 'b');                        // the bridge whole again; planks to the island
    B.fill(0, 11, 0, 13, 'T').fill(47, 20, 47, 22, 'T');                 // the Echo goes no further than the forest
  });
  M.echo_wildheart.furniture = [];

  // =====================================================================
  //  Ochre - a town of red earth built on the stones of the Lantern-folk.
  //  The Lantern Ruins open north of the plaza; Warden Bastian's Light
  //  stands over the dig site.
  // =====================================================================
  {
    const B = grid(32, 28, ':').border('T', { w: [13, 15], n: [14, 17] }, 1);
    // the ruins' gate, the north street and the plaza, the west road
    B.fill(14, 0, 17, 6, 'u').fill(12, 1, 13, 4, '#').fill(18, 1, 19, 4, '#').fill(11, 7, 20, 15, 'u').fill(0, 13, 10, 15, 'u').fill(21, 10, 26, 10, 'u');
    B.fill(14, 16, 17, 18, 'u').fill(6, 12, 7, 12, 'u').fill(6, 21, 6, 21, 'u').fill(24, 22, 24, 22, 'u');
    // the dig site: old walls and stones
    B.fill(22, 12, 30, 16, ':').put(22, 12, '#').put(23, 12, '#').put(28, 12, '#').fill(30, 12, 30, 14, '#').put(25, 14, 'r').put(27, 15, 'r').put(22, 16, 'r');
    // trees, palms and gardens
    B.fill(1, 9, 2, 12, 'T').fill(1, 16, 2, 19, 'T').fill(1, 1, 8, 2, 'T').fill(20, 1, 22, 2, 'T').fill(29, 1, 30, 9, 'T').fill(1, 24, 9, 26, 'T');
    B.fill(9, 17, 10, 18, '*').fill(21, 24, 23, 25, '*').fill(3, 4, 6, 5, '*');
    def({ id: 'ochre', name: 'Ochre', kind: 'town', rows: B.rows(), music: 'town', battle: 'forest', fly: { x: 8, y: 14 }, center: { map: 'center_ochre' },
      buildings: [{ b: 'center', x: 4, y: 7, to: 'center_ochre' }, { b: 'mart', x: 4, y: 17, to: 'mart_ochre' },
        { b: 'lighthouse', x: 24, y: 3, to: 'ochregym', variant: 3, needs: ['m4ruins'], locked: 'm4ochreLocked' },
        { b: 'museum', x: 12, y: 19, to: 'ochredig' }, { b: 'house', x: 22, y: 18, to: 'ochre_house1', variant: 3 }, { b: 'house2', x: 26, y: 22, to: 'ochre_house2' }],
      signs: [{ x: 10, y: 12, text: 'OCHRE\nBuilt on the old stones, and proud of it.' }, { x: 23, y: 9, text: 'OCHRE LIGHT\nWarden: BASTIAN\nThe fourth of the Eight Lights of Meridia.' },
        { x: 13, y: 6, text: 'THE LANTERN RUINS\nBy order of the Warden: no digging without a permit. No Lumen lanterns past this point.' },
        { x: 11, y: 22, text: 'OCHRE DIG HOUSE\nFinds from the Lantern Ruins. Visitors welcome; please don\'t lick the fossils.' }],
      props: [{ k: 'lamp', x: 11, y: 7 }, { k: 'lamp', x: 20, y: 7 }, { k: 'lamp', x: 11, y: 16 }, { k: 'lamp', x: 20, y: 16 }, { k: 'mailbox', x: 3, y: 21 }, { k: 'lumenlamp', x: 21, y: 11 }],
      edges: { w: { to: 'wildheart', dy: 7 }, n: { to: 'lanternruins1', dx: 0 } },
      zones: [{ x: 1, y: 13, w: 1, h: 3, event: 'm4ochre' }],
      items: [{ x: 29, y: 16, item: 'great', n: 2 }, { x: 3, y: 3, item: 'superpotion', n: 2 }, { x: 26, y: 13, item: 'revive', n: 1, hidden: true }, { x: 30, y: 26, item: 'firestone', n: 1, hidden: true }],
      npcs: [{ id: 'pim', x: 13, y: 12, dir: 'left', look: L.m4digger, name: 'Apprentice Pim', talk: 'm4pim' },
        { id: 'juno', x: 9, y: 12, dir: 'down', look: L.juno, name: 'Juno', talk: 'm4teofade', show: ['m4ruins', '!teofade'] },
        { id: 'juno2', x: 9, y: 12, dir: 'down', look: L.juno, name: 'Juno', talk: 'm4gala', show: ['teofade', '!ch5'] },
        { id: 'biscuit', x: 19, y: 25, dir: 'up', look: L.m4biscuit, name: 'Biscuit', talk: 'm4biscuit' },
        { id: 'digger', x: 25, y: 15, dir: 'left', look: L.m4digger, name: 'Digger Fia', talk: 'm4digger' },
        { id: 'surveyor', x: 18, y: 5, dir: 'left', look: L.keeper, name: 'Lumen Surveyor', talk: 'm4surveyor', show: ['!m4ruins'] },
        { id: 'oldman', x: 27, y: 19, dir: 'left', look: L.oldman, name: 'Old Ezra', talk: 'm4ezra' },
        { id: 'lady', x: 15, y: 9, dir: 'down', look: L.woman, wander: 2, talk: 'm4ochreLady' }] });
  }
  center('center_ochre', 'ochre');
  mart('mart_ochre', 'ochre', ['poke', 'great', 'ultra', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'iceheal', 'fullheal', 'revive', 'repel', 'firestone', 'waterstone']);
  def({ id: 'ochredig', name: 'Ochre Dig House', kind: 'inside', outside: 'ochre', rows: grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm').fill(5, 4, 9, 6, 'R').rows(), arrive: { x: 7, y: 8 },
    furniture: [{ k: 'statue', x: 2, y: 1, talk: 'm4golettStatue' }, { k: 'shelf', x: 4, y: 1, talk: 'm4fossils' }, { k: 'shelf', x: 7, y: 1, talk: 'm4fossils' }, { k: 'machine', x: 11, y: 1, talk: 'm4digMachine' },
      { k: 'desk', x: 1, y: 5 }, { k: 'statue', x: 13, y: 5, talk: 'm4lanternStatue' }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }],
    npcs: [{ id: 'sefa', x: 3, y: 4, dir: 'right', look: L.curator, name: 'Dr. Sefa', talk: 'm4sefa' }, { id: 'visitor', x: 10, y: 6, dir: 'up', look: L.lass, name: 'Visitor', talk: 'm4digVisitor' }] });
  def({ id: 'ochre_house1', name: 'House', kind: 'inside', outside: 'ochre', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'stove', x: 4, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }, { k: 'plant', x: 7, y: 1 }],
    npcs: [{ id: 'nana', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Nana Juniper', talk: 'm4juniper' }] });
  def({ id: 'ochre_house2', name: 'House', kind: 'inside', outside: 'ochre', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 3, 6, 4, 'R').rows(), arrive: { x: 5, y: 6 },
    furniture: [{ k: 'bed', x: 1, y: 1 }, { k: 'tv', x: 5, y: 1, talk: 'tv' }, { k: 'shelf', x: 7, y: 1 }, { k: 'plant', x: 9, y: 6 }],
    npcs: [{ id: 'ollie', x: 8, y: 4, dir: 'left', look: L.m4ollie, name: 'Ollie', talk: 'm4ollie' }, { id: 'mum', x: 3, y: 5, dir: 'right', look: L.woman, name: 'Ollie\'s mum', talk: 'm4ollieMum' }] });

  // ---- the Ochre Light: Warden Bastian's gym (boulders; the lamp room is upstairs)
  {
    const B = grid(15, 16, 'g').border('#').put(7, 15, 'm');
    B.fill(1, 12, 5, 12, 'r').fill(9, 12, 13, 12, 'r').fill(3, 9, 11, 9, 'r').fill(1, 6, 4, 6, 'r').fill(7, 6, 13, 6, 'r').fill(5, 3, 13, 3, 'r').fill(5, 1, 9, 2, 'R').put(7, 1, '<');
    def({ id: 'ochregym', name: 'Ochre Light', kind: 'inside', gym: true, outside: 'ochre', battle: 'stadium', music: 'gym', rows: B.rows(), arrive: { x: 7, y: 14 },
      furniture: [{ k: 'statue', x: 5, y: 14, talk: 'm4ochreStatue' }, { k: 'statue', x: 9, y: 14, talk: 'm4ochreStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }],
      warps: [{ x: 7, y: 1, to: 'ochregym2', tx: 5, ty: 6, dir: 'up' }],
      npcs: [{ id: 'uma', x: 1, y: 10, dir: 'right', look: L.m4digger, name: 'Digger Uma', trainer: 'm4g4' },
        { id: 'bram', x: 13, y: 7, dir: 'left', look: L.hiker, name: 'Hiker Bram', trainer: 'm4g5' },
        { id: 'tove', x: 1, y: 4, dir: 'right', look: L.m4digger, name: 'Digger Tove', trainer: 'm4g6' }] });
  }
  def({ id: 'ochregym2', name: 'Ochre Light - Lamp Room', kind: 'inside', gym: true, battle: 'stadium', music: 'gym',
    rows: grid(11, 9, 'g').border('#').fill(3, 3, 7, 4, 'R').put(5, 7, '>').put(1, 4, 'r').put(9, 4, 'r').rows(),
    furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm4ochreLamp' }, { k: 'statue', x: 1, y: 1 }, { k: 'statue', x: 9, y: 1 }],
    warps: [{ x: 5, y: 7, to: 'ochregym', tx: 7, ty: 2, dir: 'down' }],
    npcs: [{ id: 'bastian', x: 5, y: 2, dir: 'down', look: L.bastian, name: 'Warden Bastian', trainer: 'bastian' }] });

  // =====================================================================
  //  The Lantern Ruins - the Lantern-folk's halls under Ochre. The Lumen
  //  Company is down here; so is Bastian.
  // =====================================================================
  {
    const B = grid(30, 26, 'C');
    B.fill(14, 22, 17, 25, 'c').fill(10, 18, 19, 22, 'c');                                 // the entry hall
    B.fill(2, 18, 9, 20, 'c').fill(2, 6, 4, 20, 'c').fill(2, 3, 11, 5, 'c');                // the west gallery
    B.fill(7, 9, 14, 15, 'c').fill(10, 15, 11, 18, 'c').fill(4, 11, 7, 12, 'c');            // the pillar hall
    B.fill(20, 20, 27, 22, 'c').fill(25, 8, 27, 22, 'c').fill(16, 8, 27, 10, 'c').fill(16, 2, 18, 10, 'c').fill(16, 2, 28, 4, 'c');   // the east climb
    B.fill(20, 13, 23, 17, 'c').fill(23, 15, 25, 15, 'c');                                  // a side chamber
    B.fill(8, 10, 8, 10, 'C').fill(13, 10, 13, 10, 'C').fill(8, 14, 8, 14, 'C').fill(13, 14, 13, 14, 'C');   // pillars
    B.fill(10, 11, 11, 13, 'u').fill(14, 19, 15, 21, 'u').fill(16, 3, 17, 3, 'u');          // old paving
    B.put(27, 2, '>');
    def({ id: 'lanternruins1', name: 'Lantern Ruins', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'forest', dark: 0.3,
      encounters: { cave: { rate: 0.1, min: 21, max: 25, table: [['golett', 14], ['geodude', 16], ['graveler', 6], ['golbat', 10], ['sableye', 8], ['drilbur', 10], ['nacli', 10], ['onix', 8], ['litwick', 8], ['larvitar', 3], ['gimmighoul', 2]] } },
      edges: { s: { to: 'ochre', dx: 0 } },
      warps: [{ x: 27, y: 2, to: 'lanternruins2', tx: 4, ty: 19, dir: 'right' }],
      furniture: [{ k: 'statue', x: 9, y: 9, talk: 'm4golemStatue' }, { k: 'statue', x: 12, y: 9, talk: 'm4golemStatue' }, { k: 'boxes', x: 26, y: 20 }, { k: 'boxes', x: 27, y: 20 }],
      signs: [{ x: 13, y: 18, text: 'Carved over the arch: "WE LIT THE LIGHTS SO THE GREY WOULD SLEEP."' }, { x: 2, y: 2, text: 'Carved in the wall: a long line of little people, each carrying a lantern, walking into the sea.' }],
      items: [{ x: 11, y: 3, item: 'ultra', n: 1 }, { x: 21, y: 13, item: 'tm:rock-tomb', n: 1 }, { x: 7, y: 15, item: 'revive', n: 1 }, { x: 28, y: 3, item: 'superpotion', n: 2 },
        { x: 3, y: 19, item: 'rarecandy', n: 1, hidden: true }, { x: 14, y: 12, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'lk1', x: 9, y: 19, dir: 'left', look: L.keeper, name: 'Lightkeeper', trainer: 'm4lk1' },
        { id: 'abe', x: 7, y: 13, dir: 'right', look: L.hiker, name: 'Ruin Maniac Abe', trainer: 'm4maniac' },
        { id: 'lk2', x: 26, y: 13, dir: 'left', look: L.keeperf, name: 'Lightkeeper', trainer: 'm4lk2' },
        { id: 'lk3', x: 18, y: 6, dir: 'down', look: L.keeper, name: 'Lightkeeper', trainer: 'm4lk3' }] });
  }
  {
    const B = grid(26, 22, 'C');
    B.fill(3, 17, 20, 19, 'c').fill(18, 9, 20, 17, 'c').fill(11, 9, 20, 10, 'c').fill(5, 2, 20, 8, 'u');   // the corridor up to the mural hall
    B.fill(2, 11, 4, 17, 'c').fill(2, 11, 8, 13, 'c').fill(22, 13, 24, 19, 'c').fill(21, 13, 21, 13, 'c');  // side galleries
    B.fill(6, 2, 6, 2, 'C').fill(19, 2, 19, 2, 'C').put(3, 19, '<');
    def({ id: 'lanternruins2', name: 'Lantern Ruins - Mural Hall', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'forest', dark: 0.35,
      encounters: { cave: { rate: 0.08, min: 23, max: 26, table: [['golett', 22], ['graveler', 12], ['sableye', 10], ['duskull', 12], ['litwick', 10], ['onix', 10], ['naclstack', 4], ['larvitar', 4], ['gimmighoul', 3]] } },
      warps: [{ x: 3, y: 19, to: 'lanternruins1', tx: 26, ty: 2, dir: 'left' }],
      furniture: [{ k: 'statue', x: 8, y: 2, talk: 'm4mural1' }, { k: 'statue', x: 12, y: 2, talk: 'm4mural2' }, { k: 'statue', x: 16, y: 2, talk: 'm4mural3' }],
      zones: [{ x: 18, y: 14, w: 3, h: 1, event: 'm4agentScene' }],
      items: [{ x: 8, y: 12, item: 'ultra', n: 2 }, { x: 24, y: 19, item: 'revive', n: 1 }, { x: 2, y: 11, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'vesper', x: 12, y: 6, dir: 'down', look: L.agent, name: 'Agent Vesper', talk: 'm4agentScene', show: ['!m4agent'] },
        { id: 'k1', x: 9, y: 5, dir: 'down', look: L.keeper, name: 'Lightkeeper', talk: 'm4agentScene', show: ['!m4agent'] },
        { id: 'k2', x: 15, y: 5, dir: 'down', look: L.keeperf, name: 'Lightkeeper', talk: 'm4agentScene', show: ['!m4agent'] },
        { id: 'bastian', x: 12, y: 3, dir: 'down', look: L.bastian, name: 'Warden Bastian', talk: 'm4bastianRuins', show: ['!m4ruins'] }] });
  }

  // Chapter 4's maps
  for (const id of ['mossgrove', 'center_mossgrove', 'mart_mossgrove', 'mossgrove_elder', 'mossgrove_club', 'mossgrove_hollin', 'mossgym', 'mossgym2', 'wildheart', 'echo_wildheart',
    'ochre', 'center_ochre', 'mart_ochre', 'ochredig', 'ochre_house1', 'ochre_house2', 'ochregym', 'ochregym2', 'lanternruins1', 'lanternruins2']) M[id].chapter = 4;
  // where the Wardens stand during the Long Night (Chapter 10)
  MMaps.SPOTS.ilse = { map: 'mossgrove', x: 23, y: 10, dir: 'down' };
  MMaps.SPOTS.bastian = { map: 'ochre', x: 26, y: 11, dir: 'down' };

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- arriving in Mossgrove from the Old Rail Line
  on('m4arrive', { needs: ['!m4arrive'], sets: ['m4arrive', 'echo'] }, async J => {
    J.set('echo');   // (set since Chapter 3; repeated so the shrines always work from here)
    await J.say(['The Old Rail Line ends in a tunnel of roots. You climb out of it into green light.', 'Trees as tall as lighthouses. Moss on every roof. And hanging from every branch... a little brass Lumen lantern.']);
    await J.say(['Mossgrove. The town where the forest lets people live.', 'Somewhere up ahead is the third of the Eight Lights - Warden Ilse\'s. If the Lumen Company has been here too, she\'ll know.']);
    J.set('m4arrive');
  });
  on('m4tomas', {}, (J, n) => J.say(J.flag('badge.moss') ? 'You beat Ilse? Ha! She\'ll be humming about it for a week. That girl hums when she\'s happy, and when she loses. Mostly when she loses.' : ['Came up the old rail line, did you? Nobody\'s used that since the train... well. Since the train.', 'Welcome to Mossgrove. Pokémon Center\'s on the main street, and Ilse\'s Light is up the hill in the east.'], n));
  on('m4carver', {}, (J, n) => J.say(J.flag('ruinslore') ? 'Eight lights in a ring around a shut door? I\'ve been carving that pattern on spoons for forty years. My father taught me. I never asked why.' : 'I carve lighthouses out of fallen branches. Eight of them, always eight. Customers ask why not nine. Tradition, I tell them.', n));
  on('m4mgKid', {}, (J, n) => J.say(J.pick(['I\'m gonna be a Bug Catcher like Ilse! I caught a Caterpie today. It was a leaf. But next time!', 'Mom says the lanterns keep the bad dreams away. I don\'t have dreams anymore at all. Is that good?']), n));
  on('m4mgGran', {}, (J, n) => J.say(J.flag('ruinslore') ? 'The Lantern-folk walked into the sea with their lanterns, the story goes. To keep a door shut from the other side. Brave, foolish people.' : ['My grandmother was one of the last who spoke the old Lantern-tongue. "Ama-ri, ama-ra": "let the day go, let the day stay".', 'Funny. I can\'t remember which one meant which anymore.'], n));
  on('m4rangerTalk', {}, (J, n) => J.say(J.flag('badge.moss') ? ['You\'ve got Ilse\'s badge - the Wildheart\'s open to you. Ochre\'s on the far side of the river.', 'The bridge fell years ago, mind. Folks go the long way round... or they don\'t go at all.'] : 'The Wildheart is Warden land. Ilse decides who\'s ready for it. Beat her at her Light and I\'ll open the gate.', n));
  on('m4ranger', { needs: ['!badge.moss'] }, async J => {
    await J.say('Hold it! The Wildheart\'s Warden land. Only trainers with Ilse\'s badge go past this gate - it\'s for your own good, honest.', 'ranger');
    await J.playerWalk('left', 1);
  });
  on('m4gymLocked', {}, J => J.say('The door of the Light is shut. A note in round, happy handwriting: "Out front catching bugs! Come say hi! - Ilse"'));
  on('m4ilseMeet', { needs: ['m4arrive'], sets: ['m4ilse'] }, async (J, n) => {
    await J.say(['Oh! Hi! Don\'t move - there\'s a Butterfree on your shoulder. ...Aww, it flew off. It liked you!', 'I\'m Ilse, Warden of the Mossgrove Light. You came up the Old Rail Line? NOBODY comes up the Old Rail Line.'], n);
    await J.say(['You want to know about lost days? Huh. Okay. Funny you should ask.', 'Three weeks ago, Lumen surveyors came to "measure" my Light. Lovely people. So polite.', 'And the next morning it was Thursday. Again. My Scyther had a new scar, and I couldn\'t tell you how it got it.'], n);
    await J.say(['They kept asking about the Lantern Ruins at Ochre, past the Wildheart. What\'s down there, who digs there.', '...You\'ve got that look. A challenger\'s look! Come on in - the Light\'s open. Let\'s see if your team is worth remembering!'], n);
    await J.fade(() => { J.set('m4ilse'); J.refresh(); });
    await J.say('(You write it in the notebook: Lumen surveyors at the Mossgrove Light. A lost day. The Lantern Ruins.)');
  });
  on('m4gymStatue', {}, J => J.say(J.flag('badge.moss') ? 'MOSSGROVE LIGHT - WARDEN: ILSE\nTrainers who have earned the Moss Badge: {NAME}' : 'MOSSGROVE LIGHT - WARDEN: ILSE\n"Every season comes back. So do we."'));
  on('m4mossLamp', {}, J => J.say('The great lamp of the Mossgrove Light. Its crystal is green-gold, like sun through leaves. Moth-sized Pokémon doze on the warm glass.'));
  on('m4ilseWin', { sets: ['badge.moss'] }, async J => {
    await J.say(['Wow. WOW. My swarm\'s never been out-flown like that! Here - the Moss Badge. It\'s yours!'], 'ilse');
    J.badge('moss');
    await J.give('tm:bug-buzz');
    await J.say(['That\'s Bug Buzz! A big wobbly sound wave. My Volcarona-to-be will learn it someday. When I find one.', 'Now, listen. The ranger at the east gate will let you into the Wildheart with that badge.'], 'ilse');
    await J.say(['On the far side of the river is Ochre, and Warden Bastian. He\'s an old grump and the best digger in Meridia.', 'If the Lumen people want something in those ruins, Bastian will already be mad about it. Go!'], 'ilse');
  });

  // ---- Mossgrove houses
  on('m4elder', { sets: ['m4elderGift'] }, async (J, n) => {
    if (J.flag('ruinslore') && !J.flag('m4elderGift')) {
      await J.say(['You\'ve read the mural under Ochre? Then you know more than I do, child. Sit, sit.', 'Eight Lights around a shut door. A lantern that keeps days instead of letting them go...', 'My father told me never to take a light into the forest that I couldn\'t put out. I thought he meant fire.'], n);
      await J.say('Take this. It fell from the Elder Tree the year I was born. It has been waiting for someone going somewhere important.', n);
      await J.give('leafstone'); J.set('m4elderGift'); return;
    }
    if (J.flag('m4elderGift')) return J.say('Let the day go, let the day stay. Our ancestors knew the difference. I hope we learn it again.', n);
    return J.say(['I am Rowan, Elder of Mossgrove. Our town is older than the lighthouses, or so we like to say.', 'The Lantern-folk built the Lights. Why? Ships, the books say. But the Lantern-folk lived in a jungle. What did they care for ships?'], n);
  });
  on('m4elderShelf', {}, J => J.say('Old books. One is open at a drawing: a lighthouse with no sea anywhere near it, shining into a grey fog. The caption is in a language you can\'t read.'));
  on('m4hollin', {}, (J, n) => J.say(J.flag('lanternsecret') ? ['I... I remember now. My husband. The funeral. Last spring.', 'It hurts so much. But he was mine to remember. They had no right to take it.'] : J.flag('ruinslore') ? ['You look at our lantern like it might bite. It\'s just a lamp, dear.', '...Although. Danny says I talk about his father sometimes, and then I can\'t remember who I was talking about.'] : ['Oh, a visitor! Isn\'t our lantern lovely? The Lumen Company gave every house in Mossgrove one, free.', 'Since we got it, I\'ve been so happy. I can\'t remember the last time I cried. Isn\'t that wonderful?'], n));
  on('m4danny', {}, (J, n) => J.say(['Mom used to cry a lot. Now she doesn\'t. She smiles all the time.', 'I don\'t know why that makes me sad.'], n));
  on('m4lantern', {}, J => J.say(J.flag('lanternsecret') ? 'The Lumen lantern. You know what it does now. Its glow looks hungry.' : 'A brass Lumen lantern. Its light is soft and warm... and when you stand close, you feel like you\'re forgetting something. Something sad. It\'s nice. That\'s the worrying part.'));

  // ---- the Wildheart
  on('m4tansy', {}, (J, n) => J.say(J.flag('m4nell') ? ['You crossed? On the bridge that isn\'t there? I believe you. I saw it too, once, when I was a girl.', 'It was grey, and quiet, and there was a little girl on it with a candle. She asked me what day it was.'] : ['The Lantern Bridge fell twenty years ago, the night every light in Meridia flickered. I heard it go. Like a sigh.', 'The long way round to Ochre? There isn\'t one, dear. Not on this side of things.'], n));
  on('m4nell', { needs: ['!m4nell'], sets: ['m4nell'] }, async J => {
    await J.face('nell', 'left');
    await J.say(['...You again. The one who remembers.', 'This bridge is my favourite place. In your world it\'s gone. Here, it\'s always the night it fell. It never gets to fall.'], 'nell');
    await J.say(['Do you know why there are lights? I didn\'t. I asked the river, and the river told me.', 'The lights were built so the Grey stays shut. When a light goes dark, things fall in. Days. People.'], 'nell');
    await J.say(['...Is that what happened to me? Did I fall in?', 'My candle\'s Litwick is getting brighter lately. It\'s eating something. It won\'t tell me what.'], 'nell');
    await J.say('Go on across. The river says the old stones on the other side have more to tell you. Come back and tell me what they say, if you remember me.', 'nell');
    J.set('m4nell');
    await J.say('(You write it in the notebook: Nell says the lights keep "the Grey" shut.)');
  });
  on('m4nellTalk', {}, (J, n) => J.say(J.flag('ruinslore') ? ['The stones said there was a giant asleep under the frost? ...I think I\'ve heard it breathing. When it\'s very quiet.', 'Everything is very quiet here.'] : ['Go across. The stones are waiting.', 'I\'ll be here. I\'m always here.'], n));

  // ---- Ochre
  on('m4ochre', { needs: ['!m4ochre'], sets: ['m4ochre'] }, async J => {
    await J.say(['Red earth, white sun, and stones everywhere: walls older than any city, half buried in the streets.', 'Ochre. Built on the ruins of the Lantern-folk.']);
    await J.emote('pim', '!');
    await J.say(['A trainer! From across the river?! Please - you have to help. I\'m Pim, Warden Bastian\'s apprentice.', 'Lumen people went down into the Lantern Ruins at dawn with crates and lamps. Bastian went down after them. He hasn\'t come back up.', 'The ruins are north of the plaza. I\'m not allowed down. ...I\'m also scared. Please hurry!'], 'pim');
    J.set('m4ochre');
  });
  on('m4pim', {}, (J, n) => J.say(J.flag('badge.ochre') ? 'You beat Bastian! He smiled. I SAW it. Nobody believes me.' : J.flag('m4ruins') ? 'Bastian\'s back at the Light! He said you were "adequate". That\'s the nicest thing he\'s ever said about anybody!' : 'The Lantern Ruins are north, through the old gate. Bastian\'s down there with the Lumen people. Please!', n));
  on('m4ochreLocked', {}, J => J.say(J.flag('m4ochre') ? 'The Light\'s door is barred. Pim\'s note: "WARDEN IS IN THE RUINS. BACK SOON (I HOPE)."' : 'The Light\'s door is barred from inside.'));
  on('m4surveyor', {}, (J, n) => J.say(['Lumen Company survey team. Terribly sorry for the noise.', 'We\'re only looking. The Company never takes anything that people would miss.'], n));
  on('m4digger', {}, (J, n) => J.say(J.flag('ruinslore') ? 'A giant under a crown of frost? Frostcrown\'s the big peak up north. Nothing up there but snow and Lumen building sites.' : 'This dig\'s turned up a hundred little lanterns, all made of clay. Every one of them was broken on purpose. Smashed. Like they were afraid of them.', n));
  on('m4ezra', {}, (J, n) => J.say(J.flag('badge.ochre') ? 'Bastian\'s badge! He used to tell me rocks don\'t forget. I told him I do. We\'re both right, these days.' : ['When I was a boy, we sang to the Light every evening. "Shine so the Grey sleeps."', 'Now there\'s a Lumen lantern on every porch and nobody sings. Nobody remembers the tune.'], n));
  on('m4ochreLady', {}, (J, n) => J.say(J.pick(['The ruins hum at night. My husband says it\'s the wind. The wind doesn\'t hum in tune.', 'Ochre clay makes the best pots. And the best bricks. And the best Golett, if you believe the old stories.']), n));
  on('m4sefa', {}, (J, n) => J.say(J.flag('ruinslore') ? ['The mural says lanterns that keep days "open the Grey"? Then these clay lanterns were smashed on purpose... to let the days go.', 'Twenty years I\'ve dug here. And a child reads it to me in an afternoon. Wonderful. Infuriating!'] : ['Dr. Sefa, Ochre Dig House. Everything here came out of the Lantern Ruins.', 'The Lantern-folk built the lighthouses, made Golett from clay, and then... vanished. All in one night, the legends say.'], n));
  on('m4fossils', {}, J => J.say('Fossils from the ruins: an Old Amber with a wing inside, a spiral shell, and a jawbone labelled "DO NOT ASK BASTIAN ABOUT THIS ONE".'));
  on('m4golettStatue', {}, J => J.say('A clay Golett, life size, found sitting in the deepest hall of the ruins. Its eyes were still faintly glowing when they dug it up.'));
  on('m4lanternStatue', {}, J => J.say('A clay lantern, smashed and glued back together. The label: "Every lantern found in the ruins was broken on purpose. Why?"'));
  on('m4digMachine', {}, J => J.say('A ground scanner. Its screen shows the ruins below Ochre: halls and halls, going down further than anyone has dug.'));
  on('m4digVisitor', {}, (J, n) => J.say('I came all the way from Brassport to see the ruins! The Lumen tour guide said they were "just old walls". They are SO much more than old walls.', n));
  on('m4juniper', {}, (J, n) => J.say(['Sit down, sweetheart. You look like a child who\'s been walking through other people\'s memories.', 'My mother used to say: a lantern is for walking home in the dark. Not for keeping the dark from ever coming.'], n));
  on('m4ollieMum', {}, (J, n) => J.say('Ollie is in the Lighthouse Kids Club. Don\'t encourage him. Last week he slept in the Dig House to "catch a ghost". He caught a cold.', n));

  // ---- the Lantern Ruins: Agent Vesper, Bastian, the mural
  on('m4golemStatue', {}, J => J.say('A tall clay figure with a band across its chest. Its eyes are two empty holes. You get the feeling it\'s still guarding something.'));
  on('m4agentScene', { needs: ['!m4agent'], sets: ['m4agent'] }, async J => {
    if (J.flag('m4agent')) return;
    await J.say(['...every panel, please. Every word. The Director wants everything the Lantern-folk wrote about the Great Lantern.', 'And do be gentle with the Warden. He\'s been shouting for an hour. I think he\'s tired.'], 'vesper');
    await J.say('You\'re SCRAPING THEM. Three thousand years and you\'re scraping charcoal over them like it\'s a school project!', 'bastian');
    await J.face('vesper', 'down'); await J.emote('vesper', '!');
    await J.say(['Oh. A child. With a Pokémon. Down here. How... inconvenient.', 'I\'m Agent Vesper, of the Lumen Company. I\'m so sorry, but this is a private survey. You\'ll have to leave. I really must insist.'], 'vesper');
    if (await J.battle({ id: 'm4vesper', name: 'Agent Vesper', look: 'agent', team: [['golbat', 26], ['houndour', 26], ['honedge', 27]], pay: 60, theme: 'forest', before: 'Let\'s be quick about this. And polite.', lose: 'Oh, how very rude of me. To lose.' }, 'vesper') !== 'win') return;
    await J.say(['Well. I have most of it. The Director will have to forgive the last panel.', 'Lightkeepers - pack up. We\'re leaving. Do mind the Warden on the way out; he bites.'], 'vesper');
    await J.fade(() => { J.set('m4agent'); J.refresh(); });
    await J.say('The Lumen crew hurry away up the corridor, crates clinking. Warden Bastian dusts off his hat and looks at you for a long moment.');
    await J.say('...Hm. You. Come here. Read this with me, before somebody else does.', 'bastian');
  });
  on('m4bastianRuins', { needs: ['m4agent'], sets: ['ruinslore', 'm4ruins'] }, async (J, n) => {
    if (!J.flag('m4agent')) return J.say('Not now. Deal with the Lumen lot first. Then we talk.', n);
    await J.say(['Bastian. Warden of the Ochre Light. You\'ve met the Lumen Company, I see. Polite thieves. The worst kind.', 'Look at the mural. Read it with me. My eyes are old and my temper is older.'], n);
    await J.say(['The first panel: the Lantern-folk, in a ring, lighting eight great fires. Eight lights. The Eight Lights of Meridia.', 'In the middle: a door. Grey. Shut. "The Grey" - where days go when we let them go. Where they rest.'], n);
    await J.say(['The second panel. Someone keeps a lantern lit. Not to see by. To KEEP something. A day they loved. A person.', 'And the Grey door cracks open. Grey pours into the world. "The one who will not let go, opens the Grey."'], n);
    await J.say(['The third panel: the Lantern-folk walk into the sea with their lanterns, and smash them. Every one.', 'And under it all, asleep beneath a crown of frost... a giant. A guardian of clay. Watching the door.'], n);
    await J.say(['...The Lumen Company gives everyone in Meridia a free lantern. And people stop remembering their worst days.', 'And their best ones. You see it too. Don\'t you.'], n);
    await J.give('m4rubbing');
    await J.say(['Take my rubbing. The Lumen copy is missing the last panel; ours isn\'t.', 'Now. I owe you for the help, and I pay my debts in battles. Come to my Light when you\'re ready. I\'ll go up first and dust it off.'], n);
    await J.fade(() => { J.set('ruinslore'); J.set('m4ruins'); J.hideNpc('bastian'); });
    await J.say('(You write it in the notebook: the Lantern-folk mural. Eight Lights. A Grey door. A lantern that will not let go.)');
  });
  on('m4mural1', {}, J => J.say('The first panel: eight great fires in a ring around a grey door. Little figures with lanterns dance around them.'));
  on('m4mural2', {}, J => J.say('The second panel: one figure holds a lantern close, and the grey door is cracked open. Grey spills out over the little houses.'));
  on('m4mural3', {}, J => J.say(J.flag('m4agent') ? 'The third panel: the people walk into the sea and break their lanterns. Below, a huge clay giant sleeps under a crown of snow. (Charcoal smudges where the Lumen crew was copying it.)' : 'The third panel is half covered by Lumen sheets of paper and charcoal.'));

  // ---- the Ochre Light
  on('m4ochreStatue', {}, J => J.say(J.flag('badge.ochre') ? 'OCHRE LIGHT - WARDEN: BASTIAN\nTrainers who have earned the Ochre Badge: {NAME}' : 'OCHRE LIGHT - WARDEN: BASTIAN\n"What is carved in stone, stays."'));
  on('m4ochreLamp', {}, J => J.say('The great lamp of the Ochre Light, its crystal the colour of a sunset over red earth. Carved around its base, in the Lantern-tongue: "Shine so the Grey sleeps."'));
  on('m4bastianWin', { sets: ['badge.ochre'] }, async J => {
    await J.say(['...Well. You hold on hard, and you let go when it counts. That\'s the whole trick. Here: the Ochre Badge.'], 'bastian');
    J.badge('ochre');
    await J.give('tm:rock-slide');
    await J.say(['Rock Slide. Throw the mountain at them. It works more often than you\'d think.', 'Four Lights now. The Lumen Company has been to all of them, I\'d wager. Measuring. "Borrowing".'], 'bastian');
    await J.say(['That copy of the mural is going to Brassport. To their Director. To Cassius Vale.', 'Find out what they want with it, child. And mind your own memories while you do.'], 'bastian');
  });

  // ---- Juno: Teo is fading
  on('m4teofade', { needs: ['m4ruins'], sets: ['teofade', 'm4juno'] }, async (J, n) => {
    await J.say(['{NAME}. Hey. Hi. I ran all the way from Brassport. Through the Wildheart. Over the river. Don\'t ask how.', 'I got a letter from Mom.'], n);
    await J.say('...', n);
    await J.say(['Teo forgot my name yesterday. He looked right at me and asked Mom who "the courier girl" was.', 'And he looks... thin. Not skinny. Thin, like an old photo. You can almost see the wall through his hand when the light\'s behind him.'], n);
    await J.say(['The doctor says he\'s just tired. Mom put the free Lumen lantern by his bed, because it makes him smile.', 'It glows brighter every night, she says. Isn\'t that nice. Isn\'t that NICE.'], n);
    const a = await J.ask('What do you say?', ['He\'s going to be okay.', 'We\'ll find out what\'s doing this.', '(Stay quiet and listen.)'], n);
    if (a === 0) await J.say(['...Yeah. Yeah, he is. Because I\'m going to MAKE him okay.', 'Thanks. I needed someone to say it out loud.'], n);
    else if (a === 1) await J.say(['We. Yeah. We will. You\'re the only other person who remembers the lost days, {NAME}. You\'re the only one who\'d believe me.', 'Okay. Okay. We.'], n);
    else await J.say(['...Thanks for not saying it\'ll be fine. Everyone says it\'ll be fine.', 'Everything I do, all of it, the running and the deliveries and the stupid races... it\'s all for him. It always was.'], n);
    J.set('teofade');
    await J.say(['Ugh. I\'m shaking. I hate shaking.', 'Battle me? Just one. It helps me think. It always helps me think.'], n);
    if (await J.ask('Battle Juno?', ['Let\'s go!', 'Not right now']) === 0) {
      await J.battle({ id: 'm4juno', name: 'Juno', look: 'juno', team: rsTeam(J, [25, ['electrike', 24], ['staravia', 24], ['riolu', 23]]), pay: 50, theme: 'forest', canLose: true, before: 'Don\'t you DARE go easy on me!', lose: 'Okay... okay. My head\'s clearer. Thanks.', win: 'Ha! See? Still got it.' });
      await J.say(J.lastWin() ? ['You didn\'t go easy. Good. I\'d have been so mad.', 'Okay. I can think again.'] : ['Ha! Sorry. I needed that one.', 'Okay. I can think again.'], n);
      J.set('m4juno');
    }
    await J.say(['I\'m going to find out what that lantern is doing to my brother. Go get Bastian\'s badge - I\'ll chase a lead in town.', 'Come find me after. I\'ll be right here, pacing.'], n);
    await J.say('(You write it in the notebook: Teo is fading. The Lumen lantern by his bed glows brighter every night.)');
  });
  on('m4gala', { needs: ['teofade', 'badge.ochre'], sets: ['ch5'] }, async (J, n) => {
    if (!J.flag('badge.ochre')) return J.say(['Bastian\'s Light is open. Go get that badge. I\'m... working on something.', 'A courier hears things. Give me a little time.'], n);
    await J.say(['There you are! Four badges? Show-off. Okay. Listen. I got us a way in.', 'In three nights, the Lumen Company is throwing a Gala at the top of Cassius Vale\'s sky tower in Brassport. Everybody who\'s anybody.'], n);
    await J.say(['Cassius is going to unveil something called the GREAT LANTERN. The same thing those Lumen people were copying off the mural.', 'If there\'s a reason my brother is fading, it\'s in that tower.'], n);
    await J.say(['Reyes Couriers has the flower contract. Flowers! So I\'m in, through the service lift, with forty buckets of lilies.', 'You need to get in as a guest. Madame Odile - the tailor in the tower lobby - owes my mom a huge favour. She\'ll dress you up so fancy nobody looks twice.'], n);
    await J.give('m4pass');
    await J.say(['Show Odile that. Meet me in the tower lobby.', 'And {NAME}... thanks. For listening. For being the other one who remembers.'], n);
    await J.chapter('Chapter 4 complete!', 'Next: Chapter 5 - The Gala');
    J.set('ch5'); J.refresh();
    await J.chapter('Chapter 5', 'The Gala');
    // the courier cart back to Brassport (Chapter 5 starts in the city, under the sky tower)
    const st = MStory.CHAPTERS[5] && MStory.CHAPTERS[5].start;
    if (st && M[st.map] && await J.ask('Take the Reyes Couriers cart back to Brassport now?', ['Let\'s go', 'I\'ll walk later'], n) === 0) {
      await J.say('Hop on! Reyes Couriers: anything, anywhere, by morning. Including you.', n);
      await J.travel(st.map, st.x, st.y, st.dir || 'up');
    } else await J.say('Suit yourself! The Old Rail Line runs back down to Brassport. Don\'t be late - the Gala won\'t wait.', n);
  });

  // =====================================================================
  //  Side story: the Lighthouse Kids Club. Five kids, five sightings of
  //  "the ghost of Mossgrove": a little ghost in a stitched rag costume
  //  that lives at the old keeper's hut in the Wildheart.
  // =====================================================================
  const KIDS = ['m4kc.fen', 'm4kc.moth', 'm4kc.biscuit', 'm4kc.ollie'];
  const kidsLeft = J => KIDS.filter(f => !J.flag(f)).length;
  Object.assign(CLUES, {
    m4kids: 'The Lighthouse Kids Club (Captain Poppy, Mossgrove) is hunting "the ghost of Mossgrove". Four more members have sightings: Fen, Moth, Biscuit and Ollie.',
    'm4kc.fen': 'Fen (Mossgrove pond): the ghost carries a tiny paper lantern and has a crooked, floppy head.',
    'm4kc.moth': 'Moth (the Wildheart): the ghost slipped through the trees north of the west path, where a mossy sign says "KEEPER\'S HUT".',
    'm4kc.biscuit': 'Biscuit (Ochre): the ghost cries like a music box. It keeps calling for "Keeper".',
    'm4kc.ollie': 'Ollie (Ochre): the old lighthouse keeper of Mossgrove lived in a hut in the Wildheart. He made dolls for the village kids. He moved away years ago.',
    m4ghost: 'The ghost of Mossgrove was a Mimikyu in a doll costume the old keeper stitched for it. It came with me.'
  });
  on('m4poppy', { sets: ['m4kids', 'm4kidsDone'] }, async (J, n) => {
    if (!J.flag('m4kids')) {
      await J.say(['HALT! Password? ...You don\'t know the password. Nobody knows the password. I forgot it.', 'I\'m Captain Poppy of the Lighthouse Kids Club! We investigate mysteries. Mostly ghosts. Mostly ONE ghost.'], n);
      await J.say(['The ghost of Mossgrove! It\'s small, it\'s spooky, and EVERY member of the club has seen it. Except me.', 'You look brave. And you have Pokémon. Want to be an Honorary Member?'], n);
      await J.say(['Your mission: talk to the other four members. Fen\'s by the pond. Moth went into the Wildheart. Biscuit and Ollie live in Ochre, across the river.', 'Collect every sighting. Then find the ghost! I\'ll write it all in your notebook. Club rules.'], n);
      J.set('m4kids'); return;
    }
    if (J.flag('m4kidsDone')) return J.say('Captain\'s log: the ghost of Mossgrove was a lonely Mimikyu. Case CLOSED. Next case: who keeps eating the club biscuits. (Biscuit. It\'s Biscuit.)', n);
    if (J.flag('m4ghost')) {
      await J.say(['You FOUND it?! A Mimikyu! In a little keeper costume! And it lives with YOU now!', 'The old keeper made it that costume, didn\'t he. So it wouldn\'t be lonely. And then he forgot it.'], n);
      await J.say('That\'s the saddest, best mystery we ever solved. Honorary Member {NAME}: you are now a FULL Member. Here.', n);
      await J.give('m4clubbadge');
      await J.give('tm:shadow-ball');
      await J.say('That TM was in the club treasure box. Nobody knew how to use it. Club treasure is for full members!', n);
      J.set('m4kidsDone'); return;
    }
    const left = kidsLeft(J);
    return J.say(left ? `${left} sighting${left > 1 ? 's' : ''} still to collect! Fen's at the pond, Moth's in the Wildheart, Biscuit and Ollie are in Ochre.` : 'Every sighting! Moth saw it near the old keeper\'s hut in the Wildheart, didn\'t she? GO! Before it moves house!', n);
  });
  on('m4clubMap', {}, J => J.say('The club map of Mossgrove, covered in crayon X\'s. The biggest X is in the Wildheart, labelled "HUT?? (scary)".'));
  const kid = (id, flag, lines, idle) => on(id, { needs: ['m4kids'], sets: [flag] }, async (J, n) => {
    if (!J.flag('m4kids')) return J.say(idle, n);
    if (J.flag(flag)) return J.say(['Already told you! Go find it!', 'Lighthouse Kids Club forever!'], n);
    await J.say(lines, n);
    J.set(flag);
    const left = kidsLeft(J);
    await J.say(`(A new sighting in the notebook. ${left ? left + ' more to go.' : 'That\'s every sighting! Time to go to the keeper\'s hut.'})`);
  });
  kid('m4fen', 'm4kc.fen', ['You\'re in the CLUB?! Okay, okay - my sighting. It was right here by the pond, at sunset.', 'It had a teeny paper lantern. And its head was all crooked and floppy, like a doll\'s. It looked at its reflection for ages.'], 'Shh! I\'m on a stakeout. For a club thing. A secret club thing. Go away. (Politely.)');
  kid('m4moth', 'm4kc.moth', ['A club member! FINALLY. I\'ve been out here two days. I brought sandwiches. I ate them in the first hour.', 'The ghost went into the trees NORTH of the west path. There\'s a gap, and a mossy sign, and an old hut. I didn\'t go in. I\'m not scared. I\'m sensible.'], 'Shh! Do you hear that? ...No? Good. Me neither. Nothing. Totally normal forest.');
  kid('m4biscuit', 'm4kc.biscuit', ['Club business? Okay! I heard it, in the Wildheart, when we went berry picking.', 'It cries. But not like a person. Like a music box running down. And it says "Kee-per... kee-per..." over and over.'], 'Do you have biscuits? I collect biscuits. And ghost stories. Mostly biscuits.');
  kid('m4ollie', 'm4kc.ollie', ['A club member! I did RESEARCH. In the Dig House. All night. Mum was cross.', 'Mossgrove\'s old lighthouse keeper lived in a hut in the Wildheart. He made rag dolls for all the kids. Then he moved away, and the dolls got forgotten.'], 'I\'m the club\'s researcher. I research. Right now I\'m researching how to not be grounded.');
  on('m4ghost', { needs: ['m4kc.fen', 'm4kc.moth', 'm4kc.biscuit', 'm4kc.ollie', 'm4kids'], sets: ['m4ghost'] }, async J => {
    if (J.flag('m4ghost')) return J.say('The old keeper\'s toy chest. It\'s empty now, except for a few scraps of cloth and a spool of thread.');
    if (!J.flag('m4kids') || kidsLeft(J)) return J.say('An old wooden toy chest outside the hut. The lid is open a crack... and something inside goes very, very still.');
    await J.say(['An old wooden toy chest outside the keeper\'s hut. You kneel down, and very gently, you knock.', '...', 'The lid creaks open. Two little eyes look up at you from under a crooked rag hood, stitched to look like a tiny lighthouse keeper.']);
    await J.say(['It\'s a Mimikyu, clutching a paper lantern. It looks past you, down the path, the way Biscuit said: waiting for someone.', 'The keeper isn\'t coming back. You think it knows. It\'s been waiting anyway.']);
    await J.say('You sit with it a while. The forest is quiet. Then the little ghost climbs out of the chest, and takes hold of your sleeve.');
    J.addMon('mimikyu', 25, { met: 'The Wildheart' });
    J.set('m4ghost');
    await J.say('Mimikyu joined your team! (If your party is full, it went to the PC.) Captain Poppy will want to hear about this!');
  });

  chapter({ n: 4, title: 'The Wildheart', start: { map: 'mossgrove', x: 10, y: 24, dir: 'up' }, level: 24, badge: 'ochre', center: 'center_mossgrove',
    goals: ['m4arrive', 'm4ilse', 'badge.moss', 'm4nell', 'm4ochre', 'm4agent', 'ruinslore', 'm4ruins', 'teofade', 'badge.ochre', 'ch5'] });
})();
