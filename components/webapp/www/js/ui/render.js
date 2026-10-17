/* Routage (#/…) et rendu : re-rendu complet, ou simple mise à jour des valeurs pendant une saisie. */

const route = () => (location.hash.slice(1) || '/').split('/').filter(Boolean);
const isEditing = () => {
  const a = document.activeElement;
  return a && a.closest('#app') && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'file';
};

/* Ne jamais casser une saisie en cours : on patche les valeurs et on re-rend plus tard. */
function update() {
  if (isEditing()) { patchValues(); S.needRender = true; } else render();
}

let rulesShown = ''; // HTML de l'Espace Règles affiché
function render() {
  S.needRender = false;
  const app = $('#app');
  const open = $$('details[open][data-k]', app).map(d => d.dataset.k);
  const r = route();
  let html;
  if (r[0] === 'regles') html = viewRules(r[1]);
  else if (!S.ready) html = '<p class="muted center">Connexion à la station…</p>';
  else if (!S.role) html = viewWelcome();
  else if (r[0] === 'c') html = viewSheet(r[1], false);
  else if (r[0] === 'global') html = viewGlobal();
  else if (r[0] === 'config') html = viewConfig();
  else if (r[0] === 'joueur') html = viewPlayer();
  else if (r[0] === 'mj' && !S.isMJ) html = viewLogin();
  else if (r[0] === 'mj' && r[1] === 'c') html = viewSheet(r[2], true);
  else if (r[0] === 'mj') html = viewMJ();
  else html = viewHome();
  document.documentElement.classList.toggle('screen', S.screen && r[0] === 'global');
  /* Les documents de règles sont longs : pas de re-rendu à chaque message de la station. */
  if (r[0] !== 'regles' || html !== rulesShown) app.innerHTML = html;
  rulesShown = r[0] === 'regles' ? html : '';
  open.forEach(k => { const d = $(`details[data-k="${k}"]`, app); if (d) d.open = true; });
  refreshCalc();
  showBg();
}

function patchValues() {
  $$('[data-id]', $('#app')).forEach(scope => {
    const c = byId(scope.dataset.id);
    if (!c) return;
    const k = calc(c);
    $$('[data-p]', scope).forEach(el => {
      if (el === document.activeElement || el.closest('[data-id]') !== scope) return;
      const p = el.dataset.p;
      const v = /^(pv|dr|pc|pm)\.cur$/.test(p) ? curOf(c, p.slice(0, 2), k) : get(c, p);
      if (v !== undefined && v !== null && String(el.value) !== String(v)) el.value = v;
    });
    $$('[data-a=etat]', scope).forEach(b => b.classList.toggle('on', c.etats.includes(b.dataset.v)));
  });
  refreshCalc();
}

/* Valeurs calculées (DEF, attaques, maxima, barres) mises à jour sans re-rendu. */
function refreshCalc() {
  $$('[data-id]', $('#app')).forEach(scope => {
    const c = byId(scope.dataset.id);
    if (!c) return;
    const k = calc(c);
    $$('[data-calc]', scope).forEach(el => {
      if (el.closest('[data-id]') !== scope) return;
      const key = el.dataset.calc;
      let v;
      if (key === 'name') v = c.name || 'Sans nom';
      else if (key === 'def' || key === 'init') v = k[key];
      else if (key in k && typeof k[key] === 'number') v = sgn(k[key]);
      else if (key.startsWith('max.')) v = k.max[key.slice(4)];
      else if (key.startsWith('car.')) { const ck = key.slice(4); v = k.car[ck] !== n(c.car[ck]) ? `→ ${sgn(k.car[ck])}` : ''; }
      else if (key === 'drtype') v = 'd' + k.drType;
      else if (key === 'sorts') v = k.sorts;
      else if (key.startsWith('arme.')) { const w = c.armes[+key.slice(5)]; if (w) el.innerHTML = wstatHTML(weaponStats(c, w, k)); }
      if (v !== undefined) el.textContent = v;
    });
    $$('[data-bar]', scope).forEach(el => {
      const r = el.dataset.bar;
      const max = k.max[r];
      const pct = max > 0 ? Math.max(0, Math.min(100, (100 * curOf(c, r, k)) / max)) : 0;
      el.style.width = pct + '%';
      el.classList.toggle('low', r === 'pv' && pct <= 25);
    });
    $$('[data-res=pm]', scope).forEach(el => { if (el.closest('[data-id]') === scope) el.hidden = !k.lanceur; });
  });
}
