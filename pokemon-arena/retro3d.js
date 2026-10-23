// =====================================================================
//  LIVE 3D POKéMON FOR RETRO 2D
//  Real skinned .glb models, animated and lit in real time, rendered at the
//  art-pixel scale of the hand-made sprites and handed to Retro's 2D renderer
//  as an ordinary sprite frame - so the camera, draw order, squash & stretch,
//  hit flashes, status tints, afterimages, move effects and HUD all keep
//  working unchanged. Only the frame source is 3D:
//    model  -> fixed orthographic 3/4 camera, toon lighting (key upper-left,
//              cool rim), 2x supersampled render target
//    pixels -> GPU pass: box-reduce to the art grid, hard alpha, 12-level
//              palette, 1 px dark outline (same look as tools/bake-25d.js)
//    shadow -> the model's own cast shadow on a ground plane, reduced to a
//              hard pixel mask that Retro draws like its blob shadows
//  Facing is a real 3D yaw (the model turns through the camera instead of
//  being mirrored). Loaded on demand by retro.js (three.js r170 from lib/).
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SS = 2;                        // supersampling: render 2x larger, then reduce to the art pixel grid
const ELEV = 0.38;                   // camera elevation (radians), the same slant as the baked 2.5D sheets
const YAW = 0.95;                    // 3/4 view toward the foe: 0 faces the camera, +-YAW faces right / left
const OUTLINE = [26, 22, 34];        // outline colour of the hand-drawn sprites

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
    uniforms: { tSrc: { value: null }, outSize: { value: new THREE.Vector2(1, 1) }, mode: { value: 0 }, edge: { value: new THREE.Vector3(...OUTLINE.map(v => v / 255)) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // one output pixel = one SSxSS block of the render, averaged by a single bilinear fetch at the block centre
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 outSize; uniform int mode; uniform vec3 edge; varying vec2 vUv;
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
        float n = max(max(px(vec2(1.0, 0.0)).a, px(vec2(-1.0, 0.0)).a), max(px(vec2(0.0, 1.0)).a, px(vec2(0.0, -1.0)).a));
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

// ---------------------------------------------------------------------
//  Species templates: the loaded model, its clip plan and its framing
// ---------------------------------------------------------------------
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

// Framing, computed once per species: a cylinder around the vertical axis that holds every pose of every
// battle clip at any yaw, seen through the fixed camera. The standing pose sets the art-pixel scale
// (heightPx tall, like the sprite sizes), so a tail swinging in one clip never shrinks the character.
function frameFor(tpl) {
  const root = SkeletonUtils.clone(tpl.scene);
  const mixer = new THREE.AnimationMixer(root);
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const v = new THREE.Vector3(), ce = Math.cos(ELEV), se = Math.sin(ELEV);
  let r = 0, y0 = Infinity, y1 = -Infinity;
  const each = fn => { root.updateMatrixWorld(true); for (const m of meshes) { const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 2) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); fn(v); } } };
  const pose = (clip, t) => { mixer.stopAllAction(); if (clip) { const a = mixer.clipAction(clip); a.reset().play(); mixer.setTime(t); } };
  for (const clip of new Set(Object.values(tpl.clips))) {
    for (let k = 0; k < 6; k++) { pose(clip, clip.duration * k / 5 * 0.999); each(p => { r = Math.max(r, Math.hypot(p.x, p.z)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); }
  }
  if (!Object.keys(tpl.clips).length) each(p => { r = Math.max(r, Math.hypot(p.x, p.z)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  // the standing pose, turned toward the foe, as the camera sees it
  pose(tpl.clips.idle, 0);
  root.rotation.y = -YAW;
  let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity;
  each(p => { const sy = p.y * ce - p.z * se; sx0 = Math.min(sx0, p.x); sx1 = Math.max(sx1, p.x); sy0 = Math.min(sy0, sy); sy1 = Math.max(sy1, sy); });
  mixer.stopAllAction(); mixer.uncacheRoot(root);
  y0 = Math.min(0, y0);
  const unit = tpl.e.heightPx / Math.max(1e-6, sy1 - sy0);          // art pixels per model unit
  // the cast shadow falls a little right and toward the viewer (light high, from the upper left behind)
  const sh = { x: 0.22, z: 0.3 };
  const left = -r, right = r + sh.x * y1, top = y1 * ce + r * se, bottom = y0 * ce - (r + sh.z * y1) * se;
  const w = Math.ceil((right - left) * unit) + 4, h = Math.ceil((top - bottom) * unit) + 4;
  const L = left - 2 / unit, T = top + 2 / unit;
  const px = (x, y) => [(x - L) * unit, (T - y) * unit];
  const [bx0, by0] = px(sx0, sy1), [bx1, by1] = px(sx1, sy0);
  const box = { x0: Math.floor(bx0), y0: Math.floor(by0), x1: Math.ceil(bx1) - 1, y1: Math.ceil(by1) - 1 };
  return { w, h, unit, L, T, r, y1, sh, box, bw: box.x1 - box.x0 + 1, bh: box.y1 - box.y0 + 1, foot: px(0, 0).map(n => +n.toFixed(1)) };
}

// ---------------------------------------------------------------------
//  A Pokémon on the field
// ---------------------------------------------------------------------
class Live {
  constructor(tpl) {
    const fr = tpl.frame;
    this.tpl = tpl; this.fr = fr;
    this.root = SkeletonUtils.clone(tpl.scene);
    this.pivot = new THREE.Group(); this.pivot.add(this.root);
    const scene = this.scene = new THREE.Scene();
    scene.add(this.pivot);
    // lights: the same rig as the baked sheets (warm sky / violet ground, key from the upper left, cool rim)
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x5a4a60, 1.5);
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(0xa8c8ff, 1.3); rim.position.set(4, 2, -4);
    // shadow caster: no light of its own, high and from the upper left behind the Pokémon
    const sun = new THREE.DirectionalLight(0xffffff, 0); sun.position.set(-fr.sh.x * 6, 6, -fr.sh.z * 6);
    sun.castShadow = true;
    const S = fr.r + fr.y1 * 0.5;
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.1, far: 30 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(512, 512); sun.shadow.bias = -0.002;
    for (const l of [hemi, key, rim, sun]) { l.layers.enableAll(); scene.add(l); }
    // ground plane that only catches the shadow (layer 1: drawn in the shadow pass only)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 4, S * 4), new THREE.ShadowMaterial({ opacity: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.layers.set(1);
    scene.add(ground); this.ground = ground;
    // fixed orthographic camera, framed so the model's origin lands on the foot anchor
    const cam = this.cam = new THREE.OrthographicCamera(fr.L, fr.L + fr.w / fr.unit, fr.T, fr.T - fr.h / fr.unit, 0.1, 100);
    cam.position.set(0, Math.sin(ELEV) * 30, Math.cos(ELEV) * 30);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    // lookAt would centre the view on the origin; shift the frustum so the cylinder fills the cell instead
    cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const rtOpts = { colorSpace: THREE.SRGBColorSpace, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    this.rt = new THREE.WebGLRenderTarget(fr.w * SS, fr.h * SS, rtOpts);
    this.rtS = new THREE.WebGLRenderTarget(fr.w * SS, fr.h * SS, rtOpts);
    // what Retro draws: two small 2D canvases updated every frame
    const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.cv = cv(fr.w, fr.h); this.cx = this.cv.getContext('2d');
    this.sh = cv(fr.w, fr.h); this.shx = this.sh.getContext('2d');
    const frame = img => ({ frames: [{ img, dur: 1 }], total: 1, w: fr.w, h: fr.h, box: fr.box, bw: fr.bw, bh: fr.bh, foot: fr.foot, live: true });
    this.anim = frame(this.cv);
    this.shadow = frame(this.sh);
    // animation
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
  has(kind) { return !!this.act[kind]; }
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
    if (this.shot && this.shot !== a && this.shot !== from) this.shot.fadeOut(0.08);
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
    if ((this.shotKind === 'stunLoop' || this.shotKind === 'stun') && !s.stagger) {
      if (this.shotKind === 'stunLoop') { if (!this.play('recover')) this.toBase(0.15); }
    }
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
    // reduce both to the art pixel grid, side by side at the bottom of the shared canvas
    gl.setRenderTarget(null);
    gl.setScissorTest(true);
    r.mat.uniforms.outSize.value.set(fr.w, fr.h);
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
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
    this.rt.dispose(); this.rtS.dispose();
    this.ground.geometry.dispose(); this.ground.material.dispose();
    this.scene.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
    this.scene.clear();
  }
}

export async function create(species) {
  const tpl = await preload(species);
  if (!tpl) return null;
  renderer();                                            // throws here (caught by Retro) if WebGL is unavailable
  return new Live(tpl);
}
