import { DB } from './db.js';
import { $, user, header, requireLogin, toast } from './common.js';
if (requireLogin()) {
  header();
  $('#hi').textContent = 'Hi, ' + user.username;
  const q = new URLSearchParams(location.search);
  if (q.get('verified') === '1') toast('Email verified. You can now save photos and use Sync.');
  if (q.get('verified') === '0') toast('That verification link is invalid or already used.');
  const msg = sessionStorage.getItem('ss_msg');
  if (msg) { toast(msg); sessionStorage.removeItem('ss_msg'); }
  if (!user.verified) {
    const dev = sessionStorage.getItem('ss_devlink');
    $('#verifyBanner').innerHTML = `<div class="banner"><b>Verify your email.</b> We sent a link to <span id="bem"></span>. Photos and Sync rooms unlock once you verify.
      <div class="row" style="margin-top:10px"><button class="btn" id="rs">Resend link</button></div>
      ${dev ? `<p class="note">Test mode: <a href="${dev}">open the verification link</a></p>` : ''}</div>`;
    $('#bem').textContent = user.email;
    $('#rs').onclick = async () => {
      try {
        const r = await DB.resendVerification();
        if (r.dev_link) { sessionStorage.setItem('ss_devlink', r.dev_link); location.reload(); } else toast('Link sent. Check your inbox.');
      } catch (e) { toast(e.message); }
    };
  }
}
