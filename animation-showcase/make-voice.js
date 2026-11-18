// Generates the Hindi voice-over, one clip per subtitle line, using a
// Microsoft Edge online read-aloud voice, then trims leading/trailing silence.
// Output: vo/line_XX/audio.mp3, vo/line_XX/trim.wav, vo/durations.json
//
//   node make-voice.js          -> all lines
//   node make-voice.js 5        -> only line 5 (for testing)
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const ffmpeg = require('ffmpeg-static');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Voices tried so far: hi-IN-MadhurNeural (rate +10%, pitch -6Hz), hi-IN-SwaraNeural,
// en-US-BrianMultilingualNeural (chosen), en-AU-WilliamMultilingualNeural.
//   node make-voice.js dholavira madhur    -> Dholavira project, Madhur voice
//   node make-voice.js dholavira madhur 5  -> only line 5
const VOICES = { brian: ['en-US-BrianMultilingualNeural', { rate: '+5%' }], madhur: ['hi-IN-MadhurNeural', { rate: '+10%', pitch: '-6Hz' }] };
// say: how numbers are spoken (the subtitles keep the digits)
const PROJECTS = {
  taj: { timing: 'timing.json', out: 'vo', voice: 'brian', say: {} },
  dholavira: { timing: 'dholavira-timing.json', out: 'vo-dholavira', voice: 'madhur', say: { '5,000': 'पाँच हज़ार', '1,500': 'पंद्रह सौ' } },
  'dholavira-yt': { timing: 'dholavira-yt-timing.json', out: 'vo-dholavira-yt', voice: 'madhur', prosody: { rate: '+4%', pitch: '-6Hz' },
    say: { '5,000': 'पाँच हज़ार', '1,500': 'पंद्रह सौ', '3000': 'तीन हज़ार', '1500': 'पंद्रह सौ', '1968': 'उन्नीस सौ अड़सठ', '1989': 'उन्नीस सौ नवासी', '2005': 'दो हज़ार पाँच', '2021': 'दो हज़ार इक्कीस', 'आर. एस.': 'आर एस' } },
};
const args = process.argv.slice(2);
const PRJ = PROJECTS[args.find(a => PROJECTS[a]) || 'taj'];
const vArg = args.find(a => VOICES[a]);
const [VOICE, PROSODY] = vArg || !PRJ.prosody ? VOICES[vArg || PRJ.voice] : [VOICES[PRJ.voice][0], PRJ.prosody];
const lineArg = args.find(a => /^\d+$/.test(a));
const lines = JSON.parse(fs.readFileSync(path.join(__dirname, PRJ.timing), 'utf8')).lines;
const only = lineArg !== undefined ? [Number(lineArg)] : lines.map((_, i) => i);
const spoken = t => Object.entries(PRJ.say).reduce((a, [k, v]) => a.split(k).join(v), t);

function duration(file) {
  let err = '';
  try { execFileSync(ffmpeg, ['-i', file], { stdio: 'pipe' }); } catch (e) { err = e.stderr.toString(); }
  const m = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : null;
}
const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse';

(async () => {
  const fmt = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;
  const out = [];
  for (const i of only) {
    const dir = path.join(__dirname, PRJ.out, `line_${String(i).padStart(2, '0')}`);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    let file;
    for (let attempt = 1; attempt <= 5 && !file; attempt++) {
      try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(VOICE, fmt);
        ({ audioFilePath: file } = await tts.toFile(dir, spoken(lines[i].txt), PROSODY));
        tts.close();
      } catch (e) { file = undefined; console.error(`line ${i} attempt ${attempt} failed:`, String(e.message || e).slice(0, 80)); await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!file) throw new Error(`could not synthesise line ${i}`);
    const wav = path.join(dir, 'trim.wav');
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', file, '-af', TRIM, '-ar', '48000', '-ac', '1', wav]);
    const dur = duration(file), trim = duration(wav);
    const words = lines[i].txt.replace(/—/g, ' ').split(/\s+/).filter(Boolean).length, wps = words / trim;
    out.push({ i, txt: lines[i].txt, file: path.relative(__dirname, file).replace(/\\/g, '/'), wav: path.relative(__dirname, wav).replace(/\\/g, '/'), dur, trim, wps });
    console.log(String(i).padStart(2), `${trim.toFixed(2)}s`, `${wps.toFixed(2)} w/s`, words > 2 && (wps > 4.2 || wps < 1.6) ? '<-- CHECK (possible skipped words)' : '', lines[i].txt.slice(0, 36));
  }
  if (only.length === lines.length) {
    fs.writeFileSync(path.join(__dirname, PRJ.out, 'durations.json'), JSON.stringify(out, null, 2), 'utf8');
    console.log('voice:', VOICE, ' total speech:', out.reduce((a, b) => a + b.trim, 0).toFixed(1) + 's');
  }
})();
