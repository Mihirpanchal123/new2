'use strict';
// =====================================================================
//  AUDIO — synthesized sound effects, crowd and an original adaptive
//  battle soundtrack (Web Audio only: no samples, nothing copyrighted)
// =====================================================================
const AudioFX = (() => {
  let ctx = null, master, sfxBus, musicBus, crowdBus, noiseBuf;
  const vol = { music: 0.6, sfx: 0.85 };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = bus(vol.sfx); musicBus = bus(vol.music * 0.45); crowdBus = bus(vol.sfx * 0.6);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function bus(v) { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
  // browsers only allow audio after a user gesture
  const unlock = () => { init(); if (ctx.state === 'suspended' && !PAUSED) ctx.resume(); };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  const ok = () => ctx && ctx.state !== 'closed';

  // ---- synthesis primitives -------------------------------------------
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
  }
  function tone({ type = 'sine', f = 440, f2 = null, dur = 0.3, g = 0.3, a = 0.008, at = 0, dest = null, vib = 0 }) {
    if (!ok()) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 7; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const gn = ctx.createGain(); env(gn, t, a, g, dur);
    o.connect(gn); gn.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise({ dur = 0.3, g = 0.3, a = 0.005, type = 'lowpass', f = 2000, f2 = null, q = 1, at = 0, dest = null }) {
    if (!ok()) return;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const gn = ctx.createGain(); env(gn, t, a, g, dur);
    s.connect(fl); fl.connect(gn); gn.connect(dest || sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  const thump = (p = 1, at = 0) => { tone({ f: 150, f2: 38, dur: 0.32, g: 0.55 * p, at }); noise({ dur: 0.22, g: 0.32 * p, f: 1800, f2: 200, at }); };
  const crackle = (dur, n = 14, g = 0.12) => { for (let i = 0; i < n; i++) noise({ dur: 0.03, g: g * Math.random(), type: 'highpass', f: 2500 + Math.random() * 3000, at: Math.random() * dur }); };
  const bubbles = (n, g = 0.08) => { for (let i = 0; i < n; i++) tone({ f: 300 + Math.random() * 500, f2: 900 + Math.random() * 600, dur: 0.07, g, at: i * 0.06 + Math.random() * 0.03 }); };
  const zap = (dur = 0.35, g = 0.16) => {
    tone({ type: 'sawtooth', f: 90 + Math.random() * 40, f2: 60, dur, g, vib: 60 });
    tone({ type: 'square', f: 1200, f2: 300, dur: dur * 0.6, g: g * 0.4 });
    crackle(dur, 18, 0.18);
  };
  const whoosh = (g = 0.2, dur = 0.35, at = 0) => noise({ dur, g, a: dur * 0.4, type: 'bandpass', f: 400, f2: 2200, q: 0.8, at });
  const chime = (notes, g = 0.08, step = 0.07, type = 'sine') => notes.forEach((m, i) => tone({ type, f: mtof(m), dur: 0.5, g, at: i * step }));
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // signature sound of each type (cast or impact)
  const TYPE_SND = {
    Fire: p => { noise({ dur: 0.55, g: 0.32 * p, type: 'bandpass', f: 500, f2: 1600, q: 0.7 }); noise({ dur: 0.5, g: 0.22 * p, f: 280 }); crackle(0.5); },
    Water: p => { noise({ dur: 0.45, g: 0.3 * p, type: 'bandpass', f: 900, f2: 280, q: 1.5 }); bubbles(5); },
    Electric: p => zap(0.4, 0.16 * p),
    Grass: p => { noise({ dur: 0.4, g: 0.18 * p, type: 'highpass', f: 3500, f2: 1400 }); noise({ dur: 0.25, g: 0.12, type: 'bandpass', f: 1200, at: 0.08 }); },
    Ice: p => { for (let i = 0; i < 5; i++) tone({ f: 1800 + Math.random() * 2600, dur: 0.3, g: 0.06 * p, at: i * 0.04 }); noise({ dur: 0.3, g: 0.14 * p, type: 'highpass', f: 5000 }); },
    Psychic: p => { tone({ f: 260, f2: 880, dur: 0.5, g: 0.16 * p, vib: 30 }); tone({ type: 'triangle', f: 700, f2: 220, dur: 0.5, g: 0.08 * p }); },
    Ghost: p => { tone({ type: 'sawtooth', f: 95, f2: 55, dur: 0.6, g: 0.1 * p, vib: 8 }); noise({ dur: 0.5, g: 0.16 * p, f: 900, f2: 180 }); },
    Dark: p => { tone({ type: 'sawtooth', f: 80, f2: 50, dur: 0.5, g: 0.12 * p }); noise({ dur: 0.4, g: 0.2 * p, f: 700, f2: 150 }); },
    Dragon: p => { tone({ type: 'sawtooth', f: 130, f2: 70, dur: 0.6, g: 0.14 * p, vib: 12 }); noise({ dur: 0.5, g: 0.2 * p, type: 'bandpass', f: 500, q: 0.6 }); },
    Fighting: p => thump(1.1 * p),
    Normal: p => thump(p),
    Rock: p => { noise({ dur: 0.6, g: 0.4 * p, f: 420, f2: 70 }); thump(0.8 * p); },
    Ground: p => { noise({ dur: 0.7, g: 0.42 * p, f: 300, f2: 60 }); thump(0.9 * p); },
    Steel: p => { tone({ type: 'square', f: 820, f2: 610, dur: 0.35, g: 0.08 * p }); tone({ f: 1640, dur: 0.5, g: 0.07 * p }); noise({ dur: 0.15, g: 0.18 * p, type: 'bandpass', f: 3200, q: 3 }); },
    Fairy: p => chime([84, 88, 91, 96], 0.07 * p, 0.05),
    Poison: p => { bubbles(6, 0.07 * p); noise({ dur: 0.4, g: 0.12 * p, type: 'bandpass', f: 1400, q: 2 }); },
    Flying: p => whoosh(0.26 * p, 0.45),
    Bug: p => tone({ type: 'sawtooth', f: 190, dur: 0.4, g: 0.1 * p, vib: 40 })
  };

  // ---- public sound effects ---------------------------------------------
  const SFX = {
    cast: type => { whoosh(0.12, 0.3); (TYPE_SND[type] || TYPE_SND.Normal)(0.45); },
    impact: (type, power = 1, eff = 1) => {
      const p = Math.min(1.6, power) * (eff > 1 ? 1.3 : eff < 1 ? 0.6 : 1);
      thump(p);
      (TYPE_SND[type] || TYPE_SND.Normal)(p);
      if (eff > 1) { noise({ dur: 0.18, g: 0.25, type: 'highpass', f: 2500, at: 0.02 }); tone({ type: 'square', f: 220, f2: 110, dur: 0.2, g: 0.07 }); }
    },
    beam: (type, dur = 0.8) => {
      tone({ type: 'sawtooth', f: 180, f2: 900, dur: 0.4, g: 0.08 });
      tone({ type: 'sawtooth', f: 110, dur: dur + 0.4, g: 0.1, a: 0.35, at: 0.35, vib: 6 });
      noise({ dur: dur + 0.3, g: 0.16, a: 0.2, type: 'bandpass', f: 1200, q: 0.7, at: 0.38 });
      (TYPE_SND[type] || TYPE_SND.Normal)(0.5);
    },
    stream: (type, dur = 0.9) => {
      const f = type === 'Water' ? 700 : type === 'Ice' ? 3000 : type === 'Flying' ? 1500 : 450;
      noise({ dur, g: 0.26, a: 0.12, type: 'bandpass', f, f2: f * 1.4, q: 0.6 });
      if (type === 'Fire' || type === 'Dragon') crackle(dur, 30);
      if (type === 'Water') bubbles(10, 0.05);
    },
    zap: () => zap(0.3, 0.14),
    // a rising electric hum while a move powers up
    hum: (dur = 0.5) => { tone({ type: 'sawtooth', f: 70, f2: 240, dur, g: 0.07, a: dur * 0.8, vib: 30 }); crackle(dur, 10, 0.08); },
    // the bright ring of light catching metal
    lock: () => { tone({ type: 'square', f: 1320, f2: 1760, dur: 0.05, g: 0.025 }); tone({ type: 'square', f: 1760, dur: 0.04, g: 0.02, at: 0.05 }); },
    glint: () => { tone({ f: 2600, f2: 3300, dur: 0.35, g: 0.05 }); tone({ type: 'triangle', f: 5200, dur: 0.25, g: 0.02, at: 0.02 }); },
    thunder: () => { noise({ dur: 1.4, g: 0.55, f: 1800, f2: 60, a: 0.01 }); thump(1.3); crackle(0.4, 24, 0.25); },
    slash: () => { noise({ dur: 0.16, g: 0.3, a: 0.02, type: 'highpass', f: 1800, f2: 6000 }); tone({ f: 2400, f2: 1800, dur: 0.15, g: 0.04 }); },
    whoosh: () => whoosh(0.22, 0.32),
    quake: () => { noise({ dur: 1.6, g: 0.6, f: 160, f2: 40, a: 0.05 }); thump(1.4); thump(1, 0.3); thump(0.8, 0.6); },
    rumble: (dur = 0.8) => noise({ dur, g: 0.4, f: 260, f2: 70, a: 0.1 }),
    sonic: () => { for (let i = 0; i < 5; i++) tone({ type: 'triangle', f: 520 - i * 40, dur: 0.18, g: 0.08, at: i * 0.08, vib: 25 }); },
    heal: () => chime([72, 76, 79, 84, 88], 0.07, 0.08, 'triangle'),
    buff: () => { tone({ type: 'triangle', f: 300, f2: 1200, dur: 0.6, g: 0.1 }); chime([79, 84], 0.05, 0.12); },
    debuff: () => tone({ type: 'triangle', f: 900, f2: 200, dur: 0.6, g: 0.1 }),
    powder: () => { for (let i = 0; i < 10; i++) tone({ f: 3000 + Math.random() * 2000, dur: 0.12, g: 0.025, at: Math.random() * 0.9 }); noise({ dur: 1, g: 0.06, type: 'highpass', f: 6000, a: 0.3 }); },
    shield: () => { tone({ f: 600, f2: 900, dur: 0.6, g: 0.08, vib: 8 }); tone({ type: 'triangle', f: 1200, dur: 0.5, g: 0.04 }); },
    block: () => { tone({ type: 'square', f: 760, dur: 0.25, g: 0.07 }); tone({ f: 1520, dur: 0.45, g: 0.07 }); noise({ dur: 0.12, g: 0.2, type: 'bandpass', f: 3000, q: 4 }); },
    fizzle: () => { noise({ dur: 0.3, g: 0.12, f: 900, f2: 200 }); tone({ f: 200, f2: 120, dur: 0.2, g: 0.1 }); },
    status: name => ({
      brn: () => { noise({ dur: 0.6, g: 0.2, type: 'bandpass', f: 600, f2: 1400 }); crackle(0.6); },
      psn: () => bubbles(7),
      par: () => zap(0.25, 0.12),
      slp: () => tone({ type: 'triangle', f: 600, f2: 300, dur: 0.8, g: 0.07, vib: 4 }),
      frz: () => TYPE_SND.Ice(1),
      confused: () => { for (let i = 0; i < 4; i++) tone({ f: 900 + (i % 2) * 300, dur: 0.1, g: 0.05, at: i * 0.1 }); },
      confusedselfhit: () => thump(0.8),
      flinch: () => tone({ type: 'square', f: 400, f2: 300, dur: 0.12, g: 0.06 })
    }[name] || (() => {}))(),
    mega: () => {
      noise({ dur: 2, g: 0.25, a: 1.4, type: 'bandpass', f: 300, f2: 3000, q: 0.5 });
      [57, 64, 69, 73, 76].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), dur: 2, g: 0.035, a: 0.8 + i * 0.1 }));
      thump(1.6, 1.4); noise({ dur: 1.2, g: 0.4, f: 3000, f2: 100, at: 1.4 });
    },
    pop: () => { tone({ f: 500, f2: 1200, dur: 0.12, g: 0.12 }); chime([84, 91], 0.05, 0.06); },
    faint: () => { tone({ type: 'triangle', f: 500, f2: 90, dur: 0.9, g: 0.12 }); noise({ dur: 0.5, g: 0.15, f: 600, f2: 100, at: 0.5 }); },
    banner: () => noise({ dur: 0.35, g: 0.14, a: 0.12, type: 'bandpass', f: 800, f2: 4000, q: 0.7 }),
    beep: hi => tone({ type: 'square', f: hi ? 1320 : 880, dur: hi ? 0.5 : 0.18, g: 0.09 }),
    start: () => { thump(1.4); [69, 76, 81].forEach(m => tone({ type: 'sawtooth', f: mtof(m), dur: 0.9, g: 0.05 })); },
    reveal: i => tone({ type: 'triangle', f: mtof(72 + (i % 6) * 2), dur: 0.2, g: 0.08 })
  };

  // ---- crowd ------------------------------------------------------------
  let crowdGain = null, crowdLevel = 0;
  const Crowd = {
    start() {
      if (!ok() || crowdGain) return;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.45;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 250; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
      crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0001;
      s.connect(bp); bp.connect(crowdGain); crowdGain.connect(crowdBus); s.start();
      crowdGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.5);
    },
    stop() {
      if (!crowdGain) return;
      crowdGain.gain.cancelScheduledValues(ctx.currentTime);
      crowdGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      const g = crowdGain; crowdGain = null;
      setTimeout(() => g.disconnect(), 2500);
    },
    cheer(v = 0.6) {
      if (!crowdGain || v < crowdLevel - 0.1) return;
      crowdLevel = v;
      const t = ctx.currentTime;
      crowdGain.gain.cancelScheduledValues(t);
      crowdGain.gain.setTargetAtTime(0.05 + v * 0.28, t, 0.08);
      crowdGain.gain.setTargetAtTime(0.05, t + 0.6 + v, 0.6);
      for (let i = 0; i < Math.round(25 * v); i++) noise({ dur: 0.04, g: 0.05 * Math.random(), type: 'bandpass', f: 1500 + Math.random() * 1500, q: 2, at: Math.random() * (0.6 + v), dest: crowdBus });
      setTimeout(() => { crowdLevel = 0; }, (0.8 + v) * 1000);
    },
    gasp() {
      if (!crowdGain) return;
      noise({ dur: 0.7, g: 0.12, a: 0.08, type: 'bandpass', f: 1400, f2: 500, q: 0.8, dest: crowdBus });
    }
  };

  // ---- original adaptive music ----------------------------------------
  // A minor loop: pad + bass + drums + arpeggio; "pinch" level speeds up with a darker progression
  const PROG = { calm: [[57, 'm'], [53, 'M'], [60, 'M'], [55, 'M']], pinch: [[57, 'm'], [50, 'm'], [52, 'M'], [57, 'm']] };
  const Music = {
    level: -1, step: 0, next: 0, timer: null, bpm: 124,
    start(level = 0) {
      if (!ok()) return;
      this.level = level; this.step = 0; this.next = ctx.currentTime + 0.1;
      if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    },
    setLevel(level) { if (this.timer) this.level = level; },
    stop() { clearInterval(this.timer); this.timer = null; this.level = -1; },
    tick() {
      if (!ok() || ctx.state !== 'running') return;
      const bpm = this.level >= 2 ? 146 : 124, stepDur = 60 / bpm / 4;
      while (this.next < ctx.currentTime + 0.15) { this.play(this.step, this.next, stepDur); this.next += stepDur; this.step++; }
    },
    note(type, m, t, dur, g, cutoff = 2500) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(m);
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff;
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
    },
    hit(kind, t, g) {
      if (kind === 'kick') { const o = ctx.createOscillator(), gn = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(gn); gn.connect(musicBus); o.start(t); o.stop(t + 0.3); return; }
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const fl = ctx.createBiquadFilter(); fl.type = kind === 'hat' ? 'highpass' : 'bandpass'; fl.frequency.value = kind === 'hat' ? 8000 : 1800;
      const gn = ctx.createGain(), d = kind === 'hat' ? 0.04 : 0.16;
      gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(fl); fl.connect(gn); gn.connect(musicBus); s.start(t, Math.random()); s.stop(t + d + 0.02);
    },
    play(step, t, sd) {
      const L = this.level;
      if (L < 0) return;
      const prog = L >= 2 ? PROG.pinch : PROG.calm;
      const bar = Math.floor(step / 16) % 4, s = step % 16;
      const [root, q] = prog[bar];
      const chord = [root, root + (q === 'm' ? 3 : 4), root + 7];
      if (s === 0) chord.forEach((m, i) => { this.note('sawtooth', m, t, sd * 16, 0.03, 1100); this.note('sawtooth', m + 0.07, t, sd * 16, 0.02, 900); });
      if (L === 0) { if (s % 8 === 0) this.hit('kick', t, 0.35); if (s % 4 === 2) this.hit('hat', t, 0.04); return; }
      if (s % 4 === 0) this.hit('kick', t, 0.5);
      if (s === 4 || s === 12) this.hit('snare', t, 0.22);
      if (L >= 2 || s % 2 === 0) this.hit('hat', t, s % 4 === 2 ? 0.06 : 0.035);
      if (s % 2 === 0) this.note('sawtooth', root - 12 + (s === 14 ? 7 : 0), t, sd * 1.8, 0.11, 650);
      const arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24];
      this.note('square', arp[s % 4], t, sd * 0.9, L >= 2 ? 0.032 : 0.024, 2800);
      if (L >= 2 && s % 8 === 6) this.note('triangle', chord[2] + 24, t, sd * 3, 0.03, 4000);
    },
    victory() {
      this.stop();
      if (!ok()) return;
      const t = ctx.currentTime + 0.05, n = (m, at, d, g = 0.06) => this.note('sawtooth', m, t + at, d, g, 3000);
      [[72, 0], [76, 0.13], [79, 0.26], [84, 0.39]].forEach(([m, at]) => n(m, at, 0.2));
      [[84, 0.6], [88, 0.6], [91, 0.6], [72, 0.6]].forEach(([m, at]) => n(m, at, 1.6, 0.05));
      [[60, 0.6], [48, 0.6]].forEach(([m, at]) => n(m, at, 1.6, 0.07));
      this.hit('kick', t + 0.6, 0.6);
    }
  };

  return {
    SFX, Crowd, Music, unlock,
    // raw notes on the music bus (it follows the music volume) for scripted scores such as Journey's opening film
    synth: { tone: o => tone({ ...o, dest: musicBus }), now: () => ok() ? ctx.currentTime : 0 },
    setVolume(kind, v) { vol[kind] = v; if (!ctx) return; if (kind === 'music') musicBus.gain.value = v * 0.45; else { sfxBus.gain.value = v; crowdBus.gain.value = v * 0.6; } },
    suspend(on) { if (!ctx) return; on ? ctx.suspend() : ctx.resume(); }
  };
})();
const SFX = AudioFX.SFX;
