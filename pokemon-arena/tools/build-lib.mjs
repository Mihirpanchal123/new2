// Downloads three.js r170 and the add-ons Retro 2D's live 3D Pokémon use (retro3d.js: glTF + Draco loaders,
// SkeletonUtils) into ../lib. Relative imports of the add-ons are followed and downloaded too.
// Usage: node tools/build-lib.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0';
const LIB_ENTRIES = [
  'build/three.module.min.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/loaders/DRACOLoader.js',
  'examples/jsm/utils/SkeletonUtils.js'
];
const LIB_FILES = ['examples/jsm/libs/draco/gltf/draco_decoder.js', 'examples/jsm/libs/draco/gltf/draco_decoder.wasm', 'examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js'];
const libDest = p => path.join(ROOT, 'lib', p.replace(/^examples\/jsm\//, 'addons/').replace(/^build\//, ''));

async function fetchBuf(url) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { if (i >= 4) throw e; await new Promise(r => setTimeout(r, 600 * i)); }
  }
}
async function exists(f) { try { await fs.access(f); return true; } catch { return false; } }

async function main() {
  const queue = [...LIB_ENTRIES], seen = new Set();
  while (queue.length) {
    const lib = queue.shift();
    if (seen.has(lib)) continue;
    seen.add(lib);
    const dest = libDest(lib);
    const buf = (await exists(dest)) ? await fs.readFile(dest) : await fetchBuf(`${THREE_CDN}/${lib}`);
    if (!buf) throw new Error('missing lib ' + lib);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    if (lib.endsWith('.js')) for (const m of buf.toString().matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g))
      queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(lib), m[1])));
  }
  for (const f of LIB_FILES) {
    const dest = libDest(f);
    if (await exists(dest)) continue;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, await fetchBuf(`${THREE_CDN}/${f}`));
  }
  console.log(`three.js r170: ${seen.size} modules + Draco decoder in lib/`);
}

main().catch(e => { console.error(e); process.exit(1); });
