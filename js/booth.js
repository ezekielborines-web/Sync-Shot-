import { DB } from './db.js';
import { $, toast, sleep, user, header, requireConsent } from './common.js';
import { FRAMES } from './frames.js';
import { createFX, EFFECTS, PAGES } from './effects.js';
import { drawFaceFX, defaultFace } from './faceFx.js';
import { DESIGNS, composeStrip, swatch } from './frameDesigns.js';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- sound (generated in the browser, no audio files) ---------- */
let actx = null;
const soundOn = () => { try { return localStorage.getItem('ss_sound') !== '0'; } catch { return true; } };
function ac() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
  catch { return null; }
}
function tone(f, d = .08, type = 'sine', v = .15, delay = 0) {
  if (!soundOn()) return; const a = ac(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
const sfx = {
  tick: () => tone(880, .04, 'triangle', .08),
  beep: () => tone(660, .1, 'sine', .14),
  shutter: () => {
    if (!soundOn()) return; const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * .09), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = .35;
    s.connect(g).connect(a.destination); s.start(); tone(1800, .03, 'square', .05);
  },
  chime: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'sine', .12, i * .09))
};

/* ---------- confetti ---------- */
function confetti(el) {
  if (calm()) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const cols = ['#D97757', '#B85636', '#1F1E1D', '#E3DACC', '#FAF9F5', '#CC785C'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i'); p.className = 'cf';
    p.style.cssText = `left:${cx}px;top:${cy}px;background:${cols[i % cols.length]}`;
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, v = 140 + Math.random() * 260;
    p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 160}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }
    ], { duration: 1000 + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => p.remove();
  }
}

/* ---------- camera ---------- */
let stream = null, gestureOn = false, recognizer = null;
async function startCam(video) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: false });
    video.srcObject = stream; await video.play(); return true;
  } catch { return false; }
}
const stopCam = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; gestureOn = false; };
addEventListener('pagehide', stopCam);

/* ---------- palm detection ---------- */
let gestureLoop = 0;
async function loadGestures() {
  if (recognizer) return;
  const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const { FilesetResolver, GestureRecognizer } = await import(base + '/vision_bundle.mjs');
  const fs = await FilesetResolver.forVisionTasks(base + '/wasm');
  recognizer = await GestureRecognizer.createFromOptions(fs, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task' },
    runningMode: 'VIDEO', numHands: 1,
    minHandDetectionConfidence: .4, minHandPresenceConfidence: .4, minTrackingConfidence: .4
  });
}
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
// An open palm = the model says "Open_Palm", OR all four fingers and the thumb are clearly stretched out.
function isOpenPalm(res) {
  const g = res.gestures?.[0]?.[0];
  if (g && g.categoryName === 'Open_Palm' && g.score > .5) return true;
  const L = res.landmarks?.[0]; if (!L) return false;
  const fingers = [[6, 8], [10, 12], [14, 16], [18, 20]].every(([pip, tip]) => dist(L[0], L[tip]) > dist(L[0], L[pip]) * 1.15);
  const thumb = dist(L[4], L[17]) > dist(L[3], L[17]);
  return fingers && thumb;
}
// Hold an open palm for ~0.6 s to shoot. After a shot the hand must come down before it can fire again.
function runGestures(v, S, shoot, ui) {
  const id = ++gestureLoop; gestureOn = true;
  const HOLD = 600, REARM = 900;
  let since = 0, armed = true, lastSeen = 0, lastRun = 0;
  const step = () => {
    if (id !== gestureLoop || !gestureOn || !S.gesture) return;
    requestAnimationFrame(step);
    const now = performance.now();
    if (now - lastRun < 66) return; lastRun = now;
    if (S.busy || v.readyState < 2 || S.shots.length >= S.total) { since = 0; ui(0, 'busy'); return; }
    let res; try { res = recognizer.recognizeForVideo(v, now); } catch { return; }
    if (!isOpenPalm(res)) {
      since = 0; if (now - lastSeen > REARM) armed = true;
      ui(0, armed ? (res.landmarks?.length ? 'hand' : 'none') : 'lower'); return;
    }
    lastSeen = now;
    if (!armed) { ui(0, 'lower'); return; }
    if (!since) since = now;
    const p = Math.min(1, (now - since) / HOLD); ui(p, 'palm');
    if (p >= 1) { since = 0; armed = false; shoot(); }
  };
  requestAnimationFrame(step);
}

/* ---------- face finding (for Dizzy and Lovestruck) ---------- */
let faceDet = null;
async function loadFace() {
  if (faceDet) return;
  const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const { FilesetResolver, FaceDetector } = await import(base + '/vision_bundle.mjs');
  const fs = await FilesetResolver.forVisionTasks(base + '/wasm');
  faceDet = await FaceDetector.createFromOptions(fs, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' },
    runningMode: 'VIDEO', minDetectionConfidence: .4
  });
}

/* ---------- the booth ---------- */
async function init(frame) {
  header();
  if (!user) $('#guestNote').innerHTML = '<div class="card" style="margin-bottom:20px;padding:14px 20px">Guest mode: photos disappear when you reload. <a href="signup.html" style="color:var(--clay);font-weight:500">Create an account</a> to keep them.</div>';
  let F = FRAMES[frame], total = F.cols * F.rows;
  const S = { frame, total, effect: EFFECTS[0], amt: .7, timer: true, secs: 5, gesture: false, shots: [], busy: false, cancel: false, design: null, caption: 'SYNC SHOT' };
  const v = $('#v'), view = $('#view'), cam = $('#cam'), thumbs = $('#thumbs'), say = t => { $('#status').textContent = t; };
  document.addEventListener('pointerdown', e => { if (e.target.closest('.btn,.chip,.dsw')) sfx.tick(); });
  $('#snd').setAttribute('aria-pressed', soundOn());

  /* thumbnails under the camera */
  const markNext = () => [...thumbs.children].forEach((t, i) => t.classList.toggle('next', i === S.shots.length && S.shots.length < total));
  const fillThumb = (i, animate) => {
    const t = thumbs.children[i]; t.innerHTML = ''; t.classList.add('full');
    const c = document.createElement('canvas'); c.width = 160; c.height = 120; c.getContext('2d').drawImage(S.shots[i], 0, 0, 160, 120); t.append(c);
    if (animate) { t.classList.remove('develop'); void t.offsetWidth; t.classList.add('develop'); }
  };
  const buildThumbs = () => {
    thumbs.innerHTML = Array.from({ length: total }, () => '<span class="th"></span>').join('');
    S.shots.forEach((_, i) => fillThumb(i, false)); markNext();
  };
  const progress = () => {
    const n = S.shots.length;
    $('#pose').textContent = n >= total ? 'All done' : `Photo ${n + 1} of ${total}`;
    $('#shoot').disabled = n >= total; markNext();
  };
  const paintMeta = () => { $('#layoutName').textContent = `${F.name} · ${total} ${total > 1 ? 'photos' : 'photo'}`; };
  const reset = () => {
    if (S.busy) S.cancel = true;
    S.shots = []; $('#res').hidden = true; $('#res').innerHTML = '';
    buildThumbs(); paintMeta(); progress(); say('Press the shutter when you are ready.');
  };

  /* "Frame types" menu */
  const ftMenu = $('#ftMenu');
  ftMenu.innerHTML = Object.entries(FRAMES).map(([k, f]) => {
    const n = f.cols * f.rows;
    return `<button class="btn opt" role="menuitemradio" data-k="${k}" aria-checked="${k === S.frame}"><span class="ic"><span class="fp ${f.cls}${f.film ? ' film' : ''}">${'<span class="slot sample"></span>'.repeat(n)}</span></span><span><b>${f.name}</b><br><small>${n} ${n > 1 ? 'photos' : 'photo'}</small></span></button>`;
  }).join('');
  const menu = open => { ftMenu.hidden = !open; $('#ftBtn').setAttribute('aria-expanded', open); $('#ftWrap').classList.toggle('open', open); };
  const changeFrame = k => {
    if (k === S.frame) return;
    if (S.busy) { say('Wait for the current photo, then change the frame.'); return; }
    S.frame = k; F = FRAMES[k]; total = F.cols * F.rows; S.total = total;
    history.replaceState(null, '', '?frame=' + k);
    ftMenu.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-checked', b.dataset.k === k));
    reset(); say(`Frame changed to ${F.name}.`);
  };
  $('#ftBtn').onclick = e => { e.stopPropagation(); menu(ftMenu.hidden); };
  ftMenu.onclick = e => { const b = e.target.closest('[data-k]'); if (b) { changeFrame(b.dataset.k); menu(false); } };
  document.addEventListener('click', e => { if (!e.target.closest('#ftWrap')) menu(false); });

  buildThumbs(); paintMeta(); progress();

  if (!(await startCam(v))) { say('Camera is blocked. Allow camera access in your browser settings, then reload this page.'); toast('Camera is blocked.'); return; }

  /* live picture: the plain video is always underneath; the WebGL canvas covers it only while an effect is on */
  const fx = createFX(view), tileFx = createFX();   // fx draws onto the visible screen; tileFx is offscreen (previews and photos)
  const fxPanel = $('#fxPanel');
  v.classList.remove('srcvid');
  const size = (max = 640) => { const W = Math.min(v.videoWidth, max); return [W, Math.round(v.videoHeight * W / v.videoWidth)]; };
  view.hidden = true;
  let lastDraw = 0;
  const drawFx = () => { if (v.readyState >= 2) fx.render(v, S.effect.id, S.amt, true, ...size()); };
  if (fx) {
    const loop = t => {
      requestAnimationFrame(loop);
      if (S.effect.id === 0 || !fxPanel.hidden || document.hidden || t - lastDraw < 33) return;
      lastDraw = t;
      try { drawFx(); }
      catch (e) { console.error(e); S.effect = EFFECTS[0]; view.hidden = true; $('#strength').hidden = true; say('That effect could not run on this device, so it was turned off.'); }
    };
    requestAnimationFrame(loop);
  } else {
    $('#fxBtn').disabled = true;
    say('Effects need WebGL, which this browser does not offer. The booth still works without effects.');
  }

  /* Dizzy / Lovestruck: find the face, then draw little pictures over the video */
  const oc = document.createElement('canvas'), octx = oc.getContext('2d');
  oc.setAttribute('aria-hidden', 'true');
  oc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';
  cam.insertBefore(oc, cam.querySelector('.hud'));
  let face = null, faceAt = 0, faceToken = 0;
  const clearFace = () => { faceToken++; face = null; octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, oc.width, oc.height); };
  const paintOverlay = ts => {
    const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
    const W = 640, H = Math.round(640 * vh / vw); if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    if (!face) return;
    octx.setTransform(W / vw, 0, 0, H / vh, 0, 0);
    drawFaceFX(octx, S.effect.face, { cx: vw - face.cx, cy: face.cy, w: face.w, h: face.h }, ts);   // the screen is mirrored
  };
  const startFace = async () => {
    const token = ++faceToken;
    say('Loading face detection… (needs internet the first time)');
    try { await loadFace(); }
    catch (err) {
      console.error(err);
      if (token === faceToken) { S.effect = EFFECTS[0]; clearFace(); $('#strength').hidden = true; say('Face detection could not load. Check your internet connection and try again.'); }
      return;
    }
    if (token !== faceToken) return;
    say(`${S.effect.n} is on. Face the camera in good light.`);
    face = null; faceAt = performance.now();
    let lastDet = 0, lastDraw = 0, hinted = false;
    const step = t => {
      if (token !== faceToken) return;
      requestAnimationFrame(step);
      if (document.hidden || !fxPanel.hidden || v.readyState < 2) return;
      if (t - lastDet > 90) {                       // look for the face about 10 times a second
        lastDet = t;
        try {
          const d = faceDet.detectForVideo(v, performance.now()).detections?.[0], b = d?.boundingBox;
          if (b) {
            const n = { cx: b.originX + b.width / 2, cy: b.originY + b.height / 2, w: b.width, h: b.height };
            face = face ? { cx: face.cx + (n.cx - face.cx) * .5, cy: face.cy + (n.cy - face.cy) * .5, w: face.w + (n.w - face.w) * .5, h: face.h + (n.h - face.h) * .5 } : n;
            faceAt = t; if (hinted) { hinted = false; say(`${S.effect.n} is on.`); }
          } else if (t - faceAt > 800) face = null;
        } catch (err) { console.error(err); }
        if (!face && !hinted && t - faceAt > 2000) { hinted = true; say('Looking for your face… face the camera in good light.'); }
      }
      if (t - lastDraw < 33) return; lastDraw = t;
      paintOverlay(t / 1000);
    };
    requestAnimationFrame(step);
  };

  /* effects panel (3x3 previews, like Mac Photo Booth) */
  let page = 0, paintToken = 0;
  const paintFx = () => {
    const P = PAGES[page];
    $('#fxTitle').textContent = `${P.name}  ·  ${page + 1} of ${PAGES.length}`;
    $('#fxGrid').innerHTML = P.keys.map(k => { const e = EFFECTS.find(x => x.k === k); return `<button class="btn fxtile${e === S.effect ? ' on' : ''}" data-k="${k}"><canvas width="320" height="180"></canvas><span>${e.n}</span></button>`; }).join('');
    if (!tileFx || v.readyState < 2) return;
    const tiles = [...$('#fxGrid').children], token = ++paintToken; let i = 0;
    const next = () => {           // one preview per frame, so the panel opens without freezing
      if (token !== paintToken || i >= tiles.length) return;
      const t = tiles[i++], e = EFFECTS.find(x => x.k === t.dataset.k);
      try {
        tileFx.render(v, e.id, .85, true, 320, 180);
        const c2 = t.querySelector('canvas').getContext('2d'); c2.drawImage(tileFx.canvas, 0, 0);
        if (e.face) {                               // small preview of the little pictures
          const vw = v.videoWidth, vh = v.videoHeight, f0 = face ? { cx: vw - face.cx, cy: face.cy, w: face.w, h: face.h } : defaultFace(vw, vh);
          c2.setTransform(320 / vw, 0, 0, 180 / vh, 0, 0); drawFaceFX(c2, e.face, f0, performance.now() / 1000); c2.setTransform(1, 0, 0, 1, 0, 0);
        }
      } catch (err) { console.error(err); }
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  };
  const closeFx = () => { fxPanel.hidden = true; };
  $('#fxBtn').onclick = () => { if (S.busy) return say('Wait for the current photo first.'); fxPanel.hidden = false; paintFx(); };
  $('#fxClose').onclick = closeFx;
  $('#fxPrev').onclick = () => { page = (page + PAGES.length - 1) % PAGES.length; paintFx(); };
  $('#fxNext').onclick = () => { page = (page + 1) % PAGES.length; paintFx(); };
  $('#fxGrid').onclick = e => {
    const t = e.target.closest('[data-k]'); if (!t) return;
    S.effect = EFFECTS.find(x => x.k === t.dataset.k);
    $('#strength').hidden = S.effect.k === 'normal' || !!S.effect.face; $('#effName').textContent = S.effect.n;
    closeFx(); paintToken++;
    if (S.effect.id === 0) view.hidden = true;
    else { try { fx.warm(S.effect.id); drawFx(); view.hidden = false; } catch (err) { console.error(err); S.effect = EFFECTS[0]; $('#strength').hidden = true; return say('That effect could not run on this device.'); } }
    if (S.effect.face) return startFace();
    clearFace();
    say(S.effect.k === 'normal' ? 'Effects off.' : `${S.effect.n} is on. Use the slider to change how strong it is.`);
  };
  $('#amt').oninput = e => { S.amt = e.target.value / 100; $('#av').textContent = e.target.value + '%'; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeFx(); menu(false); } });

  /* taking photos */
  const snap = () => {
    const { sw, sh } = F, c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d');
    let src, vw, vh, mirror = false;
    const cap = tileFx || fx;
    if (cap && S.effect.id !== 0) { const [W, H] = size(1280); cap.render(v, S.effect.id, S.amt, true, W, H); src = cap.canvas; vw = W; vh = H; }
    else { src = v; vw = v.videoWidth; vh = v.videoHeight; mirror = true; }
    const t = sw / sh; let cw = vw, ch = vw / t; if (ch > vh) { ch = vh; cw = vh * t; }
    if (mirror) { x.translate(sw, 0); x.scale(-1, 1); }
    x.drawImage(src, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, sw, sh);
    if (S.effect.face && face) {                    // put the little pictures into the saved photo too
      const k = sw / cw; x.setTransform(k, 0, 0, k, -((vw - cw) / 2) * k, -((vh - ch) / 2) * k);
      drawFaceFX(x, S.effect.face, { cx: vw - face.cx, cy: face.cy, w: face.w, h: face.h }, performance.now() / 1000); x.setTransform(1, 0, 0, 1, 0, 0);
    }
    return c;
  };
  const count = i => {
    const c = $('#cnt'); $('#num').textContent = i; c.classList.add('on');
    c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick');
  };
  const finish = () => {
    const res = $('#res');
    const save = user?.verified ? '<button class="btn" id="sv">Save to my account</button>'
      : user ? '<p class="note" style="width:100%">Verify your email to save photos to your account.</p>' : '';
    res.hidden = false;
    res.innerHTML = `<h2 style="font-size:30px;margin:0 0 6px">Your photo is ready</h2><p class="note" style="margin:0 0 20px">Pick a frame design and change the text, then save or print.</p>
      <div class="editor"><div class="pvwrap"><canvas id="pv" class="print" aria-label="Preview of your finished photo"></canvas></div>
      <aside class="card edit"><h3>Frame design</h3><div class="designs" id="designs"></div>
        <h3>Text on your frame</h3><input class="inp" id="capText" maxlength="40" placeholder="Your text" autocomplete="off" aria-label="Text on your frame">
        <p class="note">Shown at the bottom of the frame. Leave it empty for no text.</p>
        <div class="row" style="margin-top:18px"><button class="btn pri" id="dl">Save to device</button><button class="btn" id="pr">Print</button>${save}<button class="btn" id="again">Take new photos</button></div></aside></div>`;
    const pv = $('#pv'), input = $('#capText'), designs = $('#designs');
    input.value = S.caption;
    designs.innerHTML = DESIGNS.map(d => { const k = d.k; return `<button class="dsw" data-k="${k}" aria-pressed="false" title="${d.n}"><span class="sw"><canvas></canvas></span><span>${d.n}</span></button>`; }).join('');
    designs.querySelectorAll('.dsw').forEach((b, i) => { const s = swatch(DESIGNS[i]), sc = b.querySelector('canvas'); sc.width = s.width; sc.height = s.height; sc.getContext('2d').drawImage(s, 0, 0); });
    const key = () => S.design || 'classic', find = k => DESIGNS.find(d => d.k === k) || DESIGNS[0];
    let queued = 0;
    const draw = () => {
      queued = 0;
      const c = composeStrip(S.shots, S.frame, find(key()), S.caption);
      pv.width = c.width; pv.height = c.height; pv.getContext('2d').drawImage(c, 0, 0);
      designs.querySelectorAll('.dsw').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === key()));
    };
    const schedule = () => { if (!queued) queued = requestAnimationFrame(draw); };
    designs.onclick = e => { const b = e.target.closest('.dsw'); if (!b) return; S.design = b.dataset.k; schedule(); };
    input.oninput = () => { S.caption = input.value; schedule(); };
    const url = () => pv.toDataURL('image/jpeg', .92);
    $('#dl').onclick = () => { const a = document.createElement('a'); a.href = url(); a.download = 'sync-shot.jpg'; document.body.append(a); a.click(); a.remove(); };
    $('#pr').onclick = () => { const u = url(), w = open(''); if (!w) return toast('Allow pop-ups to print.'); w.document.write(`<img src="${u}" style="max-width:100%" onload="print()">`); w.document.close(); };
    $('#again').onclick = () => { reset(); scrollTo({ top: 0, behavior: 'smooth' }); };
    if (user?.verified) $('#sv').onclick = async () => {
      try { await DB.savePhoto(user.id, url(), S.frame); toast('Saved to your account.'); sfx.chime(); } catch (e) { toast(e.message); }
    };
    draw();
    sfx.chime(); confetti(cam); setTimeout(() => res.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }), 500);
  };
  const shoot = async () => {
    if (S.busy || S.shots.length >= total) return;
    closeFx(); menu(false);
    S.busy = true; S.cancel = false; $('#shoot').classList.add('busy');
    const n = S.shots.length + 1;
    if (S.timer) {
      say(`Photo ${n}: get ready. Press the shutter again to cancel.`);
      for (let i = S.secs; i > 0 && !S.cancel; i--) { count(i); sfx.beep(); await sleep(1000); }
      $('#cnt').classList.remove('on');
    }
    if (S.cancel) { S.busy = false; S.cancel = false; $('#shoot').classList.remove('busy'); say('Cancelled. Press the shutter when you are ready.'); return; }
    cam.classList.remove('snap'); void cam.offsetWidth; cam.classList.add('snap');
    const fl = $('#fl'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); sfx.shutter();
    S.shots.push(snap()); fillThumb(S.shots.length - 1, true); progress();
    $('#shoot').classList.remove('busy');
    if (S.shots.length >= total) { say('All done! Your photo is printing.'); S.busy = false; finish(); return; }
    say(`Nice one! Photo ${S.shots.length + 1} of ${total} is next.`);
    if (S.gesture) await sleep(1000);
    S.busy = false;
  };
  $('#shoot').onclick = () => { if (S.busy) S.cancel = true; else shoot(); };
  $('#reset').onclick = reset;
  $('#timerSeg').onclick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const t = +b.dataset.t; S.timer = t > 0; if (t > 0) S.secs = t;
    $('#timerSeg').querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
  $('#snd').onclick = e => {
    const on = !soundOn(); try { localStorage.setItem('ss_sound', on ? '1' : '0'); } catch {}
    e.currentTarget.setAttribute('aria-pressed', on);
  };

  /* palm capture toggle */
  const hint = (p, state) => {
    $('#gHint').hidden = state === 'busy' || state === 'off';
    $('#gBar').style.width = Math.round(p * 100) + '%';
    $('#gTxt').textContent = { none: 'Show your open palm to the camera', hand: 'Open your hand wide, fingers spread', palm: 'Hold still…', lower: 'Lower your hand, then raise it again for the next photo' }[state] || '';
  };
  const gs = $('#gs');
  gs.onclick = async () => {
    if (S.gesture) { S.gesture = false; gestureOn = false; gestureLoop++; hint(0, 'off'); gs.setAttribute('aria-checked', false); say('Palm capture is off.'); return; }
    S.gesture = true; gs.setAttribute('aria-checked', true); say('Loading hand detection… (needs internet the first time)');
    try { await loadGestures(); if (!S.gesture) return; say('Ready. Raise an open palm and hold it still.'); runGestures(v, S, shoot, hint); }
    catch (err) { console.error(err); S.gesture = false; gs.setAttribute('aria-checked', false); say('Hand detection could not load. Check your internet connection and try again.'); }
  };
}

const DEFAULT_FRAME = 'vertical';   // the frame the booth opens with; people change it with the Frame button
const frameKey = new URLSearchParams(location.search).get('frame');
if (requireConsent()) init(FRAMES[frameKey] ? frameKey : DEFAULT_FRAME);
