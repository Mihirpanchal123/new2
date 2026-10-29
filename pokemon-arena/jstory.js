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
    'tm:magical-leaf': { name: 'TM Magical Leaf', pocket: 'tms', price: 0, tm: 'magical-leaf', desc: 'Teaches Magical Leaf: a Grass move that never misses.' },
    // Chapter 2
    'tm:rock-tomb': { name: 'TM Rock Tomb', pocket: 'tms', price: 0, tm: 'rock-tomb', desc: 'Teaches Rock Tomb: hurls boulders and lowers the target\'s Speed.' },
    'tm:water-pulse': { name: 'TM Water Pulse', pocket: 'tms', price: 0, tm: 'water-pulse', desc: 'Teaches Water Pulse: a pulsing blast of water that may confuse.' },
    meteorite: { name: 'Coral Meteorite', pocket: 'key', price: 0, desc: 'The Maritime Museum\'s star exhibit, taken back from Team Eclipse. Return it to Curator Wells.' },
    expshare: { name: 'Exp. Share', pocket: 'key', price: 0, desc: 'Pokémon that did not fight still get half the Exp. Points from a battle.' }
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
    wwRick: { team: [['weedle', 6], ['kakuna', 7]], pay: 12, theme: 'forest', before: 'Shh! You\'ll scare the bugs! ...Fine, you\'ll scare MY bugs! Battle!', lose: 'My net... has a hole in it.', after: 'There are people in purple clothes deeper in the forest. They don\'t look like bug catchers.' },
    wwLily: { team: [['caterpie', 6], ['metapod', 7], ['venipede', 7]], pay: 12, theme: 'forest', before: 'This path is my bug-hunting ground! Pay the toll - in battle!', lose: 'Bzzt... you win.', after: 'Luna, the gym leader, ran north toward the old tree. She looked worried.' },
    grunt1: { team: [['zubat', 7], ['meowth', 8]], pay: 40, theme: 'forest', before: 'Kid stuff! Team Eclipse doesn\'t lose to rookies!', lose: 'What?! The Director will hear about this...', look: 'grunt', name: 'Eclipse Grunt' },
    grunt2: { team: [['scraggy', 8], ['sandile', 9]], pay: 40, theme: 'forest', before: 'You beat my partner? Then I\'ll crush you myself!', lose: 'No way... retreat! RETREAT!', look: 'grunt', name: 'Eclipse Grunt' },
    g1fern: { team: [['oddish', 9], ['bellsprout', 10]], pay: 24, theme: 'stadium', before: 'Smell the flowers... they\'re the last thing you\'ll notice before you lose!', lose: 'My bouquet... wilted.', after: 'Luna\'s Pokémon can heal themselves by draining HP. End it fast!' },
    g1ivo: { team: [['shroomish', 11]], pay: 20, theme: 'stadium', before: 'You found your way through the vines? Not past me!', lose: 'Ugh, the vines were my only trick.', after: 'Fire, Flying, Bug, Poison and Ice moves hit Grass types hard.' },
    g1tess: { team: [['bellsprout', 10], ['oddish', 11]], pay: 24, theme: 'stadium', before: 'One more step and you\'re in Luna\'s garden. Prove you belong!', lose: 'Bloom where you\'re planted... I guess I\'m planted here.', after: 'Go on. She\'s been looking forward to this.' },
    luna: { team: [['shroomish', 12], ['bellsprout', 12], ['grovyle', 14]], pay: 100, theme: 'stadium', gym: 0, onWin: 'lunaWin', before: 'You saved my ancient tree, so I owe you a real battle - no holding back! Let\'s see if your bond with your Pokémon can bloom!', lose: 'Beautiful... you and your Pokémon grow together like roots and leaves.', after: 'Route 2 is open again - east of town. Port Coralis and Rex are waiting beyond!' },
    // ---- Chapter 2: Route 2
    r2dale: { team: [['geodude', 11], ['onix', 12]], pay: 20, theme: 'forest', before: 'The mountain came down, so I came down with it! Let\'s rumble!', lose: 'Crushed like gravel...', after: 'When the rocks slid, something purple and shiny rolled out up north-east. Didn\'t fancy carrying it.' },
    r2joy: { team: [['mareep', 11], ['buneary', 12]], pay: 18, theme: 'forest', before: 'A picnic is no fun without a battle for dessert!', lose: 'My sandwiches... are all yours, I guess.', after: 'Mareep\'s wool is so fluffy. It crackles when it rains!' },
    r2gil: { team: [['magikarp', 9], ['magikarp', 10], ['horsea', 13]], pay: 16, theme: 'beach', before: 'You scared off my bite! You\'ll have to pay for that - in battle!', lose: 'The one that got away... was me.', after: 'Magikarp looks useless, but give it time. Patience is a fisherman\'s best friend.' },
    r2ren: { team: [['shinx', 12], ['rockruff', 12]], pay: 18, theme: 'forest', before: 'I\'ve camped out here three nights waiting for a real trainer. Finally!', lose: 'Guess I\'ll pitch my tent somewhere else.', after: 'Port Coralis is just east. Try the seafood - and the gym, if you\'re brave.' },
    // ---- Seacliff Cave: Team Eclipse
    grunt3: { team: [['zubat', 13], ['sandile', 14]], pay: 40, theme: 'volcano', before: 'Team Eclipse is busy in here. Scram, kid - or get scrammed!', lose: 'I got... scrammed.', after: 'Admin Kael is up ahead. You don\'t stand a chance against an Admin!', look: 'grunt', name: 'Eclipse Grunt' },
    grunt4: { team: [['croagunk', 14], ['murkrow', 15]], pay: 40, theme: 'volcano', before: 'You beat the lookout? Then you\'ll have to go through me!', lose: 'Ugh. Kael is going to make me scrub the hideout.', after: 'The meteorite hums when you hold it. Creepy, right?', look: 'grunt', name: 'Eclipse Grunt' },
    kael: { team: [['murkrow', 16], ['croagunk', 17], ['sableye', 18]], pay: 60, theme: 'volcano', name: 'Admin Kael', look: 'admin', before: 'The kid from Whisperwood. Director Vex warned me about you.', lose: 'Tch. Fine - keep your rock. We have plenty of other leads.' },
    // ---- Coralis Gym
    g2nia: { team: [['tentacool', 16], ['wingull', 17]], pay: 24, theme: 'beach', before: 'Splash! I swim these channels every morning. Can you keep up?', lose: 'I\'m all washed up...', after: 'Rex\'s Pokémon are tough. Grass and Electric moves will help!' },
    g2otto: { team: [['psyduck', 16], ['poliwag', 17]], pay: 24, theme: 'beach', before: 'Reeling in challengers is my specialty. Hooked you!', lose: 'Snapped my line...', after: 'Quagsire doesn\'t mind Electric moves. It\'s part Ground, see?' },
    g2kai: { team: [['horsea', 17], ['staryu', 18]], pay: 24, theme: 'beach', before: 'Last stop before the captain. Show me your sea legs!', lose: 'Man overboard! That\'s me.', after: 'Go on, Rex is waiting. He loves a challenger who doesn\'t give up.' },
    rex: { team: [['carvanha', 20], ['quagsire', 20], ['poliwhirl', 22]], pay: 100, theme: 'beach', gym: 1, onWin: 'rexWin', before: 'You brought the meteorite home - I owe you one. But in here, I don\'t go easy on anyone. Hoist the sails!', lose: 'Ha! You rode that wave like a true captain.', after: 'The ferry to Voltara City will sail again soon. Mila and her Spark Badge are waiting on the other side!' }
  };

  // ---- talks and events: (J, npc) => ...; meta lists the flags each one needs and sets (the checker reads it)
  const T = {};
  const META = {};
  const on = (id, meta, fn) => { T[id] = fn; META[id] = meta; };

  on('intro', { sets: ['intro'] }, async J => {
    if (!J.flag('film')) await J.say(['Long ago, a meteor shattered over the Valoria region.', 'Its glowing fragments became the Mega Stones and Key Stones... stones that answer when a Pokémon and its trainer share a deep bond.']);   // the opening film told it already
    await J.say('Today, in the little town of Willowbrook, a new journey begins.');
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
  on('tv', {}, J => J.say(J.pick(['It\'s a quiz show. "Which Pokémon evolves with a Moon Stone?" ...The audience is stumped.', 'A movie: a boy and his Pikachu walk toward the sunset. You feel ready for adventure.', 'Weather report: sunny in the south, snow in the far north, and a chance of wild Pidgey.', J.flag('luna_back') ? 'A news flash: "Team Eclipse sightings reported across Valoria. Trainers are urged to be careful..."' : 'A news flash: "Strange people in purple seen near Whisperwood Forest..."'])));
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
      if (J.flag('champion')) return J.say('The Champion of Valoria, standing in my lab! I always knew that first morning was the start of something.', n);
      if (J.badges() > 1) return J.say(`${J.badges()} badges! And your Pokémon trust you more every time I see you. That trust is the seed of Mega Evolution, you know.`, n);
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
  on('worker', {}, (J, n) => J.say('Sorry, kid! A rockslide buried Route 2. We\'re digging it out - give us till you\'ve earned your first badge, and the way to Port Coralis will be clear!', n));
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
      await J.say(`${have > 1 ? have + ' Meteor Shards' : 'A Meteor Shard'}! And ${have > 1 ? 'they\'re' : 'it\'s'} humming... Splendid! That makes ${done} of 12.`, n);
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
  on('gymStatue', {}, J => J.say(J.flag('badge.leaf') ? 'VERDANT POKéMON GYM - LEADER: LUNA\nWinning trainers: SORA, {NAME}' : 'VERDANT POKéMON GYM - LEADER: LUNA\nWinning trainers: SORA... the ink is still wet!'));
  on('cutTree', {}, async (J, ctx) => {
    if (!J.has('ridepager')) return J.say('This small tree looks like it could be cut down...');
    const a = await J.ask('This tree looks like it can be cut down! Call Scyther with the Ride Pager?', ['Yes', 'No']);
    if (a !== 0) return;
    await J.cut(ctx);
  });
  // ---- Whisperwood: Team Eclipse at the ancient tree
  // (the first grunt stays beaten: lose to the second and only the second is waiting when you come back)
  on('eclipseForest', { needs: ['!luna_back'], sets: ['luna_back', 'shard1', 'treeGrunt1'], battles: ['grunt1', 'grunt2'] }, async J => {
    if (!J.flag('treeGrunt1')) {
      await J.say('Hand over the shard buried under this tree, lady! Team Eclipse needs every last fragment!', 'grunt1');
      await J.say('This tree has stood for a thousand years. You\'ll dig it up over my wilted petals! ...But my team is exhausted.', 'luna');
      await J.face('luna', 'down'); await J.face('grunt1', 'down'); await J.face('grunt2', 'down');
      await J.emote('grunt1', '!');
      await J.say('Who\'s this? A kid? Get lost - this is Team Eclipse business!', 'grunt1');
      if (await J.battle('grunt1') !== 'win') return;
      J.set('treeGrunt1');
      await J.say('You\'re next, kid!', 'grunt2');
    } else {
      await J.face('luna', 'down'); await J.face('grunt1', 'down'); await J.face('grunt2', 'down');
      await J.emote('grunt2', '!');
      await J.say('You again? My partner may have gone soft, but I haven\'t!', 'grunt2');
    }
    if (await J.battle('grunt2') !== 'win') return;
    await J.say('Tch! Director Vex won\'t be happy. Team Eclipse, fall back!', 'grunt2');
    await J.fade(() => { J.set('gruntsFled'); J.hideNpc('grunt1'); J.hideNpc('grunt2'); });
    await J.say(['Thank you! You fought like a true trainer.', 'Look - the roots are glowing. That\'s what they were after...'], 'luna');
    await J.give('shard');
    await J.say(['A Meteor Shard. Astronomer Orrin in Verdant collects these - he\'ll know what it means.', 'I\'m Luna, the Verdant gym leader. Come and challenge me - I\'ll be waiting!'], 'luna');
    await J.fade(() => { J.set('shard1'); J.set('luna_back'); J.refresh(); });
  });
  // ---- after Luna: the Leaf Badge
  on('lunaWin', { sets: ['badge.leaf', 'ride.cut', 'ch2'] }, async J => {
    await J.say('You win! Take this - the Leaf Badge. Proof you beat me!', 'luna');
    J.badge('leaf');
    await J.give('tm:magical-leaf');
    await J.say(['And this: the Ride Pager. I\'ve registered my old friend Scyther. Call it to cut down small trees that block your way.', 'There\'s one in the south-west corner of town - I hear something nice is hidden behind it.'], 'luna');
    await J.give('ridepager'); J.set('ride.cut');
    await J.say('Oh - and the workers just cleared the rockslide! Route 2 is open, east of town. Port Coralis and its leader Rex are waiting. Grow strong, {NAME}!', 'luna');
    await J.chapter('Chapter 1 complete!', 'Next: Chapter 2 - Tides of Port Coralis');
    J.set('ch2'); J.refresh();
    await J.chapter('Chapter 2', 'Tides of Port Coralis');
  });
  // =====================================================================
  //  Chapter 2 - Tides of Port Coralis
  // =====================================================================
  on('worker2', {}, (J, n) => J.say(['Phew! We dug out the last of the rocks this morning. Port Coralis is east of here.', 'Funny thing - Hiker Dale swears the slide shook loose something purple and glowing, up in the north-east meadow.'], n));
  // ---- Sora's second battle, near the end of Route 2
  on('soraRoute2', { needs: ['!rival2'], sets: ['rival2'] }, async J => {
    await J.emote('sora', '!');
    const rs = J.get('rivalStarter') || 'eevee';
    await J.say(['{NAME}! There you are! I got to Port Coralis first' + (J.grown(rs, 17) !== rs ? ' - and look who evolved!' : ' - and my partner\'s been training nonstop!'), 'Hey, the gym leader there wasn\'t even in. Something\'s up in town... but first: battle me! Let\'s see who\'s grown more!'], 'sora');
    await J.battle({ id: 'rival2', name: 'Sora', look: 'sora', team: [['staravia', 15], [J.grown(rs, 17), 17]], pay: 40, theme: 'forest', canLose: true, before: 'No holding back this time!', lose: 'No way! Again?!', win: 'Ha! Told you I\'d train like crazy!' });
    await J.say(J.lastWin() ? ['Man, you\'re strong... I won\'t lose to you at the gym, though!', 'People in town are talking about a break-in at the museum. Go see!'] : ['Don\'t sweat it - that was a close one!', 'People in town are talking about a break-in at the museum. Go see!'], 'sora');
    await J.walk('sora', ['right', 3]);
    J.set('rival2'); J.refresh();
  });
  // ---- Port Coralis
  on('portSailor', {}, (J, n) => J.say(J.flag('rex_back') ? 'Rex is back at the gym, and the meteorite is home. Port Coralis owes you one, kid!' : J.flag('museum') ? 'Seacliff Cave is up the path north of town. Hal will let you through now.' : ['Welcome to Port Coralis! Smell that sea air?', 'If you\'re here for the gym, Rex isn\'t in. He went charging into the Maritime Museum this morning - something about a break-in!'], n));
  on('gym2Locked', {}, J => J.say('The door is locked. A note is pinned to it: "At the museum. Back when I\'ve sorted this mess. - Rex"'));
  on('gymGuide2', {}, (J, n) => J.say(J.flag('badge.tide') ? 'You beat Rex! The Tide Badge looks good on you!' : J.flag('rex_back') ? 'Rex is back! He uses Water types: Grass and Electric moves are your best bet. Mind Quagsire - Electric won\'t touch it!' : 'Rex isn\'t in... He\'s at the museum, north-east of here.', n));
  on('caveGuard', { needs: ['!museum'] }, (J, n) => J.say('Seacliff Cave is off-limits - the tide tunnels are dangerous. Only Rex can let you through.', n));
  // the ferry: laid up until the Tide Badge; then it sails to Voltara City (Chapter 3, jch3.js: the map's dock is where you land)
  on('ferry', { travel: [{ map: 'voltara', needs: ['ch3'] }] }, async (J, n) => {
    const dock = JMaps.M.voltara && JMaps.M.voltara.dock;
    if (!J.flag('ch3') || !dock) return J.say('The ferry to Voltara City is laid up for repairs. Come back later, kid!', n);
    if (await J.ask('All aboard for Voltara City! Shall we cast off?', ['Yes', 'Not yet'], n) !== 0) return J.say('Take your time. The sea isn\'t going anywhere.', n);
    await J.say('Hold on to your hat!', n);
    await J.travel('voltara', dock.x, dock.y, dock.dir);
  });
  on('portKid', {}, (J, n) => J.say('I found a shiny shell on the beach! ...Oh. It\'s a bottle cap.', n));
  on('portLady', {}, (J, n) => J.say('Rex has run that gym for thirty years. Folks say he can read the tide like a book.', n));
  on('portWoman', { sets: ['portGift'] }, async (J, n) => {
    if (J.flag('portGift')) return J.say('Fresh sea air and a full Bag - that\'s all a trainer needs!', n);
    await J.say('Oh, a traveler! My husband runs the ferry. Take this, for the road.', n);
    await J.give('superpotion'); J.set('portGift');
  });
  on('oldSalt', {}, (J, n) => J.say(J.flag('rex_back') ? ['You took back the meteorite from those crooks? Rex was right about you.', 'They say the ferry will sail to Voltara City soon. Electric town, that one - all sparks and lights.'] : ['Rex and I sailed together, back when we were young. Stubborn as a Wailord, that man.', 'He\'s at the museum now. Someone stole the Coral Meteorite last night, they say.'], n));
  // ---- the museum
  on('exhibitShip', {}, J => J.say('A model of the S.S. Coralis, the first ship to sail from Port Coralis to Voltara City.'));
  on('exhibitFossil', {}, J => J.say('Fossils from the sea cliffs: shells, claws, and one very old Omanyte.'));
  on('exhibitStatue', {}, J => J.say('A stone Lapras, carved by the first people of Port Coralis.'));
  on('emptyCase', {}, J => J.say(J.flag('meteorite_back') ? 'THE CORAL METEORITE - It fell into the bay long ago. It glows faintly purple.' : 'THE CORAL METEORITE - ...The case is empty. The glass has been cut.'));
  on('rexMuseum', { needs: ['!rex_back'], sets: ['museum'] }, async (J, n) => {
    if (J.flag('kael')) return J.say('You got it back?! Give it to Curator Wells, quick!', n);
    if (J.flag('museum')) return J.say('Seacliff Cave is north of town, up the cliff path. Hal knows you\'re coming. Hurry!', n);
    await J.say(['Hm? You\'re a trainer. Got a badge from Luna, have you? Good.', 'Name\'s Rex - I run the gym here. Last night, someone cut open that case and took the Coral Meteorite.', 'A piece of the Valoria meteor. People in purple were seen running for Seacliff Cave.'], n);
    await J.say('(People in purple... Team Eclipse! The same crew that was digging for a Meteor Shard in Whisperwood Forest.)');
    await J.say(['Then they\'re collecting. My Pokémon are too big for those tide tunnels - but yours aren\'t.', 'I\'ll tell Hal to let you into the cave. Bring that meteorite home, and then come and challenge me. Deal?'], n);
    J.set('museum'); J.refresh();
  });
  on('curator', { needs: ['kael'], sets: ['meteorite_back', 'rex_back'] }, async (J, n) => {
    if (J.flag('meteorite_back')) return J.say('The meteorite is safe in its case again. Thank you, young one. The museum is in your debt.', n);
    if (!J.has('meteorite')) return J.say(J.flag('museum') ? 'Please, if you find the meteorite... bring it back safely.' : 'I am Curator Wells. Last night... oh, I can hardly speak of it. Please, talk to Rex.', n);
    await J.say(['The Coral Meteorite! You brought it back!', 'It hums... it never did that before. As if it\'s calling to something.'], n);
    J.take('meteorite'); J.set('meteorite_back');
    await J.say('Please, take this. It came from the bay, like the meteorite - I think it wants to go on a journey.', n);
    await J.give('waterstone');
    await J.say('Well done, kid. I\'ll see you at the gym - and I won\'t go easy!', 'rex');
    await J.fade(() => { J.set('rex_back'); J.refresh(); });
  });
  // ---- Seacliff Cave: Admin Kael
  on('kaelCave', { needs: ['museum', '!kael'], sets: ['kael'] }, async J => {
    await J.say('The meteorite resonates with the shards we\'ve gathered... Director Vex will be pleased.', 'kael');
    await J.face('kael', 'down'); await J.face('grunt5', 'down');
    await J.emote('kael', '!');
    await J.say('Admin Kael, it\'s that kid again!', 'grunt5');
    await J.say('So you\'re the one who embarrassed my grunts in Whisperwood. I\'m Kael, Admin of Team Eclipse. Let me show you what an Admin can do.', 'kael');
    if (await J.battle('kael') !== 'win') return;
    await J.say(['Hmph. A bond between trainer and Pokémon... Director Vex said that is what the stones answer to.', 'Take your rock back. We\'ll find the rest of the shards before you do. Team Eclipse - we\'re leaving!'], 'kael');
    await J.fade(() => { J.set('kael'); J.refresh(); });
    await J.give('meteorite');
    await J.say('You got the Coral Meteorite back! Better take it to the museum.');
  });
  // ---- after Rex: the Tide Badge
  on('rexWin', { sets: ['badge.tide', 'expshare', 'ch3'] }, async J => {
    await J.say('A fine battle, captain! Here - the Tide Badge.', 'rex');
    J.badge('tide');
    await J.give('tm:water-pulse');
    await J.say(['And take this Exp. Share. With it, the Pokémon that sit out a battle still learn from it.', 'Every member of your crew grows together. That\'s how you weather any storm!'], 'rex');
    await J.give('expshare'); J.set('expshare');
    await J.say(['Team Eclipse is after the meteor fragments - all of them. Keep your eyes open, {NAME}.', 'And good news: the ferry is fixed! It sails for Voltara City from the pier. Mila and the Spark Badge are waiting there!'], 'rex');
    await J.chapter('Chapter 2 complete!', 'Next: Chapter 3 - Sparks of Voltara');
    J.set('ch3'); J.refresh();
    await J.chapter('Chapter 3', 'Sparks of Voltara');
  });
  on('gymStatue2', {}, J => J.say(J.flag('badge.tide') ? 'CORALIS POKéMON GYM - LEADER: REX\nWinning trainers: {NAME}' : 'CORALIS POKéMON GYM - LEADER: REX\nWinning trainers this season: none yet!'));

  // ---- the chapters: where each starts, the party level a player has by then, its badge and the story flags it must
  // reach (the checker and the playthrough test read these; jch3.js... register theirs the same way)
  const CHAPTERS = {};
  const chapter = c => { CHAPTERS[c.n] = c; };
  chapter({ n: 1, title: 'A Bond Begins', start: { map: 'home2f', x: 2, y: 3 }, level: 5, badge: 'leaf',
    goals: ['intro', 'shoes', 'starter', 'rival1', 'dex', 'soraR1', 'luna_back', 'shard1', 'badge.leaf', 'ride.cut', 'ch2'] });
  chapter({ n: 2, title: 'Tides of Port Coralis', start: { map: 'verdant', x: 14, y: 14 }, level: 18, badge: 'tide',
    goals: ['rival2', 'museum', 'kael', 'meteorite_back', 'rex_back', 'badge.tide', 'expshare', 'ch3'] });

  return { ITEMS, BADGES, STARTERS, TRAINERS, T, META, on, CHAPTERS, chapter };
})();
