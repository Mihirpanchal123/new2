'use strict';
// =====================================================================
//  M2STORY - Journey II: The Lost Days of Meridia. The items, badges,
//  starters, the talks everyone shares (nurse, clerk, PCs, TV), the clue
//  notebook, and the Prologue + Chapter 1 story. The later chapters add
//  theirs in mch2.js ... mch12.js with on() and chapter(), exactly like
//  Journey 1's jch3.js. Story bible: docs/journey2/story.md.
//  Each event lists the flags it needs and sets: the story checker
//  (node tools/test-journey.mjs --world=meridia) plays them forward.
// =====================================================================
const MStory = (() => {
  // ---- items: everything you can use or buy in Valoria, without Valoria's story items; plus Meridia's own
  const ITEMS = {};
  for (const [k, it] of Object.entries(JStory.ITEMS)) if (it.pocket !== 'key' || ['pokedex', 'shoes', 'expshare'].includes(k)) ITEMS[k] = it;
  Object.assign(ITEMS, {
    shoes: { name: 'Running Shoes', pocket: 'key', price: 0, desc: 'Hold Shift (or B) to run.' },
    notebook: { name: 'Clue Notebook', pocket: 'key', price: 0, desc: 'Professor Okafor\'s spare field notebook. Everything strange you learn goes in here (MENU > NOTEBOOK).' },
    crystal: { name: 'Lighthouse Crystal', pocket: 'key', price: 0, desc: 'The heart of the Tidemark lamp: a fist-sized crystal that is warm to the touch. Return it to Warden Mara.' },
    lumenpin: { name: 'Lumen Pin', pocket: 'key', price: 0, desc: 'A brass pin shaped like a little lantern: the badge of the Lumen Company. Pip found it on the beach.' }
  });
  const BADGES = [
    { id: 'beacon', name: 'Beacon Badge', leader: 'Mara', col: '#3c78d0' }, { id: 'gear', name: 'Gear Badge', leader: 'Gideon', col: '#7a8a9a' },
    { id: 'moss', name: 'Moss Badge', leader: 'Ilse', col: '#3c9a58' }, { id: 'ochre', name: 'Ochre Badge', leader: 'Bastian', col: '#b07a3a' },
    { id: 'pearl', name: 'Pearl Badge', leader: 'Celeste', col: '#e878a8' }, { id: 'veil', name: 'Veil Badge', leader: 'Corin', col: '#7a58b8' },
    { id: 'crown', name: 'Crown Badge', leader: 'Rhoswen', col: '#4a68b0' }, { id: 'ember', name: 'Ember Badge', leader: 'Solenne', col: '#d85030' }];
  const STARTERS = JStory.STARTERS;
  // where a new game starts (your room in Tidemark)
  const START = { map: 'home2f', x: 2, y: 3 };
  // the clue notebook: a clue shows once its flag is set (chapters add theirs)
  const CLUES = {
    'clue.crystal': 'Warden Mara: the crystal core of the Tidemark lamp is GONE. She can\'t remember last night either.',
    'clue.coats': 'Old Tobin saw people in white coats "inspecting" the lighthouse. Polite. He thinks it was a dream.',
    'clue.pin': 'Pip found a brass lantern pin on the beach: the badge of the Lumen Company.',
    deduce: 'Prof. Okafor: Lumen Company people took the crystal by boat. The only hidden anchorage near here is DRIFTWOOD COVE, west off the Sunward Path.',
    junoback: 'Juno remembers the lost day too! So it isn\'t just me. Her delivery receipt is dated "tomorrow".',
    cove: 'Agent Pell of the Lumen Company: "The Company only borrows... and you\'ll forget this anyway." Forget WHAT?'
  };

  // ---- trainers: team [species, level], pay per level of the last one, lines
  const TRAINERS = {
    m1dale: { team: [['pidgey', 4], ['slakoth', 5]], pay: 16, theme: 'forest', before: 'Lantern Night\'s tonight! I\'m training so my Slakoth stays awake for it!', lose: 'Slakoth... fell asleep anyway.', after: 'Funny. I could swear I already watched the lanterns go up. Must have dreamed it.' },
    m1ivy: { team: [['wingull', 5], ['pichu', 6]], pay: 16, theme: 'forest', before: 'A picnic on the path and a battle for dessert! Ready?', lose: 'You ate my dessert. Metaphorically.', after: 'My sandwiches went stale overnight. But I made them this morning...?' },
    m1bo: { team: [['rookidee', 7], ['starly', 7]], pay: 16, theme: 'forest', before: 'Birds rule the Sunward Path! Feathers, go!', lose: 'Grounded...', after: 'The road crew says the path to Brassport opens soon. Then I\'ll see the big city!' },
    m1lk1: { team: [['zubat', 8], ['litwick', 9]], pay: 30, theme: 'beach', look: 'keeper', name: 'Lightkeeper', before: 'Oh! I\'m terribly sorry, but this cove is closed for Company business. Could you leave? Please?', lose: 'How embarrassing. My apologies.', after: 'Please don\'t tell Agent Pell I lost. He\'s very polite about it, which is worse.' },
    m1lk2: { team: [['geodude', 9], ['psyduck', 9]], pay: 30, theme: 'beach', look: 'keeperf', name: 'Lightkeeper', before: 'We\'re only borrowing it! The Company always gives things back. Well... most things.', lose: 'Excuse me. I need a moment.', after: 'You won\'t remember any of this tomorrow. Nobody ever does. Sorry.' },
    m1lk3: { team: [['litwick', 9], ['zubat', 10]], pay: 30, theme: 'beach', look: 'keeper', name: 'Lightkeeper', before: 'Lumen lights the way! ...That\'s our slogan. I have to say it before battles.', lose: 'The light dims. That\'s also a slogan. I made that one up.', after: 'Agent Pell is by the boat. He already knows you\'re here. He always knows.' },
    // the Tidemark Light: Warden Mara's gym
    m1keeper1: { team: [['psyduck', 11], ['horsea', 11]], pay: 24, theme: 'beach', before: 'The Light is lit again, and so is my fighting spirit!', lose: 'Washed overboard!', after: 'Mara\'s Pokémon ride the tide. Grass and Electric moves cut right through it.' },
    m1keeper2: { team: [['wingull', 11], ['tentacool', 12]], pay: 24, theme: 'beach', before: 'Only those who can weather a storm climb to the lamp room!', lose: 'A squall, that\'s all...', after: 'Go on up. The Warden doesn\'t hold back - not tonight.' },
    mara: { team: [['horsea', 12], ['wingull', 13], ['staryu', 14]], pay: 100, theme: 'beach', gym: 1, onWin: 'm1maraWin', look: 'mara', name: 'Warden Mara', before: 'You brought my light home. Now let\'s see if you can weather the tide that guards it!', lose: 'Ha! The sea always comes back... and so will I.' }
  };

  // ---- talks and events: (J, npc) => ...; meta lists the flags each one needs and sets (the checker reads it)
  const T = {};
  const META = {};
  const on = (id, meta, fn) => { T[id] = fn; META[id] = meta; };

  // ---- the talks everyone shares
  for (const id of ['nurse', 'clerk', 'boxPc', 'cutTree']) on(id, {}, JStory.T[id]);
  on('tv', {}, J => J.say(J.pick(['A news report: "The Lumen Company\'s free lanterns now light nine homes in ten. Crime in Brassport is at an all-time low!"',
    'A cooking show: "Today, Tidemark fish stew - the way Grandma made it, if you can remember how Grandma made it."',
    'The weather: "Calm seas along the Sunward Coast. Expect a perfect day... again."', 'A quiz show: "Which Pokémon sees both the past and the future?" ...The contestant has forgotten the question.'])));
  on('myPc', {}, J => J.say(J.flag('lostday') ? 'Your PC. The calendar says it is Lantern Night. It said that yesterday too.' : 'Your PC. A reminder blinks on the screen: "LANTERN NIGHT - the Professor\'s at the square!"'));
  on('m1machine', {}, J => J.say(J.flag('lostday') ? 'A tall machine full of dials. A printout reads: "TEMPORAL DRIFT IN TIDEMARK: 24 HOURS. CAUSE: UNKNOWN."' : 'A tall machine full of dials. It hums happily.'));
  on('m1remy', {}, async (J, n) => {
    await J.say('The Professor lets me use the field healer. Want me to patch up your Pokémon?', n);
    if (await J.ask('Heal your Pokémon?', ['Yes, please', 'No, thanks'], n) !== 0) return;
    await J.healCenter();
    await J.say('All better! If you ever faint out there, I\'ll be the one who patches you up again.', n);
  });

  // =====================================================================
  //  Prologue: Lantern Night
  // =====================================================================
  on('intro', { sets: ['intro'] }, async J => {
    await J.say(['Once a year, on Lantern Night, the people of Meridia send paper lanterns up into the dark - one for every day they want to remember.',
      'And at midnight, all eight great lighthouses of Meridia shine together, so that no ship and no memory is ever lost at sea.',
      'Tonight is Lantern Night in the little fishing village of Tidemark.']);
    await J.say('{NAME}! Are you awake? The festival\'s starting - and Professor Okafor is waiting for you in the square!', { name: 'Mom (downstairs)', look: 'mom' });
    J.set('intro');
  });
  on('m1mom', { sets: ['shoes'] }, async (J, n) => {
    if (!J.flag('shoes')) {
      await J.say(['There you are! Happy Lantern Night, sweetheart. And happy birthday!', 'You know the tradition - every child born on Lantern Night gets a partner Pokémon from the Professor on their big day.'], n);
      await J.say('Oh, and these are from me. You\'re always running everywhere anyway.', n);
      await J.give('shoes');
      await J.say('Running Shoes! Hold Shift - or the B button - to run. Now go! Professor Okafor is in the square, by the lanterns.', n);
      J.set('shoes'); return;
    }
    if (!J.flag('starter')) return J.say('The square is just south of here, under the lanterns. Go on!', n);
    if (!J.flag('lostday')) return J.say(['Look at you, with a partner of your own! Be home before midnight - the lighthouse is the best part.'], n);
    if (!J.flag('notebook')) return J.say(['Happy Lantern Night, sweetheart! And happy birthday! Professor Okafor is giving out partners tonight - oh!', 'Where did that Pokémon come from? Did someone give you a present early?'], n);
    if (!J.flag('relit1')) return J.say('You look worried. Is something wrong? ...You can tell me. I\'ll believe you. I think.', n);
    if (!J.flag('ch2')) return J.say(['Last night... I remember now. You came home so happy with your partner, and I made your favourite stew.', 'How could I forget a day like that? How could ALL of us forget?'], n);
    return J.say(J.pick(['Brassport! My little {NAME}, off to the big city. Write to me - and don\'t let anyone take your memories, okay?', 'Rest whenever you need to. Your bed is always made.']), n);
  });
  on('m1stay', { needs: ['!notebook'] }, async J => {
    await J.say(J.flag('lostday') ? 'Something is very wrong in Tidemark. Better find out what before going anywhere.' : 'It\'s Lantern Night! The whole village is here in town - no need to go anywhere tonight.');
    await J.playerWalk('down', 1);
  });
  on('m1okFestival', { needs: ['intro'], sets: ['starter', 'dex'] }, async (J, n) => {
    if (J.flag('starter')) return J.say(['Go and say hello to Juno at the pier. She\'s been bouncing on her heels all evening.', 'And {NAME}... tonight, watch the lighthouse at midnight. It\'s a sight you\'ll remember forever.'], n);
    await J.say(['Ah, the birthday trainer! Happy Lantern Night, {NAME}.', 'I\'m Amara Okafor. I study how Pokémon move through time - the Pokémon that remember things before they happen, or long after.',
      'And every Lantern Night, I keep a promise this village made long ago: a child born tonight gets a partner to walk with.', 'Choose well. A partner remembers you even when the world forgets.'], n);
    const sp = await J.pickStarter();
    J.addMon(sp, 5, { met: 'Tidemark' });
    J.set('starter'); J.set('mystarter', sp);
    J.set('rivalStarter', J.rivalStarter(sp));
    await J.say(`${J.dname(sp)}! Wonderful. Look how it watches you - it has already decided you're its person.`, n);
    await J.say('And take this Pokédex. It records every Pokémon you see and catch. A scientist\'s first tool is a good memory.', n);
    await J.give('pokedex'); J.set('dex');
    await J.give('poke', 5);
    await J.say(['Juno Reyes is waiting for you at the pier. I gave her a partner this morning, before her courier shift - and she has been dying to battle you.', 'Off you go. And {NAME}... at midnight, watch the lighthouse.'], n);
  });
  on('m1junoPier', { needs: ['starter'], sets: ['juno1'] }, async (J, n) => {
    if (!J.flag('starter')) return J.say('{NAME}! Happy birthday! Go get your partner already - the Professor\'s in the square! I\'ll wait. Impatiently.', n);
    const rs = J.get('rivalStarter');
    await J.say([`FINALLY! Happy birthday, slowpoke. Meet my partner: ${J.dname(rs)}!`, 'The Professor gave me first pick this morning. And I picked the one that beats yours. Obviously.',
      'First battle of Lantern Night. Loser carries the winner\'s lantern. Ready? Ready!'], n);
    await J.battle({ id: 'juno1', name: 'Juno', look: 'juno', team: [[rs, 5]], pay: 40, theme: 'beach', canLose: true, before: 'Here we go, here we GO!', lose: 'No way! Rematch! ...After my shift.', win: 'Ha! Carry my lantern, birthday kid!' });
    await J.say(J.lastWin() ? 'Okay. Okay! Lucky. Next time I\'m winning, and I\'m winning in style.' : 'See? First battle, first win. Get used to it!', n);
    await J.say(['Ugh, I have to go. Mom\'s got me on a night delivery to Gullwing Isle - Reyes Couriers never sleeps.', 'Save me a lantern! I\'ll be back by morning. See you tomorrow, {NAME}!'], n);
    await J.fade(() => J.hideNpc('juno'));
    J.set('juno1');
    await J.heal(false);
    await J.say('Your Pokémon had a rest by the water. It\'s getting late - home to bed, and watch the lighthouse at midnight.');
  });
  on('m1bed', { needs: ['juno1'], sets: ['lostday'] }, async J => {
    if (!J.flag('starter')) return J.say('Sleep? On Lantern Night? Not a chance - the festival is outside!');
    if (!J.flag('juno1')) return J.say('Juno is waiting at the pier. Better not keep her waiting - she\'ll never let you hear the end of it.');
    if (J.flag('lostday')) { await J.say('You lie down for a short nap...'); await J.heal(true); return J.say('You and your Pokémon feel rested.'); }
    const sp = J.get('mystarter');
    await J.say(['You lie in bed with the window open. Outside, the whole village is singing.', 'At midnight, a thousand paper lanterns rise over the harbour like slow golden stars.',
      'And then the Tidemark lighthouse begins to blaze, brighter than you have ever seen it...']);
    await J.fade(async () => { await J.wait(400); });
    await J.say(['...it flickers.', '...and goes out.', 'A cold, grey hush falls over Tidemark. The singing stops mid-note.', `Beside you, ${J.dname(sp)} is growling at the window, its fur on end.`]);
    await J.fade(async () => { await J.heal(false); await J.wait(800); });
    await J.say('{NAME}! Wake up, sleepyhead! It\'s Lantern Night today - your birthday! Professor Okafor is giving out partners tonight!', { name: 'Mom (downstairs)', look: 'mom' });
    await J.say([`...Today? But Lantern Night was yesterday.`, `${J.dname(sp)} looks up at you. It remembers too.`]);
    J.set('lostday');
    await J.chapter('Chapter 1', 'The Day That Didn\'t Happen');
  });

  // =====================================================================
  //  Chapter 1: The Day That Didn't Happen
  // =====================================================================
  on('m1okLab', { needs: ['lostday'], sets: ['notebook'] }, async (J, n) => {
    if (!J.flag('notebook')) {
      const sp = J.get('mystarter');
      await J.say([`Good morning! Oh - what a lovely ${J.dname(sp)}. Is it yours?`, 'How odd. I don\'t hand out partners until tonight...'], n);
      await J.say('...', n);
      await J.say(['You\'re saying I gave it to you. Last night. On Lantern Night. Which is tonight.', 'I should tell you that\'s impossible. But my machine has been printing the same word since dawn.'], n);
      await J.say(['DRIFT. Twenty-four hours of it. As if a whole day was cut out of Tidemark and the edges sewn back together.', 'And here you stand with a Pokémon I registered at 9:14 last night - in a log I don\'t remember writing.'], n);
      await J.say(['I believe you, {NAME}. Someone has to. Here - my spare field notebook.', 'Ask around. Anything odd about "last night". Write it all down, and bring it to me.'], n);
      await J.give('notebook');
      J.set('notebook');
      return J.say(['Talk to Warden Mara at the lighthouse - it was her light that went out. And the fishermen on the pier see everything.', 'Open the notebook from the MENU any time.'], n);
    }
  });
  on('m1okDeduce', { needs: ['clue.crystal', 'clue.coats', 'clue.pin'], sets: ['deduce'] }, async (J, n) => {
    if (!J.flag('deduce')) {
      const got = ['clue.crystal', 'clue.coats', 'clue.pin'].filter(f => J.flag(f)).length;
      if (got < 3) return J.say(got ? `${got} clue${got > 1 ? 's' : ''} so far. Keep going - Mara at the lighthouse, the fishermen on the pier, the children on the beach. Someone saw something.` : 'Nothing yet? Try Warden Mara at the lighthouse first. It was her light that went out.', n);
      await J.say(['The crystal gone... white coats... and a Lumen Company pin in the sand.', 'The Lumen Company. They make those free lanterns everyone in Brassport loves. Why would they want a lighthouse crystal?'], n);
      await J.say(['If they came by boat in the night, there\'s only one hidden anchorage on this coast: Driftwood Cove.', 'Take the Sunward Path north out of town, then the cove path west. Remy will heal your team whenever you need. Be careful, {NAME}.'], n);
      J.set('deduce'); return;
    }
    if (!J.flag('crystal')) return J.say('Driftwood Cove: north on the Sunward Path, then west through the fog. Be careful.', n);
    if (!J.flag('relit1')) return J.say('You got it back! Take it to Mara, quickly - I want to see what happens when that lamp comes on.', n);
    if (!J.flag('ch2')) return J.say(['The drift is gone. Everyone remembers - but only because the light came back.', 'The lighthouses aren\'t just for ships, are they? They\'re for us. Show Mara you\'re strong enough to understand that.'], n);
    return J.say(['The Lumen Company is headquartered in Brassport. If they\'re taking lighthouse crystals, they\'ll want more than one.', 'There are eight Lights in Meridia. Eight Wardens. Find out what the Company wants - and keep your notebook close.'], n);
  });
  on('m1maraOut', { needs: ['notebook'], sets: ['clue.crystal'] }, async (J, n) => {
    if (!J.flag('lostday')) return J.say(['Happy Lantern Night! I\'m Mara, Warden of the Tidemark Light.', 'At midnight my lamp will shine its brightest of the whole year. Don\'t blink!'], n);
    if (!J.flag('notebook')) return J.say('My lamp... sorry, I can\'t talk right now. Something is wrong with the Light.', n);
    await J.say(['You\'re the Okafor kid\'s new assistant? Fine. Here\'s the truth.', 'The crystal core of my lamp is GONE. The lock\'s untouched. The lamp room was shut all night.',
      'And the worst part? I can\'t remember last night. A Warden who forgets her own Light...'], n);
    J.set('clue.crystal');
    await J.say('(You write it in the notebook: the lighthouse crystal is missing.)');
  });
  on('m1relight', { needs: ['crystal'], sets: ['relit1'] }, async (J, n) => {
    await J.say(['That glow... is that my crystal?! You got it back from the Lumen people?', 'Then come on - let\'s put the light back where it belongs!'], n);
    J.take('crystal');
    await J.fade(async () => { await J.wait(600); });
    await J.say(['You climb the spiral stairs with Mara. She fits the crystal into the great lamp and pulls the lever.', 'The Tidemark Light blazes out across the sea.', 'And down in the village, someone gasps. Then someone else. Then everyone.']);
    await J.say(['"The lanterns! I remember the lanterns!"', '"We sang - we sang until midnight, and then..."', '"Two Lantern Nights? How can there be two?"']);
    await J.say(['I remember. I remember all of it, now.', 'The light didn\'t just guide ships, did it? It held our memories in place. Without it, the whole day just... slipped away.'], n);
    await J.say(['You did this, {NAME}. So listen: I\'m a Warden, and Wardens test anyone who shows up at their Light.', 'Come up to the lamp room when you\'re ready. My crew will be waiting for you on the way.'], n);
    await J.fade(() => { J.set('relit1'); J.refresh(); });
  });
  on('m1lightLocked', {}, J => J.say(J.flag('lostday') ? 'The lighthouse door is locked. Without its crystal, the Light is cold and dark.' : 'The lighthouse door is shut. Warden Mara is getting the lamp ready for midnight.'));
  on('m1tobin', { needs: ['notebook'], sets: ['clue.coats'] }, async (J, n) => {
    if (!J.flag('lostday')) return J.say('Fifty Lantern Nights I\'ve seen from this pier. Each one a little brighter than the last.', n);
    if (J.flag('relit1')) return J.say(['White coats, I told you. Now I remember their faces, too. Smiling. Apologising.', 'Who apologises while they rob you?'], n);
    if (!J.flag('notebook')) return J.say('Morning. Feels like I\'ve already had this morning once. Old age, I suppose.', n);
    await J.say(['Odd? Well... I had a dream. People in white coats, polite as you please, rowing past the pier in the dark.', '"Inspecting the lighthouse," they said. "Terribly sorry for the bother."', 'Then they rowed off north-west. But it was a dream. Wasn\'t it?'], n);
    J.set('clue.coats');
    await J.say('(You write it in the notebook: polite people in white coats, rowing north-west.)');
  });
  on('m1pip', { needs: ['notebook'], sets: ['clue.pin'] }, async (J, n) => {
    if (!J.flag('lostday')) return J.say('I\'m gonna stay up till midnight! I\'m gonna! I\'m... *yawn*', n);
    if (J.flag('clue.pin')) return J.say('Keep the pin! I\'ve got loads of shells anyway.', n);
    if (!J.flag('notebook')) return J.say('I\'m looking for treasure! The tide brings in loads of stuff.', n);
    await J.say(['Hey! Look what the tide brought in! Isn\'t it shiny?', 'It\'s a little lantern. You can have it - I like shells better.'], n);
    await J.give('lumenpin');
    J.set('clue.pin');
    await J.say('(A brass lantern pin: the badge of the Lumen Company. You write it in the notebook.)');
  });
  on('m1lady', {}, (J, n) => J.say(J.flag('relit1') ? 'Two Lantern Nights in a row! We\'re having the festival again tonight, properly. Nobody\'s forgetting this one.' : J.flag('lostday') ? 'Is it just me, or did we hang these exact lanterns yesterday? I\'ve got a blister in the exact same place.' : 'Happy Lantern Night! Did you send up a lantern yet? One for every day you want to keep!', n));
  on('m1gran', {}, (J, n) => J.say(J.flag('relit1') ? ['When I was a girl, my grandmother said the lighthouses were built by the Lantern-folk, to keep "the Grey" out.', 'I always thought it was a story to make children go to bed. Now I wonder.'] : J.flag('lostday') ? 'Some mornings I can\'t remember where I put my glasses. This morning I can\'t remember yesterday. Isn\'t that funny? ...Isn\'t it?' : 'Lantern Night already? Every year comes quicker than the last.', n));
  on('m1teo', {}, (J, n) => J.say(J.flag('lostday') && !J.flag('relit1') ? ['Juno\'s still not back from Gullwing. Mom says she only left last night, but...', 'Last night was the festival. And the festival is tonight. My head hurts.'] : ['When I grow up I\'m gonna be a courier like Juno! The fastest in Meridia!', 'She says I\'m too little. I\'m not too little. I\'m medium.'], n));
  on('m1junoMom', {}, (J, n) => J.say(J.flag('ch2') ? 'Juno\'s off to Brassport with a parcel for the Lumen Company, of all people. If you see her, make her eat something.' : 'Reyes Couriers - anything, anywhere, by morning! My daughter\'s the fastest runner on the Sunward Coast. Don\'t tell her I said so.', n));
  on('m1junoDesk', {}, J => J.say('Juno\'s desk: a pile of delivery receipts, a map of Meridia with every route inked in red, and a drawing of Teo labelled "MY ASSISTANT (UNPAID)".'));
  on('m1gymStatue', {}, J => J.say(J.flag('badge.beacon') ? 'TIDEMARK LIGHT - WARDEN: MARA\nTrainers who have earned the Beacon Badge: {NAME}' : 'TIDEMARK LIGHT - WARDEN: MARA\nThe first of the Eight Lights of Meridia.'));
  on('m1lamp', {}, J => J.say('The great lamp of the Tidemark Light. Its crystal glows warm and steady. Looking into it, you can almost hear the festival singing.'));

  // ---- the Sunward Path and Driftwood Cove
  on('m1fog', { needs: ['!deduce'] }, async J => {
    await J.say('A thick sea fog hangs over the cove path. Without knowing what you\'re looking for, you\'d only get lost in there.');
    await J.playerWalk('right', 1);
  });
  on('m1notYet', { needs: ['!ch2'] }, async J => {
    await J.say('The road crew has the north road blocked off while they fix a sinkhole.', { name: 'Road Crew', look: 'worker' });
    await J.playerWalk('down', 1);
  });
  on('m1crew', {}, (J, n) => J.say(J.flag('relit1') ? 'Nearly done! Once you\'ve got the Warden\'s blessing, the road to Brassport\'s all yours.' : 'Sinkhole on the north road. Opened up overnight. Funny - I don\'t remember it opening.', n));
  on('m1junoBack', { needs: ['notebook'], sets: ['junoback'] }, async (J, n) => {
    await J.say(['{NAME}! There you are! Okay. Okay okay okay. I need you to tell me I\'m not crazy.', 'Last night I sailed to Gullwing. I delivered the parcel. I slept on the boat. And this morning everyone says I left LAST NIGHT.',
      'But look - the delivery receipt. Stamped and signed. Dated TOMORROW.'], n);
    await J.say(['...You remember too? The festival, our battle, the lighthouse going dark?', 'Ha! I KNEW it! I knew it wasn\'t just me!'], n);
    await J.say(['Okafor\'s on it? Good. Then go find those white coats - I\'ll warn the villages up the coast before I head back out.', 'Here, courier\'s emergency kit. You\'ll need it more than me.'], n);
    await J.give('potion', 3);
    await J.fade(() => J.hideNpc('juno'));
    J.set('junoback');
  });
  on('m1pell', { needs: ['deduce'], sets: ['cove', 'crystal'] }, async (J, n) => {
    await J.say(['Ah. The child from Tidemark. Good evening - or is it morning? It\'s so hard to keep track, these days.', 'I\'m Agent Pell, of the Lumen Company. You\'re here for the crystal, I assume. I do apologise for the inconvenience.'], n);
    await J.say(['The Company only borrows. A day here, a little light there. Nobody misses what they can\'t remember.', 'But I can see you won\'t be talked out of it. How tiresome. Shall we?'], n);
    if (await J.battle({ id: 'm1pell', name: 'Agent Pell', look: 'agent', team: [['zubat', 9], ['litwick', 10], ['croagunk', 10]], pay: 60, theme: 'beach', before: 'Let\'s keep this civil.', lose: 'How very... uncivil of you.' }) !== 'win') return;
    await J.say(['Well. You may keep the crystal, with my compliments. The Company has plenty of other Lights to borrow from.', 'Oh - and do enjoy the memory of this. While it lasts.'], n);
    await J.fade(() => { J.hideNpc('pell'); J.set('cove'); });
    await J.give('crystal');
    J.set('crystal');
    await J.say('You got the Lighthouse Crystal back! It\'s warm, like something alive. Take it to Warden Mara.');
  });

  // ---- after Mara: the Beacon Badge, and the road to Brassport
  on('m1maraWin', { sets: ['badge.beacon', 'expshare', 'ch2'] }, async J => {
    await J.say(['Ha! What a storm you brought with you. Here - the Beacon Badge. You\'ve earned it twice over.'], 'mara');
    J.badge('beacon');
    await J.give('tm:water-pulse');
    await J.say(['And take this Exp. Share. A Warden looks after her whole crew, not just the one at the wheel.', 'With it, the Pokémon that sit out a battle still learn from it.'], 'mara');
    await J.give('expshare'); J.set('expshare');
    await J.say(['Listen, {NAME}. Tidemark is the first of eight Lights. If the Lumen Company "borrowed" mine...', 'Gideon keeps the Brass Light in Brassport. Lumen\'s headquarters are there too. The road crew says the north road\'s open - go and see what they\'re up to.'], 'mara');
    await J.chapter('Chapter 1 complete!', 'Next: Chapter 2 - City of a Thousand Lamps');
    J.set('ch2'); J.refresh();
    await J.chapter('Chapter 2', 'City of a Thousand Lamps');
  });

  // ---- the chapters: where each starts, the party level a player has by then, its badge and the story flags it must
  // reach (the checker and the playthrough test read these; mch2.js... register theirs the same way)
  const CHAPTERS = {};
  const chapter = c => { CHAPTERS[c.n] = c; };
  chapter({ n: 1, title: 'The Day That Didn\'t Happen', start: START, level: 5, badge: 'beacon',
    goals: ['intro', 'shoes', 'starter', 'dex', 'juno1', 'lostday', 'notebook', 'clue.crystal', 'clue.coats', 'clue.pin', 'deduce', 'junoback', 'cove', 'crystal', 'relit1', 'badge.beacon', 'expshare', 'ch2'] });

  return { ITEMS, BADGES, STARTERS, TRAINERS, T, META, on, CHAPTERS, chapter, CLUES, START };
})();
