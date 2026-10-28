'use strict';
// =====================================================================
//  JOURNEY - Chapter 6: Iron Will. Route 6 climbs east through rocky hills
//  to Ironridge, a mining city. Team Eclipse holds the Ironridge Mine and
//  its Leader Nova; Admin Kael, beaten one time too many, walks away.
// =====================================================================
(() => {
  const { def, grid, L, center, mart } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- looks: Nova, the miners, the gym's engineers, a Black Belt
  Object.assign(L, {
    c6nova: { hat: null, hair: 0x3a4a5a, hairStyle: 'long', top: 0x6a7a8a, sleeves: 'long', inner: 0xf0a030, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x2a2a34, bag: null, scarf: 0xf0a030 },
    c6miner: { hat: 'cap', hatColor: 0xf0d048, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'short', top: 0x8a6a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a4a6a, legStyle: 'pants', shoes: 0x3a2a1e, bag: null },
    c6engineer: { hat: 'cap', hatColor: 0x8a9aa8, hatFront: 0xf0a030, hair: 0x5a3a20, hairStyle: 'short', top: 0x5a6a7a, sleeves: 'long', inner: 0xf0a030, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    c6belt: { hat: 'bandana', hatColor: 0x2a2a34, hair: 0x2b1d14, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'short', inner: 0xf4f4f4, legs: 0xf4f4f4, legStyle: 'pants', shoes: 0xf6cfa8, bag: null }
  });

  // ---- items: this chapter's TMs (shared keys: only added if no one else has)
  const tm = (move, name, desc) => { if (!ITEMS['tm:' + move]) ITEMS['tm:' + move] = { name: 'TM ' + name, pocket: 'tms', price: 0, tm: move, desc }; };
  tm('flash-cannon', 'Flash Cannon', 'Teaches Flash Cannon: a blast of light from polished steel that may lower Sp. Def.');
  tm('iron-head', 'Iron Head', 'Teaches Iron Head: a headbutt with a steel-hard head that may make the target flinch.');
  tm('rock-slide', 'Rock Slide', 'Teaches Rock Slide: hurls big rocks that may make the target flinch.');

  // ---- trainers
  Object.assign(TRAINERS, {
    // Route 6
    c6hiker: { team: [['graveler', 37], ['onix', 37], ['rhyhorn', 38]], pay: 20, theme: 'forest', before: 'These hills are my home! Every rock, every ledge... and every battle!', lose: 'Rolled right down the hill...', after: 'Ironridge is the end of the road east. Past it, only snow and the mountains.' },
    c6belt: { team: [['primeape', 37], ['machoke', 38]], pay: 22, theme: 'forest', before: 'Hyah! I train by splitting boulders with my bare hands! Now I split you!', lose: 'My hands... are tired.', after: 'Steel types laugh at most moves. Fighting moves don\'t care how hard you are!' },
    c6picnic: { team: [['ponyta', 36], ['nidorina', 37], ['rapidash', 38]], pay: 18, theme: 'forest', before: 'The view from up here is the best in Valoria! Let\'s battle before lunch!', lose: 'There goes my appetite.', after: 'The miners used to wave at me from the carts. Lately the mine has been so quiet...' },
    c6camper: { team: [['phanpy', 37], ['gligar', 37], ['donphan', 39]], pay: 20, theme: 'forest', before: 'I\'ve been camping by the road to watch the city. Something\'s wrong at the mine!', lose: 'At least I tried...', after: 'People in purple went up to Ironridge a few days ago. They had digging gear.' },
    // Team Eclipse in Ironridge and the mine
    c6grunt0: { team: [['houndour', 38], ['golbat', 39]], pay: 40, theme: 'city', look: 'grunt', name: 'Eclipse Grunt', before: 'The mine is closed - by order of Team Eclipse! Turn around, kid!', lose: 'Ugh! Fine, go in. Admin Kael will deal with you.', after: 'Admin Kael is down on the bottom floor. He hasn\'t been himself lately...' },
    c6grunt1: { team: [['croagunk', 38], ['murkrow', 39]], pay: 40, theme: 'volcano', look: 'grunt', name: 'Eclipse Grunt', before: 'Hey! Back to digging - wait, you\'re not a miner!', lose: 'You dig a mean battle...', after: 'The Director wants every Meteor Shard in this mountain. Every single one.' },
    c6grunt2: { team: [['sneasel', 39], ['golbat', 39]], pay: 40, theme: 'volcano', look: 'grunt', name: 'Eclipse Grunt', before: 'Nobody goes down the shaft without Admin Kael\'s say-so!', lose: 'Kael\'s going to have my badge for this.', after: 'Go on down. See if I care. I just watch the carts.' },
    c6grunt3: { team: [['pawniard', 39], ['houndoom', 40]], pay: 40, theme: 'volcano', look: 'grunt', name: 'Eclipse Grunt', before: 'You\'re the one Kael keeps talking about? You don\'t look like much!', lose: 'Okay... you look like a lot.', after: 'Kael lost to you twice already. Now he just stares at the shards and mutters.' },
    c6grunt4: { team: [['golbat', 39], ['bisharp', 40]], pay: 40, theme: 'volcano', look: 'grunt', name: 'Eclipse Grunt', before: 'Last stop before the Admin! Nobody gets past me!', lose: 'Somebody got past me.', after: 'The Leader of this town is down there too. Stubborn lady. Won\'t lift a finger for us.' },
    c6admin: { team: [['honchkrow', 41], ['toxicroak', 42], ['weavile', 42], ['sableye', 43]], pay: 60, theme: 'volcano', name: 'Admin Kael', look: 'admin', before: 'Show me again. Show me what it is that keeps beating me.', lose: '...So that\'s what it looks like.' },
    // Ironridge Gym
    c6g1: { team: [['magnemite', 39], ['magneton', 40]], pay: 24, theme: 'stadium', before: 'Welcome to the steel maze! The walls only open one way, and so do I!', lose: 'Short-circuited...', after: 'Those ledges only take you back down. Plan your way up!' },
    c6g2: { team: [['lairon', 40], ['excadrill', 41]], pay: 24, theme: 'stadium', before: 'I weld the gym\'s walls myself. You won\'t break through me!', lose: 'Cracked at the seams!', after: 'Fire, Fighting and Ground moves hit Steel types hard. Nova knows it, too.' },
    c6g3: { team: [['doublade', 41], ['mawile', 41]], pay: 24, theme: 'stadium', before: 'The Leader is just ahead. You\'ll need a will of iron to reach her!', lose: 'Your will is harder than mine...', after: 'Nova\'s Steelix has stood up to every challenger this year. Good luck.' },
    c6nova: { team: [['magneton', 41], ['skarmory', 42], ['bisharp', 43], ['steelix', 44]], pay: 100, theme: 'stadium', gym: 5, onWin: 'c6novaWin', before: 'You freed my miners and my mountain. Thank you. But in this gym, gratitude doesn\'t bend steel. Show me your will!', lose: 'Not a crack in you. Your bond is tougher than any alloy I\'ve made.', after: 'Route 7 runs north from town, into the snow. Ivy and the Glacier Badge are that way - and so is the Skyspire.' }
  });

  // =====================================================================
  //  Route 6 - from Mistral east through the rocky hills to Ironridge
  // =====================================================================
  {
    const B = grid(48, 24, '.').border('T', { w: [12, 13], e: [12, 13] }, 1);
    B.fill(1, 1, 46, 2, 'T').fill(1, 21, 46, 22, 'T');
    // the road: in from Mistral, up onto the ridge, along it, down and out east
    B.fill(0, 12, 7, 13, ',').fill(6, 6, 7, 13, ',').fill(6, 6, 30, 7, ',').fill(29, 6, 30, 13, ',').fill(29, 12, 47, 13, ',');
    // a ledge from the ridge road down into the basin (the quick way back)
    B.fill(9, 8, 27, 8, 'v').put(8, 8, 'r').put(28, 8, 'r');
    // the cliff over the south hollow, with a ledge down from the east road
    B.fill(8, 15, 46, 15, 'r').fill(31, 15, 35, 15, 'v');
    // boulders all over the hills
    B.fill(12, 3, 14, 4, 'r').fill(33, 3, 34, 4, 'r').put(20, 3, 'r').put(3, 7, 'r').put(4, 8, 'r').put(15, 13, 'r').put(22, 13, 'r');
    B.put(26, 17, 'r').fill(29, 18, 30, 19, 'r').put(5, 18, 'r').put(36, 9, 'r').put(32, 10, 'r');
    // a pocket in the north-east, walled with rock, behind a small tree (Cut)
    B.fill(39, 3, 39, 9, 'r').fill(39, 9, 46, 9, 'r').put(42, 9, 'X');
    // tall grass: the basin, the hollow, the north strip
    B.fill(11, 10, 24, 12, ';').fill(10, 16, 22, 19, ';').fill(38, 17, 44, 19, ';').fill(23, 3, 28, 4, ';');
    def({ id: 'route6', name: 'Route 6', kind: 'route', chapter: 6, rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 33, max: 37, table: [['graveler', 20], ['rhyhorn', 15], ['phanpy', 12], ['mankey', 12], ['ponyta', 12], ['gligar', 10], ['sandslash', 8], ['staravia', 8], ['rockruff', 3]] } },
      edges: { w: { to: 'mistral', dy: 0 }, e: { to: 'ironridge', dy: 0 } },
      // Sora waits near the east end: the column runs the whole height of the route, so there is no way round her
      zones: [{ x: 36, y: 3, w: 1, h: 18, event: 'c6sora' }],
      signs: [{ x: 2, y: 11, text: 'ROUTE 6\nMistral City - Ironridge City' }, { x: 44, y: 11, text: 'IRONRIDGE CITY ahead!\nMind the mine carts.' }],
      items: [{ x: 2, y: 4, item: 'ultra', n: 2 }, { x: 45, y: 19, item: 'revive', n: 1 }, { x: 44, y: 4, item: 'rarecandy', n: 1 },
        { x: 24, y: 3, item: 'fullheal', n: 1, hidden: true }, { x: 41, y: 7, item: 'tm:rock-slide', n: 1, hidden: true }],
      npcs: [{ id: 'oldman', x: 4, y: 10, dir: 'down', look: L.oldman, name: 'Old Prospector', talk: 'c6r6man' },
        { id: 'hiker', x: 18, y: 5, dir: 'down', look: L.hiker, name: 'Hiker Borr', trainer: 'c6hiker' },
        { id: 'belt', x: 25, y: 10, dir: 'left', look: L.c6belt, name: 'Black Belt Kenji', trainer: 'c6belt' },
        { id: 'picnic', x: 25, y: 18, dir: 'left', look: L.picnicker, name: 'Picnicker Rosa', trainer: 'c6picnic' },
        { id: 'camper', x: 33, y: 10, dir: 'down', look: L.camper, name: 'Camper Ty', trainer: 'c6camper' },
        { id: 'sora', x: 38, y: 12, dir: 'left', look: L.sora, name: 'Sora', talk: 'c6sora', show: ['!c6sora'] }] });
  }

  // =====================================================================
  //  Ironridge City - a mining town under the peaks: Center, Mart, the
  //  Steel gym, the mine in the cliff; the pass north to Route 7
  // =====================================================================
  {
    const B = grid(36, 30, ',').border('r', { n: [16, 17], w: [12, 13] }, 1);
    B.fill(1, 1, 34, 2, 'p').fill(1, 26, 34, 28, 'p');
    // metal streets: the main street (west gate to the east end), the north road, the south street
    B.fill(0, 12, 34, 13, 'h').fill(16, 0, 17, 25, 'h').fill(3, 22, 32, 23, 'h');
    B.fill(6, 11, 7, 11, 'h').fill(12, 11, 12, 11, 'h').fill(24, 11, 25, 11, 'h').fill(6, 20, 6, 21, 'h').fill(12, 20, 12, 21, 'h');
    B.fill(18, 1, 18, 3, ',');                                   // where the hiker stands by the pass
    // the mountainside with the mine's mouth, and the fenced rail yard
    B.fill(26, 15, 34, 21, 'r').fill(29, 19, 31, 21, 'C').put(30, 21, 'c');
    B.fill(19, 15, 23, 15, 'f').fill(19, 20, 23, 20, 'f').fill(19, 15, 19, 20, 'f').fill(23, 15, 23, 20, 'f');
    B.put(2, 4, 'r').put(31, 5, 'r').put(32, 6, 'r').fill(30, 8, 33, 9, '.').fill(2, 24, 6, 25, '.');
    def({ id: 'ironridge', name: 'Ironridge City', kind: 'town', chapter: 6, rows: B.rows(), music: 'town', battle: 'city', center: { map: 'center_ironridge' },
      buildings: [{ b: 'center', x: 4, y: 6, to: 'center_ironridge' }, { b: 'mart', x: 10, y: 7, to: 'mart_ironridge' },
        { b: 'gym', x: 21, y: 5, to: 'gym6', variant: 5, needs: ['c6nova'], locked: 'c6gymLocked' },
        { b: 'house', x: 4, y: 16, to: 'c6house1', variant: 2 }, { b: 'house2', x: 10, y: 16, to: 'c6house2' }],
      furniture: [{ k: 'boxes', x: 20, y: 16 }, { k: 'boxes', x: 22, y: 16 }, { k: 'boxes', x: 21, y: 18 }, { k: 'machine', x: 20, y: 19 }],
      warps: [{ x: 30, y: 21, to: 'ironmine', tx: 13, ty: 20, dir: 'up' }],
      signs: [{ x: 2, y: 11, text: 'IRONRIDGE CITY\nForged in the heart of the mountains.' }, { x: 20, y: 11, text: 'IRONRIDGE GYM - Leader: NOVA\nThe engineer of unbreakable steel.' },
        { x: 25, y: 21, text: 'IRONRIDGE MINE\nHard hats past this point.' }, { x: 15, y: 4, text: 'NORTH: ROUTE 7\nTo the snowfields and the Skyspire.' }],
      props: [{ k: 'lamp', x: 15, y: 11 }, { k: 'lamp', x: 18, y: 11 }, { k: 'lamp', x: 3, y: 14 }, { k: 'lamp', x: 18, y: 21 }],
      edges: { w: { to: 'route6', dy: 0 }, n: { to: 'route7', dx: 0, needs: ['ch7'] } },
      items: [{ x: 33, y: 3, item: 'superpotion', n: 1, hidden: true }, { x: 34, y: 25, item: 'ultra', n: 1 }],
      npcs: [{ id: 'guide', x: 22, y: 11, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'c6guide' },
        { id: 'foreman', x: 15, y: 14, dir: 'right', look: L.c6miner, name: 'Foreman Doyle', talk: 'c6foreman' },
        { id: 'hiker', x: 18, y: 2, dir: 'left', look: L.hiker, name: 'Hiker Gus', talk: 'c6pass', show: ['!ch7'] },
        { id: 'grunt0', x: 33, y: 22, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c6grunt0', show: ['!c6kael'] },
        { id: 'kid', x: 20, y: 24, dir: 'down', look: L.kid, wander: 2, talk: 'c6kid' },
        { id: 'lady', x: 30, y: 11, dir: 'left', look: L.woman, wander: 1, talk: 'c6lady' },
        { id: 'miner1', x: 27, y: 24, dir: 'up', look: L.c6miner, name: 'Miner', talk: 'c6freed1', show: ['c6kael'] },
        { id: 'miner2', x: 8, y: 14, dir: 'down', look: L.c6miner, name: 'Miner', talk: 'c6freed2', show: ['c6kael'] }] });
  }
  center('center_ironridge', 'ironridge', { chapter: 6 });
  mart('mart_ironridge', 'ironridge', ['poke', 'great', 'ultra', 'superpotion', 'revive', 'fullheal', 'parlyzheal', 'burnheal', 'iceheal', 'repel'], { chapter: 6 });
  def({ id: 'c6house1', name: 'House', kind: 'inside', chapter: 6, outside: 'ironridge', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 1, y: 4 }],
    npcs: [{ id: 'wife', x: 6, y: 3, dir: 'left', look: L.woman, name: 'Hanna', talk: 'c6wife' }, { id: 'kid', x: 2, y: 2, dir: 'down', look: L.kid, name: 'Pip', talk: 'c6houseKid' }] });
  def({ id: 'c6house2', name: "Old Miner's house", kind: 'inside', chapter: 6, outside: 'ironridge', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'boxes', x: 6, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'oldminer', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Old Miner Tobias', talk: 'c6oldMiner' }] });

  // =====================================================================
  //  Ironridge Mine - three floors down to Kael's chamber
  // =====================================================================
  const mineEnc = (min, max) => ({ cave: { rate: 0.07, min, max, table: [['golbat', 22], ['graveler', 20], ['onix', 12], ['lairon', 12], ['dugtrio', 10], ['magnemite', 10], ['drilbur', 8], ['sableye', 6]] } });
  // ---- 1F: the entrance hall, rails and carts, miners made to dig
  {
    const B = grid(28, 22, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(12, 15, 14, 20); carve(13, 21, 13, 21);         // in from town
    carve(2, 10, 25, 14);                                 // the hall
    carve(3, 6, 5, 9); carve(3, 2, 10, 5);                // west: a tool room
    carve(21, 5, 23, 9); carve(19, 2, 25, 4);             // east: the shaft down
    B.fill(2, 12, 25, 12, 'h').fill(22, 5, 22, 11, 'h');  // rails
    B.put(24, 2, '>').put(16, 10, 'r').put(9, 14, 'r').put(3, 14, 'r');
    def({ id: 'ironmine', name: 'Ironridge Mine 1F', kind: 'cave', chapter: 6, rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.28, encounters: mineEnc(34, 37),
      warps: [{ x: 13, y: 21, to: 'ironridge', tx: 30, ty: 22, dir: 'down' }, { x: 24, y: 2, to: 'ironmine2', tx: 24, ty: 3, dir: 'down' }],
      furniture: [{ k: 'boxes', x: 6, y: 12, talk: 'c6cart' }, { k: 'boxes', x: 19, y: 12, talk: 'c6cart' }, { k: 'machine', x: 4, y: 2, talk: 'c6drill' }, { k: 'boxes', x: 20, y: 2 }],
      items: [{ x: 9, y: 3, item: 'ultra', n: 2 }, { x: 3, y: 9, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'minerA', x: 10, y: 10, dir: 'up', look: L.c6miner, name: 'Miner', talk: 'c6minerA', show: ['!c6kael'] },
        { id: 'minerB', x: 20, y: 14, dir: 'down', look: L.c6miner, name: 'Miner', talk: 'c6minerB', show: ['!c6kael'] },
        { id: 'grunt1', x: 7, y: 11, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c6grunt1' },
        { id: 'grunt2', x: 22, y: 8, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c6grunt2' }] });
  }
  // ---- B1F: winding tunnels and an underground pool
  {
    const B = grid(28, 22, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(19, 2, 25, 5);                                  // in from 1F
    carve(21, 5, 23, 12); carve(7, 11, 23, 13);           // down and west
    carve(7, 4, 9, 11); carve(3, 3, 9, 5);                // a side room up north
    carve(14, 13, 16, 18); carve(2, 17, 16, 19);          // south to the stairs
    carve(17, 15, 21, 19, '~');                           // the pool
    B.fill(7, 12, 23, 12, 'h').put(24, 2, '<').put(2, 18, '>');
    def({ id: 'ironmine2', name: 'Ironridge Mine B1F', kind: 'cave', chapter: 6, rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.32, encounters: mineEnc(35, 38),
      warps: [{ x: 24, y: 2, to: 'ironmine', tx: 24, ty: 3, dir: 'down' }, { x: 2, y: 18, to: 'ironmine3', tx: 3, ty: 19, dir: 'right' }],
      furniture: [{ k: 'boxes', x: 19, y: 2 }, { k: 'boxes', x: 12, y: 11, talk: 'c6cart' }],
      items: [{ x: 3, y: 3, item: 'revive', n: 1 }, { x: 25, y: 5, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'grunt3', x: 15, y: 12, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c6grunt3' },
        { id: 'grunt4', x: 8, y: 18, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c6grunt4' },
        { id: 'minerC', x: 5, y: 4, dir: 'right', look: L.c6miner, name: 'Miner', talk: 'c6minerC', show: ['!c6kael'] }] });
  }
  // ---- B2F: Kael's chamber; a long dead-end tunnel hides a Meteor Shard
  {
    const B = grid(30, 22, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(2, 18, 20, 20);                                 // in from B1F
    carve(17, 8, 19, 18);                                 // the shaft up to the chamber
    carve(9, 2, 26, 7);                                   // the chamber
    carve(2, 10, 4, 17); carve(2, 7, 7, 9);               // west: an old working
    carve(21, 19, 27, 19); carve(26, 10, 27, 19);         // east: the deep tunnel (a dead end)
    B.fill(18, 8, 18, 20, 'h').put(2, 19, '<').put(12, 6, 'r').put(24, 7, 'r').put(3, 13, 'r');
    def({ id: 'ironmine3', name: 'Ironridge Mine B2F', kind: 'cave', chapter: 6, rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.36, encounters: mineEnc(36, 38),
      warps: [{ x: 2, y: 19, to: 'ironmine2', tx: 3, ty: 18, dir: 'right' }],
      zones: [{ x: 17, y: 9, w: 3, h: 1, event: 'c6kael' }],
      furniture: [{ k: 'machine', x: 10, y: 2, talk: 'c6drill' }, { k: 'boxes', x: 24, y: 2, talk: 'c6crates' }, { k: 'boxes', x: 25, y: 2, talk: 'c6crates' }],
      items: [{ x: 27, y: 10, item: 'shard', n: 1, hidden: true }, { x: 7, y: 8, item: 'rarecandy', n: 1 }],
      npcs: [{ id: 'kael', x: 18, y: 4, dir: 'up', look: L.admin, name: 'Admin Kael', talk: 'c6kael', show: ['!c6kael'] },
        { id: 'grunt5', x: 16, y: 4, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'c6kael', show: ['!c6kael'] },
        { id: 'grunt6', x: 20, y: 4, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'c6kael', show: ['!c6kael'] },
        { id: 'nova', x: 14, y: 3, dir: 'right', look: L.c6nova, name: 'Nova', talk: 'c6novaMine', show: ['!c6nova'] },
        { id: 'minerD', x: 23, y: 5, dir: 'left', look: L.c6miner, name: 'Miner Sal', talk: 'c6minerD' }] });
  }

  // =====================================================================
  //  Ironridge Gym - a steel maze; ledges only lead back down
  // =====================================================================
  def({ id: 'gym6', name: 'Ironridge Gym', kind: 'inside', gym: true, chapter: 6, outside: 'ironridge', battle: 'stadium', music: 'gym', arrive: { x: 8, y: 17 },
    rows: ['#################',
      '#hhhhRRRRRRRhhhh#',
      '#hhhhRRRRRRRhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#vvvv########hhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhh########vvvv#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#vvvv########hhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhh#########vvv#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhh#',
      '########m########'],
    furniture: [{ k: 'statue', x: 6, y: 16, talk: 'c6statue' }, { k: 'statue', x: 10, y: 16, talk: 'c6statue' }, { k: 'machine', x: 1, y: 1 }, { k: 'machine', x: 14, y: 1 }],
    npcs: [{ id: 'g1', x: 14, y: 12, dir: 'left', look: L.worker, name: 'Worker Hal', trainer: 'c6g1' },
      { id: 'g2', x: 2, y: 9, dir: 'right', look: L.c6engineer, name: 'Engineer Bryn', trainer: 'c6g2' },
      { id: 'g3', x: 14, y: 6, dir: 'left', look: L.c6engineer, name: 'Engineer Mace', trainer: 'c6g3' },
      { id: 'nova', x: 8, y: 2, dir: 'down', look: L.c6nova, name: 'Leader Nova', trainer: 'c6nova' }] });

  // =====================================================================
  //  Events
  // =====================================================================
  // ---- Route 6
  on('c6r6man', {}, (J, n) => J.say(J.flag('c6kael') ? 'The mine is singing again - picks and carts! That\'s the sound of Ironridge, kid.' : ['I\'ve prospected these hills for fifty years. Never seen the mine go quiet like this.', 'Folks say people in purple took it over. Team Eclipse, digging for those glowing purple rocks.'], n));
  // Sora's fourth battle, near the east end of the route
  on('c6sora', { needs: ['!c6sora'], sets: ['c6sora'] }, async J => {
    await J.emote('sora', '!');
    await J.say(['{NAME}! I knew you\'d come this way!', 'I went up to Ironridge to challenge the gym - locked! And there are Eclipse grunts at the mine.', 'Before we deal with them... battle me. I want to know if I can keep up with you!'], 'sora');
    const rs = J.get('rivalStarter') || 'eevee';
    await J.battle({ id: 'c6sora', name: 'Sora', look: 'sora', team: [['staraptor', 40], ['luxray', 40], ['lucario', 41], [J.grown(rs, 42), 42]], pay: 50, theme: 'forest', canLose: true, before: 'All four of us - full power!', lose: 'Gah! You\'re still ahead of me!', win: 'Yes! I finally caught up!' });
    await J.say(J.lastWin() ? ['You and your team move like one. I\'m starting to get what Professor Hazel means about bonds...', 'Go clean out that mine. I\'ll train out here - next time, I win!'] : ['Hah! Don\'t look so down - you made me sweat for it.', 'Go clean out that mine. I\'ll be right behind you!'], 'sora');
    await J.walk('sora', ['right', 3]);
    J.set('c6sora'); J.refresh();
  });
  // ---- Ironridge City
  on('c6gymLocked', {}, J => J.say('The door is locked. A sign hangs on it: "CLOSED. The Leader is at the mine. - Ironridge Gym"'));
  on('c6guide', {}, (J, n) => J.say(J.flag('badge.iron') ? 'You beat Nova! The Iron Badge - harder to earn than any badge in Valoria, if you ask me!' : J.flag('c6nova') ? 'Nova is back! She uses Steel types: Fire, Fighting and Ground moves are your best friends. Her Steelix is part Ground - Water and Grass work on it too!' : 'Nova went into the mine to face Team Eclipse herself, three days ago. She hasn\'t come out. The gym stays shut until she does.', n));
  on('c6foreman', {}, (J, n) => J.say(J.flag('c6kael') ? ['My crew is home safe, every last one. And the Leader too.', 'Ironridge won\'t forget this, kid. If you ever need iron, you know where to dig.'] : ['I\'m Doyle, foreman of the Ironridge Mine. Was, anyway.', 'Team Eclipse marched in with their Admin and put my crew to work digging for Meteor Shards.', 'Nova - our Gym Leader, she runs the mine - went down to stop them. They kept her too.', 'The entrance is in the cliff, east of the yard. Please... bring them home.'], n));
  on('c6pass', { needs: ['!ch7'] }, (J, n) => J.say(J.flag('badge.iron') ? 'The snow\'s easing off. You\'ll be heading north soon, I bet.' : ['Route 7 runs north from here, over the pass and into the snowfields.', 'Pass is snowed in right now. The road crew won\'t clear it till the mine is running again.'], n));
  on('c6kid', {}, (J, n) => J.say(J.flag('c6kael') ? 'My dad\'s home! He says a kid my age chased off Team Eclipse. Was that you?!' : 'My dad\'s a miner. He didn\'t come home last night...', n));
  on('c6lady', {}, (J, n) => J.say(J.flag('c6kael') ? 'The furnaces are lit again. Ironridge is back to work!' : 'Ironridge steel builds the trains, the ferries, the power plant in Voltara... Without the mine, the whole region slows down.', n));
  on('c6freed1', {}, (J, n) => J.say(['Three days of digging with a grunt breathing down my neck!', 'Then that Admin just... told everyone to go home. Said a kid changed his mind.'], n));
  on('c6freed2', {}, (J, n) => J.say('Feels good to see the sky again. Thanks, kid.', n));
  on('c6wife', { sets: ['c6gift'] }, async (J, n) => {
    if (!J.flag('c6kael')) return J.say('My husband is a miner. Team Eclipse is holding the whole crew down there... I can\'t eat, I can\'t sleep.', n);
    if (J.flag('c6gift')) return J.say('He\'s asleep upstairs, snoring like a Snorlax. I\'ve never been so glad to hear it.', n);
    await J.say('You\'re the one who went into the mine! My husband is home because of you. Please, take this.', n);
    await J.give('revive', 2); J.set('c6gift');
  });
  on('c6houseKid', {}, (J, n) => J.say('When I grow up, I\'m gonna work for Nova! She can fix anything with a wrench and a Magneton.', n));
  on('c6oldMiner', { sets: ['c6tm'] }, async (J, n) => {
    if (J.flag('c6tm')) return J.say('Iron Head... hard as the mountain. Teach it to a Pokémon with a thick skull!', n);
    await J.say(['Sixty years I swung a pick in that mountain. These old bones are done with it.', 'You look like someone who doesn\'t back down. Here - a little something from my mining days.'], n);
    await J.give('tm:iron-head'); J.set('c6tm');
  });
  // ---- the mine
  on('c6minerA', {}, (J, n) => J.say(['*clang* *clang* ...Keep your voice down! That grunt is watching.', 'They make us dig for glowing rocks all day. The Admin is down on the bottom floor - B2F.'], n));
  on('c6minerB', {}, (J, n) => J.say('Nova told them she\'d never help them. So they took her Pokémon and locked her up with the Admin.', n));
  on('c6minerC', {}, (J, n) => J.say(['They found a shard on this floor yesterday. Took it straight down to the Admin.', 'Some of us heard a hum from the deep east tunnel on B2F too... We didn\'t tell them.'], n));
  on('c6minerD', {}, (J, n) => J.say(J.flag('c6kael') ? ['I\'m staying a moment to shut the drills down. Then home!', 'There\'s an old tunnel east of the stairs, going way north. We always said it hums at night.'] : 'Shh! Don\'t let the Admin see you talking to me!', n));
  on('c6cart', {}, J => J.say(J.pick(['A mine cart full of rubble. Somewhere under it, something purple glints... no, just a beetle.', 'A mine cart. "PROPERTY OF IRONRIDGE MINE" is stamped on the side - with "ECLIPSE" painted over it.'])));
  on('c6drill', {}, J => J.say(J.flag('c6kael') ? 'A big drilling rig. It\'s switched off now.' : 'A big drilling rig, roaring away. A sticker on it reads: "Shard detector - Team Eclipse R&D".'));
  on('c6crates', {}, J => J.say(J.flag('c6kael') ? 'The crates are empty. Kael must have taken whatever was inside.' : 'Crates stamped with an eclipse. They hum faintly.'));
  // ---- B2F: Admin Kael, for the last time
  on('c6kael', { needs: ['!c6kael'], sets: ['c6kael'], battles: ['c6admin'] }, async J => {
    await J.say('Dig faster. The Director wants every shard in this mountain before the Skyspire is ready.', 'kael');
    await J.say('Take my mine if you must, Kael. My Pokémon will never dig for you.', 'nova');
    await J.face('kael', 'down'); await J.face('grunt5', 'down'); await J.face('grunt6', 'down');
    await J.emote('kael', '!');
    await J.say('Admin Kael! It\'s the kid! The one from Seacliff Cave!', 'grunt5');
    await J.say(['...Of course it is. Seacliff Cave. The power plant in Voltara. And now here.', 'Every time, I tell myself it was luck. One more battle, kid. Let\'s settle it.'], 'kael');
    if (await J.battle('c6admin', 'kael') !== 'win') return;
    await J.say(['...', 'I\'ve watched you and your Pokémon fight for each other three times now. Vex is wrong.', 'He says the bond is a weakness - that the meteor\'s raw power will eclipse it. But I just lost to that bond. Again.'], 'kael');
    await J.say('Admin Kael...? What do we do?', 'grunt6');
    await J.say(['Put the tools down. Let the miners go home. Give the Leader back her Poké Balls.', 'I\'m done with Team Eclipse. So are you, if you have any sense.'], 'kael');
    await J.fade(() => { J.hideNpc('grunt5'); J.hideNpc('grunt6'); });
    await J.say(['One more thing, kid. Vex doesn\'t need many more shards. He\'s heading for the Skyspire, in the frozen north.', 'When the shards are all in place, he\'ll wake what sleeps inside the meteor. If anyone can stop him there... it\'s probably you.'], 'kael');
    await J.fade(() => { J.set('c6kael'); J.refresh(); });
    await J.say('Kael is gone. Down the tunnels, the miners are putting down their picks!');
  });
  on('c6novaMine', { needs: ['c6kael'], sets: ['c6nova'] }, async (J, n) => {
    if (!J.flag('c6kael')) return J.say('Get out of here while you can! That Admin is dangerous!', n);
    await J.say(['So Kael walked away. I didn\'t think he had it in him... or that anyone could make him.', 'I\'m Nova. I run this mine, and the Ironridge Gym. You have my thanks - and my crew\'s.'], n);
    await J.say(['My Pokémon are back where they belong. I\'ll open the gym again right away.', 'Come and challenge me, {NAME}. I\'d like to see that bond of yours from the other side of the field.'], n);
    await J.fade(() => { J.set('c6nova'); J.refresh(); });
  });
  // ---- after Nova: the Iron Badge
  on('c6novaWin', { sets: ['badge.iron', 'ch7'] }, async J => {
    await J.say('A flawless weld. Take it - the Iron Badge.', 'nova');
    J.badge('iron');
    await J.give('tm:flash-cannon');
    await J.say(['That TM holds Flash Cannon: a beam of light off polished steel. Use it well.', 'Kael told me where Vex is going. The Skyspire stands beyond Route 7, past the snow town in the north.', 'My crew cleared the pass this morning. Ivy and the Glacier Badge are up there - and so is whatever Vex is planning. Go, {NAME}.'], 'nova');
    await J.chapter('Chapter 6 complete!', 'Next: Chapter 7 - The Skyspire');
    J.set('ch7'); J.refresh();
    await J.chapter('Chapter 7', 'The Skyspire');
  });
  on('c6statue', {}, J => J.say(J.flag('badge.iron') ? 'IRONRIDGE POKéMON GYM - LEADER: NOVA\nWinning trainers: {NAME}' : 'IRONRIDGE POKéMON GYM - LEADER: NOVA\nWinning trainers this year: none. The steel holds.'));

  chapter({ n: 6, title: 'Iron Will', start: { map: 'route6', x: 1, y: 12, dir: 'right' }, level: 39, badge: 'iron', center: 'center_ironridge',
    goals: ['c6sora', 'c6kael', 'c6nova', 'badge.iron', 'ch7'] });
})();
