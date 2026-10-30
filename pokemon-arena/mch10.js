'use strict';
// =====================================================================
//  JOURNEY II - Chapter 10: Everyone's Best Day. The Long Night: the
//  whole of Meridia is grey and still, and everyone lives their happiest
//  day again and again. You are the only one awake - you and Nell, the
//  girl from the Echo, who can walk anywhere now. Wake the Wardens by
//  battling them inside their best days (they stand in their own towns:
//  MMaps.SPOTS). In Tidemark's Echo, Juno finds what Cassius "saved" of
//  Teo: one afternoon on the pier, over and over. She comes back. Then,
//  side by side, you fight Cassius's elite at the foot of the Great
//  Lantern (a tag battle: back-to-back rounds, Juno healing your team).
//  Side story: The Forgotten Champion ends here - in the Long Night old
//  Bram relives the day he became Champion, and with his team home he
//  fights you at full strength.
//  Plan: docs/journey2/world.md · story: docs/journey2/story.md
// =====================================================================
(() => {
  const { L, M, SPOTS, echoTwin } = MMaps;
  const { on, ITEMS, chapter, CLUES } = MStory;

  ITEMS['tm:shadow-ball'] = ITEMS['tm:shadow-ball'] || { name: 'TM Shadow Ball', pocket: 'tms', price: 0, tm: 'shadow-ball', desc: 'Teaches Shadow Ball: a shadowy blob that may lower the foe\'s Sp. Def.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m10nell: 'Nell walks in the grey as if she lives there. She says the Wardens might wake if someone fought them inside their best day - and that Juno is "by the sea, in the grey under the grey".',
    m10teo: 'In Tidemark\'s Echo, Teo skips stones off the pier. Seven skips. The same stone, the same words, over and over. He doesn\'t see anyone.',
    junoback10: 'Juno saw it: Cassius didn\'t save Teo, he kept one afternoon of him. She\'s with me again. "Courier\'s promise: I\'ll meet you at the summit."',
    tagwin: 'Juno and I beat Cassius\'s elite at the foot of the Great Lantern, side by side. The tower door is open.',
    m10champ: 'Old Bram remembered! In the Long Night he relived the day he became Champion - and with Ember, Tide and Gale home, he fought at full strength.'
  });

  // =====================================================================
  //  The Wardens in their best days (one per Warden whose town exists)
  // =====================================================================
  const WARDENS = {
    mara: { name: 'Warden Mara', light: 'Tidemark Light', theme: 'beach', team: [['pelipper', 47], ['golduck', 47], ['starmie', 48], ['kingdra', 49]],
      day: ['Regatta day! The Tidemark regatta, and I\'m sixteen, and I\'m going to WIN it this year!', 'Mum\'s up on the Light with the flag. Everyone\'s on the pier. You - you\'re racing too? Then let\'s settle it the Tidemark way!'],
      wake: ['...The regatta. That was twenty years ago.', 'I\'ve been sailing the same race all night, haven\'t I? The same perfect morning, over and over. It WAS a good day.', 'But it doesn\'t get to be the only one. Thank you, {NAME}.'],
      after: ['Juno? She ran past me hours ago - toward the old stone lantern by the pier. And then she just... wasn\'t there.', 'Like she stepped into a painting of Tidemark. A grey one.'] },
    gideon: { name: 'Warden Gideon', light: 'Brass Light', theme: 'city', team: [['skarmory', 47], ['excadrill', 48], ['magnezone', 48], ['metagross', 49]],
      day: ['The Brass Light\'s first night! My Light, my canals, my city - all lit up, and the whole of Brassport cheering!', 'A challenger on opening night? Perfect! Let\'s give them a show they\'ll never forget!'],
      wake: ['...Never forget. Hah. I\'ve been standing here cheering at nothing.', 'A city that never changes isn\'t a city. It\'s a clock that stopped. Go - I\'ll get my Light burning again.'] },
    ilse: { name: 'Warden Ilse', light: 'Moss Light', theme: 'forest', team: [['heracross', 47], ['scizor', 48], ['golisopod', 48], ['volcarona', 49]],
      day: ['The great moss tree is flowering! It flowers once every hundred years and it\'s flowering TODAY!', 'Everything in Mossgrove is singing. Sing with me - or battle me, I don\'t mind which!'],
      wake: ['...The petals aren\'t falling. They should fall. That\'s the best part.', 'Flowers that never fall aren\'t flowers. They\'re paper. Thank you for shaking the branch.'] },
    bastian: { name: 'Warden Bastian', light: 'Ochre Light', theme: 'forest', team: [['aerodactyl', 47], ['golem', 48], ['rhyperior', 48], ['tyranitar', 49]],
      day: ['The dig! The day we broke into the first Lantern-folk chamber in the Ochre ruins! Look at the murals, look at them!', 'You want a look too? Earn it, the old way. Rocks first, questions later!'],
      wake: ['...I\'ve read the same mural a thousand times tonight. And I never once read the end of it.', 'The Lantern-folk built their lights to let days GO, not keep them. Go on. The Ochre Light will burn.'] },
    celeste: { name: 'Warden Celeste', light: 'Pearl Light', theme: 'beach', team: [['clefable', 47], ['togekiss', 48], ['florges', 48], ['sylveon', 49]],
      day: ['The Pearl Festival! The whole bay is lit with floating lanterns, and everyone I love is dancing on the shore!', 'Will you dance? No? Then battle - it\'s just dancing with more sparkles!'],
      wake: ['...The same song. The same lanterns. The same step, the same turn, for hours.', 'A dance has to end, or it was never a dance. Thank you, darling. Now let me light my Light.'] },
    corin: { name: 'Warden Corin', light: 'Veil Light', theme: 'city', team: [['banette', 47], ['froslass', 47], ['mismagius', 48], ['dusknoir', 48], ['gengar', 49]],
      day: ['The night I first lit the Veil Light. The ghosts of the Isles came to watch. They all came. They were... proud.', 'A visitor. On this night. ...Then show the ghosts something worth remembering.'],
      wake: ['...The ghosts aren\'t here. They were never here. Only my wanting them.', 'I of all people should know: the dead are kept by letting them go. The Veil Light will burn.'] },
    rhoswen: { name: 'Warden Rhoswen', light: 'Crown Light', theme: 'icecave', team: [['altaria', 48], ['flygon', 48], ['noivern', 49], ['drampa', 49], ['haxorus', 50]],
      day: ['She hatched! Look - look! My first Dratini, on the balcony of the Crown Light, in the snow!', 'Today I become a Tamer. Today I become a WARDEN. Come on then, challenger - try and take this day off me!'],
      wake: ['...Gale. Where\'s Gale? That Dratini grew up thirty years ago. She\'s a Dragonite. She\'s got grey whiskers.', 'I\'d have stood here forever holding an egg that hatched before you were born. Thank you, {NAME}.'],
      after: ['The Crown Light\'s still burning, small and stubborn. I\'m going back up to feed it everything I\'ve got.', 'Whatever you\'re planning at that summit - you\'ll have a Dragon at your back.'] }
  };
  const woken = J => Object.keys(WARDENS).filter(w => SPOTS[w] && M[SPOTS[w].map] && J.flag('wake.' + w)).length;
  const there = () => Object.keys(WARDENS).filter(w => SPOTS[w] && M[SPOTS[w].map]).length;
  for (const [w, d] of Object.entries(WARDENS)) {
    const spot = SPOTS[w];
    if (!spot || !M[spot.map]) continue;
    const id = 'm10' + w;
    M[spot.map].npcs.push({ id, x: spot.x, y: spot.y, dir: spot.dir || 'down', look: L[w], name: d.name, talk: 'm10wake_' + w, show: ['longnight', '!wake.' + w] });
    on('m10wake_' + w, { needs: ['longnight'], sets: ['wake.' + w] }, async (J, n) => {
      if (J.flag('wake.' + w)) return;
      await J.say(d.day, n);
      const r = await J.battle({ id: 'm10wake_' + w, name: d.name, look: w, team: d.team, pay: 60, theme: d.theme, canLose: true,
        before: 'For the best day of my life!', lose: '...Huh? What... what day is it?', win: 'What a day. What a perfect, perfect day!' }, n);
      if (r !== 'win') return J.say('The Warden laughs and turns back to a crowd that isn\'t there. The day starts over. (Your team has been healed.)');
      await J.say(d.wake, n);
      if (d.after) await J.say(d.after, n);
      J.set('wake.' + w);
      await J.fade(() => J.hideNpc(id));
      const k = woken(J);
      await J.say([`Far off, the ${d.light} flickers - and a little colour comes back to the sky around it.`, `(${k} of ${there()} Wardens awake.)`]);
      J.refresh();
    });
  }
  // after waking, Rhoswen goes back to her lamp room (and stays there after dawn)
  if (M.crowngym2) {
    M.crowngym2.npcs.push({ id: 'rhoswen3', x: 5, y: 2, dir: 'down', look: L.rhoswen, name: 'Warden Rhoswen', talk: 'm10rhoswenLight', show: ['wake.rhoswen'] });
  }
  on('m10rhoswenLight', {}, (J, n) => J.say(J.flag('dawn') ? ['Dawn. Real dawn. Gale cried, you know. Dragons don\'t cry. She cried.', 'Come back and battle me properly some time. No memories, no Long Night. Just us.'] : J.flag('tagwin') ? 'I felt it from here - two trainers and one Light, holding the line at the summit. Go up. We\'ll hold the rest.' : ['Every scrap of fire my Dragons have is going into this lamp.', 'It won\'t light Meridia. But it\'ll keep the Echo from swallowing Highwatch whole. Go on.'], n));

  // =====================================================================
  //  The Long Night in Highwatch: Nell, and the Forgotten Champion
  // =====================================================================
  if (M.highwatch) {
    M.highwatch.npcs.push({ id: 'nell', x: 17, y: 22, dir: 'left', look: L.nell, name: 'Nell', talk: 'm10nell', show: ['longnight', '!dawn'] },
      { id: 'bram10', x: 11, y: 2, dir: 'up', look: L.m8bram, name: 'Champion Bram', talk: 'm10bram', show: ['longnight', '!m10champ'] });
  }
  if (M.m8bram) M.m8bram.npcs.push({ id: 'bram2', x: 5, y: 3, dir: 'down', look: L.m8bram, name: 'Bram', talk: 'm10bramAfter', show: ['m10champ'] });
  // (Clerk Dov's first day: his Corviknight flies you to Tidemark - mch8.js. The checker lands there.)
  if (M.tidemark && !M.tidemark.dock) M.tidemark.dock = { x: M.tidemark.fly.x, y: M.tidemark.fly.y, dir: 'down' };

  on('m10nell', { needs: ['longnight'], sets: ['m10nell'] }, async (J, n) => {
    if (J.flag('m10nell')) {
      if (!J.flag('junoback10')) return J.say(['Your friend is by the sea. In the grey under the grey.', 'There\'s a stone lantern by the pier. Touch it. You know how.'], n);
      if (!J.flag('wake.mara') || !J.flag('wake.rhoswen')) return J.say('The Wardens\' lights are so small now. Like candles in a big dark house. Wake them. The one by the sea, and the one with the dragons.', n);
      if (!J.flag('tagwin')) return J.say('The tower on the mountain. That\'s where the grey comes from. ...I don\'t want to go near it. I don\'t know why.', n);
      return J.say(['The man in the tower. I keep thinking I know his voice.', 'Isn\'t that silly? I don\'t know anybody.'], n);
    }
    await J.say(['...You\'re moving.', 'Nobody moves here. Only me. And Lumi.'], n);
    await J.say(['I\'m Nell. I think. I live in the grey place. I always have.', 'Now everything is the grey place. Everyone\'s here with me. They\'re living their best day, again and again.', 'They\'re happy. ...Are they? They don\'t look at each other.'], n);
    await J.say(['The ones with the lights - the Wardens. Their lights are still burning, a little. Like candles.', 'If someone stepped into their best day and fought them - really fought - I think they\'d wake up. You can\'t sleep through a real battle.'], n);
    await J.say(['And your friend. The girl with the orange cap. She\'s by the sea, in the grey under the grey.', 'With a little boy who laughs at the same joke, over and over.', 'She\'s crying. I didn\'t know you could cry here.'], n);
    J.set('m10nell');
    await J.say('(You write it in the notebook. The courier office in town might still have a Corviknight flying to Tidemark - or Postmark can take you there.)');
  });
  on('m10bram', { needs: ['longnight', 'm8ballA', 'm8ballB', 'm8ballC'], sets: ['m10champ'] }, async (J, n) => {
    if (J.flag('m10champ')) return;
    const balls = ['m8ballA', 'm8ballB', 'm8ballC'].filter(f => J.flag(f) && J.has(f));
    if (balls.length < 3) return J.say(['Champion! Champion Bram! They\'re calling my name! Forty thousand of them!', '...But where\'s my team? They should be here. They\'re always here on the big day. Where did they go?', '(The old man stands straight and young-eyed in his red coat, waiting for a team that isn\'t with him.)'], n);
    await J.say(['Today\'s the day! Champion of Meridia! Hear them? They\'re chanting my name!', '...But where\'s my team? They\'re always with me on the big day. Always.'], n);
    await J.say('The three faded Poké Balls in your bag grow warm. Then hot. Then they spring open.');
    await J.say(['An old Arcanine, grey at the muzzle. A huge, scarred Gyarados, coiling in the grey snow. A gentle Dragonite with white whiskers.', 'They go to him. Slowly. Like they\'re afraid he\'ll look straight through them.']);
    await J.say(['...Ember?', 'Tide. Gale. Oh, look at you. Look at all of you.', 'Where have you been? I\'ve been waiting for you all day. All day. All... all these years?'], n);
    await J.say(['You. Young one. You brought them home, didn\'t you?', 'Then the least an old Champion can do is give you his best. Full strength. No holding back. That\'s how we did it, in my day!'], n);
    const r = await J.battle({ id: 'm10bram', name: 'Champion Bram', look: 'm8bram', team: [['machamp', 52], ['aerodactyl', 52], ['arcanine', 53], ['gyarados', 53], ['dragonite', 55]], pay: 120, theme: 'stadium', canLose: true,
      before: 'For Meridia, for my team - for TODAY!', lose: 'HA! Now THAT is a battle!', win: 'Still got it! Ha ha!' }, n);
    if (r !== 'win') return J.say(['Ha! Not bad, not bad at all! Come back when you\'ve warmed up - I\'m not going anywhere!', '(Bram grins at you with all his old fire. He isn\'t looking through you any more.)'], n);
    await J.say(['...', 'I remember.', 'Not just today. All of it. The League. The final against young Ada and her Lapras - she beat me, you know, and I laughed for a week.', 'Fen. My Fen. I forgot her name last winter. I remember it now.'], n);
    await J.say(['This grey light wanted me to keep one perfect day. But it gave me back the rest of them instead.', 'Funny old world.'], n);
    for (const f of ['m8ballA', 'm8ballB', 'm8ballC']) J.take(f);
    await J.say(['Here. I saved this for forty years, for a trainer worth it. I never met one. Until today.'], n);
    await J.give('master');
    await J.give('tm:shadow-ball');
    J.set('m10champ');
    await J.fade(() => J.refresh());
    await J.say('Bram walks home through the grey snow with his old team around him, telling them about his granddaughter.');
  });
  on('m10bramAfter', {}, (J, n) => J.say(J.flag('dawn') ? ['Morning! A real one! Fen made pancakes. Ember ate them.', 'Come and battle me again some day. I\'ll remember you. I promise. I\'ll write it down to be safe.'] : ['Ember\'s asleep on my feet. Tide\'s in the bath, which is a problem. Gale brought me a fish.', 'Whatever you\'re fighting up on that mountain - go and win it. An old Champion says so.'], n));

  // =====================================================================
  //  Tidemark's Echo: the afternoon Cassius kept of Teo
  // =====================================================================
  if (M.tidemark) {
    echoTwin('tidemark', 'echo_tidemark', [{ x: 19, y: 20 }], { name: 'Tidemark (Echo)', chapter: 10,
      signs: [{ x: 16, y: 19, text: 'Chalked on the boardwalk, in a little boy\'s writing:\nTEO - 7 SKIPS - WORLD RECORD!!!' }],
      items: [{ x: 3, y: 20, item: 'rarecandy', n: 1, hidden: true }, { x: 27, y: 19, item: 'ultra', n: 2 }],
      npcs: [{ id: 'teo', x: 15, y: 24, dir: 'down', look: L.teo, name: 'Teo', talk: 'm10teo' },
        { id: 'juno', x: 14, y: 22, dir: 'down', look: L.juno, name: 'Juno', talk: 'm10juno', show: ['!junoback10'] }] },
    B => { B.fill(2, 2, 3, 3, '*').fill(22, 2, 27, 6, '*').fill(1, 18, 4, 18, '*'); });
  }
  on('m10teo', { needs: ['longnight'], sets: ['m10teo'] }, async (J, n) => {
    await J.say(['Juno! Juno, watch! Watch this one!', '...SEVEN! Seven skips! Did you see? I\'m telling EVERYONE!'], n);
    await J.say(J.flag('junoback10') ? ['He picks up the same flat stone. He throws it. It skips seven times.', 'Beside him on the boards, someone has left a smooth, flat stone - lined up neatly, like a promise.'] :
      ['He picks up the same flat stone from the same spot on the boards. He throws it. It skips seven times.', 'He turns, grinning, to show the Juno who is standing right beside him.', 'He doesn\'t see her. He sees the Juno of last summer.']);
    if (!J.flag('m10teo')) J.set('m10teo');
  });
  on('m10juno', { needs: ['m10teo'], sets: ['junoback10'] }, async (J, n) => {
    if (J.flag('junoback10')) return;
    if (!J.flag('m10teo')) return J.say(['Shh. Don\'t. Just... watch him a second.', 'Look at him. He\'s not fading. He\'s never going to fade again.'], n);
    await J.say(['...He\'s said that eleven times. I counted.', 'Same stone. Same seven skips. Same "I\'m telling EVERYONE".'], n);
    await J.say(['He doesn\'t know I\'m here. He isn\'t talking to me. He\'s talking to the me from last summer.', 'Cassius didn\'t save him, {NAME}. He kept one afternoon of him. Like a photo. Like a lantern.',
      'And the real Teo? Back home? He\'s at the kitchen table. Smiling at nothing. He doesn\'t even look up.'], n);
    await J.say('Juno sits down hard on the grey boards and puts her face in her hands.');
    await J.ask('What do you do?', ['Sit down beside her', 'We\'ll bring the real Teo back'], n);
    await J.say(['...', 'I gave him your key. I took it off your neck while you were asleep. I can\'t un-give it.', 'But I can help you take it back.'], n);
    await J.say(['I\'m sorry, {NAME}. I\'m so, so sorry. And I\'m going to say it every day until you\'re sick of it.', 'Okay. Okay! Plan. Courier\'s plan.'], n);
    await J.say(['Wake the Wardens - Mara here and Rhoswen in Highwatch, at least. We\'ll need their Lights burning behind us, or that tower will swallow us whole.',
      'Then meet me at the summit. In front of the Great Lantern. Courier\'s promise: I\'ll be there before you.', 'Anything, anywhere, by morning. ...Even this morning. Even a morning that won\'t come.'], n);
    await J.fade(() => J.hideNpc('juno'));
    J.set('junoback10');
    await J.say('Behind you, Teo picks up the same flat stone, and throws it, and turns around to grin at nobody.');
  });

  // =====================================================================
  //  The summit: Juno and you against Cassius's elite (a tag battle - the
  //  engine fights one on one, so: three rounds back to back, with Juno
  //  healing your team between them)
  // =====================================================================
  if (M.greatlantern) {
    M.greatlantern.npcs.push({ id: 'juno10', x: 13, y: 15, dir: 'up', look: L.juno, name: 'Juno', talk: 'm10tag', show: ['junoback10', '!tagwin'] },
      { id: 'pell', x: 12, y: 12, dir: 'down', look: L.agent, name: 'Agent Pell', talk: 'm10elite', show: ['longnight', '!tagwin'] },
      { id: 'hask', x: 14, y: 12, dir: 'down', look: L.hask, name: 'Director Hask', talk: 'm10elite', show: ['longnight', '!tagwin'] },
      { id: 'isolde2', x: 17, y: 12, dir: 'down', look: L.m9captain, name: 'Captain Isolde', talk: 'm10elite', show: ['longnight', '!tagwin'] });
  }
  const ROUNDS = [
    { flag: 'm10tag1', who: 'pell', name: 'Agent Pell', look: 'agent', team: [['honchkrow', 47], ['toxicroak', 48], ['magneton', 48], ['banette', 48]],
      before: 'The child from Tidemark. And the courier. How... sentimental.', intro: ['Ah. The child from Tidemark. Do you remember Driftwood Cove? I do. I\'ve been told to remember everything, now.', 'And Miss Reyes. Mr. Vale did keep his word to you, you know. Ungrateful of you.'] },
    { flag: 'm10tag2', who: 'isolde2', name: 'Captain Isolde', look: 'm9captain', team: [['magnezone', 48], ['houndoom', 48], ['crobat', 49], ['froslass', 49], ['doublade', 50]],
      before: 'Not twice. Not on my ridge.', intro: ['You again. Twice is a pattern, child. I don\'t permit patterns.'] },
    { flag: 'tagwin', who: 'hask', name: 'Director Hask', look: 'hask', team: [['magnezone', 50], ['houndoom', 50], ['doublade', 50], ['crobat', 50], ['chandelure', 51]],
      before: 'Nothing gets lost. Not even this battle. Especially not this one.', intro: ['Enough. I am Director Hask, and this door is mine to keep.', 'Mr. Vale is upstairs with the only day he has ever wanted. I will not let two children take it from him.'] }
  ];
  const JUNO_HELP = [['Juno\'s Lucario steps in front of your team, palms glowing. A warm blue light washes over them.', 'Courier first aid! Don\'t thank me. Don\'t you DARE thank me. Next!'],
    ['Juno\'s Staraptor beats the cold wind back while her Manectric crackles at the guards.', 'Juno tosses you a battered med-kit: "Everything I\'ve got. Patched up? Good. One more."']];
  on('m10elite', {}, (J, n) => J.say(J.flag('junoback10') ? ['The courier is waiting for you, child. Go on - say your goodbyes to each other first.', 'We are in no hurry. Nothing is ever lost, now. Not even time.'] : ['Mr. Vale is not receiving visitors. Least of all you.', 'Go home, child. Enjoy the light. Oh - you can\'t, can you? How sad.'], n));
  on('m10tag', { needs: ['junoback10', 'wake.mara', 'wake.rhoswen'], sets: ['m10tag1', 'm10tag2', 'tagwin', 'ch11'] }, async (J, n) => {
    if (J.flag('tagwin')) return;
    const elite = { name: 'Director Hask', look: 'hask' };
    if (!J.flag('junoback10')) return J.say(['Mr. Vale is not receiving visitors. Least of all you.', 'Go home, child. Enjoy the light. Oh - you can\'t, can you? How sad.'], elite);
    if (!J.flag('wake.mara') || !J.flag('wake.rhoswen')) return J.say(['Not yet. Look at them - three of Cassius\'s best, and all their Pokémon fresh.', 'Wake Mara and Rhoswen first. With their Lights burning behind us, we\'ve got a chance. Without them, we\'re just two kids on a mountain.'], { name: 'Juno', look: 'juno' });
    await J.say(['You came. Ha. Of course you came. I got here first, though. Courier\'s promise.', 'Three of them. Two of us. Side by side, {NAME}. Like old times. Like last week. Ugh, you know what I mean.'], { name: 'Juno', look: 'juno' });
    for (let i = 0; i < ROUNDS.length; i++) {
      const R = ROUNDS[i];
      if (J.flag(R.flag)) continue;
      await J.say(R.intro, R.who);
      const r = await J.battle({ id: 'm10' + R.who, name: R.name, look: R.look, team: R.team, pay: 70, theme: 'icecave', before: R.before, lose: 'Impossible...', win: 'Go home.' }, R.who);
      if (r !== 'win') return;
      J.set(R.flag);
      if (i < JUNO_HELP.length) { await J.say(JUNO_HELP[i]); await J.heal(true); await J.say('Your team is fully healed!'); }
    }
    await J.say(['...Two children.', 'He told me you would be lonely. He was wrong about that, too.'], 'hask');
    await J.fade(() => { J.hideNpc('pell'); J.hideNpc('isolde2'); J.hideNpc('hask'); });
    await J.say('The Lumen elite withdraw down the ridge. The great brass doors of the tower stand open - a key still turned in the old stone lock.');
    await J.say(['He left it in the door. My key. Your key. Whatever.', 'Come on, {NAME}. Let\'s go get it back. And then let\'s go get my brother back.'], { name: 'Juno', look: 'juno' });
    await J.chapter('Chapter 10 complete!', 'Next: Chapter 11 - The Lantern at the End of the World');
    J.set('ch11'); J.refresh();
    await J.chapter('Chapter 11', 'The Lantern at the End of the World');
  });

  M.echo_tidemark && (M.echo_tidemark.chapter = 10);
  chapter({ n: 10, title: 'Everyone\'s Best Day', start: { map: 'highwatch', x: 14, y: 22, dir: 'down' }, level: 48, badge: null, center: 'm8center',
    goals: ['wake.mara', 'wake.rhoswen', 'junoback10', 'tagwin', 'ch11'] });
})();
