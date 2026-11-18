// Usage:
//   node render.js                 -> renders showcase.mp4 (600 frames, 20s @ 30fps)
//   node render.js stills 30 90 …  -> writes stills/frame_XXX.jpg for quick checks
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = 30, TOTAL = 600;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  page.on('console', m => console.log('page:', m.text()));
  await page.goto('file:///' + path.resolve(__dirname, 'scene.html').replace(/\\/g, '/'));
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  const grab = async f => Buffer.from((await page.evaluate(f => window.renderFrame(f), f)).split(',')[1], 'base64');

  if (process.argv[2] === 'stills') {
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const f of process.argv.slice(3).map(Number)) {
      fs.writeFileSync(path.join(__dirname, 'stills', `frame_${String(f).padStart(3, '0')}.jpg`), await grab(f));
      console.log('still', f);
    }
  } else {
    const out = path.join(__dirname, 'showcase.mp4');
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < TOTAL; f++) {
      if (!ff.stdin.write(await grab(f))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${TOTAL}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('done ->', out, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
})();
