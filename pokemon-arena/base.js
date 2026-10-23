'use strict';
// =====================================================================
//  BASE — what every mode needs: the game clock (tweens, timers), the
//  render loop, the frame and small helpers. The 3D engine (core.js and
//  the other 3D scripts) loads only when 3D mode is picked; until then
//  World holds harmless stand-ins for the few 3D calls menus make.
// =====================================================================
let SPEED = 1;                 // global animation speed (1 = normal, lower = faster)
let PAUSED = false;            // freezes the game clock (tweens, timers, animation, effects)
let TIME_SCALE = 1;            // < 1 = slow motion (crits, knockouts, replays)
let FX_TIME = 1;               // < 1 while a 3D move animation plays (longer, slower move effects)

// the game view lives in #frame (full window, or a 9:16 column in Shorts mode)
const frameEl = document.getElementById('frame');
const frameSize = () => [frameEl.clientWidth || innerWidth, frameEl.clientHeight || innerHeight];

// trainer outfits (3D trainers and the Retro pixel trainers both use them)
const OUTFITS = {
  red:   { label: 'Red',   hat: 'cap',     hatColor: 0xd62828, hatFront: 0xffffff, hair: 0x2b1d14, hairStyle: 'short',    top: 0xd62828, sleeves: 'short', inner: 0x222222, legs: 0x2f4b8f, legStyle: 'pants',  shoes: 0xd62828, bag: 0xe9b949 },
  blue:  { label: 'Blue',  hat: null,      hair: 0x9a6430, hairStyle: 'spiky',    top: 0x5b3a8e, sleeves: 'long',  inner: 0x2b2b2b, legs: 0x6b5a45, legStyle: 'pants',  shoes: 0x333333, bag: null, necklace: 0xcfd8dc },
  leaf:  { label: 'Leaf',  hat: 'sunhat',  hatColor: 0xffffff, hatBand: 0xd62828, hair: 0x6b3d1f, hairStyle: 'long', top: 0x31b3c9, sleeves: 'none', inner: 0x31b3c9, legs: 0xd62828, legStyle: 'skirt', shoes: 0xffffff, bag: 0xe9b949 },
  may:   { label: 'May',   hat: 'bandana', hatColor: 0xd62828, hair: 0x7a4a26, hairStyle: 'pigtails', top: 0xd62828, sleeves: 'short', inner: 0xd62828, legs: 0x262626, legStyle: 'shorts', shoes: 0xd62828, bag: 0x46b04a },
  dawn:  { label: 'Dawn',  hat: 'beanie',  hatColor: 0xffffff, hatFront: 0xe85aa0, hair: 0x24365e, hairStyle: 'long', top: 0x1e1e2a, sleeves: 'none', inner: 0x1e1e2a, legs: 0x1e1e2a, legStyle: 'skirt', shoes: 0xe85aa0, scarf: 0xe85aa0, bag: 0xe9b949 },
  ethan: { label: 'Ethan', hat: 'capback', hatColor: 0x222222, hatFront: 0xe9b949, hair: 0x2b1d14, hairStyle: 'short', top: 0xd62828, sleeves: 'short', inner: 0xe9b949, legs: 0x2f3e5f, legStyle: 'shorts', shoes: 0xd62828, bag: 0xe9b949 }
};

// the arena choices (Retro picks the matching place: retro.js THEME_MAP), frame capture and slow motion
const THEME_NAMES = { stadium: 'Pokémon Stadium', forest: 'Viridian Forest', volcano: 'Mt. Chimney Crater', beach: 'Sunny Beach', icecave: 'Ice Path Cavern', city: 'Lumiose Night Arena' };
const World = {
  themeKeys: Object.keys(THEME_NAMES),
  themeName: k => THEME_NAMES[k] || k,
  captureSource: null                                // the battle canvas (Retro sets it), for thumbnails
};

// ---------------------------------------------------------------------
//  Timing: tweens + per-frame hooks (all scaled by SPEED)
// ---------------------------------------------------------------------
const tweens = [];
const frameHooks = new Set();
function tween(dur, fn) { return new Promise(res => tweens.push({ t: 0, dur: dur * SPEED, fn, res })); }
// timers on the game clock: they pause with the game and scale with SPEED
const wait = ms => tween(ms / 1000, () => {});
const later = (fn, ms) => { tween(ms / 1000, () => {}).then(fn); };
World.clearTimers = () => { tweens.length = 0; };
const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const easeOut = p => 1 - (1 - p) * (1 - p);
const easeIn = p => p * p;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------
//  Render loop: tweens, frame hooks and updaters (Retro) run in order
// ---------------------------------------------------------------------
const updaters = [];
const captureWaiters = [];
// grab the next rendered frame as an image (for thumbnails)
World.captureFrame = () => new Promise(res => captureWaiters.push(res));
// slow motion for dramatic moments (real-time duration, independent of the game clock)
World.slowmo = (scale, ms) => new Promise(res => { TIME_SCALE = scale; setTimeout(() => { TIME_SCALE = 1; res(); }, ms); });
let gameTime = 0;
function startLoop() {
  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    now = now || performance.now();
    const realDt = Math.min(Math.max(0, now - last) / 1000, 0.05);
    last = now;
    const dt = PAUSED ? 0 : realDt * TIME_SCALE * FX_TIME;
    gameTime += dt;
    const t = gameTime;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / Math.max(tw.dur, 0.001));
      tw.fn(k);
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    frameHooks.forEach(fn => fn(dt, t));
    for (const u of updaters) u(dt, t);
    if (captureWaiters.length) {
      const src = World.captureSource;
      if (src) { const url = src.toDataURL('image/jpeg', 0.92); captureWaiters.splice(0).forEach(fn => fn(url)); }
    }
  })();
}
