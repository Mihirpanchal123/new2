// Chapter 6, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, trigger, grass, beat, beatAt, expect, policy, boost, G } = t;
  const s0 = await G('G.bag.shard || 0');                 // shards carried in from the chapter before (0 when this chapter runs on its own)
  await boost(52);
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 2`);
  // ---- Route 6 (from the Mistral side; never west into Mistral)
  await talk('the Route 6 sign', 'route6', [2, 11]);
  await talk('the Old Prospector', 'route6', 'oldman');
  await talk('item: Ultra Balls', 'route6', [2, 4]);
  await beat('Hiker Borr', 'route6', 'hiker', 'tr.route6.hiker', 52);
  await talk('hidden item: Full Heal', 'route6', [24, 3], { on: true });
  await beat('Black Belt Kenji', 'route6', 'belt', 'tr.route6.belt', 52);
  await beat('Picnicker Rosa', 'route6', 'picnic', 'tr.route6.picnic', 52);
  await beat('Camper Ty', 'route6', 'camper', 'tr.route6.camper', 52);
  await grass('wild Pokémon on Route 6: catch one', 'route6', [[12, 17], [15, 18], [18, 17], [20, 16]], 'catch');
  await policy(`P.wild = 'run'`);
  await goto('east along the road (Sora is waiting)', 'route6', 37, 12);
  await expect('the fourth battle with Sora', `G.flags.c6sora`);
  await talk('Cut the small tree', 'route6', [42, 9]);
  await talk('item behind it: Rare Candy', 'route6', [44, 4]);
  await talk('hidden item: TM Rock Slide', 'route6', [41, 7], { on: true });
  await expect('the Rare Candy and the TM', `G.bag.rarecandy >= 1 && G.bag['tm:rock-slide']`);
  await talk('item: Revive in the hollow', 'route6', [45, 19]);
  await talk('the Ironridge sign', 'route6', [44, 11]);
  // ---- Ironridge City: the gym is locked, the mine taken
  await goto('east into Ironridge City', 'ironridge', 2, 12);
  await talk('the town sign', 'ironridge', [2, 11]);
  await trigger('the locked gym door', 'ironridge', 24, 10);
  await expect('the gym to stay locked', `S.map.id === 'ironridge' && !G.flags.c6nova`);
  await talk('the Gym Guide', 'ironridge', 'guide');
  await talk('the gym sign', 'ironridge', [20, 11]);
  await talk('Foreman Doyle', 'ironridge', 'foreman');
  await talk('Hiker Gus by the snowed-in pass', 'ironridge', 'hiker');
  await talk('the Route 7 sign', 'ironridge', [15, 4]);
  await talk('a woman', 'ironridge', 'lady');
  await talk('a kid', 'ironridge', 'kid');
  await talk('hidden item: Super Potion', 'ironridge', [33, 3], { on: true });
  await talk('item: Ultra Ball', 'ironridge', [34, 25]);
  await talk('the mine sign', 'ironridge', [25, 21]);
  await talk('Hanna (her husband is in the mine)', 'c6house1', 'wife');
  await talk('Pip', 'c6house1', 'kid');
  await talk('Old Miner Tobias: a TM', 'c6house2', 'oldminer');
  await expect('TM Iron Head', `G.bag['tm:iron-head']`);
  await talk('Nurse: heal', 'center_ironridge', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: an Ultra Ball', 'mart_ironridge', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200`);
  // ---- the mine
  await beat('the Eclipse Grunt at the mine', 'ironridge', 'grunt0', 'tr.ironridge.grunt0', 52);
  await goto('into Ironridge Mine', 'ironmine', 13, 19);
  await talk('a miner at the wall', 'ironmine', 'minerA');
  await beat('Eclipse Grunt in the hall', 'ironmine', 'grunt1', 'tr.ironmine.grunt1', 52);
  await talk('a mine cart', 'ironmine', [6, 12]);
  await talk('a miner by the tunnel', 'ironmine', 'minerB');
  await grass('wild Pokémon on the cave floor', 'ironmine', [[4, 13], [10, 13], [16, 14], [20, 11]], 'run');
  await talk('item: Ultra Balls', 'ironmine', [9, 3]);
  await talk('hidden item: Full Heal', 'ironmine', [3, 9], { on: true });
  await talk('the drilling rig', 'ironmine', [4, 2]);
  await beat('Eclipse Grunt in the shaft', 'ironmine', 'grunt2', 'tr.ironmine.grunt2', 52);
  await goto('down to B1F', 'ironmine2', 24, 4);
  await talk('hidden item: Ultra Ball', 'ironmine2', [25, 5], { on: true });
  await beat('Eclipse Grunt on the rails', 'ironmine2', 'grunt3', 'tr.ironmine2.grunt3', 52);
  await talk('a captive miner', 'ironmine2', 'minerC');
  await talk('item: Revive', 'ironmine2', [3, 3]);
  await talk('a cart on B1F', 'ironmine2', [12, 11]);
  await beat('Eclipse Grunt by the stairs', 'ironmine2', 'grunt4', 'tr.ironmine2.grunt4', 52);
  await goto('down to B2F', 'ironmine3', 4, 19);
  await talk('item: Rare Candy in the old working', 'ironmine3', [7, 8]);
  await talk('Miner Sal (before)', 'ironmine3', 'minerD');
  await beatAt('Admin Kael, for the last time', 'ironmine3', 18, 9, 'c6kael', 52);
  await expect('Kael gone and the miners free', `G.flags.c6kael && S.npcs.every(n => !/^(kael|grunt5|grunt6)$/.test(n.id) || n.hidden)`);
  await talk('Nova: the gym reopens', 'ironmine3', 'nova');
  await expect('Nova back at the gym', `G.flags.c6nova`);
  await talk('the crates', 'ironmine3', [24, 2]);
  await talk('the drill, switched off', 'ironmine3', [10, 2]);
  await talk('Miner Sal (after)', 'ironmine3', 'minerD');
  await talk('hidden item: Meteor Shard deep in the east tunnel', 'ironmine3', [27, 10], { on: true });
  await expect('the Meteor Shard', `G.bag.shard === ${s0 + 1}`);
  // ---- back in town: the miners are home
  await talk('a freed miner by the mine', 'ironridge', 'miner1');
  await talk('a freed miner on the main street', 'ironridge', 'miner2');
  await talk('Foreman Doyle again', 'ironridge', 'foreman');
  await talk('Hanna: a thank-you gift', 'c6house1', 'wife');
  await expect('two Revives from Hanna', `G.flags.c6gift`);
  await talk('Nurse: heal before the gym', 'center_ironridge', 'nurse');
  // ---- the Ironridge Gym
  await talk('the gym statue', 'gym6', [6, 16]);
  await beat('Worker Hal', 'gym6', 'g1', 'tr.gym6.g1', 52);
  await beat('Engineer Bryn', 'gym6', 'g2', 'tr.gym6.g2', 52);
  await beat('Engineer Mace', 'gym6', 'g3', 'tr.gym6.g3', 52);
  await beat('Leader Nova', 'gym6', 'nova', 'badge.iron', 52);
  await expect('the Iron Badge and TM Flash Cannon', `G.badges.includes('iron') && G.bag['tm:flash-cannon'] && G.flags.ch7`);
  await talk('the gym statue again', 'gym6', [10, 16]);
  await talk('the Gym Guide after the badge', 'ironridge', 'guide');
}
