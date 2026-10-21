// Loads the game's classic scripts in order (listed in data-scripts). The 3D engine —
// three.js r170 (ES modules, exposed as the global THREE) plus the 3D scripts — is only
// fetched when 3D mode is picked: window.load3D() loads it once and resolves when ready.
const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error('failed to load ' + src));
  document.body.append(s);
});

const SCRIPTS_3D = ['models.js', 'core.js', 'arenas.js', 'actors.js', 'trainers.js', 'vfx.js'];
let loading3D = null;
window.load3D = () => loading3D || (loading3D = (async () => {
  const [THREE_NS, { GLTFLoader }, { DRACOLoader }, SkeletonUtils, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/utils/SkeletonUtils.js'),
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js')
  ]);
  window.THREE = Object.assign({}, THREE_NS, { GLTFLoader, DRACOLoader, SkeletonUtils, EffectComposer, RenderPass, UnrealBloomPass, OutputPass });
  for (const src of SCRIPTS_3D) await loadScript(src);
  if (window.init3D) window.init3D();
})().catch(e => { loading3D = null; throw e; }));

const list = document.querySelector('script[data-scripts]').dataset.scripts.split(',').map(s => s.trim()).filter(Boolean);
for (const src of list) await loadScript(src);
