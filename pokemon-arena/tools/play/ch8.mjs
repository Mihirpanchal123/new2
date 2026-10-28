// Chapter 8, played by the bot (tools/test-play.mjs runs this; see the Chapter 2 scenario there for the style)
export default async function (t) {
  const { talk, goto, trigger, grass, beat, expect, policy, boost, G, ev, step, stamp } = t;
  await boost(66);
  // test shortcut: there is no Pokémon Center inside Victory Road (a player would use the items found there)
  const rest = () => ev('Journey._J.heal(false).then(() => true)');
  await policy(`P.answers = [['Heal your', 0]]; P.potion = 1; P.wild = 'run'`);
  // the save is made from the registered chapters: badges of chapters not written yet are added here, so the badge
  // check has seven to look at
  await G(`(['leaf', 'tide', 'spark', 'ember', 'mind', 'iron', 'glacier'].forEach(b => { if (!G.badges.includes(b)) G.badges.push(b); G.flags['badge.' + b] = true; }), true)`);
  // Frostvale (Chapter 7) may not exist yet: the bot's planner must not look west into a missing map
  await ev(`(JMaps.M.frostvale || (JMaps.M.victoryroad.edges = {}), true)`);

  // ---- Victory Road 1F
  await talk('the Victory Road sign', 'victoryroad', [3, 8]);
  await talk('the League Guard', 'victoryroad', 'guard');
  await trigger('the badge check', 'victoryroad', 7, 10);
  await expect('the guard to let you through', `G.flags.c8gate`);
  await rest();
  await beat('Ace Trainer Vera', 'victoryroad', 'vera', 'tr.victoryroad.vera', 66);
  await talk('hidden item: Hyper Potion', 'victoryroad', [10, 3], { on: true });
  await talk('item: TM Earthquake in the side pocket', 'victoryroad', [3, 19]);
  await grass('wild Pokémon in Victory Road: catch one', 'victoryroad', [[12, 12], [13, 14], [11, 17], [12, 19]], 'catch');
  await policy(`P.wild = 'run'`);
  await talk('hidden item: Meteor Shard by the pool', 'victoryroad', [18, 18], { on: true });
  await expect('the Meteor Shard', `G.bag.shard >= 1`);
  await talk('item: Ultra Balls', 'victoryroad', [25, 10]);
  await talk('item: Revive', 'victoryroad', [36, 26]);
  await rest();
  await beat('Veteran Dorian', 'victoryroad', 'dorian', 'tr.victoryroad.dorian', 66);
  await rest();
  await beat('Black Belt Koji', 'victoryroad', 'koji', 'tr.victoryroad.koji', 66);
  await goto('upstairs to 2F', 'victoryroad2', 3, 24);

  // ---- Victory Road 2F
  await talk('item: Revive', 'victoryroad2', [9, 20]);
  await rest();
  await beat('Ace Trainer Rowan', 'victoryroad2', 'rowan', 'tr.victoryroad2.rowan', 66);
  await talk('hidden item: Ultra Ball', 'victoryroad2', [5, 8], { on: true });
  await rest();
  await beat('Dragon Tamer Wen', 'victoryroad2', 'wen', 'tr.victoryroad2.wen', 66);
  await talk('item: TM Dragon Claw', 'victoryroad2', [30, 8]);
  await talk('item: Full Heals', 'victoryroad2', [30, 22]);
  await talk('hidden item: Rare Candy', 'victoryroad2', [14, 22], { on: true });
  await goto('up to the League (Sora is waiting)', 'league', 15, 18);
  await expect('the last battle with Sora', `G.flags.c8rival`);

  // ---- the plateau
  await talk('Sora on the plateau', 'league', 'sora');
  await talk('Old Trainer Hal', 'league', 'vet');
  await talk('the League sign', 'league', [17, 11]);
  await talk('the Victory Road sign', 'league', [13, 19]);
  await talk('hidden item: Revive', 'league', [28, 4], { on: true });

  // ---- the lobby
  await talk('Nurse: heal', 'leaguelobby', 'nurse');
  await expect('the lobby to be the place to come back to', `G.lastCenter && G.lastCenter.map === 'leaguelobby'`);
  const money = await G('G.money');
  await policy(`B.menuTask = menu => { if (menu !== 'shop') return false; const q = s => document.querySelector('#journey .jpanel ' + s); if (!B.did) { B.did = 1; q('[data-a=buy][data-i=ultra][data-q="1"]').click(); return true; } B.did = 0; B.menuTask = null; return false; }`);
  await talk('the League shop: an Ultra Ball', 'leaguelobby', 'clerk');
  await expect('an Ultra Ball bought', `G.money === ${money} - 1200`);
  await talk('the League Guard in the lobby', 'leaguelobby', 'lguard');
  await talk('the lobby statue', 'leaguelobby', [6, 1]);

  // ---- the Elite Four: heal, walk in, win (a loss is a whiteout to the lobby: train up and walk back)
  await boost(72);
  const elite = async (label, map, npc, flag, L) => {
    for (let i = 0; i < 3 && !(await G(`!!G.flags.${flag}`)); i++) {
      if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(L + 6 * i); }
      await talk('Nurse: heal before ' + label, 'leaguelobby', 'nurse');
      await step(label + (i ? ` (try ${i + 1})` : ''), { type: 'talk', map, npc }, 600);
    }
    await expect(label + ' beaten and the next door open', `G.flags.${flag}`);
  };
  await elite('Elite Four Morrigan (Dark)', 'elite1', 'morrigan', 'c8e1', 72);
  await talk('the statue in Morrigan\'s room', 'elite1', [5, 1]);
  await elite('Elite Four Bram (Fighting/Rock)', 'elite2', 'bram', 'c8e2', 72);
  await elite('Elite Four Seraphine (Fairy/Psychic)', 'elite3', 'seraphine', 'c8e3', 72);
  await elite('Elite Four Talon (Dragon)', 'elite4', 'talon', 'c8e4', 72);

  // ---- the Champion: the battle, the Hall of Fame, and home
  await boost(78);
  for (let i = 0; i < 3 && !(await G('G.flags.c8champ')); i++) {
    if (i) { console.log(`${stamp()}    lost - training up and trying again`); await boost(78 + 6 * i); }
    await talk('Nurse: heal before the Champion', 'leaguelobby', 'nurse');
    await step('Champion Aurelia' + (i ? ` (try ${i + 1})` : ''), { type: 'talk', map: 'champion', npc: 'aurelia' }, 900);
  }
  await expect('the Champion beaten, the Hall of Fame and the trip home', `G.flags.c8champ && G.flags.champion && G.flags.c8hofTeam && S.map.id === 'willowbrook'`);
  console.log(`${stamp()}    Hall of Fame: ${await G('G.flags.c8hofTeam')}`);
  // the Hall of Fame again (a test warp: walking back from Willowbrook would need every chapter's maps)
  await ev(`(Journey._warp('halloffame', 6, 7, 'up'), true)`);
  await talk('the Hall of Fame machine', 'halloffame', [5, 1]);
  await talk('the Hall of Fame statue', 'halloffame', [2, 2]);
  await talk('Aurelia in the Hall of Fame', 'halloffame', 'aurelia');
}
