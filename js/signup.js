import { DB } from './db.js';
import { $, wiggle, header, wireToggles } from './common.js';
header(); wireToggles();
const emailOk = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e);
const RULES = [['12–16+ characters', p => p.length >= 12], ['Uppercase letter', p => /[A-Z]/.test(p)], ['Lowercase letter', p => /[a-z]/.test(p)], ['Number', p => /\d/.test(p)], ['Symbol', p => /[^A-Za-z0-9]/.test(p)]];
function strength(p) {
  const hits = RULES.filter(r => r[1](p)).length;
  if (!p) return { n: 0, l: '', c: '#CFC8B8' };
  if (hits === 5 && p.length >= 16) return { n: 100, l: 'Strong', c: '#4F7142' };
  if (hits === 5) return { n: 75, l: 'Good — 16 or more characters is safer', c: '#9A8A2B' };
  return { n: Math.max(12, hits * 13), l: 'Weak', c: '#B3402A' };
}
$('#rules').innerHTML = RULES.map(r => `<li>${r[0]}</li>`).join('');
const set = (id, t, c) => { const e = $(id); e.textContent = t; e.className = 'msg ' + (c || ''); };
const checkEmail = async () => {
  const v = $('#em').value.trim(); if (!v) return set('#me', '');
  if (!emailOk(v)) return set('#me', 'Enter a full email address, like name@example.com.', 'bad');
  if (await DB.emailTaken(v)) return set('#me', 'This email already has an account. Log in instead.', 'bad');
  set('#me', 'Email is available.', 'good'); return true;
};
const checkUser = async () => {
  const v = $('#un').value.trim(); if (!v) return;
  if (!/^[A-Za-z0-9_.]{3,20}$/.test(v)) return set('#mu', '3–20 letters, numbers, dots or underscores.', 'bad');
  if (await DB.usernameTaken(v)) return set('#mu', 'That username is taken. Try another.', 'bad');
  set('#mu', 'Username is available.', 'good'); return true;
};
const paint = () => {
  const p = $('#pw').value, s = strength(p);
  $('#bar').style.width = s.n + '%'; $('#bar').style.background = s.c; set('#ml', s.l);
  [...$('#rules').children].forEach((li, i) => li.classList.toggle('ok', RULES[i][1](p)));
};
$('#em').oninput = checkEmail; $('#un').oninput = checkUser; $('#pw').oninput = paint;
$('#go').onclick = async () => {
  const ok = (await checkEmail()) && (await checkUser()) && RULES.every(r => r[1]($('#pw').value));
  if (!ok) { set('#m', 'Fix the highlighted items. The password needs 12+ characters with upper, lower, number and symbol.', 'bad'); wiggle($('#box')); return; }
  try {
    const res = await DB.createUser({ email: $('#em').value.trim(), username: $('#un').value.trim(), password: $('#pw').value });
    if (res.dev_link) sessionStorage.setItem('ss_devlink', res.dev_link);
    location.href = 'home.html';
  } catch (e) { set('#m', e.message, 'bad'); wiggle($('#box')); }
};
