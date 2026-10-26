// Checks the Adventure world generator (world.js) over many seeds: the same seed builds the same world, the start
// is clear, every biome exists, every region and landmark can be walked to from the camp, and resource nodes and
// caches only sit on reachable ground. Exits with code 1 on any failure.
// Usage: node tools/test-world.mjs [seeds=40]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const OW = require('../world.js');
const N = +(process.argv[2] || 40);
let fails = 0, worst = 0;
const fail = (seed, msg) => { fails++; console.log(`seed ${seed}: FAIL ${msg}`); };
for (let k = 0; k < N; k++) {
  const seed = k === 0 ? 42 : 1 + Math.floor(Math.random() * 2147483646);
  const t0 = performance.now();
  const W = OW.generate(seed);
  worst = Math.max(worst, performance.now() - t0);
  const { COLS, ROWS } = W, at = (x, y) => y * COLS + x;
  // determinism: a second build from the seed is identical
  const ground = W.ground.slice(), obj = W.obj.slice(), nodes = W.nodes.map(n => n.id + n.kind).join();
  const W2 = OW.generate(seed);
  if (W2.ground.some((v, i) => v !== ground[i]) || W2.obj.some((v, i) => v !== obj[i]) || W2.nodes.map(n => n.id + n.kind).join() !== nodes) fail(seed, 'not deterministic');
  // a clear start: no obstacle or water within 4 tiles of the camp
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16 && OW.solidTile(W.spawn.x + dx, W.spawn.y + dy)) fail(seed, `blocked tile near the start (${dx},${dy})`);
  // every biome, every region centre and every landmark is reachable from the start
  for (const b of OW.ORDER) if (!W.regs.some(r => r.biome === b)) fail(seed, `no ${b} biome`);
  for (const r of W.regs) if (!W.reach[at(r.px, r.py)]) fail(seed, `region ${r.i} (${r.biome}) unreachable`);
  for (const l of W.landmarks) if (!W.reach[at(l.tx, l.ty)]) fail(seed, `landmark ${l.kind} unreachable`);
  if (W.landmarks.length !== OW.ORDER.length) fail(seed, `${W.landmarks.length} landmarks`);
  for (const n of [...W.nodes, ...W.caches]) if (!W.reach[at(n.tx, n.ty)]) fail(seed, `node ${n.id} unreachable`);
  if (W.nodes.length < 200) fail(seed, `only ${W.nodes.length} resource nodes`);
}
console.log(`${N} seeds, slowest generation ${worst.toFixed(0)} ms: ${fails ? fails + ' failure(s)' : 'all checks passed'}`);
process.exit(fails ? 1 : 0);
