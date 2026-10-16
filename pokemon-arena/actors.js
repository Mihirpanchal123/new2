'use strict';
// =====================================================================
//  POKÉMON ACTORS — animated 3D models, procedural rig, roaming,
//  camera director and battle choreography
// =====================================================================
const V3 = THREE.Vector3, Quat = THREE.Quaternion;
const gltfLoader = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('lib/addons/libs/draco/gltf/');
gltfLoader.setDRACOLoader(dracoLoader);
const gltfCache = new Map();
const loadGLTF = file => {
  if (!gltfCache.has(file)) gltfCache.set(file, gltfLoader.loadAsync(file));
  return gltfCache.get(file);
};

// Model lookup: Mega forms without their own model fall back to the base species
function modelInfo(key) {
  const M = window.MODELS || {};
  if (M[key] && M[key].file) return { ...M[key], megaFallback: false };
  const base = key.replace(/-mega.*$/, '');
  if (M[base] && M[base].file) return { ...M[base], height: (M[key] && M[key].height) || M[base].height, megaFallback: key !== base };
  return null;
}
World.preload = keys => keys.forEach(k => { const m = modelInfo(k); if (m) loadGLTF(m.file).catch(() => {}); });

// Bone names: Game Freak rigs (LArm, LForeArm, LThigh...) and the other common
// convention (L_UpperArm, L_Forearm, L_Calf, Pelvis...). Suffixes like "_12" are stripped.
const BONES = {
  spine: /^(Spine|Spine1)$/, chest: /^(Spine2|Chest)$/, neck: /^Neck1?$/, head: /^Head$/, jaw: /^Jaw$/,
  lArm: /^(LArm|L_UpperArm)$/, rArm: /^(RArm|R_UpperArm)$/, lFore: /^(LForeArm|L_Forearm)$/, rFore: /^(RForeArm|R_Forearm)$/,
  lThigh: /^(LThigh|L_Thigh)$/, rThigh: /^(RThigh|R_Thigh)$/, lLeg: /^(LLeg|L_Calf)$/, rLeg: /^(RLeg|R_Calf)$/,
  lEar: /^(LEar1?|L_Ear1?)$/, rEar: /^(REar1?|R_Ear1?)$/, lWing: /^L_?Wing(1|A|A1)?$/, rWing: /^R_?Wing(1|A|A1)?$/
};
const CLIPS = {
  idle: /(defaultwait01_loop|battlewait01_loop|wait\d*_loop|aidle$|bd_battle$)/i, walk: /(walk01_loop|\d{3}run$)/i,
  attack: /(_attack01$|fight_b$|bd_attack$)/i, ranged: /(rangeattack01$|rangeattack02_start$|fight_d$|bd_charge$)/i,
  damage: /(damage01$|bd_damage)/i, down: /(down01_start$|\d{3}ko$|bd_down|bd_faint)/i, roar: /roar01$/i, glad: /glad01$/i
};
// a single generically named clip on these rips is their idle loop
const GENERIC_IDLE = /^((Armature\|)?ArmatureAction(\.\d+)?|Animation)$/;
const POSE_FIXES = { sylveon: 'droopRibbons', scyther: 'arms' };
const targetHeight = m => clamp(1.15 + 0.92 * Math.log2(1 + (m || 1)), 1.25, 3.2);
const _q = new Quat(), _q2 = new Quat(), _e = new THREE.Euler(), _v = new V3(), _v2 = new V3();
const WHITE = new THREE.Color(1, 1, 1);
const boneName = b => b.name.replace(/_\d+$/, '');
const firstChildBone = b => b.children.find(c => c.isBone);

function typesOf(key) {
  const sp = window.POKEDEX && POKEDEX.species[key.replace(/-mega.*$/, '')];
  if (!sp) return [];
  const mega = sp.megas.find(m => m.name === key);
  return (mega || sp).types;
}

async function buildForm(key) {
  const info = modelInfo(key);
  if (!info) throw new Error('no model for ' + key);
  const gltf = await loadGLTF(info.file);
  const obj = THREE.SkeletonUtils.clone(gltf.scene);
  const mats = [];
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m.map) m.map.anisotropy = 4;
      mats.push({ m, color: m.color ? m.color.clone() : null, emissive: m.emissive ? m.emissive.clone() : null, transparent: m.transparent, opacity: m.opacity });
    });
  });

  const all = [];
  obj.traverse(o => { if (o.isBone) all.push(o); });
  const bones = {};
  for (const [k, re] of Object.entries(BONES)) bones[k] = all.find(b => re.test(boneName(b)));
  bones.tails = all.filter(b => /^Tail\d+$/.test(boneName(b))).sort((a, b) => parseInt(boneName(a).slice(4)) - parseInt(boneName(b).slice(4)));

  const clips = {};
  if (gltf.animations.length > 3) for (const [k, re] of Object.entries(CLIPS)) {
    const clip = gltf.animations.find(a => re.test(a.name));
    if (clip) clips[k] = clip;
  } else if (gltf.animations.length === 1 && GENERIC_IDLE.test(gltf.animations[0].name)) clips.idle = gltf.animations[0];
  const animated = !!clips.idle;

  // rips whose only clips aren't usable (an attack, an emote): their first frame is a better rest pose than the bind pose
  if (!animated && gltf.animations.length) {
    const mx = new THREE.AnimationMixer(obj);
    mx.clipAction(gltf.animations[0]).play();
    mx.update(0);
    // stopping an action restores the bind pose, so keep the sampled transforms and re-apply them
    const posed = [];
    obj.traverse(o => posed.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
    mx.stopAllAction();
    mx.uncacheRoot(obj);
    for (const [o, p, q, sc] of posed) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); }
  }
  // pose corrections happen before measuring, so the posed model stands on the ground
  obj.updateMatrixWorld(true);
  if (!animated) poseFix(obj, all, bones, key, typesOf(key));

  // normalise size (long serpents are measured partly by length) and stand on the ground
  const measure = () => { obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isSkinnedMesh) o.boundingBox = null; }); return new THREE.Box3().setFromObject(obj); };
  const size = measure().getSize(new V3());
  const s = targetHeight(info.height) / Math.max(size.y, Math.max(size.x, size.z) * 0.42) * (info.megaFallback ? 1.12 : 1);
  obj.scale.multiplyScalar(s);
  const box = measure(), c = box.getCenter(new V3()), sz = box.getSize(new V3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;
  obj.updateMatrixWorld(true);

  const form = { obj, mats, bones, clips, animated, height: sz.y, radius: Math.max(0.5, Math.min(sz.x, sz.z) * 0.5), megaFallback: info.megaFallback };
  if (!animated) prepRig(form);
  return form;
}

// Rotate a bone (in world space, around its own pivot) so the direction to its child points
// along target. Done with full matrices so rigs with mirrored (negative-scale) parents work.
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
function aimBone(bone, child, target, amount = 1) {
  const pivot = bone.getWorldPosition(new V3());
  const dir = child.getWorldPosition(new V3()).sub(pivot);
  if (dir.lengthSq() < 1e-12) return;
  dir.normalize();
  const q = new Quat().slerp(new Quat().setFromUnitVectors(dir, target.clone().normalize()), amount);
  _m1.makeTranslation(pivot.x, pivot.y, pivot.z).multiply(_m2.makeRotationFromQuaternion(q)).multiply(_m3.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  const world = _m1.multiply(bone.matrixWorld);
  const local = _m2.copy(bone.parent.matrixWorld).invert().multiply(world);
  local.decompose(bone.position, bone.quaternion, bone.scale);
  bone.updateMatrixWorld(true);
}
// Fix rest poses of rips exported without animations
function poseFix(obj, all, bones, key, types) {
  // 1. arms (including extra pairs like Machamp's) hang down instead of a T-pose; flyers keep their wings
  if (!types.includes('Flying') || POSE_FIXES[key] === 'arms') for (const b of all) {
    if (!/^[LR](Arm\d*|_UpperArm)$/.test(boneName(b))) continue;
    const c = firstChildBone(b);
    if (!c) continue;
    const dir = c.getWorldPosition(new V3()).sub(b.getWorldPosition(new V3())).normalize();
    if (Math.abs(dir.y) > 0.72) continue;
    aimBone(b, c, new V3(Math.sign(dir.x) * 0.45, -0.85, 0.25), 0.8);
  }
  // 2. legless serpents modelled standing straight up: raise the head, coil the tail on the ground
  const size = new THREE.Box3().setFromObject(obj).getSize(new V3());
  if (!bones.lThigh && !bones.rThigh && bones.tails.length >= 3 && size.y > 2.2 * Math.max(size.x, size.z)) {
    bones.tails.forEach((b, i) => {
      const c = firstChildBone(b);
      if (c) aimBone(b, c, new V3(Math.sin(i * 0.9 + 0.5) * 0.7, i === 0 ? -0.9 : -0.04, -1));
    });
    const sp = bones.spine || bones.chest;
    if (sp && firstChildBone(sp)) aimBone(sp, firstChildBone(sp), new V3(0, 1, 0.45));
  }
  // 3. per-model fixes
  if (POSE_FIXES[key] === 'droopRibbons') for (const b of all) {
    if (!/^[LR]Feeler[A-Z]\d$/.test(boneName(b))) continue;
    const c = firstChildBone(b);
    if (!c) continue;
    const dir = c.getWorldPosition(new V3()).sub(b.getWorldPosition(new V3())).normalize();
    if (Math.abs(dir.y) > 0.6) continue;
    aimBone(b, c, new V3(Math.sign(dir.x || 1) * 0.35, -0.8, -0.5), 0.85);
  }
  obj.updateMatrixWorld(true);
}
// Precompute each driven bone's rest pose + parent orientation so we can rotate
// bones around body axes (+X side, +Y up, +Z forward) regardless of rig conventions
function prepRig(form) {
  const rig = {};
  const add = (key, bone) => {
    if (!bone) return;
    const wp = bone.parent.getWorldQuaternion(new Quat());
    rig[key] = { bone, rest: bone.quaternion.clone(), wp, wpInv: wp.clone().invert() };
  };
  for (const k of Object.keys(BONES)) add(k, form.bones[k]);
  form.bones.tails.forEach((b, i) => add('tail' + i, b));
  rig.tailCount = form.bones.tails.length;
  form.rig = rig;
}
function driveBone(r, x, y, z) {
  if (!r) return;
  _e.set(x, y, z);
  _q.setFromEuler(_e);
  _q2.copy(r.wpInv).multiply(_q).multiply(r.wp);
  r.bone.quaternion.copy(_q2).multiply(r.rest);
}

// ---------------------------------------------------------------------
//  Actor
// ---------------------------------------------------------------------
const POSE_KEYS = ['lean', 'arms', 'jaw', 'headUp', 'recoil', 'crouch', 'squash'];
class Actor {
  constructor(p) {
    this.p = p;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.root.visible = false;
    scene.add(this.root);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.025;
    this.blob.renderOrder = 5;
    this.root.add(this.blob);
    this.pos = new V3(SPAWN_X[p], 0, 0);
    this.home = new V3(SPAWN_X[p], 0, 0);
    this.offset = new V3();
    this.form = null;
    this.height = 2; this.radius = 0.8;
    this.yaw = p === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.yawOverride = null;
    this.scale = 1; this.opacity = 1; this.lift = 0; this.flash = 0; this.tint = null; this.roll = 0;
    this.pose = Object.fromEntries(POSE_KEYS.map(k => [k, 0]));
    this.poseT = Object.fromEntries(POSE_KEYS.map(k => [k, 0]));
    this.locked = false; this.target = null; this.pause = 0; this.speed = 2; this.moving = false; this.walkAmt = 0; this.hopT = 0;
    this._flash = -1; this._tint = null; this._opacity = 1;
    this.mixer = null; this.current = null;
  }
  get visible() { return this.root.visible; }
  set visible(v) { this.root.visible = v; }
  async setForm(key, spriteUrl) {
    let form;
    try { form = await buildForm(key); }
    catch (e) {
      console.warn('3D model unavailable, using sprite:', key, e);
      const tex = new THREE.TextureLoader().load(spriteUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      spr.center.set(0.5, 0); spr.scale.set(2, 2, 1);
      form = { obj: spr, mats: [{ m: spr.material, color: spr.material.color.clone(), emissive: null, transparent: true, opacity: 1 }], bones: { tails: [] }, clips: {}, animated: false, height: 2, radius: 0.8 };
    }
    if (this.form) { this.body.remove(this.form.obj); }
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null; }
    this.form = form;
    this.body.add(form.obj);
    this.height = form.height; this.radius = form.radius;
    this._flash = -1; this._opacity = 1;
    if (form.animated) {
      this.mixer = new THREE.AnimationMixer(form.obj);
      this.mixer.addEventListener('finished', e => { if (e.action === this.current && this.current._name !== 'down') this.play('idle'); });
      this.current = null;
      this.play('idle');
    }
    if (form.megaFallback) this.tint = new THREE.Color(0.6, 0.35, 1);
    return form;
  }
  play(name, fade = 0.2) {
    if (!this.mixer || !this.form.clips[name]) return false;
    const action = this.mixer.clipAction(this.form.clips[name]);
    action._name = name;
    const loop = name === 'idle' || name === 'walk';
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.enabled = true;
    if (this.current && this.current !== action) action.crossFadeFrom(this.current, fade, false);
    action.play();
    this.current = action;
    return true;
  }
  setPose(values, hold) {
    Object.assign(this.poseT, values);
    if (hold) later(() => { for (const k of Object.keys(values)) this.poseT[k] = 0; }, hold * 1000);
  }
  anchor(kind = 'center', out = new V3()) {
    const h = this.height * this.scale;
    out.copy(this.root.position);
    if (kind === 'center') out.y += h * 0.5 + this.lift;
    else if (kind === 'head' || kind === 'mouth') {
      out.x += Math.sin(this.yaw) * this.radius * 0.7; out.z += Math.cos(this.yaw) * this.radius * 0.7;
      out.y += h * 0.78 + this.lift;
    } else if (kind === 'top') out.y += h + this.lift;
    return out;
  }
  applyLook() {
    const f = this.flash, tint = this.tint;
    if (f === this._flash && tint === this._tint) return;
    this._flash = f; this._tint = tint;
    for (const { m, color, emissive } of this.form.mats) {
      if (m.emissive && emissive) {
        m.emissive.copy(emissive);
        if (tint) m.emissive.lerp(tint, 0.35);
        m.emissive.lerp(WHITE, Math.min(1, f) * 0.85);
      } else if (m.color && color) {
        m.color.copy(color);
        if (tint) m.color.lerp(tint, 0.3);
        m.color.lerp(WHITE, Math.min(1, f));
      }
    }
  }
  applyOpacity() {
    const o = this.opacity;
    if (o === this._opacity) return;
    this._opacity = o;
    for (const r of this.form.mats) {
      const want = o < 0.999 || r.transparent;
      if (r.m.transparent !== want) { r.m.transparent = want; r.m.needsUpdate = true; }
      r.m.opacity = r.opacity * o;
    }
  }
  update(dt, t, foe) {
    if (!this.form || !this.visible) return;
    const sdt = dt / SPEED;
    const k = 1 - Math.exp(-sdt * 12);
    for (const key of POSE_KEYS) this.pose[key] += (this.poseT[key] - this.pose[key]) * k;
    this.walkAmt += ((this.moving ? 1 : 0) - this.walkAmt) * (1 - Math.exp(-sdt * 8));
    this.offset.multiplyScalar(Math.pow(0.02, sdt));

    // facing: towards the opponent unless an action overrides it
    let want = this.yaw;
    if (this.yawOverride !== null) want = this.yawOverride;
    else if (foe && foe.visible) want = Math.atan2(foe.root.position.x - this.root.position.x, foe.root.position.z - this.root.position.z);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-sdt * 7));

    const P = this.pose, f = this.form;
    const weak = this.hpFrac !== undefined && this.hpFrac < 0.25, asleep = this.status === 'slp';
    const breathe = Math.sin(t * (weak ? 4.5 : asleep ? 1.2 : 2.4) + this.p * 1.3) * (weak ? 1.8 : 1);
    if (asleep) { this.poseT.headUp = -0.6; this.poseT.crouch = 0.5; this._statePose = true; }
    else if (weak) { this.poseT.crouch = Math.max(this.poseT.crouch, 0.25); this._statePose = true; }
    else if (this._statePose) { this.poseT.headUp = 0; this.poseT.crouch = 0; this._statePose = false; }
    const hop = this.walkAmt * Math.abs(Math.sin(this.hopT)) * (f.rig && f.rig.lThigh ? 0.07 : 0.17);
    this.root.position.set(this.pos.x + this.offset.x, 0, this.pos.z + this.offset.z);
    this.root.rotation.y = this.yaw;
    this.body.position.y = this.lift + hop;
    this.body.rotation.set(P.lean * (f.rig && f.rig.spine ? 0.12 : 0.32) - P.recoil * 0.28, 0, this.roll);
    const sy = 1 + breathe * 0.012 + P.squash * 0.25 - P.crouch * 0.1;
    this.body.scale.set(this.scale / Math.sqrt(sy), this.scale * sy, this.scale / Math.sqrt(sy));
    const bw = Math.max(this.radius * 2.2, 0.8) * this.scale / (1 + this.lift * 0.5);
    this.blob.scale.set(bw, bw * 0.8, 1);
    this.blob.material.opacity = 0.45 * this.opacity;

    if (this.mixer) {
      if (this.current && (this.current._name === 'idle' || this.current._name === 'walk')) {
        const wantClip = this.walkAmt > 0.5 && f.clips.walk ? 'walk' : 'idle';
        if (this.current._name !== wantClip) this.play(wantClip, 0.3);
      }
      this.mixer.update(sdt);
    } else if (f.rig) {
      const r = f.rig, w = this.walkAmt, sw = Math.sin(this.hopT) * w;
      driveBone(r.spine, P.lean * 0.3 - P.recoil * 0.3 + breathe * 0.02, Math.sin(t * 0.8) * 0.03, 0);
      driveBone(r.chest, P.lean * 0.2 - P.headUp * 0.15 + breathe * 0.015, 0, 0);
      driveBone(r.neck, P.lean * 0.15 - P.headUp * 0.35, 0, 0);
      driveBone(r.head, -P.headUp * 0.35 - P.recoil * 0.25 + Math.sin(t * 1.3) * 0.04, Math.sin(t * 0.7) * 0.14 * (1 - P.lean), Math.sin(t * 0.5) * 0.05);
      driveBone(r.jaw, P.jaw * 0.5, 0, 0);
      driveBone(r.lArm, -P.arms * 1.1 + sw * 0.45 + breathe * 0.05, 0, 0);
      driveBone(r.rArm, -P.arms * 1.1 - sw * 0.45 + breathe * 0.05, 0, 0);
      driveBone(r.lFore, -P.arms * 0.6, 0, 0);
      driveBone(r.rFore, -P.arms * 0.6, 0, 0);
      driveBone(r.lThigh, -sw * 0.55 - P.crouch * 0.6, 0, 0);
      driveBone(r.rThigh, sw * 0.55 - P.crouch * 0.6, 0, 0);
      driveBone(r.lLeg, Math.max(0, -Math.sin(this.hopT)) * w * 0.6 + P.crouch * 0.9, 0, 0);
      driveBone(r.rLeg, Math.max(0, Math.sin(this.hopT)) * w * 0.6 + P.crouch * 0.9, 0, 0);
      for (let i = 0; i < r.tailCount; i++) driveBone(r['tail' + i], Math.sin(t * 1.8 - i * 0.5) * 0.04, Math.sin(t * 2.2 - i * 0.7) * (0.1 + w * 0.14 + P.lean * 0.1), 0);
      const twitch = Math.max(0, Math.sin(t * 0.9 + this.p)) > 0.97 ? Math.sin(t * 40) * 0.15 : 0;
      driveBone(r.lEar, 0, 0, twitch);
      driveBone(r.rEar, 0, 0, -twitch);
      driveBone(r.lWing, 0, 0, Math.sin(t * 5) * 0.25);
      driveBone(r.rWing, 0, 0, -Math.sin(t * 5) * 0.25);
    }
    this.applyLook();
    this.applyOpacity();
  }
}

const actors = [new Actor(0), new Actor(1)];
World.actors = actors;

// ---------------------------------------------------------------------
//  Positioning: each Pokémon holds its home spot facing the opponent and
//  only moves for a reason (attacks, dodges, knockback). After being
//  pushed away it steps back to its spot.
// ---------------------------------------------------------------------
function homeStep(a, dt) {
  a.moving = false;
  if (a.locked || !a.visible || !a.form || a.status === 'slp' || a.status === 'frz') return;
  const dx = a.home.x - a.pos.x, dz = a.home.z - a.pos.z, dist = Math.hypot(dx, dz);
  if (dist < 0.04) return;
  if (a.pause > 0) { a.pause -= dt / SPEED; return; }
  const step = Math.min(dist, a.speed * (a.hpFrac < 0.25 ? 0.55 : 1) * dt / SPEED);
  a.pos.x += dx / dist * step; a.pos.z += dz / dist * step;
  a.moving = true; a.hopT += dt * 10 / SPEED;
}

// ---------------------------------------------------------------------
//  Camera director: high-angle broadcast view with close-ups
// ---------------------------------------------------------------------
const Cam = { target: new V3(0, 0.8, 0), dist: 25, elev: 0.9, mode: 'overview', a: 0, b: 1, point: new V3(), pointDist: 12, shake: 0, punch: 0 };
World.overview = () => { Cam.mode = 'overview'; };
World.focusMove = (a, b) => { Cam.mode = 'move'; Cam.a = a; Cam.b = b; };
World.focusOne = p => { Cam.mode = 'one'; Cam.a = p; };
World.focusPoint = (v, dist = 12) => { Cam.mode = 'point'; Cam.point.copy(v); Cam.pointDist = dist; };
World.shake = amount => { Cam.shake = Math.max(Cam.shake, amount); };
World.punch = amount => { Cam.punch = Math.max(Cam.punch, amount); };
const camWant = new V3();
function updateCamera(dt, t) {
  let dist = 25;
  camWant.set(0, 0.8, 0);
  const vis = actors.filter(a => a.visible);
  if (Cam.mode === 'move' && actors[Cam.a].visible) {
    const A = actors[Cam.a].root.position, B = actors[Cam.b].visible ? actors[Cam.b].root.position : A;
    camWant.set((A.x + B.x) / 2, 1.2, (A.z + B.z) / 2);
    dist = 12 + A.distanceTo(B) * 0.55;
  } else if (Cam.mode === 'one' && actors[Cam.a].visible) {
    actors[Cam.a].anchor('center', camWant);
    dist = 6.5 + actors[Cam.a].height * 1.6;
  } else if (Cam.mode === 'point') {
    camWant.copy(Cam.point); dist = Cam.pointDist;
  } else if (vis.length) {
    vis.forEach(a => { camWant.x += a.pos.x / vis.length * 0.5; camWant.z += a.pos.z / vis.length * 0.5; });
  }
  const k = 1 - Math.exp(-dt * 2.4 / Math.max(SPEED, 0.3));
  Cam.target.lerp(camWant, k);
  Cam.dist = lerp(Cam.dist, dist, k);
  Cam.punch = Math.max(0, Cam.punch - dt * 2.5);
  const punchDist = Cam.dist * (1 - 0.18 * Math.sin(Math.min(1, Cam.punch) * Math.PI / 2));
  const az = Math.sin(t * 0.1) * 0.16;
  camera.position.set(
    Cam.target.x + Math.sin(az) * Math.cos(Cam.elev) * punchDist,
    Cam.target.y + Math.sin(Cam.elev) * punchDist,
    Cam.target.z + Math.cos(az) * Math.cos(Cam.elev) * punchDist
  );
  if (Cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * Cam.shake;
    camera.position.y += (Math.random() - 0.5) * Cam.shake;
    Cam.shake = Math.max(0, Cam.shake - dt * 0.9);
  }
  camera.lookAt(Cam.target);
}

// ---------------------------------------------------------------------
//  Choreography used by the battle engine and the move effects
// ---------------------------------------------------------------------
const ballTex = canvasTex(64, 64, (c, w, h) => {
  c.fillStyle = '#e3350d'; c.fillRect(0, 0, w, h / 2);
  c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2);
  c.fillStyle = '#222'; c.fillRect(0, h / 2 - 3, w, 6);
});
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.35 }));
ball.visible = false; ball.castShadow = true; scene.add(ball);
const burst = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.35, 1.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
burst.visible = false; scene.add(burst);
const burstLight = new THREE.PointLight(0xffffff, 0, 0, 2);
scene.add(burstLight);

World.anchor = (p, kind, out) => actors[p].anchor(kind, out);
World.epoch = 0;
World.reset = () => {
  World.epoch++;
  ball.visible = false; burst.visible = false; burstLight.intensity = 0;
  actors.forEach((a, p) => {
    a.visible = false; a.locked = false; a.offset.set(0, 0, 0); a.pos.set(SPAWN_X[p], 0, 0); a.home.set(SPAWN_X[p], 0, 0);
    a.tint = null; a.roll = 0; a.lift = 0; a.opacity = 1; a.scale = 1; a.yawOverride = null;
    a.setPose(Object.fromEntries(POSE_KEYS.map(k => [k, 0])));
  });
  World.overview();
};
World.setSpeedStat = (p, spe) => { actors[p].speed = Math.min(4.2, 1.3 + spe / 85); };
const TINTS = { par: new THREE.Color(1, 0.85, 0.1), brn: new THREE.Color(1, 0.25, 0.1), psn: new THREE.Color(0.7, 0.2, 1), frz: new THREE.Color(0.4, 0.8, 1), slp: new THREE.Color(0.4, 0.4, 0.5) };
World.setState = (p, status, hpFrac) => { actors[p].status = status || null; actors[p].hpFrac = hpFrac; };
World.setTint = (p, status) => {
  const a = actors[p];
  if (a.form && a.form.megaFallback && !status) { a.tint = a.tint && a.tint.isMegaTint ? a.tint : Object.assign(new THREE.Color(0.6, 0.35, 1), { isMegaTint: true }); return; }
  a.tint = TINTS[status] || null;
};

World.sendOut = async (p, mon) => {
  const a = actors[p];
  a.locked = true;
  const formJob = a.setForm(mon.modelKey, mon.sprite);
  const spot = a.home.set(SPAWN_X[p], 0, 0).clone();
  a.pos.copy(spot); a.offset.set(0, 0, 0);
  World.focusPoint(new V3((TRAINER_X[p] + spot.x) / 2, 1, spot.z / 2), 13);
  const epoch = World.epoch;
  const hand = World.trainers ? await World.trainers.throwBall(p) : new V3(TRAINER_X[p], 1.6, 0);
  ball.visible = true;
  ball.position.copy(hand);
  await tween(0.6, k => {
    ball.position.lerpVectors(hand, spot, k);
    ball.position.y = lerp(hand.y, 0.5, k) + Math.sin(k * Math.PI) * 2.4;
    ball.rotation.z -= 0.35 * (p ? -1 : 1);
  });
  await formJob;
  if (epoch !== World.epoch) return;
  ball.visible = false;
  burst.position.set(spot.x, 0.8, spot.z); burst.visible = true;
  burstLight.position.set(spot.x, 1.5, spot.z);
  a.visible = true; a.scale = 0.01; a.opacity = 1; a.lift = 0; a.flash = 1; a.roll = 0;
  a.yaw = p === 0 ? Math.PI / 2 : -Math.PI / 2;
  if (window.VFX) VFX.sendOutBurst(spot);
  await tween(0.45, k => {
    burst.scale.setScalar(0.3 + k * 1.5); burst.material.opacity = 0.8 * (1 - k);
    burstLight.intensity = 60 * (1 - k);
    a.scale = Math.max(0.01, easeOut(k)); a.flash = 1 - k;
  });
  burst.visible = false; burstLight.intensity = 0;
  a.scale = 1; a.flash = 0;
  if (!a.play('roar')) a.setPose({ headUp: 1, jaw: 1, arms: 0.4 }, 0.6);
  World.overview();
  a.locked = false; a.pause = 0;
};
World.recall = async p => {
  const a = actors[p];
  a.locked = true;
  if (World.trainers) World.trainers.recall(p);
  a.tint = new THREE.Color(1, 0.1, 0.1);
  await tween(0.35, k => { a.scale = Math.max(0.01, 1 - k); a.flash = k; });
  a.visible = false; a.flash = 0; a.tint = null;
};
World.faint = async p => {
  const a = actors[p];
  a.locked = true;
  if (a.play('down')) {
    await wait(700);
    await tween(0.5, k => { a.opacity = 1 - k; });
  } else {
    const side = Math.random() < 0.5 ? 1 : -1;
    a.setPose({ recoil: 1, headUp: -0.5, jaw: 0.6 });
    await tween(0.75, k => { a.roll = side * easeIn(k) * 1.45; a.lift = -k * 0.15; });
    await tween(0.45, k => { a.opacity = 1 - k; });
  }
  a.visible = false; a.opacity = 1; a.roll = 0; a.lift = 0;
  a.setPose({ recoil: 0, headUp: 0, jaw: 0 });
};
// eff: type effectiveness, crit: critical hit, ko: this hit knocked it out
World.hit = async (p, from, power = 1, { eff = 1, crit = false, ko = false } = {}) => {
  const a = actors[p], src = actors[from];
  const dx = a.pos.x - src.pos.x, dz = a.pos.z - src.pos.z, d = Math.hypot(dx, dz) || 1;
  const weakHit = eff < 1;
  let push = (0.4 + 0.5 * Math.min(power, 2.5)) * (eff > 1 ? 1.8 : weakHit ? 0.35 : 1) * (ko ? 2.2 : 1);
  if (eff > 1 || crit || ko) { World.shake(ko ? 0.45 : 0.3); World.punch(1); }
  World.cheer(weakHit ? 0.2 : Math.min(1, 0.4 + power * 0.3 + (eff > 1 ? 0.3 : 0)));
  if (weakHit) a.setPose({ recoil: 0.35 }, 0.2);
  else if (!a.play('damage')) a.setPose({ recoil: eff > 1 || ko ? 1.6 : 1, jaw: 0.8, headUp: eff > 1 ? -0.4 : 0 }, eff > 1 ? 0.6 : 0.35);
  const blinks = weakHit ? 4 : 8, peak = weakHit ? 0.45 : crit ? 1 : 0.9;
  await tween(eff > 1 || ko ? 0.55 : 0.4, k => {
    a.flash = Math.floor(k * blinks) % 2 === 0 ? peak : 0;
    if (k < 0.35) { a.pos.x += dx / d * push * 0.07; a.pos.z += dz / d * push * 0.07; }
    if (eff > 1 || ko) a.lift = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (ko ? 0.9 : 0.35);
  });
  a.flash = 0; a.lift = 0;
  a.pause = 0.7;                       // hold the stagger, then step back to the spot
  a.pos.x = clamp(a.pos.x, -ROAM.hx, ROAM.hx);
  a.pos.z = clamp(a.pos.z, -ROAM.hz, ROAM.hz);
};
World.dodge = async (p, from) => {
  const a = actors[p], src = actors[from];
  const dx = a.pos.x - src.pos.x, dz = a.pos.z - src.pos.z, d = Math.hypot(dx, dz) || 1;
  const side = Math.random() < 0.5 ? 1 : -1;
  const ox = -dz / d * side * 1.8, oz = dx / d * side * 1.8;
  await tween(0.24, k => { a.offset.set(ox * easeOut(k), 0, oz * easeOut(k)); a.lift = Math.sin(k * Math.PI) * 0.6; });
  a.lift = 0;
};
World.shrug = p => { actors[p].setPose({ headUp: 0.5, lean: -0.2 }, 0.6); };
World.blink = async p => {
  const a = actors[p];
  await tween(0.35, k => { a.flash = Math.floor(k * 6) % 2 === 0 ? 0.8 : 0; });
  a.flash = 0;
};
// Dash to the target for a contact move; resolves on impact
World.lungeTo = async (p, target, { speed = 1, jump = 0.4 } = {}) => {
  const a = actors[p], d = actors[target];
  a.locked = true; d.locked = true;
  const from = a.pos.clone();
  const dir = _v.copy(d.pos).sub(from);
  const len = dir.length() || 1;
  dir.divideScalar(len);
  const to = new V3().copy(d.pos).addScaledVector(dir, -(a.radius + d.radius) * 0.75);
  a.setPose({ crouch: 0.6 });
  await wait(90 / speed);
  a.setPose({ crouch: 0, lean: 1, arms: 1, jaw: 0.8 });
  if (!a.play('attack')) a.play('ranged');
  await tween(0.26 / speed, k => {
    a.pos.lerpVectors(from, to, easeIn(k));
    a.lift = Math.sin(k * Math.PI) * jump;
  });
  a.lift = 0;
  return from;
};
World.lungeBack = async (p, from, target) => {
  const a = actors[p];
  const start = a.pos.clone();
  a.setPose({ lean: 0, arms: 0, jaw: 0 });
  await tween(0.32, k => { a.pos.lerpVectors(start, from, easeOut(k)); a.lift = Math.sin(k * Math.PI) * 0.35; });
  a.lift = 0;
  a.locked = false;
  if (target !== undefined) actors[target].locked = false;
};
// Rear back, then thrust forward for a ranged move; resolves at the release moment
World.cast = async p => {
  const a = actors[p];
  a.locked = true;
  if (!a.play('ranged')) a.play('attack');
  a.setPose({ headUp: 0.8, arms: -0.3, lean: -0.4 });
  await wait(220);
  a.setPose({ headUp: -0.1, arms: 0.9, lean: 0.8, jaw: 1 });
  await wait(90);
  later(() => { a.setPose({ headUp: 0, arms: 0, lean: 0, jaw: 0 }); a.locked = false; }, 650);
};
World.flex = async p => {
  const a = actors[p];
  if (!a.play('roar') && !a.play('glad')) a.setPose({ headUp: 1, jaw: 1, arms: 0.8, squash: 0.15 }, 0.7);
  await tween(0.5, k => { a.lift = Math.sin(k * Math.PI) * 0.35; });
  a.lift = 0;
};
World.megaSwap = async (p, mon) => {
  const a = actors[p];
  await tween(0.25, k => { a.flash = k; });
  const epoch = World.epoch;
  await a.setForm(mon.modelKey, mon.sprite);
  if (epoch !== World.epoch) return;
  a.flash = 1;
  World.shake(0.3); World.cheer(1);
  if (!a.play('roar')) a.setPose({ headUp: 1, jaw: 1, arms: 0.7 }, 0.8);
  await tween(0.5, k => { a.flash = 1 - k; });
};

updaters.push((dt, t) => {
  homeStep(actors[0], dt);
  homeStep(actors[1], dt);
  actors[0].update(dt, t, actors[1]);
  actors[1].update(dt, t, actors[0]);
});
updaters.push(updateCamera);
