'use strict';
// =====================================================================
//  JOURNEY II - Chapter 9: The Long Night. Up through the caves of
//  Frostcrown to the summit, where Cassius Vale has built his tower
//  around the Lantern-folk's Great Lantern. Juno gives him the key; he
//  lights it; the light is grey, and Meridia freezes into the Echo
//  (flag longnight: every outdoor map turns grey). Juno leaves you her
//  family's courier Corviknight, Postmark: you can fly (ride.fly).
//  Plan: docs/journey2/world.md · story: docs/journey2/story.md
// =====================================================================
(() => {
  const { def, grid, L, M } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES } = MStory;

  // ---- new people
  Object.assign(L, {
    m9captain: { hat: 'beanie', hatColor: 0xf4f4f4, hatFront: 0xb08a3a, hair: 0x2a2a3a, hairStyle: 'long', top: 0xe8e8f0, sleeves: 'long', inner: 0x3a3a48, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0xb08a3a },
    m9hermit: { hat: 'beanie', hatColor: 0x6a4a2a, hatFront: 0x6a4a2a, hair: 0xd9d9d9, hairStyle: 'spiky', top: 0x6a5a3a, sleeves: 'long', inner: 0xe8dcc0, legs: 0x4a3a2a, legStyle: 'pants', shoes: 0x3a2a1e, bag: 0x8a5a30 }
  });

  // ---- the clue notebook
  Object.assign(CLUES, {
    m9wynn: 'Tamer Wynd: Rhoswen\'s Dragons cleared the pass. The caves of Frostcrown climb right up under the summit.',
    m9guard: 'I beat Captain Isolde of the Lantern Guard on the summit ridge. The tower of the Great Lantern is right ahead.',
    longnight: 'Juno gave Cassius the key. He lit the Great Lantern - and its light is GREY. Meridia has frozen into the Echo. Everyone is living their happiest day, over and over. Everyone but me.',
    'ride.fly': 'Juno gave me Postmark, her family\'s courier Corviknight. I can FLY to any town I\'ve visited (MENU > FLY).'
  });

  // ---- trainers
  Object.assign(TRAINERS, {
    m9doran: { team: [['golem', 42], ['steelix', 43]], pay: 24, theme: 'icecave', look: 'hiker', name: 'Hiker Doran', before: 'Forty years climbing Frostcrown and never once met a kid in here! Let\'s see what brought you!', lose: 'Forty years, and THAT\'S new.', after: 'The caves wind up and up. Keep left at the frozen pool, or right - they both get there. Eventually.' },
    m9rue: { team: [['sneasel', 42], ['abomasnow', 43], ['frigibax', 42]], pay: 24, theme: 'icecave', look: 'c7skier', name: 'Climber Rue', before: 'Ice axe, crampons, team of six - well, three. Battle!', lose: 'Lost my grip!', after: 'The Lumen built a lift to the top. Of course we\'re not allowed on it. So we climb.' },
    m9lk1: { team: [['golbat', 43], ['lampent', 43], ['magneton', 43]], pay: 34, theme: 'icecave', look: 'keeper', name: 'Lightkeeper', before: 'Oh no. The Tidemark child. I\'m so sorry - you can\'t be here. Tonight of all nights!', lose: 'I\'m dreadfully sorry for the trouble.', after: 'Mr. Vale is lighting it tonight. Everything we ever lost... back. Won\'t that be wonderful?' },
    m9lk2: { team: [['honchkrow', 43], ['toxicroak', 44]], pay: 34, theme: 'icecave', look: 'keeperf', name: 'Lightkeeper', before: 'Please go back down. Please. I\'d hate for you to miss the lighting by being... detained.', lose: 'Detained. Me. How embarrassing.', after: 'The summit\'s through the upper caves. I didn\'t tell you that. Sorry.' },
    m9agent: { team: [['houndoom', 44], ['magneton', 44], ['doublade', 45]], pay: 44, theme: 'icecave', look: 'agent', name: 'Lumen Agent', before: 'You are remarkably persistent. The Company admires persistence. The Company also removes it.', lose: 'Noted. And forwarded to the Director.', after: 'Captain Isolde holds the ridge. She has never once let anyone past. She is not polite about it.' },
    m9lk3: { team: [['crobat', 44], ['houndoom', 44], ['lampent', 45]], pay: 34, theme: 'icecave', look: 'keeper', name: 'Lightkeeper', before: 'Last checkpoint before the ridge! I\'m afraid I have to do my job. Sorry in advance!', lose: 'Sorry in arrears, too.', after: 'Can you feel it humming? The whole mountain is humming.' },
    m9climber: { team: [['medicham', 44], ['crabominable', 44], ['glalie', 44]], pay: 24, theme: 'icecave', look: 'hiker', name: 'Mountaineer Edda', before: 'The summit\'s been fenced off for a year! I\'m getting up there tonight, Lumen or no Lumen. You too? Prove it!', lose: 'You first, then. I\'ll follow your footprints.', after: 'Something under this mountain is breathing. I can feel it through my boots.' }
  });

  // =====================================================================
  //  Frostcrown - the caves under the peak (two floors, ice and drifts)
  // =====================================================================
  {
    const B = grid(30, 30, 'C');
    B.fill(9, 23, 11, 29, 'c').fill(6, 25, 8, 26, 'c');  // the cave mouth from Frost Pass, and Wynd's shelter
    B.fill(3, 17, 21, 23, 'c').fill(12, 19, 16, 21, 'i'); // the lower hall and its frozen pool
    B.fill(3, 7, 6, 17, 'c').fill(1, 11, 2, 13, 'c');      // the west shaft (and a nook)
    B.fill(3, 2, 14, 7, 'c').fill(8, 3, 11, 5, 'n');       // the upper west hall, a snowdrift
    B.fill(14, 3, 17, 4, 'c');                          // the squeeze east
    B.fill(17, 1, 27, 6, 'c').put(25, 2, '<');            // the upper east hall and the way up
    B.fill(21, 19, 26, 22, 'c').fill(23, 6, 26, 19, 'c'); // the east passage and shaft
    B.fill(18, 9, 22, 13, 'c').fill(19, 10, 21, 12, 'n'); // a side grotto
    B.put(5, 20, 'r').put(18, 22, 'r').put(4, 4, 'r').put(26, 10, 'r').put(20, 2, 'r').fill(7, 18, 8, 18, 'r');
    def({ id: 'frostcrown1', name: 'Frostcrown Caves', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.3, chapter: 9,
      encounters: { cave: { rate: 0.09, min: 40, max: 43, table: [['golbat', 20], ['sneasel', 16], ['snorunt', 16], ['graveler', 14], ['onix', 10], ['noibat', 10], ['sealeo', 8], ['nacli', 6]] },
        snow: { rate: 0.1, min: 41, max: 43, table: [['snorunt', 30], ['spheal', 20], ['sneasel', 20], ['frigibax', 16], ['glalie', 8], ['froslass', 6]] } },
      edges: { s: { to: 'frostpass', dx: 0 } },
      warps: [{ x: 25, y: 2, to: 'frostcrown2', tx: 4, ty: 20, dir: 'up' }],
      signs: [{ x: 12, y: 24, text: 'LUMEN COMPANY - NO ENTRY\nGreat Lantern works. We are terribly sorry.' }],
      items: [{ x: 1, y: 12, item: 'ultra', n: 2 }, { x: 20, y: 11, item: 'revive', n: 1 }, { x: 13, y: 6, item: 'superpotion', n: 3 }, { x: 26, y: 21, item: 'fullheal', n: 2 },
        { x: 4, y: 22, item: 'rarecandy', n: 1, hidden: true }, { x: 10, y: 4, item: 'great', n: 3, hidden: true }, { x: 26, y: 1, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'wynd', x: 7, y: 25, dir: 'right', look: L.m8tamer, name: 'Tamer Wynd', talk: 'm9wynn' },
        { id: 'doran', x: 6, y: 13, dir: 'left', look: L.hiker, name: 'Hiker Doran', trainer: 'm9doran' },
        { id: 'rue', x: 16, y: 18, dir: 'down', look: L.c7skier, name: 'Climber Rue', trainer: 'm9rue' },
        { id: 'lk1', x: 23, y: 15, dir: 'right', look: L.keeper, name: 'Lightkeeper', trainer: 'm9lk1' },
        { id: 'lk2', x: 19, y: 5, dir: 'right', look: L.keeperf, name: 'Lightkeeper', trainer: 'm9lk2' }] });
  }
  {
    const B = grid(30, 24, 'C');
    B.fill(3, 18, 10, 22, 'c').put(4, 21, '>');            // the landing
    B.fill(10, 19, 20, 21, 'i');                          // the ice gallery
    B.fill(18, 12, 21, 21, 'c').fill(22, 14, 27, 16, 'c').fill(24, 16, 27, 20, 'c');
    B.fill(8, 10, 21, 13, 'c').fill(2, 9, 7, 12, 'c');       // the middle gallery, a nook to the west
    B.fill(8, 4, 11, 10, 'c').fill(8, 2, 22, 5, 'c');        // up the west chimney to the top gallery
    B.fill(13, 0, 15, 2, 'c');                            // daylight: the way out to the summit
    B.fill(22, 3, 27, 9, 'c').fill(24, 5, 26, 7, 'n');       // the hermit's grotto
    B.fill(12, 3, 13, 4, 'i').put(17, 11, 'r').put(5, 19, 'r').put(9, 3, 'r').put(20, 4, 'r');
    def({ id: 'frostcrown2', name: 'Frostcrown Caves - Upper', kind: 'cave', rows: B.rows(), music: 'forest', battle: 'icecave', dark: 0.22, chapter: 9,
      encounters: { cave: { rate: 0.09, min: 41, max: 44, table: [['golbat', 18], ['sneasel', 16], ['glalie', 12], ['froslass', 12], ['graveler', 12], ['noibat', 12], ['naclstack', 8], ['sealeo', 10]] },
        snow: { rate: 0.1, min: 42, max: 44, table: [['sealeo', 26], ['frigibax', 22], ['sneasel', 20], ['glalie', 16], ['arctibax', 8], ['weavile', 8]] } },
      edges: { n: { to: 'greatlantern', dx: 0 } },
      warps: [{ x: 4, y: 21, to: 'frostcrown1', tx: 25, ty: 3, dir: 'down' }],
      items: [{ x: 26, y: 20, item: 'tm:ice-beam', n: 1 }, { x: 2, y: 10, item: 'ultra', n: 2 }, { x: 9, y: 21, item: 'superpotion', n: 2 },
        { x: 27, y: 3, item: 'rarecandy', n: 1, hidden: true }, { x: 21, y: 2, item: 'revive', n: 1, hidden: true }],
      npcs: [{ id: 'ivo', x: 25, y: 4, dir: 'down', look: L.m9hermit, name: 'Hermit Ivo', talk: 'm9ivo' },
        { id: 'agent', x: 19, y: 15, dir: 'left', look: L.agent, name: 'Lumen Agent', trainer: 'm9agent' },
        { id: 'lk3', x: 10, y: 7, dir: 'right', look: L.keeper, name: 'Lightkeeper', trainer: 'm9lk3' },
        { id: 'edda', x: 4, y: 11, dir: 'right', look: L.hiker, name: 'Mountaineer Edda', trainer: 'm9climber' }] });
  }

  // =====================================================================
  //  The Great Lantern - the summit of Frostcrown. The Lumen Company's
  //  tower stands around the Lantern-folk's ancient lamp; one ridge leads
  //  up to it. (Inside the tower: Chapter 11, lantern1.)
  // =====================================================================
  {
    const B = grid(30, 26, 'n').border('r', { s: [13, 15] }, 1);
    B.fill(1, 16, 12, 22, 'r').fill(16, 16, 28, 22, 'r');   // the ridge: the only way up
    B.fill(13, 15, 15, 25, ',').put(13, 19, 'r').put(15, 19, 'r');
    B.fill(8, 11, 21, 14, 'h');                          // the Lumen plaza before the tower
    B.fill(2, 2, 7, 3, 'f').fill(22, 2, 27, 3, 'f').fill(3, 7, 6, 9, 'i').fill(23, 7, 27, 9, 'i');
    B.fill(1, 23, 12, 24, 'n').fill(16, 23, 28, 24, 'n').fill(1, 25, 12, 25, 'r').fill(16, 25, 28, 25, 'r');
    def({ id: 'greatlantern', name: 'The Great Lantern', kind: 'route', rows: B.rows(), music: 'route', battle: 'icecave', fly: { x: 14, y: 23 }, chapter: 9,
      edges: { s: { to: 'frostcrown2', dx: 0 } },
      buildings: [{ b: 'tower', x: 11, y: 3, to: 'lantern1', needs: ['ch11'], locked: 'm9lanternLocked' }],
      signs: [{ x: 12, y: 15, text: 'THE GREAT LANTERN\nA gift to Meridia from the Lumen Company.\n"Nothing will ever be lost again."' }, { x: 17, y: 23, text: 'SUMMIT OF FROSTCROWN\nHere the Lantern-folk lit the first light.' }],
      props: [{ k: 'lumenlamp', x: 8, y: 11 }, { k: 'lumenlamp', x: 21, y: 11 }, { k: 'lumenlamp', x: 8, y: 14 }, { k: 'lumenlamp', x: 21, y: 14 }, { k: 'shard', x: 4, y: 8 }, { k: 'shard', x: 25, y: 8 }],
      items: [{ x: 3, y: 5, item: 'revive', n: 2 }, { x: 26, y: 5, item: 'ultra', n: 2 }, { x: 2, y: 24, item: 'fullheal', n: 2 }, { x: 27, y: 13, item: 'rarecandy', n: 1, hidden: true }, { x: 27, y: 24, item: 'great', n: 3, hidden: true }],
      npcs: [{ id: 'isolde', x: 14, y: 19, dir: 'down', look: L.m9captain, name: 'Captain Isolde', talk: 'm9guard', watch: 'm9guard', sight: 3, show: ['!m9guard'] },
        { id: 'cassius', x: 14, y: 12, dir: 'down', look: L.cassius, name: 'Cassius', talk: 'm9lit', show: ['!longnight'] },
        { id: 'juno', x: 16, y: 12, dir: 'left', look: L.juno, name: 'Juno', talk: 'm9lit', show: ['!longnight'] },
        { id: 'engineer', x: 24, y: 12, dir: 'left', look: L.worker, name: 'Lumen Engineer', talk: 'm9engineer' }] });
  }

  // =====================================================================
  //  The story
  // =====================================================================
  const longNight = J => J.flag('longnight') && !J.flag('dawn');
  on('m9wynn', { sets: ['m9wynn'] }, async (J, n) => {
    if (longNight(J)) return J.say(['The day I passed my Tamer trial! Rhoswen clapped! RHOSWEN CLAPPED!', '...Why is the snow grey?'], n);
    if (J.flag('m9wynn')) return J.say('Up and up. The caves come out on the summit ridge. I\'ll hold the cave mouth - nobody follows you in.', n);
    await J.say(['You came! Rhoswen sent me to wait for you. Her Dragons "escorted" the Lumen guards off the pass. It was very loud.', 'These caves climb all the way up under the summit. It\'s cold enough to freeze a Charizard\'s tail in there.'], n);
    await J.say('Here - from the Crown Light\'s stores. Rhoswen says you\'ll need them more than her Dragons do.', n);
    await J.give('revive', 2);
    await J.give('fullheal', 2);
    J.set('m9wynn');
  });
  on('m9ivo', { needs: ['m8champ'], sets: ['m8ballC'] }, async (J, n) => {
    if (J.flag('m8ballC')) return J.say(longNight(J) ? 'Fish for breakfast! Same as every day, and I\'m glad of it. Glad, glad, glad.' : 'Go well, child. The mountain\'s angry tonight. Even the rocks are holding their breath.', n);
    if (!J.flag('m8champ')) return J.say(['Twenty years I\'ve lived up here, away from everybody. A Dragonite brings me fish. Every morning.', 'It isn\'t mine. It belongs to someone it can\'t find. We keep each other company.'], n);
    await J.say(['Bram? From Highwatch? ...Yes. Yes, that\'s the name on the old ball.', 'The Dragonite gave it to me last night, then curled up inside it and went to sleep. Like it knew someone was coming.'], n);
    await J.give('m8ballC');
    J.set('m8ballC');
    await J.say('Take it home to him. I\'ll miss my breakfast. Don\'t tell the Dragonite.', n);
  });
  on('m9guard', { needs: ['!m9guard'], sets: ['m9guard'] }, async J => {
    if (J.flag('m9guard')) return;
    await J.say(['Halt. You are the child from Tidemark. The one the light cannot touch.', 'I am Isolde, Captain of the Lantern Guard. Mr. Vale asked me to apologise to you. I will not.',
      'He is lighting it now. Nobody crosses this ridge until it is done.'], 'isolde');
    const r = await J.battle({ id: 'm9guard', name: 'Captain Isolde', look: 'm9captain', team: [['magnezone', 45], ['houndoom', 45], ['crobat', 46], ['doublade', 47]], pay: 90, theme: 'icecave',
      before: 'For the light!', lose: '...Go, then. You are already too late.', win: 'Turn back. That is not a request.' });
    if (r !== 'win') return;
    await J.say(['...It doesn\'t matter. Listen. Can you hear it? The mountain is singing.', 'You are already too late, child.'], 'isolde');
    await J.fade(() => J.hideNpc('isolde'));
    J.set('m9guard');
  });
  on('m9engineer', {}, (J, n) => J.say(longNight(J) ? ['It works! It WORKS! The happiest moment of my career, and it will never end!', '...Why aren\'t I happier?'] : ['The Lantern-folk built the crown of this lamp nine hundred years ago. We only built the tower around it.', 'The crown\'s a lock. Old as the mountain. Only a lighthouse key turns it. Mr. Vale says one is on its way up tonight.'], n));
  on('m9lanternLocked', {}, J => J.say(longNight(J) ? ['The tower\'s brass doors are shut fast. Far above, the Great Lantern pours its grey light over all of Meridia.', 'Somewhere inside, a man is keeping every day he ever loved.'] : 'The tower\'s brass doors are shut. Through the crack you can hear machinery breathing, slow and deep, like something asleep.'));

  // ---- the summit: Cassius lights the Great Lantern
  on('m9lit', { needs: ['m9guard'], sets: ['longnight', 'echo', 'ride.fly', 'ch10'] }, async J => {
    if (J.flag('longnight')) return;
    if (!J.flag('m9guard')) return J.say('Captain Isolde stands on the ridge. Nobody gets past her to the tower.');
    const sp = J.get('mystarter') || 'eevee';
    await J.say('The wind drops. On the brass plaza before the tower, two figures turn to face you.');
    await J.say(['Ah. The child from Tidemark. I hoped you would come. I\'d have hated for you to miss it.', 'Cassius Vale. We met in Brassport, I think - though you were one face in a very large crowd.'], 'cassius');
    await J.say('{NAME}. I told you not to follow me.', 'juno');
    await J.say(['Twenty years, I have built this tower. The Lantern-folk built the first lamp up here, to keep the Echo shut.', 'I built mine to open it. Gently. Like a door into a room where nothing ever leaves.',
      'Every day you ever loved - kept. Forever. No more goodbyes. Isn\'t that what all those paper lanterns were always for?'], 'cassius');
    await J.ask('What do you do?', ['Juno, don\'t give it to him!', 'Think about Teo - the real Teo!'], 'juno');
    await J.say(['...I am thinking about him. I never stop thinking about him.', 'I\'m sorry, {NAME}.'], 'juno');
    await J.say('Juno puts the Lighthouse Key in Cassius\'s open hand. He bows to her, very low, like a man thanking a queen.');
    await J.say(['Thank you, Miss Reyes. Your brother will never fade again. You have my word.', 'And my word, unlike most things in this world, does not get lost.'], 'cassius');
    await J.fade(async () => { await J.wait(900); });
    await J.say(['Cassius kneels at the foot of the tower and fits the key into an ancient stone lock.', 'It turns.', 'A sound like the whole world drawing in a breath.']);
    J.set('longnight'); J.set('echo'); J.refresh();
    await J.say(['Light pours from the summit. Not gold.', 'Grey.', 'Far below, one town after another goes still. The colour drains out of Meridia like water out of sand.',
      `${J.dname(sp)} presses against your legs, growling at the sky.`]);
    await J.say(['...You\'re still moving. Of course you are. Born on Lantern Night, under a lit lighthouse. The old blessing.', 'The light can\'t hold you. I\'m sorry. You\'ll be very lonely.',
      'Everyone else will be happy. Go and see. Then tell me I was wrong.'], 'cassius');
    await J.say('Go home, Miss Reyes. Your brother is waiting for you. He will always be waiting.', 'cassius');
    await J.fade(() => J.hideNpc('cassius'));
    await J.say('The brass doors close behind him with a sound like a coffin lid.');
    await J.face('juno', 'down');
    await J.say(['...It\'s done. It\'s done, right? Teo\'s okay now. He promised.', 'Don\'t look at me like that. Don\'t. You don\'t get to look at me like that.'], 'juno');
    await J.say(['Juno puts two fingers in her mouth and whistles. A steel-blue Corviknight drops out of the grey sky and lands beside her with a crunch of frost.']);
    await J.say(['This is Postmark. Mom\'s best courier. He flew me up here last night.', 'He goes anywhere in Meridia. Any roof, any town. Take him.',
      'I\'m going home. To Teo. The Lumen have a lift down the mountain. ...Postmark wouldn\'t carry me anyway. Not after tonight.'], 'juno');
    await J.fade(() => J.hideNpc('juno'));
    J.addMon('corviknight', 45, { met: 'the Great Lantern' });
    await J.say('Postmark the Corviknight joined your team!');
    J.set('ride.fly');
    await J.say(['Postmark ruffles his steel feathers and looks at you, waiting for an address.', 'You can now FLY to any town you have visited (MENU > FLY).']);
    await J.say('"Postmark - take us down. Highwatch!"');
    await J.chapter('Chapter 9 complete!', 'Next: Chapter 10 - Everyone\'s Best Day');
    J.set('ch10');
    const h = M.highwatch;
    if (h) await J.travel('highwatch', h.fly.x, h.fly.y, 'down');
    J.refresh();
    await J.say(['Highwatch. Grey roofs, grey snow, a grey sky with no sun in it.', 'Everyone is smiling.']);
    await J.chapter('Chapter 10', 'Everyone\'s Best Day');
  });

  for (const id of ['frostcrown1', 'frostcrown2', 'greatlantern']) M[id].chapter = 9;
  chapter({ n: 9, title: 'The Long Night', start: { map: 'frostcrown1', x: 10, y: 28, dir: 'up' }, level: 45, badge: null, center: 'm8center',
    goals: ['m9guard', 'longnight', 'echo', 'ride.fly', 'ch10'] });
})();
