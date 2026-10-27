// Loads the game's classic scripts in order (listed in data-scripts).
const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error('failed to load ' + src));
  document.body.append(s);
});

const list = document.querySelector('script[data-scripts]').dataset.scripts.split(',').map(s => s.trim()).filter(Boolean);
for (const src of list) await loadScript(src);
