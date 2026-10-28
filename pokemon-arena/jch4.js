'use strict';
// =====================================================================
//  JOURNEY - Chapter 4: Embers of Mt. Cinder. Route 4 climbs from Voltara
//  to Cinder Town, an ash-covered spa town at the foot of a rumbling
//  volcano. Team Eclipse (Admin Rhea) is drilling into the magma chamber
//  for a Meteor Shard; Taro, the Fire leader, can't stop them alone.
// =====================================================================
(() => {
  const { def, grid, L, center, mart } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- new people
  const LK = {
    c4taro: { hat: 'bandana', hatColor: 0xd85030, hair: 0xb8b8c0, hairStyle: 'short', top: 0x5a3a2a, sleeves: 'none', inner: 0xd85030, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x2a1e14, bag: null, scarf: 0xf0a030 },
    c4kindler: { hat: 'bandana', hatColor: 0xf0a030, hair: 0xc0392b, hairStyle: 'spiky', top: 0xd85030, sleeves: 'short', inner: 0xffd84a, legs: 0x5a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: null },
    c4ranger: { hat: 'cap', hatColor: 0x5a6a3a, hatFront: 0xf0a030, hair: 0x2b1d14, hairStyle: 'short', top: 0x6a7a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x4a4a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x7a5a30 },
    c4bather: { hat: 'bandana', hatColor: 0xffffff, hair: 0xd9d9d9, hairStyle: 'short', top: 0xf4f0e8, sleeves: 'short', inner: 0xf4f0e8, legs: 0x3c78d0, legStyle: 'shorts', shoes: 0xf6cfa8, bag: null }
  };
  Object.assign(L, LK);

  // ---- items
  ITEMS['tm:flamethrower'] = ITEMS['tm:flamethrower'] || { name: 'TM Flamethrower', pocket: 'tms', price: 0, tm: 'flamethrower', desc: 'Teaches Flamethrower: a stream of fire that may burn the target.' };

  // ---- trainers (Taro's ace is 34; the route sits a few levels under, Eclipse a little over)
  Object.assign(TRAINERS, {
    c4gus: { team: [['geodude', 26], ['graveler', 28]], pay: 20, theme: 'volcano', before: 'This slope eats boots for breakfast! Let\'s see if it eats trainers too!', lose: 'Rolled right down the hill...', after: 'The ground\'s been shaking since sunrise. Mt. Cinder hasn\'t grumbled like this in fifty years.' },
    c4sue: { team: [['vulpix', 27], ['phanpy', 28]], pay: 18, theme: 'forest', before: 'Last patch of green before the ash! Let\'s battle while it lasts!', lose: 'All my snacks got ashy anyway...', after: 'Up past here it\'s all grey. Even the tall grass gives up.' },
    c4ash: { team: [['growlithe', 28], ['ponyta', 29]], pay: 22, theme: 'volcano', before: 'Feel that heat? That\'s my spirit! Kindler Ash, fired up and ready!', lose: 'Fizzled out...', after: 'Taro in Cinder Town is the hottest trainer around. Water, Ground and Rock moves - that\'s my tip!' },
    c4dex: { team: [['rockruff', 28], ['numel', 30]], pay: 20, theme: 'volcano', before: 'I came to camp by the lava. It\'s warm! And you\'re in my spot!', lose: 'Okay, okay. It\'s your spot.', after: 'Numel stores magma in its hump. Mine runs a little hot when the mountain rumbles.' },
    // ---- Mt. Cinder: Team Eclipse
    c4grunt1: { team: [['golbat', 29], ['houndour', 30]], pay: 40, theme: 'volcano', before: 'Team Eclipse is drilling here. Nobody gets past - especially not a kid!', lose: 'It\'s too hot for this...', after: 'Admin Rhea is up at the crater. She\'s scarier than the volcano.', look: 'grunt', name: 'Eclipse Grunt' },
    c4grunt2: { team: [['krokorok', 30], ['croagunk', 30]], pay: 40, theme: 'volcano', before: 'The stairs to the crater are behind me. And so is my lunch. Back off!', lose: 'My lunch... and my pride.', after: 'The drill\'s eating through rock like butter. Rhea says the shard is right under the lava.', look: 'grunt', name: 'Eclipse Grunt' },
    c4grunt3: { team: [['murkrow', 30], ['houndour', 30], ['scraggy', 31]], pay: 40, theme: 'volcano', before: 'You made it to the crater?! Admin Rhea will roast me if you get any further!', lose: 'Well... I\'m roasted.', after: 'Don\'t tell Rhea I let you through. Please.', look: 'grunt', name: 'Eclipse Grunt' },
    c4rhea: { team: [['murkrow', 30], ['houndoom', 31], ['magmar', 32]], pay: 60, theme: 'volcano', name: 'Admin Rhea', look: 'rhea', before: 'You want to play with fire? Fine - I\'ll burn you to a crisp!', lose: 'Ugh! Too slow, too slow, TOO SLOW!' },
    // ---- Cinder Gym
    g4blaze: { team: [['ponyta', 30], ['growlithe', 31]], pay: 24, theme: 'volcano', before: 'Mind your step - the lava\'s real! And so is my fire!', lose: 'Burnt out...', after: 'Taro\'s Pokémon hit like a hammer on an anvil. Water and Ground moves cool them down.' },
    g4flint: { team: [['numel', 31], ['graveler', 31]], pay: 24, theme: 'volcano', before: 'I\'m Taro\'s apprentice! I sweep the forge AND I battle!', lose: 'Back to sweeping, I guess.', after: 'Camerupt is part Ground - Electric won\'t touch it, but Water hits it really hard!' },
    g4cinda: { team: [['vulpix', 31], ['rapidash', 32]], pay: 24, theme: 'volcano', before: 'Last stop before the forge. Hope you don\'t mind the heat!', lose: 'Cooled off... completely.', after: 'Go on. The old man likes a challenger who doesn\'t flinch.' },
    taro: { team: [['magmar', 31], ['rapidash', 32], ['camerupt', 33], ['arcanine', 34]], pay: 100, theme: 'volcano', gym: 3, onWin: 'c4taroWin', before: 'You stood up to that Eclipse lot on my mountain. Now stand up to my fire! A bond is forged like steel - in the heat. Show me yours!', lose: 'Hah! Tempered and true. That\'s a bond that won\'t crack.', after: 'Keep that fire burning, kid. The road north goes into the mist - Ezra\'s city is somewhere in there.' }
  });

  // =====================================================================
  //  Route 4 - up from Voltara: the grass turns to ash as the road climbs
  //  to Cinder Town (east). West edge: Voltara (Chapter 3).
  // =====================================================================
  {
    const B = grid(44, 24, '.').border('T', { w: [14, 15], e: [5, 6] }, 1);
    B.fill(1, 1, 42, 1, 'T').fill(1, 22, 42, 22, 'T');
    // the ash creeps in from the east; volcanic rock instead of trees there
    B.fill(24, 2, 42, 21, 'o').fill(22, 2, 23, 9, 'o').fill(21, 16, 23, 21, 'o').put(21, 4, 'o').put(21, 5, 'o').put(23, 12, 'o').put(22, 13, 'o');
    B.fill(24, 0, 43, 1, 'r').fill(24, 22, 43, 23, 'r').fill(43, 0, 43, 23, 'r');
    // the road: in from Voltara, up the slope, then east along the ridge to Cinder Town
    B.fill(0, 14, 20, 15, ',').fill(19, 5, 20, 15, ',').fill(19, 5, 43, 6, ',');
    // a ledge: from the north-west meadow, a quick hop back down to the lower road
    B.fill(1, 10, 10, 10, 'T').fill(11, 10, 17, 10, 'v').put(18, 10, 'T');
    // tall grass (the last of it) and the lava pools further up
    B.fill(3, 3, 9, 8, ';').fill(4, 17, 12, 20, ';').fill(13, 11, 16, 12, ';');
    B.fill(29, 10, 32, 12, 'L').fill(37, 15, 40, 17, 'L').fill(33, 19, 34, 20, 'L');
    B.put(28, 10, 'r').put(33, 11, 'r').put(36, 16, 'r').put(41, 15, 'r').put(26, 18, 'r').put(30, 3, 'r').put(36, 3, 'r').put(24, 9, 'r');
    B.fill(13, 18, 15, 20, '*').fill(1, 2, 2, 3, 'T').fill(1, 20, 2, 21, 'T');
    def({ id: 'route4', name: 'Route 4', kind: 'route', rows: B.rows(), music: 'route', battle: 'volcano', chapter: 4,
      encounters: { tall: { rate: 0.12, min: 23, max: 27, table: [['ponyta', 20], ['numel', 20], ['geodude', 14], ['vulpix', 12], ['growlithe', 12], ['litleo', 8], ['phanpy', 8], ['houndour', 6]] } },
      edges: { w: { to: 'voltara', dy: 0 }, e: { to: 'cinder', dy: 13 } },
      signs: [{ x: 2, y: 13, text: 'ROUTE 4\nVoltara City - Cinder Town' }, { x: 41, y: 4, text: 'CINDER TOWN ahead!\nHot springs and hotter tempers.' }],
      items: [{ x: 41, y: 21, item: 'shard', n: 1 }, { x: 2, y: 4, item: 'superpotion', n: 1 }, { x: 36, y: 8, item: 'great', n: 2 }, { x: 13, y: 21, item: 'burnheal', n: 2, hidden: true }, { x: 25, y: 13, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'gus', x: 16, y: 13, dir: 'down', look: L.hiker, name: 'Hiker Gus', trainer: 'c4gus' },
        { id: 'sue', x: 11, y: 5, dir: 'left', look: L.picnicker, name: 'Picnicker Sue', trainer: 'c4sue' },
        { id: 'ash', x: 28, y: 4, dir: 'down', look: LK.c4kindler, name: 'Kindler Ash', trainer: 'c4ash' },
        { id: 'dex', x: 35, y: 19, dir: 'left', look: L.camper, name: 'Camper Dex', trainer: 'c4dex' },
        { id: 'walker', x: 22, y: 11, dir: 'left', look: L.oldman, name: 'Old Walker', talk: 'c4walker' }] });
  }

  // =====================================================================
  //  Cinder Town - ash on the roofs, steam from the hot spring. Pokémon
  //  Center, Mart, Taro's forge, the inn, the Fire gym. East: Mt. Cinder.
  //  North: Route 5 (Chapter 5), closed by the mist for now.
  // =====================================================================
  {
    const B = grid(34, 28, 'o').border('r', { n: [14, 15], w: [18, 19], e: [6, 7] }, 1);
    // the streets
    B.fill(14, 0, 15, 19, ',').fill(0, 18, 28, 19, ',').fill(15, 6, 33, 7, ',');
    B.fill(4, 8, 13, 8, ',').fill(10, 8, 10, 8, ',').fill(6, 17, 7, 17, ',').fill(21, 17, 22, 17, ',').fill(23, 20, 23, 25, ',').fill(23, 25, 23, 25, ',');
    // the foot of Mt. Cinder: one narrow trail up (the ranger stands in it)
    B.fill(27, 1, 32, 5, 'r').fill(28, 8, 32, 26, 'r').put(29, 7, 'r').fill(26, 1, 26, 3, 'r');
    B.fill(30, 2, 31, 3, 'L').fill(30, 10, 31, 11, 'L');
    // the hot spring, south-west
    B.fill(3, 21, 12, 26, ':').fill(5, 22, 10, 25, '~').put(3, 21, 'r').put(12, 26, 'r');
    // rocks and old lava about town
    B.fill(1, 1, 3, 2, 'r').fill(17, 1, 19, 2, 'r').put(22, 3, 'r').put(1, 11, 'r').put(13, 13, 'r').put(26, 22, 'r').put(17, 24, 'r').put(1, 25, 'r');
    def({ id: 'cinder', name: 'Cinder Town', kind: 'town', rows: B.rows(), music: 'town', battle: 'volcano', chapter: 4, center: { map: 'center_cinder' },
      buildings: [{ b: 'center', x: 4, y: 12, to: 'center_cinder' }, { b: 'mart', x: 8, y: 4, to: 'mart_cinder' }, { b: 'house', x: 2, y: 4, to: 'cinderforge', variant: 0 },
        { b: 'gym', x: 18, y: 11, to: 'gym4', variant: 3, needs: ['c4taro'], locked: 'c4gymLocked' }, { b: 'house3', x: 18, y: 21, to: 'cinderinn', variant: 1 }],
      signs: [{ x: 12, y: 17, text: 'CINDER TOWN\nWarm water, warm hearts, hot rocks.' }, { x: 20, y: 17, text: 'CINDER GYM - Leader: TARO\nThe blacksmith of blazing fire.' },
        { x: 13, y: 22, text: 'CINDER HOT SPRING\nGood for tired feet. No Pokémon in the water, please - it\'s a bit TOO hot for some.' },
        { x: 25, y: 4, text: 'MT. CINDER TRAIL\nEast. Mind the lava.' }, { x: 16, y: 2, text: 'NORTH: ROUTE 5\n...The road disappears into a thick white mist.' }],
      props: [{ k: 'lamp', x: 13, y: 16 }, { k: 'lamp', x: 16, y: 9 }, { k: 'lamp', x: 26, y: 16 }],
      edges: { w: { to: 'route4', dy: -13 }, e: { to: 'mtcinder', dy: 14 }, n: { to: 'route5', dx: 0, needs: ['ch5'] } },
      items: [{ x: 2, y: 26, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'ranger', x: 29, y: 6, dir: 'left', look: LK.c4ranger, name: 'Ranger Ito', talk: 'c4ranger', show: ['!c4hazel'] },
        { id: 'ranger2', x: 27, y: 8, dir: 'up', look: LK.c4ranger, name: 'Ranger Ito', talk: 'c4ranger2', show: ['c4hazel'] },
        { id: 'hazel', x: 24, y: 5, dir: 'right', look: L.hazel, name: 'Prof. Hazel', talk: 'c4hazel' },
        { id: 'guide', x: 24, y: 17, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'c4guide' },
        { id: 'bather', x: 11, y: 23, dir: 'left', look: LK.c4bather, name: 'Bather Gen', talk: 'c4bather' },
        { id: 'kid', x: 8, y: 19, dir: 'down', look: L.kid, wander: 2, talk: 'c4kid' },
        { id: 'lady', x: 17, y: 9, dir: 'left', look: L.woman, wander: 2, talk: 'c4lady' },
        { id: 'mistman', x: 14, y: 2, dir: 'down', look: L.sailor, name: 'Traveler', talk: 'c4north', show: ['!ch5'] }] });
  }
  center('center_cinder', 'cinder', { chapter: 4 });
  mart('mart_cinder', 'cinder', ['poke', 'great', 'ultra', 'superpotion', 'burnheal', 'fullheal', 'revive', 'repel', 'firestone'], { chapter: 4 });
  def({ id: 'cinderforge', name: "Taro's Forge", kind: 'inside', outside: 'cinder', chapter: 4, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'c4anvil' }, { k: 'stove', x: 4, y: 1 }, { k: 'boxes', x: 6, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 1, y: 4 }],
    npcs: [{ id: 'mira', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Mira', talk: 'c4mira' }] });
  def({ id: 'cinderinn', name: 'Hot Spring Inn', kind: 'inside', outside: 'cinder', chapter: 4, rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 4, 6, 5, 'R').rows(), arrive: { x: 5, y: 6 },
    furniture: [{ k: 'counter', x: 1, y: 2 }, { k: 'shelf', x: 7, y: 1 }, { k: 'plant', x: 9, y: 1 }, { k: 'sofa', x: 7, y: 5 }, { k: 'plant', x: 1, y: 6 }],
    npcs: [{ id: 'inn', x: 2, y: 1, dir: 'down', look: L.oldlady, name: 'Innkeeper Sen', talk: 'c4inn', counter: true }, { id: 'tourist', x: 8, y: 3, dir: 'left', look: L.lass, name: 'Tourist', talk: 'c4tourist' }] });

  // =====================================================================
  //  Mt. Cinder - the tunnels inside the volcano (Team Eclipse's grunts);
  //  stairs up to the crater, where Rhea's drill bites into the magma
  // =====================================================================
  {
    const B = grid(30, 26, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(0, 20, 9, 21);                                // in from Cinder Town
    carve(7, 13, 13, 21);                               // the first chamber
    carve(13, 13, 21, 14);                              // east, under a low ceiling
    carve(20, 8, 26, 20);                               // the hot chamber (lava pools)
    carve(22, 3, 23, 8); carve(17, 2, 27, 4);           // north, up to the stairs
    carve(9, 9, 10, 13); carve(3, 4, 12, 9);            // a quiet side room (ash on the floor)
    B.fill(4, 5, 7, 7, 'o').fill(9, 16, 11, 18, 'o').fill(24, 15, 25, 18, 'L').fill(21, 18, 22, 19, 'L').fill(25, 9, 26, 10, 'L').fill(17, 3, 18, 4, 'L');
    B.put(12, 15, 'r').put(8, 19, 'r').put(21, 10, 'r').put(11, 6, 'r').put(3, 8, 'r');
    B.put(26, 2, '<');
    def({ id: 'mtcinder', name: 'Mt. Cinder', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.28, chapter: 4,
      encounters: { cave: { rate: 0.07, min: 25, max: 29, table: [['zubat', 18], ['geodude', 18], ['numel', 15], ['golbat', 10], ['graveler', 8], ['magby', 8], ['litwick', 8], ['rhyhorn', 6], ['larvesta', 2]] } },
      edges: { w: { to: 'cinder', dy: -14 } },
      warps: [{ x: 26, y: 2, to: 'mtcinder2', tx: 13, ty: 18, dir: 'up' }],
      items: [{ x: 4, y: 5, item: 'shard', n: 1, hidden: true }, { x: 12, y: 4, item: 'revive', n: 1 }, { x: 26, y: 20, item: 'ultra', n: 2 }, { x: 7, y: 13, item: 'superpotion', n: 1, hidden: true }],
      npcs: [{ id: 'grunt1', x: 11, y: 19, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c4grunt1' },
        { id: 'grunt2', x: 22, y: 9, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c4grunt2' }] });
  }
  // ---- the crater: a lake of magma; the drill on its south shore
  {
    const B = grid(28, 22, 'r');
    B.fill(2, 2, 25, 10, 'o').fill(4, 2, 23, 7, 'L').fill(2, 2, 3, 3, 'r').fill(24, 2, 25, 3, 'r');
    B.fill(12, 11, 14, 11, 'o');                        // the one way up from the stairs (Rhea's scene starts here)
    B.fill(3, 12, 24, 19, 'o').fill(4, 14, 6, 15, 'L').fill(21, 13, 23, 14, 'L').put(9, 17, 'r').put(18, 17, 'r').put(3, 19, 'r');
    B.put(13, 19, '>');
    def({ id: 'mtcinder2', name: 'Cinder Crater', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.12, chapter: 4,
      warps: [{ x: 13, y: 19, to: 'mtcinder', tx: 25, ty: 3, dir: 'down' }],
      furniture: [{ k: 'machine', x: 12, y: 8, talk: 'c4drill' }],
      zones: [{ x: 12, y: 11, w: 3, h: 1, event: 'c4rheaScene' }],
      items: [{ x: 2, y: 4, item: 'fullheal', n: 1 }, { x: 24, y: 19, item: 'great', n: 3, hidden: true }],
      npcs: [{ id: 'grunt3', x: 7, y: 13, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c4grunt3' },
        { id: 'rhea', x: 14, y: 9, dir: 'up', look: L.rhea, name: 'Admin Rhea', talk: 'c4rheaScene', show: ['!c4rhea'] },
        { id: 'grunt4', x: 11, y: 9, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'c4rheaScene', show: ['!c4rhea'] },
        { id: 'taro', x: 20, y: 9, dir: 'left', look: LK.c4taro, name: 'Taro', talk: 'c4rheaScene', show: ['!c4taro'] }] });
  }

  // =====================================================================
  //  Cinder Gym - a forge floor crossed by channels of lava; Taro at the top
  // =====================================================================
  {
    const B = grid(15, 17, '+').border('#').put(7, 16, 'm');
    B.fill(1, 13, 10, 13, 'L').fill(4, 10, 13, 10, 'L').fill(1, 7, 10, 7, 'L').fill(4, 4, 13, 4, 'L');
    B.put(6, 11, 'r').put(9, 12, 'r').put(5, 9, 'r').put(9, 8, 'r').put(7, 5, 'r');
    B.fill(5, 1, 9, 2, 'R');
    def({ id: 'gym4', name: 'Cinder Gym', kind: 'inside', gym: true, outside: 'cinder', chapter: 4, rows: B.rows(), battle: 'volcano', music: 'gym', arrive: { x: 7, y: 15 },
      furniture: [{ k: 'statue', x: 5, y: 14, talk: 'c4statue' }, { k: 'statue', x: 9, y: 14, talk: 'c4statue' }, { k: 'machine', x: 1, y: 1 }, { k: 'boxes', x: 13, y: 1 }],
      npcs: [{ id: 'blaze', x: 12, y: 12, dir: 'left', look: LK.c4kindler, name: 'Kindler Blaze', trainer: 'g4blaze' },
        { id: 'flint', x: 2, y: 9, dir: 'right', look: L.worker, name: 'Apprentice Flint', trainer: 'g4flint' },
        { id: 'cinda', x: 12, y: 6, dir: 'left', look: LK.c4kindler, name: 'Kindler Cinda', trainer: 'g4cinda' },
        { id: 'taro', x: 7, y: 2, dir: 'down', look: LK.c4taro, name: 'Leader Taro', trainer: 'taro' }] });
  }

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- Route 4
  on('c4walker', {}, (J, n) => J.say(J.flag('c4rhea') ? 'The mountain\'s gone quiet again. Whatever you did up there - thank you.' : ['Hoo... the road gets steeper every year. Or I get older.', 'Feel that? The ground\'s trembling. Mt. Cinder hasn\'t rumbled like this since I was a boy.'], n));
  // ---- Cinder Town
  on('c4gymLocked', {}, J => J.say('The door is locked. A note is hammered to it with a nail: "Mountain\'s coughing. Gone up to have a word with it. - Taro"'));
  on('c4guide', {}, (J, n) => J.say(J.flag('badge.ember') ? 'You beat Taro! That Ember Badge is still warm from the forge!' : J.flag('c4taro') ? 'Taro is back! He uses Fire types: Water, Ground and Rock moves are your friends. Watch out - Camerupt shrugs off Electric!' : 'Taro isn\'t in. He went up Mt. Cinder this morning, muttering about the rumbling. The trail is east of town.', n));
  on('c4ranger', { needs: ['!c4hazel'] }, (J, n) => J.say(['Sorry, the Mt. Cinder trail is closed. The mountain\'s rumbling, and Taro went up alone.', 'People in purple went up before him, too... Nobody else goes up unless someone vouches for them.'], n));
  on('c4ranger2', {}, (J, n) => J.say(J.flag('c4rhea') ? 'The rumbling\'s stopped. Taro says you sent those purple crooks packing!' : 'The Professor vouched for you. Go carefully - the tunnels are hot, and the crater is hotter.', n));
  on('c4hazel', { sets: ['c4hazel'] }, async (J, n) => {
    if (J.flag('c4hazel')) {
      if (J.flag('c4taro')) return J.say(['The meteor rock here is full of tiny fragments. It answers the stones like an echo...', 'Taro trusts you now. A gruff man, but his Pokémon adore him. That\'s a bond you can feel from across the street.'], n);
      return J.say('Taro and those people in purple are up at the crater. Please be careful, {NAME} - trust your Pokémon, and they\'ll trust you.', n);
    }
    await J.say(['{NAME}! What a surprise to see you here!', 'I came to study the meteor rock inside Mt. Cinder. When the meteor shattered, a great piece of it sank into this volcano.', 'But the mountain started rumbling this morning, and the ranger closed the trail.'], n);
    await J.say(['Taro, the gym leader, went up to see what\'s wrong. And I saw people in purple and black heading up before him...', 'Team Eclipse? Here too? They must be after the meteor in the magma.'], n);
    await J.say(['You know, Mega Evolution isn\'t about the stones. A stone only answers a trainer and a Pokémon who truly trust each other.', 'Team Eclipse wants the power without the bond. That\'s why they frighten me.'], n);
    await J.say('Ranger Ito! This trainer is my field assistant. Let {NAME} through - I\'ll take responsibility.', n);
    await J.say('...If you say so, Professor. Go on, kid.', 'ranger');
    await J.say('Take these. I hope you won\'t need them, but the crater is no place to faint.', n);
    await J.give('revive', 3);
    await J.fade(() => { J.set('c4hazel'); J.refresh(); });
  });
  on('c4bather', {}, (J, n) => J.say(J.pick([['Ahh... nothing like a soak after a long climb.', 'Folks say the spring water is warmed by the meteor itself, deep in the mountain.'], 'The water\'s hotter today. The mountain\'s restless, I tell you.', 'Taro soaks here every evening. Says it keeps his hammer arm young.']), n));
  on('c4kid', {}, (J, n) => J.say(J.flag('c4rhea') ? 'The ground stopped shaking! Mom says I can play outside again!' : 'The ground keeps going rumble-rumble! Is the mountain hungry?', n));
  on('c4lady', {}, (J, n) => J.say('Ash falls on Cinder Town like snow. We sweep the roofs every morning - it\'s good for the gardens, believe it or not.', n));
  on('c4north', { needs: ['!ch5'] }, (J, n) => J.say(['I was heading north, but the mist on Route 5 is so thick I couldn\'t see my own feet.', 'I heard there\'s a city of psychics somewhere in it. I\'ll wait until it clears.'], n));
  on('c4mira', {}, (J, n) => J.say(J.flag('badge.ember') ? 'You beat my husband? Ha! He came home grinning like a boy. He hasn\'t done that in years.' : ['I\'m Mira, Taro\'s wife. He\'s the gym leader, but before that he was the best smith in Valoria.', 'He talks to his Pokémon while he works. Says a fire you don\'t understand will burn you.'], n));
  on('c4anvil', {}, J => J.say('A great black anvil, worn smooth in the middle. A half-finished horseshoe rests on it - sized for a Rapidash.'));
  on('c4inn', {}, async (J, n) => {
    await J.say('Welcome to the Hot Spring Inn! A soak in the spring and a nap in a warm room - that\'s the Cinder way.', n);
    if (await J.ask('Rest your Pokémon?', ['Yes, please', 'No, thanks'], n) !== 0) return J.say('Come back whenever you\'re weary!', n);
    await J.heal(true);
    await J.say('Your Pokémon look refreshed and toasty! Free of charge for trainers - Taro\'s rule.', n);
  });
  on('c4tourist', {}, (J, n) => J.say('I came all the way from Port Coralis for the hot spring. And now the volcano\'s grumbling?! Some holiday!', n));
  // ---- the crater: Admin Rhea's drill
  on('c4drill', {}, J => J.say(J.flag('c4rhea') ? 'A huge drill, abandoned. Its bit is still glowing red from the magma.' : 'A huge drill, roaring and shaking. Its bit is grinding into the edge of the magma lake.'));
  on('c4rheaScene', { needs: ['!c4rhea'], sets: ['c4rhea', 'c4taro'] }, async J => {
    await J.say('Faster! Director Vex wants that shard TODAY, not when this rock pile feels like it!', 'rhea');
    await J.say('A-Admin Rhea, the drill\'s overheating! And the old man is still here!', 'grunt4');
    await J.say('Turn that blasted machine off! You\'ll crack the magma chamber wide open and bury Cinder Town in ash!', 'taro');
    await J.say('Then beat me, grandpa! Oh wait - your Pokémon are already worn out from my grunts.', 'rhea');
    await J.face('rhea', 'down'); await J.face('grunt4', 'down'); await J.face('taro', 'down');
    await J.emote('rhea', '!');
    await J.say(['Who let a kid up here?! ...Hold on. Purple sneakers, annoying face...', 'You\'re the brat Kael keeps whining about! I\'m Rhea - the newest Admin of Team Eclipse, and I don\'t do patience.'], 'rhea');
    if (await J.battle('c4rhea') !== 'win') return;
    await J.say(['No, no, NO! My grunts, my drill, my perfect record - all wrecked by a kid!', 'Fine! Keep your smelly mountain. But Director Vex will hear about this - and then you\'ll be sorry!', 'Team Eclipse, we\'re out of here!'], 'rhea');
    await J.fade(() => { J.set('c4rhea'); J.hideNpc('rhea'); J.hideNpc('grunt4'); });
    await J.face('taro', 'left');
    await J.say(['Hmph. Not bad, kid. Not bad at all.', 'Listen - the ground\'s settling already. If they\'d cracked that chamber, my whole town would be under ash by nightfall.'], 'taro');
    await J.say(['That shard they wanted is down there in the rock somewhere. The mountain keeps its secrets - let it.', 'Name\'s Taro. I run the gym down in Cinder Town. You came all this way for a badge, didn\'t you?', 'I\'ll go stoke the forge. Come and see me when you\'re ready - and bring that fire of yours!'], 'taro');
    await J.fade(() => { J.set('c4taro'); J.refresh(); });
  });
  // ---- after Taro: the Ember Badge
  on('c4taroWin', { sets: ['badge.ember', 'ch5'] }, async J => {
    await J.say('Ha! You win, fair and square. Here - the Ember Badge. Forged it myself.', 'taro');
    J.badge('ember');
    await J.give('tm:flamethrower');
    await J.say(['That TM holds Flamethrower. Strong and steady - like a good forge fire.', 'And {NAME}... Eclipse is after the meteor everywhere. That Rhea won\'t be the last of them.'], 'taro');
    await J.say('The mist on Route 5 is lifting - the road north is open again. Ezra and the Mind Badge are somewhere in that fog. Go on, kid!', 'taro');
    await J.chapter('Chapter 4 complete!', 'Next: Chapter 5 - Mind over Mist');
    J.set('ch5'); J.refresh();
    await J.chapter('Chapter 5', 'Mind over Mist');
  });
  on('c4statue', {}, J => J.say(J.flag('badge.ember') ? 'CINDER POKéMON GYM - LEADER: TARO\nWinning trainers: {NAME}' : 'CINDER POKéMON GYM - LEADER: TARO\nThe statue is warm to the touch.'));

  chapter({ n: 4, title: 'Embers of Mt. Cinder', start: { map: 'route4', x: 1, y: 14, dir: 'right' }, level: 29, badge: 'ember', center: 'center_cinder',
    goals: ['c4hazel', 'c4rhea', 'c4taro', 'badge.ember', 'ch5'] });
})();
