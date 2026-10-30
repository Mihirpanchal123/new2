'use strict';
// =====================================================================
//  JOURNEY II - Chapter 5: The Gala. A heist. The Lumen Company throws
//  its Gala at the top of Cassius Vale's sky tower in Brassport. Juno
//  gets in with the flowers; a tailor turns you into a guest. Past the
//  doormen, through the gala and Cassius's speech, then into the staff
//  wing and the archive - past Lightkeeper guards who must not see you.
//  The archive holds the truth (the lanterns drain memories; the Lost
//  Days fuel the Great Lantern) and an old photo: Cassius and Professor
//  Okafor at the train crash. Then the alarm, the roof, Director Hask,
//  and a courier's zip-line into the night.
//  The tower itself (a `tower` building in brassport_n, needs ch5) is
//  Chapter 2's; its insides (sky1-4) are here. The plan: docs/journey2/world.md.
// =====================================================================
(() => {
  const { def, grid, L, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m5odile: { hat: null, hair: 0x1a1a24, hairStyle: 'long', top: 0x7a2a5a, sleeves: 'long', inner: 0xe8c858, legs: 0x2a1a2a, legStyle: 'skirt', shoes: 0x1a1a24, bag: null, scarf: 0xe8c858, skin: '#7a4a2a' },
    m5doorman: { hat: 'cap', hatColor: 0x2a2a3a, hatFront: 0xb08a3a, hair: 0x2b1d14, hairStyle: 'short', top: 0x2a2a3a, sleeves: 'long', inner: 0xb08a3a, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0x1a1a24, bag: null },
    m5gent: { hat: null, hair: 0xd9d9d9, hairStyle: 'short', top: 0x1a1a24, sleeves: 'long', inner: 0xffffff, legs: 0x1a1a24, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0xc84848 },
    m5lady: { hat: null, hair: 0xe8c858, hairStyle: 'long', top: 0x5a3aa8, sleeves: 'none', inner: 0xe8e8f0, legs: 0x5a3aa8, legStyle: 'skirt', shoes: 0xe8e8f0, bag: null },
    m5waiter: { hat: null, hair: 0x2b1d14, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'long', inner: 0x1a1a24, legs: 0x1a1a24, legStyle: 'pants', shoes: 0x1a1a24, bag: null },
    m5junoW: { hat: 'cap', hatColor: 0xf07a30, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'pigtails', top: 0xf4f4f4, sleeves: 'long', inner: 0x1a1a24, legs: 0x1a1a24, legStyle: 'pants', shoes: 0xf07a30, bag: 0x8a5a30, skin: '#c88a5a' }
  });

  // ---- items
  Object.assign(ITEMS, {
    m5suit: { name: 'Gala Disguise', pocket: 'key', price: 0, desc: 'Madame Odile\'s finest: a midnight-blue evening outfit, a lantern-gold mask and a name card that says "Guest of the House". Nobody looks twice.' },
    m5photo: { name: 'Old Photo', pocket: 'key', price: 0, desc: 'Two young scientists in front of a wrecked train in the snow: Cassius Vale and Amara Okafor. On the back: "Line 7, the night of the crash. A. & C. - We did this."' },
    m5ledger: { name: 'Ledger Page', pocket: 'key', price: 0, desc: 'A page torn from the Lumen ledger: "PROJECT GREAT LANTERN - days collected by district". At the bottom: "R., TEO (TIDEMARK) - PRIORITY DRAW."' }
  });

  // ---- the clue notebook
  Object.assign(CLUES, {
    m5plan: 'In the sky tower lobby: Juno is in with the flowers. Madame Odile, the tailor (lobby side room, west), will dress me as a guest so the doormen let me up.',
    disguise: 'Disguised as a Gala guest. The doormen at the lobby stairs will let me up to the Gala now.',
    m5speech: 'Cassius\'s speech: the Great Lantern on Frostcrown. "A light that will keep every day you have ever loved. Nothing in Meridia will ever be lost again."',
    m5door: 'Juno opened the staff door in the gala hall (north-east). The archive is upstairs. Lightkeeper guards: stay out of their line of sight - crates and shelves block it.',
    lanternsecret: 'THE TRUTH: every free Lumen lantern drains its household\'s days - grief first, then joy. The Lost Days are carried to Frostcrown to fuel the Great Lantern. Teo is a "priority draw".',
    photo: 'An old photo in Cassius\'s desk: Cassius and Professor OKAFOR, young, at the wreck of the ghost train. "We did this." What did the Professor do?',
    m5hask: 'Director Hask, Lumen security, on the roof: "The Director of everything is Mr. Vale. And Mr. Vale does not lose things."',
    ch6: 'Escaped the tower by Juno\'s zip-line. Professor Okafor has answers to give: her institute is in Saltmere, south through Brassport and down the Sunken Road.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // guests at the Gala (they only notice you up close)
    m5aldous: { team: [['persian', 29], ['kangaskhan', 30]], pay: 40, theme: 'city', look: 'm5gent', name: 'Gentleman Aldous', sight: 2, before: 'A young guest! Splendid. In my day, we settled introductions with a battle. Shall we?', lose: 'Ha! Splendid. Utterly splendid.', after: 'Cassius Vale is a marvel. Since I took his lantern, I can\'t remember a single bad day. Can\'t remember my brother\'s name, either. Odd.' },
    m5margaux: { team: [['wigglytuff', 29], ['lopunny', 30]], pay: 40, theme: 'city', look: 'm5lady', name: 'Socialite Margaux', sight: 2, before: 'Darling, that mask! Odile\'s work, surely. Let\'s see if your battling is as tailored.', lose: 'Oh, how gauche of me. To lose.', after: 'They say Cassius lost someone, long ago. You\'d never know it. He smiles at everyone like they\'re the last person on earth.' },
    m5vance: { team: [['magneton', 30], ['porygon2', 30]], pay: 40, theme: 'city', look: 'astro', name: 'Engineer Vance', sight: 2, before: 'I designed the lantern circuits! Well, the little ones. Battle me and I\'ll tell you about capacitors!', lose: 'Short-circuited. Literally.', after: 'The household lanterns all feed a central line. To Frostcrown, I think. I never asked what they feed it. I\'m not paid to ask.' },
    // the archive's night staff
    m5lk1: { team: [['golbat', 30], ['murkrow', 31]], pay: 34, theme: 'city', look: 'keeper', name: 'Night Archivist', sight: 3, before: 'Oh! A guest, in the archive? Terribly sorry, I\'ll have to stop you. Battle-wise.', lose: 'I\'ll... file this under "losses".', after: 'Please don\'t touch the ledger. Or do. I didn\'t see anything. I\'m very bad at seeing things.' },
    m5lk2: { team: [['magneton', 30], ['houndour', 31]], pay: 34, theme: 'city', look: 'keeperf', name: 'Night Archivist', sight: 3, before: 'Mr. Vale\'s study is private! I must insist. Very politely. With Pokémon.', lose: 'Oh, he\'s going to be so understanding about this. That\'s the worst part.', after: 'He keeps one photo on his desk. Face down. Every night I turn it face up, and every morning it\'s face down again.' },
    // the roof
    m5agent1: { team: [['honedge', 31], ['croagunk', 31], ['golbat', 31]], pay: 44, theme: 'city', look: 'agent', name: 'Lumen Agent', before: 'Lovely night for it. For what? For apologising to you, of course. Sorry in advance.', lose: 'And sorry afterwards, too.', after: 'The Director is waiting by the beacon. He has never once raised his voice. Think about that.' },
    m5agent2: { team: [['houndoom', 31], ['litwick', 30], ['magnemite', 30]], pay: 44, theme: 'city', look: 'agent', name: 'Lumen Agent', before: 'The tower is sealed. The only way down is with us. Politely.', lose: 'Impolite. But effective.', after: 'There\'s a zip-line hook on the north rail. Couriers use them between towers. Not that I\'m telling you.' }
  });

  // =====================================================================
  //  The sky tower, floor 1: the lobby. The doormen at the stairs only
  //  let guests up; Madame Odile's fitting room is the side room, west.
  // =====================================================================
  {
    const B = grid(24, 14, '+').border('#').put(15, 13, 'm');
    B.fill(7, 1, 7, 12, '#').put(7, 10, '+').fill(1, 1, 6, 12, '_').fill(2, 6, 5, 8, 'R');   // Madame Odile's fitting room
    B.fill(14, 3, 16, 12, 'R').fill(13, 1, 17, 2, 'R').put(15, 1, '<');                      // the red carpet up to the stairs
    def({ id: 'sky1', name: 'Lumen Tower - Lobby', kind: 'inside', outside: 'brassport_n', rows: B.rows(), music: 'town', battle: 'city', arrive: { x: 15, y: 12 },
      furniture: [{ k: 'counter', x: 18, y: 7 }, { k: 'plant', x: 8, y: 1 }, { k: 'plant', x: 22, y: 1 }, { k: 'plant', x: 8, y: 12 }, { k: 'plant', x: 22, y: 12 },
        { k: 'sofa', x: 9, y: 6 }, { k: 'sofa', x: 9, y: 9 }, { k: 'machine', x: 19, y: 1, talk: 'm5bigLantern' }, { k: 'statue', x: 12, y: 1, talk: 'm5lobbyStatue' },
        { k: 'shelf', x: 1, y: 1, talk: 'm5fabrics' }, { k: 'shelf', x: 4, y: 1, talk: 'm5fabrics' }, { k: 'statue', x: 1, y: 4, talk: 'm5mannequin' }, { k: 'statue', x: 6, y: 4, talk: 'm5mannequin' }, { k: 'desk', x: 1, y: 11 }],
      warps: [{ x: 15, y: 1, to: 'sky2', tx: 2, ty: 20, dir: 'right' }],
      zones: [{ x: 8, y: 3, w: 15, h: 1, event: 'm5doorman', block: true }],
      items: [{ x: 6, y: 12, item: 'superpotion', n: 2, hidden: true }],
      npcs: [{ id: 'door1', x: 13, y: 2, dir: 'down', look: L.m5doorman, name: 'Doorman', talk: 'm5doormanTalk' },
        { id: 'door2', x: 17, y: 2, dir: 'down', look: L.m5doorman, name: 'Doorman', talk: 'm5doormanTalk' },
        { id: 'desk', x: 19, y: 6, dir: 'down', look: L.keeperf, name: 'Receptionist', talk: 'm5reception', counter: true },
        { id: 'juno', x: 11, y: 10, dir: 'down', look: L.m5junoW, name: 'Juno', talk: 'm5juno', show: ['!disguise'] },
        { id: 'odile', x: 3, y: 5, dir: 'down', look: L.m5odile, name: 'Madame Odile', talk: 'm5tailor' },
        { id: 'attendant', x: 5, y: 10, dir: 'left', look: L.aide, name: 'Wellness Attendant', talk: 'm5attendant' },
        { id: 'guest', x: 20, y: 10, dir: 'left', look: L.m5gent, name: 'Early Guest', talk: 'm5lobbyGuest' }] });
  }

  // =====================================================================
  //  Floor 2: the gala hall (Cassius's stage at the north end) and, behind
  //  the staff door, the service wing: three store rooms, Lightkeeper
  //  guards, and the stairs to the archive. Crates block a guard's view.
  // =====================================================================
  {
    const B = grid(34, 22, '+').border('#');
    B.fill(22, 1, 22, 20, '#').fill(23, 1, 32, 20, 'h').put(22, 4, 'h');                      // the wall and the staff door
    B.fill(23, 6, 31, 6, '#').fill(24, 12, 32, 12, '#');                                      // the store rooms (a gap at the end of each)
    B.fill(6, 1, 16, 3, 'R').fill(7, 13, 15, 19, 'R').put(1, 20, '>').put(32, 20, '<');
    const back = (x, y, dir) => ({ map: 'sky2', x, y, dir });
    const A = back(23, 4, 'right'), Bk = back(32, 7, 'left'), C = back(23, 13, 'down');
    def({ id: 'sky2', name: 'Lumen Tower - Gala Hall', kind: 'inside', rows: B.rows(), music: 'town', battle: 'city',
      furniture: [{ k: 'table', x: 3, y: 15 }, { k: 'table', x: 17, y: 15 }, { k: 'table', x: 3, y: 18 }, { k: 'table', x: 17, y: 18 }, { k: 'table', x: 3, y: 8 }, { k: 'table', x: 17, y: 8 },
        { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 21, y: 1 }, { k: 'plant', x: 21, y: 20 }, { k: 'machine', x: 10, y: 1, talk: 'm5stageLantern' },
        // the service wing: crates, flower buckets
        { k: 'boxes', x: 28, y: 4 }, { k: 'boxes', x: 23, y: 1 }, { k: 'boxes', x: 24, y: 1 }, { k: 'plant', x: 30, y: 1, talk: 'm5lilies' }, { k: 'plant', x: 31, y: 1, talk: 'm5lilies' },
        { k: 'boxes', x: 25, y: 10 }, { k: 'boxes', x: 30, y: 8 }, { k: 'boxes', x: 32, y: 10 }, { k: 'boxes', x: 32, y: 11 },
        { k: 'boxes', x: 24, y: 13 }, { k: 'boxes', x: 23, y: 16 }, { k: 'boxes', x: 28, y: 16 }, { k: 'boxes', x: 25, y: 18 }, { k: 'boxes', x: 30, y: 18 }],
      warps: [{ x: 1, y: 20, to: 'sky1', tx: 15, ty: 2, dir: 'down' }, { x: 32, y: 20, to: 'sky3', tx: 2, ty: 20, dir: 'right' }],
      zones: [{ x: 1, y: 12, w: 21, h: 1, event: 'm5speech' }, { x: 22, y: 4, w: 1, h: 1, event: 'm5staffDoor', block: true }],
      items: [{ x: 1, y: 13, item: 'fullheal', n: 1, hidden: true }, { x: 27, y: 9, item: 'revive', n: 1 }, { x: 31, y: 19, item: 'ultra', n: 2 }],
      npcs: [{ id: 'cassius', x: 11, y: 3, dir: 'down', look: L.cassius, name: 'Cassius Vale', talk: 'm5cassius', show: ['!ch6'] },
        { id: 'hask', x: 14, y: 3, dir: 'down', look: L.hask, name: 'Director Hask', talk: 'm5haskHall', show: ['!m5alarm'] },
        { id: 'juno', x: 21, y: 5, dir: 'left', look: L.m5junoW, name: 'Juno', talk: 'm5junoHall', show: ['!m5door'] },
        { id: 'aldous', x: 6, y: 16, dir: 'right', look: L.m5gent, name: 'Gentleman Aldous', trainer: 'm5aldous' },
        { id: 'margaux', x: 16, y: 10, dir: 'left', look: L.m5lady, name: 'Socialite Margaux', trainer: 'm5margaux' },
        { id: 'vance', x: 12, y: 20, dir: 'up', look: L.astro, name: 'Engineer Vance', trainer: 'm5vance' },
        { id: 'g1', x: 5, y: 9, dir: 'down', look: L.m5lady, name: 'Guest', talk: 'm5guest1' },
        { id: 'g2', x: 19, y: 15, dir: 'left', look: L.oldman, name: 'Guest', talk: 'm5guest2' },
        { id: 'g3', x: 9, y: 6, dir: 'up', look: L.woman, name: 'Guest', talk: 'm5guest3' },
        { id: 'g4', x: 2, y: 12, dir: 'right', look: L.m5gent, name: 'Guest', talk: 'm5guest4' },
        { id: 'waiter', x: 14, y: 17, dir: 'left', look: L.m5waiter, name: 'Waiter', wander: 1, talk: 'm5waiter' },
        // the guards of the service wing (they send you back to the door of their room)
        { id: 'gd1', x: 32, y: 3, dir: 'left', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 10, back: A, show: ['!ch6'] },
        { id: 'gd2', x: 28, y: 1, dir: 'down', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: A, show: ['!ch6'] },
        { id: 'gd3', x: 25, y: 7, dir: 'down', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: Bk, show: ['!ch6'] },
        { id: 'gd4', x: 30, y: 11, dir: 'up', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: Bk, show: ['!ch6'] },
        { id: 'gd5', x: 32, y: 13, dir: 'left', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 10, back: C, show: ['!ch6'] },
        { id: 'gd6', x: 23, y: 20, dir: 'up', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: C, show: ['!ch6'] },
        { id: 'gd7', x: 28, y: 20, dir: 'up', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: C, show: ['!ch6'] }] });
  }

  // =====================================================================
  //  Floor 3: the archive. Shelves in rows; Lightkeepers watching the
  //  aisles; the ledger in the west office, Cassius's study in the east.
  //  The stairs to the roof stay locked until the alarm unlocks the fire
  //  doors.
  // =====================================================================
  {
    const B = grid(30, 22, '+').border('#');
    B.fill(9, 1, 9, 7, '#').fill(1, 7, 9, 7, '#').put(5, 7, '+');                             // the west office
    B.fill(20, 1, 20, 7, '#').fill(20, 7, 28, 7, '#').put(24, 7, '+');                        // Cassius's study
    B.fill(21, 1, 28, 6, 'R').put(13, 1, '#').put(15, 1, '#').put(14, 1, '<').put(1, 20, '>');
    const back = (x, y, dir) => ({ map: 'sky3', x, y, dir });
    const low = back(2, 20, 'right'), mid = back(27, 14, 'left'), top = back(13, 10, 'up');
    const shelves = (y, xs) => xs.map(x => ({ k: 'shelf', x, y, talk: 'm5shelf' }));
    def({ id: 'sky3', name: 'Lumen Tower - Archive', kind: 'inside', rows: B.rows(), music: 'forest', battle: 'city',
      furniture: [...shelves(11, [1, 3, 5, 7, 9, 11, 16, 18, 20, 22, 24, 26]), { k: 'boxes', x: 28, y: 11 }, ...shelves(15, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]),
        { k: 'boxes', x: 10, y: 19 }, { k: 'boxes', x: 18, y: 17 }, { k: 'boxes', x: 25, y: 8 }, { k: 'boxes', x: 6, y: 13 },
        { k: 'machine', x: 2, y: 1, talk: 'm5ledger' }, { k: 'pc', x: 6, y: 1, talk: 'm5pcArchive' }, { k: 'shelf', x: 1, y: 5, talk: 'm5shelf' },
        { k: 'desk', x: 24, y: 2, talk: 'm5photo' }, { k: 'shelf', x: 21, y: 1, talk: 'm5studyShelf' }, { k: 'plant', x: 28, y: 1 }, { k: 'sofa', x: 26, y: 5 }],
      warps: [{ x: 1, y: 20, to: 'sky2', tx: 31, ty: 20, dir: 'left' }, { x: 14, y: 1, to: 'sky4', tx: 11, ty: 13, dir: 'up' }],
      zones: [{ x: 14, y: 2, w: 1, h: 1, event: 'm5roofLocked', block: true }],
      items: [{ x: 8, y: 1, item: 'great', n: 3 }, { x: 28, y: 18, item: 'revive', n: 1 }, { x: 1, y: 8, item: 'superpotion', n: 2, hidden: true }, { x: 27, y: 2, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'lk1', x: 7, y: 4, dir: 'left', look: L.keeper, name: 'Night Archivist', trainer: 'm5lk1' },
        { id: 'lk2', x: 22, y: 4, dir: 'right', look: L.keeperf, name: 'Night Archivist', trainer: 'm5lk2' },
        { id: 'gd1', x: 10, y: 16, dir: 'down', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: low, show: ['!ch6'] },
        { id: 'gd2', x: 18, y: 20, dir: 'up', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: low, show: ['!ch6'] },
        { id: 'gd3', x: 14, y: 9, dir: 'down', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 6, back: mid, show: ['!ch6'] },
        { id: 'gd4', x: 1, y: 13, dir: 'right', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 12, back: mid, show: ['!ch6'] },
        { id: 'gd5', x: 1, y: 9, dir: 'right', look: L.keeper, name: 'Lightkeeper', watch: 'm5caught', sight: 8, back: top, show: ['!ch6'] },
        { id: 'gd6', x: 28, y: 8, dir: 'left', look: L.keeperf, name: 'Lightkeeper', watch: 'm5caught', sight: 8, back: top, show: ['!ch6'] }] });
  }

  // =====================================================================
  //  Floor 4: the roof. The Lumen beacon, the wind, Director Hask - and
  //  the courier's zip-line hook on the north rail.
  // =====================================================================
  {
    const B = grid(22, 16, 'h').border('f').put(11, 14, '>');
    B.fill(1, 1, 20, 2, 'b').fill(9, 6, 13, 8, 'R');
    def({ id: 'sky4', name: 'Lumen Tower - Roof', kind: 'inside', rows: B.rows(), music: 'gym', battle: 'city', dark: 0.3,
      furniture: [{ k: 'machine', x: 10, y: 1, talk: 'm5zipline' }, { k: 'machine', x: 10, y: 7, talk: 'm5beacon' }, { k: 'plant', x: 1, y: 14 }, { k: 'plant', x: 20, y: 14 }, { k: 'boxes', x: 1, y: 3 }, { k: 'boxes', x: 20, y: 3 }],
      props: [{ k: 'lumenlamp', x: 3, y: 5 }, { k: 'lumenlamp', x: 18, y: 5 }, { k: 'lumenlamp', x: 3, y: 11 }, { k: 'lumenlamp', x: 18, y: 11 }],
      warps: [{ x: 11, y: 14, to: 'sky3', tx: 14, ty: 3, dir: 'down' }],
      zones: [{ x: 1, y: 10, w: 20, h: 1, event: 'm5haskScene' }],
      items: [{ x: 20, y: 13, item: 'fullheal', n: 2 }, { x: 1, y: 7, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'hask', x: 11, y: 5, dir: 'down', look: L.hask, name: 'Director Hask', talk: 'm5haskScene', show: ['!m5hask'] },
        { id: 'a1', x: 9, y: 4, dir: 'down', look: L.agent, name: 'Lumen Agent', trainer: 'm5agent1' },
        { id: 'a2', x: 13, y: 4, dir: 'down', look: L.agent, name: 'Lumen Agent', trainer: 'm5agent2' },
        { id: 'juno', x: 12, y: 2, dir: 'down', look: L.juno, name: 'Juno', talk: 'm5escape', show: ['m5alarm', '!ch6'] }] });
  }

  for (const id of ['sky1', 'sky2', 'sky3', 'sky4']) M[id].chapter = 5;

  // A STAND-IN, only while Chapter 2 (mch2.js, loaded before this file) has not drawn Brassport North yet: the plaza
  // under the sky tower, so this chapter can be checked and played on its own. Once mch2.js defines brassport_n
  // (with its own `tower` building to sky1, needs ['ch5']) this block does nothing and can be deleted.
  if (!M.brassport_n) {
    const B = grid(40, 30, 'u').border('#');
    def({ id: 'brassport_n', name: 'Brassport', kind: 'town', rows: B.rows(), music: 'town', battle: 'city',
      buildings: [{ b: 'tower', x: 16, y: 2, to: 'sky1', needs: ['ch5'], locked: 'm5towerLocked' }],
      props: [{ k: 'lumenlamp', x: 14, y: 16 }, { k: 'lumenlamp', x: 25, y: 16 }] });
  }
  on('m5towerLocked', {}, J => J.say('The Lumen Tower. The doors are shut; a brass plaque says "PRIVATE - BY INVITATION".'));

  // the nearest free tile to (x, y) on a map (for landing somewhere on a map another chapter drew)
  function freeNear(id, x, y) {
    const m = M[id];
    if (!m) return null;
    const S = MMaps.solidGrid(m, {});
    for (const n of m.npcs) if (S[n.y]) S[n.y][n.x] = true;
    const seen = new Set(), q = [[Math.max(0, Math.min(m.w - 1, x)), Math.max(0, Math.min(m.h - 1, y))]];
    while (q.length) {
      const [cx, cy] = q.shift(), k = cx + ',' + cy;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!S[cy][cx]) return { x: cx, y: cy };
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h) q.push([nx, ny]); }
    }
    return null;
  }

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- the lobby
  on('m5juno', { sets: ['m5plan'] }, async (J, n) => {
    if (J.flag('m5plan')) return J.say(['Odile\'s fitting room is through the little door on the west side. Show her the Courier Pass!', 'I\'ll take the service lift up with the lilies and meet you in the gala hall. Act fancy. Pretend you like cheese.'], n);
    await J.say(['Psst! Over here! Behind the forty buckets of lilies. Yes, it\'s me. Yes, I\'m wearing a bow tie. Not a word.', 'Look at this place. Gold everywhere. And every single light in it is a Lumen lantern.'], n);
    await J.say(['The plan: those doormen only let guests up the stairs. Odile turns you into a guest - fitting room, west side.', 'Then you go up to the Gala, smile, listen to Cassius\'s big speech... and when everyone\'s looking at him, we slip into the staff wing.'], n);
    await J.say(['Lumen keeps its records in the archive, above the gala hall. Somewhere in there is the reason Teo is fading.', 'I\'m going up with the flowers. See you upstairs, Your Fanciness.'], n);
    J.set('m5plan');
    await J.say('(You write it in the notebook: get a disguise from Madame Odile, west side of the lobby.)');
  });
  on('m5tailor', { needs: ['m5plan'], sets: ['disguise'] }, async (J, n) => {
    if (J.flag('disguise')) return J.say(['Exquisite. If anyone asks, you are the child of a shipping family from Gullwing Isle. Old money. Very bored.', 'Do try not to run in the hall, darling. Old money never runs.'], n);
    if (!J.flag('m5plan')) return J.say('Madame Odile, tailor to the Lumen Gala. Fittings are by appointment only, darling. And you, I\'m afraid, are not an appointment.', n);
    await J.say(['A Reyes Couriers pass? Hm! So the Reyes girl finally calls in her mother\'s favour. I owe that woman a wedding dress and my good name.', 'Stand still. Arms out. Let me look at you.'], n);
    const c = await J.ask('"Which colour, darling?"', ['Midnight blue', 'Lantern gold', 'Just make me invisible'], n);
    await J.fade(async () => { await J.wait(500); });
    await J.say(c === 0 ? 'Midnight blue, a silver collar, and a little lantern-gold mask. You look like the night sky got invited to a party.'
      : c === 1 ? 'Lantern gold, head to toe, with a midnight mask. You look like you OWN a lantern company. Delicious.'
        : 'A grey velvet suit so perfectly ordinary that your eyes slide right off it. My masterpiece. Nobody will remember you were here.', n);
    await J.give('m5suit');
    J.set('disguise');
    await J.say(['There. The doormen will bow. And if Cassius Vale himself shakes your hand, keep smiling.', 'He has a way of looking at people. As if he\'s trying to remember them.'], n);
  });
  on('m5doorman', { needs: ['!disguise'] }, async J => {
    await J.say(['Good evening! I\'m terribly sorry, but the Gala is for invited guests only.', 'Invitation and formal attire, please. ...Oh dear. No, I\'m afraid that won\'t do at all. So sorry!'], 'door1');
    await J.playerWalk('down', 1);
  });
  on('m5doormanTalk', {}, (J, n) => J.say(J.flag('disguise') ? 'Welcome, welcome! The Gala is upstairs. Mr. Vale will be speaking shortly. Do enjoy the evening.' : 'Good evening! Guests only past this point, I\'m afraid. Terribly sorry.', n));
  on('m5reception', {}, (J, n) => J.say(J.flag('ch6') ? 'There was some sort of incident last night. A fire alarm. Everyone is fine! Please forget it ever happened. Most people already have.' : ['Welcome to the Lumen Tower! Lighting the way for every home in Meridia.', 'Tonight is the Gala. Mr. Vale will be unveiling the Great Lantern. It\'s going to change everything!'], n));
  on('m5attendant', {}, async (J, n) => {
    await J.say('Lumen Wellness! We keep our guests rested, refreshed and smiling. Would your Pokémon like a little pick-me-up?', n);
    if (await J.ask('Rest your Pokémon?', ['Yes, please', 'No, thanks'], n) !== 0) return;
    await J.heal(true);
    await J.say('All better! Lumen: we take care of everything. So you don\'t have to.', n);
  });
  on('m5lobbyGuest', {}, (J, n) => J.say(J.flag('disguise') ? 'Have we met? You look like old money. I adore old money. I\'m new money. Shh.' : 'Are you staff? Could you fetch my coat? ...No? How odd.', n));
  on('m5bigLantern', {}, J => J.say('A brass lantern taller than a person, glowing gold. A plaque: "THE FIRST LANTERN. Made by Cassius Vale, for a little girl who was afraid of the dark."'));
  on('m5lobbyStatue', {}, J => J.say('A bronze statue of Cassius Vale holding up a lantern. The plaque: "Nothing worth keeping should ever be lost."'));
  on('m5fabrics', {}, J => J.say('Bolts of silk in every colour of a sunset. A tag on one says: "For Mr. Vale - grey. Always grey. Do not ask."'));
  on('m5mannequin', {}, J => J.say('A mannequin in a half-finished gown, pinned all over. It looks like it\'s waiting for someone to come back.'));

  // ---- the gala hall
  on('m5speech', { needs: ['!m5speech'], sets: ['m5speech'] }, async J => {
    await J.say('A glass chimes. The music stops. The whole hall turns towards the stage, where a tall man in white is smiling at everyone at once.');
    await J.say(['Friends. Thank you for coming. Twenty years ago I stood in this city with nothing but a lantern and a promise.', 'The promise was simple: that no one in Meridia should ever have to lose what they love.'], 'cassius');
    await J.say(['You know our lanterns. One in every home. They keep the bad days gentle. They keep the nights warm.', 'Tonight, I am proud to show you what comes next.'], 'cassius');
    await J.say(['On the summit of Frostcrown, we are building the GREAT LANTERN. A light so bright it will reach every home in Meridia at once.', 'A light that will keep every day you have ever loved. Every face. Every song. Forever.'], 'cassius');
    await J.say(['Nothing in Meridia will ever be lost again.', '...To the light!'], 'cassius');
    await J.say(['"TO THE LIGHT!" Glasses rise all around you. Everyone is smiling.', 'Behind Cassius, a white-haired man in a long coat isn\'t smiling. His eyes move over the crowd slowly. Then they pass over you, and keep going.']);
    J.set('m5speech');
    await J.say('(You write it in the notebook: the Great Lantern, on Frostcrown.) Juno is waving at you from beside the staff door, north-east.');
  });
  on('m5cassius', {}, async (J, n) => {
    if (!J.flag('m5speech')) return J.say('Cassius Vale is smiling and shaking hands with a long line of guests. He hasn\'t noticed you.', n);
    if (J.flag('photo')) return J.say(['Enjoying the evening? Good. Good.', 'You look at me as if you know something about me. Most people only look at the lanterns.'], n);
    await J.say(['Ah - a young guest! Thank you for coming. I\'m Cassius.', 'Odile\'s work, that outfit. She dressed my daughter, once. For her first Lantern Night.'], n);
    await J.say(['...Forgive me. You have a look about you. Like someone who remembers things.', 'Hold on to that. It\'s rarer than you\'d think.'], n);
  });
  on('m5haskHall', {}, (J, n) => J.say(J.flag('m5speech') ? ['Director Hask. Lumen security. Enjoy the Gala.', '...We haven\'t met. Have we? I have an excellent memory for faces. It is my one vice.'] : 'Please keep the space in front of the stage clear for Mr. Vale. Thank you so much.', n));
  on('m5stageLantern', {}, J => J.say('A model of the Great Lantern on a velvet stand: a tower of brass and glass on a snowy peak, with eight thin lines running into it from every corner of the map.'));
  on('m5staffDoor', { needs: ['!m5door'] }, async J => {
    await J.say('A door marked STAFF ONLY. It\'s locked. Through the little window you can see a corridor stacked with crates.');
    await J.playerWalk('left', 1);
  });
  on('m5junoHall', { needs: ['m5speech'], sets: ['m5door'] }, async (J, n) => {
    if (!J.flag('m5speech')) return J.say(['Psst. Not yet! Everyone\'s still milling about. Go and stand near the stage for the speech.', 'When every eye in the room is on Cassius, nobody will look at us.'], n);
    await J.say(['"Nothing will ever be lost again." Did you HEAR him? Everybody clapped. I wanted to throw a bucket of lilies.', 'Okay. Focus. I swiped a staff key from the flower desk.'], n);
    await J.say(['Behind this door is the service wing, and the stairs up to the archive. There are Lightkeepers on guard in the store rooms.', 'They don\'t move much, but if one of them looks your way, you\'re getting a polite walk back to the door. Stay out of their line of sight!'], n);
    await J.say(['Crates block their view. Duck behind them. I\'ll watch the hall and meet you at the top if things go wrong.', 'Things are going to go wrong. Things always go wrong. Go!'], n);
    await J.fade(() => { J.set('m5door'); J.refresh(); });
    await J.say('(Juno unlocked the staff door. Stay out of the guards\' sight: crates and shelves block their view.)');
  });
  on('m5lilies', {}, J => J.say('Forty buckets of lilies, with a Reyes Couriers tag on every one. Somebody has hidden a half-eaten sandwich between two of them.'));
  // the guards: a polite walk back to the door of the room
  on('m5caught', {}, async (J, n) => {
    const b = (n && n.back) || { map: 'sky2', x: 23, y: 4, dir: 'right' };
    await J.say(J.pick([['Oh! Excuse me - guests aren\'t allowed back here. I\'m so sorry. Let me walk you back.', 'No, no, it\'s no trouble at all.'],
      ['Ah. Hello. You seem to be lost! It happens all the time. Let me take you back. Mind the step.'],
      ['Terribly sorry, this area is staff only. I\'ll see you back to the door. Please don\'t apologise. I insist on doing the apologising.']]), n);
    await J.warp(b.map, b.x, b.y, b.dir);
  });
  on('m5guest1', {}, (J, n) => J.say(J.flag('lanternsecret') ? 'Is something wrong, dear? You look like you\'ve seen a ghost. Have a canapé. Canapés fix everything.' : ['I used to be afraid of the dark. Then Cassius gave me a lantern, and now I\'m not afraid of anything.', 'I can\'t even remember what I was afraid of. Isn\'t that marvellous?'], n));
  on('m5guest2', {}, (J, n) => J.say(['I came to the very first Lumen Gala. Twenty years ago, in a warehouse by the canal.', 'Cassius gave a speech that night too. It was about his daughter. He doesn\'t talk about her anymore.'], n));
  on('m5guest3', {}, (J, n) => J.say('They say the Great Lantern will shine all the way down to the sea. I asked what happens to the dark. A Lightkeeper said, "There won\'t be any." Then he apologised.', n));
  on('m5guest4', {}, (J, n) => J.say(J.flag('m5speech') ? 'What a speech. Nothing will ever be lost again! I already lost my coat check ticket. Is that covered?' : 'Shh, shh - Mr. Vale is about to speak! Go up front, you\'ll want to see this.', n));
  on('m5waiter', {}, (J, n) => J.say(J.pick(['Canapé? It\'s Mossgrove mushroom on Ochre flatbread. Mr. Vale insists on food from every town.', 'Champagne? Oh - sparkling apple, for you. House rules.']), n));

  // ---- the archive
  on('m5shelf', {}, J => J.say(J.pick(['Box files, labelled by town and year: "TIDEMARK - HOUSEHOLD YIELD". "BRASSPORT - YIELD (CANALS)". "MOSSGROVE - YIELD (PILOT)".', 'Folders of lantern blueprints. Each one has a little valve inside, marked "TO MAIN LINE".', 'A drawer of name cards: "Lightkeeper of the Month". Every month, the same smiling face. Nobody remembers who it is.'])));
  on('m5pcArchive', {}, J => J.say('The archive terminal. A search box blinks: "ENTER PROJECT NAME." You type GREAT LANTERN. "ACCESS: DIRECTOR VALE ONLY. Printed copy: ledger, west office."'));
  on('m5ledger', { sets: ['lanternsecret'] }, async J => {
    if (J.flag('lanternsecret')) return J.say('The great Lumen ledger. You\'ve read enough of it. Your hands are still cold.');
    await J.say(['A huge brass-bound ledger on a reading machine. The title page: "PROJECT GREAT LANTERN - DAYS COLLECTED".', 'Column after column. Brassport: 41,206 days. Tidemark: 3,890 days. Mossgrove (pilot): 2,117 days...']);
    await J.say(['A note in neat handwriting: "Household lanterns draw grief first. Residents consent readily: nobody misses a bad day.', 'Joy follows in time. Collected days are carried along the main line to the Frostcrown site to fuel the Great Lantern."']);
    await J.say(['"Required to open the Veil: 1,000,000 days. Current: 812,447."', 'The Lost Days. Every forgotten festival, every vanished morning. They didn\'t just disappear. They were TAKEN. To fuel this.']);
    await J.say(['At the bottom of the last page, a short list headed "PRIORITY DRAW - unusually bright subjects".', 'The third name on it: "R., TEO (TIDEMARK). Note: subject thinning. Continue."']);
    await J.give('m5ledger');
    J.set('lanternsecret');
    await J.say(['(You tear out the page and write it in the notebook: the lanterns drain memories. The Lost Days fuel the Great Lantern. Teo is on the list.)', 'Cassius\'s study is across the archive, in the east. If there\'s more, it\'s in there.']);
  });
  on('m5studyShelf', {}, J => J.say('Children\'s books, very old, very loved. "The Lantern-folk and the Grey Door". "Litwick Learns to Glow". A name is written inside every cover, then scratched out.'));
  on('m5photo', { needs: ['lanternsecret'], sets: ['photo', 'm5alarm'] }, async J => {
    if (J.flag('photo')) return J.say('Cassius\'s desk. The drawer you opened is still hanging open. The alarm is still ringing.');
    if (!J.flag('lanternsecret')) return J.say('Cassius Vale\'s desk. Very tidy. A single photo frame lies face down on it. Better find what you came for first - the ledger is in the west office.');
    await J.say(['Cassius Vale\'s desk. Very tidy. A single photo frame lies face down. You turn it over.', 'Two young people in soot-streaked lab coats, standing in the snow in front of a wrecked train. Line 7. The ghost train.']);
    await J.say(['The young man is Cassius. He\'s holding a little girl\'s scarf in both hands.', 'The young woman beside him, staring at the camera like she wants to apologise to it, is... Professor Okafor.']);
    await J.say('On the back, in two different hands: "Line 7, the night of the crash. A. & C." And under it, in Okafor\'s writing, pressed hard: "We did this."');
    await J.give('m5photo');
    J.set('photo');
    await J.say('You slide the frame into your bag - and something in the drawer goes CLICK.');
    await J.say(['WHOOP. WHOOP. WHOOP.', '"Security alert, archive floor. Please remain calm. Please remain where you are. Thank you so much."']);
    await J.say(['{NAME}! Can you hear me? It\'s me! I\'m on the ROOF!', 'The alarm unlocked the fire doors - the roof stairs in the middle of the archive! Get up here! I\'ve got a way out!'], { name: 'Juno (from the stairwell)', look: 'juno' });
    J.set('m5alarm'); J.refresh();
    await J.say('(You write it in the notebook: Cassius and Okafor, at the wreck of the ghost train. "We did this.")');
  });
  on('m5roofLocked', { needs: ['!m5alarm'] }, async J => {
    await J.say('A heavy fire door: "ROOF ACCESS - OPENS AUTOMATICALLY IN AN EMERGENCY". It doesn\'t budge.');
    await J.playerWalk('down', 1);
  });

  // ---- the roof: Director Hask, and the zip-line
  on('m5beacon', {}, J => J.say('The tower\'s beacon: a Lumen lantern the size of a carriage. A thick cable runs out of its base, down the side of the tower, and away north - towards Frostcrown.'));
  on('m5zipline', {}, J => J.say(J.flag('m5hask') ? 'A courier\'s zip-line, clipped to the rail. The line runs out into the dark, down over the canals.' : 'A courier\'s zip-line hook, clamped to the north rail. Juno\'s handiwork. The Lumen agents are between you and it.'));
  on('m5haskScene', { needs: ['photo', '!m5hask'], sets: ['m5hask'] }, async J => {
    if (J.flag('m5hask')) return;
    if (!J.flag('photo')) return;
    await J.say(['The wind up here is cold and enormous. All of Brassport glitters below, a thousand Lumen lamps.', 'And between you and the north rail stands a white-haired man in a long coat.']);
    await J.say(['Ah. There you are. I did say I have an excellent memory for faces.', 'Director Hask. Head of security. I\'m terribly sorry about the alarm. It must have been frightening.'], 'hask');
    await J.say(['I\'ll need the ledger page back. And the photograph. Mr. Vale is very attached to that photograph.', 'Please don\'t make this difficult. I so dislike difficulty. I find it... forgettable.'], 'hask');
    await J.say('Over his shoulder, on the rail, Juno is clipping a harness to a cable and mouthing "HURRY UP".');
    if (await J.battle({ id: 'm5hask', name: 'Director Hask', look: 'hask', team: [['magneton', 32], ['doublade', 33], ['houndoom', 33], ['lampent', 34]], pay: 80, theme: 'city', before: 'Let\'s keep this orderly.', lose: '...How very untidy.' }, 'hask') !== 'win') return;
    await J.say(['...How very untidy.', 'Keep your photograph, then. It won\'t matter. In a few weeks the Great Lantern will be lit, and you will be very happy, and you won\'t remember why you climbed a tower.'], 'hask');
    await J.say(['You think Mr. Vale is a villain. He is the kindest man I have ever met.', 'He simply does not lose things. Not anymore. Good night.'], 'hask');
    await J.fade(() => { J.set('m5hask'); J.hideNpc('hask'); });
    await J.say('{NAME}! Over here! Now, now, NOW!', 'juno');
  });
  on('m5escape', { needs: ['m5hask'], sets: ['ch6'] }, async (J, n) => {
    if (!J.flag('m5hask')) return J.say(['The zip-line\'s ready! But the Director is right there - you have to get past him first!', 'Go! I\'ll hold the line!'], n);
    await J.say(['You did it! You beat the creepy polite man! Okay, harness. Arms through here. Don\'t look down.', '...You found something. I can tell. Your face is doing the thing.'], n);
    await J.say('You show her the ledger page. You watch her read the last line. "R., TEO (TIDEMARK). Subject thinning. Continue."');
    await J.say(['...', 'They\'re eating him. My brother. A day at a time. To light up a mountain.', 'And that photo... the Professor? OUR Professor? She was THERE?'], n);
    await J.say(['Okay. Okay. Later. First we fly. Reyes Couriers: anything, anywhere, by morning.', 'Three... two... ONE!'], n);
    await J.fade(async () => { await J.wait(600); });
    await J.say(['You fly out over Brassport on a singing wire, the tower shrinking behind you, the canals full of lamplight below.', 'You land hard on a warehouse roof in the south of the city, and roll, and lie there laughing, because you\'re alive.']);
    await J.say(['Okafor has a research institute in Saltmere, down the Sunken Road south of Brassport. She went back there after Lantern Night.', 'I need to get home to Teo. You go to Saltmere. Make her tell you everything.', 'And {NAME}... "we did this"? I want to know what they did. And who they did it to.'], { name: 'Juno', look: 'juno' });
    await J.chapter('Chapter 5 complete!', 'Next: Chapter 6 - What the Professor Buried');
    J.set('ch6'); J.refresh();
    // land in the south of Brassport, near the road to the Sunken Road (Chapter 2's map), or where Chapter 6 starts
    const c6 = MStory.CHAPTERS[6] && MStory.CHAPTERS[6].start;
    const land = freeNear('brassport_s', 31, 26);
    if (land) await J.travel('brassport_s', land.x, land.y, 'down');
    else if (c6 && M[c6.map]) await J.travel(c6.map, c6.x, c6.y, c6.dir || 'down');
    await J.chapter('Chapter 6', 'What the Professor Buried');
  });

  chapter({ n: 5, title: 'The Gala', start: { map: 'brassport_n', x: 18, y: 11, dir: 'up' }, level: 30, badge: null,
    goals: ['m5plan', 'disguise', 'm5speech', 'm5door', 'lanternsecret', 'photo', 'm5alarm', 'm5hask', 'ch6'] });
})();
