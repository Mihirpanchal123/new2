'use strict';
// =====================================================================
//  SERIES — named CPU trainers, 8-trainer tournaments, saved records
// =====================================================================
const Store = (() => {
  const KEY = 'pokemon-arena-v1';
  const data = { battles: 0, trainers: {}, pokemon: {}, champions: [], tournament: null };
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  // a saved tournament may hold your team from an older roster: drop Pokémon, Megas and moves no longer in the game
  const P = window.POKEDEX;
  const fix = e => {
    if (!e || !e.me || !Array.isArray(e.team)) return;
    e.team = e.team.filter(s => P.species[s.species]);
    for (const s of e.team) {
      if (s.mega && !P.species[s.species].megas.some(m => m.name === s.mega)) s.mega = null;
      s.moves = s.moves.filter(m => P.moves[m]);
    }
  };
  try {
    if (data.tournament) fix(data.tournament.champion);
    for (const r of (data.tournament && data.tournament.rounds) || []) for (const m of r) { fix(m.a); fix(m.b); fix(m.winner); }
  } catch (e) { data.tournament = null; }
  return { data, save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} } };
})();

// Original trainers (names/personalities are made up for this game)
const ROSTER = [
  { id: 'kai', name: 'Kai', title: 'Ace Trainer', outfit: 'red', team: ['charizard', 'lucario', 'gyarados', 'snorlax', 'gengar', 'sceptile'], mega: 'charizard-mega-x',
    lines: { intro: "Let's make this one legendary!", win: "That's how an ace battles!", lose: 'You got me this time…' } },
  { id: 'rina', name: 'Rina', title: 'Dragon Tamer', outfit: 'dawn', team: ['garchomp', 'dragonite', 'salamence', 'tyranitar', 'ampharos', 'gyarados'], mega: 'garchomp-mega',
    lines: { intro: 'My dragons are hungry for a challenge.', win: 'Dragons never lose their pride!', lose: 'Even dragons fall sometimes.' } },
  { id: 'taro', name: 'Taro', title: 'Blaze Captain', outfit: 'ethan', team: ['blaziken', 'houndoom', 'charizard', 'flareon', 'machamp', 'aggron'], mega: 'blaziken-mega',
    lines: { intro: "I'll burn through your whole team!", win: 'Too hot to handle!', lose: 'My flame… went out.' } },
  { id: 'mila', name: 'Mila', title: 'Storm Rider', outfit: 'leaf', team: ['ampharos', 'jolteon', 'raichu', 'pidgeot', 'gyarados', 'swampert'], mega: 'ampharos-mega',
    lines: { intro: 'Feel the storm coming?', win: 'Struck like lightning!', lose: 'The storm has passed…' } },
  { id: 'jax', name: 'Jax', title: 'Shadow Boss', outfit: 'blue', team: ['gengar', 'umbreon', 'absol', 'tyranitar', 'houndoom', 'scizor'], mega: 'gengar-mega',
    lines: { intro: "Lights out. You won't see it coming.", win: 'The shadows win again.', lose: "Hmph. Lucky." } },
  { id: 'nova', name: 'Nova', title: 'Iron Wall', outfit: 'may', team: ['metagross', 'aggron', 'scizor', 'snorlax', 'blastoise', 'lucario'], mega: 'metagross-mega',
    lines: { intro: 'Try breaking through this defense.', win: 'Unbreakable!', lose: 'You found a crack…' } },
  { id: 'ezra', name: 'Ezra', title: 'Psychic Prodigy', outfit: 'blue', team: ['alakazam', 'gardevoir', 'gallade', 'espeon', 'metagross', 'sylveon'], mega: 'alakazam-mega',
    lines: { intro: 'I already know how this ends.', win: 'Exactly as I foresaw.', lose: "I didn't see that coming…" } },
  { id: 'luna', name: 'Luna', title: 'Wild Ranger', outfit: 'leaf', team: ['venusaur', 'sceptile', 'leafeon', 'kangaskhan', 'pidgeot', 'sylveon'], mega: 'venusaur-mega',
    lines: { intro: 'Nature is on my side today!', win: 'Wild and free!', lose: 'Back to the forest for training.' } },
  { id: 'rex', name: 'Rex', title: 'Tide Master', outfit: 'red', team: ['swampert', 'blastoise', 'vaporeon', 'gyarados', 'machamp', 'glaceon'], mega: 'swampert-mega',
    lines: { intro: "Hope you can swim!", win: 'Washed away!', lose: 'Low tide for me…' } },
  { id: 'ivy', name: 'Ivy', title: 'Frost Princess', outfit: 'dawn', team: ['glaceon', 'absol', 'gardevoir', 'sylveon', 'vaporeon', 'lucario'], mega: 'absol-mega',
    lines: { intro: 'Shall we dance on the ice?', win: 'Cold, flawless victory.', lose: 'The ice… melted.' } },
  { id: 'orion', name: 'Orion', title: 'Mega Hunter', outfit: 'ethan', team: ['mewtwo', 'rayquaza', 'tyranitar', 'kangaskhan', 'scizor', 'charizard'], mega: 'mewtwo-mega-y',
    lines: { intro: 'Legends answer to me.', win: 'Bow to the legends!', lose: 'Impossible…!' } },
  { id: 'sora', name: 'Sora', title: 'Rookie Star', outfit: 'may', team: ['pikachu', 'jolteon', 'kangaskhan', 'pidgeot', 'machamp', 'raichu'], mega: 'kangaskhan-mega',
    lines: { intro: "I'm new, but I won't hold back!", win: 'I did it! I really did it!', lose: "I'll get stronger, I promise!" } }
];

// ---- records -----------------------------------------------------------------
const Stats = {
  battleNo: () => Store.data.battles + 1,
  record(name, wins) { const t = Store.data.trainers[name] || (Store.data.trainers[name] = { w: 0, l: 0 }); wins ? t.w++ : t.l++; },
  recordText(name) { const t = Store.data.trainers[name]; return t ? `${t.w}W – ${t.l}L` : 'First battle!'; },
  saveBattle({ names, winner, mons }) {
    Store.data.battles++;
    names.forEach((n, i) => this.record(n, i === winner));
    for (const m of mons) {
      const r = Store.data.pokemon[m.species] || (Store.data.pokemon[m.species] = { name: m.name, used: 0, wins: 0, kos: 0, dmg: 0 });
      r.used++; r.kos += m.kos; r.dmg += m.dmg; if (m.side === winner) r.wins++;
    }
    Store.save();
  }
};

// ---- tournament ----------------------------------------------------------
const ROUND_NAMES = ['Quarterfinal', 'Semifinal', 'Final'];
const Tour = {
  get state() { return Store.data.tournament; },
  inMatch: false,
  start(entrants) {
    const shuffled = entrants.slice().sort(() => Math.random() - 0.5);
    const rounds = [[], [], []];
    for (let i = 0; i < 8; i += 2) rounds[0].push({ a: shuffled[i], b: shuffled[i + 1], winner: null });
    rounds[1] = [{ a: null, b: null, winner: null }, { a: null, b: null, winner: null }];
    rounds[2] = [{ a: null, b: null, winner: null }];
    Store.data.tournament = { rounds, champion: null, teamSize: settings.teamSize, level: settings.level, hpMult: settings.hpMult, name: `Arena Cup #${Store.data.champions.length + 1}` };
    Store.save();
  },
  next() {
    const st = this.state;
    if (!st) return null;
    for (let r = 0; r < 3; r++) for (let i = 0; i < st.rounds[r].length; i++) {
      const m = st.rounds[r][i];
      if (!m.winner && m.a && m.b) return { r, i, m };
    }
    return null;
  },
  entrant(e) { return e.me ? e : ROSTER.find(t => t.id === e.id); },
  specsFor(e, st) {
    if (e.me) return e.team.slice(0, st.teamSize).map(s => ({ ...s, moves: s.moves.slice() }));
    const t = this.entrant(e);
    return t.team.slice(0, st.teamSize).map(sp => {
      const s = makeSpec(sp, st.level);
      if (sp === t.mega.replace(/-mega.*$/, '')) s.mega = t.mega;
      return s;
    });
  },
  play() {
    const n = this.next();
    if (!n) return;
    const st = this.state, A = this.entrant(n.m.a), B = this.entrant(n.m.b);
    this.inMatch = n;
    // remember the builder's own names/outfits/controls so leaving the tournament restores them
    if (!this.saved) this.saved = { names: PLAYER.slice(), outfits: settings.outfits.slice(), controllers: controllers.slice(), hpMult: settings.hpMult };
    settings.hpMult = st.hpMult;
    PLAYER[0] = A.name; PLAYER[1] = B.name;
    settings.outfits = [A.outfit, B.outfit];
    controllers[0] = A.me && A.human ? 'human' : 'cpu';
    controllers[1] = B.me && B.human ? 'human' : 'cpu';
    hideBracket();
    startBattle([this.specsFor(n.m.a, st), this.specsFor(n.m.b, st)], {
      subtitle: `${st.name} · ${ROUND_NAMES[n.r]}${n.r < 2 ? ' ' + (n.i + 1) : ''}`,
      lines: [A.lines ? A.lines.intro : null, B.lines ? B.lines.intro : null],
      endLines: [A.lines || null, B.lines || null]
    });
  },
  // called by the game when a tournament battle ends
  onBattleEnd(winnerSide) {
    const n = this.inMatch;
    this.inMatch = false;
    if (!n) return false;
    const st = this.state;
    n.m.winner = winnerSide === 0 ? n.m.a : n.m.b;
    if (n.r < 2) {
      const nm = st.rounds[n.r + 1][Math.floor(n.i / 2)];
      if (n.i % 2 === 0) nm.a = n.m.winner; else nm.b = n.m.winner;
    } else {
      st.champion = n.m.winner;
      Store.data.champions.unshift({ name: this.entrant(st.champion).name, cup: st.name, date: new Date().toLocaleDateString() });
    }
    Store.save();
    showBracket();
    return true;
  },
  quit() { Store.data.tournament = null; Store.save(); },
  restore() {
    const s = this.saved;
    if (!s) return;
    s.names.forEach((n, i) => PLAYER[i] = n);
    settings.outfits = s.outfits; s.controllers.forEach((c, i) => controllers[i] = c); settings.hpMult = s.hpMult;
    [0, 1].forEach(p => World.trainers.setup(p, settings.outfits[p], PLAYER[p]));
    this.saved = null;
  }
};

/// ---- bracket chart (inside the recorded frame) ----------------------------
// Drawn on a fixed virtual canvas (landscape 1600x900, portrait 900x1600) and
// scaled to fit the frame, so it never scrolls or spills out.
let bracketTimer = null;
const BR_LAYOUT = {
  land: {
    W: 1600, H: 900, bw: 280, bh: 130,
    box: { '0-0': [30, 150], '0-1': [30, 560], '0-2': [1290, 150], '0-3': [1290, 560], '1-0': [350, 355], '1-1': [970, 355], '2-0': [660, 560] },
    champ: [660, 175, 280, 250], title: 26, footer: 735
  },
  port: {
    W: 900, H: 1600, bw: 410, bh: 130,
    box: { '0-0': [25, 250], '0-1': [465, 250], '1-0': [245, 490], '2-0': [245, 735], '1-1': [245, 980], '0-2': [25, 1220], '0-3': [465, 1220] },
    champ: null, title: 30, footer: 1395
  }
};
function showBracket() {
  const st = Tour.state, B = document.getElementById('bracket');
  if (!st) return;
  const [fw, fh] = frameSize();
  const L = fh > fw ? BR_LAYOUT.port : BR_LAYOUT.land, portrait = L === BR_LAYOUT.port;
  const nx = Tour.next();
  const info = e => {
    if (!e) return null;
    const t = Tour.entrant(e);
    const species = e.me ? e.team.map(x => x.species) : t.team;
    return { name: t.name, title: e.me ? 'Challenger (you)' : t.title, team: species.slice(0, st.teamSize).map(sp => DEX.species[sp].sprite), rec: Stats.recordText(t.name) };
  };
  const row = (e, m) => {
    const d = info(e);
    if (!d) return `<div class="brrow tbd"><div class="lead q">?</div><div><div class="nm">???</div><div class="tt">Winner advances here</div></div></div>`;
    const cls = !m.winner ? '' : m.winner === e ? 'win' : 'lose';
    return `<div class="brrow ${cls}"><img class="lead" src="${d.team[0]}"><div class="who"><div class="nm">${d.name}</div><div class="tt">${d.title} · ${d.rec}</div></div>
      <div class="mini">${d.team.slice(1).map(src => `<img src="${src}">`).join('')}</div></div>`;
  };
  const ROUND_TAG = ['Quarterfinal', 'Semifinal', 'FINAL'];
  let boxes = '', lines = '';
  const pos = {};
  for (let r = 0; r < 3; r++) st.rounds[r].forEach((m, i) => {
    const [x, y] = L.box[`${r}-${i}`];
    pos[`${r}-${i}`] = { x, y };
    const cur = nx && nx.r === r && nx.i === i;
    boxes += `<div class="brtag" style="left:${x}px;top:${y - 24}px;width:${L.bw}px">${ROUND_TAG[r]}${r < 2 ? ' ' + (i + 1) : ''}${cur ? ' · NEXT' : ''}</div>
      <div class="brbox ${cur ? 'cur' : ''} ${r === 2 ? 'final' : ''}" style="left:${x}px;top:${y}px;width:${L.bw}px;height:${L.bh}px">${row(m.a, m)}${row(m.b, m)}</div>`;
  });
  // connector lines: each match feeds a slot of the next round; gold once a winner has advanced
  const seg = (x1, y1, x2, y2, done) => {
    const d = portrait ? `M${x1},${y1} V${(y1 + y2) / 2} H${x2} V${y2}` : `M${x1},${y1} H${(x1 + x2) / 2} V${y2} H${x2}`;
    lines += `<path d="${d}" class="${done ? 'done' : ''}"/>`;
  };
  const { bw, bh } = L;
  for (let r = 0; r < 2; r++) st.rounds[r].forEach((m, i) => {
    const src = pos[`${r}-${i}`], dst = pos[`${r + 1}-${Math.floor(i / 2)}`], slot = i % 2;
    if (portrait) {
      const fromTop = src.y < dst.y;
      seg(src.x + bw / 2, fromTop ? src.y + bh : src.y - 30, dst.x + bw * (slot ? 0.75 : 0.25), fromTop ? dst.y - 30 : dst.y + bh, !!m.winner);
    } else {
      const fromLeft = src.x < dst.x;
      seg(fromLeft ? src.x + bw : src.x, src.y + bh / 2, fromLeft ? dst.x : dst.x + bw, dst.y + (slot ? bh * 0.75 : bh * 0.25), !!m.winner);
    }
  });
  const fin = st.rounds[2][0], champName = st.champion ? info(st.champion).name : null;
  let champBox;
  if (L.champ) {
    const [cx, cy, cw, ch] = L.champ;
    lines += `<path d="M${pos['2-0'].x + bw / 2},${pos['2-0'].y - 26} V${cy + ch}" class="${fin.winner ? 'done' : ''}"/>`;
    champBox = `<div class="brchamp ${champName ? 'won' : ''}" style="left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px"><div class="trophy">🏆</div><div class="cl">CHAMPION</div><div class="cn">${champName || 'Who will win it all?'}</div></div>`;
  } else {
    champBox = `<div class="brchamp pill ${champName ? 'won' : ''}" style="left:150px;top:140px;width:600px;height:72px"><span class="trophy">🏆</span><span class="cn">${champName ? champName + ' — CHAMPION!' : 'Champion: ???'}</span></div>`;
  }
  const nextTxt = nx ? `Next: <b class="p0n">${info(nx.m.a).name}</b> vs <b class="p1n">${info(nx.m.b).name}</b> — ${ROUND_TAG[nx.r]}` : (champName ? `${champName} wins ${st.name}!` : '');
  B.innerHTML = `<div class="brc ${portrait ? 'port' : ''}" style="width:${L.W}px;height:${L.H}px">
    <div class="brtitle" style="top:${L.title}px"><div class="logo">${st.name}</div>${Broadcast.opts.channel ? `<div class="br-ch">${Broadcast.opts.channel}</div>` : ''}</div>
    <svg class="brlines" width="${L.W}" height="${L.H}">${lines}</svg>${champBox}${boxes}
    <div class="brfoot" style="top:${L.footer}px"><div class="br-next">${nextTxt}<span id="brCount"></span></div>
      <div class="br-btns">${nx ? '<button class="btn" id="brPlay">▶ Next match</button>' : '<button class="btn" id="brNew">🏆 New tournament</button>'}
      <button class="btn alt" id="brQuit">${nx ? '✕ Quit tournament' : 'Back to builder'}</button></div></div></div>`;
  const [w, h] = frameSize();
  B.querySelector('.brc').style.transform = `translate(-50%, -50%) scale(${Math.min(w / L.W, h / L.H)})`;
  B.classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  if (nx) document.getElementById('brPlay').onclick = () => Tour.play();
  else {
    document.getElementById('brNew').onclick = () => { Tour.quit(); hideBracket(); exitToBuilder(); openTourneySetup(); };
    if (World.has3D && !World.skip3D) VFX.victory(new THREE.Vector3(0, 0, 0));
    AudioFX.Music.victory();
  }
  document.getElementById('brQuit').onclick = () => { Tour.quit(); hideBracket(); exitToBuilder(); };
  clearInterval(bracketTimer);
  if (nx && settings.auto) {
    let n = 6;
    bracketTimer = setInterval(() => {
      const c = document.getElementById('brCount');
      if (!c || document.getElementById('bracket').classList.contains('hidden')) { clearInterval(bracketTimer); return; }
      c.textContent = ` · starting in ${n}…`;
      if (n-- <= 0) { clearInterval(bracketTimer); Tour.play(); }
    }, 1000);
  }
}
// re-layout when the window or the Shorts setting changes
addEventListener('resize', () => { if (!document.getElementById('bracket').classList.contains('hidden')) showBracket(); });
function hideBracket() { clearInterval(bracketTimer); document.getElementById('bracket').classList.add('hidden'); }

// ---- tournament setup + records screens (outside the frame) ---------------
function openTourneySetup() {
  const P = document.getElementById('tourneySetup');
  const picked = new Set(ROSTER.slice().sort(() => Math.random() - 0.5).slice(0, 8).map(t => t.id));
  let me = false;
  const render = () => {
    const need = me ? 7 : 8;
    P.innerHTML = `<div class="ts-box"><h1 class="logo">🏆 Tournament</h1>
      <div class="muted">Pick ${need} trainers${me ? ' + you' : ''} for an 8-trainer knockout bracket. Uses the current team size (${settings.teamSize}), level (${settings.level}) and battle length.</div>
      <label class="chk" style="margin:10px 0"><input type="checkbox" id="tsMe" ${me ? 'checked' : ''}> Enter the tournament myself as <b>${PLAYER[0]}</b> with Player 1's team (${controllers[0] === 'human' ? 'you control it' : 'CPU controls it'})</label>
      <div class="ts-grid">${ROSTER.map(t => `<div class="ts-card ${picked.has(t.id) ? 'on' : ''}" data-id="${t.id}">
        <div class="ts-name">${t.name}</div><div class="ts-title">${t.title}</div>
        <div class="ts-team">${t.team.map(s => `<img src="${DEX.species[s].sprite}" title="${DEX.species[s].display}">`).join('')}</div>
        <div class="ts-rec">${Stats.recordText(t.name)}</div></div>`).join('')}</div>
      <div class="ts-btns">${Tour.state && !Tour.state.champion ? '<button class="btn alt" id="tsResume">↺ Resume saved tournament</button>' : ''}
        <button class="btn alt" id="tsCancel">Cancel</button><button class="btn" id="tsStart" ${picked.size === need && (!me || teams[0].length) ? '' : 'disabled'}>Start (${picked.size}/${need})</button></div></div>`;
    P.querySelectorAll('.ts-card').forEach(c => c.onclick = () => {
      const id = c.dataset.id;
      if (picked.has(id)) picked.delete(id); else if (picked.size < need) picked.add(id);
      render();
    });
    P.querySelector('#tsMe').onchange = e => {
      me = e.target.checked;
      if (me && picked.size > 7) picked.delete([...picked][0]);
      render();
    };
    P.querySelector('#tsCancel').onclick = () => P.classList.add('hidden');
    const res = P.querySelector('#tsResume');
    if (res) res.onclick = () => { P.classList.add('hidden'); document.getElementById('builder').classList.add('hidden'); showBracket(); };
    P.querySelector('#tsStart').onclick = () => {
      const entrants = [...picked].map(id => ({ id }));
      if (me) entrants.push({ me: true, human: controllers[0] === 'human', name: PLAYER[0], outfit: settings.outfits[0], team: teams[0].map(s => ({ ...s, moves: s.moves.slice() })), lines: null });
      Tour.start(entrants);
      P.classList.add('hidden');
      document.getElementById('builder').classList.add('hidden');
      showBracket();
    };
  };
  render();
  P.classList.remove('hidden');
}

function openRecords() {
  const R = document.getElementById('records'), d = Store.data;
  const trainers = Object.entries(d.trainers).sort((a, b) => b[1].w - a[1].w).slice(0, 10);
  const mons = Object.values(d.pokemon).sort((a, b) => b.kos - a.kos || b.wins - a.wins).slice(0, 10);
  R.innerHTML = `<div class="ts-box"><h1 class="logo">📊 Hall of Fame</h1>
    <div class="muted">${d.battles} battles recorded</div>
    <div class="rec-grid">
      <div><h3>🏆 Champions</h3>${d.champions.slice(0, 10).map(c => `<div class="rec-row"><b>${c.name}</b><span>${c.cup} · ${c.date}</span></div>`).join('') || '<div class="muted">No tournaments finished yet</div>'}</div>
      <div><h3>Top trainers</h3>${trainers.map(([n, r]) => `<div class="rec-row"><b>${n}</b><span>${r.w}W – ${r.l}L</span></div>`).join('') || '<div class="muted">No battles yet</div>'}</div>
      <div><h3>Top Pokémon (K.O.s)</h3>${mons.map(m => `<div class="rec-row"><b>${m.name}</b><span>${m.kos} KOs · ${m.wins}/${m.used} wins · ${m.dmg} dmg</span></div>`).join('') || '<div class="muted">No battles yet</div>'}</div>
    </div>
    <div class="ts-btns"><button class="btn alt" id="recClear">Reset records</button><button class="btn" id="recClose">Close</button></div></div>`;
  R.querySelector('#recClose').onclick = () => R.classList.add('hidden');
  R.querySelector('#recClear').onclick = () => {
    if (!confirm('Delete all saved records, champions and the saved tournament?')) return;
    Object.assign(Store.data, { battles: 0, trainers: {}, pokemon: {}, champions: [], tournament: null });
    Store.save(); openRecords();
  };
  R.classList.remove('hidden');
}
