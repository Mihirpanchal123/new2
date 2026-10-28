'use strict';
// =====================================================================
//  JMAPS - the region of Valoria, hand-made (Journey). Each map is a grid
//  of characters (see JArt.KIND) plus what stands on it: buildings (their
//  door leads inside), furniture, signs, people, items, and the links to
//  the next map (edges: walk off that side; warps: stairs). Story people
//  and events are in jstory.js; ids here are the ones it uses.
// =====================================================================
const JMaps = (() => {
  // ---- a small drawing kit for the grids
  function grid(w, h, ch = '.') {
    const g = Array.from({ length: h }, () => Array(w).fill(ch));
    const B = {
      w, h,
      fill(x0, y0, x1, y1, c) { for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = c; return B; },
      put(x, y, s) { for (let i = 0; i < s.length; i++) if (x + i < w) g[y][x + i] = s[i]; return B; },
      // a frame of c with openings: gaps = { n: [x0, x1], s: [...], w: [y0, y1], e: [...] }
      border(c, gaps = {}, t = 1) {
        const open = (side, v) => gaps[side] && v >= gaps[side][0] && v <= gaps[side][1];
        for (let k = 0; k < t; k++) {
          for (let x = 0; x < w; x++) { if (!open('n', x)) g[k][x] = c; if (!open('s', x)) g[h - 1 - k][x] = c; }
          for (let y = 0; y < h; y++) { if (!open('w', y)) g[y][k] = c; if (!open('e', y)) g[y][w - 1 - k] = c; }
        }
        return B;
      },
      rows: () => g.map(r => r.join(''))
    };
    return B;
  }
  const M = {};
  const def = m => { M[m.id] = { buildings: [], furniture: [], signs: [], npcs: [], items: [], warps: [], zones: [], edges: {}, props: [], ...m, w: m.rows[0].length, h: m.rows.length }; };

  // ---- the people's looks (OUTFITS fields; journey.js draws them)
  const L = {
    mom: { hat: null, hair: 0x7a4a26, hairStyle: 'long', top: 0xe88aa8, sleeves: 'long', inner: 0xffffff, legs: 0x5a6a9a, legStyle: 'skirt', shoes: 0x7a4a26, bag: null },
    hazel: { hat: null, hair: 0x9a6430, hairStyle: 'long', top: 0xf4f4f4, sleeves: 'long', inner: 0x3a9a6a, legs: 0x4a5468, legStyle: 'pants', shoes: 0x3a3a48, bag: null },
    sora: { hat: 'capback', hatColor: 0x2d8cf0, hatFront: 0xffffff, hair: 0x6b3d1f, hairStyle: 'spiky', top: 0x2d8cf0, sleeves: 'short', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'pants', shoes: 0xffffff, bag: 0xe9b949 },
    aide: { hat: null, hair: 0x2b1d14, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'long', inner: 0x5a8ad8, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a3a48, bag: null },
    oldman: { hat: null, hair: 0xd9d9d9, hairStyle: 'short', top: 0x8a6a4a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x5a4a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: null },
    oldlady: { hat: null, hair: 0xd9d9d9, hairStyle: 'long', top: 0x9a6ab8, sleeves: 'long', inner: 0xe8dcc0, legs: 0x6a4a8a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null },
    youngster: { hat: 'cap', hatColor: 0xf0d048, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'short', top: 0x4a98e8, sleeves: 'short', inner: 0x4a98e8, legs: 0xe8c890, legStyle: 'shorts', shoes: 0x3a3a48, bag: null },
    lass: { hat: null, hair: 0xd9a441, hairStyle: 'pigtails', top: 0xe878a8, sleeves: 'short', inner: 0xffffff, legs: 0x3a5aa8, legStyle: 'skirt', shoes: 0xe04848, bag: null },
    bug: { hat: 'sunhat', hatColor: 0xe8dcc0, hatBand: 0x3c9a58, hair: 0x2b1d14, hairStyle: 'short', top: 0xf0e070, sleeves: 'short', inner: 0xf0e070, legs: 0x5a8a3a, legStyle: 'shorts', shoes: 0x3a3a48, bag: 0x3c9a58 },
    grunt: { hat: 'beanie', hatColor: 0x2a2a3a, hatFront: 0xa040e0, hair: 0x2a2a3a, hairStyle: 'short', top: 0x2a2a3a, sleeves: 'long', inner: 0xa040e0, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0xa040e0, bag: null },
    luna: { hat: 'sunhat', hatColor: 0x3c9a58, hatBand: 0xffd84a, hair: 0x6a3a1a, hairStyle: 'long', top: 0x58b85c, sleeves: 'none', inner: 0xfff4c8, legs: 0x3c7a3e, legStyle: 'skirt', shoes: 0x6a4a2a, bag: null },
    nurse: { hat: 'bandana', hatColor: 0xffffff, hair: 0xe878a8, hairStyle: 'pigtails', top: 0xffd0e0, sleeves: 'short', inner: 0xffffff, legs: 0xffffff, legStyle: 'skirt', shoes: 0xffffff, bag: null },
    clerk: { hat: 'cap', hatColor: 0x3c78d0, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'short', top: 0x3c78d0, sleeves: 'long', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a3a48, bag: null },
    kid: { hat: null, hair: 0xc0392b, hairStyle: 'spiky', top: 0xf0a030, sleeves: 'short', inner: 0xf0a030, legs: 0x3a5aa8, legStyle: 'shorts', shoes: 0xe04848, bag: null },
    astro: { hat: null, hair: 0xe8e0d0, hairStyle: 'spiky', top: 0x3a3a6a, sleeves: 'long', inner: 0xffd84a, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0x2a2a3a, bag: null, scarf: 0xffd84a },
    worker: { hat: 'cap', hatColor: 0xf0a030, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'short', top: 0xf0a030, sleeves: 'long', inner: 0xe8e8e8, legs: 0x3a5aa8, legStyle: 'pants', shoes: 0x5a3a20, bag: null },
    aroma: { hat: null, hair: 0x3a7a3a, hairStyle: 'long', top: 0xa8e078, sleeves: 'none', inner: 0xffffff, legs: 0x5a9a4a, legStyle: 'skirt', shoes: 0x3a6a2a, bag: null },
    camper: { hat: 'cap', hatColor: 0x3c9a58, hatFront: 0xffffff, hair: 0x6b3d1f, hairStyle: 'short', top: 0x8a6a4a, sleeves: 'short', inner: 0x8a6a4a, legs: 0x5a5a3a, legStyle: 'shorts', shoes: 0x3a3a48, bag: 0x8a5a30 },
    man: { hat: null, hair: 0x2b1d14, hairStyle: 'short', top: 0x5a8a5a, sleeves: 'long', inner: 0xe8e8e8, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a3a48, bag: null },
    woman: { hat: null, hair: 0xd9a441, hairStyle: 'long', top: 0xe07a50, sleeves: 'short', inner: 0xffffff, legs: 0x3a5aa8, legStyle: 'pants', shoes: 0xffffff, bag: null },
    // Chapter 2: Route 2, Port Coralis, Seacliff Cave
    hiker: { hat: 'sunhat', hatColor: 0x8a6a3a, hatBand: 0x5a3a20, hair: 0x2b1d14, hairStyle: 'short', top: 0xc8783a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x5a4a3a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x7a5a30 },
    picnicker: { hat: 'sunhat', hatColor: 0xf4e8c8, hatBand: 0xe878a8, hair: 0x6a3a1a, hairStyle: 'pigtails', top: 0x78c878, sleeves: 'short', inner: 0xffffff, legs: 0xe8c890, legStyle: 'shorts', shoes: 0xe04848, bag: 0xe8a040 },
    fisher: { hat: 'cap', hatColor: 0x3a6a3a, hatFront: 0xe8dcc0, hair: 0x5a5a5a, hairStyle: 'short', top: 0x4a7a9a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x3a4a5a, legStyle: 'pants', shoes: 0x3a2a1e, bag: null },
    swimmer: { hat: 'bandana', hatColor: 0xf0d048, hair: 0x2b1d14, hairStyle: 'short', top: 0x2d8cf0, sleeves: 'none', inner: 0x2d8cf0, legs: 0x2d8cf0, legStyle: 'shorts', shoes: 0xf6cfa8, bag: null },
    sailor: { hat: 'cap', hatColor: 0xffffff, hatFront: 0x2a3a6a, hair: 0x2b1d14, hairStyle: 'short', top: 0xffffff, sleeves: 'short', inner: 0x2a3a6a, legs: 0x2a3a6a, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    admin: { hat: null, hair: 0xa040e0, hairStyle: 'spiky', top: 0x2a2a3a, sleeves: 'long', inner: 0xffd84a, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0xa040e0, bag: null, scarf: 0xa040e0 },
    rex: { hat: 'bandana', hatColor: 0x3c78d0, hair: 0xe8e0d0, hairStyle: 'spiky', top: 0x3c78d0, sleeves: 'none', inner: 0xffffff, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0xffffff, bag: null },
    // Team Eclipse's leaders, shared by the later chapters (jch4.js...): Director Vex and Admin Rhea
    vex: { hat: null, hair: 0xe8e8f0, hairStyle: 'long', top: 0x1a1a2a, sleeves: 'long', inner: 0xa040e0, legs: 0x1a1a2a, legStyle: 'pants', shoes: 0x2a2a3a, bag: null, scarf: 0xffd84a },
    rhea: { hat: null, hair: 0xe04828, hairStyle: 'pigtails', top: 0x2a2a3a, sleeves: 'none', inner: 0xff8a3a, legs: 0x2a2a3a, legStyle: 'skirt', shoes: 0xa040e0, bag: null },
    curator: { hat: null, hair: 0x9a9aa4, hairStyle: 'short', top: 0x6a4a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x4a3a2a, legStyle: 'pants', shoes: 0x2a1e14, bag: null, scarf: 0xc84848 }
  };

  // =====================================================================
  //  Willowbrook Town (you start here) - home, Sora's house, Hazel's lab
  // =====================================================================
  {
    const B = grid(26, 22).border('T', { n: [11, 13] }, 1);
    B.fill(1, 1, 2, 20, 'T').fill(23, 1, 24, 20, 'T').fill(3, 1, 10, 1, 'T').fill(14, 1, 22, 1, 'T');
    B.fill(11, 0, 13, 3, ',').fill(12, 3, 13, 10, ',').fill(3, 9, 22, 10, ',');
    B.fill(5, 8, 5, 8, ',').fill(19, 8, 19, 8, ',');
    B.fill(17, 10, 17, 18, ',').fill(12, 17, 17, 18, ',').fill(5, 18, 12, 18, ',');
    B.fill(8, 4, 10, 6, '*').fill(14, 4, 15, 6, '*').fill(3, 11, 6, 12, '*');
    B.fill(19, 13, 22, 17, '~').fill(18, 19, 22, 20, '*').fill(3, 20, 10, 20, '*');
    def({ id: 'willowbrook', name: 'Willowbrook Town', kind: 'town', rows: B.rows(), music: 'town',
      buildings: [{ b: 'house', x: 3, y: 4, to: 'home1f', variant: 0 }, { b: 'house2', x: 17, y: 4, to: 'sorahouse' }, { b: 'lab', x: 9, y: 12, to: 'lab' }, { b: 'house3', x: 3, y: 14, to: 'wbhouse' }],
      signs: [{ x: 10, y: 3, text: 'WILLOWBROOK TOWN\nWhere every journey begins.' }, { x: 8, y: 17, text: 'HAZEL POKéMON LAB\nResearch into Mega Evolution.' }, { x: 6, y: 8, text: "{NAME}'s house" }, { x: 20, y: 8, text: "SORA's house" }],
      props: [{ k: 'mailbox', x: 7, y: 8 }, { k: 'mailbox', x: 21, y: 8 }],
      edges: { n: { to: 'route1', dx: -3 } },
      zones: [{ x: 11, y: 2, w: 3, h: 1, event: 'needStarter', block: true }],
      npcs: [{ id: 'girl', x: 9, y: 19, dir: 'down', look: L.lass, wander: 2, talk: 'wbGirl' }, { id: 'fisher', x: 18, y: 15, dir: 'right', look: L.man, talk: 'wbFisher' }] });
  }
  // ---- inside Willowbrook
  def({ id: 'home1f', name: 'Your house', kind: 'inside', outside: 'willowbrook', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').put(9, 1, '<').fill(3, 4, 6, 5, 'R').rows(),
    arrive: { x: 5, y: 6 },
    furniture: [{ k: 'fridge', x: 1, y: 1 }, { k: 'stove', x: 2, y: 1 }, { k: 'shelf', x: 5, y: 1 }, { k: 'tv', x: 7, y: 1, talk: 'tv' }, { k: 'table', x: 4, y: 3 }, { k: 'chair', x: 3, y: 3 }, { k: 'chair', x: 6, y: 3 }, { k: 'plant', x: 1, y: 6 }, { k: 'plant', x: 9, y: 6 }],
    warps: [{ x: 9, y: 1, to: 'home2f', tx: 7, ty: 2, dir: 'down' }],
    npcs: [{ id: 'mom', x: 7, y: 4, dir: 'left', look: L.mom, name: 'Mom', talk: 'mom' }] });
  def({ id: 'home2f', name: 'Your room', kind: 'inside', rows: grid(9, 7, '_').border('#').put(7, 1, '>').fill(3, 3, 5, 4, 'R').rows(),
    furniture: [{ k: 'bed', x: 1, y: 1 }, { k: 'pc', x: 3, y: 1, talk: 'myPc' }, { k: 'tv', x: 5, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 5 }, { k: 'shelf', x: 1, y: 5 }],
    warps: [{ x: 7, y: 1, to: 'home1f', tx: 9, ty: 2, dir: 'down' }] });
  def({ id: 'sorahouse', name: "Sora's house", kind: 'inside', outside: 'willowbrook', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 3, 'R').rows(),
    arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'sofa', x: 5, y: 1 }, { k: 'table', x: 1, y: 3 }, { k: 'plant', x: 7, y: 5 }],
    npcs: [{ id: 'soramom', x: 6, y: 3, dir: 'left', look: L.woman, name: "Sora's Mom", talk: 'soraMom' }, { id: 'sora', x: 3, y: 4, dir: 'up', look: L.sora, name: 'Sora', talk: 'soraHome', show: ['!starter'] }] });
  def({ id: 'wbhouse', name: 'House', kind: 'inside', outside: 'willowbrook', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(),
    arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'granny', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Granny Rue', talk: 'granny' }] });
  def({ id: 'lab', name: 'Hazel Pokémon Lab', kind: 'inside', outside: 'willowbrook', rows: grid(13, 10, '+').border('#').fill(1, 9, 11, 9, '+').put(6, 9, 'm').rows(),
    arrive: { x: 6, y: 8 },
    furniture: [{ k: 'machine', x: 1, y: 1 }, { k: 'shelf', x: 4, y: 1 }, { k: 'shelf', x: 7, y: 1 }, { k: 'machine', x: 10, y: 1 }, { k: 'ballstand', x: 5, y: 4, talk: 'ballstand' }, { k: 'desk', x: 1, y: 6 }, { k: 'pc', x: 11, y: 6, talk: 'labPc' }, { k: 'plant', x: 11, y: 8 }, { k: 'plant', x: 1, y: 8 }],
    npcs: [{ id: 'hazel', x: 6, y: 3, dir: 'down', look: L.hazel, name: 'Prof. Hazel', talk: 'hazel' }, { id: 'sora', x: 9, y: 5, dir: 'left', look: L.sora, name: 'Sora', talk: 'soraLab', show: ['!rival1'] },
      { id: 'aide', x: 3, y: 7, dir: 'right', look: L.aide, name: 'Aide Pim', talk: 'aide' }] });

  // =====================================================================
  //  Route 1 - Willowbrook to Verdant Town
  // =====================================================================
  {
    const B = grid(20, 40, '.').border('T', { s: [8, 10], n: [9, 11] }, 1);
    B.fill(1, 1, 3, 38, 'T').fill(17, 1, 18, 38, 'T');
    B.fill(8, 24, 10, 39, ',').fill(9, 14, 11, 24, ',').fill(9, 0, 11, 14, ',');
    B.fill(4, 30, 7, 35, ';').fill(12, 25, 16, 29, ';').fill(4, 16, 8, 21, ';').fill(12, 8, 16, 13, ';').fill(4, 4, 7, 8, ';');
    B.fill(4, 23, 8, 23, 'v').fill(12, 20, 16, 20, 'v');
    B.fill(12, 33, 15, 36, 'T').fill(4, 10, 6, 13, 'T').fill(13, 15, 15, 17, 'T').fill(12, 2, 14, 4, 'T');
    B.fill(11, 30, 13, 31, '*').fill(4, 26, 6, 27, '*');
    def({ id: 'route1', name: 'Route 1', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 2, max: 4, table: [['pidgey', 30], ['starly', 25], ['caterpie', 15], ['weedle', 15], ['rookidee', 10], ['pichu', 5]] } },
      edges: { s: { to: 'willowbrook', dx: 3 }, n: { to: 'verdant', dx: 4 } },
      zones: [{ x: 4, y: 9, w: 13, h: 1, event: 'soraRoute1' }],      // the whole width of the route: no way past Sora
      signs: [{ x: 11, y: 37, text: 'ROUTE 1\nWillowbrook Town - Verdant Town' }, { x: 12, y: 1, text: 'VERDANT TOWN ahead!' }],
      items: [{ x: 4, y: 14, item: 'poke', n: 1 }, { x: 16, y: 32, item: 'potion', n: 1 }, { x: 16, y: 5, item: 'antidote', n: 1, hidden: true }, { x: 4, y: 37, item: 'oran', n: 1, hidden: true }],
      npcs: [{ id: 'oldman', x: 11, y: 34, dir: 'left', look: L.oldman, name: 'Old Man Bo', talk: 'oldman' },
        { id: 'tim', x: 7, y: 25, dir: 'right', look: L.youngster, name: 'Youngster Tim', trainer: 'r1tim' },
        { id: 'mia', x: 12, y: 18, dir: 'left', look: L.lass, name: 'Lass Mia', trainer: 'r1mia' },
        { id: 'sora', x: 10, y: 6, dir: 'down', look: L.sora, name: 'Sora', talk: 'soraRoute1', show: ['rival1', '!soraR1'] }] });
  }

  // =====================================================================
  //  Verdant Town - Pokémon Center, Mart, the Grass gym
  // =====================================================================
  {
    const B = grid(30, 26).border('T', { s: [13, 15], n: [13, 15], e: [11, 12] }, 1);
    B.fill(1, 1, 1, 24, 'T').fill(28, 1, 28, 10, 'T').fill(28, 13, 28, 24, 'T');
    B.fill(13, 0, 15, 25, ',').fill(2, 11, 29, 12, ',');
    B.fill(6, 9, 7, 10, ',').fill(20, 9, 20, 10, ',').fill(26, 8, 26, 10, ',');
    B.fill(16, 21, 22, 22, ',').fill(6, 20, 12, 21, ',');
    B.fill(9, 3, 11, 8, '*').fill(17, 13, 19, 14, '*').fill(7, 22, 11, 24, '*');
    // a corner behind a tree you can cut (Ride Pager: Scyther)
    B.fill(2, 21, 6, 24, 'T').fill(3, 22, 5, 23, '.').put(4, 21, 'X');
    def({ id: 'verdant', name: 'Verdant Town', kind: 'town', rows: B.rows(), music: 'town', center: { map: 'center_verdant' },
      buildings: [{ b: 'center', x: 4, y: 4, to: 'center_verdant' }, { b: 'mart', x: 18, y: 5, to: 'mart_verdant' }, { b: 'house', x: 24, y: 4, to: 'vhouse', variant: 2 },
        { b: 'gym', x: 18, y: 15, to: 'gym1', variant: 0, needs: ['luna_back'], locked: 'gymLocked' }, { b: 'house3', x: 4, y: 16, to: 'astrohouse', variant: 1 }],
      signs: [{ x: 12, y: 23, text: 'VERDANT TOWN\nGreen and always blooming.' }, { x: 17, y: 20, text: 'VERDANT GYM - Leader: LUNA\nThe gardener of fierce flowers.' }, { x: 16, y: 2, text: 'NORTH: WHISPERWOOD FOREST' }],
      edges: { s: { to: 'route1', dx: -4 }, n: { to: 'whisperwood', dx: 0 }, e: { to: 'route2', dy: 0, needs: ['ch2'] } },
      items: [{ x: 4, y: 22, item: 'rarecandy', n: 1 }, { x: 3, y: 3, item: 'potion', n: 1, hidden: true }],
      npcs: [{ id: 'worker', x: 28, y: 11, dir: 'left', look: L.worker, name: 'Worker', talk: 'worker', show: ['!ch2'] },
        { id: 'guide', x: 16, y: 21, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'gymGuide' },
        { id: 'boy', x: 22, y: 12, dir: 'left', look: L.kid, wander: 3, talk: 'vBoy' }, { id: 'lady', x: 9, y: 13, dir: 'down', look: L.woman, wander: 2, talk: 'vLady' }] });
  }
  // ---- generic insides: Pokémon Center, Poké Mart
  // o: anything more for the map (a chapter file passes { chapter: N })
  function center(id, outside, o = {}) {
    def({ ...o, id, name: 'Pokémon Center', kind: 'inside', outside, rows: grid(13, 9, '+').border('#').fill(1, 8, 11, 8, '+').put(6, 8, 'm').fill(5, 5, 7, 6, 'R').rows(), isCenter: true,
      arrive: { x: 6, y: 7 },
      furniture: [{ k: 'counter', x: 4, y: 3 }, { k: 'healer', x: 8, y: 2 }, { k: 'pc', x: 11, y: 1, talk: 'boxPc' }, { k: 'plant', x: 1, y: 1 }, { k: 'sofa', x: 1, y: 6 }, { k: 'plant', x: 11, y: 7 }, { k: 'shelf', x: 1, y: 3 }],
      npcs: [{ id: 'nurse', x: 6, y: 2, dir: 'down', look: L.nurse, name: 'Nurse Bell', talk: 'nurse', counter: true }] });
  }
  function mart(id, outside, stock, o = {}) {
    def({ ...o, id, name: 'Poké Mart', kind: 'inside', outside, stock, rows: grid(11, 8, '+').border('#').fill(1, 7, 9, 7, '+').put(5, 7, 'm').rows(),
      arrive: { x: 5, y: 6 },
      furniture: [{ k: 'counter', x: 1, y: 3 }, { k: 'martshelf', x: 6, y: 1 }, { k: 'martshelf', x: 6, y: 4 }, { k: 'plant', x: 9, y: 6 }],
      npcs: [{ id: 'clerk', x: 2, y: 2, dir: 'down', look: L.clerk, name: 'Clerk', talk: 'clerk', counter: true }] });
  }
  center('center_verdant', 'verdant');
  mart('mart_verdant', 'verdant', ['poke', 'potion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'repel']);
  def({ id: 'vhouse', name: 'House', kind: 'inside', outside: 'verdant', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 5, y: 1, talk: 'tv' }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }],
    npcs: [{ id: 'kid', x: 6, y: 4, dir: 'left', look: L.kid, name: 'Nico', talk: 'nico' }, { id: 'dad', x: 2, y: 4, dir: 'right', look: L.man, name: 'Nico\'s Dad', talk: 'nicoDad' }] });
  def({ id: 'astrohouse', name: "Orrin's Observatory", kind: 'inside', outside: 'verdant', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(2, 3, 6, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'machine', x: 4, y: 1, talk: 'telescope' }, { k: 'plant', x: 7, y: 1 }, { k: 'desk', x: 1, y: 5 }],
    npcs: [{ id: 'orrin', x: 6, y: 3, dir: 'left', look: L.astro, name: 'Astronomer Orrin', talk: 'orrin' }] });

  // =====================================================================
  //  Whisperwood Forest - the ancient tree (Team Eclipse!)
  // =====================================================================
  {
    const B = grid(30, 34, 'T');
    const carve = (x0, y0, x1, y1, c = ',') => B.fill(x0, y0, x1, y1, c);
    carve(13, 26, 15, 33);
    carve(5, 24, 15, 25); carve(5, 14, 6, 25); carve(5, 13, 22, 14); carve(21, 7, 22, 14); carve(15, 7, 22, 8);
    carve(9, 2, 20, 7, '.'); carve(13, 7, 16, 8, ',');
    carve(7, 26, 11, 30, ';'); carve(2, 15, 4, 22, ';'); carve(8, 9, 12, 12, ';'); carve(23, 15, 27, 20, ';'); carve(16, 26, 20, 30, ';'); carve(16, 9, 19, 11, ';');
    carve(7, 15, 10, 19, '.'); carve(17, 16, 20, 21, '.'); carve(23, 21, 26, 23, '.');
    carve(16, 22, 20, 25, '.'); carve(21, 21, 22, 22, '.'); carve(23, 13, 24, 14, ';');
    B.fill(10, 3, 11, 4, '*').fill(18, 3, 19, 4, '*');
    def({ id: 'whisperwood', name: 'Whisperwood Forest', kind: 'forest', rows: B.rows(), music: 'forest', battle: 'forest', dark: 0.25,
      encounters: { tall: { rate: 0.13, min: 4, max: 8, table: [['caterpie', 18], ['weedle', 18], ['oddish', 14], ['bellsprout', 14], ['shroomish', 10], ['venipede', 10], ['pidgey', 8], ['ralts', 4], ['eevee', 3], ['pichu', 1]] } },
      edges: { s: { to: 'verdant', dx: 0 } },
      props: [{ k: 'bigtree', x: 13, y: 2 }],
      items: [{ x: 2, y: 16, item: 'potion', n: 1 }, { x: 26, y: 18, item: 'poke', n: 2 }, { x: 24, y: 22, item: 'great', n: 1 }, { x: 9, y: 16, item: 'antidote', n: 1, hidden: true }],
      signs: [{ x: 16, y: 31, text: 'WHISPERWOOD FOREST\nMind the bug nets!' }],
      // the whole mouth of the clearing (the west path and the east path both lead in), and talking to any of the
      // three starts the scene too
      zones: [{ x: 13, y: 8, w: 10, h: 1, event: 'eclipseForest', needs: ['!luna_back'] }],
      npcs: [{ id: 'rick', x: 6, y: 20, dir: 'up', look: L.bug, name: 'Bug Catcher Rick', trainer: 'wwRick' },
        { id: 'lily', x: 18, y: 13, dir: 'left', look: L.bug, name: 'Bug Catcher Lily', trainer: 'wwLily' },
        { id: 'grunt1', x: 12, y: 5, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'eclipseForest', show: ['!luna_back'] },
        { id: 'grunt2', x: 17, y: 5, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'eclipseForest', show: ['!luna_back'] },
        { id: 'luna', x: 14, y: 6, dir: 'up', look: L.luna, name: 'Luna', talk: 'eclipseForest', show: ['!luna_back'] }] });
  }

  // =====================================================================
  //  Verdant Gym - a maze of vines; Luna waits at the top
  // =====================================================================
  {
    const B = grid(15, 17, 'g').border('V').fill(0, 0, 14, 0, '#').put(7, 16, 'm');
    B.fill(1, 13, 10, 13, 'V').fill(4, 10, 13, 10, 'V').fill(1, 7, 10, 7, 'V').fill(4, 4, 13, 4, 'V');
    B.fill(5, 1, 9, 2, 'R');
    def({ id: 'gym1', name: 'Verdant Gym', kind: 'inside', gym: true, outside: 'verdant', rows: B.rows(), battle: 'stadium', music: 'gym', arrive: { x: 7, y: 15 },
      furniture: [{ k: 'statue', x: 5, y: 14, talk: 'gymStatue' }, { k: 'statue', x: 9, y: 14, talk: 'gymStatue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }],
      npcs: [{ id: 'fern', x: 12, y: 12, dir: 'left', look: L.aroma, name: 'Aroma Lady Fern', trainer: 'g1fern' },
        { id: 'ivo', x: 2, y: 9, dir: 'right', look: L.camper, name: 'Camper Ivo', trainer: 'g1ivo' },
        { id: 'tess', x: 12, y: 6, dir: 'left', look: L.aroma, name: 'Aroma Lady Tess', trainer: 'g1tess' },
        { id: 'luna', x: 7, y: 2, dir: 'down', look: L.luna, name: 'Leader Luna', trainer: 'luna' }] });
  }

  // =====================================================================
  //  Route 2 (Chapter 2) - Verdant Town to Port Coralis, past the cleared rockslide
  // =====================================================================
  {
    const B = grid(48, 24, '.').border('T', { w: [11, 12], e: [15, 16] }, 1);
    B.fill(1, 1, 46, 2, 'T').fill(1, 21, 46, 22, 'T');
    // the road: in from Verdant, up past the rockslide, along the top, down and out east
    B.fill(0, 11, 14, 12, ',').fill(13, 6, 14, 12, ',').fill(13, 6, 30, 7, ',').fill(29, 6, 30, 16, ',').fill(29, 15, 47, 16, ',');
    // what is left of the rockslide
    B.fill(16, 8, 19, 9, 'r').fill(21, 3, 23, 4, 'r').put(11, 9, 'r').put(10, 8, 'r').put(26, 9, 'r');
    // a pond in a sandy hollow (Fisherman Gil)
    B.fill(3, 14, 11, 19, ':').fill(5, 15, 9, 18, '~');
    // tall grass
    B.fill(3, 4, 10, 7, ';').fill(17, 11, 26, 15, ';').fill(33, 8, 44, 12, ';').fill(32, 18, 44, 19, ';');
    // a ledge: a quick way down from the east meadow to the road
    B.fill(31, 13, 38, 13, 'v');
    B.fill(14, 17, 20, 19, '*').fill(36, 3, 39, 4, '*');
    def({ id: 'route2', name: 'Route 2', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 8, max: 12, table: [['mareep', 20], ['shinx', 16], ['starly', 14], ['nidoran-f', 10], ['nidoran-m', 10], ['meowth', 10], ['sandshrew', 8], ['rockruff', 6], ['wingull', 4], ['phanpy', 2]] } },
      edges: { w: { to: 'verdant', dy: 0 }, e: { to: 'port', dy: -6 } },
      // Sora waits near the east end: this column runs the whole height of the route, so there is no way round her
      zones: [{ x: 42, y: 3, w: 1, h: 18, event: 'soraRoute2' }],
      signs: [{ x: 2, y: 10, text: 'ROUTE 2\nVerdant Town - Port Coralis' }, { x: 45, y: 14, text: 'PORT CORALIS ahead!\nMind the sea breeze.' }],
      items: [{ x: 46, y: 4, item: 'shard', n: 1 }, { x: 3, y: 20, item: 'superpotion', n: 1 }, { x: 20, y: 19, item: 'great', n: 1 }, { x: 24, y: 3, item: 'tm:rock-tomb', n: 1, hidden: true }, { x: 4, y: 3, item: 'oran', n: 1, hidden: true }],
      npcs: [{ id: 'worker2', x: 15, y: 8, dir: 'left', look: L.worker, name: 'Worker', talk: 'worker2' },
        { id: 'dale', x: 22, y: 5, dir: 'down', look: L.hiker, name: 'Hiker Dale', trainer: 'r2dale' },
        { id: 'joy', x: 31, y: 10, dir: 'left', look: L.picnicker, name: 'Picnicker Joy', trainer: 'r2joy' },
        { id: 'gil', x: 10, y: 16, dir: 'left', look: L.fisher, name: 'Fisherman Gil', trainer: 'r2gil' },
        { id: 'ren', x: 38, y: 17, dir: 'up', look: L.camper, name: 'Camper Ren', trainer: 'r2ren' },
        { id: 'sora', x: 44, y: 15, dir: 'left', look: L.sora, name: 'Sora', talk: 'soraRoute2', show: ['!rival2'] }] });
  }

  // =====================================================================
  //  Port Coralis - a harbor town: Pokémon Center, Mart, the Maritime
  //  Museum, the Water gym; Seacliff Cave in the cliffs to the north
  // =====================================================================
  {
    const B = grid(34, 28, '.').border('T', { w: [9, 10], n: [16, 16] }, 1);
    B.fill(1, 0, 15, 1, 'r').fill(17, 0, 32, 1, 'r');
    B.fill(0, 21, 33, 27, '~').fill(1, 18, 32, 20, ':');
    B.fill(0, 9, 32, 10, ',').fill(16, 0, 17, 17, ',').put(17, 0, 'r').put(17, 1, 'r');
    B.fill(5, 8, 6, 8, ',').fill(12, 8, 12, 8, ',').fill(23, 7, 24, 8, ',').fill(24, 17, 25, 17, ',');
    // the pier, out into the sea
    B.fill(24, 21, 25, 25, '_');
    B.fill(28, 3, 31, 6, '*').fill(1, 16, 3, 17, '*');
    def({ id: 'port', name: 'Port Coralis', kind: 'town', rows: B.rows(), music: 'town', battle: 'beach', center: { map: 'center_port' }, dock: { x: 24, y: 22, dir: 'down' },
      buildings: [{ b: 'center', x: 3, y: 3, to: 'center_port' }, { b: 'mart', x: 10, y: 4, to: 'mart_port' }, { b: 'museum', x: 20, y: 2, to: 'museum' },
        { b: 'gym', x: 21, y: 12, to: 'gym2', variant: 1, needs: ['rex_back'], locked: 'gym2Locked' },
        { b: 'house', x: 4, y: 12, to: 'phouse', variant: 3 }, { b: 'house2', x: 10, y: 12, to: 'fhouse' }],
      signs: [{ x: 14, y: 11, text: 'PORT CORALIS\nWhere the sea meets the sky.' }, { x: 19, y: 7, text: 'CORALIS MARITIME MUSEUM\nShips, fossils and a star from the sky.' },
        { x: 20, y: 17, text: 'CORALIS GYM - Leader: REX\nThe captain of crashing waves.' }, { x: 23, y: 20, text: 'FERRY PIER\nVoltara City - service suspended.' }],
      edges: { w: { to: 'route2', dy: 6 }, n: { to: 'seacliff', dx: -6, needs: ['museum'] } },
      items: [{ x: 31, y: 19, item: 'potion', n: 2, hidden: true }],
      npcs: [{ id: 'guard', x: 16, y: 1, dir: 'down', look: L.sailor, name: 'Sailor Hal', talk: 'caveGuard', show: ['!museum'] },
        { id: 'greeter', x: 3, y: 8, dir: 'right', look: L.sailor, name: 'Sailor Pip', talk: 'portSailor' },
        { id: 'ferry', x: 25, y: 24, dir: 'up', look: L.sailor, name: 'Ferryman', talk: 'ferry' },
        { id: 'pkid', x: 9, y: 19, dir: 'down', look: L.kid, wander: 3, talk: 'portKid' },
        { id: 'plady', x: 29, y: 11, dir: 'left', look: L.oldlady, wander: 2, talk: 'portLady' },
        { id: 'guide2', x: 19, y: 15, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'gymGuide2' }] });
  }
  center('center_port', 'port');
  mart('mart_port', 'port', ['poke', 'great', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'fullheal', 'repel']);
  def({ id: 'phouse', name: 'House', kind: 'inside', outside: 'port', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'table', x: 1, y: 4 }],
    npcs: [{ id: 'marina', x: 6, y: 3, dir: 'left', look: L.woman, name: 'Marina', talk: 'portWoman' }] });
  def({ id: 'fhouse', name: "Old Salt's house", kind: 'inside', outside: 'port', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'oldsalt', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Old Salt Ned', talk: 'oldSalt' }] });
  // ---- the Maritime Museum: the empty case where the Coral Meteorite stood
  def({ id: 'museum', name: 'Coralis Maritime Museum', kind: 'inside', outside: 'port', rows: grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm').fill(6, 6, 8, 8, 'R').rows(),
    arrive: { x: 7, y: 8 },
    furniture: [{ k: 'statue', x: 2, y: 2, talk: 'exhibitStatue' }, { k: 'machine', x: 4, y: 1, talk: 'exhibitShip' }, { k: 'shelf', x: 9, y: 1, talk: 'exhibitFossil' }, { k: 'statue', x: 12, y: 2, talk: 'exhibitStatue' },
      { k: 'table', x: 6, y: 4, talk: 'emptyCase' }, { k: 'desk', x: 1, y: 6 }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }],
    npcs: [{ id: 'curator', x: 11, y: 6, dir: 'left', look: L.curator, name: 'Curator Wells', talk: 'curator' },
      { id: 'rex', x: 5, y: 6, dir: 'right', look: L.rex, name: 'Rex', talk: 'rexMuseum', show: ['!rex_back'] }] });

  // =====================================================================
  //  Seacliff Cave - Team Eclipse's hideout with the stolen meteorite
  // =====================================================================
  {
    const B = grid(26, 22, 'C');
    const carve = (x0, y0, x1, y1, c = 'c') => B.fill(x0, y0, x1, y1, c);
    carve(9, 15, 11, 20); carve(10, 21, 10, 21);       // in from the port (a one-tile gap in the cliff)
    carve(3, 13, 20, 15);                              // the long hall
    carve(3, 3, 5, 13); carve(3, 3, 10, 5);            // west: up to a quiet side room
    carve(17, 6, 19, 13);                              // east: up to Kael's chamber
    carve(13, 2, 23, 6);                               // the chamber
    carve(7, 9, 8, 11, '~'); carve(6, 9, 6, 11); carve(4, 9, 5, 9);   // a tide pool by the west passage
    B.put(15, 3, 'r').put(22, 5, 'r').put(13, 14, 'r').put(7, 13, 'r');
    def({ id: 'seacliff', name: 'Seacliff Cave', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'volcano', dark: 0.32,
      encounters: { cave: { rate: 0.07, min: 10, max: 14, table: [['zubat', 30], ['geodude', 24], ['diglett', 12], ['aron', 10], ['drilbur', 8], ['sableye', 6], ['binacle', 5], ['onix', 5]] } },
      edges: { s: { to: 'port', dx: 6 } },
      zones: [{ x: 17, y: 6, w: 3, h: 1, event: 'kaelCave' }],
      items: [{ x: 4, y: 4, item: 'shard', n: 1, hidden: true }, { x: 9, y: 3, item: 'great', n: 2 }, { x: 20, y: 14, item: 'superpotion', n: 1 }, { x: 23, y: 2, item: 'fullheal', n: 1 }],
      npcs: [{ id: 'grunt3', x: 10, y: 16, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'grunt3' },
        { id: 'grunt4', x: 18, y: 10, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'grunt4' },
        { id: 'kael', x: 18, y: 3, dir: 'down', look: L.admin, name: 'Admin Kael', talk: 'kaelCave', show: ['!kael'] },
        { id: 'grunt5', x: 16, y: 3, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', talk: 'kaelCave', show: ['!kael'] }] });
  }

  // =====================================================================
  //  Coralis Gym - channels of seawater; Rex waits at the top
  // =====================================================================
  {
    const B = grid(15, 17, '+').border('#').put(7, 16, 'm');
    B.fill(1, 13, 10, 13, '~').fill(4, 10, 13, 10, '~').fill(1, 7, 10, 7, '~').fill(4, 4, 13, 4, '~');
    B.fill(5, 1, 9, 2, 'R');
    def({ id: 'gym2', name: 'Coralis Gym', kind: 'inside', gym: true, outside: 'port', rows: B.rows(), battle: 'beach', music: 'gym', arrive: { x: 7, y: 15 },
      furniture: [{ k: 'statue', x: 5, y: 14, talk: 'gymStatue2' }, { k: 'statue', x: 9, y: 14, talk: 'gymStatue2' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }],
      npcs: [{ id: 'nia', x: 12, y: 12, dir: 'left', look: L.swimmer, name: 'Swimmer Nia', trainer: 'g2nia' },
        { id: 'otto', x: 2, y: 9, dir: 'right', look: L.fisher, name: 'Fisherman Otto', trainer: 'g2otto' },
        { id: 'kai', x: 12, y: 6, dir: 'left', look: L.swimmer, name: 'Swimmer Kai', trainer: 'g2kai' },
        { id: 'rex', x: 7, y: 2, dir: 'down', look: L.rex, name: 'Leader Rex', trainer: 'rex' }] });
  }

  // Chapter 2's maps (the chapter checker and the playthrough test go by these tags)
  for (const id of ['route2', 'port', 'center_port', 'mart_port', 'phouse', 'fhouse', 'museum', 'seacliff', 'gym2']) M[id].chapter = 2;

  // tiles of a building's footprint / its door tiles (map coordinates)
  const doorsOf = b => JArt.BUILD[b.b].door.map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy }));
  // what blocks walking on a map, tile by tile (true = solid); the same grid the engine and the checker use
  function solidGrid(m, flags = {}) {
    const S = m.rows.map(r => [...r].map(ch => JArt.SOLID.has(JArt.KIND[ch]) || ch === 'X' || ch === 'S'));
    const mark = (x, y, v = true) => { if (S[y] && x >= 0 && x < m.w) S[y][x] = v; };
    for (const b of m.buildings) { const B0 = JArt.BUILD[b.b]; for (let y = 0; y < B0.h; y++) for (let x = 0; x < B0.w; x++) mark(b.x + x, b.y + y); for (const d of doorsOf(b)) mark(d.x, d.y, false); }
    for (const f of m.furniture) { const F0 = JArt.FURN[f.k]; for (let y = 0; y < F0.h; y++) for (let x = 0; x < F0.w; x++) mark(f.x + x, f.y + y); }
    for (const s of m.signs) mark(s.x, s.y);
    for (const p of m.props) { const big = p.k === 'bigtree'; for (let y = 0; y < (big ? 3 : 1); y++) for (let x = 0; x < (big ? 3 : 1); x++) mark(p.x + x, p.y + y); }
    for (const it of m.items) if (!it.hidden && !flags['it.' + m.id + '.' + it.x + '.' + it.y]) mark(it.x, it.y);
    for (const ch of [['X', 'cut']]) m.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch[0] && flags['cut.' + m.id + '.' + x + '.' + y]) S[y][x] = false; }));
    return S;
  }
  // chapter files (jch3.js...) add their maps with def, center and mart
  return { M, L, doorsOf, solidGrid, grid, def, center, mart };
})();
