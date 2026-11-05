// Makes vertical (9:16, 1080x1920) Instagram Reels / Shorts for Journey and Journey II from the game itself, the way
// tools/make-trailer.mjs makes the trailers: a director script inside the page stages real shots and records the tab.
// The page is laid out as a phone (540x960 at 2x), so every shot is the game's own portrait layout.
// On top: a hook headline in the top safe zone, a voiceover with word-by-word captions above Instagram's caption area,
// the trailer score (ducked under the voice) and an end card with the call to action.
//
// The voiceover: one WAV per line in videos/reels/vo/ (r1a.wav, r1b.wav, ...). Lines that have no WAV yet are spoken
// by Windows' built-in voice (System.Speech; Windows only, offline). To use your own voice or a better AI voice, record
// or generate a WAV with the same name and drop it in: it is kept as long as the line's text does not change
// (--revoice redoes every line with the Windows voice).
//
// Usage: node tools/make-reels.mjs [--reel=1,3|all] [--out-dir=videos/reels] [--voice=david|zira] [--rate=1]
//                                  [--no-vo] [--revoice] [--webm] [--show] [--stills=<dir>]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { remux } from './remux-mp4.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const WEBM = !!arg('webm', false), SHOW = !!arg('show', false), STILLS = arg('stills', ''), NOVO = !!arg('no-vo', false), REVOICE = !!arg('revoice', false);
const OUTDIR = path.resolve(ROOT, arg('out-dir', 'videos/reels')), VODIR = path.join(ROOT, 'videos/reels/vo');
const VOICE = { david: 'Microsoft David Desktop', zira: 'Microsoft Zira Desktop' }[String(arg('voice', 'david')).toLowerCase()] || 'Microsoft David Desktop';
const RATE = Number(arg('rate', 1));
// a phone: 540x960 CSS pixels at 2x = a 1080x1920 picture
const W = 540, H = 960, DPR = 2;
const t0 = Date.now(), stamp = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's';

// =====================================================================
//  The reels: name, and the voiceover (subtitle text; *word* = highlighted, ... = a beat)
// =====================================================================
const REELS = {
  1: { name: 'reel1-journey-valoria', title: 'Journey: The Eclipse of Valoria', lines: {
    a: 'This is a full *Pokémon adventure*... and it runs right in your *browser*.',
    b: 'A meteor shattered over *Valoria*...',
    c: '...and its shards awoke the power of *Mega Evolution*.',
    d: 'Choose your partner. Starters from *every region*.',
    e: 'Explore *8 chapters* and *81 hand-made maps*.',
    f: 'Battle gym leaders in *real time*.',
    g: 'Stop *Team Eclipse*... and face the *legends*.',
    h: 'Pokémon Journey. Play it *free*. Link in *bio*.' } },
  2: { name: 'reel2-journey2-meridia', title: 'Journey II: The Lost Days of Meridia', lines: {
    a: 'Someone is *stealing the days* of Meridia.',
    b: 'Whole days vanish from *everyone\'s memory*...',
    c: '...and only *you* remember.',
    d: 'Find clues. Fill your *notebook*. Solve the *mystery*.',
    e: 'Cross into *the Echo*... a grey world where lost moments are kept.',
    f: 'Ride a *ghost train* that vanished twenty years ago.',
    g: 'And when your best friend becomes your *rival*... will you fight?',
    h: 'Journey Two. The Lost Days of Meridia. Play *free*. Link in *bio*.' } },
  3: { name: 'reel3-realtime-battles', title: 'Real-time battles', lines: {
    a: 'What if Pokémon battles were in *real time*?',
    b: 'No turns. No waiting. They *move*, *dodge* and *strike* live.',
    c: '*Mega Evolve* mid-battle.',
    d: 'Every move has its *own animation*.',
    e: 'Gym leaders. Rivals. And *giant legends*.',
    f: 'Two full adventures. Play *free*. Link in *bio*.' } },
  4: { name: 'reel4-catch-evolve', title: 'Catch, evolve, Mega Evolve', lines: {
    a: 'Pick *any starter*... from *any region*.',
    b: 'Catch *wild Pokémon*.',
    c: '*Evolve* them.',
    d: 'Then unlock *Mega Evolution*.',
    e: '*481 Pokémon* to collect. Can you fill your *Pokédex*?',
    f: 'Play *free* in your browser. Link in *bio*.' } },
  5: { name: 'reel5-two-worlds', title: 'Two worlds to explore', lines: {
    a: '*Two* Pokémon adventures. *Twenty* chapters. *Free*.',
    b: 'Explore the towns and routes of *Valoria*...',
    c: '...then cross the sea to *Meridia*.',
    d: '*Surf* the sea lanes on Lapras.',
    e: 'Sneak past the guards in a *heist*.',
    f: 'And *fly* anywhere you\'ve been.',
    g: 'Play *free* in your browser. Link in *bio*. *Follow* for more.' } }
};
const want = String(arg('reel', 'all')) === 'all' ? Object.keys(REELS).map(Number) : String(arg('reel')).split(',').map(Number).filter(n => REELS[n]);
if (!want.length) { console.log('No such reel: --reel=1..5 or all'); process.exit(2); }
const spoken = t => t.replace(/\*/g, '');

// =====================================================================
//  The voiceover: Windows' built-in voice, one WAV per line (kept when the text is unchanged)
// =====================================================================
function makeVoice() {
  fs.mkdirSync(VODIR, { recursive: true });
  const todo = [];
  for (const n of want) for (const [k, text] of Object.entries(REELS[n].lines)) {
    const id = `r${n}${k}`, wav = path.join(VODIR, id + '.wav'), txt = path.join(VODIR, id + '.txt'), say = spoken(text);
    const known = fs.existsSync(txt) ? fs.readFileSync(txt, 'utf8') : null;
    // a WAV with no .txt next to it is someone's own recording: leave it alone
    if (REVOICE || !fs.existsSync(wav) || (known !== null && known !== say)) todo.push({ id, text: say, wav, txt });
  }
  if (!todo.length) return;
  if (process.platform !== 'win32') { console.log(`note: ${todo.length} voiceover line(s) have no WAV and this is not Windows: they show as captions only`); return; }
  console.log(`${stamp()}  voiceover: ${todo.length} line(s) with ${VOICE}`);
  const list = path.join(os.tmpdir(), 'reels-vo.json');
  fs.writeFileSync(list, JSON.stringify(todo.map(t => ({ text: t.text, path: t.wav }))), 'utf8');
  // "Pokémon" / "Pokédex" said the right way (POH-kay-mon)
  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 '${list}' | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('${VOICE}'); $s.Rate = ${RATE | 0}
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$say = @{ ([string][char]0x50 + 'ok' + [char]0xE9 + 'mon') = 'ˈpoʊkeɪmɑn'; ([string][char]0x50 + 'ok' + [char]0xE9 + 'dex') = 'ˈpoʊkeɪdɛks' }
foreach ($it in $items) {
  $pb = New-Object System.Speech.Synthesis.PromptBuilder
  foreach ($part in [regex]::Split($it.text, '(Pok\\u00e9mon|Pok\\u00e9dex)')) {
    if ($part -eq '') { continue }
    if ($say.ContainsKey($part)) { $pb.AppendTextWithPronunciation($part, $say[$part]) } else { $pb.AppendText($part) }
  }
  $s.SetOutputToWaveFile($it.path, $fmt); $s.Speak($pb); $s.SetOutputToNull()
}
$s.Dispose()`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('voiceover failed:\n' + (r.stderr || r.stdout)); process.exit(1); }
  for (const t of todo) if (fs.existsSync(t.wav)) fs.writeFileSync(t.txt, t.text, 'utf8');
}
if (!NOVO) makeVoice();
const voFor = n => {
  if (NOVO) return {};
  const o = {};
  for (const k of Object.keys(REELS[n].lines)) { const f = path.join(VODIR, `r${n}${k}.wav`); if (fs.existsSync(f)) o[k] = `/videos/reels/vo/r${n}${k}.wav?v=${fs.statSync(f).mtimeMs | 0}`; }
  return o;
};

// =====================================================================
//  A static server for the game, and the browser over the DevTools protocol
// =====================================================================
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.ogg': 'audio/ogg', '.css': 'text/css', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end('Not found'); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browserPath = arg('browser', process.env.CHROME_PATH) || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => fs.existsSync(p));
if (!browserPath) { console.log('No Chrome or Edge found: pass --browser=<path> or set CHROME_PATH'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// one reel: a fresh browser, the director, the recording, saved
async function makeReel(n) {
  const R = REELS[n], profile = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-reel-'));
  const browser = spawn(browserPath, [...(SHOW ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, `--force-device-scale-factor=${DPR}`,
    '--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 80 && !wsUrl; i++) { await sleep(250); try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = tabs.find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {} }
  if (!wsUrl) { console.log('The browser did not start'); process.exit(2); }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);
  let msgId = 0, lastLog = Date.now(), stillN = 0;
  const pending = new Map(), problems = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++msgId; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  async function ev(expr, gesture = false) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture });
    if (r.result && r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
    return r.result.result.value;
  }
  const done = () => { clearInterval(watch); try { ws.close(); } catch (e) {} browser.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} };
  const fail = async msg => { console.log('FAILED: ' + msg); if (problems.length) console.log('  ' + problems.join('\n  ')); done(); server.close(); process.exit(1); };
  // a picture of the page (the cover, and --stills)
  async function shot(file) { try { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(s.result.data, 'base64')); } catch (e) {} }
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; problems.push('JS error: ' + ((d.exception && d.exception.description) || d.text).split('\n').slice(0, 3).join(' | ')); }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'log'].includes(m.params.type)) {
      const s = m.params.args.map(a => a.description || a.value).join(' ');
      if (s.startsWith('[reel]')) {
        lastLog = Date.now(); const msg = s.slice(7);
        if (msg === 'COVER') setTimeout(() => shot(path.join(OUTDIR, R.name + '-cover.jpg')), 900);
        else {
          console.log(stamp() + '  ' + msg);
          const sh = /^\s*[\d.]+s\s+(.+)$/.exec(msg);
          if (STILLS && sh && !/^done/.test(sh[1])) { const f = path.join(STILLS, `r${n}-` + String(++stillN).padStart(2, '0') + '-' + sh[1].replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 36) + '.jpg'); setTimeout(() => shot(f), 1500); }
        }
      } else if (m.params.type === 'error') problems.push('console.error: ' + s.split('\n')[0]);
    }
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  // the director logs every shot; a long silence means it is stuck: say where, with a picture, and stop
  const watch = setInterval(async () => {
    if (Date.now() - lastLog < 45000) return;
    lastLog = Date.now() + 1e9;
    try { console.log('  game:', await ev('JSON.stringify({ map: Journey._S().map && Journey._S().map.id, event: !!Journey._S().event, menu: Journey._S().menu, battle: !!Journey._S().battle, dialog: Journey._S().dialog && Journey._S().dialog.full })')); const f = path.join(os.tmpdir(), 'journey-reel-stuck.png'); await shot(f); console.log('  screenshot:', f); } catch (e) {}
    fail('no new shot for 45 s - the director is stuck');
  }, 2000);
  await send('Page.enable'); await send('Runtime.enable');
  // the tab capture records the window's real page area, so size the window until that area is exactly W x H
  async function fitWindow() {
    for (let i = 0; i < 4; i++) {
      const [iw, ih] = await ev('[innerWidth, innerHeight]');
      if (iw === W && ih === H) return;
      const win = await send('Browser.getWindowForTarget'), b = (await send('Browser.getWindowBounds', { windowId: win.result.windowId })).result.bounds;
      await send('Browser.setWindowBounds', { windowId: win.result.windowId, bounds: { width: b.width + W - iw, height: b.height + H - ih } });
      await sleep(400);
    }
    const [iw, ih] = await ev('[innerWidth, innerHeight]');
    if (iw !== W || ih !== H) console.log(`note: the page area is ${iw}x${ih}, not ${W}x${H}`);
  }
  await fitWindow();
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev(`typeof Journey === 'object' && typeof JIntro === 'object' && typeof MIntro === 'object' && typeof Retro === 'object'`).catch(() => false)) break; }
  await sleep(800);

  console.log(`\nReel ${n}: ${R.title} · ${W * DPR}x${H * DPR} · ${path.basename(browserPath)}${SHOW ? ' (visible)' : ''}`);
  const opt = { n, w: W * DPR, h: H * DPR, webm: WEBM, lines: R.lines, vo: voFor(n) };
  if (!NOVO && Object.keys(opt.vo).length < Object.keys(R.lines).length) console.log('note: some lines have no voiceover WAV: captions only');
  await ev(`(${director.toString()})(${JSON.stringify(opt)}); true`);
  let res;
  try {
    await ev('__reel.capture()', true);
    await sleep(600);
    await fitWindow();
    res = await ev('__reel.run()', true);
  } catch (e) { await fail(e.message); }
  if (!res || !res.size) await fail('the recording is empty');
  const ext = res.mime.startsWith('video/mp4') ? '.mp4' : '.webm', out = path.join(OUTDIR, R.name + ext);
  fs.mkdirSync(OUTDIR, { recursive: true });
  const fd = fs.openSync(out, 'w'), STEP = 4 << 20;
  for (let i = 0; i < res.size; i += STEP) fs.writeSync(fd, Buffer.from(await ev(`__reel.slice(${i}, ${STEP})`), 'base64'));
  fs.closeSync(fd);
  // the recorder writes a streaming (fragmented) MP4 that Instagram and most players will not seek in: rewrite it as an
  // ordinary MP4 (the same video and sound, not re-encoded)
  let ok = true;
  if (ext === '.mp4') {
    const r = remux(fs.readFileSync(out));
    if (r) {
      fs.writeFileSync(out, r.buf); console.log(`${stamp()}  made seekable: ${r.seconds.toFixed(1)} s · ${r.tracks.map(t => `${t.kind === 'vide' ? 'video' : 'audio'} ${t.samples} frames`).join(' · ')}`);
      // (now and then the tab capture delivers no picture at all: the file has only sound)
      const v = r.tracks.find(t => t.kind === 'vide'); ok = !!v && v.samples > r.seconds * 10;
    }
  }
  if (problems.length) console.log('page problems:\n  ' + problems.slice(0, 8).join('\n  '));
  console.log(`${stamp()}  saved ${path.relative(process.cwd(), out)} · ${(res.size / 1048576).toFixed(1)} MB · ${res.dims} · ${res.mime}`);
  done();
  return ok;
}

// =====================================================================
//  The director (runs inside the page)
// =====================================================================
function director(opt) {
  const W8 = ms => new Promise(r => setTimeout(r, ms));
  const log = s => console.log('[reel] ' + s);
  const $ = s => document.querySelector(s);

  // ---- sound: everything the game sends to the speakers also goes to the recording (through a limiter, so the voice,
  // the score and a big hit together never clip); cries (<audio>) are routed in
  const taps = new Map();
  const connect0 = AudioNode.prototype.connect;
  function tapOf(c) {
    if (!taps.has(c)) {
      const dst = c.createMediaStreamDestination(), lim = c.createDynamicsCompressor();
      lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
      connect0.call(lim, dst); taps.set(c, { dst, lim });
    }
    return taps.get(c);
  }
  AudioNode.prototype.connect = function (dest, ...a) {
    const r = connect0.call(this, dest, ...a);
    if (dest instanceof AudioDestinationNode) { const c = this.context; if (!window.__trCtx) window.__trCtx = c; connect0.call(this, tapOf(c).lim); }
    return r;
  };
  const Audio0 = window.Audio;
  window.Audio = function (src) { const a = new Audio0(src); const c = window.__trCtx; if (c) { try { c.createMediaElementSource(a).connect(c.destination); } catch (e) {} } return a; };

  // ---- the overlay (CSS pixels of a 540x960 phone). Instagram covers about the top 120 px (the header) and the bottom
  // 190 px (the caption and the buttons), and the right edge a little: everything that matters sits between
  const css = document.createElement('style');
  css.textContent = `
  #fpsMeter, #recBtn, #battleCtl, .ji-skip, .jmenu-btn, .jt-menu, .ji-box { display: none !important; }
  #journey .jdialog { bottom: 200px !important; width: calc(100% - 40px) !important; }
  #rv { position: fixed; inset: 0; z-index: 100000; pointer-events: none; font-family: 'Tiny5', monospace; color: #fff; }
  #rv .blk { position: absolute; inset: 0; background: #000; opacity: 1; transition: opacity .18s; }
  #rv .blk.off { opacity: 0; }
  #rv .fl { position: absolute; inset: 0; background: #fff; opacity: 0; }
  #rv .fl.go { animation: rvFlash .45s ease-out both; }
  #rv .hook { position: absolute; left: 20px; right: 56px; top: 166px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  #rv .hook b, #rv .hook i { display: inline-block; font-weight: 400; font-style: normal; border-radius: 10px; opacity: 0; transform: translateX(-24px) rotate(-2deg); }
  #rv .hook b { font-size: 30px; line-height: 1.12; letter-spacing: .02em; padding: 8px 14px 10px; background: #ffd84a; color: #1b1530; box-shadow: 0 4px 0 #1b1530, 0 0 0 3px #1b1530; }
  #rv .hook i { font-size: 19px; line-height: 1.2; letter-spacing: .04em; padding: 6px 12px 8px; background: rgba(15,10,34,.9); color: #fff; box-shadow: 0 0 0 2px #ffd84a; }
  #rv .hook.on b { animation: rvIn .42s cubic-bezier(.2,1.4,.4,1) both; }
  #rv .hook.on i { animation: rvIn .42s .14s cubic-bezier(.2,1.4,.4,1) both; }
  #rv .hook.mid { top: 392px; }
  #rv .hook.low { top: auto; bottom: 400px; }
  #rv .hook.dark b { background: rgba(15,10,34,.9); color: #fff; box-shadow: 0 0 0 3px #b8a8ff, 0 0 22px rgba(150,120,255,.6); }
  #rv .sub { position: absolute; left: 22px; right: 58px; bottom: 232px; text-align: center; font-size: 23px; line-height: 1.3; letter-spacing: .02em; opacity: 0; transition: opacity .15s, bottom .2s;
    padding: 6px 8px 8px; border-radius: 12px; background: rgba(10,6,24,.5);
    text-shadow: 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 0 12px rgba(0,0,0,.7); }
  #rv .sub.on { opacity: 1; }
  #rv .sub.up { bottom: 318px; }
  #rv .sub span { opacity: .42; transition: opacity .1s; }
  #rv .sub span.s { opacity: 1; }
  #rv .sub span.k { color: #ffd84a; }
  #rv .end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding: 176px 30px 0 30px; gap: 12px; text-align: center; opacity: 0; transition: opacity .35s;
    background: radial-gradient(ellipse at 50% 36%, rgba(70,48,140,.94), rgba(8,5,20,.97) 72%); }
  #rv .end.on { opacity: 1; }
  #rv .end .lg { font-size: 50px; line-height: 1.02; letter-spacing: .03em; color: transparent; background: linear-gradient(100deg, #ffd84a 0 42%, #fff8d6 50%, #ffd84a 58% 100%); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text;
    filter: drop-shadow(0 4px 0 #a35a00) drop-shadow(0 4px 0 #1b1530) drop-shadow(0 0 20px rgba(255,216,74,.5)); }
  #rv .end.on .lg { animation: rvSlam .55s cubic-bezier(.2,1.5,.4,1) both, rvShine 2.4s .6s ease-in-out infinite; }
  #rv .end .st { font-size: 21px; letter-spacing: .1em; color: #cfe3ff; text-shadow: 0 3px 0 #1b1530; }
  #rv .end .tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 470px; margin-top: 6px; }
  #rv .end .tags span { font-size: 14px; padding: 5px 10px; border: 2px solid rgba(255,216,74,.75); border-radius: 999px; color: #ffe9a8; opacity: 0; }
  #rv .end.on .tags span { animation: rvPop .35s both; }
  #rv .end .cta { margin-top: 22px; font-size: 25px; letter-spacing: .04em; padding: 12px 22px 14px; background: #ffd84a; color: #1b1530; border-radius: 999px; box-shadow: 0 5px 0 #a35a00, 0 0 0 3px #1b1530; opacity: 0; }
  #rv .end.on .cta { animation: rvPop .4s 1s both, rvPulse 1.1s 1.5s ease-in-out infinite; }
  #rv .end .fw { font-size: 19px; letter-spacing: .08em; color: #fff; opacity: 0; }
  #rv .end.on .fw { animation: rvPop .4s 1.4s both; }
  @keyframes rvIn { from { opacity: 0; transform: translateX(-24px) rotate(-2deg) scale(.9); } to { opacity: 1; transform: rotate(-1.5deg); } }
  @keyframes rvSlam { from { transform: scale(2.2); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
  @keyframes rvShine { 0% { background-position: 100% 0; } 55%, 100% { background-position: 0 0; } }
  @keyframes rvFlash { from { opacity: .9; } to { opacity: 0; } }
  @keyframes rvPop { from { transform: translateY(10px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes rvPulse { 50% { transform: scale(1.06); } }`;
  document.head.append(css);
  const rv = document.createElement('div'); rv.id = 'rv';
  rv.innerHTML = '<div class="blk"></div><div class="hook"><b></b><i></i></div><div class="end"><div class="lg"></div><div class="st"></div><div class="tags"></div><div class="cta"></div><div class="fw"></div></div><div class="sub"></div><div class="fl"></div>';
  document.body.append(rv);
  const blk = rv.querySelector('.blk'), hk = rv.querySelector('.hook'), sub = rv.querySelector('.sub'), end = rv.querySelector('.end'), fl = rv.querySelector('.fl');
  // the captions step up over the game's own dialog box while one is on screen
  setInterval(() => { const d = document.querySelector('#journey .jdialog'); sub.classList.toggle('up', !!(d && !d.classList.contains('hidden') && d.offsetParent)); }, 80);
  // the black cover. While it is up between shots (and no line is being said) the recorder pauses, so setting up the
  // next shot (warps, a battle loading) takes no time in the video: a cut is a quick dip to black
  let rec = null, speaking = 0;
  const cover = on => {
    if (!on && rec && rec.state === 'paused') rec.resume();
    blk.classList.toggle('off', !on);
  };
  async function cut(ms = 200) { cover(true); await W8(ms); if (rec && rec.state === 'recording' && !speaking) rec.pause(); }
  const flash = () => { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); };
  // the headline: a big line and a small one (null: away); at: top (under the battle HUD), mid (under a menu), low
  function hook(big, small = '', o = {}) {
    if (!big) { hk.classList.remove('on'); return; }
    hk.querySelector('b').textContent = big; hk.querySelector('i').textContent = small; hk.querySelector('i').style.display = small ? '' : 'none';
    hk.className = 'hook' + (o.dark ? ' dark' : '') + (o.at ? ' ' + o.at : ''); void hk.offsetWidth; hk.classList.add('on');
  }
  function endCard(logo, st, tags, cta = '▶ PLAY FREE · LINK IN BIO', fw = 'FOLLOW FOR MORE ★') {
    hook(null);
    end.querySelector('.lg').innerHTML = logo; end.querySelector('.st').textContent = st;
    end.querySelector('.tags').innerHTML = tags.map((t, i) => `<span style="animation-delay:${0.35 + i * 0.09}s">${t}</span>`).join('');
    end.querySelector('.cta').textContent = cta; end.querySelector('.fw').textContent = fw;
    void end.offsetWidth; end.classList.add('on');
  }

  // ---- the score: the game's own synth voices (the game's music silenced, its sound effects kept). A reel has no quiet
  // moments, so it plays about 10 dB over the trailers' level, and ducks well under the voice
  const MU = AudioFX.Music, now = () => AudioFX.synth.now(), BED = 3.2, DUCK = 0.3;
  let duckV = 1;
  const note = (type, m, t, d, v, f) => MU.note(type, m, t, d, v * duckV * BED, f), hit = (k, t, v) => MU.hit(k, t, v * duckV * BED);
  MU.stop(); MU.start = () => {}; MU.victory = () => {}; MU.setLevel = () => {};
  try { AudioFX.Crowd.start = () => {}; AudioFX.Crowd.stop && AudioFX.Crowd.stop(); } catch (e) {}
  const Score = {
    mode: 'off', step: 0, next: 0, timer: null,
    PROG: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']],
    LEAD: [[76, 0, 0, 0, 81, 0, 0, 0, 84, 0, 83, 0, 81, 0, 79, 0], [77, 0, 0, 0, 81, 0, 0, 0, 84, 0, 0, 0, 86, 0, 84, 0], [79, 0, 0, 0, 84, 0, 0, 0, 88, 0, 0, 0, 86, 0, 84, 0], [83, 0, 0, 0, 86, 0, 0, 0, 91, 0, 0, 0, 88, 0, 86, 0]],
    key(k) { if (k === 'meridia') { this.PROG = [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'M']]; this.LEAD = this.LEAD.map(b => b.map(m => m && m - 2)); } },
    set(mode) { this.mode = mode; this.step = 0; this.next = now() + 0.05; if (!this.timer) this.timer = setInterval(() => this.tick(), 25); },
    tick() {
      const t = now(); if (!t || this.mode === 'off') return;
      const bpm = this.mode === 'drive' ? 140 : 76, sd = 60 / bpm / 4;
      while (this.next < t + 0.15) { this.play(this.step, this.next, sd); this.next += sd; this.step++; }
    },
    play(i, t, sd) {
      const bar = Math.floor(i / 16), s = i % 16, [root, q] = this.PROG[bar % 4], ch = [root, root + (q === 'm' ? 3 : 4), root + 7];
      if (this.mode === 'legend') {
        if (s === 0) { ch.forEach(m => { note('sawtooth', m, t, sd * 16, 0.028, 900); note('triangle', m + 12, t, sd * 16, 0.03, 2000); }); note('sine', root - 24, t, sd * 15, 0.16, 400); }
        if (s === 0 || s === 8) hit('kick', t, s ? 0.25 : 0.4);
        if (s % 4 === 2) hit('hat', t, 0.02);
        if (s === 6 || s === 14) note('triangle', ch[(bar + s) % 3] + 24, t, sd * 6, 0.03, 4000);
      } else if (this.mode === 'drive') {
        if (s === 0) ch.forEach(m => { note('sawtooth', m, t, sd * 16, 0.026, 1300); note('sawtooth', m + 0.08, t, sd * 16, 0.018, 1000); });
        if (s % 4 === 0) hit('kick', t, 0.55);
        if (s === 4 || s === 12) hit('snare', t, 0.24);
        hit('hat', t, s % 4 === 2 ? 0.06 : 0.03);
        if (s % 2 === 0) note('sawtooth', root - 12 + (s === 14 ? 7 : 0), t, sd * 1.8, 0.12, 700);
        note('square', [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24][s % 4], t, sd * 0.9, 0.018, 2600);
        const m = this.LEAD[bar % 4][s]; if (m && bar % 8 >= 2) { note('square', m, t, sd * 3.5, 0.035, 3800); note('triangle', m - 12, t, sd * 3.5, 0.03, 3000); }
      }
    },
    boom(big = 1) { const t = now() + 0.01; hit('kick', t, 0.9 * big); note('sawtooth', 33, t, 2.2, 0.18 * big, 500); note('sine', 45, t, 2, 0.2 * big, 300); try { AudioFX.SFX.rumble(1.2); } catch (e) {} },
    chord(big = 1) { const t = now() + 0.02; [57, 64, 69, 72, 76].forEach(m => note('sawtooth', m, t, 4, 0.03 * big, 2200)); note('sine', 33, t, 4, 0.2, 400); hit('kick', t, 0.9); }
  };

  // ---- the voiceover: each line plays (the music and effects ducked under it) while its caption fills in, word by word
  const voBuf = {};
  let sfxV = 0.85;
  async function loadVoice() {
    const c = window.__trCtx; if (!c) return;
    for (const [k, url] of Object.entries(opt.vo)) { try { voBuf[k] = await c.decodeAudioData(await (await fetch(url)).arrayBuffer()); } catch (e) { log('no voice for line ' + k + ': ' + e.message); } }
  }
  function caption(text, secs) {
    const words = text.split(/\s+/).filter(Boolean);
    let hot = false;
    sub.innerHTML = words.map(w => {
      const open = w.startsWith('*') || w.startsWith('...*'), close = w.replace(/[.,!?']+$/, '').endsWith('*');
      if (open) hot = true; const k = hot; if (close) hot = false;
      return `<span class="${k ? 'k' : ''}">${w.replace(/\*/g, '').replace(/</g, '&lt;')}</span>`;
    }).join(' ');
    sub.classList.add('on');
    // each word lights up when it is said (its share of the line by length, with a beat for every pause)
    const spans = [...sub.children], wt = words.map(w => w.replace(/\*/g, '').length + 2 + (/[.,!?]$|\.\.\.$/.test(w) ? 5 : 0)), tot = wt.reduce((a, b) => a + b, 0);
    let acc = 0; const T0 = performance.now();
    const at = wt.map(x => { const s = acc / tot * secs * 1000; acc += x; return s; });
    const iv = setInterval(() => { const e = performance.now() - T0; spans.forEach((s, i) => { if (e >= at[i] - 60) s.classList.add('s'); }); if (e > secs * 1000) clearInterval(iv); }, 30);
  }
  const uncaption = () => sub.classList.remove('on');
  // say line k; resolves when it has been said (the caption stays until the next line or uncaption())
  function say(k, o = {}) {
    const text = opt.lines[k], buf = voBuf[k], c = window.__trCtx;
    log('    vo ' + k + ': ' + text.replace(/\*/g, ''));
    const secs = buf ? buf.duration : Math.max(1.6, text.replace(/\*/g, '').length * 0.065);
    caption(text, secs);
    speaking++;
    if (!buf || !c) return W8(secs * 1000 + 250).then(() => { speaking--; });
    duckV = o.duck ?? DUCK; try { AudioFX.setVolume('sfx', sfxV * 0.55); } catch (e) {}
    const src = c.createBufferSource(); src.buffer = buf;
    const eq = c.createBiquadFilter(); eq.type = 'highshelf'; eq.frequency.value = 3000; eq.gain.value = 4;
    const lo = c.createBiquadFilter(); lo.type = 'highpass'; lo.frequency.value = 90;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    const g = c.createGain(); g.gain.value = 1.5;
    src.connect(lo); lo.connect(eq); eq.connect(comp); comp.connect(g); g.connect(c.destination);
    src.start();
    return new Promise(r => src.onended = () => { duckV = 1; try { AudioFX.setVolume('sfx', sfxV); } catch (e) {} setTimeout(() => { speaking--; r(); }, 180); });
  }
  // a line and at least ms of picture
  const sayFor = (k, ms) => Promise.all([say(k), W8(ms)]);

  // ---- the game
  const J = () => Journey._J, G = () => Journey._G(), S = () => Journey._S(), TS = 16;
  const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key|^Arrow/, ''), bubbles: true }));
  const tap = code => { key('keydown', code); key('keyup', code); };
  const busy = () => S().dialog || S().event || S().battle || S().menu || S().evoStop;
  // clear whatever the game is in the middle of (behind the black cover)
  async function drain(ms = 8000) {
    const endT = performance.now() + ms;
    while (performance.now() < endT) {
      const s = S();
      if (s.evoStop) s.evoStop();
      else if (s.dialog) tap('Enter');
      else if (s.menu) Journey._close ? Journey._close() : tap('Escape');
      else if (s.battle) { try { Retro.journey.finish({ ran: true }); } catch (e) {} }
      else if (!s.event) { const box = document.querySelector('#journey .jdialog'); if (box) box.classList.add('hidden'); return; }
      await W8(120);
    }
  }
  const DEXM = POKEDEX.moves;
  function mon(species, level, moves, met) {
    const m = Prog.newMon(species, level, { met });
    if (moves) { m.moves = moves.filter(id => DEXM[id]); m.pp = m.moves.map(id => DEXM[id].pp); }
    return m;
  }
  // Journey: a save near the end of the story (every chapter done, every trainer beaten so nobody stops the camera)
  function saveV() {
    Journey._world('valoria');
    const g = Journey._newGame('Red', 'red'), C = JStory.CHAPTERS;
    for (const f of ['intro', 'shoes', 'starter', 'rival1', 'dex', 'film']) g.flags[f] = true;
    for (const c of Object.values(C)) for (const f of c.goals) g.flags[f] = true;
    for (const m of Object.values(JMaps.M)) for (const n of m.npcs) if (n.trainer) g.flags['tr.' + m.id + '.' + n.id] = true;
    g.flags.rivalStarter = 'piplup';
    g.badges = Object.values(C).filter(c => c.badge).map(c => c.badge);
    for (const b of g.badges) g.flags['badge.' + b] = true;
    g.money = 98765; g.repel = 99999; g.time = 38 * 3600 + 17 * 60;
    g.party = [
      mon('charizard', 72, ['flamethrower', 'dragon-claw', 'air-slash', 'fire-blast'], 'Valoria'),
      mon('lucario', 70, ['aura-sphere', 'flash-cannon', 'close-combat', 'dragon-pulse'], 'Valoria'),
      mon('eevee', 30, ['quick-attack', 'bite', 'swift'], 'Valoria'),     // (three moves: Flareon learns its new one without asking)
      mon('greninja', 70, ['hydro-pump', 'dark-pulse', 'ice-beam', 'water-shuriken'], 'Valoria'),
      mon('gardevoir', 69, ['moonblast', 'psychic', 'shadow-ball', 'thunderbolt'], 'Valoria')];
    g.bag = { shoes: 1, pokedex: 1, ridepager: 1, expshare: 1, firestone: 1, waterstone: 1, potion: 12, superpotion: 8, hyperpotion: 5, revive: 4, fullheal: 3, rarecandy: 2, great: 10, ultra: 6 };
    POKEDEX.order.forEach((s, i) => { if (i < 210 && (i * 7) % 10 < 8) { g.dex.seen[s] = true; if ((i * 3) % 5 < 3) g.dex.caught[s] = true; } });
    for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
    const st = C[2].start; g.map = st.map; g.x = st.x * TS + 8; g.y = st.y * TS + 13; g.dir = 'down';
    return g;
  }
  // Journey II: the same, in Meridia (Surf and Fly unlocked)
  function saveM() {
    Journey._world('meridia');
    const g = Journey._newGame('Kai', 'red'), C = MStory.CHAPTERS;
    for (const f of ['intro', 'shoes', 'starter', 'dex', 'film', 'notebook']) g.flags[f] = true;
    for (const c of Object.values(C)) for (const f of c.goals) g.flags[f] = true;
    for (const m of Object.values(MMaps.M)) for (const n of m.npcs || []) if (n.trainer) g.flags['tr.' + m.id + '.' + n.id] = true;
    Object.assign(g.flags, { rivalStarter: 'mudkip', mystarter: 'cyndaquil', 'ride.surf': true, 'ride.fly': true, longnight: true, dawn: true });
    g.badges = MStory.BADGES.map(b => b.id);
    for (const b of g.badges) g.flags['badge.' + b] = true;
    g.visited = Object.values(MMaps.M).filter(m => m.fly && !m.echoOf).map(m => m.id);
    g.money = 87650; g.repel = 99999; g.time = 41 * 3600 + 8 * 60;
    g.party = [
      mon('typhlosion', 62, ['eruption', 'flamethrower', 'focus-blast', 'fire-blast'], 'Meridia'),
      mon('greninja', 61, ['hydro-pump', 'dark-pulse', 'ice-beam', 'water-shuriken'], 'Meridia'),
      mon('lucario', 61, ['aura-sphere', 'flash-cannon', 'close-combat', 'dragon-pulse'], 'Meridia'),
      mon('corviknight', 60, ['brave-bird', 'iron-head', 'body-press', 'drill-peck'], 'Meridia'),
      mon('lapras', 60, ['surf', 'ice-beam', 'freeze-dry', 'thunderbolt'], 'Meridia'),
      mon('gardevoir', 60, ['moonblast', 'psychic', 'shadow-ball', 'thunderbolt'], 'Meridia')];
    g.bag = { shoes: 1, pokedex: 1, notebook: 1, expshare: 1, potion: 12, superpotion: 8, hyperpotion: 5, revive: 4, fullheal: 3, great: 10, ultra: 6 };
    POKEDEX.order.forEach((s, i) => { if (i < 230 && (i * 7) % 10 < 8) { g.dex.seen[s] = true; if ((i * 3) % 5 < 3) g.dex.caught[s] = true; } });
    for (const m of g.party) g.dex.seen[m.species] = g.dex.caught[m.species] = true;
    const st = MMaps.M.tidemark.fly; g.map = 'tidemark'; g.x = st.x * TS + 8; g.y = st.y * TS + 13; g.dir = 'down';
    return g;
  }
  async function play(world) { Journey._start(world === 'meridia' ? saveM() : saveV()); await W8(700); await drain(2000); }
  const heal = () => { for (const m of G().party) Prog.healFull(m); };
  // walk about: the longest open way from here, turning when blocked (on the water too, while surfing)
  async function wander(ms, run = false) {
    const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const open = (x, y) => { const s = S(); if (!s.solid[y] || s.solid[y][x] === undefined) return false; return s.surf ? s.map.rows[y][x] === '~' : !s.solid[y][x]; };
    const runFrom = ([dx, dy]) => { const [x, y] = Journey._tile(); let k = 0; while (k < 14 && open(x + dx * (k + 1), y + dy * (k + 1))) k++; return k; };
    const endT = performance.now() + ms;
    let held = null, last = null, stuck = 0;
    if (run) key('keydown', 'ShiftLeft');
    while (performance.now() < endT) {
      if (busy()) { if (held) { key('keyup', held); held = null; } await W8(100); continue; }
      const p = S().player, here = p.x + ',' + p.y;
      if (!held || (here === last && ++stuck > 2)) {
        if (held) key('keyup', held);
        // (a tall screen: up and down show more of the world, so they win a tie)
        const opts = Object.entries(DIR).map(([k, d]) => [k, runFrom(d) + (k === held ? -5 : 0) + (k === 'ArrowUp' || k === 'ArrowDown' ? 1.5 : 0)]).sort((a, b) => b[1] - a[1]);
        held = opts[0][0]; key('keydown', held); stuck = 0;
      } else if (here !== last) stuck = 0;
      last = here;
      await W8(140);
    }
    if (held) key('keyup', held);
    if (run) key('keyup', 'ShiftLeft');
  }
  // in a battle: our side picks attacking moves (never a status move), the way a player taps them
  let fightT = null;
  function fight(on) {
    clearInterval(fightT); fightT = null; if (!on) return;
    fightT = setInterval(() => {
      const row = document.getElementById('rrow0'); if (!row || typeof state === 'undefined' || !state.players) return;
      const P = state.players[0], u = P.team[P.active]; if (!u) return;
      const b = [...row.querySelectorAll('.rmv:not([disabled])')].filter(x => u.moves[+x.dataset.i] && u.moves[+x.dataset.i].cat !== 'status' && !x.classList.contains('q'));
      if (b.length) b[Math.floor(Math.random() * b.length)].click();
    }, 450);
  }
  const waitFor = async (fn, ms = 8000) => { const endT = performance.now() + ms; while (performance.now() < endT) { if (fn()) return true; await W8(60); } return false; };
  // start a battle and wait (behind the cover) until both Pokémon are out and ours is ready for its first move, so the
  // shot opens on the fight, not on the send-out (a Mega Evolution then plays on screen, on that first move)
  async function battleOn(start) {
    const old = document.getElementById('rrow0'); start();
    await waitFor(() => { const r = document.getElementById('rrow0'); return r && r !== old && S().battle && (!Retro._debug || Retro._debug().T > 0.15); }, 15000);
    await waitFor(() => { const r = document.getElementById('rrow0'); return r && r.classList.contains('ready'); }, 9000);
    await W8(100);
  }
  async function endBattle() { fight(false); await drain(); heal(); }
  // to a map, on the nearest open tile to (x, y) (water counts while surfing)
  async function warp(id, x, y, dir = 'down') {
    Journey._warp(id, x, y, dir); await W8(80);
    const s = S(), ok = (a, b) => !!s.solid[b] && s.solid[b][a] !== undefined && (!s.solid[b][a] || (s.surf && s.map.rows[b][a] === '~'));
    if (!ok(x, y)) { let best = null; for (let r = 1; r < 12 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dy) === r) && ok(x + dx, y + dy)) { best = [x + dx, y + dy]; break; } if (best) Journey._warp(id, best[0], best[1], dir); }
    await W8(220);
  }
  const chStart = n => JStory.CHAPTERS[n].start;
  const spotM = id => { const m = MMaps.M[id]; return m.fly || m.arrive || { x: m.w >> 1, y: m.h >> 1 }; };
  // a line of the story, said in the game's own dialog box where it happens
  async function line(map, x, y, dir, text, who, ms) {
    await warp(map, x, y, dir);
    const said = J().say(text, who); await W8(150); cover(false);
    await W8(ms || Math.max(2300, text.length * 34)); await cut(); tap('Enter'); await said.catch(() => {}); await drain(1500);
  }
  // a walk on a map (the camera follows); the next cut is the caller's
  async function walk(map, at, ms, run) { await warp(map, at.x, at.y, at.dir || 'down'); cover(false); await wander(ms, run); }
  // the Journey's Mega battle: Mega Charizard X against Champion Aurelia (it Mega Evolves on its first move)
  async function megaBattle() {
    G().party[0].mega = 'charizard-mega-x'; heal();
    await warp('champion', 6, 8, 'up');
    await battleOn(() => Journey._battle('c8aurelia'));
  }
  // catch: a Master Ball (the only ball in the Bag), so it throws at once
  async function catchOne(species, level, at) {
    await warp(at[0], at[1], at[2], 'up');
    const keep = Object.assign({}, G().bag); G().bag = { master: 1, potion: 3 };
    await battleOn(() => Journey._wild(species, level));
    return async () => {
      for (let i = 0; i < 20 && !(S().btl && S().btl.throwing) && !S().dialog; i++) { const bb = $('#rrow0 [data-c=ball]'); if (bb) bb.click(); await W8(300); }
      await waitFor(() => S().dialog, 9000);
      return () => { G().bag = keep; };
    };
  }
  // the starter picker, flicking through the regions
  async function starters(regions, each) {
    let picked = false;
    J().pickStarter().catch(() => {}).then(() => { picked = true; }); await W8(300); cover(false);
    for (const r of regions) { Journey._panelClick(`[data-a=region][data-p="${r}"]`); await W8(each); }
    return async () => {
      Journey._panelClick('[data-a=pickStarter]'); flash();
      await waitFor(() => S().dialog && S().dialog.opts, 3000); await W8(900);
      await cut();
      for (let i = 0; i < 40 && !picked; i++) { const d = S().dialog; if (d && d.opts) Journey._pick(0); else if (d) tap('Enter'); await W8(150); }
      await drain();
    };
  }

  // ---- the reels (each sets up its first shot behind the cover, then begin(): the video opens on that shot)
  let mark = log, begin = () => {};
  const fightOn = () => { cover(false); fight(true); };
  const REELS = {
    // 1. Journey I: a Mega battle as the hook, the legend, then what the game has
    1: async () => {
      await play('valoria');
      await megaBattle();
      begin(); Score.set('drive'); fightOn(); mark('hook: Mega Charizard X vs the Champion');
      hook('A FULL POKéMON ADVENTURE', 'THAT RUNS IN YOUR BROWSER');
      await W8(500); await sayFor('a', 2500); log('COVER'); await W8(2300);
      await cut(); await endBattle(); G().party[0].mega = null; hook(null); uncaption();
      // the legend
      JIntro.play({ name: 'Red', look: OUTFITS.red });
      await waitFor(() => JIntro._scene(), 6000); JIntro._jump('meteor'); await W8(250); cover(false); mark('film: the meteor');
      Score.boom(0.8);
      await sayFor('b', 2400);
      JIntro._jump('bond'); mark('film: Mega Evolution'); await sayFor('c', 3400);
      await cut(); JIntro._skip(); await W8(400); uncaption();
      await play('valoria');
      // a partner from any region
      const pickIt = await starters([], 0); mark('starters');
      hook('CHOOSE YOUR PARTNER', '', { at: 'mid' });
      const d = say('d');
      for (const r of [3, 6, 9]) { Journey._panelClick(`[data-a=region][data-p="${r}"]`); await W8(800); }
      await d; await pickIt(); uncaption();
      // the region
      hook('EXPLORE VALORIA', '8 CHAPTERS · 81 MAPS');
      { const st = chStart(4); await walk(st.map, st, 1, false); } mark('exploring');
      const e = say('e');
      for (const [n, ms] of [[4, 1800], [7, 1800]]) { const st = chStart(n); await walk(st.map, st, ms, true); await cut(160); await drain(1500); }
      await e; uncaption();
      // a gym leader
      hook('REAL-TIME BATTLES');
      await warp('voltara', 17, 14, 'up');
      await battleOn(() => Journey._battle('mila')); fightOn(); mark('gym battle');
      await sayFor('f', 4200);
      await cut(); await endBattle(); uncaption();
      // the villains, and a legend
      hook('STOP TEAM ECLIPSE', '', { dark: true });
      await line('skyspire3', 10, 10, 'up', 'Every shard we could tear from this land, fused back into the stone they broke from. Can you hear it singing?', { name: 'Director Vex', look: 'vex' }, 2800);
      await warp('skyspire3', 10, 8, 'up');
      G().party.unshift(G().party.splice(1, 1)[0]); heal();
      await battleOn(() => Journey._battle({ wild: true, team: [['deoxys', 60]], theme: 'icecave' }));
      hook('FACE THE LEGENDS'); fightOn(); Score.boom(); flash(); mark('legendary');
      await sayFor('g', 4600);
      await cut(); await endBattle(); uncaption();
      // the end card
      Score.set('off'); mark('end card');
      endCard('POKéMON<br>JOURNEY', 'THE ECLIPSE OF VALORIA', ['8 CHAPTERS', '8 GYMS', 'MEGA EVOLUTION', 'LEGENDARIES', 'REAL-TIME BATTLES'], '▶ PLAY FREE · LINK IN BIO', 'FOLLOW FOR JOURNEY II ★');
      cover(false); Score.chord(1.2); flash(); await sayFor('h', 4800); await W8(700);
    },

    // 2. Journey II: the mystery (the opening film, then the story)
    2: async () => {
      Score.key('meridia');
      Journey._world('meridia');
      MIntro.play({ name: 'Kai', look: OUTFITS.red, noScore: true });
      await waitFor(() => MIntro._scene(), 6000); MIntro._jump('midnight'); await W8(300);
      begin(); Score.set('legend'); cover(false); Score.boom(0.8); mark('hook: midnight');
      hook('SOMEONE IS STEALING', 'THE DAYS OF MERIDIA', { dark: true });
      await sayFor('a', 3600); log('COVER');
      MIntro._jump('festival'); mark('film: Lantern Night'); await sayFor('b', 3000);
      MIntro._jump('nell'); mark('film: the girl in grey'); hook('ONLY YOU REMEMBER', '', { dark: true }); await sayFor('c', 2800);
      MIntro._jump('title'); mark('film: the title'); hook(null); uncaption(); Score.set('off'); await W8(1100); Score.chord(); await W8(2300);
      await cut(300); MIntro._skip(); await W8(400);
      await play('meridia');
      Score.set('drive');
      // the mystery
      hook('A MYSTERY TO SOLVE');
      await line('tidemark', 14, 15, 'down', '...Today? But Lantern Night was yesterday. Your partner looks up at you. It remembers too.', null, 3000);
      { const p = spotM('tidemark'); await warp('tidemark', p.x, p.y); }
      Journey._menu('notebook'); await W8(150); cover(false); hook('THE CLUE NOTEBOOK', '', { at: 'low' }); mark('the clue notebook');
      await sayFor('d', 3400);
      await cut(); Journey._close(); await drain(); uncaption();
      // the Echo and the ghost train
      hook('THE ECHO', 'A GREY WORLD OF LOST MOMENTS', { dark: true });
      await walk('echo_oldrail', { x: 13, y: 22, dir: 'up' }, 1, false); mark('the Echo');
      await Promise.all([say('e'), wander(4000)]); await cut(); await drain(1500); uncaption();
      hook('THE GHOST TRAIN', 'LOST 20 YEARS AGO', { dark: true });
      await walk('ghosttrain1', { x: 3, y: 3, dir: 'right' }, 1, false); mark('the ghost train');
      await Promise.all([say('f'), wander(3300)]); await cut(); await drain(1500); uncaption();
      // the rival
      hook('JUNO\'S CHOICE');
      await line('frostpass', 10, 16, 'up', 'He can save Teo. He promised. When the Lantern\'s lit, Teo stops fading. Forever.', { name: 'Juno', look: 'juno' }, 2900);
      await battleOn(() => Journey._battle({ name: 'Juno', look: 'juno', team: [['manectric', 42], ['staraptor', 42], ['sharpedo', 41], ['lucario', 43], ['swampert', 44]], theme: 'icecave', canLose: true }));
      hook('THE RAIN BATTLE', 'YOUR BEST FRIEND · YOUR RIVAL'); fightOn(); Score.boom(); flash(); mark('the rain battle');
      await sayFor('g', 5200);
      await cut(); await endBattle(); uncaption();
      // the end card
      Score.set('off'); mark('end card');
      endCard('POKéMON<br>JOURNEY II', 'THE LOST DAYS OF MERIDIA', ['12 CHAPTERS', '8 WARDENS', 'THE ECHO', 'A MYSTERY', 'SURF & FLY']);
      cover(false); Score.chord(1.2); flash(); await sayFor('h', 5400); await W8(700);
    },

    // 3. Real-time battles, from both journeys
    3: async () => {
      await play('valoria');
      await warp('voltara', 17, 14, 'up');
      await battleOn(() => Journey._battle('mila'));
      begin(); Score.set('drive'); fightOn(); mark('hook: gym battle');
      hook('POKéMON... BUT REAL-TIME', 'NO TURNS · NO WAITING');
      await sayFor('a', 2600); log('COVER');
      await sayFor('b', 4000);
      await cut(); await endBattle(); uncaption();
      // Mega Evolution
      await megaBattle();
      hook('MEGA EVOLUTION'); fightOn(); mark('Mega battle'); flash(); Score.boom();
      await sayFor('c', 1800); uncaption(); await W8(4600);
      await cut(); await endBattle(); G().party[0].mega = null;
      // Journey II
      await play('meridia');
      await warp('frostpass', 10, 16, 'up');
      await battleOn(() => Journey._battle({ name: 'Juno', look: 'juno', team: [['manectric', 42], ['sharpedo', 41], ['swampert', 44]], theme: 'icecave', canLose: true }));
      hook('EVERY MOVE ANIMATED'); fightOn(); mark('rival battle');
      await sayFor('d', 4800);
      await cut(); await endBattle(); uncaption();
      // the colossus (Greninja leads: Water against a Ground type)
      G().party.unshift(G().party.splice(1, 1)[0]); heal();
      await warp('lanterntop', 8, 9, 'up');
      await battleOn(() => Journey._battle({ name: 'Warden of the Veil', wild: true, team: [['golurk', 60]], theme: 'icecave' }));
      hook('THE WARDEN OF THE VEIL', '', { dark: true }); fightOn(); Score.boom(1.3); flash(); mark('the Warden of the Veil');
      await sayFor('e', 4800);
      await cut(); await endBattle(); uncaption();
      // the end card
      Score.set('off'); mark('end card');
      endCard('POKéMON<br>JOURNEY', 'I + II · REAL-TIME BATTLES', ['481 POKéMON', '63 MEGAS', '440 MOVES', 'GYMS & WARDENS', 'LEGENDARIES']);
      cover(false); Score.chord(1.2); flash(); await sayFor('f', 4600); await W8(700);
    },

    // 4. Pick, catch, evolve, Mega Evolve, collect
    4: async () => {
      await play('valoria');
      const pickIt = await starters([], 0);
      begin(); Score.set('drive'); cover(false); mark('hook: starters');
      hook('PICK ANY STARTER', 'FROM ALL 9 GENERATIONS', { at: 'mid' });
      const a = say('a');
      for (const r of [2, 3, 4, 5, 6, 7, 8, 9]) { Journey._panelClick(`[data-a=region][data-p="${r}"]`); await W8(480); if (r === 4) log('COVER'); }
      await a; await pickIt(); uncaption();
      // catching
      const throwIt = await catchOne('eevee', 12, ['route1', 10, 30]);
      hook('CATCH'); cover(false); mark('catching');
      const b = say('b'); const back = await throwIt(); await b; await W8(1200);
      await cut(); uncaption(); await drain(); back(); heal();
      // evolving, through the Bag
      { const st = chStart(5); await warp(st.map, st.x, st.y, 'down'); }
      Journey._menu('menu'); await W8(200); hook('EVOLVE', '', { at: 'low' }); cover(false); mark('evolution');
      const c = say('c');
      for (const sel of ['[data-a=bag]', '[data-a=pocket][data-p=items]', '[data-a=item][data-i=firestone]']) { Journey._panelClick(sel); await W8(480); }
      Journey._panelClick(`[data-m="${G().party.findIndex(m => m.species === 'eevee')}"]`);
      await waitFor(() => S().dialog, 3000); await W8(500); tap('Enter');
      await c; uncaption();
      await waitFor(() => S().evoStop, 3000); await W8(4700);
      await waitFor(() => S().dialog, 2000); await W8(700);
      await cut(); await drain();
      // Mega Evolution
      await megaBattle();
      hook('MEGA EVOLVE'); fightOn(); mark('Mega Evolution'); flash(); Score.boom();
      await sayFor('d', 2000); uncaption(); await W8(4300);
      await cut(); await endBattle(); G().party[0].mega = null;
      // the Pokédex
      { const st = chStart(7); await warp(st.map, st.x, st.y, 'down'); }
      Journey._menu('dex'); await W8(200); hook('481 POKéMON', 'CAN YOU CATCH THEM ALL?', { at: 'low' }); cover(false); mark('Pokédex');
      const e = say('e'); await W8(2300); Journey._close(); Journey._menu('party'); await e; await W8(300);
      await cut(); Journey._close(); await drain(); uncaption();
      // the end card
      Score.set('off'); mark('end card');
      endCard('POKéMON<br>JOURNEY', 'CATCH · EVOLVE · MEGA EVOLVE', ['481 POKéMON', '63 MEGAS', 'ALL 9 GENERATIONS', '2 ADVENTURES']);
      cover(false); Score.chord(1.2); flash(); await sayFor('f', 4400); await W8(700);
    },

    // 5. Two worlds to explore
    5: async () => {
      await play('valoria');
      { const st = chStart(2); await warp(st.map, st.x, st.y, 'down'); }
      begin(); Score.set('drive'); cover(false); mark('hook: exploring');
      hook('2 ADVENTURES · 20 CHAPTERS', 'FREE IN YOUR BROWSER');
      await Promise.all([say('a').then(() => log('COVER')), wander(3800, true)]); await cut(); await drain(1500); uncaption();
      // Valoria
      hook('VALORIA', 'JOURNEY I');
      const b = say('b');
      for (const [n, ms] of [[4, 1500], [5, 1400], [7, 1400]]) { const st = chStart(n); await walk(st.map, st, ms, n !== 5); if (n === 4) mark('Valoria'); await cut(160); await drain(1500); }
      await b; await cut(); uncaption();
      // Meridia
      await play('meridia');
      hook('MERIDIA', 'JOURNEY II');
      const c = say('c');
      await walk('brassport_s', spotM('brassport_s'), 1600, true); mark('Meridia'); await cut(160); await drain(1500);
      await walk('wildheart', { x: 24, y: 18 }, 1600, true); await cut(160); await drain(1500);
      await c; await cut(); uncaption();
      // surfing
      hook('SURF');
      S().surf = true; Journey._warp('sealane1', 12, 5, 'right'); await W8(300); cover(false); mark('surfing');
      await Promise.all([say('d'), wander(3000)]); await cut(); S().surf = false; await drain(1500); uncaption();
      // the heist: the guards back at their posts (the reel only looks; they don't send anyone back)
      G().flags.ch6 = false;
      await warp('sky2', 17, 19, 'up');
      const watchers = S().npcs.filter(n => n.watch); for (const n of watchers) { n.keepWatch = n.watch; n.watch = null; }
      hook('THE GALA HEIST', '', { dark: true }); cover(false); mark('the Gala');
      await Promise.all([say('e'), wander(3000)]); await cut();
      for (const n of watchers) n.watch = n.keepWatch;
      G().flags.ch6 = true; await drain(1500); uncaption();
      // fly
      { const p = spotM('brassport_s'); await warp('brassport_s', p.x, p.y); }
      Journey._menu('fly'); await W8(200); hook('FLY', '', { at: 'low' }); cover(false); mark('fly');
      await sayFor('f', 2600);
      await cut(); Journey._close(); await drain(); uncaption();
      // the end card
      Score.set('off'); mark('end card');
      endCard('POKéMON<br>JOURNEY', 'I + II · TWO WORLDS', ['VALORIA', 'MERIDIA', '20 CHAPTERS', 'SURF & FLY', 'A MYSTERY']);
      cover(false); Score.chord(1.2); flash(); await sayFor('g', 5400); await W8(700);
    }
  };

  // ---- recording
  let scr = null;
  // sound on (the first key press starts the game's audio), the picture: this tab
  async function capture() {
    key('keydown', 'ShiftRight'); key('keyup', 'ShiftRight');
    await waitFor(() => window.__trCtx, 3000);
    if (window.__trCtx && window.__trCtx.state !== 'running') await window.__trCtx.resume();
    scr = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, width: opt.w, height: opt.h }, audio: false, preferCurrentTab: true });
    return true;
  }
  async function run() {
    const aud = window.__trCtx ? tapOf(window.__trCtx).dst : null;
    try { sfxV = AudioFX.getVolume ? AudioFX.getVolume('sfx') : 0.85; } catch (e) {}
    await loadVoice();
    const tracks = [...scr.getVideoTracks(), ...(aud ? aud.stream.getAudioTracks() : [])];
    const types = opt.webm ? ['video/webm;codecs=vp9,opus', 'video/webm'] : ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus'];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 12_000_000, videoKeyFrameIntervalDuration: 1000, audioBitsPerSecond: 192_000 });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const stopped = new Promise(r => rec.onstop = r);
    const st = scr.getVideoTracks()[0].getSettings(), dims = `${st.width}x${st.height}`;
    let T0 = 0;
    // the reel sets up its first shot behind the cover, then calls begin(): the video starts on that shot, no black
    begin = () => { if (T0) return; rec.start(1000); T0 = performance.now(); log(`recording ${dims} as ${mime}${aud ? ' with sound' : ' (no sound)'}`); };
    mark = s => log(`${((performance.now() - (T0 || performance.now())) / 1000).toFixed(1).padStart(5)}s  ${s}`);
    await REELS[opt.n]();
    rec.stop(); await stopped;
    scr.getTracks().forEach(t => t.stop()); clearInterval(Score.timer);
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    window.__trBlob = blob;
    mark(`done: ${(blob.size / 1048576).toFixed(1)} MB`);
    return { size: blob.size, mime, dims, secs: (performance.now() - T0) / 1000 };
  }
  // the recording, a slice at a time (base64) for the runner to save
  async function slice(i, n) { const b = window.__trBlob.slice(i, i + n); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000)); return btoa(s); }
  window.__reel = { capture, run, slice };
}

for (const n of want) {
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) { if (i) console.log(`reel ${n}: the video has no picture - recording it again (${i + 1}/3)`); ok = await makeReel(n); }
  if (!ok) { console.log(`FAILED: reel ${n} has no picture after 3 tries`); server.close(); process.exit(1); }
}
server.close();
console.log(`\n${stamp()}  done: ${want.length} reel(s) in ${path.relative(process.cwd(), OUTDIR)}`);
process.exit(0);
