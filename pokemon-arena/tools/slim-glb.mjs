// Shrinks a .glb for live use in Retro 2D: keeps only the animation clips the battle uses and drops every
// accessor / buffer view nothing references any more (the source models carry two full clip sets).
//
//   node tools/slim-glb.mjs <in.glb> <out.glb> [clip regex]
//
// The model's file can also come from git history:  git show b596552:pokemon-arena/models/regular-150.glb > m.glb
import fs from 'node:fs';

const [, , src, dst, rx] = process.argv;
if (!src || !dst) { console.log('usage: node tools/slim-glb.mjs <in.glb> <out.glb> [clip regex]'); process.exit(1); }
// the battle clips (see CLIPS in retro3d.js). Official models carry a 0xxxx and a 2xxxx set; some have their
// battle clips (attack, damage, down...) only in the 2xxxx set, so a 2xxxx clip is kept unless 0xxxx has it too
const KEEP = new RegExp(rx || '_[02]\\d{4}_(battlewait01_loop|defaultwait01_loop|run01_loop|walk01_loop|attack01|rangeattack01|damage01|stun01_start|stun01_loop|stun01_end|down01_start|roar01|sleep01_loop|glad01)$|^(?!pm\\d)');
const SET = /_([02])\d{4}_(\w+)$/;

const buf = fs.readFileSync(src);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jlen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jlen).toString('utf8'));
let bin = buf.subarray(20 + jlen + 8, 20 + jlen + 8 + buf.readUInt32LE(20 + jlen));

const before = (json.animations || []).length;
json.animations = (json.animations || []).filter(a => KEEP.test(a.name || ''));
const set0 = new Set(json.animations.map(a => SET.exec(a.name || '')).filter(m => m && m[1] === '0').map(m => m[2]));
json.animations = json.animations.filter(a => { const m = SET.exec(a.name || ''); return !m || m[1] === '0' || !set0.has(m[2]); });

// keyframe reduction: a key that linear interpolation between its neighbours already reproduces is dropped,
// and a channel that never leaves the node's rest pose is dropped (the mixer restores the rest pose anyway)
const EPS = 2e-4, NC = { SCALAR: 1, VEC3: 3, VEC4: 4 };
const extra = [];
let extraLen = 0;
const readF = i => {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = NC[a.type];
  if (!v || a.sparse || a.componentType !== 5126 || !n || (v.byteStride && v.byteStride !== n * 4)) return null;   // all-zero / sparse accessors stay as they are
  const o = (v.byteOffset || 0) + (a.byteOffset || 0);
  return { n, d: new Float32Array(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + a.count * n * 4)) };
};
const addF = (arr, type) => {
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), n = NC[type];
  json.bufferViews.push({ buffer: 0, byteOffset: bin.length + extraLen, byteLength: b.length });
  extra.push(b); extraLen += b.length;
  const acc = { bufferView: json.bufferViews.length - 1, componentType: 5126, count: arr.length / n, type };
  if (n === 1) { acc.min = [arr[0]]; acc.max = [arr[arr.length - 1]]; }
  json.accessors.push(acc);
  return json.accessors.length - 1;
};
let keysBefore = 0, keysAfter = 0;
for (const a of json.animations) {
  const keep = [];
  for (const ch of a.channels) {
    const s = a.samplers[ch.sampler];
    const T = readF(s.input), V = readF(s.output);
    if (!T || !V || (s.interpolation && s.interpolation !== 'LINEAR')) { keep.push(ch); continue; }
    const n = V.n, cnt = T.d.length, val = (i, c) => V.d[i * n + c];
    keysBefore += cnt;
    const node = json.nodes[ch.target.node], p = ch.target.path;
    const rest = p === 'rotation' ? node.rotation || [0, 0, 0, 1] : p === 'scale' ? node.scale || [1, 1, 1] : p === 'translation' ? node.translation || [0, 0, 0] : null;
    let constant = true;
    for (let i = 1; i < cnt && constant; i++) for (let c = 0; c < n; c++) if (Math.abs(val(i, c) - val(0, c)) > EPS) { constant = false; break; }
    if (constant && rest && rest.every((r, c) => Math.abs(r - val(0, c)) < EPS)) continue;   // never leaves the rest pose
    const kept = [0];
    if (!constant) {
      for (let i = 1; i < cnt - 1; i++) {
        const j = kept[kept.length - 1], k = (T.d[i] - T.d[j]) / (T.d[i + 1] - T.d[j]);
        let need = false;
        for (let c = 0; c < n && !need; c++) need = Math.abs(val(j, c) + (val(i + 1, c) - val(j, c)) * k - val(i, c)) > EPS;
        if (need) kept.push(i);
      }
      kept.push(cnt - 1);
    }
    keysAfter += kept.length;
    const t2 = new Float32Array(kept.length), v2 = new Float32Array(kept.length * n);
    kept.forEach((i, q) => { t2[q] = T.d[i]; for (let c = 0; c < n; c++) v2[q * n + c] = val(i, c); });
    a.samplers.push({ input: addF(t2, 'SCALAR'), output: addF(v2, json.accessors[s.output].type), interpolation: 'LINEAR' });
    keep.push({ ...ch, sampler: a.samplers.length - 1 });
  }
  // only the samplers the remaining channels use
  const used = [...new Set(keep.map(c => c.sampler))];
  a.samplers = used.map(i => a.samplers[i]);
  a.channels = keep.map(c => ({ ...c, sampler: used.indexOf(c.sampler) }));
}
bin = Buffer.concat([bin, ...extra]);
console.log(`keyframes: ${keysBefore} -> ${keysAfter}`);

// level of detail: some models carry lod1..lod3 copies of every mesh; only lod0 (the most detailed) is drawn.
// Only mesh nodes go - the lod groups are often skin joints themselves, and the skeleton stays whole
const lodOf = n => { const m = /^lod(\d+)$/.exec(n.name || ''); return m ? +m[1] : -1; };
const joints = new Set((json.skins || []).flatMap(s => s.joints));
if ((json.nodes || []).some(n => lodOf(n) > 0)) {
  const drop = new Set(), mark = i => { if (json.nodes[i].mesh != null && !joints.has(i)) drop.add(i); for (const c of json.nodes[i].children || []) mark(c); };
  json.nodes.forEach((n, i) => { if (lodOf(n) > 0) mark(i); });
  for (const n of json.nodes) if (n.children) n.children = n.children.filter(c => !drop.has(c));
  for (const i of drop) { const n = json.nodes[i]; delete n.mesh; delete n.skin; }
  // meshes nothing shows any more
  const used = [...new Set(json.nodes.filter(n => n.mesh != null).map(n => n.mesh))].sort((a, b) => a - b);
  const mm = new Map(used.map((m, k) => [m, k]));
  json.meshes = used.map(m => json.meshes[m]);
  for (const n of json.nodes) if (n.mesh != null) n.mesh = mm.get(n.mesh);
  console.log(`lod: ${drop.size} nodes of lower detail dropped`);
}

// accessors still in use
const usedAcc = new Set();
for (const m of json.meshes || []) for (const p of m.primitives) {
  Object.values(p.attributes).forEach(i => usedAcc.add(i));
  if (p.indices != null) usedAcc.add(p.indices);
  for (const t of p.targets || []) Object.values(t).forEach(i => usedAcc.add(i));
}
for (const s of json.skins || []) if (s.inverseBindMatrices != null) usedAcc.add(s.inverseBindMatrices);
for (const a of json.animations) for (const s of a.samplers) { usedAcc.add(s.input); usedAcc.add(s.output); }
const instancing = n => n.extensions && n.extensions.EXT_mesh_gpu_instancing && n.extensions.EXT_mesh_gpu_instancing.attributes;
for (const n of json.nodes || []) { const at = instancing(n); if (at) Object.values(at).forEach(i => usedAcc.add(i)); }
const accMap = new Map(), accessors = [];
(json.accessors || []).forEach((a, i) => { if (usedAcc.has(i)) { accMap.set(i, accessors.length); accessors.push(a); } });
const ra = i => accMap.get(i);
for (const m of json.meshes || []) for (const p of m.primitives) {
  for (const k in p.attributes) p.attributes[k] = ra(p.attributes[k]);
  if (p.indices != null) p.indices = ra(p.indices);
  for (const t of p.targets || []) for (const k in t) t[k] = ra(t[k]);
}
for (const s of json.skins || []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = ra(s.inverseBindMatrices);
for (const a of json.animations) for (const s of a.samplers) { s.input = ra(s.input); s.output = ra(s.output); }
for (const n of json.nodes || []) { const at = instancing(n); if (at) for (const k in at) at[k] = ra(at[k]); }
json.accessors = accessors;

// buffer views still in use (accessors, sparse data, images, Draco streams), repacked into a new binary chunk
const views = [];
for (const a of accessors) {
  if (a.bufferView != null) views.push(o => (a.bufferView = o(a.bufferView)));
  if (a.sparse) { views.push(o => (a.sparse.indices.bufferView = o(a.sparse.indices.bufferView))); views.push(o => (a.sparse.values.bufferView = o(a.sparse.values.bufferView))); }
}
for (const im of json.images || []) if (im.bufferView != null) views.push(o => (im.bufferView = o(im.bufferView)));
for (const m of json.meshes || []) for (const p of m.primitives) {
  const d = p.extensions && p.extensions.KHR_draco_mesh_compression;
  if (d) views.push(o => (d.bufferView = o(d.bufferView)));
}
const viewMap = new Map(), bufferViews = [], parts = [];
let off = 0;
const remap = i => {
  if (viewMap.has(i)) return viewMap.get(i);
  const v = { ...json.bufferViews[i] }, bytes = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (8 - (off % 8)) % 8;
  if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  v.byteOffset = off; v.buffer = 0; parts.push(bytes); off += bytes.length;
  viewMap.set(i, bufferViews.length); bufferViews.push(v);
  return viewMap.get(i);
};
views.forEach(fix => fix(remap));
json.bufferViews = bufferViews;
const pad4 = b => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, 0)]);
const newBin = pad4(Buffer.concat(parts));
json.buffers = [{ byteLength: newBin.length }];

const jbuf = Buffer.from(JSON.stringify(json), 'utf8');
const jpad = Buffer.concat([jbuf, Buffer.alloc((4 - (jbuf.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
const out = Buffer.concat([head, ch(jpad.length, 0x4e4f534a), jpad, ch(newBin.length, 0x004e4942), newBin]);
out.writeUInt32LE(out.length, 8);
fs.writeFileSync(dst, out);
console.log(`${src} -> ${dst}: ${before} -> ${json.animations.length} clips, ${(buf.length / 1e6).toFixed(2)} MB -> ${(out.length / 1e6).toFixed(2)} MB`);
json.animations.forEach(a => console.log('  ' + a.name));
