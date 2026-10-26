'use strict';
// =====================================================================
//  PIXELMON — animated pixel sprites for Adventure mode, drawn in the
//  three-quarter view of the Mystery Dungeon games (PMD Sprite Collab,
//  pmd/ - see pmd/CREDITS.md; built by tools/build-pmd.mjs). Each
//  Pokémon walks in 8 directions and has its own idle, attack, ranged
//  attack, power-up, hurt, sleep and faint animations.
//  An actor stands in for a live 3D model (retro.js treats both the
//  same: anim / play / drive / dispose), so the battle engine's moves,
//  hit reactions and knockouts drive the sprite without knowing it.
// =====================================================================
const PixelMons = (() => {
  let INDEX = null;
  const index = () => INDEX || (INDEX = fetch('pmd/index.json').then(r => r.ok ? r.json() : {}).catch(() => ({})));
  const SHEETS = new Map();                            // 'species/File' -> Promise<Image>
  const sheet = (sp, file) => {
    const key = sp + '/' + file;
    if (!SHEETS.has(key)) SHEETS.set(key, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `pmd/${sp}/${file}.png`; }));
    return SHEETS.get(key);
  };
  // the sheets' rows: Down, DownRight, Right, UpRight, Up, UpLeft, Left, DownLeft
  const ROW_OF_SECTOR = [2, 1, 0, 7, 6, 5, 4, 3];     // sector 0 = right, counting clockwise in 45° steps
  const ROW_X = [0, 1, 1, 1, 0, -1, -1, -1];          // which way a row looks sideways
  const MIRROR = [0, 7, 6, 5, 4, 3, 2, 1];
  const ACTION = { attack: 'Attack', special: 'Shoot', roar: 'Charge', guard: 'Charge', win: 'Charge', hurt: 'Hurt', down: 'Faint' };
  const PX = 3;                                        // one sprite pixel = one art pixel of the world (3 world units)

  async function has(species) { const ix = await index(); return !!ix[species]; }
  function preload(species) { return index().then(ix => ix[species] && Promise.all(Object.values(ix[species].anims).map(a => sheet(species, a.f)))).catch(() => null); }

  async function create(species) {
    const meta = (await index())[species];
    if (!meta) return null;
    const anims = {};
    for (const [name, a] of Object.entries(meta.anims)) { const img = await sheet(species, a.f); if (img) anims[name] = { ...a, img, total: a.d.reduce((s, d) => s + d, 0) }; }
    if (!anims.Walk) return null;
    // one canvas the size of the largest frame; every frame is drawn centred in it (the sheets share that centre)
    const CW = Math.max(...Object.values(anims).map(a => a.w)), CH = Math.max(...Object.values(anims).map(a => a.h));
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const g = cv.getContext('2d');
    // where it stands and how big it is: the opaque box of its first walking frame, facing the viewer
    const W = anims.Walk, probe = document.createElement('canvas'); probe.width = W.w; probe.height = W.h;
    const pg = probe.getContext('2d', { willReadFrequently: true }); pg.drawImage(W.img, 0, 0, W.w, W.h, 0, 0, W.w, W.h);
    const px = pg.getImageData(0, 0, W.w, W.h).data;
    let x0 = W.w, y0 = W.h, x1 = -1, y1 = -1;
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) if (px[(y * W.w + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = W.w - 1; y1 = W.h - 1; }
    const ox = (CW - W.w) / 2, oy = (CH - W.h) / 2;
    const anim = { frames: [{ img: cv, dur: 1 }], total: 1, w: CW, h: CH, src: 'pmd:' + species, pmd: true, px: PX, ver: 0,
      box: { x0: ox + x0, y0: oy + y0, x1: ox + x1, y1: oy + y1 }, bw: x1 - x0 + 1, bh: y1 - y0 + 1, foot: [CW / 2, oy + y1 + 1] };
    return new Actor(anims, anim, g, meta.shadow);
  }

  class Actor {
    constructor(anims, anim, g, shadow) {
      Object.assign(this, { anims, anim, g, shadowSize: shadow, pmd: true, shadow: null, dir: 0, base: 'Idle', act: null, t: 0, rate: 1, frozen: false, drawn: '' });
      this.paint();
    }
    // a battle event: play the matching animation once (a knockout holds its last frame)
    play(kind) {
      let name = ACTION[kind] || 'Charge';
      if (!this.anims[name]) name = name === 'Shoot' ? 'Attack' : name === 'Faint' ? 'Hurt' : this.anims.Charge ? 'Charge' : 'Idle';
      this.act = { name, t: 0, hold: kind === 'down' };
      // strikes and casts face the foe squarely: a straight up or down view turns to the diagonal on the foe's side
      if (ROW_X[this.dir] === 0 && this.face) this.dir = this.dir === 4 ? (this.face > 0 ? 3 : 5) : (this.face > 0 ? 1 : 7);
      return true;
    }
    // every frame: s = { face, vx, vy, run, moving, sleep, frozen, slow, stagger } (as retro.js gives a live model)
    drive(dt, s) {
      this.face = Math.sign(s.face) || this.face || 1;
      const sp = Math.hypot(s.vx || 0, s.vy || 0);
      if (!this.act) {
        if (s.moving && sp > 30) {
          // the way it walks, in 8 directions (the ground is seen at a slant, so up/down count a bit more)
          const a = Math.atan2((s.vy || 0) / 0.75, s.vx || 0), k = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
          this.dir = ROW_OF_SECTOR[k];
        } else if (ROW_X[this.dir] * this.face < 0) this.dir = MIRROR[this.dir];   // standing: it turns to look at its foe
      }
      this.base = s.sleep && this.anims.Sleep ? 'Sleep' : s.moving && sp > 30 ? 'Walk' : 'Idle';
      this.rate = this.base === 'Walk' ? Math.min(1.7, Math.max(0.6, sp / 140)) : 1;
      const k = s.frozen ? 0 : s.slow ? 0.5 : 1;
      if (this.act) {
        const a = this.anims[this.act.name];
        this.act.t += dt * 60 * k;
        if (this.act.t >= a.total) { if (this.act.hold) this.act.t = a.total - 0.01; else this.act = null; }
      }
      this.t += dt * 60 * this.rate * k;
      this.paint();
    }
    // draw the current frame into the shared canvas (only when it changes)
    paint() {
      const name = this.act ? this.act.name : this.base, a = this.anims[name] || this.anims.Idle || this.anims.Walk;
      let t = this.act ? this.act.t : this.t % a.total, f = 0;
      while (f < a.d.length - 1 && t >= a.d[f]) { t -= a.d[f]; f++; }
      const row = Math.min(this.dir, Math.floor(a.img.height / a.h) - 1), key = name + row + '/' + f;
      if (key === this.drawn) return;
      this.drawn = key;
      const { w: CW, h: CH } = this.anim;
      this.g.clearRect(0, 0, CW, CH);
      this.g.drawImage(a.img, f * a.w, row * a.h, a.w, a.h, Math.round((CW - a.w) / 2), Math.round((CH - a.h) / 2), a.w, a.h);
      this.anim.ver++;
    }
    dispose() {}
  }
  return { has, preload, create };
})();
