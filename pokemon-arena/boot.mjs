// Loads the game's classic scripts in order (listed in data-scripts).
// window.GameBoot tells the home screen how far it got (done / total) and resolves `ready` once every script ran.
const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error('failed to load ' + src));
  document.body.append(s);
});

const list = document.querySelector('script[data-scripts]').dataset.scripts.split(',').map(s => s.trim()).filter(Boolean);
const boot = window.GameBoot || (window.GameBoot = {});
boot.total = list.length;
boot.done = 0;
let ready;
boot.ready = new Promise(r => { ready = r; });
try {
  for (const src of list) { await loadScript(src); boot.done++; dispatchEvent(new CustomEvent('gameboot', { detail: boot })); }
  boot.loaded = true;
  ready();
  dispatchEvent(new CustomEvent('gameboot', { detail: boot }));
} catch (e) {
  boot.error = e.message;
  dispatchEvent(new CustomEvent('gameboot', { detail: boot }));
  throw e;
}
