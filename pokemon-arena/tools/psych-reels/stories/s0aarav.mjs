// Character sheet for the Aarav art direction (adult.mjs): render with  node make.mjs --reel=0aarav --stills=0.5,1.5
import { W, H } from '../engine.mjs';
import { PAL, person, walk, texture, words, accent, AARAV } from '../adult.mjs';

const RIYA = { skin: '#d9a57e', hair: '#2b1d1d', hairStyle: 'long', top: '#f3e9d2', jacket: '#ef6f5e', pants: '#3a3550', shoes: '#2a2026', stubble: false, browW: 0.034 };
const MOM = { skin: '#c99068', hair: '#2a2228', hairStyle: 'bun', grey: '#b9b4b8', top: '#cc8424', kurta: true, dupatta: '#2a9d8f', pants: '#5d4a6a', shoes: '#4a3a34', stubble: false, browW: 0.034 };
const KABIR = { skin: '#b97f58', hair: '#1a1515', hairStyle: 'curly', top: '#5d6880', jacket: null, neckline: true, pants: '#2f3a4f', shoes: '#f3e9d2', stubble: true };

export default {
  slug: 'aarav-sheet', title: '', titleOut: 0, noFadeIn: true, endCard: false, overlay: (c, T) => texture(c, T),
  shots: [
    { id: 'sheet', min: 2,
      draw(c, t) {
        c.fillStyle = PAL.navy; c.fillRect(0, 0, W, H);
        c.fillStyle = PAL.navyM; c.fillRect(0, 470, W, 490);
        const ex = ['neutral', 'smug', 'annoyed', 'lonely'];
        person(c, { x: 80, y: 440, h: 380, t, face: { expr: 'smug', look: [0.6, 0] }, pose: { armF: [0.4, 1.9], handF: 'phone' }, prop: { type: 'phone', on: true } });
        person(c, { x: 215, y: 440, h: 380, t, face: { expr: 'confident', talk: 0.8 }, pose: { ...walk(t * 6, 1) } });
        person(c, { x: 350, y: 440, h: 380, t, flip: -1, style: RIYA, face: { expr: 'hurt' }, pose: { armF: [0.2, 0.4] } });
        person(c, { x: 470, y: 440, h: 360, t, flip: -1, style: MOM, face: { expr: 'neutral', talk: 0.6 }, pose: { armF: [0.9, 0.6] } });
        person(c, { x: 110, y: 900, h: 380, t, style: KABIR, face: { expr: 'happy' }, pose: { armF: [2.6, 0.3], handF: 'open' } });
        person(c, { x: 270, y: 900, h: 380, t, face: { expr: 'lonely', look: [0.2, 0.8] }, pose: { sit: 28, lean: 0.25, headTilt: 0.15, armF: [0.9, 0.9], handF: 'phone' }, prop: { type: 'phone', on: true } });
        person(c, { x: 430, y: 900, h: 380, t, face: { expr: 'surprised' }, pose: { armF: [1.6, 0.1], handF: 'point', shrug: 1 } });
        words(c, 'आरव', W / 2, 40, 30, { col: PAL.amber });
      } },
    { id: 'heads', min: 2,
      draw(c, t) {
        c.fillStyle = PAL.cream; c.fillRect(0, 0, W, H);
        const ex = ['neutral', 'smug', 'confident', 'annoyed', 'surprised', 'sad', 'lonely', 'happy'];
        ex.forEach((e, i) => { const x = 70 + (i % 4) * 133, y = 520 + Math.floor(i / 4) * 440; person(c, { x, y: y + 900, h: 1300, t: 1, face: { expr: e, blink: false }, shadow: false }); words(c, e, x + 20, y - 330 + 20, 18, { col: PAL.navy, ol: false }); });
      } },
  ],
};
