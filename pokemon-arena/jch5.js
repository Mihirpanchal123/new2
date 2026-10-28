'use strict';
// =====================================================================
//  JOURNEY - Chapter 5: Mind over Mist. North from Mt. Cinder through the
//  misty Route 5 to Mistral City, where the Psychic leader Ezra senses "a
//  hollow mind" under the old observatory: Team Eclipse's hidden lab, and
//  the first meeting with Director Vex. Then the teleport-pad gym.
// =====================================================================
(() => {
  const { def, grid, L, center, mart } = JMaps;
  const { on, ITEMS, TRAINERS, chapter } = JStory;

  // ---- new people
  L.c5ezra = { hat: null, hair: 0x3a2a5a, hairStyle: 'long', top: 0x6a4aa8, sleeves: 'long', inner: 0xe8dcf8, legs: 0x3a2a5a, legStyle: 'pants', shoes: 0x2a2a3a, bag: null, scarf: 0xf0d048 };
  L.c5psychic = { hat: 'bandana', hatColor: 0xa058c8, hair: 0x2b1d14, hairStyle: 'short', top: 0xa058c8, sleeves: 'long', inner: 0xf4e8ff, legs: 0x3a2a5a, legStyle: 'pants', shoes: 0x2a2a3a, bag: null };
  L.c5hex = { hat: null, hair: 0x4a2a6a, hairStyle: 'long', top: 0x3a2a4a, sleeves: 'long', inner: 0xa058c8, legs: 0x3a2a4a, legStyle: 'skirt', shoes: 0x2a2a3a, bag: null };
  L.c5medium = { hat: 'bandana', hatColor: 0xffffff, hair: 0x2b1d14, hairStyle: 'long', top: 0xf4f0e8, sleeves: 'long', inner: 0xc84848, legs: 0xc84848, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null };
  L.c5sci = { hat: null, hair: 0x5a5a6a, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'long', inner: 0xa040e0, legs: 0x2a2a3a, legStyle: 'pants', shoes: 0xa040e0, bag: null };

  // ---- items
  if (!ITEMS['tm:psychic']) ITEMS['tm:psychic'] = { name: 'TM Psychic', pocket: 'tms', price: 0, tm: 'psychic', desc: 'Teaches Psychic: a strong telekinetic attack that may lower Sp. Def.' };

  // ---- trainers
  Object.assign(TRAINERS, {
    // Route 5
    c5mira: { team: [['kadabra', 31], ['meowstic', 32]], pay: 20, theme: 'forest', before: 'I saw you coming three turns of the path ago. I also saw myself winning. Let\'s check!', lose: 'The mist must have clouded my vision...', after: 'Mistral\'s leader Ezra sees much further than me. They say he dreams of things before they happen.' },
    c5wren: { team: [['misdreavus', 30], ['haunter', 32]], pay: 20, theme: 'forest', before: 'Hee hee... the mist hides all sorts of things. Like me!', lose: 'Hee... you see through mist AND me.', after: 'Ghosts love the mist on this route. So do I. Hee hee.' },
    c5ash: { team: [['gloom', 31], ['staravia', 32]], pay: 18, theme: 'forest', before: 'I\'ve been lost in this fog for two days. A battle will cheer me up!', lose: 'Lost the battle AND still lost. Great.', after: 'If you get turned around, keep heading north. Mistral City is up there somewhere.' },
    c5june: { team: [['swablu', 31], ['kirlia', 33]], pay: 20, theme: 'forest', before: 'Mistral is just past these trees. You\'ll have to get past me first!', lose: 'Okay, okay - you\'ve earned the city.', after: 'People in purple come out of the old observatory at night. Nobody in Mistral talks about it.' },
    // the lab under the observatory: Team Eclipse
    c5gr1: { team: [['golbat', 33], ['houndour', 33]], pay: 40, theme: 'city', name: 'Eclipse Grunt', look: 'grunt', before: 'Hey! How did you get down here? This lab doesn\'t exist!', lose: 'Ugh... it existed long enough for me to lose.', after: 'The pads take you all over the lab. Even WE get lost.' },
    c5sci1: { team: [['porygon', 33], ['magneton', 34]], pay: 40, theme: 'city', name: 'Eclipse Scientist', look: 'c5sci', before: 'A child? In my laboratory? My Pokémon need test data. You\'ll do.', lose: 'Fascinating. Infuriating, but fascinating.', after: 'The shards resonate with each other. Bring enough together, and... well. The Director will explain. Or he won\'t.' },
    c5gr2: { team: [['croagunk', 33], ['sableye', 34]], pay: 40, theme: 'city', name: 'Eclipse Grunt', look: 'grunt', before: 'Nobody gets to the Director! Nobody!', lose: 'Somebody... got to the Director.', after: 'Go on, then. He\'s been waiting for you, I think. That\'s the scary part.' },
    c5gr3: { team: [['houndoom', 34], ['scraggy', 34]], pay: 40, theme: 'city', name: 'Eclipse Grunt', look: 'grunt', before: 'We\'re packing up, kid. You picked a bad day to visit!', lose: 'A bad day for ME, it turns out.', after: 'We\'re moving the shards north. Oops. Forget I said that.' },
    c5gr4: { team: [['golbat', 34], ['toxicroak', 35]], pay: 40, theme: 'city', name: 'Eclipse Grunt', look: 'grunt', before: 'Last line before the Director! Team Eclipse never breaks!', lose: 'Team Eclipse... bent a little.', after: 'The Director doesn\'t lose his temper. He doesn\'t need to.' },
    // Mistral Gym
    c5g1: { team: [['meditite', 34], ['kadabra', 35]], pay: 24, theme: 'stadium', before: 'Step onto the right pad and you move forward. The wrong one... and you\'re back at the door!', lose: 'My focus... scattered.', after: 'Ezra\'s Pokémon hate Bug, Ghost and Dark moves. Just so you know.' },
    c5g2: { team: [['espurr', 34], ['kirlia', 35], ['chimecho', 35]], pay: 24, theme: 'stadium', before: 'I read your mind. You\'re thinking about winning. ...So am I!', lose: 'I should have read further ahead.', after: 'The pad in the far corner is the true path. The mind finds it, eventually.' },
    c5g3: { team: [['slowbro', 36], ['medicham', 36]], pay: 24, theme: 'stadium', before: 'One pad stands between you and Ezra. One pad, and me!', lose: 'Clear mind, clear win. Yours, sadly.', after: 'Go on. Ezra already knows how your battle will start. Surprise him.' },
    c5ezra: { team: [['meowstic', 36], ['malamar', 37], ['espeon', 38], ['alakazam', 39]], pay: 120, theme: 'stadium', gym: 4, onWin: 'c5ezraWin', name: 'Leader Ezra', look: 'c5ezra',
      before: 'I dreamed of this battle three nights ago. In the dream, I could not see who won. Show me, {NAME}.', lose: 'So that was the ending. A good one.', after: 'The future is mist. Your bond with your Pokémon is the lamp that cuts through it.' }
  });

  // =====================================================================
  //  Route 5 - a misty forest road, north from Mt. Cinder to Mistral City
  // =====================================================================
  {
    const B = grid(24, 42, 'T');
    const carve = (x0, y0, x1, y1, c = ',') => B.fill(x0, y0, x1, y1, c);
    // the road: up from Cinder, west, north, east, north, west, and out to Mistral
    carve(14, 34, 15, 41); carve(5, 33, 15, 34); carve(5, 21, 6, 34); carve(5, 20, 18, 21); carve(17, 9, 18, 21); carve(10, 8, 18, 9); carve(10, 0, 11, 9);
    // meadows of tall grass beside it
    carve(8, 23, 13, 31, ';'); carve(7, 23, 7, 31, '.'); carve(8, 32, 13, 32, 'v');                  // a ledge down to the road
    carve(16, 23, 20, 31, ';'); carve(16, 22, 20, 22, '.');
    carve(7, 11, 15, 17, ';'); carve(7, 18, 15, 18, '.'); carve(7, 19, 15, 19, 'v');                  // the north meadow, a ledge down to the road
    carve(12, 10, 16, 10, '.'); carve(16, 11, 16, 18, '.');
    // the misty pond in the north-east, a quiet clearing in the north-west (something purple glows there)
    carve(13, 1, 20, 6, '.'); carve(14, 2, 19, 5, '~'); carve(12, 6, 13, 7, '.');
    carve(4, 2, 8, 6, '.'); carve(4, 7, 9, 7, ','); carve(4, 3, 5, 4, '*');
    // the south-west hollow (and the east wood south of the meadow)
    carve(3, 37, 9, 40, '.'); carve(10, 39, 13, 39, ','); carve(16, 33, 20, 36, '.'); carve(17, 37, 20, 40, ';');
    B.put(16, 38, '.').put(12, 2, '.').put(7, 25, 'r').put(19, 27, 'r').put(3, 38, 'B').put(9, 37, 'B');
    def({ id: 'route5', name: 'Route 5', kind: 'route', chapter: 5, rows: B.rows(), music: 'forest', battle: 'forest', dark: 0.15,
      encounters: { tall: { rate: 0.12, min: 27, max: 31, table: [['gloom', 16], ['golbat', 14], ['espurr', 14], ['misdreavus', 10], ['kirlia', 10], ['inkay', 10], ['duskull', 8], ['chingling', 8], ['staravia', 6], ['abra', 4]] } },
      edges: { s: { to: 'cinder', dx: 0 }, n: { to: 'mistral', dx: 6 } },
      signs: [{ x: 16, y: 38, text: 'ROUTE 5\nMt. Cinder - Mistral City\nMind the mist.' }, { x: 12, y: 2, text: 'MISTRAL CITY ahead.\nThe city where the mist thinks.' }],
      items: [{ x: 4, y: 3, item: 'shard', n: 1 }, { x: 20, y: 24, item: 'superpotion', n: 1 }, { x: 11, y: 12, item: 'ultra', n: 2 }, { x: 4, y: 40, item: 'revive', n: 1, hidden: true }, { x: 20, y: 6, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'mira', x: 5, y: 27, dir: 'down', look: L.c5psychic, name: 'Psychic Mira', trainer: 'c5mira' },
        { id: 'wren', x: 12, y: 20, dir: 'down', look: L.c5hex, name: 'Hex Maniac Wren', trainer: 'c5wren' },
        { id: 'ash', x: 18, y: 14, dir: 'left', look: L.camper, name: 'Camper Ash', trainer: 'c5ash' },
        { id: 'june', x: 14, y: 8, dir: 'down', look: L.picnicker, name: 'Picnicker June', trainer: 'c5june' },
        { id: 'hiker', x: 18, y: 34, dir: 'left', look: L.hiker, name: 'Hiker Bram', talk: 'c5hiker' }] });
  }

  // =====================================================================
  //  Mistral City - quiet streets, psychic plazas, the old observatory
  // =====================================================================
  {
    const B = grid(34, 26, '.').border('T', { s: [16, 17], e: [12, 13] }, 1);
    B.fill(1, 1, 32, 1, 'T').fill(1, 2, 1, 24, 'T').fill(32, 2, 32, 11, 'T').fill(32, 14, 32, 24, 'T');
    // the roads: up from Route 5, and across the city to the east gate
    B.fill(16, 14, 17, 25, ',').fill(2, 12, 33, 13, ',');
    B.fill(5, 9, 6, 11, ',').fill(13, 9, 13, 11, ',').fill(24, 8, 25, 11, ',');
    B.fill(5, 20, 5, 21, ',').fill(11, 21, 11, 21, ',').fill(3, 22, 15, 22, ',');
    // the psychic plazas: the crossroads, and the forecourt of the gym
    B.fill(14, 10, 19, 15, 'P').fill(20, 14, 21, 23, 'P').fill(20, 22, 30, 23, 'P');
    // pines and flowers
    B.fill(2, 2, 3, 3, 'p').fill(29, 2, 31, 4, 'p').fill(2, 23, 4, 24, 'p').fill(28, 24, 31, 24, 'p').fill(9, 2, 11, 3, 'p');
    B.fill(8, 14, 13, 15, '*').fill(22, 9, 23, 10, '*').fill(27, 9, 30, 10, '*').fill(18, 17, 19, 19, '*');
    B.fill(8, 23, 14, 24, '~');
    def({ id: 'mistral', name: 'Mistral City', kind: 'town', chapter: 5, rows: B.rows(), music: 'town', battle: 'city', center: { map: 'center_mistral' },
      buildings: [{ b: 'center', x: 3, y: 4, to: 'center_mistral' }, { b: 'mart', x: 11, y: 5, to: 'mart_mistral' },
        { b: 'museum', x: 21, y: 3, to: 'c5obs', needs: ['c5ezra'], locked: 'c5obsLocked' },
        { b: 'gym', x: 22, y: 16, to: 'gym5', variant: 4, needs: ['c5gym'], locked: 'c5gymLocked' },
        { b: 'house', x: 3, y: 16, to: 'c5house1', variant: 3 }, { b: 'house2', x: 9, y: 17, to: 'c5house2' }],
      signs: [{ x: 15, y: 21, text: 'MISTRAL CITY\nThe city where the mist thinks.' }, { x: 26, y: 8, text: 'MISTRAL OBSERVATORY\nClosed for many years.' },
        { x: 19, y: 23, text: 'MISTRAL GYM - Leader: EZRA\nThe seer in the mist.' }, { x: 31, y: 11, text: 'EAST: ROUTE 6\nTo the mines.' }],
      edges: { s: { to: 'route5', dx: -6 }, e: { to: 'route6', dy: 0, needs: ['ch6'] } },
      items: [{ x: 31, y: 5, item: 'great', n: 3, hidden: true }],
      npcs: [{ id: 'ezra', x: 18, y: 10, dir: 'down', look: L.c5ezra, name: 'Ezra', talk: 'c5ezraCity', show: ['!c5gym'] },
        { id: 'guide', x: 28, y: 22, dir: 'left', look: L.man, name: 'Gym Guide', talk: 'c5guide' },
        { id: 'sage', x: 27, y: 11, dir: 'down', look: L.oldman, name: 'Old Sage', talk: 'c5sage' },
        { id: 'gate', x: 33, y: 12, dir: 'left', look: L.worker, name: 'Gatekeeper', talk: 'c5gate', show: ['!ch6'] },
        { id: 'kid', x: 9, y: 11, dir: 'down', look: L.kid, wander: 2, talk: 'c5kid' },
        { id: 'lady', x: 22, y: 13, dir: 'left', look: L.woman, wander: 2, talk: 'c5lady' }] });
  }
  center('center_mistral', 'mistral', { chapter: 5 });
  mart('mart_mistral', 'mistral', ['poke', 'great', 'ultra', 'superpotion', 'fullheal', 'revive', 'repel'], { chapter: 5 });
  def({ id: 'c5house1', name: 'House', kind: 'inside', outside: 'mistral', chapter: 5, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'tv', x: 4, y: 1, talk: 'tv' }, { k: 'plant', x: 7, y: 1 }, { k: 'bed', x: 1, y: 3 }],
    npcs: [{ id: 'dreamer', x: 6, y: 3, dir: 'left', look: L.lass, name: 'Nell', talk: 'c5dreamer' }] });
  def({ id: 'c5house2', name: 'House', kind: 'inside', outside: 'mistral', chapter: 5, rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1 }, { k: 'boxes', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }],
    npcs: [{ id: 'granny', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Granny Vale', talk: 'c5granny' }] });

  // ---- the old observatory: a telescope, a caretaker, and stairs down that were not there before
  def({ id: 'c5obs', name: 'Mistral Observatory', kind: 'inside', outside: 'mistral', chapter: 5, rows: grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm').fill(5, 3, 9, 5, 'R').put(13, 1, '>').rows(),
    arrive: { x: 7, y: 8 },
    furniture: [{ k: 'machine', x: 6, y: 1, talk: 'c5telescope' }, { k: 'shelf', x: 1, y: 1 }, { k: 'shelf', x: 3, y: 1 }, { k: 'desk', x: 1, y: 6 }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }, { k: 'boxes', x: 12, y: 1 }],
    warps: [{ x: 13, y: 1, to: 'eclipselab', tx: 2, ty: 1, dir: 'down' }],
    npcs: [{ id: 'keeper', x: 10, y: 6, dir: 'left', look: L.curator, name: 'Caretaker Lio', talk: 'c5keeper' }] });

  // =====================================================================
  //  Eclipse Lab - Team Eclipse's hidden lab under the observatory. B1 is
  //  three sealed halls joined by teleport pads (the purple squares): the
  //  right pad moves you on, the wrong one sends you back. B2: Vex.
  // =====================================================================
  {
    const rows = [
      '######################',
      '#<hhhPh#hhhhPh#Phhhh>#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh########',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '#hhhhhP#PhhhhP#Phhhhh#',
      '#hhhhhh#hhhhhh#hhhhhh#',
      '######################'];
    def({ id: 'eclipselab', name: 'Eclipse Lab B1', kind: 'inside', chapter: 5, rows, music: 'forest', battle: 'city',
      warps: [{ x: 1, y: 1, to: 'c5obs', tx: 13, ty: 2, dir: 'down' }, { x: 20, y: 1, to: 'eclipselab2', tx: 2, ty: 14, dir: 'right' },
        // the pads: A (west), B (middle), C (east, the stairs down), D (a sealed room under C)
        { x: 6, y: 12, to: 'eclipselab', tx: 9, ty: 12, dir: 'right' },     // A -> B
        { x: 5, y: 1, to: 'eclipselab', tx: 16, ty: 11, dir: 'down' },      // A -> D
        { x: 8, y: 12, to: 'eclipselab', tx: 5, ty: 11, dir: 'left' },      // B -> A
        { x: 12, y: 1, to: 'eclipselab', tx: 16, ty: 2, dir: 'right' },     // B -> C
        { x: 13, y: 12, to: 'eclipselab', tx: 2, ty: 3, dir: 'down' },      // B -> the entrance (wrong pad)
        { x: 15, y: 1, to: 'eclipselab', tx: 11, ty: 2, dir: 'left' },      // C -> B
        { x: 15, y: 12, to: 'eclipselab', tx: 4, ty: 2, dir: 'left' }],     // D -> A
      furniture: [{ k: 'machine', x: 2, y: 5 }, { k: 'desk', x: 3, y: 10 }, { k: 'machine', x: 10, y: 4, talk: 'c5machine' }, { k: 'machine', x: 9, y: 9 }, { k: 'pc', x: 13, y: 7, talk: 'c5labPc' },
        { k: 'machine', x: 18, y: 4 }, { k: 'boxes', x: 20, y: 7 }, { k: 'boxes', x: 19, y: 7 }, { k: 'boxes', x: 20, y: 9 }],
      items: [{ x: 19, y: 13, item: 'shard', n: 1, hidden: true }, { x: 20, y: 11, item: 'ultra', n: 1 }, { x: 1, y: 13, item: 'superpotion', n: 1 }],
      npcs: [{ id: 'grunt1', x: 2, y: 8, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c5gr1' },
        { id: 'sci', x: 11, y: 7, dir: 'left', look: L.c5sci, name: 'Eclipse Scientist', trainer: 'c5sci1' },
        { id: 'grunt2', x: 17, y: 6, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c5gr2' }] });
  }
  {
    const rows = [
      '####################',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#########hh#########',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhh######hhhhhhh#',
      '#hhhhh######hhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhh#',
      '#<hhhhhhhhhhhhhhhhh#',
      '####################'];
    def({ id: 'eclipselab2', name: 'Eclipse Lab B2', kind: 'inside', chapter: 5, rows, music: 'forest', battle: 'city',
      warps: [{ x: 1, y: 14, to: 'eclipselab', tx: 19, ty: 2, dir: 'down' }],
      // the doorway into Vex's hall: one tile wider than nothing, so no way round
      zones: [{ x: 9, y: 6, w: 2, h: 1, event: 'c5vexLab' }],
      furniture: [{ k: 'machine', x: 2, y: 1 }, { k: 'machine', x: 16, y: 1 }, { k: 'boxes', x: 6, y: 2 }, { k: 'boxes', x: 13, y: 2 }, { k: 'boxes', x: 13, y: 3 },
        { k: 'machine', x: 6, y: 9, talk: 'c5machine' }, { k: 'machine', x: 8, y: 9 }, { k: 'pc', x: 10, y: 9, talk: 'c5labPc' }, { k: 'boxes', x: 11, y: 9 }, { k: 'desk', x: 15, y: 13 }],
      items: [{ x: 1, y: 7, item: 'revive', n: 1 }],
      npcs: [{ id: 'grunt3', x: 4, y: 12, dir: 'right', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c5gr3' },
        { id: 'grunt4', x: 13, y: 8, dir: 'left', look: L.grunt, name: 'Eclipse Grunt', trainer: 'c5gr4' },
        { id: 'vex', x: 9, y: 2, dir: 'up', look: L.vex, name: 'Director Vex', talk: 'c5vexLab', show: ['!c5vex'] },
        { id: 'grunt5', x: 11, y: 3, dir: 'up', look: L.grunt, name: 'Eclipse Grunt', talk: 'c5vexLab', show: ['!c5vex'] },
        { id: 'ezra', x: 10, y: 4, dir: 'down', look: L.c5ezra, name: 'Ezra', talk: 'c5ezraLab', show: ['c5vex'] }] });
  }

  // =====================================================================
  //  Mistral Gym - psychic pads: three halls stacked, each split in two;
  //  the right pad lifts you a hall, the wrong one sends you to the door
  // =====================================================================
  {
    const rows = [
      '#################',
      '#PPPPPPRRRPPPPPP#',
      '#PPPPPPRRRPPPPPP#',
      '#PPPPPPPPPPPPPPP#',
      '#+PPPPPPPPPPPPP+#',
      '#################',
      '#+PPPPPP#PPPPPP+#',
      '#PPPPPPP#PPPPPPP#',
      '#PPPPPPP#PPPPPPP#',
      '#################',
      '#+PPPP+P#+PPPPP+#',
      '#PPPPPPP#PPPPPPP#',
      '#PPPPPPP#PPPPPPP#',
      '#PPPPPPP#PPPPPPP#',
      '#################',
      '#+PPPPPPPPPPPPP+#',
      '#PPPPPPPPPPPPPPP#',
      '#PPPPPPPPPPPPPPP#',
      '#PPPPPPPPPPPPPPP#',
      '########m########'];
    const back = (x, y) => ({ x, y, to: 'gym5', tx: 8, ty: 17, dir: 'up' });   // a wrong pad: back by the door
    def({ id: 'gym5', name: 'Mistral Gym', kind: 'inside', gym: true, outside: 'mistral', chapter: 5, rows, battle: 'stadium', music: 'gym', arrive: { x: 8, y: 18 },
      warps: [
        { x: 1, y: 15, to: 'gym5', tx: 3, ty: 13, dir: 'up' },     // the hall by the door -> west of hall 2
        { x: 15, y: 15, to: 'gym5', tx: 13, ty: 13, dir: 'up' },   // -> east of hall 2
        back(1, 10), back(6, 10),                                  // hall 2 west: a dead end (and a trainer)
        { x: 9, y: 10, to: 'gym5', tx: 13, ty: 8, dir: 'up' },     // hall 2 east -> east of hall 3
        back(15, 10),
        { x: 15, y: 6, to: 'gym5', tx: 3, ty: 8, dir: 'up' }, // hall 3 east -> west of hall 3
        { x: 1, y: 6, to: 'gym5', tx: 4, ty: 3, dir: 'right' },    // hall 3 west -> Ezra's hall (off to the side: not in his line of sight)
        back(1, 4), back(15, 4)],                                  // and out again
      furniture: [{ k: 'statue', x: 5, y: 17, talk: 'c5statue' }, { k: 'statue', x: 11, y: 17, talk: 'c5statue' }, { k: 'plant', x: 1, y: 1 }, { k: 'plant', x: 15, y: 1 }],
      npcs: [{ id: 'kio', x: 4, y: 11, dir: 'down', look: L.c5psychic, name: 'Psychic Kio', trainer: 'c5g1' },
        { id: 'lyra', x: 11, y: 11, dir: 'down', look: L.c5medium, name: 'Medium Lyra', trainer: 'c5g2' },
        { id: 'sol', x: 4, y: 7, dir: 'right', look: L.c5psychic, name: 'Psychic Sol', trainer: 'c5g3' },
        { id: 'ezra', x: 8, y: 1, dir: 'down', look: L.c5ezra, name: 'Leader Ezra', trainer: 'c5ezra' }] });
  }

  // =====================================================================
  //  Events
  // =====================================================================
  // ---- Route 5
  on('c5hiker', {}, (J, n) => J.say(['This mist comes up from the old observatory in Mistral, folks say. Rolls down the hill every night.', 'I\'ve walked this road thirty years. Never used to be like this.'], n));
  // ---- Mistral City
  on('c5ezraCity', { sets: ['c5ezra'] }, async (J, n) => {
    if (J.flag('c5vex')) return J.say('My body waits at the gym. Come when you are ready.', n);
    if (J.flag('c5ezra')) return J.say('The hollow mind is under the observatory. The door is open now. Go carefully, {NAME}.', n);
    await J.say('...', n);
    await J.say(['You came up the misty road, past the girl who sees three turns ahead. I dreamed you would.', 'I am Ezra. I lead the gym here - when I am not listening.'], n);
    await J.say(['For a month the city has felt... wrong. Beneath us there is a mind with nothing in it. Hollow. Cold.', 'It sits under the old observatory. Machines, I think. And people who do not like their Pokémon very much.'], n);
    await J.say('(People who do not like their Pokémon... Team Eclipse!)');
    await J.say(['I cannot leave the city\'s mind untended while I meditate. But you can walk where I can only listen.', 'I have opened the observatory door. Go below, {NAME}. Find what is hollow, and I will open my gym to you.'], n);
    J.set('c5ezra'); J.refresh();
  });
  on('c5obsLocked', {}, J => J.say('The door is locked. Through the keyhole you hear a faint hum, like machines far underground.'));
  on('c5gymLocked', {}, J => J.say(J.flag('c5ezra') ? 'The door is locked. A note: "The gym opens when the mind beneath the city is quiet. - Ezra"' : 'The door is locked. A note: "Meditating in the plaza. Do not wake me unless the city is on fire. - Ezra"'));
  on('c5guide', {}, (J, n) => J.say(J.flag('badge.mind') ? 'You beat Ezra! Did he see it coming? I bet he didn\'t!' : J.flag('c5gym') ? 'Ezra is back in the gym! He uses Psychic types: Bug, Ghost and Dark moves hit hard. Watch out for Malamar - it\'s part Dark!' : 'Ezra\'s gym is shut while he meditates. He sits on the plaza in the middle of town, staring at nothing.', n));
  on('c5sage', {}, (J, n) => J.say(J.flag('c5vex') ? 'The hum under the observatory has stopped. The mist feels thinner already.' : ['The observatory has been closed since I was a boy. Its telescope looked north, toward the Skyspire.', 'Lately I hear footsteps in there at night. Funny, for a locked building.'], n));
  on('c5gate', { needs: ['!ch6'] }, (J, n) => J.say('Route 6 to the mines is closed till the mist lifts. Folks get lost out there. Earn the Mind Badge and I\'ll trust you to find your way.', n));
  on('c5kid', {}, (J, n) => J.say('If you stand on the purple squares and think really hard, you can hear the city thinking back! ...I think.', n));
  on('c5lady', {}, (J, n) => J.say(J.flag('c5vex') ? 'Did you hear? Ezra says the city\'s mind feels whole again. Whatever that means, I slept better.' : 'Ezra hasn\'t opened his gym in weeks. He just sits out on the plaza, listening.', n));
  on('c5dreamer', {}, (J, n) => J.say(J.flag('c5vex') ? 'The nightmare stopped! Last night I dreamed of a garden instead. Thank you - I don\'t know what you did, but thank you.' : 'Every night I dream of a huge stone in the sky, cracking open. Something inside it opens its eyes... Ugh. I need a holiday.', n));
  on('c5granny', { sets: ['c5gift'] }, async (J, n) => {
    if (J.flag('c5gift')) return J.say('The mist hides things, dear. It never keeps them forever.', n);
    await J.say('A traveler, in this fog? You must be brave. Here, my late husband\'s. He never threw a ball he didn\'t mean.', n);
    await J.give('ultra', 3); J.set('c5gift');
  });
  // ---- the observatory
  on('c5telescope', {}, J => J.say(J.flag('c5vex') ? 'The telescope points north. Far away, a pale tower pierces the clouds: the Skyspire.' : 'The old telescope is aimed north. Someone has scratched marks on the dial... coordinates?'));
  on('c5keeper', {}, (J, n) => J.say(J.flag('c5vex') ? 'Those people are gone, and they left the stairs behind. I\'ll have them bricked up... after I take a look myself.' : ['Ezra opened the door? Then you must be the one he dreamed about.', 'Those stairs in the corner were not there last month. I keep the place, and I never built them.'], n));
  // ---- the lab
  on('c5machine', {}, J => J.say(J.flag('c5vex') ? 'The machine is switched off. The screen reads: "RESONANCE TEST - ABORTED".' : 'A machine humming with purple light. The screen reads: "SHARD RESONANCE: 41%. TARGET: SKYSPIRE."'));
  on('c5labPc', {}, J => J.say('A log on the screen: "Day 30. The shards answer each other. The Director says they are pieces of a lock - and the Skyspire is the door."'));
  // ---- Director Vex (the first meeting): he wins nothing, and loses nothing he needs
  on('c5vexLab', { needs: ['!c5vex'], sets: ['c5vex', 'c5gym'] }, async J => {
    await J.say('Director, the crates are sealed. The last of the Mistral shards are -', 'grunt5');
    await J.emote('grunt5', '!'); await J.face('grunt5', 'down');
    await J.say('Director! An intruder!', 'grunt5');
    await J.face('vex', 'down');
    await J.say(['So. The child who returned the Coral Meteorite. Kael speaks of you with such... irritation.', 'I am Vex. Director of Team Eclipse. You have come a very long way to stand in a room that does not exist.'], 'vex');
    await J.say(['You fight beside your Pokémon. You trust them. They trust you. A pretty arrangement.', 'Let me show you what it is worth.'], 'vex');
    const r = await J.battle({ id: 'c5vex', name: 'Director Vex', look: 'vex', theme: 'city', pay: 80, team: [['porygon2', 36], ['weavile', 37], ['honchkrow', 38]],
      before: 'Show me this famous bond.', lose: '...Interesting.', win: 'As I expected.' });
    if (r !== 'win') return;
    await J.say(['...Interesting. A bond that bends the odds. The stones answer to it, the old stories say.', 'But stones can be made to answer something else.'], 'vex');
    await J.say(['Long ago, a meteor fell on Valoria and broke apart. Something slept inside it, and sleeps still - in the pieces.', 'At the Skyspire, in the frozen north, I will forge the shards into one again, and wake it.', 'Then Team Eclipse will hold a power that needs no bond. No trust. No friendship. Only command.'], 'vex');
    await J.say('A world where no trainer ever again needs their Pokémon to love them. You will thank me, someday.', 'vex');
    await J.say('Bring the crate. We are leaving.', 'vex');
    await J.fade(() => { J.set('c5vex'); J.hideNpc('vex'); J.hideNpc('grunt5'); J.refresh(); });
    await J.say('Director Vex is gone - and his grunts carried a crate of glowing shards with him.');
    await J.say(['{NAME}. You are unhurt. Good.', 'Do not worry - I am not really here. This is only my mind, walking beside you. My body is still on the plaza.'], 'ezra');
    await J.say(['So that was the hollow mind: a man who has emptied himself of every bond, and wants the world to do the same.', 'He will go north. We will need to be stronger before he gets there - all of us.'], 'ezra');
    await J.say('The city\'s mind is quiet again. My gym is open, {NAME}. Come and show me what you and your Pokémon are.', 'ezra');
    J.set('c5gym'); J.refresh();
  });
  // Ezra's projection, left behind in the lab: a lift back to the city (he is psychic, after all)
  on('c5ezraLab', {}, async (J, n) => {
    if (await J.ask('Shall I send you back to the city? My mind can carry you that far.', ['Yes, please', 'Not yet'], n) !== 0) return J.say('Then I will wait. Minds are patient.', n);
    await J.say('Close your eyes...', n);
    await J.travel('mistral', 25, 23, 'up');
  });
  // ---- Mistral Gym
  on('c5statue', {}, J => J.say(J.flag('badge.mind') ? 'MISTRAL POKéMON GYM - LEADER: EZRA\nWinning trainers: {NAME}' : 'MISTRAL POKéMON GYM - LEADER: EZRA\nThe statue\'s eyes seem to follow you.'));
  on('c5ezraWin', { sets: ['badge.mind', 'ch6'] }, async J => {
    await J.say('So that is how it ends. I am glad I could not see it - it was better to watch. The Mind Badge is yours.', 'ezra');
    J.badge('mind');
    await J.give('tm:psychic');
    await J.say(['That TM holds Psychic: the purest strength of the mind. Teach it to a Pokémon that trusts you.', 'Vex went north, toward the Skyspire. The road there runs east first - Route 6, to the mining city of Ferrum.', 'Nova leads the gym there. Steel, all the way through. Keep your bond close, {NAME}. It is the one thing Vex cannot forge.'], 'ezra');
    await J.chapter('Chapter 5 complete!', 'Next: Chapter 6 - Iron Will');
    J.set('ch6'); J.refresh();
    await J.chapter('Chapter 6', 'Iron Will');
  });

  chapter({ n: 5, title: 'Mind over Mist', start: { map: 'route5', x: 14, y: 40, dir: 'up' }, level: 34, badge: 'mind', center: 'center_mistral',
    goals: ['c5ezra', 'c5vex', 'c5gym', 'badge.mind', 'ch6'] });
})();
