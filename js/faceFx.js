// Dizzy and Lovestruck: little pictures that follow your head.
// `f` is the face box { cx, cy, w, h } in the pixels of whatever picture ctx is set up for (already mirrored).
// `t` is time in seconds, which drives the movement.

function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, k = i % 2 ? r * .45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
}
function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * .38);
  ctx.bezierCurveTo(x - s * 1.05, y - s * .2, x - s * .55, y - s * 1., x, y - s * .42);
  ctx.bezierCurveTo(x + s * .55, y - s * 1., x + s * 1.05, y - s * .2, x, y + s * .38);
  ctx.closePath();
}

export function drawFaceFX(ctx, kind, f, t) {
  ctx.save(); ctx.lineJoin = 'round';
  if (kind === 'dizzy') {
    const N = 5, cy0 = f.cy - f.h * .62 + Math.sin(t * 4) * f.h * .02, rx = f.w * .78, ry = f.h * .17;
    const items = Array.from({ length: N }, (_, i) => { const a = t * 2.6 + i * Math.PI * 2 / N; return { a, d: Math.sin(a) }; }).sort((p, q) => p.d - q.d);
    for (const { a, d } of items) {                       // back stars first, front stars last
      const r = f.w * (.11 + .04 * d);
      ctx.globalAlpha = .82 + .18 * d;
      star(ctx, f.cx + Math.cos(a) * rx, cy0 + d * ry, r, t * 3 + a);
      ctx.fillStyle = '#FFD43B'; ctx.strokeStyle = '#E8891A'; ctx.lineWidth = r * .2; ctx.stroke(); ctx.fill();
    }
  } else {
    const M = 10;
    for (let i = 0; i < M; i++) {
      const seed = (i * .6180339) % 1, p = (t * .28 + i / M) % 1, side = i % 2 ? 1 : -1;
      const x = f.cx + side * f.w * (.25 + .55 * seed) + Math.sin(p * 7 + i * 2) * f.w * .08;
      const y = f.cy - f.h * .1 - p * f.h * 1.15;
      const s = f.w * (.09 + .09 * ((seed * 7) % 1)) * (.55 + .45 * Math.sin(Math.PI * p));
      ctx.globalAlpha = Math.min(1, Math.sin(Math.PI * p) * 1.6);
      heart(ctx, x, y, s);
      ctx.fillStyle = i % 2 ? '#FF4D7E' : '#FF8FB1'; ctx.strokeStyle = '#C2185B'; ctx.lineWidth = s * .12; ctx.stroke(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - s * .42, y - s * .32, s * .16, s * .09, -.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Where to draw when no face has been found yet (used for the small preview in the Effects panel).
export const defaultFace = (vw, vh) => ({ cx: vw / 2, cy: vh * .58, w: vh * .3, h: vh * .38 });
