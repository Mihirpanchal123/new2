// The soundtrack of a reel, made offline with the Web Audio API: the voiceover, a moody score (pads, bass, piano/bell
// notes that swell towards the twist), an ambient bed and sound effects, all synthesised here (no audio files needed).
const SR = 48000;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11] };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function mixSoundtrack({ duration, voice, music, ambience, sfx, seed = 1 }) {
  const ac = new OfflineAudioContext(2, Math.ceil(duration * SR), SR);
  const R = rng(seed);
  const master = ac.createDynamicsCompressor(); master.threshold.value = -18; master.ratio.value = 3.5; master.attack.value = 0.008; master.release.value = 0.25;
  const out = ac.createGain(); out.gain.value = 1.45; master.connect(out);
  const lim = ac.createDynamicsCompressor(); lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08; out.connect(lim); lim.connect(ac.destination);
  // reverb (a made-up hall)
  const rev = ac.createConvolver(); rev.buffer = impulse(ac, 3.2, 2.6); const revOut = ac.createGain(); revOut.gain.value = 0.9; rev.connect(revOut); revOut.connect(master);
  const noiseBuf = (() => { const b = ac.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const bus = (gain, wet = 0) => { const g = ac.createGain(); g.gain.value = gain; g.connect(master); if (wet) { const s = ac.createGain(); s.gain.value = wet; g.connect(s); s.connect(rev); } return g; };
  const env = (g, t, a, peak, d, sustain = 0) => { t = Math.max(0, t); peak = Math.max(0.0001, peak || 0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d); };
  const noise = (t0, dur, dest, { type = 'lowpass', f = 1000, f2 = null, q = 0.7, gain = 0.5, a = 0.005, rate = 1 } = {}) => {
    const t = Math.max(0, t0); const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, a, gain, dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, R() * 1.5); s.stop(t + dur + a + 0.05); return g;
  };
  const tone = (t0, dur, dest, { f = 440, f2 = null, type = 'sine', gain = 0.3, a = 0.005, curve = 'exp' } = {}) => {
    const t = Math.max(0, t0); const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, a, gain, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); return o;
  };

  // ---- the voice (ducks the music)
  const vBus = bus(1.0, 0.08);
  const voiceSpans = [];
  for (const v of voice) {
    const s = ac.createBufferSource(); s.buffer = v.buffer; const fx = v.fx || {}; if (fx.rate) s.playbackRate.value = fx.rate;
    let node = s;
    const chain = n => { node.connect(n); node = n; };
    if (fx.lowpass) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fx.lowpass; f.Q.value = 0.7; chain(f); }
    if (fx.bandpass) { const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = fx.bandpass[0]; chain(hp); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = fx.bandpass[1]; chain(lp); }
    const g = ac.createGain(); g.gain.value = v.gain ?? 1; chain(g);
    if (fx.tremolo) { const lfo = ac.createOscillator(); lfo.frequency.value = fx.tremolo[0]; const depth = ac.createGain(); depth.gain.value = (v.gain ?? 1) * fx.tremolo[1]; lfo.connect(depth); depth.connect(g.gain); lfo.start(v.at); lfo.stop(v.at + v.buffer.duration / (fx.rate || 1) + 0.1); }
    g.connect(vBus);
    if (fx.wet) { const w = ac.createGain(); w.gain.value = fx.wet; g.connect(w); w.connect(rev); }
    s.start(v.at); voiceSpans.push([v.at, v.at + v.buffer.duration / (fx.rate || 1)]);
  }

  // ---- the music
  const M = { root: 50, scale: 'minor', prog: [0, 5, 3, 4], chord: 5.2, level: 0.2, bells: true, pulse: false, warmth: 900, ...(music || {}) };
  const mBus = ac.createGain(); mBus.gain.value = M.level; const mDuck = ac.createGain(); mBus.connect(mDuck); mDuck.connect(master); const mWet = ac.createGain(); mWet.gain.value = 0.55; mDuck.connect(mWet); mWet.connect(rev);
  // ducking under the voice
  mDuck.gain.setValueAtTime(1, 0);
  for (const [a, b] of voiceSpans) { mDuck.gain.setTargetAtTime(M.duck ?? 0.42, Math.max(0, a - 0.15), 0.08); mDuck.gain.setTargetAtTime(1, b + 0.1, 0.35); }
  // dynamics: quiet sections, the swell before the twist, the drop after it
  const dyn = ac.createGain(); dyn.gain.setValueAtTime(0.0001, 0); dyn.gain.exponentialRampToValueAtTime(1, M.attack ?? 2.5);
  for (const [t, v, k] of (M.dyn || [])) dyn.gain.setTargetAtTime(Math.max(v, 0.0001), t, k || 0.6);
  dyn.gain.setTargetAtTime(M.loop ? 0.35 : 0.0001, duration - (M.loop ? 1.2 : 1.8), 0.5);   // a looping reel keeps some music to the last frame
  dyn.connect(mBus);
  const sc = SCALES[M.scale] || SCALES.minor, deg = d => M.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const nChords = Math.ceil(duration / M.chord) + 1;
  for (let i = 0; i < nChords; i++) {
    const t = i * M.chord, d = M.prog[i % M.prog.length], notes = [deg(d), deg(d + 2), deg(d + 4), deg(d + 7)];
    // pad
    for (const n of notes) for (const det of [-6, 6]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = det + (R() - .5) * 4;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = M.warmth; f.Q.value = 0.4;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.028, t + M.chord * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + M.chord * 1.25);
      o.connect(f); f.connect(g); g.connect(dyn); o.start(t); o.stop(t + M.chord * 1.3);
    }
    // bass
    const b = ac.createOscillator(); b.type = 'sine'; b.frequency.value = midi(deg(d) - 12); const bg = ac.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.16, t + 0.8); bg.gain.linearRampToValueAtTime(0.0001, t + M.chord * 1.1); b.connect(bg); bg.connect(dyn); b.start(t); b.stop(t + M.chord * 1.15);
    // bell / piano notes
    if (M.bells) {
      const step = M.chord / (M.notes || 4);
      for (let k = 0; k < (M.notes || 4); k++) {
        if (R() < (M.sparse ?? 0.35)) continue;
        const nt = Math.max(0, t + k * step + (R() - .5) * 0.05), n = notes[Math.floor(R() * notes.length)] + 12 + (R() < 0.3 ? 12 : 0);
        for (const [mul, gn, dec] of [[1, 0.06, 2.4], [2.003, 0.018, 1.2], [3.01, 0.008, 0.7]]) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = midi(n) * mul; const g = ac.createGain(); env(g, nt, 0.004, gn, dec); o.connect(g); g.connect(dyn); o.start(nt); o.stop(nt + dec + 0.1); }
      }
    }
    if (M.pulse) { for (let k = 0; k < 4; k++) { const nt = t + k * M.chord / 4; tone(nt, 0.35, dyn, { f: midi(deg(d) - 12), type: 'triangle', gain: 0.07 }); } }
  }

  // ---- the ambient bed
  const aBus = bus(1, 0.15);
  for (const a of (ambience || [])) ambient(a);
  function ambient({ type, from = 0, to = duration, gain = 1 }) {
    const len = to - from; if (len <= 0) return;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, from); g.gain.linearRampToValueAtTime(gain, from + Math.min(1.5, len / 3)); g.gain.setValueAtTime(gain, Math.max(from, to - 1.2)); g.gain.linearRampToValueAtTime(0.0001, to); g.connect(aBus);
    const src = (rate = 1) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; s.start(from, R()); s.stop(to + 0.1); return s; };
    const lfoTo = (param, hz, depth, base) => { const l = ac.createOscillator(); l.frequency.value = hz; const lg = ac.createGain(); lg.gain.value = depth; l.connect(lg); lg.connect(param); param.value = base; l.start(from); l.stop(to + 0.1); };
    if (type === 'wind' || type === 'night' || type === 'room' || type === 'city' || type === 'cave') {
      const f = ac.createBiquadFilter(); f.type = type === 'wind' ? 'bandpass' : 'lowpass'; f.Q.value = type === 'wind' ? 0.8 : 0.5;
      lfoTo(f.frequency, type === 'wind' ? 0.13 : 0.05, type === 'wind' ? 260 : 60, type === 'wind' ? 480 : type === 'city' ? 380 : type === 'cave' ? 220 : 260);
      const lg = ac.createGain(); lg.gain.value = type === 'wind' ? 0.16 : type === 'city' ? 0.16 : 0.08; src().connect(f); f.connect(lg); lg.connect(g);
    }
    if (type === 'night') for (let t = from + 0.5; t < to; t += 0.9 + R() * 1.6) { for (let k = 0; k < 3; k++) tone(t + k * 0.06, 0.04, g, { f: 4200 + R() * 400, gain: 0.012 }); }
    if (type === 'city') for (let t = from + 2; t < to; t += 6 + R() * 7) { tone(t, 0.5, g, { f: 330 + R() * 60, type: 'square', gain: 0.012 }); tone(t + 0.05, 0.5, g, { f: 415 + R() * 60, type: 'square', gain: 0.01 }); }
    if (type === 'fire') { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const lg = ac.createGain(); lg.gain.value = 0.1; src(0.5).connect(f); f.connect(lg); lg.connect(g); for (let t = from; t < to; t += 0.04 + R() * 0.25) noise(t, 0.02 + R() * 0.03, g, { type: 'bandpass', f: 1500 + R() * 3000, q: 2, gain: 0.05 + R() * 0.12, a: 0.001 }); }
    if (type === 'rain') { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400; const lg = ac.createGain(); lg.gain.value = 0.12; src().connect(f); f.connect(lg); lg.connect(g); }
    if (type === 'drip' || type === 'cave') for (let t = from + 1; t < to; t += 1.5 + R() * 3) tone(t, 0.25, g, { f: 1400 + R() * 600, f2: 700, gain: 0.05 });
    if (type === 'clock') for (let t = from; t < to; t += 1) noise(t, 0.03, g, { type: 'highpass', f: 3000, gain: 0.18, a: 0.001 });
    if (type === 'heart') for (let t = from; t < to; t += 0.85) { tone(t, 0.16, g, { f: 62, f2: 40, gain: 0.5 }); tone(t + 0.22, 0.14, g, { f: 58, f2: 38, gain: 0.35 }); }
    if (type === 'crowd') { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 1.2; lfoTo(f.frequency, 0.3, 120, 600); const lg = ac.createGain(); lg.gain.value = 0.12; src(0.7).connect(f); f.connect(lg); lg.connect(g); }
    if (type === 'birds') for (let t = from + 0.6; t < to; t += 1.2 + R() * 2.5) { const f0 = 2500 + R() * 1500; for (let k = 0; k < 2 + (R() * 3 | 0); k++) tone(t + k * 0.11, 0.08, g, { f: f0, f2: f0 * 1.4, gain: 0.025 }); }
    if (type === 'river') { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6; lfoTo(f.frequency, 0.4, 300, 900); const lg = ac.createGain(); lg.gain.value = 0.14; src(1.3).connect(f); f.connect(lg); lg.connect(g); }
    if (type === 'drone') { for (const fr of [55, 55.4, 82.5]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240; const lg = ac.createGain(); lg.gain.value = 0.045; o.connect(f); f.connect(lg); lg.connect(g); o.start(from); o.stop(to + 0.1); } }
  }

  // ---- sound effects
  const fx = bus(0.9, 0.22);
  function SFXsteps(t, o, run) { const n = o.n || 6, gap = o.gap || (run ? 0.26 : 0.5); for (let i = 0; i < n; i++) { const tt = t + i * gap; noise(tt, 0.07, fx, { type: 'lowpass', f: o.f || 700, gain: (o.gain || 0.35) * (i % 2 ? 0.8 : 1) }); tone(tt, 0.08, fx, { f: 90, f2: 60, gain: (o.gain || 0.35) * 0.5 }); } }
  const SFX = {
    boom: (t, o) => { tone(t, o.dur || 2.2, fx, { f: 75, f2: 28, gain: o.gain || 0.9 }); noise(t, 1.2, fx, { type: 'lowpass', f: 400, f2: 60, gain: (o.gain || 0.9) * 0.6 }); },
    hit: (t, o) => { tone(t, 0.35, fx, { f: 140, f2: 45, gain: o.gain || 0.7 }); noise(t, 0.12, fx, { type: 'lowpass', f: 2200, gain: (o.gain || 0.7) * 0.5 }); },
    thud: (t, o) => { tone(t, 0.5, fx, { f: 90, f2: 35, gain: o.gain || 0.8 }); noise(t, 0.25, fx, { type: 'lowpass', f: 500, gain: 0.4 }); },
    whoosh: (t, o) => { const d = o.dur || 0.7; noise(t, d, fx, { type: 'bandpass', f: o.f || 300, f2: o.f2 || 2400, q: 1.2, gain: o.gain || 0.35, a: d * 0.5 }); },
    swish: (t, o) => noise(t, 0.25, fx, { type: 'bandpass', f: 1800, f2: 600, q: 1.5, gain: o.gain || 0.3, a: 0.08 }),
    riser: (t, o) => { const d = o.dur || 3; noise(t, d, fx, { type: 'bandpass', f: 250, f2: 5000, q: 2, gain: o.gain || 0.25, a: d * 0.95 }); tone(t, d, fx, { f: 110, f2: 440, type: 'sawtooth', gain: 0.03, a: d * 0.95 }); },
    step: (t, o) => SFXsteps(t, { ...o, n: 1 }),
    steps: (t, o) => SFXsteps(t, o, false),
    run: (t, o) => SFXsteps(t, o, true),
    creak: (t, o) => { const d = o.dur || 1.6, s = ac.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(70, t); for (let k = 0; k < 10; k++) s.frequency.linearRampToValueAtTime(60 + R() * 70, t + d * k / 10); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.5, t + 0.1); g.gain.linearRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(fx); s.start(t); s.stop(t + d + 0.1); },
    metal: (t, o) => { for (const [f, d] of [[523, 1.6], [1380, 1.0], [2210, 0.7], [3170, 0.5], [881, 1.2]]) tone(t, d * (o.len || 1), fx, { f: f * (o.pitch || 1), gain: (o.gain || 0.18) }); noise(t, 0.05, fx, { type: 'highpass', f: 2000, gain: 0.3 }); },
    keys: (t, o) => { for (let i = 0; i < (o.n || 8); i++) { const tt = t + i * 0.07 + R() * 0.04; tone(tt, 0.25, fx, { f: 3000 + R() * 2500, gain: 0.04 }); tone(tt, 0.2, fx, { f: 5200 + R() * 1500, gain: 0.025 }); } },
    lock: (t, o) => { noise(t, 0.03, fx, { type: 'highpass', f: 1500, gain: 0.5 }); noise(t + 0.12, 0.04, fx, { type: 'bandpass', f: 900, gain: 0.6 }); tone(t + 0.12, 0.3, fx, { f: 900, gain: 0.08 }); },
    heartbeat: (t, o) => { for (let i = 0; i < (o.n || 4); i++) { const tt = t + i * (o.gap || 0.8); tone(tt, 0.18, fx, { f: 62, f2: 38, gain: o.gain || 0.8 }); tone(tt + 0.22, 0.15, fx, { f: 58, f2: 36, gain: (o.gain || 0.8) * 0.65 }); } },
    tick: (t, o) => { for (let i = 0; i < (o.n || 4); i++) noise(t + i * (o.gap || 0.5), 0.025, fx, { type: 'highpass', f: i % 2 ? 2600 : 3400, gain: o.gain || 0.3, a: 0.001 }); },
    bell: (t, o) => { const f0 = o.f || 660; for (const [m, g, d] of [[1, 0.2, 3], [2.4, 0.08, 2], [3.9, 0.05, 1.4], [5.4, 0.03, 0.9]]) tone(t, d, fx, { f: f0 * m, gain: g * (o.gain || 1) }); },
    chime: (t, o) => { const ns = o.notes || [76, 79, 83, 88]; ns.forEach((n, i) => tone(t + i * (o.gap || 0.09), 1.6, fx, { f: midi(n), gain: 0.07 * (o.gain || 1) })); },
    sparkle: (t, o) => { for (let i = 0; i < 10; i++) tone(t + i * 0.05, 0.5, fx, { f: 2000 + R() * 3000, gain: 0.03 * (o.gain || 1) }); },
    pop: (t, o) => tone(t, 0.12, fx, { f: o.f || 300, f2: (o.f || 300) * 3, gain: o.gain || 0.3 }),
    paper: (t, o) => { for (let i = 0; i < (o.n || 14); i++) noise(t + i * 0.035 + R() * 0.03, 0.03, fx, { type: 'bandpass', f: 2500 + R() * 3500, q: 1.5, gain: (o.gain || 0.3) * (0.4 + R() * 0.6), a: 0.002 }); },
    scribble: (t, o) => { for (let i = 0; i < (o.n || 10); i++) noise(t + i * 0.09, 0.07, fx, { type: 'bandpass', f: 3500 + R() * 1500, q: 3, gain: o.gain || 0.08, a: 0.01 }); },
    dig: (t, o) => { for (let i = 0; i < (o.n || 4); i++) { noise(t + i * 0.45, 0.18, fx, { type: 'lowpass', f: 900, gain: 0.4 }); tone(t + i * 0.45, 0.1, fx, { f: 180, f2: 90, gain: 0.25 }); } },
    clank: (t, o) => { for (let i = 0; i < (o.n || 3); i++) SFX.metal(t + i * (o.gap || 0.4), { gain: 0.12, len: 0.5, pitch: 0.9 + R() * 0.2 }); },
    applause: (t, o) => { const d = o.dur || 3; for (let tt = t; tt < t + d; tt += 0.008) { const k = Math.sin(Math.PI * (tt - t) / d); noise(tt + R() * 0.01, 0.012, fx, { type: 'bandpass', f: 1200 + R() * 2600, q: 1, gain: (o.gain || 0.18) * k * (0.4 + R() * 0.6), a: 0.001 }); } },
    cheer: (t, o) => { SFX.applause(t, o); noise(t, (o.dur || 3) * 0.8, fx, { type: 'bandpass', f: 700, f2: 1100, q: 2, gain: 0.08, a: 0.5 }); },
    howl: (t, o) => { const d = o.dur || 2.6, f0 = o.f || 420; const os = ac.createOscillator(); os.type = 'triangle'; os.frequency.setValueAtTime(f0 * 0.7, t); os.frequency.linearRampToValueAtTime(f0 * 1.25, t + d * 0.3); os.frequency.linearRampToValueAtTime(f0, t + d); const v = ac.createOscillator(); v.frequency.value = 5.5; const vg = ac.createGain(); vg.gain.value = f0 * 0.02; v.connect(vg); vg.connect(os.frequency); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.12, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + d); os.connect(g); g.connect(fx); os.start(t); v.start(t); os.stop(t + d + 0.1); v.stop(t + d + 0.1); },
    growl: (t, o) => { const d = o.dur || 1.4; const os = ac.createOscillator(); os.type = 'sawtooth'; os.frequency.value = 70; const am = ac.createOscillator(); am.frequency.value = 24; const ag = ac.createGain(); ag.gain.value = 0.5; am.connect(ag); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain || 0.2, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + d); ag.connect(g.gain); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; os.connect(f); f.connect(g); g.connect(fx); os.start(t); am.start(t); os.stop(t + d + .1); am.stop(t + d + .1); },
    shatter: (t, o) => { for (let i = 0; i < 26; i++) tone(t + R() * 0.25, 0.3 + R() * 0.6, fx, { f: 2500 + R() * 5000, gain: 0.03 }); noise(t, 0.4, fx, { type: 'highpass', f: 3000, gain: 0.4 }); },
    gong: (t, o) => { for (const [m, g, d] of [[1, 0.3, 5], [1.48, 0.12, 4], [2.1, 0.08, 3], [2.9, 0.05, 2]]) tone(t, d, fx, { f: (o.f || 98) * m, gain: g * (o.gain || 1) }); },
    stinger: (t, o) => { const r0 = o.root || M.root; [0, 3, 7, 12, 15].forEach((n, i) => { tone(t + i * 0.02, 4, fx, { f: midi(r0 + 12 + n), gain: 0.06 * (o.gain || 1), a: 0.01 }); tone(t, 4, fx, { f: midi(r0 + n) * 2.001, gain: 0.02 }); }); tone(t, 3, fx, { f: midi(r0 - 12), gain: 0.25 }); },
    piano: (t, o) => { (o.notes || [M.root + 12]).forEach((n, i) => { const tt = t + i * (o.gap || 0); for (const [mul, g, d] of [[1, 0.12, 3], [2, 0.04, 1.6], [3, 0.02, 0.8]]) tone(tt, d, fx, { f: midi(n) * mul, gain: g * (o.gain || 1) }); }); },
    coins: (t, o) => { for (let i = 0; i < (o.n || 12); i++) SFX.metal(t + i * 0.06 + R() * 0.03, { gain: 0.04, len: 0.25, pitch: 2 + R() }); },
    splash: (t, o) => { noise(t, 0.8, fx, { type: 'bandpass', f: 1200, f2: 400, q: 0.8, gain: o.gain || 0.5 }); },
    camera: (t, o) => { noise(t, 0.03, fx, { type: 'highpass', f: 2000, gain: 0.4 }); noise(t + 0.09, 0.05, fx, { type: 'bandpass', f: 1200, gain: 0.3 }); },
    door: (t, o) => { SFX.creak(t, { dur: 1.8, gain: 0.45 }); SFX.thud(t + 1.9, { gain: 0.4 }); },
    glitch: (t, o) => { for (let i = 0; i < 8; i++) tone(t + i * 0.03, 0.03, fx, { f: 200 + R() * 2000, type: 'square', gain: 0.05 }); },
    drone: (t, o) => { const d = o.dur || 5; for (const fr of [55, 55.5, 82.4]) { const os = ac.createOscillator(); os.type = 'sawtooth'; os.frequency.value = fr; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((o.gain || 0.06), t + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + d); os.connect(f); f.connect(g); g.connect(fx); os.start(t); os.stop(t + d + 0.1); } },
    whisper: (t, o) => { const d = o.dur || 1.5; for (let i = 0; i < d / 0.12; i++) noise(t + i * 0.12, 0.1, fx, { type: 'bandpass', f: 2000 + R() * 3000, q: 4, gain: (o.gain || 0.05) * (0.3 + R()), a: 0.03 }); },
    // phone sounds (s10v3): a vibrating phone on a table, a screen tap, a message ping, typing on glass, a sent swoosh
    vibrate: (t, o) => { for (let i = 0; i < (o.n || 2); i++) { const tt = t + i * (o.gap || 0.55), d = o.len || 0.32; const os = ac.createOscillator(); os.type = 'sawtooth'; os.frequency.value = 150; const am = ac.createOscillator(); am.type = 'square'; am.frequency.value = 38; const ag = ac.createGain(); ag.gain.value = 0.35; am.connect(ag); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(o.gain || 0.32, tt + 0.02); g.gain.setValueAtTime(o.gain || 0.32, tt + d - 0.03); g.gain.linearRampToValueAtTime(0.0001, tt + d); ag.connect(g.gain); os.connect(f); f.connect(g); g.connect(fx); os.start(tt); am.start(tt); os.stop(tt + d + 0.05); am.stop(tt + d + 0.05); noise(tt, d, fx, { type: 'bandpass', f: 2400, q: 6, gain: (o.gain || 0.32) * 0.15, a: 0.01 }); } },
    knock: (t, o) => { tone(t, 0.22, fx, { f: o.f || 150, f2: (o.f || 150) * 0.6, gain: o.gain || 0.9, a: 0.002 }); noise(t, 0.09, fx, { type: 'bandpass', f: 900, q: 1.2, gain: (o.gain || 0.9) * 0.7, a: 0.001 }); noise(t, 0.05, fx, { type: 'lowpass', f: 300, gain: (o.gain || 0.9) * 0.6, a: 0.001 }); },
    tap: (t, o) => { noise(t, 0.018, fx, { type: 'bandpass', f: o.f || 3200, q: 2, gain: o.gain || 0.35, a: 0.001 }); tone(t, 0.04, fx, { f: 1800, f2: 900, gain: (o.gain || 0.35) * 0.15, a: 0.001 }); },
    notif: (t, o) => { const r0 = o.root || 81; tone(t, 0.35, fx, { f: midi(r0), gain: 0.09 * (o.gain || 1), a: 0.003 }); tone(t + 0.09, 0.5, fx, { f: midi(r0 + 7), gain: 0.08 * (o.gain || 1), a: 0.003 }); },
    typing: (t, o) => { const n = o.n || 12; for (let i = 0; i < n; i++) SFX.tap(t + i * (o.gap || 0.085) + R() * 0.03, { gain: (o.gain || 0.22) * (0.6 + R() * 0.4), f: 2600 + R() * 1400 }); },
    sent: (t, o) => { noise(t, 0.18, fx, { type: 'bandpass', f: 900, f2: 4000, q: 1.4, gain: o.gain || 0.18, a: 0.06 }); tone(t + 0.1, 0.2, fx, { f: 1320, gain: 0.04 }); },
    smear: (t, o) => noise(t, o.dur || 0.16, fx, { type: 'bandpass', f: o.f || 2400, f2: (o.f || 2400) * 0.45, q: 1.2, gain: o.gain || 0.22, a: 0.03 }),
    impact: (t, o) => { tone(t, 0.45, fx, { f: 110, f2: 40, gain: o.gain || 0.6 }); noise(t, 0.2, fx, { type: 'lowpass', f: 3000, f2: 300, gain: (o.gain || 0.6) * 0.6, a: 0.002 }); noise(t - 0.25, 0.25, fx, { type: 'bandpass', f: 600, f2: 3000, q: 1, gain: 0.12, a: 0.22 }); },
  };

  for (const e of (sfx || [])) { const [t, name, o = {}] = e; if (t < 0 || t > duration) continue; try { (SFX[name] || (() => console.log('[reel] no sfx ' + name)))(t, o); } catch (err) { console.log('[reel] sfx ' + name + ' skipped: ' + err.message); } }

  const buf = await ac.startRendering();
  return buf;
}
function impulse(ac, secs, decay) { const n = ac.sampleRate * secs, b = ac.createBuffer(2, n, ac.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 200 ? i / 200 : 1); } return b; }
