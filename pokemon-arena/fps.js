'use strict';
// =====================================================================
//  FPS - a live frame-rate readout for every mode (arena battles,
//  Battle Royale, tournaments, Adventure, Journey). It counts the
//  browser's real frames with its own requestAnimationFrame, so it shows
//  what reaches the screen whatever is running. Twice a second: frames
//  per second, the average frame time, and the low (the slowest frame of
//  that half second, as fps: a stutter shows there even when the average
//  looks fine). A page element, not part of the canvas: never in a
//  recording. F3 or Settings > Show FPS turns it on and off (game.js).
// =====================================================================
const FPS = (() => {
  const WINDOW = 500;                                  // ms per reading
  const el = document.createElement('div');
  el.id = 'fpsMeter';
  el.setAttribute('aria-hidden', 'true');
  // a slim tab hanging from the top edge: clear of the battle timer just below it
  el.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;' +
    'font:600 10px/1 ui-monospace,Consolas,monospace;padding:2px 7px 3px;border-radius:0 0 7px 7px;background:rgba(12,14,20,.72);color:#e8e8f0;' +
    'white-space:nowrap;letter-spacing:.02em;display:none';
  document.body.append(el);
  let on = false, raf = 0, last = 0, t0 = 0, frames = 0, worst = 0;
  const colour = f => f >= 55 ? '#4ade80' : f >= 30 ? '#facc15' : '#f87171';
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (last) { const dt = now - last; frames++; if (dt > worst) worst = dt; }
    last = now;
    if (!t0) { t0 = now; return; }
    const span = now - t0;
    if (span < WINDOW || !frames) return;
    const fps = frames * 1000 / span, ms = span / frames, low = 1000 / worst;
    el.innerHTML = `<b style="color:${colour(fps)}">${Math.round(fps)} FPS</b> · ${ms.toFixed(1)} ms · low <b style="color:${colour(low)}">${Math.round(low)}</b>`;
    t0 = now; frames = 0; worst = 0;
  }
  function restart() { last = t0 = frames = worst = 0; }
  function show(v) {
    on = !!v;
    el.style.display = on ? '' : 'none';
    cancelAnimationFrame(raf);
    if (on) { restart(); el.textContent = '-- FPS'; raf = requestAnimationFrame(frame); }
  }
  // a hidden tab gets no frames: start the count over when it comes back, instead of reading one huge "frame"
  document.addEventListener('visibilitychange', () => { if (on && !document.hidden) restart(); });
  return { show, get on() { return on; } };
})();
