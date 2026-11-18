// Voice audition: the same Hindi line by every Bulbul v3 speaker, to choose the voices for make.mjs (VOICES).
// Writes videos/psych-reels/voice-audition/<speaker>.wav and prints each voice's average pitch (Hz).
// Usage: node audition.mjs [--speakers=varun,shubh] [--text="..."]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sarvamKey, voiceLine, readWav } from './voice.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'videos/psych-reels/voice-audition');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
const MALE = ['varun', 'shubh', 'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham'];
const FEMALE = ['ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali'];
const speakers = arg('speakers', '') ? arg('speakers').split(',') : [...MALE, ...FEMALE];
const text = arg('text', 'बीस साल... | एक ही अंधेरी कोठरी। || हर सुबह वो उस छोटी-सी खिड़की से बाहर देखता, | और आज़ादी के सपने बुनता।');
const key = sarvamKey(ROOT); if (!key) { console.log('no Sarvam key'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
// average pitch by autocorrelation over voiced 40 ms frames
function pitch(s, rate) {
  const f0s = [], N = Math.round(rate * 0.04);
  for (let i = 0; i + N * 2 < s.length; i += N) {
    let e = 0; for (let k = 0; k < N; k++) e += s[i + k] * s[i + k]; if (e / N < 0.002) continue;
    let best = 0, lag = 0; for (let L = Math.round(rate / 400); L <= Math.round(rate / 60); L++) { let c = 0; for (let k = 0; k < N; k++) c += s[i + k] * s[i + k + L]; if (c > best) { best = c; lag = L; } }
    if (lag && best / e > 0.5) f0s.push(rate / lag);
  }
  f0s.sort((a, b) => a - b); return f0s.length ? Math.round(f0s[f0s.length >> 1]) : 0;
}
const rows = [];
for (const sp of speakers) {
  try {
    const r = await voiceLine(key, text, { speaker: sp, pace: 1, temperature: 0.5 }, path.join(ROOT, 'videos/psych-reels/vo/phrases'));
    fs.writeFileSync(path.join(OUT, sp + '.wav'), r.wav);
    const { rate, s } = readWav(r.wav);
    rows.push({ sp, hz: pitch(s, rate), secs: (s.length / rate).toFixed(1), g: MALE.includes(sp) ? 'M' : 'F' });
    console.log(`${sp.padEnd(10)} ${rows.at(-1).g}  pitch ${String(rows.at(-1).hz).padStart(3)} Hz  ${rows.at(-1).secs} s`);
  } catch (e) { console.log(`${sp.padEnd(10)} ERROR ${e.message}`); }
}
