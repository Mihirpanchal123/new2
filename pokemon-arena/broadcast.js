'use strict';
// =====================================================================
//  BROADCAST — the channel name shown on title cards, and the battle's
//  thumbnail: Retro captures the best moment (a Mega Evolution, a big KO)
//  and the end screen turns it into a titled image
// =====================================================================
const Broadcast = (() => {
  const opts = { channel: '' };
  let thumb = null;
  // keep the frame of the biggest moment so far
  async function captureThumb(score, headline) {
    if (thumb && thumb.score >= score) return;
    const frame = await World.captureFrame();
    thumb = { score, frame, headline };
  }
  async function thumbnailURL(names) {
    if (!thumb) return null;
    const img = thumb.frame;
    const tall = img.height > img.width;
    const W = tall ? 720 : 1280, H = tall ? 1280 : 720;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const s = Math.max(W / img.width, H / img.height);
    g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    const grd = g.createLinearGradient(0, H * 0.45, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.8)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.lineJoin = 'round';
    const big = (txt, y, size, fill) => { g.font = `900 ${size}px Segoe UI, Arial Black, sans-serif`; g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.strokeText(txt, W / 2, y); g.fillStyle = fill; g.fillText(txt, W / 2, y); };
    big(thumb.headline, H - (tall ? 260 : 150), tall ? 78 : 96, '#facc15');
    big(`${names[0]} vs ${names[1]}`, H - (tall ? 160 : 60), tall ? 52 : 56, '#ffffff');
    if (opts.channel) { g.font = '700 28px Segoe UI, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'left'; g.fillText(opts.channel, 30, 50); }
    return c.toDataURL('image/png');
  }
  return { opts, captureThumb, thumbnailURL, resetBattle() { thumb = null; } };
})();
