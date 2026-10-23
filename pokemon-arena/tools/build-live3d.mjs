// Picks, downloads and slims a 3D model for every Pokémon and Mega form in data.js, for Retro 2D's live 3D
// (retro3d.js), and writes ../models3d/manifest.json.
//
//   node tools/build-live3d.mjs                 every form that has no model yet
//   node tools/build-live3d.mjs pikachu gengar  only these (rebuilds them)
//   node tools/build-live3d.mjs --force         rebuild everything
//
// Sources, best first (only each file's glTF header is read to choose; then one file is downloaded per form):
//   Pokémon 3D API assets (https://github.com/Pokemon-3D-api/assets), graded
//     full    official models with the whole battle clip set (wait, run, attack, damage, faint...), played as they are
//     rig     a skinned model without that clip set
//     static  a model without a skeleton
//   Switch models with skeleton and idle loop (https://github.com/Unborne-Fetus/Pokedex-3D-Models-Animations), only
//     for forms the first has no model of: most of their colour lives in shader parameters the conversion lost
//     (white albedo textures, blank eyes), so they render pale
// retro3d.js adds procedural body / bone motion to everything that is not 'full'.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'models3d');
const API = { repo: 'Pokemon-3D-api/assets', branch: 'main', raw: 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/' };
const SW = { repo: 'Unborne-Fetus/Pokedex-3D-Models-Animations', branch: 'main', raw: 'https://raw.githubusercontent.com/Unborne-Fetus/Pokedex-3D-Models-Animations/main/' };
// per-form corrections found while checking the models: yaw (radians) turns a model that does not face +Z
const FIX = {};
// forms whose only model is unusable (checked by eye in tools/live3d-preview.html): they keep their pixel sprite
const SKIP = { impidimp: 'Switch model only, renders white', morgrem: 'Switch model only, renders white' };

const args = process.argv.slice(2), force = args.includes('--force'), only = args.filter(a => !a.startsWith('--'));
const run = promisify(execFile);

async function fetchRetry(url, opts) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, opts);
      if (!r.ok && r.status !== 206) throw new Error(`${r.status} ${url}`);
      return r;
    } catch (e) { if (i === 4) throw e; await new Promise(res => setTimeout(res, 1000 * i)); }
  }
}
const tree = async src => (await (await fetchRetry(`https://api.github.com/repos/${src.repo}/git/trees/${src.branch}?recursive=1`)).json()).tree.map(t => t.path);

// the glTF JSON chunk of a remote .glb, read with two range requests
async function header(url) {
  const r = await fetchRetry(url, { headers: { Range: 'bytes=0-19' } });
  const b = Buffer.from(await r.arrayBuffer());
  if (b.subarray(0, 4).toString() !== 'glTF') throw new Error('not a glb: ' + url);
  const len = b.readUInt32LE(12);
  const r2 = await fetchRetry(url, { headers: { Range: `bytes=20-${19 + len}` } });
  return JSON.parse(Buffer.from(await r2.arrayBuffer()).toString('utf8'));
}
// the clips retro3d.js plays (see CLIPS there); 'full' needs at least idle, run, attack, damage and faint
const KINDS = { idle: /_[02]\d{4}_(battle|default)wait01_loop$/, run: /_[02]\d{4}_(run|walk)01_loop$/, attack: /_[02]\d{4}_attack01$/, damage: /_[02]\d{4}_damage01$/, down: /_[02]\d{4}_down01_start$/ };
const GENERIC_IDLE = /^((Armature\|)?ArmatureAction(\.\d+)?|Animation)$/;
function grade(j) {
  const clips = (j.animations || []).map(a => a.name || ''), skinned = !!(j.skins || []).length;
  if (skinned && Object.values(KINDS).every(re => clips.some(c => re.test(c)))) return 'full';
  if (skinned && clips.length === 1 && GENERIC_IDLE.test(clips[0])) return 'idle';
  return skinned ? 'rig' : 'static';
}
const RANK = { full: 4, idle: 3, rig: 2, static: 1 };

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } }));
}

async function main() {
  const dex = { window: {} };
  new Function('window', await fs.readFile(path.join(ROOT, 'data.js'), 'utf8'))(dex.window);
  const P = dex.window.POKEDEX;
  // every form: [key, national dex id, mega suffix ('' for the regular form)]
  const forms = P.order.flatMap(s => [[s, P.species[s].id, null], ...P.species[s].megas.map(m => [m.name, P.species[s].id, m.name.slice(s.length).replace(/^-mega-?/, '')])]);

  const manPath = path.join(OUT, 'manifest.json');
  let man = {};
  try { man = JSON.parse(await fs.readFile(manPath, 'utf8')); } catch {}
  for (const k of Object.keys(SKIP)) if (man[k]) { delete man[k]; await fs.rm(path.join(OUT, k + '.glb'), { force: true }); }
  const want = forms.filter(([k]) => !SKIP[k] && (only.length ? only.includes(k) : force || !man[k]));
  console.log(`${forms.length} forms, ${want.length} to build` + (Object.keys(SKIP).length ? ` (skipped: ${Object.keys(SKIP).join(', ')})` : ''));
  if (!want.length) { await fs.writeFile(manPath, JSON.stringify(man, null, 1) + '\n'); return; }

  console.log('Listing the model repositories...');
  const [apiFiles, swFiles] = await Promise.all([tree(API), tree(SW)]);
  const apiSet = new Set(apiFiles), swSet = new Set(swFiles);
  const candidates = ([key, id, mega]) => {
    const c = [];
    if (mega === null) {
      const a = `models/opt/regular/${id}.glb`, s = `${String(id).padStart(4, '0')}/regular.glb`;
      if (apiSet.has(a)) c.push({ src: 'api', url: API.raw + a });
      if (swSet.has(s)) c.push({ src: 'switch', url: SW.raw + s });
    } else {
      // Megas: 'mega/' (Mega Evolution), 'za/' (Legends Z-A Megas), 'x/' 'y/' 'sz?/'... for the lettered ones
      for (const f of mega ? [mega, 's' + mega, mega + 'a'] : ['mega', 'za']) {
        const a = `models/opt/${f}/${id}.glb`;
        if (apiSet.has(a)) { c.push({ src: 'api', url: API.raw + a }); break; }
      }
    }
    return c;
  };

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'live3d-'));
  const height = async key => {
    try { return JSON.parse(await fs.readFile(path.join(ROOT, 'tools', '.cache', `_pokemon_${key}.json`), 'utf8')).height / 10; } catch { return 1; }
  };
  const tally = { full: 0, idle: 0, rig: 0, static: 0 }, missing = [];
  let done = 0;
  await pool(want, 6, async form => {
    const [key] = form;
    try {
      const cs = candidates(form);
      for (const c of cs) c.grade = grade(await header(c.url));
      cs.sort((a, b) => (b.src === 'api') - (a.src === 'api') || RANK[b.grade] - RANK[a.grade]);
      const best = cs[0];
      if (!best) { missing.push(key); return; }
      const raw = path.join(tmp, key + '.glb'), out = path.join(OUT, key + '.glb');
      await fs.writeFile(raw, Buffer.from(await (await fetchRetry(best.url)).arrayBuffer()));
      await run(process.execPath, [path.join(ROOT, 'tools', 'slim-glb.mjs'), raw, out]);
      await fs.rm(raw, { force: true });
      const h = await height(key), size = (await fs.stat(out)).size;
      man[key] = { file: `models3d/${key}.glb`, heightPx: Math.round(Math.min(112, Math.max(54, 46 + h * 30))), anim: best.grade,
        ...FIX[key], source: best.url.replace(/^https:\/\/raw\.githubusercontent\.com\//, '') };
      tally[best.grade]++;
      console.log(`  ${String(++done).padStart(3)}/${want.length} ${key.padEnd(24)} ${best.grade.padEnd(6)} ${(size / 1e6).toFixed(2)} MB  (${best.src})`);
    } catch (e) { console.warn(`  ! ${key}: ${e.message}`); missing.push(key); }
  });
  await fs.rm(tmp, { recursive: true, force: true });
  // stable order: the order of data.js
  const sorted = Object.fromEntries(forms.map(([k]) => k).filter(k => man[k]).map(k => [k, man[k]]));
  await fs.writeFile(manPath, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`Done: ${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', ')}; ${Object.keys(sorted).length}/${forms.length} forms in the manifest`);
  if (missing.length) console.log('No model: ' + missing.join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
