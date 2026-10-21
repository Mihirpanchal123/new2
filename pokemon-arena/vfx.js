'use strict';
// =====================================================================
//  MOVE EFFECTS — GPU particles, beams, lightning, shockwaves, debris,
//  ground decals and dynamic lights. Every move is mapped to an effect
//  style (beam, stream, orb, bolt, quake, slash, ...) coloured by type.
// =====================================================================
const VFX = (() => {
  const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const C = (r, g, b) => new THREE.Color().setRGB(r, g, b);
  const GAIN = 0.5;                            // global effect brightness (bloom picks up values > 1.3)

  // ---------------------------------------------------------------
  //  Particle atlas (4x4 tiles drawn procedurally)
  // ---------------------------------------------------------------
  const TILE = { glow: 0, spark: 1, flame: 2, smoke: 3, drop: 4, leaf: 5, shard: 6, star: 7, ring: 8, bubble: 9, heart: 10, rock: 11, note: 12, z: 13, streak: 14, swirl: 15 };
  const atlas = canvasTex(512, 512, (ctx) => {
    const draw = [
      c => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 58); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-64, -64, 128, 128); },
      c => {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-64, -64, 128, 128);
        for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); const L = i % 2 ? 30 : 56; const lg = c.createLinearGradient(0, 0, L, 0); lg.addColorStop(0, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(0, -4); c.lineTo(L, 0); c.lineTo(0, 4); c.fill(); c.restore(); }
      },
      c => { c.beginPath(); c.moveTo(0, -56); c.bezierCurveTo(26, -18, 40, 14, 36, 30); c.arc(0, 30, 36, 0, Math.PI); c.bezierCurveTo(-40, 14, -26, -18, 0, -56); const g = c.createRadialGradient(0, 28, 4, 0, 10, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fill(); },
      c => { for (let i = 0; i < 7; i++) { const x = Math.cos(i * 2.1) * 18, y = Math.sin(i * 1.7) * 16, r = 26 + (i % 3) * 7; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } },
      c => { c.beginPath(); c.moveTo(0, -50); c.bezierCurveTo(22, -14, 34, 10, 30, 26); c.arc(0, 24, 30, 0, Math.PI); c.bezierCurveTo(-34, 10, -22, -14, 0, -50); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); c.fillStyle = 'rgba(255,255,255,1)'; c.beginPath(); c.ellipse(-10, 18, 6, 11, -0.4, 0, 7); c.fill(); },
      c => { c.rotate(-0.6); c.beginPath(); c.ellipse(0, 0, 22, 52, 0, 0, 7); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -48); c.lineTo(0, 48); c.stroke(); },
      c => { c.beginPath(); c.moveTo(0, -56); c.lineTo(22, 0); c.lineTo(0, 56); c.lineTo(-22, 0); c.closePath(); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill(); c.beginPath(); c.moveTo(0, -56); c.lineTo(22, 0); c.lineTo(0, 10); c.closePath(); c.fillStyle = 'rgba(255,255,255,1)'; c.fill(); },
      c => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-64, -64, 128, 128); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#fff'; c.fill(); },
      c => { c.shadowColor = '#fff'; c.shadowBlur = 10; c.strokeStyle = 'rgba(255,255,255,1)'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 46, 0, 7); c.stroke(); },
      c => { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-16, -16, 9, 0, 7); c.fill(); },
      c => { c.beginPath(); c.moveTo(0, 46); c.bezierCurveTo(-60, 0, -36, -50, 0, -20); c.bezierCurveTo(36, -50, 60, 0, 0, 46); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(); },
      c => { c.beginPath(); [[-40, -10], [-22, -40], [18, -44], [44, -12], [36, 30], [-4, 44], [-38, 26]].forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); const g = c.createLinearGradient(-40, -40, 40, 40); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a8a8a'); c.fillStyle = g; c.fill(); },
      c => { c.fillStyle = '#fff'; c.font = 'bold 96px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♪', 0, 4); },
      c => { c.fillStyle = '#fff'; c.font = 'bold 90px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Z', 0, 4); },
      c => { const g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 60, 7, 0, 0, 7); c.fill(); },
      c => { c.strokeStyle = '#fff'; c.lineWidth = 6; c.shadowColor = '#fff'; c.shadowBlur = 6; c.beginPath(); for (let a = 0; a < 12; a += 0.1) { const r = a * 4.2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); }
    ];
    draw.forEach((fn, i) => { ctx.save(); ctx.translate((i % 4) * 128 + 64, Math.floor(i / 4) * 128 + 64); fn(ctx); ctx.restore(); });
  }, 1, 1, false);
  atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;

  // ---------------------------------------------------------------
  //  GPU particle system (one instanced draw call per blend mode)
  // ---------------------------------------------------------------
  const PV = `
    attribute vec3 iPos; attribute vec4 iCol; attribute vec2 iSR; attribute float iFrame;
    varying vec2 vUv; varying vec4 vCol;
    void main() {
      vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
      float c = cos(iSR.y), s = sin(iSR.y);
      vec2 q = position.xy * iSR.x;
      mv.xy += vec2(c * q.x - s * q.y, s * q.x + c * q.y);
      gl_Position = projectionMatrix * mv;
      float fx = mod(iFrame, 4.0), fy = floor(iFrame / 4.0);
      vUv = (uv * 0.96 + 0.02 + vec2(fx, 3.0 - fy)) * 0.25;
      vCol = iCol;
    }`;
  const PF = `
    uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
    void main() {
      vec4 t = texture2D(map, vUv);
      float a = t.a * vCol.a;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vCol.rgb * t.rgb, a);
    }`;
  class Particles {
    constructor(max, blending) {
      this.max = max;
      const base = new THREE.PlaneGeometry(1, 1);
      const g = new THREE.InstancedBufferGeometry();
      g.index = base.index;
      g.setAttribute('position', base.attributes.position);
      g.setAttribute('uv', base.attributes.uv);
      const mk = (n, size) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, a); return a; };
      this.aPos = mk('iPos', 3); this.aCol = mk('iCol', 4); this.aSR = mk('iSR', 2); this.aFrame = mk('iFrame', 1);
      g.instanceCount = 0;
      this.geo = g;
      this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { map: { value: atlas } }, vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, blending }));
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = blending === THREE.AdditiveBlending ? 32 : 31;
      scene.add(this.mesh);
      this.list = [];
    }
    spawn(o) {
      if (this.list.length >= this.max) return null;
      const p = {
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, gx: 0, gy: 0, gz: 0, drag: 0, life: 1, age: 0, delay: 0,
        s0: 0.3, s1: 0.3, c0: null, c1: null, alpha: 1, fadeIn: 0.1, fadeOut: 0.35, rot: Math.random() * 6.28, rotV: 0,
        frame: 0, intensity: 1, align: false, alignOff: 0, follow: null, floor: false, ...o
      };
      if (!p.c1) p.c1 = p.c0;
      this.list.push(p);
      return p;
    }
    update(dt) {
      const L = this.list, pos = this.aPos.array, colA = this.aCol.array, sr = this.aSR.array, fr = this.aFrame.array;
      const m = camera.matrixWorldInverse.elements;
      let n = 0;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.age += dt;
        if (p.age >= p.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
        if (p.follow) p.follow(p, dt);
        else {
          const dk = Math.exp(-p.drag * dt);
          p.vx = (p.vx + p.gx * dt) * dk; p.vy = (p.vy + p.gy * dt) * dk; p.vz = (p.vz + p.gz * dt) * dk;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.floor && p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        }
        p.rot += p.rotV * dt;
        const t = p.age / p.life;
        let a = p.alpha * Math.min(1, t / Math.max(p.fadeIn, 0.001)) * Math.min(1, (1 - t) / Math.max(p.fadeOut, 0.001));
        if (n >= this.max) continue;
        let rot = p.rot;
        if (p.align) {
          const vx = m[0] * p.vx + m[4] * p.vy + m[8] * p.vz, vy = m[1] * p.vx + m[5] * p.vy + m[9] * p.vz;
          rot = Math.atan2(vy, vx) + p.alignOff;
        }
        pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
        const c0 = p.c0, c1 = p.c1, I = p.intensity * GAIN;
        colA[n * 4] = (c0.r + (c1.r - c0.r) * t) * I; colA[n * 4 + 1] = (c0.g + (c1.g - c0.g) * t) * I; colA[n * 4 + 2] = (c0.b + (c1.b - c0.b) * t) * I; colA[n * 4 + 3] = a;
        sr[n * 2] = p.s0 + (p.s1 - p.s0) * t; sr[n * 2 + 1] = rot;
        fr[n] = p.frame;
        n++;
      }
      this.geo.instanceCount = n;
      for (const at of [this.aPos, this.aCol, this.aSR, this.aFrame]) { at.needsUpdate = true; at.clearUpdateRanges && at.clearUpdateRanges(); at.addUpdateRange && at.addUpdateRange(0, n * at.itemSize); }
    }
  }
  const ADD = new Particles(6000, THREE.AdditiveBlending);
  const NORM = new Particles(2500, THREE.NormalBlending);

  // ---------------------------------------------------------------
  //  Beams, ribbons (lightning / slashes), rings, spheres, decals, debris
  // ---------------------------------------------------------------
  const active = [];                          // per-frame effect updaters; return false when done
  const transient = new Set();                // tween-driven meshes, removed by clear()
  const run = fn => active.push(fn);
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const BEAM_V = `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const BEAM_F = `uniform vec3 color; uniform float time; uniform float opacity; uniform float intensity;
    varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){ float f = abs(dot(vN, vV)); float core = pow(f, 3.0);
      float s = 0.8 + 0.2 * sin(vUv.y * 60.0 - time * 45.0) + 0.1 * sin(vUv.x * 30.0 + time * 20.0);
      vec3 c = mix(color, vec3(1.0), core * 0.85) * intensity * (0.4 + core * 1.2) * s;
      gl_FragColor = vec4(c, opacity * (0.15 + core * 0.85)); }`;
  const RIM_F = `uniform vec3 color; uniform float opacity; uniform float intensity; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){ float f = 1.0 - abs(dot(vN, vV)); float a = pow(f, 1.8); gl_FragColor = vec4(color * intensity * (0.3 + a), opacity * (0.12 + a)); }`;
  const shaderMat = (frag, color, extra = {}) => new THREE.ShaderMaterial({
    uniforms: { color: { value: color.clone() }, time: { value: 0 }, opacity: { value: 1 }, intensity: { value: 2 } },
    vertexShader: BEAM_V, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...extra
  });

  function beam(from, to, color, { radius = 0.25, dur = 0.8, grow = 0.15, intensity = 2.5 } = {}) {
    const core = new THREE.Mesh(beamGeo, shaderMat(BEAM_F, color));
    const glow = new THREE.Mesh(beamGeo, shaderMat(RIM_F, color));
    [core, glow].forEach(m => { m.position.copy(from); m.lookAt(to); m.renderOrder = 33; scene.add(m); });
    const len = from.distanceTo(to);
    let t = 0;
    run(dt => {
      t += dt;
      const g = Math.min(1, t / grow), fade = t > dur ? Math.max(0, 1 - (t - dur) / 0.2) : 1;
      const w = radius * (0.85 + 0.15 * Math.sin(t * 60)) * (t > dur ? fade : 1);
      core.scale.set(w, w, len * g); glow.scale.set(w * 1.8, w * 1.8, len * g);
      core.material.uniforms.time.value = t; core.material.uniforms.opacity.value = fade; core.material.uniforms.intensity.value = intensity * GAIN;
      glow.material.uniforms.opacity.value = fade * 0.6; glow.material.uniforms.intensity.value = intensity * GAIN * 0.6;
      if (t > dur + 0.2) { scene.remove(core); scene.remove(glow); core.material.dispose(); glow.material.dispose(); return false; }
      return true;
    });
    return { from, to };
  }

  const RIB_V = `attribute float side; varying float vSide; varying float vAlong; attribute float along;
    void main(){ vSide = side; vAlong = along; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const RIB_F = `uniform vec3 color; uniform float opacity; uniform float intensity; varying float vSide; varying float vAlong;
    void main(){ float a = 1.0 - abs(vSide); a = pow(a, 1.4); float core = pow(a, 6.0);
      gl_FragColor = vec4(mix(color, vec3(1.0), core) * intensity, a * opacity * smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.9, vAlong)); }`;
  class Ribbon {
    constructor(n, color, intensity = 3) {
      this.n = n;
      const g = new THREE.BufferGeometry();
      this.pos = new Float32Array(n * 2 * 3);
      const side = new Float32Array(n * 2), along = new Float32Array(n * 2), idx = [];
      for (let i = 0; i < n; i++) { side[i * 2] = -1; side[i * 2 + 1] = 1; along[i * 2] = along[i * 2 + 1] = i / (n - 1); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('side', new THREE.BufferAttribute(side, 1));
      g.setAttribute('along', new THREE.BufferAttribute(along, 1));
      g.setIndex(idx);
      this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { color: { value: color.clone() }, opacity: { value: 1 }, intensity: { value: intensity * GAIN } }, vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 34;
      scene.add(this.mesh);
    }
    set(points, width) {
      const cam = camera.position, P = this.pos, n = this.n, t = new THREE.Vector3(), vw = new THREE.Vector3(), sd = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        const p = points[Math.min(i, points.length - 1)];
        const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
        t.subVectors(b, a).normalize(); vw.subVectors(cam, p).normalize(); sd.crossVectors(t, vw).normalize();
        const w = (typeof width === 'function' ? width(i / (n - 1)) : width) / 2;
        P[i * 6] = p.x - sd.x * w; P[i * 6 + 1] = p.y - sd.y * w; P[i * 6 + 2] = p.z - sd.z * w;
        P[i * 6 + 3] = p.x + sd.x * w; P[i * 6 + 4] = p.y + sd.y * w; P[i * 6 + 5] = p.z + sd.z * w;
      }
      this.mesh.geometry.attributes.position.needsUpdate = true;
    }
    dispose() { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
  }
  // jagged lightning path between two points
  function boltPath(a, b, n = 18, jag = 0.35) {
    const pts = [], dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const perp1 = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), env = Math.sin(t * Math.PI);
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.addScaledVector(perp1, (Math.random() - 0.5) * jag * len * 0.25 * env).addScaledVector(perp2, (Math.random() - 0.5) * jag * len * 0.25 * env);
      pts.push(p);
    }
    return pts;
  }
  let lastZap = 0;
  function bolt(a, b, color, { dur = 0.5, width = 0.22, jag = 0.35 } = {}) {
    if (performance.now() - lastZap > 140) { lastZap = performance.now(); SFX.zap(); }
    const core = new Ribbon(18, color, 4), glow = new Ribbon(18, color, 1.6);
    let t = 0, next = 0;
    run(dt => {
      t += dt;
      if (t >= next) { const pts = boltPath(a, b, 18, jag); core.set(pts, width); glow.set(pts, width * 2.6); next = t + 0.05; }
      const f = Math.random() < 0.15 ? 0.3 : 1;
      core.mesh.material.uniforms.opacity.value = f * Math.min(1, (dur - t) / 0.1);
      glow.mesh.material.uniforms.opacity.value = f * 0.7 * Math.min(1, (dur - t) / 0.1);
      if (t >= dur) { core.dispose(); glow.dispose(); return false; }
      return true;
    });
  }
  // curved slash arc across a point (claws, tails, blades)
  function slash(center, color, { angle = 0, size = 1.6, dur = 0.28, width = 0.18, delay = 0, intensity = 3.5 } = {}) {
    const r = new Ribbon(20, color, intensity);
    r.mesh.visible = false;
    later(() => SFX.slash(), delay * 1000);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const ax = right.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle)), ay = right.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(up, Math.cos(angle));
    let t = -delay;
    run(dt => {
      t += dt;
      if (t < 0) return true;
      r.mesh.visible = true;
      const k = Math.min(1, t / (dur * 0.5));
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const u = (i / 19) * k, th = -1.1 + u * 2.2;
        pts.push(center.clone().addScaledVector(ax, Math.sin(th) * size * 0.6).addScaledVector(ay, (Math.cos(th) - 0.6) * size * 0.45));
      }
      r.set(pts, u => width * Math.sin(Math.min(1, u) * Math.PI) * 1.4);
      r.mesh.material.uniforms.opacity.value = t > dur * 0.5 ? Math.max(0, 1 - (t - dur * 0.5) / (dur * 0.5)) : 1;
      if (t >= dur) { r.dispose(); return false; }
      return true;
    });
  }

  const ringTex = canvasTex(128, 128, c => {
    const g = c.createRadialGradient(64, 64, 30, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }, 1, 1, false);
  function groundRing(pos, color, { from = 0.2, to = 4, dur = 0.6, intensity = 2.5, y = 0.06 } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: ringTex, color: color.clone().multiplyScalar(intensity * GAIN), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x, y, pos.z); m.renderOrder = 29;
    scene.add(m);
    let t = 0;
    run(dt => {
      t += dt; const k = Math.min(1, t / dur);
      m.scale.setScalar(lerp(from, to, easeOut(k))); m.material.opacity = 1 - k;
      if (k >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      return true;
    });
  }
  function airRing(pos, color, { from = 0.2, to = 2.5, dur = 0.45, intensity = 2.5, delay = 0 } = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: color.clone().multiplyScalar(intensity * GAIN), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(pos); s.renderOrder = 33; s.visible = false;
    scene.add(s);
    let t = -delay;
    run(dt => {
      t += dt; if (t < 0) return true;
      s.visible = true;
      const k = Math.min(1, t / dur);
      s.scale.setScalar(lerp(from, to, easeOut(k))); s.material.opacity = 1 - k;
      if (k >= 1) { scene.remove(s); s.material.dispose(); return false; }
      return true;
    });
    return s;
  }
  const sphereGeo = new THREE.SphereGeometry(1, 32, 20);
  function shell(pos, color, { from = 0.2, to = 2, dur = 0.5, intensity = 2, hold = 0, follow = null } = {}) {
    const m = new THREE.Mesh(sphereGeo, shaderMat(RIM_F, color));
    m.position.copy(pos); m.renderOrder = 33; scene.add(m);
    let t = 0;
    run(dt => {
      t += dt;
      if (follow) follow(m.position);
      const k = Math.min(1, t / dur);
      m.scale.setScalar(lerp(from, to, easeOut(k)));
      const fade = t < dur + hold ? 1 : Math.max(0, 1 - (t - dur - hold) / 0.25);
      m.material.uniforms.opacity.value = fade * (hold ? 1 : 1 - k * 0.8);
      m.material.uniforms.intensity.value = intensity * GAIN;
      if (t > dur + hold + 0.25) { scene.remove(m); m.material.dispose(); return false; }
      return true;
    });
    return m;
  }

  // ground decals (scorch, cracks, frost, puddle) that fade out
  const decalTex = {
    scorch: canvasTex(128, 128, c => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(10,6,4,.85)'); g.addColorStop(0.6, 'rgba(25,12,6,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); speckle(c, 128, 128, ['rgba(0,0,0,.6)'], 80, 4); }),
    crack: canvasTex(256, 256, c => { c.strokeStyle = 'rgba(20,12,6,.85)'; c.lineCap = 'round'; for (let i = 0; i < 9; i++) { let x = 128, y = 128, a = i / 9 * Math.PI * 2; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) { a += rnd(-0.6, 0.6); x += Math.cos(a) * 16; y += Math.sin(a) * 16; c.lineWidth = Math.max(1, 6 - k); c.lineTo(x, y); } c.stroke(); } }),
    frost: canvasTex(128, 128, c => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(230,248,255,.9)'); g.addColorStop(1, 'rgba(180,230,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); c.stroke(); } }),
    puddle: canvasTex(128, 128, c => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(90,170,255,.6)'); g.addColorStop(1, 'rgba(90,170,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); })
  };
  function decal(kind, pos, size = 2.5, life = 4) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: decalTex[kind], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; m.position.set(pos.x, 0.03, pos.z); m.renderOrder = 6;
    scene.add(m);
    let t = 0;
    run(dt => { t += dt; m.material.opacity = Math.min(1, (life - t) / 1.2); if (t >= life) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; } return true; });
  }
  // physical debris (rocks, ice chunks, metal shards)
  const debrisGeo = { rock: new THREE.DodecahedronGeometry(0.22, 0), ice: new THREE.OctahedronGeometry(0.2, 0), spike: new THREE.ConeGeometry(0.35, 1.6, 6) };
  function debris(kind, pos, vel, { color = 0x8a7a66, life = 1.6, scale = 1, floor = true } = {}) {
    const mat = kind === 'ice' ? new THREE.MeshStandardMaterial({ color, emissive: 0x2a7fb0, emissiveIntensity: 0.4, transparent: true, opacity: 0.85, roughness: 0.2 }) : new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const m = new THREE.Mesh(debrisGeo[kind], mat);
    m.castShadow = true; m.position.copy(pos); m.scale.setScalar(scale * rnd(0.7, 1.4));
    const sp = v3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8));
    scene.add(m);
    let t = 0;
    run(dt => {
      t += dt;
      vel.y -= 14 * dt;
      m.position.addScaledVector(vel, dt);
      if (floor && m.position.y < 0.12) { m.position.y = 0.12; vel.y *= -0.35; vel.x *= 0.6; vel.z *= 0.6; sp.multiplyScalar(0.6); }
      m.rotation.x += sp.x * dt; m.rotation.y += sp.y * dt; m.rotation.z += sp.z * dt;
      if (t > life - 0.3) m.scale.multiplyScalar(Math.pow(0.001, dt / 0.3));
      if (t >= life) { scene.remove(m); mat.dispose(); return false; }
      return true;
    });
    return m;
  }
  function spike(pos, color, { h = 1.6, delay = 0, life = 1.0, kind = 'rock' } = {}) {
    const mat = kind === 'ice' ? new THREE.MeshStandardMaterial({ color, emissive: 0x2a8ac7, emissiveIntensity: 0.5, transparent: true, opacity: 0.9, roughness: 0.15 }) : new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const m = new THREE.Mesh(debrisGeo.spike, mat);
    m.castShadow = true; m.position.set(pos.x, -1, pos.z); m.rotation.set(rnd(-0.3, 0.3), Math.random() * 6, rnd(-0.3, 0.3)); m.scale.set(1, h / 1.6, 1);
    scene.add(m);
    let t = -delay, burst = false;
    run(dt => {
      t += dt; if (t < 0) return true;
      if (!burst) { burst = true; dust(pos, 8, kind === 'ice' ? C(0.8, 0.95, 1) : C(0.7, 0.6, 0.45)); }
      const up = Math.min(1, t / 0.12), down = t > life - 0.3 ? (t - (life - 0.3)) / 0.3 : 0;
      m.position.y = lerp(-1, h * 0.45, easeOut(up)) - down * (h + 0.6);
      if (t >= life) { scene.remove(m); mat.dispose(); return false; }
      return true;
    });
  }

  // pooled point lights (fixed count avoids shader recompiles)
  const lights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(l); return { l, busy: false }; });
  function flashLight(pos, color, { intensity = 60, dur = 0.4, follow = null, hold = 0 } = {}) {
    const slot = lights.find(s => !s.busy) || lights[0];
    slot.busy = true;
    const l = slot.l;
    l.color.copy(color); l.position.copy(pos);
    let t = 0;
    const h = { hold, stop() { h.hold = Math.min(h.hold, t); } };
    run(dt => {
      t += dt;
      if (follow) follow(l.position);
      const k = t < h.hold ? 1 : 1 - (t - h.hold) / dur;
      l.intensity = intensity * Math.max(0, k) * (0.85 + Math.random() * 0.3);
      if (t >= h.hold + dur) { l.intensity = 0; slot.busy = false; return false; }
      return true;
    });
    return h;
  }
  // full-screen flash overlay
  const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  flashMesh.position.z = -0.5; flashMesh.renderOrder = 999; camera.add(flashMesh);
  function screenFlash(color = C(1, 1, 1), strength = 0.7, dur = 0.35, additive = false) {
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.5 * 1.1;
    flashMesh.scale.set(h * camera.aspect, h, 1);
    flashMesh.material.color.copy(color);
    flashMesh.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    let t = 0;
    run(dt => { t += dt; flashMesh.material.opacity = strength * (additive ? 0.45 : 1) * Math.max(0, 1 - t / dur); return t < dur; });
  }
  // outcome of the move being animated (set by move()): eff, miss, blocked
  let CUR = { eff: 1 };
  function fizzle(pos) {
    SFX.fizzle();
    for (let i = 0; i < 14; i++) { const d = sphereDir(); ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * 3, vy: d.y * 3, vz: d.z * 3, drag: 5, life: 0.4, s0: 0.25, s1: 0.05, c0: C(0.7, 0.7, 0.75), intensity: 1.2, frame: TILE.spark }); }
    smoke(pos, 4, C(0.6, 0.6, 0.62), 0.8);
    airRing(pos, C(0.6, 0.6, 0.7), { to: 1.4, dur: 0.35, intensity: 1 });
    if (CUR.d !== undefined) World.shrug(CUR.d);
  }
  function blockFx(pos) {
    SFX.block();
    const A = World.actors[CUR.d];
    shell(centerOf(CUR.d), C(0.35, 1, 0.6), { from: Math.max(A.height, A.radius * 2) * 0.7, to: Math.max(A.height, A.radius * 2) * 0.78, dur: 0.15, hold: 0.35, intensity: 2.5 });
    for (let i = 0; i < 24; i++) { const d = sphereDir(); ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * 7, vy: Math.abs(d.y) * 6, vz: d.z * 7, gy: -9, life: 0.5, s0: 0.3, s1: 0.05, c0: C(0.7, 1, 0.8), intensity: 2.4, frame: TILE.spark }); }
    flashLight(pos, C(0.4, 1, 0.6), { intensity: 40, dur: 0.3 });
  }
  function whiff(pos) {
    SFX.whoosh();
    const g = v3(pos.x, 0, pos.z);
    dust(g, 8);
    groundRing(g, C(0.8, 0.8, 0.8), { to: 2, dur: 0.4, intensity: 0.8 });
  }
  const bloomKick = (v = 0.6) => { World.bloom.strength = Math.max(World.bloom.strength, World.bloomBase + v * 0.45); };

  // ---------------------------------------------------------------
  //  Type palettes and particle helpers
  // ---------------------------------------------------------------
  const TYPE = {
    Normal:   { c: C(1, 0.96, 0.85), c2: C(1, 0.85, 0.55), tex: 'star' },
    Fire:     { c: C(1, 0.42, 0.06), c2: C(1, 0.85, 0.3), tex: 'flame' },
    Water:    { c: C(0.18, 0.55, 1), c2: C(0.7, 0.92, 1), tex: 'drop' },
    Electric: { c: C(1, 0.88, 0.15), c2: C(1, 1, 0.8), tex: 'spark' },
    Grass:    { c: C(0.3, 0.9, 0.25), c2: C(0.8, 1, 0.45), tex: 'leaf' },
    Ice:      { c: C(0.5, 0.88, 1), c2: C(1, 1, 1), tex: 'shard' },
    Fighting: { c: C(1, 0.4, 0.15), c2: C(1, 0.85, 0.55), tex: 'star' },
    Poison:   { c: C(0.7, 0.2, 0.95), c2: C(0.95, 0.6, 1), tex: 'bubble' },
    Ground:   { c: C(0.8, 0.6, 0.32), c2: C(0.95, 0.85, 0.6), tex: 'smoke' },
    Flying:   { c: C(0.75, 0.9, 1), c2: C(1, 1, 1), tex: 'streak' },
    Psychic:  { c: C(1, 0.3, 0.68), c2: C(1, 0.75, 0.95), tex: 'ring' },
    Bug:      { c: C(0.62, 0.85, 0.12), c2: C(0.9, 1, 0.5), tex: 'spark' },
    Rock:     { c: C(0.72, 0.6, 0.36), c2: C(0.9, 0.8, 0.6), tex: 'rock' },
    Ghost:    { c: C(0.45, 0.25, 0.9), c2: C(0.75, 0.55, 1), tex: 'smoke' },
    Dragon:   { c: C(0.4, 0.28, 1), c2: C(1, 0.4, 0.65), tex: 'flame' },
    Dark:     { c: C(0.4, 0.15, 0.55), c2: C(0.75, 0.4, 1), tex: 'smoke' },
    Steel:    { c: C(0.82, 0.88, 0.98), c2: C(1, 1, 1), tex: 'shard' },
    Fairy:    { c: C(1, 0.55, 0.85), c2: C(1, 0.92, 0.98), tex: 'heart' }
  };
  const pal = type => TYPE[type] || TYPE.Normal;
  const rv = s => v3(rnd(-s, s), rnd(-s, s), rnd(-s, s));
  function sphereDir() { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u); return v3(s * Math.cos(a), u, s * Math.sin(a)); }

  function dust(pos, n, color = C(0.75, 0.65, 0.5)) {
    for (let i = 0; i < n; i++) {
      const d = sphereDir(); d.y = Math.abs(d.y) * 0.5;
      NORM.spawn({ x: pos.x, y: 0.2, z: pos.z, vx: d.x * rnd(1, 3), vy: d.y * 2 + 0.5, vz: d.z * rnd(1, 3), drag: 2.5, life: rnd(0.7, 1.3), s0: 0.5, s1: rnd(1.4, 2.2), c0: color, alpha: 0.55, frame: TILE.smoke, rotV: rnd(-1, 1) });
    }
  }
  function smoke(pos, n, color = C(0.25, 0.22, 0.22), up = 1.2) {
    for (let i = 0; i < n; i++) NORM.spawn({ x: pos.x + rnd(-0.3, 0.3), y: pos.y + rnd(-0.2, 0.2), z: pos.z + rnd(-0.3, 0.3), vx: rnd(-0.4, 0.4), vy: rnd(0.4, up), vz: rnd(-0.4, 0.4), drag: 1, life: rnd(0.8, 1.5), s0: 0.4, s1: rnd(1.2, 2), c0: color, alpha: 0.45, frame: TILE.smoke, rotV: rnd(-1, 1) });
  }
  // the signature particle burst of each type
  function typeBurst(pos, type, power = 1, dirBias = null) {
    const P = pal(type), n = Math.round(26 * power);
    const add = (o) => ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, ...o });
    for (let i = 0; i < n; i++) {
      const d = sphereDir(); if (dirBias) d.addScaledVector(dirBias, 0.6).normalize();
      const sp = rnd(2, 6) * Math.sqrt(power);
      switch (type) {
        case 'Fire': case 'Dragon':
          add({ vx: d.x * sp, vy: d.y * sp + 1.5, vz: d.z * sp, gy: 2, drag: 3, life: rnd(0.4, 0.8), s0: rnd(0.5, 0.9), s1: 0.1, c0: P.c2, c1: P.c, intensity: 2.5, frame: TILE.flame, align: true, alignOff: -Math.PI / 2 }); break;
        case 'Water':
          add({ vx: d.x * sp, vy: Math.abs(d.y) * sp + 2, vz: d.z * sp, gy: -12, life: rnd(0.5, 0.9), s0: rnd(0.18, 0.32), s1: 0.12, c0: P.c2, c1: P.c, intensity: 1.6, frame: TILE.drop, align: true, alignOff: -Math.PI / 2 }); break;
        case 'Electric':
          add({ vx: d.x * sp * 1.3, vy: d.y * sp * 1.3, vz: d.z * sp * 1.3, drag: 5, life: rnd(0.2, 0.45), s0: rnd(0.3, 0.6), s1: 0.05, c0: P.c2, c1: P.c, intensity: 3.5, frame: TILE.spark }); break;
        case 'Grass': case 'Bug':
          (type === 'Grass' ? NORM : ADD).spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * sp * 0.7, vy: d.y * sp * 0.7 + 1, vz: d.z * sp * 0.7, gy: -2, drag: 2, life: rnd(0.7, 1.2), s0: rnd(0.25, 0.4), s1: 0.2, c0: P.c, c1: P.c2, intensity: type === 'Grass' ? 1 : 2.5, frame: type === 'Grass' ? TILE.leaf : TILE.spark, rotV: rnd(-8, 8) }); break;
        case 'Ice': case 'Steel':
          add({ vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, drag: 3, life: rnd(0.4, 0.8), s0: rnd(0.3, 0.5), s1: 0.1, c0: P.c2, c1: P.c, intensity: 2.2, frame: TILE.shard, rotV: rnd(-10, 10) }); break;
        case 'Poison':
          add({ vx: d.x * sp * 0.6, vy: d.y * sp * 0.4 + 1.2, vz: d.z * sp * 0.6, drag: 2, life: rnd(0.6, 1.1), s0: rnd(0.2, 0.4), s1: rnd(0.4, 0.6), c0: P.c, c1: P.c2, intensity: 2, frame: TILE.bubble }); break;
        case 'Psychic':
          if (i % 4 === 0) airRing(pos, P.c, { to: 2.2 + Math.random() * 1.5, dur: 0.5, delay: i * 0.01 });
          add({ vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, drag: 4, life: rnd(0.3, 0.6), s0: 0.4, s1: 0.05, c0: P.c2, c1: P.c, intensity: 2.5, frame: TILE.glow }); break;
        case 'Ghost': case 'Dark':
          add({ vx: d.x * sp * 0.6, vy: d.y * sp * 0.6, vz: d.z * sp * 0.6, drag: 2.5, life: rnd(0.6, 1), s0: 0.5, s1: 1.2, c0: P.c, c1: P.c2, intensity: 1.4, frame: TILE.smoke, rotV: rnd(-2, 2) }); break;
        case 'Fairy':
          add({ vx: d.x * sp * 0.7, vy: d.y * sp * 0.7 + 1, vz: d.z * sp * 0.7, drag: 2, life: rnd(0.6, 1.1), s0: rnd(0.25, 0.45), s1: 0.1, c0: P.c2, c1: P.c, intensity: 2.2, frame: i % 2 ? TILE.heart : TILE.star, rotV: rnd(-3, 3) }); break;
        case 'Rock': case 'Ground':
          if (i % 3 === 0) debris('rock', pos.clone(), d.clone().multiplyScalar(sp * 0.8).setY(Math.abs(d.y) * sp + 2), { color: type === 'Rock' ? 0x8a7a66 : 0x9b7a4c, life: 1.2, scale: 0.8 });
          break;
        case 'Flying':
          add({ vx: d.x * sp * 1.4, vy: d.y * sp * 0.6, vz: d.z * sp * 1.4, drag: 3, life: rnd(0.3, 0.6), s0: rnd(0.6, 1), s1: 0.2, c0: P.c2, c1: P.c, intensity: 1.8, frame: TILE.streak, align: true }); break;
        default:
          add({ vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, drag: 4, life: rnd(0.3, 0.6), s0: rnd(0.3, 0.55), s1: 0.05, c0: P.c2, c1: P.c, intensity: 2.6, frame: i % 3 ? TILE.spark : TILE.star });
      }
    }
    if (type === 'Rock' || type === 'Ground') dust(pos, 10, type === 'Ground' ? C(0.8, 0.65, 0.42) : C(0.65, 0.6, 0.55));
    if (type === 'Fire') smoke(pos, 6);
  }
  // core impact used by almost every attack
  function impact(pos, type, power = 1, { ring = true, light = true } = {}) {
    if (CUR.blocked) return blockFx(pos);
    if (CUR.miss) return whiff(pos);
    if (CUR.eff === 0) return fizzle(pos);
    if (CUR.eff > 1) { power *= 1.35; screenFlash(pal(type).c2, 0.18, 0.25, true); bloomKick(0.35); }
    else if (CUR.eff < 1) { power *= 0.55; ring = false; }
    SFX.impact(type, power, CUR.eff);
    if (CUR.eff > 1 || power >= 1.4) World.cheer(Math.min(1, 0.4 + power * 0.25));
    const P = pal(type);
    ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, life: 0.22, s0: 1 * power, s1: 2.3 * power, c0: C(1, 1, 1), c1: P.c, intensity: 3, frame: TILE.glow, fadeIn: 0.01 });
    ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, life: 0.3, s0: 1.6 * power, s1: 2.6 * power, c0: P.c2, intensity: 3, frame: TILE.spark, fadeIn: 0.01, rotV: 3 });
    for (let i = 0; i < 10 * power; i++) {
      const d = sphereDir();
      ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * 9, vy: d.y * 9, vz: d.z * 9, drag: 6, life: 0.25, s0: 0.9, s1: 0.2, c0: C(1, 1, 1), c1: P.c, intensity: 3, frame: TILE.streak, align: true });
    }
    typeBurst(pos, type, power);
    if (ring) { airRing(pos, P.c, { to: 2.8 * power }); groundRing(pos, P.c, { to: 3.5 * power, dur: 0.5 }); }
    if (light) flashLight(pos, P.c, { intensity: 35 * power, dur: 0.35 });
    if (power >= 1.3) { World.shake(0.12 * power); bloomKick(0.35); }
  }
  function charge(pos, type, dur = 0.4, size = 1) {
    const P = pal(type);
    const n = Math.round(30 * size);
    for (let i = 0; i < n; i++) {
      const d = sphereDir().multiplyScalar(rnd(1, 1.8) * size), life = dur * rnd(0.7, 1);
      ADD.spawn({ x: pos.x + d.x, y: pos.y + d.y, z: pos.z + d.z, vx: -d.x / life, vy: -d.y / life, vz: -d.z / life, life, s0: 0.15, s1: 0.35, c0: P.c, c1: P.c2, intensity: 2.5, frame: TILE.spark, delay: Math.random() * dur * 0.3 });
    }
    const core = ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, life: dur + 0.1, s0: 0.2, s1: 1.1 * size, c0: P.c, c1: C(1, 1, 1), intensity: 2.5, frame: TILE.glow, fadeOut: 0.1 });
    flashLight(pos, P.c, { intensity: 25 * size, dur: 0.2, hold: dur });
    return core;
  }

  // ---------------------------------------------------------------
  //  Effect styles
  // ---------------------------------------------------------------
  const S = {};
  const mouthOf = p => World.anchor(p, 'mouth');
  const centerOf = p => World.anchor(p, 'center');
  const power = mv => clamp((mv.power || 60) / 80, 0.7, 1.7);

  S.orb = async (c) => {
    const { a, d, P, type, mv } = c;
    await World.cast(a);
    charge(mouthOf(a), type, 0.55, c.variant === 'big' ? 1.4 : 1);
    await wait(520);
    const from = mouthOf(a), to = centerOf(d), pw = power(mv), big = c.variant === 'big';
    const size = (big ? 1.4 : 1) * (0.7 + pw * 0.35);
    const cur = from.clone();
    const orb = shell(cur, P.c, { from: 0.35 * size, to: 0.42 * size, dur: 5, intensity: 3 });
    const glow = ADD.spawn({ x: cur.x, y: cur.y, z: cur.z, life: 9, s0: 1.4 * size, s1: 1.4 * size, c0: P.c, intensity: 2.2, frame: TILE.glow, fadeIn: 0.02, follow: p => { p.x = cur.x; p.y = cur.y; p.z = cur.z; } });
    const light = flashLight(cur, P.c, { intensity: 35, dur: 0.1, hold: 5, follow: l => l.copy(cur) });
    const dist = from.distanceTo(to), dur = 0.35 + dist * 0.03;
    SFX.cast(type);
    await tween(dur, k => {
      cur.lerpVectors(from, to, k); cur.y += Math.sin(k * Math.PI) * dist * 0.08;
      orb.position.copy(cur);
      World.focusPoint(cur, 10 + dist * 0.25, 0.6);
      orb.rotation.y += 0.3;
      const P2 = pal(type);
      for (let i = 0; i < 3; i++) ADD.spawn({ x: cur.x + rnd(-0.15, 0.15) * size, y: cur.y + rnd(-0.15, 0.15) * size, z: cur.z + rnd(-0.15, 0.15) * size, vx: rnd(-0.5, 0.5), vy: rnd(-0.2, 0.6), vz: rnd(-0.5, 0.5), life: rnd(0.25, 0.5), s0: 0.45 * size, s1: 0.05, c0: P2.c2, c1: P2.c, intensity: 2.4, frame: TILE[P2.tex === 'rock' || P2.tex === 'leaf' ? 'glow' : P2.tex], rotV: rnd(-4, 4), align: P2.tex === 'flame', alignOff: -Math.PI / 2 });
    });
    glow.age = glow.life; orb.visible = false; light.stop();
    impact(to, type, (big ? 1.6 : 1.1) * pw);
    if (type === 'Fire') decal('scorch', to, 2.5);
    if (big) { screenFlash(P.c2, 0.35, 0.3, true); World.shake(0.3); }
    await wait(120);
  };
  S.beam = async (c) => {
    const { a, d, P, type, mv } = c;
    const from = mouthOf(a);
    World.cast(a);
    SFX.beam(type, 0.75);
    charge(from, type, 0.65, 1.1);
    await wait(620);
    const to = centerOf(d), pw = power(mv);
    beam(from, to, P.c, { radius: 0.16 + pw * 0.08, dur: 1.3, intensity: 3 });
    flashLight(from, P.c, { intensity: 40, dur: 0.3, hold: 1.1 });
    flashLight(to, P.c, { intensity: 40, dur: 0.3, hold: 1.1 });
    bloomKick(0.25);
    const dir = to.clone().sub(from);
    let t = 0;
    run(dt => {
      t += dt;
      for (let i = 0; i < 4; i++) {
        const k = Math.random(), p = from.clone().addScaledVector(dir, k);
        ADD.spawn({ x: p.x, y: p.y, z: p.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), life: 0.3, s0: 0.3, s1: 0, c0: P.c2, c1: P.c, intensity: 2.5, frame: type === 'Ice' ? TILE.shard : TILE.spark, rotV: 5 });
      }
      if (type === 'Psychic' || type === 'Dragon' || type === 'Dark') { if (Math.random() < 0.25) airRing(from.clone().addScaledVector(dir, Math.random()), P.c, { from: 0.4, to: 1.2, dur: 0.3 }); }
      typeBurst(to, type, 0.12);
      return t < 1.3;
    });
    await wait(1300);
    impact(to, type, 1.2 * pw);
    if (type === 'Ice') { decal('frost', to, 3); for (let i = 0; i < 6; i++) debris('ice', to.clone(), sphereDir().multiplyScalar(4).setY(rnd(2, 5)), { color: 0xbfefff, life: 1.2 }); }
    await wait(150);
  };
  S.stream = async (c) => {
    const { a, d, P, type, mv } = c;
    World.cast(a);
    await wait(260);
    const from = mouthOf(a), to = centerOf(d), dir = to.clone().sub(from), dist = dir.length();
    dir.normalize();
    const speed = 11, life = dist / speed;
    flashLight(from, P.c, { intensity: 30, dur: 0.3, hold: 1.4 });
    flashLight(to, P.c, { intensity: 45, dur: 0.4, hold: 1.4 });
    SFX.stream(type, 1.5);
    let t = 0;
    run(dt => {
      t += dt;
      const n = type === 'Fire' || type === 'Dragon' ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const sp = speed * rnd(0.85, 1.15), sv = dir.clone().multiplyScalar(sp).add(rv(0.9));
        const base = { x: from.x, y: from.y, z: from.z, vx: sv.x, vy: sv.y, vz: sv.z, life: life * rnd(0.9, 1.25) };
        if (type === 'Fire' || type === 'Dragon') ADD.spawn({ ...base, s0: 0.25, s1: rnd(0.8, 1.15), c0: C(1, 0.9, 0.6), c1: P.c, intensity: 2, frame: TILE.flame, align: true, alignOff: -Math.PI / 2, fadeOut: 0.4 });
        else if (type === 'Water') ADD.spawn({ ...base, gy: -3, s0: 0.25, s1: 0.5, c0: P.c2, c1: P.c, intensity: 1.8, frame: i % 2 ? TILE.drop : TILE.glow, align: true, alignOff: -Math.PI / 2 });
        else if (type === 'Ice') ADD.spawn({ ...base, s0: 0.2, s1: 0.45, c0: C(1, 1, 1), c1: P.c, intensity: 2, frame: i % 2 ? TILE.shard : TILE.glow, rotV: rnd(-6, 6) });
        else if (type === 'Flying') ADD.spawn({ ...base, s0: 0.6, s1: 1.2, c0: P.c2, c1: P.c, intensity: 1.4, frame: TILE.streak, align: true });
        else if (type === 'Poison') ADD.spawn({ ...base, s0: 0.2, s1: 0.5, c0: P.c, c1: P.c2, intensity: 2, frame: TILE.bubble });
        else if (type === 'Ground') NORM.spawn({ ...base, s0: 0.3, s1: 0.9, c0: P.c, alpha: 0.7, frame: TILE.smoke });
        else ADD.spawn({ ...base, s0: 0.3, s1: 0.7, c0: P.c2, c1: P.c, intensity: 2.4, frame: TILE.glow });
      }
      if (type === 'Fire' && Math.random() < 0.4) smoke(to, 1);
      typeBurst(to, type, 0.08);
      return t < 1.5;
    });
    await wait(1500 + life * 600);
    impact(to, type, 1.1 * power(mv), { ring: false });
    if (type === 'Fire') decal('scorch', to, 3);
    if (type === 'Water') decal('puddle', to, 3);
    await wait(100);
  };
  S.bolt = async (c) => {
    const { a, d, P, mv } = c;
    const A = World.actors[a];
    World.cast(a);
    for (let i = 0; i < 30; i++) { const o = centerOf(a).add(sphereDir().multiplyScalar(A.height * 0.6)); bolt(centerOf(a), o, P.c, { dur: 0.15, width: 0.06, jag: 0.6 }); await wait(18); }
    const from = World.anchor(a, 'top'), to = centerOf(d);
    for (let i = 0; i < 6; i++) { bolt(from, to.clone().add(rv(0.3)), P.c, { dur: 0.45, width: 0.2 }); await wait(90); }
    flashLight(to, P.c, { intensity: 80, dur: 0.4, hold: 0.3 });
    screenFlash(C(1, 1, 0.7), 0.25, 0.2, true);
    bloomKick(0.6);
    await wait(250);
    impact(to, 'Electric', 1.2 * power(mv));
    await wait(150);
  };
  S.sky = async (c) => {
    const { d, P, mv } = c;
    const to = centerOf(d), top = to.clone().setY(16);
    screenFlash(C(0.05, 0.05, 0.12), 0.5, 0.9);
    await wait(250);
    SFX.thunder();
    for (let i = 0; i < 3; i++) {
      bolt(top.clone().add(v3(rnd(-1.5, 1.5), 0, rnd(-1.5, 1.5))), i === 2 ? to : to.clone().add(v3(rnd(-1.5, 1.5), -to.y + 0.1, rnd(-1.5, 1.5))), P.c, { dur: 0.35, width: 0.24, jag: 0.25 });
      flashLight(to, P.c, { intensity: 70, dur: 0.3 });
      screenFlash(C(1, 1, 0.85), 0.4, 0.15, true);
      World.shake(0.2);
      await wait(160);
    }
    bloomKick(0.9);
    impact(to, 'Electric', 1.5 * power(mv));
    decal('scorch', to, 3);
    groundRing(to, P.c, { to: 6, dur: 0.6 });
    await wait(200);
  };
  S.quake = async (c) => {
    const { a, d, mv } = c;
    const A = World.actors[a], from = A.root.position.clone(), to = World.actors[d].root.position.clone();
    await World.flex(a);
    SFX.quake();
    World.shake(0.55);
    bloomKick(0.2);
    for (let i = 0; i < 3; i++) { groundRing(from, C(0.9, 0.7, 0.4), { to: 14, dur: 0.9, intensity: 1.5 }); dust(from, 14); await wait(140); }
    const dir = to.clone().sub(from);
    for (let k = 0.2; k <= 1.01; k += 0.2) { const p = from.clone().addScaledVector(dir, k); dust(p, 5); decal('crack', p, 2.2, 3.5); }
    decal('crack', to, 4, 4);
    for (let i = 0; i < 10; i++) debris('rock', to.clone().setY(0.2), v3(rnd(-3, 3), rnd(5, 9), rnd(-3, 3)), { color: 0x8b6b45, life: 1.5 });
    impact(centerOf(d), 'Ground', 1.4 * power(mv), { ring: false });
    await wait(350);
  };
  S.rockslide = async (c) => {
    const { a, d, mv } = c;
    World.cast(a);
    const to = World.actors[d].root.position.clone();
    SFX.rumble(1.3);
    for (let i = 0; i < 9; i++) {
      const start = to.clone().add(v3(rnd(-1.6, 1.6), rnd(7, 10), rnd(-1.6, 1.6)));
      debris('rock', start, v3(rnd(-0.5, 0.5), -6, rnd(-0.5, 0.5)), { color: 0x7d6e5a, life: 1.6, scale: rnd(1.4, 2.4) });
      await wait(55);
    }
    await wait(450);
    World.shake(0.3);
    dust(to, 18);
    impact(centerOf(d), 'Rock', 1.2 * power(mv), { ring: false });
    await wait(250);
  };
  S.spikes = async (c) => {
    const { a, d, type, mv } = c;
    World.cast(a);
    const from = World.actors[a].root.position.clone(), to = World.actors[d].root.position.clone(), dir = to.clone().sub(from);
    const ice = type === 'Ice';
    SFX.rumble(0.9);
    for (let k = 0.25; k < 1; k += 0.15) spike(from.clone().addScaledVector(dir, k).add(v3(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3))), ice ? 0xbfefff : 0x8a7a66, { h: lerp(0.8, 1.6, k), delay: k * 0.35, kind: ice ? 'ice' : 'rock' });
    for (let i = 0; i < 5; i++) spike(to.clone().add(v3(Math.cos(i * 1.256) * 0.6, 0, Math.sin(i * 1.256) * 0.6)), ice ? 0xd8f6ff : 0x9a8a72, { h: rnd(2, 3), delay: 0.42, life: 1.1, kind: ice ? 'ice' : 'rock' });
    await wait(500);
    World.shake(0.35);
    impact(centerOf(d), type, 1.3 * power(mv));
    await wait(350);
  };
  S.geyser = async (c) => {
    const { a, d, P, type, mv } = c;
    World.cast(a);
    const g = World.actors[d].root.position.clone();
    groundRing(g, P.c, { from: 2.5, to: 0.5, dur: 0.4 });
    SFX.rumble(1.1);
    flashLight(g.clone().setY(0.5), P.c, { intensity: 40, dur: 0.3, hold: 0.9 });
    await wait(350);
    World.shake(0.3);
    let t = 0;
    run(dt => {
      t += dt;
      for (let i = 0; i < 10; i++) {
        const r = rnd(0, 0.7), an = Math.random() * 6.28;
        const base = { x: g.x + Math.cos(an) * r, y: 0.1, z: g.z + Math.sin(an) * r, vx: rnd(-0.6, 0.6), vy: rnd(7, 11), vz: rnd(-0.6, 0.6), gy: -5, life: rnd(0.5, 0.8) };
        if (type === 'Ground' || type === 'Rock') { NORM.spawn({ ...base, s0: 0.4, s1: 1.3, c0: C(0.75, 0.55, 0.3), alpha: 0.7, frame: TILE.smoke }); if (Math.random() < 0.06) debris('rock', g.clone(), v3(rnd(-2, 2), rnd(6, 10), rnd(-2, 2)), { color: 0x8b6b45 }); }
        else ADD.spawn({ ...base, s0: 0.5, s1: 1.1, c0: P.c2, c1: P.c, intensity: 2.4, frame: TILE[P.tex === 'rock' ? 'glow' : P.tex], align: P.tex === 'flame' || P.tex === 'drop', alignOff: -Math.PI / 2 });
      }
      return t < 0.8;
    });
    await wait(400);
    impact(centerOf(d), type, 1.2 * power(mv), { ring: false });
    await wait(400);
  };
  S.wave = async (c) => {
    const { a, d, P, type, mv } = c;
    World.flex(a);
    const A = World.actors[a].root.position.clone(), D = World.actors[d].root.position.clone();
    const dir = D.clone().sub(A).setY(0).normalize(), perp = v3(-dir.z, 0, dir.x);
    const water = type === 'Water' || type === 'Ground';
    const color = type === 'Ground' ? C(0.5, 0.38, 0.22) : P.c;
    // a curling wall of water/energy sweeping across the field
    const geo = new THREE.PlaneGeometry(9, 3.2, 40, 10);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) + 1.6, x = pa.getX(i); pa.setZ(i, Math.sin((y / 3.2) * Math.PI * 0.9) * 0.9 - (y / 3.2) * 0.3 + Math.cos(x * 1.3) * 0.12); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: color.clone(), emissive: color.clone().multiplyScalar(0.35), transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(geo, mat);
    transient.add(wall);
    wall.position.copy(A).addScaledVector(dir, -1.5).setY(1.6);
    wall.lookAt(wall.position.clone().add(dir));
    scene.add(wall);
    const start = wall.position.clone(), end = D.clone().addScaledVector(dir, 3).setY(1.6);
    SFX.stream(water ? 'Water' : type, 1.3);
    let hit = false;
    await tween(1.8, k => {
      wall.position.lerpVectors(start, end, k);
      wall.scale.set(1, Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.85) * 4), 1);
      mat.opacity = 0.82 * (1 - Math.max(0, k - 0.8) * 5);
      for (let i = 0; i < 5; i++) {
        const p = wall.position.clone().addScaledVector(perp, rnd(-4.2, 4.2)); p.y = 2.9 * wall.scale.y;
        ADD.spawn({ x: p.x, y: p.y, z: p.z, vx: dir.x * 3 + rnd(-1, 1), vy: rnd(0.5, 2), vz: dir.z * 3 + rnd(-1, 1), gy: -8, life: 0.6, s0: 0.35, s1: 0.15, c0: water ? C(0.9, 0.97, 1) : P.c2, c1: color, intensity: 1.8, frame: water ? TILE.drop : TILE.glow, align: true, alignOff: -Math.PI / 2 });
      }
      if (!hit && wall.position.distanceTo(D.clone().setY(1.6)) < 1) { hit = true; impact(centerOf(d), type, 1.1 * power(mv), { ring: false }); }
    });
    scene.remove(wall); transient.delete(wall); geo.dispose(); mat.dispose();
    if (water) decal(type === 'Ground' ? 'scorch' : 'puddle', D, 4);
  };
  S.sound = async (c) => {
    const { a, d, P, mv } = c;
    World.flex(a);
    const from = mouthOf(a), to = centerOf(d), dir = to.clone().sub(from);
    SFX.sonic();
    for (let i = 0; i < 7; i++) {
      const s = airRing(from.clone(), P.c, { from: 0.4, to: 2.2, dur: 0.55, delay: i * 0.08, intensity: 2.2 });
      const start = from.clone();
      run((() => { let t = -i * 0.08; return dt => { t += dt; if (t < 0) return true; s.position.copy(start).addScaledVector(dir, Math.min(1, t / 0.55)); return t < 0.55; }; })());
      if (i % 2 === 0) ADD.spawn({ x: from.x, y: from.y, z: from.z, vx: dir.x * 1.6 + rnd(-1, 1), vy: dir.y * 1.6 + rnd(0.5, 1.5), vz: dir.z * 1.6 + rnd(-1, 1), life: 0.8, s0: 0.5, s1: 0.4, c0: P.c2, intensity: 2, frame: TILE.note, delay: i * 0.08 });
    }
    await wait(650);
    if (mv.power) impact(to, c.type, power(mv));
    else World.shake(0.1);
    await wait(150);
  };
  S.wind = async (c) => {
    const { a, d, P, type, mv } = c;
    World.cast(a);
    const g = World.actors[d].root.position.clone();
    SFX.stream('Flying', 1.0);
    let t = 0;
    run(dt => {
      t += dt;
      for (let i = 0; i < 8; i++) {
        const an = Math.random() * 6.28, h = rnd(0, 4), r0 = 0.3 + h * 0.35;
        let ang = an;
        ADD.spawn({ x: g.x, y: h, z: g.z, life: rnd(0.4, 0.8), s0: 0.7, s1: 1.1, c0: P.c2, c1: P.c, intensity: 1.6, frame: type === 'Ice' ? TILE.shard : TILE.streak, follow: (p, dt2) => { ang += dt2 * 9; p.x = g.x + Math.cos(ang) * r0; p.z = g.z + Math.sin(ang) * r0; p.y += dt2 * 1.5; p.rot = -ang; } });
      }
      if (Math.random() < 0.3) NORM.spawn({ x: g.x + rnd(-1, 1), y: 0.3, z: g.z + rnd(-1, 1), vy: 2, life: 0.8, s0: 0.6, s1: 1.6, c0: C(0.85, 0.85, 0.85), alpha: 0.35, frame: TILE.smoke });
      return t < 1;
    });
    await wait(1000);
    impact(centerOf(d), type, power(mv), { ring: false });
    await wait(150);
  };
  S.multi = async (c) => {
    const { a, d, P, type, mv } = c;
    World.cast(a);
    await wait(150);
    const n = 6;
    SFX.cast(type);
    for (let i = 0; i < n; i++) {
      const from = mouthOf(a), to = centerOf(d).add(rv(0.4)), cur = from.clone();
      const frame = TILE[{ Grass: 'leaf', Bug: 'spark', Ice: 'shard', Rock: 'rock', Normal: 'star', Water: 'drop', Steel: 'shard', Fire: 'flame', Fairy: 'star' }[type] || 'glow'];
      const sys = type === 'Grass' || type === 'Rock' ? NORM : ADD;
      const p = sys.spawn({ x: cur.x, y: cur.y, z: cur.z, life: 0.32, s0: 0.5, s1: 0.5, c0: type === 'Rock' ? C(0.6, 0.52, 0.42) : P.c2, intensity: sys === ADD ? 2.5 : 1, frame, rotV: 14, fadeIn: 0.01, fadeOut: 0.01, follow: (pp, dt) => { const k = Math.min(1, pp.age / 0.3); pp.x = lerp(from.x, to.x, k); pp.y = lerp(from.y, to.y, k) + Math.sin(k * Math.PI) * 0.3; pp.z = lerp(from.z, to.z, k); ADD.spawn({ x: pp.x, y: pp.y, z: pp.z, life: 0.2, s0: 0.25, s1: 0, c0: P.c, intensity: 2, frame: TILE.glow }); } });
      later(() => typeBurst(to, type, 0.35), 300);
      await wait(75);
    }
    await wait(300);
    impact(centerOf(d), type, 0.9 * power(mv), { ring: false });
    await wait(100);
  };
  S.vortex = async (c) => {
    const { a, d, P, type } = c;
    World.cast(a);
    const g = World.actors[d].root.position.clone(), H = World.actors[d].height;
    SFX.stream(type, 1.1);
    let t = 0;
    run(dt => {
      t += dt;
      for (let i = 0; i < 6; i++) {
        let ang = Math.random() * 6.28; const y0 = rnd(0, H * 1.1), r0 = World.actors[d].radius + 0.4;
        ADD.spawn({ x: g.x, y: y0, z: g.z, life: 0.6, s0: 0.6, s1: 0.2, c0: P.c2, c1: P.c, intensity: 2.2, frame: TILE[P.tex === 'rock' ? 'smoke' : P.tex], follow: (p, dt2) => { ang += dt2 * 8; p.x = g.x + Math.cos(ang) * r0; p.z = g.z + Math.sin(ang) * r0; p.y += dt2 * 0.8; } });
      }
      return t < 1.1;
    });
    flashLight(g.clone().setY(1), P.c, { intensity: 40, dur: 0.3, hold: 0.9 });
    await wait(1100);
  };
  // contact attacks: dash in, style-specific impact, dash back
  S.contact = async (c) => {
    const { a, d, P, type, mv, variant } = c;
    const fast = ['quick-attack', 'extreme-speed', 'aqua-jet', 'bullet-punch', 'mach-punch', 'shadow-sneak', 'sucker-punch', 'fake-out', 'accelerock'].includes(mv.id);
    const A = World.actors[a];
    let aura = null;
    if (variant === 'charge' && (mv.power || 0) >= 70 || fast) {
      aura = (dt) => { const p = centerOf(a); for (let i = 0; i < 4; i++) ADD.spawn({ x: p.x + rnd(-0.5, 0.5), y: p.y + rnd(-0.6, 0.6), z: p.z + rnd(-0.5, 0.5), vy: 1, life: 0.35, s0: 0.6, s1: 0.1, c0: P.c2, c1: P.c, intensity: 2.2, frame: TILE[fast ? 'streak' : (P.tex === 'rock' ? 'glow' : P.tex)], align: P.tex === 'flame' || fast, alignOff: fast ? 0 : -Math.PI / 2 }); return !!aura; };
      run(aura);
    }
    SFX.whoosh();
    const from = await World.lungeTo(a, d, { speed: fast ? 1.8 : 1, jump: variant === 'kick' ? 0.8 : variant === 'charge' ? 0.25 : 0.45 });
    aura = null;
    const hit = centerOf(d), pw = power(mv);
    if (variant === 'claws') { for (let i = 0; i < 3; i++) slash(hit.clone(), P.c, { angle: -0.5 + i * 0.12, size: 1.6 + i * 0.1, delay: i * 0.05, width: 0.2 }); }
    else if (variant === 'jaws') { slash(hit.clone().add(v3(0, 0.25, 0)), C(1, 1, 1), { angle: Math.PI, size: 1.3, width: 0.22 }); slash(hit.clone().add(v3(0, -0.25, 0)), C(1, 1, 1), { angle: 0, size: 1.3, width: 0.22 }); }
    else if (variant === 'tail') slash(hit.clone(), P.c, { angle: 0.3, size: 2.6, width: 0.35, dur: 0.32 });
    else if (variant === 'kick') groundRing(World.actors[d].root.position, P.c, { to: 3.5 });
    impact(hit, type === 'Normal' && variant !== 'charge' ? 'Fighting' : type, (variant === 'charge' ? 1.25 : 1) * pw);
    if (variant === 'fist' || variant === 'kick') ADD.spawn({ x: hit.x, y: hit.y, z: hit.z, life: 0.22, s0: 2.6 * pw, s1: 3.4 * pw, c0: C(1, 1, 1), c1: P.c, intensity: 3, frame: TILE.star, fadeIn: 0.01, rotV: 2 });
    if (variant === 'charge' && pw > 1.2) { screenFlash(P.c2, 0.25, 0.2, true); World.shake(0.3); }
    if (mv.drain > 0 && !CUR.miss && !CUR.blocked && CUR.eff !== 0) S.drainFlow(d, a, P);
    await wait(120);
    await World.lungeBack(a, from, d);
  };
  S.drainFlow = (from, to, P) => {
    const src = centerOf(from), dst = centerOf(to);
    for (let i = 0; i < 18; i++) {
      const ctrl = src.clone().lerp(dst, 0.5).add(v3(rnd(-1.5, 1.5), rnd(1, 2.5), rnd(-1.5, 1.5)));
      ADD.spawn({ x: src.x, y: src.y, z: src.z, life: 0.8, delay: i * 0.03, s0: 0.35, s1: 0.2, c0: C(0.6, 1, 0.5), c1: C(0.3, 1, 0.4), intensity: 2.5, frame: TILE.glow, fadeIn: 0.05, follow: (p) => {
        const k = p.age / p.life, u = 1 - k;
        p.x = u * u * src.x + 2 * u * k * ctrl.x + k * k * dst.x; p.y = u * u * src.y + 2 * u * k * ctrl.y + k * k * dst.y; p.z = u * u * src.z + 2 * u * k * ctrl.z + k * k * dst.z;
      } });
    }
    later(() => { S.healSparkle(to, C(0.5, 1, 0.5)); SFX.heal(); }, 700);
  };
  S.drain = async (c) => {
    const { a, d, P, type, mv } = c;
    World.cast(a);
    await wait(200);
    impact(centerOf(d), type, 0.8 * power(mv), { ring: false });
    S.drainFlow(d, a, P);
    await wait(1000);
  };
  S.healSparkle = (p, color = C(0.5, 1, 0.6)) => {
    const g = World.actors[p].root.position, H = World.actors[p].height;
    for (let i = 0; i < 40; i++) {
      const an = Math.random() * 6.28, r = rnd(0.3, World.actors[p].radius + 0.5);
      ADD.spawn({ x: g.x + Math.cos(an) * r, y: rnd(0, H * 0.6), z: g.z + Math.sin(an) * r, vy: rnd(1, 2.5), life: rnd(0.7, 1.2), delay: Math.random() * 0.4, s0: 0.3, s1: 0.05, c0: C(1, 1, 1), c1: color, intensity: 2.5, frame: i % 3 ? TILE.spark : TILE.star });
    }
    groundRing(g, color, { from: 0.5, to: 3, dur: 0.8 });
    flashLight(g.clone().setY(1.5), color, { intensity: 30, dur: 0.6 });
  };
  S.heal = async (c) => {
    const { a, mv } = c;
    World.flex(a);
    const isRest = mv.id === 'rest';
    SFX.heal();
    shell(centerOf(a), C(0.5, 1, 0.6), { from: 0.5, to: World.actors[a].height * 0.8, dur: 0.7, intensity: 1.5 });
    S.healSparkle(a, mv.id === 'moonlight' ? C(0.7, 0.75, 1) : C(0.5, 1, 0.6));
    if (isRest) for (let i = 0; i < 4; i++) ADD.spawn({ x: World.anchor(a, 'top').x, y: World.anchor(a, 'top').y, z: World.anchor(a, 'top').z, vx: rnd(0.2, 0.6), vy: 0.8, life: 1.2, delay: 0.5 + i * 0.25, s0: 0.3, s1: 0.6, c0: C(0.8, 0.9, 1), intensity: 1.8, frame: TILE.z });
    await wait(1000);
  };
  const STAT_COLOR = { attack: C(1, 0.3, 0.15), defense: C(0.4, 0.7, 1), 'special-attack': C(0.85, 0.35, 1), 'special-defense': C(0.4, 1, 0.6), speed: C(0.3, 1, 1), evasion: C(1, 1, 1), accuracy: C(1, 1, 0.6) };
  S.buff = async (c) => {
    const { a, mv, P } = c;
    const g = World.actors[a].root.position.clone(), H = World.actors[a].height, R = World.actors[a].radius + 0.5;
    const main = (mv.stats.find(([, n]) => n > 0) || ['attack'])[0];
    const color = STAT_COLOR[main] || P.c;
    World.flex(a);
    SFX.buff();
    if (mv.id === 'swords-dance') {
      for (let i = 0; i < 6; i++) { let ang = i / 6 * 6.28; ADD.spawn({ x: g.x, y: H * 0.6, z: g.z, life: 1.1, s0: 0.9, s1: 0.9, c0: C(1, 1, 1), c1: C(0.8, 0.85, 1), intensity: 2.6, frame: TILE.shard, follow: (p, dt) => { ang += dt * 6; const r = R * (1 - p.age / p.life * 0.8); p.x = g.x + Math.cos(ang) * r; p.z = g.z + Math.sin(ang) * r; p.y = H * 0.6 + Math.sin(ang * 2) * 0.2; p.rot = 0; } }); }
    } else if (mv.id === 'dragon-dance') {
      for (let i = 0; i < 70; i++) { let ang = Math.random() * 6.28; const y0 = Math.random() * 0.5; ADD.spawn({ x: g.x, y: y0, z: g.z, life: 1, delay: Math.random() * 0.4, s0: 0.6, s1: 0.2, c0: i % 2 ? C(1, 0.3, 0.2) : C(0.3, 0.5, 1), intensity: 2.6, frame: TILE.flame, follow: (p, dt) => { ang += dt * 7; p.x = g.x + Math.cos(ang) * R; p.z = g.z + Math.sin(ang) * R; p.y += dt * H * 1.2; } }); }
    } else if (mv.id === 'agility' || main === 'speed') {
      for (let i = 0; i < 40; i++) { const an = Math.random() * 6.28; ADD.spawn({ x: g.x + Math.cos(an) * R, y: rnd(0.2, H), z: g.z + Math.sin(an) * R, vx: -Math.sin(an) * 9, vz: Math.cos(an) * 9, life: 0.35, delay: Math.random() * 0.6, s0: 1.2, s1: 0.4, c0: C(1, 1, 1), c1: color, intensity: 2, frame: TILE.streak, align: true }); }
    } else if (main === 'defense' || main === 'special-defense') {
      shell(centerOf(a), color, { from: 0.3, to: H * 0.75, dur: 0.5, hold: 0.4, intensity: 2 });
      for (let i = 0; i < 3; i++) later(() => { World.actors[a].flash = 0.6; later(() => World.actors[a].flash = 0, 80); }, i * 160);
    }
    // rising aura + chevrons (all buffs)
    for (let i = 0; i < 50; i++) { const an = Math.random() * 6.28, r = rnd(0.2, R); ADD.spawn({ x: g.x + Math.cos(an) * r, y: rnd(0, 0.4), z: g.z + Math.sin(an) * r, vy: rnd(2, 4), life: rnd(0.5, 0.9), delay: Math.random() * 0.5, s0: 0.5, s1: 0.1, c0: color, c1: C(1, 1, 1), intensity: 2.2, frame: i % 4 ? TILE.flame : TILE.spark }); }
    groundRing(g, color, { from: 0.5, to: R * 2.2, dur: 0.6 });
    flashLight(g.clone().setY(1.2), color, { intensity: 35, dur: 0.5, hold: 0.4 });
    bloomKick(0.2);
    await wait(1000);
  };
  S.debuff = async (c) => {
    const { a, d, P, mv } = c;
    const tgt = centerOf(d), g = World.actors[d].root.position, H = World.actors[d].height;
    SFX.debuff();
    if (c.variant === 'hearts') {
      const from = mouthOf(a);
      for (let i = 0; i < 12; i++) ADD.spawn({ x: from.x, y: from.y, z: from.z, life: 0.8, delay: i * 0.05, s0: 0.4, s1: 0.5, c0: C(1, 0.5, 0.75), intensity: 2.2, frame: TILE.heart, follow: (p) => { const k = p.age / p.life; p.x = lerp(from.x, tgt.x, k) + Math.sin(k * 9 + i) * 0.3; p.y = lerp(from.y, tgt.y, k) + Math.sin(k * Math.PI) * 0.8; p.z = lerp(from.z, tgt.z, k); } });
      await wait(800);
    } else if (c.variant === 'dust') {
      World.cast(a);
      await wait(250);
      dust(g, 24, mv.id === 'smokescreen' ? C(0.25, 0.25, 0.28) : C(0.8, 0.68, 0.45));
      await wait(500);
    } else {
      // glare: eye glint on the user, then a red shock on the target
      const eye = World.anchor(a, 'head');
      ADD.spawn({ x: eye.x, y: eye.y, z: eye.z, life: 0.35, s0: 0.3, s1: 1.4, c0: C(1, 1, 1), c1: C(1, 0.2, 0.2), intensity: 3, frame: TILE.spark, rotV: 4 });
      await wait(300);
      shell(tgt, C(1, 0.15, 0.15), { from: 0.4, to: H * 0.9, dur: 0.35, intensity: 2 });
      await wait(200);
    }
    // downward arrows on the target
    for (let i = 0; i < 18; i++) { const an = Math.random() * 6.28, r = rnd(0.2, World.actors[d].radius + 0.3); ADD.spawn({ x: g.x + Math.cos(an) * r, y: rnd(H * 0.6, H * 1.1), z: g.z + Math.sin(an) * r, vy: -3, life: 0.5, delay: Math.random() * 0.3, s0: 0.8, s1: 0.3, c0: C(0.4, 0.6, 1), intensity: 2, frame: TILE.streak, align: true }); }
    await wait(400);
  };
  S.powder = async (c) => {
    const { a, d, mv } = c;
    const color = { 'sleep-powder': C(0.5, 1, 0.5), spore: C(0.75, 1, 0.4), 'stun-spore': C(1, 0.9, 0.3), 'poison-powder': C(0.75, 0.35, 1), 'cotton-spore': C(1, 1, 1) }[mv.id] || C(0.6, 1, 0.6);
    World.flex(a);
    SFX.powder();
    const from = centerOf(a), to = centerOf(d);
    for (let i = 0; i < 70; i++) {
      const ctrl = from.clone().lerp(to, 0.5).add(v3(rnd(-1, 1), rnd(1, 2), rnd(-1, 1))), end = to.clone().add(rv(0.8));
      ADD.spawn({ x: from.x, y: from.y, z: from.z, life: rnd(1.1, 1.5), delay: Math.random() * 0.5, s0: 0.12, s1: 0.22, c0: color, intensity: 2.4, frame: TILE.glow, fadeOut: 0.3, follow: (p) => { const k = Math.min(1, p.age / (p.life * 0.75)), u = 1 - k; p.x = u * u * from.x + 2 * u * k * ctrl.x + k * k * end.x + Math.sin(p.age * 4 + p.rot) * 0.15; p.y = u * u * from.y + 2 * u * k * ctrl.y + k * k * end.y; p.z = u * u * from.z + 2 * u * k * ctrl.z + k * k * end.z; } });
    }
    await wait(1500);
  };
  S.hypno = async (c) => {
    const { a, d, P, mv } = c;
    const color = mv.id === 'confuse-ray' ? C(1, 0.85, 0.3) : mv.type === 'Psychic' ? P.c : C(0.8, 0.5, 1);
    World.flex(a);
    const from = World.anchor(a, 'head'), to = World.anchor(d, 'head'), dir = to.clone().sub(from);
    SFX.cast('Psychic');
    for (let i = 0; i < 8; i++) {
      const s = airRing(from.clone(), color, { from: 0.3, to: 1.6, dur: 0.7, delay: i * 0.09 });
      run((() => { let t = -i * 0.09; return dt => { t += dt; if (t < 0) return true; s.position.copy(from).addScaledVector(dir, Math.min(1, t / 0.7)); return t < 0.7; }; })());
    }
    await wait(800);
    for (let i = 0; i < 3; i++) { let ang = i * 2.09; ADD.spawn({ x: to.x, y: to.y + 0.4, z: to.z, life: 0.9, s0: 0.35, s1: 0.35, c0: C(1, 1, 0.6), intensity: 2.5, frame: TILE.star, follow: (p, dt) => { ang += dt * 7; p.x = to.x + Math.cos(ang) * 0.6; p.z = to.z + Math.sin(ang) * 0.6; } }); }
    await wait(500);
  };
  S.wisp = async (c) => {
    const { a, d } = c;
    World.cast(a);
    SFX.cast('Ghost');
    const from = centerOf(a), to = centerOf(d);
    for (let i = 0; i < 4; i++) {
      let ang = i * 1.57;
      ADD.spawn({ x: from.x, y: from.y, z: from.z, life: 1.2, s0: 0.7, s1: 0.4, c0: C(0.4, 0.6, 1), c1: C(0.6, 0.4, 1), intensity: 2.8, frame: TILE.flame, follow: (p, dt) => {
        ang += dt * 6; const k = clamp((p.age - 0.4) / 0.6, 0, 1);
        const cx = lerp(from.x, to.x, k), cy = lerp(from.y, to.y, k), cz = lerp(from.z, to.z, k), r = 0.9 * (1 - k * 0.7);
        p.x = cx + Math.cos(ang) * r; p.y = cy + Math.sin(ang * 2) * 0.2; p.z = cz + Math.sin(ang) * r; p.rot = 0;
      } });
    }
    await wait(1100);
    typeBurst(to, 'Fire', 0.6);
    await wait(150);
  };
  S.twave = async (c) => {
    const { a, d } = c;
    World.cast(a);
    const to = centerOf(d), H = World.actors[d].height;
    for (let i = 0; i < 5; i++) airRing(to, C(1, 0.9, 0.2), { from: 3, to: 0.3, dur: 0.4, delay: i * 0.1 });
    await wait(450);
    for (let i = 0; i < 6; i++) bolt(to.clone().add(sphereDir().multiplyScalar(H * 0.5)), to.clone().add(sphereDir().multiplyScalar(H * 0.5)), C(1, 0.9, 0.2), { dur: 0.25, width: 0.07, jag: 0.8 });
    typeBurst(to, 'Electric', 0.6);
    await wait(400);
  };
  S.seed = async (c) => {
    const { a, d } = c;
    World.cast(a);
    const from = mouthOf(a), to = World.actors[d].root.position.clone();
    SFX.cast('Grass');
    for (let i = 0; i < 3; i++) {
      const end = to.clone().add(v3(rnd(-0.5, 0.5), 0.1, rnd(-0.5, 0.5)));
      NORM.spawn({ x: from.x, y: from.y, z: from.z, life: 0.5, delay: i * 0.08, s0: 0.25, s1: 0.25, c0: C(0.55, 0.4, 0.2), frame: TILE.drop, follow: (p) => { const k = p.age / p.life; p.x = lerp(from.x, end.x, k); p.y = lerp(from.y, end.y, k) + Math.sin(k * Math.PI) * 1.2; p.z = lerp(from.z, end.z, k); } });
    }
    await wait(600);
    const H = World.actors[d].height, R = World.actors[d].radius + 0.2;
    for (let i = 0; i < 60; i++) { let ang = (i / 60) * 12; NORM.spawn({ x: to.x, y: 0.1, z: to.z, life: 1, delay: i * 0.008, s0: 0.3, s1: 0.25, c0: C(0.3, 0.75, 0.25), frame: TILE.leaf, follow: (p) => { const k = Math.min(1, p.age / 0.5); p.x = to.x + Math.cos(ang) * R; p.z = to.z + Math.sin(ang) * R; p.y = 0.1 + k * (i / 60) * H; } }); }
    await wait(700);
  };
  S.shield = async (c) => {
    const { a } = c;
    World.flex(a);
    const A = World.actors[a];
    SFX.shield();
    shell(centerOf(a), C(0.35, 1, 0.6), { from: 0.4, to: Math.max(A.height, A.radius * 2) * 0.75, dur: 0.25, hold: 0.6, intensity: 2.2, follow: p => p.copy(centerOf(a)) });
    flashLight(centerOf(a), C(0.4, 1, 0.6), { intensity: 30, dur: 0.3, hold: 0.5 });
    await wait(900);
  };
  S.toxic = async (c) => {
    const { a, d } = c;
    World.cast(a);
    SFX.status('psn');
    const from = mouthOf(a), to = centerOf(d);
    for (let i = 0; i < 20; i++) ADD.spawn({ x: from.x, y: from.y, z: from.z, life: 0.5, delay: i * 0.02, s0: 0.35, s1: 0.35, c0: C(0.7, 0.2, 0.95), intensity: 2, frame: TILE.bubble, follow: (p) => { const k = p.age / p.life; p.x = lerp(from.x, to.x, k); p.y = lerp(from.y, to.y, k) + Math.sin(k * Math.PI) * 1; p.z = lerp(from.z, to.z, k); } });
    await wait(600);
    typeBurst(to, 'Poison', 1.2);
    await wait(300);
  };
  S.generic = async (c) => { World.flex(c.a); typeBurst(centerOf(c.a), c.type, 0.6); await wait(600); };

  // ---------------------------------------------------------------
  //  Move -> style classification
  // ---------------------------------------------------------------
  const GROUP = {
    stream: 'flamethrower hydro-pump water-gun dragon-breath acid-spray powder-snow icy-wind gust incinerate scald mud-shot sludge smog fire-pledge water-pledge flame-wheel bubble'.split(' '),
    beam: 'ice-beam aurora-beam psybeam signal-beam charge-beam flash-cannon dragon-pulse solar-beam hyper-beam bubble-beam power-gem tri-attack mirror-shot overheat steel-beam origin-pulse'.split(' '),
    'orb:big': 'fire-blast focus-blast zap-cannon draco-meteor inferno blast-burn'.split(' '),
    orb: 'shadow-ball energy-ball aura-sphere sludge-bomb electro-ball moonblast water-pulse mist-ball weather-ball seed-bomb mud-bomb ice-ball gyro-ball dark-pulse dragon-rage night-shade psyshock psychic confusion ember extrasensory'.split(' '),
    bolt: 'thunderbolt thunder-shock discharge shock-wave parabolic-charge nuzzle'.split(' '),
    sky: 'thunder'.split(' '),
    quake: 'earthquake bulldoze magnitude stomping-tantrum fissure'.split(' '),
    rockslide: 'rock-slide rock-throw rock-tomb ancient-power smack-down rock-blast'.split(' '),
    spikes: 'stone-edge icicle-crash precipice-blades'.split(' '),
    geyser: 'earth-power eruption lava-plume'.split(' '),
    wave: 'surf muddy-water heat-wave'.split(' '),
    sound: 'hyper-voice bug-buzz uproar round echoed-voice boomburst disarming-voice snarl'.split(' '),
    wind: 'hurricane twister air-cutter whirlwind blizzard'.split(' '),
    multi: 'bullet-seed pin-missile icicle-spear swift razor-leaf magical-leaf petal-dance leaf-storm water-shuriken ice-shard spike-cannon twineedle scale-shot barrage'.split(' '),
    vortex: 'fire-spin whirlpool sand-tomb wrap bind infestation'.split(' '),
    drain: 'absorb mega-drain giga-drain leech-life draining-kiss horn-leech'.split(' '),
    'contact:jaws': 'bite crunch hyper-fang super-fang fire-fang ice-fang thunder-fang poison-fang psychic-fangs jaw-lock'.split(' '),
    'contact:claws': 'scratch slash night-slash x-scissor leaf-blade psycho-cut cross-poison fury-cutter sacred-sword shadow-claw dragon-claw metal-claw crush-claw false-swipe cut air-slash aerial-ace razor-shell fury-swipes'.split(' '),
    'contact:tail': 'iron-tail aqua-tail dragon-tail poison-tail slam tail-slap'.split(' '),
    sing: [], heal: [], shield: []
  };
  const LOOKUP = {};
  for (const [style, ids] of Object.entries(GROUP)) for (const id of ids) LOOKUP[id] = style;

  function classify(mv) {
    const id = mv.id;
    if (LOOKUP[id]) return LOOKUP[id];
    if (mv.cat === 'status') {
      if (mv.ailment === 'protect') return 'shield';
      if (id === 'rest' || mv.healing > 0) return 'heal';
      if (id === 'leech-seed') return 'seed';
      if (id === 'will-o-wisp') return 'wisp';
      if (id === 'thunder-wave' || id === 'glare') return 'twave';
      if (id === 'toxic') return 'toxic';
      if (['sleep-powder', 'stun-spore', 'poison-powder', 'spore', 'cotton-spore', 'sweet-scent'].includes(id)) return 'powder';
      if (['growl', 'screech', 'supersonic', 'sing', 'metal-sound', 'noble-roar', 'roar', 'perish-song'].includes(id)) return 'sound';
      if (['hypnosis', 'confuse-ray', 'yawn', 'swagger', 'flatter'].includes(id) || mv.ailment === 'sleep' || mv.ailment === 'confusion') return 'hypno';
      if (mv.target === 'user' || mv.target === 'users-field') return mv.stats.length ? 'buff' : 'generic';
      if (['charm', 'sweet-kiss', 'baby-doll-eyes', 'captivate', 'attract'].includes(id)) return 'debuff:hearts';
      if (['sand-attack', 'smokescreen', 'mud-slap', 'flash', 'kinesis'].includes(id)) return 'debuff:dust';
      if (mv.ailment === 'paralysis') return 'twave';
      if (mv.ailment === 'poison') return 'toxic';
      return 'debuff';
    }
    const n = id;
    if (/punch|palm|jab|hammer|arm-thrust|mash|uppercut|chop|smash/.test(n)) return 'contact:fist';
    if (/kick|stomp|knee/.test(n)) return 'contact:kick';
    if (/fang|bite|crunch/.test(n)) return 'contact:jaws';
    if (/claw|slash|scissor|cut|blade|swipe|sword/.test(n)) return 'contact:claws';
    if (/tail/.test(n)) return 'contact:tail';
    if (mv.cat === 'physical') return 'contact:charge';
    if (/beam|cannon|ray/.test(n)) return 'beam';
    if (/voice|sound|buzz|song/.test(n)) return 'sound';
    if (/wave|storm/.test(n)) return 'wave';
    if (/wind|gust/.test(n)) return 'wind';
    return 'orb';
  }

  async function move(id, a, d, outcome = {}) {
    const mv = id === 'struggle' ? { id, name: 'Struggle', type: 'Normal', cat: 'physical', power: 50, stats: [], drain: 0 } : { id, ...MOVES[id] };
    if (!World.actors[a].visible) return;
    if (!World.actors[d].visible) d = a;
    const [style, variant] = classify(mv).split(':');
    const c = { a, d, mv, type: mv.type || 'Normal', P: pal(mv.type), variant };
    World.focusOne(a, { elev: 0.5, dist: 0.95 });
    if (d !== a) later(() => { if (Cam.mode === 'one' && Cam.a === a) World.focusMove(a, d); }, 420);
    CUR = { eff: 1, ...outcome, d };
    const prevFx = FX_TIME;
    try { await (S[style] || S.generic)(c); }
    catch (e) { console.warn('effect error', id, e); }
    finally { CUR = { eff: 1 }; FX_TIME = prevFx; }
  }

  // ---------------------------------------------------------------
  //  Status conditions, Mega Evolution and other one-off effects
  // ---------------------------------------------------------------
  async function status(name, p) {
    const A = World.actors[p];
    if (!A.visible) return;
    const g = A.root.position, H = A.height, R = A.radius + 0.2, ctr = centerOf(p);
    SFX.status(name);
    const ring = (n, fn) => { for (let i = 0; i < n; i++) { const an = Math.random() * 6.28, r = rnd(0.1, R); fn(g.x + Math.cos(an) * r, g.z + Math.sin(an) * r, i); } };
    switch (name) {
      case 'charge':   // Solar Beam: sunlight pours down and gathers into the user
        for (let i = 0; i < 60; i++) { const an = Math.random() * 6.28, r = rnd(1.2, 3.2), sx = g.x + Math.cos(an) * r, sz = g.z + Math.sin(an) * r, sy = rnd(3, 7); ADD.spawn({ x: sx, y: sy, z: sz, life: 0.75, delay: i * 0.012, s0: 0.4, s1: 0.15, c0: C(1, 1, 0.6), c1: C(0.75, 1, 0.3), intensity: 2.4, frame: TILE.glow, follow: (q) => { const k = q.age / q.life; q.x = lerp(sx, ctr.x, k); q.y = lerp(sy, ctr.y, k); q.z = lerp(sz, ctr.z, k); } }); }
        flashLight(ctr, C(1, 1, 0.6), { intensity: 34, dur: 0.9 }); break;
      case 'brn':
        ring(40, (x, z) => ADD.spawn({ x, y: rnd(0, H * 0.6), z, vy: rnd(1.5, 3), life: rnd(0.4, 0.8), delay: Math.random() * 0.4, s0: 0.6, s1: 0.1, c0: C(1, 0.85, 0.3), c1: C(1, 0.3, 0.05), intensity: 2.6, frame: TILE.flame }));
        smoke(ctr, 5); flashLight(ctr, C(1, 0.4, 0.1), { intensity: 30, dur: 0.6 }); break;
      case 'psn':
        ring(26, (x, z) => ADD.spawn({ x, y: rnd(0, H * 0.4), z, vy: rnd(0.8, 1.6), life: rnd(0.6, 1), delay: Math.random() * 0.4, s0: 0.2, s1: 0.45, c0: C(0.7, 0.2, 0.95), c1: C(0.9, 0.5, 1), intensity: 2.2, frame: TILE.bubble }));
        break;
      case 'par':
        for (let i = 0; i < 6; i++) { bolt(ctr.clone().add(sphereDir().multiplyScalar(H * 0.45)), ctr.clone().add(sphereDir().multiplyScalar(H * 0.45)), C(1, 0.9, 0.2), { dur: 0.2, width: 0.07, jag: 0.8 }); await wait(40); }
        typeBurst(ctr, 'Electric', 0.4); break;
      case 'slp':
        for (let i = 0; i < 3; i++) { const top = World.anchor(p, 'top'); ADD.spawn({ x: top.x, y: top.y, z: top.z, vx: rnd(0.2, 0.5), vy: 0.7, life: 1, delay: i * 0.25, s0: 0.25, s1: 0.55, c0: C(0.85, 0.9, 1), intensity: 1.8, frame: TILE.z }); }
        break;
      case 'frz':
        shell(ctr, C(0.6, 0.9, 1), { from: 0.4, to: H * 0.7, dur: 0.3, hold: 0.3, intensity: 1.8 });
        for (let i = 0; i < 8; i++) debris('ice', ctr.clone(), sphereDir().multiplyScalar(3).setY(rnd(2, 4)), { color: 0xd8f6ff, life: 1 });
        decal('frost', g, 2.5, 2.5); break;
      case 'confused': {
        const head = World.anchor(p, 'top');
        for (let i = 0; i < 4; i++) { let ang = i * 1.57; ADD.spawn({ x: head.x, y: head.y, z: head.z, life: 1.1, s0: 0.3, s1: 0.3, c0: C(1, 1, 0.5), intensity: 2.5, frame: TILE.star, follow: (pp, dt) => { ang += dt * 6; pp.x = head.x + Math.cos(ang) * 0.6; pp.z = head.z + Math.sin(ang) * 0.6; pp.y = head.y + Math.sin(ang * 2) * 0.1; } }); }
        break;
      }
      case 'confusedselfhit':
        impact(ctr, 'Normal', 0.8, { ring: false }); break;
      case 'flinch':
        ADD.spawn({ x: ctr.x, y: World.anchor(p, 'top').y + 0.3, z: ctr.z, life: 0.5, s0: 0.5, s1: 0.8, c0: C(1, 1, 1), intensity: 2.5, frame: TILE.spark }); break;
    }
    await wait(name === 'slp' ? 800 : 650);
  }
  async function other(name, a, d = a) {
    if (name === 'megaevo') return mega(a);
    if (name === 'leech') { S.drainFlow(d, a, pal('Grass')); await wait(900); return; }
    if (name === 'bound') {
      const A = World.actors[a], g = A.root.position, H = A.height, R = A.radius + 0.3;
      for (let i = 0; i < 50; i++) { let ang = (i / 50) * 18; ADD.spawn({ x: g.x, y: 0, z: g.z, life: 0.7, delay: i * 0.01, s0: 0.35, s1: 0.2, c0: C(1, 0.8, 0.5), intensity: 2, frame: TILE.glow, follow: (p) => { const r = R * (1 - p.age / p.life * 0.3); p.x = g.x + Math.cos(ang) * r; p.z = g.z + Math.sin(ang) * r; p.y = (i / 50) * H; } }); }
      await wait(700);
    }
  }
  async function mega(p) {
    const A = World.actors[p], ctr = centerOf(p), H = A.height;
    const rainbow = [C(1, 0.3, 0.4), C(1, 0.7, 0.2), C(0.4, 1, 0.4), C(0.3, 0.6, 1), C(0.8, 0.4, 1)];
    SFX.mega();
    World.cheer(1);
    screenFlash(C(0.15, 0.05, 0.25), 0.5, 1.6);
    for (let i = 0; i < 120; i++) {
      const d = sphereDir().multiplyScalar(rnd(3, 5)), col = rainbow[i % 5];
      ADD.spawn({ x: ctr.x + d.x, y: ctr.y + d.y, z: ctr.z + d.z, life: 0.9, delay: Math.random() * 0.5, s0: 0.25, s1: 0.5, c0: col, intensity: 3, frame: TILE.spark, follow: (pp) => { const k = easeIn(pp.age / pp.life); pp.x = ctr.x + d.x * (1 - k); pp.y = ctr.y + d.y * (1 - k); pp.z = ctr.z + d.z * (1 - k); } });
    }
    const cocoon = shell(ctr, C(1, 0.85, 1), { from: H * 1.5, to: H * 0.55, dur: 1.2, hold: 0.5, intensity: 2.5 });
    flashLight(ctr, C(1, 0.8, 1), { intensity: 80, dur: 0.6, hold: 1.4 });
    await wait(900);
    for (let i = 0; i < 10; i++) { const dir = sphereDir(); dir.y = Math.abs(dir.y); beam(ctr, ctr.clone().addScaledVector(dir, 9), rainbow[i % 5], { radius: 0.07, dur: 0.6, grow: 0.25, intensity: 3 }); }
    bloomKick(1.2);
    await wait(500);
    screenFlash(C(1, 1, 1), 0.95, 0.6);
    World.shake(0.4);
    groundRing(A.root.position, C(1, 0.7, 1), { to: 12, dur: 0.8 });
    airRing(ctr, C(1, 0.8, 1), { to: 7, dur: 0.6 });
    for (let i = 0; i < 80; i++) { const d = sphereDir(); ADD.spawn({ x: ctr.x, y: ctr.y, z: ctr.z, vx: d.x * 10, vy: d.y * 10, vz: d.z * 10, drag: 3, life: 0.8, s0: 0.5, s1: 0.1, c0: C(1, 1, 1), c1: rainbow[i % 5], intensity: 3, frame: i % 2 ? TILE.star : TILE.spark }); }
    cocoon.visible = false;
  }

  // ---------------------------------------------------------------
  //  Per-frame update
  // ---------------------------------------------------------------
  const ambientT = [0, 0];
  function ambient(p, sdt) {
    const A = World.actors[p];
    if (!A.visible || !A.status) return;
    ambientT[p] -= sdt;
    if (ambientT[p] > 0) return;
    ambientT[p] = A.status === 'par' ? rnd(0.6, 1.4) : 0.35;
    const g = A.root.position, H = A.height, R = A.radius * 0.8;
    const at = () => { const an = Math.random() * 6.28, r = rnd(0, R); return [g.x + Math.cos(an) * r, rnd(0.2, H * 0.9), g.z + Math.sin(an) * r]; };
    const [x, y, z] = at();
    if (A.status === 'par') { const c = centerOf(p); bolt(c.clone().add(sphereDir().multiplyScalar(H * 0.4)), c.clone().add(sphereDir().multiplyScalar(H * 0.4)), C(1, 0.9, 0.2), { dur: 0.15, width: 0.05, jag: 0.8 }); A.pause = Math.max(A.pause, 0.4); }
    else if (A.status === 'brn') { ADD.spawn({ x, y, z, vy: 1.6, life: 0.6, s0: 0.35, s1: 0.05, c0: C(1, 0.8, 0.3), c1: C(1, 0.3, 0.05), intensity: 2, frame: TILE.flame }); NORM.spawn({ x, y: y + 0.3, z, vy: 0.8, life: 1, s0: 0.3, s1: 0.8, c0: C(0.3, 0.28, 0.28), alpha: 0.3, frame: TILE.smoke }); }
    else if (A.status === 'psn') ADD.spawn({ x, y: rnd(0.2, H * 0.5), z, vy: 0.9, life: 0.9, s0: 0.15, s1: 0.32, c0: C(0.7, 0.2, 0.95), intensity: 1.8, frame: TILE.bubble });
    else if (A.status === 'slp') { if (Math.random() < 0.4) { const top = World.anchor(p, 'top'); ADD.spawn({ x: top.x, y: top.y, z: top.z, vx: 0.3, vy: 0.6, life: 1.4, s0: 0.2, s1: 0.45, c0: C(0.85, 0.9, 1), intensity: 1.6, frame: TILE.z }); } }
    else if (A.status === 'frz') ADD.spawn({ x, y, z, life: 0.6, s0: 0.25, s1: 0.05, c0: C(0.85, 0.97, 1), intensity: 2, frame: TILE.shard, rotV: 3 });
  }
  updaters.push((dt) => {
    const sdt = dt / SPEED;
    ambient(0, sdt); ambient(1, sdt);
    for (let i = active.length - 1; i >= 0; i--) if (!active[i](sdt)) active.splice(i, 1);
    ADD.update(sdt); NORM.update(sdt);
  });

  // stop every running effect immediately (used when a battle is restarted or exited)
  function clear() {
    for (const fn of active.splice(0)) { try { fn(1e4); } catch (e) {} }
    for (const m of transient) scene.remove(m);
    transient.clear();
    ADD.list.length = 0; NORM.list.length = 0;
    flashMesh.material.opacity = 0;
    lights.forEach(s => { s.l.intensity = 0; s.busy = false; });
    CUR = { eff: 1 };
  }

  return {
    move, status, other, classify, clear,
    sendOutBurst(pos) {
      SFX.pop();
      for (let i = 0; i < 40; i++) { const d = sphereDir(); ADD.spawn({ x: pos.x, y: 0.8, z: pos.z, vx: d.x * 6, vy: d.y * 6 + 1, vz: d.z * 6, drag: 3, life: 0.6, s0: 0.35, s1: 0.05, c0: C(1, 1, 1), c1: C(0.6, 0.85, 1), intensity: 2.8, frame: i % 2 ? TILE.star : TILE.spark }); }
      groundRing(pos, C(0.7, 0.9, 1), { to: 4, dur: 0.5 });
    },
    keyStoneFlash(pos) {
      SFX.buff();
      for (let i = 0; i < 30; i++) { const d = sphereDir(); ADD.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * 4, vy: d.y * 4, vz: d.z * 4, drag: 3, life: 0.5, s0: 0.3, s1: 0.05, c0: C(1, 0.8, 1), intensity: 3, frame: TILE.spark }); }
      flashLight(pos, C(1, 0.6, 1), { intensity: 30, dur: 0.4 });
      beam(pos, pos.clone().add(v3(0, 8, 0)), C(1, 0.6, 1), { radius: 0.1, dur: 0.5, intensity: 3 });
    },
    victory(pos) {
      for (let i = 0; i < 150; i++) { const d = sphereDir(); d.y = Math.abs(d.y) + 0.5; NORM.spawn({ x: pos.x + rnd(-3, 3), y: rnd(4, 8), z: pos.z + rnd(-3, 3), vx: rnd(-1, 1), vy: rnd(-1, -2), vz: rnd(-1, 1), life: rnd(2, 3), s0: 0.2, s1: 0.2, c0: new THREE.Color().setHSL(Math.random(), 0.8, 0.6), frame: TILE.shard, rotV: rnd(-6, 6), alpha: 1 }); }
    }
  };
})();
