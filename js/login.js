import { DB } from './db.js';
import { $, wiggle, header, wireToggles } from './common.js';
header(); wireToggles();
const bad = text => { const m = $('#m'); m.textContent = text; m.className = 'msg bad'; wiggle($('#box')); };
const submit = async () => {
  try {
    const u = await DB.login($('#un').value.trim(), $('#pw').value);
    if (!u) { $('#pw').classList.add('err'); return bad('Wrong username or password. Check both and try again.'); }
    location.href = 'home.html';
  } catch (e) { bad(e.message); }
};
$('#go').onclick = submit;
document.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
$('#pw').oninput = () => $('#pw').classList.remove('err');
