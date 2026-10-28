// Chapter 7, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, grass, beat, expect, policy, boost, G, stamp } = t;
  await boost(54);
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 1; P.wild = 'run'`);
  // ---- Route 7: up from Ironridge into the snow
  await talk('the Route 7 sign', 'route7', [15, 39]);
  await talk('hidden item: Super Potion in the grass', 'route7', [2, 40], { on: true });
  await beat('Ace Trainer Wren', 'route7', 'wren', 'tr.route7.wren', 54);
  await talk('item: Revive', 'route7', [3, 30]);
  await beat('Hiker Bram', 'route7', 'bram', 'tr.route7.bram', 54);
  await talk('Mountaineer Oda', 'route7', 'traveler');
  await talk('item: Ultra Balls', 'route7', [20, 24]);
  await beat('Skier Skye', 'route7', 'skye', 'tr.route7.skye', 54);
  await talk('hidden item: Ice Heal on the frozen pond', 'route7', [11, 15], { on: true });
  await beat('Boarder Finn', 'route7', 'finn', 'tr.route7.finn', 54);
  await talk('item: Full Heal', 'route7', [7, 6]);
  await talk('the Frostvale sign', 'route7', [13, 2]);
  await expect('the Route 7 items', `G.bag.revive >= 4 && G.bag.ultra >= 2 && G.bag.iceheal >= 2`);
  await grass('wild Pokémon in the deep snow: catch one', 'route7', [[4, 10], [6, 17], [15, 18], [20, 8]], 'catch');
  await policy(`P.wild = 'run'`);
  // ---- Frostvale
  await goto('into Frostvale (the Skyspire)', 'frostvale', 17, 21);
  await expect('the first look at the Skyspire', `G.flags.c7arrive`);
  await talk('the town sign', 'frostvale', [19, 13]);
  await talk('Guardian Sten: the tower is sealed', 'frostvale', 'guardian');
  await expect('the way up still shut', `!G.flags.c7spire && S.npcs.some(n => n.id === 'guardian' && !n.hidden)`);
  await talk('the Skyspire sign', 'frostvale', [15, 9]);
  await talk('the gym sign', 'frostvale', [5, 9]);
  await talk('the Gym Guide', 'frostvale', 'guide');
  await talk('the Victory Road sign', 'frostvale', [31, 9]);
  await talk('Ace Trainer Pell', 'frostvale', 'leaguer');
  await talk('the lady on the main street', 'frostvale', 'lady');
  await talk('the kid on the frozen pond', 'frostvale', 'skater');
  await talk('hidden item: Ultra Ball by the pines', 'frostvale', [31, 20], { on: true });
  await talk('Elder Maren: the legend, Revives', 'fvhouse1', 'maren');
  await talk('the old scroll', 'fvhouse1', [1, 1]);
  await talk('Ski Instructor Hanne: Ultra Balls', 'fvhouse2', 'skimom');
  await talk('the kid at home', 'fvhouse2', 'kid');
  await expect('the gifts', `G.flags.c7maren && G.flags.c7gift`);
  await talk('Nurse: heal', 'center_frostvale', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: an Ultra Ball', 'mart_frostvale', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200`);
  // ---- the gym
  await beat('Skier Lena', 'gym7', 'lena', 'tr.gym7.lena', 54);
  await beat('Boarder Kurt', 'gym7', 'kurt', 'tr.gym7.kurt', 54);
  await beat('Skier Mira', 'gym7', 'mira', 'tr.gym7.mira', 54);
  await talk('Nurse: heal before Ivy', 'center_frostvale', 'nurse');
  await beat('Leader Ivy', 'gym7', 'ivy', 'badge.glacier', 56);
  await expect('the Glacier Badge, TM Ice Beam and the Skyspire open', `G.badges.includes('glacier') && G.bag['tm:ice-beam'] && G.flags.c7spire`);
  await talk('the gym statue', 'gym7', [5, 16]);
  await talk('Guardian Sten: the gate is open', 'frostvale', 'guardian2');
  // ---- the Skyspire
  await boost(58);
  await talk('Nurse: heal before the climb', 'center_frostvale', 'nurse');
  await beat('Eclipse Grunt on 1F', 'skyspire1', 'grunt1', 'tr.skyspire1.grunt1', 58);
  await talk('item: Full Heal', 'skyspire1', [1, 1]);
  await beat('Eclipse Grunt by the stairs', 'skyspire1', 'grunt2', 'tr.skyspire1.grunt2', 58);
  await talk('item: Ultra Balls', 'skyspire1', [18, 8]);
  await talk('item: Revive', 'skyspire2', [18, 13]);
  await beat('Eclipse Grunt on 2F', 'skyspire2', 'grunt3', 'tr.skyspire2.grunt3', 58);
  await beat('Admin Rhea', 'skyspire2', 'rhea', 'c7rhea', 58);
  await expect('Rhea gone from the gap', `G.flags.c7rhea && S.npcs.every(n => n.id !== 'rhea' || n.hidden)`);
  await beat('Eclipse Grunt on the summit stairs', 'skyspire2', 'grunt4', 'tr.skyspire2.grunt4', 58);
  await talk('item: Ultra Balls', 'skyspire2', [12, 1]);
  await talk('hidden item: the twelfth Meteor Shard', 'skyspire2', [7, 2], { on: true });
  await expect('the Meteor Shard', `G.bag.shard >= 1`);
  await talk('item: Ultra Balls on the summit', 'skyspire3', [16, 13]);
  // Director Vex, then Deoxys (a whiteout on either sends you back to Frostvale: climb and try again)
  await policy(`P.wild = 'fight'`);
  for (let i = 0; i < 4 && !(await G('G.flags.c7deoxys')); i++) {
    if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(58 + 5 * i); }
    await talk('Ivy on the summit: heal' + (i ? ` (try ${i + 1})` : ''), 'skyspire3', 'ivy');
    await goto('Director Vex and the meteor' + (i ? ` (try ${i + 1})` : ''), 'skyspire3', 9, 8);
  }
  await policy(`P.wild = 'run'`);
  await expect('Vex beaten, Deoxys met, Team Eclipse finished and Chapter 8 open', `G.flags.c7vex && G.flags.c7deoxys && G.flags.c7eclipse && G.flags.ch8`);
  console.log(`${stamp()}    Deoxys: ${await G(`G.flags.c7deoxysCaught ? 'caught' : 'gone'`)}`);
  await talk('Prof. Hazel at the summit', 'skyspire3', 'hazel');
  await talk('the broken meteor', 'skyspire3', [9, 2]);
  await talk('the Eclipse machine', 'skyspire3', [5, 2]);
  await talk('Guardian Sten afterwards', 'frostvale', 'guardian2');
  await talk('Ivy back at her gym', 'gym7', 'ivy2');
  await talk('Ace Trainer Pell: the road east is open', 'frostvale', 'leaguer');
}
