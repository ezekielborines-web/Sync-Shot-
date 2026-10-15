/* ============================================================
   DATA LAYER — every call to the PHP backend lives here.
   Pages never talk to the server directly; they only use DB.
   ============================================================ */
async function api(file, action, { method = 'GET', params = {}, body } = {}) {
  const url = new URL(`api/${file}.php`, document.baseURI);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const json = body ? JSON.stringify(body) : undefined;
  let res;
  try {
    res = await fetch(url, {
      method, credentials: 'same-origin', body: json,
      headers: { 'X-Requested-With': 'syncshot', ...(json ? { 'Content-Type': 'application/json' } : {}) },
      keepalive: !json || json.length < 60000   // lets "leave room" finish while the tab closes
    });
  } catch { throw new Error('Cannot reach the server.'); }
  const data = await res.json().catch(() => ({ error: 'The server sent an unexpected reply. Is PHP running?' }));
  if (!res.ok) { const e = new Error(data.error || 'Request failed.'); e.status = res.status; throw e; }
  return data;
}
const post = (file, action, body = {}) => api(file, action, { method: 'POST', body });

export const DB = {
  // accounts
  async me() { return (await api('auth', 'me')).user; },
  async emailTaken(email) { return (await api('auth', 'check', { params: { email } })).emailTaken; },
  async usernameTaken(username) { return (await api('auth', 'check', { params: { username } })).usernameTaken; },
  createUser: ({ email, username, password }) => post('auth', 'register', { email, username, password }), // -> { user, dev_link }
  async login(username, password) {
    try { return (await post('auth', 'login', { username, password })).user; }
    catch (e) { if (e.status === 401) return null; throw e; }
  },
  logout: () => post('auth', 'logout'),
  resendVerification: () => post('auth', 'resend'),
  // photos (verified accounts only; stored on the server)
  async savePhoto(_uid, dataUrl, frame) { return post('photos', 'upload', { dataUrl, frame }); },
  async photos() {
    const { photos } = await api('photos', 'list');
    return photos.map(p => ({ ...p, url: `api/photos.php?action=get&id=${p.id}` }));
  },
  deletePhoto: id => post('photos', 'delete', { id }),
  // sync rooms (verified accounts only)
  createRoom: () => post('rooms', 'create'),
  joinRoom: code => post('rooms', 'join', { code }),
  roomState: code => api('rooms', 'state', { params: { code } }),
  setFrame: (code, frame) => post('rooms', 'frame', { code, frame }),
  leaveRoom: code => post('rooms', 'leave', { code })
};
