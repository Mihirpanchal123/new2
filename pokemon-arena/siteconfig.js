'use strict';
// =====================================================================
//  SITE CONFIG - what the admin page (/admin) sets for every visitor:
//  the game settings (they used to be the builder's Settings panel; its
//  controls are still in the page, hidden, and this sets them the way a
//  click would) and which Journey worlds are open or "coming soon".
//  Read from /api/site-config (server/site-config-core.mjs). Without it
//  (opened as a file, or the API down) the game keeps its defaults.
// =====================================================================
const SiteConfig = (() => {
  // config key -> the hidden control that already does the job
  const CONTROLS = { level: 'setLevel', theme: 'setTheme', speed: 'setSpeed', length: 'setLength', pool: 'setPool', sudden: 'setSudden', auto: 'setAuto', replays: 'setReplays',
    flashes: 'setFlashes', cutins: 'setCutins', music: 'setMusic', sfx: 'setSfx', mute: 'setMute', fps: 'setFps', shorts: 'setShorts', journeyInfinite: 'setJourneyInf', channel: 'setChannel' };
  const WORLD_BTN = { valoria: ['journeyBtn', 'Journey'], meridia: ['journey2Btn', 'Journey II'] };
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
  // the Journey buttons ask for the latest config before opening (a lock set a moment ago counts); a title screen
  // that is open when its world gets locked turns into "Coming soon" (journey.js open() shows that)
  function hookWorlds() {
    for (const [w, [id]] of Object.entries(WORLD_BTN)) {
      const b = document.getElementById(id);
      if (!b || b._open) continue;
      b._open = b.onclick;
      b.onclick = async e => { b.disabled = true; try { await load(1500); } finally { b.disabled = false; } b._open(e); };
    }
  }
  const locked = w => !!(current && current.journey && current.journey[w] === 'soon');
  function relock() {
    const t = document.querySelector('.jtitle[data-world]');
    if (t && locked(t.dataset.world) && !t.querySelector('.jt-soon') && typeof Journey === 'object') { t.remove(); Journey.open(t.dataset.world); }
  }
  function apply(cfg) {
    current = cfg || {};
    for (const [k, v] of Object.entries(current.game || {})) if (CONTROLS[k]) setControl(document.getElementById(CONTROLS[k]), v);
    relock();
  }
  // ms: give up after this long (a slow network never holds the game)
  async function load(ms = 8000) {
    if (location.protocol === 'file:') return;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
      const r = await fetch('/api/site-config', { cache: 'no-store', signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) apply(await r.json());
    } catch (e) { /* no API here (or too slow): what we had stays */ }
  }
  hookWorlds();
  load();
  setInterval(() => { if (!document.hidden) load(); }, 15000);
  addEventListener('focus', () => load());
  return { load, apply, locked, get current() { return current; } };
})();
