// =====================================================================
//  LIVE 3D POKéMON FOR RETRO 2D
//  Pokémon rendered in 3D in real time, at the art-pixel scale of the hand-made
//  sprites, and handed to Retro's 2D renderer as an ordinary sprite frame - so
//  the camera, draw order, squash & stretch, hit flashes, status tints,
//  afterimages, move effects and HUD all keep working unchanged. Two sources:
//    Live  - a real skinned .glb model with its own animation clips (models3d/)
//    Voxel - the Pokémon's animated pixel sprite inflated into a voxel volume,
//            frame by frame (any Pokémon), with procedural 3D body motion
//  Both go through the same Stage:
//    fixed orthographic 3/4 camera, 2x supersampled render target
//    GPU pass: box-reduce to the pixel grid, hard alpha, 12-level palette,
//              dark outline (same look as tools/bake-25d.js)
//    the model's own cast shadow on a ground plane, reduced to a hard pixel
//    mask that Retro draws like its blob shadows
//  Facing is a real 3D yaw (the model turns instead of being mirrored).
//  Loaded on demand by retro.js (three.js r170 from lib/).
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SS = 2;                        // supersampling: render 2x larger, then reduce to the pixel grid
const ELEV = 0.38;                   // camera elevation (radians), the same slant as the baked 2.5D sheets
const YAW = 0.95;                    // models: 3/4 view toward the foe: 0 faces the camera, +-YAW faces right / left
const OUTLINE = [26, 22, 34];        // outline colour of the hand-drawn sprites
const SHADOW = { x: 0.22, z: 0.3 };  // the cast shadow falls a little right and toward the viewer (per unit of height)
const ce = Math.cos(ELEV), se = Math.sin(ELEV);
const easeIO = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

// which model clip plays which battle animation (first match wins). Official models
// (pmXXXX_..._00400_attack01) first, then the other naming schemes in the asset collection.
const CLIPS = {
  idle: [/_0\d{4}_battlewait01_loop/, /_0\d{4}_defaultwait01_loop/, /aidle/, /bd_wait00/, /wait/i, /idle/i],
  move: [/_0\d{4}_run01_loop/, /001run/, /bd_run/, /_0\d{4}_walk01_loop/, /run/i, /walk/i],
  attack: [/_0\d{4}_attack01$/, /fight_b/, /bd_attack$/, /[^e]attack/i, /fight/i],
  special: [/_0\d{4}_rangeattack01$/, /bd_special/, /fight_d/],
  hurt: [/_0\d{4}_damage01$/, /bd_damage/, /damage/i],
  stun: [/_0\d{4}_stun01_start/],
  stunLoop: [/_0\d{4}_stun01_loop/],
  recover: [/_0\d{4}_stun01_end/, /bd_landing/],
  down: [/_0\d{4}_down01_start/, /001ko/, /bd_fall/, /down/i, /ko$/i],
  roar: [/_0\d{4}_roar01/],
  sleep: [/_0\d{4}_sleep01_loop/, /bd_sleeploop/],
  win: [/_0\d{4}_glad01/, /bd_victory/]
};
const LOOPS = new Set(['idle', 'move', 'stunLoop', 'sleep']);
// playback speed of one-shots, so a long official clip fits Retro's beat (wind-up -> impact in ~0.5-0.7 s)
const SPEED = { attack: 1.9, special: 1.7, hurt: 1.1, stun: 1.2, recover: 1.3, down: 1.25, roar: 1.35, win: 1 };
const FADE = { attack: 0.06, special: 0.08, hurt: 0.04, stun: 0.04, down: 0.08, recover: 0.1, roar: 0.12, win: 0.15 };

const draco = new DRACOLoader();
draco.setDecoderPath('lib/addons/libs/draco/gltf/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

// ---------------------------------------------------------------------
//  One shared WebGL renderer (offscreen) and the pixel-art reduction pass
// ---------------------------------------------------------------------
let R = null;
function renderer() {
  if (R) return R;
  const gl = new THREE.WebGLRenderer({ alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  gl.setPixelRatio(1);
  gl.setClearColor(0x000000, 0);
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.BasicShadowMap;          // hard edges: the mask is reduced to whole pixels anyway
  gl.shadowMap.autoUpdate = false;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, outSize: { value: new THREE.Vector2(1, 1) }, mode: { value: 0 }, ow: { value: 1 }, edge: { value: new THREE.Vector3(...OUTLINE.map(v => v / 255)) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // one output pixel = one SSxSS block of the render, averaged by a single bilinear fetch at the block centre
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 outSize; uniform int mode; uniform int ow; uniform vec3 edge; varying vec2 vUv;
      vec4 px(vec2 o) { return texture2D(tSrc, (floor(vUv * outSize) + 0.5 + o) / outSize); }
      vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        const float TH = 110.0 / 255.0;
        vec4 c = px(vec2(0.0));
        if (mode == 1) { gl_FragColor = c.a >= 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(0.0); return; }
        if (c.a >= TH) {                                   // un-premultiply the edge blend, then 12 levels per channel
          vec3 col = srgb(clamp(c.rgb / c.a, 0.0, 1.0));
          gl_FragColor = vec4(floor(col * 11.0 + 0.5) / 11.0, 1.0);
          return;
        }
        float n = 0.0;                                     // outline: ow pixels wide around the silhouette
        for (int k = 1; k <= 2; k++) {
          if (k > ow) break;
          float d = float(k);
          n = max(n, max(max(px(vec2(d, 0.0)).a, px(vec2(-d, 0.0)).a), max(px(vec2(0.0, d)).a, px(vec2(0.0, -d)).a)));
        }
        gl_FragColor = n >= TH ? vec4(edge, 1.0) : vec4(0.0);
      }`,
    depthTest: false, depthWrite: false
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const post = new THREE.Scene(); post.add(quad);
  R = { gl, mat, post, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), w: 0, h: 0, lost: false };
  gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); R.lost = true; });
  gl.domElement.addEventListener('webglcontextrestored', () => { R.lost = false; });
  return R;
}

// The cell a Pokémon is rendered into: a cylinder of radius r around the vertical axis (every pose at any yaw)
// plus room for the cast shadow, seen through the fixed camera. unit = output pixels per model unit,
// art = output pixels per Retro art pixel; the standing extents s (camera space) give the anchor box.
function cell({ r, y0, y1, s, unit, art }) {
  y0 = Math.min(0, y0);
  const left = -r, right = r + SHADOW.x * y1, top = y1 * ce + r * se, bottom = y0 * ce - (r + SHADOW.z * y1) * se;
  const m = 2 * art;                                   // margin for the outline
  const up = n => Math.ceil(n / art) * art;           // a whole number of Retro art pixels
  const w = up(Math.ceil((right - left) * unit) + m * 2), h = up(Math.ceil((top - bottom) * unit) + m * 2);
  const L = left - m / unit, T = top + m / unit;
  const px = (x, y) => [(x - L) * unit, (T - y) * unit];
  const [bx0, by0] = px(s.x0, s.y1), [bx1, by1] = px(s.x1, s.y0);
  // what Retro sees is in its art pixels (the canvas itself may be finer)
  const box = { x0: Math.floor(bx0 / art), y0: Math.floor(by0 / art), x1: Math.ceil(bx1 / art) - 1, y1: Math.ceil(by1 / art) - 1 };
  return { w, h, unit, art, L, T, r, y1, box, bw: box.x1 - box.x0 + 1, bh: box.y1 - box.y0 + 1, foot: px(0, 0).map(n => +(n / art).toFixed(2)) };
}

// ---------------------------------------------------------------------
//  Stage: scene, camera, cast shadow and the two canvases Retro draws
// ---------------------------------------------------------------------
class Stage {
  constructor(fr, { lights = [], ow = 1 } = {}) {
    this.fr = fr; this.ow = ow;
    const scene = this.scene = new THREE.Scene();
    this.pivot = new THREE.Group();                    // facing (yaw)
    this.inner = new THREE.Group();                    // procedural body motion on top of it
    this.inner.rotation.order = 'YXZ';
    this.pivot.add(this.inner); scene.add(this.pivot);
    const size = fr.r + fr.y1;
    // shadow caster: no light of its own, high and from the upper left behind the Pokémon
    const sun = new THREE.DirectionalLight(0xffffff, 0), k = size * 2;
    sun.position.set(-SHADOW.x * k, k, -SHADOW.z * k);
    sun.castShadow = true;
    const S = fr.r + fr.y1 * 0.5;
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.01 * size, far: k * 3 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(512, 512); sun.shadow.bias = -0.002;
    for (const l of [...lights, sun]) { l.layers.enableAll(); scene.add(l); }
    // ground plane that only catches the shadow (layer 1: drawn in the shadow pass only)
    const ground = this.ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 4, S * 4), new THREE.ShadowMaterial({ opacity: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.layers.set(1);
    scene.add(ground);
    // fixed orthographic camera; its frustum is the cell, so the model's origin lands on the foot anchor
    const D = size * 4;
    const cam = this.cam = new THREE.OrthographicCamera(fr.L, fr.L + fr.w / fr.unit, fr.T, fr.T - fr.h / fr.unit, 0.01 * size, D * 2);
    cam.position.set(0, se * D, ce * D);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const rtOpts = { colorSpace: THREE.SRGBColorSpace, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    this.rt = new THREE.WebGLRenderTarget(fr.w * SS, fr.h * SS, rtOpts);
    this.rtS = new THREE.WebGLRenderTarget(fr.w * SS, fr.h * SS, rtOpts);
    const cv = () => { const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h; return c; };
    this.cv = cv(); this.cx = this.cv.getContext('2d');
    this.sh = cv(); this.shx = this.sh.getContext('2d');
    // what Retro draws, in its art pixels (the canvas may be finer: drawSprite scales it to w x h)
    const a = fr.art, frame = img => ({ frames: [{ img, dur: 1 }], total: 1, w: fr.w / a, h: fr.h / a, box: fr.box, bw: fr.bw, bh: fr.bh, foot: fr.foot, live: true });
    this.anim = frame(this.cv);
    this.shadow = frame(this.sh);
  }
  // render this frame into the two canvases Retro draws
  render() {
    const r = renderer();
    if (r.lost) return;
    const gl = r.gl, fr = this.fr;
    if (r.w < fr.w * 2 || r.h < fr.h) { r.w = Math.max(r.w, fr.w * 2); r.h = Math.max(r.h, fr.h); gl.setSize(r.w, r.h, false); }
    this.pivot.updateMatrixWorld(true);
    // model, then its shadow on the ground (the model itself is hidden from the shadow pass by layers)
    gl.shadowMap.needsUpdate = true;
    this.cam.layers.set(0);
    gl.setRenderTarget(this.rt); gl.clear(); gl.render(this.scene, this.cam);
    this.cam.layers.set(1);
    gl.setRenderTarget(this.rtS); gl.clear(); gl.render(this.scene, this.cam);
    // reduce both to the pixel grid, side by side at the bottom of the shared canvas
    gl.setRenderTarget(null);
    gl.setScissorTest(true);
    r.mat.uniforms.outSize.value.set(fr.w, fr.h);
    r.mat.uniforms.ow.value = this.ow;
    for (const [i, rt] of [[0, this.rt], [1, this.rtS]]) {
      gl.setViewport(i * fr.w, 0, fr.w, fr.h); gl.setScissor(i * fr.w, 0, fr.w, fr.h);
      gl.clear();
      r.mat.uniforms.tSrc.value = rt.texture; r.mat.uniforms.mode.value = i;
      gl.render(r.post, r.cam);
    }
    gl.setScissorTest(false);
    const y = r.h - fr.h;                                // viewport y counts from the bottom, canvas rows from the top
    this.cx.clearRect(0, 0, fr.w, fr.h); this.cx.drawImage(gl.domElement, 0, y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    this.shx.clearRect(0, 0, fr.w, fr.h); this.shx.drawImage(gl.domElement, fr.w, y, fr.w, fr.h, 0, 0, fr.w, fr.h);
  }
  dispose() {
    this.rt.dispose(); this.rtS.dispose();
    this.ground.geometry.dispose(); this.ground.material.dispose();
    this.scene.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
    this.scene.clear();
  }
}

// =====================================================================
//  LIVE: real skinned models with animation clips
// =====================================================================
// matte cel shading: the models' textures are flat colour (many are exported unlit), so a 3-step toon ramp
// gives them form without the glossy gradients that read as noise at sprite size
let RAMP = null;
function ramp() {
  if (RAMP) return RAMP;
  const tones = [120, 190, 255];
  const d = new Uint8Array(tones.length * 4);
  tones.forEach((v, i) => d.set([v, v, v, 255], i * 4));
  RAMP = new THREE.DataTexture(d, tones.length, 1, THREE.RGBAFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter;
  RAMP.needsUpdate = true;
  return RAMP;
}
function toToon(m) {
  const t = new THREE.MeshToonMaterial({ name: m.name, color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, alphaMap: m.alphaMap || null, gradientMap: ramp(),
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, vertexColors: m.vertexColors, depthWrite: m.depthWrite });
  if (m.emissiveMap) { t.emissiveMap = m.emissiveMap; t.emissive = m.emissive ? m.emissive.clone() : new THREE.Color(0xffffff); }
  return t;
}

// the model is never drawn more than ~300 px tall: textures above 512 px only cost (mobile) GPU memory
const shrinking = new WeakSet();
function shrink(t, max = 512) {
  const im = t && t.image;
  if (!im || shrinking.has(t) || Math.max(im.width, im.height) <= max) return;
  shrinking.add(t);
  const k = max / Math.max(im.width, im.height), c = document.createElement('canvas');
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  t.image = c; t.needsUpdate = true;
}

let MAN = null;
const manifest = () => MAN || (MAN = fetch('models3d/manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({})));
export const has = async species => !!(await manifest())[species];

const TPL = new Map();
export function preload(species) {
  if (TPL.has(species)) return TPL.get(species);
  const pr = manifest().then(async man => {
    const e = man[species];
    if (!e) return null;
    const gltf = await loader.loadAsync(e.file);
    const clips = {};
    for (const [kind, rules] of Object.entries(CLIPS)) {
      for (const r of rules) { const c = gltf.animations.find(a => r.test(a.name)); if (c) { clips[kind] = c; break; } }
    }
    // root motion: Retro moves the Pokémon itself (runs, lunges, knockback), so every clip plays in place -
    // the shallowest translated bone of each clip (e.g. "origin") keeps its rest x/z, its height is kept
    const depth = o => { let n = 0; while (o.parent) { o = o.parent; n++; } return n; };
    for (const clip of new Set(Object.values(clips))) {
      const pos = clip.tracks.filter(t => t.name.endsWith('.position'))
        .map(t => ({ t, node: gltf.scene.getObjectByName(t.name.slice(0, t.name.lastIndexOf('.'))) })).filter(x => x.node);
      if (!pos.length) continue;
      const top = Math.min(...pos.map(x => depth(x.node)));
      for (const { t, node } of pos) {
        if (depth(node) !== top) continue;
        const v = t.values;
        for (let i = 0; i < v.length; i += 3) { v[i] = node.position.x; v[i + 2] = node.position.z; }
      }
    }
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
      // models exported unlit (KHR_materials_unlit) carry no normals; lighting needs them
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = Array.isArray(o.material) ? o.material.map(toToon) : toToon(o.material);
      for (const m of [].concat(o.material)) { shrink(m.map); shrink(m.alphaMap); shrink(m.emissiveMap); }
    });
    const tpl = { species, e, scene: gltf.scene, clips, frame: null };
    tpl.frame = frameFor(tpl);
    return tpl;
  });
  TPL.set(species, pr);
  pr.catch(() => TPL.delete(species));
  return pr;
}

// Framing, computed once per species: every pose of every battle clip at any yaw. The standing pose sets the
// art-pixel scale (heightPx tall, like the sprite sizes), so a tail swinging in one clip never shrinks the character.
function frameFor(tpl) {
  const root = SkeletonUtils.clone(tpl.scene);
  const mixer = new THREE.AnimationMixer(root);
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const v = new THREE.Vector3();
  let r = 0, y0 = Infinity, y1 = -Infinity;
  const each = fn => { root.updateMatrixWorld(true); for (const m of meshes) { const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 2) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); fn(v); } } };
  const pose = (clip, t) => { mixer.stopAllAction(); if (clip) { const a = mixer.clipAction(clip); a.reset().play(); mixer.setTime(t); } };
  const grow = p => { r = Math.max(r, Math.hypot(p.x, p.z)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); };
  for (const clip of new Set(Object.values(tpl.clips))) for (let k = 0; k < 6; k++) { pose(clip, clip.duration * k / 5 * 0.999); each(grow); }
  if (!Object.keys(tpl.clips).length) each(grow);
  // the standing pose, turned toward the foe, as the camera sees it
  pose(tpl.clips.idle, 0);
  root.rotation.y = -YAW;
  const s = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  each(p => { const sy = p.y * ce - p.z * se; s.x0 = Math.min(s.x0, p.x); s.x1 = Math.max(s.x1, p.x); s.y0 = Math.min(s.y0, sy); s.y1 = Math.max(s.y1, sy); });
  mixer.stopAllAction(); mixer.uncacheRoot(root);
  return cell({ r, y0, y1, s, unit: tpl.e.heightPx / Math.max(1e-6, s.y1 - s.y0), art: 1 });
}

class Live extends Stage {
  constructor(tpl) {
    // lights: the same rig as the baked sheets (warm sky / violet ground, key from the upper left, cool rim)
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x5a4a60, 1.5);
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(0xa8c8ff, 1.3); rim.position.set(4, 2, -4);
    super(tpl.frame, { lights: [hemi, key, rim] });
    this.tpl = tpl;
    this.root = SkeletonUtils.clone(tpl.scene);
    this.inner.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.root);
    this.act = {};
    for (const [kind, clip] of Object.entries(tpl.clips)) {
      const a = this.mixer.clipAction(clip);
      if (!LOOPS.has(kind)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.act[kind] = a;
    }
    this.base = null; this.shot = null; this.shotKind = null; this.yaw = 0; this.down = false;
    this.mixer.addEventListener('finished', e => { if (e.action === this.shot) this.done(); });
    this.setBase('idle');
    this.mixer.update(Math.random() * 2);              // two of the same species don't breathe in step
  }
  setBase(kind) {
    if (!this.act[kind]) kind = 'idle';
    if (this.base === this.act[kind] || !this.act[kind]) return;
    const prev = this.base, a = this.act[kind];
    a.reset().play();
    // during a one-shot the new base waits at weight 0 (toBase fades it in); otherwise crossfade
    if (prev) { if (this.shot) { prev.stop(); a.setEffectiveWeight(0); } else a.crossFadeFrom(prev, 0.2, false); }
    this.base = a; this.baseKind = kind;
  }
  // a one-shot battle animation (attack, special, hurt, stun, recover, down, roar, win)
  play(kind) {
    if (this.down && kind !== 'down') return false;
    if (kind === 'stun' && !this.act.stun) kind = 'hurt';
    if (kind === 'special' && !this.act.special) kind = 'attack';
    const a = this.act[kind];
    if (!a) return false;
    const from = this.shot || this.base;
    a.reset(); a.timeScale = SPEED[kind] || 1; a.setEffectiveWeight(1); a.play();
    if (from && from !== a) a.crossFadeFrom(from, FADE[kind] || 0.08, false);
    this.shot = a; this.shotKind = kind;
    if (kind === 'down') this.down = true;
    return true;
  }
  done() {
    const k = this.shotKind;
    if (k === 'down') return;                            // stays down
    if (k === 'stun' && this.act.stunLoop) {             // staggered: hold the dazed loop until the stagger ends
      const a = this.act.stunLoop; a.reset().play(); a.crossFadeFrom(this.shot, 0.1, false);
      this.shot = a; this.shotKind = 'stunLoop';
      return;
    }
    this.toBase(0.18);
  }
  toBase(fade) {
    const b = this.base;
    if (!this.shot) return;
    b.reset().play(); b.setEffectiveWeight(1); b.crossFadeFrom(this.shot, fade, false);
    this.shot = null; this.shotKind = null;
  }
  // per frame, from the fighter's state in Retro: s = { face, vx, vy, moving, sleep, frozen, slow, stagger }
  drive(dt, s) {
    // dazed until the stagger ends, then the recovery clip
    if (this.shotKind === 'stunLoop' && !s.stagger && !this.play('recover')) this.toBase(0.15);
    this.setBase(s.sleep && this.act.sleep ? 'sleep' : s.moving ? 'move' : 'idle');
    // facing: toward the foe in a 3/4 view (a turn passes through the camera); running, toward where it runs
    let target = s.face * YAW;
    if (s.moving && !this.shot && Math.hypot(s.vx, s.vy) > 60) target = Math.atan2(s.vx, s.vy / 0.6);
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * (this.shot ? 18 : 10));
    this.pivot.rotation.y = this.yaw;
    this.mixer.timeScale = s.frozen ? 0 : s.slow ? 0.5 : 1;
    this.mixer.update(dt);
  }
  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
    super.dispose();
  }
}

export async function create(species) {
  const tpl = await preload(species);
  if (!tpl) return null;
  renderer();                                            // throws here (caught by Retro) if WebGL is unavailable
  return new Live(tpl);
}

// =====================================================================
//  VOXEL: any Pokémon's animated pixel sprite, inflated into 3D
//  Each sprite frame becomes a voxel volume: every pixel is a column whose
//  depth grows with its distance from the silhouette edge (round body, thin
//  wings, claws and tails), meshed as merged runs and textured with the
//  sprite itself (nearest filtering: every voxel keeps its pixel's colour).
//  The sprite's own dark outline ring is dropped - the reduction pass draws
//  a fresh outline around the 3D silhouette. The sprite only shows one side,
//  so the model stays near side-on: it faces the foe in a slight 3/4 view and
//  turns around through edge-on; procedural 3D body motion stands in for
//  animation clips (twists, jolts, wobble, toppling over, a victory spin).
// =====================================================================
const VOX = {
  res: 2,          // output pixels per voxel (2: the 3D surfaces stay readable once turned)
  inflate: 2.4,    // half-thickness = inflate * sqrt(distance to the silhouette edge), in pixels
  maxT: 20,        // thickest half-depth, in pixels
  yaw: 0.38,       // 3/4 turn toward the viewer (0 = flat side-on)
  frames: 24       // most voxel frames per sprite animation
};

function voxFrame(img, w, h, fx, fy) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data, N = w * h;
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  const S = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x];
  // drop the dark outline ring (dark pixels touching the outside)
  const ring = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!solid[i] || (S(x - 1, y) && S(x + 1, y) && S(x, y - 1) && S(x, y + 1))) continue;
    if (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2] < 90) ring.push(i);
  }
  for (const i of ring) solid[i] = 0;
  // chamfer (3-4) distance to the nearest empty pixel -> half-thickness
  const D = new Float32Array(N);
  for (let i = 0; i < N; i++) D[i] = solid[i] ? 1e9 : 0;
  const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : D[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (solid[i]) D[i] = Math.min(D[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (solid[i]) D[i] = Math.min(D[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
  const t = new Int16Array(N);
  for (let i = 0; i < N; i++) if (solid[i]) t[i] = Math.max(1, Math.min(VOX.maxT, Math.round(VOX.inflate * Math.sqrt(D[i] / 3))));
  const T = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : t[y * w + x];

  // mesh: merged runs of equal depth; every face samples its own pixel from the sprite texture
  const pos = [], nor = [], uv = [], idx = [];
  let r = 0, y1 = 0;
  const quad = (pts, n, uvs) => {
    const P = pts.map(([a, b, z]) => [a - fx, fy - b, z]);
    const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { P.reverse(); uvs.reverse(); }
    const b = pos.length / 3;
    for (let k = 0; k < 4; k++) { pos.push(...P[k]); nor.push(...n); uv.push(...uvs[k]); r = Math.max(r, Math.hypot(...P[k])); y1 = Math.max(y1, P[k][1]); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  // front and back: greedy rectangles of equal depth (the texture carries the colours)
  const done = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, tt = t[i];
    if (!tt || done[i]) continue;
    let x1 = x; while (x1 + 1 < w && t[i + x1 + 1 - x] === tt && !done[i + x1 + 1 - x]) x1++;
    let y1r = y;
    grow: while (y1r + 1 < h) { for (let xx = x; xx <= x1; xx++) { const j = (y1r + 1) * w + xx; if (t[j] !== tt || done[j]) break grow; } y1r++; }
    for (let yy = y; yy <= y1r; yy++) done.fill(1, yy * w + x, yy * w + x1 + 1);
    const pts = [[x, y], [x1 + 1, y], [x1 + 1, y1r + 1], [x, y1r + 1]], uvs = () => pts.map(([a, b]) => [a / w, b / h]);
    quad(pts.map(([a, b]) => [a, b, tt]), [0, 0, 1], uvs());
    quad(pts.map(([a, b]) => [a, b, -tt]), [0, 0, -1], uvs());
  }
  // a wall where two neighbouring columns differ in depth, coloured by the deeper (owning) pixel
  const wall = (fixed, a0, a1, lo, hi, n, uvAt, vert) => {
    const zs = lo === 0 ? [[-hi, hi]] : [[lo, hi], [-hi, -lo]];
    for (const [z0, z1] of zs) {
      const pts = vert ? [[fixed, a0, z0], [fixed, a1, z0], [fixed, a1, z1], [fixed, a0, z1]] : [[a0, fixed, z0], [a1, fixed, z0], [a1, fixed, z1], [a0, fixed, z1]];
      quad(pts, n, [uvAt(a0), uvAt(a1), uvAt(a1), uvAt(a0)]);
    }
  };
  for (let bx = 0; bx <= w; bx++) for (let y = 0; y < h;) {          // walls facing left / right
    const ta = T(bx - 1, y), tb = T(bx, y);
    if (ta === tb) { y++; continue; }
    let y2 = y; while (y2 + 1 < h && T(bx - 1, y2 + 1) === ta && T(bx, y2 + 1) === tb) y2++;
    const own = ta > tb ? bx - 1 : bx, u = (own + 0.5) / w;
    wall(bx, y, y2 + 1, Math.min(ta, tb), Math.max(ta, tb), [ta > tb ? 1 : -1, 0, 0], b => [u, b / h], true);
    y = y2 + 1;
  }
  for (let by = 0; by <= h; by++) for (let x = 0; x < w;) {          // walls facing up / down
    const ta = T(x, by - 1), tb = T(x, by);
    if (ta === tb) { x++; continue; }
    let x2 = x; while (x2 + 1 < w && T(x2 + 1, by - 1) === ta && T(x2 + 1, by) === tb) x2++;
    const own = ta > tb ? by - 1 : by, v = (own + 0.5) / h;
    wall(by, x, x2 + 1, Math.min(ta, tb), Math.max(ta, tb), [0, ta > tb ? -1 : 1, 0], a => [a / w, v], false);
    x = x2 + 1;
  }
  // compact: coordinates are whole or half pixels (stored doubled as 16-bit ints, the mesh is scaled by 1/2),
  // 8-bit normals, 16-bit texture coordinates - about 14 bytes a vertex instead of 32
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(Int16Array.from(pos, v => Math.round(v * 2)), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from(nor, v => v * 127), 3, true));
  geo.setAttribute('uv', new THREE.BufferAttribute(Uint16Array.from(uv, v => Math.round(v * 65535)), 2, true));
  geo.setIndex(idx);
  geo.computeBoundingSphere();                         // three.js reads it when sorting draws, after the arrays are gone
  for (const a of [...Object.values(geo.attributes), geo.index]) a.onUpload(function () { this.array = null; });   // the GPU copy is enough
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.generateMipmaps = false;
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  return { geo, tex, r, y1, quads: idx.length / 6 };
}

// one voxel model per decoded sprite (shared by every fighter showing it)
const VOXM = new WeakMap();
function voxModel(anim) {
  if (VOXM.has(anim)) return VOXM.get(anim);
  const { w, h, box } = anim, fx = (box.x0 + box.x1 + 1) / 2, fy = box.y1 + 1;
  // at most VOX.frames voxel frames (memory): long sprite animations keep every k-th frame, holding it longer
  const k = Math.ceil(anim.frames.length / VOX.frames), src = [];
  anim.frames.forEach((f, i) => { if (i % k === 0) src.push({ img: f.img, dur: f.dur }); else src[src.length - 1].dur += f.dur; });
  const frames = src.map(f => ({ ...voxFrame(f.img, w, h, fx, fy), dur: f.dur }));
  const r = Math.max(...frames.map(f => f.r)), y1 = Math.max(...frames.map(f => f.y1));
  // standing extents at the 3/4 turn, from the first frame
  const p = frames[0].geo.attributes.position.array, cy = Math.cos(VOX.yaw), sy = Math.sin(VOX.yaw);
  const s = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let i = 0; i < p.length; i += 3) {
    const x = (p[i] * cy + p[i + 2] * sy) / 2, z = (-p[i] * sy + p[i + 2] * cy) / 2, v = p[i + 1] / 2 * ce - z * se;
    s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.y0 = Math.min(s.y0, v); s.y1 = Math.max(s.y1, v);
  }
  // the cylinder must also hold the model lying down (it topples over when it faints): r covers any rotation
  const vm = { frames, total: frames.reduce((a, f) => a + f.dur, 0), frame: cell({ r, y0: 0, y1, s, unit: VOX.res, art: VOX.res }) };
  VOXM.set(anim, vm);
  return vm;
}

// lighting for the voxels: the sprite's own colours on the faces turned toward the viewer, darker on the sides
// and underneath, brighter on top - so turning, twisting and toppling read as solid 3D
const VOX_VS = `varying vec2 vUv; varying vec3 vN;
  void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const VOX_FS = `uniform sampler2D map; uniform vec3 key; varying vec2 vUv; varying vec3 vN;
  void main() {
    vec4 c = texture2D(map, vUv);
    float b = 0.5 + 0.62 * max(dot(vN, key), 0.0) + 0.1 * max(vN.y, 0.0);
    gl_FragColor = vec4(c.rgb * b, 1.0);
  }`;

class Voxel extends Stage {
  constructor(vm) {
    super(vm.frame, { ow: VOX.res });
    this.vm = vm;
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: vm.frames[0].tex }, key: { value: new THREE.Vector3(-0.25, 0.45, 0.86).normalize() } }, vertexShader: VOX_VS, fragmentShader: VOX_FS });
    this.mesh = new THREE.Mesh(vm.frames[0].geo, this.mat);
    this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    this.mesh.scale.setScalar(0.5);                    // positions are stored doubled (half-pixel precision in 16-bit ints)
    this.inner.add(this.mesh);
    this.t = Math.random() * vm.total; this.cur = -1; this.clock = 0;
    this.yaw = VOX.yaw; this.fx = null; this.down = false;
  }
  play(kind) {
    if (this.down && kind !== 'down') return false;
    const dur = { attack: 0.45, special: 0.6, hurt: 0.4, stun: 0.4, roar: 0.8, win: 0.9, down: 0.65 }[kind];
    if (!dur) return false;
    this.fx = { kind, t: 0, dur };
    if (kind === 'down') this.down = true;
    return true;
  }
  drive(dt, s) {
    const vm = this.vm;
    this.clock += dt;
    // the sprite's own animation (held while asleep or frozen, half speed when paralysed)
    if (!s.frozen && !s.sleep) this.t += dt * (s.slow ? 0.5 : 1);
    let k = this.t % vm.total, i = 0;
    while (i < vm.frames.length - 1 && (k -= vm.frames[i].dur) >= 0) i++;
    if (i !== this.cur) { this.cur = i; this.mesh.geometry = vm.frames[i].geo; this.mat.uniforms.map.value = vm.frames[i].tex; }
    // facing: the sprite faces left; facing right is its back (the mirror image), the turn passes edge-on
    const target = VOX.yaw + (s.face + 1) / 2 * (Math.PI - 2 * VOX.yaw);
    this.yaw += (target - this.yaw) * Math.min(1, dt * 14);
    this.pivot.rotation.y = this.yaw;
    // procedural 3D body motion; rolls tip away from the camera whichever way it faces
    const rs = Math.cos(this.yaw) >= 0 ? 1 : -1;
    let tw = 0, roll = 0;
    const f = this.fx;
    if (f) {
      f.t += dt;
      const q = Math.min(1, f.t / f.dur), sn = Math.sin(Math.PI * q);
      switch (f.kind) {
        case 'attack': tw = -0.45 * Math.sin(2 * Math.PI * q) * (1 - q); break;                 // twist back, then into the blow
        case 'special': tw = 0.2 * sn; roll = -0.22 * sn * rs; break;                              // rear back as it fires
        case 'hurt': case 'stun': tw = 0.45 * Math.sin(3 * Math.PI * q) * (1 - q); roll = 0.14 * sn * rs; break;
        case 'roar': roll = -0.25 * sn * rs; break;
        case 'win': tw = 2 * Math.PI * easeIO(q); break;                                           // a full spin
        case 'down': roll = -rs * (q < 0.8 ? 1.42 * Math.pow(q / 0.8, 2) : 1.42 - 0.12 * Math.sin((q - 0.8) / 0.2 * Math.PI)); break;   // topples over, one bounce
      }
      if (q >= 1 && f.kind !== 'down') this.fx = null;
    }
    if (s.stagger && !this.down) tw += 0.2 * Math.sin(this.clock * 13);                          // dazed wobble
    this.inner.rotation.set(roll, tw, 0);
  }
  dispose() { this.mat.dispose(); super.dispose(); }
}

// build a sprite's voxel model ahead of time (Retro calls this during the battle intro: 0.2-0.6 s per sprite)
export const prepareVoxel = anim => { voxModel(anim); };
// a voxel Pokémon from a decoded Retro sprite ({ frames: [{ img, dur }], w, h, box })
export function voxel(anim) {
  const vm = voxModel(anim);
  renderer();
  return new Voxel(vm);
}
export const _voxStats = anim => { const vm = voxModel(anim); return { frames: vm.frames.length, quads: vm.frames.map(f => f.quads), cell: [vm.frame.w, vm.frame.h] }; };
