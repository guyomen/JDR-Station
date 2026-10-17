/* Mode écran partagé : lieu choisi par le MJ en fond, plein écran, écran maintenu allumé. */

const curBg = () => (S.isMJ ? S.combat : S.pub).bg;
function setBg(v) {
  S.combat.bg = imgId(v);
  pushCombat();
  render();
}

/* Calque de fond derrière l'espace global, uniquement en mode écran. */
let bgShown = null, bgUrl = '';
function showBg() {
  const id = S.screen && route()[0] === 'global' ? curBg() : '';
  if (id === bgShown) return;
  bgShown = id;
  let el = $('#bg');
  if (!el) { el = document.createElement('div'); el.id = 'bg'; document.body.prepend(el); }
  const set = blob => {
    if (bgShown !== id) return; // l'ID a changé entre-temps
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = blob ? URL.createObjectURL(blob) : '';
    el.style.backgroundImage = bgUrl ? `url("${bgUrl}")` : '';
    document.documentElement.classList.toggle('hasbg', !!bgUrl);
  };
  if (!id) set(null); else IMG.get(id).then(set, () => set(null));
}

/* Écran partagé : il s'ouvre directement sur l'espace global, reste allumé et se rafraîchit seul. */
function setScreen(on) {
  S.screen = on;
  save('screen', on);
  const d = document;
  try {
    if (on && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
    else if (!on && d.fullscreenElement) d.exitFullscreen();
  } catch (err) { /* plein écran indisponible */ }
  keepAwake();
  sendPresence();
  render();
}
let wakeLock = null;
function keepAwake() {
  try {
    if (S.screen && !wakeLock && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
    } else if (!S.screen && wakeLock) wakeLock.release();
  } catch (err) { /* API absente (page non sécurisée) */ }
}
