'use strict';
// =====================================================================
//  HOME - the first screen: Pokémon Journey (its two journeys) or Pokémon
//  Battle Royale (1v1, Battle Royale, Brawl; a mode opens the team builder
//  set to it). Loaded before the game's scripts so it works at once; a
//  choice made while they are still loading waits behind the loading
//  screen (a Pokéball shaking), and so does a Journey while its world,
//  the admin's settings, the pixel font and the party's sprites load.
// =====================================================================
const Home = (() => {
  const $ = id => document.getElementById(id);
  const home = $('home'), loader = $('loader');
  const WORLDS = {
    valoria: { title: 'Pokémon Journey', key: 'pokemon-arena-journey-v1' },
    meridia: { title: 'Pokémon Journey II', key: 'pokemon-arena-journey2-v1' }
  };
  const FORMAT_TITLE = { '1v1': '1v1 Battle', royale: 'Battle Royale', brawl: 'Team Brawl' };
  const MONS = ['pikachu', 'eevee', 'mudkip', 'torchic', 'lapras', 'lucario', 'gengar', 'charizard', 'chandelure', 'garchomp'];
  const TIPS = [
    'Your lead Pokémon walks behind you. Reorder the party to change who comes along.',
    'In Journey II, press <b>A</b> on an Echo Shrine to step into the grey twin of a place.',
    'Once you have Lapras, face the water and press <b>A</b> to surf.',
    'Lost? <b>MENU › NOTEBOOK</b> keeps every clue you have found in Journey II.',
    'In Battle Royale every Pokémon fights every other one. The last one standing wins.',
    'Brawl puts both whole teams on the field at the same time.',
    'Press <b>F3</b> to show or hide the frame-rate readout.',
    'A Pokémon with a Mega Stone can Mega Evolve once per battle.',
    'The game saves when you change maps, after battles and from the menu.'
  ];
  const SHOW_AFTER = 120;                              // ms: anything faster opens without a loading screen
  const MIN_SHOWN = 700;                               // ms: once shown, it stays this long (no flicker)
  let busy = false;

  // ---- the two steps of the home screen
  function step(name) {
    home.querySelectorAll('.hm-step').forEach(s => s.classList.toggle('hidden', s.dataset.step !== name));
  }
  function show() { step('main'); home.classList.remove('hidden'); }
  function hide() { home.classList.add('hidden'); }

  // ---- the loading screen
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function paint(p, label) {
    loader.querySelector('.ld-bar i').style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%';
    if (label != null) loader.querySelector('.ld-step').textContent = label;
  }
  function openLoader(title) {
    loader.querySelector('.ld-title').textContent = title;
    const [a, b] = [pick(MONS), pick(MONS)];
    loader.querySelector('.ld-mon.l').src = `faces/${a}.png`;
    loader.querySelector('.ld-mon.r').src = `faces/${b === a ? 'pikachu' : b}.png`;
    loader.querySelector('.ld-tip').innerHTML = 'Tip: ' + pick(TIPS);
    loader.querySelector('.ld-err') && loader.querySelector('.ld-err').remove();
    loader.querySelector('.ld-bar').classList.remove('hidden');
    loader.classList.remove('hidden', 'out');
  }
  function closeLoader() {
    loader.classList.add('out');
    setTimeout(() => { if (loader.classList.contains('out')) loader.classList.add('hidden'); }, 320);
  }
  function failLoader(msg) {
    loader.querySelector('.ld-step').textContent = '';
    loader.querySelector('.ld-bar').classList.add('hidden');
    const e = document.createElement('div');
    e.className = 'ld-err';
    e.innerHTML = `Something went wrong while loading: ${String(msg).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}<br><button class="btn">↻ Try again</button> <button class="btn alt">Back</button>`;
    e.querySelector('.btn').onclick = () => location.reload();
    e.querySelector('.btn.alt').onclick = () => { e.remove(); closeLoader(); };
    loader.append(e);
  }
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), sleep(ms)]);

  // the game's own scripts (boot.mjs counts them): the first 60% of the bar
  function gameFiles(report) {
    const B = () => window.GameBoot || {};
    if (B().loaded) return Promise.resolve();
    return new Promise((res, rej) => {
      let hooked = false;
      const tick = () => {
        const b = B();
        if (b.error) { removeEventListener('gameboot', tick); rej(new Error(b.error)); return; }
        if (b.total) report(b.done / b.total);
        if (b.ready && !hooked) { hooked = true; b.ready.then(() => { removeEventListener('gameboot', tick); res(); }); }
        if (b.loaded) { removeEventListener('gameboot', tick); res(); }
      };
      addEventListener('gameboot', tick);
      tick();
    });
  }

  // run the steps ([label, share of the bar, fn(report)]), with the loading screen if it takes a while
  async function load(title, steps) {
    let shownAt = 0, done = 0, label = steps[0][0];
    const timer = setTimeout(() => { shownAt = performance.now(); openLoader(title); paint(done, label); }, SHOW_AFTER);
    try {
      for (const [l, share, fn] of steps) {
        label = l; if (shownAt) paint(done, label);
        await fn(p => { if (shownAt) paint(done + share * p); });
        done += share; if (shownAt) paint(done);
      }
    } catch (e) {
      clearTimeout(timer);
      if (!shownAt) openLoader(title);
      failLoader(e.message || e);
      throw e;
    }
    clearTimeout(timer);
    if (shownAt) {
      paint(1, 'Ready!');
      const left = MIN_SHOWN - (performance.now() - shownAt);
      if (left > 0) await sleep(left);
      closeLoader();
    }
  }

  // ---- Pokémon Journey: Journey I (Valoria) or Journey II (Meridia)
  async function journey(world) {
    if (busy) return;
    busy = true;
    const w = WORLDS[world] || WORLDS.valoria;
    try {
      await load(w.title, [
        ['Loading game files', 0.55, gameFiles],
        ['Checking the world', 0.1, () => typeof SiteConfig === 'object' && within(SiteConfig.load(1500), 2000)],
        ['Loading pixel art', 0.2, async report => {
          // the font every Journey screen is written in, and the sprites of the Pokémon that walk with you
          let save = null;
          try { save = JSON.parse(localStorage.getItem(w.key) || 'null'); } catch (e) {}
          const party = (save && save.party || []).slice(0, 2).map(m => m.species).filter(Boolean);
          const jobs = [document.fonts ? document.fonts.load('20px Tiny5') : null, ...party.map(s => typeof PixelMons === 'object' ? PixelMons.preload(s) : null)];
          let n = 0;
          await within(Promise.all(jobs.map(j => Promise.resolve(j).catch(() => null).then(() => report(++n / jobs.length)))), 8000);
        }],
        ['Building the region', 0.15, async () => {
          await frame();
          Journey.open(world);
          const imgs = [...document.querySelectorAll('.jtitle img')];
          await within(Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => null) : null)), 3000);
          await frame();
        }]
      ]);
    } catch (e) { console.error(e); }
    finally { busy = false; }
  }

  // ---- Pokémon Battle Royale "coming soon" or "password" (set on /admin, siteconfig.js calls sync on every config):
  // the home card says so, its step shows a sign (or the password box) instead of the 3 modes, and anyone on the
  // team builder goes back home
  const battleCard = home.querySelector('.hm-card.c-battle'), battleStep = home.querySelector('.hm-step[data-step="battle"]');
  const battleTag = battleCard.querySelector('i'), battleTagText = battleTag.textContent;
  const passForm = battleStep.querySelector('.hm-pass'), passInput = passForm.querySelector('input'), passMsg = passForm.querySelector('.hm-pass-msg');
  const lockState = sec => typeof SiteConfig === 'object' ? SiteConfig.state(sec) : 'open';
  const battleState = () => lockState('battle');
  const battleLocked = () => battleState() !== 'open';
  function sync() {
    const state = battleState(), soon = state !== 'open';
    battleCard.classList.toggle('soon', soon);
    battleStep.classList.toggle('soon', state === 'soon');
    battleStep.classList.toggle('locked', state === 'password');
    battleTag.textContent = state === 'soon' ? '🚧 Coming soon' : state === 'password' ? '🔒 Password' : battleTagText;
    if (state !== 'password') { passInput.value = ''; passMsg.textContent = ''; }
    // the two Journey cards: their tag says when the world is coming soon or needs its password (its title screen asks)
    for (const [w, card] of [['valoria', $('journeyBtn')], ['meridia', $('journey2Btn')]]) {
      const tag = card.querySelector('i'), st = lockState(w);
      if (tag.dataset.text == null) tag.dataset.text = tag.textContent;
      card.classList.toggle('soon', st !== 'open');
      tag.textContent = st === 'soon' ? '🚧 Coming soon' : st === 'password' ? '🔒 Password' : tag.dataset.text;
    }
    // on the team builder (not in a battle that is already running, not in a Journey): back to the sign
    const builder = $('builder');
    if (soon && home.classList.contains('hidden') && builder && !builder.classList.contains('hidden') && !document.body.classList.contains('journey')) {
      show(); step('battle');
    }
  }

  // ---- Pokémon Battle Royale: a mode opens the team builder (the Pokémon selector) set to it
  async function battle(fmt) {
    if (busy) return;
    busy = true;
    try {
      await load(FORMAT_TITLE[fmt] || 'Pokémon Battle', [
        ['Loading the Pokédex', 0.9, gameFiles],
        ['Checking the arena', 0.1, () => typeof SiteConfig === 'object' && within(SiteConfig.load(1500), 2000)]
      ]);
      if (battleLocked()) { sync(); step('battle'); return; }
      const b = document.querySelector(`#builder .fmtSeg button[data-fmt="${fmt}"]`);
      if (b) b.click();
      hide();
    } catch (e) { console.error(e); }
    finally { busy = false; }
  }

  // the password box: the server checks it (SiteConfig.unlock), then sync shows the 3 modes
  passForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = passForm.querySelector('button');
    if (!passInput.value.trim() || btn.disabled) return;
    btn.disabled = true; passMsg.className = 'hm-pass-msg'; passMsg.textContent = 'Checking...';
    const err = await SiteConfig.unlock('battle', passInput.value);
    btn.disabled = false;
    if (err) { passMsg.className = 'hm-pass-msg bad'; passMsg.textContent = err; passInput.select(); }
  });

  // ---- wiring
  home.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { step(go.dataset.go); if (go.dataset.go === 'battle' && battleState() === 'password') passInput.focus(); return; }
    const mode = e.target.closest('[data-mode]');
    if (mode) battle(mode.dataset.mode);
  });
  $('journeyBtn').addEventListener('click', () => journey('valoria'));
  $('journey2Btn').addEventListener('click', () => journey('meridia'));
  $('homeBtn').addEventListener('click', show);
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || home.classList.contains('hidden') || !loader.classList.contains('hidden')) return;
    const cur = home.querySelector('.hm-step:not(.hidden)');
    if (cur && cur.dataset.step !== 'main') step('main');
  });

  return { show, hide, step, journey, battle, sync };
})();
