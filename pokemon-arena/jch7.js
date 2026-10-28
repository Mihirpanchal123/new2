'use strict';
// =====================================================================
//  JOURNEY - Chapter 7: The Skyspire. Route 7 climbs from Ironridge into the
//  snow; Frostvale sits under the Skyspire, the old tower on the cliffs.
//  Ivy's ice gym first, then the climb: Admin Rhea, Director Vex and the
//  re-forged meteor at the top - and what sleeps inside it (Deoxys).
// =====================================================================
(() => {
  const { def, grid, L, center, mart } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- looks: Ivy, the snow folk and the Skyspire's guardian
  Object.assign(L, {
    c7ivy: { hat: null, hair: 0xdce8f4, hairStyle: 'long', top: 0x7ad0f0, sleeves: 'long', inner: 0xffffff, legs: 0x3a5a8a, legStyle: 'skirt', shoes: 0xe8f4fc, bag: null, scarf: 0xffffff },
    c7skier: { hat: 'beanie', hatColor: 0xe04848, hatFront: 0xffffff, hair: 0x6a3a1a, hairStyle: 'long', top: 0xe04848, sleeves: 'long', inner: 0xffffff, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0x3a3a48, bag: null, scarf: 0xf0d048 },
    c7boarder: { hat: 'beanie', hatColor: 0xf0a030, hatFront: 0x2a2a3a, hair: 0x2b1d14, hairStyle: 'spiky', top: 0xf0a030, sleeves: 'long', inner: 0x2a2a3a, legs: 0x3a5aa8, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    c7ace: { hat: null, hair: 0x2b1d14, hairStyle: 'long', top: 0x2a6ac8, sleeves: 'long', inner: 0xf4f4f4, legs: 0x2a2a3a, legStyle: 'skirt', shoes: 0x2a2a3a, bag: null, scarf: 0xe04848 },
    c7guard: { hat: 'bandana', hatColor: 0x7ad0f0, hair: 0xd9d9d9, hairStyle: 'short', top: 0x3a5a8a, sleeves: 'long', inner: 0xdce8f4, legs: 0x2a3a5a, legStyle: 'pants', shoes: 0x2a2a34, bag: null, scarf: 0x7ad0f0 }
  });

  // ---- items
  ITEMS['tm:ice-beam'] = ITEMS['tm:ice-beam'] || { name: 'TM Ice Beam', pocket: 'tms', price: 0, tm: 'ice-beam', desc: 'Teaches Ice Beam: a freezing beam that may freeze the target solid.' };

  // ---- trainers
  Object.assign(TRAINERS, {
    // Route 7
    c7bram: { team: [['graveler', 42], ['steelix', 43]], pay: 20, theme: 'icecave', before: 'Ironridge rock down there, Frostvale snow up here. My boots know both! Battle!', lose: 'Slipped on my own ice...', after: 'Up in Frostvale the old folks say the Skyspire hums at night. Never heard it myself.' },
    c7skye: { team: [['snorunt', 41], ['spheal', 41], ['glalie', 43]], pay: 20, theme: 'icecave', before: 'Fresh powder and a fresh challenger! Let\'s carve this up!', lose: 'Wiped out...', after: 'Snow fields hide Pokémon. Walk through the deep snow and something always pops out.' },
    c7finn: { team: [['sneasel', 42], ['altaria', 43]], pay: 20, theme: 'icecave', before: 'Whoa, whoa! You\'re in my landing zone! Battle\'s the only way out!', lose: 'Totally bailed.', after: 'Saw a big black bird fly up to the Skyspire last night. Riders on its back, too.' },
    c7wren: { team: [['absol', 43], ['abomasnow', 44]], pay: 22, theme: 'icecave', before: 'Six badges? Then you\'re after the seventh. Let me see if you\'re ready for Ivy.', lose: 'Ready. More than ready.', after: 'Ivy\'s Ice types hate Fire, Fighting, Rock and Steel moves. Remember that.' },
    // Frostvale Gym
    c7lena: { team: [['snover', 44], ['sealeo', 45]], pay: 24, theme: 'icecave', before: 'Mind your footing! The floor here is older than the town.', lose: 'I lost my edge...', after: 'Ivy barely speaks, but her Pokémon hear every word she doesn\'t say.' },
    c7kurt: { team: [['sneasel', 45], ['glalie', 46]], pay: 24, theme: 'icecave', before: 'You made it through the ice blocks? Then let\'s see you get past me!', lose: 'Cold. Stone cold.', after: 'Fire melts ice. Fighting and Steel break it. Rock crushes it. Ice has it rough!' },
    c7mira: { team: [['snorunt', 44], ['sealeo', 45], ['glaceon', 46]], pay: 24, theme: 'icecave', before: 'The last trainer before Lady Ivy. I won\'t let the cold in!', lose: 'Frozen out...', after: 'Lady Ivy\'s family has watched the Skyspire for a hundred generations. Go on - she\'s waiting.' },
    c7ivy: { team: [['froslass', 46], ['abomasnow', 47], ['walrein', 48], ['lapras', 49]], pay: 110, theme: 'icecave', gym: 6, onWin: 'c7ivyWin', name: 'Leader Ivy', look: 'c7ivy',
      before: '...Six badges. Then the stones have noticed you. Show me how warm a bond can burn in the cold.', lose: '...Yes. The ice gives way to warmth like yours.', after: 'The Skyspire. Go.' },
    // the Skyspire: Team Eclipse
    c7grunt1: { team: [['golbat', 43], ['houndoom', 44]], pay: 40, theme: 'icecave', before: 'Nobody goes up! Director\'s orders!', lose: 'The Director\'s gonna freeze me out...', after: 'This tower\'s cold enough to crack teeth. Why couldn\'t the meteor want a beach?', look: 'grunt', name: 'Eclipse Grunt' },
    c7grunt2: { team: [['sneasel', 43], ['toxicroak', 44]], pay: 40, theme: 'icecave', before: 'You again?! Every Eclipse grunt in Valoria knows your face!', lose: 'And now I know your Pokémon, too. Ow.', after: 'Admin Rhea is upstairs. She hasn\'t forgotten Mt. Cinder.', look: 'grunt', name: 'Eclipse Grunt' },
    c7grunt3: { team: [['sableye', 44], ['honchkrow', 45]], pay: 40, theme: 'icecave', before: 'All twelve shards... well, nearly. Enough for the Director. You\'re too late!', lose: 'Too late... for me, anyway.', after: 'The Director says the meteor will answer to power. Funny - it never answered to me.', look: 'grunt', name: 'Eclipse Grunt' },
    c7grunt4: { team: [['scrafty', 44], ['crobat', 45]], pay: 40, theme: 'icecave', before: 'The last guard on the stairs! The Director must not be disturbed!', lose: 'Disturbed. Very disturbed.', after: 'Go on up, then. Maybe somebody should stop this before the whole sky falls.', look: 'grunt', name: 'Eclipse Grunt' },
    c7rhea: { team: [['camerupt', 46], ['houndoom', 46], ['honchkrow', 47], ['magmortar', 48]], pay: 60, theme: 'icecave', onWin: 'c7rheaWin', name: 'Admin Rhea', look: 'rhea',
      before: 'You! The brat from Mt. Cinder! I\'ve been warming up for this rematch ever since!', lose: 'No... not again! Not here!' },
    c7vex: { team: [['honchkrow', 48], ['spiritomb', 49], ['bisharp', 49], ['metagross', 50], ['hydreigon', 51]], pay: 80, theme: 'icecave', name: 'Director Vex', look: 'vex',
      before: 'Bonds are chains. Power is freedom. Let me show you the difference!', lose: 'Impossible... the meteor is mine...', win: 'As I said. Power.' }
  });

  // =====================================================================
  //  Route 7 - from Ironridge up into the snow
  // =====================================================================
  {
    const B = grid(24, 42, 'n').border('p', { n: [10, 12], s: [16, 17] });
    B.fill(1, 1, 1, 40, 'p').fill(22, 1, 22, 40, 'p');
    // the lower slopes are still green
    B.fill(2, 29, 21, 40, '.');
    // the road: up from Ironridge, west, north past the snowfield, east, north again and in to Frostvale
    B.fill(16, 33, 17, 41, ',').fill(5, 33, 17, 34, ',').fill(5, 20, 6, 34, ',').fill(5, 20, 18, 21, ',').fill(17, 8, 18, 21, ',').fill(10, 8, 18, 9, ',').fill(10, 0, 12, 9, ',');
    // a ledge: a quick way back down from the snowfield to the green slopes
    B.fill(7, 28, 20, 28, 'v');
    // tall grass below, a frozen pond and pines above
    B.fill(8, 35, 14, 39, ';').fill(19, 30, 21, 37, ';').fill(2, 36, 4, 40, ';');
    B.fill(8, 12, 14, 16, 'i').put(9, 14, 'r').put(13, 12, 'r');
    B.fill(2, 2, 6, 5, 'p').fill(19, 2, 21, 5, 'p').fill(14, 2, 15, 4, 'p').fill(8, 23, 12, 25, 'p').fill(2, 12, 3, 16, 'p').fill(20, 12, 21, 14, 'p');
    B.put(15, 24, 'r').put(3, 21, 'r').put(20, 26, 'r').put(7, 3, 'r');
    def({ id: 'route7', name: 'Route 7', kind: 'route', chapter: 7, rows: B.rows(), music: 'route', battle: 'icecave',
      encounters: {
        snow: { rate: 0.06, min: 37, max: 41, table: [['snorunt', 22], ['snover', 20], ['sneasel', 14], ['spheal', 14], ['swablu', 10], ['sealeo', 8], ['crabrawler', 6], ['absol', 4], ['frigibax', 2]] },
        tall: { rate: 0.12, min: 36, max: 40, table: [['snover', 24], ['swablu', 22], ['absol', 12], ['sneasel', 16], ['rockruff', 14], ['altaria', 4], ['snorunt', 8]] }
      },
      edges: { s: { to: 'ironridge', dx: 0 }, n: { to: 'frostvale', dx: 6 } },
      signs: [{ x: 15, y: 39, text: 'ROUTE 7\nIronridge City - Frostvale' }, { x: 13, y: 2, text: 'FROSTVALE ahead!\nIn the shadow of the Skyspire.' }],
      items: [{ x: 3, y: 30, item: 'revive', n: 1 }, { x: 20, y: 24, item: 'ultra', n: 2 }, { x: 11, y: 15, item: 'iceheal', n: 2, hidden: true },
        { x: 2, y: 40, item: 'superpotion', n: 1, hidden: true }, { x: 7, y: 6, item: 'fullheal', n: 1 }],
      npcs: [{ id: 'traveler', x: 7, y: 22, dir: 'left', look: L.hiker, name: 'Mountaineer Oda', talk: 'c7traveler' },
        { id: 'bram', x: 4, y: 26, dir: 'right', look: L.hiker, name: 'Hiker Bram', trainer: 'c7bram' },
        { id: 'skye', x: 19, y: 17, dir: 'left', look: L.c7skier, name: 'Skier Skye', trainer: 'c7skye' },
        { id: 'finn', x: 13, y: 7, dir: 'down', look: L.c7boarder, name: 'Boarder Finn', trainer: 'c7finn' },
        { id: 'wren', x: 12, y: 35, dir: 'up', look: L.c7ace, name: 'Ace Trainer Wren', trainer: 'c7wren' }] });
  }

  // =====================================================================
  //  Frostvale - a snowy town under the Skyspire: Center, Mart, the ice gym,
  //  two houses, a frozen pond; the guarded path north up to the tower
  // =====================================================================
  {
    const B = grid(34, 26, 'n').border('p', { s: [16, 18], e: [10, 11] });
    B.fill(1, 1, 1, 24, 'p').fill(1, 24, 15, 24, 'p').fill(19, 24, 32, 24, 'p').fill(32, 1, 32, 9, 'p').fill(32, 12, 32, 24, 'p');
    // the cliffs and the foot of the Skyspire; one narrow stair cut in the rock leads up to its gate
    B.fill(2, 1, 31, 2, 'r').fill(12, 0, 20, 2, '#').put(16, 2, '<');
    B.fill(12, 3, 15, 7, 'r').fill(17, 3, 20, 7, 'r').fill(2, 3, 2, 8, 'p').fill(30, 3, 31, 4, 'p');
    // roads: the main street (east to Victory Road), south to Route 7, north up the stair
    B.fill(2, 10, 33, 11, ',').fill(16, 12, 18, 25, ',').fill(16, 3, 16, 9, ',');
    B.fill(6, 9, 7, 9, ',').fill(23, 9, 24, 9, ',').fill(29, 9, 29, 9, ',').fill(6, 18, 6, 19, ',').fill(26, 18, 26, 19, ',');
    // the frozen pond, and pines along the south
    B.fill(9, 18, 14, 22, 'i').fill(2, 22, 5, 23, 'p').fill(28, 21, 31, 23, 'p').fill(21, 22, 23, 23, 'p');
    def({ id: 'frostvale', name: 'Frostvale', kind: 'town', chapter: 7, rows: B.rows(), music: 'town', battle: 'icecave', center: { map: 'center_frostvale' },
      buildings: [{ b: 'gym', x: 3, y: 3, to: 'gym7', variant: 6 }, { b: 'center', x: 21, y: 4, to: 'center_frostvale' }, { b: 'mart', x: 27, y: 5, to: 'mart_frostvale' },
        { b: 'house', x: 4, y: 14, to: 'fvhouse1', variant: 3 }, { b: 'house2', x: 24, y: 14, to: 'fvhouse2' }],
      signs: [{ x: 19, y: 13, text: 'FROSTVALE\nWhere the snow keeps the old stories.' }, { x: 5, y: 9, text: 'FROSTVALE GYM - Leader: IVY\nThe silent guardian of the Skyspire.' },
        { x: 15, y: 9, text: 'THE SKYSPIRE\nRaised to watch the sky. Entry by leave of the guardian family only.' }, { x: 31, y: 9, text: 'EAST: VICTORY ROAD\nThe Pokémon League lies beyond.' }],
      props: [{ k: 'lamp', x: 14, y: 12 }, { k: 'lamp', x: 20, y: 12 }, { k: 'lamp', x: 10, y: 9 }],
      warps: [{ x: 16, y: 2, to: 'skyspire1', tx: 10, ty: 12, dir: 'up' }],
      edges: { s: { to: 'route7', dx: -6 }, e: { to: 'victoryroad', dy: 0, needs: ['ch8'] } },
      // the way in from Route 7: the first look at the Skyspire
      zones: [{ x: 16, y: 24, w: 3, h: 1, event: 'c7arrive' }],
      items: [{ x: 31, y: 20, item: 'ultra', n: 1, hidden: true }],
      npcs: [{ id: 'guardian', x: 16, y: 6, dir: 'down', look: L.c7guard, name: 'Guardian Sten', talk: 'c7guardian', show: ['!c7spire'] },
        { id: 'guardian2', x: 17, y: 8, dir: 'left', look: L.c7guard, name: 'Guardian Sten', talk: 'c7guardian', show: ['c7spire'] },
        { id: 'guide', x: 9, y: 9, dir: 'down', look: L.man, name: 'Gym Guide', talk: 'c7guide' },
        { id: 'skater', x: 11, y: 20, dir: 'right', look: L.kid, wander: 2, talk: 'c7skater' },
        { id: 'lady', x: 27, y: 12, dir: 'left', look: L.woman, wander: 2, talk: 'c7townLady' },
        { id: 'leaguer', x: 30, y: 12, dir: 'up', look: L.c7ace, name: 'Ace Trainer Pell', talk: 'c7leaguer' }] });
  }
  center('center_frostvale', 'frostvale', { chapter: 7 });
  mart('mart_frostvale', 'frostvale', ['poke', 'great', 'ultra', 'superpotion', 'iceheal', 'burnheal', 'fullheal', 'revive', 'repel'], { chapter: 7 });
  def({ id: 'fvhouse1', name: 'Elder Maren\'s house', kind: 'inside', outside: 'frostvale', chapter: 7, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'c7scroll' }, { k: 'stove', x: 4, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'chair', x: 1, y: 4 }],
    npcs: [{ id: 'maren', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Elder Maren', talk: 'c7maren' }] });
  def({ id: 'fvhouse2', name: 'House', kind: 'inside', outside: 'frostvale', chapter: 7, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }],
    npcs: [{ id: 'skimom', x: 6, y: 3, dir: 'left', look: L.c7skier, name: 'Ski Instructor Hanne', talk: 'c7hanne' }, { id: 'kid', x: 2, y: 4, dir: 'right', look: L.kid, talk: 'c7fvkid' }] });

  // =====================================================================
  //  Frostvale Gym - an ice hall of walls and drifts; Ivy waits at the top
  // =====================================================================
  {
    const B = grid(15, 19, 'i').border('#').put(7, 18, 'm');
    B.fill(1, 15, 10, 15, '#').fill(4, 12, 13, 12, '#').fill(1, 9, 10, 9, '#').fill(4, 6, 13, 6, '#');
    B.fill(5, 1, 9, 2, 'n').fill(1, 13, 2, 14, 'n').fill(12, 7, 13, 8, 'n').fill(1, 4, 3, 5, 'n');
    B.put(6, 14, 'r').put(8, 10, 'r').put(5, 7, 'r').put(10, 4, 'r');
    def({ id: 'gym7', name: 'Frostvale Gym', kind: 'inside', gym: true, outside: 'frostvale', chapter: 7, rows: B.rows(), battle: 'icecave', music: 'gym', arrive: { x: 7, y: 17 },
      furniture: [{ k: 'statue', x: 5, y: 16, talk: 'c7statue' }, { k: 'statue', x: 9, y: 16, talk: 'c7statue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 13, y: 1 }],
      npcs: [{ id: 'lena', x: 12, y: 14, dir: 'left', look: L.c7skier, name: 'Skier Lena', trainer: 'c7lena' },
        { id: 'kurt', x: 2, y: 11, dir: 'right', look: L.c7boarder, name: 'Boarder Kurt', trainer: 'c7kurt' },
        { id: 'mira', x: 12, y: 8, dir: 'left', look: L.c7skier, name: 'Skier Mira', trainer: 'c7mira' },
        { id: 'ivy', x: 7, y: 2, dir: 'down', look: L.c7ivy, name: 'Leader Ivy', trainer: 'c7ivy', show: ['!c7spire'] },
        { id: 'ivy2', x: 7, y: 2, dir: 'down', look: L.c7ivy, name: 'Leader Ivy', talk: 'c7ivyGym', show: ['c7eclipse'] }] });
  }

  // =====================================================================
  //  The Skyspire - three floors up the old tower; the summit is open sky
  // =====================================================================
  // 1F: in from Frostvale at the bottom, up the stairs in the north-east corner
  {
    const B = grid(20, 15, '+').border('#');
    B.fill(1, 10, 7, 10, '#').fill(12, 10, 18, 10, '#').fill(4, 6, 18, 6, '#');
    B.put(5, 3, '#').put(10, 3, '#').put(14, 3, '#').put(5, 12, '#').put(14, 12, '#');
    B.fill(8, 7, 14, 9, 'i').fill(2, 1, 4, 2, 'i').put(10, 13, '>').put(17, 1, '<');
    def({ id: 'skyspire1', name: 'The Skyspire 1F', kind: 'cave', chapter: 7, rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.12,
      warps: [{ x: 10, y: 13, to: 'frostvale', tx: 16, ty: 3, dir: 'down' }, { x: 17, y: 1, to: 'skyspire2', tx: 17, ty: 2, dir: 'down' }],
      items: [{ x: 18, y: 8, item: 'ultra', n: 2 }, { x: 1, y: 1, item: 'fullheal', n: 1 }],
      npcs: [{ id: 'grunt1', x: 2, y: 8, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c7grunt1' },
        { id: 'grunt2', x: 16, y: 4, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c7grunt2' }] });
  }
  // 2F: down the east side, west along the bottom, past Rhea in the one-tile gap, and up the west side to the summit stairs
  {
    const B = grid(20, 15, '+').border('#');
    B.fill(13, 1, 13, 10, '#').fill(1, 10, 12, 10, '#').put(11, 10, '+').fill(4, 6, 12, 6, '#').fill(6, 2, 6, 4, '#').fill(6, 4, 9, 4, '#');
    B.fill(14, 4, 18, 8, 'i').fill(5, 11, 12, 13, 'i').fill(6, 7, 10, 9, 'i').put(16, 11, '#');
    B.put(17, 1, '>').put(1, 1, '<');
    def({ id: 'skyspire2', name: 'The Skyspire 2F', kind: 'cave', chapter: 7, rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.16,
      warps: [{ x: 17, y: 1, to: 'skyspire1', tx: 17, ty: 2, dir: 'down' }, { x: 1, y: 1, to: 'skyspire3', tx: 3, ty: 13, dir: 'up' }],
      // the twelfth Meteor Shard: tucked away in the walled nook at the top of the floor
      items: [{ x: 7, y: 2, item: 'shard', n: 1, hidden: true }, { x: 18, y: 13, item: 'revive', n: 1 }, { x: 12, y: 1, item: 'ultra', n: 3 }],
      npcs: [{ id: 'grunt3', x: 15, y: 12, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c7grunt3' },
        { id: 'rhea', x: 11, y: 10, dir: 'down', look: L.rhea, name: 'Admin Rhea', trainer: 'c7rhea', show: ['!c7rhea'] },
        { id: 'grunt4', x: 2, y: 4, dir: 'down', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c7grunt4' }] });
  }
  // the summit: a platform in the clouds; a narrow bridge leads to the meteor
  {
    const B = grid(20, 16, 'k');
    B.fill(2, 10, 17, 14, '+').fill(8, 7, 11, 9, 'i').fill(3, 2, 16, 6, '+').fill(3, 1, 16, 1, '#');
    B.fill(7, 3, 12, 5, 'i').put(3, 14, '>');
    def({ id: 'skyspire3', name: 'The Skyspire Summit', kind: 'cave', chapter: 7, rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.1,
      warps: [{ x: 3, y: 14, to: 'skyspire2', tx: 1, ty: 2, dir: 'down' }],
      furniture: [{ k: 'statue', x: 9, y: 2, talk: 'c7meteor' }, { k: 'machine', x: 5, y: 2, talk: 'c7machine' }, { k: 'machine', x: 12, y: 2, talk: 'c7machine' }],
      // the bridge, its whole width: Vex (and, if you fell to it, Deoxys) waits beyond
      zones: [{ x: 8, y: 8, w: 4, h: 1, event: 'c7summit' }],
      items: [{ x: 16, y: 13, item: 'ultra', n: 2 }],
      npcs: [{ id: 'vex', x: 9, y: 4, dir: 'down', look: L.vex, name: 'Director Vex', talk: 'c7summit', show: ['!c7eclipse'] },
        { id: 'ivy', x: 5, y: 12, dir: 'right', look: L.c7ivy, name: 'Ivy', talk: 'c7ivyTower', show: ['c7spire', '!c7eclipse'] },
        { id: 'hazel', x: 11, y: 4, dir: 'down', look: L.hazel, name: 'Prof. Hazel', talk: 'c7hazel', show: ['c7deoxys'] }] });
  }

  // =====================================================================
  //  Events
  // =====================================================================
  on('c7traveler', {}, (J, n) => J.say(['Frostvale\'s just north. Mind the deep snow - wild Pokémon burrow in it.', 'Strange thing: last night the old tower above the town glowed purple. Like a bruise on the sky.'], n));
  on('c7arrive', { needs: ['!c7arrive'], sets: ['c7arrive'] }, async J => {
    await J.say(['The wind drops as the road levels out. Snowy roofs, chimney smoke... Frostvale.', 'Above the town, on the cliffs, a stone tower climbs into the clouds: the Skyspire.', 'For a heartbeat, a purple light flickers at its top - then it is gone.']);
    await J.say('(Team Eclipse wanted to re-forge the meteor "at the Skyspire in the far north". This must be it.)');
    J.set('c7arrive');
  });
  on('c7guardian', {}, (J, n) => J.say(J.flag('c7eclipse') ? ['The tower is quiet again. Lady Ivy says the sky owes you a debt.', 'Whatever slept in that stone chose its own way. Perhaps that is how it should be.']
    : J.flag('c7spire') ? ['They flew over the cliffs on black wings - I never saw them pass. Forgive me.', 'Lady Ivy has opened the gate. Go! The stair leads straight into the tower.']
      : ['Halt. The Skyspire is sealed. Only the guardian family - Lady Ivy - may open its gate.', 'Odd lights up there lately... but the seal holds. If you have business, see Lady Ivy at the gym.'], n));
  on('c7guide', {}, (J, n) => J.say(J.flag('badge.glacier') ? 'You beat Ivy! The Glacier Badge - seven badges! The League is in your sights now!'
    : ['Ivy\'s gym is all ice. Watch the walls and find the gaps.', 'She uses Ice types: Fire, Fighting, Rock and Steel moves hit hard. Careful - Lapras and Walrein shrug off Fire!'], n));
  on('c7skater', {}, (J, n) => J.say('Wheee! The pond froze solid this year. Look, I can spin! ...Whoa-oh.', n));
  on('c7townLady', {}, (J, n) => J.say(J.flag('c7eclipse') ? 'The tower was singing last night. Tonight it\'s silent. I think I prefer the silence.' : 'Ivy\'s family has kept the Skyspire for longer than anyone remembers. She doesn\'t say much. She doesn\'t need to.', n));
  on('c7leaguer', {}, (J, n) => J.say(J.flag('ch8') ? 'The road east is open! Victory Road, then the Pokémon League. See you at the top - if you make it!' : ['Victory Road is just east. I\'m training for the League.', 'Word is the road\'s closed while that tower glows. Nobody\'s going anywhere until the sky settles down.'], n));
  on('c7maren', { sets: ['c7maren'] }, async (J, n) => {
    if (J.flag('c7maren')) return J.say(J.flag('c7eclipse') ? 'So the star-child woke and went its way. Ivy told me. Our family watched a thousand years for that... and it was you who saw it.' : 'The meteor does not obey. It answers. Remember that, child.', n);
    await J.say(['Come in, come in, out of the cold. I am Maren - Ivy\'s grandmother.', 'Our family raised the Skyspire when the meteor fell, to watch the sky for whatever might follow it down.', 'The old songs say a child of the stars sleeps in the meteor\'s heart, and it wakes only for a bond, never for a fist.'], n);
    await J.say('Here. A traveler climbing toward trouble should carry one of these.', n);
    await J.give('revive', 2); J.set('c7maren');
  });
  on('c7scroll', {}, J => J.say('An old scroll: a falling star, a tower, and twelve little lights scattered over the land. At the bottom, a figure with long arms of light.'));
  on('c7hanne', { sets: ['c7gift'] }, async (J, n) => {
    if (J.flag('c7gift')) return J.say('Bend your knees, lean into the slope, and never fight the snow. Same goes for battles, I think.', n);
    await J.say(['You came up Route 7 in those shoes? Brave. I teach skiing - and climbing, when the Skyspire allows.', 'Take these. Ultra Balls hold tight, even in a blizzard.'], n);
    await J.give('ultra', 3); J.set('c7gift');
  });
  on('c7fvkid', {}, (J, n) => J.say('Mom says the Skyspire has stairs all the way to the clouds. When I\'m big I\'ll climb it with a Glalie!', n));
  on('c7statue', {}, J => J.say(J.flag('badge.glacier') ? 'FROSTVALE POKéMON GYM - LEADER: IVY\nWinning trainers: {NAME}' : 'FROSTVALE POKéMON GYM - LEADER: IVY\nWinning trainers: ...the frost has covered the names.'));

  // ---- after Ivy: the Glacier Badge, and the Skyspire wakes
  on('c7ivyWin', { sets: ['badge.glacier', 'c7spire'] }, async J => {
    await J.say('...You win. The Glacier Badge. You\'ve earned it.', 'ivy');
    J.badge('glacier');
    await J.give('tm:ice-beam');
    await J.say('Ice Beam. Cold, clean, and true. Use it well.', 'ivy');
    await J.wait(400);
    await J.say(['The hall shudders. Frost cracks on the walls.', 'Through the high windows, the sky goes dark in the middle of the day - and the Skyspire is burning with purple light.']);
    await J.emote('ivy', '!');
    await J.say(['...The seal. Someone is inside the tower.', 'Team Eclipse. They flew over the cliffs and carried their shards to the summit - to the old meteor stone.', 'My family has guarded that stone for a thousand years. I won\'t let them break it open.', '...Come with me, {NAME}. I\'ll open the gate. Up the stair, north of town.'], 'ivy');
    await J.fade(() => { J.set('c7spire'); J.refresh(); });
  });
  on('c7ivyGym', {}, (J, n) => J.say(['...Thank you. The Skyspire is quiet. My grandmother cried, a little. Don\'t tell her I said so.', 'Victory Road is east of town. Seven badges... the League will open its doors for you.'], n));
  on('c7ivyTower', {}, async (J, n) => {
    await J.say(J.flag('c7vex') ? 'It\'s awake. Whatever it is... it\'s waiting for you, not for him. Let me tend your team.' : ['I\'ll hold the stair so none of them slip away.', 'Vex is on the bridge, by the meteor. Let me tend your team first.'], n);
    await J.heal(true);
    await J.say('...Go.', n);
  });

  // ---- the Skyspire: Admin Rhea
  on('c7rheaWin', { sets: ['c7rhea'] }, async (J, n) => {
    await J.say(['Twice! You beat me twice! The Director said you were a fluke...', 'Fine. Go on up. Go see what he\'s made of the meteor. I\'ve stopped being sure it\'s a good idea.'], n || 'rhea');
    await J.fade(() => { J.set('c7rhea'); J.refresh(); });
  });

  // ---- the summit: Director Vex, then Deoxys (a loss on either one is a whiteout: the zone waits for you again)
  on('c7summit', { needs: ['c7spire', '!c7deoxys'], sets: ['c7vexMet', 'c7vex', 'c7deoxys', 'c7deoxysCaught', 'c7eclipse', 'ch8'] }, async J => {
    if (J.flag('c7deoxys')) return J.say('...Leave me be. There is nothing left up here for either of us.', 'vex');
    if (!J.flag('c7vex')) {
      if (!J.flag('c7vexMet')) {
        await J.say(['Eleven shards, fused back into the stone they broke from. Can you hear it singing?', 'For a thousand years it slept in this tower while fools "guarded" it. Tonight, it wakes - and it will obey me.'], 'vex');
        await J.face('vex', 'down'); await J.emote('vex', '!');
        await J.say(['You. The child from Whisperwood, from the hidden lab... Rhea warned me you were persistent.', 'You and your precious bonds. Trainers who beg their Pokémon for loyalty, who share and wait and hope.', 'Power doesn\'t beg. With what sleeps in this meteor, I will eclipse every bond in Valoria - and no one will ever need to hope again.', 'Come, then. Let the stone watch you fall!'], 'vex');
        J.set('c7vexMet');
      } else await J.say('Back again? Good. The stone is still listening. Let it watch you fall a second time.', 'vex');
      if (await J.battle('c7vex') !== 'win') return;   // a whiteout: Vex is still on the bridge next time
      J.set('c7vex');
      await J.say(['No... no! My Pokémon were stronger. Every number said so!', 'It doesn\'t matter. The meteor is complete. AWAKEN! I command you!'], 'vex');
      await J.say(['The meteor flares - white, then violet, then a blinding gold.', 'A crack runs down its face... and the stone splits open like an egg.', 'Something unfolds from the light: long arms like ribbons, a crystal glowing in its chest.']);
      await J.say('Yes! YES! Come to me! I am your master!', 'vex');
      await J.say('It turns away from Vex... and looks straight at you.');
    } else await J.say(['The broken meteor still glows. The creature of light hangs in the air above it, waiting.', 'Vex sits slumped by the stone, staring at nothing.']);
    await J.say('DEOXYS!', { name: 'Deoxys' });
    const r = await J.battle({ wild: true, team: [['deoxys', 50]], theme: 'icecave' });
    if (r === 'lose') return;   // a whiteout: Deoxys waits by the meteor for you to come back
    J.set('c7deoxys');
    if (r === 'caught') { J.set('c7deoxysCaught'); await J.say('Deoxys settles into the ball without a struggle, as though it had chosen to.'); }
    else if (r === 'win') await J.say('Deoxys sinks to the stone, flickers... and streaks away into the night sky, a falling star in reverse.');
    else await J.say('Deoxys watches you a moment longer - then streaks away into the night sky, a falling star in reverse.');
    await J.say('The purple light drains out of the clouds. Somewhere far below, Frostvale\'s lamps come back on.');
    await J.say(['It... looked at you. Not me. Never me.', 'The meteor answered to the bond, not to force. Hazel told me so, years ago, and I laughed at her.', 'I built an army to take what can only be given.'], 'vex');
    await J.fade(() => { J.refresh(); });
    await J.walk('hazel', ['down', 1]);
    await J.say(['{NAME}! Ivy sent word down the tower and I came as fast as an old professor can climb.', 'So the meteor\'s heart was a Pokémon all along. And it woke for you.'], 'hazel');
    await J.say(['...Vex. It\'s been a long time.'], 'hazel');
    await J.say(['Hazel. Spare me. ...You were right. About all of it.', 'Team Eclipse is finished. I\'ll tell them myself - every grunt, every admin. Go home.', 'And the shards... the meteor is broken for good. They\'re only stones now.'], 'vex');
    await J.walk('vex', ['left', 2]);
    await J.fade(() => { J.set('c7eclipse'); J.refresh(); });
    await J.say(['Vex walked down the stairs alone. Ivy says she\'ll see that he reaches the police in Frostvale - and that he went without a word.', 'The grunts are scattering down the mountain. Team Eclipse is no more.'], 'hazel');
    await J.say(['Seven badges, {NAME}. And a bond strong enough that a star chose it.', 'Victory Road starts east of Frostvale. Beyond it, the Pokémon League - the Elite Four and the Champion.', 'Sora went ahead this morning, by the way. Said to tell you she\'ll be waiting at the top. Go on - I\'ll stay and study what\'s left of this stone.'], 'hazel');
    await J.chapter('Chapter 7 complete!', 'Next: Chapter 8 - Champion of Valoria');
    J.set('ch8'); J.refresh();
    await J.chapter('Chapter 8', 'Champion of Valoria');
  });
  on('c7meteor', {}, J => J.say(J.flag('c7deoxys') ? 'The meteor lies split in two, dark and quiet. Eleven dull grey shards are fused into its shell.' : J.flag('c7vex') ? 'The meteor is split open. Light pours out of it.' : 'A huge black stone, older than the tower. Purple shards are jammed into cracks all over it, humming. The air tastes of lightning.'));
  on('c7machine', {}, J => J.say(J.flag('c7eclipse') ? 'Team Eclipse\'s machine. Its screens are dark. Someone has pulled every cable.' : 'A Team Eclipse machine. Cables run from it into the meteor. The screen reads: RESONANCE 97%... 98%...'));
  on('c7hazel', {}, (J, n) => J.say(['The meteor fragments were never batteries. They were... a message. Bond with your Pokémon, and the sky will answer.', 'Victory Road is east of Frostvale. The League is waiting for you, {NAME} - go and show them what a bond can do!'], n));

  chapter({ n: 7, title: 'The Skyspire', start: { map: 'route7', x: 16, y: 40, dir: 'up' }, level: 44, badge: 'glacier', center: 'center_frostvale',
    goals: ['c7arrive', 'badge.glacier', 'c7spire', 'c7rhea', 'c7vex', 'c7deoxys', 'c7eclipse', 'ch8'] });
})();
