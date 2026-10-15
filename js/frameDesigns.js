// Frame designs, and the code that builds the finished sheet (your photos + a design + your own text).
import { FRAMES } from './frames.js';

const rng = a => () => { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };   // seeded, so a design always looks the same

export const DESIGNS = [
  { k: 'classic',  n: 'Classic',  bg: '#FAF9F5', ink: '#1F1E1D', hole: '#F0EEE6', filmBg: '#1B1A18', filmInk: '#F0EEE6' },   // dark film on strips, ivory paper otherwise
  { k: 'midnight', n: 'Midnight', bg: '#23211F', ink: '#F0EEE6', hole: '#F0EEE6', pattern: 'stars',   pc: 'rgba(255,236,170,.6)' },
  { k: 'clay',     n: 'Clay',     bg: '#B85636', ink: '#FAF9F5', hole: '#FAF9F5', pattern: 'dots',    pc: 'rgba(255,255,255,.17)' },
  { k: 'kraft',    n: 'Kraft',    bg: '#E3DACC', ink: '#3B3328', hole: '#FAF9F5', pattern: 'grid',    pc: 'rgba(59,51,40,.13)' },
  { k: 'blush',    n: 'Blush',    bg: '#F6D3D8', ink: '#8A2F4A', hole: '#FFF6F7', pattern: 'hearts',  pc: 'rgba(200,70,110,.24)' },
  { k: 'mint',     n: 'Mint',     bg: '#CFE5D6', ink: '#25513A', hole: '#F4FBF6', pattern: 'stripes', pc: 'rgba(255,255,255,.5)' },
  { k: 'sky',      n: 'Sky',      bg: '#CFE0F2', ink: '#1F4568', hole: '#F4F9FE', pattern: 'checks',  pc: 'rgba(255,255,255,.55)' },
  { k: 'sunset',   n: 'Sunset',   bg: ['#F6C177', '#E07F5B', '#B04A6A'], ink: '#FFF8EE', hole: '#FFF8EE' },
  { k: 'confetti', n: 'Confetti', bg: '#FAF9F5', ink: '#1F1E1D', hole: '#E3DACC', pattern: 'confetti' }
];

function heart(x, cx, cy, s) {
  x.beginPath(); x.moveTo(cx, cy + s * .38);
  x.bezierCurveTo(cx - s * 1.05, cy - s * .2, cx - s * .55, cy - s, cx, cy - s * .42);
  x.bezierCurveTo(cx + s * .55, cy - s, cx + s * 1.05, cy - s * .2, cx, cy + s * .38); x.fill();
}
function pattern(x, W, H, d) {
  const p = d.pattern; if (!p) return;
  x.save(); x.fillStyle = x.strokeStyle = d.pc;
  if (p === 'dots') { for (let r = 0, y = 22; y < H + 20; y += 38, r++) for (let xx = r % 2 ? 41 : 22; xx < W + 20; xx += 38) { x.beginPath(); x.arc(xx, y, 5, 0, 6.3); x.fill(); } }
  else if (p === 'stars') {
    const R = rng(7);
    for (let i = 0, n = W * H / 4200; i < n; i++) {
      const px = R() * W, py = R() * H, s = 1 + R() * 2.4; x.globalAlpha = .35 + R() * .65;
      x.beginPath(); x.arc(px, py, s, 0, 6.3); x.fill();
      if (R() < .12) { x.fillRect(px - s * 3, py - .6, s * 6, 1.2); x.fillRect(px - .6, py - s * 3, 1.2, s * 6); }
    }
  }
  else if (p === 'hearts') { for (let r = 0, y = 30; y < H + 30; y += 52, r++) for (let xx = r % 2 ? 56 : 30; xx < W + 30; xx += 52) heart(x, xx, y, 10); }
  else if (p === 'stripes') { for (let xx = 0; xx < W; xx += 52) x.fillRect(xx, 0, 26, H); }
  else if (p === 'checks') { const s = 44; for (let j = 0; j * s < H; j++) for (let i = 0; i * s < W; i++) if ((i + j) % 2 === 0) x.fillRect(i * s, j * s, s, s); }
  else if (p === 'grid') { x.lineWidth = 1.5; for (let xx = 0; xx < W; xx += 40) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); } for (let y = 0; y < H; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } }
  else if (p === 'confetti') {
    const R = rng(11), cols = ['#D97757', '#E9B949', '#6FA287', '#E58FA3', '#6E95C4'];
    for (let i = 0, n = W * H / 6500; i < n; i++) { x.save(); x.translate(R() * W, R() * H); x.rotate(R() * 6.3); x.fillStyle = cols[i % cols.length]; x.fillRect(-6, -3, 6 + R() * 7, 3 + R() * 3); x.restore(); }
  }
  x.restore();
}
function paint(x, W, H, d, film) {
  if (Array.isArray(d.bg)) { const g = x.createLinearGradient(0, 0, W, H); d.bg.forEach((c, i) => g.addColorStop(i / (d.bg.length - 1), c)); x.fillStyle = g; }
  else x.fillStyle = film && d.filmBg ? d.filmBg : d.bg;
  x.fillRect(0, 0, W, H); pattern(x, W, H, d);
}
function rr(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); }

// A small picture of a design, for the design picker.
export function swatch(d) {
  const c = document.createElement('canvas'); c.width = 180; c.height = 240; const x = c.getContext('2d');
  paint(x, 180, 240, d, false);
  x.fillStyle = 'rgba(255,255,255,.88)'; x.fillRect(24, 22, 132, 78); x.fillRect(24, 112, 132, 78);
  x.fillStyle = 'rgba(31,30,29,.16)'; x.beginPath(); x.arc(90, 52, 14, 0, 6.3); x.arc(90, 160, 14, 0, 6.3); x.fill();
  x.fillStyle = d.ink; x.font = '600 18px Newsreader, Georgia, serif'; x.textAlign = 'center'; x.fillText('SYNC SHOT', 90, 222);
  return c;
}

// Builds the whole sheet as a canvas: design, photos, then your text (empty text = no text line).
export function composeStrip(shots, frame, d, text) {
  const F = FRAMES[frame], film = !!F.film, band = 48, gap = film ? 20 : 24, pad = film ? 20 : 40;
  const cap = (text || '').trim(), foot = cap ? 70 : 0, strip = film && F.cols === 1;
  let W, H, ox, oy;
  if (strip) { ox = band; oy = pad; W = band * 2 + F.sw; H = pad * 2 + F.rows * F.sh + (F.rows - 1) * gap + foot; }
  else if (film) { ox = pad; oy = band; W = pad * 2 + F.cols * F.sw + (F.cols - 1) * gap; H = band * 2 + F.sh + foot; }
  else { ox = pad; oy = pad; W = pad * 2 + F.cols * F.sw + (F.cols - 1) * gap; H = pad * 2 + F.rows * F.sh + (F.rows - 1) * gap + foot; }
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  paint(x, W, H, d, film);
  if (film) {                                       // sprocket holes
    x.fillStyle = d.hole;
    if (strip) for (let y = 16; y < H - 26; y += 44) { rr(x, 15, y, 18, 26, 5); x.fill(); rr(x, W - band + 15, y, 18, 26, 5); x.fill(); }
    else for (let px = 16; px < W - 26; px += 44) { rr(x, px, 15, 26, 18, 5); x.fill(); rr(x, px, oy + F.sh + 15, 26, 18, 5); x.fill(); }
  }
  shots.forEach((img, i) => x.drawImage(img, ox + (i % F.cols) * (F.sw + gap), oy + Math.floor(i / F.cols) * (F.sh + gap), F.sw, F.sh));
  if (cap) {
    const end = oy + F.rows * F.sh + (F.rows - 1) * gap, top = film && !strip ? end + band : end;
    const maxW = W - (strip ? band * 2 : pad * 2) - 20;
    let size = 30; x.font = `600 ${size}px Newsreader, Georgia, serif`;
    while (size > 14 && x.measureText(cap).width > maxW) { size--; x.font = `600 ${size}px Newsreader, Georgia, serif`; }
    let t = cap; if (x.measureText(t).width > maxW) { while (t.length > 1 && x.measureText(t + '…').width > maxW) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
    x.fillStyle = film && d.filmBg ? d.filmInk : d.ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(t, W / 2, top + (H - top) / 2);
  }
  return c;
}
