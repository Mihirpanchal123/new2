'use strict';
// =====================================================================
//  JOURNEY II - Chapter 2: City of a Thousand Lamps. The canal road
//  north from the Sunward Coast leads to Brassport: brass, rails and a
//  Lumen lantern on every corner. It's Founder's Day. Cassius Vale
//  speaks in the plaza; nobody in the city can remember a bad day - or
//  their best one. At midnight a girl in grey looks up out of a canal.
//  Warden Gideon keeps the Brass Light (Steel). Side story: the Canal
//  Couriers' races (Juno's crew). See docs/journey2/world.md.
// =====================================================================
(() => {
  const { def, grid, L, center, mart, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m2courier: { hat: 'cap', hatColor: 0x2d9a8a, hatFront: 0xffffff, hair: 0x6b3d1f, hairStyle: 'short', top: 0x2d9a8a, sleeves: 'short', inner: 0xffffff, legs: 0x3a3a48, legStyle: 'shorts', shoes: 0xf07a30, bag: 0x8a5a30 },
    m2bolt: { hat: 'capback', hatColor: 0xf0d048, hatFront: 0x2a2a34, hair: 0x2a2a3a, hairStyle: 'spiky', top: 0x2a2a34, sleeves: 'short', inner: 0xf0d048, legs: 0x2a2a34, legStyle: 'shorts', shoes: 0xf0d048, bag: 0xf0d048 },
    m2vance: { hat: null, hair: 0xf0d048, hairStyle: 'spiky', top: 0x2a2a34, sleeves: 'long', inner: 0xf0d048, legs: 0x2a2a34, legStyle: 'pants', shoes: 0xf0d048, bag: 0xf0d048, scarf: 0xf0d048 },
    m2rook: { hat: 'cap', hatColor: 0x2d9a8a, hatFront: 0xf07a30, hair: 0xb8b8b8, hairStyle: 'short', top: 0x6a4a3a, sleeves: 'long', inner: 0x2d9a8a, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x8a5a30 },
    m2gondolier: { hat: 'sunhat', hatColor: 0xf4e8c8, hatBand: 0xc84848, hair: 0x2b1d14, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'short', inner: 0xc84848, legs: 0x2a2a34, legStyle: 'pants', shoes: 0x2a2a34, bag: null },
    m2smith: { hat: 'bandana', hatColor: 0x5a6a7a, hair: 0x9a5a2a, hairStyle: 'long', top: 0x6a7a8a, sleeves: 'none', inner: 0x3a3a48, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x2a2a34, bag: 0x5a3a20 },
    m2rosa: { hat: null, hair: 0x5a2a1a, hairStyle: 'long', top: 0xf4f0e8, sleeves: 'short', inner: 0xc84848, legs: 0x5a3a2a, legStyle: 'skirt', shoes: 0x3a2a1e, bag: null, skin: '#c88a5a' },
    m2orla: { hat: 'sunhat', hatColor: 0x5a3a8a, hatBand: 0xffd84a, hair: 0xe8e8e8, hairStyle: 'long', top: 0x5a3a8a, sleeves: 'long', inner: 0xffd84a, legs: 0x3a2a5a, legStyle: 'skirt', shoes: 0x2a1e34, bag: null, scarf: 0xffd84a }
  });

  // ---- items
  Object.assign(ITEMS, {
    m2lantern: { name: 'Lumen Lantern', pocket: 'key', price: 0, desc: 'A free hand lantern from the Lumen Company. It hums very softly, like something breathing. Your partner won\'t go near it.' },
    m2parcel: { name: 'Courier Parcel', pocket: 'key', price: 0, desc: 'A Canal Couriers parcel, sealed with green wax. Deliver it - FAST - then run back to Rook at the depot.' }
  });
  ITEMS['tm:flash-cannon'] = ITEMS['tm:flash-cannon'] || { name: 'TM Flash Cannon', pocket: 'tms', price: 0, tm: 'flash-cannon', desc: 'Teaches Flash Cannon: a blast of light from polished steel. May lower Sp. Def.' };
  ITEMS['tm:volt-switch'] = ITEMS['tm:volt-switch'] || { name: 'TM Volt Switch', pocket: 'tms', price: 0, tm: 'volt-switch', desc: 'Teaches Volt Switch: a jolt, then a quick dash back to swap places. A courier\'s favourite.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m2juno: 'Juno is in Brassport on a delivery for the Lumen Company. She runs with a courier crew there now: the Canal Couriers.',
    m2arrive: 'Brassport greeted me with a free Lumen lantern. It hums. My partner hates it.',
    speech: 'Cassius Vale, founder of the Lumen Company, on Founder\'s Day: "Nobody should ever have to lose what they love." Everyone cheered. Warden Gideon didn\'t clap.',
    'm2c.worst': 'Mr. Albrecht still makes tea for his wife. She died last spring. He can\'t remember the day at all - his worst day is simply gone.',
    'm2c.best': 'Rosa at the Copper Kettle has her wedding photo on the wall, and no memory of her wedding. Her best day is gone too.',
    'm2c.hum': 'Lumen lanterns hum louder at night. The crystal inside the showroom lantern looks just like the Tidemark lighthouse crystal.',
    nellglimpse: 'Midnight, the Lantern Steps: a girl in grey looked up at me out of the canal, with a Litwick at her shoulder. Juno saw her too.',
    juno2: 'Juno: "If we\'re going up against whatever is in those lanterns, we\'d better both be strong." Teo has been sleeping a lot lately.',
    'badge.gear': 'Warden Gideon lost a day twenty years ago: the night the Lantern Express vanished on the old line. They say it still runs at midnight.'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    // Canal Road
    m2tomas: { team: [['psyduck', 11], ['wooper', 11], ['horsea', 12]], pay: 18, theme: 'beach', before: 'Shh! You\'ll scare the fish. ...Oh, there are no fish. Battle, then!', lose: 'Hooked, landed and released. That\'s me.', after: 'Forty years I\'ve fished this cut. Lately I hook more Lumen lanterns than fish. People throw them in. Odd.' },
    m2bea: { team: [['flabebe', 12], ['buneary', 12]], pay: 18, theme: 'forest', before: 'I\'m picking flowers for my sweetheart in Brassport! You can have the thorns.', lose: 'Petals everywhere...', after: 'I bring her flowers every week. She always says it\'s the first time. Isn\'t that sweet? ...Isn\'t it?' },
    m2dunstan: { team: [['geodude', 12], ['nacli', 12], ['rockruff', 13]], pay: 20, theme: 'forest', before: 'This road\'s paved with stone from my quarry! Feel its strength!', lose: 'Cracked like gravel.', after: 'Steel types in Brassport shrug off my rocks. Fighting, Fire or Ground moves are what you want for Gideon.' },
    m2lkroad: { team: [['magnemite', 12], ['zubat', 13]], pay: 28, theme: 'forest', look: 'keeper', name: 'Lightkeeper', before: 'Lantern inspection! Every lamp on Canal Road must shine. Oh - and you must battle. Sorry. It\'s policy.', lose: 'My sincerest apologies for losing.', after: 'If your Lumen lantern ever stops humming, bring it to the showroom. We\'ll give you a new one. Free! We insist.' },
    // Brassport
    m2lks1: { team: [['litwick', 13], ['houndour', 14]], pay: 28, theme: 'city', look: 'keeperf', name: 'Lightkeeper', before: 'Excuse me! You\'re walking on the canal side, which is lovely, but I\'m obliged to battle you. So sorry.', lose: 'Oh dear. Oh dear oh dear.', after: 'Brassport has had no crime in eleven years. Isn\'t that wonderful? Nobody can remember any.' },
    m2lks2: { team: [['zubat', 14], ['croagunk', 14]], pay: 28, theme: 'city', look: 'keeper', name: 'Lightkeeper', before: 'Founder\'s Day patrol! Please enjoy the festivities. And this battle. Please.', lose: 'Thank you for your patience.', after: 'The Sky Tower is Company property. Even I\'ve only seen the lobby.' },
    m2bolt1: { team: [['shinx', 13], ['pichu', 14]], pay: 22, theme: 'city', look: 'm2bolt', name: 'Bolt Courier', before: 'Brass Bolts courier! I\'m on the clock, so this\'ll be QUICK!', lose: 'Late. I\'m late! Vance is gonna dock my pay!', after: 'The Canal Couriers think they\'re fast. Vance laps them on his lunch break.' },
    m2bolt2: { team: [['starly', 14], ['electrike', 14]], pay: 22, theme: 'city', look: 'm2bolt', name: 'Bolt Courier', before: 'Out of my lane! Bolts have right of way!', lose: 'Wrong way... totally wrong way.', after: 'Rumour says Juno Reyes beat Vance once. He says it never happened. Nobody can remember, so...' },
    // the Brass Light: Warden Gideon's gym
    m2g1: { team: [['aron', 15], ['magnemite', 16]], pay: 26, theme: 'stadium', look: 'worker', name: 'Mechanic Otto', before: 'Welcome to the Brass Light! Mind the gears - and my Pokémon!', lose: 'Stripped my threads!', after: 'Steel is tough on the outside. Fire melts it, Fighting dents it, and Ground shakes it loose.' },
    m2g2: { team: [['tinkatink', 16], ['mawile', 16]], pay: 26, theme: 'stadium', look: 'm2smith', name: 'Smith Petra', before: 'Hammer and tongs! Let\'s see what you\'re made of!', lose: 'You\'ve got a good temper. That\'s a smith\'s compliment.', after: 'Gideon forged the gears of this lighthouse himself. They haven\'t missed a tick in twenty years.' },
    m2g3: { team: [['pawniard', 16], ['magnemite', 16], ['aron', 17]], pay: 26, theme: 'stadium', look: 'worker', name: 'Engineer Hal', before: 'Last cog before the lamp room. I don\'t turn easy!', lose: 'Ground to a halt.', after: 'Gideon\'s Skarmory is quick and Lairon is a wall. Bring your best.' },
    m2gideon: { team: [['magnemite', 17], ['skarmory', 17], ['honedge', 18], ['lairon', 19]], pay: 110, theme: 'stadium', gym: 2, onWin: 'm2gideonWin', look: 'gideon', name: 'Warden Gideon', before: 'Steel doesn\'t forget the hammer that shaped it. Let\'s find out what shaped you.', lose: 'Hm. Tempered well. Very well.' }
  });

  // =====================================================================
  //  Canal Road - north from the Sunward Path, along the Sunward Cut canal
  //  to Brassport's West Gate. A lock-keeper's cottage halfway.
  // =====================================================================
  {
    const B = grid(40, 22, '.').border('T', { s: [9, 11], e: [9, 11] }, 1);
    B.fill(1, 1, 38, 1, 'T').fill(1, 2, 38, 3, '~').fill(1, 4, 38, 4, ',');       // the Sunward Cut and its towpath
    B.fill(25, 2, 26, 19, '~').fill(25, 4, 26, 4, 'b');                            // a side canal, south, under two bridges
    B.fill(9, 9, 38, 11, ',').fill(9, 12, 11, 21, ',').fill(25, 9, 26, 11, 'b');   // the road: up from the coast, then east
    B.fill(1, 20, 38, 20, 'T').fill(9, 20, 11, 20, ',');                          // a line of trees at the south end
    B.fill(2, 13, 7, 18, ';').fill(13, 13, 23, 18, ';').fill(28, 13, 37, 18, ';').fill(30, 5, 35, 7, ';');
    B.fill(2, 6, 5, 7, '*').fill(20, 6, 23, 7, '*').put(8, 5, 'T').put(9, 6, 'T').put(22, 5, 'T').put(37, 6, 'r').put(36, 5, 'r');
    B.fill(1, 12, 8, 12, 'T').put(12, 16, 'r').put(24, 14, 'r').put(27, 19, 'T').put(38, 19, 'T').fill(16, 15, 17, 16, 'T');
    def({ id: 'canalroad', name: 'Canal Road', kind: 'route', rows: B.rows(), music: 'route', battle: 'forest',
      encounters: { tall: { rate: 0.12, min: 10, max: 13, table: [['pidgey', 16], ['starly', 16], ['psyduck', 12], ['wooper', 12], ['shinx', 10], ['buneary', 10], ['magnemite', 8], ['flabebe', 8], ['espurr', 5], ['tynamo', 3]] } },
      edges: { s: { to: 'sunpath', dx: 0 }, e: { to: 'brassport_s', dy: 0 } },
      buildings: [{ b: 'house', x: 14, y: 5, to: 'm2lockhouse', variant: 3 }],
      signs: [{ x: 12, y: 19, text: 'CANAL ROAD\nSunward Path - Brassport' }, { x: 36, y: 8, text: 'EAST: BRASSPORT\nCity of a Thousand Lamps.' },
        { x: 13, y: 7, text: 'LOCK No. 3\nKeeper: ODILE. Knock loudly - the water is noisy.' }],
      props: [{ k: 'lumenlamp', x: 12, y: 8 }, { k: 'lumenlamp', x: 19, y: 8 }, { k: 'lumenlamp', x: 24, y: 8 }, { k: 'lumenlamp', x: 27, y: 8 }, { k: 'lumenlamp', x: 33, y: 8 },
        { k: 'lumenlamp', x: 12, y: 12 }, { k: 'lumenlamp', x: 24, y: 12 }, { k: 'lumenlamp', x: 8, y: 16 }, { k: 'mailbox', x: 13, y: 8 }],
      zones: [{ x: 9, y: 20, w: 3, h: 1, event: 'm2junoRoad' }],
      items: [{ x: 2, y: 5, item: 'great', n: 1 }, { x: 3, y: 19, item: 'potion', n: 2 }, { x: 37, y: 19, item: 'repel', n: 1 }, { x: 34, y: 5, item: 'awakening', n: 1 },
        { x: 23, y: 19, item: 'superpotion', n: 1, hidden: true }, { x: 12, y: 13, item: 'oran', n: 2, hidden: true }, { x: 38, y: 13, item: 'parlyzheal', n: 1, hidden: true }, { x: 1, y: 7, item: 'poke', n: 3, hidden: true }],
      npcs: [{ id: 'juno', x: 10, y: 17, dir: 'down', look: L.juno, name: 'Juno', talk: 'm2junoRoad', show: ['!m2juno'] },
        { id: 'tomas', x: 6, y: 4, dir: 'right', look: L.fisher, name: 'Fisherman Tomas', trainer: 'm2tomas' },
        { id: 'bea', x: 20, y: 14, dir: 'left', look: L.picnicker, name: 'Picnicker Bea', trainer: 'm2bea' },
        { id: 'dunstan', x: 33, y: 12, dir: 'down', look: L.hiker, name: 'Hiker Dunstan', trainer: 'm2dunstan' },
        { id: 'lk', x: 29, y: 8, dir: 'down', look: L.keeper, name: 'Lightkeeper', trainer: 'm2lkroad' },
        { id: 'boater', x: 31, y: 4, dir: 'up', look: L.m2gondolier, name: 'Canal Boater', talk: 'm2boater' },
        { id: 'walker', x: 4, y: 10, dir: 'right', look: L.oldman, name: 'Old Walker', wander: 2, talk: 'm2walker' }] });
  }
  def({ id: 'm2lockhouse', name: 'Lock-keeper\'s Cottage', kind: 'inside', outside: 'canalroad', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm2lockwheel' }, { k: 'stove', x: 4, y: 1 }, { k: 'shelf', x: 6, y: 1 }, { k: 'bed', x: 7, y: 3 }, { k: 'plant', x: 1, y: 5 }],
    npcs: [{ id: 'odile', x: 2, y: 3, dir: 'right', look: L.oldlady, name: 'Lockkeeper Odile', talk: 'm2odile' }] });

  // =====================================================================
  //  Brassport, South Quarter - the West Gate, the Old Canal, the courier
  //  depot, and the harbour with the Brass Light on its little island
  // =====================================================================
  {
    const B = grid(40, 30, 'u').border('T', { w: [9, 11], n: [18, 21], s: [30, 32] }, 1);
    B.fill(1, 1, 16, 1, 'T').fill(23, 1, 38, 1, 'T');
    B.fill(1, 8, 3, 8, 'T').fill(1, 12, 3, 12, 'T');                                       // the West Gate
    B.fill(1, 14, 38, 15, '~').fill(18, 14, 21, 15, 'b').fill(30, 14, 32, 15, 'b');       // the Old Canal and its bridges
    B.fill(1, 16, 16, 28, '~').fill(3, 17, 11, 26, 'u').fill(12, 24, 16, 25, 'b');        // the harbour, the Light's island, its bridge
    B.fill(13, 19, 16, 19, 'b');                                                           // the Lantern Steps, a pier into the harbour
    B.fill(22, 25, 23, 26, '~');                                                           // the fountain in Harbour Square
    B.fill(5, 10, 7, 11, '*').fill(24, 10, 28, 11, '*').fill(34, 10, 37, 11, '*').fill(34, 23, 37, 25, '*').fill(25, 22, 28, 23, '*');
    B.put(3, 17, 'T').put(11, 17, 'T').put(17, 28, 'T').put(29, 28, 'T').put(38, 16, 'T').put(33, 16, 'T');
    def({ id: 'brassport_s', name: 'Brassport', kind: 'town', rows: B.rows(), music: 'town', battle: 'city', fly: { x: 20, y: 12 }, center: { map: 'm2center' },
      buildings: [{ b: 'house3', x: 2, y: 2, to: 'm2cafe', variant: 1 }, { b: 'center', x: 9, y: 2, to: 'm2center' }, { b: 'mart', x: 24, y: 2, to: 'm2mart' },
        { b: 'lab', x: 31, y: 2, to: 'm2depot' }, { b: 'house', x: 24, y: 17, to: 'm2albrecht', variant: 4 }, { b: 'house2', x: 34, y: 17, to: 'm2pemberton' },
        { b: 'lighthouse', x: 5, y: 18, to: 'brasslight1', variant: 1, needs: ['nellglimpse'], locked: 'm2gymLocked' }],
      signs: [{ x: 16, y: 8, text: 'BRASSPORT - SOUTH QUARTER\nNorth over the canal: the Grand Plaza.' }, { x: 7, y: 5, text: 'THE COPPER KETTLE\nCafé. Cakes. Canal views.' },
        { x: 30, y: 6, text: 'CANAL COURIERS DEPOT\n"Faster than the post. Friendlier than the Bolts."' }, { x: 11, y: 23, text: 'THE BRASS LIGHT\nWarden: GIDEON\nThe second of the Eight Lights of Meridia.' },
        { x: 17, y: 20, text: 'THE LANTERN STEPS\nOn a still night, the whole city shines in the water.' }, { x: 33, y: 27, text: 'SOUTH: SUNKEN ROAD\nTo Saltmere.' }],
      props: [{ k: 'lumenlamp', x: 17, y: 3 }, { k: 'lumenlamp', x: 22, y: 3 }, { k: 'lumenlamp', x: 17, y: 8 }, { k: 'lumenlamp', x: 22, y: 8 }, { k: 'lumenlamp', x: 8, y: 13 },
        { k: 'lumenlamp', x: 14, y: 13 }, { k: 'lumenlamp', x: 26, y: 13 }, { k: 'lumenlamp', x: 35, y: 13 }, { k: 'lumenlamp', x: 17, y: 17 }, { k: 'lumenlamp', x: 22, y: 17 },
        { k: 'lumenlamp', x: 29, y: 21 }, { k: 'lumenlamp', x: 33, y: 21 }, { k: 'lumenlamp', x: 4, y: 19 }, { k: 'lumenlamp', x: 10, y: 19 }, { k: 'lumenlamp', x: 21, y: 24 },
        { k: 'lumenlamp', x: 24, y: 24 }, { k: 'mailbox', x: 8, y: 6 }, { k: 'mailbox', x: 29, y: 6 }],
      edges: { w: { to: 'canalroad', dy: 0 }, n: { to: 'brassport_n', dx: 0 }, s: { to: 'sunkenroad', dx: -24, needs: ['ch6'] } },
      zones: [{ x: 2, y: 9, w: 1, h: 3, event: 'm2arrive' }, { x: 14, y: 24, w: 1, h: 2, event: 'm2junoBridge' }],
      items: [{ x: 38, y: 21, item: 'repel', n: 2 }, { x: 37, y: 28, item: 'great', n: 1 },
        { x: 38, y: 13, item: 'superpotion', n: 1, hidden: true }, { x: 3, y: 26, item: 'great', n: 1, hidden: true }, { x: 1, y: 13, item: 'fullheal', n: 1, hidden: true }],
      npcs: [{ id: 'greeter', x: 4, y: 8, dir: 'down', look: L.keeperf, name: 'Lightkeeper Greeter', talk: 'm2greeter' },
        { id: 'gondo', x: 10, y: 13, dir: 'down', look: L.m2gondolier, name: 'Gondolier Luca', talk: 'm2gondolier' },
        { id: 'kid', x: 15, y: 10, dir: 'down', look: L.kid, wander: 2, talk: 'm2sKid' },
        { id: 'lks', x: 28, y: 12, dir: 'left', look: L.keeperf, name: 'Lightkeeper', trainer: 'm2lks1' },
        { id: 'runner', x: 36, y: 8, dir: 'down', look: L.m2courier, name: 'Courier Mags', talk: 'm2runner' },
        { id: 'guide', x: 18, y: 23, dir: 'left', look: L.man, name: 'Gym Guide', talk: 'm2gymGuide' },
        { id: 'juno', x: 10, y: 25, dir: 'right', look: L.juno, name: 'Juno', talk: 'm2junoBridge', show: ['nellglimpse', '!juno2'] },
        { id: 'fisher', x: 13, y: 19, dir: 'down', look: L.fisher, name: 'Night Fisher Ansel', talk: 'm2ansel' },
        { id: 'bolt', x: 27, y: 24, dir: 'down', look: L.m2bolt, name: 'Bolt Courier', trainer: 'm2bolt1' },
        { id: 'crew', x: 31, y: 27, dir: 'up', look: L.worker, name: 'Road Crew', talk: 'm2sunken', show: ['!ch6'] },
        { id: 'salt', x: 19, y: 27, dir: 'up', look: L.sailor, name: 'Old Salt', talk: 'm2salt' },
        { id: 'tourist', x: 35, y: 26, dir: 'left', look: L.woman, wander: 2, talk: 'm2tourist' }] });
    // midnight on the Lantern Steps (Juno's stakeout): the South Quarter goes dark while the flag m2night is up
    Object.defineProperty(M.brassport_s, 'dark', { get() { try { return Journey._G().flags.m2night ? 0.42 : 0; } catch (e) { return 0; } }, configurable: true });
  }
  center('m2center', 'brassport_s');
  mart('m2mart', 'brassport_s', ['poke', 'great', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'iceheal', 'fullheal', 'repel']);
  M.m2mart.name = 'Brassport Mart';
  M.m2mart.npcs.push({ id: 'shopper', x: 8, y: 5, dir: 'up', look: L.oldlady, name: 'Shopper', talk: 'm2shopper' });
  def({ id: 'm2cafe', name: 'The Copper Kettle', kind: 'inside', outside: 'brassport_s', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 3, 6, 4, 'R').rows(),
    arrive: { x: 5, y: 6 },
    furniture: [{ k: 'counter', x: 1, y: 2 }, { k: 'stove', x: 3, y: 1 }, { k: 'fridge', x: 4, y: 1 }, { k: 'shelf', x: 7, y: 1, talk: 'm2photo' }, { k: 'table', x: 7, y: 3 },
      { k: 'chair', x: 9, y: 3 }, { k: 'table', x: 1, y: 5 }, { k: 'chair', x: 3, y: 5 }, { k: 'plant', x: 9, y: 6 }, { k: 'plant', x: 9, y: 1 }],
    npcs: [{ id: 'rosa', x: 2, y: 1, dir: 'down', look: L.m2rosa, name: 'Rosa', talk: 'm2rosa', counter: true },
      { id: 'juno', x: 8, y: 4, dir: 'left', look: L.juno, name: 'Juno', talk: 'm2junoCafe', show: ['speech', '!nellglimpse'] },
      { id: 'teodor', x: 7, y: 5, dir: 'up', look: L.man, name: 'Teodor', talk: 'm2teodor' },
      { id: 'regular', x: 2, y: 6, dir: 'up', look: L.oldman, name: 'Regular', talk: 'm2regular' }] });
  def({ id: 'm2depot', name: 'Canal Couriers Depot', kind: 'inside', outside: 'brassport_s', rows: grid(13, 9, '_').border('#').fill(1, 8, 11, 8, '_').put(6, 8, 'm').fill(5, 4, 7, 6, 'R').rows(),
    arrive: { x: 6, y: 7 },
    furniture: [{ k: 'desk', x: 5, y: 1, talk: 'm2board' }, { k: 'boxes', x: 1, y: 1 }, { k: 'boxes', x: 2, y: 1 }, { k: 'boxes', x: 1, y: 2 }, { k: 'boxes', x: 11, y: 1 },
      { k: 'boxes', x: 10, y: 1 }, { k: 'boxes', x: 11, y: 2 }, { k: 'shelf', x: 8, y: 1 }, { k: 'sofa', x: 1, y: 6 }, { k: 'plant', x: 11, y: 7 }],
    npcs: [{ id: 'rook', x: 6, y: 2, dir: 'down', look: L.m2rook, name: 'Rook', talk: 'm2rook' },
      { id: 'vance', x: 10, y: 5, dir: 'left', look: L.m2vance, name: 'Vance', talk: 'm2vance' },
      { id: 'mags', x: 3, y: 4, dir: 'right', look: L.m2courier, name: 'Courier Fen', talk: 'm2fen' }] });
  def({ id: 'm2albrecht', name: 'The Albrechts\' house', kind: 'inside', outside: 'brassport_s', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm2cards' }, { k: 'stove', x: 4, y: 1 }, { k: 'plant', x: 7, y: 1 }, { k: 'table', x: 3, y: 3, talk: 'm2teacups' }, { k: 'chair', x: 2, y: 3 }, { k: 'chair', x: 5, y: 3 }],
    npcs: [{ id: 'albrecht', x: 6, y: 3, dir: 'left', look: L.oldman, name: 'Mr. Albrecht', talk: 'm2albrecht' }] });
  def({ id: 'm2pemberton', name: 'The Pembertons\' house', kind: 'inside', outside: 'brassport_s', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'tv', x: 1, y: 1, talk: 'tv' }, { k: 'shelf', x: 3, y: 1 }, { k: 'bed', x: 7, y: 1 }, { k: 'sofa', x: 1, y: 4 }],
    npcs: [{ id: 'twinA', x: 3, y: 3, dir: 'right', look: L.youngster, name: 'Pip Pemberton', talk: 'm2twinA' },
      { id: 'twinB', x: 5, y: 3, dir: 'left', look: L.lass, name: 'Poppy Pemberton', talk: 'm2twinB' },
      { id: 'mum', x: 6, y: 5, dir: 'up', look: L.woman, name: 'Mrs. Pemberton', talk: 'm2pembMum' }] });

  // ---- the Brass Light: Warden Gideon's lighthouse gym. A gear-house of fences; the lamp room on top.
  {
    const rows = ['###############', '#hhhhhh<hhhhhh#', '#hhhhhhhhhhhhh#', '#fffffffffhhhh#', '#hhhhhhhhhhhhh#', '#hhhhhhhhhhhhh#', '#hhhhfffffffff#',
      '#hhhhhhhhhhhhh#', '#hhhhhhhhhhhhh#', '#fffffffffhhhh#', '#hhhhhhhhhhhhh#', '#hhhhhhhhhhhhh#', '#######m#######'];
    def({ id: 'brasslight1', name: 'The Brass Light', kind: 'inside', gym: true, outside: 'brassport_s', rows, battle: 'stadium', music: 'gym', arrive: { x: 7, y: 11 },
      furniture: [{ k: 'statue', x: 5, y: 11, talk: 'm2gymStatue' }, { k: 'statue', x: 9, y: 11, talk: 'm2gymStatue' }, { k: 'machine', x: 1, y: 1, talk: 'm2gears' }, { k: 'machine', x: 12, y: 1, talk: 'm2gears' },
        { k: 'machine', x: 1, y: 7, talk: 'm2gears' }, { k: 'boxes', x: 13, y: 4 }],
      warps: [{ x: 7, y: 1, to: 'brasslight2', tx: 5, ty: 6, dir: 'up' }],
      npcs: [{ id: 'otto', x: 13, y: 8, dir: 'left', look: L.worker, name: 'Mechanic Otto', trainer: 'm2g1' },
        { id: 'petra', x: 1, y: 5, dir: 'right', look: L.m2smith, name: 'Smith Petra', trainer: 'm2g2' },
        { id: 'hal', x: 13, y: 2, dir: 'left', look: L.worker, name: 'Engineer Hal', trainer: 'm2g3' }] });
    def({ id: 'brasslight2', name: 'The Brass Light - Lamp Room', kind: 'inside', gym: true, battle: 'stadium', music: 'gym',
      rows: grid(11, 9, 'h').border('#').put(5, 7, '>').fill(3, 3, 7, 4, 'R').rows(),
      furniture: [{ k: 'machine', x: 4, y: 1, talk: 'm2lamp' }, { k: 'machine', x: 1, y: 5, talk: 'm2gears' }, { k: 'machine', x: 8, y: 5, talk: 'm2gears' }],
      warps: [{ x: 5, y: 7, to: 'brasslight1', tx: 7, ty: 2, dir: 'down' }],
      npcs: [{ id: 'gideon', x: 5, y: 2, dir: 'down', look: L.gideon, name: 'Warden Gideon', trainer: 'm2gideon' }] });
  }

  // =====================================================================
  //  Brassport, North Quarter - the Grand Bridge, the Grand Plaza under the
  //  Lumen Sky Tower, the showroom, the inn; the railyard east, the snow
  //  road north (both closed for now)
  // =====================================================================
  {
    const B = grid(40, 30, 'u').border('T', { s: [18, 21], e: [12, 14], n: [18, 20] }, 1);
    B.fill(1, 1, 11, 1, 'T').fill(28, 1, 38, 1, 'T');
    B.fill(1, 26, 38, 27, '~').fill(18, 26, 21, 27, 'b');                                  // the Grand Canal and the Grand Bridge
    B.fill(19, 19, 20, 20, '~');                                                            // the Founder's Fountain
    B.fill(13, 15, 14, 16, '*').fill(25, 15, 26, 16, '*').fill(13, 21, 14, 22, '*').fill(25, 21, 26, 22, '*');
    B.fill(1, 9, 2, 16, 'T').fill(37, 16, 38, 23, 'T').fill(8, 23, 11, 24, '*').fill(28, 23, 31, 24, '*').put(1, 24, 'T').put(1, 25, 'T');
    def({ id: 'brassport_n', name: 'Brassport', kind: 'town', rows: B.rows(), music: 'town', battle: 'city', center: { map: 'm2center' },
      buildings: [{ b: 'museum', x: 3, y: 3, to: 'm2showroom' }, { b: 'tower', x: 16, y: 2, to: 'sky1', needs: ['ch5'], locked: 'm2towerLocked' },
        { b: 'house2', x: 28, y: 3, to: 'm2clocks' }, { b: 'house3', x: 34, y: 3, to: 'm2inn', variant: 2 },
        { b: 'house', x: 3, y: 19, to: 'm2marsh', variant: 5 }, { b: 'house3', x: 31, y: 19, to: 'm2orla', variant: 6 }],
      signs: [{ x: 17, y: 24, text: 'THE GRAND PLAZA\nGifted to the people of Brassport by Cassius Vale.' }, { x: 15, y: 9, text: 'LUMEN SKY TOWER\nHeadquarters of the Lumen Company.\n"A light for every home."' },
        { x: 11, y: 7, text: 'LUMEN SHOWROOM\nSee the future. Take one home. Free!' }, { x: 27, y: 6, text: 'FENNA\'S CLOCKS\nRepairs while you wait. Or while you forget.' },
        { x: 38, y: 7, text: 'THE LAMPLIT INN\nSoft beds, hot soup.' }, { x: 36, y: 11, text: 'EAST: BRASSPORT RAILYARD\nThe Old Rail Line.' }, { x: 22, y: 1, text: 'NORTH: COLDFIELDS\nThe snow road to Highwatch.' }],
      props: [{ k: 'lumenlamp', x: 12, y: 11 }, { k: 'lumenlamp', x: 27, y: 11 }, { k: 'lumenlamp', x: 12, y: 24 }, { k: 'lumenlamp', x: 27, y: 24 }, { k: 'lumenlamp', x: 16, y: 14 },
        { k: 'lumenlamp', x: 23, y: 14 }, { k: 'lumenlamp', x: 16, y: 22 }, { k: 'lumenlamp', x: 23, y: 22 }, { k: 'lumenlamp', x: 30, y: 11 }, { k: 'lumenlamp', x: 34, y: 11 },
        { k: 'lumenlamp', x: 30, y: 15 }, { k: 'lumenlamp', x: 34, y: 15 }, { k: 'lumenlamp', x: 5, y: 11 }, { k: 'lumenlamp', x: 9, y: 11 }, { k: 'lumenlamp', x: 13, y: 2 },
        { k: 'lumenlamp', x: 26, y: 2 }, { k: 'lumenlamp', x: 5, y: 25 }, { k: 'lumenlamp', x: 34, y: 25 }, { k: 'mailbox', x: 8, y: 22 }, { k: 'mailbox', x: 30, y: 22 }],
      edges: { s: { to: 'brassport_s', dx: 0 }, e: { to: 'railyard', dy: 0, needs: ['ch3'] }, n: { to: 'coldfields', dx: 0, needs: ['ch8'] } },
      // the Grand Bridge is the only way into the North Quarter from the south: Founder's Day starts as you cross it
      zones: [{ x: 18, y: 26, w: 4, h: 1, event: 'm2speech' }],
      items: [{ x: 38, y: 28, item: 'great', n: 1 }, { x: 36, y: 24, item: 'potion', n: 2 },
        { x: 2, y: 28, item: 'rarecandy', n: 1, hidden: true }, { x: 12, y: 1, item: 'superpotion', n: 1, hidden: true }, { x: 3, y: 17, item: 'burnheal', n: 2, hidden: true }],
      npcs: [{ id: 'cassius', x: 19, y: 12, dir: 'down', look: L.cassius, name: 'Cassius Vale', talk: 'm2cassiusStage', show: ['!speech'] },
        { id: 'gideon', x: 21, y: 12, dir: 'down', look: L.gideon, name: 'Warden Gideon', talk: 'm2gideonStage', show: ['!speech'] },
        { id: 'lkA', x: 17, y: 12, dir: 'down', look: L.keeper, name: 'Lightkeeper', talk: 'm2keeperStage', show: ['!speech'] },
        { id: 'lkB', x: 23, y: 12, dir: 'down', look: L.keeperf, name: 'Lightkeeper', talk: 'm2keeperStage', show: ['!speech'] },
        { id: 'gideon2', x: 21, y: 12, dir: 'down', look: L.gideon, name: 'Warden Gideon', talk: 'm2gideonPlaza', show: ['speech', '!nellglimpse'] },
        { id: 'fan1', x: 18, y: 16, dir: 'up', look: L.woman, name: 'Townsperson', talk: 'm2crowd1' },
        { id: 'fan2', x: 21, y: 16, dir: 'up', look: L.man, name: 'Townsperson', talk: 'm2crowd2' },
        { id: 'fan3', x: 16, y: 18, dir: 'up', look: L.lass, name: 'Townsperson', talk: 'm2crowd3' },
        { id: 'fan4', x: 23, y: 18, dir: 'up', look: L.oldlady, name: 'Townsperson', talk: 'm2crowd4' },
        { id: 'lks', x: 30, y: 17, dir: 'left', look: L.keeper, name: 'Lightkeeper', trainer: 'm2lks2' },
        { id: 'bolt', x: 9, y: 13, dir: 'right', look: L.m2bolt, name: 'Bolt Courier', trainer: 'm2bolt2' },
        { id: 'railguard', x: 37, y: 13, dir: 'left', look: L.worker, name: 'Rail Worker', talk: 'm2railGuard', show: ['!ch3'] },
        { id: 'northguard', x: 19, y: 1, dir: 'down', look: L.hiker, name: 'Snow Ranger', talk: 'm2northGuard', show: ['!ch8'] },
        { id: 'poet', x: 33, y: 24, dir: 'left', look: L.aroma, name: 'Canal Poet', talk: 'm2poet' },
        { id: 'nkid', x: 7, y: 15, dir: 'down', look: L.kid, wander: 2, name: 'Kid', talk: 'm2nKid' }] });
  }
  def({ id: 'm2showroom', name: 'Lumen Showroom', kind: 'inside', outside: 'brassport_n', rows: grid(15, 10, '+').border('#').fill(1, 9, 13, 9, '+').put(7, 9, 'm').fill(5, 5, 9, 7, 'R').rows(),
    arrive: { x: 7, y: 8 },
    furniture: [{ k: 'machine', x: 2, y: 1, talk: 'm2display' }, { k: 'machine', x: 5, y: 1, talk: 'm2display' }, { k: 'machine', x: 8, y: 1, talk: 'm2display' }, { k: 'machine', x: 11, y: 1, talk: 'm2display' },
      { k: 'statue', x: 3, y: 4, talk: 'm2bust' }, { k: 'plant', x: 1, y: 8 }, { k: 'plant', x: 13, y: 8 }, { k: 'sofa', x: 1, y: 5 }, { k: 'sofa', x: 12, y: 5 }],
    npcs: [{ id: 'sable', x: 7, y: 3, dir: 'down', look: L.agent, name: 'Mr. Sable', talk: 'm2sable' },
      { id: 'lk', x: 13, y: 3, dir: 'left', look: L.keeper, name: 'Lightkeeper', talk: 'm2showKeeper' },
      { id: 'visitor', x: 3, y: 7, dir: 'up', look: L.woman, name: 'Visitor', talk: 'm2visitor' }] });
  def({ id: 'm2inn', name: 'The Lamplit Inn', kind: 'inside', outside: 'brassport_n', rows: grid(11, 8, '_').border('#').fill(1, 7, 9, 7, '_').put(5, 7, 'm').fill(4, 4, 6, 5, 'R').rows(),
    arrive: { x: 5, y: 6 },
    furniture: [{ k: 'counter', x: 1, y: 2 }, { k: 'bed', x: 8, y: 1 }, { k: 'bed', x: 9, y: 1 }, { k: 'shelf', x: 5, y: 1 }, { k: 'table', x: 7, y: 5 }, { k: 'plant', x: 1, y: 6 }],
    npcs: [{ id: 'hilde', x: 2, y: 1, dir: 'down', look: L.oldlady, name: 'Innkeeper Hilde', talk: 'm2hilde', counter: true },
      { id: 'traveler', x: 8, y: 4, dir: 'down', look: L.hiker, name: 'Traveler', talk: 'm2traveler' }] });
  def({ id: 'm2clocks', name: 'Fenna\'s Clocks', kind: 'inside', outside: 'brassport_n', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'machine', x: 1, y: 1, talk: 'm2clock' }, { k: 'machine', x: 4, y: 1, talk: 'm2clock' }, { k: 'shelf', x: 6, y: 1, talk: 'm2clock' }, { k: 'desk', x: 1, y: 4 }],
    npcs: [{ id: 'fenna', x: 6, y: 3, dir: 'left', look: L.oldlady, name: 'Clockmaker Fenna', talk: 'm2fenna' }] });
  def({ id: 'm2marsh', name: 'The Marsh house', kind: 'inside', outside: 'brassport_n', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(3, 3, 5, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm2oilcans' }, { k: 'bed', x: 7, y: 1 }, { k: 'table', x: 3, y: 3 }, { k: 'chair', x: 2, y: 3 }, { k: 'plant', x: 7, y: 5 }],
    // (Chapter 3 adds a second Wendell here, once you carry his mother's letter: mch3.js)
    npcs: [{ id: 'wendell', x: 6, y: 3, dir: 'left', look: L.man, name: 'Wendell Marsh', talk: 'm2wendell', show: ['!m3letter1'] }] });
  def({ id: 'm2orla', name: 'Madame Orla\'s', kind: 'inside', outside: 'brassport_n', rows: grid(9, 7, '_').border('#').fill(1, 6, 7, 6, '_').put(4, 6, 'm').fill(2, 2, 6, 4, 'R').rows(), arrive: { x: 4, y: 5 },
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm2posters' }, { k: 'plant', x: 7, y: 1 }, { k: 'sofa', x: 6, y: 5 }],
    npcs: [{ id: 'orla', x: 4, y: 2, dir: 'down', look: L.m2orla, name: 'Madame Orla', talk: 'm2orla' }] });

  // =====================================================================
  //  The story
  // =====================================================================
  const sp = J => J.dname(J.get('mystarter') || 'eevee');
  // ---- Canal Road
  on('m2junoRoad', { needs: ['!m2juno'], sets: ['m2juno'] }, async J => {
    if (J.flag('m2juno')) return;
    J.emote('juno', '!');
    await J.say(['{NAME}! You actually left Tidemark! Welcome to the big wide world. It smells like canal water.', 'I just dropped Mom\'s parcel at the Lumen Company. They tipped me in lanterns. LANTERNS.'], 'juno');
    await J.say(['Brassport\'s east along the canal - biggest city in Meridia. Brass, trains, and a lamp on every corner.', 'And the couriers there RACE. Real races, right through the city. I\'m on a crew now: the Canal Couriers!'], 'juno');
    await J.say(['Come by the depot in the South Quarter. Rook\'s always looking for fast legs - tell him I sent you.', 'Last one to the city gate is a Slowpoke! Go!'], 'juno');
    await J.fade(() => { J.set('m2juno'); J.refresh(); });
  });
  on('m2boater', {}, (J, n) => J.say(J.flag('nellglimpse') ? ['You saw something in the water? Ha! Everyone does, round midnight. Reflections play tricks.', '...Mostly.'] : ['This cut runs all the way into Brassport. Every barge of brass and coal comes this way.', 'Used to be a gas lamp every hundred yards. Now it\'s all Lumen lanterns. Never need oil. Never go out.'], n));
  on('m2walker', {}, (J, n) => J.say(J.pick([['I walk this road every morning. Same road, same morning. Hm.', 'Lovely, isn\'t it? I think I\'d remember if it wasn\'t.'], 'Mind the Lightkeepers by the bridge. Polite as anything, but they will battle you.']), n));
  on('m2lockwheel', {}, J => J.say('The great iron wheel that opens Lock No. 3. A chalk mark on it reads: "TURN SLOWLY. SHE SULKS."'));
  on('m2odile', {}, async (J, n) => {
    if (await raceDrop(J, n, 3)) return;
    await J.say(J.flag('m2crewdone') ? 'The fastest legs on the canal, at my door! Sit, sit. Rest a minute.' : ['Oh, a visitor! Nobody stops at the lock any more - they all hurry on to the city.', 'Sit a minute. The kettle is on, and your Pokémon look like they could use a rest.'], n);
    if (await J.ask('Rest a while?', ['Yes, please', 'No, thanks'], n) !== 0) return J.say('Off you go, then. Mind the towpath, it\'s slippery.', n);
    await J.fade(async () => { await J.heal(true); });
    await J.say('There. Nothing a cup of tea and the sound of water can\'t fix.', n);
  });

  // ---- arriving in Brassport
  on('m2arrive', { needs: ['!m2arrive'], sets: ['m2arrive'] }, async J => {
    if (J.flag('m2arrive')) return;
    await J.face('greeter', 'left');
    await J.say(['Welcome, welcome! Welcome to Brassport, the City of a Thousand Lamps!', 'Oh, a new face! You must have a Lumen lantern - every visitor gets one. Compliments of Mr. Vale!'], 'greeter');
    await J.give('m2lantern');
    await J.say([`The lantern hums in your hands, very softly. ${sp(J)} flattens its ears and growls at it.`, 'The light inside flickers... and steadies.']);
    await J.say(['Oh! Goodness. Some Pokémon are a little shy of them. It\'s very rare. Terribly sorry!', 'You\'re just in time - it\'s Founder\'s Day! Mr. Vale speaks in the Grand Plaza, across the Grand Bridge in the North Quarter.', 'Do enjoy the city. Nobody here has a bad day. Not ever!'], 'greeter');
    J.set('m2arrive');
  });
  on('m2greeter', {}, (J, n) => J.say(J.flag('speech') ? 'Wasn\'t Mr. Vale wonderful? Eleven years without a single crime. I can\'t even remember what one looks like!' : 'The Grand Plaza is north, across the Grand Bridge. Mr. Vale is about to speak!', n));
  on('m2gondolier', {}, (J, n) => J.say(J.flag('nellglimpse') ? ['A girl in the water? I\'ve rowed these canals thirty years. I\'ve seen her too.', 'Grey dress. Little candle Pokémon. Only at midnight, only in the still water. I never tell anyone. Who\'d believe a gondolier?'] : ['Gondola, signore? Only fifty yen to the North Quarter... ah, the bridge is free. Nobody takes the boat any more.', 'Brassport has three canals: the Old Canal here, the Grand Canal north, and the harbour. Never fall in. The water is colder than it looks.'], n));
  on('m2sKid', {}, (J, n) => J.say(J.pick(['I wanna be a courier! The Canal Couriers are SO fast. The Bolts are fast too, but they\'re meanies.', 'My mum says I fell in the canal last year. I don\'t remember. I can\'t even swim! ...Can I?']), n));
  on('m2runner', {}, (J, n) => J.say(J.flag('m2crew') ? 'Rook timed you? Ha! He times everybody. He times his tea.' : ['Canal Couriers, at your service! We\'re the green caps. The yellow ones are the Brass Bolts. Boo!', 'Juno sent you? Then go in and see Rook. He\'ll want to see your legs. I mean, how fast they are.'], n));
  on('m2gymGuide', {}, (J, n) => J.say(J.flag('badge.gear') ? 'The Gear Badge! Gideon doesn\'t give those out like lanterns. Well done!' : J.flag('nellglimpse') ? ['The Brass Light is open! Gideon trains Steel types. Hard as anvils.', 'Fire, Fighting and Ground moves hit Steel hard. And Electric moves bounce right off Gideon\'s Skarmory, so don\'t bother.'] : ['The Brass Light is closed for Founder\'s Day. Gideon\'s up at the plaza with Mr. Vale.', 'It opens again tomorrow at first light. Steel types, so bring something hot or something punchy!'], n));
  on('m2gymLocked', {}, J => J.say(J.flag('speech') ? 'A brass plate on the door: "CLOSED FOR FOUNDER\'S DAY. OPEN AGAIN AT FIRST LIGHT. - G."' : 'A brass plate on the door: "CLOSED. The Warden is at the Founder\'s Day speech in the Grand Plaza."'));
  on('m2ansel', {}, (J, n) => J.say(J.flag('nellglimpse') ? 'You saw her, didn\'t you? The grey girl. I fish here every night. She looks up at the lanterns like she\'s waiting for someone.' : ['I only fish at night. That\'s when the lanterns hum, and the harbour goes flat as a mirror.', 'Funny thing. Sometimes the mirror shows more than it should.'], n));
  on('m2sunken', {}, (J, n) => J.say(['The Sunken Road\'s under a foot of seawater since the spring tides. Nobody can get through to Saltmere.', 'If you could ride a big Water Pokémon, maybe. Otherwise, it\'s closed.'], n));
  on('m2salt', {}, (J, n) => J.say(J.flag('badge.gear') ? 'Gideon\'s Light has never once gone dark. Not even the night of the Lantern Express. That man would burn his own hands before he let it go out.' : ['Every great port has a light. Ours is the Brass Light - Warden Gideon\'s.', 'They say there are eight of them, round Meridia. All built by the Lantern-folk. Nobody knows what for, any more.'], n));
  on('m2tourist', {}, (J, n) => J.say(J.pick(['I came for a week. I think I\'ve been here a month. Every day is so nice, they all blur together!', 'The canals! The lamps! The brass! I\'ve bought eleven postcards. I\'ve forgotten who to send them to.']), n));
  on('m2twinA', {}, (J, n) => J.say(['Yesterday we went to the beach! Poppy says we didn\'t. Poppy is WRONG.', 'I\'ve got sand in my shoes. That\'s evidence. Detectives use evidence.'], n));
  on('m2twinB', {}, (J, n) => J.say(['We did NOT go to the beach. Pip just dreamed it. There\'s no sand in Brassport, it\'s all canals.', '...Where did the sand come from, then? Hmm.'], n));
  on('m2pembMum', {}, (J, n) => J.say(J.flag('speech') ? 'Twins. They argue about everything. Lately they argue about what happened yesterday. Neither of them can prove it, and neither can I.' : 'Mind the twins, they bite. Only each other, mostly.', n));
  on('m2shopper', {},(J, n) => J.say('Great Balls are the best thing in the shop. Well. After the biscuits by the counter. Those aren\'t for sale, apparently.', n));

  // ---- Founder's Day: Cassius Vale's speech
  on('m2speech', { needs: ['!speech'], sets: ['speech'] }, async J => {
    if (J.flag('speech')) return;
    await J.say(['Halfway across the Grand Bridge, a cheer rolls over the water.', 'The Grand Plaza is packed. Up on the steps of the Sky Tower stands a tall man in white and gold.']);
    await J.say(['Friends! Neighbours! Happy Founder\'s Day!', 'Twenty years ago I came to Brassport with nothing but a lamp and an idea.'], 'cassius');
    await J.say(['Look at us now. No crime in eleven years. No fires. No floods. Not one sad face on our canals.', 'People ask me: Cassius, how? And I tell them: a light. A light that keeps the darkness out. All of it.'], 'cassius');
    await J.say(['This year, every home in Meridia will have a Lumen lantern. Free.', 'Because nobody - NOBODY - should ever have to lose what they love.'], 'cassius');
    await J.say('The crowd roars. Somewhere a brass band starts up.');
    await J.say([`${sp(J)} isn't cheering. It's staring at the lanterns on the steps, very still.`, 'And on the stage, beside Mr. Vale, a broad man in a grey cap isn\'t clapping either.']);
    await J.say(['And now, our dear Warden Gideon will light the Founder\'s Lamp. Gideon?'], 'cassius');
    await J.say('...Of course, Cassius.', 'gideon');
    await J.fade(async () => { await J.wait(400); });
    await J.say(['The great lamp on the Tower steps blazes gold. Every lantern in the plaza answers it with one low hum.', 'Mr. Vale bows, and is gone into the Tower before the applause ends.']);
    await J.say(['{NAME}! Over here! Did that feel a bit... off, to you?', '"Not one sad face." Everybody has sad days. Teo cried for an hour when his kite got stuck in a tree. That\'s just being a person.'], { name: 'Juno', look: 'juno' });
    await J.say(['Let\'s ask around. Find somebody who remembers a bad day - a really bad one - in this city.', 'I\'ll be at the Copper Kettle, the café by the West Gate. Come find me!'], { name: 'Juno', look: 'juno' });
    await J.fade(() => { J.set('speech'); J.refresh(); });
    await J.say('(You write it in the notebook: Cassius Vale\'s speech. Gideon didn\'t clap.)');
  });
  on('m2cassiusStage', {}, (J, n) => J.say('Mr. Vale is about to speak. The Lightkeepers politely keep everyone back from the steps.', n));
  on('m2gideonStage', {}, (J, n) => J.say('...', n));
  on('m2keeperStage', {}, (J, n) => J.say('Please keep behind the line! Thank you so much. Sorry.', n));
  on('m2gideonPlaza', { needs: ['speech'], sets: ['m2gideon'] }, async (J, n) => {
    if (J.flag('m2gideon')) return J.say(['The Light opens at first light. Before then... keep your eyes open, {NAME}.', 'Everyone in this city sleeps very soundly. Too soundly.'], n);
    await J.say(['You\'re the one Mara wrote to me about. The kid who brought her crystal back from the Lumen people.', 'I\'m Gideon. I keep the Brass Light.'], n);
    await J.say(['My Light\'s closed today - Founder\'s Day. Cassius likes his Wardens on the stage, where people can see them.', 'Come at first light tomorrow. I\'ll battle you then.'], n);
    await J.say(['...Strange thing. Every time I light that lamp for him, I reach for a memory that isn\'t there.', 'Never mind. Old men and old lamps. Go on.'], n);
    J.set('m2gideon');
  });
  on('m2crowd1', {}, (J, n) => J.say(J.flag('speech') ? 'Wasn\'t it wonderful? I cried! ...I think I cried. I can\'t remember why people cry.' : 'Mr. Vale\'s about to speak! I have the best spot!', n));
  on('m2crowd2', {}, (J, n) => J.say(J.flag('speech') ? 'My shop burned down two years ago. That\'s what the papers say. I don\'t remember it at all. Lucky me, eh?' : 'Shh! It\'s starting!', n));
  on('m2crowd3', {}, (J, n) => J.say(J.flag('speech') ? 'Mr. Vale lost a daughter, they say. Long ago. Maybe that\'s why he wants nobody to lose anything.' : 'I got a free lantern AND a free balloon!', n));
  on('m2crowd4', {}, (J, n) => J.say(J.flag('speech') ? 'Twenty Founder\'s Days, and every speech is the same. I love it. Same speech, same cheering, same lovely day.' : 'Every year he gives the same speech. It\'s tradition!', n));
  on('m2towerLocked', {}, J => J.say(['The Lumen Sky Tower. Two Lightkeepers at the doors bow politely.', '"Terribly sorry - the Sky Tower is closed to the public. Company staff and invited guests only. Thank you for understanding!"']));
  on('m2railGuard', {}, (J, n) => J.say(J.flag('badge.gear') ? 'Warden Gideon sent word you\'re to be let through. Go on, then.' : ['The railyard\'s closed to the public. Freight only.', 'Unless the Warden himself says otherwise. He was a rail man once, Gideon.'], n));
  on('m2northGuard', {}, (J, n) => J.say(['The snow road north to Coldfields is shut. Avalanche warnings all the way up to Highwatch.', 'Come back when you\'re a lot tougher. And bring a scarf.'], n));
  on('m2poet', {}, (J, n) => J.say(J.pick([['"A thousand lamps upon the water,\nand not one shadow in the town..."', 'Hm. It needs a shadow. Every good poem needs a shadow.'], 'I used to write sad poems. They were my best ones. I can\'t remember any of them now.']), n));
  on('m2nKid', {}, (J, n) => J.say(J.pick(['The Sky Tower goes all the way up into the clouds! Mr. Vale lives at the top, my brother says.', 'Lightkeepers say sorry even when they WIN. It\'s so weird.']), n));

  // ---- the clues: nobody in Brassport remembers their worst days - or their best
  on('m2albrecht', { needs: ['speech'], sets: ['m2albrecht'] }, async (J, n) => {
    if (!J.flag('speech')) return J.say(['Hello, hello! Come in. I\'ve just made tea - I always make two cups.', 'Margit will be back from the market any minute.'], n);
    if (J.flag('m2c.worst')) return J.say(['Two cups. Always two cups. My hands remember something, even if I don\'t.', '...Thank you for sitting with me.'], n);
    await J.say(['A visitor! Sit, sit. Margit\'s out at the market. She\'s always at the market, that woman.', 'She\'ll be back any minute. I\'ll pour her cup now, so it\'s ready.'], n);
    await J.say('He pours tea into the second cup. Beside it sits yesterday\'s cup, still full, and the day before\'s.');
    J.set('m2albrecht');
  });
  on('m2cards', { needs: ['m2albrecht'], sets: ['m2c.worst'] }, async J => {
    if (!J.flag('m2albrecht')) return J.say('A shelf of books and keepsakes. A Lumen lantern glows on the end, humming softly.');
    if (J.flag('m2c.worst')) return J.say('The sympathy cards. "With deepest sympathy, for Margit." A Lumen lantern hums beside them.');
    await J.say(['On the shelf, behind a Lumen lantern, is a stack of cards.', '"With deepest sympathy." "Thinking of you." "Margit was the kindest soul on the canal."', 'They are dated last spring.']);
    await J.say(['Margit isn\'t at the market. She\'s gone. And Mr. Albrecht doesn\'t remember the worst day of his life.', '(You write it in the notebook.)']);
    J.set('m2c.worst');
  });
  on('m2teacups', {}, J => J.say(J.flag('m2c.worst') ? 'Three cups of cold tea for Margit, in a row.' : 'Two neat cups on saucers. One for Mr. Albrecht. One for Margit.'));
  on('m2rosa', { needs: ['speech'], sets: ['m2c.best'] }, async (J, n) => {
    if (await raceDrop(J, n, 1)) return;
    if (!J.flag('speech')) return J.say('Welcome to the Copper Kettle! Everybody\'s up at the plaza for the speech. Come back after for cake!', n);
    if (J.flag('m2c.best')) return J.say(['Teodor brings me flowers every week. Every week I say "for me?" like a girl.', 'Maybe forgetting isn\'t so bad. ...Is it?'], n);
    await J.say(['Welcome, welcome! The speech is over? Good - now everyone will want cake at once.', 'Oh, the photo? On the wall there?'], n);
    await J.say(['That\'s me, in the dress. And that handsome fellow is Teodor - my husband, he says.', 'We married on the Lantern Steps, at sunset, with the whole canal singing. So he tells me.', 'I don\'t remember a minute of it. Not the dress, not the singing. Nothing. I\'ve looked at that photo a thousand times.'], n);
    await J.say('(Rosa doesn\'t remember the best day of her life either. You write it in the notebook.)');
    J.set('m2c.best');
  });
  on('m2photo', {}, J => J.say('A framed photo: Rosa in a white dress and Teodor in a borrowed suit, laughing on the Lantern Steps. Behind them, a single Lumen lantern.'));
  on('m2teodor', {}, (J, n) => J.say(J.flag('m2c.best') ? ['Every week I tell her about our wedding. Every week her eyes light up like it\'s new.', 'I\'d rather she remembered. Even if it meant she\'d remember the bad days too.'] : 'Best cake in Brassport. Don\'t tell my wife I said that. She made it. She\'d get a big head.', n));
  on('m2regular', {}, (J, n) => J.say(J.pick(['I\'ve had the same slice of cake every day for a year. It\'s new every time!', 'The Lumen lantern on my table hums at me. I hum back. We\'re friends now.']), n));
  on('m2sable', { needs: ['speech'], sets: ['m2c.hum'] }, async (J, n) => {
    if (await raceDrop(J, n, 2)) return;
    if (J.flag('m2c.hum')) return J.say('A Lumen lantern for every home. Do take a brochure. And if yours ever stops humming, do come back. We\'ll take it off your hands.', n);
    await J.say(['Welcome to the Lumen Showroom! I\'m Mr. Sable. May I show you the future?', 'The Lumen lantern: silent, smokeless, free. It never needs oil and it never, ever goes out.'], n);
    await J.say(['How does it work? Oh, it draws on ambient light. Mostly. The details are a Company secret.', 'They do hum a little louder at night. Some people find it soothing. Like a lullaby.'], n);
    await J.say([`${sp(J)} creeps up to the big display lantern... and growls.`, 'Inside the brass cage, a crystal glows warm and steady. It looks exactly like the crystal from the Tidemark Light.']);
    await J.say('Ah - please don\'t let your Pokémon touch the display. It\'s... sensitive.', n);
    await J.say('(You write it in the notebook: the lanterns hum at night, and their crystals look like a lighthouse crystal.)');
    J.set('m2c.hum');
  });
  on('m2display', {}, J => J.say(J.flag('m2c.hum') ? 'A Lumen lantern on a velvet stand. Its crystal hums. Up close, it sounds almost like voices, very far away.' : 'A Lumen lantern on a velvet stand. A card reads: "THE LUMEN MK. IV - FREE TO EVERY HOME."'));
  on('m2bust', {}, J => J.say('A bronze bust of Cassius Vale. The plaque: "FOUNDER. FATHER OF LIGHT." Someone has scratched a tiny "father of who?" underneath.'));
  on('m2showKeeper', {}, (J, n) => J.say('Please don\'t touch the displays! Thank you so much. Sorry. You weren\'t touching them. Sorry.', n));
  on('m2visitor', {}, (J, n) => J.say('I\'ve taken home six lanterns. Six! I\'m so happy I can\'t remember being anything else.', n));

  // ---- midnight on the Lantern Steps: the girl in grey
  on('m2junoCafe', { needs: ['m2c.worst', 'm2c.best', 'm2c.hum'], sets: ['nellglimpse'] }, async (J, n) => {
    if (J.flag('nellglimpse')) return;
    const got = ['m2c.worst', 'm2c.best', 'm2c.hum'].filter(f => J.flag(f));
    if (got.length < 3) {
      const hint = !J.flag('m2c.worst') ? 'There\'s an old man south of the canal, by the harbour - Mr. Albrecht. Rosa says he always orders two slices.' : !J.flag('m2c.best') ? 'Ask Rosa about the photo on the wall. She goes all quiet when people look at it.' : 'Check out the Lumen Showroom in the North Quarter. I want to know how those lanterns actually work.';
      return J.say([got.length ? `${got.length} thing${got.length > 1 ? 's' : ''} so far? Keep going.` : 'Found anything weird yet? Me neither. Everyone\'s SO happy.', hint], n);
    }
    await J.say(['So. Mr. Albrecht forgot the worst day of his life. Rosa forgot the best one.', 'And those lanterns hum, and they\'ve got lighthouse crystals in them, and they\'re in EVERY house.'], n);
    await J.say(['Nobody in this city has a bad day because nobody REMEMBERS one. That isn\'t happy. That\'s... empty.', 'The man at the showroom said they hum loudest at night. So let\'s watch them at night.', 'Midnight. The Lantern Steps, by the harbour. Don\'t be late, Slowpoke.'], n);
    J.set('m2night');
    await J.warp('brassport_s', 15, 19, 'down');
    await J.say(['Midnight. The harbour is black glass. Across the city, every lantern hums one low note together, as if the whole of Brassport were breathing in.']);
    await J.say('Hear that? It\'s like... they\'re pulling something in.', { name: 'Juno', look: 'juno' });
    await J.say([`${sp(J)} stops dead at the edge of the pier and growls at the water.`, 'You look down. Your reflection looks back up at you...']);
    await J.say(['...and beside it, there is another face.', 'A girl in grey, pale as ash, looking up out of the water. A tiny candle Pokémon floats at her shoulder - a Litwick.', 'Her lips move, but no sound comes. She looks frightened. Not of you. For you.']);
    await J.say('A ripple. She\'s gone. There is only your face, and the lanterns, and the dark water.');
    await J.say(['...Tell me you saw that. TELL me you saw that, {NAME}.', 'A girl. In the water. With a Litwick. Okay. Okay okay okay. Nobody is going to believe us. Again.'], { name: 'Juno', look: 'juno' });
    await J.say('(You write it in the notebook: a girl in grey in the water, with a Litwick.)');
    await J.fade(async () => { J.unset('m2night'); J.set('nellglimpse'); J.refresh(); await J.heal(false); await J.wait(600); });
    await J.say('Morning comes. The lanterns are silent again, as if nothing happened.');
    await J.say(['The Brass Light opens at first light. Gideon was weird at the speech - he knows something.', 'Meet me at the lighthouse bridge. I\'ve got an idea to wake us both up.'], { name: 'Juno', look: 'juno' });
  });

  // ---- Juno, battle 2: at the bridge to the Brass Light
  on('m2junoBridge', { needs: ['nellglimpse', '!juno2'], sets: ['juno2'] }, async J => {
    if (!J.flag('nellglimpse') || J.flag('juno2')) return;
    J.emote('juno', '!');
    await J.say(['There you are! Okay, my idea: a battle. Nothing clears my head like a battle.', 'And if we\'re going up against whatever is inside those lanterns, we\'d both better be strong. Ready? Ready!'], 'juno');
    const rs = J.get('rivalStarter') || 'eevee';
    await J.battle({ id: 'juno2', name: 'Juno', look: 'juno', team: [['starly', 15], ['electrike', 15], [J.grown(rs, 17), 17]], pay: 60, theme: 'city', canLose: true,
      before: 'Express delivery: one battle, extra spicy!', lose: 'Signed for and delivered. Ugh!', win: 'Fastest courier on the coast!' });
    await J.say(J.lastWin() ? ['Ha... okay. Okay! I feel better. Do you feel better? You look better. You look like you WON.'] : ['Yes! Still got it. Don\'t feel bad - I\'ve been racing these canals all week.'], 'juno');
    await J.say(['Go get your badge. I\'m going to call home before my shift.', 'Mom says Teo\'s been sleeping a lot. Like, a LOT. Probably just growing. He\'s medium, you know. Medium kids grow.'], 'juno');
    await J.fade(() => { J.set('juno2'); J.refresh(); });
  });

  // ---- the Brass Light
  on('m2gymStatue', {}, J => J.say(J.flag('badge.gear') ? 'THE BRASS LIGHT - WARDEN: GIDEON\nTrainers who have earned the Gear Badge: {NAME}' : 'THE BRASS LIGHT - WARDEN: GIDEON\n"Steel remembers the hammer."'));
  on('m2gears', {}, J => J.say('Huge brass gears turn slowly behind a grille, tick... tick... tick. Oiled, polished, perfect.'));
  on('m2lamp', {}, J => J.say(J.flag('badge.gear') ? 'The great lamp of the Brass Light. Its crystal is old and a little scratched - nothing like the smooth Lumen crystals. It feels warm, and honest.' : 'The great lamp of the Brass Light, turning on its gears. It throws a beam all the way across the harbour.'));
  on('m2gideonWin', { sets: ['badge.gear', 'ch3'] }, async J => {
    await J.say(['Well forged. Truly. Take this - the Gear Badge.'], 'gideon');
    J.badge('gear');
    await J.give('tm:flash-cannon');
    await J.say(['Flash Cannon. Polished steel, catching the light. Use it well.'], 'gideon');
    await J.say(['You were on the Lantern Steps last night, you and the Reyes girl. Don\'t look so surprised - I see the whole harbour from up here.', 'You saw something in the water. So have I. For twenty years.'], 'gideon');
    await J.say(['Every Warden lost a day this year. Mara told me. Mine is older - twenty years older.', 'I was a rail apprentice when the Lantern Express vanished on the old line, with forty-one people aboard. They say I was on shift that night.', 'I can\'t remember one minute of it. Not one.'], 'gideon');
    await J.say(['Now the old rail men say the Express still runs. At midnight. Through Hollow Cut.', 'The railyard is east of the plaza. I\'ve sent word to let you through. If you find out what happened that night... come and tell me.'], 'gideon');
    await J.chapter('Chapter 2 complete!', 'Next: Chapter 3 - The Ghost Train');
    J.set('ch3'); J.refresh();
    await J.chapter('Chapter 3', 'The Ghost Train');
  });

  // ---- North Quarter people
  on('m2hilde', {}, async (J, n) => {
    await J.say(J.flag('nellglimpse') ? 'Back again? Your bed\'s made. Nobody else ever sleeps in it - the whole city sleeps like stones.' : 'Welcome to the Lamplit Inn! A soft bed for you, a warm blanket for your Pokémon.', n);
    if (await J.ask('Rest at the inn? (It\'s free for trainers.)', ['Yes, please', 'No, thanks'], n) !== 0) return J.say('Come back any time, dear.', n);
    await J.fade(async () => { await J.heal(true); });
    await J.say('Sleep well? Of course you did. Everyone does, in Brassport.', n);
  });
  on('m2traveler', {}, (J, n) => J.say(['I came down from Highwatch before the snow shut the road. Up there, nobody has a Lumen lantern yet.', 'People argue and cry and laugh and remember. It\'s exhausting. I miss it.'], n));
  on('m2fenna', {}, (J, n) => J.say(J.flag('c3train') ? ['They started! Every clock in the shop started again at the same moment, last night at midnight!', 'Eleven fifty-nine... and then, tick, midnight. As if something finally arrived.'] : ['Every clock in this shop has stopped at the same time: eleven fifty-nine. I fix them. They stop again.', 'Eleven fifty-nine. Doesn\'t that ring a bell? Something, long ago, at eleven fifty-nine...'], n));
  on('m2clock', {}, J => J.say(J.flag('c3train') ? 'Tick, tock. The clock is running, a little after the hour.' : 'A handsome brass clock. Its hands point to 11:59. Its pendulum hangs perfectly still.'));
  on('m2wendell', {}, (J, n) => J.say(J.flag('nellglimpse') ? ['A girl in the canal? Ha. When I was small I used to look for my mother in the water.', 'She took the night train to Mossgrove when I was six. The Lantern Express. She never came home. I can\'t even remember her voice.'] : ['Wendell Marsh, lamp-oiler. Well - I WAS. Forty gas lamps on the Grand Canal, every evening.', 'Then the Lumen lanterns came. They never need oil. So here I am, with a shelf of oil cans and nothing to do with them.'], n));
  on('m2oilcans', {}, J => J.say('A neat row of brass oil cans, polished but empty. A child\'s drawing is tucked behind them: a train, and a lady waving from the window.'));
  on('m2orla', {}, (J, n) => J.say(J.flag('speech') ? ['Madame Orla, Mistress of Mysteries! Retired. My Mismagius and I played every stage in Meridia.', 'But she\'s forgotten all her tricks. Every one. And so have I. The lantern took them, I think. The lantern took the bad nights AND the good ones.'] : ['Madame Orla, Mistress of Mysteries! Pick a card. Any card. ...Hm. Where did I put the cards?', 'Never mind. It\'s Founder\'s Day! Go and see the speech.'], n));
  on('m2posters', {}, J => J.say('Old theatre posters: "MADAME ORLA AND THE MISMAGIUS OF A THOUSAND FACES - ONE NIGHT ONLY!" Every one is signed, and every one is a little faded.'));

  // =====================================================================
  //  Side story: Juno's crew - the Canal Couriers' races. Rook hands you a
  //  parcel and starts his stopwatch (your steps); deliver it and run back
  //  faster than the Brass Bolts' best. Three races, then Vance.
  // =====================================================================
  const steps = () => { try { return Journey._G().steps || 0; } catch (e) { return 0; } };
  const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const RACES = {
    1: { to: 'Rosa at the Copper Kettle', where: 'the café by the West Gate', par: 100, prize: ['great', 3] },
    2: { to: 'Mr. Sable at the Lumen Showroom', where: 'the North Quarter, over the Grand Bridge', par: 154, prize: ['superpotion', 3] },
    3: { to: 'Lockkeeper Odile', where: 'Lock No. 3, out on Canal Road', par: 160, prize: ['rarecandy', 1] }
  };
  // a recipient's side: true when this talk was a delivery
  async function raceDrop(J, n, k) {
    if (J.get('m2racing') !== k || J.flag('m2dropped')) return false;
    J.take('m2parcel'); J.set('m2dropped');
    await J.say(J.pick(['A parcel? For me? Oh, how exciting!', 'Signed, sealed, delivered. Now RUN!', 'Rook\'s couriers! Always in a hurry. Here, I\'ve signed it - go, go!']), n);
    await J.say('(Delivered! Now race back to Rook at the depot!)');
    return true;
  }
  on('m2rook', { needs: ['m2juno'], sets: ['m2crew', 'm2race1', 'm2race2', 'm2race3'] }, async (J, n) => {
    if (!J.flag('m2crew')) {
      await J.say(['Rook. Canal Couriers. Thirty years on these streets and I never once delivered late.', 'Juno sent you? Then you\'re fast, or she likes you. Let\'s find out which.'], n);
      await J.say(['Here\'s how it works. I give you a parcel and start my watch. You deliver it and run back here.', 'Beat the Brass Bolts\' best time on the route, and you\'re crew. Shortcuts are allowed. Encouraged, even.'], n);
      J.set('m2crew');
    }
    const k = J.get('m2racing');
    if (k) {
      const R = RACES[k];
      if (!J.flag('m2dropped')) {
        if (await J.ask(`The parcel's still in your bag! It goes to ${R.to}. Give up this race?`, ['Keep going!', 'Give up'], n) === 0) return J.say('Then GO! The clock is running!', n);
        J.take('m2parcel'); J.unset('m2racing');
        return J.say('No shame in it. Well, a little. Come back when you\'re ready.', n);
      }
      const used = steps() - (J.get('m2raceStart') || 0), you = Math.max(1, Math.round(used * 0.5)), them = Math.round(R.par * 0.5);
      J.unset('m2racing'); J.unset('m2dropped');
      if (steps() && used > R.par) return J.say([`Time! ${clock(you)}. The Bolts' best on that route is ${clock(them)}.`, 'Not bad, but not crew. Try again - and look for a shorter way.'], n);
      await J.say([`TIME! ${clock(you)}! The Bolts' best is ${clock(them)}!`, k === 3 ? 'All the way to the lock and back! That\'s a Canal Couriers record!' : 'Ha! You beat the Bolts! That\'s my crew!'], n);
      J.set('m2race' + k);
      await J.give(R.prize[0], R.prize[1]);
      if (k === 3) await J.say(['That\'s all three routes. You\'re officially a Canal Courier.', 'And... ah. Vance has been glaring at you from the corner for ten minutes. Go and see what he wants.'], n);
      return;
    }
    const next = [1, 2, 3].find(i => !J.flag('m2race' + i));
    if (!next) return J.say(J.flag('m2crewdone') ? ['You beat Vance! Thirty years I\'ve waited to see somebody wipe that smirk off his face.', 'Any time you want a job, kid. The green cap\'s yours.'] : 'Vance is waiting for you. Don\'t let him rattle you - he\'s all lightning and no lunch.', n);
    const R = RACES[next];
    if (await J.ask(`Race ${next}: a parcel for ${R.to}, in ${R.where}. Ready?`, ['On your marks!', 'Not yet'], n) !== 0) return J.say('The parcels will keep. The Bolts won\'t.', n);
    await J.give('m2parcel');
    J.set('m2racing', next); J.set('m2raceStart', steps());
    await J.say('Ready... set... GO!', n);
  });
  on('m2board', {}, J => J.say(['A chalkboard of routes and times.', `CANAL COURIERS vs BRASS BOLTS - this week: ${['m2race1', 'm2race2', 'm2race3'].filter(f => J.flag(f)).length} to 3. Underneath, in yellow chalk: "BOLTS RULE". Underneath that, in green: "NO THEY DON'T".`]));
  on('m2fen', {}, (J, n) => J.say(J.flag('m2race1') ? 'Psst. Going north? Don\'t take the long way round the fountain. Cut straight up the middle of the plaza.' : ['Juno\'s the fastest of us. Don\'t tell her I said so.', 'Psst - the Copper Kettle is right by the West Gate. Straight along the canal from here. Don\'t stop to look at the boats.'], n));
  on('m2vance', { needs: ['m2race3'], sets: ['m2crewdone'] }, async (J, n) => {
    if (J.flag('m2crewdone')) return J.say(['Hmph. One loss. Don\'t get used to it, Green Cap.', 'And tell Reyes I still say she cheated. I can\'t remember HOW. But she did.'], n);
    if (!J.flag('m2race3')) return J.say(J.flag('m2crew') ? 'Vance. Brass Bolts. You\'re running for Rook now? Cute. Wake me when you beat a real time.' : 'Brass Bolts. Fastest legs in Brassport. ...Who let YOU in here?', n);
    await J.say(['Three routes, three records. Fine. FINE. Fast legs. But are you fast in a battle?', 'Nobody makes a fool of the Bolts. Let\'s settle it!'], n);
    if (await J.battle({ id: 'm2vance', name: 'Vance', look: 'm2vance', team: [['electrike', 16], ['rookidee', 16], ['shinx', 17]], pay: 40, theme: 'city', before: 'Lightning doesn\'t wait!', lose: 'Out-run AND out-battled...' }, n) !== 'win') return;
    await J.say(['...Okay. You\'re fast. Faster than me. Take this - it\'s my best move. A courier\'s move: hit, and get out.'], n);
    await J.give('tm:volt-switch');
    J.set('m2crewdone');
    await J.say('Next Founder\'s Day, I want a rematch. If I can remember.', n);
  });

  // ---- Warden Gideon stands outside his Light in the Long Night (Chapter 10)
  MMaps.SPOTS.gideon = { map: 'brassport_s', x: 7, y: 26, dir: 'up' };

  for (const id of ['canalroad', 'm2lockhouse', 'brassport_s', 'm2center', 'm2mart', 'm2cafe', 'm2depot', 'm2albrecht', 'm2pemberton', 'brasslight1', 'brasslight2',
    'brassport_n', 'm2showroom', 'm2inn', 'm2clocks', 'm2marsh', 'm2orla']) M[id].chapter = 2;
  chapter({ n: 2, title: 'City of a Thousand Lamps', start: { map: 'sunpath', x: 10, y: 3 }, level: 14, badge: 'gear', center: 'm2center',
    goals: ['m2juno', 'm2arrive', 'speech', 'm2albrecht', 'm2c.worst', 'm2c.best', 'm2c.hum', 'nellglimpse', 'juno2', 'badge.gear', 'ch3'] });
})();
