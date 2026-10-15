// Live effects drawn with WebGL. One effect is active at a time; `amt` (0..1) is its strength.
export const EFFECTS = [
  { k: 'normal', n: 'Normal', id: 0 },
  { k: 'bw', n: 'Black & White', id: 1 }, { k: 'sepia', n: 'Sepia', id: 2 }, { k: 'vintage', n: 'Vintage', id: 3 },
  { k: 'postcard', n: 'Postcard', id: 4 }, { k: 'vignette', n: 'Vignette', id: 5 }, { k: 'glow', n: 'Glow', id: 6 },
  { k: 'plastic', n: 'Plastic Camera', id: 7 }, { k: 'pop', n: 'Pop Art', id: 8 },
  { k: 'comic', n: 'Comic Book', id: 9 }, { k: 'pencil', n: 'Color Pencil', id: 10 }, { k: 'thermal', n: 'Thermal Camera', id: 11 }, { k: 'xray', n: 'X-Ray', id: 12 },
  { k: 'bulge', n: 'Bulge', id: 20 }, { k: 'dent', n: 'Dent', id: 21 }, { k: 'twirl', n: 'Twirl', id: 22 }, { k: 'squeeze', n: 'Squeeze', id: 23 },
  { k: 'mirror', n: 'Mirror', id: 24 }, { k: 'tunnel', n: 'Light Tunnel', id: 25 }, { k: 'fisheye', n: 'Fish Eye', id: 26 }, { k: 'stretch', n: 'Stretch', id: 27 },
  { k: 'dizzy', n: 'Dizzy', id: 0, face: 'dizzy' }, { k: 'lovestruck', n: 'Lovestruck', id: 0, face: 'love' }
];
// Each page is a 3x3 grid, with Normal near the middle like Mac Photo Booth.
export const PAGES = [
  { name: 'Filters', keys: ['bw', 'sepia', 'vintage', 'postcard', 'normal', 'vignette', 'glow', 'plastic', 'pop'] },
  { name: 'Special', keys: ['comic', 'pencil', 'normal', 'thermal', 'xray'] },
  { name: 'Distortions', keys: ['bulge', 'dent', 'twirl', 'squeeze', 'normal', 'mirror', 'tunnel', 'fisheye', 'stretch'] },
  { name: 'Face', keys: ['dizzy', 'normal', 'lovestruck'] }
];

const VS = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uAmt;
uniform float uMir;
uniform int uFx;

vec3 T(vec2 p){ return texture2D(uTex, p).rgb; }
float L(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
vec3 sep(vec3 c){
  return clamp(vec3(dot(c, vec3(.393, .769, .189)), dot(c, vec3(.349, .686, .168)), dot(c, vec3(.272, .534, .131))), 0., 1.);
}
float edge(vec2 uv, vec2 px){
  float tl = L(T(uv + vec2(-px.x, -px.y))), t = L(T(uv + vec2(0., -px.y))), tr = L(T(uv + vec2(px.x, -px.y)));
  float l = L(T(uv + vec2(-px.x, 0.))), r = L(T(uv + vec2(px.x, 0.)));
  float bl = L(T(uv + vec2(-px.x, px.y))), b = L(T(uv + vec2(0., px.y))), br = L(T(uv + vec2(px.x, px.y)));
  float gx = -tl - 2. * l - bl + tr + 2. * r + br;
  float gy = -tl - 2. * t - tr + bl + 2. * b + br;
  return length(vec2(gx, gy));
}
vec3 heat(float t){
  vec3 c = mix(vec3(0., 0., .35), vec3(.45, 0., .65), smoothstep(0., .25, t));
  c = mix(c, vec3(1., 0., .2), smoothstep(.25, .5, t));
  c = mix(c, vec3(1., .85, 0.), smoothstep(.5, .75, t));
  return mix(c, vec3(1.), smoothstep(.75, 1., t));
}
void main(){
  float asp = uRes.x / uRes.y;
  float a = uAmt;
  vec2 uv = vUv;
  if (uMir > .5) uv.x = 1. - uv.x;
  vec2 c = uv - .5;
  vec2 p = vec2(c.x * asp, c.y);
  float r = length(p);

  // ---- distortions: move where we read the picture from ----
  if (uFx == 20) { float rn = r / .5; if (rn < 1.) c *= 1. - a * .7 * (1. - rn * rn); }
  else if (uFx == 21) { float rn = r / .5; if (rn < 1.) c *= 1. + a * .9 * (1. - rn * rn); }
  else if (uFx == 22) {
    float rn = r / .5;
    if (rn < 1.) { float ang = a * 6. * (1. - rn) * (1. - rn); float s = sin(ang), co = cos(ang);
      p = vec2(co * p.x - s * p.y, s * p.x + co * p.y); c = vec2(p.x / asp, p.y); }
  }
  else if (uFx == 23) { float rn = r / .45; if (rn < 1.) { float k = 1. - rn * rn; c *= 1. + a * 2.2 * k * k; } }
  else if (uFx == 24) { if (a > .05 && c.x > 0.) c.x = -c.x; }
  else if (uFx == 25) { float ang = atan(p.y, p.x) / 6.2831853 + .5; float k = .05 + a * .35; c = vec2(ang - .5, fract(k / (r + .06)) - .5); }
  else if (uFx == 26) { float rn = r / .9; if (rn < 1.) c *= 1. - a * .6 * (1. - rn * rn); }
  else if (uFx == 27) { c.y *= 1. - a * .55 * (1. - smoothstep(0., .5, r)); }
  uv = c + .5;

  vec3 col = T(uv);
  vec2 px = 1. / uRes;

  // ---- filters: change the colors ----
  if (uFx == 1) { col = mix(col, vec3(L(col)), a); }
  else if (uFx == 2) { col = mix(col, sep(col), a); }
  else if (uFx == 3) { vec3 v = mix(col, sep(col), .6); v = (v - .5) * .88 + .5 + .05; v *= vec3(1.06, 1., .88); col = mix(col, clamp(v, 0., 1.), a); }
  else if (uFx == 4) { vec3 v = mix(vec3(L(col)), col, 1.5); v = (v - .5) * 1.12 + .5 + .03; v += vec3(.03, 0., -.03); col = mix(col, clamp(v, 0., 1.), a); }
  else if (uFx == 5) { col *= 1. - a * .85 * smoothstep(.28, .72, length(c)); }
  else if (uFx == 6) {
    vec3 b = vec3(0.);
    for (int i = 0; i < 12; i++) { float ang = float(i) * .5236; vec2 d = vec2(cos(ang), sin(ang)); b += T(uv + d * px * 5.) + T(uv + d * px * 11.); }
    b /= 24.; col = clamp(col + a * (max(b - .5, 0.) * 1.8 + b * .12), 0., 1.);
  }
  else if (uFx == 7) {
    vec3 v = mix(vec3(L(col)), col, .55); v = (v - .5) * 1.25 + .5; v *= vec3(.96, 1.05, 1.);
    float g = fract(sin(dot(uv * uRes, vec2(12.9898, 78.233))) * 43758.5453); v += (g - .5) * .12;
    v *= 1. - .7 * smoothstep(.25, .7, length(c)); col = mix(col, clamp(v, 0., 1.), a);
  }
  else if (uFx == 8) { float g = L(col); vec3 pal = g < .25 ? vec3(.12, .05, .35) : g < .5 ? vec3(.92, .12, .5) : g < .75 ? vec3(.1, .72, .92) : vec3(1., .9, .2); col = mix(col, pal, a); }
  else if (uFx == 9) { vec3 q = floor(col * 4. + .5) / 4.; q = mix(vec3(L(q)), q, 1.3); float e = smoothstep(.35, .9, edge(uv, px * 1.5)); col = mix(col, q * (1. - e), a); }
  else if (uFx == 10) {
    float e = edge(uv, px * 1.5); float s = clamp(1. - e * 1.6, 0., 1.); vec3 paper = vec3(.97, .95, .9);
    vec3 v = mix(paper * s, paper * s * (col * .5 + .5), .6); col = mix(col, clamp(v, 0., 1.), a);
  }
  else if (uFx == 11) { col = mix(col, heat(L(col)), a); }
  else if (uFx == 12) { float g = 1. - L(col); vec3 v = vec3(g * .72, g * .95, g); v = (v - .5) * 1.35 + .5; col = mix(col, clamp(v, 0., 1.), a); }

  gl_FragColor = vec4(col, 1.);
}`;

// Each effect gets its own small program (FX is a compile-time constant), so a frame only runs the
// code for the effect that is on. Programs are compiled the first time an effect is used.
const FS_SRC = FS.replace('uniform int uFx;', '').replace(/uFx ==/g, 'FX ==');

// Pass a canvas to draw straight onto it (the visible screen); with no argument it draws offscreen.
export function createFX(target) {
  const cv = target || document.createElement('canvas');
  const opts = { preserveDrawingBuffer: true, antialias: false, powerPreference: 'high-performance' };
  const gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  if (!gl) return null;
  try {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]
      .forEach(([k, val]) => gl.texParameteri(gl.TEXTURE_2D, k, val));
    const progs = {};
    const prog = id => {
      if (progs[id]) return progs[id];
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, '#define FX ' + id + '\n' + FS_SRC));
      gl.bindAttribLocation(pr, 0, 'aPos'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      const U = {}; ['uRes', 'uAmt', 'uMir', 'uTex'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
      return (progs[id] = { pr, U });
    };
    return {
      canvas: cv,
      warm: id => { prog(id); },
      render(src, fxId, amt, mirror, w, h) {
        const { pr, U } = prog(fxId);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        gl.viewport(0, 0, w, h); gl.useProgram(pr);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uAmt, amt); gl.uniform1f(U.uMir, mirror ? 1 : 0); gl.uniform1i(U.uTex, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  } catch (e) { console.error('Effects unavailable:', e); return null; }
}
