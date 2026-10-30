'use strict';
// =====================================================================
//  JOURNEY II - Chapter 3: The Ghost Train. Twenty years ago the 11:59
//  Lantern Express vanished at Hollow Cut on the old line, with forty-one
//  people aboard. Now it comes back at midnight. You ride it into the
//  Echo - the same old line, grey and frozen, where the cutting never
//  fell - and meet Nell, a girl in grey with a Litwick. From now on the
//  Echo Shrines carry you between the worlds. Side stories: the Ghost
//  Train's Last Passenger (Conductor Hale and Signalman Harlan) and the
//  first letter of the Last Mail Route. See docs/journey2/world.md.
// =====================================================================
(() => {
  const { def, grid, L, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m3ghost: { hat: 'cap', hatColor: 0xb8b8c8, hatFront: 0xe8e8f0, hair: 0xc8c8d0, hairStyle: 'short', top: 0xa8a8b8, sleeves: 'long', inner: 0xe8e8f0, legs: 0x8a8a98, legStyle: 'pants', shoes: 0x6a6a78, bag: 0x9a9aa8, skin: '#e4e4ec' },
    m3ghostf: { hat: 'sunhat', hatColor: 0xc8c8d4, hatBand: 0x9a9aa8, hair: 0xd0d0d8, hairStyle: 'long', top: 0xb0b0c0, sleeves: 'long', inner: 0xe8e8f0, legs: 0x9a9aa8, legStyle: 'skirt', shoes: 0x6a6a78, bag: null, skin: '#e4e4ec' },
    m3conductor: { hat: 'cap', hatColor: 0x7a7a8a, hatFront: 0xd8d8e0, hair: 0xd8d8e0, hairStyle: 'short', top: 0x6a6a7a, sleeves: 'long', inner: 0xd8d8e0, legs: 0x6a6a7a, legStyle: 'pants', shoes: 0x4a4a58, bag: 0x8a8a98, skin: '#e4e4ec' },
    m3harlan: { hat: 'cap', hatColor: 0x3a4a3a, hatFront: 0xb08a3a, hair: 0xd9d9d9, hairStyle: 'short', top: 0x4a5a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a2a1e, bag: null, scarf: 0xc84848 },
    m3railman: { hat: 'cap', hatColor: 0x2a3a6a, hatFront: 0xb08a3a, hair: 0x3a2a1e, hairStyle: 'short', top: 0x2a3a6a, sleeves: 'long', inner: 0xb08a3a, legs: 0x2a3a6a, legStyle: 'pants', shoes: 0x1a1a24, bag: null },
    m3medium: { hat: null, hair: 0x2a2a3a, hairStyle: 'long', top: 0x4a2a5a, sleeves: 'long', inner: 0xb8a0d8, legs: 0x2a1a34, legStyle: 'skirt', shoes: 0x1a1a24, bag: null, scarf: 0xb8a0d8 }
  });

  // ---- items
  Object.assign(ITEMS, {
    m3ticket: { name: 'Old Ticket', pocket: 'key', price: 0, desc: 'A ticket for the 11:59 Lantern Express, Brassport to Mossgrove, dated twenty years ago. Never punched.' },
    m3log: { name: 'Conductor\'s Log', pocket: 'key', price: 0, desc: 'Conductor Oswin Hale\'s logbook from the Lantern Express. The last page is written in a shaking hand. Signalman Harlan should read it.' },
    m3letter1: { name: 'Echo Letter', pocket: 'key', price: 0, desc: 'A letter from the Echo, grey at the edges: "To Wendell Marsh, Grand Canal Row, Brassport." Twenty years late.' }
  });
  ITEMS['tm:hex'] = ITEMS['tm:hex'] || { name: 'TM Hex', pocket: 'tms', price: 0, tm: 'hex', desc: 'Teaches Hex: an eerie curse. Hits much harder if the foe already has a status problem.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m3legend: 'Station Master Ines: the 11:59 Lantern Express left Brassport for Mossgrove twenty years ago and vanished at Hollow Cut. 41 people aboard. Rail men say it still runs at midnight.',
    c3train: 'Old Harlan, the signalman everyone blamed, waits at Hollow Cut Halt every night. At midnight the Lantern Express came. I got on.',
    m3grey: 'The train stopped at the same halt - but grey, silent, frozen. Rain that doesn\'t fall. This is the place Prof. Okafor\'s machines can\'t see: the Echo.',
    nellmet: 'In the Echo I met NELL: a quiet girl in grey with a Litwick called Wick. She doesn\'t remember who she is. She\'s the girl from the canal.',
    echo: 'Echo Shrines: old stone lanterns built by the Lantern-folk. Face one and press A to cross between Meridia and the Echo. In the Echo, Hollow Cut never fell.',
    m3okpale: 'Prof. Okafor went pale when I said the name "Nell". She says the Lantern-folk built the shrines - their ruins are in the Wildheart, past Mossgrove.',
    m3hale: 'Conductor Hale, still punching tickets at 11:59: "The signal was GREEN. Harlan did nothing wrong. There was a white light on the line." His log is in the signal box.',
    m3log: 'Hale\'s log, last entry: "White light ahead at Hollow Cut, bright as a lighthouse. Figures by the track in long coats. The line is - " Then nothing.',
    m3harlanfree: 'Harlan read Hale\'s log. Twenty years of blame, and the signal was green all along. Something else stopped the Lantern Express.',
    m3halerest: 'Conductor Hale got off the train at last. "It\'s always 11:59 on this train. It\'s time someone let it be midnight."',
    m3letter1: 'THE LAST MAIL ROUTE: a mail sack from the Lantern Express lies in the Echo. One letter is still whole: to Wendell Marsh, Grand Canal Row, Brassport.',
    m3mail1: 'Wendell Marsh read his mother\'s letter, twenty years late. "I remember her voice now." There must be more lost letters in the Echo.',
    m3gideontold: 'Gideon read his own name in Hale\'s log: "Apprentice G. checked the lamps and brakes. All in order. Good lad." He did his job that night.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // the railyard
    m3w1: { team: [['machop', 18], ['geodude', 19]], pay: 22, theme: 'city', before: 'Hard hat area! Hard battles too!', lose: 'Clocking off early...', after: 'Twenty years I\'ve worked this yard. Nobody takes the old line. Not after the Express.' },
    m3w2: { team: [['magnemite', 19], ['electrike', 19]], pay: 24, theme: 'city', before: 'Engines, signals, sparks - I fix \'em all. Let\'s see how YOU run!', lose: 'Blew a gasket.', after: 'The signals on the old line still flicker at night. Nobody\'s powered them in twenty years.' },
    m3fan: { team: [['porygon', 19], ['pikachu', 19]], pay: 20, theme: 'city', before: 'I\'ve spotted every engine in Meridia! Except one. Battle me while I wait!', lose: 'Derailed!', after: 'The Lantern Express. Engine number 1159. The only one I\'ll never have in my book.' },
    // the Old Rail Line
    m3hiker: { team: [['geodude', 18], ['onix', 20]], pay: 22, theme: 'forest', before: 'The old line\'s the best hike in Meridia - flat the whole way! Until the cut.', lose: 'Rockslide!', after: 'Hollow Cut came down the night the Express vanished. Some say the hill fell on it. They never found a single carriage.' },
    m3camper: { team: [['growlithe', 19], ['ponyta', 19]], pay: 20, theme: 'forest', before: 'Camping by the old line! Ghost stories round the fire! You in?', lose: 'My fire\'s out...', after: 'Every midnight we hear a whistle. Every midnight! We stopped telling ghost stories. We don\'t need to.' },
    m3lk1: { team: [['houndour', 19], ['golbat', 20]], pay: 32, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'Company survey team! We\'re measuring... things. Terribly sorry, I can\'t say what. Battle?', lose: 'I do apologise for the inconvenience. Mine.', after: 'Our instruments go wild at midnight out here. The Director says it\'s "promising". I didn\'t ask what that meant.' },
    m3lk2: { team: [['magnemite', 19], ['murkrow', 20]], pay: 32, theme: 'forest', look: 'keeperf', name: 'Lightkeeper', before: 'This line is closed. For your safety. And our survey. Mostly the survey. Sorry!', lose: 'Oh, how mortifying.', after: 'Please don\'t touch the old stone lanterns. They\'re... Company interest. Probably. Nobody has told me.' },
    m3medium: { team: [['duskull', 20], ['misdreavus', 21]], pay: 26, theme: 'forest', look: 'm3medium', name: 'Medium Odette', before: 'The spirits whisper of a traveller between worlds. Is it you? Let us ask them... with a battle.', lose: 'The spirits... applaud.', after: 'This side of the cut, the air is thin. Thin between here and somewhere else.' },
    m3hunter: { team: [['gastly', 20], ['shuppet', 20], ['haunter', 21]], pay: 24, theme: 'forest', look: 'camper', name: 'Ghost Hunter Rufus', before: 'I hunt ghosts! I\'ve never caught one. But tonight\'s the night. Probably!', lose: 'Spooked...', after: 'If you ever find a door into wherever ghosts go, take me with you. Please.' },
    m3birder: { team: [['noibat', 20], ['staravia', 21]], pay: 22, theme: 'forest', look: 'youngster', name: 'Birdkeeper Wren', before: 'Shh! I\'m listening for Noibat! Oh well, too late now - battle!', lose: 'Flew the coop.', after: 'North of here is Mossgrove, then the Wildheart. The trees there are older than the lighthouses.' },
    // the ghost train: passengers who never got off
    m3gt1: { team: [['litwick', 20], ['shuppet', 21]], pay: 20, theme: 'city', look: 'm3ghost', name: 'Phantom Passenger', before: '...Is this Mossgrove? We\'ve been travelling so long...', lose: 'Not my stop. Not yet...', after: 'Eleven fifty-nine. It\'s always eleven fifty-nine.' },
    m3gt2: { team: [['duskull', 21], ['gastly', 21]], pay: 20, theme: 'city', look: 'm3ghostf', name: 'Phantom Passenger', before: 'You\'re warm. Why are you warm? Nobody on this train is warm...', lose: 'So bright... like a lamp...', after: 'I was going to see my sister. Tell her I\'m running late. Very late.' },
    m3gt3: { team: [['golett', 21], ['haunter', 22]], pay: 22, theme: 'city', look: 'm3ghost', name: 'Phantom Porter', before: 'Mind the mail, please. The mail must get through. The mail ALWAYS gets through.', lose: 'Dropped... the post...', after: 'One sack fell out at the cut. One whole sack. I\'ve been meaning to fetch it for twenty years.' },
    // the Echo
    m3grey1: { team: [['sableye', 21], ['misdreavus', 22]], pay: 26, theme: 'forest', look: 'm3ghostf', name: 'Grey Wanderer', before: 'Someone who moves! Someone who TALKS! Battle me before I forget how!', lose: 'Ah... I remember that. Losing. How lovely.', after: 'I came here looking for a day I lost. I found it. I\'ve been living it ever since. Over and over. It\'s a very good day.' }
  });

  // =====================================================================
  //  Brassport Railyard - east of the plaza: sidings, the engine shed,
  //  the station; the old line runs north out of the yard
  // =====================================================================
  {
    const B = grid(30, 24, ',').border('f', { w: [12, 14], n: [14, 16] }, 1);
    B.fill(15, 0, 16, 16, '=').fill(1, 17, 28, 17, '=').fill(1, 20, 28, 20, '=').fill(23, 15, 24, 16, '=');   // the old line north; two sidings; a spur into the shed
    B.fill(1, 12, 13, 14, 'u');                                                                             // the cobbled lane in from the city
    B.fill(3, 8, 10, 9, 'b');                                                                               // the station platform
    B.fill(1, 21, 28, 22, ';').fill(17, 2, 20, 6, ';').fill(26, 7, 28, 8, ';');                             // weeds
    B.put(1, 2, 'T').put(28, 10, 'T').put(1, 18, 'r').put(28, 19, 'r');
    def({ id: 'railyard', name: 'Brassport Railyard', kind: 'town', rows: B.rows(), music: 'town', battle: 'city',
      encounters: { tall: { rate: 0.1, min: 16, max: 19, table: [['magnemite', 22], ['meowth', 18], ['electrike', 16], ['geodude', 14], ['drilbur', 12], ['tynamo', 10], ['machop', 8]] } },
      buildings: [{ b: 'station', x: 3, y: 3, to: 'm3station' }, { b: 'house', x: 22, y: 2, to: 'm3maud', variant: 2 }, { b: 'gym', x: 20, y: 9, variant: 4, deco: true }],
      furniture: [{ k: 'machine', x: 3, y: 20, talk: 'm3carriage' }, { k: 'machine', x: 5, y: 20, talk: 'm3carriage' }, { k: 'machine', x: 7, y: 20, talk: 'm3carriage' },
        { k: 'machine', x: 18, y: 17, talk: 'm3carriage' }, { k: 'machine', x: 20, y: 17, talk: 'm3carriage' },
        { k: 'boxes', x: 11, y: 3 }, { k: 'boxes', x: 12, y: 3 }, { k: 'boxes', x: 11, y: 4 }, { k: 'boxes', x: 1, y: 15 }, { k: 'boxes', x: 2, y: 15 }, { k: 'boxes', x: 27, y: 15 }, { k: 'boxes', x: 28, y: 14 }],
      signs: [{ x: 13, y: 11, text: 'BRASSPORT RAILYARD\nFreight sidings - Station - Old Rail Line (north).' }, { x: 17, y: 1, text: 'NORTH: THE OLD RAIL LINE\nHollow Cut Halt - Mossgrove.\nLINE CLOSED.' },
        { x: 19, y: 13, text: 'ENGINE SHED No. 2\nAuthorised staff only.' }, { x: 21, y: 6, text: 'HARLAN' }],
      props: [{ k: 'lamp', x: 14, y: 11 }, { k: 'lamp', x: 17, y: 11 }, { k: 'lamp', x: 2, y: 11 }, { k: 'lamp', x: 10, y: 11 }, { k: 'lumenlamp', x: 2, y: 10 }, { k: 'lumenlamp', x: 13, y: 15 }],
      edges: { w: { to: 'brassport_n', dy: 0 }, n: { to: 'oldrail', dx: -5 } },
      items: [{ x: 28, y: 2, item: 'great', n: 2 }, { x: 1, y: 22, item: 'superpotion', n: 1 }, { x: 12, y: 2, item: 'revive', n: 1, hidden: true }, { x: 28, y: 22, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'w1', x: 5, y: 15, dir: 'right', look: L.worker, name: 'Rail Worker', trainer: 'm3w1' },
        { id: 'w2', x: 26, y: 6, dir: 'down', look: L.worker, name: 'Engineer', trainer: 'm3w2' },
        { id: 'fan', x: 12, y: 19, dir: 'left', look: L.youngster, name: 'Trainspotter Ollie', trainer: 'm3fan' },
        { id: 'surveyor', x: 8, y: 13, dir: 'up', look: L.agent, name: 'Lumen Surveyor', talk: 'm3surveyor' },
        { id: 'juno', x: 18, y: 13, dir: 'left', look: L.juno, name: 'Juno', talk: 'm3juno', show: ['!ch4'] },
        { id: 'gideon', x: 18, y: 8, dir: 'down', look: L.gideon, name: 'Warden Gideon', talk: 'm3gideon', show: ['m3harlanfree'] },
        { id: 'oiler', x: 25, y: 18, dir: 'left', look: L.m3railman, name: 'Yard Foreman', talk: 'm3foreman' }] });
  }
  def({ id: 'm3station', name: 'Brassport Station', kind: 'inside', outside: 'railyard', isCenter: true, rows: grid(17, 10, '+').border('#').fill(1, 9, 15, 9, '+').put(8, 9, 'm').fill(7, 5, 9, 7, 'R').rows(),
    arrive: { x: 8, y: 8 },
    furniture: [{ k: 'counter', x: 1, y: 2 }, { k: 'statue', x: 8, y: 1, talk: 'm3plaque' }, { k: 'machine', x: 10, y: 1, talk: 'm3timetable' }, { k: 'shelf', x: 13, y: 1, talk: 'm3lostfound' },
      { k: 'healer', x: 15, y: 3 }, { k: 'pc', x: 15, y: 1, talk: 'boxPc' }, { k: 'sofa', x: 2, y: 6 }, { k: 'sofa', x: 4, y: 6 }, { k: 'sofa', x: 11, y: 6 }, { k: 'sofa', x: 13, y: 6 }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 15, y: 8 }],
    npcs: [{ id: 'ines', x: 3, y: 1, dir: 'down', look: L.m3railman, name: 'Station Master Ines', talk: 'm3ines', counter: true },
      { id: 'nurse', x: 14, y: 4, dir: 'down', look: L.aide, name: 'Station Medic', talk: 'm3medic' },
      { id: 'ezra', x: 5, y: 5, dir: 'down', look: L.oldman, name: 'Old Railman Ezra', talk: 'm3ezra' },
      { id: 'kid', x: 11, y: 5, dir: 'down', look: L.kid, name: 'Kid', talk: 'm3stationKid' }] });
  def({ id: 'm3maud', name: 'Harlan\'s house', kind: 'inside', outside: 'railyard', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm3harlanShelf' }, { k: 'stove', x: 4, y: 1 }, { k: 'bed', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'maud', x: 6, y: 4, dir: 'left', look: L.woman, name: 'Maud', talk: 'm3maud' }] });

  // =====================================================================
  //  The Old Rail Line - north from the railyard to Hollow Cut Halt, then
  //  the cutting that came down twenty years ago, and the woods beyond on
  //  the way to Mossgrove. (In the Echo, the cutting still stands open.)
  // =====================================================================
  {
    const B = grid(20, 44, '.').border('T', { s: [9, 11], n: [9, 11] }, 1);
    B.fill(1, 1, 2, 42, 'T').fill(17, 1, 18, 42, 'T');                          // the wooded sides of the cutting
    B.fill(10, 1, 11, 42, '=').fill(9, 35, 9, 42, ',').fill(9, 1, 9, 6, ',');     // the old line, and a footpath beside it at each end
    B.fill(12, 27, 14, 34, 'b');                                                // Hollow Cut Halt
    B.fill(3, 36, 7, 41, ';').fill(13, 37, 16, 41, ';').fill(3, 27, 7, 31, ';').fill(3, 7, 7, 12, ';').fill(13, 3, 16, 9, ';');
    B.fill(3, 33, 4, 34, 'T').put(7, 34, 'T').put(16, 25, 'T').put(15, 26, 'T').put(3, 25, 'T').fill(4, 1, 6, 2, 'T').put(16, 12, 'T').put(3, 14, 'T');
    B.fill(12, 38, 12, 39, '*').fill(6, 4, 7, 5, '*').fill(15, 30, 16, 31, '*');
    // Hollow Cut: the night the Express vanished, the cutting came down across the line
    B.fill(3, 16, 16, 19, 'r').fill(5, 17, 7, 18, 'T').fill(14, 16, 15, 17, 'T').put(11, 18, 'T');
    def({ id: 'oldrail', name: 'Old Rail Line', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 16, max: 20, table: [['murkrow', 14], ['rockruff', 14], ['noibat', 14], ['houndour', 12], ['geodude', 12], ['phanpy', 10], ['growlithe', 8], ['magnemite', 8], ['shuppet', 8]] } },
      edges: { s: { to: 'railyard', dx: 5 }, n: { to: 'mossgrove', dx: 0, needs: ['ch4'] } },
      buildings: [{ b: 'house', x: 3, y: 21, variant: 7, deco: true }],                // the burnt-out signal box
      furniture: [{ k: 'sofa', x: 13, y: 27, talk: 'm3bench' }],
      signs: [{ x: 8, y: 42, text: 'THE OLD RAIL LINE\nBrassport Railyard - Hollow Cut Halt - Mossgrove' }, { x: 14, y: 34, text: 'HOLLOW CUT HALT\nNo services.' },
        { x: 9, y: 20, text: 'DANGER - HOLLOW CUT COLLAPSED\nLINE CLOSED BY ORDER OF THE BRASSPORT RAIL BOARD.' }, { x: 8, y: 24, text: 'SIGNAL BOX - HOLLOW CUT\n(Burnt out. Keep away.)' }],
      props: [{ k: 'lamp', x: 14, y: 29 }, { k: 'lamp', x: 14, y: 32 }, { k: 'lamp', x: 8, y: 8 }],
      items: [{ x: 3, y: 42, item: 'superpotion', n: 1 }, { x: 7, y: 27, item: 'great', n: 2 }, { x: 4, y: 3, item: 'ultra', n: 1 }, { x: 16, y: 10, item: 'fullheal', n: 1 },
        { x: 16, y: 42, item: 'revive', n: 1, hidden: true }, { x: 16, y: 2, item: 'rarecandy', n: 1, hidden: true }, { x: 8, y: 25, item: 'awakening', n: 2, hidden: true }],
      npcs: [{ id: 'harlan', x: 12, y: 30, dir: 'left', look: L.m3harlan, name: 'Old Harlan', talk: 'm3harlan', show: ['!m3log'] },
        { id: 'harlan2', x: 12, y: 30, dir: 'left', look: L.m3harlan, name: 'Old Harlan', talk: 'm3harlanLog', show: ['m3log'] },
        { id: 'okafor', x: 12, y: 25, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm3okafor', show: ['nellmet', '!ch4'] },
        { id: 'hiker', x: 4, y: 38, dir: 'right', look: L.hiker, name: 'Hiker Dov', trainer: 'm3hiker' },
        { id: 'camper', x: 15, y: 36, dir: 'left', look: L.camper, name: 'Camper Tess', trainer: 'm3camper' },
        { id: 'lk1', x: 8, y: 32, dir: 'right', look: L.keeper, name: 'Lightkeeper', trainer: 'm3lk1' },
        { id: 'lk2', x: 9, y: 23, dir: 'down', look: L.keeperf, name: 'Lightkeeper', trainer: 'm3lk2' },
        { id: 'medium', x: 4, y: 13, dir: 'right', look: L.m3medium, name: 'Medium Odette', trainer: 'm3medium' },
        { id: 'hunter', x: 8, y: 10, dir: 'right', look: L.camper, name: 'Ghost Hunter Rufus', trainer: 'm3hunter' },
        { id: 'birder', x: 15, y: 11, dir: 'left', look: L.youngster, name: 'Birdkeeper Wren', trainer: 'm3birder' }] });
  }

  // ---- the Echo of the Old Rail Line: the line as it was on the night of the Express. The cutting stands open, the
  // signal box is whole (and its door opens), the train waits at the halt, and a mail sack lies on the track.
  MMaps.echoTwin('oldrail', 'echo_oldrail', [{ x: 13, y: 23 }, { x: 13, y: 13 }], {
    name: 'Old Rail Line (Echo)', chapter: 3,
    encounters: { tall: { rate: 0.13, min: 17, max: 21, table: [['shuppet', 22], ['duskull', 20], ['gastly', 20], ['litwick', 14], ['golett', 10], ['misdreavus', 8], ['sableye', 6]] } },
    buildings: [{ b: 'house', x: 3, y: 21, variant: 7, to: 'm3signalbox' }],
    furniture: [{ k: 'sofa', x: 13, y: 27, talk: 'm3bench' }, { k: 'boxes', x: 5, y: 17, talk: 'm3mailbag' },
      // the Lantern Express, standing at the halt; its door is the gap at y 29
      ...[24, 25, 26, 27, 28, 30, 31, 32, 33, 34].map(y => ({ k: 'machine', x: 10, y, talk: 'm3express' }))],
    warps: [{ x: 11, y: 29, to: 'ghosttrain2', tx: 19, ty: 3, dir: 'left' }],
    signs: [{ x: 14, y: 34, text: 'HOLLOW CUT HALT\n11:59 TO MOSSGROVE - ON TIME' }, { x: 8, y: 24, text: 'SIGNAL BOX - HOLLOW CUT\nSignalman on duty: H. HARLAN' }],
    items: [{ x: 16, y: 18, item: 'revive', n: 1 }, { x: 3, y: 15, item: 'ultra', n: 1, hidden: true }, { x: 8, y: 19, item: 'great', n: 2 }],
    npcs: [{ id: 'nell', x: 13, y: 25, dir: 'down', look: L.nell, name: 'Nell', talk: 'm3nell' },
      { id: 'grey1', x: 6, y: 5, dir: 'right', look: L.m3ghostf, name: 'Grey Wanderer', trainer: 'm3grey1' },
      { id: 'boy', x: 6, y: 33, dir: 'right', look: L.youngster, name: 'Grey Boy', talk: 'm3greyBoy' }]
  }, B => {
    B.fill(3, 16, 16, 19, '.').fill(10, 16, 11, 19, '=').fill(3, 18, 8, 19, ';').fill(14, 16, 16, 17, '*');    // Hollow Cut, before it fell
  });
  def({ id: 'm3signalbox', name: 'Signal Box (Echo)', kind: 'inside', outside: 'echo_oldrail', echoOf: 'oldrail', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm3levers' }, { k: 'machine', x: 3, y: 1, talk: 'm3levers' }, { k: 'desk', x: 6, y: 2, talk: 'm3logDesk' }, { k: 'chair', x: 6, y: 3 }, { k: 'shelf', x: 1, y: 4 }] });

  // ---- the Lantern Express: two carriages, grey as old photographs (the Echo's colours)
  {
    const car = () => grid(22, 7, '_').border('#').put(20, 3, 'R').put(1, 3, 'R').rows();
    const seats = [2, 5, 8, 11, 14, 17].flatMap(x => [{ k: 'sofa', x, y: 1 }, { k: 'sofa', x, y: 5 }]);
    def({ id: 'ghosttrain1', name: 'The Lantern Express', kind: 'inside', echoOf: 'oldrail', rows: car(), battle: 'city', music: 'forest', dock: { x: 2, y: 3, dir: 'right' },
      furniture: seats,
      warps: [{ x: 20, y: 3, to: 'ghosttrain2', tx: 2, ty: 3, dir: 'right' }],
      items: [{ x: 19, y: 1, item: 'great', n: 1, hidden: true }, { x: 7, y: 4, item: 'superpotion', n: 1 }],
      npcs: [{ id: 'gt1', x: 10, y: 2, dir: 'down', look: L.m3ghost, name: 'Phantom Passenger', trainer: 'm3gt1' },
        { id: 'gt2', x: 16, y: 4, dir: 'up', look: L.m3ghostf, name: 'Phantom Passenger', trainer: 'm3gt2' },
        { id: 'p1', x: 4, y: 2, dir: 'down', look: L.m3ghostf, name: 'Passenger', talk: 'm3pass1' },
        { id: 'p2', x: 13, y: 4, dir: 'up', look: L.m3ghost, name: 'Passenger', talk: 'm3pass2' },
        { id: 'p3', x: 19, y: 4, dir: 'left', look: L.kid, name: 'Grey Child', talk: 'm3pass3' }] });
    def({ id: 'ghosttrain2', name: 'The Lantern Express - Front Car', kind: 'inside', echoOf: 'oldrail', rows: car(), battle: 'city', music: 'forest',
      furniture: [{ k: 'sofa', x: 2, y: 1 }, { k: 'sofa', x: 5, y: 1 }, { k: 'sofa', x: 2, y: 5 }, { k: 'sofa', x: 5, y: 5 },
        { k: 'boxes', x: 14, y: 1, talk: 'm3sacks' }, { k: 'boxes', x: 15, y: 1, talk: 'm3sacks' }, { k: 'boxes', x: 16, y: 1, talk: 'm3sacks' }, { k: 'boxes', x: 14, y: 5, talk: 'm3sacks' }, { k: 'boxes', x: 15, y: 5, talk: 'm3sacks' },
        { k: 'desk', x: 9, y: 5, talk: 'm3punch' }],
      warps: [{ x: 1, y: 3, to: 'ghosttrain1', tx: 19, ty: 3, dir: 'left' }, { x: 20, y: 3, to: 'echo_oldrail', tx: 12, ty: 29, dir: 'right' }],
      // the last few steps to the door: where you notice the world outside has turned grey
      zones: [{ x: 18, y: 1, w: 1, h: 5, event: 'm3grey' }],
      npcs: [{ id: 'hale', x: 8, y: 2, dir: 'down', look: L.m3conductor, name: 'Conductor Hale', talk: 'm3hale', show: ['!m3harlanfree'] },
        { id: 'hale2', x: 8, y: 2, dir: 'down', look: L.m3conductor, name: 'Conductor Hale', talk: 'm3haleRest', show: ['m3harlanfree', '!m3halerest'] },
        { id: 'gt3', x: 12, y: 4, dir: 'up', look: L.m3ghost, name: 'Phantom Porter', trainer: 'm3gt3' }] });
  }

  // ---- Wendell Marsh (Brassport, North Quarter) once you carry his letter
  if (M.m2marsh) M.m2marsh.npcs.push({ id: 'wendell2', x: 6, y: 3, dir: 'left', look: L.man, name: 'Wendell Marsh', talk: 'm3wendell', show: ['m3letter1'] });

  // =====================================================================
  //  The story
  // =====================================================================
  const sp = J => J.dname(J.get('mystarter') || 'eevee');
  // ---- the railyard and the station
  on('m3ines', { sets: ['m3legend'] }, async (J, n) => {
    if (J.flag('m3legend')) return J.say(J.flag('c3train') ? ['You RODE it? The Express? ...I\'d call you a liar, but my clocks all started again at midnight.', 'Whatever\'s out there, be careful. Hollow Cut has taken enough.'] : ['Hollow Cut Halt is north up the old line. Old Harlan waits there every night. Somebody should bring him home.', 'If you go, take the ticket. Feels wrong to ride without one. Even a ghost train.'], n);
    await J.say(['Brassport Station! Trains to everywhere, nearly. I\'m Ines, the station master.', 'The old line north? Closed twenty years. Since the Lantern Express.'], n);
    await J.say(['The 11:59 Lantern Express, Brassport to Mossgrove. Forty-one passengers, Conductor Hale, mail for half the Wildheart.', 'At midnight it reached Hollow Cut. And then... nothing. The cutting fell. They dug for a month. Not a bolt, not a carriage, not a soul.'], n);
    await J.say(['They blamed the signalman, Harlan. Said he set the signal wrong. He\'s never stopped going out there.', 'And lately... the night crews say they hear a whistle on the old line. At midnight. Every night.'], n);
    await J.say('Here. This turned up in lost property years ago - an Express ticket, never punched. Nobody ever claimed it.', n);
    await J.give('m3ticket');
    J.set('m3legend');
    await J.say('(You write it in the notebook: the Lantern Express, Hollow Cut, the signalman Harlan.)');
  });
  on('m3medic', {}, async (J, n) => {
    await J.say('Station first aid! Rail work is rough on Pokémon. Want me to patch yours up?', n);
    if (await J.ask('Heal your Pokémon?', ['Yes, please', 'No, thanks'], n) !== 0) return;
    await J.healCenter();
    await J.say('Good as new! Mind the gap, now.', n);
  });
  on('m3ezra', {}, (J, n) => J.say(J.flag('m3harlanfree') ? ['Harlan came in this morning and bought everybody tea. Twenty years, and he\'s never once bought tea.', 'Whatever you did, kid... thank you.'] : ['Harlan and Hale were best friends, you know. Signalman and conductor. Chess every Sunday.', 'When the Express went, Harlan lost his friend and his name the same night. Never got either back.'], n));
  on('m3stationKid', {}, (J, n) => J.say(J.pick(['I\'m waiting for the 3:15 to Ochre! It\'s late. Everything\'s late. Grown-ups say "the trains used to run on time".', 'Do ghosts need tickets? If they don\'t, that\'s not fair.']), n));
  on('m3plaque', {}, J => J.say('A brass plaque, polished bright: "IN MEMORY OF THE 11:59 LANTERN EXPRESS, AND THE FORTY-ONE SOULS ABOARD. LOST AT HOLLOW CUT. NOT FORGOTTEN."'));
  on('m3timetable', {}, J => J.say(J.flag('c3train') ? 'DEPARTURES. Someone has chalked a new line at the bottom: "11:59 - LANTERN EXPRESS - HOLLOW CUT - ON TIME."' : 'DEPARTURES: Ochre 3:15 (delayed). Saltmere coast service (suspended - flooding). Old Line (closed).'));
  on('m3lostfound', {}, J => J.say('LOST PROPERTY: umbrellas, a single roller skate, three Poké Dolls, and a box labelled "LANTERN EXPRESS - UNCLAIMED" that is mostly empty.'));
  on('m3surveyor', {}, (J, n) => J.say(J.flag('nellmet') ? ['Our readings at the cut last night were... remarkable. Did you see anything? No? Of course not. Nothing to see.', 'Please don\'t mention the readings to anyone. Especially not a professor.'] : ['Lumen Company survey. We\'re measuring the, ah, ambient light. Out on the old line.', 'The Company is very interested in old railways. Purely historical interest! Do excuse me.'], n));
  on('m3juno', {}, (J, n) => J.say(J.flag('c3train') ? ['You went INTO the ghost train? Without me?! {NAME}! I\'m so jealous I could scream.', '...Teo fell asleep at dinner last night. Mid-sentence. Mom had to carry him to bed. Probably nothing. Right?'] : ['A ghost train! Gideon told me. He said you were going to ride it. Are you going to ride it? You\'re going to ride it.', 'I\'d come, but I\'ve got deliveries till midnight. And Mom keeps calling about Teo. He\'s so sleepy lately.'], n));
  on('m3foreman', {}, (J, n) => J.say(['That shed? Engine 1158, the Express\'s sister. Same model, same paint. We keep her oiled.', 'Superstition. If 1159 ever comes home, she\'ll want her sister waiting.'], n));
  on('m3carriage', {}, J => J.say('A parked carriage, its brass rails polished. Through the window: rows of empty seats.'));
  on('m3maud', {}, (J, n) => J.say(J.flag('m3harlanfree') ? ['Dad slept through the night. All night. First time in twenty years.', 'He laughed at breakfast. I\'d forgotten what his laugh sounds like. Thank you.'] : ['You\'re looking for my father? He\'ll be up at Hollow Cut Halt. He goes every night.', 'Twenty years. He sits on that bench and waits for a train that isn\'t coming. Says he owes someone an apology.'], n));
  on('m3harlanShelf', {}, J => J.say('A shelf with a chessboard, mid-game. The black king is tipped over. A note under it: "Your move, Oswin."'));

  // ---- Hollow Cut Halt: old Harlan, and the midnight train
  const ride = async J => {
    await J.fade(async () => { await J.wait(500); });
    await J.say(['Midnight. Far down the line, a whistle. Then lamplight, swimming up the old line out of the dark.', 'The Lantern Express pulls into Hollow Cut Halt, twenty years late, without a sound. Its doors slide open.']);
  };
  const board = async J => {
    await J.travel('ghosttrain1', 2, 3, 'right');
    await J.say(['The doors close behind you. The carriage is full of passengers, perfectly still, grey as old photographs.', 'Outside the windows, the halt slides away. The train is moving - and nothing makes a sound.']);
  };
  on('m3harlan', { needs: ['m3legend'], sets: ['c3train'], travel: [{ map: 'ghosttrain1', needs: ['m3legend'] }] }, async (J, n) => {
    if (!J.flag('m3legend')) return J.say(['Leave an old man be. I\'m waiting.', '...For a train. Ha. Go and ask at the station what train, if you must.'], n);
    if (!J.flag('c3train')) {
      await J.say(['You\'ve heard, then. Ines told you. I can see it on your face.', 'I was the signalman at Hollow Cut. Twenty years ago tonight - well, every night is tonight, for me.'], n);
      await J.say(['They said I set the signal wrong. That I sent forty-one people and my best friend into the dark.', 'I don\'t know. I don\'t know! I remember a light, and then nothing. Twenty years, I\'ve come out here every night.'], n);
      await J.say(['And lately, at midnight... it comes. The Express. It stops right here and opens its doors.', 'And I can\'t. I can\'t get on. My legs won\'t carry me.'], n);
      if (await J.ask('Wait for midnight with Harlan?', ['Wait with him', 'Not tonight'], n) !== 0) return J.say('No. Sensible. Go home, kid. Sleep. Sleep is a good thing.', n);
      await ride(J);
      await J.say(['There. THERE. You see it too? It\'s not just me?', '...Go on. You\'re braver than me. And if Oswin Hale is on that train... tell him I\'m sorry.'], n);
      J.set('c3train');
      return board(J);
    }
    if (await J.ask('It comes every midnight now. Ride the Express again?', ['Wait for it', 'Not now'], n) !== 0) return J.say('I\'ll be here. I\'m always here.', n);
    await ride(J);
    return board(J);
  });
  on('m3harlanLog', { needs: ['m3log'], sets: ['m3harlanfree'], travel: [{ map: 'ghosttrain1', needs: ['m3log'] }] }, async (J, n) => {
    if (!J.flag('m3harlanfree')) {
      await J.say(['That book. That\'s... that\'s Oswin\'s log. I\'d know his chicken-scratch anywhere.', 'Give it here. Please.'], n);
      J.take('m3log');
      await J.say(['Harlan reads by the light of the halt\'s old lamp. His hands are shaking.', '"11:58. Hollow Cut signal GREEN. Waved to H. in the box - he waved back, the old goat."', '"11:59. White light ahead, bright as a lighthouse. Figures by the track in long coats. The line is - "']);
      await J.say(['Green. It was green. I didn\'t... it wasn\'t me.', 'Twenty years. Twenty years I carried that. And it was green.'], n);
      await J.say(['Somebody was on the line that night. Somebody with a light.', 'Thank you, kid. Here - it\'s not much. The Rail Board\'s apology money. I never could spend it.'], n);
      await J.give('revive', 2);
      J.money(3000);
      await J.say('You received ¥3000 from Harlan.');
      J.set('m3harlanfree');
      return J.say('If you see Oswin again... tell him I read it. Tell him I know.', n);
    }
    if (await J.ask(J.flag('m3halerest') ? 'The Express still comes at midnight, for anyone who wants it. Ride it again?' : 'Tell Oswin I read it? The train comes at midnight. Ride it?', ['Wait for it', 'Not now'], n) !== 0) return J.say('I\'ll be at home tonight, I think. For once. Well. After a bit.', n);
    await ride(J);
    return board(J);
  });
  on('m3bench', {}, J => J.say(J.flag('m3harlanfree') ? 'The old halt bench. Somebody has carved "H + O" into the armrest, a long time ago.' : 'The old halt bench, worn smooth by twenty years of one old man waiting.'));

  // ---- aboard the Lantern Express
  on('m3pass1', {}, (J, n) => J.say(J.flag('m3halerest') ? 'The conductor got off. Do you think... we could get off too? One day?' : ['We\'ll be in Mossgrove by morning. My daughter will meet me at the station.', 'It\'s been a long night. Such a long night.'], n));
  on('m3pass2', {}, (J, n) => J.say(['Did you see the light outside? So bright. Like a lighthouse in the middle of the woods.', 'The conductor went to see. He hasn\'t come back. He always comes back.'], n));
  on('m3pass3', {}, (J, n) => J.say(['Mum says if I\'m good I can have a lantern of my own when we get home.', 'Are we home yet? Are we nearly home?'], n));
  on('m3sacks', {}, J => J.say('Mail sacks, stamped LANTERN EXPRESS - WILDHEART POST. One hook on the wall is empty. A sack is missing.'));
  on('m3punch', {}, J => J.say('The conductor\'s fold-down desk: a ticket punch, a pocket watch stopped at 11:59, and an empty space where a logbook should be.'));
  on('m3grey', { needs: ['c3train', '!m3grey'], sets: ['m3grey'] }, async J => {
    if (J.flag('m3grey')) return;
    await J.say(['The train has stopped. You didn\'t feel it stop.', 'Through the door\'s window: the same halt, the same bench, the same old lamps...', '...but everything is grey. Rain hangs in the air outside, every drop perfectly still. Nothing moves.']);
    await J.say([`${sp(J)} presses against your leg, trembling. Then it goes still too - and growls at the platform.`, 'Someone is standing out there. A girl in grey.']);
    J.set('m3grey');
  });
  on('m3hale', { needs: ['c3train'], sets: ['m3hale'] }, async (J, n) => {
    if (J.flag('m3hale')) return J.say(J.flag('m3log') ? 'You found it? Then go! Show Harlan! The tickets can wait. ...They\'ve waited twenty years.' : 'My log. The signal box at Hollow Cut. Find it - and show Harlan.', n);
    await J.say(['Tickets, please! Tickets!', '...Oh. You\'re not one of mine, are you? You\'re warm. Nobody\'s been warm on this train in a very long time.'], n);
    if (J.has('m3ticket')) await J.say(['A ticket! A good one, unpunched. Ha! Click. There you are, valid for one journey.', 'Oswin Hale, conductor of the Lantern Express. Thirty years on the line. Well. Thirty years and one night.'], n);
    else await J.say('Oswin Hale, conductor of the Lantern Express. Thirty years on the line. Well. Thirty years and one night.', n);
    await J.say(['It\'s always 11:59 on this train. Always the moment we reached Hollow Cut.', 'And I know what they\'ll say back home. They\'ll blame Harlan. They\'ll say he set the signal wrong.'], n);
    await J.say(['It was GREEN. I saw it myself, I waved to him in the box. There was something else on the line - a light, white as a lighthouse.', 'I wrote it all down. My logbook - I took it to the signal box, to show Harlan... and then...', 'Please. Find my log. It must still be in the box. Show them it wasn\'t him.'], n);
    J.set('m3hale');
  });
  on('m3haleRest', { needs: ['m3harlanfree'], sets: ['m3halerest'] }, async (J, n) => {
    await J.say(['Harlan read it? He knows it was green? ...He said that? "Tell Oswin I know"?', 'Ha. Ha! The old goat. I owe him a game of chess.'], n);
    await J.say(['Do you know, I don\'t think I need to check any more tickets.', 'It\'s always 11:59 on this train. I think it\'s time somebody let it be midnight.'], n);
    await J.say('Take this. A conductor\'s trick for dealing with rowdy passengers. Ghosts, mostly.', n);
    await J.give('tm:hex');
    await J.fade(() => { J.hideNpc('hale2'); J.set('m3halerest'); });
    await J.say(['Where the conductor stood, there\'s only a punched ticket, drifting slowly to the floor.', 'Somewhere far away, a pocket watch ticks once: midnight.']);
  });

  // ---- the Echo: Nell
  on('m3nell', { needs: ['m3grey'], sets: ['nellmet', 'echo'] }, async (J, n) => {
    if (!J.flag('nellmet')) {
      await J.say(['...You\'re warm.', 'Nobody here is warm. Nobody here moves, except me. And Wick.'], n);
      await J.say('A small Litwick bobs out from behind her, its flame a cold, pale blue. It looks you up and down and flickers, pleased.');
      await J.say(['You... saw me, didn\'t you? In the water. By all the lamps.', 'I see them sometimes. Thousands of lamps, very far away, through the still places. They pull. Like a tide.'], n);
      await J.say(['Who am I? ...I don\'t know. I\'ve been here a long time. I think. Time doesn\'t really go, here.', 'Wick calls me Nell. So I\'m Nell.'], n);
      await J.say(['This is the Echo. Everything that gets lost ends up here. Days. Trains. People.', 'You shouldn\'t stay. The grey gets into you if you stay.'], n);
      await J.say(['See the old stone lantern, just up there? The Lantern-folk made them, before the lighthouses.', 'Touch one and think of where you came from, and it\'ll take you back. There\'s one on each side of the cut.'], n);
      J.set('nellmet'); J.set('echo');
      await J.say('(You can use Echo Shrines now: face an old stone lantern and press A to cross between Meridia and the Echo.)');
      return J.say('Will you come back? ...Nobody ever comes back.', n);
    }
    if (J.flag('ch4')) return J.say(J.pick([['You came back! Nobody ever comes back. You keep doing it.', 'Wick saved you a raindrop. It\'s been hanging in the air right there for ages.'], ['There was a man in the water last night. Very far away. White coat, gold scarf. He looked so sad.', 'I don\'t know why I told you that.']]), n);
    return J.say(['The shrine is just up the platform. Go home, before the grey gets into you.', 'Wick says you\'ll come back. Wick is usually right. Wick is a candle, though.'], n);
  });
  on('m3greyBoy', {}, (J, n) => J.say(['I\'m playing tag! I\'m it. I\'ve been it forever.', 'Nobody ever runs. Will you run? Please run.'], n));
  on('m3express', {}, J => J.say('The Lantern Express, engine 1159. Grey paint, grey brass, grey lamps. Through the windows, passengers sit perfectly still. The door is open.'));
  on('m3levers', {}, J => J.say('The signal levers of Hollow Cut. The one marked "UP MAIN - CUT" is pulled all the way to GREEN.'));
  on('m3logDesk', { needs: ['m3hale'], sets: ['m3log'] }, async J => {
    if (J.flag('m3log')) return J.say('Harlan\'s old desk. A cold mug of grey tea, and a grey chessboard, mid-game.');
    if (!J.flag('m3hale')) return J.say('Harlan\'s old desk. A logbook lies open on it, its pages grey and stiff. It isn\'t yours to take. Not yet.');
    await J.say(['On the signalman\'s desk lies a logbook stamped LANTERN EXPRESS - CONDUCTOR.', 'It\'s grey, like everything here. But when you pick it up, the ink is black.']);
    await J.give('m3log');
    J.set('m3log');
    await J.say('(Conductor Hale\'s log. Signalman Harlan should read it - he\'s waiting at the halt, back in the real world.)');
  });
  on('m3mailbag', { needs: ['c3train'], sets: ['m3letter1'] }, async J => {
    if (J.flag('m3letter1')) return J.say('The spilled mail sack. The other letters are grey dust now. Maybe there are more whole ones, somewhere else in the Echo.');
    await J.say(['A mail sack lies split open across the track: WILDHEART POST - LANTERN EXPRESS.', 'The letters inside crumble to grey dust at your touch. All but one.']);
    await J.say('The envelope is grey at the edges, but the address is clear: "To Wendell Marsh, Grand Canal Row, Brassport."');
    await J.give('m3letter1');
    J.set('m3letter1');
  });

  // ---- back in the real world: Professor Okafor at Hollow Cut
  on('m3okafor', { needs: ['nellmet'], sets: ['m3okpale', 'ch4'] }, async (J, n) => {
    await J.say(['{NAME}! There you are - you just stepped out of thin air! Out of that old stone lantern!', 'My drift meter went mad at midnight. Twenty years of drift, all at once, right here on this line.'], n);
    await J.say(['You rode the Express. Into a grey place. And you met... a girl? In grey, with a Litwick?', 'Did she - did she tell you her name?'], n);
    await J.say('...');
    await J.say(['Nell.', '...No. No, it\'s nothing. It\'s a common name. A very common name.'], n);
    await J.say([`${sp(J)} tilts its head at the Professor. Her hands are shaking.`]);
    await J.say(['Listen to me. These stone lanterns - the Lantern-folk built them, long before the lighthouses.', 'Their ruins are in the Wildheart, past Mossgrove. If anyone ever understood the Echo, it was them.'], n);
    await J.say(['The old line runs north to Mossgrove, but Hollow Cut has been buried for twenty years.', '...But you said the cut stands open in the Echo. Then cross there, and come back out on the far side.'], n);
    await J.say(['I\'ll meet you in Mossgrove. I need to... look at some old notes first.', 'And {NAME}. Be careful in there. Please.'], n);
    J.set('m3okpale');
    await J.chapter('Chapter 3 complete!', 'Next: Chapter 4 - The Wildheart');
    J.set('ch4'); J.refresh();
    await J.chapter('Chapter 4', 'The Wildheart');
  });

  // ---- the side stories' last steps
  on('m3gideon', { needs: ['m3harlanfree'], sets: ['m3gideontold'] }, async (J, n) => {
    if (J.flag('m3gideontold')) return J.say(['Apprentice G. All in order. Good lad.', 'I keep reading it. I can\'t remember that night. But I did my job.'], n);
    await J.say(['Harlan showed me the log. He came all the way to the Light at dawn, banging on the door like the harbour was on fire.', 'Look - here, the second-to-last page.'], n);
    await J.say('"11:40. Departed Brassport. Apprentice G. checked the lamps and brakes. All in order. Good lad."');
    await J.say(['That\'s me. Apprentice G. Twenty years I\'ve wondered if I missed something. A loose bolt. A dim lamp.', 'I still can\'t remember that night. But I did my job. ...Thank you, {NAME}.'], n);
    await J.say(['"White light ahead. Figures in long coats." Lighthouse-bright, on a railway line in the woods.', 'Somebody was out there with a light. I\'d very much like to know who.'], n);
    J.set('m3gideontold');
  });
  on('m3wendell', { needs: ['m3letter1'], sets: ['m3mail1'] }, async (J, n) => {
    if (J.flag('m3mail1')) return J.say(['"Be good for Grandma. I love you to the moon and back."', 'I remember her voice now. Isn\'t that strange? I read it, and I could hear her.'], n);
    await J.say('A letter? For me? From... where did you get this? The paper\'s gone all grey.', n);
    J.take('m3letter1');
    await J.say(['Wendell opens it carefully. His hands are shaking.', '"My darling Wendell. I\'m writing this on the train - the conductor says we\'ll post it in Mossgrove. Be good for Grandma.', 'I\'ll be home by Founder\'s Day with a Wildheart shell for your collection. I love you to the moon and back. - Mum"']);
    await J.say(['...Founder\'s Day. She was coming home for Founder\'s Day.', 'I was six. I don\'t remember her voice. I... wait. I do. I DO. "To the moon and back." She always said that.'], n);
    await J.say(['Thank you. I don\'t know how you found this. I don\'t think I want to know.', 'Here - my old lamp-oiler\'s kit. I\'ve no lamps left to tend. Maybe you\'ll find something in the dark worth lighting.'], n);
    await J.give('fullheal', 2);
    await J.give('ultra', 2);
    J.set('m3mail1');
    await J.say('(The Last Mail Route: one letter delivered. There may be more lost letters in the Echo.)');
  });

  for (const id of ['railyard', 'm3station', 'm3maud', 'oldrail', 'echo_oldrail', 'm3signalbox', 'ghosttrain1', 'ghosttrain2']) M[id].chapter = 3;
  chapter({ n: 3, title: 'The Ghost Train', start: { map: 'brassport_n', x: 36, y: 13, dir: 'right' }, level: 20, badge: null, center: 'm3station',
    goals: ['m3legend', 'c3train', 'm3grey', 'nellmet', 'echo', 'm3okpale', 'ch4'] });
})();
