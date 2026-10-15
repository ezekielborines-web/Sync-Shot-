import { DB } from './db.js';
export const $ = (s, r = document) => r.querySelector(s);
export const user = await DB.me().catch(() => null);   // server session; null if logged out or server unreachable
export const hasConsent = () => sessionStorage.getItem('ss_consent') === '1';
export const setConsent = v => sessionStorage.setItem('ss_consent', v ? '1' : '0');
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
  document.body.append(d); setTimeout(() => d.remove(), 2600);
}
export function wiggle(el) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
export async function logout() { try { await DB.logout(); } catch {} location.href = 'index.html'; }
let effectsOn = false;
export function enableEffects() {
  if (effectsOn) return; effectsOn = true;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn,.chip,.pcard,.shutter');
    if (!b || b.disabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, d = document.createElement('span');
    d.className = 'ripple';
    d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.append(d); setTimeout(() => d.remove(), 650);
  });
}
export function header(showAuth = false) {
  enableEffects();
  $('#hdr').innerHTML = `<a class="logo" href="index.html" aria-label="SYNC SHOT home"><i></i>SYNC SHOT</a><nav>` +
    (user
      ? `<a class="btn" href="home.html">Home</a><a class="btn" href="gallery.html">My photos</a><button class="btn" id="out">Log out (${user.username})</button>`
      : showAuth ? `<a class="btn" href="login.html">Log in</a><a class="btn pri" href="signup.html">Sign up</a>` : '') + `</nav>`;
  $('#out')?.addEventListener('click', logout);
}
export function requireLogin() { if (!user) { location.replace('login.html'); return false; } return true; }
export function requireVerified() {
  if (!requireLogin()) return false;
  if (!user.verified) { sessionStorage.setItem('ss_msg', 'Verify your email first. Photos and Sync rooms need a verified account.'); location.replace('home.html'); return false; }
  return true;
}
export function requireConsent() {
  if (!hasConsent()) { sessionStorage.setItem('ss_msg', 'Please allow camera use first.'); location.replace('index.html'); return false; }
  return true;
}
export function wireToggles() {
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const i = $('#' + b.dataset.t), h = i.type === 'password';
    i.type = h ? 'text' : 'password'; b.textContent = h ? 'Hide' : 'Show';
  });
}
