// =====================================================================
//  LIVE 3D POKéMON FOR RETRO 2D
//  Pokémon rendered in 3D in real time, at the art-pixel scale of the hand-made
//  sprites, and handed to Retro's 2D renderer as an ordinary sprite frame - so
//  the camera, draw order, squash & stretch, hit flashes, status tints,
//  afterimages, move effects and HUD all keep working unchanged. Two sources:
//    Live  - a real .glb model (models3d/, tools/build-live3d.mjs) playing its own
//            animation clips, with procedural body / bone motion for what it lacks
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
const YAW_ACT = 1.2;                 // ...and closer to side-on while attacking, so limbs thrown at the foe read in silhouette
const OUTLINE = [26, 22, 34];        // outline colour of the hand-drawn sprites
const SHADOW = { x: 0.22, z: 0.3 };  // the cast shadow falls a little right and toward the viewer (per unit of height)
const ce = Math.cos(ELEV), se = Math.sin(ELEV);
const easeIO = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
// the pixel-art treatment that makes the models read as Retro sprites (window.RETRO3D overrides it, for tuning)
const RETRO = Object.assign({
  fps: 12,          // poses step like sprite frames: a new frame 12 times a second (a new action shows at once)
  turns: 16,        // facing snaps to this many directions, like sprites drawn at a few angles
  levels: 7,        // colour levels per channel
  tex: 128,         // textures shrink to this many pixels and are sampled nearest: flat colour areas, no gradients
  inner: 0.004      // inner contour lines where a nearer part overlaps (depth step, 0 = off)
}, globalThis.RETRO3D);

// which model clip plays which battle animation (first match wins). Official models
// (pmXXXX_..._00400_attack01; some only have the battle clips in their 2xxxx set) first,
// then the other naming schemes in the asset collection.
const CLIPS = {
  idle: [/_[02]\d{4}_battlewait01_loop/, /_[02]\d{4}_defaultwait01_loop/, /aidle/, /bd_wait00/, /wait/i, /idle/i],
  move: [/_[02]\d{4}_run01_loop/, /001run/, /bd_run/, /_[02]\d{4}_walk01_loop/, /run/i, /walk/i],
  attack: [/_[02]\d{4}_attack01$/, /fight_b/, /bd_attack$/, /[^e]attack/i, /fight/i],
  special: [/_[02]\d{4}_rangeattack01$/, /bd_special/, /fight_d/],
  hurt: [/_[02]\d{4}_damage01$/, /bd_damage/, /damage/i],
  stun: [/_[02]\d{4}_stun01_start/],
  stunLoop: [/_[02]\d{4}_stun01_loop/],
  recover: [/_[02]\d{4}_stun01_end/, /bd_landing/],
  down: [/_[02]\d{4}_down01_start/, /001ko/, /bd_fall/, /down/i, /ko$/i],
  roar: [/_[02]\d{4}_roar01/],
  sleep: [/_[02]\d{4}_sleep01_loop/, /bd_sleeploop/],
  win: [/_[02]\d{4}_glad01/, /bd_victory/]
};
// a single generically named clip (the Switch models, many rips) is the model's idle loop
const GENERIC_IDLE = /^((Armature\|)?ArmatureAction(\.\d+)?|Animation)$/;
// bones the procedural motion drives, by lower-case name: the official skeletons (spine_01, left_arm_01...)
// and the Game Freak rips of the asset collection (Spine1, LArm, LForeArm...; a "_12" suffix is ignored)
const BONES = {
  spine: /^(spine_01|spine|spine1)$/, chest: /^(spine_02|spine2|chest)$/, neck: /^(neck_01|neck|neck1)$/, head: /^head$/, jaw: /^(jaw|lower_jaw)$/,
  lArm: /^(left_arm_01|larm|l_upperarm)$/, rArm: /^(right_arm_01|rarm|r_upperarm)$/,
  lFore: /^(left_arm_02|lforearm|l_forearm)$/, rFore: /^(right_arm_02|rforearm|r_forearm)$/,
  lThigh: /^(left_leg_01|lthigh|l_thigh)$/, rThigh: /^(right_leg_01|rthigh|r_thigh)$/,
  lLeg: /^(left_leg_02|lleg|l_calf)$/, rLeg: /^(right_leg_02|rleg|r_calf)$/,
  lEar: /^(left_ear_01|left_ear|lear1?|l_ear1?)$/, rEar: /^(right_ear_01|right_ear|rear1?|r_ear1?)$/,
  lWing: /^(left_wing_a_01|left_wing_01|left_wing|l_?wing(1|a|a1)?)$/, rWing: /^(right_wing_a_01|right_wing_01|right_wing|r_?wing(1|a|a1)?)$/
};
const TAIL = /^tail(?:_?0*(\d+))?$/;
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
    uniforms: { tSrc: { value: null }, tDepth: { value: null }, outSize: { value: new THREE.Vector2(1, 1) }, mode: { value: 0 }, ow: { value: 1 }, edge: { value: new THREE.Vector3(...OUTLINE.map(v => v / 255)) }, levels: { value: RETRO.levels }, dTh: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // one output pixel = one SSxSS block of the render, averaged by a single bilinear fetch at the block centre
    fragmentShader: `
      uniform sampler2D tSrc; uniform sampler2D tDepth; uniform vec2 outSize; uniform int mode; uniform int ow; uniform vec3 edge;
      uniform float levels; uniform float dTh; varying vec2 vUv;
      vec2 at(vec2 o) { return (floor(vUv * outSize) + 0.5 + o) / outSize; }
      vec4 px(vec2 o) { return texture2D(tSrc, at(o)); }
      float dp(vec2 o) { return texture2D(tDepth, at(o)).r; }
      vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        const float TH = 110.0 / 255.0;
        vec4 c = px(vec2(0.0));
        if (mode == 1) { gl_FragColor = c.a >= 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(0.0); return; }
        if (c.a >= TH) {                                   // un-premultiply the edge blend, then a few levels per channel
          vec3 col = srgb(clamp(c.rgb / c.a, 0.0, 1.0));
          col = floor(col * (levels - 1.0) + 0.5) / (levels - 1.0);
          // an inner contour, like a sprite artist draws: on a pixel just behind a nearer part, a dark shade of its colour
          if (dTh > 0.0) {
            float n = min(min(dp(vec2(1.0, 0.0)), dp(vec2(-1.0, 0.0))), min(dp(vec2(0.0, 1.0)), dp(vec2(0.0, -1.0))));
            if (dp(vec2(0.0)) - n > dTh) col = col * 0.4 + edge * 0.3;
          }
          gl_FragColor = vec4(col, 1.0);
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
  gl.compileAsync(post, R.cam).catch(() => {});        // the reduction pass compiles in the background, not on the first draw
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

// one shadow-catching material for every stage: its shader is compiled once, and stays
let GROUND = null;
const groundMat = () => GROUND || (GROUND = new THREE.ShadowMaterial({ opacity: 1 }));

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
    const ground = this.ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 4, S * 4), groundMat());
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
    this.rt.depthTexture = new THREE.DepthTexture(fr.w * SS, fr.h * SS);   // read by the reduction pass (inner contours)
    this.rtS = new THREE.WebGLRenderTarget(fr.w * SS, fr.h * SS, rtOpts);
    const cv = () => { const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h; return c; };
    this.cv = cv(); this.cx = this.cv.getContext('2d');
    this.sh = cv(); this.shx = this.sh.getContext('2d');
    // what Retro draws, in its art pixels (the canvas may be finer: drawSprite scales it to w x h)
    const a = fr.art, frame = img => ({ frames: [{ img, dur: 1 }], total: 1, w: fr.w / a, h: fr.h / a, box: fr.box, bw: fr.bw, bh: fr.bh, foot: fr.foot, live: true });
    this.anim = frame(this.cv);
    this.shadow = frame(this.sh);
    this.renders = 0; this.last = -1e9; this.lastT = -1e9; this.urgent = true; this.contour = RETRO.inner;
  }
  pose() {}                                            // per render: subclasses apply their animation here
  // render this frame, reduced to the pixel grid, into slot x of the shared canvas (model, then its shadow beside it)
  draw(x) {
    const r = R, gl = r.gl, fr = this.fr;
    this.pose();
    this.pivot.updateMatrixWorld(true);
    // model, then its shadow on the ground (the model itself is hidden from the shadow pass by layers);
    // the shadow moves slowly, so it is re-rendered every other time
    const sh = this.renders++ % 2 === 0;
    this.cam.layers.set(0);
    gl.setRenderTarget(this.rt); gl.clear(); gl.render(this.scene, this.cam);
    if (sh) {
      gl.shadowMap.needsUpdate = true;
      this.cam.layers.set(1);
      gl.setRenderTarget(this.rtS); gl.clear(); gl.render(this.scene, this.cam);
    }
    gl.setRenderTarget(null);
    gl.setScissorTest(true);
    r.mat.uniforms.outSize.value.set(fr.w, fr.h);
    r.mat.uniforms.ow.value = this.ow;
    for (const [i, rt] of [[0, this.rt], [1, this.rtS]]) {
      gl.setViewport(x + i * fr.w, 0, fr.w, fr.h); gl.setScissor(x + i * fr.w, 0, fr.w, fr.h);
      gl.clear();
      r.mat.uniforms.tSrc.value = rt.texture; r.mat.uniforms.mode.value = i;
      r.mat.uniforms.tDepth.value = this.rt.depthTexture; r.mat.uniforms.dTh.value = i ? 0 : this.contour;
      gl.render(r.post, r.cam);
    }
    gl.setScissorTest(false);
  }
  // copy slot x of the shared canvas into the two canvases Retro draws
  copy(x) {
    const r = R, fr = this.fr, y = r.h - fr.h;           // viewport y counts from the bottom, canvas rows from the top
    this.cx.clearRect(0, 0, fr.w, fr.h); this.cx.drawImage(r.gl.domElement, x, y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    this.shx.clearRect(0, 0, fr.w, fr.h); this.shx.drawImage(r.gl.domElement, x + fr.w, y, fr.w, fr.h, 0, 0, fr.w, fr.h);
  }
  render() { renderAll([this]); }
  dispose() {
    this.rt.depthTexture.dispose(); this.rt.dispose(); this.rtS.dispose();
    this.ground.geometry.dispose();                     // its material is shared (and keeps its compiled shader)
    this.scene.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
    this.scene.clear();
  }
}

// ---------------------------------------------------------------------
//  Frame budget. Every live Pokémon on the field renders in one batch per frame: all of them draw side by side
//  into the shared canvas and are copied out after a single GPU flush (one read of the WebGL canvas per frame,
//  not two per Pokémon). When many are on the field, only as many as fit the time budget re-render each frame -
//  the longest-waiting first, and one whose action just started jumps the queue - the others keep their last
//  frame for a moment, so a crowded field gets choppier models instead of a slower game.
// ---------------------------------------------------------------------
const BUDGET_MS = 6;
let costPer = 1.5, frameNo = 0;                        // running average cost of one Pokémon (ms), frame counter
export function renderAll(list) {
  if (!list.length) return;
  const r = renderer();
  if (r.lost) return;
  frameNo++;
  // sprite-like stepping: a Pokémon gets a new frame RETRO.fps times a second, or at once when an action starts
  const now = performance.now(), due = list.filter(s => s.urgent || now - s.lastT >= 1000 / RETRO.fps - 2);
  if (!due.length) return;
  const n = Math.max(1, Math.min(due.length, Math.floor(BUDGET_MS / costPer)));
  const pick = due.length <= n ? due : due.sort((a, b) => (b.urgent - a.urgent) || (a.last - b.last)).slice(0, n);
  let w = 0, h = 0;
  for (const s of pick) { w += s.fr.w * 2; h = Math.max(h, s.fr.h); }
  // grown with headroom: resizing reallocates the drawing buffer, so it happens once or twice, not every time the batch grows
  if (r.w < w || r.h < h) { r.w = Math.max(r.w, Math.ceil(w * 1.5)); r.h = Math.max(r.h, Math.ceil(h * 1.25)); r.gl.setSize(r.w, r.h, false); }
  const t0 = performance.now();
  let x = 0;
  for (const s of pick) { s.draw(x); x += s.fr.w * 2; }
  x = 0;
  for (const s of pick) { s.copy(x); x += s.fr.w * 2; s.last = frameNo; s.lastT = now; s.urgent = false; }
  costPer += ((performance.now() - t0) / pick.length - costPer) * 0.1;
}
export const _tpl = species => preload(species).then(t => t && { quad: t.quad, procedural: t.procedural, h: t.h, clips: Object.keys(t.clips), rig: Object.fromEntries(Object.entries(t.rig).map(([k, r]) => [k, r.name + (r.side > 0 ? " +X" : " -X")])), tails: t.tails.map(r => r.name) });
export const _act = (name, dur, keys, hold) => (ACTIONS[name] = act(dur, keys, hold));   // tools/live3d-preview.html: try a pose
export const _renderStats = () => ({ costPer, frameNo, programs: R ? R.gl.info.programs.map(p => p.name) : [] });

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

// the model is drawn ~100 art pixels tall: small textures sampled nearest give flat colour areas like pixel art
// (and cost little GPU memory)
const shrinking = new WeakSet();
function shrink(t, max = RETRO.tex) {
  const im = t && t.image;
  if (!im || shrinking.has(t)) return;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  if (Math.max(im.width, im.height) <= max) return;
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
    const clips = {}, anims = gltf.animations;
    if (anims.length === 1 && GENERIC_IDLE.test(anims[0].name)) clips.idle = anims[0];
    else for (const [kind, rules] of Object.entries(CLIPS)) {
      for (const r of rules) { const c = anims.find(a => r.test(a.name)); if (c) { clips[kind] = c; break; } }
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
    const model = gltf.scene;
    // clips nothing plays (a single emote or attack): their first frame is a better rest pose than the bind pose
    if (!clips.idle && anims.length) {
      const mx = new THREE.AnimationMixer(model);
      mx.clipAction(anims[0]).play(); mx.update(0);
      const posed = [];
      model.traverse(o => posed.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
      mx.stopAllAction(); mx.uncacheRoot(model);        // stopping restores the bind pose: re-apply the sample
      for (const [o, p, q, s] of posed) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }
    }
    // in a holder: turned to face +Z (manifest "yaw"), and standing on the ground. Official models (an "origin"
    // bone) already stand over their origin; other rips are centred over it
    const scene = new THREE.Group();
    scene.add(model);
    if (e.yaw) model.rotation.y = e.yaw;
    if (!clips.idle) restPose(model, species);
    dropPedestal(scene);
    const b = extents(scene, 4);
    model.position.y -= b.y0;
    if (!model.getObjectByName('origin')) { model.position.x -= (b.x0 + b.x1) / 2; model.position.z -= (b.z0 + b.z1) / 2; }
    scene.updateMatrixWorld(true);
    // the bones procedural motion drives (by name: every copy finds its own), with their rest pose and the
    // orientation of their parent, so they turn around body axes (+X side, +Y up, +Z forward) whatever the rig
    const bones = [];
    scene.traverse(o => { if (o.isBone) bones.push(o); });
    const nm = b => b.name.toLowerCase(), alt = b => nm(b).replace(/_\d+$/, '');
    const prep = bone => { const wp = bone.parent.getWorldQuaternion(new THREE.Quaternion()); return { name: bone.name, rest: bone.quaternion.clone(), wp, wpInv: wp.clone().invert() }; };
    const rig = {};
    for (const [k, re] of Object.entries(BONES)) {
      const bone = bones.find(b => re.test(nm(b))) || bones.find(b => re.test(alt(b)));
      if (bone) rig[k] = prep(bone);
    }
    const tails = bones.map(b => [b, TAIL.exec(nm(b)) || TAIL.exec(alt(b))]).filter(([, m]) => m)
      .sort((a, b) => (+a[1][1] || 1) - (+b[1][1] || 1)).slice(0, 8).map(([b]) => prep(b));
    // which side each limb is on (+1: +X, the model's left), and whether the arms are front legs (a paw reaches the ground)
    const wp = new THREE.Vector3();
    for (const [k, r] of Object.entries(rig)) r.side = Math.sign(scene.getObjectByName(r.name).getWorldPosition(wp).x) || (k[0] === 'l' ? 1 : -1);
    let paw = Infinity;
    for (const k of ['lArm', 'rArm']) if (rig[k]) scene.getObjectByName(rig[k].name).traverse(o => { if (o.isBone) paw = Math.min(paw, o.getWorldPosition(wp).y); });
    const quad = paw < 0.15 * (b.y1 - b.y0);
    // without battle clips the attacks, hits and faints are procedural (and so is the idle without an idle clip)
    const tpl = { species, e, scene, clips, rig, tails, quad, procedural: !clips.attack, frame: null };
    tpl.frame = await framing(() => frameFor(tpl));
    await warm(tpl);
    return tpl;
  });
  TPL.set(species, pr);
  pr.catch(() => TPL.delete(species));
  return pr;
}

// shaders compiled and textures uploaded while the battle loads, not on the first frame the Pokémon is drawn in
// (compileAsync lets the driver compile in the background where it can: KHR_parallel_shader_compile)
async function warm(tpl) {
  const r = renderer();
  if (r.lost) return;
  const st = new Live(tpl);
  try {
    st.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) for (const t of [m.map, m.alphaMap, m.emissiveMap]) if (t) r.gl.initTexture(t); });
    // with the stage's render target bound: a shader drawing into a render target is a different program
    // (linear output) from one drawing to the canvas. The programs are chosen when called; the wait comes after
    r.gl.setRenderTarget(st.rt);
    const ready = r.gl.compileAsync(st.scene, st.cam);
    r.gl.setRenderTarget(null);
    await ready;
    // one real render of both passes into its own targets: geometry and bones uploaded, the shadow pass's depth
    // shaders (compiled once per session) built here and not when it is sent out
    st.pose(); st.pivot.updateMatrixWorld(true);
    r.gl.shadowMap.needsUpdate = true;
    for (const [layer, rt] of [[0, st.rt], [1, st.rtS]]) { st.cam.layers.set(layer); r.gl.setRenderTarget(rt); r.gl.render(st.scene, st.cam); }
    r.gl.setRenderTarget(null);
  } finally { st.dispose(); }
}
// every step-th vertex of every mesh in world space, skinned as posed (and every copy of an instanced mesh)
const _v = new THREE.Vector3(), _m4 = new THREE.Matrix4();
function eachVertex(meshes, step, fn) {
  for (const m of meshes) {
    const n = m.geometry.attributes.position.count, copies = m.isInstancedMesh ? m.count : 1;
    for (let c = 0; c < copies; c++) {
      if (m.isInstancedMesh) m.getMatrixAt(c, _m4);
      for (let i = 0; i < n; i += step) {
        m.getVertexPosition(i, _v);
        if (m.isInstancedMesh) _v.applyMatrix4(_m4);
        fn(_v.applyMatrix4(m.matrixWorld));
      }
    }
  }
}
const meshesOf = root => { const l = []; root.traverse(o => { if (o.isMesh) l.push(o); }); return l; };
function extents(root, step) {
  root.updateMatrixWorld(true);
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  eachVertex(meshesOf(root), step, p => {
    b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x); b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y); b.z0 = Math.min(b.z0, p.z); b.z1 = Math.max(b.z1, p.z);
  });
  return b;
}
// some rips stand on a display pedestal or a puddle (Meltan, Sobble), often merged into their mesh: a flat slab at
// the very bottom, wider than the Pokémon. Meshes are split into pieces by shared vertex positions; a piece that
// thin, that low and wider than everything standing above it is the stand, and its triangles are dropped
function dropPedestal(root) {
  const e = extents(root, 1), H = e.y1 - e.y0;
  if (!(H > 0)) return;
  const pieces = [], split = [];
  const boxOf = () => ({ x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity });
  root.traverse(m => {
    if (!m.isMesh) return;
    if (m.isSkinnedMesh || m.isInstancedMesh || m.geometry.groups.length) {   // kept whole; only its extent counts
      const b = boxOf();
      eachVertex([m], 4, p => { b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x); b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y); b.z0 = Math.min(b.z0, p.z); b.z1 = Math.max(b.z1, p.z); });
      pieces.push({ b });
      return;
    }
    const g = m.geometry, pos = g.attributes.position, n = pos.count;
    const idx = g.index ? g.index.array : null, tris = (idx ? idx.length : n) / 3, vi = k => idx ? idx[k] : k;
    // weld by position, then join the welded vertices of every triangle (union-find)
    const at = new Map(), id = new Int32Array(n), up = [], wx = new Float32Array(n), wy = new Float32Array(n), wz = new Float32Array(n);
    const find = a => { while (up[a] !== a) a = up[a] = up[up[a]]; return a; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) up[b] = a; };
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      wx[i] = _v.x; wy[i] = _v.y; wz[i] = _v.z;
      const k = `${Math.round(_v.x / H * 4000)},${Math.round(_v.y / H * 4000)},${Math.round(_v.z / H * 4000)}`;
      let w = at.get(k);
      if (w === undefined) { w = up.length; up.push(w); at.set(k, w); }
      id[i] = w;
    }
    for (let t = 0; t < tris; t++) { join(id[vi(3 * t)], id[vi(3 * t + 1)]); join(id[vi(3 * t)], id[vi(3 * t + 2)]); }
    // each piece's extent
    const box = new Map();
    for (let i = 0; i < n; i++) {
      const c = find(id[i]);
      let b = box.get(c);
      if (!b) box.set(c, b = boxOf());
      b.x0 = Math.min(b.x0, wx[i]); b.x1 = Math.max(b.x1, wx[i]); b.y0 = Math.min(b.y0, wy[i]); b.y1 = Math.max(b.y1, wy[i]); b.z0 = Math.min(b.z0, wz[i]); b.z1 = Math.max(b.z1, wz[i]);
    }
    const s = { m, n, tris, vi, id, find, drop: new Set() };
    split.push(s);
    for (const [c, b] of box) pieces.push({ b, s, c });
  });
  const width = b => Math.max(b.x1 - b.x0, b.z1 - b.z0);
  for (const p of pieces) {
    const b = p.b;
    if (!p.s || b.y1 - b.y0 > 0.2 * H || b.y0 > e.y0 + 0.02 * H) continue;
    let rest = 0;
    for (const q of pieces) if (q !== p && q.b.y1 > b.y1) rest = Math.max(rest, width(q.b));
    if (rest > 0 && width(b) > 1.1 * rest) p.s.drop.add(p.c);
  }
  for (const { m, n, tris, vi, id, find, drop } of split) {
    if (!drop.size) continue;
    const g = m.geometry;
    // a new geometry with only the kept triangles and their vertices (measuring walks every vertex)
    const remap = new Int32Array(n).fill(-1), used = [], index = [];
    for (let t = 0; t < tris; t++) {
      if (drop.has(find(id[vi(3 * t)]))) continue;
      for (let k = 0; k < 3; k++) { const i = vi(3 * t + k); if (remap[i] < 0) { remap[i] = used.length; used.push(i); } index.push(remap[i]); }
    }
    const out = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(g.attributes)) {
      const arr = new a.array.constructor(used.length * a.itemSize);
      const raw = a.isInterleavedBufferAttribute ? (i, c) => a.data.array[i * a.data.stride + a.offset + c] : (i, c) => a.array[i * a.itemSize + c];
      used.forEach((i, j) => { for (let c = 0; c < a.itemSize; c++) arr[j * a.itemSize + c] = raw(i, c); });
      out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
    }
    out.setIndex(index);
    m.geometry = out;
  }
}
// the Pokémon's types (data.js), for pose fixes
function typesOf(key) {
  const P = window.POKEDEX, sp = P && P.species[key.replace(/-mega.*$/, '')];
  if (!sp) return [];
  const m = sp.megas.find(m => m.name === key);
  return (m || sp).types;
}
// rips exported without animation stand in their bind pose: a T-pose. Their arms (extra pairs too) hang down
// instead - but not the wings of Flying types, which are arm bones on these rigs - and Sylveon's ribbons droop
function restPose(root, key) {
  const n = b => b.name.toLowerCase(), alt = b => n(b).replace(/_\d+$/, '');
  if (!typesOf(key).includes('Flying'))
    aimDown(root, b => /^(left|right)_arm_01$/.test(n(b)) || /^([lr]arm\d*|[lr]_upperarm)$/.test(alt(b)), 0.72, d => new THREE.Vector3(Math.sign(d.x) * 0.45, -0.85, 0.25));
  aimDown(root, b => /^[lr]feeler[a-z]\d$/.test(alt(b)), 0.6, d => new THREE.Vector3(Math.sign(d.x || 1) * 0.35, -0.8, -0.5), 0.85);
  // legless serpents modelled standing straight up (Dratini, Milotic, Serperior): head raised, tail coiled on the ground
  const bones = [];
  root.traverse(o => { if (o.isBone) bones.push(o); });
  const is = (re, b) => re.test(n(b)) || re.test(alt(b));
  const tailNo = b => +(TAIL.exec(n(b)) || TAIL.exec(alt(b)))[1] || 1;
  const tails = bones.filter(b => is(TAIL, b)).sort((a, b) => tailNo(a) - tailNo(b));
  const legs = bones.some(b => is(BONES.lThigh, b));
  const e = extents(root, 6), w = Math.max(e.x1 - e.x0, e.z1 - e.z0);
  if (!legs && tails.length >= 3 && e.y1 - e.y0 > 2.2 * w) {
    tails.forEach((b, i) => aimBone(b, () => new THREE.Vector3(Math.sin(i * 0.9 + 0.5) * 0.7, i === 0 ? -0.9 : -0.04, -1), 1));
    const sp = bones.find(b => is(BONES.spine, b)) || bones.find(b => is(BONES.chest, b));
    if (sp) aimBone(sp, () => new THREE.Vector3(0, 1, 0.45), 1);
  }
}
const aimBone = (b, dir, amount) => aimDown(b.parent, o => o === b, 2, dir, amount);
// turn each matching bone around its own pivot so it points toward dir(current direction), unless it already
// points down more than `hang` (rotation in world space: rigs with mirrored parents work too)
function aimDown(root, test, hang, dir, amount = 0.8) {
  root.updateMatrixWorld(true);
  const bones = [];
  root.traverse(o => { if (o.isBone && test(o)) bones.push(o); });
  const p = new THREE.Vector3(), c = new THREE.Vector3(), m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), m3 = new THREE.Matrix4();
  for (const b of bones) {
    const ch = b.children.find(o => o.isBone);
    if (!ch) continue;
    b.getWorldPosition(p); ch.getWorldPosition(c);
    const d = c.sub(p);
    if (d.lengthSq() < 1e-12) continue;
    d.normalize();
    if (Math.abs(d.y) > hang) continue;
    const q = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(d, dir(d).normalize()), amount);
    m1.makeTranslation(p.x, p.y, p.z).multiply(m2.makeRotationFromQuaternion(q)).multiply(m3.makeTranslation(-p.x, -p.y, -p.z));
    const local = m2.copy(b.parent.matrixWorld).invert().multiply(m1.multiply(b.matrixWorld));
    local.decompose(b.position, b.quaternion, b.scale);
    b.updateMatrixWorld(true);
  }
}
// framing measures every pose of every clip on the CPU (tens of ms): one model at a time, yielding in between,
// so loading a team during the intro never freezes a frame for long
let FQ = Promise.resolve();
function framing(fn) {
  const p = FQ.then(() => new Promise(r => setTimeout(r, 0))).then(fn);
  FQ = p.catch(() => {});
  return p;
}

// models of earlier battles: kept for a quick rematch, but at most KEEP of them (GPU memory)
const KEEP = 16;
export function trim(inUse) {
  for (const [sp, pr] of TPL) {
    if (TPL.size <= KEEP) break;
    if (inUse.has(sp)) continue;
    TPL.delete(sp);
    pr.then(tpl => tpl && tpl.scene.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const m of [].concat(o.material)) { for (const t of [m.map, m.alphaMap, m.emissiveMap]) if (t) t.dispose(); m.dispose(); }
    })).catch(() => {});
  }
}

// Framing, computed once per species: every pose of every battle clip at any yaw. The standing pose sets the
// art-pixel scale (heightPx tall, like the sprite sizes), so a tail swinging in one clip never shrinks the character.
function frameFor(tpl) {
  const root = SkeletonUtils.clone(tpl.scene);
  const mixer = new THREE.AnimationMixer(root);
  const meshes = meshesOf(root);
  let r = 0, y0 = Infinity, y1 = -Infinity;
  // every 3rd vertex: the outline pass and a margin cover what the sampling misses
  const each = fn => { root.updateMatrixWorld(true); eachVertex(meshes, 3, fn); };
  const pose = (clip, t) => { mixer.stopAllAction(); if (clip) { const a = mixer.clipAction(clip); a.reset().play(); mixer.setTime(t); } };
  const grow = p => { r = Math.max(r, Math.hypot(p.x, p.z)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); };
  for (const clip of new Set(Object.values(tpl.clips))) for (let k = 0; k < 5; k++) { pose(clip, clip.duration * k / 4 * 0.999); each(grow); }
  if (!Object.keys(tpl.clips).length) each(grow);
  // the standing pose: its height and half width (procedural motion is scaled by them)
  pose(tpl.clips.idle, 0);
  let hx = 0, hy = 0;
  each(p => { hx = Math.max(hx, Math.abs(p.x)); hy = Math.max(hy, p.y); });
  tpl.h = hy; tpl.hw = hx;
  // procedural motion hops, rears up and topples over onto its side when it faints: room for all of it
  if (tpl.procedural) { r = Math.max(r * 1.12 + 0.16 * hy, y1 * 1.02); y1 *= 1.2; }   // (+ the forward lunge of a strike)
  // ...as the camera sees it, turned toward the foe
  root.rotation.y = -YAW;
  const s = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  each(p => { const sy = p.y * ce - p.z * se; s.x0 = Math.min(s.x0, p.x); s.x1 = Math.max(s.x1, p.x); s.y0 = Math.min(s.y0, sy); s.y1 = Math.max(s.y1, sy); });
  mixer.stopAllAction(); mixer.uncacheRoot(root);
  // heightPx is the standing height; long or wide bodies (serpents, crescent wings) are sized partly by their width
  return cell({ r: r * 1.03, y0, y1, s, unit: tpl.e.heightPx / Math.max(1e-6, s.y1 - s.y0, (s.x1 - s.x0) * 0.45), art: 1 });
}

// =====================================================================
//  PROCEDURAL ACTIONS
//  Models without battle clips act through key poses, the way a sprite animator
//  draws key frames: anticipation, contact, follow-through. Every move gets the
//  body action of its style in Retro's move table - a punch throws the lead arm,
//  a kick swings a leg, a bite rears back and snaps the jaw, a beam rears back
//  and fires from the mouth, Protect braces behind crossed arms. A pose is a set
//  of channels (radians; hop and shift in body heights):
//    body  lean (+ forward), twist (+ brings the lead side forward), roll, hop,
//          shift (forward), squash (+ flatter), crouch
//    head  chest (+ chest out), head (+ up), headYaw, jaw (0-1)
//    arms  la* lead arm, ba* back arm: Up (+ raises it forward), Out (+ away from
//          the body, - across it), Bend (elbow)
//    legs  ll* lead leg, bl* back leg: Up (+ swings it forward), Bend (knee)
//    tail  tail (+ lifts), tailSwing (sideways), wing (spread), flap
//  A model without some bones drops their channels; one without a skeleton
//  keeps the body channels.
// =====================================================================
const smooth = k => k * k * (3 - 2 * k);
// an action: length (s), key poses at fractions of it; it starts and ends in the neutral pose unless `hold`
const act = (dur, keys, hold = false) => {
  const k = [[0, {}], ...keys];
  if (k[k.length - 1][0] < 1) k.push([1, hold ? k[k.length - 1][1] : {}]);
  return { dur, keys: k, hold };
};
const strike = { twist: 0.45, lean: 0.55, shift: 0.14, squash: -0.06, laUp: 1.75, laOut: -0.2, laBend: 0, baUp: -0.4, baBend: 1.3, llUp: 0.45, llBend: 0.2, blUp: -0.35, blBend: 0.3, head: 0.05 };
const guard = { crouch: 0.4, lean: 0.15, head: -0.35, laUp: 0.9, baUp: 0.9, laOut: -0.9, baOut: -0.9, laBend: 1.7, baBend: 1.7, llBend: 0.4, blBend: 0.4, wing: 0.8, squash: 0.06 };
const flex = { chest: 0.35, head: 0.35, laUp: 1.5, baUp: 1.5, laOut: 0.9, baOut: 0.9, laBend: 2, baBend: 2, jaw: 0.6 };
const roar = { head: 0.72, jaw: 0.95, lean: -0.28, chest: 0.32, laOut: 0.8, baOut: 0.8, laUp: 0.6, baUp: 0.6, wing: 1, tail: 0.4 };
const down = { roll: 1.42, head: -0.45, jaw: 0.45, laOut: 0.5, baOut: 0.4, llBend: 0.6, blBend: 0.3, crouch: 0.2 };
const ACTIONS = {
  // physical
  punch: act(0.55, [[0.3, { twist: -0.5, lean: -0.1, crouch: 0.35, laUp: -0.5, laBend: 1.6, baUp: 0.4, baBend: 1, llUp: 0.2, blUp: -0.2, blBend: 0.4, head: -0.1 }], [0.45, strike], [0.62, strike]]),
  chop: act(0.55, [[0.3, { twist: -0.25, lean: -0.2, crouch: 0.2, laUp: 2.7, laOut: 0.2, laBend: 0.6, baUp: 0.3, head: 0.15 }], [0.45, { twist: 0.3, lean: 0.45, shift: 0.08, laUp: 0.6, baUp: -0.3, crouch: 0.25, head: -0.15 }], [0.62, { twist: 0.3, lean: 0.4, shift: 0.08, laUp: 0.5, crouch: 0.2 }]]),
  slash: act(0.55, [[0.3, { twist: -0.4, lean: -0.15, laUp: 2.2, laOut: 0.7, laBend: 0.5, baUp: 0.3, crouch: 0.2 }], [0.42, { twist: 0.55, lean: 0.4, shift: 0.08, laUp: 0.5, laOut: -0.7, laBend: 0.2, baUp: -0.2 }], [0.6, { twist: 0.5, lean: 0.3, shift: 0.06, laUp: 0.3, laOut: -0.8 }]]),
  cross: act(0.55, [[0.3, { lean: -0.2, crouch: 0.2, laUp: 2.3, laOut: 0.8, baUp: 2.3, baOut: 0.8 }], [0.42, { lean: 0.45, shift: 0.08, laUp: 0.8, laOut: -0.8, baUp: 0.8, baOut: -0.8 }], [0.6, { lean: 0.35, shift: 0.06, laUp: 0.6, laOut: -0.9, baUp: 0.6, baOut: -0.9 }]]),
  kick: act(0.6, [[0.3, { lean: -0.1, crouch: 0.25, twist: -0.15, llUp: 0.6, llBend: 1.6, laOut: 0.5, baOut: 0.5 }], [0.45, { lean: -0.35, twist: 0.2, shift: 0.05, llUp: 1.7, llBend: 0.05, blBend: 0.35, laUp: 0.3, laOut: 0.7, baOut: 0.6 }], [0.62, { lean: -0.3, twist: 0.2, shift: 0.05, llUp: 1.6, blBend: 0.35, laOut: 0.7, baOut: 0.6 }]]),
  buck: act(0.6, [[0.3, { lean: -0.25, crouch: 0.3, head: 0.2 }], [0.45, { lean: 0.45, hop: 0.06, head: -0.3, llUp: -1, blUp: -1, llBend: 0.2, blBend: 0.2, tail: 0.5 }], [0.62, { lean: 0.4, hop: 0.04, head: -0.25, llUp: -0.9, blUp: -0.9 }]]),
  bite: act(0.6, [[0.32, { lean: -0.35, head: 0.45, jaw: 1, chest: 0.2, crouch: 0.2, laUp: 0.3, baUp: 0.3 }], [0.46, { lean: 0.6, shift: 0.12, head: -0.3, jaw: 0, squash: -0.08, laUp: -0.2, baUp: -0.2 }],
    [0.56, { lean: 0.55, shift: 0.11, head: -0.25, headYaw: 0.35, jaw: 0.1 }], [0.66, { lean: 0.5, shift: 0.1, head: -0.25, headYaw: -0.35 }], [0.76, { lean: 0.4, shift: 0.08, head: -0.2, headYaw: 0.15 }]]),
  tailwhip: act(0.7, [[0.3, { twist: -0.7, crouch: 0.2, lean: 0.1, tail: 0.4, tailSwing: -0.6 }], [0.5, { twist: 2.4, lean: 0.15, hop: 0.04, tail: 0.5, tailSwing: 0.9 }], [0.75, { twist: 6.28, tailSwing: 0.2 }], [1, { twist: 6.28 }]]),
  spin: act(0.65, [[0.15, { crouch: 0.25, laOut: 0.8, baOut: 0.8 }], [0.85, { twist: 6.28, hop: 0.05, laOut: 1, baOut: 1 }], [1, { twist: 6.28 }]]),
  tackle: act(0.55, [[0.3, { lean: -0.25, crouch: 0.45, head: -0.15, laUp: -0.6, baUp: -0.6, laBend: 0.6, baBend: 0.6, llUp: 0.3, blUp: -0.3 }], [0.45, { lean: 0.75, shift: 0.14, squash: -0.12, head: -0.45, laUp: -0.9, baUp: -0.9, llUp: 0.6, blUp: -0.7, blBend: 0.1, tail: 0.3 }],
    [0.62, { lean: 0.7, shift: 0.13, squash: -0.1, head: -0.4, laUp: -0.8, baUp: -0.8, llUp: 0.5, blUp: -0.6 }]]),
  slam: act(0.6, [[0.3, { hop: 0.22, lean: -0.25, squash: -0.1, head: 0.2, laUp: 2.4, baUp: 2.4, llBend: 0.6, blBend: 0.6 }], [0.45, { lean: 0.45, squash: 0.22, crouch: 0.4, head: -0.3, laUp: 0.6, baUp: 0.6 }], [0.62, { lean: 0.35, squash: 0.12, crouch: 0.3 }]]),
  wingstrike: act(0.55, [[0.3, { wing: 1, flap: 0.6, lean: -0.2, hop: 0.05, laUp: 0.6, baUp: 0.6, laOut: 1.2, baOut: 1.2 }], [0.45, { wing: 0.4, flap: -0.8, lean: 0.5, shift: 0.1, laUp: 1.4, baUp: 1.4, laOut: -0.2, baOut: -0.2 }], [0.62, { wing: 0.4, flap: -0.6, lean: 0.4, shift: 0.08, laUp: 1.2, baUp: 1.2 }]]),
  clap: act(0.55, [[0.3, { lean: -0.1, laUp: 1, baUp: 1, laOut: 1.3, baOut: 1.3 }], [0.42, { lean: 0.25, shift: 0.05, laUp: 1.2, baUp: 1.2, laOut: -0.4, baOut: -0.4 }], [0.6, { lean: 0.2, shift: 0.04, laUp: 1.2, baUp: 1.2, laOut: -0.4, baOut: -0.4 }]]),
  // special: gather (rear back), release, hold while it fires
  breath: act(0.75, [[0.35, { lean: -0.35, head: 0.55, chest: 0.3, jaw: 0.5, crouch: 0.15, laUp: 0.4, baUp: 0.4, laOut: 0.5, baOut: 0.5 }], [0.45, { lean: 0.25, shift: 0.04, head: -0.05, chest: -0.1, jaw: 1, laUp: -0.2, baUp: -0.2 }], [0.85, { lean: 0.3, shift: 0.05, head: -0.05, jaw: 1 }]]),
  cast: act(0.75, [[0.35, { lean: -0.15, hop: 0.05, head: 0.35, laUp: 2.4, baUp: 2.4, laOut: 0.4, baOut: 0.4 }], [0.48, { lean: 0.25, shift: 0.05, head: 0.05, laUp: 1.5, baUp: 1.5, laOut: 0.1, baOut: 0.1 }], [0.85, { lean: 0.25, shift: 0.05, laUp: 1.5, baUp: 1.5, laOut: 0.1, baOut: 0.1 }]]),
  zap: act(0.75, [[0.3, { crouch: 0.4, squash: 0.12, head: -0.2, laOut: 0.3, baOut: 0.3 }], [0.45, { squash: -0.12, hop: 0.05, head: 0.5, jaw: 1, laUp: 2.2, baUp: 2.2, laOut: 0.9, baOut: 0.9, wing: 1 }], [0.85, { head: 0.45, jaw: 0.8, twist: 0.08, laUp: 2.1, baUp: 2.1, laOut: 1, baOut: 1, wing: 1 }]]),
  stomp: act(0.7, [[0.3, { hop: 0.2, lean: -0.2, squash: -0.1, llUp: 1, llBend: 1.2, laUp: 1.8, baUp: 1.8 }], [0.42, { squash: 0.25, crouch: 0.45, lean: 0.25, head: -0.2, laUp: 0.3, baUp: 0.3, laOut: 0.6, baOut: 0.6 }], [0.7, { crouch: 0.3, squash: 0.1, lean: 0.15 }]]),
  sweep: act(0.75, [[0.3, { twist: -0.6, lean: -0.15, laUp: 1.2, laOut: 1.2, baUp: 0.5, wing: 1 }], [0.55, { twist: 0.6, lean: 0.3, shift: 0.05, laUp: 1, laOut: -0.6, baOut: 0.6, wing: 0.3, flap: -0.6 }], [0.8, { twist: 0.4, lean: 0.2 }]]),
  roar: act(0.85, [[0.2, { crouch: 0.3, head: -0.25, lean: 0.1 }], [0.35, { ...roar, squash: -0.06 }], [0.8, roar]]),
  // status
  guard: act(1.2, [[0.15, guard], [0.85, guard]]),
  flex: act(0.9, [[0.25, { crouch: 0.4, squash: 0.1, head: -0.2, laUp: 0.5, baUp: 0.5, laBend: 1.6, baBend: 1.6 }], [0.45, { ...flex, squash: -0.1, hop: 0.04 }], [0.8, flex]]),
  heal: act(0.9, [[0.4, { head: 0.5, chest: 0.2, hop: 0.05, laUp: 2.4, baUp: 2.4, laOut: 0.5, baOut: 0.5, wing: 0.8 }], [0.8, { head: 0.45, chest: 0.2, laUp: 2.3, baUp: 2.3, laOut: 0.5, baOut: 0.5, wing: 0.8 }]]),
  point: act(0.7, [[0.3, { twist: 0.25, lean: 0.15, shift: 0.04, head: 0.15, laUp: 1.6, laBend: 0.1 }], [0.75, { twist: 0.25, lean: 0.15, shift: 0.04, head: 0.15, laUp: 1.6, laBend: 0.1 }]]),
  // reactions
  hurt: act(0.42, [[0.12, { lean: -0.6, head: 0.55, twist: -0.3, squash: 0.15, shift: -0.06, jaw: 0.6, laUp: 0.8, baUp: 0.8, laOut: 0.8, baOut: 0.8, llBend: 0.4, blBend: 0.4 }], [0.4, { lean: -0.35, head: 0.3, twist: 0.15, shift: -0.04, laUp: 0.4, baUp: 0.4, laOut: 0.5, baOut: 0.5 }]]),
  stun: act(0.6, [[0.1, { lean: -0.7, head: 0.6, twist: -0.4, squash: 0.18, shift: -0.08, jaw: 0.8, laUp: 1, baUp: 1, laOut: 1, baOut: 1, llBend: 0.5, blBend: 0.5 }], [0.5, { lean: -0.3, head: -0.2, crouch: 0.3, laOut: 0.6, baOut: 0.6 }]]),
  recover: act(0.45, [[0.25, { crouch: 0.2, headYaw: 0.4 }], [0.5, { headYaw: -0.4 }], [0.75, { hop: 0.04, headYaw: 0.2 }]]),
  win: act(1.1, [[0.15, { crouch: 0.35 }], [0.3, { hop: 0.16, squash: -0.1, head: 0.45, jaw: 0.8, laUp: 2.7, baUp: 2.7, laOut: 0.4, baOut: 0.4, wing: 1 }], [0.45, { crouch: 0.25, squash: 0.1, laUp: 2.5, baUp: 2.5 }],
    [0.6, { hop: 0.14, head: 0.45, jaw: 0.8, laUp: 2.7, baUp: 2.7, wing: 1 }], [0.8, { head: 0.3, laUp: 2.4, baUp: 2.4 }]]),
  down: act(0.8, [[0.2, { lean: -0.35, head: 0.4, jaw: 0.8, squash: 0.08, laOut: 0.6, baOut: 0.6 }], [0.65, down], [0.8, { ...down, roll: 1.3 }], [1, down]], true)
};
// Retro's move styles (classify() / the contact table in retro.js) -> the action that shows them
const STYLE = {
  fist: 'punch', palm: 'punch', bone: 'punch', chop: 'chop', claw: 'slash', blade: 'slash', x: 'cross', kick: 'kick', fang: 'bite', tongue: 'bite',
  tail: 'tailwhip', spin: 'spin', charge: 'tackle', slam: 'slam', wing: 'wingstrike', clap: 'clap',
  stream: 'breath', beam: 'breath', 'orb:big': 'breath', orb: 'cast', multi: 'cast', drain: 'cast', vortex: 'cast', bolt: 'zap', sky: 'zap',
  quake: 'stomp', rockslide: 'stomp', spikes: 'stomp', geyser: 'stomp', wave: 'sweep', wind: 'sweep', sound: 'roar',
  shield: 'guard', buff: 'flex', heal: 'heal'
};
// four-legged: arm actions become a pounce of the front paws, a kick bucks the hind legs
const QUAD = { kick: 'buck', chop: 'slash', cross: 'slash', clap: 'slash', cast: 'breath', heal: 'roar', flex: 'roar' };
// the pose of an action t seconds in: eased between its key poses
function sample(a, t, out) {
  const q = Math.min(1, t / a.dur), k = a.keys;
  let i = 0;
  while (i < k.length - 2 && q > k[i + 1][0]) i++;
  const [t0, p0] = k[i], [t1, p1] = k[i + 1], m = smooth(Math.min(1, (q - t0) / Math.max(1e-6, t1 - t0)));
  for (const c in p0) out[c] = (out[c] || 0) + p0[c] * (1 - m);
  for (const c in p1) out[c] = (out[c] || 0) + p1[c] * m;
  return out;
}
// turn a bone by (x, y, z) around body axes, on top of the pose it already has
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
function drv(r, x, y, z) {
  if (!r || (!x && !y && !z)) return;
  _e.set(x, y, z);
  _q.setFromEuler(_e);
  r.bone.quaternion.premultiply(_q2.copy(r.wpInv).multiply(_q).multiply(r.wp));
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
    // procedural motion: this copy's own bones, found by the template's names
    const find = r => { const bone = this.root.getObjectByName(r.name); return bone && bone.isBone ? { ...r, bone } : null; };
    this.rig = {};
    for (const [k, r] of Object.entries(tpl.rig)) { const b = find(r); if (b) this.rig[k] = b; }
    this.tails = tpl.tails.map(find).filter(Boolean);
    this.driven = [...Object.values(this.rig), ...this.tails];
    this.fx = null; this.procOn = false; this.walk = 0; this.hopT = 0; this.acc = 0; this.s = {}; this.lead = 'r';
    this.clock = Math.random() * 10; this.phase = Math.random() * 6.28;
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
  // a battle action: attack / special / roar (status moves too) with Retro's move style, or hurt, stun, recover,
  // guard, win, down. A model's own clip plays when it has one; otherwise the procedural action of the style
  play(kind, style) {
    if (this.down && kind !== 'down') return false;
    this.urgent = true;
    let name = { attack: 'tackle', special: 'cast', roar: style && style !== 'sound' ? 'point' : 'roar' }[kind] || kind;
    if (STYLE[style] && (kind === 'attack' || kind === 'special' || kind === 'roar' || kind === 'guard')) name = STYLE[style];
    if (this.tpl.quad && QUAD[name]) name = QUAD[name];
    let clip = kind === 'guard' ? null : kind;
    if (clip === 'stun' && !this.act.stun && this.act.hurt) clip = 'hurt';
    if (clip === 'special' && !this.act.special && this.act.attack) clip = 'attack';
    const a = clip && this.act[clip];
    if (!a) {                                            // no clip for it: procedural
      if (!ACTIONS[name]) return false;
      this.lead = this.nearSide();                     // strike with the side toward the camera: drawn in front
      this.fx = { a: ACTIONS[name], t: 0, name, side: kind === 'attack' || kind === 'special' };
      if (kind === 'down') this.down = true;
      return true;
    }
    kind = clip;
    const from = this.shot || this.base;
    a.reset(); a.timeScale = SPEED[kind] || 1; a.setEffectiveWeight(1); a.play();
    if (from && from !== a) a.crossFadeFrom(from, FADE[kind] || 0.08, false);
    this.shot = a; this.shotKind = kind;
    if (kind === 'down') this.down = true;
    return true;
  }
  // the arm / leg side facing the camera (+X faces it when the Pokémon faces left)
  nearSide() {
    const near = this.yaw < 0 ? 1 : -1, R = this.rig;
    for (const sd of ['l', 'r']) { const b = R[sd + 'Arm'] || R[sd + 'Thigh']; if (b && b.side === near) return sd; }
    return near > 0 ? 'l' : 'r';
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
  // per frame, from the fighter's state in Retro: s = { face, vx, vy, moving, sleep, frozen, slow, stagger }.
  // Cheap bookkeeping only; the animation itself is applied in pose(), when this Pokémon is actually re-rendered
  drive(dt, s) {
    // dazed until the stagger ends, then the recovery clip
    if (this.shotKind === 'stunLoop' && !s.stagger && !this.play('recover')) this.toBase(0.15);
    this.setBase(s.sleep && this.act.sleep ? 'sleep' : s.moving ? 'move' : 'idle');
    // facing: toward the foe in a 3/4 view (a turn passes through the camera); running, toward where it runs
    const acting = (this.fx && this.fx.side) || this.shotKind === 'attack' || this.shotKind === 'special';
    let target = s.face * (acting ? YAW_ACT : YAW);
    if ((s.run ?? s.moving) && !this.shot && Math.hypot(s.vx, s.vy) > 60) target = Math.atan2(s.vx, s.vy / 0.6);
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * (this.shot ? 18 : 10));
    // shown at one of a few fixed angles, like sprite turns; it moves to the next one only once the turn is well past
    // the midpoint, so a facing near a boundary never flickers between two
    const turn = 2 * Math.PI / RETRO.turns;
    if (!RETRO.turns) this.pivot.rotation.y = this.yaw;
    else {
      if (this.snap == null || Math.abs(Math.atan2(Math.sin(this.yaw - this.snap * turn), Math.cos(this.yaw - this.snap * turn))) > turn * 0.7) this.snap = Math.round(this.yaw / turn);
      this.pivot.rotation.y = this.snap * turn;
    }
    const k = s.frozen ? 0 : s.slow ? 0.5 : 1;
    this.s = s; this.acc += dt * k; this.clock += dt * k;
    if (this.fx) { this.fx.t += dt * k; if (this.fx.t >= this.fx.a.dur && !this.fx.a.hold) this.fx = null; }
    // walking without a run clip: a procedural gait, its pace from the running speed
    this.walk += ((s.moving && !this.act.move ? 1 : 0) - this.walk) * Math.min(1, dt * 8);
    // stepping back while it keeps facing the foe: the gait runs in reverse (no moonwalking)
    const vx = s.vx || 0, vz = (s.vy || 0) / 0.6, sp = Math.hypot(vx, vz);
    this.backStep = sp > 30 && (vx * Math.sin(this.yaw) + vz * Math.cos(this.yaw)) / sp < -0.3;
    this.hopT += dt * k * (7 + Math.min(9, Math.hypot(s.vx || 0, s.vy || 0) / 40)) * this.walk * (this.backStep ? -1 : 1);
  }
  pose() {
    const on = this.tpl.procedural || this.fx || this.walk > 0.01;
    // driven bones start from their rest pose; the clips then set the ones they animate, procedural motion adds to that
    if (on || this.procOn) for (const r of this.driven) r.bone.quaternion.copy(r.rest);
    this.mixer.update(this.acc); this.acc = 0;
    if (on) this.motion();
    else if (this.procOn) { this.inner.position.set(0, 0, 0); this.inner.rotation.set(0, 0, 0); this.inner.scale.set(1, 1, 1); }
    this.procOn = on;
  }
  // procedural motion: the action's pose, plus walking, breathing and idle life, applied to the body and to
  // whatever bones the rig has
  motion() {
    const s = this.s, t = this.clock, idle = !!this.act.idle, R = this.rig, tpl = this.tpl;
    const P = this.fx ? sample(this.fx.a, this.fx.t, {}) : {}, g = c => P[c] || 0;
    // which side strikes: the lead arm / leg channels go to it, the back ones to the other side
    const lead = this.lead, back = lead === 'l' ? 'r' : 'l';
    const A = { [lead]: 'la', [back]: 'ba' }, Lg = { [lead]: 'll', [back]: 'bl' };
    const leadSide = (R[lead + 'Arm'] || R[lead + 'Thigh'] || { side: lead === 'l' ? 1 : -1 }).side;
    let twist = -g('twist') * leadSide, lean = g('lean'), hop = g('hop'), crouch = g('crouch'), squash = g('squash'), head = g('head');
    if (s.stagger && !this.down) twist += 0.18 * Math.sin(t * 13);   // dazed wobble
    if (s.sleep && !this.act.sleep) { head -= 0.6; crouch += 0.5; }
    // gait: the legs in opposition; each arm swings with the opposite leg (four-legged: the diagonal pairs step together)
    const w = this.walk, ph = this.hopT, legs = !!(R.lThigh || R.rThigh), step = { l: Math.sin(ph) * w, r: -Math.sin(ph) * w };
    if (w > 0.01) { hop += Math.abs(Math.sin(ph)) * w * (legs ? 0.03 : 0.08); lean += (this.backStep ? -0.12 : tpl.quad ? 0.05 : 0.14) * w; }
    const breathe = idle ? 0 : Math.sin(t * 2.4 + this.phase);   // the idle clip breathes by itself
    if (!idle) { squash += breathe * 0.012; if (!legs && !R.spine) hop += (0.5 + 0.5 * Math.sin(t * 2.4 + this.phase)) * 0.015; }
    // body; a roll tips away from the camera whichever way it faces, and rests it on its side, not inside the ground
    const H = tpl.h, spine = R.spine || R.chest, roll = g('roll');
    const rs = -(Math.sign(Math.sin(this.yaw)) || 1);
    this.inner.position.set(0, hop * H + Math.sin(Math.abs(roll)) * tpl.hw * 0.6, g('shift') * H);
    // the whole body carries most of a lean / twist (small or round bodies show little bending at the spine), the spine the rest
    this.inner.rotation.set(lean * (spine ? 0.28 : 0.4) - crouch * 0.05, twist * (spine ? 0.8 : 1), roll * rs);
    const sy = 1 + squash - crouch * 0.08, sx = 1 / Math.sqrt(sy);
    this.inner.scale.set(sx, sy, sx);
    if (!this.driven.length) return;
    drv(R.spine, lean * 0.32 - crouch * 0.15 + breathe * 0.02, twist * 0.35, 0);
    drv(R.chest, lean * 0.2 - g('chest') * 0.4 + breathe * 0.015, 0, 0);
    drv(R.neck, lean * 0.1 - head * 0.35, g('headYaw') * 0.4, 0);
    drv(R.head, -head * 0.45 + (idle ? 0 : Math.sin(t * 1.3) * 0.04), g('headYaw') * 0.6 + (idle ? 0 : Math.sin(t * 0.7) * 0.12 * (1 - Math.min(1, Math.abs(lean)))), 0);
    drv(R.jaw, g('jaw') * 0.5, 0, 0);
    for (const sd of ['l', 'r']) {
      const a = A[sd], l = Lg[sd], arm = R[sd + 'Arm'], swing = -step[sd] * (tpl.quad ? 0.55 : 0.4);
      if (arm) {
        drv(arm, -(g(a + 'Up') + swing + breathe * 0.04), 0, g(a + 'Out') * arm.side);
        // the elbow bends forward; a front leg folds back as it steps
        drv(R[sd + 'Fore'], -g(a + 'Bend') + (tpl.quad ? Math.max(0, swing) * 0.9 : -Math.abs(swing) * 0.3), 0, 0);
      }
      if (R[sd + 'Thigh']) {
        drv(R[sd + 'Thigh'], -(g(l + 'Up') + step[sd] * 0.55) - crouch * 0.5, 0, 0);
        drv(R[sd + 'Leg'], g(l + 'Bend') + Math.max(0, step[sd]) * 0.7 + crouch * 0.9, 0, 0);   // the knee bends as the leg swings through
      }
    }
    const tw = idle ? 0.3 : 1, tl = g('tail'), ts = g('tailSwing');
    this.tails.forEach((r, i) => drv(r, -tl * 0.3 + Math.sin(t * 1.8 - i * 0.5) * 0.04 * tw, ts * 0.3 + Math.sin(t * 2.2 - i * 0.7) * (0.1 * tw + w * 0.14 + Math.min(1, Math.abs(lean)) * 0.1), 0));
    const twitch = !idle && Math.max(0, Math.sin(t * 0.9 + this.phase)) > 0.97 ? Math.sin(t * 40) * 0.15 : 0;
    drv(R.lEar, 0, 0, twitch); drv(R.rEar, 0, 0, -twitch);
    const flap = (idle ? 0 : Math.sin(t * 5) * 0.25) + g('wing') * 0.7 + g('flap') + w * Math.sin(ph) * 0.3;
    for (const k of ['lWing', 'rWing']) if (R[k]) drv(R[k], 0, 0, flap * R[k].side);
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
