// 2.5D sprite baker (offline, build time). Renders a .glb model with the Retro 2D arena's camera and light
// into pixel-art frames: a fixed 3/4 view from above, key light from the upper left (the arena's shadows fall
// down-right), a cool rim light, then crisp nearest-neighbour downsampling, a reduced palette and a dark outline
// like the hand-made sprites. Frames face LEFT, like the Showdown sprites the game flips at runtime.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('../lib/addons/libs/draco/gltf/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

const SS = 4;                       // supersampling: render 4x larger, then reduce to the art pixel grid
const ELEV = 0.38;                  // camera elevation (radians): the arena is seen from above at a slant
const YAW = -0.95;                  // model turned so it faces screen-left and a little toward the viewer

// which model clips become which battle animation (first match wins)
const CLIP_RULES = {
  idle: [/battlewait01_loop/, /defaultwait01_loop/, /aidle/, /bd_wait00/, /bd_battle/, /wait/i, /idle/i],
  move: [/run01_loop/, /001run/, /bd_run/, /walk01_loop/, /run/i, /walk/i],
  attack: [/[^e]attack01$/, /fight_b/, /bd_attack$/, /attack/i, /fight/i],
  hurt: [/damage01/, /bd_damage/, /damage/i],
  down: [/down01_start/, /001ko/, /bd_fall/, /down/i, /ko/i]
};
const LOOP = { idle: true, move: true, attack: false, hurt: false, down: false };
const FPS = { idle: 10, move: 14, attack: 16, hurt: 16, down: 12 };
const MAXF = { idle: 16, move: 12, attack: 14, hurt: 8, down: 10 };

function pickClip(clips, rules) {
  for (const r of rules) { const c = clips.find(c => r.test(c.name)); if (c) return c; }
  return null;
}

// palette reduction: each channel to 12 levels (removes smooth 3D gradients without posterising faces)
const Q = v => Math.round(Math.round(v / 255 * 11) * 255 / 11);

window.bake = async ({ glbBase64, heightPx }) => {
  const bytes = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));
  const gltf = await loader.parseAsync(bytes.buffer, '');
  const root = gltf.scene;
  const pivot = new THREE.Group();
  pivot.add(root);
  root.rotation.y = YAW;

  const scene = new THREE.Scene();
  scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4a60, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8c8ff, 1.4); rim.position.set(4, 2, -4); scene.add(rim);
  root.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.frustumCulled = false;
      // matte, a little toon-like: kills glossy highlights that read as noise at sprite size
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { if ('roughness' in m) m.roughness = Math.max(0.75, m.roughness ?? 1); if ('metalness' in m) m.metalness = 0; }
    }
  });

  const mixer = new THREE.AnimationMixer(root);
  const plan = {};
  for (const [kind, rules] of Object.entries(CLIP_RULES)) {
    const clip = pickClip(gltf.animations, rules);
    if (!clip) continue;
    const n = Math.max(1, Math.min(MAXF[kind], Math.round(clip.duration * FPS[kind])));
    plan[kind] = { clip, n, fps: n / Math.max(0.05, clip.duration) };
  }
  if (!plan.idle) plan.idle = { clip: null, n: 1, fps: 1 };           // a model with no animation: one still pose
  const pose = (kind, i) => {
    mixer.stopAllAction();
    const p = plan[kind];
    if (p.clip) {
      const a = mixer.clipAction(p.clip); a.reset(); a.play();
      mixer.setTime(LOOP[kind] ? i / p.n * p.clip.duration : Math.min(p.clip.duration - 1e-3, i / Math.max(1, p.n - 1) * p.clip.duration));
    }
    root.updateMatrixWorld(true);
  };

  // framing: the union of the model's bounds over every frame we are going to render, seen from the camera
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  const dir = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
  const box = new THREE.Box3(), b = new THREE.Box3();
  for (const kind of Object.keys(plan)) for (let i = 0; i < plan[kind].n; i++) { pose(kind, i); b.setFromObject(root, true); box.union(b); }
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const R = size.length() * 0.5;
  cam.position.copy(center).addScaledVector(dir, R * 4);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  // project a box's 8 corners to find its screen-space extent
  const inv = cam.matrixWorldInverse;
  const extent = bx => { const e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }; for (let k = 0; k < 8; k++) { const p = new THREE.Vector3(k & 1 ? bx.max.x : bx.min.x, k & 2 ? bx.max.y : bx.min.y, k & 4 ? bx.max.z : bx.min.z).applyMatrix4(inv); e.x0 = Math.min(e.x0, p.x); e.x1 = Math.max(e.x1, p.x); e.y0 = Math.min(e.y0, p.y); e.y1 = Math.max(e.y1, p.y); } return e; };
  const { x0: sx0, x1: sx1, y0: sy0, y1: sy1 } = extent(box);
  // art-pixel size: the STANDING pose gets the requested height (a long tail swinging in one animation would
  // otherwise shrink the whole character); the frame is still big enough for every pose; 2 px border for the outline
  pose('idle', 0); b.setFromObject(root, true);
  const ie = extent(b), unitPx = heightPx / Math.max(1e-6, ie.y1 - ie.y0);
  const fw = Math.ceil((sx1 - sx0) * unitPx) + 4, fh = Math.ceil((sy1 - sy0) * unitPx) + 4;
  cam.left = sx0 - 2 / unitPx; cam.right = sx0 + (fw - 2) / unitPx; cam.top = sy1 + 2 / unitPx; cam.bottom = sy1 - (fh - 2) / unitPx;
  cam.near = 0.01; cam.far = R * 10; cam.updateProjectionMatrix();

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(fw * SS, fh * SS, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const kinds = Object.keys(plan);
  const cols = Math.max(...kinds.map(k => plan[k].n));
  const sheet = document.createElement('canvas'); sheet.width = cols * fw; sheet.height = kinds.length * fh;
  const sg = sheet.getContext('2d');
  const small = document.createElement('canvas'); small.width = fw; small.height = fh;
  const smg = small.getContext('2d', { willReadFrequently: true });
  // where the model stands on the ground (its origin) in frame pixels: the runtime pins this point to the
  // Pokémon's ground position, so the shadow stays under the feet whatever a tail or wing is doing
  const g0 = new THREE.Vector3(0, 0, 0).applyMatrix4(inv);
  const meta = { fw, fh, foot: [+((g0.x - cam.left) * unitPx).toFixed(1), +((cam.top - g0.y) * unitPx).toFixed(1)], clips: {} };

  kinds.forEach((kind, row) => {
    const p = plan[kind];
    meta.clips[kind] = { row, n: p.n, fps: +p.fps.toFixed(2), loop: LOOP[kind], clip: p.clip ? p.clip.name : null };
    for (let i = 0; i < p.n; i++) {
      pose(kind, i);
      renderer.render(scene, cam);
      // reduce to the art grid: average each SSxSS block (alpha-weighted), then hard alpha and the palette
      smg.clearRect(0, 0, fw, fh);
      smg.imageSmoothingEnabled = true; smg.imageSmoothingQuality = 'high';
      smg.drawImage(renderer.domElement, 0, 0, fw, fh);
      const img = smg.getImageData(0, 0, fw, fh), d = img.data;
      for (let j = 0; j < d.length; j += 4) {
        if (d[j + 3] < 110) { d[j + 3] = 0; continue; }
        const a = d[j + 3] / 255;                                    // un-premultiply the edge blend
        d[j] = Q(Math.min(255, d[j] / a)); d[j + 1] = Q(Math.min(255, d[j + 1] / a)); d[j + 2] = Q(Math.min(255, d[j + 2] / a)); d[j + 3] = 255;
      }
      // 1 px outline: transparent pixels touching the sprite become a dark edge (like the hand-drawn sprites)
      const solid = j => d[j * 4 + 3] === 255, out = new Uint8Array(fw * fh);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const k = y * fw + x; if (solid(k)) continue;
        if ((x > 0 && solid(k - 1)) || (x < fw - 1 && solid(k + 1)) || (y > 0 && solid(k - fw)) || (y < fh - 1 && solid(k + fw))) out[k] = 1;
      }
      for (let k = 0; k < out.length; k++) if (out[k]) { d[k * 4] = 26; d[k * 4 + 1] = 22; d[k * 4 + 2] = 34; d[k * 4 + 3] = 255; }
      smg.putImageData(img, 0, 0);
      sg.drawImage(small, i * fw, row * fh);
    }
  });
  const preview = sheet.cloneNode(); preview.getContext('2d').drawImage(sheet, 0, 0);
  preview.style.width = sheet.width * 3 + 'px';
  document.getElementById('out').append(preview);
  renderer.dispose();
  return { png: sheet.toDataURL('image/png'), meta };
};
window.bakerReady = true;
