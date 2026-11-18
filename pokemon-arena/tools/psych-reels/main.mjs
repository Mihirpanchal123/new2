// Renders one reel in the browser: lays the shots out on a timeline around their voiceover, draws every frame (with
// transitions, Hindi word-by-word subtitles, the hook title and the end card), mixes the soundtrack and encodes an MP4
// (H.264 + AAC) with WebCodecs, frame by frame, so nothing is ever dropped. Driven by make.mjs.
import { W, H, FONT, OL, clamp, lerp, seg, ease, E, finish, title, wrap, rgba, black, flash, circ, lin } from './engine.mjs';
import { mixSoundtrack } from './audio.mjs';
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';

const log = m => console.log('[reel] ' + m);
const PX = 2;                                  // logical 540x960 -> 1080x1920
const mk = () => { const cv = document.createElement('canvas'); cv.width = W * PX; cv.height = H * PX; return cv; };

async function decode(url) { const ab = await (await fetch(url)).arrayBuffer(); return await new OfflineAudioContext(1, 1, 48000).decodeAudioData(ab); }

// ------------------------------------------------------------------ the timeline
async function build(story, vo) {
  const shots = []; let T = 0;
  const voice = [], subs = [];
  for (let i = 0; i < story.shots.length; i++) {
    const s = story.shots[i];
    const lines = s.vo == null ? [] : (Array.isArray(s.vo) ? s.vo : [s.vo]).map(l => typeof l === 'string' ? { text: l } : l);
    const lead = s.lead ?? (lines.length ? 0.3 : 0);
    let at = lead; const L = [];
    for (let k = 0; k < lines.length; k++) {
      if (lines[k].silent) { // a caption without a voice (e.g. knocks): its words are spread over `dur`
        const a = at + (lines[k].delay || 0), d = lines[k].dur || 2, ws = lines[k].text.replace(/\*/g, '').split(/\s+/).filter(Boolean);
        const Ls = { a, b: a + d, text: lines[k].text, words: ws.map((w, j) => ({ w, t: (lines[k].times?.[j] ?? j * d / ws.length), d: d / ws.length })), buf: null, voice: 'silent' };
        L.push(Ls); at = a + d + (lines[k].gap ?? s.gap ?? 0.3); continue;
      }
      const v = vo[`${i}-${k}`]; if (!v) throw new Error(`no voiceover for shot ${i} line ${k}`);
      const buf = await decode(v.url);
      const a = lines[k].at != null ? Math.max(0, lines[k].at - ((v.words && v.words[0]?.t) || 0)) : at + (lines[k].delay || 0);   // at: the speech starts exactly then
      const rate = lines[k].fx?.rate || 1;
      L.push({ fx: lines[k].fx, a, b: a + buf.duration / rate, text: lines[k].text.replace(/\s*\|{1,3}\s*/g, ' ').trim(), words: v.words, buf, voice: lines[k].voice || 'nar' });
      at = a + buf.duration / rate + (lines[k].gap ?? s.gap ?? 0.3);
    }
    const dur = Math.max(s.min ?? 2.5, (L.length ? L[L.length - 1].b : 0) + (s.tail ?? 0.45));
    shots.push({ ...s, i, start: T, dur, lines: L });
    for (const l of L) { if (l.buf) voice.push({ buffer: l.buf, at: T + l.a, gain: (s.voGain ?? 1) * (l.fx?.gain ?? 1), fx: l.fx }); subs.push(...chunks(l, T, story.subStyle)); }
    T += dur;
  }
  const end = { start: T, dur: story.endCard === false ? 0 : (story.endDur ?? 3.3) };   // endCard:false = the reel loops straight back to its start
  const at = id => shots.find(s => s.id === id) || shots[id];
  return { shots, end, total: T + end.dur, voice, subs, at };
}

// words of one line -> subtitle chunks (each fits in two rows), with a time for every word
const sctx = mk().getContext('2d');
const SUB = { size: 31, max: 400, x: W / 2 - 12, y: 722 };
function chunks(line, T0, st = {}) {
  const size = st.size || SUB.size, maxW = st.max || SUB.max, rowsMax = st.rows || 2, wordsMax = st.words || 99;
  const words = line.text.replace(/\*/g, '').split(/\s+/).filter(Boolean);
  const hot = new Set(); line.text.split(/\s+/).forEach((w, i) => { if (/^\*.*\*[^\s]*$/.test(w) || /^\*/.test(w)) hot.add(i); });
  // align the spoken word boundaries with the written words
  const B = (line.words || []).map(b => ({ ...b, core: b.w.replace(/[^ऀ-ॿ\w]/g, '') }));
  const times = new Array(words.length).fill(null); let j = 0;
  for (let i = 0; i < words.length && j < B.length; i++) {
    let core = words[i].replace(/[^ऀ-ॿ\w]/g, ''); if (!core) continue;
    let k = j; while (k < B.length && k < j + 4 && !(B[k].core && (core.startsWith(B[k].core) || B[k].core.startsWith(core) || core.includes(B[k].core)))) k++;
    if (k < B.length && k < j + 4) { times[i] = B[k].t; j = k + 1; let rest = core.slice(B[k].core.length); while (rest && j < B.length && B[j].core && rest.startsWith(B[j].core)) { rest = rest.slice(B[j].core.length); j++; } }
  }
  const dur = line.b - line.a;
  for (let i = 0; i < words.length; i++) if (times[i] == null) { // fill the gaps proportionally
    let p = i - 1; while (p >= 0 && times[p] == null) p--; let n = i + 1; while (n < words.length && times[n] == null) n++;
    const ta = p >= 0 ? times[p] : 0, tb = n < words.length ? times[n] : dur * 0.97; times[i] = ta + (tb - ta) * (i - p) / (n - p);
  }
  sctx.font = `${st.weight || 800} ${size}px ${st.font || FONT}`;
  const out = []; let cur = [], rows = 1, rowW = 0; const space = sctx.measureText(' ').width;
  const push = () => { if (cur.length) out.push(cur); cur = []; rows = 1; rowW = 0; };
  words.forEach((w, i) => {
    const ww = sctx.measureText(w).width;
    if ((rowW && rowW + space + ww > maxW) || cur.length >= wordsMax) { if (rows >= rowsMax || cur.length >= wordsMax) push(); else { rows++; rowW = 0; } }
    rowW += (rowW ? space : 0) + ww; cur.push({ w, t: T0 + line.a + times[i], hot: hot.has(i) });
    if (st.mode === 'chalk' ? (/[,।?!]$|\.\.\.$/.test(w) && cur.length >= 2 && i < words.length - 1) : (/[।?!]$|\.\.\.$/.test(w) && cur.length >= 4 && i < words.length - 2)) push();
  });
  push();
  return out.map((ws, k) => ({ words: ws, a: ws[0].t - 0.08, b: k < out.length - 1 ? out[k + 1][0].t - 0.08 : T0 + line.b + 0.45 }));
}
function drawSubs(c, subs, T, Y = SUB.y, st = {}) {
  const ch = subs.find(s => T >= s.a && T < s.b); if (!ch) return;
  if (st.mode === 'chalk') return chalkSubs(c, ch, T, Y, st);
  if (!ch.layout) { // rows of words, centred
    c.font = `800 ${SUB.size}px ${FONT}`; const space = c.measureText(' ').width; const rows = [[]]; let rw = 0;
    for (const w of ch.words) { const ww = c.measureText(w.w).width; if (rw && rw + space + ww > SUB.max) { rows.push([]); rw = 0; } rows[rows.length - 1].push({ ...w, ww }); rw += (rw ? space : 0) + ww; }
    ch.layout = rows.map((r, ri) => { const tw = r.reduce((s, w) => s + w.ww, 0) + space * (r.length - 1); let x = SUB.x - tw / 2; return r.map(w => { const o = { ...w, x: x + w.ww / 2, y: Y + (ri - (rows.length - 1) / 2) * SUB.size * 1.42 }; x += w.ww + space; return o; }); }).flat();
  }
  const fadeOut = clamp((ch.b - T) / 0.18);
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const next = i => ch.layout[i + 1] ? ch.layout[i + 1].t : ch.b;
  ch.layout.forEach((w, i) => {
    const age = T - w.t; if (age < 0) return;
    const pop = age < 0.16 ? ease.back(age / 0.16) : 1, active = T < next(i) && age < 0.9;
    const s = (0.55 + 0.45 * pop) * (active ? 1.1 : 1);
    c.save(); c.translate(w.x, w.y - (1 - pop) * 10); c.scale(s, s); c.globalAlpha = clamp(pop * 1.4) * fadeOut;
    c.font = `800 ${SUB.size}px ${FONT}`;
    c.fillStyle = st.shadow || 'rgba(0,0,0,0.5)'; c.fillText(w.w, 1.5, 3.5);
    c.strokeStyle = st.ol || OL; c.lineWidth = st.olw || 8; c.strokeText(w.w, 0, 0);
    c.fillStyle = active ? (st.active || '#ffd84a') : w.hot ? (st.hot || '#ffb3a1') : (st.fill || '#ffffff'); c.fillText(w.w, 0, 0);
    c.restore();
  });
  c.restore();
}

// painted bands for the 'brush' transition: k 0..0.5 they sweep in from the left, 0.5..1 they sweep out to the right
function brushWipe(c, k, cols, seed) {
  const N = 6, bh = H / N;
  for (let i = 0; i < N; i++) {
    const d = i * 0.05, p = clamp((k - d) / (1 - 0.25)), cover = ease.inOut(clamp(p * 2)), leave = ease.inOut(clamp(p * 2 - 1));
    const x0 = -60 + leave * (W + 120), x1 = -60 + cover * (W + 160); if (x1 <= x0 + 1) continue;
    const y0 = i * bh - 14, y1 = (i + 1) * bh + 14, col = cols[(i + seed) % cols.length];
    let r = (seed * 31 + i * 7) >>> 0; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    c.beginPath(); c.moveTo(x0, y0 + rnd() * 8);
    for (let x = x0; x <= x1; x += 24) c.lineTo(x, y0 + rnd() * 9);
    c.quadraticCurveTo(x1 + 30, (y0 + y1) / 2, x1, y1 - rnd() * 6);
    for (let x = x1; x >= x0; x -= 24) c.lineTo(x, y1 - rnd() * 9);
    c.closePath(); c.fillStyle = col; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 2; for (let s2 = 0; s2 < 4; s2++) { const yy = lerp(y0 + 12, y1 - 12, rnd()); c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1 - 10, yy + (rnd() - 0.5) * 4); c.stroke(); }
  }
}

// handwritten captions (the chalk look): spoken words white, the word being spoken yellow with a drawn underline,
// the words still to come dim grey, one row, no outline
function chalkSubs(c, ch, T, Y, st) {
  const size = st.size || SUB.size, font = `${st.weight || 700} ${size}px ${st.font || FONT}`;
  c.save(); c.font = font; c.textAlign = 'left'; c.textBaseline = 'middle';
  if (!ch.cl) { const sp = c.measureText(' ').width * 1.05, ws = ch.words.map(w => ({ ...w, ww: c.measureText(w.w).width })); const tw = ws.reduce((a, w) => a + w.ww, 0) + sp * (ws.length - 1); let x = W / 2 - 12 - tw / 2; ch.cl = ws.map(w => { const o = { ...w, x }; x += w.ww + sp; return o; }); }
  const fade = clamp((T - ch.a) / 0.12) * clamp((ch.b - T) / 0.15);
  if (st.backing) { const x0 = ch.cl[0].x, x1 = ch.cl[ch.cl.length - 1].x + ch.cl[ch.cl.length - 1].ww; c.save(); c.globalAlpha = fade * st.backing; c.fillStyle = '#000'; c.beginPath(); c.roundRect(x0 - size * 0.5, Y - size * 0.72, x1 - x0 + size, size * 1.5, size * 0.5); c.fill(); c.restore(); }   // a soft dark card on light scenes
  let act = -1; ch.cl.forEach((w, i) => { if (T >= w.t - 0.03) act = i; });
  ch.cl.forEach((w, i) => {
    c.globalAlpha = fade; c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(w.w, w.x + 1.5, Y + 2.5);
    c.fillStyle = i === act ? (st.active || '#f5c84c') : i < act ? (st.fill || '#f3f0e8') : (st.next || 'rgba(160,160,160,0.42)'); c.fillText(w.w, w.x, Y);
    if (i === act) { const k = clamp((T - w.t + 0.03) / 0.2), uy = Y + size * 0.62, n = 8; c.beginPath(); for (let j = 0; j <= n * k; j++) { const xx = w.x + w.ww * j / n, yy = uy + Math.sin(j * 1.7 + Math.floor(T * 7.5)) * 1.2; j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.strokeStyle = st.active || '#f5c84c'; c.lineWidth = Math.max(2, size * 0.075); c.lineCap = 'round'; c.stroke(); }
  });
  c.restore();
}

// ------------------------------------------------------------------ one frame
function makeRenderer(story, tl) {
  const main = mk(), A = mk(), B = mk();
  const ctx = cv => { const c = cv.getContext('2d', { alpha: false }); return c; };
  const cm = ctx(main), ca = ctx(A), cb = ctx(B);
  const at = T => { for (let i = tl.shots.length - 1; i >= 0; i--) if (T >= tl.shots[i].start) return i; return 0; };
  const helpers = shot => ({
    dur: shot.dur, i: shot.i, story,
    line: k => shot.lines[k] || { a: 1e9, b: 1e9 },
    speaking: (t, k = 0) => { const l = shot.lines[k]; return !!l && t >= l.a && t <= l.b; },
  });
  function drawShot(c, shot, t, T) {
    c.setTransform(PX, 0, 0, PX, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = story.bg || '#0b0710'; c.fillRect(0, 0, W, H);
    c.save(); const S = helpers(shot); S.p = clamp(t / shot.dur); S.T = T; shot.draw(c, t, S); c.restore();
  }
  return function frame(T, fo = {}) {
    const c = cm;
    if (tl.end.dur > 0 && T >= tl.end.start) { endCard(c, T - tl.end.start, T); return main; }
    const i = at(T), shot = tl.shots[i], t = T - shot.start;
    const tr = shot.tr || (i === 0 ? 'cut' : 'fade'), trd = shot.trd ?? (tr === 'black' ? 0.9 : tr === 'flash' ? 0.5 : tr === 'cut' ? 0 : 0.55);
    if (i > 0 && t < trd) {
      const prev = tl.shots[i - 1], k = t / trd;
      drawShot(ca, prev, T - prev.start, T); drawShot(cb, shot, t, T);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      if (tr === 'fade') { c.drawImage(A, 0, 0); c.globalAlpha = ease.sine(k); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
      else if (tr === 'black' || tr === 'flash') { const col = tr === 'black' ? '#000' : '#fff'; c.drawImage(k < 0.5 ? A : B, 0, 0); c.setTransform(PX, 0, 0, PX, 0, 0); flash(c, k < 0.5 ? k * 2 : (1 - k) * 2, col); }
      else if (tr === 'iris') { c.drawImage(A, 0, 0); c.save(); c.beginPath(); c.arc(W, H, ease.inOut(k) * H * 2.3, 0, Math.PI * 2); c.clip(); c.drawImage(B, 0, 0); c.restore(); }
      else if (tr === 'shape') { // the next shot grows out of a shape (circle / phone / diamond) at trAt, with an ink rim
        const [sx, sy] = shot.trAt || [W / 2, H / 2], e = ease.inOut(k), R = e * Math.hypot(W, H) * 1.15, kind = shot.trShape || 'circle';
        c.drawImage(A, 0, 0); c.save(); c.setTransform(PX, 0, 0, PX, 0, 0); c.beginPath();
        if (kind === 'phone') c.roundRect(sx - R * 0.5, sy - R, R, R * 2, R * 0.12); else if (kind === 'diamond') { c.moveTo(sx, sy - R); c.lineTo(sx + R, sy); c.lineTo(sx, sy + R); c.lineTo(sx - R, sy); c.closePath(); } else c.arc(sx, sy, R, 0, Math.PI * 2);
        c.save(); c.clip(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(B, 0, 0); c.restore();
        c.lineWidth = 9 * (1 - e) + 2; c.strokeStyle = shot.trCol || '#f4a940'; c.stroke(); c.restore();
      }
      else if (tr === 'brush') { // an illustrated wipe: painted brush strokes sweep across, the next shot is behind them
        c.drawImage(k < 0.5 ? A : B, 0, 0); c.setTransform(PX, 0, 0, PX, 0, 0); brushWipe(c, k, shot.trCols || story.wipeCols || ['#2a9d8f', '#f4a940', '#ef6f5e', '#14213d'], shot.i);
      }
      else if (tr === 'slide') { const x = ease.inOut(k) * W * PX; c.drawImage(A, -x, 0); c.drawImage(B, W * PX - x, 0); }
    } else drawShot(c, shot, t, T);
    c.setTransform(PX, 0, 0, PX, 0, 0);
    finish(c, null, { grade: shot.grade || story.grade, vignette: shot.vignette ?? story.vignette, grain: story.grain });
    if (story.overlay) { c.save(); story.overlay(c, T, shot); c.restore(); }   // e.g. a paper texture over the frame
    // the hook title over the first seconds
    if (story.title && T < (story.titleOut ?? 4.2)) {
      const k = ease.back(seg(T, 0.25, 0.8)), out = 1 - seg(T, (story.titleOut ?? 4.2) - 0.5, story.titleOut ?? 4.2);
      c.save(); c.globalAlpha = Math.min(1, k * 1.5) * out; c.translate(W / 2, story.titleY ?? 168); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      title(c, story.title, 0, 0, story.titleSize ?? 40, { col: story.titleCol || '#fff', max: 470 });
      c.restore();
    }
    if (fo.cover) { // the cover: no subtitles, the title big at the top
      c.save(); c.fillStyle = lin(c, 0, 0, 0, 360, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, 360); c.restore();
      title(c, story.title, W / 2, 170, 46, { col: story.accent || '#ffd84a', max: 480 });
    } else if (!shot.noSubs) drawSubs(c, tl.subs, T, story.subY ?? SUB.y, story.subStyle);
    // fade in from black at the very start
    if (T < 0.5 && !story.noFadeIn) black(c, 1 - T / 0.5);
    return main;
  };
  // the end card: the last line as a quote to save + the follow call
  function endCard(c, t, T) {
    c.setTransform(PX, 0, 0, PX, 0, 0); c.globalAlpha = 1;
    const last = tl.shots[tl.shots.length - 1];
    if (story.endBg) story.endBg(c, t); else { c.fillStyle = '#0c0812'; c.fillRect(0, 0, W, H); const g = c.createRadialGradient(W / 2, 470, 10, W / 2, 470, 420); g.addColorStop(0, rgba(story.accent || '#ffd84a', 0.16 + 0.04 * Math.sin(t * 2))); g.addColorStop(1, rgba(story.accent || '#ffd84a', 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    c.save(); c.globalAlpha = 0.55; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, W, H); c.restore();
    const q = story.quote || (last.lines.length ? last.lines[last.lines.length - 1].text.replace(/\*/g, '') : '');
    const k = ease.out(seg(t, 0, 0.8));
    c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 20);
    c.font = `800 ${story.quoteSize ?? 34}px ${FONT}`; const lines = wrap(c, q, 430);
    title(c, '“', W / 2, 470 - lines.length * (story.quoteSize ?? 34) * 0.725 - 40, 90, { col: story.accent || '#ffd84a', olw: 0.08 });
    title(c, lines, W / 2, 470, story.quoteSize ?? 34, { col: '#fff', lh: 1.45 });
    c.restore();
    const k2 = ease.back(seg(t, 0.9, 1.5));
    c.save(); c.globalAlpha = clamp(k2); c.translate(W / 2, 700); c.scale(0.7 + 0.3 * k2, 0.7 + 0.3 * k2);
    title(c, 'ऐसी और कहानियों के लिए', 0, -20, 24, { col: '#e9e1f5', olw: 0.16 });
    title(c, 'फ़ॉलो करें ❤', 0, 22, 34, { col: story.accent || '#ffd84a' });
    c.restore();
    finish(c, null, { vignette: 0.9, grain: story.grain });
    if (t > tl.end.dur - 0.6) black(c, (t - (tl.end.dur - 0.6)) / 0.6);
  }
}

// ------------------------------------------------------------------ the whole reel
async function render(opts) {
  const t0 = performance.now();
  const story = (await import(`./stories/s${opts.id}.mjs?v=${Date.now()}`)).default;
  for (const f of story.fonts || []) { if (![...document.fonts].some(x => x.family === f.family && x.status === 'loaded')) { const ff = new FontFace(f.family, `url(${f.url})`, { weight: String(f.weight || 400) }); await ff.load(); document.fonts.add(ff); } }
  const tl = await build(story, opts.vo);
  log(`timeline ${tl.total.toFixed(1)} s, ${tl.shots.length} shots`);
  const frame = makeRenderer(story, tl);
  if (opts.coverOnly) { await saveCover(story, tl, frame, opts); return { total: tl.total, frames: 0, bytes: 0, secs: 0 }; }
  if (opts.stills) { // pictures at given times (for checking)
    const times = opts.stills === 'shots' ? tl.shots.flatMap(s => [s.start + s.dur * 0.5]).concat([tl.end.start + 2]) : opts.stills;
    for (const [n, T] of times.entries()) {
      const cv = frame(T); const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.8));
      await fetch(`/save?file=${encodeURIComponent(`stills/s${opts.id}-${String(n).padStart(2, '0')}-${T.toFixed(1)}s.jpg`)}`, { method: 'POST', body: blob });
    }
    return { total: tl.total, shots: tl.shots.map(s => [s.start.toFixed(1), s.dur.toFixed(1)]) };
  }
  // sound
  const audio = await mixSoundtrack({ duration: tl.total, voice: tl.voice, music: typeof story.music === 'function' ? story.music(tl) : story.music, ambience: story.ambience?.(tl), sfx: sfxList(story, tl), seed: (parseInt(opts.id) || 1) * 77 });
  { let pk = 0, ss = 0; const d0 = audio.getChannelData(0); for (let i = 0; i < d0.length; i += 7) { const v = Math.abs(d0[i]); if (v > pk) pk = v; ss += v * v; } log(`audio peak ${pk.toFixed(2)} rms ${Math.sqrt(ss / (d0.length / 7)).toFixed(3)}`); }
  log(`soundtrack mixed (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  if (opts.audioOnly) { const n = audio.length, b = new ArrayBuffer(44 + n * 4), v = new DataView(b), w = (o, str) => [...str].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0))); w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, 48000, true); v.setUint32(28, 192000, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true); const L0 = audio.getChannelData(0), R0 = audio.getChannelData(1); for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L0[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R0[i])) * 32767, true); } await fetch(`/save?file=${encodeURIComponent(opts.out.replace(/.mp4$/, '-audio.wav'))}`, { method: 'POST', body: b }); return { total: tl.total, frames: 0, bytes: b.byteLength, secs: (performance.now() - t0) / 1000 }; }
  const fps = opts.fps || 60, nFrames = Math.round(tl.total * fps);
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W * PX, height: H * PX, frameRate: fps }, audio: { codec: 'aac', sampleRate: 48000, numberOfChannels: 2 }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null;
  const venc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => err = e });
  venc.configure({ codec: fps > 30 ? 'avc1.64002A' : 'avc1.640028', width: W * PX, height: H * PX, bitrate: opts.bitrate || 8_000_000, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } });
  const aenc = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => err = e });
  aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
  // audio first (it is all ready)
  const L = audio.getChannelData(0), Rr = audio.getChannelData(1), N = 1024;
  for (let i = 0; i < audio.length; i += N) {
    const n = Math.min(N, audio.length - i), data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(Rr.subarray(i, i + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / 48000 * 1e6), data }); aenc.encode(ad); ad.close();
  }
  await aenc.flush();
  let last = performance.now();
  for (let f = 0; f < nFrames; f++) {
    if (err) throw err;
    const cv = frame(f / fps);
    const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    venc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
    while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
    if (performance.now() - last > 4000 || f === nFrames - 1) { last = performance.now(); log(`frame ${f + 1}/${nFrames} (${((f + 1) / nFrames * 100).toFixed(0)}%)`); }
  }
  await venc.flush(); if (err) throw err;
  muxer.finalize();
  const buf = muxer.target.buffer;
  await fetch(`/save?file=${encodeURIComponent(opts.out)}`, { method: 'POST', body: buf });
  await saveCover(story, tl, frame, opts);
  return { total: tl.total, frames: nFrames, bytes: buf.byteLength, secs: (performance.now() - t0) / 1000 };
}
// the cover picture: a frame from the twist, without subtitles, with the title big at the top
async function saveCover(story, tl, frame, opts) {
  const cs = story.cover != null && typeof story.cover !== 'number' ? tl.at(story.cover.shot) : null;
  const coverT = typeof story.cover === 'number' ? story.cover : cs ? cs.start + cs.dur * (story.cover.at ?? 0.5) : tl.total * 0.6;
  const cv = frame(coverT, { cover: true }); const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
  await fetch(`/save?file=${encodeURIComponent(opts.out.replace(/\.mp4$/, '-cover.jpg'))}`, { method: 'POST', body: blob });
}
// sound effects: story-wide (absolute) + per shot (relative to the shot)
function sfxList(story, tl) {
  const out = [];
  for (const s of tl.shots) for (const [t, n, o] of (s.sfx || [])) out.push([s.start + (typeof t === 'function' ? t(s) : t), n, o]);
  for (const e of (story.sfx || [])) out.push(e);
  if (tl.end.dur > 0) out.push([tl.end.start + 0.05, 'stinger', {}]);
  return out;
}
window.__reels = { render };
log('ready');
