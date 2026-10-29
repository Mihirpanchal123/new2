// Chapter 5, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, trigger, grass, beat, beatAt, expect, policy, boost, G, ev } = t;
  const s0 = await G('G.bag.shard || 0');                 // shards carried in from the chapter before (0 when this chapter runs on its own)
  // the chapter starts at the top of Mt. Cinder's road and never goes back south: keep the path planner from wandering
  // into Chapter 4's maps (and on to edges of maps not written yet) - in the page, for this run only
  await ev(`(() => { delete JMaps.M.route5.edges.s; return true; })()`);
  await boost(39);   // the bot picks its moves at random: a few levels of slack
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 1`);
  // ---- Route 5: north through the mist
  await talk('the Route 5 sign', 'route5', [16, 38]);
  await talk('Hiker Bram', 'route5', 'hiker');
  await talk('hidden item: Revive in the hollow', 'route5', [4, 40], { on: true });
  await beat('Psychic Mira', 'route5', 'mira', 'tr.route5.mira', 39);
  await talk('item: Super Potion in the east grass', 'route5', [20, 24]);
  await grass('wild Pokémon in the misty grass: catch one', 'route5', [[10, 25], [11, 27], [9, 28], [12, 26]], 'catch');
  await policy(`P.wild = 'run'`);
  await beat('Hex Maniac Wren', 'route5', 'wren', 'tr.route5.wren', 39);
  await beat('Camper Ash', 'route5', 'ash', 'tr.route5.ash', 39);
  await talk('item: Ultra Balls in the north meadow', 'route5', [11, 12]);
  await beat('Picnicker June', 'route5', 'june', 'tr.route5.june', 39);
  await talk('item: Meteor Shard in the clearing', 'route5', [4, 3]);
  await expect('the Meteor Shard', `G.bag.shard === ${s0 + 1}`);
  await talk('hidden item: Full Heal by the pond', 'route5', [20, 6], { on: true });
  await talk('the Mistral sign', 'route5', [12, 2]);
  // ---- Mistral City: the gym is shut, the observatory locked
  await goto('on to Mistral City', 'mistral', 16, 22);
  await talk('the town sign', 'mistral', [15, 21]);
  await trigger('the locked gym door', 'mistral', 25, 21);
  await expect('the gym to stay locked', `S.map.id === 'mistral' && !G.flags.c5gym`);
  await trigger('the locked observatory door', 'mistral', 24, 7);
  await expect('the observatory to stay locked', `S.map.id === 'mistral' && !G.flags.c5ezra`);
  await talk('the gym sign', 'mistral', [19, 23]);
  await talk('the Gym Guide', 'mistral', 'guide');
  await talk('the Old Sage', 'mistral', 'sage');
  await talk('the gatekeeper at the east road', 'mistral', 'gate');
  await talk('the kid on the plaza', 'mistral', 'kid');
  await talk('the lady by the road', 'mistral', 'lady');
  await talk('the observatory sign', 'mistral', [26, 8]);
  await talk('hidden item: Great Balls among the pines', 'mistral', [31, 5], { on: true });
  await talk('Nurse: heal', 'center_mistral', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: an Ultra Ball', 'mart_mistral', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200`);
  await talk('Nell and her nightmare', 'c5house1', 'dreamer');
  await talk('Granny Vale: a gift', 'c5house2', 'granny');
  await expect('the Ultra Balls from Granny Vale', `G.flags.c5gift`);
  // ---- Ezra on the plaza: the hollow mind under the observatory
  await talk('Ezra meditating on the plaza', 'mistral', 'ezra');
  await expect('Ezra to open the observatory', `G.flags.c5ezra`);
  await talk('Caretaker Lio', 'c5obs', 'keeper');
  await talk('the old telescope', 'c5obs', [6, 1]);
  // ---- Eclipse Lab B1: the teleport pads
  await beat('Eclipse Grunt by the stairs', 'eclipselab', 'grunt1', 'tr.eclipselab.grunt1', 39);
  await talk('item: Super Potion', 'eclipselab', [1, 13]);
  await talk('hidden item: Meteor Shard in the sealed room (a pad away)', 'eclipselab', [19, 13], { on: true });
  await expect('both shards', `G.bag.shard === ${s0 + 2}`);
  await talk('item: Ultra Ball in the sealed room', 'eclipselab', [20, 11]);
  await beat('the Eclipse Scientist', 'eclipselab', 'sci', 'tr.eclipselab.sci', 39);
  await talk('a humming machine', 'eclipselab', [10, 4]);
  await talk('the lab PC', 'eclipselab', [13, 7]);
  await beat('Eclipse Grunt by the stairs down', 'eclipselab', 'grunt2', 'tr.eclipselab.grunt2', 39);
  // ---- B2: Director Vex
  await beat('Eclipse Grunt in B2', 'eclipselab2', 'grunt3', 'tr.eclipselab2.grunt3', 39);
  await talk('item: Revive', 'eclipselab2', [1, 7]);
  await beat('Eclipse Grunt at the door', 'eclipselab2', 'grunt4', 'tr.eclipselab2.grunt4', 39);
  await talk('Nurse: heal before Vex', 'center_mistral', 'nurse');
  await beatAt('Director Vex', 'eclipselab2', 9, 6, 'c5vex', 39);
  await expect('Vex gone and the gym open', `G.flags.c5vex && G.flags.c5gym && S.npcs.every(n => n.id !== 'vex' || n.hidden)`);
  await talk('the machine, switched off', 'eclipselab2', [6, 9]);
  await talk("Ezra's projection: a lift back to the city", 'eclipselab2', 'ezra');
  await expect('to be back in Mistral City', `S.map.id === 'mistral'`);
  await talk('Ezra gone from the plaza: the Gym Guide again', 'mistral', 'guide');
  await talk('Nurse: heal before the gym', 'center_mistral', 'nurse');
  // ---- Mistral Gym: the pad maze
  await talk('the gym statue', 'gym5', [5, 17]);
  await beat('Psychic Kio (the dead-end hall)', 'gym5', 'kio', 'tr.gym5.kio', 39);
  await beat('Medium Lyra', 'gym5', 'lyra', 'tr.gym5.lyra', 39);
  await beat('Psychic Sol', 'gym5', 'sol', 'tr.gym5.sol', 39);
  await beat('Leader Ezra', 'gym5', 'ezra', 'badge.mind', 39);
  await expect('the Mind Badge, TM Psychic and Chapter 6 open', `G.badges.includes('mind') && G.bag['tm:psychic'] && G.flags.ch6`);
}
