'use strict';
// =====================================================================
//  JSTORY - Journey's story: the items, the trainers, the starters, and
//  what everyone says and does. Each talk / event is an async script on
//  the J api (journey.js): J.say, J.ask, J.give, J.battle, J.walk, J.set...
//  Each event lists the flags it needs and the flags it sets, so the
//  story checker (tools/test-journey.mjs) can prove the story always
//  moves on.
// =====================================================================
const JStory = (() => {
  // ---- items: pocket, price (0 = not sold), what it does
  const ITEMS = {
    poke: { name: 'Poké Ball', pocket: 'balls', price: 200, ball: 1, col: '#e83838', desc: 'A device for catching wild Pokémon.' },
    great: { name: 'Great Ball', pocket: 'balls', price: 600, ball: 1.5, col: '#3c78d0', band: '#e83838', desc: 'A good ball with a higher catch rate.' },
    ultra: { name: 'Ultra Ball', pocket: 'balls', price: 1200, ball: 2, col: '#2a2a34', band: '#f0d048', desc: 'A high-performance ball.' },
    master: { name: 'Master Ball', pocket: 'balls', price: 0, ball: 255, col: '#8a3ac8', desc: 'Catches any wild Pokémon without fail.' },
    potion: { name: 'Potion', pocket: 'medicine', price: 300, heal: 20, desc: 'Restores 20 HP.' },
    superpotion: { name: 'Super Potion', pocket: 'medicine', price: 700, heal: 60, desc: 'Restores 60 HP.' },
    oran: { name: 'Oran Berry', pocket: 'medicine', price: 0, heal: 10, desc: 'A berry that restores 10 HP.' },
    antidote: { name: 'Antidote', pocket: 'medicine', price: 100, cure: ['psn', 'tox'], desc: 'Cures poison.' },
    parlyzheal: { name: 'Paralyze Heal', pocket: 'medicine', price: 200, cure: ['par'], desc: 'Cures paralysis.' },
    awakening: { name: 'Awakening', pocket: 'medicine', price: 250, cure: ['slp'], desc: 'Wakes a sleeping Pokémon.' },
    burnheal: { name: 'Burn Heal', pocket: 'medicine', price: 250, cure: ['brn'], desc: 'Heals a burn.' },
    iceheal: { name: 'Ice Heal', pocket: 'medicine', price: 250, cure: ['frz'], desc: 'Thaws a frozen Pokémon.' },
    fullheal: { name: 'Full Heal', pocket: 'medicine', price: 400, cure: ['psn', 'tox', 'par', 'slp', 'brn', 'frz'], desc: 'Cures any status problem.' },
    revive: { name: 'Revive', pocket: 'medicine', price: 1500, revive: 0.5, desc: 'Revives a fainted Pokémon with half its HP.' },
    rarecandy: { name: 'Rare Candy', pocket: 'medicine', price: 0, candy: 1, desc: 'Raises a Pokémon\'s level by 1.' },
    repel: { name: 'Repel', pocket: 'items', price: 350, repel: 100, desc: 'Keeps weak wild Pokémon away for 100 steps.' },
    linkstone: { name: 'Link Stone', pocket: 'items', price: 0, evo: 'Link Stone', desc: 'Makes Pokémon that evolve by trading evolve.' },
    firestone: { name: 'Fire Stone', pocket: 'items', price: 2100, evo: 'Fire Stone', desc: 'Makes certain Pokémon evolve.' },
    waterstone: { name: 'Water Stone', pocket: 'items', price: 2100, evo: 'Water Stone', desc: 'Makes certain Pokémon evolve.' },
    thunderstone: { name: 'Thunder Stone', pocket: 'items', price: 2100, evo: 'Thunder Stone', desc: 'Makes certain Pokémon evolve.' },
    leafstone: { name: 'Leaf Stone', pocket: 'items', price: 2100, evo: 'Leaf Stone', desc: 'Makes certain Pokémon evolve.' },
    moonstone: { name: 'Moon Stone', pocket: 'items', price: 0, evo: 'Moon Stone', desc: 'Makes certain Pokémon evolve.' },
    shard: { name: 'Meteor Shard', pocket: 'key', price: 0, desc: 'A glowing purple fragment of the old meteor. Astronomer Orrin collects them.' },
    ridepager: { name: 'Ride Pager', pocket: 'key', price: 0, desc: 'Calls Ride Pokémon. Scyther: Cut (face a small tree and press A).' },
    pokedex: { name: 'Pokédex', pocket: 'key', price: 0, desc: 'Records the Pokémon you see and catch. Open it from the menu.' },
    shoes: { name: 'Running Shoes', pocket: 'key', price: 0, desc: 'Hold Shift (or B) to run.' },
    'tm:magical-leaf': { name: 'TM Magical Leaf', pocket: 'tms', price: 0, tm: 'magical-leaf', desc: 'Teaches Magical Leaf: a Grass move that never misses.' }
  };
  const BADGES = [
    { id: 'leaf', name: 'Leaf Badge', leader: 'Luna', col: '#3c9a58' }, { id: 'tide', name: 'Tide Badge', leader: 'Rex', col: '#3c78d0' },
    { id: 'spark', name: 'Spark Badge', leader: 'Mila', col: '#e0b030' }, { id: 'ember', name: 'Ember Badge', leader: 'Taro', col: '#d85030' },
    { id: 'mind', name: 'Mind Badge', leader: 'Ezra', col: '#c058c8' }, { id: 'iron', name: 'Iron Badge', leader: 'Nova', col: '#8a9aa8' },
    { id: 'glacier', name: 'Glacier Badge', leader: 'Ivy', col: '#7ad0f0' }];
  const STARTERS = [['Kanto', ['bulbasaur', 'charmander', 'squirtle']], ['Johto', ['chikorita', 'cyndaquil', 'totodile']], ['Hoenn', ['treecko', 'torchic', 'mudkip']],
    ['Sinnoh', ['turtwig', 'chimchar', 'piplup']], ['Unova', ['snivy', 'tepig', 'oshawott']], ['Kalos', ['chespin', 'fennekin', 'froakie']],
    ['Alola', ['rowlet', 'litten', 'popplio']], ['Galar', ['grookey', 'scorbunny', 'sobble']], ['Paldea', ['sprigatito', 'fuecoco', 'quaxly']]];

  // ---- trainers: team [species, level], pay = prize per level of the last one, lines
  const TRAINERS = {
    r1tim: { team: [['pidgey', 3], ['starly', 4]], pay: 16, theme: 'forest', before: 'Hey! You just got your first Pokémon, right? My shorts say I\'m ready! Battle!', lose: 'My shorts... they failed me.', after: 'I\'m gonna train in the grass until my Pidgey is huge!' },
    r1mia: { team: [['caterpie', 4], ['weedle', 4]], pay: 16, theme: 'forest', before: 'Oh! A new trainer! Let\'s see whose Pokémon are cuter!', lose: 'Okay, okay... yours are cute too.', after: 'Bug Pokémon grow up fast. Caterpie becomes a Butterfree in no time!' },
    wwRick: { team: [['weedle', 6], ['kakuna', 7]], pay: 12, theme: 'forest', before: 'Shh! You\'ll scare the bugs! ...Fine, you\'ll scare MY bugs! Battle!', lose: 'My net... has a hole in it.', after: 'There are people in black clothes deeper in the forest. They don\'t look like bug catchers.' },
    wwLily: { team: [['caterpie', 6], ['metapod', 7], ['venipede', 7]], pay: 12, theme: 'forest', before: 'This path is my bug-hunting ground! Pay the toll - in battle!', lose: 'Bzzt... you win.', after: 'Luna, the gym leader, ran north toward the old tree. She looked worried.' },
    grunt1: { team: [['zubat', 7], ['meowth', 8]], pay: 40, theme: 'forest', before: 'Kid stuff! Team Eclipse doesn\'t lose to rookies!', lose: 'What?! The Director will hear about this...', look: 'grunt', name: 'Eclipse Grunt' },
    grunt2: { team: [['venipede', 8], ['sandile', 9]], pay: 40, theme: 'forest', before: 'You beat my partner? Then I\'ll crush you myself!', lose: 'No way... retreat! RETREAT!', look: 'grunt', name: 'Eclipse Grunt' },
    g1fern: { team: [['oddish', 9], ['bellsprout', 10]], pay: 24, theme: 'stadium', before: 'Smell the flowers... they\'re the last thing you\'ll notice before you lose!', lose: 'My bouquet... wilted.', after: 'Luna\'s Pokémon can heal themselves by draining HP. End it fast!' },
    g1ivo: { team: [['shroomish', 11]], pay: 20, theme: 'stadium', before: 'You found your way through the vines? Not past me!', lose: 'Ugh, the vines were my only trick.', after: 'Fire, Flying, Bug, Poison and Ice moves hit Grass types hard.' },
    g1tess: { team: [['bellsprout', 10], ['oddish', 11]], pay: 24, theme: 'stadium', before: 'One more step and you\'re in Luna\'s garden. Prove you belong!', lose: 'Bloom where you\'re planted... I guess I\'m planted here.', after: 'Go on. She\'s been looking forward to this.' },
    luna: { team: [['shroomish', 12], ['bellsprout', 12], ['grovyle', 14]], pay: 100, theme: 'stadium', gym: 0, onWin: 'lunaWin', before: 'You saved my ancient tree, so I owe you a real battle - no holding back! Let\'s see if your bond with your Pokémon can bloom!', lose: 'Beautiful... you and your Pokémon grow together like roots and leaves.', after: 'Route 2 opens once the rocks are cleared. Port Coralis and Rex are waiting beyond!' }
  };

  // ---- talks and events: (J, npc) => ...; meta lists the flags each one needs and sets (the checker reads it)
  const T = {};
  const META = {};
  const on = (id, meta, fn) => { T[id] = fn; META[id] = meta; };

  on('intro', { sets: ['intro'] }, async J => {
    await J.say(['Long ago, a meteor shattered over the Valoria region.', 'Its glowing fragments became the Mega Stones and Key Stones... stones that answer when a Pokémon and its trainer share a deep bond.', 'Today, in the little town of Willowbrook, a new journey begins.']);
    await J.say('{NAME}! Are you up? Professor Hazel called - she\'s waiting for you at her lab!', { name: 'Mom (downstairs)', look: 'mom' });
    J.set('intro');
  });
  on('mom', { sets: ['shoes'] }, async (J, n) => {
    if (!J.flag('shoes')) {
      await J.say('Today\'s the big day! Professor Hazel\'s lab is south of the square, past the pond.', n);
      await J.say('Oh, and take these. Your father wore them on his own journey.', n);
      await J.give('shoes');
      await J.say('Running Shoes! Hold Shift - or the B button - to run.', n);
      J.set('shoes'); return;
    }
    if (!J.flag('starter')) return J.say('Go on! The Professor is waiting. The lab is the big white building.', n);
    const gifts = J.get('momGifts') || 0;
    if (J.badges() > gifts) { await J.say('A badge! I\'m so proud of you! Here, I picked these up for you.', n); await J.give('poke', 5); await J.give('potion', 3); J.set('momGifts', gifts + 1); }
    await J.say('You look tired. Rest a while, sweetie.', n);
    await J.heal(true);
    await J.say('Your Pokémon look full of energy! Take care out there.', n);
  });
  on('tv', {}, J => J.say(J.pick(['It\'s a quiz show. "Which Pokémon evolves with a Moon Stone?" ...The audience is stumped.', 'A movie: a boy and his Pikachu walk toward the sunset. You feel ready for adventure.', 'Weather report: sunny all over Valoria, with a chance of wild Pidgey.', 'A news flash: "Strange people in black seen near Whisperwood Forest..."'])));
  on('myPc', {}, J => J.say('It\'s your PC. There\'s an email from Mom: "Don\'t forget to change your underwear every day!" ...Moving on.'));
  on('labPc', {}, J => J.say('The screen is full of notes about Mega Evolution: "Bond resonance... meteor fragments... the Skyspire?"'));
  on('ballstand', {}, J => J.say(J.flag('starter') ? 'The table is empty. Three new trainers set out from here today.' : 'Three Poké Balls rest on the table. Talk to the Professor first!'));
  on('needStarter', { needs: ['!starter'] }, async J => {
    await J.say('Wait!! Don\'t go out there!', { name: '???' });
    await J.say('Wild Pokémon live in the tall grass. Without a Pokémon of your own it\'s dangerous! Get one from Professor Hazel first.', { name: 'A voice' });
    await J.playerWalk('down', 1);
  });
  on('soraHome', {}, (J, n) => J.say('Yo, {NAME}! Today\'s the day! The Professor promised us our first Pokémon! Last one to the lab is a Slowpoke!', n));
  on('soraMom', {}, (J, n) => J.say(J.flag('rival1') ? 'Sora ran out so fast this morning. You two have always pushed each other - look after each other out there!' : 'Sora\'s been up since dawn, bouncing off the walls. Something about a Pokémon?', n));
  on('soraLab', {}, (J, n) => J.say('Took you long enough, {NAME}! Go on, talk to the Professor - I\'m dying here!', n));
  on('aide', {}, (J, n) => J.say(J.flag('dex') ? J.pick(['Weaken a wild Pokémon first - the lower its HP, the easier it is to catch!', 'Sleeping or frozen Pokémon are the easiest to catch. Paralyzed, poisoned or burned ones help a bit too.', 'Your Pokémon learn new moves as they level up. Keep an eye on them!']) : 'The Professor has been waiting all morning. She\'s got three Pokémon ready!', n));
  on('hazel', { sets: ['starter', 'rival1', 'dex'] }, async (J, n) => {
    if (J.flag('dex')) {
      if (!J.badges()) return J.say('Head north on Route 1 to Verdant Town. Luna, the gym leader there, is a fine first challenge!', n);
      return J.say('A badge already! And your Pokémon trust you - I can see it. That trust is the seed of Mega Evolution, you know.', n);
    }
    await J.say(['Ah, {NAME}! There you are. Welcome to my lab!', 'I study the bond between people and Pokémon - and the Mega Evolution it can awaken.', 'But every great bond starts with a first partner. On the table are three Pokémon.', 'I\'ve got trios from every region, so take your time. Choose the one that speaks to you!'], n);
    const sp = await J.pickStarter();
    J.addMon(sp, 5, { met: 'Willowbrook Town' });
    J.set('starter');
    await J.say(`${J.dname(sp)}! A wonderful choice. Treat it well and it will never let you down.`, n);
    const rivalSp = J.rivalStarter(sp);
    J.set('rivalStarter', rivalSp);
    await J.walk('sora', ['left', 2]);
    await J.say(`Then I'll take this one! ${J.dname(rivalSp)}, you and me - we're going to the top!`, 'sora');
    await J.say('Hey {NAME}! The Professor says Pokémon grow stronger by battling. So... let\'s battle! Right here, right now!', 'sora');
    await J.battle({ id: 'rival1', name: 'Sora', look: 'sora', team: [[rivalSp, 5]], pay: 30, theme: 'stadium', canLose: true, before: 'Here I come!', lose: 'Wha--?! Our first battle and I lost?', win: 'Yes! I won! Did you see that?!' });
    await J.say(J.lastWin() ? 'Okay, okay, you got me this time. But I\'m gonna train like crazy. Smell ya later!' : 'Heh! Don\'t feel bad - your Pokémon will get stronger too. See ya!', 'sora');
    J.set('rival1');
    await J.fade(() => J.refresh());
    await J.heal(false);
    await J.say(['Goodness, what a battle! Let me heal your Pokémon.', 'Now then - take this Pokédex. It records every Pokémon you see and catch.'], n);
    await J.give('pokedex');
    J.set('dex');
    await J.give('poke', 5);
    await J.say(['Valoria has seven Pokémon Gyms. Collect all seven badges and you may challenge the Pokémon League - and its Champion.', 'Head north on Route 1 to Verdant Town. And {NAME}... the world is wide. Enjoy every step of it!'], n);
  });
  on('granny', { sets: ['granny'] }, async (J, n) => {
    if (J.flag('granny')) return J.say('When I was young, I traveled all of Valoria with my Clefairy. Every route has its own little secrets, dear.', n);
    await J.say('Going on a journey? Oh, how exciting! Take this - every trainer needs one.', n);
    await J.give('potion', 2); J.set('granny');
  });
  on('wbGirl', {}, (J, n) => J.say(J.flag('starter') ? 'You got a Pokémon! Lucky! Mine is just my imagination...' : 'Professor Hazel gives trainers their first Pokémon. I want one too!', n));
  on('wbFisher', {}, (J, n) => J.say('No fish in this pond today. Maybe one day I\'ll get a real Fishing Rod...', n));
  on('oldman', { sets: ['oldman'] }, async (J, n) => {
    if (J.flag('oldman')) return J.say('Remember: weaken it, but don\'t knock it out! Then - BALL!', n);
    await J.say(['Hm? A new trainer! Let this old man teach you the secret of catching Pokémon.', 'When a wild Pokémon jumps out of the grass, battle it until its HP is low - yellow or red.', 'Then press BALL and throw! The more it shakes, the closer you are.', 'A sleeping or paralyzed Pokémon is even easier to catch. Here, practice with these!'], n);
    await J.give('poke', 3); J.set('oldman');
  });
  on('soraRoute1', { needs: ['rival1', '!soraR1'], sets: ['soraR1'] }, async J => {
    J.showNpc('sora');
    await J.say('{NAME}! Caught anything yet? I already caught two! Verdant Town is just ahead - and it has a GYM! I\'m going to win my first badge before you!', 'sora');
    await J.walk('sora', ['up', 6]);
    J.set('soraR1'); J.refresh();
  });
  on('worker', {}, (J, n) => J.say('Sorry, kid! A rockslide buried Route 2. We\'re digging it out - it\'ll take a while. (Route 2 and Port Coralis open in Chapter 2!)', n));
  on('gymGuide', {}, (J, n) => J.say(J.flag('badge.leaf') ? 'You beat Luna! The Leaf Badge is yours. Champion material, I tell you!' : J.flag('luna_back') ? 'Luna is back and ready! She uses Grass types: Fire, Flying, Bug, Poison and Ice moves are super effective!' : 'The gym leader Luna isn\'t here... She ran off to Whisperwood Forest when she heard about strangers digging by the ancient tree.', n));
  on('gymLocked', {}, J => J.say('The door is locked. A note is taped to it: "Gone to Whisperwood Forest. Back soon! - Luna"'));
  on('vBoy', {}, (J, n) => J.say('Luna\'s Pokémon smell like flowers. Even when they\'re beating you!', n));
  on('vLady', {}, (J, n) => J.say('The Pokémon Center heals your Pokémon for free. The Poké Mart sells Poké Balls and Potions!', n));
  on('nico', { sets: ['nico'] }, async (J, n) => {
    if (J.flag('nico')) return J.say('Have you used the Link Stone yet? Dad says some Pokémon only evolve when they\'re traded... or with that stone!', n);
    await J.say('My dad dug up this shiny stone near the old meteor crater... I don\'t need it. You can have it!', n);
    await J.give('linkstone'); J.set('nico');
    await J.say('Dad says it makes Pokémon that evolve by trading evolve right away. Cool, right?', n);
  });
  on('nicoDad', {}, (J, n) => J.say('They say the meteor that fell on Valoria broke into shards. Most are lost, but now and then one turns up glowing in the dirt.', n));
  on('telescope', {}, J => J.say('You look through the telescope. A faint purple star glimmers in the north... Orrin says that is where the meteor came from.'));
  on('orrin', { sets: ['shardQuest'] }, async (J, n) => {
    if (!J.flag('shardQuest')) {
      await J.say(['Ah, a young trainer. Have you heard of the Valoria meteor?', 'When it shattered, twelve shards were scattered across the region. They hum with the same energy as Mega Stones.', 'I\'ve spent my life looking for them. If you ever find a glowing purple shard, bring it to me - I\'ll make it worth your while!'], n);
      J.set('shardQuest'); return;
    }
    const have = J.has('shard');
    if (have > 0) {
      const done = (J.get('shardsGiven') || 0) + have;
      J.take('shard', have); J.set('shardsGiven', done);
      await J.say(`A Meteor Shard! And it\'s humming... Splendid! That makes ${done} of 12.`, n);
      await J.give('rarecandy', have); J.money(1000 * have);
      await J.say(done >= 12 ? 'All twelve! The sky over the Skyspire will remember this...' : 'Keep your eyes open. Some say a shard rests in every corner of Valoria.', n);
      return;
    }
    await J.say(`${J.get('shardsGiven') || 0} of 12 shards found so far. They glow purple - you can\'t miss them.`, n);
  });
  on('nurse', {}, async (J, n) => {
    await J.say('Welcome to the Pokémon Center! Shall I restore your Pokémon to full health?', n);
    const a = await J.ask('Heal your Pokémon?', ['Yes, please', 'No, thanks'], n);
    if (a !== 0) return J.say('We hope to see you again!', n);
    await J.healCenter();
    await J.say('Your Pokémon are fighting fit! We hope to see you again!', n);
  });
  on('clerk', {}, async (J, n) => { await J.say('Welcome! How may I help you?', n); await J.shop(); });
  on('boxPc', {}, J => J.pc());
  on('gymStatue', {}, J => J.say(J.flag('badge.leaf') ? 'VERDANT POKéMON GYM - LEADER: LUNA\nWinning trainers: {NAME}' : 'VERDANT POKéMON GYM - LEADER: LUNA\nWinning trainers: SORA... the ink is still wet!'));
  on('cutTree', {}, async (J, ctx) => {
    if (!J.has('ridepager')) return J.say('This small tree looks like it could be cut down...');
    const a = await J.ask('This tree looks like it can be cut down! Call Scyther with the Ride Pager?', ['Yes', 'No']);
    if (a !== 0) return;
    await J.cut(ctx);
  });
  // ---- Whisperwood: Team Eclipse at the ancient tree
  on('eclipseForest', { needs: ['!luna_back'], sets: ['luna_back', 'shard1'], battles: ['grunt1', 'grunt2'] }, async J => {
    await J.say('Hand over the shard buried under this tree, lady! Team Eclipse needs every last fragment!', 'grunt1');
    await J.say('This tree has stood for a thousand years. You\'ll dig it up over my wilted petals! ...But my team is exhausted.', 'luna');
    await J.face('luna', 'down'); await J.face('grunt1', 'down'); await J.face('grunt2', 'down');
    await J.emote('grunt1', '!');
    await J.say('Who\'s this? A kid? Get lost - this is Team Eclipse business!', 'grunt1');
    if (await J.battle('grunt1') !== 'win') return;
    await J.say('You\'re next, kid!', 'grunt2');
    if (await J.battle('grunt2') !== 'win') return;
    await J.say('Tch! Director Vex won\'t be happy. Team Eclipse, fall back!', 'grunt2');
    await J.fade(() => { J.set('gruntsFled'); J.hideNpc('grunt1'); J.hideNpc('grunt2'); });
    await J.say(['Thank you! You fought like a true trainer.', 'Look - the roots are glowing. That\'s what they were after...'], 'luna');
    await J.give('shard');
    await J.say(['A Meteor Shard. Astronomer Orrin in Verdant collects these - he\'ll know what it means.', 'I\'m Luna, the Verdant gym leader. Come and challenge me - I\'ll be waiting!'], 'luna');
    await J.fade(() => { J.set('shard1'); J.set('luna_back'); J.refresh(); });
  });
  // ---- after Luna: the Leaf Badge
  on('lunaWin', { sets: ['badge.leaf', 'ride.cut'] }, async J => {
    await J.say('You win! Take this - the Leaf Badge. Proof you beat me!', 'luna');
    J.badge('leaf');
    await J.give('tm:magical-leaf');
    await J.say(['And this: the Ride Pager. I\'ve registered my old friend Scyther. Call it to cut down small trees that block your way.', 'There\'s one in the south-west corner of town - I hear something nice is hidden behind it.'], 'luna');
    await J.give('ridepager'); J.set('ride.cut');
    await J.say('The rockslide on Route 2 should be cleared soon. When it is, Port Coralis and its leader Rex are waiting. Grow strong, {NAME}!', 'luna');
    await J.chapter('Chapter 1 complete!', 'Next: Chapter 2 - Port Coralis (coming soon)');
  });

  return { ITEMS, BADGES, STARTERS, TRAINERS, T, META };
})();
