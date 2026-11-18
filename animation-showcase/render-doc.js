// Generic renderer for the documentary pages.
//   node render-doc.js dholavira                 -> dholavira-hindi.mp4 (+ .srt, timing json)
//   node render-doc.js dholavira lines           -> only writes the timing json (for make-voice.js)
//   node render-doc.js dholavira stills 30 200   -> stills/dholavira_XXXX.jpg
//   node render-doc.js dholavira shots           -> one still per shot
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECTS = {
  taj: { html: 'taj.html', vo: 'vo', base: 'taj-mahal-hindi', timing: 'timing.json' },
  dholavira: { html: 'dholavira.html', vo: 'vo-dholavira', base: 'dholavira-hindi', timing: 'dholavira-timing.json' },
  'dholavira-yt': { html: 'dholavira-yt.html', vo: 'vo-dholavira-yt', base: 'dholavira-youtube-hindi', timing: 'dholavira-yt-timing.json', crf: 20 },
};
const name = process.argv[2], P = PROJECTS[name];
if (!P) { console.error('usage: node render-doc.js <' + Object.keys(PROJECTS).join('|') + '> [lines|stills …|shots]'); process.exit(1); }
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = 30;
const srtTime = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  page.on('console', m => console.log('page:', m.text()));
  const mode = process.argv[3];
  const voFile = path.join(__dirname, P.vo, 'durations.json');
  const VO = mode !== 'lines' && fs.existsSync(voFile) ? JSON.parse(fs.readFileSync(voFile, 'utf8')) : null;
  if (VO) await page.evaluateOnNewDocument(d => { window.VO = d; }, VO.map(v => v.trim));
  await page.goto('file:///' + path.resolve(__dirname, P.html).replace(/\\/g, '/'));
  await page.waitForFunction('window.ready === true', { timeout: 120000 });
  const info = await page.evaluate(() => ({ total: window.TOTAL_FRAMES, lines: window.LINES, shots: window.SHOTS }));
  if (VO && VO.length !== info.lines.length) throw new Error(`voice has ${VO.length} clips but script has ${info.lines.length} lines — re-run make-voice.js`);
  const grab = async f => Buffer.from((await page.evaluate(f => window.renderFrame(f), f)).split(',')[1], 'base64');

  if (mode === 'lines') {
    fs.writeFileSync(path.join(__dirname, P.timing), JSON.stringify(info, null, 2), 'utf8');
    console.log(`${info.lines.length} lines -> ${P.timing} (${(info.total / FPS).toFixed(1)}s without voice)`);
  } else if (mode === 'stills' || mode === 'shots') {
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    const frames = mode === 'shots'
      ? info.shots.map(s => Math.round((s.s + s.d * 0.6) * FPS))
      : process.argv.slice(4).map(Number);
    for (const f of frames) {
      fs.writeFileSync(path.join(__dirname, 'stills', `${name}_${String(f).padStart(4, '0')}.jpg`), await grab(f));
      console.log('still', f);
    }
  } else {
    const base = path.join(__dirname, P.base);
    fs.writeFileSync(base + '.srt', info.lines.map((l, i) => `${i + 1}\n${srtTime(l.s)} --> ${srtTime(l.e)}\n${l.txt}\n`).join('\n'), 'utf8');
    fs.writeFileSync(path.join(__dirname, P.timing), JSON.stringify(info, null, 2), 'utf8');
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(P.crf || 18), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + (VO ? '_silent.mp4' : '.mp4')],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < info.total; f++) {
      if (!ff.stdin.write(await grab(f))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${info.total}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    if (VO) {
      // place every voice line at its subtitle start, mix, normalise loudness, mux with the video
      const inputs = VO.flatMap(v => ['-i', path.join(__dirname, v.wav)]);
      const delays = info.lines.map((l, i) => { const ms = Math.round(l.s * 1000); return `[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`; });
      const mix = `${info.lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${info.lines.length}:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=7,aresample=48000,apad[aout]`;
      const args = ['-y', '-loglevel', 'error', '-i', base + '_silent.mp4', ...inputs,
        '-filter_complex', [...delays, mix].join(';'), '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', base + '.mp4'];
      await new Promise((res, rej) => spawn(ffmpeg, args, { stdio: 'inherit' }).on('close', c => c === 0 ? res() : rej(new Error('audio mux failed: ' + c))));
      fs.unlinkSync(base + '_silent.mp4');
    }
    console.log('done ->', base + '.mp4', `(${(info.total / FPS).toFixed(1)}s video${VO ? ', with voice-over' : ''}) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
})();
