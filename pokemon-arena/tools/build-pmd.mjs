// Downloads the animated pixel sprites Adventure mode uses from the PMD Sprite Collab
// (https://github.com/PMDCollab/SpriteCollab, CC BY-NC 4.0: non-commercial use, credit the artists) into ../pmd:
// for every Pokémon in data.js (and every Mega form) that has a sprite, the animation sheets the game plays (8 directions each)
// and their timing, plus pmd/index.json (frame sizes, durations, hit frames) and pmd/CREDITS.md (who drew what).
// Pokémon already in pmd/index.json with all their files are skipped, so it can be re-run to fill gaps.
// It also writes faces/: one small pixel picture per Pokémon and Mega form for the menus and HUDs (the first standing frame,
// facing the viewer, at twice its size; a Mega without a sprite of its own uses the Gen 5-style one from Pokémon Showdown, or else its species' one).
// Usage: node tools/build-pmd.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

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
const old = JSON.parse(await fs.readFile(path.join(OUT, 'index.json'), 'utf8').catch(() => '{}'));
// a Mega form is a subgroup of its species in the collab ('Mega', 'Mega_X', 'Mega_Z'...), named after the end of its own name
const megaSub = (e, mega, base) => {
  const want = mega.slice(base.length + 1).split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('_');
  return Object.entries((e && e.subgroups) || {}).find(([, v]) => v.name === want);
};
const jobs = DEX.order.flatMap(n => [DEX.species[n], ...DEX.species[n].megas.map(m => ({ ...m, id: DEX.species[n].id, of: n }))]);
let done = 0, bytes = 0;
async function one(sp) {
  let id = String(sp.id).padStart(4, '0'), t = tracker[id];
  // a Mega form: its subgroup's sprite (unfinished ones too, when they can walk: the game fills in a missing clip)
  if (sp.of) { const g = megaSub(t, sp.name, sp.of); t = g && g[1]; id += '/' + (g && g[0]); }
  // (sprite_files lists the animations a Pokémon has; its true/false values are not about whether the file exists)
  if (!t || !(t.sprite_complete || sp.of) || !t.sprite_files || !('Walk' in t.sprite_files)) { missing.push(sp.name); return; }
  const c = t.sprite_credit || {}, credit = `| ${sp.display} | ${[c.primary, ...(c.secondary || [])].filter(Boolean).map(creditName).join(', ')} |`;
  // an unfinished Mega sprite is used only if it can strike and flinch (else the Mega keeps its species' sprite)
  const usable = a => a.Walk && (!sp.of || t.sprite_complete || (a.Attack && a.Hurt));
  const dir = path.join(OUT, sp.name), prev = old[sp.name];
  if (prev && !usable(prev.anims)) { await fs.rm(dir, { recursive: true, force: true }); missing.push(sp.name); return; }
  if (prev && (await Promise.all(Object.values(prev.anims).map(a => exists(path.join(dir, a.f + '.png'))))).every(Boolean)) { index[sp.name] = prev; credits.push(credit); return; }
  const xml = await get(`${RAW}/sprite/${id}/AnimData.xml`);
  if (!xml) { missing.push(sp.name); return; }
  const data = parseAnimData(xml), anims = {};
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
  if (!usable(anims)) { if (sp.of) await fs.rm(dir, { recursive: true, force: true }); missing.push(sp.name); return; }
  index[sp.name] = { shadow: data.shadow, anims };
  credits.push(credit);
}
const queue = jobs.slice();
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const sp = queue.shift();
    try { await one(sp); } catch (e) { console.warn('failed', sp.name, e.message); missing.push(sp.name); }
    if (++done % 40 === 0) console.log(`${done}/${jobs.length} (${(bytes / 1e6).toFixed(1)} MB new)`);
  }
}));
const ordered = Object.fromEntries(jobs.filter(j => index[j.name]).map(j => [j.name, index[j.name]]));
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
console.log(`${Object.keys(ordered).length} Pokémon and Mega forms with sprites, ${missing.length} without (they keep their current look): ${missing.join(', ')}`);

// ---------------------------------------------------------------------
//  faces/: the pictures the menus and HUDs show (PNG read and written here: no dependencies)
// ---------------------------------------------------------------------
function readPng(buf) {
  let p = 8, w, h, depth, type, pal = [], trns = [], idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error('interlaced PNG'); }
    else if (kind === 'PLTE') for (let i = 0; i < len; i += 3) pal.push([d[i], d[i + 1], d[i + 2]]);
    else if (kind === 'tRNS') trns = [...d];
    else if (kind === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], bpp = Math.max(1, ch * depth / 8), stride = Math.ceil(w * ch * depth / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      row[i] = (row[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = (i => depth === 8 ? row[x * ch + i] : depth === 16 ? row[(x * ch + i) * 2] : (row[(x * depth) >> 3] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1));
      const rgba = type === 3 ? [...(pal[s(0)] || [0, 0, 0]), trns[s(0)] ?? 255] : type === 6 ? [s(0), s(1), s(2), s(3)] : type === 2 ? [s(0), s(1), s(2), 255] : type === 4 ? [s(0), s(0), s(0), s(1)] : [s(0), s(0), s(0), 255];
      px.set(rgba, o);
    }
    prev = row;
  }
  return { w, h, px };
}
function writePng({ w, h, px }) {
  const chunk = (kind, d) => { const head = Buffer.alloc(8); head.writeUInt32BE(d.length); head.write(kind, 4, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), d]))); return Buffer.concat([head, d, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// a region of an image, trimmed to its opaque pixels plus a 1-pixel margin
function trim(img, x0, y0, w, h) {
  let a = w, b = h, c = -1, d = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img.px[((y0 + y) * img.w + x0 + x) * 4 + 3] > 0) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  if (c < 0) return null;
  const W = c - a + 3, H = d - b + 3, px = Buffer.alloc(W * H * 4);
  for (let y = b; y <= d; y++) img.px.copy(px, ((y - b + 1) * W + 1) * 4, ((y0 + y) * img.w + x0 + a) * 4, ((y0 + y) * img.w + x0 + c + 1) * 4);
  return { w: W, h: H, px };
}
// twice the size, pixel for pixel (the Mystery Dungeon sprites are small next to the 96-pixel Showdown ones)
function double({ w, h, px }) {
  const out = Buffer.alloc(w * h * 16);
  for (let y = 0; y < h * 2; y++) for (let x = 0; x < w * 2; x++) px.copy(out, (y * w * 2 + x) * 4, ((y >> 1) * w + (x >> 1)) * 4, ((y >> 1) * w + (x >> 1)) * 4 + 4);
  return { w: w * 2, h: h * 2, px: out };
}
const FACES = path.join(ROOT, 'faces');
await fs.mkdir(FACES, { recursive: true });
// Pokémon Showdown's sprite names: the species without hyphens, then '-' and the form (charizard-mega-x -> charizard-megax)
const showdownId = (name, of) => of ? of.replace(/-/g, '') + '-' + name.slice(of.length + 1).replace(/-/g, '') : name.replace(/-/g, '');
const fromPmd = async name => { const a = ordered[name] && (ordered[name].anims.Idle || ordered[name].anims.Walk); return a ? double(trim(readPng(await fs.readFile(path.join(OUT, name, a.f + '.png'))), 0, 0, a.w, a.h)) : null; };
const noFace = [], gen5 = [];
for (const j of jobs) {
  const file = path.join(FACES, j.name + '.png');
  if (await exists(file)) continue;
  let face = await fromPmd(j.name);
  if (!face) {
    const buf = await get(`https://play.pokemonshowdown.com/sprites/gen5/${showdownId(j.name, j.of)}.png`, 'buf');
    if (buf) { const img = readPng(buf); face = trim(img, 0, 0, img.w, img.h); if (face) gen5.push(j.name); }
  }
  if (!face && j.of) face = await fromPmd(j.of);
  if (face) await fs.writeFile(file, writePng(face)); else noFace.push(j.name);
}
console.log(`faces/: ${jobs.length - noFace.length} pictures (${gen5.length} from Pokémon Showdown: ${gen5.join(', ') || '-'})${noFace.length ? `; none for ${noFace.join(', ')}` : ''}`);
