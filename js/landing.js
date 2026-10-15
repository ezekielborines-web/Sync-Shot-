import { $, toast, hasConsent, setConsent, header } from './common.js';
header(true);
const m = sessionStorage.getItem('ss_msg');
if (m) { toast(m); sessionStorage.removeItem('ss_msg'); }
const agree = $('#agree'), btns = ['#skip', '#l2', '#s2'].map(s => $(s));
agree.checked = hasConsent();
const sync = () => btns.forEach(b => b.disabled = !agree.checked);
sync();
agree.onchange = () => { setConsent(agree.checked); sync(); };
$('#skip').onclick = () => location.href = 'booth.html';
$('#l2').onclick = () => location.href = 'login.html';
$('#s2').onclick = () => location.href = 'signup.html';
