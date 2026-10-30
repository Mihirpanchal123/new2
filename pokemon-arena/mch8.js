'use strict';
// =====================================================================
//  JOURNEY II - Chapter 8: Juno's Choice. North of Brassport the land
//  goes white. Juno brings you a key from the Lamplighter - the old
//  master key of the Eight Lights - and books you both into the inn at
//  Highwatch, the mountain town under Frostcrown. In the night Cassius
//  Vale comes to see her: the key for her fading brother's life. By
//  morning she is gone, and so is the key. The rain battle on Frost
//  Pass; then Warden Rhoswen's Crown Light (Dragon).
//  Side story: The Forgotten Champion (old Bram of Highwatch) starts
//  here; it ends in Chapter 10 (mch10.js).
//  Plan: docs/journey2/world.md · story: docs/journey2/story.md
// =====================================================================
(() => {
  const { def, grid, L, center, mart, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m8bram: { hat: null, hair: 0xe8e8e8, hairStyle: 'short', top: 0x8a2a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a2a1e, bag: null, scarf: 0xffd84a, skin: '#c89a7a' },
    m8fen: { hat: 'beanie', hatColor: 0x8a2a3a, hatFront: 0xffd84a, hair: 0xe0b030, hairStyle: 'pigtails', top: 0xe8dcc0, sleeves: 'long', inner: 0x8a2a3a, legs: 0x5a4a3a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null },
    m8courier: { hat: 'cap', hatColor: 0xf07a30, hatFront: 0xffffff, hair: 0x3a2a1e, hairStyle: 'short', top: 0x2d9a8a, sleeves: 'long', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'pants', shoes: 0xf07a30, bag: 0x8a5a30 },
    m8innkeep: { hat: null, hair: 0x9a5a2a, hairStyle: 'long', top: 0x7a4a2a, sleeves: 'long', inner: 0xf4e8d0, legs: 0x5a3a2a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null, scarf: 0xd85030 },
    m8tamer: { hat: null, hair: 0x2a2a3a, hairStyle: 'spiky', top: 0x4a68b0, sleeves: 'none', inner: 0xd8b058, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0x2a2a34, bag: null, scarf: 0xd85030 },
    m8tamerf: { hat: null, hair: 0x7a2a2a, hairStyle: 'long', top: 0x4a68b0, sleeves: 'none', inner: 0xd8b058, legs: 0x2a3a5a, legStyle: 'skirt', shoes: 0x2a2a34, bag: null, scarf: 0xd85030 }
  });

  // ---- items
  Object.assign(ITEMS, {
    m8key: { name: 'Lighthouse Key', pocket: 'key', price: 0, desc: 'An old iron key, warm as a hand. The Lantern-folk\'s master key to the Eight Lights, sent by the Lamplighter: "Keep it with the one the Lost Days can\'t touch."' },
    m8note: { name: 'Juno\'s Note', pocket: 'key', price: 0, desc: 'A courier receipt, folded once. On the back, in Juno\'s fast handwriting: "Delivered. By morning. I\'m sorry. - J"' },
    m8ballA: { name: 'Faded Poké Ball (A)', pocket: 'key', price: 0, desc: 'An old Poké Ball, its paint worn to the metal. Something warm and patient sleeps inside. Old Marta of the Coldfields kept it safe.' },
    m8ballB: { name: 'Faded Poké Ball (B)', pocket: 'key', price: 0, desc: 'An old Poké Ball, cold from the lake ice. Something huge and restless sleeps inside. Old Henrik pulled it from the ice on Frost Pass.' },
    m8ballC: { name: 'Faded Poké Ball (C)', pocket: 'key', price: 0, desc: 'An old Poké Ball that smells faintly of fish and thunderstorms. Something gentle sleeps inside. The hermit of Frostcrown kept it.' }
  });
  ITEMS['tm:dragon-pulse'] = ITEMS['tm:dragon-pulse'] || { name: 'TM Dragon Pulse', pocket: 'tms', price: 0, tm: 'dragon-pulse', desc: 'Teaches Dragon Pulse: a shock wave from the mouth of a dragon.' };
  ITEMS['tm:icy-wind'] = ITEMS['tm:icy-wind'] || { name: 'TM Icy Wind', pocket: 'tms', price: 0, tm: 'icy-wind', desc: 'Teaches Icy Wind: a chilling gust that also lowers the foe\'s Speed.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m8fields: 'Juno brought me a LIGHTHOUSE KEY from the Lamplighter: the old master key of the Eight Lights. "Keep it with the one the Lost Days can\'t touch."',
    m8innJuno: 'At the inn, Juno asked: "If you could keep one day forever, which would it be?" She didn\'t say hers.',
    junobetray: 'The key is gone. So is Juno. Cassius came to her in the night: the key for Teo. Her note: "Delivered. By morning. I\'m sorry."',
    junofight: 'I beat Juno in the rain on Frost Pass, and she still ran up the mountain to Cassius. Warden Rhoswen saw it all from the Crown Light.',
    'badge.crown': 'Warden Rhoswen: the Great Lantern\'s crown is a Lantern-folk lock. With our key, Cassius can light it. Her Dragons cleared the road to Frostcrown.',
    m8champ: 'Fen of Highwatch: her grandpa Bram was Champion of Meridia, forty years ago. He doesn\'t remember. His old team scattered: the Coldfields hut, the ice on Frost Pass, the caves of Frostcrown.'
  });

  // ---- trainers
  const rsOf = J => J.get('rivalStarter') || 'eevee';
  Object.assign(TRAINERS, {
    // the Coldfields
    m8brann: { team: [['graveler', 38], ['sandslash', 38], ['onix', 39]], pay: 22, theme: 'forest', before: 'The road north gets steep, kid. Let\'s see if your legs - and your team - can take it!', lose: 'Rolled right down the hill...', after: 'Highwatch is up the road. Best stew in the north, and the windiest beds.' },
    m8lotte: { team: [['swablu', 38], ['sneasel', 39]], pay: 22, theme: 'forest', before: 'Fresh powder, fresh battle! Wheee!', lose: 'Wiped out!', after: 'The snow\'s come down early this year. Like the mountain\'s holding its breath.' },
    m8pax: { team: [['corvisquire', 38], ['electrike', 38], ['staravia', 39]], pay: 26, theme: 'forest', look: 'm8courier', name: 'Courier Pax', before: 'Brassport Express, fastest wings in the north! Reyes Couriers? Never heard of \'em. Battle!', lose: 'Okay, okay. I\'ve heard of \'em.', after: 'Juno Reyes ran past an hour ago and didn\'t even stop to mock my uniform. Is she sick?' },
    m8lk1: { team: [['golbat', 39], ['lampent', 40]], pay: 32, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'Oh dear. You\'re the Tidemark child. I\'m so sorry - I\'ve been told to stop you, politely.', lose: 'Politely defeated. That\'s fair.', after: 'We\'re only surveying the road for the Great Lantern\'s supply carts. Honestly.' },
    m8lk2: { team: [['doublade', 40], ['houndoom', 40]], pay: 32, theme: 'forest', look: 'keeperf', name: 'Lightkeeper', before: 'The Great Lantern is almost ready. Isn\'t it exciting? I\'m afraid I can\'t let you near it.', lose: 'I\'m terribly sorry for being in your way.', after: 'Mr. Vale says once it\'s lit, nobody will ever lose anything again. My grandmother forgets my name. I\'d like her to stop.' },
    // Frost Pass
    m8sten: { team: [['glalie', 40], ['sealeo', 40], ['abomasnow', 41]], pay: 22, theme: 'icecave', look: 'hiker', name: 'Hiker Sten', before: 'Nobody crosses Frost Pass without a proper fight. It\'s tradition!', lose: 'Tradition upheld. Badly.', after: 'The Lumen people shut the top of the pass. Polite as you like. Wouldn\'t budge.' },
    m8kira: { team: [['froslass', 40], ['weavile', 41]], pay: 22, theme: 'icecave', look: 'c7boarder', name: 'Boarder Kira', before: 'Board, snow, battle. In that order. Mostly.', lose: 'Face-plant!', after: 'Did you see the lights up on the summit last night? Gold. Like a second sun trying to rise.' },
    m8wynd: { team: [['gabite', 40], ['vibrava', 41]], pay: 26, theme: 'icecave', look: 'm8tamer', name: 'Tamer Wynd', before: 'I train under Warden Rhoswen. Dragons don\'t mind the cold - do yours?', lose: 'Rhoswen would laugh at me. Kindly. Then very loudly.', after: 'Dragon moves hit Dragons hard. Ice too. The Warden knows it - and her Dragons hit back harder.' },
    m8ola: { team: [['snover', 40], ['glaceon', 41]], pay: 22, theme: 'icecave', look: 'c7skier', name: 'Skier Ola', before: 'I came up for the view and stayed for the battles!', lose: 'Downhill all the way...', after: 'The rain\'s turning to sleet up here. Bundle up!' },
    // the Crown Light: Warden Rhoswen's gym
    m8g1: { team: [['gabite', 42], ['shelgon', 42]], pay: 26, theme: 'icecave', look: 'm8tamer', name: 'Tamer Bryn', before: 'The Crown Light burns over the whole north. Earn your way up to it!', lose: 'Clipped my wings...', after: 'Rhoswen\'s Dragons are proud. Hit them with Ice, Dragon or Fairy moves.' },
    m8g2: { team: [['dragonair', 42], ['vibrava', 43]], pay: 26, theme: 'icecave', look: 'm8tamerf', name: 'Tamer Odile', before: 'Rhoswen says a Dragon reflects its trainer. Show me your reflection!', lose: 'I see... a winner.', after: 'Her Haxorus is the scariest thing on this mountain. And I\'ve seen the Lumen bills.' },
    m8g3: { team: [['sliggoo', 43], ['zweilous', 43], ['altaria', 43]], pay: 26, theme: 'icecave', look: 'm8tamer', name: 'Tamer Corvo', before: 'Last guard before the lamp room! She\'s waiting. She\'s been waiting since you came down that pass.', lose: 'Go on up. Make it count.', after: 'She saw the rain battle. She doesn\'t pity people. She trains them.' },
    rhoswen: { team: [['altaria', 42], ['flygon', 43], ['noivern', 43], ['drampa', 44], ['haxorus', 45]], pay: 110, theme: 'icecave', gym: 7, onWin: 'm8rhoswenWin', look: 'rhoswen', name: 'Warden Rhoswen', before: 'Your friend chose. Now you choose: give up, or climb. Show me which with your team!', lose: 'Ha! There it is. The look of someone who climbs.', after: 'Frostcrown\'s caves come out under the summit. Climb, and bring that girl home.' }
  });

  // =====================================================================
  //  The Coldfields - the frosted road north of Brassport. The grass goes
  //  white halfway up; the Lumen Company surveys the way for its carts.
  // =====================================================================
  {
    const B = grid(40, 30, '.').border('p', { s: [18, 20], n: [23, 25] }, 1);
    B.fill(1, 1, 38, 12, 'n');                                            // the north half lies under snow
    B.fill(1, 22, 16, 28, 'p').fill(22, 22, 38, 28, 'p');                 // the south road between the pines
    B.fill(18, 13, 20, 28, ',').fill(8, 11, 25, 13, ',').fill(23, 0, 25, 11, ',').fill(8, 10, 8, 11, ',');
    B.fill(2, 14, 11, 20, ';').fill(27, 15, 37, 20, ';').fill(3, 2, 9, 4, ';');
    B.fill(13, 15, 15, 17, 'p').fill(22, 17, 25, 20, 'p').fill(13, 2, 16, 5, 'p').fill(36, 1, 38, 4, 'p').fill(1, 6, 3, 9, 'p');
    B.fill(29, 2, 35, 6, 'i').fill(31, 3, 33, 5, '~');                     // a frozen pond
    B.fill(29, 9, 35, 10, 'h');                                           // the Lumen survey camp
    B.put(12, 19, 'r').put(26, 14, 'r').fill(19, 5, 20, 6, 'r').put(10, 16, 'r').put(36, 13, 'r');
    def({ id: 'coldfields', name: 'The Coldfields', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 36, max: 39, table: [['snover', 18], ['swablu', 14], ['phanpy', 12], ['sneasel', 12], ['rufflet', 10], ['vullaby', 10], ['corvisquire', 10], ['sandshrew', 8], ['donphan', 6]] },
        snow: { rate: 0.07, min: 37, max: 40, table: [['snorunt', 30], ['snover', 22], ['spheal', 18], ['sneasel', 14], ['swablu', 10], ['glalie', 6]] } },
      edges: { s: { to: 'brassport_n', dx: 0 }, n: { to: 'highwatch', dx: -10 } },
      buildings: [{ b: 'house3', x: 6, y: 6, to: 'm8hut' }],
      signs: [{ x: 21, y: 27, text: 'THE COLDFIELDS\nNorth: Highwatch, under Frostcrown. South: Brassport.' }, { x: 21, y: 6, text: 'THE COLD CAIRN\nRaised by the Lantern-folk. "Here the light watches the north."' },
        { x: 10, y: 9, text: 'MARTA\'S REST HUT\nHot tea. Warm beds. No Lumen lanterns, thank you.' }, { x: 28, y: 11, text: 'LUMEN COMPANY - GREAT LANTERN SUPPLY ROAD SURVEY\nWe apologise for any inconvenience.' }],
      props: [{ k: 'lumenlamp', x: 29, y: 8 }, { k: 'lumenlamp', x: 35, y: 8 }, { k: 'lumenlamp', x: 22, y: 12 }],
      zones: [{ x: 17, y: 26, w: 5, h: 1, event: 'm8junoFields' }],
      items: [{ x: 2, y: 11, item: 'ultra', n: 2 }, { x: 16, y: 9, item: 'iceheal', n: 2 }, { x: 3, y: 21, item: 'superpotion', n: 2 }, { x: 37, y: 7, item: 'revive', n: 1 },
        { x: 37, y: 12, item: 'rarecandy', n: 1, hidden: true }, { x: 34, y: 14, item: 'great', n: 3, hidden: true }, { x: 30, y: 7, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'juno', x: 19, y: 23, dir: 'down', look: L.juno, name: 'Juno', talk: 'm8junoFields', show: ['!m8fields'] },
        { id: 'brann', x: 16, y: 19, dir: 'right', look: L.hiker, name: 'Hiker Brann', trainer: 'm8brann' },
        { id: 'pax', x: 5, y: 13, dir: 'right', look: L.m8courier, name: 'Courier Pax', trainer: 'm8pax' },
        { id: 'lotte', x: 21, y: 9, dir: 'right', look: L.c7skier, name: 'Skier Lotte', trainer: 'm8lotte' },
        { id: 'lk1', x: 30, y: 11, dir: 'left', look: L.keeper, name: 'Lightkeeper', trainer: 'm8lk1' },
        { id: 'lk2', x: 34, y: 11, dir: 'down', look: L.keeperf, name: 'Lightkeeper', trainer: 'm8lk2' },
        { id: 'walker', x: 26, y: 5, dir: 'left', look: L.oldman, name: 'Cairn Walker', talk: 'm8cairn' }] });
  }
  def({ id: 'm8hut', name: 'Marta\'s Rest Hut', kind: 'inside', outside: 'coldfields', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'stove', x: 1, y: 1, talk: 'm8stove' }, { k: 'bed', x: 7, y: 1, talk: 'm8hutBed' }, { k: 'shelf', x: 3, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'plant', x: 1, y: 5 }],
    npcs: [{ id: 'marta', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Old Marta', talk: 'm8marta' }] });

  // =====================================================================
  //  Highwatch - the mountain town under Frostcrown: the Crown Light (Warden
  //  Rhoswen), an inn, a courier office, and an overlook on the summit
  // =====================================================================
  {
    const B = grid(30, 26, 'n').border('p', { s: [13, 15], e: [12, 14], w: [18, 20] }, 1);
    B.fill(13, 3, 15, 25, 'u').fill(15, 12, 29, 14, 'u').fill(0, 18, 13, 20, 'u');      // the high street, the coast road, the pass road
    B.fill(8, 1, 20, 2, 'u');                                                         // the overlook
    B.fill(3, 8, 12, 9, 'u').fill(16, 8, 20, 9, 'u').fill(25, 10, 25, 11, 'u');           // lanes to the doors
    B.fill(3, 17, 6, 17, 'u').fill(9, 17, 11, 17, 'u').fill(16, 20, 21, 21, 'u');
    B.fill(1, 1, 6, 2, 'p').fill(22, 1, 28, 1, 'p').fill(23, 16, 28, 18, 'p').fill(2, 22, 10, 24, 'p').fill(19, 23, 28, 24, 'p');
    B.fill(17, 11, 21, 11, '*').fill(23, 20, 28, 21, '*').fill(4, 21, 9, 21, '*');
    def({ id: 'highwatch', name: 'Highwatch', kind: 'town', rows: B.rows(), music: 'town', battle: 'icecave', fly: { x: 14, y: 22 }, chapter: 8,
      buildings: [{ b: 'house', x: 2, y: 4, to: 'm8bram', variant: 4 }, { b: 'house2', x: 8, y: 4, to: 'm8house' }, { b: 'house3', x: 17, y: 4, to: 'm8courier' },
        { b: 'lighthouse', x: 23, y: 3, to: 'crowngym', variant: 6, needs: ['junofight'], locked: 'm8gymLocked' },
        { b: 'center', x: 2, y: 12, to: 'm8center' }, { b: 'mart', x: 8, y: 13, to: 'm8mart' }, { b: 'house3', x: 17, y: 16, to: 'm8inn' }],
      signs: [{ x: 12, y: 23, text: 'HIGHWATCH\nThe last town under Frostcrown. Mind the wind.' }, { x: 22, y: 10, text: 'THE CROWN LIGHT\nWarden: RHOSWEN\nThe seventh of the Eight Lights. It watches the whole north.' },
        { x: 16, y: 19, text: 'THE SLEEPING DRAGON INN\nWarm beds, hot stew, no questions.' }, { x: 22, y: 7, text: 'REYES COURIERS - HIGHWATCH OFFICE\n"Anything, anywhere, by morning."' },
        { x: 7, y: 2, text: 'THE OVERLOOK\nOn a clear night you can see the Great Lantern on the summit.' }, { x: 1, y: 17, text: 'WEST: FROST PASS\nThe old road up to Frostcrown.' }],
      props: [{ k: 'lamp', x: 12, y: 11 }, { k: 'lamp', x: 16, y: 15 }, { k: 'lumenlamp', x: 12, y: 15 }, { k: 'lumenlamp', x: 16, y: 10 }, { k: 'lumenlamp', x: 22, y: 15 },
        { k: 'lamp', x: 9, y: 3 }, { k: 'lamp', x: 19, y: 3 }, { k: 'mailbox', x: 7, y: 7 }, { k: 'mailbox', x: 22, y: 8 }],
      edges: { s: { to: 'coldfields', dx: 10 }, w: { to: 'frostpass', dy: 10 }, e: { to: 'ashencoast', dy: 0, needs: ['ch12'] } },
      items: [{ x: 27, y: 2, item: 'ultra', n: 1 }, { x: 1, y: 10, item: 'revive', n: 1, hidden: true }, { x: 28, y: 15, item: 'rarecandy', n: 1, hidden: true }],
      npcs: [{ id: 'gazer', x: 17, y: 2, dir: 'up', look: L.oldlady, name: 'Stargazer Ilka', talk: 'm8gazer' },
        { id: 'kid', x: 10, y: 11, dir: 'down', look: L.kid, name: 'Dax', wander: 2, talk: 'm8kid' },
        { id: 'lumen', x: 11, y: 19, dir: 'down', look: L.keeperf, name: 'Lightkeeper', talk: 'm8townKeeper' },
        { id: 'guard', x: 27, y: 13, dir: 'left', look: L.worker, name: 'Road Crew', talk: 'm8coastRoad', show: ['!ch12'] },
        { id: 'man', x: 20, y: 13, dir: 'down', look: L.man, wander: 2, talk: 'm8townMan' }] });
  }
  center('m8center', 'highwatch', { chapter: 8 });
  mart('m8mart', 'highwatch', ['poke', 'great', 'ultra', 'potion', 'superpotion', 'fullheal', 'iceheal', 'burnheal', 'parlyzheal', 'awakening', 'revive', 'repel'], { chapter: 8 });
  M.m8mart.name = 'Highwatch Mart';
  // ---- the Sleeping Dragon Inn
  def({ id: 'm8inn', name: 'The Sleeping Dragon Inn', kind: 'inside', outside: 'highwatch', chapter: 8,
    rows: grid(13, 10, '_').border('#').fill(1, 9, 11, 9, '_').put(6, 9, 'm').fill(4, 5, 8, 7, 'R').rows(), arrive: { x: 6, y: 8 },
    furniture: [{ k: 'bed', x: 1, y: 1, talk: 'm8innBed' }, { k: 'bed', x: 3, y: 1, talk: 'm8junoBed' }, { k: 'stove', x: 6, y: 1, talk: 'm8hearth' }, { k: 'counter', x: 8, y: 3 },
      { k: 'shelf', x: 9, y: 1 }, { k: 'table', x: 5, y: 5 }, { k: 'chair', x: 4, y: 5 }, { k: 'sofa', x: 1, y: 7 }, { k: 'plant', x: 11, y: 8 }, { k: 'plant', x: 1, y: 5 }],
    npcs: [{ id: 'innkeep', x: 10, y: 2, dir: 'down', look: L.m8innkeep, name: 'Innkeeper Bo', talk: 'm8innkeep', counter: true },
      { id: 'juno', x: 6, y: 3, dir: 'up', look: L.juno, name: 'Juno', talk: 'm8innJuno', show: ['m8fields', '!junobetray'] },
      { id: 'guest', x: 9, y: 6, dir: 'left', look: L.hiker, name: 'Mountaineer Kesh', talk: 'm8guest' }] });
  // ---- Bram's house (The Forgotten Champion)
  def({ id: 'm8bram', name: 'Bram\'s house', kind: 'inside', outside: 'highwatch', chapter: 8, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'statue', x: 1, y: 1, talk: 'm8trophy' }, { k: 'shelf', x: 3, y: 1, talk: 'm8photos' }, { k: 'stove', x: 6, y: 1 }, { k: 'chair', x: 7, y: 3 }, { k: 'plant', x: 7, y: 5 }],
    npcs: [{ id: 'bram', x: 6, y: 3, dir: 'right', look: L.m8bram, name: 'Old Bram', talk: 'm8bram', show: ['!longnight'] },
      { id: 'fen', x: 2, y: 4, dir: 'right', look: L.m8fen, name: 'Fen', talk: 'm8fen' }] });
  def({ id: 'm8house', name: 'House', kind: 'inside', outside: 'highwatch', chapter: 8, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'm8tv' }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }, { k: 'plant', x: 7, y: 1 }],
    npcs: [{ id: 'mum', x: 6, y: 3, dir: 'left', look: L.woman, name: 'Saga', talk: 'm8saga' }, { id: 'dad', x: 1, y: 5, dir: 'right', look: L.man, name: 'Joran', talk: 'm8joran' }] });
  def({ id: 'm8courier', name: 'Reyes Couriers - Highwatch', kind: 'inside', outside: 'highwatch', chapter: 8, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'counter', x: 2, y: 3 }, { k: 'boxes', x: 1, y: 1 }, { k: 'boxes', x: 2, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'desk', x: 4, y: 1, talk: 'm8ledger' }, { k: 'plant', x: 7, y: 5 }],
    npcs: [{ id: 'dov', x: 4, y: 2, dir: 'down', look: L.m8courier, name: 'Clerk Dov', talk: 'm8dov', counter: true }] });

  // ---- the Crown Light: Warden Rhoswen's gym (the lamp room is the arena)
  def({ id: 'crowngym', name: 'The Crown Light', kind: 'inside', gym: true, outside: 'highwatch', battle: 'icecave', music: 'gym', chapter: 8,
    rows: grid(13, 12, 'g').border('#').fill(1, 11, 11, 11, 'g').put(6, 11, 'm').put(6, 1, '<').fill(1, 7, 4, 7, '#').fill(8, 7, 11, 7, '#').fill(1, 4, 3, 4, '#').fill(9, 4, 11, 4, '#').fill(5, 2, 7, 3, 'R').fill(5, 8, 7, 9, 'R').rows(),
    arrive: { x: 6, y: 10 },
    furniture: [{ k: 'statue', x: 4, y: 10, talk: 'm8gymStatue' }, { k: 'statue', x: 8, y: 10, talk: 'm8gymStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 11, y: 1 }],
    warps: [{ x: 6, y: 1, to: 'crowngym2', tx: 5, ty: 6, dir: 'up' }],
    npcs: [{ id: 'bryn', x: 3, y: 9, dir: 'right', look: L.m8tamer, name: 'Tamer Bryn', trainer: 'm8g1' },
      { id: 'odile', x: 9, y: 5, dir: 'left', look: L.m8tamerf, name: 'Tamer Odile', trainer: 'm8g2' },
      { id: 'corvo', x: 3, y: 2, dir: 'right', look: L.m8tamer, name: 'Tamer Corvo', trainer: 'm8g3' }] });
  def({ id: 'crowngym2', name: 'The Crown Light - Lamp Room', kind: 'inside', gym: true, battle: 'icecave', music: 'gym', chapter: 8,
    rows: grid(11, 9, 'g').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').rows(),
    furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm8lamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }],
    warps: [{ x: 5, y: 7, to: 'crowngym', tx: 6, ty: 2, dir: 'down' }],
    npcs: [{ id: 'rhoswen', x: 5, y: 2, dir: 'down', look: L.rhoswen, name: 'Warden Rhoswen', trainer: 'rhoswen', show: ['!longnight', '!wake.rhoswen'] }] });

  // =====================================================================
  //  Frost Pass - the old road west of Highwatch, up through the Narrows
  //  to the foot of Frostcrown (the Lumen Company keeps the top shut)
  // =====================================================================
  {
    const B = grid(20, 36, 'n').border('p', { n: [9, 11], e: [28, 30] }, 1);
    B.fill(9, 0, 11, 30, ',').fill(11, 28, 19, 30, ',');                       // the pass road
    B.fill(1, 10, 8, 16, 'p').fill(12, 10, 18, 16, 'p').put(9, 13, 'r').put(11, 13, 'r');   // the Narrows (one step wide at the neck)
    B.fill(1, 31, 18, 34, 'p').fill(2, 31, 7, 33, 'n').fill(3, 30, 6, 30, 'n');  // a sheltered hollow below the road
    B.fill(2, 20, 6, 23, 'i').fill(3, 21, 5, 22, '~');                           // the ice-fishing hole
    B.fill(13, 18, 17, 25, ';').fill(2, 26, 7, 27, ';').fill(14, 3, 17, 7, ';');
    B.fill(2, 3, 6, 6, 'i').put(7, 8, 'r').put(13, 9, 'r').put(1, 18, 'r').put(8, 24, 'r').put(18, 17, 'r').fill(16, 1, 18, 1, 'p').fill(1, 1, 3, 1, 'p');
    def({ id: 'frostpass', name: 'Frost Pass', kind: 'route', rows: B.rows(), music: 'route', battle: 'icecave', chapter: 8,
      encounters: { tall: { rate: 0.12, min: 38, max: 41, table: [['snover', 20], ['sneasel', 16], ['swablu', 12], ['noibat', 12], ['vullaby', 10], ['rufflet', 10], ['medicham', 10], ['altaria', 4], ['abomasnow', 6]] },
        snow: { rate: 0.06, min: 38, max: 41, table: [['snorunt', 26], ['spheal', 20], ['sealeo', 14], ['snover', 16], ['sneasel', 12], ['frigibax', 8], ['glalie', 4]] } },
      edges: { e: { to: 'highwatch', dy: -10 }, n: { to: 'frostcrown1', dx: 0, needs: ['ch9'] } },
      signs: [{ x: 13, y: 27, text: 'FROST PASS\nEast: Highwatch. North: Frostcrown (the Lumen Company apologises: CLOSED).' }, { x: 8, y: 17, text: 'THE NARROWS\nSingle file. Mind the drop.' }],
      items: [{ x: 17, y: 3, item: 'ultra', n: 2 }, { x: 2, y: 32, item: 'tm:icy-wind', n: 1 }, { x: 17, y: 26, item: 'superpotion', n: 2 }, { x: 2, y: 8, item: 'revive', n: 1 },
        { x: 6, y: 33, item: 'rarecandy', n: 1, hidden: true }, { x: 15, y: 9, item: 'fullheal', n: 2, hidden: true }, { x: 1, y: 25, item: 'great', n: 2, hidden: true }],
      npcs: [{ id: 'juno', x: 10, y: 13, dir: 'down', look: L.juno, name: 'Juno', talk: 'm8rain', watch: 'm8rain', sight: 3, show: ['junobetray', '!junofight'] },
        { id: 'gate', x: 10, y: 1, dir: 'down', look: L.keeper, name: 'Lightkeeper', talk: 'm8passGate', show: ['!ch9'] },
        { id: 'henrik', x: 4, y: 24, dir: 'up', look: L.fisher, name: 'Old Henrik', talk: 'm8henrik' },
        { id: 'sten', x: 7, y: 28, dir: 'right', look: L.hiker, name: 'Hiker Sten', trainer: 'm8sten' },
        { id: 'wynd', x: 12, y: 21, dir: 'left', look: L.m8tamer, name: 'Tamer Wynd', trainer: 'm8wynd' },
        { id: 'kira', x: 8, y: 6, dir: 'right', look: L.c7boarder, name: 'Boarder Kira', trainer: 'm8kira' },
        { id: 'ola', x: 13, y: 4, dir: 'left', look: L.c7skier, name: 'Skier Ola', trainer: 'm8ola' }] });
  }
  // the weather: Highwatch sits in the dusk on the night you arrive; the rain on Frost Pass the morning after (the
  // renderer reads dark every frame)
  const G = () => { try { return Journey._G().flags; } catch (e) { return {}; } };
  Object.defineProperty(M.highwatch, 'dark', { get() { const f = G(); return f.m8fields && !f.junobetray ? 0.18 : 0; }, configurable: true });
  Object.defineProperty(M.frostpass, 'dark', { get() { const f = G(); return f.junobetray && !f.junofight ? 0.22 : 0; }, configurable: true });

  // the Warden's place in town during the Long Night (Chapter 10)
  MMaps.SPOTS.rhoswen = { map: 'highwatch', x: 24, y: 11, dir: 'down' };

  // =====================================================================
  //  The story
  // =====================================================================
  const longNight = J => J.flag('longnight') && !J.flag('dawn');
  // ---- the Coldfields: Juno's delivery
  on('m8junoFields', { needs: ['!m8fields'], sets: ['m8fields'] }, async J => {
    if (J.flag('m8fields')) return;
    J.emote('juno', '!');
    await J.say(['{NAME}! Finally! I\'ve been freezing my tail off out here for an hour.', 'Reyes Couriers, special delivery. Signed for by the Lamplighter herself. For you.'], 'juno');
    await J.give('m8key');
    await J.say(['It\'s a key. An old one. Ada says it\'s the Lantern-folk\'s master key - it opens all eight Lights.', 'And the Great Lantern up on Frostcrown can\'t be lit without one. The Company\'s been asking every Warden in Meridia for theirs.',
      'Ada\'s note says: "Keep it with the one the Lost Days can\'t touch." That\'s you. Lucky you.'], 'juno');
    await J.say(['...', 'Teo didn\'t know my name this morning. For a whole minute. Then he laughed and said he was joking.', 'He wasn\'t joking, {NAME}.'], 'juno');
    await J.say(['Anyway! Highwatch is straight up the road. I booked us rooms at the inn - courier\'s expense account.', 'Don\'t tell Mom. Race you there! ...Okay, I\'ll just go. You\'re slow.'], 'juno');
    await J.walk('juno', ['up', 5]);
    await J.fade(() => J.hideNpc('juno'));
    J.set('m8fields');
  });
  on('m8cairn', {}, (J, n) => J.say(longNight(J) ? ['A perfect morning for a walk! Same as yesterday. Same as tomorrow, I hope!', 'Funny... I can\'t remember where I was walking to.'] : ['The Lantern-folk raised this cairn. They raised one on every road to Frostcrown.', 'My granny said they were "watching the north", like a guard watches a door. Something up there was never meant to open.'], n));
  on('m8marta', { needs: ['m8champ'], sets: ['m8ballA'] }, async (J, n) => {
    if (J.flag('m8ballA')) return J.say(longNight(J) ? 'Tea\'s on! Isn\'t it a lovely, lovely day? Nothing ever changes up here, and I\'m glad.' : 'You found where it belongs, then? Good. The hut\'s too quiet without it, but it was never mine.', n);
    if (!J.flag('m8champ')) return J.say(['Come in, come in, out of the cold! Sit by the stove. No lanterns here - I like my own fire, and my own memories.', 'If you need a rest, the bed\'s free. It\'s always free. Nobody comes up the Coldfields anymore.'], n);
    await J.say(['Bram? Old Bram of Highwatch? Why, I knew him when he was young and terrifying.', 'Thirty winters ago an Arcanine came scratching at my door, with a Poké Ball in its mouth. Grey in the muzzle even then.',
      'It\'s slept by my stove ever since. It goes back in its ball whenever strangers come. I always knew it was waiting for someone.'], n);
    await J.say('Take it home, dear. Tell it Marta says goodbye.', n);
    await J.give('m8ballA');
    J.set('m8ballA');
  });
  on('m8stove', {}, J => J.say(J.flag('m8ballA') ? 'A cast-iron stove. There\'s a warm, Arcanine-shaped dent in the rug in front of it.' : 'A cast-iron stove, roaring away. Something has worn a big round dent in the rug in front of it.'));
  on('m8hutBed', {}, async J => { await J.say('Marta\'s spare bed. You lie down for a short rest...'); await J.heal(true); await J.say('You and your Pokémon feel warm and rested.'); });

  // ---- Highwatch
  on('m8gymLocked', {}, J => J.say(J.flag('junobetray') ? 'The Crown Light\'s door is barred. A fresh note: "Up on the lamp, watching the pass. - R."' : 'The Crown Light\'s door is barred. A note is nailed to it: "Watching the summit lights tonight. Challengers at first light. - Rhoswen"'));
  on('m8gazer', {}, (J, n) => J.say(longNight(J) ? ['The comet! Look, dear, the comet! It comes once in a lifetime, and tonight it\'s mine!', 'Isn\'t it beautiful? ...Why is it grey?'] : J.flag('junofight') ? ['Gold lights on the summit every night now. Brighter each time.', 'The Lantern-folk built a lamp up there once, the stories say. Not to see by. To keep something asleep.'] : ['Every night this month, a gold light on the summit. Growing.', 'Highwatch has watched that mountain for nine hundred years. I don\'t like what it\'s watching back with.'], n));
  on('m8kid', {}, (J, n) => J.say(longNight(J) ? 'It\'s my birthday! Again! And I got a Dratini! Again! BEST DAY EVER! AGAIN!' : J.flag('badge.crown') ? 'You beat Warden Rhoswen?! Did her Haxorus roar? Did it? I bet it roared. RAAAWR.' : 'When I\'m big I\'m gonna be a Dragon Tamer like Warden Rhoswen. She rides a Flygon to the shops. To the SHOPS.', n));
  on('m8townKeeper', {}, (J, n) => J.say(longNight(J) ? ['Everything\'s lit now. Isn\'t it lovely? No one will ever lose anything again.', 'I\'m sorry - have we met? I feel as if we\'ve met. Many times.'] : ['Free lanterns! A gift from the Lumen Company! ...You don\'t want one? Most people do.', 'They\'re very good lanterns. You hardly notice what they take - oh! I mean, the oil. You hardly notice the oil.'], n));
  on('m8townMan', {}, (J, n) => J.say(longNight(J) ? 'My wedding day! Saga looks wonderful. I\'m going to marry her again this afternoon. And tomorrow. Isn\'t it grand?' : 'Wind\'s from the summit tonight. Smells like hot brass. Never smelled that up here before.', n));
  on('m8coastRoad', {}, (J, n) => J.say('The coast road east is buried in a rockslide. Ashen Coast\'s cut off till we dig it out - won\'t be soon, with half the crew working for the Lumen Company.', n));
  on('m8saga', {}, (J, n) => J.say(longNight(J) ? 'Joran\'s going to propose today. I just know it. I\'ve known it for... how long have I known it?' : ['Joran wants a Lumen lantern for the kitchen. Says everyone in Brassport has one.', 'I said: Highwatch has had candles for nine hundred years. We\'ll manage.'], n));
  on('m8joran', {}, (J, n) => J.say(longNight(J) ? 'Saga said yes! She said yes! ...Did she? She will. She does. Every day.' : 'Our boy Dax wants a Dratini for his birthday. Do you know what Dratini eat? Everything. Dratini eat everything.', n));
  on('m8tv', {}, J => J.say(longNight(J) ? 'The same broadcast, over and over: "...the Great Lantern is lit! A perfect day for all of Meridia!"' : 'The news: "The Great Lantern on Frostcrown is nearly finished, says Lumen founder Cassius Vale. \'Nothing will ever be lost again.\'"'));
  on('m8ledger', {}, J => J.say(J.flag('junobetray') ? 'The office ledger. The last line, in Juno\'s fast writing: "1 key - FROM: the Lamplighter - TO: (crossed out) - DELIVERED."' : 'The office ledger. Today\'s only line: "1 key - FROM: the Lamplighter - TO: {NAME} - courier: J. Reyes."'));
  on('m8dov', { travel: [{ map: 'tidemark', needs: ['longnight'] }] }, async (J, n) => {
    if (longNight(J)) {
      await J.say(['First day on the job! First day! Reyes Couriers - anything, anywhere, by morning!', 'Where to? Tidemark? The head office? Mrs. Reyes will love you! My Corviknight knows the way!'], n);
      if (await J.ask('Ride Dov\'s Corviknight to Tidemark?', ['Yes', 'Not now'], n) !== 0) return J.say('Come back any time! It\'s my first day - it\'s always my first day!', n);
      const t = M.tidemark;
      await J.say('Hold tight! Wheeee!', n);
      await J.travel('tidemark', t.fly.x, t.fly.y, 'down');
      return;
    }
    if (J.flag('junobetray')) return J.say(['Juno came through before dawn. Soaked. She signed the ledger and didn\'t say a word.', 'In five years she\'s never once not said a word. Is she all right?'], n);
    if (J.flag('m8fields')) return J.say(['You\'re {NAME}! Juno\'s friend! She\'s been here, she\'s been gone, she\'s been back - that girl moves like weather.', 'Our Corviknight carry parcels, not people. Company rules. Mrs. Reyes says people are too heavy and complain too much.'], n);
    return J.say('Reyes Couriers, Highwatch office. Parcels only - Corviknight don\'t do passengers. Company rules!', n);
  });

  // ---- the inn: Juno's choice
  on('m8innkeep', {}, async (J, n) => {
    if (J.flag('junobetray') && !J.flag('junofight')) return J.say(['Your friend? Left before dawn, in the rain. West, up toward Frost Pass.', 'She didn\'t even take her breakfast. I wrapped it up. Here - no, you\'re too worried to eat. Go.'], n);
    if (longNight(J)) return J.say('Welcome, welcome! Opening night of the Sleeping Dragon! Thirty years ago tonight! Or... tonight?', n);
    await J.say(J.flag('m8fields') && !J.flag('junobetray') ? 'Welcome to the Sleeping Dragon! Your friend booked two beds - the one by the window\'s yours. Rest whenever you like.' : 'Welcome to the Sleeping Dragon! A bed for the night?', n);
    if (await J.ask('Rest a while?', ['Yes, please', 'No, thanks'], n) !== 0) return;
    await J.fade(async () => { await J.heal(false); await J.wait(500); });
    await J.say('You and your Pokémon feel rested.');
  });
  on('m8guest', {}, (J, n) => J.say(longNight(J) ? 'Summit day! I\'m climbing Frostcrown today, at last! I can feel it - today\'s the day!' : J.flag('junofight') ? 'The Lumen guards at the top of Frost Pass let a girl through this morning. Bowed to her, even. Who IS she?' : ['I\'ve tried to climb Frostcrown for twenty years. This year the Lumen Company built a staircase to the top.', 'And put a door on it. And a guard on the door. Polite fellow. Wouldn\'t let me past.'], n));
  on('m8hearth', {}, J => J.say(J.flag('junobetray') ? 'The hearth has burned down to grey ash. Someone sat here a long time last night.' : 'A crackling hearth. A pair of orange courier gloves hangs drying on the fender.'));
  on('m8junoBed', {}, J => J.say(J.flag('junobetray') ? 'Juno\'s bed. It hasn\'t been slept in.' : 'Juno\'s bed. Her courier bag is on it, packed, as if she might have to leave in a hurry.'));
  // the night at the inn: Cassius comes to Juno (played from her talk, so the checker and the story agree on it)
  async function innNight(J) {
    const sp = J.get('mystarter');
    await J.say(['You lie down. The wind moans in the eaves. The fire pops.', 'You fall asleep with the key on its string around your neck.']);
    await J.fade(async () => { await J.wait(700); });
    await J.say(['...', 'Voices in the hallway. Low. One of them is Juno\'s.']);
    const cas = { name: 'Cassius', look: 'cassius' }, ju = { name: 'Juno', look: 'juno' };
    await J.say('Miss Reyes. Thank you for seeing me so late. I won\'t keep you long.', cas);
    await J.say('You\'ve got one minute. Then I wake {NAME} up and we throw you down the mountain.', ju);
    await J.say(['Your brother. Teo. Some mornings he doesn\'t know your name. Soon it will be every morning.', 'I lost a daughter, once. I know exactly what you are about to lose. And I can stop it.'], cas);
    await J.say(['When the Great Lantern is lit, nothing in Meridia is ever lost again. Not a day. Not a name.', 'Not a little boy who skips stones off a pier.'], cas);
    await J.say('...How do you know about that?', ju);
    await J.say(['I know a great many days, Miss Reyes. I have been collecting them.', 'I need only a key. Your friend\'s. It was yours to deliver, after all. Deliver it to me instead.'], cas);
    await J.say('And {NAME}? What happens to {NAME}?', ju);
    await J.say('Nothing bad. Nothing bad ever again. Everyone will simply be... happy.', cas);
    await J.say(['A long silence.', 'Then soft footsteps. Closer.', 'A careful hand at the string around your neck.', `${J.dname(sp || 'eevee')} whimpers in its sleep, and doesn't wake.`]);
    await J.fade(async () => { await J.wait(900); await J.heal(false); });
    J.take('m8key');
    await J.say(['Morning. Rain hammers on the roof.', 'The string around your neck is cut. The key is gone.', 'Juno\'s bed is empty. On your pillow, a folded courier receipt.']);
    await J.give('m8note');
    await J.say('"Delivered. By morning. I\'m sorry. - J"');
    J.set('junobetray'); J.refresh();
    await J.say(['Your friend? She left before dawn, in the rain. West, up toward Frost Pass.', 'She was crying. I thought you should know.'], { name: 'Innkeeper Bo', look: 'm8innkeep' });
  }
  on('m8innJuno', { needs: ['m8fields'], sets: ['m8innJuno', 'junobetray'] }, async (J, n) => {
    if (J.flag('junobetray')) return;
    if (!J.flag('m8innJuno')) {
      await J.say(['Hey. Sit. The fire\'s the only warm thing on this whole mountain.', 'Can I ask you something weird?'], n);
      await J.say(['If you could keep one day forever. Just one. Live it again and again, never lose a minute of it...', 'Which day would it be?'], n);
      await J.ask('Which day would you keep?', ['Lantern Night, with my partner', 'I wouldn\'t keep just one'], n);
      await J.say(['Yeah. Yeah, I figured you\'d say something like that.', 'Mine\'s easy. Last summer. Teo learned to skip stones off the pier. Seven skips. He told everyone in Tidemark. Twice.'], n);
      await J.say(['...Some people would do anything to keep a day like that, you know. Anything.', 'Anyway. Your bed\'s the one by the window. I\'ll sit up a bit.'], n);
      J.set('m8innJuno');
    }
    if (await J.ask('Turn in for the night?', ['Good night, Juno', 'Not yet'], n) !== 0) return J.say('Suit yourself. The fire\'s not going anywhere. Neither am I. ...Probably.', n);
    await J.say(['Night, {NAME}. Hey - thanks. For not asking.'], n);
    await innNight(J);
  });
  on('m8innBed', {}, async J => {
    if (J.flag('m8fields') && !J.flag('junobetray')) return J.say('Your bed, by the window. Juno is still sitting by the fire. Say good night to her first.');
    await J.say('You lie down for a short rest...'); await J.heal(true); return J.say('You and your Pokémon feel rested.');
  });

  // ---- Frost Pass: the rain battle
  on('m8passGate', {}, (J, n) => J.say(J.flag('junofight') ? ['Miss Reyes went up an hour ago. She had an appointment.', 'You don\'t, I\'m afraid. Terribly sorry. The summit is closed to the public.'] : ['Good day! Frostcrown is closed, I\'m afraid, until the Great Lantern is finished.', 'We do apologise. Would you like a complimentary lantern for the walk back?'], n));
  on('m8henrik', { needs: ['m8champ'], sets: ['m8ballB'] }, async (J, n) => {
    if (J.flag('m8ballB')) return J.say(longNight(J) ? 'Biggest fish of my life, today! Every day! Hah!' : 'The ice has been quiet since you took the ball. The big fellow\'s gone home, I reckon.', n);
    if (!J.flag('m8champ')) return J.say(['Ice fishing. Sixty years. Caught a lot of things.', 'Every winter a great Gyarados comes up through this hole, looks around like it\'s lost someone, and goes back down.', 'Wish I knew who it\'s looking for.'], n);
    await J.say(['Bram? Champion Bram? ...That\'s who it\'s been looking for.', 'Last week the Gyarados came up and left this on the ice. Then went back down and stayed down.', 'An old Poké Ball. Cold as the lake. Something huge sleeps in it, waiting.'], n);
    await J.give('m8ballB');
    J.set('m8ballB');
    await J.say('Take it to him. Sixty years I\'ve wanted to know who that fellow was looking for.', n);
  });
  on('m8rain', { needs: ['junobetray', '!junofight'], sets: ['junofight'] }, async J => {
    if (J.flag('junofight') || !J.flag('junobetray')) return;
    await J.say('Rain turns to sleet in the Narrows. Juno is standing in the middle of the path, as if she has been waiting for you.');
    await J.face('juno', 'down');
    await J.say(['...Go home, {NAME}.', 'You heard, didn\'t you. Of course you heard. You never sleep through anything.'], 'juno');
    await J.say(['He can save Teo. He promised. When the Lantern\'s lit, Teo stops fading. Forever.', 'Nobody gets hurt. Everyone\'s happy. You\'d do the same. Don\'t tell me you wouldn\'t.'], 'juno');
    const a = await J.ask('What do you say?', ['Give the key back, Juno.', 'Teo wouldn\'t want this.'], 'juno');
    await J.say(a === 0 ? ['I already gave it to him. Last night. It\'s done.', 'So the only thing left between me and that summit is you.'] : ['Teo\'s EIGHT. Teo wants pancakes and a Dratini. Don\'t you DARE tell me what Teo wants.', 'He doesn\'t even know what he\'s losing. I do.'], 'juno');
    await J.say('So move, {NAME}. Or make me.', 'juno');
    const rs = rsOf(J);
    const r = await J.battle({ id: 'junofight', name: 'Juno', look: 'juno', team: [['manectric', 42], ['staraptor', 42], ['sharpedo', 41], ['lucario', 43], [J.grown(rs, 44), 44]], pay: 80, theme: 'icecave',
      before: 'I\'m not losing this one. I CAN\'T lose this one!', lose: '...No. No, no, no.', win: 'I\'m sorry. I\'m so sorry.' });
    if (r !== 'win') return;
    await J.say(['...I\'ve never beaten you when it mattered. Not once. Not ever.', 'But it doesn\'t matter. I\'m still going.'], 'juno');
    await J.say(['I keep my deliveries, {NAME}. Anything, anywhere, by morning.', 'Please don\'t follow me.'], 'juno');
    await J.walk('juno', ['up', 6]);
    await J.fade(() => J.hideNpc('juno'));
    await J.say(['Far up the pass, white coats part to let her through. Then close again.', 'A great shadow sweeps over the Narrows. Wings beat the sleet sideways.']);
    const rh = { name: 'Warden Rhoswen', look: 'rhoswen' };
    await J.say(['Easy. Easy, Gale. Good girl.', 'I saw that from the lamp room. All of it. You fought well, and you lost something anyway. That\'s the worst kind of battle.'], rh);
    await J.say(['I\'m Rhoswen. Warden of the Crown Light. And if that girl is carrying what I think she\'s carrying, every Warden in Meridia should be shaking.', 'Come to my Light. If you\'re climbing Frostcrown after her - and I can see you are - you\'ll do it with my badge, or not at all.'], rh);
    J.set('junofight'); J.refresh();
  });

  // ---- the Crown Light
  on('m8gymStatue', {}, J => J.say(J.flag('badge.crown') ? 'THE CROWN LIGHT - WARDEN: RHOSWEN\nTrainers who have earned the Crown Badge: {NAME}' : 'THE CROWN LIGHT - WARDEN: RHOSWEN\nThe seventh of the Eight Lights of Meridia. It watches the north.'));
  on('m8lamp', {}, J => J.say(longNight(J) ? 'The great lamp of the Crown Light. It still burns - small and stubborn, like a candle in a dark house.' : 'The great lamp of the Crown Light. Through its lens you can see the whole of Frostcrown, and the gold glow on the summit.'));
  on('m8rhoswenWin', { sets: ['badge.crown', 'ch9'] }, async J => {
    await J.say(['Ha! Gale hasn\'t been beaten that cleanly in ten years. Take it. The Crown Badge.'], 'rhoswen');
    J.badge('crown');
    await J.give('tm:dragon-pulse');
    await J.say(['Now listen. That key of yours. The Lantern-folk built the Great Lantern\'s crown long before Cassius built his tower around it.', 'It\'s a lock. Only a lighthouse key turns it. With yours, he can light it. Tonight, if he wants to.'], 'rhoswen');
    await J.say(['So we don\'t wait. My Dragons have "politely asked" the Lumen guards at the top of Frost Pass to go home. They went. Quickly.', 'Frostcrown\'s caves climb right up under the summit. Go. Bring that girl home - and if you can\'t, stop that man.'], 'rhoswen');
    await J.chapter('Chapter 8 complete!', 'Next: Chapter 9 - The Long Night');
    J.set('ch9'); J.refresh();
    await J.chapter('Chapter 9', 'The Long Night');
  });

  // ---- The Forgotten Champion (side story): it starts here and ends in the Long Night (mch10.js)
  on('m8fen', { sets: ['m8champ'] }, async (J, n) => {
    if (longNight(J)) return J.say('Grandpa\'s taking me to see the dragons today! He promised! He always promises and he always does!', n);
    if (J.flag('m10champ')) return J.say(['He remembers. Not everything - but he remembers ME. And them.', 'He made pancakes this morning and told me about the final against the Lamplighter. Three times. I didn\'t mind once.'], n);
    if (J.flag('m8champ')) {
      const got = ['m8ballA', 'm8ballB', 'm8ballC'].filter(f => J.flag(f)).length;
      return J.say(got === 3 ? ['All three! You found all three! But Grandpa only stares at them like they\'re someone else\'s.', 'Maybe he needs... a day he can\'t forget. I don\'t know. Keep them safe for him?'] : got ? `${got} of 3! Marta's hut in the Coldfields, the ice on Frost Pass, the caves of Frostcrown. You're bringing them home!` : 'Marta\'s hut in the Coldfields. The ice on Frost Pass. The caves of Frostcrown. That\'s where Grandpa used to take them.', n);
    }
    await J.say(['Shh, Grandpa\'s resting. Are you a trainer? A real one?', 'Grandpa was Champion of Meridia once. Forty years ago, before the Lamplighter. That\'s his cup in the corner.',
      'He doesn\'t remember. Not the League, not the battles. Some days not me. It started before the Lost Days - it\'s just old age, the doctor says.'], n);
    await J.say(['The worst part is his team. When he stopped knowing them, they left. One by one. To wait somewhere he used to take them.', 'Marta\'s hut in the Coldfields. The ice on Frost Pass. The caves of Frostcrown.',
      'If somebody brought them home... maybe he\'d remember something. Even one thing.'], n);
    J.set('m8champ');
    await J.say('(You write it in the notebook: the Forgotten Champion. Find Bram\'s scattered team.)');
  });
  on('m8bram', {}, (J, n) => {
    if (J.flag('m10champ')) return J.say('Ember, Tide and Gale. My old crew. Forty years and they waited. I don\'t deserve them. I\'ll spend the rest of my days trying to.', n);
    const balls = ['m8ballA', 'm8ballB', 'm8ballC'].filter(f => J.flag(f));
    if (balls.length === 3) return J.say(['Three Poké Balls. Old ones. Somebody loved these.', 'I had... I had a dog once. A big orange dog. Or a dragon. Or... I\'m sorry. Whose are these?'], n);
    if (balls.length) return J.say(['An old Poké Ball. My, that\'s worn.', 'It\'s warm. Why is it warm? ...I used to know a song about a warm Poké Ball. Funny. It\'s gone.'], n);
    return J.say(['Hello, hello. Are you one of Fen\'s friends? She has so many friends.', 'I used to be... something. Something with crowds. Ah. It\'s gone. It goes, these days.'], n);
  });
  on('m8trophy', {}, J => J.say(J.flag('m10champ') ? 'A tarnished cup, polished bright again: "CHAMPION OF MERIDIA - BRAM OSTERGAARD". Fen has tied a ribbon round it.' : 'A tarnished cup, pushed into the corner: "CHAMPION OF MERIDIA - BRAM OSTERGAARD". It\'s used as a hat stand.'));
  on('m8photos', {}, J => J.say('Old photos. A young man in a red coat, laughing, between an Arcanine, a Gyarados and a Dragonite. In one, a young woman with a Lapras shakes his hand: "FINAL - B. vs A."'));

  for (const id of ['coldfields', 'm8hut', 'highwatch', 'm8center', 'm8mart', 'm8inn', 'm8bram', 'm8house', 'm8courier', 'crowngym', 'crowngym2', 'frostpass']) M[id].chapter = 8;
  chapter({ n: 8, title: 'Juno\'s Choice', start: { map: 'coldfields', x: 19, y: 28, dir: 'up' }, level: 41, badge: 'crown', center: 'm8center',
    goals: ['m8fields', 'm8innJuno', 'junobetray', 'junofight', 'badge.crown', 'ch9'] });
})();
