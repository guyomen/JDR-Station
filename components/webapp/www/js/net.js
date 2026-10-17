/* Connexion WebSocket à la station et envoi des modifications de fiches (« patch »). */

function connect() {
  if (S.ws && S.ws.readyState <= 1) return;
  const ws = new WebSocket(`ws://${location.host}/ws`);
  S.ws = ws;
  ws.onopen = () => {
    $('#net').classList.add('on');
    send({ t: 'hello' });
    if (S.pin) send({ t: 'auth', pin: S.pin });
    sendPresence();
    flush();
    if (S.pin) flushCombat();
  };
  ws.onclose = () => {
    $('#net').classList.remove('on');
    setTimeout(connect, 1500);
  };
  ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
}
function send(o) {
  if (S.ws && S.ws.readyState === 1) { S.ws.send(JSON.stringify(o)); return true; }
  return false;
}

/* Type d'appareil affiché dans l'espace global. */
function deviceName() {
  const ua = navigator.userAgent;
  return /iPad/.test(ua) ? 'iPad' : /iPhone|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Tablette')
    : /Windows/.test(ua) ? 'PC' : /Mac/.test(ua) ? 'Mac' : /Linux|CrOS/.test(ua) ? 'Ordinateur' : 'Appareil';
}
/* Annonce à la station qui est derrière cet appareil (à refaire quand S.mine ou le rôle MJ change). */
const sendPresence = () => send({ t: 'presence', dev: deviceName(), player: S.player, mine: S.mine, ...(S.pin ? { pin: S.pin } : {}), ...(S.screen ? { screen: true } : {}) });

const authFor = id => (S.isMJ ? { pin: S.pin } : { token: S.mine[id] });

/* Modifications locales : regroupées puis envoyées sous forme de « patch ». */
let flushT;
function queue(id, path, value) {
  const p = (S.pending[id] = S.pending[id] || {});
  for (const k of Object.keys(p)) if (k.startsWith(path + '.')) delete p[k];
  p[path] = value;
  clearTimeout(flushT);
  flushT = setTimeout(flush, 350);
}
function flush() {
  for (const id of Object.keys(S.pending)) {
    if (!send({ t: 'patch', id, set: S.pending[id], ...authFor(id) })) return;
    delete S.pending[id];
  }
}
function change(c, path, value, now) {
  setPath(c, path, value);
  queue(c.id, path, value);
  if (now) flush();
}
