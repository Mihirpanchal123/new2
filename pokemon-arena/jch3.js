'use strict';
// =====================================================================
//  JOURNEY - Chapter 3: Sparks of Voltara. The ferry from Port Coralis
//  lands in Voltara City in the middle of a blackout: Team Eclipse is
//  draining the Power Plant up Route 3 to charge a "Resonance Engine"
//  that wakes the Meteor Shards. Mila, the Electric leader, went after
//  them; the gym stays locked until the power is back.
// =====================================================================
(() => {
  const { def, grid, L, center, mart } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- new people
  Object.assign(L, {
    c3mila: { hat: 'bandana', hatColor: 0xffd84a, hair: 0xf0c030, hairStyle: 'pigtails', top: 0xf0a030, sleeves: 'short', inner: 0x3a3a48, legs: 0xf0a030, legStyle: 'pants', shoes: 0x3a3a48, bag: 0x5a5a68 },
    c3rocker: { hat: null, hair: 0x2a2a3a, hairStyle: 'spiky', top: 0x3a3a48, sleeves: 'none', inner: 0xe04848, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0xe04848, bag: null, scarf: 0xffd84a }
  });

  // ---- items
  ITEMS['tm:thunderbolt'] = ITEMS['tm:thunderbolt'] || { name: 'TM Thunderbolt', pocket: 'tms', price: 0, tm: 'thunderbolt', desc: 'Teaches Thunderbolt: a strong electric blast that may paralyze.' };
  ITEMS['tm:shock-wave'] = ITEMS['tm:shock-wave'] || { name: 'TM Shock Wave', pocket: 'tms', price: 0, tm: 'shock-wave', desc: 'Teaches Shock Wave: a quick jolt of electricity that never misses.' };

  // ---- trainers
  Object.assign(TRAINERS, {
    // Route 3
    c3jett: { team: [['pikachu', 22], ['electrike', 23]], pay: 20, theme: 'forest', before: 'The city\'s dark, so I\'m bringing my own spark! One, two, three, FOUR!', lose: 'Snapped a string...', after: 'No power, no amp. I\'ll be out here jamming till Mila fixes the plant.' },
    c3gus: { team: [['geodude', 22], ['rhyhorn', 23]], pay: 20, theme: 'forest', before: 'Electric types can\'t touch my rocks! Can you?', lose: 'Ground down to gravel...', after: 'Ground types shrug off Electric moves. Bring one to the gym if you can!' },
    c3sue: { team: [['buneary', 22], ['flaaffy', 23]], pay: 18, theme: 'forest', before: 'My picnic lights won\'t turn on! Battle me while I sulk!', lose: 'Even my Flaaffy\'s wool went flat.', after: 'Flaaffy\'s fluff stores electricity. It\'s been tingly all day, like something up north is pulling on it.' },
    c3volt: { team: [['magnemite', 23], ['porygon', 24]], pay: 22, theme: 'forest', before: 'I work at the plant! Well, I did, till those purple goons threw us out. I need to blow off some steam!', lose: 'Short-circuited...', after: 'The goons put up some kind of field in the turbine hall. It runs off the plant\'s own breakers, I bet.' },
    // Team Eclipse at the Power Plant
    c3grunt1: { team: [['zubat', 23], ['murkrow', 24]], pay: 40, theme: 'forest', look: 'grunt', name: 'Eclipse Grunt', before: 'The Power Plant is closed. Team Eclipse is "doing maintenance". Beat it!', lose: 'Ugh, Kael\'s gonna fry me.', after: 'Fine, go in. The field will stop you anyway.' },
    c3grunt2: { team: [['croagunk', 24], ['sandile', 25]], pay: 40, theme: 'city', look: 'grunt', name: 'Eclipse Grunt', before: 'Hands off that breaker! It keeps the field up!', lose: 'Oops. Maybe I shouldn\'t have said that.', after: 'Pull that breaker and the Admin will hear about it... from me... after I run.' },
    c3grunt3: { team: [['golbat', 24], ['houndour', 25]], pay: 40, theme: 'city', look: 'grunt', name: 'Eclipse Grunt', before: 'You made it past the gate? You won\'t make it past ME!', lose: 'I made it past nothing...', after: 'The Resonance Engine is upstairs. It\'s drinking the whole city\'s power.' },
    c3gruntE: { team: [['murkrow', 25], ['golbat', 26]], pay: 40, theme: 'city', look: 'grunt', name: 'Eclipse Grunt', before: 'Nobody touches the Engine!', lose: 'The Admin is gonna... oh no, he\'s watching.' },
    c3kael: { team: [['golbat', 26], ['houndour', 26], ['croagunk', 27], ['sableye', 28]], pay: 60, theme: 'city', look: 'admin', name: 'Admin Kael', before: 'Power is all that matters. Let me show you.', lose: '...Again?' },
    // Voltara Gym
    c3g1: { team: [['magnemite', 24], ['elekid', 25]], pay: 24, theme: 'stadium', before: 'Welcome to the grid! Every fence in here is live - mind your step!', lose: 'Blew a fuse!', after: 'Mila\'s Pokémon are fast. Ground types are the safest bet - Electric moves can\'t touch them.' },
    c3g2: { team: [['electrike', 24], ['luxio', 26]], pay: 24, theme: 'stadium', before: 'This is my stage, and you\'re my opening act!', lose: 'Booed off my own stage...', after: 'Magneton is part Steel. Fire and Fighting moves melt it.' },
    c3g3: { team: [['pikachu', 25], ['flaaffy', 26]], pay: 24, theme: 'stadium', before: 'Last stop before the boss. Mila saved the city - and you helped. Show me why!', lose: 'Okay, you\'re the real deal.', after: 'Go on. Mila\'s been bouncing on her heels waiting for you.' },
    mila: { team: [['magneton', 26], ['luxio', 27], ['manectric', 28], ['electabuzz', 29]], pay: 100, theme: 'stadium', gym: 2, onWin: 'c3milaWin', look: 'c3mila', name: 'Leader Mila', before: 'You got my city\'s lights back on - now let\'s see how bright YOU shine! Full voltage, no fuses!', lose: 'Wow... my circuits are fried. You\'re electric, you know that?', after: 'Route 4 runs east of town, up toward Mt. Cinder. Taro\'s Fire Gym is up there - pack some Water moves!' }
  });

  // =====================================================================
  //  Voltara City - a harbor city of lights (dark for now): Pokémon Center,
  //  Mart, the Electric gym, a substation; Route 3 north, Route 4 east
  // =====================================================================
  {
    const B = grid(36, 26, '.').border('T', { n: [17, 18], e: [14, 15] });
    B.fill(0, 21, 35, 25, '~').fill(1, 20, 34, 20, ':');
    B.fill(17, 21, 18, 24, '_');                                       // the ferry pier
    B.fill(17, 0, 18, 20, ',').fill(1, 14, 35, 15, ',');               // the two avenues: north to Route 3, east to Route 4
    B.fill(5, 13, 6, 13, ',').put(13, 13, ',').fill(25, 13, 26, 13, ',');
    // a little park with a pond in the north-west
    B.fill(2, 2, 6, 3, '*').fill(10, 3, 13, 5, '~').fill(9, 2, 14, 2, ':').fill(9, 6, 14, 6, ':').fill(9, 3, 9, 5, ':').fill(14, 3, 14, 5, ':');
    B.put(2, 5, 'T').put(15, 2, 'T').put(7, 6, 'T');
    // the substation (fenced, a gate in its south side)
    B.fill(22, 1, 33, 5, 'f').fill(23, 2, 32, 4, 'h').fill(27, 5, 28, 5, 'h');
    B.fill(30, 7, 33, 9, '*').fill(10, 17, 13, 18, '*').fill(20, 17, 22, 18, '*');
    def({ id: 'voltara', name: 'Voltara City', kind: 'town', rows: B.rows(), music: 'town', battle: 'city', center: { map: 'center_voltara' }, chapter: 3,
      dock: { x: 17, y: 22, dir: 'up' },
      buildings: [{ b: 'center', x: 3, y: 8, to: 'center_voltara' }, { b: 'mart', x: 11, y: 9, to: 'mart_voltara' },
        { b: 'gym', x: 22, y: 7, to: 'gym3', variant: 2, needs: ['mila_back'], locked: 'c3gymLocked' },
        { b: 'house', x: 4, y: 16, to: 'voltara_house1', variant: 2 }, { b: 'house2', x: 25, y: 16, to: 'voltara_house2' }],
      furniture: [{ k: 'machine', x: 24, y: 2, talk: 'c3substation' }, { k: 'machine', x: 30, y: 2, talk: 'c3substation' }],
      signs: [{ x: 16, y: 16, text: 'VOLTARA CITY\nThe city that never sleeps... or goes dark.' }, { x: 21, y: 13, text: 'VOLTARA GYM - Leader: MILA\nThe spark that lights up the city.' },
        { x: 16, y: 20, text: 'FERRY PIER\nPort Coralis - daily sailings.' }, { x: 19, y: 1, text: 'NORTH: ROUTE 3\nVoltara Power Plant' },
        { x: 33, y: 13, text: 'EAST: ROUTE 4\nTo Mt. Cinder.' }, { x: 26, y: 6, text: 'VOLTARA SUBSTATION 3\nDanger: high voltage!' }],
      props: [{ k: 'lamp', x: 2, y: 13 }, { k: 'lamp', x: 10, y: 13 }, { k: 'lamp', x: 16, y: 13 }, { k: 'lamp', x: 20, y: 13 }, { k: 'lamp', x: 31, y: 13 },
        { k: 'lamp', x: 2, y: 16 }, { k: 'lamp', x: 15, y: 18 }, { k: 'lamp', x: 20, y: 16 }, { k: 'lamp', x: 31, y: 16 }],
      edges: { n: { to: 'route3', dx: -4 }, e: { to: 'route4', dy: 0, needs: ['ch4'] } },
      // the top of the pier: the only way off it, so the welcome always plays
      zones: [{ x: 17, y: 21, w: 2, h: 1, event: 'c3arrive' }],
      items: [{ x: 33, y: 7, item: 'superpotion', n: 1 }, { x: 34, y: 20, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'ferry', x: 18, y: 24, dir: 'up', look: L.sailor, name: 'Ferryman', talk: 'c3ferry' },
        { id: 'guide', x: 23, y: 13, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'c3gymGuide' },
        { id: 'guard', x: 34, y: 14, dir: 'left', look: L.worker, name: 'Road Crew', talk: 'c3guard', show: ['!ch4'] },
        { id: 'worker', x: 27, y: 3, dir: 'down', look: L.worker, name: 'Lineman Sparks', talk: 'c3vWorker' },
        { id: 'kid', x: 9, y: 17, dir: 'down', look: L.kid, wander: 2, talk: 'c3vKid' },
        { id: 'lady', x: 14, y: 7, dir: 'down', look: L.woman, wander: 2, talk: 'c3vLady' }] });
    // the blackout: the city sits in the dark until Mila restores the power (read every frame by the renderer)
    Object.defineProperty(JMaps.M.voltara, 'dark', { get() { try { return Journey._G().flags.mila_back ? 0 : 0.2; } catch (e) { return 0.2; } }, configurable: true });
  }
  center('center_voltara', 'voltara', { chapter: 3 });
  mart('mart_voltara', 'voltara', ['poke', 'great', 'ultra', 'potion', 'superpotion', 'parlyzheal', 'awakening', 'burnheal', 'fullheal', 'revive', 'repel', 'thunderstone'], { chapter: 3 });
  def({ id: 'voltara_house1', name: "Ohm's workshop", kind: 'inside', outside: 'voltara', chapter: 3, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'c3invention' }, { k: 'shelf', x: 4, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'desk', x: 1, y: 4 }],
    npcs: [{ id: 'ohm', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Inventor Ohm', talk: 'c3ohm' }, { id: 'kid', x: 6, y: 5, dir: 'up', look: L.lass, name: 'Watt', talk: 'c3ohmKid' }] });
  def({ id: 'voltara_house2', name: 'House', kind: 'inside', outside: 'voltara', chapter: 3, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'c3tv' }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'mom', x: 6, y: 3, dir: 'left', look: L.woman, name: 'Lumi', talk: 'c3lumi' }, { id: 'dad', x: 1, y: 5, dir: 'right', look: L.man, name: 'Ben', talk: 'c3ben' }] });

  // =====================================================================
  //  Route 3 - north from Voltara to the fenced Power Plant
  // =====================================================================
  {
    const B = grid(28, 44, '.').border('T', { s: [13, 14] });
    B.fill(1, 1, 3, 42, 'T').fill(24, 1, 26, 42, 'T');
    // the plant's yard: fenced, metal underfoot, a gate in the middle
    B.fill(4, 1, 23, 10, 'T').fill(5, 1, 22, 10, 'f').fill(6, 2, 21, 9, 'h').fill(13, 10, 15, 10, ',');
    // the road: up from the city, west, back east, and north to the gate
    B.fill(13, 36, 14, 43, ',').fill(6, 35, 14, 36, ',').fill(6, 26, 7, 36, ',').fill(6, 26, 19, 27, ',').fill(18, 17, 19, 27, ',').fill(13, 17, 19, 18, ',').fill(13, 11, 14, 18, ',');
    // tall grass
    B.fill(16, 32, 22, 40, ';').fill(8, 38, 12, 41, ';').fill(9, 29, 15, 33, ';').fill(4, 19, 11, 24, ';').fill(20, 12, 23, 16, ';');
    // a ledge: a quick way down from the meadow to the south
    B.fill(16, 31, 23, 31, 'v');
    // a nook in the west trees behind a small tree (Cut)
    B.fill(1, 31, 2, 33, '.').put(3, 32, 'X');
    B.fill(5, 12, 8, 13, '*').fill(20, 20, 22, 21, 'T').fill(9, 14, 10, 15, 'T').put(16, 24, 'r').put(10, 16, 'r').put(22, 25, 'r');
    def({ id: 'route3', name: 'Route 3', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest', chapter: 3,
      encounters: { tall: { rate: 0.12, min: 18, max: 22, table: [['electrike', 18], ['mareep', 16], ['shinx', 14], ['magnemite', 12], ['machop', 10], ['pikachu', 8], ['growlithe', 8], ['ponyta', 8], ['pidgeotto', 6]] } },
      edges: { s: { to: 'voltara', dx: 4 } },
      buildings: [{ b: 'lab', x: 11, y: 3, to: 'powerplant' }],
      furniture: [{ k: 'machine', x: 7, y: 3, talk: 'c3transformer' }, { k: 'machine', x: 19, y: 3, talk: 'c3transformer' }],
      // Sora: across the whole width of the route, so there is no way past her
      zones: [{ x: 4, y: 22, w: 20, h: 1, event: 'c3rival' }],
      signs: [{ x: 15, y: 41, text: 'ROUTE 3\nVoltara City - Voltara Power Plant' }, { x: 12, y: 8, text: 'VOLTARA POWER PLANT\nKeeping Valoria bright for fifty years.' }],
      items: [{ x: 4, y: 11, item: 'tm:shock-wave', n: 1 }, { x: 23, y: 38, item: 'great', n: 2 }, { x: 1, y: 31, item: 'ultra', n: 2 },
        { x: 2, y: 33, item: 'shard', n: 1, hidden: true }, { x: 23, y: 12, item: 'revive', n: 1, hidden: true }, { x: 20, y: 2, item: 'superpotion', n: 1, hidden: true }],
      npcs: [{ id: 'jett', x: 9, y: 34, dir: 'down', look: L.c3rocker, name: 'Guitarist Jett', trainer: 'c3jett' },
        { id: 'gus', x: 4, y: 28, dir: 'right', look: L.hiker, name: 'Hiker Gus', trainer: 'c3gus' },
        { id: 'sue', x: 21, y: 29, dir: 'left', look: L.picnicker, name: 'Picnicker Sue', trainer: 'c3sue' },
        { id: 'volt', x: 16, y: 16, dir: 'down', look: L.worker, name: 'Engineer Volt', trainer: 'c3volt' },
        { id: 'grunt', x: 16, y: 11, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c3grunt1' },
        { id: 'plantman', x: 12, y: 12, dir: 'down', look: L.aide, name: 'Plant Worker', talk: 'c3plantWorker' },
        { id: 'sora', x: 18, y: 20, dir: 'down', look: L.sora, name: 'Sora', talk: 'c3rival', show: ['!rival3'] }] });
  }

  // =====================================================================
  //  Voltara Power Plant - the turbine hall. Team Eclipse sealed the stairs
  //  to the control room with an energy field fed by three breakers.
  // =====================================================================
  {
    const W = '#' + 'h'.repeat(22) + '#';
    const rows = [
      '########################',
      '#hhhhh#hhhhh<hhhh#hhhhh#',
      '#hhhhh#hhhhhhhhhh#hhhhh#',
      '#hhhhh#hhhhhhhhhh#hhhhh#',
      '#hhhhh#hhhhhhhhhh#hhhhh#',
      '##hh#######PP#######hh##',
      W, W, W, W, W, W, W,
      '#' + 'h'.repeat(17) + '######',      // a wall shuts off the south-east corner (breaker C)
      W, W, W,
      '############m###########'];
    def({ id: 'powerplant', name: 'Voltara Power Plant', kind: 'inside', outside: 'route3', chapter: 3, rows, battle: 'city', music: 'forest', arrive: { x: 12, y: 16 },
      furniture: [{ k: 'pc', x: 1, y: 1, talk: 'c3brkA' }, { k: 'pc', x: 22, y: 1, talk: 'c3brkB' }, { k: 'pc', x: 22, y: 16, talk: 'c3brkC' },
        { k: 'machine', x: 8, y: 1, talk: 'c3generator' }, { k: 'machine', x: 15, y: 1, talk: 'c3generator' },
        { k: 'machine', x: 3, y: 8, talk: 'c3turbine' }, { k: 'machine', x: 7, y: 8, talk: 'c3turbine' }, { k: 'machine', x: 15, y: 8, talk: 'c3turbine' }, { k: 'machine', x: 19, y: 8, talk: 'c3turbine' },
        { k: 'machine', x: 3, y: 11, talk: 'c3turbine' }, { k: 'machine', x: 7, y: 11, talk: 'c3turbine' }, { k: 'machine', x: 15, y: 11, talk: 'c3turbine' }, { k: 'machine', x: 19, y: 11, talk: 'c3turbine' },
        { k: 'boxes', x: 1, y: 6 }, { k: 'boxes', x: 22, y: 6 }],
      signs: [{ x: 13, y: 6, text: 'DANGER - SECURITY FIELD\nFed by the plant\'s breakers. Property of Team Eclipse.' }],
      warps: [{ x: 12, y: 1, to: 'powerplant2', tx: 9, ty: 11, dir: 'up' }],
      // the field: it throws you back until the three breakers are off
      zones: [{ x: 11, y: 5, w: 2, h: 1, event: 'c3barrier', block: true }],
      items: [{ x: 5, y: 1, item: 'revive', n: 1 }, { x: 18, y: 1, item: 'fullheal', n: 1 }, { x: 1, y: 16, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'mila', x: 10, y: 7, dir: 'up', look: L.c3mila, name: 'Mila', talk: 'c3milaPlant', show: ['!c3kael'] },
        { id: 'grunt2', x: 3, y: 2, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c3grunt2' },
        { id: 'grunt3', x: 20, y: 2, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c3grunt3' }] });
  }
  // ---- the control room upstairs: the Resonance Engine
  {
    const W = '#' + 'h'.repeat(16) + '#';
    const rows = ['##################', W, W, '#hhhhRRRRRRRRhhhh#', '#hhhhRRRRRRRRhhhh#', W, W, W, W, W, W, W, '#hhhhhhhh>hhhhhhh#', '##################'];
    def({ id: 'powerplant2', name: 'Control Room', kind: 'inside', chapter: 3, rows, battle: 'city', music: 'forest',
      furniture: [{ k: 'machine', x: 8, y: 1, talk: 'c3engine' }, { k: 'machine', x: 4, y: 1, talk: 'c3console' }, { k: 'machine', x: 12, y: 1, talk: 'c3console' },
        { k: 'desk', x: 1, y: 9 }, { k: 'pc', x: 16, y: 9, talk: 'c3console' }],
      warps: [{ x: 9, y: 12, to: 'powerplant', tx: 12, ty: 2, dir: 'down' }],
      zones: [{ x: 1, y: 7, w: 16, h: 1, event: 'c3kael' }],
      items: [{ x: 15, y: 1, item: 'shard', n: 1 }],
      npcs: [{ id: 'kael', x: 9, y: 3, dir: 'up', look: L.admin, name: 'Admin Kael', talk: 'c3kael', show: ['!c3kael'] },
        { id: 'grunt', x: 7, y: 3, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'c3kael', show: ['!c3kael'] },
        { id: 'mila', x: 10, y: 10, dir: 'up', look: L.c3mila, name: 'Mila', talk: 'c3milaCore', show: ['c3kael', '!mila_back'] }] });
  }

  // =====================================================================
  //  Voltara Gym - a maze of live fences; Mila waits at the top
  // =====================================================================
  {
    const O = '#' + 'h'.repeat(15) + '#', S = '#hhhhhhhfhhhhhhh#';
    const rows = ['#################', '#hhhhhRRRRRhhhhh#', '#hhhhhRRRRRhhhhh#', O, O,
      '#hhhhfffffffffff#', O, S, '#fffffffffffhhhh#', O, S, '#hhhhfffffffffff#', O, S, '#fffffffffffhhhh#', O, O, O, '########m########'];
    def({ id: 'gym3', name: 'Voltara Gym', kind: 'inside', gym: true, outside: 'voltara', chapter: 3, rows, battle: 'stadium', music: 'gym', arrive: { x: 8, y: 17 },
      furniture: [{ k: 'statue', x: 6, y: 16, talk: 'c3gymStatue' }, { k: 'statue', x: 10, y: 16, talk: 'c3gymStatue' }, { k: 'machine', x: 1, y: 1 }, { k: 'machine', x: 14, y: 1 }],
      npcs: [{ id: 'ampere', x: 3, y: 13, dir: 'right', look: L.worker, name: 'Engineer Ampere', trainer: 'c3g1' },
        { id: 'riff', x: 13, y: 10, dir: 'left', look: L.c3rocker, name: 'Guitarist Riff', trainer: 'c3g2' },
        { id: 'coil', x: 3, y: 7, dir: 'right', look: L.worker, name: 'Engineer Coil', trainer: 'c3g3' },
        { id: 'mila', x: 8, y: 2, dir: 'down', look: L.c3mila, name: 'Leader Mila', trainer: 'mila' }] });
  }

  // =====================================================================
  //  The story
  // =====================================================================
  // ---- landing in Voltara
  on('c3arrive', { needs: ['!c3arrive'], sets: ['c3arrive'] }, async J => {
    await J.say(['Here we are - Voltara City, the city of lights!', '...Huh. Where are the lights?'], 'ferry');
    await J.say('The street lamps are dark. The shop signs are dark. Not a single window glows.');
    await J.say(['Folks on the dock say the whole city lost power last night.', 'And Mila - the gym leader - went charging north up Route 3 to the Power Plant. Something about "people in purple" in her turbines.', 'Sounds like your kind of trouble, kid. I\'ll be here when you want to sail back.'], 'ferry');
    J.set('c3arrive');
  });
  on('c3ferry', { travel: [{ map: 'port' }] }, async (J, n) => {
    if (await J.ask('Sailing back to Port Coralis?', ['Yes', 'Not yet'], n) !== 0) return J.say('Right you are. The boat\'s not going anywhere.', n);
    await J.say('Hold on to your hat!', n);
    const d = JMaps.M.port.dock;
    await J.travel('port', d.x, d.y, d.dir);
  });
  on('c3gymLocked', {}, J => J.say('The automatic doors are dead - no power. A note is taped to the glass: "At the Power Plant (Route 3, north). Don\'t touch my gym! - Mila"'));
  on('c3gymGuide', {}, (J, n) => J.say(J.flag('badge.spark') ? 'You beat Mila! That Spark Badge is positively glowing!' : J.flag('mila_back') ? ['Mila\'s back and the doors are open! She uses Electric types.', 'Ground moves are super effective - and Ground types don\'t feel Electric moves at all. Magneton is part Steel, so Fire and Fighting work too!'] : 'The gym can\'t even open its doors without power. Mila went up to the Power Plant, north on Route 3.', n));
  on('c3guard', {}, (J, n) => J.say(J.flag('mila_back') ? ['Power\'s back, but those Eclipse goons cut the line down Route 4 too.', 'We\'ll have it fixed by the time you\'ve got Mila\'s badge. Mt. Cinder\'s up that way!'] : 'Route 4 is closed while the power\'s out. The road lights and signals are all dead - too dangerous!', n));
  on('c3vWorker', {}, (J, n) => J.say(J.flag('mila_back') ? 'Listen to that hum! Sweetest sound in the world. The whole grid\'s back up.' : ['Not a volt coming down the line from the plant. Not one!', 'It isn\'t broken, either - the power\'s being pulled somewhere else. Something up there is drinking it.'], n));
  on('c3substation', {}, J => J.say(J.flag('mila_back') ? 'The transformer hums happily. A tag reads: FEED - VOLTARA POWER PLANT (ROUTE 3).' : 'The transformer is cold and silent. A tag reads: FEED - VOLTARA POWER PLANT (ROUTE 3).'));
  on('c3vKid', {}, (J, n) => J.say(J.flag('mila_back') ? 'The lights are back! I can play video games again! ...After homework. Ugh.' : 'It\'s so dark... I\'m not scared! My Pichu is a little scared. Not me.', n));
  on('c3vLady', {}, (J, n) => J.say(J.flag('mila_back') ? 'Mila got the power back - with a little help from you, I hear. Voltara owes you one!' : 'Voltara has never had a blackout. Never! Mila keeps that plant humming like one of her Pokémon.', n));
  on('c3ohm', { sets: ['c3ohm'] }, async (J, n) => {
    if (J.flag('c3ohm')) return J.say('A Thunder Stone makes certain Pokémon evolve. Pikachu, Eevee... my old Eelektrik loved it!', n);
    if (!J.flag('mila_back')) return J.say(['Blackout! Forty years of inventions, and every one of them is a paperweight without power.', 'Bring the lights back and I\'ll make it worth your while, young one.'], n);
    await J.say(['The power\'s back! My inventions live again! I heard you had a hand in that.', 'Here - a stone that crackles with lightning. It came with the meteor, they say.'], n);
    await J.give('thunderstone'); J.set('c3ohm');
  });
  on('c3ohmKid', {}, (J, n) => J.say('Grandpa Ohm built a machine that makes toast AND charges Pokémon. The toast is always burnt.', n));
  on('c3invention', {}, J => J.say(J.flag('mila_back') ? 'A tangle of wires and a toaster. It beeps cheerfully.' : 'A tangle of wires and a toaster. Without power, it\'s just... a toaster.'));
  on('c3tv', {}, J => J.say(J.flag('mila_back') ? 'The news: "Power restored to Voltara City! Gym leader Mila thanks a young trainer..." Hey, that\'s you!' : 'The TV is dead. You can see your own face in the dark screen.'));
  on('c3lumi', {}, (J, n) => J.say(J.flag('mila_back') ? 'Mila was in my class at school. Even then she took apart every clock she could reach!' : 'I saw trucks with a purple sun painted on them drive up Route 3 the night before the blackout.', n));
  on('c3ben', {}, (J, n) => J.say('Electric Pokémon are popular in Voltara. On stormy nights the Mareep on Route 3 light up like little lanterns.', n));

  // ---- Route 3
  on('c3plantWorker', {}, (J, n) => J.say(J.flag('mila_back') ? 'You and Mila threw them out! I can get back to work. ...Hooray?' : ['They came in the night - Team Eclipse - and threw all of us out of the plant!', 'They hooked some purple machine to the turbines. Mila went in alone. Please, help her!'], n));
  on('c3transformer', {}, J => J.say(J.flag('mila_back') ? 'A big transformer, humming again.' : 'A big transformer. Its cables have been cut and spliced into a thick purple line that runs into the plant.'));
  // ---- Sora's third battle
  on('c3rival', { needs: ['!rival3'], sets: ['rival3'] }, async J => {
    await J.emote('sora', '!');
    await J.say(['{NAME}! I knew you\'d be on the next ferry!', 'The gym\'s locked, the city\'s dark, and a plant worker says Team Eclipse took over the Power Plant. Those guys AGAIN!', 'Before we go in there... let\'s make sure we\'re both fully charged. Battle!'], 'sora');
    const rs = J.get('rivalStarter') || 'eevee';
    await J.battle({ id: 'rival3', name: 'Sora', look: 'sora', team: [['staravia', 25], ['luxio', 26], [J.grown(rs, 27), 27]], pay: 50, theme: 'forest', canLose: true, before: 'Full power - let\'s go!', lose: 'Zapped... totally zapped.', win: 'Ha! Shocking, right?' });
    await J.say(J.lastWin() ? ['Whoa. You\'re really something, {NAME}.', 'Okay - you take the plant. I\'ll get the workers somewhere safe. Go!'] : ['That was close! Your team\'s getting scary strong.', 'Okay - you take the plant. I\'ll get the workers somewhere safe. Go!'], 'sora');
    await J.walk('sora', ['up', 3]);
    J.set('rival3'); J.refresh();
  });

  // ---- the Power Plant: Mila, the breakers, the field
  on('c3milaPlant', { sets: ['c3mila'] }, async (J, n) => {
    if (J.flag('c3gate')) return J.say('The field is down! Up those stairs - I\'ll be right behind you once the turbines are stable!', n);
    const hint = 'Three breakers feed that field: one in the west room, one in the east room, and one in the south-east corner of this hall. Pull all three!';
    if (J.flag('c3mila')) return J.say(hint, n);
    await J.say(['Whoa - a trainer! Did Team Eclipse let you in, or did you let yourself in? Ha!', 'I\'m Mila, the gym leader. This is my plant - well, the city\'s, but I fix it.', 'Those creeps sealed the control room with that purple field and hooked a "Resonance Engine" to my turbines. It\'s drinking the whole city\'s power!', 'My Pokémon tried to zap through the field and it drained them dry. But it\'s fed by the plant\'s own breakers...'], n);
    await J.say(hint, n);
    J.set('c3mila');
  });
  const breaker = k => on('c3brk' + k, { sets: ['c3brk' + k, 'c3gate'] }, async J => {
    if (J.flag('c3gate')) return J.say(`Breaker ${k} is off. The field is down.`);
    if (!J.flag('c3mila')) return J.say(`A big breaker switch: "SECURITY FIELD - FEED ${k}". Better find out what it does before pulling it.`);
    if (J.flag('c3brk' + k)) return J.say(`Breaker ${k} is already off.`);
    if (await J.ask(`Breaker ${k}: SECURITY FIELD FEED. Pull it?`, ['Pull it', 'Leave it']) !== 0) return;
    J.set('c3brk' + k);
    const done = ['A', 'B', 'C'].filter(x => J.flag('c3brk' + x)).length;
    if (done < 3) return J.say(`Clunk! Breaker ${k} is off. The field flickers... (${done} of 3)`);
    await J.say('Clunk! From the middle of the hall comes a long fizzing whine... and the purple field sputters out!');
    J.set('c3gate'); J.refresh();
  });
  breaker('A'); breaker('B'); breaker('C');
  on('c3barrier', { needs: ['!c3gate'] }, async J => {
    await J.say('BZZZT! A wall of purple energy throws you back!');
    await J.playerWalk('down', 1);
  });
  on('c3generator', {}, J => J.say(J.flag('c3gate') ? 'A field generator stamped with a purple sun. It\'s dead now.' : 'A field generator stamped with a purple sun. It crackles angrily.'));
  on('c3turbine', {}, J => J.say(J.flag('mila_back') ? 'The turbine spins with a steady roar.' : 'The turbine spins, but a thick purple cable carries its power upstairs instead of to the city.'));

  // ---- the control room: Admin Kael and the Resonance Engine
  on('c3kael', { needs: ['c3gate', '!c3kael'], sets: ['c3gruntE', 'c3kael'] }, async J => {
    if (!J.flag('c3gruntE')) {
      await J.say('The Resonance Engine is at ninety percent... A little more of Voltara\'s power, and the shards will wake.', 'kael');
      await J.face('kael', 'down'); await J.face('grunt', 'down');
      await J.emote('grunt', '!');
      await J.say('Admin Kael! The field\'s down - it\'s that kid from Seacliff Cave!', 'grunt');
      await J.say('Then stop them. That is what you are for.', 'kael');
      if (await J.battle('c3gruntE', 'grunt') !== 'win') return;
      J.set('c3gruntE');
    }
    await J.face('kael', 'down');
    await J.say(['You. Again.', 'Do you know what this Engine does? Every shard we feed it remembers the meteor. With enough power, they wake - and Director Vex re-forges the sky.', 'Power is all that matters. Not friendship. Not "bonds". Let me show you.'], 'kael');
    if (await J.battle('c3kael', 'kael') !== 'win') return;
    await J.say(['...Again.', 'The stones answer to a bond. That is what the Director told me. I took it for a riddle.', 'Then why does that keep beating us? Raw power should be enough. It should be...'], 'kael');
    await J.say('Admin? Th-the Engine is overloading!', 'grunt');
    await J.say(['...Pull the shards. We are leaving.', 'Kid. Your Pokémon fight as if they want to. Mine fight because I tell them to.', '...Forget I said that.'], 'kael');
    await J.fade(() => { J.set('c3kael'); J.refresh(); });
    await J.say('Team Eclipse ran with the Engine\'s shards - but one of them skittered away across the floor as they fled.');
    await J.walk('mila', ['up', 2]);
    await J.say(['{NAME}! The field dropped and I ran straight up - I saw the end of that. You beat an Eclipse Admin!', 'Okay. My turn. Let me at that Engine - talk to me when you\'re ready to see Voltara light up!'], 'mila');
  });
  on('c3milaCore', { needs: ['c3kael'], sets: ['mila_back'] }, async (J, n) => {
    await J.say(['Right! Unhook the purple cable, bypass the Engine, reroute the turbines to the city grid, and...', '...FULL POWER!'], n);
    await J.fade(() => { J.set('mila_back'); J.refresh(); });
    await J.say('A deep hum rolls through the plant. Down in the valley, every light in Voltara City blinks on at once!');
    await J.say(['Woo-hoo! Look at it shine!', 'Thank you, {NAME}. Really. Now come and see me at the gym - I owe you the most electric battle of your life!'], { name: 'Mila', look: 'c3mila' });
  });
  on('c3engine', {}, J => J.say(J.flag('c3kael') ? 'The Resonance Engine is a cold husk. Empty sockets where the shards sat.' : 'The Resonance Engine. Purple light pulses through it like a heartbeat.'));
  on('c3console', {}, J => J.say(J.flag('mila_back') ? 'POWER OUTPUT: 100% - VOLTARA CITY GRID: ONLINE.' : 'POWER OUTPUT: 100% - VOLTARA CITY GRID: 0% - RESONANCE ENGINE: 91%...'));

  // ---- the gym
  on('c3gymStatue', {}, J => J.say(J.flag('badge.spark') ? 'VOLTARA POKéMON GYM - LEADER: MILA\nWinning trainers: SORA, {NAME}' : 'VOLTARA POKéMON GYM - LEADER: MILA\nWinning trainers this season: none yet!'));
  on('c3milaWin', { sets: ['badge.spark', 'ch4'] }, async J => {
    await J.say('Whew - what a jolt! Here, you earned this: the Spark Badge!', 'mila');
    J.badge('spark');
    await J.give('tm:thunderbolt');
    await J.say(['That\'s Thunderbolt - my favorite move. It hits hard and might paralyze, too.', 'And {NAME}... that Engine was drinking power to wake the Meteor Shards. Team Eclipse is collecting them all - Kael said so.', 'If they need that much power, they\'ll go looking for it somewhere hot next. Mt. Cinder is up Route 4, east of town - Taro\'s Fire Gym is there.'], 'mila');
    await J.chapter('Chapter 3 complete!', 'Next: Chapter 4 - Embers of Mt. Cinder');
    J.set('ch4'); J.refresh();
    await J.chapter('Chapter 4', 'Embers of Mt. Cinder');
  });

  chapter({ n: 3, title: 'Sparks of Voltara', start: { map: 'port', x: 24, y: 21, dir: 'down' }, level: 24, badge: 'spark', center: 'center_voltara',
    goals: ['c3arrive', 'c3mila', 'rival3', 'c3gate', 'c3kael', 'mila_back', 'badge.spark', 'ch4'] });
})();
