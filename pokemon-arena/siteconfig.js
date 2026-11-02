'use strict';
// =====================================================================
//  SITE CONFIG - what the admin page (/admin) sets for every visitor:
//  the game settings (they used to be the builder's Settings panel; its
//  controls are still in the page, hidden, and this sets them the way a
//  click would) and which Journey worlds (and Pokémon Battle Royale) are open or "coming soon".
//  Read from /api/site-config (server/site-config-core.mjs). Without it
//  (opened as a file, or the API down) the game keeps its defaults.
// =====================================================================
const SiteConfig = (() => {
  // config key -> the hidden control that already does the job
  const CONTROLS = { level: 'setLevel', theme: 'setTheme', speed: 'setSpeed', length: 'setLength', pool: 'setPool', sudden: 'setSudden', auto: 'setAuto', replays: 'setReplays',
    flashes: 'setFlashes', cutins: 'setCutins', music: 'setMusic', sfx: 'setSfx', mute: 'setMute', fps: 'setFps', shorts: 'setShorts', journeyInfinite: 'setJourneyInf', channel: 'setChannel' };
  let current = null;

  // set a control and fire its own handler, only when the value really changes
  function setControl(el, v) {
    if (!el) return;
    if (el.type === 'checkbox') { if (el.checked === !!v) return; el.checked = !!v; el.dispatchEvent(new Event('change')); return; }
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === String(v))) return;
    if (el.value === String(v)) return;
    el.value = String(v);
    el.dispatchEvent(new Event(el.type === 'range' || el.type === 'text' ? 'input' : 'change'));
  }
  // ---- what is locked: each Journey world ('valoria', 'meridia') and 'battle' (Pokémon Battle Royale, all 3 modes).
  // state(section): 'open', 'soon' (coming soon) or 'password' (locked until this visitor types its password; the
  // server checks the unlock tokens we keep and says which count in unlocked). The Journey buttons (home.js) ask for
  // the latest config before opening, behind the loading screen (a lock set a moment ago counts); a title screen that
  // is open when its world's lock changes is drawn again (journey.js open())
  const UNLOCK_KEY = 'pokemon-arena-unlocks';
  let unlockMem = {};                                       // this visit, even where the browser keeps nothing
  const readUnlocks = () => { try { return { ...unlockMem, ...JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}') }; } catch (e) { return unlockMem; } };
  function state(sec) {
    if (!current) return 'open';
    const v = sec === 'battle' ? current.battle : current.journey && current.journey[sec];
    return v === 'soon' ? 'soon' : v === 'password' && !(current.unlocked && current.unlocked[sec]) ? 'password' : 'open';
  }
  const locked = sec => state(sec) !== 'open';
  // -> '' when it worked, else what went wrong
  async function unlock(sec, pass) {
    try {
      const r = await fetch('/api/site-config', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ unlock: sec, pass }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.token) return j.error || 'Could not check the password';
      unlockMem = { ...unlockMem, [sec]: j.token };
      try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ ...readUnlocks(), [sec]: j.token })); } catch (e) {}
      await load(4000);
      return '';
    } catch (e) { return 'Could not reach the server. Try again.'; }
  }
  function relock() {
    const t = document.querySelector('.jtitle[data-world]');
    if (t && (t.dataset.lock || 'open') !== state(t.dataset.world) && typeof Journey === 'object') { t.remove(); Journey.open(t.dataset.world); }
  }
  function apply(cfg) {
    current = cfg || {};
    for (const [k, v] of Object.entries(current.game || {})) if (CONTROLS[k]) setControl(document.getElementById(CONTROLS[k]), v);
    relock();
    if (typeof Home === 'object') Home.sync();
  }
  // ms: give up after this long (a slow network never holds the game)
  async function load(ms = 8000) {
    if (location.protocol === 'file:') return;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
      const u = Object.entries(readUnlocks()).filter(([k, v]) => /^\w+$/.test(k) && /^[\w.-]+$/.test(String(v))).map(([k, v]) => k + ':' + v).join(',');
      const r = await fetch('/api/site-config', { cache: 'no-store', signal: ctl.signal, headers: u ? { 'x-unlock': u } : {} });
      clearTimeout(t);
      if (r.ok) apply(await r.json());
    } catch (e) { /* no API here (or too slow): what we had stays */ }
  }
  load();
  setInterval(() => { if (!document.hidden) load(); }, 15000);
  addEventListener('focus', () => load());
  return { load, apply, state, locked, unlock, get current() { return current; } };
})();
