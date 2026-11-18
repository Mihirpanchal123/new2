// Renders a Motion film's scenes to MP4 locally, with a small stand-in for the player's kit
// (only the parts these films use: stage, h, esc, rng, vnoise, easing, scene, start, dur).
//   node render-motion.js ravana-render ravana-puppets.mp4      -> full video
//   node render-motion.js ravana-render stills 1.5,6,10          -> JPG stills in <dir>/stills
// <dir>/store/modules/*.json are the film's documents (saved from the artifact's database).
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const [dirArg, outArg, list] = process.argv.slice(2);
const dir = path.resolve(__dirname, dirArg), modDir = path.join(dir, 'store', 'modules');
const mods = {};
for (const f of fs.readdirSync(modDir)) if (f.endsWith('.json')) { const d = JSON.parse(fs.readFileSync(path.join(modDir, f), 'utf8')); mods[f.replace(/\.json$/, '')] = d.text; }
const film = JSON.parse(mods['scenes.json']);

const HARNESS = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@600;800&display=block">
<style>html,body{margin:0;background:#000;overflow:hidden} #stage{position:relative;overflow:hidden;--sans:"Mukta","Nirmala UI",sans-serif} .scn{position:absolute;inset:0;display:none}</style>
<style id="base"></style></head><body><div id="stage"></div></body></html>`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--font-render-hinting=none', '--force-color-profile=srgb'] });
  const page = await browser.newPage();
  await page.setViewport({ width: film.width, height: film.height, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.setContent(HARNESS, { waitUntil: 'networkidle0' });
  await page.evaluate(async (mods, film) => {
    document.getElementById('base').textContent = mods['base.css'];
    const stage = document.getElementById('stage'); stage.style.width = film.width + 'px'; stage.style.height = film.height + 'px';
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const rng = (seed) => { let a = (seed * 9301 + 49297) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const vnoise = (seed) => { const r = rng(seed), v = Array.from({ length: 256 }, () => r() * 2 - 1); return (x) => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return v[i & 255] * (1 - s) + v[(i + 1) & 255] * s; }; };
    const base = { clamp01, rng, vnoise, lerp: (a, b, t) => a + (b - a) * t, seg: (t, a, b) => clamp01((t - a) / (b - a)),
      eo: (x) => 1 - Math.pow(1 - clamp01(x), 3), ei: (x) => Math.pow(clamp01(x), 3), eio: (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
      esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      h: (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.children.length === 1 ? t.content.firstElementChild : t.content; },
      W: film.width, H: film.height };
    const defs = {};
    let start = 0; const scenes = film.scenes.map((s) => { const o = { ...s, start }; start += s.dur; return o; });
    window.__total = start;
    new Function('kit', mods['shared.js'])(Object.assign({}, base, { scene() {} }));
    for (const s of scenes) {
      const el = document.createElement('div'); el.className = 'scn'; stage.appendChild(el);
      const kit = Object.assign({}, base, { stage: el, start: s.start, dur: s.dur, scene: (id, def) => { defs[id] = def; } });
      new Function('kit', mods['scene-' + s.id + '.js'])(kit);
      const def = defs[s.id]; s.el = el; s.def = def; s.kit = kit;
      if (def.init) await def.init.call(def, kit);
    }
    window.__show = (t) => {
      let cur = scenes[scenes.length - 1];
      for (const s of scenes) if (t < s.start + s.dur) { cur = s; break; }
      for (const s of scenes) s.el.style.display = s === cur ? 'block' : 'none';
      cur.def.render.call(cur.def, t - cur.start, cur.kit);
    };
  }, mods, film);
  await page.evaluate(() => document.fonts.ready);
  const fps = film.fps || 30, total = Math.round((await page.evaluate(() => window.__total)) * fps);
  const grab = async (t) => { await page.evaluate((tt) => window.__show(tt), t); return page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: film.width, height: film.height } }); };
  if (outArg === 'stills') {
    fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
    for (const t of list.split(',').map(Number)) { fs.writeFileSync(path.join(dir, 'stills', 't_' + t.toFixed(2).padStart(6, '0') + '.jpg'), await grab(t)); }
    console.log('stills done');
  } else {
    const out = path.resolve(__dirname, outArg);
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      if (!ff.stdin.write(await grab(f / fps))) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 300 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r));
    console.log('done ->', out, (total / fps).toFixed(2) + 's in', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await browser.close();
})();
