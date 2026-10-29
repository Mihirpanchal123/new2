// Chapter 3, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, trigger, grass, beat, expect, policy, boost, G, stamp } = t;
  const s0 = await G('G.bag.shard || 0');                 // shards carried in from the chapter before (0 when this chapter runs on its own)
  await boost(33);
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 1; P.wild = 'run'`);

  // ---- the ferry to Voltara City, in the middle of a blackout
  await talk('the Port Coralis ferryman: sail to Voltara', 'port', 'ferry');
  await expect('to land on the Voltara pier', `S.map.id === 'voltara'`);
  await goto('off the pier (the blackout)', 'voltara', 17, 19);
  await expect('the welcome', `G.flags.c3arrive`);
  await talk('the city sign', 'voltara', [16, 16]);
  await talk('the pier sign', 'voltara', [16, 20]);
  await trigger('the locked gym door', 'voltara', 25, 12);
  await expect('the gym to stay locked', `S.map.id === 'voltara' && !G.flags.mila_back`);
  await talk('the Gym Guide', 'voltara', 'guide');
  await talk('the gym sign', 'voltara', [21, 13]);
  await talk('the road crew at Route 4', 'voltara', 'guard');
  await talk('the Route 4 sign', 'voltara', [33, 13]);
  await talk('item: Super Potion', 'voltara', [33, 7]);
  await talk('the lineman in the substation', 'voltara', 'worker');
  await talk('the dead transformer', 'voltara', [24, 2]);
  await talk('the substation sign', 'voltara', [26, 6]);
  await talk('the boy in the dark', 'voltara', 'kid');
  await talk('the woman by the pond', 'voltara', 'lady');
  await talk('hidden item: Ultra Ball on the beach', 'voltara', [34, 20], { on: true });
  await talk('Inventor Ohm (no power)', 'voltara_house1', 'ohm');
  await talk('Watt', 'voltara_house1', 'kid');
  await talk('the dead invention', 'voltara_house1', [1, 1]);
  await talk('Lumi', 'voltara_house2', 'mom');
  await talk('Ben', 'voltara_house2', 'dad');
  await talk('the dead TV', 'voltara_house2', [4, 1]);
  await talk('Nurse: heal', 'center_voltara', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: an Ultra Ball', 'mart_voltara', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200`);

  // ---- Route 3
  await talk('the Route 3 sign', 'route3', [15, 41]);
  await beat('Guitarist Jett', 'route3', 'jett', 'tr.route3.jett', 33);
  await grass('wild Pokémon on Route 3: catch one', 'route3', [[9, 39], [11, 40], [10, 38], [12, 41]], 'catch');
  await policy(`P.wild = 'run'`);
  await talk('item: Great Balls', 'route3', [23, 38]);
  await beat('Hiker Gus', 'route3', 'gus', 'tr.route3.gus', 33);
  await talk('the small tree: Cut', 'route3', [3, 32]);
  await expect('the tree cut', `G.flags['cut.route3.3.32']`);
  await talk('item: Ultra Balls behind the tree', 'route3', [1, 31]);
  await talk('hidden item: a Meteor Shard in the nook', 'route3', [2, 33], { on: true });
  await expect('the first shard', `G.bag.shard === ${s0 + 1}`);
  await beat('Picnicker Sue', 'route3', 'sue', 'tr.route3.sue', 33);
  await goto('north: Sora is waiting', 'route3', 18, 21);
  await expect('the third battle with Sora', `G.flags.rival3`);
  await beat('Engineer Volt', 'route3', 'volt', 'tr.route3.volt', 33);
  await talk('the plant worker', 'route3', 'plantman');
  await talk('hidden item: Revive in the grass', 'route3', [23, 12], { on: true });
  await talk('item: TM Shock Wave', 'route3', [4, 11]);
  await beat('the Eclipse Grunt at the gate', 'route3', 'grunt', 'tr.route3.grunt', 33);
  await talk('the cut cables', 'route3', [7, 3]);
  await talk('the plant sign', 'route3', [12, 8]);
  await talk('hidden item: Super Potion in the yard', 'route3', [20, 2], { on: true });

  // ---- the Power Plant: Mila, three breakers, the field
  await goto('into the Power Plant', 'powerplant', 12, 14);
  await talk('Mila at the field', 'powerplant', 'mila');
  await expect('Mila\'s plan', `G.flags.c3mila && !G.flags.c3gate`);
  await talk('the field sign', 'powerplant', [13, 6]);
  await talk('a turbine', 'powerplant', [3, 8]);
  await beat('Eclipse Grunt in the west room', 'powerplant', 'grunt2', 'tr.powerplant.grunt2', 33);
  await talk('breaker A', 'powerplant', [1, 1]);
  await talk('item: Revive', 'powerplant', [5, 1]);
  await beat('Eclipse Grunt in the east room', 'powerplant', 'grunt3', 'tr.powerplant.grunt3', 33);
  await talk('breaker B', 'powerplant', [22, 1]);
  await talk('item: Full Heal', 'powerplant', [18, 1]);
  await expect('two breakers off, the field still up', `G.flags.c3brkA && G.flags.c3brkB && !G.flags.c3gate`);
  await talk('hidden item: Ultra Ball by the wall', 'powerplant', [1, 16], { on: true });
  await talk('breaker C', 'powerplant', [22, 16]);
  await expect('the field down', `G.flags.c3gate`);
  await talk('the dead field generator', 'powerplant', [8, 1]);
  for (let i = 0; i < 3 && !(await G('G.flags.c3kael')); i++) {
    if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(33 + 6 * i); }
    await goto('upstairs: Admin Kael and the Resonance Engine' + (i ? ` (try ${i + 1})` : ''), 'powerplant2', 9, 6);
  }
  await expect('Kael beaten', `G.flags.c3kael && G.flags.c3gruntE`);
  await talk('item: the dropped Meteor Shard', 'powerplant2', [15, 1]);
  await expect('the second shard', `G.bag.shard === ${s0 + 2}`);
  await talk('the empty Engine', 'powerplant2', [8, 1]);
  await talk('Mila: full power!', 'powerplant2', 'mila');
  await expect('the power back and the gym open', `G.flags.mila_back`);
  await talk('the console', 'powerplant2', [16, 9]);

  // ---- the lights are back
  await talk('Inventor Ohm: a gift', 'voltara_house1', 'ohm');
  await expect('a Thunder Stone', `G.bag.thunderstone >= 1 && G.flags.c3ohm`);
  await talk('the Gym Guide (power back)', 'voltara', 'guide');
  await talk('Nurse: heal before the gym', 'center_voltara', 'nurse');
  await beat('Engineer Ampere', 'gym3', 'ampere', 'tr.gym3.ampere', 33);
  await beat('Guitarist Riff', 'gym3', 'riff', 'tr.gym3.riff', 33);
  await beat('Engineer Coil', 'gym3', 'coil', 'tr.gym3.coil', 33);
  await beat('Leader Mila', 'gym3', 'mila', 'badge.spark', 33);
  await expect('the Spark Badge and TM Thunderbolt', `G.badges.includes('spark') && G.bag['tm:thunderbolt'] && G.flags.ch4`);
  await talk('the gym statue', 'gym3', [6, 16]);

  // ---- the ferry both ways
  await talk('the Voltara ferryman: back to Port Coralis', 'voltara', 'ferry');
  await expect('back in Port Coralis', `S.map.id === 'port'`);
  await talk('the Port Coralis ferryman: to Voltara again', 'port', 'ferry');
  await expect('back in Voltara, the road crew gone from Route 4', `S.map.id === 'voltara' && S.npcs.every(n => n.id !== 'guard' || n.hidden)`);
}
