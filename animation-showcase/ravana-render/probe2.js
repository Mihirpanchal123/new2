const puppeteer = require('../node_modules/puppeteer-core');
const path = require('path'); const fs = require('fs');
const modules = [
  { name: 'scenes.json', kind: 'json', text: JSON.stringify({ v: 1, stage: 'final', width: 1080, height: 1920, fps: 30, background: '#222222', scenes: [{ id: 'a', name: 'A', dur: 2, desc: 'x' }] }) },
  { name: 'base.css', kind: 'css', text: '#stage{--ground:#222222} .ground{position:absolute;inset:0;background:var(--ground)}' },
  { name: 'shared.js', kind: 'js', text: 'window.W = {};' },
  { name: 'scene-a.js', kind: 'js', text: "kit.scene('a', { init(kit){ kit.stage.append(kit.h('<div class=\"ground\"><p style=\"color:white;font-size:80px\">hello</p></div>')); }, render(t){} });" },
];
const http=require('http');const MT={'.html':'text/html','.js':'text/javascript','.css':'text/css'};const srv=http.createServer((q,r)=>{const f=path.join(__dirname,decodeURIComponent(q.url.split(/[?#]/)[0]));if(!f.startsWith(__dirname)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MT[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(8765,'127.0.0.1');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080 });
  p.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
  await p.goto('http://127.0.0.1:8765/index.html#tools');
  await p.waitForFunction(() => typeof window.__animation === 'object');
  const res = await p.evaluate(f => window.__animation.load(f), { title: 'film', script: 'window.CUT = kit.scenes();', modules, assets: [] });
  console.log(JSON.stringify(res).slice(0, 300));
  await b.close(); srv.close();
})();
