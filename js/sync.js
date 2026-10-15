import { DB } from './db.js';
import { FRAMES } from './frames.js';
import { $, toast, user, header, requireVerified, requireConsent } from './common.js';
const app = $('#app');


/* Rooms live in the database. Each browser asks the server for the room state every few
   seconds (polling), which works on ordinary PHP hosting without WebSockets. */
let room = null, timer = null;
const dropLocal = () => { clearInterval(timer); timer = null; room = null; };
function leaveRoom() { if (room) DB.leaveRoom(room.code).catch(() => {}); dropLocal(); }
addEventListener('pagehide', () => { if (room) DB.leaveRoom(room.code).catch(() => {}); });

function enter(state) { room = state; paintRoom(); clearInterval(timer); timer = setInterval(poll, 3000); }
async function poll() {
  if (!room || document.hidden) return;
  try {
    const s = await DB.roomState(room.code);
    if (JSON.stringify(s) !== JSON.stringify(room)) { room = s; paintRoom(); }
  } catch (e) {
    if (e.status === 404 || e.status === 403) { dropLocal(); toast('The room was closed.'); showLobby(); }
  }
}

function paintRoom() {
  if (!room) return;
  app.innerHTML = `<button class="btn back" id="lv">Leave room</button>
  <div class="booth"><div class="card"><p style="margin:0;color:var(--mute)">Room code</p><div class="code">${room.code}</div>
    <div class="row" style="margin-top:8px"><button class="btn" id="cp">Copy code</button></div>
    <h3 style="margin:24px 0 4px;font-size:20px">In this room (${room.members.length}/2)</h3>
    ${room.members.map((m, i) => `<div class="who">${m.name}${m.id === room.hostId ? '<em>Host</em>' : ''}${m.id === user.id ? '<em>You</em>' : ''}</div>`).join('')}
    ${room.members.length < 2 ? '<p class="note">Waiting for one more person. Share the code with them.</p>' : ''}</div>
  <aside class="card ctl"><h3>Frame ${room.isHost ? '' : '(chosen by host)'}</h3><div class="chips">${Object.entries(FRAMES).map(([k, v]) => `<button class="chip" data-f="${k}" aria-pressed="${room.frame === k}" ${room.isHost ? '' : 'disabled'}>${v.name}</button>`).join('')}</div>
    <button class="btn pri" style="margin-top:20px;width:100%" disabled>Start shared capture</button>
    <p class="note">Shared capture, per-person window positions and live editing are next, once the database is connected.</p></aside></div>`;
  $('#lv').onclick = () => { leaveRoom(); showLobby(); };
  $('#cp').onclick = () => navigator.clipboard?.writeText(room.code).then(() => toast('Code copied.'));
  app.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { try { room = await DB.setFrame(room.code, b.dataset.f); paintRoom(); } catch (e) { toast(e.message); } });
}

function showLobby() {
  app.innerHTML = `<h2 style="font-size:36px">Sync with someone</h2><p style="color:var(--mute)">Two people per room. Only the host picks the frame.</p>
  <div class="cards"><div class="card"><h3>Host a room</h3><p style="color:var(--mute)">You get a code. Share it with the person you want to invite.</p><button class="btn pri" id="host">Create room</button></div>
  <div class="card"><h3>Join a room</h3><div class="field" style="margin-top:8px"><label for="jc">Room code</label><input class="inp" id="jc" maxlength="6" style="text-transform:uppercase;letter-spacing:.2em"></div><button class="btn pri" id="join" style="margin-top:12px">Join</button></div></div>`;
  $('#host').onclick = async () => { try { enter(await DB.createRoom()); } catch (e) { toast(e.message); } };
  $('#join').onclick = async () => { const c = $('#jc').value.trim().toUpperCase(); if (c.length !== 6) return toast('Enter the 6-character code.'); try { enter(await DB.joinRoom(c)); } catch (e) { toast(e.message); } };
}

if (requireVerified() && requireConsent()) { header(); showLobby(); }
