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
  // a world that is "coming soon": its button says so and opens nothing
  function lockWorlds(journey) {
    for (const [w, [id, name]] of Object.entries(WORLD_BTN)) {
      const b = document.getElementById(id);
      if (!b) continue;
      if (!b.dataset.label) { b.dataset.label = b.textContent; b._open = b.onclick; }
      const soon = journey && journey[w] === 'soon';
      b.classList.toggle('soonBtn', soon);
      b.textContent = soon ? b.dataset.label + ' · Coming soon' : b.dataset.label;
      b.title = soon ? name + ' is coming soon!' : b.title.replace(/ is coming soon!$/, '');
      b.onclick = soon ? () => toast(`${name} is coming soon! 🚧`, 2500) : b._open;
    }
  }
  function apply(cfg) {
    current = cfg || {};
    for (const [k, v] of Object.entries(current.game || {})) if (CONTROLS[k]) setControl(document.getElementById(CONTROLS[k]), v);
    lockWorlds(current.journey);
  }
  async function load() {
    try {
      const r = await fetch('/api/site-config', { cache: 'no-store' });
      if (r.ok) apply(await r.json());
    } catch (e) { /* no API here: the defaults stay */ }
  }
  if (location.protocol !== 'file:') load();
  return { load, apply, get current() { return current; } };
})();
