'use strict';
// =====================================================================
//  TRAINERS — stylised 3D trainers (procedural meshes + animation)
// =====================================================================
// OUTFITS lives in base.js (Retro mode uses it too)
const SKIN = 0xf6cfa8;
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1a22, side: THREE.BackSide });

function part(parent, geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, opts.mat || toon(color));
  m.position.set(x, y, z);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.rot) m.rotation.set(...opts.rot);
  m.castShadow = true;
  parent.add(m);
  if (opts.outline !== false) {           // inverted-hull outline for a cel-shaded look
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(opts.outlineScale || 1.06);
    m.add(o);
  }
  return m;
}
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 12);
const sphere = (r, w = 20, h = 14, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
// a joint group with a limb hanging down from it
function limb(parent, x, y, z, r, len, color) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  parent.add(j);
  part(j, capsule(r, len), color, 0, -(len / 2 + r * 0.6), 0);
  return j;
}

function nameTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(15,23,42,.8)';
  ctx.beginPath(); ctx.roundRect(4, 8, 248, 48, 24); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 14), 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.15, 0.29, 1);
  return s;
}

function buildTrainer(o, p) {
  const root = new THREE.Group();
  const J = {};
  J.hips = new THREE.Group(); J.hips.position.y = 0.95; root.add(J.hips);

  // legs
  const legColor = o.legStyle === 'pants' ? o.legs : SKIN;
  for (const [s, side] of [[1, 'l'], [-1, 'r']]) {
    const thigh = new THREE.Group(); thigh.position.set(0.13 * s, 0, 0); J.hips.add(thigh); J[side + 'Thigh'] = thigh;
    part(thigh, capsule(0.1, 0.26), o.legStyle === 'skirt' ? SKIN : o.legs, 0, -0.22, 0);
    const knee = new THREE.Group(); knee.position.y = -0.45; thigh.add(knee); J[side + 'Knee'] = knee;
    part(knee, capsule(0.085, 0.26), legColor, 0, -0.2, 0);
    part(knee, new THREE.BoxGeometry(0.17, 0.11, 0.28), o.shoes, 0, -0.43, 0.04, { outlineScale: 1.08 });
  }
  if (o.legStyle === 'skirt') part(J.hips, new THREE.CylinderGeometry(0.22, 0.36, 0.32, 16), o.legs, 0, -0.08, 0);
  else part(J.hips, new THREE.CylinderGeometry(0.23, 0.25, 0.22, 16), o.legs, 0, -0.02, 0);

  // torso
  J.spine = new THREE.Group(); J.hips.add(J.spine);
  part(J.spine, capsule(0.24, 0.28), o.top, 0, 0.32, 0, { scale: [1, 1, 0.78] });
  if (o.inner !== o.top) part(J.spine, new THREE.BoxGeometry(0.2, 0.34, 0.05), o.inner, 0, 0.34, 0.18, { outline: false });
  if (o.scarf) part(J.spine, new THREE.TorusGeometry(0.17, 0.06, 8, 20), o.scarf, 0, 0.66, 0, { rot: [Math.PI / 2, 0, 0] });
  if (o.necklace) part(J.spine, new THREE.TorusGeometry(0.15, 0.015, 6, 20), o.necklace, 0, 0.6, 0.06, { rot: [Math.PI / 2.3, 0, 0], outline: false });
  if (o.bag) part(J.spine, new THREE.BoxGeometry(0.34, 0.36, 0.16), o.bag, 0, 0.36, -0.25);

  // arms
  const sleeve = o.sleeves === 'none' ? SKIN : o.top;
  const fore = o.sleeves === 'long' ? o.top : SKIN;
  for (const [s, side] of [[1, 'l'], [-1, 'r']]) {
    const sh = new THREE.Group(); sh.position.set(0.31 * s, 0.56, 0); J.spine.add(sh); J[side + 'Shoulder'] = sh;
    part(sh, capsule(0.085, 0.22), sleeve, 0, -0.16, 0);
    const el = new THREE.Group(); el.position.y = -0.34; sh.add(el); J[side + 'Elbow'] = el;
    part(el, capsule(0.075, 0.2), fore, 0, -0.13, 0);
    const hand = part(el, sphere(0.085), SKIN, 0, -0.3, 0);
    J[side + 'Hand'] = hand;
  }
  // Key Stone bracelet on the right wrist
  part(J.rElbow, new THREE.TorusGeometry(0.085, 0.025, 6, 16), 0xd4af37, 0, -0.22, 0, { rot: [Math.PI / 2, 0, 0], outline: false });
  const keyStone = part(J.rElbow, sphere(0.045), 0xffffff, 0, -0.22, 0.09, { mat: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 1) }), outline: false });
  // ball held during the throw
  const heldBall = new THREE.Mesh(sphere(0.12), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.35 }));
  heldBall.position.set(0, -0.36, 0.05); heldBall.visible = false; J.rElbow.add(heldBall);

  // head
  J.head = new THREE.Group(); J.head.position.y = 0.74; J.spine.add(J.head);
  part(J.head, sphere(0.36, 24, 18), SKIN, 0, 0.3, 0);
  for (const s of [1, -1]) {
    const eye = part(J.head, sphere(0.055, 12, 10), 0x1b1b1b, 0.125 * s, 0.31, 0.3, { scale: [0.75, 1.25, 0.5], outline: false });
    part(eye, sphere(0.02, 8, 6), 0xffffff, 0.012, 0.025, 0.04, { mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), outline: false });
  }
  part(J.head, new THREE.BoxGeometry(0.09, 0.02, 0.02), 0x7a3b2e, 0, 0.17, 0.34, { outline: false });
  // hair
  const hair = o.hair;
  if (o.hairStyle === 'spiky') {
    part(J.head, sphere(0.37, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.33, -0.02);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 1.4 - Math.PI * 0.2;
      part(J.head, new THREE.ConeGeometry(0.1, 0.32, 6), hair, Math.cos(a) * 0.22, 0.55 + Math.sin(i) * 0.03, -0.1 + Math.sin(a) * -0.18, { rot: [-0.9, 0, (Math.cos(a)) * -0.6] });
    }
  } else {
    part(J.head, sphere(0.385, 20, 14), hair, 0, 0.36, -0.05, { scale: [1, 0.85, 1] });
    for (const s of [-1, 0, 1]) part(J.head, new THREE.ConeGeometry(0.09, 0.2, 6), hair, s * 0.13, 0.5, 0.28, { rot: [1.9, 0, s * 0.3], outline: false });
    if (o.hairStyle === 'long') part(J.head, capsule(0.24, 0.42), hair, 0, 0.05, -0.22, { scale: [1.1, 1, 0.6] });
    if (o.hairStyle === 'pigtails') for (const s of [1, -1]) part(J.head, capsule(0.1, 0.25), hair, 0.36 * s, 0.12, -0.12, { rot: [0, 0, 0.35 * s] });
  }
  // hats
  if (o.hat === 'cap' || o.hat === 'capback') {
    part(J.head, sphere(0.395, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), o.hatColor, 0, 0.4, 0);
    part(J.head, sphere(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), o.hatFront, 0, 0.42, o.hat === 'cap' ? 0.25 : -0.25, { scale: [1.3, 1, 0.6], rot: [o.hat === 'cap' ? 0.7 : -0.7, 0, 0], outline: false });
    part(J.head, new THREE.CylinderGeometry(0.3, 0.3, 0.035, 20), o.hatColor, 0, 0.42, o.hat === 'cap' ? 0.33 : -0.33, { scale: [1, 1, 0.8] });
  } else if (o.hat === 'sunhat') {
    part(J.head, new THREE.CylinderGeometry(0.62, 0.62, 0.035, 28), o.hatColor, 0, 0.5, 0);
    part(J.head, sphere(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), o.hatColor, 0, 0.5, 0);
    part(J.head, new THREE.CylinderGeometry(0.37, 0.37, 0.08, 24, 1, true), o.hatBand, 0, 0.54, 0, { outline: false });
  } else if (o.hat === 'beanie') {
    part(J.head, sphere(0.4, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), o.hatColor, 0, 0.42, 0, { scale: [1, 1.15, 1] });
    part(J.head, new THREE.TorusGeometry(0.38, 0.05, 8, 24), o.hatColor, 0, 0.43, 0, { rot: [Math.PI / 2, 0, 0] });
    part(J.head, sphere(0.09), o.hatFront, 0, 0.62, 0.3);
  } else if (o.hat === 'bandana') {
    part(J.head, new THREE.TorusGeometry(0.36, 0.07, 8, 24), o.hatColor, 0, 0.48, 0, { rot: [Math.PI / 2 - 0.25, 0, 0] });
    part(J.head, sphere(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), o.hatColor, 0, 0.5, -0.02);
  }
  const tag = nameTag(o.name || o.label, p ? '#f87171' : '#60a5fa');
  tag.position.y = 2.75;
  root.add(tag);
  return { root, J, keyStone, heldBall, tag };
}

// ---------------------------------------------------------------------
//  Animation
// ---------------------------------------------------------------------
const JOINTS = ['hips', 'spine', 'head', 'lShoulder', 'lElbow', 'rShoulder', 'rElbow', 'lThigh', 'lKnee', 'rThigh', 'rKnee'];
const REST = {
  lShoulder: [0.05, 0, 0.14], rShoulder: [0.05, 0, -0.14], lElbow: [-0.15, 0, 0], rElbow: [-0.15, 0, 0]
};
class Trainer {
  constructor(p) {
    this.p = p;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.cur = {}; this.tgt = {};
    for (const j of JOINTS) { this.cur[j] = [0, 0, 0]; this.tgt[j] = (REST[j] || [0, 0, 0]).slice(); }
    this.jump = 0; this.speedK = 10;
    this.build('red', 'Player');
  }
  build(outfitKey, name) {
    if (this.model) { this.root.remove(this.model.root); disposeTree(this.model.root); }
    const o = { ...(OUTFITS[outfitKey] || OUTFITS.red), name };
    this.model = buildTrainer(o, this.p);
    this.root.add(this.model.root);
    this.placeAtSpot();
    this.root.scale.setScalar(0.95);
  }
  placeAtSpot() {
    const s = trainerSpot(this.p);
    this.root.position.copy(s);
    this.baseYaw = Cam.shorts ? Math.atan2(-s.x, -s.z) : (this.p === 0 ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45);
    this.root.rotation.y = this.baseYaw;
  }
  pose(values, hold) {
    for (const [j, v] of Object.entries(values)) this.tgt[j] = v.slice();
    if (hold) later(() => this.rest(Object.keys(values)), hold * 1000);
  }
  rest(keys = JOINTS) { for (const j of keys) this.tgt[j] = (REST[j] || [0, 0, 0]).slice(); }
  update(dt, t) {
    const k = 1 - Math.exp(-dt / SPEED * this.speedK);
    const breathe = Math.sin(t * 2 + this.p * 2);
    const J = this.model.J;
    for (const j of JOINTS) {
      const c = this.cur[j], g = this.tgt[j];
      for (let i = 0; i < 3; i++) c[i] += (g[i] - c[i]) * k;
      J[j].rotation.set(c[0], c[1], c[2]);
    }
    // idle layer: breathing, weight shift, glance at the field
    J.spine.rotation.x += breathe * 0.02;
    J.hips.rotation.z += Math.sin(t * 0.8 + this.p) * 0.03;
    J.head.rotation.y += Math.sin(t * 0.6 + this.p) * 0.15;
    J.lShoulder.rotation.x += breathe * 0.03;
    J.rShoulder.rotation.x += breathe * 0.03;
    this.model.root.position.y = this.jump;
    this.model.tag.material.opacity = 0.9;
  }
  hand(out = new V3()) { return this.model.J.rHand.getWorldPosition(out); }
}

// landscape: behind each Pokémon at the field ends; Shorts (vertical camera along the battle line): beside the field
function trainerSpot(p) {
  return Cam.shorts ? new V3(TRAINER_X[p] * 0.7, 0, p ? 5.6 : -5.6) : new V3(TRAINER_X[p], 0, 0.6);
}
const trainerObjs = [new Trainer(0), new Trainer(1)];

// stage spotlights for the walk-out (always in the scene so no shader recompiles; off by default)
const spotTex = canvasTex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.55)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 1, 1, false);
const spots = trainerObjs.map((tr, p) => {
  const light = new THREE.SpotLight(p ? 0xffb4b4 : 0xb4ccff, 0, 30, 0.32, 0.5, 1);
  light.position.set(TRAINER_X[p], 14, 3);
  scene.add(light); scene.add(light.target);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.2, 14, 24, 1, true),
    new THREE.MeshBasicMaterial({ map: spotTex, color: p ? 0xffc4c4 : 0xc4d8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.renderOrder = 28; scene.add(cone);
  return { light, cone };
});
function walkCycle(tr, k) {
  const s = Math.sin(k * Math.PI * 2);
  tr.tgt.lThigh = [-s * 0.5, 0, 0]; tr.tgt.rThigh = [s * 0.5, 0, 0];
  tr.tgt.lKnee = [Math.max(0, s) * 0.6, 0, 0]; tr.tgt.rKnee = [Math.max(0, -s) * 0.6, 0, 0];
  tr.tgt.lShoulder = [s * 0.5, 0, 0.12]; tr.tgt.rShoulder = [-s * 0.5, 0, -0.12];
}
const hop = async (tr, n = 1, h = 0.35) => {
  for (let i = 0; i < n; i++) await tween(0.32, k => { tr.jump = Math.sin(k * Math.PI) * h; });
  tr.jump = 0;
};

World.trainers = {
  list: trainerObjs,
  setup(p, outfit, name) { trainerObjs[p].build(outfit, name); trainerObjs[p].rest(); },
  async throwBall(p) {
    const tr = trainerObjs[p];
    tr.model.heldBall.visible = true;
    tr.pose({ rShoulder: [-2.8, 0, -0.3], rElbow: [-1.4, 0, 0], lShoulder: [-1.0, 0, 0.3], spine: [-0.15, 0.45, 0], lThigh: [-0.35, 0, 0], lKnee: [0.4, 0, 0] });
    await wait(380);
    tr.speedK = 26;
    tr.pose({ rShoulder: [-1.25, 0, -0.1], rElbow: [-0.1, 0, 0], lShoulder: [0.4, 0, 0.2], spine: [0.28, -0.35, 0], rThigh: [0.3, 0, 0], lThigh: [-0.5, 0, 0], lKnee: [0.2, 0, 0] });
    await wait(110);
    const pos = tr.hand();
    tr.model.heldBall.visible = false;
    later(() => { tr.speedK = 10; tr.rest(); }, 450);
    return pos;
  },
  recall(p) {
    const tr = trainerObjs[p];
    tr.pose({ rShoulder: [-1.5, 0, 0], rElbow: [0, 0, 0], spine: [0.1, 0, 0] }, 0.7);
  },
  command(p) {
    const tr = trainerObjs[p];
    tr.pose({ rShoulder: [-1.55, 0.3, -0.2], rElbow: [0, 0, 0], spine: [0.12, -0.2, 0], lShoulder: [0.25, 0, 0.3] }, 0.9);
  },
  async cheer(p) {
    const tr = trainerObjs[p];
    tr.pose({ lShoulder: [-2.9, 0, 0.25], rShoulder: [-2.9, 0, -0.25], lElbow: [-0.3, 0, 0], rElbow: [-0.3, 0, 0] }, 1.1);
    await hop(tr, 2);
  },
  dismay(p, hold = 1.4) {
    const tr = trainerObjs[p];
    tr.pose({ lShoulder: [-2.3, 0, 0.5], rShoulder: [-2.3, 0, -0.5], lElbow: [-2.1, 0, 0], rElbow: [-2.1, 0, 0], spine: [0.45, 0, 0], head: [0.4, 0, 0], lKnee: [0.35, 0, 0], rKnee: [0.35, 0, 0], lThigh: [-0.25, 0, 0], rThigh: [-0.25, 0, 0] }, hold);
  },
  async mega(p) {
    const tr = trainerObjs[p];
    tr.pose({ rShoulder: [-2.75, 0, -0.15], rElbow: [-0.35, 0, 0], spine: [-0.12, 0, 0], lShoulder: [0.3, 0, 0.35] });
    const ks = tr.model.keyStone;
    await tween(0.7, k => { ks.material.color.setRGB(1 + k * 4, 0.6 + k * 3, 1 + k * 4); ks.scale.setScalar(1 + k * 1.5); });
    if (window.VFX) VFX.keyStoneFlash(ks.getWorldPosition(new V3()));
    later(() => { ks.material.color.setRGB(1, 0.6, 1); ks.scale.setScalar(1); tr.rest(); }, 600);
  },
  async celebrate(p) {
    const tr = trainerObjs[p];
    tr.pose({ rShoulder: [-3.0, 0, -0.1], rElbow: [-0.2, 0, 0], lShoulder: [-0.4, 0, 0.3], lElbow: [-1.6, 0, 0] });
    await hop(tr, 3, 0.4);
  },
  // walk out from behind the stands to the trainer box with a spotlight following
  async walkIn(p, dur = 1.6) {
    const tr = trainerObjs[p], sp = spots[p];
    const end = trainerSpot(p), start = end.clone().add(new V3(Math.sign(end.x) * 6, 0, Cam.shorts ? Math.sign(end.z) * 3 : 3.4));
    tr.root.position.copy(start);
    tr.root.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    sp.light.intensity = 0; sp.cone.material.opacity = 0;
    await tween(dur, k => {
      tr.root.position.lerpVectors(start, end, k);
      walkCycle(tr, k * 3);
      sp.light.intensity = Math.min(1, k * 3) * 70; sp.cone.material.opacity = Math.min(1, k * 3) * 0.28;
      sp.light.position.set(tr.root.position.x, 14, tr.root.position.z + 2.4); sp.light.target.position.copy(tr.root.position);
      sp.cone.position.set(tr.root.position.x, 7, tr.root.position.z + 1.2);
    });
    tr.rest();
    await tween(0.35, k => { tr.root.rotation.y = lerp(tr.root.rotation.y, tr.baseYaw, k); });
    tr.root.rotation.y = tr.baseYaw;
  },
  spotsOff() { spots.forEach(s => { s.light.intensity = 0; s.cone.material.opacity = 0; }); },
  // put both trainers off-stage (before the walk-out)
  spot: p => trainerSpot(p),
  hide() { trainerObjs.forEach((tr, p) => { const s = trainerSpot(p); tr.root.position.set(s.x + Math.sign(s.x) * 6, 0, s.z + 3.4); }); },
  place() { trainerObjs.forEach(tr => tr.placeAtSpot()); },
  reset() { this.spotsOff(); this.place(); trainerObjs.forEach(t => { t.speedK = 10; t.rest(); t.jump = 0; t.model.heldBall.visible = false; t.model.keyStone.material.color.setRGB(1, 0.6, 1); t.model.keyStone.scale.setScalar(1); }); }
};

updaters.push((dt, t) => trainerObjs.forEach(tr => tr.update(dt, t)));
