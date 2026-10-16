
// Dev tool: loads models in a grid (normalised by bounding box) to check scale and facing.
const names = (new URLSearchParams(location.search).get('n') || 'charizard,pikachu,gengar,garchomp,lucario,snorlax,mewtwo,bulbasaur,gyarados,rayquaza,charizard-mega-x,dragonite').split(',');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight); document.body.append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x445566);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 3));
const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(3, 10, 8); scene.add(d);
const cols = 6, cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 200);
cam.position.set(0, 4, 26); cam.lookAt(0, 1.5, 0);
const loader = new THREE.GLTFLoader();
const draco = new THREE.DRACOLoader(); draco.setDecoderPath('/lib/addons/libs/draco/gltf/'); loader.setDRACOLoader(draco);
window.info = [];
let pending = names.length;
names.forEach((n, i) => {
  const m = MODELS[n];
  if (!m || !m.file) { pending--; return; }
  loader.load('/' + m.file, g => {
    const obj = g.scene;
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
    const s = 2.6 / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); holder.add(obj);
    obj.position.set(-c.x, -b2.min.y, -c.z);
    holder.position.set((i % cols - (cols - 1) / 2) * 3.6, Math.floor(i / cols) * -3.4 + 3.4, 0);
    scene.add(holder);
    window.info.push({ n, size: size.toArray().map(v => +v.toFixed(2)), clips: g.animations.length });
    if (--pending === 0) window.done = true;
  }, undefined, e => { window.info.push({ n, error: String(e) }); if (--pending === 0) window.done = true; });
});
(function loop() { requestAnimationFrame(loop); renderer.render(scene, cam); })();
