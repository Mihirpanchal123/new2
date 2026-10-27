// Downloads the animated pixel sprites Adventure mode uses from the PMD Sprite Collab
// (https://github.com/PMDCollab/SpriteCollab, CC BY-NC 4.0: non-commercial use, credit the artists) into ../pmd:
// for every Pokémon in data.js that has a finished sprite, the animation sheets the game plays (8 directions each)
// and their timing, plus pmd/index.json (frame sizes, durations, hit frames) and pmd/CREDITS.md (who drew what).
// Files already downloaded are skipped, so it can be re-run to fill gaps.
// Usage: node tools/build-pmd.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'pmd');
const RAW = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master';
// what the game plays: walking, standing, a contact attack, a ranged attack, powering up, being hit, sleeping, fainting
const WANT = ['Walk', 'Idle', 'Attack', 'Shoot', 'Charge', 'Hurt', 'Sleep', 'Faint'];

// GitHub's raw host throttles bursts (429): back off patiently (its Retry-After, or longer each time) and carry on
async function get(url, kind = 'text') {
  for (let i = 1; ; i++) {
    let wait = 1500 * i;
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (r.ok) return kind === 'buf' ? Buffer.from(await r.arrayBuffer()) : await r.text();
      if (process.env.DEBUG) console.log('http', r.status, url);
      if (r.status === 429 || r.status >= 500) wait = Math.max(wait, (+r.headers.get('retry-after') || 0) * 1000, 10000 * i);
      if (i >= 8) throw new Error(r.status + ' ' + url);
    } catch (e) {
      if (i >= 8) throw e;
    }
    await new Promise(res => setTimeout(res, Math.min(wait, 90000)));
  }
}
const exists = f => fs.access(f).then(() => true, () => false);
// AnimData.xml -> { shadow, anims: { Name: { w, h, d: [durations in 1/60 s], hit, file } } } (CopyOf resolved)
function parseAnimData(xml) {
  const tag = (s, t) => { const m = new RegExp(`<${t}>([^<]*)</${t}>`).exec(s); return m ? m[1].trim() : null; };
  const anims = {};
  for (const block of xml.match(/<Anim>[\s\S]*?<\/Anim>/g) || []) {
    const name = tag(block, 'Name');
    if (!name) continue;
    const copy = tag(block, 'CopyOf');
    anims[name] = copy ? { copy } : { w: +tag(block, 'FrameWidth'), h: +tag(block, 'FrameHeight'), d: [...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(m => +m[1]), hit: tag(block, 'HitFrame') != null ? +tag(block, 'HitFrame') : undefined };
  }
  for (const [name, a] of Object.entries(anims)) if (a.copy) { const src = anims[a.copy]; anims[name] = src && !src.copy ? { ...src, file: a.copy } : null; }
  for (const [name, a] of Object.entries(anims)) if (a && !a.file) a.file = name;
  return { shadow: +(tag(xml, 'ShadowSize') ?? 1), anims };
}

const win = {};
new Function('window', await fs.readFile(path.join(ROOT, 'data.js'), 'utf8'))(win);
const DEX = win.POKEDEX;
console.log('reading the sprite tracker...');
const tracker = JSON.parse(await get(`${RAW}/tracker.json`));
const names = new Map((await get(`${RAW}/credit_names.txt`)).split('\n').slice(1).map(l => l.split('\t')).filter(c => c.length >= 2).flatMap(([name, discord]) => [[name, name], [discord, name]]));
const creditName = id => names.get(id) || names.get(`<@!${String(id).replace(/\D/g, '')}>`) || id;
await fs.mkdir(OUT, { recursive: true });
const index = {}, credits = [], missing = [];
const jobs = DEX.order.map(n => DEX.species[n]);
let done = 0, bytes = 0;
async function one(sp) {
  const id = String(sp.id).padStart(4, '0'), t = tracker[id];
  // (sprite_files lists the animations a Pokémon has; its true/false values are not about whether the file exists)
  if (!t || !t.sprite_complete || !t.sprite_files || !('Walk' in t.sprite_files)) { missing.push(sp.name); return; }
  const xml = await get(`${RAW}/sprite/${id}/AnimData.xml`);
  if (!xml) { missing.push(sp.name); return; }
  const data = parseAnimData(xml), anims = {};
  const dir = path.join(OUT, sp.name);
  await fs.mkdir(dir, { recursive: true });
  for (const name of WANT) {
    const a = data.anims[name];
    if (!a || !a.w || !a.d.length) continue;
    const file = path.join(dir, a.file + '.png');
    if (!(await exists(file))) {
      const buf = await get(`${RAW}/sprite/${id}/${a.file}-Anim.png`, 'buf');
      if (!buf) continue;
      await fs.writeFile(file, buf);
      bytes += buf.length;
    }
    anims[name] = { f: a.file, w: a.w, h: a.h, d: a.d, ...(a.hit != null ? { hit: a.hit } : {}) };
  }
  if (!anims.Walk) { missing.push(sp.name); return; }
  index[sp.name] = { shadow: data.shadow, anims };
  const c = t.sprite_credit || {};
  credits.push(`| ${sp.display} | ${[c.primary, ...(c.secondary || [])].filter(Boolean).map(creditName).join(', ')} |`);
}
const queue = jobs.slice();
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const sp = queue.shift();
    try { await one(sp); } catch (e) { console.warn('failed', sp.name, e.message); missing.push(sp.name); }
    if (++done % 40 === 0) console.log(`${done}/${jobs.length} (${(bytes / 1e6).toFixed(1)} MB new)`);
  }
}));
const ordered = Object.fromEntries(DEX.order.filter(n => index[n]).map(n => [n, index[n]]));
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(ordered));
credits.sort((a, b) => a.localeCompare(b));
await fs.writeFile(path.join(OUT, 'CREDITS.md'), `# Pokémon pixel sprites (Adventure and battles)

From the PMD Sprite Collab: https://github.com/PMDCollab/SpriteCollab (https://sprites.pmdcollab.org).
Licensed CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/): **non-commercial use only**, with credit to the
artists below ("CHUNSOFT" marks sprites from the original Pokémon Mystery Dungeon games).

| Pokémon | Sprite artists |
| --- | --- |
${credits.join('\n')}
`);
console.log(`${Object.keys(ordered).length} Pokémon with sprites, ${missing.length} without (they keep their current look): ${missing.join(', ')}`);
