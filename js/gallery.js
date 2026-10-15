import { DB } from './db.js';
import { $, toast, header, requireVerified } from './common.js';
if (requireVerified()) {
  header();
  const load = async () => {
    try {
      const list = await DB.photos();
      $('#g').innerHTML = list.length
        ? list.map(p => `<div><a href="${p.url}" download="sync-shot-${p.id}.jpg"><img alt="Saved photo" src="${p.url}"></a><button class="btn" data-del="${p.id}" style="margin-top:8px">Delete</button></div>`).join('')
        : '<p style="color:var(--mute)">No photos yet. Take some in the photobooth and press Save to my account.</p>';
    } catch (e) { $('#g').textContent = e.message; }
  };
  $('#g').onclick = async e => {
    const b = e.target.closest('[data-del]'); if (!b || !confirm('Delete this photo for good?')) return;
    try { await DB.deletePhoto(+b.dataset.del); toast('Photo deleted.'); load(); } catch (err) { toast(err.message); }
  };
  load();
}
