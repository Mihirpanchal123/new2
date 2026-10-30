'use strict';
// =====================================================================
//  JOURNEY II - Chapter 7: The Drowned Archive. On the Lamplighter's
//  Lapras you cross the Sea Lanes to the Archway Isles, where Warden
//  Corin keeps the Veil Light. Under the lagoon lies the Lantern-folk's
//  library; the Lumen Company got there first. Its lowest floor can only
//  be reached through the Echo, where the Archive still stands dry - and
//  where Nell is waiting. The plan, revealed: the Great Lantern will
//  pour the Echo over Meridia. And under Frostcrown sleeps the Warden of
//  the Veil. Side story: The Last Mail Route (flags m7mail.*).
//  Plan: docs/journey2/world.md. Story: docs/journey2/story.md.
// =====================================================================
(() => {
  const { def, grid, L, center, mart, M, echoTwin } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m7medium: { hat: null, hair: 0x2a2a3a, hairStyle: 'long', top: 0x5a3a7a, sleeves: 'long', inner: 0xd8c8e8, legs: 0x3a2a4a, legStyle: 'skirt', shoes: 0x1a1a24, bag: null, scarf: 0xb8a8d8 },
    m7odile: { hat: 'cap', hatColor: 0x3a5aa8, hatFront: 0xf0d048, hair: 0x9a9aa4, hairStyle: 'short', top: 0x3a5aa8, sleeves: 'long', inner: 0xf0d048, legs: 0x2a3a5a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: 0x8a5a30 }
  });

  // ---- items
  Object.assign(ITEMS, {
    m7veillamp: { name: 'Veil Lamp', pocket: 'key', price: 0, desc: 'Warden Corin\'s little violet lamp. Its light reaches into the Drowned Archive, and the Echo Shrines down there answer to it.' },
    m7letterA: { name: 'Echo Letter (Marguerite)', pocket: 'key', price: 0, desc: 'A letter found in the Echo. "To Marguerite, the blue house, Gullwing Isle." Dated a day nobody remembers.' },
    m7letterB: { name: 'Echo Letter (Ysolde)', pocket: 'key', price: 0, desc: 'A birthday card found in the Echo. "To Captain Ysolde, wherever the Sea Lanes have her." Signed by a whole crew.' },
    m7letterC: { name: 'Echo Letter (Pa)', pocket: 'key', price: 0, desc: 'A letter found in the Echo. "To Pa - Old Hal, Archway pier." The handwriting is young and very careful.' }
  });
  ITEMS['tm:shadow-ball'] = ITEMS['tm:shadow-ball'] || { name: 'TM Shadow Ball', pocket: 'tms', price: 0, tm: 'shadow-ball', desc: 'Teaches Shadow Ball: a blob of shadow that may lower the target\'s Sp. Def.' };
  ITEMS['tm:scald'] = ITEMS['tm:scald'] || { name: 'TM Scald', pocket: 'tms', price: 0, tm: 'scald', desc: 'Teaches Scald: boiling water that may leave a burn.' };
  ITEMS['tm:hex'] = ITEMS['tm:hex'] || { name: 'TM Hex', pocket: 'tms', price: 0, tm: 'hex', desc: 'Teaches Hex: a curse that hits twice as hard if the target has a status problem.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    'badge.veil': 'Warden Corin gave me the Veil Lamp and opened the Drowned Archive. The Lumen Company\'s boats moored there two nights ago.',
    m7archive: 'The Drowned Archive: the Lantern-folk\'s library, half under the sea. Lumen footprints in the silt. They came for something.',
    m7nell: 'Nell was in the Archive\'s Echo. She remembers being read to there, holding someone\'s hand. "He did all the voices."',
    m7morrow: 'Agent Morrow was emptying the Archive for the Company. His papers: deliveries of LOST DAYS, by the thousand, shipped north to FROSTCROWN.',
    archivelore: 'THE PLAN: the Great Lantern, fed with stolen days, will pour the Echo over all Meridia. Nothing ever lost again - and nothing ever changing again. Every day the same day, forever.',
    wardenlore: 'THE WARDEN OF THE VEIL: a colossal Golurk the Lantern-folk built to stand between the world and the Echo. It sleeps beneath Frostcrown. If the Veil tears, it wakes - and it will not know friend from foe.',
    ch8: 'Okafor\'s message: Teo is worse. Juno has taken him north to the mountain doctors at HIGHWATCH. North of Brassport, across the Coldfields.',
    'm7mail.start': 'Postmistress Odile of Archway: letters written on Lost Days vanish with the day. If I find any in the Echo, she wants them delivered.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // Sea Lane 1
    m7dara: { team: [['horsea', 34], ['seadra', 35]], pay: 20, theme: 'beach', before: 'You came out here on a LAPRAS? Okay, that\'s the coolest thing I\'ve ever seen. Battle me anyway!', lose: 'Out-swum and out-classed!', after: 'Gullwing Isle\'s straight north of here. Lovely beach. Terrible Wingull. They steal sandwiches.' },
    m7brann: { team: [['binacle', 34], ['sealeo', 35], ['sharpedo', 35]], pay: 24, theme: 'beach', before: 'Bell Rock\'s my island! Pay the toll! The toll is a battle!', lose: 'Toll waived...', after: 'Saw a Lumen boat heading east two nights back. Riding low in the water. Heavy with something.' },
    m7kofi: { team: [['wingull', 34], ['pelipper', 35]], pay: 20, theme: 'beach', before: 'I\'ve been floating on this raft since breakfast. A battle\'s the most exciting thing that\'ll happen all day!', lose: 'Still more exciting than breakfast.', after: 'If you see my sandals, they\'re blue. One of them anyway.' },
    m7lou: { team: [['magikarp', 30], ['magikarp', 30], ['gyarados', 35]], pay: 22, theme: 'beach', before: 'Three Magikarp, I said. Three. I counted them this morning.', lose: '...Well, one of them had a growth spurt.', after: 'Patience is the whole of fishing. Also of Magikarp.' },
    m7inez: { team: [['staryu', 35], ['starmie', 36]], pay: 20, theme: 'beach', before: 'Star light, star bright, first star I battle tonight!', lose: 'Wishing on the wrong star...', after: 'At night out here you can see the Veil Light flashing violet. My gran says it\'s talking to someone.' },
    m7hux: { team: [['tentacruel', 35], ['sealeo', 36]], pay: 24, theme: 'beach', before: 'Avast! Ha, I always wanted to say that. Battle!', lose: 'Avast-ly outmatched!', after: 'The Sea Lanes go on east to Archway. Watch the reef walls - they look like rock, and they are rock.' },
    // Sea Lane 2
    m7mira: { team: [['tentacruel', 36], ['skrelp', 35]], pay: 20, theme: 'beach', before: 'Don\'t touch the jellyfish. Don\'t touch the seaweed. Do battle me!', lose: 'Stung by my own advice.', after: 'There\'s a captain on a raft further south who never comes ashore. Captain Ysolde. She says the sea is her house.' },
    m7orrin: { team: [['golduck', 36], ['quagsire', 36], ['slowbro', 37]], pay: 24, theme: 'beach', before: 'This sandbar is the only dry land for a mile. I\'ll defend it to the last grain!', lose: 'Washed out with the tide...', after: 'The water around Archway gets very dark past the arch. Something big is under there. Something with a roof.' },
    m7pike: { team: [['carvanha', 35], ['sharpedo', 37]], pay: 22, theme: 'beach', before: 'My fish bite. Fair warning!', lose: 'Bitten back!', after: 'Archway\'s just south. The Warden there talks to ghosts. Nice fellow, though.' },
    m7tavi: { team: [['seadra', 36], ['spheal', 35], ['walrein', 38]], pay: 22, theme: 'beach', before: 'Last raft before Archway! I\'m the gatekeeper! Self-appointed!', lose: 'Gate... open...', after: 'Go on, then. Archway\'s through that gap in the reef.' },
    // Gullwing Isle
    m7gull: { team: [['pelipper', 36], ['swablu', 35], ['altaria', 37]], pay: 24, theme: 'beach', before: 'Every bird on Gullwing knows my name! None of them listen to it! Battle!', lose: 'Ruffled...', after: 'The Wingull here steal shiny things. Check the beach - they drop half of it.' },
    // the Archive
    m7lk1: { team: [['golbat', 36], ['lampent', 37]], pay: 32, theme: 'icecave', look: 'keeper', name: 'Lightkeeper', before: 'Oh no. Oh, I\'m terribly sorry, the Archive is closed for Company business. Please go home?', lose: 'I did say please...', after: 'We were told to box up anything with "Lantern" written on it. Everything down here has Lantern written on it.' },
    m7lk2: { team: [['magneton', 37], ['doublade', 37]], pay: 32, theme: 'icecave', look: 'keeperf', name: 'Lightkeeper', before: 'The water\'s freezing, the books are soggy, and now a child wants to battle me. What a week.', lose: 'What a week.', after: 'Agent Morrow went down to the reading room. Through the rubble. I don\'t know how. Nobody else can get past it.' },
    m7lk3: { team: [['houndoom', 37], ['murkrow', 36], ['croagunk', 37]], pay: 32, theme: 'icecave', look: 'keeper', name: 'Lightkeeper', before: 'Excuse me! This floor is - is - well, it\'s blocked, mostly, but it\'s CLOSED as well!', lose: 'Apologies for the inconvenience.', after: 'Morrow has a trick for the rubble. He goes to the old stone lantern and just... isn\'t there any more.' },
    m7guard: { team: [['honchkrow', 36], ['golbat', 36]], pay: 32, theme: 'beach', look: 'agent', name: 'Lumen Agent', before: 'The Archive is Lumen property now. Or it will be, once the paperwork is soggy enough. Leave.', lose: 'This will be in my report. Spelled correctly.', after: 'You can\'t get in anyway. Only the Warden can open it.' },
    // the Veil Light: Warden Corin's gym
    m7g1: { team: [['shuppet', 36], ['duskull', 36], ['misdreavus', 37]], pay: 24, theme: 'stadium', before: 'Shh. The floor is listening. Step where the dark is thinnest.', lose: 'The dark keeps its secrets... except that one.', after: 'Corin\'s Ghosts can\'t be touched by Normal moves. Dark and Ghost moves hurt them most.' },
    m7g2: { team: [['haunter', 37], ['sableye', 37]], pay: 24, theme: 'stadium', before: 'Boo. ...No? Nobody ever jumps any more.', lose: 'I jumped. Just a little.', after: 'Corin lost a day too. His father\'s funeral. He says he doesn\'t remember saying goodbye.' },
    m7g3: { team: [['lampent', 37], ['golett', 38]], pay: 24, theme: 'stadium', before: 'A little light in the dark is all a Ghost wants. Mine wants yours.', lose: 'Snuffed!', after: 'That Golett of mine? Corin says its great-great-grandfather was a giant. I think he\'s teasing.' },
    m7g4: { team: [['doublade', 38], ['froslass', 38]], pay: 24, theme: 'stadium', before: 'The Warden\'s just beyond me. The last of the dark is the coldest part.', lose: 'Thawed.', after: 'Go on. He\'s been expecting you since the moment your Lapras touched the bay.' },
    corin: { team: [['banette', 38], ['dusclops', 39], ['mismagius', 40], ['spiritomb', 40], ['gengar', 41]], pay: 100, theme: 'stadium', gym: 6, onWin: 'm7corinWin', look: 'corin', name: 'Warden Corin',
      before: 'The dead don\'t haunt us. We haunt them - with everything we never said. Show me what you carry.', lose: 'Ah. You carry it lightly. That is the hardest trick of all.' }
  });

  // =====================================================================
  //  Sea Lane 1 - east from Saltmere: islands, rafts, reefs
  // =====================================================================
  {
    const B = grid(40, 24, '~').border('r', { w: [10, 16], e: [3, 7], n: [18, 20] });
    B.fill(5, 2, 10, 6, ':').fill(6, 3, 9, 5, ';');                         // Bell Rock
    B.fill(14, 11, 16, 11, 'b');                                             // a raft
    B.fill(21, 1, 21, 9, 'r').fill(12, 15, 12, 22, 'r');                     // reef walls
    B.fill(17, 15, 26, 21, ':').fill(19, 16, 24, 20, ';').put(17, 21, 'T').put(26, 15, 'T');   // Long Key
    B.fill(29, 4, 31, 4, 'b').fill(30, 9, 34, 12, ':').put(34, 9, 'T').fill(33, 16, 35, 16, 'b');
    for (const [x, y] of [[27, 12], [36, 9], [4, 19], [25, 6], [36, 19], [16, 4], [30, 20]]) B.put(x, y, 'r');
    def({ id: 'sealane1', name: 'Sea Lane 1', kind: 'route', rows: B.rows(), music: 'route', battle: 'beach',
      encounters: { tall: { rate: 0.12, min: 32, max: 35, table: [['wingull', 24], ['pelipper', 14], ['swablu', 14], ['slowpoke', 14], ['rookidee', 10], ['nacli', 10], ['drampa', 4]] },
        water: { rate: 0.08, min: 32, max: 36, table: [['tentacool', 22], ['wingull', 16], ['horsea', 12], ['magikarp', 10], ['staryu', 8], ['carvanha', 8], ['spheal', 8], ['tentacruel', 6], ['pelipper', 6], ['skrelp', 3], ['lapras', 1]] } },
      edges: { w: { to: 'saltmere', dy: 0 }, e: { to: 'sealane2', dy: 0 }, n: { to: 'gullwing', dx: -9 } },
      signs: [{ x: 10, y: 2, text: 'SEA LANE 1\nW: Saltmere - E: Archway Isles\nN: Gullwing Isle' }],
      items: [{ x: 5, y: 2, item: 'great', n: 3 }, { x: 24, y: 20, item: 'superpotion', n: 2 }, { x: 33, y: 12, item: 'ultra', n: 1, hidden: true }, { x: 18, y: 18, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'brann', x: 10, y: 4, dir: 'left', look: L.sailor, name: 'Sailor Brann', trainer: 'm7brann' },
        { id: 'dara', x: 15, y: 11, dir: 'down', look: L.swimmer, name: 'Swimmer Dara', trainer: 'm7dara' },
        { id: 'lou', x: 21, y: 15, dir: 'up', look: L.fisher, name: 'Fisherman Lou', trainer: 'm7lou' },
        { id: 'kofi', x: 30, y: 4, dir: 'down', look: L.swimmer, name: 'Swimmer Kofi', trainer: 'm7kofi' },
        { id: 'hux', x: 31, y: 10, dir: 'left', look: L.sailor, name: 'Sailor Hux', trainer: 'm7hux' },
        { id: 'inez', x: 34, y: 16, dir: 'left', look: L.swimmer, name: 'Swimmer Inez', trainer: 'm7inez' }] });
  }

  // =====================================================================
  //  Sea Lane 2 - south to Archway between long walls of reef
  // =====================================================================
  {
    const B = grid(30, 36, '~').border('r', { w: [3, 7], s: [12, 16] });
    B.fill(1, 11, 22, 11, 'r').fill(7, 20, 28, 20, 'r').fill(1, 28, 20, 28, 'r');
    B.fill(19, 5, 21, 5, 'b').fill(24, 14, 26, 15, 'b').fill(24, 31, 26, 31, 'b');
    B.fill(3, 14, 9, 18, ':').fill(4, 15, 8, 17, ';');                      // the sandbar
    B.fill(14, 23, 18, 26, ':').put(14, 23, 'T');                           // Gull Rock
    for (const [x, y] of [[8, 4], [12, 7], [26, 9], [16, 16], [3, 24], [10, 25], [24, 25], [6, 32]]) B.put(x, y, 'r');
    def({ id: 'sealane2', name: 'Sea Lane 2', kind: 'route', rows: B.rows(), music: 'route', battle: 'beach',
      encounters: { tall: { rate: 0.12, min: 33, max: 36, table: [['wingull', 24], ['pelipper', 16], ['slowpoke', 14], ['swablu', 14], ['nacli', 12], ['drampa', 4]] },
        water: { rate: 0.08, min: 33, max: 37, table: [['tentacool', 20], ['tentacruel', 10], ['wingull', 12], ['pelipper', 8], ['horsea', 10], ['seadra', 6], ['staryu', 8], ['carvanha', 8], ['sharpedo', 4], ['spheal', 6], ['skrelp', 5], ['lapras', 2], ['milotic', 1]] } },
      edges: { w: { to: 'sealane1', dy: 0 }, s: { to: 'archway', dx: 0 } },
      items: [{ x: 4, y: 14, item: 'ultra', n: 2 }, { x: 18, y: 26, item: 'fullheal', n: 2 }, { x: 9, y: 18, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'mira', x: 20, y: 5, dir: 'left', look: L.swimmer, name: 'Swimmer Mira', trainer: 'm7mira' },
        { id: 'orrin', x: 6, y: 14, dir: 'down', look: L.sailor, name: 'Sailor Orrin', trainer: 'm7orrin' },
        { id: 'ysolde', x: 25, y: 14, dir: 'down', look: L.sailor, name: 'Captain Ysolde', talk: 'm7ysolde' },
        { id: 'pike', x: 16, y: 23, dir: 'up', look: L.fisher, name: 'Fisherman Pike', trainer: 'm7pike' },
        { id: 'tavi', x: 25, y: 31, dir: 'up', look: L.swimmer, name: 'Swimmer Tavi', trainer: 'm7tavi' }] });
  }

  // =====================================================================
  //  Gullwing Isle - where Juno delivered her parcel on Lantern Night
  // =====================================================================
  {
    const B = grid(24, 20, '~').border('r', { s: [9, 11] });
    B.fill(3, 2, 20, 13, ':').fill(5, 3, 18, 11, '.').fill(14, 8, 18, 11, ';').fill(10, 14, 10, 16, 'b');
    B.fill(5, 9, 9, 10, '*').put(4, 9, 'T').put(19, 4, 'T').put(3, 12, 'T').put(20, 11, 'T').fill(9, 7, 13, 8, ',').fill(10, 9, 10, 13, ',');
    def({ id: 'gullwing', name: 'Gullwing Isle', kind: 'town', rows: B.rows(), music: 'town', battle: 'beach',
      encounters: { tall: { rate: 0.12, min: 33, max: 36, table: [['wingull', 30], ['pelipper', 16], ['swablu', 16], ['rookidee', 12], ['nacli', 12], ['altaria', 4], ['drampa', 4]] },
        water: { rate: 0.08, min: 32, max: 36, table: [['tentacool', 26], ['wingull', 20], ['staryu', 14], ['horsea', 14], ['magikarp', 14], ['lapras', 2]] } },
      buildings: [{ b: 'house', x: 5, y: 3, to: 'gwhouse1', variant: 1 }, { b: 'house2', x: 11, y: 3, to: 'gwhouse2' }],
      edges: { s: { to: 'sealane1', dx: 9 } },
      signs: [{ x: 12, y: 9, text: 'GULLWING ISLE\nPop. 31 (and about a thousand Wingull)' }],
      props: [{ k: 'mailbox', x: 4, y: 6 }, { k: 'mailbox', x: 16, y: 6 }],
      items: [{ x: 4, y: 11, item: 'ultra', n: 1 }, { x: 19, y: 12, item: 'rarecandy', n: 1, hidden: true }, { x: 17, y: 9, item: 'superpotion', n: 1, hidden: true }],
      npcs: [{ id: 'tomas', x: 8, y: 8, dir: 'down', look: L.oldman, name: 'Old Tomas', talk: 'm7tomas' },
        { id: 'gull', x: 16, y: 7, dir: 'down', look: L.camper, name: 'Bird Keeper Wes', trainer: 'm7gull' },
        { id: 'kid', x: 7, y: 12, dir: 'right', look: L.kid, name: 'Sandy', wander: 2, talk: 'm7gwKid' }] });
  }
  def({ id: 'gwhouse1', name: 'The blue house', kind: 'inside', outside: 'gullwing', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm7margShelf' }, { k: 'stove', x: 4, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 1, y: 4 }, { k: 'chair', x: 1, y: 5 }],
    npcs: [{ id: 'marg', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Marguerite', talk: 'm7marguerite' }] });
  def({ id: 'gwhouse2', name: 'Abernathy\'s house', kind: 'inside', outside: 'gullwing', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'boxes', x: 1, y: 1 }, { k: 'boxes', x: 2, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'shelf', x: 6, y: 1, talk: 'm7aberShelf' }, { k: 'table', x: 3, y: 3 }],
    npcs: [{ id: 'aber', x: 6, y: 4, dir: 'left', look: L.man, name: 'Mr. Abernathy', talk: 'm7abernathy' }] });

  // =====================================================================
  //  Archway - an island town under a natural stone arch. The Veil Light
  //  (Warden Corin); in the lagoon, the dome of the Drowned Archive
  // =====================================================================
  {
    const B = grid(32, 28, '.').border('T', { n: [12, 16] });
    B.fill(1, 0, 11, 0, 'r').fill(17, 0, 30, 0, 'r');
    B.fill(1, 1, 30, 6, '~').fill(12, 0, 16, 0, '~');                       // the bay
    B.fill(10, 1, 11, 4, 'r').fill(17, 1, 18, 4, 'r');                      // the legs of the Arch
    B.fill(1, 7, 30, 8, ':').fill(14, 3, 14, 6, 'b');                       // the beach and the old pier
    B.fill(19, 11, 30, 26, '~').fill(21, 14, 29, 21, ':');                  // the lagoon, and the Archive's island
    B.fill(22, 9, 30, 10, ';').fill(1, 24, 3, 25, ';');
    B.fill(16, 9, 17, 14, 'u').fill(1, 15, 18, 16, 'u').fill(1, 22, 12, 23, ',').fill(1, 22, 1, 26, ',').fill(18, 15, 18, 26, ',').fill(1, 26, 18, 26, ',');
    B.fill(8, 9, 13, 10, '*').fill(13, 17, 17, 18, '*');
    def({ id: 'archway', name: 'Archway', kind: 'town', rows: B.rows(), music: 'town', battle: 'beach', fly: { x: 16, y: 12 }, center: { map: 'center_archway' },
      dock: { x: 18, y: 7, dir: 'down' },
      encounters: { tall: { rate: 0.12, min: 34, max: 37, table: [['wingull', 20], ['pelipper', 16], ['swablu', 14], ['misdreavus', 12], ['shuppet', 12], ['nacli', 12], ['altaria', 8], ['drampa', 6]] },
        water: { rate: 0.08, min: 34, max: 38, table: [['tentacool', 18], ['tentacruel', 12], ['horsea', 10], ['seadra', 8], ['staryu', 8], ['starmie', 4], ['wimpod', 10], ['skrelp', 8], ['sharpedo', 6], ['spheal', 8], ['lapras', 3], ['milotic', 1]] } },
      buildings: [{ b: 'center', x: 2, y: 10, to: 'center_archway' }, { b: 'mart', x: 9, y: 11, to: 'mart_archway' },
        { b: 'house2', x: 2, y: 18, to: 'archpost' }, { b: 'house', x: 8, y: 18, to: 'archhouse', variant: 5 },
        { b: 'lighthouse', x: 13, y: 19, to: 'veilgym', variant: 5 },
        { b: 'museum', x: 21, y: 15, to: 'archive1', needs: ['badge.veil'], locked: 'm7archLocked' }],
      edges: { n: { to: 'sealane2', dx: 0 } },
      signs: [{ x: 14, y: 10, text: 'ARCHWAY\nThe gate to the Drowned Isles.' }, { x: 18, y: 14, text: 'VEIL LIGHT\nWarden: CORIN\nThe sixth of the Eight Lights of Meridia.' },
        { x: 29, y: 20, text: 'THE DROWNED ARCHIVE\nLibrary of the Lantern-folk.\nClosed by order of the Warden of the Veil Light.' }, { x: 7, y: 21, text: 'ARCHWAY POST\n"Every letter finds its door."' }],
      props: [{ k: 'lamp', x: 15, y: 9 }, { k: 'lamp', x: 18, y: 9 }, { k: 'lamp', x: 15, y: 14 }, { k: 'mailbox', x: 7, y: 20 }, { k: 'lumenlamp', x: 13, y: 7 }],
      items: [{ x: 3, y: 24, item: 'ultra', n: 2 }, { x: 29, y: 21, item: 'rarecandy', n: 1, hidden: true }, { x: 30, y: 9, item: 'revive', n: 1, hidden: true }, { x: 1, y: 7, item: 'superpotion', n: 2 }],
      npcs: [{ id: 'ferry', x: 19, y: 8, dir: 'left', look: L.sailor, name: 'Boatman Ned', talk: 'm7ferry' },
        { id: 'hal', x: 13, y: 8, dir: 'up', look: L.fisher, name: 'Old Hal', talk: 'm7hal' },
        { id: 'guide', x: 18, y: 24, dir: 'left', look: L.man, name: 'Gym Guide', talk: 'm7gymGuide' },
        { id: 'guard', x: 22, y: 20, dir: 'left', look: L.agent, name: 'Lumen Agent', trainer: 'm7guard', show: ['!badge.veil'] },
        { id: 'corin2', x: 27, y: 20, dir: 'left', look: L.corin, name: 'Warden Corin', talk: 'm7corinEnd', show: ['wardenlore', '!ch8'] },
        { id: 'kid', x: 6, y: 9, dir: 'down', look: L.kid, name: 'Pim', wander: 2, talk: 'm7archKid' },
        { id: 'lady', x: 10, y: 16, dir: 'down', look: L.woman, wander: 1, talk: 'm7archLady' }] });
  }
  center('center_archway', 'archway', { chapter: 7 });
  mart('mart_archway', 'archway', ['poke', 'great', 'ultra', 'potion', 'superpotion', 'fullheal', 'revive', 'repel', 'awakening', 'iceheal', 'burnheal', 'parlyzheal'], { chapter: 7 });
  M.mart_archway.name = 'Archway Mart';
  def({ id: 'archpost', name: 'Archway Post', kind: 'inside', outside: 'archway', rows: grid(11, 8, '+').border('#').fill(1, 7, 9, 7, '+').put(5, 7, 'm').rows(), arrive: { x: 5, y: 6 },
    furniture: [{ k: 'counter', x: 1, y: 3 }, { k: 'shelf', x: 6, y: 1, talk: 'm7pigeonholes' }, { k: 'boxes', x: 8, y: 1 }, { k: 'boxes', x: 9, y: 1 }, { k: 'boxes', x: 9, y: 2 }, { k: 'plant', x: 9, y: 6 }],
    npcs: [{ id: 'odile', x: 2, y: 2, dir: 'down', look: L.m7odile, name: 'Postmistress Odile', talk: 'm7odile', counter: true }] });
  def({ id: 'archhouse', name: 'House', kind: 'inside', outside: 'archway', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'mum', x: 6, y: 3, dir: 'left', look: L.woman, name: 'Netta', talk: 'm7netta' }, { id: 'boy', x: 1, y: 5, dir: 'right', look: L.youngster, name: 'Jory', talk: 'm7jory' }] });

  // ---- the Veil Light: Warden Corin's gym, a hall of dark with narrow bridges
  def({ id: 'veilgym', name: 'Veil Light', kind: 'inside', gym: true, outside: 'archway', battle: 'stadium', music: 'gym', dark: 0.3, arrive: { x: 7, y: 14 },
    rows: ['###############',
      '#ggggggggggggg#',
      '#gkkkkgggkkkkg#',
      '#gkkkkgggkkkkg#',
      '#ggggggggggggg#',
      '#kkkgkkkkkgkkk#',
      '#kkkgkkkkkgkkk#',
      '#ggggggggggggg#',
      '#gkkkkkgkkkkkg#',
      '#gkkkkkgkkkkkg#',
      '#ggggggggggggg#',
      '#kkkkgkkkgkkkk#',
      '#kkkkgkkkgkkkk#',
      '#ggggggggggggg#',
      '#ggggggggggggg#',
      '#######m#######'],
    furniture: [{ k: 'statue', x: 5, y: 14, talk: 'm7gymStatue' }, { k: 'statue', x: 9, y: 14, talk: 'm7gymStatue' }, { k: 'machine', x: 6, y: 1, talk: 'm7veillamp' }],
    npcs: [{ id: 'g1', x: 11, y: 13, dir: 'left', look: L.m7medium, name: 'Medium Vesna', trainer: 'm7g1' },
      { id: 'g2', x: 3, y: 10, dir: 'right', look: L.m7medium, name: 'Mystic Orla', trainer: 'm7g2' },
      { id: 'g3', x: 11, y: 7, dir: 'left', look: L.worker, name: 'Lamplighter Teague', trainer: 'm7g3' },
      { id: 'g4', x: 3, y: 4, dir: 'right', look: L.m7medium, name: 'Medium Sorrel', trainer: 'm7g4' },
      { id: 'corin', x: 7, y: 2, dir: 'down', look: L.corin, name: 'Warden Corin', trainer: 'corin' }] });

  // =====================================================================
  //  The Drowned Archive - the Lantern-folk's library under the lagoon
  // =====================================================================
  const archiveCave = { rate: 0.1, min: 35, max: 38, table: [['gastly', 16], ['haunter', 10], ['duskull', 14], ['shuppet', 14], ['misdreavus', 10], ['litwick', 10], ['golett', 10], ['sableye', 6], ['chingling', 6], ['espurr', 4]] };
  const archiveWater = { rate: 0.08, min: 34, max: 38, table: [['tentacool', 24], ['skrelp', 20], ['wimpod', 18], ['slowpoke', 16], ['binacle', 12], ['tentacruel', 6], ['dragalge', 4]] };
  // ---- the top floor: a flooded reading hall
  {
    const B = grid(24, 20, 'c').border('#').put(12, 19, 'm').put(2, 1, '>');
    B.fill(2, 7, 21, 12, '~').fill(6, 9, 8, 10, 'c').fill(16, 9, 17, 10, 'c');
    B.fill(1, 13, 1, 18, '_').fill(22, 13, 22, 18, '_');
    def({ id: 'archive1', name: 'Drowned Archive', kind: 'cave', outside: 'archway', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.3, arrive: { x: 12, y: 18 },
      encounters: { cave: archiveCave, water: archiveWater },
      furniture: [{ k: 'shelf', x: 2, y: 14, talk: 'm7books' }, { k: 'shelf', x: 5, y: 14, talk: 'm7books' }, { k: 'shelf', x: 16, y: 14, talk: 'm7books' }, { k: 'shelf', x: 19, y: 14, talk: 'm7books' },
        { k: 'shelf', x: 2, y: 16, talk: 'm7books' }, { k: 'shelf', x: 5, y: 16, talk: 'm7books' }, { k: 'shelf', x: 16, y: 16, talk: 'm7books' }, { k: 'shelf', x: 19, y: 16, talk: 'm7books' },
        { k: 'shelf', x: 5, y: 2, talk: 'm7books' }, { k: 'shelf', x: 8, y: 2, talk: 'm7books' }, { k: 'shelf', x: 14, y: 2, talk: 'm7books' }, { k: 'shelf', x: 17, y: 2, talk: 'm7books' },
        { k: 'desk', x: 10, y: 4, talk: 'm7ledger' }, { k: 'statue', x: 21, y: 1, talk: 'm7lanternfolk' }, { k: 'boxes', x: 20, y: 4 }, { k: 'boxes', x: 21, y: 4 }],
      warps: [{ x: 2, y: 1, to: 'archive2', tx: 3, ty: 20, dir: 'right' }],
      zones: [{ x: 1, y: 17, w: 22, h: 1, event: 'm7archive' }],
      items: [{ x: 7, y: 9, item: 'revive', n: 1 }, { x: 17, y: 10, item: 'tm:hex', n: 1 }, { x: 21, y: 18, item: 'superpotion', n: 1 }, { x: 22, y: 1, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'lk1', x: 12, y: 5, dir: 'down', look: L.keeper, name: 'Lightkeeper', trainer: 'm7lk1' },
        { id: 'lk2', x: 9, y: 15, dir: 'right', look: L.keeperf, name: 'Lightkeeper', trainer: 'm7lk2' }] });
  }
  // ---- the stacks: a collapse cuts the floor in two. In the Echo the Archive still stands dry and whole.
  {
    const B = grid(26, 22, 'c').border('#').put(2, 20, '<').put(23, 1, '>');
    B.fill(1, 10, 24, 11, 'r').fill(14, 13, 22, 18, '~');
    const shelves = [[2, 13], [5, 13], [8, 13], [2, 16], [5, 16], [8, 16], [3, 3], [7, 3], [15, 3], [19, 3], [3, 6], [7, 6], [15, 6], [19, 6]];
    const furn = () => shelves.map(([x, y]) => ({ k: 'shelf', x, y, talk: 'm7books' }));
    def({ id: 'archive2', name: 'Drowned Archive - Stacks', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.35,
      encounters: { cave: archiveCave, water: archiveWater },
      furniture: [...furn(), { k: 'statue', x: 23, y: 19, talk: 'm7collapse' }],
      warps: [{ x: 2, y: 20, to: 'archive1', tx: 3, ty: 1, dir: 'right' }, { x: 23, y: 1, to: 'archive3', tx: 11, ty: 13, dir: 'up' }],
      items: [{ x: 24, y: 8, item: 'ultra', n: 2 }, { x: 21, y: 20, item: 'fullheal', n: 1 }, { x: 1, y: 9, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'lk3', x: 10, y: 19, dir: 'right', look: L.keeper, name: 'Lightkeeper', trainer: 'm7lk3' }] });
    echoTwin('archive2', 'echo_archive2', [{ x: 12, y: 15 }, { x: 12, y: 5 }], {
      name: 'Drowned Archive (Echo)', chapter: 7, dark: 0.2, music: 'forest',
      encounters: { cave: { rate: 0.1, min: 36, max: 39, table: [['haunter', 18], ['misdreavus', 16], ['dusclops', 12], ['banette', 12], ['lampent', 12], ['golett', 12], ['gimmighoul', 6], ['mimikyu', 6], ['dreepy', 6]] } },
      furniture: furn(),
      items: [{ x: 20, y: 16, item: 'm7letterA', n: 1 }, { x: 2, y: 8, item: 'm7letterB', n: 1 }, { x: 24, y: 19, item: 'm7letterC', n: 1 }, { x: 17, y: 14, item: 'tm:shadow-ball', n: 1 }],
      npcs: [{ id: 'nell', x: 12, y: 8, dir: 'down', look: L.nell, name: '???', talk: 'm7nell' }]
    }, T => {
      // the Echo remembers the Archive before the sea took it: no collapse, no flood - just one fallen bookcase
      T.fill(1, 10, 24, 11, 'c').fill(1, 10, 17, 10, '#').fill(14, 13, 22, 18, 'c');
    });
  }
  // ---- the reading room: the Lantern-folk's mural and the Warden of the Veil
  {
    const B = grid(22, 16, 'c').border('#').put(11, 14, '<').fill(1, 1, 3, 3, '~').fill(18, 1, 20, 3, '~').fill(8, 4, 13, 7, '_');
    def({ id: 'archive3', name: 'Drowned Archive - Reading Room', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.3,
      encounters: { cave: archiveCave, water: archiveWater },
      furniture: [{ k: 'machine', x: 6, y: 1, talk: 'm7mural' }, { k: 'machine', x: 8, y: 1, talk: 'm7mural' }, { k: 'machine', x: 12, y: 1, talk: 'm7mural' }, { k: 'machine', x: 14, y: 1, talk: 'm7mural' },
        { k: 'statue', x: 10, y: 1, talk: 'm7golurk' }, { k: 'statue', x: 11, y: 1, talk: 'm7golurk' }, { k: 'desk', x: 10, y: 5, talk: 'm7papers' },
        { k: 'shelf', x: 1, y: 6, talk: 'm7books' }, { k: 'shelf', x: 19, y: 6, talk: 'm7books' }, { k: 'shelf', x: 1, y: 9, talk: 'm7books' }, { k: 'shelf', x: 19, y: 9, talk: 'm7books' }],
      warps: [{ x: 11, y: 14, to: 'archive2', tx: 22, ty: 1, dir: 'left' }],
      zones: [{ x: 1, y: 11, w: 20, h: 1, event: 'm7morrow' }],
      items: [{ x: 20, y: 13, item: 'rarecandy', n: 1 }, { x: 2, y: 12, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'morrow', x: 11, y: 8, dir: 'up', look: L.agent, name: 'Agent Morrow', talk: 'm7morrow', show: ['!m7morrow'] },
        { id: 'lk', x: 8, y: 8, dir: 'up', look: L.keeperf, name: 'Lightkeeper', talk: 'm7morrow', show: ['!m7morrow'] }] });
  }

  // the way back home: a boat from Saltmere's pier once the Veil Light is yours
  if (M.saltmere) M.saltmere.npcs.push({ id: 'm7boat', x: 22, y: 12, dir: 'down', look: L.sailor, name: 'Boatman Ned', talk: 'm7ferrySalt', show: ['badge.veil'] });

  MMaps.SPOTS.corin = { map: 'archway', x: 15, y: 17, dir: 'down' };
  for (const id of ['sealane1', 'sealane2', 'gullwing', 'gwhouse1', 'gwhouse2', 'archway', 'center_archway', 'mart_archway', 'archpost', 'archhouse', 'veilgym', 'archive1', 'archive2', 'echo_archive2', 'archive3']) M[id].chapter = 7;

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- Archway
  on('m7ferry', { travel: [{ map: 'saltmere' }] }, async (J, n) => {
    if (!J.flag('badge.veil')) return J.say(['Name\'s Ned. I run the boat to Saltmere, when the Warden says the water\'s kind.', 'He hasn\'t said so this week. Something\'s stirring under the lagoon.'], n);
    if (await J.ask('Boat back to Saltmere?', ['All aboard', 'Not yet'], n) !== 0) return J.say('Suit yourself. The boat\'s not going anywhere. Neither am I.', n);
    await J.say('Hold on to something!', n);
    const d = M.saltmere.dock;
    await J.travel('saltmere', d.x, d.y, d.dir);
  });
  on('m7ferrySalt', { travel: [{ map: 'archway' }] }, async (J, n) => {
    if (await J.ask('Boat to Archway?', ['All aboard', 'Not yet'], n) !== 0) return J.say('I\'ll be here. Fishing, mostly.', n);
    await J.say('Hold on to something!', n);
    const d = M.archway.dock;
    await J.travel('archway', d.x, d.y, d.dir);
  });
  on('m7archLocked', {}, J => J.say(J.flag('m7corinMet') ? 'The great bronze doors of the Archive are sealed with a violet lamp-lock. Only the Warden of the Veil Light can open them.' : 'Huge bronze doors, green with age and half-sunk in sand. A violet lamp glows in the lock. They don\'t budge.'));
  on('m7gymGuide', {}, (J, n) => J.say(J.flag('badge.veil') ? 'The Veil Badge! You walked through Corin\'s dark and came out smiling. Most people come out quiet.' : ['Corin keeps Ghost types. Normal and Fighting moves pass right through them.', 'Dark and Ghost moves are your friends. And don\'t look down on the bridges. Or do. It\'s only dark.'], n));
  on('m7gymStatue', {}, J => J.say(J.flag('badge.veil') ? 'VEIL LIGHT - WARDEN: CORIN\nTrainers who have earned the Veil Badge: {NAME}' : 'VEIL LIGHT - WARDEN: CORIN\n"Every goodbye is a light left on."'));
  on('m7veillamp', {}, J => J.say('The great lamp of the Veil Light. Its crystal burns violet, and looking into it, you could swear something on the other side looks back.'));
  on('m7corinWin', { sets: ['badge.veil', 'm7lamp', 'm7corinMet', 'echo'] }, async J => {
    await J.say(['So. You carry your ghosts lightly. Good. Here: the Veil Badge.'], 'corin');
    J.badge('veil');
    await J.give('tm:shadow-ball');
    await J.say(['I know why you\'re here. The Lamplighter\'s Lapras doesn\'t swim this far for sightseeing.', 'The Drowned Archive. The Lumen Company moored over it two nights ago. My Ghosts have been restless ever since.'], 'corin');
    await J.say(['The Archive is in the Veil Light\'s keeping. I will open it for you. And take this.', 'The lowest floor fell in long ago. But in the Echo it still stands - and the old stone lanterns down there will answer this light.'], 'corin');
    await J.give('m7veillamp');
    J.set('m7lamp'); J.set('m7corinMet'); J.set('echo');
    await J.say(['I lost a day too, you know. My father\'s funeral. I stood at his grave and I don\'t remember saying goodbye.', 'I\'d like it back. Not because it was a good day. Because it was mine.'], 'corin');
    await J.say('The Archive doors will open for you now. Mind the water - and mind what lives in the dark.', 'corin');
  });

  // ---- the Drowned Archive
  on('m7archive', { needs: ['!m7archive'], sets: ['m7archive'] }, async J => {
    await J.say(['The bronze doors grind shut behind you. Water drips from a domed ceiling painted with faded stars.', 'Bookcases lean in the dark like tired giants. Half the hall is under black, still water.']);
    await J.say(['In the silt by the door: boot prints. Many of them. And the wet drag-marks of crates.', 'The Lumen Company is down here - and they\'re taking the books with them.']);
    J.set('m7archive');
  });
  on('m7books', {}, J => J.say(J.pick(['Swollen, salt-stained books. The spines are in an old script, but the pictures are clear: lighthouses, and people carrying lanterns into the dark.',
    '"On the Keeping of Days" - most of the pages are pulp. One line survives: "...for a day that is never let go of can never be lived again."',
    'A children\'s book: a Litwick who is afraid of the dark. The last page has been read so often the ink is gone.',
    'An empty shelf. Dust outlines show where a whole row of books was taken. Recently.'])));
  on('m7ledger', {}, J => J.say(['A Lumen Company clipboard, left on a reading desk: "ARCHIVE RECOVERY - Agent Morrow".', 'A list of titles with ticks beside them. The last unticked line reads "THE EVER-LANTERN (mural, reading room) - DESTROY IF UNMOVABLE".']));
  on('m7lanternfolk', {}, J => J.say('A stone figure of a Lantern-folk scholar, holding up a lantern. Under the silt, the plinth reads: "WE KEPT THE LIGHT SO THE GREY WOULD KEEP ITS DISTANCE."'));
  on('m7collapse', {}, J => J.say(J.flag('m7nell') ? 'A cracked statue at the edge of the collapse. In the Echo, it stands whole - and points north, toward the reading room stairs.' : 'A cracked statue at the edge of the collapse, one arm pointing at a wall of fallen stone and shelving. There is no way through.'));
  on('m7nell', { needs: ['echo'], sets: ['m7nell'] }, async (J, n) => {
    if (J.flag('archivelore')) return J.say(['You read the mural. I watched you.', 'Is it a good thing? A world where nothing is ever lost? ...It sounds like here. I don\'t think here is a good thing.'], n);
    if (J.flag('m7nell')) return J.say(['The stairs to the reading room are past the stone lanterns. The real ones are broken. These ones aren\'t.', 'Go on. I\'ll wait. I\'m good at waiting.'], n);
    await J.say(['Oh. It\'s you again. The one with the bright edges.', 'Everyone else down here is grey. You never are.'], n);
    await J.say(['I know this place. I\'ve been here before - not like this. It was dry, and there were lamps, and somebody held my hand.', 'We read a book about a Litwick who was afraid of the dark. He did all the voices. He did a really bad Litwick.'], n);
    await J.say('...I can\'t remember his face. Isn\'t that silly? I remember the voices and not the face.', n);
    await J.say(['The stairs down are on the north side. In your world there\'s rubble. In mine there isn\'t.', 'Use the stone lantern on the far side. And come back and tell me what the big picture says. I can\'t read the old letters.'], n);
    J.set('m7nell');
  });
  on('m7morrow', { needs: ['!m7morrow'], sets: ['m7morrow'] }, async J => {
    if (J.flag('m7morrow')) return;
    await J.face('morrow', 'down'); await J.face('lk', 'down');
    await J.emote('morrow', '!');
    await J.say(['Well. How did you get down here? The stairs are under three tons of rock.', '...Ah. The shrines. Of course. You\'re the child Corvel was so embarrassed about.'], 'morrow');
    await J.say(['Agent Morrow, Lumen Company Records. I\'m afraid this library is overdue.', 'Mr. Vale would rather certain stories weren\'t read again. Not until they\'ve come true. Shall we?'], 'morrow');
    if (await J.battle({ id: 'm7morrow', name: 'Agent Morrow', look: 'agent', team: [['honchkrow', 38], ['magneton', 38], ['doublade', 39], ['lampent', 39]], pay: 60, theme: 'icecave', before: 'Quietly, please. This is a library.', lose: 'Shh... shhh...' }, 'morrow') !== 'win') return;
    await J.say(['Hm. Overdue AND overruled.', 'Read the mural, then. Read all of it. It doesn\'t matter any more - Mr. Vale has already lit the first wick.'], 'morrow');
    await J.say('A Lumen lantern flares white in his hand. When the light fades, Morrow and the Lightkeeper are gone - and so are most of his crates. He left his papers on the desk.');
    await J.fade(() => { J.hideNpc('morrow'); J.hideNpc('lk'); J.set('m7morrow'); });
  });
  on('m7papers', { needs: ['m7morrow'] }, J => J.say(J.flag('m7morrow') ? ['Agent Morrow\'s papers. Shipping manifests, stamped with the Lumen lantern.', '"CARGO: LOST DAYS, CONDENSED. DESTINATION: FROSTCROWN WORKS - THE GREAT LANTERN." The total at the bottom has seven digits.'] : 'A reading desk, stacked with Lumen Company files.'));
  on('m7mural', { needs: ['m7morrow'], sets: ['archivelore'] }, async J => {
    if (!J.flag('m7morrow')) return J.say('A great painted mural covers the north wall. Agent Morrow is standing between you and it.');
    if (J.flag('archivelore')) return J.say(['THE EVER-LANTERN. A city frozen in one golden day; its people smiling the same smile, forever.', 'And eight lighthouses, lit at last, pushing the grey back into the sea.']);
    await J.say(['A mural fills the whole north wall, painted in the Lantern-folk\'s old style. The Veil Lamp\'s light runs over it like water.', 'PANEL ONE: a great lantern on a mountain peak. People carry their lost days to it in jars of light.']);
    await J.say(['PANEL TWO: the lantern blazes. A grey tide pours out of it and rolls down the mountain over the whole land.', 'Wherever it touches, the colour goes - and the people stop. Smiling. Mid-step. Mid-word.']);
    await J.say(['PANEL THREE: the same city, a hundred times over. The same market, the same festival, the same golden afternoon.', 'Underneath, in the old script, someone has carved a translation in a newer hand:']);
    await J.say(['"We built the Ever-Lantern so that nothing would ever be lost again. We were right. Nothing was lost.', 'Nothing was born. Nothing grew old. Nothing was ever new again. We had made one perfect day, and locked ourselves inside it."']);
    await J.say(['PANEL FOUR: eight towers along the coast, their lights joined in a ring. The grey tide pulled back into the sea. The great lantern dark and broken.', '"So we built the Lights, and we let go."']);
    await J.say(['That\'s it. That\'s the Great Lantern.', 'Cassius isn\'t building something new. He\'s rebuilding the Ever-Lantern - and feeding it with everyone\'s lost days.', 'He means to pour the Echo over all Meridia. Nothing ever lost again. And nothing ever changing again.']);
    J.set('archivelore');
    await J.say('(You write it in the notebook. Beside the second statue, something carved in stone is waiting to be read.)');
  });
  on('m7golurk', { needs: ['archivelore'], sets: ['wardenlore'] }, async J => {
    if (!J.flag('archivelore')) return J.say('A statue of a colossal Golurk, carved from black stone. Its eyes are two dark hollows. Read the mural first - the statue seems to be waiting for it.');
    if (J.flag('wardenlore')) return J.say('THE WARDEN OF THE VEIL. Sleeping beneath Frostcrown. "It will not know friend from foe."');
    await J.say(['A statue of a colossal Golurk, three times the height of a person, carved from the same black stone as the mountains of Frostcrown.', 'On its chest, a seal like a lighthouse lens. The plinth is carved in both scripts.']);
    await J.say(['"THE WARDEN OF THE VEIL. We made it from the mountain\'s own heart to stand between the world and the Grey.', 'It sleeps beneath Frostcrown, under the peak where the Ever-Lantern burned."']);
    await J.say(['"While the Lights burn, it sleeps. If ever the Veil is torn, it will wake.', 'And waking in the Grey, it will not know friend from foe. Let whoever wakes it have a steady heart."']);
    await J.say(['Frostcrown. The same mountain as the shipping manifests.', 'Cassius is building the Great Lantern right on top of it.']);
    J.set('wardenlore');
    await J.say('(Corin will want to hear this. Better get back to the surface.)');
  });
  on('m7corinEnd', { needs: ['wardenlore'], sets: ['ch8'] }, async (J, n) => {
    await J.say(['You\'re pale. Paler than me, and I live in a lighthouse full of Ghosts. Tell me.', '...', 'The Ever-Lantern. And the Warden of the Veil, under Frostcrown. My grandmother sang me a lullaby about a stone giant. I thought it was only a song.'], n);
    await J.say(['A courier gull came while you were below. A message from Saltmere - from Professor Okafor.', '"Teo is worse. He doesn\'t wake for long now. Juno has taken him north to the mountain doctors at Highwatch."'], n);
    await J.say(['"The Company has opened the old road north out of Brassport, across the Coldfields. Highwatch is at the top of it - in the shadow of Frostcrown."', '"Tell {NAME} to hurry."'], n);
    await J.say(['Juno and her brother, at the foot of the very mountain where Cassius is building his lantern.', 'That is not a coincidence. Go north, {NAME}: back through Saltmere and Brassport, then up across the Coldfields. Ned\'s boat will take you to Saltmere.'], n);
    await J.say(['And when you see the girl in grey again... tell her the dark isn\'t so bad. Somebody should.'], n);
    await J.give('revive', 2);
    await J.fade(() => J.hideNpc('corin2'));
    await J.chapter('Chapter 7 complete!', 'Next: Chapter 8 - Juno\'s Choice');
    J.set('ch8'); J.refresh();
    await J.chapter('Chapter 8', 'Juno\'s Choice');
  });

  // ---- the islanders
  on('m7archKid', {}, (J, n) => J.say(J.flag('m7archive') ? 'You went INSIDE the Archive? Was it full of ghosts? Was it full of BOOKS? Which was worse?' : 'Under the lagoon there\'s a whole library! Grandpa says when the tide\'s really low you can see the dome. I saw a fish.', n));
  on('m7archLady', {}, (J, n) => J.say(J.flag('badge.veil') ? 'Corin opened the Archive for you? He never opens it. Not even for the scholars from Brassport. You must have impressed him.' : 'Boats with lanterns painted on them have been anchoring over the lagoon. The Warden went out and stared at them all night. Just stared.', n));
  on('m7netta', {}, (J, n) => J.say('Archway is the last stop before the open sea. Past the arch there\'s nothing but water all the way to the edge of the map. Or so they say.', n));
  on('m7jory', {}, (J, n) => J.say('I\'m gonna be a Ghost trainer like Corin. I\'ve already got the scary face. Look. ...Okay, I\'m still practising.', n));
  on('m7gwKid', {}, (J, n) => J.say('A Wingull stole my spade! Then it brought it back! Then it stole it again! I think it\'s a game.', n));
  on('m7abernathy', {}, (J, n) => J.say(J.flag('ch8') ? 'That courier girl, Juno - I heard her brother\'s poorly. Give her my best. Fast runner. Very fast.' : ['A courier girl came on Lantern Night with a parcel. Juno, her name was. Fast as a Starly.', 'It was a free lantern from the Lumen Company. I slept like a log for a week and forgot my own birthday. I\'ve put it in the sea since.'], n));
  on('m7aberShelf', {}, J => J.say('A delivery receipt pinned to the shelf: "REYES COURIERS - 1 PARCEL (LANTERN). Delivered: Lantern Night. Signed: J. Reyes." The date is the day that never happened.'));
  on('m7tomas', {}, (J, n) => J.say(J.flag('m7mail.a') ? ['She said yes! Forty years I\'ve been working up the nerve, and it turns out I already did it once.', 'We\'re getting married on the beach. The Wingull are invited. They\'ll steal the cake.'] : ['I\'ve lived across the path from Marguerite for forty years. Every day I mean to say something.', 'I think, once, I nearly did. But I can\'t remember when.'], n));
  on('m7margShelf', {}, J => J.say('Postcards from all over Meridia, every one of them from Tomas across the path. "Wish you were here," they all say. He\'s never been further than the pier.'));

  // ---- side story: The Last Mail Route
  on('m7odile', { sets: ['m7mail.start', 'm7mail.done'] }, async (J, n) => {
    const done = ['m7mail.a', 'm7mail.b', 'm7mail.c'].filter(f => J.flag(f)).length;
    if (J.flag('m7mail.done')) return J.say(['Three letters home. Do you know how long it\'s been since this post office lost a letter? Never. Until the Lost Days.', 'You\'re an honorary postie now. That means nothing official. It means a great deal to me.'], n);
    if (!J.flag('m7mail.start')) {
      await J.say(['Welcome to Archway Post. Every letter finds its door - that\'s our motto. Or it was.', 'Lately, letters go missing. Not lost in the post. Lost from the WORLD. Nobody remembers writing them. Nobody remembers sending them.'], n);
      await J.say(['If a day is taken, I think whatever was written on it goes too. Somewhere grey.', 'If you ever find one of those letters... bring it to the person it was meant for. Please. That\'s all a letter ever wants.'], n);
      J.set('m7mail.start');
      return;
    }
    if (done < 3) return J.say(done ? `${done} of them home already! I can feel it in my bones - and in my sorting. Keep looking, love.` : 'Any letters? They\'d be addressed to someone who never got them. Look somewhere grey.', n);
    await J.say(['All three? Marguerite, the Captain AND Old Hal?', 'Oh, I\'m going to cry on the counter. I am a professional. Give me a moment.'], n);
    await J.say(['Here. The post office\'s emergency fund. It\'s been in a biscuit tin since I was a girl, waiting for an emergency worth it.'], n);
    await J.give('rarecandy', 2);
    await J.give('ultra', 5);
    J.money(5000);
    await J.say('(You also received ¥5000 in very old coins.)');
    J.set('m7mail.done');
  });
  on('m7pigeonholes', {}, J => J.say('Rows of wooden pigeonholes, one for every house on the isles. A few have little paper flags: "RETURN TO SENDER - SENDER UNKNOWN".'));
  on('m7marguerite', { sets: ['m7mail.a'] }, async (J, n) => {
    if (J.flag('m7mail.a')) return J.say(['Married! At my age! I\'ll have to buy a hat. I\'ll have to buy TWO hats, the Wingull will steal the first.', 'Thank you, dear. Some letters are worth waiting forty years for.'], n);
    if (!J.has('m7letterA')) return J.say(['Tomas, across the path? He\'s a dear. Forty years of "good morning". Never once anything else.', 'I used to think he might. Silly old woman.'], n);
    await J.say('A letter? For me? From... Tomas?', n);
    J.take('m7letterA');
    await J.say(['"Marguerite. I have written this letter four hundred times and burned it three hundred and ninety-nine. This one I am sending.', 'Will you marry me? Answer by Wingull, or by shouting across the path. Either. - T."'], n);
    await J.say(['It\'s dated... I don\'t remember that day. Neither of us would. Oh, the old fool. He did ask.', 'He did ask! TOMAS! TOMAS, YOU OLD FOOL, YES!'], n);
    J.set('m7mail.a');
    await J.say('Here - take this. I\'ve been saving it for a special occasion, and I\'ve just had one.', n);
    await J.give('moonstone');
  });
  on('m7ysolde', { sets: ['m7mail.b'] }, async (J, n) => {
    if (J.flag('m7mail.b')) return J.say('They threw me a party. I\'m throwing it again, bigger. You\'re invited. Bring your Lapras. Bring snacks.', n);
    if (!J.has('m7letterB')) return J.say(['Captain Ysolde. I don\'t come ashore. The sea is my house and this raft is my favourite chair.', 'My crew\'s been oddly shifty since my birthday. Wait - when WAS my birthday?'], n);
    await J.say('A card. Covered in... signatures? My crew\'s signatures.', n);
    J.take('m7letterB');
    await J.say(['"HAPPY BIRTHDAY, CAPTAIN! We know you hate parties, so this one is a SURPRISE. Look behind you."', '...They threw me a surprise party. And then the whole day vanished, and nobody remembered to be surprised.'], n);
    await J.say('Ha! Ha ha! Those soft-hearted barnacles. Here - a captain always tips her postie.', n);
    await J.give('tm:scald');
    J.set('m7mail.b');
  });
  on('m7hal', { sets: ['m7mail.c'] }, async (J, n) => {
    if (J.flag('m7mail.c')) return J.say(['I wrote back. First letter I\'ve written in thirty years. My spelling is a disgrace.', 'He\'s coming home for the Lantern Night festival. My boy\'s coming home.'], n);
    if (!J.has('m7letterC')) return J.say(['My son Ren went off to Brassport after we had words. Stupid words. I said them.', 'He never wrote. I suppose that\'s fair. I never did either.'], n);
    await J.say('That\'s... that\'s Ren\'s handwriting. He always pressed too hard with the pen.', n);
    J.take('m7letterC');
    await J.say(['"Pa. I\'m sorry about the boat. I\'m sorry about what I said about the boat. I\'m sorry about the other thing I said about the boat.', 'I miss the bay. I miss you. Can I come home for Lantern Night? - Ren."'], n);
    await J.say(['He wrote. He did write.', 'And I thought all this time he... I\'ve been angry at a silence that never happened.'], n);
    await J.say('I haven\'t much. Take these. And thank you, from the bottom of an old heart.', n);
    await J.give('rarecandy');
    J.set('m7mail.c');
  });

  chapter({ n: 7, title: 'The Drowned Archive', start: { map: 'sealane1', x: 1, y: 13, dir: 'right' }, level: 37, badge: 'veil', center: 'center_archway',
    goals: ['badge.veil', 'm7lamp', 'm7archive', 'm7nell', 'm7morrow', 'archivelore', 'wardenlore', 'ch8'] });
})();
