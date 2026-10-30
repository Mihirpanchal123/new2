'use strict';
// =====================================================================
//  JOURNEY II - Chapter 11: The Lantern at the End of the World.
//  The Great Lantern on the summit of Frostcrown (Chapter 9's
//  greatlantern; its tower door leads here). Juno holds the door while
//  you climb three floors of Lumen elites and Day-Locks - one floor
//  only crossable through the Echo - to the lamp room at the top.
//  Cassius; Nell remembers him, and lets go; the Warden of the Veil
//  wakes in rage and is calmed; Cassius gives up his lantern to seal
//  the Echo; and the Long Night ends at dawn.
//  Story: docs/journey2/story.md · Build plan: docs/journey2/world.md
// =====================================================================
(() => {
  const { def, grid, L, M, echoTwin } = MMaps;
  const { on, ITEMS, TRAINERS, chapter, CLUES, T } = MStory;

  // ---- new people
  Object.assign(L, {
    m11elite: { hat: 'beanie', hatColor: 0xf4f4f4, hatFront: 0xd8a028, hair: 0x2a2a3a, hairStyle: 'short', top: 0xf4f4f4, sleeves: 'long', inner: 0xd8a028, legs: 0x3a3a48, legStyle: 'pants', shoes: 0x1a1a24, bag: null, scarf: 0xd8a028 },
    m11elitef: { hat: 'beanie', hatColor: 0xf4f4f4, hatFront: 0xd8a028, hair: 0x1a1a24, hairStyle: 'long', top: 0xf4f4f4, sleeves: 'long', inner: 0xd8a028, legs: 0x3a3a48, legStyle: 'skirt', shoes: 0x1a1a24, bag: null, scarf: 0xd8a028 },
    // the memory of a younger Cassius, kept in the Echo
    m11young: { hat: null, hair: 0x5a3a20, hairStyle: 'short', top: 0xb8b8c8, sleeves: 'long', inner: 0xe8e8f0, legs: 0x9a9aa8, legStyle: 'pants', shoes: 0x6a6a78, bag: null, scarf: 0xd8d8e0 }
  });

  // ---- items
  ITEMS['tm:shadow-ball'] = ITEMS['tm:shadow-ball'] || { name: 'TM Shadow Ball', pocket: 'tms', price: 0, tm: 'shadow-ball', desc: 'Teaches Shadow Ball: a shadowy blob that may lower Sp. Def.' };
  ITEMS['tm:psychic'] = ITEMS['tm:psychic'] || { name: 'TM Psychic', pocket: 'tms', price: 0, tm: 'psychic', desc: 'Teaches Psychic: a strong telekinetic attack that may lower Sp. Def.' };

  // ---- the clue notebook
  Object.assign(CLUES, {
    m11enter: 'The Great Lantern. Juno is holding the door below. Cassius is at the very top, by the great lamp.',
    m11nellEcho: 'Nell is climbing the Lantern too, on the Echo side. The light at the top "feels like a hand I used to hold."',
    m11memory: 'In the Echo: a young Cassius, a home-made lantern, a little girl. "One lantern for every day I want to remember."',
    m11gate: 'Three Day-Locks sealed the last stairs. Released, their stolen days streamed home. One was only in the Echo.',
    cassius: 'I beat Cassius. "The Lantern doesn\'t need me to win. It only needs me to hold on."',
    nellbye: 'Nell remembered her father - and asked him to let her go. "You\'re not losing me. You\'re remembering me."',
    veilcalm: 'The Warden of the Veil is calm. Cassius gave it his lantern, with Nell\'s little flame inside, to seal the Echo.',
    dawn: 'DAWN. The Long Night is over. The colour is back in Meridia.'
  });

  // ---- trainers: Lumen elites (51-55), Agent Pell, Cassius (55-57)
  Object.assign(TRAINERS, {
    m11elite1: { team: [['houndoom', 51], ['magnezone', 51], ['crobat', 52]], pay: 36, theme: 'city', look: 'm11elite', name: 'Lumen Elite Corrigan', before: 'Good evening. Or is it? It has been evening for quite some time now. Forgive me - I must stop you.', lose: 'I do apologise for losing. Truly.', after: 'Mr. Vale only wanted a world where nobody loses anything. I lost just now, and I find I don\'t mind as much as I expected.' },
    m11elite2: { team: [['lampent', 51], ['toxicroak', 52], ['honchkrow', 52]], pay: 36, theme: 'city', look: 'm11elitef', name: 'Lumen Elite Ottoline', before: 'You came up the mountain in the Long Night? How rude of you to be so brave. Shall we?', lose: 'Oh dear. Oh dear, oh dear.', after: 'The stairs to the top are behind three Day-Locks. Each one holds a day we took. I always wondered whose.' },
    m11elite3: { team: [['doublade', 52], ['golbat', 51], ['magneton', 52]], pay: 36, theme: 'city', look: 'm11elite', name: 'Lumen Elite Hale', before: 'This floor is the foundry. We forged every lantern in Meridia right here. Including yours, probably.', lose: 'Melted down. Fair enough.', after: 'Every free lantern had a little hook inside it, for the memories. We were very proud of the hook. I\'m less proud now.' },
    m11elite4: { team: [['banette', 52], ['houndoom', 53], ['doublade', 53]], pay: 36, theme: 'city', look: 'm11elitef', name: 'Lumen Elite Marisol', before: 'The bridge? Oh, we took it down when the tower was finished. Nobody is meant to cross. So sorry!', lose: 'You\'ll never cross anyway. ...Will you?', after: 'Strange. I could swear I saw a girl in grey walking on air above the gap.' },
    m11elite5: { team: [['froslass', 52], ['sableye', 53], ['crobat', 53]], pay: 36, theme: 'city', look: 'm11elite', name: 'Lumen Elite Tamsin', before: 'How did you get across?! There\'s no bridge! Is there a bridge? I\'ve worked here for years!', lose: 'There was a bridge. In the past. I KNEW it.', after: 'If you\'ve been walking in the Echo, you\'ve seen what the whole world will look like. Grey. Still. Safe.' },
    m11echokeeper: { team: [['lampent', 52], ['dusclops', 53], ['spiritomb', 53]], pay: 30, theme: 'city', look: 'keeper', name: 'Echo of a Lightkeeper', before: 'Today is my first day at the Lumen Company! The very first! Isn\'t it a wonderful day? It always is!', lose: 'What a wonderful day... What a wonderful... how many times have I said that?', after: 'My first day. My first day. I think it was a long time ago. I think I should go home.' },
    m11elite6: { team: [['honchkrow', 53], ['toxicroak', 53], ['magnezone', 54]], pay: 36, theme: 'city', look: 'm11elitef', name: 'Lumen Elite Wren', before: 'The Memory Engine is the heart of the Lantern. If you open the Day-Locks, it all comes pouring out. Please don\'t.', lose: 'You\'re going to open them, aren\'t you.', after: 'Go on, then. Somewhere out there, someone is about to remember their own birthday.' },
    m11pell: { team: [['crobat', 54], ['toxicroak', 54], ['houndoom', 54], ['doublade', 55]], pay: 40, theme: 'city', look: 'agent', name: 'Agent Pell', before: 'The child from Tidemark. You REMEMBER me? How very inconvenient. Shall we be civil one last time?', lose: 'Well. I suppose I\'ll have to remember this one too.', after: 'Mr. Vale is at the top. He hasn\'t slept since the Lantern was lit. Do be gentle with him - nobody else ever was.' },
    m11cassius: { team: [['mismagius', 55], ['dusknoir', 55], ['aegislash', 56], ['chandelure', 56], ['gardevoir', 57], ['metagross', 57]], pay: 120, theme: 'icecave', look: 'cassius', name: 'Cassius Vale',
      before: 'I am sorry, {NAME}. I truly am. But I will not be late again!', lose: '...Even now, it is so very bright.', win: 'Forgive me. Some of us cannot afford to lose.' }
  });

  // =====================================================================
  //  The Great Lantern, 1F - the Foundry. A narrow door from the summit
  //  into a foyer (Juno's camp), then a long hall with three rooms off
  //  it; the stairs are in the far west room.
  // =====================================================================
  // Chapter 9 builds the summit (greatlantern) with a tower whose door leads here. Until that file is loaded (a chapter
  // checked on its own), the foyer has no way out and the chapter starts inside it, so the checker can still play it.
  const GL = !!M.greatlantern;
  def({ id: 'lantern1', name: 'Great Lantern - Foundry', kind: 'inside', outside: GL ? 'greatlantern' : undefined, isCenter: true, music: 'gym', battle: 'city',
    rows: [
      '#####################',
      '#<hhhhhh#hhhhhh#hhhh#',
      '#hhhhhhh#hhhhhh#hhhh#',
      '#hhkkhhh#hh==hh#hhhh#',
      '#hhkkhhhhhh==hhhhhhh#',
      '#hhhhhhh#hh==hh#hhhh#',
      '##hhh####hh==hh###hh#',
      '#hhhhhhhhhh==hhhhhhh#',
      '#hhRRRRRRRRRRRRRRRhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#########hhh#########',
      '######hhhhhhhhh######',
      '######hhhhhhhhh######',
      '######hhhhhhhhh######',
      '######hhhh' + (GL ? 'm' : 'h') + 'hhhh######'],
    arrive: { x: 10, y: 14 },
    furniture: [{ k: 'statue', x: 6, y: 12, talk: 'm11statue' }, { k: 'statue', x: 14, y: 12, talk: 'm11statue' }, { k: 'plant', x: 6, y: 14 }, { k: 'plant', x: 14, y: 14 },
      { k: 'machine', x: 16, y: 1, talk: 'm11forge' }, { k: 'boxes', x: 9, y: 5 }, { k: 'boxes', x: 14, y: 1 }, { k: 'boxes', x: 1, y: 5 }],
    signs: [{ x: 8, y: 12, text: 'THE GREAT LANTERN\nLumen Company. Authorised staff only.\n"Nothing lost. Nothing forgotten. Nothing ever again."' }],
    warps: [{ x: 1, y: 1, to: 'lantern2', tx: 10, ty: 15, dir: 'up' }],
    zones: [{ x: 9, y: 11, w: 3, h: 1, event: 'm11enter' }],
    items: [{ x: 19, y: 1, item: 'hyperpotion', n: 2 }, { x: 9, y: 1, item: 'ultra', n: 2, hidden: true }, { x: 1, y: 10, item: 'revive', n: 1 }, { x: 6, y: 5, item: 'fullheal', n: 2, hidden: true }],
    npcs: [{ id: 'juno', x: 12, y: 13, dir: 'left', look: L.juno, name: 'Juno', talk: 'm11juno', show: ['!dawn'] },
      { id: 'e1', x: 2, y: 3, dir: 'down', look: L.m11elite, name: 'Lumen Elite Corrigan', trainer: 'm11elite1' },
      { id: 'e2', x: 12, y: 9, dir: 'left', look: L.m11elitef, name: 'Lumen Elite Ottoline', trainer: 'm11elite2' },
      { id: 'e3', x: 17, y: 3, dir: 'down', look: L.m11elite, name: 'Lumen Elite Hale', trainer: 'm11elite3' }] });

  // =====================================================================
  //  2F - the Hall of Kept Days. A chasm splits the floor: the bridge was
  //  taken down when the tower was finished... but in the Echo, the day
  //  it still stood is kept. Cross over through the shrines.
  // =====================================================================
  def({ id: 'lantern2', name: 'Great Lantern - Hall of Kept Days', kind: 'inside', music: 'gym', battle: 'city',
    rows: [
      '#####################',
      '#hhhhhhhhh<hhhhhhhhh#',
      '#hhhhhh#hhhhh#hhhhhh#',
      '#hhPPPhhhhhhhhhPPPhh#',
      '#hhPPPhhhhhhhhhPPPhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#kkkkkkkkkkkkkkkkkkk#',
      '#kkkkkkkkkkkkkkkkkkk#',
      '#kkkkkkkkkkkkkkkkkkk#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhRRRhhhhhhhhhRRRhh#',
      '#hhRRRhhhhhhhhhRRRhh#',
      '#hhhhhh#hhhhh#hhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhh>hhhhhhhhh#',
      '#####################'],
    furniture: [{ k: 'shelf', x: 1, y: 1, talk: 'm11jars' }, { k: 'shelf', x: 18, y: 1, talk: 'm11jars' }, { k: 'shelf', x: 1, y: 16, talk: 'm11jars' }, { k: 'shelf', x: 18, y: 16, talk: 'm11jars' }],
    signs: [{ x: 10, y: 10, text: 'HALL OF KEPT DAYS\nBridge removed on completion of the tower.\nThere is nothing on the other side you need.' }],
    warps: [{ x: 10, y: 16, to: 'lantern1', tx: 2, ty: 1, dir: 'right' }, { x: 10, y: 1, to: 'lantern3', tx: 10, ty: 13, dir: 'up' }],
    items: [{ x: 19, y: 2, item: 'ultra', n: 2 }, { x: 1, y: 15, item: 'hyperpotion', n: 1, hidden: true }],
    npcs: [{ id: 'e4', x: 5, y: 11, dir: 'right', look: L.m11elitef, name: 'Lumen Elite Marisol', trainer: 'm11elite4' },
      { id: 'e5', x: 15, y: 6, dir: 'left', look: L.m11elite, name: 'Lumen Elite Tamsin', trainer: 'm11elite5' }] });
  // the Echo of 2F: the bridge still stands; the stairs were never built
  echoTwin('lantern2', 'echo_lantern2', [{ x: 17, y: 15 }, { x: 3, y: 5 }], {
    name: 'Hall of Kept Days (Echo)',
    items: [{ x: 19, y: 5, item: 'maxrevive', n: 1 }, { x: 2, y: 15, item: 'rarecandy', n: 1, hidden: true }],
    npcs: [{ id: 'nell', x: 12, y: 10, dir: 'left', look: L.nell, name: 'Nell', talk: 'm11nellEcho', show: ['!cassius'] },
      { id: 'echokeeper', x: 4, y: 2, dir: 'down', look: L.keeper, name: 'Echo of a Lightkeeper', trainer: 'm11echokeeper' }]
  }, B => { B.fill(9, 7, 11, 9, 'R').put(10, 1, 'h').put(10, 16, 'h').put(10, 10, 'h'); });

  // =====================================================================
  //  3F - the Memory Engine. Three Day-Locks hold the light barrier over
  //  the last stairs; the third stands in a room that was walled up in
  //  the real tower, but was still open on the day the Echo kept.
  // =====================================================================
  def({ id: 'lantern3', name: 'Great Lantern - Memory Engine', kind: 'inside', music: 'gym', battle: 'city',
    rows: [
      '#####################',
      '#hhhhhhhh#<#hhhhhhhh#',
      '#hhhhhhhh#h#hhhhhhhh#',
      '#hhhhhhhh#h#hhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '#hhhhRRRRRRRRRRRhhhh#',
      '#hhhhhhhhhhhhhhhhhhh#',
      '######hhhhhhhhh######',
      '#hhhh#hhhhhhhhh#hhhh#',
      '#hhhh#hhhPPPhhh#hhhh#',
      '#hhhh#hhhPPPhhhhhhhh#',
      '#hhhh#hhhhhhhhh#hhhh#',
      '######hhhhhhhhh######',
      '#hhhhhhhhh>hhhhhhhhh#',
      '#####################'],
    furniture: [{ k: 'machine', x: 2, y: 1, talk: 'm11lock1' }, { k: 'machine', x: 17, y: 9, talk: 'm11lock2' }, { k: 'pc', x: 12, y: 3, talk: 'm11console' },
      { k: 'boxes', x: 1, y: 14 }, { k: 'boxes', x: 19, y: 14 }],
    warps: [{ x: 10, y: 14, to: 'lantern2', tx: 10, ty: 2, dir: 'down' }, { x: 10, y: 1, to: 'lanterntop', tx: 8, ty: 11, dir: 'up' }],
    zones: [{ x: 10, y: 3, w: 1, h: 1, event: 'm11barrier', block: true }],
    items: [{ x: 19, y: 1, item: 'ultra', n: 3 }, { x: 1, y: 7, item: 'rarecandy', n: 1, hidden: true }, { x: 19, y: 12, item: 'revive', n: 2 }],
    npcs: [{ id: 'e6', x: 17, y: 5, dir: 'left', look: L.m11elitef, name: 'Lumen Elite Wren', trainer: 'm11elite6' },
      { id: 'pell', x: 8, y: 4, dir: 'right', look: L.agent, name: 'Agent Pell', trainer: 'm11pell' }] });
  // the Echo of 3F: the west room is still open, and someone is remembering in it
  echoTwin('lantern3', 'echo_lantern3', [{ x: 13, y: 12 }], {
    name: 'Memory Engine (Echo)',
    furniture: [{ k: 'machine', x: 2, y: 9, talk: 'm11lock3' }],
    items: [{ x: 1, y: 12, item: 'tm:shadow-ball', n: 1 }],
    npcs: [{ id: 'memory', x: 3, y: 11, dir: 'right', look: L.m11young, name: 'A memory', talk: 'm11memory' }]
  }, B => { B.fill(5, 10, 5, 11, 'h').put(10, 1, '#').put(10, 14, 'h'); });

  // =====================================================================
  //  The Crown - the lamp room at the top of the world, open to the sky
  // =====================================================================
  def({ id: 'lanterntop', name: 'Great Lantern - The Crown', kind: 'inside', music: 'gym', battle: 'icecave',
    rows: [
      '#################',
      '#kkkkkkkkkkkkkkk#',
      '#kkhhhhhhhhhhhkk#',
      '#khhhhhhhhhhhhhk#',
      '#khhhhhhhhhhhhhk#',
      '#khhhhPPPPPhhhhk#',
      '#khhhhPPPPPhhhhk#',
      '#khhhhhhhhhhhhhk#',
      '#khhhhhhhhhhhhhk#',
      '#kkhhhhhhhhhhhkk#',
      '#kkkkhhhhhhhkkkk#',
      '#kkkkkhhhhhkkkkk#',
      '#kkkkkkh>hkkkkkk#',
      '#################'],
    furniture: [{ k: 'machine', x: 7, y: 2, talk: 'm11lamp' }, { k: 'statue', x: 3, y: 3, talk: 'm11crownStatue' }, { k: 'statue', x: 13, y: 3, talk: 'm11crownStatue' }],
    warps: [{ x: 8, y: 12, to: 'lantern3', tx: 10, ty: 2, dir: 'down' }],
    zones: [{ x: 5, y: 10, w: 7, h: 1, event: 'm11crown' }],
    items: [{ x: 14, y: 8, item: 'maxrevive', n: 1, hidden: true }],
    npcs: [{ id: 'cassius', x: 8, y: 5, dir: 'up', look: L.cassius, name: 'Cassius Vale', talk: 'm11cassius', show: ['!cassius'] },
      { id: 'cassius2', x: 8, y: 5, dir: 'down', look: L.cassius, name: 'Cassius Vale', talk: 'm11veil', show: ['cassius', '!veilcalm'] },
      { id: 'cassius3', x: 8, y: 5, dir: 'down', look: L.cassius, name: 'Cassius Vale', talk: 'm11cassiusAfter', show: ['veilcalm'] },
      { id: 'nell', x: 6, y: 7, dir: 'right', look: L.nell, name: 'Nell', talk: 'm11nell', show: ['cassius', '!nellbye'] }] });

  for (const id of ['lantern1', 'lantern2', 'echo_lantern2', 'lantern3', 'echo_lantern3', 'lanterntop']) M[id].chapter = 11;

  // =====================================================================
  //  Events
  // =====================================================================
  const JUNO = { name: 'Juno', look: 'juno' }, OKAFOR = { name: 'Prof. Okafor', look: 'okafor' };
  const mine = J => J.dname(J.get('mystarter') || 'eevee');

  // ---- 1F: Juno holds the door
  on('m11enter', { needs: ['!m11enter'], sets: ['m11enter', 'echo'] }, async J => {
    await J.say(['The door of the Great Lantern booms shut behind you. Inside, the air hums like a held breath.', 'Somewhere far above, a light is drinking the whole world.']);
    J.emote('juno', '!');
    await J.say(['Phew - made it! Sorry, the stairs outside are murder. Who builds a tower on a MOUNTAIN?', 'Okay. Listen. The Lightkeepers are going to come up behind us the second they notice. Somebody has to hold this door.'], 'juno');
    await J.say(['And that somebody is me. Don\'t argue. You\'re the one who remembers things, so you\'re the one who goes up.', 'I said goodbye to an echo of Teo already, {NAME}. One afternoon, over and over. I\'m not saying goodbye to the real one.'], 'juno');
    await J.say(['Courier\'s honour: anyone who comes through that door goes through me first.', 'And if you get knocked flat up there, come back down. I\'ve got a whole kit. Now GO.'], 'juno');
    // the shrines have answered since Chapter 3; inside the Lantern the Echo presses even closer
    J.set('m11enter'); J.set('echo');
    await J.say(`The Lantern's hum rises and falls, like breathing. ${mine(J)} stares at the old stone lanterns set into the walls upstairs: here, the Echo is only a step away.`);
  });
  on('m11juno', {}, async (J, n) => {
    if (!J.flag('m11enter')) return J.say('Go on - I\'ve got the door!', n);
    await J.say(J.pick([['Nobody\'s come through yet. One Lightkeeper looked in, saw my face, and said "sorry, wrong tower".'],
      ['Teo used to say I run too fast to be scared. That\'s not true. I\'m just faster than the scared.'],
      ['When this is over you owe me a race. A real one. On the pier. Like when we were little.']]), n);
    if (await J.ask('Patch up your team?', ['Yes, please', 'I\'m fine'], n) !== 0) return J.say('Then get climbing! Up, up, UP!', n);
    await J.healCenter();
    await J.say('Good as new. Reyes Couriers: anything, anywhere, by morning. Let\'s make sure there IS a morning.', n);
  });
  on('m11statue', {}, J => J.say('A white statue of a Lightkeeper holding a lantern up to the sky. The plaque reads: "TO MERIDIA - NOTHING LOST."'));
  on('m11forge', {}, J => J.say(['A lantern forge, still warm. Half-finished Lumen lanterns hang from its hooks.', 'Inside each one is a tiny brass hook, shaped just right for catching something that isn\'t there.']));

  // ---- 2F: the jars, and Nell on the Echo side
  on('m11jars', {}, J => J.say(J.pick([['Shelves of glass jars, each one full of slow grey light.', 'The labels are dates. Thousands of them. Someone\'s Tuesday. Someone\'s wedding.'],
    ['A jar labelled "Lantern Night". Inside, very faintly, a whole village is singing.'],
    ['A jar labelled with today\'s date. It is empty. Waiting.']])));
  on('m11nellEcho', { sets: ['m11nellEcho'] }, async (J, n) => {
    if (J.flag('m11nellEcho')) return J.say(['The light at the top is so warm. I keep climbing toward it.', 'Don\'t wait for me, {NAME}. I\'m slow on stairs. I don\'t know why. I think... I think I used to be smaller.'], n);
    J.emote('nell', '!');
    await J.say([`{NAME}! And ${mine(J)}! You came into the Echo again.`, 'This is a nice place. The bridge is still here. I used to walk across it when it was new... no. That\'s not right. I\'ve never been here before.'], n);
    await J.say(['The light at the top of the tower is calling me. It feels like...', '...like a hand I used to hold. A big, warm hand that was always a little bit late.'], n);
    await J.say(['My Litwick keeps pulling at my sleeve. It wants to go up. So I\'m going up.', 'Will you be there too? I think I\'ll be less scared if you\'re there.'], n);
    J.set('m11nellEcho');
  });

  // ---- 3F: the Day-Locks
  const LOCKS = ['m11lock1', 'm11lock2', 'm11lock3'];
  const DAYS = [['Inside, faintly, a birthday song. Six candles. Somebody\'s grandmother laughing.', 'Far below, in a town you can\'t see, someone stops in the middle of the street and says, "Oh! It was MY birthday!"'],
    ['Inside, the sound of rain on a roof, and two people talking until morning.', 'Somewhere in Meridia, two old friends remember the night they decided to stay friends forever.'],
    ['Inside, a first step. A baby Pokémon, wobbling. A whole family cheering.', 'Somewhere, a family looks at their Pokémon and, all at once, remembers the day it first walked.']];
  LOCKS.forEach((f, i) => on(f, { sets: [f] }, async J => {
    if (J.flag(f)) return J.say('An open Day-Lock. Its glass is clear and empty now, and somehow it looks lighter.');
    await J.say(['A Day-Lock: a tall glass cylinder, braced in brass, full of slow grey light.', DAYS[i][0]]);
    if (await J.ask('Open the valve?', ['Let it go', 'Leave it'], null) !== 0) return;
    J.set(f);
    await J.say(['You turn the brass wheel. With a sigh like an opened window, the grey light pours out of the glass and up through the pipes.', DAYS[i][1]]);
    const left = LOCKS.filter(k => !J.flag(k)).length;
    await J.say(left ? `(${3 - left} of 3 Day-Locks open.)` : '(All three Day-Locks are open! The console by the stairs is blinking.)');
  }));
  on('m11console', { needs: ['m11lock1', 'm11lock2', 'm11lock3'], sets: ['m11gate'] }, async J => {
    if (J.flag('m11gate')) return J.say('MEMORY ENGINE - DAY-LOCKS: 3/3 RELEASED\nBARRIER: OFF\nWARNING: THE LANTERN IS GIVING THINGS BACK.');
    const open = LOCKS.filter(k => J.flag(k)).length;
    if (open < 3) return J.say([`MEMORY ENGINE - DAY-LOCKS: ${open}/3 RELEASED\nBARRIER: ON`, open === 2 ? 'Two of the locks are on this floor. The plans on the screen show a third, in a west room that has no door...' : 'The barrier over the stairs is fed by the Day-Locks. Release them all and it will fail.']);
    await J.say('MEMORY ENGINE - DAY-LOCKS: 3/3 RELEASED\nBARRIER... BARRIER... OFF.');
    J.set('m11gate'); J.refresh();
    await J.say(['With a long, falling whine, the light barrier over the stairs flickers and goes out.', 'The whole tower shudders. Far above, something bright stutters - like a heart missing a beat.']);
  });
  on('m11barrier', { needs: ['!m11gate'] }, async J => {
    await J.say('A wall of hard white light seals the stairs. It hums in time with the three Day-Locks on this floor... and one that isn\'t.');
    await J.playerWalk('down', 1);
  });
  on('m11memory', { sets: ['m11memory'] }, async (J, n) => {
    await J.say(['A young man in grey stands in a room that is not there any more, holding up a lopsided paper lantern. He doesn\'t see you.', 'It is a memory, kept by the Echo. It plays itself over and over.']);
    await J.say(['"Nell, look! I made it myself. It\'s a bit crooked. Your papa is better with numbers than with glue."', '"One lantern for every day you want to remember. And this one is for all of them. Every single day with you."'], n);
    await J.say(['"What do you mean, I\'m late? I\'m not late. I\'m... a little bit late."', '"I\'ll be at the station tomorrow. I promise. The 9:40. I\'ll be right there on the platform."'], n);
    await J.say('The memory flickers, and begins again from the start.');
    J.set('m11memory');
  });

  // ---- the Crown: Cassius
  async function crown(J) {
    if (J.flag('cassius')) return;
    if (!J.flag('m11crown')) {
      await J.say(['At the top of the world, the great lamp of the Lantern pours grey light across the sky.', 'A man in white stands before it with his back to you, holding a small brass lantern.']);
      await J.say(['Ah. {NAME}. Of course it\'s you. The one person in Meridia I could never make forget.', 'Do you know what it costs to keep a day? Nothing. That is the beauty of it.'], 'cassius');
      J.face('cassius', 'down');
      await J.say(['In the Echo, nothing is ever lost. No one grows old. No one misses a train.', 'Twenty years ago I put my daughter on the 9:40 to Brassport. I promised I would be on the platform at the other end.'], 'cassius');
      await J.say(['I was late. I was always late. And the train never arrived anywhere at all.'], 'cassius');
      await J.say(['When the Lantern is full, Meridia stops. Every family keeps its best day, forever.', 'And somewhere in all that grey, I will find the day where I was on time.'], 'cassius');
      await J.say(['You walked through my towers, my archives, my gala. You turned the Wardens against me and opened my Day-Locks.', 'You did it because you remember. I envy you, {NAME}. And I cannot let you stop this.'], 'cassius');
      J.set('m11crown');
    } else {
      J.face('cassius', 'down');
      await J.say('Back again. Of course. You never forget, do you?', 'cassius');
    }
    if (await J.battle('m11cassius', 'cassius') !== 'win') return;
    await J.say(['...It doesn\'t matter.', 'The Lantern doesn\'t need me to win. It only needs me to hold on. And I have had twenty years of practice.'], 'cassius');
    await J.say(['Cassius turns back to the great lamp. His knuckles are white around the little brass lantern.', 'And then - at the top of the stairs, where the Echo presses thinnest - a small violet flame flickers into being.']);
    J.set('cassius');
    await J.fade(() => J.refresh());
    await T.m11nell(J);
  }
  on('m11crown', { needs: ['!cassius'], sets: ['m11crown', 'cassius'] }, crown);
  on('m11cassius', { needs: ['!cassius'], sets: ['m11crown', 'cassius'] }, crown);

  // ---- Nell remembers him; father and daughter say goodbye
  on('m11nell', { needs: ['cassius'], sets: ['nellbye'] }, async J => {
    if (J.flag('nellbye')) return;
    await J.say(['A Litwick bobs into the lamp room, trailing grey. Behind it walks a girl in grey, as if up a staircase only she can see.', 'Here, at the top of the Lantern, she is not a reflection. She is really, almost, here.']);
    await J.say(['{NAME}. You waited for me.', 'It\'s so bright up here. I followed it all the way. It felt like...'], 'nell');
    J.face('cassius2', 'left');
    await J.say('...', 'cassius2');
    await J.say('...Papa?', 'nell');
    await J.say(['Cassius Vale, founder of the Lumen Company, falls to his knees.', 'The little brass lantern rolls out of his hand and clatters across the floor.']);
    await J.say(['Nell. Nell. Oh, my Nell.', 'I\'m here. I\'m right here. I\'m so sorry I was late.'], 'cassius2');
    await J.say(['You were always late, Papa.', 'You were late to my recital. And you came home with Litwick in a cardboard box to say sorry. That\'s how I got him.'], 'nell');
    await J.say(['I remember now. I remember everything.', 'The kitchen with the yellow curtains. You singing in the bath, really badly. The lantern you made me for Lantern Night. It was crooked.'], 'nell');
    await J.say(['The 9:40. I sat by the window. I was going to wave at you on the platform.', 'And then everything went grey, and I forgot what I was waving at.'], 'nell');
    await J.say(['Then stay. Please. The Lantern can keep this - keep YOU - forever.', 'I\'ll never be late again. We\'ll never lose another day. Not one.'], 'cassius2');
    await J.say(['Nell looks at her father for a long time. Then, very gently, she shakes her head.']);
    await J.say(['Papa... that isn\'t keeping me. That\'s keeping me STILL.', 'I\'ve been nine for twenty years. I never got to be ten. I never got to be anything.'], 'nell');
    await J.say(['Everyone down there is stuck on their best day. Over and over, until it isn\'t a day any more. It\'s just a picture of one.', 'That\'s not what days are for.'], 'nell');
    await J.say(['I can\'t. I can\'t lose you twice, Nell. I won\'t survive it twice.'], 'cassius2');
    await J.say(['You\'re not losing me, Papa. You\'re remembering me. That\'s different.', `That's what {NAME} does. They remember everything - and it doesn't stop them walking forward. Look at them. Look at ${mine(J)}.`], 'nell');
    await J.say(['So you have to let me go. And you have to let THEM go. All of Meridia.', 'Promise me. Not a late promise. A real one.'], 'nell');
    await J.say(['For a long moment there is no sound at all at the top of the world but the hum of the great lamp.', 'Then Cassius Vale reaches out, and holds his daughter, and nods.']);
    await J.say('...I promise.', 'cassius2');
    await J.say(['Litwick. Go with Papa. Keep him warm for me. And make sure he\'s on time.', 'The little ghost flame floats down into the brass lantern on the floor, and settles there, glowing violet.'], 'nell');
    J.face('nell', 'down');
    await J.say(['{NAME}. Thank you for remembering me, when I couldn\'t.', 'On Lantern Night, will you send up one lantern for me? Not to keep me. Just to say goodbye properly.'], 'nell');
    await J.say(['Goodbye, Papa. I love you.', 'Don\'t be late for the rest of your life.'], 'nell');
    await J.fade(async () => { J.set('nellbye'); J.refresh(); await J.wait(700); });
    await J.say(['Where she stood, there is only a little grey light, drifting up and away through the open roof of the Lantern, like a lantern of its own.', 'Cassius watches it until it is gone. Then he picks up his brass lantern, very carefully, with both hands.']);
    await J.say('...Goodbye, Nell.', 'cassius2');
    await T.m11veil(J);
  });

  // ---- the Warden of the Veil wakes; Cassius gives up his lantern; dawn
  async function veilBattle(J) {
    let r = await J.battle({ wild: true, team: [['golurk', 60]], theme: 'icecave', canLose: true });
    while (r === 'ran') { await J.say('There is nowhere to run at the top of the world! The Warden\'s shadow covers everything!'); r = await J.battle({ wild: true, team: [['golurk', 60]], theme: 'icecave', canLose: true }); }
    return r;
  }
  on('m11veil', { needs: ['nellbye'], sets: ['m11quake', 'veilcalm', 'dawn', 'ch12'] }, async J => {
    if (!J.flag('nellbye')) return J.say('Cassius can\'t take his eyes off the little grey figure beside him.', 'cassius2');
    if (J.flag('veilcalm')) return;
    if (!J.flag('m11quake')) {
      await J.say(['The great lamp stutters. The grey light falters, flickers... and goes out.', 'For one heartbeat, the whole of Meridia is silent.']);
      await J.say(['Then the mountain moves.', 'A sound comes up from deep under Frostcrown, older than the lighthouses: stone grinding on stone, as something enormous wakes.']);
      await J.say(['The Warden of the Veil. The Drowned Archive said it sleeps beneath the mountain, guarding the seam between Meridia and the Echo.', 'I tore that seam wide open, and sat on top of it with a lamp. It thinks the tear is us. ...It isn\'t wrong.'], 'cassius2');
      await J.say(['The tower shakes. A colossal hand of ancient stone grips the rail of the Crown, and a head rises over the edge - a Golurk, vast as a lighthouse, its eyes burning red.', 'The Warden of the Veil roars, and the snow leaps off every peak of Frostcrown at once.']);
      await J.say(['It won\'t listen to me. Why would it? But it might listen to you.', '{NAME} - calm it. Please. Before it pulls this whole mountain down into the Echo!'], 'cassius2');
      J.set('m11quake');
    } else await J.say(['The Warden of the Veil is still raging, its red eyes fixed on the broken Lantern.', '{NAME}! It\'s tiring - I can feel it! Once more!'], 'cassius2');
    const r = await veilBattle(J);
    if (r === 'lose') return J.say(['The Warden\'s blow knocks you flat... but it pauses, red eyes flickering, as if something in it is listening.', 'It\'s hesitating! I\'ve patched up your team - when you\'re ready, try again!'], 'cassius2');
    J.set('veilcalm'); J.refresh();
    if (r === 'caught') {
      await J.say(['The Poké Ball rocks once... twice... and holds.', 'Inside, the Warden of the Veil is quiet for the first time in a thousand years. Perhaps it was tired of guarding the seam alone.']);
      await J.say(['You send it back out. It stands over the Crown, calm, its eyes a soft gold now, and looks down at the man with the brass lantern.']);
    } else await J.say(['The Warden of the Veil sways... and stops. Slowly, the red in its eyes cools to a soft, steady gold.', 'It is not angry any more. It is only very, very old, and very tired, and it is looking at the man with the brass lantern.']);
    await J.say(['It needs a light to close the veil. A light that has let go of something.', 'The Archive said that, and I never understood it. I think I do now.'], 'cassius3');
    await J.say(['Cassius lifts his brass lantern - the very first Lumen lantern, the one that started everything. Inside it, Nell\'s little violet flame is burning.', 'He holds it up to the Warden of the Veil with both hands. They are shaking. He doesn\'t take them back.']);
    await J.say('Take it. All of it. I don\'t need to keep anything any more.', 'cassius3');
    await J.say(['The Warden closes its great stone hand around the lantern, as gently as if it were an egg.', 'It presses the lantern into the heart of the Great Lantern. Gold light runs out through every pipe and every pane - and the Lantern stops drinking. Slowly, it begins to give back.']);
    await J.say(['Far below, you feel it more than see it: the veil between Meridia and the Echo, folding shut, like a book closed on a pressed flower.', r === 'caught' ? 'The Warden turns back to you, bows its enormous head, and returns to its ball, as if it had decided something.' : 'Then the Warden climbs down the side of the Great Lantern, back into the mountain it sleeps beneath, to keep watch over the seam.']);
    // dawn
    await J.fade(async () => { J.set('dawn'); await J.wait(900); });
    await J.say(['And then, at the edge of the world... a line of gold.', 'The grey drains out of the sky like water from a basin. First the snow turns pink. Then the sea turns blue. Then the forests, and the towns, and the eight Lights, one by one.']);
    await J.say(['Colour runs down the mountains and out across the whole of Meridia, as far as you can see.', 'Far below, a bell starts ringing in Highwatch. People are stepping out of their best days, blinking, into an ordinary morning.']);
    await J.say(['The sun comes up.', 'The Long Night is over.']);
    await J.say(['{NAME}!! The SKY! Have you SEEN the - of course you\'ve seen it, you\'re standing in it -', 'Mom just paged me. Teo\'s breathing changed. The doctors think he\'s coming back. Slowly - like a lighthouse warming up. He asked for pancakes!'], JUNO);
    await J.say(['Okafor is right behind Juno, out of breath from the stairs. She stops dead when she sees Cassius.'], null);
    await J.say(['Cassius. I... I knew she might be alive in there. When I sealed it, I knew. And I never told you.', 'I\'m so sorry.'], OKAFOR);
    await J.say(['She remembered me, Amara. That\'s all I ever wanted. It was more than I deserved.', 'I have twenty years of other people\'s days to give back. I had better make a start. ...On time, for once.'], 'cassius3');
    await J.say(['One more thing, {NAME}. Not all eight Lights went dark in the Long Night.', 'Warden Solenne kept the Emberlight burning by hand the whole time - out on the Ashen Coast, east of Highwatch. She\'s the last Warden you haven\'t met.'], OKAFOR);
    await J.say(['And past Emberlight, at the end of Victory Strand, the Council of Lights is calling for you.', 'Someone there has been waiting a very long time to meet you properly. ...Go on. Corviknight can take you down the mountain.'], OKAFOR);
    await J.chapter('Chapter 11 complete!', 'Next: Chapter 12 - The Council of Lights');
    J.set('ch12');
    await J.travel('ashencoast', 1, 13, 'right');
    await J.say('Corviknight sets you down at the foot of the mountains, where the road from Highwatch meets the sea. The Ashen Coast is black sand and white surf - and, for the first time in a long while, every colour in between.');
    await J.chapter('Chapter 12', 'The Council of Lights');
  });
  on('m11cassiusAfter', {}, (J, n) => J.say(J.flag('end') ? ['The Great Lantern is a lighthouse now. The ninth Light of Meridia. It only gives.', 'I come up here most evenings. I am always on time.'] : ['Go on, {NAME}. Solenne is waiting at Emberlight, and the Council beyond.', 'I am going to sit here a while and watch the sun. I had forgotten what it looks like.'], n));
  on('m11lamp', {}, J => J.say(J.flag('dawn') ? 'The great lamp glows a soft, steady gold. Deep inside it, a small violet flame is burning.' : 'The great lamp of the Lantern. Grey light pours out of it, cold as a winter sea. Looking into it, you hear a million voices, all saying "again".'));
  on('m11crownStatue', {}, J => J.say('A statue of a Golurk, worn smooth by the wind. Lantern-folk letters are cut into its base: "IT KEEPS THE DOOR. LET IT SLEEP."'));

  // ---- the chapter starts on the summit, at the Lantern's door (Chapter 9's tower: found from its building, so the
  // tile follows wherever that chapter puts it); on its own, inside the foyer
  const tower = GL && M.greatlantern.buildings.find(b => b.to === 'lantern1');
  const door = tower && MMaps.doorsOf(tower)[0];
  chapter({ n: 11, title: 'The Lantern at the End of the World', start: door ? { map: 'greatlantern', x: door.x, y: door.y + 1, dir: 'up' } : { map: 'lantern1', x: 10, y: 14, dir: 'up' },
    level: 52, badge: null, center: 'lantern1',
    goals: ['m11enter', 'm11lock1', 'm11lock2', 'm11lock3', 'm11gate', 'm11crown', 'cassius', 'nellbye', 'm11quake', 'veilcalm', 'dawn', 'ch12'] });
})();
