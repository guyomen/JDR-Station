/* Vue : accueil. */

/* ---------- Accueil ---------- */
function viewHome() {
  const mine = S.chars.filter(c => S.mine[c.id]).length;
  const tile = (href, icon, title, desc) => `<a class="tile card" href="${href}"><span class="ico">${icon}</span>
    <span class="grow"><b>${title}</b><small>${desc}</small></span><span class="go">›</span></a>`;
  return `<div class="tiles">
    ${tile('#/joueur', '🧝', 'Espace joueur', mine ? `${mine} personnage${mine > 1 ? 's' : ''} sur cet appareil` : 'Créer ou reprendre son personnage')}
    ${tile('#/global', '👥', 'Espace global', `${S.peers.length} connecté${S.peers.length > 1 ? 's' : ''} · état du groupe`)}
    ${tile('#/mj', '🎲', 'Espace MJ', S.isMJ ? 'Connecté en MJ' : 'Réservé au meneur de jeu')}
    ${tile('#/config', '⚙', 'Réglages de cet appareil', S.imgs.length ? `${S.imgs.length} image${S.imgs.length > 1 ? 's' : ''} de lieux` : 'Dossier d’images pour l’écran partagé')}
  </div>`;
}
