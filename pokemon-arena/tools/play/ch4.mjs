// Chapter 4, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, trigger, grass, beat, beatAt, expect, policy, boost, G, ev } = t;
  // until Chapter 3 (Voltara) is written, the bot's path planner trips over route4's west edge to a missing map:
  // drop that edge in the page for this run only (nothing changes once voltara exists)
  await ev(`(() => { if (!JMaps.M.voltara) delete JMaps.M.route4.edges.w; return true; })()`);
  await boost(36);
  await policy(`P.answers = [['Heal your', 0], ['Rest your', 0]]; P.potion = 1`);
  // ---- Route 4: up from Voltara
  await talk('the Route 4 sign', 'route4', [2, 13]);
  await beat('Hiker Gus', 'route4', 'gus', 'tr.route4.gus', 36);
  await talk('the old walker', 'route4', 'walker');
  await talk('hidden item: Burn Heals by the flowers', 'route4', [13, 21], { on: true });
  await grass('wild Pokémon on Route 4: catch one', 'route4', [[6, 18], [9, 19], [11, 18], [5, 20]], 'catch');
  await policy(`P.wild = 'run'`);
  await talk('item: Super Potion in the meadow', 'route4', [2, 4]);
  await beat('Picnicker Sue', 'route4', 'sue', 'tr.route4.sue', 36);
  await beat('Kindler Ash', 'route4', 'ash', 'tr.route4.ash', 36);
  await talk('item: Great Balls', 'route4', [36, 8]);
  await talk('hidden item: Full Heal in the ash', 'route4', [25, 13], { on: true });
  await beat('Camper Dex', 'route4', 'dex', 'tr.route4.dex', 36);
  await talk('item: Meteor Shard by the lava', 'route4', [41, 21]);
  await expect('the Meteor Shard', `G.bag.shard === 1`);
  await talk('the Cinder Town sign on the ridge', 'route4', [41, 4]);
  // ---- Cinder Town
  await goto('on to Cinder Town', 'cinder', 2, 18);
  await talk('the town sign', 'cinder', [12, 17]);
  await trigger('the locked gym door', 'cinder', 21, 16);
  await expect('the gym to stay locked', `S.map.id === 'cinder' && !G.flags.c4taro`);
  await talk('the gym sign', 'cinder', [20, 17]);
  await talk('the Gym Guide', 'cinder', 'guide');
  await talk('the kid', 'cinder', 'kid');
  await talk('the lady sweeping ash', 'cinder', 'lady');
  await talk('the hot spring sign', 'cinder', [13, 22]);
  await talk('Bather Gen', 'cinder', 'bather');
  await talk('hidden item: Revive by the spring', 'cinder', [2, 26], { on: true });
  await talk('the Route 5 sign', 'cinder', [16, 2]);
  await talk('the traveler waiting for the mist', 'cinder', 'mistman');
  await talk('Nurse: heal', 'center_cinder', 'nurse');
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the Poké Mart: an Ultra Ball', 'mart_cinder', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200 && G.bag.ultra >= 1`);
  await talk('Mira at the forge', 'cinderforge', 'mira');
  await talk('the anvil', 'cinderforge', [1, 1]);
  await talk('Innkeeper Sen: rest', 'cinderinn', 'inn');
  await talk('the tourist', 'cinderinn', 'tourist');
  await talk('the trail sign', 'cinder', [25, 4]);
  await talk('Ranger Ito: the trail is closed', 'cinder', 'ranger');
  await talk('Prof. Hazel: the meteor in the mountain', 'cinder', 'hazel');
  await expect('Hazel to vouch for you (and 3 Revives)', `G.flags.c4hazel && G.bag.revive >= 6`);
  await talk('Ranger Ito steps aside', 'cinder', 'ranger2');
  await talk('Prof. Hazel again', 'cinder', 'hazel');
  // ---- Mt. Cinder
  await goto('east into Mt. Cinder', 'mtcinder', 2, 20);
  await beat('Eclipse Grunt in the first chamber', 'mtcinder', 'grunt1', 'tr.mtcinder.grunt1', 36);
  await grass('wild Pokémon on the cave floor', 'mtcinder', [[8, 14], [12, 13], [9, 20], [11, 14]], 'run');
  await talk('hidden item: Super Potion', 'mtcinder', [7, 13], { on: true });
  await talk('hidden item: Meteor Shard in the side room', 'mtcinder', [4, 5], { on: true });
  await expect('both shards', `G.bag.shard === 2`);
  await talk('item: Revive', 'mtcinder', [12, 4]);
  await beat('Eclipse Grunt in the hot chamber', 'mtcinder', 'grunt2', 'tr.mtcinder.grunt2', 36);
  await talk('item: Ultra Balls', 'mtcinder', [26, 20]);
  await goto('up the stairs to the crater', 'mtcinder2', 13, 17);
  await beat('Eclipse Grunt at the crater', 'mtcinder2', 'grunt3', 'tr.mtcinder2.grunt3', 36);
  await talk('hidden item: Great Balls', 'mtcinder2', [24, 19], { on: true });
  await beatAt('Admin Rhea at the drill', 'mtcinder2', 13, 11, 'c4rhea', 36);
  await expect('Rhea gone and Taro back to his gym', `G.flags.c4rhea && G.flags.c4taro`);
  await talk('the abandoned drill', 'mtcinder2', [12, 8]);
  await talk('item: Full Heal on the crater rim', 'mtcinder2', [2, 4]);
  // ---- Cinder Gym
  await talk('Nurse: heal before the gym', 'center_cinder', 'nurse');
  await talk('the Gym Guide (Taro is back)', 'cinder', 'guide');
  await beat('Kindler Blaze', 'gym4', 'blaze', 'tr.gym4.blaze', 36);
  await beat('Apprentice Flint', 'gym4', 'flint', 'tr.gym4.flint', 36);
  await beat('Kindler Cinda', 'gym4', 'cinda', 'tr.gym4.cinda', 36);
  await beat('Leader Taro', 'gym4', 'taro', 'badge.ember', 36);
  await expect('the Ember Badge and TM Flamethrower', `G.badges.includes('ember') && G.bag['tm:flamethrower'] && G.flags.ch5`);
  await talk('the gym statue', 'gym4', [5, 14]);
  await talk('Mira after the badge', 'cinderforge', 'mira');
  await goto('back out into Cinder Town', 'cinder', 15, 8);
  await expect('the traveler gone now the mist is lifting', `S.npcs.every(n => n.id !== 'mistman' || n.hidden)`);
}
