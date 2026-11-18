// A character sheet for checking the rig (not a reel): node make.mjs --reel=0 --stills=1
import { W, H, toon, title } from '../engine.mjs';
const EX = ['neutral', 'happy', 'joy', 'sad', 'cry', 'scared', 'shock', 'angry', 'tired', 'worried', 'smirk', 'determined'];
export default {
  slug: 'sheet', title: '',
  shots: [{ min: 3, draw(c, t) {
    c.fillStyle = '#6a6f86'; c.fillRect(0, 0, W, H);
    EX.forEach((e, i) => { const x = 70 + (i % 4) * 133, y = 200 + Math.floor(i / 4) * 210; toon(c, { x, y, h: 170, face: i % 2 ? 1 : 0, t: 1, expr: e, noBlink: true, style: i === 4 ? { beard: '#ccc', hair: '#ccc', hairStyle: 'messy' } : i === 5 ? { kid: true, hairStyle: 'kid' } : i === 7 ? { top: 'suit', jacket: '#333a4a', hairStyle: 'neat' } : i === 8 ? { crown: true, top: 'robe', robe: '#8a2a3a', cape: '#6a1a2a' } : i === 9 ? { hairStyle: 'long', shirt: '#c45a8a' } : i === 10 ? { pack: 2, packGlow: '#ff6' } : {} }); title(c, e, x, y + 22, 14); });
    const poses = [{ walk: 1 }, { walk: 2.5, run: true }, { sit: true }, { crouch: 0.7, lean: 0.5 }];
    poses.forEach((p, i) => toon(c, { x: 70 + i * 133, y: 900, h: 150, face: 1, t: 1, pose: p, expr: 'neutral', noBlink: true }));
  } }],
};
