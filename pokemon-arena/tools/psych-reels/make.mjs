// Makes the animated psychological Reels (9:16, 1080x1920, 60 fps, Hindi voiceover + Hindi subtitles).
//
//   1. the voiceover: every line is spoken by Sarvam AI's Bulbul Hindi voices (voice.mjs: phrase by phrase, with the
//      pauses marked in the stories by | || |||, and the pronunciation fixes in lexicon.mjs). Needs the internet and a
//      Sarvam key (SARVAM_API_KEY, or pokemon-arena/.env). --engine=edge uses Microsoft's free Edge voices instead.
//      Each line is kept in videos/psych-reels/vo/ (a WAV/MP3 + a JSON with the word timings for the subtitles) and is
//      only made again when its text, phrasing or voice changes.
//   2. a headless Chrome draws every frame of the cartoon (main.mjs + engine.mjs + stories/sN.mjs) and encodes the MP4
//      with WebCodecs; the soundtrack (music, ambience, effects) is synthesised in audio.mjs.
//
// Usage:  cd tools/psych-reels && npm install && node make.mjs [--reel=1,3|all] [--fps=60] [--stills[=t1,t2|shots]]
//                                                            [--jobs=2] [--revoice] [--show] [--engine=sarvam|edge]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sarvamKey, voiceLine, voiceScript, phrases } from './voice.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'videos/psych-reels'), VO = path.join(OUT, 'vo');
const arg = (k, d) => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const FPS = Number(arg('fps', 60)), STILLS = arg('stills', false), SHOW = !!arg('show', false), REVOICE = !!arg('revoice', false), JOBS = Number(arg('jobs', 2));
const ALL = fs.readdirSync(path.join(HERE, 'stories')).map(f => /^s(\d+)\.mjs$/.exec(f)).filter(Boolean).map(m => +m[1]).filter(n => n > 0).sort((a, b) => a - b);
// a reel is a number (stories/sN.mjs) or a variant name like 10v2 (stories/s10v2.mjs)
const want = String(arg('reel', 'all')) === 'all' ? ALL : String(arg('reel')).split(',').filter(x => fs.existsSync(path.join(HERE, 'stories', `s${x}.mjs`))).map(x => /^d+$/.test(x) ? +x : x);
if (!want.length) { console.log('no such reel; have: ' + ALL.join(',')); process.exit(2); }
const t0 = Date.now(), stamp = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(5) + 's';

// ------------------------------------------------------------------ voices
const KEY = sarvamKey(ROOT);
const ENGINE = String(arg('engine', KEY ? 'sarvam' : 'edge'));
// Sarvam Bulbul v3 speakers (audition.mjs plays them all); pace 1 = normal speed
export const VOICES = {
  nar: { speaker: 'varun', pace: 1.0, temperature: 0.5 },     // the storyteller
  hero: { speaker: 'aditya', pace: 1.0, temperature: 0.5 },    // the main character speaking
  m2: { speaker: 'amit', pace: 1.05, temperature: 0.5 },    // another man (guard, colleague...)
  old: { speaker: 'mani', pace: 0.92, temperature: 0.5 },     // an old man
  kid: { speaker: 'ishita', pace: 1.08, temperature: 0.5 },   // a child
  f: { speaker: 'priya', pace: 1.0, temperature: 0.5 },       // a woman
};
// the free fallback: Microsoft's Edge voices (no pause control, no pronunciation fixes)
const EDGE = {
  nar: { voice: 'hi-IN-MadhurNeural', rate: '+8%', pitch: '-3Hz' }, hero: { voice: 'hi-IN-MadhurNeural', rate: '+4%', pitch: '+3Hz' },
  m2: { voice: 'hi-IN-MadhurNeural', rate: '+10%', pitch: '+9Hz' }, old: { voice: 'hi-IN-MadhurNeural', rate: '-4%', pitch: '-12Hz' },
  kid: { voice: 'hi-IN-SwaraNeural', rate: '+2%', pitch: '+28Hz' }, f: { voice: 'hi-IN-SwaraNeural', rate: '-4%', pitch: '+0Hz' },
};
async function makeVoice(n, story) {
  fs.mkdirSync(VO, { recursive: true });
  if (ENGINE === 'sarvam' && !KEY) { console.log('no Sarvam key: set SARVAM_API_KEY or put it in pokemon-arena/.env (or use --engine=edge)'); process.exit(2); }
  const ext = ENGINE === 'sarvam' ? '.wav' : '.mp3';
  const todo = [], index = {}, takes = [];
  story.shots.forEach((s, i) => {
    const lines = s.vo == null ? [] : (Array.isArray(s.vo) ? s.vo : [s.vo]).map(l => typeof l === 'string' ? { text: l } : l);
    if (s.oneTake && ENGINE === 'sarvam') {
      const silent = new Set(lines.map((l, k) => l.silent ? k : -1).filter(k => k >= 0)); // each voice's lines are read in one natural take, then cut back into lines
      const byVoice = {}; lines.forEach((l, k) => { if (!silent.has(k)) (byVoice[l.voice || 'nar'] ||= []).push(k); });
      for (const [vk, ks] of Object.entries(byVoice)) {
        const pace = s.oneTake.paces?.[vk] ?? s.oneTake.pace;
        const V = { ...VOICES[vk], ...(story.voices?.[vk] || {}), ...(pace ? { pace } : {}) };
        const texts = ks.map(k => lines[k].text), tighten = s.oneTake.tighten ?? 0.5;
        const sig = JSON.stringify(['take', V, texts, tighten]);
        const ids = ks.map(k => `s${n}-${String(i).padStart(2, '0')}-${k}`);
        const fresh = ids.every(id => { const js = path.join(VO, id + '.json'); return fs.existsSync(js) && fs.existsSync(path.join(VO, id + '.wav')) && JSON.parse(fs.readFileSync(js, 'utf8')).sig === sig; });
        if (REVOICE || !fresh) takes.push({ ids, texts, V, sig, tighten });
        ids.forEach((id, j) => { index[`${i}-${ks[j]}`] = { id, ext: '.wav' }; });
      }
      return;
    }
    lines.forEach((l, k) => {
      const id = `s${n}-${String(i).padStart(2, '0')}-${k}`, vk = l.voice || 'nar';
      const V = ENGINE === 'sarvam' ? { ...VOICES[vk], ...(story.voices?.[vk] || {}), ...(l.speaker ? { speaker: l.speaker } : {}), ...(l.pace ? { pace: l.pace } : {}) } : { ...EDGE[vk], ...(l.rate ? { rate: l.rate } : {}), ...(l.pitch ? { pitch: l.pitch } : {}) };
      const audio = path.join(VO, id + ext), js = path.join(VO, id + '.json');
      const meta = fs.existsSync(js) ? JSON.parse(fs.readFileSync(js, 'utf8')) : null;
      const sig = JSON.stringify([ENGINE, V, ENGINE === 'sarvam' ? phrases(l.text).map(p => [p.say, p.pause]) : l.text.replace(/\*|\|/g, '')]);
      const fresh = meta && fs.existsSync(audio) && (meta.text === undefined || meta.sig === sig);
      if (REVOICE || !fresh) todo.push({ id, text: l.text, V, sig, audio, js });
      index[`${i}-${k}`] = { id, ext };
    });
  });
  for (const tk of takes) {
    console.log(`${stamp()}  reel ${n}: one take of ${tk.texts.length} lines (${tk.V.speaker}, pace ${tk.V.pace})`);
    const parts = await voiceScript(KEY, tk.texts, tk.V, path.join(VO, 'takes'), { tighten: tk.tighten });
    parts.forEach((r, k) => { fs.writeFileSync(path.join(VO, tk.ids[k] + '.wav'), r.wav); fs.writeFileSync(path.join(VO, tk.ids[k] + '.json'), JSON.stringify({ text: tk.texts[k], sig: tk.sig, said: r.phrases, words: r.words }, null, 1), 'utf8'); });
  }
  if (todo.length) {
    console.log(`${stamp()}  reel ${n}: voicing ${todo.length} line(s) with ${ENGINE}`);
    if (ENGINE === 'sarvam') {
      for (const it of todo) {
        const r = await voiceLine(KEY, it.text, it.V, path.join(VO, 'phrases'));
        fs.writeFileSync(it.audio, r.wav);
        fs.writeFileSync(it.js, JSON.stringify({ text: it.text, sig: it.sig, said: r.phrases, words: r.words }, null, 1), 'utf8');
      }
    } else {
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'psych-vo-'));
      for (const it of todo) {
        const say = it.text.replace(/\*/g, '').replace(/\s*\|+\s*/g, ' ');
        for (let attempt = 1; ; attempt++) {
          try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata(it.V.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
            const r = await tts.toFile(tmp, say, { rate: it.V.rate, pitch: it.V.pitch });
            tts.close();
            const md = JSON.parse(fs.readFileSync(r.metadataFilePath, 'utf8')).Metadata || [];
            const words = md.filter(m => m.Type === 'WordBoundary').map(m => ({ w: m.Data.text.Text, t: m.Data.Offset / 1e7, d: m.Data.Duration / 1e7 }));
            fs.copyFileSync(r.audioFilePath, it.audio);
            if (fs.statSync(it.audio).size < 2000) throw new Error('empty audio');
            fs.writeFileSync(it.js, JSON.stringify({ text: it.text, sig: it.sig, words }, null, 1), 'utf8');
            break;
          } catch (e) { if (attempt >= 4) { console.log(`voice failed for ${it.id}: ${e.message || e}`); process.exit(1); } await new Promise(r => setTimeout(r, 1500 * attempt)); }
        }
      }
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  for (const v of Object.values(index)) { const js = path.join(VO, v.id + '.json'); v.url = `/vo/${v.id}${v.ext}?v=${fs.statSync(path.join(VO, v.id + v.ext)).mtimeMs | 0}`; v.words = JSON.parse(fs.readFileSync(js, 'utf8')).words || []; delete v.id; delete v.ext; }
  return index;
}

// ------------------------------------------------------------------ a little server: the page + saving files
const TYPES = { '.ttf': 'font/ttf', '.wav': 'audio/wav', '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/save') {
    const rel = u.searchParams.get('file'), file = path.resolve(OUT, rel);
    if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const ws = fs.createWriteStream(file); req.pipe(ws); ws.on('finish', () => res.writeHead(200).end('ok')); return;
  }
  let file = u.pathname.startsWith('/vo/') ? path.join(VO, path.basename(u.pathname)) : path.join(HERE, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!file.startsWith(HERE) && !file.startsWith(VO)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end('not found'); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browserPath = arg('browser', process.env.CHROME_PATH) || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!browserPath) { console.log('No Chrome/Edge found: pass --browser=<path>'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withBrowser(fn) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'psych-reel-'));
  const b = spawn(browserPath, [...(SHOW ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=600,1000', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 80 && !wsUrl; i++) { await sleep(250); try { const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); wsUrl = tabs.find(t => t.type === 'page').webSocketDebuggerUrl; } catch (e) {} }
  if (!wsUrl) { b.kill(); throw new Error('the browser did not start'); }
  // if the browser or its tab dies, everything waiting on it fails at once (instead of waiting forever)
  let dead = null; const waiters = new Set();
  const die = why => { if (dead) return; dead = new Error(why); for (const w of waiters) w(dead); waiters.clear(); for (const r of pending.values()) r({ dead }); pending.clear(); };
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('could not connect to the browser')); setTimeout(() => j(new Error('could not connect to the browser (timeout)')), 15000); }).catch(e => { b.kill(); throw e; });
  ws.onclose = () => die('the browser connection closed');
  b.on('exit', code => die(`the browser exited (code ${code})`));
  let id = 0, last = Date.now(); const pending = new Map(), problems = [];
  const send = (method, params = {}) => new Promise((r, j) => { if (dead) return j(dead); const i = ++id; pending.set(i, m => m.dead ? j(m.dead) : r(m)); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).split('\n').slice(0, 4).join(' | ')); return r.result.result.value; };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled') { const s = m.params.args.map(a => a.value ?? a.description).join(' '); if (s.startsWith('[reel]')) { last = Date.now(); fn.log?.(s.slice(7)); } else if (m.params.type === 'error') problems.push(s.split('\n')[0]); }
    if (m.method === 'Inspector.targetCrashed') die('the page crashed (out of memory?)');
    if (m.method === 'Runtime.exceptionThrown') problems.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 80; i++) { await sleep(200); if (await ev('!!window.__reels').catch(() => false)) break; }
  // a watchdog: no word from the page for 3 minutes = stuck
  let dog; const stuck = new Promise((_, rej) => { waiters.add(rej); dog = setInterval(() => { if (Date.now() - last > 180000) rej(new Error('the page stopped responding (3 min)')); }, 5000); });
  try { return await Promise.race([fn(ev), stuck]); }
  catch (e) { if (problems.length) console.log('  page problems:\n   ' + problems.slice(0, 6).join('\n   ')); throw e; }
  finally { clearInterval(dog); try { ws.close(); } catch (e) {} b.kill(); await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }
}

async function one(n) {
  const story = (await import(pathToFileURL(path.join(HERE, 'stories', `s${n}.mjs`)).href + '?v=' + Date.now())).default;
  const vo = await makeVoice(n, story);
  const name = `reel${String(n).padStart(2, '0')}-${story.slug}`;
  const log = m => console.log(`${stamp()}  [${n}] ${m}`);
  const opts = { id: n, vo, fps: FPS, out: `${name}.mp4` };
  if (arg('audio-only', false)) opts.audioOnly = true;
  if (arg('cover-only', false)) opts.coverOnly = true;
  if (STILLS) opts.stills = STILLS === true ? 'shots' : STILLS === 'shots' ? 'shots' : String(STILLS).split(',').map(Number);
  const job = async ev => ev(`__reels.render(${JSON.stringify(opts)})`);
  job.log = log;
  const r = await withBrowser(job);
  if (STILLS) log(`stills saved in videos/psych-reels/stills · ${r.total.toFixed(1)} s · shots ${JSON.stringify(r.shots)}`);
  else log(`saved videos/psych-reels/${name}.mp4 · ${r.total.toFixed(1)} s · ${r.frames} frames · ${(r.bytes / 1048576).toFixed(1)} MB · took ${r.secs.toFixed(0)} s`);
}

// voice everything first (one at a time: the service does not like bursts), then draw in parallel
const queue = [...want]; let failed = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, want.length) }, async () => { while (queue.length) { const n = queue.shift(); try { await one(n); } catch (e) { console.log(`reel ${n} failed (${e.message}), trying once more`); try { await one(n); } catch (e2) { failed++; console.log(`reel ${n} FAILED: ${e2.message}`); } } } }));
server.close();
console.log(`${stamp()}  done${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed ? 1 : 0);
