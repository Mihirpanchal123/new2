// Turns a fragmented MP4 (what the browser's MediaRecorder writes: an empty index, then moof/mdat fragments, no
// duration) into an ordinary MP4 that every player can seek in and every app accepts: one moov with the real
// duration and full sample tables (timing, sizes, keyframes, offsets), placed before the media data ("fast start").
// The video and audio data are copied as they are - nothing is re-encoded.
// Usage: node tools/remux-mp4.mjs <in.mp4> [out.mp4]      (no out: the file is replaced)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- reading boxes
function boxes(b, start = 0, end = b.length) {
  const out = [];
  for (let o = start; o + 8 <= end;) {
    let size = b.readUInt32BE(o), head = 8;
    const type = b.toString('latin1', o + 4, o + 8);
    if (size === 1) { size = Number(b.readBigUInt64BE(o + 8)); head = 16; }
    else if (size === 0) size = end - o;
    if (size < head || o + size > end) break;
    out.push({ type, start: o, end: o + size, body: o + head });
    o += size;
  }
  return out;
}
const kid = (b, box, type) => boxes(b, box.body, box.end).find(x => x.type === type);
const kids = (b, box, type) => boxes(b, box.body, box.end).filter(x => x.type === type);
const raw = (b, box) => b.subarray(box.start, box.end);

// ---- writing boxes
const u8 = v => Buffer.from([v]);
const u16 = v => { const x = Buffer.alloc(2); x.writeUInt16BE(v); return x; };
const u32 = v => { const x = Buffer.alloc(4); x.writeUInt32BE(v >>> 0); return x; };
const i32 = v => { const x = Buffer.alloc(4); x.writeInt32BE(v); return x; };
const u64 = v => { const x = Buffer.alloc(8); x.writeBigUInt64BE(BigInt(v)); return x; };
function box(type, ...parts) { const body = Buffer.concat(parts.flat()); return Buffer.concat([u32(body.length + 8), Buffer.from(type, 'latin1'), body]); }
const full = (type, version, flags, ...parts) => box(type, u8(version), Buffer.from([(flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
const MATRIX = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].map(u32);

export function remux(src) {
  const b = src;
  const top = boxes(b);
  const moov = top.find(x => x.type === 'moov');
  if (!moov) throw new Error('no moov box: not an MP4');
  if (!top.some(x => x.type === 'moof')) return null;               // already an ordinary MP4

  // ---- the tracks, from the (empty) index
  const trex = {};
  const mvex = kid(b, moov, 'mvex');
  if (mvex) for (const t of kids(b, mvex, 'trex')) { const p = t.body + 4; trex[b.readUInt32BE(p)] = { dur: b.readUInt32BE(p + 8), size: b.readUInt32BE(p + 12), flags: b.readUInt32BE(p + 16) }; }
  const tracks = kids(b, moov, 'trak').map(trak => {
    const tkhd = kid(b, trak, 'tkhd'), v = b[tkhd.body];
    const id = b.readUInt32BE(tkhd.body + (v ? 4 + 16 : 4 + 8));
    const mdia = kid(b, trak, 'mdia'), mdhd = kid(b, mdia, 'mdhd'), mv = b[mdhd.body];
    const timescale = b.readUInt32BE(mdhd.body + (mv ? 4 + 16 : 4 + 8));
    const lang = b.readUInt16BE(mdhd.body + (mv ? 4 + 28 : 4 + 16));
    const hdlr = kid(b, mdia, 'hdlr'), handler = b.toString('latin1', hdlr.body + 8, hdlr.body + 12);
    const minf = kid(b, mdia, 'minf'), stbl = kid(b, minf, 'stbl');
    return { id, timescale, lang, handler, width: b.readUInt32BE(tkhd.end - 8), height: b.readUInt32BE(tkhd.end - 4),
      hdlr: raw(b, hdlr), mhd: raw(b, kid(b, minf, handler === 'vide' ? 'vmhd' : 'smhd') || kid(b, minf, 'nmhd')), dinf: raw(b, kid(b, minf, 'dinf')), stsd: raw(b, kid(b, stbl, 'stsd')),
      samples: [], first: null };
  });
  const byId = Object.fromEntries(tracks.map(t => [t.id, t]));

  // ---- every sample, fragment by fragment
  for (const moof of top.filter(x => x.type === 'moof')) {
    for (const traf of kids(b, moof, 'traf')) {
      const tfhd = kid(b, traf, 'tfhd'), tf = b.readUInt32BE(tfhd.body) & 0xffffff;
      let p = tfhd.body + 4;
      const t = byId[b.readUInt32BE(p)]; p += 4;
      if (!t) continue;
      const d = trex[t.id] || { dur: 0, size: 0, flags: 0 };
      let base = moof.start;
      if (tf & 0x1) { base = Number(b.readBigUInt64BE(p)); p += 8; }
      if (tf & 0x2) p += 4;
      const defDur = tf & 0x8 ? b.readUInt32BE((p += 4) - 4) : d.dur;
      const defSize = tf & 0x10 ? b.readUInt32BE((p += 4) - 4) : d.size;
      const defFlags = tf & 0x20 ? b.readUInt32BE((p += 4) - 4) : d.flags;
      const tfdt = kid(b, traf, 'tfdt');
      let dts = tfdt ? (b[tfdt.body] ? Number(b.readBigUInt64BE(tfdt.body + 4)) : b.readUInt32BE(tfdt.body + 4)) : null;
      if (dts == null) { const last = t.samples[t.samples.length - 1]; dts = last ? last.dts + last.dur : 0; }
      if (t.first == null) t.first = dts;
      let pos = base;
      for (const trun of kids(b, traf, 'trun')) {
        const ver = b[trun.body], rf = b.readUInt32BE(trun.body) & 0xffffff;
        let q = trun.body + 4;
        const n = b.readUInt32BE(q); q += 4;
        if (rf & 0x1) { pos = base + b.readInt32BE(q); q += 4; }
        let firstFlags = null;
        if (rf & 0x4) { firstFlags = b.readUInt32BE(q); q += 4; }
        for (let i = 0; i < n; i++) {
          const dur = rf & 0x100 ? b.readUInt32BE((q += 4) - 4) : defDur;
          const size = rf & 0x200 ? b.readUInt32BE((q += 4) - 4) : defSize;
          let flags = rf & 0x400 ? b.readUInt32BE((q += 4) - 4) : defFlags;
          if (i === 0 && firstFlags != null && !(rf & 0x400)) flags = firstFlags;
          const cto = rf & 0x800 ? (ver ? b.readInt32BE((q += 4) - 4) : b.readUInt32BE((q += 4) - 4)) : 0;
          t.samples.push({ off: pos, size, dur, dts, cto, key: !(flags & 0x10000) });
          pos += size; dts += dur;
        }
      }
    }
  }
  for (const t of tracks) if (!t.samples.length) throw new Error(`track ${t.id} has no samples`);
  // each fragment's start time (tfdt) is when it was really recorded; the durations inside a fragment can add up to a
  // little more or less. Stretch the last sample before each fragment to meet it, so nothing drifts off the clock
  for (const t of tracks) { const S = t.samples; for (let i = 0; i < S.length - 1; i++) { const d = S[i + 1].dts - S[i].dts; if (d > 0) S[i].dur = d; } }

  // ---- the media data: the samples in the order they were recorded (audio and video stay interleaved)
  const all = tracks.flatMap(t => t.samples.map(s => ({ s, t }))).sort((a, c) => a.s.off - c.s.off);
  let mdatSize = 0;
  for (const { s } of all) { s.rel = mdatSize; mdatSize += s.size; }
  const big = mdatSize + 8 > 0xffffffff - 1e6;

  // ---- the index (built twice: the second time with the real chunk offsets, once the index's own size is known)
  const MOVIE_TS = 1000;
  const start = Math.min(...tracks.map(t => t.first / t.timescale));          // the earliest track starts the movie
  function trak(t, mdatAt) {
    const S = t.samples, dur = S.reduce((a, s) => a + s.dur, 0), lead = t.first / t.timescale - start;
    const movieDur = Math.round((dur / t.timescale + lead) * MOVIE_TS);
    // stts: runs of equal durations; ctts: composition offsets (only if any); stss: keyframes (video only)
    const stts = []; for (const s of S) { const l = stts[stts.length - 1]; if (l && l[1] === s.dur) l[0]++; else stts.push([1, s.dur]); }
    const anyCto = S.some(s => s.cto), negCto = S.some(s => s.cto < 0);
    const ctts = []; if (anyCto) for (const s of S) { const l = ctts[ctts.length - 1]; if (l && l[1] === s.cto) l[0]++; else ctts.push([1, s.cto]); }
    const allKey = S.every(s => s.key), keys = allKey ? null : S.map((s, i) => s.key ? i + 1 : 0).filter(Boolean);
    // one sample per chunk keeps the tables simple and lets audio and video interleave exactly as recorded
    const stbl = box('stbl', t.stsd,
      full('stts', 0, 0, u32(stts.length), stts.map(([c, d]) => [u32(c), u32(d)]).flat()),
      anyCto ? full('ctts', negCto ? 1 : 0, 0, u32(ctts.length), ctts.map(([c, o]) => [u32(c), negCto ? i32(o) : u32(o)]).flat()) : [],
      keys ? full('stss', 0, 0, u32(keys.length), keys.map(u32)) : [],
      full('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1)),
      full('stsz', 0, 0, u32(0), u32(S.length), S.map(s => u32(s.size))),
      big ? full('co64', 0, 0, u32(S.length), S.map(s => u64(mdatAt + s.rel))) : full('stco', 0, 0, u32(S.length), S.map(s => u32(mdatAt + s.rel))));
    // an edit list: a track that started after the movie did waits; its first frame shows from its composition time
    const elst = [];
    if (lead > 0.0005) elst.push([u32(Math.round(lead * MOVIE_TS)), i32(-1), u32(0x10000)]);
    elst.push([u32(Math.round(dur / t.timescale * MOVIE_TS)), i32(Math.max(0, S[0].cto)), u32(0x10000)]);
    const vid = t.handler === 'vide';
    return box('trak',
      full('tkhd', 0, 3, u32(0), u32(0), u32(t.id), u32(0), u32(movieDur), u32(0), u32(0), u16(0), u16(vid ? 0 : 1), u16(vid ? 0 : 0x100), u16(0), MATRIX, u32(t.width), u32(t.height)),
      box('edts', full('elst', 0, 0, u32(elst.length), elst.flat())),
      box('mdia',
        full('mdhd', 0, 0, u32(0), u32(0), u32(t.timescale), u32(dur), u16(t.lang), u16(0)),
        t.hdlr,
        box('minf', t.mhd, t.dinf, stbl)));
  }
  const ftyp = box('ftyp', Buffer.from('isom', 'latin1'), u32(0x200), Buffer.from('isomiso2avc1mp41', 'latin1'));
  const movieDur = Math.max(...tracks.map(t => Math.round((t.samples.reduce((a, s) => a + s.dur, 0) / t.timescale + t.first / t.timescale - start) * MOVIE_TS)));
  const moovBox = at => box('moov',
    full('mvhd', 0, 0, u32(0), u32(0), u32(MOVIE_TS), u32(movieDur), u32(0x10000), u16(0x100), Buffer.alloc(10), MATRIX, Buffer.alloc(24), u32(Math.max(...tracks.map(t => t.id)) + 1)),
    tracks.map(t => trak(t, at)));
  const head = ftyp.length + moovBox(0).length + (big ? 16 : 8);
  const moovOut = moovBox(head);
  const mdatHead = big ? Buffer.concat([u32(1), Buffer.from('mdat', 'latin1'), u64(mdatSize + 16)]) : Buffer.concat([u32(mdatSize + 8), Buffer.from('mdat', 'latin1')]);
  const out = Buffer.allocUnsafe(ftyp.length + moovOut.length + mdatHead.length + mdatSize);
  let o = 0;
  for (const part of [ftyp, moovOut, mdatHead]) { part.copy(out, o); o += part.length; }
  for (const { s } of all) { b.copy(out, o, s.off, s.off + s.size); o += s.size; }
  return { buf: out, seconds: movieDur / MOVIE_TS, tracks: tracks.map(t => ({ kind: t.handler, samples: t.samples.length, keyframes: t.samples.filter(s => s.key).length, seconds: t.samples.reduce((a, s) => a + s.dur, 0) / t.timescale })) };
}

// ---- as a command
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [inp, outp] = process.argv.slice(2);
  if (!inp) { console.log('Usage: node tools/remux-mp4.mjs <in.mp4> [out.mp4]'); process.exit(2); }
  const r = remux(fs.readFileSync(inp));
  if (!r) { console.log(`${inp} is already an ordinary MP4`); process.exit(0); }
  fs.writeFileSync(outp || inp, r.buf);
  console.log(`${outp || inp}: ${r.seconds.toFixed(2)} s · ${r.tracks.map(t => `${t.kind} ${t.samples} samples${t.kind === 'vide' ? ` (${t.keyframes} keyframes)` : ''}`).join(' · ')}`);
}
