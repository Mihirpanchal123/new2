'use strict';
// =====================================================================
//  JART - Journey's pixel art, drawn in code (16 x 16 tiles, one canvas
//  pixel = one art pixel; journey.js scales it up without smoothing):
//  ground tiles, trees and props, buildings, furniture, and walking
//  people in 4 directions from the trainer outfits (OUTFITS in base.js).
// =====================================================================
const JArt = (() => {
  const TS = 16;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const hexc = n => n == null ? null : typeof n === 'string' ? n : '#' + n.toString(16).padStart(6, '0');
  const P = (g, col, x, y, w = 1, h = 1) => { if (col) { g.fillStyle = col; g.fillRect(x, y, w, h); } };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // darken / lighten a #rrggbb colour
  function shade(c, k) {
    const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0');
  }
  function outline(c, col = '#202028') {
    const g = c.getContext('2d', { willReadFrequently: true }), W = c.width, H = c.height;
    const d = g.getImageData(0, 0, W, H).data;
    const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
    g.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) g.fillRect(x, y, 1, 1);
    return c;
  }

  // ---------------------------------------------------------------------
  //  Ground (painted into the map's ground canvas, one tile at a time)
  // ---------------------------------------------------------------------
  const C = {
    grass: '#7cc858', grassD: '#68b448', grassL: '#98dc70', tuft: '#4e9a3a',
    path: '#dcc48c', pathD: '#c8ac70', pathL: '#ead6a4', sand: '#f0dca0', sandD: '#dcc488',
    water: '#5aa8f0', waterD: '#3c88d8', waterL: '#9ad0ff', foam: '#e8f6ff',
    tall: '#3f9a3c', tallD: '#2c7a2e', tallL: '#6cc458',
    floorW: '#c99458', floorWD: '#a8763e', floorWL: '#dcaa70', tile: '#e8e4dc', tileD: '#d0ccc4',
    wall: '#f2e6c8', wallD: '#d8c8a0', base: '#8a6440', voidC: '#2a2232', gym: '#7ccf8a', gymD: '#62b672'
  };
  // what each map character is
  const KIND = {
    '.': 'grass', ',': 'path', ':': 'sand', '~': 'water', ';': 'tall', '*': 'flowers', 'v': 'ledge', 'f': 'fence', 'T': 'tree', 'B': 'bush', 'r': 'rock', 'S': 'grass', 'p': 'pine',
    '#': 'wall', '_': 'wood', '+': 'tile', 'R': 'rug', 'm': 'mat', '<': 'stairsUp', '>': 'stairsDown', 'g': 'gymfloor', 'V': 'vine', 'k': 'void', 'c': 'cave', 'C': 'cavewall',
    // the later chapters: snowfields, ice, volcanic ash and lava, steel and psychic floors
    'n': 'snow', 'i': 'ice', 'o': 'ash', 'L': 'lava', 'h': 'metal', 'P': 'psyfloor',
    // Journey II (Meridia): city cobbles, rail tracks, boardwalk planks
    'u': 'cobble', '=': 'rail', 'b': 'plank'
  };
  const SOLID = new Set(['water', 'fence', 'tree', 'bush', 'rock', 'wall', 'vine', 'void', 'pine', 'cavewall', 'lava']);
  function grassAt(g, x0, y0, tx, ty) {
    P(g, C.grass, x0, y0, TS, TS);
    for (let i = 0; i < 5; i++) { const h = hash(tx, ty, i); const x = x0 + Math.floor(h * 15), y = y0 + Math.floor(hash(ty, tx, i + 9) * 15); P(g, i < 3 ? C.grassD : C.grassL, x, y, 1, 1); }
    if (hash(tx, ty, 77) < 0.35) { const x = x0 + 3 + Math.floor(hash(tx, ty, 5) * 9), y = y0 + 4 + Math.floor(hash(tx, ty, 6) * 8); P(g, C.tuft, x, y, 1, 2); P(g, C.tuft, x + 2, y, 1, 2); P(g, C.tuft, x + 1, y + 1, 1, 1); }
  }
  // ground under a character: what to paint first (paths, sand and water paint their own base)
  function tile(g, map, tx, ty, frame) {
    const ch = map.rows[ty][tx], k = KIND[ch] || 'grass', x0 = tx * TS, y0 = ty * TS;
    const at = (dx, dy) => { const r = map.rows[ty + dy]; const c = r && r[tx + dx]; return c == null ? null : KIND[c] || 'grass'; };
    switch (k) {
      case 'path': case 'sand': {
        const base = k === 'path' ? C.path : C.sand, dk = k === 'path' ? C.pathD : C.sandD;
        P(g, base, x0, y0, TS, TS);
        for (let i = 0; i < 4; i++) P(g, i % 2 ? dk : C.pathL, x0 + Math.floor(hash(tx, ty, i) * 15), y0 + Math.floor(hash(ty, tx, i) * 15), i % 2 ? 2 : 1, 1);
        // soft grass edges where the path meets grass
        const soft = n => n === 'grass' || n === 'tall' || n === 'flowers' || n === 'tree' || n === 'bush' || n === 'ledge' || n === 'pine';
        if (soft(at(0, -1))) { P(g, C.grassD, x0, y0, TS, 1); for (let x = 0; x < TS; x += 3) P(g, C.grass, x0 + x, y0 + 1, 2, 1); }
        if (soft(at(0, 1))) { P(g, C.grassD, x0, y0 + TS - 1, TS, 1); for (let x = 1; x < TS; x += 3) P(g, C.grass, x0 + x, y0 + TS - 2, 2, 1); }
        if (soft(at(-1, 0))) { P(g, C.grassD, x0, y0, 1, TS); for (let y = 0; y < TS; y += 3) P(g, C.grass, x0 + 1, y0 + y, 1, 2); }
        if (soft(at(1, 0))) { P(g, C.grassD, x0 + TS - 1, y0, 1, TS); for (let y = 1; y < TS; y += 3) P(g, C.grass, x0 + TS - 2, y0 + y, 1, 2); }
        break;
      }
      case 'water': {
        P(g, C.water, x0, y0, TS, TS);
        for (let i = 0; i < 3; i++) { const wy = y0 + 3 + i * 5, wx = x0 + ((Math.floor(hash(tx, ty + i, 3) * 10) + frame * 3) % 12); P(g, C.waterL, wx, wy, 4, 1); P(g, C.waterD, wx + 1, wy + 1, 3, 1); }
        const dry = n => n && n !== 'water';
        if (dry(at(0, -1))) { P(g, C.foam, x0, y0, TS, 2); P(g, C.waterL, x0, y0 + 2, TS, 1); }
        if (dry(at(0, 1))) P(g, C.waterD, x0, y0 + TS - 1, TS, 1);
        if (dry(at(-1, 0))) { P(g, C.foam, x0, y0, 2, TS); P(g, C.waterL, x0 + 2, y0, 1, TS); }
        if (dry(at(1, 0))) { P(g, C.foam, x0 + TS - 2, y0, 2, TS); P(g, C.waterL, x0 + TS - 3, y0, 1, TS); }
        break;
      }
      case 'tall': {
        grassAt(g, x0, y0, tx, ty);
        tallBlades(g, x0, y0, tx, ty, false);
        break;
      }
      case 'flowers': {
        grassAt(g, x0, y0, tx, ty);
        const cols = [['#ff6a6a', '#ffd84a'], ['#ffffff', '#ffd84a'], ['#ffd84a', '#ff9a3a'], ['#ff9ad8', '#ffffff']][Math.floor(hash(tx, ty, 4) * 4)];
        for (const [fx, fy] of [[3, 3], [10, 4], [6, 10], [12, 11]]) { const bob = (frame + fx) % 2; P(g, C.tuft, x0 + fx + 1, y0 + fy + 2, 1, 2); P(g, cols[0], x0 + fx, y0 + fy + bob, 3, 1); P(g, cols[0], x0 + fx + 1, y0 + fy - 1 + bob, 1, 3); P(g, cols[1], x0 + fx + 1, y0 + fy + bob, 1, 1); }
        break;
      }
      case 'ledge': {
        grassAt(g, x0, y0, tx, ty);
        P(g, '#a8e080', x0, y0 + 8, TS, 1); P(g, '#5a9a3a', x0, y0 + 9, TS, 2); P(g, '#447a2c', x0, y0 + 11, TS, 1);
        for (let x = 0; x < TS; x += 4) P(g, '#7ab858', x0 + x + 1, y0 + 9, 2, 1);
        break;
      }
      case 'fence': {
        grassAt(g, x0, y0, tx, ty);
        const L = at(-1, 0) === 'fence', Rr = at(1, 0) === 'fence', U = at(0, -1) === 'fence', D = at(0, 1) === 'fence';
        const wood = '#f6f2ea', woodD = '#b8b0a4';
        if (L || Rr || !(U || D)) { P(g, wood, x0 + (L ? 0 : 6), y0 + 5, (L ? 6 : 0) + (Rr ? 10 : 4), 2); P(g, woodD, x0 + (L ? 0 : 6), y0 + 7, (L ? 6 : 0) + (Rr ? 10 : 4), 1); P(g, wood, x0 + (L ? 0 : 6), y0 + 9, (L ? 6 : 0) + (Rr ? 10 : 4), 2); P(g, woodD, x0 + (L ? 0 : 6), y0 + 11, (L ? 6 : 0) + (Rr ? 10 : 4), 1); }
        if (U || D) { P(g, wood, x0 + 7, y0 + (U ? 0 : 4), 2, (U ? 4 : 0) + (D ? 12 : 8)); P(g, woodD, x0 + 9, y0 + (U ? 0 : 4), 1, (U ? 4 : 0) + (D ? 12 : 8)); }
        P(g, '#202028', x0 + 5, y0 + 3, 6, 1); P(g, wood, x0 + 6, y0 + 3, 4, 10); P(g, woodD, x0 + 9, y0 + 4, 1, 9); P(g, '#5a5048', x0 + 6, y0 + 13, 4, 1);
        break;
      }
      case 'wood': case 'rug': case 'mat': case 'stairsUp': case 'stairsDown': {
        P(g, C.floorW, x0, y0, TS, TS);
        for (let y = 0; y < TS; y += 4) { P(g, C.floorWD, x0, y0 + y + 3, TS, 1); P(g, C.floorWD, x0 + ((ty * 5 + y * 3) % 16), y0 + y, 1, 3); }
        if (k === 'rug') { P(g, '#c84848', x0, y0 + 1, TS, TS - 2); P(g, '#e8c058', x0, y0 + 2, TS, 1); P(g, '#e8c058', x0, y0 + TS - 3, TS, 1); for (let x = 2; x < TS; x += 4) P(g, '#a03838', x0 + x, y0 + 6, 2, 4); }
        if (k === 'mat') { P(g, '#a85a38', x0 + 1, y0 + 4, 14, 10); P(g, '#c87850', x0 + 2, y0 + 5, 12, 8); for (let x = 3; x < 14; x += 2) P(g, '#a85a38', x0 + x, y0 + 6, 1, 6); }
        if (k === 'stairsUp' || k === 'stairsDown') { for (let i = 0; i < 4; i++) { const c = k === 'stairsUp' ? shade('#b07848', -i * 0.12) : shade('#b07848', -(3 - i) * 0.15); P(g, c, x0 + 1, y0 + i * 4, 14, 4); P(g, '#5a3a20', x0 + 1, y0 + i * 4 + 3, 14, 1); } P(g, '#5a3a20', x0, y0, 1, TS); P(g, '#5a3a20', x0 + 15, y0, 1, TS); }
        break;
      }
      case 'tile': P(g, C.tile, x0, y0, TS, TS); P(g, C.tileD, x0, y0, TS, 1); P(g, C.tileD, x0, y0, 1, TS); if ((tx + ty) % 2) P(g, '#f4f0e8', x0 + 2, y0 + 2, 12, 12); break;
      case 'gymfloor': P(g, C.gym, x0, y0, TS, TS); P(g, C.gymD, x0, y0, TS, 1); P(g, C.gymD, x0, y0, 1, TS); if ((tx + ty) % 2) P(g, '#8cdc98', x0 + 3, y0 + 3, 10, 10); break;
      case 'cave': P(g, '#a08868', x0, y0, TS, TS); for (let i = 0; i < 4; i++) P(g, i % 2 ? '#8a7458' : '#b49c7c', x0 + Math.floor(hash(tx, ty, i) * 14), y0 + Math.floor(hash(ty, tx, i) * 14), 2, 1); break;
      case 'cavewall': { P(g, '#5a4a3c', x0, y0, TS, TS); const open = at(0, 1) && at(0, 1) !== 'cavewall'; if (open) { P(g, '#7a6650', x0, y0 + 6, TS, 10); P(g, '#4a3c30', x0, y0 + 15, TS, 1); for (let x = 0; x < TS; x += 5) P(g, '#8e7a62', x0 + x + (ty % 3), y0 + 8, 2, 4); } break; }
      case 'wall': {
        const face = at(0, 1) && at(0, 1) !== 'wall' && at(0, 1) !== 'void';
        if (face) {
          P(g, C.wall, x0, y0, TS, TS);
          for (let x = 2; x < TS; x += 6) P(g, C.wallD, x0 + x, y0, 1, TS - 3);
          P(g, '#e0d0a8', x0, y0, TS, 2); P(g, C.base, x0, y0 + TS - 3, TS, 3); P(g, shade(C.base, -0.3), x0, y0 + TS - 1, TS, 1);
        } else { P(g, C.voidC, x0, y0, TS, TS); if (at(0, 1) === 'wall') P(g, '#3e3448', x0, y0 + TS - 2, TS, 2); }
        break;
      }
      case 'vine': {
        P(g, C.gym, x0, y0, TS, TS);
        P(g, '#2e7a34', x0, y0 + 2, TS, TS - 2); P(g, '#1e5a26', x0, y0 + TS - 2, TS, 2);
        for (let i = 0; i < 7; i++) { const lx = x0 + Math.floor(hash(tx, ty, i) * 13), ly = y0 + 2 + Math.floor(hash(ty, tx, i) * 10); P(g, '#4aa850', lx, ly, 3, 2); P(g, '#7ad06a', lx, ly, 1, 1); }
        if (hash(tx, ty, 50) < 0.3) { P(g, '#ff8ac8', x0 + 6, y0 + 5, 2, 2); P(g, '#ffe070', x0 + 6, y0 + 5, 1, 1); }
        break;
      }
      case 'void': P(g, C.voidC, x0, y0, TS, TS); break;
      case 'snow': {
        P(g, '#eef4fa', x0, y0, TS, TS);
        for (let i = 0; i < 5; i++) P(g, i % 2 ? '#d4e2f0' : '#ffffff', x0 + Math.floor(hash(tx, ty, i) * 14), y0 + Math.floor(hash(ty, tx, i) * 14), i % 2 ? 2 : 1, 1);
        if (hash(tx, ty, 31) < 0.3) { const x = x0 + 3 + Math.floor(hash(tx, ty, 32) * 8), y = y0 + 4 + Math.floor(hash(tx, ty, 33) * 8); P(g, '#c4d6ea', x, y, 4, 1); P(g, '#ffffff', x + 1, y - 1, 2, 1); }
        break;
      }
      case 'ice': {
        P(g, '#bfe4f6', x0, y0, TS, TS); P(g, '#a4d4ee', x0, y0 + TS - 1, TS, 1); P(g, '#a4d4ee', x0 + TS - 1, y0, 1, TS);
        const s = Math.floor(hash(tx, ty, 7) * 8); P(g, '#ffffff', x0 + 2 + s, y0 + 3, 3, 1); P(g, '#e8f8ff', x0 + 3 + s, y0 + 4, 4, 1);
        break;
      }
      case 'ash': P(g, '#8a7e76', x0, y0, TS, TS); for (let i = 0; i < 5; i++) P(g, i % 2 ? '#6e625c' : '#a2968c', x0 + Math.floor(hash(tx, ty, i) * 14), y0 + Math.floor(hash(ty, tx, i) * 14), 2, 1); break;
      case 'lava': {
        P(g, '#d8401c', x0, y0, TS, TS);
        for (let i = 0; i < 3; i++) { const ly = y0 + 2 + i * 5, lx = x0 + ((Math.floor(hash(tx, ty + i, 3) * 10) + frame * 4) % 12); P(g, '#ffb030', lx, ly, 4, 1); P(g, '#ff7a1c', lx + 1, ly + 1, 3, 1); }
        const cool = n => n && n !== 'lava';
        if (cool(at(0, -1))) { P(g, '#5a2a1a', x0, y0, TS, 2); P(g, '#ff9a3a', x0, y0 + 2, TS, 1); }
        if (cool(at(-1, 0))) P(g, '#5a2a1a', x0, y0, 2, TS);
        if (cool(at(1, 0))) P(g, '#5a2a1a', x0 + TS - 2, y0, 2, TS);
        break;
      }
      case 'metal': P(g, '#9aa4b0', x0, y0, TS, TS); P(g, '#7a8490', x0, y0, TS, 1); P(g, '#7a8490', x0, y0, 1, TS); P(g, '#b8c2cc', x0 + 1, y0 + 1, TS - 2, 1); for (const [rx, ry] of [[3, 3], [12, 3], [3, 12], [12, 12]]) P(g, '#6a7480', x0 + rx, y0 + ry, 1, 1); break;
      case 'psyfloor': P(g, '#7a5aa8', x0, y0, TS, TS); P(g, '#5e4488', x0, y0, TS, 1); P(g, '#5e4488', x0, y0, 1, TS); if ((tx + ty) % 2) { P(g, '#9a7ac8', x0 + 4, y0 + 4, 8, 8); P(g, '#c8a8f0', x0 + 7, y0 + 7, 2, 2); } break;
      case 'cobble': {
        P(g, '#a8a098', x0, y0, TS, TS);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const sx = x0 + c * 8 + (r % 2 ? 4 : 0) - 4, sy = y0 + r * 4, h = hash(tx * 3 + c, ty * 4 + r, 3);
          const col = h < 0.33 ? '#b8b0a6' : h < 0.66 ? '#9e968c' : '#aea69c';
          const a = Math.max(x0, sx + 1), b = Math.min(x0 + TS, sx + 7);
          if (b > a) { P(g, col, a, sy + 1, b - a, 2); P(g, '#d0c8be', a, sy + 1, Math.min(2, b - a), 1); }
        }
        for (let r = 0; r < 4; r++) P(g, '#7e766e', x0, y0 + r * 4, TS, 1);
        break;
      }
      case 'rail': {
        const vert = at(0, -1) === 'rail' || at(0, 1) === 'rail', horiz = at(-1, 0) === 'rail' || at(1, 0) === 'rail';
        P(g, '#8a7a68', x0, y0, TS, TS); for (let i = 0; i < 6; i++) P(g, i % 2 ? '#7a6a58' : '#9a8a76', x0 + Math.floor(hash(tx, ty, i) * 15), y0 + Math.floor(hash(ty, tx, i) * 15), 2, 1);
        if (horiz && !vert) { for (let x = 1; x < TS; x += 5) P(g, '#6a4a30', x0 + x, y0 + 2, 3, 12); P(g, '#c8ccd4', x0, y0 + 4, TS, 1); P(g, '#c8ccd4', x0, y0 + 11, TS, 1); P(g, '#7a7e88', x0, y0 + 5, TS, 1); P(g, '#7a7e88', x0, y0 + 12, TS, 1); }
        else { for (let y = 1; y < TS; y += 5) P(g, '#6a4a30', x0 + 2, y0 + y, 12, 3); P(g, '#c8ccd4', x0 + 4, y0, 1, TS); P(g, '#c8ccd4', x0 + 11, y0, 1, TS); P(g, '#7a7e88', x0 + 5, y0, 1, TS); P(g, '#7a7e88', x0 + 12, y0, 1, TS); }
        break;
      }
      case 'plank': {
        P(g, '#b8885a', x0, y0, TS, TS);
        for (let x = 0; x < TS; x += 4) { P(g, '#8a6038', x0 + x, y0, 1, TS); P(g, '#c89a6a', x0 + x + 1, y0, 1, TS); }
        for (let x = 0; x < TS; x += 4) P(g, '#6a4a2a', x0 + x + 2, y0 + ((tx * 7 + x) % 12) + 2, 1, 1);
        if (at(0, 1) === 'water') P(g, '#6a4a2a', x0, y0 + TS - 2, TS, 2);
        break;
      }
      default: grassAt(g, x0, y0, tx, ty);
    }
  }
  // tall grass blades; front = only the lower blades (drawn over a person's feet)
  function tallBlades(g, x0, y0, tx, ty, front) {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const bx = x0 + c * 4 + (r ? 2 : 0) - 1, by = y0 + (r ? 9 : 2);
      if (front && !r) continue;
      P(g, C.tallD, bx, by + 3, 4, 3); P(g, C.tall, bx, by + 1, 1, 4); P(g, C.tall, bx + 2, by, 1, 5); P(g, C.tallL, bx + 1, by + 2, 1, 3); P(g, C.tall, bx + 3, by + 2, 1, 3);
    }
  }
  const tallFront = (() => { let c = null; return () => { if (!c) { c = cv(TS, TS); tallBlades(c.getContext('2d'), 0, 0, 0, 0, true); } return c; }; })();

  // ---------------------------------------------------------------------
  //  Standing props (drawn sorted by their feet)
  // ---------------------------------------------------------------------
  const cache = new Map();
  const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
  function tree(variant = 0) {
    return once('tree' + variant, () => {
      const c = cv(20, 30), g = c.getContext('2d');
      const L = ['#4aa850', '#3c9446', '#58b85c'][variant % 3], D = shade(L, -0.32), H = shade(L, 0.3);
      P(g, '#7a5232', 8, 20, 4, 8); P(g, '#5a3a20', 11, 20, 1, 8); P(g, '#5a3a20', 7, 27, 6, 1);
      const blob = (x, y, w, h, col) => { P(g, col, x + 1, y, w - 2, h); P(g, col, x, y + 1, w, h - 2); };
      blob(1, 9, 18, 12, D); blob(2, 4, 16, 13, L); blob(4, 1, 12, 9, L); blob(5, 2, 7, 4, H); blob(3, 7, 4, 3, H);
      for (let i = 0; i < 6; i++) P(g, D, 3 + Math.floor(hash(i, variant) * 13), 6 + Math.floor(hash(variant, i) * 11), 2, 1);
      return outline(c);
    });
  }
  function pine() {
    return once('pine', () => {
      const c = cv(18, 30), g = c.getContext('2d');
      P(g, '#6a4a2e', 7, 23, 4, 6);
      const L = '#2f7a4c', D = '#215c38', H = '#4a9a64';
      for (let i = 0; i < 4; i++) { const y = 2 + i * 5, w = 6 + i * 3; P(g, D, 9 - w / 2 - 1, y + 4, w + 2, 3); P(g, L, 9 - w / 2, y, w, 5); P(g, H, 9 - w / 2 + 1, y + 1, 2, 2); }
      return outline(c);
    });
  }
  function bush() {
    return once('bush', () => { const c = cv(16, 14), g = c.getContext('2d'); P(g, '#3c8a3e', 1, 4, 14, 9); P(g, '#4aa850', 2, 2, 12, 9); P(g, '#68c060', 4, 3, 4, 3); P(g, '#2e6e32', 2, 11, 12, 2); return outline(c); });
  }
  function rock() {
    return once('rock', () => { const c = cv(16, 13), g = c.getContext('2d'); P(g, '#8a8a92', 1, 4, 14, 8); P(g, '#a8a8b0', 3, 2, 10, 8); P(g, '#c8c8d0', 4, 3, 4, 2); P(g, '#6a6a72', 2, 10, 12, 2); return outline(c); });
  }
  function sign() {
    return once('sign', () => { const c = cv(16, 16), g = c.getContext('2d'); P(g, '#7a5232', 7, 9, 2, 6); P(g, '#c89058', 1, 2, 14, 8); P(g, '#a87040', 1, 9, 14, 1); for (let y = 4; y < 9; y += 2) P(g, '#8a5a30', 3, y, 10, 1); return outline(c); });
  }
  function ballItem() {
    return once('ballItem', () => { const c = cv(10, 10), g = c.getContext('2d'); P(g, '#e83838', 2, 1, 6, 4); P(g, '#e83838', 1, 2, 8, 3); P(g, '#f4f4f4', 1, 5, 8, 3); P(g, '#f4f4f4', 2, 8, 6, 1); P(g, '#202028', 1, 5, 8, 1); P(g, '#f4f4f4', 4, 4, 2, 2); P(g, '#ffffff', 3, 2, 1, 1); return outline(c); });
  }
  function mailbox() {
    return once('mailbox', () => { const c = cv(12, 16), g = c.getContext('2d'); P(g, '#7a5232', 5, 8, 2, 7); P(g, '#e04848', 1, 2, 10, 7); P(g, '#a83030', 1, 8, 10, 1); P(g, '#ffffff', 3, 4, 6, 1); return outline(c); });
  }
  function lamp() {
    return once('lamp', () => { const c = cv(10, 30), g = c.getContext('2d'); P(g, '#3a3a48', 4, 6, 2, 22); P(g, '#2a2a34', 2, 27, 6, 2); P(g, '#3a3a48', 2, 1, 6, 6); P(g, '#ffe68a', 3, 2, 4, 4); return outline(c); });
  }
  // an Echo Shrine: an old stone lantern with a pale blue flame (Journey II)
  function shrine() {
    return once('shrine', () => { const c = cv(14, 24), g = c.getContext('2d'); P(g, '#8a8a98', 3, 18, 8, 5); P(g, '#a8a8b8', 2, 16, 10, 3); P(g, '#9a9aaa', 4, 8, 6, 8); P(g, '#c8c8d8', 1, 5, 12, 3); P(g, '#7a7a8a', 2, 2, 10, 3);
      P(g, '#a8d8ff', 5, 9, 4, 5); P(g, '#e8f6ff', 6, 10, 2, 3); P(g, '#6a6a7a', 6, 0, 2, 2); return outline(c); });
  }
  // a Lumen Company lantern: brass post, warm white glow (Journey II)
  function lumenlamp() {
    return once('lumenlamp', () => { const c = cv(12, 30), g = c.getContext('2d'); P(g, '#8a6a2a', 5, 8, 2, 20); P(g, '#6a4a1a', 3, 27, 6, 2); P(g, '#b08a3a', 2, 2, 8, 7); P(g, '#fff8e0', 3, 3, 6, 5); P(g, '#ffe68a', 4, 4, 4, 3); P(g, '#8a6a2a', 5, 0, 2, 2); return outline(c); });
  }
  function shard() {
    return once('shard', () => { const c = cv(10, 12), g = c.getContext('2d'); P(g, '#7a4ad8', 3, 1, 4, 10); P(g, '#a07af0', 2, 3, 6, 6); P(g, '#e0d0ff', 4, 2, 1, 4); return outline(c); });
  }

  // ---------------------------------------------------------------------
  //  Buildings: w x h tiles; the door is a tile on the bottom row
  // ---------------------------------------------------------------------
  const BUILD = {
    house: { w: 5, h: 4, door: [[2, 3]] }, house2: { w: 5, h: 4, door: [[2, 3]] }, house3: { w: 5, h: 4, door: [[2, 3]] },
    lab: { w: 7, h: 5, door: [[3, 4]] }, center: { w: 6, h: 5, door: [[2, 4], [3, 4]] }, mart: { w: 5, h: 4, door: [[2, 3]] },
    gym: { w: 8, h: 6, door: [[3, 5], [4, 5]] }, museum: { w: 8, h: 5, door: [[3, 4], [4, 4]] },
    // Journey II: a Warden's lighthouse, the Lumen sky tower (and the Great Lantern), a railway station
    lighthouse: { w: 5, h: 7, door: [[2, 6]] }, tower: { w: 8, h: 8, door: [[3, 7], [4, 7]] }, station: { w: 8, h: 5, door: [[3, 4], [4, 4]] }
  };
  function window2(g, x, y, w = 12, h = 10, lit) {
    P(g, '#5a4632', x - 1, y - 1, w + 2, h + 2); P(g, lit ? '#ffe8a0' : '#8cc8f0', x, y, w, h); P(g, lit ? '#fff4c8' : '#c8e8ff', x + 1, y + 1, 3, 2);
    P(g, '#f4f0e8', x + Math.floor(w / 2) - 1, y, 2, h); P(g, '#f4f0e8', x, y + Math.floor(h / 2) - 1, w, 1); P(g, '#5a4632', x - 1, y + h + 1, w + 2, 1);
  }
  function roof(g, w, h, col, eaveY) {
    const D = shade(col, -0.28), Lc = shade(col, 0.22);
    P(g, D, 0, eaveY - 2, w, 3);
    P(g, col, 2, 1, w - 4, eaveY - 2);
    for (let y = 4; y < eaveY - 2; y += 4) P(g, D, 2, y, w - 4, 1);
    for (let y = 2; y < eaveY - 2; y += 8) for (let x = 4 + (y % 16 ? 4 : 0); x < w - 4; x += 8) P(g, D, x, y + 2, 1, 2);
    P(g, Lc, 2, 1, w - 4, 2);
    P(g, shade(col, -0.45), 1, 1, 1, eaveY - 1); P(g, shade(col, -0.45), w - 2, 1, 1, eaveY - 1);
  }
  function building(kind, variant = 0) {
    return once('b:' + kind + variant, () => {
      const B = BUILD[kind], W = B.w * TS, H = B.h * TS, c = cv(W, H), g = c.getContext('2d');
      const door = (dx, wide) => {
        const x = dx * TS + 2, y = H - 22, w = wide ? 28 : 12;
        P(g, '#3a2a1e', x - 1, y - 1, w + 2, 23);
        if (kind === 'center' || kind === 'mart' || kind === 'gym' || kind === 'museum' || kind === 'tower' || kind === 'station') { P(g, '#9ad8f8', x, y, w, 22); P(g, '#d8f4ff', x + 1, y + 1, 2, 18); if (wide) P(g, '#5a7a8a', x + w / 2 - 1, y, 2, 22); }
        else { P(g, '#a86a3a', x, y, w, 22); P(g, '#8a522a', x + 1, y + 2, w - 2, 1); P(g, '#8a522a', x + 1, y + 10, w - 2, 1); P(g, '#ffd84a', x + w - 3, y + 12, 1, 2); }
        P(g, '#9a9088', x - 2, H - 1, w + 4, 1);
      };
      const walls = (top, col, colD) => { P(g, col, 1, top, W - 2, H - top); for (let x = 6; x < W - 2; x += 10) P(g, colD, x, top + 2, 1, H - top - 4); P(g, colD, 1, H - 4, W - 2, 3); P(g, shade(colD, -0.25), 1, top, W - 2, 1); };
      if (kind === 'house' || kind === 'house2' || kind === 'house3') {
        const rc = ['#d84838', '#3c78d0', '#3c9a58', '#a058c8'][(variant + (kind === 'house2' ? 1 : kind === 'house3' ? 2 : 0)) % 4];
        walls(28, '#f2e2c0', '#d8c49c'); roof(g, W, H, rc, 30);
        window2(g, 7, 37); window2(g, W - 19, 37); door(2);
        P(g, '#9a8a7a', W - 20, 4, 6, 10); P(g, '#7a6a5a', W - 20, 4, 6, 2);   // chimney
      } else if (kind === 'lab') {
        walls(32, '#f4f4f4', '#d4d8dc'); roof(g, W, H, '#7a8a9a', 34);
        window2(g, 8, 44, 18, 12); window2(g, W - 26, 44, 18, 12); door(3);
        P(g, '#c8d0d8', W - 26, 6, 14, 8); P(g, '#9aa8b4', W - 22, 2, 6, 6); P(g, '#e04848', W - 20, 4, 2, 2);   // the rooftop dish
        P(g, '#3a7ad8', 6, 36, W - 12, 3);
      } else if (kind === 'center') {
        walls(34, '#f6f6f6', '#dcdcdc'); roof(g, W, H, '#e04848', 36);
        P(g, '#e04848', 1, 37, W - 2, 3);
        window2(g, 8, 46, 14, 12); window2(g, W - 22, 46, 14, 12); door(2, true);
        // the Poké Ball sign on the roof
        const cx = W / 2, cy = 16;
        P(g, '#ffffff', cx - 7, cy - 6, 14, 12); P(g, '#ffffff', cx - 8, cy - 4, 16, 8); P(g, '#e04848', cx - 6, cy - 5, 12, 5); P(g, '#202028', cx - 8, cy, 16, 1); P(g, '#202028', cx - 2, cy - 2, 4, 4); P(g, '#ffffff', cx - 1, cy - 1, 2, 2);
      } else if (kind === 'mart') {
        walls(30, '#f6f6f6', '#dcdcdc'); roof(g, W, H, '#3c78d0', 32);
        P(g, '#3c78d0', 8, 34, W - 16, 8); for (const [x, y] of [[0, 0], [1, 0], [3, 0], [4, 0], [0, 1], [2, 1], [4, 1], [0, 2], [4, 2], [0, 3], [4, 3], [0, 4], [4, 4]]) P(g, '#ffffff', W / 2 - 5 + x * 2, 35 + y + 1, 2, 1);
        window2(g, 6, 46, 10, 9); window2(g, W - 16, 46, 10, 9); door(2);
      } else if (kind === 'gym') {
        const rc = ['#3c9a58', '#3c78d0', '#e0b030', '#d85030', '#9a58c8', '#7a8a9a', '#58b8e0', '#c8a028'][variant % 8];   // leaf, tide, spark, ember, mind, iron, glacier, the League
        walls(40, '#ece4d4', '#d0c4ac'); roof(g, W, H, rc, 42);
        P(g, shade(rc, -0.2), 4, 44, 6, H - 44); P(g, shade(rc, -0.2), W - 10, 44, 6, H - 44);   // pillars
        window2(g, 14, 52, 12, 12); window2(g, W - 26, 52, 12, 12); door(3, true);
        // the emblem
        const cx = W / 2, cy = 20;
        P(g, '#ffd84a', cx - 9, cy - 9, 18, 18); P(g, '#b08a1a', cx - 9, cy + 8, 18, 1); P(g, '#ffffff', cx - 7, cy - 7, 14, 14);
        // a leaf, a drop, a bolt or a flame (by gym)
        const ART = [['......##', '....####', '...#####', '..#####.', '.#####..', '.####...', '.##.....', '#.......'], ['...##...', '...##...', '..####..', '.######.', '.######.', '########', '.######.', '..####..'],
          ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.###....', '.##.....'], ['...#....', '..##..#.', '..###.##', '.######.', '########', '########', '.######.', '..####..'],
          ['........', '..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..####..', '........'], ['...##...', '.#.##.#.', '..####..', '###..###', '###..###', '..####..', '.#.##.#.', '...##...'],
          ['...#....', '.#.#.#..', '..###...', '#######.', '..###...', '.#.#.#..', '...#....', '........'], ['........', '#..##..#', '##.##.##', '########', '########', '.######.', '.######.', '........']][variant % 8];
        ART.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') P(g, rc, cx - 4 + x, cy - 4 + y, 1, 1); }));
        P(g, shade(rc, 0.45), cx - 1, cy - 2, 2, 2);
      } else if (kind === 'lighthouse') {
        // a white tower with coloured bands, a gallery and the lamp room on top
        const band = ['#3c78d0', '#7a8a9a', '#3c9a58', '#b07a3a', '#e878a8', '#7a58b8', '#4a68b0', '#d85030'][variant % 8];
        const cx = W / 2, k0 = y => (y - 22) / (H - 24), hw = y => Math.round(11 + k0(y) * 10);
        for (let y = 22; y < H - 1; y++) { P(g, '#f4f0e8', cx - hw(y), y, hw(y) * 2, 1); P(g, '#d4ccc0', cx + hw(y) - 4, y, 4, 1); }
        for (const y0 of [36, 58, 80]) for (let y = y0; y < y0 + 8; y++) { P(g, band, cx - hw(y), y, hw(y) * 2, 1); P(g, shade(band, -0.25), cx + hw(y) - 4, y, 4, 1); }
        P(g, '#3a3a48', cx - 16, 18, 32, 4); P(g, '#5a5a68', cx - 16, 18, 32, 1);
        for (let x = cx - 15; x < cx + 15; x += 4) P(g, '#3a3a48', x, 12, 1, 6);
        P(g, '#ffe68a', cx - 9, 6, 18, 12); P(g, '#fff6c8', cx - 6, 8, 6, 6); P(g, '#3a3a48', cx - 1, 6, 2, 12);
        P(g, band, cx - 11, 2, 22, 5); P(g, shade(band, -0.3), cx - 11, 6, 22, 1); P(g, '#3a3a48', cx - 1, 0, 2, 3);
        window2(g, cx - 4, 47, 8, 7, true); window2(g, cx - 4, 69, 8, 7);
        door(2);
      } else if (kind === 'tower') {
        // glass and brass: the Lumen Company's sky tower (and, in Frostcrown, the Great Lantern)
        P(g, '#5a5a6a', 4, 30, W - 8, H - 30); P(g, '#3a3a4a', W - 12, 30, 8, H - 30);
        for (let y = 34; y < H - 28; y += 12) for (let x = 10; x < W - 14; x += 12) { P(g, '#7ab8e8', x, y, 8, 8); P(g, '#c8e8ff', x + 1, y + 1, 2, 3); P(g, '#ffe68a', x + 5, y + 5, 2, 2); }
        P(g, '#b08a3a', 2, 28, W - 4, 4); P(g, '#d8b058', 2, 28, W - 4, 1);
        P(g, '#5a5a6a', 16, 10, W - 32, 18); P(g, '#b08a3a', 14, 8, W - 28, 3);
        P(g, '#ffe68a', W / 2 - 8, 12, 16, 12); P(g, '#fff6c8', W / 2 - 4, 14, 8, 6); P(g, '#b08a3a', W / 2 - 1, 0, 2, 9);
        P(g, '#d8b058', 4, H - 26, W - 8, 2);
        door(3, true);
      } else if (kind === 'station') {
        walls(30, '#e0c8a8', '#c4a884'); roof(g, W, H, '#5a6a7a', 32);
        P(g, '#f4f0e8', W / 2 - 12, 4, 24, 14); P(g, '#3a3a48', W / 2 - 12, 4, 24, 1); P(g, '#3a3a48', W / 2, 7, 1, 6); P(g, '#3a3a48', W / 2, 11, 5, 1);
        for (let x = 10; x < W - 8; x += 22) if (x < W / 2 - 18 || x > W / 2 + 10) window2(g, x, 44, 12, 12);
        door(3, true);
      } else if (kind === 'museum') {
        walls(32, '#e8e0d0', '#ccc0a8'); roof(g, W, H, '#8a6a4a', 34);
        for (let x = 10; x < W - 8; x += 20) { P(g, '#f6f2ea', x, 38, 6, H - 40); P(g, '#c8c0b0', x + 5, 38, 1, H - 40); }
        door(3, true);
      }
      return outline(c);
    });
  }

  // ---------------------------------------------------------------------
  //  Furniture (inside): w x h tiles, solid
  // ---------------------------------------------------------------------
  const FURN = {
    bed: { w: 1, h: 2 }, table: { w: 2, h: 1 }, tv: { w: 1, h: 1 }, pc: { w: 1, h: 1 }, shelf: { w: 2, h: 1 }, plant: { w: 1, h: 1 },
    counter: { w: 4, h: 1 }, healer: { w: 1, h: 1 }, martshelf: { w: 3, h: 1 }, fridge: { w: 1, h: 1 }, stove: { w: 1, h: 1 }, sofa: { w: 2, h: 1 },
    desk: { w: 2, h: 1 }, machine: { w: 2, h: 1 }, statue: { w: 1, h: 1 }, chair: { w: 1, h: 1 }, ballstand: { w: 3, h: 1 }, boxes: { w: 1, h: 1 }
  };
  function furniture(kind) {
    return once('f:' + kind, () => {
      const F0 = FURN[kind], W = F0.w * TS, H = F0.h * TS + 8, c = cv(W, H), g = c.getContext('2d');
      switch (kind) {
        case 'bed': P(g, '#8a5a30', 1, 4, 14, H - 5); P(g, '#5a8ad8', 2, 13, 12, H - 16); P(g, '#7aa8f0', 2, 13, 12, 2); P(g, '#ffffff', 3, 6, 10, 6); P(g, '#e0e0e8', 3, 10, 10, 2); break;
        case 'table': P(g, '#8a5a30', 2, 14, 2, 9); P(g, '#8a5a30', W - 4, 14, 2, 9); P(g, '#c8884a', 0, 6, W, 9); P(g, '#e0a464', 1, 7, W - 2, 2); P(g, '#ffffff', 6, 8, 5, 3); break;
        case 'tv': P(g, '#3a3a48', 1, 6, 14, 12); P(g, '#5ac8f0', 3, 8, 10, 7); P(g, '#a8e8ff', 4, 9, 3, 2); P(g, '#2a2a34', 4, 18, 8, 4); break;
        case 'pc': P(g, '#c8ccd4', 1, 4, 14, 12); P(g, '#3a7ad8', 3, 6, 10, 7); P(g, '#9ad0ff', 4, 7, 3, 2); P(g, '#a8acb4', 0, 16, 16, 7); P(g, '#5a5a68', 3, 18, 10, 2); break;
        case 'shelf': P(g, '#8a5a30', 0, 0, W, H - 1); for (let y = 2; y < H - 3; y += 6) { P(g, '#5a3a20', 1, y + 4, W - 2, 1); for (let x = 2; x < W - 2; x += 3) P(g, ['#d84838', '#3c78d0', '#e0b030', '#3c9a58'][(x + y) % 4], x, y, 2, 4); } break;
        case 'plant': P(g, '#b8683a', 4, 14, 8, 8); P(g, '#8a4a28', 4, 14, 8, 1); P(g, '#3c9a46', 2, 3, 12, 11); P(g, '#5ab85a', 4, 1, 6, 6); P(g, '#2e7a34', 6, 9, 4, 4); break;
        case 'counter': P(g, '#e04848', 0, 6, W, 4); P(g, '#f4f0e8', 0, 10, W, H - 10); P(g, '#d8d0c4', 0, H - 3, W, 2); for (let x = 8; x < W; x += 16) P(g, '#d8d0c4', x, 12, 1, H - 15); break;
        case 'healer': P(g, '#c8ccd4', 0, 6, 16, 16); P(g, '#e04848', 1, 7, 14, 3); for (let i = 0; i < 6; i++) { const x = 2 + (i % 3) * 4, y = 12 + Math.floor(i / 3) * 4; P(g, '#e83838', x, y, 3, 2); P(g, '#ffffff', x, y + 2, 3, 1); } break;
        case 'martshelf': P(g, '#8a8a96', 0, 0, W, H - 1); for (let y = 2; y < H - 3; y += 6) { P(g, '#5a5a68', 1, y + 4, W - 2, 1); for (let x = 2; x < W - 2; x += 4) P(g, ['#e04848', '#4a98e8', '#f0d048', '#58c070', '#e878c8'][(x + y) % 5], x, y + 1, 3, 3); } break;
        case 'fridge': P(g, '#f0f0f4', 1, 0, 14, H - 1); P(g, '#c8c8d0', 1, 9, 14, 1); P(g, '#9a9aa4', 12, 3, 1, 4); P(g, '#9a9aa4', 12, 12, 1, 6); break;
        case 'stove': P(g, '#d8d8e0', 0, 6, 16, H - 7); P(g, '#3a3a48', 2, 7, 5, 4); P(g, '#3a3a48', 9, 7, 5, 4); P(g, '#5a5a68', 2, 14, 12, 7); break;
        case 'sofa': P(g, '#c8584a', 0, 4, W, H - 6); P(g, '#e07a68', 3, 10, W - 6, 6); P(g, '#a8463a', 0, 4, 3, H - 6); P(g, '#a8463a', W - 3, 4, 3, H - 6); break;
        case 'desk': P(g, '#a87040', 0, 6, W, 8); P(g, '#7a5030', 1, 14, 3, 9); P(g, '#7a5030', W - 4, 14, 3, 9); P(g, '#f4f4f4', 4, 3, 7, 4); P(g, '#3a7ad8', 18, 1, 9, 6); break;
        case 'machine': P(g, '#9aa4b0', 0, 2, W, H - 3); P(g, '#5a6470', 2, 4, W - 4, 6); for (let x = 3; x < W - 3; x += 4) P(g, ['#5aff8a', '#ffd84a', '#ff6a6a'][x % 3], x, 6, 2, 2); P(g, '#7a8490', 2, 14, W - 4, 8); break;
        case 'statue': P(g, '#9a9aa4', 3, 14, 10, 8); P(g, '#b8b8c0', 2, 12, 12, 3); P(g, '#c8c8d0', 4, 2, 8, 10); P(g, '#e8e8f0', 5, 3, 3, 3); P(g, '#ffd84a', 6, 6, 4, 2); break;
        case 'chair': P(g, '#a86a3a', 3, 6, 10, 4); P(g, '#c8884a', 3, 10, 10, 6); P(g, '#7a4a28', 3, 16, 2, 6); P(g, '#7a4a28', 11, 16, 2, 6); break;
        case 'ballstand': P(g, '#8a5a30', 0, 10, W, H - 11); P(g, '#c8884a', 0, 8, W, 4); for (let i = 0; i < 3; i++) { const x = 4 + i * 16; P(g, '#e83838', x, 2, 8, 4); P(g, '#f4f4f4', x, 6, 8, 3); P(g, '#202028', x, 6, 8, 1); P(g, '#ffffff', x + 3, 5, 2, 2); } break;
        case 'boxes': P(g, '#c8945a', 1, 6, 14, H - 7); P(g, '#a87440', 1, 6, 14, 2); P(g, '#e0b070', 7, 6, 2, H - 7); break;
      }
      return outline(c);
    });
  }

  // ---------------------------------------------------------------------
  //  People: 16 x 22 frames, 4 directions x (stand, step, step)
  // ---------------------------------------------------------------------
  const SKIN = '#f6cfa8';
  function personFrame(o, dir, step) {
    const c = cv(16, 22), g = c.getContext('2d', { willReadFrequently: true });
    const col = k => hexc(o[k]);
    const hair = col('hair') || '#3a2a1e', top = col('top') || '#d83838', inner = col('inner') || top, legs = col('legs') || '#2f4b8f', shoes = col('shoes') || '#333344', hatC = col('hatColor'), skin = o.skin || SKIN;
    const lift = (side) => step === side ? 1 : 0;
    const side = dir === 'left' || dir === 'right';
    if (!side) {
      const back = dir === 'up';
      if (o.hairStyle === 'long') P(g, hair, 3, 5, 10, back ? 8 : 7);
      // legs and shoes (a step lifts one foot)
      const legH = 4;
      if (o.legStyle === 'skirt') { P(g, legs, 4, 15, 8, 3); P(g, skin, 5, 18, 2, 2 - lift(1)); P(g, skin, 9, 18, 2, 2 - lift(2)); }
      else if (o.legStyle === 'shorts') { P(g, legs, 5, 15, 6, 3); P(g, skin, 5, 18, 2, 2 - lift(1)); P(g, skin, 9, 18, 2, 2 - lift(2)); }
      else { P(g, legs, 5, 15, 2, legH + 1 - lift(1)); P(g, legs, 9, 15, 2, legH + 1 - lift(2)); P(g, legs, 5, 15, 6, 2); }
      P(g, shoes, 4, 20 - lift(1), 3, 1); P(g, shoes, 9, 20 - lift(2), 3, 1);
      // body and arms (arms swing a pixel with the step)
      P(g, top, 4, 9, 8, 7); if (!back && inner !== top) P(g, inner, 7, 9, 2, 6);
      if (o.scarf) P(g, hexc(o.scarf), 4, 9, 8, 2);
      const sleeve = i => o.sleeves === 'long' ? top : o.sleeves === 'short' && i < 2 ? top : skin;
      for (let i = 0; i < 5; i++) { P(g, sleeve(i), 2, 9 + i + lift(2), 2, 1); P(g, sleeve(i), 12, 9 + i + lift(1), 2, 1); }
      P(g, skin, 2, 14 + lift(2), 2, 1); P(g, skin, 12, 14 + lift(1), 2, 1);
      if (back && o.bag) { P(g, hexc(o.bag), 5, 10, 6, 5); P(g, shade(hexc(o.bag), -0.3), 5, 14, 6, 1); }
      else if (!back && o.bag) { P(g, '#5a3a20', 5, 9, 1, 6); P(g, '#5a3a20', 10, 9, 1, 6); }
      // head
      P(g, skin, 4, 2, 8, 8);
      if (back) P(g, hair, 4, 1, 8, 8);
      else { P(g, hair, 4, 1, 8, 3); P(g, hair, 4, 3, 1, 4); P(g, hair, 11, 3, 1, 4); P(g, '#202028', 6, 5, 1, 2); P(g, '#202028', 9, 5, 1, 2); P(g, shade(skin, -0.12), 7, 8, 2, 1); }
      if (o.hairStyle === 'spiky') for (let x = 3; x < 13; x += 2) P(g, hair, x, 0, 1, 2);
      if (o.hairStyle === 'pigtails') { P(g, hair, 2, 4, 2, 4); P(g, hair, 12, 4, 2, 4); }
      switch (o.hat) {
        case 'cap': case 'capback': P(g, hatC, 4, 0, 8, 3); if (!back && o.hat === 'cap') { P(g, hexc(o.hatFront), 6, 1, 4, 1); P(g, shade(hatC, -0.25), 4, 3, 8, 1); } break;
        case 'beanie': P(g, hatC, 4, 0, 8, 3); P(g, hexc(o.hatFront) || '#ffffff', 4, 2, 8, 1); P(g, hexc(o.hatFront) || '#ffffff', 7, -0, 2, 1); break;
        case 'sunhat': P(g, hatC, 2, 2, 12, 1); P(g, hatC, 4, 0, 8, 2); P(g, hexc(o.hatBand), 4, 1, 8, 1); break;
        case 'bandana': P(g, hatC, 4, 1, 8, 2); if (back) P(g, hatC, 7, 3, 2, 2); break;
      }
    } else {
      // facing right (left is the mirror)
      const fwd = step === 1 ? 1 : step === 2 ? -1 : 0;
      if (o.hairStyle === 'long') P(g, hair, 4, 4, 4, 8);
      if (o.legStyle === 'skirt' || o.legStyle === 'shorts') { P(g, legs, 5, 15, 6, 3); P(g, skin, 7 + fwd, 18, 2, 2); P(g, skin, 7 - fwd, 18, 2, 2); }
      else { P(g, legs, 6 - fwd, 15, 3, 5); P(g, legs, 7 + fwd, 15, 3, 5); }
      P(g, shoes, 6 - fwd, 20, 3, 1); P(g, shoes, 8 + fwd, 20, 3, 1);
      P(g, top, 5, 9, 6, 7);
      if (o.bag) { P(g, hexc(o.bag), 3, 10, 3, 5); }
      if (o.scarf) P(g, hexc(o.scarf), 5, 9, 6, 2);
      const sleeve = i => o.sleeves === 'long' ? top : o.sleeves === 'short' && i < 2 ? top : skin;
      for (let i = 0; i < 5; i++) P(g, sleeve(i), 7 + Math.round(fwd * i / 3), 9 + i, 2, 1);
      P(g, skin, 7 + fwd * 2, 14, 2, 1);
      P(g, skin, 5, 2, 7, 8);
      P(g, hair, 4, 1, 6, 4); P(g, hair, 4, 4, 3, 5);
      P(g, '#202028', 10, 5, 1, 2); P(g, shade(skin, -0.12), 11, 7, 1, 1);
      if (o.hairStyle === 'spiky') for (let x = 4; x < 11; x += 2) P(g, hair, x, 0, 1, 2);
      if (o.hairStyle === 'pigtails') P(g, hair, 2, 4, 2, 4);
      switch (o.hat) {
        case 'cap': P(g, hatC, 4, 0, 8, 3); P(g, shade(hatC, -0.2), 11, 2, 3, 1); break;
        case 'capback': P(g, hatC, 4, 0, 8, 3); P(g, shade(hatC, -0.2), 2, 2, 3, 1); break;
        case 'beanie': P(g, hatC, 4, 0, 8, 3); P(g, hexc(o.hatFront) || '#ffffff', 4, 2, 8, 1); break;
        case 'sunhat': P(g, hatC, 2, 2, 12, 1); P(g, hatC, 5, 0, 7, 2); P(g, hexc(o.hatBand), 5, 1, 7, 1); break;
        case 'bandana': P(g, hatC, 4, 1, 7, 2); P(g, hatC, 2, 2, 2, 2); break;
      }
    }
    outline(c);
    if (dir === 'left') { const m = cv(16, 22), mg = m.getContext('2d'); mg.translate(16, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); return m; }
    return c;
  }
  function person(o) {
    const key = 'p:' + JSON.stringify(o);
    return once(key, () => {
      const out = {};
      for (const d of ['down', 'up', 'left', 'right']) out[d] = [0, 1, 2].map(s => personFrame(o, d, s));
      // a face for the dialog box: head and shoulders
      const pc = cv(16, 14), pg = pc.getContext('2d'); pg.drawImage(out.down[0], 0, 0, 16, 14, 0, 0, 16, 14);
      out.face = pc.toDataURL();
      return out;
    });
  }
  return { TS, KIND, SOLID, BUILD, FURN, tile, tallFront, tree, pine, bush, rock, sign, ballItem, mailbox, lamp, shard, shrine, lumenlamp, building, furniture, person, shade, hash };
})();
