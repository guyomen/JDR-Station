/* Point d'entrée, chargé en dernier : branche les événements et démarre l'appli. */

/* ---------- Événements de #app (délégation) ---------- */
const app = $('#app');

app.addEventListener('input', e => { if (e.target.tagName !== 'SELECT') onField(e); });
app.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-import]')) return importFile(el.files[0]);
  if (el.dataset.aChange === 'addvoie') {
    const c = charOf(el);
    if (c && el.value) change(c, 'voies', [...c.voies, { id: el.value, rang: el.value === 'libre' ? 0 : 1, notes: '', ...(el.value === 'libre' ? { nom: '' } : {}) }], true);
    el.blur();
    return render();
  }
  if (el.tagName === 'SELECT' || el.dataset.npc) onField(e);
});

app.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.a];
  if (fn) fn(el, charOf(el), e);
});

app.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const fn = FORMS[form.dataset.form];
  if (fn) fn(Object.fromEntries(new FormData(form)), form);
});

/* ---------- Page ---------- */
$('#roll').addEventListener('click', () => { $('#roll').hidden = true; });

document.addEventListener('focusout', () => setTimeout(() => { if (S.needRender && !isEditing()) render(); }, 60));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

/* Retour au premier plan : reconnexion et écran maintenu allumé (mode écran). */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  connect();
  keepAwake();
});

/* L'espace global affiche des durées (« depuis 5 min ») : rafraîchi régulièrement. */
setInterval(() => { if (route()[0] === 'global' && !isEditing()) render(); }, 30000);

/* ---------- Démarrage ---------- */
if (S.role === 'ecran' && !S.screen) { S.screen = true; save('screen', true); }
if (S.screen && route()[0] !== 'global') location.hash = '#/global';
else if (!route().length && S.role) location.hash = homeOf(S.role);
keepAwake();
refreshImgs();
connect();
