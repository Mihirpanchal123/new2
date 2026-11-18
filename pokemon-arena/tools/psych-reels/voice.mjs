// The Hindi voiceover through Sarvam AI's Bulbul (an Indian text-to-speech built for Indian languages).
//
// Phrasing: a line is spoken phrase by phrase, so the pauses fall where Hindi grammar wants them, not where the voice
// guesses. In a story's text:   |  = a short breath (~0.2 s)   ||  = a pause (~0.45 s)   |||  = a dramatic pause (~0.8 s)
// "..." with no | next to it counts as a pause too. Each phrase is voiced on its own, its silence trimmed, and the
// phrases are joined with exactly those pauses. The subtitles never show the | marks.
// Pronunciation: lexicon.mjs maps a written word to how it should be spoken (only the voice sees it).
// The key: SARVAM_API_KEY in the environment, or in pokemon-arena/.env (as SARVAM_API_KEY=... or api_key:...).
import fs from 'node:fs';
import path from 'node:path';
import { LEXICON } from './lexicon.mjs';

export const PAUSE = { 1: 0.2, 2: 0.45, 3: 0.8 };
const SR = 24000;

// ------------------------------------------------------------------ the key
export function sarvamKey(root) {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY.trim();
  for (const f of [path.join(root, '.env'), path.join(root, 'tools/psych-reels/.env')]) {
    if (!fs.existsSync(f)) continue;
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    for (const l of lines) { const m = /^\s*(?:export\s+)?(SARVAM_API_KEY|SARVAM_KEY|api_key|API_KEY)\s*[=:]\s*["']?([^"'\s]+)["']?\s*$/i.exec(l); if (m) return m[2]; }
  }
  return null;
}

// ------------------------------------------------------------------ phrasing
// "बीस साल... | एक ही कोठरी।" -> [{ say, show, pause }]  (pause = the silence AFTER the phrase)
export function phrases(text) {
  let t = text.replace(/\*/g, '');
  // a bare "..." (no | next to it) is a pause of its own
  t = t.replace(/(\.\.\.|…)(?!\s*\|)/g, '$1 ||');
  const parts = t.split(/(\|{1,3})/), out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const show = parts[i].trim(); if (!show) { if (out.length && parts[i + 1]) out[out.length - 1].pause = Math.max(out[out.length - 1].pause, PAUSE[parts[i + 1].length]); continue; }
    const mark = parts[i + 1]; const pause = mark ? PAUSE[mark.length] : 0;
    out.push({ show, say: speakable(show), pause });
  }
  if (out.length) out[out.length - 1].pause = 0;
  return out;
}
// what the voice is given: no "...", the lexicon applied, and a comma at a cut mid-sentence so the tone carries on
function speakable(s) {
  let t = s.replace(/\.\.\.|…/g, ',').replace(/\s+,/g, ',').replace(/,+/g, ',').trim();
  t = t.split(/(\s+)/).map(w => { const core = w.replace(/[,।?!"'“”‘’]+$/u, ''), tail = w.slice(core.length); return (LEXICON[core] ?? core) + tail; }).join('');
  if (!/[।?!,.]$/.test(t)) t += ',';
  return t.replace(/^,+/, '');
}

// ------------------------------------------------------------------ Sarvam
export async function sarvamSpeak(key, text, { speaker, pace = 1, temperature = 0.5, model = 'bulbul:v3' }) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST', headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: 'hi-IN', model, speaker, pace, temperature, speech_sample_rate: SR, output_audio_codec: 'wav' }),
    });
    if (res.ok) { const j = await res.json(); return Buffer.concat((j.audios || []).map(a => Buffer.from(a, 'base64'))); }
    const body = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 6) { await new Promise(r => setTimeout(r, 1200 * 2 ** (attempt - 1))); continue; }
    throw new Error(`Sarvam ${res.status}: ${body.slice(0, 300)}`);
  }
}

// ------------------------------------------------------------------ WAV in/out (16-bit PCM mono)
export function readWav(buf) {
  let o = 12, fmt = null, data = null;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(o + 10), rate: buf.readUInt32LE(o + 12), bits: buf.readUInt16LE(o + 22) };
    if (id === 'data') { data = buf.subarray(o + 8, Math.min(buf.length, o + 8 + size)); break; }
    o += 8 + size + (size & 1);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error('unexpected audio format from Sarvam');
  const n = Math.floor(data.length / 2 / fmt.ch), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let c = 0; c < fmt.ch; c++) v += data.readInt16LE((i * fmt.ch + c) * 2); s[i] = v / fmt.ch / 32768; }
  return { rate: fmt.rate, s };
}
export function writeWav(s, rate) {
  const b = Buffer.alloc(44 + s.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + s.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(s.length * 2, 40);
  for (let i = 0; i < s.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s[i] * 32767))), 44 + i * 2);
  return b;
}
// cut the silence before and after the speech (keeping a little air)
function trim(s, rate) {
  const win = Math.round(rate * 0.01), thr = 0.006; let a = 0, b = s.length;
  const loud = i => { let m = 0; for (let k = i; k < Math.min(s.length, i + win); k++) m = Math.max(m, Math.abs(s[k])); return m > thr; };
  while (a < s.length && !loud(a)) a += win;
  while (b > a && !loud(Math.max(a, b - win))) b -= win;
  a = Math.max(0, a - Math.round(rate * 0.06)); b = Math.min(s.length, b + Math.round(rate * 0.12));
  const out = s.slice(a, b);
  const f = Math.round(rate * 0.006); for (let i = 0; i < f && i < out.length; i++) { out[i] *= i / f; out[out.length - 1 - i] *= i / f; }
  return out;
}
// how long a word takes, roughly: its aksharas (consonants + vowels), so subtitles can follow inside a phrase
const weight = w => Math.max(1, (w.match(/[अ-औक-हक़-य़]/g) || []).length + 0.3 * (w.match(/[ा-ौ]/g) || []).length);

// one line of a story -> { wav, words: [{w, t, d}], phrases }
export async function voiceLine(key, text, V, cacheDir) {
  const ps = phrases(text), chunks = [], words = [];
  let rate = SR, t = 0;
  for (const p of ps) {
    const raw = await phraseAudio(key, p.say, V, cacheDir);
    const { rate: r, s } = readWav(raw); rate = r;
    const a = trim(s, r), dur = a.length / r;
    // the words of this phrase, spread over it by their length
    const ws = p.show.split(/\s+/).filter(Boolean), W = ws.reduce((x, w) => x + weight(w), 0); let acc = 0;
    for (const w of ws) { const k = weight(w); words.push({ w, t: t + 0.04 + (dur - 0.1) * acc / W, d: (dur - 0.1) * k / W }); acc += k; }
    chunks.push(a); t += dur;
    const pz = p.pause * (V.pauseScale ?? 1);   // a story can tighten all its | pauses (e.g. 0.5 for continuous narration)
    if (pz) { chunks.push(new Float32Array(Math.round(pz * r))); t += pz; }
  }
  const total = chunks.reduce((x, c) => x + c.length, 0), all = new Float32Array(total); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return { wav: writeWav(all, rate), words, phrases: ps.map(p => p.say) };
}
// each phrase is cached on its own (re-voicing a line only asks for the phrases that changed)
async function phraseAudio(key, say, V, dir) {
  const sig = JSON.stringify([say, V.speaker, V.pace, V.temperature, V.model || 'bulbul:v3']);
  let h = 0; for (const ch of sig) h = (Math.imul(h, 31) + ch.codePointAt(0)) | 0;
  const f = path.join(dir, `p${(h >>> 0).toString(36)}.wav`);
  if (fs.existsSync(f)) return fs.readFileSync(f);
  if (!key) throw new Error('no Sarvam API key (SARVAM_API_KEY or pokemon-arena/.env)');
  const buf = await sarvamSpeak(key, say, V);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, buf);
  return buf;
}

// ------------------------------------------------------------------ one take (natural narration)
// The whole script is read in ONE request, so the voice keeps a single natural flow (its own intonation and pauses),
// instead of being stitched from separate lines. The take is then cut back into the story's lines at the pauses
// that best match where each line should end (by text length), so pictures and captions still follow the words.
// tighten (0..1): long silences are shortened a little (only silences, never speech): len -> 0.25 + (len - 0.25) * (1 - tighten)
export async function voiceScript(key, texts, V, dir, { tighten = 0.5 } = {}) {
  const clean = t => t.replace(/\*/g, '').replace(/\s*\|+\s*/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').map(w => { const core = w.replace(/[,।?!"'“”‘’.…]+$/u, ''); return (LEXICON[core] ?? core) + w.slice(core.length); }).join(' ');
  const say = texts.map(clean).join(' ');
  const sig = JSON.stringify([say, V.speaker, V.pace, V.temperature, V.model || 'bulbul:v3']);
  let h = 0; for (const ch of sig) h = (Math.imul(h, 31) + ch.codePointAt(0)) | 0;
  const f = path.join(dir, `take${(h >>> 0).toString(36)}.wav`);
  let raw; if (fs.existsSync(f)) raw = fs.readFileSync(f); else { if (!key) throw new Error('no Sarvam API key'); raw = await sarvamSpeak(key, say, V); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, raw); }
  // guide: each line read on its own (same voice and pace) -> its voiced length, a far better estimate than text length
  const guide = [];
  for (const t of texts) { const g = await phraseAudio(key, clean(t), V, path.join(dir, 'guide')); const { rate: gr, s: gs } = readWav(g); guide.push(voicedSecs(gs, gr)); }
  let { rate, s } = readWav(raw);
  // loudness per 10 ms -> silent frames
  const hop = Math.round(rate * 0.01), nF = Math.floor(s.length / hop), db = new Float32Array(nF);
  for (let i = 0; i < nF; i++) { let e = 0; for (let k = 0; k < hop; k++) e += s[i * hop + k] ** 2; db[i] = 10 * Math.log10(e / hop + 1e-10); }
  const sorted = [...db].sort((a, b) => a - b), hiDb = sorted[Math.floor(nF * 0.95)], thr = hiDb - 32;
  const silences = (minLen) => { const out = []; let a = -1; for (let i = 0; i <= nF; i++) { const q = i < nF && db[i] < thr; if (q && a < 0) a = i; if (!q && a >= 0) { if (i - a >= minLen) out.push([a, i]); a = -1; } } return out; };
  // 1. tighten the long silences inside the speech (the edges are left alone)
  if (tighten > 0) {
    const sil = silences(25), keep = []; let pos = 0;
    for (const [a, b] of sil) { if (a === 0 || b >= nF) continue; const len = (b - a) * 0.01, nl = 0.25 + (len - 0.25) * (1 - tighten); const cut = Math.round((len - nl) * rate); if (cut <= 0) continue; const mid = Math.round(((a + b) / 2) * hop); keep.push([pos, mid - Math.floor(cut / 2)]); pos = mid + Math.ceil(cut / 2); }
    keep.push([pos, s.length]);
    const tot = keep.reduce((x, [a, b]) => x + (b - a), 0), out = new Float32Array(tot); let o = 0;
    for (const [a, b] of keep) { const seg = s.subarray(a, b); out.set(seg, o); const F = Math.min(48, seg.length >> 1); for (let i = 0; i < F && o > 0; i++) { out[o + i] *= i / F; out[o - 1 - i] *= i / F; } o += seg.length; }
    s = out;
    // recompute the loudness on the tightened take
    const n2 = Math.floor(s.length / hop); const d2 = new Float32Array(n2); for (let i = 0; i < n2; i++) { let e = 0; for (let k = 0; k < hop; k++) e += s[i * hop + k] ** 2; d2[i] = 10 * Math.log10(e / hop + 1e-10); }
    return cutTake(texts, s, rate, d2, thr, hop, guide);
  }
  return cutTake(texts, s, rate, db, thr, hop, guide);
}
function voicedSecs(s, rate) { const hop = Math.round(rate * 0.01), n = Math.floor(s.length / hop), d = new Float32Array(n); for (let i = 0; i < n; i++) { let e = 0; for (let k = 0; k < hop; k++) e += s[i * hop + k] ** 2; d[i] = 10 * Math.log10(e / hop + 1e-10); } const so = [...d].sort((a, b) => a - b), thr = so[Math.floor(n * 0.95)] - 32; let v = 0; for (const x of d) if (x >= thr) v++; return v * 0.01; }
function cutTake(texts, s, rate, db, thr, hop, guide) {
  const nF = db.length, voiced = Array.from(db, v => v >= thr);
  const sils = []; { let a = -1; for (let i = 0; i <= nF; i++) { const q = i < nF && !voiced[i]; if (q && a < 0) a = i; if (!q && a >= 0) { if (i - a >= 8 && a > 0 && i < nF) sils.push({ a, b: i, c: (a + i) / 2 }); a = -1; } } }
  // where each line should end, by its share of the text (measured on voiced time, so pauses don't skew it)
  const W = guide && guide.length === texts.length ? guide.map(g => Math.max(0.05, g)) : texts.map(t => Math.max(1, weight(t.replace(/[*|]/g, '')))), total = W.reduce((a, b) => a + b, 0);
  const vc = new Float32Array(nF + 1); for (let i = 0; i < nF; i++) vc[i + 1] = vc[i] + (voiced[i] ? 1 : 0);
  const atVoiced = v => { let lo = 0, hi = nF; while (lo < hi) { const m = (lo + hi) >> 1; if (vc[m] < v) lo = m + 1; else hi = m; } return lo; };
  const N = texts.length, exp = []; let acc = 0; for (let i = 0; i < N - 1; i++) { acc += W[i]; exp.push(atVoiced(vc[nF] * acc / total)); }
  const ends = texts.map(t => /[।?!.]\s*$/.test(t.replace(/[*|\s]+$/g, '')) ? 1 : 0);
  let cuts;
  if (N > 1 && sils.length >= N - 1) {
    const M = sils.length, cost = (i, j) => { const len = Math.min(sils[j].b - sils[j].a, 60) / 100; return Math.abs(sils[j].c - exp[i]) / 100 - len * (1.5 + 1.5 * ends[i]) + (ends[i] && len < 0.15 ? 1 : 0); };   // a sentence ends in a real pause
    const dp = Array.from({ length: N - 1 }, () => new Float64Array(M).fill(Infinity)), bk = Array.from({ length: N - 1 }, () => new Int32Array(M).fill(-1));
    for (let j = 0; j < M; j++) dp[0][j] = cost(0, j);
    for (let i = 1; i < N - 1; i++) { let best = Infinity, bj = -1; for (let j = 0; j < M; j++) { if (j > 0 && dp[i - 1][j - 1] < best) { best = dp[i - 1][j - 1]; bj = j - 1; } if (bj >= 0) { dp[i][j] = best + cost(i, j); bk[i][j] = bj; } } }
    let j = 0; for (let k = 1; k < M; k++) if (dp[N - 2][k] < dp[N - 2][j]) j = k;
    cuts = new Array(N - 1); for (let i = N - 2; i >= 0; i--) { cuts[i] = sils[j].c; j = bk[i][j]; }
  } else cuts = exp;
  // the line pieces: each runs from the middle of one pause to the middle of the next (so they join seamlessly)
  const edges = [0, ...cuts.map(c => Math.round(c * hop)), s.length];
  return texts.map((t, k) => {
    const a = edges[k], b = edges[k + 1], piece = s.slice(a, b), fa = Math.floor(a / hop), fb = Math.floor(b / hop);
    // word times: spread the words over the voiced frames of this piece, by their length
    const ws = t.replace(/\*/g, '').replace(/\s*\|+\s*/g, ' ').split(/\s+/).filter(Boolean), wt = ws.map(weight), WT = wt.reduce((x, y) => x + y, 0);
    const vfr = []; for (let i = fa; i < fb; i++) if (voiced[i]) vfr.push(i);
    let accw = 0;
    const words = ws.map((w, i) => { const i0 = vfr[Math.min(vfr.length - 1, Math.floor(vfr.length * accw / WT))] ?? fa, i1 = vfr[Math.min(vfr.length - 1, Math.floor(vfr.length * (accw + wt[i]) / WT) - 1)] ?? fa; accw += wt[i]; return { w, t: (i0 - fa) * 0.01, d: Math.max(0.05, (i1 - i0 + 1) * 0.01) }; });
    return { wav: writeWav(piece, rate), words, phrases: [t] };
  });
}
