const puppeteer = require('../node_modules/puppeteer-core');
const fs = require('fs'), path = require('path');
const dir = __dirname, modDir = path.join(dir, 'store', 'modules');
let modules = fs.readdirSync(modDir).filter(f => f.endsWith('.json') && f !== 'fetched-fonts.json.json').map(f => { const d = JSON.parse(fs.readFileSync(path.join(modDir, f), 'utf8')); return { name: f.replace(/\.json$/, ''), kind: d.kind, text: d.text }; });
const only = process.argv[2];
if (only) { modules = modules.filter(m => !m.name.startsWith('scene-') || m.name === 'scene-' + only + '.js'); const sj = modules.find(m => m.name === 'scenes.json'); const j = JSON.parse(sj.text); j.scenes = j.scenes.filter(s => s.id === only); delete j.fonts; sj.text = JSON.stringify(j); }
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files', '--disable-web-security', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', '--user-data-dir=' + path.join(require('os').tmpdir(), 'motion-probe')] });
  const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080 });
  p.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
  p.on('pageerror', e => console.log('pageerror', e.message.slice(0, 200)));
  p.on('requestfailed', r => console.log('reqfail', r.url().slice(0, 120)));
  await p.goto('file:///' + path.join(dir, 'index.html').split(path.sep).join('/') + '#tools');
  await p.waitForFunction(() => typeof window.__animation === 'object');
  console.log(await p.evaluate(() => Object.keys(window.__animation).join(',')));
  const res = await p.evaluate(f => window.__animation.load(f), { title: 'film', script: 'window.CUT = kit.scenes();', modules, assets: [] });
  console.log(JSON.stringify(res).slice(0, 400));
  console.log(JSON.stringify(await p.evaluate(() => window.__animation.consoleLog())).slice(0, 1500));
  await b.close();
})();
