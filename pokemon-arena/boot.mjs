// Loads three.js r170 (ES modules) and exposes it as the global THREE for the game's
// classic scripts, then loads those scripts in order (listed in data-scripts).
import * as THREE_NS from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

window.THREE = Object.assign({}, THREE_NS, { GLTFLoader, DRACOLoader, SkeletonUtils, EffectComposer, RenderPass, UnrealBloomPass, OutputPass });

const list = document.querySelector('script[data-scripts]').dataset.scripts.split(',').map(s => s.trim()).filter(Boolean);
for (const src of list) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.body.append(s);
  });
}
