'use strict';
// =====================================================================
//  CORE (3D) — renderer + bloom, scene, lights and texture helpers.
//  Loaded on demand with the rest of the 3D engine (see base.js / boot.mjs).
// =====================================================================
const FIELD = { w: 16, d: 10 };            // field size in theme units (themes are drawn at this size)
const ARENA_SCALE = 1.35;                  // ...and scaled up in the world
const ROAM = { hx: 6.2 * ARENA_SCALE, hz: 3.7 * ARENA_SCALE };
const SPAWN_X = [-4 * ARENA_SCALE, 4 * ARENA_SCALE];
const TRAINER_X = [-9.4 * ARENA_SCALE, 9.4 * ARENA_SCALE];

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(...frameSize());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
frameEl.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, frameSize()[0] / frameSize()[1], 0.1, 300);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffffff, 0x556b44, 2.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(6, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 90 });
scene.add(sun);

// Bloom makes bright move effects glow; OutputPass applies tone mapping + sRGB
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.35, 1.3);
composer.addPass(bloom);
composer.addPass(new THREE.OutputPass());
World.bloom = bloom;
World.bloomBase = 0.42;

World.resize = () => {
  const [w, h] = frameSize();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
};
addEventListener('resize', World.resize);

// ---------------------------------------------------------------------
//  Texture / material helpers
// ---------------------------------------------------------------------
const toon = (color, extra) => new THREE.MeshToonMaterial({ color, ...extra });
function canvasTex(w, h, draw, rx = 1, ry = 1, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function gradientTex(stops) {
  return canvasTex(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
function speckle(ctx, w, h, colors, count, size) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    const s = size * rnd(0.5, 1.5);
    ctx.globalAlpha = rnd(0.25, 0.8);
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  ctx.globalAlpha = 1;
}
const glowTex = canvasTex(64, 64, (ctx, w, h) => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
const shadowTex = canvasTex(64, 64, ctx => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
});

// ---------------------------------------------------------------------
//  Hook into the shared render loop (base.js)
// ---------------------------------------------------------------------
World.canvas3D = renderer.domElement;
World.renderFrame = dt => {
  bloom.strength = lerp(bloom.strength, World.bloomBase, 1 - Math.exp(-dt * 3));
  if (!World.skip3D) composer.render(dt);
};
