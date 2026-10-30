'use strict';
// =====================================================================
//  M2MAPS - Journey II: the region of Meridia, hand-made. The same kit
//  as Valoria's (jmaps.js): a grid of tiles plus buildings, furniture,
//  signs, people, items and links. Meridia adds Echo twins (echo /
//  echoOf, shrines), Fly landing spots (fly) and surfable water. This
//  file holds the people's looks and the Prologue + Chapter 1 maps; the
//  later chapters add theirs in mch2.js ... mch12.js.
//  The plan: docs/journey2/world.md.
// =====================================================================
const MMaps = (() => {
  const { grid, doorsOf, solidGrid } = JMaps;
  // ---- the people's looks: every Valoria look, plus Meridia's cast
  const L = Object.assign({}, JMaps.L, {
    juno: { hat: 'cap', hatColor: 0xf07a30, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'pigtails', top: 0x2d9a8a, sleeves: 'short', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'shorts', shoes: 0xf07a30, bag: 0x8a5a30, skin: '#c88a5a' },
    teo: { hat: null, hair: 0x2b1d14, hairStyle: 'short', top: 0xf0d048, sleeves: 'short', inner: 0xf0d048, legs: 0x3a5aa8, legStyle: 'shorts', shoes: 0xe04848, bag: null, skin: '#c88a5a' },
    junomom: { hat: null, hair: 0x2b1d14, hairStyle: 'long', top: 0xf07a30, sleeves: 'short', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a3a48, bag: 0x8a5a30, skin: '#c88a5a' },
    okafor: { hat: null, hair: 0x1a1a1a, hairStyle: 'long', top: 0xf4f4f4, sleeves: 'long', inner: 0xe0a030, legs: 0x4a3a5a, legStyle: 'pants', shoes: 0x3a2a1e, bag: null, skin: '#7a4a2a' },
    ada: { hat: null, hair: 0xe8e8e8, hairStyle: 'long', top: 0x3a4a6a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a4a6a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null, scarf: 0xffd84a, skin: '#7a4a2a' },
    cassius: { hat: null, hair: 0x9a9aa4, hairStyle: 'short', top: 0xf4f0e8, sleeves: 'long', inner: 0xb08a3a, legs: 0xf4f0e8, legStyle: 'pants', shoes: 0x5a3a20, bag: null, scarf: 0xb08a3a },
    nell: { hat: null, hair: 0xd8d8e0, hairStyle: 'long', top: 0xb8b8c8, sleeves: 'long', inner: 0xe8e8f0, legs: 0x9a9aa8, legStyle: 'skirt', shoes: 0x6a6a78, bag: null, skin: '#ece4ec' },
    keeper: { hat: 'beanie', hatColor: 0xf4f4f4, hatFront: 0xb08a3a, hair: 0x3a2a1e, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'long', inner: 0xb08a3a, legs: 0xd8d8e0, legStyle: 'pants', shoes: 0x3a3a48, bag: null },
    keeperf: { hat: 'beanie', hatColor: 0xf4f4f4, hatFront: 0xb08a3a, hair: 0x9a5a2a, hairStyle: 'long', top: 0xf4f4f4, sleeves: 'long', inner: 0xb08a3a, legs: 0xd8d8e0, legStyle: 'skirt', shoes: 0x3a3a48, bag: null },
    agent: { hat: null, hair: 0x2a2a3a, hairStyle: 'short', top: 0x3a3a48, sleeves: 'long', inner: 0xb08a3a, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0xb08a3a },
    hask: { hat: null, hair: 0xe8e8f0, hairStyle: 'spiky', top: 0xf4f4f4, sleeves: 'long', inner: 0x3a3a48, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0xb08a3a },
    // the Eight Wardens
    mara: { hat: 'bandana', hatColor: 0x3c78d0, hair: 0x6a3a1a, hairStyle: 'long', top: 0x3c78d0, sleeves: 'short', inner: 0xffffff, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0xffffff, bag: null, skin: '#c88a5a' },
    gideon: { hat: 'cap', hatColor: 0x7a8a9a, hatFront: 0xb08a3a, hair: 0x3a2a1e, hairStyle: 'short', top: 0x5a6a7a, sleeves: 'long', inner: 0xb08a3a, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    ilse: { hat: 'sunhat', hatColor: 0x3c9a58, hatBand: 0xe0b030, hair: 0xe0b030, hairStyle: 'pigtails', top: 0x8ac858, sleeves: 'none', inner: 0xfff4c8, legs: 0x5a8a3a, legStyle: 'shorts', shoes: 0x6a4a2a, bag: 0x3c9a58 },
    bastian: { hat: 'sunhat', hatColor: 0xb07a3a, hatBand: 0x5a3a20, hair: 0x5a5a5a, hairStyle: 'short', top: 0xb07a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x5a4a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x7a5a30, skin: '#a86a4a' },
    celeste: { hat: null, hair: 0xf0a8c8, hairStyle: 'long', top: 0xf8d8e8, sleeves: 'none', inner: 0xffffff, legs: 0xe878a8, legStyle: 'skirt', shoes: 0xffffff, bag: null },
    corin: { hat: null, hair: 0x3a3a5a, hairStyle: 'long', top: 0x2a2a3a, sleeves: 'long', inner: 0x7a58b8, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0x7a58b8, skin: '#e8d8c8' },
    rhoswen: { hat: null, hair: 0x7a2a2a, hairStyle: 'spiky', top: 0x4a68b0, sleeves: 'long', inner: 0xd8b058, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0x2a2a34, bag: null, scarf: 0xd85030 },
    solenne: { hat: null, hair: 0xf07a30, hairStyle: 'long', top: 0xd85030, sleeves: 'short', inner: 0xffd84a, legs: 0x8a2a1a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null, skin: '#a86a4a' }
  });
  const { M, def, center, mart } = JMaps.kit(L);

  // =====================================================================
  //  Tidemark (you start here) - a fishing village on the Sunward Coast,
  //  under the oldest of Meridia's eight lighthouses
  // =====================================================================
  {
    const B = grid(30, 26, '.').border('T', { n: [13, 15] }, 1);
    B.fill(0, 21, 29, 25, '~').fill(1, 19, 28, 20, ':').fill(14, 19, 15, 24, 'b');
    B.fill(13, 0, 15, 18, ',').fill(2, 8, 21, 9, ',').fill(2, 16, 27, 17, ',').fill(25, 15, 25, 16, ',');
    B.fill(11, 10, 17, 14, '*').fill(12, 11, 16, 13, ',');
    B.fill(22, 2, 27, 6, '*').fill(2, 2, 3, 3, '*').fill(23, 18, 27, 18, 'r');
    def({ id: 'tidemark', name: 'Tidemark', kind: 'town', rows: B.rows(), music: 'town', battle: 'beach', fly: { x: 14, y: 15 },
      buildings: [{ b: 'house', x: 2, y: 4, to: 'home1f', variant: 0 }, { b: 'house2', x: 8, y: 4, to: 'junohouse' }, { b: 'house3', x: 17, y: 4, to: 'tmhouse' },
        { b: 'lab', x: 3, y: 10, to: 'oklab' }, { b: 'mart', x: 18, y: 11, to: 'tmstore' },
        { b: 'lighthouse', x: 23, y: 9, to: 'tidelight1', variant: 0, needs: ['relit1'], locked: 'm1lightLocked' }],
      signs: [{ x: 12, y: 2, text: 'TIDEMARK\nWhere the light first meets the sea.' }, { x: 1, y: 7, text: "{NAME}'s house" }, { x: 7, y: 7, text: 'REYES COURIERS\n"Anything, anywhere, by morning."' },
        { x: 22, y: 15, text: 'TIDEMARK LIGHT\nWarden: MARA\nThe first of the Eight Lights of Meridia.' }, { x: 10, y: 15, text: 'OKAFOR FIELD STATION\nPokémon time-ecology research.' }],
      props: [{ k: 'lamp', x: 11, y: 10 }, { k: 'lamp', x: 17, y: 10 }, { k: 'lamp', x: 11, y: 14 }, { k: 'lamp', x: 17, y: 14 }, { k: 'mailbox', x: 1, y: 5 }, { k: 'mailbox', x: 7, y: 5 }],
      edges: { n: { to: 'sunpath', dx: -4 } },
      zones: [{ x: 13, y: 1, w: 3, h: 1, event: 'm1stay', block: true }],
      items: [{ x: 4, y: 19, item: 'potion', n: 1, hidden: true }, { x: 27, y: 2, item: 'poke', n: 2 }, { x: 26, y: 19, item: 'oran', n: 1, hidden: true }],
      npcs: [{ id: 'okafor', x: 14, y: 12, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm1okFestival', show: ['!lostday'] },
        { id: 'juno', x: 15, y: 19, dir: 'up', look: L.juno, name: 'Juno', talk: 'm1junoPier', show: ['!juno1'] },
        { id: 'mara', x: 26, y: 16, dir: 'left', look: L.mara, name: 'Warden Mara', talk: 'm1maraOut', show: ['!crystal'] },
        { id: 'mara2', x: 26, y: 16, dir: 'left', look: L.mara, name: 'Warden Mara', talk: 'm1relight', show: ['crystal', '!relit1'] },
        { id: 'tobin', x: 15, y: 23, dir: 'down', look: L.fisher, name: 'Old Tobin', talk: 'm1tobin' },
        { id: 'pip', x: 8, y: 19, dir: 'down', look: L.kid, name: 'Pip', wander: 2, talk: 'm1pip' },
        { id: 'lady', x: 20, y: 9, dir: 'down', look: L.woman, wander: 2, talk: 'm1lady' }] });
  }
  // ---- inside Tidemark
  def({ id: 'home1f', name: 'Your house', kind: 'inside', outside: 'tidemark', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').put(9, 1, '<').fill(3, 4, 6, 5, 'R').rows(),
    arrive: { x: 5, y: 6 },
    furniture: [{ k: 'fridge', x: 1, y: 1 }, { k: 'stove', x: 2, y: 1 }, { k: 'shelf', x: 4, y: 1 }, { k: 'tv', x: 7, y: 1, talk: 'tv' }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }, { k: 'plant', x: 1, y: 6 }, { k: 'plant', x: 9, y: 6 }],
    warps: [{ x: 9, y: 1, to: 'home2f', tx: 7, ty: 2, dir: 'down' }],
    npcs: [{ id: 'mom', x: 7, y: 4, dir: 'left', look: L.mom, name: 'Mom', talk: 'm1mom' }] });
  def({ id: 'home2f', name: 'Your room', kind: 'inside', rows: grid(9, 7, '_').border('#').put(7, 1, '>').fill(3, 3, 5, 4, 'R').rows(),
    furniture: [{ k: 'bed', x: 1, y: 1, talk: 'm1bed' }, { k: 'pc', x: 3, y: 1, talk: 'myPc' }, { k: 'tv', x: 5, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 5 }, { k: 'shelf', x: 1, y: 5 }],
    warps: [{ x: 7, y: 1, to: 'home1f', tx: 9, ty: 2, dir: 'down' }] });
  def({ id: 'junohouse', name: "Juno's house", kind: 'inside', outside: 'tidemark', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 3, 6, 4, 'R').rows(),
    arrive: { x: 5, y: 6 },
    furniture: [{ k: 'boxes', x: 1, y: 1 }, { k: 'boxes', x: 2, y: 1 }, { k: 'boxes', x: 1, y: 2 }, { k: 'shelf', x: 4, y: 1 }, { k: 'tv', x: 7, y: 1, talk: 'tv' }, { k: 'desk', x: 8, y: 4, talk: 'm1junoDesk' }, { k: 'plant', x: 9, y: 6 }],
    npcs: [{ id: 'teo', x: 3, y: 5, dir: 'right', look: L.teo, name: 'Teo', talk: 'm1teo' }, { id: 'junomom', x: 7, y: 3, dir: 'down', look: L.junomom, name: 'Mrs. Reyes', talk: 'm1junoMom' }] });
  def({ id: 'tmhouse', name: 'House', kind: 'inside', outside: 'tidemark', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'stove', x: 4, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }, { k: 'plant', x: 7, y: 1 }],
    npcs: [{ id: 'gran', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Granny Wren', talk: 'm1gran' }] });
  def({ id: 'oklab', name: 'Okafor Field Station', kind: 'inside', outside: 'tidemark', isCenter: true, rows: grid(13, 10, '+').border('#').fill(1, 9, 11, 9, '+').put(6, 9, 'm').fill(5, 5, 7, 7, 'R').rows(),
    arrive: { x: 6, y: 8 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm1machine' }, { k: 'shelf', x: 4, y: 1 }, { k: 'shelf', x: 7, y: 1 }, { k: 'healer', x: 10, y: 1 }, { k: 'desk', x: 1, y: 6 }, { k: 'pc', x: 11, y: 5, talk: 'boxPc' }, { k: 'plant', x: 11, y: 8 }, { k: 'plant', x: 1, y: 8 }],
    npcs: [{ id: 'okafor', x: 6, y: 3, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm1okLab', show: ['lostday', '!notebook'] },
      { id: 'okafor2', x: 6, y: 3, dir: 'down', look: L.okafor, name: 'Prof. Okafor', talk: 'm1okDeduce', show: ['notebook'] },
      { id: 'nurse', x: 10, y: 3, dir: 'down', look: L.aide, name: 'Aide Remy', talk: 'm1remy' }] });
  mart('tmstore', 'tidemark', ['poke', 'potion', 'antidote', 'parlyzheal', 'awakening', 'repel']);
  M.tmstore.name = 'Tidemark Store';

  // ---- the Tidemark lighthouse: Warden Mara's gym (the lamp room is the arena)
  def({ id: 'tidelight1', name: 'Tidemark Light', kind: 'inside', gym: true, outside: 'tidemark', battle: 'beach', music: 'gym',
    rows: grid(13, 12, 'g').border('#').fill(1, 11, 11, 11, 'g').put(6, 11, 'm').put(6, 1, '<').fill(2, 4, 4, 5, '~').fill(8, 4, 10, 5, '~').fill(2, 8, 4, 8, '~').fill(8, 8, 10, 8, '~').rows(),
    arrive: { x: 6, y: 10 },
    furniture: [{ k: 'statue', x: 4, y: 10, talk: 'm1gymStatue' }, { k: 'statue', x: 8, y: 10, talk: 'm1gymStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 11, y: 1 }],
    warps: [{ x: 6, y: 1, to: 'tidelight2', tx: 5, ty: 6, dir: 'up' }],
    npcs: [{ id: 'k1', x: 2, y: 6, dir: 'right', look: L.sailor, name: 'Keeper Hollis', trainer: 'm1keeper1' },
      { id: 'k2', x: 10, y: 3, dir: 'left', look: L.swimmer, name: 'Keeper Suri', trainer: 'm1keeper2' }] });
  def({ id: 'tidelight2', name: 'Tidemark Light - Lamp Room', kind: 'inside', gym: true, battle: 'beach', music: 'gym',
    rows: grid(11, 9, 'g').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').rows(),
    furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm1lamp' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 9, y: 1 }],
    warps: [{ x: 5, y: 7, to: 'tidelight1', tx: 6, ty: 2, dir: 'down' }],
    npcs: [{ id: 'mara', x: 5, y: 2, dir: 'down', look: L.mara, name: 'Warden Mara', trainer: 'mara' }] });

  // =====================================================================
  //  The Sunward Path - north from Tidemark; the cove path branches west
  // =====================================================================
  {
    const B = grid(20, 40, '.').border('T', { s: [9, 11], n: [9, 11], w: [18, 20] }, 1);
    B.fill(1, 1, 2, 38, 'T').fill(17, 1, 18, 38, 'T').fill(1, 14, 4, 17, 'T').fill(1, 21, 4, 25, 'T').fill(0, 18, 4, 20, ',');
    B.fill(9, 28, 11, 39, ',').fill(5, 26, 11, 27, ',').fill(5, 12, 6, 27, ',').fill(5, 18, 6, 20, ',').fill(5, 11, 11, 12, ',').fill(9, 0, 11, 11, ',');
    B.fill(12, 30, 16, 36, ';').fill(3, 30, 7, 36, ';').fill(8, 15, 14, 21, ';').fill(12, 3, 16, 8, ';').fill(3, 3, 7, 8, ';');
    B.fill(3, 1, 8, 2, 'T').fill(12, 1, 16, 2, 'T').fill(12, 24, 16, 24, 'v').fill(7, 23, 8, 25, 'T').fill(13, 12, 15, 13, 'T').fill(12, 27, 13, 28, '*').fill(14, 38, 16, 38, '*');
    def({ id: 'sunpath', name: 'Sunward Path', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 3, max: 6, table: [['starly', 24], ['pidgey', 20], ['wingull', 18], ['rookidee', 14], ['slakoth', 10], ['psyduck', 8], ['pichu', 4], ['eevee', 2]] } },
      edges: { s: { to: 'tidemark', dx: 4 }, n: { to: 'canalroad', dx: 0, needs: ['ch2'] }, w: { to: 'driftwood', dy: 0, needs: ['deduce'] } },
      zones: [{ x: 3, y: 18, w: 1, h: 3, event: 'm1fog', block: true }, { x: 9, y: 2, w: 3, h: 1, event: 'm1notYet', block: true }],
      signs: [{ x: 12, y: 38, text: 'SUNWARD PATH\nTidemark - Canal Road - Brassport' }, { x: 7, y: 17, text: 'WEST: DRIFTWOOD COVE\nDanger: sea fog, smugglers (a long time ago).' }],
      items: [{ x: 3, y: 37, item: 'potion', n: 1 }, { x: 16, y: 21, item: 'poke', n: 2 }, { x: 15, y: 10, item: 'antidote', n: 1, hidden: true }, { x: 3, y: 9, item: 'oran', n: 2, hidden: true }],
      npcs: [{ id: 'dale', x: 8, y: 31, dir: 'right', look: L.camper, name: 'Camper Dale', trainer: 'm1dale' },
        { id: 'ivy', x: 14, y: 22, dir: 'left', look: L.picnicker, name: 'Picnicker Ivy', trainer: 'm1ivy' },
        { id: 'bo', x: 7, y: 9, dir: 'right', look: L.youngster, name: 'Youngster Bo', trainer: 'm1bo' },
        { id: 'juno', x: 8, y: 13, dir: 'down', look: L.juno, name: 'Juno', talk: 'm1junoBack', show: ['notebook', '!junoback'] },
        { id: 'gate', x: 8, y: 3, dir: 'right', look: L.worker, name: 'Road Crew', talk: 'm1crew', show: ['!ch2'] }] });
  }

  // =====================================================================
  //  Driftwood Cove - the old smugglers' cave, where the Lightkeepers'
  //  boat waits with the lighthouse crystal
  // =====================================================================
  {
    const B = grid(30, 22, 'C');
    B.fill(24, 18, 29, 20, 'c').fill(18, 15, 25, 20, 'c').fill(18, 9, 21, 15, 'c').fill(6, 7, 21, 9, 'c').fill(4, 7, 7, 17, 'c').fill(4, 15, 15, 17, 'c').fill(11, 11, 15, 15, 'c');
    B.fill(12, 12, 14, 13, '~').fill(8, 2, 12, 7, 'c').fill(2, 2, 8, 4, 'c').fill(1, 1, 3, 2, '~').fill(1, 3, 1, 5, '~').fill(22, 10, 26, 13, 'c').fill(24, 11, 25, 12, '~');
    B.fill(5, 3, 6, 3, ':').fill(2, 4, 4, 4, ':');
    def({ id: 'driftwood', name: 'Driftwood Cove', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'beach', dark: 0.35,
      encounters: { cave: { rate: 0.1, min: 6, max: 9, table: [['zubat', 30], ['geodude', 24], ['wooper', 14], ['binacle', 12], ['litwick', 10], ['psyduck', 10]] } },
      edges: { e: { to: 'sunpath', dy: 0 } },
      items: [{ x: 24, y: 10, item: 'potion', n: 2 }, { x: 4, y: 16, item: 'great', n: 1 }, { x: 15, y: 15, item: 'awakening', n: 1, hidden: true }, { x: 25, y: 13, item: 'rarecandy', n: 1 }],
      npcs: [{ id: 'lk1', x: 19, y: 12, dir: 'down', look: L.keeper, name: 'Lightkeeper', trainer: 'm1lk1' },
        { id: 'lk2', x: 9, y: 8, dir: 'right', look: L.keeperf, name: 'Lightkeeper', trainer: 'm1lk2' },
        { id: 'lk3', x: 5, y: 12, dir: 'right', look: L.keeper, name: 'Lightkeeper', trainer: 'm1lk3' },
        { id: 'pell', x: 6, y: 3, dir: 'right', look: L.agent, name: 'Agent Pell', talk: 'm1pell' }] });
  }

  // the Prologue and Chapter 1's maps (the chapter checker and the playthrough test go by these tags)
  for (const m of Object.values(M)) m.chapter = 1;

  // ---- helpers for the chapter files
  // An Echo twin of a map: the same ground (patch(B) may change it: B is a grid() kit over a copy of the rows), the same
  // buildings as shut decorations, the same props; no people, items, signs, zones or edges unless o gives them. Both
  // maps get a shrine on each tile in shrines (pick tiles that are free on both, with a free tile beside them).
  // o: anything more for the twin's def (name, npcs, items, edges, chapter, encounters...).
  function echoTwin(id, newId, shrines, o = {}, patch) {
    const m = M[id], B = grid(m.w, m.h);
    m.rows.forEach((r, y) => B.put(0, y, r));
    if (patch) patch(B);
    def({ name: m.name + ' (Echo)', kind: m.kind, music: m.music, battle: m.battle, dark: m.dark, ...o, id: newId, echoOf: id, rows: B.rows(),
      buildings: (o.buildings || m.buildings.map(b => ({ ...b, deco: true, to: null, needs: null, locked: null }))),
      props: [...m.props.filter(p => p.k !== 'shrine'), ...(o.props || [])], shrines: shrines.map(s => ({ ...s })) });
    m.echo = newId;
    for (const s of shrines) if (!m.shrines.some(t => t.x === s.x && t.y === s.y)) { m.shrines.push({ ...s }); m.props.push({ k: 'shrine', x: s.x, y: s.y }); }
    return M[newId];
  }
  // Where each Warden can stand in their own town during the Long Night (Chapter 10 puts them there): each chapter that
  // builds a Warden's town adds SPOTS.<warden> = { map, x, y, dir } (a free tile everyone can reach)
  const SPOTS = { mara: { map: 'tidemark', x: 24, y: 17, dir: 'down' } };

  return { M, L, doorsOf, solidGrid, grid, def, center, mart, echoTwin, SPOTS };
})();
