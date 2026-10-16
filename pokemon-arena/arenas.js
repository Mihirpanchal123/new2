'use strict';
// =====================================================================
//  THEMED ARENAS — field markings, decor, particles, sky and lighting
// =====================================================================
// Battle-field markings: border, centre line, centre circle, Poké Ball emblem, trainer boxes
function drawFieldMarkings(ctx, w, h, { line = '#ffffff', alpha = 0.95, ball = true, width = 6 } = {}) {
  const sx = w / FIELD.w, sy = h / FIELD.d;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = line; ctx.lineWidth = width;
  ctx.strokeRect(0.4 * sx, 0.4 * sy, w - 0.8 * sx, h - 0.8 * sy);
  ctx.beginPath(); ctx.moveTo(w / 2, 0.4 * sy); ctx.lineTo(w / 2, h - 0.4 * sy); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 2.1 * sx, 0, Math.PI * 2); ctx.stroke();
  for (const side of [0, 1]) {
    const x = side ? w - 0.4 * sx - 2.2 * sx : 0.4 * sx;
    ctx.strokeRect(x, h / 2 - 2.2 * sy, 2.2 * sx, 4.4 * sy);
    ctx.beginPath(); ctx.arc(side ? w - 4 * sx : 4 * sx, h / 2, 0.9 * sx, 0, Math.PI * 2); ctx.stroke();
  }
  if (ball) {
    const r = 1.25 * sx, cx = w / 2, cy = h / 2;
    ctx.globalAlpha = Math.min(1, alpha + 0.05);
    ctx.fillStyle = '#e3350d'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(cx - r, cy - r * 0.09, r * 2, r * 0.18);
    ctx.lineWidth = r * 0.09; ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Themed arenas
// ---------------------------------------------------------------------
let themeGroup = null;
let themeUpdate = [];
let currentTheme = null;
// (World is created in core.js)

function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map !== glowTex) m.map.dispose(); m.dispose(); });
  });
}
function addField(g, tex, opts = {}) {
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.w, FIELD.d), new THREE.MeshToonMaterial({ map: tex, ...opts }));
  field.rotation.x = -Math.PI / 2; field.position.y = 0.01; field.receiveShadow = true;
  g.add(field);
  return field;
}
function addGround(g, tex, size = 140) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshToonMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.02; m.receiveShadow = true;
  g.add(m);
  return m;
}
function addGlow(g, color, x, y, z, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.set(x, y, z); s.scale.set(size, size, 1);
  g.add(s);
  return s;
}
// Particle field: mode 'rise' | 'fall' | 'float'
function addParticles(g, { count, color, size, area, mode, speed = 1, additive = true }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rnd(-area.x, area.x); pos[i * 3 + 1] = rnd(0, area.y); pos[i * 3 + 2] = rnd(-area.z, area.z);
    seed[i] = Math.random() * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  g.add(pts);
  themeUpdate.push((dt, t) => {
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      if (mode === 'rise') { pos[k + 1] += dt * speed * (0.6 + (seed[i] % 1)); pos[k] += Math.sin(t + seed[i]) * dt * 0.3; if (pos[k + 1] > area.y) pos[k + 1] = 0; }
      else if (mode === 'fall') { pos[k + 1] -= dt * speed * (0.6 + (seed[i] % 1)); pos[k] += Math.sin(t * 0.7 + seed[i]) * dt * 0.4; if (pos[k + 1] < 0) pos[k + 1] = area.y; }
      else { pos[k] += Math.sin(t * 0.5 + seed[i]) * dt * 0.4 * speed; pos[k + 1] += Math.cos(t * 0.7 + seed[i]) * dt * 0.25 * speed; }
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}
// Random points in an oval ring around the field, keeping the camera side clear
function ringPoints(n, rMin, rMax, { kz = 0.75, clearFront = true } = {}) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const a = Math.random() * Math.PI * 2, r = rnd(rMin, rMax);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * kz;
    if (clearFront && z > 5 && Math.abs(x) < 14) continue;
    if (Math.abs(Math.abs(x) - 9.4) < 3.5 && Math.abs(z) < 4.5) continue;   // keep the trainer spots clear
    out.push([x, z]);
  }
  return out;
}

function stadiumCrowd(g, tiers, kz) {
  const per = 260, count = per * tiers.length;
  const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), new THREE.MeshToonMaterial(), count);
  const base = [], dummy = new THREE.Object3D(), col = new THREE.Color();
  tiers.forEach(([r, y], ti) => {
    for (let i = 0; i < per; i++) {
      const a = (i / per) * Math.PI * 2 + ti * 0.01;
      base.push([Math.cos(a) * (r + 0.55), y + 0.25, Math.sin(a) * (r + 0.55) * kz, Math.random() * 6]);
      crowd.setColorAt(base.length - 1, col.setHSL(Math.random(), 0.45, rnd(0.35, 0.55)));
    }
  });
  g.add(crowd);
  themeUpdate.push((dt, t) => {
    const cheer = World.cheerLevel;
    for (let i = 0; i < count; i++) {
      const [x, y, z, s] = base[i];
      dummy.position.set(x, y + Math.max(0, Math.sin(t * (6 + cheer * 6) + s)) * (0.04 + cheer * 0.35), z);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
  });
}
function floodlight(g, x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 11, 10), toon(0x9ca3af));
  pole.position.set(x, 5.5, z); pole.castShadow = true; g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.4), toon(0x374151));
  head.position.set(x, 11.2, z); head.lookAt(0, 0, 0); g.add(head);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.95), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
  panel.position.copy(head.position).add(new THREE.Vector3(-x, -11, -z).normalize().multiplyScalar(0.22));
  panel.lookAt(0, 0, 0); g.add(panel);
  addGlow(g, 0xfff3c4, panel.position.x, panel.position.y, panel.position.z, 6);
}
function tree(g, x, z, s, leaf = 0x2f8f46, trunk = 0x7a4a24) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 1.4 * s, 7), toon(trunk));
  t.position.set(x, 0.7 * s, z); t.castShadow = true; g.add(t);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - i * 0.3) * s, 1.5 * s, 8), toon(i % 2 ? leaf : new THREE.Color(leaf).offsetHSL(0, 0, 0.06).getHex()));
    c.position.set(x, (1.6 + i * 0.75) * s, z); c.castShadow = true; g.add(c);
  }
}
function rock(g, x, z, s, color = 0x8b8f98) {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), toon(color));
  r.position.set(x, s * 0.5, z); r.rotation.set(Math.random(), Math.random(), Math.random()); r.castShadow = true;
  g.add(r);
  return r;
}

const THEMES = {
  stadium: {
    name: 'Pokémon Stadium',
    sky: [[0, '#5aa9ff'], [0.6, '#bfe3ff'], [1, '#eaf6ff']], fog: [0xcfe9ff, 40, 110],
    light: { sky: 0xffffff, ground: 0x4a6b3c, hemi: 0.5, sun: 0xfff6e0, sunI: 0.7 },
    build(g) {
      addGround(g, canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#4c9a44'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#3f8a38', '#5aa850'], 200, 2); }, 40, 40));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#3f9a3e' : '#368a36'; c.fillRect(i * w / 16, 0, w / 16 + 1, h); }
        speckle(c, w, h, ['#4aa646', '#2f7d2f'], 4000, 2);
        drawFieldMarkings(c, w, h);
      }));
      // field border and stepped oval stands
      const kz = 0.72;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(10.6, 10.6, 0.5, 72, 1, true), toon(0x1e40af, { side: THREE.DoubleSide }));
      rim.scale.z = kz; rim.position.y = 0.25; g.add(rim);
      const tiers = [];
      for (let i = 0; i < 5; i++) {
        const r = 10.6 + i * 1.15, y = 0.5 + i * 0.75;
        tiers.push([r, y]);
        const face = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y, 72, 1, true), toon(i % 2 ? 0x94a3b8 : 0xa8b3c4, { side: THREE.DoubleSide }));
        face.scale.z = kz; face.position.y = y / 2; g.add(face);
        const top = new THREE.Mesh(new THREE.RingGeometry(r, r + 1.15, 72), toon([0x9f1d1d, 0x1e3a8a, 0x334155, 0x1e3a8a, 0x9f1d1d][i], { side: THREE.DoubleSide }));
        top.rotation.x = -Math.PI / 2; top.scale.y = kz; top.position.y = y; g.add(top);
      }
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(16.4, 16.4, 6, 72, 1, true), toon(0x334155, { side: THREE.DoubleSide }));
      wall.scale.z = kz; wall.position.y = 3; g.add(wall);
      stadiumCrowd(g, tiers, kz);
      [[-14, -9], [14, -9], [-14, 9.5], [14, 9.5]].forEach(([x, z]) => floodlight(g, x, z));
      // banners on the back wall
      ['#dc2626', '#facc15', '#2563eb', '#16a34a', '#a855f7'].forEach((c, i) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
        const a = Math.PI + 0.45 + i * 0.55;
        b.position.set(Math.cos(a) * 16.2, 5, Math.sin(a) * 16.2 * kz); b.lookAt(0, 5, 0); g.add(b);
      });
    }
  },
  forest: {
    name: 'Viridian Forest',
    sky: [[0, '#7cc4a0'], [0.7, '#d7f0c8'], [1, '#f2fbe8']], fog: [0xbfe3c0, 26, 70],
    light: { sky: 0xf4ffe8, ground: 0x3d5c2c, hemi: 0.8, sun: 0xfff1c8, sunI: 0.75 },
    build(g) {
      addGround(g, canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#4f9a3c'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#3f8a30', '#62ad4a', '#7cc25c'], 700, 3); }, 40, 40));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        c.fillStyle = '#a7834f'; c.fillRect(0, 0, w, h);
        speckle(c, w, h, ['#8f6e3e', '#bb9762', '#7c5f35'], 6000, 3);
        speckle(c, w, h, ['#5aa046'], 900, 5);
        drawFieldMarkings(c, w, h, { line: '#f5ecd6', alpha: 0.7, ball: false });
      }), { transparent: false });
      ringPoints(90, 10, 26).forEach(([x, z]) => tree(g, x, z, rnd(0.9, 1.7), [0x2f8f46, 0x267a3a, 0x3a9e52][Math.floor(Math.random() * 3)]));
      ringPoints(30, 9, 14).forEach(([x, z]) => rock(g, x, z, rnd(0.3, 0.8), 0x7d8590));
      ringPoints(60, 8.8, 13).forEach(([x, z]) => {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: ['#f472b6', '#facc15', '#ffffff', '#a78bfa'][Math.floor(Math.random() * 4)] }));
        f.position.set(x, 0.12, z); g.add(f);
      });
      addParticles(g, { count: 120, color: 0xfff59d, size: 0.35, area: { x: 16, y: 5, z: 10 }, mode: 'float' });
    }
  },
  volcano: {
    name: 'Mt. Chimney Crater',
    sky: [[0, '#1a0505'], [0.55, '#7a1d0c'], [1, '#e2531c']], fog: [0x5a1a0c, 24, 70],
    light: { sky: 0xffb38a, ground: 0x2a0d05, hemi: 0.6, sun: 0xffa060, sunI: 0.9 },
    build(g) {
      const crack = (c, w, h, n) => {
        c.strokeStyle = '#ff7a1a'; c.shadowColor = '#ffb020'; c.shadowBlur = 8;
        for (let i = 0; i < n; i++) {
          c.lineWidth = rnd(1.5, 4); c.beginPath();
          let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += rnd(-60, 60); y += rnd(-60, 60); c.lineTo(x, y); }
          c.stroke();
        }
        c.shadowBlur = 0;
      };
      addGround(g, canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#2a1a16'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#3a2620', '#1b100d'], 900, 4); crack(c, w, h, 6); }, 25, 25));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        c.fillStyle = '#3b2a25'; c.fillRect(0, 0, w, h);
        speckle(c, w, h, ['#4a3530', '#2a1c18', '#5a4038'], 7000, 4);
        crack(c, w, h, 14);
        drawFieldMarkings(c, w, h, { line: '#ffb36b', alpha: 0.65, ball: false });
      }));
      // lava pools with scrolling glow
      const lavaTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#ff5a00'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#ffd23f', '#ff8c1a', '#c43a00'], 500, 8); }, 3, 3);
      ringPoints(9, 11, 20).forEach(([x, z]) => {
        const pool = new THREE.Mesh(new THREE.CircleGeometry(rnd(1.5, 3.2), 24), new THREE.MeshBasicMaterial({ map: lavaTex }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); g.add(pool);
        addGlow(g, 0xff6a00, x, 0.6, z, 6);
      });
      themeUpdate.push((dt, t) => { lavaTex.offset.set(t * 0.03, t * 0.02); });
      ringPoints(40, 10, 24).forEach(([x, z]) => {
        const s = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.5, 1.2), rnd(1.5, 4.5), 6), toon(0x2b1d19));
        s.position.set(x, s.geometry.parameters.height / 2, z); s.castShadow = true; g.add(s);
      });
      const vol = new THREE.Mesh(new THREE.ConeGeometry(18, 14, 24, 1, true), toon(0x2a1612, { side: THREE.DoubleSide }));
      vol.position.set(0, 7, -45); g.add(vol);
      addGlow(g, 0xff4a00, 0, 14, -45, 18);
      addParticles(g, { count: 220, color: 0xff8a2a, size: 0.25, area: { x: 20, y: 9, z: 12 }, mode: 'rise', speed: 1.2 });
    }
  },
  beach: {
    name: 'Sunny Beach',
    sky: [[0, '#2b8de8'], [0.6, '#8fd0ff'], [1, '#fff4d6']], fog: [0xbfe6ff, 40, 110],
    light: { sky: 0xffffff, ground: 0x9c8455, hemi: 0.45, sun: 0xfff2d0, sunI: 0.6 },
    build(g) {
      addGround(g, canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d9c28a'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#c8ae72', '#e6d3a2', '#bda066'], 900, 2); }, 40, 40));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        c.fillStyle = '#d8bd7c'; c.fillRect(0, 0, w, h);
        speckle(c, w, h, ['#d9c084', '#f2e2b4', '#c8ad70'], 8000, 3);
        drawFieldMarkings(c, w, h, { line: '#b8925a', alpha: 0.55, ball: false, width: 8 });
      }));
      // animated ocean behind the field
      const oceanGeo = new THREE.PlaneGeometry(160, 50, 80, 25);
      const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshToonMaterial({ color: 0x2f9ae0, transparent: true, opacity: 0.95 }));
      ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.05, -36); g.add(ocean);
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(160, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.07, -11.2); g.add(foam);
      const base = oceanGeo.attributes.position.array.slice();
      themeUpdate.push((dt, t) => {
        const a = oceanGeo.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) a[i + 2] = Math.sin(base[i] * 0.15 + t * 1.4) * 0.25 + Math.cos(base[i + 1] * 0.3 + t) * 0.2;
        oceanGeo.attributes.position.needsUpdate = true;
        foam.position.z = -11.2 + Math.sin(t * 0.8) * 0.5;
      });
      // palm trees, umbrellas
      ringPoints(22, 12.5, 24, { kz: 0.6 }).forEach(([x, z]) => {
        if (z < -9) return;
        const h = rnd(3.5, 5.5);
        for (let k = 0; k < 6; k++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, h / 6 + 0.05, 7), toon(0x9b6b3d));
          seg.position.set(x + Math.sin(k / 6 * 1.2) * 0.6, (k + 0.5) * h / 6, z); seg.castShadow = true; g.add(seg);
        }
        for (let k = 0; k < 6; k++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), toon(0x2e9e4f));
          const a = k / 6 * Math.PI * 2;
          leaf.scale.set(1.5, 0.12, 0.45);
          leaf.position.set(x + 0.6 + Math.cos(a) * 1.1, h - 0.15, z + Math.sin(a) * 1.1);
          leaf.rotation.y = -a; leaf.rotation.z = -0.35; leaf.castShadow = true; g.add(leaf);
        }
      });
      [[-12, 6, 0xef4444], [12, 5, 0x3b82f6], [-15, -3, 0xfacc15]].forEach(([x, z, c]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), toon(0xffffff)); pole.position.set(x, 1.2, z); g.add(pole);
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 12), toon(c)); top.position.set(x, 2.5, z); top.castShadow = true; g.add(top);
      });
      addGlow(g, 0xfff3b0, -30, 28, -70, 30);
    }
  },
  icecave: {
    name: 'Ice Path Cavern',
    sky: [[0, '#0b1730'], [0.6, '#1f4c7a'], [1, '#7cc4e8']], fog: [0x2a5a85, 22, 65],
    light: { sky: 0xcfefff, ground: 0x1d3550, hemi: 0.45, sun: 0xd8f3ff, sunI: 0.55 },
    build(g) {
      addGround(g, canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#6fa8cc'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#9cc9e6', '#4f8ab3'], 600, 4);
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rnd(-40, 40); y += rnd(-40, 40); c.lineTo(x, y); } c.stroke(); }
      }, 25, 25));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#8fc6e6'); gr.addColorStop(1, '#6aa9d1');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        speckle(c, w, h, ['#ffffff', '#a8dcf5'], 3000, 3);
        drawFieldMarkings(c, w, h, { line: '#ffffff', alpha: 0.75 });
      }));
      const crystal = (x, z, s) => {
        for (let k = 0; k < 3; k++) {
          const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshToonMaterial({ color: 0x9be7ff, emissive: 0x2a8cc7, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }));
          m.scale.set(s * rnd(0.5, 0.9), s * rnd(1.6, 3), s * rnd(0.5, 0.9));
          m.position.set(x + rnd(-0.5, 0.5), m.scale.y * 0.4, z + rnd(-0.5, 0.5));
          m.rotation.set(rnd(-0.3, 0.3), Math.random() * 3, rnd(-0.3, 0.3)); m.castShadow = true; g.add(m);
        }
      };
      ringPoints(40, 10, 24).forEach(([x, z]) => crystal(x, z, rnd(0.8, 2)));
      ringPoints(25, 9.5, 18).forEach(([x, z]) => rock(g, x, z, rnd(0.4, 1.1), 0x5f7f9e));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x14304f, { side: THREE.BackSide }));
      g.add(dome);
      addParticles(g, { count: 300, color: 0xffffff, size: 0.18, area: { x: 20, y: 12, z: 14 }, mode: 'fall', speed: 0.8, additive: false });
    }
  },
  city: {
    name: 'Lumiose Night Arena',
    sky: [[0, '#05030f'], [0.6, '#1b1240'], [1, '#43206b']], fog: [0x1b1240, 30, 90],
    light: { sky: 0x9aa6ff, ground: 0x110a22, hemi: 0.55, sun: 0xc9c2ff, sunI: 0.55 },
    build(g) {
      addGround(g, canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#23222b'; c.fillRect(0, 0, w, h); speckle(c, w, h, ['#2e2d38', '#1a1920'], 700, 3); }, 40, 40));
      addField(g, canvasTex(1024, 640, (c, w, h) => {
        c.fillStyle = '#1d1b26'; c.fillRect(0, 0, w, h);
        speckle(c, w, h, ['#2a2836', '#14131b'], 6000, 3);
        c.shadowColor = '#22d3ee'; c.shadowBlur = 18;
        drawFieldMarkings(c, w, h, { line: '#22d3ee', alpha: 1, ball: false, width: 7 });
        c.shadowColor = '#f472b6';
        c.strokeStyle = '#f472b6'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2, 60, 0, Math.PI * 2); c.stroke();
      }), { emissive: 0xffffff, emissiveIntensity: 0.06 });
      const win = canvasTex(64, 128, (c, w, h) => {
        c.fillStyle = '#151325'; c.fillRect(0, 0, w, h);
        for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) {
          c.fillStyle = Math.random() < 0.45 ? ['#fde68a', '#93c5fd', '#f9a8d4'][Math.floor(Math.random() * 3)] : '#22203a';
          c.fillRect(x, y, 6, 6);
        }
      });
      ringPoints(46, 15, 34, { kz: 0.8 }).forEach(([x, z]) => {
        if (z > 2 && Math.abs(x) < 18) return;
        const h = rnd(5, 18), w = rnd(2.5, 5);
        const tex = win.clone(); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; tex.repeat.set(1, Math.round(h / 4));
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshToonMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9 }));
        b.position.set(x, h / 2, z); g.add(b);
      });
      const tower = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 4), toon(0x5b4b8a, { emissive: 0xf59e0b, emissiveIntensity: 0.35 }));
      tower.position.set(0, 13, -40); g.add(tower);
      addGlow(g, 0xfbbf24, 0, 26, -40, 6);
      [[-9, -6, 0x22d3ee], [9, -6, 0xf472b6], [-9, 6, 0xf472b6], [9, 6, 0x22d3ee]].forEach(([x, z, c]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), toon(0x4b5563)); post.position.set(x, 1.5, z); g.add(post);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: c })); lamp.position.set(x, 3.1, z); g.add(lamp);
        addGlow(g, c, x, 3.1, z, 3.5);
      });
      const starGeo = new THREE.BufferGeometry(), sp = [];
      for (let i = 0; i < 600; i++) { const a = Math.random() * Math.PI * 2, e = rnd(0.15, 1.2), r = 90; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      g.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, fog: false })));
      addGlow(g, 0xe0e7ff, 35, 40, -70, 14);
    }
  }
};

World.themeKeys = Object.keys(THEMES);
World.themeName = key => THEMES[key].name;
World.setTheme = function (key) {
  if (!THEMES[key]) key = World.themeKeys[Math.floor(Math.random() * World.themeKeys.length)];
  if (themeGroup) { scene.remove(themeGroup); disposeTree(themeGroup); }
  themeUpdate = [];
  const th = THEMES[key];
  themeGroup = new THREE.Group();
  themeGroup.scale.setScalar(ARENA_SCALE);
  th.build(themeGroup);
  scene.add(themeGroup);
  scene.background = gradientTex(th.sky);
  scene.fog = new THREE.Fog(th.fog[0], th.fog[1] * ARENA_SCALE, th.fog[2] * ARENA_SCALE);
  hemi.color.set(th.light.sky); hemi.groundColor.set(th.light.ground); hemi.intensity = th.light.hemi * Math.PI;
  sun.color.set(th.light.sun); sun.intensity = th.light.sunI * Math.PI;
  currentTheme = key;
  return key;
};


updaters.push((dt, t) => {
  themeUpdate.forEach(fn => fn(dt, t));
  World.cheerLevel = Math.max(0, (World.cheerLevel || 0) - dt * 0.35);
});
World.cheerLevel = 0;
World.cheer = v => { World.cheerLevel = Math.max(World.cheerLevel, v); };
